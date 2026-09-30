/* 06d · Preview's object tabs, measured on the production modules.
 *
 * The tab model and the strip are the real `preview-tabs.mjs`; the words are
 * the real `surface-modules.mjs` describe functions; the late-read test drives
 * the real `createFileView`. The app.mjs wiring of the same rules (open from a
 * Chat row, hide/reopen, crossed Work, expand/restore, draft and reading
 * position) is driven in a real browser by the 06d packet's capture harness,
 * because app.mjs is not importable here. */
import assert from "node:assert/strict";
import test from "node:test";
import { createPreviewTabs, previewTabKey, renderPreviewTabs, installPreviewTabKeys } from "../web/preview-tabs.mjs";
import { TinyNode } from "./tiny-dom.mjs";
import { surfaceModule, surfaceModules } from "../web/surface-modules.mjs";
import { createFileView } from "../web/inspector.mjs";
import { withTinyDom, flush, deferred } from "./tiny-dom.mjs";

const A = "work-a", B = "work-b";
const recorded = (sessionId, sha, runId = "run-1", path = "out/brief.md") => ({ kind: "content-version", sessionId, runId, path, sha256: sha.repeat(64) });
const current = (sessionId, path = "out/brief.md") => ({ kind: "current", sessionId, path });
const keys = (tabs) => tabs.tabs().map((tab) => tab.key);

/* ── identity ─────────────────────────────────────────────────────────── */

test("a tab is keyed by the owner's own identity: same object same key, another version or Work another key", () => {
  assert.equal(previewTabKey("file", recorded(A, "a")), previewTabKey("file", { ...recorded(A, "a") }));
  assert.notEqual(previewTabKey("file", recorded(A, "a")), previewTabKey("file", recorded(A, "b")), "two recorded versions of one path");
  assert.notEqual(previewTabKey("file", recorded(A, "a")), previewTabKey("file", current(A)), "a recorded version is not the current file");
  assert.notEqual(previewTabKey("file", recorded(A, "a")), previewTabKey("file", recorded(B, "a")), "the same bytes in another Work");
  assert.notEqual(previewTabKey("presentation", { sessionId: A, instanceId: "p1", revision: 1 }),
    previewTabKey("presentation", { sessionId: A, instanceId: "p1", revision: 2 }), "two revisions of one presentation");
  assert.notEqual(previewTabKey("run", { sessionId: A, runId: "r1" }), previewTabKey("run", { sessionId: A, runId: "r2" }));
  const core = { kind: "core-file", sessionId: A, path: "x.md", sha256: "c".repeat(64), matterId: "m", candidateId: "c1", artifactId: null, candidateDigest: "d1", bundleDigest: "b1" };
  assert.notEqual(previewTabKey("file", core), previewTabKey("file", { ...core, candidateId: "c2" }), "core-file carries its candidate");
  const upload = { kind: "retained-source", sessionId: A, path: "m.md", sha256: "e".repeat(64), sourceId: "s", revision: 1 };
  assert.notEqual(previewTabKey("file", upload), previewTabKey("file", { ...upload, revision: 2 }), "retained upload carries its revision");
});

/* ── the model ────────────────────────────────────────────────────────── */

test("opening appends and selects; opening the same object again reselects its tab and keeps it once", () => {
  const tabs = createPreviewTabs();
  tabs.setScope(A);
  const first = recorded(A, "a");
  assert.equal(tabs.open("file", first).created, true);
  tabs.open("presentation", { sessionId: A, instanceId: "p1", revision: 1 });
  tabs.open("run", { sessionId: A, runId: "r1" });
  assert.equal(tabs.active().kind, "run");
  const again = tabs.open("file", { ...first });
  assert.equal(again.created, false);
  assert.equal(tabs.tabs().length, 3, "no second tab for the same object");
  assert.equal(tabs.active().ref, first, "the tab keeps the ref it was opened with");
  assert.deepEqual(tabs.tabs().map((tab) => tab.kind), ["file", "presentation", "run"], "order is opening order");
  tabs.open("file", recorded(A, "b"));
  assert.equal(tabs.tabs().length, 4, "a second recorded version is a second tab, not a replacement");
});

test("a tab can only be opened in its own Work", () => {
  const tabs = createPreviewTabs();
  tabs.setScope(A);
  assert.equal(tabs.open("file", recorded(B, "a")), null);
  assert.equal(tabs.tabs().length, 0);
  tabs.setScope(null);
  assert.equal(tabs.open("file", recorded(A, "a")), null, "Home holds no tabs");
});

test("closing the active tab selects its right neighbour, else its left; closing another leaves the selection", () => {
  const tabs = createPreviewTabs();
  tabs.setScope(A);
  for (const sha of ["a", "b", "c", "d"]) tabs.open("file", recorded(A, sha));
  const [ka, kb, kc, kd] = keys(tabs);
  tabs.select(kb);
  assert.equal(tabs.close(kb).active.key, kc, "right neighbour");
  assert.equal(tabs.close(kd).active.key, kc, "closing an inactive tab keeps the selection");
  assert.equal(tabs.close(kc).active.key, ka, "no right neighbour: the left one");
  const last = tabs.close(ka);
  assert.equal(last.closed.key, ka);
  assert.equal(last.active, null, "the last close leaves nothing selected");
  assert.equal(tabs.close("missing").closed, null);
});

test("each Work keeps its own tabs, selection and reading position; Work A's objects never appear in B", () => {
  const tabs = createPreviewTabs();
  tabs.setScope(A);
  tabs.open("file", recorded(A, "a"));
  const { tab } = tabs.open("file", recorded(A, "b"));
  tabs.remember(tab.key, 1200);
  tabs.select(keys(tabs)[0]);
  tabs.select(tab.key);
  tabs.setScope(B);
  assert.deepEqual(tabs.tabs(), [], "B starts with nothing of A's");
  assert.equal(tabs.active(), null);
  tabs.open("file", recorded(B, "z"));
  tabs.setScope(A);
  assert.equal(tabs.tabs().length, 2);
  assert.equal(tabs.active().key, tab.key, "A's selection is where it was left");
  assert.equal(tabs.active().scrollTop, 1200, "and so is its reading position");
  assert.ok(tabs.tabs().every((item) => item.ref.sessionId === A));
});

/* ── the strip ────────────────────────────────────────────────────────── */

function strip(container, tabs, calls = { select: [], close: [] }) {
  const describe = (tab) => ({ name: tab.ref.path.split("/").at(-1), full: tab.ref.path, meta: `Recorded ${tab.ref.sha256.slice(0, 8)}`, activity: tab.activity ?? null });
  const draw = () => renderPreviewTabs(container, {
    tabs: tabs.tabs(), activeKey: tabs.active()?.key ?? null, describe,
    controls: (tab) => surfaceModule(tab.kind).contentId,
    onSelect: (key) => { calls.select.push(key); tabs.select(key); draw(); },
    onClose: (key, how) => { calls.close.push({ key, ...how }); tabs.close(key); draw(); },
  });
  draw();
  return { draw, calls };
}

test("the strip draws each object as a tab with a separate close target and the full name kept", () => withTinyDom(async (container) => {
  const tabs = createPreviewTabs();
  tabs.setScope(A);
  tabs.open("file", recorded(A, "a", "run-1", "out/notes/a-deliberately-long-file-name-that-has-to-be-truncated.md"));
  tabs.open("file", recorded(A, "b"));
  strip(container, tabs);
  const selects = container.querySelectorAll(".surface-tab-select");
  assert.equal(selects.length, 2);
  assert.deepEqual(selects.map((node) => node.getAttribute("role")), ["tab", "tab"]);
  assert.deepEqual(selects.map((node) => node.getAttribute("aria-selected")), ["false", "true"]);
  assert.deepEqual(selects.map((node) => node.tabIndex), [-1, 0], "one tab stop: the selected tab");
  assert.equal(selects[0].getAttribute("aria-controls"), "file-content");
  assert.equal(selects[0].getAttribute("aria-label"), "out/notes/a-deliberately-long-file-name-that-has-to-be-truncated.md · Recorded aaaaaaaa");
  assert.equal(selects[0].getAttribute("title"), null, "no native title repeating the name (ICN-17)");
  assert.match(selects[0].getAttribute("data-tooltip"), /^out\/notes\/a-deliberately-long/);
  assert.equal(selects[0].querySelector(".surface-tab-name").textContent, "a-deliberately-long-file-name-that-has-to-be-truncated.md");
  const closes = container.querySelectorAll(".surface-tab-close");
  assert.equal(closes.length, 2);
  assert.equal(closes[1].getAttribute("aria-label"), "Close out/brief.md");
  assert.equal(new Set(selects.map((node) => node.getAttribute("id"))).size, 2, "each tab has its own id for its panel's label");
}));

test("keyboard: arrows, Home and End select along the strip; Delete closes the focused tab; focus stays on the strip", () => withTinyDom(async (container) => {
  const tabs = createPreviewTabs();
  tabs.setScope(A);
  for (const sha of ["a", "b", "c"]) tabs.open("file", recorded(A, sha));
  const { calls } = strip(container, tabs);
  installPreviewTabKeys(container, {
    onSelect: (key) => { calls.select.push(key); tabs.select(key); strip(container, tabs, calls); container.querySelector('[aria-selected="true"]').focus(); },
    onClose: (key, how) => { calls.close.push({ key, ...how }); tabs.close(key); strip(container, tabs, calls); container.querySelector('[aria-selected="true"]')?.focus(); },
  });
  const selected = () => container.querySelector('.surface-tab-select[aria-selected="true"]');
  const press = (key) => { const target = document.activeElement; target.dispatchEvent({ type: "keydown", key, target }); };
  selected().focus();
  press("ArrowRight");
  assert.equal(tabs.active().key, keys(tabs)[0], "ArrowRight wraps from the last tab to the first");
  press("End");
  assert.equal(tabs.active().key, keys(tabs)[2]);
  press("ArrowLeft");
  assert.equal(tabs.active().key, keys(tabs)[1]);
  press("Home");
  assert.equal(tabs.active().key, keys(tabs)[0]);
  const closing = tabs.active().key;
  press("Delete");
  assert.deepEqual(calls.close.at(-1), { key: closing, viaKeyboard: true });
  assert.equal(tabs.tabs().length, 2);
  assert.equal(document.activeElement, selected(), "the keyboard lands on the tab that took over");
  // A close button is not a stop on the arrow path.
  const close = container.querySelector(".surface-tab-close");
  close.focus();
  const before = tabs.active().key;
  close.dispatchEvent({ type: "keydown", key: "ArrowRight", target: close });
  assert.equal(tabs.active().key, before);
}));

test("a repaint keeps the keyboard on the same tab's select or close target", () => withTinyDom(async (container) => {
  const tabs = createPreviewTabs();
  tabs.setScope(A);
  tabs.open("file", recorded(A, "a"));
  tabs.open("file", recorded(A, "b"));
  const { draw } = strip(container, tabs);
  container.querySelectorAll(".surface-tab-close")[0].focus();
  draw();
  assert.equal(document.activeElement, container.querySelectorAll(".surface-tab-close")[0]);
  container.querySelectorAll(".surface-tab-select")[1].focus();
  draw();
  assert.equal(document.activeElement, container.querySelectorAll(".surface-tab-select")[1]);
}));

/* ── the strip's own horizontal scroll (2026-09-28 · active tab visibility) ──
 * A layout stand-in for the observed 390px strip (x16–306, client 290) with
 * 204px tabs. Like a browser, emptying the strip clamps its scroll to the
 * start; only the strip scrolls. Real geometry is Parent's browser check. */
function overflowStrip(container, { left = 16, width = 290, tab = 204, gap = 4 } = {}) {
  let scroll = 0;
  const content = () => container.children.length ? container.children.length * (tab + gap) - gap : 0;
  Object.defineProperty(container, "clientWidth", { configurable: true, get: () => width });
  Object.defineProperty(container, "scrollLeft", { configurable: true, get: () => scroll,
    set: (value) => { scroll = Math.max(0, Math.min(value, Math.max(0, content() - width))); } });
  container.getBoundingClientRect = () => ({ left, right: left + width, width });
  const replace = container.replaceChildren.bind(container);
  container.replaceChildren = (...nodes) => { replace(); container.scrollLeft = scroll; replace(...nodes); };
  const previous = Object.getOwnPropertyDescriptor(TinyNode.prototype, "getBoundingClientRect");
  TinyNode.prototype.getBoundingClientRect = function () {
    const index = this.parentNode === container ? container.children.indexOf(this) : -1;
    const start = left + index * (tab + gap) - scroll;
    return index < 0 ? { left: 0, right: 0, width: 0 } : { left: start, right: start + tab, width: tab };
  };
  const visible = (key) => {
    const wrap = container.querySelectorAll("[data-preview-tab]").find((node) => node.getAttribute("data-preview-tab") === key);
    const box = wrap.getBoundingClientRect();
    return box.left >= left && box.right <= left + width;
  };
  const restore = () => { if (previous) Object.defineProperty(TinyNode.prototype, "getBoundingClientRect", previous); else delete TinyNode.prototype.getBoundingClientRect; };
  return { visible, restore, get scroll() { return scroll; }, set scroll(value) { container.scrollLeft = value; } };
}

test("the observed case: first tab selected at 390px, ArrowRight selects and shows the second tab with its close target", () => withTinyDom(async (container) => {
  const layout = overflowStrip(container);
  try {
    const tabs = createPreviewTabs();
    tabs.setScope(A);
    tabs.open("file", recorded(A, "a", "run-1", "out/preview-a.md"));
    tabs.open("file", recorded(A, "b", "run-1", "out/preview-b.txt"));
    const { calls } = strip(container, tabs);
    installPreviewTabKeys(container, {
      onSelect: (key) => { tabs.select(key); strip(container, tabs, calls); container.querySelector('[aria-selected="true"]').focus(); },
      onClose: () => {},
    });
    tabs.select(keys(tabs)[0]);
    strip(container, tabs, calls);
    assert.equal(layout.scroll, 0);
    const first = container.querySelector('.surface-tab-select[aria-selected="true"]');
    first.focus();
    first.dispatchEvent({ type: "keydown", key: "ArrowRight", target: first });
    assert.equal(tabs.active().key, keys(tabs)[1]);
    assert.equal(document.activeElement.getAttribute("aria-selected"), "true");
    assert.ok(layout.visible(keys(tabs)[1]), "the selected, focused tab (select and close) lies inside the strip");
    assert.ok(layout.scroll > 0, "the strip itself scrolled");
  } finally { layout.restore(); }
}));

test("Home/End, opening and closing reveal the selected tab; a repaint keeps the reader's own strip scroll", () => withTinyDom(async (container) => {
  const layout = overflowStrip(container);
  try {
    const tabs = createPreviewTabs();
    tabs.setScope(A);
    for (const sha of ["a", "b", "c"]) tabs.open("file", recorded(A, sha));
    const { draw } = strip(container, tabs);
    assert.ok(layout.visible(keys(tabs)[2]), "a newly opened tab is shown");
    installPreviewTabKeys(container, {
      onSelect: (key) => { tabs.select(key); draw(); },
      onClose: (key) => { tabs.close(key); draw(); },
    });
    const press = (key) => { const target = container.querySelector('.surface-tab-select[aria-selected="true"]'); target.dispatchEvent({ type: "keydown", key, target }); };
    press("Home");
    assert.equal(layout.scroll, 0);
    assert.ok(layout.visible(keys(tabs)[0]));
    press("End");
    assert.ok(layout.visible(keys(tabs)[2]));
    tabs.open("file", recorded(A, "d"));
    draw();
    assert.ok(layout.visible(keys(tabs)[3]), "opening appends, selects and reveals");

    // The reader scrolls the strip away from the selection; unchanged polls
    // and a changed mark on the same selection do not pull it back.
    layout.scroll = 0;
    draw();
    assert.equal(layout.scroll, 0, "an unchanged repaint leaves the strip where the reader put it");
    tabs.tabs()[0].activity = { status: "running", word: "Running" };
    draw();
    assert.equal(layout.scroll, 0, "a changed repaint with the same selection keeps the reader's scroll");
    layout.scroll = 100;
    tabs.tabs()[0].activity = null;
    draw();
    assert.equal(layout.scroll, 100, "replacing the tabs does not drop the strip back to its start");

    // Closing the selected last tab selects its left neighbour and shows it.
    press("Delete");
    assert.equal(tabs.active().key, keys(tabs)[2]);
    assert.ok(layout.visible(keys(tabs)[2]));
  } finally { layout.restore(); }
}));

test("keyboard focus on an off-strip tab reveals it; a strip without a layout box owes the reveal to its next paint", () => withTinyDom(async (container) => {
  const layout = overflowStrip(container);
  try {
    const tabs = createPreviewTabs();
    tabs.setScope(A);
    for (const sha of ["a", "b", "c"]) tabs.open("file", recorded(A, sha));
    const { draw } = strip(container, tabs);
    installPreviewTabKeys(container, { onSelect: () => {}, onClose: () => {} });
    layout.scroll = 0;
    const lastClose = container.querySelectorAll(".surface-tab-close")[2];
    lastClose.focus();
    lastClose.dispatchEvent({ type: "focusin", target: lastClose });
    assert.ok(layout.visible(keys(tabs)[2]), "focusing a tab's close target shows that tab");

    Object.defineProperty(container, "clientWidth", { configurable: true, get: () => 0 });
    tabs.select(keys(tabs)[0]);
    draw();
    Object.defineProperty(container, "clientWidth", { configurable: true, get: () => 290 });
    layout.scroll = 300;
    draw();
    assert.ok(layout.visible(keys(tabs)[0]), "the owed reveal lands on the first paint with a box");
  } finally { layout.restore(); }
}));

test("a Work tab's mark is the run's own status word, said in words as well as shape", () => withTinyDom(async (container) => {
  const tabs = createPreviewTabs();
  tabs.setScope(A);
  tabs.open("file", recorded(A, "a"));
  tabs.active().activity = { status: "waiting_user", word: "Waiting for you" };
  strip(container, tabs);
  const mark = container.querySelector(".tab-activity");
  assert.ok(mark.classList.contains("waiting_user"));
  assert.equal(mark.querySelector(".sr-only").textContent, "Waiting for you");
}));

/* ── the words, from owner facts ──────────────────────────────────────── */

test("each kind says its object's own name, and which reading or version it is", () => {
  assert.deepEqual(surfaceModules.map((module) => module.kind), ["run", "file", "workspace", "presentation"]);
  const file = surfaceModule("file");
  assert.deepEqual(file.describe(current(A, "out/brief.md")), { name: "brief.md", full: "out/brief.md", meta: "Current" });
  assert.equal(file.describe(recorded(A, "a")).meta, "Recorded aaaaaaaa");
  assert.equal(file.describe({ kind: "retained-source", sessionId: A, path: "m/source.md", sha256: "e".repeat(64), sourceId: "s", revision: 3 }).meta, "Upload revision 3");
  assert.equal(file.describe({ kind: "core-file", sessionId: A, path: "x.md", sha256: "c".repeat(64), artifactId: "art" }).meta, "Artifact cccccccc");
  const workspace = surfaceModule("workspace");
  assert.deepEqual(workspace.describe({ sessionId: A }, { extension: null, sessionTitle: "Parcel brief review" }), { name: "Workspace", full: "Workspace · Parcel brief review" });
  assert.equal(workspace.describe({ sessionId: A }, { extension: { title: "Inbound NDA" }, sessionTitle: "x" }).name, "Inbound NDA");
  const run = surfaceModule("run");
  const words = run.describe({ sessionId: A, runId: "r1" }, { runs: [{ id: "r1", sessionId: A, status: "completed", startedAt: "2026-09-21T14:02:07.000Z" }] });
  assert.equal(words.name, "Work", "VS-04/05: an entry says Work, not Run");
  assert.ok(words.meta && words.full.startsWith("Work started "), "told apart by when it was recorded");
  assert.equal(run.describe({ sessionId: A, runId: "gone" }, { runs: [] }).name, "Work", "an unread run is not given invented facts");
  for (const module of surfaceModules) assert.equal(module.card, undefined, `${module.kind} has no card: the card layer is gone`);
});

/* ── late reads ───────────────────────────────────────────────────────── */

function heldFiles() {
  const held = new Map();
  const request = (url, { signal } = {}) => {
    const query = new URL(url, "http://courtwork.test").searchParams;
    const gate = deferred();
    held.set(query.get("sha256"), gate);
    signal?.addEventListener?.("abort", () => gate.reject(Object.assign(new Error("aborted"), { name: "AbortError" })));
    return gate.promise.then(() => ({
      kind: "content-version", sessionId: A, runId: query.get("runId"), path: query.get("path"),
      sha256: query.get("sha256"), bytes: 20, text: `Text of version ${query.get("sha256").slice(0, 1)}`, truncated: false,
    }));
  };
  return { held, request };
}

test("a read answered after its tab was switched away never paints over the selected object", () => withTinyDom(async (container) => {
  const { held, request } = heldFiles();
  const view = createFileView(container, { request });
  const a = recorded(A, "a", "run-1", "out/a.txt"), b = recorded(A, "b", "run-1", "out/b.txt");
  const first = view.load(a);
  const second = view.load(b);
  held.get("b".repeat(64)).resolve();
  await second;
  held.get("a".repeat(64)).resolve();
  await first.catch(() => {});
  await flush();
  assert.match(container.textContent, /Text of version b/);
  assert.doesNotMatch(container.textContent, /Text of version a/);
}));

test("a read answered after its tab was closed paints nothing", () => withTinyDom(async (container) => {
  const { held, request } = heldFiles();
  const view = createFileView(container, { request });
  const pending = view.load(recorded(A, "a", "run-1", "out/a.txt"));
  view.pause(); // closePreviewTab / closeSurface pause the reader for the tab going away
  held.get("a".repeat(64)).resolve();
  await pending.catch(() => {});
  await flush();
  assert.doesNotMatch(container.textContent, /Text of version a/);
}));
