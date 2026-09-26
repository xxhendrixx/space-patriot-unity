// Compare the Unity C# planet sampler with the original browser game's core noise.
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const source = path.join(root, 'Reference/Original/source');
const require = createRequire(import.meta.url);
const C = require(path.join(source, 'core.js'));
const context = { LongwayCore: C, console };
vm.createContext(context);
for (const file of ['expedition.js', 'landscape.js']) {
  vm.runInContext(fs.readFileSync(path.join(source, file), 'utf8'), context, { filename: file });
}
const worlds = JSON.parse(fs.readFileSync(path.join(root, 'Assets/SpacePatriot/Resources/Worlds.json'), 'utf8')).worlds;
const csvPath = path.join(root, 'Validation/unity-source-height-samples.csv');
if (!fs.existsSync(csvPath)) throw new Error('Run EngineRestorationValidation.ExportSourceHeightSamples() in the connected Unity Editor first.');
const samples = fs.readFileSync(csvPath, 'utf8').trim().split(/\r?\n/).slice(1).map(line => {
  const [world, nx, ny, nz, rawHeight, geologyHeight] = line.split(',');
  return { world, normal: [Number(nx), Number(ny), Number(nz)], rawHeight: Number(rawHeight), geologyHeight: Number(geologyHeight) };
});
const typeFor = { rock: 0, temperate: 1, desert: 2, gas: 3, ice: 4, volcanic: 5 };
const up = C.Landscape.up, right = C.Landscape.right, forward = C.Landscape.forward;
const normalize = v => C.unit(v);
const noiseField = new C.Noise(41827);
const expectedHeights = (world, unityNormal) => {
  const seed = world.seed >>> 0, r = C.random(seed);
  r(); // The source consumes one random value for the orbit-body position.
  const type = typeFor[world.biome];
  const amplitude = type === 3 ? 0 : .0025 + r() * .002;
  const frequency = .75 + r() * .75;
  const radiusKm = Math.min(3600, Math.max(160, Math.sqrt(Math.max(.0001, world.radius)) * 900));
  const offset = [seed % 57, (seed >>> 8) % 59, (seed >>> 16) % 61];
  const n = normalize(right.map((v, i) => v * unityNormal[0] + up[i] * unityNormal[1] + forward[i] * unityNormal[2]));
  const body = { type, radius: radiusKm, amp: amplitude, frequency, terrainBase: type === 1 ? .53 : .44, offset };
  const sourceWorld = { noise: noiseField };
  const geology = C.Geology.sample(sourceWorld, body, n);
  const raw = type === 3 ? 0 : 18000 * amplitude * (geology.regional - body.terrainBase - .02);
  return { raw, geology: type === 3 ? 0 : geology.height * 18000 / radiusKm };
};

if (samples.length !== worlds.length * 6) throw new Error(`Expected ${worlds.length * 6} Unity samples; found ${samples.length}.`);
let worst = 0;
let worstGeology = 0;
const byId = new Map(worlds.map(world => [world.id, world]));
for (const sample of samples) {
  const world = byId.get(sample.world);
  if (!world) throw new Error(`Unknown Unity sample world ${sample.world}.`);
  const expected = expectedHeights(world, sample.normal);
  const error = Math.abs(sample.rawHeight - expected.raw);
  worst = Math.max(worst, error);
  if (error > .02) throw new Error(`${sample.world}: Unity height differs from the source HTML by ${error.toFixed(4)} m.`);
  const geologyError = Math.abs(sample.geologyHeight - expected.geology);
  worstGeology = Math.max(worstGeology, geologyError);
  if (geologyError > .02) throw new Error(`${sample.world} normal ${sample.normal.join(',')}: Unity geology ${sample.geologyHeight.toFixed(4)} m, HTML ${expected.geology.toFixed(4)} m (error ${geologyError.toFixed(4)} m).`);
}
const report = `PASS: ${samples.length} Unity samples across ${worlds.length} worlds match the original HTML raw-height and full geology samplers (maximum raw error ${worst.toFixed(6)} m; maximum geology error ${worstGeology.toFixed(6)} m).\n`;
fs.writeFileSync(path.join(root, 'Validation/source-height-parity.txt'), report);
process.stdout.write(report);
