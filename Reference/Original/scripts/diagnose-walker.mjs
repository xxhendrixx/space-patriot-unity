import {chromium} from 'playwright';
import {writeFile} from 'node:fs/promises';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
const page=await browser.newPage({viewport:{width:1280,height:800}});
try{
 await page.goto('http://localhost:4173/');await page.waitForFunction(()=>window.BloxVisuals?.enabled&&longwayBoot.state.ready,null,{timeout:90000});await page.locator('#start').click();
 const data=await page.evaluate(async()=>{
  const A=longway,F=A.flight,W=A.world,C=LongwayCore,B=A.combat;A.pause();B.enemies=[];const b=W.catalog.find(b=>b.name==='Earth');F.place(b,'surface');F.toggleWalk();for(let i=0;i<160;i++)F.update(1/60,{});const s=W.site(b);
  F.position=W.fromLocal([.7,.8,.7],s);const n=C.unit(C.sub(F.position,b.center));F.position=C.add(b.center,C.mul(n,b.radius+W.height(b,n)+.0019));F.velocity=[0,0,0];F.up=n;F.forward=s.forward.slice();F.orthogonalize();B.armed=true;B.selectWeapon('rifle');A.celestial.timeScale=1;
  const mutations=[],desc=Object.getOwnPropertyDescriptor(HTMLElement.prototype,'hidden'),im=document.getElementById('illustratedWeapon');Object.defineProperty(im,'hidden',{get(){return desc.get.call(this)},set(v){if(v!==desc.get.call(this))mutations.push({setter:v,stack:new Error().stack.split('\n').slice(1,5)});desc.set.call(this,v)}});const obs=new MutationObserver(ms=>{for(const m of ms)mutations.push({id:m.target.id,attr:m.attributeName,old:m.oldValue,value:m.target.getAttribute(m.attributeName)});});
  for(const id of ['weaponView','illustratedWeapon'])obs.observe(document.getElementById(id),{attributes:true,attributeOldValue:true,attributeFilter:['hidden','src']});
  const rows=[];for(let i=0;i<180;i++){F.update(1/60,i>90?{forward:1}:{});B.update(1/60);A.render();rows.push({i,height:W.contactDistance(F.position,b,true)*1000,grounded:F.grounded,vertical:C.dot(F.velocity,F.up)*1000,walking:F.walking,key:B.key,active:BloxArtwork.weaponActive,hidden:document.getElementById('weaponView').hidden,rect:document.getElementById('weaponView').getBoundingClientRect().toJSON()});await new Promise(requestAnimationFrame);}obs.disconnect();return {rows,mutations};
 });await writeFile('artifacts/walker-before.json',JSON.stringify(data,null,2));console.log(JSON.stringify({height:[Math.min(...data.rows.map(r=>r.height)),Math.max(...data.rows.map(r=>r.height))],mutations:data.mutations.filter(m=>m.setter!==undefined).slice(0,10),hidden:data.rows.filter(r=>r.hidden).length}));
 await page.screenshot({path:'artifacts/lookdev/walker-before.png'});
}finally{await browser.close();}
