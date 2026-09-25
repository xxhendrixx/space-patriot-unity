import { buildLargeCraft, buildBridgeRoom } from "./large-craft.js";
import {
  T,
  box,
  mesh,
  rod,
  ring,
  plate,
  prism,
  loft,
  beam,
  bolt,
  label,
  bake,
} from "./primitives.js";
export function buildCraft(m, craft) {
  if (craft.dimensions[0] > 60) return buildLargeCraft(m, craft);
  const g = new T.Group(),
    l = craft.dimensions[0],
    w = craft.dimensions[1],
    h = craft.dimensions[2],
    unit = l / 24,
    ww = w / 18,
    hh = h / 6,
    foot = -(h * 0.3 + 2) / hh;
  const model = new T.Group();
  g.add(model);
  model.scale.set(ww, hh, unit);
  const paint = m.hull.clone();
  paint.color.setRGB(...craft.paint).lerp(new T.Color(0x69747b), 0.45);
  const pal = paint;
  loft(
    model,
    pal,
    [
      [10, -0.15, 2.25, 1.0],
      [7, 0, 2.4, 1.1],
      [2, 0.05, 3.15, 1.3],
      [-4, -0.1, 2.5, 0.85],
      [-9, -0.33, 1.1, 0.38],
      [-11, -0.42, 0.06, 0.04],
    ],
    8,
  );
  for (const side of [-1, 1]) {
    const wing = prism(
      model,
      pal,
      [
        [side * 2, -5],
        [side * 3, -5],
        [side * 9, 5.5],
        [side * 8.4, 8],
        [side * 2.0, 6],
      ],
      0.34,
      [0, -0.35, 0],
      0.08,
    );
    prism(
      model,
      m.dark,
      [
        [side * 4, 1],
        [side * 4.5, 1.5],
        [side * 8.4, 6],
        [side * 7.9, 6.7],
        [side * 3, 5.8],
      ],
      0.07,
      [0, -0.11, 0],
      0.015,
    );
    prism(
      model,
      m.ceramic,
      [
        [side * 2.4, -2.9],
        [side * 2.9, -2.4],
        [side * 7.9, 5.6],
        [side * 7.45, 5.2],
      ],
      0.035,
      [0, -0.1, 0],
      0.01,
    );
    box(model, m.dark, [side * 3.65, -0.15, 5.6], [2.75, 2.45, 6.1], 0.3);
    box(model, pal, [side * 3.65, 0.66, 5.6], [2.58, 0.3, 5.15], 0.08);
    for (let k = 0; k < 6; k++)
      box(
        model,
        m.steel,
        [side * 3.65, 0.88, 3.65 + k * 0.72],
        [2.65, 0.09, 0.055],
        0.014,
      );
    rod(
      model,
      m.dark,
      [side * 3.65, -0.1, 7.9],
      [side * 3.65, -0.1, 9.2],
      1.11,
      0.85,
      12,
    );
    ring(model, m.steel, [side * 3.65, -0.1, 9.2], 0.9, 0.12);
    ring(model, m.dark, [side * 3.65, -0.1, 9.22], 0.68, 0.18);
    rod(
      model,
      m.black,
      [side * 3.65, -0.1, 9.12],
      [side * 3.65, -0.1, 9.16],
      0.62,
      0.62,
      16,
    );
    const engine = rod(
      model,
      m.glow,
      [side * 3.65, -0.1, 9.14],
      [side * 3.65, -0.1, 9.18],
      0.42,
      0.42,
      16,
    );
    engine.userData.dynamic = true;
    for (let k = 0; k < 10; k++) {
      const a = (k / 10) * Math.PI * 2;
      beam(
        model,
        m.steel,
        [side * 3.65 + Math.cos(a) * 0.82, -0.1 + Math.sin(a) * 0.82, 8.8],
        [side * 3.65 + Math.cos(a) * 0.69, -0.1 + Math.sin(a) * 0.69, 9.3],
        0.08,
        0.08,
      );
    }
    prism(
      model,
      pal,
      [
        [side * 3, 4],
        [side * 3.4, 4.3],
        [side * 3.75, 8.7],
        [side * 3.35, 8.7],
      ],
      1.7,
      [0, 1.1, 0],
      0.06,
    );
    const gunX = side * 4.6;
    box(model, m.dark, [gunX, -0.6, -1.4], [0.64, 0.6, 3.1], 0.08);
    rod(
      model,
      m.steel,
      [gunX, -0.55, -2.8],
      [gunX, -0.55, -5.4],
      0.16,
      0.12,
      12,
    );
    ring(model, m.black, [gunX, -0.55, -5.4], 0.105, 0.04);
    for (let k = 0; k < 6; k++)
      ring(model, m.dark, [gunX, -0.55, -3.0 - k * 0.3], 0.165, 0.035);
    for (let k = 0; k < 3; k++) {
      const x = side * (5.2 + k * 0.3);
      box(model, m.dark, [x, -0.55, 1.7], [0.25, 0.17, 2.6], 0.035);
      rod(model, m.ceramic, [x, -0.74, 2.7], [x, -0.74, 0.1], 0.115, 0.02, 8);
    }
    const sg = new T.Group();
    model.add(sg);
    sg.position.set(side * 3.3, -0.9, 5.3);
    rod(sg, m.steel, [0, 0, 0], [side * 0.15, -1.15, 0.2], 0.12, 0.075, 8);
    rod(
      sg,
      m.dark,
      [side * 0.15, -1.15, 0.2],
      [side * 0.6, foot + 1.04, 0.45],
      0.13,
      0.09,
      8,
    );
    box(sg, m.dark, [side * 0.6, foot + 0.98, 0.45], [1.0, 0.16, 1.4], 0.06);
    sg.userData.gear = true;
    sg.userData.dynamic = true;
    box(model, m.glow, [side * 8.25, -0.05, 6.1], [0.09, 0.07, 0.44], 0.02);
    for (let k = 0; k < 5; k++) {
      box(
        model,
        m.black,
        [side * 2.78, 0.3, 1.6 + k * 0.54],
        [0.07, 0.52, 0.3],
        0.025,
      );
      box(
        model,
        m.brass,
        [side * 2.84, 0.33, 1.6 + k * 0.54],
        [0.07, 0.4, 0.05],
        0.014,
      );
    }
    label(
      model,
      "CAUTION  /  INTAKE",
      [side * 3.6, 0.89, 5.3],
      [1.6, 0.17],
      "#cbb77c",
      [-Math.PI / 2, 0, 0],
    );
  }
  // Faceted glass canopy and individually fitted armor plates.
  const canopy = loft(
    model,
    m.glass,
    [
      [1.8, 1.1, 1.5, 0.3],
      [0.7, 1.95, 1.35, 0.62],
      [-2.4, 2.04, 1.05, 0.51],
      [-5.2, 1.1, 0.35, 0.13],
    ],
    6,
  );
  canopy.material.side = T.DoubleSide;
  for (const side of [-1, 1]) {
    beam(
      model,
      m.dark,
      [side * 1.5, 1.26, 1.8],
      [side * 1.13, 2.43, -2.4],
      0.12,
      0.1,
    );
    beam(
      model,
      m.dark,
      [side * 1.13, 2.43, -2.4],
      [side * 0.35, 1.2, -5.2],
      0.11,
      0.09,
    );
    beam(
      model,
      m.steel,
      [side * 1.44, 1.1, 1.5],
      [side * 0.37, 0.94, -5.1],
      0.06,
      0.06,
    );
  }
  beam(model, m.dark, [-1.15, 2.43, -2.4], [1.15, 2.43, -2.4], 0.12, 0.1);
  for (let k = 0; k < 7; k++) {
    const z = -8 + k * 2.2;
    box(
      model,
      m.dark,
      [0, 1.32 - Math.max(0, -z - 3) * 0.14, z],
      [0.065, 0.04, 1.45],
      0.01,
    );
    for (const side of [-1, 1]) {
      box(
        model,
        m.dark,
        [side * 1.9, 1.35, z + 3],
        [0.65, 0.035, 0.025],
        0.008,
      );
      bolt(model, m.steel, side * 1.75, 1.38, z + 3, 0.036);
    }
  }
  label(model, craft.id, [0, 1.25, -6], [1.1, 0.28], "#d0d1be", [
    -Math.PI / 2,
    0,
    0,
  ]);
  label(model, "STRIDER / AEROSPACE", [0, 1.49, 3.8], [3.4, 0.36], "#bcc2b9", [
    -Math.PI / 2,
    0,
    0,
  ]);
  const ramp = box(model, m.dark, [0, -1.1, 9.3], [1.65, 0.14, 2.9], 0.05);
  ramp.rotation.x = -0.34;
  const front = new T.Group();
  model.add(front);
  rod(front, m.steel, [0, -0.4, -6], [0, foot + 0.14, -6.3], 0.095, 0.07, 8);
  box(front, m.dark, [0, foot + 0.07, -6.3], [0.85, 0.14, 1.1], 0.06);
  front.userData.gear = true;
  front.userData.dynamic = true;
  g.userData.exhaust=[-1,1].map(side=>({position:[side*3.65*ww,-.1*hh,9.3*unit],radius:.62*Math.min(ww,hh)}));
  return bake(g);
}
export function buildCockpit(m, craft = null) {
  const wide = craft?.dimensions[0] > 60;
  const g = new T.Group();
  g.name = "Flight deck";
  const screens = [],
    buttons = [];
  // Three instrument stations under a continuous stitched glare shield.
  const stations = [
    [-0.79, -0.53, -1.32, 0.64, 0.39, 0.1],
    [0, -0.49, -1.46, 0.58, 0.48, 0],
    [0.79, -0.53, -1.32, 0.64, 0.39, -0.1],
  ];
  for (let i = 0; i < stations.length; i++) {
    const [x, y, z, w, h, turn] = stations[i],
      p = new T.Group();
    g.add(p);
    p.position.set(x, y, z);
    p.rotation.y = turn;
    box(p, m.dark, [0, 0, -0.04], [w + 0.11, h + 0.1, 0.13], 0.023);
    box(p, m.black, [0, 0, 0.03], [w + 0.027, h + 0.027, 0.022], 0.008);
    const cv = document.createElement("canvas");
    cv.width = 1024;
    cv.height = 768;
    const tex = new T.CanvasTexture(cv);
    tex.colorSpace = T.SRGBColorSpace;
    tex.anisotropy = 8;
    const mat = new T.MeshBasicMaterial({ map: tex, toneMapped: false });
    const screenMesh = plate(p, mat, [0, 0, 0.044], [w, h]);
    screenMesh.userData.dynamic = true;screenMesh.userData.mfdIndex=i;
    screens.push({ canvas: cv, texture: tex, mesh: screenMesh });
    for (const sx of [-1, 1])
      for (const sy of [-1, 1])
        bolt(
          p,
          m.steel,
          sx * (w * 0.5 + 0.024),
          sy * (h * 0.5 + 0.024),
          0.034,
          0.007,
        );
    for (let k = 0; k < 5; k++) {
      box(
        p,
        m.rubber,
        [(k - 2) * w * 0.16, -h * 0.5 - 0.033, 0.037],
        [w * 0.095, 0.014, 0.018],
        0.005,
      );
      box(
        p,
        m.glow,
        [(k - 2) * w * 0.16, -h * 0.5 - 0.031, 0.049],
        [0.009, 0.003, 0.002],
        0.001,
      );
    }
  }
  prism(
    g,
    m.dark,
    [
      [-1.27, -1.61],
      [1.27, -1.61],
      [1.34, -0.79],
      [0.84, -0.69],
      [-0.84, -0.69],
      [-1.34, -0.79],
    ],
    0.18,
    [0, -0.92, 0],
    0.035,
  );
  box(g, m.rubber, [0, -0.23, -1.52], [2.56, 0.075, 0.3], 0.025);
  for (const side of [-1, 1]) {
    const sc = new T.Group();
    g.add(sc);
    sc.position.set(side * 1.11, -0.71, -0.43);
    sc.rotation.y = side * 0.19;
    box(sc, m.dark, [0, 0, 0], [0.4, 0.24, 1.14], 0.04);
    box(sc, m.black, [0, 0.132, 0.02], [0.33, 0.017, 1.02], 0.012);
    for (let k = 0; k < 7; k++) {
      box(
        sc,
        m.steel,
        [0, 0.158, -0.41 + k * 0.11],
        [0.22, 0.013, 0.022],
        0.004,
      );
      box(
        sc,
        k < 3 ? m.glow : m.amber,
        [side * 0.115, 0.159, -0.41 + k * 0.11],
        [0.015, 0.013, 0.015],
        0.003,
      );
    }
    box(g, m.dark, [side * 0.99, -1.13, 0.22], [0.27, 0.53, 1.05], 0.06);
    const grip = new T.Group();
    g.add(grip);
    grip.position.set(side * 0.79, -0.75, -0.18);
    rod(grip, m.steel, [0, 0, 0], [0, 0.23, -0.03], 0.025, 0.022);
    box(
      grip,
      m.rubber,
      [0, 0.25, -0.045],
      [side < 0 ? 0.18 : 0.074, 0.065, 0.092],
      0.022,
    );
    box(
      grip,
      m.red,
      [side < 0 ? 0.058 : 0, 0.29, -0.065],
      [0.025, 0.013, 0.025],
      0.005,
    );
    grip.userData.dynamic = true;
    g.userData[side < 0 ? "throttle" : "stick"] = grip;
    if (!wide) {
      beam(
        g,
        m.dark,
        [side * 1.36, -0.92, -0.52],
        [side * 1.04, 0.82, -1.51],
        0.11,
        0.075,
      );
      beam(
        g,
        m.steel,
        [side * 1.29, -0.84, -0.56],
        [side * 0.996, 0.78, -1.48],
        0.02,
        0.018,
      );
      beam(
        g,
        m.dark,
        [side * 1.56, -0.98, 0.55],
        [side * 1.39, 1.04, 0.11],
        0.14,
        0.1,
      );
      beam(
        g,
        m.dark,
        [side * 1.39, 1.04, 0.11],
        [side * 1.04, 0.82, -1.51],
        0.09,
        0.085,
      );
      for (let k = 0; k < 5; k++)
        bolt(
          g,
          m.steel,
          side * (1.31 - k * 0.058),
          -0.6 + k * 0.27,
          -0.78 - k * 0.14,
          0.008,
        );
      box(g, m.brass, [side * 1.2, 0.01, -1.03], [0.12, 0.23, 0.024], 0.008);
      label(g, "RESCUE", [side * 1.2, 0.014, -1.01], [0.085, 0.025], "#171c1b");
    }
  }
  if (!wide) {
    beam(g, m.dark, [-1.04, 0.82, -1.51], [1.04, 0.82, -1.51], 0.07, 0.1);
    beam(g, m.steel, [-1.0, 0.86, -1.5], [1.0, 0.86, -1.5], 0.013, 0.015);
    box(g, m.dark, [0, 0.96, -0.93], [0.58, 0.16, 0.64], 0.035);
    for (let i = 0; i < 8; i++)
      box(
        g,
        m.steel,
        [(i - 3.5) * 0.058, 0.863, -0.82],
        [0.017, 0.015, 0.27],
        0.005,
      );
  }
  for (let i = 0; i < 12; i++) {
    const x = ((i % 6) - 2.5) * 0.27,
      y = -0.84 - Math.floor(i / 6) * 0.125,
      z = -1.6;
    box(g, m.dark, [x, y, z], [0.247, 0.108, 0.043], 0.01);
    box(g, m.rubber, [x, y, z + 0.026], [0.15, 0.058, 0.03], 0.008);
    const led = box(
      g,
      m.glow,
      [x - 0.078, y + 0.028, z + 0.047],
      [0.009, 0.009, 0.005],
      0.002,
    );
    led.userData.dynamic = true;
    buttons.push(led);
    label(
      g,
      [
        "POWER",
        "IFCS",
        "GEAR",
        "LIGHTS",
        "BOOST",
        "CRUISE",
        "SECTOR",
        "JUMP",
        "VTOL",
        "SCAN",
        "ATLAS",
        "VIEW",
      ][i],
      [x, y - 0.036, z + 0.043],
      [0.2, 0.027],
    );
  }
  label(
    g,
    "LONGWAY AEROSPACE  /  FLIGHT CONTROL",
    [0, -0.216, -1.354],
    [1.4, 0.026],
    "#b5c5bc",
  );
  // Raised rubber floor, rail channels and seat rim read correctly during free look.
  box(g, m.dark, [0, -1.52, 0.18], [2.4, 0.14, 3.5], 0.045);
  for (let i = 0; i < 9; i++)
    box(g, m.steel, [(i - 4) * 0.22, -1.442, 0.3], [0.025, 0.008, 2.4], 0.002);
  if (wide) buildBridgeRoom(g, m, craft, screens);
  g.userData.screens = screens;
  g.userData.buttons = buttons;
  return bake(g);
}
export function buildGun(m, sidearm = false) {
  const g = new T.Group();
  if (sidearm) {
    box(g, m.dark, [0, 0, 0], [0.06, 0.055, 0.235], 0.008);
    box(g, m.steel, [0, 0.018, -0.01], [0.062, 0.028, 0.22], 0.008);
    box(g, m.rubber, [0, -0.08, 0.065], [0.047, 0.12, 0.058], 0.011);
    rod(g, m.black, [0, 0.013, -0.123], [0, 0.013, -0.132], 0.013, 0.013, 12);
    for (let i = 0; i < 5; i++)
      box(
        g,
        m.black,
        [0.032, 0.021, 0.029 + i * 0.01],
        [0.002, 0.032, 0.003],
        0.001,
      );
    box(g, m.steel, [0, 0.043, -0.087], [0.009, 0.012, 0.019], 0.003);
  } else {
    box(g, m.dark, [0, 0, 0], [0.092, 0.091, 0.46], 0.012);
    box(g, m.black, [0, 0.014, -0.25], [0.084, 0.078, 0.18], 0.012);
    for (let k = 0; k < 8; k++) {
      box(
        g,
        m.steel,
        [0.046, 0.013, -0.32 + k * 0.022],
        [0.011, 0.035, 0.01],
        0.003,
      );
      box(
        g,
        m.dark,
        [0, 0.061, -0.25 + k * 0.027],
        [0.076, 0.012, 0.013],
        0.003,
      );
    }
    rod(g, m.steel, [0, 0.01, -0.32], [0, 0.01, -0.56], 0.014, 0.014, 12);
    rod(g, m.dark, [0, 0.01, -0.51], [0, 0.01, -0.56], 0.022, 0.019, 12);
    box(g, m.rubber, [0, -0.09, 0.11], [0.06, 0.12, 0.065], 0.014);
    box(g, m.dark, [0, -0.095, -0.03], [0.059, 0.15, 0.072], 0.015);
    box(g, m.dark, [0, 0.078, 0.1], [0.066, 0.047, 0.075], 0.008);
    ring(g, m.steel, [0, 0.094, 0.064], 0.026, 0.005);
    box(g, m.glass, [0, 0.094, 0.061], [0.037, 0.034, 0.008], 0.005);
    box(g, m.dark, [0, -0.025, 0.26], [0.078, 0.08, 0.12], 0.015);
    label(g, "AR-30", [0.047, 0, 0.08], [0.081, 0.022], "#d7d5bc", [
      0,
      Math.PI / 2,
      0,
    ]);
  }
  box(g, m.rubber, [0.018, -0.13, 0.12], [0.083, 0.076, 0.11], 0.024);
  rod(g, m.dark, [0.018, -0.13, 0.12], [0.08, -0.25, 0.4], 0.055, 0.07, 12);
  if (!sidearm) {
    box(g, m.rubber, [-0.035, -0.055, -0.21], [0.078, 0.054, 0.095], 0.02);
    rod(
      g,
      m.dark,
      [-0.05, -0.07, -0.19],
      [-0.18, -0.22, 0.08],
      0.045,
      0.065,
      12,
    );
  }
  return g;
}
