import {createFireworks} from '../engines/fireworks.js';
/* Fireworks combustion particles attached to the actual aft nozzle hardpoints. */
export class ThrusterStage {
 constructor(){this.pools=new Map();this.stats={emitters:0,active:0};}
 update(model,throttle,time,powered=true){
  if(!model?.userData.exhaust)return;
  let pool=this.pools.get(model);
  if(!pool){pool=model.userData.exhaust.map(p=>{const e=createFireworks({flameCount:260,emberCount:12,smokeCount:1,smoke:0,wind:0,gust:0,turbulence:.22,emberRate:.08,flicker:.28,sparkSpread:.12,oxygen:1.4,glow:1.1});e.root.name='Fireworks nozzle plume';e.root.position.set(...p.position);e.root.rotation.x=Math.PI/2;e.radius=p.radius;e.root.traverse(o=>{o.userData.skipAO=true;o.raycast=()=>{};});
    for(const mat of e.materials||[]){if(!mat?.fragmentShader)continue;mat.fragmentShader=mat.fragmentShader.replace(/}\s*$/, 'gl_FragColor.rgb = vec3(.18,.65,1.0) * dot(gl_FragColor.rgb,vec3(.3,.59,.11))*1.8;\n}');mat.needsUpdate=true;}
    model.add(e.root);return e;});this.pools.set(model,pool);}
  const thrust=Math.max(0,Math.min(1,throttle));for(const e of pool){e.root.visible=powered&&thrust>.005;if(e.root.visible)e.update(time,{height:e.radius*(2+thrust*10),width:e.radius*1.15,fuel:.3+thrust*1.4,sparkHeight:e.radius*(3+thrust*11)});}
 }
 finish(){let count=0,active=0;for(const [model,pool] of this.pools){if(!model.parent){pool.forEach(e=>e.dispose());this.pools.delete(model);continue;}count+=pool.length;active+=pool.filter(e=>e.root.visible).length;}this.stats={emitters:count,active,engine:'Fireworks'};}
}
