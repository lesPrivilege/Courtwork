# RP-1–8 and E1-B · integration and ended-tree preservation · 2026-09-25

Parent accepted RP-6 at `25e824b` and E1-B at `a171f4d`. Local main integrates them as squash `aebcb8c` (RP-1–8) and the rebased E1-B commits `8197513`, `583814a`, `b4eda57`, then `31144d7` and `78d9eb4` (records). `app/` on main is byte-identical to the accepted trees; the recorder-temp-path commit `f639644` is not in main's history. Nothing is pushed.

[Preservation receipt](preservation.json), produced by the same procedure as the K5 receipt (`preserve.py` copied into the archive): both ended worktrees `courtwork-ux-polish-20260924` (head `25e824b`, 11 commits not on main) and `courtwork-e1-bound-run-20260925` (head `31144d7`) were inventoried with modes, symlinks and hashes (10,107 entries each; the only untracked entry was the `app/node_modules` symlink to main's install), archived, physically extracted and matched to their manifests. The full repository bundle was verified, mirror-cloned and connectivity-checked. Archive refs `refs/archive/ux-e1b-20260925/*` keep both heads; the archive directory is `Projects/.archives/courtwork-ux-e1b-20260925`.

After that verification the two worktrees and branches were removed; main's own `node_modules` is untouched. The Codex `check-cancel-parity` worktree and the frozen legacy tree were not touched.
