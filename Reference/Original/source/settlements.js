/* Named, seeded settlements share the existing city, machinery and collision engines. */
(function initSettlements(){if(!window.longway)return addEventListener('longway-ready',initSettlements,{once:true});
 const A=longway,C=LongwayCore,W=A.world,F=A.flight,primary=W.site.bind(W),records=new Map();W.primarySite=primary;
 const earthNames=['New York','London','Tokyo','Singapore','Sydney','Cape Town','Cairo','Nairobi','Lagos','Accra','Paris','Berlin','Rome','Madrid','Lisbon','Athens','Istanbul','Mumbai','Delhi','Bangkok','Seoul','Shanghai','Beijing','Jakarta','Manila','Hanoi','Melbourne','Auckland','Honolulu','Vancouver','Toronto','Montreal','Chicago','Los Angeles','San Francisco','Mexico City','Bogotá','Lima','Santiago','Buenos Aires','São Paulo','Rio de Janeiro','Reykjavík','Helsinki','Stockholm','Oslo','Warsaw','Prague'];
 const newNames=['Alexandria','Kyoto','Havana','Dakar','Oslo','Perth','Lisbon','Accra','Jaipur','Valencia','Sapporo','Mombasa'];
 const unique=['Vesper','Asterfall','Kestrel Reach','Morrowgate','Solace','Emberwatch','Glasshaven','Greywater','Nacre','Cinderbank','Velorum','Farpoint','Halcyon','Tern Crossing','Juniper','Dawnmere','Sable Rock','Meridian Rest','Lumen','Orison Vale','Pelagic','Boreal','Ilex','Tamar'];
 const postNames=['Survey','Relay','Listening Post','Research Camp','Freight Depot','Waterworks','Observatory','Prospector Base','Ranger Station','Rescue Post','Weather Station','Hydroponics'];
 class Settlements{
  constructor(){this.records=records;F.planArrival=b=>this.arrival(b);this.selected=null;this.elapsed=0;for(const b of W.catalog)this.generate(b);for(const r of [...records.values()])if(r.kind==='city')this.stagingFor(r);W.site=b=>b.activeSettlement&&!b.activeSettlement.primary?this.frame(b.activeSettlement):primary(b);const old=F.update.bind(F);F.update=(dt,input)=>{this.update(dt);return old(dt,input);};this.update(0);}
  generate(b){const seed=b.seed,rand=WWCore.rng(seed^817331),base=primary(b);const names=b.name==='Earth'?earthNames:Array.from({length:8},(_,i)=>i<4?'New '+newNames[(b.index*3+i)%newNames.length]:unique[(b.index*7+i)%unique.length]+' '+['Haven','City','Crossing','Port'][i%4]);
   names.forEach((name,i)=>{const r={id:b.id+':city:'+i,bodyId:b.id,name:b.type===3?name+' Cloud City':name,cloudCity:b.type===3,kind:'city',primary:i===0,seed:C.hash(seed^i*83419),extent:.28};if(i===0){r.height=base.height;r.normal=C.bodyLocal(b,base.up);base.name=r.name;base.id=r.id;}else{const angle=i*2.399+rand()*.4,theta=i<5?(2+i*2)/b.radius:Math.acos(1-2*(i-3)/(names.length-2));r.normal=C.unit(C.add(C.mul(C.bodyLocal(b,base.up),Math.cos(theta)),C.add(C.mul(C.bodyLocal(b,base.right),Math.sin(theta)*Math.cos(angle)),C.mul(C.bodyLocal(b,base.forward),Math.sin(theta)*Math.sin(angle)))));r.height=this.height(b,r.normal,.23);}records.set(r.id,r);});
   for(let i=0;i<12;i++){const angle=i*2.399+.8,theta=(i<6?1.3+i*1.7:25+(i-6)*55)/b.radius,n=C.unit(C.add(C.mul(C.bodyLocal(b,base.up),Math.cos(theta)),C.add(C.mul(C.bodyLocal(b,base.right),Math.sin(theta)*Math.cos(angle)),C.mul(C.bodyLocal(b,base.forward),Math.sin(theta)*Math.sin(angle))))),name=(i%3===0?'New '+newNames[(b.index+i)%newNames.length]:unique[(b.index*11+i)%unique.length])+' '+postNames[i];const r={id:b.id+':outpost:'+i,bodyId:b.id,name,kind:'outpost',normal:n,height:this.height(b,n,.06),seed:C.hash(seed^i*19171^118),extent:.078};records.set(r.id,r);}
  }
  stagingFor(requested){const id=requested.id+':staging';if(records.has(id))return records.get(id);const body=W.byId(requested.bodyId),f=this.frame(requested),n=C.unit(C.add(C.mul(C.bodyLocal(body,f.up),body.radius),C.mul(C.bodyLocal(body,f.right),.85))),r={id,bodyId:body.id,name:requested.name+' Approach Camp',kind:'outpost',staging:true,parentCityId:requested.id,normal:n,height:this.height(body,n,.06),seed:C.hash(requested.seed^0x53414645),extent:.078};records.set(id,r);return r;}
  height(b,n,radius){const up=C.bodyWorld(b,n),right=C.unit(C.cross([0,1,0],up)),forward=C.unit(C.cross(right,up));let h=b.type===3?b.radius*b.atmosphere*.50:Math.max(W.rawHeight(b,up),b.sea);if(b.type!==3)for(let i=0;i<8;i++){const a=i*Math.PI/4,q=C.unit(C.add(up,C.add(C.mul(right,Math.cos(a)*radius/b.radius),C.mul(forward,Math.sin(a)*radius/b.radius))));h=Math.max(h,W.rawHeight(b,q));}return h+.018;}
  frame(r){const b=W.byId(r.bodyId);if(r.primary)return primary(b);const up=C.bodyWorld(b,r.normal),right=C.unit(C.cross(C.bodyWorld(b,[0,1,0]),up),[1,0,0]),forward=C.unit(C.cross(right,up));return{id:r.id,body:b,center:C.add(b.center,C.mul(up,b.radius+r.height)),up,right,forward,height:r.height,extent:r.extent,name:r.name,style:b.settlementStyle};}
  list(body=F.nearest().body){return [...records.values()].filter(r=>r.bodyId===body.id).map(r=>({...r,position:this.frame(r).center}));}
  contains(point,body,pad=0){
   // Thousands of foliage samples share the same planetary frame. Transform
   // settlement bounds once per orbit/rotation update, not once per blade.
   const c=body.center;let cache=this.boundsCache;
   if(!cache||cache.body!==body.id||cache.spin!==body.spin||cache.count!==records.size||cache.center.some((v,i)=>v!==c[i])){
    cache=this.boundsCache={body:body.id,spin:body.spin,count:records.size,center:c.slice(),rows:[...records.values()].filter(r=>r.bodyId===body.id).map(r=>({frame:this.frame(r),size:r.kind==='city'?.245:.065}))};
   }
   for(const {frame:f,size}of cache.rows){
    const x=point[0]-f.center[0],y=point[1]-f.center[1],z=point[2]-f.center[2],s=size+pad;
    if(x*x+y*y+z*z>2*s*s+.09)continue;
    if(Math.abs(x*f.right[0]+y*f.right[1]+z*f.right[2])<s&&Math.abs(x*f.forward[0]+y*f.forward[1]+z*f.forward[2])<s&&Math.abs(x*f.up[0]+y*f.up[1]+z*f.up[2])<.3)return true;
   }
   return false;
  }
  activate(r){const b=W.byId(r.bodyId);if(b.activeSettlement?.id===r.id)return;const old=b.activeSettlement;b.activeSettlement=r;if(A.society?.current?.body.id===b.id){A.society.current=null;if(['frontier','standby'].includes(A.combat.mission)){A.combat.enemies=[];A.combat.mission='standby';}}if(old&&window.BloxVisuals){const v=BloxVisuals.stage||BloxVisuals;v.terrainBody=null;v.plantBody=null;v.bodyId=null;}this.current=r;}
  select(id){const r=records.get(id);if(!r)return false;this.selected=r;F.message='DESTINATION · '+r.name;return true;}
  arrival(body){
   const requested=body.activeSettlement||this.list(body).find(r=>r.primary),society=A.society,war=society?.wars[body.id];
   if(!requested)return null;
   const hostile=requested.kind==='city'&&!!war&&((society.reputation[war.owner]??0)<0||war.status==='contested');
   let actual=requested;
   if(hostile){actual=this.stagingFor(requested);
    this.activate(actual);F.message='HOSTILE CITY · ARRIVAL AT '+actual.name.toUpperCase();
   }
   return {requested,actual,hostile};
  }
  route(id=this.selected?.id){const r=records.get(id);if(!r)return false;if(A.shipboard?.aboard){F.message='Ask your pilot to set the approach';return false;}const b=W.byId(r.bodyId);this.select(id);this.activate(r);F.bridgeWalk=false;F.walking=false;F.vehicle.state='flight';F.vehicle.transition=null;const route=F.transfer(b,false);if(!route)return false;route.settlementId=route.settlementId||r.id;F.message=route.staging?'HOSTILE CITY · APPROACH CAMP OUTSIDE '+r.name:'APPROACH · '+r.name;A.celestial.followRoute(route);return true;}
  update(dt){this.elapsed+=dt;const n=F.nearest(),list=this.list(n.body),locked=F.route?.settlementId?records.get(F.route.settlementId):null;if(locked){this.activate(locked);return;}const nearest=list.map(r=>({r,d:C.length(C.sub(r.position,F.position))})).sort((a,b)=>a.d-b.d)[0];if(nearest&&(nearest.d<4||!n.body.activeSettlement))this.activate(records.get(nearest.r.id));}
 }
 A.outposts=new Settlements();const nav=F.navigationBeacons?.bind(F);F.navigationBeacons=()=>[...(nav?.()||[]),...A.outposts.list()];
 const panel=document.createElement('section');panel.id='settlementDirectory';panel.hidden=true;panel.innerHTML='<h2>Settlements & outposts</h2><p>Select a marker to set a destination, then request an approach. Cities have nearby pads, walkable buildings, lifts, computers and residents.</p><select id="settlementWorld"></select><input id="settlementSearch" placeholder="Find a city or outpost" aria-label="Find a city or outpost"><div id="settlementList"></div><p id="settlementState"></p><button id="settlementApproach">Fly to selected settlement</button>';
 document.body.append(panel);const selector=panel.querySelector('select');for(const b of W.catalog){const o=document.createElement('option');o.value=b.id;o.textContent=b.name;selector.append(o);}selector.value=F.nearest().body.id;
 function draw(){const query=panel.querySelector('input').value.toLowerCase(),body=W.byId(selector.value);panel.querySelector('#settlementList').replaceChildren(...A.outposts.list(body).filter(r=>r.name.toLowerCase().includes(query)).map(r=>{const bt=document.createElement('button');bt.textContent=(r.kind==='city'?'▣ ':'◇ ')+r.name;bt.classList.toggle('selected',A.outposts.selected?.id===r.id);bt.onclick=()=>{A.outposts.select(r.id);draw();};return bt;}));panel.querySelector('#settlementState').textContent=A.outposts.selected?'Destination: '+A.outposts.selected.name:'Choose a destination';}
 selector.onchange=draw;panel.querySelector('input').oninput=draw;panel.querySelector('#settlementApproach').onclick=()=>{if(A.outposts.route()){BloxPause?.dismiss();A.start();}};draw();BloxUI.registerDialog('settlementDirectory');
 const style=document.createElement('style');style.textContent='#settlementList{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:16px 0;max-height:45vh;overflow:auto}#settlementList button{text-align:left;padding:10px;font:12px system-ui}#settlementList .selected{border-color:#e2b678;color:#e2b678}#settlementDirectory select,#settlementDirectory input{margin:8px;padding:8px}';document.head.append(style);
})();
