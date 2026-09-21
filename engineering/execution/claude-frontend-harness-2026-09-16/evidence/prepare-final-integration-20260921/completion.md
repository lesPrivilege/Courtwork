# Local integration and preservation receipt

Accepted source: `b3f3fd75b7f2f2b5c3084d4be5d83c614eca3854`. Review packet commit: `ce50130e1d43c974f983fc27fb9df927138989c1`. Local main merge: **`a3503fb2530a384d3a756de7cb0ccc246f97d3e0`**, from main `4a7ebfac889e426a8e01069c65b58ae47a99f14c`. No conflict or history rewrite; Claude's reviewed commits remain ancestors. `git diff b3f3fd7 HEAD -- app` was empty after the merge. The actual main entry/lifecycle checks passed **22/22**, exit 0 ([raw log](integrated-main-tests.log)). Independent final 70/70 and the broader check scope are in the [acceptance packet](README.md).

## Running WebUI

The already-running 8787 Host retained its old static module allowlist, so the newly integrated `home-preparation.mjs` returned 404. Astra confirmed all five Runs across two Chats were terminal, gracefully stopped the old Host, and restarted accepted main on the same port and existing data directory. No key store was inspected or exported and no provider was called. [Restart comparison](host-restart-verified.json) verifies exact equality of both complete Session detail responses before/after, including their Runs/events/receipts, and verifies the served new module equals the accepted source bytes (HTTP 200). Preview 8899 remains the existing process. The user's browser tab was not reloaded or closed; the updated WebUI is available on its next refresh.

Synthetic ports 8924/8925/8926 and the agent review tabs are stopped/closed. Synthetic test data remains outside Git. This restart is a local development handoff, not deployment or a new dogfood acceptance.

## Preserved and removed

Only these two released, ended trees were removed; source authors and verifier had completed, and no process cwd remained in either tree:

| Ended tree | Archived HEAD | Inventory entries | File bytes |
| --- | --- | ---: | ---: |
| courtwork-prepare-approval-20260920 | `4b7b98ebce4819b94a42337ed87c1b6a58a166e4` | 38029 | 974584666 |
| courtwork-prepare-integration-20260921 | `ce50130e1d43c974f983fc27fb9df927138989c1` | 8744 | 444385193 |

[Preservation manifest](preservation-verified.json) records exact file archive and inventory SHA-256 hashes. Archives include all tracked, untracked and ignored bytes, binary staged/unstaged patches, refs and unique-commit inventory. The integration dependency symlink is preserved as a symlink, not followed into the main checkout. Each file archive was physically extracted and compared for bytes, modes and link targets; each source inventory was rechecked unchanged before deletion. All source commits are ancestors of integrated main.

The archives live outside the product under `../.archives/courtwork-dogfood-ready-20260920/` relative to the persistent Courtwork checkout. `prepare-increment.bundle` was verified, fetched into the separate `git-restore-check` repository, and passed `git fsck --connectivity-only`. Restored main and both archive refs match the manifest exactly. This incremental bundle requires commit `f5b375259045d4b9b43cac185145b959a954b925`; the existing earlier bundles and verified restore repository are retained with it. The two branch names were deleted after integration; their `refs/archive/dogfood-ready-20260920/...` refs remain.

[Registered trees after cleanup](worktrees-after.txt) contain persistent Courtwork and Courtwork-legacy-frozen only. **The frozen tree and its `.git` shared database dependency remain intact.** No Git-root migration or historical count reconstruction was attempted. Personal `.agents/`, `.obsidian/` and `skills-lock.json` remain untracked and untouched in main. Nothing pushed or deployed; heartbeat remains paused.

PA-R1–R3 are now closed within 06b. Native zoom, screen reader, forced colors, material-upload recovery and broader G4 remain with their existing owners; ordinary tool argument capture remains the Runtime/Host contract decision. Runtime management remains the next bounded frontend journey, not started by this integration.
