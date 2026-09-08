# HC-01 · independent cross-review of the two Core probes

Date: 2026-09-08 (Asia/Singapore). Reviewer: Luna, non-author cross-review. This review re-opened the current Core source and the two probe files, then executed each probe once. It did not modify `app/`, either probe, or any other evidence file. It does not claim product, provider, GUI, legal-quality, or G1–G5 acceptance.

## Fixed tree and probe stability

The checked tree is `/private/tmp/cw-luna-maintenance-core-validation`, branch `codex/luna-maintenance-core-validation`, HEAD `429fdd68febb9998f322a0b53c323651fc8cd7fd`.

Before execution, the probe files were stable and no related probe process was running:

| probe | mtime | size | SHA-256 |
|---|---|---:|---|
| `evidence/luna-two-orders-20260908/core-probe-cas-race.mjs` | `2026-09-08 23:13:25 +0800` | 3976 | `09bd8f74aecb490c334ac9a36eac25da9f19ebd0dc040c1021800802b97c21df` |
| `evidence/luna-two-orders-20260908/core-probe-generic-authority.mjs` | `2026-09-08 23:12:00 +0800` | 3474 | `c779e095f2b703ff1ab0c953776395f4aa7caf81aa1983c2a824906ed1bbac4a` |

The same mtimes, sizes and SHA-256 values were observed after both executions. The CAS probe's `fileURLToPath(new URL('../..', import.meta.url))` resolved to the current repository in the successful run, so no URL/path adjustment was pending for this final execution.

## Probe 1: CAS recheck after an in-transaction source change

Command:

```sh
node evidence/luna-two-orders-20260908/core-probe-cas-race.mjs
```

Exit: `0`.

Observed output:

```json
{"artifact": null, "audits": 0, "candidateStatus": "pending", "decisions": 0, "error": "STALE_INPUT", "integrity": {"foreign_key_check": [], "integrity_check": "ok"}, "matterVersion": 0, "probe": "cas-recheck-after-audit", "sourceVersionAfterRollback": 1, "status": "pass"}
```

The success assertion is internally coherent. The probe seeds one Matter/source/candidate, installs a `HookController` callback, and at `after_audit` calls `inject_source_revision_in_transaction('cas-matter', 2)`. `Store.decide` begins a transaction, writes the audit, hits the callback, then calls `_recheck_binding` before the remaining state writes and commit. The changed source version therefore raises `STALE_INPUT`; the exception path rolls back. The final assertions verify version/source version restoration, pending candidate, no audit/Decision/Artifact, and SQLite/foreign-key integrity.

Source coordinates supporting that reading:

- `app/core/core.py:285-295`: `HookController.hit` invokes the callback inside the current process and can optionally SIGKILL at a named hook.
- `app/core/core.py:593-597`: the probe's source revision helper performs a direct update and requires the caller to already own a transaction.
- `app/core/core.py:772-860`: `Store.decide` begins the transaction, writes audit, calls `after_audit`, rechecks binding, then commits or rolls back.
- `app/core/core.py:650-658`: `_recheck_binding` distinguishes version conflict from source/contract stale input.

Bounded conclusion: **pass for the deterministic post-audit recheck and rollback invariant exercised.** This is not a race between two live writer processes. It does not prove scheduler interleavings, lock contention, or a two-process CAS race; those remain `not_run` by this probe.

## Probe 2: generic Core path and payload authority fields

Command:

```sh
node evidence/luna-two-orders-20260908/core-probe-generic-authority.mjs
```

Exit: `0`.

Observed output:

```json
{"probe":"generic-core-authority","status":"pass","contractVersion":"generic-v1","provider":null,"extension":null,"gui":false,"forgedCandidate":"INVALID","forgedDecision":"INVALID","committedDecisions":0,"committedArtifact":null}
```

The probe uses `CoreClient` directly with a generic contract, null provider, no extension, and no GUI or HTTP service. It saves one valid candidate, then attempts a second candidate carrying `actor` and `status`, followed by a trusted-decision request carrying `actor`. Both attempts return `INVALID`; the original candidate remains pending, Matter version remains 0, and no Decision, audit, or Artifact is committed.

Source coordinates supporting that reading:

- `app/core/bridge.py:148-152`: bridge contexts are exact `{matter_id, run_id}` objects.
- `app/core/bridge.py:612-632`: candidate payloads are checked and bound to the trusted Run context before the Core save.
- `app/core/core.py:131-165`: the candidate schema rejects extra fields and keeps status server-derived.
- `app/core/core.py:168-175`: decision requests are exact and reject an `actor` field before decision work.
- `app/core/bridge.py:648-655,776-777`: `trusted_decide` is a private bridge operation that passes a request to the process-local `TrustedReviewer`.
- `app/core/bridge.py:799-834`: the bridge is a child-process JSONL worker over stdin/stdout; this source contains no public network listener.

Bounded conclusion: **pass for the exercised generic path and payload-level escalation rejection.** `provider:null`, `extension:null`, and `gui:false` are probe inputs/observations, not proof that every host path is independent of those systems.

The actor check is deliberately narrower than process security. It proves that the candidate/decision payload schemas do not accept a caller-supplied actor or status and that these forged requests produce no durable effect. It does not prove that a process already holding the private `CoreClient` cannot call `trusted_decide` with a syntactically valid request: `bridge.py:808` constructs a `TrustedReviewer` for the worker and `operation(...):776-777` dispatches that operation. Host ownership and action/generation checks are a separate seam covered by existing action/adapter tests and source inspection; OS/process isolation or a hostile same-host caller was not tested here.

## Cross-review disposition

| claim | classification | result and limit |
|---|---|---|
| Source change after audit is detected before commit and rolled back | source inspection + CAS probe | Pass for one same-transaction hook injection; not a two-process race. |
| Generic Core path works without NDA/provider/GUI inputs | source inspection + generic probe | Pass for the direct generic bridge path exercised; no broad host-independence claim. |
| Model-shaped actor/status fields cannot escalate payloads | source inspection + generic probe | Pass for exact-schema rejection and zero durable effect. |
| Payload rejection proves process or OS security isolation | probe interpretation | Rejected as unsupported; not demonstrated. |

No probe repair is requested from this cross-review. The existing author report's success claims are supported only within the boundaries above. Any stronger concurrent-writer or process-threat claim needs a separately assigned synthetic test and must not be inferred from these two probes.
