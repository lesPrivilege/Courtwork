/* Schema 17 → 18 (manual compaction operations): the one step the 09 fixture
 * pins rely on, checked on its own — a validated 17 store upgrades once with
 * an exact backup, gains an empty operations ledger, and the upgraded file is
 * refused by a host that only knows 17. */
import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { RuntimeStore } from "../server/store.mjs";

test("schema 17 upgrades to 18 once: operations added empty, exact backup kept, nothing else rewritten", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-schema18-"));
  let store;
  try {
    store = await new RuntimeStore({ dataDir: dir }).open();
    const project = await store.createProject("Upgrade");
    const session = await store.createSession({ id: randomUUID(), projectId: project.id, title: "Kept", workspaceDir: path.join(dir, "ws"), permissionMode: "ask" });
    await store.close();
    const file = path.join(dir, "runtime-state.json");
    const fresh = JSON.parse(await readFile(file, "utf8"));
    assert.equal(fresh.schemaVersion, 18);
    assert.deepEqual(fresh.operations, []);
    const aged = { ...fresh, schemaVersion: 17 };
    delete aged.operations;
    const raw = Buffer.from(JSON.stringify(aged, null, 1) + "\n");
    await writeFile(file, raw);
    store = await new RuntimeStore({ dataDir: dir }).open();
    assert.equal(store.state.schemaVersion, 18);
    assert.deepEqual(store.state.operations, []);
    assert.equal(store.getSession(session.id).title, "Kept");
    assert.equal(store.listProjects().length, 1);
    await store.close();
    const hash = createHash("sha256").update(raw).digest("hex");
    assert.deepEqual(await readFile(path.join(dir, `runtime-state.schema17.${hash}.json`)), raw, "the pre-upgrade bytes are kept exactly");
    const upgraded = JSON.parse(await readFile(file, "utf8"));
    assert.equal(upgraded.schemaVersion, 18);
    const { operations, ...rest } = upgraded;
    assert.deepEqual(operations, []);
    assert.deepEqual(rest, { ...aged, schemaVersion: 18 }, "no other field changes in the step");
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
