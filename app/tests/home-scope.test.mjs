import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";

import { renderHome } from "../web/home-view.mjs";
import { withTinyDom } from "./tiny-dom.mjs";

const app = readFileSync(new URL("../web/app.mjs", import.meta.url), "utf8");
const OBSERVED = "2026-09-20T12:00:00.000Z";
const DAY_MS = 86_400_000;
const activityPacket = (days, total = 0) => {
  const start = Date.UTC(2026, 5, 1);
  const buckets = Array.from({ length: days }, (_, index) => ({
    date: new Date(start + index * DAY_MS).toISOString().slice(0, 10),
    recordedRunCount: index === 0 ? total : 0,
  }));
  return {
    schemaVersion: 1,
    observedAt: OBSERVED,
    timeZone: "UTC",
    interval: {
      start: new Date(start).toISOString(),
      endExclusive: new Date(start + days * DAY_MS).toISOString(),
      days,
      runTimeField: "startedAt",
    },
    scope: { kind: "retained-recorded-runs", projectId: null },
    coverage: { retainedRecords: "complete", historical: "unknown" },
    deduplicationKey: "run.id",
    recordedRunCount: total,
    buckets,
  };
};

/* Luna F-02 · a period holding no runs says so in one line; an all-zero grid is
 * a dense instrument stating nothing. The widest period stays absent. */
test("an empty narrower Activity period keeps its control and states the fact without a grid", () => withTinyDom(async (container) => {
  const days = 28;
  const activity = { data: activityPacket(days), days, loading: false, error: null };
  renderHome(container, { projects: [], modules: { activity } });
  const block = container.querySelector('[data-home-block="activity"]');
  assert.ok(block, "the block stays so its period control does not vanish");
  assert.equal(container.querySelector(".home-heatmap"), null, "no zero-filled instrument");
  assert.match(block.textContent, /No runs recorded in the last 28 days\./);
  assert.ok(container.querySelector('[data-focus-key="activity-days-84"]'));
  const widest = { data: activityPacket(84), days: 84, loading: false, error: null };
  renderHome(container, { projects: [], modules: { activity: widest } });
  assert.equal(container.querySelector('[data-home-block="activity"]'), null, "no history at all: the block is absent");
}));

/* Luna F-03 · the server marks every offset page truncated. After merging pages
 * the screen can already hold everything, and then nothing is outside it. */
test("a merged set that holds every item does not claim items are outside the page", () => withTinyDom(async (container) => {
  const items = Array.from({ length: 5 }, (_, index) => ({
    projectId: "p", sessionId: `s${index}`, title: `Session ${index}`, createdAt: OBSERVED,
  }));
  const summary = { sessionCandidates: { items, total: 5, truncated: true, hasMore: false, nextOffset: null } };
  const options = { summary, projects: [{ id: "p", name: "Synthetic" }], activeSet: "sessionCandidates", onSession() {}, onMore() {}, onFilter() {} };
  renderHome(container, options);
  assert.equal(container.querySelectorAll(".home-row").length, 5);
  assert.doesNotMatch(container.textContent, /outside this page/);
  const partial = { sessionCandidates: { items: items.slice(0, 3), total: 9, truncated: true, hasMore: false, nextOffset: null } };
  renderHome(container, { ...options, summary: partial });
  assert.match(container.textContent, /Showing 3 of 9\. Some items are outside this page\./);
}));

/* Luna F-01 · a cached Attention read must not outlive the project it was read
 * for, and the workspace choice moves the scope with it. */
test("Home invalidates the Attention scope when its project disappears or changes", () => {
  assert.match(app, /invalidateHomeAttentionScope\(valid\);/, "loadProjects drops a scope whose project is gone");
  assert.match(app, /function homeAttentionScope\(\)/, "one owner decides which project Home reads");
  assert.match(app, /async function loadHomeAttention\(projectId = homeAttentionScope\(\)/, "the read takes that scope, not a stale cached id");
  assert.match(app, /state\.homeProjectId = id;\s*storeHomeDraft\(\);\s*invalidateHomeAttentionScope\(\);/, "choosing a project in the Work location panel moves the Attention scope with it");
});

/* Luna F-04 · an expanded set is a view of this visit, and the way back never
 * loses the focus sequence. */
test("Home entry keeps the expanded set and keeps a focus target when its control is gone", () => {
  /* Ruled 2026-09-20: filter continuity stays. Returning Home shows the set the
   * person was reading; `All work` is the only way back to the whole of Home. */
  assert.doesNotMatch(app, /state\.home\.filter = null;/, "Home entry must not clear an expanded set");
  assert.match(app, /state\.home\.filter = key;/, "only the filter control changes it");
  assert.match(app, /\?\? stream\.querySelector\(`\[data-home-block="\$\{previous\}"\] \.home-row`\)/, "a block row is the fallback when Show all no longer exists");
  /* Luna 第二轮 · 列表归零后既没有 Show all 也没有行：焦点仍要落在说明它在哪里的
   * 那个块上，最后落回 Home 的锚点，而不是掉出页面。 */
  assert.match(app, /\?\? stream\.querySelector\(`\[data-home-block="\$\{previous\}"\]`\)/, "the block itself catches focus once its list is empty");
  assert.match(app, /\(target \?\? \$\("composer-input"\)\)\?\.focus\(\);/, "the composer is the last resort");
});

test("a Home block is a focus target of last resort without entering the tab sequence", () => withTinyDom(async (container) => {
  const summary = { sessionCandidates: { items: [], total: 0 } };
  renderHome(container, { summary, projects: [], onSession() {}, onFilter() {}, onMore() {} });
  const block = container.querySelector('[data-home-block="sessionCandidates"]');
  assert.ok(block, "Continue keeps its condition sentence when empty");
  assert.equal(block.getAttribute("tabindex"), "-1");
}));
