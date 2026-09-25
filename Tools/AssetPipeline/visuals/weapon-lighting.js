import {T} from './primitives.js';
import {ParticlePool} from '../engines/spellworks.js';

// A small transparent Spellworks pass sits above the authored weapon cutout.
// World lights stay in the main scene so the flash also illuminates the ground.
export class WeaponLighting {
  constructor(stage){
    this.stage=stage;this.sequence=-1;
    this.flashLight=new T.PointLight(0xff982b,0,16,2);
    this.flashlight=new T.SpotLight(0xe4efff,0,45,.40,.65,2);
    this.flashlight.castShadow=true;this.flashlight.shadow.mapSize.set(512,512);
    this.flashlight.shadow.bias=-.00015;this.flashlight.shadow.normalBias=.04;
    stage.scene.add(this.flashLight,this.flashlight,this.flashlight.target);
    this.scene=new T.Scene();this.camera=new T.OrthographicCamera(-1,1,1,-1,.01,10);this.camera.position.z=3;
    this.pool=new ParticlePool(this.scene,64,false,-100);
    this.pool.material.uniforms.uWind.value.set(0,0);this.pool.material.depthTest=false;
  }
  update(origin){
    const C=LongwayCore,B=this.stage.app.combat,F=this.stage.app.flight,foot=F.walking||F.bridgeWalk;
    const p=F.renderPose(),shot=B.lastShot,age=shot?B.time-shot.time:100;
    const active=foot&&shot&&['rifle','sidearm'].includes(shot.weapon)&&age<.075;
    const muzzle=B.muzzlePose?.(false),at=muzzle?.position||p.position;
    this.flashLight.position.set(...C.sub(at,origin).map(x=>x*1000));
    this.flashLight.intensity=active?180*Math.pow(1-age/.075,1.8):0;
    this.flashlight.position.set(...C.sub(C.add(p.position,C.mul(p.up,-.12/1000)),origin).map(x=>x*1000));
    this.flashlight.target.position.set(...C.sub(C.add(p.position,C.mul(p.forward,.03)),origin).map(x=>x*1000));
    this.flashlight.intensity=B.flashlight?650:0;
    this.flashlight.visible=!!B.flashlight;
    if(active){
      if(!this.renderer){const canvas=document.getElementById('muzzleFlash');if(!canvas)return;this.renderer=new T.WebGLRenderer({canvas,alpha:true,preserveDrawingBuffer:true,antialias:false,powerPreference:'high-performance'});this.renderer.setSize(256,256,false);this.renderer.setClearColor(0,0);}
      if(this.sequence!==shot.sequence){this.sequence=shot.sequence;
        for(let i=0;i<11;i++){const a=i/11*Math.PI*2+Math.random()*.2,r=.10+Math.random()*.11;
          this.pool.emit(B.time-.005,new T.Vector3(Math.cos(a)*r,Math.sin(a)*r,0),new T.Vector3(Math.cos(a)*3,Math.sin(a)*3,0),new T.Color(1,.16+Math.random()*.2,.014),.052+Math.random()*.018,.55+Math.random()*.28,4,0,6,0);}
        this.pool.emit(B.time-.005,new T.Vector3(),new T.Vector3(),new T.Color(1,.61,.12),.05,.65,0,0,1,0);
      }
      this.pool.update(B.time,0);this.renderer.render(this.scene,this.camera);
    }
    this.stats={engine:'Spellworks ParticlePool',muzzleBurst:!!active,flashIntensity:this.flashLight.intensity,flashlight:B.flashlight,nightVision:B.visionActive};
  }
}
