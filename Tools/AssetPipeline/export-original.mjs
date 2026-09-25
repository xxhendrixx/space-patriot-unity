import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import crypto from 'node:crypto';
import {createCanvas,loadImage,ImageData} from '@napi-rs/canvas';
import * as T from 'three';
import {createMaterials} from './visuals/materials.js';
import {applySurfaceArt,surfaceFiles} from './visuals/art-materials.js';
import {buildCraft,buildCockpit,buildGun} from './visuals/craft.js';
import {buildPort,buildStation,buildPlants} from './visuals/environment.js';
import {CityStage} from './visuals/city-stage.js';
import {HangarStage} from './visuals/hangar-stage.js';
import {buildRefit} from './visuals/industrial-refit.js';
import {alienPlant} from './visuals/alien-biology.js';

const project=path.resolve(import.meta.dirname,'../..');
const root=path.join(project,'Reference/Original');
const out=path.join(project,'Assets/SpacePatriot/Original/Converted');
fs.mkdirSync(out,{recursive:true});
globalThis.document={createElement(tag){if(tag==='canvas')return createCanvas(1,1);throw Error(tag);}};
const context=vm.createContext({console,globalThis:null,structuredClone,performance});context.globalThis=context;
for(const file of ['core.js','expedition.js','interior-layout.js','engines-architecture.js','architecture-furniture.js','engines-pathworks.js','engines-machineworks.js','city-world.js'])vm.runInContext(fs.readFileSync(path.join(root,'source',file),'utf8'),context,{filename:file});
globalThis.LongwayCore=context.LongwayCore;
globalThis.ArchitectureGeometry=context.ArchitectureGeometry;
const crafts=LongwayCore.CRAFTS;
fs.writeFileSync(path.join(project,'Assets/SpacePatriot/Resources/Fleet.json'),JSON.stringify({crafts},null,2));
const art={};
for(const [key,file] of Object.entries(surfaceFiles)){
  const im=await loadImage(path.join(root,file));
  const grid=['city','machinery','frontier','alienFlora','alienFauna','habitat','geology'].includes(key)?4:2;
  art[key]=[];
  for(let i=0;i<grid*grid;i++){
    const c=createCanvas(512,512);c.getContext('2d').drawImage(im,(i%grid)*im.width/grid,Math.floor(i/grid)*im.height/grid,im.width/grid,im.height/grid,0,0,512,512);
    const texture=new T.CanvasTexture(c);texture.colorSpace=T.SRGBColorSpace;texture.wrapS=texture.wrapT=T.RepeatWrapping;
    texture.name=key+'-'+i;
    const sc=createCanvas(256,256),ctx=sc.getContext('2d');ctx.drawImage(c,0,0,256,256);
    const pixels=ctx.getImageData(0,0,256,256).data,heights=new Float32Array(256*256),normal=new Uint8Array(256*256*4),orm=new Uint8Array(normal.length);
    for(let j=0;j<heights.length;j++)heights[j]=(pixels[j*4]*.2126+pixels[j*4+1]*.7152+pixels[j*4+2]*.0722)/255;
    const at=(x,y)=>heights[((y+256)%256)*256+(x+256)%256];
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){const j=y*256+x,gx=(at(x+1,y)-at(x-1,y))*1.5,gy=(at(x,y+1)-at(x,y-1))*1.5,l=Math.hypot(gx,gy,1),h=heights[j];normal.set([128-gx/l*127,128+gy/l*127,128+127/l,255],j*4);const metal=['interior','exterior','machinery'].includes(key);orm.set([210+h*45,metal?155+h*70:220+h*28,metal?210:0,255],j*4);}
    const normalMap=new T.DataTexture(normal,256,256),packed=new T.DataTexture(orm,256,256);
    art[key].push({map:texture,normalMap,roughnessMap:packed,metalnessMap:packed,aoMap:packed});
    fs.writeFileSync(path.join(out,'atlas-'+key+'-'+i+'.png'),c.toBuffer('image/png'));
  }
}
art.foliage=new T.Texture(await loadImage(path.join(root,'assets/textures/conifer-branch.png')));
const materials=applySurfaceArt(createMaterials({capabilities:{getMaxAnisotropy:()=>8}}),art);
materials.hull.name='Hull finish';
const textureCache=new Map(),materialCache=new Map(),manifest={meshes:[],materials:[],models:[],atlases:128};
const digest=b=>crypto.createHash('sha256').update(b).digest('hex').slice(0,24);
function texture(tx){
  if(!tx?.image)return '';
  if(textureCache.has(tx.uuid))return textureCache.get(tx.uuid);
  const im=tx.image;let c;
  if(ArrayBuffer.isView(im.data)){c=createCanvas(im.width,im.height);c.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(im.data),im.width,im.height),0,0);}
  else if(im.toBuffer)c=im;
  else{c=createCanvas(im.width,im.height);c.getContext('2d').drawImage(im,0,0);}
  const b=c.toBuffer('image/png'),name='tex-'+digest(b)+'.png';
  fs.writeFileSync(path.join(out,name),b);textureCache.set(tx.uuid,name);return name;
}
function material(mat){
  const row={color:mat.color.toArray(),emission:mat.emissive?.toArray()||[0,0,0],intensity:mat.emissiveIntensity||0,metal:mat.metalness||0,rough:mat.roughness??.7,opacity:mat.opacity,transparent:mat.transparent,alphaTest:mat.alphaTest||0,doubleSided:mat.side===T.DoubleSide,unlit:mat.isMeshBasicMaterial||false,map:texture(mat.map),normal:texture(mat.normalMap),emissiveMap:texture(mat.emissiveMap),repeat:mat.map?.repeat.toArray()||[1,1],normalScale:mat.normalScale?.x??.25};
  row.paint=mat.name==='Hull finish';const id=digest(JSON.stringify(row));
  if(!materialCache.has(id)){materialCache.set(id,row);manifest.materials.push({id,...row});}
  return id;
}
function exportModel(group,id,kind){
  group.updateMatrixWorld(true);const nodes=[];
  group.traverse(o=>{
    if(!o.isMesh)return;
    if(Array.isArray(o.material))throw Error('Unhandled submesh');
    const geo=o.geometry.clone().applyMatrix4(o.matrixWorld),p=geo.getAttribute('position'),n=geo.getAttribute('normal'),uv=geo.getAttribute('uv');
    let ix=geo.index?Array.from(geo.index.array):Array.from({length:p.count},(_,i)=>i);
    // Reflect Z to Unity +Z. OriginalAssetImporter reconciles triangle winding with reflected normals.
    const floats=[];
    for(let i=0;i<p.count;i++)floats.push(p.getX(i),p.getY(i),-p.getZ(i),n?.getX(i)||0,n?.getY(i)||0,-(n?.getZ(i)||0),uv?.getX(i)||0,uv?.getY(i)||0);
    const buffer=Buffer.alloc(8+floats.length*4+ix.length*4);buffer.writeInt32LE(p.count,0);buffer.writeInt32LE(ix.length,4);
    floats.forEach((f,i)=>buffer.writeFloatLE(f,8+i*4));ix.forEach((v,i)=>buffer.writeInt32LE(v,8+floats.length*4+i*4));
    const file='mesh-'+digest(buffer)+'.bytes';
    if(!fs.existsSync(path.join(out,file)))fs.writeFileSync(path.join(out,file),buffer);
    let gear=false;for(let a=o;a;a=a.parent)gear||=!!a.userData.gear;
    let door='',lift=false,platform=false;for(const [key,node] of group.userData.doors||[])for(let a=o;a;a=a.parent)if(a===node)door=key;
    for(let a=o;a;a=a.parent){lift||=!!a.userData.lift;platform||=a.name==='Hangar lift platform';}
    nodes.push({file,material:material(o.material),gear,door,lift,liftFloor:o.userData.liftFloor??-1,liftSide:o.userData.liftSide??0,mfd:o.userData.mfdIndex??-1,button:group.userData.buttons?.indexOf(o)??-1,name:platform?'Hangar lift platform':o.name||'Original modeled surface'});
    geo.dispose();
  });
  manifest.models.push({id,kind,nodes,deck:group.userData.deckPlan||null});
  console.log(id,nodes.length,'meshes');
}
for(let family=0;family<10;family++)exportModel(buildCraft(materials,crafts[family*10]),'hull-'+family,'hull');
for(let family=0;family<10;family++)exportModel(buildRefit(materials,crafts[family*10]),'refit-'+family,'hull');
for(const family of [0,7,9])exportModel(buildCockpit(materials,crafts[family*10]),'cabin-'+family,'cabin');
exportModel(buildGun(materials,false),'rifle','weapon');exportModel(buildGun(materials,true),'sidearm','weapon');
const body={id:'earth',name:'Earth',seed:715317,type:1,settlementStyle:0};
exportModel(buildPort(materials,body,LongwayCore),'port','environment');
exportModel(buildStation(materials),'station','environment');
exportModel(buildPort(materials,{...body,activeSettlement:{kind:'outpost',name:'Freight depot'}},LongwayCore),'outpost','environment');
const scene=new T.Scene(),stage={scene,materials,app:{shipboard:{hangarRaised:0,hangarFrame:()=>({center:[0,0,0],right:[1,0,0],up:[0,1,0],forward:[0,0,-1]})}}};
const hangar=new HangarStage(stage);hangar.update([0,0,0]);
hangar.platform.userData.dynamic=true;hangar.platform.name='Hangar lift platform';hangar.roof.forEach(({p,side})=>{p.name='Hangar roof '+side;p.userData.dynamic=true;});
exportModel(hangar.root,'hangar','environment');
const city=LongwayCore.CityWorld.forBody(body),cityStage=new CityStage(stage),buildingRecords=[];
for(let i=0;i<4;i++){const b=city.buildings[i],v=cityStage.detail(city,b);v.root.position.set(0,0,0);v.cabin.userData.lift=true;for(const d of v.doors){d.mesh.userData.liftFloor=d.k;d.mesh.userData.liftSide=d.side;}
  exportModel(v.root,'building-'+i,'environment');buildingRecords.push({model:'building-'+i,levels:b.levels,colliders:b.colliders,rooms:b.doc.levels.map((l,k)=>({level:k,name:l.name,rooms:l.rooms}))});}
fs.writeFileSync(path.join(project,'Assets/SpacePatriot/Resources/Buildings.json'),JSON.stringify({buildings:buildingRecords},null,2));
for(const [i,form] of ['forked-canopy','segmented-fronds','ribbed-crown'].entries())exportModel(alienPlant(materials,{plantForm:form,leafTile:[0,6,3][i],barkTile:[2,11,4][i]}),'alien-flora-'+i,'environment');
exportModel(buildPlants(materials,[{position:[0,0,0],size:.01}],{plantFrame:{center:[0,0,0]},toLocal:p=>p},body,LongwayCore),'conifer','environment');
fs.writeFileSync(path.join(out,'import.json'),JSON.stringify(manifest));
fs.writeFileSync(path.join(project,'Assets/SpacePatriot/Resources/DeckPlans.json'),JSON.stringify({plans:[7,9].map(family=>({family,...LongwayCore.InteriorLayout(crafts[family*10])}))},null,2));
console.log('Exported',crafts.length,'craft records;',manifest.models.length,'models;',manifest.materials.length,'materials. Original geometry and UVs retained.');
