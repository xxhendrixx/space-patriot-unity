/* Generated from the user's weatherworks.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
const VERSION='1.0.0';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=(a,b,x)=>{let t=clamp((x-a)/(b-a),0,1);return t*t*(3-2*t);};
function rng(seed=190926){return()=>{let t=seed+=0x6D2B79F5;t=Math.imul(t^t>>>15,t|1);t^=t+Math.imul(t^t>>>7,t|61);return((t^t>>>14)>>>0)/4294967296;};}
const hash=(x,z)=>{let n=Math.imul(x,374761393)^Math.imul(z,668265263);n=Math.imul(n^(n>>>13),1274126177);return ((n^(n>>>16))>>>0)/4294967295;};
function noise(x,z){let i=Math.floor(x),j=Math.floor(z),u=smooth(0,1,x-i),v=smooth(0,1,z-j);return lerp(lerp(hash(i,j),hash(i+1,j),u),lerp(hash(i,j+1),hash(i+1,j+1),u),v);}
function fbm(x,z){let n=0,a=.57;for(let i=0;i<4;i++){n+=a*noise(x,z);x=x*2.03+3.1;z=z*2.03-5.3;a*=.47;}return n;}
const LIMITS={rain:[0,1],snow:[0,1],fog:[0,1],coverage:[0,1],cloudDensity:[.2,2],cloudBase:[45,170],wind:[0,35],windDirection:[0,360],gust:[0,1],lightning:[0,1],hour:[0,24],temperature:[-25,40],exposure:[.4,2],particleSize:[.5,2],timeScale:[0,3],transition:[0,20],dust:[0,1]};
const DEFAULTS={rain:.45,snow:0,fog:.085,coverage:.66,cloudDensity:1.1,cloudBase:86,wind:9,windDirection:240,gust:.4,lightning:.2,hour:16.4,temperature:12,exposure:1.1,particleSize:1,timeScale:1,transition:5,dust:0,quality:'balanced',dayCycle:false,fronts:false,skyFlash:false};
const p=(name,sub,icon,settings)=>({name,sub,icon,settings:{...DEFAULTS,...settings}});
const PRESETS={
 shower:p('Passing shower','Rain across the highlands','rain',{rain:.45,coverage:.66}),
 clear:p('High pressure','Clear sky · gentle breeze','sun',{rain:0,fog:.035,coverage:.24,wind:3,gust:.16,lightning:0,hour:13.5,temperature:22}),
 overcast:p('Overcast','A low, unbroken cloud ceiling','cloud',{rain:0,coverage:.94,cloudDensity:1.4,fog:.19,wind:6,lightning:0,hour:12,temperature:13}),
 storm:p('Thunderstorm','Heavy rain · turbulent gusts','bolt',{rain:1,coverage:.98,cloudDensity:1.8,fog:.3,wind:23,gust:.9,lightning:1,hour:16.6,temperature:10}),
 snow:p('First snowfall','Soft flakes · accumulating snow','snow',{rain:0,snow:.8,coverage:.76,fog:.16,wind:3,gust:.2,lightning:0,hour:11,temperature:-7}),
 blizzard:p('Whiteout','Driving snow · low visibility','wind',{rain:0,snow:1,coverage:1,cloudDensity:1.7,fog:.83,wind:30,gust:1,lightning:0,hour:13,temperature:-18}),
 mist:p('Valley mist','Ground fog · quiet air','fog',{rain:0,coverage:.32,cloudDensity:.7,fog:.75,wind:1,gust:.1,lightning:0,hour:7.4,temperature:7}),
 sunset:p('Golden hour','Warm light through broken clouds','sunset',{rain:0,coverage:.44,fog:.065,wind:4,gust:.25,lightning:0,hour:17.55,temperature:18}),
 night:p('Midnight','Moonlight · a sky full of stars','moon',{rain:0,coverage:.19,fog:.055,wind:3,gust:.2,lightning:0,hour:0.8,temperature:5}),
 dust:p('Dust front','Airborne grit · amber atmosphere','dust',{rain:0,dust:.88,coverage:.25,fog:.52,wind:26,gust:.9,lightning:0,hour:15,temperature:32})
};
function validateSettings(patch,base=DEFAULTS){if(!patch||typeof patch!=='object'||Array.isArray(patch))throw Error('Settings must be an object.');let out={...base};for(const [k,v] of Object.entries(patch)){if(Object.hasOwn(LIMITS,k)){if(typeof v!=='number'||!Number.isFinite(v))throw Error(k+' must be a finite number.');out[k]=clamp(v,...LIMITS[k]);}else if(['dayCycle','fronts','skyFlash'].includes(k)){if(typeof v!=='boolean')throw Error(k+' must be true or false.');out[k]=v;}else if(k==='quality'){if(!['balanced','high','ultra'].includes(v))throw Error('Unknown quality.');out[k]=v;}else throw Error('Unknown weather setting: '+k);}return out;}
const M={
 identity:()=>new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]),
 perspective(fov,aspect,near,far){let f=1/Math.tan(fov*.5),nf=1/(near-far);return new Float32Array([f/aspect,0,0,0,0,f,0,0,0,0,(far+near)*nf,-1,0,0,2*far*near*nf,0]);},
 normalize(v){let n=Math.hypot(...v)||1;return v.map(x=>x/n);},
 cross(a,b){return[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]];},
 lookAt(eye,at,up=[0,1,0]){let z=M.normalize(eye.map((v,i)=>v-at[i])),x=M.normalize(M.cross(up,z)),y=M.cross(z,x);return new Float32Array([x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-x.reduce((s,v,i)=>s+v*eye[i],0),-y.reduce((s,v,i)=>s+v*eye[i],0),-z.reduce((s,v,i)=>s+v*eye[i],0),1]);}
};
function meshData(){return{position:[],normal:[],color:[],uv:[],index:[]};}
function tri(g,a,b,c,col=[.3,.4,.3],uvs=[[0,0],[1,0],[.5,1]]){let n=M.normalize(M.cross(b.map((x,i)=>x-a[i]),c.map((x,i)=>x-a[i]))),k=g.position.length/3;for(let i=0;i<3;i++){g.position.push(...[a,b,c][i]);g.normal.push(...n);g.color.push(...col);g.uv.push(...uvs[i]);}g.index.push(k,k+1,k+2);}
function quad(g,a,b,c,d,col){tri(g,a,b,c,col,[[0,0],[1,0],[1,1]]);tri(g,a,c,d,col,[[0,0],[1,1],[0,1]]);}
function box(g,x,y,z,w,h,d,col){let X=x+w/2,x0=x-w/2,Y=y+h,Z=z+d/2,z0=z-d/2;quad(g,[x0,y,Z],[X,y,Z],[X,Y,Z],[x0,Y,Z],col);quad(g,[X,y,z0],[x0,y,z0],[x0,Y,z0],[X,Y,z0],col);quad(g,[X,y,Z],[X,y,z0],[X,Y,z0],[X,Y,Z],col);quad(g,[x0,y,z0],[x0,y,Z],[x0,Y,Z],[x0,Y,z0],col);quad(g,[x0,Y,Z],[X,Y,Z],[X,Y,z0],[x0,Y,z0],col);quad(g,[x0,y,z0],[X,y,z0],[X,y,Z],[x0,y,Z],col);}
function cylinder(g,x,y,z,r,h,col,sides=10,rTop=r){for(let i=0;i<sides;i++){let a=i/sides*Math.PI*2,b=(i+1)/sides*Math.PI*2,A=[x+Math.cos(a)*r,y,z+Math.sin(a)*r],B=[x+Math.cos(b)*r,y,z+Math.sin(b)*r],C=[x+Math.cos(b)*rTop,y+h,z+Math.sin(b)*rTop],D=[x+Math.cos(a)*rTop,y+h,z+Math.sin(a)*rTop];quad(g,A,D,C,B,col);if(rTop>0)tri(g,[x,y+h,z],C,D,col);}}
function finalize(g){let a={};for(let k of ['position','normal','color','uv'])if(g[k]?.length)a[k]={data:new Float32Array(g[k]),size:k==='uv'?2:3};return {attributes:a,index:new Uint32Array(g.index)};}
function planeGeometry(){return{attributes:{position:{size:3,data:new Float32Array([-.5,-.5,0,.5,-.5,0,.5,.5,0,-.5,.5,0])},uv:{size:2,data:new Float32Array([0,0,1,0,1,1,0,1])}},index:new Uint32Array([0,1,2,0,2,3])};}
const GLSL_COMMON=`
uniform float uTime,uRain,uSnow,uSnowCover,uWetness,uFog,uCoverage,uCloudDensity,uCloudBase,uWind,uGust,uHour,uDay,uFlash,uExposure,uDust;
uniform vec3 uWindVector,uSunDirection,uSunColor,uFogColor,uZenith,uCamera;
uniform vec4 uGroundBounds;
uniform sampler2D uHeightMap;
float hash12(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash12(i),hash12(i+vec2(1,0)),f.x),mix(hash12(i+vec2(0,1)),hash12(i+1.),f.x),f.y);}
float fbm2(vec2 p){float n=0.,a=.55;for(int i=0;i<4;i++){n+=a*noise2(p);p=p*2.03+vec2(3.1,-5.3);a*=.47;}return n;}
float groundAt(vec2 p){vec2 q=(p-uGroundBounds.xy)/uGroundBounds.zw;vec4 c=texture2D(uHeightMap,clamp(q,vec2(.001),vec2(.999)));return (c.r*255.*256.+c.g*255.)/65535.*512.-128.;}
vec3 film(vec3 c){c=max(vec3(0),c*uExposure);c=(c*(2.51*c+.03))/(c*(2.43*c+.59)+.14);return pow(clamp(c,0.,1.),vec3(1./2.2));}
float fogAmount(vec3 p){float d=length(p-uCamera);float density=.00045+uFog*.008+uDust*.009;float low=exp(-max(0.,(p.y+uCamera.y)*.5)*.026);return clamp(1.-exp(-d*density*(.32+low*2.)),0.,.985);}
vec3 fogged(vec3 c,vec3 p){return mix(c,uFogColor*(1.+uFlash*.5),fogAmount(p));}
`;
const OBJECT_VERTEX=`
attribute vec3 color;varying vec3 vWorld,vNormal,vColor;varying vec2 vUv;
void main(){vWorld=(modelMatrix*vec4(position,1.)).xyz;vNormal=normalize(mat3(modelMatrix)*normal);vColor=color;vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(vWorld,1.);}`;
const SURFACE_FRAGMENT=GLSL_COMMON+`
varying vec3 vWorld,vNormal,vColor;varying vec2 vUv;uniform float uMaterial;
void main(){vec3 n=normalize(vNormal);vec3 base=vColor;
 float grain=noise2(vWorld.xz*6.2);float large=fbm2(vWorld.xz*.047);
 float wet=uWetness;float snow=uSnowCover*smoothstep(.38,.84,n.y);
 if(uMaterial<.5){vec3 grass=mix(vec3(.085,.14,.038),vec3(.22,.265,.071),large);vec3 rock=mix(vec3(.16,.17,.145),vec3(.29,.29,.245),grain);float slope=1.-smoothstep(.55,.92,n.y);base=mix(grass,rock,clamp(slope+smoothstep(55.,110.,vWorld.y)*.6,0.,1.));base*=.84+.25*grain;float shore=1.-smoothstep(.3,2.8,vWorld.y);base=mix(base,vec3(.24,.23,.18),shore);float path=1.-smoothstep(1.1,2.8,abs(vWorld.x+29.+sin(vWorld.z*.045)*7.));path*=smoothstep(5.,16.,vWorld.z)*(1.-smoothstep(76.,98.,vWorld.z));base=mix(base,vec3(.29,.255,.20)*(.8+.2*grain),path);}
 else{base*=.87+.2*grain;}
 base*=1.-wet*.29;float snowNoise=smoothstep(.06,.52,large);base=mix(base,vec3(.76,.85,.88)*( .89+.11*grain),clamp(snow*1.55-snowNoise*.35,0.,1.));
 float sun=max(dot(n,uSunDirection),0.);float shadow=1.-uCoverage*.56;vec3 ambient=mix(vec3(.028,.052,.085),vec3(.29,.34,.38),uDay);
 vec2 groundUV=clamp((vWorld.xz-uGroundBounds.xy)/uGroundBounds.zw,vec2(.001),vec2(.999));float contact=texture2D(uHeightMap,groundUV).b;vec3 c=base*(ambient+uSunColor*sun*shadow*1.32)*(1.-contact*.68);c+=base*uFlash*.9;
 vec3 V=normalize(uCamera-vWorld),H=normalize(V+uSunDirection);float rough=mix(12.,160.,wet);float spec=pow(max(0.,dot(n,H)),rough)*wet*.65;
 float puddle=smoothstep(.57,.77,large)*smoothstep(.9,.99,n.y)*wet*(1.-snow);c+=uSunColor*(spec+puddle*pow(1.-max(0.,dot(n,V)),4.)*.28);
 if(uMaterial>1.5&&uMaterial<2.5){float fres=pow(1.-abs(dot(n,V)),4.);c=mix(base*.13,uFogColor*.8,.4+fres*.5);c+=uSunColor*pow(max(0.,dot(n,H)),100.)*.6;}
 if(uMaterial>2.5)c=base*(.5+1.1*(1.-uDay));gl_FragColor=vec4(film(fogged(c,vWorld)),1.);
}`;
const VEGETATION_VERTEX=GLSL_COMMON+`
attribute vec3 color;attribute vec4 aInstance;attribute vec2 aExtra;
varying vec3 vWorld,vNormal,vColor;varying vec2 vUv;uniform float uGrass;
void main(){float a=aExtra.x,c=cos(a),s=sin(a);vec3 p=position*aInstance.w;vec3 n=normal;
 p.xz=mat2(c,-s,s,c)*p.xz;n.xz=mat2(c,-s,s,c)*n.xz;
 float tip=uv.y;float sway=sin(uTime*(1.1+uWind*.023)+aInstance.x*.18+aInstance.z*.12)*.5+.5*sin(uTime*2.3+aExtra.y*7.);
 p.xz+=uWindVector.xz*(.0025+uGrass*.055)*tip*tip*(.65+sway*.35)*aInstance.w;
 p.xz+=vec2(sin(uTime+aExtra.y*18.),cos(uTime*1.3+aExtra.y*12.))*.035*tip*aInstance.w;
 vWorld=p+aInstance.xyz;vNormal=normalize(n);vColor=color*(.8+aExtra.y*.34);vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(vWorld,1.);}`;
const VEGETATION_FRAGMENT=GLSL_COMMON+`
varying vec3 vWorld,vNormal,vColor;varying vec2 vUv;uniform float uGrass;
void main(){vec3 n=normalize(vNormal);vec3 base=vColor*(1.-uWetness*.23);float snow=uSnowCover*clamp(n.y*.7+vUv.y*.6,0.,1.);base=mix(base,vec3(.72,.81,.83),snow*.94);float sun=max(dot(n,uSunDirection),0.)*.65+.12;float ao=.48+.52*vUv.y;vec3 light=mix(vec3(.025,.045,.072),vec3(.34,.39,.35),uDay)+uSunColor*sun*(1.-uCoverage*.65);vec3 c=base*light*ao+base*uFlash*.8;vec3 V=normalize(uCamera-vWorld);c+=vColor*pow(max(0.,dot(-V,uSunDirection)),4.)*vUv.y*uDay*.12;gl_FragColor=vec4(film(fogged(c,vWorld)),1.);}`;
const SKY_VERTEX=`varying vec3 vDir;void main(){vDir=position;vec4 p=modelViewMatrix*vec4(position,0.);gl_Position=projectionMatrix*p;gl_Position.z=gl_Position.w*.99999;}`;
const SKY_FRAGMENT=GLSL_COMMON+`
varying vec3 vDir;uniform float uCloudSteps;
float densityAt(vec3 p){vec2 q=p.xz*.008+uWindVector.xz*uTime*.0005;float h=(p.y-uCloudBase)/55.;float envelope=smoothstep(0.,.2,h)*(1.-smoothstep(.68,1.,h));float structure=fbm2(q+vec2(h*.47,h*.28));float detail=noise2(q*4.5-h*.9);return max(0.,(structure-(.79-uCoverage*.55))*(2.6+uCloudDensity)-detail*.12)*envelope;}
void main(){vec3 rd=normalize(vDir);float h=pow(max(rd.y,0.),.43);vec3 c=mix(uFogColor,uZenith,h);float sunDot=max(0.,dot(rd,uSunDirection));float warm=pow(sunDot,6.)*(1.-h)*uDay;
 c+=uSunColor*warm*.26;c+=uSunColor*pow(sunDot,900.)*2.3*(1.-uCoverage*.75);c+=uSunColor*pow(sunDot,34.)*.12;
 vec3 moon=normalize(vec3(-uSunDirection.x,max(.24,-uSunDirection.y),-uSunDirection.z));float md=max(0.,dot(rd,moon));c+=vec3(.5,.65,.9)*pow(md,2000.)*(1.-uDay)*1.6;c+=vec3(.07,.12,.22)*pow(md,70.)*(1.-uDay);
 vec2 starUV=rd.xz/(abs(rd.y)+.3)*270.;vec2 cell=floor(starUV);float seed=hash12(cell);float star=pow(max(0.,1.-length(fract(starUV)-.5)*2.4),8.);c+=vec3(.7,.82,1.)*star*step(.985,seed)*(1.-uDay)*smoothstep(0.,.22,rd.y);
 if(rd.y>.012){float t0=max(0.,(uCloudBase-uCamera.y)/rd.y);float t1=max(t0,(uCloudBase+55.-uCamera.y)/rd.y);float stepLen=min(40.,(t1-t0)/uCloudSteps);float trans=1.;vec3 accum=vec3(0.);float jitter=hash12(gl_FragCoord.xy)*.6;
  for(int i=0;i<16;i++){if(float(i)>=uCloudSteps||trans<.035)break;vec3 p=uCamera+rd*(t0+(float(i)+jitter)*stepLen);float den=densityAt(p);float alpha=1.-exp(-den*stepLen*.07);float ht=clamp((p.y-uCloudBase)/55.,0.,1.);float shade=exp(-densityAt(p+uSunDirection*24.)*2.4);vec3 cloudColor=mix(vec3(.075,.10,.135),vec3(.42,.49,.56),uDay);cloudColor*=(.32+ht*.72+shade*.36)*(1.-uRain*.28-smoothstep(.75,1.,uCoverage)*.18);cloudColor+=uSunColor*shade*.3;cloudColor+=uSunColor*pow(sunDot,14.)*shade*.34;cloudColor+=vec3(.42,.51,.7)*uFlash;accum+=cloudColor*alpha*trans;trans*=1.-alpha;}
  c=c*trans+accum;float horizonFade=1.-smoothstep(.005,.075,rd.y);c=mix(c,uFogColor,horizonFade*.75);
 }
 c=mix(c,vec3(.38,.23,.085),uDust*.62);c+=uFlash*vec3(.24,.29,.42);gl_FragColor=vec4(film(c),1.);
}`;
function skyGeometry(){const g=meshData(),n=32,m=16;for(let j=0;j<m;j++)for(let i=0;i<n;i++){let point=(a,b)=>{let th=a/n*Math.PI*2,ph=b/m*Math.PI;return[Math.sin(ph)*Math.cos(th)*500,Math.cos(ph)*500,Math.sin(ph)*Math.sin(th)*500];};quad(g,point(i,j),point(i+1,j),point(i+1,j+1),point(i,j+1),[1,1,1]);}return finalize(g);}
const WATER_FRAGMENT=GLSL_COMMON+`
varying vec3 vWorld,vNormal,vColor;varying vec2 vUv;
void main(){float t=uTime;vec2 p=vWorld.xz;float wave=sin(p.x*.38+t*.8)+sin(p.y*.49+t*.64)+sin(dot(p,vec2(.64,.43))+t*1.9)*.3;
 float chop=noise2(p*.52+vec2(t*.17,-t*.13));vec3 n=normalize(vec3((cos(p.x*.7+t*.8)*.022+(chop-.5)*.11)*(1.+uWind*.055),1.,(cos(p.y*.84+t*.64)*.021+(noise2(p*.49+10.-t*.15)-.5)*.12)*(1.+uWind*.05)));vec3 V=normalize(uCamera-vWorld);float fres=pow(1.-max(0.,dot(n,V)),3.);vec3 c=mix(vec3(.025,.085,.078),uFogColor*.67,.3+fres*.6);c*=.45+.55*uDay;
 vec3 H=normalize(V+uSunDirection);float spec=pow(max(0.,dot(n,H)),160.);c+=uSunColor*spec*1.5*(1.-uCoverage*.7);c+=uFlash*.25;
 float ground=groundAt(p);float shore=(1.-smoothstep(0.,2.3,-ground))*(.4+.6*sin(t*.9+wave));float foam=(1.-smoothstep(.12,.65,abs(ground+wave*.1)))*.16; c+=vec3(.35,.4,.34)*max(0.,foam);
 float rings=0.;vec2 cell=floor(p*.52),f=fract(p*.52);for(int x=-1;x<=1;x++)for(int y=-1;y<=1;y++){vec2 o=vec2(float(x),float(y)),seed=cell+o;float r=hash12(seed);float life=fract(uTime*(1.2+r)+r*13.);vec2 center=vec2(r,hash12(seed+33.));float d=length(f-o-center);rings+=exp(-abs(d-life*.42)*120.)*(1.-life)*step(r,uRain*.72);}
 c+=rings*.09*uDay;gl_FragColor=vec4(film(fogged(c,vWorld)),1.);
}`;
const PARTICLE_VERTEX=GLSL_COMMON+`
attribute vec4 aSeed;varying vec2 vUv;varying float vAlpha,vLife,vSeed;varying vec3 vWorld;uniform float uKind,uParticleSize;
void main(){float speed=uKind<.5?24.+aSeed.w*16.:uKind<1.5?2.1+aSeed.w*2.:.3+aSeed.w*.8;float span=150.;float tm=uTime*speed;vec3 p;
 p.x=uCamera.x+mod(aSeed.x*span+uWindVector.x*uTime*(uKind<.5?.62:.42)-uCamera.x+span*.5,span)-span*.5;
 p.z=uCamera.z+mod(aSeed.z*span+uWindVector.z*uTime*(uKind<.5?.62:.42)-uCamera.z+span*.5,span)-span*.5;
 float bottom=max(-1.,uCamera.y-60.);p.y=bottom+mod(aSeed.y*94.-tm,94.);
 if(uKind>.5){p.x+=sin(uTime*.8+aSeed.x*54.+p.y*.13)*(1.+uWind*.065);p.z+=cos(uTime*.7+aSeed.z*60.+p.y*.17)*1.3;}
 vWorld=p;float dist=length(p-uCamera);vAlpha=smoothstep(1.2,5.,dist)*(1.-smoothstep(52.,90.,dist))*smoothstep(0.,.4,p.y-max(0.,groundAt(p.xz)));vUv=uv;vSeed=aSeed.w;vLife=p.y;
 vec4 mv=modelViewMatrix*vec4(p,1.);float size=uParticleSize*(.055+aSeed.w*.045);vec2 q=position.xy;
 if(uKind<.5){vec3 vel=(modelViewMatrix*vec4(uWindVector*.62+vec3(0.,-speed,0.),0.)).xyz;vec2 tangent=normalize(vel.xy+vec2(.0001));vec2 side=vec2(-tangent.y,tangent.x);mv.xy+=side*q.x*.042*uParticleSize+tangent*q.y*(.52+aSeed.w*.75)*uParticleSize;}
 else{float spin=uTime*.35+aSeed.x*12.;q=mat2(cos(spin),-sin(spin),sin(spin),cos(spin))*q;mv.xy+=q*size*(uKind>1.5?7.:2.7);}
 gl_Position=projectionMatrix*mv;
}`;
const PARTICLE_FRAGMENT=GLSL_COMMON+`
varying vec2 vUv;varying float vAlpha,vLife,vSeed;varying vec3 vWorld;uniform float uKind;
void main(){vec2 p=vUv-.5;float a=vAlpha;vec3 c;
 if(uKind<.5){a*=pow(max(0.,1.-abs(p.x)*2.),1.8)*smoothstep(0.,.15,vUv.y)*(1.-smoothstep(.65,1.,vUv.y))*.42;c=mix(vec3(.34,.48,.62),vec3(.67,.8,.87),uDay);}
 else if(uKind<1.5){float angle=atan(p.y,p.x),r=length(p);float flake=.26+.07*cos(angle*6.);a*=(1.-smoothstep(flake-.09,flake+.08,r))*.91;c=mix(vec3(.3,.45,.62),vec3(.8,.91,1.),uDay);}
 else{a*=exp(-dot(p,p)*14.)*.13*uDust;c=vec3(.46,.29,.12);}
 if(a<.006)discard;c+=uFlash*.6;gl_FragColor=vec4(film(c),a);
}`;
const SPLASH_VERTEX=GLSL_COMMON+`
attribute vec4 aSeed;varying vec2 vUv;varying float vLife,vAlpha;uniform float uParticleSize;
void main(){vec3 p=vec3(aSeed.x*170.-85.,0.,aSeed.z*170.-85.);p.xz+=floor(uCamera.xz/35.)*35.;p.y=max(0.,groundAt(p.xz))+.035;float life=fract(uTime*(1.7+aSeed.w)+aSeed.y*31.);float sz=(.25+life*.65)*uParticleSize;vLife=life;vUv=uv;vAlpha=(1.-life)*(1.-smoothstep(52.,88.,length(p-uCamera)));p.xz+=position.xy*sz;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}`;
const SPLASH_FRAGMENT=GLSL_COMMON+`
varying vec2 vUv;varying float vLife,vAlpha;void main(){float d=length(vUv-.5);float ring=exp(-abs(d-.38)*70.);float center=exp(-d*24.)*(1.-vLife);float a=(ring*.16+center*.19)*vAlpha*uRain;if(a<.003)discard;gl_FragColor=vec4(film(mix(vec3(.15,.25,.3),vec3(.5,.62,.68),uDay)),a);}`;
const BOLT_VERTEX=`attribute vec3 aStart,aEnd;varying vec2 vUv;uniform float uBoltWidth;void main(){vec4 A=modelViewMatrix*vec4(aStart,1.),B=modelViewMatrix*vec4(aEnd,1.);vec2 dir=normalize(B.xy-A.xy+vec2(.001)),side=vec2(-dir.y,dir.x);vec4 mv=mix(A,B,uv.y);mv.xy+=side*position.x*uBoltWidth;vUv=uv;gl_Position=projectionMatrix*mv;}`;
const BOLT_FRAGMENT=`varying vec2 vUv;uniform float uBoltAlpha,uBoltGlow;void main(){float a=pow(max(0.,1.-abs(vUv.x-.5)*2.),uBoltGlow>.5?2.4:.4)*uBoltAlpha;gl_FragColor=vec4(mix(vec3(.83,.91,1.),vec3(.3,.51,1.),uBoltGlow),a);}`;
class WeatherModel{
 constructor(settings={},seed=1987){this.settings=validateSettings(settings);this.current={...this.settings};this.time=0;this.wetness=.32;this.snowCover=0;this.random=rng(seed);this.preset='shower';this.transition=null;this.frontAge=0;this.strikeAge=999;this.nextStrike=8;this.strikes=0;this.paused=false;this.onLightning=null;this.onChange=null;this.windVector=[0,0,0];this.lastFront='shower';}
 configure(patch,{instant=false}={}){let next=validateSettings(patch,this.settings);this.settings=next;if(instant||next.transition===0){this.current={...next};this.transition=null;}else this.transition={from:{...this.current},age:0,duration:next.transition};return this.getState();}
 setPreset(name,{instant=false}={}){if(!Object.hasOwn(PRESETS,name))throw Error('Unknown preset: '+name);let old=this.settings;let next={...PRESETS[name].settings,quality:old.quality,timeScale:old.timeScale,transition:old.transition,dayCycle:old.dayCycle,fronts:old.fronts,skyFlash:old.skyFlash,exposure:old.exposure,particleSize:old.particleSize};this.preset=name;this.configure(next,{instant});if(this.onChange)this.onChange(name);}
 update(dt){if(this.paused)return;dt=clamp(Number.isFinite(dt)?dt:0,0,.1)*this.settings.timeScale;this.time+=dt;this.strikeAge+=dt;this.frontAge+=dt;
 if(this.transition){let t=this.transition;t.age+=dt;let k=smooth(0,1,clamp(t.age/t.duration,0,1));for(let name of Object.keys(LIMITS)){let a=t.from[name],b=this.settings[name];if(name==='windDirection'||name==='hour'){let wrap=name==='hour'?24:360;let d=((b-a+wrap*1.5)%wrap)-wrap*.5;this.current[name]=(a+d*k+wrap)%wrap;}else this.current[name]=lerp(a,b,k);}for(let b of ['quality','dayCycle','fronts','skyFlash'])this.current[b]=this.settings[b];if(k===1)this.transition=null;}else this.current={...this.settings};
 if(this.settings.dayCycle){let h=(this.current.hour+dt*.065)%24;this.current.hour=h;this.settings.hour=h;if(this.transition)this.transition.from.hour=h;}
 let c=this.current;this.wetness=clamp(this.wetness+dt*(c.rain*.025-(1.-c.rain)*(.0015+Math.max(0,c.temperature)*.00023)),0,1);
 this.snowCover=clamp(this.snowCover+dt*(c.snow*(c.temperature<1?.014:.002)-Math.max(0,c.temperature)*.00085-c.rain*.012),0,1);
 let gust=1.+c.gust*(Math.sin(this.time*.65)*.2+Math.sin(this.time*1.71)*.13+Math.sin(this.time*.19)*.35);let a=c.windDirection*Math.PI/180;this.windVector=[Math.sin(a)*c.wind*gust,0,Math.cos(a)*c.wind*gust];
 this.nextStrike-=dt;if(this.nextStrike<=0){if(c.lightning>.05)this.requestStrike();this.nextStrike=(5.+this.random()*15.)/Math.max(.12,c.lightning);}
 if(this.settings.fronts&&this.frontAge>65){let sequence=['clear','overcast','shower','storm','mist','sunset','night','snow'];let i=sequence.indexOf(this.preset);this.frontAge=0;this.setPreset(sequence[(i+1)%sequence.length]);}
 }
 requestStrike(position=null){this.strikeAge=0;this.strikes++;this.strikePosition=position;this.pendingStrike=true;return this.strikes;}
 uniforms(camera){let c=this.current,ang=(c.hour-6)/24*Math.PI*2;let sun=M.normalize([Math.cos(ang)*.77,Math.sin(ang),-.44]);let day=smooth(-.14,.16,sun[1]);let dusk=1.-smooth(.02,.46,Math.max(0,sun[1]));let fog=[lerp(.012,lerp(.21,.54,dusk),day),lerp(.022,lerp(.31,.26,dusk),day),lerp(.045,lerp(.38,.12,dusk),day)];fog=fog.map((v,i)=>lerp(v,[.16,.205,.255][i],c.coverage*.6*day));fog=fog.map((v,i)=>lerp(v,[.38,.26,.14][i],c.dust*.7));if(c.snow>0)fog=fog.map((v,i)=>lerp(v,[.5,.58,.64][i],c.snow*.22));let zen=[lerp(.004,.035,day),lerp(.008,.14,day),lerp(.02,.25,day)];let color=[lerp(.035,1.3,day),lerp(.055,lerp(1.19,.56,dusk),day),lerp(.085,lerp(1.04,.23,dusk),day)];let stormShade=1.-c.rain*.16-smooth(.72,1.,c.coverage)*.12;fog=fog.map(v=>v*stormShade);zen=zen.map(v=>v*stormShade);color=color.map(v=>v*stormShade);let flash=c.skyFlash&&this.strikeAge<.6?Math.exp(-this.strikeAge*8.)*(.45+.55*Math.abs(Math.cos(this.strikeAge*32.))):0;
 return{uTime:this.time,uRain:c.rain,uSnow:c.snow,uSnowCover:this.snowCover,uWetness:this.wetness,uFog:c.fog,uCoverage:c.coverage,uCloudDensity:c.cloudDensity,uCloudBase:c.cloudBase,uWind:c.wind,uGust:c.gust,uHour:c.hour,uDay:day,uFlash:flash,uExposure:c.exposure,uDust:c.dust,uWindVector:this.windVector,uSunDirection:sun,uSunColor:color,uFogColor:fog,uZenith:zen,uCamera:camera,uCloudSteps:c.quality==='ultra'?16:c.quality==='high'?12:8,uParticleSize:c.particleSize};}
 getState(){return{version:VERSION,preset:this.preset,settings:{...this.settings},current:{...this.current},time:this.time,wetness:this.wetness,snowCover:this.snowCover,windVector:[...this.windVector],transition:this.transition?clamp(this.transition.age/this.transition.duration,0,1):1,strikes:this.strikes,paused:this.paused};}
 export(){return{format:'weatherworks-preset',version:1,preset:this.preset,settings:{...this.settings},surface:{wetness:this.wetness,snowCover:this.snowCover}};}
 import(data){if(!data||data.format!=='weatherworks-preset'||data.version!==1)throw Error('This is not a supported Weatherworks preset.');let next=validateSettings(data.settings);let wet=data.surface?.wetness??0,snow=data.surface?.snowCover??0;if(!Number.isFinite(wet)||!Number.isFinite(snow))throw Error('Invalid surface state.');this.configure(next,{instant:true});this.preset=Object.hasOwn(PRESETS,data.preset)?data.preset:'custom';this.wetness=clamp(wet,0,1);this.snowCover=clamp(snow,0,1);if(this.onChange)this.onChange(this.preset);}
}


const VHEADER=`uniform mat4 modelMatrix,viewMatrix,projectionMatrix;attribute vec3 position;attribute vec3 normal;attribute vec2 uv;`;
const convert=(src,fragment)=>'#version 300 es\nprecision highp float;\n'+(fragment?'out vec4 wwFragColor;\n':'')+src.replace(/\battribute\b/g,'in').replace(/\bvarying\b/g,fragment?'in':'out').replace(/\btexture2D\b/g,'texture').replace(/\bgl_FragColor\b/g,'wwFragColor');
/** Native WebGL2 backend for offline use. It is not a substitute Three.js library. */
class NativeAdapter{
 constructor(canvas){this.canvas=canvas;this.gl=canvas.getContext('webgl2',{antialias:true,alpha:false,preserveDrawingBuffer:true,powerPreference:'high-performance'});if(!this.gl)throw Error('WebGL2 is unavailable. Enable browser hardware acceleration, then reopen this file.');this.draws=[];this.textures=new Map();this.programs=new Map();this.errors=[];this.label='WebGL2 · offline';this.disposed=false;this.calls=0;this.triangles=0;}
 program(v,f){let key=v+'\n//fragment\n'+f;if(this.programs.has(key))return this.programs.get(key);let gl=this.gl;let compile=(type,src)=>{let s=gl.createShader(type);gl.shaderSource(s,src);gl.compileShader(s);if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)){let msg=gl.getShaderInfoLog(s);gl.deleteShader(s);throw Error('Shader compile error: '+msg);}return s;};let vs=compile(gl.VERTEX_SHADER,convert(VHEADER+v,false)),fs=compile(gl.FRAGMENT_SHADER,convert(f,true)),p=gl.createProgram();gl.attachShader(p,vs);gl.attachShader(p,fs);gl.linkProgram(p);gl.deleteShader(vs);gl.deleteShader(fs);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error('Shader link error: '+gl.getProgramInfoLog(p));let uniforms=[];for(let i=0;i<gl.getProgramParameter(p,gl.ACTIVE_UNIFORMS);i++){let u=gl.getActiveUniform(p,i);uniforms.push({name:u.name,type:u.type,location:gl.getUniformLocation(p,u.name)});}let entry={p,uniforms};this.programs.set(key,entry);return entry;}
 add(desc){let gl=this.gl;desc.uniforms=desc.uniforms||{};desc.visible=desc.visible!==false;let program=this.program(desc.vertex,desc.fragment),vao=gl.createVertexArray();gl.bindVertexArray(vao);let buffers={};for(let [name,a] of Object.entries(desc.geometry.attributes)){let loc=gl.getAttribLocation(program.p,name);if(loc<0)continue;let b=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferData(gl.ARRAY_BUFFER,a.data,a.dynamic?gl.DYNAMIC_DRAW:gl.STATIC_DRAW);gl.enableVertexAttribArray(loc);gl.vertexAttribPointer(loc,a.size,gl.FLOAT,false,0,0);gl.vertexAttribDivisor(loc,a.divisor||0);buffers[name]=b;}let idx=gl.createBuffer();gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER,idx);gl.bufferData(gl.ELEMENT_ARRAY_BUFFER,desc.geometry.index,gl.STATIC_DRAW);gl.bindVertexArray(null);desc._native={program,vao,buffers,idx};this.draws.push(desc);this.draws.sort((a,b)=>(a.order||0)-(b.order||0));return desc;}
 touch(desc,name){let gl=this.gl,b=desc._native.buffers[name];if(!b)return;gl.bindBuffer(gl.ARRAY_BUFFER,b);gl.bufferSubData(gl.ARRAY_BUFFER,0,desc.geometry.attributes[name].data);}
 texture(t){let gl=this.gl;let h=this.textures.get(t);if(!h){h=gl.createTexture();this.textures.set(t,h);t._nativeDirty=true;}gl.bindTexture(gl.TEXTURE_2D,h);if(t._nativeDirty){gl.pixelStorei(gl.UNPACK_ALIGNMENT,1);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,t.width,t.height,0,gl.RGBA,gl.UNSIGNED_BYTE,t.data);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);t._nativeDirty=false;}return h;}
 resize(w,h,dpr=1){let W=Math.max(1,Math.round(w*dpr)),H=Math.max(1,Math.round(h*dpr));if(this.canvas.width!==W||this.canvas.height!==H){this.canvas.width=W;this.canvas.height=H;}this.gl.viewport(0,0,W,H);}
 render(camera,common){if(this.disposed)return;let gl=this.gl;gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.disable(gl.CULL_FACE);gl.depthMask(true);gl.clearColor(.04,.06,.09,1);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);let model=M.identity();let base={...common,modelMatrix:model,viewMatrix:camera.view,projectionMatrix:camera.projection};this.calls=0;this.triangles=0;
 for(let d of this.draws){if(!d.visible||d.instances===0)continue;let r=d._native;gl.useProgram(r.program.p);gl.bindVertexArray(r.vao);if(d.depthTest===false)gl.disable(gl.DEPTH_TEST);else gl.enable(gl.DEPTH_TEST);gl.depthMask(d.depthWrite!==false);if(d.blend){gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,d.blend==='add'?gl.ONE:gl.ONE_MINUS_SRC_ALPHA);}else gl.disable(gl.BLEND);let values={...base,...d.uniforms};let unit=0;
 for(let u of r.program.uniforms){let v=values[u.name];if(v===undefined)continue;switch(u.type){case gl.FLOAT:gl.uniform1f(u.location,v);break;case gl.FLOAT_VEC2:gl.uniform2fv(u.location,v);break;case gl.FLOAT_VEC3:gl.uniform3fv(u.location,v);break;case gl.FLOAT_VEC4:gl.uniform4fv(u.location,v);break;case gl.FLOAT_MAT4:gl.uniformMatrix4fv(u.location,false,v);break;case gl.SAMPLER_2D:gl.activeTexture(gl.TEXTURE0+unit);this.texture(v);gl.uniform1i(u.location,unit++);break;case gl.INT:case gl.BOOL:gl.uniform1i(u.location,v);break;}}
 let count=d.geometry.index.length;if(d.instances!==undefined)gl.drawElementsInstanced(gl.TRIANGLES,count,gl.UNSIGNED_INT,0,d.instances);else gl.drawElements(gl.TRIANGLES,count,gl.UNSIGNED_INT,0);this.calls++;this.triangles+=count/3*(d.instances??1);
 }gl.bindVertexArray(null);gl.depthMask(true);}
 remove(d){let i=this.draws.indexOf(d);if(i>=0)this.draws.splice(i,1);let gl=this.gl,r=d._native;if(r){Object.values(r.buffers).forEach(b=>gl.deleteBuffer(b));gl.deleteBuffer(r.idx);gl.deleteVertexArray(r.vao);delete d._native;}}
 dispose(){if(this.disposed)return;this.disposed=true;for(let d of [...this.draws])this.remove(d);for(let p of this.programs.values())this.gl.deleteProgram(p.p);for(let t of this.textures.values())this.gl.deleteTexture(t);this.textures.clear();this.programs.clear();}
}
/** Uses the host's Three.js instance and scene. Does not create a renderer or RAF. */
class ThreeAdapter{
 constructor(THREE,scene){if(!THREE?.ShaderMaterial||!scene?.isScene)throw Error('Provide the host THREE namespace and Three.js scene.');this.THREE=THREE;this.scene=scene;this.draws=[];this.textures=new Map();this.label='Three.js r'+THREE.REVISION;this.disposed=false;}
 texture(t){if(!t?.data||!t.width)return t;let T=this.THREE,out=this.textures.get(t);if(!out){out=new T.DataTexture(t.data,t.width,t.height,T.RGBAFormat,T.UnsignedByteType);out.minFilter=T.NearestFilter;out.magFilter=T.NearestFilter;out.wrapS=out.wrapT=T.ClampToEdgeWrapping;out.needsUpdate=true;this.textures.set(t,out);}if(t._threeDirty){out.image.data=t.data;out.needsUpdate=true;t._threeDirty=false;}return out;}
 add(d){let T=this.THREE,inst=d.instances!==undefined,g=inst?new T.InstancedBufferGeometry():new T.BufferGeometry();for(let [name,a]of Object.entries(d.geometry.attributes)){let b=a.divisor?new T.InstancedBufferAttribute(a.data,a.size):new T.BufferAttribute(a.data,a.size);if(a.dynamic)b.setUsage(T.DynamicDrawUsage);g.setAttribute(name,b);}g.setIndex(new T.BufferAttribute(d.geometry.index,1));if(inst)g.instanceCount=d.instances;let uniforms={};for(let [key,value]of Object.entries(d.uniforms||{}))uniforms[key]={value:this.texture(value)};
 let m=new T.ShaderMaterial({vertexShader:d.vertex,fragmentShader:d.fragment,uniforms,side:T.DoubleSide,depthWrite:d.depthWrite!==false,depthTest:d.depthTest!==false,transparent:!!d.blend,toneMapped:false,blending:d.blend==='add'?T.AdditiveBlending:T.NormalBlending});let mesh=new T.Mesh(g,m);mesh.frustumCulled=false;mesh.renderOrder=d.order||0;mesh.name='Weatherworks / '+(d.name||'effect');this.scene.add(mesh);d._three={g,m,mesh};d.visible=d.visible!==false;d.uniforms=d.uniforms||{};this.draws.push(d);return d;}
 touch(d,name){let a=d._three.g.getAttribute(name);if(a)a.needsUpdate=true;}
 sync(common){for(let d of this.draws){let {g,m,mesh}=d._three;mesh.visible=d.visible!==false&&d.instances!==0;if(d.instances!==undefined)g.instanceCount=d.instances;for(let [key,value]of Object.entries({...common,...d.uniforms})){let v=this.texture(value);if(m.uniforms[key])m.uniforms[key].value=v;else m.uniforms[key]={value:v};}}}
 remove(d){let i=this.draws.indexOf(d);if(i>=0)this.draws.splice(i,1);if(d._three){d._three.mesh.removeFromParent();d._three.g.dispose();d._three.m.dispose();delete d._three;}}
 dispose(){if(this.disposed)return;this.disposed=true;for(let d of [...this.draws])this.remove(d);for(let t of this.textures.values())t.dispose();this.textures.clear();}
}
function seededPlane(count,seed){let g=planeGeometry(),random=rng(seed),data=new Float32Array(count*4);for(let i=0;i<data.length;i++)data[i]=random();g.attributes.aSeed={data,size:4,divisor:1};return g;}
class WeatherSystem{
 constructor({THREE=null,scene=null,camera=null,adapter=null,settings={},groundHeight=(x,z)=>0,groundBounds=[-220,-220,440,440],groundResolution=128,sky=true,seed=901}={}){
 this.camera=camera;this.adapter=adapter||new ThreeAdapter(THREE,scene);this.ownsAdapter=!adapter;this.model=new WeatherModel(settings,seed);this.groundHeight=groundHeight;this.draws=[];this.disposed=false;this.groundBounds=[...groundBounds];this.heightMap={width:groundResolution,height:groundResolution,data:new Uint8Array(groundResolution*groundResolution*4),_nativeDirty:true,_threeDirty:true};this.rebuildGroundField();
 const add=d=>{this.draws.push(this.adapter.add(d));return d;};
 if(sky)this.sky=add({name:'procedural atmosphere',geometry:skyGeometry(),vertex:SKY_VERTEX,fragment:SKY_FRAGMENT,order:-1000,depthWrite:false,depthTest:false});
 this.rain=add({name:'rain',geometry:seededPlane(18000,101),vertex:PARTICLE_VERTEX,fragment:PARTICLE_FRAGMENT,instances:1,uniforms:{uKind:0},blend:'normal',depthWrite:false,order:30});
 this.snow=add({name:'snow',geometry:seededPlane(12000,203),vertex:PARTICLE_VERTEX,fragment:PARTICLE_FRAGMENT,instances:0,uniforms:{uKind:1},blend:'normal',depthWrite:false,order:31});
 this.dust=add({name:'dust',geometry:seededPlane(5000,511),vertex:PARTICLE_VERTEX,fragment:PARTICLE_FRAGMENT,instances:0,uniforms:{uKind:2},blend:'normal',depthWrite:false,order:29});
 this.splashes=add({name:'surface splashes',geometry:seededPlane(4200,408),vertex:SPLASH_VERTEX,fragment:SPLASH_FRAGMENT,instances:1,blend:'normal',depthWrite:false,order:22});
 const boltGeo=()=>{let g=planeGeometry();g.attributes.aStart={data:new Float32Array(900*3),size:3,divisor:1,dynamic:true};g.attributes.aEnd={data:new Float32Array(900*3),size:3,divisor:1,dynamic:true};return g;};
 this.boltGlow=add({name:'lightning halo',geometry:boltGeo(),vertex:BOLT_VERTEX,fragment:BOLT_FRAGMENT,instances:0,uniforms:{uBoltWidth:1.7,uBoltAlpha:0,uBoltGlow:1},blend:'add',depthWrite:false,order:40});
 this.bolt=add({name:'lightning core',geometry:boltGeo(),vertex:BOLT_VERTEX,fragment:BOLT_FRAGMENT,instances:0,uniforms:{uBoltWidth:.13,uBoltAlpha:0,uBoltGlow:0},blend:'add',depthWrite:false,order:41});
 this.lastUniforms=null;this.boltCount=0;this.cameraPosition=[60,30,100];this.update(0,this.cameraPosition);
 }
 rebuildGroundField({bounds,sample}={}){if(bounds){if(!Array.isArray(bounds)||bounds.length!==4||!bounds.every(Number.isFinite)||bounds[2]<=0||bounds[3]<=0)throw Error('Ground bounds are [minX,minZ,width,depth].');this.groundBounds=[...bounds];}if(sample){if(typeof sample!=='function')throw Error('sample must be a function');this.groundHeight=sample;}let t=this.heightMap,b=this.groundBounds;for(let j=0;j<t.height;j++)for(let i=0;i<t.width;i++){let h=this.groundHeight(b[0]+(i+.5)/t.width*b[2],b[1]+(j+.5)/t.height*b[3]);h=Number.isFinite(h)?h:0;let v=Math.round(clamp((h+128)/512,0,1)*65535),k=(j*t.width+i)*4;t.data[k]=v>>>8;t.data[k+1]=v&255;t.data[k+2]=0;t.data[k+3]=255;}t._nativeDirty=t._threeDirty=true;}
 configure(patch,options){return this.model.configure(patch,options);}
 setPreset(name,options){this.model.setPreset(name,options);}
 triggerLightning(position){if(position&&(!Array.isArray(position)||position.length!==3||!position.every(Number.isFinite)))throw Error('Strike position must be [x,y,z].');return this.model.requestStrike(position);}
 buildBolt(position){let r=this.model.random;let end=position||[-55+r()*125,0,-85-r()*65];if(!position)end[1]=Math.max(0,this.groundHeight(end[0],end[2]));let start=[end[0]+(r()-.5)*28,this.model.current.cloudBase+35,end[2]+(r()-.5)*28],segments=[],path=[];
 let count=30;for(let i=0;i<=count;i++){let k=i/count,jit=Math.sin(k*Math.PI)*(1+r()*3.);path.push([start[0]+(end[0]-start[0])*k+(r()-.5)*jit*2,start[1]+(end[1]-start[1])*k,start[2]+(end[2]-start[2])*k+(r()-.5)*jit*2]);if(i)segments.push([path[i-1],path[i]]);}
 for(let b=0;b<7;b++){let i=4+Math.floor(r()*20),from=path[i],dir=[(r()-.5)*3,-.5-r(),(r()-.5)*2],last=[...from];for(let j=0;j<7;j++){let next=last.map((v,k)=>v+dir[k]*1.8+(r()-.5)*1.6);segments.push([last,next]);last=next;}}
 this.boltCount=segments.length;for(let d of [this.boltGlow,this.bolt]){let A=d.geometry.attributes.aStart.data,B=d.geometry.attributes.aEnd.data;for(let i=0;i<segments.length;i++){A.set(segments[i][0],i*3);B.set(segments[i][1],i*3);}this.adapter.touch(d,'aStart');this.adapter.touch(d,'aEnd');}
 if(this.onLightning){let distance=Math.hypot(...end.map((v,i)=>v-this.cameraPosition[i]));this.onLightning({position:[...end],distance,thunderDelay:distance/343,strike:this.model.strikes});}
 }
 update(dt,position=null){if(this.disposed)return;let p=position;if(!p&&this.camera){if(this.camera.getWorldPosition){let T=this.adapter.THREE;let v=new T.Vector3();this.camera.getWorldPosition(v);p=v.toArray();}else p=this.camera.position;}if(p)this.cameraPosition=Array.from(p);this.model.update(dt);if(this.model.pendingStrike){this.model.pendingStrike=false;this.buildBolt(this.model.strikePosition);}let c=this.model.current,f=c.quality==='ultra'?1:c.quality==='high'?.74:.48;
 this.rain.instances=Math.floor(18000*c.rain*f);this.snow.instances=Math.floor(12000*c.snow*f);this.dust.instances=Math.floor(5000*c.dust*f);this.splashes.instances=Math.floor(4200*c.rain*f);
 let age=this.model.strikeAge,life=.7,alpha=age<life?Math.pow(1.-age/life,1.4):0;if(c.skyFlash&&age<.4)alpha*=.45+.55*Math.abs(Math.cos(age*35.));for(let d of [this.boltGlow,this.bolt]){d.instances=alpha>0?this.boltCount:0;d.uniforms.uBoltAlpha=alpha*(d===this.boltGlow?.3:.95);}
 this.lastUniforms={...this.model.uniforms(this.cameraPosition),uHeightMap:this.heightMap,uGroundBounds:this.groundBounds};if(this.adapter instanceof ThreeAdapter)this.adapter.sync(this.lastUniforms);return this.lastUniforms;
 }
 getUniforms(){return this.lastUniforms;}
 getState(){return{...this.model.getState(),particles:this.rain.instances+this.snow.instances+this.dust.instances,splashes:this.splashes.instances,groundBounds:[...this.groundBounds],disposed:this.disposed};}
 exportPreset(){return this.model.export();}
 importPreset(data){this.model.import(data);this.update(0);}
 pause(paused=true){this.model.paused=!!paused;}
 resetSurface(){this.model.wetness=0;this.model.snowCover=0;}
 dispose(){if(this.disposed)return;this.disposed=true;for(let d of this.draws)this.adapter.remove(d);this.draws=[];if(this.ownsAdapter)this.adapter.dispose();}
}



export {WeatherSystem,WeatherModel,PRESETS};
