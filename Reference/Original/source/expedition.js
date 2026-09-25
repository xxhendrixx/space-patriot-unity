/* Longway 3 — vehicle/pilot separation, deterministic craft, and flight systems.
   World coordinates use kilometres. Craft descriptors use metres. No assets or services. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else factory(root.LongwayCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (C) {
  "use strict";
  const {
    add,
    sub,
    mul,
    dot,
    cross,
    length,
    unit,
    mix,
    clamp,
    slerp,
    smooth,
    rotate,
    random,
    hash,
  } = C;
  const LivingFlight = C.Flight;
  const CHASSIS = [
    [
      "Strider",
      "Survey ship",
      22,
      14,
      5,
      260,
      34,
      1.0,
      32,
      2,
      "A balanced survey vessel. Twin nacelles, a panoramic flight deck, and stable low-altitude handling.",
    ],
    [
      "Kite",
      "Interceptor",
      17,
      18,
      3.8,
      390,
      59,
      1.35,
      24,
      2,
      "Swept wings and a narrow spine. Fast response and strong braking; a small cargo hold.",
    ],
    [
      "Mule",
      "Freighter",
      33,
      22,
      7.6,
      175,
      20,
      0.63,
      64,
      4,
      "A heavy modular cargo frame. Four engines compensate for mass; plan your braking distance.",
    ],
    [
      "Wisp",
      "Courier",
      20,
      11,
      4.2,
      355,
      49,
      1.25,
      28,
      2,
      "A compact twin-boom courier with quick acceleration and economical cruise.",
    ],
    [
      "Manta",
      "Pathfinder",
      27,
      34,
      5.2,
      250,
      31,
      0.85,
      40,
      2,
      "A wide lifting body with recessed nacelles and a broad view over the planetary horizon.",
    ],
    [
      "Spur",
      "Salvage craft",
      29,
      19,
      6.6,
      220,
      26,
      0.8,
      48,
      3,
      "An asymmetric working vessel with a service boom, protected cabin and exposed machinery.",
    ],
    [
      "Gannet",
      "Shuttle",
      28,
      20,
      6.8,
      235,
      29,
      0.82,
      44,
      4,
      "A long pressure hull, ventral landing struts and four maneuvering pods.",
    ],
    [
      "Wayfarer",
      "Exploration corvette",
      96,
      54,
      18,
      195,
      12,
      0.32,
      160,
      4,
      "A long-range corvette with a dual station bridge, engineering compartment and 160-unit cargo capacity. Plan ahead: this hull has substantial inertia.",
    ],
    [
      "Peregrine",
      "Racer",
      18,
      12,
      3.6,
      440,
      72,
      1.5,
      24,
      2,
      "A needle cockpit between long engine nacelles. Highest acceleration, lowest cargo capacity.",
    ],
    [
      "Meridian",
      "Expedition carrier",
      240,
      124,
      52,
      150,
      6,
      0.18,
      640,
      6,
      "A capital exploration hull with a command bridge, six main engines, defensive batteries and a 640-unit hold. Deliberate acceleration and long braking distances.",
    ],
  ];
  const FINISHES = [
    "Chalk",
    "Graphite",
    "Ochre",
    "Glacier",
    "Oxide",
    "Olive",
    "Titanium",
    "Cobalt",
    "Bone",
    "Obsidian",
  ];
  const PALETTES = [
    [0.58, 0.64, 0.63],
    [0.15, 0.19, 0.23],
    [0.57, 0.36, 0.14],
    [0.34, 0.51, 0.59],
    [0.43, 0.19, 0.12],
    [0.29, 0.34, 0.22],
    [0.4, 0.43, 0.46],
    [0.12, 0.24, 0.39],
    [0.66, 0.6, 0.47],
    [0.1, 0.13, 0.16],
  ];
  const CRAFTS = CHASSIS.flatMap((f, family) =>
    Array.from({ length: 10 }, (_, variant) => {
      const id = family * 10 + variant,
        r = random(hash(id + 97131)),
        scale = 0.89 + r() * 0.23;
      return Object.freeze({
        id: "LW-S" + String(id + 1).padStart(3, "0"),
        index: id,
        family,
        variant,
        name: f[0] + " " + FINISHES[variant],
        className: f[1],
        description: f[10],
        dimensions: [
          f[2] * scale,
          f[3] * (0.9 + r() * 0.2),
          f[4] * (0.93 + r() * 0.14),
        ],
        speed: f[5] * (0.94 + r() * 0.12),
        acceleration: f[6] * (0.91 + r() * 0.18),
        turn: f[7] * (0.94 + r() * 0.12),
        capacity: f[8],
        engines: f[9],
        mass: ((f[2] * f[3] * f[4]) / 60) * (1 + r() * 0.25),
        hyperSpeed: 16 + family * 1.8 + r() * 12,
        sweep: 0.25 + r() * 0.55,
        engineSize: 0.85 + r() * 0.35,
        paint: PALETTES[variant],
        accent:
          variant % 3 === 0
            ? [0.93, 0.5, 0.16]
            : variant % 3 === 1
              ? [0.48, 0.73, 0.74]
              : [0.75, 0.77, 0.68],
        fuelRate: 0.7 + family * 0.025 + r() * 0.3,
      });
    }),
  );
  const byCraft = (id) =>
    typeof id === "number"
      ? CRAFTS[id] || null
      : CRAFTS.find((s) => s.id === id) || null;
  const point = (q, v) =>
    add(
      v.position,
      add(
        add(
          mul(v.right || unit(cross(v.forward, v.up)), q[0]),
          mul(v.up, q[1]),
        ),
        mul(v.forward, q[2]),
      ),
    );
  const frame = (position, forward, up) => {
    forward = unit(forward);
    const right = unit(cross(forward, up));
    return {
      position: position.slice(),
      forward,
      up: unit(cross(right, forward)),
      right,
    };
  };
  const vecOK = (v) =>
    Array.isArray(v) &&
    v.length === 3 &&
    v.every(
      (x) => typeof x === "number" && Number.isFinite(x) && Math.abs(x) < 1e12,
    );
  class Flight extends LivingFlight {
    constructor(w) {
      super(w);
      this.cameraMode = "chase";
      this.viewYaw = 0.35;
      this.viewPitch = 0.2;
      this.bank = 0;
      this._spawn(CRAFTS[0].id);
    }
    reset() {
      super.reset();
      if (this.vehicle) this._spawn(this.vehicle.craftId);
    }
    _spawn(id) {
      const craft = byCraft(id) || CRAFTS[0],
        site = this.world.site(this.nearest().body);
      const up = site.up.slice(),
        forward = unit(
          sub(this.forward, mul(up, dot(this.forward, up))),
          mul(site.forward, -1),
        );
      this.vehicle = {
        craftId: craft.id,
        state: "landed",
        position: this.position.slice(),
        forward,
        up,
        gear: 1,
        gearTarget: 1,
        canopy: 0,
        thrust: 0,
        heat: 0,
        hyper: "idle",
        charge: 0,
        cooldown: 0,
        transition: null,
        stationId: null,
        wasDocked: false,
      };
      this.forward = forward.slice();
      this.up = up.slice();
      this.orthogonalize();
      const support = this.supportAt(this.position);
      if (support)
        this.position = add(support.point, mul(support.up, this.standHeight()));
      this.vehicle.position = this.position.slice();
      this.vehicle.up = this.up.slice();
      this.vehicle.forward = this.forward.slice();
      this.velocity = [0, 0, 0];
      this.walking = false;
      this.grounded = true;
      this.assist = true;
      this.mode = "LANDED · ENGINES IDLE";
      if (this.ship)
        this.ship.capacity = Math.max(craft.capacity, this.cargoCount());
    }
    get craft() {
      return byCraft(this.vehicle?.craftId) || CRAFTS[0];
    }
    standHeight() {
      return (this.craft.dimensions[2] * 0.3 + 2) / 1000;
    }
    collisionClearance() {
      return (
        (this.craft.dimensions[2] * 0.3 +
          0.3 +
          1.7 * (this.vehicle?.gear || 0)) /
        1000
      );
    }
    vehicleFrame() {
      return frame(
        this.vehicle.position,
        this.vehicle.forward,
        this.vehicle.up,
      );
    }
    selectCraft(id) {
      const craft = byCraft(id),
        v = this.vehicle;
      if (
        !craft ||
        !v ||
        !["landed", "docked"].includes(v.state) ||
        v.transition ||
        this.walking
      ) {
        this.message = "Board a landed or docked ship before changing craft.";
        return false;
      }
      const support = sub(v.position, mul(v.up, this.standHeight()));
      v.craftId = craft.id;
      v.position = add(support, mul(v.up, this.standHeight()));
      this.position = v.position.slice();
      v.gear = v.gearTarget = 1;
      v.heat = 0;
      v.hyper = "idle";
      v.charge = 0;
      this.ship.capacity = Math.max(this.cargoCount(), craft.capacity);
      this.viewYaw = 0.35;
      this.viewPitch = 0.2;
      this.message =
        craft.name +
        " assigned. " +
        craft.className +
        " · " +
        Math.round(craft.speed) +
        " m/s cruise.";
      return true;
    }
    look(yaw, pitch, roll = 0) {
      const v = this.vehicle;
      if (!v) return super.look(yaw, pitch, roll);
      if (v.transition) return;
      if (!this.walking && ["landed", "docked"].includes(v.state)) {
        this.viewYaw += yaw;
        this.viewPitch = clamp(this.viewPitch + pitch, -0.65, 0.95);
        return;
      }
      const t = this.walking ? 1 : this.craft.turn;
      super.look(
        clamp(yaw * t, -0.18, 0.18),
        clamp(pitch * t, -0.18, 0.18),
        roll * t,
      );
      if (!this.walking) this.bank = clamp(this.bank - yaw * 3, -0.16, 0.16);
    }
    toggleCamera() {
      this.cameraMode = this.cameraMode === "cockpit" ? "chase" : "cockpit";
      this.viewYaw = 0;
      this.viewPitch = this.cameraMode === "chase" ? 0.2 : 0;
      this.message =
        this.cameraMode === "cockpit"
          ? "Cockpit view. V switches to chase camera."
          : "Chase camera. V returns to the flight deck.";
      return this.cameraMode;
    }
    renderPose() {
      const v = this.vehicle;
      if (!v) return frame(this.position, this.forward, this.up);
      if (
        v.transition?.kind === "exiting" ||
        v.transition?.kind === "boarding"
      ) {
        const a = v.transition,
          t = clamp(a.elapsed / a.duration, 0, 1),
          q = smooth(t);
        let position;
        if (q < 0.5) position = mix(a.fromEye, a.via, q * 2);
        else position = mix(a.via, a.toEye, (q - 0.5) * 2);
        position=this.clearGround(position,.00186);
        const forward = slerp(a.fromForward, a.toForward, q),
          up = slerp(a.fromUp, v.up, q);
        return {
          ...frame(position, forward, up),
          shipView: a.kind === "exiting" ? 0 : q > 0.8 ? 1 : 0,
        };
      }
      if (this.walking)
        return { ...frame(this.position, this.forward, this.up), shipView: 0 };
      const vf = this.vehicleFrame(),
        [l, w, h] = this.craft.dimensions.map((x) => x / 1000);
      let forward = rotate(v.forward, v.up, -this.viewYaw),
        right = unit(cross(forward, v.up));
      forward = rotate(forward, right, this.viewPitch);
      if (this.cameraMode === "cockpit")
        return {
          ...frame(
            point([0, h * 0.5, l * 0.18], vf),
            forward,
            rotate(v.up, v.forward, this.bank * 0.12),
          ),
          shipView: 1,
        };
      const back = rotate(mul(v.forward, -1), v.up, -this.viewYaw),
        camera = add(
          add(v.position, mul(back, l * 1.2)),
          mul(v.up, l * (0.38 + this.viewPitch * 0.35)),
        );
      const b = this.world.nearest(camera).body,
        n = unit(sub(camera, b.center)),
        minR = b.radius + this.world.height(b, n) + 0.002;
      let p = camera;
      if (length(sub(camera, b.center)) < minR) p = add(b.center, mul(n, minR));
      return {
        ...frame(
          p,
          unit(sub(add(v.position, mul(v.forward, l * 0.08)), p)),
          v.up,
        ),
        shipView: 0,
      };
    }
    clearGround(position, clearance=.00186){
      const b=this.world.nearest(position).body,rel=sub(position,b.center),n=unit(rel),height=this.world.height(b,n),minimum=b.radius+height+clearance;
      return length(rel)<minimum?add(b.center,mul(n,minimum)):position;
    }
    supportAt(origin, maxDrop = 0.3) {
      const near = this.world.nearest(origin),
        b = near.body,
        ns = this.world.nearestStation(origin),
        q = this.world.toLocal(origin, ns.station);
      if (
        ns.distance < 1 &&
        Math.abs(q[0]) < 0.31 &&
        q[1] > -0.191 &&
        q[1] < 0.245 &&
        q[2] > -0.58 &&
        q[2] < 0.72
      ) {
        const gap = q[1] + 0.19;
        if (gap > maxDrop) return null;
        return {
          point: this.world.fromLocal([q[0], -0.19, q[2]], ns.station),
          up: ns.station.up.slice(),
          body: b,
          station: ns.station,
        };
      }
      // Floating pads and platforms can be far above the radial terrain.
      // The shared contact field includes their actual solid floors.
      if (this.world.contactDistance(origin,b,false) > maxDrop + 0.03) return null;
      const radial = unit(sub(origin, b.center));
      let t = 0;
      for (let i = 0; i < 60 && t <= maxDrop; i++) {
        const p = sub(origin, mul(radial, t)),
          d = this.world.contactDistance(p, b, false);
        // A point already inside the terrain is not a valid support hit.
        if (d < -.00006) return null;
        if (d < 0.00006) {
          const normal = this.world.contactNormal(p, b, false);
          if (dot(normal, radial) < 0.94) return null;
          if (this.world.liquidAt(sub(p, mul(radial, 0.0002)), b)) return null;
          return { point: p, up: normal, body: b, station: null };
        }
        t += Math.max(0.00005, d * 0.85);
      }
      return null;
    }
    landingSolution() {
      const support = this.supportAt(this.position);
      if (!support) return null;
      const up = support.up,
        forward = unit(
          sub(this.forward, mul(up, dot(this.forward, up))),
          [0, 0, -1],
        );
      const v = frame(
          add(support.point, mul(up, this.standHeight())),
          forward,
          up,
        ),
        [l, w] = this.craft.dimensions.map((x) => x / 1000);
      // Test the three load-bearing pads and a conservative fuselage envelope.
      for (const p of [
        [-w * 0.29, 0, -l * 0.24],
        [w * 0.29, 0, -l * 0.24],
        [0, 0, l * 0.29],
      ]) {
        const foot = point([p[0], -this.standHeight() + 0.0001, p[2]], v),
          d = this.world.contactDistance(foot, support.body, false);
        if (d < -0.002 || d > 0.004) return null;
      }
      if (
        this.world.structures(v.position, support.body) <
        this.craft.dimensions[2] * 0.00023
      )
        return null;
      return { ...v, support };
    }
    land() {
      const v = this.vehicle;
      if (
        !v ||
        v.state !== "flight" ||
        v.transition ||
        this.route ||
        this.speed > 0.08
      ) {
        this.message =
          "Landing requires manual flight below 80 m/s, within 300 m of safe ground.";
        return false;
      }
      const solution = this.landingSolution();
      if (!solution) {
        this.message =
          "No safe landing footprint: move above a broad, dry surface or the hangar deck.";
        return false;
      }
      v.hyper = "idle";
      v.charge = 0;
      v.gearTarget = 1;
      v.transition = {
        kind: "landing",
        elapsed: 0,
        duration: clamp(length(sub(this.position,solution.position))/.025,3.2,12),
        from: this.position.slice(),
        to: solution.position,
        fromForward: this.forward.slice(),
        toForward: solution.forward,
        fromUp: this.up.slice(),
        toUp: solution.up,
      };
      v.state = "landing";
      v.stationId = solution.support.station?.id || null;
      this.velocity = [0, 0, 0];
      this.message =
        "Landing sequence: struts extending, lateral drift arrested, descending to contact.";
      return true;
    }
    takeoff() {
      const v = this.vehicle;
      if (
        !v ||
        v.transition ||
        !["landed", "docked"].includes(v.state) ||
        this.walking ||
        this.ship.fuel <= 0
      ) {
        this.message = "Board a fueled, landed ship before launch.";
        return false;
      }
      if (this.docked) this.docked = null;
      const ns = this.world.nearestStation(this.position),
        inside = ns.distance < 1;
      v.transition = {
        kind: "launching",
        elapsed: 0,
        duration: 2.8,
        from: this.position.slice(),
        to: add(this.position, mul(v.up, inside ? 0.012 : 0.018)),
        fromForward: v.forward.slice(),
        toForward: v.forward.slice(),
        fromUp: v.up.slice(),
        toUp: v.up.slice(),
      };
      v.state = "launching";
      v.canopy = 0;
      v.wasDocked = false;
      v.hyper = "idle";
      v.stationId = null;
      this.grounded = false;
      this.viewYaw = 0;
      this.viewPitch = 0;
      this.message =
        "Launch: spooling thrusters, lifting clear, retracting gear.";
      return true;
    }
    toggleLanding() {
      return ["landed", "docked"].includes(this.vehicle.state)
        ? this.takeoff()
        : this.land();
    }
    toggleGear() {
      const v = this.vehicle;
      if (
        !v ||
        v.state !== "flight" ||
        v.transition ||
        this.route ||
        v.hyper !== "idle"
      ) {
        this.message =
          "Landing gear is interlocked while grounded, transitioning, or using hyperdrive.";
        return false;
      }
      v.gearTarget = v.gearTarget > 0.5 ? 0 : 1;
      this.message = v.gearTarget
        ? "Landing gear deploying. Flight speed limited."
        : "Landing gear retracting.";
      return true;
    }
    hyperSafe() {
      const n = this.nearest();
      return (
        this.vehicle?.state === "flight" &&
        !this.walking &&
        !this.route &&
        !this.vehicle.transition &&
        this.vehicle.gear < 0.02 &&
        n.altitude > Math.max(2, n.body.radius * 0.006) &&
        this.world.nearestStation(this.position).distance > 5 &&
        this.ship.fuel > 2 &&
        this.vehicle.cooldown <= 0
      );
    }
    toggleHyper() {
      const v = this.vehicle;
      if (v.hyper !== "idle") {
        v.hyper = "idle";
        v.charge = 0;
        this.message = "Hyperdrive disengaged. Braking toward cruise speed.";
        return true;
      }
      if (!this.hyperSafe()) {
        this.message =
          "Hyperdrive locked: retract gear, clear the atmosphere/station, and check fuel/temperature.";
        return false;
      }
      v.hyper = "charging";
      v.charge = 0;
      this.message =
        "Hyperdrive charging. H cancels. The ship accelerates after the charge completes.";
      return true;
    }
    _egress() {
      const v = this.vehicle,
        vf = this.vehicleFrame(),
        [l, w] = this.craft.dimensions.map((x) => x / 1000);
      for(const offset of [[0,.012,-l*.65],[w*.65,.012,l*.28],[-w*.65,.012,l*.28],[0,.012,l*.65]]){
        const above=this.clearGround(point(offset,vf),.025),support=this.supportAt(above,.15);
        if(!support)continue;
        const eye=this.clearGround(add(support.point,mul(support.up,.00186)));
        if(this.world.structures(eye,support.body)<.0003)continue;
        return eye;
      }
      return null;
    }
    toggleWalk() {
      const v = this.vehicle;
      if (!v || v.transition) return false;
      if (this.walking) {
        if (
          length(sub(this.position, v.position)) >
          this.craft.dimensions[0] * 0.0008 + 0.006
        ) {
          this.message =
            "Return to the parked ship to board. It is marked on your visor.";
          return false;
        }
        const from = this.renderPose(),
          vf = this.vehicleFrame(),
          [l, , h] = this.craft.dimensions.map((x) => x / 1000),
          seat = point([0, h * 0.5, l * 0.18], vf);
        v.transition = {
          kind: "boarding",
          elapsed: 0,
          duration: .85,
          fromEye: from.position,
          fromForward: from.forward,
          fromUp: from.up,
          via: point([0, h * 0.75, -l * 0.35], vf),
          toEye: seat,
          toForward: v.forward.slice(),
        };
        v.state = "boarding";
        this.walking = false;
        this.velocity = [0, 0, 0];
        this.message =
          "Boarding: climbing access ramp, entering the flight deck, closing canopy.";
        return true;
      }
      if (!["landed", "docked"].includes(v.state) || this.route) {
        this.message =
          "Land and shut down forward thrust before leaving your ship.";
        return false;
      }
      const target = this._egress();
      if (!target) {
        this.message =
          "The access ramp is obstructed. Reposition the ship on a wider landing area.";
        return false;
      }
      const from = this.renderPose(),
        vf = this.vehicleFrame(),
        [l, , h] = this.craft.dimensions.map((x) => x / 1000);
      v.wasDocked = !!this.docked;
      v.stationId = this.docked?.id || v.stationId;
      this.docked = null;
      v.transition = {
        kind: "exiting",
        elapsed: 0,
        duration: .85,
        fromEye: from.position,
        fromForward: from.forward,
        fromUp: from.up,
        via: point([0, h * 0.75, -l * 0.36], vf),
        toEye: target,
        toForward: unit(add(sub(v.position, target), mul(v.up, 0.001))),
      };
      v.state = "exiting";
      this.velocity = [0, 0, 0];
      this.message =
        "Exit sequence: canopy unlatching, ramp lowering, leaving the flight deck.";
      return true;
    }
    toggleAssist() {
      if (this.walking || this.vehicle.transition) {
        this.message = "Flight assist is only available at the controls.";
        return false;
      }
      this.assist = !this.assist;
      this.message = this.assist
        ? "Flight assist engaged. Thrusters counter gravity and drift."
        : "Assist disengaged. Inertia and gravity act on the craft.";
      return true;
    }
    flightSpeed(near, stationInside, input) {
      const v = this.vehicle,
        c = this.craft;
      if (this.ship.fuel <= 0) return 0;
      if (v.hyper === "active") return c.hyperSpeed;
      const throttle = clamp(this.throttle, 0.05, 4),
        base = stationInside
          ? 0.055
          : Math.min(
              (c.speed / 1000) *
                (1 + Math.min(7, Math.max(0, near.altitude) * 0.018)),
              0.075 + Math.max(0, near.altitude) * 2,
            );
      return Math.min(
        v.gear > 0.1 ? 0.09 : 1e7,
        base * throttle * (input.boost ? 2.65 : 1),
      );
    }
    applyThrust(desired, dt, input) {
      const v = this.vehicle;
      let acc =
        (this.craft.acceleration / 1000) *
        (input.brake ? 2.8 : input.boost ? 2.1 : 1);
      if (v.hyper === "active") acc = Math.max(4, acc * 190);
      const delta = sub(desired, this.velocity),
        d = length(delta);
      this.velocity = add(
        this.velocity,
        mul(delta, d > 0 ? Math.min(1, (acc * dt) / d) : 0),
      );
    }
    _canTravel() {
      if (this.walking || this.vehicle?.transition) {
        this.message = "Return to the cockpit before starting a flight route.";
        return false;
      }
      return true;
    }
    _prepareRoute(r, landAtEnd = false) {
      if (!r || r.landAtEnd) return r;
      const v = this.vehicle;
      v.state = "flight";
      v.gearTarget = 0;
      v.canopy = 0;
      v.hyper = "idle";
      v.charge = 0;
      this.viewYaw = this.viewPitch = 0;
      if (landAtEnd) {
        if(r.kind==='port'){
          const first=r.segments.findIndex(s=>s.label==='SETTLEMENT DESCENT');
          if(first>=0){
            const site=this.world.site(r.target),apron=r.target.activeSettlement?.kind==='outpost'?.048:.094;
            const hoverHeight=this.standHeight()+.012,run=r.target.activeSettlement?.kind==='outpost'?.20:.55;
            const start=r.segments[first].at(0),approach=this.world.fromLocal([0,.16,apron+run],site),hover=this.world.fromLocal([0,hoverHeight,apron],site);
            const control1=this.world.fromLocal([0,.13,apron+run*.7],site),control2=this.world.fromLocal([0,hoverHeight,apron+.01],site);
            const ease=t=>t*t*t*(t*(t*6-15)+10),bezier=t=>{const q=1-t;return add(add(mul(approach,q*q*q),mul(control1,3*q*q*t)),add(mul(control2,3*q*t*t),mul(hover,t*t*t)));};
            let lift=0;
            for(let i=0;i<64;i++){const t=i/64,p=bezier(t),n=unit(sub(p,r.target.center)),ground=add(r.target.center,mul(n,r.target.radius+this.world.height(r.target,n))),gap=dot(sub(p,ground),site.up);lift=Math.max(lift,(this.standHeight()+.006-gap)/((1-t)*(1-t)));}
            for(let k=0;k<3;k++){approach[k]+=site.up[k]*lift;control1[k]+=site.up[k]*lift/3;}
            r.segments.splice(first,r.segments.length-first,
              {duration:8,label:'CONTROLLED PORT DESCENT',at:t=>mix(start,approach,ease(t))},
              {duration:5.5,label:'FLARE · LEVEL OUT',at:t=>bezier(ease(t)),heading:()=>mul(this.world.site(r.target).forward,-1)});
            r.total=r.segments.reduce((n,s)=>n+s.duration,0);
          }
        }
        const end = r.segments.at(-1).at(1),
          support = this.supportAt(end, 0.3);
        if (support) {
          const target = add(
            support.point,
            mul(support.up, this.standHeight()),
          );
          r.segments.push({
            duration: 3.4,
            label: "LANDING STRUTS · FINAL CONTACT",
            at: (t) => mix(end, target, smooth(t)),
            heading:()=>unit(sub(this.world.site(r.target).forward,mul(support.up,dot(this.world.site(r.target).forward,support.up)))).map(x=>-x),
          });
          r.total += 3.4;
          r.landAtEnd = true;
          r.landingUp = support.up;
          r.landingForward=mul(this.world.site(r.target).forward,-1);
          r.stationId = support.station?.id || null;
        }
      }
      return r;
    }
    transfer(b, orbit = false) {
      if (this.vehicle && !this._canTravel()) return null;
      const arrival=this.planArrival?.(b);
      const route=this._prepareRoute(super.transfer(b, true), false);
      if(route&&!orbit)this.planetArrival(route,b);
      if(route&&arrival){route.settlementId=arrival.actual.id;route.requestedSettlementId=arrival.requested.id;route.staging=arrival.hostile;}
      return route;
    }
    planetArrival(route,target){
      const center=target.center.slice(),start=route.segments.at(-1).at(1),normal=unit(sub(start,center));
      // Keep the full braking corridor above atmosphere AND maximum relief.
      const clearance=Math.max(14,target.radius*(target.atmosphere||0)*1.2+2,target.radius*(target.amp||0)+3);
      const end=add(center,mul(normal,target.radius+clearance)),brakeStart=add(end,mul(normal,.6)),heading=unit(add(mul(normal,-.82),mul(unit(cross(normal,[0,1,0]),[1,0,0]),.57)));
      const distance=length(sub(brakeStart,start)),duration=8,ease=t=>t*t*t*(t*(t*6-15)+10),endSpeed=.3,localHeading=C.bodyLocal?.(target,heading)||heading,headingNow=()=>C.bodyWorld?.(target,localHeading)||heading;
      route.segments.push({duration,label:'PLANETARY ARRIVAL · EXTERIOR APPROACH',at:t=>mix(start,brakeStart,ease(t)+endSpeed*duration/Math.max(.001,distance)*(-3*t**5+7*t**4-4*t**3)),heading:headingNow});
      route.segments.push({duration:6,label:'ARRIVAL BRAKING · MANUAL ENTRY',at:t=>mix(brakeStart,end,1-(1-t)**3),heading:headingNow});
      route.orbitOnly=true;route.landAtEnd=false;route.kind='planet-arrival';route.arrivalClearance=clearance;
      route.total=route.segments.reduce((n,s)=>n+s.duration,0);return route;
    }
    toSurvey(b) {
      if (!this._canTravel()) return null;
      return this.transfer(b,false);
    }
    toStation(b) {
      if (!this._canTravel()) return null;
      return this._prepareRoute(super.toStation(b), true);
    }
    dock() {
      if (this.walking || this.vehicle.transition) {
        this.message = "Board the craft before engaging docking clamps.";
        return false;
      }
      const ns = this.world.nearestStation(this.position),
        q = this.world.toLocal(this.position, ns.station);
      if (ns.distance < 1 && q[1] > -0.19 + this.standHeight() + 0.006) {
        if (this.vehicle.state === "flight" && this.land()) {
          this.vehicle.pendingDock = true;
          this.message =
            "Descending onto the docking pad. Press E again after touchdown for services.";
        }
        return false;
      }
      const ok = super.dock();
      if (ok) {
        this.vehicle.state = "docked";
        this.vehicle.stationId = this.docked.id;
        this.vehicle.gear = this.vehicle.gearTarget = 1;
        this.vehicle.thrust = 0;
        this.vehicle.wasDocked = true;
      }
      return ok;
    }
    undock() {
      if (!this._canTravel()) return false;
      const ok = super.undock();
      if (ok) this._prepareRoute(this.route);
      return ok;
    }
    cancel() {
      super.cancel();
      if (this.vehicle) {
        this.vehicle.hyper = "idle";
        this.vehicle.charge = 0;
      }
    }
    place(b, mode = "orbit") {
      super.place(b, mode);
      if (!this.vehicle) return;
      if (mode === "surface") this._spawn(this.vehicle.craftId);
      else {
        this.vehicle.state = "flight";
        this.vehicle.position = this.position.slice();
        this.vehicle.forward = this.forward.slice();
        this.vehicle.up = this.up.slice();
        this.vehicle.transition = null;
        this.vehicle.gear = this.vehicle.gearTarget = 0;
        this.vehicle.canopy = 0;
        this.vehicle.hyper = "idle";
        this.walking = false;
      }
      this.viewYaw = this.viewPitch = 0;
    }
    shipObstacle(p) {
      const v = this.vehicle,
        q = this.world.toLocal(p, {
          center: v.position,
          ...this.vehicleFrame(),
        }),
        [l, w, h] = this.craft.dimensions.map((x) => x / 1000);
      return Math.min(
        C.sqBox(q, [w * 0.16, h * 0.23, l * 0.43]),
        C.sqBox(sub(q, [0, 0, -l * 0.1]), [w * 0.43, h * 0.07, l * 0.13]),
      );
    }
    update(dt, input = {}) {
      dt = clamp(dt, 0, 0.1);
      if (!dt) return;
      const v = this.vehicle;
      if (!v) return super.update(dt, input);
      const approach = (a, b, s) =>
        a < b ? Math.min(b, a + s) : Math.max(b, a - s);
      v.gear = approach(v.gear, v.gearTarget, dt / 1.8);
      v.cooldown = Math.max(0, v.cooldown - dt);
      this.bank *= Math.exp(-dt * 3);
      v.heat = clamp(
        v.heat +
          dt *
            (v.hyper === "active"
              ? 0.095
              : input.boost && !this.walking
                ? 0.012
                : -0.045),
        0,
        1,
      );
      if (v.heat >= 1) {
        v.hyper = "idle";
        v.charge = 0;
        v.cooldown = 7;
        this.message =
          "Drive temperature limit reached. Cooling for seven seconds.";
      }
      if (v.hyper !== "idle" && !this.hyperSafe()) {
        v.hyper = "idle";
        v.charge = 0;
        this.message =
          "Hyperdrive safety disengagement: approaching terrain/station, low fuel, or cooling.";
      }
      if (v.hyper === "charging") {
        v.charge = Math.min(1, v.charge + dt / 2.6);
        if (v.charge >= 1) {
          v.hyper = "active";
          this.message = "Hyperdrive online. H disengages; X brakes.";
        }
      }
      if (v.hyper === "active") {
        input = { ...input, forward: 1, boost: false };
        this.ship.fuel = Math.max(
          0,
          this.ship.fuel - dt * 0.55 * this.craft.fuelRate,
        );
      }
      if (input.brake && v.hyper !== "idle") {
        v.hyper = "idle";
        v.charge = 0;
      }
      if (v.transition) {
        const a = v.transition;
        a.elapsed += dt;
        const t = clamp(a.elapsed / a.duration, 0, 1),
          q = smooth(t);
        this.world.elapsed += dt;
        this.world.ecosystem(this.nearest().body).update(dt, true);
        if (a.kind === "exiting" || a.kind === "boarding") {
          v.canopy =
            a.kind === "exiting"
              ? smooth(Math.min(1, t * 3))
              : 1 - smooth(Math.max(0, (t - 0.6) / 0.4));
          v.thrust = 0;
          this.mode =
            a.kind === "exiting"
              ? "DISEMBARKING · RAMP LOWERING"
              : "BOARDING · FLIGHT DECK ACCESS";
          if (t >= 1) {
            v.transition = null;
            if (a.kind === "exiting") {
              this.walking = true;
              this.assist = false;
              this.position = this.clearGround(a.toEye.slice());
              this.forward = a.toForward.slice();
              this.up = v.up.slice();
              this.orthogonalize();
              this.grounded = true;
              v.state = "onfoot";
              this.mode = "ON FOOT · SHIP PARKED";
            } else {
              this.walking = false;
              this.assist = true;
              this.position = v.position.slice();
              this.forward = v.forward.slice();
              this.up = v.up.slice();
              this.orthogonalize();
              v.state = v.wasDocked ? "docked" : "landed";
              v.canopy = 0;
              this.cameraMode = "cockpit";
              this.viewYaw = this.viewPitch = 0;
              if (v.wasDocked && v.stationId) {
                const body = this.world.byId(
                  v.stationId.replace("-station", ""),
                );
                if (body) this.docked = this.world.station(body);
              }
              this.mode = "COCKPIT · LANDED";
            }
          }
        } else {
          const old = this.position.slice();
          const settle=a.kind==='landing',u=settle?clamp((t-.28)/.72,0,1):t,ease=u*u*u*(u*(u*6-15)+10),level=settle?smooth(clamp(t/.28,0,1)):q;
          this.position = this.clearGround(mix(a.from, a.to, ease),this.standHeight());
          this.forward = slerp(a.fromForward, a.toForward, level);
          this.up = slerp(a.fromUp, a.toUp, level);
          this.orthogonalize();
          this.speed = length(sub(this.position, old)) / dt;
          v.thrust = a.kind === "launching" ? 0.8 : 0.38;
          v.rcs = [0, a.kind === "launching" ? 0.8 : 0.35, 0];
          this.mode =
            a.kind === "launching"
              ? "LAUNCHING · VTOL THRUST"
              : "LANDING · GEAR DEPLOYING";
          if (a.kind === "launching" && t > 0.45) v.gearTarget = 0;
          v.position = this.position.slice();
          v.forward = this.forward.slice();
          v.up = this.up.slice();
          if (t >= 1) {
            v.transition = null;
            v.state = a.kind === "launching" ? "flight" : "landed";
            this.velocity = [0, 0, 0];
            this.speed = 0;
            this.grounded = v.state === "landed";
            if (v.state === "landed") {
              v.gear = v.gearTarget = 1;
              v.thrust = 0;
              if (v.pendingDock) {
                v.pendingDock = false;
                this.dock();
              }
            }
          }
        }
        return;
      }
      if (["landed", "docked"].includes(v.state) && !this.route) {
        this.world.elapsed += dt;
        this.world.ecosystem(this.nearest().body).update(dt, true);
        this.velocity = [0, 0, 0];
        this.speed = 0;
        v.thrust = approach(v.thrust, 0, dt * 2);
        this.mode =
          v.state === "docked"
            ? "DOCKED · STATION SERVICES"
            : "LANDED · F TO EXIT / SPACE TO LAUNCH";
        if (input.lift > 0) this.takeoff();
        return;
      }
      const route = this.route,
        before = this.position.slice(),
        oldVelocity = this.velocity.slice();
      if (route) {
        const seg = route.segments[route.index];
        if (seg?.label.includes("LANDING STRUTS")) v.gearTarget = 1;
      }
      super.update(dt, input);
      if (this.walking) {
        v.state = "onfoot";
        if (
          this.shipObstacle(this.position) < 0.00075 &&
          this.shipObstacle(before) > 0.0007
        ) {
          this.position = before;
          this.velocity = [0, 0, 0];
        }
        v.thrust = 0;
        this.mode = "ON FOOT · SHIP PARKED";
      } else {
        v.position = this.position.slice();
        v.forward = this.forward.slice();
        v.up = this.up.slice();
        v.thrust = approach(
          v.thrust,
          this.route
            ? 0.6
            : v.hyper === "active"
              ? 1
              : Math.min(
                  1,
                  Math.abs(input.forward || 0) +
                    Math.abs(input.strafe || 0) * 0.5 +
                    Math.abs(input.lift || 0) * 0.65,
                ),
          dt * 1.8,
        );
        v.rcs = [input.strafe || 0, input.lift || 0, input.forward || 0];
        if (route && !this.route) {
          if (route.landAtEnd) {
            v.state = "landed";
            v.gear = v.gearTarget = 1;
            this.position = v.position = route.segments.at(-1).at(1);
            this.up = route.landingUp || this.up;
            this.forward = unit(
              sub(this.forward, mul(this.up, dot(this.forward, this.up))),
            );
            this.orthogonalize();
            v.up = this.up.slice();
            v.forward = this.forward.slice();
            v.thrust = 0;
            this.velocity = [0, 0, 0];
            this.speed = 0;
            this.grounded = true;
            v.stationId = route.stationId || null;
            this.message =
              route.kind === "station"
                ? "Touchdown inside the hangar. E docks; F exits your ship."
                : "Touchdown complete. F exits the ship; Space launches.";
          } else v.state = "flight";
        }
        if (this.collided && length(oldVelocity) > 0.14)
          this.ship.hull = Math.max(
            1,
            this.ship.hull - Math.min(9, length(oldVelocity) * 5),
          );
      }
    }
    exportSave() {
      const s = super.exportSave(),
        v = this.vehicle;
      s.version = 3;
      const state = v.transition
        ? v.transition.kind === "boarding" || v.transition.kind === "exiting"
          ? "landed"
          : "flight"
        : v.state;
      s.walking = state === "onfoot";
      if (v.transition && state === "landed") {
        s.position = v.position.slice();
        s.forward = v.forward.slice();
        s.up = v.up.slice();
      }
      s.vehicle = {
        craftId: v.craftId,
        state,
        position: v.position.slice(),
        forward: v.forward.slice(),
        up: v.up.slice(),
        gear: v.gear,
        gearTarget: v.gearTarget,
        heat: v.heat,
        canopy: state === "onfoot" ? 1 : 0,
        stationId: v.stationId,
        wasDocked: v.wasDocked,
      };
      s.camera = this.cameraMode;
      return s;
    }
    loadSave(s) {
      if (!s) return false;
      if (s.version === 2) {
        if (!super.loadSave(s)) return false;
        const pose = frame(this.position, this.forward, this.up);
        this.vehicle = {
          ...this.vehicle,
          ...pose,
          craftId: CRAFTS[0].id,
          state: "flight",
          transition: null,
          gear: 0,
          gearTarget: 0,
          canopy: 0,
          hyper: "idle",
          charge: 0,
          heat: 0,
          cooldown: 0,
          thrust: 0,
        };
        this.walking = false;
        return true;
      }
      if (s.version !== 3) return false;
      const v = s.vehicle;
      if (
        !v ||
        !byCraft(v.craftId) ||
        !["flight", "landed", "docked", "onfoot"].includes(v.state) ||
        !["position", "forward", "up"].every((k) => vecOK(v[k])) ||
        length(v.forward) < 0.5 ||
        length(v.up) < 0.5
      )
        return false;
      if (
        !["gear", "gearTarget", "heat", "canopy"].every(
          (k) =>
            typeof v[k] === "number" &&
            Number.isFinite(v[k]) &&
            v[k] >= 0 &&
            v[k] <= 1,
        )
      )
        return false;
      if (
        v.stationId !== null &&
        v.stationId !== undefined &&
        (typeof v.stationId !== "string" ||
          !v.stationId.endsWith("-station") ||
          !this.world.byId(v.stationId.replace("-station", "")))
      )
        return false;
      if (
        s.walking !== (v.state === "onfoot") ||
        (!s.walking && length(sub(s.position || [], v.position)) > 0.001)
      )
        return false;
      const legacy = { ...s, version: 2 };
      if (!super.loadSave(legacy)) return false;
      this.vehicle = {
        ...v,
        position: v.position.slice(),
        forward: unit(v.forward),
        up: unit(v.up),
        transition: null,
        hyper: "idle",
        charge: 0,
        cooldown: 0,
        thrust: 0,
      };
      this.walking = s.walking;
      this.assist = !this.walking;
      this.cameraMode = ["chase", "cockpit"].includes(s.camera)
        ? s.camera
        : "cockpit";
      this.viewYaw = this.viewPitch = 0;
      this.docked = null;
      if (v.state === "docked" && v.stationId)
        this.docked = this.world.station(
          this.world.byId(v.stationId.replace("-station", "")),
        );
      this.grounded = v.state !== "flight";
      return true;
    }
  }
  Object.assign(C, {
    CRAFTS,
    CHASSIS,
    craftById: byCraft,
    LivingFlight,
    Flight,
  });
  return C;
});

/* Longway 4: rate-controlled 6DOF handling and three deliberately distinct speeds.
   Coordinates/velocity are km and km/s; craft acceleration is m/s². Travel drives
   are game systems, not an assertion of plausible aerospace physics. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else factory(root.LongwayCore);
})(globalThis, function (C) {
  "use strict";
  const Base = C.Flight,
    { add, sub, mul, dot, length, unit, clamp, rotate } = C;
  const approach = (a, b, max) => a + clamp(b - a, -max, max);
  class DoubleTap {
    constructor(windowMs = 320) {
      this.windowMs = windowMs;
      this.reset();
    }
    reset() {
      this.down = new Set();
      this.last = new Map();
    }
    release(code) {
      this.down.delete(code);
    }
    press(code, now, repeat = false) {
      if (repeat || this.down.has(code)) return false;
      this.down.add(code);
      const previous = this.last.get(code);
      const match =
        previous !== undefined &&
        now >= previous &&
        now - previous <= this.windowMs;
      this.last.set(code, match ? -Infinity : now);
      return match;
    }
  }
  function initialDrive() {
    return {
      power: true,
      lights: false,
      capacitor: 1,
      tacticalRemaining: 0,
      tacticalCooldown: 0,
      cruiseSpool: 0,
      cruiseLatched: false,
      jump: null,
      jumpTarget: null,
      angular: [0, 0, 0],
      command: [0, 0, 0],
      instruments: false,
      acceleration: 0,
      load: 0,
      brakingDistance: 0,
      limitReason: "",
      flightMode: "STANDARD",
      stick: [0, 0, 0],
      buttonPulse: -1,
      pulseTime: 0,
    };
  }
  class Flight extends Base {
    constructor(w) {
      super(w);
      this.drive = initialDrive();
      this.cameraMode = "cockpit";
      this.viewYaw = 0;
      this.viewPitch = 0;
    }
    reset() {
      super.reset();
      if (this.drive) this.drive = initialDrive();
    }
    place(b, mode) {
      super.place(b, mode);
      if (this.drive) {
        const lights = this.drive.lights;
        this.drive = initialDrive();
        this.drive.lights = lights;
      }
    }
    look(yaw, pitch, roll = 0) {
      const d = this.drive;
      if (!d || this.walking || this.vehicle.transition)
        return super.look(yaw, pitch, roll);
      if (d.instruments || ["landed", "docked"].includes(this.vehicle.state)) {
        this.viewYaw = clamp(this.viewYaw + yaw, -1.1, 1.1);
        this.viewPitch = clamp(this.viewPitch + pitch, -1.0, 0.7);
        return;
      }
      if (this.route) return;
      const gain = 8 * this.craft.turn;
      d.command[0] = clamp(d.command[0] + yaw * gain, -2.6, 2.6);
      d.command[1] = clamp(d.command[1] + pitch * gain, -2.4, 2.4);
      d.command[2] = clamp(d.command[2] + roll * 10, -2.6, 2.6);
    }
    toggleInstruments() {
      if (this.walking || this.vehicle.transition) return false;
      this.drive.instruments = !this.drive.instruments;
      this.cameraMode = "cockpit";
      this.drive.command.fill(0);
      this.drive.angular.fill(0);
      this.message = this.drive.instruments
        ? "HUD cursor free · click a display or switch. Z returns to flight."
        : "Pilot control restored. Mouse steers the ship.";
      return true;
    }
    toggleCamera() {
      if (this.drive) this.drive.instruments = false;
      return super.toggleCamera();
    }
    togglePower() {
      const d = this.drive;
      if (this.walking || this.vehicle.transition || this.route || d.jump) {
        this.message = "Power change locked during travel or crew transition.";
        return false;
      }
      d.power = !d.power;
      if (!d.power) {
        d.cruiseLatched = false;
        d.cruiseSpool = 0;
        d.tacticalRemaining = 0;
        this.assist = false;
      }
      this.message = d.power
        ? "Main bus online. Engines available."
        : "Main engine bus offline. The ship coasts; gravity still applies.";
      return true;
    }
    toggleLights() {
      if (this.walking) return false;
      this.drive.lights = !this.drive.lights;
      this.message = this.drive.lights
        ? "Landing lights on."
        : "Landing lights off.";
      return true;
    }
    toggleAssist() {
      if (!this.drive.power) {
        this.message = "Start the engine bus before enabling flight assist.";
        return false;
      }
      return super.toggleAssist();
    }
    takeoff() {
      if (this.drive && !this.drive.power) {
        this.message = "Main bus is off. Start engines before launching.";
        return false;
      }
      return super.takeoff();
    }
    tacticalBoost() {
      const d = this.drive;
      if (
        !d ||
        !d.power ||
        this.walking ||
        this.vehicle.state !== "flight" ||
        this.vehicle.transition ||
        this.route ||
        d.jump ||
        this.vehicle.gear > 0.02 ||
        d.tacticalCooldown > 0 ||
        d.capacitor < 0.34 ||
        this.ship.fuel <= 0 ||
        this.vehicle.heat > 0.92
      ) {
        this.message =
          "Tactical burst unavailable: launch, stow gear, and allow the capacitor to recover.";
        return false;
      }
      d.cruiseLatched = false;
      d.cruiseSpool = 0;
      d.capacitor -= 0.34;
      d.tacticalRemaining = 2.4;
      d.tacticalCooldown = 5;
      this.message =
        "Tactical burst · 2.4 seconds. Full steering authority, capacitor limited.";
      return true;
    }
    toggleCruise() {
      const d = this.drive;
      if (
        this.walking ||
        this.vehicle.state !== "flight" ||
        !d.power ||
        d.jump ||
        this.route ||
        this.vehicle.gear > 0.02
      ) {
        this.message =
          "Cruise needs an airborne ship, powered engines and stowed landing gear.";
        return false;
      }
      d.cruiseLatched = !d.cruiseLatched;
      this.message = d.cruiseLatched
        ? "Cruise latched. X brakes; the CRUISE switch disengages."
        : "Cruise latch released. Flight assist decelerates the ship.";
      return true;
    }
    jumpDestination() {
      const d = this.drive;
      const target = d.jumpTarget && this.world.byId(d.jumpTarget),
        cell = this.world.cell(this.position).join(",");
      if (target) return target;
      return this.world.neighbors(this.position)[0] || null;
    }
    setJumpTarget(body) {
      const b = typeof body === "object" ? body : this.world.byId(body);
      if (
        !b ||
        this.drive.jump
      ) {
        this.message = this.drive.jump
          ? "Cancel the spool before changing destination."
          : "Choose a known world as the jump destination.";
        return false;
      }
      this.drive.jumpTarget = b.id;
      this.message = "Sector destination set: " + b.system + " / " + b.name;
      return true;
    }
    reticleTarget() {
      if (this.walking || this.bridgeWalk || this.vehicle.state !== 'flight') return null;
      const pose=this.renderPose(), origin=pose.position, direction=pose.forward;
      const bodies=this.world.catalog || this.world.active(origin), candidates=[];
      let occlusion=Infinity;
      for(const b of bodies){
        const rel=sub(b.center,origin),distance=length(rel),radius=b.radius*(1+b.amp*.35);
        const hit=C.raySphere(mul(rel,-1),direction,radius);
        if(hit?.[0]>0)occlusion=Math.min(occlusion,hit[0]);
        const along=dot(rel,direction),angle=Math.acos(clamp(along/Math.max(distance,.001),-1,1));
        if(along>0&&distance>radius+.1&&angle<Math.asin(clamp(radius/distance,0,1))+.012)
          candidates.push({kind:'world',id:b.id,body:b,name:b.name,position:b.center,distance,depth:hit?.[0]>0?hit[0]:distance-radius,angle});
        const station=this.world.station(b),delta=sub(station.center,origin),sd=length(delta),sa=Math.acos(clamp(dot(delta,direction)/Math.max(sd,.001),-1,1));
        if(sd>.8&&sa<.025)candidates.push({kind:'station',id:station.id,body:b,name:b.name+' station',position:station.center,distance:sd,depth:sd,angle:sa});
      }
      for(const beacon of this.navigationBeacons?.()||[]){
        const delta=sub(beacon.position,origin),distance=length(delta),angle=Math.acos(clamp(dot(delta,direction)/Math.max(distance,.001),-1,1));
        if(distance>1&&angle<.022)candidates.push({kind:'beacon',id:beacon.id,body:this.world.byId(beacon.bodyId),name:beacon.name,position:beacon.position,distance,depth:distance,angle});
      }
      const visible=candidates.filter(x=>x.depth<=occlusion+.5);
      return visible.sort((a,b)=>a.angle-b.angle||a.depth-b.depth)[0]||null;
    }
    jumpAtReticle() {
      if(this.drive.jump)return this.toggleHyper();
      const target=this.reticleTarget();
      if(!target){this.message='Center a planet, station or operation beacon in the reticle to jump';return false;}
      this.drive.jumpTarget=target.body.id;
      return this.toggleHyper(target);
    }
    cycleSector() {
      if (this.drive.jump) return false;
      const list = this.world.neighbors(this.position),
        now = this.jumpDestination(),
        i = list.findIndex((b) => b.cell.join(",") === now?.cell.join(","));
      return this.setJumpTarget(list[(i + 1) % list.length]);
    }
    hyperSafe() {
      return (
        !!this.drive?.power &&
        super.hyperSafe() &&
        this.ship.fuel >= 8 &&
        this.vehicle.heat < 0.84
      );
    }
    toggleHyper(selection = null) {
      const d = this.drive;
      if (d.jump) {
        this.cancel();
        this.message = "Sector drive disengaged. Local flight restored.";
        return true;
      }
      if (!this.hyperSafe()) {
        this.message =
          "Sector drive locked: clear terrain and stations, retract gear, enable power and keep ≥8% fuel.";
        return false;
      }
      const target = selection?.body || this.jumpDestination();
      if (!target) return false;
      d.cruiseLatched = false;
      d.cruiseSpool = 0;
      d.tacticalRemaining = 0;
      d.command.fill(0);
      d.jump = { state: "charging", time: 0, duration: 2, target, selection };
      this.vehicle.hyper = "charging";
      this.vehicle.charge = 0;
      this.message =
        "Charging jump drive to " + (selection?.name || target.name) + ". H or X cancels.";
      return true;
    }
    cancel() {
      const old = this.velocity?.slice(),
        hadRoute = !!this.route;
      super.cancel();
      if (this.drive) {
        this.drive.jump = null;
        this.drive.cruiseLatched = false;
        this.drive.cruiseSpool = 0;
        this.drive.tacticalRemaining = 0;
        this.drive.command.fill(0);
        this.drive.angular.fill(0);
        if (!hadRoute && old) this.velocity = old;
        this.speed = length(this.velocity);
      }
    }
    toggleGear() {
      if (this.drive.jump || this.drive.cruiseSpool > 0.1) {
        this.message =
          "Brake and leave cruise/sector drive before cycling the landing gear.";
        return false;
      }
      return super.toggleGear();
    }
    land() {
      if (this.drive.jump) return false;
      const ok = super.land();
      if (ok) {
        this.drive.cruiseLatched = false;
        this.drive.cruiseSpool = 0;
        this.drive.instruments = false;
        this.drive.command.fill(0);
      }
      return ok;
    }
    flightSpeed(near, inside, input) {
      const d = this.drive;
      if (!d || !d.power || this.ship.fuel <= 0) return 0;
      const gear = this.vehicle.gear > 0.02,
        base = (this.craft.speed / 1000) * clamp(this.throttle, 0.08, 3),
        alt = Math.max(0, near.altitude);
      if (inside) {
        d.limitReason = "HANGAR SPEED LIMIT";
        return 0.055;
      }
      if (gear) {
        d.limitReason = "LANDING GEAR LIMIT";
        return Math.min(base, 0.09);
      }
      const boosting = input.boost && !input.brake;
      let normal = Math.min(
          base * (d.tacticalRemaining > 0 ? 3 : boosting ? 2.5 : 1),
          0.10 + alt * .9,
        ),
        desired = normal;
      d.limitReason = "";
      // Shift supplies the approach drive as well as local boost. Scale with
      // actual terrain clearance, so crossing a mountain-bound sphere never
      // leaves the ship crawling thousands of kilometres above its destination.
      if (boosting && input.forward > 0) {
        desired += Math.min(this.craft.hyperSpeed * 3, Math.max(0, alt - .15) * .65);
        desired = Math.min(desired, .10 + alt * .9);
        d.limitReason = alt < 2 ? "SURFACE APPROACH LIMIT" : "";
      }
      if (d.cruiseSpool > 0) {
        const altitudeFactor = 1 - Math.exp(-Math.max(0, alt - .12) / 12);
        desired +=
          this.craft.hyperSpeed *
          8 *
          altitudeFactor *
          Math.pow(d.cruiseSpool, 2);
        desired = Math.min(desired, .10 + alt * 1.4);
        if (altitudeFactor < 0.99) d.limitReason = "TERRAIN CLEARANCE LIMIT";
      }
      // Conservative stopping envelope along actual motion as well as the forward axis.
      // This changes target speed; the collision sweep remains the final authority.
      if (desired > .8) {
        const braking = 15 * Math.max(.05, this.systems?.factor("engines") ?? 1),
          speed = length(this.velocity),
          range = Math.max(.4, speed * .6 + Math.max(speed, desired) ** 2 / (2 * braking)),
          bodies = this.world.active(this.position);
        for (const dir of [this.forward, unit(this.velocity, this.forward)]) {
          const hit = this.world.sweep(this.position, add(this.position, mul(dir, range)), bodies, this.collisionClearance());
          if (!hit.hit) continue;
          const distance = Math.max(0, length(sub(hit.position, this.position)) - .03),
            stop = Math.sqrt(2 * braking * distance);
          if (stop < desired) {
            desired = stop;
            d.limitReason = "APPROACH · BRAKING ENVELOPE";
          }
        }
      }
      return desired;
    }
    applyThrust(desired, dt, input) {
      const d = this.drive;
      if (!d.power || this.ship.fuel <= 0) return;
      const old = this.velocity.slice(),
        speed = length(old),
        cruise = d.cruiseSpool > 0.01 || speed > this.craft.speed / 1000 * 1.3 ||
          (input.boost && input.forward > 0 && this.nearest().altitude > .15);
      const engineFactor=clamp(input.engineFactor??1,0,2),base=this.craft.acceleration/1000;
      const brakingAcceleration=(cruise?Math.min(30,Math.max(base*2.4,speed*2)):base*2.4)*engineFactor;
      const acceleration=(input.brake?brakingAcceleration:engineFactor*(cruise
        ? (length(desired)<speed?30:15)
        : base*(d.tacticalRemaining>0?4:input.boost?3:1)));
      d.brakingDistance=brakingAcceleration>0?speed*speed/(2*brakingAcceleration):speed>0?Infinity:0;
      // Decoupled thrust adds momentum along the commanded axis. It does not
      // silently erase sideways velocity when the pilot presses forward.
      if(!this.assist&&!input.brake&&!cruise){
        const direction=unit(desired,[0,0,0]),requested=length(desired);
        const step=Math.max(0,Math.min(acceleration*dt,requested-dot(old,direction)));
        this.velocity=add(old,mul(direction,step));
        d.acceleration=step/Math.max(dt,1e-6)*1000;
        d.load=d.acceleration/9.81;
        return;
      }
      const delta = sub(desired, old),
        n = length(delta);
      this.velocity = add(
        old,
        mul(delta, n ? Math.min(1, (acceleration * dt) / n) : 0),
      );
      d.acceleration =
        (length(sub(this.velocity, old)) / Math.max(dt, 1e-6)) * 1000;
      d.load = d.acceleration / 9.81;
    }
    update(dt, input = {}) {
      dt = clamp(dt, 0, 0.1);
      if (!dt) return;
      const d = this.drive;
      if (!d) return super.update(dt, input);
      const v = this.vehicle;
      d.tacticalRemaining = Math.max(0, d.tacticalRemaining - dt);
      d.tacticalCooldown = Math.max(0, d.tacticalCooldown - dt);
      d.capacitor = clamp(
        d.capacitor + (d.tacticalRemaining > 0 ? -0.065 : 0.075) * dt,
        0,
        1,
      );
      d.pulseTime = Math.max(0, d.pulseTime - dt);
      const normalFlight =
        v.state === "flight" && !this.walking && !v.transition && !this.route;
      if (!normalFlight || !d.power || this.ship.fuel <= 0) {
        d.cruiseSpool = 0;
        d.cruiseLatched = false;
        d.tacticalRemaining = 0;
      }
      if (input.brake) {
        d.cruiseLatched = false;
        d.tacticalRemaining = 0;
        if (d.jump) this.cancel();
      }
      const wantsCruise =
        normalFlight &&
        d.power &&
        !d.jump &&
        (!!input.cruise || d.cruiseLatched) &&
        v.gear < 0.02 &&
        this.ship.fuel > 0 &&
        v.heat < 0.94;
      d.cruiseSpool = approach(
        d.cruiseSpool,
        wantsCruise ? 1 : 0,
        dt / (wantsCruise ? 3 : 1.2),
      );
      if (normalFlight && !d.jump) {
        const agility =
          (this.craft.turn * (d.tacticalRemaining > 0 ? 1.12 : 1)) /
          (1 + d.cruiseSpool * 6);
        for (let i = 0; i < 3; i++) {
          d.angular[i] = approach(
            d.angular[i],
            d.command[i] * agility,
            dt * 3.2 * agility,
          );
          d.command[i] *= Math.exp(-dt * 9);
          d.stick[i] = approach(d.stick[i], d.angular[i], dt * 5);
        }
        if (!d.instruments) {
          C.LivingFlight.prototype.look.call(
            this,
            d.angular[0] * dt,
            d.angular[1] * dt,
            d.angular[2] * dt,
          );
          this.viewYaw *= Math.exp(-dt * 7);
          this.viewPitch *= Math.exp(-dt * 7);
        }
      }
      if (d.jump?.state === "charging") {
        if (!this.hyperSafe()) {
          d.jump = null;
          v.hyper = "idle";
          this.message = "Sector spool canceled by safety interlock.";
        } else {
          d.jump.time += dt;
          v.charge = clamp(d.jump.time / d.jump.duration, 0, 1);
          if (d.jump.time >= d.jump.duration) {
            const {target,selection} = d.jump;
            d.jump = null;
            const route = super.transfer(target, true);
            if (route) {
              route.kind = "hypersector";
              if(!selection || selection.kind!=='station'){
                this.planetArrival(route,target);
              } else {
                const start=route.segments.at(-1).at(1),end=selection.kind==='station'
                  ? add(this.world.station(target).center,mul(this.world.station(target).forward,1.6))
                  : add(selection.position,mul(unit(sub(start,selection.position)),.6));
                const center=target.center.slice(),radius=length(sub(start,center)),fromNormal=unit(sub(start,center)),toNormal=unit(sub(end,center)),aligned=add(center,mul(toNormal,radius));
                const duration=clamp(length(sub(end,aligned))/20,4,18);
                route.segments.push({duration:4,label:'ORBITAL JUMP ALIGNMENT',at:t=>add(center,mul(C.slerp(fromNormal,toNormal,C.smooth(t)),radius))});
                route.segments.push({duration,label:'JUMP ARRIVAL · '+selection.name.toUpperCase(),at:t=>C.mix(aligned,end,C.smooth(t))});
                route.total+=duration+4;
              }
              for (const seg of route.segments)
                if (seg.label === "INTERPLANETARY CRUISE") {
                  seg.duration *= .55;
                  seg.label = "HYPERSPACE · SECTOR CROSSING";
                } else if (["LIFTING OFF","DEPARTURE ARC","APPROACH ARC"].includes(seg.label)) seg.duration=2.5;
              route.total=route.segments.reduce((total,seg)=>total+seg.duration,0);
              d.jump = { state: "transit", time: 0, target, selection };
              this.ship.fuel = Math.max(0, this.ship.fuel - 7);
              v.heat = clamp(v.heat + 0.16, 0, 1);
              this.message =
                "Sector drive engaged. Destination: " + target.system;
            }
          }
        }
      }
      // Suppress the retired v3 forward-only hyperdrive; the new drive owns its state.
      v.hyper = "idle";
      let controls = { ...input };
      if (d.jump?.state === "transit") controls = {};
      else if (
        normalFlight &&
        !input.brake &&
        (d.cruiseSpool > 0.01 || d.tacticalRemaining > 0)
      )
        controls.forward = 1;
      if (!d.power) controls = { brake: false };
      if (this.walking) controls = input;
      super.update(dt, controls);
      if (d.jump?.state === "transit" && !this.route) {
        const dest = d.jump.target, selected=d.jump.selection;
        d.jump = null;
        d.jumpTarget = null;
        v.cooldown = 3;
        this.message = !selected || selected.kind==='world'
          ? dest.name + " exterior arrival complete · Manual flight restored. Enter the atmosphere with W; land with L below 300 m."
          : "Arrived at " + selected.name + ". Manual flight restored.";
      }
      v.hyper = d.jump
        ? d.jump.state === "charging"
          ? "charging"
          : "active"
        : "idle";
      if (!d.jump) v.charge = 0;
      else if (d.jump.state === "charging")
        v.charge = clamp(d.jump.time / d.jump.duration, 0, 1);
      if (normalFlight && d.power) {
        if (d.cruiseSpool > 0.01)
          this.ship.fuel = Math.max(
            0,
            this.ship.fuel - dt * 0.28 * d.cruiseSpool * this.craft.fuelRate,
          );
        if (d.tacticalRemaining > 0) {
          this.ship.fuel = Math.max(0, this.ship.fuel - dt * 0.1);
          v.heat = clamp(v.heat + dt * 0.075, 0, 1);
        }
      }
      d.flightMode = d.jump
        ? d.jump.state === "charging"
          ? "SECTOR SPOOL"
          : "SECTOR TRANSIT"
        : d.cruiseSpool > 0.03
          ? "INTERPLANETARY CRUISE"
          : d.tacticalRemaining > 0
            ? "TACTICAL BURST"
            : input.boost && normalFlight && !input.brake
              ? "BOOST · FAST APPROACH"
            : !d.power
              ? "UNPOWERED COAST"
              : this.assist
                ? "ASSISTED FLIGHT"
                : "INERTIAL FLIGHT";
      if (v.state === "flight" && !this.route)
        this.mode = d.flightMode + (d.limitReason ? " · " + d.limitReason : "");
    }
    exportSave() {
      const s = super.exportSave();
      if (!this.drive) return s;
      s.version = 4;
      s.drive = {
        power: this.drive.power,
        lights: this.drive.lights,
        capacitor: this.drive.capacitor,
        jumpTarget: this.drive.jumpTarget,
      };
      return s;
    }
    loadSave(s) {
      if (!s) return false;
      if (s.version === 4) {
        const d = s.drive;
        if (
          !d ||
          typeof d.power !== "boolean" ||
          typeof d.lights !== "boolean" ||
          !Number.isFinite(d.capacitor) ||
          d.capacitor < 0 ||
          d.capacitor > 1 ||
          (d.jumpTarget !== null && typeof d.jumpTarget !== "string") ||
          (d.jumpTarget && !this.world.byId(d.jumpTarget))
        )
          return false;
        if (!super.loadSave({ ...s, version: 3 })) return false;
        this.drive = {
          ...initialDrive(),
          power: d.power,
          lights: d.lights,
          capacitor: d.capacitor,
          jumpTarget: d.jumpTarget,
        };
        return true;
      }
      if (!super.loadSave(s)) return false;
      this.drive = initialDrive();
      return true;
    }
  }
  Object.assign(C, { DoubleTap, Flight, LegacyPilotFlight: Base });
  return C;
});

/* One physical layout for shader button cells, projected labels and ray picking.
   All positions/half-extents below are ship-local METRES. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else factory(root.LongwayCore);
})(globalThis, function (C) {
  "use strict";
  const definitions = [
    ["power", "MAIN BUS", "POWER", "Start / stop main engines"],
    ["assist", "FLIGHT ASSIST", "IFCS", "Counter drift and gravity"],
    ["gear", "LANDING GEAR", "GEAR", "Deploy / retract articulated struts"],
    ["lights", "LANDING LIGHTS", "LIGHTS", "Illuminate ground ahead"],
    [
      "tactical",
      "TACTICAL BURST",
      "BURST",
      "Short capacitor-limited acceleration",
    ],
    [
      "cruise",
      "PLANETARY CRUISE",
      "CRUISE",
      "Latch / release interplanetary cruise",
    ],
    ["sector", "NEXT SECTOR", "SECTOR", "Choose neighboring system"],
    ["hyper", "SECTOR DRIVE", "JUMP", "Charge / cancel sector hyperdrive"],
    ["landing", "LAND / LAUNCH", "VTOL", "Automatic local landing or launch"],
    ["scan", "SURVEY WORLD", "SCAN", "Store ecology survey data"],
    ["atlas", "GALAXY ATLAS", "ATLAS", "Choose from 10,000 worlds"],
    ["camera", "EXTERNAL CAMERA", "VIEW", "Switch cockpit and chase camera"],
  ];
  const controls = (craft) =>
    globalThis.BloxCockpitVisualLayout ? globalThis.BloxCockpitVisualLayout(craft) : definitions.map((d, i) => ({
      index: i,
      action: d[0],
      name: d[1],
      label: d[2],
      description: d[3],
      center: [
        ((i % 6) - 2.5) * craft.dimensions[1] * 0.046,
        craft.dimensions[2] * (0.29 - Math.floor(i / 6) * 0.058),
        craft.dimensions[0] * 0.294 - 0.2,
      ],
      half: [craft.dimensions[1] * 0.019, craft.dimensions[2] * 0.023, 0.035],
    }));
  function rayBox(ro, rd, c, h) {
    let low = 0,
      high = Infinity;
    for (let i = 0; i < 3; i++) {
      const q = ro[i] - c[i];
      if (Math.abs(rd[i]) < 1e-12) {
        if (Math.abs(q) > h[i]) return null;
        continue;
      }
      let a = (-h[i] - q) / rd[i],
        b = (h[i] - q) / rd[i];
      if (a > b) [a, b] = [b, a];
      low = Math.max(low, a);
      high = Math.min(high, b);
      if (low > high) return null;
    }
    return high >= 0 ? low : null;
  }
  function pickLocal(craft, ro, rd) {
    let hit = null,
      t = Infinity;
    for (const b of controls(craft)) {
      const v = rayBox(ro, rd, b.center, b.half);
      if (v !== null && v < t) {
        t = v;
        hit = { ...b, distance: v };
      }
    }
    return hit;
  }
  function pick(f, origin, direction) {
    const vf = f.vehicleFrame(),
      q = C.sub(origin, vf.position),
      ro = [
        C.dot(q, vf.right) * 1000,
        C.dot(q, vf.up) * 1000,
        C.dot(q, vf.forward) * 1000,
      ],
      rd = [
        C.dot(direction, vf.right),
        C.dot(direction, vf.up),
        C.dot(direction, vf.forward),
      ];
    return pickLocal(f.craft, ro, rd);
  }
  function states(f) {
    const d = f.drive || {},
      v = f.vehicle,
      j = d.jump;
    return [
      d.power ? 1 : 0,
      f.assist ? 1 : 0,
      v.gear,
      d.lights ? 1 : 0,
      d.tacticalRemaining > 0 ? 1 : 0,
      d.cruiseSpool || 0,
      j?.target ? 1 : 0,
      j ? (j.state === "charging" ? Math.min(1, j.time / 4) : 1) : 0,
      ["landed", "docked"].includes(v.state) ? 1 : 0,
      f.ship.scanned.has(f.nearest().body.id) ? 1 : 0,
      0,
      f.cameraMode === "chase" ? 1 : 0,
    ];
  }
  C.CockpitLayout = { definitions, controls, rayBox, pickLocal, pick, states };
  return C;
});

/* Matched CPU/GPU geology. Height is kilometres, not an exaggerated relief map.
   Channel-shaped fields are procedural landforms, not simulated erosion. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else factory(root.LongwayCore);
})(globalThis, function (C) {
  "use strict";
  function sample(world, b, n) {
    if (b.type === 3) return { height: 0, channel: 0, regional: 0, detail: 0 };
    const o = b.offset,
      N = world.noise,
      noise = (s) =>
        N.sample(
          n[0] * s * b.frequency + o[0],
          n[1] * s * b.frequency + o[1],
          n[2] * s * b.frequency + o[2],
        ),
      q = noise(12) * 2 - 1;
    const regional =
        0.58 * noise(3.5) +
        0.26 * (1 - q * q) +
        0.14 * noise(42) +
        0.02 * noise(135),
      warp = noise(73),
      channel =
        1 -
        C.smooth(
          C.clamp(
            (Math.abs(noise(260) - 0.5 + (warp - 0.5) * 0.16) - 0.018) / 0.075,
            0,
            1,
          ),
        ),
      detail = noise(1500) - 0.5;
    const smoothstep = (lo, hi, x) =>
      C.smooth(C.clamp((x - lo) / (hi - lo), 0, 1));
    const ridge = 1 - Math.abs(noise(95) * 2 - 1);
    let landform = 0;
    if (b.type === 0) {
      const q = n.map((v, i) => v * b.frequency * 48 + o[i]),
        cell = q.map((v) => Math.floor(v + 0.5));
      const jitter =
        N.sample(
          cell[0] * 0.73 + o[0],
          cell[1] * 0.73 + o[1],
          cell[2] * 0.73 + o[2],
        ) - 0.5;
      const d = Math.hypot(...q.map((v, i) => v - cell[i] - jitter * 0.12));
      landform =
        0.026 * Math.exp(-Math.pow((d - 0.32) / 0.055, 2)) -
        0.046 * (1 - smoothstep(0.2, 0.31, d)) +
        0.009 * ridge;
    } else if (b.type === 2) {
      const dune = Math.pow(
        0.5 +
          0.5 *
            Math.sin(
              (n[0] * 0.82 + n[2] * 0.58) * b.frequency * 480 + warp * 4,
            ),
        3,
      );
      landform =
        0.024 * dune +
        0.065 * smoothstep(0.54, 0.71, noise(42)) -
        0.016 * channel;
    } else if (b.type === 4) {
      landform =
        0.04 * Math.pow(ridge, 5) -
        0.045 * Math.pow(channel, 3) +
        0.018 * Math.abs(Math.sin(n[1] * b.frequency * 260 + warp * 3));
    } else if (b.type === 5) {
      const vent = smoothstep(0.59, 0.74, noise(62));
      landform =
        0.1 * vent -
        0.055 * smoothstep(0.73, 0.83, noise(62)) -
        0.025 * channel +
        0.025 * Math.pow(ridge, 4);
    } else {
      const mountains = smoothstep(0.48, 0.72, noise(18));
      landform =
        0.055 * mountains * Math.pow(ridge, 3) - 0.013 * channel * (0.4 + warp);
    }
    const km = n.map((x) => x * b.radius),
      localNoise = (scale) =>
        N.sample(
          km[0] * scale + o[0],
          km[1] * scale + o[1],
          km[2] * scale + o[2],
        );
    const broad = localNoise(0.7),
      fineRidge = 1 - Math.abs(localNoise(2.6) * 2 - 1),
      relief = Math.min(0.2, b.radius * b.amp * 0.23);
    let localForm = 0;
    if (b.type === 0) {
      const q = km.map((x, i) => x * 1.8 + o[i]),
        d = Math.hypot(...q.map((x) => x - Math.floor(x + 0.5)));
      localForm =
        0.28 * Math.exp(-Math.pow((d - 0.31) / 0.07, 2)) -
        0.32 * (1 - smoothstep(0.13, 0.3, d)) +
        0.18 * broad;
    } else if (b.type === 2) {
      const dune = Math.pow(
        0.5 + 0.5 * Math.sin(km[0] * 7.5 + km[2] * 4.2 + localNoise(0.6) * 3),
        3,
      );
      localForm = 0.36 * dune + 0.64 * smoothstep(0.48, 0.72, localNoise(1.2));
    } else if (b.type === 4)
      localForm =
        0.7 * Math.pow(fineRidge, 7) +
        0.26 * broad -
        0.1 * Math.pow(1 - fineRidge, 3);
    else if (b.type === 5)
      localForm =
        0.72 * Math.pow(fineRidge, 2) +
        0.25 * smoothstep(0.45, 0.7, localNoise(1.1));
    else
      localForm =
        0.75 * smoothstep(0.32, 0.75, broad) * Math.pow(fineRidge, 2) +
        0.12 * localNoise(4);
    const correction = landform + 0.0018 * detail;
    return {
      height:
        b.radius * b.amp * (regional - b.terrainBase - 0.02 + correction) +
        relief * localForm,
      channel,
      regional,
      detail,
      landform,
    };
  }

  const box = (p, b) => {
    const q = p.map((v, i) => Math.abs(v) - b[i]);
    return (
      Math.hypot(...q.map((v) => Math.max(v, 0))) + Math.min(Math.max(...q), 0)
    );
  };
  function buildingDistance(p, h, type) {
    let d;
    const b = (x, y, z, wx, hy, dz) =>
      box([p[0] - x, p[1] - y, p[2] - z], [wx, hy, dz]);
    if (type === 0)
      d = Math.min(
        b(0, h * 0.29, 0, 0.047, h * 0.29, 0.049),
        b(-0.01, h * 0.75, 0.002, 0.035, h * 0.17, 0.039),
        b(-0.008, h * 0.95, 0, 0.027, h * 0.05, 0.03),
      );
    else if (type === 1)
      d = Math.min(
        b(0, h * 0.08, 0, 0.047, h * 0.08, 0.049),
        b(-0.026, h * 0.55, 0, 0.019, h * 0.41, 0.041),
        b(0.026, h * 0.55, 0, 0.019, h * 0.41, 0.041),
        b(0, h * 0.65, 0, 0.046, 0.005, 0.022),
      );
    else if (type === 2) {
      const q = [
        Math.hypot(p[0], p[2]) - 0.047,
        Math.abs(p[1] - h * 0.5) - h * 0.5,
      ];
      d =
        Math.min(Math.max(q[0], q[1]), 0) +
        Math.hypot(Math.max(q[0], 0), Math.max(q[1], 0));
      d = Math.min(d, b(0, h * 0.055, 0, 0.05, h * 0.055, 0.05));
    } else
      d = Math.min(
        b(0, h * 0.325, 0, 0.047, h * 0.325, 0.049),
        b(0.013, h * 0.825, 0, 0.028, h * 0.175, 0.039),
      );
    return d - 0.005;
  }
  C.Geology = { sample, buildingDistance };
  C.Universe.prototype.rawHeight = function (b, n) {
    return sample(this, b, n).height;
  };
  C.Universe.prototype.cityField = function (q, b) {
    let d = box([q[0], q[1] + 0.007, q[2]], [0.9, 0.008, 0.9]);
    const ix = Math.floor((q[0] + 0.08) / 0.16),
      iz = Math.floor((q[2] + 0.08) / 0.16);
    if (
      Math.abs(ix) <= 4 &&
      Math.abs(iz) <= 4 &&
      ix !== 0 &&
      Math.hypot(ix, iz) > 1.6
    ) {
      const seed = C.hash(
          ((ix + 29) * 73856093) ^ ((iz + 41) * 19349663) ^ b.seed,
        ),
        h =
          0.034 +
          (seed / 4294967296) * 0.19 * (b.settlementStyle === 2 ? 0.65 : 1);
      d = Math.min(
        d,
        box(
          [q[0] - ix * 0.16, q[1] - 0.002, q[2] - iz * 0.16],
          [0.052, 0.003, 0.054],
        ),
        buildingDistance(
          [q[0] - ix * 0.16, q[1] - 0.009, q[2] - iz * 0.16],
          h,
          seed % 4,
        ),
      );
    }
    d = Math.min(
      d,
      box([q[0], q[1] - 0.106, q[2] + 0.32], [0.34, 0.008, 0.028]),
    );
    for (const sign of [-1, 1])
      d = Math.min(
        d,
        box(
          [q[0] - sign * 0.31, q[1] - 0.055, q[2] + 0.32],
          [0.006, 0.06, 0.022],
        ),
      );
    d = Math.min(
      d,
      Math.max(
        Math.hypot(q[0], q[2] + 0.12) - 0.032,
        Math.abs(q[1] - 0.016) - 0.012,
      ),
    );
    return d;
  };
  return C;
});

/* Stable surface cells, staged look-ahead and bounded CPU caches. No network I/O. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory;
  else factory(root.LongwayCore);
})(typeof globalThis !== "undefined" ? globalThis : this, function (C) {
  "use strict";
  const { add, sub, mul, unit, dot, cross, length, random, hash } = C,
    P = C.Universe.prototype;
  const faces = [
    [
      [1, 0, 0],
      [0, 0, -1],
      [0, 1, 0],
    ],
    [
      [-1, 0, 0],
      [0, 0, 1],
      [0, 1, 0],
    ],
    [
      [0, 1, 0],
      [1, 0, 0],
      [0, 0, -1],
    ],
    [
      [0, -1, 0],
      [1, 0, 0],
      [0, 0, 1],
    ],
    [
      [0, 0, 1],
      [1, 0, 0],
      [0, 1, 0],
    ],
    [
      [0, 0, -1],
      [-1, 0, 0],
      [0, 1, 0],
    ],
  ];
  function address(p, b) {
    const n = C.bodyLocal ? C.bodyLocal(b,unit(sub(p,b.center))) : unit(sub(p,b.center));
    let k = 0,
      best = -1;
    for (let i = 0; i < 6; i++) {
      const d = dot(n, faces[i][0]);
      if (d > best) {
        best = d;
        k = i;
      }
    }
    const f = faces[k];
    return {
      face: k,
      u: (dot(n, f[1]) / best) * b.radius,
      v: (dot(n, f[2]) / best) * b.radius,
      up: C.bodyWorld?C.bodyWorld(b,n):n,
      right: C.bodyWorld?C.bodyWorld(b,unit(cross([0,1,0],n))):unit(cross([0,1,0],n)),
      forward: C.bodyWorld?C.bodyWorld(b,unit(cross(unit(cross([0,1,0],n)),n))):unit(cross(unit(cross([0,1,0],n)),n)),
    };
  }
  function direction(a, b, u, v) {
    const f = faces[a.face];
    const n=unit(
      add(f[0], add(mul(f[1], u / b.radius), mul(f[2], v / b.radius))),
    );
    return C.bodyWorld?C.bodyWorld(b,n):n;
  }
  P.streamCell = function (b, face, x, z) {
    this.surfaceCache ??= new Map();
    this.streamStats ??= { generated: 0, hits: 0, cache: 0, prefetched: 0 };
    const key = b.id + ":" + face + ":" + x + ":" + z;
    let tile = this.surfaceCache.get(key);
    if (tile) {
      this.streamStats.hits++;
      return tile;
    }
    const r = random(
        hash(
          b.seed ^
            Math.imul(x + 110003, 73856093) ^
            Math.imul(z + 99991, 19349663) ^
            Math.imul(face + 1, 19349639),
        ),
      ),
      site = this.site(b),
      size = 0.5,
      objects = [];
    for (let i = 0; i < 24; i++) {
      const u = (x + r()) * size,
        v = (z + r()) * size,
        n = direction({ face }, b, u, v),
        raw = this.rawHeight(b, n),
        h = this.height(b, n),
        position = add(b.center, mul(n, b.radius + h + 0.0002)),
        d = length(sub(position, site.center));
      if (
        r() > 0.24 + b.humidity * 0.65 ||
        (b.liquid && raw < -0.001 && b.flora !== 4) ||
        ((b.biome === 6 || b.type === 3) && d > 1)
      )
        continue;
      if (d < 1.35) {
        const q = this.toLocal(position, site);
        if (Math.abs(q[0]) < 0.9 && Math.abs(q[2]) < 0.9) continue;
      }
      const scale =
        (b.flora === 0
          ? 0.011
          : b.flora === 1
            ? 0.007
            : b.flora === 3
              ? 0.008
              : 0.005) *
        (0.75 + r() * 1.1);
      objects.push({ id: key + ":p" + i, position, size: scale, variant: i });
    }
    const fauna = [];
    for (let i = 0; i < 6; i++) {
      const u = (x + 0.16 + r() * 0.68) * size,
        v = (z + 0.16 + r() * 0.68) * size;
      fauna.push({
        id: key + ":a" + i,
        u,
        v,
        index: (Math.abs(x * 13 + z * 17) + i) % 16,
      });
    }
    tile = { key, face, x, z, objects, fauna };
    this.surfaceCache.set(key, tile);
    while (this.surfaceCache.size > 128)
      this.surfaceCache.delete(this.surfaceCache.keys().next().value);
    this.streamStats.generated++;
    this.streamStats.cache = this.surfaceCache.size;
    return tile;
  };
  P.streamVegetation = function (p, b, max = 40) {
    const a = address(p, b),
      cx = Math.floor(a.u / 0.5),
      cz = Math.floor(a.v / 0.5),
      site = this.site(b),
      nearPort = length(sub(p, site.center)) < .32;
    this.plantFrame = {
      center: sub(p, mul(a.up, this.nearest(p).altitude)),
      up: a.up,
      right: a.right,
      forward: a.forward,
    };
    // Old port trees obey the existing architectural planter placements.
    let local = [];
    if (nearPort) {
      local = this.vegetation(p, b, 24);
      this.plantFrame = site;
    }
    const nearby = [],
      far = [];
    for (let x = cx - 3; x <= cx + 3; x++)
      for (let z = cz - 3; z <= cz + 3; z++) {
        const cell = this.streamCell(b, a.face, x, z);
        for (const o of cell.objects) {
          const d = length(sub(o.position, p));
          (d < 0.55 ? nearby : far).push({ ...o, d });
        }
      }
    nearby.sort((a, b) => a.d - b.d);
    far.sort((a, b) => a.d - b.d);
    const count = Math.min(24, max),
      out = nearPort ? local.slice(0, count) : nearby.slice(0, count);
    // Stratified directions and distance bands preserve silhouettes beyond the near-field.
    const buckets = Array.from({ length: 8 }, () => []);
    for (const o of far) {
      const rel = sub(o.position, p),
        angle = Math.atan2(dot(rel, a.right), dot(rel, a.forward)),
        k = Math.min(7, Math.floor(((angle + Math.PI) / (2 * Math.PI)) * 8));
      buckets[k].push(o);
    }
    for (let band = 0; out.length < max && band < 3; band++)
      for (const list of buckets) {
        if (out.length >= max) break;
        const candidate = list.find(
          (o) =>
            o.d > (band === 0 ? 0.55 : band === 1 ? 1.1 : 1.6) &&
            !out.some((v) => v.id === o.id),
        );
        if (candidate) out.push(candidate);
      }
    this._streamAddress = { ...a, cx, cz, body: b };
    return out;
  };
  P.prefetchSurface = function (p, b, forward) {
    const a = address(add(p, mul(forward, 1.6)), b),
      x = Math.floor(a.u / 0.5),
      z = Math.floor(a.v / 0.5);
    this.streamCell(b, a.face, x, z);
    this.streamStats.prefetched++;
  };
  P.streamFauna = function (p, b) {
    // Scale each biological body plan consistently; positions remain at the feet.
    const measured = (ag) => {
      const identity =
        typeof ag.id === "number"
          ? ag.id
          : String(ag.id)
              .split("")
              .reduce((h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0, 17);
      const family = ag.type ? 1 : (hash(identity ^ b.seed) % 4096) % 5;
      const health=this.ecosystem(b).wildlife?.[ag.id];return { ...ag,position:health?.hull===0&&health.bodyPosition?add(b.center,C.bodyWorld?C.bodyWorld(b,health.bodyPosition):health.bodyPosition):ag.position, family, phenotype:C.Biology?.phenotype(b,ag.id,family), wildlife:true, bodyId:b.id, hull:health?.hull??60, dead:health?.hull===0, size: ag.size * [0.83, 0.6, 1.05, 0.25, 0.48][family] };
    };
    const a = address(p, b),
      cx = Math.floor(a.u / 0.5),
      cz = Math.floor(a.v / 0.5),
      site = this.site(b),
      candidates = [],
      eco = this.ecosystem(b);
    let frame = { center: p, up: a.up, right: a.right, forward: a.forward };
    if (length(sub(p, site.center)) < .32) {
      frame = site;
      const out = eco.agents.map((ag, i) => {
        let x = (i % 2 ? -.19 : .19) + ag.x * .018,
          z = C.clamp(ag.z * .18, -.22, .22);
        if (Math.hypot(x, z + 0.12) < 0.043) x = (x < 0 ? -1 : 1) * 0.047;
        const guess = this.fromLocal([x, 0, z], site),
          n = unit(sub(guess, b.center));
        return {
          position: this.fromLocal([x, 0.001005, z], site),
          ...ag,
          id: (b.activeSettlement?.id||b.id) + ":port:" + i,
        };
      });
      this.faunaFrame = frame;
      return out.slice(0,globalThis.LongwayGraphics?.population.fauna||18).map(measured).filter(a=>!a.dead||eco.age-(eco.wildlife[a.id]?.time??0)<45);
    }
    for (let x = cx - 1; x <= cx + 1; x++)
      for (let z = cz - 1; z <= cz + 1; z++) {
        const tile = this.streamCell(b, a.face, x, z);
        for (const o of tile.fauna) {
          const ag = eco.agents[o.index],
            n = direction(a, b, o.u + ag.x * 0.025, o.v + ag.z * 0.025),
            h = this.rawHeight(b, n);
          if (b.liquid && h < 0) continue;
          const position = add(
            b.center,
            mul(n, b.radius + this.height(b, n) + 0.00015),
          );
          candidates.push({
            ...ag,
            id: o.id,
            position,
            d: length(sub(position, p)),
          });
        }
      }
    candidates.sort((a, b) => a.d - b.d);
    this.faunaFrame = frame;
    return candidates.slice(0,globalThis.LongwayGraphics?.population.fauna||18).map(measured).filter(a=>!a.dead||eco.age-(eco.wildlife[a.id]?.time??0)<45);
  };
  return C;
});

/* Live instrument atlas, sampled by the actual 3-D cockpit surfaces.
   Upper half: two 1024x512 MFDs. Lower half: twelve physical switch labels. */
(function (root) {
  "use strict";
  root.LongwayCockpit = {
    draw(canvas, f) {
      const g = canvas.getContext("2d"),
        C = LongwayCore,
        c = f.craft,
        v = f.vehicle,
        d = f.drive || {},
        W = canvas.width,
        H = canvas.height;
      g.clearRect(0, 0, W, H);
      g.save();
      g.scale(W / 2048, H / 1024);
      const text = (s, x, y, size = 22, color = "#9dbcbf", align = "left") => {
        g.font = `${size}px "Consolas",monospace`;
        g.textAlign = align;
        g.fillStyle = color;
        g.fillText(String(s), x, y);
      };
      const line = (x, y, X, Y, color = "#23414b", width = 2) => {
        g.strokeStyle = color;
        g.lineWidth = width;
        g.beginPath();
        g.moveTo(x, y);
        g.lineTo(X, Y);
        g.stroke();
      };
      const rect = (x, y, w, h, col) => {
        g.fillStyle = col;
        g.fillRect(x, y, w, h);
      };
      const bar = (x, y, width, value, col) => {
        rect(x, y, width, 10, "#142833");
        rect(x, y, width * C.clamp(value, 0, 1), 10, col);
      };
      for (let side = 0; side < 2; side++) {
        const x = side * 1024;
        const gradient = g.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, "#091a24");
        gradient.addColorStop(1, "#020b12");
        rect(x, 0, 1024, 512, gradient);
        g.strokeStyle = "#102c37";
        g.lineWidth = 1;
        for (let a = 0; a < 1024; a += 48)
          line(x + a, 48, x + a, 466, "#102631", 1);
        for (let y = 70; y < 470; y += 40)
          line(x + 18, y, x + 1005, y, "#102631", 1);
        rect(x, 0, 1024, 45, "#112a34");
        line(x + 16, 48, x + 1007, 48, "#4a787c");
        line(x + 16, 468, x + 1007, 468, "#35545e");
      }
      const powered = d.power !== false,
        lit = powered ? "#d4eee0" : "#776b61";
      text(
        "LONGWAY  /  " + c.id + "  /  FLIGHT CONTROL",
        20,
        31,
        20,
        "#8dbab9",
      );
      text(
        "PWR " + (powered ? "NOMINAL" : "OFF"),
        986,
        31,
        18,
        powered ? "#b9dfb4" : "#f0a875",
        "right",
      );
      let speed = f.speed * 1000,
        unit = "m/s";
      if (speed >= 10000) {
        speed /= 1000;
        unit = "km/s";
      }
      text("VELOCITY", 30, 90, 18);
      text(speed.toFixed(speed < 10 ? 1 : 0), 26, 165, 64, lit);
      text(unit, 282, 165, 20, "#6d969e");
      text("ALTITUDE / ASL", 30, 214, 18);
      let alt = Math.max(0, f.altitude());
      text(
        alt >= 1 ? alt.toFixed(1) + " km" : (alt * 1000).toFixed(0) + " m",
        30,
        252,
        36,
        lit,
      );
      text("FLIGHT ASSIST", 30, 304, 18);
      text(
        f.assist ? "COUPLED" : "INERTIAL",
        30,
        337,
        27,
        f.assist ? "#a5d7c5" : "#edba71",
      );
      text("CAPACITOR", 30, 388, 18);
      bar(30, 405, 260, d.capacitor ?? 1, "#74bdc9");
      text(Math.round((d.capacitor ?? 1) * 100) + "%", 303, 415, 18);
      const near = f.nearest(),
        radial = C.unit(C.sub(f.position, near.body.center)),
        pitch = Math.asin(C.clamp(C.dot(f.forward, radial), -1, 1)),
        roll = Math.atan2(C.dot(f.right, radial), C.dot(f.up, radial));
      // A real attitude ladder, bank marker and a velocity-vector marker.
      g.save();
      g.translate(654, 252);
      g.beginPath();
      g.arc(0, 0, 172, 0, Math.PI * 2);
      g.clip();
      g.rotate(-roll);
      g.translate(0, pitch * 145);
      rect(-240, -1200, 480, 1200, "#142f40");
      rect(-240, 0, 480, 1200, "#2d2824");
      line(-220, 0, 220, 0, "#c0cac1", 3);
      for (let a = -80; a <= 80; a += 10) {
        let y = a * 2.3;
        line(-42, y, 42, y, a === 0 ? "#e7ddbf" : "#60858d", 2);
        if (a) text(-a, -53, y + 5, 16, "#9eb4b5", "right");
      }
      g.restore();
      g.strokeStyle = "#678c90";
      g.lineWidth = 3;
      g.beginPath();
      g.arc(654, 252, 173, 0, Math.PI * 2);
      g.stroke();
      for (let a = -60; a <= 60; a += 15) {
        const ang = (a * Math.PI) / 180;
        line(
          654 + Math.sin(ang) * 178,
          252 - Math.cos(ang) * 178,
          654 + Math.sin(ang) * 190,
          252 - Math.cos(ang) * 190,
          "#8caaa9",
          2,
        );
      }
      line(590, 252, 640, 252, "#f0c66b", 3);
      line(668, 252, 718, 252, "#f0c66b", 3);
      line(640, 252, 654, 264, "#f0c66b", 3);
      line(654, 264, 668, 252, "#f0c66b", 3);
      const vel = C.unit(f.velocity || [0, 0, 0]),
        vf = C.dot(vel, f.forward);
      if (f.speed > 0.002 && vf > 0.1) {
        const vx = C.clamp((C.dot(vel, f.right) / vf) * 130, -155, 155),
          vy = C.clamp((C.dot(vel, f.up) / vf) * 130, -155, 155);
        g.strokeStyle = "#9eda99";
        g.lineWidth = 3;
        g.beginPath();
        g.arc(654 + vx, 252 - vy, 9, 0, 7);
        g.stroke();
        line(636 + vx, 252 - vy, 645 + vx, 252 - vy, "#9eda99");
        line(663 + vx, 252 - vy, 672 + vx, 252 - vy, "#9eda99");
      }
      text("ACCEL", 895, 108, 16);
      text(Math.round(d.acceleration || 0) + " m/s²", 895, 136, 18, lit);
      text("BRAKE DIST", 895, 197, 16);
      text((d.brakingDistance || 0).toFixed(1) + " km", 895, 227, 18, lit);
      text("GEAR", 895, 310, 16);
      text(
        v.gear > 0.99 ? "DOWN" : v.gear < 0.01 ? "UP" : "TRANSIT",
        895,
        339,
        20,
        v.gear > 0.1 ? "#e7b974" : "#93b6b9",
      );
      text(
        near.body.name.toUpperCase() + " / " + v.state.toUpperCase(),
        23,
        498,
        19,
        "#8eaab1",
      );
      text(c.className.toUpperCase(), 1000, 498, 17, "#638891", "right");
      const x = 1046;
      let target = f.jumpDestination?.(),
        j = d.jump;
      text("NAVIGATION / PROPULSION MANAGEMENT", x, 31, 20, "#8dbab9");
      text("04", 2004, 31, 19, "#9be0c9");
      text(d.flightMode || "STANDARD", x, 91, 32, j ? "#b7a5f0" : "#b0d7ca");
      text(
        "SECTOR " + f.world.cell(f.position).join(" : "),
        2004,
        90,
        19,
        "#7897a8",
        "right",
      );
      const vals = [
        ["FUEL", f.ship.fuel / 100, "#7dafa5"],
        ["HULL", f.ship.hull / 100, "#89adb8"],
        ["CORE HEAT", v.heat, v.heat > 0.8 ? "#f19260" : "#d5b17c"],
        ["MAIN THRUST", v.thrust, "#7fc4ce"],
      ];
      vals.forEach(([s, val, col], i) => {
        const y = 140 + i * 49;
        text(s, x, y, 18);
        bar(x + 191, y - 10, 497, val, col);
        text(Math.round(val * 100) + "%", 2007, y, 23, col, "right");
      });
      line(x, 325, 2004, 325);
      text("HYPERSPACE SOLUTION", x, 356, 18, "#788ba9");
      text(
        j?.target.system || target?.system || "UNASSIGNED",
        x,
        394,
        34,
        "#c5cae1",
      );
      text(
        (j?.target || target)?.name || "Select a sector",
        x + 2,
        426,
        21,
        "#8fa9b7",
      );
      const spool = j
        ? j.state === "charging"
          ? j.time / 4
          : f.route
            ? f.route.time / f.route.total
            : 1
        : d.cruiseSpool || 0;
      bar(1578, 373, 406, spool, j ? "#b89bdf" : "#80b8b8");
      text(
        j
          ? j.state.toUpperCase() + " " + Math.round(spool * 100) + "%"
          : "CRUISE " + Math.round(spool * 100) + "%",
        1578,
        426,
        20,
        j ? "#c5abea" : "#a4c4c5",
      );
      text(
        d.limitReason ||
          (!powered
            ? "MAIN ENGINE BUS OFFLINE"
            : d.tacticalCooldown > 0
              ? "TACTICAL RECOVERY " + d.tacticalCooldown.toFixed(1) + "s"
              : "I: INTERACT   /   SHIFT: CRUISE   /   W,W: BURST"),
        x,
        498,
        18,
        d.limitReason ? "#eac58b" : "#7e9f9e",
      );
      const states = C.CockpitLayout.states(f);
      C.CockpitLayout.definitions.forEach((item, i) => {
        const col = i % 6,
          row = Math.floor(i / 6),
          xx = (col * 2048) / 6,
          yy = 512 + row * 256,
          bw = 2048 / 6,
          on = states[i] > 0.5,
          pressed = d.buttonPulse === i && d.pulseTime > 0;
        rect(xx, yy, bw, 256, "#121b20");
        rect(xx + 9, yy + 9, bw - 18, 238, pressed ? "#354047" : "#202a30");
        line(xx + 14, yy + 18, xx + bw - 14, yy + 18, "#5d6a6f", 3);
        line(xx + 16, yy + 239, xx + bw - 16, yy + 239, "#05080b", 5);
        rect(xx + 29, yy + 44, 16, 16, on ? "#a2e4c1" : "#484947");
        text(
          String(i + 1).padStart(2, "0"),
          xx + bw - 26,
          yy + 56,
          20,
          "#70848a",
          "right",
        );
        text(
          item[2],
          xx + bw / 2,
          yy + 125,
          38,
          on ? "#def2df" : "#b1b7b8",
          "center",
        );
        text(item[1], xx + bw / 2, yy + 171, 16, "#7b989e", "center");
        text(
          on ? "ENGAGED" : "STANDBY",
          xx + bw / 2,
          yy + 216,
          17,
          on ? "#84c8a6" : "#60747d",
          "center",
        );
      });
      // Opt-in powered diagnostics remain visible on their low-power instrument bus.
      for (let y = 52; y < 465; y += 6) rect(0, y, 2048, 1, "#00000014");
      g.restore();
    },
  };
})(globalThis);
