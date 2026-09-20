# Fresh local integration — 2026-09-20

Astra integrated accepted GUI candidate `2b98abb5f412ba5b6f7c04837c4a23ed7d075a93` with Orchestra/governance commit `ba1cb2feeed2a80cc6830cb12c6c9713b282f27f` on the persistent Courtwork main checkout.

The only conflicts were current status and the GUI owner record. Current status keeps Astra's latest acceptance; the owner record retains the complete author delivery history plus byte-identical main-only review sections. Its original native-zoom matrix requirement was restored with the explicit local-integration deferral. All 44 accepted app/tools/capture paths match the GUI candidate byte for byte.

The actual combined tree passed the required product check: **1223/1223 tests**, deterministic runtime smoke (read, write, artifact, close/reopen, continuation, revision, historical bytes), and document links (1426 documents / 8102 references at that check). Spacing and interaction lints passed. Pages build, links (188 files / 296 references), and material checks passed. Full log: [product check](product-check.log). No real provider, deployment or full G4 claim. New raw transcripts/review records were preserved unchanged, including Markdown hard breaks and transcript whitespace; these explain documentation-only whitespace notices in the documentation commit. Source delta whitespace checks passed.

[Luna's cleanup inventory](luna-cleanup-inventory.md) was read-only and precedes the final merge commit. It records all four ended task trees, divergent Orchestra document copies, and the unresolved historical Pages 105-to-43 discrepancy. Cleanup requires verified full-byte archives and Git recovery; the frozen shared database remains in place. The receipt below will record actual merge/archive/cleanup identities.

## Merge and preservation/cleanup receipt

Integrated main commit: `a8aa3235515d412dbf1845e685181f0afc052181` (parents: documentation integration and accepted GUI candidate). Local recovery packet: `Projects/.archives/courtwork-integration-20260920` on this host; it is not a publication or a second product directory. [Recovery instructions](preservation-README.md), [verified archive identities](preservation-SUCCESS.json), [cleanup result](preservation-cleanup.json).

Four ended task trees were archived in full, restored and compared by every file hash/mode or symlink target, then rechecked unchanged before removal: GUI author, GUI review, Orchestra direction, and Pages/N-13. A 542 MB Git bundle was verified and mirror-cloned; all recorded HEADs were recovered and connectivity checked. Named archive refs retain each HEAD; the two consumed task branches were deleted and stale worktree registrations pruned. All source histories remain reachable. Main's unrelated .agents, .obsidian and skills-lock.json were left untouched.

The four archives preserve 1504078425 regular-file bytes, plus directory/symlink metadata. Orchestra's divergent 15 draft paths are archived as superseded drafts under the architecture/document owner, not copied over current documents. Pages' 43 untracked files and all other surviving tracked/ignored bytes are preserved under the original Pages owner; the historical 105→43 discrepancy remains unexplained. N-13 evidence acceptance is not claimed by cleanup.

After cleanup, only Courtwork and Courtwork-legacy-frozen remain registered. The frozen directory and its shared `.git` database were retained; no Git root migration, push or deployment occurred. This completes the user's merge→preservation→ended-tree cleanup gate. The next isolated task may now start from the resulting main SHA on the existing RD-006/DF-04/RD-009 owner; it must not repeat delivered work or imply real-model dogfood from synthetic checks.
