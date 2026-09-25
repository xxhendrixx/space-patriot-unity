/* Generated from the user's machineworks.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
/* Small column-major matrix helpers shared by the offline renderer and scene bridge. */
export const M={
 identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 multiply(a,b){const r=new Float32Array(16);for(let c=0;c<4;c++)for(let row=0;row<4;row++)r[c*4+row]=a[row]*b[c*4]+a[4+row]*b[c*4+1]+a[8+row]*b[c*4+2]+a[12+row]*b[c*4+3];return r;},
 compose(p=[0,0,0],r=[0,0,0],s=[1,1,1]){
  const [x,y,z]=r,a=Math.cos(x),b=Math.sin(x),c=Math.cos(y),d=Math.sin(y),e=Math.cos(z),f=Math.sin(z),ae=a*e,af=a*f,be=b*e,bf=b*f;
  return new Float32Array([c*e*s[0],(af+be*d)*s[0],(bf-ae*d)*s[0],0,-c*f*s[1],(ae-bf*d)*s[1],(be+af*d)*s[1],0,d*s[2],-b*c*s[2],a*c*s[2],0,...p,1]);
 },
 normalize(a){const l=Math.hypot(...a)||1;return a.map(x=>x/l);},
 cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
 dot:(a,b)=>a.reduce((t,v,i)=>t+v*b[i],0),
 lookAt(eye,target,up=[0,1,0]){const z=M.normalize(eye.map((v,i)=>v-target[i])),x=M.normalize(M.cross(up,z)),y=M.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-M.dot(x,eye),-M.dot(y,eye),-M.dot(z,eye),1]);},
 perspective(fov,aspect,near=.1,far=300){const f=1/Math.tan(fov*Math.PI/360),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);},
 ortho(l,r,b,t,n,f){return new Float32Array([2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1]);},
 transform(m,p,w=1){const a=[...p,w];return [0,1,2,3].map(r=>a.reduce((t,v,c)=>t+m[c*4+r]*v,0));},
 inverse(a){const r=new Float32Array(16),rows=Array.from({length:4},(_,i)=>[a[i],a[4+i],a[8+i],a[12+i],...[0,1,2,3].map(j=>i===j?1:0)]);for(let c=0;c<4;c++){let best=c;for(let i=c+1;i<4;i++)if(Math.abs(rows[i][c])>Math.abs(rows[best][c]))best=i;[rows[c],rows[best]]=[rows[best],rows[c]];const v=rows[c][c];if(Math.abs(v)<1e-12)return M.identity();for(let j=0;j<8;j++)rows[c][j]/=v;for(let i=0;i<4;i++)if(i!==c){const k=rows[i][c];for(let j=0;j<8;j++)rows[i][j]-=rows[c][j]*k;}}for(let i=0;i<4;i++)for(let c=0;c<4;c++)r[c*4+i]=rows[i][4+c];return r;},
 camera(c,aspect){const eye=[c.target[0]+c.radius*Math.sin(c.phi)*Math.sin(c.theta),c.target[1]+c.radius*Math.cos(c.phi),c.target[2]+c.radius*Math.sin(c.phi)*Math.cos(c.theta)],view=M.lookAt(eye,c.target),projection=M.perspective(c.fov||42,aspect);return {eye,view,projection,vp:M.multiply(projection,view)};},
 project(p,c,w,h){const a=M.transform(M.camera(c,w/h).vp,p);return {x:(a[0]/a[3]*.5+.5)*w,y:(.5-a[1]/a[3]*.5)*h,depth:a[2]/a[3],behind:a[3]<=0};},
 ray(x,y,c,w,h){const ca=M.camera(c,w/h),inv=M.inverse(ca.vp),a=M.transform(inv,[x/w*2-1,1-y/h*2,-1]),b=M.transform(inv,[x/w*2-1,1-y/h*2,1]),o=a.slice(0,3).map(v=>v/a[3]),end=b.slice(0,3).map(v=>v/b[3]);return {origin:o,direction:M.normalize(end.map((v,i)=>v-o[i]))};},
 ground(ray,y=0){const t=(y-ray.origin[1])/ray.direction[1];return t>0&&Number.isFinite(t)?ray.origin.map((v,i)=>v+t*ray.direction[i]):null;},
 rayBox(ray,min,max){let near=-Infinity,far=Infinity;for(let i=0;i<3;i++){if(Math.abs(ray.direction[i])<1e-8){if(ray.origin[i]<min[i]||ray.origin[i]>max[i])return null;continue;}const a=(min[i]-ray.origin[i])/ray.direction[i],b=(max[i]-ray.origin[i])/ray.direction[i];near=Math.max(near,Math.min(a,b));far=Math.min(far,Math.max(a,b));if(near>far)return null;}return far>=0?Math.max(0,near):null;}
};
