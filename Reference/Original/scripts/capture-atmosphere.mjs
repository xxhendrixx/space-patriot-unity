import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const label=process.argv[2]||'after',browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800}}),report={errors:[],samples:[]};
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text());});
try{
 await page.goto('http://localhost:4173/?signaling=local');await page.waitForFunction(()=>window.BloxVisuals?.enabled&&longwayBoot.state.ready,null,{timeout:90000});await page.locator('#start').click();
 for(const name of ['Earth','TOI-270 c'])for(const altitude of [30,12,9,4,.52]){
  const sample=await page.evaluate(({name,altitude})=>{const A=longway,F=A.flight,W=A.world,C=LongwayCore;A.pause();A.celestial.timeScale=0;const b=W.catalog.find(b=>b.name===name);F.place(b,'surface');const s=W.surveySite(b);F.position=C.add(s.center,C.mul(s.up,altitude));F.forward=C.unit(C.add(s.forward,C.mul(s.up,-.04)));F.up=s.up.slice();F.orthogonalize();F.vehicle.position=F.position.slice();F.vehicle.forward=F.forward.slice();F.vehicle.up=F.up.slice();F.vehicle.state='flight';F.vehicle.transition=null;F.walking=false;F.cameraMode='cockpit';F.drive.instruments=false;A.combat.enemies=[];A.render();return{name,altitude,type:b.type,air:b.atmosphere*b.radius,terrain:W.height(b,s.up),climate:C.PlanetClimate.profile(b),blend:BloxVisuals.surfaceBlend,fog:BloxVisuals.scene.fog?.density,starVisibility:A.renderer.starVisibility,gl:A.check().error};},{name,altitude});
  report.samples.push(sample);await page.screenshot({path:`artifacts/lookdev/atmosphere-${label}-${name.replaceAll(' ','-')}-${altitude}.png`});
 }
}finally{await writeFile(`artifacts/atmosphere-${label}.json`,JSON.stringify(report,null,2));await browser.close();}
