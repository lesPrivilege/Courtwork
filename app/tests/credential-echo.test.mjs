// A provider (or an ambient environment) must never make a saved key travel
// further than the endpoint it was entered for, and a key a provider echoes
// back must not reach a log line, a receipt, an event, the state file or Pi's
// session journal. Synthetic keys and loopback fixtures only.
import assert from "node:assert/strict";
import { test } from "node:test";
import http from "node:http";
import { readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { boot, reopen } from "./helpers.mjs";

function loopback(handler) {
  const seen = [];
  const server = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => {
      seen.push({ url: req.url, headers: req.headers });
      if (req.url.endsWith("/models")) {
        res.setHeader("content-type", "application/json");
        return res.end(JSON.stringify({ data: [{ id: "m1" }, { id: "m2" }] }));
      }
      handler(req, res);
    });
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve({
    server, seen, url: `http://127.0.0.1:${server.address().port}/v1`,
    close: () => new Promise((done) => server.close(done)),
  })));
}

const bearer = (req) => (req.headers.authorization ?? "").replace(/^Bearer /, "");
const echo401 = (req, res) => {
  res.statusCode = 401;
  res.setHeader("content-type", "application/json");
  res.end(JSON.stringify({ error: { message: `bad auth header: ${req.headers.authorization}` } }));
};
const sse = (res, chunk) => {
  res.setHeader("content-type", "text/event-stream");
  res.write(`data: ${JSON.stringify({ object: "chat.completion.chunk", created: 1, choices: [{ index: 0, delta: { role: "assistant", content: "hello" }, finish_reason: "stop" }], usage: { prompt_tokens: 1, completion_tokens: 1, total_tokens: 2 }, ...chunk })}\n\n`);
  res.end("data: [DONE]\n\n");
};

async function filesContaining(dir, needle) {
  const hits = [];
  for (const entry of await readdir(dir, { withFileTypes: true, recursive: true })) {
    if (!entry.isFile() || entry.name === "credentials.json") continue;
    const file = path.join(entry.parentPath ?? entry.path, entry.name);
    if ((await readFile(file, "utf8").catch(() => "")).includes(needle)) hits.push(path.relative(dir, file));
  }
  return hits;
}

async function connect(h, url, apiKey, models = [{ id: "m1" }]) {
  const created = await h.api("POST", "/provider-connections", { api: "openai-completions", baseUrl: url, models, apiKey });
  assert.equal(created.status, 200, JSON.stringify(created.json));
  return created.json.connection.id;
}

async function select(h, id, url, model = "m1") {
  const saved = await h.api("PUT", "/provider-config", { provider: id, model, api: "openai-completions", baseUrl: url });
  assert.equal(saved.status, 200, JSON.stringify(saved.json));
}

async function runOnce(h, input = "hi", commandId = "c1", session = null) {
  const s = session ?? await h.createSession();
  const started = await h.api("POST", `/sessions/${s.id}/runs`, { input, commandId });
  assert.equal(started.status, 200, JSON.stringify(started.json));
  return { session: s, run: await h.pollRun(started.json.run.id) };
}

test("D4: a new endpoint without a key is refused and never receives the saved key", async () => {
  const KEY = "synthetic-key-D4D4D4D4";
  const A = await loopback((req, res) => sse(res, {}));
  const B = await loopback((req, res) => sse(res, {}));
  const h = await boot();
  try {
    const id = await connect(h, A.url, KEY);
    const moved = await h.api("PUT", `/provider-connections/${id}`, { api: "openai-completions", baseUrl: B.url, models: [{ id: "m1" }] });
    assert.equal(moved.status, 400);
    assert.equal(moved.json.error.code, "credential_required");
    assert.equal(moved.json.error.message, "Enter the API key again for the new endpoint");
    assert.equal(B.seen.length, 0, "the new endpoint received no request at all");
    assert.equal((await h.api("GET", "/provider-connections")).json.connections.find((c) => c.id === id).baseUrl, A.url);

    A.seen.length = 0;
    const same = await h.api("PUT", `/provider-connections/${id}`, { api: "openai-completions", baseUrl: A.url, models: [{ id: "m1" }, { id: "m2" }] });
    assert.equal(same.status, 200, JSON.stringify(same.json));
    assert.deepEqual(A.seen.map((r) => bearer(r)), [KEY], "an unchanged endpoint keeps reusing the saved key");

    const rekeyed = await h.api("PUT", `/provider-connections/${id}`, { api: "openai-completions", baseUrl: B.url, models: [{ id: "m1" }], apiKey: "synthetic-key-NEWB0000" });
    assert.equal(rekeyed.status, 200, JSON.stringify(rekeyed.json));
    assert.ok(B.seen.length > 0 && B.seen.every((r) => bearer(r) === "synthetic-key-NEWB0000"));
  } finally { await h.runtime.close(); await A.close(); await B.close(); }
});

test("D5: inherited OpenAI SDK env defaults are stripped and never reach a request", async () => {
  const ambient = {
    OPENAI_ORG_ID: "org-synthetic-ambient", OPENAI_PROJECT_ID: "proj-synthetic-ambient",
    OPENAI_ADMIN_KEY: "synthetic-admin-key-ambient", OPENAI_BASE_URL: "http://127.0.0.1:9/ambient",
    OPENAI_WEBHOOK_SECRET: "synthetic-webhook-ambient", OPENAI_CUSTOM_HEADERS: "X-Ambient: leaked", OPENAI_LOG: "off",
  };
  const before = Object.fromEntries(Object.keys(ambient).map((name) => [name, process.env[name]]));
  Object.assign(process.env, ambient);
  const A = await loopback((req, res) => sse(res, {}));
  let h;
  try {
    h = await boot();
    for (const name of Object.keys(ambient)) assert.equal(process.env[name], undefined, `${name} is stripped at startup`);
    for (const name of Object.keys(ambient)) assert.ok(h.logs.some((line) => line.includes("removed inherited env var") && line.includes(name)), name);
    assert.ok(!h.logs.join("\n").includes("synthetic-admin-key-ambient"), "values are never logged");
    const id = await connect(h, A.url, "synthetic-key-D5D5D5D5");
    const verified = await h.api("POST", `/provider-connections/${id}/verify`, { model: "m1" });
    assert.equal(verified.json.status, "ok", JSON.stringify(verified.json));
    const chat = A.seen.filter((r) => !r.url.endsWith("/models"));
    assert.ok(chat.length > 0);
    for (const { headers } of chat) {
      for (const name of ["openai-organization", "openai-project", "x-ambient"]) assert.equal(headers[name], undefined, name);
      assert.equal(headers.authorization, "Bearer synthetic-key-D5D5D5D5");
    }
  } finally {
    for (const [name, value] of Object.entries(before)) { if (value === undefined) delete process.env[name]; else process.env[name] = value; }
    await h?.runtime.close(); await A.close();
  }
});

test("D3: a compaction failure echoing the key is logged redacted", async () => {
  const KEY = "synthetic-key-D3D3D3D3";
  let fail = false;
  const A = await loopback((req, res) => (fail ? echo401(req, res) : sse(res, { choices: [{ index: 0, delta: { role: "assistant", content: "hello there ".repeat(1500) }, finish_reason: "stop" }] })));
  const h = await boot();
  try {
    const id = await connect(h, A.url, KEY, [{ id: "m1", contextWindow: 12000 }]);
    await select(h, id, A.url);
    const session = await h.createSession();
    for (const n of [1, 2, 3]) assert.equal((await runOnce(h, `hi ${n}`, `c${n}`, session)).run.status, "completed");
    fail = true;
    const started = await h.api("POST", `/sessions/${session.id}/compactions`, { requestId: "r1" });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    const deadline = Date.now() + 5000;
    while (!h.logs.some((line) => line.startsWith("compaction ")) && Date.now() < deadline) await new Promise((r) => setTimeout(r, 25));
    const lines = h.logs.filter((line) => line.startsWith("compaction "));
    assert.ok(lines.length > 0, "the failure was logged");
    assert.ok(lines.some((line) => line.includes("[redacted]")), lines.join("\n"));
    assert.ok(!h.logs.join("\n").includes(KEY), "no log line carries the key");
  } finally { await h.runtime.close(); await A.close(); }
});

test("D2: response model and id echoing the key are redacted in the receipt, telemetry and state file", async () => {
  const KEY = "synthetic-key-D2D2D2D2";
  const A = await loopback((req, res) => sse(res, { id: bearer(req), model: bearer(req) }));
  const h = await boot();
  try {
    const id = await connect(h, A.url, KEY);
    const verified = await h.api("POST", `/provider-connections/${id}/verify`, { model: "m1" });
    assert.equal(verified.json.status, "ok", JSON.stringify(verified.json));
    assert.equal(verified.json.observedModel, "[redacted]");
    assert.ok(!JSON.stringify((await h.api("GET", "/provider-connections")).json).includes(KEY));

    await select(h, id, A.url);
    const { session, run } = await runOnce(h);
    assert.equal(run.status, "completed");
    const events = (await h.api("GET", `/sessions/${session.id}/events`)).json;
    const telemetry = JSON.stringify(events).match(/runtime\.request\.telemetry/g) ?? [];
    assert.ok(telemetry.length > 0, "telemetry was recorded");
    assert.ok(!JSON.stringify(events).includes(KEY), "events carry no key");
    assert.ok(!(await readFile(path.join(h.dataDir, "runtime-state.json"), "utf8")).includes(KEY), "state file carries no key");
  } finally { await h.runtime.close(); await A.close(); }
});

test("D6: redaction finds the JSON-escaped key, and a key too short to find is refused", async () => {
  const { redactSecrets, PROVIDER_API_KEY_MIN_LENGTH } = await import("../server/provider-fields.mjs");
  const quoted = 'ab"cd\\ef1234567';
  assert.equal(redactSecrets(JSON.stringify({ message: `bad ${quoted}` }), [quoted]), JSON.stringify({ message: "bad [redacted]" }));
  assert.equal(redactSecrets(`raw ${quoted}`, [quoted]), "raw [redacted]");
  assert.equal(PROVIDER_API_KEY_MIN_LENGTH, 6);

  // Pi reports the provider's error object as JSON text, so the echoed key
  // arrives in its JSON-escaped spelling.
  const A = await loopback(echo401);
  const h = await boot();
  try {
    const id = await connect(h, A.url, quoted);
    const verified = await h.api("POST", `/provider-connections/${id}/verify`, { model: "m1" });
    const text = JSON.stringify(verified.json);
    assert.notEqual(verified.json.status, "ok");
    assert.ok(!verified.json.message.includes(quoted) && !verified.json.message.includes(JSON.stringify(quoted).slice(1, -1)), verified.json.message);
    assert.ok(verified.json.message.includes("[redacted]"), verified.json.message);
    assert.ok(!text.includes("ef1234567"), text);

    const short = await h.api("POST", "/provider-connections", { api: "openai-completions", baseUrl: A.url, models: [{ id: "m1" }], apiKey: "abc12" });
    assert.equal(short.status, 400);
    const shortCredential = await h.api("PUT", "/provider-credential", { connectionId: id, apiKey: "abc12" });
    assert.equal(shortCredential.status, 400);
  } finally { await h.runtime.close(); await A.close(); }
});

test("D7: Settings reports unavailable for a saved route Run admission refuses", async () => {
  const A = await loopback((req, res) => sse(res, {}));
  const h = await boot();
  try {
    const id = await connect(h, A.url, "synthetic-key-D7D7D7D7", [{ id: "m1" }, { id: "m2" }]);
    await select(h, id, A.url, "m2");
    assert.equal((await h.api("GET", "/provider-config")).json.configurationStatus, "ready");
    const narrowed = await h.api("PUT", `/provider-connections/${id}`, { api: "openai-completions", baseUrl: A.url, models: [{ id: "m1" }] });
    assert.equal(narrowed.status, 200, JSON.stringify(narrowed.json));
    assert.equal((await h.api("GET", "/provider-config")).json.configurationStatus, "unavailable");
    const s = await h.createSession();
    const refused = await h.api("POST", `/sessions/${s.id}/runs`, { input: "hi", commandId: "c1" });
    assert.equal(refused.status, 503, JSON.stringify(refused.json));
  } finally { await h.runtime.close(); await A.close(); }
});

test("D1: a Run whose provider echoes the key in an error body leaves no key in Pi's journal", async () => {
  const KEY = "synthetic-key-D1D1D1D1";
  const A = await loopback(echo401);
  const h = await boot();
  try {
    const id = await connect(h, A.url, KEY);
    await select(h, id, A.url);
    const { session, run } = await runOnce(h);
    assert.equal(run.status, "failed");
    assert.ok(A.seen.some((r) => !r.url.endsWith("/models") && bearer(r) === KEY), "the provider saw (and echoed) the key");
    const journals = (await readdir(path.join(h.dataDir, "pi-sessions"), { recursive: true })).filter((name) => name.endsWith(".jsonl"));
    assert.ok(journals.length > 0, "Pi wrote a journal");
    const journal = (await Promise.all(journals.map((name) => readFile(path.join(h.dataDir, "pi-sessions", name), "utf8")))).join("\n");
    assert.ok(journal.includes("[redacted]"), "the echoed error reached the journal, redacted");
    assert.deepEqual(await filesContaining(h.dataDir, KEY), [], "no file but credentials.json holds the key");
    assert.ok(!JSON.stringify((await h.api("GET", `/sessions/${session.id}/events`)).json).includes(KEY));
    assert.ok(!h.logs.join("\n").includes(KEY));
  } finally { await h.runtime.close(); await A.close(); }
});

// Redacting the serialized telemetry record let a key that matches JSON
// structure rewrite it into invalid JSON, and every Run failed as a projection
// error. Redaction now walks string values only.
test("D2b: a key containing JSON structure does not break telemetry or Runs", async () => {
  // Exactly a quoted field name of the telemetry record, as the review found.
  const KEY = '"phase"';
  const A = await loopback((req, res) => sse(res, { id: bearer(req), model: bearer(req) }));
  const h = await boot();
  try {
    const id = await connect(h, A.url, KEY);
    await select(h, id, A.url);
    const { session, run } = await runOnce(h);
    assert.equal(run.status, "completed", JSON.stringify(run.error));
    const events = JSON.stringify((await h.api("GET", `/sessions/${session.id}/events`)).json);
    assert.ok(!events.includes(JSON.stringify(KEY).slice(1, -1)), "events carry no key");
  } finally { await h.runtime.close(); await A.close(); }
});

// A key saved before the minimum length existed cannot be protected; reusing it
// for a connection edit asks for a new key instead of a vague probe failure.
test("D6b: reusing a saved key shorter than the minimum asks for the key again", async () => {
  const A = await loopback((req, res) => sse(res, {}));
  const h = await boot();
  let again;
  try {
    const id = await connect(h, A.url, "synthetic-key-D6b-long");
    await h.runtime.close();
    const file = path.join(h.dataDir, "credentials.json");
    const entries = JSON.parse(await readFile(file, "utf8"));
    entries[id] = "abc12";
    await writeFile(file, JSON.stringify(entries), { mode: 0o600 });
    again = await reopen(h.dataDir);
    const edited = await again.api("PUT", `/provider-connections/${id}`, { api: "openai-completions", baseUrl: A.url, models: [{ id: "m1" }] });
    assert.equal(edited.status, 400, JSON.stringify(edited.json));
    assert.equal(edited.json.error.code, "credential_required");
  } finally { await again?.runtime.close(); await A.close(); }
});
