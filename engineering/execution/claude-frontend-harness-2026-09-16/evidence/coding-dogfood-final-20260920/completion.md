# Dogfood readiness — merge and preservation receipt

2026-09-20 · Astra completed the authorized local integration and cleanup.

Accepted source `3618947a6441c644bfaded75d41e96a6b4251b38`, including Claude's corrected delivery and the two independently verified integration guards, is integrated in **main `972fc9a22389b85c4a495f1d1f720ec71d07e099`**. All five source hashes match the [accepted manifest](source-sha256.json). This receipt is a documentation-only descendant of that integration node.

## Preservation and cleanup

The three ended dogfood trees were inventoried for refs/HEAD, unique commits, staged and unstaged patches, untracked and ignored entries. Every existing file byte, mode and symlink was archived; tar archives were physically extracted and compared against complete SHA-256 manifests. A Git bundle of all refs was verified, cloned as a mirror and checked for connectivity and each archived HEAD. Immediately before removal, original file inventories and HEADs were rechecked; every source HEAD was an ancestor of main. Process cwd inspection found only the retained 06a preview, not a writer in an ended dogfood tree.

| Removed tree | Archived HEAD | Preserved entries | File bytes |
| --- | --- | ---: | ---: |
| `courtwork-coding-dogfood-20260920` | `231532a` | 37783 | 970904079 |
| `courtwork-coding-dogfood-review-20260920` | `94d60d2` | 8455 | 440212434 |
| `courtwork-dogfood-integration-20260920` | `972fc9a` | 8510 | 441153920 |

The author and integration branches were deleted after merge; all three exact HEADs remain under `refs/archive/dogfood-ready-20260920/`. No stale worktree registration remained. [Machine receipt](completion.json) records full archive and manifest hashes, bundle hash and local preservation paths. Archives are under the sibling `.archives/courtwork-dogfood-ready-20260920` directory; `files.tar.gz` plus `files.json` restore each tree's files, and `repository.bundle` restores refs/history. The full mirror restore is also retained locally. No unexplained historical byte loss is claimed resolved by this cleanup.

Retained: Courtwork main; frozen Courtwork-legacy-frozen and its shared `.git` database; both pending 06a Agent-profile trees at `0f76407`; their author's port-8899 preview; and the reserved dogfood instance. The unrelated main untracked `.agents/`, `.obsidian/`, and `skills-lock.json` were not staged or edited. 06a findings stay with Claude; the next frontend journey has not started.

## Ready for the user's WebUI pass

After removal, read-only `--reuse` from main confirms the reserved synthetic source remains clean at `c8310f06ef6049a9639ba418f6ea3c42cd7831ad` and **`hostDataDirUsed: false`**. The [reuse result](reserved-instance-after-cleanup.json) derives the executable entry from Courtwork main; the old author path in the instance manifest remains provenance and need not exist. No Host was launched against this instance.

Use [launch instructions](../coding-dogfood-readiness-20260920/startup-and-launch.md), then the [natural-language task](../coding-dogfood-readiness-20260920/real-model-prompt.md) and [browser checklist](../coding-dogfood-readiness-20260920/browser-checklist.md). Select an explicitly authorized real connection and Ask before editing. The default Local test provider verifies wiring only. Real-model N-02, user/browser acceptance, full G4 and slice 02 presentation gaps remain with their existing owners.

Final independent evidence: preparation 13/13; startup-deadline lifecycle 2/2; separate-process rehearsal 15/15, all exit 0. The heartbeat remains PAUSED (verified from its saved record). No personal credential access, paid-provider call, push or deployment occurred. [Completion file hashes](completion-sha256.json) cover this appended receipt and its two JSON records; the earlier evidence manifest remains unchanged.
