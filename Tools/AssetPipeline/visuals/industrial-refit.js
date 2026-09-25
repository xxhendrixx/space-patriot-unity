// Space Patriot refits. New authored role-specific shells over the original fleet
// dimensions and pressure-deck interfaces. All surface art is the original atlas.
import * as T from 'three';
import {RoundedBoxGeometry} from 'three/addons/geometries/RoundedBoxGeometry.js';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
export function buildRefit(m,craft){
 const root=new T.Group(),[L,W,H]=craft.dimensions,f=craft.family,unit=Math.min(1.8,L/24),batches=new Map();
 const mat={hull:m.hull,dark:m.dark,steel:m.steel,ceramic:m.ceramic,black:m.black,glass:m.glass,accent:m.accent,glow:m.glow,cargo:m.cargo};
 const V=(x,y,z)=>new T.Vector3(x,y,-z); // Design in the game's +Z forward coordinates.
 function add(geometry,material,name='machinery',gear=false){
  if(geometry.index)geometry=geometry.toNonIndexed();
  // Planar face mapping keeps the original atlas at a consistent physical density.
  const p=geometry.getAttribute('position'),n=geometry.getAttribute('normal'),uv=[];
  for(let i=0;i<p.count;i++){const nx=Math.abs(n.getX(i)),ny=Math.abs(n.getY(i)),nz=Math.abs(n.getZ(i));
   uv.push((ny>nx&&ny>nz?p.getX(i):p.getZ(i))*.19/unit,(ny>nx&&ny>nz?p.getZ(i):p.getY(i))*.19/unit);}
  geometry.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  const key=material.uuid+(gear?'gear':'');if(!batches.has(key))batches.set(key,{material,geometries:[],name,gear});batches.get(key).geometries.push(geometry);
 }
 function panel(x,y,z,w,h,d,material=mat.hull,rotation=[0,0,0],gear=false){
  const g=new RoundedBoxGeometry(w,h,d,1,Math.min(w,h,d)*.23);g.rotateX(rotation[0]);g.rotateY(rotation[1]);g.rotateZ(rotation[2]);g.translate(x,y,-z);add(g,material,'Fitted armor and equipment',gear);
 }
 function loft(sections,material=mat.hull,x=0,y=0,gear=false){
  // Sections [forward, half-width, half-height, center-height]. Eight chamfered
  // corners create pressure-hull shoulders rather than rectangular blocks.
  const cross=[[-.68,1],[.68,1],[1,.48],[1,-.48],[.68,-1],[-.68,-1],[-1,-.48],[-1,.48]],p=[],uv=[],indices=[];
  for(const [z,w,h,cy] of sections)for(const [a,b] of cross){p.push(x+a*w,y+cy+b*h,-z);uv.push(a,z/L);}
  for(let s=0;s<sections.length-1;s++)for(let j=0;j<8;j++){let a=s*8+j,b=s*8+(j+1)%8,c=a+8,d=b+8;indices.push(a,c,b,b,c,d);}
  for(let j=1;j<7;j++){indices.push(0,j,j+1);let a=(sections.length-1)*8;indices.push(a,a+j+1,a+j);}
  for(let i=0;i<indices.length;i+=3){const swap=indices[i+1];indices[i+1]=indices[i+2];indices[i+2]=swap;}
  let g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(indices);g=g.toNonIndexed();g.computeVertexNormals();add(g,material,'Chamfered pressure hull',gear);
 }
 function plate(outline,y,thickness,material=mat.hull){
  const shape=new T.Shape();outline.forEach(([x,z],i)=>i?shape.lineTo(x,-z):shape.moveTo(x,-z));shape.closePath();
  const g=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:thickness*.18,bevelThickness:thickness*.2});
  // Shape XY maps to ship X/-Z, extrusion into +Y.
  g.rotateX(Math.PI/2);g.translate(0,y,0);add(g,material,'Swept armor');
 }
 function tube(a,b,r,material=mat.steel,r2=r,gear=false){
  a=V(...a);b=V(...b);const d=b.clone().sub(a),g=new T.CylinderGeometry(r2,r,d.length(),16,1,false);
  g.applyQuaternion(new T.Quaternion().setFromUnitVectors(new T.Vector3(0,1,0),d.clone().normalize()));g.translate(...a.clone().add(b).multiplyScalar(.5).toArray());add(g,material,'Exposed hydraulic and conduit runs',gear);
 }
 function ring(x,y,z,r,t,material=mat.steel){let g=new T.TorusGeometry(r,t,6,28);g.translate(x,y,-z);add(g,material,'Drive collar');}
 function drive(x,y,z,r,length){
  loft([[z+length*.55,r*.72,r*.65,0],[z+length*.3,r,r*.86,0],[z-length*.3,r*.9,r*.8,0],[z-length*.5,r*.72,r*.7,0]],mat.dark,x,y);
  for(const sign of [-1,1])panel(x+sign*r*.85,y,z,r*.32,r*1.1,length*.66,mat.hull);
  const a=V(x,y,z-length*.5),b=V(x,y,z-length*.67);let g=new T.CylinderGeometry(r*.62,r*.84,a.distanceTo(b),28,1,true);g.rotateX(Math.PI/2);g.translate(x,y,(a.z+b.z)/2);add(g,mat.steel,'Flared open drive nozzle');
  ring(x,y,z-length*.67,r*.84,r*.075);ring(x,y,z-length*.42,r*.58,r*.065,mat.black);
  for(let j=0;j<12;j++){const a=j*Math.PI/6;panel(x+Math.cos(a)*r*.76,y+Math.sin(a)*r*.76,z-length*.53,r*.09,r*.10,length*.21,mat.ceramic,[0,0,a]);}
  const disk=new T.CircleGeometry(r*.55,28);disk.rotateY(Math.PI);disk.translate(x,y,-z+length*.41);add(disk,mat.glow,'Recessed drive throat');
  for(let k=0;k<6;k++)panel(x,y+r*.78,z-length*.24+k*length*.065,r*1.3,r*.055,length*.025,mat.black);
 }
 function landing(x,z){const y=-H*.3;
  tube([x,-H*.13,z],[x,y-1.1*unit,z-.6*unit],.12*unit,mat.steel,.18*unit,true);
  tube([x+.35*unit,-H*.12,z+.5*unit],[x,y-1.1*unit,z-.6*unit],.065*unit,mat.steel,.065*unit,true);
  panel(x,y-1.25*unit,z-.6*unit,1.1*unit,.25*unit,1.65*unit,mat.dark,[0,0,0],true);
 }
 function radiator(x,y,z,w,d){panel(x,y,z,w,.14*unit,d,mat.black);for(let k=0;k<12;k++)panel(x-w*.45+k*w*.9/11,y+.10*unit,z,w*.024,.12*unit,d*.9,mat.steel);}
 function antenna(x,y,z){tube([x,y,z],[x,y+unit*1.5,z],.045*unit);tube([x-unit*.45,y+unit*1.1,z],[x+unit*.45,y+unit*1.1,z],.035*unit);panel(x,y,z,.38*unit,.25*unit,.5*unit,mat.dark);}

 const roles=[
  [[-.46,.21,.22,0],[-.27,.31,.31,0],[.02,.29,.29,0],[.27,.20,.22,.03],[.48,.09,.10,0]],
  [[-.4,.10,.21,0],[-.16,.15,.32,0],[.17,.105,.26,.04],[.49,.025,.07,0]],
  [[-.46,.24,.30,0],[-.21,.26,.38,0],[.1,.23,.36,.04],[.36,.19,.31,.08],[.48,.11,.16,.03]],
  [[-.46,.17,.24,0],[-.15,.20,.28,0],[.24,.13,.20,.04],[.5,.035,.065,0]],
  [[-.38,.13,.24,0],[-.03,.23,.30,0],[.28,.20,.21,.03],[.46,.055,.09,0]],
  [[-.44,.23,.31,0],[-.1,.21,.35,0],[.25,.14,.23,.08],[.47,.08,.15,0]],
  [[-.46,.18,.31,0],[-.28,.24,.37,0],[.16,.25,.38,.03],[.42,.18,.27,0],[.48,.08,.15,0]],
  [[-.47,.23,.27,0],[-.28,.32,.38,0],[.14,.29,.4,.03],[.38,.20,.30,.08],[.49,.14,.20,.02]],
  [[-.45,.11,.19,0],[-.15,.19,.3,0],[.2,.10,.25,.02],[.5,.023,.06,0]],
  [[-.48,.3,.27,0],[-.31,.38,.31,0],[.12,.39,.31,0],[.38,.31,.25,.03],[.49,.22,.15,0]]
 ];
 loft(roles[f].map(([z,w,h,y])=>[z*L,w*W,h*H,y*H]),mat.dark);
 // Separate armored strakes leave a shadow gap and exposed service keel.
 for(let section=0;section<roles[f].length-1;section++){
  const a=roles[f][section],b=roles[f][section+1],shrink=.016;
  loft([[a[0]*L+L*shrink,a[1]*W*.96,a[2]*H*.92,a[3]*H+.035*H],[b[0]*L-L*shrink,b[1]*W*.96,b[2]*H*.92,b[3]*H+.035*H]],section%3===0?mat.ceramic:mat.hull);
 }
 // Each airframe has its own planform and mechanical role.
 if([0,1,3,4,8].includes(f))for(const s of [-1,1]){
  const outlines={0:[[.16,-.32],[.45,-.29],[.49,-.13],[.23,.14],[.17,.08]],1:[[.09,-.26],[.31,-.15],[.49,.28],[.48,.42],[.34,.23],[.11,-.01]],3:[[.12,-.37],[.48,-.27],[.41,-.09],[.13,.06]],4:[[.16,-.36],[.43,-.26],[.5,-.02],[.45,.19],[.34,.34],[.36,.12],[.19,.08]],8:[[.11,-.43],[.31,-.42],[.37,-.2],[.12,-.09]]}[f];
  plate(outlines.map(([x,z])=>[x*W*s,z*L]),-.015*H,.11*H);
  const inner=outlines.map(([x,z])=>[x*W*s*.94,z*L*.96]);plate(inner,.018*H,.025*H,mat.ceramic);
  if(f!==4)radiator(s*W*.29,.05*H,-.2*L,W*.1,L*.11);
 }
 if(f===2){ // Mule: open cargo spine, twin load skids, externally accessible bins.
  for(const s of [-1,1]){
   loft([[-.47*L,.065*W,.16*H,0],[.28*L,.065*W,.16*H,0],[.36*L,.028*W,.07*H,0]],mat.hull,s*W*.37,-.06*H);
   for(let k=0;k<4;k++){const z=-.30*L+k*.145*L;panel(s*W*.35,.04*H,z,.18*W,.32*H,.115*L,mat.cargo);tube([s*W*.25,.24*H,z],[s*W*.46,.24*H,z],.10*unit,mat.accent);}
  }
 }
 if(f===5){ // Spur: asymmetrical salvage boom with working grapple silhouette.
  loft([[-.37*L,.07*W,.13*H,0],[.32*L,.07*W,.12*H,0],[.48*L,.04*W,.06*H,0]],mat.accent,-.37*W,.05*H);
  for(let k=0;k<5;k++)tube([-.37*W,-.07*H,(-.3+k*.13)*L],[-.22*W,.2*H,(-.22+k*.13)*L],.07*unit);
  for(const s of [-1,1])tube([-.37*W,.04*H,.45*L],[-.37*W+s*.075*W,-.12*H,.53*L],.13*unit,mat.steel);
  radiator(.33*W,.06*H,-.05*L,W*.2,L*.34);
 }
 if(f===6){for(const s of [-1,1]){plate([[s*.18*W,-.34*L],[s*.46*W,-.32*L],[s*.5*W,-.06*L],[s*.23*W,.11*L]],-.10*H,.12*H);panel(s*W*.24,H*.16,0,.08*W,.17*H,L*.5,mat.dark);for(let k=0;k<6;k++)panel(s*W*.284,H*.2,(-.16+k*.065)*L,.018*W,.1*H,.04*L,mat.glass);}}
 if(f===7||f===9){
  for(const s of [-1,1]){
   loft([[-.4*L,.10*W,.20*H,0],[.05*L,.105*W,.20*H,0],[.30*L,.05*W,.1*H,0]],mat.hull,s*.32*W,-.04*H);
   for(let k=0;k<7;k++){const z=(-.33+k*.085)*L;panel(s*.40*W,-.02*H,z,.035*W,.20*H,.066*L,k%3===0?mat.accent:mat.ceramic);radiator(s*.31*W,.235*H,z,.12*W,.062*L);}
   if(f===9){ // Recessed hangar portals framed by structural ribs.
    for(let k=0;k<3;k++){let z=(-.26+k*.17)*L;panel(s*.392*W,-.085*H,z,.013*W,.19*H,.11*L,mat.black);panel(s*.404*W,.018*H,z,.026*W,.022*H,.12*L,mat.accent);}
    panel(s*.30*W,.27*H,-.05*L,.18*W,.035*H,.57*L,mat.dark);
    for(let k=0;k<9;k++)panel(s*.3*W,.292*H,(-.31+k*.065)*L,.014*W,.003*H,.025*L,mat.ceramic);
   }
  }
  loft([[-.23*L,.15*W,.08*H,0],[.19*L,.14*W,.10*H,0],[.32*L,.09*W,.06*H,0]],mat.hull,f===9?-.05*W:0,.39*H);
 }
 // Recessed forward bridge glazing, armored brow, sensor chin and service rails.
 loft([[.15*L,W*.135,H*.11,0],[.30*L,W*.11,H*.10,0],[.36*L,W*.075,H*.045,0]],mat.glass,0,H*.36);
 for(const s of [-1,1])tube([s*W*.10,H*.47,.16*L],[s*W*.073,H*.41,.35*L],.07*unit,mat.steel);
 panel(0,H*.48,.19*L,W*.24,.045*H,L*.11,mat.hull);
 loft([[.37*L,W*.08,H*.06,0],[.49*L,W*.05,H*.04,0]],mat.black,0,-H*.07);
 for(const s of [-1,1]){panel(s*W*.10,.07*H,.35*L,.28*unit,.22*unit,.4*unit,mat.glow);landing(s*W*.20,-.22*L);}
 landing(0,.29*L);
 const driveCount=f===9?6:f===7?4:f===8?2:f===3?1:2;
 for(let k=0;k<driveCount;k++){
  let x=driveCount===1?0:(k-(driveCount-1)/2)*W*(f===9?.125:f===7?.17:.44),r=Math.min(H*.31,W/(driveCount*3.8));
  if(f===5)x=k===0?-.20*W:.32*W;
  drive(x,-.04*H,-.36*L,r,L*(f===9?.22:.28));
 }
 radiator(0,.34*H,-.18*L,W*.18,L*.16);antenna(-W*.09,H*.41,-.07*L);antenna(W*.095,H*.38,-.12*L);
 // Access fasteners, RCS quads and red-ochre safety rails have functional locations.
 for(const s of [-1,1])for(const z of [-.29,.21]){
  panel(s*W*.23,.16*H,z*L,.6*unit,.45*unit,.85*unit,mat.dark);
  for(let k=0;k<3;k++)tube([s*W*.23,.16*H,z*L+(.2*k-.2)*unit],[s*(W*.23+.35*unit),.16*H,z*L+(.2*k-.2)*unit],.075*unit,mat.black);
 }
 for(const batch of batches.values()){
  const geometry=mergeGeometries(batch.geometries,false),mesh=new T.Mesh(geometry,batch.material);mesh.name=batch.name;mesh.userData.gear=batch.gear;root.add(mesh);
 }
 root.userData.refit={family:f,role:craft.className,source:'Original fleet + concept boards, authored industrial refit'};
 return root;
}
