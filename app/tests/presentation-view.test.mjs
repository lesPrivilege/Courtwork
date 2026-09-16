import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { withTinyDom } from "./tiny-dom.mjs";
import { projectThread } from "../web/thread-projection.mjs";
import { surfaceModule, surfaceModules } from "../web/surface-modules.mjs";

const root = new URL("../../", import.meta.url).pathname;
const INSTANCE = { instanceId: "pres-0f1e2d3c-4b5a-4a6b-8c7d-9e0f1a2b3c4d", revision: 1, kind: "facts", version: 1,
  spec: { kind: "facts", version: 1, title: "Parcel helper", items: [{ label: "Bug", value: "pageCount rounds down" }, { label: "Fix", value: "Math.ceil" }] },
  specSha256: "a".repeat(64), bytes: 120, origin: { runId: "r1", callId: "c1", source: "model-derived" }, createdAt: "2026-09-16T00:00:00.000Z" };

test("08 · a recorded presentation is a row of its own at its event position", () => {
  const events = [
    { seq: 1, runId: "r1", sessionId: "s1", type: "user.message", data: { text: "go" } },
    { seq: 2, runId: "r1", sessionId: "s1", type: "run.status", data: { status: "running" } },
    { seq: 3, runId: "r1", sessionId: "s1", type: "presentation.created", data: INSTANCE },
    { seq: 4, runId: "r1", sessionId: "s1", type: "run.status", data: { status: "completed" } },
  ];
  const { rows } = projectThread(events, [{ id: "r1", sessionId: "s1", status: "completed" }], "s1");
  const row = rows.find((r) => r.kind === "presentation");
  assert.ok(row, JSON.stringify(rows.map((r) => r.kind)));
  assert.equal(row.id, `presentation:${INSTANCE.instanceId}`);
  assert.equal(row.instance.revision, 1);
  assert.ok(!rows.some((r) => r.kind === "presentation" && !r.instance.instanceId));
});

test("08 · the Chat row and the surface pane draw the same instance and version; an undrawable version reads as text and says so", async () => {
  await withTinyDom(async () => {
    const { renderPresentationInline, renderPresentationPane, canDraw, fallbackText, identityLine } = await import("../web/presentation-facts.mjs");
    let opened = null;
    const inline = renderPresentationInline(INSTANCE, { onOpen: (instance) => { opened = instance; } });
    assert.equal(inline.getAttribute("data-presentation-id"), INSTANCE.instanceId);
    assert.equal(inline.querySelectorAll("dt").length, 2);
    assert.ok(inline.textContent.includes("Model-derived · facts v1 · revision 1 · 0f1e2d3c"));
    const open = inline.querySelector("button");
    await open.dispatchEvent({ type: "click", target: open });
    assert.equal(opened?.instanceId, INSTANCE.instanceId);
    const pane = document.createElement("div");
    renderPresentationPane(pane, INSTANCE);
    assert.equal(pane.querySelectorAll("dt").length, 2);
    assert.equal(pane.querySelector(".presentation-identity")?.textContent, identityLine(INSTANCE), "the pane states the same identity the row states");
    const future = { ...INSTANCE, version: 3 };
    assert.equal(canDraw(future), false);
    const fallback = renderPresentationInline(future, {});
    assert.ok(fallback.textContent.includes("Shown as text: this build cannot draw facts v3."));
    assert.ok(fallback.querySelector("pre")?.textContent.includes("Bug: pageCount rounds down"));
    assert.equal(fallback.querySelectorAll("dt").length, 0, "no drawing is claimed");
    assert.equal(fallbackText(INSTANCE), "Parcel helper\nBug: pageCount rounds down\nFix: Math.ceil");
  });
});

test("08 · the surface knows the presentation kind: a tab of its own, a card and a pane, opened only for an object", () => {
  const module = surfaceModule("presentation");
  assert.ok(module);
  assert.equal(module.tabId, "surface-presentation-tab");
  assert.equal(module.contentId, "presentation-content");
  assert.deepEqual(surfaceModules.map((m) => m.kind), ["run", "file", "preview", "presentation"]);
  assert.equal(module.adapter({ sessionId: "s1", presentationRef: null, events: [] }), null);
  const ref = { sessionId: "s1", instanceId: INSTANCE.instanceId, revision: 1 };
  const schema = module.adapter({ sessionId: "s1", presentationRef: ref, events: [{ type: "presentation.created", data: INSTANCE }] });
  assert.equal(schema.instance.specSha256, INSTANCE.specSha256);
  assert.equal(module.adapter({ sessionId: "s2", presentationRef: ref, events: [] }), null, "another session's ref opens nothing here");
  const app = readFileSync(`${root}app/web/app.mjs`, "utf8");
  const html = readFileSync(`${root}app/web/index.html`, "utf8");
  assert.match(app, /function openPresentation\(ref, opener = document\.activeElement\)/);
  assert.match(app, /module\.kind === "presentation"\s*\? Boolean\(state\.surface\.presentationRef\)/);
  assert.match(app, /request\(`\/sessions\/\$\{encodeURIComponent\(ref\.sessionId\)\}\/presentations\/\$\{encodeURIComponent\(ref\.instanceId\)\}`\)/, "a missing instance is read back by id");
  assert.match(html, /id="surface-presentation-tab"/);
  assert.match(html, /id="presentation-content"/);
});
