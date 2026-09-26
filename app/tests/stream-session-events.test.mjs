/* Order 3 frontend · the shared event cursor (Chat and Attention) and the
 * Markdown block split used by growing bodies. Pure. */
import test from "node:test";
import assert from "node:assert/strict";
import { admitSessionEvents, eventsAfterPath, growsTextOnly } from "../web/session-events.mjs";
import { markdownBlocks } from "../web/stream-body.mjs";

const e = (seq, type = "assistant.delta", sessionId = "s") => ({ seq, sessionId, runId: "r", type, data: {} });

test("events are admitted once by seq, in order, and the cursor never moves back", () => {
  const first = admitSessionEvents([], [e(2), e(1), e(2)], { sessionId: "s" });
  assert.deepEqual(first.events.map((x) => x.seq), [1, 2]);
  assert.deepEqual(first.admitted.map((x) => x.seq), [1, 2]);
  assert.equal(first.lastSeq, 2);
  const replay = admitSessionEvents(first.events, [e(1), e(2)], { sessionId: "s", lastSeq: first.lastSeq });
  assert.equal(replay.events, first.events, "a replayed page changes nothing");
  assert.deepEqual(replay.admitted, []);
  assert.equal(replay.lastSeq, 2);
  const other = admitSessionEvents(first.events, [e(3, "assistant.delta", "other")], { sessionId: "s", lastSeq: 2 });
  assert.deepEqual(other.admitted, [], "another Session's event is not admitted");
});

test("only a page of assistant deltas may patch bodies in place", () => {
  assert.equal(growsTextOnly([e(1), e(2)]), true);
  assert.equal(growsTextOnly([]), false);
  assert.equal(growsTextOnly([e(1), e(2, "assistant.message")]), false, "a final needs the full render");
  assert.equal(growsTextOnly([e(1, "tool.start")]), false);
  assert.equal(eventsAfterPath("a b", 7), "/sessions/a%20b/events?afterSeq=7");
});

test("Markdown blocks keep their exact source; an unclosed fence stays one open tail block", () => {
  const open = markdownBlocks("Intro line.\n\n```js\nconst a = 1;\n");
  assert.deepEqual(open, ["Intro line.", "\n\n", "```js\nconst a = 1;\n"]);
  const closed = markdownBlocks("Intro line.\n\n```js\nconst a = 1;\n```\n\n中文段落继续。");
  assert.deepEqual(closed.slice(0, 2), open.slice(0, 2), "earlier blocks are unchanged as the text grows");
  assert.equal(closed.join(""), "Intro line.\n\n```js\nconst a = 1;\n```\n\n中文段落继续。", "blocks cover the text exactly");
});
