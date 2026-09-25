# Centered first-person rifle asset

`assets/ui/rifle-view-v10.png` replaces the cropped rifle foreground for gameplay. The stock and hands enter from the bottom edge, avoiding an exposed right-edge crop when the muzzle is centered. The original asset is retained.

The image-generation tool produced the new pose, followed by a chroma-green production plate (source `exec-4ae341de-044c-4557-9070-3f67317bdaa1.png`). Export preparation keyed green dominance to alpha; the rendered asset is RGBA, 1536×1024. Rifle muzzle anchor is (677,479). Artwork, flash canvas and physical projectile projection use the same anchor.

Final production-plate instruction: Preserve the exact rifle, gloved hands, detailed materials, pose, scale and pixel placement. Replace the entire checkerboard background with flat opaque chroma green #00FF00, including through the optical sight and gaps around the hands. Keep all non-background edges crisp.
