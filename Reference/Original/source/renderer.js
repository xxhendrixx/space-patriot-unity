/* Conservative tiled ray renderer. Context resources are rebuilt, never reused
   after loss. GPU timings remain render-pass measurements, not native FPS. */
(function (root) {
  "use strict";
  const VERTEX = `#version 300 es\nprecision highp float;\nvoid main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));gl_Position=vec4(p*2.-1.,0.,1.);}`;

  function meshShader(source) {
    // Remove retired SDF foreground entry points before the driver translates
    // GLSL. Constant folding alone still made some D3D drivers compile them.
    source = source.replace('uniform int uMeshForeground;', 'const int uMeshForeground=1;')
      .replace(/if\(uMeshForeground==0\)\{[^{}]*\}/g, '')
      .replace('if(uMeshForeground==0)firstPersonWeapon(rd,color);', '')
      .replace('if(uSiteBody>=0&&nearest<2.&&uAOEnabled>.5)color*=faunaContact(rd*nearest);', '')
      .replace('if(uView==0&&nearest<craftDepth&&uShipView==0)color*=shipGroundShadow(rd*nearest);', '');
    const functions = [];
    const declarations = /^[ \t]*(?:void|float|int|uint|bool|vec[234]|mat[234])\s+(\w+)\s*\([^;{}]*\)\s*\{/gm;
    for (const match of source.matchAll(declarations)) {
      let depth = 1, end = match.index + match[0].length;
      while (depth && end < source.length) { const c = source[end++]; if (c === '{') depth++; else if (c === '}') depth--; }
      functions.push({ name: match[1], start: match.index, end, body: source.slice(match.index + match[0].length, end) });
    }
    const reachable = new Set(['main']);
    for (const name of reachable) for (const fn of functions.filter(fn => fn.name === name)) {
      for (const call of fn.body.matchAll(/\b(\w+)\s*\(/g)) reachable.add(call[1]);
    }
    for (const fn of functions.reverse()) if (!reachable.has(fn.name)) source = source.slice(0, fn.start) + source.slice(fn.end);
    return source;
  }

  class Renderer {
    constructor(canvas, universe, source) {
      this.needsRender = true;
      this.canvas = canvas;
      this.world = universe;
      this.legacySource = source;
      // Mesh ships, cities and wildlife are rendered by the Three.js stage.
      // Make that decision at compile time so drivers do not compile the old
      // nested SDF tracers as well. This is the 44% startup stage.
      this.source = meshShader(source);
      this.pipeline = 'mesh-and-terrain';
      this.lost = false;
      this.ready = false;
      this.frame = 0;
      this.gpuMs = null;
      this.samples = [];
      this.pending = [];
      this.disjoints = 0;
      this.lossCount = 0;
      this.restoreAttempts = 0;
      const gl = (this.gl = canvas.getContext("webgl2", {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: "high-performance",
      }));
      if (!gl)
        throw new Error(
          "This browser did not provide WebGL 2. Open the saved HTML in a hardware-accelerated desktop browser. The file preview inside a chat or file manager may not run a WebGL game.",
        );
      this.floatTerrainFiltering = !!gl.getExtension('OES_texture_float_linear');
      if (this.floatTerrainFiltering) this.source = this.source.replace('#version 300 es', '#version 300 es\n#define FLOAT_TERRAIN_FILTERING');
      const debug = gl.getExtension("WEBGL_debug_renderer_info");
      this.hardware = {
        vendor: debug
          ? gl.getParameter(debug.UNMASKED_VENDOR_WEBGL)
          : gl.getParameter(gl.VENDOR),
        renderer: debug
          ? gl.getParameter(debug.UNMASKED_RENDERER_WEBGL)
          : gl.getParameter(gl.RENDERER),
        webgl: gl.getParameter(gl.VERSION),
        timerQueries: false,
        maxFragmentUniformVectors: gl.getParameter(
          gl.MAX_FRAGMENT_UNIFORM_VECTORS,
        ),
      };
      this.software = /swiftshader|llvmpipe|software/i.test(
        this.hardware.renderer,
      );
      this.maxViewport = gl.getParameter(gl.MAX_VIEWPORT_DIMS);
      this.speedEffects = !root.matchMedia?.("(prefers-reduced-motion: reduce)")
        .matches;
      const compactTouch=root.matchMedia?.('(pointer: coarse)').matches&&Math.min(root.innerWidth||1024,root.innerHeight||768)<600;
      const lowMemory=root.navigator?.deviceMemory&&root.navigator.deviceMemory<=4;
      this.quality = this.software||compactTouch||lowMemory ? 0 : 1;
      this.view = 0;
      this.maxSteps = this.quality===0 ? 88 : 144;
      this.fov = 0.69;
      this.scale = 0.9;
      this.fixed = null;
      this.autoResolution = true;
      this.pixelBudget = this.software ? 16000 : this.quality===0 ? 550000 : 1100000;
      this.lastAdapt = 0;
      this.bodies = new Float32Array(80);
      this.props = new Float32Array(80);
      this.offsets = new Float32Array(60);
      this.climates = new Float32Array(80);
      this.tints = new Float32Array(60);this.atmoTints=new Float32Array(60);this.cloudProps=new Float32Array(80);this.weatherFronts=new Float32Array(80);
      this.plants = new Float32Array(160);
      this.animals = new Float32Array(64);
      this.animalInfo = new Float32Array(64);

      canvas.addEventListener("webglcontextlost", (e) => {
        e.preventDefault();
        this.lost = true;
        this.ready = false;
        this.gpuMs = null;
        this.lossCount++;
        this.pending = [];
        this.samples = [];
        this.program =
          this.compiling =
          this.texture =
          this.bioTexture =
          this.cockpitTexture =
          this.vao =
            null;
        this.fixed = null;
        this.artTexture=null;this.artTextureKey=null;this.worldworksTexture=null;this.worldworksKey=null;this.terrainCacheTexture=null;this.terrainCacheKey=null;
        this.setQuality(0);
        this.pixelBudget = Math.max(
          4096,
          Math.min(this.pixelBudget * 0.5, this.software ? 16000 : 200000),
        );
        root.dispatchEvent(
          new CustomEvent("longway-error", {
            detail:
              "The graphics device reset. Flight is paused and progress is retained in memory. Attempting to restore the renderer at safer settings…",
          }),
        );
        setTimeout(() => {
          if (this.lost) this.requestRestore();
        }, 900);
      });
      canvas.addEventListener("webglcontextrestored", () => {
        this.lost = false;
        this.ready = false;
        this.restoring = true;
        this.compile();
        root.dispatchEvent(new CustomEvent("longway-restoring"));
      });
      this.compile();
    }
    compile() {
      const gl = this.gl;
      if (this.lost) return;
      if(this.floatTerrainFiltering)gl.getExtension('OES_texture_float_linear');
      if (this.program) gl.deleteProgram(this.program);
      for (const tex of [this.texture, this.bioTexture, this.cockpitTexture, this.artTexture, this.terrainCacheTexture])
        if (tex) gl.deleteTexture(tex);
      if (this.vao) gl.deleteVertexArray(this.vao);
      this.resetTimings();
      this.needsRender = true;
      this.ready = false;
      this.texture = this.bioTexture = this.cockpitTexture = this.vao = null;
      this.artTexture = this.artTextureKey = null;
      this.terrainCacheTexture=this.terrainCacheKey=null;
      this.parallel = gl.getExtension("KHR_parallel_shader_compile");
      this.timer = gl.getExtension("EXT_disjoint_timer_query_webgl2");
      this.loseExtension = gl.getExtension("WEBGL_lose_context");
      this.hardware.timerQueries = !!this.timer;
      const shader = (type, source) => {
        const s = gl.createShader(type);
        if (!s)
          throw new Error("The graphics driver could not allocate a shader.");
        gl.shaderSource(s, source);
        gl.compileShader(s);
        return s;
      };
      const vs = shader(gl.VERTEX_SHADER, VERTEX),
        fs = shader(gl.FRAGMENT_SHADER, this.source),
        program = gl.createProgram();
      if (!program)
        throw new Error("The graphics driver could not allocate the renderer.");
      gl.attachShader(program, vs);
      gl.attachShader(program, fs);
      gl.linkProgram(program);
      gl.flush();
      this.program = program;
      this.compiling = { vs, fs, since: performance.now() };
    }
    enableLegacy() {
      if(this.pipeline==='legacy')return;
      this.pipeline='legacy';this.source=this.floatTerrainFiltering ? this.legacySource.replace('#version 300 es', '#version 300 es\n#define FLOAT_TERRAIN_FILTERING') : this.legacySource;this.compile();
    }
    bindWorldworks(body, program=this.program, index=0) {
      const gl=this.gl, loc=n=>gl.getUniformLocation(program,n);
      const data=LongwayCore.PlanetEngines?.documentFor(body);
      if(!this.worldworksTexture){this.worldworksTexture=gl.createTexture();this.worldworksKey=null;}
      gl.activeTexture(gl.TEXTURE9);gl.bindTexture(gl.TEXTURE_2D,this.worldworksTexture);
      const key=data?.key||'empty';
      if(this.worldworksKey!==key){
        const side=data?data.doc.n+1:1;
        gl.texImage2D(gl.TEXTURE_2D,0,gl.R32F,side,side,0,gl.RED,gl.FLOAT,data?.heights||new Float32Array(1));
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
        this.worldworksKey=key;
      }
      gl.uniform1i(loc('uWorldworks'),9);gl.uniform1i(loc('uWorldworksEnabled'),data?1:0);gl.uniform1i(loc('uWorldworksBody'),index);gl.uniform1f(loc('uWorldworksWater'),data?.doc.env.water||0);
      gl.activeTexture(gl.TEXTURE0);
    }
    ensureReady() {
      if (this.ready) return true;
      if (this.lost || !this.compiling) return false;
      const gl = this.gl,
        program = this.program;
      if (
        this.parallel &&
        !gl.getProgramParameter(program, this.parallel.COMPLETION_STATUS_KHR)
      )
        return false;
      const { vs, fs } = this.compiling;
      if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
        const message =
          gl.getProgramInfoLog(program) ||
          gl.getShaderInfoLog(fs) ||
          gl.getShaderInfoLog(vs) ||
          "Shader link failed";
        gl.deleteShader(vs);
        gl.deleteShader(fs);
        this.compiling = null;
        throw new Error(message);
      }
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      this.compiling = null;
      gl.useProgram(program);
      const names = [
        "uResolution",
        "uForward",
        "uRight",
        "uUp",
        "uSun", "uStarColor", "uAtmoTint[0]", "uCloudProps[0]", "uWeatherFronts[0]",
        "uTime",
        "uFov",
        "uCount",
        "uMaxSteps",
        "uQuality",
        "uView",
        "uBodies[0]",
        "uProps[0]",
        "uOffsets[0]",
        "uSpin[0]",
        "uHasRings[0]",
        "uNoise",
        "uBioTiles",
        "uClimate[0]",
        "uTint[0]",
        "uSiteBody",
        "uSiteStyle",
        "uFlora",
        "uPlantCount",
        "uAnimalCount",
        "uSiteSeed",
        "uSitePos",
        "uStationPos",
        "uPlantColor",
        "uSiteBasis",
        "uStationBasis",
        "uPlantBasis",
        "uSiteHeight", "uSiteExtent",
        "uPlants[0]",
        "uAnimals[0]",
        "uAnimalInfo[0]",
        "uShipPos",
        "uShipDimensions",
        "uShipPaint",
        "uShipAccent",
        "uShipBasis",
        "uShipSystems",
        "uShipLayout",
        "uShipRCS",
        "uShipSpeed",
        "uShipHeat",
        "uShipView",
        "uCockpit",
        "uSpeedEffects",
        "uCockpitStates[0]",
        "uCockpitMotion",
        "uCockpitPress",
        "uAlbedoMap",
        "uNormalMap",
        "uORMMap",
        "uExteriorProbe",
        "uInteriorProbe",
        "uProbePass",
        "uAOEnabled",
        "uReflections",
        "uNormalStrength",
        "uProbePosition",
        "uCombatCount",
        "uShotCount",
        "uWalking",
        "uMeshForeground",
        "uArtworkActive", "uArtworkMask", "uArtworkRect",
        "uInteriorActive", "uInteriorOrigin", "uInteriorBounds",
        "uStarVisibility",
        "uDetailTerrainBody", "uTerrainCache", "uTerrainCacheBasis", "uTerrainCacheSize",
        "uArmed",
        "uGunRecoil",
        "uGunType",
        "uCombatBodies[0]",
        "uCombatForward[0]",
        "uCombatUp[0]",
        "uShotsA[0]",
        "uShotsB[0]",
      ];
      this.loc = {};
      for (const name of names)
        this.loc[name] = gl.getUniformLocation(program, name);
      this.artTexture=gl.createTexture();this.artTextureKey=null;gl.activeTexture(gl.TEXTURE8);gl.bindTexture(gl.TEXTURE_2D,this.artTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([0,0,0,0]));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
      const texture = (this.texture = gl.createTexture());
      gl.activeTexture(gl.TEXTURE0);
      gl.bindTexture(gl.TEXTURE_3D, texture);
      gl.pixelStorei(gl.UNPACK_ALIGNMENT, 1);
      const noise = this.world.noise.data, packedNoise = new Uint8Array(noise.length * 4);
      for (let z = 0; z < 64; z++) for (let y = 0; y < 64; y++) for (let x = 0; x < 64; x++) {
        const at = (a, b) => noise[(a & 63) + ((b & 63) << 6) + (z << 12)];
        packedNoise.set([at(x, y), at(x + 1, y), at(x, y + 1), at(x + 1, y + 1)], (x + (y << 6) + (z << 12)) * 4);
      }
      gl.texImage3D(
        gl.TEXTURE_3D,
        0,
        this.floatTerrainFiltering ? gl.R32F : gl.RGBA8,
        64,
        64,
        64,
        0,
        this.floatTerrainFiltering ? gl.RED : gl.RGBA,
        this.floatTerrainFiltering ? gl.FLOAT : gl.UNSIGNED_BYTE,
        this.floatTerrainFiltering ? Float32Array.from(noise, value => value / 255) : packedNoise,
      );
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_3D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      for (const p of [gl.TEXTURE_WRAP_S, gl.TEXTURE_WRAP_T, gl.TEXTURE_WRAP_R])
        gl.texParameteri(gl.TEXTURE_3D, p, gl.REPEAT);
      gl.uniform1i(this.loc.uNoise, 0);
      gl.uniform3fv(this.loc.uSun, LongwayCore.SUN);
      this.bioTexture = gl.createTexture();
      this.bioTextureSize = "";
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.bioTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.uniform1i(this.loc.uBioTiles, 1);
      gl.activeTexture(gl.TEXTURE0);
      this.cockpitCanvas ??= document.createElement("canvas");
      this.cockpitCanvas.width = 2048;
      this.cockpitCanvas.height = 1024;
      this.cockpitTexture = gl.createTexture();
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, this.cockpitTexture);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.texImage2D(
        gl.TEXTURE_2D,
        0,
        gl.RGBA,
        gl.RGBA,
        gl.UNSIGNED_BYTE,
        this.cockpitCanvas,
      );
      gl.uniform1i(this.loc.uCockpit, 2);
      this.lastCockpit = -1;
      this.materials?.dispose();
      this.materials = new BloxMaterials(this);
      gl.activeTexture(gl.TEXTURE0);
      this.vao = gl.createVertexArray();
      gl.bindVertexArray(this.vao);
      gl.disable(gl.DEPTH_TEST);
      gl.disable(gl.BLEND);

      gl.viewport(0, 0, this.canvas.width, this.canvas.height);
      this.ready = true;
      if (this.restoring) {
        this.restoring = false;
        root.dispatchEvent(new CustomEvent("longway-restored"));
      }
      return true;
    }
    requestRestore() {
      this.restoreAttempts++;
      if (this.lost) {
        try {
          this.loseExtension?.restoreContext();
          return true;
        } catch {
          return false;
        }
      }
      this.restoring = true;
      this.compile();
      root.dispatchEvent(new CustomEvent("longway-restoring"));
      return true;
    }
    setQuality(q) {
      q = Number.isInteger(q) && q >= 0 && q <= 2 ? q : 0;
      this.quality = q;
      this.maxSteps = [88, 144, 224][q];
    }
    resize(cssWidth, cssHeight, dpr = 1) {
      const limit = this.autoResolution
        ? this.pixelBudget
        : this.software
          ? 65536
          : 2073600;
      let size = this.fixed
        ? LongwayRuntime.renderSize(this.fixed[0], this.fixed[1], 1, 1, limit)
        : LongwayRuntime.renderSize(
            cssWidth,
            cssHeight,
            dpr,
            this.scale,
            limit,
          );
      const k = Math.min(
        1,
        this.maxViewport[0] / size[0],
        this.maxViewport[1] / size[1],
      );
      size = size.map((x) => Math.max(1, Math.floor(x * k)));
      if (this.canvas.width !== size[0] || this.canvas.height !== size[1]) {
        this.needsRender = true;
        this.canvas.width = size[0];
        this.canvas.height = size[1];
        if (!this.lost) this.gl.viewport(0, 0, ...size);
        this.resetTimings();
      }
    }
    adapt(frameMs, now) {
      if (
        !this.autoResolution ||
        this.frame < 16 ||
        now - this.lastAdapt < 1800 ||
        this.lost ||
        !this.ready
      )
        return false;
      this.lastAdapt = now;
      const ms = this.gpuMs || frameMs,
        target = this.software ? 75 : root.BloxVisuals?.stats?.ssao ? 9 : 16;
      if (!Number.isFinite(ms) || ms <= 0) return false;
      const old = this.pixelBudget;
      if (ms > target * 1.25)
        this.pixelBudget = Math.max(
          this.software ? 4096 : 30000,
          old * Math.max(0.48, target / ms),
        );
      else if (ms < target * 0.68)
        this.pixelBudget = Math.min(
          this.software ? 65536 : 1474560,
          old * 1.12,
        );
      return Math.abs(old - this.pixelBudget) > 1000;
    }
    resetTimings() {
      const gl = this.gl;
      if (!this.lost) for (const p of this.pending) gl.deleteQuery(p.q);
      this.pending = [];
      this.gpuMs = null;
      this.samples = [];
    }
    poll() {
      if (!this.timer || !this.pending.length || this.lost) return;
      const gl = this.gl;
      if (gl.getParameter(this.timer.GPU_DISJOINT_EXT)) {
        this.disjoints++;
        this.resetTimings();
        return;
      }
      while (this.pending.length) {
        const item = this.pending[0];
        if (!gl.getQueryParameter(item.q, gl.QUERY_RESULT_AVAILABLE)) break;
        const ms = gl.getQueryParameter(item.q, gl.QUERY_RESULT) / 1e6;
        gl.deleteQuery(item.q);
        this.pending.shift();
        if (Number.isFinite(ms) && ms > 0) {
          this.gpuMs = ms;
          this.samples.push({ ms, frame: item.frame, time: performance.now() });
          if (this.samples.length > 600) this.samples.shift();
        }
      }
    }
    render(flight, time, probe = null) {
      if (this.lost || !this.ensureReady()) return false;
      const gl = this.gl,
        L = this.loc;
      this.poll();
      const pilot = flight;
      // Keep the stellar background fixed while accelerating. Thrust-induced
      // FOV zoom made stationary stars appear to slide toward the player.
      this.fov = 0.69 - .19 * LongwayCore.smooth(flight.combat?.aimBlend || 0);
      const pose = probe?.pose || flight.renderPose?.();
      if (probe) this.fov = 1;
      gl.viewport(
        0,
        0,
        probe?.size || this.canvas.width,
        probe?.size || this.canvas.height,
      );
      if (pose) flight = { ...flight, ...pose, right: pose.right };
      const active = this.world.renderBodies(flight.position,flight.forward,this.fov,
        probe?1:this.canvas.width/this.canvas.height,probe?.size||this.canvas.height,flight.route?.target,!!probe);
      this.active = active;
      for (let i = 0; i < active.length; i++) {
        const b = active[i];
        this.bodies.set(
          [...LongwayCore.sub(b.center, flight.position), b.radius],
          i * 4,
        );
        this.props.set([b.type, b.amp, b.atmosphere, b.liquid], i * 4);
        this.offsets.set(b.offset, i * 3);
        this.climates.set(
          [b.frequency, b.terrainBase, b.biome, b.humidity],
          i * 4,
        );
        const climate=LongwayCore.PlanetClimate?.profile(b);this.weatherFronts.set([time/170+(b.seed%137),climate?.evidence.orbital?.tidallyLocked?1:0,climate?.dayK||280,climate?.nightK||250],i*4);
        this.tints.set(b.tint.map((v,k)=>v*(climate?.starColor[k]??1)),i*3);this.atmoTints.set(climate?.atmosphereColor||[.22,.48,1],i*3);this.cloudProps.set([climate?.coverage??.5,climate?.silicate||0,climate?.metal||0,climate?.wind||0],i*4);
      }
      gl.useProgram(this.program);
      gl.bindVertexArray(this.vao);
      gl.uniform2f(
        L.uResolution,
        probe?.size || this.canvas.width,
        probe?.size || this.canvas.height,
      );
      this.materials.bind(flight, !!probe);
      if(!probe) root.BloxArtwork?.update();
      const art=root.BloxArtwork,mask=art?.mask;
      const artOn=!probe && this.view===0 && art?.active && mask?.ready;
      gl.activeTexture(gl.TEXTURE8);gl.bindTexture(gl.TEXTURE_2D,this.artTexture);
      if(artOn){
        if(!this.artTexture){this.artTexture=gl.createTexture();this.artTextureKey=null;}
        gl.activeTexture(gl.TEXTURE8);gl.bindTexture(gl.TEXTURE_2D,this.artTexture);
        if(this.artTextureKey!==mask.kind){gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,mask.image);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);this.artTextureKey=mask.kind;}
        gl.uniform4f(L.uArtworkRect,mask.x/innerWidth,mask.y/innerHeight,mask.width/innerWidth,mask.height/innerHeight);gl.uniform1i(L.uArtworkMask,8);
      }
      gl.uniform1i(L.uArtworkMask,8);
      gl.uniform1i(L.uArtworkActive,artOn?1:0);
      const deck = this.app?.systems?.interiorPlan || root.longway?.systems?.interiorPlan;
      const inside = !probe && this.view === 0 && pilot.bridgeWalk && !root.longway?.systems?.seated?.startsWith("turret") && deck && root.BloxVisuals?.enabled;
      gl.uniform1i(L.uInteriorActive,inside?1:0);
      if(inside){
        gl.uniform3fv(L.uInteriorOrigin,root.longway.systems.bridgePosition);
        gl.uniform3f(L.uInteriorBounds,Math.max(...deck.rooms.map(r=>Math.max(Math.abs(r.x0),Math.abs(r.x1)))),deck.end,deck.bridgeEnd);
      }
      gl.activeTexture(gl.TEXTURE0);
      gl.uniform3fv(L.uForward, flight.forward);
      gl.uniform3fv(L.uRight, flight.right);
      gl.uniform3fv(L.uUp, flight.up);
      gl.uniform1f(L.uTime, time);
      gl.uniform1f(L.uFov, this.fov);
      gl.uniform1i(L.uCount, active.length);
      gl.uniform1i(L.uMaxSteps, this.maxSteps);
      gl.uniform1i(L.uQuality, this.quality);
      gl.uniform1i(L.uView, this.view);
      gl.uniform4fv(L["uBodies[0]"], this.bodies);
      gl.uniform4fv(L["uProps[0]"], this.props);
      gl.uniform3fv(L["uOffsets[0]"], this.offsets);
      gl.uniform4fv(L["uSpin[0]"],new Float32Array(active.flatMap(b=>[...(b.spinAxis||[0,1,0]),b.spin||0])));
      gl.uniform1fv(L["uHasRings[0]"],new Float32Array(active.map(b=>b.rings?1:0)));
      gl.uniform3fv(L.uSun,root.longway?.celestial?.sun(flight.position)||LongwayCore.SUN);
      const C = LongwayCore,
        near = this.world.nearest(flight.position, active),
        body = near.body,
        site = this.world.site(body),
        ns = this.world.nearestStation(flight.position, active),
        station = ns.station;
      this.bindWorldworks(body,this.program,active.findIndex(b=>b.id===body.id));
      const atmosphereDepth = body.atmosphere * body.radius;
      const daylight = C.smooth(C.clamp((C.dot(C.unit(C.sub(flight.position,body.center)),root.longway?.celestial?.sun(flight.position)||C.SUN)+.06)/.22,0,1));
      const skyDensity = atmosphereDepth > 0 ? C.clamp(1-Math.max(near.altitude,0)/atmosphereDepth*1.4,0,1) : 0;
      gl.uniform1f(L.uStarVisibility,1-daylight*skyDensity);
      this.starVisibility=1-daylight*skyDensity;
      const detailStage=root.BloxVisuals;
      const terrain=detailStage?.terrain,cache=terrain?.userData.rayHeightCache;
      const cacheActive=!probe&&detailStage?.enabled&&terrain?.visible&&detailStage.terrainBody===body.id&&detailStage.surfaceBlend>=.999&&cache;
      if(!this.terrainCacheTexture){this.terrainCacheTexture=gl.createTexture();gl.activeTexture(gl.TEXTURE10);gl.bindTexture(gl.TEXTURE_2D,this.terrainCacheTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.R32F,1,1,0,gl.RED,gl.FLOAT,new Float32Array(1));gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.NEAREST);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);}
      gl.activeTexture(gl.TEXTURE10);gl.bindTexture(gl.TEXTURE_2D,this.terrainCacheTexture);
      if(cacheActive){
        if(this.terrainCacheKey!==cache){gl.texImage2D(gl.TEXTURE_2D,0,gl.R32F,cache.side,cache.side,0,gl.RED,gl.FLOAT,cache.heights);this.terrainCacheKey=cache;}
        const f=terrain.userData.worldFrame;
        gl.uniformMatrix3fv(L.uTerrainCacheBasis,false,new Float32Array([...f.right,...f.up,...f.forward.map(v=>-v)]));
        gl.uniform2f(L.uTerrainCacheSize,cache.halfSize,cache.side-1);
      }
      gl.uniform1i(L.uTerrainCache,10);
      gl.uniform1i(L.uDetailTerrainBody,cacheActive?active.findIndex(b=>b.id===body.id):-1);
      gl.activeTexture(gl.TEXTURE0);
      const basis = (f) =>
        new Float32Array([...f.right, ...f.up, ...f.forward]);
      gl.uniform4fv(L["uClimate[0]"], this.climates);
      gl.uniform3fv(L["uTint[0]"], this.tints);
      gl.uniform3fv(L["uAtmoTint[0]"],this.atmoTints);gl.uniform4fv(L["uCloudProps[0]"],this.cloudProps);gl.uniform4fv(L["uWeatherFronts[0]"],this.weatherFronts);gl.uniform3fv(L.uStarColor,LongwayCore.PlanetClimate?.profile(near.body).starColor||[1,1,1]);
      gl.uniform1i(
        L.uSiteBody,
        active.findIndex((b) => b.id === body.id),
      );
      gl.uniform1i(L.uSiteStyle, site.style);
      gl.uniform1ui(L.uSiteSeed, body.seed);
      gl.uniform3fv(L.uSitePos, C.sub(site.center, flight.position));
      gl.uniformMatrix3fv(L.uSiteBasis, false, basis(site));
      gl.uniform1f(L.uSiteHeight, site.height);gl.uniform1f(L.uSiteExtent,site.extent||.28);
      gl.uniform3fv(L.uStationPos, C.sub(station.center, flight.position));
      gl.uniformMatrix3fv(L.uStationBasis, false, basis(station));
      let plants = [],
        agents = [],
        plantFrame = site;
      if (this.pipeline !== 'mesh-and-terrain' && near.altitude < 4.0 && ns.distance > 2.5) {
        plants = this.world.streamVegetation(flight.position, body, 40);
        plantFrame = this.world.plantFrame || site;
        if (
          (body.biome !== 6 && body.type !== 3) ||
          C.length(C.sub(flight.position, site.center)) < 0.89
        )
          agents = this.world.streamFauna(flight.position, body).slice(0,this.animals.length/4);
      }
      this.plants.fill(0);
      this.animals.fill(0);
      this.animalInfo.fill(0);
      for (let i = 0; i < plants.length; i++)
        this.plants.set(
          [...C.sub(plants[i].position, flight.position), plants[i].size],
          i * 4,
        );
      const inPort = C.length(C.sub(flight.position, site.center)) < 1.8,
        aq = this.world.toLocal(flight.position, plantFrame);
      for (let i = 0; i < agents.length; i++) {
        const a = agents[i];
        let x = inPort
            ? i < 8
              ? a.x * 0.22
              : (i % 2 ? -0.77 : 0.77) + a.x * 0.14
            : Math.round(aq[0] / 0.25) * 0.25 + a.x,
          z = inPort ? a.z - 0.06 : Math.round(aq[2] / 0.25) * 0.25 + a.z;
        const guess = this.world.fromLocal([x, 0, z], plantFrame),
          n = C.unit(C.sub(guess, body.center)),
          position =
            a.position ||
            C.add(
              body.center,
              C.mul(n, body.radius + this.world.height(body, n) + 0.001),
            );
        this.animals.set([...C.sub(position, flight.position), a.size], i * 4);
        const identity =
          typeof a.id === "number"
            ? a.id
            : String(a.id)
                .split("")
                .reduce(
                  (h, ch) => (Math.imul(h, 31) + ch.charCodeAt(0)) | 0,
                  17,
                );
        this.animalInfo.set(
          [a.yaw, a.type, a.phase, C.hash(identity ^ body.seed) % 4096],
          i * 4,
        );
      }
      if (
        pilot.vehicle &&
        (this.lastCockpit < 0 || performance.now() - this.lastCockpit > 160)
      ) {
        LongwayCockpit.draw(this.cockpitCanvas, pilot);
        gl.activeTexture(gl.TEXTURE2);
        gl.bindTexture(gl.TEXTURE_2D, this.cockpitTexture);
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          gl.RGBA,
          gl.UNSIGNED_BYTE,
          this.cockpitCanvas,
        );
        gl.activeTexture(gl.TEXTURE0);
        this.lastCockpit = performance.now();
      }
      if (pilot.vehicle) {
        const v = pilot.vehicle,
          c = pilot.craft,
          vf = pilot.vehicleFrame();
        gl.uniform3fv(L.uShipPos, C.sub(v.position, flight.position));
        gl.uniformMatrix3fv(L.uShipBasis, false, basis(vf));
        gl.uniform3fv(L.uShipDimensions, c.dimensions);
        gl.uniform3fv(L.uShipPaint, c.paint);
        gl.uniform3fv(L.uShipAccent, c.accent);
        gl.uniform4f(
          L.uShipSystems,
          v.gear,
          v.thrust,
          v.canopy,
          v.hyper === "active"
            ? 1
            : v.hyper === "charging"
              ? v.charge * 0.45
              : (pilot.drive?.cruiseSpool || 0) * 0.36,
        );
        const d = pilot.drive;
        gl.uniform1fv(
          L["uCockpitStates[0]"],
          new Float32Array(C.CockpitLayout.states(pilot)),
        );
        gl.uniform4f(
          L.uCockpitMotion,
          d?.stick[0] || 0,
          d?.stick[1] || 0,
          v.thrust,
          d?.lights ? 1 : 0,
        );
        gl.uniform2f(
          L.uCockpitPress,
          d?.buttonPulse ?? -1,
          Math.min(1, (d?.pulseTime || 0) * 7),
        );
        gl.uniform4f(L.uShipLayout, c.family, c.sweep, c.variant, c.engineSize);
        gl.uniform3fv(L.uShipRCS, v.rcs || [0, 0, 0]);
        gl.uniform1f(L.uShipSpeed, pilot.speed * 1000);
        gl.uniform1f(L.uShipHeat, v.heat);
        gl.uniform1i(L.uShipView, pose?.shipView || 0);
        gl.uniform1f(L.uSpeedEffects, this.speedEffects && !pilot.walking && !pilot.bridgeWalk ? 1 : 0);
      }
      gl.uniform1i(L.uFlora, body.flora);
      gl.uniform3fv(L.uPlantColor, body.plantColor);
      gl.uniform1i(L.uPlantCount, plants.length);
      gl.uniform1i(L.uAnimalCount, agents.length);
      gl.uniformMatrix3fv(L.uPlantBasis, false, basis(plantFrame));
      gl.uniform4fv(L["uPlants[0]"], this.plants);
      gl.uniform4fv(L["uAnimals[0]"], this.animals);
      gl.uniform4fv(L["uAnimalInfo[0]"], this.animalInfo);
      if(this.pipeline !== 'mesh-and-terrain') {
      const instances = [];
      for (let i = 0; i < plants.length; i++)
        instances.push({
          index: i,
          position: Array.from(this.plants.subarray(i * 4, i * 4 + 3)),
          size: this.plants[i * 4 + 3],
          animal: false,
        });
      for (let i = 0; i < agents.length; i++)
        instances.push({
          index: 40 + i,
          position: Array.from(this.animals.subarray(i * 4, i * 4 + 3)),
          size: this.animals[i * 4 + 3],
          animal: true,
        });
      const tiles = LongwayRuntime.buildBioTiles(
        {
          width: this.canvas.width,
          height: this.canvas.height,
          fov: this.fov,
          forward: flight.forward,
          right: flight.right,
          up: flight.up,
          plantUp: plantFrame.up,
        },
        instances,
      );
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, this.bioTexture);
      const tileSize = tiles.width + "x" + tiles.height;
      if (this.bioTextureSize !== tileSize) {
        gl.texImage2D(
          gl.TEXTURE_2D,
          0,
          gl.R8UI,
          tiles.width,
          tiles.height,
          0,
          gl.RED_INTEGER,
          gl.UNSIGNED_BYTE,
          tiles.data,
        );
        this.bioTextureSize = tileSize;
      } else
        gl.texSubImage2D(
          gl.TEXTURE_2D,
          0,
          0,
          0,
          tiles.width,
          tiles.height,
          gl.RED_INTEGER,
          gl.UNSIGNED_BYTE,
          tiles.data,
        );
      gl.activeTexture(gl.TEXTURE0);
      }
      if (near.altitude < 10 && this.frame % 30 === 0)
        this.world.prefetchSurface(flight.position, body, flight.forward);
      this.sceneInfo = {
        surfaceCache: this.world.streamStats,
        planets: active.length,
        plants: plants.length,
        animals: agents.length,
        site: site.name,
        station: station.name,
      };

      const combat = pilot.combat;
      const bodies = new Float32Array(64),
        directions = new Float32Array(64),
        ups = new Float32Array(64),
        shotsA = new Float32Array(256),
        shotsB = new Float32Array(256);
      const contacts = (combat?.contacts() || []).slice(0, 16);
      for (let i = 0; i < contacts.length; i++) {
        const e = contacts[i];
        bodies.set(
          [...C.sub(e.position, flight.position), e.radius || 0.011],
          i * 4,
        );
        directions.set(
          [
            ...e.forward,
            e.kind === "ally"
              ? 1
              : e.kind === "pilot"
                ? 3
                : e.kind === "sentry"
                  ? 2
                  : 0,
          ],
          i * 4,
        );
        ups.set([...e.up, e.hull / 100], i * 4);
      }
      const shots = [
        ...(combat?.projectiles || []).map((p) => ({
          a: p.position,
          b: C.sub(
            p.position,
            C.mul(
              p.direction || C.unit(p.velocity),
              p.weapon === "missile" ? 0.018 : 0.012,
            ),
          ),
          color: p.color,
          ttl: p.ttl,
        })),
        ...(combat?.effects || []),
      ].slice(-64);
      for (let i = 0; i < shots.length; i++) {
        const p = shots[i];
        shotsA.set([...C.sub(p.a, flight.position), p.color], i * 4);
        shotsB.set(
          [...C.sub(p.b, flight.position), Math.min(1, p.ttl / 0.2)],
          i * 4,
        );
      }
      gl.uniform1i(L.uCombatCount, contacts.length);
      gl.uniform4fv(L["uCombatBodies[0]"], bodies);
      gl.uniform4fv(L["uCombatForward[0]"], directions);
      gl.uniform4fv(L["uCombatUp[0]"], ups);
      gl.uniform1i(L.uShotCount, shots.length);
      gl.uniform4fv(L["uShotsA[0]"], shotsA);
      gl.uniform4fv(L["uShotsB[0]"], shotsB);
      gl.uniform1i(L.uWalking, !probe && pilot.walking ? 1 : 0);
      gl.uniform1i(L.uMeshForeground, !probe && root.BloxVisuals?.enabled && this.view===0 ? 1 : 0);
      gl.uniform1i(L.uArmed, combat?.armed ? 1 : 0);
      gl.uniform1f(L.uGunRecoil, combat?.recoil || 0);
      gl.uniform1i(L.uGunType, combat?.key === "sidearm" ? 1 : 0);
      let q = null;
      if (
        !probe &&
        this.timer &&
        this.pending.length < 3 &&
        this.frame % 8 === 0
      ) {
        q = gl.createQuery();
        gl.beginQuery(this.timer.TIME_ELAPSED_EXT, q);
      }
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      if (q) {
        gl.endQuery(this.timer.TIME_ELAPSED_EXT);
        this.pending.push({ q, frame: this.frame });
      }
      this.needsRender = false;
      if (!probe) { this.frame++; if(root.BloxVisuals?.enabled) { root.BloxVisuals.canvas.style.visibility=this.view===0?"visible":"hidden"; if(this.view===0)root.BloxVisuals.render(pilot,time); }}
      return true;
    }
    check() {
      return {
        frame: this.frame,
        error: this.gl.getError(),
        lost: this.lost,
        ready: this.ready,
        activeBodies: this.active?.length || 0,
        hardware: this.hardware,
        scene: this.sceneInfo,
        renderSize: [this.canvas.width, this.canvas.height],
        pixelBudget: this.pixelBudget,
        lossCount: this.lossCount,
      };
    }
  }
  root.LongwayRenderer = Renderer;
})(globalThis);
