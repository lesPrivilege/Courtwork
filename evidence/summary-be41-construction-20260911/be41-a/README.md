# BE41-A compatibility verification

This directory records bounded test-author evidence for the backend candidate
`aa3112db30d96ac7fca3e3420e45c94ac3080bc5` (`codex/be41-compatibility-20260911`).
It is not an independent product acceptance record. The backend implementation
and current/main were not edited by this verification.

## Inputs and scope

- Backend source consumed from the merged BE41 candidate at `aa3112d`.
- Existing six `work_derivations` tests in
  `app/tests/work-derivations.test.mjs`.
- New bounded compatibility cases in
  `app/tests/work-derivations-compatibility.test.mjs`:
  - authenticated HTTP snapshot binding across projects and an off-page source
    mutation, both returning `409 derivations_snapshot_changed`;
  - an HTTP page beyond `total` with an empty `matters` array and a stable
    top-level `snapshotRef`, including a same-token repeat;
  - FILE contract / Matter version `0`, plus a synthetic source revision `0`
    legacy row reported as `partial/source_history_unavailable` with null
    derivation counts;
  - exact stale-reference boundaries for 19, 20 and 21 stale candidates:
    19/20 refs are complete, 21 returns exactly the first 20 and sets
    `staleRefsTruncated: true`.

All fixtures use temporary data directories, Core loopback and no provider.
The source-revision-zero row and the beyond-total page are compatibility
counterexamples; they do not introduce a second state owner.

## Result

Command:

```text
node --test app/tests/work-derivations.test.mjs app/tests/work-derivations-compatibility.test.mjs
```

Result: **10/10 passed** (six existing tests plus four new compatibility
tests). The raw output is [work-derivations-targeted.log](work-derivations-targeted.log).

No paid provider, personal data, migration, deployment or external service was
used. This evidence should be independently re-run on the final combined tree
before any BE41-A acceptance decision.
