# World creature rosters

Compiled from `Assets/SpacePatriot/Resources/Worlds.json` by `node Tools/AssetPipeline/compile-creature-rosters.mjs`. Every world receives ten distinct concept briefs with stable IDs, silhouette, habitat, palette, model assignment, threat role, abilities and standard view coordinates. The current game can render the ten imported anatomy bases with per-world seed and scale variants; Tripo replacements keep the same IDs and anatomy slot.

Each roster contains foragers, a glider, a burrower, a weather-adapted drifter, a sentinel, a stalking predator, a scavenger, an ambusher, an elite champion and an apex encounter. Gas giants use high-altitude fauna entries. Weapon attacks, environmental telegraphs and boss abilities are fields on the same species records.
