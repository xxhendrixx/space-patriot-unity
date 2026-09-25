# Space Patriot Unity restoration

This is an incomplete port. The initial Unity prototype dropped substantial parts of the original game and is not a completed or fully playable remake. Original source, documentation and art are retained in `Reference/Original`; original artwork is also imported under `Assets/SpacePatriot/Original`.

The direction remains grounded industrial science fiction, browser first, premium with no in-game purchases. Preserving the original design and systems is required. Converting original meshes establishes a baseline; it does not finish the requested visual redesign.

| Area | Original game | Unity restoration status |
| --- | --- | --- |
| Artwork | 11 atlases, 128 cells, foliage, cockpit/UI/concept artwork | All originals preserved with SHA256 inventory. Cells extracted without atlas bleeding; original craft UVs/material assignments converted. |
| Fleet | 10 chassis, 10 finishes each; proper dimensions and specifications | All 100 records restored. Original hull meshes converted for every chassis. Visual redesign still pending. |
| Flight | Six-axis translation/rotation, assist/decoupled, throttle limit, boost, brake | Controller rewritten around original bindings; isolated regression checks added. Input System checks cover actual keyboard, mouse and gamepad directions, focus/menu recovery, launch and relaunch. Physical hardware testing remains incomplete. |
| Controls | Keyboard, pointer, gamepad, remappable controller | Keyboard remapping and standard gamepad flight added. Full hardware mapping, ground controls and menu/controller parity remain incomplete. |
| Cockpit | Modeled flight deck, switches, three MFDs | Original modeled decks and switches imported, linked to flight functions; MFD content remains reduced. |
| Large ships | Connected deck, quarters, mess, engineering, cargo, airlock | Original interior meshes/layouts imported; walking and room/fixture bounds restored. Turret station and moving shared crew validation pending. |
| Vessel systems | Reactor, engines, weapons, shields, cooler, life support, 12-point power bus, heat, repair | Native Unity system state and engineering controls added; basic integration is connected; broader balancing and failure testing remain pending. |
| Cargo | Manifest/trading; manual handling had not been completed | New staged dock inventory, loading/unloading animation, hold capacity, saved inventory, hatch interlock and cargo mass. Actual transfer/interlock checks pass. Freight must be unloaded before contract payment. |
| Economy | 19 background markets, production/consumption, convoys, contracts, faction accounts | 19 markets, background convoy accounting, faction balances and freight contracts implemented. Visible traffic, original event parity and balancing remain pending. |
| Campaign | 9 cases, 27 milestones, 18 outcomes, 90 graph nodes | Case data and basic gates/rewards migrated. Full original Storyworks graph and event parity remain pending. |
| Navigation | 5 systems, 19 worlds, measured/catalog data, orbital/sector travel | 19-world selector only. Original catalog/climate data preserved; detailed celestial/orbit simulation pending. |
| Settlements | 420 named cities/outposts, interiors, lifts, terminals, residents | Original port and four furnished building types restored, with lift controls. Full 420-settlement placement, residents and city simulation remain pending. |
| Home hangar | Personal hangar, lift, roof clearance, city access | Original modeled hangar, moving launch lift and roof panels restored; launch waits for clearance. Runtime launch checks pass. |
| Terrain | Terrainworks regional fields, geology blending, cliffs, water | Generic Unity heightfield remains. Original terrain/biome restoration pending. |
| Weather | Climate profiles, cloud fronts, wind/gusts, lightning | Original source/data preserved; Unity implementation pending. |
| Ecology | Grassworks, forests, articulated alien flora/fauna, IK and body hits | Original conifer and three alien flora models restored. Grass simulation, fauna animation/IK and ecology remain pending. |
| Combat | Rifle/sidearm, kinetic/laser/missile weapons, targeting, seeker, reload, damage | Original weapon meshes/specifications, selection, reload, kinetic fire, red laser and seeker interlock restored. Encounters, infantry and full damage parity remain incomplete. |
| Society | Factions, NPCs, patrols, settlement control, reputation | Case reputation counters only; full society simulation pending. |
| Inventory/crafting | Inventoryworks, field inventory, equipment, consumables | Pending. |
| Architecture/machinery | Building interiors/furniture, power machinery, pathways | Original engine sources preserved; runtime ports pending. |
| Multiplayer | Peer-hosted sessions, authority, shared ship stations, lifts | Pending. No multiplayer claim is made. |
| Browser delivery | WebGL support installed | No validated browser release yet. |

Validation files distinguish source preservation, isolated logic checks, and actual runtime tests. A passing logic check is not evidence of game completion or visual quality.

## Inversion and controls correction

The conversion had reflected mesh positions and normals without correcting triangle winding. The importer now reconciles each triangle with its transformed normals and replaces existing mesh data. Validation covers 1,151 unique meshes and 578,754 nondegenerate triangles. The cockpit and imported hull were visually inspected after correction; terminal label orientation was corrected in code.

Keyboard commands no longer wait for every input to return to neutral after focus/menu transitions. Holding Space continues to provide thrust after launch. Landing retains the speed limit instead of setting it to zero. Mouse steering uses direct angular displacement instead of delayed stick-style acceleration; mouse and controller vertical inversion are separate settings.

`Validation/direction-and-launch.txt` records 23 live controller checks using virtual Input System devices. This does not certify every physical controller or full gameplay parity. The original controls/cargo/weapons and progression checks were rerun as well. No browser release has been validated.
