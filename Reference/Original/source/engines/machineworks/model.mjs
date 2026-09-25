/* Generated from the user's machineworks.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
import {TYPES} from './simulation.mjs';
import {group,mesh,boxPart as box,cylinderPart as cyl,ringPart as ring,rod,mat,flatten} from './geometry.mjs';
const PI=Math.PI;
const dark=mat('#25343b',.65,.5),black=mat('#16242b',.2,.7),silver=mat('#b4c1bc',.82,.28),copper=mat('#b98157',.8,.3),rubber=mat('#253337',.06,.82),ivory=mat('#c7c8ae',.3,.65),yellow=mat('#d5ad55',.4,.5);
function sub(p,name,pos=[0,0,0],rot=[0,0,0]){const g=group(name,pos,rot);p.children.push(g);return g;}
function bolts(p,w,d,y){for(const x of [-w/2+.15,w/2-.15])for(const z of [-d/2+.15,d/2-.15]){cyl(p,.11,.06,[x,y,z],silver);box(p,[.055,.015,.015],[x,y+.04,z],dark);}}
function base(p,w,d){box(p,[w,.22,d],[0,.15,0],dark);box(p,[w-.13,.07,d-.13],[0,.3,0],silver);bolts(p,w,d,.35);for(const x of [-w/2+.2,w/2-.2])for(const z of [-d/2+.2,d/2-.2])box(p,[.32,.12,.32],[x,.03,z],rubber);}
function vents(p,x,y,z,w,h,count=8){box(p,[w+.12,h+.12,.06],[x,y,z],dark);for(let i=0;i<count;i++)box(p,[w,.045,.05],[x,y-h/2+i*h/count,z+.05],black);}
function panel(p,x,y,z,w,h,glow){box(p,[w+.12,h+.12,.08],[x,y,z],dark);box(p,[w,h,.035],[x,y,z+.06],glow);}
function stripes(p,w,y,z){for(let x=-w/2+.12;x<w/2;x+=.24){const v=box(p,[.13,.095,.035],[x,y,z],yellow,[0,0,-.35]);}}
function gauge(p,x,y,z,glow){const g=cyl(p,.33,.05,[x,y,z],silver,[PI/2,0,0]);cyl(p,.26,.056,[x,y,z+.01],black,[PI/2,0,0]);box(p,[.018,.1,.02],[x+.025,y+.018,z+.052],glow,[0,0,-.7]);}
function gear(p,d,pos,m){const g=sub(p,'drive gear',pos);cyl(g,d*.8,.16,[0,0,0],m,[PI/2,0,0]);cyl(g,d*.28,.23,[0,0,0],silver,[PI/2,0,0]);for(let i=0;i<12;i++){const a=i/12*PI*2;box(g,[d*.19,d*.14,.19],[Math.cos(a)*d*.4,Math.sin(a)*d*.4,0],m,[0,0,a]);}return g;}
function attachment(parent,p){const body=mat(p.color,.65,.4),glow=mat(p.color,.15,.28,1.2),g=sub(parent,p.name,p.position.slice(),p.rotation.map(x=>x*PI/180));g.scale=p.scale.slice();
 if(p.kind==='panel'){box(g,[1,.16,1],[0,0,0],body);bolts(g,1,1,.1);}
 if(p.kind==='cylinder'){cyl(g,.8,1.2,[0,0,0],body);ring(g,.8,[0,.5,0],silver);ring(g,.8,[0,-.5,0],silver);}
 if(p.kind==='gear')gear(g,1,[0,0,0],body);
 if(p.kind==='pipe'){cyl(g,.23,1.5,[0,0,0],body);for(const y of [-.55,.55])cyl(g,.37,.13,[0,y,0],silver);}
 if(p.kind==='screen'){box(g,[1.3,.8,.12],[0,0,0],body);panel(g,0,0,.1,1.15,.64,glow);}
 if(p.kind==='antenna'){cyl(g,.4,.2,[0,0,0],body);cyl(g,.07,1.4,[0,.7,0],silver);mesh(g,'sphere',[.2,.2,.2],[0,1.4,0],glow);}
 return {g,p,base:p.position.slice(),rotation:g.rotation.slice()};
}
export function buildMachine(n){
 const root=group(n.name);root.machineId=n.id;
 const p=n.params,body=mat(p.color,p.metalness,p.roughness),light=mat('#98dbbd',.15,.32,1.1),warning=mat('#e4a454',.1,.4,1),screen=mat('#326a67',.1,.35,.4),refs={light,warning,screen,attachments:[]};
 if(n.type==='reactor'){
  base(root,3.1,3.1);cyl(root,2.55,.35,[0,.55,0],body);cyl(root,2.3,.27,[0,3.4,0],body);cyl(root,1.48,2.55,[0,1.94,0],black);
  cyl(root,.66,2.42,[0,1.95,0],light);cyl(root,.34,2.55,[0,1.95,0],ivory);
  for(let i=0;i<4;i++){const a=(i/4+.125)*PI*2,x=Math.cos(a),z=Math.sin(a);cyl(root,.19,2.75,[x,1.92,z],silver);cyl(root,.36,.2,[x,.7,z],body);cyl(root,.36,.2,[x,3.17,z],body);}
  refs.rotor=sub(root,'containment rings',[0,1.96,0]);for(const y of [-.86,0,.86])ring(refs.rotor,1.9,[0,y,0],copper);
  for(let i=0;i<12;i++){const a=i/12*PI*2;box(root,[.13,.42,.3],[Math.cos(a)*1.1,3.63,Math.sin(a)*1.1],silver,[0,-a,0]);}
  cyl(root,.8,.15,[0,3.67,0],dark);ring(root,.61,[0,3.77,0],light);panel(root,0,.95,1.16,.75,.4,screen);gauge(root,-.65,.9,1.08,light);
  for(const side of [-1,1]){rod(root,[side*1.12,.65,.8],[side*1.55,.7,.9],.16,copper);cyl(root,.24,.2,[side*1.53,.69,.9],dark);}
  stripes(root,1.4,.51,1.39);
 }else if(n.type==='battery'){
  base(root,2.65,2.3);box(root,[2.3,.25,1.95],[0,.62,0],body);box(root,[2.3,.18,1.95],[0,2.34,0],body);
  for(let x=-1;x<=1;x++)for(const z of [-.48,.48]){cyl(root,.56,1.65,[x*.67,1.49,z],body);for(const y of [.86,1.98])cyl(root,.59,.14,[x*.67,y,z],silver);cyl(root,.2,.14,[x*.67,2.49,z],copper);}
  for(const x of [-.86,.86])rod(root,[x,2.52,-.5],[x,2.52,.5],.13,copper);
  box(root,[1.85,.37,.14],[0,1.4,1.04],dark);box(root,[1.56,.11,.04],[0,1.41,1.13],black);refs.charge=box(root,[1.56,.11,.055],[0,1.41,1.15],light);stripes(root,2.1,.7,1.04);
 }else if(n.type==='conveyor'){
  base(root,4.75,2);for(const z of [-.86,.86]){box(root,[4.65,.33,.17],[0,.88,z],body);box(root,[4.9,.12,.15],[0,1.16,z],silver);}
  box(root,[4.25,.23,1.48],[0,1.01,0],rubber);refs.slats=[];for(let i=0;i<20;i++)refs.slats.push(box(root,[.18,.07,1.38],[i*.22-2.1,1.17,0],dark));
  for(const x of [-2.12,2.12])cyl(root,.38,1.62,[x,1.02,0],silver,[PI/2,0,0]);
  for(const x of [-1.8,1.8])for(const z of [-.7,.7])box(root,[.13,.65,.15],[x,.62,z],silver);
  cyl(root,.55,.55,[-1.9,.87,1.12],body,[PI/2,0,0]);refs.gear=gear(root,.38,[-1.9,.87,1.45],copper);refs.cargo=[];
  for(let i=0;i<3;i++){const g=sub(root,'test cargo');box(g,[.64,.49,.72],[0,.27,0],ivory);for(const x of [-.19,.19])box(g,[.07,.51,.74],[x,.28,0],dark);box(g,[.2,.11,.01],[0,.31,.37],yellow);refs.cargo.push(g);}stripes(root,3.4,.92,.97);
 }else if(n.type==='press'){
  base(root,2.9,2.35);for(const x of [-1.12,1.12]){box(root,[.36,3.28,.95],[x,2.05,0],body);cyl(root,.17,2.7,[x*.72,1.95,.51],silver);}
  box(root,[2.65,.48,1.42],[0,3.53,0],body);box(root,[1.98,.25,1.52],[0,.83,0],silver);box(root,[1.12,.18,1.04],[0,1.02,0],black);
  cyl(root,.63,.78,[0,3.51,0],dark);cyl(root,.31,1.85,[0,2.53,0],silver);
  refs.head=sub(root,'press ram',[0,2.07,0]);box(refs.head,[1.78,.39,1.12],[0,0,0],body);box(refs.head,[1.12,.31,.85],[0,-.27,0],dark);stripes(refs.head,1.7,.08,.58);
  refs.gear=gear(root,.8,[0,3.56,.87],copper);gauge(root,.85,3.54,.77,light);panel(root,-1.12,2.23,.53,.22,.54,screen);
  for(const x of [-1.25,1.25])box(root,[.08,2,.08],[x,1.88,.72],warning);
 }else if(n.type==='arm'){
  base(root,2.6,2.5);cyl(root,1.65,.4,[0,.6,0],body);cyl(root,1.32,.2,[0,.91,0],silver);ring(root,1.28,[0,1.04,0],light);
  refs.yaw=sub(root,'waist joint',[0,1.12,0]);cyl(refs.yaw,.85,.5,[0,.15,0],dark);refs.shoulder=sub(refs.yaw,'shoulder',[0,.44,0]);cyl(refs.shoulder,.8,.74,[0,0,0],body,[PI/2,0,0]);cyl(refs.shoulder,.41,.77,[0,0,0],silver,[PI/2,0,0]);
  box(refs.shoulder,[.44,1.55,.5],[0,.8,0],body);box(refs.shoulder,[.22,1.26,.52],[0,.8,0],ivory);rod(refs.shoulder,[.3,.1,.2],[.3,1.38,.2],.09,copper);
  refs.elbow=sub(refs.shoulder,'elbow',[0,1.55,0]);cyl(refs.elbow,.65,.68,[0,0,0],body,[PI/2,0,0]);cyl(refs.elbow,.3,.74,[0,0,0],silver,[PI/2,0,0]);box(refs.elbow,[1.35,.32,.43],[.68,0,0],body);rod(refs.elbow,[.2,.21,.16],[1.15,.21,.16],.1,silver);
  refs.wrist=sub(refs.elbow,'wrist',[1.4,0,0]);cyl(refs.wrist,.43,.38,[0,0,0],dark,[0,0,PI/2]);for(const z of [-.24,.24]){box(refs.wrist,[.3,.12,.09],[.26,0,z],silver);box(refs.wrist,[.12,.36,.09],[.42,-.13,z],silver);}panel(refs.yaw,0,.25,.5,.32,.16,screen);stripes(root,1.3,.66,1.1);
 }else if(n.type==='pump'){
  base(root,3.35,2.4);cyl(root,1.45,2.24,[-.7,1.52,0],body);for(const y of [.5,2.4])ring(root,1.43,[-.7,y,0],silver);cyl(root,.85,.2,[-.7,2.79,0],silver);
  for(let i=0;i<6;i++)box(root,[.08,1.4,.07],[-1.05+i*.14,1.6,.7],light);cyl(root,.92,1.3,[.86,1,0],body,[0,0,PI/2]);for(let i=0;i<6;i++)cyl(root,1,.06,[.34+i*.19,1,0],dark,[0,0,PI/2]);
  refs.gear=gear(root,.68,[.65,1,.7],copper);rod(root,[-.7,.8,.45],[-.7,.8,1],.27,silver);rod(root,[-.7,.8,1],[1.25,.8,1],.27,silver);rod(root,[1.25,.8,1],[1.25,1.7,1],.27,body);ring(root,.35,[1.25,1.7,1],light);gauge(root,-.72,2.21,.69,light);
  refs.fluid=mesh(root,'sphere',[.23,.23,.23],[-.6,.8,1],light);
 }else if(n.type==='door'){
  base(root,4.8,1.4);for(const x of [-2.11,2.11]){box(root,[.52,3.87,1.05],[x,2.22,0],body);box(root,[.07,3.14,.08],[x*.87,2.16,.51],light);}box(root,[4.72,.47,1.1],[0,4.04,0],body);
  refs.doors=[];for(const side of [-1,1]){const g=sub(root,'sliding door',[side*.87,2.11,0]);box(g,[1.7,3.45,.4],[0,0,0],dark);box(g,[1.56,3.21,.08],[0,0,.25],body);box(g,[1.34,.07,.05],[0,.66,.3],silver);box(g,[1.34,.07,.05],[0,-.65,.3],silver);box(g,[.46,.66,.07],[0,.6,.32],black);panel(g,0,.61,.38,.38,.55,screen);stripes(g,1.3,-1.35,.32);refs.doors.push(g);}
  panel(root,0,4.05,.59,.92,.19,light);panel(root,2.1,2.05,.59,.28,.6,screen);
 }else if(n.type==='lift'){
  base(root,3.45,3);for(const x of [-1.44,1.44])for(const z of [-1.18,1.18]){box(root,[.16,4.1,.18],[x,2.42,z],silver);cyl(root,.09,3.85,[x*.82,2.4,z],copper);}box(root,[3.2,.31,2.7],[0,4.38,0],body);
  refs.platform=sub(root,'lift deck',[0,.63,0]);box(refs.platform,[2.8,.3,2.5],[0,0,0],body);box(refs.platform,[2.7,.09,2.38],[0,.2,0],dark);stripes(refs.platform,2.6,0,1.28);
  for(const z of [-1.12,1.12]){box(refs.platform,[2.6,.08,.09],[0,1,z],silver);for(const x of [-1.22,1.22])box(refs.platform,[.09,.9,.09],[x,.57,z],yellow);}cyl(root,.63,1,[0,4.6,0],dark,[0,0,PI/2]);
 }else if(n.type==='fan'){
  base(root,2.3,1.75);box(root,[.39,1.18,.42],[0,.92,0],body);ring(root,2.08,[0,2.15,0],body,[0,0,0]);ring(root,1.75,[0,2.15,.18],silver,[0,0,0]);
  refs.rotor=sub(root,'impeller',[0,2.15,0]);cyl(refs.rotor,.43,.45,[0,0,0],copper,[PI/2,0,0]);for(let i=0;i<6;i++){const a=i/6*PI*2;const blade=box(refs.rotor,[.76,.24,.1],[Math.cos(a)*.5,Math.sin(a)*.5,0],body,[.15,0,a+.3]);}
  for(let i=0;i<4;i++){const a=i/4*PI;box(root,[1.77,.045,.03],[0,2.15,.28],silver,[0,0,a]);}gauge(root,0,.75,.27,light);
 }else if(n.type==='switch'){
  base(root,1.25,1.15);box(root,[.45,1.12,.42],[0,.87,0],dark);box(root,[.88,.7,.63],[0,1.51,0],body);panel(root,0,1.57,.35,.28,.39,black);refs.lever=sub(root,'toggle lever',[0,1.46,.49]);rod(refs.lever,[0,0,0],[0,.38,0],.08,silver);mesh(refs.lever,'sphere',[.2,.2,.2],[0,.4,0],warning);box(root,[.4,.07,.04],[0,1.8,.36],light);stripes(root,.74,1.25,.34);
 }else if(n.type==='sensor'){
  base(root,1.4,1.4);cyl(root,.26,1.7,[0,1.1,0],silver);cyl(root,.54,.25,[0,.52,0],body);refs.rotor=sub(root,'scanner head',[0,2.02,0]);box(refs.rotor,[.94,.43,.59],[0,0,0],body);cyl(refs.rotor,.4,.13,[0,0,.37],black,[PI/2,0,0]);cyl(refs.rotor,.23,.14,[0,0,.4],light,[PI/2,0,0]);box(refs.rotor,[.51,.08,.3],[0,.3,0],dark);mesh(root,'sphere',[.15,.15,.15],[0,1.08,.2],warning);
 }else if(n.type==='relay'){
  base(root,1.8,1.6);box(root,[1.4,1.49,1.19],[0,1.16,0],body);box(root,[1.16,.53,.13],[0,1.35,.64],dark);
  for(const x of [-.34,0,.34]){cyl(root,.23,.4,[x,1.41,.78],copper);for(let i=0;i<6;i++)ring(root,.23,[x,1.26+i*.06,.78],copper);}for(let i=0;i<4;i++){box(root,[.13,.16,.16],[-.44+i*.29,1.94,0],silver);box(root,[.1,.07,.045],[-.43+i*.29,.8,.66],light);}vents(root,0,.54,.63,.85,.22,4);
 }else if(n.type==='terminal'){
  base(root,1.9,1.6);box(root,[1.32,.77,.86],[0,.76,0],dark);const head=sub(root,'operator station',[0,1.62,0],[-.13,0,0]);box(head,[1.7,1.12,.57],[0,0,0],body);panel(head,0,.04,.32,1.43,.85,black);panel(head,-.32,.05,.37,.68,.67,screen);
  for(let i=0;i<6;i++)box(head,[.36,.028,.02],[.32,.3-i*.09,.44],i===0?light:silver);for(let i=0;i<5;i++)box(head,[.055,.12+i*.06,.03],[-.55+i*.12,-.12,.44],light);box(root,[1.66,.12,.79],[0,1.19,.44],body);for(let x=0;x<9;x++)for(let z=0;z<3;z++)box(root,[.105,.04,.105],[-.6+x*.15,1.28,.24+z*.17],x===8?yellow:silver);box(root,[.36,.055,.12],[0,1.28,.83],dark);mesh(head,'sphere',[.07,.07,.07],[.71,-.43,.33],light);
 }else if(n.type==='lamp'){
  base(root,1.7,1.65);cyl(root,.19,2.37,[0,1.5,0],silver);cyl(root,.35,.28,[0,.54,0],body);box(root,[1.55,.74,.52],[0,2.81,0],body,[-.16,0,0]);box(root,[1.31,.52,.12],[0,2.84,.33],light,[-.16,0,0]);for(const x of [-.61,-.3,0,.3,.61])box(root,[.04,.59,.045],[x,2.84,.43],silver,[-.16,0,0]);box(root,[1.7,.13,.76],[0,3.27,0],dark);refs.light.emissive=2;
 }
 // Standard ports are visible attachment points. Power is amber, signal is mint.
 const depth=TYPES[n.type].size[2]/2;for(const x of [-.18,.18]){cyl(root,.17,.14,[x,.45,depth+.02],dark,[PI/2,0,0]);cyl(root,.075,.15,[x,.45,depth+.04],x<0?copper:light,[PI/2,0,0]);}
 for(const p of n.parts)refs.attachments.push(attachment(root,p));
 return {root,refs};
}
function endpoint(n,kind){const z=TYPES[n.type].size[2]/2+.22,x=kind==='power'?-.18:.18,a=n.rotation*PI/180;return [n.position[0]+(x*Math.cos(a)+z*Math.sin(a))*n.scale,n.position[1]+.45*n.scale,n.position[2]+(-x*Math.sin(a)+z*Math.cos(a))*n.scale];}
export class MachineModel {
 constructor(sim){this.sim=sim;this.root=group('MachineWorks');this.machines=new Map();this.cables=group('connections');this.root.children.push(this.cables);this.linkKey='';this.links=[];this.showCables=true;}
 sync(){const s=this.sim;for(const [id,view] of this.machines)if(!s.nodes.has(id)){this.root.children.splice(this.root.children.indexOf(view.root),1);this.machines.delete(id);}
  for(const n of s.nodes.values()){
   const key=JSON.stringify([n.type,n.params.color,n.params.roughness,n.params.metalness,n.parts]);let v=this.machines.get(n.id);
   if(!v||v.key!==key){if(v)this.root.children.splice(this.root.children.indexOf(v.root),1);v=buildMachine(n);v.key=key;this.machines.set(n.id,v);this.root.children.push(v.root);}
   const {root,refs:r}=v;root.position=n.position.slice();root.rotation=[0,n.rotation*PI/180,0];root.scale=[n.scale,n.scale,n.scale];
   const st=n.state,a=st.phase,glow=st.health<=0||st.tripped?'#eb795f':st.power<.02?'#41534e':st.active?'#95e0c2':'#d1ab65';r.light.color=glow;r.light.emissive=st.power>.03?(n.type==='lamp'?2.4:.8):.04;r.screen.emissive=st.power*.5;
   if(r.rotor){if(n.type==='fan')r.rotor.rotation[2]=-a*12;else if(n.type==='sensor')r.rotor.rotation[1]=Math.sin(a*.8)*.7;else r.rotor.rotation[1]=a*.4;}
   if(r.gear)r.gear.rotation[2]=-a*2.5;
   if(r.charge){const fraction=st.charge/n.params.capacity;r.charge.scale[0]=Math.max(.015,1.56*fraction);r.charge.position[0]=-.78+.78*fraction;}
   if(r.head)r.head.position[1]=2.06+Math.cos(a)*.52*n.params.stroke;
   if(r.yaw){r.yaw.rotation[1]=Math.sin(a*.5)*.8;r.shoulder.rotation[2]=-.25+Math.sin(a)*.42;r.elbow.rotation[2]=-.35+Math.cos(a+.4)*.5;r.wrist.rotation[0]=a*.6;}
   if(r.slats)r.slats.forEach((p,i)=>p.position[0]=((i*.22+a*.5)%4.4)-2.2);
   if(r.cargo)r.cargo.forEach((p,i)=>p.position=[((i*1.52+a*.5)%4.6)-2.3,1.22,0]);
   if(r.fluid)r.fluid.position[0]=-.65+((a*.65)%1.85);
   if(r.doors)r.doors.forEach((g,i)=>g.position[0]=(i?1:-1)*(.87+st.openness*1.49));
   if(r.platform)r.platform.position[1]=.63+st.openness*2.55;
   if(r.lever)r.lever.rotation[0]=n.params.command?.65:-.65;
   for(const {g,p,base,rotation} of r.attachments){g.position=base.slice();g.rotation=rotation.slice();if(p.motion==='spin')g.rotation[p.kind==='gear'?2:1]+=a*p.speed;if(p.motion==='stroke')g.position[1]+=Math.sin(a*p.speed)*.35;}
  }
  const linkKey=JSON.stringify([s.connections,[...s.nodes.values()].map(n=>[n.id,n.position,n.rotation,n.scale])]);
  if(linkKey!==this.linkKey){this.linkKey=linkKey;this.cables.children=[];this.links=[];for(const c of s.connections){const n1=s.nodes.get(c.from),n2=s.nodes.get(c.to);if(!n1||!n2)continue;const a=endpoint(n1,c.kind),b=endpoint(n2,c.kind),h=Math.min(a[1],b[1])-.28;
    const points=[a,[a[0],h,a[2]+.35],[a[0],h,(a[2]+b[2])/2+.35],[b[0],h,(a[2]+b[2])/2+.35],[b[0],h,b[2]+.35],b],g=sub(this.cables,c.kind+' '+c.id),m=mat(c.kind==='power'?'#97714b':'#49756c',.48,.45,.03);
    let total=0;const lengths=[];for(let i=1;i<points.length;i++){const len=Math.hypot(...points[i].map((v,k)=>v-points[i-1][k]));lengths.push(len);total+=len;if(len>.001)rod(g,points[i-1],points[i],c.kind==='power'?.085:.05,m);if(i<points.length-1)mesh(g,'sphere',[.09,.09,.09],points[i],m);}
    const glow=mat(c.kind==='power'?'#e3b568':'#8ce0bd',.1,.2,1.8),bead=mesh(g,'sphere',[.14,.14,.14],a.slice(),glow);this.links.push({c,points,lengths,total,m,bead});
   }}
  this.cables.visible=this.showCables;
  for(const l of this.links){const a=s.nodes.get(l.c.from),b=s.nodes.get(l.c.to),active=l.c.kind==='signal'?a.state.signal:a.state.power>.01&&b.state.power>.01;l.bead.visible=active;l.m.emissive=active?.15:0;let distance=(s.time*2)%Math.max(.01,l.total);for(let i=0;i<l.lengths.length;i++){if(distance<=l.lengths[i]){const t=distance/Math.max(.001,l.lengths[i]);l.bead.position=l.points[i].map((v,j)=>v+(l.points[i+1][j]-v)*t);break;}distance-=l.lengths[i];}}
 }
 flatten(){return flatten(this.root);}
 dispose(){this.machines.clear();this.root.children=[];this.links=[];}
}
export function createStage(){const root=group('workbench');const floor=mat('#354449',.38,.62,0,1);box(root,[36,.38,27],[0,-.27,-.8],dark);box(root,[35.8,.09,26.8],[0,-.035,-.8],floor);
 for(const x of [-17.8,17.8])box(root,[.055,.045,26.6],[x,.035,-.8],mat('#68857e',.2,.5,.25));
 for(const z of [-14.1,12.5])box(root,[35.6,.045,.055],[0,.035,z],mat('#68857e',.2,.5,.25));
 for(let x=-16;x<=16;x+=4)for(const z of [-13.6,12]){box(root,[.48,.04,.055],[x,.03,z],silver);box(root,[.055,.04,.48],[x,.03,z],silver);}
 return root;}
