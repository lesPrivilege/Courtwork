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
