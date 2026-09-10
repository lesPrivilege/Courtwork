import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { spawnWorker, reopen } from "./helpers.mjs";
import { RuntimeStore } from "../server/store.mjs";

// The crash-point substitution used by this file: SE_TEST_CRASH_POINT names a
// place in the real code path, and SE_TEST_MODE=1 arms it. Nothing else is
// stubbed — the provider is the loopback fake, the tools, store, permission
// policy and service are the shipped ones, and the process really does die
// (SIGKILL to itself), so what the next server reads is genuinely whatever
// survived on disk.

const CRASH_ENV = (point) => ({ SE_TEST_MODE: "1", SE_TEST_CRASH_POINT: point });

/** Drive one scripted ws_write in a child that is armed to die mid-way. */
function writeWorkerBody({ commandId = "c1", text = "crash-content" } = {}) {
  return `
    await api("PUT", "/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
    const proj = await api("POST", "/projects", { name: "p1" });
    const sess = await api("POST", "/sessions", { projectId: proj.json.project.id, title: "crash-session" });
    const script = JSON.stringify([{ name: "ws_write", arguments: { path: "out/crash.md", text: ${JSON.stringify(text)} } }]);
    emit({ sessionId: sess.json.session.id, stage: "ready" });
    const run = await api("POST", "/sessions/" + sess.json.session.id + "/runs", { input: "/fixture script " + script, commandId: ${JSON.stringify(commandId)} });
    emit({ runId: run.json.run.id, stage: "submitted" });
    await new Promise(() => {});
  `;
}

async function crashDuringWrite(point, options) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "se-c2-dur-"));
  const worker = spawnWorker({ dataDir, body: writeWorkerBody(options), env: CRASH_ENV(point) });
  const ready = await worker.waitForLine((value) => value.stage === "ready");
  assert.ok(ready, `worker never reached setup; stderr=${worker.stderr}`);
  const submitted = await worker.waitForLine((value) => value.stage === "submitted");
  const exit = await worker.waitForExit();
  assert.equal(exit.signal, "SIGKILL", "the armed crash point must kill the process, not exit cleanly");
  assert.ok(
    worker.stdout.includes("crash point") && worker.stdout.includes("ARMED"),
    "an armed crash point must announce itself in the startup log",
  );
  await delay(200);
  return { dataDir, sessionId: ready.sessionId, runId: submitted?.runId ?? null, worker };
}

// T-DUR-1: SIGKILL before the tool does anything. Nothing was written, so the
// restart must show an unknown run, an untouched workspace, and no replay.
test("T-DUR-1: a crash before the tool runs leaves no file, no artifact and no replay", async () => {
  const { dataDir, sessionId } = await crashDuringWrite("before_tool");
  const { runtime, api, logs } = await reopen(dataDir);
  try {
    const runs = (await api("GET", `/sessions/${sessionId}`)).json.runs;
    assert.equal(runs.length, 1, "the restart must not create a second run");
    assert.equal(runs[0].status, "unknown");
    assert.equal(runs[0].error.code, "restart_unknown");
    assert.deepEqual(runs[0].artifacts, []);

    const tree = (await api("GET", `/sessions/${sessionId}/workspace`)).json.tree;
    assert.deepEqual(tree, [], "the workspace must be untouched");

    const events = (await api("GET", `/sessions/${sessionId}/events`)).json.events;
    assert.equal(events.filter((e) => e.type === "user.message").length, 1, "the command must not be replayed");
    assert.ok(!events.some((e) => e.type === "run.notice" && e.data.kind === "unrecorded_files"), "there is nothing unrecorded to report");
    assert.ok(logs.some((line) => line.includes("reconciled workspace")), "reconciliation must run and say so");
  } finally {
    await runtime.close();
  }
});

// T-DUR-2: SIGKILL after ws_write's rename lands but before the artifact
// record is persisted. The file exists and is NOT in run.artifacts; the
// restart reports the discrepancy as a run.notice and neither back-fills the
// record nor rewrites the file.
test("T-DUR-2: a crash between the write and the record surfaces the file as unrecorded", async () => {
  const body = "crash-content";
  const { dataDir, sessionId } = await crashDuringWrite("after_write", { text: body });
  const { runtime, api } = await reopen(dataDir);
  try {
    const runs = (await api("GET", `/sessions/${sessionId}`)).json.runs;
    assert.equal(runs.length, 1);
    assert.equal(runs[0].status, "unknown");
    assert.deepEqual(runs[0].artifacts, [], "the artifact record never reached the store, and must not be invented now");

    const file = await api("GET", `/sessions/${sessionId}/workspace/file?path=out/crash.md`);
    assert.equal(file.status, 200, "the written bytes are on disk");
    assert.equal(file.json.text, body, "the file must not be rewritten by recovery");

    const notices = (await api("GET", `/sessions/${sessionId}/events`)).json.events
      .filter((e) => e.type === "run.notice" && e.data.kind === "unrecorded_files");
    assert.equal(notices.length, 1);
    assert.deepEqual(notices[0].data.files.map((f) => f.path), ["out/crash.md"]);
    assert.equal(notices[0].data.files[0].sha256, file.json.sha256);

    assert.ok(
      !(await api("GET", `/sessions/${sessionId}`)).json.runs.some((run) => run.artifacts.length),
      "a notice is a report, not a record",
    );
  } finally {
    await runtime.close();
  }
});

// T-DUR-3: SIGKILL after the artifact record is durable. The record survives
// and still describes the bytes on disk.
test("T-DUR-3: a crash after the record is persisted keeps artifact and file in agreement", async () => {
  const { dataDir, sessionId } = await crashDuringWrite("after_record", { text: "recorded-content" });
  const { runtime, api } = await reopen(dataDir);
  try {
    const runs = (await api("GET", `/sessions/${sessionId}`)).json.runs;
    assert.equal(runs[0].status, "unknown", "the run itself was still in flight");
    assert.equal(runs[0].artifacts.length, 1);
    const artifact = runs[0].artifacts[0];
    assert.equal(artifact.path, "out/crash.md");
    assert.equal(artifact.kind, "content-version");

    const file = await api("GET", `/sessions/${sessionId}/workspace/file?path=out/crash.md`);
    assert.equal(file.json.sha256, artifact.sha256, "the recorded content version is the file on disk");
    assert.equal(file.json.kind, "current");

    const notices = (await api("GET", `/sessions/${sessionId}/events`)).json.events
      .filter((e) => e.type === "run.notice" && e.data.kind === "unrecorded_files");
    assert.equal(notices.length, 0, "a recorded file is not an unrecorded file");
  } finally {
    await runtime.close();
  }
});

// T-DUR-4: SIGKILL between the state file's tmp write and its rename. The
// last complete runtime-state.json is what the restart reads; the tmp is
// discarded and the discard is logged.
test("T-DUR-4: a crash during a store write keeps the last complete state and discards the tmp", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "se-c2-store-"));
  // The qualifier "with-run" makes the crash land on the first persist that
  // carries a run, so setup completes and the crash has a definite target.
  const worker = spawnWorker({
    dataDir,
    env: CRASH_ENV("store_write:with-run"),
    body: `
      await api("PUT", "/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
      const proj = await api("POST", "/projects", { name: "p1" });
      const sess = await api("POST", "/sessions", { projectId: proj.json.project.id, title: "store-crash" });
      emit({ sessionId: sess.json.session.id, projectId: proj.json.project.id, stage: "ready" });
      await api("POST", "/sessions/" + sess.json.session.id + "/runs", { input: "hello", commandId: "c1" });
      emit({ stage: "unreachable" });
      await new Promise(() => {});
    `,
  });
  const ready = await worker.waitForLine((value) => value.stage === "ready");
  assert.ok(ready);
  const exit = await worker.waitForExit();
  assert.equal(exit.signal, "SIGKILL");
  assert.ok(!worker.stdout.includes('"stage":"unreachable"'), "the crash must precede the rename");
  await delay(200);

  const entries = await readdir(dataDir);
  const tmps = entries.filter((name) => name.startsWith("runtime-state.json.") && name.endsWith(".tmp"));
  assert.equal(tmps.length, 1, "the interrupted write must have left exactly one tmp behind");

  const beforeRestart = JSON.parse(await readFile(path.join(dataDir, "runtime-state.json"), "utf8"));
  assert.equal(beforeRestart.schemaVersion, 12, "runtime-state.json is a complete, valid state");
  assert.equal(beforeRestart.sessions.length, 1, "it is the last state that was fully written");
  assert.equal(beforeRestart.runs.length, 0, "the run from the interrupted write never landed");
  const tmpContent = JSON.parse(await readFile(path.join(dataDir, tmps[0]), "utf8"));
  assert.equal(tmpContent.runs.length, 1, "the tmp holds the write that never became current");

  const { runtime, api, logs } = await reopen(dataDir);
  try {
    assert.ok(logs.some((line) => line.includes("discarded") && line.includes("incomplete state write")), "the discard must be logged, not silent");
    assert.deepEqual(await readdir(dataDir).then((names) => names.filter((n) => n.endsWith(".tmp"))), [], "the stale tmp is cleaned up");
    const session = await api("GET", `/sessions/${ready.sessionId}`);
    assert.equal(session.status, 200, "the last complete state is fully usable");
    assert.deepEqual(session.json.runs, [], "the run that was mid-write is simply not there");
  } finally {
    await runtime.close();
  }
});

// A stale tmp with unreadable garbage is also discarded rather than parsed:
// it was never a source of truth in the first place.
test("a corrupt leftover tmp never affects the state that is loaded", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "se-c2-tmpjunk-"));
  const store = await new RuntimeStore({ dataDir }).open();
  const project = await store.createProject("p");
  await store.close();
  await writeFile(path.join(dataDir, "runtime-state.json.deadbeef.tmp"), "{ not json at all");

  const logs = [];
  const reopened = await new RuntimeStore({ dataDir, logger: (line) => logs.push(line) }).open();
  try {
    assert.deepEqual(reopened.listProjects().map((p) => p.id), [project.id]);
    assert.ok(logs.some((line) => line.includes("discarded")));
    assert.deepEqual((await readdir(dataDir)).filter((n) => n.endsWith(".tmp")), []);
  } finally {
    await reopened.close();
  }
});

// T-IDEM-5: after a restart, replaying the same commandId returns the ORIGINAL
// run in its honest terminal state. It does not create a second run and it
// does not re-execute the command.
test("T-IDEM-5: replaying a commandId after a restart returns the original unknown run", async () => {
  const { dataDir, sessionId, runId } = await crashDuringWrite("before_tool", { commandId: "resend-me" });
  const { runtime, api } = await reopen(dataDir);
  try {
    const before = (await api("GET", `/sessions/${sessionId}`)).json.runs;
    assert.equal(before.length, 1);
    assert.equal(before[0].status, "unknown");

    const replay = await api("POST", `/sessions/${sessionId}/runs`, {
      input: `/fixture script ${JSON.stringify([{ name: "ws_write", arguments: { path: "out/crash.md", text: "crash-content" } }])}`,
      commandId: "resend-me",
    });
    assert.equal(replay.status, 200);
    assert.equal(replay.json.run.id, runId, "the same commandId names the same run");
    assert.equal(replay.json.run.status, "unknown", "a replay reports the real state; it does not restart the work");

    await delay(300);
    const after = (await api("GET", `/sessions/${sessionId}`)).json.runs;
    assert.equal(after.length, 1, "no second run");
    assert.deepEqual((await api("GET", `/sessions/${sessionId}/workspace`)).json.tree, [], "nothing was executed");
    const userMessages = (await api("GET", `/sessions/${sessionId}/events`)).json.events.filter((e) => e.type === "user.message");
    assert.equal(userMessages.length, 1);
  } finally {
    await runtime.close();
  }
});
