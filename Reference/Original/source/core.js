/* Longway — original procedural world and flight core. Units: kilometres, seconds. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LongwayCore = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const SECTOR = 5e7,
    NOISE_SIZE = 64;
  const clamp = (x, a, b) => Math.max(a, Math.min(b, x));
  const add = (a, b) => a.map((v, i) => v + b[i]);
  const sub = (a, b) => a.map((v, i) => v - b[i]);
  const mul = (a, s) => a.map((v) => v * s);
  const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
  const cross = (a, b) => [
    a[1] * b[2] - a[2] * b[1],
    a[2] * b[0] - a[0] * b[2],
    a[0] * b[1] - a[1] * b[0],
  ];
  const length = (a) => Math.hypot(...a);
  const unit = (a, fallback = [0, 1, 0]) => {
    const l = length(a);
    return l > 1e-14 ? mul(a, 1 / l) : fallback.slice();
  };
  const mix = (a, b, t) => a.map((v, i) => v + (b[i] - v) * t);
  const smooth = (t) => t * t * (3 - 2 * t);
  function rotate(v, axis, angle) {
    const c = Math.cos(angle),
      s = Math.sin(angle);
    return add(
      add(mul(v, c), mul(cross(axis, v), s)),
      mul(axis, dot(axis, v) * (1 - c)),
    );
  }
  function slerp(a, b, t) {
    const d = clamp(dot(a, b), -1, 1);
    if (d > 0.9995) return unit(mix(a, b, t));
    if (d < -0.9995) {
      const axis = unit(cross(a, Math.abs(a[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]));
      return rotate(a, axis, Math.PI * t);
    }
    const angle = Math.acos(d),
      s = Math.sin(angle);
    return add(
      mul(a, Math.sin((1 - t) * angle) / s),
      mul(b, Math.sin(t * angle) / s),
    );
  }
  function hash(x) {
    x ^= x >>> 16;
    x = Math.imul(x, 0x7feb352d);
    x ^= x >>> 15;
    x = Math.imul(x, 0x846ca68b);
    return (x ^ (x >>> 16)) >>> 0;
  }
  function random(seed) {
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = Math.imul(s ^ (s >>> 15), s | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function raySphere(ro, rd, r) {
    const b = dot(ro, rd),
      perp = cross(ro, rd),
      h = r * r - dot(perp, perp);
    if (h < 0) return null;
    const s = Math.sqrt(h);
    return [-b - s, -b + s];
  }
  class Noise {
    constructor(seed = 41827) {
      this.data = new Uint8Array(NOISE_SIZE ** 3);
      for (let i = 0; i < this.data.length; i++)
        this.data[i] = hash(i ^ seed) >>> 24;
    }
    sample(x, y, z) {
      const ix = Math.floor(x),
        iy = Math.floor(y),
        iz = Math.floor(z);
      const fx = smooth(x - ix),
        fy = smooth(y - iy),
        fz = smooth(z - iz),
        d = this.data;
      const at = (a, b, c) =>
        d[(a & 63) + ((b & 63) << 6) + ((c & 63) << 12)] / 255;
      const l = (a, b, t) => a + (b - a) * t;
      return l(
        l(
          l(at(ix, iy, iz), at(ix + 1, iy, iz), fx),
          l(at(ix, iy + 1, iz), at(ix + 1, iy + 1, iz), fx),
          fy,
        ),
        l(
          l(at(ix, iy, iz + 1), at(ix + 1, iy, iz + 1), fx),
          l(at(ix, iy + 1, iz + 1), at(ix + 1, iy + 1, iz + 1), fx),
          fy,
        ),
        fz,
      );
    }
  }
  const SUN = unit([0.35, 0.66, 0.66]);
  const TYPES = [
    "Rocky moon",
    "Ocean world",
    "Desert world",
    "Ringed gas giant",
    "Ice world",
    "Volcanic world",
  ];
  const COLORS = [
    "#c8b29b",
    "#62b5d2",
    "#d39970",
    "#ccb589",
    "#b4dced",
    "#ef8251",
  ];
  const INITIAL = [
    { name: "Sable", center: [0, 0, 0], radius: 160, amp: 0.014, type: 0 },
    {
      name: "Briar",
      center: [900, 1400, -3500],
      radius: 900,
      amp: 0.014,
      type: 1,
    },
    {
      name: "Rust",
      center: [-7200, 1800, -14000],
      radius: 450,
      amp: 0.019,
      type: 2,
    },
    {
      name: "Morrow",
      center: [-23000, 7200, -52000],
      radius: 2400,
      amp: 0,
      type: 3,
    },
    {
      name: "Glass",
      center: [9800, -2600, -24000],
      radius: 380,
      amp: 0.009,
      type: 4,
    },
    {
      name: "Cinder",
      center: [4500, 3700, 17000],
      radius: 320,
      amp: 0.018,
      type: 5,
    },
  ];
  class Universe {
    constructor(seed = 41827) {
      this.seed = seed >>> 0;
      this.noise = new Noise(this.seed);
      this.cache = new Map();
      this.visited = new Set(["0,0,0"]);
    }
    cell(p) {
      return p.map((x) => Math.floor(x / SECTOR + 0.5));
    }
    system(cell) {
      const key = cell.join(",");
      if (this.cache.has(key)) return this.cache.get(key);
      let seed = hash(
        this.seed ^
          Math.imul(cell[0], 73856093) ^
          Math.imul(cell[1], 19349663) ^
          Math.imul(cell[2], 83492791),
      );
      const rng = random(seed),
        home = cell.every((v) => v === 0),
        base = cell.map((v) => v * SECTOR),
        angle = rng() * Math.PI * 2;
      const namesA = [
        "Alder",
        "Hollow",
        "Dovetail",
        "Flint",
        "North",
        "Tarn",
        "Bracken",
        "Ash",
        "Wren",
        "Lowell",
      ];
      const namesB = [
        "Reach",
        "Sound",
        "Drift",
        "Vale",
        "Rest",
        "Haven",
        "Glen",
        "Bend",
      ];
      const sysname = home
        ? "Lantern"
        : namesA[Math.floor(rng() * namesA.length)] +
          " " +
          namesB[Math.floor(rng() * namesB.length)];
      const bodies = INITIAL.map((item, i) => {
        const size = home ? 1 : 0.7 + rng() * 0.7,
          offset = home
            ? item.center
            : rotate(mul(item.center, 0.7 + rng() * 0.7), [0, 1, 0], angle);
        const s = hash(seed + i * 123763 + 17);
        return {
          ...item,
          name: home
            ? item.name
            : sysname + " " + ["I", "II", "III", "IV", "V", "VI"][i],
          center: add(base, offset),
          radius: item.radius * size,
          id: key + ":" + i,
          system: sysname,
          cell: cell.slice(),
          seed: s,
          offset: [s % 57, (s >>> 8) % 59, (s >>> 16) % 61],
          color: COLORS[i],
          kind: TYPES[i],
          atmosphere: [0, 0.028, 0.017, 0.038, 0.009, 0.016][i],
          rings: i === 3,
        };
      });
      this.cache.set(key, bodies);
      if (this.cache.size > 40) {
        const oldest = this.cache.keys().next().value;
        if (oldest !== key) this.cache.delete(oldest);
      }
      return bodies;
    }
    active(p, pinned = null) {
      const c = this.cell(p),
        local = sub(p, mul(c, SECTOR));
      let axis = 0;
      for (let i = 1; i < 3; i++)
        if (Math.abs(local[i]) > Math.abs(local[axis])) axis = i;
      const neighbor = c.slice();
      neighbor[axis] += local[axis] < 0 ? -1 : 1;
      const other =
        pinned && pinned.cell.join(",") !== c.join(",")
          ? pinned.cell
          : neighbor;
      return [...this.system(c), ...this.system(other)];
    }
    neighbors(p) {
      const c = this.cell(p),
        out = [];
      for (let i = 0; i < 3; i++)
        for (const sign of [-1, 1]) {
          const n = c.slice();
          n[i] += sign;
          out.push(this.system(n)[0]);
        }
      return out;
    }
    rawHeight(body, n) {
      if (body.type === 3) return 0;
      const o = body.offset,
        N = this.noise;
      const noise = (s) =>
        N.sample(n[0] * s + o[0], n[1] * s + o[1], n[2] * s + o[2]);
      const v =
        0.5 * noise(3.5) +
        0.3 * (1 - Math.abs(2 * noise(12) - 1)) +
        0.17 * noise(42) +
        0.03 * noise(135);
      return (
        body.radius *
        body.amp *
        (v - [0.45, 0.56, 0.42, 0, 0.45, 0.49][body.type])
      );
    }
    height(body, n) {
      const h = this.rawHeight(body, n);
      return body.type === 1 ? Math.max(h, 0) : h;
    }
    clearance(p, b) {
      const rel = sub(p, b.center),
        l = length(rel);
      return l - b.radius - this.height(b, unit(rel));
    }
    nearest(p, bodies = this.active(p)) {
      let best = null;
      for (const b of bodies) {
        const d = length(sub(p, b.center)) - b.radius;
        if (!best || d < best.distance) best = { body: b, distance: d };
      }
      best.altitude = this.clearance(p, best.body);
      return best;
    }
    sweep(a, z, bodies, clearance = 0.008) {
      const delta = sub(z, a),
        len = length(delta);
      if (len < 1e-12) return { position: a.slice(), hit: false };
      const rd = mul(delta, 1 / len);
      let limit = len,
        collided = false;
      for (const b of bodies) {
        const ro = sub(a, b.center),
          inter = raySphere(ro, rd, b.radius * (1 + b.amp) + clearance);
        if (!inter || inter[1] < 0 || inter[0] > limit) continue;
        let t = Math.max(0, inter[0]),
          end = Math.min(limit, inter[1]),
          last = t;
        for (let step = 0; step < 384 && t <= end; step++) {
          const p = add(a, mul(rd, t)),
            d = this.clearance(p, b) - clearance;
          if (d <= 0.00003) {
            // Escape is allowed when starting at the safety boundary and moving outwards.
            if (t < 0.0001 && dot(rd, unit(sub(p, b.center))) > 0) {
              t += Math.max(0.002, len * 0.002);
              continue;
            }
            limit = Math.max(0, last);
            collided = true;
            break;
          }
          last = t;
          t += Math.max(0.000015, d * 0.22);
        }
        // A finite-work conservative fallback prevents long jumps from tunnelling.
        if (t <= end && limit === len) {
          limit = Math.max(0, last);
          collided = true;
        }
      }
      let p = add(a, mul(rd, limit));
      for (const b of bodies) {
        const h = this.clearance(p, b);
        if (h < clearance) {
          p = add(
            b.center,
            mul(
              unit(sub(p, b.center)),
              b.radius + this.height(b, unit(sub(p, b.center))) + clearance,
            ),
          );
          collided = true;
        }
      }
      return { position: p, hit: collided };
    }
  }
  function lineSegment(a, b, duration, label) {
    return { duration, label, at: (t) => mix(a, b, smooth(t)) };
  }
  function arcSegment(center, a, b, r, duration, label) {
    return {
      duration,
      label,
      at: (t) => add(center, mul(slerp(a, b, smooth(t)), r)),
    };
  }
  class Flight {
    constructor(universe) {
      this.world = universe;
      this.position = [0, 0, 0];
      this.forward = [0, 0, -1];
      this.up = [0, 1, 0];
      this.velocity = [0, 0, 0];
      this.speed = 0;
      this.throttle = 1;
      this.route = null;
      this.collided = false;
      this.mode = "SURFACE FLIGHT";
      this.reset();
    }
    reset() {
      const b = this.world.system([0, 0, 0])[0],
        n = unit([0.08, 1, 0.06]);
      this.position = add(
        b.center,
        mul(n, b.radius + this.world.height(b, n) + 0.008),
      );
      this.forward = unit([0.16, 0.12, -1]);
      this.up = n;
      this.orthogonalize();
      this.velocity = [0, 0, 0];
      this.speed = 0;
      this.route = null;
      this.throttle = 1;
    }
    orthogonalize() {
      this.forward = unit(this.forward, [0, 0, -1]);
      let r = cross(this.forward, this.up);
      if (length(r) < 1e-6)
        r = cross(
          this.forward,
          Math.abs(this.forward[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0],
        );
      this.up = unit(cross(unit(r), this.forward));
    }
    get right() {
      return unit(cross(this.forward, this.up));
    }
    nearest() {
      return this.world.nearest(
        this.position,
        this.world.active(this.position, this.route?.target),
      );
    }
    altitude() {
      return this.nearest().altitude;
    }
    look(yaw, pitch, roll = 0) {
      this.forward = rotate(this.forward, this.up, -yaw);
      const right = this.right;
      this.forward = rotate(this.forward, right, pitch);
      this.up = rotate(this.up, right, pitch);
      if (roll) this.up = rotate(this.up, this.forward, roll);
      this.orthogonalize();
    }
    level() {
      const n = this.nearest().body;
      this.up = unit(sub(this.position, n.center));
      this.orthogonalize();
    }
    cancel() {
      this.route = null;
      this.velocity = [0, 0, 0];
    }
    place(body, mode = "orbit") {
      this.cancel();
      let n = unit(add(unit(sub(this.position, body.center)), mul(SUN, 0.6)));
      if (mode === "surface") {
        this.position = add(
          body.center,
          mul(n, body.radius + this.world.height(body, n) + 0.008),
        );
        let target =
          this.world
            .system(body.cell)
            .find((b) => b.id !== body.id && b.type === 1) ||
          this.world.system(body.cell)[0];
        let view = sub(target.center, this.position);
        view = sub(view, mul(n, dot(view, n)));
        this.forward = unit(add(unit(view), mul(n, 0.12)));
      } else {
        this.position = add(body.center, mul(n, body.radius * 3.4));
        this.forward = unit(sub(body.center, this.position));
      }
      this.up = n;
      this.orthogonalize();
      this.world.visited.add(body.cell.join(","));
    }
    transfer(target, orbitOnly = false) {
      this.cancel();
      const source = this.nearest().body,
        segments = [];
      let p = this.position.slice();
      const startN = unit(sub(p, source.center)),
        outN =
          source.id === target.id
            ? startN
            : unit(sub(target.center, source.center));
      const sourceR = Math.max(
        source.radius * 1.6,
        length(sub(p, source.center)),
      );
      if (length(sub(p, source.center)) < source.radius * 2.0) {
        const lift = add(source.center, mul(startN, sourceR));
        segments.push(lineSegment(p, lift, 7, "LIFTING OFF"));
        p = lift;
        if (dot(startN, outN) < 0.999) {
          segments.push(
            arcSegment(
              source.center,
              startN,
              outN,
              sourceR,
              5,
              "DEPARTURE ARC",
            ),
          );
          p = add(source.center, mul(outN, sourceR));
        }
      }
      const nearN = unit(sub(p, target.center)),
        targetN = unit(add(nearN, mul(SUN, 0.65))),
        orbR = target.radius * (orbitOnly ? 3 : 1.65);
      const approach = add(target.center, mul(nearN, orbR));
      // Detour around any other planet that intersects the straight cruise corridor.
      let points = [p, approach],
        obstacles = [
          ...this.world.system(source.cell),
          ...this.world.system(target.cell),
        ];
      for (let pass = 0; pass < 3; pass++) {
        let changed = false;
        for (let k = 0; k < points.length - 1; k++) {
          const a = points[k],
            z = points[k + 1],
            v = sub(z, a),
            len = length(v),
            rd = unit(v);
          for (const b of obstacles) {
            if (b.id === source.id || b.id === target.id) continue;
            const t = dot(sub(b.center, a), rd),
              r = b.radius * 1.45;
            if (
              t > 0 &&
              t < len &&
              length(sub(add(a, mul(rd, t)), b.center)) < r
            ) {
              let away = unit(
                sub(add(a, mul(rd, t)), b.center),
                unit(cross(rd, [0, 1, 0]), [1, 0, 0]),
              );
              points.splice(k + 1, 0, add(b.center, mul(away, r * 1.8)));
              changed = true;
              break;
            }
          }
          if (changed) break;
        }
        if (!changed) break;
      }
      const dist = length(sub(p, approach)),
        duration = clamp(Math.log10(dist + 2) * 4.5, 12, 36);
      for (let k = 0; k < points.length - 1; k++)
        segments.push(
          lineSegment(
            points[k],
            points[k + 1],
            duration / (points.length - 1),
            "INTERPLANETARY CRUISE",
          ),
        );
      segments.push(
        arcSegment(target.center, nearN, targetN, orbR, 5, "APPROACH ARC"),
      );
      if (!orbitOnly) {
        const a = add(target.center, mul(targetN, orbR)),
          z = add(
            target.center,
            mul(
              targetN,
              target.radius + this.world.height(target, targetN) + 0.008,
            ),
          );
        segments.push(lineSegment(a, z, 9, "SURFACE APPROACH"));
      }
      this.route = {
        target,
        segments,
        index: 0,
        elapsed: 0,
        total: segments.reduce((s, v) => s + v.duration, 0),
        time: 0,
        orbitOnly,
        targetN,
      };
      return this.route;
    }
    update(dt, input = {}) {
      dt = clamp(dt, 0, 0.1);
      if (!dt) return;
      const old = this.position.slice(),
        manual =
          Math.abs(input.forward || 0) +
          Math.abs(input.strafe || 0) +
          Math.abs(input.lift || 0);
      if ((manual || input.brake) && this.route) this.cancel();
      let routeSpeed=null;
      if (this.route) {
        const route = this.route;
        route.elapsed += dt;
        route.time += dt;
        while (
          route.index < route.segments.length &&
          route.elapsed >= route.segments[route.index].duration
        ) {
          route.elapsed -= route.segments[route.index].duration;
          route.index++;
        }
        if (route.index >= route.segments.length) {
          this.position = route.segments.at(-1).at(1);
          this.world.visited.add(route.target.cell.join(","));
          this.route = null;
          this.velocity = [0, 0, 0];
          const n = unit(sub(this.position, route.target.center));
          let tangent = unit(cross([0, 1, 0], n), [1, 0, 0]);
          // Preserve the arrival attitude instead of snapping nose-down at the
          // final route sample. Landing routes supply their level pad heading.
          this.forward = route.landingForward || this.forward;
          this.up = route.landingUp || this.up;
          this.orthogonalize();
        } else {
          const segment = route.segments[route.index];
          const previous=route.elapsed>=dt||route.index===0?segment.at(clamp((route.elapsed-dt)/segment.duration,0,1)):route.segments[route.index-1].at(clamp(1+(route.elapsed-dt)/route.segments[route.index-1].duration,0,1));
          this.position = segment.at(
            clamp(route.elapsed / segment.duration, 0, 1),
          );
          routeSpeed=length(sub(this.position,previous))/dt;
          this.mode = segment.label;
          const radial = unit(sub(this.position, route.target.center));
          const fraction=clamp(route.elapsed/segment.duration,0,1);
          let desired = segment.heading?.(fraction) || unit(sub(segment.at(Math.min(1,fraction+.002)),segment.at(Math.max(0,fraction-.002))),this.forward);
          if (segment.label === "SURFACE APPROACH") {
            const tangent = unit(cross([0, 1, 0], radial), [1, 0, 0]);
            desired = unit(add(tangent, mul(radial, -0.1)));
          }
          this.forward = slerp(this.forward, desired, 1 - Math.exp(-dt * 2));
          const sourceUp = unit(sub(this.position, this.nearest().body.center));
          this.up = slerp(this.up, sourceUp, 1 - Math.exp(-dt));
          this.orthogonalize();
        }
      } else {
        const near = this.nearest(),
          alt = Math.max(near.altitude, 0),
          throttle = clamp(this.throttle, 0.05, 128);
        const speed =
          Math.min(2e7, (alt + 0.045) * 0.7) * throttle * (input.boost ? 8 : 1);
        let direction = add(
          add(
            mul(this.forward, input.forward || 0),
            mul(this.right, input.strafe || 0),
          ),
          mul(this.up, input.lift || 0),
        );
        if (length(direction) > 1) direction = unit(direction);
        let desired = mul(direction, speed);
        if (input.brake) desired = [0, 0, 0];
        this.velocity = mix(
          this.velocity,
          desired,
          1 - Math.exp(-dt * (input.brake ? 20 : 7)),
        );
        // Bound motion relative to the nearest altitude; broad-phase swept tests handle other bodies.
        const candidate = add(this.position, mul(this.velocity, dt));
        const result = this.world.sweep(
          this.position,
          candidate,
          this.world.active(this.position),
          0.008,
        );
        this.position = result.position;
        this.collided = result.hit;
        if (result.hit) this.velocity = mul(this.velocity, 0.1);
        this.mode =
          alt < near.body.radius * 0.025
            ? "SURFACE FLIGHT"
            : alt < near.body.radius * 0.5
              ? "UPPER ATMOSPHERE"
              : "DEEP SPACE";
      }
      this.speed = routeSpeed??length(sub(this.position, old)) / dt;
      const cell = this.world.cell(this.position);
      this.world.visited.add(cell.join(","));
    }
  }
  return {
    SECTOR,
    NOISE_SIZE,
    SUN,
    TYPES,
    COLORS,
    clamp,
    add,
    sub,
    mul,
    dot,
    cross,
    length,
    unit,
    mix,
    smooth,
    rotate,
    slerp,
    hash,
    random,
    raySphere,
    Noise,
    Universe,
    Flight,
  };
});
