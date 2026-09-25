/* Generated from the user's storyworks.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
/* Worldworks 0.1 — deterministic document model. No DOM or renderer dependencies. */
(function (root) {
'use strict';
const C = {};
C.VERSION = '0.1.0'; C.FORMAT = 'worldworks-project'; C.MAX_ASSETS = 5000;
C.kinds = ['pine','oak','rock','boulder','grass','shrub','campfire'];
C.clamp = (v,a,b) => Math.max(a,Math.min(b,v));
C.lerp = (a,b,t) => a+(b-a)*t;
C.smooth = (a,b,x) => { const t=C.clamp((x-a)/(b-a),0,1); return t*t*(3-2*t); };
C.rng = seed => () => { let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return ((t^t>>>14)>>>0)/4294967296; };
C.hash = (x,z,s) => { let h=Math.imul(x,374761393)^Math.imul(z,668265263)^Math.imul(s,1597334677);h=Math.imul(h^(h>>>13),1274126177);return ((h^(h>>>16))>>>0)/4294967295; };
C.noise = (x,z,s) => {const i=Math.floor(x),j=Math.floor(z),u=C.smooth(0,1,x-i),v=C.smooth(0,1,z-j);return C.lerp(C.lerp(C.hash(i,j,s),C.hash(i+1,j,s),u),C.lerp(C.hash(i,j+1,s),C.hash(i+1,j+1,s),u),v)*2-1;};
C.fbm = (x,z,s,n=4) => {let r=0,a=.55,w=0;for(let i=0;i<n;i++){r+=C.noise(x,z,s+i*103)*a;w+=a;x=x*2.03+5.2;z=z*2.03-7.1;a*=.5;}return r/w;};
C.hex = hex => {const n=parseInt(hex.replace('#',''),16);return [(n>>16)&255,(n>>8)&255,n&255].map(x=>Math.pow(x/255,2.2));};
C.palette = {grass:C.hex('#617e42'),dirt:C.hex('#926a46'),stone:C.hex('#949b94'),sand:C.hex('#c6ac70'),snow:C.hex('#e8eff0')};
C.defaults = {water:1.0,sunElevation:38,sunAzimuth:225,ambient:1.0,haze:.003,exposure:1.05,wind:.6,quality:1,layers:{water:true,vegetation:true,geology:true,effects:true}};
const copy = x => JSON.parse(JSON.stringify(x)); C.copy = copy;
C.create = (seed=1337,style='highlands',relief=26,n=128,size=180) => {
 const env=copy(C.defaults);if(style==='desert'){env.water=-4;env.sunElevation=52;}if(style==='alpine')env.water=.1;if(style==='islands')env.water=2.4;
 const doc={format:C.FORMAT,version:C.VERSION,generator:'ww-heightfield-1',name:({highlands:'Emerald basin',alpine:'Alpine reach',islands:'Saltwater isles',desert:'Ochre valley'})[style]||'Untitled world',seed:seed>>>0,style,relief,n,size,base:new Float32Array((n+1)**2),delta:new Float32Array((n+1)**2),paint:new Float32Array((n+1)**2*4),assets:[],nextId:1,strokeSeed:1,env};
 for(let j=0;j<=n;j++)for(let i=0;i<=n;i++){
  const x=(i/n-.5)*size,z=(j/n-.5)*size,wx=x+C.fbm(x*.018,z*.018,seed+71)*10,wz=z+C.fbm(x*.018+21,z*.018-13,seed+91)*10;
  const large=C.fbm(wx*.017,wz*.017,seed+321),r=1-Math.abs(C.fbm(wx*.039,wz*.039,seed+781,3));
  const massif=Math.exp(-((x-27)**2/1250+(z+24)**2/730))*.8+Math.exp(-((x+38)**2/900+(z+37)**2/800))*.7;
  let h=4+large*relief*.36+Math.pow(r,3)*relief*.31+massif*relief*.56;
  const river=Math.abs(x-Math.sin(z*.045)*12-4);h-=Math.exp(-river*river/30)*6.5*(1-C.smooth(-55,-8,z));
  if(style==='alpine')h+=Math.pow(r,7)*relief*.48;
  if(style==='islands')h-=5+Math.sin(x*.045+1)*2;
  if(style==='desert'){h=h*.8+3;const t=h/3,f=t-Math.floor(t);h=C.lerp(h,(Math.floor(t)+C.smooth(.62,.95,f))*3,.65);}
  h+=C.fbm(wx*.12,wz*.12,seed+502,3)*.65;
  const coast=1-C.smooth(size*.32,size*.51,Math.hypot(x*.97,z*1.02));
  doc.base[j*(n+1)+i]=(h+7)*coast-7;
 }
 return doc;
};
C.height = (d,i)=>d.base[i]+d.delta[i];
C.normalAt = (d,i,j) => {const n=d.n,k=n+1,s=d.size/n,x0=Math.max(i-1,0),x1=Math.min(i+1,n),z0=Math.max(j-1,0),z1=Math.min(j+1,n);let nx=(C.height(d,j*k+x0)-C.height(d,j*k+x1))/((x1-x0)*s),nz=(C.height(d,z0*k+i)-C.height(d,z1*k+i))/((z1-z0)*s);const l=Math.hypot(nx,1,nz);return [nx/l,1/l,nz/l];};
C.sample = (d,x,z) => {
 const gx=(x/d.size+.5)*d.n,gz=(z/d.size+.5)*d.n;if(gx<0||gz<0||gx>d.n||gz>d.n)return null;
 const i=Math.min(d.n-1,Math.floor(gx)),j=Math.min(d.n-1,Math.floor(gz)),u=gx-i,v=gz-j,k=d.n+1,a=j*k+i,b=a+1,c=a+k,e=c+1,lower=u+v<=1;
 const h=lower?C.height(d,a)*(1-u-v)+C.height(d,b)*u+C.height(d,c)*v:C.height(d,e)*(u+v-1)+C.height(d,c)*(1-u)+C.height(d,b)*(1-v);
 const dx=(lower?C.height(d,b)-C.height(d,a):C.height(d,e)-C.height(d,c))/(d.size/d.n),dz=(lower?C.height(d,c)-C.height(d,a):C.height(d,e)-C.height(d,b))/(d.size/d.n),l=Math.hypot(dx,1,dz);
 return {height:h,normal:[-dx/l,1/l,-dz/l],slope:Math.acos(1/l)*180/Math.PI};
};
C.baseColor = (d,x,z,h,normal) => {
 const t=C.clamp((h-5)/25,0,1), slope=1-normal[1], wet=C.fbm(x*.04,z*.04,d.seed+813)*.5+.5;
 let a=C.hex(d.style==='desert'?'#ae8250':wet>.5?'#557643':'#718d4e'),rock=C.hex(d.style==='desert'?'#a7734d':'#959b90');
 const blend=C.clamp(C.smooth(.12,.5,slope)+t*.25,0,1);a=a.map((v,i)=>C.lerp(v,rock[i],blend));
 if(d.style==='alpine'){const snow=C.smooth(21,30,h)*(1-C.smooth(.35,.7,slope));a=a.map((v,i)=>C.lerp(v,C.palette.snow[i],snow));}
 const coast=(1-C.smooth(d.env.water+.4,d.env.water+2.7,h))*(1-C.smooth(.1,.4,slope));a=a.map((v,i)=>C.lerp(v,C.palette.sand[i],coast*.9));
 const detail=.93+.09*C.noise(x*.6,z*.6,d.seed+29);return a.map(v=>v*detail);
};
C.terrainGeometry = d => {
 const count=(d.n+1)**2,pos=new Float32Array(count*3),nor=new Float32Array(count*3),col=new Float32Array(count*3),motion=new Float32Array(count);
 const index=new Uint32Array(d.n*d.n*6);let ii=0;
 for(let j=0;j<=d.n;j++)for(let i=0;i<=d.n;i++){
  const k=j*(d.n+1)+i,x=(i/d.n-.5)*d.size,z=(j/d.n-.5)*d.size,h=C.height(d,k),normal=C.normalAt(d,i,j),base=C.baseColor(d,x,z,h,normal),p=k*4;
  pos.set([x,h,z],k*3);nor.set(normal,k*3);col.set(base.map((v,c)=>C.lerp(v,d.paint[p+c],d.paint[p+3])),k*3);
  if(i<d.n&&j<d.n){const a=k,b=k+1,c=k+d.n+1,e=c+1;index.set([a,c,b,b,c,e],ii);ii+=6;}
 }
 return {pos,nor,col,motion,index};
};
C.makeStroke = (label) => ({label,heights:new Map(),paints:new Map(),added:[],removed:[],changed:[],area:null});
C.touchArea=(s,x,z,r)=>{if(!s.area)s.area={x0:x-r,x1:x+r,z0:z-r,z1:z+r};else{const a=s.area;a.x0=Math.min(a.x0,x-r);a.x1=Math.max(a.x1,x+r);a.z0=Math.min(a.z0,z-r);a.z1=Math.max(a.z1,z+r);}};
C.sculpt = (d,cmd,x,z,brush,amount) => {
 const {radius:r,falloff:soft,tool,target=0}=brush,n=d.n,step=d.size/n,half=d.size/2;
 let x0=Math.max(0,Math.floor((x-r+half)/step)),x1=Math.min(n,Math.ceil((x+r+half)/step)),z0=Math.max(0,Math.floor((z-r+half)/step)),z1=Math.min(n,Math.ceil((z+r+half)/step));
 const pending=[];
 for(let j=z0;j<=z1;j++)for(let i=x0;i<=x1;i++){
  const dist=Math.hypot(i*step-half-x,j*step-half-z)/r;if(dist>=1)continue;
  const w=1-C.smooth(Math.max(0,1-soft),1,dist),k=j*(n+1)+i,old=C.height(d,k);let next=old;
  if(tool==='raise'||tool==='lower')next+=amount*w*(tool==='lower'?-1:1);
  else if(tool==='flatten')next=C.lerp(old,target,Math.min(.75,amount*.7*w));
  else if(tool==='restore')next=C.lerp(old,d.base[k],Math.min(.85,amount*.65*w));
  else if(tool==='terrace')next=C.lerp(old,Math.round(old/2.5)*2.5,Math.min(.65,amount*.65*w));
  else if(tool==='smooth'){let sum=0,total=0;for(let b=-1;b<=1;b++)for(let a=-1;a<=1;a++){const ci=C.clamp(i+a,0,n),cj=C.clamp(j+b,0,n);sum+=C.height(d,cj*(n+1)+ci);total++;}next=C.lerp(old,sum/total,Math.min(.8,amount*w));}
  next=C.clamp(next,-40,100);if(Math.abs(next-old)<.000001)continue;
  if(!cmd.heights.has(k))cmd.heights.set(k,[d.delta[k],0]);pending.push([k,next-d.base[k]]);
 }
 for(const [k,v] of pending){d.delta[k]=v;cmd.heights.get(k)[1]=d.delta[k];}
 if(pending.length)C.touchArea(cmd,x,z,r+step*2);return pending.length;
};
C.paint = (d,cmd,x,z,brush,amount) => {
 const {radius:r,falloff:soft,material}=brush,n=d.n,step=d.size/n,half=d.size/2;let changed=0;
 const rgb=C.palette[material];
 for(let j=Math.max(0,Math.floor((z-r+half)/step));j<=Math.min(n,Math.ceil((z+r+half)/step));j++)for(let i=Math.max(0,Math.floor((x-r+half)/step));i<=Math.min(n,Math.ceil((x+r+half)/step));i++){
  const dist=Math.hypot(i*step-half-x,j*step-half-z)/r;if(dist>=1)continue;
  const w=(1-C.smooth(Math.max(0,1-soft),1,dist))*Math.min(.8,amount),k=j*(n+1)+i,p=k*4;if(w<.00001||(material==='auto'&&d.paint[p+3]<.000001))continue;
  if(!cmd.paints.has(k))cmd.paints.set(k,[Array.from(d.paint.subarray(p,p+4)),null]);
  if(material==='auto')d.paint[p+3]*=1-w;
  else{const oldA=d.paint[p+3],newA=oldA+(1-oldA)*w;for(let c=0;c<3;c++)d.paint[p+c]=(d.paint[p+c]*oldA*(1-w)+rgb[c]*w)/Math.max(newA,.000001);d.paint[p+3]=newA;}
  cmd.paints.get(k)[1]=Array.from(d.paint.subarray(p,p+4));changed++;
 }
 return changed;
};
C.addAsset = (d,kind,x,z,scale=1,yaw=0,follow=true,offset=0) => {
 if(d.assets.length>=C.MAX_ASSETS||!C.kinds.includes(kind))return null;
 if(kind==='campfire'&&d.assets.filter(a=>a.kind==='campfire').length>=24)return null;
 const s=C.sample(d,x,z);if(!s)return null;
 const a={id:'a'+d.nextId++,kind,x,y:s.height+offset,z,offset,scale,yaw,follow};d.assets.push(a);return a;
};
C.scatter = (d,cmd,x,z,brush,rng) => {
 const r=brush.radius, count=Math.max(1,Math.round(Math.PI*r*r*.02*brush.density));let made=0;
 for(let i=0;i<count*4&&made<count;i++){
  const ang=rng()*Math.PI*2,dist=Math.sqrt(rng())*r,px=x+Math.cos(ang)*dist,pz=z+Math.sin(ang)*dist,s=C.sample(d,px,pz);if(!s||s.height<d.env.water+.2||s.slope>brush.maxSlope)continue;
  if(rng()>1-C.smooth(Math.max(0,1-brush.falloff),1,dist/r))continue;
  const q=rng();let kind=brush.asset==='forest'?(q<.5?'pine':q<.73?'oak':q<.88?'grass':'rock'):brush.asset;
  if(brush.habitat && d.style==='desert' && ['pine','oak'].includes(kind))continue;
  if(brush.habitat && d.style==='alpine' && s.height>26 && ['pine','oak','grass'].includes(kind))continue;
  const sep=brush.spacing*(kind==='grass'?.35:kind==='campfire'?1.6:1);
  if(d.assets.some(a=>Math.hypot(a.x-px,a.z-pz)<sep))continue;
  const a=C.addAsset(d,kind,px,pz,C.lerp(brush.minScale,brush.maxScale,rng()),rng()*Math.PI*2,true,0);
  if(a){cmd.added.push(copy(a));made++;}
 }
 return made;
};
C.erase = (d,cmd,x,z,r,all=true,kind='pine') => {
 const removed=d.assets.filter(a=>Math.hypot(a.x-x,a.z-z)<=r&&(all||a.kind===kind));
 if(!removed.length)return 0;const ids=new Set(removed.map(a=>a.id));d.assets=d.assets.filter(a=>!ids.has(a.id));
 for(const a of removed){const newly=cmd.added.findIndex(v=>v.id===a.id);if(newly>=0)cmd.added.splice(newly,1);else cmd.removed.push(copy(a));}return removed.length;
};
C.followTerrain = (d,area) => {
 for(const a of d.assets){if(!a.follow)continue;if(area&&(a.x<area.x0||a.x>area.x1||a.z<area.z0||a.z>area.z1))continue;const s=C.sample(d,a.x,a.z);if(s)a.y=s.height+a.offset;}
};
C.applyCommand = (d,c,forward=true) => {
 for(const [i,v] of c.heights)d.delta[i]=v[forward?1:0];
 for(const [i,v] of c.paints)d.paint.set(v[forward?1:0],i*4);
 const removed=forward?c.removed:c.added,added=forward?c.added:c.removed,ids=new Set(removed.map(a=>a.id));d.assets=d.assets.filter(a=>!ids.has(a.id));
 for(const a of added)if(!d.assets.some(b=>b.id===a.id))d.assets.push(copy(a));
 for(const change of c.changed){const index=d.assets.findIndex(a=>a.id===change[0].id);if(index>=0)d.assets[index]=copy(change[forward?1:0]);}
 C.followTerrain(d,c.area);
};
C.commandHasChanges = c => c.heights.size||c.paints.size||c.added.length||c.removed.length||c.changed.length;
C.encodeFloats = values => {const bytes=new Uint8Array(values.buffer,values.byteOffset,values.byteLength);let s='';for(let i=0;i<bytes.length;i+=16384)s+=String.fromCharCode(...bytes.subarray(i,i+16384));return btoa(s);};
C.decodeFloats = (s,length) => {if(typeof s!=='string'||s.length>length*6+16)throw Error('Invalid terrain data length');const raw=atob(s);if(raw.length!==length*4)throw Error('Terrain grid length does not match the project');const bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));const a=new Float32Array(bytes.buffer);for(const v of a)if(!Number.isFinite(v))throw Error('Project contains a non-finite terrain value');return a;};
C.export = d => ({format:C.FORMAT,version:C.VERSION,generator:d.generator,name:d.name,seed:d.seed,style:d.style,relief:d.relief,n:d.n,size:d.size,nextId:d.nextId,strokeSeed:d.strokeSeed,encoding:'float32-le-base64',base:C.encodeFloats(d.base),delta:C.encodeFloats(d.delta),paint:C.encodeFloats(d.paint),assets:copy(d.assets),env:copy(d.env)});
C.import = p => {
 if(!p||p.format!==C.FORMAT||p.version!==C.VERSION||p.encoding!=='float32-le-base64')throw Error('This is not a supported Worldworks 0.1 project');
 if(!Number.isInteger(p.n)||p.n<32||p.n>256||!Number.isFinite(p.size)||p.size<30||p.size>500)throw Error('Unsupported terrain dimensions');
 if(!['highlands','alpine','islands','desert'].includes(p.style))throw Error('Unsupported terrain style');
 if(!Number.isSafeInteger(p.seed)||p.seed<0||p.seed>4294967295)throw Error('Invalid world seed');
 const k=(p.n+1)**2,d={format:p.format,version:p.version,generator:String(p.generator||''),name:String(p.name||'Imported world').slice(0,80),seed:p.seed>>>0,style:p.style,relief:C.clamp(Number(p.relief)||26,8,60),n:p.n,size:p.size,base:C.decodeFloats(p.base,k),delta:C.decodeFloats(p.delta,k),paint:C.decodeFloats(p.paint,k*4),assets:[],nextId:1,strokeSeed:Math.max(1,Number(p.strokeSeed)||1),env:copy(C.defaults)};
 for(let i=0;i<k;i++){if(Math.abs(d.base[i])>200||Math.abs(d.delta[i])>200)throw Error('Elevation is outside supported limits');for(let c=0;c<4;c++)if(d.paint[i*4+c]<0||d.paint[i*4+c]>1.001)throw Error('Invalid surface paint data');}
 if(!Array.isArray(p.assets)||p.assets.length>C.MAX_ASSETS)throw Error('Too many assets');const ids=new Set();let maxId=0,fire=0;
 for(const a of p.assets){if(!a||typeof a.id!=='string'||!/^a[1-9][0-9]{0,8}$/.test(a.id)||ids.has(a.id)||!C.kinds.includes(a.kind))throw Error('Invalid or duplicate asset');for(const key of ['x','y','z','offset','scale','yaw'])if(!Number.isFinite(a[key]))throw Error('Invalid object transform');if(Math.abs(a.x)>p.size/2||Math.abs(a.z)>p.size/2||Math.abs(a.y)>300||Math.abs(a.offset)>100||a.scale<.05||a.scale>8||Math.abs(a.yaw)>10000)throw Error('Object transform is outside supported limits');if(a.kind==='campfire'&&++fire>24)throw Error('Maximum 24 campfires');ids.add(a.id);maxId=Math.max(maxId,Number(a.id.slice(1)));d.assets.push({id:a.id,kind:a.kind,x:a.x,y:a.y,z:a.z,offset:a.offset,scale:a.scale,yaw:a.yaw,follow:a.follow!==false});}
 d.nextId=Math.max(maxId+1,Number.isSafeInteger(p.nextId)?p.nextId:1);
 const limits={water:[-10,18],sunElevation:[2,85],sunAzimuth:[0,360],ambient:[.2,2],haze:[0,.02],exposure:[.4,2],wind:[0,2],quality:[.65,1.5]};
 for(const [key,[min,max]] of Object.entries(limits))if(p.env&&Number.isFinite(p.env[key]))d.env[key]=C.clamp(p.env[key],min,max);
 for(const key of Object.keys(d.env.layers))if(typeof p.env?.layers?.[key]==='boolean')d.env.layers[key]=p.env.layers[key];
 C.followTerrain(d);return d;
};
C.seedAssets = (d) => {
 const rng=C.rng(d.seed+5117);for(let i=0;i<3200&&d.assets.length<520;i++){
  const x=(rng()-.5)*d.size*.9,z=(rng()-.5)*d.size*.9,s=C.sample(d,x,z);if(!s||s.height<d.env.water+1||s.slope>42)continue;
  const cluster=C.fbm(x*.035,z*.035,d.seed+408);if(rng()>(.28+cluster*.5))continue;
  const v=rng();let kind=v<.24?'pine':v<.4?'oak':v<.64?'rock':v<.7?'boulder':v<.95?'grass':'shrub';
  if(d.style==='desert'&&['pine','oak','grass'].includes(kind))kind='rock';if(d.style==='alpine'&&s.height>25&&['pine','oak','grass'].includes(kind))kind='rock';
  if(d.assets.some(a=>Math.hypot(a.x-x,a.z-z)<(kind==='grass'?1:2.2)))continue;
  C.addAsset(d,kind,x,z,.75+rng()*.65,rng()*Math.PI*2);
 }
};
root.WWCore=C;
if(typeof module!=='undefined'&&module.exports)module.exports=C;
})(typeof window!=='undefined'?window:globalThis);
