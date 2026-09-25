import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const cached=process.argv.includes('--from-cache'),endpoint='https://cosmoplot.io/api/science/universe';
async function get(url,file){if(cached)return JSON.parse(await readFile('artifacts/cosmoplot/'+file,'utf8'));const r=await fetch(url);if(!r.ok)throw Error(url+' '+r.status);return r.json();}
const extra=['TOI-270','K2-141','WASP-76'],[snapshot,research,science,...additional]=await Promise.all([
 get(endpoint,'universe.json'),get('https://raw.githubusercontent.com/H-XX-D/Cosmoplot/main/data/science/analyses/researched-systems.json','researched-systems.json'),get('https://cosmoplot.io/api/science/planet?name=TRAPPIST-1%20b','trappist-1-b-science.json'),
 ...extra.map(name=>get(endpoint+'?radiusPc=5000&limit=50&search='+name,name.toLowerCase()+'.json'))]);
const systems=['sun','trappist-1'].map(id=>snapshot.systems.find(s=>s.id===id));
for(const [i,name]of extra.entries()){
 const entry=research.systems.find(s=>s.system===name),host=additional[i].systems.find(s=>s.id===name.toLowerCase());if(!entry||!host)throw Error('Missing researched system '+name);
 const planets=host.planets.filter(p=>research.planetNames.includes(p.name));if(!planets.length)throw Error('No researched planets '+name);
 systems.push({...host,planets,research:{source:'https://github.com/H-XX-D/Cosmoplot/tree/main/data/science/analyses/'+name,planetNames:entry.planets,files:entry.files,scope:'Selected planets with local deep-dive profiles; other known planets are outside this playable catalog.'}});
}
const seed=s=>{let h=2166136261;for(const c of s)h=Math.imul(h^c.charCodeAt(0),16777619);return h>>>0;};
for(const system of systems){system.planets.sort((a,b)=>a.semiMajorAxisAu-b.semiMajorAxisAu);for(const p of system.planets){p.worldSeed=seed('space-patriot/'+system.id+'/'+p.id);p.appearanceTier='artistic';}}
systems[1].jwst={source:'https://cosmoplot.io/api/science/planet?name=TRAPPIST-1%20b',fetchedAt:science.fetchedAt,scope:'Host-system archive observation metadata; not planet terrain or a claim of detected molecules.',observations:science.spectrum.jwstObservations,sources:science.sources.filter(x=>x.id.startsWith('mast-jwst'))};
const bundle={format:'space-patriot-cosmoplot',version:2,generatedAt:snapshot.generatedAt,fetchedAt:new Date().toISOString(),endpoint,sources:[...snapshot.sources,...additional.flatMap(x=>x.sources)],systems,interpretation:'Real identities and catalog properties seed fictional playable worlds. Terrain, settlements and life are generated, not JWST maps. Radii and orbital distances are compressed. The three additional systems include only planets listed in Cosmoplot’s research index.'};
await mkdir('assets/data',{recursive:true});await writeFile('assets/data/cosmoplot-worlds.json',JSON.stringify(bundle,null,2)+'\n');
await writeFile('source/cosmoplot-data.js','/* Public Cosmoplot catalog snapshot. Regenerate with scripts/import-cosmoplot.mjs. */\nglobalThis.SpacePatriotCatalog='+JSON.stringify(bundle)+';\n');
console.log(JSON.stringify({systems:systems.length,worlds:systems.reduce((n,s)=>n+s.planets.length,0),sha256:createHash('sha256').update(JSON.stringify(bundle)).digest('hex')}));
