/* Deterministic timing and conservative screen-space work culling. No DOM required. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LongwayRuntime = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const finite = (v, f) => (Number.isFinite(v) ? v : f);
  class SimulationClock {
    constructor(step = 1 / 60, maxElapsed = 1) {
      this.step = step;
      this.maxElapsed = maxElapsed;
      this.accumulator = 0;
      this.simulated = 0;
      this.dropped = 0;
    }
    reset() {
      this.accumulator = 0;
    }
    consume(elapsed, update) {
      elapsed = Math.max(0, finite(elapsed, 0));
      const accepted = Math.min(elapsed, this.maxElapsed),
        dropped = elapsed - accepted;
      this.dropped += dropped;
      this.accumulator += accepted;
      let steps = Math.floor((this.accumulator + 1e-10) / this.step);
      for (let i = 0; i < steps; i++) update(this.step);
      const seconds = steps * this.step;
      this.accumulator = Math.max(0, this.accumulator - seconds);
      this.simulated += seconds;
      return { steps, seconds, dropped };
    }
  }
  function renderSize(
    width,
    height,
    dpr = 1,
    scale = 0.7,
    pixelBudget = 460800,
  ) {
    width = Math.max(1, finite(width, 640));
    height = Math.max(1, finite(height, 400));
    dpr = clamp(finite(dpr, 1), 0.5, 2);
    scale = clamp(finite(scale, 0.7), 0.1, 1);
    pixelBudget = clamp(finite(pixelBudget, 460800), 2048, 8294400);
    let w = width * dpr * scale,
      h = height * dpr * scale;
    const factor = Math.min(1, Math.sqrt(pixelBudget / (w * h)));
    return [
      Math.max(1, Math.floor(w * factor)),
      Math.max(1, Math.floor(h * factor)),
    ];
  }
  function buildBioTiles(cfg, instances) {
    const TILE = 32,
      SLOTS = 24,
      cols = Math.ceil(cfg.width / TILE),
      rows = Math.ceil(cfg.height / TILE),
      width = cols * SLOTS,
      data = new Uint8Array(width * rows);
    const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
      aspect = cfg.width / cfg.height;
    for (const o of instances) {
      if (!(o.size > 0)) continue;
      const center = o.position.map(
          (v, i) => v + cfg.plantUp[i] * 1.1 * o.size,
        ),
        radius = (o.animal ? 1.75 : 1.95) * o.size;
      const x = dot(center, cfg.right),
        y = dot(center, cfg.up),
        z = dot(center, cfg.forward);
      if (z + radius <= 0) continue;
      let left = 0,
        right = cols - 1,
        bottom = 0,
        top = rows - 1;
      if (z > radius + 1e-8) {
        // Bound each projected coordinate using z±radius. The larger denominator
        // bound is conservative even for off-axis and camera-grazing spheres.
        const sx = x / z,
          sy = y / z,
          ex = (radius * (1 + Math.abs(sx))) / (z - radius),
          ey = (radius * (1 + Math.abs(sy))) / (z - radius);
        const lx =
            (((sx - ex) / (cfg.fov * aspect)) * 0.5 + 0.5) * cfg.width - 2,
          rx = (((sx + ex) / (cfg.fov * aspect)) * 0.5 + 0.5) * cfg.width + 2;
        const by = (((sy - ey) / cfg.fov) * 0.5 + 0.5) * cfg.height - 2,
          ty = (((sy + ey) / cfg.fov) * 0.5 + 0.5) * cfg.height + 2;
        if (rx < 0 || lx > cfg.width || ty < 0 || by > cfg.height) continue;
        left = clamp(Math.floor(lx / TILE), 0, cols - 1);
        right = clamp(Math.floor(rx / TILE), 0, cols - 1);
        bottom = clamp(Math.floor(by / TILE), 0, rows - 1);
        top = clamp(Math.floor(ty / TILE), 0, rows - 1);
      }
      for (let ty = bottom; ty <= top; ty++)
        for (let tx = left; tx <= right; tx++) {
          const offset = ty * width + tx * SLOTS,
            count = data[offset];
          if (count === 255) continue;
          if (count >= SLOTS - 1) data[offset] = 255;
          else {
            data[offset] = count + 1;
            data[offset + 1 + count] = o.index + 1;
          }
        }
    }
    return { data, width, height: rows, cols, slots: SLOTS };
  }
  return { SimulationClock, renderSize, buildBioTiles };
});
