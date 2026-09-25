import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const label=process.argv[2]||'after',adaptive=process.argv.includes('--adaptive'),browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1440,height:900}}),report={label,errors:[],scenes:[]};
report.adaptive=adaptive;
page.on('pageerror',e=>report.errors.push(e.message));
try {
  await page.goto('http://localhost:4173/?signaling=local');
  await page.waitForFunction(()=>window.BloxVisuals?.enabled&&longwayBoot.state.ready,null,{timeout:90000});
  await page.locator('#start').click();
  await page.evaluate(adaptive=>window.profileAdaptive=adaptive,adaptive);
  for(const scene of ['space','city','cloud-city','forest','low-flight']){
    await page.evaluate(scene=>{
      const A=longway,F=A.flight,C=LongwayCore,W=A.world;
      A.pause();A.combat.enemies=[];A.combat.recover();A.celestial.timeScale=1;
      const b=W.catalog.find(b=>b.name===(scene==='cloud-city'?'TOI-270 c':'Earth'));
      F.place(b,scene==='space'?'orbit':'surface');F.cameraMode='chase';
      if(scene!=='space'){const s=W.site(b);F.position=W.fromLocal([.02,.06,.18],s);F.vehicle.position=F.position.slice();F.forward=C.unit(C.sub(s.center,F.position));F.up=s.up.slice();F.orthogonalize();F.vehicle.forward=F.forward.slice();F.vehicle.up=F.up.slice();}
      if(scene==='forest'||scene==='low-flight'){
        const s=W.site(b),p=W.fromLocal([.7,0,.7],s),n=C.unit(C.sub(p,b.center));
        F.position=C.add(b.center,C.mul(n,b.radius+W.height(b,n)+(scene==='forest'?.00186:.3)));F.walking=scene==='forest';F.vehicle.state=F.walking?'walking':'flight';F.cameraMode=F.walking?'cockpit':'chase';F.velocity=[0,0,0];F.forward=s.forward.slice();F.up=n;F.orthogonalize();F.vehicle.position=F.position.slice();F.vehicle.forward=F.forward.slice();F.vehicle.up=F.up.slice();
      }
      window.performanceScene=scene;
      A.renderer.autoResolution=profileAdaptive;A.renderer.pixelBudget=profileAdaptive?600000:460800;A.renderer.scale=profileAdaptive?.9:.7;A.resize();A.render();
    },scene);
    const stats=await page.evaluate(()=>new Promise(resolve=>{
      const A=longway,rows=[],warmup=profileAdaptive?210:30;let last=performance.now(),i=0;
      function frame(now){const start=performance.now();if(performanceScene==='forest'||performanceScene==='low-flight')A.flight.update(1/60,{forward:1,boost:performanceScene==='low-flight'});A.step(1/60);if(profileAdaptive&&A.renderer.adapt(now-last,now))A.resize();A.render();const cpu=performance.now()-start;if(i++>=warmup)rows.push({frameMs:now-last,cpuMs:cpu});last=now;
        if(i<warmup+120)return requestAnimationFrame(frame);
        const sorted=rows.map(r=>r.frameMs).sort((a,b)=>a-b),avg=rows.reduce((s,r)=>s+r.frameMs,0)/rows.length;
        resolve({frames:rows.length,meanFrameMs:avg,fps:1000/avg,p95FrameMs:sorted[Math.floor(sorted.length*.95)],maxFrameMs:sorted.at(-1),stallsOver100Ms:sorted.filter(ms=>ms>100).length,meanCpuMs:rows.reduce((s,r)=>s+r.cpuMs,0)/rows.length,maxCpuMs:Math.max(...rows.map(r=>r.cpuMs)),rayGpuMs:A.renderer.gpuMs,planets:A.renderer.active.length,detail:BloxVisuals.stats,hardware:A.renderer.hardware,gl:A.check().error});
      }requestAnimationFrame(frame);
    }));
    report.scenes.push({scene,...stats});console.log(JSON.stringify({scene,fps:stats.fps,p95:stats.p95FrameMs,cpu:stats.meanCpuMs,gpu:stats.rayGpuMs,bodies:stats.planets,draws:stats.detail.drawCalls}));
    await page.screenshot({path:`artifacts/lookdev/${label}-${scene}.png`});
  }
}finally{await writeFile(`artifacts/performance-${label}.json`,JSON.stringify(report,null,2));await browser.close();}
