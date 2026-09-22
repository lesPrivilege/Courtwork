import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { RuntimeStore } from "../server/store.mjs";

test("schema13 upgrade preserves every schema11 pending operation, including missing-record recovery", async () => {
  const dataDir = await mkdtemp(path.join(tmpdir(), "cw-pv12-pending-"));
  let store;
  try {
    store = await new RuntimeStore({ dataDir }).open();
    const pending = ["connection_save", "connection_delete", "credential_set", "credential_delete"]
      .map((operation, index) => ({ connectionId: `conn-pending-${index}`, operation }));
    for (const marker of pending) await store.beginProviderConfiguration(marker.connectionId, marker.operation);
    const legacy = store.snapshot();
    await store.close(); store = null;
    legacy.schemaVersion = 11; delete legacy.operations; delete legacy.subagents;
    legacy.sessions.forEach(session => { delete session.repositoryBinding; delete session.repositoryBindingRevision; delete session.repositoryBindingCommands; delete session.repositoryCandidate; delete session.repositoryCandidateRevision; delete session.repositoryCandidateCommands; delete session.repositoryWriteEffects; });
    legacy.runs.forEach(run => { delete run.repositoryBindingSnapshot; delete run.repositoryCandidateSnapshot; });
    delete legacy.providerConfigVersion;
    delete legacy.providerVerifications;
    const original = Buffer.from(JSON.stringify(legacy, null, 3) + "\n");
    const statePath = path.join(dataDir, "runtime-state.json");
    await writeFile(statePath, original);
    store = await new RuntimeStore({ dataDir }).open();
    assert.equal(store.snapshot().schemaVersion, 20);
    assert.deepEqual(store.getProviderConfigurationPending(), pending, "upgrade cannot waive recovery obligations");
    assert.equal(store.getProviderConfigVersion(), 0);
    assert.deepEqual(store.snapshot().providerVerifications, []);
    const digest = createHash("sha256").update(original).digest("hex");
    assert.deepEqual(await readFile(path.join(dataDir, `runtime-state.schema11.${digest}.json`)), original);
    await store.close(); store = null;
    store = await new RuntimeStore({ dataDir }).open();
    assert.deepEqual(store.getProviderConfigurationPending(), pending, "markers remain durable after upgraded reopen");
    await store.finishProviderConfiguration(pending[0].connectionId);
    assert.deepEqual(store.getProviderConfigurationPending(), pending.slice(1), "only an explicit completion may remove its marker");
  } finally {
    await store?.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});
