# Captured verification logs

These are byte-preserving projections of two existing logs outside Git. The original temporary files were left unchanged; packaging did not rerun tests or scans. The only machine roots considered for projection were the release worktree (`/private/tmp/courtwork-release-final-20260913` → `<worktree>`) and the two temporary source files (`/private/tmp/cw-release-…` → `<temporary>/cw-release-…`). Each substitution count was zero in both logs, so each packaged projection is byte-identical to its source.

| Projection | Portable source identity | Size | Source SHA-256 | Normalized SHA-256 |
|---|---|---:|---|---|
| [combined-product.log](combined-product.log) | `<temporary>/cw-release-final-combined-product.log` | 264,911 bytes · 6,396 lines | `180821e299a63804e2013b9d545c07b83b9573f52984be2ee3b836d5bfff6fca` | `180821e299a63804e2013b9d545c07b83b9573f52984be2ee3b836d5bfff6fca` |
| [context-disclosure.log](context-disclosure.log) | `<temporary>/cw-release-context-disclosure-fix.log` | 7,240 bytes · 182 lines | `be7d2e9c7a2468ecefead30bfbedb2af2ee7e3b23d501bc16ab8be1dc06ee78f` | `be7d2e9c7a2468ecefead30bfbedb2af2ee7e3b23d501bc16ab8be1dc06ee78f` |

The combined-product output reports 1,029/1,029 tests passing, the local deterministic runtime smoke passing, and 7,120 documentation links checked across 1,261 documents with no problems. It was captured on the full runtime at `d8115b7`, before the final one-line Context UI change. The Context disclosure output reports 28/28 tests passing; it was the targeted run on base `77f1cfcc` plus the then-uncommitted Context fix, subsequently committed as `5d9cf51`. These are separate snapshots: the combined run is not a post-fix full rerun. The current release worktree is at `5d9cf51`.
