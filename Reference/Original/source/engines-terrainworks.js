/* Generated from the user's Terrainworks.html. See vendor/user-engines/manifest.json.
   Reusable engine code, without its editor, CDN loader, camera or animation loop.
   Rebuild with node scripts/extract-engines.mjs. */
(function(root){root.TerrainworksCore={create(options={}){const settings={seed:48127,warp:.65,continentScale:1,ridgeFrequency:1,ridgeSharpness:2,erosionScale:1,terracing:.1,cliffThreshold:.4,cliffStrength:1,baseElevation:0,landmass:1.6,mountainHeight:22,hills:3,valleyDepth:4,erosion:1.5,detail:.4,biomeScale:1,moisture:.6,temperature:.55,rockCluster:.55,...options},getSeed=()=>settings.seed;
function clamp01(value) {
  return Math.max(
    0,
    Math.min(
      1,
      value
    )
  );
}
function lerp(
  a,
  b,
  t
) {
  return (
    a +
    (b-a)*t
  );
}
function smoothValue(t) {
  return (
    t *
    t *
    (
      3 -
      2*t
    )
  );
}
function hash2(
  x,
  z,
  seedOffset = 0
) {
  const xi =
    Math.floor(x);
  const zi =
    Math.floor(z);
  let h =
    Math.imul(
      xi,
      374761393
    )
    +
    Math.imul(
      zi,
      668265263
    )
    +
    Math.imul(
      getSeed() + seedOffset,
      1442695041
    );
  h =
    h ^
    (h >>> 13);
  h =
    Math.imul(
      h,
      1274126177
    );
  h =
    h ^
    (h >>> 16);
  return (
    h >>> 0
  ) / 4294967295;
}
function noise2(
  x,
  z,
  seedOffset = 0
) {
  const xi =
    Math.floor(x);
  const zi =
    Math.floor(z);
  const xf =
    x-xi;
  const zf =
    z-zi;
  const u =
    smoothValue(xf);
  const v =
    smoothValue(zf);
  const a =
    hash2(
      xi,
      zi,
      seedOffset
    );
  const b =
    hash2(
      xi+1,
      zi,
      seedOffset
    );
  const c =
    hash2(
      xi,
      zi+1,
      seedOffset
    );
  const d =
    hash2(
      xi+1,
      zi+1,
      seedOffset
    );
  const x1 =
    lerp(
      a,
      b,
      u
    );
  const x2 =
    lerp(
      c,
      d,
      u
    );
  return (
    lerp(
      x1,
      x2,
      v
    ) *
    2 -
    1
  );
}
function fbm(
  x,
  z,
  octaves = 5,
  seedOffset = 0
) {
  let value =
    0;
  let amplitude =
    .5;
  let frequency =
    1;
  let normalization =
    0;
  for (
    let octave=0;
    octave<octaves;
    octave++
  ) {
    value +=
      noise2(
        x*frequency,
        z*frequency,
        seedOffset +
        octave*101
      )
      *
      amplitude;
    normalization +=
      amplitude;
    amplitude *=
      .5;
    frequency *=
      2.03;
  }
  return (
    value /
    Math.max(
      normalization,
      .0001
    )
  );
}
function ridgedFBM(
  x,
  z,
  octaves = 5,
  seedOffset = 500
) {
  let value =
    0;
  let amplitude =
    .55;
  let frequency =
    1;
  let normalization =
    0;
  for (
    let octave=0;
    octave<octaves;
    octave++
  ) {
    let n =
      noise2(
        x*frequency,
        z*frequency,
        seedOffset +
        octave*173
      );
    n =
      1 -
      Math.abs(n);
    // Concentrate energy along ridge centers.
    n *=
      n;
    value +=
      n *
      amplitude;
    normalization +=
      amplitude;
    amplitude *=
      .52;
    frequency *=
      2.08;
  }
  return (
    value /
    Math.max(
      normalization,
      .0001
    )
  );
}
function domainWarp(
  x,
  z
) {
  const amount =
    settings.warp;
  if (amount <= .001) {
    return {
      x,
      z
    };
  }
  const qx =
    fbm(
      x*.018,
      z*.018,
      4,
      1800
    );
  const qz =
    fbm(
      x*.018 + 17.3,
      z*.018 - 11.7,
      4,
      2400
    );
  return {
    x:
      x +
      qx *
      amount *
      18,
    z:
      z +
      qz *
      amount *
      18
  };
}
function continentalField(
  x,
  z
) {
  const scale =
    settings.continentScale;
  const frequency =
    .0045 *
    scale;
  const primary =
    fbm(
      x*frequency,
      z*frequency,
      5,
      3100
    );
  const secondary =
    fbm(
      x*frequency*.42 + 30,
      z*frequency*.42 - 17,
      3,
      3600
    );
  return (
    primary +
    secondary*.42
  );
}
function mountainField(
  x,
  z
) {
  const frequency =
    settings.ridgeFrequency;
  const sharpness =
    settings.ridgeSharpness;
  let ridge =
    ridgedFBM(
      x*.012*frequency,
      z*.012*frequency,
      6,
      5100
    );
  ridge =
    Math.pow(
      Math.max(
        ridge,
        0
      ),
      sharpness
    );
  // Broad mountain-range mask.
  const rangeNoise =
    fbm(
      x*.0045,
      z*.0045,
      4,
      5900
    );
  const rangeMask =
    smoothValue(
      clamp01(
        rangeNoise*.75 +
        .52
      )
    );
  return (
    ridge *
    rangeMask
  );
}
function hillField(
  x,
  z
) {
  return fbm(
    x*.018,
    z*.018,
    5,
    7100
  );
}
function valleyField(
  x,
  z
) {
  const n =
    fbm(
      x*.011,
      z*.011,
      4,
      8200
    );
  let channel =
    1 -
    Math.min(
      1,
      Math.abs(n)*5
    );
  channel *=
    channel;
  return channel;
}
function erosionField(
  x,
  z
) {
  const scale =
    settings.erosionScale;
  const e1 =
    fbm(
      x*.018*scale,
      z*.006*scale,
      4,
      9100
    );
  const e2 =
    fbm(
      x*.007*scale + 12,
      z*.021*scale - 9,
      4,
      9600
    );
  const e3 =
    fbm(
      x*.012*scale - 23,
      z*.013*scale + 31,
      3,
      10100
    );
  const channel1 =
    1 -
    Math.min(
      1,
      Math.abs(e1)*6
    );
  const channel2 =
    1 -
    Math.min(
      1,
      Math.abs(e2)*7
    );
  const channel3 =
    1 -
    Math.min(
      1,
      Math.abs(e3)*8
    );
  return Math.max(
    channel1,
    channel2*.82,
    channel3*.62
  );
}
function detailField(
  x,
  z
) {
  const broad =
    fbm(
      x*.075,
      z*.075,
      4,
      11200
    );
  const fine =
    fbm(
      x*.17,
      z*.17,
      3,
      11800
    );
  return (
    broad*.78 +
    fine*.22
  );
}
function applyTerracing(
  height
) {
  const amount =
    settings.terracing;
  if (amount <= .001) {
    return height;
  }
  const stepSize =
    1.45;
  const lower =
    Math.floor(
      height /
      stepSize
    )
    *
    stepSize;
  const upper =
    lower +
    stepSize;
  const local =
    (
      height -
      lower
    )
    /
    stepSize;
  // Keep terrace transitions slightly rounded.
  const terraceBlend =
    smoothValue(
      clamp01(
        local*1.8
      )
    );
  const shaped =
    lerp(
      lower,
      upper,
      terraceBlend
    );
  return lerp(
    height,
    shaped,
    amount*.88
  );
}
function cliffField(
  x,
  z
) {
  const e =
    1.15;
  const center =
    mountainField(
      x,
      z
    );
  const dx =
    mountainField(
      x+e,
      z
    )
    -
    mountainField(
      x-e,
      z
    );
  const dz =
    mountainField(
      x,
      z+e
    )
    -
    mountainField(
      x,
      z-e
    );
  const gradient =
    Math.sqrt(
      dx*dx +
      dz*dz
    );
  const threshold =
    settings.cliffThreshold;
  const strength =
    settings.cliffStrength;
  const cliff =
    Math.max(
      0,
      gradient -
      threshold*.10
    );
  return (
    cliff *
    strength *
    center *
    5
  );
}
function terrainHeight(
  originalX,
  originalZ
) {
  const warped =
    domainWarp(
      originalX,
      originalZ
    );
  const x =
    warped.x;
  const z =
    warped.z;
  const base =
    settings.baseElevation;
  const landmassStrength =
    settings.landmass;
  const mountainStrength =
    settings.mountainHeight;
  const hillStrength =
    settings.hills;
  const valleyStrength =
    settings.valleyDepth;
  const erosionStrength =
    settings.erosion;
  const detailStrength =
    settings.detail;
  const continent =
    continentalField(
      x,
      z
    );
  const mountains =
    mountainField(
      x,
      z
    );
  let height =
    base;
  // ----------------------------------------------------------
  // CONTINENTAL FOUNDATION
  // ----------------------------------------------------------
  height +=
    continent *
    landmassStrength *
    6;
  // ----------------------------------------------------------
  // HILLS
  // ----------------------------------------------------------
  height +=
    hillField(
      x,
      z
    )
    *
    hillStrength;
  // ----------------------------------------------------------
  // MOUNTAIN RANGES
  // ----------------------------------------------------------
  height +=
    mountains *
    mountainStrength;
  // ----------------------------------------------------------
  // VALLEYS
  // ----------------------------------------------------------
  height -=
    valleyField(
      x,
      z
    )
    *
    valleyStrength
    *
    (
      .35 +
      mountains*.65
    );
  // ----------------------------------------------------------
  // EROSION CHANNELS
  // ----------------------------------------------------------
  height -=
    erosionField(
      x,
      z
    )
    *
    erosionStrength
    *
    2.8
    *
    (
      .30 +
      mountains*.70
    );
  // ----------------------------------------------------------
  // FINE DETAIL
  // ----------------------------------------------------------
  height +=
    detailField(
      x,
      z
    )
    *
    detailStrength;
  // ----------------------------------------------------------
  // CLIFF SHARPENING
  // ----------------------------------------------------------
  height +=
    cliffField(
      x,
      z
    );
  // ----------------------------------------------------------
  // TERRACES
  // ----------------------------------------------------------
  height =
    applyTerracing(
      height
    );
  return height;
}
function moistureField(
  x,
  z
) {
  const scale =
    settings.biomeScale;
  const globalMoisture =
    settings.moisture;
  const broad =
    fbm(
      x*.008*scale,
      z*.008*scale,
      5,
      13100
    );
  const local =
    fbm(
      x*.022*scale + 37,
      z*.022*scale - 19,
      3,
      13600
    );
  return clamp01(
    globalMoisture +
    broad*.30 +
    local*.08
  );
}
function temperatureField(
  x,
  z,
  elevation
) {
  const scale =
    settings.biomeScale;
  const globalTemperature =
    settings.temperature;
  const climateNoise =
    fbm(
      x*.006*scale + 40,
      z*.006*scale - 25,
      4,
      14200
    );
  const altitudeCooling =
    Math.max(
      elevation,
      0
    )
    *
    .018;
  return clamp01(
    globalTemperature +
    climateNoise*.20 -
    altitudeCooling
  );
}
function rockClusterField(
  x,
  z
) {
  const clustering =
    settings.rockCluster;
  if (clustering <= .001) {
    return 1;
  }
  const field =
    fbm(
      x*.025,
      z*.025,
      4,
      16300
    );
  const normalized =
    clamp01(
      field*.5+.5
    );
  return lerp(
    1,
    normalized,
    clustering
  );
}
return{height:terrainHeight,moisture:moistureField,temperature:temperatureField,rocks:rockClusterField,settings};}};})(globalThis);
