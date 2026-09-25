(function initCitizen() {
  "use strict";
  if (!window.longway) {
    window.addEventListener("longway-ready", initCitizen, { once: true });
    return;
  }
  const A = window.longway,
    C = LongwayCore,
    F = A.flight,
    B = A.combat,
    $ = (id) => document.getElementById(id),
    canvas = $("scene");
  const network = (A.network = new LongwayCrewLink(A)),
    overlay = $("tacticalOverlay"),
    g = overlay.getContext("2d");
  const dialogs = ["combatPanel", "crewPanel", "artPanel"];
  let activeDialog = null,
    sound = null;
  document.querySelector(".brand strong").textContent = "SPACE PATRIOT";
  document.querySelector(".brand small").textContent = "FRONTIER / 10";
  document.querySelector(".intro h1").innerHTML =
    "A sky worth<br><em>fighting for.</em>";
  document.querySelector(".intro p").textContent =
    "Take the flight deck. Explore nineteen real-seeded worlds across five systems, land and step outside, or assemble a crew and face the frontier together.";
  document
    .querySelectorAll(".footer-brand")
    .forEach((el) => (el.textContent = "SPACE PATRIOT / FLIGHT DECK"));
  document.querySelector(".intro .eyebrow").textContent =
    "EXPLORATION / FLIGHT / COMBAT";
  $("start").innerHTML = "Take the flight deck <span>↗</span>";
  const sortie = document.createElement("button");
  sortie.id = "introCombat";
  sortie.className = "large";
  sortie.textContent = "Combat sortie ↗";
  document.querySelector(".intro-actions").appendChild(sortie);
  sortie.onclick = () => {
    A.start();
    open("combatPanel");
  };
  const close = () => {
    if (window.BloxPause?.isOpen() && !BloxPause.routing) BloxPause.dismiss();
    dialogs.forEach((id) => ($(id).hidden = true));
    activeDialog = null;
    document.body.classList.remove("citizen-menu-open");
    B.trigger = false;
    A.clearInput();
    A.focusScene();
  };
  function open(id, inline = false) {
    if (!inline && window.BloxPause?.handles(id)) return BloxPause.present(id, true);
    close();
    A.closePanels();
    activeDialog = id;
    $(id).hidden = false;
    document.body.classList.add("citizen-menu-open");
    B.trigger = false;
    A.clearInput();
    document.exitPointerLock?.();
    update(performance.now());
  }
  document
    .querySelectorAll("[data-close-citizen]")
    .forEach((el) => (el.onclick = close));
  $("openCombat").onclick = () => open("combatPanel");
  $("openCrew").onclick = () => open("crewPanel");
  $("openArt").onclick = () => open("artPanel");
  const arm = () => {
    B.setArmed(!B.armed);
    A.focusScene();
    update(performance.now());
  };
  $("armWeapons").onclick = arm;
  $("reloadWeapon").onclick = () => {
    B.reload();
    A.focusScene();
  };
  $("radarRange").onclick = () => {
    B.radarRange = B.radarRange === 3 ? 10 : B.radarRange === 10 ? 0.15 : 3;
  };
  document.querySelectorAll("button[data-weapon]").forEach(
    (el) =>
      (el.onclick = () => {
        B.selectWeapon(el.dataset.weapon);
        B.setArmed(true);
        A.focusScene();
        update(performance.now());
      }),
  );
  $("spaceSortie").onclick = () => {
    close();
    A.start();
    B.sortie("space");
    A.renderer.needsRender = true;
  };
  $("groundSortie").onclick = () => {
    close();
    A.start();
    B.sortie("ground");
    B.radarRange = 0.15;
    A.renderer.needsRender = true;
  };
  $("combatService").onclick = () => {
    B.service();
    A.toast(B.message);
  };
  $("endSortie").onclick = () => {
    if (network.role === "guest") {
      A.toast(
        "The host controls the shared sortie. Leave the crew to explore solo.",
      );
      return;
    }
    B.recover();
    network.broadcastMission();
    close();
    A.start();
  };
  $("recoverShip").onclick = () => {
    B.recover();
    $("disabledPanel").hidden = true;
    A.start();
  };
  $("hostRoom").onclick = () => network.host($("callsign").value);
  $("joinRoom").onclick = () =>
    network.join($("roomCode").value, $("callsign").value);
  $("leaveRoom").onclick = () => network.leave();
  $("copyRoom").onclick = async () => {
    if (!network.room) return;
    try {
      await navigator.clipboard.writeText(network.room);
      A.toast("Room code copied.");
    } catch {
      A.toast("Crew code: " + network.room);
    }
  };
  $("applyRelay").onclick = () => {
    const url = $("turnURL").value.trim();
    if (!/^turns?:[^\s]+$/.test(url)) {
      A.toast("Enter a valid turn: or turns: server URL.");
      return;
    }
    window.BLOX_RTC_CONFIG = {
      config: {
        iceServers: [
          { urls: "stun:stun.l.google.com:19302" },
          {
            urls: url,
            username: $("turnUser").value,
            credential: $("turnCredential").value,
          },
        ],
      },
    };
    A.toast("Relay settings will apply to the next crew connection.");
  };
  const settings = document.createElement("div");
  settings.className = "rendering-options";
  settings.innerHTML =
    '<div class="panel-heading">SURFACE & LIGHTING</div><label>AMBIENT OCCLUSION<input id="toggleAO" type="checkbox" checked></label><label>REFLECTION PROBES<input id="toggleProbes" type="checkbox" checked></label><label>NORMAL DETAIL<input id="toggleNormals" type="checkbox" checked></label><label for="materialView">MATERIAL INSPECTION</label><select id="materialView"><option value="0">Final lighting</option><option value="1">Surface normals</option><option value="3">Albedo</option><option value="4">Metalness</option><option value="5">Roughness</option><option value="6">Ambient occlusion</option><option value="7">Reflection probes</option></select><p class="probe-state" id="probeState">Capturing environment…</p>';
  $("settings").appendChild(settings);
  $("toggleAO").onchange = (e) => {
    A.renderer.materials.ao = e.target.checked;
    A.renderer.needsRender = true;
  };
  $("toggleProbes").onchange = (e) => {
    A.renderer.materials.reflections = e.target.checked;
    A.renderer.needsRender = true;
  };
  $("toggleNormals").onchange = (e) => {
    A.renderer.materials.normalStrength = e.target.checked ? 1 : 0;
    A.renderer.needsRender = true;
  };
  $("materialView").onchange = (e) => {
    A.renderer.view = +e.target.value;
    A.renderer.needsRender = true;
  };
  window.addEventListener(
    "keydown",
    (e) => {
      if (["INPUT", "TEXTAREA", "SELECT"].includes(e.target.tagName)) return;
      if (e.code === "Escape" && activeDialog && !window.BloxPause?.isOpen()) {
        e.stopImmediatePropagation();
        e.preventDefault();
        close();
        return;
      }
      if (
        [
          "Digit0",
          "Digit1",
          "Digit2",
          "Digit3",
          "KeyC",
          "KeyR",
          "KeyY",
        ].includes(e.code)
      ) {
        e.preventDefault();
        e.stopImmediatePropagation();
      }
      if (e.repeat) return;
      if (e.code === "Digit0") {
        e.stopImmediatePropagation();
        if (activeDialog) close();
        else open("combatPanel");
        return;
      }
      if (activeDialog || A.isPaused()) return;
      if(e.code==='KeyN') {e.preventDefault();e.stopImmediatePropagation();B.toggleNightVision();return;}
      const map = (F.walking || F.bridgeWalk) && !A.systems.seated?.startsWith('turret')
        ? { Digit1: "rifle", Digit2: "sidearm" }
        : { Digit1: "kinetic", Digit2: "laser", Digit3: "missile" };
      if (map[e.code]) {
        e.stopImmediatePropagation();
        B.selectWeapon(map[e.code]);
        B.setArmed(true);
      }
      if (e.code === "KeyY") {
        e.stopImmediatePropagation();
        arm();
      }
      if (e.code === "KeyC") {
        e.stopImmediatePropagation();
        B.cycleTarget();
      }
      if (e.code === "KeyR") {
        e.stopImmediatePropagation();
        B.reload();
      }
    },
    true,
  );
  const pressWeaponInput = (e) => {
      if(e.button===2&&!activeDialog&&!A.isPaused()){e.preventDefault();B.setAim(true);return;}
      if (
        e.button !== 0 ||
        activeDialog ||
        A.isPaused() ||
        !B.armed ||
        (F.drive?.instruments && !(F.walking || F.bridgeWalk))
      )
        return;
      B.trigger = true;
    };
  // Pointer events only report the first mouse button going down and the
  // last one coming up. Mouse events preserve independent aim/fire chords.
  canvas.addEventListener('mousedown',pressWeaponInput,true);
  canvas.addEventListener('pointerdown',e=>{if(e.pointerType!=='mouse')pressWeaponInput(e);},true);
  canvas.addEventListener('contextmenu',e=>e.preventDefault());
  const releaseWeaponButton=e=>{if(e.button===0)B.trigger=false;if(e.button===2)B.setAim(false);};
  window.addEventListener('mouseup',releaseWeaponButton);
  window.addEventListener('pointerup',e=>{if(e.pointerType!=='mouse')releaseWeaponButton(e);});
  const releaseWeaponInput=()=>{B.trigger=false;B.setAim(false);};
  window.addEventListener("blur", releaseWeaponInput);
  window.addEventListener("pointercancel", releaseWeaponInput);
  document.addEventListener("visibilitychange", releaseWeaponInput);
  $("touchFire").onpointerdown = (e) => {
    e.preventDefault();
    if (!B.armed) arm();
    B.trigger = true;
  };
  $("touchFire").onpointerup = () => (B.trigger = false);
  $("touchFire").onpointercancel = () => (B.trigger = false);
  const originalCockpit = LongwayCockpit.draw;
  LongwayCockpit.draw = function (c, f) {
    originalCockpit.call(this, c, f);
    if (!f.combat) return;
    const ctx = c.getContext("2d");
    ctx.save();
    ctx.scale(c.width / 2048, c.height / 1024);
    ctx.fillStyle = "#07141b";
    ctx.fillRect(1060, 40, 950, 428);
    ctx.fillStyle = "#a6ddd4";
    ctx.font = "22px monospace";
    ctx.fillText("TACTICAL / FIRE CONTROL", 1090, 80);
    drawRadar(ctx, 1300, 280, 168, f.combat);
    ctx.font = "22px monospace";
    ctx.fillStyle = "#c3dcd5";
    ctx.fillText(f.combat.spec.short, 1510, 155);
    ctx.font = "68px monospace";
    ctx.fillText(
      String(
        f.combat.key === "laser"
          ? Math.floor(f.combat.capacitor)
          : f.combat.ammo[f.combat.key].mag,
      ),
      1510,
      233,
    );
    ctx.font = "20px monospace";
    ctx.fillStyle = "#8faeae";
    ctx.fillText(f.combat.armed ? "WEAPONS ARMED" : "WEAPONS SAFE", 1510, 282);
    ctx.fillText("SHIELD " + Math.ceil(f.combat.shield) + "%", 1510, 331);
    ctx.fillText(f.combat.target?.name || "NO TARGET", 1510, 378);
    ctx.restore();
  };
  B.onFire = (key) => {
    try {
      sound ??= new (window.AudioContext || window.webkitAudioContext)();
      if (sound.state === "suspended") sound.resume();
      const osc = sound.createOscillator(),
        gain = sound.createGain();
      osc.type = key === "laser" ? "sine" : "triangle";
      osc.frequency.setValueAtTime(
        key === "laser" ? 1200 : key === "missile" ? 85 : 150,
        sound.currentTime,
      );
      osc.frequency.exponentialRampToValueAtTime(
        key === "laser" ? 250 : 35,
        sound.currentTime + 0.12,
      );
      gain.gain.setValueAtTime(0.035, sound.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, sound.currentTime + 0.16);
      osc.connect(gain);
      gain.connect(sound.destination);
      osc.start();
      osc.stop(sound.currentTime + 0.17);
    } catch {}
  };
  function drawRadar(ctx, x, y, r, combat) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = "#3c686557";
    ctx.lineWidth = 1;
    for (const k of [0.33, 0.66, 1]) {
      ctx.beginPath();
      ctx.arc(0, 0, r * k, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.stroke();
    ctx.strokeStyle = "#80b5aa55";
    const a = combat.time * 0.8;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.sin(a) * r, -Math.cos(a) * r);
    ctx.stroke();
    ctx.fillStyle = "#c9e4d8";
    ctx.beginPath();
    ctx.moveTo(0, -5);
    ctx.lineTo(-4, 5);
    ctx.lineTo(4, 5);
    ctx.closePath();
    ctx.fill();
    for (const e of combat.contacts()) {
      const rel = C.sub(e.position, combat.origin()),
        dist = C.length(rel);
      if (dist > combat.radarRange) continue;
      const px = (C.dot(rel, F.right) / combat.radarRange) * r,
        py = (-C.dot(rel, combat.aim()) / combat.radarRange) * r,
        alt = C.dot(rel, F.up);
      ctx.fillStyle =
        !combat.isHostile(e) ? "#a6ddd4" : "#df9984";
      ctx.beginPath();
      ctx.moveTo(px, py - 3);
      ctx.lineTo(px - 3, py + 3);
      ctx.lineTo(px + 3, py + 3);
      ctx.closePath();
      ctx.fill();
      if (Math.abs(alt) > 0.01) {
        ctx.strokeStyle = ctx.fillStyle;
        ctx.beginPath();
        ctx.moveTo(px, py);
        ctx.lineTo(px, py - Math.sign(alt) * 6);
        ctx.stroke();
      }
      if (e.id === combat.targetId) {
        ctx.strokeStyle = "#f1c899";
        ctx.strokeRect(px - 6, py - 6, 12, 12);
      }
    }
    ctx.restore();
  }
  function project(p) {
    const pose = F.renderPose(),
      rel = C.sub(p, pose.position),
      z = C.dot(rel, pose.forward);
    if (z <= 0.00001) return null;
    const f = A.renderer.fov;
    return {
      x:
        overlay.width * 0.5 +
        (C.dot(rel, pose.right) / z / f) * overlay.height * 0.5,
      y:
        overlay.height * 0.5 -
        (C.dot(rel, pose.up) / z / f) * overlay.height * 0.5,
      z,
    };
  }
  const contactVisibility = new Map();
  function visibleContact(e, now) {
    if (!e.humanoid || !F.walking || !C.CityWorld) return true;
    const origin = F.renderPose().position;
    if (C.length(C.sub(e.position, origin)) > 0.2) return false;
    const body = A.world.nearest(origin).body, previous = contactVisibility.get(e.id);
    if (previous && previous.body === body.id && now - previous.time < 160) return previous.visible;
    const obstruction = C.CityWorld.trace(A.world, body, origin, e.position);
    const visible = !obstruction || obstruction.t > 0.995;
    contactVisibility.set(e.id, { body: body.id, time: now, visible });
    if (contactVisibility.size > 32) contactVisibility.delete(contactVisibility.keys().next().value);
    return visible;
  }
  function frame(now) {
    network.tick(now);
    if (overlay.width !== innerWidth || overlay.height !== innerHeight) {
      overlay.width = innerWidth;
      overlay.height = innerHeight;
    }
    g.clearRect(0, 0, overlay.width, overlay.height);
    if (!A.started || activeDialog || F.drive?.instruments) return;
    const w = overlay.width,
      h = overlay.height,
      cx = w / 2,
      cy = h / 2;
    g.strokeStyle = B.armed ? "#bcd7cbac" : "#adc6c65c";
    g.lineWidth = 1;
    const shipTargeting=window.LongwayTargeting?.draw(g,A,w,h);
    if (!shipTargeting && B.armed && B.aimBlend<.52) {
      const aimPoint = project(C.add(B.origin(), C.mul(B.aim(), 1)));
      const x = aimPoint?.x || cx,
        y = aimPoint?.y || cy;
      g.beginPath();
      g.arc(x, y, 12, 0, Math.PI * 2);
      g.moveTo(x - 24, y);
      g.lineTo(x - 17, y);
      g.moveTo(x + 17, y);
      g.lineTo(x + 24, y);
      g.moveTo(x, y - 24);
      g.lineTo(x, y - 17);
      g.stroke();
      g.fillStyle = "#c0e0d0";
      g.fillRect(x - 1, y - 1, 2, 2);
    }
    const occupiedLabels = [];
    const contacts = shipTargeting?[]:B.contacts().sort((a,b) => Number(b.id===B.targetId)-Number(a.id===B.targetId) || C.length(C.sub(a.position,B.origin()))-C.length(C.sub(b.position,B.origin())));
    for (const e of contacts) {
      const p = project(e.position);
      if (!p || !visibleContact(e, now)) continue;
      const selected = e.id === B.targetId,
        friendly = !B.isHostile(e);
      g.strokeStyle = friendly
        ? "#a6ddd4aa"
        : selected
          ? "#e6b28f"
          : "#c08b785c";
      const r = selected ? 28 : 15;
      g.lineWidth = selected ? 1.4 : 1;
      if (p.x < 30 || p.x > w - 30 || p.y < 165 || p.y > h - 60) {
        if (!selected) continue;
        const x = Math.max(32, Math.min(w - 32, p.x)),
          y = Math.max(172, Math.min(h - 65, p.y));
        g.beginPath();
        g.moveTo(x - 7, y + 6);
        g.lineTo(x, y - 7);
        g.lineTo(x + 7, y + 6);
        g.stroke();
        continue;
      }
      for (const sx of [-1, 1])
        for (const sy of [-1, 1]) {
          g.beginPath();
          g.moveTo(p.x + sx * (r - 7), p.y + sy * r);
          g.lineTo(p.x + sx * r, p.y + sy * r);
          g.lineTo(p.x + sx * r, p.y + sy * (r - 7));
          g.stroke();
        }
      g.font = "8px monospace";
      g.textAlign = "center";
      g.fillStyle = friendly ? "#badfd2" : "#d2b4a0";
      const label = (e.name || "CREW") +
          " / " +
          Math.round(C.length(C.sub(e.position, B.origin())) * 1000) +
          " M";
      const labelWidth = g.measureText(label).width, labelY = p.y-r-10;
      const labelBox = {x:p.x-labelWidth/2-5,y:labelY-10,w:labelWidth+10,h:16};
      if (selected || !occupiedLabels.some(b=>labelBox.x<b.x+b.w&&labelBox.x+labelBox.w>b.x&&labelBox.y<b.y+b.h&&labelBox.y+labelBox.h>b.y)) {
        g.fillText(label,p.x,labelY);
        occupiedLabels.push(labelBox);
      }
      if (selected) {
        g.fillStyle = "#ffffff24";
        g.fillRect(p.x - r, p.y + r + 7, r * 2, 2);
        g.fillStyle = "#d5a88a";
        g.fillRect(p.x - r, p.y + r + 7, (r * 2 * e.hull) / 100, 2);
        if (B.key === "missile") {
          g.beginPath();
          g.arc(
            p.x,
            p.y,
            r + 8,
            -Math.PI / 2,
            -Math.PI / 2 + B.lock * Math.PI * 2,
          );
          g.stroke();
          g.fillText(
            B.lock >= 1
              ? "LOCK ACQUIRED"
              : "ACQUIRING " + Math.round(B.lock * 100) + "%",
            p.x,
            p.y + r + 25,
          );
        } else if (B.spec.speed) {
          const lead = project(
            C.intercept(B.origin(), e.position, e.velocity, B.spec.speed),
          );
          if (lead) {
            g.strokeStyle = "#9fcfc170";
            g.beginPath();
            g.arc(lead.x, lead.y, 4, 0, Math.PI * 2);
            g.stroke();
          }
        }
      }
    }
    if (B.time - B.hitTime < 0.16) {
      g.strokeStyle = "#e6d7ad";
      g.beginPath();
      for (const sx of [-1, 1])
        for (const sy of [-1, 1]) {
          g.moveTo(cx + sx * 7, cy + sy * 7);
          g.lineTo(cx + sx * 15, cy + sy * 15);
        }
      g.stroke();
    }
    if (B.time - B.lastDamage < 0.25) {
      g.strokeStyle = "#b1544766";
      g.lineWidth = 16;
      g.strokeRect(0, 0, w, h);
    }
    if(window.BloxArtwork?.active)g.clearRect(0,h*.63,w,h*.37);
    const rg = $("radar").getContext("2d");
    rg.clearRect(0, 0, 360, 230);
    drawRadar(rg, 180, 118, 103, B);
  }
  function update(now) {
    const a = B.ammo[B.key];
    $("combatMode").textContent = B.dead
      ? "DISABLED"
      : B.mission === "complete"
        ? "SECTOR CLEAR"
        : B.armed
          ? "COMBAT / ARMED"
          : "EXPLORATION";
    $("combatMessage").textContent = B.message;
    $("linkStatus").textContent =
      network.role === "solo"
        ? "SOLO"
        : network.status + " / " + (network.links.size + 1) + " CREW";
    $("weaponName").textContent = B.spec.name;
    $("magazine").textContent =
      B.key === "laser"
        ? Math.floor(B.capacitor)
        : String(a.mag).padStart(2, "0");
    $("reserve").textContent = B.key === "laser" ? "100%" : a.reserve;
    $("ammoLabel").textContent =
      B.reloadTime > 0
        ? "RELOADING " + B.reloadTime.toFixed(1) + "S"
        : B.overheated
          ? "COOLING"
          : B.key === "laser"
            ? "CAPACITOR"
            : "ROUNDS · READY";
    $("armWeapons").firstChild.textContent = B.armed ? "ARMED " : "SAFE ";
    $("shieldNumber").textContent = Math.ceil(F.walking ? B.suit : B.shield);
    $("shieldFill").style.width = (F.walking ? B.suit : B.shield) + "%";
    $("heatNumber").textContent = Math.ceil(B.heat * 100) + "%";
    $("combatHeatFill").style.width = B.heat * 100 + "%";
    $("targetReadout").textContent = B.target
      ? B.target.name +
        " · HULL " +
        Math.ceil(B.target.hull) +
        " · " +
        Math.round(C.length(C.sub(B.target.position, B.origin())) * 1000) +
        " M"
      : "NO TARGET · C TO CYCLE";
    $("contactCount").textContent =
      String(B.contacts().length).padStart(2, "0") + " CONTACTS";
    $("radarRange").textContent =
      B.radarRange < 1
        ? B.radarRange * 1000 + " M"
        : B.radarRange.toFixed(1) + " KM";
    const buttons = [...document.querySelectorAll("button[data-weapon]")],
      keys = (F.walking || F.bridgeWalk) && !A.systems.seated?.startsWith('turret') ? ["rifle", "sidearm"] : ["kinetic", "laser", "missile"];
    buttons.forEach((el, i) => {
      el.hidden = i >= keys.length;
      if (i < keys.length) {
        el.dataset.weapon = keys[i];
        el.textContent = "0" + (i + 1) + " " + C.WEAPONS[keys[i]].short;
        el.classList.toggle("selected", keys[i] === B.key);
      }
    });
    $("disabledPanel").hidden = !B.dead;
    $("roomDisplay").textContent = network.room || "— — — — — —";
    $("crewConnection").textContent = network.status;
    $("crewPing").textContent = network.rtt
      ? Math.round(network.rtt) + " MS RTT"
      : "—";
    $("crewDot").textContent = network.links.size ? "●" : "○";
    $("spaceSortie").disabled = $("groundSortie").disabled =
      network.role === "guest";
    const roster = [
      { name: network.name, role: network.role === "host" ? "HOST" : "YOU" },
      ...B.remotes.values(),
    ];
    $("crewRoster").replaceChildren(
      ...roster.map((p) => {
        const row = document.createElement("div");
        row.className = "crew-member";
        const name = document.createElement("span");
        name.textContent = p.name;
        const role = document.createElement("small");
        role.textContent = p.role || "CONNECTED";
        row.append(name, role);
        return row;
      }),
    );
    const m = A.renderer.materials;
    if (m)
      $("probeState").textContent =
        "EXTERIOR + COCKPIT · " +
        m.size +
        "² CUBEMAPS · " +
        m.captures +
        " CAPTURES\nAO: DISTANCE-FIELD CONTACT + MATERIAL MAP";
  }
  window.BloxUI = { update, frame, open, close, isOpen: () => !!activeDialog,
    isLiveDialog: () => ["engineeringDialog","npcDialogue","fieldInventory","factionMap"].includes(activeDialog),
    registerDialog(id) { if (!dialogs.includes(id)) dialogs.push(id); }
  };
  update(performance.now());
})(globalThis);
