# HC-01 · Harness Core independent verification

Date: 2026-09-08. Reviewer: Luna, bounded non-author verification.

This slice checks the generic Core owner, cross-Session work continuity, producer absence, CAS/idempotency/trusted-actor boundaries, and failure recovery. It does not make a product-acceptance, legal-quality, provider, UI, or G1–G5 claim.

## Checked tree and fixed references

The assigned worktree was `/private/tmp/cw-luna-maintenance-core-validation` on branch `codex/luna-maintenance-core-validation`, at `429fdd68febb9998f322a0b53c323651fc8cd7fd`. The initial `git status --short --branch` was clean. The parent and other workers later added their own order/evidence files in this shared worktree; I did not edit those files or any product source.

`npm --prefix app ci` was run once in this tree because `app/node_modules` was absent. It used the checked-in lockfile, installed 277 packages, and reported 0 vulnerabilities. No credentials, paid provider, network provider, or personal data was used by the probes.

The fixed delivery references consumed here are:

- Harness Core delivery `d6247a8e27dc512a00fd113c9fec9835d24d6594`; its tested product bytes are fixed at `133269184468f1adf3b38acfc59091818daeb8e8` in [the delivery receipt](../harness-core-20260908/README.md). Both revisions are ancestors of the checked HEAD (`git merge-base --is-ancestor` passed).
- The delivery receipt records the author-run `npm --prefix app test` result as 170/170 and smoke as pass. That is historical author evidence, not this independent run and not a product completion count.
- The earlier independent Core and adapter reports at `aaa61ebc40dae16332d0d5addf538d03072eec0a` are consumed as historical bounded evidence in [core-independent.md](../harness-core-20260908/core-independent.md) and [adapter-independent.md](../harness-core-20260908/adapter-independent.md). Their claims are not relabeled as current-HEAD test results.

## Source inspection

The generic Core module states that it has no provider, network, GUI, shell, or global-state dependency at [app/core/core.py:1](../../app/core/core.py#L1). `Store` owns the SQLite state/audit tables ([core.py:310](../../app/core/core.py#L310)); `save_candidate` validates an exact candidate shape and binds it to the trusted Matter/Run context ([core.py:438](../../app/core/core.py#L438)); and `decide` requires a private capability, uses the fixed trusted actor by default, performs CAS/source checks, and commits audit, Artifact, Decision, and receipt in one transaction ([core.py:772](../../app/core/core.py#L772)). `ModelDispatcher` exposes only source-read and candidate-submit calls and rejects other model operations with `AUTHORITY_DENIED` ([core.py:948](../../app/core/core.py#L948)).

The Node bridge is a private JSONL process boundary with no public network server ([app/core/bridge.py:1](../../app/core/bridge.py#L1)). `open_or_initialize` takes an exclusive POSIX lock and fails a second owner with `DB_IN_USE` ([bridge.py:242](../../app/core/bridge.py#L242)); open Run/Matter binding and terminal admission are checked before candidate writes ([bridge.py:381](../../app/core/bridge.py#L381), [bridge.py:612](../../app/core/bridge.py#L612)); and the trusted decision operation accepts only the request envelope, leaving the actor to the trusted reviewer ([bridge.py:648](../../app/core/bridge.py#L648)). Candidate-bound historical source reads are checked against the Matter and candidate source revision ([bridge.py:745](../../app/core/bridge.py#L745)).

Producer absence is handled at the service seam: a bound Core Matter is projected read-only when its producer is unloaded or missing ([app/server/service.mjs:673](../../app/server/service.mjs#L673)). The existing adapter reconciliation path queries durable Core state after a finish failure and closes an orphan active Core Run as `unknown` when needed ([app/extensions/work-adapter.mjs:417](../../app/extensions/work-adapter.mjs#L417)); the service invokes it while retaining `extension_finish_failed` ([app/server/service.mjs:1019](../../app/server/service.mjs#L1019)).

## Existing coverage replayed at current HEAD

Command:

```sh
node --test app/tests/work-core.test.mjs \
  app/tests/work-continuity.test.mjs \
  app/tests/work-http-recovery.test.mjs \
  app/tests/work-actions.test.mjs \
  app/tests/work-settlement.test.mjs
```

Result: **18 passed, 0 failed, 0 cancelled**. The complete output is in [core-existing-tests.log](core-existing-tests.log).

The relevant established coverage is separated below by boundary:

| Boundary | Evidence type | Result and limit |
|---|---|---|
| Generic Core lifecycle, CAS, idempotent receipt replay, immutable revision/history, single worker | existing test: `app/tests/work-core.test.mjs` | Passes at current HEAD; direct synthetic Core data. The second-worker check is exclusive ownership, not multi-user identity. |
| Same Matter in a new Session, project scope, logical Session deletion, producer-absent read-only history, historical source | existing test: `app/tests/work-continuity.test.mjs` | Passes; Core history remains queryable with `extension:null`, `readOnly:true`, and no actions after restart without the producer. |
| SIGKILL before commit and after commit-before-ACK, receipt retry, durable SQLite observation, continuation in a new Session | existing test: `app/tests/work-http-recovery.test.mjs` | Passes; pre-commit retry creates one effect, post-commit retry replays one receipt, and continuation completes. Synthetic process crashes only. |
| Versioned human revision, stale source/CAS refusal, caller actor rejection, active Run/unloaded/incompatible mutation denial | existing test: `app/tests/work-actions.test.mjs` plus HTTP recovery | Passes; host generation and action checks are exercised through the service. |
| Extension finish failure, unknown settlement, after-write acknowledgement loss, partial tool events | existing test: `app/tests/work-settlement.test.mjs` | Passes; host/Core uncertainty is retained and no finisher replay is performed in the injected loopback cases. |

These test totals overlap and are evidence counts only; they are not a product maturity score.

## New independent probes

### Generic bridge authority and dependency boundary

Command:

```sh
node evidence/luna-two-orders-20260908/core-probe-generic-authority.mjs
```

The probe uses `CoreClient` directly with `contractVersion: "generic-v1"`, `provider: null`, `extension: null`, and no server, NDA adapter, or GUI. It saves one valid generic candidate, then submits a model-shaped candidate carrying extra `actor` and `status` fields and a trusted-decision request carrying an extra `actor` field. Both are rejected as `INVALID`; the original candidate remains `pending`, Matter version remains 0, and no Decision, audit, or Artifact is committed. The exact output is in [core-probe-generic-authority.log](core-probe-generic-authority.log).

This is evidence that the generic bridge accepts a non-NDA/non-UI payload and rejects these payload-level escalation fields. It does not by itself prove that a caller who already possesses the private `CoreClient` cannot invoke a syntactically valid trusted decision; that trust boundary is provided by the host tool/action seam and is covered separately by the existing action/adapter tests and source inspection.

### CAS recheck after an in-transaction source change

Command:

```sh
node evidence/luna-two-orders-20260908/core-probe-cas-race.mjs
```

The probe uses the generic Python `Store` directly. A `HookController` changes the Matter source revision at the `after_audit` hook, before the decision transaction commits. The post-audit binding recheck returns `STALE_INPUT`; rollback leaves Matter version 0/source version 1, the candidate `pending`, zero audits, zero Decisions, no Artifact, and SQLite integrity `ok`. The exact output is in [core-probe-cas-race.log](core-probe-cas-race.log).

This is a deterministic same-transaction hook injection of the TOCTOU boundary. It is **not** a race between two live writer processes and is not reported as such. The independent single-owner/lock and host-wide admission evidence remains the existing coverage listed above.

## Status matrix

| HC-01 check | Classification | Bounded conclusion |
|---|---|---|
| Generic Core does not require NDA, provider, or GUI | source inspection + new probe | Pass for the direct generic bridge path exercised. |
| One formal SQLite writer | source inspection + existing test | Pass for POSIX exclusive lock and current host admission. |
| Cross-Session formal history | existing test | Pass for same-project continuation and candidate-bound historical source reads. |
| Producer absence | source inspection + existing test | Pass for read-only projection/history and denied mutations after unload/restart. |
| CAS and stale-input refusal | existing test + new probe | Pass for normal stale input and deterministic post-audit recheck rollback. A true two-process CAS race remains unrun. |
| Idempotency | existing test | Pass for same request/command replay and changed-payload conflicts with one durable effect. |
| Trusted actor/action boundary | source inspection + existing test + new probe | Payload actor/status escalation is rejected; host action generation/actor checks pass. Direct possession of the private bridge is outside this probe's threat model. |
| Failure recovery | existing test | Pass for the documented SQLite crash barriers and HTTP settlement cases; synthetic/loopback only. |

## Not run and follow-up

The following remain `not_run` in this slice: real provider execution or credentials, GUI/browser/IME/assistive-technology verification, professional/legal quality, secure erasure, hostile plugin or multi-user identity isolation, full H4 install/upgrade/uninstall coverage, and a two-live-writer CAS race. G1–G5 remain open.

If stronger CAS evidence is required, the smallest follow-up is a separate synthetic test that sends two concurrent same-base decisions through one Core owner and asserts one formal effect plus one stale/closed refusal. The existing exclusive-lock probe already covers a second Core owner being rejected with `DB_IN_USE`; weakening that single-owner boundary is neither needed nor recommended. No repair candidate was found in this bounded run.
