import assert from "node:assert/strict";
import { test } from "node:test";
import { createLocationHistory, describeLocation, sameLocation, HISTORY_LIMIT } from "../web/location-history.mjs";

const home = { kind: "home" };
const chat = (id, title = `Chat ${id}`) => ({ kind: "session", sessionId: id, projectId: null, title });

test("09 · the trail pushes only a different place, refreshes the same one, and cuts the forward trail on a new arrival", () => {
  const h = createLocationHistory();
  assert.equal(h.current(), null);
  assert.equal(h.arrive(home).pushed, true);
  assert.equal(h.arrive(home).pushed, false, "Home again is the same place");
  assert.equal(h.arrive(chat("a")).pushed, true);
  assert.equal(h.arrive(chat("a", "Renamed")).pushed, false);
  assert.equal(h.current().title, "Renamed", "arriving again refreshes the word on the control");
  assert.equal(h.length, 2);
  assert.equal(h.canBack(), true); assert.equal(h.canForward(), false);
  assert.equal(h.back().kind, "home");
  assert.equal(h.canForward(), true);
  assert.equal(h.arrive(chat("b")).pushed, true);
  assert.deepEqual(h.snapshot().map((e) => e.sessionId), [null, "b"], "A → B → Back → C truncates the forward trail");
  assert.equal(h.forward(), null, "no forward past the end");
  assert.equal(h.back().kind, "home");
  assert.equal(h.back(), null, "no back before the start");
  assert.equal(h.forward().sessionId, "b");
});

test("09 · the trail is bounded, names its places, keeps restore references only, and marks what the reader refuses", () => {
  const h = createLocationHistory({ limit: 5 });
  for (let i = 0; i < 9; i++) h.arrive(chat(String(i)));
  assert.equal(h.length, 5);
  assert.deepEqual(h.snapshot().map((e) => e.sessionId), ["4", "5", "6", "7", "8"]);
  assert.equal(HISTORY_LIMIT, 50);
  h.remember({ reading: { anchor: { key: "row-3", top: 12 }, selection: null } });
  assert.deepEqual(h.current().restore.reading.anchor, { key: "row-3", top: 12 });
  assert.ok(!("text" in h.current()), "no draft text is copied into the trail");
  assert.equal(describeLocation(h.current()), "Chat 8");
  assert.equal(describeLocation({ kind: "home" }), "Home");
  assert.equal(describeLocation({ kind: "session", sessionId: "x", title: "  " }), "Untitled chat");
  assert.equal(describeLocation(null), "");
  const entry = h.back();
  h.markUnavailable(entry, "no longer exists");
  assert.equal(entry.unavailable, true); assert.equal(entry.reason, "no longer exists");
  assert.equal(h.canBack(), true, "an unavailable place stays on the trail so Back can continue past it");
  h.retitle("6", "Six");
  assert.equal(h.snapshot().find((e) => e.sessionId === "6").title, "Six");
  h.forget("8");
  assert.equal(h.snapshot().find((e) => e.sessionId === "8").unavailable, true);
  h.arrive(chat("7"));
  assert.equal(h.current().unavailable, false, "arriving again through the reader clears the mark");
  assert.equal(sameLocation(home, { kind: "home", sessionId: null }), true);
  assert.equal(sameLocation(chat("1"), chat("2")), false);
  assert.equal(sameLocation(null, home), false);
});
