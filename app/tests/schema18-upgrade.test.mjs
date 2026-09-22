/* Schema 17 → current (manual compaction operations arrived in 18): the step
 * the 09 fixture pins rely on, checked on its own — a validated 17 store
 * upgrades once with an exact backup and gains an empty operations ledger.
 * The 18 → current remote-field step has its own file, schema19-upgrade.test.mjs. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { RuntimeStore } from "../server/store.mjs";

test("schema 17 upgrades once: operations added empty, exact backup kept, nothing else rewritten", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-schema18-"));
  let store;
  try {
    store = await new RuntimeStore({ dataDir: dir }).open();
    const project = await store.createProject("Upgrade");
    const session = await store.createSession({ id: randomUUID(), projectId: project.id, title: "Kept", workspaceDir: path.join(dir, "ws"), permissionMode: "ask" });
    await store.close();
    const file = path.join(dir, "runtime-state.json");
    const fresh = JSON.parse(await readFile(file, "utf8"));
    assert.equal(fresh.schemaVersion, 20);
    assert.deepEqual(fresh.operations, []);
    const aged = { ...fresh, schemaVersion: 17,
      sessions: fresh.sessions.map(({ remoteBinding, remoteActions, ...session }) => session),
      runs: fresh.runs.map(({ remoteBinding, ...run }) => run) };
    delete aged.operations;
    const raw = Buffer.from(JSON.stringify(aged, null, 1) + "\n");
    await writeFile(file, raw);
    store = await new RuntimeStore({ dataDir: dir }).open();
    assert.equal(store.state.schemaVersion, 20);
    assert.deepEqual(store.state.operations, []);
    assert.equal(store.getSession(session.id).title, "Kept");
    assert.equal(store.listProjects().length, 1);
    await store.close();
    const hash = createHash("sha256").update(raw).digest("hex");
    assert.deepEqual(await readFile(path.join(dir, `runtime-state.schema17.${hash}.json`)), raw, "the pre-upgrade bytes are kept exactly");
    const upgraded = JSON.parse(await readFile(file, "utf8"));
    assert.equal(upgraded.schemaVersion, 20);
    const { operations, ...rest } = upgraded;
    assert.deepEqual(operations, []);
    assert.deepEqual(rest, { ...aged, schemaVersion: 20,
      sessions: aged.sessions.map(session => ({ ...session, remoteBinding: null, remoteActions: [] })),
      runs: aged.runs.map(run => ({ ...run, remoteBinding: null })) }, "no other field changes beyond the later empty remote fields");
    store = await new RuntimeStore({ dataDir: dir }).open();
    await store.close();
    assert.equal((await readdir(dir)).filter((name) => name.includes("schema17")).length, 1, "a second open is not a second upgrade");
    const bad = { ...upgraded, operations: [{ id: "forged" }] };
    await writeFile(file, JSON.stringify(bad));
    await assert.rejects(new RuntimeStore({ dataDir: dir }).open(), /invalid runtime state/, "a malformed operations ledger fails closed");
  } finally {
    await store?.close?.().catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
});
