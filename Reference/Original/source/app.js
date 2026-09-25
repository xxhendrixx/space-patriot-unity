(async function () {
  "use strict";
  const C = LongwayCore,
    $ = (id) => document.getElementById(id),
    canvas = $("scene");
  const boot = LongwayBoot.attach();
  window.longwayBoot = boot;
  const issues = [],
    createdAt = new Date().toISOString();
  let toastTimer;
  function toast(text) {
    $("toast").textContent = text;
    $("toast").classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => $("toast").classList.remove("show"), 4200);
  }
  function error(text) {
    if (!boot.state.ready) boot.fail(text);
    issues.push({ at: new Date().toISOString(), message: String(text) });
    if (issues.length > 40) issues.shift();
    $("loading").hidden = true;
    $("errorText").textContent = String(text);
    $("error").hidden = false;
  }
  window.addEventListener("longway-error", (e) => error(e.detail));
  window.addEventListener("error", (e) => {
    if (e.error) error(e.message);
  });
  window.addEventListener("unhandledrejection", (e) => {
    error(e.reason?.message || String(e.reason || 'An asynchronous operation failed.'));
  });
  let world, flight, renderer, combat, systems, city;
  function diagnosticReport() {
    return {
      application: "Space Patriot",
      version: "11.1.0",
      createdAt,
      capturedAt: new Date().toISOString(),
      userAgent: navigator.userAgent,
      protocol: location.protocol,
      window: [innerWidth, innerHeight],
      devicePixelRatio: devicePixelRatio || 1,
      visibility: document.visibilityState,
      hardware: renderer?.hardware || null,
      renderer: renderer
        ? {
            ready: renderer.ready,
            pipeline: renderer.pipeline,
            lost: renderer.lost,
            frames: renderer.frame,
            renderSize: [canvas.width, canvas.height],
            quality: renderer.quality,
            adaptive: renderer.autoResolution,
            pixelBudget: renderer.pixelBudget,
            gpuPassMs: renderer.gpuMs,
            lossCount: renderer.lossCount,
          }
        : null,
      flight: flight
        ? {
            positionKm: flight.position.slice(),
            mode: flight.mode,
            walking: flight.walking,
            assist: flight.assist,
            grounded: flight.grounded,
            route: flight.route
              ? { time: flight.route.time, total: flight.route.total }
              : null,
          }
        : null,
      startup: boot.state.history.slice(),
      drive: flight?.drive
        ? {
            ...flight.drive,
            jump: flight.drive.jump
              ? {
                  state: flight.drive.jump.state,
                  target: flight.drive.jump.target.id,
                }
              : null,
          }
        : null,
      issues: issues.slice(),
      scope:
        "Local diagnostics only. Downloaded by you; not transmitted. GPU time is the render pass, not an uncapped engine FPS.",
    };
  }
  function exportDiagnostics() {
    download(
      new Blob([JSON.stringify(diagnosticReport(), null, 2)], {
        type: "application/json",
      }),
      "Longway_diagnostics.json",
    );
  }
  $("errorDiagnostics").onclick = exportDiagnostics;
  $("recoverRenderer").onclick = () => {
    try {
      if (!window.longway) { location.reload(); return; }
      if (!renderer)
        return error(
          "WebGL 2 was not available when this page opened. Open the saved HTML in Chrome or Edge with hardware acceleration enabled. Export diagnostics to identify the browser and renderer.",
        );
      renderer.requestRestore();
    } catch (e) {
      error(e.message);
    }
  };
  $("reloadPage").onclick = () => location.reload();
  try {
    await boot.paint();
    boot.begin("catalog");
    await boot.paint();
    world = new C.Universe(41827);
    boot.complete("catalog");
    boot.begin("pilot");
    await boot.paint();
    flight = new C.Flight(world);
    combat = new C.Combat(world, flight);
    systems = new C.VesselSystems(world, flight, combat);
    city = new C.CitySystems(world, flight, combat);
    boot.complete("pilot");
    boot.begin("graphics");
    await boot.paint();
    renderer = new LongwayRenderer(canvas, world, LONGWAY_SHADER);
    $("quality").value=String(renderer.quality);
    boot.complete("graphics");
    boot.begin(
      "shader",
      renderer.parallel
        ? "Compiling the terrain and atmosphere shaders for this graphics device."
        : "This driver has no asynchronous shader polling; compilation may briefly pause the browser.",
    );
    await boot.paint();
    const compileStart=performance.now(),deadline=compileStart+120000;
    while (!renderer.ensureReady()) {
      const elapsed=Math.floor((performance.now()-compileStart)/1000);
      if(elapsed>=8){$("bootNote").textContent='Graphics compilation · '+elapsed+' seconds · '+renderer.hardware.renderer;$("bootStage").textContent='Preparing graphics for this device';}
      if (performance.now() > deadline)
        throw new Error(
          "The graphics driver did not finish compiling within 120 seconds. Download diagnostics below to see the device and failed startup stage, or retry graphics in the full browser.",
        );
      await boot.paint();
    }
    boot.complete("shader");
    boot.begin(
      "surface",
      "Preparing the nearby landscape, ecology and ship instruments.",
    );
    await boot.paint();
    const body = flight.nearest().body;
    world.streamVegetation(flight.position, body, 40);
    world.streamFauna(flight.position, body);
    boot.complete("surface");
    boot.begin("frame", "Waiting for the first GPU frame to complete.");
  } catch (e) {
    error(e.message);
    return;
  }
  let selected = world.system([0, 0, 0])[1],
    started = false,
    running = true,
    lastTime = 0,
    time = 0,
    lastUI = 0,
    frameTimes = [],
    cpuTimes = [],
    keys = new Set(),
    drag = null,
    navCell = "",
    isTouch = navigator.maxTouchPoints > 0;
  let benchmark = null,
    lastReport = null,
    lastHardwareCheck = 0;
  const touch = { forward: 0, strafe: 0, lift: 0, boost: false };
  const clock = new LongwayRuntime.SimulationClock();
  let userPaused = false;
  const panels = [
    "navigation",
    "settings",
    "help",
    "ecology",
    "stationServices",
    "galaxy",
    "fleet",
    "sectorNavigation",
  ];
  function clearInput() {
    window.dispatchEvent(new Event("longway-input-clear"));
    if (flight?.drive) flight.drive.command.fill(0);
    keys.clear();
    touch.forward = touch.strafe = touch.lift = 0;
    touch.boost = false;
    drag = null;
    $("stickKnob").style.transform = "";
    clock.reset();
    lastTime = 0;
  }
  function focusScene() {
    canvas.focus({ preventScroll: true });
  }
  function refreshPauseUI() {
    if (!started) {
      $("pauseBanner").hidden = true;
      return;
    }
    $("pauseBanner").hidden = !isPaused() || !$("error").hidden;
    $("pauseText").textContent = userPaused
      ? "FLIGHT PAUSED"
      : "MENU OPEN · FLIGHT PAUSED";
  }
  function anyPanel() {
    if (window.BloxPause?.isOpen()) return true;
    return panels.some((id) => !$(id).hidden) || !!window.BloxUI?.isOpen();
  }
  function isPaused() {
    return userPaused || document.hidden || anyPanel() || !$("error").hidden;
  }
  function closePanels(except) {
    if (!except && window.BloxPause?.isOpen() && !BloxPause.routing) BloxPause.dismiss();
    for (const id of panels) if (id !== except) $(id).hidden = true;
    clearInput();
    if (document.pointerLockElement) document.exitPointerLock();
    if (!except) focusScene();
    refreshPauseUI();
  }
  function pauseGame(value) {
    userPaused = value;
    clearInput();
    if (userPaused && document.pointerLockElement) document.exitPointerLock();
    if (!userPaused) focusScene();
    $("pauseToggle").textContent = userPaused ? "Resume" : "Pause";
    refreshPauseUI();
  }
  window.addEventListener("longway-error", () => {
    clearInput();
    invalidateBenchmark("graphics device reset");
  });
  window.addEventListener("longway-restoring", () => {
    $("error").hidden = true;
    $("loading").hidden = false;
    $("loading").classList.add("recovery-loading");
    $("bootPercent").textContent = "GPU";
    $("bootStage").textContent = "Rebuilding graphics resources";
    $("bootNote").textContent =
      "Ship and progress retained. Waiting for the graphics driver; no invented percentage.";
    clearInput();
    resize();
  });
  window.addEventListener("longway-restored", () => {
    $("error").hidden = true;
    $("loading").hidden = true;
    $("loading").classList.remove("recovery-loading");
    $("quality").value = String(renderer.quality);
    $("resolutionSelect").value = "window";
    clearInput();
    focusScene();
    toast("Graphics restored. Your ship and progress were kept.");
  });
  $("pauseToggle").onclick = () => pauseGame(!userPaused);
  $("resumeFlight").onclick = () => {
    closePanels();
    pauseGame(false);
  };
  $("adaptiveResolution").onchange = () => {
    renderer.autoResolution = $("adaptiveResolution").checked;
    configChanged();
  };
  $("diagnostics").onclick = exportDiagnostics;
  $("scale").value = String(Math.round(renderer.scale * 100));
  $("scaleValue").textContent = $("scale").value + "%";
  const positionKey = "longway-flight-position-v1";
  function readSaved() {
    try {
      const s = JSON.parse(localStorage.getItem(positionKey) || "null");
      if (!s || s.seed !== world.seed) return null;
      for (const k of ["position", "forward", "up"])
        if (
          !Array.isArray(s[k]) ||
          s[k].length !== 3 ||
          !s[k].every(
            (x) =>
              typeof x === "number" && Number.isFinite(x) && Math.abs(x) < 1e14,
          )
        )
          return null;
      if (C.length(s.forward) < 0.5 || C.length(s.up) < 0.5) return null;
      return s;
    } catch {
      return null;
    }
  }
  function savePosition() {
    try {
      localStorage.setItem(
        positionKey,
        JSON.stringify({
          seed: world.seed,
          position: flight.position,
          forward: flight.forward,
          up: flight.up,
        }),
      );
      toast("Flight position saved on this device.");
    } catch {
      toast(
        "This browser blocked local storage. Your flight can still run normally.",
      );
    }
  }
  $("resume").hidden = !readSaved();
  function distance(km) {
    if (km < 0) km = 0;
    if (km < 1) return (km * 1000).toFixed(km < 0.01 ? 1 : 0) + " m";
    if (km < 1e4)
      return km.toLocaleString(undefined, { maximumFractionDigits: 1 }) + " km";
    if (km < 1e6) return Math.round(km).toLocaleString() + " km";
    return (km / 1e6).toFixed(2) + " M km";
  }
  function speed(km) {
    return km < 1
      ? (km * 1000).toFixed(km < 0.01 ? 1 : 0) + " m/s"
      : distance(km) + "/s";
  }
  function showPanel(id, visible, inline = false) {
    if (!inline && window.BloxPause?.handles(id)) return BloxPause.present(id, visible);
    const p = $(id),
      show = visible === undefined ? p.hidden : visible;
    closePanels(show ? id : undefined);
    p.hidden = !show;
    if (!show) focusScene();
    refreshPauseUI();
  }
  function lockMouse() {
    if (isTouch) return;
    try {
      const promise = canvas.requestPointerLock?.();
      promise?.catch?.(() =>
        toast(
          "Drag the scene to look. This browser did not allow mouse capture.",
        ),
      );
    } catch {
      toast("Drag the scene to look around.");
    }
  }
  function start(lock = false) {
    userPaused = false;
    $("pauseToggle").textContent = "Pause";
    started = true;
    $("intro").hidden = true;
    document.body.classList.remove("intro-open");
    $("touchControls").hidden = !isTouch;
    if (lock) lockMouse();
    canvas.focus({ preventScroll: true });
    window.LongwayFlightUI?.update();
  }
  function select(body) {
    selected = body;
    if (
      flight.drive &&
      !flight.drive.jump &&
      body.cell.join(",") !== world.cell(flight.position).join(",")
    )
      flight.setJumpTarget(body);
    $("selectedName").textContent = body.name;
    $("selectedKind").textContent = body.kind;
    for (const e of $("planetList").children)
      e.classList.toggle("selected", e.dataset.id === body.id);
  }
  function launch(orbit = false) {
    closePanels();
    start();
    flight.transfer(selected, orbit);
    toast(
      "Continuous flight to " +
        selected.name +
        ". Press X or move manually to take over.",
    );
  }
  function rebuildDirectory() {
    const cell = world.cell(flight.position),
      bodies = world.system(cell);
    navCell = cell.join(",");
    $("systemName").textContent = bodies[0].system;
    $("sectorName").textContent = "SECTOR " + cell.join(" · ");
    $("planetList").replaceChildren();
    for (const b of bodies) {
      const btn = document.createElement("button");
      btn.className = "planet-button";
      btn.dataset.id = b.id;
      btn.style.setProperty("--planet", b.color);
      btn.innerHTML =
        '<span class="planet-icon"></span><span class="planet-text"><b></b><small></small></span><span class="planet-distance"></span>';
      btn.querySelector("b").textContent = b.name;
      btn.querySelector("small").textContent = b.kind;
      btn.addEventListener("click", () => select(b));
      $("planetList").appendChild(btn);
    }
    $("neighborList").replaceChildren();
    for (const b of world.neighbors(flight.position)) {
      const btn = document.createElement("button");
      btn.textContent = b.system + " · [" + b.cell.join(", ") + "]";
      btn.addEventListener("click", () => {
        select(b);
        toast(
          "Selected " +
            b.system +
            ". Use Approach planet for a crossing with manual atmospheric entry.",
        );
      });
      $("neighborList").appendChild(btn);
    }
    select(selected);
  }
  function invalidateBenchmark(reason) {
    if (benchmark) {
      benchmark = null;
      $("benchmark").disabled = false;
      $("benchmark").textContent = "Record a 10-second benchmark";
      setQualityDisabled(false);
      toast("Benchmark cancelled: " + reason + ".");
    }
  }
  function setQualityDisabled(disabled) {
    for (const id of [
      "quality",
      "resolutionSelect",
      "scale",
      "view",
      "adaptiveResolution",
    ])
      $(id).disabled = disabled;
  }
  function configChanged() {
    renderer.needsRender = true;
    invalidateBenchmark("render settings changed");
    renderer.resetTimings();
    resize();
  }
  function resize() {
    renderer.resize(innerWidth, innerHeight, devicePixelRatio || 1);
  }
  $("start").onclick = () => start(true);
  $("tour").onclick = () => {
    select(world.system([0, 0, 0])[1]);
    launch();
  };
  $("resume").onclick = () => {
    const s = readSaved();
    if (!s) return toast("No valid saved position was found.");
    flight.cancel();
    flight.position = s.position;
    flight.forward = s.forward;
    flight.up = s.up;
    flight.orthogonalize();
    start();
    rebuildDirectory();
    toast("Saved position restored.");
  };
  $("navToggle").onclick = () => showPanel("navigation");
  $("closeNav").onclick = () => showPanel("navigation", false);
  $("settingsToggle").onclick = () => showPanel("settings");
  $("closeSettings").onclick = () => showPanel("settings", false);
  $("helpToggle").onclick = () => showPanel("help");
  $("closeHelp").onclick = () => showPanel("help", false);
  $("flySurface").onclick = () => launch(false);
  $("flyOrbit").onclick = () => launch(true);
  $("cancelRoute").onclick = () => {
    clearInput();
    focusScene();
    flight.cancel();
    toast("Manual flight engaged.");
  };
  $("quality").onchange = () => {
    renderer.setQuality(Number($("quality").value));
    configChanged();
  };
  $("scale").oninput = () => {
    renderer.scale = Number($("scale").value) / 100;
    $("scaleValue").textContent = $("scale").value + "%";
    configChanged();
  };
  $("resolutionSelect").onchange = () => {
    const v = $("resolutionSelect").value;
    renderer.fixed = v === "window" ? null : v.split("x").map(Number);
    configChanged();
  };
  $("view").onchange = () => {
    renderer.view = Number($("view").value);
    configChanged();
  };
  $("fullscreen").onclick = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await document.documentElement.requestFullscreen();
    } catch {
      toast(
        "Fullscreen is unavailable here. Browser full-screen mode also works.",
      );
    }
  };
  $("reset").onclick = () => {
    invalidateBenchmark("launch site reset");
    flight.reset();
    renderer.needsRender = true;
    select(world.system([0, 0, 0])[1]);
    rebuildDirectory();
    toast("Repositioned at Briar’s surface port.");
  };
  $("savePosition").onclick = savePosition;
  function download(blob, name) {
    const url = URL.createObjectURL(blob),
      a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 60000);
  }
  function screenshot() {
    invalidateBenchmark("scene capture");
    if (!renderer.render(flight, time))
      return toast(
        "The renderer is still starting or recovering. Capture after the world is visible.",
      );
    const capture=document.createElement('canvas');capture.width=innerWidth*(devicePixelRatio||1);capture.height=innerHeight*(devicePixelRatio||1);const ctx=capture.getContext('2d');ctx.drawImage(canvas,0,0,capture.width,capture.height);if(window.BloxVisuals?.enabled)ctx.drawImage(BloxVisuals.canvas,0,0,capture.width,capture.height);
    window.BloxArtwork?.paintTo(ctx,capture.width,capture.height);
    capture.toBlob((blob) => {
      if (blob) {
        download(
          blob,
          "Longway_" +
            flight.nearest().body.name.replace(/[^a-z0-9_-]/gi, "_") +
            ".png",
        );
        toast("Saved the actual rendered scene.");
      } else toast("The browser could not capture this canvas.");
    }, "image/png");
  }
  $("screenshot").onclick = screenshot;
  function mean(a) {
    return a.length ? a.reduce((s, v) => s + v, 0) / a.length : null;
  }
  function stats(a) {
    if (!a.length)
      return {
        samples: 0,
        meanMs: null,
        p50Ms: null,
        p95Ms: null,
        p99Ms: null,
      };
    const sorted = a.slice().sort((a, b) => a - b),
      pct = (p) =>
        sorted[
          Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))
        ];
    return {
      samples: a.length,
      meanMs: mean(a),
      p50Ms: pct(0.5),
      p95Ms: pct(0.95),
      p99Ms: pct(0.99),
    };
  }
  function startBenchmark() {
    if (benchmark) return;
    closePanels();
    start();
    lastReport = null;
    $("exportBenchmark").hidden = true;
    setQualityDisabled(true);
    benchmark = {
      warmupEnd: performance.now() + 2000,
      end: performance.now() + 12000,
      startFrame: renderer.frame,
      frames: [],
      startPosition: flight.position.slice(),
      startBody: flight.nearest().body.name,
      config: {
        quality: renderer.quality,
        maxMarchSteps: renderer.maxSteps,
        renderWidth: canvas.width,
        renderHeight: canvas.height,
        renderScale: renderer.scale,
        fixedResolution: !!renderer.fixed,
        tracerView: renderer.view,
        devicePixelRatio: devicePixelRatio || 1,
        windowWidth: innerWidth,
        windowHeight: innerHeight,
      },
    };
    $("benchmark").disabled = true;
    toast(
      "Benchmark started: 2 seconds of warm-up, then 10 seconds recorded. Keep this tab visible.",
    );
  }
  function completeBenchmark() {
    const b = benchmark;
    if (!b) return;
    const intervals = b.frames.map((f) => f.frameIntervalMs),
      fstats = stats(intervals),
      slowest = intervals
        .slice()
        .sort((a, b) => b - a)
        .slice(0, Math.max(1, Math.ceil(intervals.length * 0.01)));
    const gpu = renderer.samples
      .filter((s) => s.time >= b.warmupEnd && s.time <= b.end)
      .map((s) => s.ms);
    lastReport = {
      application: "Longway Living Universe",
      version: "5.0-blox-citizen",
      recordedAt: new Date().toISOString(),
      seed: world.seed,
      hardware: renderer.hardware,
      userAgent: navigator.userAgent,
      config: b.config,
      measuredScope:
        "Browser requestAnimationFrame intervals; CPU update plus rendering submission; optional asynchronous GPU render-pass elapsed time. Not a hardware-independent FPS result, native uncapped benchmark, or Unreal comparison.",
      scene: {
        startBody: b.startBody,
        startPositionKm: b.startPosition,
        endPositionKm: flight.position.slice(),
        activeBodies: renderer.active?.length || 0,
        worldMeshes: 0,
        screenTriangles: 1,
        worldSimulation:
          "15 worlds seeded from Cosmoplot catalog records; radial terrain, city and station SDFs, active local ecology and animals, gravity, buoyancy, heat hazards and ship economy. Kepler orbital motion and sidereal rotation; compressed distances and approximate liquids.",
      },
      browser: {
        ...fstats,
        averageAnimationFPS: fstats.meanMs ? 1000 / fstats.meanMs : null,
        onePercentLowFPS: slowest.length ? 1000 / mean(slowest) : null,
        onePercentLowDefinition:
          "Reciprocal of the mean of the slowest ceil(N*0.01) callback intervals.",
      },
      cpu: stats(b.frames.map((f) => f.cpuMs)),
      gpu: {
        ...stats(gpu),
        available: !!renderer.timer,
        disjointEvents: renderer.disjoints,
        scope:
          "Rendering pass only, excludes CPU and presentation. Unavailable is null, never estimated.",
      },
      frames: b.frames,
      gpuElapsedSamplesMs: gpu,
    };
    benchmark = null;
    setQualityDisabled(false);
    $("benchmark").disabled = false;
    $("benchmark").textContent = "Record another 10-second benchmark";
    $("exportBenchmark").hidden = false;
    toast("Measurement complete. Save the JSON report from Settings.");
  }
  $("benchmark").onclick = startBenchmark;
  $("exportBenchmark").onclick = () => {
    if (lastReport)
      download(
        new Blob([JSON.stringify(lastReport, null, 2)], {
          type: "application/json",
        }),
        "Longway_benchmark.json",
      );
  };
  function controlKey(e) {
    return !e.target.isContentEditable && !["INPUT", "SELECT", "TEXTAREA"].includes(
      e.target.tagName,
    );
  }
  window.addEventListener("keydown", (e) => {
    if (e.code === "Escape") {
      e.preventDefault();
      if (anyPanel()) closePanels();
      else pauseGame(!userPaused);
      return;
    }
    if (!controlKey(e)) return;
    if (
      [
        "Space",
        "Tab",
        "ArrowUp",
        "ArrowDown",
        "ArrowLeft",
        "ArrowRight",
        "ControlLeft",
        "ControlRight",
      ].includes(e.code)
    )
      e.preventDefault();
    if (e.code === "Tab") {
      if (!e.repeat) showPanel("navigation");
      return;
    }
    if (isPaused()) return;
    keys.add(e.code);
    if (e.repeat) return;

    if (e.code === "KeyX") {
      flight.cancel();
      toast("Braking · travel drives disengaged.");
    }
    if (e.code === "KeyP") screenshot();
    if (e.code === "KeyT") {
      let best = null,
        score = -1;
      for (const b of world.active(flight.position)) {
        const s = C.dot(
          C.unit(C.sub(b.center, flight.position)),
          flight.forward,
        );
        if (s > score) {
          score = s;
          best = b;
        }
      }
      if (best) {
        select(best);
        toast("Selected " + best.name + ".");
      }
    }
  });
  window.addEventListener("keyup", (e) => keys.delete(e.code));
  window.addEventListener("blur", () => {
    clearInput();
  });
  window.addEventListener("resize", () => {
    invalidateBenchmark("window size changed");
    resize();
  });
  document.addEventListener("visibilitychange", () => {
    clearInput();
    if (document.hidden) invalidateBenchmark("the tab became hidden");
  });
  document.addEventListener("pointerlockchange", () => {
    if (document.pointerLockElement !== canvas) clearInput();
    canvas.style.cursor =
      document.pointerLockElement === canvas ? "none" : "crosshair";
  });
  document.addEventListener("pointerlockerror", () =>
    toast("Mouse capture is unavailable. Click and drag the scene to look."),
  );
  canvas.addEventListener("pointerdown", (e) => {
    if (!started) start();
    if (isPaused()) return;
    canvas.focus({ preventScroll: true });
    if (e.pointerType === "touch") {
      if (!isTouch) {
        isTouch = true;
        document.body.classList.add("touch-mode");
        $("touchControls").hidden = false;
      }
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    } else if (document.pointerLockElement !== canvas) {
      drag = { id: e.pointerId, x: e.clientX, y: e.clientY };
      if (e.button === 0 && !flight.drive?.instruments) lockMouse();
    }
  });
  window.addEventListener("pointermove", (e) => {
    if (!started || isPaused()) return;
    if (document.pointerLockElement === canvas) {
      flight.look((e.movementX || 0) * 0.0021, -(e.movementY || 0) * 0.0021);
      return;
    }
    if (drag && e.pointerId === drag.id) {
      flight.look((e.clientX - drag.x) * 0.003, -(e.clientY - drag.y) * 0.003);
      drag.x = e.clientX;
      drag.y = e.clientY;
    }
  });
  window.addEventListener("pointerup", (e) => {
    if (drag && drag.id === e.pointerId) drag = null;
  });
  window.addEventListener("pointercancel", () => (drag = null));
  canvas.addEventListener(
    "wheel",
    (e) => {
      e.preventDefault();
      if (isPaused()) return;
      flight.throttle = C.clamp(
        flight.throttle * Math.exp(-e.deltaY * 0.0013),
        0.05,
        128,
      );
    },
    { passive: false },
  );
  let stickPointer = null;
  function moveStick(e) {
    const r = $("stick").getBoundingClientRect(),
      dx = C.clamp((e.clientX - r.left - r.width / 2) / 38, -1, 1),
      dy = C.clamp((e.clientY - r.top - r.height / 2) / 38, -1, 1),
      m = Math.max(1, Math.hypot(dx, dy));
    touch.strafe = dx / m;
    touch.forward = -dy / m;
    $("stickKnob").style.transform =
      `translate(${(dx / m) * 31}px,${(dy / m) * 31}px)`;
  }
  $("stick").addEventListener("pointerdown", (e) => {
    if (isPaused()) return;
    start();
    stickPointer = e.pointerId;
    $("stick").setPointerCapture(e.pointerId);
    moveStick(e);
  });
  $("stick").addEventListener("pointermove", (e) => {
    if (e.pointerId === stickPointer) moveStick(e);
  });
  for (const name of ["pointerup", "pointercancel", "lostpointercapture"])
    $("stick").addEventListener(name, () => {
      stickPointer = null;
      touch.forward = touch.strafe = 0;
      $("stickKnob").style.transform = "";
    });
  for (const [id, value] of [
    ["touchUp", 1],
    ["touchDown", -1],
    ["touchBoost", true],
  ]) {
    const el = $(id);
    el.addEventListener("pointerdown", (e) => {
      if (isPaused()) return;
      start();
      el.setPointerCapture(e.pointerId);
      if (id === "touchBoost") touch.boost = true;
      else touch.lift = value;
    });
    for (const event of ["pointerup", "pointercancel", "lostpointercapture"])
      el.addEventListener(event, () => {
        if (id === "touchBoost") touch.boost = false;
        else touch.lift = 0;
      });
  }
  function input(dt) {
    if (!started || isPaused()) return {};
    const pad=window.LongwayInput?.state||{};
    const has = (...names) => names.some((n) => keys.has(n)),
      axis = (p, n) => Number(has(...p)) - Number(has(...n));
    flight.look(
      (axis(["ArrowRight"], ["ArrowLeft"])+(pad.lookX||0)) * dt * 1.4,
      (axis(["ArrowUp"], ["ArrowDown"])+(pad.lookY||0)) * dt * 1.4,
      !flight.walking && !flight.bridgeWalk
        ? (axis(["KeyE", "BracketRight"], ["KeyQ", "BracketLeft"])+(pad.roll||0)) * dt * 1.2
        : 0,
    );
    return {
      forward: C.clamp(axis(["KeyW"], ["KeyS"]) + touch.forward+(pad.forward||0), -1, 1),
      strafe: C.clamp(axis(["KeyD"], ["KeyA"]) + touch.strafe+(pad.strafe||0), -1, 1),
      lift: C.clamp(
        axis(["Space"], ["ControlLeft", "ControlRight"]) + touch.lift+(pad.lift||0),
        -1,
        1,
      ),
      boost: has("ShiftLeft", "ShiftRight") || touch.boost || pad.boost,
      cruise: false,
      brake: has("KeyX") || pad.brake,
    };
  }
  function updateHUD(now) {
    refreshPauseUI();
    const near = flight.nearest(),
      avg = mean(frameTimes),
      cpu = mean(cpuTimes),
      gpu = renderer.gpuMs;
    $("fps").textContent =
      !started || isPaused() ? "—" : avg ? (1000 / avg).toFixed(0) : "—";
    $("gpu").textContent = gpu == null ? "n/a" : gpu.toFixed(gpu < 1 ? 3 : 2);
    $("gpuDetail").textContent =
      gpu == null
        ? renderer.timer
          ? "Waiting for query"
          : "Timing unavailable · WebGL renderer active"
        : gpu.toFixed(3) + " ms";
    $("resolution").textContent = canvas.width + " × " + canvas.height;
    $("cpu").textContent = cpu == null ? "—" : cpu.toFixed(2) + " ms";
    $("frameInterval").textContent = avg == null ? "—" : avg.toFixed(2) + " ms";
    $("bodyCount").textContent = String(renderer.active?.length || 0);
    $("locationName").textContent = near.body.name;
    $("altitude").textContent = distance(near.altitude);
    $("velocity").textContent = speed(flight.speed);
    $("throttle").textContent =
      flight.throttle.toFixed(flight.throttle < 10 ? 2 : 1) + "×";
    $("flightMode").textContent = flight.route
      ? flight.mode
      : flight.collided
        ? "SURFACE SAFETY LIMIT"
        : flight.mode;
    $("coordinates").textContent =
      near.body.system.toUpperCase() +
      " SYSTEM · SECTOR " +
      world.cell(flight.position).join(" / ") +
      " · " +
      world.visited.size +
      " VISITED";
    if (world.cell(flight.position).join(",") !== navCell) rebuildDirectory();
    for (const btn of $("planetList").children) {
      const b = world
        .system(world.cell(flight.position))
        .find((b) => b.id === btn.dataset.id);
      if (b)
        btn.querySelector(".planet-distance").textContent = distance(
          C.length(C.sub(b.center, flight.position)) - b.radius,
        );
    }
    $("routeStatus").hidden = !flight.route;
    if (flight.route) {
      $("routeLabel").textContent = flight.mode;
      $("routeProgress").style.width =
        ((flight.route.time / flight.route.total) * 100).toFixed(2) + "%";
    }
    const camera = flight.renderPose?.() || flight,
      rel = C.sub(selected.center, camera.position),
      z = C.dot(rel, camera.forward),
      marker = $("targetMarker");
    if (z > 0) {
      const aspect = canvas.width / canvas.height,
        x = C.dot(rel, camera.right) / (z * renderer.fov * aspect),
        y = C.dot(rel, camera.up) / (z * renderer.fov);
      const scale = Math.min(
          innerWidth / canvas.width,
          innerHeight / canvas.height,
        ),
        w = canvas.width * scale,
        h = canvas.height * scale;
      const visible = Math.abs(x) < 0.92 && Math.abs(y) < 0.8;
      marker.hidden = !visible;
      if (visible) {
        marker.style.left = (innerWidth - w) / 2 + (x * 0.5 + 0.5) * w + "px";
        marker.style.top = (innerHeight - h) / 2 + (0.5 - y * 0.5) * h + "px";
        $("markerName").textContent = selected.name.toUpperCase();
        $("markerDistance").textContent = distance(
          C.length(rel) - selected.radius,
        );
      }
    } else marker.hidden = true;
    window.LongwayLivingUI?.update(now);
    window.LongwayExpeditionUI?.update(now);
    window.LongwayFlightUI?.update(now);
    window.BloxUI?.update(now);
    window.PlanetEngineUI?.update();
    if (benchmark) {
      const remain = Math.max(0, (benchmark.end - now) / 1000);
      $("benchmark").textContent =
        now < benchmark.warmupEnd
          ? "Warming up…"
          : "Recording… " + remain.toFixed(1) + " seconds";
    }
  }
  function frame(now) {
    if (!running) return;
    const raw = lastTime ? Math.max(0, now - lastTime) : 0;
    lastTime = now;
    try {
      window.LongwayInput?.poll(now);
      if (raw > 0 && raw < 10000 && renderer.ready && started && !isPaused()) {
        frameTimes.push(raw);
        if (frameTimes.length > 90) frameTimes.shift();
      }
      const begin = performance.now();
      if (
        started &&
        (!isPaused() || window.longway?.network?.links.size ||
          (!userPaused && !document.hidden && window.BloxUI?.isLiveDialog())) &&
        !renderer.lost &&
        renderer.ready
      ) {
        clock.consume(raw / 1000, (dt) => {
          if (!combat.dead) flight.update(dt, isPaused() ? {} : input(dt));
          combat.update(dt);
          window.longway?.fieldStory?.update(dt);
          time += dt;
        });
      } else clock.reset();
      // Resizing clears the drawing buffer. Do it BEFORE the frame is drawn.
      if (!benchmark && started && !isPaused() && renderer.adapt(raw, now)) resize();
      if (
        !renderer.lost &&
        $("error").hidden &&
        (!renderer.ready || renderer.needsRender || (started && (!isPaused() || (!userPaused && !document.hidden && window.BloxUI?.isLiveDialog()))))
      ) {
        renderer.materials?.capture(flight, time);
        renderer.render(flight, time);
      }
      const cpu = performance.now() - begin;
      cpuTimes.push(cpu);
      if (cpuTimes.length > 90) cpuTimes.shift();
      if (
        benchmark &&
        now >= benchmark.warmupEnd &&
        now <= benchmark.end &&
        raw > 0
      )
        benchmark.frames.push({
          frame: renderer.frame,
          frameIntervalMs: raw,
          cpuMs: cpu,
          altitudeKm: flight.altitude(),
          flightMode: flight.mode,
        });
      if (benchmark && now > benchmark.end) completeBenchmark();

      if (now - lastUI > 160) {
        updateHUD(now);
        lastUI = now;
      }
      if (
        renderer.ready &&
        !renderer.lost &&
        window.longwayVisualState?.ready &&
        !boot.state.ready &&
        !boot.state.error
      ) {
        const gl = renderer.gl;
        if (!boot.frameStarted) boot.frameStarted = performance.now();
        if (performance.now() - boot.frameStarted > 30000)
          throw new Error('The first graphics frame did not complete. Retry graphics or reload the page.');
        if (!boot.fence && renderer.frame > 0) {
          boot.fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
          if (!boot.fence)
            throw new Error(
              "First-frame synchronization could not be created.",
            );
          gl.flush();
        }
        if (boot.fence) {
          const status = gl.clientWaitSync(boot.fence, 0, 0);
          if (status === gl.WAIT_FAILED)
            throw new Error("First-frame GPU synchronization failed.");
          if (
            status === gl.ALREADY_SIGNALED ||
            status === gl.CONDITION_SATISFIED
          ) {
            gl.deleteSync(boot.fence);
            boot.fence = null;
            const code = gl.getError();
            if (code !== gl.NO_ERROR)
              throw new Error("First-frame graphics error: " + code);
            boot.complete("frame");
            boot.finish();
          }
        }
      }
      window.LongwayFlightUI?.project();
      window.BloxUI?.frame(now);
    } catch (e) {
      clearInput();
      error(e.message || String(e));
      invalidateBenchmark("runtime error");
    }
    requestAnimationFrame(frame);
  }
  document.body.classList.add("intro-open");
  if (isTouch) document.body.classList.add("touch-mode");
  $("gpuBackend").textContent = renderer.software ? "SOFTWARE RENDERER · GPU acceleration is not active" : /Apple|NVIDIA|AMD|Intel|Adreno|Mali|Metal/i.test(renderer.hardware.renderer) ? "GPU RENDERING ACTIVE · WebGL 2" : "WEBGL 2 ACTIVE · Browser does not identify its graphics device";
  $("hardware").textContent =
    renderer.hardware.renderer +
    (renderer.timer
      ? " · GPU timing supported."
      : " · GPU timing unavailable in this browser.");
  if (/swiftshader|llvmpipe|software/i.test(renderer.hardware.renderer)) {
    const warn = document.createElement("span");
    warn.className = "software-warning";
    warn.textContent = "SOFTWARE GRAPHICS · LOW RES";
    document.querySelector(".performance-strip").appendChild(warn);
  }
  rebuildDirectory();
  resize();
  requestAnimationFrame(frame);
  // Transparent inspection hooks, also used by the supplied automated tests. No fabricated counters.
  window.longway = {
    world,
    flight,
    combat,
    systems,
    city,
    renderer,
    clock,
    start,
    select,
    launch,
    resize,
    toast,
    download,
    showPanel,
    closePanels,
    clearInput,
    focusScene,
    isPaused,
    setPaused: pauseGame,
    diagnosticReport,
    rebuildDirectory,
    lockMouse,
    get selected() {
      return selected;
    },
    check: () => renderer.check(),
    savePosition,
    startBenchmark,
    get report() {
      return lastReport;
    },
    get benchmark() {
      return benchmark;
    },
    pause() {
      running = false;
    },
    resume() {
      if (!running) {
        running = true;
        lastTime = 0;
        requestAnimationFrame(frame);
      }
    },
    render() {
      renderer.render(flight, time);
      updateHUD(performance.now());
    },
    fixture(bodyIndex, mode = "orbit") {
      invalidateBenchmark("explicit inspection reposition");
      flight.place(world.system([0, 0, 0])[bodyIndex], mode);
      select(world.system([0, 0, 0])[bodyIndex]);
      this.render();
    },
    step(dt) {
      flight.update(dt, {});
      time += dt;
    },
    get started() {
      return started;
    },
  };
  window.longway.celestial = new C.CelestialSystem(window.longway);
  // A background host continues serving its crew when requestAnimationFrame is throttled.
  setInterval(() => {
    if (
      !document.hidden ||
      !started ||
      !window.longway?.network?.links.size ||
      window.longway.network.role !== "host"
    )
      return;
    const now = performance.now(),
      elapsed = lastTime ? Math.max(0, now - lastTime) / 1000 : 0;
    lastTime = now;
    clock.consume(elapsed, (dt) => {
      if (!combat.dead) flight.update(dt, {});
      combat.update(dt);
          window.longway?.fieldStory?.update(dt);
      time += dt;
    });
    window.longway.network.tick(now);
  }, 100);
  window.dispatchEvent(new Event("longway-ready"));
})();
