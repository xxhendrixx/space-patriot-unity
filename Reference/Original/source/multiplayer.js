/* PeerJS signaling + real RTCDataChannels. Bounded star topology, host-owned combat. */
(function (root) {
  "use strict";
  const C = root.LongwayCore,
    PROTOCOL = 11,
    MAX_CREW = 8;
  const finiteVector = (v, max = 1e15) =>
    Array.isArray(v) &&
    v.length === 3 &&
    v.every((n) => Number.isFinite(n) && Math.abs(n) < max);
  const validState = (s) =>
    s &&
    typeof s === "object" &&
    finiteVector(s.position) &&
    finiteVector(s.forward, 2) &&
    finiteVector(s.up, 2) &&
    finiteVector(s.velocity, 1e7) &&
    typeof s.craftId === "string" &&
    s.craftId.length < 80 &&
    typeof s.name === "string" &&
    s.name.length <= 24 &&
    Number.isFinite(s.hull) &&
    s.hull >= 0 &&
    s.hull <= 100 &&
    (!s.vessel || (finiteVector(s.vessel.position)&&finiteVector(s.vessel.forward,2)&&finiteVector(s.vessel.up,2)&&finiteVector(s.vessel.velocity,1e7)&&C.CRAFTS.some(c=>c.id===s.vessel.craftId))) &&
    (!s.interior || (finiteVector(s.interior.position,200)&&typeof s.interior.vesselId==='string'&&[null,'engineering','turret-dorsal'].includes(s.interior.seat)));
  class CrewLink {
    constructor(app) {
      this.app = app;
      this.combat = app.combat;
      if(app.city)app.city.net=this;
      this.combat.net = this;
      this.peer = null;
      this.links = new Map();
      this.players = new Map();
      this.status = "OFFLINE";
      this.role = "solo";
      this.room = "";
      this.name = "PILOT";
      this.lastTick = 0;
      this.lastReceive = 0;
      this.rtt = 0;
      this.sent = 0;
      this.received = 0;
      this.seq = 0;
      this.generation = 0;
      this.errors = [];
      this.lastShots = new Map();
      this.joinTimer = null;
      this.enabled = false;
      this.timer = setInterval(() => {
        if (this.enabled) this.tick(performance.now());
      }, 100);
    }
    options() {
      const q = new URLSearchParams(location.search);
      const configured = root.BLOX_RTC_CONFIG || {};
      const local = q.get("signaling") === "local";
      return {
        ...(local
          ? {
              host: location.hostname,
              port: 9000,
              path: "/blox",
              secure: false,
            }
          : {}),
        debug: 0,
        config: {
          iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
          ...configured.config,
        },
        ...configured,
      };
    }
    setup(id) {
      this.leave(false);
      const gen = this.generation;
      this.enabled = true;
      this.status = "CONNECTING";
      const peer = (this.peer = new Peer(id, this.options()));
      peer.on("error", (e) => {
        if (gen !== this.generation) return;
        this.status = "CONNECTION FAILED";
        this.errors.push(String(e.type || e.message));
        this.app.toast(
          "Crew link: " + e.type + ". Check room code and network settings.",
        );
        if (!this.links.size) this.combat.authority = true;
      });
      peer.on("disconnected", () => {
        if (gen === this.generation)
          this.status = this.links.size
            ? "SIGNAL LOST · DATA ACTIVE"
            : "SIGNAL DISCONNECTED";
      });
      peer.on("connection", (conn) => {
        if (this.role !== "host" || this.links.size >= MAX_CREW - 1) {
          conn.close();
          return;
        }
        this.attach(conn, gen);
      });
      return { peer, gen };
    }
    host(name = "PILOT") {
      const code = Array.from(
        crypto.getRandomValues(new Uint8Array(6)),
        (v) => "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"[v % 32],
      ).join("");
      const { peer, gen } = this.setup("blox5-" + code);
      this.role = "host";
      this.room = code;
      this.name = String(name).trim().slice(0, 24) || "PILOT";
      this.combat.authority = true;
      peer.on("open", () => {
        if (gen !== this.generation) return;
        this.status = "HOSTING";
        this.app.toast("Crew room " + code + " is open.");
      });
      return code;
    }
    join(code, name = "PILOT") {
      code = String(code).trim().toUpperCase();
      if (!/^[A-HJ-NP-Z2-9]{6}$/.test(code)) {
        this.app.toast("Enter the six-character crew code.");
        return false;
      }
      const { peer, gen } = this.setup();
      this.role = "guest";
      this.room = code;
      this.name = String(name).trim().slice(0, 24) || "PILOT";
      peer.on("open", () => {
        if (gen !== this.generation) return;
        const c = peer.connect("blox5-" + code, {
          reliable: true,
          serialization: "binary",
          metadata: { protocol: PROTOCOL },
        });
        this.attach(c, gen);
      });
      this.joinTimer = setTimeout(() => {
        if (gen === this.generation && this.status !== "CONNECTED") {
          this.leave(false);
          this.status = "ROOM UNREACHABLE";
          this.app.toast(
            "Room unreachable. The host must be online; restrictive networks may need a TURN server.",
          );
        }
      }, 15000);
      return true;
    }
    attach(conn, gen) {
      conn.on("open", () => {
        if (gen !== this.generation) {
          conn.close();
          return;
        }
        this.links.set(conn.peer, conn);
        conn.lastSeen = performance.now();
        conn.lastSeq = -1;
        this.status = this.role === "host" ? "HOSTING" : "CONNECTED";
        if (this.role === "guest") {
          this.combat.authority = false;
          this.send({ type: "hello", protocol: PROTOCOL, state: this.state() });
        } else
          this.transmit(conn, {
            type: "welcome",
            protocol: PROTOCOL,
            state: this.state(),
            combat: this.combat.snapshot(),
            city: this.app.city?.snapshot(),
            celestial: this.app.celestial?.snapshot(),
            shipboard: this.app.shipboard?.snapshot(),
            economy: this.app.economy?.snapshot(),
            campaign:this.app.campaign?.snapshot(),
          });
        clearTimeout(this.joinTimer);
      });
      conn.on("data", (p) => {
        if (gen === this.generation) this.receive(conn, p);
      });
      conn.on("close", () => {
        if (gen !== this.generation) return;
        this.links.delete(conn.peer);
        this.players.delete(conn.peer);
        this.combat.remotes.delete(conn.peer);
        if (this.role === "guest") {
          this.combat.authority = true;
          this.combat.trigger = false;
          this.role = "solo";
          this.status = "HOST LEFT · SOLO";
          this.combat.remotes.clear();
          this.players.clear();
        } else this.status = "HOSTING";
      });
      conn.on("error", (error) => {
        this.errors.push(String(error.type||error.message||error));
        this.status = "LINK ERROR";
        conn.close();
      });
    }
    state() {
      const f = this.app.flight;
      return {
        name: this.name,
        position: (f.bridgeWalk?f.renderPose().position:f.walking ? f.position : f.vehicle.position).slice(),
        forward: (f.walking ? f.forward : f.vehicle.forward).slice(),
        up: f.up.slice(),
        velocity: f.velocity.slice(),
        craftId: f.craft.id,
        walking: f.walking || !!f.bridgeWalk,
        vessel: this.app.shipboard?.vessel(),
        interior: f.bridgeWalk?{vesselId:this.app.shipboard?.aboard||this.peer?.id,position:this.app.systems.bridgePosition.slice(),seat:this.app.systems.seated||null}:null,
        hull: f.ship.hull,
        shield: this.combat.shield,
        suit: this.combat.suit,
        radius: f.walking ? 0.0008 : Math.max(...f.craft.dimensions)*0.00045,
      };
    }
    transmit(conn, p) {
      if (!conn.open || conn.dataChannel?.bufferedAmount > 131072) return;
      conn.send({ ...p, v: PROTOCOL, seq: ++this.seq });
      this.sent++;
    }
    send(p) {
      for (const c of this.links.values()) this.transmit(c, p);
    }
    receive(conn, p) {
      if (
        !p ||
        typeof p !== "object" ||
        p.v !== PROTOCOL ||
        !Number.isSafeInteger(p.seq) ||
        p.seq <= conn.lastSeq
      )
        return;
      conn.lastSeq = p.seq;
      conn.lastSeen = performance.now();
      this.received++;
      if (p.type === "ping") {
        this.transmit(conn, { type: "pong", at: p.at });
        return;
      }
      if (p.type === "pong") {
        if (Number.isFinite(p.at))
          this.rtt = Math.max(0, performance.now() - p.at);
        return;
      }
      if (this.role === "host") {
        if ((p.type === "hello" || p.type === "state") && validState(p.state)) {
          this.players.set(conn.peer, {
            ...p.state,
            id: conn.peer,
            updated: performance.now(),
          });
          this.combat.remotes.set(conn.peer, {
            ...p.state,
            id: conn.peer,
            kind: p.state.walking ? "pilot" : "ally",
          });
        }
        if (p.type === "fire") this.acceptFire(conn, p);
        if (p.type === "shipboard") {const ok=this.app.shipboard?.acceptRequest(conn.peer,p);if(Number.isSafeInteger(p.requestId))this.transmit(conn,{type:'shipboard-result',requestId:p.requestId,ok:!!ok,shipboard:this.app.shipboard?.snapshot()});}
        if (p.type === 'economy' && p.action==='trade') this.app.economy?.trade(p.bodyId,p.good,p.side,p.quantity,conn.peer);
        if (p.type === "machine") this.app.city?.acceptMachine(p,this.players.get(conn.peer));
        if (p.type === "lift") this.app.city?.acceptRequest(p,this.players.get(conn.peer));
        if (p.type === "recover") {
          const player = this.players.get(conn.peer);
          if (player) {
            player.hull = 100;
            player.shield = 100;
            player.suit = 100;
          }
        }
      } else if (conn.peer === "blox5-" + this.room) {
        if(p.type==='vessel-systems')this.app.shipboard?.applySystems(p);
        if(p.type==='shipboard-result')this.app.shipboard?.acceptResult(p);
        if(p.type==='welcome'||p.type==='snapshot')this.app.celestial?.sync(p.celestial);
        if (
          p.type === "welcome" &&
          p.protocol === PROTOCOL &&
          validState(p.state)
        ) {
          const f = this.app.flight;
          f.cancel();
          f.walking = false;
          f.vehicle.state = "flight";
          f.vehicle.gear = f.vehicle.gearTarget = 0;
          f.position = C.add(
            p.state.position,
            C.mul(C.unit(C.cross(p.state.forward, p.state.up)), 0.065),
          );
          f.vehicle.position = f.position.slice();
          f.forward = f.vehicle.forward = p.state.forward.slice();
          f.up = f.vehicle.up = p.state.up.slice();
          f.velocity = [0, 0, 0];
          f.orthogonalize();
          if (p.state.walking) {
            const right = f.right.slice();
            f.position = C.add(p.state.position, C.mul(right, 0.006));
            const support = f.supportAt(f.position);
            if (support)
              f.position = C.add(support.point, C.mul(support.up, 0.00175));
            f.walking = true;
            f.grounded = true;
            f.vehicle.state = "onfoot";
            f.vehicle.gear = f.vehicle.gearTarget = 1;
            const park = C.add(p.state.position, C.mul(right, 0.035)),
              deck = f.supportAt(park);
            f.vehicle.position = deck
              ? C.add(
                  deck.point,
                  C.mul(deck.up, f.craft.dimensions[2] * 0.00055 + 0.001),
                )
              : park;
            this.combat.radarRange = 0.15;
          }
          f.cameraMode = "cockpit";
          f.viewYaw = f.viewPitch = 0;
          this.app.start();
          this.combat.armed = true;
          this.status = "CONNECTED";
        }
        if (
          (p.type === "snapshot" || p.type === "welcome") &&
          this.validCombat(p.combat)
        ) {
          this.combat.acceptSnapshot(p.combat);
          this.app.city?.acceptSnapshot(p.city);
          this.app.economy?.acceptSnapshot(p.economy);this.app.campaign?.acceptSnapshot(p.campaign);
          if (Array.isArray(p.players)) {
            this.combat.remotes.clear();
            for (const e of p.players.slice(0, MAX_CREW))
              if (validState(e) && e.id !== this.peer.id)
                this.combat.remotes.set(e.id, {
                  ...e,
                  kind: e.walking ? "pilot" : "ally",
                });
          } else if (validState(p.state))
            this.combat.remotes.set(conn.peer, {
              ...p.state,
              id: conn.peer,
              kind: "ally",
            });
        }
        if(p.type==='welcome'||p.type==='snapshot')this.app.shipboard?.acceptSnapshot(p.shipboard);
        if (
          p.type === "damage" &&
          Number.isFinite(p.amount) &&
          p.amount > 0 &&
          p.amount <= 150
        )
          this.combat.hurt(p.amount);
        if (p.type === "hit") this.combat.hitTime = this.combat.time;
      }
    }
    validCombat(s) {
      return (
        s &&
        Number.isFinite(s.time) &&
        (!s.ecology ||
          (typeof s.ecology.bodyId === "string" &&
            Number.isFinite(s.ecology.age) &&
            Array.isArray(s.ecology.populations) &&
            s.ecology.populations.length === 4 &&
            s.ecology.populations.every(Number.isFinite) &&
            (!s.ecology.wildlife||(Object.keys(s.ecology.wildlife).length<=512&&Object.entries(s.ecology.wildlife).every(([id,v])=>id.length<140&&Number.isFinite(v?.hull)&&v.hull>=0&&v.hull<=60&&Number.isFinite(v.time)&&(!v.bodyPosition||finiteVector(v.bodyPosition))))) &&
            Array.isArray(s.ecology.agents) &&
            s.ecology.agents.length === 16 &&
            s.ecology.agents.every((a) =>
              ["x", "z", "yaw", "phase", "size", "speed", "energy"].every((k) =>
                Number.isFinite(a[k]),
              ),
            ))) &&
        Array.isArray(s.enemies) &&
        s.enemies.length <= 16 &&
        s.enemies.every(
          (e) =>
            e &&
            finiteVector(e.position) &&
            finiteVector(e.forward, 2) &&
            finiteVector(e.up, 2) &&
            finiteVector(e.velocity, 10) &&
            Number.isFinite(e.hull) &&
            (!e.death||(Number.isFinite(e.death.time)&&Number.isFinite(e.death.duration)&&e.death.duration>=0&&e.death.duration<=12&&finiteVector(e.death.direction,2)&&finiteVector(e.death.up,2))) &&
            typeof e.id === "string",
        ) &&
        Array.isArray(s.projectiles) &&
        s.projectiles.length <= 64 &&
        s.projectiles.every(
          (p) =>
            finiteVector(p.position) &&
            finiteVector(p.previous) &&
            finiteVector(p.velocity, 1e7+10) &&
            Number.isFinite(p.ttl),
        ) &&
        Array.isArray(s.effects) &&
        s.effects.length <= 32 &&
        s.effects.every(
          (e) =>
            finiteVector(e.a) && finiteVector(e.b) && Number.isFinite(e.ttl),
        )
      );
    }
    acceptFire(conn, p) {
      const s = this.players.get(conn.peer),
        w = C.WEAPONS[p.weapon], seat = this.app.shipboard?.occupants.get(conn.peer);
      if (
        !s ||
        !w ||
        !finiteVector(p.position) ||
        !finiteVector(p.direction, 2)
      )
        return;
      const norm = C.length(p.direction);
      if (
        norm < 0.95 ||
        norm > 1.05 ||
        (!seat?.seat?.startsWith('turret') && C.length(C.sub(p.position, s.position)) > 0.15)
      )
        return;
      const now = performance.now() / 1000;
      let gate = this.lastShots.get(conn.peer);
      if (!gate) {
        gate = {
          last: -1e9,
          sequence: -1,
          ammo: Object.fromEntries(
            Object.entries(C.WEAPONS).map(([k, v]) => [
              k,
              { mag: v.mag, at: now },
            ]),
          ),
        };
        this.lastShots.set(conn.peer, gate);
      }
      if (
        !Number.isSafeInteger(p.sequence) ||
        p.sequence <= gate.sequence ||
        now - gate.last < w.interval * 0.8
      )
        return;
      const a = gate.ammo[p.weapon];
      if (p.weapon !== "laser") {
        if (a.mag <= 0 && now - a.at >= w.reload) a.mag = w.mag;
        if (a.mag <= 0) return;
        a.mag--;
        a.at = now;
      } else if (now - gate.last < 0.18) return;
      if (p.weapon === "missile") {
        const t = this.combat.enemies.find(
          (e) => e.id === p.targetId && e.hull > 0,
        );
        if (
          !t ||
          C.dot(C.unit(C.sub(t.position, p.position)), p.direction) < 0.97
        )
          return;
      }
      gate.last = now;
      gate.sequence = p.sequence;
      if(seat?.seat?.startsWith('turret')){
        const v=seat.vesselId===this.peer.id?this.app.shipboard.vessel():this.players.get(seat.vesselId)?.vessel;
        if(!v||p.weapon!=='laser')return;
        const position=this.app.shipboard.turretOrigin(v);
        // An occupied remote station fires from the host ship pose; orbital
        // motion and network delay must not reject a valid seated gunner.
        p={...p,position};
      }else if(s.interior)return;
      this.combat.spawnShot(p, conn.peer);
    }
    damagePeer(id, amount) {
      const c = this.links.get(id);
      if (c) this.transmit(c, { type: "damage", amount });
    }
    notifyHit(owner, id) {
      const c = this.links.get(owner);
      if (c) this.transmit(c, { type: "hit", id });
    }
    broadcastMission() {
      if (this.role === "host")
        for (const c of this.links.values())
          this.transmit(c, {
            type: "welcome",
            protocol: PROTOCOL,
            state: this.state(),
            combat: this.combat.snapshot(),
            city: this.app.city?.snapshot(),
            celestial: this.app.celestial?.snapshot(),
            shipboard: this.app.shipboard?.snapshot(),
            economy: this.app.economy?.snapshot(),
            campaign:this.app.campaign?.snapshot(),
          });
    }
    tick(now) {
      if (!this.links.size || now - this.lastTick < 66) return;
      this.lastTick = now;
      for (const [id, c] of this.links) {
        if (now - c.lastSeen > 15000) c.close();
      }
      if (this.role === "host") {
        const players = [
          { ...this.state(), id: this.peer.id },
          ...this.players.values(),
        ];
        this.send({
          type: "snapshot",
          players,
          combat: this.combat.snapshot(),
            city: this.app.city?.snapshot(),
            celestial: this.app.celestial?.snapshot(),
            shipboard: this.app.shipboard?.snapshot(),
            economy: this.app.economy?.snapshot(),
            campaign:this.app.campaign?.snapshot(),
        });
      } else this.send({ type: "state", state: this.state() });
      if (now - (this.lastPing || 0) > 2000) {
        this.lastPing = now;
        this.send({ type: "ping", at: now });
      }
    }
    leave(notify = true) {
      this.app.shipboard?.leaveRemote("Crew disconnected · Returned to your vessel");
      this.app.shipboard?.occupants.clear();
      if(this.app.shipboard)this.app.shipboard.pending=null;
      this.generation++;
      clearTimeout(this.joinTimer);
      this.links.forEach((c) => c.close());
      this.peer?.destroy();
      this.peer = null;
      this.links.clear();
      this.players.clear();
      this.lastShots.clear();
      this.combat.remotes.clear();
      this.combat.authority = true;
      this.enabled = false;
      this.role = "solo";
      this.room = "";
      this.status = "OFFLINE";
      if (notify) this.app.toast("Crew link closed. Solo flight continues.");
    }
  }
  root.LongwayCrewLink = CrewLink;
  root.BloxNetworkValidation = { finiteVector, validState };
})(globalThis);
