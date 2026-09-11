/* The example workspace layer (ONE-SHOT 2026-09-11 stage 4): entry rules,
 * interception of work reads, refusal of writes against example objects,
 * exit on an admitted real run, and the one word it keeps per device. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createPreviewLayer, PREVIEW_STORAGE_KEY, PreviewRefusal, requestKey } from "../web/preview-layer.mjs";

const ROOT = path.resolve(fileURLToPath(new URL("../../", import.meta.url)));
const samples = JSON.parse(readFileSync(path.join(ROOT, "app/web/samples/preview/responses.json"), "utf8"));
const memory = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), map: m }; };
const layer = async (storage = memory()) => { const l = createPreviewLayer({ storage, fetchSamples: async () => samples }); await l.load(); return { l, storage }; };
const exampleProject = samples.story.projects.primary;
const exampleSession = samples.story.sessions.matter;

test("the recorded story is a work-only sample: no host facts, every entry a 2xx work read", () => {
  assert.equal(samples.schemaVersion, 1);
  assert.ok(samples.entries.length >= 20);
  for (const e of samples.entries) {
    assert.match(e.path, /^\/(projects|sessions|runs|work-|attention|coordination)/, e.path);
    assert.ok(e.method === "GET" || (e.method === "POST" && e.path === "/attention/query"), `${e.method} ${e.path}`);
  }
  assert.ok(samples.ids.includes(exampleProject) && samples.ids.includes(exampleSession));
  assert.match(samples.story.note, /not the user's data/);
});

test("entry: only a workspace with no projects and nothing remembered enters on its own", async () => {
  const { l, storage } = await layer();
  assert.equal(l.available, true);
  assert.equal(l.shouldAutoEnter({ projectCount: 0 }), true);
  assert.equal(l.shouldAutoEnter({ projectCount: 1 }), false);
  storage.setItem(PREVIEW_STORAGE_KEY, "off");
  assert.equal(l.shouldAutoEnter({ projectCount: 0 }), false, "a person who left is not pulled back in");
  storage.setItem(PREVIEW_STORAGE_KEY, "established");
  assert.equal(l.shouldAutoEnter({ projectCount: 0 }), false, "real work once admitted stays remembered even if projects are gone");
  const missing = createPreviewLayer({ storage: memory(), fetchSamples: async () => null });
  assert.equal(await missing.load(), false);
  assert.equal(missing.shouldAutoEnter({ projectCount: 0 }), false, "no sample file, no example");
  assert.equal(missing.enter(), false);
});

test("inactive, the layer answers nothing; active, it answers work reads from the story and leaves host reads alone", async () => {
  const { l } = await layer();
  assert.equal(l.intercept("/projects"), null);
  l.enter();
  const projects = l.intercept("/projects");
  assert.ok(projects.payload.projects.some((p) => p.id === exampleProject));
  assert.equal(l.intercept("/bootstrap"), null);
  assert.equal(l.intercept("/provider-config"), null);
  assert.equal(l.intercept("/extensions"), null);
  const session = l.intercept(`/sessions/${exampleSession}`);
  assert.equal(session.payload.session.id, exampleSession);
  const query = samples.entries.find((e) => e.method === "POST");
  assert.ok(l.intercept(query.path, { method: "POST", body: query.body }).payload, "attention query answered by body");
  assert.notEqual(l.intercept("/projects").payload.projects, projects.payload.projects, "each answer is a fresh clone");
});

test("reads of an example object that were not recorded fail as not found; reads of real objects pass through", async () => {
  const { l } = await layer();
  l.enter();
  const unrecorded = l.intercept(`/sessions/${exampleSession}/artifacts/file?path=nope`);
  assert.equal(unrecorded.status, 404);
  assert.equal(l.intercept("/sessions/real-session-id"), null, "a real id is not the layer's to answer");
  assert.equal(l.intercept("/sessions?projectId=real-project"), null);
});

test("writes: drafts on example chats are a no-op, every other write against an example object is refused with a sentence, real writes pass", async () => {
  const { l } = await layer();
  l.enter();
  assert.deepEqual(l.intercept(`/sessions/${exampleSession}/draft`, { method: "PUT", body: { text: "x" } }).payload, { ok: true, preview: true });
  const run = l.intercept(`/sessions/${exampleSession}/runs`, { method: "POST", body: { input: "go" } });
  assert.ok(run.refuse instanceof PreviewRefusal);
  assert.match(run.refuse.message, /example/);
  assert.equal(l.intercept("/sessions", { method: "POST", body: { projectId: "real" } }), null);
  assert.equal(l.intercept("/projects", { method: "POST", body: { name: "Mine" } }), null);
  assert.equal(l.intercept("/sessions/real/runs", { method: "POST", body: {} }), null);
});

test("exit: an admitted real run establishes the workspace for good; leaving by hand only remembers 'off' and can be reopened", async () => {
  const { l, storage } = await layer();
  l.enter();
  assert.equal(l.leave("established"), true);
  assert.equal(storage.getItem(PREVIEW_STORAGE_KEY), "established");
  assert.equal(l.active, false);
  assert.equal(l.reopen(), true, "the example can still be looked at");
  assert.equal(storage.getItem(PREVIEW_STORAGE_KEY), "established", "reopening does not forget that real work exists");
  l.leave("dismissed");
  assert.equal(storage.getItem(PREVIEW_STORAGE_KEY), "established", "a dismissal never downgrades 'established'");
  const fresh = await layer();
  fresh.l.enter(); fresh.l.leave("dismissed");
  assert.equal(fresh.storage.getItem(PREVIEW_STORAGE_KEY), "off");
  assert.equal(fresh.l.shouldAutoEnter({ projectCount: 0 }), false);
  fresh.l.reopen();
  assert.equal(fresh.storage.getItem(PREVIEW_STORAGE_KEY), null, "reopening after a dismissal restores the default");
  let changes = 0; fresh.l.onChange(() => changes++);
  fresh.l.leave("dismissed"); fresh.l.reopen();
  assert.equal(changes, 2);
});

test("a broken storage is survivable: memory reads null, writes are dropped", async () => {
  const broken = { getItem() { throw new Error("blocked"); }, setItem() { throw new Error("blocked"); }, removeItem() { throw new Error("blocked"); } };
  const { l } = await layer(broken);
  assert.equal(l.memory(), null);
  l.enter(); assert.equal(l.leave("established"), true);
  assert.equal(requestKey("get", "/projects"), "GET /projects");
});
