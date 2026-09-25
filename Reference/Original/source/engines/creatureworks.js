/* Generated from the user's creatureworks.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
const VERSION = '1.0.0';
const PRESETS = [
 {id:'ember',name:'Ember Drake',family:'dragon',tag:'Volcanic / winged',blurb:'Obsidian horns. Copper scales. A furnace behind the eyes.',color:'#bd7549',settings:{skin:'#914735',secondary:'#d49b63',horn:'#3e2925',eye:'#ffb74b',pattern:'scales',wing:1,tail:1.2,spines:.8,head:1,horns:1.1}},
 {id:'moss',name:'Mossback',family:'quadruped',tag:'Woodland / guardian',blurb:'An ancient, antler-crowned grazer wearing a forest of its own.',color:'#94ac69',settings:{skin:'#536e45',secondary:'#b4bd78',horn:'#9c8157',eye:'#f2dca0',pattern:'hide',wing:0,tail:.55,bulk:1.4,legs:.82,head:1.12,horns:1.5,spines:.45,roughness:.87}},
 {id:'rift',name:'Rift Stalker',family:'biped',tag:'Void / predator',blurb:'A lean, reverse-jointed silhouette threaded with cold light.',color:'#ab8de0',settings:{skin:'#484056',secondary:'#81759c',horn:'#232132',eye:'#b68bff',pattern:'hide',wing:0,tail:.95,bulk:.8,legs:1.25,head:.78,horns:.7,spines:.75,metalness:.2}},
 {id:'dune',name:'Dune Crawler',family:'arthropod',tag:'Desert / arachnid',blurb:'Eight articulated legs, layered armor, and hooked mandibles.',color:'#cdb480',settings:{skin:'#9b7042',secondary:'#dec78e',horn:'#473729',eye:'#ffd271',pattern:'chitin',wing:0,tail:.35,legPairs:4,legs:1.1,head:.8,horns:0,spines:.25,roughness:.55}},
 {id:'abyss',name:'Abyssal Wyrm',family:'serpent',tag:'Deepwater / leviathan',blurb:'An undulating, finned body with a trail of bioluminescence.',color:'#63beb7',settings:{skin:'#224e59',secondary:'#53a2a7',horn:'#153138',eye:'#6bffda',pattern:'scales',wing:0,tail:2.05,segments:20,head:1.08,horns:.75,spines:.7,roughness:.3,metalness:.25,glow:2}},
 {id:'frost',name:'Frostwing',family:'dragon',tag:'Alpine / avian',blurb:'Overlapping flight feathers, a hooked beak, and glacial eyes.',color:'#a0c4d8',settings:{skin:'#7d9cae',secondary:'#d6e1dc',horn:'#4b626f',eye:'#b7f7ff',pattern:'hide',wing:1.06,tail:.9,head:.92,horns:.45,spines:.5,roughness:.65}},
 {id:'storm',name:'Storm Beetle',family:'arthropod',tag:'Tempest / armored',blurb:'A polished carapace, branching feelers, and an electric core.',color:'#75b2b9',settings:{skin:'#235063',secondary:'#5fa4a2',horn:'#122c37',eye:'#8dfbff',pattern:'chitin',wing:0,tail:0,legPairs:3,bulk:1.3,legs:.85,head:.85,horns:1.45,spines:.4,metalness:.55,roughness:.32}},
 {id:'golem',name:'Crystal Golem',family:'biped',tag:'Mineral / colossus',blurb:'Faceted stone plates split by luminous mineral growth.',color:'#b297d2',settings:{skin:'#625b73',secondary:'#a193bc',horn:'#3b3549',eye:'#deb7ff',pattern:'stone',wing:0,tail:0,bulk:1.65,legs:.85,head:.85,horns:.4,spines:1.15,roughness:.78,metalness:.18}}
];
const DEFAULTS = {preset:'ember',name:'Ember Drake',family:'dragon',seed:1847,scale:1,length:1,bulk:1,legs:1,legPairs:3,head:1,snout:1,eyes:1,ears:.6,wing:1,tail:1,segments:14,horns:1,spines:.7,skin:'#914735',secondary:'#d49b63',horn:'#3e2925',eye:'#ffb74b',pattern:'scales',patternScale:1.35,roughness:.6,metalness:.08,normal:.7,glow:1.3,animation:'idle',speed:1,stride:1};
const LIMITS = {seed:[0,4294967295],scale:[.4,2],length:[.6,1.6],bulk:[.55,1.8],legs:[.6,1.5],legPairs:[2,4],head:[.55,1.55],snout:[.4,1.6],eyes:[.5,1.8],ears:[0,1.6],wing:[0,1.6],tail:[0,2.2],segments:[8,24],horns:[0,1.8],spines:[0,1.5],patternScale:[.5,2.5],roughness:[.08,1],metalness:[0,1],normal:[0,2],glow:[0,3],speed:[.1,2.5],stride:[.3,1.7]};
const clamp=(x,a,b)=>Math.max(a,Math.min(b,x));
function randomSource(seed){let a=seed>>>0;return()=>{a+=0x6D2B79F5;let t=a;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
function presetSettings(id){const p=PRESETS.find(p=>p.id===id);if(!p)throw Error('Unknown creature preset: '+id);return {...DEFAULTS,...p.settings,preset:p.id,name:p.name,family:p.family};}
function validateSettings(input,base=DEFAULTS){
 if(!input||typeof input!=='object'||Array.isArray(input))throw Error('Creature settings must be an object.');
 const out={...base};
 for(const key of Object.keys(DEFAULTS)){if(!Object.hasOwn(input,key))continue;const v=input[key];
  if(key in LIMITS){if(typeof v!=='number'||!Number.isFinite(v))throw Error('Invalid number: '+key);out[key]=clamp(v,...LIMITS[key]);}
  else if(['skin','secondary','horn','eye'].includes(key)){if(typeof v!=='string'||!/^#[\da-f]{6}$/i.test(v))throw Error('Invalid color: '+key);out[key]=v;}
  else if(key==='family'){if(!['dragon','quadruped','biped','arthropod','serpent'].includes(v))throw Error('Unknown body plan.');out[key]=v;}
  else if(key==='pattern'){if(!['scales','hide','chitin','stone'].includes(v))throw Error('Unknown surface.');out[key]=v;}
  else if(key==='animation'){if(!['idle','walk','run','threat','fly','pose'].includes(v))throw Error('Unknown animation.');out[key]=v;}
  else if(key==='preset'){out[key]=PRESETS.some(p=>p.id===v)?v:'ember';}
  else if(key==='name'){out.name=String(v).replace(/[\x00-\x1f]/g,'').slice(0,64)||'Unnamed specimen';}
 }
 for(const k of ['seed','legPairs','segments'])out[k]=Math.round(out[k]);if(out.wing<=.05&&out.animation==='fly')out.animation='idle';return out;
}
function parseRecipe(value){if(!value||value.format!=='creatureworks'||value.version!==1)throw Error('This is not a CreatureWorks v1 recipe.');return validateSettings(value.settings);}
function mutateSettings(input,seed){const r=randomSource(seed),s={...input,seed};for(const k of ['length','bulk','legs','head','snout','eyes','ears','tail','horns','spines'])s[k]=clamp(s[k]*(.78+r()*.44),...LIMITS[k]);if(s.wing>.1)s.wing=clamp(s.wing*(.8+r()*.4),...LIMITS.wing);return validateSettings(s);}

/** Factory keeps the host and creature on the exact same THREE instance. */
function createCreatureEngine(THREE){
 const T=THREE,V=(x=0,y=0,z=0)=>new T.Vector3(x,y,z),UP=V(0,1,0),TAU=Math.PI*2;
 function prepareGeometry(g){if(g.attributes.uv&&!g.attributes.uv1)g.setAttribute('uv1',g.attributes.uv.clone());if(g.attributes.uv&&!g.attributes.uv2)g.setAttribute('uv2',g.attributes.uv.clone());return g;}
 function makeMaps(s){
  const n=256,rng=randomSource(s.seed),height=new Float32Array(n*n),noise=new Float32Array(n*n),grain=new Float32Array(n*n);
  for(let i=0;i<n*n;i++)noise[i]=rng();
  const freq=s.patternScale;
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const u=x/n,v=y/n;let h=.5;
   if(s.pattern==='scales'){
    const yy=v*18*freq,row=Math.floor(yy),xx=u*14*freq+(row%2)*.5;const dx=(xx-Math.floor(xx))-.5,dy=(yy-row)-.47;const d=Math.sqrt((dx*1.85)**2+(dy*1.65)**2);
    h=clamp(1-d,0,1)**.38*.8+.1;
   }else if(s.pattern==='chitin'){const rib=Math.abs(Math.sin(v*TAU*12*freq+Math.sin(u*TAU*2)*.6));h=.25+Math.pow(rib,.2)*.65+.06*Math.sin(u*TAU*5);}
   else if(s.pattern==='stone'){let f=Math.sin(u*TAU*7*freq+Math.sin(v*TAU*3)*2)*Math.cos(v*TAU*9*freq+Math.sin(u*TAU*4));h=.25+Math.abs(f)*.55;h*=Math.abs(f)>.06?1:.35;}
   else {h=.46+.12*Math.sin(u*TAU*29*freq+Math.sin(v*TAU*5))+.08*Math.sin(v*TAU*35*freq)+noise[y*n+x]*.16;}
   height[y*n+x]=h;grain[y*n+x]=.83+.12*Math.sin(u*TAU*3)*Math.cos(v*TAU*2)+noise[y*n+x]*.09;
  }
  const color=new T.Color(s.skin),accent=new T.Color(s.secondary),arrays=Array.from({length:5},()=>new Uint8Array(n*n*4));
  for(let y=0;y<n;y++)for(let x=0;x<n;x++){
   const i=y*n+x,k=i*4,h=height[i],shade=(.48+h*.55)*grain[i],mix=.10+.15*(Math.sin(x/n*TAU*2)+1)/2;
   // Convert linear THREE colors to sRGB for the albedo image.
   const c=color.clone().lerp(accent,mix).multiplyScalar(shade).convertLinearToSRGB();
   arrays[0][k]=clamp(c.r*255,0,255);arrays[0][k+1]=clamp(c.g*255,0,255);arrays[0][k+2]=clamp(c.b*255,0,255);
   const dx=height[y*n+(x+1)%n]-height[y*n+(x+n-1)%n],dy=height[((y+1)%n)*n+x]-height[((y+n-1)%n)*n+x],normal=V(-dx*2.4,-dy*2.4,1).normalize();
   arrays[1][k]=(normal.x*.5+.5)*255;arrays[1][k+1]=(normal.y*.5+.5)*255;arrays[1][k+2]=(normal.z*.5+.5)*255;
   const rough=clamp(.68+(1-h)*.28,0,1)*255,ao=(.58+h*.42)*255,metal=(.68+h*.32)*255;
   for(let j=0;j<3;j++){arrays[2][k+j]=rough;arrays[3][k+j]=ao;arrays[4][k+j]=metal;}
   for(const a of arrays)a[k+3]=255;
  }
  const maps=arrays.map((a,index)=>{const canvas=document.createElement('canvas');canvas.width=canvas.height=n;canvas.getContext('2d').putImageData(new ImageData(new Uint8ClampedArray(a),n,n),0,0);const t=new T.CanvasTexture(canvas);t.wrapS=t.wrapT=T.RepeatWrapping;t.anisotropy=4;t.colorSpace=index===0?T.SRGBColorSpace:T.NoColorSpace;t.name=['Albedo','Normal','Roughness','Surface occlusion','Metalness'][index];return t;});
  return {albedo:maps[0],normal:maps[1],roughness:maps[2],ao:maps[3],metalness:maps[4]};
 }
 return class CreatureEngine{
  constructor({scene,settings={},sampleHeight=null}={}){
   if(!scene?.isObject3D)throw Error('CreatureEngine requires a THREE.Scene or Group.');
   this.scene=scene;this.sampleHeight=sampleHeight;this.settings=validateSettings(settings);this.root=new T.Group();this.root.name='CreatureWorks';scene.add(this.root);this.time=0;this.paused=false;this.debug='lit';this.geometries=new Set();this.materials=new Set();this.textures=new Set();this.rebuild();
  }
  own(g){this.geometries.add(prepareGeometry(g));return g;}
  material(options){const m=new T.MeshStandardMaterial(options);this.materials.add(m);return m;}
  group(parent,name,pos=[0,0,0]){const g=new T.Group();g.name=name;g.position.set(...pos);parent.add(g);return g;}
  mesh(g,m,parent,name,pos=[0,0,0],scale=[1,1,1]){const a=new T.Mesh(g,m);a.name=name;a.position.set(...pos);a.scale.set(...scale);a.castShadow=true;a.receiveShadow=true;a.userData.cwMaterial=m.name;parent.add(a);return a;}
  ell(parent,name,pos,size,mat=this.skin,faceted=false){return this.mesh(faceted?this.geo.rock:this.geo.sphere,mat,parent,name,pos,size);}
  taper(parent,name,points,radii,mat=this.skin,radial=10){
   const curve=new T.CatmullRomCurve3(points.map(p=>Array.isArray(p)?V(...p):p)),steps=Math.max(8,points.length*5),frames=curve.computeFrenetFrames(steps,false),p=[],uv=[],ix=[];
   for(let i=0;i<=steps;i++){const t=i/steps,center=curve.getPointAt(t),q=t*(radii.length-1),j=Math.min(radii.length-2,Math.floor(q)),r=radii[j]+(radii[j+1]-radii[j])*(q-j);for(let k=0;k<=radial;k++){const a=k/radial*TAU;const v=center.clone().addScaledVector(frames.normals[i],Math.cos(a)*r).addScaledVector(frames.binormals[i],Math.sin(a)*r);p.push(v.x,v.y,v.z);uv.push(k/radial,t);if(i<steps&&k<radial){const A=i*(radial+1)+k,B=A+radial+1;ix.push(A,B,A+1,B,B+1,A+1);}}}
   const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();return this.mesh(this.own(g),mat,parent,name);
  }
  link(mesh,a,b,width=1){mesh.position.copy(a).add(b).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(UP,b.clone().sub(a).normalize());mesh.scale.set(width,a.distanceTo(b),width);}
  release(){this.root.clear();for(const g of this.geometries)g.dispose();for(const m of this.materials)m.dispose();for(const t of this.textures)t.dispose();this.geometries.clear();this.materials.clear();this.textures.clear();}
  rebuild(){
   if(this.disposed)throw Error('CreatureEngine is disposed.');this.release();const s=this.settings;this.rng=randomSource(s.seed);this.limbs=[];this.tails=[];this.wings=[];this.eyes=[];this.nodes=[];this.glowMeshes=[];
   this.maps=makeMaps(s);Object.values(this.maps).forEach(t=>this.textures.add(t));
   this.geo={sphere:this.own(new T.SphereGeometry(1,24,16)),rock:this.own(new T.IcosahedronGeometry(1,0)),limb:this.own(new T.CylinderGeometry(.72,1,1,12,4)),claw:this.own(new T.ConeGeometry(1,1,10)),ring:this.own(new T.TorusGeometry(1,.1,6,28))};
   this.skin=this.material({color:0xffffff,map:this.maps.albedo,normalMap:this.maps.normal,normalScale:new T.Vector2(s.normal,s.normal),roughnessMap:this.maps.roughness,aoMap:this.maps.ao,metalnessMap:this.maps.metalness,roughness:s.roughness,metalness:s.metalness});this.skin.name='Living surface';
   this.under=this.material({color:s.secondary,normalMap:this.maps.normal,normalScale:new T.Vector2(s.normal*.5,s.normal*.5),roughness:s.roughness,metalness:s.metalness*.5});this.under.name='Secondary plates';
   this.horn=this.material({color:s.horn,roughness:.42,metalness:.18,normalMap:this.maps.normal,normalScale:new T.Vector2(.2,.2)});this.horn.name='Keratin';
   this.tip=this.material({color:s.secondary,roughness:.36,metalness:.08});this.tip.name='Ivory tips';
   this.glow=this.material({color:s.eye,emissive:s.eye,emissiveIntensity:s.glow*1.65,roughness:.2,metalness:.05});this.glow.name='Bioluminescence';
   this.dark=this.material({color:'#080d12',roughness:.24});this.dark.name='Pupil and recesses';
   this.membrane=this.material({color:s.secondary,roughness:.64,metalness:.04,side:T.DoubleSide,normalMap:this.maps.normal,normalScale:new T.Vector2(.16,.16)});this.membrane.name='Wing membrane';
   this.body=this.group(this.root,'Torso');this.root.scale.setScalar(s.scale);this.root.userData={format:'creatureworks',version:1,settings:{...s}};
   if(s.family==='arthropod')this.buildArthropod();else if(s.family==='biped')this.buildBiped();else if(s.family==='serpent')this.buildSerpent();else this.buildQuadruped();
   this.root.name=s.name;this.baseY=this.body.position.y;this.setDebug(this.debug);this.update(0);this.stats=this.measure();
  }
  addSpine(parent,pos,size,tilt=-.35){if(size<.02)return;const o=this.ell(parent,'Dorsal root',pos,[size*.45,size*.18,size*.45],this.horn);const p=this.mesh(this.geo.claw,this.tip,parent,'Dorsal spike',[pos[0],pos[1]+size*.45,pos[2]],[size*.24,size,size*.35]);p.rotation.x=tilt;return o;}
  buildQuadruped(){
   const s=this.settings,L=s.length,B=s.bulk;this.body.position.y=1.45*s.legs+.18;this.bodyHeight=this.body.position.y;
   this.ell(this.body,'Rib cage',[0,.05,0],[.64*B,.68*B,1.45*L]);this.ell(this.body,'Shoulder muscle',[0,.16,.67*L],[.7*B,.74*B,.76]);this.ell(this.body,'Haunches',[0,-.06,-.94*L],[.64*B,.59*B,.67]);
   for(let i=0;i<9;i++){const z=-.8*L+i*.235*L;this.ell(this.body,'Ventral scute '+i,[0,-.48*B,z],[.45*B,.12,.17],this.under);}
   const neckEnd=[0,.88*B,1.48*L];this.taper(this.body,'Curved neck',[[0,.14,.9*L],[0,.52*B,1.25*L],neckEnd],[.44*B,.32,.25],this.skin,16);
   this.headRoot=this.group(this.body,'Head rig',neckEnd);this.buildHead(this.headRoot);
   for(let side of [-1,1]){this.addLeg(side,.83*L,0);this.addLeg(side,-.93*L,1);}
   this.buildTail([0,.02,-1.25*L],s.tail*2.55,.34*B);
   if(s.wing>.05)this.buildWings([.58*B,.38,.56*L]);
   for(let i=0;i<9;i++){const z=-1.02*L+i*.265*L;this.addSpine(this.body,[0,(.68+Math.sin(i/8*Math.PI)*.08)*B,z],s.spines*(.3+.24*Math.sin(i/8*Math.PI)));}
   if(s.preset==='moss'){
    for(let i=0;i<26;i++){const z=(this.rng()*2-1)*1.2*L,x=(this.rng()*2-1)*.48*B,y=.62*B+this.rng()*.18;const a=.12+this.rng()*.23;this.ell(this.body,'Moss growth',[x,y,z],[a,a*.75,a*1.2],i%3?this.skin:this.under,true);}
   }
  }
  buildBiped(){
   const s=this.settings,B=s.bulk,stone=s.preset==='golem';this.body.position.y=1.56*s.legs+.52*B;this.bodyHeight=this.body.position.y;
   this.ell(this.body,'Chest',[0,.32,0],[.61*B,.85*s.length,.44*B],this.skin,stone);this.ell(this.body,'Pelvis',[0,-.37,0],[.45*B,.44,.4*B],this.skin,stone);
   for(let side of [-1,1]){this.ell(this.body,'Pectoral plate',[side*.3*B,.56,.24*B],[.38*B,.37,.25],this.under,stone);this.ell(this.body,'Shoulder armor',[side*.7*B,.52,0],[.36*B,.37*B,.39],this.skin,stone);this.addLeg(side,0,0,true);this.addArm(side);}
   for(let i=0;i<4;i++)this.ell(this.body,'Abdominal plate',[0,.16-i*.19,.33*B],[.31*B,.095,.09],this.under,stone);
   this.taper(this.body,'Neck',[[0,.83*s.length,0],[0,1.06*s.length,0],[0,1.17*s.length,.08]],[.23,.18,.19],this.skin);
   this.headRoot=this.group(this.body,'Head rig',[0,1.05*s.length,.07]);this.buildHead(this.headRoot);this.buildTail([0,-.35,-.35*B],s.tail*2.7,.24*B);
   if(s.wing>.05)this.buildWings([.52*B,.62,-.1]);
   for(let side of [-1,1])for(let i=0;i<4;i++)this.addSpine(this.body,[side*(.56+i*.12)*B,.8-i*.045,-.04],s.spines*(.48-i*.065));
   if(stone){for(let i=0;i<20;i++){const side=i%2?1:-1;this.addCrystal(this.body,[side*(.2+this.rng()*.6)*B,.95-this.rng()*1.5,-.3*B],.12+this.rng()*.4);}}
  }
  addCrystal(parent,pos,size){const a=this.mesh(this.geo.rock,this.glow,parent,'Crystal vein',pos,[size*.3,size,size*.38]);a.rotation.z=(this.rng()-.5)*.8;this.glowMeshes.push(a);return a;}
  buildArthropod(){
   const s=this.settings,B=s.bulk,L=s.length;this.body.position.y=.82*s.legs+.1;this.bodyHeight=this.body.position.y;
   this.ell(this.body,'Abdomen',[0,.06,-.48*L],[.75*B,.58*B,1.06*L]);this.ell(this.body,'Thorax',[0,.02,.63*L],[.51*B,.38,.63]);
   for(let side of [-1,1]){const shell=this.ell(this.body,'Armored elytron',[side*.32*B,.23,-.48*L],[.48*B,.48*B,.99*L],this.skin);shell.rotation.z=-side*.15;}
   for(let i=0;i<7;i++){this.ell(this.body,'Carapace segmentation',[0,.58*B,-1.15*L+i*.28*L],[.14,.065,.105],i%2?this.glow:this.horn);}
   this.headRoot=this.group(this.body,'Head rig',[0,.04,1.12*L]);this.buildHead(this.headRoot);
   for(let side of [-1,1])for(let i=0;i<s.legPairs;i++)this.addInsectLeg(side,-.82*L+i*(1.63*L/(s.legPairs-1)),i);
   for(let side of [-1,1]){this.taper(this.headRoot,'Sensory antenna',[[side*.2,.2,.22],[side*.38,.73,.33],[side*.58,1.09,.7]],[.045,.024,.008],this.horn);this.ell(this.headRoot,'Antenna light',[side*.58,1.09,.7],[.045,.045,.045],this.glow);}
   if(s.preset==='storm'&&s.horns>.05)this.taper(this.body,'Rhino crown',[[0,.32,1.02],[0,.58,1.34],[0,1.3*s.horns,1.28],[0,1.5*s.horns,1.53]],[.2,.16,.08,.008],this.horn);
   this.buildTail([0,-.1,-1.36*L],s.tail*2.6,.23*B);if(s.wing>.05)this.buildWings([.4*B,.36,.45]);
  }
  buildSerpent(){
   const s=this.settings,B=s.bulk;this.body.position.y=.72;this.bodyHeight=.72;this.ell(this.body,'Anterior trunk',[0,0,0],[.47*B,.45*B,.98*s.length]);
   this.taper(this.body,'Raised neck',[[0,0,.5],[0,.32,1.07],[0,.82,1.25],[0,1.02,1.54]],[.4*B,.33*B,.26,.23],this.skin,16);this.headRoot=this.group(this.body,'Head rig',[0,1.02,1.54]);this.buildHead(this.headRoot);
   this.buildTail([0,0,-.55],Math.max(1,s.tail*3),.46*B,true);for(let side of [-1,1])this.fin(this.body,[side*.34,.02,.2],side,1.1);if(s.wing>.05)this.buildWings([.35,.25,0]);
  }
  buildHead(parent){
   const s=this.settings,stone=s.preset==='golem',insect=s.family==='arthropod',biped=s.family==='biped',frost=s.preset==='frost';parent.scale.setScalar(s.head);
   this.ell(parent,'Skull',[0,.08,.14],[insect?.37:.34,biped?.4:.31,insect?.34:.43],this.skin,stone);
   const muzzle=s.snout*(insect?.3:biped?.29:.56);
   this.ell(parent,'Muzzle',[0,-.04,.4+muzzle*.35],[insect?.21:.235,.16,muzzle*.68],frost?this.horn:this.skin,stone);
   this.jaw=this.group(parent,'Jaw hinge',[0,-.12,.16]);this.ell(this.jaw,'Lower jaw',[0,-.06,.24+muzzle*.32],[.22,.08,muzzle*.7],this.under,stone);
   this.ell(parent,'Mouth recess',[0,-.105,.4+muzzle*.28],[.219,.028,muzzle*.7],this.dark);
   if(frost){this.taper(parent,'Hooked beak',[[0,0,.57],[0,.0,.9],[0,-.18,1.03]],[.17,.12,.009],this.horn,10);}
   for(let side of [-1,1]){
    this.ell(parent,'Eye socket',[side*.284,.165,.31],[.12,.14,.15],this.horn);
    const eye=this.ell(parent,'Luminous eye',[side*.33,.18,.35],[.065*s.eyes,.083*s.eyes,.10*s.eyes],this.glow);this.eyes.push(eye);
    this.ell(parent,'Slit pupil',[side*.379,.184,.382],[.018,.060*s.eyes,.025],this.dark);
    this.ell(parent,'Brow ridge',[side*.27,.26,.31],[.17,.075,.21],this.skin,stone).rotation.z=-side*.2;
    this.ell(parent,'Nostril',[side*.135,.027,.4+muzzle*.82],[.05,.024,.052],this.dark);
    if(!stone&&!insect)for(let i=0;i<4;i++){const tooth=this.mesh(this.geo.claw,this.tip,parent,'Upper tooth',[side*.19,-.15,.38+i*muzzle*.18],[.022,.09,.025]);tooth.rotation.z=Math.PI;}
    if(s.ears>.03&&!insect){this.taper(parent,'Ear crest',[[side*.29,.2,-.03],[side*(.44+s.ears*.1),.36+s.ears*.15,-.1],[side*(.5+s.ears*.2),.45+s.ears*.26,-.18]],[.12,.10,.003],this.skin);}
    if(s.horns>.02&&!insect){
     if(s.preset==='moss'){
      this.taper(parent,'Antler beam',[[side*.22,.26,0],[side*.36,.72*s.horns,-.15],[side*.66,1.06*s.horns,-.35],[side*.82,1.32*s.horns,-.38]],[.1,.07,.038,.005],this.horn);
      for(let j=0;j<3;j++)this.taper(parent,'Antler tine',[[side*(.36+j*.15),(.60+j*.19)*s.horns,-.13-j*.10],[side*(.35+j*.18),(.93+j*.21)*s.horns,.05],[side*(.37+j*.18),(1.08+j*.20)*s.horns,.19]],[.048,.03,.003],this.tip,7);
     }else{
      this.taper(parent,'Swept horn',[[side*.24,.3,0],[side*.35,.5*s.horns,-.15],[side*.45,.69*s.horns,-.46],[side*.37,.79*s.horns,-.7]],[.12,.1,.055,.003],this.horn);
      this.taper(parent,'Cheek horn',[[side*.24,0,.03],[side*.43,-.02,-.17],[side*.48,.01,-.44*s.horns]],[.075,.052,.002],this.tip,8);
     }
    }
    if(insect){this.taper(this.jaw,'Hooked mandible',[[side*.23,0,.19],[side*.44,-.06,.5],[side*.32,-.06,.79],[side*.16,.02,.8]],[.11,.10,.055,.003],this.horn);for(let i=0;i<2;i++)this.ell(parent,'Secondary eye',[side*(.19-i*.09),.30,.39],[.055,.053,.06],this.glow);}
   }
   if(stone){for(let side of [-1,1])this.ell(parent,'Cheek slab',[side*.29,-.02,.1],[.22,.33,.29],this.under,true);this.ell(parent,'Brow crystal',[0,.34,.30],[.065,.16,.045],this.glow,true);}
  }
  addLeg(side,z,index,biped=false){
   const s=this.settings,B=s.bulk,h=V(side*(biped?.4:.52)*B,biped?-.38:-.14,z),foot=V(side*(biped?.50:.71)*B,-this.bodyHeight+.13,z+(biped?.08:0));
   const distance=h.distanceTo(foot),l1=distance*.56,l2=distance*.57,width=(biped?.19:.205)*B;
   this.makeLimb(h,foot,l1,l2,width,side,index,biped?-.65:(index?-.7:.65),false);
  }
  addArm(side){const s=this.settings,B=s.bulk,hip=V(side*.66*B,.5,0),foot=V(side*1.05*B,-.84,-.04);const l=hip.distanceTo(foot)*.58;this.makeLimb(hip,foot,l,l,.145*B,side,0,-.7,true);}
  addInsectLeg(side,z,index){
   const s=this.settings,h=V(side*.38*s.bulk,-.06,z),foot=V(side*(1.38*s.legs+.3*s.bulk),-this.bodyHeight+.07,z+(z>=0?.32:-.32));const l=h.distanceTo(foot)*.68;
   this.makeLimb(h,foot,l,l*.96,.065*s.bulk,side,index,side*.01,false,true);
  }
  makeLimb(hip,foot,l1,l2,width,side,index,poleZ,arm=false,insect=false){
   const g=this.group(this.body,(arm?'Arm':'Leg')+' '+(side<0?'L':'R')+index),mat=this.settings.preset==='golem'?this.under:this.skin;
   const upper=this.mesh(this.geo.limb,mat,g,'Upper segment'),lower=this.mesh(this.geo.limb,mat,g,'Lower segment');
   const ball=this.ell(g,'Hip socket',[...hip],[width*1.5,width*1.55,width*1.7],this.skin,this.settings.preset==='golem');
   const joint=this.ell(g,'Articulation',[0,0,0],[width*1.05,width*1.05,width*1.05],insect?this.glow:this.skin,this.settings.preset==='golem');
   const paw=this.group(g,arm?'Hand':'Foot');
   this.ell(paw,'Foot pad',[0,0,.06],[width*1.3,width*.75,width*1.8],insect?this.horn:mat,this.settings.preset==='golem');
   for(let k=0;k<(insect?1:3);k++){
    const claw=this.mesh(this.geo.claw,this.tip,paw,'Claw',[(k-(insect?0:1))*width*.8,-.005,width*1.8],[width*.32,width*1.8,width*.34]);claw.rotation.x=Math.PI*.57;
   }
   this.limbs.push({hip,foot,l1,l2,width,side,index,poleZ,upper,lower,ball,joint,paw,arm,insect,knee:V()});
  }
  buildTail(pos,length,radius,serpent=false){
   if(length<.12)return;const s=this.settings,n=s.segments,step=length/n;let parent=this.group(this.body,'Tail root',pos);
   for(let i=0;i<n;i++){
    const g=this.group(parent,'Tail segment '+String(i).padStart(2,'0'),i?[0,0,-step]:[0,0,0]),r=radius*Math.pow(1-i/n,.82),next=radius*Math.pow(1-(i+1)/n,.82);
    this.taper(g,'Tail skin '+i,[[0,0,.025],[0,0,-step*.5],[0,0,-step-.025]],[r,r*.5+next*.5,Math.max(.006,next)],this.skin,12);
    this.ell(g,'Tail underside',[0,-r*.72,-step*.4],[r*.63,Math.max(.025,r*.24),step*.51],this.under);
    if(i%2===0&&s.spines>.03)this.addSpine(g,[0,r*.87,-step*.4],s.spines*r*1.3);
    if(serpent&&i%3===0){for(let side of [-1,1])this.fin(g,[side*r*.78,0,-step*.4],side,Math.max(.18,r*2));this.ell(g,'Photophore',[0,r,-step*.35],[r*.18,.035,.07],this.glow);}
    this.tails.push({g,i,n,step,serpent});parent=g;
   }
  }
  fin(parent,pos,side,size){const shape=new T.Shape();shape.moveTo(0,0);shape.quadraticCurveTo(size*.4,size*.85,size*1.15,size*.85);shape.quadraticCurveTo(size*.85,size*.1,size*.35,-size*.25);shape.lineTo(0,0);const geo=this.own(new T.ShapeGeometry(shape,12));const m=this.mesh(geo,this.membrane,parent,'Lateral fin',pos);m.rotation.x=-Math.PI*.55;m.scale.x=side;return m;}
  buildWings(pos){
   const s=this.settings;
   for(let side of [-1,1]){
    const wing=this.group(this.body,'Wing '+(side<0?'L':'R'),[side*pos[0],pos[1],pos[2]]);wing.scale.set(side*s.wing,s.wing,s.wing);
    const wrist=V(1.72,1.28,-.24),elbow=V(.75,.62,-.12),tips=[V(3.25,1.18,-.7),V(3.0,.60,-1.62),V(2.52,.08,-2.12),V(1.65,-.30,-2.12),V(.25,-.25,-1.12)];
    this.taper(wing,'Wing arm',[[0,0,0],elbow,wrist],[.18,.115,.085],this.skin,12);this.ell(wing,'Wrist armor',[...wrist],[.15,.14,.13],this.under);
    for(let i=0;i<tips.length;i++)this.taper(wing,'Wing finger '+i,[wrist,wrist.clone().lerp(tips[i],.55).add(V(0,.06,0)),tips[i]],[.061,.034,.006],this.horn,7);
    // Subdivided, scalloped triangle fans form the membrane between each finger.
    const ends=[V(.03,-.06,-.05),...tips];
    for(let k=0;k<ends.length-1;k++){
     const p=[],uv=[],ix=[],N=12,A=ends[k],B=ends[k+1];
     for(let i=0;i<=N;i++)for(let j=0;j<=N;j++){
      const t=i/N,u=j/N,edge=A.clone().lerp(B,u),indent=.13*Math.sin(Math.PI*u);edge.lerp(wrist,indent);const v=wrist.clone().lerp(edge,t);v.y-=Math.sin(Math.PI*u)*Math.sin(Math.PI*t)*.12;p.push(v.x,v.y,v.z);uv.push(v.x/3.4,(v.z+2.3)/2.7);
      if(i<N&&j<N){const a=i*(N+1)+j,b=a+N+1;ix.push(a,b,a+1,b,b+1,a+1);}
     }
     const g=new T.BufferGeometry();g.setAttribute('position',new T.Float32BufferAttribute(p,3));g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));g.setIndex(ix);g.computeVertexNormals();this.mesh(this.own(g),this.membrane,wing,'Membrane '+k);
    }
    // Smaller radial veins remain geometric, so they survive mesh export.
    for(let k=0;k<ends.length-1;k++)for(const u of [.33,.67]){
     const edge=ends[k].clone().lerp(ends[k+1],u).lerp(wrist,.13*Math.sin(Math.PI*u));
     const points=[.14,.48,.80,.97].map(t=>{const p=wrist.clone().lerp(edge,t);p.y-=Math.sin(Math.PI*u)*Math.sin(Math.PI*t)*.12;p.y+=.009;return p;});
     this.taper(wing,'Membrane vein '+k+' '+u,points,[.011,.009,.006,.002],this.horn,5);
    }
    if(s.preset==='frost'){
     const featherShape=new T.Shape();featherShape.moveTo(0,0);featherShape.bezierCurveTo(.12,-.15,.17,-.60,0,-1);featherShape.bezierCurveTo(-.10,-.60,-.10,-.12,0,0);const g=this.own(new T.ShapeGeometry(featherShape,12));
     for(let i=0;i<32;i++){const t=i/31;const f=this.mesh(g,i%4?this.under:this.tip,wing,'Flight feather '+i,[.28+2.7*t,.01+1.1*t,-1.03-.70*Math.sin(t*Math.PI)],[1, .48+.58*t,1]);f.material.side=T.DoubleSide;f.rotation.x=-Math.PI*.51;f.rotation.z=-.2-t*.4;}
    }
    this.wings.push({g:wing,side});
   }
  }
  setSettings(changes){const next=validateSettings(changes,this.settings),keys=Object.keys(changes).filter(k=>next[k]!==this.settings[k]);this.settings=next;if(!keys.length)return;this.root.userData.settings={...next};this.root.name=next.name;
   if(keys.some(k=>!['name','animation','speed','stride'].includes(k)))this.rebuild();
  }
  setAnimation(name){this.setSettings({animation:name});}
  setPosition(x,y,z){if(![x,y,z].every(Number.isFinite))throw Error('Position must be finite.');this.root.position.set(x,y,z);return this;}
  followTerrain(){if(typeof this.sampleHeight==='function'){const p=this.root.position,y=this.sampleHeight(p.x,p.z);if(Number.isFinite(y))p.y=y;}}
  update(delta){
   if(this.disposed)return;delta=Number.isFinite(delta)?clamp(delta,0,.1):0;if(!this.paused)this.time+=delta*this.settings.speed;const t=this.time,s=this.settings,mode=s.animation,pose=mode==='pose',walk=mode==='walk'||mode==='run',run=mode==='run',fly=mode==='fly'&&this.wings.length>0,threat=mode==='threat';
   const cycle=t*(run?8.7:4),bob=pose?0:fly?.48+Math.sin(t*3)*.08:walk?Math.sin(cycle*2)*.035:Math.sin(t*1.9)*.018;
   this.body.position.y=this.baseY+bob;this.body.rotation.x=pose?0:threat?-.08*Math.max(0,Math.sin(t*2)):(walk?Math.sin(cycle)*.013:0);this.body.rotation.z=pose?0:Math.sin(t*1.2)*.006;
   if(this.headRoot){this.headRoot.rotation.y=pose?0:Math.sin(t*.7)*.055;this.headRoot.rotation.x=pose?0:threat?-.18*Math.max(0,Math.sin(t*2)):Math.sin(t*1.5)*.027;}
   if(this.jaw)this.jaw.rotation.x=pose?0:threat?(.13+.33*Math.max(0,Math.sin(t*2))):.035+.024*Math.sin(t*1.8);
   for(const w of this.wings){w.g.rotation.z=w.side*(fly?Math.sin(t*4)*.53:pose?.18:.14+Math.sin(t*1.7)*.045);w.g.rotation.y=w.side*(fly?.15:threat?-.08:.18);}
   for(const tail of this.tails){const i=tail.i;tail.g.rotation.y=pose?0:Math.sin(t*(tail.serpent?2.3:1.7)-i*.36)*(tail.serpent?.135:.072);tail.g.rotation.x=pose?.015:tail.serpent?Math.cos(t*1.6-i*.35)*.025:.04+Math.sin(t*1.3-i*.3)*.018;}
   for(const l of this.limbs){
    const target=l.foot.clone(),phase=(cycle/TAU+(l.side<0?.5:0)+l.index*.5)%1;
    if(l.arm){target.z+=walk?Math.sin(cycle+(l.side<0?Math.PI:0))*.28:0;if(threat){target.x*=1.25;target.y+=.35;}}
    else if(walk){const stance=.64,stride=(run?.52:.32)*s.stride;let z,lift;if(phase<stance){z=stride*(1-2*phase/stance);lift=0;}else{const u=(phase-stance)/(1-stance);z=-stride+2*stride*u;lift=Math.sin(u*Math.PI)*(run?.34:.20);}target.z+=z;target.y+=lift;}
    if(fly&&!l.arm){target.y+=.38;target.z-=.15;}else if(!l.arm)target.y-=bob;
    let dir=target.clone().sub(l.hip),d=clamp(dir.length(),Math.abs(l.l1-l.l2)+.001,l.l1+l.l2-.001);dir.normalize();target.copy(l.hip).addScaledVector(dir,d);
    const along=(l.l1*l.l1-l.l2*l.l2+d*d)/(2*d),off=Math.sqrt(Math.max(0,l.l1*l.l1-along*along));let pole=l.insect?V(l.side,.7,0):V(l.side*.22,.05,l.poleZ);pole.addScaledVector(dir,-pole.dot(dir)).normalize();const knee=l.hip.clone().addScaledVector(dir,along).addScaledVector(pole,off);l.knee.copy(knee);
    this.link(l.upper,l.hip,knee,l.width*(l.insect?1:1.2));this.link(l.lower,knee,target,l.width*.72);l.joint.position.copy(knee);l.paw.position.copy(target);l.paw.rotation.x=l.arm?.4:0;
   }
   const blink=pose?1:((t%5.2)>5.06?.18:1);for(const eye of this.eyes)eye.scale.y=.083*s.eyes*blink;
   this.glow.emissiveIntensity=s.glow*(1.5+(pose?0:Math.sin(t*2)*.12));this.root.updateMatrixWorld(true);
  }
  setDebug(mode){
   if(!['lit','albedo','normal','roughness','metalness','ao','wire'].includes(mode))throw Error('Unknown material view.');this.debug=mode;
   if(this.debugMaterials){for(const m of this.debugMaterials){m.dispose();this.materials.delete(m);}}this.debugMaterials=new Set();
   // Keep originals for export; debug materials belong to this engine and are disposed on rebuild.
   this.root.traverse(o=>{if(!o.isMesh)return;if(!o._cwOriginal)o._cwOriginal=o.material;const src=o._cwOriginal;if(mode==='lit'){o.material=src;return;}
    let m;if(mode==='wire'){m=new T.MeshBasicMaterial({color:0xa8d8cd,wireframe:true});}
    else if(mode==='normal'){m=new T.ShaderMaterial({side:T.DoubleSide,vertexShader:'varying vec3 N;void main(){N=normalize(normalMatrix*normal);gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',fragmentShader:'varying vec3 N;void main(){gl_FragColor=vec4(normalize(N)*.5+.5,1.);}'});}
    else if(mode==='albedo'){m=new T.MeshBasicMaterial({color:src.color,map:src.map,side:T.DoubleSide});}
    else {const tex=mode==='roughness'?src.roughnessMap:mode==='metalness'?src.metalnessMap:src.aoMap;const val=mode==='roughness'?src.roughness:mode==='metalness'?src.metalness:1;m=new T.MeshBasicMaterial({color:new T.Color().setRGB(val??1,val??1,val??1),map:tex||null,side:T.DoubleSide});}
    m.toneMapped=false;this.materials.add(m);this.debugMaterials.add(m);o.material=m;
   });
  }
  measure(){let triangles=0,meshes=0,vertices=0;this.root.traverse(o=>{if(o.isMesh){meshes++;vertices+=o.geometry.attributes.position.count;triangles+=(o.geometry.index?o.geometry.index.count:o.geometry.attributes.position.count)/3;}});return {meshes,vertices,triangles:Math.round(triangles),joints:this.limbs.length*3+this.tails.length+this.wings.length+2};}
  getBounds(){this.root.updateMatrixWorld(true);return new T.Box3().setFromObject(this.root);}
  serialize(){return {format:'creatureworks',version:1,generator:'CreatureWorks '+VERSION,settings:{...this.settings}};}
  exportObject(){const materials=[];this.root.traverse(o=>{if(o.isMesh){materials.push([o,o.material]);o.material=o._cwOriginal||o.material;}});try{const data=this.root.toJSON();return data;}finally{materials.forEach(([o,m])=>o.material=m);}}
  exportOBJ(){
   this.root.updateMatrixWorld(true);const lines=['# CreatureWorks 1.0 • static current pose • metres','# Material maps and animation are not included in OBJ.'];let offset=1;const normalMatrix=new T.Matrix3();
   this.root.traverse(o=>{if(!o.isMesh)return;const g=o.geometry,p=g.attributes.position,n=g.attributes.normal,uv=g.attributes.uv;lines.push('o '+o.name.replace(/[^a-z0-9_-]/gi,'_'));normalMatrix.getNormalMatrix(o.matrixWorld);
    for(let i=0;i<p.count;i++){const v=V().fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);lines.push(`v ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}`);}
    for(let i=0;i<p.count;i++)lines.push(`vt ${(uv?.getX(i)||0).toFixed(6)} ${(uv?.getY(i)||0).toFixed(6)}`);
    for(let i=0;i<p.count;i++){const v=n?V().fromBufferAttribute(n,i).applyMatrix3(normalMatrix).normalize():V(0,1,0);lines.push(`vn ${v.x.toFixed(6)} ${v.y.toFixed(6)} ${v.z.toFixed(6)}`);}
    const count=g.index?g.index.count:p.count,negative=o.matrixWorld.determinant()<0;for(let i=0;i<count;i+=3){let a=g.index?g.index.getX(i):i,b=g.index?g.index.getX(i+1):i+1,c=g.index?g.index.getX(i+2):i+2;if(negative)[b,c]=[c,b];lines.push('f '+[a,b,c].map(k=>`${offset+k}/${offset+k}/${offset+k}`).join(' '));}offset+=p.count;
   });return lines.join('\n');
  }
  dispose(){if(this.disposed)return;this.release();this.root.removeFromParent();this.disposed=true;}
 };
}

/** Component-style entry point for Worldworks. */
function create(context, settings={}) {
 if(!context?.THREE)throw Error('Pass the host THREE namespace in context.THREE.');
 const Engine=createCreatureEngine(context.THREE);
 return new Engine({scene:context.scene,settings,sampleHeight:context.sampleHeight??null});
}


export {createCreatureEngine,create,validateSettings};
