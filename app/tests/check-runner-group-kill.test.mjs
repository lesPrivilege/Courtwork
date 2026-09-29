import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCheckRecipe } from "../runtime/check-runner.mjs";

// The leader (plain sh) dies on SIGTERM; the grandchild ignores SIGTERM and has
// detached stdio, so the leader's stdio closes long before the grandchild dies.
// The check may write only its own temporary directory, so the grandchild's
// pid is announced on stdout rather than in a file the test can read early.
const SCRIPT = [
  '(trap "" TERM; exec sleep 30) </dev/null >/dev/null 2>&1 &',
  'echo "grandchild $!"',
  "sleep 30",
].join("\n");

const dataDir = await mkdtemp(path.join(tmpdir(), "cw-group-kill-data-"));
const cwd = await mkdtemp(path.join(tmpdir(), "cw-group-kill-cwd-"));
test.after(async () => {
  await rm(dataDir, { recursive: true, force: true });
  await rm(cwd, { recursive: true, force: true });
});

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === "EPERM"; }
}

async function scenario(run) {
  let announced;
  const ready = new Promise(resolve => { announced = resolve; });
  const recipe = (timeoutMs) => ({ command: "/bin/sh", argv: ["-c", SCRIPT], timeoutMs, outputLimitBytes: 4096 });
  const result = await run(recipe, { cwd, dataDir, onOutput: ({ stream }) => { if (stream === "stdout") announced(); } }, ready);
  const pid = Number(result.stdout.match(/grandchild (\d+)/)?.[1]);
  assert.ok(pid > 0, "grandchild announced its pid: " + result.stdout);
  try {
    assert.equal(alive(pid), false, `grandchild ${pid} must be gone when the check settles`);
  } finally {
    try { process.kill(pid, "SIGKILL"); } catch { /* gone */ }
  }
  return result;
}

test("cancel does not settle while a SIGTERM-ignoring detached descendant survives", async () => {
  const result = await scenario(async (recipe, options, ready) => {
    const controller = new AbortController();
    const promise = runCheckRecipe({ recipe: recipe(30000), ...options, signal: controller.signal });
    await ready;
    controller.abort();
    return promise;
  });
  assert.equal(result.cancelled, true);
  assert.equal(result.timedOut, false);
});

test("timeout does not settle while a SIGTERM-ignoring detached descendant survives", async () => {
  const result = await scenario(async (recipe, options) => runCheckRecipe({ recipe: recipe(400), ...options }));
  assert.equal(result.timedOut, true);
  assert.equal(result.cancelled, false);
});

test("a normal exit with nothing left in the group settles with the group confirmed gone", async () => {
  const result = await runCheckRecipe({
    recipe: { command: "/bin/sh", argv: ["-c", "echo ok"], timeoutMs: 5000, outputLimitBytes: 4096 }, cwd, dataDir,
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.groupLingered, undefined);
});
