import { T } from "./primitives.js";
export const surfaceFiles = {
  interior: "assets/textures/interior-atlas.png",
  exterior: "assets/textures/exterior-atlas.png",
  terrain: "assets/textures/terrain-atlas.png",
  biology: "assets/textures/biology-atlas.png",
  city: "assets/textures/city-interiors-atlas.png",
  machinery: "assets/textures/machinery-atlas.png",
  frontier: "assets/textures/frontier-surfaces-atlas.png",
  habitat: "assets/textures/habitat-surfaces-atlas.png",
  geology: "assets/textures/geology-atlas.png",
  alienFlora: "assets/textures/alien-flora-atlas.png",
  alienFauna: "assets/textures/alien-fauna-atlas.png",
};
function loadImage(url, timeout = 15000) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timer = setTimeout(() => finish(new Error('Image load timed out')), timeout);
    function finish(error) {
      clearTimeout(timer); image.onload = image.onerror = null;
      error ? reject(error) : resolve(image);
    }
    image.onload = () => image.naturalWidth ? finish() : finish(new Error('Empty image'));
    image.onerror = () => finish(new Error('Image unavailable'));
    image.src = url;
  });
}
function fallbackAtlas(key, grid) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = grid * 64;
  const ctx = canvas.getContext('2d');
  const palette = /biology|Flora/.test(key) ? ['#53634a','#72815a','#5c6842','#655747']
    : /terrain|frontier|geology/.test(key) ? ['#827a65','#696d55','#99907b','#727c70']
    : ['#8b9698','#525e64','#798184','#aea99b'];
  for (let tile = 0; tile < grid * grid; tile++) {
    const x = tile % grid * 64, y = Math.floor(tile / grid) * 64;
    ctx.fillStyle = palette[tile % palette.length]; ctx.fillRect(x, y, 64, 64);
    ctx.fillStyle = '#0000000a';
    for (let n = 0; n < 80; n++) ctx.fillRect(x + (n * 37 % 64), y + (n * 19 % 64), 2, 2);
  }
  return canvas;
}
// A missing optional atlas must not remove ships, vegetation, or the mesh renderer.
export async function loadSurfaceArt() {
  const result = { failures: [] };
  const tileSize=window.longway?.renderer.quality===0?256:512;
  await Promise.all(
    Object.entries(surfaceFiles).map(async ([key, url]) => {
      const grid = ["city","machinery","frontier","alienFlora","alienFauna","habitat","geology"].includes(key)?4:2;
      let img;
      try { img = await loadImage(url); }
      catch { result.failures.push(key); img = fallbackAtlas(key, grid); }
      result[key] = [];
      for (let tile = 0; tile < grid*grid; tile++) {
        const canvas = document.createElement("canvas");
        canvas.width = canvas.height = tileSize;
        const q = canvas.getContext("2d"),
          half = img.width / grid,
          tileHeight = img.height / grid;
        q.drawImage(
          img,
          (tile % grid) * half,
          Math.floor(tile / grid) * tileHeight,
          half,
          tileHeight,
          0,
          0,
          tileSize,
          tileSize,
        );
        const map = new T.CanvasTexture(canvas);
        map.colorSpace = T.SRGBColorSpace;
        map.wrapS = map.wrapT = T.RepeatWrapping;
        map.anisotropy = 8;
        const n = tileSize/2,
          small = document.createElement("canvas");
        small.width = small.height = n;
        const s = small.getContext("2d");
        s.drawImage(canvas, 0, 0, n, n);
        const pixels = s.getImageData(0, 0, n, n).data,
          height = new Float32Array(n * n);
        for (let i = 0; i < height.length; i++)
          height[i] =
            (pixels[i * 4] * 0.2126 +
              pixels[i * 4 + 1] * 0.7152 +
              pixels[i * 4 + 2] * 0.0722) /
            255;
        const normal = new Uint8Array(n * n * 4),
          orm = new Uint8Array(n * n * 4),
          at = (x, y) => height[((y + n) % n) * n + ((x + n) % n)];
        for (let y = 0; y < n; y++)
          for (let x = 0; x < n; x++) {
            const i = y * n + x,
              gx = (at(x + 1, y) - at(x - 1, y)) * 1.5,
              gy = (at(x, y + 1) - at(x, y - 1)) * 1.5,
              l = Math.hypot(gx, gy, 1);
            normal.set(
              [128 - (gx / l) * 127, 128 + (gy / l) * 127, 128 + 127 / l, 255],
              i * 4,
            );
            const h = height[i],
              metal = ["interior","exterior","machinery"].includes(key) || key === "city" && [1,3,4,5,11,13,14].includes(tile) || key === "habitat" && [2,3,11,12].includes(tile);
            orm.set(
              [
                210 + h * 45,
                metal ? 155 + h * 70 : 220 + h * 28,
                metal ? 210 : 0,
                255,
              ],
              i * 4,
            );
          }
        const normalMap = new T.DataTexture(normal, n, n),
          ormMap = new T.DataTexture(orm, n, n);
        for (const tx of [normalMap, ormMap]) {
          // Canvas albedo is flipped on upload; its derived data must share UV orientation.
          tx.flipY = true;
          tx.colorSpace = T.NoColorSpace;
          tx.wrapS = tx.wrapT = T.RepeatWrapping;
          tx.needsUpdate = true;
          tx.minFilter = T.LinearMipmapLinearFilter;
          tx.generateMipmaps = true;
          tx.magFilter = T.LinearFilter;
          tx.anisotropy = 4;
        }
        result[key].push({
          map,
          normalMap,
          roughnessMap: ormMap,
          metalnessMap: ormMap,
          aoMap: ormMap,
        });
        if (tile % 4 === 3) await new Promise(resolve => setTimeout(resolve, 0));
      }
    }),
  );
  let foliage;
  try { foliage = await loadImage("assets/textures/conifer-branch.png"); }
  catch {
    result.failures.push('foliage');
    foliage = document.createElement('canvas'); foliage.width = foliage.height = 64;
    const ctx = foliage.getContext('2d'); ctx.strokeStyle = '#667c48';
    ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(32, 63); ctx.lineTo(32, 3);
    for (let y = 10; y < 60; y += 6) { ctx.moveTo(32, y); ctx.lineTo(32 - y * .4, y + 9); ctx.moveTo(32, y); ctx.lineTo(32 + y * .4, y + 9); }
    ctx.stroke();
  }
  result.foliage = new T.Texture(foliage);
  result.foliage.colorSpace = T.SRGBColorSpace;
  result.foliage.needsUpdate = true;
  result.foliage.anisotropy = 8;
  return result;
}
export function applySurfaceArt(m, art) {
  const apply = (mat, tex, options = {}) =>
    Object.assign(
      mat,
      tex,
      { normalScale: new T.Vector2(0.4, 0.4), aoMapIntensity: 0.35 },
      options,
    );
  apply(m.hull, art.exterior[0], { color: new T.Color(0xd7ded9) });
  apply(m.ceramic, art.exterior[0], { color: new T.Color(0xd4d3c9) });
  apply(m.building, art.exterior[1], {
    color: new T.Color(0xb9c2be),
    emissive: new T.Color(0x526068),
    emissiveMap: art.exterior[1].map,
    emissiveIntensity: 0.2,
  });
  apply(m.dark, art.exterior[1], { color: new T.Color(0x798284) });
  apply(m.concrete, art.exterior[2], {
    color: new T.Color(0xa1a7a0),
    metalness: 0,
  });
  m.interiorWall = apply(m.hull.clone(), art.interior[0], {
    color: new T.Color(0xc5c8c4),
    roughness: 0.78,
    metalness: 0.3,
    emissive: new T.Color(0xa6adac),
    emissiveMap: art.interior[0].map,
    emissiveIntensity: 0.19,
  });
  m.floor = apply(m.dark.clone(), art.interior[1], {
    color: new T.Color(0xabb5b0),
    roughness: 0.75,
    metalness: 0.35,
  });
  m.rack = apply(m.dark.clone(), art.machinery[6], {
    color: new T.Color(0xd1d9d3),
    roughness: 0.62,
    metalness: 0.45,
    emissive: new T.Color(0x929e91),
    emissiveMap: art.interior[2].map,
    emissiveIntensity: 0.19,
  });
  m.hab = apply(m.interiorWall.clone(), art.interior[3], {
    color: new T.Color(0xe5dcc6),
    metalness: 0.18,
    emissiveMap: art.interior[3].map,
  });
  m.cargo = apply(m.hull.clone(), art.machinery[10], {
    color: new T.Color(0xd1d4bb),
    roughness: 0.8,
  });
  m.terrainTypes = [8, 5, 7, 8, 10, 14].map((i, type) =>
    apply(m.terrain.clone(), art.geology[i], {
      color: new T.Color(type === 5 ? 0x746b60 : 0xffffff),
      roughness: 0.95,
      metalness: 0,
      normalScale: new T.Vector2(0.62, 0.62),
    }),
  );
  apply(m.rock, art.terrain[0], { color: new T.Color(0xc2b9a6), metalness: 0 });
  apply(m.bark, art.biology[3], { color: new T.Color(0xb8b4a8), metalness: 0 });
  for (const [i, tile] of [
    [0, 0],
    [1, 0],
    [2, 1],
    [4, 2],
  ]) {
    apply(m.coat[i], art.frontier[[12,13,14,15,15][i]], {
      color: new T.Color(0xf0ece4),
      metalness: 0,
      roughness: 0.86,
    });
    for (const key of ['map','normalMap','roughnessMap','metalnessMap','aoMap']) {
      const tx = m.coat[i][key].clone();
      tx.repeat.set(i<2?3:2,i<2?3:2);
      tx.needsUpdate = true;
      m.coat[i][key] = tx;
    }
  }
  m.coat[3].map = null;
  m.coat[3].color.setHex(0x3a4233);
  m.coat[3].roughness = 0.28;
  m.leaves = new T.MeshStandardMaterial({
    map: art.foliage,
    alphaTest: 0.45,
    side: T.DoubleSide,
    color: 0xc2cbad,
    roughness: 0.9,
  });
  m.roomSurfaces=Object.fromEntries(Object.entries({quarters:4,mess:6,cargo:2,engineering:12,airlock:7,corridor:0}).map(([key,i])=>[key,apply(m.interiorWall.clone(),art.habitat[i],{color:new T.Color(0xd3d1cf),emissiveMap:art.habitat[i].map,emissiveIntensity:.06,metalness:[2,12].includes(i)?.35:0})]));
  m.roomFloors=Object.fromEntries(Object.entries({quarters:15,mess:14,cargo:3,engineering:3,airlock:8,corridor:8}).map(([key,i])=>[key,apply(m.floor.clone(),art.habitat[i],{color:new T.Color(0xffffff),metalness:i===3?.3:0})]));
  m.art = art;
  return m;
}
