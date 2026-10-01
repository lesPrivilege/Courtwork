/* Review F2 (commit 7e8e253 review, 2026-10-01): the Attention assistant must
 * not offer Approve on less than the Chat card shows. Both surfaces render the
 * one shared approval basis (app/web/approval-basis.mjs): recipe, command and
 * arguments, the candidate and its write revision, and the files the model
 * wrote into it (app/docs/check-recipes.md, "Approval"). Nothing is executed. */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { withTinyDom } from "./tiny-dom.mjs";
import { openApprovalBasis, recordedApprovalBasis, runBinding } from "../web/approval-basis.mjs";
import { renderAttentionApproval } from "../web/attention-agent-view.mjs";

const SHA = (letter) => letter.repeat(64);
const CHECK = {
  tool: "check_run", toolCallId: "call-1", path: "check:node-test", bytes: 23, contentSha256: SHA("f"),
  preview: '{"recipeId":"node-test"}',
  recipeId: "node-test", recipeVersion: 3, command: "/opt/tools/bin/node", argv: ["--test", "--test-reporter=spec", "tests/"],
  cwd: "private candidate", candidateId: "cand-7f3a", candidateWriteRevision: 2,
  timeoutMs: 120000, outputLimitBytes: 65536, env: "minimal",
};
const WRITE = { tool: "ws_write", toolCallId: "call-2", path: "notes/plan.md", bytes: 12, contentSha256: SHA("a"), preview: "hello plan\n" };
const EVENTS = [
  { seq: 1, runId: "r1", type: "runtime.bound", data: { resources: [{ id: "tool:check_run" }, { id: "tool:ws_write" }] } },
  { seq: 2, runId: "r1", type: "repository.write.confirmed", data: { candidateId: "cand-7f3a", path: "src/sum.mjs", contentSha256: SHA("b"), bytes: 1, writeRevision: 1 } },
  { seq: 3, runId: "r1", type: "repository.write.confirmed", data: { candidateId: "cand-7f3a", path: "tests/sum.test.mjs", contentSha256: SHA("c"), bytes: 1, writeRevision: 2 } },
  { seq: 4, runId: "r1", type: "repository.write.confirmed", data: { candidateId: "cand-7f3a", path: "after-the-request.mjs", contentSha256: SHA("d"), bytes: 1, writeRevision: 3 } },
];
const RUN = { id: "r1", status: "waiting_user" };
const row = (payload, extra = {}) => ({ kind: "permission", id: "q1", runId: "r1", prompt: "Approval needed", questionStatus: "pending", payload, ...extra });
const text = (nodes) => nodes.map((node) => node.textContent).join("");
const buttons = (nodes) => nodes.filter((node) => node.tagName === "button").map((node) => node.textContent);
// The Chat card appends exactly these nodes (pinned on the source below).
const chatOpen = (payload) => openApprovalBasis(payload, EVENTS, runBinding(EVENTS, "r1")).nodes;
const attention = (item, options = {}) => renderAttentionApproval(item, { run: RUN, events: EVENTS, onAnswer: () => {}, ...options });
const basisOf = (nodes) => nodes.find((node) => node.classList?.contains("attention-approval-basis"));

const CHECK_FACTS = ["node-test v3", "node", "--test", "--test-reporter=spec", "tests/", "cand-7f3a", "Write revision2", "src/sum.mjs", "tests/sum.test.mjs", SHA("b").slice(0, 12), SHA("c").slice(0, 12), "120 s", "64 KiB per stream"];

test("a check approval shows the same basis in the Chat card and in the Attention assistant", () => withTinyDom(() => {
  const chat = text(chatOpen(CHECK));
  const nodes = attention(row(CHECK));
  const popover = basisOf(nodes).textContent;
  for (const fact of CHECK_FACTS) {
    assert.ok(chat.includes(fact), `Chat card states ${fact}`);
    assert.ok(popover.includes(fact), `Attention assistant states ${fact}`);
  }
  assert.equal(popover, chat, "one presentation, two surfaces");
  assert.ok(!chat.includes("after-the-request.mjs"), "a write after the bound revision is not part of this approval");
  assert.deepEqual(buttons(nodes), ["Deny", "Approve this action"]);
}));

test("the Attention assistant answers with the surface's own wiring", () => withTinyDom(() => {
  const answered = [];
  const nodes = attention(row(CHECK), { onAnswer: (decision) => answered.push(decision) });
  nodes.find((node) => node.textContent === "Approve this action").click();
  nodes.find((node) => node.textContent === "Deny").click();
  assert.deepEqual(answered, ["allow", "deny"]);
  const held = attention(row(CHECK), { disabled: true, onAnswer: (decision) => answered.push(decision) });
  for (const node of held.filter((item) => item.tagName === "button")) node.click();
  assert.deepEqual(answered, ["allow", "deny"], "a busy or unread conversation takes no answer");
}));

test("a file write approval is the same basis on both surfaces", () => withTinyDom(() => {
  const chat = text(chatOpen(WRITE));
  const nodes = attention(row(WRITE));
  for (const fact of ["Approve this file write?", "notes/plan.md", "12 B", "Approval for this exact write only", "hello plan", SHA("a")])
    assert.ok(chat.includes(fact), `Chat card states ${fact}`);
  assert.equal(basisOf(nodes).textContent, chat);
  assert.ok(!chat.includes("the model wrote"), "the authored-files list belongs to checks only");
  assert.deepEqual(buttons(nodes), ["Deny", "Approve this action"]);
}));

test("no Approve without the basis: an invalid payload, or a basis that cannot be built", () => withTinyDom(() => {
  const unavailable = "Permission details are unavailable. Open the full conversation to inspect this request.";
  const invalid = attention(row({ ...CHECK, contentSha256: "not-a-hash" }));
  assert.deepEqual(buttons(invalid), []);
  assert.ok(text(invalid).includes(unavailable));
  // A valid envelope whose presentation throws while it is being built.
  const hostile = { ...CHECK, get argv() { throw new Error("unreadable"); } };
  const failed = attention(row(hostile));
  assert.deepEqual(buttons(failed), []);
  assert.ok(text(failed).includes(unavailable));
  assert.equal(basisOf(failed), undefined);
}));

test("a decided approval reads back what was recorded, the same on both surfaces", () => withTinyDom(() => {
  const settled = row(CHECK, { questionStatus: "answered", decision: "allow" });
  const chat = recordedApprovalBasis(CHECK, EVENTS, runBinding(EVENTS, "r1"), "allow");
  const nodes = attention(settled, { run: { id: "r1", status: "completed" } });
  const record = basisOf(nodes);
  assert.equal(chat.meta, "Check approved");
  assert.equal(record.children[0].textContent, "node-test v3 · Check approved");
  assert.equal(text(record.children.slice(1)), text(chat.nodes));
  for (const fact of ["Approval recorded for this exact check.", "--test-reporter=spec", "cand-7f3a", "src/sum.mjs", "tests/sum.test.mjs", "As recorded when this approval was requested."])
    assert.ok(record.textContent.includes(fact), `the record states ${fact}`);
  // R30-2 · nothing live-only is added to a decided record.
  assert.ok(!record.textContent.includes("Approval for this exact check only"));
  assert.deepEqual(buttons(nodes), []);
  assert.equal(record.open, false);
  assert.equal(basisOf(attention(settled, { run: { id: "r1", status: "completed" }, expanded: new Set(["q1"]) })).open, true);
}));

test("both surfaces take the basis from the shared module and nowhere else", () => {
  const app = readFileSync(new URL("../web/app.mjs", import.meta.url), "utf8");
  const render = app.slice(app.indexOf("function renderPermission("), app.indexOf("\nfunction ", app.indexOf("function renderPermission(") + 1));
  assert.match(render, /const \{ display, nodes \} = openApprovalBasis\(payload, state\.events, binding\);\s*card\.append\(\.\.\.nodes\);/);
  assert.match(render, /const \{ display, meta, nodes \} = recordedApprovalBasis\(payload, state\.events, binding, row\.decision\);/);
  assert.doesNotMatch(render, /permission-preview|permissionPresentation|candidateAuthoredFiles/, "the Chat card keeps no second copy of the body");
  const view = readFileSync(new URL("../web/attention-agent-view.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(view, /payload\.preview|payload\.contentSha256/, "the Attention assistant keeps no summary of its own");
  assert.match(view, /block\.append\(\.\.\.renderAttentionApproval\(row, \{/);
});
