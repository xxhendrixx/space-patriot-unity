/* Combat distances are kilometres, time is seconds. Host owns damage and AI. */
(function (root, factory) {
  const api = factory(
    root.LongwayCore ||
      (typeof require === "function" ? require("./core.js") : {}),
  );
  if (typeof module === "object" && module.exports) module.exports = api;
  else Object.assign(root.LongwayCore, api);
})(globalThis, function (C) {
  "use strict";
  const { add, sub, mul, dot, cross, unit, length, clamp } = C;
  const WEAPONS = Object.freeze({
    kinetic: {
      name: "K-28 TWIN AUTOCANNON",
      short: "KINETIC",
      speed: 1.65,
      damage: 14,
      interval: 0.1,
      mag: 120,
      reserve: 960,
      reload: 2.7,
      range: 3.2,
      heat: 0.012,
      color: 0,
    },
    laser: {
      name: "L-9 PULSE ARRAY",
      short: "LASER",
      speed: 0,
      damage: 19,
      interval: 0.2,
      mag: 100,
      reserve: 0,
      reload: 0,
      range: 2.4,
      heat: 0.075,
      color: 1,
    },
    missile: {
      name: "M-6 IR SEEKER",
      short: "MISSILE",
      speed: 0.32,
      damage: 105,
      interval: 1.0,
      mag: 6,
      reserve: 12,
      reload: 4.5,
      range: 5,
      heat: 0.12,
      color: 2,
    },
    rifle: {
      name: "AR-30 SERVICE RIFLE",
      short: "RIFLE",
      speed: 0.82,
      damage: 22,
      interval: 0.12,
      mag: 30,
      reserve: 180,
      reload: 1.9,
      range: 0.8,
      heat: 0.018,
      color: 0,
    },
    sidearm: {
      name: "P-12 SIDEARM",
      short: "SIDEARM",
      speed: 0.55,
      damage: 29,
      interval: 0.28,
      mag: 12,
      reserve: 72,
      reload: 1.4,
      range: 0.4,
      heat: 0.015,
      color: 0,
    },
  });
  function segmentHit(a, b, center, radius) {
    const d = sub(b, a),
      oc = sub(a, center),
      A = dot(d, d),
      B = 2 * dot(oc, d),
      D = B * B - 4 * A * (dot(oc, oc) - radius * radius);
    if (dot(oc, oc) <= radius * radius) return 0;
    if (A < 1e-18 || D < 0) return null;
    const t = (-B - Math.sqrt(D)) / (2 * A);
    return t >= 0 && t <= 1 ? t : null;
  }
  function interceptTime(origin, target, velocity, speed) {
    if (!(speed > 0)) return 0;
    const p = sub(target, origin),
      a = dot(velocity, velocity) - speed * speed,
      b = 2 * dot(p, velocity),
      c = dot(p, p),
      disc = b * b - 4 * a * c;
    let t = Infinity;
    if (c < 1e-16) return 0;
    if (Math.abs(a) < 1e-10) t = b < 0 ? -c / b : Infinity;
    else if (disc >= 0) {
      const ts = [
        (-b - Math.sqrt(disc)) / (2 * a),
        (-b + Math.sqrt(disc)) / (2 * a),
      ].filter((x) => x > 0);
      if (ts.length) t = Math.min(...ts);
    }
    return t;
  }
  function intercept(origin, target, velocity, speed) {
    const t=interceptTime(origin,target,velocity,speed);
    return add(target, mul(velocity, Number.isFinite(t)?Math.min(t,8):0));
  }
  class Combat {
    constructor(world, flight) {
      this.world = world;
      this.flight = flight;
      flight.combat = this;
      this.time = 0;
      this.weapon = "kinetic";
      this.groundWeapon = "rifle";
      this.ammo = Object.fromEntries(
        Object.entries(WEAPONS).map(([k, w]) => [
          k,
          { mag: w.mag, reserve: w.reserve },
        ]),
      );
      this.cooldown = 0;
      this.reloadTime = 0;
      this.heat = 0;
      this.overheated = false;
      this.capacitor = 100;
      this.shield = 100;
      this.suit = 100;
      this.lastDamage = -100;
      this.armed = false;
      this.trigger = false;
      this.aiming = false;
      this.aimBlend = 0;
      this.nightVision = false;
      this.flashlight = false;
      this.lowLight = false;
      this.lock = 0;
      this.targetId = null;
      this.enemies = [];
      this.projectiles = [];
      this.effects = [];
      this.remotes = new Map();
      this.serial = 0;
      this.effectSerial = 0;
      this.effectSession = Date.now().toString(36)+Math.random().toString(36).slice(2,7);
      this.kills = 0;
      this.hitTime = -10;
      this.dead = false;
      this.radarRange = 3;
      this.mission = "standby";
      this.authority = true;
      this.message = "WEAPONS SAFE";
      this.recoil = 0;
      this.recoilPitch = 0;
      this.recoilYaw = 0;
      this.recoilVelocity = [0, 0];
      this.fired = 0;
      this.net = null;
    }
    get key() {
      return this.systems?.seated?.startsWith('turret') ? 'laser' :
        (this.flight.walking||this.flight.bridgeWalk) ? this.groundWeapon : this.weapon;
    }
    get spec() {
      return WEAPONS[this.key];
    }
    get target() {
      return (
        this.enemies.find((x) => x.id === this.targetId && x.hull > 0) || null
      );
    }
    selectWeapon(key) {
      if (!WEAPONS[key]) return false;
      const ground = ["rifle", "sidearm"].includes(key);
      if (ground) this.groundWeapon = key;
      else this.weapon = key;
      this.reloadTime = 0;
      this.lock = 0;
      this.aimBlend = 0;
      return true;
    }
    setArmed(active) {
      this.trigger=false;
      if(!active){this.armed=false;this.aiming=false;this.message='WEAPONS SAFE';return false;}
      if(this.dead){this.armed=false;this.message='FIRE CONTROL DISABLED';return false;}
      const f=this.flight,personal=(f.walking||f.bridgeWalk)&&!this.systems?.seated?.startsWith('turret');
      if(!personal&&this.systems&&!this.systems.setMode('SCM')){this.armed=false;this.message='HYPER TRANSIT · ARM AFTER ARRIVAL';return false;}
      this.armed=true;if(f.drive)f.drive.instruments=false;
      f.message=this.message=personal?'WEAPON READY':'COMBAT MODE · WEAPONS READY';return true;
    }
    get fireStatus() {
      const f=this.flight,personal=(f.walking||f.bridgeWalk)&&!this.systems?.seated?.startsWith('turret');
      if(this.dead)return 'FIRE CONTROL DISABLED';
      if(!this.armed)return 'SAFE · Y TO ARM';
      if(!personal&&this.systems?.mode==='NAV')return 'NAV · Y TO ARM';
      if(!personal&&this.systems?.factor('weapons')<.06)return 'WEAPON BUS OFFLINE';
      if(!personal&&f.drive?.instruments)return 'Z · RETURN TO FLIGHT';
      if(this.reloadTime>0)return 'RELOADING';if(this.overheated)return 'COOLING';
      if(this.key==='laser'&&this.capacitor<12)return 'CAPACITOR CHARGING';
      if(this.key!=='laser'&&this.ammo[this.key].mag<=0)return 'EMPTY · R TO RELOAD';
      if(this.key==='missile'&&(!this.target||this.lock<1))return this.target?'SEEKER '+Math.round(this.lock*100)+'%':'C · SELECT MISSILE TARGET';
      return 'READY · LEFT MOUSE TO FIRE';
    }
    setAim(active) {
      this.aiming = !!active && (this.flight.walking || this.flight.bridgeWalk) && this.armed && this.key==='rifle' && !this.dead;
      return this.aiming;
    }
    toggleNightVision() {
      if (!this.flight.walking && !this.flight.bridgeWalk) return false;
      this.nightVision = !this.nightVision;
      this.updateVision();
      this.message = this.nightVision ? 'NIGHT VISION · FLASHLIGHT OFF' : 'NIGHT VISION OFF · AUTO LIGHT';
      return this.nightVision;
    }
    updateVision() {
      const f=this.flight, foot=f.walking||f.bridgeWalk;
      const p=f.renderPose().position,b=this.world.nearest(p).body;
      const sun=unit(sub(b.orbit?.star||add(p,mul(C.SUN,1e8)),p));
      const elevation=dot(unit(sub(p,b.center)),sun);
      this.illumination=f.bridgeWalk?.25:clamp((elevation+.07)/.25,0,1);
      // Hysteresis prevents flicker while walking across the terminator.
      this.lowLight=this.illumination<(this.lowLight?.24:.14);
      this.visionActive=!!(foot&&this.nightVision&&!this.dead);
      this.flashlight=!!(foot&&this.lowLight&&!this.visionActive&&!this.dead);
    }
    origin() {
      const f = this.flight;
      return (f.walking||f.bridgeWalk) ? f.renderPose().position : f.vehicle.position;
    }
    aim() {
      return (this.flight.walking||this.flight.bridgeWalk)
        ? this.flight.renderPose().forward
        : this.recoilPose(this.flight.vehicle).forward;
    }
    recoilPose(pose) {
      let forward = C.rotate(pose.forward, pose.up, this.recoilYaw),
        right = unit(cross(forward, pose.up));
      forward = C.rotate(forward, right, this.recoilPitch);
      return {...pose, forward, right, up: unit(cross(right, forward))};
    }
    kick() {
      const amount = {rifle:.012, sidearm:.022, kinetic:.0018, laser:.0006, missile:.003}[this.key];
      this.recoilPitch = Math.min(.075, this.recoilPitch + amount);
      this.recoilYaw = clamp(this.recoilYaw + Math.sin(this.fired * 2.4) * amount * .24, -.018, .018);
      this.recoilVelocity[0] += amount * 8;
      this.recoilVelocity[1] += Math.sin(this.fired * 2.4) * amount;
      this.recoil = Math.min(1.6, this.recoil + (this.key === 'sidearm' ? 1.3 : 1));
    }
    settleRecoil(dt) {
      // Analytic critically damped spring: consistent recovery at any frame rate.
      const rate = 18, decay = Math.exp(-rate * dt);
      for (const [i,key] of ['recoilPitch','recoilYaw'].entries()) {
        const x = this[key], v = this.recoilVelocity[i], c = v + rate * x;
        this[key] = (x + c * dt) * decay;
        this.recoilVelocity[i] = (v - rate * c * dt) * decay;
      }
      this.recoil *= Math.exp(-12 * dt);
    }
    get targetId() { return this._targetId; }
    set targetId(value) { if(this._targetId!==value){this.lock=0;this.lockTargetId=null;}this._targetId=value; }
    contacts() {
      return [
        ...this.enemies.filter((e) => e.hull > 0),
        ...[...this.remotes.values()].flatMap(e=>e.walking&&e.vessel?[e,{...e.vessel,id:e.id+':vessel',name:e.name+' / ship',kind:'ally',hull:e.vessel.hull??100,radius:.03}]:[e]),
      ];
    }
    visualContacts() {
      return [...this.contacts(), ...this.enemies.filter(e=>e.hull<=0&&e.death&&this.time-e.death.time<e.death.duration)];
    }
    projectileVelocity(owner='local', weapon=this.key) {
      if(weapon==='missile')return [0,0,0];
      const source=owner==='local'?this.flight:this.remotes.get(owner);
      return source?.velocity?.slice()||[0,0,0];
    }
    firingSolution(target=this.target) {
      if(!target)return null;
      const origin=this.origin(), velocity=sub(target.velocity||[0,0,0],this.projectileVelocity());
      const distance=length(sub(target.position,origin)),t=interceptTime(origin,target.position,velocity,this.spec.speed);
      const reachable=Number.isFinite(t)&&distance<=this.spec.range&&(!this.spec.speed||t<=this.spec.range/this.spec.speed);
      return {point:add(target.position,mul(velocity,Number.isFinite(t)?t:0)),time:t,reachable,distance,closing:-dot(velocity,unit(sub(target.position,origin)))*1000};
    }
    isHostile(e){return e.faction?(this.society?.reputation[e.faction]??-100)<-20:!["ally","pilot"].includes(e.kind);}
    cycleTarget() {
      const live = this.enemies
        .filter((e) => e.hull > 0 && this.isHostile(e))
        .sort(
          (a, b) =>
            length(sub(a.position, this.origin())) -
            length(sub(b.position, this.origin())),
        );
      if (!live.length) {
        this.targetId = null;
        return;
      }
      const at = live.findIndex((e) => e.id === this.targetId);
      this.targetId = live[(at + 1) % live.length].id;
      this.lock = 0;
    }
    sortie(kind = "space") {
      if (!this.authority) {
        this.message = "The host starts a shared sortie.";
        return false;
      }
      const f = this.flight,
        body = f.nearest().body;
      if (kind === "space") {
        f.place(body, "orbit");
        f.cameraMode = "cockpit";
        f.viewYaw = f.viewPitch = 0;
      } else {
        f.place(body, "surface");
        f.walking = true;
        f.grounded = true;
        f.vehicle.state = "landed";
        f.position = add(f.position, mul(f.right, 0.018));
        const support = f.supportAt(f.position);
        if (support) f.position = add(support.point, mul(support.up, 0.00175));
      }
      const origin = this.origin(),
        forward = this.aim(),
        right = f.right,
        up = f.up;
      this.enemies = Array.from(
        { length: kind === "space" ? 5 : 4 },
        (_, i) => {
          const distance =
            kind === "space" ? 0.38 + i * 0.17 : 0.026 + i * 0.012;
          const side =
            (i === 0 ? 0 : i % 2 ? 1 : -1) *
            (kind === "space" ? 0.11 : 0.008) *
            (Math.floor(i / 2) + 1);
          let position = add(
            add(origin, mul(forward, distance)),
            mul(right, side),
          );
          if (kind === "ground") {
            const support = f.supportAt(position);
            if (support) position = add(support.point, mul(support.up, 0.001));
          }
          return {
            id: "drone-" + ++this.serial,
            name:
              kind === "space"
                ? "RAIDER " + String(i + 1).padStart(2, "0")
                : "SENTRY " + String(i + 1).padStart(2, "0"),
            position,
            anchor: position.slice(),
            forward: mul(forward, -1),
            up: up.slice(),
            velocity: [0, 0, 0],
            hull: kind === "space" ? 100 : 65,
            shield: kind === "space" ? 40 : 0,
            radius: kind === "space" ? 0.014 : 0.0015,
            kind: kind === "space" ? "ship" : "sentry",
            phase: i * 1.7,
            fireIn: 4 + i * 0.8,
          };
        },
      );
      this.projectiles = [];
      this.effects = [];
      this.dead = false;
      this.setArmed(true);
      this.shield = this.suit = 100;
      f.ship.hull = 100;
      this.cooldown = this.reloadTime = 0;
      this.mission = kind;
      this.cycleTarget();
      this.message = "LIVE SORTIE · HOSTILE CONTACTS";
      this.net?.broadcastMission();
      return true;
    }
    reload() {
      const a = this.ammo[this.key],
        w = this.spec;
      if (
        this.key === "laser" ||
        this.reloadTime > 0 ||
        a.mag >= w.mag ||
        a.reserve <= 0
      )
        return false;
      this.reloadKey = this.key;
      this.reloadTime = w.reload;
      this.message = "RELOADING";
      return true;
    }
    service() {
      const f = this.flight;
      if (!["landed", "docked"].includes(f.vehicle.state) || f.walking) {
        this.message = "Land or dock to rearm and repair.";
        return false;
      }
      for (const [k, w] of Object.entries(WEAPONS))
        this.ammo[k] = { mag: w.mag, reserve: w.reserve };
      this.shield = this.suit = 100;
      f.ship.hull = 100;
      this.heat = 0;
      this.overheated = false;
      this.capacitor = 100;
      this.cooldown = this.reloadTime = 0;
      this.message = "SERVICE COMPLETE";
      return true;
    }
    damage(entity, amount) {
      const absorb = Math.min(entity.shield || 0, amount);
      entity.shield = (entity.shield || 0) - absorb;
      entity.hull = Math.max(0, entity.hull - (amount - absorb));
    }
    hurt(amount) {
      if (this.dead) return;
      this.lastDamage = this.time;
      if (this.flight.walking) this.suit = Math.max(0, this.suit - amount);
      else {
        const absorbed = Math.min(this.shield, amount);
        this.shield -= absorbed;
        this.flight.ship.hull = Math.max(
          0,
          this.flight.ship.hull - amount + absorbed,
        );
      }
      if (this.suit <= 0 || this.flight.ship.hull <= 0) {
        this.dead = true;
        this.armed = false;
        this.trigger = false;
        this.message = "VESSEL DISABLED · RECOVER TO PORT";
      }
    }
    recover() {
      const f = this.flight;
      f.place(f.nearest().body, "surface");
      f.ship.hull = 100;
      this.suit = this.shield = 100;
      this.dead = false;
      this.armed = false;
      this.service();
      this.mission = "standby";
      this.message = "RECOVERED · FLIGHT SYSTEMS NOMINAL";
      this.projectiles = [];
      this.enemies = [];
      this.net?.send({ type: "recover" });
    }
    fire() {
      const w = this.spec,
        a = this.ammo[this.key],
        f = this.flight;
      if (
        !this.armed ||
        this.dead ||
        this.reloadTime > 0 ||
        this.cooldown > 0 ||
        this.overheated ||
        (f.drive?.instruments && !(f.walking || f.bridgeWalk))
      )
        return false;
      if (this.key === "missile" && (!this.target || this.lock < 1)) {
        this.message = "Hold target inside the lock cone.";
        return false;
      }
      if (this.key === "laser" && this.capacitor < 12) {
        this.message = "CAPACITOR CHARGING";
        return false;
      }
      if (this.key !== "laser" && a.mag <= 0) {
        this.reload();
        return false;
      }
      if (this.key === "laser") this.capacitor -= 12;
      else a.mag--;
      this.cooldown = w.interval;
      this.heat = clamp(this.heat + w.heat, 0, 1);
      if (this.heat >= 1) this.overheated = true;
      this.fired++;
      const muzzle = this.muzzlePose?.(), dir = muzzle?.direction || this.aim().slice(),
        position = muzzle?.position || add(
          this.origin(),
          mul(dir, (f.walking||f.bridgeWalk) ? 0.00004 : f.craft.dimensions[0] * 0.00055),
        );
      const event = {
        type: "fire",
        weapon: this.key,
        position,
        direction: dir,
        targetId: this.targetId,
        sequence: this.fired,
      };
      this.lastShot = {...event,time:this.time};
      if (this.authority) this.spawnShot(event, "local");
      else this.net?.send(event);
      this.kick();
      this.onFire?.(this.key);
      return true;
    }
    spawnShot(event, owner) {
      const w = WEAPONS[event.weapon];
      if (!w) return;
      const p = {
        id: ++this.serial,
        owner,
        weapon: event.weapon,
        position: event.position.slice(),
        previous: event.position.slice(),
        direction: unit(event.direction),
        velocity: add(mul(unit(event.direction), w.speed),this.projectileVelocity(owner,event.weapon)),
        damage: w.damage,
        ttl: w.speed ? w.range / w.speed : 0.12,
        targetId: event.targetId,
        guidance:event.weapon==='missile'?'infrared':null,age:0,motorTime:event.weapon==='missile'?8:0,
        color: w.color,
      };
      if (!w.speed) {
        const end = add(p.position, mul(p.direction, w.range));
        const hit = this.firstHit(p.position, end, owner);
        const finish = hit
          ? add(p.position, mul(sub(end, p.position), hit.t))
          : end;
        this.effects.push({
          id: this.effectSession + ":" + (++this.effectSerial),
          a: p.position.slice(),
          b: finish,
          hit: Boolean(hit),
          color: 1, kind:'laser',weapon:event.weapon,
          ttl: 0.12,
          life: 0.12,
        });
        if (hit) this.applyHit(hit, owner, w.damage, p.direction);
      } else this.projectiles.push(p);
      this.projectiles = this.projectiles.slice(-64);
    }
    heatSignature(e){if(!e||e.hull<=0)return 0;const thrust=e.vessel?.thrust??e.thrust??0,speed=length(e.velocity||[0,0,0]);return clamp(e.heatSignature??(.22+thrust*.9+speed*.8+(e.kind==='ship'?.2:.1)),0,2);}
    seekHeat(p){
      let best=null,score=0;for(const e of this.enemies){if(e.hull<=0||e.civilian)continue;const delta=sub(e.position,p.position),distance=length(delta),align=dot(unit(delta),p.direction),heat=this.heatSignature(e);if(distance>WEAPONS.missile.range||align<Math.cos(Math.PI*.23)||heat<.1)continue;
        const body=this.world.nearest(p.position).body,hit=C.raySphere(sub(p.position,body.center),unit(delta),body.radius);if(hit?.[0]>0&&hit[0]<distance)continue;
        const signal=heat*(e.id===p.targetId?1.5:1)/(distance*distance+.015);if(signal>score){score=signal;best=e;}}
      return best;
    }
    firstHit(a, b, owner) {
      let best = null;
      let candidates =
        owner === "hostile"
          ? [
              {
                id: "local",
                position: this.origin(),
                radius: this.flight.walking ? 0.0008 : 0.011,
                local: true,
              },
              ...Array.from(this.remotes.values()).map((x) => ({
                ...x,
                remote: true,
              })),
            ]
          : this.enemies.filter((e) => e.hull > 0);
      if(owner?.startsWith('npc:'))candidates=[...this.enemies.filter(e=>e.hull>0&&e.id!==owner.slice(4)),{id:'local',position:this.origin(),radius:this.flight.walking?.0008:.011,local:true},...[...this.remotes.values()].map(e=>({...e,remote:true}))];
      if(owner!=='hostile'&&!owner?.startsWith('npc:')){const n=this.world.nearest(a);if(n.altitude<.4&&this.world.streamFauna)candidates=candidates.concat(this.world.streamFauna(a,n.body).filter(e=>!e.dead));}
      for (const e of candidates) {
        const hits=e.humanoid?[-.00055,0,.00055].map(h=>segmentHit(a,b,add(e.position,mul(e.up,h)),.00032)).filter(v=>v!==null):[];
        if(e.wildlife){const up=unit(sub(e.position,this.world.byId(e.bodyId).center)),ff=this.world.faunaFrame,forward=add(mul(ff.right,Math.sin(e.yaw)),mul(ff.forward,Math.cos(e.yaw))),size=e.size;
          const volumes=C.Biology?.hitVolumes(e.family,e.phenotype)||[[[1,0,.34],[1.65,.75,.19]],[[.58,0,.25],[.85,.65,.19]],[[.6,0,.24],[1.1,.45,.11]],[[.25,0,.28]],[[.25,0,.28],[.3,.65,.18]]][e.family];
          for(const [height,along,radius]of volumes){const t=segmentHit(a,b,add(e.position,add(mul(up,height*size),mul(forward,along*size))),radius*size);if(t!==null&&(!best||t<best.t))best={entity:e,t};}continue;
        }
        const t = e.humanoid?(hits.length?Math.min(...hits):null):segmentHit(a, b, e.position, e.radius || 0.011);
        if (t !== null && (!best || t < best.t)) best = { entity: e, t };
      }
      // Walls, terrain and station hulls stop fire before a target behind them.
      const stop = best ? add(a, mul(sub(b, a), best.t)) : b,
        near = this.world.nearest(a),
        station = this.world.nearestStation(a);
      if (near.altitude < 2 || station.distance < 2.5) {
        const trace = this.world.move(
          a,
          stop,
          this.world.active(a),
          0.00008,
          false,
        );
        if (trace.hit) {
          const t =
            length(sub(trace.position, a)) / Math.max(length(sub(b, a)), 1e-9);
          if (!best || t < best.t - 0.000001)
            best = {
              entity: { environment: true, position: trace.position },
              t,
            };
        }
      }
      const city = C.CityWorld?.trace(this.world,near.body,a,b);
      if(city&&(!best||city.t<best.t))best={...city,entity:{environment:true,material:city.collider.kind,position:add(a,mul(sub(b,a),city.t)),cityHit:city}};
      const rendered=owner==='local'?this.sceneTrace?.(a,b):null;
      if(rendered&&(!best||rendered.t<best.t))best={...rendered,entity:{environment:true,position:rendered.position,material:rendered.material}};
      return best;
    }
    applyHit(hit, owner, amount, direction=null) {
      const e = hit.entity;
      if(e.wildlife){const eco=this.world.ecosystem(this.world.byId(e.bodyId));eco.wildlife??={};const state=eco.wildlife[e.id]??{hull:60};state.hull=Math.max(0,state.hull-amount);state.time=eco.age;if(state.hull===0){const b=this.world.byId(e.bodyId);state.bodyPosition=C.bodyLocal?C.bodyLocal(b,sub(e.position,b.center)):sub(e.position,b.center);}eco.wildlife[e.id]=state;const ids=Object.keys(eco.wildlife);if(ids.length>512)delete eco.wildlife[ids[0]];this.hitTime=this.time;this.net?.notifyHit(owner,e.id);this.message=state.hull?"WILDLIFE HIT · "+state.hull+" integrity":"WILDLIFE DOWN";return;}
      if (e.environment) {
        this.impactTime=this.time;this.lastImpact={position:e.position,material:e.material||'surface'};
        const h=e.cityHit;if(h?.collider.kind==='machine'){const sim=C.CityWorld.machinery(h.city,h.building);sim.damage(h.collider.id.replace('machine-',''),amount);}
        return;
      }
      if (e.local) {
        this.hurt(amount);
        return;
      }
      if (e.remote) {
        this.net?.damagePeer(e.id, amount);
        return;
      }
      if(e.hull<=0)return;
      this.damage(e, amount);
      this.society?.onHit(e,owner);
      this.hitTime = this.time;
      this.net?.notifyHit(owner, e.id);
      if (e.hull <= 0) {
        const up=unit(e.up||this.flight.up),incoming=unit(direction||mul(e.forward||this.flight.forward,-1));
        const tangent=unit(cross(up,Math.abs(up[1])<.9?[0,1,0]:[1,0,0]));
        const fall=unit(sub(incoming,mul(up,dot(incoming,up))),unit(sub(e.forward||this.flight.forward,mul(up,dot(e.forward||this.flight.forward,up))),tangent));
        e.death={time:this.time,duration:e.kind==='ship'?0:12,direction:fall,up:up.slice()};
        e.velocity=[0,0,0];e.fireIn=Infinity;
        this.kills++;
        this.effects.push({
          id: this.effectSession + ":" + (++this.effectSerial),
          a: e.position.slice(),
          b: e.position.slice(),
          color: 3, kind:e.kind==='ship'?'explosion':'dust',weapon:e.kind==='ship'?'reactor':'kinetic',
          radius: e.kind==='ship'?Math.max(8,(e.radius||.014)*1000):1,
          ttl: e.kind==='ship'?2.4:.8,
          life: e.kind==='ship'?2.4:.8,
        });
        this.message = e.name + " DESTROYED";
        if (e.id === this.targetId) this.cycleTarget();
      }
    }
    update(dt) {
      this.time += dt;
      if (!(this.flight.walking||this.flight.bridgeWalk) || !this.armed || this.dead) this.aiming=false;
      const aimTarget=this.aiming&&this.reloadTime<=0?1:0;
      this.aimBlend=C.clamp(this.aimBlend+(aimTarget?1:-1)*dt/.22,0,1);
      this.updateVision();
      this.society?.update(dt);
      this.cooldown = Math.max(0, this.cooldown - dt);
      this.settleRecoil(dt);
      this.heat = Math.max(0, this.heat - dt * 0.13 * (this.systems?.factor("cooler") ?? 1));
      if (this.heat < 0.35) this.overheated = false;
      this.capacitor = Math.min(100, this.capacitor + dt * 17 * (this.systems?.factor("weapons") ?? 1));
      if (this.time - this.lastDamage > 6 && !this.dead)
        this.shield = Math.min(100, this.shield + dt * 5 * (this.systems ? (this.systems.mode === "SCM" ? this.systems.factor("shields") : 0) : 1));
      if (this.reloadTime > 0) {
        this.reloadTime -= dt;
        if (this.reloadTime <= 0) {
          const a = this.ammo[this.reloadKey],
            take = Math.min(WEAPONS[this.reloadKey].mag - a.mag, a.reserve);
          a.mag += take;
          a.reserve -= take;
          this.message = "WEAPON READY";
        }
      }
      const t = this.target;
      if(this.lockTargetId!==t?.id){this.lock=0;this.lockTargetId=t?.id||null;}
      if (t) {
        const aim = dot(unit(sub(t.position, this.origin())), this.aim()),
          dist = length(sub(t.position, this.origin()));
        this.lock = clamp(
          this.lock +
            dt * (aim > 0.97 && dist < WEAPONS.missile.range && this.heatSignature(t)>.1 ? 0.65 : -1.5),
          0,
          1,
        );
      } else this.lock = 0;
      if (this.trigger || this.controllerTrigger) this.fire();
      if (this.authority) {
        const f = this.flight;
        for (const e of this.enemies) {
          if (e.hull <= 0 || e.squad) continue;
          const previous = e.position.slice();
          if (e.kind === "ship") {
            const offset = add(
              mul(f.right, Math.sin(this.time * 0.19 + e.phase) * 0.065),
              mul(e.up, Math.cos(this.time * 0.23 + e.phase) * 0.018),
            );
            e.position = add(e.anchor, offset);
            e.velocity = mul(sub(e.position, previous), 1 / Math.max(dt, 1e-6));
            e.forward = unit(sub(this.origin(), e.position));
          }
          e.fireIn -= dt;
          const distance = length(sub(this.origin(), e.position));
          if (
            e.fireIn <= 0 &&
            distance < (e.kind === "ship" ? 1.8 : 0.15) &&
            !this.dead
          ) {
            e.fireIn = e.kind === "ship" ? 2.8 : 2.0;
            const direction = unit(sub(this.origin(), e.position));
            this.projectiles.push({
              id: ++this.serial,
              owner: "hostile",
              weapon: "kinetic",
              position: add(e.position, mul(direction, e.radius * 1.2)),
              previous: e.position.slice(),
              direction,
              velocity: mul(direction, e.kind === "ship" ? 0.23 : 0.055),
              damage: e.kind === "ship" ? 7 : 5,
              ttl: 8,
              color: 4,
            });
          }
        }
        for (const p of this.projectiles) {
          p.previous = p.position.slice();
          p.age=(p.age||0)+dt;
          if (p.weapon === "missile") {
            p.motorTime=Math.max(0,(p.motorTime??8)-dt);p.guidance='infrared';
            const target=this.seekHeat(p);p.seekerLocked=!!target;
            if(target){p.targetId=target.id;const velocity=target.velocity||[0,0,0],lead=clamp(length(sub(target.position,p.position))/WEAPONS.missile.speed,0,3),desired=unit(sub(add(target.position,mul(velocity,lead)),p.position)),angle=Math.acos(clamp(dot(p.direction,desired),-1,1));p.direction=angle>.00001?C.slerp(p.direction,desired,Math.min(1,dt*1.4/angle)):desired;}
            p.velocity=mul(p.direction,WEAPONS.missile.speed);
          }
          p.position = add(p.position, mul(p.velocity, dt));
          p.ttl -= dt;
          const hit = this.firstHit(p.previous, p.position, p.owner);
          if (hit) {
            this.applyHit(hit, p.owner, p.damage, unit(p.velocity,p.direction));
            this.effects.push({
          id: this.effectSession + ":" + (++this.effectSerial),
              a: add(p.previous, mul(sub(p.position,p.previous),hit.t)),
              b: add(p.previous, mul(sub(p.position,p.previous),hit.t)),
              color: 3,kind:p.weapon==='missile'?'explosion':'impact',weapon:p.weapon,normal:hit.normal||null,
              ttl:p.weapon==='missile'?.65:.18,
              life:p.weapon==='missile'?.65:.18,
            });
            p.ttl = 0;
          }
        }
        if (
          this.enemies.length &&
          this.enemies.every((e) => e.hull <= 0) &&
          this.mission !== "complete"
        ) {
          this.mission = "complete";
          this.message = "SECTOR CLEAR · RETURN TO PORT";
        }
      } else {
        for (const p of this.projectiles) {
          p.previous = p.position.slice();p.age=(p.age||0)+dt;p.motorTime=Math.max(0,(p.motorTime||0)-dt);
          p.position = add(p.position, mul(p.velocity, dt));
          p.ttl -= dt;
        }
      }
      this.projectiles = this.projectiles.filter((p) => p.ttl > 0).slice(-64);
      for (const e of this.effects) e.ttl -= dt;
      this.effects = this.effects.filter((e) => e.ttl > 0).slice(-32);
    }
    snapshot() {
      const body = this.flight.nearest().body,
        eco = this.world.ecosystem(body);
      return {
        society: this.society?.snapshot(),
        ecology: {
          bodyId: body.id,
          age: eco.age,
          populations: eco.populations,
          agents: eco.agents,
          wildlife:eco.wildlife||{},
        },
        enemies: this.enemies,
        projectiles: this.projectiles,
        effects: this.effects,
        kills: this.kills,
        mission: this.mission,
        time: this.time,
      };
    }
    acceptSnapshot(s) {
      this.society?.acceptSnapshot(s.society);
      if (s.ecology) {
        const body = this.world.byId(s.ecology.bodyId);
        if (body) {
          const eco = this.world.ecosystem(body);
          eco.age = s.ecology.age;
          if(s.ecology.wildlife)eco.wildlife=JSON.parse(JSON.stringify(s.ecology.wildlife));
          eco.populations = s.ecology.populations;
          eco.agents = s.ecology.agents;
        }
      }
      this.enemies = s.enemies.map(e=>e.death?{...e,death:{...e.death,time:this.time-Math.max(0,(s.time||0)-e.death.time)}}:e);
      this.projectiles = s.projectiles;
      this.effects = s.effects;
      this.kills = s.kills;
      this.mission = s.mission;
      if (!this.target) this.cycleTarget();
    }
  }
  return { Combat, WEAPONS, segmentHit, intercept, interceptTime };
});
