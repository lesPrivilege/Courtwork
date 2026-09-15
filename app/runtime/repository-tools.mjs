import { createHash } from "node:crypto";
import { Type } from "@earendil-works/pi-ai";
import { Worker } from "node:worker_threads";

const MAX_PATH_CHARS = 1000;
const MAX_PATTERN_CHARS = 200;
const MAX_GREP_FILES = 500;
const GREP_TIMEOUT_MS = 2000;

function repositoryToolError(message, code = "repository_read_failed") {
  const error = new Error(message);
  error.code = code;
  error.isRepositoryError = true;
  return error;
}

function sha256(value) { return createHash("sha256").update(value).digest("hex"); }

export function decodeRepositoryText(base64, expectedBytes, expectedHash) {
  const bytes = Buffer.from(base64, "base64");
  if (bytes.length !== expectedBytes || sha256(bytes) !== expectedHash) throw repositoryToolError("repository helper returned an invalid source receipt", "invalid_helper_response");
  if (bytes.subarray(0, 8000).includes(0)) throw repositoryToolError("repository file is not text", "binary_file");
  let text;
  try { text = new TextDecoder("utf-8", { fatal: true }).decode(bytes); }
  catch { throw repositoryToolError("repository file is not valid UTF-8 text", "binary_file"); }
  return { bytes, text };
}

export function grepRepositoryInWorker(files, pattern, signal) {
  if (signal?.aborted) return Promise.reject(repositoryToolError("repository search was cancelled", "cancelled"));
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./repository-grep-worker.mjs", import.meta.url), {
      execArgv: [],
      workerData: { files, pattern },
    });
    let settled = false;
    let timer;
    const finish = (error, result) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      worker.terminate().then(
        () => error ? reject(error) : resolve(result),
        () => reject(repositoryToolError("repository search worker could not be stopped", "worker_shutdown_failed")),
      );
    };
    const abort = () => finish(repositoryToolError("repository search was cancelled", "cancelled"));
    worker.once("message", message => {
      if (typeof message?.error === "string") finish(repositoryToolError(message.error, "invalid_pattern"));
      else if (!Array.isArray(message?.matches) || typeof message.truncated !== "boolean") finish(repositoryToolError("repository search worker returned an invalid result", "invalid_helper_response"));
      else finish(null, message);
    });
    worker.once("error", () => finish(repositoryToolError("repository search worker failed")));
    worker.once("exit", () => finish(repositoryToolError("repository search worker exited without a result")));
    timer = setTimeout(() => finish(repositoryToolError(`repository search exceeded ${GREP_TIMEOUT_MS} ms`, "search_timeout")), GREP_TIMEOUT_MS);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}

export function repositorySource(path, bytes, digest) { return { path, bytes, sha256: digest }; }

const EFFECT_WEIGHT = { allow: 0, ask: 1, deny: 2 };
function strictestEffect(a, b) { return EFFECT_WEIGHT[a] >= EFFECT_WEIGHT[b] ? a : b; }

export function createRepositoryTools({ binding, runId, runRepositoryFs, recordRead, assertActive, admitPath = () => "allow" }) {
  if (!binding || binding.status !== "active") return [];
  const bindingId = binding.id;
  const revision = binding.revision;

  async function read(operation, path, signal) {
    if (signal?.aborted || !assertActive(bindingId, revision)) throw repositoryToolError("repository binding is no longer active for this run", "binding_revoked");
    return await runRepositoryFs({
      operation, path, rootPath: binding.rootPath, device: binding.device, inode: binding.inode,
    }, { signal });
  }

  async function record(operation, path, text, sources, signal) {
    if (signal?.aborted) throw repositoryToolError("repository read was cancelled", "cancelled");
    if (!assertActive(bindingId, revision)) throw repositoryToolError("repository binding is no longer active for this run", "binding_revoked");
    await runRepositoryFs({
      operation: "verify", rootPath: binding.rootPath, device: binding.device, inode: binding.inode,
    }, { signal });
    if (signal?.aborted || !assertActive(bindingId, revision)) throw repositoryToolError("repository binding is no longer active for this run", "binding_revoked");
    await recordRead(runId, {
      bindingId, revision, operation, path,
      resultSha256: sha256(Buffer.from(text, "utf8")), sources,
    });
  }

  const listTool = {
    name: "repo_list",
    label: "List connected repository files",
    description: "List direct entries under the currently connected repository directory or one of its subdirectories. Paths are relative; symbolic links are shown but never followed.",
    parameters: Type.Object({ path: Type.Optional(Type.String({ maxLength: MAX_PATH_CHARS })) }),
    async execute(_callId, params, signal) {
      const relativePath = params.path ?? ".";
      const result = await read("list", relativePath, signal);
      const text = JSON.stringify(result, null, 2);
      const digest = sha256(Buffer.from(text, "utf8"));
      await record("list", result.path, text, [repositorySource(result.path, Buffer.byteLength(text), digest)], signal);
      return { content: [{ type: "text", text }], details: { path: result.path, entries: result.entries.length, truncated: result.truncated, sha256: digest } };
    },
  };

  const readTool = {
    name: "repo_read",
    label: "Read connected repository file",
    description: "Read a UTF-8 text file from the currently connected repository. Use a relative path; symbolic links are not followed.",
    parameters: Type.Object({
      path: Type.String({ minLength: 1, maxLength: MAX_PATH_CHARS }),
      startLine: Type.Optional(Type.Integer({ minimum: 1 })),
      endLine: Type.Optional(Type.Integer({ minimum: 1 })),
    }),
    async execute(_callId, params, signal) {
      const result = await read("read", params.path, signal);
      const decoded = decodeRepositoryText(result.dataBase64, result.bytes, result.sha256);
      let text = decoded.text;
      if (params.startLine || params.endLine) {
        const lines = text.split("\n");
        const start = Math.max(1, params.startLine ?? 1) - 1;
        const end = Math.min(lines.length, params.endLine ?? lines.length);
        text = lines.slice(start, end).join("\n");
      }
      await record("read", result.path, text, [repositorySource(result.path, result.bytes, result.sha256)], signal);
      return { content: [{ type: "text", text }], details: { path: result.path, bytes: result.bytes, sha256: result.sha256 } };
    },
  };

  const grepTool = {
    name: "repo_grep",
    label: "Search connected repository files",
    description: "Search UTF-8 text files under the connected repository or a relative subdirectory with a regular-expression pattern. Symlinks are not followed; bounded searches report when the result is partial. Never includes a file that policy denies or that needs per-file approval (excludedByPolicy/excludedPendingApproval count them without naming them); use repo_read on an exact path to request approval for one of those files.",
    parameters: Type.Object({
      pattern: Type.String({ minLength: 1, maxLength: MAX_PATTERN_CHARS }),
      path: Type.Optional(Type.String({ maxLength: MAX_PATH_CHARS })),
    }),
    async execute(_callId, params, signal) {
      const relativePath = params.path ?? ".";
      const scanned = await read("grep", relativePath, signal);
      if (!Array.isArray(scanned.files) || scanned.files.length > MAX_GREP_FILES) throw repositoryToolError("repository helper returned an invalid search set", "invalid_helper_response");
      let excludedByPolicy = 0;
      let excludedPendingApproval = 0;
      const admitted = [];
      for (const file of scanned.files) {
        const effect = strictestEffect(admitPath("repo_grep", file.path), admitPath("repo_read", file.path));
        if (effect === "deny") { excludedByPolicy++; continue; }
        if (effect === "ask") { excludedPendingApproval++; continue; }
        admitted.push(file);
      }
      for (const file of admitted) decodeRepositoryText(file.dataBase64, file.bytes, file.sha256);
      const matched = await grepRepositoryInWorker(admitted, params.pattern, signal);
      const result = {
        matches: matched.matches,
        truncated: scanned.truncated || matched.truncated,
        scannedFiles: scanned.files.length,
        scannedBytes: scanned.scannedBytes,
        skippedBinary: scanned.skippedBinary,
        skippedLarge: scanned.skippedLarge,
        skippedSymlinks: scanned.skippedSymlinks,
        excludedByPolicy,
        excludedPendingApproval,
      };
      const text = JSON.stringify(result, null, 2);
      const sources = admitted.map(file => repositorySource(file.path, file.bytes, file.sha256));
      await record("grep", scanned.path, text, sources, signal);
      return { content: [{ type: "text", text }], details: { path: scanned.path, matches: matched.matches.length, truncated: result.truncated, scannedFiles: result.scannedFiles, excludedByPolicy, excludedPendingApproval } };
    },
  };

  return [listTool, readTool, grepTool];
}
