import { chromium } from 'playwright';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createGameServer } from './serve.mjs';
import { launchOptions } from './feature-browser-config.mjs';

// Focused feature sampling; deliberately independent of the project error-check system.
const label = process.argv[2] || 'after';
if (!/^[a-z0-9-]+$/i.test(label)) throw Error('Use a simple report label');
const directory = 'build_logs/graphics-feature';
await mkdir(directory, { recursive: true });
const server = createGameServer();
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch(launchOptions());
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
const report = { label, viewport: [1280, 720], browser: browser.version(), errors: [], scenes: [] };
page.on('pageerror', error => report.errors.push(error.message));
page.on('console', message => { if (message.type() === 'error' && report.errors.length < 30) report.errors.push(message.text().slice(0, 1600)); });
try {
  if (label === 'before'||label==='comparison-baseline') {
    const html = await readFile(`${directory}/${label==='before'?'baseline':'working-baseline'}.html`, 'utf8');
    await page.route('**/baseline.html', route => route.fulfill({ contentType: 'text/html', body: html }));
  }
  const begin = Date.now();
  await page.goto(`${base}/${label === 'before'||label==='comparison-baseline' ? 'baseline.html' : 'index.html'}`, { timeout: 120000 });
  await page.waitForFunction(() => window.longwayBoot?.state.error||window.longwayBoot?.state.ready && window.BloxVisuals, null, { timeout: 210000 });
  const bootError=await page.evaluate(()=>longwayBoot.state.error);if(bootError)throw Error(bootError);
  report.bootMs = Date.now() - begin;
  report.boot = await page.evaluate(() => ({ mesh: BloxVisuals.enabled, error: BloxVisuals.error, hardware: longway.renderer.hardware, stages: longwayBoot.state.history }));
  console.log(JSON.stringify({ label, bootMs: report.bootMs, boot: report.boot }));
  await page.locator('#start').click();
  await page.evaluate(() => { longway.pause(); longway.combat.enemies = []; longway.combat.recover(); });
  for (const scene of ['space', 'city', 'forest', 'wilderness', 'low-flight', 'cloud-city']) {
    await page.evaluate(scene => {
      const A = longway, F = A.flight, C = LongwayCore, W = A.world;
      A.celestial.timeScale = 1;
      const b = W.catalog.find(b => b.name === (scene === 'cloud-city' ? 'TOI-270 c' : 'Earth'));
      F.place(b, scene === 'space' ? 'orbit' : 'surface');
      F.cameraMode = 'chase';
      if (scene !== 'space') {
        const s = W.site(b);
        F.position = W.fromLocal([.02, .06, .18], s);
        F.forward = C.unit(C.sub(s.center, F.position)); F.up = s.up.slice();
        if (scene === 'forest' || scene === 'wilderness' || scene === 'low-flight') {
          const p = W.fromLocal(scene==='wilderness'?[2.7,0,2.7]:[.7, 0, .7], s), n = C.unit(C.sub(p, b.center));
          F.position = C.add(b.center, C.mul(n, b.radius + W.height(b, n) + (scene !== 'low-flight' ? .00186 : .3)));
          F.walking = scene !== 'low-flight'; F.vehicle.state = F.walking ? 'onfoot' : 'flight';
          F.cameraMode = F.walking ? 'cockpit' : 'chase'; F.forward = s.forward.slice(); F.up = n;
        }
        F.orthogonalize();
        // Keep a walking pilot separate from the parked ship, as normal egress does.
        if(!F.walking){F.vehicle.position=F.position.slice();F.vehicle.forward=F.forward.slice();F.vehicle.up=F.up.slice();}
        F.velocity = [0, 0, 0];
      }
      A.renderer.autoResolution = false; A.renderer.pixelBudget = 460800; A.renderer.scale = .7;
      if (BloxVisuals.enabled) { BloxVisuals.renderer.setPixelRatio(1); BloxVisuals.renderer.setSize(innerWidth, innerHeight); }
      A.resize();
    }, scene);
    const stats = await page.evaluate(async () => {
      const A = longway, samples = [], cpus = [];
      let last = performance.now();
      for (let i = 0; i < 300; i++) {
        await new Promise(requestAnimationFrame);
        const now = performance.now(), start = now;
        A.step(1 / 60); A.render();
        if (i >= 120) { samples.push(now - last); cpus.push(performance.now() - start); }
        last = now;
      }
      const sorted = samples.slice().sort((a, b) => a - b), mean = samples.reduce((a, b) => a + b, 0) / samples.length;
      return { frames: samples.length, meanFrameMs: mean, fps: 1000 / mean, p95FrameMs: sorted[Math.floor(sorted.length * .95)], meanCpuMs: cpus.reduce((a, b) => a + b, 0) / cpus.length, rayGpuMs: A.renderer.gpuMs, detail: BloxVisuals.stats, position: A.flight.position };
    });
    report.scenes.push({ scene, ...stats });
    console.log(JSON.stringify({ scene, fps: stats.fps, p95: stats.p95FrameMs, cpu: stats.meanCpuMs, draws: stats.detail?.drawCalls }));
    await page.screenshot({ path: `${directory}/${label}-${scene}.png` });
  }
} catch (error) {
  report.failure = error.stack;
  report.pageState = await page.evaluate(() => ({ stage: document.getElementById('bootStage')?.textContent, error: document.getElementById('errorText')?.textContent, visuals: window.BloxVisuals?.error })).catch(() => null);
  await page.screenshot({ path: `${directory}/${label}-failure.png`, timeout: 10000 }).catch(() => {});
  process.exitCode = 1;
  console.error(report.failure, report.pageState);
} finally {
  await writeFile(`${directory}/${label}.json`, JSON.stringify(report, null, 2));
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
