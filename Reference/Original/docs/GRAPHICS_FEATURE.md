# Graphics, world population, flight and controllers

Implementation and validation record, 2026-09-22. Request: `Planner_Board/html_game_bug_fixes_and_enhancements_.md`, plus richer planets, Xbox/other controllers, and support beyond the development PC, including NVIDIA and AMD.

The subsequent [planetary flight and cockpit follow-up](PLANET_FLIGHT_FOLLOWUP.md) contains the latest rendering and arrival behavior, moving-route measurements and validation. Historical G1–G4 measurements below remain labelled as their original samples.

## Running and controls

Run `npm ci`, then `npm start`, and open `http://localhost:4173`. `npm run build` regenerates `index.html` and the self-contained `Space_Patriot.html`; the latter can also be opened directly. No project error-check system was used.

In **Terminal → Settings → Display & controls**:

- **Detail preset** selects Fast, Balanced or High. Fast reduces ray steps, mesh resolution and shadow resolution and disables SSAO. Small touch screens, devices reporting at most 4 GB system memory, and software renderers start in Fast. These are conservative starting hints; users can change the preset.
- **World population** defaults to Auto: Sparse with Fast/software, Balanced with Balanced detail, Lush with High. Explicit population selections override that relationship.
- **Ship targeting PIP** selects lead or lag behavior. Lead: aim at the moving circle. Lag: move the predicted impact circle onto the target. Missile selection shows acquisition progress and lock instead.
- **Controller setup** offers device selection, dead zone, sensitivity, vertical look inversion, and expandable axis/button mappings, including menu navigation. Live axes and button numbers help configure nonstandard layouts. Settings persist locally.

| Xbox / standard control | Action |
| --- | --- |
| Left stick | Forward/back and strafe |
| Right stick | Look |
| LB / RB | Down / up |
| LT / RT | Brake or personal-weapon aim / fire |
| A / B / X / Y | Boost or sprint / interact or land / reload / next target |
| View / Menu | Camera / terminal |
| Left / right stick click | Flight assist / arm weapons |
| D-pad up / down | Cycle weapon / landing gear |
| D-pad left / right | Roll |
| D-pad in terminal | Focus controls; left/right adjusts ranges and choices |
| A / B in terminal | Activate / resume |

After reconnecting or closing a menu, release buttons and center the sticks before flying. This prevents a held trigger or stick from resuming unexpectedly. Keyboard, mouse and touch controls remain available. Other controllers must be exposed by the browser's Gamepad API; axes/buttons can be remapped to their reported numbers.

## Implemented behavior

**Loading and engineering.** Windows static-file containment now uses actual path components and rejects malformed/escaping URLs. Terrain shader preparation removes unreachable legacy foreground functions and avoids expensive driver unrolling. Floating-filtering capability selects the noise sampling path; the alternative uses exact packed-corner interpolation. Distant normals use screen derivatives, while nearby collision terrain and rendered terrain retain the shared height cache. Startup waits for artwork/mesh initialization and the first completed frame, with bounded compilation and image-loading deadlines. An unavailable atlas gets a generated local fallback without disabling detailed geometry. Engineering changes use the same simulation state in the terminal and cockpit displays; inverse projective pointer mapping and explicit redraw fix paused display interaction.

**Worlds and rendering.** Forest density increases within a finite radius; rocks and low plants use spatial instance batches with caps of 120/240/360. Wildlife caps are 12/18/24, with simpler distant models and hysteresis between levels of detail. Ground/water/settlement exclusions remain. Grass tiles, distant splats, and forest placement are prepared incrementally. Surface tint remains stable when patches move. Derived normal/ORM textures share albedo orientation and use linear data color space and mipmaps; terrain sampling uses stable derivatives. Fast startup uses 256px albedo and 128px data tiles instead of 512/256, reducing their pixel storage by 75%.

All presets use a filtered static lighting environment; the follow-up removes live cubemap captures. SSAO uses fewer samples and is omitted in Fast. Fast shadows use 1024px maps, other presets 2048px, capped to the reported texture limit. Adaptive mesh resolution uses asynchronous GPU timings when available and smoothed frame intervals otherwise. Material and instance ownership is cleaned up on rebuild. The legacy ray layer no longer repeats mesh vegetation/wildlife preparation; its fallback wildlife array is explicitly bounded. GPU context recovery recreates the mesh environment and discards stale timing queries.

**Combat and flight.** Fatal shots retain their travel direction projected onto local ground; near-vertical shots have a stable fallback. Bots fall over approximately 0.85 seconds, cease participating in combat immediately, remain visible for 12 seconds, and award kills only once. Corpses, particles and projectile vectors follow rotating world frames. Ship explosions combine a bounded expanding flash/fireball, sparks/debris and dissipating smoke; persistent ground fire still requires suitable atmospheric terrain. The additional fireball pool is limited to eight events × 48 particles.

Ship targeting uses fine cyan/white gun marks, hostile brackets, range and closing speed, velocity indication, off-screen direction, lead/lag PIPs, and progressive missile-lock feedback. Projectile prediction accounts for shooter velocity; kinetic projectiles inherit that velocity. Locks reset immediately on target changes. Crew snapshot checks accommodate inherited projectile speeds and validate corpse vectors. The existing flight model retains coupled/decoupled controls, SCM/NAV, thrust, braking and speed limits. Engine capability now scales acceleration rather than simulation time. Planetary arrivals now decelerate to a stop outside the atmosphere and terrain envelope, leaving entry and landing to the pilot; see the follow-up for the superseding behavior.

The targeting and flight design is inspired by published Star Citizen concepts, not a claim of reproducing its complete flight model or assets.

## Validation and measured limits

Focused tools:

```text
node --test scripts/feature-behavior.test.mjs
node scripts/feature-acceptance.mjs normal
node scripts/feature-acceptance.mjs missing
node scripts/feature-acceptance.mjs portable
node scripts/feature-acceptance.mjs fallback
node scripts/feature-acceptance.mjs compact
node scripts/feature-acceptance.mjs software
node scripts/feature-browser.mjs comparison-baseline
node scripts/feature-browser.mjs comparison-final
```

The 12 deterministic checks cover interception, death direction/reward/expiry, lock identity, rotating frames, effect lifetime, crew snapshots, power-scaled acceleration/braking, continuous jump arrival, standard/nonstandard gamepads, held-input/disconnect handling, and Windows URL serving. All 84 JavaScript source files passed syntax checks during implementation; the build bundles the mesh modules.

The browser tools select D3D11 on Windows and Chromium's default backend elsewhere. `SP_ANGLE_BACKEND` can explicitly select `d3d11`, `gl`, `vulkan`, `metal` or `swiftshader` when supported by that platform. The reports record the actual renderer; changing an ANGLE backend does not simulate owning a different physical GPU.

Browser acceptance covers engineering presets/component isolation, real mouse clicks on the projected cockpit display, persistent settings, synthetic controller runtime, moving-target lead/lag, explosions, bot fall/expiry, Lush/Sparse limits, world switches, and recovery of both graphics contexts. Fault injection aborts the geology atlas request. Portable launch uses `file://` with embedded artwork and the browser offline. The fallback run disables `OES_texture_float_linear`; the compact run uses a 390×844 touch viewport at DPR 2 and disables GPU timer queries. Software validation uses SwiftShader at 800×600. Reports and screenshots are in `build_logs/graphics-feature/accept-*`.

### Comparable FPS sample

AMD Radeon RX 6700, Chromium 140.0.7339.186, ANGLE D3D11, Windows; 1280×720 viewport, fixed ray budget 460800 pixels/scale 0.7, mesh pixel ratio 1, Balanced detail, 120 warm-up and 180 measured frames per scene. Results are short local samples, not a cross-device guarantee. Browser scheduling caps the light scenes near 60 FPS.

The original supplied HTML did not complete shader startup within its 60-second deadline. The comparison baseline is the preserved **repaired-startup checkpoint**, `working-baseline.html`, before the population/rendering optimizations. It is not an invented FPS measurement of the failing original.

| Scene | Baseline FPS | Updated FPS | Baseline CPU ms | Updated CPU ms | Baseline p95 frame ms | Updated p95 frame ms |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Space | 60.0 | 60.0 | 3.2 | 3.3 | 17.6 | 17.6 |
| City | 42.9 | 51.8 | 19.5 | 10.4 | 43.8 | 51.3 |
| Forest / outpost | 52.3 | 54.9 | 12.9 | 8.5 | 39.8 | 44.3 |
| Wilderness | 50.3 | 51.2 | 15.5 | 11.1 | 50.6 | 46.2 |
| Low flight | 52.0 | 54.0 | 13.6 | 9.1 | 47.2 | 42.4 |
| Cloud city | 60.0 | 60.0 | 7.6 | 7.1 | 17.5 | 18.3 |

CPU is update/submission duration, not total GPU time. Average throughput improves in populated scenes, but city/outpost p95 spikes remain and some p95 measurements worsen. Wilderness contains 750 nearby trees versus 688, 18 visible animals versus 16, plus 240 instanced rocks/low plants. The count reported for grass is the existing engine's scale-component counter, not a verified individual-blade census. New draw statistics include all rendering passes; old main-pass counters must not be compared directly.

Successful cold boots ranged approximately 31–46 seconds on the tested hardware path; the forced non-floating-filter path took approximately 73 seconds. Shader compilation is still substantial and driver dependent. The software boot check completed, but it is not a software FPS benchmark.

### Device coverage

The implementation uses standard WebGL 2/Three.js and optional-extension checks. No AMD or NVIDIA-specific rendering API or shader branch is required. AMD's hardware path was exercised; SwiftShader and deliberately missing extensions exercised different capability paths. Touch emulation verifies layout/input availability, not real mobile GPU performance.

Physical NVIDIA, Intel, Apple/mobile GPUs, Firefox/Safari, physical Xbox/other controllers, and a live multiplayer crew were not available for this session. Their hardware/browser validation remains outstanding. Synthetic controllers and snapshot checks do not replace those tests. No claim is made that every possible bug is removed or that every device will reach a particular FPS.

## Source map and review scope

| Area | Principal sources |
| --- | --- |
| Startup, graphics recovery and input loop | `source/app.js`, `boot.js`, `runtime.js`, `renderer.js`, `world.frag.glsl` |
| World and flight simulation | `core.js`, `living.js`, `expedition.js`, `landscape.js`, `celestial.js`, `planet-engines.js` |
| Population, materials and mesh rendering | `visuals/stage.js`, `art-materials.js`, `environment.js`, `vegetation-stage.js`, `forest-stage.js`, `fauna.js`, new `surface-detail.js` |
| Combat, resources and crew state | `combat.js`, `systems.js`, `society.js`, `multiplayer.js`, new `visuals/explosions.js`, `visuals/engine-stage.js` |
| Displays and settings | `mfd-ui.js`, `artwork-ui.js`, `citizen-ui.js`, `systems-ui.js`, `flight-ui.js`, new `targeting-ui.js`, `controller.js`, `graphics-settings.js` |
| Build and serving | `scripts/build.mjs`, `scripts/serve.mjs`, `package.json`, lockfile |
| Generated engine integrations | `source/engines/*`, generated `engines-*.js`, `scripts/extract-engines.mjs`; generator output was rebuilt, not hand edited |

Source inventory and targeted review concentrated on rendering, simulation/input, startup, UI ownership and integration boundaries. Syntax checks also covered the remaining modules; this is not an exhaustive proof of all campaign/network/gameplay behavior.

Backups: `build_logs/graphics-feature/source-before.zip`, `baseline.html`, `portable-before.html`. Historical failed/intermediate reports are retained alongside successful acceptance results rather than silently discarded. The five Master records and identical phase boards contain the planning/continuation history.

## Research used

- [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): batching, mipmaps, bounded allocations and avoiding synchronous GPU waits.
- [Three.js textures](https://threejs.org/manual/pages/textures.html), [Texture API](https://threejs.org/docs/pages/Texture.html), [InstancedMesh API](https://threejs.org/docs/pages/InstancedMesh.html): color/data handling, filtering, instancing and ownership.
- [Khronos WebGL extension registry](https://registry.khronos.org/webgl/extensions/): optional extensions are capability checks, not universal prerequisites.
- [AMD RDNA performance guide](https://gpuopen.com/learn/rdna-performance-guide/) and [NVIDIA Graphics Pipeline Performance](https://developer.nvidia.com/gpugems/gpugems/part-v-performance-and-practicalities/chapter-28-graphics-pipeline-performance): measure the limiting work, batch submissions, and reduce unnecessary bandwidth/passes. The older NVIDIA chapter supplies general principles, not current hardware-specific tuning.
- [RSI flight model/input design](https://robertsspaceindustries.com/en/comm-link/engineering/13951-Flight-Model-And-Input-Controls), [PIP design reference](https://robertsspaceindustries.com/en/comm-link/transmission/14258-Arena-Commander-092-Released), [flight/fight improvements](https://robertsspaceindustries.com/en/comm-link/transmission/17647-Flight-Fight-Upcoming-Improvements), and [landing guidance](https://support.robertsspaceindustries.com/hc/en-us/articles/360020925254-How-to-Land-Your-Ship): concepts for coupled/decoupled flight, readable targeting and landing handoff.
- [MDN Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API/Using_the_Gamepad_API), [W3C Gamepad specification](https://www.w3.org/TR/gamepad/): polling, standard mappings and browser device access.
