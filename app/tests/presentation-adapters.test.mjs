/* WO-WK13 · the adapters are the only place that turns a work-summary response
 * into what Home displays, so what is asserted here is the metric contract of
 * `contracts/presentation-primitives.d.ts`, not a layout: the window is
 * `current` and never a day, a missing set is null and never 0, and no field is
 * invented for a set that does not carry it. */
import assert from "node:assert/strict";
import { test } from "node:test";

import {
  toStatTiles,
  toWorkCards,
  toPendingRows,
  toInspectionRows,
} from "../web/presentation-adapters.mjs";

const page = (items, over = {}) => ({
  items,
  total: items.length,
  offset: 0,
  limit: 30,
  truncated: false,
  hasMore: false,
  nextOffset: null,
  ...over,
});
const OBSERVED = "2026-09-08T13:15:01.778Z";
const summary = {
  observedAt: OBSERVED,
  pendingItems: page([
    {
      projectId: "p1",
      sessionId: "s1",
      runId: "r1",
      questionId: "q1",
      kind: "permission",
      createdAt: "2026-09-08T13:10:00.000Z",
      label: "Permission requested",
    },
  ]),
  sessionCandidates: page(
    [
      {
        projectId: "p1",
        sessionId: "s1",
        title: "Retainer letter",
        createdAt: "2026-09-08T13:00:00.000Z",
        recordedActivityAt: "2026-09-08T13:10:00.000Z",
        latestRun: {
          runId: "r1",
          status: "waiting_user",
          startedAt: "2026-09-08T13:05:00.000Z",
          endedAt: null,
        },
      },
      {
        projectId: "p9",
        sessionId: "s2",
        title: "",
        createdAt: "2026-09-08T12:00:00.000Z",
        recordedActivityAt: "2026-09-08T12:00:00.000Z",
        latestRun: null,
      },
    ],
    { total: 41, truncated: true, hasMore: true, nextOffset: 30 },
  ),
  inspectionCandidates: page([
    {
      projectId: "p1",
      sessionId: "s3",
      runId: "r3",
      status: "unknown",
      startedAt: "2026-09-08T11:00:00.000Z",
      endedAt: null,
      errorCode: null,
      resultAt: "2026-09-08T11:00:00.000Z",
    },
  ]),
};
const projects = [{ id: "p1", name: "Northside Housing" }];
const context = {
  scope: { projectId: null },
  observedAt: OBSERVED,
  load: { loading: false, error: null },
};

test("toStatTiles reads the three sets' totals in the window the backend can express", () => {
  const tiles = toStatTiles(summary, context);
  assert.equal(tiles.length, 3);
  assert.deepEqual(
    tiles.map((tile) => [tile.label, tile.value]),
    [
      ["Waiting for you", 1],
      ["In progress", 41],
      ["Needs a look", 1],
    ],
  );
  for (const tile of tiles) {
    assert.deepEqual(tile.window, { kind: "current" });
    assert.equal(tile.observedAt, OBSERVED);
    assert.match(tile.caption, /all retained work/);
    assert.match(tile.caption, /right now\.$/);
    // gaps-wk9 G-3: there is no day filter behind these counts, so no caption
    // may claim one.
    assert.doesNotMatch(tile.caption, /today/i);
  }
});

test("a set the answer did not carry reads as words, never as a zero", () => {
  const [waiting] = toStatTiles(
    { ...summary, pendingItems: undefined },
    context,
  );
  assert.equal(waiting.value, null);
  assert.equal(waiting.missingLabel, "Not available");
});

test("the caption states the scope it was actually given", () => {
  const [waiting] = toStatTiles(summary, {
    ...context,
    scope: { projectId: "p1" },
  });
  assert.match(waiting.caption, /this project/);
});

test("toWorkCards passes recorded fields through and names the missing ones", () => {
  const { items, page: facts } = toWorkCards(summary, projects);
  assert.equal(items.length, 2);
  const [first, second] = items;
  assert.equal(first.title, "Retainer letter");
  assert.equal(first.projectName, "Northside Housing");
  assert.equal(first.runStatus, "waiting_user");
  // The instant is the server's own UTC string, unconverted and un-relativised.
  assert.equal(first.runStartedAt, "2026-09-08T13:05:00.000Z");
  assert.equal(first.runEndedAt, null);
  // A session with no run says so; it does not borrow a terminal word.
  assert.equal(second.runStatus, null);
  assert.equal(second.missingRunLabel, "No run recorded");
  assert.equal(second.title, "Open chat");
  // A project the answer could not resolve is null, not the id and not a guess.
  assert.equal(second.projectName, null);
  // Pagination facts are the server's, verbatim: 41 recorded, 2 on this page.
  assert.deepEqual(facts, {
    total: 41,
    offset: 0,
    limit: 30,
    truncated: true,
    hasMore: true,
    nextOffset: 30,
  });
});

test("pending rows keep the server's own request word and invent no run state", () => {
  const { items } = toPendingRows(summary, projects);
  assert.equal(items.length, 1);
  assert.equal(items[0].label, "Permission requested");
  assert.equal(items[0].kind, "permission");
  assert.equal(items[0].title, "Retainer letter");
  assert.equal(Object.hasOwn(items[0], "runStatus"), false);
  assert.equal(Object.hasOwn(items[0], "missingRunLabel"), false);
});

test("inspection rows keep unknown apart from failed and report a missing code as null", () => {
  const { items } = toInspectionRows(summary, projects);
  assert.equal(items[0].status, "unknown");
  assert.equal(items[0].errorCode, null);
  assert.equal(items[0].runEndedAt, null);
});

test("adapters do not read the clock", () => {
  const now = Date.now;
  Date.now = () => {
    throw new Error("an adapter called the clock");
  };
  try {
    toStatTiles(summary, context);
    toWorkCards(summary, projects);
    toPendingRows(summary, projects);
    toInspectionRows(summary, projects);
  } finally {
    Date.now = now;
  }
});
