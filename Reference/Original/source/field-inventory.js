/* InventoryWorks owns consumable reserves and material transactions. */
(function(root){
 const C=root.LongwayCore;
 class FieldInventory{
  constructor(app){this.app=app;const def=(id,name,type,maxStack,weight,extra={})=>({id,name,type,rarity:'common',icon:'box',weight,value:1,maxStack,stats:{},salvage:{},...extra});
   this.engine=new InventoryworksCore.InventoryEngine({definitions:[def('rifle_ammo','AR-30 rounds','material',9999,.015),def('sidearm_ammo','Sidearm rounds','material',9999,.01),def('spares','Repair components','material',9999,.04),def('alloy','Recovered alloy','material',9999,.06),def('sample','Field samples','material',9999,.1)],recipes:[{id:'ammo',name:'Fabricate 30 rifle rounds',inputs:{alloy:6},output:{defId:'rifle_ammo',quantity:30},gold:0},{id:'parts',name:'Fabricate repair components',inputs:{alloy:3},output:{defId:'spares',quantity:4},gold:0},{id:'analyze',name:'Analyze a field sample',inputs:{sample:1},output:{defId:'alloy',quantity:4},gold:0}],backpackSize:32,weightLimit:200,seed:app.world.seed});
   const B=app.combat,S=app.systems;
   for(const [weapon,id]of [['rifle','rifle_ammo'],['sidearm','sidearm_ammo']]){this.setCount(id,B.ammo[weapon].reserve);Object.defineProperty(B.ammo[weapon],'reserve',{enumerable:true,configurable:true,get:()=>this.engine.count(id),set:n=>this.setCount(id,n)});}
   this.setCount('spares',S.spares);Object.defineProperty(S,'spares',{enumerable:true,configurable:true,get:()=>this.engine.count('spares'),set:n=>this.setCount('spares',n)});this.setCount('alloy',18);
   const f=app.flight,collect=f.collect.bind(f);f.collect=(...args)=>{const before=f.cargoCount(),result=collect(...args);if(f.cargoCount()>before)this.engine.addItem('sample',f.cargoCount()-before);return result;};
  }
  setCount(id,n){n=Math.max(0,Math.min(9999,Math.floor(Number(n)||0)));const old=this.engine.count(id);if(n>old){const r=this.engine.addItem(id,n-old);if(!r.ok)throw Error(r.error);}else if(n<old)this.spend(id,old-n);}
  spend(id,n){if(this.engine.count(id)<n)return false;for(const item of Object.values(this.engine.state.items)){if(item.defId!==id)continue;const q=Math.min(n,item.quantity);const r=this.engine.removeItem(item.id,q);if(!r.ok)return false;n-=q;if(!n)return true;}return n===0;}
  craft(id){const s=this.app.city.current;if(!s)return{ok:false,error:'Use a city fabrication terminal.'};const p=C.CityWorld.local(this.app.world,s.city.body,this.app.flight.position);if(Math.hypot(p[0]-s.building.x-7,p[2]-s.building.z+10)>3||p[1]>C.CityWorld.BASE+3)return{ok:false,error:'Move within 3 m of the fabrication terminal on floor 1 (operations room).'};const terminal=C.CityWorld.machinery(s.city,s.building).get('terminal');if(terminal.state.power<.05)return{ok:false,error:'Fabrication terminal needs power.'};return this.engine.craft(id);}
 }
 C.FieldInventory=FieldInventory;
})(globalThis);
