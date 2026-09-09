# Independent BG-01 governance probe

This is a non-author check of the fixed product commit `caa448ee784d1a360e81904ca535f691d2a41ea4`. The runner archives that commit into a fresh temporary directory, starts its extracted `CoreClient`, and uses a fresh temporary SQLite data directory. The repository root is derived from the runner location, and temporary paths are omitted from the captured result so the evidence remains portable. It does not import the author test files or reuse the author's database.

Run from the repository root with:

```sh
./evidence/backend-governance-20260910/independent/runner.sh
```

The complete captured output is in [result.log](result.log), and the reproducible runner is [runner.sh](runner.sh). The runner verified the archived source commit before executing the probe.

## Probe and result

The probe created one retained Matter, issued a human grant, replaced its current source set with **129** valid source descriptors, and then exercised these cases:

- Full human `inspect` refused with `GOVERNANCE_LIMIT` once the source descriptor budget was exceeded.
- Human `policy` query returned policy revision `1` without loading sources, details, or Artifact data.
- Runtime `policy` query refused with uniform `NOT_FOUND`; runtime registry discovery while the oversized grant was active also hit the bounded `GOVERNANCE_LIMIT`.
- Human revocation with `expected_object_version: null` committed policy revision `2`.
- Exact replay of the earlier grant returned the original receipt, while policy stayed revoked and runtime registry count stayed `0`; runtime inspect remained `NOT_FOUND`.
- A host adapter rejected a closed execution with `CANDIDATE_CLOSED` and rejected a project identity change observed after a pending Core call with `CANDIDATE_CLOSED`.

Result: **PASS**. The output records `source_count: 129`, `full_inspect: GOVERNANCE_LIMIT`, `policy_only_revision: 1`, `revoke_revision: 2`, `runtime_policy_query: NOT_FOUND`, `runtime_registry_after_revoke: 0`, and both adapter checks as `CANDIDATE_CLOSED`.

This is a bounded Core/host-adapter probe. It does not claim HTTP/browser coverage, provider coverage, migration/recovery coverage, or full-suite acceptance. No product source, author test, or author evidence was changed by the probe.
