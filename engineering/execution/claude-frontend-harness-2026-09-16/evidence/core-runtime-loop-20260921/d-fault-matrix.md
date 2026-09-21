# P03-D · fault matrix and offline author evidence

2026-09-22 · Claude/Fable, author. Stage D of [the C/D/E loop](../../core-runtime-loop-20260921.md), extending the same owner as [C](c-evidence.md) under the contract's *C failures and D extension boundary*. **Offline only** against the loopback fixture; not a live Agents API result, not independent acceptance, no capability exposed. Tests are in `app/tests/p03d-host-recovery.test.mjs` unless named.

## What D adds

| Addition | Owner | Basis |
|---|---|---|
| Cancel intent → confirmation only by the root turn ending `cancelled`; bounded wait (`cancelConfirmMs`, default 10 s), one last turn read, else `unknown` | gateway `cancelRemote`; store `recordRemoteIntent` admits `cancel` and the delivery of an already-retained result while a Run is `stopping` | adapter's existing `cancelTurn` ("intent only") and settlement rule `cancellation_unconfirmed` |
| Observation recovery: on a lost stream, at most `recoveryAttempts` (default 2) × subscribe → buffer → read items → read session → merge; the snapshot's **current** required actions meet their claims; decisions wait until the batch is whole | gateway `recover`; adapter `reconcile` now also returns the live stream handle and the session status | contract: "Reuse subscribe/buffer/read/paginate/merge" |
| Decisive read of a known root turn (`turns.retrieve`) | transport `getTurn`, adapter `readTurn` (reads only); capability row `session.turns.read` → `supported`/`fixture`, retrieve only | pinned `openai@7.15.0` `sessions.turns.retrieve(turnID, { session_id })` — "Retrieves a turn's current status". Whether a new stream replays missed events is unknown, so recovery does not depend on it |
| Durable root-turn ending: `Run.remoteBinding.rootTurn.terminal = { status, evidence: "turn.event"|"turn.read", nativeRef, observedAt }`; the first observation stands, a different later one is reported as a contradiction | `remote-action-state.mjs` `recordRemoteRootTerminal` | — |
| Unsettled-run fence: a Run whose root turn is known and not seen to end (or that ended `unknown` on a native session before any root turn was attributed) refuses the chat's next remote Run | `admitRemoteRun` / `remoteRunUnsettled` | new input must not be sent into a turn that may still be running |
| Explicit reconciliation `RuntimeService.reconcileRemoteSession(sessionId)`: reads the unsettled root turns and the saved items, appends `resolution` evidence to unknown records (never rewriting them), records root endings. Sends nothing. The Run that ended `unknown` stays `unknown` | service + gateway `inspectSession` (two reads, no stream) | contract: "observation-only until D's concrete protocol evidence permits another action" |
| One retry: an unanswered **input message** is re-sent once under the same request key | gateway `dispatchIntent({ retries: 1 })` for `input` only | `AGENTS_TRANSPORT_REQUEST_IDENTITY.message`: the key is "documented by the SDK for submitted messages". Creation, function results and cancel are never retried |

**Schema note.** `rootTurn.terminal` extends the schema-19 record introduced in C (`eec2244`) before any integration; the `resolution` field was already present. A state file written by the C commit that contains an associated root turn is not valid under D. No such data exists outside test temp directories; this is stated so a reviewer running C data through D is not surprised.

No HTTP route was added for reconciliation (a shared route hunk is outside this lane); see the frontend/route proposal in the [author status](author-status.md).

## Fault matrix

`U` = Run `unknown`; *fenced* = the next remote Run is refused `409 remote_unreconciled`.

| # | Fault | Host behaviour | Durable outcome | Test |
|---|---|---|---|---|
| 1 | User cancels while a governed read waits for approval | read fails closed, its result is retained but **not delivered**; cancel sent once with its request key; root `turn.cancelled` confirms | Run `cancelled`; terminal `cancelled`/`turn.event`; claim `failed`, delivery `none`; chat continues | *cancel is an intent…* |
| 2 | Cancel accepted (202) but never confirmed | bounded wait, one turn read, then give up | `U` `remote_cancellation_unconfirmed`; cancel intent `accepted` (that is not a cancellation); fenced; later reconciliation reads the turn: still running → nothing changes; ended → terminal `turn.read`, chat continues | *an accepted cancel that is never confirmed…* |
| 3 | Cancel reply lost / cancel refused | sent once, never re-sent | `U` `remote_cancel_unknown` / `remote_cancel_rejected`; intent `unknown` / `rejected` | *a cancel whose reply is lost…* |
| 4 | Stream lost mid-turn, service redelivers what was missed | re-subscribe, merge; the answered call is not repeated | Run `completed`; one claim, one read, one submission | *a stream lost mid-turn…* |
| 5 | Stream lost, missed events gone for good | current required action taken from the session snapshot and executed once; terminal read from the turn; text never delivered stays a gap | Run `completed`, terminal `turn.read`; two claims, two submissions | *events missed for good…* |
| 6 | Late/duplicate observation: a required action streamed, then seen again in the recovery snapshot | second sighting meets the receipt | one claim, one read, one submission | *a required action seen on the stream and again…* (C also covers a duplicate on one stream and racing claims) |
| 7 | Contradictory root terminals in one recovery batch | decision deferred until the batch is whole; contradiction wins | `U` `remote_contradictory_terminal`; first ending on record, turn over → not fenced | *contradictory root terminals…* |
| 8 | Root turn cannot be read during recovery (5xx) | no guess | `U` `remote_recovery_failed`; fenced | same test |
| 9 | Unusable item cursor (`has_more` without a cursor) — incomplete history | transport refuses the page; recovery fails closed | `U` `remote_recovery_failed`; fenced | same test |
| 10 | Stream never holds | two recoveries, then stop | `U` `remote_stream_closed_before_terminal`; three stream requests in total | *recovery is bounded…* |
| 11 | Input request lost once | re-sent once under the same key | Run `completed`; one `input` intent `accepted`; both requests carry one key | *an unanswered input is re-sent once…* |
| 12 | Input request lost twice | no third attempt | `U` `remote_input_unknown`; intent `unknown`; fenced | same test |
| 13 | Function-result reply lost, service did consume it, turn ended | never re-sent; reconciliation appends `root_terminal` evidence to the claim and its intent; receipts stay `unknown` | fence lifted by reads only; chat continues on the same native session | *a lost submission reply is never re-sent…* |
| 14 | Function-result reply lost, saved history shows the output, turn still running | delivery resolved by the `function_call_output` item; the turn is not over | action resolved `native_item`; still fenced `turn_not_ended` | *a delivery the saved history shows…* |
| 15 | Host restarts with the submission in flight (state captured mid-request) | startup fences; reconciliation finds nothing decisive while the native call is still required; after the turn ends elsewhere a read decides | `U` → resolved `root_terminal`; next Run continues the **same** native session, no replacement | *after a Host restart mid-submission…* |
| 16 | Lost creation reply | nothing to observe | create intent `unknown`, reported `no_native_locator`, zero requests; fenced for good (contract) | *a lost creation has no native locator…* |
| 17 | **SIGKILL** of a real Host process while the claimed read waits for approval | next process: Run `unknown`, execution `unknown`, no request, no read, fenced; reconciliation: `turn_not_ended` | as stated | *SIGKILL while the claimed read waits…* |
| 18 | **SIGKILL** while the result submission is in flight | next process: execution `succeeded`, delivery `unknown`, exactly the one earlier read, no request, fenced | as stated | *SIGKILL while the result submission is in flight…* |
| 19 | Evidence that is not evidence | the store refuses a `root_terminal` resolution for a turn not on record as ended, and any resolution of a `create` | `REMOTE_RESOLUTION_INVALID` | inside test 14 |

Persisted read results are reused only as receipts: a retained result is delivered at most once, by the Run that produced it, and never after a restart. No tool is re-run to find anything out.

## Retained unknowns and limits

- A native turn left waiting for a result this Host will not re-send (rows 15, 17, 18, a delivery the service refused, or `REMOTE_CALL_LIMIT`) keeps the chat fenced until that turn ends by other means. Ending it from the Host — a cancel outside any Run, or delivering an error result after a restart — would be a new remote mutation in recovery and is **not implemented**; it is returned to Astra as a decision.
- A Run that never learned its root turn (no `turn.created`) and ended `unknown` cannot be reconciled: there is no turn id to read.
- Live-service behaviour for every row is unknown: replay on re-subscribe, the timing of `turn.created`, what `turns.retrieve` reports during `requires_action`, whether `function_call_output` items appear as modelled.

## Commands and results

See the [author status](author-status.md#d--checks).
