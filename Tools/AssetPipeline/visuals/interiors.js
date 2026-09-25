import { T, box, rod, ring, plate, beam, label } from "./primitives.js";
export function buildInterior(g, m, craft, screens) {
  const plan = LongwayCore.InteriorLayout(craft);
  if (!plan) return;
  g.userData.deckPlan = plan;
  g.userData.doors = new Map();
  const inside = (x, z) =>
      plan.rooms.some(
        (r) =>
          x > r.x0 - 0.03 &&
          x < r.x1 + 0.03 &&
          z > r.z0 - 0.03 &&
          z < r.z1 + 0.03,
      ),
    floorY = -1.43,
    wallH = 3.72;
  function surface(x, z, w, d, y, mat, ceiling = false) {
    for (let xx = x; xx < x + w - 0.01; xx += 2.8)
      for (let zz = z; zz < z + d - 0.01; zz += 2.8) {
        const ww = Math.min(2.8, x + w - xx),
          dd = Math.min(2.8, z + d - zz);
        plate(
          g,
          mat,
          [xx + ww / 2, y, zz + dd / 2],
          [ww, dd],
          [ceiling ? Math.PI / 2 : -Math.PI / 2, 0, 0],
        );
      }
  }
  for (const r of plan.rooms) {
    if (r.id === "bridge") {
      surface(r.x0, r.z0, r.x1 - r.x0, r.z1 - r.z0, floorY, m.roomFloors?.[r.id]||m.floor);
      continue;
    }
    const wallMat=m.roomSurfaces?.[r.id]||m.interiorWall;
    const cuts = [
      r.z0,
      r.z1,
      ...(r.id === "corridor"
        ? plan.rooms
            .filter((o) => o.id !== "corridor" && o.x0 < 0 && o.x1 > 0)
            .flatMap((o) => [o.z0, o.z1])
            .filter((z) => z > r.z0 && z < r.z1)
        : []),
    ].sort((a, b) => a - b);
    for (let j = 0; j < cuts.length - 1; j++) {
      const z0 = cuts[j],
        z1 = cuts[j + 1],
        mid = (z0 + z1) / 2;
      if (
        r.id === "corridor" &&
        plan.rooms.some(
          (o) =>
            o.id !== "corridor" &&
            o.x0 < 0 &&
            o.x1 > 0 &&
            mid > o.z0 &&
            mid < o.z1,
        )
      )
        continue;
      surface(r.x0, z0, r.x1 - r.x0, z1 - z0, floorY, m.roomFloors?.[r.id]||m.floor);
      surface(r.x0, z0, r.x1 - r.x0, z1 - z0, 2.27, m.interiorWall, true);
    }
    for (const side of [0, 1, 2, 3]) {
      const alongX = side < 2,
        fixed =
          side === 0 ? r.z0 : side === 1 ? r.z1 : side === 2 ? r.x0 : r.x1,
        begin = alongX ? r.x0 : r.z0,
        end = alongX ? r.x1 : r.z1,
        sign = side === 0 || side === 2 ? -1 : 1;
      let segment = null;
      const flush = (t) => {
        if (segment === null) return;
        const len = t - segment;
        if (len > 0.02) {
          for (let a = segment; a < t - 0.01; a += 2.8) {
            const size = Math.min(2.8, t - a),
              center = a + size * 0.5;
            box(
              g,
              wallMat,
              alongX ? [center, 0.42, fixed] : [fixed, 0.42, center],
              alongX ? [size, wallH, 0.14] : [0.14, wallH, size],
              0.015,
            );
          }
        }
        segment = null;
      };
      for (let a = begin; a < end - 0.01; a += 0.15) {
        const mid = Math.min(end, a + 0.075),
          outside = alongX
            ? inside(mid, fixed + sign * 0.08)
            : inside(fixed + sign * 0.08, mid);
        if (!outside && segment === null) segment = a;
        else if (outside) flush(a);
      }
      flush(end);
    }
    const cx = (r.x0 + r.x1) / 2;
    for (let z = r.z0 + 1; z < r.z1 - 0.5; z += 3.2) {
      box(
        g,
        m.glow,
        [cx, 2.245, z],
        [Math.min(1.4, r.x1 - r.x0 - 0.3), 0.025, 0.12],
        0.006,
      );
      for (const side of [-1, 1])
        box(
          g,
          m.amber,
          [cx + (side * (r.x1 - r.x0 - 0.2)) / 2, -1.39, z],
          [0.06, 0.018, 0.8],
          0.008,
        );
    }
    if (r.id !== "corridor")
      label(
        g,
        r.name,
        [cx, 1.8, r.z1 - 0.12],
        [Math.min(3, r.x1 - r.x0 - 0.3), 0.23],
        "#d1d2bd",
      );
  }
  for (const d of plan.doors) {
    const holder = new T.Group();
    g.add(holder);
    holder.position.set(d.x, 0, d.z);
    if (d.axis === "x") holder.rotation.y = Math.PI / 2;
    const moving = new T.Group();
    holder.add(moving);
    moving.userData.dynamic = true;
    moving.position.y = 3.3;
    box(
      moving,
      m.interiorWall,
      [0, 0.18, 0],
      [d.width - 0.06, 3.25, 0.12],
      0.03,
    );
    for (const s of [-1, 1]) {
      box(
        holder,
        m.steel,
        [s * d.width * 0.5, 0.12, 0],
        [0.09, 3.35, 0.2],
        0.015,
      );
      box(
        moving,
        m.amber,
        [s * (d.width * 0.5 - 0.15), 0.2, 0.08],
        [0.025, 2.6, 0.014],
        0.004,
      );
    }
    box(holder, m.steel, [0, 1.84, 0], [d.width + 0.15, 0.15, 0.23], 0.02);
    label(holder, d.name, [0, 1.69, 0.125], [d.width * 0.8, 0.13]);
    g.userData.doors.set(d.id, moving);
  }
  for (const f of plan.fixtures) {
    if (
      f.id.startsWith("bridge-") ||
      f.type === "captain" ||
      f.type === "bulkhead"
    )
      continue;
    const obj = new T.Group();
    g.add(obj);
    obj.position.set(f.x, floorY, f.z);
    if (f.type === "partition") {
      box(obj, m.hab, [0, 1.86, 0], [f.w, 3.72, f.d], 0.015);
    } else if (f.type === "bunk") {
      for (const side of [-1, 1])
        for (const z of [-0.94, 0.94])
          box(obj, m.steel, [side * 0.81, 1.16, z], [0.045, 2.32, 0.045], 0.01);
      for (const y of [0.25, 1.45]) {
        box(obj, m.dark, [0, y, 0], [1.65, 0.12, 2], 0.04);
        box(obj, m.rubber, [0, y + 0.14, 0], [1.52, 0.18, 1.86], 0.06);
        box(obj, m.ceramic, [0, y + 0.28, -0.6], [1.12, 0.15, 0.44], 0.07);
        beam(
          obj,
          m.steel,
          [0.82, y + 0.16, -0.85],
          [0.82, y + 0.45, 0.45],
          0.035,
          0.035,
        );
      }
      label(obj, f.id.toUpperCase(), [0.86, 1.05, 0], [0.5, 0.1], "#b9c2ae", [
        0,
        Math.PI / 2,
        0,
      ]);
    } else if (f.type === "table") {
      box(obj, m.hab, [0, 0.8, 0], [f.w, 0.12, f.d], 0.08);
      box(obj, m.steel, [0, 0.4, 0], [0.3, 0.8, 0.3], 0.02);
      for (let z of [-0.65, 0.65]) {
        rod(obj, m.steel, [0, 0.87, z], [0, 1.03, z], 0.07, 0.07, 12);
        ring(obj, m.steel, [0, 1.03, z], 0.055, 0.009, [Math.PI / 2, 0, 0]);
      }
    } else if (f.type === "bench") {
      box(obj, m.dark, [0, 0.3, 0], [f.w, 0.6, f.d], 0.06);
      box(obj, m.rubber, [0, 0.64, 0], [f.w, 0.15, f.d], 0.065);
      box(
        obj,
        m.rubber,
        [f.x > plan.hall + 2 ? 0.24 : -0.24, 1.0, 0],
        [0.14, 0.7, f.d],
        0.05,
      );
    } else if (f.type === "reactor") {
      rod(obj, m.steel, [0, 0.3, 0], [0, 2.55, 0], 0.87, 0.87, 24);
      for (const y of [0.35, 0.8, 1.8, 2.52]) {
        const ringMesh = ring(obj, m.dark, [0, y, 0], 0.9, 0.085);
        ringMesh.rotation.x = Math.PI / 2;
      }
      for (const s of [-1, 1]) {
        rod(
          obj,
          m.brass,
          [s * 0.95, 0.35, -0.8],
          [s * 0.95, 2.6, -0.8],
          0.07,
          0.07,
          10,
        );
        box(obj, m.glow, [s * 0.3, 1.4, -0.885], [0.12, 1.4, 0.028], 0.01);
      }
      box(obj, m.dark, [0.95, 1.15, -0.32], [0.15, 0.85, 1.15], 0.04);
      const mat = new T.MeshBasicMaterial({
        map: screens[2].texture,
        toneMapped: false,
      });
      plate(obj, mat, [1.038, 1.2, -0.32], [1.0, 0.66], [0, Math.PI / 2, 0]).userData.mfdIndex=2;
      label(
        obj,
        "REACTOR / RESOURCE BUS",
        [0, 2.18, -0.89],
        [1.27, 0.11],
        "#30322c",
        [0, Math.PI, 0],
      );
    } else if (f.type === "crate") {
      box(obj, m.cargo, [0, f.h / 2, 0], [f.w, f.h, f.d], 0.075);
      for (const side of [-1, 1])
        for (const z of [-f.d * 0.46, f.d * 0.46])
          box(
            obj,
            m.steel,
            [side * f.w * 0.47, f.h * 0.5, z],
            [0.09, f.h, 0.09],
            0.01,
          );
      label(
        obj,
        "SP / FREIGHT",
        [0, f.h * 0.6, -f.d / 2 - 0.01],
        [f.w * 0.7, 0.16],
        "#c6c6a6",
        [0, Math.PI, 0],
      );
    } else {
      box(
        obj,
        f.type === "rack" ? m.rack : m.hab,
        [0, f.h * 0.5, 0],
        [f.w, f.h, f.d],
        0.04,
      );
      for (const z of [-f.d * 0.45, f.d * 0.45])
        box(obj, m.steel, [0, f.h / 2, z], [f.w + 0.015, f.h, 0.035], 0.01);
    }
  }
  for (const r of plan.rooms.filter(
    (r) => r.id === "engineering" || r.id === "cargo",
  )) {
    for (const side of [-1, 1])
      for (let z = r.z0 + 0.5; z < r.z1; z += 1.8)
        beam(
          g,
          m.steel,
          [side * (plan.wing - 0.1), 2.1, z],
          [side * (plan.wing - 0.7), 1.56, z],
          0.08,
          0.08,
        );
    for (const x of [-0.6, 0.6])
      rod(g, m.brass, [x, 2.1, r.z0], [x, 2.1, r.z1], 0.08, 0.08, 10);
  }
  const air = plan.rooms.find((r) => r.id === "airlock");
  box(g, m.interiorWall, [0, 0.15, air.z1 - 0.04], [2.2, 3.1, 0.15], 0.03);
  label(
    g,
    "AIRLOCK / DISEMBARK  [Z]",
    [0, 1.03, air.z1 - 0.14],
    [1.8, 0.14],
    "#e5d4a0",
    [0, Math.PI, 0],
  );
}
