/* Flight deck controls: the same actions are bound to keys, 3-D ray hits and
   accessible projected labels. Opening a menu never leaves a thrust key held. */
(function initFlightUI() {
  "use strict";
  if (!window.longway) {
    window.addEventListener("longway-ready", initFlightUI, { once: true });
    return;
  }
  const A = window.longway,
    C = LongwayCore,
    f = A.flight,
    w = A.world,
    $ = (id) => document.getElementById(id),
    canvas = $("scene"),
    tap = new C.DoubleTap(320);
  const labels = $("cockpitLabels"),
    buttons = C.CockpitLayout.definitions.map((definition, index) => {
      const b = document.createElement("button");
      b.className = "cockpit-label";
      b.dataset.control = definition[0];
      b.setAttribute("aria-label", definition[1]);
      b.title = definition[3];
      b.textContent = definition[2];
      b.onclick = (e) => {
        e.stopPropagation();
        activate(index);
      };
      labels.appendChild(b);
      return b;
    });
  let lastPointer = null,
    hover = null,
    lastSector = "",
    controls = [];
  function active() {
    return (
      !window.BloxArtwork?.active &&
      A.started &&
      !A.isPaused() &&
      !f.walking &&
      !f.vehicle.transition &&
      f.cameraMode === "cockpit"
    );
  }
  function announce() {
    A.toast(f.message || "Control applied.");
    A.renderer.needsRender = true;
    A.focusScene();
  }
  function activate(index) {
    if (A.isPaused() || f.walking || f.vehicle.transition) return false;
    A.start();
    const action = C.CockpitLayout.definitions[index][0];
    let ok = true;
    if (action === "power") ok = f.togglePower();
    else if (action === "assist") ok = f.toggleAssist();
    else if (action === "gear") ok = f.toggleGear();
    else if (action === "lights") ok = f.toggleLights();
    else if (action === "tactical") ok = f.tacticalBoost();
    else if (action === "cruise") ok = f.toggleCruise();
    else if (action === "hyper") ok = f.toggleHyper();
    else if (action === "landing")
      ok = ["landed", "docked"].includes(f.vehicle.state)
        ? f.takeoff()
        : f.land();
    else if (action === "sector") {
      openSectors();
      return true;
    } else if (action === "scan") {
      f.scan();
    } else if (action === "atlas") {
      $("atlasToggle").click();
      return true;
    } else if (action === "camera") ok = f.toggleCamera();
    f.drive.buttonPulse = index;
    f.drive.pulseTime = 0.32;
    announce();
    update();
    return ok;
  }
  function openSectors() {
    if (f.walking || f.vehicle.transition) {
      f.message = "Board the ship before configuring a sector crossing.";
      announce();
      return;
    }
    renderSectors();
    A.showPanel("sectorNavigation", true);
  }
  function renderSectors() {
    const target = f.jumpDestination();
    $("sectorTarget").textContent = target
      ? target.system + " · " + target.name
      : "No destination";
    $("sectorOptions").replaceChildren();
    const list = w.neighbors(f.position);
    if (target && !list.some((b) => b.cell.join(",") === target.cell.join(",")))
      list.unshift(target);
    for (const b of list) {
      const node = document.createElement("button");
      node.className =
        "sector-choice" +
        (target?.cell.join(",") === b.cell.join(",") ? " selected" : "");
      node.dataset.target = b.id;
      const worlds = w.system(b.cell);
      node.innerHTML = "<small></small><strong></strong><span></span><em></em>";
      node.querySelector("small").textContent = "SECTOR " + b.cell.join(" / ");
      node.querySelector("strong").textContent = b.system;
      node.querySelector("span").textContent = worlds
        .slice(0, 3)
        .map((x) => x.name)
        .join(" · ");
      node.querySelector("em").textContent =
        "Researched worlds · " +
        worlds
          .slice(0, 3)
          .map((x) => x.kind)
          .join(" / ");
      node.onclick = () => {
        f.setJumpTarget(b);
        renderSectors();
        A.toast(f.message);
      };
      $("sectorOptions").appendChild(node);
    }
    const safe = f.hyperSafe();
    $("sectorSafety").textContent = f.drive.jump
      ? "Sector drive already engaged. H or X cancels."
      : safe
        ? "Clear for departure. Two-second spool, then exterior arrival and a gradual stop. Enter and land manually."
        : "Before departure: launch, retract gear, clear the surface and station, start engines, and retain at least 8% fuel.";
    $("beginSectorJump").disabled = !!f.drive.jump || !safe;
  }
  $("sectorToggle").onclick = openSectors;
  $("sectorAction").onclick = openSectors;
  $("closeSectors").onclick = () => A.showPanel("sectorNavigation", false);
  $("beginSectorJump").onclick = () => {
    A.closePanels();
    A.start();
    f.toggleHyper();
    announce();
  };
  function instruments() {
    A.start();
    if (f.toggleInstruments()) {
      A.clearInput();
      if (f.drive.instruments) {
        if (document.pointerLockElement) document.exitPointerLock();
      } else A.lockMouse();
      announce();
      update();
    }
  }
  const jumpHint=document.createElement('div');jumpHint.id='jumpReticle';jumpHint.hidden=true;document.body.append(jumpHint);
  setInterval(()=>{
    const flying=A.started&&!A.isPaused()&&!f.walking&&!f.bridgeWalk&&f.vehicle.state==='flight';
    document.body.classList.toggle('hud-cursor',!!f.drive.instruments&&!f.walking&&!f.bridgeWalk);
    const target=flying?f.reticleTarget():null;
    jumpHint.hidden=!flying||(A.combat.armed&&A.combat.target&&!f.drive.jump&&!f.drive.instruments)||(!target&&!f.drive.instruments&&!f.drive.jump);
    jumpHint.textContent=f.drive.jump?'JUMP '+f.drive.jump.state.toUpperCase()+' · X CANCEL':f.drive.instruments?'HUD CURSOR · Z TO STEER':target?target.name.toUpperCase()+' · '+target.distance.toFixed(0)+' km · H JUMP':'';
  },150);
  $("instrumentMode").onclick = instruments;
  $("tacticalAction").onclick = () => activate(4);
  $("cruiseAction").onclick = () => activate(5);
  // Fresh presses only: holding W (including OS repeat) cannot create a burst.
  window.addEventListener(
    "keydown",
    (e) => {
      if (["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName)) return;
      if (e.code === "KeyW") {
        if (
          A.started &&
          !A.isPaused() &&
          tap.press(e.code, e.timeStamp, e.repeat) &&
          !f.walking && !f.bridgeWalk
        ) {
          f.tacticalBoost();
          announce();
        }
      }
      if (["KeyZ", "KeyI"].includes(e.code) && !f.walking && !f.bridgeWalk && !e.repeat && !A.isPaused()) {
        e.preventDefault();
        e.stopImmediatePropagation();
        instruments();
      }
    },
    true,
  );
  window.addEventListener("keyup", (e) => tap.release(e.code), true);
  window.addEventListener("longway-input-clear", () => tap.reset());
  window.addEventListener("blur", () => tap.reset());
  function cameraRay(x, y) {
    const p = f.renderPose(),
      r = A.renderer,
      scale = Math.min(innerWidth / canvas.width, innerHeight / canvas.height),
      rw = canvas.width * scale,
      rh = canvas.height * scale,
      nx = ((x - (innerWidth - rw) / 2) / rw) * 2 - 1,
      ny = 1 - ((y - (innerHeight - rh) / 2) / rh) * 2;
    return {
      position: p.position,
      direction: C.unit(
        C.add(
          p.forward,
          C.add(
            C.mul(p.right, (nx * r.fov * canvas.width) / canvas.height),
            C.mul(p.up, ny * r.fov),
          ),
        ),
      ),
    };
  }
  canvas.addEventListener(
    "pointerdown",
    (e) => {
      if (!active() || !f.drive.instruments || e.button !== 0) return;
      const locked = document.pointerLockElement === canvas,
        r = cameraRay(
          locked ? innerWidth / 2 : e.clientX,
          locked ? innerHeight / 2 : e.clientY,
        ),
        hit = C.CockpitLayout.pick(f, r.position, r.direction);
      if (hit) {
        e.preventDefault();
        e.stopImmediatePropagation();
        activate(hit.index);
      }
    },
    true,
  );
  window.addEventListener("pointermove", (e) => {
    lastPointer = [e.clientX, e.clientY];
  });
  function project() {
    const shown = active();
    $("cockpitLabels").hidden = !shown || !f.drive.instruments;
    $("instrumentBanner").hidden = !shown || !f.drive.instruments;
    if (!shown || !f.drive.instruments) {
      $("cockpitTooltip").hidden = true;
      return;
    }
    const p = f.renderPose(),
      vf = f.vehicleFrame(),
      r = A.renderer,
      aspect = canvas.width / canvas.height,
      scale = Math.min(innerWidth / canvas.width, innerHeight / canvas.height),
      rw = canvas.width * scale,
      rh = canvas.height * scale,
      states = C.CockpitLayout.states(f);
    controls = C.CockpitLayout.controls(f.craft);
    controls.forEach((b, i) => {
      const wp = C.add(
          vf.position,
          C.mul(
            C.add(
              C.mul(vf.right, b.center[0]),
              C.add(
                C.mul(vf.up, b.center[1]),
                C.mul(vf.forward, b.center[2] - 0.04),
              ),
            ),
            0.001,
          ),
        ),
        rel = C.sub(wp, p.position),
        z = C.dot(rel, p.forward),
        nx = C.dot(rel, p.right) / (z * r.fov * aspect),
        ny = C.dot(rel, p.up) / (z * r.fov),
        button = buttons[i];
      button.hidden = z <= 0 || Math.abs(nx) > 1.02 || Math.abs(ny) > 1.02;
      if (!button.hidden) {
        button.style.left =
          (innerWidth - rw) / 2 + (nx * 0.5 + 0.5) * rw + "px";
        button.style.top =
          (innerHeight - rh) / 2 + (0.5 - ny * 0.5) * rh + "px";
        button.classList.toggle("on", states[i] > 0.5);
        button.setAttribute("aria-pressed", states[i] > 0.5 ? "true" : "false");
      }
    });
    const at =
        document.pointerLockElement === canvas
          ? [innerWidth / 2, innerHeight / 2]
          : lastPointer || [innerWidth / 2, innerHeight / 2],
      ray = cameraRay(...at);
    hover = C.CockpitLayout.pick(f, ray.position, ray.direction);
    buttons.forEach((b, i) =>
      b.classList.toggle("hovered", hover?.index === i),
    );
    $("cockpitTooltip").hidden = !hover;
    if (hover)
      $("cockpitTooltip").textContent = hover.name + " · " + hover.description;
  }
  function update() {
    const d = f.drive,
      v = f.vehicle,
      show = A.started && !f.walking;
    document.body.classList.toggle(
      "cockpit-active",
      show && f.cameraMode === "cockpit",
    );
    document.body.classList.toggle(
      "instrument-active",
      show && f.cameraMode === "cockpit" && d.instruments,
    );
    $("driveTelemetry").hidden = !show;
    $("driveShortcuts").hidden = !show;
    $("driveMode").textContent = d.flightMode;
    const sp = f.speed;
    $("cruiseReadout").textContent =
      sp >= 1
        ? sp.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " km/s"
        : Math.round(sp * 1000) + " m/s";
    $("capacitorReadout").textContent = Math.round(d.capacitor * 100) + "%";
    $("capacitorBar").style.width = d.capacitor * 100 + "%";
    const j = d.jump,
      progress = j
        ? j.state === "charging"
          ? j.time / 4
          : f.route
            ? f.route.time / f.route.total
            : 1
        : d.cruiseSpool;
    $("driveSpool").textContent = j
      ? j.state === "charging"
        ? "SECTOR SPOOL"
        : "SECTOR TRANSIT"
      : "CRUISE SPOOL";
    $("driveSpoolBar").style.width = C.clamp(progress * 100, 0, 100) + "%";
    $("driveWarning").textContent = j
      ? j.target.system + " / " + j.target.cell.join(" · ")
      : d.limitReason ||
        (!d.power
          ? "MAIN BUS OFFLINE"
          : d.tacticalCooldown > 0
            ? "BURST RECHARGE " + d.tacticalCooldown.toFixed(1) + "s"
            : "SHIFT: BOOST · W,W: TACTICAL");
    $("instrumentMode").textContent = d.instruments
      ? "Pilot mode [Z]"
      : "HUD cursor [Z]";
    $("cruiseAction").classList.toggle("active", d.cruiseLatched);
    $("tacticalAction").disabled =
      v.state !== "flight" ||
      v.gear > 0.02 ||
      d.tacticalCooldown > 0 ||
      d.capacitor < 0.34;
    if (!$("sectorNavigation").hidden) {
      const key =
        w.cell(f.position).join(",") + (d.jump?.state || "") + f.hyperSafe();
      if (key !== lastSector) {
        lastSector = key;
        renderSectors();
      }
    }
    project();
  }
  window.LongwayFlightUI = {
    activate,
    project,
    update,
    openSectors,
    cameraRay,
    get hover() {
      return hover;
    },
  };
  update();
})();
