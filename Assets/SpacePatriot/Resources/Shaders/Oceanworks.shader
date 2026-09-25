Shader "SpacePatriot/Oceanworks" {
 SubShader {Tags {"RenderPipeline"="UniversalPipeline" "RenderType"="Opaque" "Queue"="Geometry+10"} Cull Off
 Pass {Tags {"LightMode"="UniversalForward"}
 HLSLPROGRAM
 #pragma vertex vert
 #pragma fragment frag
 #pragma multi_compile_fog
 #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
 #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Lighting.hlsl"
 struct A{float3 p:POSITION;};struct V{float4 p:SV_POSITION;float3 w:TEXCOORD0;float fog:TEXCOORD1;};
 float wave(float2 p,float a,float l,float speed,float phase){return sin(dot(p,float2(cos(a),sin(a)))*6.283185/max(l,.1)-_Time.y*speed+phase);}
 float height(float2 p){float d=.610865,h=wave(p,d,14,.7*1.15,0)*.18*.56+wave(p,d+.68,14*.53,.7*1.55,1.7)*.18*.25+wave(p,d-1.04,14*.27,.7*2.15,3.2)*.18*.12+wave(p,d+1.58,4.2,.7*3.1,2.3)*.2*.1;h+=sin(p.x*2.4+p.y*2.05-_Time.y*.7*4.4)*.2*.025;float crest=max(h/.18,0);return h+crest*crest*.55*.18*.28;}
 V vert(A i){V o;float3 p=i.p;p.y+=height(p.xz);o.w=TransformObjectToWorld(p);o.p=TransformWorldToHClip(o.w);o.fog=ComputeFogFactor(o.p.z);return o;}
 half4 frag(V i):SV_Target{float e=.13,h=height(i.w.xz);float dx=(height(i.w.xz+float2(e,0))-height(i.w.xz-float2(e,0)))/(2*e),dz=(height(i.w.xz+float2(0,e))-height(i.w.xz-float2(0,e)))/(2*e);
 float3 n=normalize(float3(-dx,1,-dz)),v=normalize(_WorldSpaceCameraPos-i.w);Light sun=GetMainLight();float fres=.02+.98*pow(1-saturate(dot(n,v)),5);
 float3 c=lerp(float3(.018,.075,.085),float3(.21,.32,.4),fres*.78);float glitter=pow(saturate(dot(n,normalize(v+sun.direction))),160);c+=sun.color*glitter*1.8;
 float foam=smoothstep(.14,.23,h)*.35;c=lerp(c,float3(.6,.69,.66),foam);return half4(MixFog(c,i.fog),1);}
 ENDHLSL
 } }
}
