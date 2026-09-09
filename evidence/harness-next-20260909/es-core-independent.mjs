import assert from "node:assert/strict";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { spawn, spawnSync } from "node:child_process";
import { tmpdir } from "node:os";
import path from "node:path";
import { createInterface } from "node:readline";
import { once } from "node:events";
import { fileURLToPath } from "node:url";

// The harness never imports the active working tree's Core. It materializes
// the requested commit's three Python Core files into a temporary source root,
// then launches that exact bridge. This keeps an ES_CODE_SHA label from
// silently selecting a different product implementation.
const requestedSha = process.env.ES_CODE_SHA ?? process.argv[2];
if (!requestedSha) throw new Error("usage: ES_CODE_SHA=<commit> [ES_EXPECT_FIXED=1] node evidence/harness-next-20260909/es-core-independent.mjs");
const expectFixed = process.env.ES_EXPECT_FIXED === "1";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PYTHON = process.env.WORK_AGENT_PYTHON ?? "python3";
const sha = (value) => createHash("sha256").update(value, "utf8").digest("hex");
const contract = "se-file-memo-v1";
const sourceText = "Approved source 😀";
const source = { id: "source-1", version: 1, text: sourceText, digest: sha(sourceText) };
const evidence = [{
  source_id: source.id,
  source_version: source.version,
  start: 0,
  end: Array.from(source.text).length,
  quote: source.text,
  digest: source.digest,
}];

function resolveCommit(value) {
  const result = spawnSync("git", ["rev-parse", `${value}^{commit}`], { cwd: repoRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return result.stdout.trim();
}

async function materializeSources(commit) {
  const root = await mkdtemp(path.join(tmpdir(), "cw-es-core-source-"));
  const files = ["app/core/core.py", "app/core/bridge.py", "app/core/file_candidates.py"];
  const loaded = [];
  try {
    for (const relative of files) {
      const result = spawnSync("git", ["show", `${commit}:${relative}`], {
        cwd: repoRoot, encoding: "utf8", maxBuffer: 4_000_000,
      });
      assert.equal(result.status, 0, result.stderr || result.stdout);
      const target = path.join(root, path.basename(relative));
      await writeFile(target, result.stdout, "utf8");
      loaded.push({ path: relative, sha256: sha(result.stdout) });
    }
    return { root, loaded };
  } catch (error) {
    await rm(root, { recursive: true, force: true });
    throw error;
  }
}

class Bridge {
  constructor(root, db) {
    this.root = root;
    this.db = db;
    this.child = spawn(PYTHON, ["-u", path.join(root, "bridge.py"), "--db", db, "--mode", "b0"], {
      cwd: root,
      env: {
        PATH: process.env.PATH ?? "/usr/bin:/bin",
        PYTHONNOUSERSITE: "1", PYTHONHASHSEED: "0", LANG: "C.UTF-8", LC_ALL: "C.UTF-8",
      },
      stdio: ["pipe", "pipe", "pipe"],
    });
    this.child.stderr.setEncoding("utf8");
    this.stderr = "";
    this.child.stderr.on("data", (chunk) => { this.stderr += chunk; });
    this.lines = createInterface({ input: this.child.stdout, crlfDelay: Infinity });
    this.pending = new Map();
    this.sequence = 0;
    this.ready = false;
    this.first = new Promise((resolve, reject) => {
      this.resolveFirst = resolve;
      this.rejectFirst = reject;
      this.firstTimer = setTimeout(() => reject(new Error(`bridge ready timeout (${this.root})`)), 5_000);
    });
    this.lines.on("line", (line) => {
      let message;
      try { message = JSON.parse(line); }
      catch (error) { this.rejectFirst?.(new Error(`invalid bridge JSON: ${error.message}`)); return; }
      if (!this.ready) {
        clearTimeout(this.firstTimer);
        this.resolveFirst?.(message);
        this.resolveFirst = null;
        this.rejectFirst = null;
        return;
      }
      const waiter = this.pending.get(message?.id);
      if (!waiter) return;
      this.pending.delete(message.id);
      if (message.ok === true) waiter.resolve(message.result);
      else waiter.reject(Object.assign(new Error(message.error?.detail ?? "bridge operation failed"), {
        code: message.error?.code ?? "CORE_ERROR", detail: message.error?.detail ?? "",
      }));
    });
    this.child.on("exit", (code, signal) => {
      const error = Object.assign(new Error(`bridge exited code=${code} signal=${signal}; ${this.stderr}`), { code: "CORE_UNAVAILABLE" });
      this.rejectFirst?.(error);
      for (const waiter of this.pending.values()) waiter.reject(error);
      this.pending.clear();
    });
  }

  async start() {
    const message = await this.first;
    if (message.ready !== true) {
      const error = Object.assign(new Error(message.error?.detail ?? "bridge refused startup"), {
        code: message.error?.code ?? "CORE_UNAVAILABLE", detail: message.error?.detail ?? "",
      });
      await this.waitExit();
      throw error;
    }
    this.ready = true;
    return message;
  }

  async call(op, payload = {}) {
    if (!this.ready) throw new Error("bridge is not ready");
    const id = `independent-${++this.sequence}`;
    const result = new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
    this.child.stdin.write(JSON.stringify({ id, op, ...payload }) + "\n");
    return result;
  }

  async waitExit() {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    await once(this.child, "exit");
  }

  async close() {
    if (this.child.exitCode !== null || this.child.signalCode !== null) return;
    if (this.ready) {
      try { await this.call("close"); } catch { /* process may already be gone */ }
    }
    this.ready = false;
    this.child.stdin.end();
    await Promise.race([this.waitExit(), new Promise((resolve) => setTimeout(() => { this.child.kill("SIGTERM"); resolve(); }, 2_000))]);
    try { this.lines.close(); } catch { /* already closed */ }
  }
}

async function openBridge(root, db) {
  const bridge = new Bridge(root, db);
  try { await bridge.start(); return bridge; }
  catch (error) { await bridge.close(); throw error; }
}

const file = ({ content = "A😀\n", sessionId = "session-1", runId = "run-1", recordIndex = 0, writtenAt = "2026-09-09T00:00:00.000Z" } = {}) => ({
  path: "out/memo.txt", sha256: sha(content), bytes: Buffer.byteLength(content, "utf8"), content,
  sessionId, runId, recordIndex, kind: "content-version", writtenAt,
});

const payload = ({ id = "candidate-1", runId = "run-1", evidenceValue = evidence } = {}) => ({
  id, matter_id: "matter-1", run_id: runId, base_version: 0, source_version: 1,
  contract_version: contract, artifact_text: "Source-backed memo.", evidence: evidenceValue, obligations: [],
});
const context = (runId = "run-1") => ({ matter_id: "matter-1", run_id: runId });

function mutateVerification(db, coordinateDigest) {
  const script = String.raw`import hashlib,json,sqlite3,sys
db=sys.argv[1]
coordinate=sys.argv[2]=='1'
conn=sqlite3.connect(db)
raw=conn.execute("SELECT record_json FROM candidate_verification WHERE candidate_id='candidate-1'").fetchone()[0]
record=json.loads(raw)
record['result']='passed'
record['reasons']=[]
canonical=json.dumps(record,ensure_ascii=False,sort_keys=True,separators=(',',':'))
columns={row[1] for row in conn.execute("PRAGMA table_info(candidate_verification)")}
if coordinate and 'record_digest' in columns:
  conn.execute("UPDATE candidate_verification SET record_json=?,record_digest=? WHERE candidate_id='candidate-1'",(canonical,hashlib.sha256(canonical.encode('utf-8')).hexdigest()))
else:
  conn.execute("UPDATE candidate_verification SET record_json=? WHERE candidate_id='candidate-1'",(canonical,))
conn.commit()
conn.close()`;
  const result = spawnSync(PYTHON, ["-c", script, db, coordinateDigest ? "1" : "0"], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
}

function dbRows(db, query) {
  const script = "import json,sqlite3,sys; c=sqlite3.connect(sys.argv[1]); print(json.dumps(c.execute(sys.argv[2]).fetchall()))";
  const result = spawnSync(PYTHON, ["-c", script, db, query], { encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  return JSON.parse(result.stdout);
}

async function fixture(root, { runId = "run-1", sessionRef = "session-1", candidateId = "candidate-1", skipInitialize = false } = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "cw-es-core-independent-"));
  const db = path.join(dataDir, "state.db");
  let bridge;
  try {
    bridge = await openBridge(root, db);
    await bridge.call("create_matter", { matter_id: "matter-1", title: "Files", source, contract_version: contract, draft: "" });
    await bridge.call("create_run", {
      run_id: runId, matter_id: "matter-1", base_version: 0, source_version: 1,
      contract_version: contract, preset_version: "preset-1", session_ref: sessionRef,
      instruction: "Use fixed sources", provider: null, model: null, provider_config: {},
    });
    if (!skipInitialize) await bridge.call("initialize_file_run", {
      context: context(runId),
      input: { systemPrompt: "Host", currentContext: "Fixed", runtimeProfile: { revision: 1, hash: sha("runtime") }, cleanSession: true, reasons: [] },
    });
    return { root, dataDir, db, bridge, runId, sessionRef, candidateId };
  } catch (error) {
    await bridge?.close();
    await rm(dataDir, { recursive: true, force: true });
    throw error;
  }
}

async function saveAndCloseRun(fix, files, value = payload({ id: fix.candidateId, runId: fix.runId })) {
  await fix.bridge.call("save_file_candidate", { context: context(fix.runId), payload: value, files });
  await fix.bridge.call("update_run", { run_id: fix.runId, status: "completed", admission_open: false, error: null, candidate_id: null, ended_at: null });
}

async function validPositiveProbe(root) {
  const fix = await fixture(root);
  try {
    await saveAndCloseRun(fix, [file()]);
    const result = await fix.bridge.call("trusted_decide", { request: {
      request_id: "valid-accept", matter_id: "matter-1", candidate_id: "candidate-1", base_version: 0, action: "accept", reason: "independent positive",
    } });
    assert.equal(result.version, 1);
    const page = await fix.bridge.call("file_query", {
      matter_id: "matter-1", context: null, kind: "file-content", candidate_id: null,
      artifact_id: result.active_artifact, path: "out/memo.txt", offset: 0, limit: 100,
    });
    assert.equal(page.text, "A😀\n");
    return { name: "valid-recorded-file-accept", status: "passed", decision: result };
  } finally { await fix.bridge.close(); await rm(fix.dataDir, { recursive: true, force: true }); }
}

async function tamperedVerificationProbe(root, coordinateDigest) {
  const fix = await fixture(root);
  try {
    await saveAndCloseRun(fix, [file()], payload({ evidenceValue: [] }));
    const before = dbRows(fix.db, "SELECT record_json FROM candidate_verification WHERE candidate_id='candidate-1'");
    assert.equal(JSON.parse(before[0][0]).result, "failed");
    await fix.bridge.close();
    mutateVerification(fix.db, coordinateDigest);
    const reopened = await openBridge(root, fix.db);
    try {
      let error = null;
      let result = null;
      try {
        result = await reopened.call("trusted_decide", { request: {
          request_id: coordinateDigest ? "tampered-coordinated" : "tampered-accept", matter_id: "matter-1", candidate_id: "candidate-1", base_version: 0, action: "accept", reason: "independent corruption probe",
        } });
      } catch (caught) { error = caught; }
      const sideEffects = {
        matterVersion: dbRows(fix.db, "SELECT version FROM matter WHERE id='matter-1'")[0][0],
        decisions: dbRows(fix.db, "SELECT count(*) FROM decision")[0][0],
        artifacts: dbRows(fix.db, "SELECT count(*) FROM artifact")[0][0],
      };
      if (!expectFixed) {
        assert.equal(error, null, error?.message);
        assert.equal(result.version, 1);
        assert.deepEqual(sideEffects, { matterVersion: 1, decisions: 1, artifacts: 1 });
        return { name: coordinateDigest ? "verification-result-tamper-with-digest" : "verification-result-tamper", status: "accepted", decision: result };
      }
      assert.ok(error, "tampered verification unexpectedly accepted");
      assert.ok(["INTEGRITY_REFUSAL", "VERIFICATION_REQUIRED"].includes(error.code), error.message);
      assert.deepEqual(sideEffects, { matterVersion: 0, decisions: 0, artifacts: 0 });
      return { name: coordinateDigest ? "verification-result-tamper-with-digest" : "verification-result-tamper", status: "rejected", code: error.code, sideEffects };
    } finally { await reopened.close(); }
  } finally {
    await fix.bridge.close();
    await rm(fix.dataDir, { recursive: true, force: true });
  }
}

async function nullSessionProbe(root) {
  const fix = await fixture(root, { sessionRef: null, skipInitialize: true });
  try {
    let error = null;
    try {
      await fix.bridge.call("initialize_file_run", {
        context: context(fix.runId),
        input: { systemPrompt: "Host", currentContext: "Fixed", runtimeProfile: { revision: 1, hash: sha("runtime") }, cleanSession: true, reasons: [] },
      });
    } catch (caught) { error = caught; }
    if (expectFixed) {
      assert.ok(error, "null Session ID unexpectedly initialized");
      assert.ok(["BINDING_MISMATCH", "INVALID"].includes(error.code), error.message);
      assert.deepEqual(dbRows(fix.db, "SELECT count(*) FROM file_run_basis"), [[0]]);
      return { name: "null-session-provenance", status: "rejected", code: error.code };
    }
    assert.equal(error, null, error?.message);
    await saveAndCloseRun(fix, [file({ sessionId: null })]);
    const result = await fix.bridge.call("trusted_decide", { request: {
      request_id: "null-session-accept", matter_id: "matter-1", candidate_id: "candidate-1", base_version: 0, action: "accept", reason: "independent provenance probe",
    } });
    assert.equal(result.version, 1);
    return { name: "null-session-provenance", status: "accepted", decision: result };
  } finally { await fix.bridge.close(); await rm(fix.dataDir, { recursive: true, force: true }); }
}

async function timestampProbe(root) {
  const fix = await fixture(root);
  try {
    let error = null;
    try { await fix.bridge.call("save_file_candidate", { context: context(fix.runId), payload: payload(), files: [file({ writtenAt: "not-a-timestamp" })] }); }
    catch (caught) { error = caught; }
    if (expectFixed) {
      assert.ok(error, "malformed writtenAt unexpectedly saved");
      assert.equal(error.code, "INVALID", error.message);
      assert.deepEqual(dbRows(fix.db, "SELECT count(*) FROM candidate"), [[0]]);
      return { name: "malformed-writtenAt", status: "rejected", code: error.code };
    }
    assert.equal(error, null, error?.message);
    await fix.bridge.call("update_run", { run_id: fix.runId, status: "completed", admission_open: false, error: null, candidate_id: null, ended_at: null });
    const result = await fix.bridge.call("trusted_decide", { request: {
      request_id: "bad-time-accept", matter_id: "matter-1", candidate_id: "candidate-1", base_version: 0, action: "accept", reason: "independent provenance probe",
    } });
    assert.equal(result.version, 1);
    return { name: "malformed-writtenAt", status: "accepted", decision: result };
  } finally { await fix.bridge.close(); await rm(fix.dataDir, { recursive: true, force: true }); }
}

const resolvedSha = resolveCommit(requestedSha);
const sources = await materializeSources(resolvedSha);
let outcomes;
try {
  if (expectFixed) {
    outcomes = [
      await validPositiveProbe(sources.root),
      await tamperedVerificationProbe(sources.root, false),
      await tamperedVerificationProbe(sources.root, true),
      await nullSessionProbe(sources.root),
      await timestampProbe(sources.root),
    ];
  } else {
    outcomes = [
      await tamperedVerificationProbe(sources.root, false),
      await nullSessionProbe(sources.root),
      await timestampProbe(sources.root),
    ];
  }
} finally { await rm(sources.root, { recursive: true, force: true }); }

console.log(JSON.stringify({ requestedSha, resolvedSha, expectFixed, loadedSources: sources.loaded, outcomes }, null, 2));
