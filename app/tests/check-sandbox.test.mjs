// RD-009 check containment: a check runs model-written candidate code inside
// the check sandbox. Each test here failed on the runner before the sandbox.
import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { realpathSync } from "node:fs";
import { createServer } from "node:net";
import { mkdir, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { homedir, tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runCheckRecipe } from "../runtime/check-runner.mjs";
import { checkSandboxPolicy } from "../runtime/check-sandbox.mjs";
import { createCheckTools } from "../runtime/check-tools.mjs";
import { boot } from "./helpers.mjs";
import { createSyntheticRepository } from "./fixtures/synthetic-repo/create-synthetic-repo.mjs";

const SECRET = "NOT-A-REAL-SECRET-4f1c";
const node = (script, timeoutMs = 20000) => ({ command: process.execPath, argv: ["-e", script], timeoutMs, outputLimitBytes: 65536 });

// A synthetic Host data directory with a private candidate inside it, the
// layout the Host uses (dataDir/repository-candidates/...).
async function layout() {
  const root = await mkdtemp(path.join(tmpdir(), "cw-check-sandbox-"));
  const dataDir = path.join(root, "data");
  const candidate = path.join(dataDir, "repository-candidates", "c1");
  await mkdir(path.join(candidate, ".git"), { recursive: true });
  await writeFile(path.join(candidate, "package.json"), '{"name":"candidate"}\n');
  await writeFile(path.join(dataDir, "credentials.json"), JSON.stringify({ dummy: SECRET }), { mode: 0o600 });
  return { root, dataDir, candidate, cleanup: () => rm(root, { recursive: true, force: true }) };
}

// The Host's process table is the oracle for what still runs. A pid a check
// prints is local to the Linux sandbox's PID namespace and names an unrelated
// process on the Host. Every process of a check whose recipe carries `marker`
// has it in its command line: the guard and the sandbox wrappers through the
// wrapped command, the recipe and its descendants through their own arguments.
function processesWith(marker) {
  const table = execFileSync("ps", ["-A", "-ww", "-o", "pid=", "-o", "args="], { encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  return table.split("\n").filter(line => line.includes(marker)).map(line => ({ pid: Number.parseInt(line, 10), command: line.trim().replace(/^\d+\s+/, "") }));
}

test("a model-written candidate test cannot read a file at the Host data directory (review probe p4)", async () => {
  const h = await boot();
  const sourceDir = await mkdtemp(path.join(tmpdir(), "cw-check-sandbox-src-"));
  try {
    // A dummy file beside the Host's credentials, same directory and mode.
    await writeFile(path.join(h.dataDir, "dummy-credentials-probe.json"), JSON.stringify({ dummy: SECRET }), { mode: 0o600 });
    const source = await createSyntheticRepository(sourceDir);
    const session = await h.createSession({ permissionMode: "draft" });
    assert.equal((await h.api("PUT", `/sessions/${session.id}/repository-binding`, { operation: "bind", requestId: "b", expectedRevision: 0, rootPath: sourceDir })).status, 200);
    assert.equal((await h.api("PUT", `/sessions/${session.id}/repository-candidate`, { operation: "create", requestId: "c", expectedRevision: 0,
      expectedBindingRevision: 1, candidateId: "923e4567-e89b-42d3-a456-426614174311", baseCommit: source.head })).status, 200);
    const evil = `import { test } from 'node:test'; import fs from 'node:fs'; import path from 'node:path';
test('probe', () => { console.log('PROBE-RAN'); let d = process.cwd();
  for (let i = 0; i < 8; i++) { const f = path.join(d, 'dummy-credentials-probe.json');
    try { console.log('READ-OUTSIDE-CANDIDATE: ' + fs.readFileSync(f, 'utf8')); } catch (e) { if (e.code !== 'ENOENT') console.log('DENIED ' + e.code + ' ' + i); }
    d = path.dirname(d); } });\n`;
    const made = await h.api("POST", `/sessions/${session.id}/runs`, { commandId: "r1", input: h.scriptInput([
      { name: "repo_write", arguments: { path: "test/evil.test.mjs", text: evil } },
      { name: "check_run", arguments: { recipeId: "node-test" } }]) });
    const runId = made.json.run.id;
    const answered = new Set();
    for (;;) {
      const run = await h.pollRun(runId, { timeoutMs: 60000, until: status => status === "waiting_user" || ["completed", "failed", "cancelled"].includes(status) });
      if (run.status !== "waiting_user") break;
      const open = h.runtime.store.snapshot().events.find(e => e.runId === runId && e.type === "permission.open" && !answered.has(e.data.id));
      answered.add(open.data.id);
      assert.equal((await h.api("POST", `/runs/${runId}/questions/${open.data.id}`, { decision: "allow" })).status, 200);
    }
    const settled = h.runtime.store.snapshot().events.find(e => e.runId === runId && e.type === "check.settled");
    assert.equal(settled.data.status, "completed", JSON.stringify(settled.data));
    assert.match(settled.data.stdout, /PROBE-RAN/, "the model-written test ran");
    assert.equal((settled.data.stdout + settled.data.stderr).includes(SECRET), false, "the dummy secret never reaches check output");
  } finally {
    await h.runtime.close();
    await rm(sourceDir, { recursive: true, force: true });
  }
});

test("the candidate, its Git metadata and the data directory are read-only; the check's own temporary directory is writable", async () => {
  const l = await layout();
  try {
    const script = `const fs = require('node:fs'), os = require('node:os'), path = require('node:path');
for (const [name, file] of [['new', 'written.txt'], ['existing', 'package.json'], ['git', '.git/HEAD'], ['data', '../../written.txt'], ['tmp', path.join(os.tmpdir(), 'ok.txt')]]) {
  try { fs.writeFileSync(path.resolve(file), 'x'); console.log('WROTE ' + name); } catch (e) { console.log('DENIED ' + name + ' ' + e.code); } }`;
    const result = await runCheckRecipe({ recipe: node(script), cwd: l.candidate, dataDir: l.dataDir });
    assert.equal(result.exitCode, 0, result.stderr);
    assert.match(result.stdout, /WROTE tmp/);
    for (const name of ["new", "existing", "git", "data"]) assert.match(result.stdout, new RegExp(`DENIED ${name} `));
    assert.deepEqual((await readdir(l.candidate)).sort(), [".git", "package.json"]);
    assert.deepEqual(await readdir(path.join(l.candidate, ".git")), []);
    assert.equal(await readFile(path.join(l.candidate, "package.json"), "utf8"), '{"name":"candidate"}\n');
    assert.deepEqual((await readdir(l.dataDir)).sort(), ["credentials.json", "repository-candidates"]);
  } finally {
    await l.cleanup();
  }
});

test("a check has no network, not even to a port listening on this host", async () => {
  const l = await layout();
  let connections = 0;
  const server = createServer(socket => { connections++; socket.end(); });
  await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
  try {
    const script = `const s = require('node:net').connect(${server.address().port}, '127.0.0.1');
s.on('connect', () => { console.log('CONNECTED'); s.destroy(); }); s.on('error', e => console.log('REFUSED ' + e.code));`;
    const result = await runCheckRecipe({ recipe: node(script), cwd: l.candidate, dataDir: l.dataDir });
    assert.match(result.stdout, /REFUSED /, result.stdout + result.stderr);
    assert.doesNotMatch(result.stdout, /CONNECTED/);
    assert.equal(connections, 0);
  } finally {
    server.close();
    await l.cleanup();
  }
});

test("a descendant left in the check's process group is reaped after a normal exit", async () => {
  const l = await layout();
  const marker = "cw-descendant-" + randomBytes(6).toString("hex");
  try {
    const script = `const c = require('node:child_process').spawn(process.execPath, ['-e', 'setTimeout(() => {}, 30000)', '${marker}'], { stdio: 'ignore' });
c.unref(); console.log('descendant ' + c.pid);`;
    const result = await runCheckRecipe({ recipe: node(script), cwd: l.candidate, dataDir: l.dataDir });
    const left = processesWith(marker);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.match(result.stdout, /descendant \d+/, "the descendant started: " + result.stdout);
    assert.deepEqual(left, [], "the descendant and every other process of the check must be gone when the check settles");
    assert.equal(result.groupLingered, undefined);
  } finally {
    for (const { pid } of processesWith(marker)) { try { process.kill(pid, "SIGKILL"); } catch { /* gone */ } }
    await l.cleanup();
  }
});

// The sandbox library is an ordinary dependency, so on most installs it lives
// under the home directory the policy denies. Linux bubblewrap starts the check
// through the library's apply-seccomp binary from inside the sandbox, so that
// one directory is re-allowed there; nothing beside it is. The first test
// states the Linux policy on any Host; the second runs the real sandbox of
// this Host with the candidate elsewhere.
const sandboxRuntime = path.dirname(path.dirname(realpathSync(fileURLToPath(import.meta.resolve("@anthropic-ai/sandbox-runtime")))));
const helperDir = arch => path.join(sandboxRuntime, "vendor", "seccomp", arch);
const hostArch = { x64: "x64", arm64: "arm64" }[process.arch];
const inside = (outer, inner) => inner === outer || inner.startsWith(outer + path.sep);

test("the Linux policy re-allows the library's seccomp helper directory and nothing wider; other platforms re-allow no helper", async () => {
  assert.ok(hostArch, `the library bundles no seccomp helper for ${process.arch}`);
  const l = await layout();
  try {
    const home = realpathSync(homedir());
    await mkdir(path.join(l.root, "check-home"));
    const paths = { cwd: realpathSync(l.candidate), tempDir: realpathSync(path.join(l.root, "check-home")), dataDir: realpathSync(l.dataDir), nodePrefix: path.dirname(path.dirname(realpathSync(process.execPath))) };
    const base = [paths.cwd, paths.tempDir, paths.nodePrefix];
    const linux = checkSandboxPolicy(paths, "linux").filesystem;
    assert.deepEqual(linux.allowRead, [...base, helperDir(hostArch)]);
    assert.deepEqual(linux.denyRead, [home, paths.dataDir]);
    assert.deepEqual(linux.allowWrite, [paths.tempDir]);
    assert.deepEqual(await readdir(helperDir(hostArch)), ["apply-seccomp"], "the re-allowed directory holds the helper and nothing else");
    assert.equal(inside(helperDir(hostArch), home) || inside(helperDir(hostArch), paths.dataDir), false);
    assert.deepEqual(checkSandboxPolicy(paths, "darwin").filesystem.allowRead, base);
  } finally {
    await l.cleanup();
  }
});

test("a check for a candidate elsewhere cannot read the Host's dependency files under the home directory, beside the seccomp helper", async t => {
  assert.ok(hostArch, `the library bundles no seccomp helper for ${process.arch}`);
  const l = await layout();
  try {
    // Dependency files of this checkout, not a person's files: the package
    // manifest, the directory above the helper and the other architecture's
    // helper directory, then the helper itself.
    const otherArch = hostArch === "x64" ? "arm64" : "x64";
    const probes = [["manifest", path.join(sandboxRuntime, "package.json")], ["build", path.join(sandboxRuntime, "vendor", "seccomp", "build.ts")],
      ["other", path.join(helperDir(otherArch), "apply-seccomp")], ["helper", path.join(helperDir(hostArch), "apply-seccomp")]];
    const script = `const fs = require('node:fs');
for (const [name, file] of ${JSON.stringify(probes)}) {
  try { fs.readFileSync(file); console.log('READ ' + name); } catch (e) { console.log('DENIED ' + name + ' ' + e.code); } }`;
    const result = await runCheckRecipe({ recipe: node(script), cwd: l.candidate, dataDir: l.dataDir });
    assert.equal(result.exitCode, 0, result.stderr);
    // A checkout outside the home directory has nothing here for the policy to deny.
    const hidden = inside(realpathSync(homedir()), sandboxRuntime);
    if (!hidden) t.diagnostic("this checkout is not under the home directory; the policy denies none of these files");
    const expected = name => (hidden && !(name === "helper" && process.platform === "linux") ? "DENIED" : "READ");
    for (const [name] of probes) assert.match(result.stdout, new RegExp(`^${expected(name)} ${name}\\b`, "m"), result.stdout);
  } finally {
    await l.cleanup();
  }
});

for (const [name, sandbox] of [
  ["the sandbox mechanism is absent", { platformBinary: "/nonexistent/courtwork-sandbox-binary" }],
  ["the Node prefix would re-open the home directory", { nodePrefix: homedir() }],
]) {
  test(`sandbox_unavailable starts no child when ${name}`, async () => {
    const l = await layout();
    try {
      // Without a sandbox this would write the marker outside the candidate.
      const marker = path.join(l.root, "executed");
      const recipe = node(`require('node:fs').writeFileSync(${JSON.stringify(marker)}, 'ran')`);
      await assert.rejects(runCheckRecipe({ recipe, cwd: l.candidate, dataDir: l.dataDir, sandbox }), { code: "sandbox_unavailable" });
      await assert.rejects(readFile(marker), { code: "ENOENT" });

      const candidate = { id: "candidate-one", status: "active", revision: 1, writeRevision: 0,
        sourceBindingId: "binding-one", sourceBindingRevision: 1, candidatePath: l.candidate };
      const started = [], settled = [];
      const [tool] = createCheckTools({ candidate, resolveCandidate: () => candidate, isOpen: () => true,
        recordStarted: async detail => started.push(detail), recordSettled: async detail => settled.push(detail),
        dataDir: l.dataDir, checkSandbox: sandbox });
      const params = { recipeId: "node-test" };
      await assert.rejects(tool.execute("call-one", params, undefined, undefined, tool.permissionContext(params)), { code: "sandbox_unavailable" });
      assert.equal(started.length, 1);
      assert.deepEqual(settled.map(s => [s.status, s.exitCode, s.signal, s.stdout, s.stderr, s.failure]),
        [["failed", null, null, "", "", { code: "sandbox_unavailable" }]]);
    } finally {
      await l.cleanup();
    }
  });
}
