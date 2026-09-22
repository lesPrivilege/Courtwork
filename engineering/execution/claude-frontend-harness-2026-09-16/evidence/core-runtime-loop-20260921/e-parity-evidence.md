# P03-E · same repository read / write / check — parity evidence

2026-09-22 · Claude/Fable, author. Stage E of [the C/D/E loop](../../core-runtime-loop-20260921.md). **Offline only**; not a live Agents API result, not independent acceptance, no capability exposed, and no Work Core acceptance: a completed check, a model answer or a native turn grants none. Tests: `app/tests/p03e-write-check-parity.test.mjs`.

## What changed in product source

One line of policy: the accepted transport's function allowlist is now `repo_read`, `repo_write`, `check_run` (`AGENTS_TRANSPORT_FUNCTION_TOOLS`). Nothing else. The remote consumer reaches the **existing** tools — `createRepositoryCandidateTools` (`repo_write`) and `createCheckTools` (`check_run`) — built by the same `#executeRun` code as for Pi and wrapped by the same `governTools`, so the approval question, its `permissionContext` identity, the stale-approval guards (`candidate_changed`, `write_conflict`), `prepareRepositoryWrite` / `settleRepositoryWrite`, `recordCheckStarted` / `recordCheckSettled`, the fixed recipe catalog and the process-group runner are the ones Pi uses. There is no second permission engine, no arbitrary shell, and no fork of the repository, candidate or check owners. Which functions a native session is given follows the Run's admitted scope: without an active candidate neither tool exists, so neither is declared (asserted in C's first test and in E's third).

The Host's write receipt is keyed by the native `call_id` exactly as it is keyed by Pi's tool-call id, so a repeated native call meets the existing `requestId` idempotency of `prepareRepositoryWrite` as well as its remote claim.

## Method

One scenario function drives two Hosts through the same `/api/v5` routes: the unchanged Pi baseline (`boot()`, model side = the fake provider's `/fixture script`) and the new consumer (`boot({ runtimePort })`, model side = the loopback plan), both asking for the same tool calls against **one shared, read-only source repository** and the same fixed candidate id. For each Run the Host-owned facts are collected in order — `permission.*`, `repository.*`, `check.started`, `check.settled`, `tool.result` — plus the candidate, diff and effects routes, and the same three routes on a Host reopened from the data directory. Per-Host identity is removed (uuids, call ids, timestamps, durations, process stdout/stderr, inode/device, temp paths) and the two transcripts must be `deepEqual`. Absolute assertions come first so parity cannot be two equal mistakes. Assistant prose is excluded: it is the model's, not the Host's.

## Cases

| Case | Driven | Asserted absolutely | Parity |
|---|---|---|---|
| Fixed check before the fix | `check_run node-test` → allow | `check.settled` `completed`, exit 1 | ✔ |
| Exact write → approval → fixed check | one Run: `repo_write` of the known fix with `expectedSha256`, then `check_run` → allow, allow | write approval names path, exact content hash, candidate id, write revision 0, expected hash; check approval names recipe `node-test` v1, argv `["--test"]`, candidate at **write revision 1**; `check.settled` exit 0; candidate file equals the fix; source checkout unchanged | ✔ approvals, receipts, results |
| Matching diff / effects / reopen | candidate, diff, effects routes; then a Host reopened on a copy of the data directory | diff contains the fix; the reopened Host returns the same three documents | ✔ |
| Deny | `repo_write` → deny | Run `completed`, file absent, zero write effects | ✔ |
| Stale | file edited between the question and the allow | the concurrent edit survives, zero write effects | ✔ |
| Cancel | approved `check_run` on a candidate with a 20 s test, cancelled once `check.started` exists | Run `cancelled`; `check.settled` `cancelled` still recorded (RD-009) | ✔ — on the remote runtime the cancel is D's intent + root `turn.cancelled` confirmation |
| Unknown | the state a Host killed mid-check would leave, opened by the next Host | Run `unknown`; `check.settled` `unknown` / `check_unknown_after_restart`; no check re-executed | ✔ |
| Revoked | candidate revoked while a write waits for approval | revoke `200`, Run `cancelled`, candidate `revoked`, nothing written | ✔ |
| Remote-only | two `repo_write` calls in one Run, the second with 17 KiB of text | declared tools are exactly the three; claim `succeeded`/`accepted` with the candidate in its scope; the write effect's `requestId` is the native call id; the oversized call is `rejected` before any approval and prepares no effect | n/a |

An unknown **write** outcome (a `prepared` effect at restart) is decided entirely inside `RuntimeStore.open()` and `settleRepositoryWrite`, which are runtime-independent and covered by their existing owner tests; on the remote runtime the existing `abort` it triggers now sends D's cancel. It cannot be produced deterministically through either service path and is not claimed as driven here.

## Parity gap returned to Astra

E is **bounded scenario parity** — the same Host record for the same driven scenarios — not equal maximum write capability. The contract bounds native function arguments to **16 KiB**. Pi's `repo_write` accepts up to 4 MiB of text. On the remote consumer a larger write is refused as `invalid_arguments` before any approval. This is the contract's ceiling, not a defect, but it is the one place the two runtimes differ for the same tool; raising it is Astra's decision ("material increases return to Astra"). *Parent disposition 2026-09-22: keep the ceiling; declare the effective bound at later real exposure.*

## Frontend contract gaps (proposals; 06d untouched)

None new for write/check: the approval payloads, receipts and routes are byte-for-byte the existing ones, which is what the parity comparison shows. The gaps recorded in the [author status](author-status.md#frontend--route-contract-gaps-owner-proposals-no-06d-edit) (reconciliation route, new error/notice codes, `remoteBinding` projection) stand.

## Commands and results

See the [author status](author-status.md#e--checks-and-final-handoff).
