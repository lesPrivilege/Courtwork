import http from "node:http";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { fileURLToPath, pathToFileURL } from "node:url";

import { createRuntime } from "./runtime.mjs";
import { AsyncTaskError } from './async-task-state.mjs';
import { catalog } from "../extensions/catalog.mjs";
import { ServiceError } from "./service.mjs";

const MAX_BODY = 1024 * 1024;
const APP_ROOT = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const STATIC = new Map([
  ["/", { file: path.join(APP_ROOT, "web", "index.html"), type: "text/html; charset=utf-8" }],
  ["/index.html", { file: path.join(APP_ROOT, "web", "index.html"), type: "text/html; charset=utf-8" }],
  ["/web/app.mjs", { file: path.join(APP_ROOT, "web", "app.mjs"), type: "text/javascript; charset=utf-8" }],
  ["/web/markdown-reader.css", { file: path.join(APP_ROOT, "web", "markdown-reader.css"), type: "text/css; charset=utf-8" }],
  ["/web/surface-layout.css", { file: path.join(APP_ROOT, "web", "surface-layout.css"), type: "text/css; charset=utf-8" }],
  ["/web/styles.css", { file: path.join(APP_ROOT, "web", "styles.css"), type: "text/css; charset=utf-8" }],
  ["/extensions/evidence-memo/renderer.mjs", { file: path.join(APP_ROOT, "extensions", "evidence-memo", "renderer.mjs"), type: "text/javascript; charset=utf-8" }],
  ["/extensions/inbound-nda/renderer.mjs", { file: path.join(APP_ROOT, "extensions", "inbound-nda", "renderer.mjs"), type: "text/javascript; charset=utf-8", optional: true }],
]);

for (const name of ["agent-choice.mjs", "agent-chooser-view.mjs", "subagent-view.mjs", "draft-attachments.mjs", "chat-measurements.mjs", "run-activity.mjs", "chat-reading.mjs", "chat-sources.mjs", "work-review-summary.mjs", "execution-disclosure.mjs", "chat-actions.mjs", "semantic-controls.mjs", "product-semantics.generated.mjs", "skin-policy.js", "surface-modules.mjs", "preview-tabs.mjs", "workspace-view.mjs", "user-message.mjs", "composer-field.mjs", "ui-controls.mjs", "run-rows.mjs", "settings-view.mjs", "diff-view.mjs", "diff-fixture.mjs", "chat-page.mjs", "preview-layer.mjs", "runtime-view.mjs", "runtime-intake.mjs", "local-extension-view.mjs", "agent-profiles.mjs", "agent-profiles-view.mjs", "runtime-management.mjs", "runtime-management-view.mjs", "workspace-card.mjs", "home-preparation.mjs", "inspector.mjs", "markdown-source.mjs", "markdown-reader.mjs", "vendor/markdown-parser.mjs", "materials-view.mjs", "home-view.mjs", "attention-view.mjs", "attention-agent-view.mjs", "attention-conversation.mjs", "model-picker.mjs", "model-effort.mjs", "command-menu.mjs", "command-result.mjs", "home-greeting.mjs", "avatar-mark.mjs", "presentation-facts.mjs", "location-history.mjs", "object-commands.mjs", "object-menu.mjs", "telemetry-view.mjs", "usage-view.mjs", "usage-projection.mjs", "shell-layout.mjs", "presentation-adapters.mjs", "thread-projection.mjs", "coordination-view.mjs", "coordination-projection.mjs", "spark-view.mjs", "spark-projection.mjs", "vendor/floating.mjs", "vendor/marked.mjs", "vendor/purify.mjs"]) STATIC.set(`/web/${name}`, {file:path.join(APP_ROOT,"web",name),type:"text/javascript; charset=utf-8"});
STATIC.set("/web/vendor/icons.svg", {file:path.join(APP_ROOT,"web/vendor/icons.svg"),type:"image/svg+xml"});
STATIC.set("/web/vendor/icon-data.generated.mjs", {file:path.join(APP_ROOT,"web/vendor/icon-data.generated.mjs"),type:"text/javascript; charset=utf-8"});
STATIC.set("/web/provider-config.mjs", {file:path.join(APP_ROOT,"web/provider-config.mjs"),type:"text/javascript; charset=utf-8"});
// WO-SD-01 / SD-18: the five Spark sample scenarios are product assets now (moved from app/tests/fixtures via git mv, one file with two readers).
for (const name of ["stale", "quiet", "empty", "partial", "truncated"]) STATIC.set(`/web/samples/spark-derivations/${name}.json`, {file:path.join(APP_ROOT,"web","samples","spark-derivations",`${name}.json`),type:"application/json; charset=utf-8"});
for (const name of ["responses", "manifest"]) STATIC.set(`/web/samples/preview/${name}.json`, {file:path.join(APP_ROOT,"web","samples","preview",`${name}.json`),type:"application/json; charset=utf-8"});
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

const PUBLIC_CANDIDATE_FIELDS = ["id", "status", "revision", "sourceBindingId", "sourceBindingRevision", "baseCommit", "objectFormat", "writeRevision", "createdAt"];
function publicRuntimeProjection(value) {
  if (Array.isArray(value)) return value.map(publicRuntimeProjection);
  if (!value || typeof value !== "object" || Buffer.isBuffer(value)) return value;
  const projected = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "repositoryCandidate" || key === "repositoryCandidateSnapshot") {
      projected[key] = item === null ? null : Object.fromEntries(PUBLIC_CANDIDATE_FIELDS
        .filter(field => Object.hasOwn(item ?? {}, field)).map(field => [field, item[field]]));
    } else if (key === "repositoryWriteEffects") {
      // Session.repositoryWriteEffects carries `contentRef`, a Host-only
      // ArtifactHistory pointer (see server/store.mjs) that must never leave
      // the Host, same rule as the Host paths stripped from repositoryCandidate above.
      projected[key] = Array.isArray(item) ? item.map(effect => {
        const { contentRef, ...rest } = effect ?? {};
        return publicRuntimeProjection(rest);
      }) : item;
    } else projected[key] = publicRuntimeProjection(item);
  }
  return projected;
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
  if (error?.name === 'CoordinationError') return { status: error.status, code: error.code, message: error.message };
  if (error instanceof ServiceError) return { status: error.status, code: error.code, message: error.message, details: error.details };
  if (error instanceof AsyncTaskError) return { status: error.status, code: error.code, message: error.message };
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
  if (tail[0] === 'subagents') {
    const allowed=method==='GET'&&tail.length===1?['sessionId']:method==='GET'&&tail[2]==='result'?['revision']:method==='GET'&&tail[1]==='source-directory'?['sessionId','offset']:[];
    for(const key of url.searchParams.keys())if(!allowed.includes(key)||url.searchParams.getAll(key).length!==1)return ()=>{throw new ServiceError(400,'invalid_input','Unsupported or duplicate Spark query');};
    if(url.searchParams.has('revision')&&!/^[1-9][0-9]*$/.test(url.searchParams.get('revision')))return ()=>{throw new ServiceError(400,'invalid_input','Invalid result revision');};
    if (method === 'PUT' && tail.length === 2 && tail[1] === 'agent') return async () => ({schemaVersion:1,agent:await service.subagents.configure(await body(req))});
    if (method === 'GET' && tail.length === 2 && tail[1] === 'source-directory') return () => service.subagents.sourceDirectory(url.searchParams.get('sessionId'),{offset:url.searchParams.has('offset')?Number(url.searchParams.get('offset')):0});
    if (method === 'GET' && tail.length === 2 && tail[1] === 'mounts') return () => ({schemaVersion:1,mounts:service.store.snapshot().subagents.mounts});
    if (method === 'POST' && tail.length === 2 && tail[1] === 'mounts') return async () => ({schemaVersion:1,mount:await service.subagents.library.mount(await body(req))});
    if (method === 'POST' && tail.length === 4 && tail[1] === 'mounts' && tail[3] === 'revoke') return async () => ({schemaVersion:1,mount:await service.subagents.library.revoke(tail[2],await body(req))});
    if (method === 'GET' && tail.length === 1) return () => service.subagents.list(url.searchParams.get('sessionId'));
    if (method === 'POST' && tail.length === 1) return async () => { const assignment=await service.subagents.create(await body(req)); void service.subagents.pump().catch(error=>service.logger?.(`Spark queue: ${error.code??'unknown'}`)); return {schemaVersion:1,assignment}; };
    if (method === 'GET' && tail.length === 3 && tail[2] === 'result') return () => service.subagents.readResult(tail[1],url.searchParams.has('revision')?Number(url.searchParams.get('revision')):null);
    if (method === 'GET' && tail.length === 4 && tail[2] === 'notes') return () => service.subagents.readNote(tail[1],tail[3]);
    if (method === 'GET' && tail.length === 4 && tail[2] === 'sources') return () => {if(!/^(0|[1-9][0-9]*)$/.test(tail[3]))throw new ServiceError(400,'invalid_input','Invalid source index');return service.subagents.readSource(tail[1],Number(tail[3]));};
    if (method === 'POST' && tail.length === 3 && tail[2] === 'actions') return async () => ({schemaVersion:1,assignment:await service.subagents.action(tail[1],await body(req))});
  }
  if (tail[0] === 'coordination') {
    if (method === 'GET' && tail[1] === 'threads' && tail.length === 3) return () => service.coordination.readMailbox(tail[2],url.searchParams);
    if (url.searchParams.size) return () => { throw new ServiceError(400, 'invalid_input', 'Coordination queries use explicit paths'); };
    if (method === 'GET' && tail.length === 1) return () => service.coordination.list();
    if (method === 'GET' && tail.length === 3 && tail[1] === 'sessions') return () => service.coordination.list(tail[2]);
    if (method === 'POST' && tail.length === 2 && tail[1] === 'threads') return async () => ({schemaVersion:1,thread:await service.coordination.create(await body(req))});
    if (tail[1] === 'threads' && tail.length === 4 && method === 'POST' && ['attach','close'].includes(tail[3])) return async () => ({schemaVersion:1,thread:await service.coordination[tail[3]](tail[2],await body(req))});
    if (tail[1] === 'messages' && tail.length === 2 && method === 'POST') return async () => ({schemaVersion:1,message:await service.coordination.send(await body(req))});
  }
  if (tail[0] === 'async-tasks') {
    if (method === 'GET' && tail.length <= 2) return () => service.readAsyncTasks(tail[1] ?? null, url.searchParams);
    if (method === 'POST' && tail.length === 3 && ['reconcile','cancel'].includes(tail[2])) return async () => service.actOnAsyncTask(tail[1], tail[2], await body(req));
  }
  if (tail[0] === 'governance') {
    if (method === 'POST' && tail.length === 2 && tail[1] === 'query') return async () => service.queryGovernance(await body(req));
    if (method === 'POST' && tail.length === 4 && tail[1] === 'matters' && tail[3] === 'disclosure') return async () => service.setMatterDisclosure(tail[2], await body(req));
  }
  if (tail[0] === 'attention') {
    if (tail.length === 2 && tail[1] === 'conversations' && method === 'GET') return () => service.listAttentionConversations();
    if (tail.length === 2 && tail[1] === 'conversations' && method === 'POST') return async () => service.createAttentionConversation(await body(req));
    if (method === 'GET' && tail.length === 2) return () => service.readAttention(tail[1] === 'registry' ? null : tail[1],url.searchParams);
    if (method === 'POST' && tail.length === 1) return async () => service.actOnAttention(null,await body(req));
    if (method === 'POST' && tail.length === 2 && tail[1] === 'query') return async () => service.queryAttention(await body(req));
    if (method === 'POST' && tail.length === 3 && tail[2] === 'actions') return async () => service.actOnAttention(tail[1],await body(req));
  }
  if (method === "GET" && tail.length === 1 && tail[0] === "bootstrap") return service.bootstrap;
  if (method === "GET" && tail.length === 1 && tail[0] === "work-activity") return () => service.getWorkMetrics("activity", url.searchParams);
  if (method === "GET" && tail.length === 1 && tail[0] === "work-usage") return () => service.getWorkMetrics("usage", url.searchParams);
  if (method === "GET" && tail.length === 1 && tail[0] === "work-usage-details") return () => service.getWorkMetrics("details", url.searchParams);
  if (method === "POST" && tail.length === 1 && tail[0] === "work-usage-runs") return async () => service.getUsageRuns(await body(req));
  if (method === "GET" && tail.length === 1 && tail[0] === "work-derivations") return () => service.getWorkDerivations(url.searchParams);
  if (method === "GET" && tail.length === 1 && tail[0] === "work-summary") return () => service.getWorkSummary(url.searchParams);
  if (method === "GET" && tail.length === 3 && tail[0] === "projects" && tail[2] === "work") return () => service.listWork(tail[1]);
  if (method === "GET" && tail.length === 1 && tail[0] === "projects") return () => service.listProjects();
  if (method === "POST" && tail.length === 1 && tail[0] === "projects") return async () => service.createProject(await body(req));
  if (method === "GET" && tail.length === 1 && tail[0] === "sessions") return () => service.listSessions(url.searchParams.get("projectId") ?? undefined);
  if (method === "POST" && tail.length === 1 && tail[0] === "sessions") return async () => service.createSession(await body(req));
  if (tail.length === 2 && tail[0] === "sessions" && method === "PATCH") return async () => service.renameSession(tail[1], await body(req));
  if (tail.length === 2 && tail[0] === "sessions" && method === "DELETE") return () => service.deleteSession(tail[1]);
  if (tail.length === 2 && tail[0] === "sessions" && method === "GET") return () => service.getSession(tail[1]);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "events" && method === "GET") return () => service.getEvents(tail[1], url.searchParams.get("afterSeq") ?? 0);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "draft" && method === "PUT") return async () => service.updateDraft(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "permission-mode" && method === "PUT") return async () => service.setPermissionMode(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "repository-binding" && method === "GET") return () => service.getRepositoryBinding(tail[1]);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "repository-binding" && method === "PUT") return async () => service.changeRepositoryBinding(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "repository-candidate" && method === "GET") return () => service.getRepositoryCandidate(tail[1]);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "repository-candidate" && method === "PUT") return async () => service.changeRepositoryCandidate(tail[1], await body(req));
  if (tail.length === 4 && tail[0] === "sessions" && tail[2] === "repository-candidate" && tail[3] === "diff" && method === "GET") return () => service.getRepositoryCandidateDiff(tail[1]);
  if (tail.length === 4 && tail[0] === "sessions" && tail[2] === "repository-candidate" && tail[3] === "effects" && method === "GET") return () => service.getRepositoryCandidateEffects(tail[1]);
  if (tail.length === 2 && tail[0] === "host" && tail[1] === "choose-directory" && method === "POST") return async () => service.chooseHostDirectory(await body(req));
  if (tail.length === 2 && tail[0] === "repositories" && tail[1] === "recent" && method === "GET") return () => service.getRecentRepositories();
  if (tail.length === 2 && tail[0] === "repositories" && tail[1] === "inspect" && method === "GET") return () => service.getRepositoryInspection(url.searchParams.get("rootPath"));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "materials" && method === "GET") return () => service.listMaterials(tail[1], url.searchParams);
  if (tail.length === 4 && tail[0] === "sessions" && tail[2] === "materials" && tail[3] === "compare" && method === "GET") return () => service.compareMaterials(tail[1], url.searchParams);
  if (tail.length === 4 && tail[0] === "sessions" && tail[2] === "materials" && tail[3] === "file" && method === "GET") return () => service.getMaterialFile(tail[1], url.searchParams);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "materials" && method === "POST") return async () => service.addMaterial(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "workspace" && method === "GET") return () => service.getWorkspaceTree(tail[1]);
  if (tail.length === 4 && tail[0] === "sessions" && tail[2] === "workspace" && tail[3] === "file" && method === "GET") return () => service.getWorkspaceFile(tail[1], url.searchParams.get("path") ?? "");
  if (tail.length === 4 && tail[0] === "sessions" && tail[2] === "artifacts" && tail[3] === "file" && method === "GET") return () => service.getArtifactFile(tail[1], url.searchParams);
  if (tail.length === 4 && tail[0] === "sessions" && tail[2] === "mcp-results" && method === "GET") return () => service.getMcpResult(tail[1], tail[3], url.searchParams);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "runs" && method === "POST") return async () => service.createRun(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "extension" && method === "POST") return async () => service.createExtensionBinding(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "work-query" && method === "GET") return () => service.queryWork(tail[1], url.searchParams);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "surface" && method === "GET") return () => service.getSurface(tail[1]);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "review-summary" && method === "GET") return () => service.getReviewSummary(tail[1]);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "actions" && method === "POST") return async () => service.humanAction(tail[1], await body(req));
  if (tail.length === 2 && tail[0] === "runs" && method === "GET") return () => service.getRun(tail[1]);
  if (tail.length === 3 && tail[0] === "runs" && tail[2] === "cancel" && method === "POST") return async () => service.cancelRun(tail[1], await body(req));
  if (tail.length === 4 && tail[0] === "runs" && tail[2] === "questions" && method === "POST") return async () => service.answerQuestion(tail[1], tail[3], await body(req));
  if (tail.length === 1 && tail[0] === "runtime-resources" && method === "GET") return () => service.listRuntimeResources(url.searchParams.get("sessionId"), url.searchParams.get("kind"));
  if (tail.length === 3 && tail[0] === "runtime-resources" && tail[2] === "invoke" && method === "POST") return async () => service.invokeRuntimePrompt(url.searchParams.get("sessionId"), tail[1], await body(req));
  if (tail.length === 1 && tail[0] === "runtime-context" && method === "GET") return () => service.getRuntimeContext(url.searchParams.get("sessionId"), url.searchParams.get("runId"));
  if (tail.length === 2 && tail[0] === "runtime-permissions" && tail[1] === "evaluate" && method === "POST") return async () => service.evaluateRuntimePermission(url.searchParams.get("sessionId"), await body(req));
  if (tail.length === 3 && tail[0] === "mcp" && tail[2] === "lifecycle" && method === "POST") return async () => service.mcpLifecycle(url.searchParams.get("sessionId"), tail[1], await body(req));
  if (tail.length === 1 && tail[0] === "profile" && method === "GET") return () => service.getProfile();
  if (tail.length === 1 && tail[0] === "profile" && method === "PUT") return async () => service.saveProfile(await body(req));
  if (tail.length === 1 && tail[0] === "account" && method === "GET") return () => service.getAccount();
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "presentations" && method === "GET") return () => service.listPresentations(tail[1]);
  if (tail.length === 4 && tail[0] === "sessions" && tail[2] === "presentations" && method === "GET") return () => service.getPresentation(tail[1], tail[3]);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "commands" && method === "GET") return () => service.listCommands(tail[1]);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "commands" && method === "POST") return async () => service.dispatchText(tail[1], await body(req));
  if (tail.length === 4 && tail[0] === "sessions" && tail[2] === "commands" && method === "POST") return async () => service.dispatchCommand(tail[1], tail[3], await body(req));
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "compactions" && method === "GET") return () => service.listCompactions(tail[1]);
  if (tail.length === 3 && tail[0] === "sessions" && tail[2] === "compactions" && method === "POST") return async () => service.compactSession(tail[1], await body(req));
  if (tail.length === 4 && tail[0] === "sessions" && tail[2] === "compactions" && method === "GET") return () => service.getCompaction(tail[1], tail[3]);
  if (tail.length === 5 && tail[0] === "sessions" && tail[2] === "compactions" && tail[4] === "cancel" && method === "POST") return () => service.cancelCompaction(tail[1], tail[3]);
  if (tail.length === 1 && tail[0] === "runtime-proposals" && method === "GET") return () => service.listRuntimeProposals(url.searchParams.get("sessionId"));
  if (tail.length === 2 && tail[0] === "runtime-proposals" && method === "GET") return () => service.getRuntimeProposal(tail[1]);
  if (tail.length === 2 && tail[0] === "runtime-proposals" && method === "PUT") return async () => service.editRuntimeProposal(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "runtime-proposals" && tail[2] === "reject" && method === "POST") return async () => service.rejectRuntimeProposal(tail[1], await body(req));
  if (tail.length === 3 && tail[0] === "runtime-proposals" && tail[2] === "apply" && method === "POST") return async () => service.applyRuntimeProposal(tail[1], await body(req));
  if (tail.length === 1 && tail[0] === "runtime-control" && method === "GET") return () => service.getRuntimeControl(url.searchParams.get("sessionId"));
  if (tail.length === 1 && tail[0] === "runtime-control" && method === "PUT") return async () => service.changeRuntimeControl(url.searchParams.get("sessionId"), await body(req));
  if (tail.length === 2 && tail[0] === "runtime-resources" && method === "GET") return () => service.getRuntimeResource(url.searchParams.get("sessionId"), tail[1]);
  if (method === "GET" && tail.length === 1 && tail[0] === "runtime-info") return () => service.getRuntimeInfo();
  if (method === "POST" && tail.length === 2 && tail[0] === "runtime-sources" && tail[1] === "resolve") return async () => service.resolveRuntimeSource(await body(req));
  if (method === "POST" && tail.length === 2 && tail[0] === "provider-models" && tail[1] === "discover") return async () => service.previewProvider(await body(req), 'discover');
  if (method === "POST" && tail.length === 2 && tail[0] === "provider-connection" && tail[1] === "test") return async () => service.previewProvider(await body(req), 'test');
  if (method === "GET" && tail.length === 1 && tail[0] === "provider-models") return () => service.getProviderModels();
  if (method === "GET" && tail.length === 1 && tail[0] === "provider-connections") return () => service.getProviderConnections();
  if (method === "POST" && tail.length === 1 && tail[0] === "provider-connections") return async () => service.createProviderConnection(await body(req));
  if (method === "PUT" && tail.length === 2 && tail[0] === "provider-connections") return async () => service.replaceProviderConnection(tail[1], await body(req));
  if (method === "DELETE" && tail.length === 2 && tail[0] === "provider-connections") return () => service.deleteProviderConnection(tail[1]);
  if (method === "POST" && tail.length === 3 && tail[0] === "provider-connections" && tail[2] === "verify") return async () => service.verifyProviderConnection(tail[1], await body(req));
  if (method === "GET" && tail.length === 1 && tail[0] === "provider-config") return () => service.getProviderConfig();
  if (method === "PUT" && tail.length === 1 && tail[0] === "provider-config") return async () => service.setProviderConfig(await body(req));
  if (method === "PUT" && tail.length === 1 && tail[0] === "provider-credential") return async () => service.putProviderCredential(await body(req));
  if (method === "DELETE" && tail.length === 1 && tail[0] === "provider-credential") return async () => service.deleteProviderCredential(await body(req));
  if (method === "POST" && tail.length === 2 && tail[0] === "extensions" && tail[1] === "preview-local") return async () => service.previewLocalExtension(await body(req));
  if (method === "POST" && tail.length === 2 && tail[0] === "extensions" && tail[1] === "register-local") return async () => service.registerLocalExtension(await body(req));
  if (method === "GET" && tail.length === 1 && tail[0] === "extensions") return () => service.listExtensions();
  if (method === "POST" && tail.length === 3 && tail[0] === "extensions" && tail[2] === "lifecycle") return async () => service.extensionLifecycle(tail[1], await body(req));
  return undefined;
}

export async function startServer({ dataDir, host = "127.0.0.1", port = 0, extensionCatalog = catalog, fakeResponder = null, responder = null, budget, compaction, asyncTaskAdapters = [], runtimePort, localPiWorker = false, logger = (line) => console.log(line) } = {}) {
  const runtime = await createRuntime({ dataDir, extensionCatalog, fakeResponder, responder, budget, compaction, asyncTaskAdapters, runtimePort, localPiWorker, logger });
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
          json(res, 200, publicRuntimeProjection(await result));
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
