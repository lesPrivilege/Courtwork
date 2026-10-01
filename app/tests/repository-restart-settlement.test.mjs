import assert from "node:assert/strict";
import test from "node:test";
import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { RuntimeStore } from "./fixtures/executor-store.mjs";
import { inspectRepositoryRoot } from "../runtime/repository-fs.mjs";
import { reopen } from "./helpers.mjs";

/* A Run whose prepared repository write was interrupted by a restart used to be
 * made terminal by the Store's startup fence, so the Host's restart settlement
 * skipped it: no partial answer, no run.status event, and an unsettled MCP
 * dispatch was reported as a repository write, which allows continuing it
 * (2026-09-29 convergence loop, S11). The Store now only fences the write and
 * closes admission; the Host settles the Run with the most specific reason. */

const sha256 = (bytes) => createHash("sha256").update(bytes).digest("hex");

async function interruptedWrite({ mcpDispatch = false } = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "cw-restart-write-"));
  const source = path.join(dataDir, "source"); await mkdir(source);
  execFileSync("git", ["init", "-q", source]);
  const store = await new RuntimeStore({ dataDir }).open();
  const project = await store.createProject("restart");
  const session = await store.createSession({ projectId: project.id, title: "restart", workspaceDir: path.join(dataDir, "managed") });
  await store.changeRepositoryBinding(session.id, { operation: "bind", requestId: "bind", expectedRevision: 0, rootPath: source, resolvedRoot: await inspectRepositoryRoot(source) });
  const candidateId = "323e4567-e89b-42d3-a456-426614174000";
  const sourceBindingId = store.getSession(session.id).repositoryBinding.id;
  await store.beginRepositoryCandidate(session.id, { operation: "create", requestId: "create", expectedRevision: 0, expectedBindingRevision: 1, sourceBindingId, candidateId, baseCommit: "a".repeat(40) });
  const container = path.join(dataDir, "candidate");
  await store.activateRepositoryCandidate(session.id, { requestId: "create", candidate: { objectFormat: "sha1", candidatePath: path.join(container, "worktree"),
    candidateDevice: "1", candidateInode: "2", candidateDirectory: container, candidateContainerDevice: "1", candidateContainerInode: "3",
    stagingDevice: "1", stagingInode: "4", gitDirectory: path.join(container, "git"), gitDevice: "1", gitInode: "5", gitVersion: "git version 2.fixture" } });
  const { run } = await store.createRun({ sessionId: session.id, input: "write then restart", adapterId: "fixture", commandId: "run",
    provider: { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions", realProvider: false },
    credentialGeneration: 0, expectedRepositoryBindingRevision: 1, expectedRepositoryCandidateRevision: 1 });
  await store.appendEvent({ runId: run.id, type: "assistant.delta", data: { text: "PARTIAL TEXT", segment: 0 } });
  if (mcpDispatch) await store.appendEvent({ runId: run.id, type: "runtime.mcp.dispatch", data: { dispatchId: "dispatch-1", serverId: "remote", tool: "effect" } });
  const content = Buffer.from("x\n");
  await store.prepareRepositoryWrite(run.id, { requestId: "write", candidateId, candidateRevision: 1, sourceBindingId, sourceBindingRevision: 1,
    candidateWriteRevision: 0, path: "new.txt", expectedSha256: null, before: { present: false }, contentSha256: sha256(content), bytes: content.length });
  await store.close();
  return { dataDir, sessionId: session.id, runId: run.id };
}

for (const mcpDispatch of [false, true]) {
  test(`an interrupted repository write${mcpDispatch ? " beside an unsettled MCP dispatch" : ""} is settled by the Host restart`, async () => {
    const fixture = await interruptedWrite({ mcpDispatch });
    const h = await reopen(fixture.dataDir);
    try {
      const run = (await h.api("GET", `/runs/${fixture.runId}`)).json.run;
      assert.equal(run.status, "unknown");
      assert.equal(run.admissionOpen, false);
      assert.equal(run.error.code, mcpDispatch ? "mcp_effect_unknown" : "repository_write_unknown");
      const events = h.runtime.store.listEvents({ sessionId: fixture.sessionId, runId: fixture.runId });
      assert.ok(events.some((e) => e.type === "repository.write.unknown"), "the write stays fenced");
      assert.ok(events.some((e) => e.type === "assistant.message" && e.data.partial === true && e.data.text === "PARTIAL TEXT"), "the received text is kept as a partial answer");
      assert.equal(events.at(-1).type, "run.status"); assert.equal(events.at(-1).data.status, "unknown");
    } finally {
      await h.runtime.close();
      await rm(fixture.dataDir, { recursive: true, force: true });
    }
  });
}
