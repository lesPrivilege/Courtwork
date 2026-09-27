# Hermes API-server `/v1/runs` · standalone adapter contract (first slice)

Status: **standalone, synthetic conformance only.** Modules: [`hermes-api-runs-adapter.mjs`](../runtime/hermes-api-runs-adapter.mjs) and [`hermes-api-runs-transport.mjs`](../runtime/hermes-api-runs-transport.mjs). Fixture: [`hermes-api-runs-loopback.mjs`](../tests/fixtures/hermes-api-runs-loopback.mjs). Tests: [`hermes-api-runs.test.mjs`](../tests/hermes-api-runs.test.mjs).

- **Not in the product.** Nothing registers these modules with the Host. There is no executor allowlist entry, no RuntimeStore field and no production selection.
- **No live service.** No Hermes process or provider has been run against them.
- **Next step.** Host admission is a separate, later contract.

Owner record: [core runtime loop · Hermes protocol slice](../../engineering/execution/claude-frontend-harness-2026-09-16/core-runtime-loop-20260921.md).

## Pinned source

The source is `NousResearch/hermes-agent` at `d7b836ab1c0cddaafc109ed24c9a83b6191cdc88` (v0.21.3). It was read directly from:
- `gateway/platforms/api_server_runs.py`;
- `gateway/platforms/api_server.py`, for `_check_auth`, `_openai_error` and `_sse_frame`;
- `gateway/platforms/api_server_run_idempotency.py`.

Adapter identity is `hermes-api-runs`, revision `hermes-agent@d7b836ab…/api-runs-v1`, protocol `hermes-api-server-runs`.

## Wire consumed

| Call | Pinned behaviour this slice relies on |
| --- | --- |
| `POST /v1/runs` | See **Admission** below. |
| `GET /v1/runs/{id}` | `{object:"hermes.run", run_id, status, created_at, updated_at, session_id, model, last_event, …}`. See **Run status** below. |
| `GET /v1/runs/{id}/events` | See **Event stream** below. |
| `POST /v1/runs/{id}/stop` | Active run: `{run_id, status:"stopping"}`, which is an intent. Terminal run: the status body. Not driven by this process: 409 `run_not_active`. |

**Auth and errors.** Every call uses `Authorization: Bearer`. Auth failure is 401 `{error:{message,type:"gateway_auth_error",code:"gateway_auth_failed"}}`. Other errors use `{error:{message,type,param,code}}`.

**Admission** (`POST /v1/runs`):
- **Idempotency-Key.** Must be 1–255 visible ASCII characters, else 400 `invalid_idempotency_key`.
- **Missing input.** 400 "Missing 'input' field".
- **Body sent.** Exactly `{input}`, or `{input, session_id}` for a continuation.
- **First admission.** 202 `{run_id, status:"started", replayed:false}`.
- **Same key and same body.** 202 `{run_id:<original>, status:<current>, replayed:true}` plus `Idempotency-Replayed: true`.
- **Same key, changed body.** 409 `idempotency_key_conflict`.

**Run status** (`GET /v1/runs/{id}`):
- **Values.** `queued`, `running`, `stopping` and `waiting_for_approval`. Terminal values are `completed`, `failed`, `cancelled` and `interrupted`.
- **Terminal fields.** `completed`, `partial` and `interrupted`, plus `output` and `usage`, or `error`.
- **Owner loss.** A durable non-terminal record whose owner is gone reads as `interrupted`, with `error:"The gateway restarted before this run settled."`.

**Event stream** (`GET /v1/runs/{id}/events`):
- **Framing.** SSE `data: <json>\n\n`, with `ensure_ascii`, so non-ASCII arrives as `\u` escapes. Keepalive is `: keepalive`; the end is `: stream closed`.
- **One subscriber.** Once that subscriber ends, the run's stream is gone and a later subscribe gets 404.
- **Envelope.** `{event, run_id, timestamp, …}`. There is **no event id, sequence or replay cursor.**
- **Text.** `message.delta` `{delta}` carries the text.
- **Terminal event.** `run.<status>` carries the terminal fields.
- **Not emitted.** There is no `run.started` and no `message.complete`.

## What the adapter guarantees

- **Admission is a receipt, not completion.**
  - The Host supplies the idempotency key, and the frozen intent it builds is the exact body sent.
  - An unresolved admission (lost answer, timeout, 5xx, unreadable 202) is returned as `admission_unresolved` carrying the intent. The caller recovers only by admitting **that same intent** again, which replays the one run. Nothing retries on its own or makes a new key.
  - A conflict is `idempotency_conflict`. A refusal (4xx) is `admission_refused` with `delivery: rejected`.
- **Validated observations only.** An event must be a plain object with a string `event`, the expected `run_id` and a finite `timestamp`.
  - Malformed frames, foreign-run frames and malformed deltas or terminals become bounded diagnostics. They are dropped, and they mark stream coverage `gap`.
  - Well-formed unknown events are diagnostics only.
  - A foreign run's text never lands.
- **Text is only what was streamed.** Equal consecutive deltas are separate text; nothing on the wire makes them duplicates. The terminal `output` is reported as `finalOutput`, kept apart from `text`, and only when a terminal record actually carried it. Missed text is never rebuilt from status.
- **Settlement, per run.** `outcome` is one of:
  - `completed`: a matching `run.completed` event or status, and no unsupported activity seen;
  - `failed`;
  - `cancelled`: only a matching terminal `cancelled`, never a stop answer;
  - `unsupported_activity`: completed after a tool, approval, reasoning, subagent or steer event;
  - `unknown`: no terminal evidence, a stop that was never confirmed, or `interrupted`.

  `streamCoverage` is `complete`, `gap` or `unavailable`. When the stream ends without a terminal, **one** status read decides only whether the run is known to have ended.
- **Stop is an intent.** It returns `stopping`, `already_terminal` (with its status), `not_active`, `refused` or `unresolved`. It is sent once, and never again on its own.
- **Recovery is status only.** `reconcile()` reports `evidence:"status_only"`, `textRecovered:false` and `activityKnown:false`. `interrupted` settles as `unknown`.
- **Continuation needs an observed session id.** It uses only a `session_id` from a status this adapter validated for an earlier run. Absence refuses; nothing is guessed from titles or current state.
- **Unsupported operations refuse before any request.** These are steer, approval, tool results, compaction and replay. Tool, approval, reasoning and subagent events are recorded and never answered or executed.
- **Dispose** closes only the transport's own connections. It sends no stop and no delete, and the native run is left as it was.

## Transport bounds (defaults; overridable per instance)

- **Endpoint.** Only an explicit `http://127.0.0.1|localhost|[::1]:<port>` origin. Nothing is read from the environment, and there is no endpoint discovery. The bearer value is never echoed in errors.
- **Limits.**

  | Limit | Default |
  | --- | --- |
  | Request timeout | 10 s |
  | JSON body | 256 KiB |
  | SSE frame | 256 KiB |
  | Stream total | 8 MiB |
  | Stream idle (keepalive resets it) | 60 s |
  | Streamed text | 1 Mi characters |
  | Input | 64 Ki characters |
  | Diagnostics kept | 32 (the rest are counted) |

- **Stream decoding.** UTF-8 is decoded in streaming mode and fails on invalid bytes. `\r\n`, `\r` and `\n` are all handled across chunk boundaries.
- **Failed mutations** carry `delivery`: `not_sent`, `rejected` or `unresolved`.

## Not claimed

- Live Hermes conformance, provider reachability or model quality.
- Native tool isolation, approvals, steer, event replay, cron, notification delivery or browser control.
- Exactly-once streaming across reconnects.
- Any Host, Store or Work Core effect.
