# Real catalog seeds — Space Patriot Frontier 09

The playable catalog contains **19 worlds in five systems**. This is a curated selection, with a stable seed derived from each source system and planet ID. Updating a mass or radius measurement does not reroll the terrain seed.

| System | Included planets | Selection basis |
| --- | --- | --- |
| Sol | Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune | Cosmoplot Solar System catalog |
| TRAPPIST-1 | b, c, d, e, f, g, h | Cosmoplot catalog; host-system JWST observation metadata |
| TOI-270 | b, c | Both appear in Cosmoplot’s researched-planet index |
| K2-141 | b | Appears in the researched-planet index |
| WASP-76 | b | Appears in the researched-planet index |

The last three systems intentionally include their researched planets only. Their other known planets are outside this playable selection. A research profile means there is a local deep-dive document; it does not establish complete scientific knowledge of a world.

Source records, uncertainty fields, timestamps and provenance are preserved in `assets/data/cosmoplot-worlds.json`. The build embeds the same snapshot through `source/cosmoplot-data.js`, so solo play does not depend on a live API. Refresh it with `node scripts/import-cosmoplot.mjs`. `--from-cache` replays the recorded response artifacts used during this integration.

The importer reads the public [Cosmoplot universe endpoint](https://cosmoplot.io/api/science/universe) and [research index](https://github.com/H-XX-D/Cosmoplot/blob/main/data/science/analyses/researched-systems.json). Additional catalog queries use the documented `radiusPc`, `limit` and `search` route parameters. The TRAPPIST-1 science endpoint supplies 100 host-system JWST observation records in this snapshot. These include instrument, proposal and observation metadata; a host search can include observations aimed at different planets in the system.

Planet identity, catalog radius, mass and orbital period appear in the destination detail. Gravity is derived as `9.807 × massEarth / radiusEarth²`. Physical radius is retained separately from the compressed game radius. Distances, static orbital arrangements and world sizes are adapted for travel in the game. Biomes use explicit game profiles guided by planet class and temperature; Earth and TRAPPIST-1 e have authored playable climate choices.

Mountain ranges, rivers, oceans on exoplanets, habitats, cities, creatures and faction settlements are fictional procedural content. The game does not label them as JWST observations. It does not interpret generic molecule tags or an unlabeled spectrum preview as a confirmed atmospheric detection. JWST metadata stays in the archive layer; terrain comes from Worldworks, Terrainworks and the game’s globe geology.

Cosmoplot distinguishes observed, derived, inferred, proxy and artistic data in its [provenance documentation](https://github.com/H-XX-D/Cosmoplot#data-and-provenance). Upstream numeric sources include the [NASA Exoplanet Archive](https://exoplanetarchive.ipac.caltech.edu/docs/program_interfaces.html), NASA Solar System Exploration, and [STScI MAST](https://mast.stsci.edu/). The snapshot carries the individual source links and access times. The game importer is original adapter code; the public Cosmoplot application source is MIT licensed.
