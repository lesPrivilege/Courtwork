# Hermes `/v1/runs` protocol slice · author evidence — 2026-09-27

Author: Claude (Opus 5.5), serial core/frontend writer. Branch `claude/runtime-settings-i1-20260927`, fast-forwarded to main `67cc742`. Source commit `a0d6ea7`. This is author evidence for a standalone synthetic slice: not Host exposure, not live Hermes conformance, and not independent acceptance.

## Source pin

`NousResearch/hermes-agent` at `d7b836ab1c0cddaafc109ed24c9a83b6191cdc88` (v0.21.3), read read-only from the local clean checkout. [`source-pin.sha256`](source-pin.sha256) holds the SHA-256 of the three files read. No Hermes process, provider, configuration, credential or native session was started or read. The wire facts are listed in the owner record and in [`app/docs/hermes-api-runs.md`](../../../../../app/docs/hermes-api-runs.md).

## What was built

| File | Role |
| --- | --- |
| `app/runtime/hermes-api-runs-transport.mjs` | Bounded HTTP/SSE for the four pinned calls. Only an explicit loopback origin; no environment or endpoint discovery. Streaming UTF-8 and SSE framing (`\r\n`, `\r`, `\n` across chunks). Request, byte, frame, stream and idle limits. No retry. `delivery` of `not_sent`, `rejected` or `unresolved`. `close()` only destroys its own connections |
| `app/runtime/hermes-api-runs-adapter.mjs` | Pinned identity and capability ceiling. Frozen admission and continuation intents. Envelope and status validation. Settlement (see below) |
| `app/tests/fixtures/hermes-api-runs-loopback.mjs` | Deterministic stand-in with pinned shapes. Uses a disposable data file, an ephemeral port and a synthetic bearer. Its restart turns durable non-terminal runs into `interrupted` |
| `app/tests/hermes-api-runs.test.mjs` | 22 observable fault cases over real local sockets |
| `app/docs/hermes-api-runs.md` | The bounded API contract |

The settlement the adapter produces:
- **Outcome:** `completed`, `failed`, `cancelled`, `unsupported_activity` or `unknown`.
- **Stream coverage:** `complete`, `gap` or `unavailable`.
- **Text:** the streamed text only, kept apart from the terminal `finalOutput`.
- **Diagnostics:** bounded.

## Exit evidence (all in [`hermes-tests.log`](hermes-tests.log), 22/22)

| Required case | Test and observed result |
| --- | --- |
| Admission | Exact body `{input}` and the Host's key on the wire. 202 gives a native `run_id` with `started`; status reads `queued`. Not completion |
| Identical-key replay / changed-body conflict | Same intent returns the same run with `replayed:true`. A changed body gives `idempotency_conflict`. One native admission |
| Lost response without a replacement intent | The fixture admits and then drops the answer, giving `admission_unresolved` with the intent. Re-admitting the same intent replays the one run; every request used the same key |
| Fragmented Unicode | Pinned ASCII escapes split into 3-byte writes, and raw UTF-8 split into 1-byte writes (parser robustness, not pinned wire). Text arrives whole, including a ZWJ sequence |
| Repeated equal deltas | `ha` ×3 gives `hahaha`, 3 deltas. Observations are only `text.delta` and `terminal`; no invented `run.started` or `message.complete` |
| Malformed / wrong-run events and status | Bad JSON, a missing `run_id`, a missing timestamp, a foreign-run delta and a non-string delta are diagnostics and coverage `gap`; the foreign text never lands. `readStatus` refuses foreign, unknown-status and inconsistent terminal records |
| Unknown events | A well-formed unknown event is a diagnostic only |
| Missing terminal | Stream ends with status `running`: `unknown` + `gap`. Stream ends with status `completed`: completed via status + `gap`, streamed text stays partial, `finalOutput` from status |
| Explicit terminal output | `draft ` streamed, `output` "The final answer." gives `text` and `finalOutput` kept apart |
| Cancellation intent vs confirmed / unknown | Stop gives `stopping`, then a matching `run.cancelled` gives `cancelled`. A stop that is ignored gives `stopping`, then the idle limit, then `unknown`. Exactly one stop and one run in both |
| Owner restart interrupted | Status `interrupted` with the pinned error, giving `unknown`. `reconcile` is status-only: `textRecovered:false`, `activityKnown:false` |
| Not active | A run this process doesn't drive gives 409 `run_not_active`, reported as `not_active`, with no effect |
| Unsupported tool / approval | `tool.started` and `approval.request` are recorded; the outcome is `unsupported_activity`. `approve`, `steer`, `submitToolResult`, `compact` and `replay` refuse before any request |
| No replay | A second `follow` gets 404, giving `unavailable`. Only status is read; streamed text is not claimed |
| Continuation identity | Only from a validated earlier status's `session_id`. A missing, forged, unfrozen or `null` session refuses |
| Bounds and cleanup | Stream-byte, frame and idle limits and the text bound are enforced, and transport connections return to 0. Keepalives keep a slow stream alive and are not events |
| Dispose without mutation | Closes one connection; the server sees 0 sockets. No stop and no other call; the native run stays `running`. Later calls give `disposed` |
| Endpoint and credential | Non-loopback, portless, path-bearing and credentialed URLs are refused. A wrong bearer gives `admission_refused` / `rejected`, and the bearer never appears in the error |

Stability: three consecutive runs, each 22/22.

## Failing before: mutation check ([`mutation-check.log`](mutation-check.log))

The modules are new, so the failing-before evidence injects five contract violations into scratch copies and reruns the same tests. Each is caught by exactly the test that owns that rule:

| Mutant | Caught by |
| --- | --- |
| M1 collapse equal consecutive deltas | repeated equal deltas |
| M2 trust a foreign `run_id` | malformed / foreign / unknown frames |
| M3 stop intent settles as cancelled | stop never confirmed stays unknown |
| M4 unsupported activity counted as success | approval / tool event |
| M5 lost admission retried with a new key | lost admission answer |

## Adjacent checks

[`adjacent-tests.log`](adjacent-tests.log): `drt03-agents-transport`, `drt03-agents-api-protocol`, `runtime-inventory` and `runtime-selection-construction`, 29/29. These cover the Agents precedent and the executor surfaces this slice must not disturb. [`doc-links.log`](doc-links.log): no problems. No full suite: no shared module changed.

## Not done, by contract

- Host registration, the executor allowlist, Store/Core schema, service/runtime composition, UI, permissions and dependencies.
- Running native Hermes or a provider.
- Live endpoints or credentials.
- Tool, approval or steer support.
- Event replay.
- Production Hermes selection.

Nothing here claims a working Hermes Attention Agent.
