/* Terrestrial mountain watersheds: shared CPU/GPU height field, in kilometres.
   Rivers are deterministic carved channels with a sea-level water surface. */
(function (root) {
  const C = root.LongwayCore,
    { unit, cross, dot, mul, add, sub } = C,
    up = unit([0.62, 0.37, 0.69]),
    right = unit(cross([0, 1, 0], up)),
    forward = unit(cross(up, right)),
    smoothstep = (lo, hi, x) => C.smooth(C.clamp((x - lo) / (hi - lo), 0, 1));
  function riverX(b, z) {
    const phase = b.offset[0] * 0.031;
    return (
      0.6 * Math.sin(z * 0.32 + phase) + 0.17 * Math.sin(z * 0.95 + phase * 0.5)
    );
  }
  function shape(b, n, base = 0) {
    if (b.type !== 1 || dot(n, up) < 0.98)
      return { height: base, mask: 0, water: false };
    const p = mul(n, b.radius),
      x = dot(p, right),
      z = dot(p, forward),
      phase = b.offset[0] * 0.031,
      mask =
        (1 - smoothstep(6, 9, Math.abs(x))) *
        (1 - smoothstep(10, 14, Math.abs(z))),
      d = Math.abs(x - riverX(b, z)),
      width = 0.08 + 0.015 * Math.cos(z * 0.22 + phase),
      crags = 0.62 + 0.38 * Math.pow(1 - Math.abs(
        Math.sin(x * 6.7 + Math.sin(z * 1.6) * 1.3) *
        Math.cos(z * 2.1 + Math.cos(x * 2.3)),
      ), 3),
      hills =
        0.85 *
        Math.exp(-Math.pow((d - 2.45) / 0.95, 2)) *
        (0.72 + 0.28 * Math.sin(z * 0.47 + phase)) * crags,
      valley =
        0.03 +
        0.12 * smoothstep(0.14, 1.4, d) +
        hills +
        0.018 * smoothstep(0.25, 0.8, d) * Math.sin(x * 23 + Math.sin(z * 5)) * Math.cos(z * 19) -
        0.055 * (1 - smoothstep(width * 0.5, width, d));
    return {
      height: base * (1 - mask) + valley * mask,
      mask,
      x,
      z,
      d,
      width,
      water: mask > 0.99 && valley < 0,
      riverbed: valley,
    };
  }
  const sample = C.Geology.sample;
  C.Geology.sample = (w, b, n) => {
    const result = sample(w, b, n),
      river = shape(b, n, result.height);
    return { ...result, height: river.height, river };
  };
  C.Universe.prototype.rawHeight = function (b, n) {
    return C.Geology.sample(this, b, n).height;
  };
  const survey = C.Universe.prototype.surveySite;
  C.Universe.prototype.surveySite = function (b) {
    if (b.type !== 1 || b.biome === 6) return survey.call(this, b);
    if (this.surveySites.has(b.id)) return this.surveySites.get(b.id);
    const n = unit(add(mul(up, b.radius), mul(right, riverX(b, 0) + 0.42))),
      h = this.rawHeight(b, n),
      r = unit(cross([0, 1, 0], n)),
      f = unit(cross(n, r)),
      site = {
        body: b,
        center: add(b.center, mul(n, b.radius + h)),
        up: n,
        right: r,
        forward: f,
        height: h,
        name: b.name + " River Valley",
        style: 0,
      };
    this.surveySites.set(b.id, site);
    return site;
  };
  C.Landscape = {
    up,
    right,
    forward,
    riverX,
    shape,
    normal: (b, x, z) =>
      unit(add(mul(up, b.radius), add(mul(right, x), mul(forward, z)))),
  };
})(globalThis);
