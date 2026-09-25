import {T} from './primitives.js';
import {ParticlePool} from '../engines/spellworks.js';

// Spellworks billboards on a camera-centred celestial sphere. Translation never
// changes stellar directions; only rotation changes their position on screen.
export class StellarStage {
  constructor(stage){
    this.stage=stage;this.root=new T.Group();this.root.name='Spellworks stellar sky';stage.scene.add(this.root);
    this.stars=new ParticlePool(this.root,2800,false,-1000000);
    this.corona=new ParticlePool(this.root,192,false,-1000000);
    this.random=LongwayCore.random(0x53544152);this.lastTime=null;this.emission=0;
    for(const pool of [this.stars,this.corona]){
      pool.mesh.renderOrder=-100;pool.mesh.userData.skipAO=true;pool.mesh.castShadow=false;
      const m=pool.material;m.uniforms.uWind.value.set(0,0);
      m.uniforms.uSkyCount={value:0};m.uniforms.uSkyBodies={value:Array.from({length:20},()=>new T.Vector4())};m.uniforms.uVisibility={value:1};m.uniforms.uAirUp={value:new T.Vector3(0,1,0)};m.uniforms.uCloudExtinction={value:0};
      m.vertexShader='uniform int uSkyCount;uniform vec4 uSkyBodies[20];uniform float uVisibility;uniform vec3 uAirUp;uniform float uCloudExtinction;\n'+m.vertexShader;
      m.vertexShader=m.vertexShader.replace('vUv=uv;',`vec3 skyDirection=normalize(aOrigin);float visible=uVisibility*exp(-uCloudExtinction/max(.10,dot(skyDirection,uAirUp)));
        for(int i=0;i<20;i++){if(i>=uSkyCount)break;if(dot(skyDirection,uSkyBodies[i].xyz)>uSkyBodies[i].w)visible=0.;}
        live*=visible;vUv=uv;`);
      m.fragmentShader=m.fragmentShader.replace('vAge*8.','vAge*.7');
    }
    const zero=new T.Vector3();
    for(let i=0;i<2800;i++){
      const r=this.random,y=r()*2-1,a=r()*Math.PI*2,s=Math.sqrt(1-y*y),direction=new T.Vector3(Math.cos(a)*s,y,Math.sin(a)*s),hot=r(),bright=r(),color=new T.Color().setRGB(...(hot<.30?[.43,.66,1]:hot>.72?[1,.57,.27]:[.85,.91,1]));
      color.multiplyScalar(.8+bright*2.2);
      this.stars.emit(0,direction.multiplyScalar(60000),zero,color,1e9,bright>.95?750:120+bright*180,bright>.97?5:0,0,1,0);
      this.stars.arrays.aLife[i*4+3]=r();
    }
    this.stars.update(1,0);
  }
  update(F,time,body,origin){
    const C=LongwayCore,A=this.stage.app,dt=this.lastTime===null?0:C.clamp(time-this.lastTime,0,.1);this.lastTime=time;
    if(this.system!==body.systemIndex){this.system=body.systemIndex;for(let i=0;i<this.corona.capacity;i++)this.corona.arrays.aLife[i*4]=-1000;this.corona.dirtyStart=0;this.corona.dirtyEnd=this.corona.capacity;this.emission=0;}
    const catalog=A.world.catalog;
    for(const pool of [this.stars,this.corona]){
      pool.material.uniforms.uSkyCount.value=catalog.length;
      for(let i=0;i<catalog.length;i++){
        const b=catalog[i],delta=C.sub(b.center,origin),d=C.length(delta),dir=C.unit(delta),radius=b.radius+(b===body&&b.type!==3?Math.max(0,A.world.height(b,C.unit(C.sub(origin,b.center)))):0),ratio=C.clamp(radius/d,0,1);
        pool.material.uniforms.uSkyBodies.value[i].set(...dir,Math.sqrt(1-ratio*ratio));
      }
    }
    const airUp=C.unit(C.sub(origin,body.center)),alt=C.length(C.sub(origin,body.center))-body.radius,airDepth=body.atmosphere*body.radius,weather=C.PlanetClimate.weather(body,time,airUp);
    const belowCloud=airDepth>0?1-C.smooth(C.clamp((alt/airDepth-.53)/.10,0,1)):0;
    for(const pool of [this.stars,this.corona]){pool.material.uniforms.uAirUp.value.set(...airUp);pool.material.uniforms.uCloudExtinction.value=belowCloud*weather.coverage*(body.type===3?3:1.1);}
    this.stars.material.uniforms.uVisibility.value=A.renderer.starVisibility??1;
    this.stars.update(time+1,0);
    const sun=C.unit(A.celestial?.sun(origin)||C.SUN),axis=C.unit(C.cross(sun,[0,1,0]),[1,0,0]),up=C.unit(C.cross(axis,sun)),climate=C.PlanetClimate.profile(body),r=this.random;
    this.emission+=dt*28;
    while(this.emission>=1){this.emission--;
      const angle=r()*Math.PI*2,radial=C.add(C.mul(axis,Math.cos(angle)),C.mul(up,Math.sin(angle))),p=C.add(C.mul(sun,60000),C.mul(radial,350+r()*120)),v=C.mul(radial,80+r()*130),color=new T.Color().setRGB(...climate.starColor).multiply(new T.Color(1,.48,.16));
      this.corona.emit(time,new T.Vector3(...p),new T.Vector3(...v),color,1.3+r()*1.2,180+r()*160,4,0,.3,r()-.5);
    }
    this.corona.update(time,0);
    this.stats={engine:'Spellworks ParticlePool',stars:2800,drawCalls:2,coronaParticles:this.corona.active(time),translationInvariant:true};
  }
}
