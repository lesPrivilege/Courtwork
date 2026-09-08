# Independent Core verification

**Date:** 2026-09-08
**Reviewer:** Luna, independent bounded review
**Implementation reference:** `aaa61ebc40dae16332d0d5addf538d03072eec0a` on `codex/harness-core`
**Scope:** verify the three fixes reported against the preceding freeze: application-schema metadata fail-closed behavior, Core Run binding and terminal replay, and host-wide atomic Run admission. The `aaa61eb` correction also restores the configuration mutation active-Run guard after the admission refactor. No product acceptance or deployment decision is made here.

## Results

### Missing application metadata fails closed

`app/core/bridge.py:188-197` now distinguishes a new database (`allow_initialize=True` from `open_or_initialize`) from an existing database. An existing Core database without `app_meta.schema_version` raises `SCHEMA_INVALID` before application DDL or metadata normalization.

I created a fresh database through `CoreClient`, closed it, then independently applied each of these SQLite mutations with `python3`/`sqlite3`: delete the `schema_version` row, and drop `app_meta`. For each case I captured `state.db` bytes, attempted a new `CoreClient.start()`, required `error.code === 'SCHEMA_INVALID'`, and compared the database bytes after the failed open.

Observed output:

```text
schema: [
  "DELETE FROM app_meta WHERE key='schema_version' => SCHEMA_INVALID, bytes-preserved",
  'DROP TABLE app_meta => SCHEMA_INVALID, bytes-preserved'
]
```

The existing migration path was also exercised by the focused Core test: a valid schema-1 application migration retains the historical source membership and creates the backup, while an unsupported column fails with `SCHEMA_INVALID` and preserves the original database.

### `update_run` binds candidates and makes terminal state immutable

The implementation at `app/core/bridge.py:548-608` checks a supplied candidate against the Run's `run_id` and `matter_id` at lines 562-565. Once a Run is terminal, lines 566-572 allow only an identical replay and reject changed status, admission, error, candidate, or end time with `CONFLICT`.

An independent `CoreClient` probe created Matter `m`, Matter `other`, Run `run-m`, and candidate `candidate-m`; it then:

1. completed `run-m` and attempted to add a changed error;
2. attempted to attach `candidate-m` to `run-other` for Matter `other`;
3. completed `run-other` as `unknown` and replayed the identical terminal update.

Observed output:

```text
update_run: {
  terminalCode: 'CONFLICT',
  bindingCode: 'BINDING_MISMATCH',
  immutableReplay: true
}
```

### Host-wide admission is atomic at the production seam

`RuntimeService.#createRun` passes `singleActiveRun: true` to `RuntimeStore.createRun` at `app/server/service.mjs:833-843`. The serialized `_mutate` closure checks `(singleActiveRun || run.sessionId === sessionId)` at `app/server/store.mjs:416-421`; therefore the production host performs the cross-Session active-Run check inside the write queue. The Store default remains per-Session for summary and synthetic fixtures.

An independent direct `RuntimeStore` probe created two Sessions and called `createRun` concurrently for both with `singleActiveRun: true`. Exactly one mutation succeeded and one rejected before execution began; only one `running` Run was present. The same probe completed the winner and changed its permission mode. Observed output:

```text
{"singleActiveRun":"PASS","fulfilled":1,"rejected":1,"rejection":"active run exists","configMutation":"PASS"}
```

During review of the intermediate `67683fd` freeze, an unrelated broad replacement had changed `setPermissionMode` to reference an undefined `singleActiveRun`. An active-Run probe reproduced `ReferenceError: singleActiveRun is not defined` at `store.mjs:376`. Commit `aaa61eb` restores the intended configuration guard; the independent active-Run guard probe now returns `active run exists`, and does not throw a `ReferenceError`.

## Focused regression runs

The independent focused commands at `aaa61eb` were:

```sh
node --test app/tests/work-core.test.mjs app/tests/work-continuity.test.mjs app/tests/work-summary.test.mjs
node --test app/tests/control-plane.test.mjs
```

Results were 14/14 and 16/16 passing, respectively. The first run covers Core lifecycle, migration, source-history continuity, producer-absent recovery, provider provenance, deletion, and HTTP concurrent admission. The second covers configuration mutation serialization and runtime control-plane invariants. The parent run additionally reports the full suite 164/164 and smoke pass; those are recorded separately from this independent focused verification.

## Boundaries

Generic Candidate evidence remains intentionally unverified until `accept`; reject and request-evidence preserve proposals for review under the frozen contract. This check did not evaluate professional/legal correctness, real-provider behavior, UI accessibility, secure workspace erasure, hostile SQLite tampering, or product G1–G5 acceptance. No credentials, personal data, paid provider, or external service was used.

## Settlement and event-sequence addendum

**Follow-up reference:** `7703ad502bc778cdb6f7f05b3d627e36f1b17d6b`
**Scope:** bounded review of the Pro R-01 settlement mapping, model-wire source discovery, and Pro R-04 partial tool-update mapping.

The new focused command passed all five tests:

```sh
node --test app/tests/work-settlement.test.mjs
```

The three actual Pi/HTTP settlement cases all left the host Run `unknown` with `extension_finish_failed`, closed host admission, left the formal Artifact unset, and returned the same Run from a same-command retry without a second finish call. The after-write acknowledgement-loss case additionally showed the Core Run as `completed` while the host Run remained `unknown`, which preserves the uncertainty boundary rather than falsely reporting host completion. The model-wire case derived a source reference from the compiled host Context and successfully read it through the scoped tool; the user instruction contained no source ID. The mapper/projection case produced `tool.start`, two `tool.update` events, and one terminal `tool.result`; the projected tool row stayed `started` until the final event.

The command output was:

```text
ℹ tests 5
ℹ pass 5
ℹ fail 0
```

I also ran a separate synthetic same-process follow-up after a **before-write** finish failure. The host Run was `unknown` with `extension_finish_failed`, but its Core Run remained `running` in the work projection. A different command then received host HTTP 200 admission and ended `failed`/`provider_error` when the adapter's Core `createRun` encountered that orphan active Run. This leaves the same-process Work Core unavailable until restart or disposal reconciles the in-flight Core Run. The existing R-01 regression intentionally checks same-command receipt replay and does not cover a different command after this failure; this is an open settlement/reconciliation boundary for the integration owner, not counted as a passing recovery claim.

The corresponding source paths are `app/server/service.mjs:1019-1046` for extension finish and host final-status settlement, `app/extensions/work-adapter.mjs:378-429` for Core Run close/finish, `app/extensions/work-adapter.mjs:250-336` for the compiled Context and scoped source tool, `app/runtime/pi-session-runtime.mjs:349-371` for raw event mapping, and `app/web/thread-projection.mjs:41-76` for nonterminal tool updates. These checks remain synthetic/loopback evidence; they do not establish real-provider, professional/legal, UI usability, or product acceptance.

## Reconciliation closure addendum

**Follow-up reference:** `133269184468f1adf3b38acfc59091818daeb8e8`
**Scope:** independently verify the reconciliation added after the before-write orphan-Run observation.

`WorkExtension.begin` now exposes `reconcile` at `app/extensions/work-adapter.mjs:333-335`. Its implementation at lines 403-418 queries the durable Core Run first, preserves an already terminal status (including a completed after-write acknowledgement-loss), otherwise closes the active Core Run as `unknown`, marks the adapter state finished, and removes it from `activeRuns`. The service invokes this method after `finish` throws at `app/server/service.mjs:1032-1038`, while retaining the host `extension_finish_failed` error and `unknown` status.

An independent Pi/HTTP probe injected each of the three settlement failures, inspected both host and Core projections, restored the original extension entry point, and submitted a different continuation command. All three continuations completed. Observed output:

```text
{"mode":"before-write","hostStatus":"unknown","hostError":"extension_finish_failed","coreStatus":"unknown","continuationStatus":"completed","finishCalls":1}
{"mode":"after-write-ack-loss","hostStatus":"unknown","hostError":"extension_finish_failed","coreStatus":"completed","continuationStatus":"completed","finishCalls":1}
{"mode":"cancel-and-finish-failure","hostStatus":"unknown","hostError":"extension_finish_failed","coreStatus":"unknown","continuationStatus":"completed","finishCalls":1}
```

The formerly observed orphan active Core Run is therefore closed for these three injected paths; no finisher replay occurs, and an after-write terminal Core result is not overwritten. The earlier open finding is closed within this tested integration boundary. If the reconciliation query/update itself fails, the service records `extension_reconcile_failed`; that failure path was not fault-injected here and remains an explicit recovery boundary.

The final `node --test app/tests/work-settlement.test.mjs` run passed **5/5**. The parent delivery also reports **170/170** for `npm --prefix app test` and a passing `npm --prefix app run smoke`; those totals are author-run and are not substituted for this independent probe.
