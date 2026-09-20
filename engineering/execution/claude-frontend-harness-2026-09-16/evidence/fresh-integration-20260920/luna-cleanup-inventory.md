# Courtwork worktree safe-cleanup inventory

Snapshot time: `2026-09-20T13:43:38+08:00`. Read-only inventory; no files were edited, copied, deleted, archived, or dereferenced. Frozen legacy was inspected only through the Git worktree registry metadata.

## Registered worktrees and byte inventory

`git ls-files` counts below include files currently present in the index, including staged additions. Untracked and ignored sizes are sums of filesystem bytes; symlinks are counted as link metadata only.

| tree | HEAD / branch | status at snapshot | tracked/index | untracked | ignored |
|---|---|---:|---:|---:|---:|
| `Courtwork` | `ba1cb2feeed2a80cc6830cb12c6c9713b282f27f` / `main` | 32 staged additions, 16 staged modifications, 3 `??` | 7,664 files / 440,223,976 B | 4 / 12,076 B | 26,784 / 543,200,461 B |
| `courtwork-gui-grammar-20260919` | `2b98abb5f412ba5b6f7c04837c4a23ed7d075a93` / `claude/gui-grammar-20260919` | 1 `??` symlink | 7,613 / 439,165,074 B | 1 / 55 B | 7 / 316,226 B |
| `courtwork-gui-review-20260920` | `2b98abb5f412ba5b6f7c04837c4a23ed7d075a93` / detached | 1 `??` symlink | 7,613 / 439,165,074 B | 1 / 55 B | 0 / 0 B |
| `courtwork-orchestra-direction-20260919` | `72c91a2f070cc8e134f1d09cebc7de735ff89415` / `codex/orchestra-direction-20260919` | 16 unstaged modifications, 12 `??` paths | 7,580 / 437,142,479 B | 13 / 254,834 B | 206 / 12,629,161 B |
| `courtwork-pages-20260911` | `9bc6090b5b463bdf6286a0c42bdcd399781fc067` / detached | 20 `??` path groups; 43 files | 4,237 / 162,311,322 B | 43 / 8,838,547 B | 94 / 4,255,279 B |
| `Courtwork-legacy-frozen` | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476` / detached | metadata only | not traversed | not traversed | not traversed |

The two GUI trees are byte-identical at the tracked/index level and both contain the same `app/node_modules` symlink (`55 B` → `/Users/lesprivilege/Projects/Courtwork/app/node_modules`). The grammar tree has seven ignored Python cache files; the review tree has none. No symlink was followed.

The main ignored total is dominated by the installed `app/node_modules` tree (about 530.5 MB of the 543.2 MB ignored total) and `site/dist` (about 12.6 MB). These are preservation candidates for a byte archive even if some can be regenerated from locks. Orchestra's ignored bytes are `site/dist`; Pages has its own `site/dist` plus the 43 untracked verification files. Preserve the symlink objects and record their targets; do not dereference them into an archive.

## Commit ancestry

The GUI candidate is `2b98abb`. Relative to the current `main` ref (`ba1cb2f`), both GUI trees have 8 commits in `main..HEAD` and `main` has 1 commit in `HEAD..main`; they are the same candidate snapshot, with one detached copy. Orchestra has no commits beyond the current main ancestry and is one commit behind (`HEAD..main = 1`). Pages is an old ancestor with `HEAD..main = 443`; it has no unique commits against current main. The frozen tree was not compared beyond its registry SHA.

The worktree registry reports six paths, including `main`, the two GUI copies, Orchestra, Pages, and the frozen legacy checkout.

## Orchestra overlap and preservation disposition

Orchestra is at the same committed base as the pre-`ba1cb2f` main, but its worktree contains 29 changed/untracked paths. Comparing current filesystem bytes against current main found 15 differing paths that must not be overwritten during cleanup:

- `README.md`, `README.zh-CN.md`
- `engineering/architecture-runtime-canon.md`, `engineering/architecture.md`
- `engineering/execution/claude-frontend-harness-2026-09-16/README.md`
- `engineering/product-direction.md`
- `engineering/research/RD-001-runtime-adapter.md`
- `engineering/research/RD-005-multi-agent-selection.md`
- `engineering/research/RD-009-trusted-harness-extensions.md`
- `engineering/research/README.md`, `site/src/readme.mjs`
- `engineering/execution/claude-frontend-harness-2026-09-16/orchestra-pages-registration-20260919.md`
- `engineering/execution/claude-frontend-harness-2026-09-16/orchestra-start-node-20260919.md`
- `engineering/research/architecture-node-2026-09-13/orchestra-direction-20260919.md`
- `engineering/research/architecture-node-2026-09-13/praxis-kit-20260919.md`

The other 14 Orchestra paths have identical bytes in current main: `engineering/decisions.md`, the node-acceptance and harness-dogfooding records, the agents-api README, `site/README.md`, nine local exploration/inputs records, and `local-agent-runtimes-20260920.md`. Hash equality is an archive deduplication fact, not permission to delete the Orchestra copies. Preserve every path; let the parent choose adopt/merge/archive treatment after review.

## Concurrent-writer and credential signals

Main changed from `72c91a2` to `ba1cb2f` during this inventory. A transient status read exposed conflict codes before the final read showed the current staged state with no conflict entries. The parent also reports `productcheck` running. These status/record signals mean cleanup must wait for the parent’s explicit completion point; no process or credential store was inspected.

A filename-only scan of nontracked and ignored paths in the five active trees found no standalone `.env` or obvious personal credential-store path. Matches were dependency source/API names under `app/node_modules` (`credentials`, `api-keys`, `client-secrets`, `auth`) and `site/dist/tokens.css`; no file contents were opened. Do not treat those dependency filenames as user credentials, and do not copy external credential stores.

The historical Pages/N13 discrepancy remains unresolved: the current Pages worktree has 43 untracked files (8,838,547 B), while the earlier N13 record said 105. This inventory does not explain or reconcile 105 → 43 and makes no deletion or archival decision from that difference.

**Safe-cleanup recommendation:** retain all regular files and evidence bytes for full-byte archiving, preserve symlinks without following them, and defer any archive/delete operation until the parent confirms the main merge and product check are complete. Do not overwrite the 15 differing Orchestra paths.
