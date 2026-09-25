/* Generated from the user's machineworks.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
import {GEOMETRY,flatten} from './geometry.mjs';
/* Uses the HOST'S Three.js instance. Never creates a renderer, loop, camera, light, or DOM element. */
export class ThreeMachineView {
 constructor(THREE,scene,model){if(!THREE?.Group||!scene?.add)throw Error('Supply the host THREE namespace and scene');this.THREE=THREE;this.model=model;this.group=new THREE.Group();this.group.name='MachineWorks';scene.add(this.group);this.geometries=new Map();this.meshes=new Map();this.materials=new Map();for(const [name,g]of Object.entries(GEOMETRY)){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(g.positions,3));geo.setAttribute('normal',new THREE.BufferAttribute(g.normals,3));geo.setAttribute('uv',new THREE.BufferAttribute(g.uvs,2));geo.setIndex(new THREE.BufferAttribute(g.indices,1));geo.computeBoundingSphere();this.geometries.set(name,geo);}}
 sync(items=this.model.flatten()){
  const T=this.THREE,seen=new Set(),materials=new Set();for(const item of items){const id=item.node.uid;seen.add(id);let material=this.materials.get(item.material);if(!material){material=new T.MeshStandardMaterial();this.materials.set(item.material,material);}materials.add(item.material);material.color.set(item.material.color);material.metalness=item.material.metalness;material.roughness=item.material.roughness;material.emissive.set(item.material.color);material.emissiveIntensity=item.material.emissive;
   let mesh=this.meshes.get(id);if(!mesh){mesh=new T.Mesh(this.geometries.get(item.geometry),material);mesh.name=item.node.name||'machine part';mesh.matrixAutoUpdate=false;mesh.castShadow=true;mesh.receiveShadow=true;mesh.userData.machineId=item.machineId;this.group.add(mesh);this.meshes.set(id,mesh);}mesh.matrix.fromArray(item.world);mesh.matrixWorldNeedsUpdate=true;mesh.material=material;
  }
  for(const [id,mesh]of this.meshes)if(!seen.has(id)){this.group.remove(mesh);this.meshes.delete(id);}for(const [key,material]of this.materials)if(!materials.has(key)){material.dispose();this.materials.delete(key);}
 }
 dispose(){this.group.removeFromParent();for(const g of this.geometries.values())g.dispose();for(const m of this.materials.values())m.dispose();this.geometries.clear();this.materials.clear();this.meshes.clear();}
}
