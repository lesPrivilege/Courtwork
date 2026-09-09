# BE-30 independent verification

2026-09-09. Independently verified fixed commit `757ea768b8ea9702c7534f5f67b950bbd9dafc7d` in `<isolated-checkout>`. The review read `app/docs/permission-cas.md` and the commit diff before exercising the HTTP route. Only the two files in this evidence directory were written; product sources and the author's tests were not changed or committed. The pre-existing modification to `engineering/execution/2026-09-09-harness-next/README.md` was preserved.

## Contract and implementation checked

The contract says permission answers accept independently optional `expectedContentSha256` and `expectedToolCallId`, preserve the old body when omitted, return 400 `invalid_input` for malformed values, compare inside the queued store mutation, and return 409 `version_mismatch` without changing the question, Run, events, bytes, or waiter (`app/docs/permission-cas.md:3-17`). The implementation validates the optional fields before calling `RuntimeStore.resolveQuestion` and maps the mismatch to `version_mismatch` (`app/server/service.mjs:1171-1210`); the store performs the comparison in the same `_mutate` transaction before resolving or emitting events (`app/server/store.mjs:493-515`).

## Independent execution

Command:

```text
node evidence/harness-next-20260909/be30-independent.mjs
```

The command exited 0 against independent temporary `dataDir` instances, `port: 0`, and the local-fake provider. Results:

| Probe | Result |
|---|---|
| Wrong content hash and wrong tool-call ID | Both returned `409 version_mismatch`; published state, persisted `runtime-state.json`, workspace tree, pending question, Run status, and live waiter stayed unchanged. A subsequent matching allow resolved exactly once and wrote bytes with the reviewed hash. |
| Optional fields and old client | Legacy `{decision:"allow"}`, hash-only allow, and tool-call-only deny each resolved correctly. The deny case produced no artifact. |
| Malformed values | Eight null/type/format/length probes returned `400 invalid_input`; an unrelated field remained rejected with `400 unknown_field`. The question and persisted state stayed unchanged until a valid cleanup answer. |
| `ask_user` separation | `{answer, expectedContentSha256}` was rejected with HTTP 400 and left the question pending; the old `{answer}` body then completed the Run. |
| Matching concurrent answers | Two matching allow requests produced `[200, 409]`; the loser was `question_unavailable`, with one resolution event and one artifact. |
| Cancel versus queued answer | Cancel returned 200 and the queued matching answer returned `409 question_unavailable`; the Run ended cancelled, the question was cancelled, and no permission decision or artifact was recorded. |
| Queued CAS | A synthetic queued payload change was published while the answer was already queued. The stale answer returned `409 version_mismatch`, leaving the question pending, Run waiting, live waiter, and resolution events intact; cleanup then cancelled the Run. |

The full machine-readable output is emitted by `be30-independent.mjs`; all seven probe groups reported `status: "passed"`.

## Independent negative probes and outcome

The wrong-hash/wrong-call no-side-effect checks and the queued synthetic payload-change check were independently designed counterexamples for stale approval and queue-order bugs. They would have exposed a resolution, event, file write, waiter loss, or generic error if present. No product defect was exposed at this commit, so no source fix was made. The queued payload mutation is test-only failure injection, matching the contract's statement that production permissions are currently immutable.

## Scope boundary

This is non-author acceptance evidence for BE-30 only. It does not claim product acceptance, BE-31/32/33 delivery, persisted schema changes, migration, UI changes, or deployment. The author-reported 16/16 directed checks remain separate from this independent run.
