import assert from "node:assert/strict";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import { boot } from "./helpers.mjs";

function assertContiguous(events, fromSeq) {
  let expected = fromSeq + 1;
  for (const event of events) {
    assert.equal(event.seq, expected, `event sequence must be contiguous with no gaps (expected ${expected}, saw ${event.seq})`);
    expected += 1;
  }
}

// T-SYNC-1: a cursor beyond the server's high-water mark is an error, not an
// empty page. An empty 200 would let a client poll forever against a stream
// it can never rejoin; the 400 names the current nextSeq so it can re-snapshot.
test("T-SYNC-1: afterSeq past the server's last seq is 400 cursor_ahead and reports nextSeq", async () => {
  const { runtime, api, createSession, pollRun } = await boot();
  try {
    const session = await createSession();
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: "hello", commandId: "cmd-1" });
    await pollRun(created.json.run.id);

    const snapshot = await api("GET", `/sessions/${session.id}`);
    const lastSeq = snapshot.json.lastSeq;
    assert.ok(lastSeq > 0);

    const ahead = await api("GET", `/sessions/${session.id}/events?afterSeq=${lastSeq + 1}`);
    assert.equal(ahead.status, 400);
    assert.equal(ahead.json.error.code, "cursor_ahead");
    assert.equal(ahead.json.error.nextSeq, lastSeq, "the error must carry the cursor the client should resume from");

    // The documented recovery: refetch the snapshot, then resume from its
    // lastSeq. That has to work immediately.
    const recovered = await api("GET", `/sessions/${session.id}`);
    const resumed = await api("GET", `/sessions/${session.id}/events?afterSeq=${recovered.json.lastSeq}`);
    assert.equal(resumed.status, 200);
    assert.deepEqual(resumed.json.events, []);
    assert.equal(resumed.json.nextSeq, recovered.json.lastSeq);

    // A cursor exactly at the mark is valid; only past it is not.
    assert.equal((await api("GET", `/sessions/${session.id}/events?afterSeq=${lastSeq}`)).status, 200);
    assert.equal((await api("GET", `/sessions/${session.id}/events?afterSeq=-1`)).json.error.code, "invalid_cursor");
  } finally {
    await runtime.close();
  }
});

// T-SYNC-2: repeating the same request is a pure read — the same page comes
// back byte for byte, and the underlying sequence stays strictly increasing
// and gap-free.
test("T-SYNC-2: repeating a request for the same seq is idempotent and the sequence has no gaps", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  try {
    const session = await createSession();
    const calls = [
      { name: "ws_write", arguments: { path: "out/a.md", text: "a" } },
      { name: "ws_write", arguments: { path: "out/b.md", text: "b" } },
    ];
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    await pollRun(created.json.run.id);

    const all = (await api("GET", `/sessions/${session.id}/events`)).json.events;
    assert.ok(all.length > 4);
    assertContiguous(all, 0);

    for (const cursor of [0, 1, Math.floor(all.length / 2), all.length - 1]) {
      const first = await api("GET", `/sessions/${session.id}/events?afterSeq=${cursor}`);
      const second = await api("GET", `/sessions/${session.id}/events?afterSeq=${cursor}`);
      const third = await api("GET", `/sessions/${session.id}/events?afterSeq=${cursor}`);
      assert.deepEqual(second.json, first.json, "re-requesting a page must return the identical page");
      assert.deepEqual(third.json, first.json);
      assertContiguous(first.json.events, cursor);
      assert.equal(first.json.nextSeq, all.length);
    }

    // Re-reading never advances anything server-side.
    assert.equal((await api("GET", `/sessions/${session.id}`)).json.lastSeq, all.length);
  } finally {
    await runtime.close();
  }
});

// T-SYNC-3: the snapshot/stream boundary under concurrent writes. Fifty times,
// while a run is actively producing events, take a snapshot and immediately
// resume from its lastSeq: the two halves must join with no missing and no
// duplicated event.
test("T-SYNC-3: snapshot lastSeq joins the event stream with no gap and no overlap, 50x under concurrent writes", async () => {
  const { runtime, api, createSession, pollRun, scriptInput } = await boot();
  let releaseWrite;
  try {
    // Hold one real runtime event until the first snapshot is captured. This
    // guarantees a boundary crossing without depending on scheduler speed.
    let reachedWrite, committedWrite;
    const reached = new Promise(resolve => { reachedWrite = resolve; });
    const committed = new Promise(resolve => { committedWrite = resolve; });
    const gate = new Promise(resolve => { releaseWrite = resolve; });
    const append = runtime.store.appendEvent.bind(runtime.store);
    let firstWrite = true;
    runtime.store.appendEvent = async input => {
      if (!firstWrite) return append(input);
      firstWrite = false;
      reachedWrite();
      await gate;
      const event = await append(input);
      committedWrite();
      return event;
    };
    const session = await createSession();
    const calls = Array.from({ length: 14 }, (_, i) => ({ name: "ws_write", arguments: { path: `out/f${i}.md`, text: `body ${i}` } }));
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: scriptInput(calls), commandId: "cmd-1" });
    const runId = created.json.run.id;

    await reached;
    let sawGrowth = 0;
    for (let i = 0; i < 50; i += 1) {
      const snapshot = await api("GET", `/sessions/${session.id}`);
      const { events: snapshotEvents, lastSeq } = snapshot.json;
      assert.equal(snapshotEvents.at(-1)?.seq ?? 0, lastSeq, "lastSeq must be the newest event in this very snapshot");
      assertContiguous(snapshotEvents, 0);

      if (i === 0) { releaseWrite(); await committed; }
      const tail = await api("GET", `/sessions/${session.id}/events?afterSeq=${lastSeq}`);
      assert.equal(tail.status, 200, "a cursor taken from a snapshot is never ahead of the server");
      assertContiguous(tail.json.events, lastSeq);
      if (tail.json.events.length) sawGrowth += 1;

      const joined = [...snapshotEvents, ...tail.json.events];
      const seqs = joined.map((e) => e.seq);
      assert.deepEqual(seqs, [...new Set(seqs)], "no event may appear on both sides of the boundary");
      assertContiguous(joined, 0);

      // The joined view must equal a single read of everything taken after it.
      const whole = (await api("GET", `/sessions/${session.id}/events?afterSeq=0`)).json.events;
      assert.ok(whole.length >= joined.length);
      assert.deepEqual(whole.slice(0, joined.length), joined, "the join must reconstruct the real stream exactly");
      await delay(5);
    }

    assert.ok(sawGrowth > 0, "the stress must have overlapped with real concurrent writes");
    const finished = await pollRun(runId, { timeoutMs: 30_000 });
    assert.equal(finished.status, "completed");
    assert.equal(finished.artifacts.length, 14);
  } finally {
    releaseWrite?.();
    await runtime.close();
  }
});

// T-SYNC-4: a client that keeps polling after the run reached a terminal state
// cannot change anything, and a repeated cancel returns the same terminal
// state rather than re-cancelling or re-opening the run.
test("T-SYNC-4: polling and re-cancelling after a terminal state changes nothing", async () => {
  const { runtime, api, createSession, pollRun } = await boot();
  try {
    const session = await createSession();
    const created = await api("POST", `/sessions/${session.id}/runs`, { input: "hello", commandId: "cmd-1" });
    const runId = created.json.run.id;
    const finished = await pollRun(runId);
    assert.equal(finished.status, "completed");

    const before = (await api("GET", `/sessions/${session.id}/events`)).json.events;
    const beforeSeq = (await api("GET", `/sessions/${session.id}`)).json.lastSeq;

    for (let i = 0; i < 5; i += 1) {
      const polled = await api("GET", `/runs/${runId}`);
      assert.deepEqual(polled.json.run, finished, "reading a finished run must not change it");
      const cancelled = await api("POST", `/runs/${runId}/cancel`, {});
      assert.equal(cancelled.status, 200);
      assert.equal(cancelled.json.run.status, "completed", "cancel must not overwrite a real terminal state");
      assert.equal(cancelled.json.run.endedAt, finished.endedAt);
      assert.deepEqual((await api("GET", `/sessions/${session.id}/events?afterSeq=${beforeSeq}`)).json.events, []);
    }

    assert.deepEqual((await api("GET", `/sessions/${session.id}/events`)).json.events, before, "no new event may be produced");
    assert.equal((await api("GET", `/sessions/${session.id}`)).json.lastSeq, beforeSeq);
  } finally {
    await runtime.close();
  }
});
