# Delivery rollup merge audit

This directory records the read-only rollback and merge-scope audit for the 2026-09-10 delivery rollup. It is an audit artifact; it does not change product source, runtime state, credentials, or provider data. The audit was written against branch `codex/delivery-rollup-20260910` at accepted Attention merge `055cffcbc18eb26d15f3818aada50b82a4bd0fa8` (parents `aa2c55b74dd872c9f9156b09dcdf9b7f07075c8a` and `1097fd453a6da0d0302cb64a881b48c583dc06d1`).

## Purpose

Each delivery round is tied to its exact commit, parent topology, expected write domain, and independent evidence. The audit makes accidental broad rollback visible before any path is staged. For merge commits, the first-parent delta is the rollup write and the second-parent delta explains the source branch that was joined. `matrix.tsv` is the machine-readable index; the audit logs preserve the reproducible comparisons and checks.

The comparison anchor is `2e9da09bd163ca128e3cd2f4c91ef61ceec2fc2f`, the first observed `origin/main` baseline. The pre-delivery baseline range through `df9fc18b9f1a8374d72fa071c2b9c1e61e0010d1` records 264 paths (`A221/M43`, no deletions) and retains Runtime 11, Core 4, app 5, SK-1..4, Q01, and Q02. The full exact parent and subject data are recorded in `git-diff-per-round.log`.

## Audited rounds

- ICON merge `e2ab3f5ef106b6bcbbbb5a7574282a40904d3faf`: first-parent delta `A91/M12`, no deletions; backend protected paths unchanged.
- ICON specimen whitespace maintenance `6169f015f1cacd342f89cd29c2b7acad9a426ef3`: two modified files, no deletions; `app/web/vendor` bytes unchanged. The generator has a deliberate `rstrip` line, so this is recorded as generator hygiene rather than a pure whitespace no-op.
- Spark contract integration `0220d350b05aac9eafabe9620d34673f3d01adc7`: three contract documents, no deletions; product app unchanged.
- FE-05a merge `68b8d3d67d6b66d1a6c2c8d4f72ff7079135b662`: 255 paths (`A246/M9`), no deletions; backend protected paths unchanged.
- Scoped ATT preparation `1097fd453a6da0d0302cb64a881b48c583dc06d1`: 37 paths (`A33/M4`), no deletions; backend protected paths unchanged.
- Material specimen merge `aa2c55b74dd872c9f9156b09dcdf9b7f07075c8a`: 51 specimen/docs/evidence paths, no deletions; app source unchanged.
- Accepted ATT merge `055cffcbc18eb26d15f3818aada50b82a4bd0fa8`: first-parent ATT delta is the same 37 paths (`A33/M4`), no deletions; its other-parent delta is the 51 retained material paths. Independent ATT evidence records 116/116 browser checks and 29/29 targeted checks.
- Spark candidate sequence `9761303450280c8100aec4b0c4617f9d2c55e7bb`, `eccacd04f715cc7502f755b4e3df71e5353bcce2`, and `20d8330dc6555d073a6bdec7ebf1e6bafc7aee99`: each has no deletions and remains limited to Spark UI/tests/fixtures/evidence and the shared chip token.

The assembled product candidate `4003c548a314246d8c46516c4033fa5602e19c4b` has parents `20d8330dc6555d073a6bdec7ebf1e6bafc7aee99` and `1097fd453a6da0d0302cb64a881b48c583dc06d1`. Its first-parent delta is the 37-path ATT set and its second-parent delta is 20 Spark paths (`A16/M4`, no deletions), including the expected `app/server/index.mjs` static registration seam. The candidate remains pending the Spark independent review; the recorded full suite and smoke evidence is linked below and was not rerun during this audit.
The retention table shows 19/20 exact Spark source blobs in the candidate; the one changed blob is the authorized ATT/Spark shared `app/web/styles.css` hunk. The 51 material source paths are exact in accepted `055cffc` but absent from candidate `4003c548`, which was assembled before the material merge; they remain an explicit final-merge reconciliation item.

## ATT exclusion

The original ATT source `cd1326d8481e4965e96e8ee4f40cc531a67d4fef` was compared with its actual base `a579929edd66544e6aa7cd8cd7d2399fae8265d3` and produced 144 paths (`A30/M21/D90/R3`). Its deletion set includes review-core fixtures/tests, agent-interface and skin-injection design records, the 2026-09-10 review tree, and older evidence. That source is retained only for provenance. The rollup uses scoped extraction `9db6fc4362a07dc8ff20e1914e2ac471f20b62c1`, whose `a579929..9db6fc4` delta is exactly 37 paths (`A33/M4/D0/R0`). See [attention-exclusion.log](attention-exclusion.log) for the exact deleted and renamed paths.

## Evidence and checks

- [matrix.tsv](matrix.tsv) lists every audited round, exact IDs, topology, counts, protected checks, expected domain, and evidence.
- [retention-check.tsv](retention-check.tsv) records every source-delta path with source/target mode and blob IDs. `retained_exact` is byte-and-mode equality; every changed blob is either an authorized later hunk or an explicit topology exclusion.
- [retention-check.log](retention-check.log) summarizes the per-round counts and calls out the 51 material paths absent from candidate `4003c548` for final merge reconciliation.
- [shared-invariants.tsv](shared-invariants.tsv) records the SK, four FE-05a product commits, ICON, ATT, and Spark shared-file hunks with their checks and evidence.
- [git-diff-per-round.log](git-diff-per-round.log) records exact diff commands, shortstats, and status counts for primary and second-parent comparisons.
- [structural-check.log](structural-check.log) records no-delete checks, protected-path exit codes, the inherited `git diff --check` warnings, and links to the real targeted logs materialized for this audit.
- [attention-exclusion.log](attention-exclusion.log) records why the original ATT tree cannot be used as a rollback or merge source.
- [commands.log](commands.log) is the compact reproducible command manifest.
- Existing combined candidate evidence: [full-suite-result.json](../integration/logs/full-suite-result.json) (`4003c548`, 637/637, 470.11s, timeout false), [full-suite.log](../integration/logs/full-suite.log), and [smoke.log](../integration/logs/smoke.log).
- Existing independent delivery evidence: [ATT independent verification](../attention/independent-verification.md), [ATT browser result](../attention/independent-browser-verification.json), [material independent verification](../material/independent-verification.md), [FE-05a independent verification](../fe05a/independent-verification.md), and [Spark browser result](../../spark-delivery-20260910/browser-regressions.json).

The candidate tree reports four inherited whitespace warnings under `evidence/att-fe01/contrast.log`, `evidence/fe05a/contrast.log`, `evidence/fe05a/baseline-checks.mjs`, and `evidence/fe05a/type-checks.mjs`. Their bytes are preserved for evidence provenance; this audit does not normalize them.

The per-blob comparison found no unexplained later modify and no additional rollback after the authorized shared hunks. That conclusion is limited to the listed source/target SHAs and the topology exclusions recorded in `retention-check.tsv`; no product acceptance or deployment decision is implied.

## Incremental Spark route repair

The verified-source route repair `936239dca9d7eac0cab859960f8b19950c760193` is based on Spark candidate `20d8330dc6555d073a6bdec7ebf1e6bafc7aee99`. Its source delta is exactly five paths (`A3/M2`): the host route, six focused routing tests, the Spark evidence README, and before/after routing logs. Combined candidate `1f8317a999abf04508b7fc9d65e758796374aafd` has parents `4003c548a314246d8c46516c4033fa5602e19c4b` and `936239dca9d7eac0cab859960f8b19950c760193`.

The incremental tree comparison found all five repair blobs applied with exact mode/blob equality, 3,589 other candidate paths retained exact mode/blob equality, and zero unexpected merge differences. The changed path set of `4003..1f` equals the source delta of `20d..936`; protected `app/server/index.mjs` and `app/core.mjs` remain unchanged. See [spark-route-incremental-retention.tsv](spark-route-incremental-retention.tsv) and [spark-route-incremental-retention.log](spark-route-incremental-retention.log).

[spark-route-invariants.tsv](spark-route-invariants.tsv) records the route's navigation-epoch cancellation, project/session/binding revalidation, and existing Work preview reuse at exact source coordinates. The six focused routing tests and `routing-unit.log` are author evidence (`44/44`); independent browser re-review remains separate. This incremental source/merge audit does not claim BE-41 snapshot readback or close RV26-SP01/ME03.

## Final merge reconciliation

The final product merge is `d0118ab356c541f0ff2dcd9bc867c438399d3e7d`, with parents accepted ATT/material HEAD `055cffcbc18eb26d15f3818aada50b82a4bd0fa8` and verified-source Spark repair `936239dca9d7eac0cab859960f8b19950c760193`. The 51 added material paths from `aa2c55b74dd872c9f9156b09dcdf9b7f07075c8a` are each retained with exact Git mode/blob in d0118: [final-material-retention.tsv](final-material-retention.tsv) records `51/51` exact, with no missing or changed path.

The fixed product candidate `1f8317a999abf04508b7fc9d65e758796374aafd` has `3,594/3,594` non-material paths mode/blob-equal in d0118, with zero unexpected differences. Scope counts are `app/ 265/265`, `tools/ 42/42`, `docs/work-core/ 5/5`, `docs/runtime-control/ 8/8`, `app/domains/ 5/5`, `brand/ 87/87`, and the two app/package.json full-test globs `142/142`; d0118's 51 final-only paths equal the material set exactly. See [final-product-equality.tsv](final-product-equality.tsv) and [final-reconciliation.log](final-reconciliation.log).

The supplied final evidence metadata identifies the fixed 1f test tree and records 643/643 with zero failure, cancellation, skip, and timeout; final smoke, four lints, doc-link check, and review ledger all pass by read-only inspection. No large suite was rerun for this reconciliation. The final receipt and current opening sections retain the BE-41, RV26-SP01/ME03, G1-G5, provider, migration, and deployment boundaries.

This audit is bounded to the listed commit SHAs and parent topologies. A later commit or modify requires an incremental path, blob, and invariant check.
