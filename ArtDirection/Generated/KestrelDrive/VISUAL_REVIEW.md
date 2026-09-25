# Kestrel drive: local mesh trial

The local artwork-to-mesh → Blender → Unity path ran successfully on 25 September 2026. This is an inspection candidate, not an approved replacement for the live fleet.

## Measured result

- TripoSG, seed 726, 50 inference steps, depth 9. The pinned revisions and input hash are in `raw.generation.json`.
- Actual RTX 5060 Ti run: **66.95 seconds**, **5.68 GiB peak allocated CUDA memory**. That time includes model loading and mesh export, but excludes the one-time downloads and subsequent Blender work.
- Corrected raw mesh: 1,569,527 triangles. Blender removes duplicate/loose vertices and recalculates normals; source has 1,563,453 faces after cleanup.
- Exported LODs: **44,999 / 15,000 / 4,999 triangles**.
- Unity measured maximum extent: **5.99956 metres**. The Flight and Landing clips imported, and the actual imported hinge travels **90 degrees**.
- Editable Blender source, raw GLB, FBX, inspection renders and Unity prefab are included. The neural weights remain in the external local tool cache.

## Visual findings

The generated shape retains the rounded rectangular nacelle, central casing, recessed intake, large surface divisions, side conduits and lower mounting saddle. Those forms are recognizable in both the Blender and actual Unity renders. The reduced mesh preserves the main profile.

It does **not** reproduce the artwork's crisp manufactured edges, fine fasteners, complete vent geometry or painted surface details. Some pipes and fittings merge into the casing. The model invents a similar fan at the unseen rear; a proper exhaust assembly must be authored separately. The raw mesh is not watertight. Production UVs, baked detail, paint, collision proxies and final mechanism clearance remain unfinished.

Use this result as a base for component construction. Split the next engine iteration into the pressure casing, intake assembly, rear nozzle, mounting saddle and moving mechanisms. Small generated components can preserve more useful detail and can be rebuilt into precise parts in Blender. The current whole-module gimbal only proves the animation/export path.

## Extraction correction

An initial Windows marching-cubes adaptation assigned a fixed sign to the flash decoder's unevaluated cells. That created a false second shell. The corrected adapter masks the unevaluated band boundary before extracting the surface. The failed diagnostic was not imported into the project; the included raw mesh and renders are from the corrected run. No learned weights were modified.

Open `../../local-mesh-review.html` for the reference and several actual mesh views. Their camera angles differ, so the page is a visual review rather than a pixel-aligned overlay.
