import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createGameServer } from './serve.mjs';
import { launchOptions } from './feature-browser-config.mjs';

// Moving-route performance probe, independent of the project's error checker.
const label=process.argv[2]||'after',dir='build_logs/planet-flight';
if(!/^[a-z0-9-]+$/i.test(label))throw Error('Invalid label');
await mkdir(dir,{recursive:true});
const server=createGameServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch(launchOptions()),page=await browser.newPage({viewport:{width:1280,height:720}});
const report={label,browser:browser.version(),viewport:[1280,720],errors:[],scenes:[]};
const profiler=label==='profile'?await page.context().newCDPSession(page):null;
page.on('pageerror',e=>report.errors.push(e.message));
try{
 if(label==='before')await page.route('**/baseline.html',async r=>r.fulfill({contentType:'text/html',body:await readFile(`${dir}/baseline.html`,'utf8')}));
 const start=Date.now();await page.goto(`http://127.0.0.1:${server.address().port}/${label==='before'?'baseline.html':'index.html'}`);
 await page.waitForFunction(()=>window.longwayBoot?.state.ready&&window.BloxVisuals,null,{timeout:210000});report.bootMs=Date.now()-start;
 await page.locator('#start').click();await page.evaluate(()=>{longway.pause();longway.combat.enemies=[];longway.combat.recover();longway.celestial.timeScale=0;longway.celestial.advance(0);longway.celestial.sun=()=>LongwayCore.unit(LongwayCore.add(LongwayCore.Landscape.up,LongwayCore.mul(LongwayCore.Landscape.right,.7)));});
 report.hardware=await page.evaluate(()=>longway.renderer.hardware);
 for(const scene of ['venus-entry','venus-surface','earth-surface']){
  if(profiler&&scene==='earth-surface'){await profiler.send('Profiler.enable');await profiler.send('Profiler.start');}
  const result=await page.evaluate(async scene=>{
   const A=longway,F=A.flight,W=A.world,C=LongwayCore,V=BloxVisuals,b=W.catalog.find(b=>b.name===(scene.startsWith('venus')?'Venus':'Earth'));
   F.place(b,'orbit');F.cameraMode='cockpit';F.walking=false;F.vehicle.state='flight';F.route=null;F.velocity=[0,0,0];
   const site={center:C.add(b.center,C.mul(C.Landscape.up,b.radius)),up:C.Landscape.up,right:C.Landscape.right,forward:C.Landscape.forward};A.renderer.quality=1;A.renderer.autoResolution=false;A.renderer.pixelBudget=460800;A.renderer.scale=.7;V.renderer.setPixelRatio(1);V.renderer.setSize(innerWidth,innerHeight);A.resize();
   const frames=[],cpus=[],builds=[],slices=[],stages={};
   // Attribute recurring CPU costs without wrapping individual terrain samples.
   const wrapped=[];
   for(const [name,obj,key]of [['weather',V.weather,'update'],['engines',V.engines,'update'],['city',V.city,'update'],['prefetch',W,'prefetchSurface']])if(obj?.[key]){
    const fn=obj[key];obj[key]=function(...args){const t=performance.now(),v=fn.apply(this,args),ms=performance.now()-t;(stages[name]??=[]).push(ms);return v;};wrapped.push(()=>obj[key]=fn);
   }
   let last=performance.now(),lastBuild=V.terrainBuilds||0;
   const count=scene.endsWith('entry')?420:480;
   for(let i=0;i<count;i++){
    await new Promise(requestAnimationFrame);const now=performance.now(),t=performance.now(),u=Math.max(0,i-60)/(count-61);
    const local=W.fromLocal([2.7+u*6,0,2.7],site),n=C.unit(C.sub(local,b.center)),height=W.height(b,n),alt=scene.endsWith('entry')?14-u*13.7:.18;
    F.position=C.add(b.center,C.mul(n,b.radius+height+alt));F.up=n;F.forward=C.unit(C.sub(site.right,C.mul(n,.20)));F.orthogonalize();F.vehicle.position=F.position.slice();F.vehicle.forward=F.forward.slice();F.vehicle.up=F.up.slice();
    A.step(1/60);A.render();window.BloxUI?.frame(performance.now());
    if(i>=60){frames.push(now-last);cpus.push(performance.now()-t);slices.push(V.terrainSliceMs||0);}
    if((V.terrainBuilds||0)!==lastBuild){builds.push(V.terrainBuildMs);lastBuild=V.terrainBuilds;}
    last=now;
   }
   wrapped.forEach(f=>f());const summary=a=>{const s=[...a].sort((a,b)=>a-b);return {mean:a.reduce((a,b)=>a+b,0)/Math.max(1,a.length),p95:s[Math.floor(s.length*.95)]||0,max:s.at(-1)||0};};
   return {frames:summary(frames),cpu:summary(cpus),terrainBuilds:builds,terrainSlices:summary(slices),stages:Object.fromEntries(Object.entries(stages).map(([k,v])=>[k,summary(v)])),detail:V.stats,body:{name:b.name,type:b.type,liquid:b.liquid,atmosphere:b.atmosphere,radius:b.radius},fog:V.surfaceFog.density};
  },scene);
  if(profiler&&scene==='earth-surface'){const {profile}=await profiler.send('Profiler.stop');await writeFile(`${dir}/earth.cpuprofile`,JSON.stringify(profile));}
  report.scenes.push({scene,...result});console.log(JSON.stringify({scene,frames:result.frames,cpu:result.cpu,terrain:result.terrainBuilds,stages:result.stages}));
  await page.screenshot({path:`${dir}/${label}-${scene}.png`});
 }
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e);}finally{await writeFile(`${dir}/${label}.json`,JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
