import http from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, relative, isAbsolute, sep, extname } from "node:path";
import { pathToFileURL } from "node:url";
import { PeerServer } from "peer";
const root = process.cwd(),
  port = Number(process.env.PORT || 4173);
const mime = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".css": "text/css",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".json": "application/json",
  ".md": "text/plain",
};
export function createGameServer(directory = root) {
  const base = resolve(directory);
  return http.createServer(async (req, res) => {
    let file;
    try {
      const path = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
      if (path.includes("\0")) throw new Error("Invalid path");
      file = resolve(base, "." + (path === "/" ? "/index.html" : path));
    } catch {
      res.writeHead(400);
      res.end("Invalid URL");
      return;
    }
    const local = relative(base, file);
    if (isAbsolute(local) || local.split(sep).some(part => part.startsWith("."))) {
      res.writeHead(403);
      res.end();
      return;
    }
    try {
      const data = await readFile(file);
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "Content-Length": data.length,
      });
      res.end(data);
    } catch {
      res.writeHead(404);
      res.end("Not found");
    }
  });
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  createGameServer().listen(port, "0.0.0.0", () =>
    console.log(`Space Patriot: http://localhost:${port}`),
  );
PeerServer({ port: 9000, path: "/blox", allow_discovery: false });
console.log("Local PeerJS signaling: port 9000 /blox");
}
