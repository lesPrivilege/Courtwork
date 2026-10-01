import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { randomBytes, randomInt } from "node:crypto";
import { tmpdir } from "node:os";
import path from "node:path";
import { runCheckRecipe } from "../runtime/check-runner.mjs";

// The leader (plain sh) dies on SIGTERM; the grandchild ignores SIGTERM and has
// detached stdio, so the leader's stdio closes long before the grandchild dies.
// The check may write only its own temporary directory, so the grandchild
// is announced on stdout rather than in a file the test can read early.
const script = nap => [
  `(trap "" TERM; exec sleep ${nap}) </dev/null >/dev/null 2>&1 &`,
  'echo "grandchild $!"',
  "sleep 30",
].join("\n");

const dataDir = await mkdtemp(path.join(tmpdir(), "cw-group-kill-data-"));
const cwd = await mkdtemp(path.join(tmpdir(), "cw-group-kill-cwd-"));
test.after(async () => {
  await rm(dataDir, { recursive: true, force: true });
  await rm(cwd, { recursive: true, force: true });
});

// The Host's process table is the oracle for what still runs. A pid a check
// prints is local to the Linux sandbox's PID namespace and names an unrelated
// process on the Host. A descendant is instead started as `sleep <nap>` with a
// duration no other process has. Every process of that check then carries the
// duration in its command line: the descendant as its own argument, the guard,
// the sandbox wrappers and the recipe's shell through the recipe's script.
const uniqueNap = () => "30." + randomInt(1e8, 1e9);
function processesWith(marker) {
  const table = execFileSync("ps", ["-A", "-ww", "-o", "pid=", "-o", "args="], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return table.split("\n").filter(line => line.includes(marker)).map(line => ({ pid: Number.parseInt(line, 10), command: line.trim().replace(/^\d+\s+/, "") }));
}
// The descendant itself, as distinct from the processes that only quote it.
const sleeping = nap => processesWith(nap).filter(({ command }) => command === "sleep " + nap);
function killAll(processes) {
  for (const { pid } of processes) { try { process.kill(pid, "SIGKILL"); } catch { /* gone */ } }
}

// A check may write only its own temporary directory (cw-check-home-*), so a
// recipe that must tell a Host that will be killed how far it got writes
// there under a unique name; the directory outlives a Host that died.
async function readFromCheckHome(name) {
  for (let i = 0; i < 500; i++) {
    for (const entry of await readdir(tmpdir()).catch(() => [])) {
      if (!entry.startsWith("cw-check-home-")) continue;
      const text = await readFile(path.join(tmpdir(), entry, name), "utf8").catch(() => null);
      if (text !== null && text.trim()) return text;
    }
    await new Promise(resolve => setTimeout(resolve, 20));
  }
  throw new Error("the recipe never wrote " + name);
}
const token = () => randomBytes(6).toString("hex");

async function scenario(run) {
  let announced;
  const ready = new Promise(resolve => { announced = resolve; });
  const nap = uniqueNap();
  const recipe = (timeoutMs) => ({ command: "/bin/sh", argv: ["-c", script(nap)], timeoutMs, outputLimitBytes: 4096 });
  try {
    const result = await run(recipe, { cwd, dataDir, onOutput: ({ stream }) => { if (stream === "stdout") announced(); } }, ready);
    const left = processesWith(nap);
    assert.match(result.stdout, /grandchild \d+/, "the grandchild was announced: " + result.stdout);
    assert.deepEqual(left, [], "the grandchild and every other process of the check must be gone when the check settles");
    return result;
  } finally {
    killAll(processesWith(nap));
  }
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
test("a check's process group dies with a Host that was killed mid-check, and the sandbox was in force", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-check-host-death-"));
  const pidName = "grandchild-" + token() + ".pid";
  const nap = uniqueNap();
  // The guard runs outside the sandbox; the recipe under it must still be
  // inside: a stand-in credentials file in the data directory is unreadable.
  const secret = path.join(dataDir, "credentials.json");
  await writeFile(secret, JSON.stringify({ synthetic: "stand-in, not a credential" }));
  const runner = new URL("../runtime/check-runner.mjs", import.meta.url).href;
  const recipeScript = `(trap "" TERM; exec sleep ${nap}) </dev/null >/dev/null 2>&1 &\n(cat "$2" >/dev/null 2>&1 && echo readable || echo denied) > "$TMPDIR/$1.sandbox"\necho $! > "$TMPDIR/$1"\nsleep 30`;
  const hostSource = `import { runCheckRecipe } from ${JSON.stringify(runner)};
runCheckRecipe({ recipe: { command: "/bin/sh", argv: ["-c", ${JSON.stringify(recipeScript)}, "sh", ${JSON.stringify(pidName)}, ${JSON.stringify(secret)}], timeoutMs: 60000, outputLimitBytes: 1000 }, cwd: ${JSON.stringify(dir)}, dataDir: ${JSON.stringify(dataDir)} });
setInterval(() => {}, 1000);`;
  const { spawn } = await import("node:child_process");
  const host = spawn(process.execPath, ["--input-type=module", "-e", hostSource], { stdio: "ignore" });
  try {
    await readFromCheckHome(pidName);
    assert.equal(sleeping(nap).length, 1, "the TERM-ignoring descendant is running while the Host lives");
    assert.equal((await readFromCheckHome(pidName + ".sandbox")).trim(), "denied", "the recipe under the guard could not read the data directory");
    host.kill("SIGKILL");
    await new Promise(resolve => host.once("exit", resolve));
    for (let i = 0; i < 100 && processesWith(nap).length; i++) await new Promise(resolve => setTimeout(resolve, 20));
    assert.deepEqual(processesWith(nap), [], "the TERM-ignoring descendant and every other process of the check are gone once the Host died");
  } finally {
    try { host.kill("SIGKILL"); } catch {}
    killAll(processesWith(nap));
    await rm(dir, { recursive: true, force: true });
  }
});

// CR1 (Astra, S10–S11 review): the guard used to exit with the recipe's own
// process, leaving a descendant that still held the recipe's output running
// unsupervised; a Host that died next left it alive. The guard now kills the
// group when the recipe's process exits and reports the recipe's real status.
// The descendant is announced on stdout and, for a Host that will be killed,
// in the check's own temporary directory.
const leavesDescendant = nap => `sleep ${nap} & echo "descendant $!"; echo $! > "$TMPDIR/$1"; exit 0`;

test("a recipe that exits leaving a descendant: exit 0 is reported and the descendant is gone", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-check-leader-exit-"));
  const nap = uniqueNap();
  try {
    const result = await runCheckRecipe({ recipe: { command: "/bin/sh", argv: ["-c", leavesDescendant(nap), "sh", "descendant-" + token() + ".pid"], timeoutMs: 10000, outputLimitBytes: 1000 }, cwd: dir, dataDir });
    const left = processesWith(nap);
    assert.equal(result.exitCode, 0); assert.equal(result.signal, null); assert.equal(result.timedOut, false);
    assert.match(result.stdout, /descendant \d+/, "the descendant was announced: " + result.stdout);
    assert.deepEqual(left, [], "nothing the recipe started outlives it");
  } finally {
    killAll(processesWith(nap));
    await rm(dir, { recursive: true, force: true });
  }
});

test("a Host that dies after the recipe's leader exited leaves no descendant running", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-check-leader-then-host-"));
  // The Host outlives the check here, so its temporary directory is gone by
  // the time the test looks; the fake Host writes the check's stdout instead.
  const outFile = path.join(dir, "check.stdout");
  const nap = uniqueNap();
  const runner = new URL("../runtime/check-runner.mjs", import.meta.url).href;
  const hostSource = `import { runCheckRecipe } from ${JSON.stringify(runner)};
import { writeFileSync } from "node:fs";
runCheckRecipe({ recipe: { command: "/bin/sh", argv: ["-c", ${JSON.stringify(leavesDescendant(nap))}, "sh", "descendant-" + process.pid + ".pid"], timeoutMs: 60000, outputLimitBytes: 1000 }, cwd: ${JSON.stringify(dir)}, dataDir: ${JSON.stringify(dataDir)} })
  .then(result => writeFileSync(${JSON.stringify(outFile)}, result.stdout));
setInterval(() => {}, 1000);`;
  const { spawn } = await import("node:child_process");
  const host = spawn(process.execPath, ["--input-type=module", "-e", hostSource], { stdio: "ignore" });
  try {
    let stdout = null;
    for (let i = 0; i < 500 && stdout === null; i++) {
      stdout = await readFile(outFile, "utf8").catch(() => null);
      if (stdout === null) await new Promise(resolve => setTimeout(resolve, 20));
    }
    assert.match(stdout ?? "", /descendant \d+/, "the recipe announced its descendant: " + stdout);
    host.kill("SIGKILL");
    await new Promise(resolve => host.once("exit", resolve));
    for (let i = 0; i < 100 && processesWith(nap).length; i++) await new Promise(resolve => setTimeout(resolve, 20));
    assert.deepEqual(processesWith(nap), []);
  } finally {
    try { host.kill("SIGKILL"); } catch {}
    killAll(processesWith(nap));
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
