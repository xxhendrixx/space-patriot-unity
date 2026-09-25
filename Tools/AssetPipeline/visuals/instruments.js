// Every readout is drawn from the same simulation objects used by the HUD.
export function drawInstruments(cockpit, A, time) {
  if (window.BloxArtwork?.screens) {
    for (let i = 0; i < 3; i++) {
      const screen = cockpit.userData.screens[i];
      screen.canvas
        .getContext("2d")
        .drawImage(
          BloxArtwork.screens[i].canvas,
          0,
          0,
          screen.canvas.width,
          screen.canvas.height,
        );
      screen.texture.needsUpdate = true;
    }
    return;
  }
  const C = globalThis.LongwayCore,
    F = A.flight,
    B = A.combat,
    S = A.systems,
    near = F.nearest(),
    screens = cockpit.userData.screens,
    states = C.CockpitLayout.states(F);
  for (let i = 0; i < screens.length; i++) {
    const { canvas, texture } = screens[i],
      q = canvas.getContext("2d"),
      w = canvas.width,
      h = canvas.height;
    q.fillStyle = "#071013";
    q.fillRect(0, 0, w, h);
    q.strokeStyle = "#2b4548";
    q.lineWidth = 2;
    q.strokeRect(18, 18, w - 36, h - 36);
    const text = (s, x, y, size = 24, color = "#a9c7c4") => {
      q.fillStyle = color;
      q.font = `${size}px 'SFMono-Regular',Consolas,monospace`;
      q.textAlign = "left";
      q.fillText(s, x, y);
    };
    const line = (x, y, x2, y2, color = "#2c494c") => {
      q.strokeStyle = color;
      q.beginPath();
      q.moveTo(x, y);
      q.lineTo(x2, y2);
      q.stroke();
    };
    const bar = (name, value, x, y, width = 300, color = "#8cbab1") => {
      text(name, x, y, 22);
      q.fillStyle = "#1a2c30";
      q.fillRect(x, y + 15, width, 9);
      q.fillStyle = color;
      q.fillRect(x, y + 15, width * Math.max(0, Math.min(1, value)), 9);
    };
    text(
      [
        "FLIGHT / NAVIGATION",
        "TACTICAL / SENSOR ARRAY",
        "VESSEL / ENGINEERING",
      ][i % 3],
      40,
      65,
      27,
      "#c9d2c7",
    );
    text(F.craft.name.toUpperCase().slice(0, 29), 40, h - 38, 19, "#5c7b7d");
    line(38, 92, w - 38, 92);
    if (i % 3 === 0) {
      text(S?.mode || F.drive.flightMode, 45, 138, 25, "#d2b986");
      text(
        String(Math.round(F.speed * 1000)).padStart(3, "0"),
        45,
        247,
        87,
        "#d8e2d7",
      );
      text("M / S", 260, 244, 23);
      text("ALTITUDE", 620, 145);
      text(
        near.altitude < 1
          ? Math.round(near.altitude * 1000) + " m"
          : near.altitude.toFixed(1) + " km",
        620,
        204,
        42,
      );
      // Attitude ladder follows gravity-relative pitch and roll.
      const pitch = Math.asin(
        C.clamp(
          C.dot(F.forward, C.unit(C.sub(F.position, near.body.center))),
          -1,
          1,
        ),
      );
      q.save();
      q.translate(465, 425);
      q.rotate(-F.bank);
      for (let j = -3; j <= 3; j++) {
        const y = j * 43 + pitch * 110;
        line(-170, y, 170, y, j === 0 ? "#92b4ac" : "#385557");
        text(String(-j * 10), 185, y + 6, 20);
      }
      q.restore();
      line(375, 425, 432, 425, "#dbc68e");
      line(493, 425, 550, 425, "#dbc68e");
      text(near.body.name.toUpperCase(), 42, 608, 28);
      bar(
        "FUEL  " + Math.round(F.ship.fuel) + "%",
        F.ship.fuel / 100,
        45,
        655,
        380,
      );
      text(
        F.vehicle.gear > 0.5 ? "GEAR DOWN" : "GEAR UP",
        610,
        620,
        25,
        F.vehicle.gear > 0.5 ? "#d2b986" : "#94bdb4",
      );
      text(
        F.drive.jump
          ? "SPOOL " + Math.round(F.vehicle.charge * 100) + "%"
          : "DRIVE STANDBY",
        610,
        664,
        22,
      );
    } else if (i % 3 === 1) {
      const cx = 363,
        cy = 392,
        r = 258;
      q.strokeStyle = "#375259";
      q.lineWidth = 2;
      for (const k of [0.25, 0.5, 0.75, 1]) {
        q.beginPath();
        q.arc(cx, cy, r * k, 0, Math.PI * 2);
        q.stroke();
      }
      line(cx - r, cy, cx + r, cy);
      line(cx, cy - r, cx, cy + r);
      q.save();
      q.translate(cx, cy);
      q.rotate(time * 0.35);
      line(0, 0, r, 0, "#668c87");
      q.restore();
      q.fillStyle = "#accac1";
      q.beginPath();
      q.moveTo(cx, cy - 12);
      q.lineTo(cx - 7, cy + 9);
      q.lineTo(cx + 7, cy + 9);
      q.closePath();
      q.fill();
      let row = 0;
      for (const e of B.contacts()) {
        const d = C.sub(e.position, B.origin()),
          dist = C.length(d);
        if (dist > B.radarRange) continue;
        const x = cx + (C.dot(d, F.right) / B.radarRange) * r,
          y = cy - (C.dot(d, B.aim()) / B.radarRange) * r,
          hostile = B.isHostile(e);
        q.fillStyle = hostile ? "#d87c67" : "#8fc2b8";
        q.beginPath();
        q.arc(x, y, e.id === B.targetId ? 7 : 4, 0, 7);
        q.fill();
        if (row < 8) {
          text(
            String(e.callsign || e.id).slice(0, 12),
            690,
            170 + row * 60,
            19,
            hostile ? "#cc8671" : "#8fc2b8",
          );
          text(dist.toFixed(2) + " km", 690, 194 + row * 60, 18);
          row++;
        }
      }
      text(B.contacts().length + " TRACKS", 690, 120, 21);
      text("RANGE  " + B.radarRange.toFixed(2) + " km", 45, 700, 23);
      if (!row) text("NO CONTACTS", 690, 190, 21, "#586f71");
    } else {
      const allocations = S?.allocations || {
        engines: 4,
        weapons: 4,
        shields: 4,
      };
      for (const [j, key] of ["engines", "weapons", "shields"].entries()) {
        const x = 45 + j * 315;
        text(key.toUpperCase(), x, 153, 24);
        text(allocations[key] + " / 12", x, 196, 31, "#d1ba87");
        for (let k = 0; k < 12; k++) {
          q.fillStyle = k < allocations[key] ? "#9bbdb2" : "#1e3135";
          q.fillRect(x, 365 - k * 11, 250, 6);
        }
      }
      bar(
        "SHIELDS  " + Math.round(B.shield) + "%",
        B.shield / 100,
        45,
        433,
        415,
      );
      bar(
        "HULL  " + Math.round(F.ship.hull) + "%",
        F.ship.hull / 100,
        548,
        433,
        410,
      );
      bar(
        "CAPACITOR  " + Math.round(B.capacitor) + "%",
        B.capacitor / 100,
        45,
        510,
        415,
      );
      bar(
        "CORE HEAT  " + Math.round(F.vehicle.heat * 100) + "%",
        F.vehicle.heat,
        548,
        510,
        410,
        "#cda974",
      );
      text(B.spec.short, 45, 610, 27);
      text(
        B.key === "laser"
          ? Math.round(B.capacitor) + "%"
          : B.ammo[B.key].mag + " / " + B.ammo[B.key].reserve,
        45,
        663,
        43,
        "#d9e2d5",
      );
      text(
        B.armed ? "ARMED" : "SAFE",
        580,
        610,
        27,
        B.armed ? "#d2a075" : "#87b2aa",
      );
      text(S?.warning || "BUS NOMINAL", 580, 658, 22);
    }
    for (let y = 0; y < h; y += 4) {
      q.fillStyle = "#00000008";
      q.fillRect(0, y, w, 1);
    }
    texture.needsUpdate = true;
  }
  cockpit.userData.buttons.forEach((led, i) => {
    led.material =
      states[i] > 0.5 ? A.visuals.materials.glow : A.visuals.materials.black;
  });
}
