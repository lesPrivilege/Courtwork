# CB-01 · Clarity pilot independent verification

Date: 2026-09-08 (Asia/Singapore). Role: Luna independent Verifier. This receipt reopens the four assigned files and the listed callers, then decides each Finder candidate against the bounded maintenance contract. No product source, test, dependency, schema, permission, transaction, or public interface was changed.

## Fixed snapshot and evidence basis

The review ran in `/private/tmp/cw-luna-maintenance-core-validation`, branch `codex/luna-maintenance-core-validation`, at HEAD `429fdd68febb9998f322a0b53c323651fc8cd7fd`. The assigned files had no diff against that HEAD. Their measured bytes were unchanged from the Finder snapshot:

| file | lines | SHA-256 |
|---|---:|---|
| `app/runtime/source-resolver.mjs` | 89 | `1e56cb176d7cdc8c6a956a3a89ccecdbc87af89101abc3b25b358ef80327120d` |
| `app/runtime/artifact-history.mjs` | 176 | `f30bdbdf829abec81f8ced4a1f738e353a44ddbb66494f4b743756b9c7e999d9` |
| `app/core/client.mjs` | 264 | `2644e8aa9137c49f1c789899569c6165e48e60c4172706a42bafa964f64f7f58` |
| `app/core/owner.mjs` | 105 | `18608ef84adca8143830317c5b9c471625cc042b12e19868ad16885afc70aa31` |

The Finder's caller map was checked against the current files. `ArtifactHistory` is constructed and consumed by `app/server/service.mjs:26,129,522-547,948-960`; `CoreClient` is used by `app/extensions/work-adapter.mjs:2-3,201` and re-exported by `app/extensions/evidence-memo/server/core-client.mjs:1-2`; the bridge checks the exact context shape at `app/core/bridge.py:658-659,770-777`. The source resolver and owner observations were also reopened; neither has a maintenance candidate that meets this pilot's bar.

The focused current-HEAD replay was:

```sh
cd app
node --test tests/source-resolver.test.mjs \
  tests/artifact-history-storage.test.mjs tests/artifact-history.test.mjs \
  tests/work-artifact-read.test.mjs tests/work-core.test.mjs \
  tests/work-actions.test.mjs tests/work-context-continuity.test.mjs \
  ../tests/extension.test.mjs
```

Result: **35 passed, 0 failed, 0 cancelled, 0 skipped**. This is a behavior replay on the unchanged tree. It does not validate an unmade patch. Because no product code changed, the contract's final `npm --prefix app test` and `npm --prefix app run smoke` checks were not run for this receipt.

## Candidate decisions

### C1 · Shared outer artifact-storage error helper — **REJECT / no-change**

The Finder correctly located the two public catches at `app/runtime/artifact-history.mjs:128-135` (`read`) and `:167-171` (`save`). Both preserve an existing `ArtifactHistoryError` or an `AbortError` by identity and map an unexpected error to `artifact_store_unavailable`. The inner `#read` catches at `:101-105`, `:114-123` classify Git lookup/type failures locally and are not duplicates of the public boundary.

The proposed helper would replace two five-line catch bodies with one helper definition plus two calls. That is extractable, but the current two public methods are separate async operations with different surrounding scopes: `read` awaits `#read` directly, while `save` awaits a queued operation and must still run its `finally` cleanup. Keeping the normalization at each public boundary makes the error policy visible beside the operation and leaves room for their operation-specific behavior to diverge. No current drift, third duplicated policy point, bug, or test gap was found that would make the indirection a clear reduction in conceptual burden.

The existing storage tests exercise cancellation identity, missing history, integrity failure, Git crash windows, and retry of interrupted initialization (`app/tests/artifact-history-storage.test.mjs:13-75`; `app/tests/artifact-history.test.mjs:81-306`). A pure helper would be behavior-preserving if implemented exactly as proposed, but behavior preservation alone does not satisfy the pilot's requirement for a clearly demonstrated maintenance gain. The candidate is therefore rejected; no fixer work is authorized from C1. If a future change creates a third identical public storage boundary or exposes policy drift, reassess it with a focused patch and identity/error-code tests.

### C2 · `wireContext(matterId, runId)` helper — **REJECT / no-change**

The Finder correctly located the repeated conversion at `app/core/client.mjs:216-232`: `readSource`, `saveCandidate`, and `readArtifact` each send `{ matter_id: matterId, run_id: runId }`. The bridge requires that exact two-key context (`app/core/bridge.py:658-661,770-777`), and the artifact-read test also rejects an extra `actor` field (`app/tests/work-artifact-read.test.mjs:23-35`).

The three literals are the visible wire mapping for three distinct Core operations. A helper would remove a small repeated object literal but add a named call and hide the exact bridge payload at each call site. It also creates avoidable review risk around insertion order (which can affect serialized request bytes) and shared-object mutation. No observed context drift, third shape, or contract ambiguity makes this a clear conceptual simplification under the pilot; the proposal is therefore a local wrapper-style refactor, which does not meet the assignment’s demonstrated-maintenance-gain requirement. The candidate is rejected and no fixer work is authorized from C2.

## Scope dispositions and limits

No candidate was confirmed. The deliberate no-finding decisions for `source-resolver.mjs` (contract boundary and explicit field allowlists) and `owner.mjs` (intentional action ordering and reason sequence) remain supported by the reopened source and current test replay. The message ternary and exported `safeError` observations in `clarity-findings.md` likewise do not meet the pilot bar.

This receipt does not claim whole-repository optimization, product acceptance, legal or provider quality, GUI verification, multi-user identity isolation, or deployment readiness. Not run: any clarity implementation, post-patch tests, full suite/smoke for an unmade change, real provider, GUI/browser, hostile plugin, or multi-process clarity scenario. The bounded CB-01 outcome is **no-change with two rejected candidates**; the evidence chain is sufficient for this pilot without a fixer round.
