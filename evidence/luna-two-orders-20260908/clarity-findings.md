# CB-01 · bounded clarity finder report

Date: 2026-09-08 (Asia/Singapore). Role: Luna Finder only. The review is read-only over the four assigned source files; no product source, test, dependency, schema, permission, transaction, or public interface was changed. A candidate below is an input for the independent Verifier, not an acceptance decision.

## Fixed scope and deterministic snapshot

The worktree is `<isolated-checkout>`, branch `codex/luna-maintenance-core-validation`, HEAD `429fdd68febb9998f322a0b53c323651fc8cd7fd`. The four files were measured with:

```sh
wc -l app/runtime/source-resolver.mjs app/runtime/artifact-history.mjs app/core/client.mjs app/core/owner.mjs
shasum -a 256 app/runtime/source-resolver.mjs app/runtime/artifact-history.mjs app/core/client.mjs app/core/owner.mjs
git hash-object app/runtime/source-resolver.mjs app/runtime/artifact-history.mjs app/core/client.mjs app/core/owner.mjs
```

| file | lines | SHA-256 | Git blob SHA-1 |
|---|---:|---|---|
| `app/runtime/source-resolver.mjs` | 89 | `1e56cb176d7cdc8c6a956a3a89ccecdbc87af89101abc3b25b358ef80327120d` | `7b70c10fed281020f26cea755d3d4cad88401bff` |
| `app/runtime/artifact-history.mjs` | 176 | `f30bdbdf829abec81f8ced4a1f738e353a44ddbb66494f4b743756b9c7e999d9` | `e536e1b2801c454d0eb615dda6a261c5d31696fe` |
| `app/core/client.mjs` | 264 | `2644e8aa9137c49f1c789899569c6165e48e60c4172706a42bafa964f64f7f58` | `c52c3460e91f98713827020f846594f56097e654` |
| `app/core/owner.mjs` | 105 | `18608ef84adca8143830317c5b9c471625cc042b12e19868ad16885afc70aa31` | `08b0845f11d135d5d10cbe3db3fc55765b0058ae` |

The tree already contained parallel uncommitted work in `engineering/current.md`, the two-order assignment directory, and other files under this evidence directory. Those changes were preserved. The assigned source files had no diff against the fixed HEAD during this review.

## Caller map and current coverage

| module | production seam | tests/consumers inspected |
|---|---|---|
| `source-resolver.mjs` | This is the isolated R2 callable parser; no production importer/service import was found. Its contract explicitly keeps acquisition and HTTP/model-tool wiring out of this slice. | `app/tests/source-resolver.test.mjs:7-115`; `docs/runtime-control/source-resolver.md` |
| `artifact-history.mjs` | `app/server/service.mjs:26,129` constructs it; `service.mjs:522-547` reads it for the scoped artifact route; `service.mjs:948-960` passes `save` to workspace tools. | `app/tests/artifact-history-storage.test.mjs:13-75`; `app/tests/artifact-history.test.mjs:81-306` |
| `client.mjs` | `app/extensions/work-adapter.mjs:2-3,201` owns/uses the client; `app/server/runtime.mjs:40-46` gives the host-owned client to the registry/service; `app/extensions/evidence-memo/server/core-client.mjs:1-2` re-exports it. | `app/tests/work-core.test.mjs:7-108`; `app/tests/work-artifact-read.test.mjs:7-36`; `tests/extension.test.mjs:44-49`; `benchmarks/continuity/courtwork.mjs:5-59` |
| `owner.mjs` | `app/server/runtime.mjs:40-46` creates the host owner; `app/extensions/work-adapter.mjs:239-270` consumes projections/context; `app/server/service.mjs:679` creates a read-only projection. | `app/tests/work-actions.test.mjs:8-115`; `app/tests/work-context-continuity.test.mjs:4-74`; `app/tests/work-core.test.mjs:8,46-50`; `app/extensions/inbound-nda/index.mjs:53-60` |

The assigned existing tests were rerun from `app/` without installing dependencies or using a real provider:

```sh
node --test tests/source-resolver.test.mjs tests/artifact-history-storage.test.mjs tests/artifact-history.test.mjs tests/work-artifact-read.test.mjs tests/work-core.test.mjs tests/work-actions.test.mjs tests/work-context-continuity.test.mjs ../tests/extension.test.mjs
```

Result: 35 passed, 0 failed, 0 cancelled, 0 skipped. These are current-behavior observations only; no proposed diff was applied.

## Candidate 1 · one outer artifact-storage error boundary

**Location:** `app/runtime/artifact-history.mjs:128-135` and `:167-171`.

Both public operations repeat the same outer conversion:

```js
if (error instanceof ArtifactHistoryError || error.name === "AbortError") throw error;
throw new ArtifactHistoryError("artifact_store_unavailable");
```

`read` wraps `#read` at lines 130-135. `save` wraps its queued operation at lines 167-171. The inner `#read` mappings at lines 103-105 and 119-123 are intentionally different: Git exit 1/128 distinguishes missing history from integrity failure and must stay local to the read path.

**Callers and behavior:** `app/server/service.mjs:537-541` turns the three `ArtifactHistoryError.code` values into HTTP status/code/message; `service.mjs:958-960` supplies `save` to workspace writes. Existing storage tests cover cancellation identity (`app/tests/artifact-history-storage.test.mjs:31-63`), missing history and integrity (`:13-28,65-75`), and the HTTP history route/crash windows (`app/tests/artifact-history.test.mjs:81-306`).

**Recommended bounded diff:** add one local helper in `artifact-history.mjs` that returns an existing `ArtifactHistoryError` or `AbortError` unchanged and otherwise returns `new ArtifactHistoryError("artifact_store_unavailable")`; replace only the two duplicated catch bodies with `throw helper(error)`. Keep the exact `error.name === "AbortError"` test, error codes, messages, and catch placement. Do not move or merge the inner Git classification.

**Why it earns a Verifier check:** this removes one duplicated error policy point and makes the public read/save boundary visibly share the same rule. It does not change a wire shape, status, transaction, queue, or storage operation.

**Risks:** a helper that uses optional chaining, wraps existing errors, or catches at a wider scope would change behavior. The Verifier must confirm identity preservation for `ArtifactHistoryError` and `AbortError`, conversion of an unexpected Git/storage error to `artifact_store_unavailable`, and the unchanged inner `#read` classifications.

**Verification if authorized for implementation:**

```sh
cd app
node --test tests/artifact-history-storage.test.mjs tests/artifact-history.test.mjs
npm test
npm run smoke
```

The focused tests are sufficient for the local candidate; `npm test` and `npm run smoke` are the final checks only if a source patch is actually granted.

## Candidate 2 · name the repeated Matter/Run wire-context conversion

**Location:** `app/core/client.mjs:216-232`.

`readSource`, `saveCandidate`, and `readArtifact` each construct the same scoped bridge context `{ matter_id: matterId, run_id: runId }`. The first two show it as a nested object at lines 220 and 227; `readArtifact` repeats it inline at line 232. This is one conversion boundary repeated three times, not three independently meaningful context shapes.

**Callers and behavior:** `app/extensions/work-adapter.mjs:330-344` invokes `readArtifact` from `se_read_artifact`; `:353-367` invokes `readSource`; `:370-389` invokes `saveCandidate`. The bridge validates the exact context shape at `app/core/bridge.py:658-659,772-773`. `app/tests/work-artifact-read.test.mjs:23-35` covers paging, cross-Matter binding, closed-run rejection, and rejection of an extra `actor` field; `app/tests/work-core.test.mjs:26-61` covers the client lifecycle and binding/CAS behavior.

**Recommended bounded diff:** add a local `wireContext(matterId, runId)` helper returning a fresh object with those two keys in the current insertion order, then use it only in the three methods above. Keep `readSource`, `saveCandidate`, and `readArtifact` method signatures and all other `call` payloads unchanged. Do not generalize arbitrary bridge contexts or add actor/permission fields.

**Why it earns a Verifier check:** it gives the camelCase-to-snake_case mapping a single named boundary and prevents the three methods from drifting apart. The gain is conceptual and local; it is not a formatting-only rewrite.

**Risks:** changing key order can alter serialized request bytes and any request hash that observes them; returning a shared mutable object would create cross-call state; applying the helper to a different operation could hide a distinct contract. The Verifier must compare the serialized payload for all three methods and retain the extra-actor rejection.

**Verification if authorized for implementation:**

```sh
cd app
node --test tests/work-artifact-read.test.mjs tests/work-core.test.mjs tests/extension-run.test.mjs ../tests/extension.test.mjs
npm test
npm run smoke
```

## Deliberately rejected / no finding

- `app/runtime/source-resolver.mjs`: the two-stage field allowlists at `:23-37` are a deliberate ambiguity/extra-field rejection; the output assembly at `:42-87` is the R2 contract surface. The module has no production caller because acquisition is explicitly deferred, so deleting or reshaping it would remove a contract seam rather than simplify a live path. No candidate.
- `app/core/owner.mjs`: the two `humanActions` loops at `:38-67` intentionally emit all `decide` actions before all `revise_candidate` actions, while revisions remain available for closed/source-stale parents. Merging the loops can reorder the public action list. The explicit `candidateBasis` reason sequence at `:23-29` is consumed by context/tests and is easier to audit than a new table abstraction. No candidate.
- `app/runtime/artifact-history.mjs:14-20`: replacing the two-branch message ternary with a map would add indirection for three stable messages and would still feed the public HTTP error message. No value beyond style.
- `app/core/client.mjs:24-27,264`: `safeError` is exported, and `client.mjs` is re-exported through the legacy evidence-memo path; `stderr`, `CORE_DIR`, and `BRIDGE_PATH` are observable compatibility/diagnostic state. Repo-local non-use is not enough evidence to remove them. No candidate.

No architecture, schema, permission, transaction, public API, provider, or UI change is recommended. The independent Verifier should reopen the current files and either confirm one of these two local candidates or record no-change; this Finder report does not authorize a patch or claim acceptance.
