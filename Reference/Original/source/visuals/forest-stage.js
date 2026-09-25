import {T,frame} from './primitives.js';
import {alienPlant} from './alien-biology.js';
import {buildPlants} from './environment.js';
import {partitionInstances} from './view-culling.js';
export class ForestStage{
 constructor(vegetation){this.v=vegetation;this.stage=vegetation.stage;this.root=new T.Group();this.root.name='Wind-reactive forest';this.stage.scene.add(this.root);this.meshes=[];this.materialCache=new Map();this.uniforms={forestTime:{value:0},forestWind:{value:new T.Vector2()},forestGust:{value:.2}};}
 clear(){this.job?.return();this.job=null;for(const m of this.meshes){m.dispose();m.geometry.dispose();m.removeFromParent();}this.meshes=[];this.key=null;this.center=null;}
 *build(b,x,z){const C=LongwayCore,v=this.v,W=v.app.world,f=v.anchor;
  const points=[];let work=0;for(let i=Math.floor(x/14)-18;i<=Math.floor(x/14)+18;i++)for(let j=Math.floor(z/14)-18;j<=Math.floor(z/14)+18;j++){
   if(++work%48===0)yield;
   const rand=WWCore.rng(C.hash(b.seed^Math.imul(i,38171)^Math.imul(j,98299))),px=(i+rand()*.8)*14,pz=(j+rand()*.8)*14;if(Math.hypot(px-x,pz-z)>240)continue;
   const p=v.point(px,pz,b);if(!p.valid)continue;const region=C.PlanetEngines.region(b,C.unit(C.sub(p.world,b.center)),p.h);if(rand()>Math.min(.95,Math.max(.12,region.forestCover)*1.2*(window.LongwayGraphics?.population.density||1)))continue;
   points.push({position:p.position,scale:(.55+rand()*.85)*(1.2-region.exposure*.35),yaw:rand()*Math.PI*2,species:region.plantVariant});
  }
  for(const m of this.meshes){m.dispose();m.geometry.dispose();m.removeFromParent();}this.meshes=[];
  const forms=[];
  for(let species=0;species<3;species++){
   const selected=points.filter(p=>p.species===species);if(!selected.length)continue;
   const base=C.Biology?.phenotype(b,'forest-'+species,0),traits=base?.alien?{...base,plantForm:base.environment.wind>18?'low-fan':['forked-canopy','segmented-fronds','ribbed-crown'][species],leafTile:(base.environment.cold?[8,9,13]:base.environment.exposure>.55?[5,12,14]:[0,6,3])[species],barkTile:[2,11,4][species]}:base;
   const old=W.plantFrame;let tree;try{W.plantFrame=f;tree=traits?.alien?alienPlant(this.stage.materials,traits):buildPlants(this.stage.materials,[{position:f.center,size:[.01,.014,.018][species]}],W,b,C);}finally{W.plantFrame=old;}forms.push(traits?.plantForm||'conifer-'+species);
   let part=0;for(const child of tree.children.filter(c=>c.isMesh)){
    const u=this.uniforms,leaf=child.material===this.stage.materials.leaves||child.material.userData.leafSurface,key=b.id+'-'+species+'-'+part++,existing=this.materialCache.get(key),mat=existing||child.material.clone();
    if(!existing){
    if(leaf&&!traits?.alien){const color=C.PlanetClimate?.profile(b).foliageColor||[.55,.65,.39];mat.color.setRGB(...color.map(n=>n*(.85+species*.13)));}
    mat.onBeforeCompile=shader=>{Object.assign(shader.uniforms,u);shader.vertexShader='varying float forestDistance;uniform float forestTime;uniform vec2 forestWind;uniform float forestGust;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
     float heightWeight=max(0.,position.y)/12.;float phase=instanceMatrix[3].x*.073+instanceMatrix[3].z*.037;
     float gust=1.+forestGust*(sin(forestTime*.65+phase)*.3+sin(forestTime*1.71+phase)*.15);
     vec2 bend=forestWind*.006*heightWeight*heightWeight*gust;
     transformed.xz+=bend;transformed.y-=dot(bend,bend)*.013;
     transformed.x+=sin(forestTime*3.2+position.x*5.+phase)*length(forestWind)*.0007*heightWeight;
    `).replace('#include <project_vertex>','#include <project_vertex>\nforestDistance=length(mvPosition.xyz);');shader.fragmentShader='varying float forestDistance;\n'+shader.fragmentShader;
     if(leaf&&!traits?.alien)shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>','#ifdef USE_MAP\nvec4 sampledDiffuseColor=texture2D(map,vMapUv);float pigmentLight=dot(sampledDiffuseColor.rgb,vec3(.3,.59,.11));diffuseColor*=vec4(vec3(pigmentLight),sampledDiffuseColor.a);\n#endif');
     shader.fragmentShader=shader.fragmentShader.replace('#include <clipping_planes_fragment>','#include <clipping_planes_fragment>\nfloat coverage=1.-smoothstep(180.,235.,forestDistance);float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(coverage<=grain)discard;');};
    const windShader=mat.onBeforeCompile;mat.alphaToCoverage=true;
    mat.onBeforeCompile=shader=>{windShader(shader);shader.fragmentShader=shader.fragmentShader.replace('float grain=fract(52.9829189*fract(dot(gl_FragCoord.xy,vec2(.06711056,.00583715))));if(coverage<=grain)discard;','if(coverage<.003)discard;').replace('#include <alphatest_fragment>','diffuseColor.a*=coverage;\n#include <alphatest_fragment>');};
    mat.customProgramCacheKey=()=> 'rooted-weather-forest-v12-'+(traits?.alien?'alien':'earth')+'-'+species+'-'+leaf;
    this.materialCache.set(key,mat);}
    const inst=new T.InstancedMesh(child.geometry,mat,selected.length),dummy=new T.Object3D();selected.forEach((p,i)=>{dummy.position.set(...p.position);dummy.rotation.y=p.yaw;dummy.scale.setScalar(p.scale);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);});inst.instanceMatrix.needsUpdate=true;inst.castShadow=inst.receiveShadow=true;for(const batch of partitionInstances(inst,96,20)){this.root.add(batch);this.meshes.push(batch);}if(traits?.alien)child.material.dispose();
   }
  }
  this.count=points.length;this.plantForm=forms.join(' / ');this.center=[x,z];this.builds=(this.builds||0)+1;this.key=Math.floor(x/128)+','+Math.floor(z/128);
 }
 update(b,x,z,time,active,origin){const C=LongwayCore,u=this.uniforms,climate=this.stage.weather?.body===b.id?this.stage.weather.engine?.model:null,p=C.PlanetClimate?.profile(b),angle=(climate?.current.windDirection??p?.windDirection??0)*Math.PI/180,wind=climate?.current.wind??p?.wind??0;
  if(active&&!this.job&&(!this.center||Math.hypot(x-this.center[0],z-this.center[1])>96))this.job=this.build(b,x,z);
  if(active&&this.job){const deadline=performance.now()+2;do{if(this.job.next().done){this.job=null;break;}}while(performance.now()<deadline);}
  this.root.visible=active;if(!active)return;const f=this.v.anchor;frame(this.root,f.center,f.right,f.up,f.forward,origin);u.forestTime.value=time;u.forestWind.value.set(Math.sin(angle)*wind,Math.cos(angle)*wind);u.forestGust.value=climate?.current.gust??p?.gust??.2;
 }
}
