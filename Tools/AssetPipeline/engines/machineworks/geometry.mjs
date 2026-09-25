/* Generated from the user's machineworks.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
import {M} from './math.mjs';
function make(p,n,uv,i){return {positions:new Float32Array(p),normals:new Float32Array(n),uvs:new Float32Array(uv),indices:new Uint32Array(i)};}
function box(){const p=[],n=[],uv=[],idx=[];const faces=[[[1,0,0],[.5,-.5,.5],[.5,-.5,-.5],[.5,.5,-.5],[.5,.5,.5]],[[-1,0,0],[-.5,-.5,-.5],[-.5,-.5,.5],[-.5,.5,.5],[-.5,.5,-.5]],[[0,1,0],[-.5,.5,.5],[.5,.5,.5],[.5,.5,-.5],[-.5,.5,-.5]],[[0,-1,0],[-.5,-.5,-.5],[.5,-.5,-.5],[.5,-.5,.5],[-.5,-.5,.5]],[[0,0,1],[-.5,-.5,.5],[.5,-.5,.5],[.5,.5,.5],[-.5,.5,.5]],[[0,0,-1],[.5,-.5,-.5],[-.5,-.5,-.5],[-.5,.5,-.5],[.5,.5,-.5]]];for(const f of faces){const start=p.length/3;for(let j=1;j<5;j++){p.push(...f[j]);n.push(...f[0]);uv.push(...[[0,0],[1,0],[1,1],[0,1]][j-1]);}idx.push(start,start+1,start+2,start,start+2,start+3);}return make(p,n,uv,idx);}
function cylinder(segments=24){const p=[],n=[],uv=[],idx=[];for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2,x=Math.cos(a),z=Math.sin(a);p.push(x*.5,-.5,z*.5,x*.5,.5,z*.5);n.push(x,0,z,x,0,z);uv.push(j/segments,0,j/segments,1);if(j<segments){const k=j*2;idx.push(k,k+1,k+3,k,k+3,k+2);}}for(const sign of [-1,1]){const o=p.length/3;p.push(0,sign*.5,0);n.push(0,sign,0);uv.push(.5,.5);for(let j=0;j<=segments;j++){const a=j/segments*Math.PI*2;p.push(Math.cos(a)*.5,sign*.5,Math.sin(a)*.5);n.push(0,sign,0);uv.push(Math.cos(a)*.5+.5,Math.sin(a)*.5+.5);if(j<segments){if(sign<0)idx.push(o,o+j+1,o+j+2);else idx.push(o,o+j+2,o+j+1);}}}return make(p,n,uv,idx);}
function sphere(seg=20,rings=12){const p=[],n=[],uv=[],idx=[];for(let y=0;y<=rings;y++)for(let x=0;x<=seg;x++){const phi=y/rings*Math.PI,a=x/seg*Math.PI*2,norm=[Math.sin(phi)*Math.cos(a),Math.cos(phi),Math.sin(phi)*Math.sin(a)];p.push(...norm.map(v=>v*.5));n.push(...norm);uv.push(x/seg,y/rings);if(y<rings&&x<seg){const i=y*(seg+1)+x;idx.push(i,i+1,i+seg+1,i+1,i+seg+2,i+seg+1);}}return make(p,n,uv,idx);}
function torus(seg=32,tube=8){const p=[],n=[],uv=[],idx=[];for(let j=0;j<=seg;j++)for(let k=0;k<=tube;k++){const a=j/seg*Math.PI*2,b=k/tube*Math.PI*2,r=.5+.075*Math.cos(b);p.push(Math.cos(a)*r,Math.sin(a)*r,.075*Math.sin(b));n.push(Math.cos(a)*Math.cos(b),Math.sin(a)*Math.cos(b),Math.sin(b));uv.push(j/seg,k/tube);if(j<seg&&k<tube){const i=j*(tube+1)+k;idx.push(i,i+tube+1,i+1,i+1,i+tube+1,i+tube+2);}}return make(p,n,uv,idx);}
export const GEOMETRY={box:box(),cylinder:cylinder(),sphere:sphere(),torus:torus()};
let serial=1;
export const mat=(color='#85918c',metalness=.6,roughness=.4,emissive=0,style=0)=>({color,metalness,roughness,emissive,style});
export function group(name='',position=[0,0,0],rotation=[0,0,0]){return {uid:serial++,name,position,rotation,scale:[1,1,1],children:[],visible:true};}
export function mesh(parent,geometry,scale,position,material,rotation=[0,0,0],name=''){const m={...group(name,position,rotation),geometry,material,scale};parent.children.push(m);return m;}
export const boxPart=(p,size,pos,m,r=[0,0,0],name='panel')=>mesh(p,'box',size,pos,m,r,name);
export const cylinderPart=(p,d,h,pos,m,r=[0,0,0],name='cylinder')=>mesh(p,'cylinder',[d,h,d],pos,m,r,name);
export const ringPart=(p,d,pos,m,r=[Math.PI/2,0,0])=>mesh(p,'torus',[d,d,d],pos,m,r,'ring');
export function rod(p,a,b,d,m){const mid=a.map((v,i)=>(v+b[i])/2),v=b.map((n,i)=>n-a[i]),len=Math.hypot(...v),rot=[Math.acos(Math.max(-1,Math.min(1,v[1]/(len||1)))),Math.atan2(v[0],v[2]),0];
 // Euler XYZ: map local +Y onto direction using a stable orthonormal frame instead.
 const y=M.normalize(v),ref=Math.abs(y[1])>.98?[1,0,0]:[0,1,0],x=M.normalize(M.cross(ref,y)),z=M.cross(x,y);
 const aMat=new Float32Array([...x.map(v=>v*d),0,...y.map(v=>v*len),0,...z.map(v=>v*d),0,...mid,1]);const part=mesh(p,'cylinder',[1,1,1],[0,0,0],m,[0,0,0],'conduit');part.matrix=aMat;return part;}
export function flatten(root,parent=M.identity(),out=[],machine=null){if(root.visible===false)return out;const world=M.multiply(parent,root.matrix||M.compose(root.position,root.rotation,root.scale));const id=root.machineId||machine;if(root.geometry)out.push({node:root,geometry:root.geometry,material:root.material,world,machineId:id});for(const c of root.children)flatten(c,world,out,id);return out;}
export function hexRGB(hex){return [1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);}
export const SOFT_GEOMETRY={box:box(),cylinder:cylinder(10),sphere:sphere(10,6),torus:torus(12,5)};
