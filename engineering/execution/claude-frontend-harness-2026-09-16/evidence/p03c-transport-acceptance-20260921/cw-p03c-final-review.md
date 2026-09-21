# P03-C final delta review (R1/R3)

Date: 2026-09-21
Candidate: `32f4f8bb754db20b8c0c5c3e44ab4acbc994ca24`
Delta: `b69a4b5..32f4f8b`
Worktree: `/Users/lesprivilege/Projects/.worktrees/courtwork-agents-transport-20260921` (detached at candidate for review; no source edits)

## Verification

Bounded command, exit 0:

```text
caffeinate -is node --test tests/drt03-agents-transport.test.mjs tests/drt03-agents-api-protocol.test.mjs tests/architecture-boundaries.test.mjs
```

Result: 22/22 passed. Raw log: `/tmp/cw-p03c-final-review.log`.

Portable synthetic loopback probe, exit 0: `/tmp/cw-p03c-final-probe.log`. It set ambient `Authorization`, `User-Agent`, `Idempotency-Key`, `Accept`, `OpenAI-Beta`, `Content-Type`, and an excluded header; verified create and three overlapping event calls; then exercised a cursorless `has_more` page.

## R1 disposition: accepted

The delta fixes the earlier header finding with per-call `AsyncLocalStorage` at `app/runtime/openai-agents-transport.mjs:120-143`. The fetch seam reconstructs all values from the supplied API key, pinned SDK version, operation-specific Accept, beta header, body presence, and the current call's requestId (`:126-135`). It no longer copies SDK-assembled or ambient values.

Probe observations:

- create used synthetic supplied authorization and `OpenAI/JS 7.15.0`, with no idempotency key;
- overlapping event calls carried exactly `req-a`, `req-b`, and `req-c` respectively, despite reverse release order;
- ambient values did not reach the wire.

The focused regression also covers the same ambient set and concurrent identities. I found no remaining R1 issue in this delta.

## R3 disposition: accepted

`listItems` now rejects `has_more:true` without a non-empty `last_id` or final item id at `app/runtime/openai-agents-transport.mjs:213-223`. The adapter still uses the validated cursor fallback at `app/runtime/agents-api-adapter.mjs:561-576`.

The focused test exercises three impossible pages (`data:[]` with absent/empty cursor and an item without an id), and confirms recovery fails with `malformed_response`; it also confirms a valid final item id remains a usable fallback and a complete empty page remains valid. The portable direct probe independently returned `malformed_response` for the cursorless page. This closes the prior partial-history risk.

## Scope note

This review intentionally does not re-open the earlier 204/202 response-body question; the parent disposition treats that premise as rejected because the pinned SDK event call returns void and the official endpoint acceptance is not established by the fixture alone. No live provider, credential, browser, active user port, or full-suite run was used.

Recommendation: accept this R1/R3 delta. The remaining creation identity/lookup limitation stays the separately documented next-C obligation.
