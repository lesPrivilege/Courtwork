// Run from the Courtwork repository root after committing the source under test.
// CW_TEST_NODE_MODULES must name an existing local app/node_modules directory.
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import { boot } from "../../../../../app/tests/helpers.mjs";

const run = promisify(execFile);
const root = process.cwd();
const dependencies = process.env.CW_TEST_NODE_MODULES;
assert.ok(dependencies, "set CW_TEST_NODE_MODULES explicitly");
const scratch = await mkdtemp(path.join(tmpdir(), "cw-attention-host-probe-"));
let host;
try {
  const source = path.join(scratch, "source");
  await run("git", ["clone", "--quiet", "--no-hardlinks", root, source]);
  const baseCommit = (await run("git", ["rev-parse", "HEAD"], { cwd: source })).stdout.trim();
  host = await boot();
  const session = await host.createSession({ permissionMode: "ask" });
  const bound = await host.api("PUT", `/sessions/${session.id}/repository-binding`, {
    operation: "bind", requestId: "attention-probe-bind", expectedRevision: 0, rootPath: source,
  });
  assert.equal(bound.status, 200, JSON.stringify(bound.json));
  const candidateId = "923e4567-e89b-42d3-a456-426614174099";
  const created = await host.api("PUT", `/sessions/${session.id}/repository-candidate`, {
    operation: "create", requestId: "attention-probe-candidate", expectedRevision: 0,
    expectedBindingRevision: 1, candidateId, baseCommit,
  });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  const candidatePath = host.runtime.store.getSession(session.id).repositoryCandidate.candidatePath;
  await symlink(dependencies, path.join(candidatePath, "app/node_modules"));
  const request = await host.api("POST", `/sessions/${session.id}/runs`, {
    commandId: "attention-probe-check",
    input: host.scriptInput([{ name: "check_run", arguments: { recipeId: "node-test-attention-contract" } }]),
  });
  assert.equal(request.status, 200, JSON.stringify(request.json));
  const runId = request.json.run.id;
  await host.pollRun(runId, { until: status => status === "waiting_user", timeoutMs: 20000 });
  const events = () => host.runtime.store.snapshot().events.filter(event => event.runId === runId);
  const permission = events().find(event => event.type === "permission.open");
  assert.ok(permission);
  const approved = await host.api("POST", `/runs/${runId}/questions/${permission.data.id}`, { decision: "allow" });
  assert.equal(approved.status, 200);
  const finished = await host.pollRun(runId, { timeoutMs: 120000 });
  const started = events().find(event => event.type === "check.started");
  const settled = events().find(event => event.type === "check.settled");
  assert.equal(finished.status, "completed");
  assert.equal(settled.data.status, "completed");
  assert.equal(settled.data.exitCode, 0);
  assert.equal(events().filter(event => event.type === "check.settled").length, 1);
  assert.deepEqual([started.data.candidateId, started.data.candidateWriteRevision], [candidateId, 0]);
  console.log(JSON.stringify({ baseCommit, candidateId, permission: {
    recipeId: permission.data.recipeId, recipeVersion: permission.data.recipeVersion,
    command: permission.data.command, argv: permission.data.argv, cwd: permission.data.cwd,
    candidateId: permission.data.candidateId, candidateWriteRevision: permission.data.candidateWriteRevision,
    timeoutMs: permission.data.timeoutMs, outputLimitBytes: permission.data.outputLimitBytes, env: permission.data.env,
  }, checkStarted: started.data, checkSettled: settled.data, provider: "local-fake" }, null, 2));
} finally {
  await host?.runtime.close();
  if (host) await rm(host.dataDir, { recursive: true, force: true });
  await rm(scratch, { recursive: true, force: true });
}
