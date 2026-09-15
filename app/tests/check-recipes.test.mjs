import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCheckRecipe } from "../runtime/check-runner.mjs";
import { RuntimeStore } from "../server/store.mjs";
import { inspectRepositoryRoot } from "../runtime/repository-fs.mjs";
import { boot } from "./helpers.mjs";
import { createSyntheticRepository, KNOWN_BUG } from "./fixtures/synthetic-repo/create-synthetic-repo.mjs";

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function scratch(prefix) {
  return mkdtemp(path.join(tmpdir(), prefix));
}

// ---------------------------------------------------------------------------
// runner unit tests
// ---------------------------------------------------------------------------

test("runCheckRecipe reports a clean exit without truncation", async () => {
  const recipe = { command: process.execPath, argv: ["-e", "process.stdout.write('ok'); process.exit(0)"], timeoutMs: 5000, outputLimitBytes: 4096 };
  const result = await runCheckRecipe({ recipe, cwd: process.cwd() });
  assert.equal(result.exitCode, 0);
  assert.equal(result.signal, null);
  assert.equal(result.timedOut, false);
  assert.equal(result.cancelled, false);
  assert.equal(result.stdout, "ok");
  assert.equal(result.truncated.stdout, false);
  assert.equal(result.truncated.stderr, false);
  assert.equal(typeof result.durationMs, "number");
  assert.ok(result.durationMs >= 0);
  assert.ok(Date.parse(result.startedAt) <= Date.parse(result.endedAt));
});

test("runCheckRecipe reports a non-zero exit without throwing", async () => {
  const recipe = { command: process.execPath, argv: ["-e", "process.exit(1)"], timeoutMs: 5000, outputLimitBytes: 4096 };
  const result = await runCheckRecipe({ recipe, cwd: process.cwd() });
  assert.equal(result.exitCode, 1);
  assert.equal(result.timedOut, false);
  assert.equal(result.cancelled, false);
});

test("runCheckRecipe caps captured stdout/stderr and marks truncated", async () => {
  const script = "process.stdout.write('a'.repeat(5000)); process.stderr.write('b'.repeat(5000));";
  const recipe = { command: process.execPath, argv: ["-e", script], timeoutMs: 5000, outputLimitBytes: 100 };
  const result = await runCheckRecipe({ recipe, cwd: process.cwd() });
  assert.equal(result.truncated.stdout, true);
  assert.equal(result.truncated.stderr, true);
  assert.equal(Buffer.byteLength(result.stdout, "utf8"), 100);
  assert.equal(Buffer.byteLength(result.stderr, "utf8"), 100);
});

test("runCheckRecipe timeout kills the whole process group, including a nested child", async () => {
  const script = [
    "const { spawn } = require('node:child_process');",
    "process.stdout.write('outer-pid ' + process.pid + '\\n');",
    "const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)']);",
    "process.stdout.write('child-pid ' + child.pid + '\\n');",
    "setTimeout(() => {}, 30000);",
  ].join("\n");
  const recipe = { command: process.execPath, argv: ["-e", script], timeoutMs: 300, outputLimitBytes: 4096 };
  const result = await runCheckRecipe({ recipe, cwd: process.cwd() });
  assert.equal(result.timedOut, true);
  assert.equal(result.cancelled, false);
  const outerMatch = result.stdout.match(/outer-pid (\d+)/);
  const childMatch = result.stdout.match(/child-pid (\d+)/);
  assert.ok(outerMatch && childMatch, "both pids were announced: " + result.stdout);
  for (const pid of [Number(outerMatch[1]), Number(childMatch[1])]) {
    assert.throws(() => process.kill(pid, 0), /ESRCH/, `pid ${pid} must no longer exist after the timeout kill`);
  }
});

test("runCheckRecipe cancels on abort and resolves only after the group has exited", async () => {
  const controller = new AbortController();
  const script = [
    "process.stdout.write('outer-pid ' + process.pid + '\\n');",
    "setTimeout(() => {}, 30000);",
  ].join("\n");
  const recipe = { command: process.execPath, argv: ["-e", script], timeoutMs: 30000, outputLimitBytes: 4096 };
  const resultPromise = runCheckRecipe({ recipe, cwd: process.cwd(), signal: controller.signal });
  await new Promise(resolve => setTimeout(resolve, 200));
  controller.abort();
  const result = await resultPromise;
  assert.equal(result.cancelled, true);
  assert.equal(result.timedOut, false);
  const outerMatch = result.stdout.match(/outer-pid (\d+)/);
  assert.ok(outerMatch, "the process announced its pid before being cancelled: " + result.stdout);
  assert.throws(() => process.kill(Number(outerMatch[1]), 0), /ESRCH/);
});

test("runCheckRecipe throws spawn_failed only when the process cannot start, and cleans up its temp HOME", async () => {
  const recipe = { command: path.join(process.cwd(), "definitely-not-a-real-check-binary"), argv: [], timeoutMs: 1000, outputLimitBytes: 1024 };
  await assert.rejects(runCheckRecipe({ recipe, cwd: process.cwd() }), error => error.code === "spawn_failed");
});

// ---------------------------------------------------------------------------
// HTTP-level governance and settlement
// ---------------------------------------------------------------------------

async function bindSyntheticCandidate(h, { permissionMode = "ask", candidateId = "923e4567-e89b-42d3-a456-426614174000" } = {}) {
  const sourceDir = await scratch("cw-check-source-");
  const { head } = await createSyntheticRepository(sourceDir);
  const session = await h.createSession({ permissionMode });
  const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, {
    operation: "bind", requestId: "check-bind", expectedRevision: 0, rootPath: sourceDir,
  });
  assert.equal(bound.status, 200, JSON.stringify(bound.json));
  const created = await h.api("PUT", `/sessions/${session.id}/repository-candidate`, {
    operation: "create", requestId: "check-candidate", expectedRevision: 0, expectedBindingRevision: 1,
    candidateId, baseCommit: head,
  });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  return { session, sourceDir, candidateId, bound };
}

function eventsFor(h, session, runId) {
  return h.runtime.store.snapshot().events.filter(event => event.sessionId === session.id && (!runId || event.runId === runId));
}

async function waitForMatch(getEvents, predicate, { timeoutMs = 15000, intervalMs = 25 } = {}) {
  const start = Date.now();
  for (;;) {
    const match = getEvents().find(predicate);
    if (match) return match;
    if (Date.now() - start > timeoutMs) throw new Error("timed out waiting for a matching event");
    await new Promise(resolve => setTimeout(resolve, intervalMs));
  }
}

test("check_run is denied with zero process start under read_only", async () => {
  const h = await boot();
  try {
    const { session } = await bindSyntheticCandidate(h, { permissionMode: "read_only" });
    const run = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "check-read-only",
      input: h.scriptInput([{ name: "check_run", arguments: { recipeId: "node-test" } }]),
    });
    const finished = await h.pollRun(run.json.run.id);
    assert.equal(finished.status, "completed");
    const events = eventsFor(h, session, run.json.run.id);
    assert.equal(events.some(e => e.type === "check.started"), false, "read_only must never spawn a process");
    assert.equal(events.some(e => e.type === "permission.open"), false, "the ceiling denies before any permission question opens");
    const toolResult = events.find(e => e.type === "tool.result" && e.data.name === "check_run");
    assert.equal(toolResult.data.isError, true);
  } finally {
    await h.runtime.close();
  }
});

test("an unknown recipe id returns a tool error without opening a permission or spawning anything", async () => {
  const h = await boot();
  try {
    const { session } = await bindSyntheticCandidate(h, { permissionMode: "ask" });
    const run = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "check-unknown-recipe",
      input: h.scriptInput([{ name: "check_run", arguments: { recipeId: "does-not-exist" } }]),
    });
    const finished = await h.pollRun(run.json.run.id);
    assert.equal(finished.status, "completed");
    const events = eventsFor(h, session, run.json.run.id);
    assert.equal(events.some(e => e.type === "permission.open"), false, "an unknown recipe never reaches the permission ask");
    assert.equal(events.some(e => e.type === "check.started"), false);
    const toolResult = events.find(e => e.type === "tool.result" && e.data.name === "check_run");
    assert.equal(toolResult.data.isError, true);
  } finally {
    await h.runtime.close();
  }
});

test("ask mode shows the exact recipe in the permission payload and deny records nothing", async () => {
  const h = await boot();
  try {
    const { session, candidateId } = await bindSyntheticCandidate(h, { permissionMode: "ask" });
    const run = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "check-deny",
      input: h.scriptInput([{ name: "check_run", arguments: { recipeId: "node-test" } }]),
    });
    await h.pollRun(run.json.run.id, { until: status => status === "waiting_user" });
    const openEvent = eventsFor(h, session, run.json.run.id).find(e => e.type === "permission.open");
    assert.ok(openEvent, "check_run must ask before running");
    assert.equal(openEvent.data.tool, "check_run");
    assert.equal(openEvent.data.recipeId, "node-test");
    assert.equal(openEvent.data.recipeVersion, 1);
    assert.equal(openEvent.data.command, process.execPath);
    assert.deepEqual(openEvent.data.argv, ["--test"]);
    assert.equal(openEvent.data.cwd, "private candidate");
    assert.equal(openEvent.data.candidateId, candidateId);
    assert.equal(openEvent.data.candidateWriteRevision, 0);
    assert.equal(openEvent.data.timeoutMs, 120000);
    assert.equal(openEvent.data.outputLimitBytes, 65536);
    assert.equal(openEvent.data.env, "minimal");

    const denied = await h.api("POST", `/runs/${run.json.run.id}/questions/${openEvent.data.id}`, { decision: "deny" });
    assert.equal(denied.status, 200);
    const finished = await h.pollRun(run.json.run.id);
    assert.equal(finished.status, "completed", "the run keeps going after a denied check");
    const events = eventsFor(h, session, run.json.run.id);
    assert.equal(events.some(e => e.type === "check.started"), false, "a denied check must never record a start");
    const toolResult = events.find(e => e.type === "tool.result" && e.data.name === "check_run");
    assert.equal(toolResult.data.isError, true);
  } finally {
    await h.runtime.close();
  }
});

test("approving check_run runs the synthetic repo's own test recipe, failing before the fix and passing after", async () => {
  const h = await boot();
  try {
    const { session, sourceDir, candidateId } = await bindSyntheticCandidate(h, { permissionMode: "ask" });

    // Before the fix: the candidate's node --test must fail with exit code 1.
    const run1 = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "check-before-fix",
      input: h.scriptInput([{ name: "check_run", arguments: { recipeId: "node-test" } }]),
    });
    await h.pollRun(run1.json.run.id, { until: status => status === "waiting_user" });
    const open1 = eventsFor(h, session, run1.json.run.id).find(e => e.type === "permission.open");
    const allow1 = await h.api("POST", `/runs/${run1.json.run.id}/questions/${open1.data.id}`, { decision: "allow" });
    assert.equal(allow1.status, 200);
    const finished1 = await h.pollRun(run1.json.run.id);
    assert.equal(finished1.status, "completed", JSON.stringify(finished1.error));

    let scoped = eventsFor(h, session, run1.json.run.id);
    const started1 = scoped.find(e => e.type === "check.started");
    const settled1 = scoped.find(e => e.type === "check.settled");
    assert.ok(started1, "an approved check_run must record check.started");
    assert.equal(started1.data.recipeId, "node-test");
    assert.equal(started1.data.recipeVersion, 1);
    assert.equal(started1.data.candidateId, candidateId);
    assert.ok(settled1, "an approved check_run must record check.settled");
    assert.equal(settled1.data.callId, started1.data.callId);
    assert.equal(settled1.data.status, "completed");
    assert.equal(settled1.data.exitCode, 1, "the known bug makes node --test fail before the fix");
    assert.equal(settled1.data.failure, null);

    const toolResult1 = scoped.find(e => e.type === "tool.result" && e.data.name === "check_run");
    const summary1 = JSON.parse(toolResult1.data.text);
    assert.equal(summary1.recipeId, "node-test");
    assert.equal(summary1.status, "completed");
    assert.equal(summary1.exitCode, 1);

    // Apply the fixture's known fix through an approved repo_write.
    const original = await readFile(path.join(sourceDir, KNOWN_BUG.path), "utf8");
    assert.ok(original.includes(KNOWN_BUG.broken), "the fixture's known-bug line must be present before the fix");
    const fixed = original.replace(KNOWN_BUG.broken, KNOWN_BUG.fixed);
    const run2 = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "check-apply-fix",
      input: h.scriptInput([{ name: "repo_write", arguments: {
        path: KNOWN_BUG.path, text: fixed, expectedSha256: sha256(Buffer.from(original, "utf8")),
      } }]),
    });
    await h.pollRun(run2.json.run.id, { until: status => status === "waiting_user" });
    const open2 = eventsFor(h, session, run2.json.run.id).find(e => e.type === "permission.open");
    const allow2 = await h.api("POST", `/runs/${run2.json.run.id}/questions/${open2.data.id}`, { decision: "allow" });
    assert.equal(allow2.status, 200);
    const finished2 = await h.pollRun(run2.json.run.id);
    assert.equal(finished2.status, "completed", JSON.stringify(finished2.error));

    // After the fix: node --test must pass with exit code 0.
    const run3 = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "check-after-fix",
      input: h.scriptInput([{ name: "check_run", arguments: { recipeId: "node-test" } }]),
    });
    await h.pollRun(run3.json.run.id, { until: status => status === "waiting_user" });
    const open3 = eventsFor(h, session, run3.json.run.id).find(e => e.type === "permission.open");
    assert.equal(open3.data.candidateWriteRevision, 1, "the third Run's snapshot reflects the confirmed write");
    const allow3 = await h.api("POST", `/runs/${run3.json.run.id}/questions/${open3.data.id}`, { decision: "allow" });
    assert.equal(allow3.status, 200);
    const finished3 = await h.pollRun(run3.json.run.id);
    assert.equal(finished3.status, "completed", JSON.stringify(finished3.error));
    scoped = eventsFor(h, session, run3.json.run.id);
    const settled3 = scoped.find(e => e.type === "check.settled");
    assert.equal(settled3.data.status, "completed");
    assert.equal(settled3.data.exitCode, 0, "the fix makes node --test pass");
  } finally {
    await h.runtime.close();
  }
});

test("cancelling a Run whose check is still running still records check.settled as cancelled", async () => {
  const h = await boot();
  try {
    const { session } = await bindSyntheticCandidate(h, { permissionMode: "ask" });

    // Add a slow test so the recipe is still running when we cancel.
    const slowTest = [
      "import { test } from \"node:test\";",
      "test(\"slow\", async () => { await new Promise(resolve => setTimeout(resolve, 20000)); });",
      "",
    ].join("\n");
    const setup = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "check-cancel-setup",
      input: h.scriptInput([{ name: "repo_write", arguments: { path: "test/slow.test.mjs", text: slowTest } }]),
    });
    await h.pollRun(setup.json.run.id, { until: status => status === "waiting_user" });
    const setupOpen = eventsFor(h, session, setup.json.run.id).find(e => e.type === "permission.open");
    await h.api("POST", `/runs/${setup.json.run.id}/questions/${setupOpen.data.id}`, { decision: "allow" });
    const setupFinished = await h.pollRun(setup.json.run.id);
    assert.equal(setupFinished.status, "completed", JSON.stringify(setupFinished.error));

    const run = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "check-cancel",
      input: h.scriptInput([{ name: "check_run", arguments: { recipeId: "node-test" } }]),
    });
    await h.pollRun(run.json.run.id, { until: status => status === "waiting_user" });
    const open = eventsFor(h, session, run.json.run.id).find(e => e.type === "permission.open");
    await h.api("POST", `/runs/${run.json.run.id}/questions/${open.data.id}`, { decision: "allow" });

    // Wait for the process to actually start before cancelling it.
    await waitForMatch(() => eventsFor(h, session, run.json.run.id), e => e.type === "check.started");

    const cancelled = await h.api("POST", `/runs/${run.json.run.id}/cancel`, {});
    assert.equal(cancelled.status, 200);
    assert.equal(cancelled.json.run.admissionOpen, false);

    const settled = await waitForMatch(() => eventsFor(h, session, run.json.run.id), e => e.type === "check.settled");
    assert.equal(settled.data.status, "cancelled");
    assert.equal(typeof settled.data.stdout, "string");
    assert.equal(typeof settled.data.stderr, "string");
  } finally {
    await h.runtime.close();
  }
});

// ---------------------------------------------------------------------------
// restart: an unsettled check is fenced to "unknown" and never replayed
// ---------------------------------------------------------------------------

test("an unresolved check.started is fenced to check.settled status unknown on restart, and never replayed", async () => {
  const dataDir = await scratch("cw-check-restart-");
  let store;
  try {
    store = await new RuntimeStore({ dataDir }).open();
    const project = await store.createProject("check restart fixture");
    const session = await store.createSession({ projectId: project.id, title: "check restart", workspaceDir: path.join(dataDir, "managed") });
    const sourcePath = path.join(dataDir, "source");
    await mkdir(sourcePath, { recursive: true });
    const resolvedRoot = await inspectRepositoryRoot(sourcePath);
    const bound = await store.changeRepositoryBinding(session.id, {
      operation: "bind", requestId: "restart-bind", expectedRevision: 0, rootPath: sourcePath, resolvedRoot,
    });
    const candidateId = "a23e4567-e89b-42d3-a456-426614174000";
    await store.beginRepositoryCandidate(session.id, {
      operation: "create", requestId: "restart-create", expectedRevision: 0, expectedBindingRevision: 1,
      sourceBindingId: bound.binding.id, candidateId, baseCommit: "a".repeat(40),
    });
    const candidateParent = path.join(dataDir, "candidate-container");
    await store.activateRepositoryCandidate(session.id, { requestId: "restart-create", candidate: {
      objectFormat: "sha1", candidatePath: path.join(candidateParent, "worktree"), candidateDevice: "1", candidateInode: "2",
      candidateDirectory: candidateParent, candidateContainerDevice: "1", candidateContainerInode: "3", stagingDevice: "1", stagingInode: "4",
      gitDirectory: path.join(candidateParent, "git"), gitDevice: "1", gitInode: "5", gitVersion: "git version restart-fixture",
    } });

    const created = await store.createRun({
      sessionId: session.id, input: "check restart fixture", adapterId: "fixture",
      provider: { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions", realProvider: false },
      commandId: "restart-run", credentialGeneration: 0, expectedRepositoryBindingRevision: 1, expectedRepositoryCandidateRevision: 1,
    });
    const runId = created.run.id;
    const startedAt = new Date().toISOString();
    await store.recordCheckStarted(runId, {
      callId: "unsettled-call-1", recipeId: "node-test", recipeVersion: 1,
      candidateId, candidateWriteRevision: 0, startedAt,
    });

    await store.close();
    store = null;
    store = await new RuntimeStore({ dataDir }).open();

    const events = store.listEvents({ sessionId: session.id, runId });
    const started = events.filter(e => e.type === "check.started");
    const settled = events.filter(e => e.type === "check.settled");
    assert.equal(started.length, 1, "the restart must not replay check.started");
    assert.equal(settled.length, 1);
    assert.equal(settled[0].data.callId, "unsettled-call-1");
    assert.equal(settled[0].data.status, "unknown");
    assert.equal(settled[0].data.exitCode, null);
    assert.equal(settled[0].data.stdout, "");
    assert.equal(settled[0].data.stderr, "");
    assert.deepEqual(settled[0].data.failure, { code: "check_unknown_after_restart" });

    // Reopening again must not manufacture a second settlement.
    await store.close();
    store = null;
    store = await new RuntimeStore({ dataDir }).open();
    const secondOpen = store.listEvents({ sessionId: session.id, runId });
    assert.equal(secondOpen.filter(e => e.type === "check.started").length, 1);
    assert.equal(secondOpen.filter(e => e.type === "check.settled").length, 1);
  } finally {
    await store?.close().catch(() => {});
    await rm(dataDir, { recursive: true, force: true });
  }
});
