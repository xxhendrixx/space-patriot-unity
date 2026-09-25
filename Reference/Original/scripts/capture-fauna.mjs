import { chromium } from "playwright";
import { writeFile } from "node:fs/promises";
const browser = await chromium.launch({
  channel: "chrome",
  headless: true,
  args: ["--use-gl=angle", "--use-angle=metal", "--ignore-gpu-blocklist"],
});
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on("pageerror", (e) => errors.push(e.message));
try {
  await page.goto("http://localhost:4173/");
  await page.waitForFunction(
    () => window.longway && window.BloxUI && window.BloxVisuals?.enabled && longwayBoot.state.ready,
    null,
    { timeout: 90000 },
  );
  await page.locator("#start").click();
  await page.evaluate(() => document.exitPointerLock());
  const subjects = await page.evaluate(() => {
    const A = longway,
      C = LongwayCore,
      F = A.flight,
      W = A.world;
    A.start();
    A.pause();
    A.combat.armed = false;
    A.renderer.autoResolution = false;
    A.renderer.scale = 1;
    A.resize();
    const body = F.nearest().body;
    F.place(body, "surface");
    const agents = W.streamFauna(F.position, body);
    window.photo = { body, agents, site: W.site(body) };
    A.render();
    return agents.map((a) => ({
      id: a.id,
      family: A.visuals.animalModels.get(body.id+':'+a.id)?.userData.family,
    }));
  });
  const results = [];
  for (const family of [0, 1, 2, 3, 4]) {
    const subject = subjects.find((x) => x.family === family);
    if (!subject) continue;
    const result = await page.evaluate((id) => {
      const A = longway,
        C = LongwayCore,
        F = A.flight,
        { body, agents, site } = photo,
        a = agents.find((x) => x.id === id);
      A.pause();
      F.walking = true;
      F.vehicle.state = "onfoot";
      F.vehicle.transition = null;
      const center = C.add(a.position, C.mul(site.up, a.size * 0.85));
      F.position = C.add(
        center,
        C.add(
          C.mul(site.right, a.size * 2.9),
          C.add(
            C.mul(site.forward, a.size * 2.4),
            C.mul(site.up, a.size * 0.6),
          ),
        ),
      );
      F.forward = C.unit(C.sub(center, F.position));
      F.up = site.up.slice();
      F.orthogonalize();
      F.viewYaw = F.viewPitch = 0;
      for (let i = 0; i < 14; i++)
        A.renderer.materials.capture(F, 200 + i * 0.2);
      A.render();
      BloxUI.update(performance.now());
      BloxUI.frame(performance.now());
      return {
        id,
        position: a.position,
        size: a.size,
        glError: A.check().error,
      };
    }, subject.id);
    await page.screenshot({
      path: `artifacts/fauna-${["cervid", "canid", "ratite", "beetle", "monitor"][family]}.png`,
    });
    results.push({ ...result, family });
  }
  await writeFile(
    "artifacts/fauna-report.json",
    JSON.stringify({ results, errors }, null, 2),
  );
  console.log(JSON.stringify({ results, errors }));
} finally {
  await browser.close();
}
