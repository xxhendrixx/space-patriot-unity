/* Measured periods, Kepler motion, compressed distances. Epoch phase is a game
   layout, not a claim to reproduce a historical ephemeris. All units km / s. */
(function(root){
 const C=root.LongwayCore,TAU=Math.PI*2,DEG=Math.PI/180;
 // NASA Planetary Fact Sheet: sidereal hours, obliquity, inclination, eccentricity.
 const SOL={Mercury:[1407.6,.034,7,.206],Venus:[-5832.5,177.4,3.4,.007],Earth:[23.9345,23.44,0,.0167],Mars:[24.6229,25.19,1.85,.0934],Jupiter:[9.925,3.13,1.3,.0489],Saturn:[10.656,26.73,2.49,.0565],Uranus:[-17.24,97.77,.77,.0463],Neptune:[16.11,28.32,1.77,.0095]};
 const spin=(b,n,angle=b.spin||0)=>C.rotate(n,b.spinAxis||[0,1,0],angle);
 C.bodyLocal=(b,n)=>spin(b,n,-(b.spin||0));C.bodyWorld=(b,n)=>spin(b,n);
 const sample=C.Geology.sample;C.Geology.sample=(w,b,n)=>sample(w,b,C.bodyLocal(b,n));
 const normal=C.Landscape.normal;C.Landscape.normal=(b,x,z)=>C.bodyWorld(b,normal(b,x,z));
 function eccentric(M,e){let E=M;for(let k=0;k<9;k++)E-=(E-e*Math.sin(E)-M)/(1-e*Math.cos(E));return E;}
 class CelestialSystem{
  constructor(app){this.app=app;this.world=app.world;this.elapsed=0;this.timeScale=60;this.revision=0;
   for(const b of this.world.catalog){const d=SOL[b.name],r=b.catalog,star=C.mul(b.cell,C.SECTOR||800000),initial=C.sub(b.center,star),theta=Math.atan2(initial[2],initial[0]);
    // A negative sidereal period carries retrograde motion; reflect the >90°
    // obliquity here so it is not applied a second time through the axis sign.
    const tilt=d?(d[0]<0?180-d[1]:d[1]):0;b.spinAxis=C.unit([Math.sin(tilt*DEG),Math.cos(tilt*DEG),0]);b.spin=0;
    const period=r.orbitalPeriodDays*86400||365.25*86400,e=C.clamp(r.eccentricity??d?.[3]??0,0,.85),E=Math.atan2(Math.sqrt(1-e*e)*Math.sin(theta),e+Math.cos(theta));
    b.orbit={star,period,e,a:C.length(initial)*(1+e*Math.cos(theta))/(1-e*e),inclination:(d?.[2]||0)*DEG,M0:E-e*Math.sin(E),rotation:d?d[0]*3600:period,rotationBasis:d?'measured':'assumed synchronous',initial:initial.slice()};
    b.orbit.offset=[0,0,0];
    this.world.site(b);this.world.station(b);
   }
   this.advance(0);
   const survey=this.world.surveySite.bind(this.world);this.world.surveySite=b=>{if(this.world.surveySites.has(b.id))return this.world.surveySites.get(b.id);const angle=b.spin;const saved=[];for(const f of [this.world.sites.get(b.id),this.world.stations.get(b.id)]){if(!f)continue;saved.push([f,{center:f.center,up:f.up,right:f.right,forward:f.forward}]);f.center=C.add(b.center,spin(b,C.sub(f.center,b.center),-angle));for(const k of ['up','right','forward'])f[k]=spin(b,f[k],-angle);}b.spin=0;let result;try{result=survey(b);}finally{b.spin=angle;for(const [f,old]of saved)Object.assign(f,old);}if(!saved.some(([f])=>f===result)){result.center=C.add(b.center,spin(b,C.sub(result.center,b.center),angle));for(const k of ['up','right','forward'])result[k]=spin(b,result[k],angle);}return result;};
   const update=app.flight.update.bind(app.flight);app.flight.update=(dt,input={})=>{this.update(Math.min(dt,.1));update(dt,input);};
  }
  offset(b,t){const o=b.orbit,E=eccentric((o.M0+TAU*t/o.period)%TAU,o.e),x=o.a*(Math.cos(E)-o.e),z=o.a*Math.sqrt(1-o.e*o.e)*Math.sin(E);return[x,-z*Math.sin(o.inclination),z*Math.cos(o.inclination)];}
  setScale(value){if(![1,60,3600].includes(+value)||this.app.network?.role==='guest')return false;this.timeScale=+value;return true;}
  snapshot(){return{elapsed:this.elapsed,timeScale:this.timeScale};}
  sync(s){if(!s||!Number.isFinite(s.elapsed)||s.elapsed<0||s.elapsed>1e12||![1,60,3600].includes(s.timeScale))return;this.timeScale=s.timeScale;this.advance(s.elapsed);}
  update(dt){if(dt<=0)return;this.advance(this.elapsed+dt*this.timeScale);}
  advance(next){const A=this.app,F=A.flight,W=this.world,near=F.nearest(),deltas=new Map(),seen=new WeakSet();
   this.followRoute(F.route);
   for(const b of W.catalog){const old=b.center.slice(),oldSpin=b.spin;const o=b.orbit; b.center=C.add(o.star,C.add(this.offset(b,next),o.offset));b.spin=(TAU*next/o.rotation)%TAU;
    const angle=b.spin-oldSpin,vector=v=>spin(b,v,angle),point=(p,rotate=true)=>C.add(b.center,rotate?vector(C.sub(p,old)):C.sub(p,old));deltas.set(b.id,{point,vector,old});
    const frame=f=>{if(!f||seen.has(f))return;seen.add(f);f.center=point(f.center);for(const k of ['up','right','forward'])if(f[k])f[k]=vector(f[k]);};
    for(const map of [W.sites,W.stations,W.surveySites])frame(map.get(b.id));
    for(const [key,tile] of W.surfaceCache||[])if(key.startsWith(b.id+":"))for(const o of tile.objects)o.position=point(o.position);
    if(W._plantsKey?.startsWith(b.id+":"))for(const o of W._plants||[])o.position=point(o.position);
    const stage=A.visuals;if(stage){if(stage.terrainBody===b.id){frame(stage.terrain?.userData.worldFrame);if(stage.terrain?.userData.origin)stage.terrain.userData.origin=point(stage.terrain.userData.origin);}if(stage.plantBody===b.id){frame(stage.plants?.userData.worldFrame);if(stage.plantOrigin)stage.plantOrigin=point(stage.plantOrigin);}const e=stage.engines;if(e?.body===b.id){frame(e.anchor);if(e.ventOrigin)e.ventOrigin=point(e.ventOrigin);}if(e?.vegetation?.body===b.id)e.vegetation.carry(point,vector);else if(e?.grassBody===b.id){frame(e.grass?.root.userData.frame);if(e.grassOrigin)e.grassOrigin=point(e.grassOrigin);}for(const fire of e?.fires||[])if(fire.body===b.id)frame(fire.frame);if(stage.weather?.body===b.id)frame(stage.weather.anchor);}
    if(stage?.terrainJob?.body===b.id){frame(stage.terrainJob.frame);if(stage.terrainJob.origin)stage.terrainJob.origin=point(stage.terrainJob.origin);}
    if(stage?.plantsJob?.body===b.id){frame(stage.plantsJob.result.userData.worldFrame);stage.plantsJob.origin=point(stage.plantsJob.origin);}
    stage?.explosions?.carry(b.id,point,vector);
    for(const state of A.society?.states?.values()||[])if(state.body.id===b.id)for(const actor of state.actors){seen.add(actor);for(const k of ['position','anchor'])if(actor[k])actor[k]=point(actor[k]);for(const k of ['up','forward','velocity'])if(actor[k])actor[k]=vector(actor[k]);if(actor.death)for(const k of ['up','direction'])actor.death[k]=vector(actor.death[k]);}
   }
   const delta=deltas.get(near.body.id),attached=near.altitude<near.body.radius*5;
   if(delta&&attached&&!F.route&&!A.shipboard?.aboard){const rotate=near.altitude<10||['landed','docked','onfoot'].includes(F.vehicle.state);F.position=delta.point(F.position,rotate);F.vehicle.position=delta.point(F.vehicle.position,rotate);if(rotate){for(const obj of [F,F.vehicle])for(const k of ['forward','up','velocity'])if(obj[k])obj[k]=delta.vector(obj[k]);F.orthogonalize();}const tr=F.vehicle.transition;if(tr)for(const k of ['from','to','fromEye','toEye','via'])if(Array.isArray(tr[k]))tr[k]=delta.point(tr[k],rotate);if(tr&&rotate)for(const k of ['fromForward','toForward','fromUp','toUp'])if(Array.isArray(tr[k]))tr[k]=delta.vector(tr[k]);}
   const owned=A.shipboard?.own;if(owned){const b=W.catalog.find(b=>C.length(C.sub(owned.position,deltas.get(b.id).old))<b.radius*6);if(b){const d=deltas.get(b.id),rot=C.length(C.sub(owned.position,d.old))-b.radius<10;for(const obj of [owned,owned.vehicle]){obj.position=d.point(obj.position,rot);if(rot)for(const k of ['forward','up','velocity'])if(obj[k])obj[k]=d.vector(obj[k]);}}}
   for(const e of A.combat.enemies){if(seen.has(e))continue;const b=W.catalog.find(b=>C.length(C.sub(e.position,deltas.get(b.id).old))<b.radius*6);if(!b)continue;const d=deltas.get(b.id),rot=e.kind==='sentry'||e.humanoid;for(const k of ['position','anchor'])if(e[k])e[k]=d.point(e[k],rot);if(rot){for(const k of ['up','forward','velocity'])if(e[k])e[k]=d.vector(e[k]);if(e.death)for(const k of ['up','direction'])e.death[k]=d.vector(e.death[k]);}}
   if(delta&&attached){const rot=near.altitude<10;for(const p of A.combat.projectiles){for(const k of ['position','previous'])if(p[k])p[k]=delta.point(p[k],rot);if(rot)for(const k of ['velocity','direction'])if(p[k])p[k]=delta.vector(p[k]);}for(const e of A.combat.effects)for(const k of ['a','b'])if(e[k])e[k]=delta.point(e[k],rot);}
   this.elapsed=next;this.revision++;
  }
  followRoute(route){if(!route||route.celestial)return;route.celestial=true;const poses=this.world.catalog.map(b=>({b,center:b.center.slice(),spin:b.spin}));for(const seg of route.segments){const at=seg.at;seg.at=t=>{const p=at(t),n=poses.reduce((best,v)=>C.length(C.sub(p,v.center))/v.b.radius<C.length(C.sub(p,best.center))/best.b.radius?v:best);const d=C.sub(p,n.center),weight=1-C.smooth(C.clamp((C.length(d)/n.b.radius-1.4)/.3,0,1));return C.add(n.b.center,weight>0?spin(n.b,d,(n.b.spin-n.spin)*weight):d);};}}
  sun(position){const b=this.world.nearest(position).body;return C.unit(C.sub(b.orbit.star,position),C.SUN);}
 }
 C.CelestialSystem=CelestialSystem;C.solveEccentricAnomaly=eccentric;
})(globalThis);
