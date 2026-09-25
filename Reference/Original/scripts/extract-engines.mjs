import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const root='vendor/user-engines', out='source/engines';
await mkdir(out,{recursive:true});
const read=async name=>(await readFile(`${root}/${name}.html`,'utf8'));
// Extract balanced declarations without executing the uploaded laboratory pages.
function block(source,marker){
 const start=source.indexOf(marker);if(start<0)throw Error('Missing '+marker);
 const open=source.indexOf('{',start);let depth=0,quote='',comment='';
 for(let i=open;i<source.length;i++){
  const c=source[i],n=source[i+1];
  if(comment==='line'){if(c==='\n')comment='';continue;}
  if(comment==='block'){if(c==='*'&&n==='/'){comment='';i++;}continue;}
  if(quote){if(c==='\\'){i++;continue;}if(c===quote)quote='';continue;}
  if(c==='/'&&n==='/'){comment='line';i++;continue;}if(c==='/'&&n==='*'){comment='block';i++;continue;}
  if(c==='"'||c==="'"||c==='`'){quote=c;continue;}
  if(c==='{')depth++;if(c==='}'&&--depth===0)return source.slice(start,i+1);
 }
 throw Error('Unbalanced '+marker);
}
const header=name=>`/* Generated from the user's ${name}.html. See vendor/user-engines/manifest.json.\n   Reusable engine code, without its editor, CDN loader, camera or animation loop.\n   Rebuild with node scripts/extract-engines.mjs. */\n`;
const compact=s=>s.split('\n').filter(l=>l.trim()).join('\n');
const functions=(s,names)=>names.map(n=>block(s,'function '+n+'(')).join('\n');
const settings=s=>s.replace(/Number\(\s*inputs\.(\w+)\.value\s*\)/g,'settings.$1').replaceAll('Math.random()','random()');
let s=await read('grasspack3js');
const grassFns=settings(functions(s,['createBladeGeometry','createGrassMaterial','rebuildGrass']));
await writeFile(`${out}/grassworks.js`,header('grasspack3js')+`import * as THREE from 'three';
export function createGrassworks(options={},heightAt=()=>0){
 const settings={density:32000,field:34,height:.65,width:.055,wild:.7,wind:.6,speed:1,gust:.2,turb:.5,colorVar:.5,fog:.00022,...options};
 const random=options.random||Math.random,scene=new THREE.Group(),$=()=>({});let grass=null,grassMaterial=null;
 ${compact(grassFns)}
 rebuildGrass();
 const offsets=grass.geometry.attributes.offset,scales=grass.geometry.attributes.scale;
 for(let i=0;i<offsets.count;i++){const h=heightAt(offsets.getX(i),offsets.getZ(i));if(h===null||!Number.isFinite(h)){scales.setX(i,0);offsets.setY(i,-1000);}else offsets.setY(i,h);}
 offsets.needsUpdate=scales.needsUpdate=true;scene.name='Grassworks terrain-rooted blades';
 grassMaterial.vertexShader=grassMaterial.vertexShader.replace('p += offset;', 'p *= 1.0-smoothstep(26.0,34.0,length(offset.xz)); p += offset;');
 grass.userData.skipAO=true;
 return {root:scene,mesh:grass,material:grassMaterial,settings,update(time){grassMaterial.uniforms.uTime.value=time;},dispose(){grass.geometry.dispose();grassMaterial.dispose();scene.removeFromParent();}};
}
`);
s=await read('oceanworksv2');
await writeFile(`${out}/oceanworks.js`,header('oceanworksv2')+`import * as THREE from 'three';
export function createOceanworks(options={}){
 const settings={height:.65,length:24,chop:.35,speed:.7,ripples:.2,direction:35,normalStrength:.65,microNormal:.45,crestSharpness:.55,crestCurl:.25,breaking:.25,whitecaps:.45,foam:.35,reflect:.78,depth:.7,sun:2.7,haze:.00022,...options};
 const sun={position:new THREE.Vector3(...(options.sunDirection||[-.4,1,-.3])).normalize()},fogColor=new THREE.Color(0x94b7c2);
 ${compact(settings(functions(s,['createOceanMaterial']).replace(/max\(\s*dot\(\s*N,\s*V\s*\),\s*0\.0\s*\)/, 'clamp(dot(N,V),0.0,1.0)')))}
 const material=createOceanMaterial();material.name='Oceanworks displaced water';return material;
}
`);
s=await read('Fireworks');
const fireNames=['createFlameMaterial','rebuildFlames','createEmberMaterial','rebuildEmbers','createSmokeMaterial','rebuildSmoke','updateFlameUniforms','updateEmberUniforms','updateSmokeUniforms'];
await writeFile(`${out}/fireworks.js`,header('Fireworks')+`import * as THREE from 'three';
export function createFireworks(options={}){
 const settings={fuel:1.1,oxygen:1,temperature:.64,height:3,width:1.3,turbulence:.8,flicker:.65,wind:.2,windDirection:25,gust:.45,emberRate:.65,sparkHeight:5,sparkSpread:1.2,smoke:.4,smokeExpansion:1,soot:.7,glow:.35,flameCount:1800,emberCount:280,smokeCount:350,...options};
 const random=options.random||Math.random,scene=new THREE.Group(),stage=()=>{};
 let flamePoints=null,flameMaterial=null,emberPoints=null,emberMaterial=null,smokePoints=null,smokeMaterial=null;
 ${compact(settings(functions(s,fireNames)))}
 rebuildFlames();rebuildEmbers();rebuildSmoke();
 // Normal alpha blending prevents hundreds of flame sprites accumulating into white.
 flameMaterial.blending=THREE.NormalBlending;
 flameMaterial.fragmentShader=flameMaterial.fragmentShader.replace(/vec3 hotWhite\\s*=\\s*vec3\\([\\s\\S]*?\\);/, 'vec3 hotWhite = vec3(1.,.39,.035);');
 flameMaterial.fragmentShader=flameMaterial.fragmentShader.replace(/hotWhite\\s*\\*\\s*core\\s*\\*\\s*0.35/, 'hotWhite * core * .07');
 flameMaterial.fragmentShader=flameMaterial.fragmentShader.replace(/}\\s*$/, '#include <tonemapping_fragment>\\n#include <colorspace_fragment>\\n}');
 scene.name='Fireworks flame / ember / smoke';scene.traverse(o=>{o.userData.skipAO=true;});
 return {root:scene,settings,materials:[flameMaterial,emberMaterial,smokeMaterial],update(time,values={}){Object.assign(settings,values);updateFlameUniforms();updateEmberUniforms();updateSmokeUniforms();for(const m of this.materials)m.uniforms.uTime.value=time;smokePoints.visible=settings.smoke>0;},dispose(){for(const p of [flamePoints,emberPoints,smokePoints]){p.geometry.dispose();p.material.dispose();}scene.removeFromParent();}};
}
`);
s=await read('spellworks');
const spellPrelude=s.slice(s.indexOf('const TAU ='),s.indexOf('const config ='));
const spellCore=s.slice(s.indexOf('const NOISE_GLSL ='),s.indexOf('function createStoneTexture'));
await writeFile(`${out}/spellworks.js`,header('spellworks')+`import * as THREE from 'three';\n${compact(spellPrelude+spellCore).replace('col+=vec3(hot*.65)','col+=vColor*hot*.12')}\nexport {MagicEngine,ParticlePool,PRESETS};\n`);
s=await read('storyworks');
const worldStart=s.indexOf('/* Worldworks 0.1'),worldEnd=s.indexOf('})(typeof window',worldStart),worldTail=s.indexOf(';',worldEnd)+1;
await writeFile('source/engines-worldworks.js',header('storyworks')+s.slice(worldStart,worldTail)+'\n');
const story=s.slice(s.indexOf("const VERSION = '0.1.0';"),s.indexOf('/** Original sample narrative:'));
await writeFile('source/engines-storyworks.js',header('storyworks')+`(function(root){'use strict';\n${story}\nroot.StoryworksCore={StoryEngine,EventBus,WorldworksStoryBridge,createWorldworksStory,validateProject,projectFingerprint,NODE_TYPES,INPUT_EVENTS,COMMANDS};\n})(globalThis);\n`);
const manifest=JSON.parse(await readFile(`${root}/manifest.json`));
// The second set uses renderer-independent kernels and injected host adapters.
s=await read('architectureworks');
let arch=s.slice(s.indexOf('/* ArchitectureWorks 0.1'),s.indexOf('/* ArchitectureWorks — optional'));
// Remove only HTML script wrappers between the two packaged core modules.
arch=arch.replace(/<\/?script[^>]*>/g,'');
arch=arch.replace('MAX_LEVELS:3','MAX_LEVELS:8').replace('finite(t.w,1,2,','finite(t.w,1,5,').replace('finite(s.foundation,0,1,','finite(s.foundation,0,2,');
arch=arch.replace('function furniture(g,f,base)', 'function legacyFurniture(g,f,base)');
arch=arch.replace('function compile(doc,options={})', (await readFile('source/architecture-furniture.js','utf8'))+'\nfunction compile(doc,options={})');
arch=arch.replace('stairs(g,doc,k);','if(!doc.spaceCity)stairs(g,doc,k);');
arch=arch.replace("else{const doorH=", "else if(!doc.spaceCity||!o.open){const doorH=");
await writeFile('source/engines-architecture.js',header('architectureworks')+compact(arch));
s=await read('Pathworks');
let path=s.slice(s.indexOf('const VERSION ='),s.indexOf('// Procedural starter scenery'));
path=path.replace(/<\/?script[^>]*>/g,'');
await writeFile('source/engines-pathworks.js',header('Pathworks')+`(function(root){${path}\nroot.PathworksCore={PathworksEngine,newDocument,newPath,findRoute,nearestOnPath};})(globalThis);\n`);
s=await read('inventoryworks');
const invPrelude=s.slice(s.indexOf("const VERSION ="),s.indexOf('const DEFINITIONS ='));
await writeFile('source/engines-inventory.js',header('inventoryworks')+`(function(root){${invPrelude}\nconst DEFINITIONS=[],RECIPES=[];\n${block(s,'class InventoryEngine ')}\nroot.InventoryworksCore={InventoryEngine};})(globalThis);\n`);
s=await read('weatherworks');
await writeFile(`${out}/weatherworks.js`,header('weatherworks')+s.slice(s.indexOf("const VERSION="),s.indexOf('function terrainHeight(')).replaceAll('viewMatrix*vec4','modelViewMatrix*vec4')+`\nexport {WeatherSystem,WeatherModel,PRESETS};\n`);
s=await read('Terrainworks');
const terrainNames=['clamp01','lerp','smoothValue','hash2','noise2','fbm','ridgedFBM','domainWarp','continentalField','mountainField','hillField','valleyField','erosionField','detailField','applyTerracing','cliffField','terrainHeight','moistureField','temperatureField','rockClusterField'];
await writeFile('source/engines-terrainworks.js',header('Terrainworks')+`(function(root){root.TerrainworksCore={create(options={}){const settings={seed:48127,warp:.65,continentScale:1,ridgeFrequency:1,ridgeSharpness:2,erosionScale:1,terracing:.1,cliffThreshold:.4,cliffStrength:1,baseElevation:0,landmass:1.6,mountainHeight:22,hills:3,valleyDepth:4,erosion:1.5,detail:.4,biomeScale:1,moisture:.6,temperature:.55,rockCluster:.55,...options},getSeed=()=>settings.seed;\n${compact(settings(functions(s,terrainNames)))}\nreturn{height:terrainHeight,moisture:moistureField,temperature:temperatureField,rocks:rockClusterField,settings};}};})(globalThis);\n`);
s=await read('creatureworks');
await writeFile(`${out}/creatureworks.js`,header('creatureworks')+s.slice(s.indexOf("const VERSION = '1.0.0'"),s.indexOf('// CreatureWorks standalone editor'))+`\nexport {createCreatureEngine,create,validateSettings};\n`);
s=await read('machineworks');
const modules=JSON.parse(s.match(/<script id="mw-module-sources"[^>]*>([\s\S]*?)<\/script>/)[1]);
await mkdir(`${out}/machineworks`,{recursive:true});
for(const name of ['simulation.mjs','model.mjs','geometry.mjs','math.mjs','three-view.mjs'])await writeFile(`${out}/machineworks/${name}`,header('machineworks')+modules[name]);
await writeFile('source/engines-machineworks.js',header('machineworks')+`(function(root){${modules['simulation.mjs'].replaceAll('export ','')}\nroot.MachineworksCore={MachineSimulation,TYPES,createPreset};})(globalThis);\n`);
for(const entry of manifest){const data=await readFile(entry.archive);if(createHash('sha256').update(data).digest('hex')!==entry.sha256)throw Error('Archived source changed: '+entry.name);}
console.log('Extracted thirteen reusable runtimes from twelve unchanged user HTML files.');
