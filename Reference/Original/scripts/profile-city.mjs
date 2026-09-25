import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
const p=await browser.newPage({viewport:{width:1440,height:900}});
try{
 await p.goto('http://localhost:4173/');await p.waitForFunction(()=>window.BloxVisuals?.enabled&&longwayBoot.state.ready,null,{timeout:90000});await p.locator('#start').click();
 const report=await p.evaluate(async()=>{
  const A=longway,F=A.flight,W=A.world,C=LongwayCore,V=BloxVisuals;A.pause();A.celestial.timeScale=1;A.combat.enemies=[];A.combat.recover();const b=W.catalog.find(b=>b.name==='Earth');F.place(b,'orbit');F.cameraMode='chase';for(let i=0;i<150;i++){A.step(1/60);A.render();await new Promise(requestAnimationFrame);}A.combat.recover();F.place(b,'surface');F.cameraMode='chase';const s=W.site(b);F.position=W.fromLocal([.02,.06,.18],s);F.vehicle.position=F.position.slice();F.forward=C.unit(C.sub(s.center,F.position));F.up=s.up.slice();F.orthogonalize();F.vehicle.forward=F.forward.slice();F.vehicle.up=F.up.slice();A.renderer.autoResolution=false;A.renderer.scale=.7;A.resize();
  const timing={},hook=(o,k,name)=>{const original=o[k];o[k]=function(...a){const start=performance.now();try{return original.apply(this,a)}finally{const t=timing[name]??={ms:0,max:0,calls:0};const ms=performance.now()-start;t.ms+=ms;t.max=Math.max(t.max,ms);t.calls++}};};
  for(const [o,k,n]of [[V,'render','detail'],[V.renderer,'render','three'],[V.ssao,'render','ao'],[V.engines,'update','engines'],[V.city,'update','city'],[V.engines.vegetation,'update','vegetation'],[A,'step','step'],[A.renderer,'render','whole'],[V.weather,'update','weather'],[V.stellar,'update','stars'],[V.settlements,'update','settlements'],[V.probe,'update','probe']])if(o[k])hook(o,k,n);
  for(let i=0;i<50;i++){A.step(1/60);A.render();await new Promise(requestAnimationFrame);}for(const key of Object.keys(timing))delete timing[key];
  for(let i=0;i<45;i++){A.step(1/60);A.render();await new Promise(requestAnimationFrame);}
  return {position:F.position,pose:F.renderPose(),vehicle:F.vehicle.state,port:W.site(b).center,timing,stats:V.stats,gpu:A.renderer.gpuMs,programs:V.renderer.info.programs.length};
 });console.log(JSON.stringify(report));await writeFile('artifacts/city-timing.json',JSON.stringify(report,null,2));
}finally{await browser.close();}
