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

### 2026-09-26 · Inventory reconciliation

The [original dispatch ledger](next-dispatch-20260921.md#2026-09-26--harnesscore-reconciliation-and-serial-claude-routing) consumes Luna's mature-practice intake and preserves this order's ownership. D1(a)/D2(a) are already decided. Candidate `claude/stream-backend-20260925@162fcce` (initial source `6da3bbc`) contains the backend author delivery and review correction outside main; its own author record remains in that branch. This inventory has not rerun or independently accepted its reported tests. Original backend disposition precedes Claude's frontend continuation and combined acceptance; no duplicate streaming writer or new transport platform is released. The CLI currently lacks authenticated dispatch, so registration is not a claim of author execution.

### 2026-09-26 · Frontend high-throughput and motion intake

User reports a missing frontend obligation: at high TPS, streamed text projection lags and stutters; the activity/TPS animation below the assistant message lacks fluctuation. Register both in this original Order 3 frontend continuation. These are user-observed symptoms, not a measured bottleneck or accepted fix. Backend coalescing does not by itself close frontend performance.

**Responsibility and precedent.** Host/runtime own events, segment identity, terminal state and any measured token timing. The shared Chat/Attention projection and renderer own timely presentation, selection and scrolling. `run-activity.mjs` owns decorative activity lifecycle; `chat-measurements.mjs` owns disclosure of available measurements. Nearest implemented precedent is [context/activity production](../../design/context-tps-motion-2026-09-13/production/README.md), with [request.activity](../../design/agent-interface-2026-09-10/precedent-map.md#requestactivity), [UX Grammar](../../design/ux-grammar.md) and [Atlas](../../design/atlas/README.md) as design entry points. No new telemetry authority is assigned to the frontend.

Source inspection finds a seven-bar, fixed 1.8-second CSS breathing cycle (`run-work-breath` in `styles.css`); its amplitude is not driven by throughput. The measurement disclosure explicitly says decode TPS is not measured. The requested fluctuation therefore requires choosing between a clearly decorative activity rhythm and a measured-rate reading with a real token/time source. Character arrivals or chunk cadence may measure local delivery but must not be labelled provider decode TPS. Keep missing measurements explicit in details. No new random variation may masquerade as speed evidence.

| Intake / existing case | Required author evidence and disposition |
| --- | --- |
| High-throughput delay/jank; extend C1/C10 | Record provider fixture cadence → Host receipt/publication → client receipt → projection/Markdown work → paint. Use short/long replies, sustained fast arrival and bursts; record chunk and character rates separately from TPS, hardware/browser and payload. Report p50/p95 receive-to-paint lag, frame gaps/long tasks, parser/DOM cost and terminal convergence. Establish explicit budgets from the measured baseline before claiming acceptance. |
| Incremental rendering; C2/C6/C7/C8/C9 | Reuse stable segment/row identity; retain only the latest pending visual snapshot and bound paint scheduling. Never discard semantic tool/terminal events. Test mixed text/tools, unfinished Markdown/CJK, selection hold/release, scroll-away and simultaneous Chat/Attention. No typewriter queue that grows behind received text; normal final remains authoritative. |
| Activity fluctuation | Reproduce the reported weak/static appearance under the same high-load fixture; determine whether animation resets, DOM replacement, scheduling or the fixed recipe causes it. Compare a coherent nonnumeric activity recipe with a source-backed rate recipe only when data exists. Stop/pause correctly at waiting, cancel pending, disconnect, terminal, hidden and reduced motion. Preserve the measurement entry and accessible status. |
| Unified motion grammar | **Proposed selection**, under existing Atlas Motion and request.activity: consistent purpose, trigger, property, timing/curve token, interruption, finish/pause and reduced-motion behavior across text updates, activity glyph and related disclosure. Start from existing `--duration-fast`, `--duration`, `--ease-out`; continuous activity has its own explicit recipe and is not a menu transition. Prefer native CSS/WAAPI and bounded scheduling; no new animation dependency or global restyle is selected. Promote only after a local specimen and measured actual-browser evidence. |

Claude order remains backend fixed-interface disposition → frontend rendering/performance and activity-motion specimen/implementation → independent acceptance. Luna supplies bounded source/primary-reference exploration; Parent selects the grammar and acceptance boundary. This supplements the existing frontend order rather than creating another writer. Read the visual/spatial grammar if the specimen changes density or layout, and record its surface/token/pointer/text-scale mapping. This turn registers work only; no performance test, browser reproduction or motion acceptance has occurred.

#### Luna follow-up and parent disposition

Luna's second read-only pass confirms the existing [request telemetry contract](../../../app/docs/request-telemetry.md) does not provide measured decode TPS, and [Chat Reading CR-01](../../design/chat-reading-2026-09-11.md) already forbids per-token body animation, delayed readability and replay of settled content. **Adopt** these boundaries; **adjust** the unified-motion proposal to consolidate existing UX-05, CR-01, Atlas Motion and activity recipes in this task, rather than establish a competing design system. A common recipe/specimen remains proposed, not accepted. **Defer only rate-driven fluctuation** until the measurement owner supplies suitable samples; visual activity refinement and rendering performance remain actionable now.

Primary references checked by Luna: [Chrome DevTools frame/performance analysis](https://developer.chrome.com/docs/devtools/performance/reference), [web.dev rendering/interaction latency](https://web.dev/articles/optimize-inp), and [requestAnimationFrame](https://developer.mozilla.org/en-US/docs/Web/API/Window/requestAnimationFrame). **Adopt** profiling and attribution methods; **conditional** frame batching only after locating cost, since requestAnimationFrame does not make expensive Markdown/DOM work cheap and pauses in hidden tabs. These references do not establish local measured results or impose a new library. Author should preserve the user's original high-TPS report while labelling synthetic test inputs by their actual event/character units.

### 2026-09-26 · Independent backend review: return to original Claude

[Fixed-source review and explicit action order](evidence/stream-backend-review-20260926/README.md) holds `162fcce`. Parent audit passes 6/6 and Luna passes 66 focused tests, but a new real-Host fault probe reproduces a regression: the timer's second snapshot write fails once, then candidate ends `completed` with no error; main control ends `failed / runtime_projection_failed`. **STR-R1 adjust:** propagate asynchronous persistence failure through the existing Host outcome and add failing-before/passing-after coverage. **STR-R2 adjust:** C10 needs actual durable serialized bytes and an asserted bound with an uncoalesced failure control; its present PASS only checks final text. Segment/D1/D2 contract is retained; native interleaving remains deferred to its managed-runtime owner.

This is an explicit request for the original Claude to implement those two returns serially on the preserved backend branch, then hand fixed source back for independent disposition. Do not start frontend yet. The later high-throughput/activity-motion scope remains in this same order. Inventory docs are committed as `10203c0`; no Figma dependency, product merge or independent frontend acceptance follows.

### 2026-09-26 · Backend return independently reviewed, one STR-R1 race remains

[Return review](evidence/stream-backend-review-20260926/return-review/README.md) fixes `9bef03c`. Original failure probe now matches main's failed/error outcome; Parent audit6/6 passes and actual C10 byte assertions support accepting STR-R2 within the fixed fixture. A new real-Host probe holds a snapshot write until final has begun, then rejects it: Run fails correctly but has persisted deltas and zero final/partial events because the final path cleared open text before awaiting durability. STR-R1 remains with original Claude for that finite settlement correction and regression; no frontend release or product merge. Whole-file write amplification, native interleaving and frontend/browser acceptance remain separate.

### 2026-09-26 · Live settlement fixed; persisted retry recovery return

[Independent settlement review](evidence/stream-backend-review-20260926/settlement-review/README.md) fixes `7a1f3a6`: Parent's two prior probes now pass, Luna75/75 and Host audit6/6 pass, and STR-R2 stays accepted. Live per-segment settlement is adopted. A supported Pi provider-retry probe produces persisted deltas for segments0/1 without finals; reopening the captured crash image marks the Run unknown but settles only segment1. Original STR-R1 now requires persisted per-segment recovery parity at startup and no-active-entry cancel. This is not the deferred native interleaving case. Original Claude receives the bounded correction; frontend remains queued, no merge.

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

#### Non-author review of `6da3bbc` and disposition

Sonnet non-author review confirmed:
- atomic ordered settlement at the three reachable sites, and `settle` idempotence;
- crash recovery from persisted text only, including the legacy rule and an existing final;
- final authority, with no coalesced write after it and tool-only finals accepted;
- coalescing, and no timer leak on shutdown (`close()` cancels and awaits every Run).

Independent 9/9 and audit 6/6. Two findings:

- **Latent loss in the task `finally` when the Run was already terminal — adjust.** `settle()` computed the partial and discarded it; being one-shot, the text could never be written. No current path reaches it: every in-process terminal writer settles the stream itself, and the other writers run without an entry. It now appends that partial after the existing status rather than dropping it, and the comment says it is not atomic.
- **Remote gateway had no segment identity — adjust within scope.** `runtime/agents-host-gateway.mjs` now numbers segments by first-seen native `itemId`, and `assistant.message` carries it when the item is known. Truly interleaved native items remain refused by the sequential-segment rule and are logged. That lane is not live (the Agents API lane is unavailable per README), so the backend record leaves the interleaving policy to that lane's own order rather than widening this contract.

DRT-03 gateway and transport tests plus the stream unit tests: 46/46. Full app suite 1687/1687; stream audit 6/6.

#### 2026-09-26 · Author return for STR-R1 and STR-R2

Author: Claude (Opus 5.5), the original backend author. Consumes the Parent review at main `10203c0` (`evidence/stream-backend-review-20260926/README.md`) without merging it into this branch; that record and this branch's history stay as written. Base `162fcce`. Fixed source: **`0bb5186`** (STR-R1) and **`0fa6eda`** (STR-R2). Author evidence: [stream-backend-return-20260926](evidence/stream-backend-return-20260926/). These are the author's reruns, **not** independent acceptance. The frontend has not started.

**STR-R1 · a failed coalesced write reached only the log: adjusted.** Owner: the Host segment stream (`app/server/assistant-stream.mjs`). There is no new queue or service. The stream keeps the first failure of a timer-driven write:
- the next `observe()` rejects with it, which is the runtime's existing persistence-failure path: Pi's `forward` → `projectionError` → abort → `runtime_projection_failed`; the gateway's awaited `onObservation` fails the same way `appendEvent` did on main;
- a final waits for any coalesced write under way, so it is ordered after that write. After a failure the final is not written, and a later final never clears the failure;
- new `persisted()` runs in `service.mjs` after `started.run()`. It stops the timer, waits for any write under way, and rejects with `runtime_projection_failed` when the failure had no later observation. The Run's existing catch records it as `failed`, usage `missing`. The open segment's text then settles as one `partial: true`, `stopReason: "error"` final together with the terminal status.

| Evidence | `162fcce` | `0bb5186` |
| --- | --- | --- |
| Parent probe `persist-failure.mjs` (second `assistant.delta` append fails once) | `completed`, error null, usage complete (Parent's `persist-failure-candidate.json`) | `failed`, `runtime_projection_failed`, usage missing, same as the main control (`persist-failure-fixed.json`) |
| `app/tests/assistant-stream-persistence.test.mjs` (5 tests: Host service case, next-observation rejection, failure without a later observation, final ordered after a write under way, timer cleanup) | 0/5. The Host case reads `completed` where `failed` is expected. The ordering case writes `assistant.message:abc` **before** the snapshot write under way. The other three fail on the missing `persisted()`. (`str-r1-tests-on-162fcce.log`) | 5/5 (`str-r1-tests-on-fix.log`) |

**STR-R2 · C10 asserted only the final text: adjusted.** Owner: the audit (`app/scripts/stream-audit.mjs`). C10 now measures at-rest serialized bytes, with this scope:
- on-disk growth of the Host data directory and of `runtime-state.json` (the RuntimeStore journal, written as pretty-printed JSON), before versus after the Run;
- the Run's persisted events as compact UTF-8 JSON, split into `assistant.delta` events, their snapshot text alone, and all other events of the Run.

It asserts `deltaEvents ≤ 266,000` and `stateFileGrowth ≤ 380,000` bytes. That is about 1.5× the measured baseline.

| Fixed input: 10,000 characters, 417 chunks of 24 characters every 20 ms | Delta events | Delta event bytes | Snapshot text bytes | `runtime-state.json` growth | Data dir growth | C10 |
| --- | --- | --- | --- | --- | --- | --- |
| Baseline, 3 runs before the bound was set | 35 / 35 / 35 | 177,120 / 177,120 / 177,144 | 171,384 / 171,384 / 171,408 | 253,584 / 253,585 / 253,608 | about 264.8 KB | — |
| Fixed source with the bound (`audit.json`) | 35 | 177,168 | 171,432 | 253,633 | 264,873 | PASS, 6/6 |
| **Failure control:** same source with `SNAPSHOT_INTERVAL_MS = 0`, i.e. coalescing removed (`control-no-coalescing.json`) | 418 | 2,170,536 | 2,101,664 | 2,276,880 | 2,288,120 | **FAIL**, 5/6 |

Coalescing cuts at-rest growth by about 9×. Storage is still super-linear: snapshot text is 17.1× the output. **This mitigates G1 and does not close it.** Write amplification is not measured: every Store mutation rewrites the whole state file, so bytes written far exceed bytes at rest.

**Other checks (author, Node 25.9.0):**
- Luna's three command groups plus the two stream test files: 71/71.
- Full app suite: 1692/1692, which is 1687 plus the 5 new tests (`full-suite-summary.log`).

**Remaining limits:**
- Native interleaved items stay deferred to the managed-runtime owner, as disposed.
- The bound is tied to this fixture and machine. It is not a general budget.
- Not run: the Node 22/24 matrix, live managed or paid providers, and anything in the frontend or browser.

**Stop and handoff.** The author stops at `0fa6eda` plus this docs commit. Return to Parent/Luna for independent disposition of STR-R1 and STR-R2. The frontend continuation stays gated on that acceptance.

#### 2026-09-26 · Author return for the STR-R1 settlement race

Author: Claude (Opus 5.5). Consumes Parent's return review of `9bef03c` (main `evidence/stream-backend-review-20260926/return-review/`). STR-R2 stays accepted as disposed there; its bound is unchanged. Fixed source: **`befc592`**. Author evidence: [str-r1-settlement](evidence/stream-backend-return-20260926/str-r1-settlement/). These are the author's reruns, **not** independent acceptance.

**Cause.** A final cleared its segment's open state before it awaited the write already under way. When that write rejected, the final was correctly refused, but `settle("failed")` had nothing open to settle. The Run ended `failed` with no final for segment 0.

**Change.** Owner: the Host segment stream (`app/server/assistant-stream.mjs`). `service.mjs` changes only in how it consumes the result.
- The stream keeps each segment's newest accepted text in `unsettled` until that segment's final is durably written.
- A failing in-flight write, or a failing final write (the adjacent boundary), records the first failure. After that, later deltas and finals are rejected and are not admitted.
- `settle()` now returns a list: one `partial: true` final per unsettled segment, in segment order, with the terminal stop reason. It returns `[]` when nothing is unsettled and stays idempotent. This also covers a newer segment that opens while an earlier final is waiting.
- The three terminal sites spread that list into the same `updateRunWithEvent` as the terminal status; the orphan path appends each item.
- Sequencing, authoritative finals and C1–C10 are unchanged.

| Evidence | `9bef03c` | `befc592` |
| --- | --- | --- |
| Parent's `final-inflight-failure.mjs` | `failed`, `finals: []` (Parent's result) | `failed` / `runtime_projection_failed`, 3 persisted deltas, **one** final `{segment: 0, stopReason: "error", partial: true}` of 648 characters, the newest received snapshot (`final-inflight-failure-fixed.json`) |
| New Host regression: the exact Parent sequence (held second delta append; the real sink begins the final; the held write rejects in a microtask) | fails: `exactly one final`, 0 ≠ 1 | passes: one error partial whose text equals the source, extends the newest persisted delta, and sits at seq one before the `failed` status; no new event after 300 ms; after closing and reopening the Host on the same data, identical events |
| Unit: final waiting on a failing write; failing final write plus late delta; a segment opened while an earlier final waits | all fail. The late delta is admitted after a failed final write ("Missing expected rejection") | pass |
| The two stream test files | 4/9 on the persistence file (`tests-on-9bef03c.log`). One of the base failures only reflects `settle`'s return shape changing from one object to a list | 18/18 (`tests-on-fix.log`) |

**Verification (author, Node 25.9.0).**
- Luna's three command groups plus both stream files: 75/75.
- Stream audit: 6/6. C10 measured 177,360 delta-event bytes and 253,821 bytes of state-file growth, within the unchanged bound (`audit.json`).
- Full app suite: 1696/1696 (`full-suite-summary.log`).

**Semantic note for the reviewer.** After a failure, the partial carries the newest *accepted* snapshot. A delta that arrives after the failure is rejected and is not merged into it.

**Remaining limits.** Same as the previous return: native interleaved items are deferred; the Node 22/24 matrix, live providers and the frontend were not run.

**Stop and handoff.** The author stops at `befc592` plus this docs commit and returns to Parent/Luna for independent disposition of STR-R1. The frontend stays queued.

#### 2026-09-26 · Author return for the STR-R1 recovery seam

Author: Claude (Opus 5.5). Consumes Parent's settlement review of `7a1f3a6` (main `evidence/stream-backend-review-20260926/settlement-review/`). The live settlement fix `befc592` and STR-R2 stay as accepted. Fixed source: **`76dee98`**. Author evidence: [str-r1-recovery](evidence/stream-backend-return-20260926/str-r1-recovery/). These are the author's reruns, **not** independent acceptance.

**Cause.** `persistedPartial` looked only at the Run's last delta. After a crash during a Pi provider retry, both segment 0 and segment 1 had persisted text and no final, but recovery settled only segment 1.

**Change.** Owner: `app/server/assistant-stream.mjs`. The singleton helper is **replaced**, not kept alongside.
- `persistedPartials(runEvents, stopReason)` returns one `partial: true` final per segment that has persisted text and no persisted final. It uses only persisted events, carries each segment's newest persisted snapshot, and goes in segment order.
- Segments use the legacy finals-before rule, computed in one pass that is equivalent to `segmentOf`.
- Settled segments and segments without text are skipped. Nothing unpersisted is invented and history is not rewritten.
- Both existing consumers in `service.mjs`, startup recovery and cancel without an active entry, spread the list before the `unknown` status in the same `updateRunWithEvent`. The Run stays `unknown`.
- Once those partials are persisted the helper returns `[]`. Recovery only visits active Runs, so a later reopen or cancel adds nothing.

| Evidence | `7a1f3a6` | `76dee98` |
| --- | --- | --- |
| Parent `retry-crash-image.mjs` | segment 0 unsettled; only segment 1 partial (Parent's result) | adapted copy (below): durable segments `[0,1]`, no durable finals before; after reopen `unknown`, partials for segments 0 and 1 (`unknown`, `partial: true`), unsettled `[]` (`retry-crash-image-fixed.json`) |
| New Host regression. Real Pi retry schedule: segment 0's second append held, `failAfterChunks: 16`; the captured `runtime-state.json` bytes are restored and reopened | fails: `one partial per unsettled segment…`, segment 0 missing | passes: two partials equal to each segment's newest persisted delta, in segment order, at consecutive seqs just before the `unknown` status; cancel on the recovered Run adds nothing; a second reopen adds nothing and the Run stays `unknown` |
| Unit recovery test (settled, unsettled ×2 out of seq order, textless, idempotence after persisting) and legacy test (legacy plus recorded segments) | the file fails to import: `persistedPartials` does not exist | pass |
| The two stream test files | 9 pass, 2 fail (`tests-on-7a1f3a6.log`) | 19/19 (`tests-on-fix.log`) |

**Probe adaptation.** Parent's probe imports `persistedPartial`, which this fix removes. `retry-crash-image-adapted.mjs` differs from Parent's file by one line only, the import `{persistedPartials:persistedPartial}`; everything else is byte-identical. Its `before.recoveryPartials` is therefore now a list.

**Verification (author, Node 25.9.0).**
- Luna's three command groups plus both stream files: 76/76.
- Stream audit: 6/6. C10 had 37 deltas this run: 190,744 delta-event bytes and 267,361 bytes of state-file growth, within the unchanged bound (`audit.json`). The delta count varies with timing jitter.
- Full app suite: 1697/1697 (`full-suite-summary.log`).

**Remaining limits.**
- Cancel without an active entry has no separate service-level regression. In a running Host, startup recovery settles every active Run before that path can see it; it shares the helper and the atomic list write.
- The legacy rule cannot tell apart two unsettled *legacy* segments with no final between them. They count as one segment, per the stable compatibility rule.
- Unchanged from before: native interleaving, write amplification, the Node 22/24 matrix, live providers and the frontend.

**Stop and handoff.** The author stops at `76dee98` plus this docs commit and returns to Parent/Luna for independent disposition. The frontend stays queued.

### 2026-09-26 · Backend independently accepted; frontend explicitly released

[Final backend acceptance and actionable frontend order](evidence/stream-backend-final-20260926/README.md) accepts `10f27aa`/`76dee98`: all historical probes close, Parent audit6/6, Luna76/76 and integrated23/23 plus smoke pass. STR-R1/STR-R2 close within backend scope; G1 remains a mitigation and broader limits remain explicit. The merge preserves both author and parent appended history. Original Claude now continues the frontend segment/cursor/partial/selection work, measured high-throughput rendering and existing-grammar activity motion from integrated main in its preserved tree. No frontend or combined acceptance, paid provider, user-service restart, push or deployment is claimed.

### 2026-09-26 · Order 3 frontend · change record (before product edits)

Author: Claude (Opus 5.5), per the [frontend release](evidence/stream-backend-final-20260926/README.md). The isolated tree `.worktrees/courtwork-stream-backend-20260925` was fast-forwarded to integrated main `0ec94c5`. Read before editing:
- [UX Grammar](../../design/ux-grammar.md) (UX-01/04/05/09/10);
- the [frontend contract](../../design/agent-interface-2026-09-10/frontend-contract.md);
- the [visual/spatial grammar](../../design/visual-spatial-grammar.md);
- [Chat Reading CR-01](../../design/chat-reading-2026-09-11.md);
- the precedent rows `projection.status` and `request.activity`;
- the [activity production record](../../design/context-tps-motion-2026-09-13/production/README.md);
- [request telemetry](../../../app/docs/request-telemetry.md).

```text
Task / scope: Order 3 frontend — segment-keyed projection and incremental rendering (Chat + Attention), truthful partial, Attention on the shared cursor, measured high-rate rendering, activity motion recipe.
Base SHA / branch / isolated checkout: 0ec94c5 / claude/stream-backend-20260925 / .worktrees/courtwork-stream-backend-20260925
Writer / reviewer: Claude (author) / Parent + Luna (independent combined acceptance)

Owner fact + contract: Host events with persisted (runId, segment), assistant.message partial/stopReason, run.status (accepted backend 10f27aa). The legacy finals-before rule applies to events without a segment.
Semantic / projection / control / placement: projection only; no new state, action or control. The one new visible text is the D2(a) hint `Content updated`, placed in the frozen reply.
Surface role: reading-review (message bodies); workbench chrome (activity glyph, unchanged placement)
Pattern + owner / token mapping: existing message row, markdown(), run-status row, WK-57 state word (`unfinishedToolWord`) for an interrupted reply; motion uses existing --duration/--ease-out plus the request.activity continuous recipe (its own explicit keyframes).
Pointer / viewport / text scale: measured at the built-in browser's 1024×768 CSS px, DPR 2, fine pointer, 100% text; 1440/390/200% remain Parent's browser verification.
Density exception / reflow / focus-scroll owner: none. Focus, scroll and selection stay with chat-reading.mjs and each surface's render.
Affected UX IDs: UX-01 (no repeated status), UX-04, UX-05 (partial ≠ running; motion stops at terminal, hidden, reduced motion), UX-09, UX-10; CR-01 (no per-token or typewriter body motion, no replay).
Nearest precedent: app/web/thread-projection.mjs projectThread; app/web/app.mjs renderMessageStream/appendAssistantBody/pollEvents/mergeEvents; app/web/attention-agent-view.mjs render; app/web/run-activity.mjs + styles.css run-work-breath @ 0ec94c5 (evidence: context-tps-motion production README).
Evidence type / status: implemented precedent (reference); request.activity stays `reference`; real TPS stays deferred.
Kept relationships: one row per (runId, segment); the Run's status row; final-answer footer only for a completed Run's non-partial standing answer; follow-latest and Back to latest; reading anchors; tool-open state; drafts; the activity glyph stays mounted.
Intentional changes: (1) the projection uses the persisted segment identity; (2) settled bodies are reused rather than re-parsed, and a delta-only poll patches the growing body without rebuilding the list; (3) the growing body re-renders only its changed Markdown blocks and converges to one full render at settlement; (4) D2(a) freeze plus `Content updated`; (5) partial replies read `Interrupted` / `Unknown`, never pending; (6) Attention reads `events?afterSeq=` through the shared cursor merge and re-reads the full detail only at gaps and Run boundaries; (7) the activity bars get per-bar phase and period so the decorative rhythm is not uniform.
New terms / tokens / primitives / dependencies: the visible hint `Content updated`; no new token or dependency (marked/DOMPurify already vendored).
Cross-layer: none. Host/Core contracts, schemas and transport are unchanged, with no SSE.
```

Before-change browser baseline (author, built-in Chromium 152, 1024×768 DPR 2, fixture `app/scripts/stream-frontend-fixture.mjs`, probe `app/tests/fixtures/stream-frontend/measure.js`):
- Chat `stream sustained` (12,000 characters, 24-character chunks every 20 ms) on an empty thread: poll receipt → DOM p50 14 / p95 19 ms.
- The same reply as the third long reply in the thread: p50 41 / p95 46 ms. Cost grows with the whole thread, because every poll rebuilds every row and re-parses all Markdown.
- Visible text advances in steps of about 1,000 characters every ~0.9 s: the poll cadence.
- Attention re-fetches the full detail every ~1.5 s. For one 12,000-character reply that grew from 40 KB to 325 KB per tick.
Raw data: `browser-before.json` and `host-before.json`, committed with the frontend evidence.

### 2026-09-26 · Order 3 frontend · author delivery

Author: Claude (Opus 5.5). Source: **`88e3e7e`** (product and tests) on the harness commit `9b96b06`, over integrated main `0ec94c5`. Evidence: [stream-frontend-20260926](evidence/stream-frontend-20260926/README.md). These are author checks; frontend and combined acceptance stay with Parent/Luna.

**Delivered against the release order.**

1. **Segment-keyed projection and incremental rendering, shared by Chat and Attention.**
   - `thread-projection.mjs` uses the persisted `(runId, segment)` and the legacy finals-before rule.
   - `stream-body.mjs` keeps bodies by segment key. A text-only poll (`growsTextOnly`) patches the growing body in place, re-rendering only its changed Markdown blocks. At settlement the body is rendered once from the final.
   - D2(a): the growing reply's text is held while it is selected, with `Content updated`, and the hold carries across structural rebuilds. Receipt and state keep updating.
2. **Truthful partial state, and Attention on the shared cursor.**
   - Partial or legacy-terminal text is never pending. It reads `Interrupted` / `Unknown` (WK-57 words) and has no answer actions; the final-answer footer still requires a `completed` Run and a non-partial row.
   - Attention uses the shared `session-events.mjs` cursor, which Chat's `mergeEvents` now also calls. It re-reads the full detail only on `run.*` events and `cursor_ahead`.
   - Reconnect and reload converge without duplicates (C3, reload in the evidence).
3. **High-rate lag: measured, not assumed.**
   - Before (`0ec94c5`, same headless harness, 4 rounds): receipt→DOM grew with the thread, p50 19 → 44 ms by the third long reply, with 7 long frames.
   - After: p50 7–9 ms; long frames 0 (range 0–1).
   - Attention per-tick payload p50: 159,623 → 44,720 bytes.
   - The remaining visible stepping is the transport's 0.9 s / 1.5 s poll plus Host coalescing (Host persist → receipt p50 about 120–220 ms). The transport is unchanged and SSE stays a candidate.
   - No typewriter or per-token backlog was added.
4. **Activity motion.** Measured cause of the weak fluctuation: the `animation` shorthand reset every mark's delay to 0, so all seven moved as one. Also, each Chat render re-inserted the message stream, restarting the motion about once per poll (6 Animation instances per mark in 4 s). The accepted staggered 1.8 s recipe is restored and nothing moves when already in place:
   - 1 animation instance per mark;
   - spread across marks p50 0.13;
   - reduced motion still, and hidden documents paused.

   The specimen adds a proposed varied-period candidate for Parent's selection. No text motion is added (CR-01).

**Changed owners and files.**
- Projection: `app/web/thread-projection.mjs`.
- Bodies: `app/web/stream-body.mjs` (new).
- Cursor: `app/web/session-events.mjs` (new; whitelisted in `app/server/index.mjs`).
- Chat: `app/web/app.mjs` (`mergeEvents`, `pollEvents`, `appendAssistantBody`, `patchGrowingBodies`, `renderMessageStream`, composer layout ordering).
- Attention: `app/web/attention-conversation.mjs`, `app/web/attention-agent-view.mjs`.
- Motion: `app/web/styles.css` (request.activity).
- Tests: `stream-thread-projection`, `stream-session-events`, `stream-activity-recipe`; `output-message-boundary`, updated to the accepted identity and partial rules.
- Fixture and harness: `app/scripts/stream-frontend-fixture.mjs`, `app/scripts/stream-frontend-measure.mjs`, `app/tests/fixtures/stream-frontend/measure.js`, and the `burst` option in `app/runtime/fake-provider.mjs`.
- No Host, Core, schema, transport, dependency or token changes.

**Author checks.**
- Full suite 1709/1709; `runtime-smoke` exit 0.
- Frontend lints and `check-doc-links` clean.
- Built-in browser: C2, C3 (Chat and Attention), C4 (Chat and Attention), C6, reload convergence, C7, C8.
- Headless: C8b across the final, and the before/after timing and activity tables.

**Pending and limits.**
- Parent browser/visual verification: 1280/390 px, dark, native 200% zoom, keyboard, forced colors, screen reader, simultaneous surfaces.
- Node 22/24; live providers.
- The first render that creates a reply row and the terminal render still rebuild the list.
- Poll cadence bounds text cadence.

**Stop and handoff.** The author stops here and returns `88e3e7e` plus the docs commit to Parent/Luna for independent frontend and combined acceptance.

#### 2026-09-26 · Author return for STR-FE1 (streaming Markdown references)

Author: Claude (Opus 5.5). Consumes Parent's frontend review of `7944e12`. Kept as they are: the shared cursor, partial semantics, the D2(a) freeze and the shipped 1.8 s recipe; the varied-period candidate stays deferred. Fixed source: **`10bc6f3`**. Evidence: [str-fe1](evidence/stream-frontend-20260926/str-fe1/). These are the author's checks, not independent acceptance.

**Cause.** `paintGrowing` lexed each snapshot, but then rendered every block on its own through `markdown(raw)`. That dropped the document's reference definitions (`tokens.links`). Unchanged blocks were also kept on source equality alone, so a definition arriving later could not update a reference already drawn.

**Change.** Owners are the shared body (`app/web/stream-body.mjs`) and the one sanitizing path (`app/web/ui-controls.mjs`).
- `markdown(text)` now lexes and calls the new `markdownTokens(tokens)`. That function holds the unchanged sanitize and link/code/table post-processing. The full parse is unchanged: `marked.parse` equals `marked.parser(marked.lexer(...))`.
- The growing body renders each changed block as `[token]` with the document's `links`.
- A block may be kept only if its source is unchanged, and, when the definitions changed, only if it cannot use a reference (no `[…]`). Kept blocks keep their nodes; new nodes are inserted before the next kept block.
- The settled path and the selection hold are unchanged. No parser, dependency or raw-HTML path is added.

| Production `createAssistantBody` in headless Chrome (`app/tests/stream-body-browser.test.mjs`) | `7944e12` | `10bc6f3` |
| --- | --- | --- |
| Definition before use | literal text, no anchor, differs from `markdown()` | anchor `the link` → `https://example.com`, equal to `markdown()` |
| Reference painted, definition arrives later | stays literal, differs | becomes the anchor, equal to `markdown()` |
| Unrelated block (`# Heading`) across that change | node kept | node kept |
| Final convergence | equal | equal |
| `[x]: javascript:…` reference | literal, differs from `markdown()` | anchor without `href`, equal to `markdown()` (sanitizer unchanged) |
| Test result | fail (`browser-test-on-7944e12.log`) | pass (`browser-test-on-fix.log`) |

The test skips with a stated reason when no Chrome is found (`COURTWORK_CHROME` overrides the path).

**Cost and regressions (author, Node 25.9.0).**
- Full suite: 1710/1710, including the new browser test.
- `lint-interaction` and `check-product-copy` clean.
- One headless round on `10bc6f3` (`headless-after-fe1.json`): Chat receipt→DOM p50 4–5 ms on streaming polls, p95 11–25 ms, 0 long frames; Attention p50 6 / p95 20 ms. This is within the earlier after-range, so there is no measured cost increase. It is a single round, not a budget.
- C8b still holds: text held at 187 characters with `Content updated`, final painted on release.

**Limits.** A change in definitions re-renders every block that contains `[…]`, including code blocks, which is conservative. Other limits are unchanged from the frontend delivery entry.

**Stop and handoff.** The author stops at `10bc6f3` plus this docs commit and returns to Parent/Luna for independent disposition of STR-FE1. There is no merge or push, and no combined-acceptance claim.
