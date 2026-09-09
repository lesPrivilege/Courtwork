import assert from "node:assert/strict";
import { copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { once } from "node:events";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { fileURLToPath } from "node:url";

// The old source is deliberately fixed to the pre-file contract revision.
// Supply the reviewed new Core/bridge commit explicitly as ES_CODE_SHA (or the
// first positional argument); an uncommitted working tree is never a source.
const OLD_SHA = "a7a08f035cc5a716b8c7a93024cdfe4e44e4c07d";
const NEW_SHA = process.env.ES_CODE_SHA ?? process.argv[2];
if (!NEW_SHA) {
  throw new Error("usage: ES_CODE_SHA=<reviewed-commit> node evidence/harness-next-20260909/es-schema-independent.mjs");
}

const scriptRoot = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptRoot, "../..");
const PYTHON = process.env.WORK_AGENT_PYTHON ?? "python3";
const json = (value) => JSON.stringify(value, null, 2);
const sha256 = (value) => createHash("sha256").update(value).digest("hex");
const fileSha = async (file) => sha256(await readFile(file));

function extractFile(sha, relative, destination) {
  const result = spawnSync("git", ["show", `${sha}:${relative}`], {
    cwd: repoRoot,
    encoding: "utf8",
    maxBuffer: 2_000_000,
  });
  if (result.status !== 0) {
    throw new Error(`git show ${sha}:${relative} failed: ${result.stderr || result.error || "unknown error"}`);
  }
  return writeFile(destination, result.stdout, "utf8");
}

async function materializeSources(root) {
  const oldRoot = path.join(root, "old-core");
  const newRoot = path.join(root, "new-core");
  await Promise.all([
    mkdir(oldRoot, { recursive: true }),
    mkdir(newRoot, { recursive: true }),
  ]);
  await Promise.all([
    extractFile(OLD_SHA, "app/core/core.py", path.join(oldRoot, "core.py")),
    extractFile(OLD_SHA, "app/core/bridge.py", path.join(oldRoot, "bridge.py")),
    extractFile(NEW_SHA, "app/core/core.py", path.join(newRoot, "core.py")),
    extractFile(NEW_SHA, "app/core/bridge.py", path.join(newRoot, "bridge.py")),
    extractFile(NEW_SHA, "app/core/file_candidates.py", path.join(newRoot, "file_candidates.py")),
  ]);
  return { oldRoot, newRoot };
}

class Bridge {
  constructor(root, db) {
    this.root = root;
    this.db = db;
    this.child = spawn(PYTHON, ["-u", path.join(root, "bridge.py"), "--db", db, "--mode", "b0"], {
      cwd: root,
      env: {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        PYTHONNOUSERSITE: "1",
        PYTHONHASHSEED: "0",
        LANG: "C.UTF-8",
        LC_ALL: "C.UTF-8",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child.stderr.setEncoding("utf8");
    this.stderr = "";
    this.child.stderr.on("data", (chunk) => { this.stderr += chunk; });
    this.lines = createInterface({ input: this.child.stdout, crlfDelay: Infinity });
    this.pending = new Map();
    this.sequence = 0;
    this.first = new Promise((resolve, reject) => {
      this.resolveFirst = resolve;
      this.rejectFirst = reject;
      this.firstTimer = setTimeout(() => reject(new Error(`bridge ready timeout (${root})`)), 5_000);
    });
    this.lines.on("line", (line) => {
      let message;
      try {
        message = JSON.parse(line);
      } catch (error) {
        this.rejectFirst?.(new Error(`bridge emitted invalid JSON: ${error.message}`));
        return;
      }
      if (!this.ready) {
        clearTimeout(this.firstTimer);
        this.ready = message.ready === true;
        this.resolveFirst(message);
        this.resolveFirst = null;
        this.rejectFirst = null;
        return;
      }
      const waiter = this.pending.get(message?.id);
      if (!waiter) return;
      this.pending.delete(message.id);
      if (message.ok === true) waiter.resolve(message.result);
      else waiter.reject(Object.assign(new Error(message.error?.detail ?? "bridge operation failed"), {
        code: message.error?.code ?? "CORE_ERROR",
        detail: message.error?.detail ?? "",
      }));
    });
    this.child.on("exit", (code, signal) => {
      const error = Object.assign(new Error(`bridge exited code=${code} signal=${signal}; ${this.stderr}`), {
        code: "CORE_UNAVAILABLE",
      });
      this.rejectFirst?.(error);
      for (const waiter of this.pending.values()) waiter.reject(error);
      this.pending.clear();
    });
  }

  async start() {
    const message = await this.first;
    if (message.ready !== true) {
      const error = Object.assign(new Error(message.error?.detail ?? "bridge refused startup"), {
        code: message.error?.code ?? "CORE_UNAVAILABLE",
        detail: message.error?.detail ?? "",
      });
      await this.waitExit();
      throw error;
    }
    return message;
  }

  async call(op, payload = {}) {
    if (!this.ready) throw new Error("bridge is not ready");
    const id = `independent-${++this.sequence}`;
    const request = JSON.stringify({ id, op, ...payload }) + "\n";
    const result = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.child.stdin.write(request);
    return result;
  }

  async waitExit() {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    await once(this.child, "exit");
  }

  async close() {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    if (this.ready) {
      try { await this.call("close"); } catch { /* startup/close failures are already observed */ }
    }
    this.child.stdin.end();
    await Promise.race([
      this.waitExit(),
      new Promise((resolve) => setTimeout(() => {
        this.child.kill("SIGTERM");
        resolve();
      }, 2_000)),
    ]);
    try { this.lines.close(); } catch { /* already closed */ }
  }
}

async function openBridge(root, db) {
  const bridge = new Bridge(root, db);
  try {
    const ready = await bridge.start();
    return { bridge, ready };
  } catch (error) {
    await bridge.close();
    throw error;
  }
}

async function expectStartupFailure(root, db) {
  const bridge = new Bridge(root, db);
  try {
    await bridge.start();
    await bridge.close();
  } catch (error) {
    await bridge.close();
    return { code: error.code ?? "CORE_UNAVAILABLE", detail: error.detail ?? error.message };
  }
  throw new Error("bridge unexpectedly accepted an invalid database");
}

async function copyDatabase(source, destination) {
  await mkdir(path.dirname(destination), { recursive: true });
  await copyFile(source, destination);
}

function mutateDatabase(db, source) {
  const result = spawnSync(PYTHON, ["-c", source, db], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

const sourceText = "Approved legacy source 😀";
const source = { id: "legacy-source", version: 1, text: sourceText, digest: sha256(sourceText) };
const context = {
  text: "Legacy context",
  provenance: {
    matterId: "legacy-matter",
    stateVersion: 0,
    sourceVersion: 1,
    contractVersion: "memo-v1",
  },
};
const candidate = {
  id: "legacy-candidate",
  matter_id: "legacy-matter",
  run_id: "legacy-run",
  base_version: 0,
  source_version: 1,
  contract_version: "memo-v1",
  artifact_text: "Legacy memo draft",
  evidence: [{
    source_id: source.id,
    source_version: source.version,
    start: 0,
    end: Array.from(source.text).length,
    quote: source.text,
    digest: source.digest,
  }],
  obligations: [],
};
const decision = {
  request_id: "legacy-decision",
  matter_id: "legacy-matter",
  candidate_id: candidate.id,
  base_version: 0,
  action: "accept",
  reason: "Independent migration probe",
};

async function seedOldDatabase(oldRoot, db) {
  const { bridge, ready } = await openBridge(oldRoot, db);
  try {
    await bridge.call("create_matter", {
      matter_id: "legacy-matter",
      title: "Legacy memo",
      source,
      contract_version: "memo-v1",
      draft: "",
    });
    await bridge.call("create_run", {
      run_id: "legacy-run",
      matter_id: "legacy-matter",
      base_version: 0,
      source_version: 1,
      contract_version: "memo-v1",
      preset_version: "preset-legacy",
      session_ref: "legacy-session",
      instruction: "Prepare a memo",
      provider: null,
      model: null,
      provider_config: {},
      work_context: context,
    });
    await bridge.call("save_candidate", {
      payload: candidate,
      context: { matter_id: "legacy-matter", run_id: "legacy-run" },
    });
    const receipt = await bridge.call("trusted_decide", { request: decision });
    const snapshot = await bridge.call("snapshot", { matter_id: "legacy-matter" });
    return { ready, receipt, snapshot, digest: snapshot.core_state_digest };
  } finally {
    await bridge.close();
  }
}

async function inspectWithOld(oldRoot, db) {
  const { bridge, ready } = await openBridge(oldRoot, db);
  try {
    const snapshot = await bridge.call("snapshot", { matter_id: "legacy-matter" });
    const replay = await bridge.call("query_request", { request_id: decision.request_id });
    return { ready, snapshot, replay, digest: snapshot.core_state_digest };
  } finally {
    await bridge.close();
  }
}

async function migrateAndInspect(newRoot, db) {
  const { bridge, ready } = await openBridge(newRoot, db);
  try {
    const snapshot = await bridge.call("snapshot", { matter_id: "legacy-matter" });
    const replay = await bridge.call("query_request", { request_id: decision.request_id });
    const run = await bridge.call("get_run", { run_id: "legacy-run" });
    return { ready, snapshot, replay, run, digest: snapshot.core_state_digest };
  } finally {
    await bridge.close();
  }
}

async function main() {
  const temp = await mkdtemp(path.join(tmpdir(), "cw-es-schema-independent-"));
  try {
    const { oldRoot, newRoot } = await materializeSources(temp);
    const originalDb = path.join(temp, "legacy.db");
    const seeded = await seedOldDatabase(oldRoot, originalDb);
    const originalBytesHash = await fileSha(originalDb);

    const upgradedDb = path.join(temp, "upgrade", "state.db");
    await copyDatabase(originalDb, upgradedDb);
    const upgraded = await migrateAndInspect(newRoot, upgradedDb);
    const backup = `${upgradedDb}.pre-file-core-v2-app-v3.bak`;
    assert.equal(upgraded.ready.core_schema_version, 2);
    assert.equal(upgraded.ready.app_schema_version, 3);
    assert.equal(upgraded.digest, seeded.digest, "Core state digest changed during app/file schema migration");
    assert.deepEqual(upgraded.replay, seeded.receipt, "Decision receipt changed during migration");
    assert.equal(await fileSha(originalDb), originalBytesHash, "migration must operate on an isolated copy");
    // SQLite's online backup may repack pages, so compare the opened old
    // schema's Core digest and Decision receipt below rather than raw bytes.

    const backupDb = path.join(temp, "backup-open", "state.db");
    await copyDatabase(backup, backupDb);
    const backupOpened = await inspectWithOld(oldRoot, backupDb);
    assert.equal(backupOpened.digest, seeded.digest, "old schema backup has a different Core digest");
    assert.deepEqual(backupOpened.replay, seeded.receipt, "old schema backup has a different decision receipt");

    const oldReject = await expectStartupFailure(oldRoot, upgradedDb);
    assert.equal(oldReject.code, "SCHEMA_NEWER", "old Core must reject the upgraded user_version");

    const negative = {};
    const missingProjectionDb = path.join(temp, "negative-missing-projection", "state.db");
    await copyDatabase(originalDb, missingProjectionDb);
    mutateDatabase(missingProjectionDb, `
import sqlite3, sys
db = sqlite3.connect(sys.argv[1])
db.execute('DROP TABLE app_run_context')
db.execute('CREATE TABLE app_run_context (run_id TEXT PRIMARY KEY, FOREIGN KEY(run_id) REFERENCES app_run(id))')
db.commit()
db.close()
`);
    const missingAfterMutation = await fileSha(missingProjectionDb);
    const missing = await expectStartupFailure(newRoot, missingProjectionDb);
    const missingAfterFailure = await fileSha(missingProjectionDb);
    negative.missingProjection = { ...missing, dbShaBefore: missingAfterMutation, dbShaAfter: missingAfterFailure };
    assert.equal(missing.code, "SCHEMA_INVALID");
    assert.equal(missingAfterFailure, missingAfterMutation, "missing projection failure mutated DB");

    const malformedFileDb = path.join(temp, "negative-malformed-file-table", "state.db");
    await copyDatabase(originalDb, malformedFileDb);
    mutateDatabase(malformedFileDb, `
import sqlite3, sys
db = sqlite3.connect(sys.argv[1])
db.execute('CREATE TABLE candidate_file_bundle (candidate_id TEXT PRIMARY KEY)')
db.commit()
db.close()
`);
    const malformedBefore = await fileSha(malformedFileDb);
    const malformed = await expectStartupFailure(newRoot, malformedFileDb);
    const malformedAfterFailure = await fileSha(malformedFileDb);
    negative.malformedFileTable = { ...malformed, dbShaBefore: malformedBefore, dbShaAfter: malformedAfterFailure };
    assert.equal(malformed.code, "SCHEMA_INVALID");
    assert.equal(malformedAfterFailure, malformedBefore, "malformed file schema failure mutated DB");

    const preexistingDb = path.join(temp, "negative-preexisting-backup", "state.db");
    await copyDatabase(originalDb, preexistingDb);
    const preexistingBefore = await fileSha(preexistingDb);
    const preexistingBackup = `${preexistingDb}.pre-file-core-v2-app-v3.bak`;
    const sentinel = Buffer.from("pre-existing-backup-sentinel", "utf8");
    await writeFile(preexistingBackup, sentinel);
    const preexisting = await expectStartupFailure(newRoot, preexistingDb);
    const preexistingAfterFailure = await fileSha(preexistingDb);
    const preexistingBackupAfterFailure = await fileSha(preexistingBackup);
    negative.preexistingBackup = {
      ...preexisting,
      dbShaBefore: preexistingBefore,
      dbShaAfter: preexistingAfterFailure,
      backupSha: sha256(sentinel),
      backupShaAfter: preexistingBackupAfterFailure,
    };
    assert.equal(preexisting.code, "SCHEMA_INVALID");
    assert.equal(preexistingAfterFailure, preexistingBefore, "pre-existing backup failure mutated DB");
    assert.equal(preexistingBackupAfterFailure, sha256(sentinel), "pre-existing backup was overwritten");

    return {
      oldSha: OLD_SHA,
      newSha: NEW_SHA,
      originalDbSha256: originalBytesHash,
      old: {
        ready: seeded.ready,
        coreStateDigest: seeded.digest,
        decision: seeded.receipt,
      },
      upgrade: {
        ready: upgraded.ready,
        coreStateDigest: upgraded.digest,
        decision: upgraded.replay,
        backupPath: ".pre-file-core-v2-app-v3.bak",
        backupDbSha256: await fileSha(backup),
        oldBridgeReject: oldReject,
        oldBackupOpen: {
          coreStateDigest: backupOpened.digest,
          decision: backupOpened.replay,
        },
      },
      negative,
      status: "passed",
      tempDataOnly: true,
    };
  } finally {
    await rm(temp, { recursive: true, force: true });
  }
}

try {
  const result = await main();
  process.stdout.write(`${json(result)}\n`);
} catch (error) {
  process.stderr.write(`${error.stack ?? error}\n`);
  process.exitCode = 1;
}
