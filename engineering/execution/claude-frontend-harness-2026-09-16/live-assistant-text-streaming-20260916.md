# PR registration · Live assistant text streaming

2026-09-16. Status: implementation slice registered; no product implementation, deployment, or acceptance is claimed.

## Gap

Courtwork currently does not render visible assistant text incrementally while a Run is generating. The response reaches the user through coarse/final projection rather than a continuous visible text stream.

This is not a provider `stream=true` problem. The Runtime already uses Pi's streaming transport and forwards AgentSession events into the Host. The missing capability is the end-to-end path:

**provider/runtime visible text delta → Host normalization → client transport → Chat projection → incremental rendering**

Do not solve this with typewriter animation, reveal motion, or a shorter polling interval.

## Ownership

- Runtime/provider adapters normalize upstream streaming events.
- Host owns Run identity, ordering, terminal settlement, reconnect/recovery and canonical final state.
- Chat projection owns visible assistant response segments.
- Shared Chat/Attention rendering owns incremental Markdown, layout and follow-scroll.
- The durable settled assistant message remains authoritative.
- Raw provider reasoning, hidden thinking and chain-of-thought are not streaming product surfaces.

## PR goal

Chat and Attention should display user-visible assistant text progressively during an active Run without waiting for terminal completion, while preserving one coherent response object and the existing Run/tool chronology.

Required semantics:

1. Stream only visible assistant output.
2. Normalize provider-specific deltas behind a stable Host identity: Run + response/segment + monotonic sequence/revision.
3. Do not persist each token/chunk as an independent chat message.
4. Incremental text is a projection of one response; terminal settlement produces the canonical durable message.
5. Final streamed text and canonical settled assistant text must converge exactly.
6. Final settlement must not create a duplicate assistant response.
7. Tool calls, approvals and other Run events may interleave with assistant narration without resetting prior text.
8. Cancelled, failed or unknown Runs may retain actually received partial text, but it remains explicitly partial and does not acquire completed-message actions/state.
9. Repeated/stale/reconnected delivery must be idempotent.
10. Reloading a settled conversation reconstructs canonical durable state without replaying the live stream.

## Transport

Inspect the existing Host event/cursor path before choosing the implementation seam.

SSE is the default candidate for the live one-way channel. Bounded long-poll may remain as fallback/recovery if it satisfies the same ordering and resume contract.

Do not introduce a general realtime framework, WebSocket control plane or provider-specific frontend channel for this slice. The normalized streaming DTO must remain transport-independent.

## Rendering

Maintain one assistant response surface while content grows. Do not create one DOM message per delta.

Incremental Markdown must tolerate incomplete constructs, including:

- fenced code blocks
- links
- lists
- inline Markdown
- long Chinese/CJK text

Once settled, rendering must converge to the result of rendering the canonical final Markdown once.

Preserve:

- text selection
- expanded tool state
- keyboard focus
- user scroll position
- existing follow-latest semantics

If the user intentionally leaves the tail, incoming text must not force-scroll them back.

Pending assistant text does not receive ordinary final-message footer/actions. Motion may be layered later, respects reduced-motion, and is not acceptance evidence.

## Deterministic verification

Use a local deterministic fixture that emits one assistant response through multiple delayed visible-text chunks, including prose and an incomplete-then-completed fenced code block.

Acceptance requires:

1. Visible assistant text appears before Run terminal completion.
2. Chunk ordering is preserved.
3. Reconnect/resume does not duplicate already-consumed text.
4. Tool/activity events may occur between chunks without creating another assistant response.
5. Settled browser text exactly equals Host canonical final text.
6. Cancel/failure after partial output retains only received partial text and does not present it as completed.
7. Reload after settlement restores the same final response without replaying the live stream.
8. Chat and Attention consume the same normalized streaming contract.
9. Long Markdown, code, CJK, narrow width, 200% zoom, keyboard navigation and scroll-away behavior do not regress.

Record provider→Host receipt, Host→client publication and browser paint timing in the fixture so later latency work has a baseline. A single timing run is not a performance guarantee.

## Change boundary

Likely consumers:

- `app/runtime/pi-session-runtime.mjs`
- Host service/event transport
- Chat thread projection
- shared Chat/Attention renderer
- associated deterministic and interaction tests

Confirm exact write paths against actual HEAD before editing.

Stop for architecture review if implementation requires:

- duplicating canonical message state
- leaking provider-specific deltas into UI
- persisting every token as an independent chat record
- exposing hidden reasoning
- introducing a second Run/session authority

This slice is independent of RD-006 repository write and DF-04 test-recipe capability and does not close either Harness gate. Its implementation order remains unassigned; it does not silently reorder the existing 00–13 queue.

---

## 2026-09-25 · Order 3 · current-path audit and minimal contract (for parent decision)

Author: Claude (Opus 5.5), serial order 3 after E1-H (`main@e990b2a`). No product change in this entry. It corrects the 2026-09-16 premise: visible text **already** updates during a Run. What follows is where the existing path does and does not meet the registered semantics, measured on actual main.

**Method.** Two Sonnet explorers mapped the Host and client code (file:line below). A scratch Host from main used a synthetic fake provider: `SLOW` = 30 short paragraphs after a 600 ms first-token wait and 100 ms per 24-character chunk; `SLOWTOOL` = one `ws_list` call and then slow text; `SLOWMD` = prose, a 12-line fenced block, a list, a link and CJK text. It was driven over the API and in the built-in browser at 1440×900. No paid call or credential was used.

### 1 · Current chain and measured behaviour

| Stage | Today (evidence) |
| --- | --- |
| Runtime → Host | `mapSessionEvent` maps Pi `text_delta`/`text_end` to `assistant.delta {text}` and `message_end` to `assistant.message {text, stopReason, errorMessage}` (`runtime/pi-session-runtime.mjs:717-741`). **`text` is a cumulative snapshot of the whole assistant message** (`assistantMessageText`, :696-703), not a fragment. Thinking and tool-argument deltas are dropped (:722-726). There is no message/segment id; Pi's `contentIndex` is discarded. |
| Persistence | Every snapshot is appended to the session journal with a contiguous `seq` (`server/service.mjs:3374-3376`, `server/store.mjs:696-702`); nothing is coalesced, capped or compacted. Probe: one 889-character reply → 39 deltas (18,650 characters stored, about 21× the text); the last delta equals the final message. |
| Segments | text → tool → text produces separate assistant messages, each with its own deltas and `assistant.message` (probe: `M(toolUse) tool.start tool.result Δ×39 M(stop)`), distinguished only by `seq` order. |
| Cancel / failure | `cancelRun` records `stopping` → `cancelled` and synthesizes no final message (`service.mjs:3460-3496`). Probe: `Δ×6 S:stopping S:cancelled`, with no `assistant.message`. |
| Read API | Only `GET /sessions/:id/events?afterSeq=` (`server/index.mjs:190`, `service.mjs:3510-3528`): plain poll, whole remainder with no page cap, session-filtered, 400 `cursor_ahead` on a future cursor. No SSE, WebSocket or push exists anywhere in the server. |
| Chat client | Polls every 900 ms while a Run is active (`web/app.mjs:1083-1168`), de-duplicates by `seq` (:948-960), re-fetches the full detail after a lost connection (:1118-1124). `thread-projection.mjs:40-58` **replaces** the row text with each snapshot (no append, so it cannot duplicate) and opens a new row per segment. `renderMessageStream` rebuilds the whole list DOM each render (:2892-2926); Markdown is fully re-parsed each time (`ui-controls.mjs:299-333`). |
| Attention client | The same `projectThread` (`attention-agent-view.mjs:257-260`), but its own 1500 ms loop doing a **full** `GET /sessions/:id` each tick (`attention-conversation.mjs:8-29`, `attention-agent-view.mjs:308`), with no `afterSeq`. |

Live observations:

| Case | Chat | Attention |
| --- | --- | --- |
| Text before terminal | yes: first text about 0.8–1.2 s, then steps about every 0.9 s (71 → 280 → 488 → 697 → 861 characters) | yes: first text about 1.8 s, then steps about every 1.5 s (6 → 18 → 30 paragraphs) |
| Ordering, no duplication | holds (snapshot replace plus `seq` de-duplication) | holds (same projection over a full re-fetch) |
| Tool between text | new text row after the tool; earlier text kept | same projection |
| Reader scrolled away | position held (`scrollTop` 0 throughout), Back to latest shown | not measured |
| Selection inside a growing reply | **lost**: the body node was replaced 4 times in 14 samples; a selection made mid-stream was empty two polls later | same rebuild class (not measured) |
| Cancel mid-stream | partial text kept, no footer, run reads `Cancelled`; **row keeps the live `pending` class** | same projection |
| Unclosed fence | 13 of 23 snapshots had an odd number of fences; rendered best-effort and converged, because the final equals the last snapshot, fully re-rendered | same |
| Reload / reconnect after settlement | converges (the full detail replays all snapshots, then the final) | converges |
| Transfer / storage | full detail of a chat with a few short Runs: 131–265 KB, of which 52–94 KB are superseded snapshots | **every 1.5 s tick re-downloads that whole detail**, growing with each reply |

### 2 · Proven gaps against the registered semantics

- **G1 · superseded snapshots are persisted and re-sent.** Each snapshot is a durable journal event forever, so storage and full-detail transfer grow roughly with n²/chunk for an n-character reply. Registered semantics 3 and 10 (no per-chunk durable records; reload does not replay the live stream) are not met in substance.
- **G2 · the Chat list is rebuilt on every poll.** A selection inside a streaming reply is lost (measured). Registered rendering requirement: preserve text selection. Focus and expanded tool state are kept by other mechanisms and were not seen to break; they are not claimed either way.
- **G3 · no terminal settlement for partial text.** A cancelled or failed Run leaves no final event for its last segment, and the row keeps `pending` styling after the Run settled. Registered semantic 8 (partial is explicitly partial, not pending) is not met.
- **G4 · Attention uses a different consumption path.** It does a full re-fetch at 1.5 s instead of the `afterSeq` cursor. It converges, but it is not the same contract (acceptance 8), and with G1 its cost grows with every reply.
- **G5 · no segment identity.** Segments are inferred from event order. That is sufficient today, but G3's settlement and keyed rendering need to name the segment they act on.
- **Not a gap (keep):** ordering and de-duplication, snapshot replace (no duplicate text), convergence of the final text, scroll-away, first text before terminal. Latency is bounded by the 900 ms poll. The registration already rejects "shorter polling" as the fix, and nothing measured here shows that the transport itself fails a requirement. **SSE stays a candidate, not a decision.**

### 3 · Minimal contract (proposed)

1. **Unit.** An assistant *segment* is one assistant message within a Run, identified as `(runId, segment)`, where `segment` is the 0-based ordinal of assistant messages in that Run assigned by the runtime adapter. `assistant.delta` and `assistant.message` both carry it.
2. **Payload semantics.** `assistant.delta.text` stays a **cumulative snapshot** of that segment (the existing shape; the client replaces). A snapshot never shrinks within a segment; a shorter one is a protocol error that is logged and ignored. Fragments are not introduced.
3. **Order and de-duplication.** The session `seq` stays the only order. A consumer applies an event at most once (`seq`); for a segment, the snapshot with the highest `seq` wins.
4. **Terminal convergence.** Every segment that received a delta ends with exactly one `assistant.message` for that `(runId, segment)`: from the runtime on a normal end, or **synthesized by the Host** at a non-completed terminal (`cancelled`, `failed`, `unknown`), carrying the last received snapshot and `stopReason: "cancelled" | "error" | "unknown"` with `partial: true`. Settled text must equal the last snapshot byte for byte. Completed-message actions appear only for `completed` Runs.
5. **Reconnect and reload.** A consumer resumes from its last `seq`; after a gap it may re-fetch the detail. Both converge to the same rows. A settled segment renders from its `assistant.message` alone.
6. **Persistence (G1): decision D1.** (a) Keep persisting snapshots, but coalesce writes per segment (at most one per 250 ms, plus the final). Durable growth is bounded by time, not by chunks, and crash-partial text survives up to the last write. (b) Keep live snapshots out of the journal: the events response carries an ephemeral `live` tail per active segment, and only `assistant.message` (final or Host-synthesized partial) is durable. Storage is O(n), but text received after the last persist is lost in a Host crash, and that Run is already `unknown`. **Recommendation: (a) now**. It keeps the append-only journal and every existing consumer unchanged, and (b) can follow if the measured cost still matters.
7. **One consumption contract.** Chat and Attention both consume `events?afterSeq=` and the same projection; Attention's full-detail loop is replaced by the shared cursor poller.
8. **Rendering (G2): decision D2.** Only the streaming segment's body is updated; settled rows and other segments keep their DOM nodes. While the person holds a selection inside the growing segment, either (a) that segment's visible text stops updating until the selection is released, with a quiet `more text below` hint, or (b) updates continue and the selection is restored by character offsets where the prefix is unchanged. **Recommendation: (a)**: it is deterministic, and snapshots only grow, so nothing is lost.

### 4 · Deterministic counterexamples and construction boundary

The fixture extends the existing fake provider only:
- a `mixed` response kind: text and a tool call in one assistant message;
- a configurable chunk interval;
- a hold/release hook for cancel timing.

An audit script, sibling of `example-audit.mjs`, records provider→Host receipt, Host→client publication and browser paint times as a baseline. It is not a performance claim.

| # | Counterexample | Pass condition |
| --- | --- | --- |
| C1 | slow single reply | first visible text before terminal; strictly growing; settled text equals the Host's final |
| C2 | text, tool, text in one Run (including `mixed`) | two segments with ids 0 and 1; tool state between them; earlier text never reset; no extra response |
| C3 | connection drop mid-stream, resume | no duplicated or lost text; converges to the Host's final |
| C4 | cancel mid-stream | exactly one Host-synthesized partial `assistant.message`; row marked partial, not pending, no completed actions; reload identical |
| C5 | Host failure mid-stream | as C4 with `stopReason: "error"` |
| C6 | unclosed fence, list, link, CJK across chunk boundaries | no thrown render; settled DOM equals a single render of the final Markdown |
| C7 | reader scrolled away | position held; Back to latest shown; no forced scroll |
| C8 | selection inside the growing segment | per D2; selection in settled rows always kept |
| C9 | Attention runs C1, C3 and C4 | same results through the shared poller |
| C10 | durable size | per D1: journal bytes for a 10k-character reply stay within the chosen bound |

**Serial construction after the parent decides D1 and D2:**
1. **Backend:** runtime segment ordinal; Host terminal partial settlement; D1 persistence; fixture and audit.
2. **Frontend:** segment-keyed incremental rendering (D2); partial marker; Attention on the shared poller.
3. **Independent acceptance.**

Out of scope: transport replacement (SSE stays a candidate if C1 timings are later judged insufficient), hidden reasoning, typewriter motion, and 06c.

### 2026-09-25 · Parent decisions and binding boundaries

**D1 = (a)** coalesced writes this round; **D2 = (a)** freeze the segment's text while selected; no SSE now. Written into the contract:

1. **D1(a) mitigates G1; it does not close it.** Cumulative snapshots saved every 250 ms still grow super-linearly at a fixed generation rate. A segment's first snapshot is written at once; between writes only the latest pending snapshot is kept; terminal events are never delayed by the throttle. C10 fixes text length and generation timing and reports event count and actual bytes; linear storage is not claimed.
2. **Partial settlement is atomic and idempotent.** If a normal final exists, nothing is synthesized. On cancel or failure, the still-open segment is settled, its timer is cleared, and late updates are rejected. Crash recovery uses only the last persisted text and the Run keeps its real `unknown` status; with no persisted evidence no empty partial is invented. Completed-message actions require both a `completed` Run and a non-partial segment.
3. **Segment identity is persisted with the events.** The adapter may assign the ordinal; the Host validates and records it. Chat and Attention never renumber on reconnect. Older events keep an explicit, stable compatibility rule, and historical records are not rewritten.
4. **Selection freezes only the text painting.** Updates keep arriving and only the latest snapshot is kept; releasing the selection paints once. The hint says `Content updated`, not "more below". Terminal and partial state still update, and other rows are not rebuilt.

Acceptance corrections:
- The normal final is authoritative: settled text equals the final, never truncated to match an earlier snapshot.
- C5 splits into **C5a** execution failure with the Host alive and **C5b** recovery after a process crash.
- C2 must use a real text + tool mixed message.

Order: fixture and backend finite order → frontend consumes the fixed interface → independent acceptance. 06c stays deferred.

### 2026-09-25 · Order 3 backend finite order · author delivery

Branch `claude/stream-backend-20260925` from `main@51d0fbe`. Author: Claude (Opus 5.5). Independent acceptance pending.

**Fixed interface (what the frontend consumes).** Event types and the `events?afterSeq=` route are unchanged; new fields only:

- `assistant.delta` `data: { text, segment }`: `text` is a cumulative snapshot of segment `segment` (0-based ordinal of assistant messages in the Run). It never shrinks within a segment.
- `assistant.message` `data: { text, segment, stopReason, errorMessage? , partial? }`: exactly one per segment that had text or a runtime final. `partial: true` only when the Host settled it at a non-completed terminal (`stopReason` `cancelled` / `error` / `unknown`), written in the same store mutation as `run.status` and immediately before it.
- **Legacy rule** for events without `segment`: the segment equals the number of `assistant.message` events of the same Run before it in `seq` order (`segmentOf`). History is not rewritten.
- Completed-message actions: only when the Run is `completed` **and** the segment's final is not `partial`.
- A Run can hold several error segments. Pi retries a dropped provider stream, and each attempt is its own segment with its own `error` final (C5a: 4 attempts). The frontend decides how to present superseded attempts; the backend reports them as facts.

**Change.**
- `runtime/pi-session-runtime.mjs` `assistantSegmentAssigner` numbers assistant messages per Run; `pi-runtime-port.mjs` applies it.
- `server/assistant-stream.mjs` has `createSegmentStream` and two pure helpers:
  - the stream validates each segment: in order, no skip, no shrink; it assigns the next ordinal when an adapter supplied none;
  - it writes a segment's first snapshot at once, then at most one per 250 ms, keeping only the newest pending snapshot;
  - the runtime final cancels anything pending and stays authoritative;
  - `settle(status)` returns the partial once, clears the timer and rejects later updates;
  - `persistedPartial` settles from persisted text only (crash recovery or a Run not in this process) and never invents an empty partial;
  - `segmentOf` implements the legacy rule.
- `server/service.mjs` gives each Run entry a stream and routes `assistant.*` observations through it. All four terminal sites (task `finally`, cancel fallback, cancel not in this process, startup recovery) now append the partial and the terminal status in one `updateRunWithEvent`, which accepts an ordered event list (`server/store.mjs`). Terminal status is never delayed by the throttle.
- `runtime/fake-provider.mjs` fixture: `mixed` kind (text, then a tool call in one assistant message), per-response `chunkMs`, and `failAfterChunks` (drops the provider connection mid-reply).

**Evidence.** `app/scripts/stream-audit.mjs` boots real Hosts on throwaway data and uses only the public API. It passes 6/6:

| Check | Result |
| --- | --- |
| C1 slow reply | first text at 220 ms, terminal at 3981 ms; snapshots grow; one final equal to the source text; all segment 0 |
| C2 real mixed message | `Δ0… M0(toolUse) tool.start tool.result Δ1… M1(stop)`: segment 0 keeps its narration, segment 1 opens after the tool, no partial |
| C4 cancel | exactly one `partial: true`, `stopReason: cancelled` final at seq 12, then `run.status cancelled` at seq 13 (one mutation). Its text (168 characters, the newest received) extends the newest persisted snapshot (120) |
| C5a provider drop, Host alive | Run `failed`; 4 attempts as segments 0–3, each with exactly one runtime `error` final; nothing synthesized |
| C5b process crash | child Host killed (SIGKILL) after 3 snapshots; the restarted Host marks the Run `unknown` and settles one partial equal to the newest **persisted** snapshot (192 = 192) |
| C10 fixed 10,000 characters, 24-character chunks every 20 ms (417 chunks) | 37 delta events and 184,848 persisted snapshot characters (18.5× the text), against 2,091,664 characters (417 events) uncoalesced. Mitigated, not linear |

- Unit `assistant-stream-segments` 9/9: coalescing with a fake clock, authoritative final, shrink/skip rejection, Host-assigned ordinal, settlement idempotence and late rejection, recovery-from-persisted-only, the legacy rule, the adapter ordinal.
- Full app suite 1687/1687, smoke exit 0 (Node 25.9).
- The existing client already renders a cancelled partial without `pending` and without completed actions, and a tool-then-text Run as before.

Not covered: agents-API/remote adapters beyond the Host assigning ordinals (their events pass through the same stream, not exercised live); Node 22/24.
