# Asset build tools

Run `npm install` in this directory. From the project root:

1. `node Tools/AssetPipeline/compile-creature-rosters.mjs` writes ten world-specific wildlife concept/encounter entries per catalogued world and `Assets/SpacePatriot/Resources/CreatureRosters.json`.
2. `node Tools/AssetPipeline/export-worldworks.mjs` compiles five blended source-engine geology/climate provinces per solid world.
3. `node Tools/AssetPipeline/export-original.mjs` exports original assets, revised cabins, weapons, residents, ten reusable fauna anatomies and layouts.
4. `blender --background --python Tools/AssetPipeline/blender_fleet.py` builds the ten production exteriors and the editable `ArtDirection/Production/SpacePatriot-Fleet.blend` file.
5. Outside Play mode, use the live Unity CLI to invoke `OriginalAssetImporter.Import()` for a complete import, or `OriginalAssetImporter.ImportProduction()` for updated cabins, weapons, citizens and exteriors. A full import also refreshes the fauna prefab set.

For Tripo output, use `ArtDirection/PIPELINE_STANDARD.md`. `creatures/prepare_tripo_asset.py` handles weapon, flora, fauna and geology FBX/GLB sources with fixed view cameras, a separate globally packed `SP_BakeUV`, three baked maps, Unity FBX, and a coordinate report. `creatures/compare-views.mjs` makes repeatable concept/render overlays.

Blender must run after the Node exporter. Unity imports retain existing GUIDs. Production meshes have immutable content hashes; the full import additionally repairs existing mesh data and triangle orientation. The original reference source is unchanged.

The cabin layout is shared by the mesh exporter and runtime collision rules. Low-impact flat surfaces avoid unnecessary bevel tessellation and merged meshes weld duplicate vertices. The four-deck capital cabin exports about 8.4 MiB of raw mesh data, reduced from 197.2 MiB in an earlier iteration.

See `ArtDirection/DESIGN_AND_IMPLEMENTATION.md` for source references, comparison procedure and remaining limits.
