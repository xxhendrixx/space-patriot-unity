/* Staged initialization: percentages count completed work, never elapsed timers.
   A single shader cannot expose a truthful internal percentage; it remains a
   pending stage until the driver reports completion. */
(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.LongwayBoot = api;
})(globalThis, function () {
  "use strict";
  const STAGES = [
    ["catalog", "Load the 19 worlds and their solar systems", 24],
    ["pilot", "Initialize ship, pilot and landing site", 10],
    ["graphics", "Create graphics context and submit shaders", 10],
    ["shader", "Link shaders and upload GPU resources", 30],
    ["surface", "Build nearby terrain and surface detail", 16],
    ["frame", "Verify the first rendered frame", 10],
  ];
  class Progress {
    constructor() {
      this.stages = STAGES.map(([id, label, weight]) => ({
        id,
        label,
        weight,
      }));
      this.completed = new Set();
      this.current = null;
      this.error = null;
      this.history = [];
      this.started = Date.now();
    }
    get percent() {
      return this.stages.reduce(
        (s, t) => s + (this.completed.has(t.id) ? t.weight : 0),
        0,
      );
    }
    get ready() {
      return !this.error && this.completed.size === this.stages.length;
    }
    begin(id) {
      if (!this.stages.some((s) => s.id === id))
        throw new Error("Unknown initialization stage: " + id);
      this.current = id;
      this.record("begin");
    }
    complete(id) {
      if (!this.stages.some((s) => s.id === id))
        throw new Error("Unknown initialization stage: " + id);
      if (this.error) return;
      this.completed.add(id);
      this.record("complete");
    }
    fail(message) {
      this.error = String(message);
      this.record("error");
    }
    record(kind) {
      this.history.push({
        kind,
        stage: this.current,
        percent: this.percent,
        elapsedMs: Date.now() - this.started,
      });
    }
  }
  const paint = () =>
    new Promise((r) => requestAnimationFrame(() => setTimeout(r, 0)));
  function attach() {
    const state = new Progress(),
      el = (id) => document.getElementById(id);
    const redraw = () => {
      const pct = state.percent;
      el("bootFill").style.width = pct + "%";
      el("bootPercent").textContent = String(pct).padStart(2, "0") + "%";
      el("bootProgress").setAttribute("aria-valuenow", pct);
      const task = state.stages.find((s) => s.id === state.current);
      el("bootStage").textContent =
        state.error ||
        (state.ready ? "Flight deck ready" : task?.label) ||
        "Preparing flight systems";
      el("bootCount").textContent =
        state.completed.size + " / " + state.stages.length + " stages complete";
      el("bootStages").replaceChildren(
        ...state.stages.map((s) => {
          const item = document.createElement("span");
          item.className = state.completed.has(s.id)
            ? "done"
            : state.current === s.id
              ? "active"
              : "";
          item.textContent = s.id.toUpperCase();
          return item;
        }),
      );
    };
    return {
      state,
      paint,
      begin(id, note) {
        state.begin(id);
        if (note) el("bootNote").textContent = note;
        redraw();
      },
      complete(id) {
        state.complete(id);
        redraw();
      },
      fail(message) {
        state.fail(message);
        redraw();
      },
      async finish() {
        if (!state.ready)
          throw new Error("First-frame verification has not completed.");
        el("bootStage").textContent = "Flight deck ready";
        el("bootNote").textContent =
          "All local systems initialized. No external downloads.";
        redraw();
        await paint();
        setTimeout(() => {
          el("loading").hidden = true;
        }, 240);
      },
    };
  }
  return { Progress, paint, attach };
});
