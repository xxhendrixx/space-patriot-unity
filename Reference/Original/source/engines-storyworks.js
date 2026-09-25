/* Generated from the user's storyworks.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
(function(root){'use strict';
const VERSION = '0.1.0';
const NODE_TYPES = ['start','dialogue','objective','condition','action','delay','journal','end'];
const INPUT_EVENTS = ['world.region.enter','world.region.exit','world.interact','inventory.changed','combat.defeated','character.changed','weather.changed','world.time.changed','gameplay.signal'];
const COMMANDS = ['world.marker','world.door','world.spawn','world.flag','inventory.give','inventory.take','character.reputation','weather.set','spell.cast','camera.focus','audio.play'];
const BLOCKED = new Set(['__proto__','prototype','constructor']);
const own = (o,k) => Object.prototype.hasOwnProperty.call(o,k);
const scalar = v => typeof v==='string'||typeof v==='boolean'||(typeof v==='number'&&Number.isFinite(v))||v===null;
const idOK = x => typeof x==='string'&&/^[a-zA-Z][a-zA-Z0-9_.:-]{0,95}$/.test(x)&&!BLOCKED.has(x);
function clone(value) { return JSON.parse(JSON.stringify(value)); }
function assert(ok, message) { if(!ok) throw new Error(message); }
function safeJSON(value, depth=0, budget={n:0}) {
  assert(depth<32 && ++budget.n<120000, 'JSON exceeds safety limits');
  if(scalar(value)) { if(typeof value==='string')assert(value.length<100000,'Text is too long'); return; }
  assert(value!==undefined && typeof value==='object' && value!==null, 'Only JSON data is supported');
  assert(Array.isArray(value)||Object.getPrototypeOf(value)===Object.prototype||Object.getPrototypeOf(value)===null, 'Expected plain JSON data');
  for(const [k,v] of Object.entries(value)) { assert(!BLOCKED.has(k),'Unsafe JSON key: '+k); safeJSON(v,depth+1,budget); }
}
function validCondition(c, at, depth=0) {
  assert(depth<12, at+': conditions are too deeply nested');
  if(c===undefined||c===null)return;
  assert(c&&typeof c==='object'&&!Array.isArray(c),at+': condition must be an object');
  if(own(c,'all')||own(c,'any')) { const a=c.all??c.any; assert(Array.isArray(a)&&a.length<=32,at+': invalid condition group'); a.forEach(x=>validCondition(x,at,depth+1)); return; }
  if(own(c,'not')) { validCondition(c.not,at,depth+1); return; }
  assert(['variable','inventory','flag','quest','world'].includes(c.source??'variable'),at+': invalid condition source');
  assert(idOK(c.key),at+': invalid condition key');
  assert(['eq','ne','gt','gte','lt','lte','exists'].includes(c.op??'eq'),at+': invalid condition operator');
  if(c.op!=='exists')assert(scalar(c.value),at+': condition value must be a scalar');
  if(['gt','gte','lt','lte'].includes(c.op))assert(Number.isFinite(c.value),at+': numeric comparison requires a number');
}
function validActions(actions, at, quests) {
  assert(Array.isArray(actions)&&actions.length<=64,at+': actions must be an array (max 64)');
  actions.forEach((a,i)=>{
    const p=at+' action '+i; assert(a&&['set','add','flag','command','journal','startQuest'].includes(a.type),p+': invalid action type');
    if(['set','add','flag'].includes(a.type)) { assert(idOK(a.key),p+': invalid key'); assert(scalar(a.value),p+': invalid value'); }
    if(a.type==='add')assert(Number.isFinite(a.value),p+': add needs a number');
    if(a.type==='flag')assert(typeof a.value==='boolean',p+': flag needs a boolean');
    if(a.type==='command') { assert(idOK(a.command),p+': invalid command name'); assert(a.payload===undefined||(a.payload&&typeof a.payload==='object'&&!Array.isArray(a.payload)),p+': payload must be an object'); }
    if(a.type==='journal')assert(typeof a.text==='string',p+': journal needs text');
    if(a.type==='startQuest')assert(quests.has(a.questId),p+': unknown quest');
  });
}
function validateProject(input) {
  const errors=[], warnings=[];
  try {
    safeJSON(input); const p=input;
    assert(p.format==='storyworks-project'&&p.version===1,'Expected a Storyworks project, version 1');
    assert(idOK(p.id)&&typeof p.title==='string'&&p.title.trim(), 'Project needs an ID and a title');
    assert(Array.isArray(p.quests)&&p.quests.length>0&&p.quests.length<=100,'Project needs 1–100 quests');
    assert(Array.isArray(p.nodes)&&p.nodes.length>0&&p.nodes.length<=2000,'Project needs 1–2000 nodes');
    assert(p.variables&&typeof p.variables==='object'&&!Array.isArray(p.variables),'Variables must be an object');
    for(const [k,v] of Object.entries(p.variables))assert(idOK(k)&&scalar(v),'Invalid variable '+k);
    const qs=new Set(), ns=new Map();
    for(const q of p.quests) { assert(idOK(q.id)&&!qs.has(q.id),'Invalid/duplicate quest ID '+q.id); qs.add(q.id); assert(typeof q.title==='string',q.id+': title required'); validCondition(q.requires,q.id); }
    for(const n of p.nodes) {
      assert(idOK(n.id)&&!ns.has(n.id),'Invalid/duplicate node ID '+n.id); ns.set(n.id,n);
      assert(qs.has(n.questId),n.id+': unknown quest'); assert(NODE_TYPES.includes(n.type),n.id+': unknown node type');
      assert(typeof n.title==='string',n.id+': title required');
      if(n.x!==undefined)assert(Number.isFinite(n.x)&&Math.abs(n.x)<1e6,n.id+': invalid x');
      if(n.y!==undefined)assert(Number.isFinite(n.y)&&Math.abs(n.y)<1e6,n.id+': invalid y');
      validActions(n.actions??[],n.id,qs);
      if(n.type==='dialogue') {
        assert(typeof n.text==='string',n.id+': dialogue text required');
        assert(Array.isArray(n.choices)&&n.choices.length>0&&n.choices.length<=16,n.id+': dialogue needs 1–16 choices');
        const choices=new Set();
        for(const c of n.choices) { assert(idOK(c.id)&&!choices.has(c.id),n.id+': duplicate/invalid choice'); choices.add(c.id); assert(typeof c.text==='string',n.id+': choice needs text'); validCondition(c.condition,n.id); validActions(c.actions??[],n.id,qs); }
      }
      if(n.type==='objective') {
        if(n.condition)validCondition(n.condition,n.id);
        else { assert(idOK(n.event),n.id+': objective event is required'); assert(Number.isSafeInteger(n.goal??1)&&(n.goal??1)>0&&(n.goal??1)<=100000,n.id+': invalid goal'); assert(!n.match||(typeof n.match==='object'&&!Array.isArray(n.match)),n.id+': match must be an object'); for(const [k,v]of Object.entries(n.match??{}))assert(idOK(k)&&scalar(v),n.id+': match fields must be scalar'); }
      }
      if(n.type==='condition') { assert(n.condition,n.id+': condition required'); validCondition(n.condition,n.id); }
      if(n.type==='delay')assert(Number.isFinite(n.seconds)&&n.seconds>=0&&n.seconds<=86400,n.id+': delay must be 0–86400 seconds');
      if(n.type==='journal')assert(typeof n.text==='string',n.id+': journal text required');
      if(n.type==='end')assert(['completed','failed'].includes(n.result??'completed'),n.id+': invalid ending result');
    }
    const edges=n=>n.type==='end'?[]:n.type==='dialogue'?n.choices.map(c=>c.next):n.type==='condition'?[n.then,n.else]:[n.next];
    for(const n of p.nodes)for(const target of edges(n))assert(ns.has(target)&&ns.get(target).questId===n.questId,n.id+': missing or cross-quest connection '+target);
    for(const q of p.quests) {
      assert(ns.has(q.entry)&&ns.get(q.entry).questId===q.id,q.id+': invalid entry node');
      const seen=new Set(), todo=[q.entry]; while(todo.length) { const id=todo.pop(); if(seen.has(id))continue; seen.add(id); todo.push(...edges(ns.get(id))); }
      for(const n of p.nodes.filter(x=>x.questId===q.id))if(!seen.has(n.id))warnings.push(n.id+': unreachable from quest entry');
      if(![...seen].some(id=>ns.get(id).type==='end'))warnings.push(q.id+': no reachable ending');
    }
    assert(Array.isArray(p.bindings??[])&&(p.bindings??[]).length<=1000,'Too many bindings'); const bindings=new Set();
    for(const b of p.bindings??[]) { assert(idOK(b.id)&&!bindings.has(b.id),'Invalid/duplicate binding'); bindings.add(b.id); assert(['region','interact'].includes(b.kind),b.id+': unknown binding kind'); assert(idOK(b.targetId),b.id+': target ID required'); assert(Array.isArray(b.position)&&b.position.length===3&&b.position.every(Number.isFinite),b.id+': needs XYZ position'); if(b.kind==='region')assert(Number.isFinite(b.radius)&&b.radius>0&&b.radius<=10000,b.id+': invalid radius'); if(b.assetId)assert(idOK(b.assetId),b.id+': invalid asset ID'); }
    for(const t of p.triggers??[]) { assert(idOK(t.event)&&qs.has(t.questId),'Invalid quest trigger'); validCondition(t.condition,'trigger'); }
  } catch(e) { errors.push(e.message); }
  return {valid:errors.length===0,errors,warnings};
}
function stable(v) { if(Array.isArray(v))return '['+v.map(stable).join(',')+']'; if(v&&typeof v==='object')return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+stable(v[k])).join(',')+'}'; return JSON.stringify(v); }
function projectFingerprint(p) {
  const d=clone(p); d.bindings??=[]; d.triggers??=[]; for(const n of d.nodes){delete n.x;delete n.y;} delete d.editor;
  const str=stable(d); let h=2166136261; for(let i=0;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),16777619); return (h>>>0).toString(16).padStart(8,'0');
}
class EventBus {
  constructor(){this.listeners=new Map();this.errors=[];}
  on(type,fn){assert(typeof fn==='function','Listener must be a function');if(!this.listeners.has(type))this.listeners.set(type,new Set());this.listeners.get(type).add(fn);return ()=>this.listeners.get(type)?.delete(fn);}
  emit(type,payload){for(const fn of [...(this.listeners.get(type)??[]),...(this.listeners.get('*')??[])])try{fn(payload,type);}catch(e){this.errors.push({type,error:String(e.message??e)});if(this.errors.length>32)this.errors.shift();}}
  clear(){this.listeners.clear();}
}
class StoryEngine {
  constructor(project,{sessionId='session-'+Math.random().toString(36).slice(2),eventHistoryLimit=4096}={}) {
    const report=validateProject(project);assert(report.valid,report.errors.join('\n'));assert(idOK(sessionId),'Invalid session ID');
    assert(Number.isSafeInteger(eventHistoryLimit)&&eventHistoryLimit>=16&&eventHistoryLimit<=100000,'Invalid event history limit');
    this.project=clone(project);this.fingerprint=projectFingerprint(project);this.nodes=new Map(this.project.nodes.map(n=>[n.id,n]));this.bus=new EventBus();
    this.eventHistoryLimit=eventHistoryLimit;this.disposed=false;this.queue=[];this.processing=false;this.eventIds=new Set();this._budget=0;
    this.state={format:'storyworks-save',version:1,projectId:project.id,fingerprint:this.fingerprint,sessionId,clock:0,eventSequence:0,commandSequence:0,journalSequence:0,variables:clone(project.variables),flags:{},inventory:{},world:{},quests:{},journal:[],outbox:[],receipts:[],seenEvents:[]};
    for(const q of project.quests)this.state.quests[q.id]={status:'available',nodeId:null,progress:0,deadline:null,visits:{},history:[],error:null};
  }
  on(type,fn){this._alive();return this.bus.on(type,fn);}
  _alive(){assert(!this.disposed,'Story engine is disposed');}
  _notify(type,payload){this.bus.emit(type,clone(payload));}
  test(c){
    if(!c)return true;if(c.all)return c.all.every(v=>this.test(v));if(c.any)return c.any.some(v=>this.test(v));if(own(c,'not'))return !this.test(c.not);
    const source=c.source??'variable'; let v;
    if(source==='quest')v=this.state.quests[c.key]?.status;
    else { const group=source==='variable'?'variables':source==='flag'?'flags':source==='inventory'?'inventory':'world';v=this.state[group][c.key]; if(source==='inventory'&&v===undefined)v=0; }
    switch(c.op??'eq'){case 'eq':return v===c.value;case 'ne':return v!==c.value;case 'exists':return v!==undefined;case 'gt':return typeof v==='number'&&v>c.value;case 'gte':return typeof v==='number'&&v>=c.value;case 'lt':return typeof v==='number'&&v<c.value;case 'lte':return typeof v==='number'&&v<=c.value;default:return false;}
  }
  _schedule(job){this._alive();this.queue.push(job);if(this.processing)return;this.processing=true;this._budget=0;try{while(this.queue.length){assert(++this._budget<=512,'Event/transition safety limit exceeded');this.queue.shift()();}}catch(e){this.queue.length=0;this._notify('story.error',{message:e.message});throw e;}finally{this.processing=false;}}
  _q(id){const q=this.state.quests[id];assert(q,'Unknown quest '+id);return q;}
  startQuest(id){const q=this._q(id),def=this.project.quests.find(x=>x.id===id);if(q.status!=='available'||!this.test(def.requires))return false;this._schedule(()=>this._start(id));return true;}
  _start(id){const q=this._q(id),def=this.project.quests.find(x=>x.id===id);if(q.status!=='available'||!this.test(def.requires))return;q.status='active';q.error=null;this._notify('story.quest.started',{questId:id});this._enter(id,def.entry);}
  start(){this._schedule(()=>{for(const q of this.project.quests)if(q.autoStart)this._start(q.id);});}
  _journal(text,questId,nodeId){const entry={id:'journal-'+(++this.state.journalSequence),text,questId,nodeId,time:this.state.clock};this.state.journal.push(entry);if(this.state.journal.length>2000)this.state.journal.shift();this._notify('story.journal',entry);}
  _actions(actions,questId,nodeId,visit,scope='node'){
    for(const [i,a] of (actions??[]).entries()){
      if(a.type==='set')this.state.variables[a.key]=a.value;
      else if(a.type==='add'){const v=this.state.variables[a.key]??0;assert(typeof v==='number'&&Number.isFinite(v+a.value),'Cannot add to nonnumeric/overflowed variable '+a.key);this.state.variables[a.key]=v+a.value;}
      else if(a.type==='flag')this.state.flags[a.key]=a.value;
      else if(a.type==='journal')this._journal(a.text,questId,nodeId);
      else if(a.type==='startQuest')this.queue.push(()=>this._start(a.questId));
      else if(a.type==='command'){
        assert(this.state.outbox.length<2048,'Command outbox is full; host must acknowledge commands');
        const command={id:`${this.state.sessionId}:${++this.state.commandSequence}`,questId,nodeId,visit,scope,index:i,command:a.command,payload:clone(a.payload??{}),time:this.state.clock};
        this.state.outbox.push(command);this._notify('story.command',command);
      }
    }
  }
  _enter(questId,nodeId){
    const q=this._q(questId);
    try {
      let target=nodeId;
      while(target&&q.status==='active'){
        assert(++this._budget<=512,'Automatic node cycle detected (512-transition limit)');
        const n=this.nodes.get(target);assert(n&&n.questId===questId,'Invalid node transition');q.nodeId=n.id;q.progress=0;q.deadline=null;
        const visit=(q.visits[n.id]??0)+1;q.visits[n.id]=visit;q.history.push(n.id);if(q.history.length>512)q.history.shift();
        this._notify('story.node.enter',{questId,nodeId:n.id,type:n.type});this._actions(n.actions,questId,n.id,visit);
        target=null;
        switch(n.type){
          case 'start':case 'action':target=n.next;break;
          case 'journal':this._journal(n.text,questId,n.id);target=n.next;break;
          case 'condition':target=this.test(n.condition)?n.then:n.else;break;
          case 'dialogue':this._notify('story.dialogue',{questId,nodeId:n.id,speaker:n.speaker??'',text:n.text,choices:this.choices(questId)});break;
          case 'objective':if(n.condition&&this.test(n.condition)){q.progress=1;target=n.next;}else this._notify('story.objective',{questId,nodeId:n.id,progress:0,goal:n.condition?1:n.goal??1});break;
          case 'delay':q.deadline=this.state.clock+n.seconds;if(n.seconds===0)target=n.next;break;
          case 'end':q.status=n.result??'completed';this._notify('story.quest.'+q.status,{questId,nodeId:n.id,title:n.title});break;
        }
      }
    }catch(e){q.status='error';q.error=e.message;throw e;}
  }
  current(id){const q=this._q(id);return q.nodeId?clone(this.nodes.get(q.nodeId)):null;}
  choices(id){const q=this._q(id),n=this.nodes.get(q.nodeId);if(q.status!=='active'||n?.type!=='dialogue')return [];return n.choices.map(c=>({...clone(c),enabled:this.test(c.condition)}));}
  choose(questId,choiceId){const q=this._q(questId),n=this.nodes.get(q.nodeId),c=n?.choices?.find(x=>x.id===choiceId);assert(q.status==='active'&&n?.type==='dialogue','Quest is not waiting for dialogue');assert(c,'Unknown dialogue choice');assert(this.test(c.condition),'That choice is locked');
    this._schedule(()=>{assert(q.nodeId===n.id,'Dialogue changed before choice was processed');this._actions(c.actions,questId,n.id,q.visits[n.id],'choice:'+c.id);this._notify('story.choice',{questId,nodeId:n.id,choiceId});this._enter(questId,c.next);this._reevaluate();});
  }
  _match(match,payload){return Object.entries(match??{}).every(([k,v])=>own(payload,k)&&payload[k]===v);}
  dispatch(type,payload={},options={}){
    this._alive();assert(idOK(type),'Invalid event name');safeJSON(payload);assert(payload&&typeof payload==='object'&&!Array.isArray(payload),'Event payload must be an object');
    if(type==='inventory.changed')assert(idOK(payload.itemId)&&Number.isSafeInteger(payload.count)&&payload.count>=0,'inventory.changed requires itemId and absolute nonnegative count');
    if(options.id!==undefined)assert(typeof options.id==='string'&&options.id.length>0&&options.id.length<=160,'Invalid event ID');
    if(options.id&&this.eventIds.has(options.id))return false;
    const id=options.id??`${this.state.sessionId}:event:${++this.state.eventSequence}`;
    if(this.eventIds.has(id))return false;
    this.eventIds.add(id);this.state.seenEvents.push(id);if(this.state.seenEvents.length>this.eventHistoryLimit)this.eventIds.delete(this.state.seenEvents.shift());
    const data=clone(payload);
    this._schedule(()=>{
      const active=Object.entries(this.state.quests).filter(([,q])=>q.status==='active').map(([questId,q])=>({questId,nodeId:q.nodeId,visit:q.visits[q.nodeId]}));
      if(type==='inventory.changed')this.state.inventory[data.itemId]=data.count;
      if(type==='world.time.changed'){if(typeof data.period==='string')this.state.world.period=data.period;if(Number.isFinite(data.hour))this.state.world.hour=data.hour;}
      if(type==='weather.changed'&&typeof data.preset==='string')this.state.world.weather=data.preset;
      if(type==='character.changed'&&idOK(data.key)&&scalar(data.value))this.state.world[data.key]=data.value;
      this._notify('story.event',{id,type,payload:data,time:this.state.clock});
      for(const {questId,nodeId,visit} of active){const q=this._q(questId),n=this.nodes.get(nodeId);if(q.status!=='active'||q.nodeId!==nodeId||q.visits[nodeId]!==visit)continue;
        if(n.type==='objective'&&!n.condition&&n.event===type&&this._match(n.match,data)){q.progress=Math.min(n.goal??1,q.progress+1);this._notify('story.objective',{questId,nodeId,progress:q.progress,goal:n.goal??1});if(q.progress>=(n.goal??1))this._enter(questId,n.next);}
      }
      for(const trigger of this.project.triggers??[])if(trigger.event===type&&this._match(trigger.match,data)&&this.test(trigger.condition))this._start(trigger.questId);
      this._reevaluate();
    });return true;
  }
  _reevaluate(){for(const [id,q]of Object.entries(this.state.quests)){const n=this.nodes.get(q.nodeId);if(q.status==='active'&&n?.type==='objective'&&n.condition&&this.test(n.condition)){q.progress=1;this._enter(id,n.next);}}for(const q of this.project.quests)if(q.autoStart)this._start(q.id);}
  update(deltaSeconds){this._alive();assert(Number.isFinite(deltaSeconds)&&deltaSeconds>=0&&deltaSeconds<=3600,'Delta must be between 0 and 3600 seconds');this._schedule(()=>{
    const target=this.state.clock+deltaSeconds;
    // Process deadlines chronologically, so chained delays are stable across different tick sizes.
    while(true){
      const due=Object.entries(this.state.quests).filter(([,q])=>q.status==='active'&&this.nodes.get(q.nodeId)?.type==='delay'&&q.deadline<=target).sort((a,b)=>a[1].deadline-b[1].deadline);
      if(!due.length)break;
      const [id,q]=due[0],n=this.nodes.get(q.nodeId);this.state.clock=Math.max(this.state.clock,q.deadline);this._enter(id,n.next);this._reevaluate();
    }
    this.state.clock=target;this._reevaluate();
  });}
  setVariable(key,value){this._alive();assert(idOK(key)&&scalar(value),'Invalid variable');this._schedule(()=>{this.state.variables[key]=value;this._reevaluate();this._notify('story.variable',{key,value});});}
  failQuest(id,reason='Failed by host'){this._schedule(()=>{const q=this._q(id);if(q.status!=='active')return;q.status='failed';q.deadline=null;this._notify('story.quest.failed',{questId:id,reason});});}
  pendingCommands(){return clone(this.state.outbox);}
  ackCommand(id){this._alive();const i=this.state.outbox.findIndex(c=>c.id===id);if(i<0)return false;this.state.outbox.splice(i,1);this.state.receipts.push(id);if(this.state.receipts.length>4096)this.state.receipts.shift();this._notify('story.command.ack',{id});return true;}
  getState(){return clone(this.state);}
  serialize(){this._alive();return clone(this.state);}
  loadSave(save){
    this._alive();safeJSON(save);assert(!this.processing,'Cannot load during event dispatch');
    assert(save.format==='storyworks-save'&&save.version===1&&save.projectId===this.project.id&&save.fingerprint===this.fingerprint,'Save belongs to a different story/revision');
    assert(idOK(save.sessionId)&&Number.isFinite(save.clock)&&save.clock>=0,'Invalid save header');
    for(const k of ['eventSequence','commandSequence','journalSequence'])assert(Number.isSafeInteger(save[k])&&save[k]>=0,'Invalid save sequence');
    for(const k of ['variables','flags','inventory','world','quests'])assert(save[k]&&typeof save[k]==='object'&&!Array.isArray(save[k]),'Invalid save '+k);
    for(const [k,v]of Object.entries(save.variables))assert(idOK(k)&&scalar(v),'Invalid saved variable');
    for(const [k,v]of Object.entries(save.flags))assert(idOK(k)&&typeof v==='boolean','Invalid saved flag');
    for(const [k,v]of Object.entries(save.inventory))assert(idOK(k)&&Number.isSafeInteger(v)&&v>=0,'Invalid saved inventory');
    for(const [k,v]of Object.entries(save.world))assert(idOK(k)&&scalar(v),'Invalid saved world state');
    assert(Object.keys(save.quests).length===this.project.quests.length,'Quest set mismatch');
    for(const def of this.project.quests){const q=save.quests[def.id],n=this.nodes.get(q?.nodeId);assert(q&&['available','active','completed','failed','error'].includes(q.status),'Invalid saved quest');assert((q.status==='available'&&q.nodeId===null)||(n&&n.questId===def.id),'Invalid saved node');assert(Number.isSafeInteger(q.progress)&&q.progress>=0&&q.progress<=100000,'Invalid objective progress');assert(q.deadline===null||(Number.isFinite(q.deadline)&&q.deadline>=0),'Invalid timer');assert(q.visits&&typeof q.visits==='object'&&!Array.isArray(q.visits),'Invalid visits');for(const [id,v]of Object.entries(q.visits))assert(this.nodes.get(id)?.questId===def.id&&Number.isSafeInteger(v)&&v>0,'Invalid visit');assert(Array.isArray(q.history)&&q.history.length<=512&&q.history.every(id=>this.nodes.get(id)?.questId===def.id),'Invalid history');if(q.status==='active')assert(['dialogue','objective','delay'].includes(n.type),'Active save must be at a blocking node');if(q.status==='active'&&n.type==='delay')assert(q.deadline!==null,'Active delay needs a deadline');}
    assert(Array.isArray(save.seenEvents)&&save.seenEvents.length<=100000&&save.seenEvents.every(x=>typeof x==='string'&&x.length<=160),'Invalid event history');
    assert(Array.isArray(save.receipts)&&save.receipts.length<=4096&&save.receipts.every(x=>typeof x==='string'),'Invalid receipts');
    assert(Array.isArray(save.journal)&&save.journal.length<=2000,'Invalid journal');for(const j of save.journal)assert(j&&typeof j.text==='string'&&typeof j.questId==='string'&&Number.isFinite(j.time),'Invalid journal entry');
    assert(Array.isArray(save.outbox)&&save.outbox.length<=2048,'Invalid command outbox');const ids=new Set();
    for(const c of save.outbox){assert(c&&typeof c.id==='string'&&!ids.has(c.id)&&!save.receipts.includes(c.id)&&idOK(c.command),'Invalid pending command');ids.add(c.id);assert(this.state.quests[c.questId]&&this.nodes.get(c.nodeId)?.questId===c.questId,'Invalid command source');assert(c.payload&&typeof c.payload==='object'&&!Array.isArray(c.payload),'Invalid command payload');}
    const next=clone(save);next.seenEvents=next.seenEvents.slice(-this.eventHistoryLimit);this.state=next;this.eventIds=new Set(next.seenEvents);this.queue.length=0;this._notify('story.loaded',{projectId:this.project.id});
    // Loading never executes node actions or replays commands. Call bridge.flush() explicitly.
  }
  dispose(){if(this.disposed)return;this.disposed=true;this.queue.length=0;this.bus.clear();}
}

/** Explicit bridge. Does not invent methods on other Worldworks engines. */

class WorldworksStoryBridge {
  constructor({engine,bus=new EventBus(),handlers={},worldworks=null,onError=()=>{}}={}) {
    if(!(engine instanceof StoryEngine))throw new Error('A StoryEngine is required');
    this.engine=engine;this.bus=bus;this.handlers={...handlers};this.worldworks=worldworks;this.onError=onError;this.off=[];this.inflight=new Set();this.inside=new Map();this.assets=new Map();this.disposed=false;this.diagnostics=[];
    for(const type of INPUT_EVENTS){const fn=(event={})=>{const {eventId,...payload}=event;try{engine.dispatch(type,payload,eventId?{id:eventId}:{});}catch(e){this._error(e,type);}};const off=bus.on(type,fn);if(typeof off==='function')this.off.push(off);else if(typeof bus.off==='function')this.off.push(()=>bus.off(type,fn));else throw new Error('Event bus on() must return unsubscribe or provide off()');}
    this.off.push(engine.on('*',(payload,type)=>{this.bus.emit(type,payload);if(type==='story.command')this._deliver(payload);}));
    if(worldworks)this.refreshWorld();
  }
  _error(error,source){const d={source,message:String(error.message??error)};this.diagnostics.push(d);if(this.diagnostics.length>50)this.diagnostics.shift();this.bus.emit('story.hook.error',d);try{this.onError(error,source);}catch{ /* diagnostics must not break the engine */ }}
  _deliver(command){
    if(this.disposed||this.inflight.has(command.id))return;
    const handler=this.handlers[command.command];
    if(typeof handler!=='function'){this.bus.emit('story.hook.unbound',clone(command));return;}
    this.inflight.add(command.id);
    const finish=result=>{this.inflight.delete(command.id);if(this.disposed)return;if(result===true||result?.ok===true)this.engine.ackCommand(command.id);else this._error(new Error('Handler did not acknowledge success; command remains pending'),command.command);};
    const failed=e=>{this.inflight.delete(command.id);if(!this.disposed)this._error(e,command.command);};
    try {const r=handler(clone(command.payload),clone(command));if(r&&typeof r.then==='function')Promise.resolve(r).then(finish,failed);else finish(r);}catch(e){failed(e);}
  }
  setHandler(command,handler){if(typeof handler!=='function')throw new Error('Handler must be a function');this.handlers[command]=handler;}
  flush(){if(this.disposed)throw new Error('Bridge is disposed');for(const c of this.engine.pendingCommands())this._deliver(c);}
  emit(type,payload={},eventId){if(this.disposed)throw new Error('Bridge is disposed');return this.engine.dispatch(type,payload,eventId?{id:eventId}:{});}
  enterRegion(regionId,{actorId='player',eventId}={}){return this.emit('world.region.enter',{regionId,actorId},eventId);}
  interact(entityOrAssetId,{actorId='player',eventId}={}){const b=this.engine.project.bindings?.find(x=>x.kind==='interact'&&(x.assetId===entityOrAssetId||x.id===entityOrAssetId||x.targetId===entityOrAssetId));return this.emit('world.interact',{entityId:b?.targetId??entityOrAssetId,assetId:b?.assetId??null,actorId},eventId);}
  defeated({entityId,kind,actorId='player',eventId}){return this.emit('combat.defeated',{entityId:entityId??kind,kind,actorId},eventId);}
  inventoryChanged(itemId,count,{actorId='player',eventId}={}){return this.emit('inventory.changed',{itemId,count,actorId},eventId);}
  refreshWorld(){if(!this.worldworks||typeof this.worldworks.exportProject!=='function')throw new Error('Expected Worldworks v0.1 exportProject()');const p=this.worldworks.exportProject();this.assets=new Map((p.assets??[]).map(a=>[a.id,a]));return p;}
  position(binding){const a=binding.assetId&&this.assets.get(binding.assetId);return a?[a.x,a.y,a.z]:binding.position;}
  update(deltaSeconds,position=null,actorId='player'){
    if(this.disposed)throw new Error('Bridge is disposed');
    if(!Number.isFinite(deltaSeconds)||deltaSeconds<0||deltaSeconds>3600)throw new Error('Delta must be 0–3600 seconds');
    if(position){const p=Array.isArray(position)?position:[position.x,position.y,position.z];if(p.length!==3||!p.every(Number.isFinite))throw new Error('Player position must be finite XYZ');
      for(const b of this.engine.project.bindings??[])if(b.kind==='region'){
        const c=this.position(b),key=actorId+'|'+b.id,was=this.inside.get(key)??false,dist=Math.hypot(p[0]-c[0],p[2]-c[2]);
        // Cylindrical trigger volume: XZ distance, no vertical limit. Exit hysteresis avoids edge chatter.
        const now=dist<=(b.radius+(was?0.3:0));this.inside.set(key,now);if(now!==was)this.emit(now?'world.region.enter':'world.region.exit',{regionId:b.targetId,bindingId:b.id,actorId});
      }
    }
    this.engine.update(deltaSeconds);
  }
  exportBundle(){if(!this.worldworks)throw new Error('Connect a Worldworks instance before exporting a world bundle');return {format:'worldworks-story-bundle',version:1,world:this.refreshWorld(),story:clone(this.engine.project),save:this.engine.serialize(),regions:[...this.inside.entries()]};}
  loadBundle(bundle,{worldCore=globalThis.WWCore}={}){
    if(!this.worldworks||typeof this.worldworks.loadProject!=='function')throw new Error('Worldworks loadProject() is required');
    if(bundle?.format!=='worldworks-story-bundle'||bundle.version!==1)throw new Error('Not a Worldworks story bundle');
    if(!worldCore||typeof worldCore.import!=='function')throw new Error('WWCore is required to prevalidate the world');
    if(this.inflight.size)throw new Error('Wait for in-flight host commands before loading');
    const testEngine=new StoryEngine(bundle.story);try{testEngine.loadSave(bundle.save);if(testEngine.fingerprint!==this.engine.fingerprint)throw new Error('Load the bundle story into a new engine before attaching this bridge');worldCore.import(bundle.world);if(!Array.isArray(bundle.regions??[])||(bundle.regions??[]).some(v=>!Array.isArray(v)||v.length!==2||typeof v[0]!=='string'||typeof v[1]!=='boolean'))throw new Error('Invalid saved trigger occupancy');}finally{testEngine.dispose();}
    this.worldworks.loadProject(clone(bundle.world));this.engine.loadSave(bundle.save);this.inside=new Map(bundle.regions??[]);this.refreshWorld();
    // Explicit flush() required: loading does not execute external effects automatically.
  }
  dispose(){if(this.disposed)return;this.disposed=true;for(const off of this.off)off();this.off.length=0;this.inflight.clear();this.inside.clear();}
}
function createWorldworksStory(options){return new WorldworksStoryBridge(options);}


root.StoryworksCore={StoryEngine,EventBus,WorldworksStoryBridge,createWorldworksStory,validateProject,projectFingerprint,NODE_TYPES,INPUT_EVENTS,COMMANDS};
})(globalThis);
