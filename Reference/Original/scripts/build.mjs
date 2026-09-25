import "./extract-engines.mjs";
import { build } from "esbuild";
import { readFile, writeFile, access } from "node:fs/promises";
const read = (p) => readFile(p, "utf8");
const exists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};
let html = await read("source/shell.html");
for (const match of [
  ...html.matchAll(/<script src="\.\/([\w-]+)\.js"><\/script>/g),
]) {
  const name = match[1];
  const code =
    name === "shader-source"
      ? `globalThis.LONGWAY_SHADER=${JSON.stringify(await read("source/world.frag.glsl"))};`
      : await read(`source/${name}.js`);
  html = html.replace(
    match[0],
    () => `<script>\n${code.replace(/<\/script/gi, "<\\/script")}\n</script>`,
  );
}
for (const name of ["materials", "combat", "systems", "multiplayer", "society"]) {
  if (await exists(`source/${name}.js`))
    html = html.replace(
      "<script>\n(async function",
      `<script>\n${await read(`source/${name}.js`)}\n</script>\n<script>\n(async function`,
    );
}
if (await exists("source/citizen.css"))
  html = html.replace(
    "</head>",
    `<style>${await read("source/citizen.css")}</style></head>`,
  );
if (await exists("source/citizen.html"))
  html = html.replace(
    "</body>",
    `${await read("source/citizen.html")}\n</body>`,
  );
if (await exists("source/citizen-ui.js"))
  html = html.replace(
    "</body>",
    `<script>${await read("source/citizen-ui.js")}</script>\n</body>`,
  );
const awaitedSystemsUI = await read("source/systems-ui.js");
const graphicsSettings = await read('source/graphics-settings.js');
html = html.replace('</body>', () => `<script>${graphicsSettings}</script>\n</body>`);
const targetingUI = await read('source/targeting-ui.js');
html = html.replace('</body>', () => `<script>${targetingUI}</script>\n</body>`);
const controllerUI = await read('source/controller.js');
html = html.replace('</body>', () => `<script>${controllerUI}</script>\n</body>`);
html = html.replace(
  "</body>",
  () => `<script>${awaitedSystemsUI}</script>\n</body>`,
);
const enginesUI = await read("source/engines-ui.js");
html = html.replace("</body>", () => `<script>${enginesUI}</script>\n</body>`);
const cityUI = await read("source/city-ui.js");
html = html.replace("</body>", () => `<script>${cityUI}</script>\n</body>`);
const societyUI = await read("source/society-ui.js");
html = html.replace("</body>", () => `<script>${societyUI}</script>\n</body>`);
const shipboardUI = await read("source/shipboard.js");
html = html.replace("</body>", () => `<script>${shipboardUI}</script>\n</body>`);
const settlementsUI=await read('source/settlements.js');
html=html.replace('</body>',()=>`<script>${settlementsUI}</script>\n</body>`);
const economyUI = await read("source/economy.js");
html = html.replace("</body>", () => `<script>${economyUI}</script>\n</body>`);
const campaignUI=await read('source/campaign-ui.js');
html=html.replace('</body>',()=>`<script>${campaignUI}</script>\n</body>`);
const pauseUI = await read("source/pause-ui.js");
html = html.replace("</body>", () => `<script>${pauseUI}</script>\n</body>`);
const mfdUI=await read('source/mfd-ui.js');
html=html.replace('</body>',()=>`<script>${mfdUI}</script>\n</body>`);
const artworkUI = await read("source/artwork-ui.js");
html = html.replace("</body>", () => `<script>${artworkUI}</script>\n</body>`);
const visual = await build({
  entryPoints: ["source/visuals/stage.js"],
  bundle: true,
  write: false,
  format: "iife",
  target: "es2022",
  minify: true,
});
html = html.replace(
  "</body>",
  () =>
    `<script>${visual.outputFiles[0].text.replace(/<\/script/gi, "<\\/script")}</script>\n</body>`,
);
const peer = await read("node_modules/peerjs/dist/peerjs.min.js");
html = html.replace(
  "<script>",
  () =>
    `<script>${peer.replace(/<\/script/gi, "<\\/script")}</script>\n<script>`,
);
html = html.replace(
  "<title>Longway 4 — Flight Deck</title>",
  "<title>Space Patriot — Flight Deck</title>",
);
const licenses = await Promise.all(
  ["three", "peerjs"].map((name) => read("node_modules/" + name + "/LICENSE")),
);
html = html.replace(
  "</head>",
  "<!-- Bundled dependency licenses\n" +
    licenses.join("\n\n") +
    "\n-->\n</head>",
);
await writeFile("index.html", html);
const art =
  "data:image/png;base64," +
  (await readFile("assets/concepts/flight-systems-board.png")).toString(
    "base64",
  );
let standalone = html
  .replace(
    /src="assets\/concepts\/flight-systems-board.png"/g,
    () => `src="${art}"`,
  )
  .replace(
    'href="assets/concepts/flight-systems-board.png"',
    `href="#" onclick="event.preventDefault();const w=window.open();if(w){const i=w.document.createElement('img');i.src=this.previousElementSibling.src;i.style.width='100%';w.document.body.style.margin='0';w.document.body.append(i);}"`,
  );
const cockpitArt =
  "data:image/png;base64," +
  (await readFile("assets/concepts/cockpit-fleet-board.png")).toString(
    "base64",
  );
standalone = standalone.replaceAll(
  "assets/concepts/cockpit-fleet-board.png",
  cockpitArt,
);
for (const name of [
  "strider-cockpit",
  "wayfarer-cockpit",
  "meridian-cockpit",
  "instrument-frame",
  "rifle-view",
  "rifle-view-v10",
  "rifle-ads-v11",
  "sidearm-view",
  "pause-terminal-v10",
]) {
  const file = "assets/ui/" + name + ".png",
    data = "data:image/png;base64," + (await readFile(file)).toString("base64");
  standalone = standalone.replaceAll(file, data);
}
for (const file of [
  "assets/textures/interior-atlas.png",
  "assets/textures/exterior-atlas.png",
  "assets/textures/terrain-atlas.png",
  "assets/textures/biology-atlas.png",
  "assets/textures/conifer-branch.png",
  "assets/textures/city-interiors-atlas.png",
  "assets/textures/machinery-atlas.png",
  "assets/textures/frontier-surfaces-atlas.png",
  "assets/textures/alien-flora-atlas.png",
  "assets/textures/alien-fauna-atlas.png",
  "assets/textures/habitat-surfaces-atlas.png",
  "assets/textures/geology-atlas.png",
  "assets/concepts/space-patriot-interiors.png",
  "assets/concepts/space-patriot-frontier.png",
]) {
  const data =
    "data:image/png;base64," + (await readFile(file)).toString("base64");
  standalone = standalone.replaceAll(file, data);
}
await writeFile("Space_Patriot.html", standalone);
console.log(
  `Built web game (${Math.round(Buffer.byteLength(html) / 1024)} KiB) and portable HTML (${Math.round(Buffer.byteLength(standalone) / 1024)} KiB) with PeerJS and embedded concept art.`,
);
