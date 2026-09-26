/* Order 3 · the one consumer of a Session's event cursor, shared by Chat and
 * Attention. The Host's `seq` is the only order: an event is admitted at most
 * once, the known list stays sorted, and the cursor never moves back. Pure. */

export function eventsAfterPath(sessionId, afterSeq) {
  return `/sessions/${encodeURIComponent(sessionId)}/events?afterSeq=${afterSeq}`;
}

/** Merge `incoming` into `known`. Events of another Session and events
 * already known are skipped. `admitted` lists the newly admitted events in
 * seq order; `events` is `known` itself when nothing was admitted. */
export function admitSessionEvents(known, incoming, { sessionId, sessionOf = (event) => event?.sessionId, lastSeq = 0 } = {}) {
  const bySeq = new Map(known.map((event) => [event.seq, event]));
  const admitted = [];
  for (const event of incoming || []) {
    const owner = sessionOf(event);
    if (owner && sessionId && owner !== sessionId) continue;
    if (!Number.isFinite(event?.seq) || bySeq.has(event.seq)) continue;
    bySeq.set(event.seq, event);
    admitted.push(event);
  }
  admitted.sort((a, b) => a.seq - b.seq);
  const events = admitted.length ? [...bySeq.values()].sort((a, b) => a.seq - b.seq) : known;
  const nextSeq = admitted.reduce((max, event) => Math.max(max, event.seq), lastSeq);
  return { events, admitted, lastSeq: nextSeq };
}

/** True when a page only grows assistant text: every admitted event is an
 * `assistant.delta`. Such a page can update the growing bodies in place; any
 * other event (a final, a tool, a status) needs the full projection render. */
export function growsTextOnly(admitted) {
  return admitted.length > 0 && admitted.every((event) => event.type === "assistant.delta");
}
