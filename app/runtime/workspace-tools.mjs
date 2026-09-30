import { lstat, realpath } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import path from "node:path";
import { Type } from "@earendil-works/pi-ai";
import { Worker } from "node:worker_threads";
import { maybeCrash } from "./test-hooks.mjs";
import { strictestEffect } from "./repository-tools.mjs";
import { runRepositoryFs, RepositoryFsError } from "./repository-fs.mjs";

// Generic workspace tools scoped to one session's workspace directory. No
// bash, no network, no path outside the workspace: those capabilities do not
// exist here, they are not merely unconfigured.
//
// pi-agent-core's AgentToolResult has no isError field (packages/agent/src/
// types.ts): a tool signals isError to the model/event stream only by
// throwing. Every rejection path below throws for that reason, rather than
// returning a result object with an isError flag that the framework would
// silently ignore.

const MAX_READ_BYTES = 512 * 1024;
const MAX_WRITE_BYTES = 4 * 1024 * 1024;
const MAX_GREP_RESULTS = 200;
const MAX_GREP_PATTERN_CHARS = 200;
const GREP_TIMEOUT_MS = 2000;
const PERMISSION_PREVIEW_CHARS = 400;
// Per helper request: the file bytes one ws_read may return (under the
// helper's 12 MiB output cap once base64-encoded) and the size of the file list
// sent (under the helper's 8 MiB input cap).
const MAX_GREP_BATCH_BYTES = 8 * 1024 * 1024;
const MAX_HELPER_REQUEST_BYTES = 1024 * 1024;

/**
 * Reject a quantifier applied to a group that already contains one —
 * `(a+)+`, `(a*)*`, `(x{2,})?`. This is a syntactic check for that one shape,
 * not a complexity analysis, and it runs before the pattern is compiled. It
 * does NOT catch every exponential pattern (`(a|aa)+` has no nested
 * quantifier and passes). This remains an early diagnostic only. Matching
 * runs in a disposable Node worker: its timeout and AbortSignal terminate
 * synchronous backtracking without blocking the service event loop.
 */
function containsQuantifier(fragment) {
  for (let i = 0; i < fragment.length; i += 1) {
    const char = fragment[i];
    if (char === "\\") { i += 1; continue; }
    if (char === "[") {
      i += 1;
      while (i < fragment.length && fragment[i] !== "]") { if (fragment[i] === "\\") i += 1; i += 1; }
      continue;
    }
    if (char === "*" || char === "+") return true;
    if (char === "{" && /^\{\d+,/.test(fragment.slice(i))) return true;
  }
  return false;
}

function hasNestedQuantifier(pattern) {
  const opens = [];
  for (let i = 0; i < pattern.length; i += 1) {
    const char = pattern[i];
    if (char === "\\") { i += 1; continue; }
    if (char === "[") {
      // Skip a character class wholesale; quantifiers inside it are literal.
      i += 1;
      while (i < pattern.length && pattern[i] !== "]") { if (pattern[i] === "\\") i += 1; i += 1; }
      continue;
    }
    if (char === "(") { opens.push(i); continue; }
    if (char !== ")") continue;
    const start = opens.pop();
    if (start === undefined) continue;
    const next = pattern[i + 1];
    if (next !== "*" && next !== "+" && next !== "?" && next !== "{") continue;
    if (containsQuantifier(pattern.slice(start + 1, i))) return true;
  }
  return false;
}

function wsError(message) {
  const error = new Error(message);
  error.isWorkspaceError = true;
  return error;
}

function isBinary(buffer) {
  const scanLength = Math.min(buffer.length, 8000);
  for (let i = 0; i < scanLength; i += 1) {
    if (buffer[i] === 0) return true;
  }
  return false;
}

/** The components of a user-supplied relative workspace path, rejecting
 * absolute paths and `..` segments. `.` and an empty component are dropped. */
function workspacePathParts(relPath) {
  if (typeof relPath !== "string" || relPath.length === 0 || relPath.length > 4000) {
    throw wsError("path is invalid");
  }
  if (path.isAbsolute(relPath)) throw wsError("absolute paths are not allowed");
  // A `..` segment is rejected wherever it appears, not only where it
  // normalizes outside the workspace: `materials/..` resolves back inside but
  // no longer names the target the caller asked for, and a caller that builds
  // a path out of a user-supplied name must not be able to walk up out of the
  // subdirectory it chose.
  if (relPath.split(/[\\/]+/).includes("..")) throw wsError("path escapes the workspace");
  const normalized = path.normalize(relPath);
  if (path.isAbsolute(normalized)) throw wsError("path escapes the workspace");
  const cleanRelative = normalized === "." ? "" : normalized;
  return cleanRelative.split(path.sep).filter(Boolean);
}

/** Resolve a user-supplied relative path against the workspace, rejecting
 * absolute paths, `..` segments, and symlinks present at the time of the
 * check. The result is a path that is reopened by name, so it does not bind
 * the identity of what is later read or written. Only the person's own HTTP
 * workspace endpoints use it; no model tool does. */
export async function resolveWorkspacePath(workspaceDir, relPath) {
  const parts = workspacePathParts(relPath);
  const workspaceReal = await realpath(workspaceDir);
  let current = workspaceReal;
  for (let index = 0; index < parts.length; index += 1) {
    current = path.join(current, parts[index]);
    let info;
    try {
      info = await lstat(current);
    } catch (error) {
      if (error?.code === "ENOENT") {
        if (index < parts.length - 1) throw wsError("parent directory does not exist");
        break;
      }
      throw error;
    }
    if (info.isSymbolicLink()) throw wsError("path escapes the workspace (symlink)");
  }
  const absolutePath = path.join(workspaceReal, ...parts);
  const relativePath = parts.join("/");
  return { absolutePath, relativePath: relativePath || ".", workspaceReal };
}

/** sha256 over a file's whole current bytes, streamed so the digest stays
 * honest for a file larger than the read/truncation limit. */
export async function sha256OfFile(absolutePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(absolutePath)) hash.update(chunk);
  return hash.digest("hex");
}

// Every model tool establishes which workspace file it reads or writes through
// the fixed filesystem helper (repository-fs-helper.py): it opens the
// workspace root once and each path component relative to its parent's
// descriptor with O_NOFOLLOW. Search and listing: `ws_scan` names regular
// files (on-disk spelling, with device and inode) without opening them; the
// Host admits names; `ws_read` walks descriptor-relative again and reads only
// an admitted file whose identity is the one named, so a file that is not
// admitted is never opened. Single files: `ws_read_file` reads, and
// `ws_write_stage`/`ws_write_commit` stage and publish a write, in the
// directory reached that way.
function workspaceFsError(error, messages = {}) {
  if (error?.isWorkspaceError) return error;
  const defaults = {
    symlink: "path escapes the workspace (symlink)",
    path_unavailable: "path does not exist",
    parent_unavailable: "parent directory does not exist",
    not_file: "path is not a file",
    python_unavailable: "workspace tools require the configured Python 3 runtime",
    cancelled: "workspace operation was cancelled",
    fallback: "workspace could not be read",
  };
  const table = { ...defaults, ...messages };
  return wsError(table[error?.code] ?? table.fallback);
}

const helperRoot = (workspaceDir) => path.resolve(workspaceDir);

/** The workspace-relative path in on-disk spelling for the existing part of
 * `relPath` (the file, or its parent when the file does not exist yet), found
 * by descriptor-relative traversal. Policy admission uses this resource. */
export async function workspaceResourcePath(workspaceDir, relPath, options = {}) {
  const parts = workspacePathParts(relPath);
  try {
    const result = await runRepositoryFs({ operation: "ws_resolve", rootPath: helperRoot(workspaceDir), parts }, options);
    if (typeof result?.path !== "string") throw wsError("workspace helper returned an invalid result");
    return result.path;
  } catch (error) {
    throw workspaceFsError(error, { fallback: "path could not be resolved" });
  }
}

async function scanWorkspace(workspaceDir, parts, options) {
  const scan = await runRepositoryFs({ operation: "ws_scan", rootPath: path.resolve(workspaceDir), parts }, options);
  if (!Array.isArray(scan?.files)) throw wsError("workspace helper returned an invalid result");
  return scan;
}

/** Reads the given scanned files in order, one bounded helper request at a
 * time, yielding each file with its read result (null when the file is gone,
 * changed identity, or is binary or over the limit in text mode). */
async function* readScannedFiles(scan, files, mode, options) {
  let start = 0;
  while (start < files.length) {
    const request = [];
    let requestBytes = 0;
    for (let index = start; index < files.length && (request.length === 0 || requestBytes < MAX_HELPER_REQUEST_BYTES); index += 1) {
      const { path: filePath, device, inode } = files[index];
      request.push({ path: filePath, device, inode });
      requestBytes += Buffer.byteLength(JSON.stringify(request.at(-1)));
    }
    const result = await runRepositoryFs({
      operation: "ws_read", rootPath: scan.rootPath, device: scan.device, inode: scan.inode,
      mode, files: request, maxFileBytes: MAX_READ_BYTES, maxBatchBytes: MAX_GREP_BATCH_BYTES,
    }, options);
    const consumed = result?.consumed;
    if (!Number.isInteger(consumed) || consumed < 1 || consumed > request.length || !Array.isArray(result.files) || result.files.length !== consumed) {
      throw wsError("workspace helper returned an invalid result");
    }
    yield files.slice(start, start + consumed).map((file, index) => ({ file, read: result.files[index] }));
    start += consumed;
  }
}

// The same millisecond Node's fs.Stats.mtime gives: seconds and nanoseconds
// combined as a double, then rounded.
function isoFromNs(ns) {
  const total = BigInt(ns);
  let seconds = total / 1_000_000_000n;
  let nanoseconds = total % 1_000_000_000n;
  if (nanoseconds < 0n) { nanoseconds += 1_000_000_000n; seconds -= 1n; }
  return new Date(Math.round(Number(seconds) * 1000 + Number(nanoseconds) / 1e6)).toISOString();
}

/** Every regular file in the workspace with its size and mtime; `sha256` only
 * for a file `admit` accepts. A file whose identity changed between naming and
 * hashing is left out. */
export async function listWorkspaceTree(workspaceDir, { admit = () => true, signal } = {}) {
  try {
    const scan = await scanWorkspace(workspaceDir, [], { signal });
    const files = [];
    const admitted = [];
    for (const file of scan.files) {
      if (admit(file.path)) admitted.push(file);
      else files.push({ path: file.path, bytes: file.bytes, mtime: isoFromNs(file.mtimeNs) });
    }
    for await (const batch of readScannedFiles(scan, admitted, "hash", { signal })) {
      for (const { file, read } of batch) {
        if (read) files.push({ path: file.path, bytes: read.bytes, sha256: read.sha256, mtime: isoFromNs(read.mtimeNs) });
      }
    }
    files.sort((a, b) => a.path.localeCompare(b.path));
    return files;
  } catch (error) {
    throw workspaceFsError(error);
  }
}

// An aggregate read returns a file's content or hash only when both the
// aggregate tool's rule and the single-file ws_read rule allow that path.
function admitsFile(admitPath, tool, relPath) {
  return strictestEffect(admitPath(tool, relPath), admitPath("ws_read", relPath));
}

export function createWsListTool({ workspaceDir, admitPath = () => "allow" }) {
  return {
    name: "ws_list",
    label: "List workspace files",
    description: "List files under the session workspace (materials/ and out/), with size and sha256.",
    parameters: Type.Object({}),
    async execute(toolCallId, params, signal) {
      const files = await listWorkspaceTree(workspaceDir, {
        signal, admit: (relPath) => admitsFile(admitPath, "ws_list", relPath) === "allow",
      });
      return { content: [{ type: "text", text: JSON.stringify(files, null, 2) }], details: { files } };
    },
  };
}

export function createWsReadTool({ workspaceDir }) {
  return {
    name: "ws_read",
    label: "Read workspace file",
    description: "Read a text file from the session workspace, optionally a line range. Rejects binary or over-limit files.",
    parameters: Type.Object({
      path: Type.String({ minLength: 1, maxLength: 4000 }),
      startLine: Type.Optional(Type.Integer({ minimum: 1 })),
      endLine: Type.Optional(Type.Integer({ minimum: 1 })),
    }),
    async execute(toolCallId, params, signal) {
      const parts = workspacePathParts(params.path);
      let read;
      try {
        read = await runRepositoryFs({ operation: "ws_read_file", rootPath: helperRoot(workspaceDir), parts, maxFileBytes: MAX_READ_BYTES }, { signal });
      } catch (error) {
        throw workspaceFsError(error, {
          path_unavailable: "file does not exist",
          file_too_large: `file exceeds the ${MAX_READ_BYTES} byte read limit`,
          fallback: "file could not be read",
        });
      }
      if (typeof read?.path !== "string" || typeof read.dataBase64 !== "string" || !Number.isInteger(read.bytes)) throw wsError("workspace helper returned an invalid result");
      const bytes = Buffer.from(read.dataBase64, "base64");
      if (isBinary(bytes)) throw wsError("file is not text");
      let text = bytes.toString("utf8");
      if (params.startLine || params.endLine) {
        const lines = text.split("\n");
        const start = Math.max(1, params.startLine ?? 1) - 1;
        const end = Math.min(lines.length, params.endLine ?? lines.length);
        text = lines.slice(start, end).join("\n");
      }
      return { content: [{ type: "text", text }], details: { path: read.path, bytes: read.bytes } };
    },
  };
}

export function createWsWriteTool({ workspaceDir, permissionMode, requestPermission, onWritten, saveHistory }) {
  return {
    name: "ws_write",
    label: "Write workspace file",
    description: "Write (overwrite) a whole text file under the session workspace. Only out/ is intended for model output.",
    parameters: Type.Object({
      path: Type.String({ minLength: 1, maxLength: 4000 }),
      text: Type.String({ maxLength: MAX_WRITE_BYTES }),
    }),
    async execute(toolCallId, params, signal) {
      // Crash point: nothing has been written yet. A restart after this must
      // find the workspace untouched and must not replay the command.
      maybeCrash("before_tool");
      const parts = workspacePathParts(params.path);
      if (!parts.length) throw wsError("path is not a file");
      const bytesToWrite = Buffer.byteLength(params.text, "utf8");
      if (bytesToWrite > MAX_WRITE_BYTES) throw wsError(`write exceeds the ${MAX_WRITE_BYTES} byte limit`);
      // The permission request binds the exact call and the exact bytes it
      // would write: the approval a user gives is for this content, not for
      // "writes to this path", so a later call with different parameters
      // cannot inherit it.
      const contentSha256 = createHash("sha256").update(params.text, "utf8").digest("hex");

      if (permissionMode === "ask") {
        const decision = await requestPermission({
          toolCallId,
          tool: "ws_write",
          path: await workspaceResourcePath(workspaceDir, params.path),
          bytes: bytesToWrite,
          contentSha256,
          preview: params.text.slice(0, PERMISSION_PREVIEW_CHARS),
          signal,
        });
        if (decision !== "allow") throw wsError("write was denied by the user");
      }

      // The helper stages the bytes as a new file in the parent directory it
      // reached descriptor-relative; the commit renames it over the target
      // within that same directory, refusing a symlink or non-regular target.
      const content = Buffer.from(params.text, "utf8");
      const tempName = parts.at(-1) + "." + randomUUID() + ".tmp";
      const rootPath = helperRoot(workspaceDir);
      const writeErrors = { path_unavailable: "parent directory does not exist", fallback: "file could not be written" };
      const discard = () => runRepositoryFs({ operation: "ws_write_discard", rootPath, parts, tempName }).catch(() => {});
      let staged;
      let committed;
      try {
        staged = await runRepositoryFs({
          operation: "ws_write_stage", rootPath, parts, tempName,
          dataBase64: content.toString("base64"), contentSha256, maxFileBytes: MAX_WRITE_BYTES,
        });
      } catch (error) {
        await discard();
        throw workspaceFsError(error, writeErrors);
      }
      try {
        if (signal?.aborted) throw wsError("write was cancelled");
        // Save and pin the exact authorised bytes before publishing this
        // version into the mutable workspace or the artifact record.
        await saveHistory?.(content, contentSha256, { signal });
        maybeCrash("after_history");
        if (signal?.aborted) throw wsError("write was cancelled");
        const { rootPath: stagedRoot, device, inode, parts: stagedParts, tempDevice, tempInode, parentDevice, parentInode } = staged;
        committed = await runRepositoryFs({
          operation: "ws_write_commit", rootPath: stagedRoot, device, inode, parts: stagedParts,
          tempName, tempDevice, tempInode, parentDevice, parentInode,
        });
      } catch (error) {
        await discard();
        // History and cancellation errors pass through as before; only the
        // helper's own failures are translated.
        throw error instanceof RepositoryFsError ? workspaceFsError(error, writeErrors) : error;
      }
      const relativePath = staged.path;
      const sha256 = contentSha256;
      const bytes = bytesToWrite;
      // The bytes landed in the directory the walk reached, but the Host could
      // not confirm afterwards that this path still names it: the directory,
      // or the workspace root, may have been moved between the identity check
      // and the rename. The effect happened and is reported as it is; no
      // record claims the path, and the bytes stay where they went, since
      // taking them back would change a moved directory a second time.
      if (!committed.placed) {
        const text = `wrote ${bytes} bytes (sha256 ${sha256}), but could not confirm that they are at ${relativePath}: the directory or the workspace moved during the write. The exact bytes are kept in history.`;
        return { content: [{ type: "text", text }], details: { path: relativePath, bytes, sha256, placement: "unconfirmed" } };
      }
      // Crash point: the rename has landed, the artifact record has NOT. This
      // is the window the work order names; the recovery answer is a startup
      // reconciliation notice, never a silent back-fill of the record, and
      // never a reordering that would let "recorded but not written" happen.
      maybeCrash("after_write");
      await onWritten?.({ path: relativePath, bytes, sha256 });
      // Crash point: both the file and its content-version record are durable.
      maybeCrash("after_record");
      return {
        content: [{ type: "text", text: `wrote ${relativePath} (${bytes} bytes)` }],
        details: { path: relativePath, bytes, sha256 },
      };
    },
  };
}

// A RegExp can synchronously monopolize a JS thread, so the model's pattern is
// matched in a terminable worker over the text the helper read. One deadline
// covers naming, reading and matching; cancellation or the deadline stops the
// helper process (runRepositoryFs settles only after it has exited) and the
// worker, whose termination is awaited before this settles.
function startMatcher(pattern, signal) {
  const worker = new Worker(new URL("./grep-worker.mjs", import.meta.url), {
    execArgv: [],
    workerData: { pattern, maxResults: MAX_GREP_RESULTS },
  });
  let failure = null;
  let pending = null;
  const fail = (error) => {
    failure ??= error;
    pending?.reject(failure);
    pending = null;
  };
  worker.on("message", (message) => {
    if (!pending) return;
    if (!Array.isArray(message?.matches)) return fail(wsError("search worker returned an invalid result"));
    const { resolve } = pending;
    pending = null;
    resolve(message.matches);
  });
  worker.once("error", () => fail(wsError("search worker failed")));
  worker.once("exit", () => fail(wsError("search worker exited without a result")));
  signal.addEventListener("abort", () => fail(wsError("search was cancelled")), { once: true });
  return {
    match(files) {
      if (failure) return Promise.reject(failure);
      return new Promise((resolve, reject) => {
        pending = { resolve, reject };
        worker.postMessage({ files });
      });
    },
    async stop() {
      try { await worker.terminate(); } catch { throw wsError("search worker could not be stopped"); }
    },
  };
}

async function searchWorkspace({ workspaceDir, parts, pattern, admit, signal }) {
  if (signal?.aborted) throw wsError("search was cancelled");
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => { timedOut = true; controller.abort(); }, GREP_TIMEOUT_MS);
  const abort = () => controller.abort();
  signal?.addEventListener("abort", abort, { once: true });
  const matcher = startMatcher(pattern, controller.signal);
  const options = { signal: controller.signal, timeoutMs: GREP_TIMEOUT_MS };
  try {
    const scan = await scanWorkspace(workspaceDir, parts, options);
    let excludedByPolicy = 0;
    let excludedPendingApproval = 0;
    const admitted = [];
    try {
      for (const file of scan.files) {
        if (file.bytes > MAX_READ_BYTES) continue;
        const effect = admit(file.path);
        if (effect === "deny") excludedByPolicy += 1;
        else if (effect === "ask") excludedPendingApproval += 1;
        else if (effect === "allow") admitted.push(file);
      }
    } catch {
      throw wsError("search admission failed");
    }
    let matches = [];
    for await (const batch of readScannedFiles(scan, admitted, "text", options)) {
      const files = batch.filter(({ read }) => read).map(({ file, read }) => ({ path: file.path, dataBase64: read.dataBase64 }));
      if (files.length) matches = await matcher.match(files);
      if (matches.length >= MAX_GREP_RESULTS) break;
    }
    return { matches, excludedByPolicy, excludedPendingApproval };
  } catch (error) {
    if (timedOut) throw wsError(`search exceeded the ${GREP_TIMEOUT_MS} ms time limit`);
    if (signal?.aborted) throw wsError("search was cancelled");
    throw workspaceFsError(error);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", abort);
    await matcher.stop();
  }
}

export function createWsGrepTool({ workspaceDir, admitPath = () => "allow" }) {
  return {
    name: "ws_grep",
    label: "Search workspace files",
    description: "Search text files under the session workspace for a literal or regular-expression pattern.",
    parameters: Type.Object({
      pattern: Type.String({ minLength: 1, maxLength: MAX_GREP_PATTERN_CHARS }),
      path: Type.Optional(Type.String({ maxLength: 4000 })),
    }),
    async execute(toolCallId, params, signal) {
      if (signal?.aborted) throw wsError("search was cancelled");
      const parts = workspacePathParts(params.path ?? ".");
      if (typeof params.pattern !== "string" || params.pattern.length === 0 || params.pattern.length > MAX_GREP_PATTERN_CHARS) {
        throw wsError(`pattern must be 1 to ${MAX_GREP_PATTERN_CHARS} characters`);
      }
      if (hasNestedQuantifier(params.pattern)) {
        throw wsError("pattern nests a quantifier inside a quantified group, which can backtrack exponentially");
      }
      try {
        new RegExp(params.pattern);
      } catch {
        throw wsError("pattern is not a valid regular expression");
      }
      const { matches, excludedByPolicy, excludedPendingApproval } = await searchWorkspace({
        workspaceDir, parts, pattern: params.pattern, signal,
        admit: (relPath) => admitsFile(admitPath, "ws_grep", relPath),
      });
      const content = [{ type: "text", text: JSON.stringify(matches, null, 2) }];
      if (excludedByPolicy || excludedPendingApproval) content.push({ type: "text", text: JSON.stringify({ excludedByPolicy, excludedPendingApproval }) });
      return { content, details: { matches, excludedByPolicy, excludedPendingApproval } };
    },
  };
}

export function createAskUserTool(askUser) {
  return {
    name: "ask_user",
    label: "Ask user",
    description: "Ask one bounded question and wait for the local user answer.",
    parameters: Type.Object({ prompt: Type.String({ minLength: 1, maxLength: 4000 }) }),
    async execute(toolCallId, params, signal) {
      const answer = await askUser({ toolCallId, prompt: params.prompt, signal });
      return { content: [{ type: "text", text: answer }], details: { questionAnswered: true } };
    },
  };
}

export function createWorkspaceTools({ workspaceDir, permissionMode, requestPermission, onWritten, saveHistory, admitPath }) {
  const tools = [createWsListTool({ workspaceDir, admitPath }), createWsReadTool({ workspaceDir }), createWsGrepTool({ workspaceDir, admitPath })];
  if (permissionMode !== "read_only") {
    tools.push(createWsWriteTool({ workspaceDir, permissionMode, requestPermission, onWritten, saveHistory }));
  }
  return tools;
}

export { MAX_READ_BYTES, MAX_WRITE_BYTES, MAX_GREP_PATTERN_CHARS, GREP_TIMEOUT_MS, PERMISSION_PREVIEW_CHARS, hasNestedQuantifier };
