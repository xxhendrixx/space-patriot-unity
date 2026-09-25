# Society, cities and working ships

## Reference study

The following primary sources informed the design. These are reference principles, not copied assets or a claim that Space Patriot implements Star Citizen's scope.

- [Star Citizen economy design](https://robertsspaceindustries.com/en/comm-link/engineering/13128-The-Star-Citizen-Economy): production and consumption create transport demand; NPC activity should continue when no player takes the work. This is a 2013 design article, not evidence that every described feature is shipped.
- [Engineering gameplay guide](https://robertsspaceindustries.com/en/comm-link/transmission/20935-Engineering-Gameplay-Guide): equipment state, repairs and information displays should agree. Space Patriot's physical cockpit switches, rotary controls and MFDs drive the existing power, flight and cargo state.
- [Daily Life in the Verse](https://support.robertsspaceindustries.com/hc/en-us/articles/16444523494423-Daily-Life-in-the-Verse): connect everyday services, transport and mission access. The new districts expose local receiving, utility, market and clinic interactions.
- [Galaxy ship brochure](https://media.robertsspaceindustries.com/oo63wqpn79pn5/source.pdf): ship roles need different working spaces. Space Patriot keeps its own ten families and dimensions; medium and capital layouts add connected habitation, engineering, medical/science and freight decks.

## Implemented behavior

The 420 original settlement names now identify persistent service records. A fresh save has 4,052 residents. Each resident keeps an identity, job, needs, shift, itinerary, credits, relationships and, for pilots, an owned vessel. The simulation advances unloaded regions and performs bounded offline catch-up of up to six hours. Nearby actors visualize the persistent records; 4,052 animated characters are not simultaneously loaded.

Food, water, power, health and security influence local work offers. Seven job types use real inventory, ordered checkpoint visits or the district power puzzle. Completed jobs change settlement state and cannot pay twice. The original Vale, Rook and Mara exchanges are connected to inventory, ammunition and reputation. Faction warfare and the full original Storyworks interpreter remain unfinished.

Cities have seven service districts, furnished original buildings, working building lifts, stepped street blocks, utility plants, covered sidewalks, planters and an automated visual shuttle. The settlement directory loads a selected region after landing. It does not yet place 420 seamless, individually authored cities on a traversable planetary globe. Most tower floors are exterior architecture; the imported furnished buildings provide accessible interiors. The shuttle is not passenger transport yet.

All ten ship families now have generated pressure decks. Mule, Spur and Gannet have two decks, Wayfarer three, and Meridian four. The deck model and walkable collision rules share one layout source. Side rooms connect through measured openings; service lifts change the player's actual deck height. Engineering, cargo, science and medical stations connect to their runtime systems. Shared NPC crew stations and multiplayer are unfinished.

## Art production and comparison

`cockpit-target.png` is the user's supplied reference. `interiors-target.png`, `fleet-target.png` and `port-target.png` are original generated design targets. `compare.html` provides an overlay, difference view and alignment grid against actual Unity renders in `Renders/`.

The exterior production file is `Production/SpacePatriot-Fleet.blend`, created with Blender 4.5.10 LTS. It contains ten named ship collections, formed hull sections, beveled armor, engine intake geometry, radiator assemblies, maintenance details and role-specific cargo/crane/sponson geometry. `Tools/AssetPipeline/blender_fleet.py` rebuilds the file and exports material-batched geometry into Unity's importer.

The cockpit has three independent live displays, 24 physical softkeys, four rotary controls and six switches. The windows, dashboard proportions and controls were revised against the reference overlay. This is still a visible work in progress: surface wear, material richness, silhouettes, cabin furnishing and environmental composition fall short of the concepts. Automated geometry and interaction checks do not certify visual quality.

## Rebuild order

1. Install the pinned Node dependencies in `Tools/AssetPipeline`.
2. Run `node Tools/AssetPipeline/export-original.mjs` from the project root.
3. Run `blender --background --python Tools/AssetPipeline/blender_fleet.py` from the project root.
4. In the connected Unity Editor, outside Play mode, invoke `OriginalAssetImporter.ImportProduction()` through Unity CLI or the Editor.
5. Run `ArtReview.Capture()` and compare the actual renders with the targets.

Blender must run after the original exporter; the exporter alone uses the fallback refit generator. Unity scenes, prefabs and serialized assets are created through Unity APIs.
