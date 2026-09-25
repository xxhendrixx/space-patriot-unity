Shader "SpacePatriot/Fireworks" {
 Properties {_Start("Ignition",Float)=0 _End("Extinguish",Float)=8 _Scale("Scale",Float)=1}
 SubShader {Tags {"RenderPipeline"="UniversalPipeline" "Queue"="Transparent"} Cull Off ZWrite Off Blend SrcAlpha One
 Pass {HLSLPROGRAM
 #pragma vertex vert
 #pragma fragment frag
 #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
 CBUFFER_START(UnityPerMaterial)
 float _Start,_End,_Scale;
 CBUFFER_END
 float4 _WeatherworksWind;
 struct A{float3 p:POSITION;float2 uv:TEXCOORD0;float4 data:TEXCOORD1;};
 struct V{float4 p:SV_POSITION;float2 uv:TEXCOORD0;float life:TEXCOORD1;float heat:TEXCOORD2;float fade:TEXCOORD3;};
 float hash3(float3 p){return frac(sin(dot(p,float3(127.1,311.7,74.7)))*43758.5453);}
 float noise3(float3 p){float3 i=floor(p),f=frac(p);f=f*f*(3-2*f);return lerp(lerp(lerp(hash3(i),hash3(i+float3(1,0,0)),f.x),lerp(hash3(i+float3(0,1,0)),hash3(i+float3(1,1,0)),f.x),f.y),lerp(lerp(hash3(i+float3(0,0,1)),hash3(i+float3(1,0,1)),f.x),lerp(hash3(i+float3(0,1,1)),hash3(i+1),f.x),f.y),f.z);}
 V vert(A i){V o;float time=_Time.y-_Start,seed=i.data.z,life=frac(i.data.x+time*i.data.y*(.15+1.1*.08));
 float height=3*_Scale,width=1.3*_Scale,taper=pow(max(1-life,0),.72),angle=seed*6.2831853,radius=i.data.w*width*taper;
 float3 p=float3(cos(angle)*radius,life*height,sin(angle)*radius);p.y+=life*life*height*.20;
 float a=noise3(float3(p.x*.65+seed*5,life*3.5,time*1.25)),b=noise3(float3(p.z*.72+seed*9,life*4.1,time*1.05+17));
 float envelope=sin(life*3.14159265);p.x+=(a-.5)*.8*(.35+life*.8)*envelope;p.z+=(b-.5)*.8*(.35+life*.8)*envelope;
 p.x+=sin(life*8-time*4.2+seed*12)*.8*.11*life;p.z+=sin(life*13-time*5.7+seed*19)*.8*.09*life;
 p.xz+=_WeatherworksWind.xz*.055*life*life*height*.18;
 float gust=sin(time*1.7+life*4+seed*6.283)+sin(time*3.7+seed*11)*.4;p.xz+=float2(.9063,.4226)*gust*.45*life*.30;
 float flicker=sin(time*9+seed*17)+sin(time*14+seed*7)*.4;p.y+=flicker*.65*.08*life;
 float3 view=TransformWorldToView(TransformObjectToWorld(p));view.xy+=i.uv*(.32+width*.18)*lerp(1.15,.35,life);o.p=mul(UNITY_MATRIX_P,float4(view,1));
 o.uv=i.uv;o.life=life;o.heat=saturate(pow(1-life,.55)*.95);o.fade=saturate((_End-_Time.y)/1.8)*saturate(time*5);return o;}
 half4 frag(V i):SV_Target{float radial=1-smoothstep(.08,.5,length(i.uv));float temperature=saturate(i.heat*.64);float3 red=float3(1,.055,.005),orange=float3(1,.22,.015),yellow=float3(1,.68,.12),white=float3(1,.94,.72);
 float3 c=temperature<.33?lerp(red,orange,temperature/.33):temperature<.68?lerp(orange,yellow,(temperature-.33)/.35):lerp(yellow,white,(temperature-.68)/.32);
 c+=white*pow(1-i.life,2)*.35*.35;float alpha=radial*smoothstep(0,.06,i.life)*(1-smoothstep(.58,1,i.life))*.23*i.fade;return half4(c,alpha);}
 ENDHLSL
 } }
}
