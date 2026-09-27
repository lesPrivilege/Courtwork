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

Result: exit 0, **30/30 passed**, 0 failed. This includes 9 RL-1 tests, 17 control-plane tests, and 3 runtime-proposal tests, using the supplied dependency symlink and synthetic/fake provider only.

Independent bounded `governTools` probe: pass. It verified that an exposed runtime loader returns the bounded admitted-ID hint without requesting permission; an unexposed loader is filtered out; and a policy-denied `runtime_load` is refused before `onLoad`, with zero permission prompts. Full output is in `luna-govern-tools-probe.log`.

## Finding

**Accept RL-1 within its bounded contract.** No source defect or disclosure/limit regression was reproduced. This is non-author evidence only; parent Astra retains integration and acceptance.

