# P03-C independent transport review

Date: 2026-09-21
Candidate: `b69a4b58b0fd12f271f1b8409bf8a99a628fcc68`
Worktree: `/Users/lesprivilege/Projects/.worktrees/courtwork-agents-transport-20260921`
Base/order reviewed: P03-C released candidate, source tree clean at review start.

## Scope and checks

This was a non-author, read-only review of the transport/adaptor seam. I read the P03-C order/evidence, the candidate transport and adapter, and ran synthetic loopback probes plus the bounded existing suites. No provider, browser, credentials, active user ports, source edits, or full-suite rerun were used.

Focused command (exit 0):

```text
caffeinate -is node --test tests/drt03-agents-transport.test.mjs tests/drt03-agents-api-protocol.test.mjs tests/architecture-boundaries.test.mjs
```

Result: 22/22 total tests passed in the combined run (13 transport cases plus protocol/adapter/architecture coverage). Raw output is `/tmp/cw-p03c-independent-review.log`.

Synthetic probes used the repository loopback fixture and only synthetic headers/body values. They covered allowlisted ambient headers, event responses 200 `{}`, 204 empty, 200 empty, and item page `{data:[],has_more:true}`.

## Findings

### Blocker: ambient custom headers can replace the caller's idempotency key

With `OPENAI_CUSTOM_HEADERS` set to the SDK-supported newline form:

```text
Authorization: Bearer ambient
User-Agent: ambient-agent
Idempotency-Key: ambient-key
```

`createOpenAiAgentsTransport` sent `ambient-key` on the event POST, even though the caller supplied `requestId: req_probe`. It also forwarded the ambient user agent. The authorization value remained the explicit synthetic API key, but the idempotency identity did not.

The source path is `app/runtime/openai-agents-transport.mjs:114-121`: the SDK is constructed while the environment is still visible, then the custom fetch forwards every name in `WIRE_HEADERS` (`:38`, `:119`). `sendEvents` supplies the caller key at `:151-157`, but the SDK's default custom header wins before the fetch allowlist sees it. This violates the transport's stated one-request/one-caller-owned-key contract and can make retries/reconciliation address the wrong remote mutation.

Smallest fix: prevent ambient custom headers from supplying security/identity headers for this client, or explicitly overwrite `authorization`, `user-agent`, and especially `idempotency-key` at the final fetch boundary from transport-owned values. Add a synthetic regression that sets all three ambient names and asserts the final event request uses the explicit API key/SDK user-agent and caller request ID.

### Blocker: malformed 2xx event acknowledgements are accepted

The synthetic event endpoint returned HTTP 200 with `{}` and, separately, HTTP 200 with an empty body. Both produced `{accepted:true}`. HTTP 204 also produced `{accepted:true}`.

`sendEvents` awaits `sessions.events.create` and returns success unconditionally at `app/runtime/openai-agents-transport.mjs:157-159`. The existing fixture's expected success is 204 (`app/tests/drt03-agents-transport.test.mjs:45`), so a successful status with an unusable body is currently indistinguishable from the expected acknowledgement. If 204 is the contract, require the SDK/raw response status/body shape or otherwise reject these malformed success responses as `malformed_response`; retain 204 as the accepted case. Add 200 `{}` and 200 empty-body regressions.

### Blocker: impossible pagination can be treated as an empty/partial history

The synthetic item endpoint returned `{data:[],has_more:true}`. `transport.listItems` returned it as valid. Its validation at `app/runtime/openai-agents-transport.mjs:194-203` checks only `data` array and boolean `has_more`; it does not require a forward cursor when `has_more` is true.

The adapter then collects the empty page and silently returns it at `app/runtime/agents-api-adapter.mjs:561-576`: with no `last_id` and no final item ID, `listAllItems` returns `collected` rather than raising. During recovery this can reconcile an empty history while the service explicitly says more pages exist. Smallest fix: reject a `has_more:true` page without a usable `last_id` (or non-empty final item ID) at the transport/adaptor boundary, and add the exact empty-page regression.

## Accepted behavior / limits

The focused tests cover pre-abort, in-flight abort/disposal, late responses, single-attempt mutation behavior, valid cursor pagination, malformed JSON/page responses, signal/requestId forwarding, and no transport import into the adapter. No additional issue was found in those paths. Creation still has no SDK wire identity and no lookup; that is an explicitly documented next-C obligation, not a new finding here. No live provider or remote idempotency guarantee was inferred.

## Adoption recommendation

Do not accept this transport for a real Host binding until the three response/header boundaries above are corrected and regression-tested. The smallest follow-up remains transport-local: final header provenance, strict event acknowledgement validation, and impossible-page rejection; no UI, Host schema, or architecture expansion is needed.
