import { buildInterior } from "./interiors.js";
import {
  T,
  box,
  rod,
  ring,
  plate,
  prism,
  loft,
  beam,
  label,
  bake,
} from "./primitives.js";
export function buildLargeCraft(m, craft) {
  const g = new T.Group(),
    [l, w, h] = craft.dimensions,
    carrier = l > 180,
    p = m.hull.clone();
  p.color.setRGB(...craft.paint).lerp(new T.Color(0x697175), 0.45);
  // A pressure hull, armored deck terraces, engine rooms and external radiators.
  loft(
    g,
    p,
    [
      [l * 0.43, 0, w * 0.12, h * 0.18],
      [l * 0.28, 0, w * 0.24, h * 0.3],
      [-l * 0.12, 0, w * 0.23, h * 0.28],
      [-l * 0.35, -h * 0.06, w * 0.145, h * 0.19],
      [-l * 0.48, -h * 0.1, w * 0.04, h * 0.1],
    ],
    12,
  );
  for (const side of [-1, 1]) {
    prism(
      g,
      p,
      [
        [side * w * 0.13, -l * 0.26],
        [side * w * 0.23, -l * 0.16],
        [side * w * 0.49, l * 0.19],
        [side * w * 0.44, l * 0.34],
        [side * w * 0.14, l * 0.24],
      ],
      h * 0.13,
      [0, -h * 0.08, 0],
      0.15,
    );
    box(
      g,
      m.dark,
      [side * w * 0.26, 0, l * 0.24],
      [w * 0.22, h * 0.42, l * 0.38],
      0.6,
    );
    box(
      g,
      p,
      [side * w * 0.26, h * 0.215, l * 0.2],
      [w * 0.235, 0.7, l * 0.29],
      0.15,
    );
    const engines = carrier ? 3 : 2;
    for (let k = 0; k < engines; k++) {
      const x = side * (w * 0.185 + k * w * 0.072),
        r = h * 0.1;
      rod(g, m.dark, [x, 0, l * 0.37], [x, 0, l * 0.48], r * 1.3, r, 16);
      ring(g, m.steel, [x, 0, l * 0.48], r, 0.35);
      ring(g, m.black, [x, 0, l * 0.481], r * 0.74, r * 0.21);
      rod(
        g,
        m.glow,
        [x, 0, l * 0.48],
        [x, 0, l * 0.482],
        r * 0.58,
        r * 0.58,
        16,
      );
      for (let n = 0; n < 12; n++) {
        const a = (n * Math.PI) / 6;
        beam(
          g,
          m.dark,
          [x + Math.cos(a) * r, Math.sin(a) * r, l * 0.41],
          [x + Math.cos(a) * r * 1.08, Math.sin(a) * r * 1.08, l * 0.476],
          0.25,
          0.25,
        );
      }
    }
    for (let k = 0; k < 9; k++) {
      box(
        g,
        m.steel,
        [side * w * 0.29, h * 0.227, l * (-0.025 + k * 0.033)],
        [w * 0.19, 0.13, 0.14],
        0.02,
      );
      box(
        g,
        m.black,
        [side * w * 0.245, h * 0.07, -l * 0.22 + k * l * 0.046],
        [0.22, h * 0.14, l * 0.021],
        0.03,
      );
    }
    for (let k = 0; k < 3; k++) {
      const z = -l * 0.27 + k * l * 0.23;
      box(
        g,
        m.dark,
        [side * w * 0.19, -h * 0.23, z],
        [w * 0.045, h * 0.15, l * 0.04],
        0.13,
      );
      const gear = new T.Group(),
        foot = -(h * 0.3 + 2);
      gear.position.set(side * w * 0.19, -h * 0.22, z);
      gear.userData.gear = true;
      gear.userData.dynamic = true;
      g.add(gear);
      rod(
        gear,
        m.steel,
        [0, 0, 0],
        [side * w * 0.04, foot + h * 0.22 + 0.4, l * 0.025],
        0.34,
        0.24,
        10,
      );
      box(
        gear,
        m.dark,
        [side * w * 0.04, foot + h * 0.22 + 0.2, l * 0.025],
        [w * 0.075, 0.4, l * 0.036],
        0.12,
      );
    }
    // Defensive turrets are mechanical mounts, with paired barrels and armor cheeks.
    for (let k = 0; k < (carrier ? 3 : 2); k++) {
      const x = side * w * 0.14,
        z = -l * 0.15 + k * l * 0.19;
      rod(g, m.dark, [x, h * 0.22, z], [x, h * 0.27, z], 1.3, 1.1, 12);
      box(g, p, [x, h * 0.28, z], [2.5, 1.1, 2.6], 0.2);
      for (const s of [-1, 1])
        rod(
          g,
          m.steel,
          [x + s * 0.55, h * 0.3, z],
          [x + s * 0.55, h * 0.3, z - 3.6],
          0.12,
          0.095,
          10,
        );
    }
    box(
      g,
      m.glow,
      [side * w * 0.445, -h * 0.035, l * 0.28],
      [0.2, 0.2, 3.0],
      0.05,
    );
  }
  // Raised forward bridge and load-bearing canopy ribs.
  box(g, m.dark, [0, h * 0.31, -l * 0.19], [w * 0.31, h * 0.13, l * 0.13], 0.4);
  loft(
    g,
    m.glass,
    [
      [-l * 0.12, h * 0.37, w * 0.15, h * 0.056],
      [-l * 0.2, h * 0.42, w * 0.13, h * 0.078],
      [-l * 0.3, h * 0.28, w * 0.08, h * 0.027],
    ],
    8,
  );
  for (const side of [-1, 1])
    beam(
      g,
      p,
      [side * w * 0.15, h * 0.42, -l * 0.12],
      [side * w * 0.08, h * 0.31, -l * 0.3],
      0.45,
      0.45,
    );
  beam(
    g,
    m.dark,
    [-w * 0.13, h * 0.475, -l * 0.2],
    [w * 0.13, h * 0.475, -l * 0.2],
    0.5,
    0.4,
  );
  for (let z = -l * 0.26; z < l * 0.35; z += 5.5) {
    box(g, m.dark, [0, h * 0.295, z], [w * 0.22, 0.05, 0.16], 0.02);
    for (const side of [-1, 1])
      box(
        g,
        m.steel,
        [side * w * 0.109, h * 0.302, z],
        [0.14, 0.07, 0.7],
        0.02,
      );
  }
  if (carrier) {
    box(
      g,
      m.dark,
      [0, -h * 0.05, l * 0.23],
      [w * 0.23, h * 0.39, l * 0.36],
      0.3,
    );
    for (const s of [-1, 1])
      box(
        g,
        p,
        [s * w * 0.125, -h * 0.03, l * 0.35],
        [w * 0.045, h * 0.4, l * 0.23],
        0.4,
      );
    box(g, m.black, [0, -h * 0.02, l * 0.431], [w * 0.2, h * 0.25, 0.6], 0.06);
    label(
      g,
      "FLIGHT BAY  /  01",
      [0, -h * 0.04, l * 0.437],
      [w * 0.14, h * 0.028],
    );
  }
  label(
    g,
    craft.name.toUpperCase(),
    [0, h * 0.307, -l * 0.025],
    [w * 0.24, h * 0.038],
    "#c7c7b8",
    [-Math.PI / 2, 0, 0],
  );
  label(
    g,
    "LONGWAY EXPLORATION",
    [0, h * 0.307, l * 0.06],
    [w * 0.21, h * 0.025],
    "#9daea5",
    [-Math.PI / 2, 0, 0],
  );
  g.userData.exhaust=[];
  for(const side of [-1,1])for(let k=0;k<(carrier?3:2);k++)g.userData.exhaust.push({position:[side*(w*.185+k*w*.072),0,l*.485],radius:h*.075});
  return bake(g);
}
export function buildBridgeRoom(g, m, craft, screens) {
  const carrier = craft.dimensions[0] > 180,
    width = carrier ? 16 : 10,
    depth = carrier ? 18 : 11;
  box(g, m.floor, [0, -1.55, depth * 0.28], [width, 0.22, depth], 0.05);
  box(g, m.dark, [0, 2.35, depth * 0.27], [width, 0.2, depth], 0.05);
  for (const side of [-1, 1]) {
    box(
      g,
      m.dark,
      [side * (width * 0.5), 0.4, depth * 0.27],
      [0.18, 3.7, depth],
      0.03,
    );
    box(
      g,
      m.ceramic,
      [side * (width * 0.5 - 0.11), -0.85, depth * 0.27],
      [0.05, 1.1, depth * 0.9],
      0.01,
    );
    beam(
      g,
      m.dark,
      [side * (width * 0.5), -1.45, -3.5],
      [side * (width * 0.41), 2.32, -4.8],
      0.18,
      0.14,
    );
    beam(
      g,
      m.steel,
      [side * (width * 0.5 - 0.09), -1.4, -3.5],
      [side * (width * 0.41 - 0.09), 2.3, -4.8],
      0.025,
      0.02,
    );
    for (let z = -3; z < depth * 0.65; z += 2.0) {
      box(
        g,
        m.amber,
        [side * (width * 0.5 - 0.12), -1.25, z],
        [0.08, 0.025, 0.7],
        0.01,
      );
      box(
        g,
        m.steel,
        [side * (width * 0.5 - 0.13), 0.5, z],
        [0.06, 3.1, 0.035],
        0.006,
      );
    }
    // Companion crew station and fitted seat; its display shares live avionics.
    const sx = side * (carrier ? 4.1 : 2.8),
      sz = carrier ? 2.4 : 0.3;
    box(g, m.dark, [sx, -0.82, sz], [1.8, 0.85, 0.8], 0.08);
    box(g, m.black, [sx, -0.25, sz - 0.19], [1.5, 0.8, 0.15], 0.055);
    const mat = new T.MeshBasicMaterial({
      map: screens[side < 0 ? 0 : 2].texture,
      toneMapped: false,
    });
    plate(g, mat, [sx, -0.24, sz - 0.107], [1.36, 0.66]);
    box(g, m.dark, [sx, -1.0, sz + 1.15], [0.68, 0.5, 0.7], 0.06);
    box(g, m.rubber, [sx, -0.35, sz + 1.48], [0.65, 1.1, 0.22], 0.1);
    box(g, m.rubber, [sx, 0.31, sz + 1.45], [0.43, 0.23, 0.19], 0.065);
    for (const ss of [-1, 1])
      box(g, m.dark, [sx + ss * 0.38, -0.44, sz + 1.15], [0.1, 0.1, 0.6], 0.03);
    label(
      g,
      side < 0 ? "NAVIGATION" : "ENGINEERING",
      [sx, -0.26, sz - 0.101],
      [0.82, 0.07],
      "#b6c7be",
    );
  }
  for (let x = -width * 0.4; x <= width * 0.4; x += width * 0.2)
    beam(g, m.dark, [x, -1.4, -3.6], [x * 0.84, 2.3, -4.8], 0.12, 0.09);
  beam(
    g,
    m.dark,
    [-width * 0.5, -1.4, -3.6],
    [width * 0.5, -1.4, -3.6],
    0.12,
    0.2,
  );
  beam(
    g,
    m.dark,
    [-width * 0.42, 2.3, -4.8],
    [width * 0.42, 2.3, -4.8],
    0.1,
    0.2,
  );
  for (let x = -width * 0.4; x < width * 0.4; x += 0.5)
    box(
      g,
      m.steel,
      [x, -1.43, depth * 0.26],
      [0.012, 0.008, depth * 0.9],
      0.001,
    );
  // Aft pressure bulkhead, lit doorway, and a short internal passage.
  box(
    g,
    m.dark,
    [-width * 0.28, 0.4, depth * 0.7],
    [width * 0.44, 3.7, 0.25],
    0.04,
  );
  box(
    g,
    m.dark,
    [width * 0.28, 0.4, depth * 0.7],
    [width * 0.44, 3.7, 0.25],
    0.04,
  );
  box(g, m.dark, [0, 1.75, depth * 0.7], [width * 0.15, 1.0, 0.3], 0.04);
  for (const s of [-1, 1])
    box(
      g,
      m.glow,
      [s * width * 0.075, 0.0, depth * 0.7 - 0.17],
      [0.018, 2.2, 0.014],
      0.003,
    );
  label(
    g,
    carrier ? "MERIDIAN  /  COMMAND DECK" : "WAYFARER  /  FLIGHT OPERATIONS",
    [0, 1.15, -3.9],
    [2.7, 0.15],
    "#b9c5b7",
  );
  if (carrier) {
    box(g, m.dark, [0, -1.35, 5.8], [2.6, 0.45, 3.2], 0.06);
    box(g, m.rubber, [0, -0.3, 6.7], [0.82, 1.5, 0.3], 0.08);
    box(g, m.dark, [0, -0.96, 6.3], [0.88, 0.22, 0.85], 0.06);
    label(g, "COMMAND", [0, 0.23, 6.53], [0.47, 0.072]);
  }
  buildInterior(g, m, craft, screens);
}
