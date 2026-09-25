import fs from 'node:fs';
import path from 'node:path';
const project=path.resolve(import.meta.dirname,'../..');
const source=fs.readFileSync(path.join(project,'Reference/Original/source/settlements.js'),'utf8');
const names=key=>Function('return '+source.match(new RegExp('const '+key+'=(\\[[^;]+\\]);'))[1])();
const earth=names('earthNames'),colonies=names('newNames'),unique=names('unique'),posts=names('postNames');
const worlds=JSON.parse(fs.readFileSync(path.join(project,'Assets/SpacePatriot/Resources/Worlds.json'))).worlds;
const settlements=[];
for(const [index,w] of worlds.entries()){
 const cities=w.name==='Earth'?earth:Array.from({length:8},(_,i)=>i<4?'New '+colonies[(index*3+i)%colonies.length]:unique[(index*7+i)%unique.length]+' '+['Haven','City','Crossing','Port'][i%4]);
 for(const [i,name] of cities.entries())settlements.push({id:w.id+':city:'+i,world:w.id,name:name+(w.biome==='gas'?' Cloud City':''),kind:'city',primary:i===0,seed:((w.seed^Math.imul(i,83419))>>>0)%2147483647});
 for(let i=0;i<12;i++)settlements.push({id:w.id+':outpost:'+i,world:w.id,name:(i%3===0?'New '+colonies[(index+i)%colonies.length]:unique[(index*11+i)%unique.length])+' '+posts[i],kind:'outpost',primary:false,seed:((w.seed^Math.imul(i,19171)^118)>>>0)%2147483647});
}
fs.writeFileSync(path.join(project,'Assets/SpacePatriot/Resources/Settlements.json'),JSON.stringify({settlements},null,2));
console.log('Preserved',settlements.length,'original named settlements. Local layouts use seeded Unity district plans.');
