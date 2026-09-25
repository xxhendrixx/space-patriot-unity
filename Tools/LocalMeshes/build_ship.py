"""Generate every Kestrel part, atlas-bake it in Blender, and export one FBX."""
import argparse
import datetime as dt
import hashlib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
PROJECT = HERE.parents[1]
ap = argparse.ArgumentParser(description=__doc__)
ap.add_argument("--build-id", default=dt.datetime.now().strftime("build-%Y%m%d-%H%M%S"))
ap.add_argument("--tool-root", type=Path, default=PROJECT.parents[1] / "work")
ap.add_argument("--steps", type=int, default=None)
ap.add_argument("--depth", type=int, choices=(8, 9, 10), default=None)
ap.add_argument("--resume", action="store_true", help="Reuse matching raw meshes already in this build")
args = ap.parse_args()
if not re.fullmatch(r"[A-Za-z0-9_-]{1,64}", args.build_id):
    raise SystemExit("Build id must use letters, digits, hyphens or underscores.")

tool_root = args.tool_root.resolve()
python = tool_root / "tools/hy3d-env/Scripts/python.exe"
blender = tool_root / "tools/blender-4.5.10-windows-x64/blender.exe"
source = tool_root / "tools/TripoSG-source"
weights = tool_root / "models/TripoSG"
for item in (python, blender, source, weights):
    if not item.exists():
        raise SystemExit(f"Missing local mesh tool: {item}. See Tools/LocalMeshes/README.md.")

config_path = HERE / "kestrel-kit.json"
config = json.loads(config_path.read_text(encoding="utf8"))
steps = args.steps or config["default_steps"]
depth = args.depth or config["default_depth"]
build_root = PROJECT / "ArtDirection/Generated/KestrelK017" / args.build_id
if build_root.exists() and not args.resume:
    raise SystemExit(f"Build already exists: {build_root}. Choose another --build-id or use --resume.")
build_root.mkdir(parents=True, exist_ok=True)
records = []

for part in config["parts"]:
    record = dict(part)
    reference = (PROJECT / part["reference"]).resolve()
    if not reference.is_file():
        raise SystemExit(f"Missing {part['id']} reference: {reference}")
    record["reference_path"] = str(reference)
    record["reference_sha256"] = hashlib.sha256(reference.read_bytes()).hexdigest()
    if part["generation"] == "local":
        component_root = build_root / "Parts" / part["id"]
        mesh = component_root / "raw.glb"
        report = mesh.with_suffix(".generation.json")
        if mesh.exists() or report.exists():
            if not args.resume or not (mesh.exists() and report.exists()):
                raise SystemExit(f"Refusing to replace partial/generated mesh: {mesh}")
            old = json.loads(report.read_text(encoding="utf8"))
            if (old.get("input_sha256") != record["reference_sha256"] or old.get("seed") != part["seed"]
                    or old.get("steps") != steps or old.get("octree_depth") != depth):
                raise SystemExit(f"Existing mesh provenance does not match this reference, seed, steps or depth: {mesh}")
        else:
            command = [str(python), str(HERE / "generate_mesh.py"),
                       "--source", str(source), "--weights", str(weights),
                       "--image", str(reference), "--output", str(mesh),
                       "--seed", str(part["seed"]), "--steps", str(steps), "--depth", str(depth)]
            subprocess.run(command, check=True, env={**os.environ, "PYTHONUTF8": "1"})
        record["mesh_path"] = str(mesh)
        record["generation_report"] = str(report)
    else:
        mesh = (PROJECT / part["mesh"]).resolve()
        if not mesh.is_file():
            raise SystemExit(f"Missing reusable component {part['id']}: {mesh}")
        record["mesh_path"] = str(mesh)
        record["generation_report"] = str(mesh.with_suffix(".generation.json"))
    records.append(record)

config["steps"] = steps
config["depth"] = depth
config["build_id"] = args.build_id
config["parts"] = records
resolved = build_root / "build-manifest.json"
resolved.write_text(json.dumps(config, indent=2), encoding="utf8")
command = [str(blender), "--background", "--python-exit-code", "1", "--python",
           str(HERE / "assemble_ship.py"), "--", "--manifest", str(resolved),
           "--project-root", str(PROJECT), "--output", str(build_root)]
subprocess.run(command, check=True)

stage = PROJECT / "ArtDirection/Generated/KestrelK017/active-build.txt"
tmp = stage.with_suffix(".tmp")
tmp.write_text(args.build_id + "\n", encoding="utf8")
os.replace(tmp, stage)
print(f"Kestrel build finished: {build_root}")
