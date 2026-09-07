import assert from "node:assert/strict";
import { test } from "node:test";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { boot, reopen } from "./helpers.mjs";
import { createRuntime } from "../server/runtime.mjs";
import { createProbe, manifest } from "../extensions/probe/index.mjs";

test("extension restart: loaded binding continues; invalidation and unload keep their generations", async () => {
  const initial = await boot();
  let current = initial;
  const lifecycle = (action) => current.api("POST", "/extensions/evidence-memo/lifecycle", { action });
  const record = async () => (await current.api("GET", "/extensions")).json.extensions.find((e) => e.id === "evidence-memo");
  const restart = async () => {
    await current.runtime.close();
    current = await reopen(initial.dataDir);
  };
  try {
    assert.equal((await lifecycle("load")).status, 200);
    const session = await initial.createSession();
    const bound = await current.api("POST", `/sessions/${session.id}/extension`, {
      extensionId: "evidence-memo", input: { title: "Restart", sourceText: "Persisted source survives restart." },
    });
    assert.equal(bound.status, 200);
    const source = (await current.api("GET", `/sessions/${session.id}/surface`)).json.projection.sources[0];
    const run = async (commandId) => {
      const admitted = await current.api("POST", `/sessions/${session.id}/runs`, {
        commandId, input: initial.scriptInput([{ name: "se_read_source", arguments: { sourceId: source.id } }]),
      });
      assert.equal(admitted.status, 200, JSON.stringify(admitted.json));
      let result;
      const deadline = Date.now() + 15000;
      do {
        result = (await current.api("GET", `/runs/${admitted.json.run.id}`)).json.run;
        if (!["running", "waiting_user", "stopping"].includes(result.status)) break;
        assert(Date.now() < deadline, "extension Run timed out");
        await delay(15);
      } while (true);
      assert.equal(result.status, "completed", JSON.stringify(result.error));
      const events = (await current.api("GET", `/sessions/${session.id}/events`)).json.events;
      const tool = events.find((event) => event.runId === result.id && event.type === "tool.result" && event.data.name === "se_read_source");
      assert.equal(tool?.data.isError, false);
      assert.match(tool.data.text, /Persisted source survives restart/);
      return result;
    };
    assert.equal((await lifecycle("reload")).json.extension.generation, 1);
    const before = await run("before-restart");
    await restart();
    assert.deepEqual([(await record()).status, (await record()).generation], ["loaded", 1]);
    const after = await run("after-restart");
    assert.equal(after.hostSession.id, before.hostSession.id);

    assert.equal((await lifecycle("invalidate")).json.extension.generation, 2);
    await restart();
    assert.deepEqual([(await record()).status, (await record()).generation], ["invalidated", 2]);
    assert.equal((await lifecycle("load")).status, 409, "restart must not bypass explicit reload");
    assert.equal((await lifecycle("reload")).json.extension.generation, 3);
    assert.equal((await lifecycle("unload")).json.extension.generation, 4);
    await restart();
    assert.deepEqual([(await record()).status, (await record()).generation], ["unloaded", 4]);
  } finally {
    await current.runtime.close();
    await rm(initial.dataDir, { recursive: true, force: true });
  }
});

test("extension restart: changed version requires reload; empty composition preserves dormant records", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "se-extension-version-"));
  let version = manifest.version;
  const catalog = { probe: () => {
    const instance = createProbe();
    Object.defineProperty(instance, "manifest", { value: { ...manifest, version } });
    return instance;
  } };
  let runtime = await createRuntime({ dataDir, extensionCatalog: catalog });
  try {
    await runtime.service.extensionLifecycle("probe", { action: "load" });
    await runtime.close();
    version = "0.2.0";
    runtime = await createRuntime({ dataDir, extensionCatalog: catalog });
    let record = runtime.registry.getRecord("probe");
    assert.deepEqual([record.version, record.status, record.generation], ["0.2.0", "invalidated", 1]);
    await assert.rejects(runtime.service.extensionLifecycle("probe", { action: "load" }), { code: "extension_lifecycle_failed" });
    await runtime.service.extensionLifecycle("probe", { action: "reload" });
    await runtime.close();
    runtime = await createRuntime({ dataDir });
    assert.equal(runtime.registry.list().length, 0);
    assert.equal(runtime.store.getExtensionRecords()[0].generation, 2);
    await runtime.close();
    runtime = await createRuntime({ dataDir, extensionCatalog: catalog });
    record = runtime.registry.getRecord("probe");
    assert.deepEqual([record.status, record.generation], ["loaded", 2]);
  } finally {
    await runtime.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
