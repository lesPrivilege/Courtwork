// Harness recipe · real fake-provider Host check_run on a private candidate
// with candidate-local dependencies (npm ci --ignore-scripts, isolated
// HOME/cache, empty user/global npm config, public registry). Run from the
// Courtwork tree whose committed source is SOURCE_SHA; writes RESULT_PATH.
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { fileURLToPath } from "node:url";

const run = promisify(execFile);
const TREE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const SOURCE_SHA = process.env.SOURCE_SHA;
const RESULT_PATH = process.env.RESULT_PATH;
assert.match(SOURCE_SHA ?? "", /^[0-9a-f]{40}$/);
const sha256 = bytes => createHash("sha256").update(bytes).digest("hex");
const { boot } = await import(path.join(TREE, "app/tests/helpers.mjs"));

const scratch = await mkdtemp(path.join(tmpdir(), "cw-harness-probe-"));
const h = await boot();
try {
  const sourceDir = path.join(scratch, "source");
  await run("git", ["clone", "-q", "--no-local", TREE, sourceDir]);
  await run("git", ["checkout", "-q", "--detach", SOURCE_SHA], { cwd: sourceDir });
  const session = await h.createSession({ permissionMode: "ask" });
  const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, { operation: "bind", requestId: "harness-bind", expectedRevision: 0, rootPath: sourceDir });
  assert.equal(bound.status, 200, JSON.stringify(bound.json));
  const candidateId = "a23e4567-e89b-42d3-a456-426614174301";
  const created = await h.api("PUT", `/sessions/${session.id}/repository-candidate`, {
    operation: "create", requestId: "harness-candidate", expectedRevision: 0, expectedBindingRevision: 1, candidateId, baseCommit: SOURCE_SHA });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  const candidatePath = h.runtime.store.getSession(session.id).repositoryCandidate.candidatePath;
  const appDir = path.join(candidatePath, "app");

  // Explicit candidate preparation, before any check approval.
  const npmHome = path.join(scratch, "npm-home"), npmCache = path.join(scratch, "npm-cache");
  const emptyUserConfig = path.join(scratch, "empty-user-npmrc"), emptyGlobalConfig = path.join(scratch, "empty-global-npmrc");
  await writeFile(emptyUserConfig, ""); await writeFile(emptyGlobalConfig, "");
  await run("mkdir", ["-p", npmHome, npmCache]);
  const lockBefore = sha256(await readFile(path.join(appDir, "package-lock.json")));
  const packageBefore = sha256(await readFile(path.join(appDir, "package.json")));
  const npmEnv = { PATH: process.env.PATH, HOME: npmHome, LANG: "C", npm_config_cache: npmCache,
    npm_config_userconfig: emptyUserConfig, npm_config_globalconfig: emptyGlobalConfig, npm_config_registry: "https://registry.npmjs.org/" };
  const npmStarted = Date.now();
  const install = await run("npm", ["ci", "--ignore-scripts", "--no-audit", "--no-fund"], { cwd: appDir, env: npmEnv, maxBuffer: 16 * 1024 * 1024 });
  const npmSeconds = (Date.now() - npmStarted) / 1000;
  const npmVersion = (await run("npm", ["--version"], { env: npmEnv })).stdout.trim();
  const installed = JSON.parse(await readFile(path.join(appDir, "node_modules/.package-lock.json"), "utf8"));
  const inventory = Object.entries(installed.packages).filter(([key]) => key).map(([key, value]) => `${key.replace(/^node_modules\//, "")}@${value.version}`).sort();
  assert.equal(sha256(await readFile(path.join(appDir, "package-lock.json"))), lockBefore, "lockfile bytes preserved");
  assert.equal(sha256(await readFile(path.join(appDir, "package.json"))), packageBefore, "package.json bytes preserved");
  const status = (await run("git", ["status", "--porcelain"], { cwd: candidatePath })).stdout;
  assert.equal(status, "", "dependency preparation leaves the candidate's tracked tree clean");

  const made = await h.api("POST", `/sessions/${session.id}/runs`, { commandId: "harness-real-check",
    input: h.scriptInput([{ name: "check_run", arguments: { recipeId: "node-test-harness-contract" } }]) });
  assert.equal(made.status, 200, JSON.stringify(made.json));
  const runId = made.json.run.id;
  await h.pollRun(runId, { until: s => s === "waiting_user", timeoutMs: 20000 });
  const events = () => h.runtime.store.snapshot().events.filter(e => e.runId === runId);
  const permission = events().find(e => e.type === "permission.open");
  assert.equal((await h.api("POST", `/runs/${runId}/questions/${permission.data.id}`, { decision: "allow" })).status, 200);
  const finished = await h.pollRun(runId, { timeoutMs: 180000 });
  const started = events().find(e => e.type === "check.started");
  const settled = events().find(e => e.type === "check.settled");
  const counts = Object.fromEntries(["tests", "pass", "fail", "cancelled", "skipped"].map(k => [k, Number(settled.data.stdout.match(new RegExp(`ℹ ${k} (\\d+)`))?.[1] ?? NaN)]));
  const targets = permission.data.argv.filter(a => !a.startsWith("-"));
  const result = {
    sourceSha: SOURCE_SHA, node: process.version, npm: npmVersion,
    candidate: { id: candidateId, baseCommit: SOURCE_SHA, writeRevision: permission.data.candidateWriteRevision },
    dependencies: { command: "npm ci --ignore-scripts --no-audit --no-fund", registry: npmEnv.npm_config_registry,
      isolatedHomeAndCache: true, emptyUserAndGlobalConfig: true, seconds: npmSeconds,
      packageJsonSha256: packageBefore, packageLockSha256: lockBefore,
      installedLockSha256: sha256(Buffer.from(JSON.stringify(installed))), packageCount: inventory.length, inventory,
      npmOutputTail: install.stdout.trim().split("\n").slice(-2) },
    permission: { tool: permission.data.tool, recipeId: permission.data.recipeId, recipeVersion: permission.data.recipeVersion,
      command: permission.data.command === process.execPath ? "process.execPath" : permission.data.command, argv: permission.data.argv, cwd: permission.data.cwd,
      candidateId: permission.data.candidateId, candidateWriteRevision: permission.data.candidateWriteRevision,
      timeoutMs: permission.data.timeoutMs, outputLimitBytes: permission.data.outputLimitBytes, env: permission.data.env },
    runStatus: finished.status,
    started: started.data,
    settled: { ...settled.data, stdout: undefined, stderr: undefined,
      stdoutSha256: sha256(Buffer.from(settled.data.stdout)), stderrSha256: sha256(Buffer.from(settled.data.stderr)),
      stdoutBytes: Buffer.byteLength(settled.data.stdout), stderrBytes: Buffer.byteLength(settled.data.stderr), counts,
      stdoutTail: settled.data.stdout.trim().split("\n").slice(-9) },
    targetsInCandidate: await Promise.all(targets.map(async t => ({ path: t, sha256: sha256(await readFile(path.join(candidatePath, t))) }))),
  };
  await writeFile(RESULT_PATH, JSON.stringify(result, null, 2) + "\n");
  await writeFile(RESULT_PATH.replace(/\.json$/, ".stdout.txt"), settled.data.stdout);
  console.log(JSON.stringify({ runStatus: result.runStatus, status: settled.data.status, exitCode: settled.data.exitCode,
    durationMs: settled.data.durationMs, counts, truncated: settled.data.truncated, npmSeconds, packages: inventory.length }));
} finally {
  await h.runtime.close();
  await rm(h.dataDir, { recursive: true, force: true });
  await rm(scratch, { recursive: true, force: true });
}
