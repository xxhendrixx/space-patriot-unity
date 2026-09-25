# Asset provenance

The Long Debt campaign text and world catalog were migrated from the user's original Space Patriot source archive. The original archive and HTML in Downloads are unchanged.

The user's original source, engines, atlas textures, illustrations and procedural models are preserved in `Reference/Original`. Original ships, ports, cockpits, interiors, weapons and buildings are converted through `Tools/AssetPipeline` and `OriginalAssetImporter`. The industrial fleet refits extend those assets using `Tools/AssetPipeline/visuals/industrial-refit.js`. Native Unity runtime components adapt the original engine equations; their current scope is listed in `ENGINE_INTEGRATION.md`.

The following 1K surface maps are by Poly Haven contributors, released under [CC0](https://polyhaven.com/license), which permits commercial use and redistribution:

- [Rocky Terrain 02](https://polyhaven.com/a/rocky_terrain_02): diffuse and OpenGL normal maps.
- [Rusty Painted Metal](https://polyhaven.com/a/rusty_painted_metal): diffuse and OpenGL normal maps.
- [Metal Plate](https://polyhaven.com/a/metal_plate): diffuse and OpenGL normal maps.
- [Blue Metal Plate](https://polyhaven.com/a/blue_metal_plate): diffuse and OpenGL normal maps.

Maps were obtained from the public Poly Haven asset API and its download CDN. They are imported as 1024px textures with mipmaps; normal maps use Unity's normal-map import mode.

Unity and installed packages retain their respective licenses. Package versions are pinned in `Packages/packages-lock.json`.
