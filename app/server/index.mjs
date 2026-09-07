import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createFakeOpenAiProvider } from "../runtime/fake-provider.mjs";
import { createIsolatedModelRuntime } from "../runtime/pi-session-runtime.mjs";
import { describeTestHooks } from "../runtime/test-hooks.mjs";
import { ExtensionRegistry } from "../runtime/extension-registry.mjs";
import { catalog } from "../extensions/catalog.mjs";
import { RuntimeStore, TERMINAL_STATUSES } from "./store.mjs";
import { RuntimeService, ServiceError } from "./service.mjs";

const MAX_BODY = 1024 * 1024;
const APP_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const STATIC = new Map([
  ["/", { file: path.join(APP_ROOT, "web", "index.html"), type: "text/html; charset=utf-8" }],
  ["/index.html", { file: path.join(APP_ROOT, "web", "index.html"), type: "text/html; charset=utf-8" }],
  ["/web/app.mjs", { file: path.join(APP_ROOT, "web", "app.mjs"), type: "text/javascript; charset=utf-8" }],
  ["/web/styles.css", { file: path.join(APP_ROOT, "web", "styles.css"), type: "text/css; charset=utf-8" }],
  ["/extensions/evidence-memo/renderer.mjs", { file: path.join(APP_ROOT, "extensions", "evidence-memo", "renderer.mjs"), type: "text/javascript; charset=utf-8" }],
]);

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
  if (method === "GET" && tail.length === 1 && tail[0] === "projects") return () => service.listProjects();
  if (method === "POST" && tail.length === 1 && tail[0] === "projects") return async () => service.createProject(await body(req));
  if (method === "GET" && tail.length === 1 && tail[0] === "sessions") return () => service.listSessions(url.searchParams.get("projectId") ?? undefined);
  if (method === "POST" && tail.length === 1 && tail[0] === "sessions") return async () => service.createSession(await body(req));
  if (tail.length === 2 && tail[0] === "sessions" && method === "GET") return () => service.getSession(tail[1]);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "events" && method === "GET") return () => service.getEvents(tail[1], url.searchParams.get("afterSeq") ?? 0);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "draft" && method === "PUT") return async () => service.updateDraft(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "permission-mode" && method === "PUT") return async () => service.setPermissionMode(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "materials" && method === "POST") return async () => service.addMaterial(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "workspace" && method === "GET") return () => service.getWorkspaceTree(tail[1]);
  if (tail.length === 4 && tail[0] === "sessions" && tail[2] === "workspace" && tail[3] === "file" && method === "GET") return () => service.getWorkspaceFile(tail[1], url.searchParams.get("path") ?? "");
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "runs" && method === "POST") return async () => service.createRun(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "extension" && method === "POST") return async () => service.createExtensionBinding(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "surface" && method === "GET") return () => service.getSurface(tail[1]);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "actions" && method === "POST") return async () => service.humanAction(tail[1], await body(req));
  if (tail.length === 2 && tail[0] === "runs" && method === "GET") return () => service.getRun(tail[1]);
  if (tail.length === 3 && tail[0] === "runs" && tail[2] === "cancel" && method === "POST") return async () => service.cancelRun(tail[1], await body(req));
  if (tail.length === 4 && tail[0] === "runs" && tail[2] === "questions" && method === "POST") return async () => service.answerQuestion(tail[1], tail[3], await body(req));
  if (method === "GET" && tail.length === 1 && tail[0] === "provider-config") return () => service.getProviderConfig();
  if (method === "PUT" && tail.length === 1 && tail[0] === "provider-config") return async () => service.setProviderConfig(await body(req));
  if (method === "PUT" && tail.length === 1 && tail[0] === "provider-credential") return async () => service.putProviderCredential(await body(req));
  if (method === "DELETE" && tail.length === 1 && tail[0] === "provider-credential") return async () => service.deleteProviderCredential(await body(req));
  if (method === "GET" && tail.length === 1 && tail[0] === "extensions") return () => service.listExtensions();
  if (method === "POST" && tail.length === 3 && tail[0] === "extensions" && tail[2] === "lifecycle") return async () => service.extensionLifecycle(tail[1], await body(req));
  return undefined;
}

/**
 * If the host process inherited DEEPSEEK_API_KEY from its environment,
 * remove it before any ModelRuntime/provider code can consult it, so the
 * provider's own env-var auth fallback (a pi-ai behavior this host does not
 * control) never silently activates. Logged once, key value never logged.
 */
function stripInheritedProviderEnv(logger) {
  const removed = [];
  for (const name of ["DEEPSEEK_API_KEY"]) {
    if (process.env[name] !== undefined) {
      delete process.env[name];
      removed.push(name);
    }
  }
  if (removed.length) logger(`startup: removed inherited env var(s) so provider auth cannot fall back to them: ${removed.join(", ")}`);
  return removed;
}

export async function startServer({ dataDir, host = "127.0.0.1", port = 0, fakeResponder = null, responder = null, budget, logger = (line) => console.log(line) } = {}) {
  if (!dataDir) throw new TypeError("dataDir is required");
  const removedEnvVars = stripInheritedProviderEnv(logger);
  // A build that can kill itself on purpose says so before it does anything.
  for (const line of describeTestHooks()) logger(line);
  const store = await new RuntimeStore({ dataDir, logger }).open();
  let fakeProvider;
  let registry;
  let server;
  try {
    fakeProvider = await createFakeOpenAiProvider({ host, port: 0, responder, fakeResponder });
    const modelRuntime = await createIsolatedModelRuntime();
    registry = new ExtensionRegistry({ catalog, dataDir, store });
    await registry.initialize();
    const service = new RuntimeService({ store, fakeProvider, extensionRegistry: registry, dataDir, modelRuntime, budget, logger });
    await service.initialize();
    const token = randomUUID();
    server = http.createServer(async (req, res) => {
      try {
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
          const data = await readFile(file.file);
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
      server, service, store, registry, fakeProvider, modelRuntime, token, removedEnvVars,
      url: "http://" + host + ":" + actualPort,
      async close() {
        for (const run of store.listRuns()) {
          if (!TERMINAL_STATUSES.has(run.status)) await service.cancelRun(run.id, {});
        }
        await new Promise((resolve) => server.close(() => resolve()));
        await registry.dispose().catch(() => {});
        await fakeProvider.close().catch(() => {});
        await store.close();
      },
    };
  } catch (error) {
    if (server) await new Promise((resolve) => server.close(() => resolve())).catch(() => {});
    if (fakeProvider) await fakeProvider.close().catch(() => {});
    await store.close().catch(() => {});
    throw error;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const dataDir = process.env.SE_RUNTIME_DATA_DIR ?? path.resolve("data");
  const started = await startServer({ dataDir, port: Number(process.env.PORT ?? 8787) });
  console.log(started.url);
}
