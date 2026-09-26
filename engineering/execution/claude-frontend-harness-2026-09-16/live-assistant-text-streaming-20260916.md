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
