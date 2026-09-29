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

// A Host that dies without stopping its check (SIGKILL, a crash) used to leave
// the whole check group running, able to keep writing the candidate. The check
// now runs under check-guard.mjs, which kills the group when the Host's end of
// its stdin pipe closes (2026-09-29 convergence loop, S11).
test("a check's process group dies with a Host that was killed mid-check", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-check-host-death-"));
  const pidFile = path.join(dir, "grandchild.pid");
  const runner = new URL("../runtime/check-runner.mjs", import.meta.url).href;
  const hostSource = `import { runCheckRecipe } from ${JSON.stringify(runner)};
runCheckRecipe({ recipe: { command: "/bin/sh", argv: ["-c", ${JSON.stringify(SCRIPT)}, "sh", ${JSON.stringify(pidFile)}], timeoutMs: 60000, outputLimitBytes: 1000 }, cwd: ${JSON.stringify(dir)} });
setInterval(() => {}, 1000);`;
  const { spawn } = await import("node:child_process");
  const host = spawn(process.execPath, ["--input-type=module", "-e", hostSource], { stdio: "ignore" });
  let grandchild;
  try {
    grandchild = await readPid(pidFile);
    assert.ok(alive(grandchild));
    host.kill("SIGKILL");
    await new Promise(resolve => host.once("exit", resolve));
    for (let i = 0; i < 100 && alive(grandchild); i++) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(alive(grandchild), false, "the TERM-ignoring descendant is gone once the Host died");
  } finally {
    if (grandchild && alive(grandchild)) try { process.kill(grandchild, "SIGKILL"); } catch {}
    try { host.kill("SIGKILL"); } catch {}
    await rm(dir, { recursive: true, force: true });
  }
});

// CR1 (Astra, S10–S11 review): the guard used to exit with the recipe's own
// process, leaving a descendant that still held the recipe's output running
// unsupervised; a Host that died next left it alive. The guard now kills the
// group when the recipe's process exits and reports the recipe's real status.
const LEAVES_DESCENDANT = 'sleep 30 & echo $! > "$1"; exit 0';

test("a recipe that exits leaving a descendant: exit 0 is reported and the descendant is gone", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-check-leader-exit-"));
  const pidFile = path.join(dir, "descendant.pid");
  let descendant;
  try {
    const result = await runCheckRecipe({ recipe: { command: "/bin/sh", argv: ["-c", LEAVES_DESCENDANT, "sh", pidFile], timeoutMs: 10000, outputLimitBytes: 1000 }, cwd: dir });
    assert.equal(result.exitCode, 0); assert.equal(result.signal, null); assert.equal(result.timedOut, false);
    descendant = await readPid(pidFile);
    assert.equal(alive(descendant), false, "nothing the recipe started outlives it");
  } finally {
    if (descendant && alive(descendant)) try { process.kill(descendant, "SIGKILL"); } catch {}
    await rm(dir, { recursive: true, force: true });
  }
});

test("a Host that dies after the recipe's leader exited leaves no descendant running", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-check-leader-then-host-"));
  const pidFile = path.join(dir, "descendant.pid");
  const runner = new URL("../runtime/check-runner.mjs", import.meta.url).href;
  const hostSource = `import { runCheckRecipe } from ${JSON.stringify(runner)};
runCheckRecipe({ recipe: { command: "/bin/sh", argv: ["-c", ${JSON.stringify(LEAVES_DESCENDANT)}, "sh", ${JSON.stringify(pidFile)}], timeoutMs: 60000, outputLimitBytes: 1000 }, cwd: ${JSON.stringify(dir)} });
setInterval(() => {}, 1000);`;
  const { spawn } = await import("node:child_process");
  const host = spawn(process.execPath, ["--input-type=module", "-e", hostSource], { stdio: "ignore" });
  let descendant;
  try {
    descendant = await readPid(pidFile);
    host.kill("SIGKILL");
    await new Promise(resolve => host.once("exit", resolve));
    for (let i = 0; i < 100 && alive(descendant); i++) await new Promise(resolve => setTimeout(resolve, 20));
    assert.equal(alive(descendant), false);
  } finally {
    if (descendant && alive(descendant)) try { process.kill(descendant, "SIGKILL"); } catch {}
    try { host.kill("SIGKILL"); } catch {}
    await rm(dir, { recursive: true, force: true });
  }
});

test("the recipe's own exit signal is reported, including signals the guard's Node runtime handles", async () => {
  for (const sig of ["USR1", "PIPE", "TERM"]) {
    const result = await runCheckRecipe({ recipe: { command: "/bin/sh", argv: ["-c", `kill -${sig} $$`], timeoutMs: 10000, outputLimitBytes: 100 }, cwd: process.cwd() });
    assert.equal(result.signal, "SIG" + sig, sig); assert.equal(result.exitCode, null, sig);
  }
});
