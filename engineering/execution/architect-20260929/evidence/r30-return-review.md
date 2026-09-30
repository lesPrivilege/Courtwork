# Independent Review: R30-1 Workspace Write Placement

- **Reviewer:** Luna 6, non-author review of the R30-1 delta only.
- **Source:** `claude/merge-20260930`, HEAD `d474879b9e8c6e6d916036e755491d61ad6d24c4`; reviewed commit `9b386c672fb691d579a80dfe2778fdc683f0033a` (`fix(workspace): a parent moved during the commit is reported as moved, not written at the path`).
- **Scope:** Re-run the original admitted-parent relocation schedule against the correction's expected result, and independently test relocation of the whole workspace root at the same commit-rename boundary. No product edits, full suite, real data, credentials, or non-synthetic files.

## Results

**Original parent relocation: corrected in the tested schedule.** Immediately before forwarding the helper's descriptor-relative rename, the synthetic hook moved `workspace/out` to `outside/moved-parent`. The tool returned `details.placement: "moved"`, reported that the bytes were not at `out/memo.md`, and called no `onWritten` callback. The exact synthetic bytes remained in the moved admitted directory. An unrelated outside control file was unchanged.

**Residual: whole-root relocation still reports path success (P2).** At the same hook boundary, the synthetic hook moved the entire `workspace` root to `outside/moved-root`. The helper's new postcheck calls `open_workspace_directory(root_fd, parts[:-1])`, so it traverses from the already-open root descriptor and compares the same parent inode. It does not verify that `root_fd` is still named by `rootPath`. The tool returned ordinary success for `out/memo.md` and called `onWritten`, although the configured workspace path no longer existed and the bytes were under `outside/moved-root/out/memo.md`.

This is a false workspace-path success after relocating the admitted root, not a write to an unrelated outside file: the exact workspace directory tree and the target parent were moved. The synthetic unrelated outside control file remained unchanged. `open_bound_root` checks root placement before the rename, but `ws_write_commit` returns from its operation without a post-rename `verify_bound_root`; the parent-currentness fix's postcheck is relative to the held root descriptor and cannot detect that the root itself moved.

There is also an error-reporting mismatch in the new result path: `commit_workspace_write` catches any `OSError` during its postcheck and maps it to `placed: false`, while `workspace-tools.mjs` reports that the directory definitely left the workspace and that the bytes are definitely not at the path. A failed lookup could also reflect a read/lookup error. Unless the helper distinguishes those cases, the result should report placement as unconfirmed rather than assert a move.

## Reproduction

Run from the reviewer checkout:

```sh
node engineering/execution/architect-20260929/evidence/continuation-20260930/r30-return-probe.mjs /path/to/reviewed/checkout
```

The source-pinned probe and captured JSON output are [r30-return-probe.mjs](continuation-20260930/r30-return-probe.mjs) and [r30-return-probe.log](continuation-20260930/r30-return-probe.log). The portable probe imports the product module from the supplied checkout, creates isolated temporary synthetic roots for both cases, asserts the corrected parent-move result and the root-move counterexample, and removes the temporary fixtures afterward. Parent independently reran both cases before making the portable copy. No broad fuzzing or suite run was performed.

**Disposition:** Accept the correction for relocation of a child parent in the tested schedule. Keep R30-1 open for whole-root relocation if the contract requires success to mean the configured workspace pathname still names the bytes after commit. A postcheck should also verify the root descriptor against its configured path; it can only bound the check-to-return race and cannot guarantee placement against an actor that moves the root after the postcheck.
