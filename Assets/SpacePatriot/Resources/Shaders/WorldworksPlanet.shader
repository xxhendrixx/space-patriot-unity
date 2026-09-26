Shader "SpacePatriot/WorldworksPlanet" {
 Properties { _GroundMap("Original geology atlas",2D)="white"{} _RockMap("Original cliff atlas",2D)="white"{} _Living("Living world",Float)=0 _Seed("World seed",Float)=0 _PlanetCenter("Planet center",Vector)=(0,-18003,0,0) _PlanetRadius("Planet radius",Float)=18000 }
 SubShader { Tags { "RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" } Cull Off Pass {
 Tags {"LightMode"="UniversalForward"}
 HLSLPROGRAM
 #pragma vertex vert
 #pragma fragment frag
 #pragma multi_compile _ _MAIN_LIGHT_SHADOWS _MAIN_LIGHT_SHADOWS_CASCADE
 #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
 #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
 float4 _WeatherworksSurface;
 TEXTURE2D(_GroundMap); SAMPLER(sampler_GroundMap);
 TEXTURE2D(_RockMap); SAMPLER(sampler_RockMap);
 CBUFFER_START(UnityPerMaterial)
 float _Living,_Seed,_PlanetRadius;
 float4 _PlanetCenter;
 CBUFFER_END
 float hash3(float3 p){p=frac(p*.1031);p+=dot(p,p.yzx+33.33);return frac((p.x+p.y)*p.z);}
 float noise3(float3 p){float3 i=floor(p),f=frac(p);f=f*f*(3-2*f);return lerp(lerp(lerp(hash3(i),hash3(i+float3(1,0,0)),f.x),lerp(hash3(i+float3(0,1,0)),hash3(i+float3(1,1,0)),f.x),f.y),lerp(lerp(hash3(i+float3(0,0,1)),hash3(i+float3(1,0,1)),f.x),lerp(hash3(i+float3(0,1,1)),hash3(i+1),f.x),f.y),f.z);}
 float fbm(float3 p){float n=0,a=.53;for(int k=0;k<5;k++){n+=noise3(p)*a;p=p*2.07+float3(5.2,1.7,9.3);a*=.48;}return n;}
 struct A {float4 p:POSITION;float3 n:NORMAL;float4 color:COLOR;float2 uv:TEXCOORD0;};
 struct V {float4 p:SV_POSITION;float3 w:TEXCOORD0;float3 n:TEXCOORD1;float4 color:COLOR;float2 uv:TEXCOORD2;float fog:TEXCOORD3;};
 V vert(A i){V o;o.w=TransformObjectToWorld(i.p.xyz);o.p=TransformWorldToHClip(o.w);o.n=TransformObjectToWorldNormal(i.n);o.color=i.color;o.uv=i.uv;o.fog=0;return o;}
 half4 frag(V i):SV_Target {
  float3 n=normalize(i.n);float dist=distance(i.w,_WorldSpaceCameraPos);float local=i.uv.x;
  float3 detail=SAMPLE_TEXTURE2D(_GroundMap,sampler_GroundMap,i.w.xz*.045).rgb;
  float3 broad=SAMPLE_TEXTURE2D(_GroundMap,sampler_GroundMap,i.w.xz*.0027).rgb;
  float3 weights=pow(abs(n),4);weights/=max(.001,weights.x+weights.y+weights.z);
  float3 rock=SAMPLE_TEXTURE2D(_RockMap,sampler_RockMap,i.w.zy*.08).rgb*weights.x+SAMPLE_TEXTURE2D(_RockMap,sampler_RockMap,i.w.xz*.08).rgb*weights.y+SAMPLE_TEXTURE2D(_RockMap,sampler_RockMap,i.w.xy*.08).rgb*weights.z;
  float meadow=smoothstep(.6,.94,n.y)*_Living;
  float3 land=lerp(lerp(broad,detail,.6),lerp(float3(.09,.145,.035),float3(.22,.28,.07),detail.g),meadow*.83);land=lerp(rock,land,smoothstep(.55,.85,n.y));
  float3 radial=normalize(i.n),globe=i.color.rgb;
  if(_Living>.5){
   // Keep atmospheric clouds as a separate visual layer. Continents and
   // shorelines are vertex colors from PlanetEngineSurface, not a second,
   // unrelated shader noise field that disagrees with collision/terrain.
   float clouds=smoothstep(.66,.82,fbm(radial*18+float3(1,7,3)))*.24;
   globe=lerp(globe,float3(.76,.82,.84),clouds);
  }
  float3 base=lerp(globe,land,local);
  Light sun=GetMainLight(TransformWorldToShadowCoord(i.w));float lambert=saturate(dot(n,sun.direction));
  base*=1-_WeatherworksSurface.x*.29*local;
  base=lerp(base,float3(.76,.85,.88),_WeatherworksSurface.y*smoothstep(.38,.84,n.y)*local);
  float3 light=SampleSH(n)*.6+sun.color*lambert*sun.shadowAttenuation*.85;
  float3 c=base*light;float rim=pow(1-saturate(dot(n,normalize(_WorldSpaceCameraPos-i.w))),4);
  c+=float3(.055,.12,.19)*rim*lambert*smoothstep(900,3200,dist);
  // World-space Y is not altitude on this wrapped world: a ship can be
  // thousands of kilometres sideways from the planet while keeping y near 0.
  // Measure altitude radially or distant planets are incorrectly fogged solid.
  float cameraAltitude=length(_WorldSpaceCameraPos-_PlanetCenter.xyz)-_PlanetRadius;
  float atmosphere=1-smoothstep(450,1500,cameraAltitude);
  float fog=1-exp(-pow(dist*.00015*atmosphere,2));
  return half4(lerp(c,float3(.20,.28,.34),saturate(fog)),1);
 }
 ENDHLSL
 } }
}
