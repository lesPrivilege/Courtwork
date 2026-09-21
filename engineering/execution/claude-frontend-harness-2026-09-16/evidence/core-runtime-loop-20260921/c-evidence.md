# P03-C · offline author evidence

2026-09-21 · Claude/Fable, author. Evidence for stage C of [the C/D/E loop](../../core-runtime-loop-20260921.md) against [the Host contract](../../p03c-host-consumer-contract-20260921.md) exit list. **Offline only**: the remote service is the loopback fixture `app/tests/fixtures/agents-api-loopback.mjs`. This is not the account-authorized live C milestone, not independent acceptance, and exposes no capability (`exposureOf` still requires `verification:"live"`).

## Path exercised

`startServer` → `/api/v5` routes → `RuntimeService.#createRun` / `#executeRun` → `RuntimeStore` schema 19 → `agents-host-gateway` → `agents-api-adapter` → `openai-agents-transport` → unmodified `openai@7.15.0` → real loopback sockets. The function executed is the existing `repo_read` from `createRepositoryTools`, wrapped by the existing `governTools`, against a disposable synthetic Git repository; its own `repository.read` receipt is asserted. Runtime selection is the explicit `createRuntime({ runtimePort })` injection; the default remains Pi.

## Contract exit list → test

All in `app/tests/p03c-host-consumer.test.mjs` unless named.

| Contract item | Test (abridged title) | What is asserted |
|---|---|---|
| Production admission, SDK/adapter required action, governed read, exact retained result, native root terminal, later input on the same binding | *admission → create intent → … → later input on the same binding* | serialized `agent.tools` (only `repo_read`, owner bounds, closed shape, four keys); no creation idempotency key; Session/Run binding records; root turn from `turn.created`; claim → `succeeded` → delivery `accepted`; retained bytes equal the file's bytes and equal the single submitted `output`; the submission carries the intent's request key; `repository.read` + `tool.start/result` in the timeline; second Run sends one `input` on the same native session and creates nothing |
| Denied | *policy deny and a user's deny never read…* | policy `deny` and a human `deny` each become a retained `failed` result delivered as `success:false`; no `repository.read` |
| Unknown / out-of-scope | *unadvertised, wrong-turn, malformed and out-of-scope calls…* | unadvertised name, foreign turn id, extra key, coerced type, non-JSON arguments → `rejected` before any tool; `../outside.txt` reaches the governed reader and is refused there; six error results, no read receipt |
| Revoked scope | same test as denied, second half | a revoke while the read waits for approval goes through the existing owner, which cancels the Run: the read never happens, its failure is retained and not delivered; the next Run is admitted with a null scope, has no reader, and the call is `tool_unavailable`. *(Corrected in D: the C commit's version of this row wrongly said the Host refuses a binding change during a Run. With C's local-only cancel that Run ended `unknown`; D's confirmed cancel ends it `cancelled`.)* |
| Duplicate concurrent call | *a native call observed twice…* | one claim, one execution, one submission for a repeated required action; three racing `claimRemoteCall` → exactly one non-idempotent; a different request on the same tuple → `REMOTE_CALL_CONFLICT` |
| Missing root identity | *without attributable root identity…* | no `turn.created` → the call is refused (`root_turn_unknown`), the loopback's terminal does not settle the Run, stream loss → `unknown` |
| Creation loss | *a lost creation reply stays unknown…* | service created a session the Host cannot name: no binding, no native id, one create attempt, next Run `409 remote_unreconciled`; a decisive 400 fails the Run and the chat may create again |
| Submission loss | *a lost submission reply keeps the retained result…* | `succeeded` + delivery `unknown`, bytes still readable, one submission, one read, chat fenced |
| Interrupted execution / result persistence, restart fences | *restart fences…* | state captured while `claimed` (reader waiting for approval) and while the submission is in flight; reopened Host: Run `unknown`, execution `unknown` / delivery `unknown`, approvals expired, next Run refused, **zero** new remote requests and zero new reads |
| Replay safety (C0 note unknown) | *an earlier stream replayed to a later run…* | a fresh process with `replay:"all"`: the old required action meets its receipt, the old turn is not re-associated, old text and terminal do not reach the new Run |
| Runtime ownership, configuration/credential identity | *a chat stays with its runtime…* | Pi refuses a remote-bound chat, the remote runtime refuses a Pi chat (nothing created), a changed credential generation cannot reuse the binding |
| Migration: malformed, interrupted, unsupported-newer, repeated-open, old Host | `app/tests/schema19-upgrade.test.mjs` | see [author status](author-status.md) |
| Transport forwarding, adapter attach | `drt03-agents-transport.test.mjs`, `drt03-agents-api-protocol.test.mjs` | allowlist + four keys + refusals before the wire; `attachSession` is local only |

"Interrupted result persistence" (bytes retained, claim not yet updated) leaves the same durable state as "interrupted execution" — a `claimed` call — and is covered by that fence; the orphaned content-addressed object is unreferenced.

## Retained unknowns

Whether the live service emits `turn.created` before a first required action; whether a new event stream replays earlier events; whether `arguments` arrives as an object or a string (both accepted); any consumption acknowledgement for a function result (none is assumed); every live-service timing and error shape. None of these is claimed.

## Commands and results

`node --test tests/p03c-host-consumer.test.mjs` 10/10 · `tests/schema19-upgrade.test.mjs` 4/4 · `tests/drt03-agents-transport.test.mjs` + `tests/drt03-agents-api-protocol.test.mjs` 21/21 · `npm --prefix app test` 1402/1402 exit 0 · `node tools/check-doc-links.mjs` 0 problems. Qualifications are in the [author status](author-status.md#c--checks).
