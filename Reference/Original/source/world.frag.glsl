#version 300 es
precision highp float;
precision highp int;
precision highp sampler3D;
out vec4 fragColor;
uniform vec2 uResolution;
uniform vec3 uForward, uRight, uUp, uSun, uStarColor;
uniform vec3 uAtmoTint[20];
uniform vec4 uCloudProps[20];
uniform vec4 uWeatherFronts[20];
uniform float uTime, uFov;
uniform int uCount, uMaxSteps, uQuality, uView;
uniform vec4 uBodies[20]; // camera-relative centre (km), radius (km)
uniform vec4 uProps[20]; // material class, height amplitude, atmosphere thickness, reserved
uniform vec3 uOffsets[20];
uniform vec4 uSpin[20];
uniform float uHasRings[20];
vec3 bodyLocal(vec3 p,int i){vec3 a=uSpin[i].xyz;float t=-uSpin[i].w,c=cos(t),s=sin(t);return p*c+cross(a,p)*s+a*dot(a,p)*(1.-c);}
vec3 bodyWorld(vec3 p,int i){vec3 a=uSpin[i].xyz;float t=uSpin[i].w,c=cos(t),s=sin(t);return p*c+cross(a,p)*s+a*dot(a,p)*(1.-c);}
uniform sampler3D uNoise;
uniform highp usampler2D uBioTiles;
uniform vec4 uClimate[20]; // frequency, terrain base, biome, humidity
uniform vec3 uTint[20];
uniform int uSiteBody,uSiteStyle,uFlora,uPlantCount,uAnimalCount;
uniform uint uSiteSeed;
uniform vec3 uSitePos,uStationPos,uPlantColor;
uniform mat3 uSiteBasis,uStationBasis,uPlantBasis;
uniform float uSiteHeight;
uniform float uSiteExtent;
uniform vec4 uPlants[40],uAnimals[16],uAnimalInfo[16];
uniform sampler2D uAlbedoMap,uNormalMap,uORMMap;
uniform samplerCube uExteriorProbe,uInteriorProbe;
uniform int uProbePass;
uniform int uMeshForeground;
uniform int uArtworkActive;
uniform sampler2D uArtworkMask;
uniform vec4 uArtworkRect;
uniform highp sampler2D uWorldworks;
uniform int uWorldworksEnabled;
uniform int uWorldworksBody;
uniform float uWorldworksWater;
uniform int uInteriorActive;
uniform vec3 uInteriorOrigin,uInteriorBounds;
uniform float uStarVisibility;
uniform int uDetailTerrainBody;
uniform sampler2D uTerrainCache;
uniform mat3 uTerrainCacheBasis;
uniform vec2 uTerrainCacheSize;
uniform float uAOEnabled,uReflections,uNormalStrength;
uniform vec3 uProbePosition;
uniform int uCombatCount,uShotCount,uWalking,uArmed,uGunType;
uniform vec4 uCombatBodies[16],uCombatForward[16],uCombatUp[16];
uniform vec4 uShotsA[64],uShotsB[64];
uniform float uGunRecoil;
const float FAR=1.e24;
const float PI=3.141592653589793;
float saturate(float x){return clamp(x,0.,1.);}
float noise3(vec3 p){vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return textureLod(uNoise,(i+f+.5)/64.,0.).r;}
// Manual interpolation for collision-critical terrain avoids driver-dependent R8 filtering quantization.
float terrainNoise(vec3 p){
#ifdef FLOAT_TERRAIN_FILTERING
 return noise3(p);
#else
 ivec3 i=ivec3(floor(p));vec3 f=fract(p);f=f*f*(3.-2.*f);
 // RGBA packs the four XY corners; two fetches preserve exact CPU interpolation.
 vec4 lower=texelFetch(uNoise,i&63,0),upper=texelFetch(uNoise,(i+ivec3(0,0,1))&63,0);
 float a=lower.r,b=lower.g,c=lower.b,d=lower.a,e=upper.r,g=upper.g,h=upper.b,j=upper.a;
 return mix(mix(mix(a,b,f.x),mix(c,d,f.x),f.y),mix(mix(e,g,f.x),mix(h,j,f.x),f.y),f.z);
#endif
}
// Subtract the canonical patch origin before projection to preserve small
// terrain coordinates on thousand-kilometre planets (split high/low origin).
vec2 frontierCoordinates(vec3 n,float radius){
 vec3 delta=(n-vec3(.6208075881004333,.370481938123703,.6908987760543823))-vec3(-1.2987317998813808e-8,1.863156184889192e-9,-2.310591529219863e-8);
 return vec2(dot(delta,vec3(.7438299368905008,0.,-.6683689288001602)),dot(delta,vec3(-.24761861736882232,.9288396697727619,-.2755755580394958)))*radius;
}
float patriotWatershed(vec3 n,int i,float base){
 if(int(uProps[i].x+.5)!=1)return base;
 vec3 up=normalize(vec3(.62,.37,.69)),right=normalize(cross(vec3(0.,1.,0.),up)),forward=normalize(cross(up,right));
 if(dot(n,up)<.98)return base;
 vec2 p=frontierCoordinates(n,uBodies[i].w);float x=p.x,z=p.y,phase=uOffsets[i].x*.031;
 float mask=(1.-smoothstep(6.,9.,abs(x)))*(1.-smoothstep(10.,14.,abs(z)));
 float center=.60*sin(z*.32+phase)+.17*sin(z*.95+phase*.5),d=abs(x-center),width=.08+.015*cos(z*.22+phase);
 float crags=.62+.38*pow(1.-abs(sin(x*6.7+sin(z*1.6)*1.3)*cos(z*2.1+cos(x*2.3))),3.);
 float hills=.85*exp(-pow((d-2.45)/.95,2.))*(.72+.28*sin(z*.47+phase))*crags;
 float valley=.030+.12*smoothstep(.14,1.4,d)+hills+.018*smoothstep(.25,.8,d)*sin(x*23.+sin(z*5.))*cos(z*19.)-.055*(1.-smoothstep(width*.5,width,d));
 return mix(base,valley/uBodies[i].w,mask);
}
float worldworksHeight(vec3 n,int i,float base){
 if(uWorldworksEnabled==0||i!=uWorldworksBody||int(uProps[i].x+.5)==3)return base;
 vec3 up=normalize(vec3(.62,.37,.69)),right=normalize(cross(vec3(0,1,0),up)),forward=normalize(cross(up,right));
 if(dot(n,up)<.98)return base;
 vec2 p=frontierCoordinates(n,uBodies[i].w)*1000.;
 float mask=(1.-smoothstep(1900.8,2764.8,abs(p.x)))*(1.-smoothstep(1900.8,2764.8,abs(p.y)));
 if(mask<=0.)return base;
 vec2 grid=(p/5760.+.5)*128.;ivec2 q=clamp(ivec2(floor(grid)),ivec2(0),ivec2(127));vec2 f=grid-vec2(q);
 float a=texelFetch(uWorldworks,q,0).r,b=texelFetch(uWorldworks,q+ivec2(1,0),0).r,c=texelFetch(uWorldworks,q+ivec2(0,1),0).r,d=texelFetch(uWorldworks,q+ivec2(1,1),0).r;
 float h=(f.x+f.y<=1.?a*(1.-f.x-f.y)+b*f.x+c*f.y:d*(f.x+f.y-1.)+c*(1.-f.x)+b*(1.-f.y));
 h=(h-uWorldworksWater)*.032;
 if(int(uProps[i].x+.5)==1){float z=p.y*.001,phase=uOffsets[i].x*.031,rx=.6*sin(z*.32+phase)+.17*sin(z*.95+phase*.5);return base+max(0.,h)*.62*mask*smoothstep(.65,1.2,abs(p.x*.001-rx))/uBodies[i].w;}
 return mix(base,(h*.85+max(0.,base*uBodies[i].w)*.15)/uBodies[i].w,mask);
}
float rawHeight(vec3 n,int i){
  n=bodyLocal(n,i);vec3 originalNormal=n;
  int type=int(uProps[i].x+.5);if(type==3)return 0.;
  vec3 o=uOffsets[i];n*=uClimate[i].x;
  float q=terrainNoise(n*12.+o)*2.-1.;
  float v=.58*terrainNoise(n*3.5+o)+.26*(1.-q*q)+.14*terrainNoise(n*42.+o)+.02*terrainNoise(n*135.+o);
  float base=uClimate[i].y;
  // Broad plains retain gentle relief; narrow drainage and fine outcrops add actual geometry.
  float warp=terrainNoise(n*73.+o);
  float channel=1.-smoothstep(.018,.093,abs(terrainNoise(n*260.+o)-.5+(warp-.5)*.16));
  float fine=terrainNoise(n*1500.+o)-.5;
  float ridge=1.-abs(terrainNoise(n*95.+o)*2.-1.),landform=0.;
  if(type==0){vec3 q=n*48.+o,cell=floor(q+.5);float jitter=terrainNoise(cell*.73+o)-.5;float d=length(q-cell-jitter*.12);landform=.026*exp(-pow((d-.32)/.055,2.))-.046*(1.-smoothstep(.20,.31,d))+.009*ridge;}
  else if(type==2){float dune=pow(.5+.5*sin((n.x*.82+n.z*.58)*480.+warp*4.),3.);landform=.024*dune+.065*smoothstep(.54,.71,terrainNoise(n*42.+o))-.016*channel;}
  else if(type==4){landform=.040*pow(ridge,5.)-.045*pow(channel,3.)+.018*abs(sin(n.y*260.+warp*3.));}
  else if(type==5){float vent=smoothstep(.59,.74,terrainNoise(n*62.+o));landform=.100*vent-.055*smoothstep(.73,.83,terrainNoise(n*62.+o))-.025*channel+.025*pow(ridge,4.);}
  else{float mountains=smoothstep(.48,.72,terrainNoise(n*18.+o));landform=.055*mountains*pow(ridge,3.)-.013*channel*(.4+warp);}
  vec3 km=n*uBodies[i].w/uClimate[i].x;float broad=terrainNoise(km*.7+o),fineRidge=1.-abs(terrainNoise(km*2.6+o)*2.-1.);float relief=min(.2,uBodies[i].w*uProps[i].y*.23),localForm=0.;
  if(type==0){vec3 q=km*1.8+o;float d=length(q-floor(q+.5));localForm=.28*exp(-pow((d-.31)/.07,2.))-.32*(1.-smoothstep(.13,.30,d))+.18*broad;}
  else if(type==2){float dune=pow(.5+.5*sin(km.x*7.5+km.z*4.2+terrainNoise(km*.6+o)*3.),3.);localForm=.36*dune+.64*smoothstep(.48,.72,terrainNoise(km*1.2+o));}
  else if(type==4)localForm=.70*pow(fineRidge,7.)+.26*broad-.10*pow(1.-fineRidge,3.);
  else if(type==5)localForm=.72*pow(fineRidge,2.)+.25*smoothstep(.45,.7,terrainNoise(km*1.1+o));
  else localForm=.75*smoothstep(.32,.75,broad)*pow(fineRidge,2.)+.12*terrainNoise(km*4.+o);
  return worldworksHeight(originalNormal,i,patriotWatershed(originalNormal,i,uProps[i].y*(v-base-.020+landform+.0018*fine)+relief*localForm/uBodies[i].w));
}
// The near mesh already sampled this terrain. Read that LOD instead of running
// hundreds of exact noise evaluations behind each opaque terrain pixel. Fade
// back to the global field across the patch edge; never skip the ground ray.
float cachedTerrainHeight(vec3 n,int i,out float weight){
 weight=0.;if(i!=uDetailTerrainBody)return 0.;
 vec3 local=transpose(uTerrainCacheBasis)*n;if(local.y<.98)return 0.;
 vec2 km=local.xz*uBodies[i].w/local.y;
 float extent=uTerrainCacheSize.x,segments=uTerrainCacheSize.y;
 weight=1.-smoothstep(extent*.8,extent*.96,length(km));if(weight<=0.)return 0.;
 vec2 grid=(sign(km)*pow(abs(km)/extent,vec2(1./2.1))*.5+.5)*segments;
 ivec2 q=clamp(ivec2(floor(grid)),ivec2(0),ivec2(int(segments)-1));
 vec2 a=(vec2(q)/segments*2.-1.),b=(vec2(q+1)/segments*2.-1.);
 a=sign(a)*pow(abs(a),vec2(2.1))*extent;b=sign(b)*pow(abs(b),vec2(2.1))*extent;
 vec2 f=clamp((km-a)/(b-a),0.,1.);
 float h00=texelFetch(uTerrainCache,q,0).r,h10=texelFetch(uTerrainCache,q+ivec2(1,0),0).r;
 float h01=texelFetch(uTerrainCache,q+ivec2(0,1),0).r,h11=texelFetch(uTerrainCache,q+1,0).r;
 return mix(mix(h00,h10,f.x),mix(h01,h11,f.x),f.y)/uBodies[i].w;
}
float field(vec3 p,int i){float r=length(p);vec3 n=p/max(r,1.e-8);float weight=0.,cached=cachedTerrainHeight(n,i,weight);if(weight>=.9999)return r-1.-cached;float h=rawHeight(n,i);if(uProps[i].w>.5)h=max(h,0.);
 if(i==uSiteBody){float co=dot(n,uSiteBasis[1]);if(co>.98){vec3 q=transpose(uSiteBasis)*(n*uBodies[i].w);float d=max(abs(q.x),abs(q.z));if(d<uSiteExtent){float feather=uSiteExtent<.15?.016:.04;float f=1.-smoothstep(uSiteExtent-feather,uSiteExtent,d);float plane=((uBodies[i].w+uSiteHeight)/co-uBodies[i].w)/uBodies[i].w;h=mix(h,plane,f);}}}
 return r-1.-mix(h,cached,weight);}
vec2 sphere(vec3 ro,vec3 rd,float r){
  vec3 cr=cross(ro,rd);float h=r*r-dot(cr,cr);if(h<0.)return vec2(FAR,-FAR);
  float b=dot(ro,rd),s=sqrt(h);return vec2(-b-s,-b+s);
}
// Tight analytic ray-box rejection: discard empty sky before evaluating detailed fields.
vec2 rayBox(vec3 ro,vec3 rd,vec3 lo,vec3 hi){
 vec3 inv=mix(vec3(-1.),vec3(1.),step(vec3(0.),rd))/max(abs(rd),vec3(1.e-9));
 vec3 a=(lo-ro)*inv,b=(hi-ro)*inv,mn=min(a,b),mx=max(a,b);
 return vec2(max(mn.x,max(mn.y,mn.z)),min(mx.x,min(mx.y,mx.z)));
}
float trace(vec3 ro,vec3 rd,int i,float maxDistance,out int work){
  work=0;int type=int(uProps[i].x+.5);
  vec2 bound=sphere(ro,rd,1.+uProps[i].y);
  if(bound.y<0.||bound.x>bound.y)return FAR;
  if(type==3){vec2 b=sphere(ro,rd,1.);return b.x>0.?b.x:(b.y>0.?b.y:FAR);}
  // Subpixel relief need not be traced. This is a screen-error decision, not a level change.
  float dist=length(ro);
  if(dist>max(9.,uProps[i].y*uResolution.y*2.8)){
    float t=sphere(ro,rd,1.).x;return t>0.?t:FAR;
  }
  float t=max(0.,bound.x),stop=min(bound.y,maxDistance),eps=0.;
  for(int k=0;k<min(256,uMaxSteps);k++){
    if(k>=uMaxSteps||t>stop)break;work=k+1;
    vec3 p=ro+rd*t;float d=field(p,i);
    eps=max(.0004/uBodies[i].w,t*uFov/uResolution.y*.38);
    eps=max(eps,1.e-7);
    if(d<eps)return t;
    t+=max(d*(.80/(1.+uProps[i].y*55.)),eps*.4);
  }
  // Grazing rays may spend their fine-step budget near the ground. Search the
  // remaining shell, then refine a real sign-changing bracket instead of
  // punching holes through the planet when that budget expires.
  float base=int(uProps[i].x+.5)==1?0.:.57;
  vec2 core=sphere(ro,rd,1.-uProps[i].y*base);
  float end=core.x>t?min(stop,core.x):stop;
  float previous=t;
  for(int k=0;k<min(128,uMaxSteps);k++){
    if(t>end)break;
    float d=field(ro+rd*t,i);
    if(d<=0.){
      float a=previous,b=t;
      for(int j=0;j<min(14,uMaxSteps);j++){float m=(a+b)*.5;if(field(ro+rd*m,i)>0.)a=m;else b=m;}
      return (a+b)*.5;
    }
    previous=t;
    float stepSize=max(d*.55,max(t*.015,(end-t)/float(128-k)));
    t+=max(stepSize,1.e-6);
  }
  return FAR;
}
vec3 normalAt(vec3 p,int i,float eps){
  if(int(uProps[i].x+.5)==3)return normalize(p);
  vec2 e=vec2(1.,-1.)*max(eps,1.2e-6);
  return normalize(e.xyy*field(p+e.xyy,i)+e.yyx*field(p+e.yyx,i)+e.yxy*field(p+e.yxy,i)+e.xxx*field(p+e.xxx,i));
}
vec3 flightNormal(vec3 p,int i,float eps,vec3 fallback){
#ifdef FLOAT_TERRAIN_FILTERING
  return normalAt(p,i,eps);
#else
  // Packed-noise drivers must not inline four additional full terrain fields.
  // Project each hit onto the height field before differentiating, removing
  // ray termination bands with one field sample (cached in the near patch).
  vec3 surface=p-normalize(p)*field(p,i);
  vec3 n=cross(dFdx(surface),dFdy(surface));
  return dot(n,n)>1.e-24?normalize(n):fallback;
#endif
}
float hash21(vec2 p){vec3 p3=fract(vec3(p.xyx)*.1031);p3+=dot(p3,p3.yzx+33.33);return fract((p3.x+p3.y)*p3.z);}
vec3 sky(vec3 rd){
  vec3 axis=normalize(vec3(.42,.7,.45));float band=exp(-abs(dot(rd,axis)) * 9.);
  float clouds=noise3(rd*5.+vec3(21,17,9)),dust=noise3(rd*17.+vec3(3,6,1));
  vec3 col=vec3(.0007,.0014,.0035);
  col+=band*pow(clouds,2.)*mix(vec3(.08,.025,.063),vec3(.025,.07,.12),dust)*1.7*uStarVisibility;
  vec2 uv=vec2(atan(rd.z,rd.x)/6.2831853+.5,asin(clamp(rd.y,-1.,1.))/PI+.5);
  for(int l=0;l<2;l++){
    if(uMeshForeground==1)break; // The instanced Spellworks sky owns full-size stars.
    float scale=l==0?650.:1270.;vec2 p=uv*vec2(scale,scale*.5),id=floor(p),f=fract(p);
    float h=hash21(id+float(l)*313.);vec2 center=vec2(hash21(id+5.7),hash21(id+19.2))*.7+.15;
    float size=l==0?.025:.018;float aa=clamp(length(fwidth(p))*.35,.008,.10);
    float star=1.-smoothstep(size,size+aa,length(f-center));
    star*=step(l==0?.997:.999,h)*(l==0?.95:.42);
    vec3 tint=mix(vec3(.65,.79,1.),vec3(1.,.80,.55),hash21(id+45.));col+=star*tint*uStarVisibility;
  }
  float sunDot=max(dot(rd,uSun),0.);
  vec3 sunRight=normalize(cross(uSun,abs(uSun.y)>.98?vec3(1,0,0):vec3(0,1,0))),sunUp=cross(sunRight,uSun);
  vec2 solar=vec2(dot(rd,sunRight),dot(rd,sunUp))/.007;
  float radius=length(solar),granules=noise3(vec3(solar*9.,uTime*.06)),disk=1.-smoothstep(.92,1.,radius);
  float rim=exp(-max(0.,radius-1.)*4.2)*(1.-disk),rays=.6+.4*noise3(vec3(normalize(solar+vec2(.001))*5.,uTime*.025));
  col+=uStarColor*(vec3(1.,.71,.28)*disk*(2.8+granules*1.8)+vec3(1.,.32,.08)*rim*rays*.8+pow(sunDot,900.)*vec3(.22,.065,.018))*step(0.,dot(rd,uSun));
  return col;
}
// Energy-conserving GGX / Smith / Schlick shading with authored surface maps.
vec2 surfaceUV(vec3 p,vec3 n){vec3 a=abs(n);return a.x>a.y&&a.x>a.z?p.zy:a.y>a.z?p.xz:p.xy;}
vec3 mappedNormal(vec3 p,vec3 n,float scale){
 vec2 uv=surfaceUV(p,n)*scale;vec3 m=texture(uNormalMap,uv).xyz*2.-1.;
 vec3 tangent=normalize(cross(abs(n.y)<.9?vec3(0,1,0):vec3(0,0,1),n)),bitangent=cross(n,tangent);
 return normalize(n+uNormalStrength*(tangent*m.x+bitangent*m.y)*.34);
}
vec3 organicNormal(vec3 p,vec3 n){float e=.04;vec3 q=p*57.;vec3 grad=vec3(noise3(q+vec3(e,0,0))-noise3(q-vec3(e,0,0)),noise3(q+vec3(0,e,0))-noise3(q-vec3(0,e,0)),noise3(q+vec3(0,0,e))-noise3(q-vec3(0,0,e)));grad-=n*dot(grad,n);return normalize(n+grad*.65*uNormalStrength);}
vec3 mappedAlbedo(vec3 p,vec3 n,float scale){return pow(texture(uAlbedoMap,surfaceUV(p,n)*scale).rgb,vec3(2.2));}
vec3 surfaceORM(vec3 p,vec3 n,float scale){return texture(uORMMap,surfaceUV(p,n)*scale).rgb;}
vec3 shadePBR(vec3 albedo,vec3 n,vec3 rd,float rough,float metal,float ao,vec3 worldPoint,bool interior){
 rough=clamp(rough,.07,1.);ao=mix(1.,clamp(ao,.1,1.),uAOEnabled);
 if(uView==3)return albedo;if(uView==4)return vec3(metal);if(uView==5)return vec3(rough);if(uView==6)return vec3(ao);
 vec3 v=-rd,l=uSun,h=normalize(v+l),F0=mix(vec3(.04),albedo,metal);
 float nl=max(dot(n,l),0.),nv=max(dot(n,v),.001),nh=max(dot(n,h),0.),vh=max(dot(v,h),0.);
 float a=rough*rough,a2=a*a,den=nh*nh*(a2-1.)+1.;float D=a2/(PI*den*den+.00001);
 float k=(rough+1.)*(rough+1.)/8.;float G=(nl/(nl*(1.-k)+k+.00001))*(nv/(nv*(1.-k)+k));
 vec3 F=F0+(1.-F0)*pow(1.-vh,5.);vec3 spec=D*G*F/max(4.*nl*nv,.001);
 vec3 direct=((1.-F)*(1.-metal)*albedo/PI+spec)*vec3(3.7,3.35,2.95)*uStarColor*nl;
 vec3 reflectDir=reflect(rd,n),env=vec3(.065,.085,.12),diffuseEnv=vec3(.12,.145,.18);
 if(uProbePass==0&&uReflections>.5){
  // Local exterior probe uses box projection; the cockpit probe retains its local capture.
  vec3 bound=vec3(.5),from=worldPoint-uProbePosition,inv=sign(reflectDir)/max(abs(reflectDir),vec3(.00001));
  vec3 t=(sign(reflectDir)*bound-from)*inv;float distance=max(0.,min(t.x,min(t.y,t.z)));
  vec3 sampleDirection=interior?reflectDir:normalize(from+reflectDir*distance);
  env=interior?textureLod(uInteriorProbe,sampleDirection,rough*6.).rgb:textureLod(uExteriorProbe,sampleDirection,rough*6.).rgb;
  diffuseEnv=interior?textureLod(uInteriorProbe,n,6.).rgb:textureLod(uExteriorProbe,n,6.).rgb;
 }
 if(interior)diffuseEnv+=vec3(.12,.17,.18);
 vec3 Fr=F0+(max(vec3(1.-rough),F0)-F0)*pow(1.-nv,5.);
 vec3 indirect=((1.-Fr)*(1.-metal)*albedo*(diffuseEnv+.065)+env*Fr*(1.-rough*.45))*ao;
 if(uView==7)return env;
 return direct+indirect;
}
float planetShadow(vec3 worldPoint,int own){
  float visibility=1.;
  for(int j=0;j<min(20,uCount);j++){
    if(j>=uCount)break;if(j==own)continue;
    vec3 ro=(worldPoint-uBodies[j].xyz)/uBodies[j].w;
    vec2 b=sphere(ro,uSun,1.);if(b.y>0.&&b.x>.0001)visibility=.045;
  }
  return visibility;
}
float terrainShadow(vec3 p,vec3 n,int i){
  if(uQuality<2||dot(n,uSun)<0.)return 1.;
  float t=.00006,res=1.;vec3 ro=p+n*.000018;
  for(int k=0;k<min(18,uMaxSteps);k++){
    float d=field(ro+uSun*t,i);if(d<1.e-6)return .12;
    res=min(res,18.*d/t);t+=clamp(d,.00003,.008);if(t>.055)break;
  }
  return clamp(res,.12,1.);
}
// Two-centimetre sea-level tolerance in kilometre world units; never shade dry plains as water.
bool isLiquidSurface(float height,float radius,int liquid){return liquid>0&&height<=.00002/radius;}
vec3 material(vec3 p,vec3 n,vec3 rd,int i,float t){
  int type=int(uProps[i].x+.5);vec3 radial=normalize(p),o=uOffsets[i];
  float h=rawHeight(radial,i);vec3 surfaceRadial=radial;radial=bodyLocal(radial,i);float large=noise3(radial*9.+o),grain=noise3(radial*800.+o);
  // Sub-metre shading detail stays in the material instead of destabilizing
  // the geometric distance bound used for the terrain horizon.
  float detailFade=1.-smoothstep(.3,3.,t);
  if(type!=3&&detailFade>.001&&!isLiquidSurface(h,uBodies[i].w,int(uProps[i].w+.5))){
    vec3 q=p*uBodies[i].w*280.+o;float e=.06;
    vec3 g=vec3(noise3(q+vec3(e,0,0))-noise3(q-vec3(e,0,0)),noise3(q+vec3(0,e,0))-noise3(q-vec3(0,e,0)),noise3(q+vec3(0,0,e))-noise3(q-vec3(0,0,e)))/(2.*e);
    g-=n*dot(g,n);n=normalize(n-g*.42*detailFade);
  }
  float slope=saturate(dot(n,surfaceRadial));vec3 albedo=vec3(.3);float rough=.9;vec3 emit=vec3(0.);
  int liquid=int(uProps[i].w+.5);bool wet=isLiquidSurface(h,uBodies[i].w,liquid);
  if(wet){
   vec3 wp=radial*uBodies[i].w;float wave=sin(wp.x*15.+uTime*.75)*sin(wp.z*11.-uTime*.42)+.4*sin(wp.y*33.+wp.x*9.+uTime);
   vec3 tangent=normalize(cross(radial,vec3(.02,1.,.01)));vec3 bitangent=cross(radial,tangent);n=normalize(radial+tangent*sin(wp.x*22.+uTime)*.025+bitangent*cos(wp.z*18.-uTime*.8)*.018);rough=.12;
   float coast=1.-smoothstep(-.0015,0.,h);
   albedo=mix(vec3(.013,.20,.21),vec3(.004,.027,.075),coast)*(.93+wave*.055);
   if(liquid==2){float flow=noise3(wp*1.8+vec3(uTime*.025,0.,uTime*.012));float crust=smoothstep(.60,.74,flow);albedo=mix(vec3(.58,.04,.001),vec3(.028,.018,.022),crust);emit=mix(vec3(2.7,.38,.012),vec3(.07,.009,0.),crust)*(.8+.2*sin(wp.x*8.+uTime));rough=.35;}
   if(liquid==3){albedo=vec3(.15,.23,.015)*(.8+.15*wave);emit=vec3(.02,.04,.001);}
  }else if(type==0){
    float strata=.5+.5*sin(h*1900.+noise3(radial*110.+o)*3.);
    albedo=mix(vec3(.105,.115,.135),vec3(.28,.245,.205),large);
    float gravel=noise3(p*uBodies[i].w*230.+o);
    float flecks=noise3(p*uBodies[i].w*1850.+o);
    float microFade=1.-smoothstep(.15,2.5,t);
    albedo*=.64+.24*grain+.12*strata+microFade*(gravel*.28+flecks*.13);
    albedo=mix(albedo,vec3(.14,.13,.12),pow(1.-slope,3.)*.65);
  }else if(type==1){
    if(wet){
      float coast=1.-smoothstep(-.0015,0.,h);albedo=mix(vec3(.02,.21,.20),vec3(.008,.036,.085),coast);rough=.16;
      float wave=noise3(radial*2900.+vec3(uTime*.11,0.,uTime*.08));albedo*=.86+wave*.2;
    }else{
      float dry=smoothstep(.38,.66,noise3(radial*14.+o+8.));
      albedo=mix(vec3(.07,.16,.067),vec3(.28,.23,.12),dry);
      albedo=mix(albedo,vec3(.32,.31,.28),smoothstep(.0015,.0045,h));
      // Warm biomes do not turn into snowfields merely because the landing latitude is high.
      float snow=smoothstep(.003,.006,h);if(int(uClimate[i].z+.5)==0)snow=max(snow,smoothstep(.88,.98,abs(radial.y))*.55);
      albedo=mix(albedo,vec3(.77,.84,.88),snow);albedo*=.78+grain*.34;
    }
  }else if(type==2){
    float strata=.5+.5*sin(h*3500.+large*6.);
    albedo=mix(vec3(.24,.085,.038),vec3(.57,.3,.12),strata*.6+large*.4);albedo*=.8+grain*.3;
  }else if(type==3){
    vec3 drift=radial+vec3(uTime*.000004*uCloudProps[i].w,0.,0.);
    float swirl=noise3(drift*13.+o)*2.+noise3(drift*31.+o)*.5;
    float bands=.5+.5*sin(radial.y*82.+swirl*4.);
    float billow=noise3(drift*400.+o+swirl)*.6+noise3(drift*1400.+o)*.3+noise3(drift*4200.+o)*.1;
    vec3 tint=mix(vec3(.43,.31,.20),uAtmoTint[i]*1.35,.6);
    albedo=mix(tint*.38,tint*1.35+vec3(.20,.15,.09),bands*.55+billow*.45);
    albedo*=.65+billow*.75;
    albedo=mix(albedo,vec3(.74,.68,.57),smoothstep(.66,.89,billow)*.55);
    rough=1.;
  }else if(type==4){
    float crack=1.-smoothstep(.012,.085,abs(noise3(radial*170.+o)-.5));
    albedo=mix(vec3(.66,.77,.81),vec3(.035,.20,.27),crack*.65);albedo*=.8+.3*large;rough=.35;
  }else{
    albedo=mix(vec3(.038,.034,.034),vec3(.16,.075,.047),grain);
    float lava=1.-smoothstep(.025,.09,abs(noise3(radial*110.+o)-.5));
    lava*=smoothstep(.25,.58,noise3(radial*13.+o));emit=vec3(2.5,.28,.014)*lava;
    albedo=mix(albedo,vec3(.29,.043,.008),lava*.7);
  }
  if(!wet){
    // Exposed sediment bands follow real height; mineral patches use world-space samples.
    float layers=.5+.5*sin(h*uBodies[i].w*440.+noise3(radial*370.+o)*2.);
    float stone=smoothstep(.66,.84,noise3(radial*1600.+o));
    albedo*=uTint[i]*(.92+.08*layers);
    albedo=mix(albedo,albedo*vec3(.77,.79,.82),stone*(1.-smoothstep(.2,3.,t))*.2);
  }
  float shadow=planetShadow(rd*t,i)*terrainShadow(p,n,i),ao=1.;
  if(uAOEnabled>.5&&uProbePass==0&&t<2.&&!wet){float occ=0.;for(int j=1;j<=min(3,uMaxSteps);j++){float stepv=float(j)*.0004/uBodies[i].w;occ+=max(0.,stepv-field(p+n*stepv,i))/stepv/3.;}ao=1.-occ*.7;}
  vec3 col=shadePBR(albedo,n,rd,rough,0.,ao,rd*t,false);
  col*=.35+.65*shadow;
  if(uHasRings[i]>.5){ // The planet's own analytic ring casts a banded shadow.
    vec3 rn=normalize(vec3(.18,.92,.36));float den=dot(uSun,rn);
    if(abs(den)>.001){float tt=-dot(p,rn)/den;float r=length(p+uSun*tt);if(tt>0.&&r>1.35&&r<2.32)col*=.36;}
  }
  return col+emit;
}
vec3 applyCloud(vec3 col,vec3 rd,float depth,int i){
  int type=int(uProps[i].x+.5);if(uProps[i].z<.00001||uQuality==0)return col;
  vec4 cloud=uCloudProps[i];vec3 ro=-uBodies[i].xyz/uBodies[i].w;
  for(int layer=1;layer>=0;layer--){
    float shell=1.+uProps[i].z*(layer==0?.35:.57),halfWidth=uProps[i].z*.045;
    vec2 outer=sphere(ro,rd,shell+halfWidth),inner=sphere(ro,rd,shell-halfWidth);
    float start=max(0.,outer.x),end=min(outer.y,depth/uBodies[i].w);
    if(inner.x>start)end=min(end,inner.x);else if(inner.y>start)start=inner.y;
    if(end<=start)continue;
    float stepSize=(end-start)/4.;vec3 transmission=vec3(1.),scatter=vec3(0.);
    for(int k=0;k<4;k++){
      float t=start+(float(k)+.5)*stepSize;
      vec3 normal=normalize(ro+rd*t),p=bodyLocal(normal,i),o=uOffsets[i]+float(layer)*13.;
      vec3 drift=p+vec3(uTime*.000035*cloud.w,0.,uTime*.000016*cloud.w);
      float swirl=noise3(p*5.+o)*2.;float weather=.58*noise3(drift*11.+o+swirl)+.25*noise3(drift*34.+o)+.12*noise3(p*110.+o)+.05*noise3(p*360.+o);
      vec4 frontData=uWeatherFronts[i];
      float front=.5+.5*sin(frontData.x+p.x*2.3+p.z*1.7+abs(p.y)*1.1);
      float storm=smoothstep(.62,1.,front),daylight=clamp((dot(normal,uSun)+.15)/1.15,0.,1.);
      float thermalK=mix(frontData.w,frontData.z,daylight),condensation=1.-smoothstep(1300.,2200.,thermalK);
      float coverage=clamp(cloud.x+(storm-.3)*.22+(1.-daylight)*frontData.y*.1,0.02,1.);
      weather+=storm*.075+cloud.y*condensation*.08;
      float threshold=mix(.68,.24,coverage),density=smoothstep(threshold,threshold+.19,weather);
      float shellDistance=abs(length(ro+rd*t)-shell)/halfWidth;
      density*=1.-smoothstep(.35,1.,shellDistance);
      float alpha=1.-exp(-density*stepSize/halfWidth*(layer==0?.9:.42));
      float sun=max(dot(normal,uSun),0.),nightside=1.-smoothstep(-.2,.25,dot(normal,uSun));
      vec3 tint=mix(vec3(.84,.9,.98),vec3(.69,.64,.55),cloud.y);tint=mix(tint,vec3(.39,.30,.23),cloud.z*nightside*.72);
      float forwardScatter=pow(max(dot(rd,uSun),0.),12.)*.18;
      float glint=pow(max(dot(reflect(-uSun,normal),-rd),0.),18.)*(cloud.y*.12+cloud.z*.2)*sun;
      vec3 cc=(tint*(.018+sun)+vec3(.62,.48,.3)*glint+forwardScatter*tint)*uStarColor;
      scatter+=transmission*cc*alpha;transmission*=1.-alpha;
    }
    col=col*transmission+scatter;
  }return col;
}
vec3 atmosphere(vec3 col,vec3 rd,float depth,int i){
  float thick=uProps[i].z;if(thick<.00001||uQuality==0)return col;
  vec3 ro=-uBodies[i].xyz/uBodies[i].w;vec2 b=sphere(ro,rd,1.+thick);
  float a=max(b.x,0.),z=min(b.y,depth/uBodies[i].w);if(z<=a)return col;
  int type=int(uProps[i].x+.5);
  vec3 beta=uAtmoTint[i];
  float scale=thick*.21;vec3 trans=vec3(1.),scatter=vec3(0.);
  float mu=dot(rd,uSun),phase=.65+.35*mu*mu+.12*pow(max(mu,0.),20.);
  bool entryDenser=length(ro+rd*a)<length(ro+rd*z);
  for(int k=0;k<12;k++){
    float u=float(k)/12.,v=float(k+1)/12.;
    u=entryDenser?u*u:1.-(1.-u)*(1.-u);v=entryDenser?v*v:1.-(1.-v)*(1.-v);
    float stepSize=(z-a)*(v-u);
    vec3 p=ro+rd*(a+(u+v)*.5*(z-a));float alt=max(length(p)-1.,0.);
    // Density vanishes at the outer shell instead of ending at a visible wall.
    float density=exp(-alt/scale)*(1.-smoothstep(thick*.75,thick,alt)),light=max(dot(normalize(p),uSun)+.14,0.);
    vec2 shadow=sphere(p,uSun,1.);if(shadow.x>0.)light*=.018;
    vec3 atten=exp(-beta*density*stepSize/scale*1.5);
    vec3 skyTint=uAtmoTint[i]*uStarColor;
    scatter+=trans*(1.-atten)*skyTint*light*phase*1.45;
    trans*=atten;
  }
  return col*trans+scatter;
}
vec3 ring(vec3 col,vec3 rd,float depth,int i){
  if(uHasRings[i]<.5)return col;
  vec3 ro=-uBodies[i].xyz/uBodies[i].w,n=normalize(vec3(.18,.92,.36));
  vec2 box=sphere(ro,rd,2.34);if(box.y<0.||box.x>box.y)return col;
  float den=dot(rd,n);if(abs(den)<1.e-6)return col;
  float t=-dot(ro,n)/den;if(t<=0.||t*uBodies[i].w>depth)return col;
  vec3 p=ro+rd*t;float r=length(p);if(r<1.35||r>2.32)return col;
  float bands=.5+.5*sin(r*181.+sin(r*439.)*1.7);
  float gap=smoothstep(.008,.022,abs(r-1.91));
  float edge=smoothstep(1.35,1.39,r)*(1.-smoothstep(2.26,2.32,r));
  float alpha=(.27+bands*.52)*gap*edge;
  vec3 color=mix(vec3(.20,.16,.115),vec3(.62,.52,.36),bands);
  float lit=.5+.8*abs(dot(n,uSun));vec2 sh=sphere(p,uSun,1.);if(sh.x>0.)lit*=.12;
  return mix(col,color*lit,alpha);
}
// Meshless local architecture and biological instances. All dimensions are km.
uint hash32(uint x){x^=x>>16u;x*=0x7feb352du;x^=x>>15u;x*=0x846ca68bu;return x^(x>>16u);}
float boxD(vec3 p,vec3 b){vec3 q=abs(p)-b;return length(max(q,0.))+min(max(q.x,max(q.y,q.z)),0.);}
float capD(vec3 p,vec3 a,vec3 b,float r){vec3 pa=p-a,ba=b-a;return length(pa-ba*clamp(dot(pa,ba)/dot(ba,ba),0.,1.))-r;}
float ellD(vec3 p,vec3 r){float k0=length(p/r),k1=length(p/(r*r));return k0*(k0-1.)/max(k1,1.e-7);}
vec2 nearer(vec2 a,vec2 b){return a.x<b.x?a:b;}
// Four seeded architectural volumes. CPU collision uses the identical unions.
float buildingD(vec3 p,float h,int style){float d;
 if(style==0){d=min(boxD(p-vec3(0.,h*.29,0.),vec3(.047,h*.29,.049)),min(boxD(p-vec3(-.010,h*.75,.002),vec3(.035,h*.17,.039)),boxD(p-vec3(-.008,h*.95,0.),vec3(.027,h*.05,.030))));}
 else if(style==1){d=min(boxD(p-vec3(0.,h*.08,0.),vec3(.047,h*.08,.049)),min(boxD(p-vec3(-.026,h*.55,0.),vec3(.019,h*.41,.041)),boxD(p-vec3(.026,h*.55,0.),vec3(.019,h*.41,.041))));d=min(d,boxD(p-vec3(0.,h*.65,0.),vec3(.046,.005,.022)));}
 else if(style==2){vec2 q=vec2(length(p.xz)-.047,abs(p.y-h*.5)-h*.5);d=min(max(q.x,q.y),0.)+length(max(q,0.));d=min(d,boxD(p-vec3(0.,h*.055,0.),vec3(.050,h*.055,.050)));}
 else d=min(boxD(p-vec3(0.,h*.325,0.),vec3(.047,h*.325,.049)),boxD(p-vec3(.013,h*.825,0.),vec3(.028,h*.175,.039)));
 return d-.005;
}
vec2 cityD(vec3 p){
 vec2 res=vec2(boxD(p-vec3(0.,-.007,0.),vec3(.90,.008,.90)),10.);
 ivec2 id=ivec2(floor((p.xz+.08)/.16));
 if(abs(id.x)<=4&&abs(id.y)<=4&&id.x!=0&&length(vec2(id))>1.6){
  uint s=hash32(uint(id.x+29)*73856093u ^ uint(id.y+41)*19349663u ^ uSiteSeed);
  float r=float(s)/4294967296.;float h=.034+r*.19*(uSiteStyle==2?.65:1.);
  vec3 c=vec3(float(id.x)*.16,h*.5+.009,float(id.y)*.16);
  float d=buildingD(p-vec3(c.x,.009,c.z),h,int(s&3u));res=nearer(res,vec2(d,11.));
  res=nearer(res,vec2(boxD(p-vec3(c.x,.002,c.z),vec3(.052,.003,.054)),11.));
  res=nearer(res,vec2(boxD(p-vec3(c.x,h+.018,c.z),vec3(.043,uSiteStyle==3?.018:.006,.044)),12.));
  float mast=capD(p,vec3(c.x,h+.022,c.z),vec3(c.x,h+.075,c.z),.0016);res=nearer(res,vec2(mast,11.));
  if((s&3u)==0u||uSiteStyle==2)res=nearer(res,vec2(length(p-vec3(c.x,h+.029,c.z))- .028,12.));
  // Roof solar awnings and reinforcing facade piers.
  res=nearer(res,vec2(boxD(p-vec3(c.x+.057,.036,c.z),vec3(.016,.003,.062)),13.));
  vec3 beam=p-c;beam.x=abs(beam.x)-.049;beam.z=abs(beam.z)-.051;
  res=nearer(res,vec2(boxD(beam,vec3(.003,h*.5+.005,.003)),11.));
 }
 // Central landing ring and garden fountain.
 vec3 pad=p-vec3(0.,.007,.17);float ringD=length(vec2(length(pad.xz)-.087,pad.y))-.0025;res=nearer(res,vec2(ringD,14.));
 vec3 fountain=p-vec3(0.,.016,-.12);res=nearer(res,vec2(max(length(fountain.xz)-.032,abs(fountain.y)-.012),11.));
 res=nearer(res,vec2(max(length(fountain.xz)-.027,abs(fountain.y-.013)-.001),14.));
 // Elevated crossing and illuminated shelter; the central flight approach stays clear.
 res=nearer(res,vec2(boxD(p-vec3(0.,.106,-.32),vec3(.34,.008,.028)),11.));
 res=nearer(res,vec2(boxD(p-vec3(0.,.125,-.32),vec3(.34,.002,.032)),12.));
 for(int k=0;k<2;k++){float x=k==0?-.31:.31;res=nearer(res,vec2(boxD(p-vec3(x,.055,-.32),vec3(.006,.06,.022)),11.));}
 // Street lights repeat only along the two main avenues.
 vec3 lp=p;lp.x=abs(lp.x)-.083;float zi=round(lp.z/.13);lp.z-=zi*.13;
 if(abs(zi)<=6.){res=nearer(res,vec2(capD(lp,vec3(0.,0.,0.),vec3(0.,.036,0.),.0013),11.));res=nearer(res,vec2(boxD(lp-vec3(0.,.037,0.),vec3(.009,.0015,.004)),14.));}
 return res;
}
vec2 stationD(vec3 q){
 float outer=boxD(q,vec3(.48,.29,.70)),inner=boxD(q-vec3(0.,.025,.12),vec3(.345,.215,.735));
 vec2 res=vec2(max(outer,-inner),21.);
 float tr=length(vec2(length(q.xy)-.92,q.z+.26))-.055;res=nearer(res,vec2(tr,11.));
 // Four structural spokes and two very large solar/radiator wings.
 for(int k=0;k<2;k++){float signv=k==0?-1.:1.;
  res=nearer(res,vec2(boxD(q-vec3(signv*1.28,0.,-.22),vec3(.43,.024,.55)),13.));
  res=nearer(res,vec2(boxD(q-vec3(signv*.72,0.,-.26),vec3(.35,.035,.035)),11.));
  res=nearer(res,vec2(boxD(q-vec3(0.,signv*.65,-.26),vec3(.035,.32,.035)),11.));
  res=nearer(res,vec2(boxD(q-vec3(signv*.29,-.145,-.26),vec3(.037,.048,.18)),23.));
  res=nearer(res,vec2(boxD(q-vec3(signv*.34,.035,-.20),vec3(.003,.055,.22)),22.));
 }
 // Flight aperture remains physically open. Cyan edges mark it.
 vec3 frame=q-vec3(0.,.025,.715);
 float edge=min(boxD(vec3(abs(frame.x)-.358,frame.y,frame.z),vec3(.006,.226,.015)),boxD(vec3(frame.x,abs(frame.y)-.223,frame.z),vec3(.36,.006,.015)));
 res=nearer(res,vec2(edge,14.));
 // Internal roof beams and light strips.
 vec3 b=q;b.z=mod(b.z+.10,.22)-.11;
 if(q.z<.60&&q.z>-.57){res=nearer(res,vec2(boxD(b-vec3(0.,.223,0.),vec3(.35,.013,.013)),11.));res=nearer(res,vec2(boxD(b-vec3(0.,.207,0.),vec3(.24,.002,.006)),14.));}
 // Docking pad is painted on the true floor, not a teleport trigger outside.
 return res;
}
vec3 structureColor(vec3 p,vec3 n,vec3 rd,float mat,bool station){
 vec3 sunlight=(station?transpose(uStationBasis):transpose(uSiteBasis))*uSun;
 float diffuse=max(dot(n,sunlight),0.);vec3 base=vec3(.42,.50,.57),emission=vec3(0.);float rough=.6;
 if(mat==10.){
  base=vec3(.10,.14,.17);float road=1.-smoothstep(.064,.071,abs(p.x));base=mix(base,vec3(.023,.038,.049),road);
  float lane=1.-smoothstep(.001,.002,abs(abs(p.x)-.055));base=mix(base,vec3(.86,.65,.29),lane);
  float dash=(1.-smoothstep(.001,.002,abs(p.x)))*step(.055,mod(p.z+.1,.095));base=mix(base,vec3(.63,.79,.76),dash);
  float tile=step(.975,fract(p.x*30.))+step(.975,fract(p.z*30.));base*=1.-tile*.12;
  float heli=1.-smoothstep(.001,.003,abs(length(p.xz-vec2(0.,.17))-.076));base=mix(base,vec3(.65,.83,.71),heli);
 }else if(mat==11.){
  base=mix(vec3(.24,.32,.36),vec3(.69,.74,.69),.5+.5*n.y);rough=.44;
  if(!station){vec3 cl=uSiteStyle==1?vec3(.80,.52,.30):uSiteStyle==2?vec3(.58,.38,.64):uSiteStyle==3?vec3(.31,.38,.42):vec3(.61,.59,.53);base*=cl*1.40;if(uSiteStyle==3)base*=.55+.45*smoothstep(.02,.16,fract(p.y*115.));}
  if(!station){vec3 q=p;vec2 cell=floor((p.xz+.08)/.16);q.xz-=cell*.16;
   float windows=smoothstep(.12,.18,fract(p.y*95.))*smoothstep(.10,.18,fract((abs(n.x)>.5?p.z:p.x)*120.));
   if(abs(n.y)<.5&&p.y>.025){base=mix(base,vec3(.017,.030,.039),windows*.83);float on=step(.56,hash21(floor(vec2(p.x+p.z,p.y)*110.)));emission=mix(vec3(.11,.44,.34),vec3(.65,.27,.055),float(uSiteStyle==1||uSiteStyle==3))*windows*on*.16;}
  }
 }else if(mat==12.){base=vec3(.038,.18,.22);rough=.15;}
 else if(mat==13.){base=mix(vec3(.009,.028,.10),vec3(.10,.25,.44),.5+.5*sin(p.x*350.));float grid=max(step(.94,fract(p.x*22.)),step(.95,fract(p.z*25.)));base=mix(base,vec3(.44,.53,.56),grid);rough=.22;}
 else if(mat==14.){base=vec3(.06,.34,.28);emission=vec3(.27,2.0,1.25)*(station?1.:.35);}
 else if(mat==15.){base=vec3(.3,.12,.02);emission=vec3(2.,.64,.12);}
 else if(mat==21.){
  base=vec3(.19,.26,.32);float tile=max(step(.975,fract(p.x*15.)),step(.98,fract(p.z*14.)));base*=1.-tile*.35;
  if(p.y<-.18){base=vec3(.075,.115,.15);float lane=1.-smoothstep(.001,.003,abs(abs(p.x)-.21));base=mix(base,vec3(.83,.61,.27),lane);
   float pad=1.-smoothstep(.001,.004,abs(length((p.xz-vec2(0.,.07))*vec2(1.,.8))-.13));base=mix(base,vec3(.50,.79,.68),pad);
   float marks=step(.55,fract((p.x+p.z)*30.))*step(.255,abs(p.x));base=mix(base,vec3(.68,.48,.17),marks*.8);
   float center=(1.-smoothstep(.001,.003,abs(p.x)))*step(.07,mod(p.z+.4,.12));emission+=vec3(.03,.35,.28)*center;
  }
 }else if(mat==22.){base=vec3(.008,.06,.09);float line=step(.86,fract(p.y*240.))*step(.12,fract(p.z*28.));emission=vec3(.09,1.0,.69)*(.12+line*.6);}
 else if(mat==23.){base=mix(vec3(.27,.17,.10),vec3(.58,.39,.16),step(.45,fract(p.z*30.)));}
 vec3 maps=surfaceORM(p*1000.,n,.18);base*=mappedAlbedo(p*1000.,n,.18)*.75+.25;
 vec3 normal=mappedNormal(p*1000.,n,.18);float metal=(mat==10.?0.:mat==12.?.65:.62),ao=maps.r;
 if(uAOEnabled>.5&&uProbePass==0){float occ=0.;for(int j=1;j<=min(3,uMaxSteps);j++){float h=float(j)*.0008;float d=station?stationD(p+n*h).x:cityD(p+n*h).x;occ+=max(0.,h-d)/h/3.;}ao*=1.-occ*.72;}
 mat3 basis=station?uStationBasis:uSiteBasis;vec3 worldPoint=(station?uStationPos:uSitePos)+basis*p;
 vec3 col=shadePBR(base,basis*normal,basis*rd,rough*(.7+maps.g*.45),metal,ao,worldPoint,station)+emission;

 return col;
}
void architecture(vec3 rd,inout vec3 color,inout float depth,bool station){
 vec3 center=station?uStationPos:uSitePos;mat3 basis=station?uStationBasis:uSiteBasis;float radius=station?2.1:1.7;
 if(!station&&uSiteBody<0)return;
 vec3 ro=transpose(basis)*(-center),dir=transpose(basis)*rd;vec2 bound=station?rayBox(ro,dir,vec3(-1.75,-1.05,-.79),vec3(1.75,1.05,.79)):rayBox(ro,dir,vec3(-.92,-.019,-.92),vec3(.92,.325,.92));
 if(bound.y<0.||bound.x>bound.y||max(0.,bound.x)>depth)return;
 float t=max(0.,bound.x),end=min(bound.y,depth+.002),mat=0.;bool hit=false;
 for(int k=0;k<120;k++){if(k>=(uQuality==0?72:112)||t>end)break;vec3 p=ro+dir*t;vec2 d=station?stationD(p):cityD(p);float eps=max(.00009,t*uFov/uResolution.y*.24);
  if(d.x<eps){hit=true;mat=d.y;break;}
  float advance=max(d.x*.80,.00004);
  // City height varies by cell: never let an empty/short cell skip a tall neighbor.
  if(!station){vec2 cell=floor((p.xz+.08)/.16);vec2 edge=(cell+step(vec2(0.),dir.xz))*.16-.08;
   vec2 toEdge=vec2(abs(dir.x)<1.e-7?1.e6:(edge.x-p.x)/dir.x,abs(dir.z)<1.e-7?1.e6:(edge.y-p.z)/dir.z);
   advance=min(advance,max(.00004,min(toEdge.x,toEdge.y)+.00004));}
  t+=advance;
 }
 if(!hit||t>depth+.0015)return;
 vec3 p=ro+dir*t;float e=max(.00012,t*uFov/uResolution.y*.26);vec2 v=vec2(e,0.);vec3 n;
 if(station)n=normalize(vec3(stationD(p+v.xyy).x-stationD(p-v.xyy).x,stationD(p+v.yxy).x-stationD(p-v.yxy).x,stationD(p+v.yyx).x-stationD(p-v.yyx).x));
 else n=normalize(vec3(cityD(p+v.xyy).x-cityD(p-v.xyy).x,cityD(p+v.yxy).x-cityD(p-v.yxy).x,cityD(p+v.yyx).x-cityD(p-v.yyx).x));
 color=uView==1?(basis*n)*.5+.5:structureColor(p,n,dir,mat,station);depth=t;
}
// Analytic spacecraft. Geometry is measured in metres in ship-local coordinates.
uniform vec3 uShipPos,uShipDimensions,uShipPaint,uShipAccent;
uniform mat3 uShipBasis;
uniform vec4 uShipSystems; // strut extension, engine spool, canopy angle, hyper intensity
uniform vec4 uShipLayout; // hull architecture, wing sweep, variant, engine scale
uniform vec3 uShipRCS;
uniform float uShipSpeed,uShipHeat,uSpeedEffects;
uniform int uShipView;
uniform sampler2D uCockpit;
uniform float uCockpitStates[12];
uniform vec4 uCockpitMotion; // yaw stick, pitch stick, main throttle, landing lights
uniform vec2 uCockpitPress; // switch index, depression animation

float bevelD(vec3 p,vec3 b,float r){return boxD(p,max(b-vec3(r),vec3(.01)))-r;}
float cylinderZD(vec3 p,float r,float h){vec2 q=vec2(length(p.xy)-r,abs(p.z)-h);return min(max(q.x,q.y),0.)+length(max(q,0.));}
vec2 cockpitD(vec3 p){
 float l=uShipDimensions.x,w=uShipDimensions.y,h=uShipDimensions.z;vec2 d=vec2(1e5,30.);
 // Recessed flight-deck floor, central instrument housing, rubber-edged glare shield.
 d=nearer(d,vec2(bevelD(p-vec3(0.,h*.12,l*.15),vec3(w*.155,h*.065,l*.21),.09),30.));
 d=nearer(d,vec2(bevelD(p-vec3(0.,h*.316,l*.294+.14),vec3(w*.145,h*.13,.15),.06),30.));
 d=nearer(d,vec2(bevelD(p-vec3(0.,h*.468,l*.294-.03),vec3(w*.155,.045,.25),.045),32.));
 // A forward pedestal carries six by two mechanically depressed switch keys.
 d=nearer(d,vec2(bevelD(p-vec3(0.,h*.261,l*.294-.11),vec3(w*.145,h*.055,.065),.032),32.));
 float col=clamp(floor(p.x/(w*.046)+3.),0.,5.),row=clamp(floor((h*.319-p.y)/(h*.058)),0.,1.);
 int index=int(row*6.+col);float down=uCockpitPress.x==float(index)?uCockpitPress.y:0.;
 vec3 bc=vec3((col-2.5)*w*.046,h*(.29-row*.058),l*.294-.20+down*.017);
 d=nearer(d,vec2(bevelD(p-bc,vec3(w*.019,h*.023,.035),.012),40.));
 // Screen housings, fasteners, frame ribs, vents, and trim are geometric fields.
 for(int k=0;k<2;k++){float sg=k==0?-1.:1.;vec3 sc=vec3(sg*w*.072,h*.383,l*.294);
  d=nearer(d,vec2(bevelD(p-(sc+vec3(0.,0.,.035)),vec3(w*.061,h*.067,.068),.025),32.));
  d=nearer(d,vec2(bevelD(p-sc,vec3(w*.055,h*.060,.035),.011),35.));
  for(int bolt=0;bolt<4;bolt++){vec3 q=p-(sc+vec3((bolt%2==0?-1.:1.)*w*.057,(bolt<2?-1.:1.)*h*.063,-.04));d=nearer(d,vec2(cylinderZD(q,.018,.008),38.));}
  d=nearer(d,vec2(bevelD(p-vec3(sg*w*.189,h*.245,l*.135),vec3(w*.029,h*.083,l*.17),.055),30.));
  d=nearer(d,vec2(bevelD(p-vec3(sg*w*.190,h*.330,l*.13),vec3(w*.02,.016,l*.116),.01),32.));
  // Windshield mullions and overhead seals frame a real view of the outside world.
  d=nearer(d,vec2(capD(p,vec3(sg*w*.155,h*.33,l*.294),vec3(sg*w*.151,h*.86,l*.38),.065),32.));
  d=nearer(d,vec2(capD(p,vec3(sg*w*.175,h*.25,-l*.06),vec3(sg*w*.151,h*.86,l*.38),.063),32.));
  d=nearer(d,vec2(capD(p,vec3(sg*w*.172,h*.29,-l*.05),vec3(sg*w*.150,h*.82,l*.37),.021),38.));
  // Twin ridged ventilation slots are bounded, repeated surface recess substitutes.
  vec3 vent=p-vec3(sg*w*.190,h*.336,l*.215);vent.z=mod(vent.z+.045,.09)-.045;
  float grate=max(boxD(vent,vec3(w*.015,.007,.014)),boxD(p-vec3(sg*w*.190,h*.336,l*.215),vec3(w*.016,.009,l*.027)));
  d=nearer(d,vec2(grate,38.));
 }
 // Throttle quadrant left: lever rotation/translation is driven by engine thrust.
 vec3 throttleBase=vec3(-w*.183,h*.334,l*.12),throttleTip=throttleBase+vec3(0.,.22,uCockpitMotion.z*.22-.11);
 d=nearer(d,vec2(capD(p,throttleBase,throttleTip,.025),38.));
 d=nearer(d,vec2(bevelD(p-throttleTip,vec3(.125,.055,.050),.020),32.));
 // Right flight stick leans with the measured angular command, not a canned loop.
 vec3 stickBase=vec3(w*.183,h*.333,l*.12),stickTip=stickBase+vec3(-uCockpitMotion.x*.10,.25,-uCockpitMotion.y*.10);
 d=nearer(d,vec2(capD(p,stickBase,stickTip,.035),32.));
 d=nearer(d,vec2(bevelD(p-stickTip,vec3(.05,.095,.055),.032),32.));
 d=nearer(d,vec2(cylinderZD(p-stickTip-vec3(0.,.05,-.06),.021,.012),39.));
 d=nearer(d,vec2(capD(p,vec3(-w*.151,h*.86,l*.38),vec3(w*.151,h*.86,l*.38),.07),32.));
 // Overhead avionics box, cabling and canopy latch.
 d=nearer(d,vec2(bevelD(p-vec3(0.,h*.885,l*.325),vec3(w*.05,.07,l*.037),.025),30.));
 d=nearer(d,vec2(capD(p,vec3(-w*.065,h*.842,l*.29),vec3(-w*.065,h*.842,l*.37),.018),38.));
 vec3 nose=p-vec3(0.,0.,l*.02);float nd=bevelD(nose,vec3(w*.12,h*.23,l*.46),.25);nd=max(nd,abs(p.x)*.75+p.z*.55-l*.245);nd=max(nd,l*.325-p.z);d=nearer(d,vec2(nd,30.));
 return d;
}
vec2 craftD(vec3 p){
 if(uShipView==1)return cockpitD(p);
 float l=uShipDimensions.x,w=uShipDimensions.y,h=uShipDimensions.z;int f=int(uShipLayout.x+.5);float sweep=uShipLayout.y;
 float halfW=w*(f==1||f==8?.092:f==6?.245:f==7?.30:.153);
 float hull=bevelD(p-vec3(0.,0.,f==7?-l*.055:0.),vec3(halfW,h*(f==6?.30:.25),l*(f==7?.32:.45)),f==6?.60:.28);
 if(f!=2&&f!=6&&f!=7){hull=max(hull,abs(p.x)*.72+p.z*.54-l*.245);hull=max(hull,abs(p.x)*.43+p.y*.89-halfW*.38-h*.10);}
 vec2 d=vec2(hull,30.);
 if(f==0||f==1||f==4||f==8||f==9){
  float wing=bevelD(p-vec3(0.,-h*.09,-l*.06),vec3(w*(f==4?.49:.45),h*.056,l*(f==4?.33:.245)),.16);
  wing=max(wing,p.z+abs(p.x)*(f==4?.39:sweep)-l*.18);wing=max(wing,-p.z-abs(p.x)*.10-l*.36);
  d=nearer(d,vec2(wing,30.));
  // Raised leading-edge armor and a dark trailing-edge control surface.
  vec3 strip=p;strip.x=abs(strip.x);strip.z+=strip.x*sweep;
  d=nearer(d,vec2(bevelD(strip-vec3(w*.27,-h*.065,l*.12),vec3(w*.17,h*.035,.15),.06),32.));
 }
 if(f==2){for(int side=0;side<2;side++)for(int j=0;j<3;j++){
  float signv=side==0?-1.:1.;vec3 q=p-vec3(signv*w*.27,-h*.08,(float(j)-1.)*l*.245);
  d=nearer(d,vec2(bevelD(q,vec3(w*.125,h*.32,l*.104),.23),36.));
  vec3 bars=q;bars.z=abs(bars.z)-l*.071;d=nearer(d,vec2(bevelD(bars,vec3(w*.133,h*.335,.085),.06),32.));
 }}
 if(f==3||f==8){vec3 q=p;q.x=abs(q.x);d=nearer(d,vec2(bevelD(q-vec3(w*.32,-h*.035,-l*.02),vec3(w*.070,h*.17,l*.42),.2),30.));d=nearer(d,vec2(bevelD(p-vec3(0.,-h*.12,-l*.18),vec3(w*.35,.16,l*.12),.09),32.));}
 if(f==5){d=nearer(d,vec2(bevelD(p-vec3(-w*.28,0.,-l*.03),vec3(w*.13,h*.21,l*.36),.2),36.));
  d=nearer(d,vec2(capD(p,vec3(w*.16,h*.09,-l*.32),vec3(w*.42,h*.10,l*.29),.30),32.));
  d=nearer(d,vec2(capD(p,vec3(w*.42,h*.10,l*.29),vec3(w*.32,-h*.04,l*.42),.17),30.));
  d=nearer(d,vec2(capD(p,vec3(w*.42,h*.10,l*.29),vec3(w*.49,-h*.04,l*.42),.17),30.));
 }
 if(f==6){vec3 q=p;q.x=abs(q.x);d=nearer(d,vec2(bevelD(q-vec3(w*.25,h*.10,l*.06),vec3(.035,h*.11,l*.27),.03),31.));d=nearer(d,vec2(bevelD(p-vec3(0.,-h*.12,-l*.08),vec3(w*.47,h*.045,l*.19),.17),32.));}
 if(f==7){vec3 q=p;q.x=abs(q.x);d=nearer(d,vec2(bevelD(q-vec3(w*.40,0.,-l*.08),vec3(w*.082,h*.20,l*.33),.22),36.));
  d=nearer(d,vec2(capD(p,vec3(-w*.38,h*.34,-l*.2),vec3(w*.38,h*.34,-l*.2),.21),32.));
  d=nearer(d,vec2(capD(p,vec3(-w*.38,h*.34,l*.2),vec3(w*.38,h*.34,l*.2),.21),32.));
 }
 if(f==9){vec3 q=p;q.x=abs(q.x);d=nearer(d,vec2(bevelD(q-vec3(w*.34,h*.03,-l*.30),vec3(w*.17,.085,l*.18),.045),37.));d=nearer(d,vec2(bevelD(p-vec3(0.,h*.32,-l*.28),vec3(w*.06,h*.22,l*.11),.13),32.));}
 // Nacelles, recessed engine bells and fuel-dependent exhaust.
 int engines=(f==2||f==6||f==7)?4:((f==5||f==9)?3:2);
 for(int k=0;k<4;k++){if(k>=engines)break;float side=k%2==0?-1.:1.;float x=engines==3&&k==2?0.:side*w*(f==8||f==3?.32:.32);float y=k>1?-h*.20:0.;float z=-l*(f==7?.29:.35);
  if(engines==3&&k==2)y=-h*.23;
  float r=(h*.18+.17)*uShipLayout.w,nh=l*(f==3||f==8?.22:.15);vec3 q=p-vec3(x,y,z);
  float shell=max(max(abs(q.x),abs(q.y))-r,(abs(q.x)+abs(q.y))*.7071-r*1.10);shell=max(shell,abs(q.z)-nh);d=nearer(d,vec2(shell,32.));
  d=nearer(d,vec2(cylinderZD(q-vec3(0.,0.,-nh-.13),r*1.11,.18),30.));
  d=nearer(d,vec2(cylinderZD(q-vec3(0.,0.,-nh-.325),r*.83,.035),33.));
  d=nearer(d,vec2(bevelD(p-vec3(x*.55,-h*.05,z+l*.04),vec3(abs(x)*.46,.17,l*.08),.08),32.));
  if(uShipSystems.y>.025){float exhaust=(4.+uShipSystems.y*7.)*(.6+r*.3);vec3 e=q-vec3(0.,0.,-nh-.4);float t=-e.z/exhaust;
   float cone=max(length(e.xy)-r*.72*max(0.,1.-t*.86),max(e.z,-e.z-exhaust));d=nearer(d,vec2(cone,34.));
  }
  // Stabilizing fins on the engine housings.
  vec3 fin=q-vec3(0.,r*.80,nh*.24);fin.xz=mat2(.94,-.342,.342,.94)*fin.xz;d=nearer(d,vec2(bevelD(fin,vec3(.075,h*.18,nh*.65),.04),30.));
 }
 // Hinged canopy and visible frame. The animation transforms the actual canopy field.
 vec3 cp=p-vec3(0.,h*.22,-l*.07);float a=uShipSystems.z*1.12,c=cos(a),s=sin(a);cp.yz=mat2(c,s,-s,c)*cp.yz;cp+=vec3(0.,h*.22,-l*.07);
 vec3 cq=cp-vec3(0.,h*.385,l*.135);float canopy=bevelD(cq,vec3(w*.14,h*.23,l*.245),.075);canopy=max(canopy,abs(cq.x)*.65+cq.y*.85-w*.074);canopy=max(canopy,cq.z*.44+cq.y*.78-l*.086);canopy=max(canopy,-cq.z*.38+cq.y*.9-l*.088);canopy=max(canopy,h*.24-cp.y);
 d=nearer(d,vec2(canopy,31.));
 float rim=max(abs(canopy)-.05,h*.24-cp.y);float pane=abs(cq.x)-w*.114;float rib=min(abs(cq.z-l*.04)-.065,abs(cq.z+l*.15)-.055);rim=max(rim,min(-pane,-rib));d=nearer(d,vec2(rim,32.));
 // Rear access ramp rotates down as the canopy opens. It is not a UI icon.
 vec3 rp=p-vec3(0.,-h*.16,-l*.36);float angle=uShipSystems.z*.62;rp.yz=mat2(cos(angle),sin(angle),-sin(angle),cos(angle))*rp.yz;
 d=nearer(d,vec2(bevelD(rp-vec3(0.,0.,-l*.09),vec3(w*.072,.09,l*.115),.05),32.));
 // Three independent articulated landing struts, with knees, pistons and broad feet.
 float gear=uShipSystems.x;
 for(int k=0;k<3;k++){float x=k==2?0.:(k==0?-1.:1.)*w*.29,z=k==2?l*.29:-l*.24;
  vec3 top=vec3(x*.72,-h*.12,z*.83),knee=vec3(x*.91,-h*.2-gear*.85,z+.25*gear),foot=vec3(x,mix(-h*.21,-h*.30-1.85,gear),z);
  d=nearer(d,vec2(capD(p,top,knee,.16),30.));d=nearer(d,vec2(capD(p,knee,foot,.095),32.));
  d=nearer(d,vec2(capD(p,top+vec3(0.,.12,.28),foot+vec3(0.,.18,.15),.055),38.));
  d=nearer(d,vec2(bevelD(p-foot,vec3(.69,.14,.85),.08),32.));
 }
 // Small navigation lamps, fittings, antenna, and attitude thrusters.
 for(int k=0;k<2;k++){float signv=k==0?-1.:1.;
  d=nearer(d,vec2(bevelD(p-vec3(signv*w*.32,h*.02,l*.04),vec3(.055,.045,.25),.025),39.));
  d=nearer(d,vec2(capD(p,vec3(signv*w*.105,h*.23,-l*.23),vec3(signv*w*.105,h*.40,-l*.20),.027),38.));
  if(abs(uShipRCS.x)>.1&&signv*uShipRCS.x<0.){vec3 q=p-vec3(signv*w*.33,0.,-l*.20);d=nearer(d,vec2(capD(q,vec3(0.),vec3(signv*1.2,0.,0.),.095),34.));}
 }
 if(abs(uShipRCS.y)>.1){for(int k=0;k<2;k++){float x=(k==0?-1.:1.)*w*.21;d=nearer(d,vec2(capD(p,vec3(x,-h*.24,-l*.20),vec3(x,-h*.24-1.8,-l*.20),.20),34.));}}
 // Integrated wing-root hardpoints: twin autocannon receivers, barrels and missile rails.
 for(int side=0;side<2;side++){float sg=side==0?-1.:1.;vec3 q=p-vec3(sg*w*.265,-h*.05,l*.05);
 d=nearer(d,vec2(bevelD(q,vec3(.27,.20,1.1),.08),32.));
 d=nearer(d,vec2(cylinderZD(q-vec3(0.,0.,1.37),.09,.64),38.));
 d=nearer(d,vec2(bevelD(q-vec3(sg*.34,-.20,-.27),vec3(.17,.13,.92),.04),32.));
 for(int k=0;k<2;k++)d=nearer(d,vec2(cylinderZD(q-vec3(sg*(.36+float(k)*.24),-.35,-.1),.095,.65),36.));}
 return d;
}
vec3 craftColor(vec3 p,vec3 n,vec3 rd,float mat){
 vec3 sun=transpose(uShipBasis)*uSun;float light=max(dot(n,sun),0.),rough=.44;vec3 base=uShipPaint,emit=vec3(0.);
 float seam=max(1.-smoothstep(.012,.030,abs(fract(p.z*.28)-.5)),1.-smoothstep(.007,.022,abs(fract(p.x*.25)-.5)));
 float grain=noise3(p*37.)*.05;float wear=noise3(p*2.3+uShipLayout.z)*.06;
 base*=.87+grain+wear;base=mix(base,base*.30,seam*.50);
 if(mat==30.){float stripe=1.-smoothstep(.07,.13,abs(p.x-uShipDimensions.y*.035));base=mix(base,uShipAccent,stripe*.80);}
 if(mat==30.&&uShipView==1)base=vec3(.038,.051,.060)*(1.+grain);
 if(mat==31.){float fres=pow(1.-abs(dot(n,-rd)),4.);base=mix(vec3(.013,.036,.049),vec3(.22,.35,.41),fres);rough=.075;}
 if(mat==32.){base=vec3(.058,.072,.082)*(1.+grain);rough=.35;}
 if(mat==33.){base=vec3(.012,.024,.03);float core=1.-smoothstep(.05,.6,length(fract(p.xy*1.1)-.5));emit=vec3(.06,.55,.83)*uShipSystems.y*(.7+core*2.);rough=.8;}
 if(mat==34.){float core=pow(.5+.5*sin(p.z*9.+uTime*40.),2.);base=vec3(.02,.08,.15);emit=mix(vec3(.05,.65,2.0),vec3(1.8,2.8,3.0),core)*(.5+uShipSystems.y*1.5);}
 if(mat==35.){float signv=p.x<0.?-1.:1.;vec2 uv=(p.xy-vec2(signv*uShipDimensions.y*.072,uShipDimensions.z*.383))/vec2(uShipDimensions.y*.11,uShipDimensions.z*.120)+.5;uv=clamp(uv,vec2(.002),vec2(.998));uv=vec2((uv.x+(signv>0.?1.:0.))*.5,(1.-uv.y)*.5);base=vec3(.006,.010,.015);emit=textureLod(uCockpit,uv,0.).rgb*1.12;rough=.2;}
 if(mat==40.){
  float w=uShipDimensions.y,h=uShipDimensions.z;
  float col=clamp(floor(p.x/(w*.046)+3.),0.,5.),row=clamp(floor((h*.319-p.y)/(h*.058)),0.,1.);
  vec2 local=(p.xy-vec2((col-2.5)*w*.046,h*(.29-row*.058)))/vec2(w*.038,h*.046)+.5;
  vec2 uv=vec2((col+clamp(local.x,.003,.997))/6.,.5+(row+1.-clamp(local.y,.003,.997))*.25);
  vec3 ink=textureLod(uCockpit,uv,0.).rgb;base=ink*.32;emit=ink*.60;rough=.58;
 }
 if(mat==36.){base=mix(uShipPaint*.66,uShipAccent*.73,.3);float rib=step(.92,fract(p.z*1.7));base*=1.-rib*.65;}
 if(mat==37.){float grid=max(step(.88,fract(p.x*1.8)),step(.94,fract(p.z*2.5)));base=mix(vec3(.013,.044,.072),vec3(.16,.23,.28),grid);rough=.18;}
 if(mat==38.){base=vec3(.40,.47,.50);rough=.17;}
 if(mat==39.){base=vec3(.12);emit=p.x>0.?vec3(.12,1.6,.9):vec3(1.8,.20,.09);emit*=.7+.3*step(.92,fract(uTime*.55));}
 if(mat==35.)return emit+base*.2;
 vec3 maps=surfaceORM(p,n,.32);float metal=mat==31.?.12:mat==32.?.35:mat==38.?1.:mat==40.?0.:.76;
 base*=mappedAlbedo(p,n,.32)*.65+.35;rough*=.65+maps.g*.55;
 float ao=maps.r;if(uAOEnabled>.5&&uProbePass==0){float occ=0.;for(int j=1;j<=4;j++){float h=.05+float(j)*.11;occ+=max(0.,h-craftD(p+n*h).x)/h*.25;}ao*=1.-occ*.8;}
 vec3 normal=mappedNormal(p,n,.32);
 return shadePBR(base,uShipBasis*normal,uShipBasis*rd,rough,metal,ao,uShipPos+uShipBasis*p*.001,uShipView==1)+emit;

}
void spacecraft(vec3 rd,inout vec3 color,inout float depth){
 mat3 inv=transpose(uShipBasis);vec3 ro=inv*(-uShipPos)*1000.,dir=inv*rd;float r=max(uShipDimensions.x,uShipDimensions.y)*.87+13.;
 float l=uShipDimensions.x,w=uShipDimensions.y,h=uShipDimensions.z;
 vec2 bound=rayBox(ro,dir,vec3(-w*.57,-h*.30-2.4,-l*.61-(uShipSystems.y>.025?15.:1.)),vec3(w*.57,h*.92+l*.48*uShipSystems.z,l*.57));if(bound.y<0.||bound.x>bound.y||max(0.,bound.x)>depth*1000.)return;
 float t=max(0.,bound.x),end=min(bound.y,depth*1000.),mat=30.;bool hit=false;
 for(int k=0;k<144;k++){if(k>(uQuality==0?88:130)||t>end)break;vec2 d=craftD(ro+dir*t);float eps=max(.007,t*uFov/uResolution.y*.24);if(d.x<eps){mat=d.y;hit=true;break;}t+=max(.006,d.x*.68);}
 if(!hit||t*.001>depth)return;vec3 p=ro+dir*t;float e=max(.012,t*uFov/uResolution.y*.20);vec2 v=vec2(e,0.);vec3 n=normalize(vec3(craftD(p+v.xyy).x-craftD(p-v.xyy).x,craftD(p+v.yxy).x-craftD(p-v.yxy).x,craftD(p+v.yyx).x-craftD(p-v.yyx).x));
 color=uView==1?(uShipBasis*n)*.5+.5:craftColor(p,n,dir,mat);depth=t*.001;
}

// Conservative analytic ground shadow from the major hull and nacelle volumes.
float shipGroundShadow(vec3 worldPoint){
 vec3 ro=transpose(uShipBasis)*(worldPoint-uShipPos)*1000.,rd=transpose(uShipBasis)*uSun;
 float l=uShipDimensions.x,w=uShipDimensions.y,h=uShipDimensions.z;if(length(ro)>110.)return 1.;
 vec2 body=rayBox(ro,rd,vec3(-w*.15,-h*.24,-l*.43),vec3(w*.15,h*.28,l*.37));
 vec2 wing=rayBox(ro,rd,vec3(-w*.44,-h*.12,-l*.23),vec3(w*.44,0.,l*.075));
 float shadow=(body.y>max(.10,body.x)||wing.y>max(.10,wing.x))?.38:1.;
 for(int k=0;k<2;k++){vec3 q=ro-vec3((k==0?-1.:1.)*w*.32,0.,-l*.35);vec2 e=rayBox(q,rd,vec3(-h*.19,-h*.19,-l*.15),vec3(h*.19,h*.19,l*.15));if(e.y>max(.1,e.x))shadow=min(shadow,.40);}
 return shadow;
}


vec2 plantD(vec3 p,int variation){
 vec2 d=vec2(100.,17.);
 if(uFlora==0){
  d=vec2(capD(p,vec3(0.),vec3(0.,1.6,0.),.085),16.);
  d=nearer(d,vec2(capD(p,vec3(0.,.7,0.),vec3(.55,1.42,.10),.045),16.));d=nearer(d,vec2(capD(p,vec3(0.,1.,0.),vec3(-.5,1.65,-.1),.035),16.));
  d=nearer(d,vec2(ellD(p-vec3(0.,2.,0.),vec3(.76,.83,.69)),17.));d=nearer(d,vec2(ellD(p-vec3(.53,1.55,.10),vec3(.52,.54,.47)),17.));d=nearer(d,vec2(ellD(p-vec3(-.47,1.83,-.12),vec3(.51,.55,.48)),17.));
 }else if(uFlora==1){
  d=vec2(capD(p,vec3(0.),vec3(0.,1.08,0.),.12),16.);float cap=ellD(p-vec3(0.,1.15,0.),vec3(.88,.37,.82));cap=max(cap,.97-p.y);d=nearer(d,vec2(cap,18.));d=nearer(d,vec2(ellD(p-vec3(.50,.68,.14),vec3(.48,.21,.45)),18.));
 }else if(uFlora==2){
  d=vec2(capD(p,vec3(0.,.1,0.),vec3(0.,1.6,0.),.16),17.);d=nearer(d,vec2(capD(p,vec3(0.,.6,0.),vec3(.5,.72,0.),.11),17.));d=nearer(d,vec2(capD(p,vec3(.5,.72,0.),vec3(.5,1.24,0.),.11),17.));d=nearer(d,vec2(capD(p,vec3(0.,.9,0.),vec3(-.42,1.13,.10),.09),17.));
 }else if(uFlora==3){vec3 q=p-vec3(0.,.9,0.);q.y*=.48;float a=(abs(q.x)+abs(q.y)+abs(q.z)-.57)*.57735;vec3 r=p-vec3(.43,.40,.18);r.y*=.55;float b=(abs(r.x)+abs(r.y)+abs(r.z)-.30)*.57735;d=vec2(min(a,b),19.);}
 else {d=vec2(capD(p,vec3(0.),vec3(0.,.65,0.),.13),17.);for(int j=0;j<4;j++){float a=float(j)*1.57+.4;vec3 end=vec3(cos(a)*.60,1.+.24*sin(a),sin(a)*.60);d=nearer(d,vec2(capD(p,vec3(0.,.35,0.),end,.12),17.));d=nearer(d,vec2(length(p-end)-.21,18.));}}
 if(uFlora==0&&d.y==17.)d.x+=(noise3(p*8.+float(variation)*.63)-.5)*.105;
 return d;
}
// Five articulated alien anatomies; hard shell, hide, sensory pits and jointed limbs.
// No oversized luminous eyes or soft, toy-like spherical body parts.
float smoothUnion(float a,float b,float k){float h=clamp(.5+.5*(b-a)/k,0.,1.);return mix(b,a,h)-k*h*(1.-h);}
// Faceted anatomical masses preserve Blox planes without voxel piles or oversized heads.
float taperedLimb(vec3 p,vec3 a,vec3 b,float r0,float r1){vec3 ab=b-a;float h=clamp(dot(p-a,ab)/dot(ab,ab),0.,1.);return (length(p-a-ab*h)-mix(r0,r1,h))/sqrt(1.+(r1-r0)*(r1-r0)/dot(ab,ab));}
float anatomyD(vec3 p,vec3 r){vec3 q=abs(p/r);float d=max(max(q.x,max(q.y,q.z))-.96,max(q.x+q.y,max(q.y+q.z,q.x+q.z))*.7071-1.10);d=max(d,(q.x+q.y+q.z)*.57735-1.22);return mix(ellD(p,r),d*min(r.x,min(r.y,r.z)),.58);}
vec2 animalD(vec3 p,int i){
 float yaw=uAnimalInfo[i].x;p.xz=mat2(cos(yaw),-sin(yaw),sin(yaw),cos(yaw))*p.xz;
 int family=int(uAnimalInfo[i].w)%5;bool hunter=uAnimalInfo[i].y>.5;
 if(hunter)family=1;
 float phase=uTime*2.6+uAnimalInfo[i].z,sway=sin(phase*2.)*.012;
 vec2 d=vec2(100.,20.);
 if(family==0||family==1){ // Cervid / canid: rib cage, pelvis, scapula, neck, muzzle, four jointed legs.
  bool deer=family==0;float back=deer?1.01:.83;
  d=vec2(anatomyD(p-vec3(0.,back+sway,.03),vec3(deer?.27:.23,.29,.64)),20.);
  d.x=smoothUnion(d.x,anatomyD(p-vec3(0.,back+.04,.43),vec3(.25,.32,.29)),.08);
  d.x=smoothUnion(d.x,anatomyD(p-vec3(0.,back,-.43),vec3(.25,.26,.28)),.08);
  vec3 neckBase=vec3(0.,back+.06,.45),head=deer?vec3(0.,1.56,.88):vec3(0.,.98,.90);
  d.x=smoothUnion(d.x,capD(p,neckBase,head,deer?.12:.135),.07);
  d=nearer(d,vec2(anatomyD(p-head,vec3(.13,.16,.23)),20.));
  d=nearer(d,vec2(anatomyD(p-head-vec3(0.,-.06,.22),vec3(.09,.075,.16)),24.));
  d=nearer(d,vec2(anatomyD(p-head-vec3(0.,-.055,.365),vec3(.075,.045,.035)),26.));
  for(int k=0;k<4;k++){float side=k%2==0?-1.:1.,front=k<2?1.:-1.,a=phase+float(k%2)*PI+(k<2?0.:PI),stride=sin(a)*.13,lift=max(0.,cos(a))*.085;
   vec3 hip=vec3(side*.20,back,front*.44),knee=vec3(side*.21,.51,front*.45+(front>0.?-.04:.16)+stride*.35),hock=vec3(side*.21,.23,front*.48+(front>0.?0.:-.11)+stride*.65),foot=vec3(side*.21,.055+lift,front*.48+stride);
   d.x=smoothUnion(d.x,taperedLimb(p,hip,knee,deer?.066:.088,deer?.033:.049),.045);d=nearer(d,vec2(capD(p,knee,hock,deer?.031:.046),20.));d=nearer(d,vec2(capD(p,hock,foot,.025),24.));
   d=nearer(d,vec2(anatomyD(p-foot,vec3(deer?.045:.063,.045,deer?.065:.095)),25.));
  }
  for(int k=0;k<2;k++){float side=k==0?-1.:1.;vec3 eye=head+vec3(side*.116,.035,.12);d=nearer(d,vec2(ellD(p-eye,vec3(.018,.016,.026)),26.));
   vec3 ear=head+vec3(side*.13,.19,-.085);vec3 q=p-ear;q.xy=mat2(.93,-side*.37,side*.37,.93)*q.xy;float earShape=deer?anatomyD(q,vec3(.066,.155,.024)):max(max(abs(q.z)-.023,abs(q.y)-.115),abs(q.x)+q.y*.47-.055);d=nearer(d,vec2(earShape,24.));
   if(deer){vec3 base=head+vec3(side*.07,.16,-.08),tip=head+vec3(side*.22,.52,-.19);d=nearer(d,vec2(capD(p,base,tip,.017),25.));for(int j=0;j<2;j++){vec3 branch=mix(base,tip,.4+float(j)*.3);d=nearer(d,vec2(capD(p,branch,branch+vec3(side*.08,.14,.13),.011),25.));}}
  }
  vec3 tail=deer?vec3(0.,back-.20,-.79):vec3(.15*sin(phase*.5),.34,-1.19);d=nearer(d,vec2(capD(p,vec3(0.,back,-.58),tail,deer?.041:.085),20.));
 }else if(family==2){ // Ostrich reference: torso, folded wings, long cervical column, beak, two toes.
  d=vec2(anatomyD(p-vec3(0.,1.10+sway,-.18),vec3(.34,.38,.50)),20.);
  d=nearer(d,vec2(capD(p,vec3(0.,1.29,.20),vec3(0.,1.88,.35),.052),24.));
  d=nearer(d,vec2(anatomyD(p-vec3(0.,1.93,.37),vec3(.085,.091,.135)),24.));
  d=nearer(d,vec2(anatomyD(p-vec3(0.,1.90,.52),vec3(.056,.032,.095)),25.));
  for(int k=0;k<2;k++){float side=k==0?-1.:1.,a=phase+float(k)*PI,stepv=sin(a)*.20;vec3 hip=vec3(side*.20,1.03,-.1),knee=vec3(side*.23,.72,.15+stepv*.3),ankle=vec3(side*.22,.29,-.16+stepv*.6),foot=vec3(side*.23,.045+max(0.,cos(a))*.09,.02+stepv);
   d=nearer(d,vec2(capD(p,hip,knee,.066),20.));d=nearer(d,vec2(capD(p,knee,ankle,.035),24.));d=nearer(d,vec2(capD(p,ankle,foot,.025),24.));
   for(int toe=0;toe<2;toe++)d=nearer(d,vec2(capD(p,foot,foot+vec3(float(toe)*.07-.025,0.,toe==0?.17:.11),.017),25.));
   d=nearer(d,vec2(anatomyD(p-vec3(side*.30,1.13,-.19),vec3(.08,.24,.38)),27.));
   d=nearer(d,vec2(ellD(p-vec3(side*.078,1.95,.41),vec3(.011,.012,.016)),26.));
  }
 }else if(family==3){ // Ground beetle: two elytra, thorax, head, six articulated legs and two antennae.
  d=vec2(anatomyD(p-vec3(0.,.47+sway,-.25),vec3(.34,.23,.55)),24.);
  d=nearer(d,vec2(anatomyD(p-vec3(0.,.46,.34),vec3(.25,.21,.23)),24.));
  d=nearer(d,vec2(anatomyD(p-vec3(0.,.39,.62),vec3(.16,.13,.19)),20.));
  for(int k=0;k<6;k++){float side=k%2==0?-1.:1.,z=float(k/2)*.16+.18,a=phase+float(k%2)*PI+float(k/2)*1.2,fan=float(k/2-1)*.27;vec3 hip=vec3(side*.21,.4,z),joint=vec3(side*.49,.30,z+fan),ankle=vec3(side*.64,.06+max(0.,cos(a))*.045,z+fan*1.3+sin(a)*.10);d=nearer(d,vec2(capD(p,hip,joint,.032),24.));d=nearer(d,vec2(capD(p,joint,ankle,.020),25.));d=nearer(d,vec2(capD(p,ankle,ankle+vec3(side*.08,-.023,.08),.012),25.));}
  for(int k=0;k<2;k++){float side=k==0?-1.:1.;d=nearer(d,vec2(capD(p,vec3(side*.10,.44,.74),vec3(side*.31,.57,1.0),.012),25.));d=nearer(d,vec2(ellD(p-vec3(side*.14,.44,.66),vec3(.023,.025,.035)),26.));}
 }else{ // Monitor lizard: low trunk, elongated head, four sprawling limbs, tapering tail.
  d=vec2(anatomyD(p-vec3(0.,.40+sway,.0),vec3(.26,.19,.65)),20.);
  d=nearer(d,vec2(capD(p,vec3(0.,.45,.4),vec3(0.,.53,.79),.11),20.));d=nearer(d,vec2(anatomyD(p-vec3(0.,.53,.91),vec3(.12,.10,.27)),24.));
  for(int j=0;j<3;j++){float a=float(j)/3.,b=float(j+1)/3.;d.x=smoothUnion(d.x,taperedLimb(p,vec3(a*.16,.39-a*.24,-.48-a*.9),vec3(b*.16,.39-b*.24,-.48-b*.9),.11*(1.-a)+.006,.11*(1.-b)+.006),.025);}
  for(int k=0;k<4;k++){float side=k%2==0?-1.:1.,front=k<2?1.:-1.,stepv=sin(phase+float(k)*PI*.5)*.1;vec3 hip=vec3(side*.19,.4,front*.41),knee=vec3(side*.42,.24,front*.30+stepv*.4),foot=vec3(side*.53,.05,front*.48+stepv);d=nearer(d,vec2(capD(p,hip,knee,.051),20.));d=nearer(d,vec2(capD(p,knee,foot,.028),24.));for(int toe=0;toe<5;toe++)d=nearer(d,vec2(capD(p,foot,foot+vec3(side*(.04+sin(float(toe)*.7)*.045),-.017,.09-float(toe)*.04),.008),25.));}
  for(int k=0;k<2;k++){float side=k==0?-1.:1.;d=nearer(d,vec2(ellD(p-vec3(side*.103,.575,.90),vec3(.018,.013,.026)),26.));}
 }
 return d;
}

vec3 faunaColor(vec3 p,vec3 n,vec3 dir,int j,float mat){
 float identity=uAnimalInfo[j].w;float pore=noise3(p*113.+identity),mottle=noise3(p*6.3+identity*3.7),fold=.5+.5*sin(p.y*53.+noise3(p*11.)*5.);int biome=int(uClimate[uSiteBody].z+.5);
 vec3 skin=mix(vec3(.075,.082,.068),vec3(.27,.23,.15),mottle);if(uFlora==1)skin=mix(vec3(.10,.07,.095),vec3(.25,.20,.23),mottle);if(uFlora==3)skin=mix(vec3(.075,.095,.13),vec3(.28,.33,.31),mottle);if(uFlora==4)skin=mix(vec3(.07,.13,.11),vec3(.24,.29,.20),mottle);
 skin*=.74+.15*pore+.11*fold;float rough=.77;
 if(mat==24.){skin=mix(skin,vec3(.13,.15,.135),.25);float plates=1.-smoothstep(.015,.055,abs(fract(p.z*5.+noise3(p*3.)*.18)-.5));skin*=1.-plates*.43;rough=.42;}
 if(int(identity)%5==3&&uAnimalInfo[j].y<.5&&p.z<.12&&mat==24.){skin*=mix(.42,1.,smoothstep(.004,.016,abs(p.x)));rough=.28;}
 if(mat==25.){skin=mix(vec3(.075,.055,.038),vec3(.39,.33,.20),mottle)*(.8+pore*.2);rough=.43;}
 if(mat==26.){skin=vec3(.009,.014,.012);rough=.065;}
 if(mat==27.){float veins=1.-smoothstep(.008,.030,abs(sin(p.z*28.+p.y*13.)));skin=mix(vec3(.19,.115,.07),vec3(.045,.055,.04),veins*.6);rough=.78;}
 // Organic surfaces remain dielectric: no metallic animal skin.
 vec3 normal=organicNormal(p,n);float ao=1.;if(uAOEnabled>.5&&uProbePass==0){float occ=0.;for(int k=1;k<=3;k++){float h=float(k)*.065;occ+=max(0.,h-animalD(p+n*h,j).x)/h/3.;}ao=1.-occ*.7;}
 return shadePBR(skin,uPlantBasis*normal,uPlantBasis*dir,rough,0.,ao,uAnimals[j].xyz+uPlantBasis*p*uAnimals[j].w,false);

}

void biology(vec3 rd,inout vec3 color,inout float depth){
 mat3 inv=transpose(uPlantBasis);vec3 dir=inv*rd;
 // A conservative CPU screen-tile list skips instances that cannot touch
 // this pixel. Overflow tiles explicitly fall back to the complete list.
 ivec2 tile=ivec2(gl_FragCoord.xy)/32;ivec2 tileBase=ivec2(tile.x*24,tile.y);
 int count=int(texelFetch(uBioTiles,tileBase,0).r);
 for(int slot=0;slot<56;slot++){
  if(count!=255&&slot>=count)break;
  int i=slot;if(count!=255)i=int(texelFetch(uBioTiles,tileBase+ivec2(slot+1,0),0).r)-1;
  bool animal=i>=40;int j=animal?i-40:i;if((!animal&&j>=uPlantCount)||(animal&&j>=uAnimalCount))continue;
  vec4 obj=animal?uAnimals[j]:uPlants[j];float scale=obj.w;if(scale<=0.)continue;
  vec3 ro=inv*(-obj.xyz)/scale;vec2 bound=sphere(ro-vec3(0.,1.1,0.),dir,animal?1.75:1.95);
  if(bound.y<0.||bound.x>bound.y||max(0.,bound.x)*scale>depth)continue;
  float t=max(bound.x,0.),end=min(bound.y,depth/scale),mat=0.;bool hit=false;
  for(int k=0;k<48;k++){if(t>end)break;vec3 p=ro+dir*t;vec2 d=animal?animalD(p,j):plantD(p,j);float eps=max(.008,t*scale*uFov/uResolution.y/scale*.4);if(d.x<eps){hit=true;mat=d.y;break;}t+=max(d.x*.68,.003);}
  if(!hit||t*scale>=depth)continue;vec3 p=ro+dir*t;vec2 e=vec2(.014,0.);vec3 n;
  if(animal)n=normalize(vec3(animalD(p+e.xyy,j).x-animalD(p-e.xyy,j).x,animalD(p+e.yxy,j).x-animalD(p-e.yxy,j).x,animalD(p+e.yyx,j).x-animalD(p-e.yyx,j).x));
  else n=normalize(vec3(plantD(p+e.xyy,j).x-plantD(p-e.xyy,j).x,plantD(p+e.yxy,j).x-plantD(p-e.yxy,j).x,plantD(p+e.yyx,j).x-plantD(p-e.yyx,j).x));
  vec3 base=uPlantColor*(.62+.7*noise3(p*17.+float(j))),emission=vec3(0.);if(mat==16.)base=vec3(.12,.065,.031);if(mat==18.){base*=1.28;emission=base*.21*(.5+.5*sin(p.y*40.));}if(mat==19.){base=mix(uPlantColor,vec3(.58,.77,.95),.4);emission=base*.16;}if(mat==20.)base=mix(uPlantColor,vec3(.37,.22,.10),.57)*(.7+.3*sin(p.z*13.));if(mat==14.&&!animal)emission=vec3(.04,.17,.08);
  float diffuse=max(dot(n,inv*uSun),0.);float spec=pow(max(dot(n,normalize(inv*uSun-dir)),0.),mat==19.?80.:18.)*.2;
  vec3 bioColor=animal?faunaColor(p,n,dir,j,mat):shadePBR(base,uPlantBasis*organicNormal(p,n),rd,mat==19.?.25:.88,0.,.85+.15*smoothstep(.1,.8,p.y),rd*t*scale,false)+emission;
  color=uView==1?(uPlantBasis*n)*.5+.5:bioColor;depth=t*scale;
 }
}

// Low-cost local contact approximation. It anchors wildlife to the surface;
// it is not advertised as ray-traced global illumination or skeletal foot IK.
float faunaContact(vec3 worldPoint){
 if(uQuality==0)return 1.;float shadow=1.;mat3 inv=transpose(uPlantBasis);vec3 sun=inv*uSun;
 for(int j=0;j<16;j++){if(j>=uAnimalCount)break;float scale=uAnimals[j].w;if(scale<=0.)continue;
  vec3 q=inv*(worldPoint-uAnimals[j].xyz)/scale;if(abs(q.y)>.35||dot(q.xz,q.xz)>16.)continue;
  q.xz+=sun.xz/max(.3,sun.y)*.57;float yaw=uAnimalInfo[j].x;q.xz=mat2(cos(yaw),-sin(yaw),sin(yaw),cos(yaw))*q.xz;
  float falloff=1.-smoothstep(.34,1.28,length(q.xz/vec2(.65,1.15)));shadow=min(shadow,1.-falloff*.52*(1.-smoothstep(.12,.35,abs(q.y))));
 }return shadow;
}

vec2 combatHull(vec3 p,int type){
 if(type==2||type==3){ // Ground sentry / remote pilot: fitted articulated armor silhouette.
  vec2 d=vec2(bevelD(p-vec3(0.,.35,0.),vec3(.25,.37,.17),.06),32.);
  d=nearer(d,vec2(bevelD(p-vec3(0.,.85,0.),vec3(.145,.16,.14),.035),38.));
  d=nearer(d,vec2(bevelD(p-vec3(0.,.87,.135),vec3(.115,.055,.02),.01),31.));
  for(int k=0;k<2;k++){float side=k==0?-1.:1.;d=nearer(d,vec2(capD(p,vec3(side*.13,.1,0.),vec3(side*.17,-.6,0.),.09),32.));d=nearer(d,vec2(capD(p,vec3(side*.30,.57,0.),vec3(side*.28,.2,.29),.075),38.));}
  d=nearer(d,vec2(bevelD(p-vec3(.20,.28,.36),vec3(.06,.09,.38),.025),32.));return d;
 }
 float hull=bevelD(p,vec3(2.3,1.3,9.),.28);hull=max(hull,abs(p.x)*.8+p.z*.53-4.2);vec2 d=vec2(hull,30.);
 float wing=bevelD(p-vec3(0.,-.25,-1.5),vec3(8.2,.28,4.8),.18);wing=max(wing,p.z+abs(p.x)*.73-3.1);d=nearer(d,vec2(wing,36.));
 d=nearer(d,vec2(bevelD(p-vec3(0.,1.23,2.4),vec3(1.08,.56,2.2),.28),31.));
 for(int k=0;k<2;k++){float side=k==0?-1.:1.;vec3 q=p-vec3(side*4.8,-.1,-4.9);d=nearer(d,vec2(bevelD(q,vec3(.95,.76,3.),.26),32.));d=nearer(d,vec2(cylinderZD(q-vec3(0.,0.,-3.),.58,.13),34.));d=nearer(d,vec2(cylinderZD(p-vec3(side*3.1,-.45,4.1),.12,1.6),38.));
 float fin=bevelD(p-vec3(side*2.1,1.9,-5.7),vec3(.13,1.8,1.8),.06);fin=max(fin,p.z*.38+p.y*.63-.1);d=nearer(d,vec2(fin,36.));}
 return d;
}
void combatScene(vec3 rd,inout vec3 color,inout float depth){
 for(int i=0;i<16;i++){if(i>=uCombatCount)break;int type=int(uCombatForward[i].w+.5);float scale=type>=2?1.:1.;
  vec3 forward=normalize(uCombatForward[i].xyz),up=normalize(uCombatUp[i].xyz),right=normalize(cross(forward,up));up=normalize(cross(right,forward));mat3 basis=mat3(right,up,forward);
  vec3 ro=transpose(basis)*(-uCombatBodies[i].xyz)*1000.,dir=transpose(basis)*rd;float radius=type>=2?1.4:11.;vec2 bound=sphere(ro,dir,radius);if(bound.y<0.||bound.x>bound.y||bound.x*.001>depth)continue;
  float t=max(.0,bound.x);vec2 d=vec2(1.);bool hit=false;for(int k=0;k<64;k++){if(t>min(bound.y,depth*1000.))break;d=combatHull(ro+dir*t,type);if(d.x<max(.008,t*uFov/uResolution.y*.32)){hit=true;break;}t+=max(.005,d.x*.75);}
  if(!hit)continue;vec3 p=ro+dir*t;float eps=max(.008,t*uFov/uResolution.y*.18);vec2 e=vec2(eps,0.);vec3 n=normalize(vec3(combatHull(p+e.xyy,type).x-combatHull(p-e.xyy,type).x,combatHull(p+e.yxy,type).x-combatHull(p-e.yxy,type).x,combatHull(p+e.yyx,type).x-combatHull(p-e.yyx,type).x));
  vec3 base=type==1||type==3?vec3(.19,.28,.27):vec3(.29,.105,.065);float rough=.47,metal=.72;vec3 emission=vec3(0.);
  if(d.y==32.)base=vec3(.055,.065,.08);if(d.y==31.){base=vec3(.016,.038,.052);rough=.09;metal=.2;}if(d.y==38.){base=vec3(.36,.38,.39);rough=.25;}if(d.y==34.)emission=vec3(.15,1.25,2.5);
  base*=mappedAlbedo(p,n,.37);float ao=1.;if(uAOEnabled>.5&&uProbePass==0){for(int j=1;j<=min(3,uMaxSteps);j++){float h=float(j)*.18;ao-=max(0.,h-combatHull(p+n*h,type).x)/h*.22;}}
  color=shadePBR(base,basis*mappedNormal(p,n,.37),rd,rough,metal,ao,rd*t*.001,false)+emission;depth=t*.001;if(uView==1)color=(basis*n)*.5+.5;
 }
 // Ray-to-segment trails are depth tested against world geometry and ships.
 for(int i=0;i<64;i++){if(i>=uShotCount)break;vec3 a=uShotsA[i].xyz,b=uShotsB[i].xyz;float kind=uShotsA[i].w;vec3 segment=b-a;float len=length(segment),along=0.,t=0.;
  if(len<.0000001){t=dot(a,rd);}else{vec3 axis=segment/len;float c=dot(rd,axis),den=max(1.-c*c,.00001);t=(dot(a,rd)-c*dot(a,axis))/den;along=clamp(t*c-dot(a,axis),0.,len);t=dot(a+axis*along,rd);}
  if(t<=0.||t>depth)continue;vec3 closest=len<.0000001?a:a+segment*(along/len);float distance=length(rd*t-closest);
  float radius=kind==3.?.006:kind==2.?.00055:.00016;radius=max(radius,t*uFov/uResolution.y*.65);
  float glow=exp(-distance*distance/(radius*radius))*uShotsB[i].w;vec3 ink=kind==1.?vec3(.15,1.7,2.5):kind==4.?vec3(2.5,.19,.055):vec3(2.6,1.3,.31);color+=ink*glow*(kind==3.?3.:1.8);
 }
}
vec2 gunD(vec3 p){
 if(uGunType==1){
  vec2 d=vec2(bevelD(p-vec3(0.,.0,.06),vec3(.034,.037,.105),.008),32.);
  d=nearer(d,vec2(bevelD(p-vec3(0.,-.07,-.015),vec3(.031,.07,.038),.008),30.));
  d=nearer(d,vec2(cylinderZD(p-vec3(0.,.008,.164),.014,.009),38.));
  d=nearer(d,vec2(bevelD(p-vec3(0.,.044,.13),vec3(.006,.009,.011),.002),38.));
  d=nearer(d,vec2(bevelD(p-vec3(0.,.044,-.03),vec3(.020,.009,.012),.003),38.));
  d=nearer(d,vec2(bevelD(p-vec3(.02,-.11,-.055),vec3(.055,.045,.068),.017),40.));
  d=nearer(d,vec2(capD(p,vec3(.02,-.13,-.065),vec3(.065,-.26,-.28),.043),30.));return d;
 }
 vec2 d=vec2(bevelD(p-vec3(0.,0.,0.),vec3(.06,.07,.28),.014),32.);
 d=nearer(d,vec2(bevelD(p-vec3(0.,-.11,-.06),vec3(.044,.115,.065),.010),30.));
 d=nearer(d,vec2(bevelD(p-vec3(0.,-.06,-.29),vec3(.055,.065,.10),.014),32.));
 d=nearer(d,vec2(cylinderZD(p-vec3(0.,.01,.34),.022,.14),38.));
 d=nearer(d,vec2(bevelD(p-vec3(0.,.09,-.07),vec3(.032,.025,.105),.009),38.));
 d=nearer(d,vec2(bevelD(p-vec3(0.,.105,.16),vec3(.007,.022,.012),.004),38.));
 vec3 grip=p-vec3(0.,.0,.19);grip.z=mod(grip.z+.012,.025)-.012;d=nearer(d,vec2(max(boxD(grip,vec3(.066,.038,.004)),boxD(p-vec3(0.,0.,.17),vec3(.068,.04,.1))),38.));
 // Gloved support hand and sleeve attach to the receiver.
 d=nearer(d,vec2(bevelD(p-vec3(-.04,-.08,.10),vec3(.066,.046,.071),.02),40.));
 d=nearer(d,vec2(capD(p,vec3(-.10,-.11,.09),vec3(-.22,-.25,-.13),.055),30.));return d;
}
void firstPersonWeapon(vec3 rd,inout vec3 color){
 if(uWalking==0||uArmed==0||uProbePass==1)return;
 mat3 basis=mat3(uRight,uUp,uForward);vec3 dir=transpose(basis)*rd,origin=vec3(uGunType==1?.18:.27,uGunType==1?-.19:-.23,(uGunType==1?.48:.60)-uGunRecoil*.045),ro=-origin;
 vec2 bound=rayBox(ro,dir,vec3(-.3,-.35,-.45),vec3(.10,.14,.51));if(bound.y<0.||bound.x>bound.y)return;float t=max(.0,bound.x);vec2 d;bool hit=false;
 for(int k=0;k<64;k++){if(t>bound.y)break;d=gunD(ro+dir*t);if(d.x<.001){hit=true;break;}t+=max(.0007,d.x*.75);}if(!hit)return;
 vec3 p=ro+dir*t;vec2 e=vec2(.001,0.);vec3 n=normalize(vec3(gunD(p+e.xyy).x-gunD(p-e.xyy).x,gunD(p+e.yxy).x-gunD(p-e.yxy).x,gunD(p+e.yyx).x-gunD(p-e.yyx).x));
 vec3 base=d.y==38.?vec3(.30,.32,.34):d.y==40.?vec3(.11,.105,.08):vec3(.075,.087,.083);base*=mappedAlbedo(p,n,3.);
 float ao=1.;if(uAOEnabled>.5)for(int j=1;j<=min(3,uMaxSteps);j++){float h=float(j)*.014;ao-=max(0.,h-gunD(p+n*h).x)/h*.23;}
 color=shadePBR(base,basis*mappedNormal(p,n,3.),rd,d.y==38.?.28:.64,d.y==40.?0.:.8,ao,vec3(0.),false);
}
vec3 tonemap(vec3 x){return clamp((x*(2.51*x+.03))/(x*(2.43*x+.59)+.14),0.,1.);}
void main(){
  if(uArtworkActive==1){vec2 pixel=vec2(gl_FragCoord.x/uResolution.x,1.-gl_FragCoord.y/uResolution.y);vec2 a=(pixel-uArtworkRect.xy)/uArtworkRect.zw;if(all(greaterThanEqual(a,vec2(0.)))&&all(lessThanEqual(a,vec2(1.)))&&texture(uArtworkMask,a).a>.99){fragColor=vec4(0.,0.,0.,1.);return;}}
  vec2 uv=(gl_FragCoord.xy*2.-uResolution)/uResolution.y;
  vec3 rd=normalize(uForward+uFov*(uv.x*uRight+uv.y*uUp));
  // Aft rooms have opaque floors, walls and ceilings. Keep tracing rays that can
  // escape through the forward bridge glazing; skip the world behind the hull.
  if(uInteriorActive==1){vec3 dir=transpose(uShipBasis)*rd;dir.z=-dir.z;vec2 bounds=rayBox(uInteriorOrigin,dir,vec3(-uInteriorBounds.x,-1.43,-3.6),vec3(uInteriorBounds.x,2.27,uInteriorBounds.y));vec3 exitPoint=uInteriorOrigin+dir*bounds.y;if(bounds.y>0.&&exitPoint.z>uInteriorBounds.z+.1){fragColor=vec4(0.,0.,0.,1.);return;}}
  vec3 color=sky(rd);float nearest=FAR;int hit=-1,work=0;vec3 local=vec3(0.);
  // Early analytic architecture depth avoids tracing terrain hidden by the city/hangar.
  if(uMeshForeground==0){spacecraft(rd,color,nearest);architecture(rd,color,nearest,false);architecture(rd,color,nearest,true);}
  float craftDepth=nearest;
  // Opaque mesh paving provides a conservative background-depth bound.
  // No terrain hidden under the matching compact apron needs a ray march.
  if(uMeshForeground==1&&uSiteBody>=0){vec3 ro=transpose(uSiteBasis)*(-uSitePos),dir=transpose(uSiteBasis)*rd;float t=(.001-ro.y)/dir.y;vec3 p=ro+dir*t;if(t>0.&&abs(p.x)<.239&&abs(p.z)<.239){nearest=t;color=vec3(.1);}}

  for(int i=0;i<min(20,uCount);i++){
    if(i>=uCount)break;vec3 ro=-uBodies[i].xyz/uBodies[i].w;
    vec2 broad=sphere(ro,rd,1.+uProps[i].y);
    if(broad.y<0.||broad.x> broad.y||max(broad.x,0.)*uBodies[i].w>nearest)continue;
    int steps=0;float t=trace(ro,rd,i,nearest/uBodies[i].w,steps),km=t*uBodies[i].w;
    // Keep continuous ground underneath the fading detail patch. A fixed
    // near-distance skip exposed sky through its edge and cut into mountains.
    if(km<nearest&&t<FAR*.1){nearest=km;hit=i;local=ro+rd*t;work=steps;}
  }
  if(hit>=0){
    float eps=max(1.2e-6,nearest/uBodies[hit].w*uFov/uResolution.y*.65);
    // Use inexpensive hit derivatives at distance; reject degenerate horizon quads.
    vec3 gradient=cross(dFdx(local),dFdy(local));
    // March termination distances form bands when differentiated. In planetary
    // flight use the continuous field normal; the local cache makes it cheap.
    vec3 n=dot(gradient,gradient)>1.e-24?normalize(gradient):normalize(local);
#ifdef FLOAT_TERRAIN_FILTERING
    if(nearest<35.)n=flightNormal(local,hit,max(.001/uBodies[hit].w,eps*2.),n);
#else
    n=flightNormal(local,hit,eps,normalize(local));
#endif
    if(dot(n,local)<0.)n=-n;
    color=material(local,n,rd,hit,nearest);
    if(uView==1)color=n*.5+.5;
    if(uView==2)color=mix(vec3(.02,.14,.27),vec3(1.,.16,.025),float(work)/float(uMaxSteps));
  }
  if(uSiteBody>=0&&nearest<2.&&uAOEnabled>.5)color*=faunaContact(rd*nearest);
  if(uMeshForeground==0){biology(rd,color,nearest);combatScene(rd,color,nearest);}
  if(uView==0&&nearest<craftDepth&&uShipView==0)color*=shipGroundShadow(rd*nearest);
  if(uSiteBody>=0&&(int(uClimate[uSiteBody].z+.5)==6||int(uProps[uSiteBody].x+.5)==3)){
    vec3 ro=transpose(uSiteBasis)*(-uSitePos);vec3 dir=transpose(uSiteBasis)*rd;
    vec2 dome=sphere(ro,dir,.89);float t=dome.x>0.?dome.x:dome.y;
    if(t>0.&&t<nearest){vec3 p=ro+dir*t;if(p.y>0.){vec3 nn=normalize(p);float edge=pow(1.-abs(dot(nn,dir)),3.);float lines=pow(abs(sin(atan(p.z,p.x)*32.)),80.)*.15+pow(abs(sin(asin(nn.y)*26.)),80.)*.12;color=mix(color,vec3(.12,.36,.35),.055+edge*.25+lines);}}
  }
  if(uView==0){
    for(int i=0;i<min(20,uCount);i++){if(i>=uCount)break;color=ring(color,rd,nearest,i);color=applyCloud(color,rd,nearest,i);}
    for(int i=0;i<min(20,uCount);i++){if(i>=uCount)break;color=atmosphere(color,rd,nearest,i);}
  }
  // Ship-local landing lamps illuminate nearby rendered surfaces in front of the craft.
  if(uCockpitMotion.w>.5&&nearest<.35&&abs(nearest-craftDepth)>.00005){
    vec3 lamp=rd*nearest-uShipPos;float dist=length(lamp);vec3 local=transpose(uShipBasis)*lamp;
    float cone=smoothstep(.60,.90,local.z/max(dist,.00001));
    color+=vec3(.88,.91,.80)*cone*max(0.,1.-dist/.35)*.45;
  }
  if(uSpeedEffects>.5&&uShipSystems.w>.7&&nearest>.08){
    float r=length(uv),angle=atan(uv.y,uv.x),sector=floor((angle+PI)*31.);float id=hash21(vec2(sector,43.));
    float line=1.-smoothstep(.015,.05,abs(fract((angle+PI)*31.)-.5));float travel=fract(uTime*(.45+id*.75)+id*19.);
    float head=.08+travel*travel*2.6,tail=.055+uShipSystems.w*.38,streak=smoothstep(head-tail,head-tail*.8,r)*(1.-smoothstep(head-.015,head+.015,r));
    color+=vec3(.16,.31,.40)*line*streak*step(.52,id)*uShipSystems.w*.24;
  }
  if(uMeshForeground==0)firstPersonWeapon(rd,color);
  if(uProbePass==1){fragColor=vec4(clamp(color,0.,1.),1.);return;}
  if(uView>=3){fragColor=vec4(clamp(color,0.,1.),1.);return;}
  color=pow(tonemap(max(color,vec3(0.))*1.08),vec3(1./2.2));
  float vignette=1.-.10*pow(clamp(length(uv)*.48,0.,1.),2.);color*=vignette;
  color+=(hash21(gl_FragCoord.xy)-.5)/255.;fragColor=vec4(color,1.);
}
