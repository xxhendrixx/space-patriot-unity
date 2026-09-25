"""Blender 4.5: clean a generated component, make LODs and a rigid mechanical rig.

Usage: blender --background --python clean_and_rig.py -- --input raw.glb --output folder
The result is a review candidate, not automatically a replacement for a game asset.
"""
import argparse
import json
import math
import sys
from pathlib import Path
import bpy
import bmesh
from mathutils import Vector

parser=argparse.ArgumentParser()
parser.add_argument("--input",required=True,type=Path)
parser.add_argument("--output",required=True,type=Path)
parser.add_argument("--name",default="Kestrel_Drive")
parser.add_argument("--metres",type=float,default=6)
parser.add_argument("--faces",type=int,default=45000)
parser.add_argument("--skip-renders",action="store_true",help="Export mesh/rig only for a quick pipeline check")
args=parser.parse_args(sys.argv[sys.argv.index("--")+1:])
args.output.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(args.input.resolve()))
print('Imported generated mesh; cleaning source',flush=True)
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
if not objects:raise RuntimeError("No mesh was imported")
bpy.ops.object.select_all(action='DESELECT')
for obj in objects:obj.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.object.join();high=bpy.context.object;high.name=args.name+"_Source"
bpy.ops.object.transform_apply(location=False,rotation=True,scale=True)
centre=sum((high.matrix_world@Vector(c) for c in high.bound_box),Vector())/8
for vert in high.data.vertices:vert.co-=centre-high.location
high.location=(0,0,0)
scale=args.metres/max(high.dimensions)
for vert in high.data.vertices:vert.co*=scale
bm=bmesh.new();bm.from_mesh(high.data)
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.0001)
loose=[v for v in bm.verts if not v.link_faces]
if loose:bmesh.ops.delete(bm,geom=loose,context='VERTS')
bmesh.ops.recalc_face_normals(bm,faces=list(bm.faces))
for edge in bm.edges:
    if len(edge.link_faces)==2:edge.smooth=edge.calc_face_angle()<math.radians(42)
bm.to_mesh(high.data);bm.free();high.data.update()
bpy.context.view_layer.update()
for face in high.data.polygons:face.use_smooth=True
clay=bpy.data.materials.new('Inspection clay / geometry only');clay.diffuse_color=(.39,.43,.44,1);clay.use_nodes=True
bsdf=clay.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(.39,.43,.44,1);bsdf.inputs['Roughness'].default_value=.48;bsdf.inputs['Metallic'].default_value=.3
high.data.materials.clear();high.data.materials.append(clay)

lods=[];counts=[]
for level,budget in enumerate([args.faces,max(1000,args.faces//3),max(500,args.faces//9)]):
    source=high if level==0 else lods[-1]
    obj=source.copy();obj.data=source.data.copy();obj.name=f'{args.name}_LOD{level}';bpy.context.collection.objects.link(obj);obj.hide_set(False)
    print(f'Reducing LOD{level}: {len(obj.data.polygons)} to {budget} triangles',flush=True)
    bpy.context.view_layer.objects.active=obj
    modifier=obj.modifiers.new('Geometry budget','DECIMATE');modifier.ratio=min(1,budget/len(obj.data.polygons));modifier.use_collapse_triangulate=True
    bpy.ops.object.modifier_apply(modifier=modifier.name)
    counts.append(len(obj.data.polygons));lods.append(obj)
    print(f'LOD{level} ready: {len(obj.data.polygons)} triangles',flush=True)
    obj.hide_render=level>0;obj.hide_set(level>0)
high.hide_render=True;high.hide_set(True)

# A rigid hinge keeps the generated casing intact. Moving internals are authored
# as separate generated/modelled components; no deformation of hard metal.
arm=bpy.data.armatures.new(args.name+'_Mechanism')
rig=bpy.data.objects.new(args.name+'_Rig',arm);bpy.context.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);bpy.context.view_layer.objects.active=rig
bpy.ops.object.mode_set(mode='EDIT')
root=arm.edit_bones.new('Mount');root.head=(0,0,0);root.tail=(0,0,.4)
hinge=arm.edit_bones.new('DriveGimbal');hinge.head=(0,0,-high.dimensions.z*.35);hinge.tail=hinge.head+Vector((0,0,.5));hinge.parent=root
bpy.ops.object.mode_set(mode='OBJECT');rig.show_in_front=True
for obj in lods:
    group=obj.vertex_groups.new(name='DriveGimbal');group.add(list(range(len(obj.data.vertices))),1.0,'REPLACE')
    modifier=obj.modifiers.new('Rigid mechanical hinge','ARMATURE');modifier.object=rig;obj.parent=rig
rig.animation_data_create();bone=rig.pose.bones['DriveGimbal'];bone.rotation_mode='XYZ'
for name,angles in [('Flight',(0,math.pi/2)),('Landing',(math.pi/2,0))]:
    action=bpy.data.actions.new(args.name+'_'+name);rig.animation_data.action=action
    for frame,angle in zip((1,45),angles):bone.rotation_euler=(angle,0,0);bone.keyframe_insert(data_path='rotation_euler',frame=frame,group='DriveGimbal')
    track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=True
rig.animation_data.action=None;bone.rotation_euler=(0,0,0)

scene=bpy.context.scene;scene.unit_settings.system='METRIC';scene.render.fps=30;scene.frame_start=1;scene.frame_end=45
scene.frame_set(1)
bpy.ops.object.select_all(action='DESELECT');rig.select_set(True)
for obj in lods:obj.hide_set(False);obj.select_set(True)
bpy.ops.export_scene.fbx(filepath=str((args.output/(args.name+'.fbx')).resolve()),use_selection=True,object_types={'MESH','ARMATURE'},add_leaf_bones=False,
                        axis_forward='-Z',axis_up='Y',apply_unit_scale=True,bake_anim=True,bake_anim_use_nla_strips=False,bake_anim_use_all_actions=True,
                        bake_anim_force_startend_keying=True,bake_anim_simplify_factor=0.0)
for i,obj in enumerate(lods):obj.hide_set(i>0)

def aim(obj,point):obj.rotation_euler=(Vector(point)-obj.location).to_track_quat('-Z','Y').to_euler()
world=bpy.data.worlds.new('Neutral inspection studio');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.11,.13,.16,1);world.node_tree.nodes['Background'].inputs[1].default_value=.5
for name,position,energy,size in [('Key',(-5,-5,7),1700,5),('Rim',(4,3,5),2200,4),('Fill',(4,-4,1),800,5)]:
    data=bpy.data.lights.new(name,'AREA');data.energy=energy;data.shape='DISK';data.size=size;obj=bpy.data.objects.new(name,data);scene.collection.objects.link(obj);obj.location=Vector(position)*args.metres/6;aim(obj,(0,0,0))
camera=bpy.data.objects.new('Inspection camera',bpy.data.cameras.new('Inspection camera'));scene.collection.objects.link(camera);scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=args.metres*1.32
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.render.resolution_x=1280;scene.render.resolution_y=1000;scene.render.resolution_percentage=100
scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
for label,point in ([] if args.skip_renders else [('front',(0,-1,.14)),('quarter',(1,-1,.55)),('rear',(0,1,.14))]):
    camera.location=Vector(point).normalized()*args.metres*2;aim(camera,(0,0,0));scene.render.filepath=str((args.output/(label+'.png')).resolve());bpy.ops.render.render(write_still=True)
bpy.ops.wm.save_as_mainfile(filepath=str((args.output/(args.name+'.blend')).resolve()),compress=True)
(args.output/'blender-report.json').write_text(json.dumps({'source':args.input.name,'source_faces':len(high.data.polygons),'lod_faces':counts,'nominal_metres':args.metres,
    'clips':['Flight','Landing'],'rig':'Rigid DriveGimbal under Mount','materials':'Inspection clay; production UVs and materials pending','status':'Candidate for visual review'},indent=2),encoding='utf8')
