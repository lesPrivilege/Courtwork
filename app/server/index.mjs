import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createRuntime } from "./runtime.mjs";
import { catalog } from "../extensions/catalog.mjs";
import { ServiceError } from "./service.mjs";

const MAX_BODY = 1024 * 1024;
const APP_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const STATIC = new Map([
  ["/", { file: path.join(APP_ROOT, "web", "index.html"), type: "text/html; charset=utf-8" }],
  ["/index.html", { file: path.join(APP_ROOT, "web", "index.html"), type: "text/html; charset=utf-8" }],
  ["/web/app.mjs", { file: path.join(APP_ROOT, "web", "app.mjs"), type: "text/javascript; charset=utf-8" }],
  ["/web/styles.css", { file: path.join(APP_ROOT, "web", "styles.css"), type: "text/css; charset=utf-8" }],
  ["/extensions/evidence-memo/renderer.mjs", { file: path.join(APP_ROOT, "extensions", "evidence-memo", "renderer.mjs"), type: "text/javascript; charset=utf-8" }],
  ["/extensions/inbound-nda/renderer.mjs", { file: path.join(APP_ROOT, "extensions", "inbound-nda", "renderer.mjs"), type: "text/javascript; charset=utf-8", optional: true }],
]);

for (const name of ["surface-modules.mjs", "workspace-view.mjs", "user-message.mjs", "ui-controls.mjs", "settings-view.mjs", "runtime-view.mjs", "inspector.mjs", "materials-view.mjs", "home-view.mjs", "thread-projection.mjs", "vendor/floating.mjs", "vendor/marked.mjs", "vendor/purify.mjs"]) STATIC.set(`/web/${name}`, {file:path.join(APP_ROOT,"web",name),type:"text/javascript; charset=utf-8"});
STATIC.set("/web/vendor/icons.svg", {file:path.join(APP_ROOT,"web/vendor/icons.svg"),type:"image/svg+xml"});
// Brand merge gate 3: the product admits the brand package's ES modules and
// nothing else under brand/. Each path is an exact key, so brand/CONTRACT.md,
// brand/index.html, brand/exports/** and any traversal remain 404.
const BRAND_SRC = path.join(APP_ROOT, "..", "brand", "src");
for (const name of ["court-symbol.mjs", "symbol.mjs", "geometry.generated.mjs"]) STATIC.set(`/brand/src/${name}`, {file:path.join(BRAND_SRC,name),type:"text/javascript; charset=utf-8"});

function send(res, status, body, type = "application/json; charset=utf-8") {
  const payload = Buffer.isBuffer(body) ? body : typeof body === "string" ? body : JSON.stringify(body);
  res.writeHead(status, { "content-type": type, "content-length": Buffer.byteLength(payload), "cache-control": "no-store" });
  res.end(payload);
}

function json(res, status, body) { send(res, status, body); }
function fail(res, status, code, message, details = null) {
  json(res, status, { error: { code, message, ...(details ?? {}) } });
}

function decodePart(value) {
  try { return decodeURIComponent(value); } catch { throw new ServiceError(400, "invalid_path", "request path is invalid"); }
}

async function body(req) {
  let size = 0;
  const chunks = [];
  for await (const chunk of req) {
    size += chunk.length;
    if (size > MAX_BODY) {
      const error = new ServiceError(413, "body_too_large", "request body is too large");
      req.destroy();
      throw error;
    }
    chunks.push(chunk);
  }
  if (!chunks.length) return {};
  const contentType = String(req.headers["content-type"] ?? "").split(";")[0].trim().toLowerCase();
  if (contentType !== "application/json") throw new ServiceError(415, "content_type", "JSON content type is required");
  try {
    const parsed = JSON.parse(Buffer.concat(chunks).toString("utf8"));
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error("object required");
    return parsed;
  } catch {
    throw new ServiceError(400, "invalid_json", "request body is invalid JSON");
  }
}

function routeParts(url) {
  const parts = url.pathname.split("/").filter(Boolean);
  return parts.map(decodePart);
}

function errorResponse(error) {
  if (error instanceof ServiceError) return { status: error.status, code: error.code, message: error.message, details: error.details };
  if (error?.message === "project not found" || error?.message === "session not found" || error?.message === "run not found" || error?.message === "question not found") return { status: 404, code: "not_found", message: "resource not found" };
  if (error?.message === "active run exists") return { status: 409, code: "active_run", message: "only one active run is allowed" };
  if (error?.source === 'core_bridge' || ['INVALID_INPUT','EVIDENCE_INVALID','CONTRACT_UNSUPPORTED','BINDING_MISMATCH','CONTEXT_BUDGET','REVIEW_INVALID','OBLIGATION_OPEN'].includes(error?.code)) return {status:409,code:error.code,message:error.message};
  return { status: 500, code: "internal_error", message: "request failed" };
}

function safeOrigin(req, host, port) {
  const allowedHosts = new Set([host + ":" + port, "localhost:" + port, "127.0.0.1:" + port]);
  const requestHost = String(req.headers.host ?? "");
  if (!allowedHosts.has(requestHost)) return false;
  if (req.headers.origin) {
    try {
      const origin = new URL(String(req.headers.origin));
      if (!["http:", "https:"].includes(origin.protocol) || !allowedHosts.has(origin.host)) return false;
    } catch { return false; }
  }
  return true;
}

function routeService(service, req, url) {
  const parts = routeParts(url);
  const method = req.method ?? "GET";
  if (parts[0] !== "api" || parts[1] !== "v5") return null;
  const tail = parts.slice(2);
  if (method === "GET" && tail.length === 1 && tail[0] === "bootstrap") return service.bootstrap;
  if (method === "GET" && tail.length === 1 && tail[0] === "work-summary") return () => service.getWorkSummary(url.searchParams);
  if (method === "GET" && tail.length === 3 && tail[0] === "projects" && tail[2] === "work") return () => service.listWork(tail[1]);
  if (method === "GET" && tail.length === 1 && tail[0] === "projects") return () => service.listProjects();
  if (method === "POST" && tail.length === 1 && tail[0] === "projects") return async () => service.createProject(await body(req));
  if (method === "GET" && tail.length === 1 && tail[0] === "sessions") return () => service.listSessions(url.searchParams.get("projectId") ?? undefined);
  if (method === "POST" && tail.length === 1 && tail[0] === "sessions") return async () => service.createSession(await body(req));
  if (tail.length === 2 && tail[0] === "sessions" && method === "DELETE") return () => service.deleteSession(tail[1]);
  if (tail.length === 2 && tail[0] === "sessions" && method === "GET") return () => service.getSession(tail[1]);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "events" && method === "GET") return () => service.getEvents(tail[1], url.searchParams.get("afterSeq") ?? 0);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "draft" && method === "PUT") return async () => service.updateDraft(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "permission-mode" && method === "PUT") return async () => service.setPermissionMode(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "materials" && method === "POST") return async () => service.addMaterial(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "workspace" && method === "GET") return () => service.getWorkspaceTree(tail[1]);
  if (tail.length === 4 && tail[0] === "sessions" && tail[2] === "workspace" && tail[3] === "file" && method === "GET") return () => service.getWorkspaceFile(tail[1], url.searchParams.get("path") ?? "");
  if (tail.length === 4 && tail[0] === "sessions" && tail[2] === "artifacts" && tail[3] === "file" && method === "GET") return () => service.getArtifactFile(tail[1], url.searchParams);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "runs" && method === "POST") return async () => service.createRun(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "extension" && method === "POST") return async () => service.createExtensionBinding(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "work-query" && method === "GET") return () => service.queryWork(tail[1], url.searchParams);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "surface" && method === "GET") return () => service.getSurface(tail[1]);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "actions" && method === "POST") return async () => service.humanAction(tail[1], await body(req));
  if (tail.length === 2 && tail[0] === "runs" && method === "GET") return () => service.getRun(tail[1]);
  if (tail.length === 3 && tail[0] === "runs" && tail[2] === "cancel" && method === "POST") return async () => service.cancelRun(tail[1], await body(req));
  if (tail.length === 4 && tail[0] === "runs" && tail[2] === "questions" && method === "POST") return async () => service.answerQuestion(tail[1], tail[3], await body(req));
  if (tail.length === 1 && tail[0] === "runtime-resources" && method === "GET") return () => service.listRuntimeResources(url.searchParams.get("sessionId"), url.searchParams.get("kind"));
  if (tail.length === 3 && tail[0] === "runtime-resources" && tail[2] === "invoke" && method === "POST") return async () => service.invokeRuntimePrompt(url.searchParams.get("sessionId"), tail[1], await body(req));
  if (tail.length === 1 && tail[0] === "runtime-context" && method === "GET") return () => service.getRuntimeContext(url.searchParams.get("sessionId"), url.searchParams.get("runId"));
  if (tail.length === 2 && tail[0] === "runtime-permissions" && tail[1] === "evaluate" && method === "POST") return async () => service.evaluateRuntimePermission(url.searchParams.get("sessionId"), await body(req));
  if (tail.length === 3 && tail[0] === "mcp" && tail[2] === "lifecycle" && method === "POST") return async () => service.mcpLifecycle(url.searchParams.get("sessionId"), tail[1], await body(req));
  if (tail.length === 1 && tail[0] === "runtime-control" && method === "GET") return () => service.getRuntimeControl(url.searchParams.get("sessionId"));
  if (tail.length === 1 && tail[0] === "runtime-control" && method === "PUT") return async () => service.changeRuntimeControl(url.searchParams.get("sessionId"), await body(req));
  if (tail.length === 2 && tail[0] === "runtime-resources" && method === "GET") return () => service.getRuntimeResource(url.searchParams.get("sessionId"), tail[1]);
  if (method === "GET" && tail.length === 1 && tail[0] === "runtime-info") return () => service.getRuntimeInfo();
  if (method === "GET" && tail.length === 1 && tail[0] === "provider-models") return () => service.getProviderModels();
  if (method === "GET" && tail.length === 1 && tail[0] === "provider-config") return () => service.getProviderConfig();
  if (method === "PUT" && tail.length === 1 && tail[0] === "provider-config") return async () => service.setProviderConfig(await body(req));
  if (method === "PUT" && tail.length === 1 && tail[0] === "provider-credential") return async () => service.putProviderCredential(await body(req));
  if (method === "DELETE" && tail.length === 1 && tail[0] === "provider-credential") return async () => service.deleteProviderCredential(await body(req));
  if (method === "GET" && tail.length === 1 && tail[0] === "extensions") return () => service.listExtensions();
  if (method === "POST" && tail.length === 3 && tail[0] === "extensions" && tail[2] === "lifecycle") return async () => service.extensionLifecycle(tail[1], await body(req));
  return undefined;
}

export async function startServer({ dataDir, host = "127.0.0.1", port = 0, extensionCatalog = catalog, fakeResponder = null, responder = null, budget, compaction, logger = (line) => console.log(line) } = {}) {
  const runtime = await createRuntime({ dataDir, extensionCatalog, fakeResponder, responder, budget, compaction, logger });
  const { service } = runtime;
  let server;
  let closing = false;
  let closePromise;
  try {
    const token = randomUUID();
    server = http.createServer(async (req, res) => {
      try {
        if (closing) { fail(res, 503, "runtime_closing", "runtime is stopping"); return; }
        const address = server.address();
        const actualPort = typeof address === "object" && address ? address.port : port;
        if (!safeOrigin(req, host, actualPort)) { fail(res, 403, "origin_denied", "request origin is not allowed"); return; }
        const url = new URL(req.url ?? "/", "http://" + host + ":" + actualPort);
        if (url.pathname.startsWith("/api/v5/")) {
          if (url.pathname === "/api/v5/bootstrap" && req.method === "GET") {
            json(res, 200, service.bootstrap(token)); return;
          }
          if (req.headers["x-work-token"] !== token) { fail(res, 401, "unauthorized", "work token is required"); return; }
          const handler = routeService(service, req, url);
          if (!handler) { fail(res, 404, "not_found", "request not found"); return; }
          const result = await handler();
          json(res, 200, await result);
          return;
        }
        if (req.method === "GET" && STATIC.has(url.pathname)) {
          const file = STATIC.get(url.pathname);
          let data;
          try { data = await readFile(file.file); }
          catch (error) {
            if (file.optional && error?.code === "ENOENT") { fail(res, 404, "not_found", "renderer is unavailable"); return; }
            throw error;
          }
          send(res, 200, data, file.type);
          return;
        }
        fail(res, 404, "not_found", "request not found");
      } catch (error) {
        if (!res.headersSent) {
          const info = errorResponse(error);
          fail(res, info.status, info.code, info.message, info.details);
        } else res.destroy();
      }
    });
    await new Promise((resolve, reject) => {
      server.once("error", reject);
      server.listen(port, host, resolve);
    });
    const actualPort = server.address().port;
    return {
      ...runtime, server, token,
      url: "http://" + host + ":" + actualPort,
      close() {
        closePromise ??= (async () => {
          closing = true;
          // Stop accepting HTTP first; cancel live Runs while existing
          // handlers are still able to finish their receipts.
          const stopped = new Promise((resolve) => server.close(resolve));
          try { await runtime.close(); }
          finally { server.closeIdleConnections(); await stopped; }
        })();
        return closePromise;
      },
    };
  } catch (error) {
    if (server?.listening) await new Promise((resolve) => server.close(resolve));
    await runtime.close().catch(() => {});
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { runCli } = await import("./cli.mjs");
  await runCli(startServer);
}
