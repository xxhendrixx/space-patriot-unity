(function init() {
  if (!window.longway) {
    addEventListener("longway-ready", init, { once: true });
    return;
  }
  const A = longway,
    F = A.flight,
    S = A.systems,
    C = LongwayCore,
    $ = (id) => document.getElementById(id);
  const open = document.createElement("button");
  open.id = "openEngineering";
  open.textContent = "VESSEL SYSTEMS";
  document.querySelector(".citizen-rail").append(open);
  const tour = document.createElement("button");
  tour.id = "bridgeTour";
  tour.hidden = true;
  tour.textContent = "WALK INTERIOR";
  document.querySelector(".citizen-rail").append(tour);
  const boardInterior = document.createElement("button");
  boardInterior.id = "introInterior";
  boardInterior.className = "large";
  boardInterior.textContent = "Walk the Wayfarer ↗";
  boardInterior.onclick = () => {
    F.place(A.world.system([0, 0, 0])[1], "surface");
    F.selectCraft(C.CRAFTS.find(c => c.className === "Exploration corvette").id);
    A.start();
    S.tourBridge();
    A.focusScene();
    A.render();
  };
  document.querySelector(".intro-actions").append(boardInterior);
  tour.onclick = () => {
    if (S.tourBridge()) {
      A.closePanels();
      A.focusScene();
    } else A.toast(F.message);
  };
  const modal = document.createElement("div");
  modal.id = "engineeringDialog";
  modal.className = "citizen-modal";
  modal.hidden = true;
  modal.innerHTML = `<section class="citizen-dialog systems-dialog"><div class="dialog-top"><span>VESSEL / RESOURCE MANAGEMENT</span><button id="closeEngineering" aria-label="Close vessel systems">×</button></div><h2>Engineering station.</h2><p id="systemsShip"></p><div class="system-modes"><button data-mode="SCM">SCM · COMBAT</button><button data-mode="NAV">NAV · TRAVEL</button><span id="systemWarning"></span></div><div class="power-presets">${["BALANCED", "COMBAT", "DEFENSE", "TRAVEL"].map((k) => `<button data-preset="${k}">${k}</button>`).join("")}</div><div class="power-grid">${["engines", "weapons", "shields"].map((k) => `<div><span>${k.toUpperCase()}</span><strong id="pips-${k}"></strong><div class="power-pips" id="bar-${k}"></div><button data-allocate="${k}" data-delta="-1" aria-label="Reduce ${k} power">−</button><button data-allocate="${k}" data-delta="1" aria-label="Increase ${k} power">+</button></div>`).join("")}</div><p class="system-explainer">Power is shared across twelve segments. More engine power improves acceleration; weapon power restores the laser capacitor; shield power speeds recovery. NAV inhibits ship weapons and drains shields while the drive prepares for travel.</p><div class="component-table"><div class="component-row component-head"><span>COMPONENT</span><span>HEALTH / TEMP</span><span>POWER</span><span>SERVICE</span></div>${Object.keys(
    S.components,
  )
    .map(
      (k) =>
        `<div class="component-row"><span>${k === "lifeSupport" ? "LIFE SUPPORT" : k.toUpperCase()}</span><span id="component-${k}"></span><button data-component="${k}"></button><button data-repair="${k}">REPAIR</button></div>`,
    )
    .join(
      "",
    )}</div><div class="system-footer"><span id="cabinPressure"></span><span id="repairSpares"></span><button id="vesselService">PORT SERVICE / REARM / REFUEL</button></div><p>Isolate a damaged component before field repair. Reactor and cooler failures reduce other systems. Port service requires a landed or docked vessel.</p></section>`;
  document.body.append(modal);
  BloxUI.registerDialog("engineeringDialog");
  open.onclick = () => {
    BloxUI.open("engineeringDialog");
    render();
  };
  $("closeEngineering").onclick = () => BloxUI.close();
  modal.querySelectorAll("[data-mode]").forEach(
    (el) =>
      (el.onclick = () => {
        S.setMode(el.dataset.mode);
        render();
      }),
  );
  modal.querySelectorAll("[data-preset]").forEach(
    (el) =>
      (el.onclick = () => {
        S.preset(el.dataset.preset);
        render();
      }),
  );
  modal.querySelectorAll("[data-allocate]").forEach(
    (el) =>
      (el.onclick = () => {
        S.allocate(el.dataset.allocate, +el.dataset.delta);
        render();
      }),
  );
  modal.querySelectorAll("[data-component]").forEach(
    (el) =>
      (el.onclick = () => {
        S.toggleComponent(el.dataset.component);
        render();
      }),
  );
  modal.querySelectorAll("[data-repair]").forEach(
    (el) =>
      (el.onclick = () => {
        S.repair(el.dataset.repair);
        render();
      }),
  );
  $("vesselService").onclick = () => {
    if (A.combat.service()) A.toast("Ship repaired, fueled and rearmed.");
    else A.toast(A.combat.message);
    render();
  };
  const art = document.createElement("div");
  art.className = "cockpit-concept";
  art.innerHTML =
    '<h2>Flight decks.</h2><p>Strider fighter, Wayfarer exploration bridge, and Meridian command deck. Concept art reference for the playable interiors.</p><img src="assets/concepts/cockpit-fleet-board.png" alt="Original Space Patriot concept art of fighter, exploration ship and carrier cockpits">';
  $("artPanel").querySelector("section").append(art);
  for (const [title, file] of [
    ["Connected ship interiors", "assets/concepts/space-patriot-interiors.png"],
    ["Frontier / worlds, vessels and wildlife", "assets/concepts/space-patriot-frontier.png"],
  ]) {
    const section = document.createElement("div");
    section.className = "cockpit-concept";
    section.innerHTML =
      "<h2>" +
      title +
      '</h2><img src="' +
      file +
      '" alt="Space Patriot original ' +
      title +
      ' concept art">';
    $("artPanel").querySelector("section").append(section);
  }
  function render() {
    tour.hidden = F.craft.dimensions[0] < 60 || F.walking;
    tour.textContent = F.bridgeWalk ? "RETURN TO PILOT" : "WALK INTERIOR";
    if (modal.hidden) return;
    $("systemsShip").textContent =
      F.craft.name +
      " / " +
      F.craft.className +
      " / " +
      Math.round(F.craft.dimensions[0]) +
      " m";
    $("systemWarning").textContent = S.warning;
    for (const k of Object.keys(S.allocations)) {
      $("pips-" + k).textContent = S.allocations[k] + " / 12";
      $("bar-" + k).innerHTML = Array.from(
        { length: 12 },
        (_, i) => '<i class="' + (i < S.allocations[k] ? "on" : "") + '"></i>',
      ).join("");
    }
    for (const [k, c] of Object.entries(S.components)) {
      $("component-" + k).textContent =
        Math.round(c.health) + "% / " + Math.round(c.temperature) + "°C";
      const btn = modal.querySelector('[data-component="' + k + '"]');
      btn.textContent = c.enabled ? "ONLINE" : "ISOLATED";
      btn.classList.toggle("selected", c.enabled);
      modal.querySelector('[data-repair="' + k + '"]').textContent =
        S.repairing === k ? "REPAIRING…" : "REPAIR";
    }
    $("cabinPressure").textContent = "CABIN " + Math.round(S.pressure) + " kPa";
    $("repairSpares").textContent = "SPARES " + Math.floor(S.spares);
    modal
      .querySelectorAll("[data-mode]")
      .forEach((el) =>
        el.classList.toggle("selected", el.dataset.mode === S.mode),
      );
    modal
      .querySelectorAll("[data-preset]")
      .forEach((el) =>
        el.classList.toggle("selected", el.dataset.preset === S.profile),
      );
  }
  const interiorHint = document.createElement("div");
  interiorHint.id = "interiorHint";
  interiorHint.hidden = true;
  document.body.append(interiorHint);
  addEventListener(
    "keydown",
    (e) => {
      if (e.code === "KeyZ" && !e.repeat && F.bridgeWalk && !A.isPaused() && !BloxUI.isOpen()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        if (S.interactInterior()) A.toast(F.message);
      }
    },
    true,
  );
  setInterval(() => {
    interiorHint.hidden = !F.bridgeWalk;
    interiorHint.textContent =
      (S.interiorRoom || "FLIGHT DECK") +
      "  /  WASD WALK · Z DOOR / STATION · AIRLOCK TO DISEMBARK";
  }, 160);
  setInterval(render, 200);
  render();
  // Thin HUD tapes keep the forward view open, with shared simulation values.
  const tape = document.createElement("div");
  tape.id = "flightTapes";
  tape.innerHTML =
    '<div><small>VEL / M S⁻¹</small><b id="hudSpeed"></b><span class="tape-scale"></span><small id="hudMode"></small></div><div><small>ALT / M</small><b id="hudAltitude"></b><span class="tape-scale"></span><small id="hudDrive"></small></div>';
  document.querySelector("#citizenHUD").append(tape);
  setInterval(() => {
    tape.hidden = F.walking || F.bridgeWalk;
    $("hudSpeed").textContent = Math.round(F.speed * 1000);
    const alt = F.nearest().altitude;
    $("hudAltitude").textContent =
      alt > 99 ? alt.toFixed(0) + "k" : Math.max(0, Math.round(alt * 1000));
    $("hudMode").textContent =
      S.mode + " / " + (F.assist ? "IFCS" : "INERTIAL");
    $("hudDrive").textContent = F.drive.jump
      ? "SPOOL " + Math.round(F.vehicle.charge * 100) + "%"
      : "SHIELD " + Math.round(A.combat.shield) + "%";
  }, 140);
})();
