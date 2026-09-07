import { lstat, mkdir, readFile, readdir, realpath, rename, stat, unlink, writeFile } from "node:fs/promises";
import { createReadStream } from "node:fs";
import { randomUUID, createHash } from "node:crypto";
import path from "node:path";
import { Type } from "@earendil-works/pi-ai";
import { Worker } from "node:worker_threads";
import { maybeCrash } from "./test-hooks.mjs";

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

/** Resolve a user-supplied relative path against the workspace, rejecting
 * absolute paths, `..` segments, and symlink escapes anywhere in the chain.
 * Shared by the ws_* tools and by every HTTP endpoint that names a workspace
 * path, so there is one guard and one place to test it. */
export async function resolveWorkspacePath(workspaceDir, relPath) {
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
  const workspaceReal = await realpath(workspaceDir);
  const cleanRelative = normalized === "." ? "" : normalized;
  const parts = cleanRelative.split(path.sep).filter(Boolean);
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

async function sha256File(absolutePath) {
  const bytes = await readFile(absolutePath);
  return { sha256: createHash("sha256").update(bytes).digest("hex"), bytes: bytes.length };
}

/** sha256 over a file's whole current bytes, streamed so the digest stays
 * honest for a file larger than the read/truncation limit. */
export async function sha256OfFile(absolutePath) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(absolutePath)) hash.update(chunk);
  return hash.digest("hex");
}

async function listTree(workspaceReal, dir, out) {
  const entries = await readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await listTree(workspaceReal, full, out);
    } else if (entry.isFile()) {
      const info = await stat(full);
      const bytes = await readFile(full);
      out.push({
        path: path.relative(workspaceReal, full).split(path.sep).join("/"),
        bytes: info.size,
        sha256: createHash("sha256").update(bytes).digest("hex"),
        mtime: info.mtime.toISOString(),
      });
    }
  }
}

export async function listWorkspaceTree(workspaceDir) {
  const workspaceReal = await realpath(workspaceDir);
  const files = [];
  await listTree(workspaceReal, workspaceReal, files);
  files.sort((a, b) => a.path.localeCompare(b.path));
  return files;
}

export function createWsListTool({ workspaceDir }) {
  return {
    name: "ws_list",
    label: "List workspace files",
    description: "List files under the session workspace (materials/ and out/), with size and sha256.",
    parameters: Type.Object({}),
    async execute() {
      const files = await listWorkspaceTree(workspaceDir);
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
    async execute(toolCallId, params) {
      const resolved = await resolveWorkspacePath(workspaceDir, params.path);
      let info;
      try {
        info = await stat(resolved.absolutePath);
      } catch (error) {
        throw wsError(error?.code === "ENOENT" ? "file does not exist" : "file could not be read");
      }
      if (!info.isFile()) throw wsError("path is not a file");
      if (info.size > MAX_READ_BYTES) throw wsError(`file exceeds the ${MAX_READ_BYTES} byte read limit`);
      const bytes = await readFile(resolved.absolutePath);
      if (isBinary(bytes)) throw wsError("file is not text");
      let text = bytes.toString("utf8");
      if (params.startLine || params.endLine) {
        const lines = text.split("\n");
        const start = Math.max(1, params.startLine ?? 1) - 1;
        const end = Math.min(lines.length, params.endLine ?? lines.length);
        text = lines.slice(start, end).join("\n");
      }
      return { content: [{ type: "text", text }], details: { path: resolved.relativePath, bytes: info.size } };
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
      const resolved = await resolveWorkspacePath(workspaceDir, params.path);
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
          path: resolved.relativePath,
          bytes: bytesToWrite,
          contentSha256,
          preview: params.text.slice(0, PERMISSION_PREVIEW_CHARS),
          signal,
        });
        if (decision !== "allow") throw wsError("write was denied by the user");
      }

      await mkdir(path.dirname(resolved.absolutePath), { recursive: true });
      const tempPath = resolved.absolutePath + "." + randomUUID() + ".tmp";
      try {
        await writeFile(tempPath, params.text, { encoding: "utf8", signal });
        if (signal?.aborted) {
          await unlink(tempPath).catch(() => {});
          throw wsError("write was cancelled");
        }
        // Save and pin the exact authorised bytes before publishing this
        // version into the mutable workspace or the artifact record.
        await saveHistory?.(Buffer.from(params.text, "utf8"), contentSha256, { signal });
        maybeCrash("after_history");
        if (signal?.aborted) throw wsError("write was cancelled");
        await rename(tempPath, resolved.absolutePath);
      } catch (error) {
        await unlink(tempPath).catch(() => {});
        throw error;
      }
      const sha256 = contentSha256;
      const bytes = bytesToWrite;
      // Crash point: the rename has landed, the artifact record has NOT. This
      // is the window the work order names; the recovery answer is a startup
      // reconciliation notice, never a silent back-fill of the record, and
      // never a reordering that would let "recorded but not written" happen.
      maybeCrash("after_write");
      await onWritten?.({ path: resolved.relativePath, bytes, sha256 });
      // Crash point: both the file and its content-version record are durable.
      maybeCrash("after_record");
      return {
        content: [{ type: "text", text: `wrote ${resolved.relativePath} (${bytes} bytes)` }],
        details: { path: resolved.relativePath, bytes, sha256 },
      };
    },
  };
}

// The service owns cancellation and deadlines. A RegExp can synchronously
// monopolize a JS thread, so execute it in a terminable worker rather than
// relying on timers in that same thread. Termination is awaited before this
// tool settles: "cancelled" must not leave the search running in the background.
function searchInWorker({ workspaceReal, targets, pattern, signal }) {
  if (signal?.aborted) return Promise.reject(wsError("search was cancelled"));
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL("./grep-worker.mjs", import.meta.url), {
      execArgv: [],
      workerData: { workspaceReal, targets, pattern, maxReadBytes: MAX_READ_BYTES, maxResults: MAX_GREP_RESULTS },
    });
    let settled = false;
    let timer;
    const finish = (error, matches) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      signal?.removeEventListener("abort", abort);
      worker.terminate().then(
        () => error ? reject(error) : resolve(matches),
        () => reject(wsError("search worker could not be stopped")),
      );
    };
    const abort = () => finish(wsError("search was cancelled"));
    worker.once("message", (message) => {
      if (!Array.isArray(message?.matches)) finish(wsError("search worker returned an invalid result"));
      else finish(null, message.matches);
    });
    worker.once("error", () => finish(wsError("search worker failed")));
    worker.once("exit", () => finish(wsError("search worker exited without a result")));
    timer = setTimeout(() => finish(wsError(`search exceeded the ${GREP_TIMEOUT_MS} ms time limit`)), GREP_TIMEOUT_MS);
    signal?.addEventListener("abort", abort, { once: true });
    if (signal?.aborted) abort();
  });
}

export function createWsGrepTool({ workspaceDir }) {
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
      const resolved = await resolveWorkspacePath(workspaceDir, params.path ?? ".");
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
      const workspaceReal = await realpath(workspaceDir);
      let baseStat;
      try {
        baseStat = await stat(resolved.absolutePath);
      } catch {
        throw wsError("path does not exist");
      }
      const targets = [];
      if (baseStat.isDirectory()) {
        await listTree(workspaceReal, resolved.absolutePath, targets);
      } else {
        targets.push({ path: resolved.relativePath, bytes: baseStat.size });
      }
      const matches = await searchInWorker({ workspaceReal, targets, pattern: params.pattern, signal });
      return { content: [{ type: "text", text: JSON.stringify(matches, null, 2) }], details: { matches } };
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

export function createWorkspaceTools({ workspaceDir, permissionMode, requestPermission, onWritten, saveHistory }) {
  const tools = [createWsListTool({ workspaceDir }), createWsReadTool({ workspaceDir }), createWsGrepTool({ workspaceDir })];
  if (permissionMode !== "read_only") {
    tools.push(createWsWriteTool({ workspaceDir, permissionMode, requestPermission, onWritten, saveHistory }));
  }
  return tools;
}

export { MAX_READ_BYTES, MAX_WRITE_BYTES, MAX_GREP_PATTERN_CHARS, GREP_TIMEOUT_MS, PERMISSION_PREVIEW_CHARS, hasNestedQuantifier };
