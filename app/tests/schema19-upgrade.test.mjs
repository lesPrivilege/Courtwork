/* Schema 18 → current (remote runtime records, P03-C): a validated 18 store
 * upgrades once with an exact backup and gains only null/empty remote fields;
 * an occupied backup path, a malformed remote ledger and a newer schema each
 * fail closed without changing bytes; the actual schema-18 Host refuses the
 * upgraded file and still opens the backup. */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { mkdir, mkdtemp, readFile, readdir, rm, symlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import { RuntimeStore } from "./fixtures/executor-store.mjs";

// The last Host whose RuntimeStore is schema 18 (base of the C/D/E author branch).
const SCHEMA18_HOST = "3022b5c68f978c3a50561b47eb1de9e61ab0ea58";
const sha256 = (value) => createHash("sha256").update(value).digest("hex");

async function schema18State(dir) {
  const store = await new RuntimeStore({ dataDir: dir }).open();
  const project = await store.createProject("Upgrade");
  const session = await store.createSession({ id: randomUUID(), projectId: project.id, title: "Kept", workspaceDir: path.join(dir, "ws"), permissionMode: "ask" });
  await store.setHostSession(session.id, { id: "pi-native", path: path.join(dir, "pi-sessions", "kept.jsonl") });
  await store.close();
  const file = path.join(dir, "runtime-state.json");
  const fresh = JSON.parse(await readFile(file, "utf8"));
  assert.equal(fresh.schemaVersion, 22);
  const aged = { ...fresh, schemaVersion: 18,
    sessions: fresh.sessions.map(({ remoteBinding, remoteActions, executorChoice, ...rest }) => { assert.deepEqual([remoteBinding, remoteActions], [null, []]); return rest; }),
    runs: fresh.runs.map(({ remoteBinding, kitBinding, executorBinding, ...rest }) => rest) };
  const raw = Buffer.from(JSON.stringify(aged, null, 1) + "\n");
  await writeFile(file, raw);
  return { file, raw, aged, session };
}

test("schema 18 upgrades to current once: remote fields added null/empty, Pi locator kept, exact backup, nothing else rewritten", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-schema19-"));
  let store;
  try {
    const { file, raw, aged, session } = await schema18State(dir);
    const logs = [];
    store = await new RuntimeStore({ dataDir: dir, logger: line => logs.push(line) }).open();
    assert.equal(store.state.schemaVersion, 22);
    assert.deepEqual(store.getSession(session.id).hostSession, aged.sessions[0].hostSession, "Pi's {id,path} locator is untouched");
    assert.equal(store.getSession(session.id).remoteBinding, null);
    assert.deepEqual(store.listRemoteActions(session.id), []);
    await store.close();
    assert.ok(logs.some(line => /upgraded schema 18 to 22/.test(line)));
    assert.deepEqual(await readFile(path.join(dir, `runtime-state.schema18.${sha256(raw)}.json`)), raw, "the pre-upgrade bytes are kept exactly");
    const upgraded = JSON.parse(await readFile(file, "utf8"));
    assert.deepEqual(upgraded, { ...aged, schemaVersion: 22,
      sessions: aged.sessions.map(item => ({ ...item, remoteBinding: null, remoteActions: [],
        executorChoice: { revision: 0, adapterId: session.executorChoice.adapterId, configurationRef: null } })),
      runs: aged.runs.map(item => ({ ...item, remoteBinding: null, kitBinding: null,
        executorBinding: { recording: "legacy", revision: null, configurationRef: null,
          capabilities: null, choiceRevision: null } })) }, "only later required remote, Kit and executor fields change");
    store = await new RuntimeStore({ dataDir: dir }).open();
    await store.close();
    assert.equal((await readdir(dir)).filter(name => name.includes("schema18")).length, 1, "a second open is not a second upgrade");
  } finally {
    await store?.close?.().catch(() => {});
    await rm(dir, { recursive: true, force: true });
  }
});

test("an interrupted or blocked 18 → current upgrade changes nothing: occupied backup path, malformed legacy input, unsupported newer schema", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-schema19-blocked-"));
  try {
    const { file, raw, aged } = await schema18State(dir);
    // An earlier attempt died after writing its backup name: never followed, never overwritten.
    const backup = path.join(dir, `runtime-state.schema18.${sha256(raw)}.json`);
    await symlink(path.join(dir, "elsewhere.json"), backup);
    await assert.rejects(new RuntimeStore({ dataDir: dir }).open(), { code: "EEXIST" });
    assert.deepEqual(await readFile(file), raw, "the state file is still the schema-18 bytes");
    assert.deepEqual((await readdir(dir)).filter(name => name === "elsewhere.json"), [], "the symlink target was not written");
    await rm(backup);

    // A half-written state from a crash between write and rename is swept, not read.
    await writeFile(`${file}.${randomUUID()}.tmp`, '{"schemaVersion":22,"sessions":[');
    // Legacy input is validated as 18 before any backup or write.
    const malformed = Buffer.from(JSON.stringify({ ...aged, sessions: aged.sessions.map(item => ({ ...item, remoteBinding: null })) }));
    await writeFile(file, malformed);
    await assert.rejects(new RuntimeStore({ dataDir: dir }).open(), /invalid runtime state/);
    assert.deepEqual(await readFile(file), malformed);
    assert.deepEqual((await readdir(dir)).filter(name => name.includes("schema18") || name.endsWith(".tmp")), []);

    const newer = Buffer.from(JSON.stringify({ ...aged, schemaVersion: 23 }));
    await writeFile(file, newer);
    await assert.rejects(new RuntimeStore({ dataDir: dir }).open(), /schemaVersion 23 is not supported/);
    assert.deepEqual(await readFile(file), newer);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("a malformed current remote ledger fails closed", async () => {
  const dir = await mkdtemp(path.join(tmpdir(), "cw-schema19-malformed-"));
  try {
    const { file } = await schema18State(dir);
    await (await new RuntimeStore({ dataDir: dir }).open()).close();
    const good = JSON.parse(await readFile(file, "utf8"));
    const forged = [
      state => { state.sessions[0].remoteActions = [{ id: "forged" }]; },
      state => { state.sessions[0].remoteBinding = { runtimeId: "agents-api", path: "/not/a/pi/path" }; },
      state => { state.sessions[0].remoteActions = Array.from({ length: 513 }, () => ({})); },
      state => { delete state.sessions[0].remoteActions; },
    ];
    for (const forge of forged) {
      const state = structuredClone(good); forge(state);
      await writeFile(file, JSON.stringify(state));
      await assert.rejects(new RuntimeStore({ dataDir: dir }).open(), /invalid runtime state/);
    }
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

test("the actual schema-18 Host refuses the current file without writing, and opens the exact backup independently", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "cw-schema19-oldhost-"));
  let old;
  try {
    const archive = execFileSync("git", ["archive", SCHEMA18_HOST, "app"], { cwd: fileURLToPath(new URL("../..", import.meta.url)), maxBuffer: 64 * 1024 * 1024 });
    execFileSync("tar", ["-x", "-C", root], { input: archive });
    const { RuntimeStore: Schema18Store, SCHEMA_VERSION } = await import(pathToFileURL(path.join(root, "app/server/store.mjs")));
    assert.equal(SCHEMA_VERSION, 18);

    const dir = path.join(root, "data"); await mkdir(dir);
    const { file, raw } = await schema18State(dir);
    await (await new RuntimeStore({ dataDir: dir }).open()).close();
    const upgraded = await readFile(file);
    await assert.rejects(new Schema18Store({ dataDir: dir }).open(), /schemaVersion 22 is not supported/);
    assert.deepEqual(await readFile(file), upgraded, "the old Host changed nothing");

    const restored = path.join(root, "restored"); await mkdir(restored);
    await writeFile(path.join(restored, "runtime-state.json"), await readFile(path.join(dir, `runtime-state.schema18.${sha256(raw)}.json`)));
    old = await new Schema18Store({ dataDir: restored }).open();
    assert.equal(old.state.schemaVersion, 18);
    assert.equal(old.state.sessions[0].title, "Kept");
  } finally {
    await old?.close?.().catch(() => {});
    await rm(root, { recursive: true, force: true });
  }
});
