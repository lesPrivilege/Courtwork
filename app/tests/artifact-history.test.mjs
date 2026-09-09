import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { ArtifactHistory } from "../runtime/artifact-history.mjs";
import { MAX_READ_BYTES } from "../runtime/workspace-tools.mjs";
import { RuntimeStore } from "../server/store.mjs";
import { boot, reopen, spawnWorker } from "./helpers.mjs";

const sha256 = (value) => createHash("sha256").update(value, "utf8").digest("hex");

function artifactUrl(sessionId, { runId, path: relativePath, sha256: digest }) {
  const query = new URLSearchParams({ runId, path: relativePath, sha256: digest });
  return `/sessions/${sessionId}/artifacts/file?${query}`;
}

function assertHistoryResponse(result, { sessionId, runId, path: relativePath, text, sha256: digest, truncated = false }) {
  assert.equal(result.status, 200);
  assert.deepEqual(Object.keys(result.json).sort(), ["bytes", "kind", "path", "runId", "sha256", "text", "truncated"]);
  assert.equal(result.json.path, relativePath);
  assert.equal(result.json.runId, runId);
  assert.equal(result.json.kind, "content-version");
  assert.equal(result.json.bytes, Buffer.byteLength(text, "utf8"));
  assert.equal(result.json.sha256, digest);
  assert.equal(result.json.text, text);
  assert.equal(result.json.truncated, truncated);
  assert.equal(JSON.stringify(result.json).includes("git"), false, "the HTTP response must not expose Git internals");
  assert.equal(JSON.stringify(result.json).includes("workspaceDir"), false, "the HTTP response must not expose host paths");
  return sessionId;
}

async function writeVersions({ api, createSession, pollRun, scriptInput, first = "version one\n", second = "version two\n" } = {}) {
  const session = await createSession();
  const created = await api("POST", `/sessions/${session.id}/runs`, {
    input: scriptInput([
      { name: "ws_write", arguments: { path: "out/memo.md", text: first } },
      { name: "ws_write", arguments: { path: "out/memo.md", text: second } },
    ]),
    commandId: "history-v1-v2",
  });
  assert.equal(created.status, 200);
  const run = await pollRun(created.json.run.id);
  assert.equal(run.status, "completed");
  assert.equal(run.artifacts.length, 2);
  return { session, run, first, second, v1: run.artifacts[0], v2: run.artifacts[1] };
}

function crashEnv(point) {
  return { SE_TEST_MODE: "1", SE_TEST_CRASH_POINT: point };
}

async function crashDuringHistory(point, { text = "history-crash\n" } = {}) {
  const dataDir = await mkdtemp(path.join(tmpdir(), "se-r1-history-crash-"));
  const worker = spawnWorker({
    dataDir,
    env: crashEnv(point),
    body: `
      await api("PUT", "/provider-credential", { connectionId: "catalog-fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
      const project = await api("POST", "/projects", { name: "history-crash-project" });
      const session = await api("POST", "/sessions", { projectId: project.json.project.id, title: "history-crash-session" });
      const script = JSON.stringify([{ name: "ws_write", arguments: { path: "out/crash.md", text: ${JSON.stringify(text)} } }]);
      emit({ stage: "ready", sessionId: session.json.session.id });
      const created = await api("POST", "/sessions/" + session.json.session.id + "/runs", { input: "/fixture script " + script, commandId: "history-crash" });
      emit({ stage: "submitted", runId: created.json.run.id });
      await new Promise(() => {});
    `,
  });
  const ready = await worker.waitForLine((value) => value.stage === "ready");
  assert.ok(ready, `worker never reached setup; stderr=${worker.stderr}`);
  const submitted = await worker.waitForLine((value) => value.stage === "submitted");
  const exit = await worker.waitForExit();
  assert.equal(exit.signal, "SIGKILL", `the ${point} crash point must kill the process`);
  assert.ok(worker.stdout.includes("crash point") && worker.stdout.includes("ARMED"), "crash point must be armed");
  await delay(200);
  return { dataDir, sessionId: ready.sessionId, runId: submitted.runId, text };
}

// R1-HIST-1: both content versions are addressable by their immutable hash;
// deleting the mutable current file does not remove historical bytes.
test("R1-HIST-1: v1 and v2 remain readable after current-file deletion", async () => {
  const { runtime, api, pollRun, createSession, scriptInput } = await boot();
  try {
    const { session, run, first, second, v1, v2 } = await writeVersions({ api, createSession, pollRun, scriptInput });
    assertHistoryResponse(await api("GET", artifactUrl(session.id, { runId: run.id, path: v1.path, sha256: v1.sha256 })), {
      sessionId: session.id, runId: run.id, path: v1.path, text: first, sha256: v1.sha256,
    });
    assertHistoryResponse(await api("GET", artifactUrl(session.id, { runId: run.id, path: v2.path, sha256: v2.sha256 })), {
      sessionId: session.id, runId: run.id, path: v2.path, text: second, sha256: v2.sha256,
    });

    await rm(path.join(session.workspaceDir, "out", "memo.md"));
    const current = await api("GET", `/sessions/${session.id}/workspace/file?path=out%2Fmemo.md`);
    assert.equal(current.status, 404);
    assertHistoryResponse(await api("GET", artifactUrl(session.id, { runId: run.id, path: v1.path, sha256: v1.sha256 })), {
      sessionId: session.id, runId: run.id, path: v1.path, text: first, sha256: v1.sha256,
    });
  } finally {
    await runtime.close();
  }
});

// R1-HIST-2: session/run/path/hash is the authorization boundary; a history
// read is pure and does not add events, mutate artifacts, or change the run.
test("R1-HIST-2: cross-session, wrong-record, and unrecorded lookups are 404 and reads are pure", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const { session, run, first, v1 } = await writeVersions({ api, createSession, pollRun, scriptInput });
    const other = await createSession({ title: "other-session" });
    const beforeSession = await api("GET", `/sessions/${session.id}`);
    const beforeEvents = await api("GET", `/sessions/${session.id}/events`);

    const crossSession = await api("GET", artifactUrl(other.id, { runId: run.id, path: v1.path, sha256: v1.sha256 }));
    assert.equal(crossSession.status, 404);
    assert.equal(crossSession.json.error.code, "not_found");
    const wrongRecord = await api("GET", artifactUrl(session.id, { runId: run.id, path: "out/never-written.md", sha256: sha256(first) }));
    assert.equal(wrongRecord.status, 404);
    assert.equal(wrongRecord.json.error.code, "not_found");

    const valid = await api("GET", artifactUrl(session.id, { runId: run.id, path: v1.path, sha256: v1.sha256 }));
    assert.equal(valid.status, 200);
    assert.deepEqual((await api("GET", `/sessions/${session.id}`)).json, beforeSession.json);
    assert.deepEqual((await api("GET", `/sessions/${session.id}/events`)).json, beforeEvents.json);
  } finally {
    await runtime.close();
  }
});

// R1-HIST-3: historical text uses the same whole-byte digest as the writer,
// then applies the existing UTF-8-safe read limit to the returned text. The
// fixture is seeded through the shipped history module because the HTTP run
// input intentionally has a 100 KiB limit, below the 512 KiB read boundary.
test("R1-HIST-3: historical text truncates on a UTF-8 boundary with full bytes/hash", async () => {
  const { dataDir, runtime, api, createSession, pollRun } = await boot();
  try {
    const character = "漢";
    const content = character.repeat(Math.floor(MAX_READ_BYTES / Buffer.byteLength(character, "utf8")) + 1000);
    const session = await createSession();
    const created = await api("POST", `/sessions/${session.id}/runs`, {
      input: "history truncation fixture",
      commandId: "history-wide",
    });
    assert.equal(created.status, 200);
    const run = await pollRun(created.json.run.id);
    assert.equal(run.status, "completed");
    await runtime.close();

    const digest = sha256(content);
    await new ArtifactHistory(dataDir).save(session.id, Buffer.from(content, "utf8"), digest);
    const store = await new RuntimeStore({ dataDir }).open();
    try {
      await store.appendArtifact(run.id, { path: "out/wide.md", bytes: Buffer.byteLength(content, "utf8"), sha256: digest });
    } finally {
      await store.close();
    }

    const reopened = await reopen(dataDir);
    try {
      const result = await reopened.api("GET", artifactUrl(session.id, { runId: run.id, path: "out/wide.md", sha256: digest }));
      assert.equal(result.status, 200);
      assert.equal(result.json.truncated, true);
      assert.ok(!result.json.text.includes("�"));
      assert.equal(result.json.text, character.repeat(result.json.text.length));
      assert.equal(result.json.text.length, Math.floor(MAX_READ_BYTES / Buffer.byteLength(character, "utf8")));
      assert.equal(result.json.bytes, Buffer.byteLength(content, "utf8"));
      assert.equal(result.json.sha256, sha256(content));
    } finally {
      await reopened.runtime.close();
    }
  } finally {
    await runtime.close();
  }
});

// R1-HIST-4: a legacy artifact row without a backing history object is
// distinguishable from an unknown locator and returns 410.
test("R1-HIST-4: a recorded legacy artifact without history returns 410 history_unavailable", async () => {
  const { dataDir, runtime, api, createSession, pollRun } = await boot();
  const content = "legacy bytes\n";
  try {
    const session = await createSession();
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: "legacy fixture run", commandId: "legacy-run" });
    const run = await pollRun(created.json.run.id);
    await runtime.close();

    const store = await new RuntimeStore({ dataDir }).open();
    try {
      await store.appendArtifact(run.id, { path: "out/legacy.md", bytes: Buffer.byteLength(content), sha256: sha256(content) });
    } finally {
      await store.close();
    }

    const reopened = await reopen(dataDir);
    try {
      const result = await reopened.api("GET", artifactUrl(session.id, { runId: run.id, path: "out/legacy.md", sha256: sha256(content) }));
      assert.equal(result.status, 410);
      assert.equal(result.json.error.code, "history_unavailable");
    } finally {
      await reopened.runtime.close();
    }
  } catch (error) {
    if (runtime?.server?.listening) await runtime.close();
    throw error;
  }
});

// R1-HIST-5: the test creates a valid object reference through a real write,
// then adds a metadata row with the same hash but an impossible byte count.
// The route must verify object bytes against both digest and recorded length.
test("R1-HIST-5: object/metadata byte mismatch returns 500 artifact_integrity_failed", async () => {
  const { dataDir, runtime, api, createSession, pollRun, scriptInput } = await boot();
  const content = "integrity source\n";
  try {
    const session = await createSession();
    const created = await api("POST", `/sessions/${session.id}/runs`, {
      input: scriptInput([{ name: "ws_write", arguments: { path: "out/source.md", text: content } }]),
      commandId: "integrity-source",
    });
    const run = await pollRun(created.json.run.id);
    const valid = run.artifacts[0];
    await runtime.close();

    const store = await new RuntimeStore({ dataDir }).open();
    try {
      await store.appendArtifact(run.id, {
        path: "out/tampered.md",
        bytes: valid.bytes + 1,
        sha256: valid.sha256,
      });
    } finally {
      await store.close();
    }

    const reopened = await reopen(dataDir);
    try {
      const result = await reopened.api("GET", artifactUrl(session.id, { runId: run.id, path: "out/tampered.md", sha256: valid.sha256 }));
      assert.equal(result.status, 500);
      assert.equal(result.json.error.code, "artifact_integrity_failed");
    } finally {
      await reopened.runtime.close();
    }
  } finally {
    // runtime is intentionally closed before direct store mutation; this is
    // safe as a no-op for the normal assertion path.
    await runtime.close().catch(() => {});
  }
});

// R1-HIST-6: the object/ref may exist after this crash point, but no rename or
// artifact row happened; unreferenced history is never exposed by the API.
test("R1-HIST-6: SIGKILL after history and before rename exposes neither file nor artifact", async () => {
  const { dataDir, sessionId, runId, text } = await crashDuringHistory("after_history");
  const { runtime, api } = await reopen(dataDir);
  try {
    const snapshot = await api("GET", `/sessions/${sessionId}`);
    assert.equal(snapshot.status, 200);
    assert.equal(snapshot.json.runs.find((run) => run.id === runId).status, "unknown");
    assert.deepEqual(snapshot.json.runs.find((run) => run.id === runId).artifacts, []);
    assert.equal((await api("GET", `/sessions/${sessionId}/workspace/file?path=out%2Fcrash.md`)).status, 404);
    const history = await api("GET", artifactUrl(sessionId, { runId, path: "out/crash.md", sha256: sha256(text) }));
    assert.equal(history.status, 404);
  } finally {
    await runtime.close();
  }
});

// R1-HIST-7: rename-before-record remains a visible unrecorded current file;
// the history object is not discoverable without a persisted artifact row.
test("R1-HIST-7: SIGKILL after rename and before record leaves current file unrecorded", async () => {
  const { dataDir, sessionId, runId, text } = await crashDuringHistory("after_write");
  const { runtime, api } = await reopen(dataDir);
  try {
    const snapshot = await api("GET", `/sessions/${sessionId}`);
    const run = snapshot.json.runs.find((item) => item.id === runId);
    assert.equal(run.status, "unknown");
    assert.deepEqual(run.artifacts, []);
    const file = await api("GET", `/sessions/${sessionId}/workspace/file?path=out%2Fcrash.md`);
    assert.equal(file.status, 200);
    assert.equal(file.json.text, text);
    assert.equal((await api("GET", artifactUrl(sessionId, { runId, path: "out/crash.md", sha256: sha256(text) }))).status, 404);
    const events = (await api("GET", `/sessions/${sessionId}/events`)).json.events;
    assert.equal(events.filter((event) => event.type === "artifact.written").length, 0);
    assert.equal(events.filter((event) => event.type === "run.notice" && event.data.kind === "unrecorded_files").length, 1);
  } finally {
    await runtime.close();
  }
});

// R1-HIST-8: after the record is durable, restart can read the immutable
// version even though the Run itself is honestly marked unknown.
test("R1-HIST-8: SIGKILL after record preserves historical bytes across restart", async () => {
  const { dataDir, sessionId, runId, text } = await crashDuringHistory("after_record", { text: "recorded history\n" });
  const { runtime, api } = await reopen(dataDir);
  try {
    const snapshot = await api("GET", `/sessions/${sessionId}`);
    const run = snapshot.json.runs.find((item) => item.id === runId);
    assert.equal(run.status, "unknown");
    assert.equal(run.artifacts.length, 1);
    const artifact = run.artifacts[0];
    const history = await api("GET", artifactUrl(sessionId, { runId, path: artifact.path, sha256: artifact.sha256 }));
    assertHistoryResponse(history, { sessionId, runId, path: artifact.path, text, sha256: artifact.sha256 });
    assert.equal((await api("GET", `/sessions/${sessionId}/events`)).json.events.filter((event) => event.type === "run.notice" && event.data.kind === "unrecorded_files").length, 0);
  } finally {
    await runtime.close();
  }
});
