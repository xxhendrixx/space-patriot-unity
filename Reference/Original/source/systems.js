/* Original, compact vessel simulation. Inspired by published space-sim workflows;
   power, temperature and component health have actual flight/combat consequences. */
(function (root, factory) {
  const api = factory(
    root.LongwayCore ||
      (typeof require === "function" ? require("./core.js") : {}),
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else Object.assign(root.LongwayCore, api);
})(globalThis, function (C) {
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  class VesselSystems {
    constructor(world, flight, combat) {
      this.world = world;
      this.flight = flight;
      this.combat = combat;
      flight.systems = combat.systems = this;
      this.mode = "SCM";
      this.allocations = { engines: 4, weapons: 4, shields: 4 };
      this.components = Object.fromEntries(
        [
          "reactor",
          "engines",
          "weapons",
          "shields",
          "cooler",
          "lifeSupport",
        ].map((k) => [k, { health: 100, enabled: true, temperature: 24 }]),
      );
      this.pressure = 100;
      this.spares = 120;
      this.repairing = null;
      this.elapsed = 0;
      this.warning = "BUS NOMINAL";
      this.profile = "BALANCED";
      this.lastHull = flight.ship.hull;
      const update = flight.update.bind(flight);
      flight.update = (dt, input = {}) => {
        this.update(Math.min(dt, 0.1));
        if (flight.bridgeWalk) {
          const yaw=flight.viewYaw,pitch=flight.viewPitch;
          if(!this.remoteVessel)update(dt, {});
          flight.viewYaw=yaw;flight.viewPitch=pitch;
          if(!this.seated)this.walkBridge(dt, input);
          return;
        }
        update(dt, input);
      };
      const look = flight.look.bind(flight);
      flight.look = (yaw, pitch, roll) => {
        const sensitivity=1-.38*C.smooth(combat.aimBlend||0);
        yaw*=sensitivity;pitch*=sensitivity;
        if (flight.bridgeWalk) {
          flight.viewYaw += yaw;
          flight.viewPitch = clamp(flight.viewPitch + pitch, -1.3, 1.3);
          return;
        }
        look(yaw, pitch, roll);
      };
      const pose = flight.renderPose.bind(flight);
      flight.renderPose = () => {
        if (!flight.bridgeWalk) return pose();
        const f = flight,
          v = f.vehicle,
          vf = f.vehicleFrame(),
          p = this.bridgePosition;
        let forward = C.rotate(v.forward, v.up, -f.viewYaw),
          right = C.unit(C.cross(forward, v.up));
        forward = C.rotate(forward, right, f.viewPitch);
        const position = C.add(
          v.position,
          C.add(
            C.mul(v.up, f.craft.dimensions[2] * 0.0005),
            C.add(
              C.mul(vf.right, p[0] / 1000),
              C.mul(v.forward, f.craft.dimensions[0] * 0.00018 - p[2] / 1000),
            ),
          ),
        );
        return {
          position,
          forward,
          right,
          up: C.unit(C.cross(right, forward)),
          shipView: 1,
        };
      };
      const cameraPose = flight.renderPose.bind(flight);
      flight.renderPose = () => combat.recoilPose(cameraPose());
      for (const key of ["toggleWalk", "takeoff", "selectCraft", "place"]) {
        const run = flight[key].bind(flight);
        if(key==="toggleWalk")this.disembark=run;
        flight[key] = (...args) => {
          if(key==='toggleWalk'&&flight.craft.dimensions[0]>60&&!flight.walking&&!flight.vehicle.transition)return this.tourBridge(!flight.bridgeWalk);
          if (flight.bridgeWalk) this.tourBridge(false);
          return run(...args);
        };
      }
      const thrust = flight.applyThrust.bind(flight);
      flight.applyThrust = (desired, dt, input) =>
        thrust(desired, dt, {...input, engineFactor:this.factor("engines")});
      const fire = combat.fire.bind(combat);
      combat.fire = () => {
        if (
          !flight.walking &&
          (this.mode !== "SCM" || this.factor("weapons") < 0.06)
        ) {
          combat.message =
            this.mode === "NAV"
              ? "NAV MODE · WEAPONS INHIBITED"
              : "WEAPON BUS OFFLINE";
          return false;
        }
        return fire();
      };
      const service = combat.service.bind(combat);
      combat.service = () => {
        const ok = service();
        if (ok) {
          this.service();
          flight.ship.fuel = 100;
        }
        return ok;
      };
      for (const key of ["toggleCruise", "toggleHyper"]) {
        if (typeof flight[key] === "function") {
          const run = flight[key].bind(flight);
        if(key==="toggleWalk")this.disembark=run;
          flight[key] = (...args) => {
            const before = !!(flight.drive.cruiseLatched || flight.drive.jump);
            if (!before) this.setMode("NAV");
            return run(...args);
          };
        }
      }
    }
    tourBridge(active = !this.flight.bridgeWalk) {
      const f = this.flight;
      if (
        active &&
        (f.craft.dimensions[0] < 60 ||
          f.walking ||
          f.vehicle.transition)
      ) {
        f.message =
          "Choose a Wayfarer or Meridian; wait for the current boarding or launch transition.";
        return false;
      }
      f.bridgeWalk = active;
      this.seated = null;
      this.bridgePosition = [0, 0, 1.8];
      this.interiorPlan = C.InteriorLayout(f.craft);
      this.doors = Object.fromEntries(
        (this.interiorPlan?.doors || []).map((d) => [
          d.id,
          { open: true, progress: 1 },
        ]),
      );
      this.interiorRoom = "FLIGHT DECK";
      f.cameraMode = "cockpit";
      f.viewYaw = f.viewPitch = 0;
      f.drive.instruments = false;
      this.combat.armed = this.combat.trigger = false;
      f.message = active
        ? "SHIP INTERIOR · WASD / mouse look · Z interact"
        : "PILOT CONTROL";
      return true;
    }
    walkBridge(dt, input) {
      const f = this.flight,
        p = this.bridgePosition,
        plan = this.interiorPlan,
        y = f.viewYaw,
        speed = dt * (input.boost ? 3.4 : 2.1),
        dx =
          (Math.sin(y) * (input.forward || 0) +
            Math.cos(y) * (input.strafe || 0)) *
          speed,
        dz =
          (-Math.cos(y) * (input.forward || 0) +
            Math.sin(y) * (input.strafe || 0)) *
          speed;
      const radius = 0.22,
        inside = (x, z) =>
          plan.rooms.some(
            (r) => x >= r.x0 && x <= r.x1 && z >= r.z0 && z <= r.z1,
          ),
        valid = (x, z) =>
          [-radius, radius].every((a) =>
            [-radius, radius].every((b) => inside(x + a, z + b)),
          ) &&
          !plan.fixtures.some(
            (o) =>
              o.solid &&
              Math.abs(x - o.x) < o.w / 2 + radius &&
              Math.abs(z - o.z) < o.d / 2 + radius,
          ) &&
          !plan.doors.some(
            (d) =>
              this.doors[d.id].progress < 0.8 &&
              (d.axis === "z"
                ? Math.abs(z - d.z) < 0.16 + radius &&
                  Math.abs(x - d.x) < d.width / 2 + radius
                : Math.abs(x - d.x) < 0.16 + radius &&
                  Math.abs(z - d.z) < d.width / 2 + radius),
          );
      const steps = Math.max(1, Math.ceil(Math.hypot(dx, dz) / 0.12));
      for (let i = 0; i < steps; i++) {
        if (valid(p[0] + dx / steps, p[2])) p[0] += dx / steps;
        if (valid(p[0], p[2] + dz / steps)) p[2] += dz / steps;
      }
      this.interiorRoom =
        plan.rooms
          .filter((r) => r.id !== "corridor")
          .find(
            (r) => p[0] >= r.x0 && p[0] <= r.x1 && p[2] >= r.z0 && p[2] <= r.z1,
          )?.name || "CENTRAL PASSAGE";
    }
    interactInterior() {
      if (!this.flight.bridgeWalk) return false;
      const p = this.bridgePosition,
        plan = this.interiorPlan;
      if (p[2] > plan.end - 2.4) {
        if(this.remoteVessel)return globalThis.longway?.shipboard?.disembark();
        if(!['landed','docked'].includes(this.flight.vehicle.state)){this.flight.message='AIRLOCK INTERLOCK · Land or dock before disembarking';return false;}
        this.tourBridge(false);return this.disembark();
      }
      if(this.seated){this.seated=null;this.combat.armed=false;this.combat.trigger=false;this.flight.message='STATION RELEASED';return true;}
      const station=plan.stations?.filter(s=>Math.hypot(p[0]-s.x,p[2]-s.z)<1.7).sort((a,b)=>Math.hypot(p[0]-a.x,p[2]-a.z)-Math.hypot(p[0]-b.x,p[2]-b.z))[0];
      if(station)return globalThis.longway?.shipboard?.sit(station.id) ?? false;
      const reactor = plan.fixtures.find((x) => x.type === "reactor");
      if (Math.hypot(p[0] - reactor.x, p[2] - reactor.z) < 2.5) {
        globalThis.BloxMFD?.select(2,"engineeringDialog");this.flight.message="REACTOR DISPLAY · Click the screen to operate";
        return true;
      }
      if (Math.hypot(p[0], p[2] - 1.8) < 1.1) {
        this.tourBridge(false);
        return true;
      }
      const d = plan.doors
        .map((d) => ({ ...d, distance: Math.hypot(p[0] - d.x, p[2] - d.z) }))
        .sort((a, b) => a.distance - b.distance)[0];
      if (d?.distance < 2.2) {
        this.doors[d.id].open = !this.doors[d.id].open;
        this.flight.message =
          d.name + (this.doors[d.id].open ? " OPENING" : " CLOSING");
        return true;
      }
      return false;
    }
    factor(key) {
      const c = this.components[key],
        r = this.components.reactor;
      if (!c?.enabled || !r.enabled || !this.flight.drive.power) return 0;
      const health = ((c.health / 100) * r.health) / 100,
        thermal = clamp(1 - Math.max(0, c.temperature - 82) / 48, 0.15, 1);
      return (
        health *
        thermal *
        (this.allocations[key] === undefined ? 1 : this.allocations[key] / 4)
      );
    }
    setMode(mode) {
      if (!["SCM", "NAV"].includes(mode)) return false;
      if (this.flight.drive.jump?.state === "transit") return false;
      this.mode = mode;
      if (mode === "SCM") {
        this.flight.drive.cruiseLatched = false;
        this.flight.drive.cruiseSpool = 0;
        if (this.flight.drive.jump) this.flight.cancel();
      } else {
        this.combat.armed = false;
        this.combat.trigger = false;
      }
      return true;
    }
    allocate(key, delta) {
      if (
        !(key in this.allocations) ||
        !Number.isInteger(delta) ||
        Math.abs(delta) !== 1
      )
        return false;
      const a = this.allocations,
        others = Object.keys(a)
          .filter((x) => x !== key)
          .sort((x, y) => (delta > 0 ? a[y] - a[x] : a[x] - a[y])),
        other = others.find((x) => (delta > 0 ? a[x] > 0 : a[x] < 10));
      if (!other || a[key] + delta < 0 || a[key] + delta > 10) return false;
      a[key] += delta;
      a[other] -= delta;
      this.profile = "CUSTOM";
      return true;
    }
    preset(name) {
      const profiles = {
        BALANCED: [4, 4, 4],
        COMBAT: [3, 6, 3],
        DEFENSE: [2, 2, 8],
        TRAVEL: [8, 2, 2],
      };
      if (!profiles[name]) return false;
      ["engines", "weapons", "shields"].forEach(
        (k, i) => (this.allocations[k] = profiles[name][i]),
      );
      this.profile = name;
      return true;
    }
    toggleComponent(key) {
      const c = this.components[key];
      if (!c) return false;
      c.enabled = !c.enabled;
      return true;
    }
    repair(key) {
      const c = this.components[key];
      if (!c || c.enabled || c.health >= 100 || this.spares <= 0) {
        this.warning = "ISOLATE A DAMAGED COMPONENT TO REPAIR";
        return false;
      }
      this.repairing = key;
      return true;
    }
    service() {
      for (const c of Object.values(this.components)) {
        c.health = 100;
        c.temperature = 24;
        c.enabled = true;
      }
      this.pressure = 100;
      this.spares = 120;
      this.repairing = null;
      this.lastHull = this.flight.ship.hull;
    }
    update(dt) {
      if (!(dt > 0)) return;
      this.elapsed += dt;
      for (const door of Object.values(this.doors || {}))
        door.progress = clamp(door.progress + (door.open ? 1 : -1) * dt * 1.8);
      const F = this.flight,
        B = this.combat;
      if (this.mode === "SCM" && (F.drive.cruiseSpool > 0.02 || F.drive.jump))
        this.setMode("NAV");
      const heat = F.vehicle.heat,
        damaged = Math.max(0, this.lastHull - F.ship.hull);
      this.lastHull = F.ship.hull;
      if (damaged) {
        const keys = ["engines", "cooler", "weapons", "shields"],
          key = keys[Math.floor(this.elapsed * 17) % keys.length];
        this.components[key].health = clamp(
          this.components[key].health - damaged * 0.6,
          0,
          100,
        );
      }
      const cooling = this.factor("cooler");
      for (const [key, c] of Object.entries(this.components)) {
        const load =
          key === "weapons"
            ? B.heat
            : key === "engines"
              ? F.vehicle.thrust
              : key === "shields"
                ? (100 - B.shield) / 120
                : 0.15;
        const target =
          24 +
          (c.enabled
            ? load * 46 +
              heat * 38 +
              Math.max(0, (this.allocations[key] || 4) - 4) * 3
            : 0);
        c.temperature +=
          (target - c.temperature) * Math.min(1, dt * (0.22 + 0.15 * cooling));
        if (c.temperature > 100) c.health = Math.max(0, c.health - dt * 0.18);
      }
      if (cooling < 0.7 && F.vehicle.thrust > 0.1)
        F.vehicle.heat = clamp(F.vehicle.heat + dt * (0.7 - cooling) * 0.04);
      if (this.mode === "NAV") B.shield = Math.max(0, B.shield - dt * 16);
      this.pressure = clamp(
        this.pressure + dt * (this.factor("lifeSupport") > 0.15 ? 1.5 : -0.7),
        0,
        100,
      );
      if (this.repairing) {
        const c = this.components[this.repairing];
        if (c.enabled || c.health >= 100 || this.spares <= 0)
          this.repairing = null;
        else {
          const take = Math.min(dt * 3, this.spares, 100 - c.health);
          c.health += take;
          this.spares -= take;
        }
      }
      const bad = Object.entries(this.components).find(
        ([, c]) => c.health < 35 || c.temperature > 95,
      );
      this.warning =
        this.pressure < 70
          ? "CABIN PRESSURE LOW"
          : bad
            ? bad[0].toUpperCase() + " SERVICE REQUIRED"
            : this.mode === "NAV"
              ? "NAV · SHIELDS DISCHARGING"
              : this.repairing
                ? "REPAIR IN PROGRESS"
                : "BUS NOMINAL";
    }
  }
  return { VesselSystems };
});
