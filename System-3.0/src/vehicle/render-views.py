"""Blender: --background --python render-views.py -- MODEL.glb OUTPUT_DIR"""
import bpy,math,sys
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
model=Path(args[0]);out=Path(args[1]);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(model))
def region(obj):
 n='';x=obj
 while x:n+=' '+x.name.lower();x=x.parent
 if any(v in n for v in ['glass','wiper','light']):return 'vidros'
 if any(v in n for v in ['wheel_','rim_','tire','brake','nuts']):return 'rodas'
 if any(v in n for v in ['leather','carpet','interior','steering']):return 'interior'
 if 'body' in n:return 'pintura'
 return 'acabamentos'
materials=[]
for obj in bpy.context.scene.objects:
 if obj.type!='MESH':continue
 z=region(obj)
 for slot in obj.material_slots:
  if not slot.material:continue
  slot.material=slot.material.copy();m=slot.material;m.use_nodes=True;bs=m.node_tree.nodes.get('Principled BSDF')
  if not bs:continue
  if z=='interior':bs.inputs['Base Color'].default_value=(.025,.032,.028,1);bs.inputs['Roughness'].default_value=.55
  if z=='acabamentos':bs.inputs['Base Color'].default_value=(.04,.05,.045,1);bs.inputs['Roughness'].default_value=.4
  if z=='rodas':bs.inputs['Base Color'].default_value=(.012,.015,.014,1);bs.inputs['Roughness'].default_value=.55
  if z=='pintura':bs.inputs['Base Color'].default_value=(.32,.37,.35,1);bs.inputs['Metallic'].default_value=.55;bs.inputs['Roughness'].default_value=.22;bs.inputs['Coat Weight'].default_value=.7
  if z=='interior' and 'leather' in obj.name:bs.inputs['Base Color'].default_value=(.08,.105,.09,1);bs.inputs['Roughness'].default_value=.6
  if 'glass' in obj.name:bs.inputs['Base Color'].default_value=(.018,.03,.035,1);bs.inputs['Transmission Weight'].default_value=0;bs.inputs['Specular IOR Level'].default_value=.08;bs.inputs['Roughness'].default_value=.2
  if 'rim' in obj.name:bs.inputs['Base Color'].default_value=(.22,.25,.24,1);bs.inputs['Metallic'].default_value=.85;bs.inputs['Roughness'].default_value=.23
  materials.append((m,bs,z,list(bs.inputs['Base Color'].default_value)))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));plane=bpy.context.object;plane.name='Ground';plane.is_shadow_catcher=True
m=bpy.data.materials.new('Ground');m.diffuse_color=(.9,.92,.9,1);plane.data.materials.append(m)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=True
scene.render.resolution_x=720;scene.render.resolution_y=450;scene.render.resolution_percentage=100;scene.render.film_transparent=True;scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGBA'
scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.8,.84,.82,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.4
scene.view_settings.view_transform='AgX';scene.view_settings.look='AgX - Medium High Contrast';scene.view_settings.exposure=-.25
for name,pos,power,size in [('Key',(1,1,6),950,5),('Strip',(-3,0,4),750,4),('Rim',(2,-4,3),950,4)]:
 bpy.ops.object.light_add(type='AREA',location=pos);l=bpy.context.object;l.name=name;l.data.energy=power;l.data.shape='DISK';l.data.size=size;l.rotation_euler=(Vector((0,0,.5))-l.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add();camera=bpy.context.object;scene.camera=camera;camera.data.type='ORTHO';camera.data.ortho_scale=5.8
def shot(name,pos,target=(0,0,.5),scale=5.8,focus=None):
 camera.location=pos;camera.rotation_euler=(Vector(target)-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.ortho_scale=scale
 for m,bs,z,original in materials:
  bs.inputs['Base Color'].default_value=original
  if focus and z==focus:bs.inputs['Base Color'].default_value=(.18,.59,.46,1)
  bs.inputs['Alpha'].default_value=0 if focus=='interior' and z in ['pintura','vidros'] else 1
 scene.render.filepath=str(out/(name+'.png'));bpy.ops.render.render(write_still=True);print('DONE',name,flush=True)
for i in range(8):
 a=math.radians(39+i*45);shot('turn-'+str(i),(7*math.sin(a),7*math.cos(a),2.5))
shot('pintura',(4.8,5.8,2.7),focus='pintura')
shot('vidros',(3.8,4.5,4.7),target=(0,.2,.7),scale=5.2,focus='vidros')
shot('rodas',(4.5,3.5,1.3),target=(.7,1.1,.4),scale=3.25,focus='rodas')
shot('interior',(3.5,2,5),target=(0,0,.6),scale=4.6,focus='interior')
shot('acabamentos',(4.7,5.2,1.8),focus='acabamentos')
