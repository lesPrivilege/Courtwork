#!/usr/bin/env node
// Serve site/dist/ the way GitHub Pages will: under the /Courtwork/ sub-path,
// so a link that only works from the domain root fails here too.
//
//   node site/scripts/preview.mjs [--port 8907]
//
import { createServer } from "node:http";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { SITE } from "./release.mjs";

const BASE = "/Courtwork/";
const DIST = path.join(SITE, "dist");
const port = Number(process.argv.includes("--port") ? process.argv[process.argv.indexOf("--port") + 1] : 8907);

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".mjs": "text/javascript; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".txt": "text/plain; charset=utf-8",
  ".jsonl": "text/plain; charset=utf-8",
};

createServer(async (req, res) => {
  const url = new URL(req.url, "http://localhost");
  if (!url.pathname.startsWith(BASE)) {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end(`not found (this preview only serves ${BASE})\n`);
    return;
  }
  let relative = url.pathname.slice(BASE.length) || "index.html";
  if (relative.endsWith("/")) relative += "index.html";
  const file = path.join(DIST, relative);
  if (!file.startsWith(DIST)) {
    res.writeHead(403).end();
    return;
  }
  try {
    await stat(file);
    res.writeHead(200, { "content-type": TYPES[path.extname(file)] ?? "application/octet-stream" });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404, { "content-type": "text/plain" });
    res.end(`not found: ${relative}\n`);
  }
}).listen(port, "127.0.0.1", () => console.log(`http://127.0.0.1:${port}${BASE}`));
