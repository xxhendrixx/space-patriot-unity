import {chromium} from 'playwright';
const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-gl=angle','--use-angle=metal','--ignore-gpu-blocklist']});
try{
 const p=await browser.newPage();await p.goto('http://localhost:4173/');await p.waitForFunction(()=>window.BloxVisuals?.enabled&&longwayBoot.state.ready);
 const rows=await p.evaluate(()=>{
  const A=longway,F=A.flight,W=A.world;A.pause();const out=[];
  for(const type of [0,1,2,3]){
   const b=W.catalog.find(x=>x.type===type);F.place(b,'surface');
   const start={state:F.vehicle.state,active:b.activeSettlement?.name,pos:W.toLocal(F.position,W.site(b))};
   const r=F.toSurvey(b),route=r&&{total:r.total,landAtEnd:r.landAtEnd,segments:r.segments.map(x=>[x.label,x.duration]),id:r.settlementId,active:b.activeSettlement?.name,target:W.toLocal(r.segments.at(-1).at(1),W.site(b)),support:!!F.supportAt(r.segments.at(-1).at(1),.3)};
   for(let i=0;i<1600&&(F.route||F.vehicle.transition);i++)F.update(.1,{});
   const end={state:F.vehicle.state,active:b.activeSettlement?.name,remaining:F.route?.total,elapsed:F.route?.elapsed,message:F.message,pos:W.toLocal(F.position,W.site(b)),alt:F.nearest().altitude};
   F.toggleWalk();for(let i=0;i<45;i++)F.update(.1,{});out.push({type,start,route,end,walking:F.walking});F.place(b,'surface');
  }return out;
 });console.log(JSON.stringify(rows,null,2));
}finally{await browser.close();}
