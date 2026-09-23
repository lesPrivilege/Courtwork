/* K5 seam tests: the selected-profile editor controller against a synthetic
 * owner shaped on the accepted K4/Runtime Control contract. DOM-free. */
import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { createProfileEditor, editorReading, editEligibility, liveProfileEditorAdapter, measureText } from "../web/profile-editor.mjs";

const S = "session-k5";
const P = "local:k5-profile";
const USER = { type: "user", id: "local" };
const sha = (text) => createHash("sha256").update(text, "utf8").digest("hex");
const ORIGINAL = '{\n  "schemaVersion": 2,\n  "version": "1",\n  "kits": []\n}';
const EDITED = '{\n  "schemaVersion": 2,\n  "version": "2",\n  "kits": []\n}';
const typed = (code, message = code) => Object.assign(new Error(message), { body: { error: { code, message } } });

/* A synthetic owner: one saved source, a whole-config revision, and hooks so a
   test can hold, lose or refuse a reply. */
function owner({ content = ORIGINAL, revision = 7 } = {}) {
  const host = { content, revision, calls: [], hold: null, lose: false, refuse: null, activeRun: false };
  const resource = () => ({ id: P, kind: "agent_profile", title: "K5 profile", scope: USER, source: { type: "local-config", hash: sha(host.content) } });
  host.adapter = {
    async source(sessionId, id) {
      host.calls.push({ kind: "source", sessionId, id });
      return { revision: host.revision, resource: resource(), content: host.content };
    },
    async preview(sessionId, body) {
      host.calls.push({ kind: "preview", sessionId, body: structuredClone(body) });
      if (host.hold) await host.hold();
      if (body.expectedRevision !== host.revision) throw typed("runtime_conflict", "Runtime changed; refresh before previewing");
      return {
        preview: true, applied: false, revision: host.revision,
        session: { id: sessionId, scope: "project", projectId: "p" },
        profile: { id: body.profileId, title: "K5 profile", scope: USER, schemaVersion: 2, version: "x", draftSha256: sha(body.content) },
        composition: { id: P, status: "compatible", missing: [] },
        executor: { id: "pi", revision: "r", kitContextFormat: "reference-only-v1" },
        kit: { status: "passthrough", pins: [], diagnostics: [], requirements: [], references: [], compatibility: { status: "not-applicable", kits: [] },
          budget: null, candidate: { text: body.content, sha256: sha(body.content), bytes: 1, characters: 1 }, planSha256: "0" },
        permissions: [], save: { available: !host.activeRun, reason: host.activeRun ? "frozen" : null },
      };
    },
    async save(sessionId, body) {
      host.calls.push({ kind: "save", sessionId, body: structuredClone(body) });
      if (host.refuse) throw typed(host.refuse);
      if (host.activeRun) throw typed("active_run");
      if (body.revision !== host.revision) throw typed("runtime_conflict");
      host.content = body.resource.content;
      host.revision += 1;
      if (host.lose) { host.lose = false; throw new Error("The local runtime could not be reached."); }
      return { revision: host.revision, resources: [resource()] };
    },
  };
  return host;
}

async function setup(options) {
  const host = owner(options);
  const saved = [];
  const editor = createProfileEditor({ adapter: host.adapter, onSaved: (event) => saved.push(event) });
  editor.open(S, P);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return { host, editor, saved, read: (facts) => editor.reading(S, P, facts) };
}
const saves = (host) => host.calls.filter((call) => call.kind === "save");

test("opening reads the saved source and its revision; the draft starts equal", async () => {
  const { read } = await setup();
  const r = read();
  assert.equal(r.base.revision, 7);
  assert.equal(r.base.sourceHash, sha(ORIGINAL));
  assert.equal(r.text, ORIGINAL);
  assert.equal(r.dirty, false);
  assert.deepEqual(r.save.gate, { enabled: false, reason: "No unsaved changes." });
});

test("Preview sends exactly {expectedRevision, profileId, content} and binds to the submitted text", async () => {
  const { host, editor, read } = await setup();
  editor.setText(S, P, EDITED);
  await editor.preview(S, P);
  const call = host.calls.find((entry) => entry.kind === "preview");
  assert.deepEqual(Object.keys(call.body).sort(), ["content", "expectedRevision", "profileId"]);
  assert.deepEqual(call.body, { expectedRevision: 7, profileId: P, content: EDITED });
  assert.equal(read().preview.current, true);
  editor.setText(S, P, EDITED + " ");
  assert.equal(read().preview.current, false, "newer typing is not what was checked");
  assert.equal(saves(host).length, 0, "preview never saves");
});

test("a late preview reply never overwrites a newer preview", async () => {
  const { host, editor, read } = await setup();
  let release;
  host.hold = () => new Promise((resolve) => { release = resolve; });
  editor.setText(S, P, "first");
  const first = editor.preview(S, P);
  host.hold = null;
  editor.setText(S, P, EDITED);
  await editor.preview(S, P);
  release();
  await first;
  assert.equal(read().preview.result.profile.draftSha256, sha(EDITED));
  assert.equal(read().preview.current, true);
});

test("a preview reply for another text or revision is not shown", async () => {
  const { host, editor, read } = await setup();
  const real = host.adapter.preview;
  host.adapter.preview = async (s, body) => ({ ...(await real(s, body)), revision: 99 });
  editor.setText(S, P, EDITED);
  await editor.preview(S, P);
  assert.equal(read().preview.status, "error");
  assert.equal(read().preview.result, null);
});

test("a stale revision refuses the preview, keeps the draft and holds the fresh source apart", async () => {
  const { host, editor, read } = await setup();
  editor.setText(S, P, EDITED);
  host.revision = 9; // someone else changed the configuration
  host.content = ORIGINAL + "\n";
  await editor.preview(S, P);
  const r = read();
  assert.equal(r.preview.error.code, "runtime_conflict");
  assert.equal(r.text, EDITED, "draft kept");
  assert.equal(r.base.revision, 7, "base not replaced silently");
  assert.equal(r.fresh.revision, 9);
  assert.equal(r.save.gate.enabled, false);
});

test("Save is one PUT with original metadata/scope and the base revision; newer typing stays separate", async () => {
  const { host, editor, read, saved } = await setup();
  editor.setText(S, P, EDITED);
  const saving = editor.save(S, P);
  editor.setText(S, P, EDITED + "\n// typed during save");
  await saving;
  assert.deepEqual(saves(host).map((call) => call.body), [{ revision: 7, operation: "put",
    resource: { id: P, kind: "agent_profile", title: "K5 profile", scope: USER, content: EDITED } }]);
  const r = read();
  assert.equal(r.save.status, "saved");
  assert.equal(r.base.content, EDITED);
  assert.equal(r.base.revision, 8);
  assert.equal(r.text, EDITED + "\n// typed during save");
  assert.equal(r.dirty, true);
  assert.deepEqual(saved, [{ sessionId: S, profileId: P, snapshot: { revision: 8, resources: [saved[0].snapshot.resources[0]] } }]);
});

test("a CAS conflict keeps the draft; the person chooses between their text and the current source", async () => {
  const { host, editor, read } = await setup();
  editor.setText(S, P, EDITED);
  host.revision = 10;
  host.content = "{\"changed\":true}";
  await editor.save(S, P);
  let r = read();
  assert.equal(r.save.status, "conflict");
  assert.equal(r.text, EDITED);
  assert.equal(r.fresh.content, "{\"changed\":true}");
  assert.equal(saves(host).length, 1, "never resent");
  editor.keepMine(S, P);
  r = read();
  assert.deepEqual([r.base.revision, r.text, r.fresh], [10, EDITED, null]);
  await editor.save(S, P);
  assert.equal(read().save.status, "saved");
  assert.equal(host.content, EDITED);
});

test("Use the current source replaces the draft only when asked", async () => {
  const { host, editor, read } = await setup();
  editor.setText(S, P, EDITED);
  host.revision = 10;
  host.content = "{\"changed\":true}";
  await editor.check(S, P);
  assert.equal(read().text, EDITED);
  editor.useCurrent(S, P);
  assert.deepEqual([read().text, read().dirty], ["{\"changed\":true}", false]);
});

test("an active run blocks Save; the draft is kept and not queued; Preview still works", async () => {
  const { host, editor, read } = await setup();
  editor.setText(S, P, EDITED);
  assert.equal(read({ activeRuns: 1 }).save.gate.enabled, false);
  host.activeRun = true;
  await editor.preview(S, P);
  assert.equal(read().preview.result.save.available, false);
  await editor.save(S, P);
  assert.equal(read().save.status, "frozen");
  assert.equal(read({ activeRuns: 0 }).save.gate.enabled, false, "held until a fresh owner reading");
  editor.observe(S, { activeRuns: 1 });
  assert.equal(read().save.status, "frozen");
  host.activeRun = false;
  await new Promise((resolve) => setTimeout(resolve, 10));
  assert.equal(saves(host).length, 1, "nothing applies itself after the run");
  editor.observe(S, { activeRuns: 0 });
  assert.equal(read().save.status, "idle");
  assert.equal(read({ activeRuns: 0 }).save.gate.enabled, true, "fresh owner facts unlock Save");
  assert.equal(saves(host).length, 1);
});

test("a lost reply whose write landed is confirmed only by a hash read-back", async () => {
  const { host, editor, read, saved } = await setup();
  host.lose = true;
  editor.setText(S, P, EDITED);
  await editor.save(S, P);
  const r = read();
  assert.equal(r.save.status, "saved");
  assert.match(r.save.message, /confirms the current saved bytes, not which request wrote them/);
  assert.equal(saves(host).length, 1);
  assert.equal(saved.length, 1);
});

test("a lost reply followed by a different saved source stays apart and is never overwritten", async () => {
  const { host, editor, read } = await setup();
  editor.setText(S, P, EDITED);
  const original = host.adapter.save;
  host.adapter.save = async (s, body) => {
    host.calls.push({ kind: "save", sessionId: s, body });
    host.content = "{\"someone\":\"else\"}";
    host.revision = 12;
    throw new Error("The local runtime could not be reached.");
  };
  await editor.save(S, P);
  host.adapter.save = original;
  const r = read();
  assert.equal(r.save.status, "different");
  assert.equal(r.text, EDITED);
  assert.equal(r.fresh.content, "{\"someone\":\"else\"}");
  assert.equal(r.save.gate.enabled, false);
  assert.equal(saves(host).length, 1);
});

test("a lost reply with no read-back stays unknown until Check again", async () => {
  const { host, editor, read } = await setup();
  host.lose = true;
  editor.setText(S, P, EDITED);
  const source = host.adapter.source;
  host.adapter.source = async () => { throw new Error("no answer"); };
  await editor.save(S, P);
  assert.equal(read().save.status, "unknown");
  assert.equal(read().save.gate.enabled, false, "no second Save while the first outcome is unknown");
  await editor.save(S, P);
  assert.equal(saves(host).length, 1);
  host.adapter.source = source;
  await editor.check(S, P);
  assert.equal(read().save.status, "saved");
});

test("a typed refusal (malformed source) keeps the draft and says the owner's message", async () => {
  const { host, editor, read } = await setup();
  host.refuse = "invalid_runtime_config";
  editor.setText(S, P, "{not json");
  await editor.save(S, P);
  assert.deepEqual([read().save.status, read().save.code, read().text], ["failed", "invalid_runtime_config", "{not json"]);
});

test("drafts are keyed by Session and profile", async () => {
  const { host, editor } = await setup();
  editor.setText(S, P, EDITED);
  editor.open("other-session", P);
  await new Promise((resolve) => setTimeout(resolve, 0));
  assert.equal(editor.reading("other-session", P).text, host.content);
  assert.equal(editor.reading(S, P).text, EDITED);
});

test("edit eligibility: only the imported profile this chat selects at session scope", () => {
  const snapshot = { sessionId: S, sessionScope: { kind: "project" }, profileSelections: [{ scope: { type: "session", id: S }, id: P }] };
  const imported = { id: P, kind: "agent_profile", source: { type: "local-config" } };
  assert.equal(editEligibility(snapshot, imported).editable, true);
  assert.equal(editEligibility(snapshot, { ...imported, id: "local:other" }).editable, false);
  assert.equal(editEligibility(snapshot, { id: "agent:general", kind: "agent_profile", source: { type: "builtin" } }).editable, false);
  assert.equal(editEligibility({ ...snapshot, profileSelections: [{ scope: { type: "user", id: "local" }, id: P }] }, imported).editable, false, "inherited is not this chat's own choice");
  assert.equal(editEligibility({ ...snapshot, sessionScope: { kind: "global" } }, imported).editable, false);
});

test("measurement separates UTF-16 code units from UTF-8 bytes", () => {
  assert.deepEqual(measureText("a😀"), { characters: 3, bytes: 5 });
  assert.equal(editorReading(null), null);
});

test("the live adapter speaks the existing endpoints", async () => {
  const calls = [];
  const adapter = liveProfileEditorAdapter(async (path, options) => { calls.push([path, options ?? null]); return {}; });
  await adapter.source("s 1", "local:a");
  await adapter.control("s 1");
  await adapter.preview("s 1", { expectedRevision: 1, profileId: "local:a", content: "{}" });
  await adapter.save("s 1", { revision: 1 });
  assert.deepEqual(calls, [
    ["/runtime-resources/local%3Aa?sessionId=s%201", null],
    ["/runtime-control?sessionId=s%201", null],
    ["/runtime-control/preview-profile?sessionId=s%201", { method: "POST", body: { expectedRevision: 1, profileId: "local:a", content: "{}" } }],
    ["/runtime-control?sessionId=s%201", { method: "PUT", body: { revision: 1 } }],
  ]);
});
