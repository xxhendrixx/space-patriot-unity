import {readFile,writeFile,mkdir} from 'node:fs/promises';
const catalog=JSON.parse(await readFile('assets/data/cosmoplot-worlds.json','utf8'));
const rows=catalog.systems.flatMap(s=>s.planets),result={version:1,fetchedAt:new Date().toISOString(),interpretation:'Catalog temperatures, irradiation, locking and atmosphere evidence constrain a fictional local weather model. Wind speeds, gusts and storm timing are game estimates, not measured exoplanet forecasts.',planets:{}};
await mkdir('artifacts/cosmoplot/climate',{recursive:true});
for(let i=0;i<rows.length;i+=4)await Promise.all(rows.slice(i,i+4).map(async p=>{
 const url='https://cosmoplot.io/api/science/planet?name='+encodeURIComponent(p.name),cached=process.argv.includes('--from-cache'),r=cached?null:await fetch(url);const data=cached?JSON.parse(await readFile('artifacts/cosmoplot/climate/'+p.id+'.json','utf8')):r.ok?await r.json():{fetchedAt:new Date().toISOString(),temperatures:{equilibriumK:p.equilibriumK},orbital:{},atmosphere:{},sources:p.provenance,unavailable:r.status};
 await writeFile('artifacts/cosmoplot/climate/'+p.id+'.json',JSON.stringify(data,null,2));
 result.planets[p.id]={name:p.name,source:url,endpointStatus:data.unavailable||200,fetchedAt:data.fetchedAt,temperatures:data.temperatures,orbital:{tidallyLocked:data.orbital?.tidallyLocked},radiation:data.radiation,magnetosphere:data.magnetosphere,atmosphere:data.atmosphere,retention:data.retention,sources:data.sources};
 console.log('Climate evidence:',p.name);
}));
await writeFile('assets/data/cosmoplot-climate.json',JSON.stringify(result,null,2)+'\n');
await writeFile('source/climate-data.js','globalThis.SpacePatriotClimate='+JSON.stringify(result)+';\n');
