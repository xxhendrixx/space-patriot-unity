/* Host-owned frontier society. Distances in metres in the city planner, km in combat. */
(function(root){
 const C=root.LongwayCore,W=C.CityWorld;
 const FACTIONS=[{id:'union',name:'Frontier Union',color:'#71bca4',motive:'Keep the ports open and the civilians alive.'},{id:'helix',name:'Helix Compact',color:'#d6b16b',motive:'Control the reactors, control the system.'},{id:'redwake',name:'Redwake',color:'#cc685d',motive:'Take cargo before someone else taxes it.'}];
 const PERSONS=[{key:'vale',name:'Seren Vale',job:'Union quartermaster',faction:'union',offset:[1.8,-6]},{key:'rook',name:'Ivo Rook',job:'Freighter captain',faction:'helix',offset:[-1.8,2]},{key:'mara',name:'Dr. Mara Sol',job:'Field xenogeologist',faction:'union',offset:[1.8,5]}];
 const planar=(a,b)=>Math.hypot(a[0]-b[0],a[2]-b[2]);
 class StreetNavigation{
  constructor(city){this.city=city;this.cache=new Map();this.step=5;this.bound=58;}
  clear(x,z){return !this.city.buildings.some(b=>Math.abs(x-b.x)<14&&Math.abs(z-b.z)<13);}
  route(start,end){const step=this.step,key=(x,z)=>x+','+z,cell=p=>[Math.round(p[0]/step),Math.round(p[2]/step)];let a=cell(start),b=cell(end);
   if(!this.clear(b[0]*step,b[1]*step)){const building=this.city.buildings.find(v=>Math.abs(end[0]-v.x)<15&&Math.abs(end[2]-v.z)<14);if(building)b=cell([building.x,0,building.z-16]);}
   const open=[a],g=new Map([[key(...a),0]]),from=new Map(),closed=new Set(),h=p=>Math.hypot(p[0]-b[0],p[1]-b[1]);let found=null;
   for(let count=0;open.length&&count<2500;count++){let ix=0;for(let i=1;i<open.length;i++)if(g.get(key(...open[i]))+h(open[i])<g.get(key(...open[ix]))+h(open[ix]))ix=i;const q=open.splice(ix,1)[0],k=key(...q);if(h(q)<1.01){found=q;break;}closed.add(k);
    for(const d of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){const p=[q[0]+d[0],q[1]+d[1]],pk=key(...p);if(closed.has(pk)||Math.abs(p[0])>this.bound||Math.abs(p[1])>this.bound||!this.clear(p[0]*step,p[1]*step))continue;if(d[0]&&d[1]&&(!this.clear(q[0]*step,p[1]*step)||!this.clear(p[0]*step,q[1]*step)))continue;const cost=g.get(k)+Math.hypot(...d);if(cost<(g.get(pk)??Infinity)){from.set(pk,q);g.set(pk,cost);if(!open.some(v=>key(...v)===pk))open.push(p);}}
   }
   if(!found)return[];const route=[];for(let p=found;key(...p)!==key(...a);p=from.get(key(...p))){if(!p)break;route.unshift([p[0]*step,W.BASE+.9,p[1]*step]);}return route;
  }
 }
 class Society{
  constructor(app){this.app=app;this.world=app.world;this.combat=app.combat;this.combat.society=this;this.reputation={union:10,helix:-35,redwake:-80};this.memories={};this.wars=Object.fromEntries(this.world.catalog.map(b=>[b.id,{owner:FACTIONS[b.seed%3].id,status:"contested",victories:0}]));this.states=new Map();this.current=null;this.radio=[];this.serial=0;this.timer=0;this.think=0;this.metrics={shots:0,flanks:0,blockedShots:0,casualties:0,factionHits:0};this.savedActors={};}
  say(speaker,text){this.radio.push({id:++this.serial,speaker,text,time:this.combat.time});this.radio=this.radio.slice(-6);}
  enter(body){if(!this.combat.authority)return false;const placeId=body.activeSettlement?.id||body.id;let state=this.states.get(placeId);if(!state){const city=W.forBody(body),building=city.buildings[6]||city.buildings[0],actors=[],site=this.world.site(body);
    for(const person of PERSONS){const pos=[building.x+person.offset[0],W.BASE+.9,building.z+person.offset[1]];actors.push(this.actor(body,person.faction,'civilian',pos,actors.length,{person:person.key,name:body.name==='Earth'?person.name:['Tamsin Cho','Elias Venn','Nadia Serrat','Leonie Park','Amir Keene','Sel Varga','Jun Mercer','Ada Okoro','Kellan Reyes'][(body.index*3+actors.length)%9],job:person.job,civilian:true}));}
    const starts=[[-10,0,-45],[10,0,26],[-9,0,82]];
    for(const [fi,faction]of (city.outpost?[]:FACTIONS.entries()))for(let i=0;i<3;i++){const p=[starts[fi][0]+(i-1)*5,W.BASE+.9,starts[fi][2]+i*4];actors.push(this.actor(body,faction.id,['leader','support','flanker'][i],p,actors.length));}
    for(const actor of actors){const hp=this.savedActors[actor.id];if(Number.isFinite(hp)&&hp>=0&&hp<=100)actor.hull=hp;}
    state={body,placeId,city,building,actors,navigation:new StreetNavigation(city),plans:new Map(),orders:new Map()};this.states.set(placeId,state);if(this.wars[body.id]?.status==='secured')for(const actor of actors)if(!actor.civilian&&actor.faction!==this.wars[body.id].owner)actor.hull=0;
   }
   this.current=state;this.combat.enemies=state.actors;this.combat.mission='frontier';this.combat.radarRange=.35;this.say('PORT CONTROL',body.name+' district is contested. Union and Compact squads are exchanging fire; Redwake is moving in.');return true;
  }
  actor(body,faction,role,pos,index,extra={}){const position=W.worldPoint(this.world,body,pos),site=this.world.site(body);return {id:'npc-'+(body.activeSettlement?.id||body.id)+'-'+index,bodyId:body.id,name:FACTIONS.find(f=>f.id===faction).name+' '+role,kind:'sentry',humanoid:true,faction,role,position,anchor:position.slice(),forward:site.forward.slice(),up:site.up.slice(),velocity:[0,0,0],hull:100,shield:0,radius:.00032,phase:index,fireIn:2+index*.19,burst:0,decision:'patrol',squad:true,...extra};}
  hostile(a,b){if(a===b)return false;return true;}
  players(){const B=this.combat;return [{id:'local',position:B.origin(),up:this.app.flight.up,walking:this.app.flight.walking,hull:B.dead?0:100,player:true},...[...B.remotes.values()].map(p=>({...p,player:true}))];}
  update(dt){dt=C.clamp(dt,0,.1);this.timer+=dt;const B=this.combat,F=this.app.flight,n=F.nearest();
   if(!B.authority)return;
   if(F.walking&&!F.bridgeWalk&&n.altitude<.1&&['standby','frontier'].includes(B.mission)){const p=W.local(this.world,n.body,F.position);if(Math.hypot(p[0],p[2])<400&&this.current?.placeId!==(n.body.activeSettlement?.id||n.body.id))this.enter(n.body);}
   if(B.mission!=='frontier'||!this.current)return;const s=this.current;if(s.body.id!==n.body.id||C.length(C.sub(F.position,this.world.site(s.body).center))>1)return;
   this.think-=dt;if(this.think<=0){this.think=.4;this.plan(s);}
   for(const e of s.actors){if(e.hull<=0)continue;if(e.civilian){if(e.hull<100){e.decision='flee';const away=C.unit(C.sub(e.position,B.origin())),next=C.add(e.position,C.mul(away,dt*.002));if(C.length(C.sub(e.position,B.origin()))<.01)e.position=this.world.move(e.position,next,this.world.active(e.position),.0003,false).position;}continue;}e.fireIn-=dt;this.move(e,s,dt);const target=[...s.actors,...this.players()].find(t=>t.id===e.targetId&&t.hull>0);if(!target)continue;
    const distance=C.length(C.sub(target.position,e.position));e.forward=C.unit(C.sub(target.position,e.position));if(distance>.13||e.fireIn>0)continue;
    const start=C.add(e.position,C.mul(e.forward,.0006)),hit=B.firstHit(start,target.position,'npc:'+e.id);
    if(!hit||hit.entity.id!==target.id){e.fireIn=.45;this.metrics.blockedShots++;continue;}
    e.burst++;e.fireIn=e.burst<3?.18:2.2;e.burst%=3;this.metrics.shots++;
    B.projectiles.push({id:++B.serial,owner:'npc:'+e.id,weapon:'rifle',position:start,previous:start.slice(),direction:e.forward.slice(),velocity:C.mul(e.forward,.25),damage:6,ttl:.8,color:e.faction==='union'?1:e.faction==='helix'?2:4});
   }
   const live=FACTIONS.filter(f=>s.actors.some(e=>!e.civilian&&e.faction===f.id&&e.hull>0)),war=this.wars[s.body.id];if(live.length===1&&war.status==='contested'){war.owner=live[0].id;war.status='secured';war.victories++;this.say('PORT CONTROL',live[0].name+' holds the district. Surviving squads are securing the approaches.');}
  }
  plan(s){const players=this.players();for(const faction of FACTIONS){const squad=s.actors.filter(e=>!e.civilian&&e.hull>0&&e.faction===faction.id);if(!squad.length)continue;const opponents=s.actors.filter(e=>e.hull>0&&!e.civilian&&this.hostile(faction.id,e.faction));if(this.reputation[faction.id]<-20)opponents.push(...players.filter(p=>p.hull>0&&p.walking));
    const center=squad[0].position;opponents.sort((a,b)=>C.length(C.sub(a.position,center))-C.length(C.sub(b.position,center)));const target=opponents.find(t=>squad.some(e=>{const d=C.unit(C.sub(t.position,e.position)),hit=this.combat.firstHit(C.add(e.position,C.mul(d,.0006)),t.position,'npc:'+e.id);return hit?.entity.id===t.id;}))||opponents[0];if(!target){for(const e of squad)e.decision='secure';continue;}
    const previous=s.orders.get(faction.id);if(previous!==target.id){s.orders.set(faction.id,target.id);this.say(squad[0].name,'Contact marked. Support holds the lane. Flanker, take the outside route.');}
    for(const [i,e]of squad.entries()){e.targetId=target.id;const p=W.local(this.world,s.body,e.position),t=W.local(this.world,s.body,target.position),away=[p[0]-t[0],p[2]-t[2]],len=Math.hypot(...away)||1,u=away.map(v=>v/len);let goal;
     if(e.hull<28){goal=W.local(this.world,s.body,e.anchor);e.decision='retreat';}
     else if(e.role==='flanker'){const side=e.phase%2?1:-1;goal=[t[0]+u[0]*18-u[1]*side*22,W.BASE+.9,t[2]+u[1]*18+u[0]*side*22];e.decision='flank';this.metrics.flanks++;}
     else {const range=e.role==='support'?34:24;goal=[t[0]+u[0]*range,W.BASE+.9,t[2]+u[1]*range];e.decision=e.role==='support'?'suppress':'advance';}
     if(planar(p,goal)>3){const old=s.plans.get(e.id);if(!old||this.timer-old.time>2||planar(goal,old.goal)>8)s.plans.set(e.id,{path:s.navigation.route(p,goal),goal,time:this.timer});}
    }
   }}
  move(e,s,dt){const plan=s.plans.get(e.id);if(!plan?.path.length){e.velocity=[0,0,0];return;}let p=W.local(this.world,s.body,e.position),target=plan.path[0],dx=target[0]-p[0],dz=target[2]-p[2],len=Math.hypot(dx,dz);if(len<.5){plan.path.shift();return;}const step=Math.min(len,dt*(e.decision==='retreat'?4.4:e.role==='flanker'?3.8:2.4)),next=[p[0]+dx/len*step,W.BASE+.9,p[2]+dz/len*step],end=W.worldPoint(this.world,s.body,next),collision=this.world.move(e.position,end,this.world.active(e.position),.0003,false);const before=e.position;e.position=collision.position;e.velocity=C.mul(C.sub(e.position,before),1/Math.max(dt,.001));e.phase+=step*2;}
  onHit(entity,owner){if(!entity.faction)return;const attacker=owner.startsWith('npc:')?this.combat.enemies.find(e=>e.id===owner.slice(4)):null;if(attacker&&attacker.faction!==entity.faction)this.metrics.factionHits++;if(owner==='local'||this.combat.remotes.has(owner)){this.reputation[entity.faction]=C.clamp(this.reputation[entity.faction]-(entity.civilian?25:6),-100,100);this.memories['violence:'+entity.faction]=true;}
   if(entity.hull<=0){this.metrics.casualties++;this.say(entity.faction.toUpperCase(),entity.name+' is down. Adjust your approach.');}}
  nearestPerson(){const B=this.combat;return B.enemies.filter(e=>e.person&&e.hull>0).map(e=>({e,d:C.length(C.sub(e.position,B.origin()))})).filter(v=>v.d<.0045).sort((a,b)=>a.d-b.d)[0]?.e||null;}
  conversation(person,topic='greeting'){const npc=this.combat.enemies.find(e=>e.person===person&&e.hull>0);if(!npc||C.length(C.sub(npc.position,this.combat.origin()))>.0045)return null;const m=this.memories[npc.id]||(this.memories[npc.id]={visits:0,contract:false,delivered:false}),body=this.world.byId(npc.bodyId),war=this.wars[body.id]||{owner:'union',status:'contested'},faction=FACTIONS.find(f=>f.id===npc.faction),rep=this.reputation[npc.faction],I=this.app.inventory;
   const names={vale:'Seren Vale',rook:'Ivo Rook',mara:'Dr. Mara Sol'};let text='';
   if(topic==='greeting'){text=m.visits++?'Back again. '+(m.delivered?'You kept your word. People here remember that.':'What do you need?'):{vale:'Count the stretchers before you count the flags. I keep this port supplied; the factions can argue over whose paint goes on it later.',rook:'My ship has three names, two creditors, and one working engine. If someone asks whether I chose a side, tell them I chose a departure time.',mara:'Every map starts with a measurement and ends with an argument. I trust the measurements. The landscape out there still has surprises.'}[person];text=(body.activeSettlement?body.activeSettlement.name+'. ':'')+text;if(npc.hull<90)text='Keep your head down. We can settle the paperwork once the shooting stops.';if(this.memories['violence:'+npc.faction])text='I heard about your shots. You want a conversation, start by keeping that weapon lowered.';}
   else if(topic==='war')text=(war.status==='secured'?FACTIONS.find(f=>f.id===war.owner).name+' holds this district. ':'Three factions are fighting over this district. ')+{vale:'The Union wants open docks. Helix wants the power grid. Redwake wants the cargo. Watch the flanking squad, not the loudest gun.',rook:'Helix can win a battle and still lose a supply route. Their support gun pins a lane while another team goes wide. Break that timing and the whole attack slows down.',mara:'Crossfire does not care which story you believe. If you help one faction seize a district, its survivors become the next patrol.'}[person];
   else if(topic==='world')text=body.name+' belongs to '+body.system+'. Its catalog radius is '+Math.round(body.physicalRadiusKm).toLocaleString()+' km; gravity derived from mass and radius is '+body.gravity.toFixed(2)+' m/s². '+(body.host.research?'This system has a research profile in our archive. ':'Our archive carries its real catalog record. ')+'The settlements and terrain maps we use are our frontier simulation, not telescope photographs.';
   else if(topic==='job'){m.contract=true;text={vale:'Bring six units of recovered alloy to this desk. I can turn them into thirty rifle rounds and get your crew listed as a reliable supplier.',rook:'Bring three repair components. I will pass your ship off the Compact interdiction list. That buys a truce with Helix; Redwake will still shoot.',mara:'Bring one field sample from a surface expedition. I will assay it into eight alloy units and credit the Union research ledger.'}[person];}
   else if(topic==='deliver'){
    if(!this.combat.authority)text='Your host captain handles shared faction contracts. I can still brief you on the district.';
    else if(!m.contract)text='Let us agree on the job first.';
    else if(m.delivered)text='We already settled that contract. I remember a paid invoice.';
    else {const id=person==='vale'?'alloy':person==='rook'?'spares':'sample',cost=person==='vale'?6:person==='rook'?3:1;
     if(!I||I.engine.count(id)<cost)text='You have '+(I?.engine.count(id)||0)+' of the '+cost+' required '+id+'. I cannot promise supplies that are not here.';
     else {const output=person==='vale'?'rifle_ammo':person==='mara'?'alloy':null,count=person==='vale'?30:8;if(output){const add=I.engine.addItem(output,count);if(!add.ok)return {name:npc.name,job:npc.job,faction:faction.name,text:add.error,topic};}I.spend(id,cost);m.delivered=true;this.reputation[npc.faction]=person==='rook'?Math.max(5,rep):C.clamp(rep+15,-100,100);text=person==='rook'?'Your crew is off the Compact target list. Do not make me regret signing that clearance.':person==='vale'?'Thirty rounds, counted and packed. Your delivery keeps a crew alive. You have earned some trust.':'Assay complete. Eight units of usable alloy. I have put your name on the research credit.';this.say(npc.name,'Crew contract fulfilled. '+faction.name+' standing improved.');}
    }
   }
   return {name:npc.name,job:npc.job,faction:faction.name,person,topic,text,reputation:this.reputation[npc.faction],delivered:m.delivered,contract:m.contract};
  }
  save(){const actors={...this.savedActors};for(const state of this.states.values())for(const e of state.actors)actors[e.id]=e.hull;return {format:'space-patriot-society',version:1,state:this.snapshot(),actors,memories:this.memories,inventory:this.app.inventory?.engine.serialize()};}
  load(v){if(!v||v.format!=='space-patriot-society'||v.version!==1)return false;this.acceptSnapshot(v.state);if(v.memories&&typeof v.memories==='object'&&JSON.stringify(v.memories).length<50000)this.memories=v.memories;if(v.actors&&Object.keys(v.actors).length<=400)this.savedActors=v.actors;if(v.inventory)this.app.inventory?.engine.load(v.inventory);return true;}
  snapshot(){return{reputation:this.reputation,wars:this.wars,radio:this.radio,metrics:this.metrics};}
  acceptSnapshot(v){if(!v||!v.reputation||!FACTIONS.every(f=>Number.isFinite(v.reputation[f.id])&&Math.abs(v.reputation[f.id])<=100))return;this.reputation={...v.reputation};if(v.wars&&typeof v.wars==='object')this.wars=v.wars;if(Array.isArray(v.radio))this.radio=v.radio.slice(-6).filter(x=>typeof x.text==='string'&&x.text.length<400&&typeof x.speaker==='string');if(v.metrics)this.metrics=v.metrics;}
 }
 C.Society=Society;C.FACTIONS=FACTIONS;C.StreetNavigation=StreetNavigation;
})(globalThis);
