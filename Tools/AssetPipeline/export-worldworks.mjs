// Executes the user's unmodified Worldworks and Terrainworks cores at build time.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
const base=path.resolve(import.meta.dirname,'../..'), source=base+'/Reference/Original/source/';
const c=vm.createContext({console});
for(const f of ['engines-worldworks.js','engines-terrainworks.js'])vm.runInContext(fs.readFileSync(source+f,'utf8'),c);
const catalog=JSON.parse(fs.readFileSync(base+'/Reference/Original/assets/data/cosmoplot-worlds.json'));
const originals=catalog.systems.flatMap(s=>s.planets);
const worlds=JSON.parse(fs.readFileSync(base+'/Assets/SpacePatriot/Resources/Worlds.json')).worlds;
const out=base+'/Assets/SpacePatriot/Resources/Worldworks';fs.mkdirSync(out,{recursive:true});
const report=[];
for(const w of worlds){
 if(w.biome==='gas')continue;
 const seed=originals.find(b=>b.id===w.id).worldSeed>>>0;
 const type={rock:0,temperate:1,desert:2,ice:4,volcanic:5}[w.biome], wet=type===1?.72:type===4?.35:.2;
 const style=type===2?'desert':[0,4,5].includes(type)?'alpine':'highlands',relief=[22,26,19,0,31,34][type];
 const doc=c.WWCore.create(seed,style,relief,128,180);
 const terrain=c.TerrainworksCore.create({seed,mountainHeight:relief,temperature:type===4?.1:type===2?.9:.55,moisture:wet,terracing:type===2?.7:.12,warp:.9,ridgeSharpness:2.4,erosion:2.8,valleyDepth:6,biomeScale:2.4,rockCluster:.8});
 const data=Buffer.alloc(16+129*129*16);data.writeInt32LE(129);data.writeFloatLE(5760,4);data.writeUInt32LE(seed,8);data.writeFloatLE(doc.env.water,12);
 let min=Infinity,max=-Infinity;
 for(let j=0;j<129;j++)for(let i=0;i<129;i++){
  const x=(i/128-.5)*180,z=(j/128-.5)*180,k=j*129+i,m=terrain.moisture(x,z),r=terrain.rocks(x,z),a=Math.max(.38,Math.min(.82,.5+r*.35-m*.15));
  const height=(doc.base[k]*(1-a)+terrain.height(x,z)*a-doc.env.water)*32;
  [height,m,terrain.temperature(x,z,0),r].forEach((v,n)=>data.writeFloatLE(v,16+k*16+n*4));min=Math.min(min,height);max=Math.max(max,height);
 }
 fs.writeFileSync(out+'/'+w.id+'.bytes',data);report.push({world:w.id,seed,style,min,max,samples:16641});
}
fs.writeFileSync(base+'/Validation/worldworks-export.json',JSON.stringify(report,null,2));console.log('Compiled original Worldworks + Terrainworks:',report.length,'regional height/biome fields');
