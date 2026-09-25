import {T,frame} from './primitives.js';
import {VegetationStage} from './vegetation-stage.js';
import {createFireworks} from '../engines/fireworks.js';
import {MagicEngine} from '../engines/spellworks.js';
// Positions are km in the simulation; the reusable particle engines use metres.
export class EngineStage {
 constructor(stage){this.stage=stage;this.app=stage.app;this.fires=[];this.seen=new Set();this.effectRoot=new T.Group();stage.scene.add(this.effectRoot);this.localCamera=new T.PerspectiveCamera();
  this.magic=new MagicEngine({scene:this.effectRoot,camera:this.localCamera,groundY:-1000,settings:{preset:'fire',auto:false,ambient:false,quality:'balanced',density:.4,impact:.5,shockwaves:false,shake:false,sound:false}});
  this.effectRoot.traverse(o=>{o.userData.skipAO=true;});this.processed=0;this.lastTime=null;this.vegetation=new VegetationStage(stage);this.eventCounts={impact:0,laser:0,explosion:0,lightning:0};
 }
 basis(b,p){const C=LongwayCore,up=C.unit(C.sub(p,b.center)),right=C.unit(C.cross([0,1,0],up),[1,0,0]),forward=C.unit(C.cross(up,right));return {center:p.slice(),up,right,forward};}
 local(p){const C=LongwayCore,d=C.sub(p,this.anchor.center),f=this.anchor;return new T.Vector3(C.dot(d,f.right)*1000,C.dot(d,f.up)*1000,-C.dot(d,f.forward)*1000);}
 addFire(b,p,life=8,scale=1,seed=b.seed,cause='explosive'){
  if(!['lightning','explosive','incendiary'].includes(cause)||!Number.isFinite(life)||b.atmosphere<=0||this.app.world.liquidAt(p,b))return null;
  if(this.fires.length>=6)this.fires.shift().engine.dispose();
  const engine=createFireworks({random:WWCore.rng(seed),height:2.4*scale,width:.75*scale,sparkHeight:3*scale,temperature:.58+(seed%17)*.006,glow:.25,smoke:.32,wind:.2,flameCount:450,emberCount:35,smokeCount:110});
  const f={engine,frame:this.basis(b,p),life,born:this.magic.time,body:b.id,cause};this.fires.push(f);this.stage.scene.add(engine.root);return f;
 }
 ignition(b,p,cause){const C=LongwayCore,wet=this.stage.weather?.engine?.model.wetness||0,n=C.unit(C.sub(p,b.center)),height=C.length(C.sub(p,b.center))-b.radius-this.app.world.height(b,n);if(height>.012||wet>.7||b.type!==1)return false;return !!this.addFire(b,p,9*(1-wet),.6,C.hash(this.processed++),cause);}
 impact(p,kind='impact',normal=null,radius=3){if(!this.anchor)return;this.magic.totalImpacts++;const m=this.magic,at=this.local(p),explosive=kind==='explosion',count=explosive?65:kind==='dust'?6:9,scale=explosive?LongwayCore.clamp(radius/3,1,12):1;
  const C=LongwayCore,f=this.anchor,n=normal?new T.Vector3(C.dot(normal,f.right),C.dot(normal,f.up),-C.dot(normal,f.forward)):new T.Vector3(0,1,0),rand=WWCore.rng(C.hash(this.processed));
  for(let i=0;i<count;i++){const v=new T.Vector3(rand()-.5,rand()-.25,rand()-.5).addScaledVector(n,.45).normalize().multiplyScalar((explosive?4+rand()*10:1+rand()*3)*scale);const color=new T.Color().setRGB(.72+rand()*.25,.08+rand()*.18,.008);m.particles.emit(m.time,at,v,color,explosive?.4+rand()*.7:.08+rand()*.14,(explosive?.12+rand()*.3:.018+rand()*.022)*Math.sqrt(scale),explosive?4:1,4,.9);}
  for(let i=0;i<(explosive?10:3);i++)m.smoke.emit(m.time,at,new T.Vector3((rand()-.5)*.7,.3+rand(),(rand()-.5)*.7).multiplyScalar(scale),new T.Color(.11,.09,.065),explosive?2:.45,(explosive?.8:.12)*scale,2,-.1,1);
 }
 pulse(p,preset='arcane',energy=1){this.impact(p,preset==='fire'&&energy>1?'explosion':'impact');}
 update(F,time,b,origin,surface){const C=LongwayCore,p=C.PlanetEngines.profile(b),dt=this.lastTime===null?0:C.clamp(time-this.lastTime,0,.1);this.lastTime=time;
  if(!this.anchor||this.body!==b.id||C.length(C.sub(origin,this.anchor.center))>3){this.magic.clear();this.fires.forEach(f=>f.engine.dispose());this.fires=[];this.anchor=this.basis(b,origin);this.body=b.id;}
  frame(this.effectRoot,this.anchor.center,this.anchor.right,this.anchor.up,this.anchor.forward,origin);this.effectRoot.updateMatrixWorld(true);this.localCamera.position.copy(this.local(origin));this.localCamera.quaternion.copy(this.effectRoot.quaternion).invert().multiply(this.stage.camera.quaternion);this.localCamera.updateMatrixWorld(true);
  this.vegetation.update(F,time,b,origin,surface);this.grass=this.vegetation.grass;this.grassBody=b.id;
  for(const e of this.app.combat.effects){const id=e.id||`${e.color}:${e.a}:${e.b}`;if(this.seen.has(id))continue;this.seen.add(id);if(this.seen.size>512)this.seen.delete(this.seen.values().next().value);if(C.length(C.sub(e.b,origin))>3.5)continue;
   const kind=e.kind||(e.color===1?'laser':'impact');this.eventCounts[kind]=(this.eventCounts[kind]||0)+1;
   if(kind==='laser'){this.magic.lightning(this.local(e.a),this.local(e.b),new T.Color(1,.025,.008),.12,true);if(e.hit)this.impact(e.b,'impact',e.normal);}
   else{this.impact(e.b,kind,e.normal,e.radius);if(kind==='explosion')this.ignition(b,e.b,'explosive');}this.processed++;
  }
  for(const pulse of this.app.fieldStory?.pulses.splice(0)||[])this.pulse(pulse.position,pulse.preset,.4);
  this.magic.update(dt);const weather=this.stage.weather?.engine?.model.current;
  this.fires=this.fires.filter(f=>{if(this.magic.time-f.born>f.life){f.engine.dispose();return false;}frame(f.engine.root,f.frame.center,f.frame.right,f.frame.up,f.frame.forward,origin);f.engine.update(time,{wind:(weather?.wind||0)*.035,windDirection:weather?.windDirection||0,gust:weather?.gust||.1});return true;});
  this.stage.terrain?.traverse(o=>{if(o.userData.oceanworks&&o.material?.uniforms)o.material.uniforms.uTime.value=time;});
  this.stats={profile:p.name,worldworks:surface&&!!C.PlanetEngines.documentFor(b),grassBlades:this.vegetation.stats.grassBlades,vegetation:this.vegetation.stats,oceanworks:!!this.stage.terrain?.userData.oceanworks&&surface,fireEmitters:this.fires.length,fireCauses:this.fires.map(f=>f.cause),spellworks:this.magic.getStats(),combatEvents:this.processed,eventCounts:{...this.eventCounts}};
 }
}
