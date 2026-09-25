# Bundled dependencies

The build bundles these libraries so solo play does not depend on runtime CDN access. Versions are pinned in `package.json` and `package-lock.json`.

- **Three.js 0.186.0** — MIT, © 2010–2026 three.js authors. Source: https://github.com/mrdoob/three.js. License: `docs/licenses/three-LICENSE.txt`.
- **PeerJS 1.5.5** — MIT, © 2013 Michelle Bu and Eric Zhang. Source: https://github.com/peers/peerjs. License: `docs/licenses/peerjs-LICENSE.txt`.
- Build/development tools include esbuild 0.28.2, PeerServer 1.0.2 and Playwright 1.55.1. They are not loaded by the browser from an external server.

The original uploaded Longway source is retained at `source/Longway_4_Flight_Deck.original.html`. Generated Space Patriot artwork and generation prompts are under `assets/`.

The user-supplied Grassworks, Oceanworks, Fireworks, Spellworks and Storyworks applications are archived unchanged in `vendor/user-engines/`. Storyworks also contains Worldworks. Source provenance is recorded in `vendor/user-engines/manifest.json`; extraction and adaptation are documented in `docs/USER_ENGINES.md`. These are user-provided source assets, not newly downloaded third-party demos.


Frontier 09 uses public Cosmoplot catalog data and researched-system index metadata. Upstream attributions and source timestamps are preserved in `assets/data/cosmoplot-worlds.json`; see `docs/COSMOPLOT_WORLDS.md`. All twelve user-provided HTML source files remain archived with SHA-256 checks in `vendor/user-engines/manifest.json`. Three additional atlases were generated with the built-in image-generation tool; exact prompts are in `assets/FRONTIER_09_ATLAS_PROMPTS.md`.
