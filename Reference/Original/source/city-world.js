/* Space Patriot city adapter. One ArchitectureWorks document supplies rendering,
   room volumes, floors and shot colliders. Local coordinates are metres, +Y up. */
(function(root){
 const C=root.LongwayCore,A=root.ArchitectureCore,P=root.PathworksCore,M=root.MachineworksCore;
 const cache=new Map(),H=3.8,BASE=1.06,EYE=1.68;
 const box=(id,kind,center,size,rotationY=0)=>({id,kind,center,size,rotationY});
 const props=[box('skybridge','wall',[0,24,88],[220,6,15]),box('bridge-left','wall',[-102,12,88],[5,24,12]),box('bridge-right','wall',[102,12,88],[5,24,12])];
 function blueprint(seed,index){
  const d=A.preset('empty');d.spaceCity=true;d.name=['Civic exchange','Habitat tower','Research annex','Logistics hub'][index%4];
  Object.assign(d.settings,{height:H,foundation:BASE,slab:.18,thickness:.22,roof:'flat',facade:'plaster',porch:false,overhang:.12,wallColor:'#b7c3bd',trim:'#39484b',roofColor:'#45565c'});
  d.stair={x:-1.7,z:8.1,w:3.4,d:3.8};d.levels=[];
  const levels=3+(C.hash(seed^index)%4);
  for(let k=0;k<levels;k++){
   const kind=(k+index)%4,uses=[['living','study','bathroom','storage'],['bedroom','bedroom','living','kitchen'],['study','bathroom','study','storage'],['storage','study','kitchen','storage']][kind];
   const names=[['LOUNGE','OPERATIONS','MEDICAL','SUPPLIES'],['HABITAT A','HABITAT B','COMMON ROOM','GALLEY'],['LABORATORY','MEDICAL','SURVEY CONTROL','ARCHIVE'],['CARGO','DISPATCH','CREW MESS','WORKSHOP']][kind];
   const l={id:`b${index}-floor${k}`,name:['CONCOURSE','HABITATS','RESEARCH','LOGISTICS'][kind],rooms:[],openings:[],furniture:[]};
   for(const [i,r]of [[-3,-12,6,20],[-3,8,6,4],[-13,-12,10,10],[-13,-2,10,14],[3,-12,10,10],[3,-2,10,14]].entries())l.rooms.push({id:`b${index}-f${k}-r${i}`,name:i<2?(i?'LIFT LOBBY':'CENTRAL PASSAGE'):names[i-2],use:i<2?'hall':uses[i-2],x:r[0],z:r[1],w:r[2],d:r[3],finish:['tile','oak','concrete','walnut'][(i+k+index)%4]});
   const door=(axis,fixed,center,width=1.9)=>l.openings.push({id:`b${index}-f${k}-d${l.openings.length}`,axis,fixed,center,width,height:2.8,sill:0,kind:'door',open:true});
   door('x',-12,0,3);door('x',8,0,2.8);for(const x of [-3,3])for(const z of [-7,4])door('z',x,z);
   for(const x of [-13,13])for(const z of [-7,4])l.openings.push({id:`b${index}-f${k}-win${l.openings.length}`,axis:'z',fixed:x,center:z,width:4,height:1.45,sill:1,kind:'window',open:false});
   A.autoFurnish(d,l);l.furniture=l.furniture.filter(f=>Math.abs(f.x)>3.5);
   l.furniture.forEach((f,j)=>f.id=`b${index}-f${k}-furn${j}`);d.levels.push(l);
  }
  return A.validate(d);
 }
 function build(body){
  const buildings=[],outpost=body.activeSettlement?.kind==='outpost',placeSeed=body.activeSettlement?.seed||body.seed;let i=0;
  for(const z of (outpost?[0]:[-54,-22,10,42]))for(const x of (outpost?[-28,28]:[-72,-40,40,72])){
   const doc=blueprint(placeSeed,i);if(outpost)doc.levels=doc.levels.slice(0,2);const colliders=A.colliders(doc).filter(c=>c.kind!=='stairRamp'&&!(c.kind==='door'&&c.open));
   for(let k=0;k<doc.levels.length;k++){
    for(const o of doc.levels[k].openings.filter(o=>o.kind==='window'))colliders.push(box(o.id,'glass',[o.fixed,BASE+k*H+o.sill+o.height/2,o.center],[.06,o.height,o.width]));
    // Guard the shaft on three sides; the front has interlocked landing doors.
    for(const side of [-1,1])colliders.push(box(`shaft-${k}-${side}`,'wall',[side*1.85,BASE+k*H+H/2,10],[.3,H,4]));
    colliders.push(box(`shaft-back-${k}`,'wall',[0,BASE+k*H+H/2,11.98],[3.6,H,.18]));
   }
   colliders.push(box('roof','ceiling',[0,BASE+doc.levels.length*H,0],[26,.2,24]));
   const b={id:`city-${body.activeSettlement?.id||body.id}-${i}`,index:i++,x,z,doc,colliders,levels:doc.levels.length,height:doc.levels.length*H,seed:C.hash(body.seed^i)};buildings.push(b);
  }
  const d=P.newDocument();d.name=body.name+' pedestrian network';d.terrain={kind:'flat',size:500,seed:body.seed,relief:0};
  const pt=(id,x,z,junction)=>({id,x,y:BASE,z,width:1,junction});
  for(const [j,z]of (outpost?[-18]:[-70,-38,-6,26]).entries())d.paths.push(P.newPath('cobble',{id:'cross-'+j,name:'Concourse '+(j+1),curve:'linear',lift:0,elevation:'absolute',color:'#8b9690',width:5,points:[pt('cross-'+j+'a',outpost?-52:-94,z),pt('cross-'+j+'b',0,z,'hub'+j),pt('cross-'+j+'c',outpost?52:94,z)]}));
  if(!outpost)d.paths.push(P.newPath('asphalt',{id:'avenue',name:'Transit avenue',curve:'linear',lift:0,elevation:'absolute',width:12,points:[pt('ave0',0,-70,'hub0'),pt('ave1',0,-38,'hub1'),pt('ave2',0,-6,'hub2'),pt('ave3',0,26,'hub3')]}));
  return {body,placeId:body.activeSettlement?.id||body.id,outpost,buildings,paths:new P.PathworksEngine({},d),machines:new Map(),elevators:new Map()};
 }
 function forBody(body){const key=body.activeSettlement?.id||body.id;if(!cache.has(key)){cache.set(key,build(body));if(cache.size>4){const first=cache.keys().next().value;cache.get(first).paths.dispose();cache.delete(first);}}return cache.get(key);}
 function local(world,body,p){const q=world.toLocal(p,world.site(body));return[q[0]*1000,q[1]*1000,-q[2]*1000];}
 function worldPoint(world,body,p){const f=world.site(body);return C.add(f.center,C.add(C.mul(f.right,p[0]/1000),C.add(C.mul(f.up,p[1]/1000),C.mul(f.forward,-p[2]/1000))));}
 function at(city,p,pad=0){return city.buildings.find(b=>Math.abs(p[0]-b.x)<13+pad&&Math.abs(p[2]-b.z)<12+pad&&p[1]>-.2&&p[1]<BASE+b.height+3);}
 function machinery(city,b){
  if(city.machines.has(b.id))return city.machines.get(b.id);
  const sim=new M.MachineSimulation();
  const defs=[['reactor',[-8,BASE,6]],['battery',[-10,BASE,3]],['fan',[-11,BASE,9]],['terminal',[7,BASE,-10]],['conveyor',[8,BASE,6]],['pump',[10,BASE,2]],['lift',[0,BASE,10]]];
  for(const [type,position] of defs)sim.add(type,{id:type,position,scale:type==='reactor'?.68:type==='fan'?.6:type==='lift'?1:.7,params:{command:type!=='lift',speed:.7}});
  for(const [type]of defs.slice(1))sim.connect('reactor',type);sim.update(.1);
  city.machines.set(b.id,sim);city.elevators.set(b.id,{y:BASE,from:0,target:0,floor:0,phase:'open',door:1,timer:0,requests:[]});return sim;
 }
 function boxes(city,b){
  const list=b.colliders;const lift=city.elevators.get(b.id),y=lift?.y??BASE,doors=[];
  for(let k=0;k<b.levels;k++)if(!lift||lift.phase!=='open'||lift.floor!==k)doors.push(box('landing-'+k,'lift-door',[0,BASE+k*H+1.4,8.02],[2.8,2.8,.12]));
  const cabin=[box('lift-floor','floor',[0,y-.1,10],[3.35,.2,3.8]),box('lift-ceiling','ceiling',[0,y+3.0,10],[3.35,.14,3.8])];
  const sim=city.machines.get(b.id);
  const equipment=sim?sim.getColliders().filter(n=>n.id!=='lift').map(n=>box('machine-'+n.id,'machine',[n.position[0],n.position[1]+n.size[1]/2,n.position[2]],n.size,n.rotation)):[];
  return list.concat(doors,cabin,equipment);
 }
 function toBox(p,c){const x=p[0]-c.center[0],z=p[2]-c.center[2],a=c.rotationY||0,co=Math.cos(a),s=Math.sin(a);return [x*co-z*s,p[1]-c.center[1],x*s+z*co];}
 function distance(p,c){if(c.shape==='cylinder'){const q=toBox(p,c),a=Math.hypot(q[0],q[2])-c.size[0]/2,b=Math.abs(q[1])-c.size[1]/2;return Math.hypot(Math.max(a,0),Math.max(b,0))+Math.min(Math.max(a,b),0);}const q=toBox(p,c).map((v,i)=>Math.abs(v)-c.size[i]*.5);return Math.hypot(...q.map(v=>Math.max(0,v)))+Math.min(0,Math.max(...q));}
 function segment(a,z,c){if(c.shape==='cylinder'){const p=toBox(a,c),q=toBox(z,c),d=q.map((v,i)=>v-p[i]),r=c.size[0]/2,h=c.size[1]/2,A=d[0]*d[0]+d[2]*d[2],B=2*(p[0]*d[0]+p[2]*d[2]),D=B*B-4*A*(p[0]*p[0]+p[2]*p[2]-r*r),hits=[];if(distance(a,c)<=0)return {t:0,normal:[0,1,0],collider:c};if(A>1e-9&&D>=0)for(const t of [(-B-Math.sqrt(D))/(2*A),(-B+Math.sqrt(D))/(2*A)])if(t>=0&&t<=1&&Math.abs(p[1]+d[1]*t)<=h)hits.push({t,normal:[(p[0]+d[0]*t)/r,0,(p[2]+d[2]*t)/r],collider:c});if(Math.abs(d[1])>1e-9)for(const y of [-h,h]){const t=(y-p[1])/d[1];if(t>=0&&t<=1&&Math.hypot(p[0]+d[0]*t,p[2]+d[2]*t)<=r)hits.push({t,normal:[0,Math.sign(y),0],collider:c});}return hits.sort((a,b)=>a.t-b.t)[0]||null;}const p=toBox(a,c),q=toBox(z,c),d=q.map((v,i)=>v-p[i]);let lo=0,hi=1,axis=1,sign=1;
  for(let i=0;i<3;i++){const h=c.size[i]/2;if(Math.abs(d[i])<1e-10){if(Math.abs(p[i])>h)return null;}else{let t1=(-h-p[i])/d[i],t2=(h-p[i])/d[i],sg=-1;if(t1>t2){[t1,t2]=[t2,t1];sg=1;}if(t1>lo){lo=t1;axis=i;sign=sg;}hi=Math.min(hi,t2);if(lo>hi)return null;}}
  if(hi<0||lo>1)return null;const n=[0,0,0];n[axis]=sign;const co=Math.cos(c.rotationY||0),s=Math.sin(c.rotationY||0);return {t:Math.max(0,lo),normal:[n[0]*co+n[2]*s,n[1],-n[0]*s+n[2]*co],collider:c};
 }
 function trace(world,body,a,z){const city=forBody(body),aa=local(world,body,a),zz=local(world,body,z);let best=null;for(const c of (city.outpost?[]:props)){const hit=segment(aa,zz,c);if(hit&&(!best||hit.t<best.t))best={...hit,city};}
  for(const b of city.buildings){if(!segment(aa,zz,box('bounds','bounds',[b.x,BASE+b.height/2,b.z],[27,b.height+2,25])))continue;machinery(city,b);const p=[aa[0]-b.x,aa[1],aa[2]-b.z],q=[zz[0]-b.x,zz[1],zz[2]-b.z];for(const c of boxes(city,b)){const hit=segment(p,q,c);if(hit&&(!best||hit.t<best.t))best={...hit,building:b,city};}}
  if(best){const s=world.site(body),n=best.normal;best.normal=C.add(C.mul(s.right,n[0]),C.add(C.mul(s.up,n[1]),C.mul(s.forward,-n[2])));}return best;
 }
 const hangarOffset=[-165,0],hangarWalls=[box('hangar-left','wall',[-73,17,0],[4,36,248]),box('hangar-right-a','wall',[73,17,-87],[4,36,74]),box('hangar-right-b','wall',[73,17,43],[4,36,162]),box('hangar-door-head','wall',[73,19.5,-44],[4,31,12]),box('hangar-back','wall',[0,17,123],[148,36,4])];
 C.CityWorld={hangarOffset,hangarWalls,forBody,blueprint,local,worldPoint,at,machinery,boxes,distance,segment,trace,H,BASE,EYE,cache,props};
 // Replace old solid building blocks in the authoritative city field as well.
 C.Universe.prototype.cityField=function(q,body){const p=[q[0]*1000,q[1]*1000,-q[2]*1000],city=forBody(body);let d=distance(p,box('port','floor',[0,-7,0],[city.outpost?120:480,16,city.outpost?120:480]));for(const c of (city.outpost?[]:props))d=Math.min(d,distance(p,c));
  for(const b of city.buildings){const broad=distance(p,box('bounds','bounds',[b.x,BASE+b.height/2,b.z],[27,b.height+2,25]));if(broad>d||broad>10)continue;const v=[p[0]-b.x,p[1],p[2]-b.z];for(const c of boxes(city,b))d=Math.min(d,distance(v,c));}return d/1000;};
 class CitySystems{
  constructor(world,flight,combat){this.world=world;this.flight=flight;this.combat=combat;this.elapsed=0;this.current=null;this.vertical=0;this.prompt='';const update=flight.update.bind(flight);
   flight.update=(dt,input={})=>{this.update(Math.min(dt,.1));if(flight.walking&&!flight.bridgeWalk&&!flight.route&&!flight.vehicle.transition){const n=flight.nearest();if(n.altitude<.15){const city=forBody(n.body),p=local(world,n.body,flight.position),building=at(city,p,2);if(building){this.walk(dt,input,city,building,p);flight.systems.update(Math.min(dt,.1));return;}}}this.current=null;update(dt,input);};
  }
  update(dt){this.elapsed+=dt;for(const city of cache.values())for(const [id,sim]of city.machines){sim.update(dt);const b=city.buildings.find(b=>b.id===id),e=city.elevators.get(id),f=this.flight,p=local(this.world,city.body,f.position),riding=f.walking&&!f.bridgeWalk&&Math.abs(p[0]-b.x)<1.4&&p[2]-b.z>8.12&&p[2]-b.z<11.75&&Math.abs(p[1]-e.y-EYE)<.5;
    const before=e.y;e.timer+=dt;
    if(this.net?.role==='guest'&&this.net.enabled)continue;
    if(e.phase==='closing'){e.door=Math.max(0,e.door-dt*1.2);if(e.door===0){e.phase='moving';e.timer=0;sim.get('lift').params.command=true;}}
    else if(e.phase==='moving'){const power=sim.get('lift').state.power,speed=2.6*power;e.y+=C.clamp(BASE+e.target*H-e.y,-speed*dt,speed*dt);if(Math.abs(e.y-BASE-e.target*H)<.002){e.floor=e.target;e.phase='opening';sim.get('lift').params.command=false;e.timer=0;}}
    else if(e.phase==='opening'){e.door=Math.min(1,e.door+dt*1.2);if(e.door===1){e.phase='open';e.timer=0;}}
    if(riding&&e.y!==before){p[1]+=e.y-before;f.position=worldPoint(this.world,city.body,p);f.velocity=[0,0,0];}
   }}
  requestFloor(b,floor){if(!this.current||this.current.building!==b)return false;const city=this.current.city,e=city.elevators.get(b.id);if(e.phase!=='open')return false;floor=C.clamp(Math.round(floor),0,b.levels-1);if(this.net?.role==='guest'&&this.net.enabled){this.net.send({type:'lift',bodyId:city.body.id,buildingId:b.id,floor});return true;}if(floor===e.floor)return true;e.target=floor;e.from=e.floor;e.phase='closing';e.timer=0;return true;}
  walk(dt,input,city,b,p){const f=this.flight,sim=machinery(city,b),e=city.elevators.get(b.id),site=this.world.site(city.body);this.current={city,building:b};
   const speed=(input.boost?5.6:3.2)*Math.min(dt,.1),front=C.unit(C.sub(f.forward,C.mul(site.up,C.dot(f.forward,site.up)))),right=C.unit(C.cross(front,site.up)),motion=C.add(C.mul(front,input.forward||0),C.mul(right,input.strafe||0)),dx=C.dot(motion,site.right)*speed,dz=-C.dot(motion,site.forward)*speed;
   const cs=boxes(city,b),radius=.25,foot=p[1]-EYE;
   const blocked=(x,z)=>cs.some(c=>{if(c.kind==='floor'||c.kind==='ceiling')return false;for(const y of [foot+.3,foot+.85,foot+1.4])if(distance([x-b.x,y,z-b.z],c)<radius)return true;return false;});
   const steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.1));for(let i=0;i<steps;i++){if(!blocked(p[0]+dx/steps,p[2]))p[0]+=dx/steps;if(!blocked(p[0],p[2]+dz/steps))p[2]+=dz/steps;}
   const floors=cs.filter(c=>c.kind==='floor'),lx=p[0]-b.x,lz=p[2]-b.z;let support=1.02;
   for(const c of floors){const q=toBox([lx,p[1],lz],c),top=c.center[1]+c.size[1]/2;if(Math.abs(q[0])<c.size[0]/2+radius*.6&&Math.abs(q[2])<c.size[2]/2+radius*.6&&top<=foot+.24)support=Math.max(support,top);}
   if(input.lift>0&&!f.jumpHeld&&f.grounded)this.vertical=4.5;f.jumpHeld=input.lift>0;this.vertical-=9.81*Math.min(dt,.1);p[1]+=this.vertical*Math.min(dt,.1);
   if(p[1]<support+EYE){p[1]=support+EYE;this.vertical=0;f.grounded=true;}else f.grounded=false;
   // Ceiling sweep prevents jumping through slabs above the cabin and rooms.
   const cap=cs.filter(c=>c.kind==='floor'||c.kind==='ceiling').find(c=>{const q=toBox([lx,p[1]+.12,lz],c);return Math.abs(q[0])<c.size[0]/2&&Math.abs(q[2])<c.size[2]/2&&Math.abs(q[1])<c.size[1]/2+.12&&c.center[1]>support+.5;});
   if(cap){p[1]=cap.center[1]-cap.size[1]/2-.25;this.vertical=Math.min(0,this.vertical);}
   f.position=worldPoint(this.world,city.body,p);f.up=site.up.slice();f.orthogonalize();f.velocity=[0,0,0];f.mode=b.doc.name.toUpperCase();f.speed=Math.hypot(dx,dz)/Math.max(dt,.001)/1000;
   const level=C.clamp(Math.floor((p[1]-EYE-BASE+.2)/H),0,b.levels-1),room=A.roomAt(b.doc,lx,lz,level);this.room=room?.name||'CONCOURSE';this.floor=level;this.inLift=Math.abs(lx)<1.4&&lz>8.13;
   this.nearLift=Math.abs(lx)<2.8&&lz>5.5&&lz<12.5;this.prompt=this.nearLift?(this.inLift?'Z · LIFT DESTINATION':'Z · CALL LIFT'):'';
   this.nearMachine=level===0?[...sim.nodes.values()].filter(n=>n.id!=='lift').map(n=>({node:n,d:Math.hypot(lx-n.position[0],lz-n.position[2])})).filter(v=>v.d<3.2).sort((a,b)=>a.d-b.d)[0]?.node:null;
   if(!this.nearLift&&this.nearMachine)this.prompt='Z · '+(this.nearMachine.type==='terminal'?'USE CITY COMPUTER':'OPERATE '+this.nearMachine.type.toUpperCase());
   if(this.prompt)this.flight.message=this.prompt;sim.setProbe([lx,p[1]-EYE,lz]);
  }
  snapshot(){const out=[];for(const city of cache.values())for(const [id,e]of city.elevators){const sim=city.machines.get(id);out.push({bodyId:city.body.id,placeId:city.placeId,id,lift:{y:e.y,floor:e.floor,target:e.target,phase:e.phase,door:e.door},machines:[...sim.nodes.values()].map(n=>({id:n.id,health:n.state.health,charge:n.state.charge,command:n.params.command}))});}return out.slice(-64);}
  acceptSnapshot(rows){if(!Array.isArray(rows)||rows.length>64)return;for(const row of rows){const body=this.world.byId(row?.bodyId);if(!body||row.placeId&&row.placeId!==(body.activeSettlement?.id||body.id))continue;const city=forBody(body),b=city.buildings.find(x=>x.id===row.id),v=row.lift;if(!b||!v||![v.y,v.floor,v.target,v.door].every(Number.isFinite)||v.y<BASE||v.y>BASE+(b.levels-1)*H+.01||!Number.isInteger(v.floor)||!Number.isInteger(v.target)||v.floor<0||v.floor>=b.levels||v.target<0||v.target>=b.levels||v.door<0||v.door>1||!['open','closing','moving','opening'].includes(v.phase))continue;
   const sim=machinery(city,b),e=city.elevators.get(b.id),f=this.flight,p=local(this.world,body,f.position),riding=f.walking&&!f.bridgeWalk&&Math.abs(p[0]-b.x)<1.4&&p[2]-b.z>8.12&&p[2]-b.z<11.75&&Math.abs(p[1]-e.y-EYE)<.6;
   if(riding){p[1]+=v.y-e.y;f.position=worldPoint(this.world,body,p);}Object.assign(e,v);
   if(Array.isArray(row.machines))for(const item of row.machines.slice(0,7)){const n=sim.nodes.get(item.id);if(n&&Number.isFinite(item.health)&&item.health>=0&&item.health<=100)n.state.health=item.health;if(n&&typeof item.command==='boolean')n.params.command=item.command;if(n?.type==='battery'&&Number.isFinite(item.charge))n.state.charge=C.clamp(item.charge,0,n.params.capacity);}
  }}
  acceptRequest(message,player){if(!player?.walking)return false;const body=this.world.byId(message.bodyId);if(!body)return false;const city=forBody(body),b=city.buildings.find(x=>x.id===message.buildingId),floor=message.floor;if(!b||!Number.isInteger(floor)||floor<0||floor>=b.levels)return false;const p=local(this.world,body,player.position);if(Math.abs(p[0]-b.x)>2.5||p[2]-b.z<5.5||p[2]-b.z>12)return false;machinery(city,b);const e=city.elevators.get(b.id);if(e.phase!=='open')return false;const from=Math.round((p[1]-EYE-BASE)/H);if(from<0||from>=b.levels||Math.abs(p[1]-EYE-BASE-from*H)>.6)return false;if(p[2]-b.z<8.12&&floor!==from)return false;if(e.floor!==floor){e.target=floor;e.phase='closing';e.from=e.floor;e.timer=0;}return true;}
  operate(id,action='toggle'){if(!this.current)return false;const {city,building:b}=this.current,sim=machinery(city,b),node=sim.nodes.get(id);if(!node)return false;
   if(this.net?.role==='guest'){this.net.send({type:'machine',bodyId:city.body.id,buildingId:b.id,machineId:id,action});return true;}
   if(action==='repair'){if(this.flight.ship.credits<25)return false;this.flight.ship.credits-=25;sim.repair(id);}else if(action==='toggle')sim.interact(id);else return false;sim.update(.1);return true;}
  acceptMachine(p,player){if(!player?.walking||!['repair','toggle'].includes(p.action))return false;const body=this.world.byId(p.bodyId);if(!body)return false;const city=forBody(body),b=city.buildings.find(b=>b.id===p.buildingId);if(!b)return false;const sim=machinery(city,b),node=sim.nodes.get(p.machineId);if(!node||p.action==='repair')return false;const pos=local(this.world,body,player.position);if(Math.abs(pos[1]-BASE-EYE)>2)return false;if(Math.hypot(pos[0]-b.x-7,pos[2]-b.z+10)>3.3&&Math.hypot(pos[0]-b.x-node.position[0],pos[2]-b.z-node.position[2])>3.3)return false;sim.interact(node.id);return true;}
  interact(){if(!this.current)return false;if(!this.nearLift){if(!this.nearMachine)return false;globalThis.openCityComputer?.(this.nearMachine.id);return true;}const {city,building:b}=this.current,e=city.elevators.get(b.id);if(this.inLift){this.panelOpen=!this.panelOpen;return true;}this.requestFloor(b,this.floor);return true;}
 }
 C.CitySystems=CitySystems;
})(globalThis);
