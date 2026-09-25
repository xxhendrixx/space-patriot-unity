Shader "SpacePatriot/Spellworks" {
 Properties {_DstBlend("Destination blend",Float)=1}
 SubShader {Tags {"RenderPipeline"="UniversalPipeline" "Queue"="Transparent" "RenderType"="Transparent"} ZWrite Off Cull Off Blend SrcAlpha [_DstBlend]
 Pass { HLSLPROGRAM
 #pragma vertex vert
 #pragma fragment frag
 #include "Packages/com.unity.render-pipelines.universal/ShaderLibrary/Core.hlsl"
 struct A{float3 origin:POSITION;float4 color:COLOR;float2 uv:TEXCOORD0;float4 velocity:TEXCOORD1;float4 life:TEXCOORD2;float4 style:TEXCOORD3;};
 struct V{float4 p:SV_POSITION;float4 color:COLOR;float2 uv:TEXCOORD0;float type:TEXCOORD1;float seed:TEXCOORD2;};
 V vert(A i){V o;float age=max(0,_Time.y-i.life.x),p=saturate(age/i.life.y),drag=max(.001,i.style.z),movement=(1-exp(-drag*age))/drag;
 float3 pos=i.origin+i.velocity.xyz*movement;pos.y-=.5*i.style.y*age*age;
 float amp=min(age,.65)*.15;pos+=sin(pos*2.1+age*2.3+i.life.w*7)*amp*.32;
 float size=i.life.z*lerp(.72,1.35,p);size*=i.style.x==2?lerp(.6,3.4,p):pow(1-p,.35);
 float2 q=i.uv;float angle=i.life.w*6.283+age*i.style.w;
 if(i.style.x==1){float3 vel=mul((float3x3)UNITY_MATRIX_V,i.velocity.xyz);angle=atan2(vel.y,vel.x)-1.5708;q.y*=3.8;}
 q=mul(float2x2(cos(angle),-sin(angle),sin(angle),cos(angle)),q)*size;
 float3 view=TransformWorldToView(pos);view.xy+=q;o.p=mul(UNITY_MATRIX_P,float4(view,1));o.color=i.color;
 o.color.a*=step(0,_Time.y-i.life.x)*step(age,i.life.y)*min(age*18+.2,1)*pow(1-p,1.35);o.uv=i.uv*2;o.type=i.style.x;o.seed=i.life.w;return o;}
 half4 frag(V i):SV_Target{float2 q=i.uv;float r=length(q);float a=exp(-r*r*4);
 if(i.type==1)a=exp(-q.x*q.x*14)*pow(saturate(1-abs(q.y)),1.5);
 if(i.type==2){float n=.6+.4*sin(q.x*9+i.seed*18)*sin(q.y*11-i.seed*24);a=pow(saturate(1-r),1.2)*n*.33;}
 if(i.type==3)a=saturate(1-abs(q.x)-abs(q.y));
 if(i.type==4)a=saturate(1-r)*(.75+.25*sin(q.y*17+i.seed*31))*1.3;
 if(i.type==5)a=saturate(exp(-abs(q.x)*16)+exp(-abs(q.y)*16))*saturate(1-r);
 return half4(i.color.rgb,i.color.a*a);}
 ENDHLSL
 } }
}
