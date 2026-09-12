import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { lstat, mkdir } from "node:fs/promises";
import path from "node:path";

// Git owns immutable objects and reachable refs. The existing run.artifacts
// record (or a runtime.mcp.result receipt for semantic tool results) owns
// permission to resolve them; this module is not a second
// artifact database and is never given paths inside the user's workspace.
const MAX_BYTES = 4 * 1024 * 1024;
const GIT_TIMEOUT_MS = 10_000;
const SHA256 = /^[0-9a-f]{64}$/;
const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

export class ArtifactHistoryError extends Error {
  constructor(code) {
    super(code === "history_unavailable" ? "the recorded version is unavailable"
      : code === "artifact_integrity_failed" ? "the recorded version failed its integrity check"
      : "artifact history storage is unavailable");
    this.code = code;
  }
}

function cancelled(signal) {
  if (signal?.aborted) {
    const error = new Error("artifact storage was cancelled");
    error.name = "AbortError";
    throw error;
  }
}

function gitEnvironment() {
  // No caller-controlled GIT_DIR, alternate objects, config injection, global
  // filters or credential helpers. No Git network command is exposed here.
  const env = Object.fromEntries(Object.entries(process.env).filter(([key]) => !key.startsWith("GIT_")));
  return { ...env, GIT_CONFIG_NOSYSTEM: "1", GIT_CONFIG_GLOBAL: "/dev/null", GIT_TERMINAL_PROMPT: "0" };
}

function git(repo, args, { input, signal } = {}) {
  cancelled(signal);
  return new Promise((resolve, reject) => {
    let closed = false;
    let outcome;
    const finish = () => {
      if (!closed || !outcome) return;
      if (outcome.error) reject(outcome.error); else resolve(outcome.stdout);
    };
    const child = execFile("git", ["--no-pager", "--no-replace-objects",
      "-c", "core.fsync=loose-object,reference", "-c", "core.fsyncMethod=fsync",
      "-c", "core.hooksPath=/dev/null", "-c", "core.fsmonitor=false",
      "-c", "gc.auto=0", "-c", "maintenance.auto=false",
      ...(repo ? ["--git-dir", repo] : []), ...args], {
      env: gitEnvironment(), encoding: "buffer", maxBuffer: MAX_BYTES + 4096,
      timeout: GIT_TIMEOUT_MS, killSignal: "SIGKILL", signal, windowsHide: true,
    }, (error, stdout) => { outcome = { error, stdout }; finish(); });
    // AbortError can be emitted before process exit. Do not report cleanup
    // complete while the Git process may still be alive.
    child.once("close", () => { closed = true; finish(); });
    // An early Git exit may close stdin before the small buffered write.
    // execFile's exit callback remains the authoritative result.
    child.stdin?.on("error", () => {});
    child.stdin?.end(input);
  });
}

export class ArtifactHistory {
  constructor(dataDir) {
    this.root = path.join(dataDir, "artifact-history");
    this.versionCheck = null;
    this.queues = new Map();
    this.initialized = new Set();
  }

  repository(sessionId) {
    return path.join(this.root, sha256(Buffer.from(sessionId)), "objects.git");
  }

  async #requireGit() {
    this.versionCheck ??= git(null, ["--version"]).then((out) => {
      const version = out.toString().match(/git version (\d+)\.(\d+)/);
      if (!version || Number(version[1]) < 2 || (Number(version[1]) === 2 && Number(version[2]) < 36)) {
        throw new ArtifactHistoryError("artifact_store_unavailable");
      }
    }).catch((error) => { this.versionCheck = null; throw error; });
    await this.versionCheck;
  }

  async #exists(repo) {
    try {
      const info = await lstat(repo);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new ArtifactHistoryError("artifact_integrity_failed");
      return true;
    } catch (error) {
      if (error.code === "ENOENT") return false;
      throw error;
    }
  }

  async #read(repo, digest, bytes, signal) {
    if (!await this.#exists(repo)) throw new ArtifactHistoryError("history_unavailable");
    let objectId;
    try {
      objectId = (await git(repo, ["rev-parse", "--verify", "--quiet", `refs/content-sha256/${digest}`], { signal })).toString().trim();
    } catch (error) {
      if (error.code === 1) throw new ArtifactHistoryError("history_unavailable");
      throw error;
    }
    if (!SHA256.test(objectId)) throw new ArtifactHistoryError("artifact_integrity_failed");
    let content;
    try {
      const size = Number((await git(repo, ["cat-file", "-s", objectId], { signal })).toString().trim());
      if (!Number.isSafeInteger(size) || size !== bytes || size > MAX_BYTES) throw new ArtifactHistoryError("artifact_integrity_failed");
      const type = (await git(repo, ["cat-file", "-t", objectId], { signal })).toString().trim();
      if (type !== "blob") throw new ArtifactHistoryError("artifact_integrity_failed");
      try { content = await git(repo, ["cat-file", "blob", objectId], { signal }); }
      catch (error) {
        if (error.code === 128) throw new ArtifactHistoryError("artifact_integrity_failed");
        throw error;
      }
    } catch (error) {
      if (error instanceof ArtifactHistoryError) throw error;
      if (error.code === 128) throw new ArtifactHistoryError("history_unavailable");
      throw error;
    }
    if (content.length !== bytes || sha256(content) !== digest) throw new ArtifactHistoryError("artifact_integrity_failed");
    return content;
  }

  async read(sessionId, digest, bytes, { signal } = {}) {
    if (!SHA256.test(digest) || !Number.isSafeInteger(bytes) || bytes < 0 || bytes > MAX_BYTES) throw new ArtifactHistoryError("artifact_integrity_failed");
    try {
      return await this.#read(this.repository(sessionId), digest, bytes, signal);
    } catch (error) {
      if (error instanceof ArtifactHistoryError || error.name === "AbortError") throw error;
      throw new ArtifactHistoryError("artifact_store_unavailable");
    }
  }

  async save(sessionId, content, digest, { signal } = {}) {
    if (!Buffer.isBuffer(content) || content.length > MAX_BYTES || !SHA256.test(digest) || sha256(content) !== digest) throw new ArtifactHistoryError("artifact_integrity_failed");
    const previous = this.queues.get(sessionId) ?? Promise.resolve();
    const operation = previous.catch(() => {}).then(async () => {
      cancelled(signal);
      await this.#requireGit();
      const repo = this.repository(sessionId);
      const exists = await this.#exists(repo);
      if (!this.initialized.has(repo)) {
        if (!exists) await mkdir(repo, { recursive: true, mode: 0o700 });
        // Re-init is idempotent and repairs an interrupted first init. A
        // cancelled init never becomes a permanent half-created repository.
        await git(repo, ["init", "--bare", "--quiet", "--object-format=sha256", "--template=", repo], { signal });
        this.initialized.add(repo);
      }
      const objectId = (await git(repo, ["hash-object", "-w", "--stdin"], { input: content, signal })).toString().trim();
      if (!SHA256.test(objectId)) throw new ArtifactHistoryError("artifact_integrity_failed");
      // Pin every saved value; no automatic ref deletion or GC policy in v1.
      // Existing same-digest refs must already resolve to the same bytes.
      try {
        await this.#read(repo, digest, content.length, signal);
      } catch (error) {
        if (!(error instanceof ArtifactHistoryError) || error.code !== "history_unavailable") throw error;
        await git(repo, ["update-ref", `refs/content-sha256/${digest}`, objectId, "0".repeat(64)], { signal });
      }
      await this.#read(repo, digest, content.length, signal);
      cancelled(signal);
    });
    this.queues.set(sessionId, operation);
    try {
      await operation;
    } catch (error) {
      if (error instanceof ArtifactHistoryError || error.name === "AbortError") throw error;
      throw new ArtifactHistoryError("artifact_store_unavailable");
    } finally {
      if (this.queues.get(sessionId) === operation) this.queues.delete(sessionId);
    }
  }
}
