import {T,box,plate,label,frame,dispose,bake} from './primitives.js';
import {MachineModel} from '../engines/machineworks/model.mjs';
import {ThreeMachineView} from '../engines/machineworks/three-view.mjs';

export class CityStage{
 constructor(stage){this.stage=stage;this.views=new Map();this.root=new T.Group();this.root.name='ArchitectureWorks space city';stage.scene.add(this.root);}
 display(width=640,height=400){
  const canvas=document.createElement('canvas');canvas.width=width;canvas.height=height;
  const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.repeat.x=-1;texture.offset.x=1;
  const material=new T.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:0xffffff,emissiveIntensity:1.25,roughness:.4,metalness:.1,toneMapped:false});
  return {canvas,texture,material};
 }
 updateDisplays(v,city,b,time){
  if(time-v.displayTime<.2)return;v.displayTime=time;
  const sim=LongwayCore.CityWorld.machinery(city,b),lift=city.elevators.get(b.id),terminal=sim.get('terminal');
  v.telemetry={power:terminal.state.power,lift:{floor:lift.floor+1,target:lift.target+1,phase:lift.phase},machines:[...sim.nodes.values()].map(n=>({id:n.id,power:Math.round(n.state.power*100),health:Math.round(n.state.health),enabled:n.params.command}))};
  for(const [screen,mode]of [[v.computer,'computer'],[v.liftDisplay,'lift']]){
   const q=screen.canvas.getContext('2d'),w=screen.canvas.width,h=screen.canvas.height;
   q.fillStyle='#031315';q.fillRect(0,0,w,h);q.strokeStyle='#3f8b82';q.strokeRect(10,10,w-20,h-20);
   const text=(s,y,size=23,color='#a5d9c7')=>{q.fillStyle=color;q.font=size+'px monospace';q.fillText(s,26,y,w-48);};
   if(mode==='computer'){
    text('CITY OPERATIONS / LIVE BUS',48,26);text(city.body.name.toUpperCase()+' / '+b.doc.name.toUpperCase(),82,17,'#638f88');
    text('MACHINE       POWER  HEALTH  STATE',120,20,'#759e97');
    v.telemetry.machines.forEach((n,i)=>text(n.id.toUpperCase().padEnd(14)+String(n.power).padStart(3)+'%   '+String(n.health).padStart(3)+'%   '+(n.enabled?'ON':'OFF'),153+i*26,20,n.power>0?'#b2ddd0':'#c99b72'));
    text('Z  ACCESS SWITCHES / REPAIRS',h-26,20,'#e5bd7c');
   }else{
    text('LIFT / LIVE',48,28);text(String(lift.floor+1).padStart(2,'0'),158,82,'#d6eee5');
    text(lift.phase.toUpperCase(),207,26);text('TO FLOOR '+(lift.target+1),252,24);text('POWER '+Math.round(sim.get('lift').state.power*100)+'%',296,21);text('Z  DESTINATION',h-28,23,'#e5bd7c');
   }
   screen.texture.needsUpdate=true;
  }
 }
 materials(b,level){const art=this.stage.materials.art,city=art.city,mech=art.machinery,hab=art.habitat,theme=(b.index+level)%4;
  const palette={facade:city[(b.index%2)?1:0],plaster:hab[[0,4,6,7][theme]],trim:mech[1],roof:mech[0],oak:hab[15],walnut:hab[5],tile:hab[8],concrete:hab[14],timber:hab[2],darkwood:mech[1],linen:hab[4],sage:hab[7],cushion:hab[[1,9,13,1][theme]],rug:hab[1],white:hab[0],ceramic:hab[10],black:hab[12],steel:hab[2],brass:hab[11],glass:city[13],mirror:city[4],soil:art.frontier[4],leaf:art.frontier[5],leaflight:art.frontier[5]};
  const out={};for(const [key,tex]of Object.entries(palette))out[key]=new T.MeshStandardMaterial({...tex,color:0xffffff,roughness:['steel','brass','glass','mirror'].includes(key)?.4:.78,metalness:['steel','brass'].includes(key)?.65:.12,normalScale:new T.Vector2(.22,.22),aoMapIntensity:.4});
  out.glass=new T.MeshPhysicalMaterial({color:0x8ab2b7,roughness:.16,metalness:.1,transparent:true,opacity:.25,depthWrite:false});
  out.light=new T.MeshStandardMaterial({color:0xbdc9ba,emissive:0xb6d0c2,emissiveIntensity:2});
  out.screen=new T.MeshStandardMaterial({...mech[14],color:0x8ab6ac,emissiveMap:mech[14].map,emissive:0x7ebdae,emissiveIntensity:.9,roughness:.5});return out;
 }
 detail(city,b){
  const root=new T.Group();root.position.set(b.x,0,b.z);root.name=b.doc.name;const geometry=ArchitectureGeometry.compile(b.doc,{view:'walk'}),mats=[];
  for(let k=0;k<b.levels;k++)mats.push(this.materials(b,k));
  for(const data of geometry.meshes){const g=new T.BufferGeometry();g.setAttribute('position',new T.BufferAttribute(data.positions,3));g.setAttribute('normal',new T.BufferAttribute(data.normals,3));g.setAttribute('uv',new T.BufferAttribute(data.uvs,2));g.setAttribute('uv1',g.attributes.uv);g.computeBoundingSphere();const mat=mats[Math.max(0,data.level)][data.material]||this.stage.materials.dark;const mesh=new T.Mesh(g,mat);mesh.castShadow=mesh.receiveShadow=true;root.add(mesh);}
  const m=mats[0],W=LongwayCore.CityWorld,computer=this.display(),liftDisplay=this.display(360,400);
  for(let k=0;k<b.levels;k++){
   const y=W.BASE+k*W.H;
   box(root,m.light,[0,y+3.25,-2],[.5,.055,17],.01);
   for(const x of [-1,1])box(root,m.light,[x*2.65,y+.22,-2],[.08,.04,17],0);
   const name=label(root,`0${k+1} / ${b.doc.levels[k].name}`,[0,y+2.95,7.85],[3.5,.42]);name.rotation.y=Math.PI;name.scale.x=-1;
   box(root,m.screen,[2,y+1.4,7.88],[.45,.65,.08],.03);
   plate(root,liftDisplay.material,[2,y+1.4,7.832],[.4,.59],[0,Math.PI,0]);
  }
  const title=label(root,b.doc.name.toUpperCase(),[0,W.BASE+3.2,-12.2],[5,.45]);title.rotation.y=Math.PI;title.scale.x=-1;
  const cabin=new T.Group();cabin.position.set(0,W.BASE,10);root.add(cabin);
  box(cabin,m.steel,[0,-.1,0],[3.35,.2,3.8],.02);box(cabin,m.steel,[0,3.0,0],[3.35,.14,3.8],.02);
  for(const x of [-1,1]){box(cabin,m.timber,[x*1.6,1.5,0],[.1,3,3.8],.03);box(cabin,m.light,[x*1.54,2.7,0],[.025,.05,3.3],0);box(cabin,m.steel,[x*1.5,1,0],[.05,.05,3.3],.02);}
  box(cabin,m.timber,[0,1.5,1.85],[3.2,3,.1],.03);box(cabin,m.screen,[1.47,1.45,-.6],[.06,.65,.4],.02);
  plate(cabin,liftDisplay.material,[1.435,1.45,-.6],[.36,.59],[0,-Math.PI/2,0]);
  const doors=[];for(let k=0;k<b.levels;k++)for(const side of [-1,1]){const panel=box(root,m.timber,[side*.7,W.BASE+k*W.H+1.4,8.015],[1.4,2.8,.13],.025);doors.push({mesh:panel,k,side});}
  const sim=W.machinery(city,b),model=new MachineModel(sim);model.showCables=false;model.sync();
  const view=new ThreeMachineView(T,root,model);view.sync(model.flatten().filter(i=>i.machineId!=='lift'));
  const operator=sim.get('terminal'),consoleFace=plate(root,computer.material,[operator.position[0],operator.position[1]+1.724*.7,operator.position[2]+.49*.7],[1.43*.7,.85*.7],[-.13,0,0]);
  consoleFace.name='Live city operations display';
  const applied=new Set();for(const mesh of view.meshes.values()){const material=mesh.material;if(applied.has(material))continue;applied.add(material);Object.assign(material,this.stage.materials.art.machinery[(b.index+applied.size)%16]);material.normalScale=new T.Vector2(.2,.2);material.needsUpdate=true;}
  const light=new T.PointLight(0xbcd9d4,20,22,2);light.position.set(0,3,0);root.add(light);
  this.root.add(root);return {root,model,view,cabin,doors,mats,light,computer,liftDisplay,displayTime:-Infinity};
 }
 fade(root,value,invert=false){
  root.visible=invert?value<.999:value>.001;if(!root.visible)return;
  const u=root.userData.fadeUniform||(root.userData.fadeUniform={value}),clones=root.userData.fadeMaterials||(root.userData.fadeMaterials=new Map());u.value=value;
  root.traverse(mesh=>{if(!mesh.isMesh||!mesh.material||mesh.material.userData.cityFade===u)return;
   const original=mesh.material;let mat=clones.get(original);
   if(!mat){mat=original.clone();clones.set(original,mat);const prior=original.onBeforeCompile;mat.onBeforeCompile=shader=>{prior.call(mat,shader);shader.uniforms.cityFade=u;shader.fragmentShader='uniform float cityFade;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>',`#include <clipping_planes_fragment>\nfloat cityGrain=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);if(${invert?'cityGrain < cityFade':'cityGrain > cityFade'})discard;`);};mat.customProgramCacheKey=()=>`city-fade-${invert}`;}
   mat.color?.copy(original.color);if(mat.emissive&&original.emissive)mat.emissive.copy(original.emissive);mat.emissiveIntensity=original.emissiveIntensity;
   mat.userData.cityFade=u;mesh.material=mat;mesh.userData.fadeUniform=u;
  });
 }

 update(F,time,b,origin,surface){const W=LongwayCore.CityWorld,A=this.stage.app,site=A.world.site(b),p=W.local(A.world,b,origin),near=surface&&Math.hypot(p[0],p[2])<3000&&Math.abs(p[1])<3000;
  this.root.visible=near;if(!near)return;
  if(this.body!==b.id||this.placeId!==b.activeSettlement?.id){this.placeId=b.activeSettlement?.id;for(const v of this.views.values())this.release(v);this.views.clear();if(this.lod)dispose(this.lod);this.path?.dispose();this.body=b.id;this.city=W.forBody(b);this.lod=new T.Group();this.root.add(this.lod);this.proxies=new Map();
   for(const build of this.city.buildings){const g=new T.Group();g.position.set(build.x,0,build.z);const m=this.stage.materials;box(g,m.building,[0,W.BASE+build.height/2,0],[26,build.height,24],.14);for(let k=0;k<build.levels;k++)for(const side of [-1,1]){box(g,m.steel,[0,W.BASE+k*W.H,side*12.08],[26,.12,.1],0);for(const x of [-8,8])box(g,m.glass,[x,W.BASE+k*W.H+1.8,side*12.12],[5,1.4,.07],0);}bake(g,true);this.lod.add(g);this.proxies.set(build.id,g);}
   this.path=new PathworksCore.PathworksEngine({THREE:T,scene:this.root},this.city.paths.getState());for(const material of this.path.materials.values()){Object.assign(material,this.stage.materials.art.city[6]);material.needsUpdate=true;}
  }
  this.root.visible=near;if(!near)return;frame(this.root,site.center,site.right,site.up,site.forward,origin);
  const wanted=this.city.buildings.filter(x=>Math.hypot(x.x-p[0],x.z-p[2])<(this.views.has(x.id)?80:75)).sort((a,b)=>Math.hypot(a.x-p[0],a.z-p[2])-Math.hypot(b.x-p[0],b.z-p[2])),ids=new Set(wanted.map(x=>x.id));
  for(const [id,v]of this.views)if(!ids.has(id)){this.release(v);this.views.delete(id);}
  for(const [id,g]of this.proxies){const build=this.city.buildings.find(b=>b.id===id),dist=Math.hypot(build.x-p[0],build.z-p[2]),t=ids.has(id)?LongwayCore.smooth(LongwayCore.clamp((75-dist)/30,0,1)):0;this.fade(g,t,true);}
  for(const build of wanted){let v=this.views.get(build.id);if(!v){v=this.detail(this.city,build);this.views.set(build.id,v);}const e=this.city.elevators.get(build.id);v.cabin.position.y=e.y;for(const d of v.doors){const open=d.k===e.floor?e.door:0;d.mesh.position.x=d.side*(.7+open*1.45);}v.model.sync();v.view.sync(v.model.flatten().filter(i=>i.machineId!=='lift'));this.fade(v.root,LongwayCore.smooth(LongwayCore.clamp((75-Math.hypot(build.x-p[0],build.z-p[2]))/30,0,1)));this.updateDisplays(v,this.city,build,time);const y=W.BASE+Math.max(0,Math.floor((p[1]-W.BASE)/W.H))*W.H;v.light.position.y=y+2.5;}
  this.stats={buildings:this.city.buildings.length,floors:this.city.buildings.reduce((n,x)=>n+x.levels,0),detailed:this.views.size,paths:this.city.paths.getStats(),elevators:this.city.elevators.size};
 }
 release(v){v.view.dispose();dispose(v.root);for(const dict of v.mats)for(const m of Object.values(dict))m.dispose();for(const s of [v.computer,v.liftDisplay]){s.texture.dispose();s.material.dispose();}}
}
