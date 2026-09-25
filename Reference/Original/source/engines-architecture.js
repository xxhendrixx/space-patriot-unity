/* Generated from the user's architectureworks.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
/* ArchitectureWorks 0.1 — document model and topology. No renderer or DOM required. */
(function(root){'use strict';
const A={VERSION:'0.1.0',FORMAT:'architectureworks-project',MAX_ROOMS:64,MAX_ITEMS:300,MAX_LEVELS:8};
const EPS=1e-5,clone=x=>JSON.parse(JSON.stringify(x)),q=x=>Math.round(x*1000)/1000;
A.clone=clone;A.clamp=(x,a,b)=>Math.max(a,Math.min(b,x));A.snap=(v,s=.5)=>Math.round(v/s)*s;
A.uid=(p='id')=>p+'_'+(globalThis.crypto?.randomUUID?.()||Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9));
A.uses=['living','bedroom','kitchen','bathroom','study','hall','storage'];
A.catalog={
 sofa:{name:'Linen sofa',w:2.7,d:1.05,h:.9,category:'Living',icon:'sofa'},
 armchair:{name:'Lounge chair',w:1,d:1.0,h:.88,category:'Living',icon:'sofa'},
 coffee:{name:'Coffee table',w:1.35,d:.7,h:.42,category:'Living',icon:'table'},
 rug:{name:'Woven rug',w:3.4,d:2.5,h:.025,category:'Living',icon:'rug'},
 bed:{name:'Double bed',w:1.85,d:2.25,h:.95,category:'Bedroom',icon:'bed'},
 nightstand:{name:'Bedside table',w:.55,d:.48,h:.54,category:'Bedroom',icon:'table'},
 wardrobe:{name:'Oak wardrobe',w:1.7,d:.6,h:2.3,category:'Bedroom',icon:'cabinet'},
 dining:{name:'Dining set',w:2.65,d:2.6,h:1,category:'Kitchen',icon:'table'},
 counter:{name:'Kitchen counter',w:2.4,d:.65,h:1,category:'Kitchen',icon:'cabinet'},
 island:{name:'Kitchen island',w:2,d:1.05,h:1,category:'Kitchen',icon:'cabinet'},
 fridge:{name:'Refrigerator',w:.8,d:.75,h:2,category:'Kitchen',icon:'cabinet'},
 stove:{name:'Range & hood',w:.8,d:.68,h:2.35,category:'Kitchen',icon:'cabinet'},
 desk:{name:'Writing desk',w:1.6,d:1.15,h:1,category:'Study',icon:'table'},
 shelf:{name:'Bookcase',w:1.5,d:.38,h:2.1,category:'Study',icon:'cabinet'},
 tub:{name:'Freestanding bath',w:1.65,d:.82,h:.6,category:'Bathroom',icon:'bath'},
 toilet:{name:'Toilet',w:.48,d:.74,h:.85,category:'Bathroom',icon:'bath'},
 vanity:{name:'Washbasin',w:1.15,d:.55,h:1.6,category:'Bathroom',icon:'cabinet'},
 plant:{name:'Indoor plant',w:.7,d:.7,h:1.65,category:'Details',icon:'plant'},
 lamp:{name:'Floor lamp',w:.5,d:.5,h:1.65,category:'Details',icon:'lamp'},
 chest:{name:'Storage chest',w:1.15,d:.55,h:.6,category:'Details',icon:'cabinet'}
};
A.itemRect=function(item,pad=0){const c=A.catalog[item.type],r=(item.rot||0)*Math.PI/180,w=Math.abs(Math.cos(r))*c.w+Math.abs(Math.sin(r))*c.d,d=Math.abs(Math.sin(r))*c.w+Math.abs(Math.cos(r))*c.d;return{x:item.x-w/2-pad,z:item.z-d/2-pad,w:w+2*pad,d:d+2*pad};};
A.overlap=(a,b,pad=0)=>a.x < b.x+b.w-pad-EPS && a.x+a.w > b.x+pad+EPS && a.z < b.z+b.d-pad-EPS && a.z+a.d > b.z+pad+EPS;
A.inside=(r,x,z,pad=0)=>x>=r.x+pad-EPS&&x<=r.x+r.w-pad+EPS&&z>=r.z+pad-EPS&&z<=r.z+r.d-pad+EPS;
A.bounds=function(rooms){if(!rooms.length)return{x:-6,z:-5,w:12,d:10};const x=Math.min(...rooms.map(r=>r.x)),z=Math.min(...rooms.map(r=>r.z));return{x,z,w:Math.max(...rooms.map(r=>r.x+r.w))-x,d:Math.max(...rooms.map(r=>r.z+r.d))-z};};
A.roomAt=(doc,x,z,level=0)=>doc.levels[level]?.rooms.find(r=>A.inside(r,x,z))||null;
A.wallPoint=(w,t)=>w.axis==='x'?{x:t,z:w.fixed}:{x:w.fixed,z:t};
A.deriveWalls=function(level){
 const lines=new Map();
 for(const r of level.rooms){for(const [axis,fixed,a,b] of [['x',r.z,r.x,r.x+r.w],['x',r.z+r.d,r.x,r.x+r.w],['z',r.x,r.z,r.z+r.d],['z',r.x+r.w,r.z,r.z+r.d]]){const key=axis+':'+q(fixed);if(!lines.has(key))lines.set(key,[]);lines.get(key).push({axis,fixed:q(fixed),a:q(a),b:q(b),id:r.id});}}
 const walls=[];
 for(const edges of lines.values()){
  const pts=[...new Set(edges.flatMap(e=>[e.a,e.b]))].sort((a,b)=>a-b);let last=null;
  for(let i=0;i<pts.length-1;i++){const a=pts[i],b=pts[i+1],mid=(a+b)/2,owners=edges.filter(e=>mid>e.a-EPS&&mid<e.b+EPS).map(e=>e.id).sort();if(!owners.length)continue;const axis=edges[0].axis,fixed=edges[0].fixed;
   if(last&&last.b===a&&last.rooms.join('|')===owners.join('|'))last.b=b;else{last={axis,fixed,a,b,rooms:owners,exterior:owners.length===1};walls.push(last);}}
 }
 for(const w of walls){w.key=`${w.axis}:${w.fixed}:${w.a}:${w.b}`;w.length=q(w.b-w.a);const r=level.rooms.find(r=>r.id===w.rooms[0]);w.insideSign=(w.axis==='x'?r.z+r.d/2:r.x+r.w/2)>w.fixed?1:-1;}
 return walls;
};
A.openingWall=(level,o)=>A.deriveWalls(level).find(w=>w.axis===o.axis&&Math.abs(w.fixed-o.fixed)<EPS&&o.center-o.width/2>=w.a+.08-EPS&&o.center+o.width/2<=w.b-.08+EPS);
A.validateOpening=function(doc,level,o,ignoreId){const w=A.openingWall(level,o);if(!w)return'Opening must fit inside a wall, leaving at least 8 cm at each end.';if(o.kind==='window'&&!w.exterior)return'Windows belong on exterior walls.';if(o.width<.55||o.width>6)return'Opening width must be 0.55–6 m.';if(o.sill<0||o.height<.3||o.sill+o.height>doc.settings.height-.12)return'Opening height must fit below the ceiling.';if(o.kind==='door'&&o.sill!==0)return'Doors must start at the floor.';if(level.openings.some(a=>a.id!==ignoreId&&a.axis===o.axis&&Math.abs(a.fixed-o.fixed)<EPS&&Math.abs(a.center-o.center)<(a.width+o.width)/2+.1-EPS))return'Openings need at least 10 cm of wall between them.';return null;};
A.wallSegments=function(w,openings,height){
 const ops=openings.filter(o=>o.axis===w.axis&&Math.abs(o.fixed-w.fixed)<EPS&&o.center-o.width/2>=w.a-EPS&&o.center+o.width/2<=w.b+EPS),cuts=[...new Set([w.a,w.b,...ops.flatMap(o=>[o.center-o.width/2,o.center+o.width/2])])].sort((a,b)=>a-b),out=[];
 for(let i=0;i<cuts.length-1;i++){const a=cuts[i],b=cuts[i+1],mid=(a+b)/2,o=ops.find(o=>mid>o.center-o.width/2-EPS&&mid<o.center+o.width/2+EPS);if(!o)out.push({a,b,y:0,h:height});else{if(o.sill>0)out.push({a,b,y:0,h:Math.min(height,o.sill)});if(o.sill+o.height<height)out.push({a,b,y:o.sill+o.height,h:height-o.sill-o.height});}}
 return out.filter(s=>s.h>.001&&s.b-s.a>.001);
};
A.autoOpenings=function(doc,level){
 const walls=A.deriveWalls(level),ops=[];let n=0;
 const push=(w,kind,center,width,height,sill)=>ops.push({id:level.id+'_opening_'+(++n),axis:w.axis,fixed:w.fixed,center:q(center),width:q(width),height,sill,kind,open:kind==='door'&&!w.exterior});
 const front=walls.filter(w=>w.exterior&&w.axis==='x'&&w.insideSign<0&&w.length>=2.2).sort((a,b)=>b.fixed-a.fixed||b.length-a.length)[0]||walls.filter(w=>w.exterior&&w.length>=2.2)[0];
 for(const w of walls){const center=(w.a+w.b)/2;if(!w.exterior){if(w.length>=1.35)push(w,'door',center,Math.min(1.05,w.length-.3),2.2,0);continue;}if(w===front){push(w,'door',center,1.15,2.3,0);if(w.length>5.2){push(w,'window',w.a+w.length*.2,Math.min(2,w.length*.23),1.5,.75);push(w,'window',w.b-w.length*.2,Math.min(2,w.length*.23),1.5,.75);}continue;}if(w.length>=2){const r=level.rooms.find(r=>r.id===w.rooms[0]),bath=r.use==='bathroom';push(w,'window',center,Math.min(bath?1.2:2.6,w.length-.65),bath?.85:1.5,bath?1.35:.75);}}
 level.openings=ops.filter(o=>!A.validateOpening(doc,{...level,openings:ops},o,o.id));return level.openings;
};
A.rectSubtract=function(r,h){if(!h||!A.overlap(r,h))return[r];const x0=Math.max(r.x,h.x),x1=Math.min(r.x+r.w,h.x+h.w),z0=Math.max(r.z,h.z),z1=Math.min(r.z+r.d,h.z+h.d);return[{x:r.x,z:r.z,w:r.w,d:z0-r.z},{x:r.x,z:z1,w:r.w,d:r.z+r.d-z1},{x:r.x,z:z0,w:x0-r.x,d:z1-z0},{x:x1,z:z0,w:r.x+r.w-x1,d:z1-z0}].filter(a=>a.w>.001&&a.d>.001);};
A.roofRects=function(rooms){if(!rooms.length)return[];const xs=[...new Set(rooms.flatMap(r=>[r.x,r.x+r.w]))].sort((a,b)=>a-b),zs=[...new Set(rooms.flatMap(r=>[r.z,r.z+r.d]))].sort((a,b)=>a-b),out=[];
 for(let j=0;j<zs.length-1;j++){let start=null;for(let i=0;i<xs.length;i++){const occupied=i<xs.length-1&&rooms.some(r=>A.inside(r,(xs[i]+xs[i+1])/2,(zs[j]+zs[j+1])/2));if(occupied&&start===null)start=xs[i];if(!occupied&&start!==null){const w=xs[i]-start,prev=out.find(r=>r.x===start&&Math.abs(r.w-w)<EPS&&Math.abs(r.z+r.d-zs[j])<EPS);if(prev)prev.d=zs[j+1]-prev.z;else out.push({x:start,z:zs[j],w,d:zs[j+1]-zs[j]});start=null;}}}return out;};
A.autoFurnish=function(doc,level){
 const out=[];const add=(type,x,z,rot=0)=>{const item={id:A.uid('furniture'),type,x:q(x),z:q(z),rot};const rect=A.itemRect(item,.08),r=level.rooms.find(r=>A.inside(r,rect.x,rect.z)&&A.inside(r,rect.x+rect.w,rect.z+rect.d));if(!r)return;if(doc.stair&&A.overlap(rect,{...doc.stair,w:doc.stair.w+.15,d:doc.stair.d+.2}))return;out.push(item);};
 for(const r of level.rooms){const x=r.x,z=r.z,cx=x+r.w/2,cz=z+r.d/2;
 switch(r.use){case'living':add('rug',cx,cz);add('sofa',cx,z+1.0,0);add('coffee',cx,z+2.6);add('armchair',x+1.05,z+2.8,90);add('plant',x+r.w-.65,z+.7);add('lamp',x+1,z+.65);break;
 case'bedroom':add('bed',cx,z+1.55);add('nightstand',cx-1.3,z+1);add('nightstand',cx+1.3,z+1);add('wardrobe',x+r.w-1.15,z+r.d-.7,180);add('plant',x+.6,z+r.d-.6);break;
 case'kitchen':add('counter',x+1.6,z+.55);add('fridge',x+r.w-.6,z+.6);add('stove',x+3.3,z+.55);if(r.d>4&&r.w>4.5)add('dining',cx,z+r.d-1.55);else add('island',cx,cz+.5);break;
 case'bathroom':add('tub',cx,z+.8);add('toilet',x+.55,z+r.d-1,180);add('vanity',x+r.w-.7,cz,90);add('plant',x+.5,cz);break;
 case'study':add('desk',cx,z+1.1);add('shelf',x+r.w-1.05,z+r.d-.48,180);add('armchair',x+.75,z+r.d-1.0,35);add('plant',x+r.w-.55,z+.65);break;
 case'storage':add('chest',cx,cz);add('shelf',cx,z+.4);break;
 case'hall':add('plant',x+.55,z+.6);break;}}
 level.furniture=out;return out;
};
A.preset=function(name='cedar'){
 const p={format:A.FORMAT,version:1,name:'Cedar House',settings:{height:3.15,thickness:.22,slab:.2,foundation:.32,roof:'gable',pitch:26,overhang:.45,facade:'cedar',wallColor:'#ece6d9',trim:'#2f3e39',roofColor:'#465555',porch:true},levels:[],stair:null};
 let layout=[['Living room','living',-7,0,8,5],['Kitchen & dining','kitchen',1,0,6,5],['Primary bedroom','bedroom',-7,-5,6,5],['Studio','study',-1,-5,5,5],['Bathroom','bathroom',4,-5,3,5]];
 if(name==='cottage'){p.name='Stone Cottage';p.settings.facade='stone';p.settings.roofColor='#4d535c';p.settings.pitch=36;layout=[['Living & dining','living',-5,0,6,4.5],['Kitchen','kitchen',1,0,4,4.5],['Bedroom','bedroom',-5,-4.5,6,4.5],['Bathroom','bathroom',1,-4.5,4,4.5]];}
 if(name==='modern'){p.name='Modern Pavilion';p.settings.roof='flat';p.settings.facade='plaster';p.settings.trim='#27393c';layout=[['Living room','living',-7,0,8,5],['Kitchen','kitchen',1,0,6,5],['Bedroom','bedroom',-7,-5,6,5],['Bathroom','bathroom',-1,-5,3,5],['Work room','study',2,-5,5,5]];}
 if(name==='townhouse'){p.name='Brick Townhouse';p.settings.roof='hip';p.settings.facade='brick';layout=[['Living room','living',-4,0,8,5],['Kitchen','kitchen',-4,-5,5,5],['Bathroom','bathroom',1,-5,3,5]];}
 if(name==='empty'){p.name='Untitled building';layout=[];p.settings.porch=false;}
 const l={id:'floor_0',name:'Ground floor',rooms:layout.map((r,i)=>({id:'room_0_'+i,name:r[0],use:r[1],x:r[2],z:r[3],w:r[4],d:r[5],finish:r[1]==='bathroom'?'tile':'oak'})),openings:[],furniture:[]};p.levels.push(l);A.autoOpenings(p,l);A.autoFurnish(p,l);if(name==='townhouse'){A.addLevel(p);const up=p.levels[1];up.rooms[0].name='Primary bedroom';up.rooms[0].use='bedroom';up.rooms[1].name='Study';up.rooms[1].use='study';A.autoFurnish(p,up);}return p;
};
A.addLevel=function(doc){if(doc.levels.length>=A.MAX_LEVELS)throw Error('This version supports up to three stories.');const source=doc.levels.at(-1);if(!source.rooms.length)throw Error('Draw at least one room first.');
 if(!doc.stair){const r=source.rooms.filter(r=>r.w>=3&&r.d>=4.8).sort((a,b)=>b.w*b.d-a.w*a.d)[0];if(!r)throw Error('A room at least 3 × 4.8 m is needed for the starter staircase.');doc.stair={x:r.x+.4,z:r.z+.4,w:1.2,d:3.65};}
 const k=doc.levels.length,l=clone(source);l.id='floor_'+k;l.name=k===1?'First floor':'Second floor';l.rooms.forEach((r,i)=>r.id='room_'+k+'_'+i);l.openings.forEach((o,i)=>o.id='opening_'+k+'_'+i);l.furniture.forEach(f=>f.id=A.uid('furniture'));doc.levels.push(l);
 for(const lv of doc.levels)lv.furniture=lv.furniture.filter(f=>!A.overlap(A.itemRect(f,.18),{...doc.stair,w:doc.stair.w+.2,d:doc.stair.d+.4}));return l;
};
A.stats=function(doc){let rooms=0,area=0,doors=0,windows=0,furniture=0,walls=0;for(const l of doc.levels){rooms+=l.rooms.length;area+=l.rooms.reduce((s,r)=>s+r.w*r.d,0);walls+=A.deriveWalls(l).length;doors+=l.openings.filter(o=>o.kind==='door').length;windows+=l.openings.filter(o=>o.kind==='window').length;furniture+=l.furniture.length;}return{rooms,area:q(area),doors,windows,furniture,walls,levels:doc.levels.length};};
A.checkRoom=function(doc,level,r,ignoreId){if(r.w<2||r.d<2)return'Rooms must be at least 2 × 2 m.';if(r.w>30||r.d>30||Math.abs(r.x)>60||Math.abs(r.z)>60)return'Keep rooms within the 120 m site; maximum room size is 30 m.';if(level.rooms.some(a=>a.id!==ignoreId&&A.overlap(r,a)))return'Rooms cannot overlap. Snap new rooms to the edge of an existing room.';if(doc.stair&&doc.levels.length>1&&!level.rooms.filter(a=>a.id!==ignoreId).concat(r).some(a=>A.inside(a,doc.stair.x,doc.stair.z)&&A.inside(a,doc.stair.x+doc.stair.w,doc.stair.z+doc.stair.d)))return'The stair shaft must remain inside one room on every floor.';return null;};
A.prune=function(doc,level){level.openings=level.openings.filter(o=>!!A.openingWall(level,o));level.furniture=level.furniture.filter(f=>{const r=A.itemRect(f);return level.rooms.some(a=>A.inside(a,r.x,r.z)&&A.inside(a,r.x+r.w,r.z+r.d));});};
A.validate=function(input){
 if(!input||typeof input!=='object'||input.format!==A.FORMAT||input.version!==1)throw Error('Not an ArchitectureWorks v1 project.');
 const d=clone(input),s=d.settings;if(!s||!Array.isArray(d.levels)||d.levels.length<1||d.levels.length>A.MAX_LEVELS)throw Error('Invalid project structure.');
 const finite=(v,a,b,label)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<a||v>b)throw Error('Invalid '+label+'.');};const text=(v,n,label)=>{if(typeof v!=='string'||v.length<1||v.length>n)throw Error('Invalid '+label+'.');};
 text(d.name,100,'name');finite(s.height,2.6,5,'story height');finite(s.thickness,.12,.5,'wall thickness');finite(s.slab,.1,.4,'slab');finite(s.foundation,0,2,'foundation');finite(s.pitch,5,50,'roof pitch');finite(s.overhang,0,1.2,'overhang');
 if(!['cedar','plaster','brick','stone'].includes(s.facade)||!['gable','hip','flat'].includes(s.roof))throw Error('Unknown building material or roof style.');
 for(const key of ['wallColor','trim','roofColor'])if(!/^#[0-9a-f]{6}$/i.test(s[key]))throw Error('Invalid color.');s.porch=!!s.porch;
 const ids=new Set();const id=v=>{text(v,120,'object ID');if(ids.has(v))throw Error('Duplicate object ID: '+v);ids.add(v);};
 for(const l of d.levels){id(l.id);text(l.name,80,'floor name');for(const arr of ['rooms','openings','furniture'])if(!Array.isArray(l[arr]))throw Error('Missing '+arr+'.');if(l.rooms.length>A.MAX_ROOMS||l.furniture.length>A.MAX_ITEMS||l.openings.length>256)throw Error('Project exceeds starter-engine limits.');
  for(const r of l.rooms){id(r.id);text(r.name,80,'room name');finite(r.x,-60,60,'room x');finite(r.z,-60,60,'room z');finite(r.w,2,30,'room width');finite(r.d,2,30,'room depth');if(!A.uses.includes(r.use)||!['oak','walnut','tile','concrete'].includes(r.finish))throw Error('Unknown room type or finish.');if(l.rooms.some(a=>a.id!==r.id&&A.overlap(r,a)))throw Error('Overlapping rooms in project.');}
  for(const o of l.openings){id(o.id);if(!['x','z'].includes(o.axis)||!['door','window'].includes(o.kind))throw Error('Invalid opening.');finite(o.fixed,-100,100,'opening line');finite(o.center,-100,100,'opening center');finite(o.width,.55,6,'opening width');finite(o.height,.3,4.8,'opening height');finite(o.sill,0,4.5,'opening sill');o.open=!!o.open;const e=A.validateOpening(d,l,o,o.id);if(e)throw Error(e);}
  for(const f of l.furniture){id(f.id);if(!A.catalog[f.type])throw Error('Unknown furniture type.');finite(f.x,-100,100,'furniture x');finite(f.z,-100,100,'furniture z');finite(f.rot,-360,360,'furniture rotation');const r=A.itemRect(f);if(!l.rooms.some(a=>A.inside(a,r.x,r.z)&&A.inside(a,r.x+r.w,r.z+r.d)))throw Error('Furniture must stay within a room.');}
 }
 if(d.levels.length>1&&!d.stair)throw Error('Multi-story projects need a stair shaft.');if(d.stair){const t=d.stair;finite(t.x,-60,60,'stair x');finite(t.z,-60,60,'stair z');finite(t.w,1,5,'stair width');finite(t.d,3,5,'stair depth');if(!d.levels.every(l=>l.rooms.some(r=>A.inside(r,t.x,t.z)&&A.inside(r,t.x+t.w,t.z+t.d))))throw Error('Stair shaft must fit on every floor.');}
 return d;
};
A.colliders=function(doc){const out=[];for(let k=0;k<doc.levels.length;k++){const l=doc.levels[k],base=doc.settings.foundation+k*doc.settings.height,t=doc.settings.thickness;
 for(const w of A.deriveWalls(l))for(const seg of A.wallSegments(w,l.openings,doc.settings.height)){const p=A.wallPoint(w,(seg.a+seg.b)/2);out.push({id:'wall:'+k+':'+w.key+':'+seg.a+':'+seg.y+':'+seg.h,kind:'wall',level:k,center:[p.x,base+seg.y+seg.h/2,p.z],size:w.axis==='x'?[seg.b-seg.a,seg.h,t]:[t,seg.h,seg.b-seg.a],rotationY:0});}
 for(const o of l.openings.filter(o=>o.kind==='door')){const p=A.wallPoint(o,o.center),yaw=o.axis==='x'?0:-Math.PI/2;let cx=p.x,cz=p.z;if(o.open){if(o.axis==='x'){cx-=o.width/2-.085;cz+=(o.width-.17)/2;}else{cx-=(o.width-.17)/2;cz-=o.width/2-.085;}}out.push({id:o.id,kind:'door',level:k,center:[cx,base+(o.height-.08)/2,cz],size:[o.width-.17,o.height-.08,.065],rotationY:yaw-(o.open?Math.PI/2:0),open:o.open});}
 for(const r of l.rooms)for(const a of A.rectSubtract(r,k>0?doc.stair:null))out.push({id:r.id+':slab:'+a.x+':'+a.z,roomId:r.id,kind:'floor',level:k,center:[a.x+a.w/2,base-doc.settings.slab/2,a.z+a.d/2],size:[a.w,doc.settings.slab,a.d],rotationY:0});
 for(const f of l.furniture){const c=A.catalog[f.type];if(['rug','lamp','plant'].includes(f.type))continue;out.push({id:f.id,kind:'furniture',level:k,center:[f.x,base+c.h/2,f.z],size:[c.w,c.h,c.d],rotationY:f.rot*Math.PI/180});}
 if(k<doc.levels.length-1&&doc.stair)out.push({id:'stair_'+k,kind:'stairRamp',level:k,x:doc.stair.x,z:doc.stair.z,w:doc.stair.w,d:doc.stair.d,y:base,rise:doc.settings.height});
 }return out;};
A.prefab=function(doc){return{format:'worldworks-building-prefab',version:1,name:doc.name,units:'meters',coordinateSystem:'right-handed-y-up',project:clone(doc),colliders:A.colliders(doc),roomVolumes:doc.levels.flatMap((l,k)=>l.rooms.map(r=>({id:r.id,name:r.name,use:r.use,level:k,min:[r.x,doc.settings.foundation+k*doc.settings.height,r.z],max:[r.x+r.w,doc.settings.foundation+(k+1)*doc.settings.height,r.z+r.d]}))),hooks:['architecture:room-enter','architecture:room-exit','architecture:door-changed','architecture:rebuilt']};};
root.ArchitectureCore=A;
})(globalThis);
/* ArchitectureWorks — shared procedural geometry. All dimensions are meters. */
(function(root){'use strict';const A=root.ArchitectureCore;
const rgb=h=>{const n=parseInt(h.replace('#',''),16);return[(n>>16&255)/255,(n>>8&255)/255,(n&255)/255];};
function materials(s){return{
 facade:{color:s.facade==='cedar'?'#927157':s.facade==='brick'?'#9b6958':s.facade==='stone'?'#93918a':s.wallColor,roughness:.86,texture:s.facade},
 plaster:{color:s.wallColor,roughness:.93,texture:'plaster'},trim:{color:s.trim,roughness:.43},roof:{color:s.roofColor,roughness:.8,texture:'roof'},
 oak:{color:'#bc9870',roughness:.67,texture:'oak'},walnut:{color:'#72513d',roughness:.67,texture:'oak'},tile:{color:'#bbc4b9',roughness:.42,texture:'tile'},concrete:{color:'#acaea1',roughness:.92,texture:'stone'},
 timber:{color:'#aa815b',roughness:.64,texture:'cedar'},darkwood:{color:'#695442',roughness:.7,texture:'oak'},linen:{color:'#d5cabc',roughness:.95,texture:'fabric'},sage:{color:'#708d7c',roughness:.95,texture:'fabric'},cushion:{color:'#b68b60',roughness:.93,texture:'fabric'},rug:{color:'#b2b1a0',roughness:1,texture:'rug'},
 white:{color:'#eeeade',roughness:.42},ceramic:{color:'#e5e6db',roughness:.22},black:{color:'#263436',roughness:.47},steel:{color:'#a1b1b3',roughness:.29,metalness:.85},brass:{color:'#b99c64',roughness:.34,metalness:.65},
 glass:{color:'#a1c8c8',roughness:.12,opacity:.28,metalness:.1},mirror:{color:'#9cb8bb',roughness:.13,metalness:.7},light:{color:'#fff0c8',roughness:.6,emissive:'#ffe0a0'},screen:{color:'#3b655f',roughness:.3,emissive:'#173b38'},
 soil:{color:'#555d40',roughness:1},leaf:{color:'#526e4c',roughness:1},leaflight:{color:'#7c9562',roughness:1},terracotta:{color:'#b58f74',roughness:.9},book1:{color:'#8d5b47',roughness:.8},book2:{color:'#527572',roughness:.8},book3:{color:'#d0ba8c',roughness:.8},
 ground:{color:'#768477',roughness:1,texture:'ground'},edge:{color:'#47574d',roughness:1},gravel:{color:'#b1afa0',roughness:1,texture:'stone'},water:{color:'#648e89',roughness:.15,metalness:.15,opacity:.8}
};}
const identity={x:0,y:0,z:0,yaw:0};
class Geometry{
 constructor(mats){this.materials=mats;this.map=new Map();this.level=0;this.layer='structure';this.transform=identity;}
 batch(mat){const key=[this.level,this.layer,mat].join('|');if(!this.map.has(key))this.map.set(key,{material:mat,level:this.level,layer:this.layer,positions:[],normals:[],uvs:[]});return this.map.get(key);}
 at(x,y,z,yaw,fn){const old=this.transform,c=Math.cos(old.yaw),s=Math.sin(old.yaw);this.transform={x:old.x+x*c+z*s,y:old.y+y,z:old.z-x*s+z*c,yaw:old.yaw+yaw};try{fn();}finally{this.transform=old;}}
 point(p){const t=this.transform,c=Math.cos(t.yaw),s=Math.sin(t.yaw);return[t.x+p[0]*c+p[2]*s,t.y+p[1],t.z-p[0]*s+p[2]*c];}
 normal(n){const c=Math.cos(this.transform.yaw),s=Math.sin(this.transform.yaw);return[n[0]*c+n[2]*s,n[1],-n[0]*s+n[2]*c];}
 tri(a,b,c,mat,uvs=null,normals=null){const dst=this.batch(mat),ab=b.map((v,i)=>v-a[i]),ac=c.map((v,i)=>v-a[i]);let n=[ab[1]*ac[2]-ab[2]*ac[1],ab[2]*ac[0]-ab[0]*ac[2],ab[0]*ac[1]-ab[1]*ac[0]],len=Math.hypot(...n)||1;n=n.map(v=>v/len);const ps=[a,b,c];for(let i=0;i<3;i++){dst.positions.push(...this.point(ps[i]));dst.normals.push(...this.normal(normals?normals[i]:n));dst.uvs.push(...(uvs?uvs[i]:[ps[i][0]/2,ps[i][2]/2]));}}
 quad(a,b,c,d,mat,uv){const u=uv||[[0,0],[Math.hypot(...b.map((v,i)=>v-a[i]))/2,0],[Math.hypot(...b.map((v,i)=>v-a[i]))/2,Math.hypot(...d.map((v,i)=>v-a[i]))/2],[0,Math.hypot(...d.map((v,i)=>v-a[i]))/2]];this.tri(a,b,c,mat,[u[0],u[1],u[2]]);this.tri(a,c,d,mat,[u[0],u[2],u[3]]);}
 box(x,y,z,w,h,d,mat,yaw=0){if(w<=.001||h<=.001||d<=.001)return;this.at(x,y,z,yaw,()=>{let X=w/2,Y=h/2,Z=d/2;this.quad([-X,-Y,Z],[X,-Y,Z],[X,Y,Z],[-X,Y,Z],mat);this.quad([X,-Y,-Z],[-X,-Y,-Z],[-X,Y,-Z],[X,Y,-Z],mat);this.quad([X,-Y,Z],[X,-Y,-Z],[X,Y,-Z],[X,Y,Z],mat);this.quad([-X,-Y,-Z],[-X,-Y,Z],[-X,Y,Z],[-X,Y,-Z],mat);this.quad([-X,Y,Z],[X,Y,Z],[X,Y,-Z],[-X,Y,-Z],mat,[[0,0],[w/2,0],[w/2,d/2],[0,d/2]]);this.quad([-X,-Y,-Z],[X,-Y,-Z],[X,-Y,Z],[-X,-Y,Z],mat);});}
 roundbox(x,y,z,w,h,d,rad,mat){const sizes=[w/2,h/2,d/2],r=Math.min(rad,...sizes),segments=4;this.at(x,y,z,0,()=>{for(let axis=0;axis<3;axis++)for(const sign of [-1,1]){const u=(axis+1)%3,v=(axis+2)%3;function vertex(i,j){const p=[0,0,0];p[axis]=sizes[axis]*sign;p[u]=(i/segments*2-1)*sizes[u];p[v]=(j/segments*2-1)*sizes[v];const inner=p.map((a,k)=>A.clamp(a,-sizes[k]+r,sizes[k]-r)),n=p.map((a,k)=>a-inner[k]),len=Math.hypot(...n)||1;return{p:inner.map((a,k)=>a+n[k]/len*r),n:n.map(a=>a/len),uv:[p[u]/2,p[v]/2]};}for(let i=0;i<segments;i++)for(let j=0;j<segments;j++){const vs=[vertex(i,j),vertex(i+1,j),vertex(i+1,j+1),vertex(i,j+1)];for(const inds of sign>0?[[0,1,2],[0,2,3]]:[[0,2,1],[0,3,2]])this.tri(...inds.map(k=>vs[k].p),mat,inds.map(k=>vs[k].uv),inds.map(k=>vs[k].n));}}});}
 cylinder(x,y,z,rt,rb,h,mat,n=16){this.at(x,y,z,0,()=>{for(let i=0;i<n;i++){const a=i/n*Math.PI*2,b=(i+1)/n*Math.PI*2,p=[Math.cos(a)*rb,-h/2,Math.sin(a)*rb],q=[Math.cos(b)*rb,-h/2,Math.sin(b)*rb],r=[Math.cos(b)*rt,h/2,Math.sin(b)*rt],s=[Math.cos(a)*rt,h/2,Math.sin(a)*rt];this.quad(q,p,s,r,mat);if(rt>0)this.tri([0,h/2,0],r,s,mat);if(rb>0)this.tri([0,-h/2,0],p,q,mat);}});}
 sphere(x,y,z,rx,ry,rz,mat,seg=10,rings=7){this.at(x,y,z,0,()=>{const pt=(i,j)=>{const a=i/seg*2*Math.PI,b=j/rings*Math.PI;return[Math.sin(b)*Math.cos(a)*rx,Math.cos(b)*ry,Math.sin(b)*Math.sin(a)*rz];};for(let j=0;j<rings;j++)for(let i=0;i<seg;i++){const vs=[pt(i,j),pt(i+1,j),pt(i+1,j+1),pt(i,j+1)];for(const is of [[0,2,1],[0,3,2]]){const ns=is.map(k=>{const p=vs[k],n=[p[0]/rx**2,p[1]/ry**2,p[2]/rz**2],l=Math.hypot(...n)||1;return n.map(v=>v/l);});this.tri(...is.map(k=>vs[k]),mat,null,ns);}}});}
 finish(){return [...this.map.values()].map(v=>({...v,positions:new Float32Array(v.positions),normals:new Float32Array(v.normals),uvs:new Float32Array(v.uvs)}));}
}
function plant(g,x,y,z,scale=1){g.at(x,y,z,0,()=>{g.cylinder(0,.16*scale,0,.2*scale,.15*scale,.32*scale,'terracotta');g.cylinder(0,.327*scale,0,.175*scale,.175*scale,.015*scale,'soil');for(let i=0;i<7;i++){const a=i*2.399,r=(.18+(i%3)*.04)*scale,h=(.75+i*.065)*scale;g.cylinder(0,h/2+.3*scale,0,.012*scale,.014*scale,h,'leaf',6);g.sphere(Math.cos(a)*r,h,Math.sin(a)*r,.14*scale,.32*scale,.09*scale,i%2?'leaf':'leaflight',7,5);}});}
function chair(g,x,z,rot=0){g.at(x,0,z,rot,()=>{for(const dx of [-.23,.23])for(const dz of [-.22,.22])g.box(dx,.23,dz,.045,.46,.045,'timber');g.roundbox(0,.49,0,.58,.12,.57,.045,'sage');g.roundbox(0,.76,-.255,.58,.55,.10,.04,'timber');});}
function legacyFurniture(g,f,base){g.at(f.x,base,f.z,f.rot*Math.PI/180,()=>{
 const box=(...a)=>g.box(...a),round=(...a)=>g.roundbox(...a);switch(f.type){
 case'sofa':case'armchair':{const w=f.type==='sofa'?2.7:1;for(const x of [-w/2+.15,w/2-.15])for(const z of [-.35,.35])box(x,.1,z,.085,.2,.085,'darkwood');round(0,.29,0,w,.26,1.02,.08,'linen');round(0,.65,-.4,w,.53,.22,.085,'linen');for(const x of [-w/2+.10,w/2-.1])round(x,.51,0,.2,.5,1.05,.08,'linen');const n=f.type==='sofa'?3:1;for(let i=0;i<n;i++){let x=(i-(n-1)/2)*(w-.42)/n;round(x,.475,.05,(w-.43)/n-.025,.2,.68,.07,'linen');round(x,.685,-.235,(w-.46)/n-.03,.38,.17,.075,'linen');}if(n===3){round(-.88,.67,.035,.37,.36,.18,.075,'sage');round(.89,.67,.035,.37,.36,.18,.075,'cushion');}break;}
 case'coffee':for(const x of [-.5,.5])for(const z of [-.22,.22])box(x,.18,z,.055,.36,.055,'darkwood');round(0,.39,0,1.35,.09,.7,.035,'timber');box(.3,.45,0,.28,.035,.19,'book2');g.cylinder(-.28,.485,0,.08,.07,.13,'ceramic');break;
 case'rug':round(0,.016,0,3.4,.022,2.5,.01,'rug');for(const x of [-1.65,1.65])box(x,.03,0,.025,.009,2.4,'darkwood');break;
 case'bed':for(const x of [-.72,.72])for(const z of [-.86,.86])box(x,.13,z,.09,.26,.09,'darkwood');round(0,.30,.03,1.85,.28,2.17,.06,'timber');round(0,.56,.09,1.76,.30,2.1,.10,'linen');round(0,.86,-1.045,1.88,.7,.13,.05,'sage');round(0,.725,.47,1.79,.065,1.35,.025,'sage');for(const x of [-.44,.44])round(x,.77,-.66,.73,.18,.39,.09,'white');box(0,.763,.84,1.75,.017,.23,'linen');break;
 case'nightstand':round(0,.29,0,.55,.5,.48,.02,'timber');box(0,.34,.248,.44,.15,.023,'darkwood');box(0,.34,.27,.13,.022,.025,'brass');g.cylinder(0,.58,0,.09,.13,.09,'ceramic');g.cylinder(0,.70,0,.016,.018,.21,'brass');g.cylinder(0,.85,0,.12,.16,.20,'linen');break;
 case'wardrobe':box(0,1.15,0,1.7,2.3,.60,'timber');for(const x of [-.42,.42]){box(x,1.16,.31,.82,2.18,.026,'darkwood');box(x+Math.sign(x)*-.27,1.12,.342,.025,.27,.03,'brass');}break;
 case'dining':for(const x of [-.66,.66])for(const z of [-.32,.32])box(x,.36,z,.07,.72,.07,'timber');round(0,.76,0,1.85,.09,.96,.035,'timber');chair(g,-.5,.94,Math.PI);chair(g,.5,.94,Math.PI);chair(g,-.5,-.94);chair(g,.5,-.94);g.cylinder(0,.88,0,.10,.08,.2,'ceramic');g.sphere(.02,1.04,.01,.14,.16,.12,'leaflight');break;
 case'counter':case'island':{const w=f.type==='counter'?2.4:2,d=f.type==='counter'?.65:1.05;box(0,.46,0,w,.9,d,'sage');box(0,.94,0,w+.045,.075,d+.05,'white');for(let i=0;i<3;i++){const x=(i-1)*w/3;box(x,.49,d/2+.014,w/3-.025,.72,.025,'sage');box(x,.74,d/2+.043,.22,.023,.033,'brass');}if(f.type==='counter'){box(-.47,.985,0,.7,.018,.44,'steel');box(-.47,.997,0,.58,.02,.33,'black');box(-.47,1.13,-.2,.033,.3,.033,'steel');box(-.47,1.27,-.12,.033,.035,.18,'steel');}else{g.cylinder(.5,1.03,0,.15,.08,.14,'ceramic');g.sphere(.5,1.16,0,.10,.1,.1,'leaflight');}break;}
 case'fridge':round(0,1,0,.8,2,.75,.035,'steel');box(0,1.27,.39,.72,1.33,.026,'white');box(0,.38,.39,.72,.48,.026,'white');box(-.24,1.2,.43,.03,.5,.06,'steel');box(-.24,.39,.43,.03,.22,.06,'steel');break;
 case'stove':box(0,.46,0,.8,.91,.65,'steel');box(0,.47,.34,.64,.47,.025,'black');box(0,.76,.375,.52,.035,.04,'steel');box(0,.94,0,.82,.05,.68,'black');for(const x of [-.21,.21])for(const z of [-.18,.18]){g.cylinder(x,.974,z,.13,.13,.015,'steel');g.cylinder(x,.985,z,.1,.1,.012,'black');}box(0,1.98,-.03,.9,.17,.6,'steel');box(0,2.22,-.18,.34,.40,.3,'steel');break;
 case'desk':for(const x of [-.65,.65])for(const z of [-.24,.24])box(x,.36,z,.045,.72,.045,'black');box(0,.77,-.12,1.6,.07,.65,'timber');box(.20,1.12,-.22,.65,.39,.035,'black');box(.20,1.13,-.198,.60,.33,.006,'screen');box(.2,.87,-.22,.035,.2,.035,'black');box(.2,.818,-.20,.25,.028,.16,'black');box(.12,.824,.07,.37,.018,.13,'black');chair(g,-.3,.37,Math.PI);box(-.53,.83,-.1,.22,.04,.25,'book1');break;
 case'shelf':for(const x of [-.72,.72])box(x,1.05,0,.06,2.1,.38,'timber');box(0,1.05,-.17,1.5,2.1,.035,'darkwood');for(let j=0;j<5;j++){const y=.1+j*.48;box(0,y,0,1.5,.04,.38,'timber');for(let k=0;k<8;k++){const h=.22+(k*7+j*3)%5*.033;box(-.59+k*.15,y+h/2+.03,.02,.09,h,.21,['book1','book2','book3'][(j+k)%3]);}}break;
 case'tub':round(0,.30,0,1.65,.60,.82,.22,'ceramic');round(0,.56,0,1.42,.13,.61,.06,'black');round(0,.60,0,1.31,.07,.52,.03,'water');box(.64,.84,0,.04,.62,.04,'steel');box(.50,1.14,0,.29,.04,.04,'steel');break;
 case'toilet':round(0,.31,.10,.45,.37,.52,.12,'ceramic');round(0,.5,.13,.46,.055,.50,.024,'white');g.sphere(0,.526,.13,.13,.006,.18,'black',14,5);round(0,.59,-.24,.47,.51,.19,.035,'ceramic');box(.12,.86,-.22,.08,.015,.025,'steel');break;
 case'vanity':round(0,.43,0,1.15,.80,.55,.02,'timber');round(0,.90,.02,.65,.15,.45,.06,'ceramic');round(0,.979,.05,.5,.022,.31,.01,'black');box(0,1.04,-.2,.025,.23,.025,'steel');box(0,1.145,-.12,.025,.025,.18,'steel');box(0,1.36,-.26,.88,.51,.04,'trim');box(0,1.37,-.232,.79,.43,.01,'mirror');break;
 case'plant':plant(g,0,0,0,1);break;
 case'lamp':g.cylinder(0,.04,0,.22,.23,.07,'black');g.cylinder(0,.77,0,.018,.02,1.5,'brass');g.cylinder(0,1.5,0,.17,.25,.3,'linen');g.cylinder(0,1.348,0,.225,.225,.008,'light');break;
 case'chest':round(0,.30,0,1.15,.60,.55,.035,'darkwood');box(0,.53,.287,1.05,.035,.028,'brass');for(const x of [-.4,.4])box(x,.3,.288,.05,.51,.025,'brass');box(0,.41,.30,.10,.12,.026,'brass');break;
 }});}
function wallParts(g,doc,l,k,view){const s=doc.settings,base=s.foundation+k*s.height,cut=view==='cutaway',h=cut?1.0:s.height;
 for(const w of A.deriveWalls(l)){const rotation=w.axis==='x'?0:-Math.PI/2,p=A.wallPoint(w,w.a);g.at(p.x,base,p.z,rotation,()=>{
  for(const seg of A.wallSegments(w,l.openings,h)){const x=(seg.a+seg.b)/2-w.a,len=seg.b-seg.a;
   if(w.exterior){g.box(x,seg.y+seg.h/2,(w.axis==='x'?w.insideSign:-w.insideSign)*s.thickness/4,len,seg.h,s.thickness/2,'plaster');g.box(x,seg.y+seg.h/2,-(w.axis==='x'?w.insideSign:-w.insideSign)*s.thickness/4,len,seg.h,s.thickness/2,'facade');}else g.box(x,seg.y+seg.h/2,0,len,seg.h,s.thickness,'plaster');
   if(seg.y===0){for(const side of w.exterior?[w.axis==='x'?w.insideSign:-w.insideSign]:[-1,1])g.box(x,.08,side*(s.thickness/2+.012),len,.16,.027,'white');}}
  // Continuous top plates make cutaway walls legible.
  if(cut)g.box(w.length/2,1.004,0,w.length,.025,s.thickness+.01,'timber');
 });}
 for(const o of l.openings){const p=A.wallPoint(o,o.center),yaw=o.axis==='x'?0:-Math.PI/2,w=o.width,oh=Math.min(o.height,h-o.sill);if(oh<=0)continue;
  g.at(p.x,base,p.z,yaw,()=>{const t=s.thickness+.065,sill=o.sill,frame=.075;
   g.box(-w/2+frame/2,sill+oh/2,0,frame,oh,t,'trim');g.box(w/2-frame/2,sill+oh/2,0,frame,oh,t,'trim');if(o.sill+o.height<=h)g.box(0,sill+oh-frame/2,0,w,frame,t,'trim');
   if(o.kind==='window'){g.box(0,sill+frame/2,0,w,frame,t+.07,'trim');g.box(0,sill+oh/2,0,w-frame*2,Math.max(.01,oh-frame*2),.02,'glass');if(w>1.6)g.box(0,sill+oh/2,0,.045,oh,.065,'trim');if(o.sill+o.height<=h)g.box(0,sill+oh*.56,0,w,.035,.064,'trim');}
   else if(!doc.spaceCity||!o.open){const doorH=Math.min(h,o.height)-.08;g.at(-w/2+.085,0,0,o.open?-Math.PI/2:0,()=>{g.box((w-.17)/2,doorH/2,0,w-.17,doorH,.065,'timber');for(const x of [w*.28,w*.68])g.box(x,doorH/2,.036,.025,Math.max(.05,doorH-.22),.012,'darkwood');if(!cut){g.box(w-.28,1.04,.08,.04,.13,.07,'brass');g.box(w-.34,1.075,.116,.15,.025,.025,'brass');}});}
  });}
}
function roof(g,doc){const s=doc.settings,k=doc.levels.length-1,base=s.foundation+(k+1)*s.height,rects=A.roofRects(doc.levels[k].rooms);g.level=k;g.layer='roof';
 for(const r of rects){const e=s.overhang,x0=r.x-e,x1=r.x+r.w+e,z0=r.z-e,z1=r.z+r.d+e,cx=(x0+x1)/2,cz=(z0+z1)/2,w=x1-x0,d=z1-z0,alongX=w>=d;
  if(s.roof==='flat'){g.box(cx,base+.08,cz,w,.22,d,'roof');for(const z of [z0+.08,z1-.08])g.box(cx,base+.29,z,w,.24,.15,'facade');for(const x of [x0+.08,x1-.08])g.box(x,base+.29,cz,.15,.24,d,'facade');continue;}
  const rise=Math.tan(s.pitch*Math.PI/180)*Math.min(w,d)/2,top=base+rise;
  const a=[x0,base,z0],b=[x1,base,z0],c=[x1,base,z1],dpt=[x0,base,z1];
  let u,v;
  if(s.roof==='gable'){
   if(alongX){u=[x0,top,cz];v=[x1,top,cz];g.quad(dpt,c,v,u,'roof');g.quad(b,a,u,v,'roof');g.tri([r.x,base,r.z],[r.x,base,r.z+r.d],[r.x,top-.08,cz],'facade');g.tri([r.x+r.w,base,r.z+r.d],[r.x+r.w,base,r.z],[r.x+r.w,top-.08,cz],'facade');g.box(cx,top+.012,cz,w,.09,.14,'trim');}
   else{u=[cx,top,z0];v=[cx,top,z1];g.quad(a,dpt,v,u,'roof');g.quad(c,b,u,v,'roof');g.tri([r.x+r.w,base,r.z],[r.x,base,r.z],[cx,top-.08,r.z],'facade');g.tri([r.x,base,r.z+r.d],[r.x+r.w,base,r.z+r.d],[cx,top-.08,r.z+r.d],'facade');g.box(cx,top+.012,cz,.14,.09,d,'trim');}
  }else{
   const inset=Math.min(w,d)*.46;if(alongX){u=[x0+inset,top,cz];v=[x1-inset,top,cz];g.quad(dpt,c,v,u,'roof');g.quad(b,a,u,v,'roof');g.tri(a,dpt,u,'roof');g.tri(c,b,v,'roof');}else{u=[cx,top,z0+inset];v=[cx,top,z1-inset];g.quad(a,dpt,v,u,'roof');g.quad(c,b,u,v,'roof');g.tri(b,a,u,'roof');g.tri(dpt,c,v,'roof');}}
  for(const z of [z0,z1])g.box(cx,base-.06,z,w,.2,.09,'trim');for(const x of [x0,x1])g.box(x,base-.06,cz,.09,.2,d,'trim');
  // Roof undersides; no see-through roof from inside.
  const roofBatches=[...g.map.values()].filter(m=>m.level===k&&m.layer==='roof'&&m.material==='roof');
  // A horizontal insulated ceiling closes the roof void.
 }
}
function stairs(g,doc,k){if(!doc.stair||k>=doc.levels.length-1)return;const t=doc.stair,base=doc.settings.foundation+k*doc.settings.height,n=18;g.at(t.x,base,t.z,0,()=>{for(let i=0;i<n;i++){const h=(i+1)*doc.settings.height/n,z=(i+.5)*t.d/n;g.box(t.w/2,h/2,z,t.w,h,t.d/n+.006,'timber');g.box(t.w/2,h+.012,z,t.w+.03,.025,t.d/n+.025,'darkwood');if(i%3===0)g.box(t.w+.005,h+.43,z,.03,.86,.03,'trim');}const slope=doc.settings.height/t.d;for(let i=0;i<n;i++)g.box(t.w+.005,(i+1)*doc.settings.height/n+.88,(i+.5)*t.d/n,.055,.045,t.d/n+.03,'timber');});}
function porch(g,doc){if(!doc.settings.porch||!doc.levels[0].rooms.length)return;const l=doc.levels[0],entry=l.openings.find(o=>o.kind==='door'&&A.openingWall(l,o)?.exterior&&o.axis==='x'&&A.openingWall(l,o).insideSign<0);if(!entry)return;const y=doc.settings.foundation,x=entry.center,z=entry.fixed;g.level=0;g.layer='exterior';g.box(x,y-.095,z+1.5,6.2,.19,3,'timber');for(let i=0;i<3;i++)g.box(x,y*(1-(i+1)/4)-.045,z+3.2+i*.26,2.3,.10,.30,'timber');for(const dx of [-2.9,2.9]){g.box(x+dx,1.5+y,z+2.65,.14,3,.14,'timber');g.box(x+dx,y+3,z+1.3,.14,.16,2.9,'trim');}g.box(x,y+3,z+2.65,6.2,.19,.15,'timber');for(let i=0;i<15;i++)g.box(x-2.95+i*.42,y+3.1,z+1.3,.06,.17,2.85,'timber');plant(g,x-2.3,y,z+2.2,.75);plant(g,x+2.3,y,z+2.2,.75);}
function site(g,doc){const b=A.bounds(doc.levels.flatMap(l=>l.rooms)),cx=b.x+b.w/2,cz=b.z+b.d/2,W=Math.max(25,b.w+13),D=Math.max(23,b.d+13);g.level=-1;g.layer='site';g.roundbox(cx,-.46,cz,W,.60,D,.27,'edge');g.roundbox(cx,-.14,cz,W-.08,.12,D-.08,.05,'ground');g.box(cx,-.062,cz,b.w+1.3,.045,b.d+1.3,'gravel');
 const front=doc.levels[0].openings.find(o=>o.axis==='x'&&o.kind==='door'&&A.openingWall(doc.levels[0],o)?.exterior&&A.openingWall(doc.levels[0],o).insideSign<0);if(front)for(let i=0;i<7;i++)g.box(front.center,-.033,front.fixed+3.85+i*.53,1.7,.055,.38,'concrete');
 const trees=[[-W/2+2,-D/2+3,2.5],[-W/2+3,-1,1.9],[W/2-2,-D/2+2,2.8],[W/2-1,-D/2+6,2.3],[W/2-2,D/2-4,1.8],[-W/2+1,D/2-3,1.6]];
 for(const [dx,dz,sc] of trees){const x=cx+dx,z=cz+dz;g.cylinder(x,.85*sc,z,.10*sc,.16*sc,1.7*sc,'darkwood',9);for(let j=0;j<3;j++)g.cylinder(x,(1.25+j*.46)*sc,z,0,(.8-j*.17)*sc,1.25*sc,j%2?'leaflight':'leaf',9);}
 for(let i=0;i<26;i++){let x=cx+Math.sin(i*15.7)*(W/2-1),z=cz+Math.cos(i*7.1)*(D/2-1);if(x>b.x-1&&x<b.x+b.w+1&&z>b.z-1&&z<b.z+b.d+4.8)continue;g.sphere(x,.18,z,.5,.28,.38,i%2?'leaf':'leaflight',7,4);}
}
// Host furniture recipes replace the demo's domestic furnishings. The original
// ArchitectureWorks batched geometry, room topology and opening kernel are used.
function furniture(g,f,base){
 const type=f.type;
 g.at(f.x,base,f.z,f.rot*Math.PI/180,()=>{
  const b=(mat,x,y,z,w,h,d)=>g.box(x,y,z,w,h,d,mat);
  const r=(mat,x,y,z,w,h,d,rad=.04)=>g.roundbox(x,y,z,w,h,d,rad,mat);
  const screen=(x,y,z,w=.65,h=.4)=>{r('black',x,y,z,w+.12,h+.1,.08);b('screen',x,y,z+.045,w,h,.018);};
  const seat=(x=0,z=0)=>{b('steel',x,.18,z,.18,.36,.18);r('linen',x,.49,z,.67,.18,.62);r('linen',x,.87,z-.27,.67,.64,.15);for(const side of [-1,1])b('steel',x+side*.35,.72,z,.055,.06,.48);};
  if(['sofa','armchair'].includes(type)){
   if(type==='armchair')seat();else{b('steel',0,.18,0,2.45,.25,.82);r('linen',0,.5,0,2.55,.25,.91);r('linen',0,.78,-.42,2.65,.68,.17);for(const x of [-.9,0,.9])r('cushion',x,.62,0,.79,.1,.78);}
  }else if(['desk','counter','island','dining','coffee','nightstand'].includes(type)){
   const c=A.catalog[type],h=type==='coffee'?.45:type==='nightstand'?.55:.92;
   r('white',0,h,0,c.w,.09,c.d*.75);for(const x of [-1,1])b('steel',x*c.w*.38,h*.48,0,.1,h*.96,c.d*.61);
   if(type==='desk'){screen(-.36,1.25,-.28);screen(.37,1.21,-.32,.53,.35);r('black',0,.99,.17,.92,.03,.28);seat(0,.7);}
   if(type==='counter'||type==='island'){r('trim',0,.45,0,c.w*.93,.82,c.d*.66);for(const x of [-.65,.0,.65])r('sage',x,.47,c.d*.34,.55,.65,.03);}
  }else if(type==='bed'||type==='tub'){
   const c=A.catalog[type];b('steel',0,.25,0,c.w*.8,.4,c.d*.8);r('white',0,.53,0,c.w,.22,c.d);r('linen',0,.72,-c.d*.32,c.w*.9,.18,.46);for(const x of [-1,1])b('trim',x*c.w*.49,.67,0,.065,.25,c.d);
   if(type==='tub'){screen(.65,1.05,-.3,.45,.3);b('steel',.65,.55,-.3,.06,.9,.06);}
  }else if(['wardrobe','shelf','fridge','chest','stove','vanity'].includes(type)){
   const c=A.catalog[type];r('trim',0,c.h*.5,0,c.w,c.h,c.d);for(let y=.25;y<c.h;y+=.48){r('sage',0,y,c.d*.51,c.w*.88,.38,.035);b('steel',c.w*.26,y,c.d*.55,.15,.025,.027);}
   if(type==='shelf'){for(let y=.38;y<c.h;y+=.5){b('black',0,y,c.d*.54,c.w*.8,.32,.018);for(let x=-c.w*.28;x<c.w*.31;x+=.16)b('screen',x,y-.1,c.d*.558,.035,.05,.012);}}
   if(type==='fridge'||type==='stove')screen(0,c.h*.71,c.d*.55,c.w*.66,.34);
  }else if(type==='plant'){g.cylinder(0,.35,0,.27,.24,.7,'steel');for(let i=0;i<7;i++){const a=i*2.4;g.sphere(Math.cos(a)*.2,1+i*.055,Math.sin(a)*.2,.09,.28,.06,'leaf',8,6);}}
  else if(type==='lamp'){b('steel',0,.8,0,.055,1.6,.055);b('light',0,1.57,0,.4,.07,.2);}
  else if(type==='toilet'){r('ceramic',0,.35,0,.44,.6,.6);r('white',0,.65,-.2,.46,.3,.18);}
  // Rugs become flush service grates, not raised domestic carpets.
  else if(type==='rug'){b('black',0,.008,0,3.4,.015,2.5);}
 });
}
function compile(doc,options={}){const view=options.view||'exterior',active=options.activeLevel??doc.levels.length-1,mats=materials(doc.settings),g=new Geometry(mats),s=doc.settings;
 for(let k=0;k<doc.levels.length;k++){if((view==='cutaway'||view==='plan')&&k>active)continue;const l=doc.levels[k],base=s.foundation+k*s.height;g.level=k;g.layer='structure';
  for(const r of l.rooms){for(const a of A.rectSubtract(r,k>0?doc.stair:null))g.box(a.x+a.w/2,base-s.slab/2,a.z+a.d/2,a.w,s.slab,a.d,r.finish);if(k===0){const top=s.foundation-s.slab+.02,bottom=Math.min(-.10,top-.12);g.box(r.x+r.w/2,(top+bottom)/2,r.z+r.d/2,r.w+.16,top-bottom,r.d+.16,'concrete');}}
  wallParts(g,doc,l,k,view==='cutaway'&&k===active?'cutaway':'exterior');
  if(view==='exterior'||view==='walk'){for(const r of l.rooms){const holes=k<doc.levels.length-1?doc.stair:null;for(const a of A.rectSubtract(r,holes))g.box(a.x+a.w/2,base+s.height-.06,a.z+a.d/2,a.w,.08,a.d,'plaster');}}
  g.layer='furniture';if(options.furniture!==false)for(const f of l.furniture)furniture(g,f,base);g.layer='structure';if(!doc.spaceCity)stairs(g,doc,k);
 }
 if(view==='exterior'||view==='walk')roof(g,doc);porch(g,doc);if(options.site)site(g,doc);
 const meshes=g.finish();return{meshes,materials:mats,stats:{triangles:meshes.reduce((s,m)=>s+m.positions.length/9,0),drawCalls:meshes.length},bounds:A.bounds(doc.levels.flatMap(l=>l.rooms))};}
function texturePixels(kind,color,size=256){const c=rgb(color),data=new Uint8Array(size*size*4),heights=new Float32Array(size*size),normal=new Uint8Array(size*size*4);const fract=x=>x-Math.floor(x),hash=(x,y)=>fract(Math.sin(x*127.1+y*311.7)*43758.5453123);for(let y=0;y<size;y++)for(let x=0;x<size;x++){const u=x/size,v=y/size,n=hash(x,y);let value=.96+(n-.5)*.055,h=.5+(n-.5)*.06;
 if(kind==='oak'||kind==='cedar'){const boards=kind==='oak'?10:9,row=Math.floor(v*boards),seam=fract(v*boards)<.018||kind==='oak'&&fract(u*1.8+(row%3)*.33)<.012,grain=Math.sin((v*300+Math.sin(u*25)*1.5))*Math.sin(u*22+v*35)*.025;value=seam?.59:.89+hash(row,3)*.14+grain+(n-.5)*.045;h=seam?.10:.5+grain*.5;}
 if(kind==='brick'||kind==='stone'){const rows=kind==='brick'?8:5,cols=kind==='brick'?4:3,row=Math.floor(v*rows),col=Math.floor(u*cols+(row%2)*.5),sx=fract(u*cols+(row%2)*.5),sy=fract(v*rows),seam=sx<.025||sy<.04;value=seam?1.25:.81+hash(col,row)*.28+(n-.5)*.1;h=seam?.1:.55+(n-.5)*.18;}
 if(kind==='tile'){const seam=fract(u*4)<.015||fract(v*4)<.015;value=seam?.72:.98+(n-.5)*.025;h=seam?.15:.5;}
 if(kind==='roof'){const row=Math.floor(v*8),sx=fract(u*5+row%2*.5),sy=fract(v*8),seam=sx<.02||sy<.04;value=seam?.55:.89+hash(Math.floor(u*5+row%2*.5),row)*.16;h=seam?.18:.55+(n-.5)*.08;}
 if(kind==='rug'||kind==='fabric'){value=.94+Math.sin(x*2)*Math.cos(y*2)*.035+(n-.5)*.1;h=.5+Math.sin(x*2)*Math.cos(y*2)*.10;if(kind==='rug')value*=.96+Math.sin(u*150)*.035;}
 if(kind==='ground'){value=.85+hash(Math.floor(x/8),Math.floor(y/8))*.16+(n-.5)*.12;h=.5+(n-.5)*.2;}
 const i=(y*size+x)*4;for(let k=0;k<3;k++)data[i+k]=A.clamp(c[k]*value*255,0,255);data[i+3]=255;heights[y*size+x]=h;
 }for(let y=0;y<size;y++)for(let x=0;x<size;x++){const sample=(a,b)=>heights[((b+size)%size)*size+(a+size)%size],dx=(sample(x-1,y)-sample(x+1,y))*.6,dy=(sample(x,y-1)-sample(x,y+1))*.6,len=Math.hypot(dx,dy,1),i=(y*size+x)*4;normal[i]=(dx/len*.5+.5)*255;normal[i+1]=(dy/len*.5+.5)*255;normal[i+2]=(1/len*.5+.5)*255;normal[i+3]=255;}return{color:data,normal,size};}
root.ArchitectureGeometry={Geometry,compile,materials,texturePixels,rgb};
})(globalThis);