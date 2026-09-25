"""Run the locally installed TripoSG model on an isolated component reference.

This generates geometry. It does not invent working interiors, UV layouts,
rigs or materials. Those remain separate Blender and Unity production stages.
"""
import argparse
import hashlib
import json
import os
import sys
import time
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("--source", required=True, type=Path)
parser.add_argument("--weights", required=True, type=Path)
parser.add_argument("--image", required=True, type=Path)
parser.add_argument("--output", required=True, type=Path)
parser.add_argument("--seed", type=int, default=726)
parser.add_argument("--steps", type=int, default=50)
parser.add_argument("--depth", type=int, choices=[8, 9, 10], default=9)
args = parser.parse_args()

os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"
sys.path.insert(0, str(args.source.resolve()))
import torch
from PIL import Image
from triposg.pipelines.pipeline_triposg import TripoSGPipeline

if not torch.cuda.is_available():
    raise SystemExit("A working CUDA PyTorch installation is required.")
if not (args.weights / "model_index.json").exists():
    raise SystemExit("Model download is incomplete: model_index.json is missing.")
print("GPU:", torch.cuda.get_device_name(0), flush=True)
torch.set_num_threads(8)
torch.cuda.reset_peak_memory_stats()
started = time.monotonic()
pipeline = TripoSGPipeline.from_pretrained(str(args.weights.resolve()), torch_dtype=torch.float16, local_files_only=True).to("cuda")
reference = Image.open(args.image).convert("RGB")
result = pipeline(image=reference, generator=torch.Generator(device="cuda").manual_seed(args.seed),
                  num_inference_steps=args.steps, guidance_scale=7.0,
                  use_flash_decoder=True, flash_octree_depth=args.depth)
mesh = result.meshes[0]
if mesh is None or len(mesh.faces) < 100:
    raise RuntimeError("The generator did not return a usable mesh.")
mesh.remove_unreferenced_vertices()
mesh.fix_normals(multibody=True)
args.output.parent.mkdir(parents=True, exist_ok=True)
mesh.export(str(args.output))
report = {
    "model": "VAST-AI/TripoSG",
    "weights_revision": "2c1c516d22d58db486a058d98d31bb6177344e06",
    "source_revision": "fc5c40990181e2a756c4e0b1c2f4d6b5202faf8c",
    "input": args.image.name,
    "input_sha256": hashlib.sha256(args.image.read_bytes()).hexdigest(),
    "seed": args.seed, "steps": args.steps, "octree_depth": args.depth,
    "vertices": len(mesh.vertices), "triangles": len(mesh.faces), "watertight": mesh.is_watertight,
    "gpu": torch.cuda.get_device_name(0), "peak_gpu_gib": torch.cuda.max_memory_allocated() / 2**30,
    "seconds": time.monotonic() - started,
    "surface_extractor": "scikit-image marching cubes with valid sparse-field mask; upstream learned field unchanged",
    "material_status": "untextured geometry; Blender cleanup and authoring still required",
}
args.output.with_suffix(".generation.json").write_text(json.dumps(report, indent=2), encoding="utf8")
print(json.dumps(report, indent=2), flush=True)
