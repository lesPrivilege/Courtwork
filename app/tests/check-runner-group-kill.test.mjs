import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCheckRecipe } from "../runtime/check-runner.mjs";

// The leader (plain sh) dies on SIGTERM; the grandchild ignores SIGTERM and has
// detached stdio, so the leader's stdio closes long before the grandchild dies.
const SCRIPT = [
  '(trap "" TERM; exec sleep 30) </dev/null >/dev/null 2>&1 &',
  'echo $! > "$1"',
  "echo started",
  "sleep 30",
].join("\n");

function alive(pid) {
  try { process.kill(pid, 0); return true; } catch (error) { return error.code === "EPERM"; }
}

async function readPid(pidFile) {
  for (let i = 0; i < 100; i++) {
    const text = await readFile(pidFile, "utf8").catch(() => "");
    if (/^\d+\n/.test(text)) return Number(text);
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error("grandchild never announced its pid");
}

async function scenario(run) {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-group-kill-"));
  const pidFile = path.join(dir, "pid");
  let pid = null;
  try {
    const recipe = (timeoutMs) => ({ command: "/bin/sh", argv: ["-c", SCRIPT, "sh", pidFile], timeoutMs, outputLimitBytes: 4096 });
    const result = await run(recipe, async () => { pid = await readPid(pidFile); });
    pid ??= await readPid(pidFile);
    assert.equal(alive(pid), false, `grandchild ${pid} must be gone when the check settles`);
    return result;
  } finally {
    if (pid) { try { process.kill(pid, "SIGKILL"); } catch { /* gone */ } }
    await rm(dir, { recursive: true, force: true });
  }
}

test("cancel does not settle while a SIGTERM-ignoring detached descendant survives", async () => {
  const result = await scenario(async (recipe, ready) => {
    const controller = new AbortController();
    const promise = runCheckRecipe({ recipe: recipe(30000), cwd: tmpdir(), signal: controller.signal });
    await ready();
    controller.abort();
    return promise;
  });
  assert.equal(result.cancelled, true);
  assert.equal(result.timedOut, false);
});

test("timeout does not settle while a SIGTERM-ignoring detached descendant survives", async () => {
  const result = await scenario(async recipe => runCheckRecipe({ recipe: recipe(400), cwd: tmpdir() }));
  assert.equal(result.timedOut, true);
  assert.equal(result.cancelled, false);
});

test("normal exit sends no signal to the group", async () => {
  const result = await runCheckRecipe({
    recipe: { command: "/bin/sh", argv: ["-c", "echo ok"], timeoutMs: 5000, outputLimitBytes: 4096 }, cwd: tmpdir(),
  });
  assert.equal(result.exitCode, 0);
  assert.equal(result.groupLingered, undefined);
});
