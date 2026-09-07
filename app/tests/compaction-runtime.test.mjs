import assert from "node:assert/strict";
import { test } from "node:test";
import path from "node:path";
import { SessionManager } from "@earendil-works/pi-coding-agent";
import { boot } from "./helpers.mjs";

const CONTEXT_WINDOW = 4;
const CURRENT_INPUT = "CURRENT_COMPACTION_INPUT";

function usage(totalTokens) {
  return {
    input: 1,
    output: 1,
    cacheRead: 0,
    cacheWrite: 0,
    totalTokens,
    cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
  };
}

function messageText(message) {
  if (typeof message?.content === "string") return message.content;
  return (message?.content ?? []).map((part) => part?.text ?? "").join("");
}

function isSummaryRequest(body) {
  return (body?.messages ?? []).some((message) => (
    message.role === "user" && messageText(message).startsWith("<conversation>")
  ));
}

async function seedHistory({ dataDir, runtime, session }) {
  const sessionDir = path.join(dataDir, "pi-sessions", session.id);
  const manager = SessionManager.create(session.workspaceDir, sessionDir, { id: `seed-${session.id}` });
  manager.appendMessage({
    role: "user",
    content: [{ type: "text", text: "SEED_USER " + "x".repeat(500) }],
    timestamp: Date.now(),
  });
  manager.appendMessage({
    role: "assistant",
    content: [{ type: "text", text: "SEED_ASSISTANT " + "y".repeat(500) }],
    api: "openai-completions",
    provider: "fake-openai-loopback",
    model: "fake-model",
    usage: usage(4),
    stopReason: "stop",
    timestamp: Date.now(),
  });
  await runtime.store.setHostSession(session.id, { id: manager.getSessionId(), path: manager.getSessionFile() });
  return manager;
}

async function setup({ maxCompactions = 4, reserveTokens = 1, responseFactory }) {
  const requests = [];
  const h = await boot({
    compaction: {
      enabled: true,
      reserveTokens,
      keepRecentTokens: 1,
      maxCompactions,
    },
    fakeResponder: (args) => {
      const summary = isSummaryRequest(args.body);
      const userTexts = (args.body?.messages ?? [])
        .filter((message) => message.role === "user")
        .map(messageText);
      requests.push({ requestNumber: args.requestNumber, summary, userTexts });
      return responseFactory({ ...args, summary, userTexts });
    },
  });
  // Shrink the fake model's context window only in this test injection. The
  // normal provider/model contract remains untouched while the native SDK's
  // threshold path becomes deterministic and fast.
  h.runtime.fakeProvider.model.contextWindow = CONTEXT_WINDOW;
  const session = await h.createSession();
  const manager = await seedHistory({ dataDir: h.dataDir, runtime: h.runtime, session });
  return { ...h, session, manager, requests };
}

function textResponse(requestNumber, text) {
  return { kind: "text", id: `compaction-fixture-${requestNumber}`, created: 1, text };
}

function noticesFor(events, kind) {
  return events.filter((event) => event.type === "run.notice" && (!kind || event.data.kind === kind));
}

async function startRun(h, commandId) {
  const created = await h.api("POST", `/sessions/${h.session.id}/runs`, {
    input: CURRENT_INPUT,
    commandId,
  });
  assert.equal(created.status, 200);
  const run = await h.pollRun(created.json.run.id, { timeoutMs: 10000 });
  const events = (await h.api("GET", `/sessions/${h.session.id}/events`)).json.events;
  return { run, events };
}

test("automatic threshold persists a summary and sends it in the next request", async () => {
  const h = await setup({
    reserveTokens: 1,
    responseFactory: ({ requestNumber, summary }) => textResponse(requestNumber, summary ? "SUMMARY_OK" : "NORMAL_OK"),
  });
  try {
    const { run, events } = await startRun(h, "compaction-threshold");
    assert.equal(run.status, "completed");
    assert.deepEqual(run.usage, { input: 2, output: 2, cacheRead: 0, cacheWrite: 0, turns: 1, missing: false });

    const summaryRequests = h.requests.filter((request) => request.summary);
    assert.equal(summaryRequests.length, 1, "the threshold should issue one native summary request");
    const normalRequest = h.requests.find((request) => request.userTexts.includes(CURRENT_INPUT));
    assert.ok(normalRequest, "the ordinary request must follow compaction");
    assert.ok(normalRequest.userTexts.some((text) => text.includes("SUMMARY_OK")), "the ordinary request must use the persisted summary context");

    const reopened = SessionManager.open(h.manager.getSessionFile());
    const compactions = reopened.getEntries().filter((entry) => entry.type === "compaction");
    assert.equal(compactions.length, 1, "successful compaction must append one journal entry");
    assert.match(compactions[0].summary, /SUMMARY_OK/);
    assert.equal(compactions[0].usage.input, 1);
    assert.equal(compactions[0].usage.output, 1);
    assert.deepEqual(noticesFor(events, "compaction_end")[0].data, {
      kind: "compaction_end",
      reason: "threshold",
      aborted: false,
      willRetry: false,
      outcome: "completed",
    });
  } finally {
    await h.runtime.close();
  }
});

test("failed summary leaves the journal unchanged and marks run usage missing", async () => {
  const h = await setup({
    reserveTokens: 1,
    responseFactory: ({ requestNumber, summary }) => summary
      ? { kind: "http-error", status: 400, message: "summary fixture rejected" }
      : textResponse(requestNumber, "NORMAL_AFTER_FAILURE"),
  });
  try {
    const { run, events } = await startRun(h, "compaction-failure");
    assert.equal(run.status, "completed");
    assert.deepEqual(run.usage, { input: 1, output: 1, cacheRead: 0, cacheWrite: 0, turns: 1, missing: true });
    assert.equal(h.requests.filter((request) => request.summary).length, 1);
    assert.equal(h.requests.filter((request) => request.userTexts.includes(CURRENT_INPUT)).length, 1);

    const reopened = SessionManager.open(h.manager.getSessionFile());
    assert.equal(reopened.getEntries().filter((entry) => entry.type === "compaction").length, 0, "failed summary must not append a compaction entry");
    const failedNotice = noticesFor(events, "compaction_end")[0];
    assert.deepEqual(failedNotice.data, {
      kind: "compaction_end",
      reason: "threshold",
      aborted: false,
      willRetry: false,
      outcome: "failed",
      code: "compaction_failed",
    });
    assert.doesNotMatch(JSON.stringify(noticesFor(events)), /summary fixture rejected/);
  } finally {
    await h.runtime.close();
  }
});

test("native summary retry succeeds but usage stays missing and counts only reported values", async () => {
  let summaryAttempts = 0;
  const h = await setup({
    reserveTokens: 1,
    responseFactory: ({ requestNumber, summary }) => {
      if (!summary) return textResponse(requestNumber, "NORMAL_AFTER_RETRY");
      summaryAttempts += 1;
      if (summaryAttempts === 1) return { kind: "http-error", status: 502, message: "transient summary fixture" };
      return textResponse(requestNumber, "SUMMARY_RETRY_OK");
    },
  });
  try {
    const { run, events } = await startRun(h, "compaction-retry");
    assert.equal(run.status, "completed");
    assert.equal(summaryAttempts, 2, "the SDK must retry the transient summary request once");
    assert.deepEqual(run.usage, { input: 2, output: 2, cacheRead: 0, cacheWrite: 0, turns: 1, missing: true });
    assert.equal(h.requests.filter((request) => request.summary).length, 2);
    assert.equal(h.requests.filter((request) => request.userTexts.includes(CURRENT_INPUT)).length, 1);

    const reopened = SessionManager.open(h.manager.getSessionFile());
    const compactions = reopened.getEntries().filter((entry) => entry.type === "compaction");
    assert.equal(compactions.length, 1);
    assert.match(compactions[0].summary, /SUMMARY_RETRY_OK/);
    assert.equal(compactions[0].usage.input, 1, "only the successful summary response contributes input usage");
    assert.equal(compactions[0].usage.output, 1, "only the successful summary response contributes output usage");
    assert.equal(noticesFor(events, "summarization_retry").length, 1);
    assert.ok(noticesFor(events, "compaction_end").some((event) => event.data.outcome === "completed"));
    assert.doesNotMatch(JSON.stringify(noticesFor(events)), /transient summary fixture/);
  } finally {
    await h.runtime.close();
  }
});

test("maxCompactions disables later automatic summaries while the ordinary turn completes", async () => {
  const h = await setup({
    maxCompactions: 1,
    reserveTokens: 3,
    responseFactory: ({ requestNumber, summary }) => textResponse(requestNumber, summary ? "SUMMARY_LIMIT_OK" : "NORMAL_AFTER_LIMIT"),
  });
  try {
    const { run, events } = await startRun(h, "compaction-limit");
    assert.equal(run.status, "completed", "the compaction limit must not cancel a healthy run");
    assert.equal(run.usage.turns, 1, "ordinary turn accounting continues after the limit");
    assert.equal(run.usage.missing, false);
    assert.equal(h.requests.filter((request) => request.summary).length, 1, "no later summary request may run after the first compaction");
    assert.equal(h.requests.filter((request) => request.userTexts.includes(CURRENT_INPUT)).length, 1);
    assert.equal(noticesFor(events, "compaction_start").length, 1);
    assert.deepEqual(noticesFor(events, "compaction_limit_reached")[0].data, { kind: "compaction_limit_reached", limit: 1 });
    assert.equal(noticesFor(events, "compaction_end").length, 1);

    const reopened = SessionManager.open(h.manager.getSessionFile());
    assert.equal(reopened.getEntries().filter((entry) => entry.type === "compaction").length, 1);
  } finally {
    await h.runtime.close();
  }
});
