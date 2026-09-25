import { T } from "./primitives.js";
export function createMaterials(renderer) {
  const N = 512,
    c = document.createElement("canvas");
  c.width = c.height = N;
  const q = c.getContext("2d"),
    data = q.createImageData(N, N),
    normal = new Uint8Array(N * N * 4),
    orm = new Uint8Array(N * N * 4);
  let seed = 0x71839;
  const rand = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const i = (y * N + x) * 4,
        r = rand(),
        edge = Math.min(x, N - x, y, N - y),
        seam = edge < 2,
        grain = Math.sin(y * 2.71) * 1.4 + (r - 0.5) * 7;
      const v = seam ? 80 : 211 + grain;
      data.data.set([v, v, v, 255], i);
      normal.set([128 + (r - 0.5) * 8, 128 + (rand() - 0.5) * 5, 254, 255], i);
      orm.set([seam ? 140 : 255, 160 + r * 60, seam ? 80 : 210, 255], i);
    }
  q.putImageData(data, 0, 0);
  q.strokeStyle = "#b4b5b1";
  q.lineWidth = 1;
  for (let i = 0; i < 70; i++) {
    const x = rand() * N,
      y = rand() * N;
    q.beginPath();
    q.moveTo(x, y);
    q.lineTo(x + rand() * 40, y + rand() * 2);
    q.stroke();
  }
  const map = new T.CanvasTexture(c);
  map.colorSpace = T.SRGBColorSpace;
  map.wrapS = map.wrapT = T.RepeatWrapping;
  map.anisotropy = renderer.capabilities.getMaxAnisotropy();
  const n = new T.DataTexture(normal, N, N);
  n.wrapS = n.wrapT = T.RepeatWrapping;
  n.needsUpdate = true;
  n.anisotropy = map.anisotropy;
  const o = new T.DataTexture(orm, N, N);
  o.wrapS = o.wrapT = T.RepeatWrapping;
  o.needsUpdate = true;
  const mat = (color, rough = 0.65, metal = 0.35, extra = {}) =>
    new T.MeshStandardMaterial({
      color,
      roughness: rough,
      metalness: metal,
      map,
      normalMap: n,
      normalScale: new T.Vector2(0.18, 0.18),
      roughnessMap: o,
      metalnessMap: o,
      aoMap: o,
      aoMapIntensity: 0.55,
      envMapIntensity: 1.0,
      ...extra,
    });
  const mats = {
    hull: mat(0x747f82, 0.47, 0.64),
    ceramic: mat(0x9c9c89, 0.64, 0.18),
    dark: mat(0x41494d, 0.64, 0.38),
    black: mat(0x161c20, 0.86, 0.05),
    steel: mat(0x858f92, 0.31, 0.88),
    rubber: mat(0x101417, 0.92, 0.03),
    brass: mat(0x978061, 0.56, 0.55),
    accent: mat(0xd7ac67, 0.6, 0.25),
    concrete: mat(0x65665f, 0.95, 0.03),
    building: mat(0x424c50, 0.72, 0.24),
    glass: new T.MeshPhysicalMaterial({
      color: 0x06121a,
      roughness: 0.13,
      metalness: 0.25,
      clearcoat: 1,
      clearcoatRoughness: 0.15,
      envMapIntensity: 1.4,
    }),
    glow: new T.MeshStandardMaterial({
      color: 0x6ea898,
      emissive: 0x4a8276,
      emissiveIntensity: 1.7,
      roughness: 0.3,
      metalness: 0.3,
    }),
    amber: new T.MeshStandardMaterial({
      color: 0xffbd65,
      emissive: 0xff741b,
      emissiveIntensity: 2,
      roughness: 0.3,
    }),
    red: new T.MeshStandardMaterial({
      color: 0xb74124,
      emissive: 0xbf3517,
      emissiveIntensity: 1.2,
      roughness: 0.4,
    }),
    terrain: mat(0x666050, 1, 0),
    rock: mat(0x736e60, 0.95, 0),
    bark: mat(0x373025, 0.95, 0),
    leaves: mat(0x3b4d37, 0.96, 0),
  };
  const tex = document.createElement("canvas");
  tex.width = tex.height = 1024;
  const tctx = tex.getContext("2d");
  tctx.fillStyle = "#79766b";
  tctx.fillRect(0, 0, 1024, 1024);
  for (let i = 0; i < 70000; i++) {
    const k = rand(),
      r = 0.3 + rand() * 3;
    tctx.fillStyle =
      k < 0.5
        ? `rgba(20,18,13,${0.03 + rand() * 0.3})`
        : `rgba(238,221,186,${rand() * 0.28})`;
    tctx.fillRect(rand() * 1024, rand() * 1024, r, r * 0.6);
  }
  const terrainMap = new T.CanvasTexture(tex);
  terrainMap.colorSpace = T.SRGBColorSpace;
  terrainMap.wrapS = terrainMap.wrapT = T.RepeatWrapping;
  terrainMap.anisotropy = map.anisotropy;
  mats.terrain.map = terrainMap;
  mats.rock.map = terrainMap;
  mats.coat = [];
  for (let family = 0; family < 5; family++) {
    const cv = document.createElement("canvas");
    cv.width = cv.height = 512;
    const ctx = cv.getContext("2d");
    ctx.fillStyle = ["#8a7962", "#766f60", "#3d3c37", "#2c3634", "#706b50"][
      family
    ];
    ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 10000; i++) {
      ctx.strokeStyle = rand() < 0.5 ? "#171d1721" : "#d9c6a032";
      const x = rand() * 512,
        y = rand() * 512;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x + rand() * 2, y + rand() * 12 + 2);
      ctx.stroke();
    }
    const tx = new T.CanvasTexture(cv);
    tx.colorSpace = T.SRGBColorSpace;
    tx.wrapS = tx.wrapT = T.RepeatWrapping;
    tx.anisotropy = 8;
    mats.coat.push(
      new T.MeshStandardMaterial({
        map: tx,
        roughness: family === 3 ? 0.42 : 0.86,
        metalness: 0,
        normalMap: n,
        normalScale: new T.Vector2(0.25, 0.25),
      }),
    );
  }
  mats.eyes = new T.MeshPhysicalMaterial({
    color: 0x060706,
    roughness: 0.09,
    clearcoat: 1,
  });
  mats.hoof = mat(0x252722, 0.8, 0);
  mats.horn = mat(0x7f7862, 0.81, 0);
  return mats;
}
