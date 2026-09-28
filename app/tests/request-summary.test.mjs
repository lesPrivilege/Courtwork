/* 06b B2 · bounded repo_list request summary (contract:
 * engineering/execution/claude-frontend-harness-2026-09-16/06b-dogfood-friction-20260920.md,
 * "B2 bounded repo_list request summary", with the 2026-09-28 Luna
 * unsafe_display disposition). Synthetic data, loopback fake provider only. */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { RuntimeStore } from "./fixtures/executor-store.mjs";
import { boot, reopen } from "./helpers.mjs";
import { withTinyDom } from "./tiny-dom.mjs";
import {
  REQUEST_SUMMARY_RUN_LIMIT, admitRequestSummary, boundRequestSummary, isSoleBuiltinRepoList, summarizeRepoListArgs,
} from "../runtime/request-summary.mjs";
import { FAKE_CREDENTIAL_KEY, mapSessionEvent } from "../runtime/pi-session-runtime.mjs";
import { projectThread } from "../web/thread-projection.mjs";
import { renderToolRow } from "../web/run-rows.mjs";

const UNKNOWN_SENTINEL = "cw-b2-unknown-field-sentinel-5d1e";
const summary = (pathValue, truncated = false) => ({ version: 1, path: pathValue, truncated, omittedReason: null });
const omitted = reason => ({ version: 1, path: null, truncated: false, omittedReason: reason });

test("summarizeRepoListArgs: only path, the tool's default, invalid vs display-unsafe", () => {
  assert.deepEqual(summarizeRepoListArgs({}), summary("."), "absent path is the tool's own default");
  assert.deepEqual(summarizeRepoListArgs({ path: "src/app", token: UNKNOWN_SENTINEL, headers: { a: 1 } }), summary("src/app"), "unknown fields are omitted");
  assert.deepEqual(summarizeRepoListArgs({ path: "données/😀" }), summary("données/😀"));
  for (const args of [null, undefined, "src", ["src"], 7]) assert.deepEqual(summarizeRepoListArgs(args), omitted("invalid_path"), `non-object ${JSON.stringify(args)}`);
  for (const value of [null, 5, "", "/etc", "../x", "a/../b", "a//b", "./a", "a/.", "a\\b", "a\0b", "a".repeat(1001)]) {
    assert.deepEqual(summarizeRepoListArgs({ path: value }), omitted("invalid_path"), `invalid ${JSON.stringify(value)?.slice(0, 20)}`);
  }
  for (const value of ["a\u0001b", "a\nb", "a\u007fb", "a\u0085b", "a\ud800b"]) {
    assert.deepEqual(summarizeRepoListArgs({ path: value }), omitted("unsafe_display"), `display-unsafe ${JSON.stringify(value)}`);
  }
  assert.deepEqual(summarizeRepoListArgs({ path: "/a\u0001" }), omitted("invalid_path"), "a lexically invalid path stays invalid_path");
});

test("boundRequestSummary: 256 code points, 2048 bytes, closed shape", () => {
  const astral = "😀".repeat(300);
  const cut = boundRequestSummary(summary(astral));
  assert.equal(Array.from(cut.path).length, 256);
  assert.equal(cut.truncated, true);
  assert.ok(Buffer.byteLength(JSON.stringify(cut)) <= 2048);
  assert.equal(cut.path.isWellFormed(), true, "cut on a code point, never inside a surrogate pair");
  assert.deepEqual(boundRequestSummary(cut), cut, "idempotent");
  assert.deepEqual(boundRequestSummary(summary("a/b".padEnd(256, "c"))), summary("a/b".padEnd(256, "c")), "exactly 256 is not truncated");
  for (const bad of [
    null, [], { ...summary("a"), extra: 1 }, { ...summary("a"), version: 2 }, summary("/abs"), summary("../x"),
    summary("a\u0001"), { ...omitted("invalid_path"), path: "a" }, { ...omitted("run_limit"), truncated: true },
    omitted("other"), summary(null), { version: 1, path: "a", truncated: "no", omittedReason: null },
  ]) assert.equal(boundRequestSummary(bad), null, JSON.stringify(bad));
  assert.deepEqual(boundRequestSummary(summary("a/b/", true)), summary("a/b/", true), "a cut prefix may end mid-segment");
  assert.equal(boundRequestSummary(summary("../a", true)), null, "a cut prefix still keeps complete segments valid");
});

test("Pi mapper: repo_list start carries a candidate summary; other tools and updates/results carry none", () => {
  const start = mapSessionEvent({ type: "tool_execution_start", toolCallId: "c1", toolName: "repo_list", args: { path: "src", note: UNKNOWN_SENTINEL } });
  assert.deepEqual(start, { type: "tool.start", data: { callId: "c1", name: "repo_list", requestSummary: summary("src") } });
  const other = mapSessionEvent({ type: "tool_execution_start", toolCallId: "c2", toolName: "repo_read", args: { path: "a", note: UNKNOWN_SENTINEL } });
  assert.deepEqual(other, { type: "tool.start", data: { callId: "c2", name: "repo_read" } });
  const update = mapSessionEvent({ type: "tool_execution_update", toolCallId: "c1", toolName: "repo_list", args: { path: "src" }, partialResult: { content: [] } });
  const end = mapSessionEvent({ type: "tool_execution_end", toolCallId: "c1", toolName: "repo_list", result: { content: [{ type: "text", text: "ok" }] }, isError: false });
  assert.equal("requestSummary" in update.data, false);
  assert.equal("requestSummary" in end.data, false);
  assert.ok(!JSON.stringify([start, other, update, end]).includes(UNKNOWN_SENTINEL), "no raw argument snapshot");
  const argumentUpdate = mapSessionEvent({ type: "message_update", message: { role: "assistant", content: [] }, assistantMessageEvent: { type: "toolcall_delta" } });
  assert.equal(argumentUpdate, null, "argument-token updates stay unmapped");
});

test("Host eligibility: only the repository owner's own repo_list, and only when it is the sole one", () => {
  const builtin = { name: "repo_list", execute() {} };
  const alias = { ...builtin };
  const owner = [builtin, { name: "repo_read" }];
  assert.equal(isSoleBuiltinRepoList([builtin, { name: "ws_list" }], owner), true);
  assert.equal(isSoleBuiltinRepoList([alias], owner), false, "a same-named copy does not inherit eligibility");
  assert.equal(isSoleBuiltinRepoList([builtin, alias], owner), false, "a colliding extension/MCP name disables it");
  assert.equal(isSoleBuiltinRepoList([{ name: "ws_list" }], owner), false);
  assert.equal(isSoleBuiltinRepoList([builtin], []), false);
});

async function storeFixture() {
  const dataDir = await mkdtemp(path.join(tmpdir(), "cw-b2-store-"));
  const store = await new RuntimeStore({ dataDir }).open();
  const project = await store.createProject("p");
  const session = await store.createSession({ projectId: project.id, title: "s" });
  const { run } = await store.createRun({
    sessionId: session.id, input: "i", adapterId: "a",
    provider: { provider: "fake-openai-loopback", model: "fake-model", api: "openai-completions", realProvider: false },
    commandId: "c", credentialGeneration: 0,
  });
  return { dataDir, store, session, run };
}
const starts = (store, sessionId, runId) => store.listEvents({ sessionId, runId }).filter(event => event.type === "tool.start");

test("Store: first summary per call wins, including changed-input and concurrent replay; the event itself is kept", async () => {
  const { dataDir, store, session, run } = await storeFixture();
  try {
    await store.appendEvent({ runId: run.id, type: "tool.start", data: { callId: "c1", name: "repo_list", requestSummary: summary("src") } });
    await store.appendEvent({ runId: run.id, type: "tool.start", data: { callId: "c1", name: "repo_list", requestSummary: summary("other") } });
    await Promise.all([
      store.appendEvent({ runId: run.id, type: "tool.start", data: { callId: "c2", name: "repo_list", requestSummary: summary("one") } }),
      store.appendEvent({ runId: run.id, type: "tool.start", data: { callId: "c2", name: "repo_list", requestSummary: summary("two") } }),
    ]);
    const recorded = starts(store, session.id, run.id);
    assert.equal(recorded.length, 4, "no start fact is deduplicated");
    assert.deepEqual(recorded.map(event => event.data.requestSummary ?? null), [summary("src"), null, summary("one"), null]);
    await store.appendEvent({ runId: run.id, type: "tool.update", data: { callId: "c1", name: "repo_list", text: "", requestSummary: summary("late") } });
    await store.appendEvent({ runId: run.id, type: "tool.result", data: { callId: "c1", name: "repo_list", text: "ok", isError: false, requestSummary: summary("late") } });
    await store.appendEvent({ runId: run.id, type: "tool.start", data: { callId: "c3", name: "repo_read", requestSummary: summary("a") } });
    await store.appendEvent({ runId: run.id, type: "tool.start", data: { callId: "c4", name: "repo_list", requestSummary: { ...summary("/etc"), secret: UNKNOWN_SENTINEL } } });
    await store.appendEvent({ runId: run.id, type: "tool.start", data: { callId: "c5", name: "repo_list" } });
    const all = store.listEvents({ sessionId: session.id, runId: run.id });
    assert.equal(all.filter(event => event.data?.requestSummary).length, 2, "updates/results, other tools and invalid foreign data acquire nothing");
    assert.ok(all.some(event => event.type === "tool.start" && event.data.callId === "c4"), "an invalid summary does not drop its tool event");
    assert.ok(!JSON.stringify(all).includes(UNKNOWN_SENTINEL));
    await store.appendEvent({ runId: run.id, type: "tool.start", data: { callId: "c5", name: "repo_list", requestSummary: summary("after") } });
    assert.equal(starts(store, session.id, run.id).filter(event => event.data.callId === "c5").every(event => !event.data.requestSummary), true,
      "a first start without a summary is still the call's first start");
  } finally {
    await store.close();
    await rm(dataDir, { recursive: true, force: true });
  }
});

test("Store: at most 32 non-omitted summaries per Run, counted across Host restart; omissions do not spend the budget", async () => {
  const h = await boot();
  let reopened;
  try {
    const session = await h.createSession();
    const made = await h.api("POST", `/sessions/${session.id}/runs`, { commandId: "b2-budget", input: "hello" });
    const runId = made.json.run.id;
    await h.pollRun(runId, { timeoutMs: 15000 });
    const append = (store, data) => store.appendEvent({ runId, type: "tool.start", data });
    await append(h.runtime.store, { callId: "legacy", name: "repo_list" });
    for (let i = 0; i < 20; i += 1) await append(h.runtime.store, { callId: `a${i}`, name: "repo_list", requestSummary: summary(`p${i}`) });
    await append(h.runtime.store, { callId: "bad", name: "repo_list", requestSummary: omitted("invalid_path") });
    const before = JSON.stringify(starts(h.runtime.store, session.id, runId));
    await h.runtime.close();
    reopened = await reopen(h.dataDir);
    const store = reopened.runtime.store;
    assert.equal(JSON.stringify(starts(store, session.id, runId)), before, "restart reads the same events; nothing is backfilled");
    for (let i = 20; i < 34; i += 1) await append(store, { callId: `a${i}`, name: "repo_list", requestSummary: summary(`p${i}`) });
    const summaries = starts(store, session.id, runId).map(event => event.data.requestSummary).filter(Boolean);
    assert.equal(summaries.filter(value => value.omittedReason === null).length, REQUEST_SUMMARY_RUN_LIMIT);
    assert.deepEqual(summaries.slice(-2), [omitted("run_limit"), omitted("run_limit")]);
    assert.equal(starts(store, session.id, runId).find(event => event.data.callId === "legacy").data.requestSummary, undefined, "historical start unchanged");
  } finally {
    await (reopened?.runtime ?? h.runtime).close();
    await rm(h.dataDir, { recursive: true, force: true });
  }
});

test("admitRequestSummary leaves events without the field byte-identical", () => {
  const data = { callId: "x", name: "repo_list" };
  assert.equal(admitRequestSummary([], { runId: "r", type: "tool.start", data }), data);
});

test("Host: real Pi repo_list starts → redacted, bounded, persisted, reopened → shared Chat/Attention disclosure", async () => {
  const h = await boot();
  const root = await mkdtemp(path.join(tmpdir(), "cw-b2-repo-"));
  let reopened;
  try {
    await mkdir(path.join(root, "src"));
    await writeFile(path.join(root, "src", "a.txt"), "synthetic\n");
    const session = await h.createSession();
    const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, { operation: "bind", requestId: "b2-bind", expectedRevision: 0, rootPath: root });
    assert.equal(bound.status, 200, JSON.stringify(bound.json));
    const longPath = "src/" + "é".repeat(300);
    const calls = [
      { name: "repo_list", arguments: {} },
      { name: "repo_list", arguments: { path: "src", note: UNKNOWN_SENTINEL } },
      { name: "repo_list", arguments: { path: `src/${FAKE_CREDENTIAL_KEY}` } },
      { name: "repo_list", arguments: { path: "../outside" } },
      { name: "repo_list", arguments: { path: "src/a\u0001b" } },
      { name: "repo_list", arguments: { path: longPath } },
      { name: "repo_list", arguments: { path: 7 } },
      { name: "repo_read", arguments: { path: "src/a.txt", note: UNKNOWN_SENTINEL } },
    ];
    const made = await h.api("POST", `/sessions/${session.id}/runs`, { commandId: "b2-host", input: h.scriptInput(calls) });
    assert.equal(made.status, 200, JSON.stringify(made.json));
    const run = await h.pollRun(made.json.run.id, { timeoutMs: 20000 });
    assert.equal(run.status, "completed", JSON.stringify(run.error));
    const read = async api => (await api("GET", `/sessions/${session.id}/events`)).json.events.filter(event => event.runId === run.id);
    const events = await read(h.api);
    const listStarts = events.filter(event => event.type === "tool.start" && event.data.name === "repo_list");
    assert.deepEqual(listStarts.map(event => event.data.requestSummary), [
      summary("."), summary("src"), summary("src/[redacted]"), omitted("invalid_path"), omitted("unsafe_display"),
      summary(Array.from(longPath).slice(0, 256).join(""), true), omitted("invalid_path"),
    ]);
    assert.equal(events.find(event => event.type === "tool.start" && event.data.name === "repo_read").data.requestSummary, undefined);
    assert.ok(events.filter(event => event.type !== "tool.start").every(event => !("requestSummary" in (event.data ?? {}))), "updates/results carry none");
    // The sentinel is typed only in the fixture script, i.e. the user's own input.
    assert.ok(!JSON.stringify(events.filter(event => event.type !== "user.message")).includes(UNKNOWN_SENTINEL), "no raw argument or unknown field is journaled");
    assert.ok(!JSON.stringify(listStarts).includes(FAKE_CREDENTIAL_KEY), "known secret redacted in the summary");
    assert.ok(events.some(event => event.type === "tool.result" && event.data.name === "repo_list" && event.data.isError), "failed calls keep their start summary");

    await h.runtime.close();
    reopened = await reopen(h.dataDir);
    const again = await read(reopened.api);
    assert.deepEqual(again, events, "the persisted journal reopens unchanged");

    const runs = (await reopened.api("GET", `/sessions/${session.id}`)).json.runs ?? [run];
    const rows = projectThread(again, runs, session.id).rows.filter(row => row.kind === "tool" && row.name === "repo_list");
    assert.equal(rows.length, 7);
    withTinyDom(() => {
      const texts = rows.map(row => {
        const block = renderToolRow(row, { toolState: "Done", open: true, onToggle() {} }).querySelector(".tool-detail-block");
        assert.equal(block.querySelector("h4").textContent, "Request summary");
        return block.querySelectorAll("dd").map(node => node.textContent);
      });
      assert.deepEqual(texts[0], ["."]);
      assert.deepEqual(texts[2], ["src/[redacted]"]);
      assert.match(texts[3][0], /^Not shown: the requested path is not a valid/);
      assert.match(texts[4][0], /^Not shown in this summary: .*does not mean the tool rejected it/);
      assert.deepEqual(texts[5].slice(1), ["Beginning only; the requested path is longer"]);
      assert.ok(texts.flat().every(text => text !== "null"), "null never renders as a path");
    });
  } finally {
    await (reopened?.runtime ?? h.runtime).close();
    await rm(h.dataDir, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});

test("Host: a cancelled Run keeps its start summary; an untrusted port observation carries none", async () => {
  const h = await boot();
  const root = await mkdtemp(path.join(tmpdir(), "cw-b2-cancel-"));
  try {
    const session = await h.createSession();
    const bound = await h.api("PUT", `/sessions/${session.id}/repository-binding`, { operation: "bind", requestId: "b2-bind-c", expectedRevision: 0, rootPath: root });
    assert.equal(bound.status, 200, JSON.stringify(bound.json));
    const made = await h.api("POST", `/sessions/${session.id}/runs`, {
      commandId: "b2-cancel", input: h.scriptInput([{ name: "repo_list", arguments: { path: "." } }, { name: "ask_user", arguments: { prompt: "wait" } }]),
    });
    await h.pollRun(made.json.run.id, { until: status => status === "waiting_user", timeoutMs: 15000 });
    assert.equal((await h.api("POST", `/runs/${made.json.run.id}/cancel`, {})).status < 300, true);
    const cancelled = await h.pollRun(made.json.run.id, { timeoutMs: 15000 });
    assert.equal(cancelled.status, "cancelled");
    const events = (await h.api("GET", `/sessions/${session.id}/events`)).json.events.filter(event => event.runId === made.json.run.id);
    assert.deepEqual(events.find(event => event.type === "tool.start" && event.data.name === "repo_list").data.requestSummary, summary("."));

    // A session without a repository binding does not expose repo_list: a
    // port observation claiming a summary is kept as a start without it.
    const plain = await h.createSession();
    const real = h.runtime.service.runtimePort;
    h.runtime.service.runtimePort = { ...real, openSession(input) {
      const native = real.openSession(input);
      return { ...native, start(options) {
        return native.start({ ...options, async onObservation(observation) {
          if (observation.type === "assistant.message") await options.onObservation({ type: "tool.start", data: { callId: "forged", name: "repo_list", requestSummary: summary("forged") } });
          return options.onObservation(observation);
        } });
      } };
    } };
    const other = await h.api("POST", `/sessions/${plain.id}/runs`, { commandId: "b2-forged", input: "hello" });
    await h.pollRun(other.json.run.id, { timeoutMs: 15000 });
    h.runtime.service.runtimePort = real;
    const forged = (await h.api("GET", `/sessions/${plain.id}/events`)).json.events.find(event => event.type === "tool.start" && event.data.callId === "forged");
    assert.ok(forged, "the underlying start fact is kept");
    assert.equal(forged.data.requestSummary, undefined);
  } finally {
    await h.runtime.close();
    await rm(h.dataDir, { recursive: true, force: true });
    await rm(root, { recursive: true, force: true });
  }
});

test("projection: old events show no summary, malformed ones are ignored, the first start's summary stays", () => {
  const ev = (seq, type, data) => ({ seq, runId: "r", sessionId: "s", type, data });
  const rows = projectThread([
    ev(1, "tool.start", { callId: "old", name: "repo_list" }),
    ev(2, "tool.start", { callId: "bad", name: "repo_list", requestSummary: { version: 2, path: "x", truncated: false, omittedReason: null } }),
    ev(3, "tool.start", { callId: "c", name: "repo_list", requestSummary: summary("src") }),
    ev(4, "tool.start", { callId: "c", name: "repo_list", requestSummary: summary("replaced") }),
    ev(5, "tool.result", { callId: "c", name: "repo_list", text: "listing", isError: false }),
  ], [{ id: "r", sessionId: "s", status: "completed" }], "s").rows.filter(row => row.kind === "tool");
  assert.deepEqual(rows.map(row => row.requestSummary), [undefined, undefined, { path: "src", truncated: false, omittedReason: null }]);
  withTinyDom(() => {
    const block = renderToolRow(rows[2], { toolState: "Done", open: true, onToggle() {} }).querySelector(".tool-detail-block");
    assert.deepEqual(block.querySelectorAll("h4").map(node => node.textContent), ["Request summary", "Result"], "the result detail stays");
    const legacy = renderToolRow(rows[0], { toolState: "Done", open: true, onToggle() {} }).querySelector(".tool-detail-block");
    assert.equal(legacy.querySelectorAll("h4").some(node => node.textContent === "Request summary"), false);
  });
});
