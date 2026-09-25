import {T,rod,ellipsoid,mesh,bake} from './primitives.js';

export function finishAnimal(root,m,p){
 root.userData.phenotype=p;root.userData.appendages=[];root.userData.restScale=p?.scale||[1,1,1];root.userData.body.scale.set(...root.userData.restScale);
 if(!p?.alien)return root;
 const g=root.userData.body,f=root.userData.family,skin=m.coat[f].clone(),horn=m.horn.clone();
 // Geometry is assembled first; the phenotype atlas is applied to its surfaces here.
 Object.assign(skin,m.art.alienFauna[p.atlas],{metalness:0,roughness:f===3?.55:.83,normalScale:new T.Vector2(.34,.34)});skin.color.setHex(0xd5cdd8);
 Object.assign(horn,m.art.alienFauna[12],{metalness:0,roughness:.7});horn.color.setHex(0xc5afb9);
 root.traverse(o=>{if(o.isMesh){if(o.material===m.coat[f]||root.userData.creature&&o.material===root.userData.creature.skin)o.material=skin;else if(o.material===m.horn)o.material=horn;}});
 const top=[1.3,.98,1.12,.42,.42][f],head=[-.64,-.65,-.45,-.25,-.48][f];
 const addJoint=(name,position,axis,amplitude,phase=0)=>{const joint=new T.Group();joint.name=name;joint.position.set(...position);g.add(joint);root.userData.appendages.push({joint,axis,amplitude,phase});return joint;};
 for(const side of [-1,1]){
  const feeler=addJoint('Articulated sensory crest',[side*.1,top,head],'z',.13,side);
  for(let i=0;i<p.crest;i++){const a=[0,i*.09,i*.025],z=[side*.02,(i+1)*.09,(i+1)*.035];rod(feeler,horn,a,z,.017-i*.002,.008,7);}
  if(p.fin){const fin=addJoint('Thermal display fin',[side*.18,top*.8,.06],'z',.12,side*Math.PI);for(let i=0;i<5;i++){const a=[0,0,i*.055],b=[side*(.17+Math.sin(i/4*Math.PI)*.08),.15,i*.055+.1];rod(fin,horn,a,b,.009,.003,6);ellipsoid(fin,skin,[b[0]*.5,.075,b[2]],[.022,.085,.13]);}}
 }
 for(let i=0;i<p.plates;i++)ellipsoid(g,horn,[0,top*.72,.42-i*.13],[.19,.07,.1]);
 if(!root.userData.tail&&f!==2&&f!==3){let parent=g;for(let i=0;i<p.tailSegments;i++){const joint=new T.Group();joint.name='Tail joint '+i;joint.position.set(0,i===0?top*.5:0,i===0?.5:.13);parent.add(joint);rod(joint,skin,[0,0,0],[0,-.015,.14],.045*(1-i/p.tailSegments),.014,8);root.userData.appendages.push({joint,axis:'y',amplitude:.16,phase:i*.55});parent=joint;}}
 root.userData.ownedMaterials=[skin,horn];return root;
}

function lamina(length,width){
 const pos=[],uv=[],indices=[],steps=8;
 for(let i=0;i<=steps;i++){const t=i/steps,w=Math.sin(Math.PI*t)*width;for(let j=-1;j<=1;j++){pos.push(j*w,Math.sin(t*Math.PI)*length*.12-Math.abs(j)*width*.15,t*length);uv.push((j+1)/2,t);}}
 for(let i=0;i<steps;i++)for(let j=0;j<2;j++){const a=i*3+j;indices.push(a,a+3,a+1,a+1,a+3,a+4);}
 const geo=new T.BufferGeometry();geo.setAttribute('position',new T.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new T.Float32BufferAttribute(uv,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
}
export function alienPlant(m,p){
 const g=new T.Group(),bark=m.bark.clone(),leaf=m.leaves.clone();Object.assign(bark,m.art.alienFlora[p.barkTile],{metalness:0,roughness:.95});bark.color.setHex(0xc9bfca);
 Object.assign(leaf,m.art.alienFlora[p.leafTile],{metalness:0,roughness:.85,alphaTest:0,side:T.DoubleSide});leaf.color.setHex(0xd0c3d3);leaf.userData.leafSurface=true;
 const low=p.plantForm==='low-fan',height=low?5.4:p.plantForm==='segmented-fronds'?10:12;
 rod(g,bark,[0,0,0],[.12,height*.75,.1],low?.42:.35,.13,10);
 for(let k=0;k<10;k++){
  const a=k*2.399,y=height*(.3+k*.054),reach=low?3.2:2.6-k*.12,end=[Math.cos(a)*reach,y+height*.13,Math.sin(a)*reach];
  rod(g,bark,[0,y,0],end,.10,.024,9);
  if(p.plantForm==='forked-canopy'&&k<4)rod(g,bark,[0,y,0],[end[0]*.58,height*.95,end[2]*.58],.14,.055,9);
  const crown=new T.Group();crown.position.set(...end);crown.rotation.y=a;g.add(crown);
  for(let j=0;j<9;j++){
   const side=j%2?1:-1,t=Math.floor(j/2)/4,blade=mesh(crown,lamina(low?1.8:1.3,low?.23:.32),leaf,[side*.12,.1-t*.2,t*1.2]);blade.rotation.set(-.15-t*.32,side*(.7+t*.4),side*.15);
   rod(crown,bark,[0,0,0],[side*.12,.1-t*.2,t*1.2],.015,.005,6);
  }
 }
 const baked=bake(g);baked.userData.plantForm=p.plantForm;return baked;
}
