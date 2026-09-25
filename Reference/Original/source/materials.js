/* Locally authored tileable PBR maps and double-buffered scene reflection probes. */
(function (root) {
  "use strict";
  function materialMaps(size = 256) {
    const albedo = new Uint8Array(size * size * 4),
      normal = new Uint8Array(size * size * 4),
      orm = new Uint8Array(size * size * 4),
      height = new Float32Array(size * size);
    const hash = (x, y) => {
      let n = Math.imul(x + 17, 374761393) ^ Math.imul(y + 41, 668265263);
      n = Math.imul(n ^ (n >>> 13), 1274126177);
      return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
    };
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const i = y * size + x,
          k = i * 4,
          edge = Math.min(x % 128, 127 - (x % 128), y % 64, 63 - (y % 64)),
          seam = edge < 2,
          bolt =
            Math.hypot((x % 128) - 7, (y % 64) - 7) < 2.5 ||
            Math.hypot((x % 128) - 120, (y % 64) - 56) < 2.5;
        const grain = hash(x, y),
          brush = Math.sin(y * 2.8) * 0.015,
          scratch = grain > 0.991 && y % 19 < 2;
        height[i] = seam ? -0.55 : bolt ? 0.38 : (grain - 0.5) * 0.026 + brush;
        const value = seam
          ? 0.38
          : bolt
            ? 0.74
            : 0.91 + (grain - 0.5) * 0.07 + (scratch ? 0.1 : 0);
        albedo.set([value * 255, value * 254, value * 252, 255], k);
        orm.set(
          [
            seam ? 150 : 255,
            bolt ? 65 : scratch ? 95 : 155 + grain * 40,
            bolt ? 255 : 225,
            255,
          ],
          k,
        );
      }
    for (let y = 0; y < size; y++)
      for (let x = 0; x < size; x++) {
        const get = (dx, dy) =>
          height[((y + dy + size) % size) * size + ((x + dx + size) % size)];
        const nx = (get(-1, 0) - get(1, 0)) * 1.1,
          ny = (get(0, -1) - get(0, 1)) * 1.1,
          inv = 1 / Math.hypot(nx, ny, 1);
        normal.set(
          [
            (nx * inv * 0.5 + 0.5) * 255,
            (ny * inv * 0.5 + 0.5) * 255,
            (inv * 0.5 + 0.5) * 255,
            255,
          ],
          (y * size + x) * 4,
        );
      }
    return { size, albedo, normal, orm };
  }
  class Materials {
    constructor(renderer) {
      this.renderer = renderer;
      this.gl = renderer.gl;
      this.ao = true;
      this.reflections = true;
      this.normalStrength = 1;
      this.probeFace = 0;
      this.probeIndex = 0;
      this.captures = 0;
      this.lastCapture = -1;
      this.size = 64;
      this.maps = materialMaps();
      this.init();
    }
    init() {
      const gl = this.gl,
        L = this.renderer.loc;
      this.textures = [];
      for (const [i, key] of ["albedo", "normal", "orm"].entries()) {
        const t = gl.createTexture();
        this.textures.push(t);
        gl.activeTexture(gl.TEXTURE3 + i);
        gl.bindTexture(gl.TEXTURE_2D, t);
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.RGBA8,
          this.maps.size,
          this.maps.size,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          this.maps[key],
        );
        gl.generateMipmap(gl.TEXTURE_2D);
        gl.texParameteri(
          gl.TEXTURE_2D,
          gl.TEXTURE_MIN_FILTER,
          gl.LINEAR_MIPMAP_LINEAR,
        );
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.uniform1i(L[["uAlbedoMap", "uNormalMap", "uORMMap"][i]], 3 + i);
      }
      this.framebuffer = gl.createFramebuffer();
      this.probes = [0, 1].map(() => ({
        front: this.cube(),
        back: this.cube(),
        position: [0, 0, 0],
        ready: false,
      }));
      gl.activeTexture(gl.TEXTURE0);
    }
    cube() {
      const gl = this.gl,
        t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_CUBE_MAP, t);
      const px = new Uint8Array(this.size * this.size * 4);
      for (let i = 0; i < px.length; i += 4) px.set([22, 29, 38, 255], i);
      for (let f = 0; f < 6; f++)
        gl.texImage2D(
          gl.TEXTURE_CUBE_MAP_POSITIVE_X + f,
          0,
          gl.RGBA8,
          this.size,
          this.size,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          px,
        );
      gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
      gl.texParameteri(
        gl.TEXTURE_CUBE_MAP,
        gl.TEXTURE_MIN_FILTER,
        gl.LINEAR_MIPMAP_LINEAR,
      );
      gl.texParameteri(gl.TEXTURE_CUBE_MAP, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R])
        gl.texParameteri(gl.TEXTURE_CUBE_MAP, p, gl.CLAMP_TO_EDGE);
      return t;
    }
    bind(pose, probePass = false) {
      const gl = this.gl,
        L = this.renderer.loc;
      for (let i = 0; i < 3; i++) {
        gl.activeTexture(gl.TEXTURE3 + i);
        gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
      }
      for (let i = 0; i < 2; i++) {
        gl.activeTexture(gl.TEXTURE6 + i);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, this.probes[i].front);
        gl.uniform1i(L[i ? "uInteriorProbe" : "uExteriorProbe"], 6 + i);
      }
      gl.uniform1i(L.uProbePass, probePass ? 1 : 0);
      gl.uniform1f(L.uAOEnabled, this.ao ? 1 : 0);
      gl.uniform1f(L.uReflections, this.reflections ? 1 : 0);
      gl.uniform1f(L.uNormalStrength, this.normalStrength);
      gl.uniform3fv(
        L.uProbePosition,
        C.sub(this.probes[0].position, pose.position),
      );
      gl.activeTexture(gl.TEXTURE0);
    }
    capture(pilot, time) {
      const r = this.renderer,
        gl = this.gl,
        C = root.LongwayCore;
      if (!this.reflections || r.lost || !r.ready) return;
      if (time - this.lastCapture < 0.1 && this.captures > 0) return;
      this.lastCapture = time;
      const idx = this.probeIndex,
        probe = this.probes[idx],
        f = this.probeFace,
        v = pilot.vehicle;
      if (f === 0)
        probe.position = idx
          ? C.add(
              C.add(
                v.position,
                C.mul(v.up, pilot.craft.dimensions[2] * 0.0005),
              ),
              C.mul(v.forward, pilot.craft.dimensions[0] * 0.00018),
            )
          : C.add(
              v.position,
              C.mul(v.up, pilot.craft.dimensions[2] * 0.001 + 0.003),
            );
      const dirs = [
          [1, 0, 0],
          [-1, 0, 0],
          [0, 1, 0],
          [0, -1, 0],
          [0, 0, 1],
          [0, 0, -1],
        ],
        ups = [
          [0, -1, 0],
          [0, -1, 0],
          [0, 0, 1],
          [0, 0, -1],
          [0, -1, 0],
          [0, -1, 0],
        ];
      const forward = dirs[f],
        up = ups[f],
        right = C.unit(C.cross(forward, up));
      gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
      gl.framebufferTexture2D(
        gl.FRAMEBUFFER,
        gl.COLOR_ATTACHMENT0,
        gl.TEXTURE_CUBE_MAP_POSITIVE_X + f,
        probe.back,
        0,
      );
      if (
        gl.checkFramebufferStatus(gl.FRAMEBUFFER) !== gl.FRAMEBUFFER_COMPLETE
      ) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
        return;
      }
      const pose = {
        position: probe.position,
        forward,
        right,
        up,
        shipView: idx,
      };
      r.render(pilot, time, { pose, size: this.size });
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      gl.viewport(0, 0, r.canvas.width, r.canvas.height);
      if (++this.probeFace === 6) {
        gl.activeTexture(gl.TEXTURE6);
        gl.bindTexture(gl.TEXTURE_CUBE_MAP, probe.back);
        gl.generateMipmap(gl.TEXTURE_CUBE_MAP);
        [probe.front, probe.back] = [probe.back, probe.front];
        probe.ready = true;
        this.probeFace = 0;
        this.probeIndex = 1 - idx;
        this.captures++;
      }
      gl.activeTexture(gl.TEXTURE0);
    }
    dispose() {
      const gl = this.gl;
      this.textures.forEach((t) => gl.deleteTexture(t));
      for (const p of this.probes) {
        gl.deleteTexture(p.front);
        gl.deleteTexture(p.back);
      }
      gl.deleteFramebuffer(this.framebuffer);
    }
  }
  const C = root.LongwayCore;
  root.BloxMaterials = Materials;
  root.BloxMaterialMaps = materialMaps;
})(globalThis);
