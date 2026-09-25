// One source of truth for render geometry, walking, bulkheads, lifts and work stations.
// Coordinates are metres, with positive z running aft and y at standing eye height.
export function productionLayout(craft) {
 const f=craft.family,L=craft.dimensions[0],capital=f===9,corvette=f===7,medium=[2,5,6].includes(f);
 const levels=capital?4:corvette?3:medium?2:1,end=capital?108:corvette?52:medium?16:7.7;
 const plan={family:f,end,rooms:[],fixtures:[],doors:[],stations:[],decks:[],lifts:[]};
 const room=(id,name,x0,x1,z0,z1,deck)=>plan.rooms.push({id,name,x0,x1,z0,z1,deck,y:-deck*3.3});
 const item=(id,type,x,z,w,d,h,deck)=>plan.fixtures.push({id,type,x,z,w,d,h,deck,y:-deck*3.3,solid:true});
 const station=(id,name,x,z,deck)=>plan.stations.push({id,name,x,z,deck,y:-deck*3.3});
 const door=(id,name,axis,x,z,width,deck)=>plan.doors.push({id,name,axis,x,z,width,deck,y:-deck*3.3});
 const deckNames=capital?['COMMAND / HABITATION','SCIENCE / MEDICAL','ENGINEERING / WORKSHOPS','FREIGHT / FLIGHT SUPPORT']:corvette?['BRIDGE / CREW','SCIENCE / ENGINEERING','CARGO / AIRLOCK']:medium?['FLIGHT / CREW','WORK DECK / AIRLOCK']:['FLIGHT / UTILITY'];
 for(let deck=0;deck<levels;deck++){
  plan.decks.push({index:deck,name:deckNames[deck],y:-deck*3.3});
  room('corridor-'+deck,'CENTRAL PASSAGE',-1.25,1.25,deck===0?-1.4:2,end,deck);
  if(deck===0)room('bridge','FLIGHT DECK',-1.9,1.9,-1.45,7.7,deck);
  if(levels>1)plan.lifts.push({id:'central-lift',name:'SERVICE LIFT',x:0,z:5,deck,y:-deck*3.3});
  if(!medium&&!capital&&!corvette){
   item('crew-bunk','bunk',1.23,3.8,1.1,2.0,2.25,0);item('utility-locker','locker',-1.45,3.6,.65,2.4,1.3,0);
   station('engineering','SERVICE PANEL',-1.0,6.1,0);station('airlock','AIRLOCK',0,7.1,0);break;
  }
  const width=capital?12:corvette?6:4.2,start=capital||corvette?8:7.8;
  const n=capital?6:corvette?4:2,span=(end-start-2)/n;
  const functions=deck===0?['quarters','mess','quarters','operations','briefing','observation']:deck===1&&capital?['medical','science','hydroponics','science','medical','storage']:deck===levels-1?['cargo','cargo','workshop','cargo','hangar','engineering']:['engineering','workshop','life-support','engineering','storage','workshop'];
  for(let k=0;k<n;k++)for(let side of [-1,1]){
   const role=functions[(k+(side>0?1:0))%functions.length],a=start+k*span,b=a+span-.35;
   const x0=side<0?-width:1.2,x1=side<0?-1.2:width,cx=(x0+x1)/2,cz=(a+b)/2,id=role+'-'+deck+'-'+k+'-'+side;
   room(id,role.toUpperCase().replace('-',' '),x0,x1,a,b,deck);
   door(id+'-door',role.toUpperCase()+' BULKHEAD','x',side*1.22,cz,1.55,deck);
   const outer=side*(width-.7),w=Math.min(1.5,(x1-x0)*.38);
   if(role==='quarters') {for(let j=0;j<Math.max(1,Math.floor((b-a)/2.5));j++)item(id+j,'bunk',outer-side*.2,a+1.25+j*2.5,w,2.1,2.25,deck);item(id+'lock','locker',cx,b-.55,Math.max(.6,x1-x0-1),.65,2.3,deck);}
   else if(role==='mess'||role==='briefing'||role==='observation'){item(id+'table','table',cx,cz,medium?.85:Math.min(1.4,x1-x0-1),medium?1.1:Math.min(2.4,span*.48),.83,deck);item(id+'bench','bench',outer,cz,.65,Math.min(2.6,span*.5),.9,deck);item(id+'galley','locker',cx,b-.6,Math.max(.6,x1-x0-1),.7,1.2,deck);}
   else if(role==='engineering'||role==='life-support') {item(id+'reactor','reactor',outer-side*.45,cz,1.4,1.8,2.45,deck);item(id+'rack','rack',cx,b-.6,Math.max(.7,x1-x0-1),.8,2.6,deck);station('engineering','ENGINEERING / '+id,side*2.1,cz,deck);}
   else if(role==='medical'){item(id+'bed','medical',outer-side*.25,cz,1.15,2.3,.85,deck);item(id+'cabinet','locker',cx,b-.6,1.4,.7,2.2,deck);station('medical','MEDICAL BAY',side*2.1,cz,deck);}
   else if(role==='science'||role==='hydroponics'){item(id+'bench','science',outer,cz,1.2,Math.min(3,span*.6),1.1,deck);station('science','RESEARCH STATION',side*2.1,cz,deck);}
   else {for(let j=0;j<Math.max(1,Math.floor((b-a)/3));j++)item(id+j,role==='workshop'?'rack':'crate',outer-side*.3,a+1.2+j*3,Math.min(2,x1-x0-1.2),1.8,role==='workshop'?2.2:1.25,deck);station(role==='cargo'||role==='hangar'?'cargo':'engineering',role.toUpperCase(),side*2.1,cz,deck);}
  }
  station('airlock','AFT AIRLOCK',0,end-1,deck);door('aft-'+deck,'AFT BULKHEAD','z',0,end-2,2.1,deck);
 }
 station('pilot','PILOT STATION',0,0,0);
 return plan;
}
