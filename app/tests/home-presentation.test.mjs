import assert from "node:assert/strict";
import { test } from "node:test";

import {
  attentionLabels,
  toHomeActivity,
  toHomeAttention,
  toHomeAttentionDetail,
} from "../web/presentation-adapters.mjs";
import { createAttentionWorkspace } from "../web/attention-view.mjs";

const OBSERVED = "2026-09-10T12:00:00.000Z";

function activityPacket(counts = [1, 0, 2]) {
  const start = "2026-09-08T00:00:00.000Z";
  const dates = ["2026-09-08", "2026-09-09", "2026-09-10"];
  return {
    schemaVersion: 1,
    observedAt: OBSERVED,
    timeZone: "UTC",
    interval: {
      start,
      endExclusive: "2026-09-11T00:00:00.000Z",
      days: 3,
      runTimeField: "startedAt",
    },
    scope: { kind: "retained-recorded-runs", projectId: null },
    coverage: { retainedRecords: "complete", historical: "unknown" },
    deduplicationKey: "run.id",
    recordedRunCount: counts.reduce((sum, count) => sum + count, 0),
    buckets: dates.map((date, index) => ({ date, recordedRunCount: counts[index] })),
  };
}

function attentionItem(id, revision = 1, title = id) {
  return {
    schema_version: 1,
    attention_id: id,
    revision,
    descriptor: { title },
    status: "needs_you",
    freshness: "current",
    updated_at: OBSERVED,
  };
}

function attentionPage(items, { count = items.length, offset = 0, next_offset = null, truncated = false } = {}) {
  return {
    schema_version: 1,
    items,
    count,
    offset,
    next_offset,
    truncated,
    disclosure: { count_scope: "visible" },
  };
}

function attentionDetail(id, revision = 1, reason = `${id} reason`) {
  return {
    ...attentionItem(id, revision),
    descriptor: { title: id, summary: null },
    reason,
    next_action: { kind: "inspect", label: "Read the recorded context", trigger: "manual", due_at: null },
  };
}

test("Home Activity rejects malformed dates, totals, and requested periods", () => {
  const valid = activityPacket();
  const projected = toHomeActivity(valid, 3);
  assert.deepEqual(
    { total: projected.total, days: projected.days, dates: projected.buckets.map((bucket) => bucket.date) },
    { total: 3, days: 3, dates: ["2026-09-08", "2026-09-09", "2026-09-10"] },
  );

  const invalid = [
    ["expected period", (data) => assert.equal(toHomeActivity(data, 2), null)],
    ["invalid observedAt", (data) => { data.observedAt = "not-a-time"; assert.equal(toHomeActivity(data, 3), null); }],
    ["invalid interval start", (data) => { data.interval.start = "2026-99-99T00:00:00.000Z"; assert.equal(toHomeActivity(data, 3), null); }],
    ["wrong endExclusive", (data) => { data.interval.endExclusive = "2026-09-12T00:00:00.000Z"; assert.equal(toHomeActivity(data, 3), null); }],
    ["date gap", (data) => { data.buckets[1].date = "2026-09-11"; assert.equal(toHomeActivity(data, 3), null); }],
    ["negative total", (data) => { data.recordedRunCount = -1; assert.equal(toHomeActivity(data, 3), null); }],
    ["negative bucket", (data) => { data.buckets[1].recordedRunCount = -1; assert.equal(toHomeActivity(data, 3), null); }],
    ["sum mismatch", (data) => { data.recordedRunCount = 4; assert.equal(toHomeActivity(data, 3), null); }],
  ];
  for (const [name, check] of invalid) check(structuredClone(valid), name);
});

test("Home Attention rejects invalid identity, revision, and pagination packets", () => {
  const first = attentionItem("a", 1, "Alpha");
  const second = attentionItem("b", 2, "Beta");
  const valid = attentionPage([first, second], { count: 4, next_offset: 2, truncated: true });
  assert.deepEqual(toHomeAttention(valid), {
    count: 4,
    offset: 0,
    nextOffset: 2,
    items: [
      { id: "a", title: "Alpha", status: "needs_you", label: attentionLabels.needs_you, revision: 1, updatedAt: OBSERVED },
      { id: "b", title: "Beta", status: "needs_you", label: attentionLabels.needs_you, revision: 2, updatedAt: OBSERVED },
    ],
  });

  const invalid = [
    ["empty title", (data) => { data.items[0].descriptor.title = ""; assert.equal(toHomeAttention(data), null); }],
    ["truncated without next", (data) => { data.next_offset = null; assert.equal(toHomeAttention(data), null); }],
    ["negative next offset", (data) => { data.next_offset = -1; assert.equal(toHomeAttention(data), null); }],
    ["offset skips page", (data) => { data.next_offset = 1; assert.equal(toHomeAttention(data), null); }],
    ["next offset without truncation", (data) => { data.truncated = false; assert.equal(toHomeAttention(data), null); }],
    ["items exceed count", (data) => { data.count = 1; assert.equal(toHomeAttention(data), null); }],
    ["duplicate identity", (data) => { data.items[1].attention_id = "a"; assert.equal(toHomeAttention(data), null); }],
    ["missing revision", (data) => { delete data.items[0].revision; assert.equal(toHomeAttention(data), null); }],
    ["invalid freshness", (data) => { data.items[0].freshness = "stale"; assert.equal(toHomeAttention(data), null); }],
    ["invalid update timestamp", (data) => { data.items[0].updated_at = "unknown"; assert.equal(toHomeAttention(data), null); }],
  ];
  for (const [name, check] of invalid) check(structuredClone(valid), name);
});

test("Home Attention detail accepts only the display contract", () => {
  const valid = attentionDetail("a", 3);
  const projected = toHomeAttentionDetail(valid);
  assert.deepEqual(projected.next_action, valid.next_action);
  assert.equal(Object.hasOwn(projected, "policy"), false);
  assert.equal(Object.hasOwn(projected, "human_actions"), false);

  const invalid = [
    ["wrong next action kind", (data) => { data.next_action.kind = "resolve"; assert.equal(toHomeAttentionDetail(data), null); }],
    ["missing due time for at trigger", (data) => { data.next_action.trigger = "at"; assert.equal(toHomeAttentionDetail(data), null); }],
    ["malformed next action", (data) => { data.next_action = "not-an-action"; assert.equal(toHomeAttentionDetail(data), null); }],
    ["missing revision", (data) => { delete data.revision; assert.equal(toHomeAttentionDetail(data), null); }],
    ["invalid freshness", (data) => { data.freshness = "stale"; assert.equal(toHomeAttentionDetail(data), null); }],
  ];
  for (const [name, check] of invalid) check(structuredClone(valid), name);
});

class TinyNode {
  constructor(tagName, ownerDocument) {
    this.tagName = tagName;
    this.ownerDocument = ownerDocument;
    this.children = [];
    this.attributes = new Map();
    this.listeners = new Map();
    this._text = "";
    this.className = "";
    this.value = "";
    this.disabled = false;
  }
  set textContent(value) {
    this._text = String(value);
    this.children = [];
  }
  get textContent() {
    return this._text + this.children.map((child) => child.textContent).join("");
  }
  append(...children) {
    for (const child of children.flat()) {
      if (child === null || child === undefined || child === false) continue;
      const node = typeof child === "string" ? this.ownerDocument.createTextNode(child) : child;
      node.parentNode = this;
      this.children.push(node);
    }
  }
  replaceChildren(...children) {
    this.children = [];
    this.append(...children);
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.get(name) ?? null; }
  addEventListener(type, callback) {
    const callbacks = this.listeners.get(type) ?? [];
    callbacks.push(callback);
    this.listeners.set(type, callbacks);
  }
  dispatchEvent(event = {}) {
    for (const callback of this.listeners.get(event.type) ?? []) callback(event);
  }
  click() { this.dispatchEvent({ type: "click", target: this }); }
  focus() { this.ownerDocument.activeElement = this; }
  contains(node) {
    if (!node) return false;
    if (node === this) return true;
    return this.children.some((child) => child.contains?.(node));
  }
  querySelector(selector) {
    const match = selector.match(/^\[([^=]+)="([^"]*)"\]$/);
    const wanted = match ? { name: match[1], value: match[2] } : null;
    const visit = (node) => {
      for (const child of node.children) {
        if (!wanted || child.getAttribute?.(wanted.name) === wanted.value) return child;
        const found = visit(child);
        if (found) return found;
      }
      return null;
    };
    return visit(this);
  }
  get dataset() {
    const dataset = {};
    for (const [name, value] of this.attributes) {
      if (name.startsWith("data-")) dataset[name.slice(5).replace(/-([a-z])/g, (_, letter) => letter.toUpperCase())] = value;
    }
    return dataset;
  }
}

class TinyDocument {
  constructor() { this.activeElement = null; }
  createElement(tagName) { return new TinyNode(tagName, this); }
  createElementNS(_namespace, tagName) { return new TinyNode(tagName, this); }
  createTextNode(text) {
    const node = new TinyNode("#text", this);
    node.textContent = text;
    return node;
  }
}

function withTinyDom(fn) {
  const previousDocument = globalThis.document;
  const previousCSS = globalThis.CSS;
  globalThis.document = new TinyDocument();
  globalThis.CSS = { escape: (value) => String(value).replaceAll('"', '\\"') };
  const container = document.createElement("main");
  return Promise.resolve()
    .then(() => fn(container))
    .finally(() => {
      if (previousDocument === undefined) delete globalThis.document;
      else globalThis.document = previousDocument;
      if (previousCSS === undefined) delete globalThis.CSS;
      else globalThis.CSS = previousCSS;
    });
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}

async function flush() {
  await Promise.resolve();
  await new Promise((resolve) => setImmediate(resolve));
  await Promise.resolve();
}

test("standalone Attention ignores an older project query after a newer open", async () => {
  await withTinyDom(async (container) => {
    const firstQuery = deferred();
    const secondQuery = deferred();
    const calls = [];
    const request = (path, options = {}) => {
      assert.equal(path, "/attention/query");
      const query = options.body.query;
      assert.equal(query.kind, "registry");
      const pending = calls.length === 0 ? firstQuery : secondQuery;
      calls.push({ path, projectId: options.body.projectId, query });
      return pending.promise;
    };
    const workspace = createAttentionWorkspace(container, { request, onBack() {} });
    const projects = [{ id: "p1", name: "One" }, { id: "p2", name: "Two" }];
    const oldOpen = workspace.open({ projects, projectId: "p1" });
    const newOpen = workspace.open({ projects, projectId: "p2" });
    secondQuery.resolve(attentionPage([attentionItem("b", 1, "B")]))
    await newOpen;
    await flush();
    assert.equal(calls.length, 2);
    assert.equal(calls[1].projectId, "p2");
    assert.match(container.textContent, /B/);
    firstQuery.resolve(attentionPage([attentionItem("a", 1, "A")]))
    await oldOpen;
    await flush();
    assert.match(container.textContent, /B/);
    assert.doesNotMatch(container.textContent, /\bA\b/);
  });
});

test("standalone Attention ignores a stale detail after project selection changes", async () => {
  await withTinyDom(async (container) => {
    const query = deferred();
    const nextQuery = deferred();
    const detail = deferred();
    const calls = [];
    const request = (path, options = {}) => {
      if (path === "/attention/query") {
        const pending = calls.some((call) => call.kind === "query") ? nextQuery : query;
        calls.push({ kind: "query", projectId: options.body.projectId });
        return pending.promise;
      }
      calls.push({ kind: "detail", path });
      return detail.promise;
    };
    const workspace = createAttentionWorkspace(container, { request, onBack() {} });
    const projects = [{ id: "p1", name: "One" }, { id: "p2", name: "Two" }];
    const opening = workspace.open({ projects, projectId: "p1" });
    query.resolve(attentionPage([attentionItem("a", 1, "A")]))
    await opening;
    await flush();
    container.querySelector('[data-attention-focus="item-a"]').click();
    await flush();
    const scope = container.querySelector('[data-attention-focus="project"]');
    scope.value = "p2";
    scope.dispatchEvent({ type: "change", target: scope });
    detail.resolve(attentionDetail("a", 1, "STALE A DETAIL"));
    await flush();
    nextQuery.resolve(attentionPage([attentionItem("b", 1, "B")]))
    await flush();
    assert.match(container.textContent, /B/);
    assert.doesNotMatch(container.textContent, /STALE A DETAIL/);
    assert.equal(calls.filter((call) => call.kind === "detail").length, 1);
  });
});

test("Attention registry opens the global agent explicitly without a model request", async () => {
  await withTinyDom(async (container) => {
    const calls = []; let opened = 0;
    const request = async (path, options) => { calls.push({path, options}); return attentionPage([]); };
    const workspace = createAttentionWorkspace(container, { request, onBack() {}, onOpenAssistant() { opened++; } });
    await workspace.open({ projects: [{ id: "p1", name: "One" }], projectId: "p1" });
    const before = calls.length;
    container.querySelector('[data-attention-focus="open-assistant"]').click();
    assert.equal(opened, 1);
    assert.equal(calls.length, before);
    assert.doesNotMatch(container.textContent, /Design preview/);
  });
});

// Astra regression for Luna's back-during-inspect finding.
test("Back to items clears a pending detail and rejects its late response", async () => {
  await withTinyDom(async container => {
    const detail = deferred();
    const workspace = createAttentionWorkspace(container, {
      request: (path) => path === '/attention/query' ? Promise.resolve(attentionPage([attentionItem('a')])) : detail.promise,
      onBack() {},
    });
    await workspace.open({projects:[{id:'p1',name:'One'}],projectId:'p1'});
    container.querySelector('[data-attention-focus="item-a"]').click();
    assert.match(container.textContent, /Loading item/);
    container.querySelector('[data-attention-focus="list-back"]').click();
    assert.doesNotMatch(container.textContent, /Loading item/);
    detail.resolve(attentionDetail('a',1,'Late reason'));
    await flush();
    assert.doesNotMatch(container.textContent, /Loading item|Late reason/);
  });
});
