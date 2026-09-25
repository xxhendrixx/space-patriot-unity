/* Generated from the user's spellworks.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
import * as THREE from 'three';
const TAU = Math.PI * 2;
const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
const rand = (a=0,b=1) => a + Math.random() * (b-a);
const lerp = (a,b,t) => a+(b-a)*t;
const PRESETS = [
 {id:'arcane',name:'Arcane Helix',tag:'AETHER / GUIDED',sub:'BRAIDED AETHER / GUIDED PROJECTILE',primary:'#9870ff',secondary:'#46d9ff',core:'#f0e4ff',icon:'M12 2 21 12 12 22 3 12Z M12 6 17 12 12 18 7 12Z M12 2v20M3 12h18',description:'Braided aether filaments, orbiting sigils, and an iridescent pressure wave. Refined chaos.',speed:7,size:.46,density:1.15,trail:1.65,turbulence:.7,rate:1.25,trajectory:'helix',kind:0,gravity:-.06,spread:.65,impact:1.25},
 {id:'fire',name:'Inferno Ember',tag:'FIRE / COMBUSTION',sub:'TURBULENT PLASMA / INCENDIARY BOLT',primary:'#ff651c',secondary:'#ffb733',core:'#fff0bc',icon:'M13 2c1 5-4 6-3 10 2-1 4-3 4-5 6 5 7 9 3 13-4 4-11 1-11-4 0-4 3-5 4-8 M12 14c-4 4-2 7 1 7s5-4 2-6',description:'A churning plasma envelope sheds hot cinders and rolling smoke. Impacts leave a smoldering, ember-laced blast.',speed:6.3,size:.63,density:1.35,trail:1.8,turbulence:1.15,rate:1.4,trajectory:'arc',kind:4,gravity:.3,spread:.9,impact:1.6},
 {id:'frost',name:'Glacial Shard',tag:'ICE / CRYSTALLINE',sub:'FRACTAL CRYSTAL / FREEZING IMPACT',primary:'#69cdff',secondary:'#d2f9ff',core:'#ffffff',icon:'M12 2v20M3.3 7l17.4 10M3.3 17 20.7 7M8 4l4 3 4-3M8 20l4-3 4 3M3 11l4-2-1-5M21 13l-4 2 1 5M3 13l4 2-1 5M21 11l-4-2 1-5',description:'Faceted ice needles cut through cold vapor. A brittle impact throws crystalline splinters and a ring of rising frost.',speed:9.2,size:.48,density:.9,trail:1.7,turbulence:.35,rate:1.15,trajectory:'straight',kind:3,gravity:1.7,spread:.6,impact:1.3},
 {id:'storm',name:'Storm Lance',tag:'STORM / IONIZED',sub:'BRANCHING LIGHTNING / IONIZED ARC',primary:'#889bff',secondary:'#82e9ff',core:'#effbff',icon:'M13 1 4 14h7l-1 9 10-14h-7Z M4 4l-2 3M21 18l-2 3',description:'A volatile charge wrapped in branching lightning. Electrical forks stitch the air between origin and impact.',speed:12,size:.35,density:1.1,trail:.8,turbulence:1.1,rate:1.35,trajectory:'serpent',kind:1,gravity:.4,spread:1.1,impact:1.15},
 {id:'void',name:'Event Horizon',tag:'VOID / GRAVITIC',sub:'GRAVITATIONAL SINGULARITY / COLLAPSE',primary:'#9c51ee',secondary:'#f357ca',core:'#f0b8ff',icon:'M20 6a10 10 0 1 0 0 12 M22 12H10 M17 7l-5 5 5 5 M2 12h3',description:'A dark singularity with an incandescent accretion halo. Motes fall inward before a violet collapse wave expands outward.',speed:4.8,size:.72,density:1.3,trail:2.5,turbulence:.5,rate:1.8,trajectory:'helix',kind:0,gravity:-.1,spread:1,impact:1.8},
 {id:'venom',name:'Venom Wisp',tag:'TOXIN / VOLATILE',sub:'CORROSIVE ECTOPLASM / TOXIC BLOOM',primary:'#9bf04f',secondary:'#28d5af',core:'#f0ffd1',icon:'M12 2C9 7 4 10 4 15a8 8 0 0 0 16 0C20 10 15 7 12 2Z M9 13v1M15 13v1M9 17c2 2 4 2 6 0',description:'Serpentine ectoplasm trails suspended droplets and sickly vapor. Impacts erupt into a rolling, corrosive spore cloud.',speed:5.3,size:.58,density:1.25,trail:2.3,turbulence:1.3,rate:1.6,trajectory:'serpent',kind:0,gravity:.5,spread:.9,impact:1.55},
 {id:'solar',name:'Solar Verdict',tag:'LIGHT / RADIANT',sub:'STELLAR FIRE / RADIANT JUDGMENT',primary:'#ffc65a',secondary:'#ff8d52',core:'#fffbe1',icon:'M12 1v3M12 20v3M1 12h3M20 12h3M4 4l2 2M18 18l2 2M4 20l2-2M18 6l2-2 M12 6a6 6 0 1 0 0 12 6 6 0 0 0 0-12Z',description:'A miniature sun bound by rotating golden orbits. A radiant detonation scatters starbursts across the arena.',speed:7.2,size:.58,density:1.15,trail:1.6,turbulence:.45,rate:1.5,trajectory:'arc',kind:5,gravity:-.2,spread:.7,impact:1.5},
 {id:'astral',name:'Astral Comet',tag:'COSMOS / CELESTIAL',sub:'STARDUST FILAMENTS / CELESTIAL COMET',primary:'#5acaff',secondary:'#ed95fa',core:'#eefbff',icon:'m12 7 2 5 5 2-5 2-2 5-2-5-5-2 5-2Z M14 3l7 7M18 2l4 4M17 7l4 4M2 3v4M0 5h4',description:'A pearlescent comet trailing a constellation of twinkling stars. Twin pastel ribbons unfurl into a celestial bloom.',speed:6.3,size:.51,density:1.35,trail:2.8,turbulence:.55,rate:1.5,trajectory:'helix',kind:5,gravity:-.07,spread:.8,impact:1.4}
];
const DEFAULT = {preset:'arcane',mode:'volley',speed:7,size:.46,density:1.15,trail:1.65,turbulence:.7,rate:1.25,trajectory:'helix',bloom:1.0,exposure:1.05,timeScale:1,fog:.032,impact:1.25,quality:'high',auto:true,ambient:true,shockwaves:true,shake:false,sound:false,cinematic:false,primary:'#9870ff',secondary:'#46d9ff',core:'#f0e4ff'};
const NOISE_GLSL = `
float hash31(vec3 p){p=fract(p*.1031);p+=dot(p,p.yzx+33.33);return fract((p.x+p.y)*p.z);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(mix(hash31(i),hash31(i+vec3(1,0,0)),f.x),mix(hash31(i+vec3(0,1,0)),hash31(i+vec3(1,1,0)),f.x),f.y),mix(mix(hash31(i+vec3(0,0,1)),hash31(i+vec3(1,0,1)),f.x),mix(hash31(i+vec3(0,1,1)),hash31(i+vec3(1,1,1)),f.x),f.y),f.z);}
float fbm(vec3 p){float n=0.;n+=.5*noise3(p);p=p*2.03+9.1;n+=.25*noise3(p);p=p*2.01+13.7;n+=.125*noise3(p);return n;}
`;
const QUAD_VERTEX=`varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}`;
const PARTICLE_VERTEX=`
attribute vec3 aOrigin;attribute vec3 aVelocity;attribute vec3 aColor;attribute vec4 aLife;attribute vec4 aStyle;
uniform float uTime;uniform float uTurbulence;uniform vec2 uWind;uniform float uGround;
varying vec2 vUv;varying vec3 vColor;varying float vAlpha;varying float vType;varying float vSeed;varying float vAge;
void main(){
 float age=uTime-aLife.x;float progress=clamp(age/max(.01,aLife.y),0.,1.);float live=step(0.,age)*(1.-step(aLife.y,age));age=max(0.,age);
 float drag=max(.001,aStyle.z);float movement=(1.-exp(-drag*age))/drag;vec3 p=aOrigin+aVelocity*movement;
 p.y-=.5*aStyle.y*age*age;p.xz+=uWind*age;
 float amplitude=min(age,.65)*uTurbulence;
 p+=vec3(sin(p.y*2.2+age*2.7+aLife.w*25.),cos(p.z*2.7+age*2.3+aLife.w*16.)*.65,sin(p.x*2.1-age*2.5+aLife.w*29.))*amplitude*.32;
 p.y=max(uGround,p.y);vec4 mv=modelViewMatrix*vec4(p,1.);
 float size=aLife.z*mix(.72,1.35,progress);float t=aStyle.x;
 if(t>1.5&&t<2.5)size*=mix(.6,3.4,progress);else size*=pow(1.-progress,.35);
 vec2 q=position.xy;float angle=aLife.w*6.28318+age*aStyle.w;
 if(t>.5&&t<1.5){vec3 vv=(viewMatrix*vec4(aVelocity,0.)).xyz;angle=atan(vv.y,vv.x)-1.5708;q.y*=3.8;}
 mat2 rotation=mat2(cos(angle),sin(angle),-sin(angle),cos(angle));q=rotation*q;
 mv.xy+=q*size*live;gl_Position=projectionMatrix*mv;
 vUv=uv;vColor=aColor;vAlpha=live*min(age*18.+.2,1.)*pow(1.-progress,1.35);vType=t;vSeed=aLife.w;vAge=age;
}`;
const PARTICLE_FRAGMENT=`
uniform float uTime;varying vec2 vUv;varying vec3 vColor;varying float vAlpha;varying float vType;varying float vSeed;varying float vAge;
${NOISE_GLSL}
void main(){
 vec2 p=vUv*2.-1.;float r=length(p);float alpha=0.;float hot=0.;
 if(vType<.5){alpha=exp(-r*r*5.5)*(1.-smoothstep(.7,1.,r));hot=exp(-r*r*34.);}
 else if(vType<1.5){alpha=exp(-p.x*p.x*22.)*pow(max(0.,1.-abs(p.y)),.8);hot=exp(-p.x*p.x*95.)*.4;}
 else if(vType<2.5){float n=fbm(vec3(p*3.+vSeed*20.,vAge*.4));alpha=(1.-smoothstep(.15,1.,r))*smoothstep(.08,.68,n)*.33;}
 else if(vType<3.5){float diamond=abs(p.x)+abs(p.y);float shape=1.-smoothstep(.68,.85,diamond);float line=1.-smoothstep(.015,.07,min(abs(p.x),abs(p.y)));alpha=shape*(.22+line*.78);hot=shape*line*.4;}
 else if(vType<4.5){float n=fbm(vec3(p*3.,vAge*1.9+vSeed*10.));float body=length(vec2(p.x*(1.15+.3*p.y),p.y+.15));alpha=(1.-smoothstep(.2,.98,body+n*.28))*smoothstep(.06,.55,n);hot=pow(max(0.,1.-body*1.7),2.);}
 else {float cross1=pow(max(0.,1.-abs(p.x)),24.)*pow(max(0.,1.-abs(p.y)),2.);float cross2=pow(max(0.,1.-abs(p.y)),24.)*pow(max(0.,1.-abs(p.x)),2.);alpha=max(cross1,cross2)+exp(-r*r*35.);alpha*=.65+.35*sin(vAge*8.+vSeed*30.);hot=exp(-r*r*60.);}
 alpha*=vAlpha;if(alpha<.003)discard;
 vec3 col=vColor;if(vType<1.5||vType>2.5)col+=vColor*hot*.12;
 gl_FragColor=vec4(col,alpha);
}`;
class ParticlePool {
 constructor(scene,capacity,smoke=false,groundY=0){
  this.capacity=capacity;this.cursor=0;this.high=0;this.dirtyStart=capacity;this.dirtyEnd=0;this.wrapped=false;this.spawned=0;
  const base=new THREE.PlaneGeometry(1,1);this.geometry=new THREE.InstancedBufferGeometry();this.geometry.index=base.index.clone();this.geometry.setAttribute('position',base.attributes.position.clone());this.geometry.setAttribute('uv',base.attributes.uv.clone());base.dispose();
  this.arrays={aOrigin:new Float32Array(capacity*3),aVelocity:new Float32Array(capacity*3),aColor:new Float32Array(capacity*3),aLife:new Float32Array(capacity*4),aStyle:new Float32Array(capacity*4)};
  this.expiry=new Float32Array(capacity);this.expiry.fill(-1);for(let i=0;i<capacity;i++){this.arrays.aLife[i*4]=-1000;this.arrays.aLife[i*4+1]=.01;}
  for(const[name,a]of Object.entries(this.arrays))this.geometry.setAttribute(name,new THREE.InstancedBufferAttribute(a,name==='aLife'||name==='aStyle'?4:3).setUsage(THREE.DynamicDrawUsage));
  this.geometry.instanceCount=0;
  this.material=new THREE.ShaderMaterial({vertexShader:PARTICLE_VERTEX,fragmentShader:PARTICLE_FRAGMENT,uniforms:{uTime:{value:0},uTurbulence:{value:.7},uWind:{value:new THREE.Vector2(.07,.035)},uGround:{value:groundY}},transparent:true,depthWrite:false,blending:smoke?THREE.NormalBlending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=smoke?3:6;scene.add(this.mesh);
 }
 emit(t,p,v,color,life,size,type=0,gravity=0,drag=1,spin=0){
  const i=this.cursor,j=i*3,k=i*4,a=this.arrays;
  a.aOrigin[j]=p.x;a.aOrigin[j+1]=p.y;a.aOrigin[j+2]=p.z;
  a.aVelocity[j]=v.x;a.aVelocity[j+1]=v.y;a.aVelocity[j+2]=v.z;
  a.aColor[j]=color.r;a.aColor[j+1]=color.g;a.aColor[j+2]=color.b;
  a.aLife[k]=t;a.aLife[k+1]=life;a.aLife[k+2]=size;a.aLife[k+3]=Math.random();
  a.aStyle[k]=type;a.aStyle[k+1]=gravity;a.aStyle[k+2]=drag;a.aStyle[k+3]=spin;
  this.expiry[i]=t+life;this.dirtyStart=Math.min(this.dirtyStart,i);this.dirtyEnd=Math.max(this.dirtyEnd,i+1);this.cursor=(i+1)%this.capacity;this.high=Math.max(this.high,i+1);if(this.cursor===0)this.wrapped=true;this.spawned++;
 }
 update(t,turbulence){
  this.material.uniforms.uTime.value=t;this.material.uniforms.uTurbulence.value=turbulence;
  if(this.dirtyEnd){for(const[name,attr]of Object.entries(this.geometry.attributes)){if(!name.startsWith('a'))continue;attr.clearUpdateRanges();const start=this.wrapped?0:this.dirtyStart,end=this.wrapped?this.capacity:this.dirtyEnd;attr.addUpdateRange(start*attr.itemSize,(end-start)*attr.itemSize);attr.needsUpdate=true;}this.geometry.instanceCount=this.high;this.dirtyStart=this.capacity;this.dirtyEnd=0;this.wrapped=false;}
 }
 active(t){let n=0;for(let i=0;i<this.high;i++)if(this.expiry[i]>t)n++;return n;}
 clear(){this.expiry.fill(-1);this.high=0;this.cursor=0;this.geometry.instanceCount=0;this.dirtyStart=this.capacity;this.dirtyEnd=0;this.wrapped=false;}
 dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
// -------------------- Energy surfaces & geometry --------------------
const ENERGY_VERTEX=`
uniform float uTime;uniform float uRoughness;varying vec3 vLocal;varying vec3 vNormal;varying vec3 vView;
${NOISE_GLSL}
void main(){vLocal=position;float displacement=(fbm(position*4.+vec3(0.,uTime*1.3,0.))-.35)*uRoughness;vec3 p=position+normal*displacement;vec4 mv=modelViewMatrix*vec4(p,1.);vNormal=normalize(normalMatrix*normal);vView=-mv.xyz;gl_Position=projectionMatrix*mv;}`;
const ENERGY_FRAGMENT=`
uniform float uTime;uniform vec3 uColor;uniform vec3 uSecondary;uniform float uOpacity;uniform float uVoid;varying vec3 vLocal;varying vec3 vNormal;varying vec3 vView;
${NOISE_GLSL}
void main(){float facing=clamp(dot(normalize(vNormal),normalize(vView)),0.,1.);float fresnel=pow(1.-facing,2.2);vec3 q=normalize(vLocal);float n=fbm(q*5.+vec3(0.,-uTime*1.7,uTime*.4));float longitude=atan(q.z,q.x);float stripes=pow(.5+.5*sin(longitude*6.+q.y*14.-uTime*7.+n*12.),7.);float edge=fresnel*(.7+1.4*n);float energy=edge+stripes*.6+n*.15;vec3 color=mix(uColor,uSecondary,clamp(n+q.y*.25,0.,1.));float alpha=clamp(energy,0.,1.)*uOpacity;if(uVoid>.5){alpha*=fresnel;energy*=1.3;}gl_FragColor=vec4(color*(1.3+energy*1.4),alpha);}`;
const RIBBON_FRAGMENT=`
uniform vec3 uColor;uniform vec3 uSecondary;uniform float uOpacity;uniform float uTime;varying vec2 vUv;
void main(){float edge=pow(max(0.,1.-abs(vUv.y*2.-1.)),1.6);float taper=pow(max(0.,1.-vUv.x),.75);float weave=.7+.3*sin(vUv.x*60.-uTime*18.);float hot=pow(max(0.,1.-abs(vUv.y*2.-1.)),12.);vec3 c=mix(uColor,uSecondary,vUv.x);gl_FragColor=vec4(c*(1.25+hot*1.2),edge*taper*weave*uOpacity);}`;
const MESH_UV_VERTEX=`varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const RING_FRAGMENT=`
uniform float uTime;uniform float uProgress;uniform vec3 uColor;uniform float uOpacity;uniform float uStyle;varying vec2 vUv;
${NOISE_GLSL}
void main(){vec2 p=vUv*2.-1.;float r=length(p);float a=atan(p.y,p.x);float n=noise3(vec3(p*12.,uTime));float ring=exp(-pow((r-.73)*45.,2.));float ring2=exp(-pow((r-.84)*100.,2.))*.45;float inner=exp(-pow((r-.7)*13.,2.))*.22;float rays=pow(.5+.5*sin(a*36.+sin(a*7.)*2.),16.)*smoothstep(.1,.6,r)*(1.-smoothstep(.6,.97,r))*.22;float dissolve=smoothstep(.02,.28,1.-uProgress);float alpha=(ring+ring2+inner+rays)*( .7+n*.4)*uOpacity*dissolve;gl_FragColor=vec4(uColor*1.9,alpha);}`;
const FLASH_FRAGMENT=`uniform vec3 uColor;uniform float uOpacity;varying vec2 vUv;void main(){vec2 p=vUv*2.-1.;float r=length(p);float center=exp(-r*r*20.);float glow=exp(-r*r*5.)*.25;float star=(exp(-abs(p.x)*100.)*exp(-abs(p.y)*4.)+exp(-abs(p.y)*100.)*exp(-abs(p.x)*4.))*.8;gl_FragColor=vec4(uColor*2.2+vec3(center),clamp(center+glow+star,0.,1.)*uOpacity);}`;
function energyMaterial(color,secondary,rough=.15){return new THREE.ShaderMaterial({vertexShader:ENERGY_VERTEX,fragmentShader:ENERGY_FRAGMENT,uniforms:{uTime:{value:0},uRoughness:{value:rough},uColor:{value:color.clone()},uSecondary:{value:secondary.clone()},uOpacity:{value:.75},uVoid:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.FrontSide});}
function glowMaterial(color,opacity=1){return new THREE.MeshBasicMaterial({color,transparent:true,opacity,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});}
class Ribbon {
 constructor(scene,samples=56){
  this.samples=samples;this.positions=new Float32Array(samples*6);this.points=Array.from({length:samples},()=>new THREE.Vector3());const uv=new Float32Array(samples*4),indices=[];
  for(let i=0;i<samples;i++){uv[i*4]=uv[i*4+2]=i/(samples-1);uv[i*4+1]=0;uv[i*4+3]=1;if(i<samples-1){const k=i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}}
  this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));this.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));this.geometry.setIndex(indices);
  this.material=new THREE.ShaderMaterial({vertexShader:MESH_UV_VERTEX,fragmentShader:RIBBON_FRAGMENT,uniforms:{uColor:{value:new THREE.Color()},uSecondary:{value:new THREE.Color()},uOpacity:{value:1},uTime:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.visible=false;this.mesh.renderOrder=5;scene.add(this.mesh);this.tangent=new THREE.Vector3();this.view=new THREE.Vector3();this.side=new THREE.Vector3();
 }
 update(camera,width,time,opacity=1){
  const p=this.positions;
  for(let i=0;i<this.samples;i++){
   const point=this.points[i];this.tangent.subVectors(this.points[Math.max(0,i-1)],this.points[Math.min(this.samples-1,i+1)]);if(this.tangent.lengthSq()<1e-8)this.tangent.set(1,0,0);this.view.subVectors(camera.position,point);this.side.crossVectors(this.tangent,this.view).normalize();
   const w=width*Math.pow(1-i/this.samples,.6);this.side.multiplyScalar(w);const k=i*6;p[k]=point.x-this.side.x;p[k+1]=point.y-this.side.y;p[k+2]=point.z-this.side.z;p[k+3]=point.x+this.side.x;p[k+4]=point.y+this.side.y;p[k+5]=point.z+this.side.z;
  }
  this.geometry.attributes.position.needsUpdate=true;this.material.uniforms.uTime.value=time;this.material.uniforms.uOpacity.value=opacity;this.mesh.visible=opacity>.005;
 }
 color(a,b){this.material.uniforms.uColor.value.copy(a);this.material.uniforms.uSecondary.value.copy(b);}
 dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
class Lightning {
 constructor(scene){
  this.capacity=220;this.positions=new Float32Array(this.capacity*18);const uv=new Float32Array(this.capacity*12);for(let i=0;i<this.capacity;i++)uv.set([0,0,0,1,1,0,0,1,1,1,1,0],i*12);
  this.geometry=new THREE.BufferGeometry();this.geometry.setAttribute('position',new THREE.BufferAttribute(this.positions,3).setUsage(THREE.DynamicDrawUsage));this.geometry.setAttribute('uv',new THREE.BufferAttribute(uv,2));
  this.material=new THREE.ShaderMaterial({vertexShader:MESH_UV_VERTEX,fragmentShader:`varying vec2 vUv;uniform vec3 uColor;uniform float uOpacity;void main(){float d=abs(vUv.y*2.-1.);float glow=exp(-d*d*5.);float core=exp(-d*d*75.);gl_FragColor=vec4(uColor*(1.7+core*2.)+vec3(core),glow*uOpacity);}`,uniforms:{uColor:{value:new THREE.Color()},uOpacity:{value:1}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  this.mesh=new THREE.Mesh(this.geometry,this.material);this.mesh.frustumCulled=false;this.mesh.renderOrder=7;this.mesh.visible=false;scene.add(this.mesh);this.active=false;this.time=0;this.refresh=0;this.segments=[];this.side=new THREE.Vector3();this.tmp=new THREE.Vector3();
 }
 start(a,b,color,lifetime=.18,beam=false){this.a=a.clone();this.b=b.clone();this.material.uniforms.uColor.value.copy(color);this.lifetime=lifetime;this.time=0;this.active=true;this.beam=beam;this.refresh=0;this.mesh.visible=true;}
 regenerate(){
  this.segments.length=0;const count=this.beam?38:22,dir=this.b.clone().sub(this.a),length=dir.length(),tangent=dir.clone().normalize(),axis=new THREE.Vector3(0,1,0);if(Math.abs(tangent.dot(axis))>.95)axis.set(1,0,0);const u=new THREE.Vector3().crossVectors(tangent,axis).normalize(),v=new THREE.Vector3().crossVectors(tangent,u).normalize();
  let prev=this.a.clone();const points=[prev];
  for(let i=1;i<=count;i++){const t=i/count,amp=Math.sin(t*Math.PI)*(this.beam?.21:.48),p=this.a.clone().addScaledVector(dir,t).addScaledVector(u,rand(-amp,amp)).addScaledVector(v,rand(-amp,amp));this.segments.push([prev,p,1]);points.push(p);prev=p;}
  const branches=this.beam?7:4;
  for(let b=0;b<branches;b++){const idx=Math.floor(rand(2,count-3)),start=points[idx],aim=start.clone().addScaledVector(tangent,rand(.3,1.5)).addScaledVector(u,rand(-1.4,1.4)).addScaledVector(v,rand(-1.1,1.1));let p=start;
   for(let j=1;j<=6;j++){const q=start.clone().lerp(aim,j/6).addScaledVector(u,rand(-.15,.15)).addScaledVector(v,rand(-.15,.15));this.segments.push([p,q,(1-j/8)*.55]);p=q;}
  }
 }
 update(dt,camera){
  if(!this.active)return;this.time+=dt;if(this.time>=this.lifetime){this.mesh.visible=false;this.active=false;return;}this.refresh-=dt;if(this.refresh<=0){this.regenerate();this.refresh=this.beam?.065:.055;}
  let n=0;for(const[a,b,w]of this.segments){this.tmp.subVectors(b,a);this.side.subVectors(camera.position,a).cross(this.tmp).normalize().multiplyScalar((this.beam?.095:.065)*w);const s=this.side;this.positions.set([a.x-s.x,a.y-s.y,a.z-s.z,a.x+s.x,a.y+s.y,a.z+s.z,b.x-s.x,b.y-s.y,b.z-s.z,a.x+s.x,a.y+s.y,a.z+s.z,b.x+s.x,b.y+s.y,b.z+s.z,b.x-s.x,b.y-s.y,b.z-s.z],n*18);n++;if(n>=this.capacity)break;}
  this.geometry.setDrawRange(0,n*6);this.geometry.attributes.position.needsUpdate=true;const fade=1-this.time/this.lifetime;this.material.uniforms.uOpacity.value=this.beam?Math.min(1,fade*5):fade;
 }
 dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
class DebrisPool {
 constructor(scene,capacity=220,groundY=0){
  this.groundY=groundY;
  this.capacity=capacity;this.cursor=0;this.items=[];this.dummy=new THREE.Object3D();this.geometry=new THREE.OctahedronGeometry(1,0);this.material=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.24,metalness:.55,emissive:0x1b2737,emissiveIntensity:.9});this.mesh=new THREE.InstancedMesh(this.geometry,this.material,capacity);this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);this.mesh.frustumCulled=false;this.mesh.count=capacity;scene.add(this.mesh);for(let i=0;i<capacity;i++){this.dummy.scale.setScalar(0);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);}this.mesh.instanceMatrix.needsUpdate=true;
 }
 emit(t,p,color,ice=false){const i=this.cursor++%this.capacity;this.items[i]={birth:t,life:rand(1,2.4),origin:p.clone(),velocity:new THREE.Vector3(rand(-4,4),rand(1,6),rand(-4,4)),size:ice?rand(.07,.15):rand(.04,.1),ice,spin:rand(-7,7)};this.mesh.setColorAt(i,color);this.mesh.instanceColor.needsUpdate=true;}
 update(t){let changed=false;for(let i=0;i<this.items.length;i++){const a=this.items[i];if(!a)continue;const age=t-a.birth,f=1-age/a.life;if(f<=0){this.dummy.scale.setScalar(0);this.items[i]=null;}else{this.dummy.position.copy(a.origin).addScaledVector(a.velocity,age);this.dummy.position.y-=3.5*age*age;this.dummy.position.y=Math.max(this.groundY+.015,this.dummy.position.y);this.dummy.rotation.set(age*a.spin,age*a.spin*.7,age*1.8);const s=a.size*Math.min(1,f*4);this.dummy.scale.set(s,s*(a.ice?3.8:1.2),s);}
 this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);changed=true;}if(changed)this.mesh.instanceMatrix.needsUpdate=true;}
 clear(){this.items=[];for(let i=0;i<this.capacity;i++){this.dummy.scale.setScalar(0);this.dummy.updateMatrix();this.mesh.setMatrixAt(i,this.dummy.matrix);}this.mesh.instanceMatrix.needsUpdate=true;}
 dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
// Three.js objects are allocated once per projectile slot and recycled after use.
class ProjectileSlot {
 constructor(engine){
  this.engine=engine;this.active=false;this.group=new THREE.Group();engine.root.add(this.group);
  this.coreMaterial=new THREE.MeshBasicMaterial({color:0xffffff});this.core=new THREE.Mesh(engine.sphereGeometry,this.coreMaterial);this.group.add(this.core);
  this.shellMaterial=energyMaterial(new THREE.Color(),new THREE.Color());this.shell=new THREE.Mesh(engine.sphereGeometry,this.shellMaterial);this.group.add(this.shell);
  this.haloMaterial=glowMaterial(0xffffff,.7);this.halo1=new THREE.Mesh(engine.torusGeometry,this.haloMaterial);this.halo2=new THREE.Mesh(engine.torusGeometry,this.haloMaterial);this.group.add(this.halo1,this.halo2);this.halo2.rotation.x=1.2;
  this.ribbons=[new Ribbon(engine.root),new Ribbon(engine.root),new Ribbon(engine.root)];this.group.visible=false;this.position=new THREE.Vector3();this.previous=new THREE.Vector3();this.sample=new THREE.Vector3();this.emitRemainder=0;
 }
 launch(from,to,preset,settings,phase=0,seed=null){
  this.active=true;this.age=0;this.hit=false;this.from=from.clone();this.to=to.clone();this.preset=preset;this.settings={...settings};this.phase=phase;this.seed=seed??rand(0,TAU);this.distance=from.distanceTo(to);this.duration=Math.max(.3,this.distance/settings.speed);this.axis=to.clone().sub(from).normalize();this.u=new THREE.Vector3().crossVectors(this.axis,new THREE.Vector3(0,1,0)).normalize();if(this.u.lengthSq()<.1)this.u.set(1,0,0);this.v=new THREE.Vector3().crossVectors(this.u,this.axis).normalize();
  this.colors={primary:new THREE.Color(settings.primary).multiplyScalar(1.8),secondary:new THREE.Color(settings.secondary).multiplyScalar(1.8),core:new THREE.Color(settings.core).multiplyScalar(2.5)};
  this.group.visible=true;this.emitRemainder=0;
  this.core.geometry=preset.id==='frost'?this.engine.crystalGeometry:this.engine.sphereGeometry;
  this.coreMaterial.color.copy(preset.id==='void'?new THREE.Color('#05020b'):this.colors.core);
  this.shellMaterial.uniforms.uColor.value.copy(this.colors.primary);this.shellMaterial.uniforms.uSecondary.value.copy(this.colors.secondary);this.shellMaterial.uniforms.uVoid.value=preset.id==='void'?1:0;this.shellMaterial.uniforms.uRoughness.value=preset.id==='fire'?.45:.13;
  this.haloMaterial.color.copy(this.colors.secondary);this.ribbons.forEach(r=>r.color(this.colors.primary,this.colors.secondary));this.path(0,this.position);this.previous.copy(this.position);this.group.position.copy(this.position);
 }
 path(t,out,strand=0){
  t=clamp(t,0,1);out.copy(this.from).lerp(this.to,t);const wave=Math.sin(t*Math.PI);const trajectory=this.settings.trajectory;
  if(trajectory==='arc')out.y+=wave*(1.8+Math.sin(this.phase)*.55);
  else if(trajectory==='helix'){const a=t*TAU*1.7+this.phase,r=wave*(.62+this.settings.turbulence*.23);out.addScaledVector(this.u,Math.cos(a)*r);out.addScaledVector(this.v,Math.sin(a)*r*.8);out.y+=wave*.65;}
  else if(trajectory==='serpent'){out.addScaledVector(this.u,Math.sin(t*TAU*1.4+this.phase)*wave*1.25);out.y+=Math.sin(t*TAU*1.8+this.phase)*wave*.45+wave*.45;}
  if(this.phase&&trajectory!=='helix')out.addScaledVector(this.u,Math.sin(this.phase)*wave*1.4).addScaledVector(this.v,Math.cos(this.phase)*wave*.65);
  if(strand){const a=t*TAU*4.+strand*TAU/3.+this.seed,r=.16+this.settings.size*.18;out.addScaledVector(this.u,Math.cos(a)*r*wave).addScaledVector(this.v,Math.sin(a)*r*wave);}
  return out;
 }
 update(dt,time,camera){
  if(!this.active)return;this.age+=dt;const progress=this.age/this.duration,remaining=this.age-this.duration;
  if(remaining>.6){this.active=false;this.group.visible=false;this.ribbons.forEach(r=>r.mesh.visible=false);return;}
  this.previous.copy(this.position);this.path(progress,this.position);this.group.position.copy(this.position);
  const s=this.settings.size,pulse=1+Math.sin(time*17+this.seed)*.035;
  this.core.scale.setScalar(s*.55*pulse);this.shell.scale.setScalar(s*1.3*pulse);
  if(this.preset.id==='frost'){this.core.scale.set(s*.52,s*1.8,s*.52);this.core.rotation.z=-Math.PI/2;this.core.rotation.x=time*2.7;this.shell.scale.set(s*.8,s*.8,s*.8);}
  this.shellMaterial.uniforms.uTime.value=time;
  const halo=this.preset.id==='arcane'||this.preset.id==='void'||this.preset.id==='solar';this.halo1.visible=this.halo2.visible=halo;this.halo1.scale.setScalar(s*1.7);this.halo2.scale.setScalar(s*1.3);this.halo1.rotation.set(time*1.3,time*.8,this.seed);this.halo2.rotation.set(time*-.9,0,time*1.4);
  const ribbonFade=Math.max(0,1-Math.max(0,remaining)/.6);const ribbonCount=(this.preset.id==='arcane'||this.preset.id==='astral')?3:2;
  for(let r=0;r<this.ribbons.length;r++){
   const ribbon=this.ribbons[r];if(r>=ribbonCount){ribbon.mesh.visible=false;continue;}
   for(let i=0;i<ribbon.samples;i++){const history=i/(ribbon.samples-1)*Math.min(.88,this.settings.trail*.4);this.path(progress-history,ribbon.points[i],r+1);}
   ribbon.update(camera,s*(this.preset.id==='fire'?.24:.13),time,ribbonFade*(this.preset.id==='frost'?.55:.9));
  }
  if(!this.hit){
   this.emitTrail(dt,time);
   if(this.preset.id==='storm'&&Math.random()<dt*12)this.engine.lightning(this.previous,this.position.clone().add(new THREE.Vector3(rand(-1,1),rand(-.8,.8),rand(-1,1))),this.colors.secondary,.14);
  }
  if(progress>=1&&!this.hit){this.hit=true;this.group.visible=false;this.engine.impact(this.to,this.preset,this.settings,this.colors);}
 }
 emitTrail(dt,time){
  const e=this.engine,s=this.settings,p=this.preset,c=this.colors,density=e.settings.density*(e.settings.quality==='ultra'?1.45:e.settings.quality==='balanced'?.6:1);
  this.emitRemainder+=dt*250*density;const count=Math.min(100,Math.floor(this.emitRemainder));this.emitRemainder-=count;
  for(let i=0;i<count;i++){
   const fraction=Math.random(),pos=e.tmpPos.copy(this.previous).lerp(this.position,fraction),a=rand(0,TAU),radius=rand(0,s.size*.65);pos.addScaledVector(this.u,Math.cos(a)*radius).addScaledVector(this.v,Math.sin(a)*radius);
   e.tmpVel.set(rand(-.7,.7),rand(-.6,.8),rand(-.7,.7)).addScaledVector(this.axis,-rand(.4,1.8));
   const hot=Math.random()<.17,color=hot?c.core:Math.random()<.4?c.secondary:c.primary;
   let type=p.kind,size=rand(.025,.085),life=rand(.4,s.trail);
   if(p.id==='fire'){size=rand(.15,.42);type=Math.random()<.24?1:4;e.tmpVel.y+=.65;}
   if(p.id==='frost'){size=rand(.045,.13);e.tmpVel.y-=.15;}
   if(p.id==='void'){e.tmpVel.multiplyScalar(-.35);size=rand(.035,.13);life*=1.3;}
   if(p.id==='venom'){size=rand(.08,.23);e.tmpVel.y+=.3;}
   e.particles.emit(time,pos,e.tmpVel,color,life,size,type,p.gravity,1.2,rand(-2,2));
   if(i%6===0){e.tmpVel.set(rand(-.2,.2),rand(.15,.55),rand(-.2,.2));const smokeColor=e.smokeColor.copy(c.primary).multiplyScalar(p.id==='fire'?.055:.09);e.smoke.emit(time,pos,e.tmpVel,smokeColor,rand(1.3,2.3),s.size*.8,2,-.08,.7,rand(-.5,.5));}
  }
 }
 dispose(){this.group.removeFromParent();this.coreMaterial.dispose();this.shellMaterial.dispose();this.haloMaterial.dispose();this.ribbons.forEach(r=>r.dispose());}
}
class ImpactSlot {
 constructor(engine){
  this.engine=engine;this.active=false;this.group=new THREE.Group();engine.root.add(this.group);
  this.ringMaterial=new THREE.ShaderMaterial({vertexShader:MESH_UV_VERTEX,fragmentShader:RING_FRAGMENT,uniforms:{uTime:{value:0},uProgress:{value:0},uColor:{value:new THREE.Color()},uOpacity:{value:1},uStyle:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});
  this.ring=new THREE.Mesh(engine.planeGeometry,this.ringMaterial);this.ring.rotation.x=-Math.PI/2;this.ring.renderOrder=4;this.group.add(this.ring);
  this.sphereMaterial=energyMaterial(new THREE.Color(),new THREE.Color(),.05);this.sphere=new THREE.Mesh(engine.sphereGeometry,this.sphereMaterial);this.group.add(this.sphere);
  this.flashMaterial=new THREE.ShaderMaterial({vertexShader:MESH_UV_VERTEX,fragmentShader:FLASH_FRAGMENT,uniforms:{uColor:{value:new THREE.Color()},uOpacity:{value:1}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending});this.flash=new THREE.Mesh(engine.planeGeometry,this.flashMaterial);this.flash.renderOrder=8;this.group.add(this.flash);
  this.decalMaterial=new THREE.MeshBasicMaterial({map:engine.runeTexture,color:0xffffff,transparent:true,opacity:.4,depthWrite:false,blending:THREE.AdditiveBlending,side:THREE.DoubleSide});this.decal=new THREE.Mesh(engine.planeGeometry,this.decalMaterial);this.decal.rotation.x=-Math.PI/2;this.decal.renderOrder=2;this.group.add(this.decal);this.group.visible=false;
 }
 start(pos,preset,settings,colors){this.active=true;this.age=0;this.preset=preset;this.settings={...settings};this.pos=pos.clone();this.group.position.copy(pos);this.group.visible=true;this.energy=settings.impact;this.ring.position.y=this.engine.groundY+.015-pos.y;this.decal.position.y=this.engine.groundY+.005-pos.y;this.ringMaterial.uniforms.uColor.value.copy(colors.primary);this.sphereMaterial.uniforms.uColor.value.copy(colors.primary);this.sphereMaterial.uniforms.uSecondary.value.copy(colors.secondary);this.flashMaterial.uniforms.uColor.value.copy(colors.core);this.decalMaterial.color.copy(colors.secondary);this.decal.rotation.z=rand(0,TAU);}
 update(dt,time,camera){
  if(!this.active)return;this.age+=dt;const a=this.age;if(a>3){this.active=false;this.group.visible=false;return;}
  const progress=clamp(a/1.3,0,1),energy=this.energy;const size=(.2+Math.pow(progress,.65)*4.3)*energy;
  this.ring.visible=this.engine.settings.shockwaves&&a<1.3;this.ring.scale.setScalar(size*2);this.ringMaterial.uniforms.uProgress.value=progress;this.ringMaterial.uniforms.uTime.value=time;this.ringMaterial.uniforms.uOpacity.value=Math.pow(1-progress,1.6)*.85;
  this.sphere.visible=this.engine.settings.shockwaves&&a<.8;this.sphere.scale.setScalar((.1+a*3.6)*Math.sqrt(energy));this.sphereMaterial.uniforms.uTime.value=time;this.sphereMaterial.uniforms.uOpacity.value=Math.pow(Math.max(0,1-a/.8),2)*.28;
  this.flash.quaternion.copy(camera.quaternion);this.flash.scale.setScalar((1.2+a*7)*Math.sqrt(energy));this.flashMaterial.uniforms.uOpacity.value=Math.pow(Math.max(0,1-a/.35),2.5);this.flash.visible=a<.35;
  const decalSize=(2.2+Math.min(a,.4)*4)*Math.sqrt(energy);this.decal.scale.setScalar(decalSize);this.decalMaterial.opacity=Math.max(0,1-a/3)*.2;
 }
 dispose(){this.group.removeFromParent();this.ringMaterial.dispose();this.sphereMaterial.dispose();this.flashMaterial.dispose();this.decalMaterial.dispose();}
}
// -------------------- Reusable particle & projectile engine --------------------
class MagicEngine {
 constructor({scene,camera,settings={},origin,target,runeTexture,groundY=0}={}){
  if(!THREE)throw new Error('Three.js must be loaded before creating MagicEngine.');if(!scene||!camera)throw new Error('MagicEngine requires a Three.js scene and camera.');
  const initialPreset=PRESETS.find(p=>p.id===settings.preset)||PRESETS[0],initialDefaults={...DEFAULT};for(const k of ['speed','size','density','trail','turbulence','rate','trajectory','impact','primary','secondary','core'])initialDefaults[k]=initialPreset[k];for(const[k,v]of Object.entries(initialDefaults))if(settings[k]===undefined)settings[k]=v;
  this.scene=scene;this.camera=camera;this.settings=settings;this.groundY=groundY;this.root=new THREE.Group();this.root.name='Spellworks Effects';scene.add(this.root);
  this.origin=origin?.clone()||new THREE.Vector3(-5,2.2,1);this.target=target?.clone()||new THREE.Vector3(5,2.1,-1);
  this.time=0;this.totalCasts=0;this.totalImpacts=0;this.impactPulse=0;this.ambientRemainder=0;this.nextId=1;
  this.sphereGeometry=new THREE.SphereGeometry(1,24,16);this.crystalGeometry=new THREE.OctahedronGeometry(1,0);this.torusGeometry=new THREE.TorusGeometry(1,.014,5,60);this.planeGeometry=new THREE.PlaneGeometry(1,1);
  this.ownsTexture=!runeTexture;this.runeTexture=runeTexture||createRuneTexture();
  this.particles=new ParticlePool(this.root,24000,false,groundY);this.smoke=new ParticlePool(this.root,2800,true,groundY);this.debris=new DebrisPool(this.root,220,groundY);
  this.projectiles=Array.from({length:8},()=>new ProjectileSlot(this));this.impacts=Array.from({length:12},()=>new ImpactSlot(this));this.arcs=Array.from({length:10},()=>new Lightning(this.root));this.beams=[];
  this.lights=Array.from({length:4},()=>{const l=new THREE.PointLight(0xffffff,0,8,2);this.root.add(l);return l;});
  this.tmpPos=new THREE.Vector3();this.tmpVel=new THREE.Vector3();this.smokeColor=new THREE.Color();this.colors={primary:new THREE.Color(),secondary:new THREE.Color(),core:new THREE.Color()};this.refreshColors();this.disposed=false;
 }
 refreshColors(){for(const k of ['primary','secondary','core'])this.colors[k].set(this.settings[k]).multiplyScalar(k==='core'?2.5:1.8);}
 getPreset(id=this.settings.preset){return PRESETS.find(p=>p.id===id)||PRESETS[0];}
 acquireProjectile(){let p=this.projectiles.find(p=>!p.active);if(!p&&this.projectiles.length<32){p=new ProjectileSlot(this);this.projectiles.push(p);}return p;}
 launch(a,b,preset,settings,phase=0){const slot=this.acquireProjectile();if(!slot)return null;slot.launch(a,b,preset,settings,phase);slot.id=this.nextId++;return slot.id;}
 cast({mode=this.settings.mode,origin=this.origin,target=this.target,preset=this.settings.preset}={}){
  if(this.disposed)throw new Error('Engine has been disposed');
  const asVector=(v)=>{if(v?.isVector3)return v.clone();if(Array.isArray(v)&&v.length===3&&v.every(Number.isFinite))return new THREE.Vector3(...v);if(v&&[v.x,v.y,v.z].every(Number.isFinite))return new THREE.Vector3(v.x,v.y,v.z);throw new TypeError('Positions must be Vector3, [x,y,z], or {x,y,z}.');};
  const from=asVector(origin),to=asVector(target),p=this.getPreset(preset),s={...this.settings};
  if(preset!==this.settings.preset)for(const k of ['speed','size','density','trail','turbulence','rate','trajectory','impact','primary','secondary','core'])s[k]=p[k];
  const colors={primary:new THREE.Color(s.primary).multiplyScalar(1.8),secondary:new THREE.Color(s.secondary).multiplyScalar(1.8),core:new THREE.Color(s.core).multiplyScalar(2.5)};
  let ids=[];this.totalCasts++;
  if(mode==='beam'){
   if(this.beams.length>=4)return [];
   const arc=this.lightning(from,to,colors.primary,.85,true);if(arc){this.beams.push({from,to,age:0,life:.85,preset:p,settings:s,colors,arc,emit:0});ids=[this.nextId++];}
  }else if(mode==='nova'){
   const center=to.clone();this.impact(center,p,{...s,impact:s.impact*1.1},colors);
   for(let i=0;i<12;i++){const angle=i/12*TAU,end=center.clone().add(new THREE.Vector3(Math.cos(angle)*5,rand(-.9,.2),Math.sin(angle)*5));end.y=Math.max(.3,end.y);const id=this.launch(center,end,p,{...s,size:s.size*.58,speed:s.speed*.8,impact:s.impact*.45,trajectory:'arc'},angle);if(id)ids.push(id);}
  }else{
   const n=mode==='volley'?5:1;for(let i=0;i<n;i++){const phase=n===1?0:(i/n*TAU+.2),id=this.launch(from,to,p,{...s,size:s.size*(n===1?1:.7)},phase);if(id)ids.push(id);}
  }
  for(let i=0;i<50;i++){const angle=rand(0,TAU),r=rand(.15,.85);this.tmpPos.copy(from).add(new THREE.Vector3(Math.cos(angle)*r,rand(-.7,.7),Math.sin(angle)*r));this.tmpVel.subVectors(from,this.tmpPos).multiplyScalar(2.2);this.particles.emit(this.time,this.tmpPos,this.tmpVel,colors.secondary,rand(.2,.6),rand(.02,.07),p.kind===4?0:p.kind,0,1.5);}
  return ids;
 }
 lightning(a,b,color,life=.18,beam=false){const arc=this.arcs.find(x=>!x.active);if(!arc)return null;arc.start(a,b,color,life,beam);return arc;}
 impact(pos,preset=this.getPreset(),settings=this.settings,colors=this.colors){
  this.totalImpacts++;this.impactPulse=Math.max(this.impactPulse,settings.impact);let slot=this.impacts.find(s=>!s.active);if(!slot)slot=this.impacts.reduce((a,b)=>a.age>b.age?a:b);slot.start(pos,preset,settings,colors);
  const density=this.settings.density*(this.settings.quality==='balanced'?.6:1),energy=settings.impact,count=Math.floor((170+energy*90)*density);
  for(let i=0;i<count;i++){
   const dir=this.tmpVel.set(rand(-1,1),rand(-.55,1),rand(-1,1)).normalize().multiplyScalar(rand(.7,5.5)*Math.sqrt(energy));this.tmpPos.copy(pos).addScaledVector(dir,rand(0,.035));let kind=i%3===0?1:preset.kind;
   let size=rand(.025,.105);if(preset.id==='fire'&&kind===4)size=rand(.12,.4);if(preset.id==='venom')size=rand(.075,.18);if(preset.id==='frost')size=rand(.05,.14);
   const c=i%6===0?colors.core:i%2?colors.primary:colors.secondary;this.particles.emit(this.time,this.tmpPos,dir,c,rand(.55,2.2),size,kind,preset.id==='void'?-.1:1.2,rand(.4,1.7),rand(-4,4));
  }
  const smokeCount=Math.floor((preset.id==='fire'||preset.id==='venom'?38:18)*density);
  for(let i=0;i<smokeCount;i++){this.tmpPos.copy(pos).add(new THREE.Vector3(rand(-.2,.2),rand(-.2,.2),rand(-.2,.2)));this.tmpVel.set(rand(-1,1),rand(.15,1.2),rand(-1,1));this.smokeColor.copy(colors.primary).multiplyScalar(preset.id==='fire'?.045:.08);this.smoke.emit(this.time,this.tmpPos,this.tmpVel,this.smokeColor,rand(1.7,3.1),rand(.4,.85)*Math.sqrt(energy),2,-.12,.65,rand(-.5,.5));}
  if(preset.id==='frost'||preset.id==='fire')for(let i=0;i<(preset.id==='frost'?28:14);i++)this.debris.emit(this.time,pos,colors.secondary.clone().multiplyScalar(.6),preset.id==='frost');
  if(preset.id==='storm')for(let i=0;i<5;i++){const angle=i/5*TAU,to=pos.clone().add(new THREE.Vector3(Math.cos(angle)*3,-pos.y+this.groundY+.045,Math.sin(angle)*3));this.lightning(pos,to,colors.secondary,.22);}
  if(preset.id==='void'){
   // Inward motes contrast with the outward impact flash.
   for(let i=0;i<75;i++){this.tmpPos.set(rand(-1,1),rand(-.4,1),rand(-1,1)).normalize().multiplyScalar(rand(1.5,3)).add(pos);this.tmpVel.subVectors(pos,this.tmpPos).multiplyScalar(2.4);this.particles.emit(this.time,this.tmpPos,this.tmpVel,colors.secondary,.7,rand(.04,.09),0,0,.1);}
  }
  this.onImpact?.({position:pos.clone(),preset:preset.id,energy});
 }
 update(dt){
  if(this.disposed)return;dt=clamp(dt,0,.1);this.time+=dt;const t=this.time;this.impactPulse*=Math.exp(-dt*9);
  this.ambientRemainder+=dt*90*this.settings.density*(this.settings.ambient?1:0);const n=Math.floor(this.ambientRemainder);this.ambientRemainder-=n;
  for(let i=0;i<n;i++){const a=t*2.3+i*.22,r=rand(.7,1.15);this.tmpPos.copy(this.origin).add(new THREE.Vector3(Math.cos(a)*r,Math.sin(a*1.7)*.55,Math.sin(a)*r));this.tmpVel.set(-Math.sin(a)*.65,rand(.2,.55),Math.cos(a)*.65);this.particles.emit(t,this.tmpPos,this.tmpVel,i%3?this.colors.primary:this.colors.secondary,rand(.7,1.6),rand(.025,.065),i%5===0?5:0,-.05,.8);}
  for(const p of this.projectiles)p.update(dt,t,this.camera);
  for(let i=this.beams.length-1;i>=0;i--){const b=this.beams[i];b.age+=dt;if(b.age>=b.life){this.impact(b.to,b.preset,b.settings,b.colors);this.beams.splice(i,1);continue;}
   b.emit+=dt*300*this.settings.density;const count=Math.floor(b.emit);b.emit-=count;for(let j=0;j<count;j++){const fraction=Math.random();this.tmpPos.copy(b.from).lerp(b.to,fraction).add(new THREE.Vector3(rand(-.08,.08),rand(-.08,.08),rand(-.08,.08)));this.tmpVel.set(rand(-.6,.6),rand(-.2,1),rand(-.6,.6));this.particles.emit(t,this.tmpPos,this.tmpVel,j%3?b.colors.primary:b.colors.secondary,rand(.4,1.2),rand(.03,.09),b.preset.kind,.2,1);}
  }
  for(const a of this.arcs)a.update(dt,this.camera);for(const i of this.impacts)i.update(dt,t,this.camera);this.debris.update(t);this.particles.update(t,this.settings.turbulence);this.smoke.update(t,this.settings.turbulence*.5);
  const active=this.projectiles.filter(p=>p.active&&!p.hit);for(let i=0;i<this.lights.length;i++){const light=this.lights[i];if(active[i]){light.position.copy(active[i].position);light.color.copy(active[i].colors.primary).multiplyScalar(.55);light.intensity=7+active[i].settings.size*10;}else light.intensity=0;}
 }
 getStats(){return {time:this.time,particles:this.particles.active(this.time)+this.smoke.active(this.time),projectiles:this.projectiles.filter(p=>p.active&&!p.hit).length,beams:this.beams.length,impacts:this.impacts.filter(s=>s.active).length,totalCasts:this.totalCasts,totalImpacts:this.totalImpacts,capacity:26800};}
 clear(){this.particles.clear();this.smoke.clear();this.debris.clear();this.beams.length=0;for(const p of this.projectiles){p.active=false;p.group.visible=false;p.ribbons.forEach(r=>r.mesh.visible=false);}for(const i of this.impacts){i.active=false;i.group.visible=false;}for(const a of this.arcs){a.active=false;a.mesh.visible=false;}this.lights.forEach(l=>l.intensity=0);this.impactPulse=0;}
 dispose(){if(this.disposed)return;this.clear();this.particles.dispose();this.smoke.dispose();this.debris.dispose();this.projectiles.forEach(p=>p.dispose());this.impacts.forEach(i=>i.dispose());this.arcs.forEach(a=>a.dispose());this.sphereGeometry.dispose();this.crystalGeometry.dispose();this.torusGeometry.dispose();this.planeGeometry.dispose();if(this.ownsTexture)this.runeTexture.dispose();this.root.removeFromParent();this.disposed=true;}
}
// -------------------- Procedural observatory --------------------
function createRuneTexture(){
 const canvas=document.createElement('canvas');canvas.width=canvas.height=1024;const ctx=canvas.getContext('2d');const c=512;ctx.translate(c,c);ctx.strokeStyle='#e6e1ff';ctx.fillStyle='#e6e1ff';ctx.lineWidth=1.8;
 const circle=r=>{ctx.beginPath();ctx.arc(0,0,r,0,TAU);ctx.stroke();};[462,450,410,396,310,303,197,191].forEach(circle);
 for(let i=0;i<96;i++){const a=i/96*TAU;ctx.save();ctx.rotate(a);ctx.beginPath();ctx.moveTo(450,0);ctx.lineTo(i%4===0?431:441,0);ctx.stroke();ctx.restore();}
 for(let i=0;i<48;i++){
  ctx.save();ctx.rotate(i/48*TAU);ctx.translate(426,0);ctx.rotate(Math.PI/2);ctx.lineWidth=2.3;
  ctx.beginPath();ctx.moveTo(0,-9);ctx.lineTo(0,9);ctx.moveTo(-6,-5);ctx.lineTo(0,-9);ctx.lineTo(6,-5);
  if(i%2===0){ctx.moveTo(0,-1);ctx.lineTo(6,3);ctx.lineTo(0,7);}if(i%3===0){ctx.moveTo(-6,4);ctx.lineTo(0,0);}if(i%5===0){ctx.moveTo(-4,9);ctx.lineTo(4,9);}ctx.stroke();ctx.restore();
 }
 for(let j=0;j<2;j++){ctx.save();ctx.rotate(j*Math.PI);ctx.beginPath();for(let i=0;i<4;i++){const a=i/3*TAU-Math.PI/2;const x=Math.cos(a)*300,y=Math.sin(a)*300;if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();ctx.restore();}
 for(let i=0;i<12;i++){ctx.save();ctx.rotate(i/12*TAU);ctx.translate(351,0);ctx.beginPath();ctx.moveTo(-9,0);ctx.lineTo(0,-11);ctx.lineTo(9,0);ctx.lineTo(0,11);ctx.closePath();ctx.stroke();ctx.beginPath();ctx.arc(0,0,2.5,0,TAU);ctx.fill();ctx.restore();}
 circle(90);ctx.lineWidth=1;for(let i=0;i<8;i++){ctx.save();ctx.rotate(i/8*TAU);ctx.beginPath();ctx.moveTo(108,0);ctx.lineTo(174,0);ctx.moveTo(153,-7);ctx.lineTo(168,0);ctx.lineTo(153,7);ctx.stroke();ctx.restore();}
 const texture=new THREE.CanvasTexture(canvas);texture.anisotropy=4;return texture;
}
export {MagicEngine,ParticlePool,PRESETS};
