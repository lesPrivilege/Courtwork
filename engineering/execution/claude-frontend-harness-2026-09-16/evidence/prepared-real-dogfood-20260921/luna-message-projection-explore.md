# Chat message projection exploration

Current source: `/Users/lesprivilege/Projects/Courtwork` at `13e06ccb9575373027316872fc5efbfa4a5f6014`. Read-only exploration; no browser, provider, or source edits.

The repeated controls are a projection/rendering issue, not duplicated persisted messages. `app/web/thread-projection.mjs:21–49` coalesces cumulative `assistant.delta` events into one assistant row, then creates a new row after each segment boundary. A `tool/start` or `tool/result` advances the run segment at `:50–50`; an `assistant.message` closes the current row and is retained as a separate assistant row. Tool rows and their call identity remain separate at `:50–75`. This preserves the evidence order and tool boundaries.

The current production projection for one run containing a pre-tool explanation, a tool call, and a final answer is:

```text
assistant r:0  planning  pending=false
tool     r:c   ws_read
assistant r:3  answer    pending=false
run-status
```

The two assistant rows are therefore legitimate segment records. They are not separate delta paints. The visible repetition comes from both renderers applying the same footer rule to every settled assistant row:

- Chat: [`app/web/app.mjs:3099–3116`](/Users/lesprivilege/Projects/Courtwork/app/web/app.mjs:3099) creates an `assistant-message-actions` footer whenever `!row.pending`, adds the Run-start time, and mounts `messageActionRow`.
- Attention: [`app/web/attention-agent-view.mjs:257–264`](/Users/lesprivilege/Projects/Courtwork/app/web/attention-agent-view.mjs:257) repeats the same `!row.pending` footer/time/action rule.
- `row.startedAt` is the matching Run’s single recorded `startedAt` (`thread-projection.mjs:30–41`), so every settled segment repeats the same timestamp. No per-message timestamp is invented.

This conflicts with the existing Run-surface contract: `engineering/execution/claude-frontend-harness-2026-09-16/README.md:173–179` says intermediate narration/tool work is aggregated, intermediate segments do not repeat the ordinary message footer, and only a final answer gets it. The same owner record explicitly calls the current behavior out at `00-intake.md:158–160` as an open repeated-message appearance. `04-run-surface.md:10–18` identifies the owner seam as Host events/Run identity → `thread-projection` → Chat/Attention renderer, with no new trace store.

The smallest bounded change is to keep all assistant rows and all tool/evidence rows in the projection, but expose the final assistant row for footer purposes and gate the existing footer/time in both renderers. A renderer-only variant can compute the last settled assistant row per `runId` from the already projected `rows`; a projection-owned boolean is clearer if the contract wants to distinguish `stopReason: "toolUse"` from a terminal message. Either way, do not merge the assistant rows or move tool rows: that would erase the execution boundary and break the current `output-message-boundary` guarantees.

Recommended behavior:

- cumulative deltas remain one pending row and never get a footer;
- assistant output that ends a tool segment remains visible as body content but has no timestamp/actions;
- only the final settled assistant message for the Run receives the existing timestamp and action row;
- failed/cancelled/unknown partial output keeps its body and existing pending/terminal semantics; do not label it as a successful final answer;
- Chat and Attention use the same gate and retain the current captured row identity, copy target, feedback state, focus, and action capabilities.

Targeted acceptance tests should cover `app/tests/output-message-boundary.test.mjs` plus the two renderer seams:

1. A delta → `assistant.message(stopReason:"toolUse")` → tool → delta → `assistant.message(stopReason:"stop")` sequence keeps `assistant/tool/assistant/run-status` order and yields exactly one assistant footer/action group, on the final answer.
2. Multiple assistant segments in one Run retain separate text and tool/evidence boundaries, while only the last settled assistant row carries the Run-start time and actions.
3. A pending delta and a cancelled/failed partial row carry no completion footer; existing body and status remain visible.
4. Chat and Attention agree on the count and placement of assistant footer/action groups; action targeting still uses each row’s stable `[session, epoch, kind, id]` identity.
5. Existing `chat-actions` checks for Copy feedback and action state continue to pass on the retained final footer.

This is a focused Run-surface owner change under UX-05/UX-08 and the existing 04/10 slice. It does not require changing persisted event schemas, execution disclosure, tool rows, message action capabilities, or the evidence model.
