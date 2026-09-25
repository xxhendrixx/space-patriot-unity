import {readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';

const json=async path=>JSON.parse(await readFile(path,'utf8'));
const buildPath='Space_Patriot.html',build=await stat(buildPath);
const packageInfo=await json('package.json');
const suites={},results={};
for(const name of ['artwork','browser','frontier','terrain','packaging','engines','city','society','frontier10','frontier11','polish','atmosphere','ship-fire']){
  const path=`artifacts/${name}-report.json`,result=await json(path),reportStat=await stat(path);
  const test=`tests/${name==='browser'?'browser':name+'-browser'}.mjs`;
  if(result.passed===false||result.error||result.failure||result.errors?.length||result.results?.some(r=>r.passed===false)){
    throw Error(`Unresolved failure in ${path}`);
  }
  if(reportStat.mtimeMs<Math.max(build.mtimeMs,(await stat(test)).mtimeMs)){
    throw Error(`Rerun ${test}: its report predates the build or test source`);
  }
  suites[name]={path,test,verifiedAt:reportStat.mtime.toISOString()};
  results[name]=result;
}

const unitPath='artifacts/unit-test-report.txt',units=await readFile(unitPath,'utf8');
const metric=name=>Number(units.match(new RegExp(`(?:^|\\n)[^\\n]*?\\b${name} (\\d+)\\s*(?:\\n|$)`))?.[1]??NaN);
const simulation={path:unitPath,tests:metric('tests'),passed:metric('pass'),failed:metric('fail'),skipped:metric('skipped'),cancelled:metric('cancelled')};
if(simulation.tests!==60||simulation.passed!==60||simulation.failed!==0||simulation.skipped!==0||simulation.cancelled!==0){
  throw Error('All 60 simulation tests must pass without failures, skips or cancellations');
}
const unitTime=(await stat(unitPath)).mtimeMs;
if(unitTime<build.mtimeMs)throw Error('Simulation report predates this build');
for(const file of await readdir('tests')){
  if(file.endsWith('.test.cjs')&&(await stat('tests/'+file)).mtimeMs>unitTime)throw Error(`Rerun simulation tests after editing ${file}`);
}
const performancePath='artifacts/performance-after.json',performance=await json(performancePath);
if((await stat(performancePath)).mtimeMs<build.mtimeMs||performance.errors.length||performance.scenes.some(s=>s.gl!==0))throw Error('Rerun the fixed-resolution performance profile after the build');

const {terrain,packaging,frontier,city,society,engines}=results;
if(!packaging.offline.boot||packaging.offline.glError!==0||packaging.offline.surfaceAtlases.length!==11||packaging.offline.surfaceAtlases.some(a=>!a.embedded)){
  throw Error('Portable artwork/engine boot is not verified');
}
if(packaging.cloudSignaling.connection!=='connected'||packaging.cloudSignaling.channel!=='open')throw Error('Public RTC connection was not verified');
if(!(society.tactics.metrics.factionHits>0&&society.tactics.metrics.flanks>0&&society.peer.actors===12&&society.sharedLift.floor===1)){
  throw Error('Faction tactics and the shared elevator were not verified');
}
const catalog=await json('assets/data/cosmoplot-worlds.json');
const catalogSummary={systems:catalog.systems.length,worlds:catalog.systems.reduce((n,s)=>n+s.planets.length,0),fetchedAt:catalog.fetchedAt,
  selection:catalog.systems.map(s=>({id:s.id,name:s.name,planets:s.planets.map(p=>p.name)})),interpretation:catalog.interpretation};
if(catalogSummary.systems!==5||catalogSummary.worlds!==19)throw Error('Unexpected curated catalog size');

const sha256={};
async function hash(path){sha256[path]=createHash('sha256').update(await readFile(path)).digest('hex');}
async function walk(dir,{runtime=false}={}){
  for(const entry of (await readdir(dir,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){
    const path=dir+'/'+entry.name;
    if(entry.isDirectory())await walk(path,{runtime});
    else{
      if(runtime&&(await stat(path)).mtimeMs>build.mtimeMs)throw Error(`Rebuild and reverify after editing ${path}`);
      await hash(path);
    }
  }
}
for(const path of [buildPath,'index.html','package.json','package-lock.json','README.md',unitPath,performancePath,...Object.values(suites).map(s=>s.path)])await hash(path);
await walk('source',{runtime:true});
for(const dir of ['assets','vendor/user-engines','scripts','tests','docs'])await walk(dir);

const report={verifiedAt:new Date().toISOString(),name:'Space Patriot',version:packageInfo.version,build:buildPath,buildTime:build.mtime.toISOString(),bytes:build.size,
  catalog:catalogSummary,
  materialLibrary:{atlases:results.frontier11.atlases.rows.length,albedoCells:results.frontier11.atlases.tiles,
    generated:['alien-flora-atlas.png','alien-fauna-atlas.png','habitat-surfaces-atlas.png','geology-atlas.png'],
    maps:'Albedo art with approximate normal, AO and roughness/metalness companions; environment-specific subsets are assigned at runtime.'},
  campaign:{title:'The Long Debt',quests:results.frontier11.campaign.quests,nodes:results.frontier11.campaign.nodes,
    worldMilestones:27,endingChoices:18,actualDeliveryAndTerminalVerified:results.frontier11.campaign.delivered},
  verification:{simulation,performance,terrain:{samples:terrain.parity.samples.length,maxErrorMetres:terrain.parity.maxErrorMetres,planetTypes:terrain.destinations.length,station:terrain.station},
    polish:results.polish,shipFire:results['ship-fire'],atmosphere:results.atmosphere,engines,city,society,frontier10:results.frontier10,frontier11:results.frontier11,offline:packaging.offline,network:packaging.cloudSignaling,
    interior:frontier.results.filter(r=>r.pausedRepairWithInputSuspended||r.interiorPerformance||r.airlock),suites},
  limits:[
    'Fixed pilot-eye cockpit artwork; physical walkable rooms use generated texture atlases.',
    'Wayfarer and Meridian have one connected deck, shared boarding and engineering/laser-turret seats; the owner retains pilot control.',
    'Two browser peers on one computer were tested with local and public signaling; cross-NAT and eight-player performance are unverified.',
    'Procedural terrain and animals are stylized approximations; concept boards are not proof of rendered-detail parity.',
    'The 128-cell library is loaded in full; model and environment selectors use subsets. Derived material maps are not scanned PBR measurements.',
    'Distant foliage uses procedural Gaussian primitives, not a trained photographic reconstruction. Near vegetation remains animated mesh geometry.',
    'Climate, cloud chemistry, pigment and irradiation/magnetosphere adaptations include modeled inputs and fictional interpretations, not observed exoplanet surface conditions or life.',
    'Catalog identities and properties seed fictional terrain, settlements and life. JWST observation metadata does not supply surface maps.',
    'NPC conversations are authored branches selected by game state, with contracts and memory; no external language-model dialogue service is used.',
    'Faction battles simulate the active ground district, with nine soldiers and three named NPCs. This is not a continuously simulated online universe.',
    'Shared faction contracts belong to the host. Campaign progress, markets and inventory save in browser storage; host migration and persistent online servers are not implemented.',
    'Orbital distances and initial phases are adapted for play; exoplanet rotations assume synchronous spin.',
    'Nineteen background markets and bounded convoy traffic run during the session; faction ground tactics simulate the active district.'
  ],sha256};
await writeFile('artifacts/final-build-report.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({name:report.name,version:report.version,bytes:report.bytes,simulationTests:simulation.passed,browserSuites:Object.keys(suites).length,
  systems:catalogSummary.systems,worlds:catalogSummary.worlds,terrainSamples:terrain.parity.samples.length,sha256:sha256[buildPath]}));
