# Planetary flight, cockpit depth and manual arrival

2026-09-22 follow-up to `GRAPHICS_FEATURE.md`. This supersedes its original automatic port-hover arrival design. Both game distributions are built from `source/`; the original cockpit bitmap assets are preserved.

## What changed

- **Planet appearance:** removed the generic ground-haze splats. Geological textures replace illustrated surface tiles, and rock/soil blends retain their mineral tint rather than mixing bright uncoloured textures over the terrain. Desert terrain no longer receives the mountain-frost overlay. Close planetary ray shading uses continuous height-field normals instead of differentiating stepped ray-hit distances. Venus, Mars and Mercury no longer inherit open water from a fictional desert biome; Venus uses a greenhouse-heated surface temperature rather than its equilibrium temperature for the local climate.
- **Streaming:** terrain samples are prepared over successive frames, with a target budget of 2.5 ms per frame (1.5 ms in Fast). The previous valid patch remains available until the next patch and its shaders are ready. Jobs are cancelled on body/view-mode changes and carried with the rotating planet. Terrain and forest materials retain their compiled programs across rebuilds. Local precipitation uses a smaller contact grid backed by the rendered terrain cache. Non-grass biome plants now share instanced prototype geometry and constant-time ground lookup, replacing repeated full-mesh ray tests and individual tree construction. Vegetation preparation yields in smaller batches.
- **Visibility:** forests and surface rocks/shrubs use spatial instance batches with bounds, allowing independent camera and shadow-frustum rejection. Distant vegetation uploads/draws only visible, in-range splats; cached sorting buffers reduce garbage collection. Explosion bursts outside the camera are excluded from drawing while their lifetimes continue. Both renderers skip shading behind the opaque illustrated cockpit. Live six-direction reflection captures have been replaced by filtered environment lighting in every preset. Off-camera objects may still contribute necessary shadows; this is not a claim of complete scene-wide occlusion culling.
- **All spacecraft cockpits:** Strider, Wayfarer and Meridian layouts cover the existing craft variants. Displays have deeper bezels, recessed glass shading and less vertical compression. A masked light layer and restrained seated motion add depth while retaining the original artwork, silhouettes and calibrated controls. Reduced-motion preference disables cockpit movement, and Fast uses a fixed cockpit. The artwork, ray mask, mesh depth mask, controls and screenshot compositor share the same placement.
- **Planet arrival:** world jumps, surface-marker jumps, navigation approaches and wilderness transfers stop outside the atmosphere and terrain envelope. The final six seconds decelerate continuously from approximately 300 m/s to zero across 600 m. The ship remains in flight; the player enters the atmosphere and requests landing. `W` advances, `X` brakes, and `L` requests landing within its existing safety range. Station docking and explicitly requested landing remain available. Orbital frame attachment blends continuously instead of snapping at a radius threshold.
- **Graphics resets:** environment, shadow and ambient-occlusion render targets are discarded while the old context is lost, then rebuilt for the restored context. This fixes a stale shadow-texture binding found during follow-up testing.

## Evidence and validation

The initial moving test found individual synchronous terrain builds around 195–235 ms and precipitation contact-grid updates reaching 54 ms. CPU profiling also found repeated shader-program inspection/compilation during population rebuilds. These costs were not exposed adequately by the previous stationary FPS samples.

Focused tools (separate from the project's excluded error-check system):

```text
node --test scripts/feature-behavior.test.mjs
node scripts/planet-flight-acceptance.mjs
node scripts/planet-flight-browser.mjs before
node scripts/planet-flight-browser.mjs final
node scripts/feature-acceptance.mjs normal
node scripts/feature-acceptance.mjs portable
node scripts/feature-acceptance.mjs fallback
node scripts/feature-acceptance.mjs compact
node scripts/feature-acceptance.mjs software
```

Fifteen deterministic checks cover the preserved combat/controller behavior, exterior arrival and monotonically decreasing braking speed, navigation/wilderness routes, continuous moving-world attachment, and pending terrain/vegetation attached to a rotating planet. The follow-up browser suite checks all three cockpit variants with actual projected mouse clicks, reduced motion, terrain retention/cancellation, camera culling and clean graphics contexts. In its populated Earth view, splat submission fell from 132,681 available instances to 30,964 visible instances; forest geometry used 98 independently bounded batches. The full existing browser regression also checks engineering, targeting, explosions, population settings, controllers and both context restorations.

| Moving route | Mean FPS before → final | p95 frame ms before → final | Maximum frame ms before → final | Mean CPU ms before → final |
| --- | --- | --- | --- | --- |
| venus-entry | 38.4 → 60.0 | 54.3 → 18.1 | 666.0 → 18.5 | 16.9 → 5.3 |
| venus-surface | 41.0 → 57.8 | 82.7 → 18.1 | 308.1 → 196.8 | 19.3 → 9.1 |
| earth-surface | 30.6 → 51.4 | 97.4 → 26.8 | 310.5 → 122.8 | 30.4 → 17.4 |

Final terrain-preparation p95 slices were 3.1–3.3 ms; the largest was 6.6 ms. Total patch work still spans many frames. Local weather updates averaged about 0.3 ms on the moving surface routes. Isolated low-altitude stalls remain (196.8 ms on Venus and 122.8 ms on Earth), despite substantially lower p95 frame times. The comparison includes the intended visual/world changes, including dry Venus terrain, rather than identical output pixels.

Reports, screenshots and final artifact hashes are under `build_logs/planet-flight/`; `before.json` and `final.json` are the final comparable measurements. Earlier `after.json`, `profile.json`, and `*-pass.json` files describe intermediate builds. Existing feature regression reports remain under `build_logs/graphics-feature/`.

The moving comparison uses the frozen pre-follow-up HTML and final HTML, identical canonical terrain coordinates, fixed daylight, 1280×720 viewport, Balanced quality, fixed ray budget and mesh pixel ratio 1. Routes descend from 14 km to 300 m and traverse 6 km at 180 m above ground. Frame times include preparation during movement, not just settled frames. Physical hardware is AMD Radeon RX 6700 with Chromium/ANGLE D3D11. There is no physical NVIDIA/Intel/Apple/mobile or controller coverage; capability and software tests do not substitute for those devices. Cold shader compilation, new assets and extreme population settings can still cause isolated stalls; these changes do not guarantee a fixed FPS on every device.

The final compatibility pass exposed excessive shader compilation when floating-point texture filtering was unavailable. That path now projects ray hits onto the continuous height field before calculating normals, avoiding stepped-distance shading bands and four expanded copies of the full packed-noise field. It samples the field once, reusing the shared terrain cache nearby. The regular floating-point path retains continuous field normals. This is a capability decision shared by all GPU vendors, not a vendor-specific workaround.

Final checks: 15 deterministic tests, 16 follow-up browser checks, 24 existing feature-regression checks, 5 packed-noise startup/surface checks, 5 compact touch/high-DPI checks, 3 software-renderer checks and 2 offline portable-launch checks passed. Syntax checks cover 112 JavaScript source/tool files. The normal, follow-up and packed-noise surface suites report clean graphics contexts. Final artifact sizes and SHA-256 hashes are recorded in `build_logs/planet-flight/validation-summary.json`. The last shader adjustment affects the packed-noise capability path; the floating-point path used for the moving measurements is unchanged. The project error-check system was not used.

## Research and implementation references

- [Three.js Object3D](https://threejs.org/docs/pages/Object3D.html), [InstancedMesh](https://threejs.org/docs/pages/InstancedMesh.html) and [Frustum](https://threejs.org/docs/pages/Frustum.html): use conservative object/instance bounds for camera rejection. Installed Three.js source was also checked for render ordering, shadow traversal, parallel material preparation and resource restoration.
- [MDN WebGL best practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices): avoid synchronous driver work, retain reusable resources and measure draw/shader costs.
- [NASA Venus facts](https://science.nasa.gov/venus/venus-facts/), [Solar-system temperatures](https://science.nasa.gov/solar-system/temperatures-across-our-solar-system/) and [NASA's Venus water explanation](https://www.nasa.gov/science-research/heliophysics/electric-wind-can-strip-earth-like-planets-of-oceans-atmospheres/): present-day Venus has an extremely hot, dry surface. The game still uses compressed radii, generated terrain and fictional settlements; these are not planetary survey reconstructions.

## Source map

`visuals/environment.js`, `stage.js`, `weather-stage.js`, `surface-transition.js`: terrain jobs, material lifetime, precipitation contacts and graphics recovery. `visuals/vegetation-stage.js`, `forest-stage.js`, `surface-detail.js`, `gaussian-splats.js`, `view-culling.js`, `explosions.js`: visibility and population work. `artwork-ui.js` and `citizen.css`: cockpit depth/placement. `expedition.js`, `celestial.js`, `flight-ui.js`, `shell.html`, `app.js`: manual planetary arrival and matching UI. `living.js`, `climate.js`, `world.frag.glsl`, `visuals/art-materials.js`: planetary appearance.
