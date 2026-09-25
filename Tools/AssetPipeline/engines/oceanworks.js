/* Generated from the user's oceanworksv2.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
import * as THREE from 'three';
export function createOceanworks(options={}){
 const settings={height:.65,length:24,chop:.35,speed:.7,ripples:.2,direction:35,normalStrength:.65,microNormal:.45,crestSharpness:.55,crestCurl:.25,breaking:.25,whitecaps:.45,foam:.35,reflect:.78,depth:.7,sun:2.7,haze:.00022,...options};
 const sun={position:new THREE.Vector3(...(options.sunDirection||[-.4,1,-.3])).normalize()},fogColor=new THREE.Color(0x94b7c2);
 function createOceanMaterial() {
  return new THREE.ShaderMaterial({
    side:
      THREE.DoubleSide,
// ============================================================
// UNIFORMS
// ============================================================
    uniforms: {
// ------------------------------------------------------------
// TIME
// ------------------------------------------------------------
      uTime: {
        value: 0
      },
// ------------------------------------------------------------
// LARGE WAVE FIELD
// ------------------------------------------------------------
      uHeight: {
        value:
          settings.height
      },
      uLength: {
        value:
          settings.length
      },
      uChop: {
        value:
          settings.chop
      },
      uSpeed: {
        value:
          settings.speed
      },
      uRipples: {
        value:
          settings.ripples
      },
      uDirection: {
        value:
          THREE.MathUtils.degToRad(
            settings.direction
          )
      },
// ------------------------------------------------------------
// NORMAL SYSTEM
// ------------------------------------------------------------
      uNormalStrength: {
        value:
          settings.normalStrength
      },
      uMicroNormal: {
        value:
          settings.microNormal
      },
// ------------------------------------------------------------
// CRESTING / BREAKING
// ------------------------------------------------------------
      uCrestSharpness: {
        value:
          settings.crestSharpness
      },
      uCrestCurl: {
        value:
          settings.crestCurl
      },
      uBreaking: {
        value:
          settings.breaking
      },
      uWhitecaps: {
        value:
          settings.whitecaps
      },
// ------------------------------------------------------------
// WATER MATERIAL
// ------------------------------------------------------------
      uFoam: {
        value:
          settings.foam
      },
      uReflectivity: {
        value:
          settings.reflect
      },
      uDepth: {
        value:
          settings.depth
      },
// ------------------------------------------------------------
// SUN
// ------------------------------------------------------------
      uSunDirection: {
        value:
          sun.position
            .clone()
            .normalize()
      },
      uSunIntensity: {
        value:
          settings.sun
      },
// ------------------------------------------------------------
// ATMOSPHERE
// ------------------------------------------------------------
      uFogDensity: {
        value:
          settings.haze
      },
      uFogColor: {
        value:
          fogColor.clone()
      },
// ------------------------------------------------------------
// EFFECT TOGGLES
// ------------------------------------------------------------
      uGlitter: {
        value: 1
      }
    },
// ============================================================
// VERTEX SHADER BEGINS HERE
//
// Part 4 continues directly from this point.
// ============================================================
vertexShader: `
precision highp float;
// ============================================================
// UNIFORMS
// ============================================================
uniform float uTime;
uniform float uHeight;
uniform float uLength;
uniform float uChop;
uniform float uSpeed;
uniform float uRipples;
uniform float uDirection;
uniform float uNormalStrength;
uniform float uCrestSharpness;
uniform float uCrestCurl;
// ============================================================
// OUTPUT TO FRAGMENT SHADER
// ============================================================
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vElevation;
varying float vSlope;
varying float vDetail;
varying float vCrest;
// ============================================================
// CONSTANTS
// ============================================================
const float PI =
  3.141592653589793;
// ============================================================
// BASIC TRAVELING WAVE
// ============================================================
float waveValue(
  vec2 point,
  vec2 direction,
  float wavelength,
  float velocity,
  float phase
) {
  float k =
    2.0 *
    PI
    /
    max(
      wavelength,
      0.1
    );
  return sin(
    dot(
      point,
      direction
    )
    *
    k
    -
    uTime *
    velocity
    +
    phase
  );
}
// ============================================================
// MULTI-SCALE OCEAN HEIGHT FIELD
// ============================================================
float getHeight(
  vec2 point
) {
  float angle =
    uDirection;
  vec2 d1 =
    normalize(
      vec2(
        cos(angle),
        sin(angle)
      )
    );
  vec2 d2 =
    normalize(
      vec2(
        cos(angle + 0.68),
        sin(angle + 0.68)
      )
    );
  vec2 d3 =
    normalize(
      vec2(
        cos(angle - 1.04),
        sin(angle - 1.04)
      )
    );
  vec2 d4 =
    normalize(
      vec2(
        cos(angle + 1.58),
        sin(angle + 1.58)
      )
    );
  float h =
    0.0;
  // ----------------------------------------------------------
  // PRIMARY SWELL
  // ----------------------------------------------------------
  h +=
    waveValue(
      point,
      d1,
      uLength,
      uSpeed * 1.15,
      0.0
    )
    *
    uHeight
    *
    0.56;
  // ----------------------------------------------------------
  // CROSSING SWELL
  // ----------------------------------------------------------
  h +=
    waveValue(
      point,
      d2,
      uLength * 0.53,
      uSpeed * 1.55,
      1.7
    )
    *
    uHeight
    *
    0.25;
  // ----------------------------------------------------------
  // SHORTER WAVE
  // ----------------------------------------------------------
  h +=
    waveValue(
      point,
      d3,
      uLength * 0.27,
      uSpeed * 2.15,
      3.2
    )
    *
    uHeight
    *
    0.12;
  // ----------------------------------------------------------
  // WIND WAVE
  // ----------------------------------------------------------
  h +=
    waveValue(
      point,
      d4,
      4.2,
      uSpeed * 3.1,
      2.3
    )
    *
    uRipples
    *
    0.10;
  // ----------------------------------------------------------
  // MICRO SURFACE DISPLACEMENT
  // ----------------------------------------------------------
  h +=
    sin(
      point.x * 2.4
      +
      point.y * 2.05
      -
      uTime *
      uSpeed *
      4.4
    )
    *
    uRipples
    *
    0.025;
  // ==========================================================
  // CREST SHARPENING
  //
  // Broad troughs remain relatively sinusoidal while positive
  // wave displacement receives an additional nonlinear lift.
  // ==========================================================
  float normalizedHeight =
    h /
    max(
      uHeight,
      0.10
    );
  float positiveHeight =
    max(
      normalizedHeight,
      0.0
    );
  float crestShape =
    positiveHeight *
    positiveHeight;
  h +=
    crestShape
    *
    uCrestSharpness
    *
    uHeight
    *
    0.28;
  return h;
}
// ============================================================
// VERTEX MAIN
// ============================================================
void main() {
  vec3 p =
    position;
  vec2 originalPoint =
    p.xz;
  float angle =
    uDirection;
  // ==========================================================
  // PRIMARY WAVE DIRECTIONS
  // ==========================================================
  vec2 primaryDirection =
    normalize(
      vec2(
        cos(angle),
        sin(angle)
      )
    );
  vec2 crossingDirection =
    normalize(
      vec2(
        cos(angle + 0.68),
        sin(angle + 0.68)
      )
    );
  // ==========================================================
  // GERSTNER-LIKE HORIZONTAL CHOP
  // ==========================================================
  float primaryWave =
    waveValue(
      originalPoint,
      primaryDirection,
      uLength,
      uSpeed * 1.15,
      0.0
    );
  float crossingWave =
    waveValue(
      originalPoint,
      crossingDirection,
      uLength * 0.53,
      uSpeed * 1.55,
      1.7
    );
  p.xz +=
    primaryDirection
    *
    primaryWave
    *
    uHeight
    *
    uChop
    *
    0.14;
  p.xz +=
    crossingDirection
    *
    crossingWave
    *
    uHeight
    *
    uChop
    *
    0.055;
  // ==========================================================
  // VERTICAL DISPLACEMENT
  // ==========================================================
  float h =
    getHeight(
      p.xz
    );
  p.y +=
    h;
  // ==========================================================
  // CREST MASK
  //
  // Identifies the upper portion of the swell.
  // ==========================================================
  float crestStart =
    uHeight *
    0.18;
  float crestEnd =
    max(
      uHeight *
      0.72,
      crestStart +
      0.001
    );
  float crestMask =
    smoothstep(
      crestStart,
      crestEnd,
      h
    );
  // ==========================================================
  // FORWARD CREST CURL
  //
  // This cannot produce a truly overturning volume because
  // the ocean remains a height-field surface, but it moves
  // high crest vertices forward and gives the wave a much
  // stronger pre-breaking silhouette.
  // ==========================================================
  p.xz +=
    primaryDirection
    *
    crestMask
    *
    uCrestCurl
    *
    uHeight
    *
    0.18;
  // ==========================================================
  // NORMAL CALCULATION
  //
  // Sample neighboring positions from the SAME procedural
  // wave field. The normal therefore follows the displaced
  // ocean instead of the original flat plane.
  // ==========================================================
  float epsilon =
    0.22;
  float heightX =
    getHeight(
      p.xz +
      vec2(
        epsilon,
        0.0
      )
    );
  float heightZ =
    getHeight(
      p.xz +
      vec2(
        0.0,
        epsilon
      )
    );
  vec3 tangentX =
    vec3(
      epsilon,
      heightX - h,
      0.0
    );
  vec3 tangentZ =
    vec3(
      0.0,
      heightZ - h,
      epsilon
    );
  vec3 geometricNormal =
    normalize(
      cross(
        tangentZ,
        tangentX
      )
    );
  // ==========================================================
  // NORMAL STRENGTH
  //
  // Increase horizontal components while preserving the
  // upward component. This exaggerates reflected detail
  // without requiring a denser mesh.
  // ==========================================================
  vec3 enhancedNormal =
    normalize(
      vec3(
        geometricNormal.x *
        (
          1.0 +
          uNormalStrength
        ),
        geometricNormal.y,
        geometricNormal.z *
        (
          1.0 +
          uNormalStrength
        )
      )
    );
  // ==========================================================
  // WORLD SPACE
  // ==========================================================
  vec4 worldPosition =
    modelMatrix
    *
    vec4(
      p,
      1.0
    );
  vWorldPosition =
    worldPosition.xyz;
  vNormal =
    normalize(
      mat3(
        modelMatrix
      )
      *
      enhancedNormal
    );
  // ==========================================================
  // VALUES FOR FRAGMENT SHADER
  // ==========================================================
  vElevation =
    h;
  vSlope =
    1.0
    -
    clamp(
      geometricNormal.y,
      0.0,
      1.0
    );
  vCrest =
    crestMask;
  // High-frequency breakup signal used by micro normals,
  // sun glitter, and foam.
  vDetail =
    sin(
      p.x * 5.0
      +
      p.z * 4.3
      +
      uTime *
      uSpeed *
      5.5
    )
    *
    0.5
    +
    0.5;
  gl_Position =
    projectionMatrix
    *
    viewMatrix
    *
    worldPosition;
}
`,
// ============================================================
// FRAGMENT SHADER
// ============================================================
fragmentShader: `
precision highp float;
// ============================================================
// UNIFORMS
// ============================================================
uniform float uTime;
uniform float uHeight;
uniform float uFoam;
uniform float uReflectivity;
uniform float uDepth;
uniform float uMicroNormal;
uniform float uBreaking;
uniform float uWhitecaps;
uniform float uSunIntensity;
uniform float uFogDensity;
uniform float uGlitter;
uniform vec3 uSunDirection;
uniform vec3 uFogColor;
// ============================================================
// INPUT FROM VERTEX SHADER
// ============================================================
varying vec3 vWorldPosition;
varying vec3 vNormal;
varying float vElevation;
varying float vSlope;
varying float vDetail;
varying float vCrest;
// ============================================================
// MAIN
// ============================================================
void main() {
  // ==========================================================
  // LARGE-SCALE GEOMETRIC NORMAL
  // ==========================================================
  vec3 N =
    normalize(
      vNormal
    );
  // ==========================================================
  // MICRO NORMAL FIELD
  //
  // This affects lighting/reflection without requiring extra
  // geometry. Multiple frequencies prevent the ocean from
  // looking like a smoothly shaded sheet.
  // ==========================================================
  float micro1 =
    sin(
      vWorldPosition.x * 7.3
      +
      vWorldPosition.z * 4.7
      +
      uTime * 3.1
    );
  float micro2 =
    cos(
      vWorldPosition.x * 5.1
      -
      vWorldPosition.z * 8.4
      +
      uTime * 2.7
    );
  float micro3 =
    sin(
      vWorldPosition.x * 13.2
      +
      vWorldPosition.z * 10.7
      -
      uTime * 4.3
    );
  vec3 microNormal =
    vec3(
      micro1 +
      micro3 * 0.35,
      0.0,
      micro2 -
      micro3 * 0.25
    )
    *
    uMicroNormal
    *
    0.055;
  N =
    normalize(
      N +
      microNormal
    );
  // ==========================================================
  // VIEW + SUN VECTORS
  // ==========================================================
  vec3 V =
    normalize(
      cameraPosition -
      vWorldPosition
    );
  vec3 L =
    normalize(
      uSunDirection
    );
  // ==========================================================
  // WATER BODY COLORS
  // ==========================================================
  vec3 abyss =
    vec3(
      0.002,
      0.027,
      0.052
    );
  vec3 deepWater =
    vec3(
      0.004,
      0.105,
      0.18
    );
  vec3 surfaceWater =
    vec3(
      0.018,
      0.285,
      0.35
    );
  float heightScale =
    max(
      uHeight,
      0.10
    );
  float elevation =
    clamp(
      vElevation /
      heightScale *
      0.5
      +
      0.5,
      0.0,
      1.0
    );
  vec3 waterColor =
    mix(
      deepWater,
      abyss,
      uDepth *
      0.72
    );
  waterColor =
    mix(
      waterColor,
      surfaceWater,
      elevation *
      0.31
    );
  // ==========================================================
  // FRESNEL
  //
  // Grazing angles become strongly reflective while looking
  // downward into the water reveals more body color.
  // ==========================================================
  float normalView =
    clamp(dot(N,V),0.0,1.0);
  float fresnel =
    0.025
    +
    0.975 *
    pow(
      1.0 -
      normalView,
      4.5
    );
  vec3 horizonReflection =
    vec3(
      0.43,
      0.60,
      0.68
    );
  vec3 upperSkyReflection =
    vec3(
      0.055,
      0.20,
      0.34
    );
  float skyFactor =
    clamp(
      V.y *
      0.5 +
      0.5,
      0.0,
      1.0
    );
  vec3 reflection =
    mix(
      horizonReflection,
      upperSkyReflection,
      skyFactor
    );
  vec3 color =
    mix(
      waterColor,
      reflection,
      fresnel *
      uReflectivity
    );
  // ==========================================================
  // DIFFUSE SUNLIGHT
  // ==========================================================
  float diffuse =
    max(
      dot(
        N,
        L
      ),
      0.0
    );
  color +=
    vec3(
      0.025,
      0.045,
      0.050
    )
    *
    diffuse
    *
    uSunIntensity;
  // ==========================================================
  // SPECULAR SUN PATH
  // ==========================================================
  vec3 H =
    normalize(
      L + V
    );
  float alignment =
    max(
      dot(
        N,
        H
      ),
      0.0
    );
  float broadSpecular =
    pow(
      alignment,
      30.0
    );
  float sharpSpecular =
    pow(
      alignment,
      190.0
    );
  // Micro-normal field + procedural detail cause individual
  // points along the sun path to flash.
  float sparkle =
    mix(
      1.0,
      0.38 +
      vDetail *
      1.25,
      uGlitter
    );
  vec3 sunlight =
    vec3(
      1.0,
      0.68,
      0.34
    );
  color +=
    sunlight
    *
    broadSpecular
    *
    uSunIntensity
    *
    0.13;
  color +=
    sunlight
    *
    sharpSpecular
    *
    uSunIntensity
    *
    3.1
    *
    sparkle;
  // ==========================================================
  // CREST ILLUMINATION
  // ==========================================================
  float crestLight =
    smoothstep(
      0.45,
      0.95,
      vCrest
    );
  color +=
    vec3(
      0.055,
      0.090,
      0.095
    )
    *
    crestLight;
  // ==========================================================
  // BREAKING DETECTION
  //
  // A breaking candidate needs BOTH:
  //
  // 1. sufficient geometric slope
  // 2. position in the upper region of the wave
  //
  // This is considerably better than painting every high
  // vertex white.
  // ==========================================================
  float breakingSlope =
    smoothstep(
      uBreaking,
      uBreaking +
      0.18,
      vSlope
    );
  float upperWave =
    smoothstep(
      0.52,
      0.84,
      elevation
    );
  float breaking =
    breakingSlope
    *
    upperWave;
  // ==========================================================
  // IRREGULAR BREAKING EDGE
  // ==========================================================
  float breakup1 =
    sin(
      vWorldPosition.x * 3.7
      +
      vWorldPosition.z * 4.9
      +
      uTime * 2.8
    );
  float breakup2 =
    sin(
      vWorldPosition.x * 8.1
      -
      vWorldPosition.z * 6.3
      -
      uTime * 4.1
    );
  float breakup =
    0.60
    +
    breakup1 *
    0.20
    +
    breakup2 *
    0.12
    +
    vDetail *
    0.18;
  breaking *=
    clamp(
      breakup,
      0.0,
      1.0
    );
  // ==========================================================
  // ORDINARY CREST FOAM
  // ==========================================================
  float crestFoam =
    smoothstep(
      0.70,
      0.98,
      elevation
    );
  float foamAmount =
    crestFoam
    *
    uFoam
    *
    0.52;
  // ==========================================================
  // BREAKING WHITECAPS
  // ==========================================================
  foamAmount +=
    breaking
    *
    uWhitecaps;
  // Break up the interior of the foam.
  foamAmount *=
    0.52
    +
    vDetail *
    0.66;
  foamAmount =
    clamp(
      foamAmount,
      0.0,
      1.0
    );
  // ==========================================================
  // FOAM COLOR
  // ==========================================================
  vec3 foamColor =
    vec3(
      0.82,
      0.91,
      0.91
    );
  color =
    mix(
      color,
      foamColor,
      foamAmount *
      0.74
    );
  // ==========================================================
  // EXTRA WHITEWATER ON AGGRESSIVE BREAKING FACES
  // ==========================================================
  float whitewater =
    breaking
    *
    uWhitecaps
    *
    smoothstep(
      0.55,
      1.0,
      vCrest
    );
  color +=
    vec3(
      0.13,
      0.16,
      0.15
    )
    *
    whitewater;
  // ==========================================================
  // DISTANCE HAZE
  // ==========================================================
  float distanceToCamera =
    length(
      cameraPosition -
      vWorldPosition
    );
  float fogAmount =
    1.0
    -
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
        fogAmount,
        0.0,
        1.0
      )
    );
  // ==========================================================
  // OUTPUT
  // ==========================================================
  gl_FragColor =
    vec4(
      color,
      1.0
    );
}
`
  });
}
 const material=createOceanMaterial();material.name='Oceanworks displaced water';return material;
}
