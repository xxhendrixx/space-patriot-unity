/* Living Universe UI. No external requests; progress stays local unless explicitly exported. */
(function initLiving() {
  "use strict";
  if (!window.longway) {
    window.addEventListener("longway-ready", initLiving, { once: true });
    return;
  }
  const A = window.longway,
    C = LongwayCore,
    W = A.world,
    F = A.flight,
    $ = (id) => document.getElementById(id),
    toast = A.toast;
  const KEY = "longway-living-universe-v2";
  let pageIndex = Math.floor(A.selected.index / 12),
    matches = W.catalog,
    detailId = "",
    ecoId = "",
    marketId = "",
    atlasAngle = -0.45,
    mapPoints = [],
    drag = null,
    lastSave = 0,
    lastMsg = "",
    audio = null;
  const distance = (km) =>
    km < 1
      ? (Math.max(0, km) * 1000).toFixed(0) + " m"
      : km < 1e6
        ? Math.max(0, km).toLocaleString(undefined, {
            maximumFractionDigits: 0,
          }) + " km"
        : (km / 1e6).toFixed(2) + " M km";
  const finiteMoney = (n) => Math.round(n).toLocaleString();
  function closeOthers(except) {
    A.closePanels(except);
  }
  function panel(id, show) {
    A.showPanel(id, show);
    if (!$(id).hidden && id === "galaxy") {
      renderAtlas();
      drawMap();
    }
    if (!$(id).hidden && id === "ecology") refreshEcology(true);
    if (!$(id).hidden && id === "stationServices") refreshStation(true);
  }

  function announce() {
    if (F.message) {
      toast(F.message);
      lastMsg = F.message;
    }
  }
  function openAtlas() {
    panel("galaxy");
  }
  function beginStation(b = A.selected) {
    closeOthers();
    A.start();
    F.toStation(b);
    toast(
      "Flying to " +
        W.station(b).name +
        ". The last leg passes through the open hangar.",
    );
  }
  function pick(b) {
    A.select(b);
    detailId = "";
    refreshSelection();
    drawMap();
    if (!$("galaxy").hidden) renderCards();
  }
  function refreshSelection() {
    const b = A.selected;
    if (detailId === b.id) return;
    detailId = b.id;
    $("destinationFacts").textContent =
      b.gravity.toFixed(2) +
      " m/s² · " +
      b.temperature.toFixed(0) +
      " °C · " +
      ["No open liquid", "Water", "Molten lava", "Acid brine"][b.liquid] +
      " · " +
      b.population.toLocaleString() +
      " colonists";
    $("atlasDetail").innerHTML =
      '<div class="tag"></div><h3></h3><div class="atlas-grid"></div>';
    $("atlasDetail").querySelector(".tag").textContent =
      b.id + " / " + b.system.toUpperCase();
    $("atlasDetail").querySelector("h3").textContent = b.name;
    const facts = [
      ["ECOLOGICAL FAMILY", b.kind],
      ["DERIVED GRAVITY", b.gravity.toFixed(2) + " m/s²"],
      ["GAME CLIMATE", b.temperature.toFixed(0) + " °C"],
      ["CATALOG RADIUS", b.physicalRadiusKm.toFixed(0) + " km"],
      ["CATALOG MASS", (b.catalog.massEarth??0).toFixed(3)+" Earths"],
      ["ORBITAL PERIOD", (b.catalog.orbitalPeriodDays??0).toFixed(3)+" days"],
      ["LIQUID", ["None / habitat", "Water", "Lava", "Acid brine"][b.liquid]],
      ["SETTLEMENT", b.population.toLocaleString() + " residents"],
    ];
    for (const [label, value] of facts) {
      const e = document.createElement("div"),
        small = document.createElement("small");
      small.textContent = label;
      e.appendChild(small);
      e.appendChild(document.createTextNode(value));
      $("atlasDetail").querySelector(".atlas-grid").appendChild(e);
    }
    const note=document.createElement('p');note.className='catalog-provenance';note.textContent='Real catalog seed · '+b.seed+'. Terrain, settlements and ecosystems are fictional. Planet sizes and orbital distances are compressed for play.';
    const source=document.createElement('a');source.href='https://cosmoplot.io/';source.target='_blank';source.rel='noopener';source.textContent='Cosmoplot / NASA catalog provenance ↗';note.append(document.createElement('br'),source);if(b.host.research){const link=document.createElement('a');link.href=b.host.research.source;link.target='_blank';link.rel='noopener';link.textContent='Read the system research profile ↗';note.append(document.createElement('br'),link);}if(b.host.jwst){note.append(document.createElement('br'),document.createTextNode('JWST archive: '+b.host.jwst.observations.length+' host-system observation records. These are not surface maps.'));}$("atlasDetail").appendChild(note);
    $("atlasIndex").value = b.index + 1;
  }
  function filterAtlas(reset = true) {
    const q = $("atlasSearch").value.trim().toLowerCase(),
      family = Number($("biomeFilter").value);
    matches = W.catalog.filter(
      (b) =>
        (family < 0 || b.biome === family) &&
        (!q ||
          (
            b.name +
            " " +
            b.system +
            " " +
            b.id +
            " " +
            b.kind +
            " " +
            (b.index + 1)
          )
            .toLowerCase()
            .includes(q)),
    );
    if (reset) pageIndex = 0;
    renderCards();
  }
  function renderCards() {
    const pages = Math.max(1, Math.ceil(matches.length / 12));
    pageIndex = C.clamp(pageIndex, 0, pages - 1);
    $("matchCount").textContent =
      matches.length.toLocaleString() + " matching worlds";
    $("pageLabel").textContent = "PAGE " + (pageIndex + 1) + " / " + pages;
    $("prevPage").disabled = pageIndex === 0;
    $("nextPage").disabled = pageIndex >= pages - 1;
    $("atlasList").replaceChildren();
    for (const b of matches.slice(pageIndex * 12, pageIndex * 12 + 12)) {
      const btn = document.createElement("button");
      btn.className =
        "atlas-card" + (A.selected.id === b.id ? " selected" : "");
      btn.dataset.id = b.id;
      btn.style.setProperty("--planet", b.color);
      btn.innerHTML =
        '<span class="planet-disc"></span><span class="card-info"><b></b><small></small></span>';
      btn.querySelector("b").textContent = b.name;
      btn.querySelector("small").textContent = b.kind.toUpperCase();
      btn.onclick = () => pick(b);
      $("atlasList").appendChild(btn);
    }
    if (!matches.length) {
      const p = document.createElement("p");
      p.textContent =
        "No matches. Try a shorter name, catalog number, or a different biome filter.";
      $("atlasList").appendChild(p);
    }
  }
  function renderAtlas() {
    refreshSelection();
    filterAtlas(false);
    drawMap();
  }
  function drawMap() {
    const cv = $("galaxyMap"),
      g = cv.getContext("2d"),
      w = cv.width,
      h = cv.height;
    g.clearRect(0, 0, w, h);
    g.fillStyle = "#060f1a";
    g.fillRect(0, 0, w, h);
    mapPoints = [];
    const ca = Math.cos(atlasAngle),
      sa = Math.sin(atlasAngle);
    g.strokeStyle = "#789cab16";
    g.lineWidth = 1;
    for (let r = 1; r < 5; r++) {
      g.beginPath();
      g.ellipse(w / 2, h / 2, r * 66, r * 38, 0, 0, Math.PI * 2);
      g.stroke();
    }
    g.beginPath();
    g.moveTo(40, h / 2);
    g.lineTo(w - 40, h / 2);
    g.moveTo(w / 2, 30);
    g.lineTo(w / 2, h - 30);
    g.stroke();
    const points = [];
    for (let si = 0; si < SpacePatriotCatalog.systems.length; si++) {
      const b=W.catalog.find(b=>b.systemIndex===si);
      const angle=si*Math.PI*2/SpacePatriotCatalog.systems.length-Math.PI/2;points.push({b,x:w/2+Math.cos(angle)*w*.32,y:h/2+Math.sin(angle)*h*.32,z:0});
    }
    points.sort((a, b) => a.z - b.z);
    for (const p of points) {
      const selected = p.b.systemIndex === A.selected.systemIndex,
        current = p.b.systemIndex === F.nearest().body.systemIndex;
      g.fillStyle = selected
        ? "#d5ffe8"
        : current
          ? "#f9ce85"
          : p.z > 0
            ? "#709eac"
            : "#315966";
      g.globalAlpha = selected || current ? 1 : 0.45 + (p.z + 8) / 32;
      g.beginPath();
      g.arc(p.x, p.y, selected ? 4 : current ? 2.8 : 1.2, 0, Math.PI * 2);
      g.fill();
      g.globalAlpha = 1;
      if (true) {
        g.strokeStyle = "#bbf5d685";
        g.beginPath();
        g.arc(p.x, p.y, 12, 0, Math.PI * 2);
        g.stroke();
        g.fillStyle = "#c6e2d4";
        g.font = "10px Consolas,monospace";
        g.fillText(
          p.b.system.toUpperCase(),
          Math.min(w - 160, p.x + 18),
          p.y - 8,
        );
      }
      mapPoints.push(p);
    }
    g.fillStyle = "#6e8b9c";
    g.font = "8px Consolas,monospace";
    g.fillText("FIVE SYSTEMS / SCHEMATIC • DISTANCES COMPRESSED", 18, h - 17);
    g.fillStyle = "#b8e1cf";
    g.fillText("● SELECTED SYSTEM", 18, 22);
  }
  function refreshEcology(force = false) {
    const b = F.nearest().body,
      e = W.ecosystem(b);
    if (force || ecoId !== b.id) {
      ecoId = b.id;
      $("ecoName").textContent = b.name;
      $("foodweb").textContent = b.foodweb;
      $("ecoFacts").replaceChildren();
      for (const [label, value] of [
        ["HABITAT", b.kind],
        ["GRAVITY", b.gravity.toFixed(2) + " m/s²"],
        ["TEMPERATURE", b.temperature.toFixed(1) + " °C"],
        ["MOISTURE", (b.humidity * 100).toFixed(0) + "%"],
        [
          "LIFE SUPPORT",
          b.biome === 6 || b.type === 3
            ? "Sealed / floating habitat"
            : "Local adaptations",
        ],
        ["SPECIES SEED", b.seed.toString(16).toUpperCase()],
      ]) {
        const el = document.createElement("span"),
          sm = document.createElement("small");
        sm.textContent = label;
        el.appendChild(sm);
        el.appendChild(document.createTextNode(value));
        $("ecoFacts").appendChild(el);
      }
      $("populationRows").replaceChildren();
      for (let i = 0; i < 4; i++) {
        const row = document.createElement("div");
        row.className = "population-row";
        row.innerHTML =
          '<div><span></span><b></b></div><small></small><div class="population-track"><i></i></div>';
        row.querySelector("span").textContent = [
          "PRODUCERS",
          "GRAZERS",
          "HUNTERS",
          "NUTRIENT POOL",
        ][i];
        row.querySelector("small").textContent =
          i < 3 ? e.species[i] : "Recycled biological resources";
        $("populationRows").appendChild(row);
      }
    }
    [...$("populationRows").children].forEach((row, i) => {
      row.querySelector("b").textContent = e.populations[i].toFixed(
        i === 3 ? 0 : 1,
      );
      row.querySelector("i").style.width =
        Math.min(
          100,
          (e.populations[i] / [e.capacity, 200, 35, 1500][i]) * 100,
        ) + "%";
    });
    $("ecologyAge").textContent = "OBSERVED " + Math.floor(e.age) + " s";
    $("scanPlanet").textContent = F.ship.scanned.has(b.id)
      ? "Survey stored ✓"
      : "Survey [B]";
  }
  function refreshStation(force = false) {
    const ns = W.nearestStation(F.position),
      station = F.docked || ns.station,
      s = F.ship,
      docked = !!F.docked;
    $("stationName").textContent = station.name;
    $("dockStatus").textContent = docked
      ? "CLAMPS ENGAGED · SERVICES ONLINE"
      : "NOT DOCKED · " + distance(ns.distance) + " FROM STATION";
    $("dockStatus").classList.toggle("active", docked);
    $("stationInstructions").textContent = docked
      ? "Welcome aboard. Your ship remains in the hangar. Repairs, fuel, research exchange and commodity trade are available."
      : "Fly through the cyan-framed opening. Stay in the clear center lane, slow down, then use Z to free the cursor and select Dock in Ship → Services.";
    $("serviceActions").hidden = !docked;
    $("dockButton").hidden = docked;
    $("stationApproach").hidden = docked;
    if (force || marketId !== station.id) {
      marketId = station.id;
      const prices = W.market(station.body);
      $("marketRows").replaceChildren();
      for (const item of ["ore", "organics", "crystal"]) {
        const row = document.createElement("div");
        row.className = "market-row";
        row.innerHTML =
          '<div><span></span><small></small></div><b></b><button aria-label="Buy ' +
          item +
          '">+</button><button aria-label="Sell ' +
          item +
          '">−</button>';
        row.dataset.item = item;
        row.querySelector("span").textContent = {
          ore: "Mineral ore",
          organics: "Organic samples",
          crystal: "Crystal specimens",
        }[item];
        row.querySelector("small").textContent =
          "BUY " +
          Math.ceil(prices[item] * 1.2) +
          " / SELL " +
          prices[item] +
          " cr";
        const btn = row.querySelectorAll("button");
        btn[0].onclick = () => service("buy", item);
        btn[1].onclick = () => service("sell", item);
        $("marketRows").appendChild(row);
      }
    }
    for (const row of $("marketRows").children)
      row.querySelector("b").textContent = s.cargo[row.dataset.item];
    $("repairShip").textContent =
      s.hull >= 99.99
        ? "Hull full"
        : "Repair · " + Math.ceil((100 - s.hull) * 2) + " cr";
    $("repairShip").disabled = s.hull >= 99.99;
    $("fuelShip").textContent =
      s.fuel >= 99.99
        ? "Tank full"
        : "Refuel · " + Math.ceil((100 - s.fuel) * 1.4) + " cr";
    $("fuelShip").disabled = s.fuel >= 99.99;
    $("sellData").textContent =
      "Sell " +
      s.data +
      " surveys · " +
      (s.data * 320).toLocaleString() +
      " cr";
    $("sellData").disabled = !s.data;
    $("upgradeShip").disabled = s.credits < 900 || s.capacity >= 80;
  }
  function service(action, item) {
    if (F.service(action, item)) {
      tone(440, 0.06);
      refreshStation(true);
      update(performance.now());
      save(true);
    } else
      toast(
        "Transaction unavailable. Check credits, cargo space, inventory, and docking status.",
      );
  }
  function interact() {
    if (F.docked) {
      panel("stationServices", true);
      return;
    }
    const ns = W.nearestStation(F.position);
    if (ns.distance < 1.1) {
      if (F.dock()) {
        tone(330, 0.2);
        panel("stationServices", true);
        save(true);
      }
      announce();
    } else {
      F.collect();
      announce();
    }
  }
  function assist() {
    if (F.toggleAssist) F.toggleAssist();
    else F.assist = !F.assist;
    announce();
    A.start();
    update(performance.now());
  }
  function walk() {
    F.toggleWalk();
    announce();
    A.start();
    update(performance.now());
  }
  function scan() {
    F.scan();
    announce();
    refreshEcology(true);
    tone(680, 0.1);
    save(true);
  }
  function sample() {
    F.collect();
    announce();
    update(performance.now());
  }
  function save(quiet = false) {
    try {
      localStorage.setItem(KEY, JSON.stringify(F.exportSave()));
      if (!quiet)
        toast(
          "Position, discoveries, credits, ship upgrades and cargo saved on this device.",
        );
      return true;
    } catch {
      if (!quiet)
        toast(
          "Local storage is blocked here. Export progress as JSON to keep it.",
        );
      return false;
    }
  }
  function saved() {
    try {
      return JSON.parse(localStorage.getItem(KEY) || "null");
    } catch {
      return null;
    }
  }
  function restore(s) {
    if (!F.loadSave(s)) {
      toast("This is not a valid Longway 2 or 3 save for this galaxy.");
      return false;
    }
    A.start();
    A.rebuildDirectory();
    A.select(F.nearest().body);
    detailId = "";
    ecoId = "";
    refreshSelection();
    toast("Your ship and discoveries have been restored.");
    return true;
  }
  function tone(freq, duration) {
    if (!audio) return;
    const ac = audio.context,
      o = ac.createOscillator(),
      gain = ac.createGain();
    o.type = "sine";
    o.frequency.value = freq;
    gain.gain.setValueAtTime(0.045, ac.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ac.currentTime + duration);
    o.connect(gain).connect(ac.destination);
    o.start();
    o.stop(ac.currentTime + duration);
  }
  async function toggleAudio() {
    try {
      if (audio) {
        await audio.context.close();
        audio = null;
        $("audioToggle").textContent = "Ambient audio: OFF";
        return;
      }
      const Context = window.AudioContext || window.webkitAudioContext;
      if (!Context) return toast("Audio is not supported in this browser.");
      const context = new Context();
      await context.resume();
      const oscillator = context.createOscillator(),
        gain = context.createGain(),
        filter = context.createBiquadFilter();
      oscillator.type = "triangle";
      oscillator.frequency.value = 46;
      gain.gain.value = 0.012;
      filter.type = "lowpass";
      filter.frequency.value = 150;
      oscillator.connect(filter).connect(gain).connect(context.destination);
      oscillator.start();
      audio = { context, oscillator, gain, filter };
      $("audioToggle").textContent = "Ambient audio: ON";
      tone(220, 0.2);
    } catch {
      toast("Audio could not start. The game still works with sound off.");
    }
  }
  function update(now) {
    const near = F.nearest(),
      b = near.body,
      s = F.ship,
      ns = W.nearestStation(F.position);
    $("credits").textContent = finiteMoney(s.credits) + " cr";
    $("hullValue").textContent = s.hull.toFixed(0) + "%";
    $("fuelValue").textContent = s.fuel.toFixed(0) + "%";
    $("hullBar").style.width = s.hull + "%";
    $("fuelBar").style.width = s.fuel + "%";
    $("cargoValue").textContent =
      "CARGO " + F.cargoCount() + " / " + s.capacity;
    $("dataValue").textContent = s.data + " SURVEYS TO SELL";
    $("assistToggle").textContent = F.assist ? "Assist ON [G]" : "Freefall [G]";
    $("walkToggle").textContent = F.walking ? "Fly [J]" : "Walk [J]";
    $("envBiome").textContent = b.kind.toUpperCase();
    $("envGravity").textContent = b.gravity.toFixed(2) + " m/s²";
    $("envTemp").textContent = b.temperature.toFixed(0) + " °C";
    $("envLiquid").textContent = [
      "DRY / HABITAT",
      "WATER",
      "LAVA",
      "ACID BRINE",
    ][b.liquid];
    const hint = $("interactionHint");
    let text = "";
    const q = W.toLocal(F.position, ns.station);
    if (F.docked) text = "DOCKED · Open Station for trade & services";
    else if (ns.distance < 1 && Math.abs(q[0]) < 0.35 && Math.abs(q[2]) < 0.75)
      text = "[Z] HUD cursor / docking controls · [J] Walk the hangar";
    else if (near.altitude < 0.15)
      text = F.walking
        ? "[Space] Jump · [B] Survey · [Shift+B] Sample · [J] Fly"
        : "[B] Survey ecosystem · [Shift+B] Collect sample · [J] Walk";
    if (W.liquidAt(F.position, b) && b.liquid > 1)
      text =
        b.liquid === 2
          ? "DANGER: LAVA · HULL TAKING HEAT DAMAGE"
          : "DANGER: CORROSIVE LIQUID";
    hint.textContent = text;
    hint.hidden = !text || !!F.route;
    refreshSelection();
    if (!$("ecology").hidden) refreshEcology();
    if (!$("stationServices").hidden) refreshStation();
    if (audio) {
      audio.oscillator.frequency.setTargetAtTime(
        38 + Math.min(90, F.speed * 50),
        audio.context.currentTime,
        0.3,
      );
      audio.gain.gain.setTargetAtTime(
        document.hidden ? 0 : F.docked ? 0.008 : 0.016,
        audio.context.currentTime,
        0.3,
      );
    }
    if (now - lastSave > 20000 && A.started) {
      lastSave = now;
      save(true);
    }
    if (F.message && F.message !== lastMsg && F.message.includes("Emergency"))
      announce();
  }
  for (const b of C.BIOMES) {
    const o = document.createElement("option");
    o.value = b.index;
    o.textContent = b.name;
    $("biomeFilter").appendChild(o);
  }
  $("atlasToggle").onclick = openAtlas;
  $("openAtlas").onclick = openAtlas;
  $("closeAtlas").onclick = () => panel("galaxy", false);
  $("atlasSearch").oninput = () => filterAtlas();
  $("biomeFilter").onchange = () => filterAtlas();
  $("prevPage").onclick = () => {
    pageIndex--;
    renderCards();
  };
  $("nextPage").onclick = () => {
    pageIndex++;
    renderCards();
  };
  $("atlasIndex").onchange = () => {
    const n = Number($("atlasIndex").value);
    if (!Number.isInteger(n) || n < 1 || n > W.catalog.length) return;
    const b = W.catalog[n - 1];
    $("atlasSearch").value = "";
    $("biomeFilter").value = "-1";
    matches = W.catalog;
    pageIndex = Math.floor((n - 1) / 12);
    pick(b);
  };
  $("randomWorld").onclick = () => {
    const b = W.catalog[Math.floor(Math.random() * W.catalog.length)];
    $("atlasSearch").value = "";
    $("biomeFilter").value = "-1";
    matches = W.catalog;
    pageIndex = Math.floor(b.index / 12);
    pick(b);
  };
  $("atlasPort").onclick = () => {
    closeOthers();
    A.launch(false);
  };
  $("atlasOrbit").onclick = () => {
    closeOthers();
    A.launch(true);
  };
  $("atlasStation").onclick = () => beginStation();
  $("flyStation").onclick = () => beginStation();
  const visitWild = () => {
    closeOthers();
    A.start();
    F.toSurvey(A.selected);
    toast("Continuous flight to the field site. B scans; Shift+B collects a sample.");
  };
  $("flyWild").onclick = visitWild;
  $("atlasWild").onclick = visitWild;
  $("tour").onclick = () => {
    A.select(W.system([0, 0, 0])[1]);
    beginStation();
  };
  $("ecoToggle").onclick = () => panel("ecology");
  $("closeEco").onclick = () => panel("ecology", false);
  $("scanPlanet").onclick = scan;
  $("collectSample").onclick = sample;
  $("stationToggle").onclick = () => panel("stationServices");
  $("closeStation").onclick = () => panel("stationServices", false);
  $("stationApproach").onclick = () => beginStation();
  $("dockButton").onclick = () => {
    if (F.dock()) tone(330, 0.2);
    announce();
    refreshStation(true);
  };
  $("repairShip").onclick = () => service("repair");
  $("fuelShip").onclick = () => service("fuel");
  $("sellData").onclick = () => service("sellData");
  $("upgradeShip").onclick = () => service("upgrade");
  $("undockShip").onclick = () => {
    F.undock();
    closeOthers();
    A.start();
  };
  $("assistToggle").onclick = assist;
  $("walkToggle").onclick = walk;
  $("touchInteract").onclick = interact;
  $("touchScan").onclick = () => {
    panel("ecology");
    scan();
  };
  $("audioToggle").onclick = toggleAudio;
  $("savePosition").onclick = () => save();
  $("resume").hidden = !saved();
  $("resume").textContent = "Continue saved voyage";
  $("resume").onclick = () => restore(saved());
  $("exportSave").onclick = () =>
    A.download(
      new Blob([JSON.stringify(F.exportSave(), null, 2)], {
        type: "application/json",
      }),
      "Longway_progress.json",
    );
  $("importSave").onclick = () => $("saveFile").click();
  $("saveFile").onchange = async (e) => {
    const f = e.target.files[0];
    if (!f) return;
    if (f.size > 2e6) return toast("Save file is too large (maximum 2 MB).");
    try {
      restore(JSON.parse(await f.text()));
    } catch {
      toast("The selected file is not readable JSON.");
    }
    e.target.value = "";
  };
  window.addEventListener(
    "keydown",
    (e) => {
      // The ship interior owns its contextual door and engineering interaction.
      if (e.code === "KeyZ" && ((!A.flight.walking && !A.flight.bridgeWalk) || A.flight.bridgeWalk || (A.city?.current && (A.city.nearLift || A.city.nearMachine)))) return;
      if (
        ["INPUT", "SELECT", "TEXTAREA"].includes(e.target.tagName) ||
        e.repeat
      )
        return;
      const actions = {
        KeyM: openAtlas,
        
        KeyJ: walk,
        KeyZ: interact,
        KeyB: e.shiftKey ? sample : scan,

        KeyU: () => panel("ecology"),
        KeyO: () => panel("stationServices"),
      };
      if (actions[e.code]) {
        if (A.isPaused() && !["KeyM", "KeyU", "KeyO"].includes(e.code)) return;
        e.preventDefault();
        e.stopImmediatePropagation();
        actions[e.code]();
      }
    },
    true,
  );
  const map = $("galaxyMap");
  map.addEventListener("pointerdown", (e) => {
    drag = {
      id: e.pointerId,
      x: e.clientX,
      startX: e.clientX,
      startY: e.clientY,
    };
    map.setPointerCapture(e.pointerId);
  });
  map.addEventListener("pointermove", (e) => {
    if (drag?.id === e.pointerId) {
      atlasAngle += (e.clientX - drag.x) * 0.007;
      drag.x = e.clientX;
      drawMap();
    }
  });
  map.addEventListener("pointerup", (e) => {
    if (
      drag?.id === e.pointerId &&
      Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 7
    ) {
      const r = map.getBoundingClientRect(),
        x = ((e.clientX - r.left) / r.width) * map.width,
        y = ((e.clientY - r.top) / r.height) * map.height;
      let best = null,
        d = 18;
      for (const p of mapPoints) {
        const dd = Math.hypot(p.x - x, p.y - y);
        if (dd < d) {
          best = p;
          d = dd;
        }
      }
      if (best) {
        $("atlasSearch").value = best.b.system;
        $("biomeFilter").value = "-1";
        filterAtlas();
        pick(best.b);
      }
    }
    drag = null;
  });
  map.addEventListener("pointercancel", () => (drag = null));
  $("errorSave").onclick = () => $("exportSave").click();
  window.addEventListener("longway-error", () => {
    $("errorSave").hidden = false;
    save(true);
  });
  window.addEventListener("beforeunload", () => save(true));
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      save(true);
      if (audio)
        audio.gain.gain.setTargetAtTime(0, audio.context.currentTime, 0.05);
    }
  });
  window.LongwayLivingUI = {
    update,
    openAtlas,
    filterAtlas,
    beginStation,
    interact,
    scan,
    sample,
    save,
    restore,
    refreshStation,
    refreshEcology,
    pick,
  };
  refreshSelection();
  refreshEcology(true);
  refreshStation(true);
  update(performance.now());
})();
