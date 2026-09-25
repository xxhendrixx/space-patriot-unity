import {box,rod,ring} from './primitives.js';

export function cloudPlatform(group,materials,size=480){
  group.userData.cloudCity=true;
  const s=size/480,m=materials;
  box(group,m.dark,[0,-23*s,0],[size*.88,22*s,size*.88],2*s);
  box(group,m.steel,[0,-43*s,0],[size*.67,18*s,size*.67],2*s);
  for(const x of [-1,1])for(const z of [-1,1]){
    const p=[x*size*.34,-55*s,z*size*.34];
    rod(group,m.hull,[p[0],-18*s,p[2]],[p[0],-70*s,p[2]],30*s,22*s,12);
    const rim=ring(group,m.accent,[p[0],-71*s,p[2]],26*s,2*s);rim.rotation.x=Math.PI/2;
    const glow=ring(group,m.glow,[p[0],-73*s,p[2]],19*s,1.1*s);glow.rotation.x=Math.PI/2;
  }
  for(const side of [-1,1]){
    box(group,m.accent,[side*size*.44,-12*s,0],[1*s,2*s,size*.76],0);
    box(group,m.accent,[0,-12*s,side*size*.44],[size*.76,2*s,1*s],0);
  }
  return group;
}
