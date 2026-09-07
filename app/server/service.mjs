import { mkdir, writeFile, rename, stat, open as openFile } from "node:fs/promises";
import path from "node:path";
import { randomUUID, createHash } from "node:crypto";
import { StringDecoder } from "node:string_decoder";
import { SessionManager } from "@earendil-works/pi-coding-agent";

import {
  classifyRuntimeError,
  mapSessionEvent,
  registerFakeProvider,
  startSessionRun,
  FAKE_API_ID,
  FAKE_MODEL_ID,
  FAKE_PROVIDER_ID,
  FAKE_CREDENTIAL_KEY,
  DEEPSEEK_PROVIDER_ID,
} from "../runtime/pi-session-runtime.mjs";
import { createAskUserTool, createWorkspaceTools, resolveWorkspacePath, listWorkspaceTree, sha256OfFile, MAX_READ_BYTES } from "../runtime/workspace-tools.mjs";
import { ACTIVE_STATUSES, PERMISSION_MODES } from "./store.mjs";
import { readCredentialFile, setCredential, deleteCredential } from "./credential-file.mjs";

const DEEPSEEK_API_ID = "openai-completions";
const ALLOWED_PROVIDER_IDS = new Set([FAKE_PROVIDER_ID, DEEPSEEK_PROVIDER_ID]);
const MAX_MATERIAL_BYTES = 1024 * 1024;
const MATERIAL_NAME_PATTERN = /^[A-Za-z0-9._-]+$/;

export class ServiceError extends Error {
  /** `details` carries the machine-readable facts a client needs to recover
   * from this specific error (currently the server's current `nextSeq` on a
   * cursor_ahead), and is merged into the error body by the HTTP layer. */
  constructor(status, code, message, details = null) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

function safeMessage(error, fallback = "request failed") {
  return error instanceof ServiceError ? error.message : fallback;
}

function requireObject(value, label) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new ServiceError(400, "invalid_json", `${label} must be an object`);
  return value;
}

function assertKeys(value, allowed) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length) throw new ServiceError(400, "unknown_field", "request contains an unknown field");
}

function text(value, label, { max = 100000, allowEmpty = false } = {}) {
  if (typeof value !== "string" || (!allowEmpty && value.trim() === "") || value.length > max) {
    throw new ServiceError(400, "invalid_input", `${label} is invalid`);
  }
  return value;
}

function publicProviderConfig(config) {
  return structuredClone(config);
}

function validateProviderDescriptor(value) {
  const input = requireObject(value, "provider");
  assertKeys(input, new Set(["provider", "model", "api", "baseUrl"]));
  const result = {
    provider: text(input.provider, "provider", { max: 120 }),
    model: text(input.model, "model", { max: 240 }),
    api: text(input.api, "api", { max: 120 }),
  };
  if (input.baseUrl !== undefined) {
    const baseUrl = text(input.baseUrl, "baseUrl", { max: 2048 });
    let parsed;
    try {
      parsed = new URL(baseUrl);
    } catch {
      throw new ServiceError(400, "invalid_provider", "baseUrl is invalid");
    }
    if (!['http:', 'https:'].includes(parsed.protocol) || parsed.username || parsed.password || parsed.search || parsed.hash) {
      throw new ServiceError(400, "invalid_provider", "baseUrl is not an allowed endpoint");
    }
    result.baseUrl = baseUrl.replace(/\/$/, "");
  }
  if (!ALLOWED_PROVIDER_IDS.has(result.provider)) {
    throw new ServiceError(400, "invalid_provider", "provider is not one of the allowed providers");
  }
  return result;
}

function bindingSnapshot(record) {
  return { id: record.id, version: record.version, generation: record.generation };
}

function terminal(status) {
  return ["completed", "cancelled", "failed", "unknown"].includes(status);
}

const DEFAULT_BUDGET = Object.freeze({ maxTurns: 40, deadlineMs: 600_000 });

/** Redact anything resembling a live secret from text bound for storage, an
 * event, or an error message. Defense-in-depth on top of never reading keys
 * back from any endpoint. */
function redact(message, secrets) {
  let result = String(message ?? "");
  for (const secret of secrets) {
    if (secret && secret.length >= 6) result = result.split(secret).join("[redacted]");
  }
  return result;
}

export class RuntimeService {
  constructor({ store, fakeProvider, extensionRegistry, dataDir, modelRuntime, adapterId = "pi-coding-agent@0.85.1/agent-session", budget = {}, logger = () => {} }) {
    this.store = store;
    this.fakeProvider = fakeProvider;
    this.extensionRegistry = extensionRegistry;
    this.dataDir = dataDir;
    this.modelRuntime = modelRuntime;
    this.adapterId = adapterId;
    this.logger = logger;
    this.active = new Map();
    this.questionWaiters = new Map();
    this.providerConfig = null;
    this.credentialsConfigured = new Set();
    this.knownSecrets = new Set();
    this.budget = {
      maxTurns: Number.isSafeInteger(budget.maxTurns) && budget.maxTurns > 0 ? budget.maxTurns : DEFAULT_BUDGET.maxTurns,
      deadlineMs: Number.isFinite(budget.deadlineMs) && budget.deadlineMs > 0 ? budget.deadlineMs : DEFAULT_BUDGET.deadlineMs,
    };
    registerFakeProvider(this.modelRuntime, this.fakeProvider);
  }

  get credentialGeneration() {
    return this.store.getCredentialGeneration();
  }

  async initialize() {
    const stored = this.store.getProviderConfig();
    this.providerConfig = stored ?? { provider: FAKE_PROVIDER_ID, model: FAKE_MODEL_ID, api: FAKE_API_ID };
    if (!stored) await this.store.setProviderConfig(this.providerConfig);

    const credentials = await readCredentialFile(this.dataDir);
    for (const [provider, apiKey] of Object.entries(credentials)) {
      if (!ALLOWED_PROVIDER_IDS.has(provider)) continue;
      this.knownSecrets.add(apiKey);
      await this.modelRuntime.setRuntimeApiKey(provider, apiKey);
      this.credentialsConfigured.add(provider);
    }

    // A process restart cannot resume an in-flight AgentSession or question;
    // every non-terminal run becomes unknown, and every pending question
    // (across all runs) is marked expired_restart so nothing is stuck
    // permanently unanswerable.
    const interrupted = [];
    for (const run of this.store.listRuns()) {
      if (ACTIVE_STATUSES.has(run.status)) {
        await this.store.updateRunWithEvent(run.id, { status: "unknown", admissionOpen: false, error: { code: "restart_unknown", message: "run was in flight during restart" } }, {
          type: "run.status",
          data: { status: "unknown" },
        });
        interrupted.push(run.id);
      }
    }
    await this.store.expireQuestionsForRestart();
    await this.#reconcileInterruptedWorkspaces(interrupted);
    return this;
  }

  /**
   * One reconciliation pass over the workspaces of runs this restart just
   * marked `unknown`.
   *
   * A crash can land between `ws_write`'s rename and the artifact record: the
   * bytes are on disk, the content-version record is not. The store cannot
   * know that happened, but the workspace can be compared against what the
   * store recorded. Every file that is not accounted for by some recorded
   * content version is reported once, as a `run.notice` of kind
   * `unrecorded_files`.
   *
   * What this deliberately does NOT do: back-fill the artifact record, and
   * rewrite or delete the file. An artifact record means "a tool wrote these
   * bytes and the service witnessed it"; manufacturing one at startup from a
   * file the service never saw written would forge exactly the evidence a
   * Review step is supposed to rely on. The notice hands the discrepancy to a
   * human instead.
   *
   * `materials/` is excluded: those files come from the materials endpoint,
   * which never produces artifacts, so they are not evidence of anything lost.
   */
  async #reconcileInterruptedWorkspaces(runIds) {
    const sessionIds = new Set();
    for (const runId of runIds) {
      const run = this.store.getRun(runId);
      if (run) sessionIds.add(run.sessionId);
    }
    for (const sessionId of sessionIds) {
      const session = this.store.getSession(sessionId);
      if (!session) continue;
      let tree;
      try {
        tree = await listWorkspaceTree(session.workspaceDir);
      } catch {
        continue;
      }
      const recorded = new Set();
      for (const run of this.store.listRuns(sessionId)) {
        for (const artifact of run.artifacts) recorded.add(artifact.path + "\u0000" + artifact.sha256);
      }
      const unrecorded = tree
        .filter((file) => !file.path.startsWith("materials/"))
        .filter((file) => !recorded.has(file.path + "\u0000" + file.sha256))
        .map((file) => ({ path: file.path, sha256: file.sha256 }));
      this.logger(`startup: reconciled workspace of session ${sessionId} after an interrupted run; ${unrecorded.length} file(s) are not covered by a recorded content version`);
      if (!unrecorded.length) continue;
      for (const runId of runIds) {
        if (this.store.getRun(runId)?.sessionId !== sessionId) continue;
        await this.#appendNotice(runId, { kind: "unrecorded_files", files: unrecorded });
      }
    }
  }

  bootstrap(sessionToken) {
    const realProvider = this.providerConfig.provider !== FAKE_PROVIDER_ID;
    return {
      apiVersion: "v5",
      sessionToken,
      capabilities: { realProvider, mode: realProvider ? "real" : "local-fake", externalBrowser: false },
      adapterId: this.adapterId,
    };
  }

  listProjects() {
    return { projects: this.store.listProjects() };
  }

  async createProject(input) {
    const value = requireObject(input, "body");
    assertKeys(value, new Set(["name"]));
    return { project: await this.store.createProject(text(value.name, "name", { max: 200 })) };
  }

  getWorkSummary(params = new URLSearchParams()) {
    const allowed = new Set(["projectId", "limit", "sessionsOffset", "pendingOffset", "inspectionOffset"]);
    const options = {};
    for (const key of params.keys()) {
      if (!allowed.has(key) || params.getAll(key).length !== 1) throw new ServiceError(400, "invalid_input", "invalid summary query");
      const value = params.get(key);
      if (key === "projectId") options[key] = text(value, key, { max: 200 });
      else {
        if (!/^(0|[1-9][0-9]*)$/.test(value) || !Number.isSafeInteger(Number(value))) throw new ServiceError(400, "invalid_input", "invalid summary pagination");
        options[key] = Number(value);
        if (key === "limit" && (options[key] < 1 || options[key] > 100)) throw new ServiceError(400, "invalid_input", "summary limit must be between 1 and 100");
      }
    }
    // Waiter membership is sampled in the same synchronous turn as store facts.
    // A persisted pending record without a live answer receiver is not actionable.
    return this.store.getWorkSummary(options, new Set(this.questionWaiters.keys()));
  }

  listSessions(projectId) {
    if (projectId !== undefined) text(projectId, "projectId", { max: 100 });
    return { sessions: this.store.listSessions(projectId) };
  }

  async createSession(input) {
    const value = requireObject(input, "body");
    assertKeys(value, new Set(["projectId", "title", "permissionMode"]));
    const permissionMode = value.permissionMode === undefined ? "draft" : text(value.permissionMode, "permissionMode", { max: 20 });
    if (!PERMISSION_MODES.has(permissionMode)) throw new ServiceError(400, "invalid_input", "permissionMode is invalid");
    const sessionId = randomUUID();
    const workspaceDir = path.join(this.dataDir, "workspaces", sessionId);
    await mkdir(path.join(workspaceDir, "materials"), { recursive: true });
    await mkdir(path.join(workspaceDir, "out"), { recursive: true });
    return {
      session: await this.store.createSession({
        id: sessionId,
        projectId: text(value.projectId, "projectId", { max: 100 }),
        title: value.title === undefined ? "New session" : text(value.title, "title", { max: 200 }),
        workspaceDir,
        permissionMode,
      }),
    };
  }

  async getSession(id) {
    const session = this.store.getSession(id);
    if (!session) throw new ServiceError(404, "not_found", "session not found");
    // lastSeq is the seq of the newest event in this snapshot. A client
    // resumes with GET events?afterSeq=lastSeq: everything at or below it is
    // already in `events`, everything above it is still to come, so the
    // snapshot/stream boundary has no gap and no overlap.
    const events = this.store.listEvents({ sessionId: id });
    return { session, events, runs: this.store.listRuns(id), lastSeq: this.store.getSessionLastSeq(id) };
  }

  async updateDraft(id, input) {
    const value = requireObject(input, "body");
    assertKeys(value, new Set(["text"]));
    return { saved: true, session: await this.store.setDraft(id, text(value.text, "text", { max: 100000, allowEmpty: true })) };
  }

  async setPermissionMode(id, input) {
    const value = requireObject(input, "body");
    assertKeys(value, new Set(["permissionMode"]));
    const permissionMode = text(value.permissionMode, "permissionMode", { max: 20 });
    if (!PERMISSION_MODES.has(permissionMode)) throw new ServiceError(400, "invalid_input", "permissionMode is invalid");
    try {
      return { session: await this.store.setPermissionMode(id, permissionMode) };
    } catch (error) {
      if (error?.message === "active run exists") throw new ServiceError(409, "active_run", "permission mode is frozen during a run");
      throw error;
    }
  }

  async addMaterial(sessionId, input) {
    const session = this.store.getSession(sessionId);
    if (!session) throw new ServiceError(404, "not_found", "session not found");
    const value = requireObject(input, "body");
    assertKeys(value, new Set(["name", "text"]));
    const name = text(value.name, "name", { max: 200 });
    if (!MATERIAL_NAME_PATTERN.test(name)) throw new ServiceError(400, "invalid_input", "name must match [A-Za-z0-9._-]+");
    const content = text(value.text, "text", { max: MAX_MATERIAL_BYTES, allowEmpty: true });
    const bytes = Buffer.byteLength(content, "utf8");
    if (bytes > MAX_MATERIAL_BYTES) throw new ServiceError(400, "invalid_input", "material exceeds the 1 MiB limit");
    await mkdir(path.join(session.workspaceDir, "materials"), { recursive: true });
    // The name regex is the first filter; the shared workspace guard is the
    // one that decides the target, so this endpoint cannot write anywhere the
    // ws_* tools could not.
    const relative = `materials/${name}`;
    let resolved;
    try {
      resolved = await resolveWorkspacePath(session.workspaceDir, relative);
    } catch (error) {
      throw new ServiceError(400, "invalid_input", error.message);
    }
    if (resolved.relativePath !== relative) throw new ServiceError(400, "invalid_input", "name is invalid");
    const tempPath = resolved.absolutePath + "." + randomUUID() + ".tmp";
    await writeFile(tempPath, content, "utf8");
    await rename(tempPath, resolved.absolutePath);
    const sha256 = createHash("sha256").update(content, "utf8").digest("hex");
    return { path: resolved.relativePath, bytes, sha256 };
  }

  async getWorkspaceTree(sessionId) {
    const session = this.store.getSession(sessionId);
    if (!session) throw new ServiceError(404, "not_found", "session not found");
    return { tree: await listWorkspaceTree(session.workspaceDir) };
  }

  async getWorkspaceFile(sessionId, relPath) {
    const session = this.store.getSession(sessionId);
    if (!session) throw new ServiceError(404, "not_found", "session not found");
    if (!relPath) throw new ServiceError(400, "invalid_input", "path is required");
    let resolved;
    try {
      resolved = await resolveWorkspacePath(session.workspaceDir, relPath);
    } catch (error) {
      throw new ServiceError(400, "invalid_input", error.message);
    }
    let info;
    try {
      info = await stat(resolved.absolutePath);
    } catch {
      throw new ServiceError(404, "not_found", "file does not exist");
    }
    if (!info.isFile()) throw new ServiceError(400, "invalid_input", "path is not a file");
    const truncated = info.size > MAX_READ_BYTES;
    const handle = await openFile(resolved.absolutePath, "r");
    let buffer;
    try {
      buffer = Buffer.alloc(Math.min(info.size, MAX_READ_BYTES));
      await handle.read(buffer, 0, buffer.length, 0);
    } finally {
      await handle.close();
    }
    // Truncation cuts at a UTF-8 character boundary, not a byte boundary:
    // StringDecoder holds back the trailing bytes of an incomplete sequence
    // instead of turning them into U+FFFD, so a cut file never ends in a
    // mangled character. `bytes` and `sha256` describe the WHOLE file, so the
    // digest stays honest about content the text field does not carry.
    const decoder = new StringDecoder("utf8");
    const text = decoder.write(buffer);
    const sha256 = await sha256OfFile(resolved.absolutePath);
    return { path: resolved.relativePath, kind: "current", text, bytes: info.size, sha256, truncated };
  }

  getProviderConfig() {
    const realProvider = this.providerConfig.provider !== FAKE_PROVIDER_ID;
    return {
      config: publicProviderConfig(this.providerConfig),
      execution: { mode: realProvider ? "real" : "local-fake", realProvider, adapterId: this.adapterId },
      credentialStatus: this.credentialsConfigured.has(this.providerConfig.provider) ? "configured" : "not_configured",
    };
  }

  async setProviderConfig(input) {
    if (this.store.hasActiveRun()) throw new ServiceError(409, "active_run", "provider config is frozen during a run");
    const config = validateProviderDescriptor(input);
    if (config.provider === DEEPSEEK_PROVIDER_ID) {
      if (config.api !== DEEPSEEK_API_ID) throw new ServiceError(400, "invalid_provider", "deepseek requires api openai-completions");
      if (!this.modelRuntime.getModel(DEEPSEEK_PROVIDER_ID, config.model)) {
        throw new ServiceError(400, "invalid_provider", "unknown deepseek model");
      }
    }
    this.providerConfig = config;
    await this.store.setProviderConfig(config);
    return this.getProviderConfig();
  }

  async putProviderCredential(input) {
    if (this.store.hasActiveRun()) throw new ServiceError(409, "active_run", "credentials are frozen during a run");
    const value = requireObject(input, "body");
    assertKeys(value, new Set(["provider", "apiKey"]));
    const provider = text(value.provider, "provider", { max: 120 });
    if (!ALLOWED_PROVIDER_IDS.has(provider)) throw new ServiceError(400, "invalid_provider", "provider is not one of the allowed providers");
    const apiKey = text(value.apiKey, "apiKey", { max: 4000 });
    await setCredential(this.dataDir, provider, apiKey);
    this.knownSecrets.add(apiKey);
    await this.modelRuntime.setRuntimeApiKey(provider, apiKey);
    this.credentialsConfigured.add(provider);
    await this.store.bumpCredentialGeneration();
    return { configured: true, provider };
  }

  async deleteProviderCredential(input) {
    if (this.store.hasActiveRun()) throw new ServiceError(409, "active_run", "credentials are frozen during a run");
    const value = requireObject(input, "body");
    assertKeys(value, new Set(["provider"]));
    const provider = text(value.provider, "provider", { max: 120 });
    if (!ALLOWED_PROVIDER_IDS.has(provider)) throw new ServiceError(400, "invalid_provider", "provider is not one of the allowed providers");
    await deleteCredential(this.dataDir, provider);
    await this.modelRuntime.removeRuntimeApiKey(provider);
    this.credentialsConfigured.delete(provider);
    await this.store.bumpCredentialGeneration();
    return { configured: false, provider };
  }

  async createExtensionBinding(sessionId, input) {
    if (this.store.hasActiveRun()) throw new ServiceError(409, "active_run", "extension binding is frozen during a run");
    const value = requireObject(input, "body");
    assertKeys(value, new Set(["extensionId", "input"]));
    const extensionId = text(value.extensionId, "extensionId", { max: 120 });
    requireObject(value.input, "input");
    const session = this.store.getSession(sessionId);
    if (!session) throw new ServiceError(404, "not_found", "session not found");
    if (session.extensionBinding) throw new ServiceError(409, "binding_exists", "session already has an extension binding");
    const record = this.extensionRegistry.getRecord(extensionId);
    if (!record || record.status !== "loaded") throw new ServiceError(409, "extension_unloaded", "extension is not loaded");
    const binding = await this.extensionRegistry.createBinding({ extensionId, input: value.input });
    return { session: await this.store.bindExtension(sessionId, { extensionId, binding }) };
  }

  listExtensions() {
    return { extensions: this.extensionRegistry.list() };
  }

  async extensionLifecycle(id, input) {
    if (this.store.hasActiveRun()) throw new ServiceError(409, "active_run", "extension lifecycle is frozen during a run");
    const value = requireObject(input, "body");
    assertKeys(value, new Set(["action"]));
    const action = text(value.action, "action", { max: 40 });
    if (!["load", "unload", "reload", "invalidate"].includes(action)) throw new ServiceError(400, "invalid_action", "unknown extension action");
    try {
      return { extension: await this.extensionRegistry.lifecycle(id, action) };
    } catch (error) {
      throw new ServiceError(409, "extension_lifecycle_failed", safeMessage(error, "extension lifecycle failed"));
    }
  }

  async getSurface(sessionId) {
    const session = this.store.getSession(sessionId);
    if (!session) throw new ServiceError(404, "not_found", "session not found");
    if (!session.extensionBinding) return { extension: null, projection: null };
    const record = this.extensionRegistry.getRecord(session.extensionBinding.extensionId);
    if (!record) return { extension: null, projection: null };
    return {
      extension: record,
      projection: await this.extensionRegistry.projection({
        extensionId: session.extensionBinding.extensionId,
        binding: session.extensionBinding.binding,
      }),
    };
  }

  async humanAction(sessionId, input) {
    const value = requireObject(input, "body");
    assertKeys(value, new Set(["extensionId", "generation", "action", "payload", "actor"]));
    if (value.actor !== undefined) throw new ServiceError(400, "unknown_field", "actor is host-owned");
    const session = this.store.getSession(sessionId);
    if (!session) throw new ServiceError(404, "not_found", "session not found");
    const binding = session.extensionBinding;
    if (!binding || binding.extensionId !== value.extensionId) throw new ServiceError(409, "binding_mismatch", "session extension binding mismatch");
    const record = this.extensionRegistry.getRecord(value.extensionId);
    if (!record || record.status !== "loaded" || record.generation !== value.generation) throw new ServiceError(409, "generation_mismatch", "extension generation is not active");
    if (this.store.hasActiveRun()) throw new ServiceError(409, "active_run", "human action is unavailable during a run");
    return {
      result: await this.extensionRegistry.humanAction({
        extensionId: value.extensionId,
        binding: binding.binding,
        actor: "local-user",
        action: text(value.action, "action", { max: 80 }),
        payload: requireObject(value.payload, "payload"),
      }),
      projection: await this.extensionRegistry.projection({ extensionId: value.extensionId, binding: binding.binding }),
    };
  }

  #resolveModel(provider) {
    if (provider.provider === FAKE_PROVIDER_ID) return this.modelRuntime.getModel(FAKE_PROVIDER_ID, FAKE_MODEL_ID);
    return this.modelRuntime.getModel(DEEPSEEK_PROVIDER_ID, provider.model);
  }

  #ensureHostSession(session) {
    if (session.hostSession) {
      const manager = SessionManager.open(session.hostSession.path);
      return { manager, locator: session.hostSession };
    }
    const sessionDir = path.join(this.dataDir, "pi-sessions", session.id);
    const manager = SessionManager.create(session.workspaceDir, sessionDir);
    const locator = { id: manager.getSessionId(), path: manager.getSessionFile() };
    return { manager, locator };
  }

  async createRun(sessionId, input) {
    const value = requireObject(input, "body");
    assertKeys(value, new Set(["input", "commandId"]));
    const instruction = text(value.input, "input", { max: 100000 });
    const commandId = text(value.commandId, "commandId", { max: 200 });
    const session = this.store.getSession(sessionId);
    if (!session) throw new ServiceError(404, "not_found", "session not found");

    // A retry asks for the prior receipt, not for permission to execute again.
    // Resolve it before provider/extension availability checks, which apply
    // only to new work. New admission still rechecks atomically in the store.
    try {
      const receipt = this.store.getCommandReceipt(sessionId, commandId, instruction);
      if (receipt) return { run: receipt.run };
    } catch (error) {
      if (error?.code === "COMMAND_CONFLICT") throw new ServiceError(409, "command_conflict", "commandId was already used with a different input");
      throw error;
    }

    const provider = { ...this.providerConfig, realProvider: this.providerConfig.provider !== FAKE_PROVIDER_ID };
    if (provider.provider === FAKE_PROVIDER_ID) {
      if (provider.model !== FAKE_MODEL_ID || provider.api !== FAKE_API_ID || (provider.baseUrl && provider.baseUrl !== this.fakeProvider.baseUrl)) {
        throw new ServiceError(503, "provider_unsupported", "configured provider route is unavailable in local-fake mode");
      }
    } else if (provider.provider === DEEPSEEK_PROVIDER_ID) {
      if (provider.api !== DEEPSEEK_API_ID || !this.modelRuntime.getModel(DEEPSEEK_PROVIDER_ID, provider.model)) {
        throw new ServiceError(503, "provider_unsupported", "configured provider route is unavailable");
      }
    } else {
      throw new ServiceError(503, "provider_unsupported", "configured provider route is unavailable");
    }

    let extension = null;
    if (session.extensionBinding) {
      const record = this.extensionRegistry.getRecord(session.extensionBinding.extensionId);
      if (!record || record.status !== "loaded") throw new ServiceError(409, "extension_unloaded", "bound extension is not loaded");
      extension = bindingSnapshot(record);
    }

    // The commandId uniqueness check (and the single-active-run gate) happens
    // inside store.createRun's serialized mutation queue, so this is the only
    // safe point to decide whether this HTTP request truly owns a new run.
    // Host session creation is deliberately deferred until AFTER that check:
    // creating (or reopening) the AgentSession's SessionManager here, before
    // knowing we are the sole winner, would let two concurrent requests for
    // the same commandId each construct their own SessionManager and race to
    // attach it — this ordering keeps run creation the only race-sensitive
    // step, exactly where store._mutate can serialize it.
    let created;
    try {
      created = await this.store.createRun({
        sessionId,
        input: instruction,
        adapterId: this.adapterId,
        provider,
        extension,
        commandId,
        workspaceHostSession: null,
        credentialGeneration: this.credentialGeneration,
      });
    } catch (error) {
      if (error?.code === "COMMAND_CONFLICT") throw new ServiceError(409, "command_conflict", "commandId was already used with a different input");
      if (error?.message === "active run exists") throw new ServiceError(409, "active_run", "only one active run is allowed");
      if (error?.message === "session not found") throw new ServiceError(404, "not_found", "session not found");
      throw error;
    }
    if (created.idempotent) return { run: created.run };

    const { manager: sessionManager, locator: hostSessionLocator } = this.#ensureHostSession(session);
    if (!session.hostSession) await this.store.setHostSession(sessionId, hostSessionLocator);
    const run = await this.store.updateRun(created.run.id, { hostSession: hostSessionLocator });
    const credentialConfigured = provider.provider === FAKE_PROVIDER_ID || this.credentialsConfigured.has(provider.provider);
    const entry = {
      session: null,
      getUsage: null,
      task: null,
      cancelRequested: false,
      closeError: null,
      budget: { remainingMs: this.budget.deadlineMs, timer: null, armedAt: null, reason: null },
      sessionManager,
      workspaceDir: session.workspaceDir,
      permissionMode: session.permissionMode,
    };
    this.active.set(run.id, entry);
    entry.task = this.#executeRun(run, instruction, session, entry, provider, extension, credentialConfigured);
    return { run };
  }

  #armDeadline(entry, runId) {
    if (entry.budget.reason) return;
    entry.budget.armedAt = Date.now();
    entry.budget.timer = setTimeout(() => {
      if (entry.budget.reason || terminal(this.store.getRun(runId)?.status)) return;
      entry.budget.reason = "deadline";
      entry.session?.abort();
    }, entry.budget.remainingMs);
  }

  #pauseDeadline(entry) {
    if (entry.budget.timer) {
      clearTimeout(entry.budget.timer);
      entry.budget.remainingMs = Math.max(0, entry.budget.remainingMs - (Date.now() - entry.budget.armedAt));
      entry.budget.timer = null;
    }
  }

  async #executeRun(run, instruction, session, entry, provider, extension, credentialConfigured) {
    let extensionOutcome = null;
    // Usage numbers live in the host handle (entry.getUsage) and are read once
    // on the way out, so no terminal path can drop what the provider already
    // reported; usageComplete only records whether the accounting is whole.
    let usageComplete = false;
    let lastError = null;
    const appendError = async (code, message) => {
      lastError = { code, message };
      await this.#appendError(run.id, code, message);
    };
    try {
      if (!credentialConfigured) {
        await appendError("credential_missing", "no credential is configured for this provider");
        extensionOutcome = "failed";
        return;
      }

      let extensionContext = "";
      let extensionTools = [];
      if (session.extensionBinding) {
        const begun = await this.extensionRegistry.begin({
          extensionId: session.extensionBinding.extensionId,
          runId: run.id,
          sessionId: run.sessionId,
          binding: session.extensionBinding.binding,
          provider: (() => { const { realProvider: _realProvider, ...descriptor } = provider; return descriptor; })(),
          instruction,
        });
        entry.extensionRun = begun.run;
        extensionContext = begun.run.context ?? "";
        extensionTools = this.#validateExtensionTools(begun.run.tools ?? [], begun.record);
      }

      if (!this.store.getRun(run.id)?.admissionOpen || entry.cancelRequested) {
        await entry.extensionRun?.close?.("cancel");
        extensionOutcome = entry.closeError ? "unknown" : "canceled";
        return;
      }

      const model = this.#resolveModel(provider);
      if (!model) {
        await appendError("provider_error", "the configured model could not be resolved");
        extensionOutcome = "failed";
        return;
      }

      if (provider.provider === FAKE_PROVIDER_ID) await this.modelRuntime.setRuntimeApiKey(FAKE_PROVIDER_ID, FAKE_CREDENTIAL_KEY);

      const askUserTool = createAskUserTool(({ prompt, signal }) => this.#waitForDecision(run.id, entry, { kind: "ask_user", prompt, payload: null, signal }));
      const workspaceTools = createWorkspaceTools({
        workspaceDir: entry.workspaceDir,
        permissionMode: entry.permissionMode,
        requestPermission: ({ toolCallId, tool, path: relPath, bytes, contentSha256, preview, signal }) => this.#waitForDecision(run.id, entry, {
          kind: "permission",
          prompt: `permission requested for ${tool} on ${relPath}`,
          payload: { toolCallId, tool, path: relPath, bytes, contentSha256, preview },
          signal,
        }),
        onWritten: (artifact) => this.store.appendArtifact(run.id, artifact),
      });

      const started = await startSessionRun({
        cwd: entry.workspaceDir,
        agentDir: path.join(this.dataDir, "pi-agent"),
        modelRuntime: this.modelRuntime,
        model,
        sessionManager: entry.sessionManager,
        customTools: [askUserTool, ...workspaceTools, ...extensionTools],
        maxTurns: this.budget.maxTurns,
        input: instruction,
        onEvent: (event) => this.#onSessionEvent(run.id, event, entry),
        onNotice: (notice) => this.#appendNotice(run.id, notice),
      });
      entry.session = started.session;
      entry.getUsage = started.getUsage;
      this.#armDeadline(entry, run.id);

      const outcome = await started.task;
      usageComplete = outcome.status === "completed" && !outcome.turnBudgetExceeded && !entry.budget.reason;
      extensionOutcome = outcome.status === "completed" ? "completed" : outcome.status === "aborted" ? "canceled" : "failed";

      if (outcome.status === "error") {
        const rawMessage = outcome.errorMessage || "runtime failed";
        const code = classifyRuntimeError(rawMessage);
        await appendError(code, redact(rawMessage, this.knownSecrets));
      }
      if (entry.budget.reason || outcome.turnBudgetExceeded) {
        if (!entry.budget.reason) entry.budget.reason = "max_turns";
        extensionOutcome = "unknown";
        await appendError("budget_exceeded", entry.budget.reason === "deadline" ? "run deadline exceeded" : "run turn budget exceeded");
      }
    } catch (error) {
      extensionOutcome = entry.closeError || entry.budget.reason ? "unknown" : entry.cancelRequested ? "canceled" : "failed";
      await appendError(
        entry.closeError ? "extension_close_failed" : entry.budget.reason ? "budget_exceeded" : classifyRuntimeError(error?.message),
        entry.budget.reason === "deadline" ? "run deadline exceeded" : entry.budget.reason === "max_turns" ? "run turn budget exceeded" : redact(safeMessage(error, "runtime failed"), this.knownSecrets),
      );
    } finally {
      this.#pauseDeadline(entry);
      const collected = entry.getUsage?.();
      await this.store.recordUsage(
        run.id,
        collected
          ? { ...collected, missing: !usageComplete }
          : { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, turns: 0, missing: true },
      ).catch(() => {});
      if (entry.extensionRun?.finish) {
        try {
          const extensionStatus = entry.closeError || entry.budget.reason
            ? "unknown"
            : entry.cancelRequested
              ? "canceled"
              : extensionOutcome === "completed"
                ? "succeeded"
                : extensionOutcome === "canceled"
                  ? "canceled"
                  : extensionOutcome === "failed"
                    ? "failed"
                    : "unknown";
          await entry.extensionRun.finish({ status: extensionStatus, ...(entry.budget.reason ? { errorCode: "budget_exceeded" } : {}) });
        } catch {
          extensionOutcome = "unknown";
          lastError = { code: "extension_finish_failed", message: "extension finish failed" };
          await this.#appendError(run.id, lastError.code, lastError.message);
        }
      }
      const current = this.store.getRun(run.id);
      if (current && !terminal(current.status)) {
        const finalStatus = entry.closeError || entry.budget.reason ? "unknown" : entry.cancelRequested ? "cancelled" : extensionOutcome === "failed" ? "failed" : "completed";
        await this.store.updateRunWithEvent(run.id, { status: finalStatus, admissionOpen: false, error: finalStatus === "failed" || finalStatus === "unknown" ? lastError : null }, {
          type: "run.status",
          data: { status: finalStatus },
        });
      }
      for (const [questionId, waiter] of this.questionWaiters) {
        if (waiter.runId === run.id) this.questionWaiters.delete(questionId);
      }
      // No question outlives the run it belongs to. Whatever ended this run,
      // a still-pending question is now unanswerable, and saying so in the
      // store is what makes a late answer a recorded 409 rather than a
      // silently ignored request.
      await this.store.cancelQuestionsForRun(run.id).catch(() => {});
      this.active.delete(run.id);
    }
  }

  #validateExtensionTools(tools, record) {
    if (!Array.isArray(tools)) throw new Error("extension tools must be an array");
    const declared = new Set(record.tools);
    return tools.map((tool) => {
      if (!tool || typeof tool.name !== "string" || !tool.name.startsWith("se_") || !declared.has(tool.name)) throw new Error("extension tool is not declared");
      if (typeof tool.execute !== "function" || !tool.parameters) throw new Error("extension tool is invalid");
      const extensionExecute = tool.execute;
      return {
        ...tool,
        label: tool.label ?? tool.name,
        description: tool.description ?? tool.name,
        execute: async (toolCallId, params, signal, onUpdate) => {
          const value = await extensionExecute(params, { signal, toolCallId, onUpdate });
          if (value && Array.isArray(value.content)) return value;
          const textValue = typeof value === "string" ? value : JSON.stringify(value ?? null);
          return { content: [{ type: "text", text: textValue }], details: value ?? null };
        },
      };
    });
  }

  async #onSessionEvent(runId, event, entry) {
    const run = this.store.getRun(runId);
    if (!run) return;
    const mapped = mapSessionEvent(event);
    if (!mapped) return;
    if (!run.admissionOpen && !mapped.type.startsWith("run.")) return;
    await this.store.appendEvent({ runId, ...mapped });
  }

  async #appendNotice(runId, notice) {
    try {
      await this.store.appendEvent({ runId, type: "run.notice", data: notice });
    } catch {
      // Notices are best-effort; never let a notice failure mask the real outcome.
    }
  }

  async #appendError(runId, code, message) {
    try {
      await this.store.appendEvent({ runId, type: "run.error", data: { code, message } });
    } catch {
      // The original operation already failed; do not replace it with logging failure.
    }
  }

  async #waitForDecision(runId, entry, { kind, prompt, payload, signal }) {
    this.#pauseDeadline(entry);
    const question = await this.store.openQuestion({ runId, kind, prompt, payload });
    let resolve;
    let reject;
    const decisionPromise = new Promise((res, rej) => {
      resolve = res;
      reject = rej;
    });
    const onAbort = () => reject(new Error(kind + " aborted"));
    signal?.addEventListener("abort", onAbort, { once: true });
    this.questionWaiters.set(question.id, { resolve, reject, runId, kind });
    try {
      return await decisionPromise;
    } finally {
      signal?.removeEventListener("abort", onAbort);
      this.questionWaiters.delete(question.id);
    }
  }

  async answerQuestion(runId, questionId, input) {
    const run = this.store.getRun(runId);
    const question = this.store.getQuestion(questionId);
    if (!run || !question || question.runId !== runId) throw new ServiceError(404, "not_found", "question not found");
    if (terminal(run.status) || !run.admissionOpen) throw new ServiceError(409, "run_closed", "run is closed");
    if (question.status !== "pending") throw new ServiceError(409, "question_unavailable", "question is not pending");
    const waiter = this.questionWaiters.get(questionId);
    if (!waiter) throw new ServiceError(409, "question_unavailable", "question is not pending");

    const value = requireObject(input, "body");
    let resolvedValue;
    if (question.kind === "ask_user") {
      assertKeys(value, new Set(["answer"]));
      resolvedValue = text(value.answer, "answer", { max: 4000, allowEmpty: true });
      try {
        await this.store.resolveQuestion({ runId, questionId, answer: resolvedValue });
      } catch (error) {
        throw new ServiceError(409, "question_unavailable", safeMessage(error, "question is not pending"));
      }
    } else {
      assertKeys(value, new Set(["decision"]));
      resolvedValue = text(value.decision, "decision", { max: 10 });
      if (resolvedValue !== "allow" && resolvedValue !== "deny") throw new ServiceError(400, "invalid_input", "decision must be allow or deny");
      try {
        await this.store.resolveQuestion({ runId, questionId, decision: resolvedValue });
      } catch (error) {
        throw new ServiceError(409, "question_unavailable", safeMessage(error, "question is not pending"));
      }
    }
    const entry = this.active.get(runId);
    if (entry) this.#armDeadline(entry, runId);
    waiter.resolve(resolvedValue);
    return { answered: true };
  }

  async cancelRun(runId, input = {}) {
    const value = requireObject(input, "body");
    assertKeys(value, new Set());
    const run = this.store.getRun(runId);
    if (!run) throw new ServiceError(404, "not_found", "run not found");
    if (terminal(run.status)) return { run };
    const entry = this.active.get(runId);
    await this.store.updateRunWithEvent(runId, { status: "stopping", admissionOpen: false }, {
      type: "run.status",
      data: { status: "stopping" },
    });
    if (!entry) {
      // This process cannot abort what it is not driving, so it must not
      // claim the run stopped. `unknown` is the honest terminal state.
      const unknown = await this.store.updateRunWithEvent(runId, { status: "unknown", admissionOpen: false, error: { code: "not_in_process", message: "run is not active in this process" } }, {
        type: "run.status",
        data: { status: "unknown" },
      });
      await this.store.cancelQuestionsForRun(runId).catch(() => {});
      return { run: unknown };
    }
    entry.cancelRequested = true;
    if (entry.extensionRun?.close) {
      try {
        await entry.extensionRun.close("cancel");
      } catch (error) {
        entry.closeError = error;
        await this.#appendError(runId, "extension_close_failed", "extension close failed");
      }
    }
    for (const waiter of this.questionWaiters.values()) {
      if (waiter.runId === runId) waiter.reject(new Error("run canceled"));
    }
    await entry.session?.abort();
    if (entry.task) await entry.task;
    const final = this.store.getRun(runId);
    if (final && !terminal(final.status)) {
      const status = entry.closeError ? "unknown" : "cancelled";
      await this.store.updateRunWithEvent(runId, { status, admissionOpen: false }, { type: "run.status", data: { status } });
    }
    return { run: this.store.getRun(runId) };
  }

  getRun(id) {
    const run = this.store.getRun(id);
    if (!run) throw new ServiceError(404, "not_found", "run not found");
    return { run };
  }

  getEvents(sessionId, afterSeq = 0) {
    const session = this.store.getSession(sessionId);
    if (!session) throw new ServiceError(404, "not_found", "session not found");
    const numeric = Number(afterSeq);
    if (!Number.isSafeInteger(numeric) || numeric < 0) throw new ServiceError(400, "invalid_cursor", "afterSeq is invalid");
    const lastSeq = this.store.getSessionLastSeq(sessionId);
    // A cursor past the server's high-water mark cannot be satisfied by
    // waiting: it means the client is holding a position this server never
    // issued (a different data directory, a rolled-back state file, a
    // fabricated cursor). Answering 200 with an empty page would let that
    // client poll forever against a stream it can never rejoin, so this is an
    // error that names the current nextSeq and tells the client to re-snapshot.
    if (numeric > lastSeq) {
      throw new ServiceError(400, "cursor_ahead", "afterSeq is ahead of the server; refetch the session snapshot", { nextSeq: lastSeq });
    }
    // Reads are pure: the same afterSeq always yields the same page, and
    // nextSeq is the server's current high-water mark rather than the last
    // event in this page, so an empty page still advances a poller correctly.
    return { events: this.store.listEvents({ sessionId, afterSeq: numeric }), nextSeq: lastSeq };
  }
}

export { validateProviderDescriptor };
