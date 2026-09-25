import {T} from './primitives.js';

// Procedural anisotropic 3-D Gaussians. Project each covariance through the
// perspective Jacobian, draw its 3-sigma ellipse and composite back to front.
// These are seeded game primitives, not a trained photographic reconstruction.
export class GaussianSplats {
  constructor(name, points, range=[0,0,1200,1700]) {
    this.points=points;this.order=points.map((_,i)=>i);this.lastSort=-Infinity;this.visibleOrder=new Uint32Array(points.length);this.radii=Float32Array.from(points,p=>Math.max(...p.scale)*3+8);
    const g=this.geometry=new T.InstancedBufferGeometry();
    g.setAttribute('position',new T.Float32BufferAttribute([-1,-1,0,1,-1,0,1,1,0,-1,1,0],3));g.setIndex([0,1,2,0,2,3]);
    for(const [key,size]of [['mean',3],['sigma',3],['tint',4]])g.setAttribute(key,new T.InstancedBufferAttribute(new Float32Array(points.length*size),size).setUsage(T.DynamicDrawUsage));
    g.instanceCount=points.length;
    const m=this.material=new T.ShaderMaterial({transparent:true,depthWrite:false,depthTest:true,side:T.DoubleSide,
      uniforms:{uDaylight:{value:1},uRange:{value:new T.Vector4(...range)},uViewport:{value:new T.Vector2(1440,900)},uFade:{value:1},uTime:{value:0},uWind:{value:0},uFog:{value:0},uFogColor:{value:new T.Color(0x94b7c2)}},
      vertexShader:`attribute vec3 mean;attribute vec3 sigma;attribute vec4 tint;
        uniform vec4 uRange;uniform vec2 uViewport;uniform float uFade,uTime,uWind;
        varying vec2 vGaussian;varying vec4 vTint;varying float vDistance;
        void main(){
          vec3 center=mean;center.x+=sin(uTime*.65+mean.x*.09+mean.z*.05)*uWind*sigma.y*.15;
          vec4 c=modelViewMatrix*vec4(center,1.);float z=max(.05,-c.z);vDistance=length(c.xyz);
          // Perspective covariance is only valid wholly in front of the eye.
          // Sideways, camera-plane splats otherwise become full-screen sheets.
          mat3 basis=mat3(modelViewMatrix);
          float depthSigma=length(vec3(basis[0].z*sigma.x,basis[1].z*sigma.y,basis[2].z*sigma.z));
          float nearFade=uRange.y>uRange.x?smoothstep(uRange.x,uRange.y,min(vDistance,z)):1.;
          float farFade=1.-smoothstep(uRange.z,uRange.w,vDistance);
          vTint=vec4(tint.rgb,tint.a*nearFade*farFade*uFade);vGaussian=position.xy*3.;
          if(c.z>-.05||z<3.*depthSigma||vTint.a<.001){gl_Position=vec4(2.,2.,2.,1.);return;}
          vec2 q[3];
          for(int i=0;i<3;i++){vec3 v=basis[i]*sigma[i];q[i]=vec2(projectionMatrix[0][0]*(v.x/z+c.x*v.z/(z*z)),projectionMatrix[1][1]*(v.y/z+c.y*v.z/(z*z)));}
          float a=0.,b=0.,d=0.;for(int i=0;i<3;i++){a+=q[i].x*q[i].x;b+=q[i].x*q[i].y;d+=q[i].y*q[i].y;}
          a+=.3*4./(uViewport.x*uViewport.x);d+=.3*4./(uViewport.y*uViewport.y);
          float middle=.5*(a+d),radius=sqrt(max(0.,.25*(a-d)*(a-d)+b*b));
          float l1=max(.0000000001,middle+radius),l2=max(.0000000001,middle-radius);
          vec2 major=abs(b)>.0000000001?normalize(vec2(b,l1-a)):(a>=d?vec2(1,0):vec2(0,1));
          vec2 minor=vec2(-major.y,major.x),ellipse=3.*(major*sqrt(l1)*position.x+minor*sqrt(l2)*position.y);
          gl_Position=projectionMatrix*c;gl_Position.xy+=ellipse*gl_Position.w;
        }`,
      fragmentShader:`uniform float uFog,uDaylight;uniform vec3 uFogColor;varying vec2 vGaussian;varying vec4 vTint;varying float vDistance;
        void main(){float r2=dot(vGaussian,vGaussian);if(r2>9.)discard;float alpha=min(.96,vTint.a*exp(-.5*r2));if(alpha<.002)discard;
          vec3 color=mix(vTint.rgb*uDaylight,uFogColor,1.-exp(-uFog*uFog*vDistance*vDistance));gl_FragColor=vec4(color,alpha);
          #include <tonemapping_fragment>
          #include <colorspace_fragment>
        }`
    });
    this.mesh=new T.Mesh(g,m);this.mesh.name=name;this.mesh.userData.skipAO=true;this.mesh.userData.gaussianSplats=true;this.mesh.renderOrder=4;
    const bounds=new T.Box3();for(const p of points){const r=Math.max(...p.scale)*3+8;bounds.expandByPoint(new T.Vector3(...p.position).addScalar(r));bounds.expandByPoint(new T.Vector3(...p.position).addScalar(-r));}
    g.boundingSphere=bounds.isEmpty()?new T.Sphere(new T.Vector3(),0):bounds.getBoundingSphere(new T.Sphere());
    this.frustum=new T.Frustum();this.sphere=new T.Sphere();this.matrix=new T.Matrix4();this.depths=new Float32Array(points.length);this.counts=new Uint32Array(256);this.offsets=new Uint32Array(256);this.sorted=new Uint32Array(points.length);
    this.mesh.onBeforeRender=renderer=>{const target=renderer.getRenderTarget();if(target)m.uniforms.uViewport.value.set(target.width,target.height);else renderer.getDrawingBufferSize(m.uniforms.uViewport.value);};
    this.upload();
  }
  upload(order=this.order,count=order.length){const a=this.geometry.attributes,mean=a.mean.array,sigma=a.sigma.array,tint=a.tint.array;for(let j=0;j<count;j++){const p=this.points[order[j]],n=j*3,k=j*4;for(let c=0;c<3;c++){mean[n+c]=p.position[c];sigma[n+c]=p.scale[c];tint[k+c]=p.color[c];}tint[k+3]=p.opacity??.65;}this.geometry.instanceCount=count;for(const v of [a.mean,a.sigma,a.tint])v.needsUpdate=true;}
  update(camera,time){this.material.uniforms.uTime.value=time;
    this.mesh.updateWorldMatrix(true,false);camera.updateWorldMatrix(true,false);const mv=this.matrix.multiplyMatrices(camera.matrixWorldInverse,this.mesh.matrixWorld),e=mv.elements;
    const sorting=time-this.lastSort>=.18||time<this.lastSort;
    if(sorting){
    const depth=p=>e[2]*p.position[0]+e[6]*p.position[1]+e[10]*p.position[2]+e[14];
    let min=Infinity,max=-Infinity;const depths=this.depths,counts=this.counts,offsets=this.offsets;counts.fill(0);for(let i=0;i<depths.length;i++){const z=depth(this.points[i]);depths[i]=z;min=Math.min(min,z);max=Math.max(max,z);}const scale=255/Math.max(1,max-min),bin=i=>Math.min(255,Math.max(0,Math.floor((depths[i]-min)*scale)));for(let i=0;i<depths.length;i++)counts[bin(i)]++;let sum=0;for(let i=0;i<256;i++){offsets[i]=sum;sum+=counts[i];}for(let i=0;i<depths.length;i++)this.sorted[offsets[bin(i)]++]=i;this.order=this.sorted;this.lastSort=time;
    }
    const cameraLocal=camera.position.clone().applyMatrix4(this.mesh.matrixWorld.clone().invert()),range=this.material.uniforms.uRange.value;
    this.matrix.premultiply(camera.projectionMatrix);this.frustum.setFromProjectionMatrix(this.matrix);
    const planes=this.frustum.planes,visible=this.visibleOrder;let count=0,changed=sorting;
    outer:for(let j=0;j<this.order.length;j++){const i=this.order[j],p=this.points[i].position,r=this.radii[i],dx=p[0]-cameraLocal.x,dy=p[1]-cameraLocal.y,dz=p[2]-cameraLocal.z,d2=dx*dx+dy*dy+dz*dz;
      if(d2>(range.w+r)**2||d2<Math.max(0,range.x-r)**2)continue;
      for(let k=0;k<6;k++){const plane=planes[k],n=plane.normal;if(n.x*p[0]+n.y*p[1]+n.z*p[2]+plane.constant < -r)continue outer;}
      if(visible[count]!==i)changed=true;visible[count++]=i;
    }
    if(changed||count!==this.visibleCount)this.upload(visible,count);this.visibleCount=count;
  }
  dispose(){this.mesh.removeFromParent();this.geometry.dispose();this.material.dispose();}
}
