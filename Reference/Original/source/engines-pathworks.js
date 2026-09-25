/* Generated from the user's Pathworks.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
(function(root){const VERSION = '1.0.0';
const FORMAT = 'pathworks-project';
const LIMITS = Object.freeze({paths:80,points:256,totalPoints:4096,samples:8192});
const PRESETS = Object.freeze({
 asphalt:{label:'Asphalt road',icon:'road',color:'#59616a',width:7,shoulder:0.75,markings:true,rail:'none',spacing:7,speed:10},
 gravel:{label:'Gravel trail',icon:'trail',color:'#b3a085',width:3.1,shoulder:0.5,markings:false,rail:'none',spacing:7,speed:2.8},
 cobble:{label:'Stone walkway',icon:'stone',color:'#a2a8a0',width:3.5,shoulder:0.25,markings:false,rail:'none',spacing:6,speed:1.6},
 boardwalk:{label:'Timber boardwalk',icon:'bridge',color:'#977050',width:4,shoulder:0.12,markings:false,rail:'wood',spacing:3.2,speed:2},
 fence:{label:'Fence / barrier',icon:'fence',color:'#907257',width:0.3,shoulder:0,markings:false,rail:'wood',spacing:3,speed:0},
 route:{label:'Waypoint route',icon:'route',color:'#67d4c4',width:1,shoulder:0,markings:false,rail:'none',spacing:5,speed:3}
});
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
const lerp=(a,b,t)=>a+(b-a)*t;
const copy=o=>JSON.parse(JSON.stringify(o));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y,a.z-b.z);
const distXZ=(a,b)=>Math.hypot(a.x-b.x,a.z-b.z);
function rng(seed=12345){return()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function hash(x,z,s=0){let h=Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(s,1597334677);h=Math.imul(h^(h>>>13),1274126177);return((h^(h>>>16))>>>0)/4294967295;}
function noise(x,z,s=0){const ix=Math.floor(x),iz=Math.floor(z),u=smooth(0,1,x-ix),v=smooth(0,1,z-iz);return lerp(lerp(hash(ix,iz,s),hash(ix+1,iz,s),u),lerp(hash(ix,iz+1,s),hash(ix+1,iz+1,s),u),v)*2-1;}
function uid(prefix='p'){return prefix+'_'+Date.now().toString(36)+'_'+Math.floor(Math.random()*0xffffff).toString(36);}
const num=(v,d,a,b)=>Number.isFinite(v)?clamp(v,a,b):d;
const idRE=/^[A-Za-z0-9_-]{1,80}$/;
function newPath(type='asphalt',overrides={}){
 if(!PRESETS[type])type='asphalt';
 return {id:uid('path'),name:PRESETS[type].label,type,...PRESETS[type],points:[],closed:false,curve:'smooth',tension:0.5,elevation:'terrain',lift:0.16,lamps:false,visible:true,locked:false,oneWay:false,nav:type!=='fence',...overrides};
}
function newDocument(){return {format:FORMAT,version:VERSION,name:'Willow Valley',terrain:{kind:'demo',size:180,seed:28,relief:1},paths:[],view:{grid:false,scenery:true,helpers:true,shadows:true,quality:1},camera:null};}
function validateDocument(input){
 if(!input||input.format!==FORMAT||input.version!==VERSION)throw Error('This is not a supported Pathworks 1.0 project.');
 if(!Array.isArray(input.paths)||input.paths.length>LIMITS.paths)throw Error('Project exceeds the 80-path limit.');
 const out=newDocument();out.name=String(input.name||'Untitled network').slice(0,80);out.terrain=validateTerrain(input.terrain||out.terrain);
 let count=0;const ids=new Set(),ptids=new Set();
 for(const p of input.paths){
  if(!p||!idRE.test(p.id)||ids.has(p.id)||!PRESETS[p.type])throw Error('Invalid or duplicate path ID / type.');ids.add(p.id);
  if(!Array.isArray(p.points)||p.points.length>LIMITS.points||(count+=p.points.length)>LIMITS.totalPoints)throw Error('Too many control points.');
  const q=newPath(p.type,{id:p.id,name:String(p.name||PRESETS[p.type].label).slice(0,80)});
  for(const [k,a,b] of [['width',0.2,24],['shoulder',0,4],['spacing',1,30],['speed',0,60],['tension',0,1],['lift',-5,60]])q[k]=num(p[k],q[k],a,b);
  for(const k of ['markings','lamps','visible','locked','oneWay','nav','closed'])if(typeof p[k]==='boolean')q[k]=p[k];
  q.color=/^#[0-9a-fA-F]{6}$/.test(p.color)?p.color:q.color;
  q.curve=p.curve==='linear'?'linear':'smooth';q.elevation=p.elevation==='absolute'?'absolute':'terrain';q.rail=['none','wood','metal'].includes(p.rail)?p.rail:'none';
  q.points=p.points.map(pt=>{
   if(!pt||!idRE.test(pt.id)||ptids.has(pt.id))throw Error('Invalid or duplicate point ID.');ptids.add(pt.id);
   for(const k of ['x','y','z'])if(!Number.isFinite(pt[k])||Math.abs(pt[k])>10000)throw Error('Invalid point coordinate.');
   if(Math.abs(pt.x)>out.terrain.size/2+50||Math.abs(pt.z)>out.terrain.size/2+50||Math.abs(pt.y)>1000)throw Error('Point outside supported world bounds.');
   const j=pt.junction||null;if(j&&!idRE.test(j))throw Error('Invalid junction ID.');
   return {id:pt.id,x:pt.x,y:pt.y,z:pt.z,width:num(pt.width,1,0.25,3),junction:j};
  });
  // Remove only consecutive exact duplicate knots: zero-length tangents are not useful.
  q.points=q.points.filter((pt,i,a)=>!i||Math.hypot(pt.x-a[i-1].x,pt.z-a[i-1].z)>0.025);
  if(q.closed&&q.points.length<3)q.closed=false;out.paths.push(q);
 }
 if(input.view)for(const k of ['grid','scenery','helpers','shadows'])if(typeof input.view[k]==='boolean')out.view[k]=input.view[k];
 out.view.quality=num(input.view?.quality,1,0.6,2);
 if(input.camera&&['yaw','pitch','distance','x','y','z'].every(k=>Number.isFinite(input.camera[k])))out.camera={yaw:input.camera.yaw,pitch:num(input.camera.pitch,0.8,0.1,Math.PI/2-0.01),distance:num(input.camera.distance,180,6,900),x:num(input.camera.x,0,-500,500),y:num(input.camera.y,0,-200,200),z:num(input.camera.z,0,-500,500)};
 // Junction links must mean the same actual world position, not merely share a name.
 const at=createTerrain(out.terrain),links=new Map();
 for(const p of out.paths)for(const pt of p.points)if(pt.junction){const pos=worldPoint(p,pt,at);if(links.has(pt.junction)&&distance(links.get(pt.junction),pos)>0.5)throw Error('Linked junction points disagree in position.');links.set(pt.junction,pos);}
 return out;
}
function decodeFloat32(s,n){
 if(typeof s!=='string'||s.length>n*6+64)throw Error('Invalid terrain encoding.');
 let bytes;try{if(typeof atob==='function'){const raw=atob(s);bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));}else bytes=Uint8Array.from(Buffer.from(s,'base64'));}catch{throw Error('Invalid terrain base64.');}
 if(bytes.byteLength!==n*4)throw Error('Terrain buffer length does not match its grid.');
 const data=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),a=new Float32Array(n);
 for(let i=0;i<n;i++){a[i]=data.getFloat32(i*4,true);if(!Number.isFinite(a[i])||Math.abs(a[i])>1000)throw Error('Invalid terrain height.');}return a;
}
function validateTerrain(t){
 if(t.kind==='worldworks'){
  if(!Number.isInteger(t.n)||t.n<32||t.n>256||!Number.isFinite(t.size)||t.size<30||t.size>500)throw Error('Unsupported Worldworks height field.');
  const n=(t.n+1)**2;decodeFloat32(t.base,n);decodeFloat32(t.delta,n);
  return {kind:'worldworks',n:t.n,size:t.size,base:t.base,delta:t.delta,name:String(t.name||'Worldworks terrain').slice(0,80)};
 }
 if(!['demo','flat'].includes(t.kind))throw Error('Unknown terrain type.');
 return {kind:t.kind,size:num(t.size,180,60,500),seed:Math.floor(num(t.seed,28,0,1e9)),relief:num(t.relief,1,0,3)};
}
function terrainFromWorldworks(p){
 if(p?.format!=='worldworks-project'||p.version!=='0.1.0'||p.encoding!=='float32-le-base64')throw Error('Choose a saved Worldworks 0.1 JSON project.');
 return validateTerrain({kind:'worldworks',n:p.n,size:p.size,base:p.base,delta:p.delta,name:p.name});
}
function createTerrain(t){
 if(t.kind==='flat')return ()=>0;
 if(t.kind==='worldworks'){
  const k=t.n+1,b=decodeFloat32(t.base,k*k),d=decodeFloat32(t.delta,k*k),h=i=>b[i]+d[i];
  return(x,z)=>{const gx=clamp((x/t.size+.5)*t.n,0,t.n),gz=clamp((z/t.size+.5)*t.n,0,t.n),i=Math.min(t.n-1,Math.floor(gx)),j=Math.min(t.n-1,Math.floor(gz)),u=gx-i,v=gz-j,a=j*k+i,c=a+k;return u+v<=1?h(a)*(1-u-v)+h(a+1)*u+h(c)*v:h(c+1)*(u+v-1)+h(c)*(1-u)+h(a+1)*(1-v);};
 }
 return(x,z)=>{
  const s=180/t.size; x*=s;z*=s;
  const hills=2.1+3.1*Math.sin(x*.032+0.7)*Math.cos(z*.026)+1.35*noise(x*.04,z*.04,t.seed)+0.45*noise(x*.11,z*.11,t.seed+4);
  const mound=9*Math.exp(-((x+55)**2/600+(z-41)**2/1050))+7*Math.exp(-((x-56)**2/650+(z-54)**2/650));
  const pond=6.5*Math.exp(-((x-35)**2/160+(z-3)**2/320));
  return (hills+mound-pond)*(t.relief??1);
 };
}
function worldPoint(path,pt,terrain){return{x:pt.x,y:(path.elevation==='terrain'?terrain(pt.x,pt.z):0)+pt.y+path.lift,z:pt.z};}
function makeDemo(){
 const d=newDocument(),p=(x,z,junction=null,y=0)=>({id:uid('pt'),x,y,z,width:1,junction});
 d.paths=[
  newPath('asphalt',{name:'01 · Ridgeway',points:[p(-72,-19),p(-44,-6,'west'),p(-17,3,'cross'),p(7,26),p(38,31,'east'),p(68,14,'gate')],lamps:true,spacing:13}),
  newPath('gravel',{name:'02 · Willow trail',points:[p(-17,3,'cross'),p(-15,-20),p(7,-38),p(37,-29,'south'),p(59,-17),p(68,14,'gate')],width:3.2}),
  newPath('cobble',{name:'03 · Orchard walk',points:[p(-44,-6,'west'),p(-61,17),p(-54,40),p(-31,49),p(-16,28),p(-17,3,'cross')],width:3.4}),
  newPath('boardwalk',{name:'04 · Willow crossing',points:[p(38,31,'east'),p(37,16),p(34,-4),p(37,-29,'south')],rail:'wood',width:3.8}),
  newPath('fence',{name:'05 · Orchard fence',points:[p(-76,4),p(-71,28),p(-54,58),p(-27,62),p(-9,41)],spacing:3.5,nav:false})
 ];
 // A level bridge whose endpoints match the attached trails. Intermediate knots
 // use explicit absolute elevation; it never silently flattens host terrain.
 const at=createTerrain(d.terrain),b=d.paths[3];b.elevation='absolute';b.points.forEach(pt=>pt.y=at(pt.x,pt.z));const a=b.points[0].y,c=b.points.at(-1).y;b.points[1].y=lerp(a,c,.3)+1.5;b.points[2].y=lerp(a,c,.62)+1.5;
 return d;
}

// 02 / 10 — Editable cardinal splines, arc length and grade analysis
function cardinal(a,b,c,d,t,tension){
 const m1=(c-a)*(1-tension),m2=(d-b)*(1-tension),t2=t*t,t3=t2*t;
 return (2*t3-3*t2+1)*b+(t3-2*t2+t)*m1+(-2*t3+3*t2)*c+(t3-t2)*m2;
}
function samplePath(path,terrain,spacing=0.8){
 const pts=path.points,n=pts.length;if(n<2)return{samples:[],length:0,maxGrade:0,knots:[],warnings:[]};
 const samples=[],knots=[],segs=path.closed?n:n-1,at=i=>pts[path.closed?(i+n)%n:clamp(i,0,n-1)];
 let length=0,maxGrade=0;
 for(let i=0;i<segs;i++){
  const p0=at(i-1),p1=at(i),p2=at(i+1),p3=at(i+2);
  const steps=Math.max(2,Math.min(200,Math.floor((LIMITS.samples-1)/segs),Math.ceil(distXZ(p1,p2)/Math.max(.4,spacing))));
  for(let j=0;j<=steps;j++){
   if(i>0&&j===0){knots[i]=samples.length-1;continue;}
   const t=j/steps,calc=k=>path.curve==='linear'?lerp(p1[k],p2[k],t):cardinal(p0[k],p1[k],p2[k],p3[k],t,path.tension);
   const x=calc('x'),z=calc('z'),y=calc('y')+(path.elevation==='terrain'?terrain(x,z):0)+path.lift;
   const width=path.width*lerp(p1.width??1,p2.width??1,t),s={x,y,z,width,s:0,t:(i+t)/segs,segment:i,u:t,knot:j===0?i:j===steps?(i+1)%n:null};
   if(samples.length){const old=samples.at(-1),dh=distXZ(old,s),dl=distance(old,s);length+=dl;maxGrade=Math.max(maxGrade,dh>1e-5?100*Math.abs(s.y-old.y)/dh:0);}
   s.s=length;samples.push(s);if(i===0&&j===0)knots[0]=0;if(j===steps)knots[(i+1)%n]=samples.length-1;
  }
 }
 if(path.closed)knots[0]=0;
 // Use a centred tangent, but never a vertical or zero-length sideways normal.
 for(let i=0;i<samples.length;i++){
  let a=samples[Math.max(0,i-1)],b=samples[Math.min(samples.length-1,i+1)];
  if(path.closed&&(i===0||i===samples.length-1)){a=samples[samples.length-2];b=samples[1];}
  const dx=b.x-a.x,dz=b.z-a.z,l=Math.hypot(dx,dz)||1;samples[i].nx=-dz/l;samples[i].nz=dx/l;
 }
 const warnings=[];if(maxGrade>20)warnings.push(`Steep grade: ${maxGrade.toFixed(0)}%`);
 for(let i=1;i<pts.length;i++)if(distXZ(pts[i-1],pts[i])<path.width*.6){warnings.push('Tight control-point spacing: wide ribbon may overlap.');break;}
 return {samples,length,maxGrade,knots,warnings};
}
function atDistance(cache,metres,loop=false){
 const a=cache.samples;if(!a.length)return null;const len=cache.length;
 let s=loop&&len>0?((metres%len)+len)%len:clamp(metres,0,len);let lo=0,hi=a.length-1;
 while(lo+1<hi){const m=(lo+hi)>>1;if(a[m].s<s)lo=m;else hi=m;}
 const x=a[lo],y=a[hi],t=(s-x.s)/(y.s-x.s||1),dx=y.x-x.x,dy=y.y-x.y,dz=y.z-x.z,l=Math.hypot(dx,dy,dz)||1;
 return {x:lerp(x.x,y.x,t),y:lerp(x.y,y.y,t),z:lerp(x.z,y.z,t),nx:lerp(x.nx,y.nx,t),nz:lerp(x.nz,y.nz,t),width:lerp(x.width,y.width,t),s,tx:dx/l,ty:dy/l,tz:dz/l};
}
function nearestOnPath(cache,point){
 let best=null;const a=cache.samples;
 for(let i=1;i<a.length;i++){
  const p=a[i-1],q=a[i],dx=q.x-p.x,dz=q.z-p.z,t=clamp(((point.x-p.x)*dx+(point.z-p.z)*dz)/(dx*dx+dz*dz||1),0,1),x=lerp(p.x,q.x,t),z=lerp(p.z,q.z,t),distance=Math.hypot(point.x-x,point.z-z);
  if(!best||distance<best.distance)best={x,y:lerp(p.y,q.y,t),z,s:lerp(p.s,q.s,t),distance,index:i,t:lerp(p.t,q.t,t),segment:t<.5?p.segment:q.segment};
 }return best;
}
function simplifyStroke(points,tolerance=1.2){
 if(points.length<3)return points;
 // Iterative Ramer–Douglas–Peucker: no recursive call-stack overflow on long strokes.
 const keep=new Set([0,points.length-1]),stack=[[0,points.length-1]];
 while(stack.length){const [a,b]=stack.pop(),p=points[a],q=points[b],dx=q.x-p.x,dz=q.z-p.z;let best=tolerance* tolerance,k=-1;
  for(let i=a+1;i<b;i++){const r=points[i],t=clamp(((r.x-p.x)*dx+(r.z-p.z)*dz)/(dx*dx+dz*dz||1),0,1),d=(r.x-p.x-dx*t)**2+(r.z-p.z-dz*t)**2;if(d>best){best=d;k=i;}}
  if(k>=0){keep.add(k);stack.push([a,k],[k,b]);}
 }return [...keep].sort((a,b)=>a-b).map(i=>points[i]);
}

// 03 / 10 — Mesh construction, UVs, normals and procedural surfaces
function rgb(hex){return[parseInt(hex.slice(1,3),16)/255,parseInt(hex.slice(3,5),16)/255,parseInt(hex.slice(5,7),16)/255];}
class MeshBuilder{
 constructor(kind='solid',color='#ffffff',owner=null){this.kind=kind;this.color=color;this.owner=owner;this.positions=[];this.normals=[];this.uvs=[];this.colors=[];}
 tri(a,b,c,uv=[[0,0],[0,1],[1,1]],cols=null){
  let nx=(b[1]-a[1])*(c[2]-a[2])-(b[2]-a[2])*(c[1]-a[1]),ny=(b[2]-a[2])*(c[0]-a[0])-(b[0]-a[0])*(c[2]-a[2]),nz=(b[0]-a[0])*(c[1]-a[1])-(b[1]-a[1])*(c[0]-a[0]);const n=Math.hypot(nx,ny,nz)||1;nx/=n;ny/=n;nz/=n;
  const color=rgb(this.color);[a,b,c].forEach((v,i)=>{this.positions.push(...v);this.normals.push(nx,ny,nz);this.uvs.push(...uv[i]);this.colors.push(...(cols?cols[i]:color));});return this;
 }
 quad(a,b,c,d,uv=[[0,0],[0,1],[1,1],[1,0]],cols=null){this.tri(a,b,c,[uv[0],uv[1],uv[2]],cols?[cols[0],cols[1],cols[2]]:null);this.tri(a,c,d,[uv[0],uv[2],uv[3]],cols?[cols[0],cols[2],cols[3]]:null);return this;}
 box(cx,cy,cz,sx,sy,sz,yaw=0){
  const co=Math.cos(yaw),si=Math.sin(yaw),v=(x,y,z)=>[cx+x*co+z*si,cy+y,cz-x*si+z*co],x=sx/2,y=sy/2,z=sz/2;
  const p=[v(-x,-y,-z),v(x,-y,-z),v(x,y,-z),v(-x,y,-z),v(-x,-y,z),v(x,-y,z),v(x,y,z),v(-x,y,z)];
  for(const [a,b,c,d] of [[0,3,2,1],[4,5,6,7],[0,4,7,3],[1,2,6,5],[3,7,6,2],[0,1,5,4]])this.quad(p[a],p[b],p[c],p[d]);return this;
 }
 beam(a,b,w=.15,h=w){
  const dx=b[0]-a[0],dz=b[2]-a[2],l=Math.hypot(dx,dz)||1,nx=-dz/l*w/2,nz=dx/l*w/2;
  const p=[[a[0]+nx,a[1]-h/2,a[2]+nz],[a[0]-nx,a[1]-h/2,a[2]-nz],[b[0]-nx,b[1]-h/2,b[2]-nz],[b[0]+nx,b[1]-h/2,b[2]+nz],[a[0]+nx,a[1]+h/2,a[2]+nz],[a[0]-nx,a[1]+h/2,a[2]-nz],[b[0]-nx,b[1]+h/2,b[2]-nz],[b[0]+nx,b[1]+h/2,b[2]+nz]];
  for(const [a,b,c,d]of [[4,7,6,5],[0,1,2,3],[0,3,7,4],[1,5,6,2],[0,4,5,1],[3,2,6,7]])this.quad(p[a],p[b],p[c],p[d]);return this;
 }
 cone(x,y,z,r,h,sides=7){for(let i=0;i<sides;i++){const a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2;this.tri([x+Math.cos(a)*r,y,z+Math.sin(a)*r],[x,y+h,z],[x+Math.cos(b)*r,y,z+Math.sin(b)*r]);}return this;}
 disc(x,y,z,r,n=24,terrain=null){for(let i=0;i<n;i++){const a=-i/n*Math.PI*2,b=-(i+1)/n*Math.PI*2,px=x+Math.cos(a)*r,pz=z+Math.sin(a)*r,qx=x+Math.cos(b)*r,qz=z+Math.sin(b)*r;this.tri([x,y,z],[px,terrain?terrain(px,pz)+(y-terrain(x,z)):y,pz],[qx,terrain?terrain(qx,qz)+(y-terrain(x,z)):y,qz],[[.5,.5],[.5+Math.cos(a)*.5,.5+Math.sin(a)*.5],[.5+Math.cos(b)*.5,.5+Math.sin(b)*.5]]);}return this;}
 finish(){return {kind:this.kind,color:this.color,owner:this.owner,positions:new Float32Array(this.positions),normals:new Float32Array(this.normals),uvs:new Float32Array(this.uvs),colors:new Float32Array(this.colors)};}
}
function ribbon(path,cache,terrain,from=-.5,to=.5,extra=0,offset=0,kind=path.type,color=path.color,filter=null){
 const b=new MeshBuilder(kind,color,path.id),a=cache.samples,cross=kind==='marking'?1:Math.max(2,Math.ceil(path.width/1.4));
 const at=(s,u)=>{const side=(s.width+extra*2)*u,x=s.x+s.nx*side,z=s.z+s.nz*side;let y=s.y;if(path.elevation==='terrain')y+=terrain(x,z)-terrain(s.x,s.z);return[x,y+offset,z];};
 for(let i=1;i<a.length;i++){
  const p=a[i-1],q=a[i];if(filter&&!filter((p.s+q.s)/2))continue;
  for(let j=0;j<cross;j++){const u=lerp(from,to,j/cross),v=lerp(from,to,(j+1)/cross);b.quad(at(p,u),at(p,v),at(q,v),at(q,u),[[u+.5,p.s/3],[v+.5,p.s/3],[v+.5,q.s/3],[u+.5,q.s/3]]);}
 }return b.finish();
}
function buildPathMeshes(path,cache,terrain){
 if(!path.visible||cache.samples.length<2)return [];
 const out=[],a=cache.samples;
 if(!['fence','route'].includes(path.type)){
  if(path.shoulder>0)out.push(ribbon(path,cache,terrain,-.5,.5,path.shoulder,-.035,'gravel',path.type==='boardwalk'?'#51493f':'#887d63'));
  out.push(ribbon(path,cache,terrain));
  if(path.markings){
   const joins=path.points.filter(p=>p.junction).map(p=>worldPoint(path,p,terrain));
   const clear=s=>{const p=atDistance(cache,s);return !joins.some(j=>distXZ(j,p)<path.width*.75);};
   const dash=s=>s%7<3.7&&clear(s);
   out.push(ribbon(path,cache,terrain,-.012,.012,0,.026,'marking','#e6c776',dash));
   out.push(ribbon(path,cache,terrain,-.461,-.444,0,.023,'marking','#ece5cf',clear));
   out.push(ribbon(path,cache,terrain,.444,.461,0,.023,'marking','#ece5cf',clear));
  }
 }
 if(path.type==='route')out.push(ribbon(path,cache,terrain,-.075,.075,0,.05,'emissive',path.color,s=>s%3<1.9));
 const wood=new MeshBuilder('wood',path.rail==='metal'?'#7b898d':'#816345',path.id),metal=new MeshBuilder('metal','#4a5559',path.id),light=new MeshBuilder('emissive','#ffe2a0',path.id);
 if(path.rail!=='none'||path.type==='fence'){
  const sides=path.type==='fence'?[0]:[-1,1],step=Math.max(path.spacing,cache.length/700),total=Math.min(700,Math.ceil(cache.length/step));
  for(const side of sides){let prev=null;
   for(let i=0;i<=total;i++){
    const s=atDistance(cache,Math.min(cache.length,i*step)),w=side*(s.width/2+.12),x=s.x+s.nx*w,z=s.z+s.nz*w,y=s.y+(path.elevation==='terrain'?terrain(x,z)-terrain(s.x,s.z):0);
    const mat=path.rail==='metal'?metal:wood;
    mat.box(x,y+.68,z,.19,1.45,.19,Math.atan2(s.tx,s.tz));
    if(prev){mat.beam([prev.x,prev.y+.55,prev.z],[x,y+.55,z],.13,.16);mat.beam([prev.x,prev.y+1.13,prev.z],[x,y+1.13,z],.13,.16);}prev={x,y,z};
    if(path.type==='boardwalk'&&i%2===0){const base=terrain(x,z);if(y-base>.3)wood.box(x,(base+y)/2,z,.32,Math.max(.1,y-base),.32);}
   }
  }
 }
 if(path.type==='boardwalk'){
  // A thin underside and side fascia convey deck thickness without terrain edits.
  for(let i=1;i<a.length;i+=2){const p=a[i-1],q=a[Math.min(a.length-1,i+1)];for(const s of [-1,1])wood.beam([p.x+p.nx*p.width*.5,p.y-.14,p.z+p.nz*p.width*.5],[q.x+q.nx*q.width*.5,q.y-.14,q.z+q.nz*q.width*.5],.18,.25);}
 }
 if(path.lamps){const lampStep=Math.max(4,path.spacing,cache.length/512);for(let s=lampStep*.5;s<cache.length;s+=lampStep){
  const p=atDistance(cache,s),side=Math.floor(s/path.spacing)%2?1:-1,d=side*(p.width/2+path.shoulder+.65),x=p.x+p.nx*d,z=p.z+p.nz*d,y=path.elevation==='terrain'?terrain(x,z)+path.lift:p.y;
  metal.box(x,y+2.4,z,.15,4.8,.15);metal.box(x,y+4.78,z,.6,.12,.6);light.box(x,y+4.68,z,.38,.18,.38);
 }}
 for(const b of [wood,metal,light])if(b.positions.length)out.push(b.finish());return out;
}
function buildJunctionMeshes(doc,caches,terrain){
 const links=new Map(),out=[];
 for(const p of doc.paths)if(p.visible&&!['fence','route'].includes(p.type))for(const pt of p.points)if(pt.junction){if(!links.has(pt.junction))links.set(pt.junction,[]);links.get(pt.junction).push({p,pt});}
 for(const [id,refs] of links){if(refs.length<2)continue;refs.sort((a,b)=>b.p.width-a.p.width);const {p,pt}=refs[0],pos=worldPoint(p,pt,terrain),r=Math.max(...refs.map(({p,pt})=>p.width*(pt.width||1)))*.63;
  const b=new MeshBuilder(p.type,p.color,'junction:'+id);b.disc(pos.x,pos.y+.037,pos.z,r,40,p.elevation==='terrain'?terrain:null);out.push(b.finish());
 }return out;
}

// 04 / 10 — Explicit waypoint graph, direction-aware shortest routes, edit history
function buildGraph(doc,caches){
 const nodes=[],edges=[],join=new Map(),adj=[];
 for(const path of doc.paths){
  if(!path.nav||!path.visible||path.type==='fence')continue;
  const cache=caches.get(path.id);if(!cache||cache.samples.length<2)continue;
  let prev=-1,first=-1;
  for(let i=0;i<cache.samples.length;i++){
   const p=cache.samples[i],pt=p.knot===null?null:path.points[p.knot],j=pt?.junction;
   let n=-1;if(j&&join.has(j))n=join.get(j);
   if(path.closed&&i===cache.samples.length-1)n=first;
   if(n<0){n=nodes.length;nodes.push({id:n,x:p.x,y:p.y,z:p.z,junction:j||null,paths:[path.id]});adj.push([]);if(j)join.set(j,n);}else if(!nodes[n].paths.includes(path.id))nodes[n].paths.push(path.id);
   if(first<0)first=n;
   if(prev>=0&&prev!==n){const cost=distance(nodes[prev],nodes[n]);edges.push({from:prev,to:n,pathId:path.id,length:cost,oneWay:path.oneWay});adj[prev].push({to:n,cost,pathId:path.id});if(!path.oneWay)adj[n].push({to:prev,cost,pathId:path.id});}
   prev=n;
  }
 }
 return {format:'pathworks-navigation',version:VERSION,nodes,edges,adj};
}
function findRoute(graph,start,end){
 // Positions snap to the nearest node in 3D; numeric inputs use explicit node IDs.
 const nearest=p=>{if(Number.isInteger(p))return p;if(!p||![p.x,p.y,p.z].every(Number.isFinite))return -1;let best=-1,d=Infinity;for(const n of graph.nodes){const v=distance(n,p);if(v<d){d=v;best=n.id;}}return best;};
 const a=nearest(start),b=nearest(end),n=graph.nodes.length;if(a<0||b<0||a>=n||b>=n)return null;
 const dist=new Float64Array(n).fill(Infinity),prev=new Int32Array(n).fill(-1),closed=new Uint8Array(n),heap=[];
 const push=(id,cost)=>{let i=heap.length;heap.push({id,cost});while(i){const p=(i-1)>>1;if(heap[p].cost<=cost)break;heap[i]=heap[p];i=p;}heap[i]={id,cost};};
 const pop=()=>{const top=heap[0],v=heap.pop();if(heap.length){let i=0;while(i*2+1<heap.length){let c=i*2+1;if(c+1<heap.length&&heap[c+1].cost<heap[c].cost)c++;if(heap[c].cost>=v.cost)break;heap[i]=heap[c];i=c;}heap[i]=v;}return top;};
 dist[a]=0;push(a,0);
 while(heap.length){const cur=pop().id;if(closed[cur])continue;closed[cur]=1;if(cur===b)break;for(const e of graph.adj[cur]){const alt=dist[cur]+e.cost;if(alt<dist[e.to]){dist[e.to]=alt;prev[e.to]=cur;push(e.to,alt);}}}
 if(!Number.isFinite(dist[b]))return null;const ids=[];for(let k=b;k>=0;k=prev[k]){ids.push(k);if(k===a)break;}ids.reverse();return {distance:dist[b],nodeIds:ids,points:ids.map(id=>({x:graph.nodes[id].x,y:graph.nodes[id].y,z:graph.nodes[id].z}))};
}
class History{
 constructor(limit=60){this.limit=limit;this.past=[];this.future=[];}
 push(doc){this.past.push(copy(doc));if(this.past.length>this.limit)this.past.shift();this.future.length=0;}
 undo(current){if(!this.past.length)return null;this.future.push(copy(current));return this.past.pop();}
 redo(current){if(!this.future.length)return null;this.past.push(copy(current));return this.future.pop();}
}


// 05 / 10 — Shared-scene runtime: no renderer, camera, animation loop or UI ownership
class PathworksEngine {
 constructor(context={},state=newDocument()){
  this.context=context;this.THREE=context.THREE||null;this.state=validateDocument(state);this.caches=new Map();this.meshes=[];this.followers=new Set();this.elapsed=0;this.disposed=false;this.group=null;this.materials=new Map();this.graph=null;
  if(this.THREE&&context.scene){this.group=new this.THREE.Group();this.group.name='Pathworks';context.scene.add(this.group);}
  this.rebuild();
 }
 terrain(x,z){const h=this.context.sampleTerrain?.(x,z);if(Number.isFinite(h))return h;return this.localTerrain(x,z);}
 rebuild(){
  if(this.disposed)throw Error('Pathworks engine has been disposed.');
  this.localTerrain=createTerrain(this.state.terrain);this.caches.clear();const meshes=[];const terrain=(x,z)=>this.terrain(x,z);
  for(const path of this.state.paths){const cache=samplePath(path,terrain);this.caches.set(path.id,cache);meshes.push(...buildPathMeshes(path,cache,terrain));}
  meshes.push(...buildJunctionMeshes(this.state,this.caches,terrain));this.meshes=meshes.filter(m=>m.positions.length);this.graph=null;
  if(this.group)this.syncThree();
  this.context.onChange?.({type:'rebuild',stats:this.getStats()});return this;
 }
 setState(state){const next=validateDocument(state);this.state=next;return this.rebuild();}
 getState(){return copy(this.state);}
 serialize(){return this.getState();}
 setSettings(settings={}){if(typeof settings.visible==='boolean'&&this.group)this.group.visible=settings.visible;if(typeof settings.sampleTerrain==='function')this.context.sampleTerrain=settings.sampleTerrain;return this.rebuild();}
 addPath(type='asphalt',options={}){if(this.state.paths.length>=LIMITS.paths)throw Error('The editor supports up to 80 paths.');const p=newPath(type,options);p.points=p.points.map(pt=>({id:uid('pt'),y:0,width:1,junction:null,...pt}));const doc=this.getState();doc.paths.push(p);this.setState(doc);return this.state.paths.at(-1).id;}
 removePath(id){this.state.paths=this.state.paths.filter(p=>p.id!==id);this.rebuild();}
 getPath(id){return this.state.paths.find(p=>p.id===id)||null;}
 getSample(id,metres,loop=false){const c=this.caches.get(id);return c?atDistance(c,metres,loop):null;}
 getGraph(){if(!this.graph)this.graph=buildGraph(this.state,this.caches);return this.graph;}
 findRoute(start,end){return findRoute(this.getGraph(),start,end);}
 getPlacementSamples(id,spacing=5,side=0,offset=0){
  const c=this.caches.get(id);if(!c?.length)return [];const out=[];spacing=clamp(spacing,.5,100);
  for(let s=0;s<=c.length&&out.length<2000;s+=spacing){const p=atDistance(c,s),w=side*(p.width*.5+offset);out.push({position:[p.x+p.nx*w,p.y,p.z+p.nz*w],forward:[p.tx,p.ty,p.tz],distance:s,pathId:id});}return out;
 }
 getTerrainStamp(id,spacing=1){
  const p=this.getPath(id),c=this.caches.get(id);if(!p||!c?.length||p.elevation!=='terrain')return [];
  // Proposals only. Worldworks owns the actual terrain modifications and undo.
  const out=[];for(let s=0;s<=c.length&&out.length<4000;s+=clamp(spacing,.5,20)){const pt=atDistance(c,s);out.push({x:pt.x,z:pt.z,targetY:pt.y-p.lift,radius:pt.width/2,falloff:p.shoulder+1});}return out;
 }
 getCollisionMeshes(){return this.meshes.filter(m=>!['marking','emissive'].includes(m.kind)).map(m=>({owner:m.owner,positions:m.positions.slice()}));}
 createFollower({pathId,speed=3,distance:at=0,mode='pingpong',onMove=null,object=null}={}){
  if(!this.getPath(pathId))throw Error('Unknown follower path.');if(!Number.isFinite(speed)||!Number.isFinite(at))throw Error('Follower speed and starting distance must be finite.');
  const f={pathId,speed:clamp(speed,0,80),distance:Math.max(0,at),mode:['pingpong','loop','once'].includes(mode)?mode:'pingpong',onMove,object,active:true};this.followers.add(f);return f;
 }
 removeFollower(f){this.followers.delete(f);}
 update(dt=0){
  if(this.disposed)return;dt=clamp(Number(dt)||0,0,.25);this.elapsed+=dt;
  for(const f of this.followers){if(!f.active)continue;const c=this.caches.get(f.pathId);if(!c?.length)continue;f.distance+=dt*f.speed;let d=f.distance,reverse=false;
   if(f.mode==='pingpong'){const cycle=d%(c.length*2);reverse=cycle>c.length;d=reverse?2*c.length-cycle:cycle;}else if(f.mode==='once'){d=Math.min(d,c.length);if(d>=c.length)f.active=false;}else d%=c.length;
   const p=atDistance(c,d);if(reverse){p.tx*=-1;p.ty*=-1;p.tz*=-1;}if(f.object?.position){f.object.position.set(p.x,p.y,p.z);f.object.lookAt?.(p.x+p.tx,p.y+p.ty,p.z+p.tz);}f.onMove?.(p,f);
  }
 }
 getStats(){let length=0,points=0,maxGrade=0;for(const c of this.caches.values()){length+=c.length;maxGrade=Math.max(maxGrade,c.maxGrade);}for(const p of this.state.paths)points+=p.points.length;return{version:VERSION,paths:this.state.paths.length,points,length,triangles:this.meshes.reduce((n,m)=>n+m.positions.length/9,0),maxGrade,followers:this.followers.size};}
 syncThree(){
  const T=this.THREE;for(const child of [...this.group.children]){child.geometry?.dispose();this.group.remove(child);}
  for(const data of this.meshes){const geo=new T.BufferGeometry();geo.setAttribute('position',new T.BufferAttribute(data.positions,3));geo.setAttribute('normal',new T.BufferAttribute(data.normals,3));geo.setAttribute('uv',new T.BufferAttribute(data.uvs,2));geo.setAttribute('color',new T.BufferAttribute(data.colors,3));geo.computeBoundingSphere();
   const key=data.kind;let mat=this.materials.get(key);
   if(!mat){mat=new T.MeshStandardMaterial({color:0xffffff,vertexColors:true,roughness:key==='metal'?.34:.87,metalness:key==='metal'?.58:0,side:T.DoubleSide});
    if(key==='emissive'){mat.emissive=new T.Color('#ffd39a');mat.emissiveIntensity=.6;}this.materials.set(key,mat);}
   const m=new T.Mesh(geo,mat);m.name=data.owner||'path';m.userData={pathworks:true,pathId:data.owner};m.castShadow=data.kind!=='marking';m.receiveShadow=true;this.group.add(m);
  }
 }
 dispose(){if(this.disposed)return;this.disposed=true;this.followers.clear();if(this.group){for(const o of [...this.group.children])o.geometry?.dispose();this.group.removeFromParent();}for(const m of this.materials.values())m.dispose();this.materials.clear();this.meshes=[];this.caches.clear();this.context.onDispose?.();}
 destroy(){this.dispose();}
}
function createPathworks(context,state){return new PathworksEngine(context,state);}

// 06 / 10 — Editing operations: preserve linked junctions and per-point widths
function moveControlPoint(engine,pathId,pointId,worldPosition){
 const p=engine.getPath(pathId),pt=p?.points.find(q=>q.id===pointId);if(!pt||p.locked)return false;
 const refs=pt.junction?engine.state.paths.flatMap(path=>path.points.filter(q=>q.junction===pt.junction).map(q=>({path,pt:q}))):[{path:p,pt}];
 if(refs.some(r=>r.path.locked))throw Error('This junction includes a locked path. Unlock it before moving.');
 for(const r of refs){r.pt.x=worldPosition.x;r.pt.z=worldPosition.z;r.pt.y=worldPosition.y-r.path.lift-(r.path.elevation==='terrain'?engine.terrain(r.pt.x,r.pt.z):0);}return true;
}
function connectPoints(engine,pathId,pointId,targetPathId,targetPointId){
 const p=engine.getPath(pathId),a=p?.points.find(q=>q.id===pointId),q=engine.getPath(targetPathId),b=q?.points.find(pt=>pt.id===targetPointId);if(!a||!b||a===b||p.locked||q.locked)return false;
 const pos=worldPoint(q,b,(x,z)=>engine.terrain(x,z)),old=a.junction,j=b.junction||uid('junction');
 if(old&&engine.state.paths.some(r=>r.locked&&r.points.some(pt=>pt.junction===old)))throw Error('Unlock the connected paths before joining.');
 b.junction=j;
 for(const r of engine.state.paths)for(const pt of r.points)if(pt===a||(old&&pt.junction===old)){pt.junction=j;pt.x=pos.x;pt.z=pos.z;pt.y=pos.y-r.lift-(r.elevation==='terrain'?engine.terrain(pos.x,pos.z):0);}
 return true;
}
function setElevationMode(engine,id,mode){const p=engine.getPath(id);if(!p||p.elevation===mode)return;const positions=p.points.map(pt=>worldPoint(p,pt,(x,z)=>engine.terrain(x,z)));p.elevation=mode;p.points.forEach((pt,i)=>{pt.y=positions[i].y-p.lift-(mode==='terrain'?engine.terrain(pt.x,pt.z):0);});}
function splitPath(engine,id,pointIndex){
 const p=engine.getPath(id);if(!p||p.locked||p.closed||pointIndex<=0||pointIndex>=p.points.length-1)throw Error('Select an interior control point on an open, unlocked path.');
 if(engine.state.paths.length>=LIMITS.paths)throw Error('Path limit reached.');
 const joint=p.points[pointIndex];joint.junction=joint.junction||uid('junction');
 const q=copy(p);q.id=uid('path');q.name=p.name+' · branch';q.points=q.points.slice(pointIndex).map(pt=>({...pt,id:uid('pt')}));p.points=p.points.slice(0,pointIndex+1);engine.state.paths.push(q);return q.id;
}



root.PathworksCore={PathworksEngine,newDocument,newPath,findRoute,nearestOnPath};})(globalThis);
