import {T} from './primitives.js';

// Both renderers must relinquish the same patch. A shader material does not
// inherit MeshStandardMaterial.opacity, which previously left a solid blue tile.
export function waterTransition(material,geometry,depths){
  geometry.setAttribute('waterDepth',new T.Float32BufferAttribute(depths,1));
  if(material.userData.shoreMasked)return;
  const uniforms={uSurfaceFade:{value:1},uPatchEdge:{value:new T.Vector2(3800,5650)}};
  if(material.isShaderMaterial){
    Object.assign(material.uniforms,uniforms);
    material.vertexShader='attribute float waterDepth;varying float vWaterDepth;varying vec2 vPatchPosition;\n'+material.vertexShader;
    material.vertexShader=material.vertexShader.replace('void main() {','void main() {\nvWaterDepth=waterDepth;vPatchPosition=position.xz;');
    material.fragmentShader='uniform float uSurfaceFade;uniform vec2 uPatchEdge;varying float vWaterDepth;varying vec2 vPatchPosition;\n'+material.fragmentShader;
    material.fragmentShader=material.fragmentShader.replace(/void main\(\)\s*\{/,'void main(){ if(vWaterDepth<=0.)discard;');
    material.fragmentShader=material.fragmentShader.replace(/}\s*$/,`gl_FragColor.a*=uSurfaceFade*(1.-smoothstep(uPatchEdge.x,uPatchEdge.y,length(vPatchPosition)))*smoothstep(0.,.8,vWaterDepth);if(gl_FragColor.a<.003)discard;\n}`);
    material.transparent=true;material.depthWrite=false;
  }else{
    material.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='attribute float waterDepth;varying float vWaterDepth;varying vec2 vPatchPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWaterDepth=waterDepth;vPatchPosition=position.xz;');shader.fragmentShader='uniform float uSurfaceFade;uniform vec2 uPatchEdge;varying float vWaterDepth;varying vec2 vPatchPosition;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>','#include <alphatest_fragment>\nif(vWaterDepth<=0.)discard;diffuseColor.a*=uSurfaceFade*(1.-smoothstep(uPatchEdge.x,uPatchEdge.y,length(vPatchPosition)));');};
    material.transparent=true;material.depthWrite=false;
  }
  material.userData.surfaceFade=uniforms.uSurfaceFade;material.userData.shoreMasked=true;material.customProgramCacheKey=()=> 'water-shore-fade-v11';
}
export function terrainTransition(material){
  const compile=material.onBeforeCompile,fade={value:1};material.userData.surfaceFade=fade;
  material.onBeforeCompile=shader=>{compile?.(shader);shader.uniforms.uSurfaceFade=fade;shader.vertexShader='varying vec2 vPatchPosition;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvPatchPosition=position.xz;');shader.fragmentShader='uniform float uSurfaceFade;varying vec2 vPatchPosition;\n'+shader.fragmentShader;shader.fragmentShader=shader.fragmentShader.replace('#include <alphatest_fragment>',`#include <alphatest_fragment>
    float patchAlpha=uSurfaceFade*(1.-smoothstep(3800.,5650.,length(vPatchPosition)));
    diffuseColor.a*=patchAlpha;if(diffuseColor.a<.001)discard;`);};
  // The background draws the same continuous planet beneath this patch. Blend
  // coverage rather than punching a screen-space dot pattern into the skyline.
  material.transparent=true;material.depthWrite=true;
  const key=material.customProgramCacheKey.bind(material);material.customProgramCacheKey=()=>key()+'-continuous-fade-v11.1';
}
