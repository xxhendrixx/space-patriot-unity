# Model contribution guide

Thanks for helping build the ships and places in Space Patriot. The current Kestrel K-017 is a review candidate, not an approved final asset. It gives us a working Unity import and a repeatable comparison workflow; the overlays still show silhouette, paint, and component-shape errors that need an artist's eye.

The public repository is [xxhendrixx/space-patriot-unity](https://github.com/xxhendrixx/space-patriot-unity). Fork it, create a branch for each asset pass, and open a pull request with the comparison renders attached or committed. A local-only Blender pass can also be shared as the contribution folder described below.

## Start here

- Open [the Kestrel concept references](ArtDirection/Modules/) and [the comparison report](ArtDirection/Generated/KestrelK017/kestrel-v1/Renders/Comparison/index.html). The board compares the current bake with the concepts. Magenta edges are the reference, cyan edges are the mesh, and white edges overlap.
- Read [the local mesh pipeline](Tools/LocalMeshes/README.md) and [the project status](PORT_STATUS.md) before changing generated assets.
- The editable recipe is [kestrel-kit.json](Tools/LocalMeshes/kestrel-kit.json). It records each part's source image, scale, transform, UV projection, and attachment point.

## Coordinate and scale rules

The assembled ship is in metres. Its nose points along **+X**, aft is **−X**, **+Y** is up, and **+Z** is starboard (port is **−Z**). The hull center is near the origin. Wings extend sideways on Z; engine nacelles sit aft on negative X; landing gear reaches down toward Y=0. The Unity importer handles the Blender FBX basis conversion. Check the actual Unity capture after export rather than assuming an FBX axis setting produced the expected orientation.

Preserve the named pivots and moving parts when adding mechanisms. Keep doors, panels, landing struts, engine gimbals, cockpit controls, screens, collision meshes, and walkable interiors as distinct authored objects where they need independent movement or interaction. Do not fuse traversable rooms into a single shell.

## Send a model for review

For a new or replacement asset, add a folder under `ArtDirection/Contributions/<name>/<asset>/` containing:

- `model.blend`, with editable named objects and a clean, metre-scaled scene;
- `export/asset.fbx` (or another proposed interchange format, with a note explaining it), with transforms applied and pivots retained;
- `renders/`, with front, side, top, and three-quarter views on a plain background;
- `notes.md`, stating the intended ship/part role, dimensions, Blender version, texture sizes, known issues, and any external references or licenses.

Include source textures and any generated source mesh needed to edit the work. Record the model/tool/version and generation settings when applicable. Only submit assets you have the right to share in this public repository; credit and link external reference material. A generated mesh is a starting point, not a claim of originality or production readiness. Avoid committing model weights, caches, installers, or large training files.

For changes to the current Kestrel assembly, keep authored source and exports in the contribution folder first. Then update `kestrel-kit.json` or the Blender assembly script in a separate reviewed change, so the recipe continues to document the positions and projection choices. Do not replace the live fleet under `Assets/SpacePatriot/Resources/OriginalShips/` as part of an art submission. Accepted candidates are imported into the versioned ArtLab first.

## Compare before calling it done

On a machine with the configured local TripoSG/Blender tool cache, run:

```powershell
.\Tools\LocalMeshes\compare-kestrel.ps1 -BuildId kestrel-v1
```

The script writes an HTML report, a contact board, hue/saturation maps, and silhouette IoU, area, and centroid measurements beside the build. When testing new placement or geometry, regenerate the assembly and then compare it again:

```powershell
.\Tools\LocalMeshes\build-kestrel.ps1 -BuildId kestrel-v1 -Resume
.\Tools\LocalMeshes\compare-kestrel.ps1 -BuildId kestrel-v1
```

The model generator is optional for hand-authored Blender work; the final `.blend`, exported model, textures, and renders are the important handoff. Compare from the same views and keep the overlays with the submission so reviewers can see what changed. Metrics help find errors but cannot judge design quality, hidden surfaces, construction logic, or whether the ship feels distinctive.

## Current Kestrel review baseline

The committed candidate includes the raw component meshes and provenance, editable Blender assembly, FBX and baked maps, Unity ArtLab prefab, Unity captures, and comparison outputs. The Unity import currently validates 24 mesh renderers across three LODs with bounds of approximately 24.15 × 8.35 × 15 metres. The whole-ship silhouette and color projection still need substantial review; treat this as a baseline for iteration, not a finished ship.
