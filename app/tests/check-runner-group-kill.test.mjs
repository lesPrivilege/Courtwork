import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { randomBytes } from "node:crypto";
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

// A check may write only its own temporary directory (cw-check-home-*), so a
// recipe that must leave a pid behind for a Host that will be killed writes
// it there under a unique name; the directory outlives a Host that died.
async function readPidFromCheckHome(name) {
  for (let i = 0; i < 500; i++) {
    for (const entry of await readdir(tmpdir()).catch(() => [])) {
      if (!entry.startsWith("cw-check-home-")) continue;
      const text = await readFile(path.join(tmpdir(), entry, name), "utf8").catch(() => null);
      const pid = Number(text?.trim());
      if (pid > 0) return pid;
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error("the recipe never announced its pid in " + name);
}
const token = () => randomBytes(6).toString("hex");

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

// A Host that dies without stopping its check (SIGKILL, a crash) used to leave
// the whole check group running, able to keep writing the candidate. The check
// now runs under check-guard.mjs, which kills the group when the Host's end of
// its stdin pipe closes (2026-09-29 convergence loop, S11).
test("a check's process group dies with a Host that was killed mid-check", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-check-host-death-"));
  const pidName = "grandchild-" + token() + ".pid";
  const runner = new URL("../runtime/check-runner.mjs", import.meta.url).href;
  const script = '(trap "" TERM; exec sleep 30) </dev/null >/dev/null 2>&1 &\necho $! > "$TMPDIR/$1"\nsleep 30';
  const hostSource = `import { runCheckRecipe } from ${JSON.stringify(runner)};
runCheckRecipe({ recipe: { command: "/bin/sh", argv: ["-c", ${JSON.stringify(script)}, "sh", ${JSON.stringify(pidName)}], timeoutMs: 60000, outputLimitBytes: 1000 }, cwd: ${JSON.stringify(dir)}, dataDir: ${JSON.stringify(dataDir)} });
setInterval(() => {}, 1000);`;
  const { spawn } = await import("node:child_process");
  const host = spawn(process.execPath, ["--input-type=module", "-e", hostSource], { stdio: "ignore" });
  let grandchild;
  try {
    grandchild = await readPidFromCheckHome(pidName);
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
// The descendant's pid goes to stdout and, for a Host that will be killed, to
// the check's own temporary directory.
const LEAVES_DESCENDANT = 'sleep 30 & echo "descendant $!"; echo $! > "$TMPDIR/$1"; exit 0';

test("a recipe that exits leaving a descendant: exit 0 is reported and the descendant is gone", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-check-leader-exit-"));
  let descendant;
  try {
    const result = await runCheckRecipe({ recipe: { command: "/bin/sh", argv: ["-c", LEAVES_DESCENDANT, "sh", "descendant-" + token() + ".pid"], timeoutMs: 10000, outputLimitBytes: 1000 }, cwd: dir, dataDir });
    assert.equal(result.exitCode, 0); assert.equal(result.signal, null); assert.equal(result.timedOut, false);
    descendant = Number(result.stdout.match(/descendant (\d+)/)?.[1]);
    assert.ok(descendant > 0, "the descendant announced its pid: " + result.stdout);
    assert.equal(alive(descendant), false, "nothing the recipe started outlives it");
  } finally {
    if (descendant && alive(descendant)) try { process.kill(descendant, "SIGKILL"); } catch {}
    await rm(dir, { recursive: true, force: true });
  }
});

test("a Host that dies after the recipe's leader exited leaves no descendant running", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-check-leader-then-host-"));
  const pidName = "descendant-" + token() + ".pid";
  const runner = new URL("../runtime/check-runner.mjs", import.meta.url).href;
  const hostSource = `import { runCheckRecipe } from ${JSON.stringify(runner)};
runCheckRecipe({ recipe: { command: "/bin/sh", argv: ["-c", ${JSON.stringify(LEAVES_DESCENDANT)}, "sh", ${JSON.stringify(pidName)}], timeoutMs: 60000, outputLimitBytes: 1000 }, cwd: ${JSON.stringify(dir)}, dataDir: ${JSON.stringify(dataDir)} });
setInterval(() => {}, 1000);`;
  const { spawn } = await import("node:child_process");
  const host = spawn(process.execPath, ["--input-type=module", "-e", hostSource], { stdio: "ignore" });
  let descendant;
  try {
    descendant = await readPidFromCheckHome(pidName);
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
    const result = await runCheckRecipe({ recipe: { command: "/bin/sh", argv: ["-c", `kill -${sig} $$`], timeoutMs: 10000, outputLimitBytes: 100 }, cwd: process.cwd(), dataDir });
    assert.equal(result.signal, "SIG" + sig, sig); assert.equal(result.exitCode, null, sig);
  }
});

test("a recipe that signals its own group and handles it reports its own exit", async () => {
  for (const sig of ["HUP", "INT", "QUIT"]) {
    const result = await runCheckRecipe({ recipe: { command: "/bin/sh", argv: ["-c", `trap 'exit 0' ${sig}; kill -${sig} 0; sleep 5`], timeoutMs: 10000, outputLimitBytes: 100 }, cwd: process.cwd(), dataDir });
    assert.equal(result.exitCode, 0, sig); assert.equal(result.signal, null, sig);
  }
});
