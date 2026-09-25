import {T} from './primitives.js';

// Small spatial batches let Three.js reject invisible cells independently in
// the main camera and shadow views without discarding visible cast shadows.
export function partitionInstances(source,cellSize=64,margin=0){
  const bins=new Map(),matrix=new T.Matrix4(),color=new T.Color();
  for(let i=0;i<source.count;i++){source.getMatrixAt(i,matrix);const e=matrix.elements,key=Math.floor(e[12]/cellSize)+','+Math.floor(e[14]/cellSize);if(!bins.has(key))bins.set(key,[]);bins.get(key).push(i);}
  const result=[];
  for(const indices of bins.values()){
    const mesh=new T.InstancedMesh(source.geometry,source.material,indices.length);mesh.castShadow=source.castShadow;mesh.receiveShadow=source.receiveShadow;
    indices.forEach((id,i)=>{source.getMatrixAt(id,matrix);mesh.setMatrixAt(i,matrix);if(source.instanceColor){source.getColorAt(id,color);mesh.setColorAt(i,color);}});
    mesh.computeBoundingSphere();mesh.boundingSphere.radius+=margin;mesh.userData.cameraCulling=true;result.push(mesh);
  }
  source.dispose();return result;
}

export class CockpitOcclusion{
  constructor(scene){
    const texture=this.texture=new T.CanvasTexture(document.createElement('canvas'));texture.generateMipmaps=false;texture.minFilter=T.LinearFilter;
    const material=this.material=new T.ShaderMaterial({depthWrite:true,depthTest:true,colorWrite:false,uniforms:{mask:{value:texture},rect:{value:new T.Vector4(0,0,1,1)}},vertexShader:'varying vec2 pixel;void main(){pixel=uv;gl_Position=vec4(position.xy,-.999,1.);}',fragmentShader:'uniform sampler2D mask;uniform vec4 rect;varying vec2 pixel;void main(){vec2 p=(vec2(pixel.x,1.-pixel.y)-rect.xy)/rect.zw;if(any(lessThan(p,vec2(0.)))||any(greaterThan(p,vec2(1.)))||texture2D(mask,vec2(p.x,1.-p.y)).a<.999)discard;gl_FragColor=vec4(0.);}'});
    this.mesh=new T.Mesh(new T.PlaneGeometry(2,2),material);this.mesh.name='Opaque cockpit depth mask';this.mesh.frustumCulled=false;this.mesh.renderOrder=-100;this.mesh.userData.skipAO=true;scene.add(this.mesh);
  }
  update(){const art=window.BloxArtwork,mask=art?.mask;this.mesh.visible=!!(art?.active&&mask?.ready);if(!this.mesh.visible)return;
    if(this.key!==mask.kind||this.revision!==mask.revision){this.texture.image=mask.image;this.texture.needsUpdate=true;this.key=mask.kind;this.revision=mask.revision;}
    this.material.uniforms.rect.value.set(mask.x/innerWidth,mask.y/innerHeight,mask.width/innerWidth,mask.height/innerHeight);
  }
}
