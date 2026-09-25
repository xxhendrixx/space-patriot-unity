import * as T from "three";
import { RoundedBoxGeometry } from "three/addons/geometries/RoundedBoxGeometry.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
export { T };
const geometryCache = new Map(), decalMaterials=new WeakMap();
export function box(g, mat, p, size, r = 0.025) {
  const key = size.join(",") + ":" + r;
  let geo = geometryCache.get(key);
  if (!geo) {
    geo =
      r <= 0
        ? new T.BoxGeometry(...size)
        : new RoundedBoxGeometry(
            ...size,
            1,
            Math.min(r, ...size.map((x) => x * 0.22)),
          );
    geometryCache.set(key, geo);
  }
  return mesh(g, geo, mat, p);
}
export function mesh(g, geo, mat, p = [0, 0, 0]) {
  const m = new T.Mesh(geo, mat);
  m.position.set(...p);
  m.castShadow = true;
  m.receiveShadow = true;
  g.add(m);
  return m;
}
export function rod(g, mat, a, b, r = 0.02, r2 = r, segments = 8) {
  const aa = new T.Vector3(...a),
    bb = new T.Vector3(...b),
    delta = bb.clone().sub(aa);
  const m = mesh(
    g,
    new T.CylinderGeometry(r2, r, delta.length(), segments, 1),
    mat,
    aa.add(bb).multiplyScalar(0.5).toArray(),
  );
  m.quaternion.setFromUnitVectors(new T.Vector3(0, 1, 0), delta.normalize());
  return m;
}
export function ring(g, mat, p, r, tube = 0.025) {
  const m = mesh(g, new T.TorusGeometry(r, tube, 6, 32), mat, p);
  return m;
}
export function plate(g, mat, p, size, rotation = [0, 0, 0]) {
  let decal=decalMaterials.get(mat);if(!decal){decal=mat.clone();decal.polygonOffset=true;decal.polygonOffsetFactor=-1;decal.polygonOffsetUnits=-2;decalMaterials.set(mat,decal);}
  const m = mesh(g, new T.PlaneGeometry(...size), decal, p);
  m.rotation.set(...rotation);
  m.position.add(new T.Vector3(0,0,.004).applyEuler(m.rotation));
  m.castShadow = false;
  return m;
}
export function prism(g, mat, points, height, p = [0, 0, 0], bevel = 0.03) {
  const shape = new T.Shape();
  points.forEach(([x, z], i) =>
    i ? shape.lineTo(x, z) : shape.moveTo(x, z),
  );
  shape.closePath();
  const geo = new T.ExtrudeGeometry(shape, {
    depth: height,
    bevelEnabled: bevel > 0,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 1,
    steps: 1,
    curveSegments: 1,
  });
  geo.rotateX(Math.PI / 2);
  geo.translate(0, height / 2, 0);
  return mesh(g, geo, mat, p);
}
export function loft(g, mat, rings, segments = 12) {
  const vertices = [],
    uv = [],
    indices = [];
  for (let i = 0; i < rings.length; i++) {
    const [z, y, rx, ry] = rings[i];
    for (let j = 0; j <= segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      vertices.push(Math.cos(a) * rx, y + Math.sin(a) * ry, z);
      uv.push(j / segments, i / (rings.length - 1));
    }
  }
  for (let i = 0; i < rings.length - 1; i++)
    for (let j = 0; j < segments; j++) {
      const a = i * (segments + 1) + j,
        b = a + segments + 1;
      indices.push(a, b, a + 1, a + 1, b, b + 1);
    }
  for (const ri of [0, rings.length - 1]) {
    const [z, y, rx, ry] = rings[ri],
      center = vertices.length / 3;
    vertices.push(0, y, z);
    uv.push(0.5, 0.5);
    for (let j = 0; j <= segments; j++) {
      const a = (j / segments) * Math.PI * 2;
      vertices.push(Math.cos(a) * rx, y + Math.sin(a) * ry, z);
      uv.push(0.5 + Math.cos(a) * 0.5, 0.5 + Math.sin(a) * 0.5);
      if (j > 0) {
        if (ri === 0) indices.push(center, center + j, center + j + 1);
        else indices.push(center, center + j + 1, center + j);
      }
    }
  }
  const geo = new T.BufferGeometry();
  geo.setAttribute("position", new T.Float32BufferAttribute(vertices, 3));
  geo.setAttribute("uv", new T.Float32BufferAttribute(uv, 2));
  geo.setIndex(indices);
  geo.computeVertexNormals();
  return mesh(g, geo, mat);
}
export function ellipsoid(g, mat, p, r, detail = 2) {
  const m = mesh(g, new T.IcosahedronGeometry(1, detail), mat, p);
  m.scale.set(...r);
  return m;
}
export function beam(g, mat, a, b, width = 0.07, depth = width) {
  const va = new T.Vector3(...a),
    vb = new T.Vector3(...b),
    m = box(
      g,
      mat,
      va.clone().add(vb).multiplyScalar(0.5).toArray(),
      [width, depth, va.distanceTo(vb)],
      width * 0.15,
    );
  m.quaternion.setFromUnitVectors(
    new T.Vector3(0, 0, 1),
    vb.sub(va).normalize(),
  );
  return m;
}
export function bolt(g, mat, x, y, z, r = 0.009) {
  return rod(g, mat, [x, y, z], [x, y, z + 0.008], r, r, 6);
}
export function labelTexture(
  text,
  color = "#bcc4bc",
  bg = null,
  w = 512,
  h = 96,
) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const q = c.getContext("2d");
  if (bg) {
    q.fillStyle = bg;
    q.fillRect(0, 0, w, h);
  }
  q.fillStyle = color;
  q.font = `500 ${h * 0.54}px 'Arial Narrow',Arial,sans-serif`;
  q.textAlign = "center";
  q.textBaseline = "middle";
  q.fillText(text, w / 2, h * 0.54, w * 0.93);
  const t = new T.CanvasTexture(c);
  t.colorSpace = T.SRGBColorSpace;
  t.anisotropy = 8;
  return t;
}
export function label(g, text, p, size, color = "#aebdb7", rot = [0, 0, 0]) {
  const m = new T.MeshBasicMaterial({
    map: labelTexture(text, color),
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
  });
  const result=plate(g, m, p, size, rot);result.userData.skipAO=true;return result;
}
export function bake(group, includeTransparent = false) {
  group.updateMatrixWorld(true);
  const inverse = group.matrixWorld.clone().invert();
  const bins = new Map(),
    nodes = [];
  group.traverse((o) => {
    let dyn = false;
    for (let p = o; p && p !== group; p = p.parent)
      dyn ||= !!p.userData.dynamic;
    if (o.isMesh && !dyn && (includeTransparent || !o.material.transparent)) {
      const key = o.material.uuid;
      if (!bins.has(key)) bins.set(key, { material: o.material, geos: [] });
      let geo = o.geometry.clone();
      if (geo.index) geo = geo.toNonIndexed();
      geo.applyMatrix4(inverse.clone().multiply(o.matrixWorld));
      if (!geo.getAttribute("uv"))
        geo.setAttribute(
          "uv",
          new T.Float32BufferAttribute(
            new Float32Array(geo.getAttribute("position").count * 2),
            2,
          ),
        );
      for (const k of Object.keys(geo.attributes))
        if (!["position", "normal", "uv"].includes(k)) geo.deleteAttribute(k);
      bins.get(key).geos.push(geo);
      nodes.push(o);
    }
  });
  for (const o of nodes) o.removeFromParent();
  for (const { material, geos } of bins.values()) {
    const geo = mergeGeometries(geos, false);
    if (geo) {
      mesh(group, geo, material);
      geos.forEach((x) => x.dispose());
    }
  }
  return group;
}
export function frame(g, position, right, up, forward, origin) {
  g.position.set(...position.map((x, i) => (x - origin[i]) * 1000));
  const matrix = new T.Matrix4().makeBasis(
    new T.Vector3(...right),
    new T.Vector3(...up),
    new T.Vector3(...forward).negate(),
  );
  if (matrix.determinant() < 0) {
    matrix.multiply(new T.Matrix4().makeScale(1, 1, -1));
    g.scale.z = -Math.abs(g.scale.z);
  } else g.scale.z = Math.abs(g.scale.z);
  g.quaternion.setFromRotationMatrix(matrix).normalize();
}
export function dispose(group) {
  group.traverse(o=>{for(const m of o.userData.ownedMaterials||[])m.dispose();});
  const creatures=[];group.traverse(o=>{if(o.userData.creature)creatures.push(o.userData.creature);});for(const c of creatures)c.dispose();
  group.traverse((o) => {
    if(o.isInstancedMesh)o.dispose();
    if (
      o.isMesh &&
      o.geometry &&
      ![...geometryCache.values()].includes(o.geometry)
    )
      o.geometry.dispose();
  });
  group.removeFromParent();
}
