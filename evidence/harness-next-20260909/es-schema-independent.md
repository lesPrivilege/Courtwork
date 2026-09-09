# ES-01 independent schema and host-compatibility probe

Ran [the independent harness](./es-schema-independent.mjs) against the final fixed ES source commit `b1ff74b08c053fa0e3ab47fb20f510eabb9440e9`:

```text
ES_CODE_SHA=b1ff74b08c053fa0e3ab47fb20f510eabb9440e9 node evidence/harness-next-20260909/es-schema-independent.mjs
```

Result: **passed**. The harness extracted the legacy Core/bridge from `a7a08f035cc5a716b8c7a93024cdfe4e44e4c07d` and the final Core/bridge/file-candidate sources from the ES commit into separate temporary directories. It created a synthetic old memo Matter, Run, Candidate and accepted Decision through the old JSONL bridge, then upgraded a copied database through the new bridge.

- Legacy bridge reported Core user schema `1` / app schema `2`.
- New bridge reported Core user schema `2` / app schema `3`.
- The original seeded database SHA-256 was `8c4f95ca21b5d0d87101adf110da1198502f6c60a1c76631bfe3279e2996396c`; migration operated on a copied database.
- Core state digest stayed `89e836ba27a564be585bde6ce0a185e9c32e1917b3cee5d3e675118970fba7b6`.
- The accepted Decision receipt stayed `{request_id:"legacy-decision", matter_id:"legacy-matter", candidate_id:"legacy-candidate", action:"accept", version:1, active_artifact:"artifact-legacy-candidate-1"}`.
- The migration created `.pre-file-core-v2-app-v3.bak`; copying that backup into an independent directory let the old bridge reopen it with the same digest and receipt.
- Opening the upgraded database with the old bridge failed at startup with `SCHEMA_NEWER` (`unsupported user_version=2`).

The three fail-closed probes also passed. Each reports equal database SHA-256 before and after the failed startup:

| Probe | Error | SHA-256 before / after |
| --- | --- | --- |
| `app_run_context` without `projection_json` | `SCHEMA_INVALID` (`unsupported app_run_context schema`) | `128763bf54ed76a81ead3d00a945925e5acd169ab245bc9951073032ecbf869e` / same |
| malformed pre-existing `candidate_file_bundle` in app schema 2 | `SCHEMA_INVALID` (`file tables found in an older schema`) | `d542259e95658f4dc114ccf6032cdf833250aa729c2de8eced0a947ee010ca9e` / same |
| pre-existing `.pre-file-core-v2-app-v3.bak` | `SCHEMA_INVALID` (`migration backup already exists; restore or inspect it explicitly`) | `8c4f95ca21b5d0d87101adf110da1198502f6c60a1c76631bfe3279e2996396c` / same |

The pre-existing backup sentinel also retained its SHA-256 (`7cb2b4d582af7ed4bc899184eba03f2e0641619e807b75a90a651dd46362f447`) before and after refusal. All databases and source extracts were temporary synthetic data; no runtime-4 or personal workspace data was opened. SQLite’s online backup repacked database pages (`backupDbSha256=9fb1f2168ed378aa9ab35e66987deeb0597b1d175135efbd75fe498f16e6faa2`), so semantic digest and Decision receipt were compared for the backup while the fail-closed cases used exact byte hashes.
