/* Read-only loopback host for the Role-first Composer specimen. It serves only
 * the product's web assets, brand assets, the accepted 06a synthetic fixture
 * and this specimen directory — from the checkout it lives in — and imports no
 * Runtime, store, data directory or API router. Nothing here can be mutated.
 *   CW_SPECIMEN_PORT=8964 node engineering/design/role-composer-20260922/specimen/serve.mjs
 */
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readFile, realpath } from "node:fs/promises";

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, "../../../..");
const allowed = ["app/web", "brand", "app/tests/fixtures/agent-profiles", "engineering/design/role-composer-20260922/specimen"].map((part) => path.join(repo, part));
const specimenPath = "/engineering/design/role-composer-20260922/specimen/index.html";
const types = { ".html": "text/html", ".mjs": "text/javascript", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".png": "image/png", ".woff2": "font/woff2", ".woff": "font/woff" };

export async function startRoleComposerSpecimen({ port = 0 } = {}) {
  const roots = await Promise.all(allowed.map((root) => realpath(root)));
  const server = http.createServer(async (req, res) => {
    try {
      if (!["GET", "HEAD"].includes(req.method)) { res.writeHead(405); res.end(); return; }
      const url = new URL(req.url, "http://localhost");
      if (url.pathname === "/") { res.writeHead(302, { Location: specimenPath }); res.end(); return; }
      const pathname = decodeURIComponent(url.pathname);
      if (pathname.includes("\0")) { res.writeHead(404); res.end(); return; }
      const target = await realpath(path.join(repo, pathname));
      if (!roots.some((root) => target.startsWith(root + path.sep))) { res.writeHead(404); res.end(); return; }
      const data = await readFile(target);
      res.writeHead(200, { "Content-Type": `${types[path.extname(target)] || "application/octet-stream"}; charset=utf-8`, "Cache-Control": "no-store", "X-Content-Type-Options": "nosniff", "Referrer-Policy": "no-referrer" });
      res.end(req.method === "HEAD" ? undefined : data);
    } catch { res.writeHead(404); res.end(); }
  });
  await new Promise((resolve, reject) => { server.once("error", reject); server.listen(port, "127.0.0.1", resolve); });
  const origin = `http://127.0.0.1:${server.address().port}`;
  return { origin, url: origin + specimenPath, close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())) };
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const port = Number(process.env.CW_SPECIMEN_PORT || 8964);
  if (port === 8787 || port === 8899) throw new Error("8787 and 8899 belong to the user's Host and preview.");
  const { url } = await startRoleComposerSpecimen({ port });
  console.log(`Role-first Composer · synthetic specimen: ${url}`);
}
