/* Order 3 · assistant text segments on the Host.
 *
 * A segment is one assistant message within a Run, `(runId, segment)`, where
 * `segment` is the 0-based ordinal of assistant messages in that Run. The
 * runtime adapter may assign it; the Host validates it and records it on every
 * `assistant.delta` / `assistant.message` it persists. A delta's `text` is a
 * cumulative snapshot of its segment and never shrinks.
 *
 * Persistence is coalesced (D1 a): a segment's first snapshot is written at
 * once, then at most one snapshot per `intervalMs`, keeping only the newest
 * pending one; the runtime's final message for the segment is authoritative
 * and cancels anything pending. This bounds writes by time, not by chunk; it
 * does not make storage linear.
 *
 * A Run that ends while a segment is still open gets exactly one partial final
 * for it, written in the same store mutation as the terminal status: from the
 * newest received snapshot while the Host is alive, or from the newest
 * persisted snapshot when recovering after a crash. After settlement, late
 * updates are rejected. Nothing is synthesized for a segment that already has
 * a final or never had text. */

export const SNAPSHOT_INTERVAL_MS = 250;

export const PARTIAL_STOP_REASON = Object.freeze({ cancelled: "cancelled", failed: "error", unknown: "unknown", completed: "unknown" });

/** Legacy events (written before segments were recorded) carry no `segment`.
 * Their stable rule: an assistant event belongs to the segment equal to the
 * number of `assistant.message` events of the same Run before it, in `seq`
 * order. History is read with this rule, never rewritten. */
export function segmentOf(event, runEvents) {
  if (Number.isInteger(event?.data?.segment)) return event.data.segment;
  let finals = 0;
  for (const other of runEvents) {
    if (other.seq >= event.seq) break;
    if (other.runId === event.runId && other.type === "assistant.message") finals += 1;
  }
  return finals;
}

/** Pure: the partial final to persist for a Run that ended without its open
 * segment's final, from persisted events only (crash recovery, or a Run this
 * process was not driving). `null` when nothing was persisted for an open
 * segment, or its final already exists. */
export function persistedPartial(runEvents, stopReason) {
  const ordered = [...runEvents].sort((a, b) => a.seq - b.seq);
  const lastDelta = [...ordered].reverse().find((event) => event.type === "assistant.delta");
  if (!lastDelta || typeof lastDelta.data?.text !== "string" || !lastDelta.data.text) return null;
  const segment = segmentOf(lastDelta, ordered);
  const settled = ordered.some((event) => event.type === "assistant.message" && event.seq > lastDelta.seq && segmentOf(event, ordered) === segment);
  if (settled) return null;
  return { type: "assistant.message", data: { text: lastDelta.data.text, segment, stopReason, partial: true } };
}

/** One Run's live assistant stream. `write(event)` persists one event. */
export function createSegmentStream({
  write,
  intervalMs = SNAPSHOT_INTERVAL_MS,
  now = () => Date.now(),
  setTimer = setTimeout,
  clearTimer = clearTimeout,
  log = () => {},
}) {
  let current = -1; // newest segment seen
  let open = false; // it has text and no final yet
  let lastText = ""; // newest received snapshot of the open segment
  let written = -1; // newest segment with a persisted snapshot
  let lastWriteAt = 0;
  let pending = null;
  let timer = null;
  let closed = false;

  const stopTimer = () => { if (timer !== null) { clearTimer(timer); timer = null; } };
  const writeDelta = (text) => { lastWriteAt = now(); written = current; return write({ type: "assistant.delta", data: { text, segment: current } }); };
  const flush = () => {
    timer = null;
    if (closed || pending === null) return undefined;
    const text = pending;
    pending = null;
    return writeDelta(text);
  };

  function segmentFor(observation) {
    const given = observation.data?.segment;
    const expected = open ? current : current + 1;
    if (given === undefined) return expected;
    if (Number.isInteger(given) && given === expected) return given;
    // A final may close a segment that never produced text (a tool-only message).
    if (Number.isInteger(given) && !open && given === current + 1) return given;
    return null;
  }

  return {
    /** Accept one `assistant.delta` / `assistant.message` observation. */
    async observe(observation) {
      if (closed) { log(`late ${observation.type} rejected after settlement`); return; }
      const segment = segmentFor(observation);
      if (segment === null) { log(`${observation.type} with segment ${observation.data?.segment} rejected (expected ${open ? current : current + 1})`); return; }
      if (observation.type === "assistant.delta") {
        const text = typeof observation.data?.text === "string" ? observation.data.text : "";
        if (open && segment === current && text.length < lastText.length) { log("shrinking assistant snapshot rejected"); return; }
        if (!text) return;
        current = segment;
        open = true;
        lastText = text;
        if (written !== segment) { stopTimer(); pending = null; await writeDelta(text); return; }
        const due = lastWriteAt + intervalMs - now();
        if (due <= 0 && timer === null) { pending = null; await writeDelta(text); return; }
        pending = text;
        if (timer === null) timer = setTimer(() => { Promise.resolve(flush()).catch((error) => log(`coalesced snapshot write failed: ${error?.message ?? error}`)); }, Math.max(0, due));
        return;
      }
      // The runtime's final for this segment is authoritative.
      stopTimer();
      pending = null;
      current = segment;
      open = false;
      lastText = "";
      await write({ type: "assistant.message", data: { ...observation.data, segment } });
    },
    /** End the stream with the Run. Returns the partial final to persist with
     * the terminal status, or `null`. Idempotent. */
    settle(runStatus) {
      if (closed) return null;
      closed = true;
      stopTimer();
      pending = null;
      if (!open || !lastText) return null;
      open = false;
      return { type: "assistant.message", data: { text: lastText, segment: current, stopReason: PARTIAL_STOP_REASON[runStatus] ?? "unknown", partial: true } };
    },
    get closed() { return closed; },
  };
}
