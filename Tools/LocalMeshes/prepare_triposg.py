"""Adapt the pinned upstream decoder for Windows without a compiled diso extension.

The learned generator and its weights are unchanged. Mesh extraction uses
scikit-image marching cubes on the field produced by the upstream flash decoder.
"""
import argparse
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument("source", type=Path)
args = parser.parse_args()
path = args.source / "triposg/inference_utils.py"
text = path.read_text(encoding="utf8")
marker = "# SPACE_PATRIOT_WINDOWS_SURFACE_EXTRACTION"
if marker not in text:
    text = text.replace("from diso import DiffDMC", "try:\n    from diso import DiffDMC\nexcept ImportError:\n    DiffDMC = None")
    start = text.index("        dmc = DiffDMC(dtype=torch.float32)")
    end = text.index("        mesh_v_f = (vertices.astype", start)
    replacement = '''        # SPACE_PATRIOT_WINDOWS_SURFACE_EXTRACTION
        # Standard marching cubes avoids a platform-specific CUDA build of diso.
        field = np.nan_to_num(grid_logits.float().cpu().numpy(), nan=-10000.0)
        vertices, faces, _, _ = measure.marching_cubes(field, level=0.0)
        vertices = vertices / (np.asarray(field.shape) - 1) * bbox_size + bbox_min
'''
    text = text[:start] + replacement + text[end:]
    path.write_text(text, encoding="utf8")
print("Windows surface extraction ready:", path)

# The flash decoder evaluates a narrow band around the surface. Empty cells
# are NaN, not an inside/outside prediction. Exclude their boundary rather than
# creating a second artificial shell by assigning every unknown cell one sign.
text = path.read_text(encoding="utf8")
old = '''        field = np.nan_to_num(grid_logits.float().cpu().numpy(), nan=-10000.0)
        vertices, faces, _, _ = measure.marching_cubes(field, level=0.0)'''
new = '''        field = grid_logits.float().cpu().numpy()
        valid = scipy.ndimage.binary_erosion(np.isfinite(field), structure=np.ones((3, 3, 3), dtype=bool))
        field = np.nan_to_num(field, nan=-10000.0)
        vertices, faces, _, _ = measure.marching_cubes(field, level=0.0, mask=valid, allow_degenerate=False)'''
if old in text:
    path.write_text(text.replace(old, new), encoding="utf8")
print("Sparse-field boundary mask ready")
