# User engine integration — Frontier 11

The twelve supplied HTML applications are preserved byte for byte under `vendor/user-engines/`. Their original locations, sizes and SHA-256 hashes are in `vendor/user-engines/manifest.json`. The build checks those hashes, then extracts reusable code with `scripts/extract-engines.mjs`. No source page is executed as an iframe, and its editor controls, CDN loader, camera and independent animation loop are excluded.

| Supplied application | Code used in Space Patriot | Automatic inputs |
| --- | --- | --- |
| `grasspack3js.html` / Grassworks | Instanced tapered blades; anchored wind bending, gusts, turbulence and blade color variation | Planet climate, deterministic patch seed, sampled surface heights, water/port/slope exclusion |
| `oceanworksv2.html` / Oceanworks | Displaced traveling waves, chopped crests, finite-difference wave normals, breaking foam, whitecaps, reflective sky and sun glitter | Liquid type, climate and wave scale; simulation time |
| `Fireworks.html` / Fireworks | GPU flame, ember and smoke particle systems | Seeded volcanic vent positions, destroyed combat targets, atmospheric smoke availability, bounded emitter lifetime |
| `spellworks.html` / Spellworks | The original `MagicEngine`, pooled impact bursts, energy arcs, debris and shockwaves | Actual laser endpoints and hits, kinetic impacts, destruction, survey uplink events |
| `storyworks.html` / Worldworks | Its embedded deterministic heightfield generator, terrain sampling and seeded random generator | Planet seed; highlands, islands, desert or alpine relief chosen from planet type |
| `storyworks.html` / Storyworks | The original `StoryEngine` and `WorldworksStoryBridge` | On-foot arrival at the field site, real scan state and successful surface sample events |
| `Terrainworks.html` | Original seeded noise, domain warping, mountain/hill/erosion/terrace functions | Twenty-two percent of the shared regional base heightfield; biome-specific settings |
| `architectureworks.html` | Original document schema, room/wall/opening derivation, mesh compiler and colliders | Six rooms per floor, 3–6 floors per building, 16 buildings per port; space furniture host recipes |
| `Pathworks.html` | Original path document, spline/mesh generator, junctions and routing core | Five connected city paths; 2.32 km of pedestrian routes |
| `machineworks.html` | Original power/health/heat simulation, machine model and Three adapter | Reactors, batteries, fans, terminals, conveyors, pumps and powered lifts |
| `weatherworks.html` | Original WeatherSystem, weather model and precipitation adapters | Planet temperature/type, local sampled ground, common simulation time; indoors excluded |
| `inventoryworks.html` | Original inventory transactions, stacks, recipes and save validation | Weapon reserves, repair parts, field samples, alloy and fabrication |
| `creatureworks.html` | Original arthropod body builder and articulated gait/IK solver | Six-legged beetles with an authored beetle head; fantasy horns, wings, glowing cores and tails disabled |

## Planet generation

The existing globe-scale geology remains in use. Worldworks adds a seeded 5.76 km regional heightfield for each solid planet, blended into that geology. Temperate regions preserve the carved river channel and a dry landing bank; Worldworks supplies their surrounding relief. Desert regions use its terraces, ice worlds use alpine ridges, and rocky/volcanic regions use massif relief. Gas giants keep their atmosphere and walkable habitats.

Collision and walking sample the same triangular heightfield as the planet shader. The renderer uploads a 129 × 129 floating-point height texture for the nearest solid planet, with explicit triangle interpolation. A split origin preserves precision when projecting small regional coordinates on large planets. Only eight generated heightfield documents are retained; revisiting an evicted planet regenerates the same terrain from its seed.

Grassworks places up to 56,000 blades around the observer. Roots use a terrain-sampled local height grid. Water, port paving and steep patches exclude grass; patch edges taper. Grass patches stay anchored as the observer moves and are regenerated from deterministic surface tiles. Oceanworks animates the existing curved water mesh; lava retains its molten material; fires require a lightning or weapon event.

## Gameplay and effects

The **Explore the river valley** title-screen action uses the normal arrival, landing and egress simulation, completing those steps before handing control to the player. The **Wilds** destination in the atlas remains the normal travel path to other field sites.

The field HUD uses the existing generated instrument-frame artwork. Storyworks advances through arrival → scan with **B** → collect with **N** → completed field report. Sampling must succeed on foot within 300 metres of the field site. Gas habitat contracts finish after the scan. Existing game inventory, survey data and station sales remain the reward mechanism. Field contract progress is local to the current browser session; it is not a shared multiplayer campaign or part of the exported flight save.

Combat simulation continues to own hits and damage. Spellworks receives the resulting event once, identified by an ID preserved in network snapshots. Repeated snapshots do not replay the impact. Effects use a stable local frame measured in metres inside the kilometre-based universe, so camera movement does not drag emitted particles. Fireworks is limited to six simultaneous emitters; Spellworks retains its original bounded pools. Cosmetic randomness is local to each peer. Protocol 11 prevents incompatible older builds from joining this build's sessions. PeerJS binary serialization chunks the larger shared city and faction snapshots before sending them over WebRTC.

The custom shader meshes are excluded from the SSAO normal override: that pass cannot reproduce their vertex displacement. Terrain, ships, interiors and other physical meshes retain AO and reflection probes. Oceanworks uses the original shader's procedural sky reflection and glitter; it is not a fluid solver or full scene refraction system.

## Verification

- `npm test` exercises terrain determinism and cache bounds, valid landing sites, the original Storyworks schema, event-driven progress and duplicate-event handling, alongside existing combat/ship/interior tests.
- `npm run test:engines` verifies the title-screen entry, grass roots and animation, wave uniforms, survey progression, real combat-triggered effects, event deduplication, causal fires and resource bounds across planet changes. It captures actual game frames under `artifacts/lookdev/engine-*.png`.
- `npm run test:terrain` compares CPU and GPU heights at 197 sample locations, then lands and walks on all six planet categories and an orbital station.
- `npm run test:city` verifies furnished room entry, powered crafting, actual wall hits, elevator travel and supported movement onto an upper floor.
- `npm run test:society` verifies contextual dialogue, inventory and reputation consequences, coordinated faction fire, and a guest-operated elevator carrying both connected players.
- The portable file bundles all thirteen extracted runtimes from the twelve applications. No editor sliders or additional engine CDN requests are needed during play.

The source engines' rendering techniques are integrated, but their standalone showcases are not imported wholesale. Editor tools, demo arenas, standalone post-processing stacks, audio rigs and Worldworks sculpting controls remain in the archived originals.

## Cities and shared state

ArchitectureWorks' domestic furniture renderer is replaced by `architecture-furniture.js`: padded crew seats, lockers, workstations, medical bunks, galley fittings, equipment racks and industrial flooring. New city and machinery atlas surfaces replace wood/household material assignments. The document compiler supplies both rooms and static colliders. Door leaves are omitted for open passages. Shaft openings are converted to powered elevators, with interlocked landing doors, moving cabin floors and ceilings, and capsule support across the threshold.

Machineworks supplies the actual power and health state used by elevator motion and the ground-floor fabrication terminal. InventoryWorks owns reserve ammunition and repair parts, so reloading, repairing, fabrication and NPC deliveries operate on the same counts. Crafting requires proximity to a powered terminal. Gameplay inventory is included in the society local save; exported legacy flight saves remain a separate format.

Host snapshots replicate elevator positions, doors, machinery health, faction actors and reputation. Guests request elevator destinations; the host checks the reported player position and floor before acting. Planet terrain is deterministic on each peer. This remains a peer-hosted game, with the host responsible for combat and active district outcomes.

Faction tactical navigation routes on an original game grid around ArchitectureWorks building footprints; Pathworks supplies the city's visible pedestrian network. World conflicts and dialogue are original game systems in `society.js`. They use the shared actors, collision field and inventory rather than running another engine demo.

## Atlas expansion and rendering

Three new generated 4×4 atlases add 48 tiles to the original sixteen. The tile loader creates albedo plus derived normal/occlusion/roughness/metalness maps. City, machinery, terrain and animal materials use those tiles. Terrain mixes offset samples to reduce visible repetition, blends rock by slope and gravel near water, and concentrates geometry around the observer. Tree roots are projected onto the rendered terrain mesh. Reflection probes capture against a stable environment to avoid sampling their own output; water Fresnel input is clamped, and the capture target uses bounded channels. Screen-space AO remains available.

The original twelve source files are unchanged. Extractor adaptations (expanded level/foundation limits, injected terrain settings, local weather transforms, source wrappers and furniture replacement) are recorded in `scripts/extract-engines.mjs`. Exact atlas prompts are in `assets/FRONTIER_09_ATLAS_PROMPTS.md`.


Frontier 11 adds regional Terrainworks fields (moisture, temperature, rock, elevation and river influence), nine independently seeded Grassworks tiles, three local forest prototypes, weather-driven vertex bending, and sorted procedural Gaussian vegetation beyond the near meshes. The original demo controls remain available only in the archived HTML applications. World-generation parameters are resolved from location and current weather inside the game.

Storyworks also drives **The Long Debt**, a persistent nine-case graph with 90 nodes and 27 gameplay milestones. Its WorldworksStoryBridge consumes terminal, sample, power, cargo, combat and station events and applies credits, faction standing and market stock through the existing game systems. The source is `campaign-data.js`; `campaign.js` owns progression and `campaign-ui.js` connects actual gameplay. Both pause and in-world MFD views read the same state. See [THE_LONG_DEBT.md](THE_LONG_DEBT.md).
