/* 06b B2 · the Host-level half of the bounded repo_list request summary tests:
 * these boot the real Host, which listens on loopback, so they run in the
 * developer/CI suite and not in the sandboxed check recipe. The offline half
 * is request-summary.test.mjs. */
import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { boot, reopen } from "./helpers.mjs";
import { withTinyDom } from "./tiny-dom.mjs";
import { REQUEST_SUMMARY_RUN_LIMIT } from "../runtime/request-summary.mjs";
import { FAKE_CREDENTIAL_KEY } from "../runtime/pi-session-runtime.mjs";
import { projectThread } from "../web/thread-projection.mjs";
import { renderToolRow } from "../web/run-rows.mjs";

const UNKNOWN_SENTINEL = "cw-b2-unknown-field-sentinel-5d1e";
const summary = (pathValue, truncated = false) => ({ version: 1, path: pathValue, truncated, omittedReason: null });
const omitted = reason => ({ version: 1, path: null, truncated: false, omittedReason: reason });
const starts = (store, sessionId, runId) => store.listEvents({ sessionId, runId }).filter(event => event.type === "tool.start");

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
