"""Render atlas-textured part and ship-plan comparison views from a Blender build."""
import argparse
import json
import sys
from pathlib import Path

import bpy
from mathutils import Matrix, Vector

args_parser = argparse.ArgumentParser()
args_parser.add_argument('--blend', required=True, type=Path)
args_parser.add_argument('--output', required=True, type=Path)
args = args_parser.parse_args(sys.argv[sys.argv.index('--')+1:])
out = args.output.resolve()
out.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.open_mainfile(filepath=str(args.blend.resolve()))
scene = bpy.context.scene
scene.render.engine = 'BLENDER_EEVEE_NEXT'
scene.render.resolution_x = 1024
scene.render.resolution_y = 1024
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.render.film_transparent = True
scene.render.image_settings.color_mode = 'RGBA'
scene.view_settings.view_transform = 'Standard'
scene.view_settings.look = 'None'
scene.view_settings.exposure = 0
scene.view_settings.gamma = 1
scene.world.color = (0, 0, 0)
camera_data = bpy.data.cameras.new('Comparison orthographic camera')
camera = bpy.data.objects.new('Comparison orthographic camera', camera_data)
scene.collection.objects.link(camera)
scene.camera = camera
camera_data.type = 'ORTHO'
camera_data.lens = 50
scene.render.resolution_percentage = 100

# Use a temporary unlit material that samples the exact atlas UVs, removing
# lighting and tone mapping as possible sources of apparent color mismatch.
atlas = bpy.data.images.get('Kestrel_BaseColor_4096')
if atlas is None:
    atlas = bpy.data.images.load(str(args.blend.parent / 'Textures/Kestrel_BaseColor.png'), check_existing=True)
flat = bpy.data.materials.new('Comparison / unlit atlas sample')
flat.use_nodes = True
flat.node_tree.nodes.clear()
tex = flat.node_tree.nodes.new('ShaderNodeTexImage')
tex.image = atlas
tex.interpolation = 'Linear'
emission = flat.node_tree.nodes.new('ShaderNodeEmission')
output = flat.node_tree.nodes.new('ShaderNodeOutputMaterial')
flat.node_tree.links.new(tex.outputs['Color'], emission.inputs['Color'])
flat.node_tree.links.new(emission.outputs[0], output.inputs['Surface'])
flat.diffuse_color = (1, 1, 1, 1)

def camera_for_axes(center, axis_a, axis_b, dimensions):
    a = Vector(tuple(axis_a)); a.normalize()
    b = Vector(tuple(axis_b)); b.normalize()
    back = a.cross(b).normalized()
    # Matrix columns are the camera's right, up and backward axes.
    camera.rotation_euler = Matrix((a, b, back)).transposed().to_quaternion().to_euler()
    camera.location = center + back * max(dimensions) * 3
    camera_data.ortho_scale = max(dimensions) * 1.18

def render(path):
    scene.render.filepath = str(path)
    bpy.ops.render.render(write_still=True)

def render_directional(center, extent, direction, up, filename):
    back = Vector(direction).normalized()
    up = Vector(up).normalized()
    right = up.cross(back).normalized()
    camera_up = back.cross(right).normalized()
    camera.location = center + back * extent * 2.2
    camera.rotation_euler = Matrix((right, camera_up, back)).transposed().to_quaternion().to_euler()
    camera_data.ortho_scale = extent * 1.2
    render(out / filename)

views = [
    ('Nose', (1,0,0), (0,1,0)),
    ('Aft', (-1,0,0), (0,1,0)),
    ('Starboard', (0,0,1), (0,1,0)),
    ('Port', (0,0,-1), (0,1,0)),
    ('Top', (0,1,0), (0,0,1)),
    ('Bottom', (0,-1,0), (0,0,-1)),
]

parts = [obj for obj in scene.objects if obj.type == 'MESH' and '_LOD0' in obj.name]
if not parts:
    raise RuntimeError('No LOD0 meshes in the saved ship build')
original_materials = {obj.name: list(obj.data.materials) for obj in parts}
original_poses = {obj.name: (obj.location.copy(), obj.rotation_euler.copy(), obj.scale.copy(), obj.hide_render) for obj in parts}
for obj in parts:
    obj.data.materials.clear()
    obj.data.materials.append(flat)

manifest = json.loads((args.blend.parent / 'build-manifest.json').read_text(encoding='utf-8'))
axis_vectors = {0:(1,0,0), 1:(0,1,0), 2:(0,0,1)}
for part in manifest['parts']:
    category = part['id']
    object_prefix = {'LandingGear':'Gear'}.get(category, category)
    candidates = [obj for obj in parts if obj.name.startswith(object_prefix + '_')]
    if not candidates:
        candidates = [obj for obj in parts if obj.name.startswith(object_prefix)]
    if not candidates:
        raise RuntimeError(f'No LOD0 mesh instance for {category}')
    obj = candidates[0]
    # Isolate the canonical part pose for the part/reference comparison.
    for other in parts:
        other.hide_render = other != obj
    obj.hide_render = False
    obj.location = (0,0,0)
    obj.rotation_euler = (0,0,0)
    obj.scale = (1,1,1)
    deps = bpy.context.evaluated_depsgraph_get()
    bounds = [obj.matrix_world @ Vector(corner) for corner in obj.bound_box]
    low = Vector((min(v.x for v in bounds), min(v.y for v in bounds), min(v.z for v in bounds)))
    high = Vector((max(v.x for v in bounds), max(v.y for v in bounds), max(v.z for v in bounds)))
    center = (low + high) * .5
    dimensions = high - low
    axes = part.get('projection_axes', [0,1])
    axis_a = axis_vectors[axes[0]]
    if part.get('projection_flip_u', False): axis_a = tuple(-v for v in axis_a)
    camera_for_axes(center, axis_a, axis_vectors[axes[1]], dimensions)
    render(out / f'{category}_atlas.png')
    # Produce true atlas-textured model views from all six principal axes.
    # These are model-relative captures, so remaining surfaces can be
    # inspected even when the concept supplies only one camera angle.
    for view_name, direction, up in views:
        render_directional(center, max(dimensions), direction, up,
                           f'{category}_View_{view_name}.png')
    pose = original_poses[obj.name]
    obj.location, obj.rotation_euler, obj.scale, obj.hide_render = pose
    bpy.context.view_layer.update()

# A ship-level plan view preserves every mount offset and detects incorrect
# spacing/orientation that per-part shape normalization would hide.
for obj in parts:
    pose = original_poses[obj.name]
    obj.location, obj.rotation_euler, obj.scale = pose[:3]
    obj.hide_render = False
bpy.context.view_layer.update()
mins = Vector((min((o.matrix_world @ Vector(c)).x for o in parts for c in o.bound_box),
               min((o.matrix_world @ Vector(c)).y for o in parts for c in o.bound_box),
               min((o.matrix_world @ Vector(c)).z for o in parts for c in o.bound_box)))
maxs = Vector((max((o.matrix_world @ Vector(c)).x for o in parts for c in o.bound_box),
               max((o.matrix_world @ Vector(c)).y for o in parts for c in o.bound_box),
               max((o.matrix_world @ Vector(c)).z for o in parts for c in o.bound_box)))
center = (mins + maxs) * .5
dimensions = maxs - mins
bpy.context.view_layer.update()
camera.location = center + Vector((.22,.72,-1)).normalized() * max(dimensions) * 2.2
camera.rotation_euler = (center-camera.location).to_track_quat('-Z','Y').to_euler()
camera_data.ortho_scale = max(dimensions) * 1.26
render(out / 'ShipQuarter_atlas.png')
# Plan view is from above the ship (world +Y) with nose kept on the left.
camera_for_axes(center, (-1,0,0), (0,0,1), dimensions)
render(out / 'ShipPlan_atlas.png')
for view_name, direction, up in views:
    render_directional(center, max(dimensions), direction, up,
                       f'Ship_View_{view_name}.png')

# Blender opened a disposable process: restore materials anyway so this script
# stays safe if reused interactively.
for obj in parts:
    obj.data.materials.clear()
    for material in original_materials[obj.name]:
        obj.data.materials.append(material)
print('COMPARISON_RENDER_COMPLETE', str(out), flush=True)
