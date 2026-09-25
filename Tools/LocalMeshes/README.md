# Local artwork → mesh → Blender → Unity

This is an asset-authoring toolchain. The neural model is not bundled with the game or loaded by Unity.

## Selected model

**VAST TripoSG**, image-conditioned geometry model. Its [official model card](https://huggingface.co/VAST-AI/TripoSG) lists an MIT license and a CUDA GPU with more than 8 GB VRAM. The development machine has an RTX 5060 Ti with 16 GB VRAM and 96 GB system RAM. Actual generation measurements belong in each asset's `.generation.json` report, not inferred from the requirements.

- Source: [VAST-AI-Research/TripoSG](https://github.com/VAST-AI-Research/TripoSG), revision `fc5c40990181e2a756c4e0b1c2f4d6b5202faf8c`.
- Weights: `VAST-AI/TripoSG`, revision `2c1c516d22d58db486a058d98d31bb6177344e06`.
- The official weight files total approximately 7.95 GB. Keep them in a local tool cache, outside version control.
- Shape generation runs locally. The concept reference itself was made with the image-generation tool; it is not a locally generated image.
- We do not use the upstream demo's separate BRIA background-removal model. Supply an isolated object on white.
- `prepare_triposg.py` adapts mesh extraction to Windows with scikit-image marching cubes; it does not change the learned weights. This avoids compiling the optional `diso` CUDA extension. A mask excludes unevaluated cells in the decoder's sparse field, preventing an artificial second shell at the field boundary.

Hunyuan3D 2.1 was also investigated. Its shape stage fits the GPU's nominal memory capacity, but its license restricts territories for both the model and outputs, and its full PBR texture stage lists 21 GB VRAM. It is not the selected production tool. Microsoft's official TRELLIS.2 setup lists Linux and a 24 GB GPU. See their [Hunyuan requirements and license](https://github.com/Tencent-Hunyuan/Hunyuan3D-2.1) and [TRELLIS.2 requirements](https://github.com/microsoft/TRELLIS.2).

## Component workflow

1. Make one clear reference for one physical component: engine nacelle, cockpit shell, landing strut, pressure door, wall bay, service kiosk. Use a plain white background and show the full silhouette. A multi-panel concept sheet is not a suitable direct model input.
2. Generate an untextured mesh with a recorded seed and pinned model. Judge silhouette, proportions, openings and hidden-side plausibility in several views. Reject bad outputs instead of dressing them with texture.
3. Clean the accepted geometry in Blender. Keep a high-resolution source. Separate anything that must move, rebuild precise mounting faces, author production UVs/materials, create LODs and collision proxies.
4. Assemble ships/buildings from those parts at metre scale. Animate rigid mechanisms around real mounting pivots. Cockpit buttons, screens, door apertures and connected walkable rooms remain authored functional structures.
5. Export FBX with named clips and pivots. Configure materials, animation clips, LODGroup and gameplay bindings using Unity Editor APIs. Test the actual imported asset in the scene.

## Kestrel multipart ship build

`kestrel-kit.json` is the editable ship recipe: it assigns one isolated reference and deterministic model seed per component, sizes the mesh in metres, places mirrored wings and duplicate engine nacelles, and sets per-part LOD budgets. The hull, wing and landing gear are generated locally; the two engine instances reuse the already generated engine. All prompts and source references are in `ArtDirection/Modules/prompts.json` and `ArtDirection/Modules/`.

Run the full pipeline from PowerShell on the configured development machine:

```powershell
.\Tools\LocalMeshes\build-kestrel.ps1
```

It generates any missing raw components with TripoSG, retains a JSON provenance report beside each mesh, then runs `assemble_ship.py` in Blender. Blender cleans and scales each module, unwraps a dedicated UV atlas, samples the painted component references into a shared 4096-pixel base-colour atlas, bakes high-to-low tangent normals and roughness/metallic maps, makes three LODs per component and exports an editable `.blend`, a combined FBX and review renders. The FBX and atlas are review candidates; generated geometry and concept-projected color need human art review before replacing production ship assets.

To repeat or resume one named build without regenerating successful meshes:

```powershell
.\Tools\LocalMeshes\build-kestrel.ps1 -BuildId kestrel-v1 -Resume
```

The Unity Editor menu **Space Patriot → Art lab → Import latest baked Kestrel** copies the result into a versioned ArtLab folder, configures one URP atlas material and creates a prefab with the three levels grouped by distance. **Capture latest baked Kestrel** saves actual Unity renders for comparison. These commands leave the live fleet untouched. The color bake transfers visible paint placement from the reference; it cannot invent hidden-side paint or repair inaccurate mesh silhouettes. Screens, openings, controls, mechanical pivots and walkable interiors still require explicit authored geometry and interaction systems.

Before accepting a bake, run the comparison pass:

```powershell
.\Tools\LocalMeshes\compare-kestrel.ps1 -BuildId kestrel-v1
```

It renders each LOD0 part with the actual atlas through an unlit material, compares the concept and baked colors in hue/saturation space, and writes silhouette IoU, area, and centroid metrics. Magenta/cyan contour overlays show where the concept and mesh disagree; white edges overlap. It also produces a whole-ship quarter-view overlay and a plan render so component form and mounting offsets can be reviewed separately. Outputs are stored under `Renders/Comparison/`. Part comparisons fit both foreground bounds to equal review cells; only the whole-ship overlay preserves the assembled layout. These metrics flag mismatches for review; they do not certify a generated mesh as production-ready.

## Commands

Use an isolated Python 3.12 environment with PyTorch 2.8.0 + CUDA 12.8 and torchvision 0.23.0 for this RTX 50-series machine. Install `requirements-shape.txt` alongside those packages. Clone the pinned source and download the pinned official model before running offline inference.

`requirements-windows.lock` records the complete working Windows environment, including CUDA wheels. Install it with `python -m pip install --extra-index-url https://download.pytorch.org/whl/cu128 -r requirements-windows.lock`. The environment passes `pip check` and an actual CUDA matrix operation on this machine.

```powershell
python prepare_triposg.py C:/Tools/TripoSG
python generate_mesh.py --source C:/Tools/TripoSG --weights C:/Models/TripoSG `
  --image ../../ArtDirection/Modules/kestrel-drive-reference-v2.png `
  --output ../../ArtDirection/Generated/KestrelDrive/raw.glb --seed 726 --steps 50 --depth 9
blender --background --python-exit-code 1 --python clean_and_rig.py -- `
  --input ../../ArtDirection/Generated/KestrelDrive/raw.glb `
  --output ../../ArtDirection/Generated/KestrelDrive --metres 6
```

The Blender script produces a cleaned source, three LODs and a rigid drive-gimbal rig with Flight/Landing clips, plus inspection renders and an editable `.blend`. It deliberately uses a neutral inspection material. Production texturing and final joint alignment require visual review; a successful export is not proof that the component matches the concept.

On the configured development machine, `run-local.ps1 -Output <new-folder>` runs generation and Blender in sequence using the existing local cache. It refuses to overwrite an existing raw mesh. The historical environment folder is named `hy3d-env`, but the selected and installed model is TripoSG. `-ToolRoot` selects a relocated tool cache. Custom references use `-Image`, `-Name`, `-Metres` and `-Seed`.

Unity's **Space Patriot → Art lab → Import local Kestrel drive** command creates an inspection prefab from the Blender FBX. It verifies three LODs, six-metre maximum extent, named Flight/Landing clips and a 90-degree hinge movement. **Capture local Kestrel drive** produces actual URP renders for comparison. Passing these technical checks does not approve the art for the live fleet.

Do not generate an entire navigable city or multideck ship as one fused object. Doors, traversable spaces, moving machinery and MFD hit areas need separate geometry and gameplay integration. Generated topology is a starting point for authored assets.
