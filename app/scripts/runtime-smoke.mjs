import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import path from "node:path";
import { tmpdir } from "node:os";
import { setTimeout as delay } from "node:timers/promises";
import { createRuntime } from "../server/runtime.mjs";

// Reproducible SDK/tool/storage smoke. Loopback only: real-model Web UI
// acceptance is separate. No HTTP server, UI or domain extension is required.
const dataDir = await mkdtemp(path.join(tmpdir(), "fresh-runtime-smoke-"));
let runtime;
async function execute(sessionId, commandId, calls) {
  const { run } = await runtime.service.createRun(sessionId, {
    commandId, input: `/fixture script ${JSON.stringify(calls)}`,
  });
  const deadline = Date.now() + 10000;
  for (;;) {
    const current = runtime.service.getRun(run.id).run;
    if (!["running", "waiting_user", "stopping"].includes(current.status)) {
      assert.equal(current.status, "completed"); return current;
    }
    if (Date.now() > deadline) throw new Error("runtime smoke timed out");
    await delay(20);
  }
}
try {
  runtime = await createRuntime({ dataDir });
  const { project } = await runtime.service.createProject({ name: "Runtime smoke" });
  const { session } = await runtime.service.createSession({ projectId: project.id, title: "Material to result" });
  await runtime.service.addMaterial(session.id, { name: "input.txt", text: "A fixed source for the local runtime smoke." });
  const first = await execute(session.id, "draft", [
    { name: "ws_read", arguments: { path: "materials/input.txt" } },
    { name: "ws_write", arguments: { path: "out/result.md", text: "First draft\n" } },
  ]);
  assert.equal(first.artifacts.length, 1);
  const prior = first.artifacts[0];
  await runtime.close();
  runtime = await createRuntime({ dataDir });
  const revised = await execute(session.id, "revision", [
    { name: "ws_read", arguments: { path: "out/result.md" } },
    { name: "ws_write", arguments: { path: "out/result.md", text: "Revised draft\n" } },
  ]);
  assert.equal(revised.hostSession.id, first.hostSession.id);
  const historical = await runtime.service.getArtifactFile(session.id, new URLSearchParams({runId:first.id,path:prior.path,sha256:prior.sha256}));
  assert.equal(historical.text, "First draft\n");
  assert.equal((await runtime.service.getWorkspaceFile(session.id, prior.path)).text, "Revised draft\n");
  console.log(JSON.stringify({status:"passed", provider:"local-fake", transport:"public runtime service", checks:["material read", "tool write", "persisted artifact", "runtime close/reopen", "session continuation", "revision", "historical bytes"], realProvider:"not_run"}, null, 2));
} finally {
  if (runtime) await runtime.close();
  await rm(dataDir, { recursive: true, force: true });
}
