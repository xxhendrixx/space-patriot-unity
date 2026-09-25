# Browser smoke test — 2026-09-25

Unity 6000.3.25f1 WebGL build completed successfully. Tested in the Codex Chromium browser at `http://127.0.0.1:8791` using the included gzip-aware server.

- Custom browser frame and title menu rendered within the viewport.
- Enter Frontier opened the on-foot hangar scene.
- F boarded the ship and changed the HUD to Docked.
- L activated the launch sequence and the HUD reached Flight Operations.
- No browser error-level logs were recorded during this corrected run. Earlier missing SphereCollider and rejected VKB layout errors no longer occurred.

One physics warning remains: the distant planetary mesh contains triangles over 500 units. The detailed local landing region uses smaller triangles; distant collision tessellation needs refinement.

This is a startup/entry/boarding/launch smoke test, not certification of flight feel, dual-stick mappings, sustained performance or a complete mission. Physical flight-stick axes still need hands-on validation. The editor tests cover synthetic controller input separately.

Build output is generated in the sibling `Browser` directory and is excluded from Git. Compressed data, WebAssembly, framework and loader total approximately 67.6 MiB.
