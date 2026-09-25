import {T} from './primitives.js';
import {createFireworks} from '../engines/fireworks.js';
// Visuals follow authoritative shots. Damage remains in the swept collision path.
export class WeaponStage{
 constructor(stage){this.stage=stage;this.root=new T.Group();stage.scene.add(this.root);this.missiles=new Map();this.geo=new T.CylinderGeometry(1,1,1,6,1);this.beams=[];
  for(let i=0;i<80;i++){const core=new T.Mesh(this.geo,new T.MeshBasicMaterial({color:0xff2511,toneMapped:false,transparent:true,depthWrite:false})),glow=new T.Mesh(this.geo,new T.MeshBasicMaterial({color:0xff1905,toneMapped:false,transparent:true,depthWrite:false,opacity:.13,blending:T.AdditiveBlending}));this.root.add(core,glow);this.beams.push({core,glow});}
  this.root.traverse(o=>{o.userData.skipAO=true;o.raycast=()=>{};});
 }
 beam(slot,a,b,color,opacity,origin){const C=LongwayCore,aa=new T.Vector3(...C.sub(a,origin).map(x=>x*1000)),bb=new T.Vector3(...C.sub(b,origin).map(x=>x*1000)),d=bb.clone().sub(aa),length=d.length();if(length<.001)return;
  const center=aa.clone().add(bb).multiplyScalar(.5),distance=center.distanceTo(this.stage.camera.position),pixel=distance*Math.tan(this.stage.camera.fov*Math.PI/360)/Math.max(600,this.stage.canvas.clientHeight),radius=Math.max(.035,Math.min(1.5,pixel*.9));
  for(const [mesh,mult]of [[slot.core,1],[slot.glow,2.7]]){mesh.visible=true;mesh.position.copy(center);mesh.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),d.normalize());mesh.scale.set(radius*mult,length,radius*mult);mesh.material.color.set(color);mesh.material.opacity=opacity*(mult>1?.12:.9);}
 }
 update(time,origin){const C=LongwayCore,B=this.stage.app.combat;for(const s of this.beams)s.core.visible=s.glow.visible=false;let i=0;const ids=new Set();
  for(const e of B.effects)if((e.kind==='laser'||e.color===1)&&i<this.beams.length)this.beam(this.beams[i++],e.a,e.b,0xff2511,Math.min(1,e.ttl/.06),origin);
  for(const p of B.projectiles){if(p.weapon!=='missile'){if(i<this.beams.length){const length=Math.min(.045,Math.max(.001,C.length(p.velocity)*.035));this.beam(this.beams[i++],p.position,C.sub(p.position,C.mul(p.direction,length)),0xffb249,1,origin);}continue;}
   ids.add(p.id);let v=this.missiles.get(p.id);if(!v&&this.missiles.size<12){const root=new T.Group(),body=new T.Mesh(new T.CylinderGeometry(.13,.18,2.4,8),this.stage.materials.steel);body.userData.combatEntity=true;root.add(body);const fire=createFireworks({height:5,width:.24,flameCount:120,emberCount:8,smokeCount:35,smoke:.06,temperature:.65,glow:.3,wind:0,gust:.12});fire.root.position.y=-1.3;fire.root.rotation.x=Math.PI;root.add(fire.root);root.traverse(o=>{o.userData.skipAO=true;o.raycast=()=>{};});this.root.add(root);v={root,fire,body};this.missiles.set(p.id,v);}
   if(v){v.root.position.set(...C.sub(p.position,origin).map(x=>x*1000));v.root.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(...p.direction));v.fire.root.visible=(p.motorTime??8)>0;v.fire.update(time);}
  }
  for(const [id,v]of this.missiles)if(!ids.has(id)){v.fire.dispose();v.body.geometry.dispose();v.root.removeFromParent();this.missiles.delete(id);}
  this.stats={visibleSegments:i,missilePlumes:this.missiles.size,laserColor:'red',kinetic:'amber tracer',guidance:'infrared'};
 }
}
