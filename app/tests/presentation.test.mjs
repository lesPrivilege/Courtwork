import assert from "node:assert/strict";
import { rm } from "node:fs/promises";
import { test } from "node:test";
import { validatePresentationSpec, presentationFallbackText, PRESENTATION_LIMITS } from "../runtime/presentation.mjs";
import { boot, reopen } from "./helpers.mjs";

const FACTS = { kind: "facts", version: 1, title: "Parcel helper", items: [{ label: "Bug", value: "pageCount rounds down" }, { label: "Fix", value: "Math.ceil" }] };
const script = (calls) => `/fixture script ${JSON.stringify(calls)}`;

test("08 · the validator accepts exactly facts v1 and refuses unknown kinds, versions, fields and sizes by name", () => {
  const checked = validatePresentationSpec(FACTS);
  assert.deepEqual(checked.spec, FACTS);
  assert.match(checked.specSha256, /^[0-9a-f]{64}$/);
  assert.equal(checked.items, 2);
  assert.throws(() => validatePresentationSpec({ ...FACTS, kind: "chart" }), /Unknown presentation kind chart/);
  assert.throws(() => validatePresentationSpec({ ...FACTS, version: 2 }), /facts v2 is not a version/);
  assert.throws(() => validatePresentationSpec({ ...FACTS, html: "<b>" }), /unknown field html/);
  assert.throws(() => validatePresentationSpec({ ...FACTS, items: [] }), /non-empty/);
  assert.throws(() => validatePresentationSpec({ ...FACTS, items: Array.from({ length: PRESENTATION_LIMITS.items + 1 }, () => ({ label: "a", value: "b" })) }), /at most 40 items/);
  assert.throws(() => validatePresentationSpec({ ...FACTS, items: [{ label: "a", value: "x".repeat(PRESENTATION_LIMITS.value + 1) }] }), /longer than/);
  assert.throws(() => validatePresentationSpec({ ...FACTS, items: [{ label: "a", value: "b", href: "x" }] }), /unknown field href/);
  assert.equal(presentationFallbackText(FACTS), "Parcel helper\nBug: pageCount rounds down\nFix: Math.ceil");
});

test("08 · cw_present records an instance with identity and hashes on the Run; invalid specs leave no instance; the instance is readable by its session only and survives reopen", async () => {
  const h = await boot();
  try {
    const session = await h.createSession();
    const made = await h.api("POST", `/sessions/${session.id}/runs`, { commandId: "present-1", input: script([
      { name: "cw_present", arguments: { spec: FACTS } },
      { name: "cw_present", arguments: { spec: { ...FACTS, kind: "chart" } } },
      { name: "cw_present", arguments: { spec: { kind: "facts", version: 1, title: "x".repeat(500), items: [{ label: "a", value: "b" }] } } },
    ]) });
    assert.equal(made.status, 200, JSON.stringify(made.json));
    const run = await h.pollRun(made.json.run.id);
    assert.equal(run.status, "completed", JSON.stringify(run.error ?? null));
    const events = (await h.api("GET", `/sessions/${session.id}/events`)).json.events;
    const created = events.filter((e) => e.type === "presentation.created");
    assert.equal(created.length, 1, "only the valid spec became an instance");
    const instance = created[0].data;
    assert.match(instance.instanceId, /^pres-[0-9a-f-]{36}$/);
    assert.equal(instance.revision, 1);
    assert.deepEqual(instance.spec, FACTS);
    assert.equal(instance.origin.runId, run.id);
    assert.equal(instance.origin.source, "model-derived");
    assert.ok(instance.origin.callId);
    const results = events.filter((e) => e.type === "tool.result" && e.runId === run.id);
    assert.ok(results.some((e) => !e.data.isError && String(e.data.text).includes(`Presentation ${instance.instanceId} recorded (facts v1, 2 items)`)), "the receipt names the instance and claims nothing more");
    assert.ok(results.some((e) => e.data.isError && /Unknown presentation kind chart/.test(String(e.data.text))), "an unknown kind is refused by name");
    assert.ok(results.some((e) => e.data.isError && /longer than/.test(String(e.data.text))), "an oversize title is refused");

    const listed = (await h.api("GET", `/sessions/${session.id}/presentations`)).json.presentations;
    assert.deepEqual(listed.map((p) => p.instanceId), [instance.instanceId]);
    const one = (await h.api("GET", `/sessions/${session.id}/presentations/${instance.instanceId}`)).json.presentation;
    assert.equal(one.specSha256, instance.specSha256);
    const other = await h.createSession();
    const cross = await h.api("GET", `/sessions/${other.id}/presentations/${instance.instanceId}`);
    assert.equal(cross.status, 404, "an instance is read through its own session only");

    const dataDir = h.dataDir;
    await h.runtime.close();
    const again = await reopen(dataDir);
    try {
      const after = (await again.api("GET", `/sessions/${session.id}/presentations/${instance.instanceId}`)).json.presentation;
      assert.deepEqual(after.spec, FACTS);
      assert.equal(after.revision, 1);
    } finally { await again.runtime.close(); }
  } finally {
    await h.runtime.close().catch(() => {});
    await rm(h.dataDir, { recursive: true, force: true });
  }
});
