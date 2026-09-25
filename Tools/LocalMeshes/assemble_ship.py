"""Assemble, atlas-unwrap and bake the generated Kestrel modules in Blender."""
import argparse
from collections import deque
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Vector

parser = argparse.ArgumentParser()
parser.add_argument('--manifest', required=True, type=Path)
parser.add_argument('--project-root', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
args = parser.parse_args(sys.argv[sys.argv.index('--')+1:])
manifest = json.loads(args.manifest.read_text(encoding='utf8'))
project = args.project_root.resolve()
output = args.output.resolve()
textures = output / 'Textures'
renders = output / 'Renders'
textures.mkdir(parents=True, exist_ok=True)
renders.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = 'METRIC'
scene.unit_settings.scale_length = 1.0
scene.render.engine = 'CYCLES'
scene.cycles.samples = 16
scene.render.bake.margin = 16
scene.render.bake.use_pass_color = True
scene.render.bake.use_pass_direct = False
scene.render.bake.use_pass_indirect = False
scene.cycles.device = 'CPU'

atlas_size = int(manifest.get('texture_px', 4096))
slots = {'Hull': (0, 0), 'Wing': (1, 0), 'LandingGear': (0, 1), 'Drive': (1, 1)}
base_atlas = bpy.data.images.new('Kestrel_BaseColor_4096', atlas_size, atlas_size, alpha=False, float_buffer=False)
normal_atlas = bpy.data.images.new('Kestrel_Normal_4096', atlas_size, atlas_size, alpha=False, float_buffer=False)
normal_atlas.colorspace_settings.name = 'Non-Color'
rough_atlas = bpy.data.images.new('Kestrel_Roughness_4096', atlas_size, atlas_size, alpha=False, float_buffer=False)
rough_atlas.colorspace_settings.name = 'Non-Color'
# Unity URP metallic/smoothness textures store smoothness in alpha. Keep that
# channel through PNG export so the importer does not default the whole hull to
# full gloss. Alpha is filled from the inverse of the baked roughness map below.
metal_atlas = bpy.data.images.new('Kestrel_Metal_4096', atlas_size, atlas_size, alpha=True, float_buffer=False)
metal_atlas.colorspace_settings.name = 'Non-Color'
atlas_paths = ((base_atlas, 'Kestrel_BaseColor.png'), (normal_atlas, 'Kestrel_Normal.png'),
               (rough_atlas, 'Kestrel_Roughness_source.png'), (metal_atlas, 'Kestrel_MetallicSmoothness.png'))
for atlas, filename in atlas_paths:
    stale_output = textures / filename
    if stale_output.exists(): stale_output.unlink()
    atlas.filepath_raw = str(stale_output)
    atlas.file_format = 'PNG'
baked_targets = set()

def new_image_node(material, name, image):
    node = material.node_tree.nodes.new('ShaderNodeTexImage')
    node.name = name
    node.label = name
    node.image = image
    node.interpolation = 'Linear'
    node.extension = 'CLIP'
    return node

def foreground_from_edge_connected_white(rgb):
    """Preserve bright painted panels; exclude only near-white border-connected background."""
    height, width, _ = rgb.shape
    candidates = (np.min(rgb, axis=2) > .90).ravel()
    background = np.zeros(candidates.size, dtype=np.bool_)
    queue = deque()

    def seed(index):
        if candidates[index] and not background[index]:
            background[index] = True
            queue.append(index)

    for x in range(width):
        seed(x)
        seed((height-1)*width+x)
    for y in range(1, height-1):
        seed(y*width)
        seed(y*width+width-1)
    while queue:
        index = queue.popleft()
        x = index % width
        if x and candidates[index-1] and not background[index-1]:
            background[index-1] = True; queue.append(index-1)
        if x+1 < width and candidates[index+1] and not background[index+1]:
            background[index+1] = True; queue.append(index+1)
        if index >= width and candidates[index-width] and not background[index-width]:
            background[index-width] = True; queue.append(index-width)
        if index+width < candidates.size and candidates[index+width] and not background[index+width]:
            background[index+width] = True; queue.append(index+width)
    return ~background.reshape(height, width)

def project_uv(mesh, bounds, ref_box, image_size, category, axes=(0, 1), flip_u=False):
    # Preserve a seam-aware unwrap as the active UV map for atlas baking.
    # The separate ArtProjection map below samples the concept sheet only.
    bake_uv = mesh.uv_layers.get('AtlasUV')
    if bake_uv is None:
        raise RuntimeError('Smart UV atlas unwrap was not created before projection')
    mesh.uv_layers.active = bake_uv
    slotx, sloty = slots[category]
    tile_inset = .014
    for datum in bake_uv.data:
        uv = datum.uv.copy()
        datum.uv = (slotx*.5 + tile_inset + uv.x*(.5-2*tile_inset),
                    (1-sloty)*.5 + tile_inset + uv.y*(.5-2*tile_inset))

    uv = mesh.uv_layers.get('ArtProjection') or mesh.uv_layers.new(name='ArtProjection')
    minx, maxx, miny, maxy = bounds
    x0, y0, x1, y1 = ref_box
    width, height = image_size
    for poly in mesh.polygons:
        for loop_index in poly.loop_indices:
            point = mesh.vertices[mesh.loops[loop_index].vertex_index].co
            normalized_u = (point[axes[0]] - minx) / max(1e-8, maxx-minx)
            if flip_u: normalized_u = 1.0 - normalized_u
            u = x0 + normalized_u * (x1-x0)
            vtop = y0 + ((point[axes[1]] - miny) / max(1e-8, maxy-miny)) * (y1-y0)
            # A 28 px gutter at 4096 keeps each quadrant isolated through filtering.
            # ArtProjection samples the standalone concept image, so its UVs
            # must stay in that image's full 0..1 space. Only AtlasUV is packed
            # into this part's 2x2 atlas tile. Remapping this projection into
            # the atlas quadrant sampled only a corner of each reference and
            # made most painted details disappear.
            uv.data[loop_index].uv = (u, 1-vtop)
    mesh.uv_layers.active = bake_uv

def bake_material(name, reference, foreground_mask, fallback, metallic, roughness, base_target, projection_normal):
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    nodes = material.node_tree.nodes
    nodes.clear()
    output_node = nodes.new('ShaderNodeOutputMaterial')
    bsdf = nodes.new('ShaderNodeBsdfPrincipled')
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = metallic
    texcoord = nodes.new('ShaderNodeUVMap')
    texcoord.uv_map = 'ArtProjection'
    source = new_image_node(material, 'Concept colour projection', reference)
    material.node_tree.links.new(texcoord.outputs['UV'], source.inputs['Vector'])
    mask_node = new_image_node(material, 'Flood-filled concept foreground mask', foreground_mask)
    material.node_tree.links.new(texcoord.outputs['UV'], mask_node.inputs['Vector'])
    mask_bw = nodes.new('ShaderNodeRGBToBW')
    material.node_tree.links.new(mask_node.outputs['Color'], mask_bw.inputs['Color'])
    factor = nodes.new('ShaderNodeMath')
    factor.operation = 'MULTIPLY'
    material.node_tree.links.new(mask_bw.outputs['Val'], factor.inputs[0])
    factor.inputs[1].default_value = 1.0

    # A concept sheet is a single view, not a triplanar texture. Only use its
    # pixels on faces that point toward that view. Without this facing mask,
    # the side elevation gets stretched over the nose, roof and underside,
    # which is the streaked appearance visible in the all-angle review.
    geometry = nodes.new('ShaderNodeNewGeometry')
    view_direction = nodes.new('ShaderNodeVectorMath')
    view_direction.operation = 'DOT_PRODUCT'
    view_direction.inputs[1].default_value = Vector(projection_normal)
    material.node_tree.links.new(geometry.outputs['Normal'], view_direction.inputs[0])
    view_facing = nodes.new('ShaderNodeMath')
    view_facing.operation = 'ABSOLUTE'
    material.node_tree.links.new(view_direction.outputs['Value'], view_facing.inputs[0])
    facing = nodes.new('ShaderNodeMapRange')
    facing.clamp = True
    facing.inputs['From Min'].default_value = .05
    facing.inputs['From Max'].default_value = .52
    facing.inputs['To Min'].default_value = 0.0
    facing.inputs['To Max'].default_value = 1.0
    material.node_tree.links.new(view_facing.outputs[0], facing.inputs['Value'])
    facing_factor = nodes.new('ShaderNodeMath')
    facing_factor.operation = 'MULTIPLY'
    material.node_tree.links.new(factor.outputs[0], facing_factor.inputs[0])
    material.node_tree.links.new(facing.outputs['Result'], facing_factor.inputs[1])

    # A single-view concept cannot specify the roof, belly and end caps. Give
    # those faces quiet, manufactured plate structure instead of a flat swatch.
    texcoord_noise = nodes.new('ShaderNodeTexCoord')
    noise = nodes.new('ShaderNodeTexNoise')
    noise.inputs['Scale'].default_value = 1.35
    noise.inputs['Detail'].default_value = 2.0
    noise.inputs['Roughness'].default_value = .68
    material.node_tree.links.new(texcoord_noise.outputs['Object'], noise.inputs['Vector'])
    panel_noise_range = nodes.new('ShaderNodeMapRange')
    panel_noise_range.clamp = True
    panel_noise_range.inputs['From Min'].default_value = .15
    panel_noise_range.inputs['From Max'].default_value = .85
    panel_noise_range.inputs['To Min'].default_value = .94
    panel_noise_range.inputs['To Max'].default_value = 1.04
    material.node_tree.links.new(noise.outputs['Fac'], panel_noise_range.inputs['Value'])

    cell_colors = nodes.new('ShaderNodeTexVoronoi')
    cell_colors.feature = 'F1'
    cell_colors.inputs['Scale'].default_value = 1.15
    material.node_tree.links.new(texcoord_noise.outputs['Object'], cell_colors.inputs['Vector'])
    cell_tint = nodes.new('ShaderNodeRGBToBW')
    material.node_tree.links.new(cell_colors.outputs['Color'], cell_tint.inputs['Color'])
    cell_range = nodes.new('ShaderNodeMapRange')
    cell_range.clamp = True
    cell_range.inputs['From Min'].default_value = .0
    cell_range.inputs['From Max'].default_value = 1.0
    cell_range.inputs['To Min'].default_value = .90
    cell_range.inputs['To Max'].default_value = 1.08
    material.node_tree.links.new(cell_tint.outputs['Val'], cell_range.inputs['Value'])
    panel_variation = nodes.new('ShaderNodeMath')
    panel_variation.operation = 'MULTIPLY'
    material.node_tree.links.new(panel_noise_range.outputs['Result'], panel_variation.inputs[0])
    material.node_tree.links.new(cell_range.outputs['Result'], panel_variation.inputs[1])
    panel_tint = nodes.new('ShaderNodeMixRGB')
    panel_tint.blend_type = 'MULTIPLY'
    panel_tint.inputs[0].default_value = 1.0
    panel_tint.inputs[1].default_value = fallback
    material.node_tree.links.new(panel_variation.outputs[0], panel_tint.inputs[2])
    panels = nodes.new('ShaderNodeTexVoronoi')
    panels.feature = 'DISTANCE_TO_EDGE'
    panels.inputs['Scale'].default_value = 1.15
    material.node_tree.links.new(texcoord_noise.outputs['Object'], panels.inputs['Vector'])
    seam_width = nodes.new('ShaderNodeMapRange')
    seam_width.clamp = True
    seam_width.inputs['From Min'].default_value = .004
    seam_width.inputs['From Max'].default_value = .015
    seam_width.inputs['To Min'].default_value = 0.0
    seam_width.inputs['To Max'].default_value = 1.0
    material.node_tree.links.new(panels.outputs['Distance'], seam_width.inputs['Value'])
    fallback_panels = nodes.new('ShaderNodeMixRGB')
    fallback_panels.inputs[1].default_value = tuple(c*.76 for c in fallback[:3]) + (1,)
    material.node_tree.links.new(seam_width.outputs['Result'], fallback_panels.inputs[0])
    material.node_tree.links.new(panel_tint.outputs['Color'], fallback_panels.inputs[2])

    mix = nodes.new('ShaderNodeMixRGB')
    mix.blend_type = 'MIX'
    material.node_tree.links.new(fallback_panels.outputs['Color'], mix.inputs[1])
    material.node_tree.links.new(facing_factor.outputs[0], mix.inputs[0])
    material.node_tree.links.new(source.outputs['Color'], mix.inputs[2])
    material.node_tree.links.new(mix.outputs['Color'], bsdf.inputs['Base Color'])

    rough_map = nodes.new('ShaderNodeMapRange')
    rough_map.inputs['From Min'].default_value = .15
    rough_map.inputs['From Max'].default_value = .85
    rough_map.inputs['To Min'].default_value = max(.38, roughness-.15)
    rough_map.inputs['To Max'].default_value = min(.92, roughness+.14)
    material.node_tree.links.new(noise.outputs['Fac'], rough_map.inputs['Value'])
    material.node_tree.links.new(rough_map.outputs['Result'], bsdf.inputs['Roughness'])
    material.node_tree.links.new(bsdf.outputs['BSDF'], output_node.inputs['Surface'])

    color_target = new_image_node(material, 'Bake target: shared base colour atlas', base_target)
    material.node_tree.nodes.active = color_target
    color_target.select = True
    for node in material.node_tree.nodes:
        if node != color_target: node.select = False
    return material, bsdf, output_node, source, mix

def bake_emission_source(material, output_node, color_socket, low, target):
    """Bake a shader color directly, without diffuse lighting or view transforms."""
    links = material.node_tree.links
    surface = output_node.inputs['Surface']
    original_surface = [link.from_socket for link in links if link.to_socket == surface]
    if len(original_surface) != 1:
        raise RuntimeError(f'Expected one surface shader before color bake; got {len(original_surface)}')
    emission = material.node_tree.nodes.new('ShaderNodeEmission')
    links.new(color_socket, emission.inputs['Color'])
    for link in list(links):
        if link.to_socket == surface:
            links.remove(link)
    links.new(emission.outputs['Emission'], surface)
    try:
        bake_pass('EMIT', low, None, material, target)
    finally:
        for link in list(links):
            if link.to_socket == surface:
                links.remove(link)
        links.new(original_surface[0], surface)
        material.node_tree.nodes.remove(emission)

def selected_for_bake(active, high=None):
    bpy.ops.object.select_all(action='DESELECT')
    active.hide_set(False)
    active.select_set(True)
    if high:
        high.hide_set(False)
        high.select_set(True)
    bpy.context.view_layer.objects.active = active
    bpy.context.view_layer.update()

def set_bake_target(material, image):
    nodes = material.node_tree.nodes
    target = next((node for node in nodes if node.type == 'TEX_IMAGE' and node.image == image), None)
    if target is None:
        target = new_image_node(material, 'Bake target: ' + image.name, image)
    for node in nodes: node.select = (node == target)
    nodes.active = target

def bake_pass(kind, low, high, material, target, selected_to_active=False):
    set_bake_target(material, target)
    scene.render.bake.use_selected_to_active = selected_to_active
    scene.render.bake.cage_extrusion = .025
    scene.render.bake.max_ray_distance = .12
    selected_for_bake(low, high if selected_to_active else None)
    clear = target.name not in baked_targets
    print(f'Baking {kind}: {low.name}', flush=True)
    bpy.ops.object.bake(type=kind, pass_filter={'COLOR'} if kind == 'DIFFUSE' else set(),
                        use_clear=clear, margin=16, margin_type='EXTEND')
    baked_targets.add(target.name)
    pixels = np.empty(target.size[0] * target.size[1] * 4, dtype=np.float32)
    target.pixels.foreach_get(pixels)
    rgb = pixels.reshape(-1, 4)[:, :3]
    print(f'BAKE_DIAG {kind} {low.name}: rgb=({rgb.min():.4f},{rgb.max():.4f}) nonzero={np.count_nonzero(rgb)}', flush=True)
    if not np.count_nonzero(rgb):
        raise RuntimeError(f'{kind} bake produced an empty atlas for {low.name}')

def clean_and_fit(filepath, record):
    objects_before_import = set(scene.objects)
    bpy.ops.import_scene.gltf(filepath=filepath)
    meshes = [obj for obj in scene.objects if obj not in objects_before_import and obj.type == 'MESH']
    if not meshes: raise RuntimeError('No mesh in ' + filepath)
    bpy.ops.object.select_all(action='DESELECT')
    for obj in meshes: obj.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    high = bpy.context.view_layer.objects.active
    high.hide_render = False
    high.hide_set(False)
    high.name = record['id'] + '_HighSource'
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    mesh_rotation = Euler(tuple(math.radians(v) for v in record.get('mesh_rotation', (0, 0, 0))), 'XYZ').to_matrix()
    mesh_scale = record.get('mesh_scale', (1, 1, 1))
    for vertex in high.data.vertices:
        vertex.co = mesh_rotation @ vertex.co
        vertex.co.x *= mesh_scale[0]
        vertex.co.y *= mesh_scale[1]
        vertex.co.z *= mesh_scale[2]
    high.data.update()
    bpy.context.view_layer.update()
    box = [high.matrix_world @ Vector(corner) for corner in high.bound_box]
    centre = sum(box, Vector()) / 8.0
    for vertex in high.data.vertices: vertex.co -= centre
    largest = max(high.dimensions)
    if largest <= 1e-6: raise RuntimeError(record['id'] + ' has zero size')
    scale = float(record['longest_axis_metres']) / largest
    for vertex in high.data.vertices: vertex.co *= scale

    bm = bmesh.new(); bm.from_mesh(high.data)
    bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=.0001)
    loose = [vert for vert in bm.verts if not vert.link_faces]
    if loose: bmesh.ops.delete(bm, geom=loose, context='VERTS')
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    for edge in bm.edges:
        if len(edge.link_faces) == 2:
            edge.smooth = edge.calc_face_angle() < math.radians(float(record.get('uv_angle_degrees', 55)))
    bm.to_mesh(high.data); bm.free(); high.data.update()
    for face in high.data.polygons: face.use_smooth = True
    low = high.copy(); low.data = high.data.copy(); low.name = record['id'] + '_LOD0_BakeTarget'
    scene.collection.objects.link(low)
    low.hide_render = False
    low.hide_set(False)
    bpy.context.view_layer.objects.active = low
    low.select_set(True)
    modifier = low.modifiers.new('LOD0 game triangle budget', 'DECIMATE')
    modifier.ratio = min(1.0, manifest['lod_triangles'][0] / max(1, len(low.data.polygons)))
    modifier.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    for poly in low.data.polygons: poly.use_smooth = True
    while len(low.data.uv_layers):
        low.data.uv_layers.remove(low.data.uv_layers[-1])
    bpy.ops.object.select_all(action='DESELECT')
    low.select_set(True)
    bpy.context.view_layer.objects.active = low
    bpy.ops.object.mode_set(mode='EDIT')
    bpy.ops.mesh.select_all(action='SELECT')
    # A 1.5 px island gap inside each 2048 px atlas quadrant. A larger
    # Smart UV margin leaves too little texel coverage and makes the bake look
    # mottled when the atlas is filtered in Unity.
    bpy.ops.uv.smart_project(island_margin=.0015, area_weight=0.0)
    bpy.ops.object.mode_set(mode='OBJECT')
    bake_uv = low.data.uv_layers.active
    if bake_uv is None: raise RuntimeError('Blender failed to create an atlas UV unwrap')
    bake_uv.name = 'AtlasUV'
    bpy.context.view_layer.update()
    return high, low

categories = {}
ship_objects = []
part_reports = []
for part in manifest['parts']:
    category = part['id']
    if category not in slots: raise RuntimeError('No texture atlas quadrant allocated for ' + category)
    print('Preparing component ' + category, flush=True)
    image = bpy.data.images.load(part['reference_path'], check_existing=False)
    image.name = category + '_ColorReference'
    image_pixels = np.empty(image.size[0]*image.size[1]*4, dtype=np.float32)
    image.pixels.foreach_get(image_pixels)
    pixels = image_pixels.reshape(image.size[1], image.size[0], 4)
    foreground = foreground_from_edge_connected_white(pixels[:,:,:3])
    rows, cols = np.where(foreground)
    if len(cols) < 1000: raise RuntimeError('Reference has no segmented foreground: ' + part['reference_path'])
    ref_box = (float(cols.min())/image.size[0], float(rows.min())/image.size[1],
               float(cols.max()+1)/image.size[0], float(rows.max()+1)/image.size[1])
    mask_pixels = np.ones(image_pixels.size, dtype=np.float32)
    mask_pixels.reshape(image.size[1], image.size[0], 4)[:,:,:3] = foreground[:,:,None].astype(np.float32)
    foreground_mask = bpy.data.images.new(category + '_ForegroundMask', image.size[0], image.size[1], alpha=False, float_buffer=False)
    foreground_mask.colorspace_settings.name = 'Non-Color'
    foreground_mask.pixels.foreach_set(mask_pixels)
    foreground_mask.pack()
    image.pack()
    print(f"Reference mask {category}: {foreground.mean():.1%} foreground", flush=True)
    del image_pixels, pixels, mask_pixels, foreground, rows, cols

    high, low = clean_and_fit(part['mesh_path'], part)
    axes = tuple(part.get('projection_axes', (0, 1)))
    coords_a = [vertex.co[axes[0]] for vertex in low.data.vertices]
    coords_b = [vertex.co[axes[1]] for vertex in low.data.vertices]
    local_bounds = (min(coords_a), max(coords_a), min(coords_b), max(coords_b))
    project_uv(low.data, local_bounds, ref_box, image.size, category, axes,
               bool(part.get('projection_flip_u', False)))
    fallback = {'Hull':(.39,.37,.31,1), 'Wing':(.39,.37,.31,1),
                'LandingGear':(.22,.24,.24,1), 'Drive':(.19,.21,.21,1)}[category]
    metal = {'Hull':.32, 'Wing':.27, 'LandingGear':.60, 'Drive':.66}[category]
    roughness = {'Hull':.68, 'Wing':.62, 'LandingGear':.55, 'Drive':.48}[category]
    projection_a = Vector((0, 0, 0)); projection_a[axes[0]] = 1.0
    projection_b = Vector((0, 0, 0)); projection_b[axes[1]] = 1.0
    projection_normal = projection_a.cross(projection_b)
    if part.get('projection_flip_u', False): projection_normal.negate()
    material, bsdf, output_node, source_node, projected_color = bake_material(
        category + '_Projection', image, foreground_mask, fallback, metal, roughness, base_atlas, projection_normal)
    high.data.materials.clear(); high.data.materials.append(material)
    low.data.materials.clear(); low.data.materials.append(material)
    set_bake_target(material, base_atlas)
    # Base color is data from the artwork, not a lighting result. Baking the
    # diffuse pass was darkening and desaturating the projected paint. Emit
    # the exact projected color into the target atlas instead.
    bake_emission_source(material, output_node, projected_color.outputs['Color'], low, base_atlas)

    normal_target = new_image_node(material, 'Bake target: shared tangent normal atlas', normal_atlas)
    for node in material.node_tree.nodes: node.select = (node == normal_target)
    material.node_tree.nodes.active = normal_target
    bake_pass('NORMAL', low, high, material, normal_atlas, selected_to_active=True)

    bake_pass('ROUGHNESS', low, high, material, rough_atlas)
    nodes = material.node_tree.nodes
    original_surface_links = [link for link in material.node_tree.links if link.to_node == output_node and link.to_socket == output_node.inputs['Surface']]
    for link in original_surface_links: material.node_tree.links.remove(link)
    emission_node = nodes.new('ShaderNodeEmission')
    emission_node.inputs['Color'].default_value = (metal, metal, metal, 1)
    material.node_tree.links.new(emission_node.outputs[0], output_node.inputs['Surface'])
    bake_pass('EMIT', low, high, material, metal_atlas)
    for link in list(material.node_tree.links):
        if link.to_node == output_node and link.to_socket == output_node.inputs['Surface']:
            material.node_tree.links.remove(link)
    material.node_tree.links.new(bsdf.outputs['BSDF'], output_node.inputs['Surface'])
    nodes.remove(emission_node)
    scene.render.bake.use_selected_to_active = False

    # Descending decimation keeps the original atlas UVs and gives each module
    # independent, useful triangle budgets at every ship LOD.
    lod_meshes = [low.data]
    for level in (1, 2):
        mesh_obj = bpy.data.objects.new(f'{category}_LOD{level}_work', lod_meshes[-1].copy())
        scene.collection.objects.link(mesh_obj)
        bpy.context.view_layer.objects.active = mesh_obj
        mesh_obj.select_set(True)
        lod_modifier = mesh_obj.modifiers.new(f'LOD{level} budget', 'DECIMATE')
        lod_modifier.ratio = min(1.0, manifest['lod_triangles'][level] / max(1, len(mesh_obj.data.polygons)))
        lod_modifier.use_collapse_triangulate = True
        if hasattr(lod_modifier, 'use_collapse_uvs'): lod_modifier.use_collapse_uvs = True
        bpy.ops.object.modifier_apply(modifier=lod_modifier.name)
        lod_meshes.append(mesh_obj.data)
        bpy.data.objects.remove(mesh_obj, do_unlink=True)

    instances = part['instances']
    if not instances: raise RuntimeError('No placed instances for ' + category)
    for level, mesh_data in enumerate(lod_meshes):
        for instance in instances:
            name = instance['name'] + f'_LOD{level}'
            obj = bpy.data.objects.new(name, mesh_data.copy())
            scene.collection.objects.link(obj)
            obj.data.materials.clear(); obj.data.materials.append(material)
            obj.location = Vector(instance['position'])
            obj.rotation_euler = Euler(tuple(math.radians(v) for v in instance['rotation']), 'XYZ')
            obj.hide_render = level > 0
            obj.hide_set(level > 0)
            ship_objects.append(obj)
    part_reports.append({'part':category, 'reference':Path(part['reference_path']).name,
                         'texture_quadrant':slots[category],
                         'lod_triangles':[len(m.polygons) for m in lod_meshes],
                         'instances':[i['name'] for i in instances]})
    bpy.data.objects.remove(high, do_unlink=True)
    bpy.data.objects.remove(low, do_unlink=True)
    print(f"Baked {category}; LOD triangles: {[len(m.polygons) for m in lod_meshes]}", flush=True)

# Bake roughness into the alpha channel of the metallic texture (Unity URP uses
# alpha as smoothness), producing a compact standard metallic/smoothness map.
met = np.empty(atlas_size*atlas_size*4, dtype=np.float32)
rough = np.empty(atlas_size*atlas_size*4, dtype=np.float32)
metal_atlas.pixels.foreach_get(met); rough_atlas.pixels.foreach_get(rough)
met = met.reshape(-1,4); rough = rough.reshape(-1,4)
met[:,3] = 1.0 - rough[:,0]
metal_atlas.pixels.foreach_set(met.reshape(-1))
del met, rough
def save_texture(image, filename):
    probe = np.empty(image.size[0] * image.size[1] * 4, dtype=np.float32)
    image.pixels.foreach_get(probe)
    print(f'SAVE_DIAG before {filename}: {probe.reshape(-1,4)[:,:3].min():.4f}..{probe.reshape(-1,4)[:,:3].max():.4f}', flush=True)
    image.save()
    image.pixels.foreach_get(probe)
    print(f'SAVE_DIAG after {filename}: {probe.reshape(-1,4)[:,:3].min():.4f}..{probe.reshape(-1,4)[:,:3].max():.4f}', flush=True)

save_texture(base_atlas, 'Kestrel_BaseColor.png')
save_texture(normal_atlas, 'Kestrel_Normal.png')
save_texture(rough_atlas, 'Kestrel_Roughness_source.png')
save_texture(metal_atlas, 'Kestrel_MetallicSmoothness.png')

final = bpy.data.materials.new('Kestrel / baked 4K ship atlas')
final.use_nodes = True
final_bsdf = final.node_tree.nodes.get('Principled BSDF')
final_bsdf.inputs['Metallic'].default_value = .45
final_bsdf.inputs['Roughness'].default_value = .62
albedo_node = new_image_node(final, 'Kestrel 4K base colour', base_atlas)
final.node_tree.links.new(albedo_node.outputs['Color'], final_bsdf.inputs['Base Color'])
normal_node = new_image_node(final, 'Kestrel baked detail normals', normal_atlas)
normal_map = final.node_tree.nodes.new('ShaderNodeNormalMap')
normal_map.inputs['Strength'].default_value = .8
final.node_tree.links.new(normal_node.outputs['Color'], normal_map.inputs['Color'])
final.node_tree.links.new(normal_map.outputs['Normal'], final_bsdf.inputs['Normal'])
metal_node = new_image_node(final, 'Kestrel metallic / smoothness', metal_atlas)
final.node_tree.links.new(metal_node.outputs['Color'], final_bsdf.inputs['Metallic'])
final_bsdf.inputs['Roughness'].default_value = .62

for obj in ship_objects: obj.data.materials.clear(); obj.data.materials.append(final)
bpy.ops.object.select_all(action='DESELECT')
for obj in ship_objects: obj.hide_set(False)
export_objects = list(ship_objects)
for obj in export_objects: obj.select_set(True)
bpy.context.view_layer.objects.active = next(obj for obj in export_objects if obj.name.endswith('_LOD0'))
fbx_path = output / 'Kestrel_K017.fbx'
bpy.ops.export_scene.fbx(filepath=str(fbx_path), use_selection=True,
                          object_types={'MESH'}, add_leaf_bones=False,
                          axis_forward='-Z', axis_up='Y', apply_unit_scale=True,
                          path_mode='COPY', embed_textures=False, mesh_smooth_type='FACE')

# Hide reduced LOD copies for the editable Blender scene and review renders.
for obj in ship_objects:
    if '_LOD0' not in obj.name: obj.hide_set(True)
    else: obj.hide_set(False)
for obj in bpy.context.selected_objects: obj.select_set(False)

world = bpy.data.worlds.new('Space Patriot neutral hangar studio')
world.use_nodes = True
world.node_tree.nodes['Background'].inputs['Color'].default_value = (.16,.19,.22,1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value = .55
scene.world = world
for name, position, energy, size in [('Key',(-8,15,-12),5200,14),('Rim',(14,11,9),6800,11),('Fill',(-2,6,14),2100,12)]:
    light_data = bpy.data.lights.new(name, 'AREA'); light_data.energy=energy; light_data.shape='DISK'; light_data.size=size
    light=bpy.data.objects.new(name,light_data); scene.collection.objects.link(light); light.location=position
    light.rotation_euler=(Vector((0,2,0))-light.location).to_track_quat('-Z','Y').to_euler()
camera_data=bpy.data.cameras.new('Kestrel art review camera');camera=bpy.data.objects.new('Kestrel art review camera',camera_data);scene.collection.objects.link(camera);scene.camera=camera
camera_data.type='ORTHO'
all_r=[obj for obj in ship_objects if '_LOD0' in obj.name]
bounds=None
for obj in all_r:
    for corner in obj.bound_box:
        p=obj.matrix_world@Vector(corner)
        if bounds is None:bounds=[p.copy(),p.copy()]
        else:
            bounds[0]=Vector((min(bounds[0].x,p.x),min(bounds[0].y,p.y),min(bounds[0].z,p.z)))
            bounds[1]=Vector((max(bounds[1].x,p.x),max(bounds[1].y,p.y),max(bounds[1].z,p.z)))
centre=(bounds[0]+bounds[1])*.5
extent=max(bounds[1]-bounds[0]);camera_data.ortho_scale=extent*1.26
scene.render.engine='BLENDER_EEVEE_NEXT'
scene.render.resolution_x=1500;scene.render.resolution_y=1125;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX'
scene.render.image_settings.file_format='PNG'
for label,direction,up in [
    ('quarter',Vector((.22,.72,-1.0)),Vector((0,1,0))),
    ('side',Vector((0,.28,-1)),Vector((0,1,0))),
    ('top',Vector((0,1,.02)),Vector((0,0,1)))]:
    camera.location=centre+direction.normalized()*extent*2.0
    camera.rotation_euler=(centre-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(renders/(label+'.png'))
    bpy.ops.render.render(write_still=True)

bpy.ops.object.select_all(action='DESELECT')
bpy.ops.wm.save_as_mainfile(filepath=str(output/'Kestrel_K017.blend'), compress=True)
(output/'assembly-report.json').write_text(json.dumps({
    'ship':manifest['ship'],'build_id':manifest['build_id'],'units':'metres',
    'parts':part_reports,'instances':sum(len(p['instances']) for p in manifest['parts']),
    'lod_triangle_targets':manifest['lod_triangles'],
    'textures':{'base_color':'Textures/Kestrel_BaseColor.png','normal':'Textures/Kestrel_Normal.png',
                'metallic_smoothness':'Textures/Kestrel_MetallicSmoothness.png',
                'roughness_source':'Textures/Kestrel_Roughness_source.png',
                'atlas_size_px':atlas_size,'layout':'2x2 shared material atlas; Hull, Wing, LandingGear, Drive'},
    'fbx':fbx_path.name,'editable_blend':'Kestrel_K017.blend',
    'status':'Assembled modular review candidate. Colors projected and baked from component references; high detail baked to tangent normal atlas.'},indent=2),encoding='utf8')
print('SHIP_ASSEMBLY_COMPLETE '+str(output),flush=True)
