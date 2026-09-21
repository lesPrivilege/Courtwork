#!/usr/bin/env node
/* Evidence-only wrapper around the existing Runtime Management preview.
 * `?text=large` changes only the document's existing data-text-size preference;
 * `?theme=dark` selects the existing preview theme. Product modules, fixture
 * state, controls and layout remain the preview's own bytes. */
import http from "node:http";
import path from "node:path";
import { parseArgs } from "node:util";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readFile } from "node:fs/promises";

const { values } = parseArgs({ options: { app: { type: "string" }, port: { type: "string", default: "0" } } });
if (!values.app) throw new Error("--app is required");
const moduleUrl = pathToFileURL(path.resolve(values.app, "scripts/runtime-management-preview.mjs")).href;
const { startRuntimeManagementPreview } = await import(moduleUrl);
const upstream = await startRuntimeManagementPreview({ port: 0 });
const here = path.dirname(fileURLToPath(import.meta.url));
const server = http.createServer(async (request, response) => {
  try {
    if (!["GET", "HEAD"].includes(request.method)) { response.writeHead(405); response.end(); return; }
    const requested = new URL(request.url, "http://fixture.invalid");
    if (["/isolation.html", "/isolation.mjs"].includes(requested.pathname)) {
      const bytes = await readFile(path.join(here, requested.pathname.slice(1)));
      response.writeHead(200, { "content-type": requested.pathname.endsWith(".mjs") ? "text/javascript; charset=utf-8" : "text/html; charset=utf-8", "cache-control": "no-store" });
      response.end(request.method === "HEAD" ? undefined : bytes);
      return;
    }
    const source = await fetch(new URL(requested.pathname, upstream.url));
    if (!source.ok) { response.writeHead(source.status); response.end(); return; }
    let bytes = Buffer.from(await source.arrayBuffer());
    const headers = { "content-type": source.headers.get("content-type") || "application/octet-stream", "cache-control": "no-store" };
    if (requested.pathname === "/") {
      const text = ["small", "large"].includes(requested.searchParams.get("text")) ? requested.searchParams.get("text") : "normal";
      const theme = requested.searchParams.get("theme") === "dark" ? "dark" : "light";
      bytes = Buffer.from(bytes.toString("utf8").replace(
        '<html lang="en" data-theme="light">',
        `<html lang="en" data-theme="${theme}" data-text-size="${text}">`,
      ));
    }
    response.writeHead(200, headers);
    response.end(request.method === "HEAD" ? undefined : bytes);
  } catch {
    response.writeHead(502); response.end();
  }
});
await new Promise((resolve, reject) => { server.once("error", reject); server.listen(Number(values.port), "127.0.0.1", resolve); });
console.log(`http://127.0.0.1:${server.address().port}/`);
const close = async () => { await new Promise(resolve => server.close(resolve)); await upstream.close(); };
process.once("SIGINT", close);
process.once("SIGTERM", close);
