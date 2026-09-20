// Offline rehearsal of the coding dogfood path against a REAL Host process.
//
// Unlike the in-process `ws_*` runtime smoke, this starts `server/index.mjs`
// as its own child on an ephemeral loopback port and drives only the public
// HTTP surface a browser would use: bootstrap, static WebUI document and
// assets, repository binding, private candidate, governed writes, the Host
// check recipe, and the candidate's diff/effects readers. It then stops that
// process and continues from durable state in a second, independent process.
//
// It always works on its OWN scratch instance, so the instance prepared for
// the operator's browser pass is never consumed here. The deterministic Local
// test provider drives the tool calls; no credential is configured, read or
// written, and the request token stays in memory and out of the report.
import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { parseArgs, promisify } from "node:util";
import { execFile } from "node:child_process";
import { createPreparation } from "./prepare-coding-dogfood.mjs";
import { KNOWN_BUG } from "../tests/fixtures/synthetic-repo/create-synthetic-repo.mjs";

const run = promisify(execFile);
const APP_DIR = path.resolve(fileURLToPath(new URL("..", import.meta.url)));
const SERVER_ENTRY = path.join(APP_DIR, "server", "index.mjs");
const CANDIDATE_ID = "b1f2c3d4-e5a6-4b7c-8d9e-0a1b2c3d4e5f";

const steps = [];
function record(step, facts) {
  steps.push({ step, ...facts });
  console.log(`ok  ${step}`);
}
const sha256 = (text) => createHash("sha256").update(Buffer.from(text, "utf8")).digest("hex");
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// --------------------------------------------------------------------------
// one real Host child process, addressed only over HTTP
// --------------------------------------------------------------------------

/**
 * End a child process and wait for it to be gone, escalating if it will not
 * cooperate. SIGTERM is the polite request the Host handles; a child that is
 * wedged, ignoring signals or stuck in shutdown still has to stop, or the
 * next Host cannot take the data directory's lock.
 */
async function terminate(child, { graceMs = 15000 } = {}) {
  if (child.exitCode !== null || child.signalCode !== null) {
    return { code: child.exitCode, signal: child.signalCode, escalated: false };
  }
  const exited = new Promise((resolve) => child.once("exit", (code, signal) => resolve({ code, signal })));
  child.kill("SIGTERM");
  const graceful = await Promise.race([exited, sleep(graceMs).then(() => null)]);
  if (graceful) return { ...graceful, escalated: false };
  child.kill("SIGKILL");
  return { ...(await exited), escalated: true };
}

/**
 * The child's whole environment, written out rather than inherited.
 *
 * `spawn` without `env` hands the child everything this shell happens to
 * hold. The Host strips `DEEPSEEK_API_KEY` and `OPENAI_API_KEY` itself, but
 * that is the Host's list, not a guarantee about every provider variable, and
 * a rehearsal should not depend on whoever ran it having a clean shell. This
 * fixture needs a path, a home and a temp directory; nothing else is passed,
 * so no credential or native runtime configuration can reach the child.
 */
function childEnvironment() {
  return {
    PATH: process.env.PATH ?? "/usr/bin:/bin",
    HOME: process.env.HOME ?? tmpdir(),
    TMPDIR: process.env.TMPDIR ?? tmpdir(),
    LANG: "C",
  };
}

/**
 * Start `server/index.mjs` on an ephemeral port and wait for the URL it
 * prints. The child is owned from `spawn` onwards: every way this can fail --
 * an early exit, a readiness timeout, a bootstrap that does not answer --
 * terminates it and waits for it to go, so no Host outlives a failed start
 * and no data-directory lock is left held.
 */
async function startHost(dataDir, label, { readinessMs = 30000 } = {}) {
  const child = spawn(process.execPath, [SERVER_ENTRY, "--data-dir", dataDir, "--port", "0"], {
    cwd: APP_DIR, stdio: ["ignore", "pipe", "pipe"], env: childEnvironment(),
  });
  let stdout = "", stderr = "";
  child.stdout.on("data", (chunk) => { stdout += chunk; });
  child.stderr.on("data", (chunk) => { stderr += chunk; });

  try {
    const deadline = Date.now() + readinessMs;
    let url = null;
    while (!url) {
      const match = stdout.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match) { url = match[0]; break; }
      if (child.exitCode !== null || child.signalCode !== null) {
        throw new Error(`Host ${label} exited before listening: ${stderr.trim() || stdout.trim() || "no output"}`);
      }
      if (Date.now() > deadline) {
        throw new Error(`Host ${label} did not print a URL within ${readinessMs} ms: ${stderr.trim() || stdout.trim() || "no output"}`);
      }
      await sleep(25);
    }

    // The work token authenticates every /api/v5 call. It is per-process, it is
    // held only here, and it never reaches the report or any durable file.
    const bootstrap = await (await fetch(`${url}/api/v5/bootstrap`)).json();
    const token = bootstrap.sessionToken;
    assert.ok(typeof token === "string" && token.length > 0, "bootstrap must hand a browser its work token");
    assert.equal(bootstrap.apiVersion, "v5");

    async function api(method, route, body) {
      const res = await fetch(`${url}/api/v5${route}`, {
        method,
        headers: { "content-type": "application/json", "x-work-token": token },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const text = await res.text();
      return { status: res.status, json: text ? JSON.parse(text) : null };
    }

    return {
      label, url, api, child, token,
      async get(pathname) {
        const res = await fetch(url + pathname);
        return { status: res.status, type: res.headers.get("content-type"), text: await res.text() };
      },
      async events(sessionId) {
        return (await api("GET", `/sessions/${sessionId}/events`)).json.events;
      },
      stop: () => terminate(child),
    };
  } catch (error) {
    // Readiness failed, so nobody else holds this child yet; it is ours to end.
    await terminate(child).catch(() => {});
    throw error;
  }
}

async function pollRun(host, runId, { until = (run) => !["running", "waiting_user", "stopping"].includes(run.status), timeoutMs = 60000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const { json } = await host.api("GET", `/runs/${runId}`);
    if (until(json.run)) return json.run;
    if (Date.now() > deadline) throw new Error(`run ${runId} stuck at ${json.run.status}`);
    await sleep(40);
  }
}

async function waitForEvent(host, sessionId, predicate, { timeoutMs = 60000 } = {}) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const match = (await host.events(sessionId)).find(predicate);
    if (match) return match;
    if (Date.now() > deadline) throw new Error("timed out waiting for an event");
    await sleep(40);
  }
}

/** PIDs of Host processes started from this server entry, live right now. */
async function hostPids() {
  try {
    const { stdout } = await run("pgrep", ["-f", `${SERVER_ENTRY} --data-dir`]);
    return stdout.split("\n").map((line) => Number(line.trim())).filter(Boolean);
  } catch { return []; }
}

const scriptInput = (calls) => `/fixture script ${JSON.stringify(calls)}`;
const runEvents = (events, runId) => events.filter((event) => event.runId === runId);

/**
 * Every persisted `check.*`/`repository.*` event, complete, in order.
 *
 * Compared as parsed objects -- the whole event including its full `data`
 * payload, not a chosen projection of a few fields, and not a claim about the
 * raw bytes on disk, which this reads back through the API and never sees.
 */
function durableEvents(events) {
  return events.filter((event) => event.type.startsWith("check.") || event.type.startsWith("repository."));
}

// --------------------------------------------------------------------------

async function rehearse(root) {
  const manifest = await createPreparation(root);
  record("prepared an independent scratch instance", {
    sourcePath: manifest.sourcePath, dataDir: manifest.dataDir, sourceHead: manifest.sourceRepository.head,
  });

  const report = {
    schemaVersion: 1,
    startedAt: new Date().toISOString(),
    transport: "public HTTP, separate Host process, ephemeral loopback port",
    provider: "fake-openai-loopback (Local test provider, deterministic)",
    realProvider: "not_run",
    browserInteraction: "not_run",
    source: { path: manifest.sourcePath, head: manifest.sourceRepository.head },
    toolchain: manifest.toolchain,
  };

  // ---- process 1 -------------------------------------------------------
  const first = await startHost(manifest.dataDir, "first");
  report.tokensUsed = [first.token];
  let sessionId, runIdSameRun, preStopEvents, preStopEffects;
  // The stop below is part of the scenario, so it is not in a `finally`; a
  // failure instead tears the child down through `stopOnFailure` so no Host
  // outlives this script.
  const stopOnFailure = async (error) => { await first.stop().catch(() => {}); throw error; };
  try {
    record("first Host process is listening on an ephemeral loopback port", { url: first.url.replace(/:\d+$/, ":<ephemeral>") });

    // The WebUI a browser would load, from this same process.
    const document = await first.get("/");
    assert.equal(document.status, 200);
    assert.match(document.type, /text\/html/);
    assert.match(document.text, /<title>/i);
    const asset = await first.get("/web/app.mjs");
    assert.equal(asset.status, 200);
    assert.match(asset.type, /javascript/);
    const styles = await first.get("/web/styles.css");
    assert.equal(styles.status, 200);
    const unauthorized = await fetch(`${first.url}/api/v5/projects`);
    assert.equal(unauthorized.status, 401, "the API refuses a request without the work token");
    record("WebUI document and assets are served and the API requires the token", {
      documentBytes: Buffer.byteLength(document.text), appModuleBytes: Buffer.byteLength(asset.text), unauthorizedStatus: unauthorized.status,
    });

    // ---- a Host that cannot start is still ours to clean up --------------
    // A second Host on a data directory this one already holds is a real,
    // operator-reachable failure (LOCK_BUSY), so it needs no injected fault.
    // What matters is that the failed child is gone afterwards: a survivor
    // would keep the lock and the restart below could never happen.
    const before = new Set(await hostPids());
    await assert.rejects(startHost(manifest.dataDir, "contending", { readinessMs: 20000 }),
      (error) => /exited before listening|did not print a URL/.test(error.message));
    const leaked = (await hostPids()).filter((pid) => !before.has(pid));
    assert.deepEqual(leaked, [], "a Host that failed to start must not outlive the attempt");

    // And a child that refuses SIGTERM is still ended, so a wedged Host can
    // never hold the lock indefinitely. The stub announces itself once its
    // handler is installed: signalling before that would only prove the
    // default disposition kills a process still in Node's bootstrap.
    const stubborn = spawn(process.execPath,
      ["-e", "process.on('SIGTERM', () => {}); setInterval(() => {}, 1000); console.log('ignoring');"],
      { stdio: ["ignore", "pipe", "ignore"], env: childEnvironment() });
    await new Promise((resolve, reject) => {
      stubborn.stdout.once("data", resolve);
      stubborn.once("exit", () => reject(new Error("the uncooperative stub exited before it was ready")));
      setTimeout(() => reject(new Error("the uncooperative stub never announced itself")), 10000);
    });
    const ended = await terminate(stubborn, { graceMs: 700 });
    assert.equal(ended.escalated, true, "an uncooperative child must be escalated to SIGKILL");
    assert.equal(ended.signal, "SIGKILL");
    assert.throws(() => process.kill(stubborn.pid, 0), /ESRCH/, "and must actually be gone");
    record("a failed start leaves no Host, and an uncooperative child is still ended", {
      startupFailure: "LOCK_BUSY on a held data directory", leakedProcesses: 0,
      uncooperativeChildEscalatedTo: ended.signal,
    });

    // An ordinary Chat, then the explicit repository connection on top of it.
    const project = (await first.api("POST", "/projects", { name: "Coding dogfood rehearsal" })).json.project;
    const session = (await first.api("POST", "/sessions", { projectId: project.id, title: "Fix the pagination defect", permissionMode: "ask" })).json.session;
    sessionId = session.id;
    assert.equal(session.repositoryBinding ?? null, null, "an ordinary Chat starts with no repository connected");

    const bound = await first.api("PUT", `/sessions/${sessionId}/repository-binding`, {
      operation: "bind", requestId: "dogfood-bind", expectedRevision: 0, rootPath: manifest.sourcePath,
    });
    assert.equal(bound.status, 200, JSON.stringify(bound.json));
    const afterBind = (await first.api("GET", `/sessions/${sessionId}`)).json.session;
    assert.equal(afterBind.id, sessionId, "connecting a resource keeps the same Chat identity");

    const created = await first.api("PUT", `/sessions/${sessionId}/repository-candidate`, {
      operation: "create", requestId: "dogfood-candidate", expectedRevision: 0, expectedBindingRevision: 1,
      candidateId: CANDIDATE_ID, baseCommit: manifest.sourceRepository.head,
    });
    assert.equal(created.status, 200, JSON.stringify(created.json));
    assert.equal(created.json.candidate.baseCommit, manifest.sourceRepository.head);
    assert.equal(created.json.candidate.writeRevision, 0);
    assert.equal(created.json.candidate.candidatePath, undefined, "the public candidate summary must omit Host paths");
    record("ordinary Chat bound one repository and started one private candidate", {
      sessionId, candidateId: CANDIDATE_ID, baseCommit: created.json.candidate.baseCommit, writeRevision: 0,
    });

    // ---- read the source, establish the failing check --------------------
    const run1 = (await first.api("POST", `/sessions/${sessionId}/runs`, {
      commandId: "dogfood-read-and-fail",
      input: scriptInput([
        { name: "repo_read", arguments: { path: KNOWN_BUG.path } },
        { name: "check_run", arguments: { recipeId: "node-test" } },
      ]),
    })).json.run;
    const askCheck1 = await waitForEvent(first, sessionId, (e) => e.runId === run1.id && e.type === "permission.open" && e.data.tool === "check_run");
    assert.equal(askCheck1.data.candidateWriteRevision, 0);
    assert.equal(askCheck1.data.cwd, "private candidate");
    assert.equal((await first.api("POST", `/runs/${run1.id}/questions/${askCheck1.data.id}`, { decision: "allow" })).status, 200);
    const finished1 = await pollRun(first, run1.id);
    assert.equal(finished1.status, "completed", JSON.stringify(finished1.error));

    const events1 = runEvents(await first.events(sessionId), run1.id);
    const read1 = events1.find((e) => e.type === "repository.read");
    assert.ok(read1, "reading the source records its own provenance event");
    const settled1 = events1.find((e) => e.type === "check.settled");
    assert.equal(settled1.data.status, "completed");
    assert.equal(settled1.data.exitCode, 1, "the known defect must make the Host check fail before any edit");
    record("read the source and established the failing Host check", {
      runId: run1.id, readPaths: read1.data.paths ?? read1.data.path ?? null,
      checkCallId: settled1.data.callId, exitCode: settled1.data.exitCode,
    });

    // ---- same Run: approved write, then check on that exact revision -----
    const original = await readFile(path.join(manifest.sourcePath, KNOWN_BUG.path), "utf8");
    assert.ok(original.includes(KNOWN_BUG.broken), "the fixture's defect line must still be in the source");
    const fixedText = original.replace(KNOWN_BUG.broken, KNOWN_BUG.fixed);

    const run2 = (await first.api("POST", `/sessions/${sessionId}/runs`, {
      commandId: "dogfood-fix-and-check",
      input: scriptInput([
        { name: "repo_write", arguments: { path: KNOWN_BUG.path, text: fixedText, expectedSha256: sha256(original) } },
        { name: "check_run", arguments: { recipeId: "node-test" } },
      ]),
    })).json.run;
    runIdSameRun = run2.id;
    const askWrite = await waitForEvent(first, sessionId, (e) => e.runId === run2.id && e.type === "permission.open" && e.data.tool === "repo_write");
    assert.equal(askWrite.data.path, KNOWN_BUG.path);
    assert.equal(askWrite.data.expectedSha256, sha256(original), "the approval names the exact prior bytes it replaces");
    assert.equal(askWrite.data.candidateId, CANDIDATE_ID);
    assert.equal((await first.api("POST", `/runs/${run2.id}/questions/${askWrite.data.id}`, { decision: "allow" })).status, 200);

    const askCheck2 = await waitForEvent(first, sessionId, (e) => e.runId === run2.id && e.type === "permission.open" && e.data.tool === "check_run");
    assert.equal(askCheck2.data.candidateWriteRevision, 1, "the check's approval must bind to the write this same Run just made");
    assert.equal((await first.api("POST", `/runs/${run2.id}/questions/${askCheck2.data.id}`, { decision: "allow" })).status, 200);
    const finished2 = await pollRun(first, run2.id);
    assert.equal(finished2.status, "completed", JSON.stringify(finished2.error));

    const events2 = runEvents(await first.events(sessionId), run2.id);
    const started2 = events2.find((e) => e.type === "check.started");
    const settled2 = events2.find((e) => e.type === "check.settled");
    assert.equal(started2.data.candidateWriteRevision, 1);
    assert.equal(settled2.data.callId, started2.data.callId);
    assert.equal(settled2.data.status, "completed");
    assert.equal(settled2.data.exitCode, 0, "the approved edit must make the same Host check pass");
    assert.notEqual(settled2.data.callId, settled1.data.callId, "a deliberately requested check is its own execution");
    record("same Run approved one exact write and one check bound to that revision", {
      runId: run2.id, approvedPath: askWrite.data.path, writeRevisionAtApproval: askCheck2.data.candidateWriteRevision,
      checkCallId: settled2.data.callId, exitCode: settled2.data.exitCode, durationMs: settled2.data.durationMs,
    });

    // ---- inspect the exact changes and results through the public readers -
    const diff = (await first.api("GET", `/sessions/${sessionId}/repository-candidate/diff`)).json;
    assert.equal(diff.candidateId, CANDIDATE_ID);
    assert.equal(diff.baseCommit, manifest.sourceRepository.head);
    assert.equal(diff.writeRevision, 1);
    assert.equal(diff.files.length, 1);
    assert.equal(diff.files[0].path, KNOWN_BUG.path);
    assert.match(diff.patch, new RegExp(`^-${KNOWN_BUG.broken.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
    assert.match(diff.patch, new RegExp(`^\\+${KNOWN_BUG.fixed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, "m"));
    assert.equal(diff.truncated, false);

    const effects = (await first.api("GET", `/sessions/${sessionId}/repository-candidate/effects`)).json;
    assert.equal(effects.effects.length, 1);
    const effect = effects.effects[0];
    assert.equal(effect.status, "confirmed");
    assert.equal(effect.path, KNOWN_BUG.path);
    assert.equal(effect.writeRevision, 1);
    assert.equal(effect.contentSha256, sha256(fixedText), "the receipt hashes the exact bytes the candidate now holds");
    assert.equal(effect.expectedSha256, sha256(original));
    assert.equal(effect.contentRef, undefined, "the public effects reader must not leak the Host content pointer");
    preStopEffects = effects.effects;
    record("inspected the exact candidate diff and write receipt", {
      files: diff.files.map((file) => file.path), patchSha256: diff.patchSha256, patchBytes: diff.patchBytes,
      effect: { id: effect.id, status: effect.status, path: effect.path, writeRevision: effect.writeRevision, bytes: effect.bytes },
    });

    // The connected source is still exactly what the operator handed over.
    const sourceNow = await readFile(path.join(manifest.sourcePath, KNOWN_BUG.path), "utf8");
    assert.equal(sourceNow, original, "the connected source repository must be untouched");
    const sourceStatus = (await run("git", ["status", "--porcelain"], { cwd: manifest.sourcePath })).stdout.trim();
    const sourceHeadNow = (await run("git", ["rev-parse", "HEAD"], { cwd: manifest.sourcePath })).stdout.trim();
    assert.equal(sourceStatus, "", "the source worktree must stay clean");
    assert.equal(sourceHeadNow, manifest.sourceRepository.head);
    record("the connected source repository is unchanged", { head: sourceHeadNow, worktreeClean: true });

    // ---- a cancelled check never starts a process ------------------------
    const run3 = (await first.api("POST", `/sessions/${sessionId}/runs`, {
      commandId: "dogfood-cancel-before-spawn",
      input: scriptInput([{ name: "check_run", arguments: { recipeId: "node-test" } }]),
    })).json.run;
    const askCheck3 = await waitForEvent(first, sessionId, (e) => e.runId === run3.id && e.type === "permission.open" && e.data.tool === "check_run");
    const cancelled = await first.api("POST", `/runs/${run3.id}/cancel`, {});
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.json.run.admissionOpen, false);
    await first.api("POST", `/runs/${run3.id}/questions/${askCheck3.data.id}`, { decision: "allow" });
    const finished3 = await pollRun(first, run3.id);
    const events3 = runEvents(await first.events(sessionId), run3.id);
    assert.equal(events3.some((e) => e.type === "check.started"), false, "a Run cancelled at its approval must never spawn a check");
    record("cancelling at the approval spawns nothing", {
      runId: run3.id, runStatus: finished3.status, checkStarted: false,
    });

    preStopEvents = durableEvents(await first.events(sessionId));
  } catch (error) { await stopOnFailure(error); }

  const firstExit = await first.stop();
  assert.equal(firstExit.signal ?? null, null, "the Host stops on SIGTERM without being killed");
  assert.equal(firstExit.escalated, false, "a clean stop must not need SIGKILL");
  record("stopped the first Host process", { exitCode: firstExit.code, signal: firstExit.signal, escalated: firstExit.escalated });

  // ---- process 2: continue from durable state ---------------------------
  const second = await startHost(manifest.dataDir, "second");
  report.tokensUsed.push(second.token);
  assert.notEqual(second.token, first.token, "a fresh Host process issues its own work token");
  try {
    const resumed = (await second.api("GET", `/sessions/${sessionId}`)).json.session;
    assert.equal(resumed.id, sessionId, "a fresh process resolves the same Chat");
    assert.equal(resumed.repositoryCandidate.id, CANDIDATE_ID, "and the same private candidate");
    assert.equal(resumed.repositoryCandidate.writeRevision, 1, "with no write replayed or added by the restart");
    assert.equal(resumed.repositoryCandidate.baseCommit, manifest.sourceRepository.head, "still pinned to its original base commit");

    const resumedEvents = durableEvents(await second.events(sessionId));
    assert.deepEqual(resumedEvents, preStopEvents,
      "every persisted check/repository event, payload included, must survive the restart unchanged");
    assert.ok(preStopEvents.length > 0, "the comparison must not pass by comparing two empty lists");
    const resumedEffects = (await second.api("GET", `/sessions/${sessionId}/repository-candidate/effects`)).json.effects;
    assert.deepEqual(resumedEffects, preStopEffects, "the write receipts are the same bytes after the restart");
    const resumedDiff = (await second.api("GET", `/sessions/${sessionId}/repository-candidate/diff`)).json;
    assert.equal(resumedDiff.writeRevision, 1);
    assert.equal(resumedDiff.files.length, 1);
    record("a fresh Host process resolved the same Chat, candidate and history", {
      sessionId, candidateId: resumed.repositoryCandidate.id, writeRevision: resumed.repositoryCandidate.writeRevision,
      comparison: "complete persisted check.*/repository.* events, parsed-object equality (not raw storage bytes)",
      durableEventsCompared: preStopEvents.length, durableEventsUnchanged: true, effectsUnchanged: true,
    });

    // ---- a NEW bounded task in the resumed Chat --------------------------
    const run4 = (await second.api("POST", `/sessions/${sessionId}/runs`, {
      commandId: "dogfood-continue-after-restart",
      input: scriptInput([
        { name: "candidate_read", arguments: { path: KNOWN_BUG.path } },
        { name: "check_run", arguments: { recipeId: "node-test" } },
      ]),
    })).json.run;
    const askCheck4 = await waitForEvent(second, sessionId, (e) => e.runId === run4.id && e.type === "permission.open" && e.data.tool === "check_run");
    assert.equal(askCheck4.data.candidateWriteRevision, 1, "the continued task sees the candidate as the restart left it");
    assert.equal((await second.api("POST", `/runs/${run4.id}/questions/${askCheck4.data.id}`, { decision: "allow" })).status, 200);
    const finished4 = await pollRun(second, run4.id);
    assert.equal(finished4.status, "completed", JSON.stringify(finished4.error));

    const events4 = runEvents(await second.events(sessionId), run4.id);
    const settled4 = events4.find((e) => e.type === "check.settled");
    assert.equal(settled4.data.exitCode, 0);
    // A check's identity is the (Run, call) pair the Host fences on, not the
    // call id alone: the deterministic provider numbers tool calls per Host
    // PROCESS, so a call id from before the restart legitimately reappears in
    // a later Run. Any evidence read across a restart must key on both.
    const starts = (await second.events(sessionId)).filter((e) => e.type === "check.started");
    const pairs = starts.map((e) => `${e.runId}/${e.data.callId}`);
    assert.equal(new Set(pairs).size, pairs.length, "every check execution has its own (Run, call) identity");
    assert.equal(new Set(starts.map((e) => e.runId)).size, starts.length, "no Run records two check executions here");
    const reusedCallIds = starts.length - new Set(starts.map((e) => e.data.callId)).size;
    const effectsAfterRun4 = (await second.api("GET", `/sessions/${sessionId}/repository-candidate/effects`)).json.effects;
    assert.deepEqual(effectsAfterRun4, preStopEffects, "a read-and-check task must add no write effect");
    record("continued a new bounded read/check task in the resumed Chat", {
      runId: run4.id, checkCallId: settled4.data.callId, exitCode: settled4.data.exitCode,
      distinctCheckExecutions: pairs.length, writesAdded: 0,
      fixtureCallIdsReusedAcrossProcesses: reusedCallIds,
    });

    // ---- a revoked candidate makes an approved check unrunnable ----------
    const run5 = (await second.api("POST", `/sessions/${sessionId}/runs`, {
      commandId: "dogfood-revoke-during-approval",
      input: scriptInput([{ name: "check_run", arguments: { recipeId: "node-test" } }]),
    })).json.run;
    const askCheck5 = await waitForEvent(second, sessionId, (e) => e.runId === run5.id && e.type === "permission.open" && e.data.tool === "check_run");
    const candidateBefore = (await second.api("GET", `/sessions/${sessionId}/repository-candidate`)).json;
    const revoked = await second.api("PUT", `/sessions/${sessionId}/repository-candidate`, {
      operation: "revoke", requestId: "dogfood-revoke", expectedRevision: candidateBefore.revision,
      expectedBindingRevision: 1, candidateId: CANDIDATE_ID,
    });
    assert.equal(revoked.status, 200, JSON.stringify(revoked.json));
    await second.api("POST", `/runs/${run5.id}/questions/${askCheck5.data.id}`, { decision: "allow" });
    const finished5 = await pollRun(second, run5.id);
    const events5 = runEvents(await second.events(sessionId), run5.id);
    const started5 = events5.find((e) => e.type === "check.started");
    const settled5 = events5.find((e) => e.type === "check.settled");
    record("revoking the candidate before the approval is honoured", {
      runId: run5.id, runStatus: finished5.status,
      checkStarted: Boolean(started5),
      checkSettledStatus: settled5?.data.status ?? null,
      checkExitCode: settled5?.data.exitCode ?? null,
    });
    assert.ok(!started5 || settled5?.data.exitCode !== 0,
      "a revoked candidate must not produce a clean check result for the old approval");

    // The revoke keeps the candidate's files; it does not write them back.
    const sourceAfterRevoke = await readFile(path.join(manifest.sourcePath, KNOWN_BUG.path), "utf8");
    assert.ok(sourceAfterRevoke.includes(KNOWN_BUG.broken), "revoking a candidate never writes it back to the source");

    report.sessionId = sessionId;
    report.sameRunWriteCheckRunId = runIdSameRun;
  } finally {
    const secondExit = await second.stop();
    record("stopped the second Host process", { exitCode: secondExit.code, signal: secondExit.signal, escalated: secondExit.escalated });
  }

  report.finishedAt = new Date().toISOString();
  report.steps = steps;
  report.result = "passed";
  return { report, manifest };
}

// --------------------------------------------------------------------------

const HELP = `Usage: node scripts/coding-dogfood-rehearsal.mjs [--root PATH]

  --root PATH   Scratch instance for this rehearsal. Defaults to a fresh
                temporary directory. Never point this at the instance
                prepared for the browser pass -- the rehearsal fixes the
                defect, and the operator must open an unfixed one.
  --help        Show this help.
`;

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))) {
  const { values } = parseArgs({ options: { root: { type: "string" }, help: { type: "boolean" } } });
  if (values.help) {
    console.log(HELP);
  } else {
    const root = values.root ?? await mkdtemp(path.join(tmpdir(), "cw-dogfood-rehearsal-"));
    try {
      const { report, manifest } = await rehearse(root);
      const reportPath = path.join(manifest.root, "rehearsal-report.json");
      const tokens = report.tokensUsed;
      delete report.tokensUsed;
      const serialized = JSON.stringify(report, null, 2) + "\n";
      // The work token is request authentication, not evidence: it stays in
      // memory for the run and never reaches a durable file.
      for (const token of tokens) {
        assert.ok(!serialized.includes(token), "the report must not carry a work token");
      }
      await writeFile(reportPath, serialized);
      console.log(`\nrehearsal passed · report ${reportPath}`);
    } catch (error) {
      steps.push({ step: "FAILED", message: error.message });
      console.error(`\nrehearsal failed: ${error.message}`);
      console.error(error.stack);
      process.exitCode = 1;
    }
  }
}
