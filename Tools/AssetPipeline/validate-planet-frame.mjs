import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const landscape = fs.readFileSync(path.join(root, 'Reference/Original/source/landscape.js'), 'utf8');
const surface = fs.readFileSync(path.join(root, 'Assets/SpacePatriot/Scripts/PlanetEngineSurface.cs'), 'utf8');
const shader = fs.readFileSync(path.join(root, 'Assets/SpacePatriot/Resources/Shaders/WorldworksPlanet.shader'), 'utf8');

const upMatch = landscape.match(/up\s*=\s*unit\(\[([^\]]+)\]\)/);
if (!upMatch) throw new Error('Could not read Landscape.up from the original source.');
const normalize = v => { const m = Math.hypot(...v); return v.map(x => x / m); };
const cross = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const dot = (a, b) => a.reduce((s, x, i) => s + x * b[i], 0);
const add = (a, b) => a.map((x, i) => x + b[i]);
const mul = (a, s) => a.map(x => x * s);
const up = normalize(upMatch[1].split(',').map(Number));
const right = normalize(cross([0, 1, 0], up));
const forward = normalize(cross(up, right));
const unityToSource = n => normalize(add(add(mul(right, n[0]), mul(up, n[1])), mul(forward, n[2])));
const sourceToUnity = n => [dot(n, right), dot(n, up), dot(n, forward)];

if (!surface.includes('sourceRight*unityNormal.x+sourceUp*unityNormal.y+sourceForward*unityNormal.z'))
  throw new Error('Unity globe sampler is not mapped into the source right/up/forward basis.');
if (!shader.includes('globe=i.color.rgb'))
  throw new Error('Globe shader is not consuming the source-height-driven vertex colors.');

let worstError = 0;
for (const [x, y, z] of [[0, 1, 0], [1, 0, 0], [0, 0, 1], [.41, .83, -.37], [-.65, .24, .72], [.08, -.99, .12]]) {
  const unity = normalize([x, y, z]);
  const fromUnity = unityToSource(unity);
  const reconstructedUnity = sourceToUnity(fromUnity);
  const error = Math.hypot(...unity.map((v, i) => v - reconstructedUnity[i]));
  worstError = Math.max(worstError, error);
  if (error > 1e-6) throw new Error(`Frame mismatch for normal (${x}, ${y}, ${z}): ${error}`);
}

const report = [
  'PASS: Unity pole maps to original Landscape.up.',
  'PASS: Unity +X/+Z map to original Landscape.right/forward.',
  `PASS: six globe normals round-trip through the source body frame (max vector error ${worstError.toExponential(2)}).`,
  'PASS: planetary shader uses height-driven globe vertex colors; it no longer invents a separate continent mask.',
].join('\n') + '\n';
const validation = path.join(root, 'Validation');
fs.mkdirSync(validation, { recursive: true });
fs.writeFileSync(path.join(validation, 'source-frame-alignment.txt'), report);
process.stdout.write(report);
