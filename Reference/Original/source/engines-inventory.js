/* Generated from the user's inventoryworks.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
(function(root){const VERSION = '1.0.0';
const FORMAT = 'inventoryworks-save';
const EQUIPMENT_SLOTS = ['head','body','hands','feet','mainhand','offhand','amulet','ring'];
const RARITIES = ['common','uncommon','rare','epic','legendary'];
const BASE_STATS = {damage:8,armor:0,magic:0,haste:0,luck:0,maxHealth:100,maxMana:100};
const copy = value => JSON.parse(JSON.stringify(value));
const own = (object,key) => Object.prototype.hasOwnProperty.call(object,key);
const safeId = value => typeof value === 'string' && /^[a-z][a-z0-9_-]{0,63}$/.test(value) && !['constructor','prototype','__proto__'].includes(value);
const check = (condition,message,code='INVALID') => { if (!condition) { const e = new Error(message); e.code = code; throw e; } };
const integer = (value,min,max,label) => check(Number.isSafeInteger(value) && value >= min && value <= max,`${label} must be an integer from ${min} to ${max}.`);
const finite = (value,min,max,label) => check(Number.isFinite(value) && value >= min && value <= max,`${label} is outside its allowed range.`);
const deepFreeze = object => { if (object && typeof object==='object' && !Object.isFrozen(object)) { Object.freeze(object); Object.values(object).forEach(deepFreeze); } return object; };
const item = (id,name,type,rarity,icon,weight,value,extra={}) => ({id,name,type,rarity,icon,weight,value,maxStack:1,description:'',stats:{},salvage:{},...extra});

const DEFINITIONS=[],RECIPES=[];
class InventoryEngine {
 #state; #listeners = new Map(); #disposed = false; #busy = false;
 constructor({definitions=DEFINITIONS,recipes=RECIPES,backpackSize=40,stashSize=56,lootSize=24,weightLimit=60,baseStats=BASE_STATS,seed=90210}={}) {
  integer(backpackSize,1,512,'Backpack size'); integer(stashSize,1,512,'Stash size'); integer(lootSize,1,512,'Loot size');
  finite(weightLimit,0.1,100000,'Weight limit'); integer(seed,1,0xffffffff,'Seed');
  this.definitions = deepFreeze(this.#validateDefinitions(definitions));
  this.recipes = deepFreeze(this.#validateRecipes(recipes));
  this.baseStats = deepFreeze({...BASE_STATS,...copy(baseStats)});
  for (const [k,v] of Object.entries(this.baseStats)) { check(own(BASE_STATS,k),'Unknown base stat.'); finite(v,0,100000,k); }
  check(this.baseStats.maxHealth>=1 && this.baseStats.maxMana>=1,'Maximum health and mana must be positive.');
  this.#state = {version:VERSION,revision:0,nextId:1,rng:seed,settings:{weightLimit},
   containers:{backpack:{size:backpackSize,slots:Array(backpackSize).fill(null)},stash:{size:stashSize,slots:Array(stashSize).fill(null)},loot:{size:lootSize,slots:Array(lootSize).fill(null)}},
   items:{},equipment:Object.fromEntries(EQUIPMENT_SLOTS.map(k=>[k,null])),hotbar:Array(6).fill(null),cooldowns:{},player:{health:baseStats.maxHealth??100,mana:baseStats.maxMana??100,gold:420,level:12}};
  this.#validate();
 }
 #validateDefinitions(definitions) {
  check(Array.isArray(definitions) && definitions.length>0 && definitions.length<=2048,'Provide 1–2048 definitions.'); const out={};
  for (const raw of definitions) {
   const d=copy(raw); check(safeId(d.id)&&!own(out,d.id),'Invalid or duplicate definition ID.');
   check(typeof d.name==='string'&&d.name.length>0&&d.name.length<=100,'Invalid item name.');
   check(['weapon','armor','accessory','consumable','material','quest'].includes(d.type),'Unknown item type.');
   check(RARITIES.includes(d.rarity),'Unknown rarity.');
   finite(d.weight,0,10000,'Weight'); integer(d.value,0,10000000,'Value'); integer(d.maxStack,1,9999,'Stack size');
   d.stats=d.stats||{}; d.salvage=d.salvage||{};
   check(typeof d.stats==='object'&&!Array.isArray(d.stats),'Invalid stats.');
   for (const [key,v] of Object.entries(d.stats)) { check(own(BASE_STATS,key),'Unknown equipment stat.'); finite(v,-1000,100000,'Stat'); }
   if(d.equipSlot) { check(EQUIPMENT_SLOTS.includes(d.equipSlot),'Invalid equipment slot.'); check(d.maxStack===1,'Equipment cannot stack.'); }
   if(d.twoHanded) check(d.equipSlot==='mainhand','Two-handed items must use the main hand.');
   if(d.durability!==undefined) integer(d.durability,1,100000,'Maximum durability');
   if(d.effect) { check(d.type==='consumable','Only consumables may have effects.'); for(const [k,v] of Object.entries(d.effect)) {check(['health','mana'].includes(k),'Unknown consumable effect.');finite(v,0,100000,'Effect');} }
   if(d.cooldown!==undefined) finite(d.cooldown,0,3600,'Cooldown');
   if(d.quest) check(d.type==='quest','Quest protection requires the quest type.');
   out[d.id]=d;
  }
  for(const d of Object.values(out)) for(const [id,q] of Object.entries(d.salvage)) {check(own(out,id),'Unknown salvage output.');integer(q,1,9999,'Salvage amount');}
  return out;
 }
 #validateRecipes(recipes) {
  check(Array.isArray(recipes)&&recipes.length<=2048,'Invalid recipes.'); const out={};
  for(const raw of recipes){ const r=copy(raw);check(safeId(r.id)&&!own(out,r.id),'Invalid recipe ID.');
   check(typeof r.name==='string'&&r.name.length<=100,'Invalid recipe name.'); check(r.inputs&&typeof r.inputs==='object'&&!Array.isArray(r.inputs),'Invalid recipe inputs.');
   check(Object.keys(r.inputs).length>0,'Recipes must have inputs.');
   for(const [id,q] of Object.entries(r.inputs)){check(own(this.definitions,id),'Unknown recipe ingredient.');integer(q,1,9999,'Ingredient quantity');}
   check(r.output&&own(this.definitions,r.output.defId),'Unknown recipe output.');integer(r.output.quantity,1,9999,'Output quantity');integer(r.gold,0,10000000,'Crafting cost');out[r.id]=r;
  } return out;
 }
 get state(){return copy(this.#state);}
 getStats(){const stats={...this.baseStats};for(const uid of Object.values(this.#state.equipment)){if(!uid)continue;const i=this.#state.items[uid],d=this.definitions[i.defId];if(i.durability===0)continue;for(const [key,v] of Object.entries(d.stats))stats[key]+=v;}stats.maxHealth=Math.max(1,stats.maxHealth);stats.maxMana=Math.max(1,stats.maxMana);return stats;}
 getWeight(){const s=this.#state;let value=0;for(const uid of [...s.containers.backpack.slots,...Object.values(s.equipment)])if(uid){const i=s.items[uid];value+=this.definitions[i.defId].weight*i.quantity;}return Math.round(value*1000)/1000;}
 getItem(uid){return own(this.#state.items,uid)?copy(this.#state.items[uid]):null;}
 locate(uid){for(const [container,c] of Object.entries(this.#state.containers)){const index=c.slots.indexOf(uid);if(index>=0)return {container,index};}for(const [slot,id] of Object.entries(this.#state.equipment))if(id===uid)return {slot};return null;}
 count(defId,container='backpack',{unlockedOnly=false}={}){const c=this.#container(container);return c.slots.reduce((sum,uid)=>{const i=uid&&this.#state.items[uid];return sum+(i&&i.defId===defId&&(!unlockedOnly||!i.locked)?i.quantity:0);},0);}
 on(type,listener){check(typeof listener==='function','Listener must be a function.');check(!this.#disposed,'Engine is disposed.');if(!this.#listeners.has(type))this.#listeners.set(type,new Set());this.#listeners.get(type).add(listener);return ()=>this.#listeners.get(type)?.delete(listener);}
 #emit(event){for(const key of [event.type,'*'])for(const fn of [...(this.#listeners.get(key)||[])]){try{fn(copy(event));}catch(e){console.error('InventoryWorks listener failed:',e);}}}
 #tx(type,operation){
  if(this.#disposed)return {ok:false,error:'Engine is disposed.',code:'DISPOSED'};
  if(this.#busy)return {ok:false,error:'Nested transactions are not allowed.',code:'BUSY'};
  const before=copy(this.#state);this.#busy=true;let value,event;
  try { value=operation();this.#normalize();this.#validate();this.#state.revision=before.revision+1;event={type,revision:this.#state.revision,payload:value??{},stats:this.getStats(),weight:this.getWeight()}; }
  catch(e){this.#state=before;this.#busy=false;return {ok:false,error:e.message,code:e.code||'INVALID'};}
  this.#busy=false;this.#emit(event);return {ok:true,value:copy(value??{}),event:copy(event)};
 }
 #normalize(){const s=this.#state,stats=this.getStats();s.player.health=Math.min(s.player.health,stats.maxHealth);s.player.mana=Math.min(s.player.mana,stats.maxMana);
  const carried=new Set([...s.containers.backpack.slots,...Object.values(s.equipment)].filter(Boolean).map(uid=>s.items[uid]?.defId));
  s.hotbar=s.hotbar.map(id=>id&&carried.has(id)?id:null);
 }
 #validate(){
  const s=this.#state; check(s&&typeof s==='object'&&!Array.isArray(s),'Save must be an object.');check(s.version===VERSION,'Unsupported save version.');
  integer(s.revision,0,Number.MAX_SAFE_INTEGER-1,'Revision');integer(s.nextId,1,Number.MAX_SAFE_INTEGER-1,'Next ID');integer(s.rng,1,0xffffffff,'Random state');
  check(s.settings&&Object.keys(s.settings).length===1,'Invalid settings.');finite(s.settings.weightLimit,0.1,100000,'Weight limit');
  check(s.items&&typeof s.items==='object'&&!Array.isArray(s.items)&&Object.keys(s.items).length<=4096,'Invalid item collection.');
  check(s.containers&&Object.keys(s.containers).sort().join(',')==='backpack,loot,stash','Invalid container set.');
  check(s.equipment&&Object.keys(s.equipment).sort().join(',')===[...EQUIPMENT_SLOTS].sort().join(','),'Invalid equipment set.');
  const seen=new Set();
  const visit=uid=>{if(uid===null)return;check(typeof uid==='string'&&/^i[1-9][0-9]*$/.test(uid)&&own(s.items,uid),'Slot references a missing item.');check(!seen.has(uid),'An item cannot occupy multiple slots.');seen.add(uid);};
  for(const c of Object.values(s.containers)){integer(c.size,1,512,'Container size');check(Array.isArray(c.slots)&&c.slots.length===c.size,'Invalid slot array.');c.slots.forEach(visit);}
  for(const [slot,uid] of Object.entries(s.equipment)){visit(uid);if(uid){const d=this.definitions[s.items[uid].defId];check(d&&d.equipSlot===slot,'Item does not fit this equipment slot.');}}
  check(seen.size===Object.keys(s.items).length,'Orphaned item in save.');
  let highest=0;
  for(const [uid,i] of Object.entries(s.items)){
   check(i&&typeof i==='object'&&i.id===uid,'Invalid item identity.');check(own(this.definitions,i.defId),'Unknown item definition.');const d=this.definitions[i.defId];
   integer(i.quantity,1,d.maxStack,'Item quantity');check(typeof i.locked==='boolean','Invalid item lock.');
   if(d.durability!==undefined)integer(i.durability,0,d.durability,'Durability');else check(i.durability===null,'Unexpected durability.');
   highest=Math.max(highest,Number(uid.slice(1)));
  }check(s.nextId>highest,'Next ID would collide with an existing item.');
  const main=s.equipment.mainhand&&s.items[s.equipment.mainhand];check(!(main&&this.definitions[main.defId].twoHanded&&s.equipment.offhand),'Two-handed weapon conflicts with off-hand item.');
  check(Array.isArray(s.hotbar)&&s.hotbar.length===6,'Invalid hotbar.');
  const carried=new Set([...s.containers.backpack.slots,...Object.values(s.equipment)].filter(Boolean).map(uid=>s.items[uid].defId));
  for(const id of s.hotbar)if(id!==null){check(own(this.definitions,id)&&carried.has(id),'Hotbar references an unavailable item.');check(this.definitions[id].effect||this.definitions[id].equipSlot,'Item cannot be assigned to the hotbar.');}
  check(s.cooldowns&&typeof s.cooldowns==='object'&&!Array.isArray(s.cooldowns),'Invalid cooldowns.');for(const [id,v] of Object.entries(s.cooldowns)){check(own(this.definitions,id),'Unknown cooldown item.');finite(v,0,3600,'Cooldown');}
  check(s.player&&typeof s.player==='object','Invalid player.');integer(s.player.gold,0,1000000000,'Gold');integer(s.player.level,1,9999,'Level');const stats=this.getStats();finite(s.player.health,0,stats.maxHealth,'Health');finite(s.player.mana,0,stats.maxMana,'Mana');
  check(this.getWeight()<=s.settings.weightLimit+1e-6,`Carry limit exceeded (${this.getWeight().toFixed(1)} / ${s.settings.weightLimit} kg).`,'OVERWEIGHT');
 }
 assertValid(){this.#validate();return true;}
 #container(id){check(typeof id==='string'&&own(this.#state.containers,id),'Unknown container.');return this.#state.containers[id];}
 #item(uid){check(typeof uid==='string'&&own(this.#state.items,uid),'Item no longer exists.','NOT_FOUND');return this.#state.items[uid];}
 #def(id){check(typeof id==='string'&&own(this.definitions,id),'Unknown item definition.');return this.definitions[id];}
 #unlink(uid){const l=this.locate(uid);check(l,'Item is not placed.');if(l.slot)this.#state.equipment[l.slot]=null;else this.#state.containers[l.container].slots[l.index]=null;return l;}
 #new(defId,quantity,{durability,locked=false}={}){const d=this.#def(defId);const id='i'+this.#state.nextId++;return this.#state.items[id]={id,defId,quantity,durability:d.durability===undefined?null:(durability??d.durability),locked};}
 #same(a,b){return a.defId===b.defId&&a.durability===b.durability&&a.locked===b.locked&&this.definitions[a.defId].maxStack>1;}
 #place(uid,container){const c=this.#container(container),i=this.#item(uid),d=this.definitions[i.defId];const touched=[];
  for(const other of c.slots){if(!other||other===uid)continue;const target=this.#state.items[other];if(this.#same(i,target)){const n=Math.min(i.quantity,d.maxStack-target.quantity);if(n>0){target.quantity+=n;i.quantity-=n;touched.push(other);}if(i.quantity===0){delete this.#state.items[uid];return touched;}}}
  const index=c.slots.indexOf(null);check(index!==-1,`${container} has no free slot.`,'FULL');c.slots[index]=uid;touched.push(uid);return touched;
 }
 #add(defId,quantity,container='backpack',options={}){const d=this.#def(defId);integer(quantity,1,100000,'Quantity');const ids=[];while(quantity>0){const n=Math.min(quantity,d.maxStack);const i=this.#new(defId,n,options);ids.push(...this.#place(i.id,container));quantity-=n;}return [...new Set(ids)];}
 addItem(defId,quantity=1,container='backpack',options={}){return this.#tx('inventory:added',()=>({defId,quantity,container,ids:this.#add(defId,quantity,container,options)}));}
 transfer(uid,toContainer,quantity){return this.#tx('inventory:transferred',()=>{const i=this.#item(uid);const q=quantity??i.quantity;integer(q,1,i.quantity,'Transfer quantity');const from=this.locate(uid);check(from.container!==toContainer,'Item is already in that container.');let ids;
   if(q===i.quantity){this.#unlink(uid);ids=this.#place(uid,toContainer);}else {i.quantity-=q;const split=this.#new(i.defId,q,i);ids=this.#place(split.id,toContainer);}return {uid,defId:i.defId,quantity:q,from,toContainer,ids};});}
 moveItem(uid,toContainer,toIndex,quantity){return this.#tx('inventory:moved',()=>{const source=this.#item(uid),c=this.#container(toContainer);integer(toIndex,0,c.size-1,'Destination slot');const q=quantity??source.quantity;integer(q,1,source.quantity,'Move quantity');const from=this.locate(uid),targetUid=c.slots[toIndex];check(uid!==targetUid,'This is already the selected slot.');const target=targetUid&&this.#item(targetUid);
  if(target&&this.#same(source,target)){check(target.quantity+q<=this.definitions[target.defId].maxStack,'The destination stack is full.','FULL');target.quantity+=q;source.quantity-=q;if(!source.quantity){this.#unlink(uid);delete this.#state.items[uid];}}
  else if(target){check(q===source.quantity,'A partial stack can only move into an empty or matching slot.');check(from.container,'Unequip before swapping equipment with a container item.');this.#state.containers[from.container].slots[from.index]=targetUid;c.slots[toIndex]=uid;}
  else if(q===source.quantity){this.#unlink(uid);c.slots[toIndex]=uid;}
  else{source.quantity-=q;c.slots[toIndex]=this.#new(source.defId,q,source).id;}
  return {uid,toContainer,toIndex,quantity:q};});}
 splitStack(uid,quantity,toContainer){return this.#tx('inventory:split',()=>{const i=this.#item(uid),from=this.locate(uid);check(from.container,'Equipped items cannot be split.');integer(quantity,1,i.quantity-1,'Split quantity');const target=toContainer??from.container,c=this.#container(target),index=c.slots.indexOf(null);check(index>=0,'No empty slot for the split stack.','FULL');i.quantity-=quantity;const n=this.#new(i.defId,quantity,i);c.slots[index]=n.id;return {uid,newId:n.id,quantity,container:target};});}
 sort(container='backpack',by='type'){return this.#tx('inventory:sorted',()=>{check(['type','name','rarity','weight'].includes(by),'Unknown sort order.');const c=this.#container(container),uids=c.slots.filter(Boolean),retained=[];
  for(const uid of uids){const i=this.#state.items[uid];for(const id of retained){const a=this.#state.items[id];if(this.#same(i,a)){const n=Math.min(i.quantity,this.definitions[i.defId].maxStack-a.quantity);a.quantity+=n;i.quantity-=n;if(!i.quantity)break;}}if(i.quantity)retained.push(uid);else delete this.#state.items[uid];}
  retained.sort((a,b)=>{const x=this.definitions[this.#state.items[a].defId],y=this.definitions[this.#state.items[b].defId];let n=0;if(by==='type')n=x.type.localeCompare(y.type);if(by==='rarity')n=RARITIES.indexOf(y.rarity)-RARITIES.indexOf(x.rarity);if(by==='weight')n=y.weight-x.weight;return n||x.name.localeCompare(y.name)||a.localeCompare(b);});c.slots=[...retained,...Array(c.size-retained.length).fill(null)];return {container,by};});}
 #equip(uid,slot){const i=this.#item(uid),d=this.definitions[i.defId];const target=slot??d.equipSlot;check(d.equipSlot&&d.equipSlot===target,'This item does not fit that equipment slot.','SLOT');check(this.locate(uid)?.container==='backpack','Equipment must be in your backpack.');
  this.#unlink(uid);const displaced=[];const stow=key=>{const old=this.#state.equipment[key];if(old){this.#state.equipment[key]=null;displaced.push(old);this.#place(old,'backpack');}};
  stow(target);if(d.twoHanded)stow('offhand');if(target==='offhand'){const main=this.#state.equipment.mainhand; if(main&&this.definitions[this.#state.items[main].defId].twoHanded)stow('mainhand');}
  this.#state.equipment[target]=uid;return {uid,defId:i.defId,slot:target,displaced};
 }
 equip(uid,slot){return this.#tx('equipment:changed',()=>this.#equip(uid,slot));}
 unequip(slot,toContainer='backpack'){return this.#tx('equipment:changed',()=>{check(EQUIPMENT_SLOTS.includes(slot),'Unknown equipment slot.');const uid=this.#state.equipment[slot];check(uid,'This equipment slot is empty.');this.#state.equipment[slot]=null;this.#place(uid,toContainer);return {uid,slot,toContainer,unequipped:true};});}
 compare(uid){const candidate=this.#item(uid),d=this.definitions[candidate.defId];check(d.equipSlot,'This item is not equipment.');const before=this.getStats(),after={...before};const slots=new Set([d.equipSlot]);if(d.twoHanded)slots.add('offhand');if(d.equipSlot==='offhand'){const m=this.#state.equipment.mainhand;if(m&&this.definitions[this.#state.items[m].defId].twoHanded)slots.add('mainhand');}
  for(const slot of slots){const old=this.#state.equipment[slot];if(old){const i=this.#state.items[old];if(i.durability!==0)for(const [k,v]of Object.entries(this.definitions[i.defId].stats))after[k]-=v;}}
  if(candidate.durability!==0)for(const[k,v]of Object.entries(d.stats))after[k]+=v;return Object.fromEntries(Object.keys(before).map(k=>[k,after[k]-before[k]]));}
 setLocked(uid,locked){return this.#tx('inventory:locked',()=>{check(typeof locked==='boolean','Lock must be a boolean.');this.#item(uid).locked=locked;return {uid,locked};});}
 #consumable(uid){const i=this.#item(uid),d=this.definitions[i.defId];check(this.locate(uid)?.container==='backpack','Consumables must be in your backpack.');check(d.effect,'This item cannot be consumed.');check(!i.locked,'Unlock this item before using it.','LOCKED');check(!(this.#state.cooldowns[i.defId]>0),'This item is cooling down.','COOLDOWN');
  const p=this.#state.player,stats=this.getStats(),health=Math.min(d.effect.health||0,stats.maxHealth-p.health),mana=Math.min(d.effect.mana||0,stats.maxMana-p.mana);check(health>0||mana>0,'Your relevant resources are already full.','FULL_RESOURCE');p.health+=health;p.mana+=mana;this.#state.cooldowns[i.defId]=d.cooldown||0;const defId=i.defId;i.quantity--;if(i.quantity===0){this.#unlink(uid);delete this.#state.items[uid];}return {uid,defId,health,mana};
 }
 consume(uid){return this.#tx('item:used',()=>this.#consumable(uid));}
 assignHotbar(index,uid){return this.#tx('hotbar:changed',()=>{integer(index,0,5,'Hotbar index');if(uid===null){this.#state.hotbar[index]=null;return {index,defId:null};}const i=this.#item(uid),d=this.definitions[i.defId],l=this.locate(uid);check(l&&(l.container==='backpack'||l.slot),'Only carried items can be assigned.');check(d.effect||d.equipSlot,'Only consumables and equipment can be assigned.');this.#state.hotbar[index]=i.defId;return {index,defId:i.defId};});}
 activateHotbar(index){return this.#tx('hotbar:used',()=>{integer(index,0,5,'Hotbar index');const id=this.#state.hotbar[index];check(id,'This hotbar slot is empty.');const d=this.definitions[id];const uid=this.#state.containers.backpack.slots.find(uid=>uid&&this.#state.items[uid].defId===id&&(!d.effect||!this.#state.items[uid].locked));check(uid,'No usable copy is in the backpack.');return d.effect?this.#consumable(uid):this.#equip(uid);});}
 update(deltaSeconds){if(this.#disposed)return;finite(deltaSeconds,0,3600,'Delta seconds');let changed=false;for(const id of Object.keys(this.#state.cooldowns)){const n=Math.max(0,this.#state.cooldowns[id]-deltaSeconds);if(n===0){delete this.#state.cooldowns[id];changed=true;}else this.#state.cooldowns[id]=n;}if(changed)this.#emit({type:'cooldown:ready',revision:this.#state.revision,payload:{}});}
 setPlayer(changes){return this.#tx('player:changed',()=>{check(changes&&typeof changes==='object'&&!Array.isArray(changes),'Invalid player values.');for(const[k,v]of Object.entries(changes)){check(['health','mana','gold','level'].includes(k),'Unknown player property.');check(typeof v==='number'&&Number.isFinite(v),'Player values must be finite numbers.');this.#state.player[k]=v;}return copy(changes);});}
 setSettings(changes){return this.#tx('settings:changed',()=>{check(changes&&typeof changes==='object'&&!Array.isArray(changes),'Invalid settings.');for(const[k,v]of Object.entries(changes)){check(k==='weightLimit','Unknown setting.');this.#state.settings[k]=v;}return copy(changes);});}
 #remove(uid,quantity,protectedAction=true){const i=this.#item(uid),d=this.definitions[i.defId];integer(quantity,1,i.quantity,'Removal quantity');if(protectedAction){check(!i.locked,'Unlock this item first.','LOCKED');check(!d.quest,'Quest items are protected.','QUEST');}i.quantity-=quantity;if(!i.quantity){this.#unlink(uid);delete this.#state.items[uid];}}
 removeItem(uid,quantity){return this.#tx('inventory:removed',()=>{const i=this.#item(uid),q=quantity??i.quantity;const result={uid,defId:i.defId,quantity:q};this.#remove(uid,q);return result;});}
 #spend(defId,quantity){check(this.count(defId,'backpack',{unlockedOnly:true})>=quantity,`Not enough unlocked ${this.#def(defId).name}.`,'INGREDIENTS');for(const uid of [...this.#state.containers.backpack.slots]){if(!uid)continue;const i=this.#state.items[uid];if(i.defId!==defId||i.locked)continue;const n=Math.min(i.quantity,quantity);this.#remove(uid,n);quantity-=n;if(!quantity)break;}}
 #craft(recipeId,times){check(own(this.recipes,recipeId),'Unknown recipe.');integer(times,1,99,'Craft count');const r=this.recipes[recipeId];check(this.#state.player.gold>=r.gold*times,'Not enough gold.','GOLD');for(const [id,q]of Object.entries(r.inputs))this.#spend(id,q*times);this.#state.player.gold-=r.gold*times;const ids=this.#add(r.output.defId,r.output.quantity*times);return {recipeId,times,defId:r.output.defId,quantity:r.output.quantity*times,ids};}
 craft(recipeId,times=1){return this.#tx('inventory:crafted',()=>this.#craft(recipeId,times));}
 canCraft(recipeId,times=1){const s=copy(this.#state);try{this.#craft(recipeId,times);this.#normalize();this.#validate();return {ok:true};}catch(e){return {ok:false,error:e.message,code:e.code||'INVALID'};}finally{this.#state=s;}}
 salvage(uid){return this.#tx('inventory:salvaged',()=>{const i=this.#item(uid),d=this.definitions[i.defId];check(this.locate(uid)?.container==='backpack','Salvage from the backpack only.');check(Object.keys(d.salvage).length>0,'This item has no salvage materials.');this.#remove(uid,1);for(const[id,q]of Object.entries(d.salvage))this.#add(id,q);return {uid,defId:d.id,materials:copy(d.salvage)};});}
 damageEquipment(slot,amount){return this.#tx('equipment:damaged',()=>{check(EQUIPMENT_SLOTS.includes(slot),'Invalid equipment slot.');integer(amount,1,100000,'Durability damage');const uid=this.#state.equipment[slot];check(uid,'No item in that slot.');const i=this.#item(uid);check(i.durability!==null,'This item does not have durability.');i.durability=Math.max(0,i.durability-amount);return {uid,slot,durability:i.durability,broken:i.durability===0};});}
 repairCost(uid){const i=this.#item(uid),d=this.definitions[i.defId];return i.durability===null?0:Math.ceil((d.durability-i.durability)/d.durability*d.value*0.25);}
 repair(uid){return this.#tx('equipment:repaired',()=>{const i=this.#item(uid),d=this.definitions[i.defId],l=this.locate(uid);check(l&&(l.slot||l.container==='backpack'),'Repair carried items only.');check(i.durability!==null&&i.durability<d.durability,'This item does not need repair.');const cost=this.repairCost(uid);check(this.#state.player.gold>=cost,'Not enough gold.','GOLD');this.#state.player.gold-=cost;i.durability=d.durability;return {uid,cost};});}
 buy(defId,quantity=1){return this.#tx('merchant:bought',()=>{const d=this.#def(defId);integer(quantity,1,9999,'Purchase quantity');check(!d.quest&&d.value>0,'This item is not for sale.');const cost=d.value*quantity;check(this.#state.player.gold>=cost,'Not enough gold.','GOLD');this.#state.player.gold-=cost;const ids=this.#add(defId,quantity);return {defId,quantity,cost,ids};});}
 sell(uid,quantity){return this.#tx('merchant:sold',()=>{const i=this.#item(uid),d=this.definitions[i.defId];check(this.locate(uid)?.container==='backpack','Sell from the backpack only.');const q=quantity??i.quantity;const earned=Math.floor(d.value*0.4)*q;check(earned>0,'This item has no resale value.');this.#remove(uid,q);this.#state.player.gold+=earned;return {uid,defId:d.id,quantity:q,earned};});}
 #random(){let x=this.#state.rng;x^=x<<13;x^=x>>>17;x^=x<<5;this.#state.rng=x>>>0;return this.#state.rng/4294967296;}
 generateLoot(rolls=6){return this.#tx('loot:generated',()=>{integer(rolls,1,24,'Loot rolls');const pools=[['iron','wood','fiber','leather','health_potion','ration'],['herb','mana_potion','ranger_bow','scout_hood','boots','iron_shield'],['crystal','frost_axe','arc_staff','warden_helm','moon_amulet'],['ember','ember_sword','plate_armor','gold_ring'],['greatsword']].map(p=>p.filter(id=>own(this.definitions,id)));const ids=[];
  for(let n=0;n<rolls;n++){const r=this.#random(),tier=r<.48?0:r<.78?1:r<.93?2:r<.99?3:4;const pool=pools[tier].length?pools[tier]:Object.keys(this.definitions).filter(id=>!this.definitions[id].quest);check(pool.length,'No eligible loot items.');const id=pool[Math.floor(this.#random()*pool.length)],d=this.definitions[id],q=d.type==='material'?2+Math.floor(this.#random()*6):d.type==='consumable'?1+Math.floor(this.#random()*3):1;ids.push(...this.#add(id,q,'loot'));}return {rolls,ids:[...new Set(ids)]};});}
 takeAll(from='loot',to='backpack'){return this.#tx('loot:taken',()=>{check(from!==to,'Choose a different destination.');const ids=[...this.#container(from).slots.filter(Boolean)];check(ids.length,'This container is empty.');for(const uid of ids){this.#unlink(uid);this.#place(uid,to);}return {from,to,stacks:ids.length};});}
 serialize(){return JSON.stringify({format:FORMAT,version:VERSION,state:this.#state},null,2);}
 load(input){return this.#tx('inventory:loaded',()=>{if(typeof input==='string')check(input.length<=2000000,'Save file exceeds 2 MB.');const data=typeof input==='string'?JSON.parse(input):copy(input);check(data&&data.format===FORMAT&&data.version===VERSION,'This is not a supported InventoryWorks save.');const candidate=copy(data.state);const old=this.#state;this.#state=candidate;try{this.#validate();}catch(e){this.#state=old;throw e;}return {loaded:true};});}
 snapshot(){return this.state;}
 rebuild(){return this.snapshot();}
 dispose(){this.#listeners.clear();this.#disposed=true;}
}
root.InventoryworksCore={InventoryEngine};})(globalThis);
