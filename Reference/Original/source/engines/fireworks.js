/* Generated from the user's Fireworks.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
import * as THREE from 'three';
export function createFireworks(options={}){
 const settings={fuel:1.1,oxygen:1,temperature:.64,height:3,width:1.3,turbulence:.8,flicker:.65,wind:.2,windDirection:25,gust:.45,emberRate:.65,sparkHeight:5,sparkSpread:1.2,smoke:.4,smokeExpansion:1,soot:.7,glow:.35,flameCount:1800,emberCount:280,smokeCount:350,...options};
 const random=options.random||Math.random,scene=new THREE.Group(),stage=()=>{};
 let flamePoints=null,flameMaterial=null,emberPoints=null,emberMaterial=null,smokePoints=null,smokeMaterial=null;
 function createFlameMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending:
      THREE.AdditiveBlending,
    uniforms: {
      uTime: {
        value: 0
      },
      uFuel: {
        value:
          settings.fuel
      },
      uOxygen: {
        value:
          settings.oxygen
      },
      uTemperature: {
        value:
          settings.temperature
      },
      uHeight: {
        value:
          settings.height
      },
      uWidth: {
        value:
          settings.width
      },
      uTurbulence: {
        value:
          settings.turbulence
      },
      uFlicker: {
        value:
          settings.flicker
      },
      uWind: {
        value:
          settings.wind
      },
      uWindDirection: {
        value:
          THREE.MathUtils.degToRad(
            settings.windDirection
          )
      },
      uGust: {
        value:
          settings.gust
      },
      uGlow: {
        value:
          settings.glow
      }
    },
// ============================================================
// FLAME VERTEX SHADER
// ============================================================
vertexShader: `
precision highp float;
uniform float uTime;
uniform float uFuel;
uniform float uOxygen;
uniform float uHeight;
uniform float uWidth;
uniform float uTurbulence;
uniform float uFlicker;
uniform float uWind;
uniform float uWindDirection;
uniform float uGust;
attribute float aSeed;
attribute float aPhase;
attribute float aRadius;
attribute float aSize;
attribute float aSpeed;
varying float vLife;
varying float vSeed;
varying float vHeat;
varying float vEdge;
// ============================================================
// HASH
// ============================================================
float hash(float n) {
  return fract(
    sin(n) *
    43758.5453123
  );
}
// ============================================================
// VALUE NOISE
// ============================================================
float noise3(
  vec3 p
) {
  vec3 i =
    floor(p);
  vec3 f =
    fract(p);
  f =
    f *
    f *
    (
      3.0 -
      2.0*f
    );
  float n =
    dot(
      i,
      vec3(
        1.0,
        57.0,
        113.0
      )
    );
  return mix(
    mix(
      mix(
        hash(n+0.0),
        hash(n+1.0),
        f.x
      ),
      mix(
        hash(n+57.0),
        hash(n+58.0),
        f.x
      ),
      f.y
    ),
    mix(
      mix(
        hash(n+113.0),
        hash(n+114.0),
        f.x
      ),
      mix(
        hash(n+170.0),
        hash(n+171.0),
        f.x
      ),
      f.y
    ),
    f.z
  );
}
// ============================================================
// MAIN FLAME PARTICLE MOTION
// ============================================================
void main() {
  // ----------------------------------------------------------
  // PARTICLE LIFECYCLE
  //
  // Each GPU particle continuously respawns by wrapping its
  // normalized age from 0 -> 1.
  // ----------------------------------------------------------
  float life =
    fract(
      aPhase
      +
      uTime *
      aSpeed *
      (
        0.15 +
        uFuel*0.08
      )
    );
  vLife =
    life;
  vSeed =
    aSeed;
  // ----------------------------------------------------------
  // BASE FLAME SHAPE
  //
  // Flame is wide at the fuel bed and contracts as it rises.
  // ----------------------------------------------------------
  float taper =
    pow(
      max(
        1.0-life,
        0.0
      ),
      0.72
    );
  float baseAngle =
    aSeed *
    6.2831853;
  float radius =
    aRadius
    *
    uWidth
    *
    taper;
  vec3 p =
    vec3(
      cos(baseAngle) *
      radius,
      life *
      uHeight,
      sin(baseAngle) *
      radius
    );
  // ----------------------------------------------------------
  // BUOYANCY ACCELERATION
  //
  // Flames stretch faster toward the upper region.
  // ----------------------------------------------------------
  p.y +=
    life *
    life *
    uHeight *
    0.20;
  // ----------------------------------------------------------
  // LARGE TURBULENT FLAME MOTION
  // ----------------------------------------------------------
  float time =
    uTime;
  float noiseA =
    noise3(
      vec3(
        p.x*0.65 +
        aSeed*5.0,
        life*3.5,
        time*1.25
      )
    );
  float noiseB =
    noise3(
      vec3(
        p.z*0.72 +
        aSeed*9.0,
        life*4.1,
        time*1.05 +
        17.0
      )
    );
  float turbulenceEnvelope =
    sin(
      life *
      3.14159265
    );
  p.x +=
    (
      noiseA -
      0.5
    )
    *
    uTurbulence
    *
    (
      0.35 +
      life*0.8
    )
    *
    turbulenceEnvelope;
  p.z +=
    (
      noiseB -
      0.5
    )
    *
    uTurbulence
    *
    (
      0.35 +
      life*0.8
    )
    *
    turbulenceEnvelope;
  // ----------------------------------------------------------
  // FLAME TONGUES
  //
  // Several frequencies create separate twisting columns
  // rather than one symmetrical cone.
  // ----------------------------------------------------------
  float tongue1 =
    sin(
      life*8.0
      -
      time*4.2
      +
      aSeed*12.0
    );
  float tongue2 =
    sin(
      life*13.0
      -
      time*5.7
      +
      aSeed*19.0
    );
  p.x +=
    tongue1
    *
    uTurbulence
    *
    0.11
    *
    life;
  p.z +=
    tongue2
    *
    uTurbulence
    *
    0.09
    *
    life;
  // ----------------------------------------------------------
  // WIND
  // ----------------------------------------------------------
  vec2 windDirection =
    vec2(
      cos(
        uWindDirection
      ),
      sin(
        uWindDirection
      )
    );
  // Wind has progressively more leverage on hot rising gas.
  float windEnvelope =
    life *
    life;
  p.x +=
    windDirection.x
    *
    uWind
    *
    windEnvelope
    *
    uHeight
    *
    0.18;
  p.z +=
    windDirection.y
    *
    uWind
    *
    windEnvelope
    *
    uHeight
    *
    0.18;
  // ----------------------------------------------------------
  // GUSTS
  // ----------------------------------------------------------
  float gust =
    sin(
      time*1.7
      +
      life*4.0
      +
      aSeed*6.283
    );
  gust +=
    sin(
      time*3.7 +
      aSeed*11.0
    )
    *
    0.35;
  p.x +=
    windDirection.x
    *
    gust
    *
    uGust
    *
    life
    *
    0.30;
  p.z +=
    windDirection.y
    *
    gust
    *
    uGust
    *
    life
    *
    0.30;
  // ----------------------------------------------------------
  // FLICKER
  // ----------------------------------------------------------
  float flicker =
    sin(
      time*9.0
      +
      aSeed*17.0
    );
  flicker +=
    sin(
      time*14.0
      +
      aSeed*7.0
    )
    *
    0.4;
  p.y +=
    flicker
    *
    uFlicker
    *
    0.08
    *
    life;
  // ----------------------------------------------------------
  // TEMPERATURE / HEAT VALUE
  //
  // Lower flame region is hottest. Oxygen increases the
  // effective hot region.
  // ----------------------------------------------------------
  float heat =
    1.0 -
    life;
  heat =
    pow(
      heat,
      0.55
    );
  heat *=
    mix(
      0.75,
      1.15,
      clamp(
        uOxygen/2.0,
        0.0,
        1.0
      )
    );
  vHeat =
    clamp(
      heat,
      0.0,
      1.0
    );
  // ----------------------------------------------------------
  // EDGE SIGNAL
  // ----------------------------------------------------------
  vEdge =
    clamp(
      radius /
      max(
        uWidth,
        0.001
      ),
      0.0,
      1.0
    );
  // ----------------------------------------------------------
  // PROJECT
  // ----------------------------------------------------------
  vec4 worldPosition =
    modelMatrix *
    vec4(
      p,
      1.0
    );
  vec4 viewPosition =
    viewMatrix *
    worldPosition;
  gl_Position =
    projectionMatrix *
    viewPosition;
  // ----------------------------------------------------------
  // PERSPECTIVE PARTICLE SIZE
  // ----------------------------------------------------------
  float size =
    aSize
    *
    (
      18.0 +
      uWidth*10.0
    );
  // Larger near the base, smaller near the tip.
  size *=
    mix(
      1.15,
      0.35,
      life
    );
  gl_PointSize =
    size
    *
    (
      18.0 /
      max(
        -viewPosition.z,
        1.0
      )
    );
}
`,
// ============================================================
// FLAME FRAGMENT SHADER
// ============================================================
fragmentShader: `
precision highp float;
uniform float uTemperature;
uniform float uOxygen;
uniform float uGlow;
varying float vLife;
varying float vSeed;
varying float vHeat;
varying float vEdge;
void main() {
  // ----------------------------------------------------------
  // ROUND PARTICLE
  // ----------------------------------------------------------
  vec2 point =
    gl_PointCoord -
    vec2(0.5);
  float distanceFromCenter =
    length(point);
  if (
    distanceFromCenter >
    0.5
  ) {
    discard;
  }
  // ----------------------------------------------------------
  // SOFT PARTICLE PROFILE
  // ----------------------------------------------------------
  float radial =
    1.0 -
    smoothstep(
      0.08,
      0.50,
      distanceFromCenter
    );
  // ----------------------------------------------------------
  // BLACKBODY-LIKE FLAME GRADIENT
  //
  // Not a literal physical blackbody implementation, but the
  // ordering follows hot core -> yellow -> orange -> red.
  // ----------------------------------------------------------
  vec3 deepRed =
    vec3(
      1.0,
      0.055,
      0.005
    );
  vec3 orange =
    vec3(
      1.0,
      0.22,
      0.015
    );
  vec3 yellow =
    vec3(
      1.0,
      0.68,
      0.12
    );
  vec3 hotWhite =
    vec3(
      1.0,
      0.94,
      0.72
    );
  // Temperature shifts more of the flame toward the hot end.
  float temperature =
    clamp(
      vHeat *
      uTemperature,
      0.0,
      1.0
    );
  vec3 color;
  if (
    temperature <
    0.33
  ) {
    color =
      mix(
        deepRed,
        orange,
        temperature /
        0.33
      );
  }
  else if (
    temperature <
    0.68
  ) {
    color =
      mix(
        orange,
        yellow,
        (
          temperature -
          0.33
        )
        /
        0.35
      );
  }
  else {
    color =
      mix(
        yellow,
        hotWhite,
        (
          temperature -
          0.68
        )
        /
        0.32
      );
  }
  // ----------------------------------------------------------
  // OXYGEN EFFECT
  //
  // Higher oxygen produces a tighter, brighter hot core.
  // ----------------------------------------------------------
  float oxygenBoost =
    mix(
      0.78,
      1.22,
      clamp(
        uOxygen/2.0,
        0.0,
        1.0
      )
    );
  color *=
    oxygenBoost;
  // ----------------------------------------------------------
  // LOWER CORE BRIGHTNESS
  // ----------------------------------------------------------
  float core =
    pow(
      1.0 -
      vLife,
      2.0
    );
  color +=
    hotWhite
    *
    core
    *
    0.35
    *
    uGlow;
  // ----------------------------------------------------------
  // PARTICLE ALPHA
  //
  // Fade in rapidly at the fuel bed, remain strong through
  // the body, then disappear toward the tip.
  // ----------------------------------------------------------
  float birth =
    smoothstep(
      0.0,
      0.06,
      vLife
    );
  float death =
    1.0 -
    smoothstep(
      0.58,
      1.0,
      vLife
    );
  float alpha =
    radial
    *
    birth
    *
    death;
  // Thin outer flame particles slightly.
  alpha *=
    mix(
      1.0,
      0.62,
      vEdge
    );
  // ----------------------------------------------------------
  // ADDITIVE GLOW
  // ----------------------------------------------------------
  color *=
    1.0 +
    uGlow *
    0.32;
  gl_FragColor =
    vec4(
      color,
      alpha *
      0.72
    );
}
`
  });
}
function rebuildFlames() {
  stage("allocating flame particles");
  if (flamePoints) {
    scene.remove(
      flamePoints
    );
    flamePoints.geometry.dispose();
    flamePoints.material.dispose();
    flamePoints =
      null;
  }
  const count =
    settings.flameCount;
  // Position is required by THREE.Points even though the
  // procedural shader generates the meaningful coordinates.
  const positions =
    new Float32Array(
      count * 3
    );
  const seeds =
    new Float32Array(
      count
    );
  const phases =
    new Float32Array(
      count
    );
  const radii =
    new Float32Array(
      count
    );
  const sizes =
    new Float32Array(
      count
    );
  const speeds =
    new Float32Array(
      count
    );
  for (
    let i=0;
    i<count;
    i++
  ) {
    const i3 =
      i*3;
    positions[i3] =
      0;
    positions[i3+1] =
      0;
    positions[i3+2] =
      0;
    seeds[i] =
      random();
    phases[i] =
      random();
    // sqrt gives better radial distribution.
    radii[i] =
      Math.sqrt(
        random()
      );
    sizes[i] =
      0.65 +
      random() *
      0.85;
    speeds[i] =
      0.75 +
      random() *
      0.55;
  }
  const geometry =
    new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      positions,
      3
    )
  );
  geometry.setAttribute(
    "aSeed",
    new THREE.BufferAttribute(
      seeds,
      1
    )
  );
  geometry.setAttribute(
    "aPhase",
    new THREE.BufferAttribute(
      phases,
      1
    )
  );
  geometry.setAttribute(
    "aRadius",
    new THREE.BufferAttribute(
      radii,
      1
    )
  );
  geometry.setAttribute(
    "aSize",
    new THREE.BufferAttribute(
      sizes,
      1
    )
  );
  geometry.setAttribute(
    "aSpeed",
    new THREE.BufferAttribute(
      speeds,
      1
    )
  );
  flameMaterial =
    createFlameMaterial();
  flamePoints =
    new THREE.Points(
      geometry,
      flameMaterial
    );
  flamePoints.frustumCulled =
    false;
  scene.add(
    flamePoints
  );
  stage("flame particles ready");
}
function createEmberMaterial() {
  return new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    blending:
      THREE.AdditiveBlending,
    uniforms: {
      uTime: {
        value: 0
      },
      uRate: {
        value:
          settings.emberRate
      },
      uHeight: {
        value:
          settings.sparkHeight
      },
      uSpread: {
        value:
          settings.sparkSpread
      },
      uWind: {
        value:
          settings.wind
      },
      uWindDirection: {
        value:
          THREE.MathUtils.degToRad(
            settings.windDirection
          )
      },
      uGust: {
        value:
          settings.gust
      },
      uTurbulence: {
        value:
          settings.turbulence
      }
    },
// ============================================================
// EMBER VERTEX SHADER
// ============================================================
vertexShader: `
precision highp float;
uniform float uTime;
uniform float uRate;
uniform float uHeight;
uniform float uSpread;
uniform float uWind;
uniform float uWindDirection;
uniform float uGust;
uniform float uTurbulence;
attribute float aSeed;
attribute float aPhase;
attribute float aSpeed;
attribute float aSize;
varying float vLife;
varying float vHeat;
varying float vSeed;
float hash(float n) {
  return fract(
    sin(n) *
    43758.5453123
  );
}
void main() {
  // ----------------------------------------------------------
  // LIFETIME
  // ----------------------------------------------------------
  float life =
    fract(
      aPhase +
      uTime *
      aSpeed *
      (
        0.10 +
        uRate*0.08
      )
    );
  vLife =
    life;
  vSeed =
    aSeed;
  // ----------------------------------------------------------
  // RANDOM LAUNCH DIRECTION
  // ----------------------------------------------------------
  float angle =
    aSeed *
    6.2831853;
  float secondary =
    hash(
      aSeed*91.7
    );
  float launchRadius =
    (
      0.10 +
      secondary*0.42
    )
    *
    uSpread;
  vec3 p =
    vec3(
      cos(angle) *
      launchRadius *
      life,
      0.25,
      sin(angle) *
      launchRadius *
      life
    );
  // ----------------------------------------------------------
  // RISING BALLISTIC TRAJECTORY
  //
  // Embers initially rise quickly, slow, then begin to arc.
  // ----------------------------------------------------------
  float rise =
    life *
    uHeight;
  float dragFall =
    life *
    life *
    uHeight *
    0.36;
  p.y +=
    rise -
    dragFall;
  // ----------------------------------------------------------
  // SIDEWAYS SPREAD
  // ----------------------------------------------------------
  p.x +=
    cos(
      angle*2.7
    )
    *
    life
    *
    uSpread
    *
    0.22;
  p.z +=
    sin(
      angle*3.1
    )
    *
    life
    *
    uSpread
    *
    0.22;
  // ----------------------------------------------------------
  // WIND
  // ----------------------------------------------------------
  vec2 windDir =
    vec2(
      cos(
        uWindDirection
      ),
      sin(
        uWindDirection
      )
    );
  p.x +=
    windDir.x
    *
    uWind
    *
    life *
    life
    *
    1.8;
  p.z +=
    windDir.y
    *
    uWind
    *
    life *
    life
    *
    1.8;
  // ----------------------------------------------------------
  // GUSTS
  // ----------------------------------------------------------
  float gust =
    sin(
      uTime*2.0
      +
      aSeed*18.0
      +
      life*6.0
    );
  p.x +=
    windDir.x
    *
    gust
    *
    uGust
    *
    life
    *
    0.45;
  p.z +=
    windDir.y
    *
    gust
    *
    uGust
    *
    life
    *
    0.45;
  // ----------------------------------------------------------
  // CHAOTIC SPARK MOTION
  // ----------------------------------------------------------
  p.x +=
    sin(
      uTime*5.0
      +
      aSeed*31.0
    )
    *
    uTurbulence
    *
    life
    *
    0.08;
  p.z +=
    cos(
      uTime*4.2
      +
      aSeed*27.0
    )
    *
    uTurbulence
    *
    life
    *
    0.08;
  // ----------------------------------------------------------
  // COOLING
  // ----------------------------------------------------------
  vHeat =
    pow(
      1.0-life,
      0.65
    );
  // ----------------------------------------------------------
  // PROJECT
  // ----------------------------------------------------------
  vec4 world =
    modelMatrix *
    vec4(
      p,
      1.0
    );
  vec4 view =
    viewMatrix *
    world;
  gl_Position =
    projectionMatrix *
    view;
  float pointSize =
    aSize
    *
    mix(
      8.0,
      2.0,
      life
    );
  gl_PointSize =
    pointSize
    *
    (
      18.0 /
      max(
        -view.z,
        1.0
      )
    );
}
`,
// ============================================================
// EMBER FRAGMENT SHADER
// ============================================================
fragmentShader: `
precision highp float;
varying float vLife;
varying float vHeat;
varying float vSeed;
void main() {
  vec2 p =
    gl_PointCoord -
    vec2(0.5);
  float d =
    length(p);
  if (
    d > 0.5
  ) {
    discard;
  }
  float core =
    1.0 -
    smoothstep(
      0.0,
      0.5,
      d
    );
  // Hot white/yellow -> orange -> dark red.
  vec3 hot =
    vec3(
      1.0,
      0.88,
      0.48
    );
  vec3 orange =
    vec3(
      1.0,
      0.23,
      0.015
    );
  vec3 red =
    vec3(
      0.55,
      0.025,
      0.002
    );
  vec3 color =
    mix(
      red,
      orange,
      smoothstep(
        0.0,
        0.65,
        vHeat
      )
    );
  color =
    mix(
      color,
      hot,
      smoothstep(
        0.70,
        1.0,
        vHeat
      )
    );
  // Occasional bright sparks.
  float sparkle =
    step(
      0.82,
      fract(
        vSeed*17.31
      )
    );
  color +=
    hot
    *
    sparkle
    *
    core
    *
    0.7;
  float fade =
    1.0 -
    smoothstep(
      0.72,
      1.0,
      vLife
    );
  gl_FragColor =
    vec4(
      color,
      core *
      fade *
      0.95
    );
}
`
  });
}
function rebuildEmbers() {
  stage("allocating embers");
  if (emberPoints) {
    scene.remove(
      emberPoints
    );
    emberPoints.geometry.dispose();
    emberPoints.material.dispose();
    emberPoints =
      null;
  }
  const count =
    settings.emberCount;
  const positions =
    new Float32Array(
      count*3
    );
  const seeds =
    new Float32Array(
      count
    );
  const phases =
    new Float32Array(
      count
    );
  const speeds =
    new Float32Array(
      count
    );
  const sizes =
    new Float32Array(
      count
    );
  for (
    let i=0;
    i<count;
    i++
  ) {
    seeds[i] =
      random();
    phases[i] =
      random();
    speeds[i] =
      0.55 +
      random() *
      1.0;
    sizes[i] =
      0.6 +
      random() *
      1.6;
  }
  const geometry =
    new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      positions,
      3
    )
  );
  geometry.setAttribute(
    "aSeed",
    new THREE.BufferAttribute(
      seeds,
      1
    )
  );
  geometry.setAttribute(
    "aPhase",
    new THREE.BufferAttribute(
      phases,
      1
    )
  );
  geometry.setAttribute(
    "aSpeed",
    new THREE.BufferAttribute(
      speeds,
      1
    )
  );
  geometry.setAttribute(
    "aSize",
    new THREE.BufferAttribute(
      sizes,
      1
    )
  );
  emberMaterial =
    createEmberMaterial();
  emberPoints =
    new THREE.Points(
      geometry,
      emberMaterial
    );
  emberPoints.frustumCulled =
    false;
  scene.add(
    emberPoints
  );
  stage("embers ready");
}
function createSmokeMaterial() {
  return new THREE.ShaderMaterial({
    transparent:
      true,
    depthWrite:
      false,
    blending:
      THREE.NormalBlending,
    uniforms: {
      uTime: {
        value: 0
      },
      uAmount: {
        value:
          settings.smoke
      },
      uExpansion: {
        value:
          settings.smokeExpansion
      },
      uSoot: {
        value:
          settings.soot
      },
      uHeight: {
        value:
          settings.height
      },
      uWidth: {
        value:
          settings.width
      },
      uWind: {
        value:
          settings.wind
      },
      uWindDirection: {
        value:
          THREE.MathUtils.degToRad(
            settings.windDirection
          )
      },
      uGust: {
        value:
          settings.gust
      },
      uTurbulence: {
        value:
          settings.turbulence
      }
    },
// ============================================================
// SMOKE VERTEX SHADER
// ============================================================
vertexShader: `
precision highp float;
uniform float uTime;
uniform float uAmount;
uniform float uExpansion;
uniform float uSoot;
uniform float uHeight;
uniform float uWidth;
uniform float uWind;
uniform float uWindDirection;
uniform float uGust;
uniform float uTurbulence;
attribute float aSeed;
attribute float aPhase;
attribute float aSpeed;
attribute float aSize;
attribute float aRadius;
varying float vLife;
varying float vSeed;
varying float vSoot;
void main() {
  float life =
    fract(
      aPhase +
      uTime *
      aSpeed *
      (
        0.035 +
        uAmount*0.025
      )
    );
  vLife =
    life;
  vSeed =
    aSeed;
  vSoot =
    uSoot;
  float angle =
    aSeed *
    6.2831853;
  // ----------------------------------------------------------
  // START ABOVE THE BRIGHT FLAME BODY
  // ----------------------------------------------------------
  float startHeight =
    uHeight *
    0.42;
  float riseDistance =
    uHeight *
    (
      0.9 +
      uExpansion*0.9
    );
  float radius =
    (
      aRadius *
      uWidth *
      0.55
    )
    +
    life *
    uExpansion *
    1.35;
  vec3 p =
    vec3(
      cos(angle) *
      radius,
      startHeight +
      life *
      riseDistance,
      sin(angle) *
      radius
    );
  // ----------------------------------------------------------
  // SMOKE BILLowing
  // ----------------------------------------------------------
  p.x +=
    sin(
      life*9.0 +
      uTime*0.9 +
      aSeed*13.0
    )
    *
    uTurbulence
    *
    (
      0.15 +
      life*0.55
    );
  p.z +=
    cos(
      life*8.0 +
      uTime*0.75 +
      aSeed*17.0
    )
    *
    uTurbulence
    *
    (
      0.15 +
      life*0.55
    );
  // ----------------------------------------------------------
  // WIND DRIFT
  // ----------------------------------------------------------
  vec2 windDir =
    vec2(
      cos(
        uWindDirection
      ),
      sin(
        uWindDirection
      )
    );
  float windEffect =
    life *
    life;
  p.x +=
    windDir.x
    *
    uWind
    *
    windEffect
    *
    uHeight
    *
    0.55;
  p.z +=
    windDir.y
    *
    uWind
    *
    windEffect
    *
    uHeight
    *
    0.55;
  // ----------------------------------------------------------
  // SLOW GUSTS
  // ----------------------------------------------------------
  float gust =
    sin(
      uTime*1.1 +
      aSeed*8.0 +
      life*3.0
    );
  p.x +=
    windDir.x
    *
    gust
    *
    uGust
    *
    life
    *
    0.75;
  p.z +=
    windDir.y
    *
    gust
    *
    uGust
    *
    life
    *
    0.75;
  // ----------------------------------------------------------
  // PROJECT
  // ----------------------------------------------------------
  vec4 world =
    modelMatrix *
    vec4(
      p,
      1.0
    );
  vec4 view =
    viewMatrix *
    world;
  gl_Position =
    projectionMatrix *
    view;
  // Smoke expands strongly as it cools.
  float size =
    aSize
    *
    mix(
      20.0,
      70.0,
      life
    )
    *
    (
      0.65 +
      uExpansion*0.45
    );
  gl_PointSize =
    size
    *
    (
      18.0 /
      max(
        -view.z,
        1.0
      )
    );
}
`,
// ============================================================
// SMOKE FRAGMENT SHADER
// ============================================================
fragmentShader: `
precision highp float;
varying float vLife;
varying float vSeed;
varying float vSoot;
void main() {
  vec2 p =
    gl_PointCoord -
    vec2(0.5);
  float d =
    length(p);
  if (
    d > 0.5
  ) {
    discard;
  }
  // ----------------------------------------------------------
  // SOFT PUFF
  // ----------------------------------------------------------
  float radial =
    1.0 -
    smoothstep(
      0.08,
      0.50,
      d
    );
  radial *=
    radial;
  // ----------------------------------------------------------
  // SMOKE COLOR
  // ----------------------------------------------------------
  vec3 lightSmoke =
    vec3(
      0.20,
      0.19,
      0.18
    );
  vec3 sootSmoke =
    vec3(
      0.025,
      0.024,
      0.023
    );
  vec3 color =
    mix(
      lightSmoke,
      sootSmoke,
      vSoot
    );
  // Slight warm illumination near the fire.
  float warm =
    1.0 -
    smoothstep(
      0.0,
      0.40,
      vLife
    );
  color +=
    vec3(
      0.15,
      0.055,
      0.015
    )
    *
    warm;
  // ----------------------------------------------------------
  // LIFE ALPHA
  // ----------------------------------------------------------
  float birth =
    smoothstep(
      0.0,
      0.12,
      vLife
    );
  float death =
    1.0 -
    smoothstep(
      0.60,
      1.0,
      vLife
    );
  float alpha =
    radial
    *
    birth
    *
    death
    *
    0.34;
  gl_FragColor =
    vec4(
      color,
      alpha
    );
}
`
  });
}
function rebuildSmoke() {
  stage("allocating smoke");
  if (smokePoints) {
    scene.remove(
      smokePoints
    );
    smokePoints.geometry.dispose();
    smokePoints.material.dispose();
    smokePoints =
      null;
  }
  const count =
    settings.smokeCount;
  const positions =
    new Float32Array(
      count*3
    );
  const seeds =
    new Float32Array(
      count
    );
  const phases =
    new Float32Array(
      count
    );
  const speeds =
    new Float32Array(
      count
    );
  const sizes =
    new Float32Array(
      count
    );
  const radii =
    new Float32Array(
      count
    );
  for (
    let i=0;
    i<count;
    i++
  ) {
    seeds[i] =
      random();
    phases[i] =
      random();
    speeds[i] =
      0.65 +
      random() *
      0.55;
    sizes[i] =
      0.65 +
      random() *
      0.8;
    radii[i] =
      Math.sqrt(
        random()
      );
  }
    // ==========================================================
  // SMOKE GEOMETRY ATTRIBUTES
  // ==========================================================
  const geometry =
    new THREE.BufferGeometry();
  geometry.setAttribute(
    "position",
    new THREE.BufferAttribute(
      positions,
      3
    )
  );
  geometry.setAttribute(
    "aSeed",
    new THREE.BufferAttribute(
      seeds,
      1
    )
  );
  geometry.setAttribute(
    "aPhase",
    new THREE.BufferAttribute(
      phases,
      1
    )
  );
  geometry.setAttribute(
    "aSpeed",
    new THREE.BufferAttribute(
      speeds,
      1
    )
  );
  geometry.setAttribute(
    "aSize",
    new THREE.BufferAttribute(
      sizes,
      1
    )
  );
  geometry.setAttribute(
    "aRadius",
    new THREE.BufferAttribute(
      radii,
      1
    )
  );
  smokeMaterial =
    createSmokeMaterial();
  smokePoints =
    new THREE.Points(
      geometry,
      smokeMaterial
    );
  smokePoints.frustumCulled =
    false;
  scene.add(
    smokePoints
  );
  stage("smoke ready");
}
function updateFlameUniforms() {
  if (!flameMaterial) {
    return;
  }
  const u =
    flameMaterial.uniforms;
  u.uFuel.value =
    settings.fuel;
  u.uOxygen.value =
    settings.oxygen;
  u.uTemperature.value =
    settings.temperature;
  u.uHeight.value =
    settings.height;
  u.uWidth.value =
    settings.width;
  u.uTurbulence.value =
    settings.turbulence;
  u.uFlicker.value =
    settings.flicker;
  u.uWind.value =
    settings.wind;
  u.uWindDirection.value =
    THREE.MathUtils.degToRad(
      settings.windDirection
    );
  u.uGust.value =
    settings.gust;
  u.uGlow.value =
    settings.glow;
}
function updateEmberUniforms() {
  if (!emberMaterial) {
    return;
  }
  const u =
    emberMaterial.uniforms;
  u.uRate.value =
    settings.emberRate;
  u.uHeight.value =
    settings.sparkHeight;
  u.uSpread.value =
    settings.sparkSpread;
  u.uWind.value =
    settings.wind;
  u.uWindDirection.value =
    THREE.MathUtils.degToRad(
      settings.windDirection
    );
  u.uGust.value =
    settings.gust;
  u.uTurbulence.value =
    settings.turbulence;
}
function updateSmokeUniforms() {
  if (!smokeMaterial) {
    return;
  }
  const u =
    smokeMaterial.uniforms;
  u.uAmount.value =
    settings.smoke;
  u.uExpansion.value =
    settings.smokeExpansion;
  u.uSoot.value =
    settings.soot;
  u.uHeight.value =
    settings.height;
  u.uWidth.value =
    settings.width;
  u.uWind.value =
    settings.wind;
  u.uWindDirection.value =
    THREE.MathUtils.degToRad(
      settings.windDirection
    );
  u.uGust.value =
    settings.gust;
  u.uTurbulence.value =
    settings.turbulence;
}
 rebuildFlames();rebuildEmbers();rebuildSmoke();
 // Normal alpha blending prevents hundreds of flame sprites accumulating into white.
 flameMaterial.blending=THREE.NormalBlending;
 flameMaterial.fragmentShader=flameMaterial.fragmentShader.replace(/vec3 hotWhite\s*=\s*vec3\([\s\S]*?\);/, 'vec3 hotWhite = vec3(1.,.39,.035);');
 flameMaterial.fragmentShader=flameMaterial.fragmentShader.replace(/hotWhite\s*\*\s*core\s*\*\s*0.35/, 'hotWhite * core * .07');
 flameMaterial.fragmentShader=flameMaterial.fragmentShader.replace(/}\s*$/, '#include <tonemapping_fragment>\n#include <colorspace_fragment>\n}');
 scene.name='Fireworks flame / ember / smoke';scene.traverse(o=>{o.userData.skipAO=true;});
 return {root:scene,settings,materials:[flameMaterial,emberMaterial,smokeMaterial],update(time,values={}){Object.assign(settings,values);updateFlameUniforms();updateEmberUniforms();updateSmokeUniforms();for(const m of this.materials)m.uniforms.uTime.value=time;smokePoints.visible=settings.smoke>0;},dispose(){for(const p of [flamePoints,emberPoints,smokePoints]){p.geometry.dispose();p.material.dispose();}scene.removeFromParent();}};
}
