# Retained main worktree inputs · 2026-09-14

## Unattributed WK-98 worktree input

This is a byte-preserving hold of the modified file found in the shared main worktree. It has **no confirmed author or execution provenance** and is not an update to the historical FE-01 result.

| Field | Recorded value |
|---|---|
| Source path | `evidence/fe01-main-integration-20260909/wk98-regression.json` |
| Source branch / HEAD when copied | `main` / `5d9cf51b628aef30ac9ceb141b624c2793ac6213` |
| Captured file | `wk98-regression-unattributed.json` |
| Captured byte length / SHA-256 | `2036` / `b1e3a8dbd40e02211679b85b72858a619433097532aec38009c1ce4a71a01769` |
| HEAD byte length / SHA-256 | `2037` / `2ca3d4420ec93ba8e3677e3542eeeedf9fe0837cad5e0fe4fc159b0021b6235a` |
| HEAD Git blob | `8d10d43c292ba90390f6a27fd8222d4c1c79801c` |
| Captured Git blob hash | `cfb2eea25da95b59140f96110f54ac6b4f73e6a8` |

## Difference from HEAD

The JSON contains one changed value at `$.results[9].detail.text` (`id: WK98-empty-explanation`): the embedded rendered text says `server revision 12` in HEAD and `server revision 7` in the captured worktree input. The captured file is one byte shorter. The copy above preserves the modified source bytes exactly; no other files from the main worktree are included.

The [FE-01 receipt](../../../../evidence/fe01-main-integration-20260909/README.md#L20) records its 10/10 WK-98 result on patch `343e59b`. This hold does not establish that revision 7 was used in that run and must not be cited as that run's evidence. It preserves the un-attributed worktree input for later attribution or disposition; it does not revise or replace the committed JSON or its receipt.

## Original current-status input

The modified main-worktree `engineering/current.md` is preserved byte-for-byte in [`current-before-release.txt`](current-before-release.txt): 157,471 bytes with SHA-256 `e2b26b654359efec54bd593f972f2edec987e208d950c620a2f01dc5ff1f8182`. The active release-worktree [`engineering/current.md`](../../../current.md) differs only by an eight-line final-status section inserted after its existing heading and blank line. Removing that inserted section reproduces the original source bytes exactly. The preservation manifest therefore points to this `.txt` snapshot, not the active status file.
