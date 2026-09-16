import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { test } from "node:test";
import { parseSlash, discoverCommands, findCommand, parseArguments } from "../runtime/commands.mjs";
import { FAKE_MODEL_ID } from "../runtime/pi-session-runtime.mjs";
import { boot } from "./helpers.mjs";

/* CMD-01 · typed commands: Host-owned discovery, explicit dispatch, no fallthrough. */

test("CMD-01 · the slash reader is fixed: escape, command, and every other leading slash stays text", () => {
  assert.deepEqual(parseSlash("//status"), { kind: "literal", text: "/status" });
  assert.deepEqual(parseSlash("//Users/me/file"), { kind: "literal", text: "/Users/me/file" });
  assert.deepEqual(parseSlash("/status"), { kind: "command", name: "status", args: "", raw: "/status" });
  assert.deepEqual(parseSlash("/effort high"), { kind: "command", name: "effort", args: "high", raw: "/effort high" });
  assert.deepEqual(parseSlash("/compact keep the\npaths"), { kind: "command", name: "compact", args: "keep the\npaths", raw: "/compact keep the\npaths" });
  assert.equal(parseSlash("/Users/me/file").kind, "text", "an absolute path is text");
  assert.equal(parseSlash("/tmp/x").kind, "text", "a path with a slash after the name is text");
  assert.equal(parseSlash(" /status").kind, "text", "leading whitespace is text");
  assert.equal(parseSlash("/").kind, "text");
  assert.equal(parseSlash("/ status").kind, "text");
  assert.equal(parseSlash("/1abc").kind, "text");
  assert.equal(parseSlash("/status;").kind, "text", "a name followed by anything but whitespace is not a command token");
  assert.equal(parseSlash("/status now").kind, "command", "arguments are the command's to refuse at dispatch, not a reason to fall through");
  assert.equal(parseSlash("plain").kind, "text");
});

test("CMD-01 · discovery is built from Host facts: availability carries a reason and nothing is advertised without a target", () => {
  const base = { sessionId: "s1", runtimeRevision: 3, providerConfigVersion: 2, permissionMode: "draft", activeRun: false, activeOperation: false, fakeProvider: true, effortValues: ["low", "high"], compaction: { available: true, reason: null } };
  const catalog = discoverCommands(base);
  assert.deepEqual(catalog.commands.map(c => c.name), ["status", "tools", "model", "effort", "compact", "fixture"]);
  for (const c of catalog.commands) {
    assert.ok(["read", "client_ui", "setting", "control", "passthrough"].includes(c.kind));
    assert.equal(typeof c.availability.available, "boolean");
    if (!c.availability.available) assert.ok(c.availability.reason);
    if (c.kind === "client_ui") assert.ok(c.target, "a client_ui command names its target");
    assert.deepEqual(c.scope, { type: "session", id: "s1" });
    assert.equal(c.source.type, "host-builtin");
  }
  assert.deepEqual(findCommand(catalog, "effort").args.value.values, ["default", "low", "high"]);
  const noEffort = discoverCommands({ ...base, effortValues: [] });
  assert.equal(findCommand(noEffort, "effort").availability.available, false);
  assert.notEqual(noEffort.revision, catalog.revision, "the catalog revision follows the facts");
  const busy = discoverCommands({ ...base, activeRun: true });
  assert.equal(findCommand(busy, "compact").availability.reason, "Available after this run ends.");
  assert.equal(findCommand(busy, "effort").availability.available, false);
  assert.equal(findCommand(busy, "status").availability.available, true, "reads stay available during a run");
  const real = discoverCommands({ ...base, fakeProvider: false });
  assert.equal(findCommand(real, "fixture").availability.available, false);
  assert.equal(findCommand(catalog, "Status"), null, "names are exact");
  assert.deepEqual(parseArguments(findCommand(catalog, "status"), "x"), { error: "status takes no arguments" });
  assert.deepEqual(parseArguments(findCommand(catalog, "effort"), ""), { error: "effort needs one of: default, low, high" });
  assert.deepEqual(parseArguments(findCommand(catalog, "effort"), "medium"), { error: "medium is not one of: default, low, high" });
  assert.deepEqual(parseArguments(findCommand(catalog, "effort"), "high"), { value: { value: "high" } });
  assert.deepEqual(parseArguments(findCommand(catalog, "compact"), ""), { value: {} });
  assert.deepEqual(parseArguments(findCommand(catalog, "compact"), "keep paths"), { value: { focus: "keep paths" } });
});

test("CMD-01 · Host dispatch: reads make no Run and no model request; unknown, stale, unavailable and bad arguments are refused with a reason", async () => {
  const requests = [];
  const h = await boot({ fakeResponder: (args) => { requests.push(args.requestNumber); return null; } });
  try {
    const session = await h.createSession();
    const listed = await h.api("GET", `/sessions/${session.id}/commands`);
    assert.equal(listed.status, 200, JSON.stringify(listed.json));
    const catalog = listed.json;
    assert.equal(catalog.commands.find(c => c.name === "fixture").availability.available, true, "Local test reads fixture scripts");
    assert.equal(catalog.commands.find(c => c.name === "compact").availability.available, false, "no recorded conversation yet");
    assert.equal(catalog.commands.find(c => c.name === "effort").availability.available, false, "Local test declares no effort values");

    const status = await h.api("POST", `/sessions/${session.id}/commands/status`, { revision: catalog.revision, args: "" });
    assert.equal(status.status, 200, JSON.stringify(status.json));
    assert.equal(status.json.kind, "read");
    assert.equal(status.json.facts.model.model, FAKE_MODEL_ID);
    assert.equal(status.json.facts.model.localTest, true);
    assert.equal(status.json.facts.fileAccess, session.permissionMode);
    assert.equal(status.json.facts.runs.count, 0);
    assert.equal(status.json.facts.activeRun, false);
    const tools = await h.api("POST", `/sessions/${session.id}/commands/tools`, { revision: catalog.revision, args: "" });
    assert.equal(tools.status, 200);
    assert.ok(tools.json.facts.tools.some(t => t.id === "tool:runtime_load" && t.exposed === true));
    const model = await h.api("POST", `/sessions/${session.id}/commands/model`, { revision: catalog.revision, args: "" });
    assert.equal(model.status, 200); assert.deepEqual(model.json, { kind: "client_ui", command: "model", target: "model-picker" });
    const fixture = await h.api("POST", `/sessions/${session.id}/commands/fixture`, { revision: catalog.revision, args: "script []" });
    assert.equal(fixture.status, 200); assert.equal(fixture.json.kind, "passthrough");
    assert.equal(requests.length, 0, "no model request was made");
    assert.equal(h.runtime.store.listRuns().length, 0, "no Run was created");

    const unknown = await h.api("POST", `/sessions/${session.id}/commands/frobnicate`, { revision: catalog.revision, args: "" });
    assert.equal(unknown.status, 404); assert.equal(unknown.json.error.code, "unknown_command");
    const stale = await h.api("POST", `/sessions/${session.id}/commands/status`, { revision: "0".repeat(64), args: "" });
    assert.equal(stale.status, 409); assert.equal(stale.json.error.code, "command_revision");
    assert.equal(stale.json.error.revision ?? stale.json.error.details?.revision ?? catalog.revision, catalog.revision);
    const unavailable = await h.api("POST", `/sessions/${session.id}/commands/effort`, { revision: catalog.revision, args: "high" });
    assert.equal(unavailable.status, 409); assert.equal(unavailable.json.error.code, "command_unavailable");
    const badArgs = await h.api("POST", `/sessions/${session.id}/commands/status`, { revision: catalog.revision, args: "now" });
    assert.equal(badArgs.status, 400); assert.equal(badArgs.json.error.code, "invalid_arguments");
    const extra = await h.api("POST", `/sessions/${session.id}/commands/status`, { revision: catalog.revision, args: "", extra: 1 });
    assert.equal(extra.status, 400);
    assert.equal(requests.length, 0);
    assert.equal(h.runtime.store.listRuns().length, 0);
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("CMD-01 · /effort saves the Host configuration under CAS and the next Run binds it; unsupported values never reach the provider", async () => {
  const requests = [];
  const h = await boot({ fakeResponder: (args) => { requests.push(args.body); return null; } });
  try {
    const created = await h.api("POST", "/provider-connections", { api: "openai-completions", baseUrl: h.runtime.fakeProvider.baseUrl, apiKey: "cmd-effort-key", models: [{ id: FAKE_MODEL_ID, reasoning: true, reasoningEfforts: ["low", "high"] }] });
    assert.equal(created.status, 200, JSON.stringify(created.json));
    const connection = created.json.connection;
    const cfg = (await h.api("GET", "/provider-config")).json;
    const selected = await h.api("PUT", "/provider-config", { provider: connection.providerIdentity, model: FAKE_MODEL_ID, api: connection.api, expectedVersion: cfg.version });
    assert.equal(selected.status, 200, JSON.stringify(selected.json));
    const session = await h.createSession();
    const catalog = (await h.api("GET", `/sessions/${session.id}/commands`)).json;
    const effort = catalog.commands.find(c => c.name === "effort");
    assert.deepEqual(effort.args.value.values, ["default", "low", "high"]);
    assert.equal(catalog.commands.find(c => c.name === "fixture").availability.available, false, "a compatible connection is not the Local test provider");

    const bad = await h.api("POST", `/sessions/${session.id}/commands/effort`, { revision: catalog.revision, args: "medium" });
    assert.equal(bad.status, 400); assert.equal(bad.json.error.code, "invalid_arguments");
    assert.equal((await h.api("GET", "/provider-config")).json.config.reasoningEffort, undefined);

    const set = await h.api("POST", `/sessions/${session.id}/commands/effort`, { revision: catalog.revision, args: "high" });
    assert.equal(set.status, 200, JSON.stringify(set.json));
    assert.deepEqual(set.json, { kind: "setting", command: "effort", saved: { reasoningEffort: "high", version: selected.json.version + 1 }, scope: "all chats, future runs" });
    assert.equal((await h.api("GET", "/provider-config")).json.config.reasoningEffort, "high");
    const afterSet = (await h.api("GET", `/sessions/${session.id}/commands`)).json;
    assert.notEqual(afterSet.revision, catalog.revision, "a saved setting moves the catalog revision");
    const staleAfter = await h.api("POST", `/sessions/${session.id}/commands/effort`, { revision: catalog.revision, args: "low" });
    assert.equal(staleAfter.status, 409); assert.equal(staleAfter.json.error.code, "command_revision");

    const made = await h.api("POST", `/sessions/${session.id}/runs`, { commandId: "after-effort", input: "hello" });
    assert.equal(made.status, 200, JSON.stringify(made.json));
    const run = await h.pollRun(made.json.run.id);
    assert.equal(run.status, "completed", JSON.stringify(run.error ?? null));
    assert.equal(run.provider.reasoningEffort, "high");
    assert.equal(requests.at(-1).reasoning_effort, "high", "the effort reached the wire");

    // The Run gave the chat a recorded conversation, so the catalog moved (compact became available); read it again.
    const afterRun = (await h.api("GET", `/sessions/${session.id}/commands`)).json;
    assert.notEqual(afterRun.revision, afterSet.revision);
    const dflt = await h.api("POST", `/sessions/${session.id}/commands/effort`, { revision: afterRun.revision, args: "default" });
    assert.equal(dflt.status, 200, JSON.stringify(dflt.json));
    assert.equal(dflt.json.saved.reasoningEffort, null);
    assert.equal((await h.api("GET", "/provider-config")).json.config.reasoningEffort, undefined, "Provider default omits the parameter");
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("CMD-01 · /compact through the dispatcher is the same idle-only operation, and a running Run makes it unavailable rather than queued", async () => {
  const messageText = (m) => typeof m?.content === "string" ? m.content : (m?.content ?? []).map((p) => p?.text ?? "").join("");
  const h = await boot({ compaction: { enabled: true, reserveTokens: 1, keepRecentTokens: 1, maxCompactions: 4 }, fakeResponder: (args) => {
    const summary = (args.body?.messages ?? []).some((m) => m.role === "user" && messageText(m).startsWith("<conversation>"));
    return summary ? { kind: "text", id: `s-${args.requestNumber}`, created: 1, text: "SUMMARY" } : null;
  } });
  try {
    h.runtime.fakeProvider.model.contextWindow = 4;
    const session = await h.createSession();
    const first = await h.api("POST", `/sessions/${session.id}/runs`, { commandId: "seed", input: "seed the conversation" });
    assert.equal(first.status, 200); assert.equal((await h.pollRun(first.json.run.id)).status, "completed");
    const catalog = (await h.api("GET", `/sessions/${session.id}/commands`)).json;
    assert.equal(catalog.commands.find(c => c.name === "compact").availability.available, true, JSON.stringify(catalog.commands.find(c => c.name === "compact").availability));
    const started = await h.api("POST", `/sessions/${session.id}/commands/compact`, { revision: catalog.revision, args: "keep the seed", requestId: "cmd-compact-1" });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    assert.equal(started.json.kind, "control");
    assert.equal(started.json.operation.focus, "keep the seed");
    let op = started.json.operation;
    for (let i = 0; i < 200 && op.status === "running"; i++) { await new Promise((r) => setTimeout(r, 25)); op = (await h.api("GET", `/sessions/${session.id}/compactions/${op.id}`)).json.operation; }
    assert.ok(["completed", "failed"].includes(op.status), JSON.stringify(op));
    const replay = await h.api("POST", `/sessions/${session.id}/commands/compact`, { revision: (await h.api("GET", `/sessions/${session.id}/commands`)).json.revision, args: "keep the seed", requestId: "cmd-compact-1" });
    assert.equal(replay.status, 200); assert.equal(replay.json.idempotent, true); assert.equal(replay.json.operation.id, op.id);
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});
