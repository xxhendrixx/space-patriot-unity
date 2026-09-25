import {T,frame} from './primitives.js';
import {createGrassworks} from '../engines/grassworks.js';
import {ForestStage} from './forest-stage.js';
import {GaussianSplats} from './gaussian-splats.js';

export class VegetationStage {
 constructor(stage){this.stage=stage;this.app=stage.app;this.tiles=new Map();this.layers=[];this.stats={};this.forest=new ForestStage(this);}
 clear(){this.forest.clear();for(const g of this.tiles.values())g.dispose();this.tiles.clear();this.splatJob?.return();for(const s of this.pendingLayers||[])s.dispose();this.pendingLayers=null;this.splatJob=null;for(const s of this.layers)s.dispose();this.layers=[];this.anchor=null;this.splatKey=null;this.splatCenter=null;}
 carry(point,vector){for(const f of [this.anchor,...[...this.tiles.values()].map(g=>g.root.userData.frame)]){if(!f)continue;f.center=point(f.center);for(const k of ['up','right','forward'])f[k]=vector(f[k]);}}
 basis(b,p){const C=LongwayCore,up=C.unit(C.sub(p,b.center)),right=C.unit(C.cross([0,1,0],up),[1,0,0]),forward=C.unit(C.cross(up,right));return {center:p.slice(),up,right,forward};}
 point(x,z,b,f=this.anchor){const C=LongwayCore,W=this.app.world,n=C.unit(C.sub(C.add(f.center,C.add(C.mul(f.right,x/1000),C.mul(f.forward,-z/1000))),b.center));const h=W.groundHeight(b,n),world=C.add(b.center,C.mul(n,b.radius+h)),delta=C.sub(world,f.center),city=W.toLocal(world,W.site(b));return {position:[C.dot(delta,f.right)*1000,C.dot(delta,f.up)*1000,-C.dot(delta,f.forward)*1000],world,h,valid:!(b.liquid&&h<b.sea+.002)&&!(Math.abs(city[0])<.25&&Math.abs(city[2])<.25)&&!(this.app.outposts?.contains(world,b,.004))};}
 tile(b,x,z,profile){const C=LongwayCore,seed=C.hash(b.seed^Math.imul(x,73856093)^Math.imul(z,19349663)),center=this.point(x*48,z*48,b).world,f=this.basis(b,center),N=48,extent=36,grid=new Float32Array((N+1)**2),valid=new Uint8Array(grid.length);
  for(let j=0;j<=N;j++)for(let i=0;i<=N;i++){const p=this.point((i/N-.5)*extent*2,(j/N-.5)*extent*2,b,f),k=j*(N+1)+i;grid[k]=p.position[1];valid[k]=p.valid?1:0;}
  const height=(x,z)=>{const u=(x/extent/2+.5)*N,v=(z/extent/2+.5)*N,i=Math.min(N-1,Math.max(0,Math.floor(u))),j=Math.min(N-1,Math.max(0,Math.floor(v))),a=j*(N+1)+i,ids=[a,a+1,a+N+1,a+N+2];if(ids.some(k=>!valid[k]))return null;const hs=ids.map(k=>grid[k]);if(Math.max(...hs)-Math.min(...hs)>2.4)return null;const sx=u-i,sz=v-j;return(hs[0]*(1-sx)+hs[1]*sx)*(1-sz)+(hs[2]*(1-sx)+hs[3]*sx)*sz;};
  const regional=C.PlanetEngines.region(b,C.unit(C.sub(center,b.center)),this.app.world.groundHeight(b,C.unit(C.sub(center,b.center))));
  const g=createGrassworks({random:WWCore.rng(seed),density:Math.round(regional.grassDensity*(window.LongwayGraphics?.population.density||1)),field:34,height:regional.grassHeight,wind:profile.wind*regional.windShelter,gust:profile.wind*.45,width:regional.grassWidth,wild:.85},height);
  // Tile content is fixed. Fade by camera range instead of shrinking the entire
  // 34m laboratory disk, so adjacent tiles overlap without a moving hard ring.
  g.material.vertexShader=g.material.vertexShader.replace('p *= 1.0-smoothstep(26.0,34.0,length(offset.xz)); ','');
  g.material.alphaToCoverage=true;
  g.material.fragmentShader=g.material.fragmentShader.replace(/}\s*$/,`gl_FragColor.a*=1.-smoothstep(48.,70.,distanceToCamera);if(gl_FragColor.a<.003)discard;\n}`);
  g.region=regional;
  const palette=regional.climate?.grassColor||[.18,.42,.075],vec=v=>'vec3('+v.map(n=>n.toFixed(5)).join(',')+')';
  for(const [key,mult]of [['darkGreen',.27],['grassGreen',1],['tipGreen',1.7]])g.material.fragmentShader=g.material.fragmentShader.replace(new RegExp('vec3 '+key+'\\s*=\\s*vec3\\([\\s\\S]*?\\);'),'vec3 '+key+'='+vec(palette.map(n=>Math.min(.8,n*mult)))+';');
  // Keep Grassworks' actual curved blades and add the tissue atlas to their UVs.
  if(b.systemIndex>0){g.material.uniforms.uBladeAlbedo={value:this.stage.materials.art.alienFlora[regional.moisture>.48?1:15].map};g.material.fragmentShader='uniform sampler2D uBladeAlbedo;\n'+g.material.fragmentShader;g.material.fragmentShader=g.material.fragmentShader.replace('float distanceToCamera =','color *= mix(vec3(.8),texture2D(uBladeAlbedo,vec2(vUv.x,vUv.y*.7+vRandom*.3)).rgb*2.0,.38);\nfloat distanceToCamera =');}
  g.material.uniforms.uStarColor={value:new T.Vector3(...(profile.climate?.starColor||[1,1,1]))};g.material.uniforms.uDaylight={value:1};g.material.fragmentShader='uniform vec3 uStarColor;uniform float uDaylight;\n'+g.material.fragmentShader;g.material.fragmentShader=g.material.fragmentShader.replace('float distanceToCamera =','color *= mix(vec3(.7,.76,.88),uStarColor,.7)*uDaylight;\nfloat distanceToCamera =');
  Object.assign(g.material.uniforms,{uTorchPos:{value:new T.Vector3()},uTorchDir:{value:new T.Vector3()},uTorch:{value:0},uMuzzlePos:{value:new T.Vector3()},uMuzzle:{value:0}});
  g.material.fragmentShader='uniform vec3 uTorchPos,uTorchDir,uMuzzlePos;uniform float uTorch,uMuzzle;\n'+g.material.fragmentShader;
  g.material.fragmentShader=g.material.fragmentShader.replace('color *= mix(vec3(.7,.76,.88),uStarColor,.7)*uDaylight;','vec3 toBlade=vWorldPosition-uTorchPos;float cone=smoothstep(.90,.97,dot(normalize(toBlade),uTorchDir));float torch=uTorch*cone*min(2.,70./max(1.,dot(toBlade,toBlade)));vec3 flashDelta=vWorldPosition-uMuzzlePos;float flashLight=uMuzzle*min(2.,20./max(1.,dot(flashDelta,flashDelta)));color *= mix(vec3(.7,.76,.88),uStarColor,.7)*(uDaylight+torch)+flashLight*vec3(1.,.42,.08);');
  const scales=g.mesh.geometry.attributes.scale,offsets=g.mesh.geometry.attributes.offset;for(let i=0;i<scales.count;i++){const px=offsets.getX(i)+x*48,pz=offsets.getZ(i)+z*48,clump=.5+.5*Math.sin(px*.4+Math.sin(pz*.3)*2)*Math.cos(pz*.35);scales.setX(i,scales.getX(i)*(.35+clump*1.35));}scales.needsUpdate=true;
  g.material.uniforms.uWindDirection={value:new T.Vector2(1,.38)};g.material.vertexShader='uniform vec2 uWindDirection;\n'+g.material.vertexShader;g.material.vertexShader=g.material.vertexShader.replace('p.x += strength*0.58;','p.x += strength*.62*uWindDirection.x;').replace('p.z += strength*0.22;','p.z += strength*.62*uWindDirection.y;');
  g.root.userData.frame=f;g.root.name='Stable Grassworks tile '+x+','+z;g.valid=0;for(const v of g.mesh.geometry.attributes.scale.array)if(v>0)g.valid++;this.stage.scene.add(g.root);return g;
 }
 *buildSplats(b,x,z,profile){const layers=this.pendingLayers=[],C=LongwayCore,self=this;
  function* make(step,radius,range,kind){const points=[],cx=Math.floor(x/step),cz=Math.floor(z/step),cells=Math.ceil(radius/step);
   let work=0;for(let i=cx-cells;i<=cx+cells;i++){for(let j=cz-cells;j<=cz+cells;j++){
    if(++work%12===0)yield;
    const random=WWCore.rng(C.hash(b.seed^Math.imul(i,73856093)^Math.imul(j,19349663)^kind*173));
    const px=(i+random()*.7-.35)*step,pz=(j+random()*.7-.35)*step;if(Math.hypot(px-x,pz-z)>radius)continue;
    const p=self.point(px,pz,b);if(!p.valid)continue;const region=kind?C.PlanetEngines.region(b,C.unit(C.sub(p.world,b.center)),p.h):null;const green=.065+random()*.065,position=p.position;
    if(kind===0){points.push({position:[position[0],position[1]+.18,position[2]],scale:[3.2,.22,3.2],color:[green*.56,green,green*.25],opacity:.75});
      for(let k=0;k<2;k++)points.push({position:[position[0]+(random()-.5)*2,position[1]+.35,position[2]+(random()-.5)*2],scale:[.3+random()*.35,.24+random()*.2,.3+random()*.35],color:[green*.7,green*1.35,green*.3],opacity:.8});
    }else{points.push({position:[position[0],position[1]+.18,position[2]],scale:[step*.57,.35,step*.57],color:[green*.65,green,green*.35],opacity:.42});
      if(random()<Math.max(.12,region.forestCover))for(let k=0;k<4;k++){const height=(4+k*2.0)*(1.2-region.exposure*.35);points.push({position:[position[0],position[1]+height,position[2]],scale:[4.3-k*.72,1.7,4.3-k*.72],color:[.017+random()*.012,.037+random()*.022,.014+random()*.01],opacity:.8});}
    }
   }yield;}
   const pigment=profile.climate;if(pigment?.pigment.startsWith('violet'))for(const p of points){const color=kind&&p.scale[1]>1?pigment.foliageColor:pigment.grassColor;const luminance=Math.max(...p.color);p.color=color.map(n=>n*luminance*2);}
   const layer=new GaussianSplats(kind?'Distant meadow and woodland Gaussians':'Midrange grass-clump Gaussians',points,range);layers.push(layer);
  };
  if(profile.grass){yield*make(7,440,[22,55,300,420],0);yield*make(24,2050,[170,240,1450,1850],1);}
  // Atmospheric scattering and actual local weather own haze. Generic opaque
  // ground smudges on every world obscured terrain and duplicated both systems.
  for(const old of this.layers)old.dispose();this.layers=layers;for(const layer of layers)this.stage.scene.add(layer.mesh);this.pendingLayers=null;
  this.splatCenter=[x,z];this.splatBuilds=(this.splatBuilds||0)+1;
  this.splatKey=Math.floor(x/128)+','+Math.floor(z/128);
 }
 splats(b,x,z,profile){const job=this.buildSplats(b,x,z,profile);while(!job.next().done){};}
 update(F,time,b,origin,surface){const C=LongwayCore,W=this.app.world,profile=C.PlanetEngines.profile(b),up=C.unit(C.sub(origin,b.center)),alt=C.length(C.sub(origin,b.center))-b.radius-W.height(b,up);
  const active=surface&&!F.bridgeWalk&&alt<1.8;
  const revision=window.LongwayGraphics?.revision||0;
  if(this.body!==b.id||!this.anchor||this.populationRevision!==revision||C.length(C.sub(origin,this.anchor.center))>5){this.clear();this.body=b.id;this.populationRevision=revision;this.anchor=this.basis(b,C.add(b.center,C.mul(up,b.radius+W.height(b,up))));}
  const delta=C.sub(origin,this.anchor.center),x=C.dot(delta,this.anchor.right)*1000,z=-C.dot(delta,this.anchor.forward)*1000,gx=Math.round(x/48),gz=Math.round(z/48),grassy=active&&profile.grass&&alt<.10;
  const keep=new Set(),missing=[];if(grassy){for(let i=gx-1;i<=gx+1;i++)for(let j=gz-1;j<=gz+1;j++){const key=i+','+j;keep.add(key);if(!this.tiles.has(key))missing.push({key,i,j,d:(i-gx)**2+(j-gz)**2});}}
  missing.sort((a,b)=>a.d-b.d);
  // One nearest tile per frame prevents nine terrain grids/blade buffers stalling arrival.
  if(missing.length){const {key,i,j}=missing[0];this.tiles.set(key,this.tile(b,i,j,profile));}
  for(const [key,g]of this.tiles){if(grassy&&!keep.has(key)){g.dispose();this.tiles.delete(key);continue;}g.root.visible=grassy;const f=g.root.userData.frame;frame(g.root,f.center,f.right,f.up,f.forward,origin);g.material.uniforms.uFogColor.value.copy(this.stage.surfaceFog.color);const B=this.app.combat,pose=F.renderPose(),sun=this.app.celestial?.sun(origin)||C.SUN;g.material.uniforms.uDaylight.value=B.visionActive?1:.055+.945*C.smooth(C.clamp((C.dot(up,sun)+.06)/.22,0,1));g.material.uniforms.uTorch.value=B.flashlight?1:0;g.material.uniforms.uTorchDir.value.set(...pose.forward);g.material.uniforms.uTorchPos.value.set(...C.sub(pose.position,origin).map(v=>v*1000));g.material.uniforms.uMuzzle.value=B.lastShot?Math.max(0,1-(B.time-B.lastShot.time)/.075):0;g.material.uniforms.uMuzzlePos.value.set(...C.sub(B.lastShot?.position||origin,origin).map(v=>v*1000));g.update(time);}
  if(active&&profile.grass&&!this.splatJob&&(!this.splatCenter||Math.hypot(x-this.splatCenter[0],z-this.splatCenter[1])>240))this.splatJob=this.buildSplats(b,x,z,profile);
  if(active&&this.splatJob){const deadline=performance.now()+3;do{if(this.splatJob.next().done){this.splatJob=null;break;}}while(performance.now()<deadline);}
  const fade=1-C.smooth(C.clamp((alt-.5)/1.3,0,1));
  for(const layer of this.layers){const f=this.anchor;layer.mesh.visible=active;frame(layer.mesh,f.center,f.right,f.up,f.forward,origin);layer.material.uniforms.uFade.value=fade;layer.material.uniforms.uDaylight.value=this.app.combat.visionActive?1:.06+.94*C.smooth(C.clamp((C.dot(up,this.app.celestial?.sun(origin)||C.SUN)+.06)/.22,0,1));layer.material.uniforms.uWind.value=(this.stage.weather?.body===b.id?this.stage.weather.engine?.model.current.wind*.05:profile.wind)||0;layer.material.uniforms.uFog.value=this.stage.scene.fog?.density||0;layer.material.uniforms.uFogColor.value.copy(this.stage.surfaceFog.color);layer.update(this.stage.camera,time);}
  this.forest.update(b,x,z,time,active&&profile.grass&&alt<.5,origin);
  this.grass=this.tiles.get(gx+','+gz)||this.tiles.values().next().value;
  this.stats={regions:[...this.tiles.values()].map(g=>({zone:g.region.zone,height:g.settings.height,density:g.settings.density,width:g.settings.width})),splatBuilds:this.splatBuilds||0,forestBuilds:this.forest.builds||0,plantForm:this.forest.plantForm,forestTrees:this.forest.root.visible?this.forest.count:0,forestWind:this.forest.uniforms.forestWind.value.length(),grassBlades:grassy?[...this.tiles.values()].reduce((n,g)=>n+g.valid,0):0,grassTiles:grassy?this.tiles.size:0,nearRangeMetres:70,splatCount:active?this.layers.reduce((n,s)=>n+s.points.length,0):0,splatRangeMetres:1850,sort:'back-to-front',layers:this.layers.map(s=>({name:s.mesh.name,count:s.points.length}))};
 }
}
