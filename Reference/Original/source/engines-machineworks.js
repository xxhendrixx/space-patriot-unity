/* Generated from the user's machineworks.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
(function(root){/* MachineWorks 1.0 — deterministic game simulation. No browser, renderer, or dependencies. */
const VERSION='1.0.0';
const FORMAT='machineworks-project';
const LIMITS=Object.freeze({machines:160,connections:640,parts:32,step:1/60,maxCatchUp:0.25});
const TYPES=Object.freeze({
 reactor:{name:'Arc reactor',family:'Power',code:'P-01',icon:'reactor',desc:'Variable-output generator with thermal protection.',supply:42,draw:0,size:[3.5,4.2,3.5],color:'#cc8655'},
 battery:{name:'Battery bank',family:'Power',code:'P-02',icon:'battery',desc:'Stores surplus power; bridges supply interruptions.',supply:0,draw:0,size:[2.8,2.8,2.6],color:'#708c7e'},
 conveyor:{name:'Conveyor',family:'Motion',code:'M-01',icon:'conveyor',desc:'Powered belt with moving cargo and cycle events.',draw:4,size:[4.8,1.7,2.2],color:'#cfa25e'},
 press:{name:'Servo press',family:'Motion',code:'M-02',icon:'press',desc:'Reciprocating industrial actuator and work cycle.',draw:8,size:[3,4.1,2.6],color:'#cc8655'},
 arm:{name:'Robot arm',family:'Motion',code:'M-03',icon:'arm',desc:'Articulated pick-and-place motion with cycle hooks.',draw:7,size:[4,4,3.4],color:'#dca25b'},
 pump:{name:'Fluid pump',family:'Motion',code:'M-04',icon:'pump',desc:'Animated impeller and fluid-flow visualization.',draw:5,size:[3.4,3.1,2.6],color:'#648f92'},
 door:{name:'Security door',family:'Motion',code:'M-05',icon:'door',desc:'Signal-driven sliding door with open-state events.',draw:3,size:[4.8,4.3,1.5],color:'#86908d'},
 lift:{name:'Cargo lift',family:'Motion',code:'M-06',icon:'lift',desc:'Command-controlled vertical platform.',draw:6,size:[3.5,4.7,3.2],color:'#cfa25e'},
 switch:{name:'Toggle switch',family:'Control',code:'C-01',icon:'switch',desc:'Manual logic source. Interact to change output.',draw:0.1,size:[1.4,2,1.4],color:'#d29b67'},
 sensor:{name:'Proximity sensor',family:'Control',code:'C-02',icon:'sensor',desc:'Detects the movable test probe within its radius.',draw:0.2,size:[1.5,2.5,1.5],color:'#81a9a5'},
 relay:{name:'Logic relay',family:'Control',code:'C-03',icon:'relay',desc:'AND, OR, NOT, or XOR across signal inputs.',draw:0.15,size:[1.8,2.3,1.8],color:'#9f91b4'},
 terminal:{name:'Control terminal',family:'Control',code:'C-04',icon:'terminal',desc:'Interactive workstation and game-event source.',draw:0.6,size:[2,2.5,1.8],color:'#819f99'},
 fan:{name:'Cooling fan',family:'Utility',code:'U-01',icon:'fan',desc:'Powered cooling for nearby machines.',draw:2,size:[2.6,3.3,2],color:'#829c8d'},
 lamp:{name:'Work light',family:'Utility',code:'U-02',icon:'lamp',desc:'Power-responsive industrial lighting.',draw:1.2,size:[1.8,3.4,1.8],color:'#d0b680'}
});
const PARTS=['panel','cylinder','gear','pipe','screen','antenna'];
const clone=x=>JSON.parse(JSON.stringify(x));
const number=(x,d,min=-1e5,max=1e5)=>Number.isFinite(Number(x))?Math.max(min,Math.min(max,Number(x))):d;
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const vector=(v,d=[0,0,0],min=-1000,max=1000)=>Array.isArray(v)&&v.length===3?v.map((n,i)=>number(n,d[i],min,max)):d.slice();
const color=(v,d)=>typeof v==='string'&&/^#[0-9a-f]{6}$/i.test(v)?v:d;
function normalizePart(p,index){
 if(!p||!PARTS.includes(p.kind))throw Error('Unknown custom part');
 return {id:String(p.id||'part-'+index).slice(0,70),kind:p.kind,name:String(p.name||p.kind).slice(0,60),position:vector(p.position,[0,2,0],-15,15),rotation:vector(p.rotation,[0,0,0],-360,360),scale:vector(p.scale,[1,1,1],.05,8),color:color(p.color,'#9ba7a4'),motion:['none','spin','stroke'].includes(p.motion)?p.motion:'none',speed:number(p.speed,1,-8,8)};
}
function paramsFor(type,p={}){
 const t=TYPES[type]; return {enabled:p.enabled!==false,command:p.command!==false,throttle:number(p.throttle,1,0,1.5),speed:number(p.speed,1,.1,4),stroke:number(p.stroke,1,.1,2),supply:number(p.supply,t.supply||0,0,200),draw:number(p.draw,t.draw||0,0,80),capacity:number(p.capacity,240,1,3000),maxRate:number(p.maxRate,16,.1,100),initialCharge:number(p.initialCharge,.65,0,1),range:number(p.range,5,1,15),cooling:number(p.cooling,1,0,3),tripAt:number(p.tripAt,100,50,160),logic:['AND','OR','NOT','XOR'].includes(p.logic)?p.logic:'AND',color:color(p.color,t.color),metalness:number(p.metalness,.65,0,1),roughness:number(p.roughness,.4,.08,1)};
}
function runtime(type,p){return {health:100,temp:22,tripped:false,power:0,kw:0,signal:false,active:false,phase:0,openness:0,charge:p.capacity*p.initialCharge,cycles:0,status:'IDLE',lastStatus:'',flow:0};}
function nodeFrom(type,options={},id){
 if(!TYPES[type])throw Error('Unknown machine type: '+type);
 const p=paramsFor(type,options.params); const parts=options.parts||[];
 if(!Array.isArray(parts)||parts.length>LIMITS.parts)throw Error('Up to '+LIMITS.parts+' custom parts per machine');
 const node={id,name:String(options.name||TYPES[type].name).slice(0,80),type,position:vector(options.position),rotation:number(options.rotation,0,-360,360),scale:number(options.scale,1,.25,3),params:p,parts:parts.map(normalizePart),state:runtime(type,p)};
 if(options.state){const s=options.state;node.state={...node.state,health:number(s.health,100,0,100),temp:number(s.temp,22,-20,250),tripped:!!s.tripped,phase:number(s.phase,0,0,1e8),openness:number(s.openness,0,0,1),charge:number(s.charge,node.state.charge,0,p.capacity),cycles:Math.floor(number(s.cycles,0,0,1e9))};}
 return node;
}
class MachineSimulation {
 constructor(){this.nodes=new Map();this.connections=[];this.listeners=new Map();this.time=0;this.accumulator=0;this.running=true;this.rate=1;this.environment={ambient:22};this.probe=[0,0,8];this.counter=1;this.netDirty=true;this.components=[];this.metrics={generated:0,demand:0,delivered:0,charge:0,batteryFlow:0,active:0,faults:0,networks:0};}
 on(type,fn){if(typeof fn!=='function')throw Error('Listener must be a function');if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);return()=>this.listeners.get(type)?.delete(fn);}
 emit(type,data={}){const e={type,time:this.time,...data};for(const fn of [...(this.listeners.get(type)||[]),...(this.listeners.get('*')||[])]){try{fn(e);}catch(err){console.error('MachineWorks listener failed',err);}}}
 add(type,options={}){if(this.nodes.size>=LIMITS.machines)throw Error('Machine limit reached');let id=options.id?String(options.id):'mw-'+this.counter++;if(!/^[A-Za-z0-9_-]{1,70}$/.test(id)||this.nodes.has(id))throw Error('Invalid or duplicate machine ID');while(this.nodes.has('mw-'+this.counter))this.counter++;const n=nodeFrom(type,options,id);this.nodes.set(id,n);this.netDirty=true;this.emit('machine:added',{id,typeName:type});return n;}
 get(id){const n=this.nodes.get(id);if(!n)throw Error('Machine not found: '+id);return n;}
 remove(id){this.get(id);this.nodes.delete(id);this.connections=this.connections.filter(e=>e.from!==id&&e.to!==id);this.netDirty=true;this.emit('machine:removed',{id});}
 configure(id,patch){const n=this.get(id);const clean=nodeFrom(n.type,{...clone(n),...patch,params:{...n.params,...patch.params}},id);this.nodes.set(id,clean);this.netDirty=true;this.emit('machine:configured',{id});return clean;}
 connect(from,to,kind='power'){
  this.get(from);this.get(to);if(from===to)throw Error('A machine cannot connect to itself');if(!['power','signal'].includes(kind))throw Error('Connection must be power or signal');
  if(this.connections.length>=LIMITS.connections)throw Error('Connection limit reached');
  if(this.connections.some(e=>e.kind===kind&&((e.from===from&&e.to===to)||(kind==='power'&&e.from===to&&e.to===from))))throw Error('This connection already exists');
  if(kind==='signal'&&!['switch','sensor','relay','terminal'].includes(this.get(from).type))throw Error('Signal must start at a switch, sensor, relay, or terminal');
  const id='link-'+this.counter++;this.connections.push({id,from,to,kind});this.netDirty=true;this.emit('machine:connected',{id,from,to,kind});return id;
 }
 disconnect(id){const i=this.connections.findIndex(e=>e.id===id);if(i<0)throw Error('Connection not found');this.connections.splice(i,1);this.netDirty=true;this.emit('machine:disconnected',{id});}
 interact(id){const n=this.get(id);n.params.command=!n.params.command;this.emit('machine:interacted',{id,command:n.params.command});return n.params.command;}
 damage(id,amount=25){const n=this.get(id);n.state.health=clamp(n.state.health-number(amount,25,0,100),0,100);this.emit('machine:damaged',{id,health:n.state.health});}
 repair(id){const n=this.get(id);n.state.health=100;n.state.temp=this.environment.ambient;n.state.tripped=false;this.emit('machine:repaired',{id});}
 setProbe(position){this.probe=vector(position);}
 setEnvironment(options){this.environment.ambient=number(options.ambient,this.environment.ambient,-20,65);}
 buildNetworks(){
  const adj=new Map([...this.nodes.keys()].map(id=>[id,[]]));
  for(const c of this.connections)if(c.kind==='power'){adj.get(c.from)?.push(c.to);adj.get(c.to)?.push(c.from);}
  const seen=new Set();this.components=[];
  for(const id of this.nodes.keys())if(!seen.has(id)){const group=[],stack=[id];seen.add(id);while(stack.length){const a=stack.pop();group.push(a);for(const b of adj.get(a))if(!seen.has(b)){seen.add(b);stack.push(b);}}this.components.push(group);}
  this.inputs=new Map([...this.nodes.keys()].map(id=>[id,[]]));for(const c of this.connections)if(c.kind==='signal')this.inputs.get(c.to)?.push(c.from);
  this.netDirty=false;
 }
 update(delta){if(!Number.isFinite(delta)||delta<0)throw Error('Delta must be nonnegative seconds');if(!this.running)return;this.accumulator+=Math.min(delta,LIMITS.maxCatchUp)*this.rate;let guard=0;while(this.accumulator+1e-9>=LIMITS.step&&guard++<60){this.step(LIMITS.step);this.accumulator-=LIMITS.step;}}
 step(dt=LIMITS.step){
  if(this.netDirty)this.buildNetworks();this.time+=dt;const prev=new Map([...this.nodes].map(([id,n])=>[id,n.state.signal]));const requests=new Map(),allow=new Map();
  const controlTypes=['switch','sensor','relay','terminal'];
  for(const n of this.nodes.values()){
   const ins=this.inputs.get(n.id)||[];const healthy=n.params.enabled&&n.state.health>0&&!n.state.tripped;
   const command=ins.length?ins.every(id=>prev.get(id)):n.params.command;
   const permitted=healthy&&(controlTypes.includes(n.type)||n.type==='battery'||command);
   allow.set(n.id,{healthy,command,permitted});
   // Control circuits remain powered even when their output is low. Door/lift idle holding draw is deliberate.
   requests.set(n.id,healthy?(controlTypes.includes(n.type)?n.params.draw:(permitted?n.params.draw*(.35+.65*n.params.speed):((n.type==='door'||n.type==='lift')?n.params.draw*.15:0))):0);
   n.state.kw=0;n.state.power=0;n.state.flow=0;
  }
  const metrics={generated:0,demand:0,delivered:0,charge:0,batteryFlow:0,active:0,faults:0,networks:this.components.length};
  for(const ids of this.components){
   const nodes=ids.map(id=>this.nodes.get(id));const gens=nodes.filter(n=>n.type==='reactor'&&allow.get(n.id).permitted);
   const bats=nodes.filter(n=>n.type==='battery'&&allow.get(n.id).healthy);
   const supply=gens.reduce((a,n)=>a+n.params.supply*n.params.throttle*(n.state.health/100),0);
   const demand=nodes.reduce((a,n)=>a+requests.get(n.id),0);
   let deficit=Math.max(0,demand-supply),used=0;
   // Sorted IDs make storage allocation independent of connection traversal order.
   bats.sort((a,b)=>a.id.localeCompare(b.id));
   for(const b of bats){const discharge=Math.min(deficit,b.params.maxRate,b.state.charge/dt);b.state.charge-=discharge*dt;b.state.flow=-discharge;deficit-=discharge;used+=discharge;}
   const available=supply+used;const fraction=demand>0?Math.min(1,available/demand):0;
   let surplus=Math.max(0,supply-demand),charged=0;
   for(const b of bats){if(b.state.flow<0)continue;const charge=Math.min(surplus,b.params.maxRate,(b.params.capacity-b.state.charge)/dt);b.state.charge+=charge*dt;b.state.flow=charge;surplus-=charge;charged+=charge;}
   for(const n of nodes){
    const r=requests.get(n.id),ok=allow.get(n.id);n.state.power=ok.healthy?(n.type==='reactor'?(ok.permitted?1:0):(n.type==='battery'?(n.state.charge>0||available>0?1:0):(available>0?(r>0?fraction:1):0))):0;
    n.state.kw=n.type==='reactor'?(ok.permitted?n.params.supply*n.params.throttle*(n.state.health/100):0):n.type==='battery'?n.state.flow:r*fraction;
   }
   metrics.generated+=supply;metrics.demand+=demand;metrics.delivered+=Math.min(available,demand);metrics.batteryFlow+=charged-used;
  }
  const fans=[...this.nodes.values()].filter(n=>n.type==='fan'&&allow.get(n.id).permitted&&n.state.power>.1);
  for(const n of this.nodes.values()){
   const s=n.state,p=n.params,a=allow.get(n.id),ins=(this.inputs.get(n.id)||[]).map(id=>!!prev.get(id));
   s.active=!!(a.permitted&&s.power>.03);
   if(n.type==='battery')s.active=a.healthy&&Math.abs(s.flow)>.001;
   if(n.type==='switch'||n.type==='terminal')s.signal=s.active&&p.command;
   else if(n.type==='sensor')s.signal=s.active&&Math.hypot(n.position[0]-this.probe[0],n.position[2]-this.probe[2])<=p.range;
   else if(n.type==='relay'){const val=p.logic==='AND'?ins.length>0&&ins.every(Boolean):p.logic==='OR'?ins.some(Boolean):p.logic==='NOT'?!ins.some(Boolean):ins.filter(Boolean).length%2===1;s.signal=s.active&&val;}
   else s.signal=s.active;
   const work=s.active?p.speed*s.power:0;
   const oldCycle=Math.floor(s.phase/(Math.PI*2));s.phase+=dt*work*(n.type==='conveyor'?1.1:1.5);
   if(['press','arm','conveyor'].includes(n.type)&&Math.floor(s.phase/(Math.PI*2))>oldCycle){s.cycles++;this.emit('machine:cycle',{id:n.id,cycles:s.cycles});}
   if(n.type==='door'||n.type==='lift'){
    const target=a.command&&a.healthy?1:0;const before=s.openness;
    // No power: actuators hold position. Return motion is also powered, not gravity simulated.
    s.openness+=clamp(target-s.openness,-dt*p.speed*s.power*.6,dt*p.speed*s.power*.6);
    if(before<.995&&s.openness>=.995)this.emit('machine:opened',{id:n.id});
    if(before>.005&&s.openness<=.005)this.emit('machine:closed',{id:n.id});
   }
   let cooling=.025*p.cooling;for(const f of fans)if(f.id!==n.id&&Math.hypot(f.position[0]-n.position[0],f.position[2]-n.position[2])<=f.params.range)cooling+=.07*f.state.power;
   const heat=(s.active?(n.type==='reactor'?Math.max(0,p.throttle-.45)*4:.1+Math.abs(s.kw)*.08):0);
   s.temp=clamp(s.temp+(heat-(s.temp-this.environment.ambient)*cooling)*dt,-20,250);
   if(s.temp>=p.tripAt&&!s.tripped){s.tripped=true;this.emit('machine:overheat',{id:n.id,temperature:s.temp});}
   s.status=s.health<=0?'BROKEN':s.tripped?'TRIPPED':!p.enabled?'OFFLINE':(n.type==='reactor'?!s.active:s.power<=.02)?'NO POWER':!s.active?(n.type==='battery'?'STANDBY':'IDLE'):s.power<.98?'BROWNOUT':'RUNNING';
   if(s.status!==s.lastStatus){this.emit('machine:state',{id:n.id,status:s.status,previous:s.lastStatus});s.lastStatus=s.status;}
   if(prev.get(n.id)!==s.signal)this.emit('machine:signal',{id:n.id,signal:s.signal});
   metrics.charge+=n.type==='battery'?s.charge:0;metrics.active+=s.active?1:0;metrics.faults+=(s.tripped||s.health<=0)?1:0;
  }
  this.metrics=metrics;
 }
 resetRuntime(){for(const n of this.nodes.values())n.state=runtime(n.type,n.params);this.time=0;this.accumulator=0;this.netDirty=true;this.emit('simulation:reset');}
 serialize({runtime:includeRuntime=true}={}){return {format:FORMAT,version:1,name:'MachineWorks assembly',environment:clone(this.environment),probe:this.probe.slice(),time:includeRuntime?this.time:0,machines:[...this.nodes.values()].map(n=>{const a=clone(n);if(!includeRuntime)delete a.state;return a;}),connections:clone(this.connections)};}
 load(raw){
  // Build the replacement in isolation. Failed imports never mutate the running scene.
  if(!raw||raw.format!==FORMAT||raw.version!==1)throw Error('Not a MachineWorks v1 project');
  if(!Array.isArray(raw.machines)||raw.machines.length>LIMITS.machines||!Array.isArray(raw.connections)||raw.connections.length>LIMITS.connections)throw Error('Project size or structure is invalid');
  const next=new MachineSimulation();for(const n of raw.machines)next.add(n.type,n);
  const ids=new Set();for(const c of raw.connections){const id=next.connect(c.from,c.to,c.kind);if(c.id){if(!/^[\w-]{1,70}$/.test(c.id)||ids.has(c.id))throw Error('Invalid connection ID');next.connections.find(e=>e.id===id).id=c.id;ids.add(c.id);}}
  next.setEnvironment(raw.environment||{});next.setProbe(raw.probe||[0,0,8]);next.time=number(raw.time,0,0,1e8);
  this.nodes=next.nodes;this.connections=next.connections;this.counter=Math.max(next.counter,...[...this.nodes.keys(),...this.connections.map(c=>c.id)].map(id=>(Number(id.split('-').pop())||0)+1));this.environment=next.environment;this.probe=next.probe;this.time=next.time;this.accumulator=0;this.netDirty=true;this.emit('simulation:loaded');
 }
 getColliders(){return [...this.nodes.values()].filter(n=>!(n.type==='door'&&n.state.openness>.9)).map(n=>({id:n.id,position:n.position.slice(),size:TYPES[n.type].size.map(v=>v*n.scale),rotation:n.rotation*Math.PI/180}));}
 dispose(){this.nodes.clear();this.connections=[];this.listeners.clear();this.components=[];}
}
function createPreset(name='workshop'){
 const s=new MachineSimulation();const add=(type,x,z,options={})=>s.add(type,{position:[x,0,z],...options}).id;
 if(name==='airlock'){
  const r=add('reactor',-6,-3,{params:{supply:18}}),b=add('battery',-6,3),t=add('terminal',0,5,{params:{command:false}}),sensor=add('sensor',4,3),relay=add('relay',0,0,{params:{logic:'OR'}}),d=add('door',4,-3),lamp=add('lamp',8,-3);
  for(const id of [b,t,sensor,relay,d,lamp])s.connect(r,id);s.connect(t,relay,'signal');s.connect(sensor,relay,'signal');s.connect(relay,d,'signal');s.connect(relay,lamp,'signal');s.probe=[10,0,7];
 }else if(name==='blackout'){
  const r=add('reactor',-5,-3,{params:{supply:20}}),b=add('battery',-5,3,{params:{initialCharge:.8,capacity:150}}),t=add('switch',1,4),p=add('press',2,-3),a=add('arm',7,-3),c=add('conveyor',6,3),l=add('lamp',-1,-3);
  for(const id of [b,t,p,a,c,l])s.connect(r,id);s.connect(t,r,'signal');
 }else if(name==='empty'){}else{
  const r=add('reactor',-6,-3,{name:'ARC / primary generator'}),b=add('battery',-6,3),fan=add('fan',-9,-3,{rotation:90}),t=add('terminal',0,4,{name:'LINE / control station'}),p=add('press',0,-3),a=add('arm',6,-3),c=add('conveyor',5,3),pump=add('pump',-1,-8);
  for(const id of [b,fan,t,p,a,c,pump])s.connect(r,id);for(const id of [p,a,c])s.connect(t,id,'signal');
 }
 return s.serialize();
}

root.MachineworksCore={MachineSimulation,TYPES,createPreset};})(globalThis);
