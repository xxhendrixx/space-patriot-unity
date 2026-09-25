import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
import {createGameServer} from './serve.mjs';
import {launchOptions} from './feature-browser-config.mjs';
const dir='build_logs/planet-flight',report={checks:[],errors:[]},server=createGameServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const browser=await chromium.launch(launchOptions()),page=await browser.newPage({viewport:{width:1440,height:900}});
page.on('pageerror',e=>report.errors.push(e.message));page.on('console',m=>{if(m.type()==='error')report.errors.push(m.text().slice(0,600));});
function check(name,ok){report.checks.push({name,ok:!!ok});if(!ok)throw Error(name);}
const frames=async n=>page.evaluate(async n=>{for(let i=0;i<n;i++){await new Promise(requestAnimationFrame);longway.step(1/60);longway.render();BloxUI.frame(performance.now());}},n);
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/index.html`);await page.waitForFunction(()=>window.longwayBoot?.state.ready&&window.BloxVisuals,null,{timeout:210000});await page.locator('#start').click();
 await page.evaluate(()=>{const A=longway;A.pause();A.flight.ship.credits=100000;A.combat.enemies=[];A.celestial.timeScale=0;A.celestial.advance(0);A.celestial.sun=()=>LongwayCore.unit(LongwayCore.add(LongwayCore.Landscape.up,LongwayCore.mul(LongwayCore.Landscape.right,.7)));});
 const place=async(name,alt)=>page.evaluate(({name,alt})=>{const A=longway,F=A.flight,W=A.world,C=LongwayCore,b=W.catalog.find(b=>b.name===name),s={center:C.add(b.center,C.mul(C.Landscape.up,b.radius)),up:C.Landscape.up,right:C.Landscape.right,forward:C.Landscape.forward},p=W.fromLocal([5,0,3],s),n=C.unit(C.sub(p,b.center));F.place(b,'orbit');F.position=C.add(b.center,C.mul(n,b.radius+W.height(b,n)+alt));F.up=n;F.forward=C.unit(C.sub(s.right,C.mul(n,.42)));F.orthogonalize();F.vehicle.position=F.position.slice();F.vehicle.forward=F.forward.slice();F.vehicle.up=F.up.slice();F.vehicle.state='flight';F.cameraMode='cockpit';F.viewYaw=F.viewPitch=0;F.velocity=[0,0,0];}, {name,alt});
 await place('Venus',1.67);await frames(180);
 check('dry Venus has no water patch or generic haze splats',await page.evaluate(()=>!longway.flight.nearest().body.liquid&&!BloxVisuals.terrain.userData.water&&!BloxVisuals.engines.vegetation.layers.some(l=>l.mesh.name.includes('haze'))));
 check('terrain finished without a synchronous sampling build',await page.evaluate(()=>!!BloxVisuals.terrain&&!BloxVisuals.terrainJob));
 report.terrain=await page.evaluate(()=>{const V=BloxVisuals,m=V.terrain.children[0].material,c=m.map.image,q=c.getContext('2d');return{color:m.color.toArray(),avgSample:[...q.getImageData(200,200,1,1).data],type:m.type,fog:V.surfaceFog.color.toArray(),body:V.terrainBody,quality:longway.renderer.quality,programs:V.renderer.info.programs.length,compileError:V.terrainCompileError};});
 for(const kind of ['strider','wayfarer','meridian']){
  await page.evaluate(kind=>{const F=longway.flight,C=LongwayCore,craft=C.CRAFTS.find(c=>kind==='meridian'?c.dimensions[0]>180:kind==='wayfarer'?c.dimensions[0]>60&&c.dimensions[0]<=180:c.dimensions[0]<=60);F.vehicle.state='landed';if(!F.selectCraft(craft.id))throw Error('Craft selection failed: '+F.message);F.vehicle.state='flight';F.viewYaw=F.viewPitch=0;F.cameraMode='cockpit';BloxArtwork.update();longway.render();},kind);
  await frames(12);report[kind]=await page.evaluate(()=>({craft:longway.flight.craft.id,length:longway.flight.craft.dimensions[0],mask:BloxArtwork.mask.kind,active:BloxArtwork.active,message:longway.flight.message,ready:BloxArtwork.ready()}));check(kind+' retains artwork and all three live screens',await page.evaluate(kind=>BloxArtwork.active&&BloxArtwork.mask.kind===kind&&BloxArtwork.screens.every(s=>s.canvas.width===640&&s.element.getBoundingClientRect().bottom<=innerHeight),kind));
  await page.evaluate(()=>BloxMFD.select(2,'engineeringDialog'));
  const hit=await page.evaluate(()=>{const s=BloxArtwork.screens[2];BloxMFD.draw(2,s.canvas);const hit=BloxMFD.states[2].hits.find(h=>h.label==='POWER ALLOCATION');const p=new DOMMatrix(getComputedStyle(s.element).transform).transformPoint(new DOMPoint(hit.x+hit.w/2,hit.y+hit.h/2));return{x:p.x/p.w,y:p.y/p.w};});
  await page.mouse.click(hit.x,hit.y);check(kind+' projected glass responds to physical clicks',await page.evaluate(()=>BloxMFD.states[2].engineeringMode==='power'));
  await page.evaluate(()=>{BloxMFD.states[2].engineeringMode='overview';BloxMFD.states[2].page=null;BloxArtwork.update();longway.render();});
  await page.screenshot({path:`${dir}/cockpit-${kind}.png`});
 }
 await page.emulateMedia({reducedMotion:'reduce'});await page.evaluate(()=>{longway.flight.drive.stick=[1,1,1];BloxArtwork.update();});
 check('reduced motion keeps the cockpit fixed',await page.evaluate(()=>Math.abs(BloxArtwork.deckPose.x+innerWidth*.009)<1e-5&&Math.abs(BloxArtwork.deckPose.y+innerHeight*.009)<1e-5));
 await page.emulateMedia({reducedMotion:'no-preference'});
 check('opaque cockpit writes depth only and excludes AO',await page.evaluate(()=>BloxVisuals.cockpitOcclusion.mesh.visible&&!BloxVisuals.cockpitOcclusion.material.colorWrite&&BloxVisuals.cockpitOcclusion.material.depthWrite&&BloxVisuals.cockpitOcclusion.mesh.userData.skipAO));
 await place('Earth',.05);await frames(240);
 report.culling=await page.evaluate(()=>{const V=BloxVisuals,veg=V.engines.vegetation;return{batches:veg.forest.meshes.length,allCulled:veg.forest.meshes.every(m=>m.frustumCulled&&m.boundingSphere&&m.userData.cameraCulling),splats:veg.layers.map(l=>({total:l.points.length,visible:l.geometry.instanceCount,frustum:l.mesh.frustumCulled})),slice:V.terrainSliceMs};});
 check('forest uses bounded camera-cullable spatial batches',report.culling.batches>0&&report.culling.allCulled);
 check('splat drawing excludes invisible instances',report.culling.splats.length>0&&report.culling.splats.every(l=>l.frustum&&l.visible<l.total));
 await page.screenshot({path:`${dir}/earth-detail.png`});
 await page.evaluate(()=>{const F=longway.flight;F.position=LongwayCore.add(F.position,LongwayCore.mul(F.right,2));F.vehicle.position=F.position.slice();longway.render();});
 check('old terrain stays visible while a replacement is prepared',await page.evaluate(()=>!!BloxVisuals.terrainJob&&BloxVisuals.terrain.visible));
 await place('Mars',.4);await frames(200);
 check('switching bodies cancels pending terrain and publishes the correct patch',await page.evaluate(()=>BloxVisuals.terrainBody===longway.flight.nearest().body.id&&!BloxVisuals.terrainJob));
 check('ray and mesh contexts have no GL errors',await page.evaluate(()=>longway.renderer.gl.getError()===0&&BloxVisuals.renderer.getContext().getError()===0));
 check('no JavaScript or shader errors',!report.errors.length);
}catch(e){report.failure=e.stack;process.exitCode=1;console.error(e);await page.screenshot({path:`${dir}/accept-failure.png`}).catch(()=>{});}finally{console.log(JSON.stringify(report));await writeFile(`${dir}/acceptance.json`,JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
