# RL-1 non-author review

Date: 2026-09-27

Candidate: `263ddcdd353792acb6d7321778c2a26cff671a67` (`codex/runtime-load-recovery-20260927`), parent contract `a0dd5a7d389698ed5c92f708673ec3d54420cc5d`.

## Scope and source integrity

The candidate changes only the authorized product/test paths:

- `app/runtime/control-tools.mjs` — SHA-256 `20bf1a69a0691ca8b2e12f3e35a597d1d66a895c5553b26eba19a4efa48adf43`
- `app/tests/runtime-load-recovery.test.mjs` — SHA-256 `862f0a89fab78389dfe7e2eaa810b00ca76c93652f6a11e0154161cd8eba56f4`

`git diff --check HEAD^ HEAD` passed. The worktree has only the supplied untracked dependency symlink and evidence directory outside the candidate commit; no unrelated product edits were found.

## Contract review

The implementation matches RL-1:

- `createRuntimeLoadTool` keeps the original missing-resource sentence and appends only deterministically sorted, deduplicated IDs whose frozen content and same-kind exposed descriptors both exist (`control-tools.mjs:16-28`).
- Empty/non-loadable bindings disclose no IDs and explicitly state that the tool cannot discover check recipes (`control-tools.mjs:34-46`).
- Hints cap at eight complete JSON-quoted IDs and bound the full message to 1200 UTF-16 code units; oversized IDs are omitted whole (`control-tools.mjs:31-46`).
- Tool description and parameter metadata define exact-ID admitted skill/reference loading and reject the catalog/check-recipe interpretation (`control-tools.mjs:49-56`).
- Successful body, details/revision, `onLoad` metadata, and `governTools` admission remain unchanged (`control-tools.mjs:55-58`, `113-140`).

The added tests cover the required empty, allowed, hidden/wrong-kind, body/URI, deterministic ordering, limits, odd IDs, no-mutation, successful-load, literal `catalog`, and public fake-Pi integration cases (`runtime-load-recovery.test.mjs:29-199`).

## Verification

Command:

```text
node --test --test-concurrency=1 tests/runtime-load-recovery.test.mjs tests/control-plane.test.mjs tests/runtime-proposals.test.mjs
```

Result: exit 0, **30/30 passed**, 0 failed. This includes **10 RL-1 tests**, 17 control-plane tests, and 3 runtime-proposal tests, using the supplied dependency symlink and synthetic/fake provider only.

The raw targeted stdout was not retained as a file. This report records the observed exit/status and does not reconstruct a `luna-targeted.log`.

Independent bounded `governTools` probe: pass. It verified that an exposed runtime loader returns the bounded admitted-ID hint without requesting permission; an unexposed loader is filtered out; and a policy-denied `runtime_load` is refused before `onLoad`, with zero permission prompts. Full output is in `luna-govern-tools-probe.log`.

Focused adjacent check at the pre-comparator candidate (`263ddcd`):

```text
node --test --test-concurrency=1 tests/architecture-maintenance.test.mjs
```

Result: exit 1, 2/3 passed. The sole failure was the retained AM-C request golden at `tests/architecture-maintenance.test.mjs:187`: its expected `runtime_load` description and `id` schema predated RL-1, while the actual request contained the intentional exact-ID description and parameter description. The two semantic-diff tests passed. This was a parent-owned golden/test expectation update; no product rollback or golden-byte rewrite belongs in this review.

Parent comparator follow-up at `df9340a42e96356581cd0d472b04df871faeabf0`:

```text
node --test --test-concurrency=1 tests/architecture-maintenance.test.mjs
```

Result: exit 0, **3/3 passed**. The retained `app/tests/fixtures/architecture-maintenance/request-baseline.json` remains byte-identical: SHA-256 `e4b29b2a04488b28674db4455df4dd03cf25415f98ac92b3a0cf0bfed355f691`, equal to `a0dd5a7`'s baseline.

## Finding

**Accept RL-1 within its bounded contract and the parent-owned AM-C comparator follow-up.** No source defect or disclosure/limit regression was reproduced. This is non-author evidence only; parent Astra retains integration and acceptance.
