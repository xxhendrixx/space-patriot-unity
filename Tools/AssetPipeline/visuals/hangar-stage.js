import {T,box,label,frame,dispose} from './primitives.js';
export class HangarStage{
 constructor(stage){this.stage=stage;}
 update(origin){const A=this.stage.app,H=A.shipboard,f=H?.hangarFrame();if(!f){if(this.root)this.root.visible=false;return;}if(!this.root){const m=this.stage.materials,g=this.root=new T.Group();g.name='Personal launch hangar';this.stage.scene.add(g);
   box(g,m.concrete,[0,-5,0],[150,10,250],.8);for(const wall of LongwayCore.CityWorld.hangarWalls)box(g,m.dark,wall.center,wall.size,.25);for(const side of [-1,1]){for(let z=-105;z<=105;z+=35){box(g,m.steel,[side*70,17,z],[3,34,3],.2);box(g,m.glow,[side*68,22,z],[.1,.8,16],0);}}
   label(g,'CITY ACCESS',[70.8,4.7,-44],[10,.8],'#c1d3c5',[0,-Math.PI/2,0]);label(g,'SPACE PATRIOT / PRIVATE HANGAR',[0,24,120.5],[46,2.5]);
   this.platform=new T.Group();g.add(this.platform);box(this.platform,m.hull,[0,0,0],[136,1,235],.3);for(const side of [-1,1])box(this.platform,m.amber,[side*64,.52,0],[.3,.05,220],0);label(this.platform,'01 / LAUNCH LIFT',[0,.55,-85],[32,3],'#c9c8ae',[-Math.PI/2,0,0]);
   this.roof=[];for(const side of [-1,1]){const p=box(g,m.hull,[side*36,36,0],[72,2,248],.5);this.roof.push({p,side});}
  }
  this.root.visible=LongwayCore.length(LongwayCore.sub(origin,f.center))<8;if(!this.root.visible)return;frame(this.root,f.center,f.right,f.up,f.forward,origin);const raised=(H.hangarRaised||0)*1000;this.platform.position.y=raised;for(const {p,side}of this.roof)p.position.x=side*(36+Math.min(1,raised/8)*78);
 }
}
