# Coding dogfood preparation round-2 final nonauthor review

Date: 2026-09-20. Integration worktree: `/Users/lesprivilege/Projects/.worktrees/courtwork-dogfood-integration-20260920`, clean at `46409b2e20d42fc7b37cda5276b9a65ec6d2ca3c` (`fix: validate reused dogfood data directory before reading or launch`). The source baseline is `c6a2b91362df8800453a7b88fa0e57a643f29791`; the prior reviewed candidate was `231532a7886963eddca587a61cc8ab7bee813d14`.

This was a bounded nonauthor review only. No source edits, full suite, provider call, credential/config read, reserved instance, or other writer tree was touched. All synthetic roots and sentinels were disposable `/tmp` fixtures; no Host launch command was executed.

## Code delta reviewed

The integration correction adds the data-directory realpath guard at `app/scripts/prepare-coding-dogfood.mjs:190-206`:

- `realpath(manifest.dataDir)` is taken before `entries()` or `launchContract()`.
- The resolved data directory must remain within the canonical instance root.
- The canonical root itself and a path within the source tree are rejected.
- The error is raised before any external data read or launch contract is returned.

The new regression test is `app/tests/coding-dogfood-preparation.test.mjs:282-305`; it checks an external sentinel, the instance root alias, the source alias, marker preservation, and an ordinary directory after the rejects.

## Preparation suite

Command run once:

```text
node --test app/tests/coding-dogfood-preparation.test.mjs
```

Log: `/tmp/cw-dogfood-round2-final-preparation-tests.log`.

Result: 13 tests, 13 pass, 0 fail, 0 cancelled, 0 skipped; exit 0; duration 1938.8285 ms. This includes the earlier R1/R2/R3 cases and the new redirected `runtime-data` regression.

## External synthetic probes

Log: `/tmp/cw-dogfood-round2-final-preparation-probes.log`.

- **Ordinary reuse:** accepted; `hostDataDirUsed: false`, source HEAD matches the manifest, source worktree clean, and launch data path resolves to the ordinary instance `runtime-data` directory.
- **External data sentinel:** replacing `runtime-data` with a symlink to a separate sentinel is rejected with the instance-data-boundary error; the sentinel marker remains unchanged.
- **Root alias:** replacing `runtime-data` with a symlink to the synthetic instance root is rejected.
- **Source alias:** replacing `runtime-data` with a symlink to the synthetic source directory is rejected.
- **Legitimate root symlink:** a root reached through a symlink that resolves to a real directory outside the product repository is accepted; source is clean, the manifest binds correctly, and the data directory is unused/empty.

These probes directly cover the previously observed residual: the external data sentinel is no longer read and no launch argv is returned for it. The legitimate outside-repository symlink remains supported, so the correction does not over-reject valid operator roots.

## Verdict and boundary

The DF11-R1/R2/R3 preparation guards pass this final nonauthor check, including the previously open data-directory symlink case. The integration correction is evidence-ready for the parent’s separate disposition. This report does not independently accept the patch, product dogfood, Runtime/provider support, or any real-model workflow.
