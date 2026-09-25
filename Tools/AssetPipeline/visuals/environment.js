import {waterTransition,terrainTransition} from './surface-transition.js';
import {cloudPlatform} from './cloud-platform.js';
import {partitionInstances} from './view-culling.js';
import {createOceanworks} from "../engines/oceanworks.js";
import {
  T,
  box,
  mesh,
  rod,
  ring,
  plate,
  beam,
  label,
  bake,
} from "./primitives.js";

function pavementTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 2048;
  const q = c.getContext("2d");
  q.fillStyle = "#464a46";
  q.fillRect(0, 0, 2048, 2048);
  // Concrete pours, drainage slots, expansion joints and worn markings.
  for (let y = 0; y < 2048; y += 128)
    for (let x = 0; x < 2048; x += 128) {
      const v = 65 + ((x * 13 + y * 7) % 23);
      q.fillStyle = `rgb(${v},${v + 3},${v})`;
      q.fillRect(x + 2, y + 2, 124, 124);
      q.fillStyle = "#222b29";
      q.fillRect(x + 4, y + 6, 2, 2);
      q.fillRect(x + 121, y + 120, 2, 2);
    }
  let seed = 871;
  const rnd = () =>
    ((seed = (Math.imul(seed, 1664525) + 1013904223) | 0) >>> 0) / 4294967296;
  for (let i = 0; i < 90000; i++) {
    q.fillStyle = rnd() < 0.5 ? "#dde0cf12" : "#070d071a";
    q.fillRect(rnd() * 2048, rnd() * 2048, 1 + rnd() * 4, 1 + rnd() * 3);
  }
  q.strokeStyle = "#b3ac87";
  q.lineWidth = 3;
  q.setLineDash([35, 15]);
  q.strokeRect(290, 80, 1468, 1888);
  q.setLineDash([]);
  q.fillStyle = "#171e1e";
  for (const x of [235, 1810]) {
    q.fillRect(x, 0, 18, 2048);
    q.fillStyle = "#65675f";
    for (let y = 0; y < 2048; y += 10) q.fillRect(x, y, 18, 2);
    q.fillStyle = "#171e1e";
  }
  const tex = new T.CanvasTexture(c);
  tex.colorSpace = T.SRGBColorSpace;
  tex.wrapS = tex.wrapT = T.RepeatWrapping;
  tex.anisotropy = 8;
  return tex;
}
function facade(m, h, w, d, seed) {
  const g = new T.Group();
  // Recessed structural bays and dark glazing, irregular service floors.
  for (const side of [-1, 1]) {
    for (let i = -2; i <= 2; i++) {
      box(
        g,
        m.dark,
        [i * w * 0.17, h * 0.48, side * (d * 0.5 + 0.12)],
        [2.0, h * 0.91, 0.62],
        0.1,
      );
      box(
        g,
        m.steel,
        [i * w * 0.17 - 0.55, h * 0.48, side * (d * 0.5 + 0.49)],
        [0.24, h * 0.88, 0.12],
        0,
      );
    }
    for (let y = 9; y < h - 4; y += 7.8) {
      box(
        g,
        m.dark,
        [0, y, side * (d * 0.5 + 0.3)],
        [w * 0.94, 2.7, 0.75],
        0.08,
      );
      for (let i = -2; i <= 2; i++) {
        box(
          g,
          m.glass,
          [i * w * 0.17 + 1.1, y + 0.15, side * (d * 0.5 + 0.7)],
          [w * 0.13, 1.36, 0.06],
          0,
        );
        if ((i + Math.round(y) + seed) % 7 === 0)
          box(
            g,
            m.amber,
            [i * w * 0.17 + 1.1, y - 0.7, side * (d * 0.5 + 0.77)],
            [w * 0.1, 0.095, 0.05],
            0,
          );
      }
    }
    for (let j = -1; j <= 1; j++) {
      box(
        g,
        m.dark,
        [side * (w * 0.5 + 0.8), h * 0.34, j * d * 0.3],
        [2.1, h * 0.68, 4.5],
        0.15,
      );
      box(
        g,
        m.steel,
        [side * (w * 0.5 + 1.91), h * 0.35, j * d * 0.3],
        [0.22, h * 0.62, 0.42],
        0,
      );
    }
  }
  return g;
}
export function buildPort(m, body, C) {
  const g = new T.Group();
  if(body.type===3)cloudPlatform(g,m,body.activeSettlement?.kind==='outpost'?120:480);
  if(body.activeSettlement?.kind==='outpost'){box(g,m.concrete,[0,-7,0],[120,16,120],.3);label(g,body.activeSettlement.name.toUpperCase(),[0,1.05,-52],[34,2.8],'#c4ba99',[-Math.PI/2,0,0]);for(const side of [-1,1]){box(g,m.amber,[side*17,1.035,-45],[.2,.05,18],0);rod(g,m.dark,[side*52,1,40],[side*52,16,40],.35,.12);}return bake(g);}

  g.name = body.name + " spaceport";
  const groundMat = m.concrete.clone();
  groundMat.map = m.art?.exterior[2].map.clone() || pavementTexture();
  groundMat.map.needsUpdate = true;
  groundMat.map.repeat.set(12, 12);
  groundMat.roughness = 0.97;
  box(g, m.concrete, [0, -7, 0], [480, 16, 480], 0.5);
  plate(g, groundMat, [0, 1.015, 0], [480, 480], [-Math.PI / 2, 0, 0]);
  // Long flight line remains free of collisions and scenery.
  const road = m.dark.clone();
  road.roughness = 0.96;
  road.metalness = 0.1;
  plate(g, road, [0, 1.022, 0], [52, 450], [-Math.PI / 2, 0, 0]);
  for (const x of [-24, 24]) {
    plate(g, m.accent, [x, 1.028, 0], [0.25, 450], [-Math.PI / 2, 0, 0]);
    for (let z = -220; z < 221; z += 22) {
      box(g, m.dark, [x, 1.12, z], [1.1, 0.2, 1.1], 0.05);
      plate(g, m.glow, [x, 1.24, z], [0.28, 0.56], [-Math.PI / 2, 0, 0]);
    }
  }
  for (let z = -210; z < 210; z += 22)
    plate(g, m.ceramic, [0, 1.029, z], [0.35, 13], [-Math.PI / 2, 0, 0]);
  for (let ix = -4; ix <= 4; ix++)
    for (let iz = -4; iz <= 4; iz++) {
      if (C.CityWorld || !ix || Math.hypot(ix, iz) <= 1.6) continue;
      const seed = C.hash(
          ((ix + 29) * 73856093) ^ ((iz + 41) * 19349663) ^ body.seed,
        ),
        h =
          34 +
          (seed / 4294967296) * 190 * (body.settlementStyle === 2 ? 0.65 : 1),
        type = seed % 4;
      const b = new T.Group();
      b.position.set(ix * 160, 9, -iz * 160);
      g.add(b);
      const bm = m.building.clone();
      bm.color.offsetHSL((seed % 7) * 0.003, -0.08, ((seed % 5) - 2) * 0.025);
      const levels =
        type === 0
          ? [
              [0, h * 0.29, 0, 94, h * 0.58, 98],
              [-10, h * 0.75, -2, 70, h * 0.34, 78],
              [-8, h * 0.95, 0, 54, h * 0.1, 60],
            ]
          : type === 1
            ? [
                [0, h * 0.08, 0, 94, h * 0.16, 98],
                [-26, h * 0.55, 0, 38, h * 0.82, 82],
                [26, h * 0.55, 0, 38, h * 0.82, 82],
                [0, h * 0.65, 0, 92, 10, 44],
              ]
            : type === 3
              ? [
                  [0, h * 0.325, 0, 94, h * 0.65, 98],
                  [13, h * 0.825, 0, 56, h * 0.35, 78],
                ]
              : [[0, h * 0.5, 0, 94, h, 94]];
      box(b, m.concrete, [0, -5, 0], [104, 6, 108], 0.4);
      for (const [x, y, z, w, hh, d] of levels) {
        box(b, bm, [x, y, z], [w + 8, hh + 8, d + 8], 0.8);
        const f = facade(m, hh, w + 8, d + 8, seed);
        f.position.set(x, y - hh * 0.5, z);
        b.add(f);
        box(b, m.dark, [x, y + hh * 0.5 + 4.2, z], [w + 10, 0.8, d + 10], 0.1);
        for (let k = 0; k < 3; k++)
          box(
            b,
            m.dark,
            [x + (k - 1) * w * 0.23, y + hh * 0.5 + 5.8, z],
            [w * 0.16, 3.2, d * 0.23],
            0.2,
          );
      }
      for (const side of [-1, 1]) {
        box(b, m.concrete, [side * 47, 5, 0], [10, 22, 102], 0.7);
        box(b, m.dark, [0, 5, side * 54.1], [24, 14, 1.4], 0.3);
        box(b, m.steel, [0, 12, side * 55], [26, 0.6, 0.8], 0.08);
        box(b, m.amber, [0, 11, side * 55.6], [20, 0.12, 0.1], 0);
      }
      rod(
        b,
        m.steel,
        [9, h + 4, 2],
        [9, h + 17 + (seed % 13), 2],
        0.24,
        0.12,
        6,
      );
      box(b, m.red, [9, h + 18 + (seed % 13), 2], [0.32, 0.6, 0.32], 0.04);
      label(
        b,
        `${String(Math.abs(ix * 9 + iz)).padStart(2, "0")} / ${["FREIGHT", "TRANSIT", "PORT OPS", "HABITAT"][type]}`,
        [0, 22, 54.25],
        [30, 3],
        "#c1baa1",
      );
    }
  // Compact transit bridge anchors the dense district skyline.
  box(g,m.dark,[0,24,88],[220,6,15],.3);
  for(const side of [-1,1]){box(g,m.concrete,[side*102,12,88],[5,24,12],.2);box(g,m.glass,[0,24,88+side*7.6],[200,3,.1],0);}
  for (const s of [-1, 1])
    for (let z = -210; z < 220; z += 42) {
      rod(g, m.dark, [s * 28, 1, z], [s * 28, 11, z], 0.27, 0.16);
      beam(g, m.dark, [s * 28, 11, z], [s * 26, 11.5, z], 0.2, 0.2);
      box(g, m.amber, [s * 26, 11.47, z], [1.4, 0.1, 0.25], 0.025);
    }
  // Explicit markings on the arrival apron.
  for (const x of [-1, 1])
    for (let z = -3; z < 4; z++)
      plate(
        g,
        m.ceramic,
        [x * 31, 1.03, z * 6 - 94],
        [7, 1.1],
        [-Math.PI / 2, 0, 0],
      );
  label(g, "01   /   ARRIVALS", [0, 1.04, -122], [36, 6], "#c4ba99", [
    -Math.PI / 2,
    0,
    0,
  ]);
  return bake(g);
}
export function buildStation(m) {
  const g = new T.Group();
  g.name = "Orbital anchorage";
  box(g, m.dark, [0, -240, 0], [960, 100, 1400], 3);
  box(g, m.dark, [0, 265, 0], [960, 50, 1400], 3);
  for (const s of [-1, 1]) {
    box(g, m.hull, [s * 412.5, 25, 0], [135, 430, 1400], 3);
    box(g, m.dark, [s * 1280, 0, 220], [860, 48, 1100], 2);
    beam(g, m.hull, [s * 380, 0, 260], [s * 900, 0, 260], 70, 70);
    beam(g, m.hull, [0, s * 240, 260], [0, s * 910, 260], 70, 70);
    box(g, m.dark, [s * 290, -145, 260], [74, 96, 360], 2);
    for (let z = -620; z < 660; z += 96) {
      box(g, m.steel, [s * 349, 15, z], [8, 415, 12], 0.2);
      box(g, m.amber, [s * 343, 210, z], [2, 3, 24], 0.1);
      box(g, m.glow, [s * 340, -187, z], [3, 0.5, 24], 0.1);
    }
    for (let k = 0; k < 12; k++) {
      const z = -460 + k * 88;
      box(g, m.steel, [s * 1250, 26, z], [710, 1.4, 1.5], 0);
    }
  }
  const habitat = ring(g, m.hull, [0, 0, 260], 920, 55);
  habitat.geometry.dispose();
  habitat.geometry = new T.TorusGeometry(920, 55, 8, 96);
  for (let k = 0; k < 32; k++) {
    const a = (k / 32) * Math.PI * 2;
    const seg = box(
      g,
      m.dark,
      [Math.cos(a) * 921, Math.sin(a) * 921, 260],
      [13, 130, 130],
      1,
    );
    seg.rotation.z = a;
    box(
      g,
      m.amber,
      [Math.cos(a) * 980, Math.sin(a) * 980, 260],
      [4, 4, 24],
      0.2,
    );
  }
  const paving = m.concrete.clone();
  paving.map = pavementTexture();
  paving.map.repeat.set(7, 14);
  plate(g, paving, [0, -189.98, 0], [690, 1400], [-Math.PI / 2, 0, 0]);
  for (const x of [-130, 130])
    plate(g, m.accent, [x, -189.97, 0], [1, 1350], [-Math.PI / 2, 0, 0]);
  for (let z = -650; z < 700; z += 60)
    plate(g, m.ceramic, [0, -189.96, z], [2, 30], [-Math.PI / 2, 0, 0]);
  label(g, "04 / APPROACH", [0, 175, -692], [250, 33], "#c4beaa", [
    0,
    Math.PI,
    0,
  ]);
  label(g, "LONGWAY  /  ANCHORAGE", [0, 178, 692], [430, 35]);
  return bake(g);
}
export function* buildTerrainJob(m, W, b, p, C, segments=192, state={}) {
  const n = C.unit(C.sub(p, b.center)),
    right = C.unit(C.cross([0, 1, 0], n), [1, 0, 0]),
    forward = C.unit(C.cross(n, right)),
    center = C.add(b.center, C.mul(n, b.radius));
  const frame = { center, up: n, right, forward };
  state.frame=frame;state.origin=p.slice();
  const size = 12000,
    N = segments,
    geo = new T.PlaneGeometry(size, size, N, N);
  geo.rotateX(-Math.PI / 2);
  const a = geo.attributes.position,
    uv = geo.attributes.uv,
    colors = [], regions=[],
    waterPositions = [], waterDepths=[], rayHeights=new Float32Array((N+1)**2);
  const palettes = [
    [0.9, 0.91, 0.9],
    [0.83, 0.95, 0.8],
    [1, 0.91, 0.8],
    [0.9, 0.9, 0.9],
    [0.92, 1, 1],
    [0.37, 0.33, 0.31],
  ];
  const pal = palettes[b.type] || palettes[0];
  let complete=false;
  try {
  for (let i = 0; i < a.count; i++) {
    if(i%32===0)yield;
    // This frame is carried with the rotating planet between preparation slices.
    const {center,up:n,right,forward}=frame;
    const spread = (v) =>
        Math.sign(v) * Math.pow(Math.abs(v) / (size / 2), 2.1) * (size / 2),
      x = spread(a.getX(i)),
      z = spread(a.getZ(i)),
      guess = C.add(
        center,
        C.add(C.mul(right, x / 1000), C.mul(forward, -z / 1000)),
      ),
      nn = C.unit(C.sub(guess, b.center)),
      groundHeight = W.groundHeight(b, nn),
      pos = C.add(
        b.center,
        C.mul(
          nn,
          b.radius + groundHeight,
        ),
      ),
      delta = C.sub(pos, center);
    a.setXYZ(
      i,
      C.dot(delta, right) * 1000,
      C.dot(delta, n) * 1000,
      C.dot(delta, forward) * -1000,
    );
    waterDepths.push((b.sea-groundHeight)*1000);
    rayHeights[i]=b.liquid?Math.max(b.sea,groundHeight):C.length(C.sub(pos,b.center))-b.radius;
    const waterDelta = C.sub(
      C.add(b.center, C.mul(nn, b.radius + b.sea + 0.00025)),
      center,
    );
    waterPositions.push(
      C.dot(waterDelta, right) * 1000,
      C.dot(waterDelta, n) * 1000,
      C.dot(waterDelta, forward) * -1000,
    );
    uv.setXY(i, C.dot(C.bodyLocal?.(b,nn)||nn,C.Landscape.right)*b.radius*200, C.dot(C.bodyLocal?.(b,nn)||nn,C.Landscape.forward)*b.radius*200);
    const region=C.PlanetEngines.region(b,nn,C.length(C.sub(pos,b.center))-b.radius);regions.push(region.moisture,region.temperature,region.terrainRock,region.exposure);
    // Coherent biome tint stays fixed when the patch recenters; per-vertex hashes
    // made moving triangular speckle patterns across otherwise continuous land.
    const k = .88 + region.moisture * .08;
    colors.push(...pal.map((v) => v * k));
  }
  geo.setAttribute("color", new T.Float32BufferAttribute(colors, 3));
  geo.setAttribute("regionData",new T.Float32BufferAttribute(regions,4));
  geo.computeVertexNormals();
  yield;
  // Keep compiled programs alive across patch swaps. Disposing the last old
  // material before the replacement's first draw forced a driver compile at
  // every recenter (hundreds of milliseconds even after sampling was sliced).
  m.surfaceMaterials??=new Map();
  const materialKey='terrain-'+b.type+'-'+(b.systemIndex>0),existing=m.surfaceMaterials.get(materialKey);
  const mat = existing || (m.terrainTypes?.[b.type] || m.terrain).clone();
  mat.vertexColors = true;
  // Match distant terrain's mineral palette, instead of bleaching the detail
  // patch with an uncoloured, brightly lit atlas (which looked like a cloud).
  mat.color.setHex([0x89847b,0x9aa784,0x967044,0x89847b,0xc0d0d3,0x63564d][b.type]||0x89847b);
  mat.userData.terrainColor=mat.color.clone();
  const g = new T.Group();
  if (m.art && !existing) {
    mat.onBeforeCompile = shader => {
      shader.uniforms.drySoilMap={value:m.art.geology[5].map};shader.uniforms.forestSoilMap={value:m.art.geology[6].map};shader.uniforms.frostMap={value:m.art.geology[9].map};
      shader.uniforms.slopeMap={value:m.art.geology[b.systemIndex>0&&b.type===1?11:[3,0,1,2,9,2][b.type]].map};shader.uniforms.rubbleMap={value:m.art.geology[8].map};
      shader.uniforms.shoreMap={value:m.art.geology[b.type===1?4:b.type===4?10:15].map};
      shader.vertexShader='attribute vec4 regionData;varying vec4 vRegion;varying float rockSlope;varying float terrainElevation;varying vec3 terrainPoint;varying vec3 terrainNormal;\n'+shader.vertexShader;
      shader.vertexShader=shader.vertexShader.replace('#include <beginnormal_vertex>','#include <beginnormal_vertex>\nvRegion=regionData;rockSlope=1.-abs(normal.y);terrainElevation=position.y;terrainPoint=position*.2;terrainNormal=normal;');
      const helpers=`uniform sampler2D drySoilMap;uniform sampler2D forestSoilMap;uniform sampler2D frostMap;varying vec4 vRegion;uniform sampler2D slopeMap;uniform sampler2D shoreMap;uniform sampler2D rubbleMap;varying float rockSlope;varying float terrainElevation;varying vec3 terrainPoint;varying vec3 terrainNormal;
vec2 spHash(vec2 p){return fract(sin(vec2(dot(p,vec2(127.1,311.7)),dot(p,vec2(269.5,183.3))))*43758.5453);}
vec4 spTile(sampler2D tex,vec2 uv){vec2 dx=dFdx(uv),dy=dFdy(uv),cell=floor(uv*.25),f=fract(uv*.25);f=f*f*(3.-2.*f);return mix(mix(textureGrad(tex,uv+spHash(cell)*37.,dx,dy),textureGrad(tex,uv+spHash(cell+vec2(1,0))*37.,dx,dy),f.x),mix(textureGrad(tex,uv+spHash(cell+vec2(0,1))*37.,dx,dy),textureGrad(tex,uv+spHash(cell+1.)*37.,dx,dy),f.x),f.y);}
float spNoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(spHash(i).x,spHash(i+vec2(1,0)).x,f.x),mix(spHash(i+vec2(0,1)).x,spHash(i+1.).x,f.x),f.y);}
`;
      shader.fragmentShader=helpers+shader.fragmentShader;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`vec3 mineralTint=diffuseColor.rgb;diffuseColor *= spTile(map,vMapUv);${b.type===1?'diffuseColor.rgb=mix(diffuseColor.rgb,spTile(drySoilMap,vMapUv*.7).rgb*mineralTint,.65*(1.-smoothstep(.2,.5,vRegion.x)));diffuseColor.rgb=mix(diffuseColor.rgb,spTile(forestSoilMap,vMapUv).rgb*mineralTint,smoothstep(.5,.85,vRegion.x)*.7);':''}float macroTone=.78+.30*spNoise(vMapUv*.035)+.08*spNoise(vMapUv*.13);diffuseColor.rgb*=macroTone;float sideWeight=abs(terrainNormal.z)/(abs(terrainNormal.x)+abs(terrainNormal.z)+.0001);vec3 rock=mix(spTile(slopeMap,terrainPoint.zy*.52).rgb,spTile(slopeMap,terrainPoint.xy*.52).rgb,sideWeight);float rubble=(1.-smoothstep(.09,.28,rockSlope))*smoothstep(.25,.72,vRegion.z)*.48;diffuseColor.rgb=mix(diffuseColor.rgb,spTile(rubbleMap,vMapUv*.65).rgb*mineralTint,rubble);float rocky=smoothstep(.06,.28,rockSlope);diffuseColor.rgb=mix(diffuseColor.rgb,rock*.82*mineralTint,rocky);${[1,4].includes(b.type)?"diffuseColor.rgb=mix(diffuseColor.rgb,spTile(frostMap,vMapUv*.7).rgb,(1.-smoothstep(.08,.2,vRegion.y))*.55);":""}${b.type===1?'float shore=(1.-smoothstep(1.,7.,terrainElevation))*(1.-rocky);diffuseColor.rgb=mix(diffuseColor.rgb,spTile(shoreMap,vMapUv*.8).rgb*.8*mineralTint,shore*.8);':''}`);
      for(const name of ['normal_fragment_maps','roughnessmap_fragment','metalnessmap_fragment','aomap_fragment']){const chunk=T.ShaderChunk[name].replace(/texture2D\( (normalMap|roughnessMap|metalnessMap|aoMap), (vNormalMapUv|vRoughnessMapUv|vMetalnessMapUv|vAoMapUv) \)/g,'spTile( $1, $2 )');shader.fragmentShader=shader.fragmentShader.replace('#include <'+name+'>',chunk);}
    };
    mat.customProgramCacheKey=()=> 'seeded-surface-'+b.type;
  }
  if(!existing){terrainTransition(mat);m.surfaceMaterials.set(materialKey,mat);}
  mesh(g, geo, mat);
  if (b.liquid && b.type !== 3) {
    const waterGeo = geo.clone();
    waterGeo.setAttribute(
      "position",
      new T.Float32BufferAttribute(waterPositions, 3),
    );
    waterGeo.computeVertexNormals();
    const lava = b.liquid === 2,waterKey='water-'+b.id,
      waterMat = m.surfaceMaterials.get(waterKey) || (lava ? new T.MeshStandardMaterial({
        color: lava ? 0x351b11 : 0x326c70,
        roughness: lava ? 0.56 : 0.19,
        metalness: lava ? 0.1 : 0.48,
        emissive: lava ? 0xdf3f08 : 0x061312,
        emissiveIntensity: lava ? 1.2 : 0.3,
        normalMap: m.hull.normalMap,
        normalScale: new T.Vector2(0.12, 0.12),
        transparent: !lava,
        opacity: lava ? 1 : 0.9,
      }) : createOceanworks({height:C.PlanetEngines.profile(b).waveHeight,length:C.PlanetEngines.profile(b).waveLength,
        wind:C.PlanetEngines.profile(b).wind,sunDirection:C.SUN,breaking:.18,foam:.25,whitecaps:.24}));
    waterTransition(waterMat,waterGeo,waterDepths);
    m.surfaceMaterials.set(waterKey,waterMat);
    const water=mesh(g, waterGeo, waterMat);
    water.userData.skipAO=true;
    water.userData.oceanworks=!lava;g.userData.oceanworks=!lava;
    g.userData.water = true;
  }
  g.userData.worldFrame = frame;
  // Reuse the rendered patch's height samples in the background ray pass.
  // The collider keeps its exact field; the cache follows this mesh's LOD.
  g.userData.rayHeightCache={heights:rayHeights,side:N+1,halfSize:size/2000};
  g.userData.origin = state.origin;
  // Constant-time triangle interpolation for nearby weather contact. Avoid
  // thousands of exact world/biome samples each time the rain volume moves.
  g.userData.heightAt=point=>{
    const f=g.userData.worldFrame,delta=C.sub(point,f.center),xx=C.dot(delta,f.right)*1000,zz=-C.dot(delta,f.forward)*1000;
    if(Math.max(Math.abs(xx),Math.abs(zz))>size*.46)return null;
    const grid=v=>(Math.sign(v)*Math.pow(Math.abs(v)/(size/2),1/2.1)*.5+.5)*N;
    const ix=C.clamp(Math.floor(grid(xx)),0,N-1),iz=C.clamp(Math.floor(grid(zz)),0,N-1),k=iz*(N+1)+ix;
    const tx=C.clamp((xx-a.getX(k))/(a.getX(k+1)-a.getX(k)),0,1),tz=C.clamp((zz-a.getZ(k))/(a.getZ(k+N+1)-a.getZ(k)),0,1);
    const h00=a.getY(k),h10=a.getY(k+1),h01=a.getY(k+N+1),h11=a.getY(k+N+2);
    const y=tx+tz<=1?h00+(h10-h00)*tx+(h01-h00)*tz:h11+(h01-h11)*(1-tx)+(h10-h11)*(1-tz);
    return C.add(f.center,C.add(C.mul(f.right,xx/1000),C.add(C.mul(f.up,y/1000),C.mul(f.forward,-zz/1000))));
  };
  g.userData.sampleSurface=point=>g.userData.heightAt(point)||point;
  complete=true;
  return g;
  }finally{if(!complete)geo.dispose();}
}
export function buildPlants(m, plants, W, body, C, terrain) {
  const g = new T.Group();
  if (!plants.length) return g;
  if(plants.length>1){
    const f=W.plantFrame||W.site(body),base=buildPlants(m,[{position:f.center,size:.01}],W,body,C),dummy=new T.Object3D();
    const placements=plants.map(p=>({position:W.toLocal(terrain?.userData.sampleSurface?.(p.position)||p.position,f).map(v=>v*1000),scale:p.size/.01}));
    for(const child of base.children.filter(o=>o.isMesh)){
      const batch=new T.InstancedMesh(child.geometry,child.material,placements.length);batch.castShadow=batch.receiveShadow=true;
      placements.forEach((p,i)=>{dummy.position.set(p.position[0],p.position[1],-p.position[2]);dummy.scale.setScalar(p.scale);dummy.updateMatrix();batch.setMatrixAt(i,dummy.matrix);});
      for(const cell of partitionInstances(batch,128))g.add(cell);
    }
    g.userData.worldFrame=f;return g;
  }
  const f = W.plantFrame || W.site(body);
  g.userData.worldFrame = f;
  for (const p of plants) {
    const pos = W.toLocal(terrain?.userData.sampleSurface?.(p.position)||p.position, f).map((v) => v * 1000),
      h = p.size * 1000;
    const tree = new T.Group();
    g.add(tree);
    tree.position.set(pos[0], pos[1], -pos[2]);
    rod(
      tree,
      m.bark,
      [0, 0, 0],
      [0.06 * h, h * 0.77, 0],
      h * 0.037,
      h * 0.014,
      7,
    );
    for (let k = 0; k < 8; k++) {
      const a = k * 2.39,
        y = h * (0.29 + k * 0.07),
        len = h * (0.24 - k * 0.014),
        end = [Math.cos(a) * len, y + h * 0.11, Math.sin(a) * len];
      rod(tree, m.bark, [0, y, 0], end, h * 0.013, h * 0.004, 6);
      for (let plane = 0; plane < 3; plane++) {
        const leaf = mesh(
          tree,
          new T.PlaneGeometry(h * 0.34, h * 0.27),
          m.leaves,
          [end[0], end[1] + h * 0.025, end[2]],
        );
        leaf.rotation.set(-0.28 + plane * 0.58, a + (plane * Math.PI) / 3, 0.2);
        leaf.castShadow = true;
      }
    }
  }
  return bake(g);
}
