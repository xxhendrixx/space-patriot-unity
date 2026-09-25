import { chromium } from 'playwright';
import { readFile, writeFile } from 'node:fs/promises';
import { launchOptions } from './feature-browser-config.mjs';
const browser = await chromium.launch(launchOptions());
try {
  const page = await browser.newPage();
  await page.setContent('<canvas id="scene" width="64" height="64"></canvas>');
  await page.addScriptTag({ content: await readFile('source/renderer.js','utf8') });
  const source = await readFile('source/world.frag.glsl','utf8');
  console.log(await page.evaluate(source => {
    window.renderer = new LongwayRenderer(document.getElementById('scene'), {}, source);
    return { bytes: renderer.source.length, hardware: renderer.hardware };
  }, source));
  await writeFile('build_logs/graphics-feature/compiled-terrain.glsl', await page.evaluate(() => renderer.source));
  const start = Date.now();
  for (let i = 0; i < 120; i++) {
    const result = await page.evaluate(() => {
      const r = renderer, gl = r.gl;
      if (r.parallel && !gl.getProgramParameter(r.program, r.parallel.COMPLETION_STATUS_KHR)) return null;
      return { linked: gl.getProgramParameter(r.program, gl.LINK_STATUS), log: gl.getProgramInfoLog(r.program) };
    });
    if (result) { console.log({ ms: Date.now() - start, ...result }); if (!result.linked) process.exitCode = 1; break; }
    if (i % 10 === 0) console.log('Compiling', Date.now() - start);
    await new Promise(resolve => setTimeout(resolve, 1000));
    if (i === 119) process.exitCode = 1;
  }
} finally { await browser.close(); }
