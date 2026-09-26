import assert from "node:assert/strict";
import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { boot } from "./helpers.mjs";
import { createAgentsLoopback } from "./fixtures/agents-api-loopback.mjs";
import { agentsPort } from "./fixtures/agents-host-harness.mjs";
import { createPiRuntimePort } from "../runtime/pi-runtime-port.mjs";
import { MANAGED_EXECUTOR_ID, PI_EXECUTOR_ID } from "../server/executor-choice-state.mjs";

const inventory = info => info.executionRuntimes;
const row = (info, adapterId) => inventory(info).items.find(item => item.adapterId === adapterId);

test("I1 authenticated inventory before a Session is a read-only Host description", async () => {
  const h = await boot();
  try {
    const denied = await fetch(h.runtime.url + "/api/v5/runtime-info");
    assert.equal(denied.status, 401);
    const stateFile = path.join(h.dataDir, "runtime-state.json");
    const before = await readFile(stateFile);
    const directoryBefore = await readdir(h.dataDir);
    const first = await h.api("GET", "/runtime-info");
    const second = await h.api("GET", "/runtime-info");
    assert.equal(first.status, 200);
    assert.deepEqual(second.json, first.json);
    assert.equal(first.json.adapterId, PI_EXECUTOR_ID);
    assert.deepEqual([inventory(first.json).schemaVersion, inventory(first.json).defaultAdapterId], [1, PI_EXECUTOR_ID]);
    assert.deepEqual(inventory(first.json).items.map(item => item.adapterId), [PI_EXECUTOR_ID, MANAGED_EXECUTOR_ID]);
    const pi = row(first.json, PI_EXECUTOR_ID);
    assert.equal(pi.configured, true);
    assert.equal(pi.configurationOwner, "host");
    assert.equal(pi.availability.status, "configured");
    assert.equal(pi.availability.reasonCode, null);
    assert.equal(pi.liveStatus, "not_checked");
    assert.match(pi.configurationRef, /^sha256:[0-9a-f]{64}$/);
    assert.deepEqual(Object.keys(pi.capabilities).sort(), ["start", "continue", "steer", "cancel", "compact", "recover", "submitToolResult"].sort());
    const managed = row(first.json, MANAGED_EXECUTOR_ID);
    assert.deepEqual([managed.configured, managed.revision, managed.configurationRef, managed.capabilities], [false, null, null, null]);
    assert.deepEqual([managed.availability.status, managed.availability.reasonCode, managed.liveStatus],
      ["unavailable", "not_configured", "not_checked"]);
    assert.deepEqual(await readFile(stateFile), before);
    assert.deepEqual(await readdir(h.dataDir), directoryBefore);
    assert.deepEqual([h.runtime.store.listSessions().length, h.runtime.store.listRuns().length], [0, 0]);
    assert.equal(h.runtime.fakeProvider.requests.length, 0);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test("I1 managed fixture is describable without a live check and provider incompatibility stays row-local", async () => {
  const loopback = await createAgentsLoopback({ plan: () => [{ text: "unused" }] });
  const h = await boot({ managedRuntimePort: agentsPort(loopback) });
  try {
    const initial = (await h.api("GET", "/runtime-info")).json;
    const managed = row(initial, MANAGED_EXECUTOR_ID);
    assert.equal(managed.configured, true);
    assert.equal(managed.availability.status, "configured");
    assert.equal(managed.liveStatus, "not_checked");
    assert.equal(managed.capabilities.start.supported, true);
    assert.equal(managed.capabilities.compact.supported, false);
    const model = (await h.api("GET", "/provider-models")).json.models.find(item => item.provider === "deepseek" && item.id === "deepseek-v4-flash");
    assert.ok(model);
    const changed = await h.api("PUT", "/provider-config", { provider: model.provider, model: model.id, api: model.api });
    assert.equal(changed.status, 200, JSON.stringify(changed.json));
    const incompatible = (await h.api("GET", "/runtime-info")).json;
    assert.deepEqual([row(incompatible, MANAGED_EXECUTOR_ID).availability.status, row(incompatible, MANAGED_EXECUTOR_ID).availability.reasonCode],
      ["unavailable", "provider_unsupported"]);
    assert.equal(row(incompatible, MANAGED_EXECUTOR_ID).capabilities.start.supported, true);
    assert.equal(row(incompatible, PI_EXECUTOR_ID).availability.status, "configured");
    assert.equal(loopback.posts("/v1/agents/sessions").length, 0);
    assert.equal(h.runtime.fakeProvider.requests.length, 0);
    assert.equal(h.runtime.store.listSessions().length, 0);
  } finally { await h.runtime.close(); await loopback.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test("I1 descriptor failures are bounded and do not hide another configured row", async () => {
  const secret = "sentinel-secret-endpoint-and-error";
  let replacement = null;
  const runtimePort = options => {
    const port = createPiRuntimePort(options);
    return { ...port, describe: () => replacement === null ? port.describe() : replacement() };
  };
  const loopback = await createAgentsLoopback({ plan: () => [{ text: "unused" }] });
  const h = await boot({ runtimePort, managedRuntimePort: agentsPort(loopback) });
  try {
    const valid = h.runtime.service.getRuntimeInfo();
    const configuredPi = row(valid, PI_EXECUTOR_ID);
    const original = h.runtime.service.runtimePort.describe();
    for (const [describe, reasonCode] of [
      [() => { throw new Error(secret); }, "descriptor_unavailable"],
      [() => ({ ...original, capabilities: { start: { supported: true }, secret } }), "descriptor_unavailable"],
      [() => ({ ...original, id: secret }), "descriptor_changed"],
      [() => ({ ...original, revision: secret }), "descriptor_changed"],
    ]) {
      replacement = describe;
      const response = await h.api("GET", "/runtime-info");
      assert.equal(response.status, 200);
      assert.equal(row(response.json, PI_EXECUTOR_ID).availability.reasonCode, reasonCode);
      assert.equal(row(response.json, PI_EXECUTOR_ID).capabilities, null);
      assert.deepEqual([row(response.json, PI_EXECUTOR_ID).revision, row(response.json, PI_EXECUTOR_ID).configurationRef],
        [configuredPi.revision, configuredPi.configurationRef]);
      assert.equal(row(response.json, MANAGED_EXECUTOR_ID).availability.status, "configured");
      assert.doesNotMatch(JSON.stringify(response.json), /sentinel-secret-endpoint-and-error/);
    }
    replacement = null;
    const recovered = (await h.api("GET", "/runtime-info")).json;
    assert.equal(row(recovered, PI_EXECUTOR_ID).availability.status, "configured");
    assert.equal(loopback.posts("/v1/agents/sessions").length, 0);
  } finally { await h.runtime.close(); await loopback.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test("I1 returns detached capabilities and preserves selected Session runtime-info semantics", async () => {
  const loopback = await createAgentsLoopback({ plan: () => [{ text: "unused" }] });
  const h = await boot({ managedRuntimePort: agentsPort(loopback) });
  try {
    const session = await h.createSession();
    const choice = await h.api("PUT", `/sessions/${session.id}/executor-choice`, { expectedRevision: 0, adapterId: MANAGED_EXECUTOR_ID });
    assert.equal(choice.status, 200);
    const defaultInfo = (await h.api("GET", "/runtime-info")).json;
    const selected = (await h.api("GET", `/runtime-info?sessionId=${session.id}`)).json;
    assert.deepEqual([defaultInfo.adapterId, defaultInfo.capabilities.nativeCompaction], [PI_EXECUTOR_ID, true]);
    assert.deepEqual([selected.adapterId, selected.capabilities.nativeCompaction], [MANAGED_EXECUTOR_ID, false]);
    assert.deepEqual(selected.executionRuntimes, defaultInfo.executionRuntimes);
    const serviceInfo = h.runtime.service.getRuntimeInfo();
    row(serviceInfo, MANAGED_EXECUTOR_ID).capabilities.start.supported = false;
    serviceInfo.executionRuntimes.items.splice(0, 1);
    const reread = h.runtime.service.getRuntimeInfo();
    assert.equal(row(reread, MANAGED_EXECUTOR_ID).capabilities.start.supported, true);
    assert.deepEqual(reread.executionRuntimes.items.map(item => item.adapterId), [PI_EXECUTOR_ID, MANAGED_EXECUTOR_ID]);
    assert.equal(h.runtime.service.runtimePorts.get(MANAGED_EXECUTOR_ID).descriptor.capabilities.start.supported, true);
  } finally { await h.runtime.close(); await loopback.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});
