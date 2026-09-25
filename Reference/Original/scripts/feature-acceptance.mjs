import { chromium } from 'playwright';
import { writeFile } from 'node:fs/promises';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';
import { createGameServer } from './serve.mjs';
import { launchOptions } from './feature-browser-config.mjs';

const mode=process.argv[2]||'normal',directory='build_logs/graphics-feature';
if(!['normal','missing','portable','fallback','compact','software'].includes(mode))throw Error('Unknown acceptance scenario');
const server=createGameServer();await new Promise(r=>server.listen(0,'127.0.0.1',r));
const base=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch(launchOptions(mode==='software'));
const page=await browser.newPage(mode==='compact'?{viewport:{width:390,height:844},deviceScaleFactor:2,hasTouch:true,isMobile:true}:mode==='software'?{viewport:{width:800,height:600}}:{viewport:{width:1280,height:720}});
const report={mode,errors:[],checks:[],requests:[]};
page.on('pageerror',error=>report.errors.push(error.message));
page.on('console',message=>{if(message.type()==='error')report.errors.push(message.text().slice(0,1400));});
page.on('requestfailed',request=>report.requests.push({url:request.url(),error:request.failure()?.errorText}));
const screenshot=name=>page.screenshot({path:`${directory}/accept-${mode}-${name}.png`});
const check=(name,condition)=>{assert.ok(condition,name);report.checks.push(name);console.log('PASS '+name);};
try{
  if(mode==='portable')await page.context().setOffline(true);
  if(mode==='missing')await page.route('**/assets/textures/geology-atlas.png',r=>r.abort());
  if(mode==='fallback')await page.addInitScript(()=>{const get=WebGL2RenderingContext.prototype.getExtension;WebGL2RenderingContext.prototype.getExtension=function(name){return name==='OES_texture_float_linear'?null:get.call(this,name);};});
  if(mode==='compact')await page.addInitScript(()=>{const get=WebGL2RenderingContext.prototype.getExtension;WebGL2RenderingContext.prototype.getExtension=function(name){return name==='EXT_disjoint_timer_query_webgl2'?null:get.call(this,name);};});
  const started=Date.now();
  await page.goto(mode==='portable'?pathToFileURL(resolve('Space_Patriot.html')).href:base,{timeout:120000});
  const progress=setInterval(async()=>{console.log(await page.evaluate(()=>document.getElementById('bootStage')?.textContent).catch(()=>''));},20000);
  try{await page.waitForFunction(()=>longwayBoot.state.error||longwayBoot.state.ready&&window.BloxVisuals,null,{timeout:210000});}finally{clearInterval(progress);}
  const bootError=await page.evaluate(()=>longwayBoot.state.error);if(bootError)throw Error(bootError);
  report.bootMs=Date.now()-started;
  report.visual=await page.evaluate(()=>({enabled:BloxVisuals.enabled,failures:BloxVisuals.assetFallbacks,hardware:longway.renderer.hardware}));
  check('detailed renderer is available',report.visual.enabled);
  if(mode==='missing')check('missing atlas has a local fallback',report.visual.failures.includes('geology'));
  await page.locator('#start').click();await page.evaluate(()=>{longway.pause();longway.combat.recover();});
  if(mode!=='normal'){
    if(mode==='compact'){
      await page.evaluate(()=>BloxPause.present('settings',true));await page.locator('#quality').selectOption('0');
      check('Auto population follows Fast quality on a small screen',await page.evaluate(()=>LongwayGraphics.population.detail===120));
      await page.locator('#controllerSettings').scrollIntoViewIfNeeded();await screenshot('controls');
      check('controller setup fits a touch viewport',await page.locator('#controllerSettings').evaluate(e=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth;}));
      await page.evaluate(()=>BloxPause.dismiss());
      check('mesh resolution adapts without GPU timer queries',await page.evaluate(()=>{const V=BloxVisuals;V.renderer.setPixelRatio(1);V.frame=60;V.lastResolutionChange=0;V.frameInterval=40;V.lastFrameTime=performance.now()-40;V.tuneResolution();return !V.gpuTimer&&V.renderer.getPixelRatio()<1;}));
    }
    if(mode==='software')check('software rendering starts with Fast detail and bounded population',await page.evaluate(()=>longway.renderer.software&&longway.renderer.quality===0&&LongwayGraphics.population.detail===120&&BloxVisuals.renderer.getPixelRatio()<=.65));
    if(mode==='fallback'){
      check('terrain uses the packed-noise capability fallback',await page.evaluate(()=>!longway.renderer.floatTerrainFiltering&&longway.renderer.pipeline==='mesh-and-terrain'));
      await page.evaluate(()=>{
        const A=longway,F=A.flight,W=A.world,C=LongwayCore,b=W.catalog.find(b=>b.name==='Venus'),n=C.Landscape.up;
        A.celestial.timeScale=0;A.combat.enemies=[];F.place(b,'orbit');
        F.position=C.add(b.center,C.mul(n,b.radius+W.height(b,n)+1.67));F.up=n;F.forward=C.unit(C.sub(C.Landscape.right,C.mul(n,.42)));F.orthogonalize();
        F.vehicle.position=F.position.slice();F.vehicle.forward=F.forward.slice();F.vehicle.up=F.up.slice();F.vehicle.state='flight';F.cameraMode='cockpit';F.velocity=[0,0,0];
      });
      await page.evaluate(async()=>{for(let i=0;i<240;i++){await new Promise(requestAnimationFrame);longway.step(1/60);longway.render();}});
      check('packed-noise planetary flight prepares its shared terrain cache',await page.evaluate(()=>BloxVisuals.terrainBody===longway.flight.nearest().body.id&&!!BloxVisuals.terrain?.userData.rayHeightCache&&!BloxVisuals.terrainJob));
      check('packed-noise surface rendering has no graphics errors',await page.evaluate(()=>longway.renderer.gl.getError()===0&&BloxVisuals.renderer.getContext().getError()===0));
    }
    await page.evaluate(async frames=>{for(let i=0;i<frames;i++){await new Promise(requestAnimationFrame);longway.step(1/60);longway.render();}},mode==='software'?8:30);
    await screenshot('ready');
    check('no uncaught JavaScript or shader errors',report.errors.every(e=>mode==='missing'&&e.includes('ERR_FAILED')));
  }else{
    await page.evaluate(()=>BloxPause.present('engineeringDialog',true));
    await page.locator('[data-preset="TRAVEL"]').click();
    check('engineering preset changes authoritative power',await page.evaluate(()=>longway.systems.allocations.engines>longway.systems.allocations.weapons));
    const old=await page.evaluate(()=>longway.systems.components.engines.enabled);
    await page.locator('[data-component="engines"]').click();
    check('engineering isolates a component',await page.evaluate(()=>longway.systems.components.engines.enabled)!==old);
    await page.locator('[data-component="engines"]').click();await page.locator('[data-preset="BALANCED"]').click();
    await screenshot('engineering');
    await page.evaluate(()=>{BloxPause.dismiss();longway.flight.cameraMode='cockpit';BloxArtwork.update();BloxMFD.select(2,'engineeringDialog');});
    async function clickMFD(label){
      const p=await page.evaluate(label=>{const {element,canvas}=BloxArtwork.screens[2];BloxMFD.draw(2,canvas);const h=BloxMFD.states[2].hits.find(h=>h.label===label);if(!h)throw Error('Missing display action '+label);const m=new DOMMatrix(getComputedStyle(element).transform),p=m.transformPoint(new DOMPoint(h.x+h.w*.5,h.y+h.h*.5)),r=element.parentElement.getBoundingClientRect();return {x:p.x/p.w+r.left,y:p.y/p.w+r.top};},label);
      await page.mouse.click(p.x,p.y);
    }
    await clickMFD('POWER ALLOCATION');
    check('projected cockpit display routes physical mouse clicks',await page.evaluate(()=>BloxMFD.states[2].engineeringMode==='power'));
    const allocation=await page.evaluate(()=>longway.systems.allocations.engines);
    await clickMFD('ENGINES '+allocation+' +');
    check('cockpit engineering changes power while paused',await page.evaluate(()=>longway.systems.allocations.engines)>allocation);
    await page.evaluate(()=>{longway.flight.drive.instruments=false;longway.systems.preset('BALANCED');BloxMFD.states[2].page=null;BloxArtwork.update();BloxPause.present('settings',true);});
    await page.locator('#worldPopulation').selectOption('lush');
    await page.locator('#controllerMappings summary').click();
    await page.locator('#controller-fire').selectOption('2');await page.locator('#controller-lookY').selectOption('1');await page.locator('#targetingPip').selectOption('lag');
    check('controller and graphical settings persist',await page.evaluate(()=>JSON.parse(localStorage.getItem('space-patriot-controller')).buttons.fire===2&&LongwayGraphics.population.detail===360&&localStorage.getItem('space-patriot-pip')==='lag'));
    await page.locator('#resetController').click();await page.locator('#worldPopulation').selectOption('balanced');await page.locator('#targetingPip').selectOption('lead');
    await page.locator('#controllerMappings summary').click();
    await page.locator('#controllerSettings').scrollIntoViewIfNeeded();await screenshot('controller');
    await page.evaluate(()=>{
      BloxPause.dismiss();document.getElementById('scene').focus();
      window.testPad={index:0,id:'Acceptance Xbox',mapping:'standard',connected:true,axes:[0,0,0,0],buttons:Array.from({length:16},()=>({pressed:false,value:0}))};
      Object.defineProperty(navigator,'getGamepads',{configurable:true,value:()=>testPad?[testPad]:[]});
      LongwayInput.poll(performance.now());
      testPad.axes[1]=-1;testPad.buttons[7]={pressed:true,value:1};LongwayInput.poll(performance.now());
    });
    check('controller runtime supplies thrust and fire',await page.evaluate(()=>LongwayInput.state.forward===1&&longway.combat.controllerTrigger));
    await page.evaluate(()=>{testPad.buttons[9]={pressed:true,value:1};LongwayInput.poll(performance.now());});
    check('controller opens terminal and clears gameplay',await page.evaluate(()=>BloxPause.isOpen()&&!longway.combat.controllerTrigger&&!LongwayInput.state.forward));
    await page.evaluate(()=>{testPad.buttons[9]={pressed:false,value:0};LongwayInput.poll(performance.now());testPad.buttons[9]={pressed:true,value:1};LongwayInput.poll(performance.now());});
    check('controller resumes with held-input protection',await page.evaluate(()=>!BloxPause.isOpen()&&!LongwayInput.state.forward));
    await page.evaluate(()=>{testPad.axes=[0,0,0,0];testPad.buttons.forEach(b=>{b.pressed=false;b.value=0;});LongwayInput.poll(performance.now());testPad.buttons[7]={pressed:true,value:1};LongwayInput.poll(performance.now());testPad=null;LongwayInput.poll(performance.now());});
    check('disconnect releases firing',await page.evaluate(()=>!longway.combat.controllerTrigger));
    await page.evaluate(()=>{
      const A=longway,F=A.flight,C=LongwayCore,B=A.combat;F.place(A.world.catalog.find(b=>b.name==='Earth'),'orbit');F.cameraMode='cockpit';F.drive.instruments=false;B.setArmed(true);B.selectWeapon('kinetic');
      const pose=F.renderPose();B.enemies=[{id:'hud-test',kind:'ship',name:'Raider / moving contact',hull:100,shield:0,radius:.014,position:C.add(B.origin(),C.add(C.mul(pose.forward,.45),C.mul(pose.right,.055))),velocity:C.mul(pose.right,.12),forward:pose.forward,up:pose.up,craftId:F.craft.id}];B.targetId='hud-test';A.render();BloxArtwork.update();BloxUI.frame(performance.now());
    });
    check('moving target produces a projected lead PIP',await page.evaluate(()=>LongwayTargeting.last?.reachable&&Number.isFinite(LongwayTargeting.last.pip.x)));
    const lead=await page.evaluate(()=>LongwayTargeting.last.pip.x);await screenshot('lead');
    await page.evaluate(()=>{LongwayTargeting.mode='lag';BloxUI.frame(performance.now());});
    check('lead and lag PIPs respond differently to target motion',Math.abs(await page.evaluate(()=>LongwayTargeting.last.pip.x)-lead)>10);
    await screenshot('lag');
    await page.evaluate(()=>{const B=longway.combat;B.selectWeapon('missile');B.lock=.65;BloxUI.frame(performance.now());});await screenshot('lock');
    await page.evaluate(()=>{
      const A=longway,B=A.combat;B.selectWeapon('kinetic');B.applyHit({entity:B.enemies[0]},'local',1000,A.flight.forward);A.render();B.time+=.4;A.render();BloxUI.frame(performance.now());
    });
    check('ship explosion reaches the bounded renderer',await page.evaluate(()=>BloxVisuals.explosions.events.length===1));await screenshot('explosion');
    check('explosion follows the moving world frame',await page.evaluate(()=>{longway.celestial.advance(longway.celestial.elapsed+1);return LongwayCore.length(LongwayCore.sub(BloxVisuals.explosions.events[0].position,longway.combat.effects.find(e=>e.kind==='explosion').b))<1e-6;}));
    await page.evaluate(()=>{longway.combat.time+=3;longway.combat.effects=[];longway.render();});
    check('explosion expires without retained visible particles',await page.evaluate(()=>BloxVisuals.explosions.events.length===0&&!BloxVisuals.explosions.points.visible));
    await page.evaluate(()=>{
      const A=longway,F=A.flight,C=LongwayCore,W=A.world,B=A.combat,b=W.catalog.find(b=>b.name==='Earth'),site=W.site(b);
      F.place(b,'surface');F.walking=true;F.vehicle.state='onfoot';F.cameraMode='cockpit';F.position=F.clearGround(W.fromLocal([.04,.002,.14],site));F.up=site.up.slice();F.forward=site.forward.slice();F.orthogonalize();
      const e={id:'fall-test',kind:'sentry',humanoid:true,name:'Security bot',hull:1,shield:0,radius:.0008,position:C.add(C.sub(F.position,C.mul(F.up,.00096)),C.mul(F.forward,.012)),up:F.up.slice(),forward:C.mul(F.forward,-1),velocity:[0,0,0]};
      B.enemies=[e];B.applyHit({entity:e},'local',100,F.right);A.render();B.time+=1;A.render();
    });
    check('bot model falls in fatal impact direction',await page.evaluate(()=>{const e=longway.combat.enemies[0],g=BloxVisuals.contactModels.get(e.id),up=g.up.clone().applyQuaternion(g.quaternion);return g.visible&&g.userData.animation==='death'&&LongwayCore.dot(up.toArray(),e.death.direction)>.99;}));
    await screenshot('bot-fall');
    await page.evaluate(()=>{longway.combat.time+=13;longway.render();});
    check('expired corpse releases its scene model',await page.evaluate(()=>!BloxVisuals.contactModels.has('fall-test')));
    await page.evaluate(()=>{const A=longway,F=A.flight,C=LongwayCore,W=A.world,b=F.nearest().body,s=W.site(b),p=W.fromLocal([2.7,0,2.7],s),n=C.unit(C.sub(p,b.center));F.position=C.add(b.center,C.mul(n,b.radius+W.height(b,n)+.00186));F.up=n;F.forward=s.forward.slice();F.orthogonalize();LongwayGraphics.setPopulation('lush');});
    await page.evaluate(async()=>{for(let i=0;i<90;i++){await new Promise(requestAnimationFrame);longway.step(1/60);longway.render();}});
    check('lush world population is bounded and present',await page.evaluate(()=>{const V=BloxVisuals,v=V.engines.vegetation;return V.surfaceDetail.count>0&&V.surfaceDetail.count<=360&&V.animalModels.size<=24&&v.stats.forestTrees>0&&v.stats.grassBlades>0;}));
    await screenshot('lush');
    await page.evaluate(()=>LongwayGraphics.setPopulation('sparse'));
    await page.evaluate(async()=>{for(let i=0;i<60;i++){await new Promise(requestAnimationFrame);longway.step(1/60);longway.render();}});
    check('sparse preset rebuilds within its lower population limits',await page.evaluate(()=>BloxVisuals.surfaceDetail.count<=120&&BloxVisuals.animalModels.size<=12));
    await page.evaluate(()=>{LongwayGraphics.setPopulation('balanced');longway.flight.place(longway.world.catalog.find(b=>b.name==='Mars'),'surface');});
    await page.evaluate(async()=>{for(let i=0;i<40;i++){await new Promise(requestAnimationFrame);longway.step(1/60);longway.render();}});
    check('world switch clears stale biome detail',await page.evaluate(()=>BloxVisuals.surfaceDetail.body===longway.flight.nearest().body.id&&BloxVisuals.engines.vegetation.stats.grassBlades===0));
    await screenshot('mars');
    check('no uncaught JavaScript or shader errors',report.errors.length===0);
    const beforeRestore=await page.evaluate(()=>{longway.setPaused(true);longway.resume();return longway.flight.position.slice();});
    await page.evaluate(()=>longway.renderer.gl.getExtension('WEBGL_lose_context').loseContext());
    await page.waitForFunction(()=>longway.renderer.lossCount>0,null,{timeout:10000});
    await page.waitForFunction(()=>longway.renderer.ready&&!longway.renderer.lost&&!longway.renderer.restoring&&document.getElementById('error').hidden,null,{timeout:120000});
    const restored=await page.evaluate(()=>{longway.pause();longway.render();return {position:longway.flight.position.slice(),ready:longway.renderer.ready,mesh:BloxVisuals.enabled};});
    check('graphics context recovery preserves ship position and detailed rendering',restored.ready&&restored.mesh&&restored.position.every((n,i)=>Math.abs(n-beforeRestore[i])<1e-6));
    await page.evaluate(()=>BloxVisuals.renderer.forceContextLoss());
    await page.waitForFunction(()=>BloxVisuals.contextLost,null,{timeout:10000});
    await page.evaluate(()=>BloxVisuals.renderer.forceContextRestore());
    await page.waitForFunction(()=>!BloxVisuals.contextLost,null,{timeout:30000});
    report.meshRecovery=await page.evaluate(()=>{const gl=BloxVisuals.renderer.getContext(),before=gl.getError();longway.render();return {before,environment:BloxVisuals.environment===BloxVisuals.scene.environment,glError:gl.getError(),queries:BloxVisuals.gpuQueries.length};});
    check('mesh context recovery rebuilds environment lighting and clears stale queries',report.meshRecovery.environment&&report.meshRecovery.before===0&&report.meshRecovery.glError===0);
    check('recovered contexts report no rendering errors',report.errors.length===0);
  }
}catch(error){report.failure=error.stack;report.state=await page.evaluate(()=>({boot:document.getElementById('bootStage')?.textContent,error:document.getElementById('errorText')?.textContent})).catch(()=>null);await screenshot('failure').catch(()=>{});console.error(report.failure,report.state);process.exitCode=1;}
finally{await writeFile(`${directory}/accept-${mode}.json`,JSON.stringify(report,null,2));await browser.close();await new Promise(r=>server.close(r));}
