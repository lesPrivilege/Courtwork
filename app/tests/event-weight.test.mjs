import assert from "node:assert/strict";
import { test } from "node:test";

import { projectThread } from "../web/thread-projection.mjs";
import { projectExecutionDisclosures } from "../web/execution-disclosure.mjs";
import { noticeText } from "../web/inspector.mjs";

/* GUI grammar G2 · UX-10 event weight under a burst. One Run records a
 * hundred successful tool calls around one failure, one pending permission,
 * one produced file and a paired runtime notice. Ordinary progress collapses;
 * whatever needs a person, failed, or produced something stays its own row. */
const HASH = "b".repeat(64);
function burst() {
  const events = [];
  let seq = 0;
  const push = (type, data) => events.push({ seq: ++seq, sessionId: "s", runId: "r", type, data });
  push("message/user", { text: "Refresh the sources" });
  for (let i = 0; i < 100; i++) {
    push("tool/start", { callId: `ok-${i}`, name: "ws_read" });
    if (i === 40) {
      push("run/notice", { kind: "compaction_start" });
      push("run/notice", { kind: "compaction_end", outcome: "finished" });
    }
    push("tool/result", { callId: `ok-${i}`, name: "ws_read", result: "ok" });
  }
  push("tool/start", { callId: "bad", name: "ws_read" });
  push("tool/result", { callId: "bad", name: "ws_read", error: "ENOENT", isError: true });
  push("artifact/written", { kind: "content-version", path: "notes/summary.md", sha256: HASH });
  push("permission/open", { id: "perm-1", toolCallId: "write-1", tool: "ws_write", path: "notes/summary.md", bytes: 10, contentSha256: HASH, preview: "x" });
  return events;
}

test("a burst keeps failure, pending permission and artifact individually visible while successes group", () => {
  const { rows, statuses } = projectThread(burst(), [{ id: "r", sessionId: "s", status: "waiting_user" }], "s");
  const { plans, members } = projectExecutionDisclosures(rows, statuses);
  assert.equal(plans.size, 1);
  assert.equal(plans.get("r").callCount, 100);
  const failed = rows.find((row) => row.kind === "tool" && row.callId === "bad");
  const permission = rows.find((row) => row.kind === "permission");
  const artifact = rows.find((row) => row.kind === "artifact");
  assert.equal(failed.isError, true);
  assert.equal(permission.questionStatus, "pending");
  assert.equal(artifact.file.path, "notes/summary.md");
  for (const row of [failed, permission, artifact])
    assert.equal(members.has(row), false, `${row.kind} must not hide inside the success group`);
  assert.equal(rows.filter((row) => row.kind === "run-status").length, 1, "one state line per Run");
});

test("a paired runtime notice leaves only its outcome", () => {
  const { rows } = projectThread(burst(), [{ id: "r", sessionId: "s", status: "running" }], "s");
  const notices = rows.filter((row) => row.kind === "notice");
  assert.equal(notices.length, 1);
  assert.equal(noticeText(notices[0].data), "Conversation summary finished.");
  const open = projectThread(burst().filter((event) => event.data?.kind !== "compaction_end"), [], "s").rows.filter((row) => row.kind === "notice");
  assert.equal(open.length, 1, "a start without its end still reads as the current state");
  assert.equal(noticeText(open[0].data), "Summarizing conversation history.");
});
