import { T } from './primitives.js';
export class Explosions {
  constructor(stage) {
    this.stage=stage;this.events=[];this.seen=new Set();this.capacity=8;this.perBurst=48;
    this.geometry=new T.BufferGeometry();
    for(const [name,size]of [['position',3],['color',3],['size',1],['opacity',1]])
      this.geometry.setAttribute(name,new T.BufferAttribute(new Float32Array(this.capacity*this.perBurst*size),size).setUsage(T.DynamicDrawUsage));
    this.material=new T.ShaderMaterial({transparent:true,depthWrite:false,blending:T.AdditiveBlending,
      uniforms:{uPixels:{value:720}},vertexShader:`attribute float size,opacity;attribute vec3 color;uniform float uPixels;varying vec3 vColor;varying float vOpacity;
        void main(){vec4 p=modelViewMatrix*vec4(position,1.);vColor=color;vOpacity=opacity;gl_Position=projectionMatrix*p;gl_PointSize=clamp(size*uPixels/max(1.,-p.z),1.,160.);}`,
      fragmentShader:`varying vec3 vColor;varying float vOpacity;void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;float a=pow(1.-r*r,2.)*vOpacity;gl_FragColor=vec4(vColor,a);#include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`.replace(';#include',';\n#include')});
    this.points=new T.Points(this.geometry,this.material);this.points.userData.skipAO=true;this.points.raycast=()=>{};stage.scene.add(this.points);
    this.frustum=new T.Frustum();this.projection=new T.Matrix4();this.bound=new T.Sphere();this.bounds=new T.Box3();
  }
  carry(body,point,vector) {
    for(const e of this.events)if(e.body===body){e.position=point(e.position,e.rotate);if(e.rotate)for(const p of e.directions)p.direction.fromArray(vector(p.direction.toArray()));}
  }
  update(origin) {
    const C=LongwayCore,B=this.stage.app.combat;
    for(const e of B.effects)if(e.kind==='explosion'&&!this.seen.has(e.id)){
      this.seen.add(e.id);if(this.seen.size>512)this.seen.delete(this.seen.values().next().value);
      if(C.length(C.sub(e.b,origin))>8)continue;
      const random=WWCore.rng(C.hash(String(e.id).split('').reduce((a,c)=>Math.imul(a,31)+c.charCodeAt(0),17)));
      const directions=Array.from({length:this.perBurst},()=>{const direction=new T.Vector3(random()-.5,random()-.5,random()-.5).normalize();return {direction,speed:.4+random(),life:1.3+random()*1.1};});
      const near=this.stage.app.world.nearest(e.b);
      this.events.push({position:e.b.slice(),body:near.body.id,rotate:near.altitude<10,born:B.time-Math.max(0,(e.life||e.ttl)-e.ttl),radius:C.clamp(e.radius||3,2,80),directions});
      if(this.events.length>this.capacity)this.events.shift();
    }
    this.events=this.events.filter(e=>B.time-e.born<2.4);
    const camera=this.stage.camera;camera.updateWorldMatrix(true,false);this.frustum.setFromProjectionMatrix(this.projection.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));this.bounds.makeEmpty();
    const a=this.geometry.attributes;let index=0;
    for(const e of this.events){const age=Math.max(0,B.time-e.born),center=C.sub(e.position,origin).map(v=>v*1000);
      this.bound.center.set(...center);this.bound.radius=e.radius*5;
      if(!this.frustum.intersectsSphere(this.bound))continue;
      this.bounds.expandByPoint(this.bound.center.clone().addScalar(this.bound.radius));this.bounds.expandByPoint(this.bound.center.clone().addScalar(-this.bound.radius));
      for(let i=0;i<e.directions.length;i++){
        const p=e.directions[i],t=C.clamp(age/p.life,0,1),travel=e.radius*2*p.speed*(1-Math.exp(-age*1.4));
        a.position.setXYZ(index,...center.map((v,k)=>v+p.direction.getComponent(k)*travel));
        a.color.setXYZ(index,1,.18+.62*(1-t)**2,.025+.38*(1-t)**5);
        a.size.setX(index,(i<5?e.radius*1.6:e.radius*.28)*(1+age*.65));
        a.opacity.setX(index,(1-t)**2*(i<5?.55:.9));index++;
      }
    }
    for(const attribute of Object.values(a))attribute.needsUpdate=true;
    this.geometry.setDrawRange(0,index);this.points.visible=index>0;
    if(index)this.geometry.boundingSphere=this.bounds.getBoundingSphere(this.geometry.boundingSphere||new T.Sphere());
    this.material.uniforms.uPixels.value=this.stage.canvas.height/(2*Math.tan(this.stage.camera.fov*Math.PI/360));
  }
}
