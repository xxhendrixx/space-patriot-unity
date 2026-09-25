import {T,frame} from './primitives.js';
import {WeatherSystem} from '../engines/weatherworks.js';
export class WeatherStage{
 constructor(stage){this.stage=stage;this.root=new T.Group();this.root.name='Weatherworks planetary weather';stage.scene.add(this.root);this.last=0;}
 update(F,time,b,origin,surface){const C=LongwayCore,W=this.stage.app.world,home=this.stage.app.shipboard?.hangarFrame(),insideHangar=home&&C.length(C.sub(origin,home.center))<.12&&C.dot(C.sub(origin,home.center),home.up)<.036&&(this.stage.app.shipboard.hangarRaised||0)<.008,active=!insideHangar&&surface&&b.atmosphere>0&&b.biome!==6&&!F.bridgeWalk&&!this.stage.app.city.current;
  const up=C.unit(C.sub(origin,b.center)),height=C.length(C.sub(origin,b.center))-b.radius-W.height(b,up);
  this.root.visible=active&&height<.3;if(!this.root.visible)return;
  const travel=this.anchor?C.sub(origin,this.anchor.center):null;
  // Altitude is not lateral travel. The old test rebuilt 4096 terrain samples
  // every frame whenever the camera was more than 50 metres above the ground.
  const lateral=travel?C.length(C.sub(travel,C.mul(this.anchor.up,C.dot(travel,this.anchor.up)))):Infinity;
  if(this.body!==b.id||!this.anchor||lateral>.05){
   const center=C.add(b.center,C.mul(up,b.radius+W.height(b,up))),right=C.unit(C.cross([0,1,0],up)),forward=C.unit(C.cross(up,right));this.anchor={center,up,right,forward};
   const sample=(x,z)=>{const point=C.add(center,C.add(C.mul(right,x/1000),C.mul(forward,-z/1000))),n=C.unit(C.sub(point,b.center));const cached=this.stage.terrainBody===b.id?this.stage.terrain?.userData.heightAt?.(point):null,p=cached||C.add(b.center,C.mul(n,b.radius+W.groundHeight(b,n)));return C.dot(C.sub(p,center),up)*1000;};
   if(this.body!==b.id){this.engine?.dispose();const climate=C.PlanetClimate.weather(b,time,up),{snow,dust,rain}=climate;
    this.engine=new WeatherSystem({THREE:T,scene:{isScene:true,add:o=>this.root.add(o)},groundHeight:sample,groundBounds:[-110,-110,220,220],groundResolution:24,sky:false,seed:b.seed,settings:{rain,snow,dust,particleSize:1.2,coverage:climate.coverage,wind:climate.wind,windDirection:climate.windDirection,gust:climate.gust,lightning:climate.lightning,fog:snow*.08+dust*.05,hour:13,temperature:climate.temperature,transition:6,fronts:false,skyFlash:false}});this.engine.model.wetness=rain*.4;this.body=b.id;this.engine.onLightning=event=>{const f=this.anchor,pos=C.add(f.center,C.add(C.mul(f.right,event.position[0]/1000),C.add(C.mul(f.up,event.position[1]/1000),C.mul(f.forward,-event.position[2]/1000))));this.stage.engines.eventCounts.lightning++;this.stage.engines.ignition(b,pos,'lightning');};
   }else this.engine.rebuildGroundField({sample});
   this.root.traverse(o=>{o.userData.skipAO=true;});
  }
  const f=this.anchor;frame(this.root,f.center,f.right,f.up,f.forward,origin);const d=C.sub(origin,f.center),p=[C.dot(d,f.right)*1000,C.dot(d,f.up)*1000,-C.dot(d,f.forward)*1000];
  const climate=C.PlanetClimate.weather(b,time,up);for(const k of ['wind','windDirection','gust','rain','snow','dust','lightning','temperature','coverage'])this.engine.model.settings[k]=climate[k];
  this.engine.update(C.clamp(time-this.last,0,.1),p);const visibility=C.smooth(C.clamp((.3-height)/.12,0,1));this.root.traverse(o=>{const m=o.material;if(!m)return;if(m.uniforms?.uOpacity)m.uniforms.uOpacity.value=visibility;else if('opacity' in m){m.userData.weatherOpacity??=m.opacity;m.opacity=m.userData.weatherOpacity*visibility;}});this.last=time;const wet=this.engine.model.wetness,snow=this.engine.model.snowCover;
  const terrain=this.stage.terrain?.children[0];if(terrain?.material){terrain.material.roughness=.95-wet*.3;if(terrain.material.userData.terrainColor)terrain.material.color.copy(terrain.material.userData.terrainColor).lerp(new T.Color(.65,.73,.78),snow*.3);}
  for(const g of this.stage.engines.vegetation.tiles.values()){g.material.uniforms.uWind.value=this.engine.model.current.wind*.045*(g.region?.windShelter||1);const angle=this.engine.model.current.windDirection*Math.PI/180;g.material.uniforms.uWindDirection?.value.set(Math.sin(angle),Math.cos(angle));if(g.material.uniforms.uGust)g.material.uniforms.uGust.value=this.engine.model.current.gust;}
  this.stats={...this.engine.getState(),climate:C.PlanetClimate.profile(b).interpretation};
 }
}
