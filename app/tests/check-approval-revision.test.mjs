import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createCheckTools } from "../runtime/check-tools.mjs";
import { runCheckRecipe } from "../runtime/check-runner.mjs";

function fixture() {
  const admitted = { id: "candidate-one", status: "active", revision: 1, writeRevision: 0,
    sourceBindingId: "binding-one", sourceBindingRevision: 1, candidatePath: "/unused-check-candidate" };
  let current = { ...admitted };
  const started = [], settled = [];
  const [tool] = createCheckTools({ candidate: admitted, resolveCandidate: () => current,
    recordStarted: async detail => started.push(detail), recordSettled: async detail => settled.push(detail),
    isOpen: () => true });
  return { tool, started, settled, admitted, get current() { return current; }, set current(value) { current = value; } };
}
const params = { recipeId: "node-test" };

for (const [name, mutate] of [
  ["write revision", f => f.current.writeRevision++],
  ["candidate identity", f => { f.current.id = "candidate-two"; }],
  ["candidate revision", f => f.current.revision++],
  ["candidate status", f => { f.current.status = "revoked"; }],
  ["binding identity", f => { f.current.sourceBindingId = "binding-two"; }],
  ["binding revision", f => f.current.sourceBindingRevision++],
  ["execution path", f => { f.current.candidatePath = "/another-candidate"; }],
  ["missing active binding", f => { f.current = null; }],
]) {
  test(`check approval rejects changed ${name} before recording a start`, async () => {
    const f = fixture();
    const approved = f.tool.permissionContext(params);
    mutate(f);
    await assert.rejects(f.tool.execute("call-one", params, undefined, undefined, approved), { code: "candidate_changed" });
    assert.deepEqual(f.started, []);
    assert.deepEqual(f.settled, []);
  });
}

test("check requires the exact approved recipe descriptor", async () => {
  for (const change of [() => undefined, d => ({ ...d, argv: ["--test", "different.mjs"] }),
    d => ({ ...d, timeoutMs: 1 }), d => ({ ...d, recipeVersion: 2 })]) {
    const f = fixture();
    await assert.rejects(f.tool.execute("call-one", params, undefined, undefined,
      change(f.tool.permissionContext(params))), { code: "candidate_changed" });
    assert.deepEqual(f.started, []);
  }
});

test("candidate drift while persisting check.started settles failed without executing", async () => {
  const f = fixture();
  const [tool] = createCheckTools({ candidate: f.admitted, resolveCandidate: () => f.current,
    recordStarted: async detail => { f.started.push(detail); f.current.writeRevision++; },
    recordSettled: async detail => f.settled.push(detail), isOpen: () => true });
  const approved = tool.permissionContext(params);
  await assert.rejects(tool.execute("call-one", params, undefined, undefined, approved), { code: "candidate_changed" });
  assert.equal(f.started.length, 1);
  assert.equal(f.settled.length, 1);
  assert.equal(f.settled[0].status, "failed");
  assert.equal(f.settled[0].failure.code, "candidate_changed");
  assert.equal(f.settled[0].exitCode, null);
});

test("runner's final synchronous Host fence prevents actual process side effects", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-check-spawn-fence-"));
  const marker = path.join(dir, "spawned");
  try {
    const recipe = { command: process.execPath, argv: ["-e",
      "require('node:fs').writeFileSync(process.argv[1], 'executed')", marker],
      timeoutMs: 5000, outputLimitBytes: 1024 };
    const rejection = Object.assign(new Error("candidate changed"), { code: "candidate_changed" });
    await assert.rejects(runCheckRecipe({ recipe, cwd: dir, beforeSpawn: () => { throw rejection; } }),
      error => error === rejection);
    await assert.rejects(readFile(marker), { code: "ENOENT" });
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

for (const atCallback of [false, true]) {
  test(`runner cancellation ${atCallback ? "inside final fence" : "before preparation"} never spawns`, async () => {
    const dir = await mkdtemp(path.join(tmpdir(), "cw-check-cancel-fence-"));
    const marker = path.join(dir, "spawned");
    try {
      const controller = new AbortController();
      if (!atCallback) controller.abort();
      const recipe = { command: process.execPath, argv: ["-e",
        "require('node:fs').writeFileSync(process.argv[1], 'executed'); setTimeout(() => {}, 30000)", marker],
        timeoutMs: 5000, outputLimitBytes: 1024 };
      const result = await runCheckRecipe({ recipe, cwd: dir, signal: controller.signal,
        beforeSpawn: () => controller.abort() });
      assert.equal(result.cancelled, true);
      assert.equal(result.timedOut, false);
      assert.equal(result.exitCode, null);
      assert.equal(result.signal, null, "no spawned child receives SIGTERM");
      assert.equal(result.stdout, "");
      assert.equal(result.stderr, "");
      await assert.rejects(readFile(marker), { code: "ENOENT" });
      // A missing command would produce spawn_failed if spawn were attempted.
      const noSpawn = await runCheckRecipe({ recipe: { ...recipe, command: path.join(dir, "missing-command") },
        cwd: dir, signal: controller.signal });
      assert.equal(noSpawn.cancelled, true);
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
}

test("admission closing during start persistence settles once as cancelled without spawn", async () => {
  const f = fixture();
  let open = true;
  const [tool] = createCheckTools({ candidate: f.admitted, resolveCandidate: () => f.current,
    recordStarted: async detail => { f.started.push(detail); open = false; },
    recordSettled: async detail => f.settled.push(detail), isOpen: () => open });
  const approved = tool.permissionContext(params);
  await assert.rejects(tool.execute("call-one", params, undefined, undefined, approved), { code: "run_closed" });
  assert.equal(f.started.length, 1);
  assert.equal(f.settled.length, 1);
  assert.equal(f.settled[0].status, "cancelled");
  assert.equal(f.settled[0].failure, null);
  assert.equal(f.settled[0].exitCode, null);
  assert.equal(f.settled[0].signal, null);
});

// The Courtwork recipes went from v1 to v2 with different argv. Approval
// matching is the same exact descriptor comparison as always, so an approval
// recorded for v1 (its version and its argv) cannot start the current recipe.
const V1_ARGV = {
  "node-test-attention-contract": ["--test", "--test-concurrency=1", "app/tests/attention-core.test.mjs", "app/tests/attention-http.test.mjs",
    "app/tests/attention-recovery.test.mjs", "app/tests/attention-github-fixture.test.mjs", "app/tests/attention-gmail-fixture.test.mjs",
    "app/tests/attention-trace-fixture.test.mjs"],
  "node-test-harness-contract": ["--test", "--test-concurrency=1", "app/tests/hermes-api-runs.test.mjs", "app/tests/request-summary.test.mjs",
    "app/tests/runtime-load-recovery.test.mjs", "app/tests/kit-context.test.mjs", "app/tests/control-plane.test.mjs", "app/tests/check-recipes.test.mjs"],
};

for (const [recipeId, v1Argv] of Object.entries(V1_ARGV)) {
  test(`${recipeId}: an approval for v1 cannot authorize v2, in either field alone or together`, async () => {
    const recipeParams = { recipeId };
    const current = fixture().tool.permissionContext(recipeParams);
    assert.equal(current.recipeVersion, 2);
    assert.notDeepEqual(current.argv, v1Argv);
    for (const [name, approved] of [
      ["v1 version and argv", { ...current, recipeVersion: 1, argv: v1Argv }],
      ["v1 version, current argv", { ...current, recipeVersion: 1 }],
      ["current version, v1 argv", { ...current, argv: v1Argv }],
    ]) {
      const f = fixture();
      await assert.rejects(f.tool.execute("call-one", recipeParams, undefined, undefined, approved), { code: "candidate_changed" }, name);
      assert.deepEqual(f.started, [], `${name}: no start is recorded`);
      assert.deepEqual(f.settled, [], `${name}: nothing settles`);
    }
  });
}
