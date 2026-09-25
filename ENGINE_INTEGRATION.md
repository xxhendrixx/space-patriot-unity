# Original engines in the Unity restoration

This is an unfinished restoration. Preserving source files is different from running their behavior in Unity. The original HTML engines and runtime exports remain in `Reference/Original`; the table below describes actual integration.

| Engine | Runs in this version | Still missing |
| --- | --- | --- |
| Worldworks / Terrainworks | Build tools execute the original JavaScript cores for 14 solid-world height, moisture, temperature and rock fields. Unity samples those fields into a closed planet mesh with local terrain, collision and matched walking height. | Complete climate profiles, seamless global exploration and surface gravity. The detailed landing region is finite. |
| Grassworks | Native five-segment grass blades, terrain rooting, original wind equations, stable nearby tiles and distance/altitude culling. | Full biome population, far-field vegetation and desktop performance tuning. |
| Spellworks | Bounded native effect pools, original lifetime/drag/gravity/turbulence behavior, impact sparks, explosive fire/smoke, muzzle effects and survey effects connected to gameplay. | Every original preset and authored effect combination. |
| Oceanworks | Curved local water surface with directional waves, swell, crest foam and time-varying normals. | Full reflections, wave breaking and global oceans. |
| Weatherworks | Native wetness, snow, gust equations, precipitation near the player and roof occlusion. Ground materials respond to wetness and snow. | Original cloud fronts, lightning and complete weather/climate simulation. |
| Fireworks | Flame lifecycle, buoyancy, taper, turbulence and heat gradient used for nearby wreck impacts. Six finite emitter slots are recycled. | All original fire, ember and smoke stages. Smoke currently uses Spellworks. |
| Architectureworks | Original furnished buildings and lifts; seven connected service districts, street blocks and 420 named regional destinations with persistent state. | Bespoke cities, complete tower interiors and seamless global placement. |
| Machineworks | Native vessel power/component state and working hangar lift/roof mechanisms. | Complete original machine graph and dependencies. |
| Storyworks | Nine cases and 27 objective gates/rewards connected to the campaign. | Full original 90-node graph interpreter and event parity. |
| Inventoryworks | Cargo handling with settlement-specific dock stock; field inventory, weight limits, original ammo/repair/sample recipes and named NPC exchanges. | Complete equipment and consumable parity. |
| Pathworks | Native street itineraries for residents, job/needs-driven schedules and owned NPC vessel routes. Original source remains preserved. | General obstacle-aware path planning, crowd avoidance and full original graph parity. |
| Creatureworks | Original alien plant models imported. | Articulated creatures, locomotion, IK and body-part damage. |

The refitted fleet uses ten distinct chassis with original dimensions, finishes, atlas textures and preserved interiors. The asset pipeline is in `Tools/AssetPipeline`. This is a first visual revision, not a finished art pass.

`Validation/engine-restoration.txt` covers terrain continuity, walking/mesh agreement, bounded grass/effect populations and the integrated runtime components. Input checks use synthetic Unity Input System devices. Physical controller feel, complete missions and sustained desktop performance still require testing.

The society simulation, community jobs, original named exchanges, multideck layouts and Blender art source are documented in [design and implementation notes](ArtDirection/DESIGN_AND_IMPLEMENTATION.md).
