import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdir, mkdtemp, readdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { startServer } from "../server/index.mjs";
import { FAKE_CREDENTIAL_KEY } from "../runtime/pi-session-runtime.mjs";
import { boot } from "./helpers.mjs";

// T-CRED-1: no credential, env cleared, HOME points at an empty temp dir ->
// createRun ends failed/credential_missing, and <empty HOME>/.pi is never created.
test("T-CRED-1: missing credential fails the run without touching HOME/.pi", async () => {
  const emptyHome = await mkdtemp(path.join(tmpdir(), "se-empty-home-"));
  const originalHome = process.env.HOME;
  const originalKey = process.env.DEEPSEEK_API_KEY;
  delete process.env.DEEPSEEK_API_KEY;
  process.env.HOME = emptyHome;
  let runtime;
  try {
    const booted = await boot({ configureFakeCredential: false });
    runtime = booted.runtime;
    const { api, createSession, pollRun } = booted;
    const session = await createSession();
    await api("PUT", "/provider-config", { provider: "deepseek", model: "deepseek-v4-flash", api: "openai-completions" });
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: "hello", commandId: "cmd-1" });
    const run = await pollRun(created.json.run.id);
    assert.equal(run.status, "failed");
    assert.equal(run.error.code, "credential_missing");
    const homeEntries = await readdir(emptyHome).catch(() => []);
    assert.ok(!homeEntries.includes(".pi"), "HOME/.pi must not be created");
  } finally {
    await runtime?.close();
    process.env.HOME = originalHome;
    if (originalKey !== undefined) process.env.DEEPSEEK_API_KEY = originalKey;
  }
});

// T-CRED-2: a key written through the API (fake route) lets the run complete;
// the key string never appears in provider-config or any event/log.
test("T-CRED-2: a credential written via the API flows through and never leaks", async () => {
  const { runtime, api, createSession, pollRun } = await boot();
  try {
    const secret = "fake-local-loopback-key";
    const session = await createSession();
    const run = await api("POST", `/sessions/${session.id}/runs`, { input: "hello there", commandId: "cmd-1" });
    const finished = await pollRun(run.json.run.id);
    assert.equal(finished.status, "completed");

    const providerConfig = await api("GET", "/provider-config");
    assert.equal(providerConfig.json.credentialStatus, "configured");
    assert.equal(JSON.stringify(providerConfig.json).includes(secret), false);

    const events = (await api("GET", `/sessions/${session.id}/events`)).json.events;
    for (const event of events) {
      assert.equal(JSON.stringify(event).includes(secret), false, `event ${event.type} must not contain the key`);
    }
  } finally {
    await runtime.close();
  }
});

// T-CRED-3: a DEEPSEEK_API_KEY inherited by the process is removed at
// startup and the removal is logged.
test("T-CRED-3: inherited DEEPSEEK_API_KEY is stripped at startup and logged", async () => {
  const originalKey = process.env.DEEPSEEK_API_KEY;
  process.env.DEEPSEEK_API_KEY = "leftover-inherited-value";
  try {
    const dataDir = await mkdtemp(path.join(tmpdir(), "se-c1-test-"));
    const logs = [];
    const runtime = await startServer({ dataDir, port: 0, logger: (line) => logs.push(line) });
    assert.equal(process.env.DEEPSEEK_API_KEY, undefined);
    assert.ok(logs.some((line) => line.includes("DEEPSEEK_API_KEY")));
    await runtime.close();
  } finally {
    if (originalKey !== undefined) process.env.DEEPSEEK_API_KEY = originalKey;
    else delete process.env.DEEPSEEK_API_KEY;
  }
});

// T-CRED-4: credentials are frozen while a run is active. The run finishes on
// the key it started with, and a PUT or DELETE meanwhile is refused rather
// than swapped in underneath it.
test("T-CRED-4: PUT/DELETE credential during an active run is 409 and the run finishes on its own key", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession();
    const startGeneration = runtime.service.credentialGeneration;
    const calls = [{ name: "ask_user", arguments: { prompt: "hold the run open" } }];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    const runId = created.json.run.id;
    const waiting = await pollRun(runId, { until: (s) => s === "waiting_user" });
    assert.equal(waiting.status, "waiting_user");
    assert.equal(waiting.credentialGeneration, startGeneration, "the run froze the generation it started under");

    const put = await api("PUT", "/provider-credential", { provider: "fake-openai-loopback", apiKey: "a-different-key" });
    assert.equal(put.status, 409);
    assert.equal(put.json.error.code, "active_run");
    const del = await api("DELETE", "/provider-credential", { provider: "fake-openai-loopback" });
    assert.equal(del.status, 409);
    assert.equal(del.json.error.code, "active_run");
    assert.equal(runtime.service.credentialGeneration, startGeneration, "a refused change must not bump the generation");

    const openEvent = (await api("GET", `/sessions/${session.id}/events`)).json.events.find((e) => e.type === "question.open");
    await api("POST", `/runs/${runId}/questions/${openEvent.data.id}`, { answer: "carry on" });
    const finished = await pollRun(runId, { timeoutMs: 15_000 });
    assert.equal(finished.status, "completed", "the run completes on the credential it started with");
    assert.equal(finished.credentialGeneration, startGeneration);

    // Once nothing is running, the change is accepted and the generation moves.
    assert.equal((await api("PUT", "/provider-credential", { provider: "fake-openai-loopback", apiKey: "a-different-key" })).status, 200);
    assert.equal(runtime.service.credentialGeneration, startGeneration + 1);
  } finally {
    await runtime.close();
  }
});

// T-CRED-5: a sentinel HOME (with a plausible ~/.pi/agent/auth.json) and a
// sentinel provider env var are both present. Neither may become a credential:
// with no application credential the run fails credential_missing, and the
// sentinel file is never read or modified. With one, the key that reaches the
// provider is the application's.
test("T-CRED-5: a sentinel HOME auth.json and env var are never used as credentials", async () => {
  const sentinelHome = await mkdtemp(path.join(tmpdir(), "se-sentinel-home-"));
  const authDir = path.join(sentinelHome, ".pi", "agent");
  await mkdir(authDir, { recursive: true });
  const authPath = path.join(authDir, "auth.json");
  const sentinelKey = "sentinel-home-auth-key-must-never-be-used";
  const sentinelAuth = JSON.stringify({ deepseek: { apiKey: sentinelKey }, "fake-openai-loopback": { apiKey: sentinelKey } }, null, 2);
  await writeFile(authPath, sentinelAuth);

  const originalHome = process.env.HOME;
  const originalKey = process.env.DEEPSEEK_API_KEY;
  process.env.HOME = sentinelHome;
  process.env.DEEPSEEK_API_KEY = "sentinel-env-key-must-never-be-used";
  let runtime;
  try {
    const booted = await boot({ configureFakeCredential: false });
    runtime = booted.runtime;
    const { api, createSession, pollRun } = booted;
    assert.equal(process.env.DEEPSEEK_API_KEY, undefined, "the inherited env var is removed before any provider code can read it");

    // Branch 1: a real provider with no application credential must refuse.
    await api("PUT", "/provider-config", { provider: "deepseek", model: "deepseek-v4-flash", api: "openai-completions" });
    assert.equal((await api("GET", "/provider-config")).json.credentialStatus, "not_configured");
    const noCred = await createSession();
    const failing = await api("POST", `/sessions/${noCred.id}/runs`, { input: "hello", commandId: "cmd-1" });
    const failed = await pollRun(failing.json.run.id, { timeoutMs: 20_000 });
    assert.equal(failed.status, "failed");
    assert.equal(failed.error.code, "credential_missing", "a sentinel on disk or in env must not stand in for a credential");

    // Branch 2: with an application credential, the key the provider actually
    // receives is that one.
    await api("PUT", "/provider-config", { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions" });
    await api("PUT", "/provider-credential", { provider: "fake-openai-loopback", apiKey: FAKE_CREDENTIAL_KEY });
    const session = await createSession();
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: "hello there", commandId: "cmd-2" });
    assert.equal((await pollRun(created.json.run.id)).status, "completed");

    const seen = runtime.fakeProvider.requests.map((request) => request.authorization ?? "");
    assert.ok(seen.length > 0, "the provider must actually have been called");
    for (const authorization of seen) {
      assert.ok(!authorization.includes(sentinelKey), "the HOME auth.json key must never reach the provider");
      assert.ok(!authorization.includes("sentinel-env-key"), "the env key must never reach the provider");
      assert.ok(authorization.includes(FAKE_CREDENTIAL_KEY), "the application credential is what is sent");
    }

    assert.equal(await readFile(authPath, "utf8"), sentinelAuth, "the sentinel auth.json must be neither read-and-adopted nor rewritten");
    assert.deepEqual(await readdir(authDir), ["auth.json"], "nothing may be added beside it");
  } finally {
    await runtime?.close();
    if (originalHome !== undefined) process.env.HOME = originalHome;
    if (originalKey !== undefined) process.env.DEEPSEEK_API_KEY = originalKey;
    else delete process.env.DEEPSEEK_API_KEY;
  }
});
