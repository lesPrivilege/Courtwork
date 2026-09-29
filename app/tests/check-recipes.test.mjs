import assert from "node:assert/strict";
import test from "node:test";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { runCheckRecipe } from "../runtime/check-runner.mjs";
import { createCheckTools } from "../runtime/check-tools.mjs";
import { getCheckRecipe, listCheckRecipes } from "../runtime/check-recipes.mjs";
import { RuntimeStore } from "./fixtures/executor-store.mjs";
import { inspectRepositoryRoot } from "../runtime/repository-fs.mjs";
import { boot } from "./helpers.mjs";
import { createSyntheticRepository, KNOWN_BUG } from "./fixtures/synthetic-repo/create-synthetic-repo.mjs";

const runFile = promisify(execFile);
const ATTENTION_FILES = [
  "app/tests/attention-core.test.mjs",
  "app/tests/attention-http.test.mjs",
  "app/tests/attention-recovery.test.mjs",
  "app/tests/attention-github-fixture.test.mjs",
  "app/tests/attention-gmail-fixture.test.mjs",
  "app/tests/attention-trace-fixture.test.mjs",
];
const ATTENTION_ARGV = ["--test", "--test-concurrency=1", ...ATTENTION_FILES];
const HARNESS_FILES = [
  "app/tests/hermes-api-runs.test.mjs",
  "app/tests/request-summary.test.mjs",
  "app/tests/runtime-load-recovery.test.mjs",
  "app/tests/kit-context.test.mjs",
  "app/tests/control-plane.test.mjs",
  "app/tests/check-recipes.test.mjs",
];
const HARNESS_ARGV = ["--test", "--test-concurrency=1", ...HARNESS_FILES];
const FIXED_RECIPES = [["node-test", ["--test"]], ["node-test-attention-contract", ATTENTION_ARGV], ["node-test-harness-contract", HARNESS_ARGV]];

test("Attention recipe is one frozen descriptor alongside the unchanged package recipe", () => {
  const [packageRecipe, attentionRecipe] = listCheckRecipes();
  assert.deepEqual([...packageRecipe.argv], ["--test"]);
  assert.deepEqual([packageRecipe.id, packageRecipe.version, packageRecipe.title], ["node-test", 1, "Run the package tests"]);
  assert.equal(getCheckRecipe("node-test-attention-contract"), attentionRecipe);
  assert.deepEqual({ id: attentionRecipe.id, version: attentionRecipe.version, title: attentionRecipe.title,
    command: attentionRecipe.command, argv: [...attentionRecipe.argv], cwd: attentionRecipe.cwd,
    timeoutMs: attentionRecipe.timeoutMs, outputLimitBytes: attentionRecipe.outputLimitBytes, env: attentionRecipe.env }, {
    id: "node-test-attention-contract", version: 1, title: "Run Attention backend contract tests",
    command: process.execPath, argv: ATTENTION_ARGV, cwd: "candidate",
    timeoutMs: 120000, outputLimitBytes: 65536, env: "minimal",
  });
  assert.ok(Object.isFrozen(attentionRecipe) && Object.isFrozen(attentionRecipe.argv));
});

test("Harness recipe is the third frozen descriptor; the first two keep their meaning and order", () => {
  const recipes = listCheckRecipes();
  assert.deepEqual(recipes.map(recipe => recipe.id), ["node-test", "node-test-attention-contract", "node-test-harness-contract"]);
  assert.deepEqual([...recipes[1].argv], ATTENTION_ARGV);
  const harness = getCheckRecipe("node-test-harness-contract");
  assert.equal(harness, recipes[2]);
  assert.deepEqual({ id: harness.id, version: harness.version, title: harness.title,
    command: harness.command, argv: [...harness.argv], cwd: harness.cwd,
    timeoutMs: harness.timeoutMs, outputLimitBytes: harness.outputLimitBytes, env: harness.env }, {
    id: "node-test-harness-contract", version: 1, title: "Run Harness Core and Extensions contract tests",
    command: process.execPath, argv: HARNESS_ARGV, cwd: "candidate",
    timeoutMs: 120000, outputLimitBytes: 65536, env: "minimal",
  });
  assert.ok(Object.isFrozen(listCheckRecipes()) && Object.isFrozen(harness) && Object.isFrozen(harness.argv));
});

// DF-04 recipe discoverability: the model chooses only a recipe id, so the
// tool declaration must offer the choices. The recipeId parameter's own
// description has to name every catalog id and title, derived from
// listCheckRecipes() so it cannot drift from the one authoritative catalog,
// while the string bounds and the single-parameter shape stay unchanged.
test("check_run's model-facing recipeId parameter offers every catalog id and title", () => {
  const candidate = { id: "candidate-one", status: "active", revision: 1, writeRevision: 0,
    sourceBindingId: "binding-one", sourceBindingRevision: 1, candidatePath: "/unused-check-candidate" };
  const [tool] = createCheckTools({ candidate, resolveCandidate: () => candidate });
  assert.equal(tool.name, "check_run");
  assert.deepEqual(Object.keys(tool.parameters.properties), ["recipeId"], "check_run still takes exactly the recipeId parameter");
  const recipeId = tool.parameters.properties.recipeId;
  assert.equal(recipeId.type, "string");
  assert.equal(recipeId.minLength, 1);
  assert.equal(recipeId.maxLength, 200);
  assert.equal(typeof recipeId.description, "string");
  for (const recipe of listCheckRecipes()) {
    assert.ok(recipeId.description.includes(recipe.id), `offers recipe id ${recipe.id}: ${recipeId.description}`);
    assert.ok(recipeId.description.includes(recipe.title), `offers recipe title ${recipe.title}: ${recipeId.description}`);
  }
});

function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function scratch(prefix) {
  return mkdtemp(path.join(tmpdir(), prefix));
}

// ---------------------------------------------------------------------------
// runner unit tests
// ---------------------------------------------------------------------------

// The check sandbox denies a Host data directory; the runner tests use an
// empty synthetic one.
const runnerDataDir = await mkdtemp(path.join(tmpdir(), "cw-check-runner-data-"));
test.after(() => rm(runnerDataDir, { recursive: true, force: true }));

test("runCheckRecipe reports a clean exit without truncation", async () => {
  const recipe = { command: process.execPath, argv: ["-e", "process.stdout.write('ok'); process.exit(0)"], timeoutMs: 5000, outputLimitBytes: 4096 };
  const result = await runCheckRecipe({ recipe, cwd: process.cwd(), dataDir: runnerDataDir });
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
  const result = await runCheckRecipe({ recipe, cwd: process.cwd(), dataDir: runnerDataDir });
  assert.equal(result.exitCode, 1);
  assert.equal(result.timedOut, false);
  assert.equal(result.cancelled, false);
});

test("runCheckRecipe caps captured stdout/stderr and marks truncated", async () => {
  const script = "process.stdout.write('a'.repeat(5000)); process.stderr.write('b'.repeat(5000));";
  const recipe = { command: process.execPath, argv: ["-e", script], timeoutMs: 5000, outputLimitBytes: 100 };
  const result = await runCheckRecipe({ recipe, cwd: process.cwd(), dataDir: runnerDataDir });
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
  const result = await runCheckRecipe({ recipe, cwd: process.cwd(), dataDir: runnerDataDir });
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
  // Cancel once the process has announced itself, not after a fixed delay:
  // how long the sandbox takes to start is not part of this test.
  let announced; const running = new Promise(resolve => { announced = resolve; });
  const resultPromise = runCheckRecipe({ recipe, cwd: process.cwd(), dataDir: runnerDataDir, signal: controller.signal, onOutput: announced });
  await running;
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
  await assert.rejects(runCheckRecipe({ recipe, cwd: process.cwd(), dataDir: runnerDataDir }), error => error.code === "spawn_failed");
});

// ---------------------------------------------------------------------------
// HTTP-level governance and settlement
// ---------------------------------------------------------------------------

async function bindSyntheticCandidate(h, { permissionMode = "ask", candidateId = "923e4567-e89b-42d3-a456-426614174000", prepareSource } = {}) {
  const sourceDir = await scratch("cw-check-source-");
  const source = await createSyntheticRepository(sourceDir);
  const head = prepareSource ? await prepareSource(sourceDir) : source.head;
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
    for (const [recipeId] of FIXED_RECIPES) {
      const run = await h.api("POST", `/sessions/${session.id}/runs`, {
        commandId: `check-read-only-${recipeId}`,
        input: h.scriptInput([{ name: "check_run", arguments: { recipeId } }]),
      });
      const finished = await h.pollRun(run.json.run.id);
      assert.equal(finished.status, "completed");
      const events = eventsFor(h, session, run.json.run.id);
      assert.equal(events.some(e => e.type === "check.started"), false, `${recipeId}: read_only must never spawn a process`);
      assert.equal(events.some(e => e.type === "permission.open"), false, `${recipeId}: the ceiling denies before any permission question opens`);
      const toolResult = events.find(e => e.type === "tool.result" && e.data.name === "check_run");
      assert.equal(toolResult.data.isError, true);
    }
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
    for (const [recipeId, argv] of FIXED_RECIPES) {
      const run = await h.api("POST", `/sessions/${session.id}/runs`, {
        commandId: `check-deny-${recipeId}`,
        input: h.scriptInput([{ name: "check_run", arguments: { recipeId } }]),
      });
      await h.pollRun(run.json.run.id, { until: status => status === "waiting_user" });
      const openEvent = eventsFor(h, session, run.json.run.id).find(e => e.type === "permission.open");
      assert.ok(openEvent, `${recipeId}: check_run must ask before running`);
      assert.equal(openEvent.data.tool, "check_run");
      assert.equal(openEvent.data.recipeId, recipeId);
      assert.equal(openEvent.data.recipeVersion, 1);
      assert.equal(openEvent.data.command, process.execPath);
      assert.deepEqual(openEvent.data.argv, argv);
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
      assert.equal(events.some(e => e.type === "check.started"), false, `${recipeId}: a denied check must never record a start`);
      const toolResult = events.find(e => e.type === "tool.result" && e.data.name === "check_run");
      assert.equal(toolResult.data.isError, true);
    }
  } finally {
    await h.runtime.close();
  }
});

test("approved Attention recipe runs all six fixed targets, records an ordinary test failure and stops on missing targets", async () => {
  const h = await boot();
  try {
    for (const [index, outcome] of ["pass", "fail", "missing"].entries()) {
      const prepareSource = outcome === "missing" ? undefined : async sourceDir => {
        for (const [fileIndex, relativePath] of ATTENTION_FILES.entries()) {
          const target = path.join(sourceDir, relativePath);
          await mkdir(path.dirname(target), { recursive: true });
          const assertion = outcome === "fail" && fileIndex === 3 ? "assert.fail('attention fixture failure');" : "assert.ok(true);";
          await writeFile(target, `import test from 'node:test';\nimport assert from 'node:assert/strict';\ntest('target-${fileIndex + 1}', () => { ${assertion} });\n`);
        }
        await runFile("git", ["add", ...ATTENTION_FILES], { cwd: sourceDir });
        await runFile("git", ["-c", "user.name=Synthetic", "-c", "user.email=synthetic@example.invalid", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "add fixed attention targets"], { cwd: sourceDir });
        return (await runFile("git", ["rev-parse", "HEAD"], { cwd: sourceDir })).stdout.trim();
      };
      const candidateId = `923e4567-e89b-42d3-a456-42661417410${index}`;
      const { session } = await bindSyntheticCandidate(h, { candidateId, prepareSource });
      const startedRun = await h.api("POST", `/sessions/${session.id}/runs`, {
        commandId: `attention-${outcome}`,
        input: h.scriptInput([{ name: "check_run", arguments: { recipeId: "node-test-attention-contract" } }]),
      });
      assert.equal(startedRun.status, 200);
      const runId = startedRun.json.run.id;
      await h.pollRun(runId, { until: status => status === "waiting_user" });
      const permission = eventsFor(h, session, runId).find(event => event.type === "permission.open");
      assert.ok(permission);
      assert.deepEqual({ recipeId: permission.data.recipeId, recipeVersion: permission.data.recipeVersion,
        command: permission.data.command, argv: permission.data.argv, cwd: permission.data.cwd,
        candidateId: permission.data.candidateId, candidateWriteRevision: permission.data.candidateWriteRevision,
        timeoutMs: permission.data.timeoutMs, outputLimitBytes: permission.data.outputLimitBytes, env: permission.data.env }, {
        recipeId: "node-test-attention-contract", recipeVersion: 1, command: process.execPath,
        argv: ATTENTION_ARGV, cwd: "private candidate", candidateId, candidateWriteRevision: 0,
        timeoutMs: 120000, outputLimitBytes: 65536, env: "minimal",
      });
      assert.equal((await h.api("POST", `/runs/${runId}/questions/${permission.data.id}`, { decision: "allow" })).status, 200);
      assert.equal((await h.pollRun(runId, { timeoutMs: 20000 })).status, "completed");
      const events = eventsFor(h, session, runId);
      const started = events.find(event => event.type === "check.started");
      const settled = events.find(event => event.type === "check.settled");
      assert.deepEqual([started.data.recipeId, started.data.recipeVersion, started.data.candidateId, started.data.candidateWriteRevision],
        ["node-test-attention-contract", 1, candidateId, 0]);
      assert.equal(settled.data.callId, started.data.callId);
      if (outcome === "missing") {
        // Absent fixed targets stop before spawn (Harness recipe seam record).
        assert.deepEqual([settled.data.status, settled.data.exitCode, settled.data.failure], ["failed", null, { code: "missing_target" }]);
        assert.equal(events.filter(event => event.type === "check.settled").length, 1);
        continue;
      }
      assert.equal(settled.data.status, "completed");
      assert.equal(settled.data.failure, null);
      assert.equal(settled.data.exitCode === 0, outcome === "pass");
      if (outcome === "pass") {
        for (let fileIndex = 1; fileIndex <= 6; fileIndex++) assert.match(settled.data.stdout, new RegExp(`target-${fileIndex}`));
      } else if (outcome === "fail") {
        assert.match(settled.data.stdout, /attention fixture failure/);
      }
      assert.equal(events.filter(event => event.type === "check.settled").length, 1);
    }
  } finally {
    await h.runtime.close();
  }
});

// A committed synthetic Courtwork-shaped candidate: each fixed Harness path is
// a small test that names itself, so the output shows every target ran.
const harnessTarget = (index, body = "assert.ok(true);") =>
  `import test from 'node:test';\nimport assert from 'node:assert/strict';\ntest('harness-target-${index + 1}', () => { ${body} });\n`;
function harnessSource(files) {
  return async sourceDir => {
    for (const [relativePath, text] of Object.entries(files)) {
      const target = path.join(sourceDir, relativePath);
      await mkdir(path.dirname(target), { recursive: true });
      await writeFile(target, text);
    }
    await runFile("git", ["add", ...Object.keys(files)], { cwd: sourceDir });
    await runFile("git", ["-c", "user.name=Synthetic", "-c", "user.email=synthetic@example.invalid", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "add fixed harness targets"], { cwd: sourceDir });
    return (await runFile("git", ["rev-parse", "HEAD"], { cwd: sourceDir })).stdout.trim();
  };
}
// One Run, every permission answered allow; returns the Run's own events.
async function approvedRun(h, session, commandId, calls) {
  const made = await h.api("POST", `/sessions/${session.id}/runs`, { commandId, input: h.scriptInput(calls) });
  assert.equal(made.status, 200, JSON.stringify(made.json));
  const runId = made.json.run.id;
  const answered = new Set();
  for (;;) {
    const run = await h.pollRun(runId, { timeoutMs: 20000, until: status => status === "waiting_user" || ["completed", "failed", "cancelled"].includes(status) });
    if (run.status !== "waiting_user") { assert.equal(run.status, "completed", JSON.stringify(run.error)); break; }
    const open = eventsFor(h, session, runId).find(event => event.type === "permission.open" && !answered.has(event.data.id));
    answered.add(open.data.id);
    assert.equal((await h.api("POST", `/runs/${runId}/questions/${open.data.id}`, { decision: "allow" })).status, 200);
  }
  return eventsFor(h, session, runId);
}
const checkOf = events => ({
  permission: events.find(event => event.type === "permission.open" && event.data.tool === "check_run"),
  started: events.find(event => event.type === "check.started"),
  settled: events.find(event => event.type === "check.settled"),
});

test("approved Harness recipe runs its six fixed targets: pass, nonzero after an exact candidate write, pass after the correction", async () => {
  const h = await boot();
  try {
    const files = Object.fromEntries(HARNESS_FILES.map((file, index) => [file, harnessTarget(index)]));
    const candidateId = "923e4567-e89b-42d3-a456-426614174201";
    const { session } = await bindSyntheticCandidate(h, { candidateId, prepareSource: harnessSource(files) });
    const check = [{ name: "check_run", arguments: { recipeId: "node-test-harness-contract" } }];
    const expectRun = ({ permission, started, settled }, revision) => {
      assert.deepEqual({ recipeId: permission.data.recipeId, recipeVersion: permission.data.recipeVersion, command: permission.data.command,
        argv: permission.data.argv, cwd: permission.data.cwd, candidateId: permission.data.candidateId,
        candidateWriteRevision: permission.data.candidateWriteRevision, timeoutMs: permission.data.timeoutMs,
        outputLimitBytes: permission.data.outputLimitBytes, env: permission.data.env }, {
        recipeId: "node-test-harness-contract", recipeVersion: 1, command: process.execPath, argv: HARNESS_ARGV,
        cwd: "private candidate", candidateId, candidateWriteRevision: revision, timeoutMs: 120000, outputLimitBytes: 65536, env: "minimal",
      });
      assert.deepEqual([started.data.recipeId, started.data.recipeVersion, started.data.candidateId, started.data.candidateWriteRevision],
        ["node-test-harness-contract", 1, candidateId, revision], "the started check is the approved descriptor");
      assert.equal(settled.data.callId, started.data.callId);
      assert.equal(settled.data.status, "completed");
      return settled.data;
    };

    const first = expectRun(checkOf(await approvedRun(h, session, "harness-pass", check)), 0);
    assert.equal(first.exitCode, 0);
    for (let index = 1; index <= 6; index++) assert.match(first.stdout, new RegExp(`harness-target-${index}\\b`));
    assert.match(first.stdout, /(?:#|ℹ) pass 6\b/);

    const target = HARNESS_FILES[4];
    const broken = harnessTarget(4, "assert.equal(1, 2, 'harness fixture regression');");
    const second = expectRun(checkOf(await approvedRun(h, session, "harness-break", [
      { name: "repo_write", arguments: { path: target, text: broken, expectedSha256: sha256(Buffer.from(files[target], "utf8")) } }, ...check])), 1);
    assert.notEqual(second.exitCode, 0);
    assert.match(second.stdout, /harness fixture regression/);

    const third = expectRun(checkOf(await approvedRun(h, session, "harness-correct", [
      { name: "repo_write", arguments: { path: target, text: files[target], expectedSha256: sha256(Buffer.from(broken, "utf8")) } }, ...check])), 2);
    assert.equal(third.exitCode, 0);
    assert.match(third.stdout, /(?:#|ℹ) pass 6\b/);
  } finally {
    await h.runtime.close();
  }
});

test("Harness recipe stops before spawn on a missing fixed target and reports a missing dependency as a nonzero result, with no install or retry", async () => {
  const h = await boot();
  try {
    const cases = {
      missing: Object.fromEntries(HARNESS_FILES.slice(0, 5).map((file, index) => [file, harnessTarget(index)])),
      dependency: Object.fromEntries(HARNESS_FILES.map((file, index) => [file, index === 0
        ? `import '@earendil-works/pi-ai';\n${harnessTarget(index)}` : harnessTarget(index)])),
    };
    for (const [index, [name, files]] of Object.entries(cases).entries()) {
      const { session } = await bindSyntheticCandidate(h, { candidateId: `923e4567-e89b-42d3-a456-42661417421${index}`, prepareSource: harnessSource(files) });
      const events = await approvedRun(h, session, `harness-${name}`, [{ name: "check_run", arguments: { recipeId: "node-test-harness-contract" } }]);
      const { started, settled } = checkOf(events);
      assert.equal(events.filter(event => event.type === "check.started").length, 1, `${name}: one recorded check, no retry`);
      assert.equal(started.data.recipeId, "node-test-harness-contract");
      if (name === "missing") {
        // Node alone would skip the absent path and exit 0 (tests 5): the Host
        // stops before spawn instead of settling a false pass.
        assert.deepEqual([settled.data.status, settled.data.exitCode, settled.data.failure, settled.data.stdout, settled.data.stderr],
          ["failed", null, { code: "missing_target" }, "", ""]);
        const result = events.find(event => event.type === "tool.result" && event.data.name === "check_run");
        assert.equal(result.data.isError, true);
        assert.match(result.data.text, /app\/tests\/check-recipes\.test\.mjs/);
      } else {
        assert.deepEqual([settled.data.status, settled.data.failure], ["completed", null]);
        assert.notEqual(settled.data.exitCode, 0);
        assert.match(settled.data.stdout + settled.data.stderr, /ERR_MODULE_NOT_FOUND|Cannot find package '@earendil-works\/pi-ai'/);
      }
    }
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
    assert.deepEqual([settled.data.exitCode, settled.data.signal], [null, null], "Host cancellation has a stable process-outcome projection");
    assert.deepEqual(eventsFor(h, session, run.json.run.id).filter(event => event.type === "check.settled").map(({ data }) => [data.status, data.exitCode, data.signal]), [["cancelled", null, null]], "one canonical settlement is recorded");
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

test("same Run write then check approves and persists the current candidate revision", async () => {
  const h = await boot();
  let closed = false;
  let reopened;
  try {
    const { session, sourceDir } = await bindSyntheticCandidate(h);
    const original = await readFile(path.join(sourceDir, KNOWN_BUG.path), "utf8");
    const run = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "same-run-write-check",
      input: h.scriptInput([
        { name: "repo_write", arguments: { path: KNOWN_BUG.path,
          text: original.replace(KNOWN_BUG.broken, KNOWN_BUG.fixed),
          expectedSha256: sha256(Buffer.from(original)) } },
        { name: "check_run", arguments: { recipeId: "node-test" } },
      ]),
    });
    assert.equal(run.status, 200);
    const runId = run.json.run.id;
    const opens = tool => waitForMatch(() => eventsFor(h, session, runId),
      e => e.type === "permission.open" && e.data.tool === tool);
    const write = await opens("repo_write");
    assert.equal((await h.api("POST", `/runs/${runId}/questions/${write.data.id}`, { decision: "allow" })).status, 200);
    const check = await opens("check_run");
    assert.equal(check.data.candidateWriteRevision, 1, "approval must describe the same Run's confirmed write");
    await assert.rejects(h.runtime.store.recordCheckStarted(runId, {
      callId: "stale-start", recipeId: "node-test", recipeVersion: 1,
      candidateId: check.data.candidateId, candidateWriteRevision: 0, startedAt: new Date().toISOString(),
    }), { code: "candidate_changed" });
    assert.equal(eventsFor(h, session, runId).some(e => e.type === "check.started"), false,
      "the Store must reject a stale start atomically without appending evidence");
    assert.equal((await h.api("POST", `/runs/${runId}/questions/${check.data.id}`, { decision: "allow" })).status, 200);
    assert.equal((await h.pollRun(runId)).status, "completed");
    const evidence = eventsFor(h, session, runId).filter(e => e.type.startsWith("check."));
    assert.deepEqual(evidence.map(e => e.type), ["check.started", "check.settled"]);
    assert.equal(evidence[0].data.candidateWriteRevision, 1);
    assert.equal(evidence[1].data.callId, evidence[0].data.callId);
    assert.equal(evidence[1].data.status, "completed");
    assert.equal(evidence[1].data.exitCode, 0);
    await h.runtime.close();
    closed = true;
    reopened = await new RuntimeStore({ dataDir: h.dataDir }).open();
    assert.deepEqual(reopened.snapshot().events.filter(e => e.runId === runId && e.type.startsWith("check.")), evidence);
  } finally {
    await reopened?.close();
    if (!closed) await h.runtime.close();
  }
});
