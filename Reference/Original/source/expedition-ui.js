/* Pilot interface: every button dispatches a real vehicle-state operation. */
(function initExpedition() {
  "use strict";
  const A = window.longway;
  if (!A) {
    window.addEventListener("longway-ready", initExpedition, { once: true });
    return;
  }
  const C = LongwayCore,
    F = A.flight,
    $ = (id) => document.getElementById(id);
  let selection = F.craft,
    filtered = C.CRAFTS,
    pageIndex = 0,
    lastCraft = "",
    lastState = "",
    sound = null;
  const safe = (fn) => {
    if (A.isPaused()) return;
    A.start();
    fn();
    if (F.message) A.toast(F.message);
    A.focusScene();
    update(performance.now());
  };
  function schematic(canvas, c) {
    const g = canvas.getContext("2d"),
      w = canvas.width,
      h = canvas.height;
    g.clearRect(0, 0, w, h);
    const s = Math.min((w - 74) / c.dimensions[1], (h - 55) / c.dimensions[0]),
      L = c.dimensions[0] * s,
      W = c.dimensions[1] * s,
      x = w / 2,
      y = h / 2;
    g.strokeStyle = "#aec6d320";
    g.lineWidth = 1;
    for (let i = 20; i < w; i += 24) {
      g.beginPath();
      g.moveTo(i, 10);
      g.lineTo(i, h - 10);
      g.stroke();
    }
    for (let i = 15; i < h; i += 24) {
      g.beginPath();
      g.moveTo(12, i);
      g.lineTo(w - 12, i);
      g.stroke();
    }
    g.save();
    g.translate(x, y);
    g.fillStyle =
      "rgb(" + c.paint.map((x) => Math.round(x * 180 + 35)).join(",") + ")";
    g.strokeStyle = "#c3e4e4";
    g.lineWidth = 1;
    const poly = (p) => {
      g.beginPath();
      p.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
      g.closePath();
      g.fill();
      g.stroke();
    };
    if ([0, 1, 4, 8, 9].includes(c.family))
      poly([
        [-W * 0.46, L * 0.27],
        [-W * 0.42, L * (c.sweep * 0.21)],
        [0, -L * 0.36],
        [W * 0.42, L * (c.sweep * 0.21)],
        [W * 0.46, L * 0.27],
        [0, L * 0.37],
      ]);
    if (c.family === 6 || c.family === 7) {
      g.fillRect(-W * 0.42, -L * 0.22, W * 0.84, L * 0.6);
      g.strokeRect(-W * 0.42, -L * 0.22, W * 0.84, L * 0.6);
    }
    poly([
      [-W * 0.13, L * 0.43],
      [-W * 0.15, -L * 0.18],
      [0, -L * 0.48],
      [W * 0.15, -L * 0.18],
      [W * 0.13, L * 0.43],
    ]);
    if (c.family === 2)
      for (let side of [-1, 1])
        for (let j = -1; j < 2; j++) {
          g.fillRect(
            side * W * 0.27 - W * 0.11,
            j * L * 0.24 - L * 0.1,
            W * 0.22,
            L * 0.2,
          );
          g.strokeRect(
            side * W * 0.27 - W * 0.11,
            j * L * 0.24 - L * 0.1,
            W * 0.22,
            L * 0.2,
          );
        }
    if (c.family === 5) {
      g.fillRect(-W * 0.4, -L * 0.24, W * 0.22, L * 0.67);
      g.strokeRect(-W * 0.4, -L * 0.24, W * 0.22, L * 0.67);
      g.beginPath();
      g.moveTo(W * 0.13, L * 0.3);
      g.lineTo(W * 0.4, -L * 0.37);
      g.lineTo(W * 0.3, -L * 0.45);
      g.stroke();
    }
    for (let i = 0; i < c.engines; i++) {
      const side = i % 2 ? -1 : 1,
        ex = c.engines === 3 && i === 2 ? 0 : side * W * 0.32;
      g.fillStyle = "#273b49";
      g.fillRect(ex - W * 0.055, L * 0.02, W * 0.11, L * 0.46);
      g.strokeRect(ex - W * 0.055, L * 0.02, W * 0.11, L * 0.46);
      g.fillStyle = "#87dacd";
      g.fillRect(ex - W * 0.037, L * 0.43, W * 0.074, L * 0.04);
    }
    g.fillStyle = "#162e3c";
    poly([
      [-W * 0.09, L * 0.045],
      [-W * 0.09, -L * 0.18],
      [0, -L * 0.3],
      [W * 0.09, -L * 0.18],
      [W * 0.09, L * 0.045],
    ]);
    g.restore();
    g.fillStyle = "#7397a5";
    g.font = "10px monospace";
    g.fillText(c.dimensions[0].toFixed(1) + " m", w - 57, h * 0.47);
    g.fillText(c.dimensions[1].toFixed(1) + " m span", w * 0.35, h - 7);
  }
  function cards() {
    const q = $("fleetSearch").value.trim().toLowerCase(),
      family = Number($("fleetFamily").value);
    filtered = C.CRAFTS.filter(
      (c) =>
        (family < 0 || c.family === family) &&
        (!q ||
          (c.name + " " + c.id + " " + c.className).toLowerCase().includes(q)),
    );
    const pages = Math.max(1, Math.ceil(filtered.length / 10));
    pageIndex = Math.min(pageIndex, pages - 1);
    $("fleetCount").textContent =
      filtered.length + " craft · " + C.CHASSIS.length + " hull architectures";
    $("fleetPage").textContent = pageIndex + 1 + " / " + pages;
    $("fleetPrev").disabled = pageIndex <= 0;
    $("fleetNext").disabled = pageIndex >= pages - 1;
    $("fleetList").replaceChildren();
    for (const c of filtered.slice(pageIndex * 10, pageIndex * 10 + 10)) {
      const b = document.createElement("button");
      b.className = "fleet-card" + (c.id === selection.id ? " selected" : "");
      b.dataset.id = c.id;
      const cv = document.createElement("canvas");
      cv.width = 160;
      cv.height = 110;
      cv.setAttribute("aria-hidden", "true");
      schematic(cv, c);
      const info = document.createElement("span"),
        strong = document.createElement("strong"),
        small = document.createElement("small");
      strong.textContent = c.name;
      small.textContent = c.id + " · " + c.className;
      info.append(strong, small);
      b.append(cv, info);
      b.onclick = () => {
        selection = c;
        cards();
        detail();
      };
      $("fleetList").appendChild(b);
    }
    if (!filtered.length) {
      const p = document.createElement("p");
      p.textContent =
        "No matches. Clear the search or choose another hull class.";
      $("fleetList").appendChild(p);
    }
  }
  function detail() {
    const c = selection;
    schematic($("fleetDiagram"), c);
    $("fleetName").textContent = c.name;
    $("fleetClass").textContent = c.id + " / " + c.className.toUpperCase();
    $("fleetDescription").textContent = c.description;
    const stats = [
      ["CRUISE", Math.round(c.speed) + " m/s"],
      ["ACCELERATION", c.acceleration.toFixed(1) + " m/s²"],
      ["TRAVEL CRUISE", (c.hyperSpeed * 48).toFixed(0) + " km/s"],
      ["CARGO", c.capacity + " units"],
      ["MAIN ENGINES", c.engines],
      ["LENGTH", c.dimensions[0].toFixed(1) + " m"],
    ];
    $("fleetStats").replaceChildren();
    for (const [label, value] of stats) {
      const e = document.createElement("span"),
        s = document.createElement("small"),
        b = document.createElement("b");
      s.textContent = label;
      b.textContent = value;
      e.append(s, b);
      $("fleetStats").appendChild(e);
    }
    const available =
      ["landed", "docked"].includes(F.vehicle.state) && !F.walking;
    $("selectShip").disabled = !available;
    $("selectShip").textContent =
      c.id === F.craft.id ? "Return to " + c.name : A.economy?.owned.has(c.id) ? "Use " + c.name : "Purchase · " + (A.economy?.shipPrice(c.id) || 0).toLocaleString() + " credits";
    $("fleetRestriction").textContent = available
      ? "Owned ships can be assigned at a port. Buying a new configuration deducts its displayed price from your wallet."
      : "Land and board your current ship to change craft. Ship selection never teleports an on-foot pilot.";
  }
  function open() {
    selection = F.craft;
    pageIndex = Math.floor(selection.index / 10);
    $("fleetSearch").value = "";
    $("fleetFamily").value = "-1";
    A.showPanel("fleet", true);
    cards();
    detail();
  }
  $("speedEffects").checked = A.renderer.speedEffects;
  $("speedEffects").onchange = () => {
    A.renderer.speedEffects = $("speedEffects").checked;
    A.renderer.needsRender = true;
  };
  $("fleetToggle").onclick = open;
  $("openFleet").onclick = open;
  $("closeFleet").onclick = () => A.closePanels();
  for (let i = 0; i < C.CHASSIS.length; i++) {
    const o = document.createElement("option");
    o.value = i;
    o.textContent = C.CHASSIS[i][1];
    $("fleetFamily").appendChild(o);
  }
  $("fleetSearch").oninput = () => {
    pageIndex = 0;
    cards();
  };
  $("fleetFamily").onchange = () => {
    pageIndex = 0;
    cards();
  };
  $("fleetPrev").onclick = () => {
    pageIndex--;
    cards();
  };
  $("fleetNext").onclick = () => {
    pageIndex++;
    cards();
  };
  $("selectShip").onclick = () => {
    if (F.selectCraft(selection.id)) {
      A.closePanels();
      A.start();
      A.toast(F.message);
      A.render();
      update(performance.now());
    } else A.toast(F.message);
  };
  const actions = {
    KeyL: () => F.toggleLanding(),
    KeyG: () => F.toggleGear(),
    KeyH: () => F.jumpAtReticle(),
    KeyV: () => F.toggleCamera(),
    KeyF: () => F.toggleWalk(),
    KeyU: () => {
      F.level();
      F.message = "Aligned to the local horizon.";
    },
  };
  for (const [id, key] of [
    ["landingControl", "KeyL"],
    ["gearControl", "KeyG"],
    ["hyperControl", "KeyH"],
    ["cameraControl", "KeyV"],
    ["boardingControl", "KeyF"],
  ])
    $(id).onclick = () => safe(actions[key]);
  window.addEventListener(
    "keydown",
    (e) => {
      if (
        ["INPUT", "SELECT", "TEXTAREA", "BUTTON", "SUMMARY"].includes(
          e.target.tagName,
        ) ||
        e.repeat
      )
        return;
      if (e.code === "KeyK") {
        e.preventDefault();
        e.stopImmediatePropagation();
        if ($("fleet").hidden) open();
        else A.closePanels();
        return;
      }
      if (actions[e.code] && !A.isPaused()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        safe(actions[e.code]);
      }
    },
    true,
  );
  function update(now) {
    const v = F.vehicle,
      c = F.craft;
    if (!v) return;
    $("craftBadge").textContent = c.name.toUpperCase();
    $("pilotRole").textContent = F.walking
      ? "ON FOOT"
      : v.transition
        ? "TRANSITION"
        : F.cameraMode === "cockpit"
          ? "FLIGHT DECK"
          : "CHASE VIEW";
    $("craftState").textContent = v.state.replace("_", " ").toUpperCase();
    $("gearValue").textContent =
      v.gear < 0.01
        ? "STOWED"
        : v.gear > 0.99
          ? "DEPLOYED"
          : Math.round(v.gear * 100) + "%";
    $("heatValue").textContent = Math.round(v.heat * 100) + "%";
    $("heatMeter").style.width = Math.round(v.heat * 100) + "%";
    $("heatMeter").classList.toggle("hot", v.heat > 0.8);
    $("thrustValue").textContent = Math.round(v.thrust * 100) + "%";
    $("hyperValue").textContent =
      v.hyper === "charging"
        ? "SPOOL " + Math.round(v.charge * 100) + "%"
        : v.hyper === "active"
          ? "ENGAGED"
          : v.cooldown > 0
            ? "COOLING " + v.cooldown.toFixed(0) + "s"
            : "STANDBY";
    const parked = ["landed", "docked"].includes(v.state),
      busy = !!v.transition || !!F.route;
    $("landingControl").textContent = parked ? "Launch [L]" : "Land [L]";
    $("landingControl").disabled = F.walking || busy;
    $("gearControl").textContent =
      (v.gearTarget ? "Retract" : "Deploy") + " gear [R]";
    $("gearControl").disabled = v.state !== "flight" || busy;
    $("boardingControl").textContent = F.walking ? "Board [F]" : "Exit [F]";
    $("boardingControl").disabled = busy || (!parked && !F.walking);
    $("hyperControl").textContent =
      v.hyper === "idle" ? "Hyper [H]" : "Disengage [H]";
    $("hyperControl").disabled = F.walking || busy || parked;
    $("cameraControl").textContent =
      F.cameraMode === "cockpit" ? "Chase [V]" : "Cockpit [V]";
    $("cameraControl").disabled = F.walking || !!v.transition;
    if (navigator.maxTouchPoints > 0)
      for (const id of [
        "landingControl",
        "gearControl",
        "hyperControl",
        "cameraControl",
        "boardingControl",
      ])
        $(id).textContent = $(id).textContent.replace(/ \[[A-Z]\]/g, "");
    $("walkToggle").textContent = F.walking ? "Board [F]" : "Exit [F]";
    $("walkToggle").disabled = busy || (!parked && !F.walking);
    $("assistToggle").disabled = F.walking || busy;
    const cv = $("cockpitReadout");
    cv.hidden =
      !A.started || F.walking || F.cameraMode !== "cockpit" || !!v.transition;
    $("cockpitSpeed").textContent = (F.speed * 1000).toFixed(0);
    $("cockpitAltitude").textContent = (
      Math.max(0, F.altitude()) * 1000
    ).toLocaleString(undefined, { maximumFractionDigits: 0 });
    $("cockpitHeading").textContent =
      c.id + " / " + (F.assist ? "STABILIZED" : "INERTIAL");
    const status = $("boardingSequence");
    status.hidden = !v.transition || !A.started;
    if (v.transition) {
      $("sequenceLabel").textContent =
        {
          boarding: "BOARDING · WALKWAY → FLIGHT DECK",
          exiting: "DISEMBARKING · CANOPY → GROUND",
          landing: "LANDING · STRUTS → CONTACT",
          launching: "LAUNCH · LIFT → GEAR STOW",
        }[v.transition.kind] || "FLIGHT SEQUENCE";
      $("sequenceBar").style.width =
        Math.min(100, (v.transition.elapsed / v.transition.duration) * 100) +
        "%";
    }
    const hint = $("interactionHint");
    let text = "";
    if (F.walking) {
      const d = C.length(C.sub(F.position, v.position)) * 1000;
      text =
        d < Math.max(c.dimensions[0] * 0.8 + 6, 12)
          ? "[F] Board " + c.name + " · [B] Survey · [Shift+B] Sample"
          : "YOUR SHIP · " + d.toFixed(0) + " m · Return to board";
    } else if (parked)
      text = "[Space / L] Launch · [F] Exit & explore · [K] Choose ship";
    else if (v.hyper === "charging")
      text = "HYPERDRIVE SPOOLING · KEEP CLEAR OF WORLDS AND STATIONS";
    else if (v.hyper === "active")
      text = "HYPER CRUISE · [H / X] DISENGAGE · WATCH HEAT AND FUEL";
    else if (!F.route && !v.transition && F.altitude() < 0.3)
      text = "[X] Brake · [L] Land on a dry, level footprint · [V] Camera";
    if (F.docked)
      text = "DOCKED · [Z] HUD cursor · [F] Exit · [L] Launch";
    if (v.transition) text = "";
    hint.textContent = text;
    hint.hidden = !text || !A.started;
    document.body.classList.toggle("pilot-onfoot", F.walking);
    document.body.classList.toggle(
      "pilot-cockpit",
      !F.walking && F.cameraMode === "cockpit",
    );
    const marker = $("parkedShipMarker");
    marker.hidden = !F.walking || !A.started;
    if (F.walking) {
      const p = F.renderPose(),
        rel = C.sub(v.position, p.position),
        z = C.dot(rel, p.forward),
        aspect = A.renderer.canvas.width / A.renderer.canvas.height,
        x =
          C.dot(rel, p.right) / (Math.max(0.001, z) * A.renderer.fov * aspect),
        y = C.dot(rel, p.up) / (Math.max(0.001, z) * A.renderer.fov);
      marker.style.left = 50 + C.clamp(x, -0.88, 0.88) * 50 + "%";
      marker.style.top = 50 - C.clamp(y, -0.58, 0.58) * 50 + "%";
      marker.textContent =
        (z < 0 ? "↶ " : "◇ ") +
        c.name +
        " · " +
        Math.round(C.length(rel) * 1000) +
        " m";
    }
    if (sound) {
      const ac = sound.context;
      const heard = A.started && !A.isPaused() && !F.walking;
      const intensity = heard
        ? v.thrust * 0.026 +
          (v.hyper === "active" ? 0.04 : 0) +
          (["launching", "landing"].includes(v.state) ? 0.018 : 0)
        : 0;
      sound.gain.gain.setTargetAtTime(intensity, ac.currentTime, 0.14);
      sound.osc.frequency.setTargetAtTime(
        34 + v.thrust * 51 + v.charge * 80,
        ac.currentTime,
        0.12,
      );
      sound.filter.frequency.setTargetAtTime(
        200 + v.thrust * 640 + v.charge * 1800,
        ac.currentTime,
        0.1,
      );
      if (lastState !== v.state && heard) {
        const o = ac.createOscillator(),
          g = ac.createGain();
        o.frequency.setValueAtTime(
          ["boarding", "exiting"].includes(v.state) ? 180 : 95,
          ac.currentTime,
        );
        o.frequency.exponentialRampToValueAtTime(50, ac.currentTime + 0.65);
        g.gain.setValueAtTime(0.028, ac.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + 0.65);
        o.connect(g).connect(ac.destination);
        o.start();
        o.stop(ac.currentTime + 0.68);
      }
    }
    lastState = v.state;
    lastCraft = c.id;
  }
  $("engineAudio").onclick = async () => {
    try {
      if (sound) {
        await sound.context.close();
        sound = null;
        $("engineAudio").textContent = "Engine & mechanism audio: OFF";
        return;
      }
      const ac = new (window.AudioContext || window.webkitAudioContext)();
      await ac.resume();
      const osc = ac.createOscillator(),
        filter = ac.createBiquadFilter(),
        gain = ac.createGain();
      osc.type = "sawtooth";
      filter.type = "lowpass";
      gain.gain.value = 0;
      osc.connect(filter).connect(gain).connect(ac.destination);
      osc.start();
      sound = { context: ac, osc, filter, gain };
      $("engineAudio").textContent = "Engine & mechanism audio: ON";
    } catch (e) {
      A.toast(
        "Audio could not start. Flight remains available with sound off.",
      );
    }
  };
  window.addEventListener("longway-error", () => {
    if (sound)
      sound.gain.gain.setTargetAtTime(0, sound.context.currentTime, 0.03);
  });
  window.LongwayExpeditionUI = { update, open, cards, schematic };
  update(performance.now());
})();
