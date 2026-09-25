/* Generated from the user's grasspack3js.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
import * as THREE from 'three';
export function createGrassworks(options={},heightAt=()=>0){
 const settings={density:32000,field:34,height:.65,width:.055,wild:.7,wind:.6,speed:1,gust:.2,turb:.5,colorVar:.5,fog:.00022,...options};
 const random=options.random||Math.random,scene=new THREE.Group(),$=()=>({});let grass=null,grassMaterial=null;
 function createBladeGeometry() {
  const segments = 5;
  const positions = [];
  const uvs = [];
  const indices = [];
  for(let i=0;i<=segments;i++) {
    const t = i/segments;
    // Width tapers toward the blade tip.
    const taper =
      Math.pow(1.0-t,0.72);
    positions.push(
      -0.5*taper,
      t,
      0
    );
    positions.push(
      0.5*taper,
      t,
      0
    );
    uvs.push(0,t);
    uvs.push(1,t);
    if(i<segments) {
      const n=i*2;
      indices.push(
        n,
        n+1,
        n+2
      );
      indices.push(
        n+1,
        n+3,
        n+2
      );
    }
  }
  const geo =
    new THREE.BufferGeometry();
  geo.setAttribute(
    "position",
    new THREE.Float32BufferAttribute(
      positions,
      3
    )
  );
  geo.setAttribute(
    "uv",
    new THREE.Float32BufferAttribute(
      uvs,
      2
    )
  );
  geo.setIndex(indices);
  return geo;
}
function createGrassMaterial() {
  return new THREE.ShaderMaterial({
    side: THREE.DoubleSide,
    transparent: false,
    uniforms: {
      uTime: {
        value: 0
      },
      uHeight: {
        value: settings.height
      },
      uWidth: {
        value: settings.width
      },
      uWind: {
        value: settings.wind
      },
      uSpeed: {
        value: settings.speed
      },
      uGust: {
        value: settings.gust
      },
      uTurbulence: {
        value: settings.turb
      },
      uWild: {
        value: settings.wild
      },
      uColorVariation: {
        value: settings.colorVar
      },
      uFogDensity: {
        value: settings.fog
      },
      uFogColor: {
        value: new THREE.Color(0x82998d)
      },
      uSunDirection: {
        value: new THREE.Vector3(
          -0.4,
          1.0,
          -0.3
        ).normalize()
      }
    },
    vertexShader: `
      precision highp float;
      attribute vec3 offset;
      attribute float scale;
      attribute float angle;
      attribute float randomValue;
      uniform float uTime;
      uniform float uHeight;
      uniform float uWidth;
      uniform float uWind;
      uniform float uSpeed;
      uniform float uGust;
      uniform float uTurbulence;
      uniform float uWild;
      varying vec2 vUv;
      varying float vRandom;
      varying float vHeight;
      varying vec3 vWorldPosition;
      float hash(vec2 p) {
        return fract(
          sin(
            dot(
              p,
              vec2(127.1,311.7)
            )
          ) *
          43758.5453123
        );
      }
      float noise(vec2 p) {
        vec2 i=floor(p);
        vec2 f=fract(p);
        f=f*f*(3.0-2.0*f);
        float a=hash(i);
        float b=hash(i+vec2(1.0,0.0));
        float c=hash(i+vec2(0.0,1.0));
        float d=hash(i+vec2(1.0,1.0));
        return mix(
          mix(a,b,f.x),
          mix(c,d,f.x),
          f.y
        );
      }
      void main() {
        vUv=uv;
        vRandom=randomValue;
        vHeight=uv.y;
        vec3 p=position;
        // ------------------------------------------
        // Individual blade size
        // ------------------------------------------
        float individualHeight =
          uHeight *
          scale *
          mix(
            1.0,
            0.45 + randomValue*1.1,
            uWild
          );
        p.y *= individualHeight;
        p.x *=
          uWidth *
          mix(
            0.7,
            1.3,
            randomValue
          );
        // ------------------------------------------
        // Blade rotation
        // ------------------------------------------
        float ca=cos(angle);
        float sa=sin(angle);
        float rx =
          p.x*ca -
          p.z*sa;
        float rz =
          p.x*sa +
          p.z*ca;
        p.x=rx;
        p.z=rz;
        // ------------------------------------------
        // Large rolling wind field
        // ------------------------------------------
        vec2 worldXZ=offset.xz;
        float windTime =
          uTime*uSpeed;
        float largeWave =
          sin(
            worldXZ.x*0.11 +
            worldXZ.y*0.075 +
            windTime
          );
        float crossWave =
          sin(
            worldXZ.x*-0.055 +
            worldXZ.y*0.16 +
            windTime*1.37
          );
        float gustNoise =
          noise(
            worldXZ*uGust +
            vec2(
              windTime*0.15,
              windTime*0.09
            )
          );
        float micro =
          sin(
            worldXZ.x*0.75 +
            worldXZ.y*0.63 +
            windTime*3.2 +
            randomValue*8.0
          );
        float windField =
          largeWave*0.48 +
          crossWave*0.22 +
          (gustNoise-0.5)*1.2 +
          micro*0.08*uTurbulence;
        // Blade base remains planted.
        float bend =
          pow(uv.y,1.7);
        float strength =
          uWind *
          windField *
          bend;
        p.x += strength*0.58;
        p.z += strength*0.22;
        // Natural blade curvature.
        p.z +=
          bend*bend*
          individualHeight*
          0.075;
        // Small high-frequency tip flutter.
        p.x +=
          sin(
            windTime*5.0 +
            randomValue*17.0 +
            worldXZ.x
          ) *
          uTurbulence *
          0.025 *
          bend;
        // ------------------------------------------
        // Translate blade into field
        // ------------------------------------------
        p += offset;
        vec4 worldPosition =
          modelMatrix *
          vec4(p,1.0);
        vWorldPosition =
          worldPosition.xyz;
        gl_Position =
          projectionMatrix *
          viewMatrix *
          worldPosition;
      }
    `,
    fragmentShader: `
      precision highp float;
      uniform float uColorVariation;
      uniform float uFogDensity;
      uniform vec3 uFogColor;
      uniform vec3 uSunDirection;
      varying vec2 vUv;
      varying float vRandom;
      varying float vHeight;
      varying vec3 vWorldPosition;
      void main() {
        // Deep shaded blade base.
        vec3 darkGreen =
          vec3(
            0.055,
            0.14,
            0.025
          );
        // Main grass.
        vec3 grassGreen =
          vec3(
            0.18,
            0.42,
            0.075
          );
        // Sunlit blade tips.
        vec3 tipGreen =
          vec3(
            0.46,
            0.67,
            0.19
          );
        vec3 color =
          mix(
            darkGreen,
            grassGreen,
            smoothstep(
              0.0,
              0.45,
              vHeight
            )
          );
        color =
          mix(
            color,
            tipGreen,
            pow(vHeight,2.4)*0.65
          );
        // Per-blade color variation.
        float variation =
          (vRandom-0.5) *
          uColorVariation;
        color +=
          vec3(
            variation*0.10,
            variation*0.20,
            variation*0.035
          );
        // Simulated directional lighting.
        float fakeNormal =
          0.58 +
          0.42*
          abs(
            sin(
              vRandom*18.0 +
              vWorldPosition.x*0.08
            )
          );
        color *= fakeNormal;
        // Warm sun contribution.
        color +=
          vec3(
            0.11,
            0.075,
            0.025
          ) *
          pow(vHeight,2.0);
        // ------------------------------------------
        // Distance fog
        // ------------------------------------------
        float distanceToCamera =
          length(
            cameraPosition -
            vWorldPosition
          );
        float fogFactor =
          1.0 -
          exp(
            -uFogDensity *
            uFogDensity *
            distanceToCamera *
            distanceToCamera
          );
        color =
          mix(
            color,
            uFogColor,
            clamp(
              fogFactor,
              0.0,
              1.0
            )
          );
        gl_FragColor =
          vec4(color,1.0);
      }
    `
  });
}
function rebuildGrass() {
  if(grass) {
    scene.remove(grass);
    grass.geometry.dispose();
    if(grass.material) {
      grass.material.dispose();
    }
    grass=null;
  }
  const count =
    settings.density;
  const radius =
    settings.field;
  const bladeGeometry =
    createBladeGeometry();
  const geometry =
    new THREE.InstancedBufferGeometry();
  geometry.index =
    bladeGeometry.index;
  geometry.attributes.position =
    bladeGeometry.attributes.position;
  geometry.attributes.uv =
    bladeGeometry.attributes.uv;
  const offsets =
    new Float32Array(count*3);
  const scales =
    new Float32Array(count);
  const angles =
    new Float32Array(count);
  const randomValues =
    new Float32Array(count);
  for(let i=0;i<count;i++) {
    // sqrt gives uniform distribution over disk.
    const r =
      Math.sqrt(random()) *
      radius;
    const theta =
      random() *
      Math.PI *
      2;
    let x =
      Math.cos(theta)*r;
    let z =
      Math.sin(theta)*r;
    // Break the perfect mathematical distribution.
    x +=
      (random()-0.5)*0.25;
    z +=
      (random()-0.5)*0.25;
    const i3=i*3;
    offsets[i3]=x;
    offsets[i3+1]=0;
    offsets[i3+2]=z;
    scales[i] =
      0.68 +
      random()*0.64;
    angles[i] =
      random() *
      Math.PI *
      2;
    randomValues[i] =
      random();
  }
  geometry.setAttribute(
    "offset",
    new THREE.InstancedBufferAttribute(
      offsets,
      3
    )
  );
  geometry.setAttribute(
    "scale",
    new THREE.InstancedBufferAttribute(
      scales,
      1
    )
  );
  geometry.setAttribute(
    "angle",
    new THREE.InstancedBufferAttribute(
      angles,
      1
    )
  );
  geometry.setAttribute(
    "randomValue",
    new THREE.InstancedBufferAttribute(
      randomValues,
      1
    )
  );
  geometry.instanceCount=count;
  // Prevent Three.js from incorrectly culling the field
  // because individual blade vertices start near origin.
  geometry.boundingSphere =
    new THREE.Sphere(
      new THREE.Vector3(0,1,0),
      radius+5
    );
  grassMaterial =
    createGrassMaterial();
  grass =
    new THREE.Mesh(
      geometry,
      grassMaterial
    );
  grass.frustumCulled=false;
  scene.add(grass);
  $("blades").textContent =
    count>=1000
      ? (count/1000).toFixed(0)+"K"
      : count;
  bladeGeometry.dispose();
}
 rebuildGrass();
 const offsets=grass.geometry.attributes.offset,scales=grass.geometry.attributes.scale;
 for(let i=0;i<offsets.count;i++){const h=heightAt(offsets.getX(i),offsets.getZ(i));if(h===null||!Number.isFinite(h)){scales.setX(i,0);offsets.setY(i,-1000);}else offsets.setY(i,h);}
 offsets.needsUpdate=scales.needsUpdate=true;scene.name='Grassworks terrain-rooted blades';
 grassMaterial.vertexShader=grassMaterial.vertexShader.replace('p += offset;', 'p *= 1.0-smoothstep(26.0,34.0,length(offset.xz)); p += offset;');
 grass.userData.skipAO=true;
 return {root:scene,mesh:grass,material:grassMaterial,settings,update(time){grassMaterial.uniforms.uTime.value=time;},dispose(){grass.geometry.dispose();grassMaterial.dispose();scene.removeFromParent();}};
}
