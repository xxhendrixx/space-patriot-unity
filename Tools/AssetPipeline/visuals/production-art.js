// Authored production geometry, measured against ArtDirection/*-target.png.
// Unity receives real meshes. No concept images are placed over the game camera.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries,mergeVertices} from 'three/addons/utils/BufferGeometryUtils.js';
import {createCanvas,loadImage} from '@napi-rs/canvas';
import {productionLayout} from './production-layout.js';
const surfaceAtlas=await loadImage(new URL('../../../ArtDirection/surface-atlas.png',import.meta.url).pathname.replace(/^\/([A-Z]:)/i,'$1'));

let palette;
function materials(){
 if(palette)return palette;
 const c=document.createElement('canvas');c.width=c.height=512;const q=c.getContext('2d');
 let seed=71823;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
 q.fillStyle='#e0dcd2';q.fillRect(0,0,512,512);
 for(let i=0;i<42000;i++){let v=120+rnd()*120;q.fillStyle=`rgba(${v},${v},${v},.08)`;q.fillRect(rnd()*512,rnd()*512,1+rnd()*2,1);}
 for(let i=0;i<230;i++){q.strokeStyle=`rgba(65,58,48,${rnd()*.19})`;q.lineWidth=.5+rnd();let x=rnd()*512,y=rnd()*512;q.beginPath();q.moveTo(x,y);q.lineTo(x+5+rnd()*22,y+rnd()*3);q.stroke();}
 const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;tx.wrapS=tx.wrapT=T.RepeatWrapping;
 const mat=(color,metal=.35,rough=.57)=>new T.MeshStandardMaterial({color,metalness:metal,roughness:rough,map:tx});
 palette={ivory:mat('#bbb6a2'),olive:mat('#515b50'),dark:mat('#303632'),rubber:mat('#171b19',.02,.9),steel:mat('#959b96',.85,.31),ochre:mat('#ad7731'),glass:new T.MeshStandardMaterial({color:'#172b36',metalness:.65,roughness:.18}),lamp:new T.MeshBasicMaterial({color:'#ffe0a5'}),screen:new T.MeshBasicMaterial({color:'#aab871'})};
 for(const [key,index]of [['ivory',0],['olive',1],['rubber',2],['dark',3],['steel',3]]){const cell=createCanvas(1024,1024),ctx=cell.getContext('2d');ctx.drawImage(surfaceAtlas,(index%2)*surfaceAtlas.width/2,Math.floor(index/2)*surfaceAtlas.height/2,surfaceAtlas.width/2,surfaceAtlas.height/2,0,0,1024,1024);const map=new T.CanvasTexture(cell);map.colorSpace=T.SRGBColorSpace;map.wrapS=map.wrapT=T.RepeatWrapping;palette[key].map=map;palette[key].color.set(key==='steel'?'#d7ddda':key==='dark'?'#939997':'#ffffff');palette[key].roughness=key==='steel'?.4:.78;palette[key].metalness=key==='steel'?.8:.15;}
 palette.ivory.color.set('#b6ad98');palette.ivory.name='Hull finish';return palette;
}
// Modeling coordinates use Unity +Z forward; reflect once here for the exporter.
class Yard {
 constructor(){this.root=new T.Group();this.batches=new Map();this.m=materials();this.buttons=[];}
 add(g,m='ivory',name='fabricated surface',data={}){
  g.scale(1,1,-1);if(g.index)g=g.toNonIndexed();
  const p=g.attributes.position,n=g.attributes.normal,uv=[];
  // Winding reflection is reconciled with these normals by the Unity importer.
  for(let i=0;i<p.count;i++){let x=Math.abs(n.getX(i)),y=Math.abs(n.getY(i)),z=Math.abs(n.getZ(i));if(y>x&&y>z)uv.push(p.getX(i)*.34,p.getZ(i)*.34);else if(x>z)uv.push(p.getZ(i)*.34,p.getY(i)*.34);else uv.push(p.getX(i)*.34,p.getY(i)*.34);}
  if(!data.unique&&!data.keepUV)g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  if(data.unique){const mesh=new T.Mesh(g,this.m[m]||m);mesh.name=name;mesh.userData=data;this.root.add(mesh);return mesh;}
  const key=m+(data.gear?'gear':'');if(!this.batches.has(key))this.batches.set(key,{m:this.m[m],name,data,geos:[]});this.batches.get(key).geos.push(g);
 }
 box(p,size,m='ivory',bevel=.03,rot=[0,0,0],data={}){let g=bevel<=.02?new T.BoxGeometry(...size):new RoundedBoxGeometry(...size,1,Math.min(bevel,...size.map(x=>x*.3)));g.rotateX(rot[0]);g.rotateY(rot[1]);g.rotateZ(rot[2]);g.translate(...p);return this.add(g,m,'Machined panel',{...data,keepUV:m==='olive'});}
 beam(a,b,w,d,m='ivory'){a=new T.Vector3(...a);b=new T.Vector3(...b);const dir=b.clone().sub(a);const g=new RoundedBoxGeometry(w,d,dir.length(),2,Math.min(w,d)*.13);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,0,1),dir.normalize()));g.translate(...a.add(b).multiplyScalar(.5).toArray());this.add(g,m,'Chamfered structural rail');}
 tube(a,b,r,m='steel',r2=r,data={}){a=new T.Vector3(...a);b=new T.Vector3(...b);let d=b.clone().sub(a),g=new T.CylinderGeometry(r2,r,d.length(),12);g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize()));g.translate(...a.add(b).multiplyScalar(.5).toArray());this.add(g,m,'Plumbing and articulated struts',data);}
 ring(p,r,t,m='steel',rot=[0,0,0]){const g=new T.TorusGeometry(r,t,6,24);g.rotateX(rot[0]);g.rotateY(rot[1]);g.rotateZ(rot[2]);g.translate(...p);this.add(g,m,'Machined collar');}
 loft(sections,m='ivory',offset=[0,0,0]){const cross=[[-.70,1],[.70,1],[1,.55],[1,-.55],[.70,-1],[-.70,-1],[-1,-.55],[-1,.55]],p=[],ix=[];
  sections=sections.slice().sort((a,b)=>a[0]-b[0]);for(const [z,w,h,y] of sections)for(const [x,v]of cross)p.push(x*w+offset[0],v*h+y+offset[1],z+offset[2]);
  for(let s=0;s<sections.length-1;s++)for(let j=0;j<8;j++){const a=s*8+j,b=s*8+(j+1)%8;ix.push(a,a+8,b,b,a+8,b+8);}
  for(let j=1;j<7;j++){ix.push(0,j,j+1);let a=(sections.length-1)*8;ix.push(a,a+j+1,a+j);}
  let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setIndex(ix);g=g.toNonIndexed();g.computeVertexNormals();this.add(g,m,'Formed pressure hull');
 }
 plate(outline,y,t,m='ivory'){const sh=new T.Shape();outline.forEach(([x,z],i)=>i?sh.lineTo(x,z):sh.moveTo(x,z));sh.closePath();const g=new T.ExtrudeGeometry(sh,{depth:t,bevelEnabled:true,bevelSize:t*.16,bevelThickness:t*.16,bevelSegments:1,steps:1});g.rotateX(Math.PI/2);g.translate(0,y+t,0);this.add(g,m,'Swept lifting surface');}
 bolt(x,y,z,r=.035){this.tube([x,y,z],[x,y,z+.025],r,'steel');this.box([x,y,z+.026],[r*.95,.008,.004],'rubber',0);}
 dial(x,y,z,action){this.ring([x,y,z],.070,.008,'steel');const g=new T.CylinderGeometry(.057,.057,.060,24);g.rotateX(Math.PI/2);g.translate(x,y,z-.025);this.add(g,'dark','Rotary control',{unique:true,controlAction:action});this.box([x,y+.025,z-.058],[.007,.037,.005],'ivory',.001);}
 text(text,p,w,h,color='#2f352f',rot=[0,0,0]){const c=document.createElement('canvas');c.width=1024;c.height=128;const q=c.getContext('2d');q.clearRect(0,0,1024,128);q.fillStyle=color;q.font='bold 64px monospace';q.textAlign='center';q.textBaseline='middle';q.fillText(text,512,64,1000);const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;const m=new T.MeshBasicMaterial({map:tx,transparent:true,side:T.DoubleSide});let g=new T.PlaneGeometry(w,h);g.rotateY(Math.PI);for(let i=0;i<g.attributes.uv.count;i++)g.attributes.uv.setX(i,1-g.attributes.uv.getX(i));g.rotateX(rot[0]);g.rotateY(rot[1]);g.rotateZ(rot[2]);g.translate(...p);return this.add(g,m,'Stencil '+text,{unique:true});}
 finish(){for(const row of this.batches.values()){let g=mergeVertices(mergeGeometries(row.geos,false),.00001),mesh=new T.Mesh(g,row.m);mesh.name=row.name;mesh.userData=row.data;this.root.add(mesh);}this.root.userData.buttons=this.buttons;return this.root;}
}

function drive(y,x,z,r,len){
 y.loft([[z+len*.48,r*.72,r*.76,0],[z+len*.31,r,r,0],[z-len*.32,r,r,0],[z-len*.48,r*.82,r*.82,0]],'dark',[x,0,0]);
 for(let i=0;i<8;i++){const a=i*Math.PI/4;y.box([x+Math.cos(a)*r*.91,Math.sin(a)*r*.91,z],[r*.5,r*.19,len*.65],i%3===0?'olive':'ivory',r*.04,[0,0,a-Math.PI/2]);}
 for(let k of [-.34,.31])y.ring([x,0,z+len*k],r*.98,r*.075,'steel');
 y.tube([x,0,z-len*.4],[x,0,z-len*.53],r*.73,'rubber',r*.9);
 y.ring([x,0,z-len*.54],r*.84,r*.055);y.ring([x,0,z-len*.545],r*.59,r*.03,'ochre');
 for(let i=0;i<12;i++){let a=i*Math.PI/6;y.tube([x+Math.cos(a)*r*.67,Math.sin(a)*r*.67,z-len*.54],[x+Math.cos(a)*r*.87,Math.sin(a)*r*.87,z-len*.54],r*.022,'steel');}
 y.tube([x,0,z-len*.5],[x,0,z-len*.505],r*.27,'lamp');
 for(let s of [-1,1])for(let k=0;k<2;k++)y.tube([x+s*r*.8,r*.5,z-len*.32],[x+s*r*.8,r*.5,z+len*.31],r*.047,'steel');
}
function leg(y,x,z,H,u){const data={gear:true};const a=[x,-H*.26,z],b=[x*1.12,-H*.39-.45*u,z-.35*u],c=[x*1.18,-H*.3-1.7,z+.1*u];
 y.tube(a,b,.15*u,'dark',.22*u,data);y.tube(b,c,.10*u,'steel',.13*u,data);y.tube([x*.83,-H*.23,z+.7*u],c,.06*u,'steel',.09*u,data);
 y.box(c,[1.0*u,.17*u,1.4*u],'rubber',.08*u,[0,0,0],data);y.box([c[0],c[1]+.10*u,c[2]],[.8*u,.09*u,1.1*u],'steel',.03,[0,0,0],data);
 for(let k=-1;k<=1;k++)y.box([c[0],c[1]-.085*u,c[2]+k*.33*u],[.85*u,.06*u,.08*u],'dark',.01,[0,0,0],data);
}
export function productionRefit(ignored,craft){
 const y=new Yard(),[L,W,H]=craft.dimensions,f=craft.family,u=Math.min(2.2,L/22),cargo=f===2,salvage=f===5,manta=f===4,large=L>60;
 const bodyW=W*(cargo?.17:salvage?.20:large?.26:.19),bodyH=H*.46;
 const bodyFront=cargo?.31:.44;
 y.loft([[-L*.35,bodyW*.81,bodyH*.83,0],[-L*.25,bodyW,bodyH,0],[L*.14,bodyW,bodyH,.03*H],[L*.30,bodyW*.90,bodyH*.89,0],[L*bodyFront,bodyW*.63,bodyH*.53,-H*.12]],f===5?'dark':'ivory');
 // Separate armor bays with visible narrow gaskets, perimeter fasteners and service hatches.
 for(let k=0;k<5;k++){let z=(-.24+k*.09)*L;
  y.box([0,H*.47,z],[bodyW*1.36,.075*u,L*.083],k===2?'ochre':k===4?'olive':'ivory',.04*u);
  for(let s of [-1,1]){y.box([s*bodyW*1.006,-H*.02,z],[.045*u,H*.44,L*.082],k===2?'ochre':'olive',.025*u);
   for(let a of [-1,1])for(let b of [-1,1])y.tube([s*(bodyW+.035*u),a*H*.18,z+b*L*.032],[s*(bodyW+.07*u),a*H*.18,z+b*L*.032],.033*u,'steel');
  }
 }
 // Segmented windshield set INTO a chamfered bridge, not a box pasted onto a wedge.
 const bridgeZ=L*.29;
 y.loft([[bridgeZ-L*.115,bodyW*.83,H*.19,H*.34],[bridgeZ,bodyW*.78,H*.19,H*.34],[bridgeZ+L*.075,bodyW*.60,H*.11,H*.23]],'dark');
 for(let s of [-1,1]){y.box([s*bodyW*.39,H*.39,bridgeZ+L*.05],[bodyW*.71,H*.27,.045*u],'glass',.025*u,[-.52,0,0]);
 y.box([s*bodyW*.77,H*.39,bridgeZ-L*.025],[.04*u,H*.25,L*.12],'glass',.018*u,[0,0,-s*.20]);
 y.tube([s*bodyW*.78,H*.52,bridgeZ-L*.10],[s*bodyW*.65,H*.36,bridgeZ+L*.09],.055*u,'steel');}
 y.tube([0,H*.54,bridgeZ],[0,H*.30,bridgeZ+L*.105],.045*u,'steel');
 // Readable sensor turret under the nose and clustered maneuvering thrusters.
 y.tube([0,-H*.30,L*.40],[0,-H*.30,L*.45],.32*u,'dark');y.ring([0,-H*.30,L*.455],.24*u,.04*u);y.tube([0,-H*.30,L*.455],[0,-H*.30,L*.46],.15*u,'glass');
 for(let s of [-1,1]){for(let z of [-.28,.31]){y.box([s*bodyW*.91,-H*.25,z*L],[.5*u,.45*u,.7*u],'dark',.08*u);for(let k=-1;k<=1;k++)y.tube([s*(bodyW+.08*u),-H*.25,z*L+k*.18*u],[s*(bodyW+.15*u),-H*.25,z*L+k*.18*u],.065*u,'rubber');}}
 if(cargo){
  for(let s of [-1,1]){let x=s*W*.34;for(let h of [-H*.31,H*.38])y.tube([x,h,-L*.38],[x,h,L*.15],.11*u,'steel');
   for(let k=0;k<3;k++){let z=(-.26+k*.15)*L;y.box([x,0,z],[W*.22,H*.56,L*.133],'olive',.09*u);
    for(let n=0;n<10;n++)y.box([x+s*W*.111,0,z-L*.059+n*L*.013],[.055*u,H*.5,.035*u],'steel',.015);
    for(let a of [-1,1])for(let b of [-1,1])y.box([x+a*W*.108,b*H*.27,z],[.1*u,.1*u,L*.135],'ochre',.02);
    y.tube([x,-H*.31,z-L*.067],[x,H*.38,z+L*.067],.065*u,'steel');
   }
  }
 } else if(salvage){
  const x=-W*.35;y.tube([x,-H*.05,-L*.29],[x,-H*.05,L*.18],.65*u,'steel');for(let k=0;k<6;k++)y.ring([x,-H*.05,(-.25+k*.08)*L],.69*u,.06*u,'ochre');
  const p0=[W*.27,0,-L*.20],p1=[W*.28,H*.92,-L*.07],p2=[W*.34,H*.77,L*.29],p3=[W*.34,H*.2,L*.40];
  for(let i=0;i<3;i++){let a=[p0,p1,p2][i],b=[p1,p2,p3][i];y.tube(a,b,.27*u,'ochre');y.tube([a[0]-.22*u,a[1],a[2]],[b[0]-.22*u,b[1],b[2]],.07*u,'steel');y.tube([a[0]-.34*u,a[1],a[2]],[a[0]+.34*u,a[1],a[2]],.34*u,'dark');}
  for(let s of [-1,1]){y.tube(p3,[p3[0]+s*.60*u,p3[1]-.5*u,p3[2]],.13*u,'steel');y.tube([p3[0]+s*.60*u,p3[1]-.5*u,p3[2]],[p3[0]+s*.32*u,p3[1]-1.0*u,p3[2]],.1*u,'dark');}
 } else {
  for(let s of [-1,1]){let points=manta?[[.10,.35],[.20,.18],[.36,.30],[.49,-.16],[.44,-.36],[.22,-.30],[.12,-.15]]:f===1?[[.12,.14],[.47,.29],[.40,.01],[.26,-.25],[.14,-.27]]:[[.12,.06],[.44,-.08],[.49,-.20],[.24,-.29],[.12,-.24]];
   y.plate(points.map(([x,z])=>[s*x*W,-z*L]),-H*.02,H*(manta?.14:.085),'ivory');
   y.plate(points.map(([x,z])=>[s*x*W*.95,-z*L*.97]),H*.10,.03*u,'olive');
   y.tube([s*W*.22,-H*.05,-L*.07],[s*W*.41,-H*.05,-L*.16],.09*u,'steel');
   if(!manta)y.box([s*W*.455,H*.10,-L*.15],[.07*u,H*.42,L*.09],'olive',.02,[0,0,-s*.25]);
  }
 }
 // Distinct propulsion spacing leaves negative space around actual load-bearing pylons.
 const ex=cargo?W*.34:W*(manta?.21:.29),ez=-L*.31,er=Math.min(W*.105,H*.32);
 for(let s of [-1,1]){y.box([s*(ex+bodyW)*.5,0,ez],[ex-bodyW+.6*u,.37*u,L*.12],'dark',.06);drive(y,s*ex,ez,er,L*.26);if(cargo||f===9){let sub=new Yard();drive(sub,s*ex,ez,er*.8,L*.22);const g=sub.finish();g.position.y=-H*.58;y.root.add(g);}}
 // Radiator banks, believable routed coolant lines and a vented dorsal service spine.
 for(let s of [-1,1])for(let k=0;k<14;k++)y.box([s*bodyW*.56,H*.5,-L*.22+k*L*.012],[bodyW*.48,.04*u,.026*u],'dark',.007);
 for(let s of [-1,1]){y.tube([s*bodyW*.75,H*.26,-L*.25],[s*ex,er*.6,ez],.075*u,'steel');leg(y,s*bodyW*.82,L*.24,H,u);leg(y,s*W*.27,-L*.22,H,u);}
 y.tube([0,H*.51,-L*.12],[0,H*.51+u*.65,-L*.12],.025*u,'steel');
 if(large){for(let k=0;k<12;k++)for(let s of [-1,1])y.box([s*bodyW*1.01,H*.12,(-.23+k*.044)*L],[.02*u,.23*u,.52*u],'glass',.01);}
 return y.finish();
}

function instrument(y,x,cy,z,w,h,index){
 y.box([x,cy,z],[w+.17,h+.17,.13],'dark',.065);y.box([x,cy,z-.076],[w+.05,h+.05,.028],'rubber',.03);
 const c=document.createElement('canvas');c.width=768;c.height=512;const q=c.getContext('2d');q.fillStyle='#0c1514';q.fillRect(0,0,768,512);q.strokeStyle='#697d51';q.lineWidth=2;q.strokeRect(18,18,732,476);q.fillStyle='#b4c887';q.font='22px monospace';q.fillText(['PROPULSION / IFCS','NAV / SURFACE RADAR','VESSEL / ENGINEERING'][index],36,52);
 if(index===1){q.save();q.translate(320,245);for(let r of [60,120,174]){q.beginPath();q.arc(0,0,r,0,7);q.stroke();}q.beginPath();q.moveTo(-186,0);q.lineTo(186,0);q.moveTo(0,-186);q.lineTo(0,186);q.stroke();for(let i=0;i<6;i++){q.fillRect(Math.sin(i*4)*130,Math.cos(i*3)*100,5,5);}q.restore();q.fillText('ALT (m)',560,102);for(let i=0;i<9;i++){q.fillRect(565,130+i*31,20,1);}q.fillText('0',610,260);}
 else{for(let i=0;i<6;i++){q.fillText((index===0?['FUEL','THRUST','IFCS','LOAD','COOLANT','RESERVE']:['REACTOR','ENGINES','SHIELDS','LIFE SUPPORT','WEAPONS','CARGO'])[i],40,120+i*53);q.fillStyle='#354832';q.fillRect(390,100+i*53,270,24);q.fillStyle='#b4c887';q.fillRect(392,102+i*53,(i===3?190:250),20);}}
 const tx=new T.CanvasTexture(c);tx.colorSpace=T.SRGBColorSpace;let m=new T.MeshBasicMaterial({map:tx});let g=new T.PlaneGeometry(w,h);g.rotateY(Math.PI);for(let i=0;i<g.attributes.uv.count;i++)g.attributes.uv.setX(i,1-g.attributes.uv.getX(i));g.translate(x,cy,z-.092);y.add(g,m,'MFD '+index,{unique:true,mfdIndex:index});
 for(let sx of [-1,1])for(let sy of [-1,1])y.bolt(x+sx*(w*.5+.04),cy+sy*(h*.5+.04),z-.10,.021);
 for(let s of [-1,1])for(let k=0;k<4;k++){const action=100+index*10+(s<0?k:k+4);y.box([x+s*(w*.5+.07),cy+h*.36-k*h*.24,z-.09],[.045,.055,.035],'olive',.008,[0,0,0],{unique:true,controlAction:action});}
}
function shellRoom(y,x0,x1,z0,z1,roof=1.2){
 const width=x1-x0,depth=z1-z0,mid=(z0+z1)/2;
 y.box([(x0+x1)/2,-1.75,-mid],[width,.18,depth],'dark',.04);
 y.box([(x0+x1)/2,roof,-mid],[width,.13,depth],'ivory',.025);
 for(let x of [x0,x1]){y.box([x,-.25,-mid],[.14,roof+1.7,depth],'ivory',.025);y.box([x+(x===x0?.09:-.09),-.20,-mid],[.025,.65,depth-.12],'olive',.01);
  for(let z=z0+.4;z<z1;z+=1.45){y.box([x+(x===x0?.11:-.11),-.20,-z],[.17,roof+1.5,.08],'dark',.015);for(let h of [-1.35,.65])y.tube([x+(x===x0?.13:-.13),h,-z-.60],[x+(x===x0?.13:-.13),h,-z+.60],.029,'steel');}
 }
 for(let z=z0+.4;z<z1;z+=1.45){y.box([(x0+x1)/2,-1.652,-z],[width-.3,.012,.025],'steel',.002);y.box([(x0+x1)/2,roof-.10,-z],[Math.min(1.1,width*.65),.045,.15],'dark',.02);y.box([(x0+x1)/2,roof-.125,-z],[Math.min(.96,width*.6),.022,.07],'lamp',.006);}
 for(let x of [x0+.25,x1-.25])y.box([x,-1.645,-mid],[.04,.008,depth-.15],'ochre',.002);
}
function furniture(y,f){
 const x=f.x,z=-f.z,w=f.w,d=f.d,h=f.h,base=-1.64+(f.y||0);
 if(f.type==='bunk')for(let k=0;k<2;k++){
  let cy=base+.35+k*1.0;y.box([x,cy,z],[w,.16,d],'olive',.045);y.box([x,cy+.14,z],[w*.88,.14,d*.89],'rubber',.07);y.box([x,cy+.24,z+d*.32],[w*.72,.15,d*.2],'ivory',.07);
  for(let s of [-1,1]){y.box([x,base+h*.5,z+s*d*.46],[w,h,.07],'ivory',.01);y.tube([x+w*.40,cy+.28,z-d*.46],[x+w*.40,cy+.28,z+d*.46],.025,'steel');}
 } else if(f.type==='table'){y.box([x,base+h,z],[w,.11,d],'steel',.07);for(let s of [-1,1])y.tube([x,base,z+s*d*.32],[x,base+h,z+s*d*.32],.09,'dark');y.tube([x+w*.25,base+h+.05,z],[x+w*.25,base+h+.30,z],.06,'dark');}
 else if(f.type==='reactor'||f.type==='engine'||f.type==='generator'){
  for(let s of [-1,1]){let cx=x+s*w*.24;y.tube([cx,base+.2,z],[cx,base+h*.88,z],w*.19,'ivory');for(let n=0;n<5;n++)y.ring([cx,base+.3+n*h*.16,z],w*.2,.04,'steel',[Math.PI/2,0,0]);y.tube([cx+w*.23,base+.2,z],[cx+w*.23,base+h,z],.06,'dark');}
 }else{
  const seat=['seat','bench'].includes(f.type);y.box([x,base+(seat?.27:h*.5),z],[w,seat?.42:h,d],seat?'olive':'dark',.045);
  if(seat){y.box([x,base+.53,z],[w*.94,.16,d*.86],'rubber',.06);y.box([x,base+.91,z-d*.39],[w*.94,.68,.16],'rubber',.08);}
  else{for(let k=0;k<3;k++){y.box([x-w*.32+k*w*.32,base+h*.5,z+d*.51],[w*.3,h*.9,.035],'olive',.016);y.box([x-w*.32+k*w*.32+.07,base+h*.51,z+d*.54],[.028,.16,.025],'steel',.006);}for(let s of [-1,1])y.box([x+s*w*.4,base+h+.014,z],[.038,.025,d*.98],'ochre',.005);}
 }
}
export function productionCockpit(ignored,craft){
 const y=new Yard(),wide=craft.dimensions[0]>60;
 // Locked eye origin, 65 degree vertical FOV: contour corresponds to cockpit-target.png.
 y.box([0,-.65,2.39],[3.8,.86,.52],'ivory',.08,[-.10,0,0]);
 y.box([0,.02,2.25],[3.55,.12,.19],'dark',.035);
 instrument(y,-.96,-.30,2.13,.55,.42,0);instrument(y,0,-.24,2.10,.93,.53,1);instrument(y,.96,-.30,2.13,.55,.42,2);
 for(let s of [-1,1]){
  y.box([s*1.54,-.47,2.10],[.35,.79,.13],'ivory',.04);for(let k=0;k<3;k++){let h=-.25-k*.22;y.box([s*1.54,h,2.02],[.11,.12,.035],'dark',.01);y.tube([s*1.54,h,1.99],[s*1.54,h+.045,1.94],.012,'steel');y.text(['MASTER','RCS / SAS','AUX'][k],[s*1.54,h+.10,2.0],.25,.037);for(let a of [-1,1])y.bolt(s*1.54+a*.125,h,2,.012);}
  // Visible pressure frames, separate rubber seal and polished inner fastening rail.
  y.beam([s*1.42,.07,2.24],[s*1.94,.92,2.24],.24,.16,'ivory');y.beam([s*1.94,.92,2.24],[s*1.38,1.10,2.24],.24,.16,'ivory');y.beam([s*1.34,.09,2.205],[s*1.82,.92,2.20],.035,.025,'rubber');
  y.box([s*1.93,-.48,.22],[.20,1.8,3.2],'ivory',.04);y.box([s*1.84,-.51,.1],[.06,.45,2.8],'olive',.03);
  y.box([s*1.28,-1.03,1.02],[.64,.42,1.6],'olive',.075);y.box([s*1.28,-.81,1.02],[.54,.06,1.5],'dark',.045);
  y.beam([s*1.42,.07,2.24],[s*1.90,-.15,.3],.19,.12,'ivory');y.beam([s*1.38,1.10,2.24],[s*1.80,1.27,.3],.13,.12,'olive');
  for(let k=0;k<7;k++){y.box([s*1.51,-.76,.65+k*.12],[.14,.04,.08],'ivory',.008);y.bolt(s*1.51,-.735,.65+k*.12,.012);}
  for(let k=0;k<5;k++)y.bolt(s*(1.46+k*.105),.12+k*.165,2.14,.022);
  y.box([s*1.30,1.10,2.15],[.5,.15,.15],'olive',.02);y.box([s*1.3,1.055,2.06],[.35,.045,.026],'lamp',.006);
 }
 y.box([0,1.18,2.24],[2.85,.21,.19],'ivory',.035);y.box([0,1.07,2.20],[2.61,.035,.07],'rubber',.006);
 y.box([0,1.40,.1],[3.7,.16,4.1],'olive',.04);
 // Left: a twin throttle quadrant, arced gates and capped horizontal grips.
 y.box([-.94,-.99,1.27],[.50,.24,.68],'dark',.055);
 for(let s of [-1,1]){let x=-.94+s*.115;
  y.beam([x,-.91,1.12],[x,-.53,1.43],.048,.038,'steel');
  y.tube([x-.09,-.51,1.43],[x+.09,-.51,1.43],.055,'rubber');
  for(let e of [-1,1])y.tube([x+e*.085,-.51,1.43],[x+e*.103,-.51,1.43],.058,'steel');
  for(let k=0;k<8;k++){let a=-.45+k*.12,b=a+.12;y.tube([x+s*.08,-.91+Math.cos(a)*.25,1.08+Math.sin(a)*.38],[x+s*.08,-.91+Math.cos(b)*.25,1.08+Math.sin(b)*.38],.014,'steel');}
 }
 y.text('THROTTLE',[-.94,-.78,1.66],.25,.038,'#c6c6ad');
 // Right: contoured palm grip, bellows boot, wrist shelf and thumb/trigger controls.
 y.box([.94,-.96,1.32],[.30,.20,.37],'dark',.06);
 for(let k=0;k<6;k++)y.ring([.94,-.835+k*.02,1.33],.075-k*.005,.012,'rubber',[Math.PI/2,0,0]);
 y.tube([.94,-.77,1.33],[.94,-.56,1.41],.028,'steel');
 const grip=new T.CapsuleGeometry(.058,.20,5,12);grip.scale(1,1,.82);grip.rotateX(-.22);grip.translate(.94,-.49,1.40);y.add(grip,'rubber','Contoured flight grip');
 y.box([.94,-.62,1.42],[.20,.028,.14],'dark',.025);y.box([.98,-.35,1.40],[.13,.08,.10],'dark',.03);
 y.tube([.98,-.326,1.351],[.98,-.326,1.337],.024,'ochre');y.tube([.915,-.36,1.35],[.915,-.36,1.328],.020,'steel');
 y.beam([.905,-.41,1.35],[.905,-.47,1.315],.025,.025,'steel');
 y.box([0,-.59,2.02],[1.24,.25,.15],'dark',.035);
 for(let k=0;k<4;k++){let x=(k-1.5)*.235;y.dial(x,-.60,1.915,40+k);y.text(['NAV','COMM','SENSOR','DRIVE'][k],[x,-.50,1.863],.17,.035,'#c2c1a0');}
 for(let s of [-1,1])for(let k=0;k<3;k++){const action=s<0?[0,1,3][k]:[2,8,5][k];let x=s*1.54,h=-.25-k*.22;const g=new T.CylinderGeometry(.027,.027,.08,12);g.rotateX(Math.PI/2);g.translate(x,h,1.968);y.add(g,'steel','Guarded switch '+action,{unique:true,controlAction:action});if(k===0)for(let a of [-1,1])y.beam([x+a*.05,h-.07,1.97],[x+a*.05,h+.07,1.97],.018,.03,'ochre');}
 y.text('FLIGHT CONTROL / '+craft.name.split(' ')[0].toUpperCase(),[0,1.15,2.135],.93,.04);y.text('EMERGENCY',[1.54,.03,2.03],.25,.04);
 y.box([0,-.99,1.71],[1.22,.35,.26],'ivory',.065);y.text('MAINTENANCE ACCESS',[0,-.87,1.577],.60,.036);for(let s of [-1,1])y.bolt(s*.50,-.89,1.57,.035);
 y.box([0,-.05,2.29],[3.68,.18,.13],'ivory',.028);
 const plan=productionLayout(craft);y.root.userData.deckPlan=plan;pressureDecks(y,plan);
 return y.finish();
}

function pressureDecks(y,plan){
 for(const deck of plan.decks){
  const rooms=plan.rooms.filter(r=>r.deck===deck.index),dy=deck.y;
  const xs=[...new Set(rooms.flatMap(r=>[r.x0,r.x1]).concat(plan.decks.length>1?[-1.1,1.1]:[]))].sort((a,b)=>a-b);
  const zs=[...new Set(rooms.flatMap(r=>[r.z0,r.z1]).concat(plan.decks.length>1?[3.85,6.15]:[]))].sort((a,b)=>a-b);
  // Partition the union so adjacent rooms have no coplanar duplicate floors, and lifts have real shafts.
  for(let i=0;i<xs.length-1;i++)for(let k=0;k<zs.length-1;k++){
   const x=(xs[i]+xs[i+1])/2,z=(zs[k]+zs[k+1])/2;
   if(!rooms.some(r=>x>r.x0&&x<r.x1&&z>r.z0&&z<r.z1))continue;
   if(plan.decks.length>1&&Math.abs(x)<1.1&&z>3.85&&z<6.15)continue;
   const size=[xs[i+1]-xs[i],.13,zs[k+1]-zs[k]];
   y.box([x,dy-1.715,-z],size,'dark',.015);y.box([x,dy+1.35,-z],size,'ivory',.015);
  }
  for(const r of rooms){
   for(const edge of [{axis:'x',at:r.x0,a:r.z0,b:r.z1},{axis:'x',at:r.x1,a:r.z0,b:r.z1},{axis:'z',at:r.z0,a:r.x0,b:r.x1},{axis:'z',at:r.z1,a:r.x0,b:r.x1}]){
    if(deck.index===0&&edge.axis==='z'&&edge.at<0)continue;
    const doors=plan.doors.filter(d=>d.deck===deck.index&&d.axis===edge.axis&&Math.abs((d.axis==='x'?d.x:d.z)-edge.at)<.09);
    let cuts=doors.map(d=>{const c=d.axis==='x'?d.z:d.x;return[c-d.width/2,c+d.width/2];});
    if(!doors.length)for(const n of rooms){if(n===r)continue;const crossing=edge.axis==='x'?edge.at>=n.x0-.01&&edge.at<=n.x1+.01:edge.at>=n.z0-.01&&edge.at<=n.z1+.01;if(crossing)cuts.push(edge.axis==='x'?[n.z0,n.z1]:[n.x0,n.x1]);}
    let points=[edge.a,edge.b,...cuts.flat().filter(v=>v>edge.a&&v<edge.b)].sort((a,b)=>a-b);
    for(let i=0;i<points.length-1;i++){let a=points[i],b=points[i+1],mid=(a+b)/2;if(b-a<.02||cuts.some(c=>mid>c[0]&&mid<c[1]))continue;
     const pos=edge.axis==='x'?[edge.at,dy-.16,-mid]:[mid,dy-.16,-edge.at];
     const size=edge.axis==='x'?[.12,2.9,b-a]:[b-a,2.9,.12];y.box(pos,size,'ivory',.018);
     const lower=pos.slice();lower[1]=dy-1.08;const band=size.slice();band[1]=.6;band[edge.axis==='x'?0:2]+=.025;y.box(lower,band,'olive',.012);
     for(let t=a+.18;t<b-.1;t+=1.5){const p=edge.axis==='x'?[edge.at,dy-.16,-t]:[t,dy-.16,-edge.at];y.box(p,edge.axis==='x'?[.17,2.85,.055]:[.055,2.85,.17],'steel',.01);}
    }
   }
   if(!r.id.startsWith('corridor'))for(let z=r.z0+1;z<r.z1;z+=3){let x=(r.x0+r.x1)/2;y.box([x,dy+1.22,-z],[Math.min(1.1,r.x1-r.x0-.3),.07,.20],'dark',.018);y.box([x,dy+1.18,-z],[.70,.018,.10],'lamp',.006);}
  }
  for(let z=2;z<plan.end;z+=2.8){for(const s of [-1,1]){y.tube([s*1.08,dy+.98,-z],[s*1.08,dy+.98,-Math.min(z+2.5,plan.end)],.034,'steel');y.box([s*1.15,dy-1.64,-z],[.035,.008,1.1],'ochre',.002);}}
  for(const f of plan.fixtures.filter(f=>f.deck===deck.index)){furniture(y,f);}
 }
 for(const d of plan.doors){const side=d.axis==='x',rotation=side?[0,Math.PI/2,0]:[0,0,0],p=[d.x,d.y-.2,-d.z];
  const doorYard=new Yard();doorYard.box(p,side?[.10,2.75,d.width]:[d.width,2.75,.10],'olive',.05,[0,0,0],{unique:true,doorId:d.id});
  const g=doorYard.finish();y.root.add(g);
  for(const s of [-1,1])y.box([d.x+(side?0:s*(d.width/2+.06)),d.y-.16,-d.z+(side?s*(d.width/2+.06):0)],side?[.22,2.95,.10]:[.10,2.95,.22],'dark',.02);
  y.box([d.x,d.y+1.18,-d.z],side?[.22,.30,d.width+.20]:[d.width+.20,.30,.22],'dark',.025);
  y.text(d.name,[d.x+(side?-.13:0),d.y+.95,-d.z+(side?0:.13)],Math.min(1.35,d.width),.09,'#b2bea4',side?[0,Math.PI/2,0]:[0,Math.PI,0]);
 }
 for(const l of plan.lifts){for(const s of [-1,1])y.beam([s*1.09,l.y-1.65,-6.12],[s*1.09,l.y+1.5,-6.12],.08,.08,'steel');y.text('LIFT / '+(l.deck+1),[1.20,l.y+.45,-4.5],.65,.09,'#d8bd7b',[0,Math.PI/2,0]);}
}

export function productionGun(ignored,pistol=false){
 const y=new Yard();const L=pistol?.27:.86;
 y.loft([[-L*.23,.046,.044,0],[L*.12,.046,.044,0],[L*.37,.030,.030,0]],'dark');
 y.box([0,-.007,L*.03],[.080,.062,L*.63],'olive',.014);
 y.tube([0,.018,L*.19],[0,.018,L*.50],pistol?.011:.014,'steel');y.tube([0,.018,L*.42],[0,.018,L*.54],.023,'dark');
 y.ring([0,.018,L*.545],.017,.004,'steel');
 y.box([0,-.10,-L*.07],[.056,.15,.064],'rubber',.015,[-.22,0,0]);
 y.tube([-.03,-.025,-L*.015],[-.03,-.075,L*.06],.008,'steel');y.tube([-.03,-.075,L*.06],[-.03,-.025,L*.10],.008,'steel');
 if(!pistol){y.box([0,-.098,L*.10],[.053,.145,.087],'dark',.014,[.13,0,0]);
  y.loft([[-L*.49,.043,.068,-.023],[-L*.34,.027,.037,-.012],[-L*.22,.028,.030,0]],'olive');
  y.box([0,-.023,-L*.49],[.070,.155,.025],'rubber',.012);
  y.box([0,.084,-L*.06],[.066,.084,.13],'dark',.013);y.tube([0,.10,-L*.14],[0,.10,L*.04],.036,'dark');y.tube([0,.10,-L*.145],[0,.10,-L*.15],.029,'glass');
  for(let i=0;i<8;i++){let z=L*.16+i*.025;y.box([0,.058,z],[.069,.017,.012],'steel',.003);for(let s of [-1,1])y.box([s*.044,0,z],[.007,.019,.017],'rubber',.003);}
 }
 for(let i=0;i<5;i++)y.box([0,-.065-i*.018,-L*.081],[.059,.006,.065],'dark',.002,[-.22,0,0]);
 for(let s of [-1,1])for(let z of [-.02,.07])y.tube([s*.045,.014,z],[s*.050,.014,z],.009,'steel');
 y.box([.048,.022,-.026],[.014,.018,.05],'ochre',.003);
 // Weapon coordinates in existing first-person rig are +Z aft, not vehicle forward.
 return y.finish();
}

