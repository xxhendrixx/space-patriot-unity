# Space Patriot — Frontier 11

This update expands the actual world materials, regional generators and connected gameplay. Generated illustrations are source textures on modeled surfaces. They are not evidence that the rendered world matches a concept board's detail.

## Material library

Eleven atlases provide 128 square albedo cells. Each cell is extracted into its own repeating texture, which prevents one atlas cell bleeding into another. The loader derives approximate normal, AO and packed roughness/metalness maps from luminance and material class. These are artistic approximations, not measured material scans.

| New atlas | Indexed cells, left to right and top to bottom | Runtime use |
| --- | --- | --- |
| `alien-flora-atlas.png` | 0 violet leaf, 1 indigo grass, 2 plum bark, 3 burgundy fern, 4 protective bark, 5 waxy cuticle, 6 copper leaf veins, 7 lichen, 8 frost tissue, 9 felted leaf, 10 reed stem, 11 segmented bark, 12 succulent skin, 13 teal fern, 14 speckled leaf, 15 navy grass | Curved leaf meshes, forked trunks, fronds and Grassworks blade UVs; cold, exposure and wind affect selected forms and surfaces |
| `alien-fauna-atlas.png` | 0 plum fur, 1 reptile scales, 2 feather barbs, 3 chitin, 4 keratin plates, 5 indigo fur, 6 cooling skin, 7 reptile hide, 8 insulating fur, 9 down, 10 scale mosaic, 11 plated chitin, 12 antler, 13 granular skin, 14 mottled hide, 15 pale scales | Seeded family/variant skins and modeled crests, fins, plates and tails |
| `habitat-surfaces-atlas.png` | 0 medical ceramic, 1 teal fabric, 2 titanium service panels, 3 cargo deck, 4 acoustic panels, 5 walnut laminate, 6 terracotta polymer, 7 pressure padding, 8 laboratory floor, 9 navy seat, 10 counter stone, 11 copper exchanger, 12 cable panel, 13 burgundy upholstery, 14 terrazzo, 15 ash plywood | City building/floor themes, space furniture, ship quarters, mess, engineering, cargo, corridor and airlock |
| `geology-atlas.png` | 0 granite, 1 sandstone cliff, 2 basalt fractures, 3 slate, 4 wet river pebbles, 5 sandy bank, 6 forest humus, 7 silt, 8 scree, 9 glacial ice, 10 dirty snow, 11 alien mineral crust, 12 stream-margin rock, 13 limestone, 14 cooled lava, 15 clay | Planet-specific steep faces, bank and soil blending, cold surfaces and volcanic ground |

All cells are loaded into the material library. The selected subset varies by model and environment; a single scene does not display every cell. The original PNGs remain intact in `assets/textures/`. Exact built-in image-generation prompts are preserved in [ALIEN_ATLAS_PROMPTS.md](ALIEN_ATLAS_PROMPTS.md) and [WORLD_ATLAS_PROMPTS.md](WORLD_ATLAS_PROMPTS.md).

Terrain texture sampling changes tile offsets and broad shading to reduce repetition. Steep-face UVs project from the cliff sides to avoid top-down texture stretching, and rocky transitions mix in scree. It combines world type, slope, moisture, frost and proximity to sea level. Terrainworks controls the geometry and regional fields; an atlas supplies surface appearance, not topography by itself.

## Regional ecology and weather

Terrainworks field samples are interpolated across each world. Grassworks resolves blade height, width, density, color and shelter at each stable tile. Nine tiles cover the near field with range fading. Forest cover and three species/prototype variants follow the same regional fields. Their trunks, branches and foliage bend with Weatherworks wind direction, speed and gusts. Nearby vegetation remains mesh geometry; midrange clumps and distant woodland use sorted anisotropic Gaussian primitives out to approximately 1.85 km.

The forest washout was isolated to large Gaussian projections near the camera plane. The projection now rejects distributions intersecting that plane and uses actual camera distance for fading. The remaining haze has a low-opacity, planet-specific palette. Water discards dry locations and fades with its terrain patch instead of exposing a rectangular overlay. Plate surfaces receive a small physical offset and polygon bias; flight near-clip distance grows with altitude to improve depth precision.

The climate profile uses cached Cosmoplot catalog/model data, including star temperature, irradiation, day/night estimates and modeled magnetosphere properties. Weather front phase and thermal zone are shared between Weatherworks and planet cloud shaders. Cloud tint can include mineral/iron tones, and plant palettes vary with host-star light. Radiation exposure is a fictional adaptation proxy; it is not a predicted radiation dose or evidence of alien life.

Source interpretation:

- [Cosmoplot science universe](https://cosmoplot.io/api/science/universe) and [Earth model record](https://cosmoplot.io/api/science/planet?name=Earth) provide source records. Raw responses and fallback provenance are retained with the climate import.
- [NASA GISS on extrasolar photosynthesis](https://www.giss.nasa.gov/research/briefs/2007_kiang_01/) informs possible pigment variation. Purple leaves and blue grass remain art direction, not a uniquely optimal or observed solution.
- [ESO's WASP-76 b interpretation](https://www.eso.org/public/news/eso2005/) informs the iron-themed cloud treatment. Mineral cloud hints are not direct surface weather maps.
- [Original 3D Gaussian Splatting research](https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/) informs the primitive choice. This game generates distributions procedurally; it does not train or reconstruct a photographed scene.

## Connected play

The settlement directory contains 420 destinations. Earth uses 48 real city names and 12 outposts. The remaining 18 worlds have eight city/habitat and twelve outpost records each, with new names. Solid-world cities group sixteen buildings closely; outposts have two buildings and three named NPCs. Gas worlds use orbital habitats. The home hangar sits beside its district with a real pedestrian gap through the shared boundary. Markers are visibility/occlusion filtered and bounded on screen. Geometry and tactical NPC simulation stream around the active district.

**Tab / Esc → Operations → The Long Debt** opens the nine-case campaign. **Navigation MFD → Story cases** displays the same cases in the ship screen without pausing. Named NPCs can also open the case files. The graph contains 90 Storyworks nodes, 27 world-event milestones, eighteen ending choices and six dependency-gated later cases. The campaign consumes actual inventory, terminal, sample, power, station and combat events. Outcomes change market stock, credits and faction reputation; the journal retains dialogue and decisions. Host state is saved to browser storage and guests receive a read-only briefing. Details are in [THE_LONG_DEBT.md](THE_LONG_DEBT.md).

Wildlife uses authoritative body hits and a session death record. Alien body proportions and hit volumes share the phenotype definition. Crests, fins, plates and jointed tails are built before applying texture skins; appendage motion supplements the original gait/IK systems. The body volumes approximate the silhouette; every individual appendage is not a separate hitbox.

Ship lasers are red, kinetic rounds have visible tracers, and missiles use a bounded infrared seeker with a turn-rate limit and thrust plume. Ordinary rounds create small impacts. Explosive weapons retain explosions. Orange/red fires last a finite time and require lightning or explosive/incendiary events; volcanic planets no longer spawn arbitrary fire emitters.

Boarding and exit poses are clamped above terrain. Egress checks several positions beside the ship, rejecting buried support points. Landing time scales with distance and takeoff clears a shorter height. Walking aboard moving large ships and the existing shared engineering/turret seats remain available.

## Verification and remaining scope

`npm test` covers fifty simulation cases. Ten browser suites cover actual GPU rendering, portable boot, local/public PeerJS connections, shared lifts, combat, landing, terrain parity, materials and gameplay. Run them sequentially, then generate `artifacts/final-build-report.json`; its freshness checks reject results older than the runtime build. The report is the completion evidence, not this document's prose.

The online model is peer-hosted and was designed for a bounded session: active-district faction squads, nineteen background markets, bounded convoy traffic and locally saved host progression. Cross-NAT and eight-player performance require separate testing. Large ship interiors still have one connected deck. Procedural animals and terrain remain stylized; additional authored geometry and lighting work would be needed for concept-art parity.
