import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnWorker } from "./helpers.mjs";

// A crash point must be inert unless test mode is explicitly on, and its
// presence must never be silent. This test runs the real server with
// SE_TEST_CRASH_POINT set at a point it would certainly hit, and with
// SE_TEST_MODE absent — the server must survive and must say why.
test("SE_TEST_CRASH_POINT alone is inert, and the server says so at startup", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "se-c2-inert-"));
  const worker = spawnWorker({
    dataDir,
    env: { SE_TEST_CRASH_POINT: "before_tool", SE_TEST_MODE: "" },
    body: `
      await api("PUT", "/provider-credential", { provider: "fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
      const proj = await api("POST", "/projects", { name: "p" });
      const sess = await api("POST", "/sessions", { projectId: proj.json.project.id, title: "inert" });
      const script = JSON.stringify([{ name: "ws_write", arguments: { path: "out/x.md", text: "written anyway" } }]);
      const run = await api("POST", "/sessions/" + sess.json.session.id + "/runs", { input: "/fixture script " + script, commandId: "c1" });
      const finished = await waitRun(run.json.run.id, (r) => ["completed", "failed", "cancelled", "unknown"].includes(r.status));
      emit({ stage: "done", status: finished.status, artifacts: finished.artifacts.length });
      process.exit(0);
    `,
  });
  try {
    const done = await worker.waitForLine((value) => value.stage === "done");
    assert.ok(done, `worker died even though the crash point should be inert; stderr=${worker.stderr}`);
    assert.equal(done.status, "completed", "an unarmed crash point must not change behaviour at all");
    assert.equal(done.artifacts, 1);

    assert.ok(
      worker.stdout.includes("SE_TEST_CRASH_POINT") && worker.stdout.includes("INERT"),
      `the presence of the hook must be logged; stdout=${worker.stdout}`,
    );
    assert.ok(!worker.stdout.includes("ARMED"), "an unarmed hook must not claim to be armed");
    const exit = await worker.waitForExit();
    assert.equal(exit.code, 0);
    assert.equal(exit.signal, null, "the process must exit normally, not be killed");
  } finally {
    await worker.kill();
  }
});

// T-SELF-2: python3 is a hard requirement — it holds the POSIX flock on the
// data directory in its own process, which is what makes an owner SIGKILL
// release the lock. Without it the server must refuse to start and say why,
// never degrade to running unlocked.
test("T-SELF-2: with no python3 on PATH the server refuses to start and names the reason", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "se-c2-nopython-"));
  const emptyBin = await mkdtemp(path.join(tmpdir(), "se-c2-emptybin-"));
  const worker = spawnWorker({
    dataDir,
    // PATH points at an empty directory, so `python3` cannot be found. The
    // interpreter running the server is Node's own absolute path, so only the
    // lock holder's lookup is affected.
    env: { PATH: emptyBin, WORK_AGENT_PYTHON: "python3" },
    body: `emit({ stage: "started" });`,
  });
  try {
    const exit = await worker.waitForExit();
    assert.notEqual(exit.code, 0, "startup must fail, not degrade");
    assert.ok(!worker.stdout.includes('"stage":"started"'), "the server must never come up");
    assert.match(worker.stderr, /python3 was not found on PATH/, "the failure must name the missing dependency");
    assert.match(worker.stderr, /runtime lock/i, "and say what it is needed for");
    assert.match(worker.stderr, /no fallback/i, "and be explicit that there is no degraded mode");
  } finally {
    await worker.kill();
  }
});
