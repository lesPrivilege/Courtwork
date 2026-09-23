import assert from "node:assert/strict";
import { createHash, randomUUID } from "node:crypto";
import { readFile, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { test } from "node:test";
import { boot } from "./helpers.mjs";
import { seal, sha256, pin } from "./fixtures/kit-context.mjs";
import { createAgentsLoopback } from "./fixtures/agents-api-loopback.mjs";
import { agentsPort } from "./fixtures/agents-host-harness.mjs";
import { localPiHost, localPiWait } from "./fixtures/local-pi-host-harness.mjs";
import { PI_RUNTIME_ADAPTER_ID, PI_RUNTIME_ADAPTER_REVISION } from "../runtime/pi-runtime-port.mjs";

const OLD = "K4_OLD_CORE: retain the first source.";
const NEXT = "K4_NEW_CORE: use the edited source. 😀\r\n";
const profileId = "local:k4-profile";
const source = (name, content, kind = "instruction") => ({
  id: `local:k4-${name}`, kind, title: `K4 ${name}`, content,
});
const ref = item => ({
  resourceId: item.id, contentSha256: sha256(item.content),
  artifactSha256: sha256(JSON.stringify({ kind: item.kind, title: item.title, content: item.content })),
});
const kit = (item, version = "1") => seal({
  schemaVersion: 1, id: "kit:k4", version, core: [ref(item)],
  deferred: [], requirements: [], conflicts: [],
});
const profile = (item, { schemaVersion = 2, kits = schemaVersion === 2 ? [kit(item)] : undefined,
  rules = [], extraIds = [] } = {}) => ({
  schemaVersion, version: schemaVersion === 1 ? "legacy-v1" : "k4-v2",
  resourceIds: [item.id, ...extraIds], rules, uiSlots: [],
  ...(schemaVersion === 2 ? { kits } : {}),
});

async function setup(h, { profileScope = { type: "user", id: "local" } } = {}) {
  const session = await h.createSession();
  const sessionScope = { type: "session", id: session.id };
  const oldSource = source("old", OLD);
  const nextSource = source("next", NEXT);
  const wrongKind = source("wrong-kind", "A reference body.", "reference");
  const snapshot = async () => (await h.api("GET", `/runtime-control?sessionId=${session.id}`)).json;
  const change = async input => h.api("PUT", `/runtime-control?sessionId=${session.id}`,
    { revision: (await snapshot()).revision, ...input });
  for (const item of [oldSource, nextSource, wrongKind]) {
    assert.equal((await change({ operation: "put", resource: { ...item, scope: profileScope } })).status, 200);
  }
  const initial = profile(oldSource);
  const profileResource = { id: profileId, kind: "agent_profile", title: "K4 selected profile",
    scope: profileScope, content: JSON.stringify(initial) };
  assert.equal((await change({ operation: "put", resource: profileResource })).status, 200);
  assert.equal((await change({ operation: "profile", scope: sessionScope, id: profileId })).status, 200);
  const preview = (draft, expectedRevision) => h.api("POST", `/runtime-control/preview-profile?sessionId=${session.id}`, {
    expectedRevision: expectedRevision ?? h.runtime.service.control.config.revision,
    profileId, content: typeof draft === "string" ? draft : JSON.stringify(draft),
  });
  return { session, sessionScope, profileScope, oldSource, nextSource, wrongKind, initial,
    profileResource, snapshot, change, preview };
}

async function fileTree(root) {
  async function walk(dir) {
    let entries;
    try { entries = await readdir(dir, { withFileTypes: true }); }
    catch (error) { if (error.code === "ENOENT") return null; throw error; }
    const rows = [];
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(dir, entry.name);
      rows.push(entry.isDirectory() ? [entry.name, await walk(file)]
        : [entry.name, createHash("sha256").update(await readFile(file)).digest("hex")]);
    }
    return rows;
  }
  return walk(root);
}

test("K4 actual preview → existing CAS save → new Pi Run retains new context and old Run/replay", async () => {
  const h = await boot();
  try {
    const f = await setup(h);
    const sibling = await h.createSession({ title: "Shared profile reader" });
    const siblingControl = (await h.api("GET", `/runtime-control?sessionId=${sibling.id}`)).json;
    const siblingSelection = await h.api("PUT", `/runtime-control?sessionId=${sibling.id}`, {
      revision: siblingControl.revision, operation: "profile",
      scope: { type: "session", id: sibling.id }, id: profileId,
    });
    assert.equal(siblingSelection.status, 200, JSON.stringify(siblingSelection.json));
    const current = await f.snapshot();
    const initialPreview = await f.preview(f.initial, current.revision);
    assert.equal(initialPreview.status, 200, JSON.stringify(initialPreview.json));
    assert.deepEqual([initialPreview.json.preview, initialPreview.json.applied, initialPreview.json.kit.status],
      [true, false, "compiled"]);
    assert.equal(initialPreview.json.kit.compatibility.status, "unchecked");
    assert.equal(initialPreview.json.kit.candidate.text, `[Instruction ${f.oldSource.id}]\n${OLD}`);
    assert.equal(initialPreview.json.kit.candidate.sha256, sha256(initialPreview.json.kit.candidate.text));
    const oldBody = { input: "K4 old", commandId: "k4-old", runtimeSelection: {
      revision: current.revision, profileId, sourceHash: current.composition.hash,
    } };
    const oldCreated = await h.api("POST", `/sessions/${f.session.id}/runs`, oldBody);
    assert.equal(oldCreated.status, 200, JSON.stringify(oldCreated.json));
    const oldRun = await h.pollRun(oldCreated.json.run.id);
    assert.equal(oldRun.status, "completed");
    const oldContext = (await h.api("GET", `/runtime-context?sessionId=${f.session.id}&runId=${oldRun.id}`)).json;

    const draft = profile(f.nextSource, { kits: [kit(f.nextSource, "2")] });
    const draftText = JSON.stringify(draft);
    const before = {
      store: h.runtime.store.snapshot(),
      control: structuredClone(h.runtime.service.control.config),
      stateBytes: await readFile(path.join(h.dataDir, "runtime-state.json")),
      controlBytes: await readFile(path.join(h.dataDir, "runtime-control.json")),
      history: await fileTree(path.join(h.dataDir, "artifact-history")),
      native: await fileTree(path.join(h.dataDir, "pi-sessions")),
      providerRequests: h.runtime.fakeProvider.requests.length,
    };
    const edited = await f.preview(draftText, current.revision);
    assert.equal(edited.status, 200, JSON.stringify(edited.json));
    const proposed = edited.json;
    assert.deepEqual([proposed.revision, proposed.profile.scope, proposed.profile.draftSha256],
      [current.revision, f.profileScope, sha256(draftText)]);
    assert.deepEqual(proposed.kit.pins.map(row => [row.id, row.version]), [["kit:k4", "2"]]);
    assert.equal(proposed.kit.candidate.text, `[Instruction ${f.nextSource.id}]\n${NEXT}`);
    assert.equal(proposed.kit.candidate.bytes, Buffer.byteLength(proposed.kit.candidate.text));
    assert.equal(proposed.kit.candidate.characters, proposed.kit.candidate.text.length);
    assert.ok(proposed.kit.candidate.bytes > proposed.kit.candidate.characters,
      "UTF-8 bytes and UTF-16 code units remain distinct for the edited source");
    assert.equal(proposed.kit.candidate.sha256, sha256(proposed.kit.candidate.text));
    assert.equal(proposed.save.available, true);
    assert.deepEqual(h.runtime.store.snapshot(), before.store);
    assert.deepEqual(h.runtime.service.control.config, before.control);
    assert.deepEqual(await readFile(path.join(h.dataDir, "runtime-state.json")), before.stateBytes);
    assert.deepEqual(await readFile(path.join(h.dataDir, "runtime-control.json")), before.controlBytes);
    assert.deepEqual(await fileTree(path.join(h.dataDir, "artifact-history")), before.history);
    assert.deepEqual(await fileTree(path.join(h.dataDir, "pi-sessions")), before.native);
    assert.equal(h.runtime.fakeProvider.requests.length, before.providerRequests);

    const saved = await h.api("PUT", `/runtime-control?sessionId=${f.session.id}`, {
      revision: proposed.revision, operation: "put", resource: { ...f.profileResource, content: draftText },
    });
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    const nextControl = await f.snapshot();
    assert.equal(nextControl.composition.hash, sha256(draftText));
    const siblingAfterSave = (await h.api("GET", `/runtime-control?sessionId=${sibling.id}`)).json;
    assert.equal(siblingAfterSave.composition.hash, sha256(draftText),
      "saving the original user-scoped source reaches another Session that selected it");
    const newCreated = await h.api("POST", `/sessions/${f.session.id}/runs`, {
      input: "K4 new", commandId: "k4-new",
      runtimeSelection: { revision: nextControl.revision, profileId, sourceHash: nextControl.composition.hash },
    });
    assert.equal(newCreated.status, 200, JSON.stringify(newCreated.json));
    const newRun = await h.pollRun(newCreated.json.run.id);
    assert.equal(newRun.status, "completed");
    assert.equal(newRun.kitBinding.profile.sourceSha256, sha256(draftText));
    const newContext = (await h.api("GET", `/runtime-context?sessionId=${f.session.id}&runId=${newRun.id}`)).json;
    assert.equal(newContext.kitContext.text, proposed.kit.candidate.text);
    assert.equal(newContext.kitContext.plan.candidate.sha256, proposed.kit.candidate.sha256);
    assert.deepEqual((await h.api("GET", `/runtime-context?sessionId=${f.session.id}&runId=${oldRun.id}`)).json,
      oldContext, "historical context is not reinterpreted by the save");
    const replay = await h.api("POST", `/sessions/${f.session.id}/runs`, oldBody);
    assert.deepEqual([replay.status, replay.json.run.id], [200, oldRun.id]);
    const stale = await h.api("POST", `/sessions/${f.session.id}/runs`, {
      input: "stale new intent", commandId: "k4-stale",
      runtimeSelection: oldBody.runtimeSelection,
    });
    assert.deepEqual([stale.status, stale.json.error.code], [409, "runtime_selection_conflict"]);
    assert.equal(h.runtime.fakeProvider.requests.length, 2);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test("K4 v1 and v2 empty-Kit drafts preserve exact legacy context without Run or write", async () => {
  const h = await boot();
  try {
    const f = await setup(h);
    const before = h.runtime.store.snapshot();
    for (const draft of [profile(f.oldSource, { schemaVersion: 1 }), profile(f.oldSource, { kits: [] })]) {
      const result = await f.preview(draft);
      assert.equal(result.status, 200, JSON.stringify(result.json));
      assert.equal(result.json.kit.status, "passthrough");
      assert.deepEqual(result.json.kit.pins, []);
      assert.equal(result.json.kit.candidate.text, `[Instruction ${f.oldSource.id}]\n${OLD}`);
      assert.equal(result.json.kit.candidate.sha256, sha256(result.json.kit.candidate.text));
      assert.equal(result.json.kit.payload, null);
    }
    assert.deepEqual(h.runtime.store.snapshot(), before);
    assert.equal(h.runtime.fakeProvider.requests.length, 0);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test("K4 K1 reference, requirement, kind and conflict diagnostics refuse without a partial candidate", async t => {
  const h = await boot();
  try {
    const f = await setup(h);
    const beforeStore = h.runtime.store.snapshot();
    const beforeControl = structuredClone(h.runtime.service.control.config);
    const cases = [
      ["missing source", draft => {
        draft.kits[0].descriptor.core[0].resourceId = "local:not-imported";
      }, "source-missing"],
      ["changed digest", draft => {
        draft.kits[0].descriptor.core[0].contentSha256 = "0".repeat(64);
      }, "source-mismatch"],
      ["wrong kind", draft => {
        draft.resourceIds.push(f.wrongKind.id);
        draft.kits[0].descriptor.core[0] = ref(f.wrongKind);
      }, "source-mismatch"],
      ["missing required tool", draft => {
        draft.kits[0].descriptor.requirements = [{ resourceId: "tool:unavailable-k4", required: true }];
      }, "requirement-missing"],
    ];
    for (const [name, mutate, expected] of cases) await t.test(name, async () => {
      const draft = structuredClone(f.initial);
      mutate(draft);
      draft.kits = [seal(draft.kits[0].descriptor)];
      const response = await f.preview(draft);
      assert.equal(response.status, 200, JSON.stringify(response.json));
      assert.equal(response.json.kit.status, "refused");
      assert.equal(response.json.kit.candidate, null);
      assert.ok(response.json.kit.diagnostics.some(row => row.code === expected),
        JSON.stringify(response.json.kit.diagnostics));
    });
    await t.test("conflicting Kit pins", async () => {
      const draft = profile(f.oldSource, { kits: [kit(f.oldSource, "1"), kit(f.oldSource, "2")] });
      const response = await f.preview(draft);
      assert.equal(response.status, 200, JSON.stringify(response.json));
      assert.equal(response.json.kit.status, "refused");
      assert.equal(response.json.kit.candidate, null);
      assert.ok(response.json.kit.diagnostics.some(row => row.code === "kit-pin-conflict"));
    });
    assert.deepEqual(h.runtime.store.snapshot(), beforeStore);
    assert.deepEqual(h.runtime.service.control.config, beforeControl);
    assert.equal(h.runtime.fakeProvider.requests.length, 0);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test("K4 exposure and budget refusals keep owner facts; permission readings remain advisory", async () => {
  const h = await boot();
  try {
    const f = await setup(h);
    const deny = profile(f.oldSource, { extraIds: ["tool:ws_write"],
      rules: [{ action: "ws_write", resource: "*", effect: "deny" }] });
    const denied = await f.preview(deny);
    assert.equal(denied.status, 200);
    assert.deepEqual(denied.json.permissions.find(row => row.resourceId === "tool:ws_write")?.effect, "deny");
    assert.equal(denied.json.permissions.find(row => row.resourceId === "tool:ws_write")?.advisory, true);
    const ask = profile(f.oldSource, { extraIds: ["tool:ws_write"],
      rules: [{ action: "ws_write", resource: "*", effect: "ask" }] });
    const asked = await f.preview(ask);
    assert.equal(asked.json.permissions.find(row => row.resourceId === "tool:ws_write")?.effect, "ask");
    assert.equal(h.runtime.service.control.config.policies.length, 0, "preview does not save a policy");

    const exposure = await f.change({ operation: "exposure", id: f.oldSource.id,
      scope: f.profileScope, exposed: false });
    assert.equal(exposure.status, 200);
    const blocked = await f.preview(f.initial);
    assert.equal(blocked.json.kit.status, "refused");
    assert.equal(blocked.json.kit.candidate, null);
    assert.ok(blocked.json.kit.diagnostics.some(row => row.code === "source-not-exposed"));

    const header = "[Instruction local:k4-big]\n";
    const big = source("big", "x".repeat(100000 - header.length + 1));
    assert.equal((await f.change({ operation: "put", resource: { ...big, scope: f.profileScope } })).status, 200);
    const over = await f.preview(profile(big));
    assert.equal(over.status, 200, JSON.stringify(over.json));
    assert.equal(over.json.kit.status, "refused");
    assert.equal(over.json.kit.candidate, null);
    assert.ok(over.json.kit.diagnostics.some(row => row.code === "context-character-budget-exceeded"),
      JSON.stringify(over.json.kit.diagnostics));
    assert.equal(h.runtime.fakeProvider.requests.length, 0);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test("K4 explicit unsupported evidence refuses; absent evidence stays Pi unchecked", async () => {
  const h = await boot();
  try {
    const f = await setup(h);
    const unchecked = await f.preview(f.initial);
    assert.equal(unchecked.json.kit.status, "compiled");
    assert.equal(unchecked.json.kit.compatibility.status, "unchecked");
    const overlay = h.runtime.service.control.previewProfileConfig(profileId, JSON.stringify(f.initial));
    const binding = h.runtime.service.control.bind(h.runtime.service.getRuntimeControl(f.session.id, overlay), overlay);
    const port = h.runtime.service.runtimePort;
    h.runtime.service.runtimePort = { ...port, describe: () => ({ ...port.describe(),
      kitContext: { ...port.describe().kitContext, compatibilityEvidence: [{
        kit: pin(f.initial.kits[0]), bindingHash: binding.hash,
        runtime: { adapterId: PI_RUNTIME_ADAPTER_ID, revision: PI_RUNTIME_ADAPTER_REVISION },
        result: "unsupported", evidence: { ref: "synthetic:k4-unsupported", sha256: sha256("unsupported") },
      }] } }) };
    const unsupported = await f.preview(f.initial);
    assert.equal(unsupported.status, 200, JSON.stringify(unsupported.json));
    assert.equal(unsupported.json.kit.status, "refused");
    assert.equal(unsupported.json.kit.compatibility.status, "unsupported");
    assert.equal(unsupported.json.kit.candidate, null);
    assert.ok(unsupported.json.kit.diagnostics.some(row => row.code === "runtime-unsupported"));
    assert.equal(h.runtime.fakeProvider.requests.length, 0);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test("K4 stale revision and invalid source refuse without saving the caller's draft", async () => {
  const h = await boot();
  try {
    const f = await setup(h);
    const draft = JSON.stringify(profile(f.nextSource, { kits: [kit(f.nextSource, "2")] }));
    const before = h.runtime.store.snapshot();
    const config = structuredClone(h.runtime.service.control.config);
    const stale = await f.preview(draft, config.revision - 1);
    assert.deepEqual([stale.status, stale.json.error.code], [409, "runtime_conflict"]);
    const invalid = await f.preview("{broken JSON", config.revision);
    assert.deepEqual([invalid.status, invalid.json.error.code], [400, "invalid_runtime_config"]);
    const badKit = profile(f.oldSource);
    badKit.kits[0].descriptor.extra = "not in the K1 descriptor";
    const malformed = await f.preview(badKit, config.revision);
    assert.deepEqual([malformed.status, malformed.json.error.code], [400, "invalid_kit_input"]);
    assert.deepEqual(h.runtime.store.snapshot(), before);
    assert.deepEqual(h.runtime.service.control.config, config);
    assert.equal(h.runtime.fakeProvider.requests.length, 0);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test("K4 preview during an active Run is read-only and reports the existing save freeze", async () => {
  const h = await boot();
  let runId;
  try {
    const f = await setup(h);
    const started = await h.api("POST", `/sessions/${f.session.id}/runs`, {
      input: "/fixture slow waiting for K4 preview", commandId: "k4-active",
    });
    assert.equal(started.status, 200, JSON.stringify(started.json));
    runId = started.json.run.id;
    assert.equal((await h.pollRun(runId, { until: status => status === "running" })).status, "running");
    const revision = h.runtime.service.control.config.revision;
    const draft = profile(f.nextSource, { kits: [kit(f.nextSource, "2")] });
    const preview = await f.preview(draft, revision);
    assert.equal(preview.status, 200, JSON.stringify(preview.json));
    assert.equal(preview.json.kit.status, "compiled");
    assert.deepEqual(preview.json.save, {
      available: false, reason: "Runtime configuration is frozen while a run is active",
    });
    const refusedSave = await h.api("PUT", `/runtime-control?sessionId=${f.session.id}`, {
      revision, operation: "put",
      resource: { ...f.profileResource, content: JSON.stringify(draft) },
    });
    assert.deepEqual([refusedSave.status, refusedSave.json.error.code], [409, "active_run"]);
    assert.equal(h.runtime.service.control.config.revision, revision);
  } finally {
    if (runId) await h.api("POST", `/runs/${runId}/cancel`, {}).catch(() => {});
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("K4 only an existing imported profile explicitly selected for an ordinary Session can preview", async () => {
  const h = await boot();
  try {
    const plain = await h.createSession();
    const plainRoute = `/runtime-control/preview-profile?sessionId=${plain.id}`;
    const body = { expectedRevision: h.runtime.service.control.config.revision,
      profileId: "agent:general", content: JSON.stringify(profile(source("old", OLD, "instruction"), { schemaVersion: 1 })) };
    const builtin = await h.api("POST", plainRoute, body);
    assert.deepEqual([builtin.status, builtin.json.error.code], [409, "profile_not_selected"]);
    const noSession = await h.api("POST", "/runtime-control/preview-profile", body);
    assert.deepEqual([noSession.status, noSession.json.error.code], [400, "invalid_input"]);
    const extraQuery = await h.api("POST", plainRoute + "&scope=user", body);
    assert.deepEqual([extraQuery.status, extraQuery.json.error.code], [400, "invalid_input"]);

    const f = await setup(h);
    const selectedBody = { expectedRevision: h.runtime.service.control.config.revision,
      profileId, content: JSON.stringify(f.initial) };
    const wrongId = await h.api("POST", `/runtime-control/preview-profile?sessionId=${f.session.id}`,
      { ...selectedBody, profileId: f.oldSource.id });
    assert.deepEqual([wrongId.status, wrongId.json.error.code], [409, "profile_not_selected"]);
    const inventedScope = await h.api("POST", `/runtime-control/preview-profile?sessionId=${f.session.id}`,
      { ...selectedBody, scope: { type: "session", id: f.session.id } });
    assert.deepEqual([inventedScope.status, inventedScope.json.error.code], [400, "unknown_field"]);
    const global = await h.api("POST", "/attention/conversations", { conversationId: randomUUID() });
    const globalPreview = await h.api("POST", `/runtime-control/preview-profile?sessionId=${global.json.session.id}`, selectedBody);
    assert.deepEqual([globalPreview.status, globalPreview.json.error.code], [409, "profile_preview_ineligible"]);
    await h.runtime.store.bindExtension(f.session.id, { extensionId: "synthetic-extension",
      binding: { matterId: "synthetic-matter" } });
    const extensionPreview = await h.api("POST", `/runtime-control/preview-profile?sessionId=${f.session.id}`, selectedBody);
    assert.deepEqual([extensionPreview.status, extensionPreview.json.error.code], [409, "profile_preview_ineligible"]);
    assert.equal(h.runtime.fakeProvider.requests.length, 0);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test("K4 managed and unavailable executors cannot obtain a Pi Kit preview", async () => {
  const loopback = await createAgentsLoopback({ plan: () => [{ text: "Never reached." }] });
  const h = await boot({ managedRuntimePort: agentsPort(loopback) });
  try {
    const f = await setup(h);
    const chosen = await h.api("PUT", `/sessions/${f.session.id}/executor-choice`,
      { expectedRevision: 0, adapterId: "agents-api" });
    assert.equal(chosen.status, 200, JSON.stringify(chosen.json));
    const before = h.runtime.store.snapshot();
    const managed = await f.preview(f.initial);
    assert.deepEqual([managed.status, managed.json.error.code], [409, "kit_runtime_unsupported"]);
    assert.deepEqual(h.runtime.store.snapshot(), before);
    assert.equal(loopback.posts("/v1/agents/sessions").length, 0);
    assert.equal(h.runtime.fakeProvider.requests.length, 0);
  } finally { await h.runtime.close(); await loopback.close(); await rm(h.dataDir, { recursive: true, force: true }); }

  const pi = await boot();
  try {
    const f = await setup(pi);
    const saved = pi.runtime.service.runtimePorts.get(PI_RUNTIME_ADAPTER_ID);
    pi.runtime.service.runtimePorts.delete(PI_RUNTIME_ADAPTER_ID);
    try {
      const unavailable = await f.preview(f.initial);
      assert.deepEqual([unavailable.status, unavailable.json.error.code], [409, "executor_unavailable"]);
      assert.equal(pi.runtime.fakeProvider.requests.length, 0);
    } finally { pi.runtime.service.runtimePorts.set(PI_RUNTIME_ADAPTER_ID, saved); }
  } finally { await pi.runtime.close(); await rm(pi.dataDir, { recursive: true, force: true }); }
});

test("K4 a racing configuration save yields one pinned old preview or a typed conflict", async () => {
  const h = await boot();
  try {
    const f = await setup(h);
    const revision = h.runtime.service.control.config.revision;
    const [preview, saved] = await Promise.all([
      f.preview(f.initial, revision),
      h.api("PUT", `/runtime-control?sessionId=${f.session.id}`, {
        revision, operation: "put",
        resource: { ...f.oldSource, scope: f.profileScope, content: "Changed after the preview boundary." },
      }),
    ]);
    assert.equal(saved.status, 200, JSON.stringify(saved.json));
    if (preview.status === 200) {
      assert.equal(preview.json.revision, revision);
      assert.equal(preview.json.kit.status, "compiled");
      assert.equal(preview.json.kit.candidate.text, `[Instruction ${f.oldSource.id}]\n${OLD}`);
    } else assert.deepEqual([preview.status, preview.json.error.code], [409, "runtime_conflict"]);
    assert.equal(h.runtime.service.control.config.revision, revision + 1);
    assert.equal(h.runtime.store.listRuns(f.session.id).length, 0);
    assert.equal(h.runtime.fakeProvider.requests.length, 0);
  } finally { await h.runtime.close(); await rm(h.dataDir, { recursive: true, force: true }); }
});

test("K4 a proved Spark child Session refuses ordinary profile preview without a second process effect", async () => {
  const h = await localPiHost();
  try {
    const assignmentInput = await h.create();
    const assignment = await localPiWait(() => {
      const current = h.assignment(assignmentInput.id);
      return ["blocked", "resolved", "cancelled"].includes(current?.status) && current.attempts.length ? current : null;
    });
    const childId = assignment.attempts[0].sessionId;
    const before = h.runtime.store.snapshot();
    const requests = h.requests.length;
    const response = await h.api("POST", `/runtime-control/preview-profile?sessionId=${childId}`, {
      expectedRevision: h.runtime.service.control.config.revision,
      profileId, content: JSON.stringify(profile(source("old", OLD))),
    });
    assert.deepEqual([response.status, response.json.error.code], [409, "profile_preview_ineligible"]);
    assert.deepEqual(h.runtime.store.snapshot(), before);
    assert.equal(h.requests.length, requests, "preview neither redispatches nor asks the local fake provider");
  } finally { await h.close(); }
});
