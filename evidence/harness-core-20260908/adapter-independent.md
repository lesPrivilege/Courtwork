# Runtime adapter independent review · 2026-09-08

**Implementation reference:** `codex/harness-core` at `aaa61ebc40dae16332d0d5addf538d03072eec0a` (`aaa61eb`).
**Review scope:** the host/service seam, generic `WorkExtension` lifecycle, Core binding/admission checks, producer absence and historical reads. The inbound NDA domain module was authored in this delivery; this record does not independently accept its legal or verifier quality. The adapter review does check that the domain is invoked through the trusted seam and that its documented negative paths have no formal effect.

## Source inspection

The relevant source coordinates at the frozen SHA are:

- `app/extensions/inbound-nda/index.mjs:6-12` marks the adapter as development-only, has `surface:null`, and states its synthetic/plaintext and no-signing exclusions. Lines 25-29 bind proposal verification to the stored playbook/contract and reject failed verification. Lines 33-55 validate facts before Matter creation, freeze domain context, restrict proposal shape to `{domain}`, verify normalized proposals, require complete reconciliation for `accept`, and remove `accept` from the advertised action enum for unresolved reviews.
- `app/extensions/work-adapter.mjs:223-247` owns binding and versioned projection. Lines 250-336 create a Core Run and expose only `se_read_source` and `se_submit_candidate`; the host later validates their declared names. Lines 339-375 re-snapshot the bound Matter, check source membership, and attach candidate identity/base/source/contract versions to the Run. Lines 378-429 close admission before cleanup and map extension statuses to Core terminal states. Lines 432-475 make `local-user` host-owned and route decisions, revisions, source replacement and historical reads through Core.
- `app/server/service.mjs:616-651` checks project/extension ownership for existing Matter attachment and refuses cross-scope binding. Lines 658-684 freeze lifecycle changes during active Runs and provide a read-only Core projection when a work producer is unloaded. Lines 722-742 reject a caller-supplied actor and require the active extension generation for human actions. Lines 781-870 perform provider/extension admission before creating the single host Run. Lines 892-1047 begin the extension, validate its namespaced tools, gate cancellation, call `finish`, and set the host terminal status. Lines 1174-1210 close Run admission before asking the extension to close and wait for the task before returning.
- `app/core/bridge.py:380-386` checks Run Matter binding and open admission. Lines 488-525 validate frozen context/provider identity, source/contract versions and single active Run admission. Lines 548-608 make terminal Run identity/status/admission immutable and reject a candidate from another Run or Matter. Lines 611-644 enforce candidate binding/version and reject source reads after a source revision changes. Lines 716-740 enforce work ownership, candidate lineage and candidate-bound historical source membership.

## Executable verification

At `aaa61eb`, the focused command below passed all 17 tests:

```sh
node --test app/tests/nda-runtime.test.mjs \
  app/tests/work-core.test.mjs \
  app/tests/work-continuity.test.mjs \
  tests/extension.test.mjs
```

Result: **17 passed, 0 failed, 0 cancelled**.  The run includes the NDA Pi→tool→Candidate path, unresolved/forged review rejection, same-Matter continuation, producer-absent history, provider provenance, concurrent admission, Core CAS/authority/revision checks, tool namespace/late-call denial, host-derived human action, and close/cancellation behavior. It uses temporary synthetic stores and port-0/loopback fixtures; it does not run a paid or real provider.

The broader author test run at the same SHA is recorded in [the construction README](README.md): `npm --prefix app test` 164/164 and smoke pass. Those totals include implementation-authored tests and are not independent acceptance of the domain module.

## Adversarial probes

The following probes were run against the service/Core seam at `67683fd`/`9f6030a` while reviewing the delivery. The final `aaa61eb` change only restored the pre-existing global active-run guard in `app/server/store.mjs`; it does not change the adapter, Core bridge, or service paths exercised below. Each probe used temporary data and synthetic values.

| Probe | Observed result | Evidence of the boundary exercised |
|---|---|---|
| Start a slow `/fixture slow` inbound-NDA HTTP Run, issue `POST /runs/:id/cancel` before the provider completes, then inspect the Run/surface | HTTP cancel returned 200; Run became `cancelled` and extension admission closed; candidates `0`, Artifact `null` | `service.mjs:1174-1208`; `work-adapter.mjs:378-429`; `service.mjs:1019-1046` |
| Attach an existing inbound-NDA Matter from another project | HTTP 409 `BINDING_MISMATCH` | `service.mjs:637-646`; `bridge.py:697-710` |
| Bind an `evidence-memo` Matter through the `inbound-nda` extension | HTTP 409 `BINDING_MISMATCH` | `service.mjs:628-649`; durable `(project, extension, Matter)` scope |
| Run ordinary Chat with a synthetic attempted `se_submit_candidate` call | Provider tool list contained `ask_user`, `runtime_load`, `ws_grep`, `ws_list`, `ws_read`, `ws_write`; no `se_*`; the attempted call produced one tool error | `service.mjs:915-981`, `1068-1090`; no extension binding means no adapter tools/context |
| Restart with `createRuntime({extensionCatalog:{}})` and read a formerly bound Matter | `extension:null`, `readOnly:true`, `compatibility:"read_only"`, `humanActions:0`, `candidates:0` in the probe fixture; Core history remained queryable | `service.mjs:673-684`; `work-core` projection fallback |
| Attempt a human action while that producer is absent | rejected with `generation_mismatch` (`extension generation is not active`) | `service.mjs:722-741` |
| Leave a pending candidate at source version 1, replace the current source set at revision 2/version 2, then accept using the old candidate/base | HTTP 409 `STALE_INPUT`; candidate remained pending and Artifact stayed `null` | `bridge.py:634-644`, `core` stale decision check; candidate-bound historical source remained readable through `historical_source` |
| Direct extension Run reads a source ID from another Matter | `BINDING_MISMATCH` (`source is outside the bound Matter`) | `work-adapter.mjs:339-353`, `114-118`; Core `read_source` binding |
| Direct Core finish/update attempts to claim a foreign candidate as the terminal candidate | rejected with `NOT_FOUND`/`BINDING_MISMATCH`; no Run or Matter corruption | `bridge.py:548-571`; candidate `run_id` and `matter_id` checks |

The structured output from the cross-scope/absence probe was:

```json
{
  "crossProject": {"status": 409, "code": "BINDING_MISMATCH"},
  "crossProducer": {"status": 409, "code": "BINDING_MISMATCH"},
  "ordinaryTools": ["ask_user", "runtime_load", "ws_grep", "ws_list", "ws_read", "ws_write"],
  "ordinaryToolErrors": 1,
  "absentSurface": {"extension": null, "readOnly": true, "compatibility": "read_only", "humanActions": 0, "candidates": 0},
  "absentAction": {"code": "generation_mismatch", "message": "extension generation is not active"}
}
```

The direct extension ABI probe intentionally called `begin`, then `close('cancel')`, then `finish({status:'succeeded'})`. It returned `succeeded` and Core recorded a completed Run with `admissionOpen:false`, while no candidate or Artifact existed. The HTTP service path does not permit this status mismatch: `service.mjs:1019-1032` derives the extension status from cancellation/close state before calling `finish`. This is a direct caller misuse caveat for the low-level extension ABI, not an observed HTTP or model path around cancellation or acceptance.

## Review conclusion and limits

The evidence supports the bounded runtime claim that the host creates one Core-owned Run, gives extension tools only to a bound and open Run, checks Matter/project/extension/source/candidate identity at the service and bridge boundaries, keeps accepted Artifact creation on the human action path, and falls back to read-only history when the producer is absent. A completed Run remains distinct from a pending or accepted work Candidate.

This review does not establish legal correctness, professional NDA quality, real-provider behavior, renderer/UI usability, hostile plugin isolation, secure erasure, or the full extension install/version lifecycle. The NDA verifier and fixtures remain author-owned evidence; [the NDA contract](../../docs/work-core/nda.md) records their synthetic scope.
