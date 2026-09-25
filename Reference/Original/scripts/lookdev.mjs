import {chromium} from 'playwright';
import {writeFile,mkdir} from 'node:fs/promises';
await mkdir('artifacts/lookdev',{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=metal','--enable-webgl','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1600,height:1000}});const errors=[];page.on('pageerror',e=>errors.push(e.stack));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
try{
 await page.goto('http://localhost:4173/',{waitUntil:'domcontentloaded'});await page.waitForFunction(()=>window.longway&&window.BloxVisuals,null,{timeout:90000});
 await page.waitForTimeout(3500);
 console.log(await page.evaluate(()=>({enabled:BloxVisuals.enabled,stats:BloxVisuals.stats,error:BloxVisuals.error,boot:longwayBoot.state.ready})));
 await page.locator('#start').click();await page.evaluate(()=>document.exitPointerLock());await page.waitForTimeout(3000);
 await page.evaluate(()=>{longway.pause();longway.render();});await page.screenshot({path:'artifacts/lookdev/cockpit-06.png'});
 await page.evaluate(()=>{longway.flight.cameraMode='chase';longway.flight.viewYaw=-.7;longway.flight.viewPitch=.15;longway.render();});await page.screenshot({path:'artifacts/lookdev/exterior-06.png'});
 await page.evaluate(()=>{const A=longway,C=LongwayCore,F=A.flight;F.cameraMode='cockpit';F.place(F.nearest().body,'orbit');A.render();});await page.screenshot({path:'artifacts/lookdev/orbit-06.png'});
 console.log(JSON.stringify({errors,stats:await page.evaluate(()=>BloxVisuals.stats)}));await writeFile('artifacts/lookdev/report.json',JSON.stringify({errors},null,2));
}catch(e){console.log('LOOKDEV ERROR',e.message,errors,await page.evaluate(()=>({boot:longwayBoot?.state,error:document.getElementById('errorText')?.textContent})));throw e;}finally{await browser.close();}
