import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1600,height:1000}}),errors=[];
page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://localhost:4173/');
 await page.waitForFunction(()=>window.BloxVisuals?.enabled&&window.BloxArtwork?.ready()&&longwayBoot.state.ready,null,{timeout:90000});
 await page.locator('#introInterior').click();await page.evaluate(()=>document.exitPointerLock());
 await page.waitForTimeout(1800);
 await page.evaluate(()=>{longway.pause();longway.flight.viewYaw=Math.PI;longway.render();});
 await page.screenshot({path:'artifacts/lookdev/wayfarer-walk-in.png'});
 const ground=await page.evaluate(()=>{
  const A=longway,C=LongwayCore,F=A.flight,W=A.world,b=W.catalog.find(x=>x.type===1&&x.biome!==6);
  F.place(b,'surface');F.walking=true;F.vehicle.state='onfoot';F.vehicle.transition=null;F.velocity=[0,0,0];A.combat.armed=false;
  const n=C.Landscape.normal(b,C.Landscape.riverX(b,0)+.15,0),height=W.groundHeight(b,n);
  F.position=C.add(b.center,C.mul(n,b.radius+height+.0017));F.up=n;F.forward=C.unit(C.add(C.Landscape.forward,C.mul(C.Landscape.right,-.16)));F.orthogonalize();F.viewYaw=F.viewPitch=0;
  A.renderer.autoResolution=false;A.renderer.pixelBudget=900000;A.resize();A.render();BloxUI.update(performance.now());BloxUI.frame(performance.now());
  A.render();
  return {body:b.name,eyeAboveGroundMetres:1.7,gl:A.check().error,faunaCount:BloxVisuals.stats.animals,stars:A.renderer.gl.getUniform(A.renderer.program,A.renderer.loc.uStarVisibility)};
 });
 await page.waitForTimeout(200);await page.screenshot({path:'artifacts/lookdev/river-walking-height.png'});
 if(ground.gl!==0||errors.length)throw Error(JSON.stringify({ground,errors}));
 await writeFile('artifacts/frontier-capture-report.json',JSON.stringify({ground,errors},null,2));console.log(JSON.stringify({ground,errors}));
}finally{await browser.close();}
