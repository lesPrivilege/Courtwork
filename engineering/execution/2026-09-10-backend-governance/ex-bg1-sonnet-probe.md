# EX-BG1 · BG-01 只读验收探查（Sonnet）

2026-09-10。派发者 Fable；执行 Sonnet Explore（只读，允许在 OS 临时目录重跑定向测试与独验脚本）。对象：`main`=964c37f，产品 `9a8a13a`，整合 `caa448e`，证据 `a85132b`。裁定见 [acceptance-20260910.md](acceptance-20260910.md)。以下为探查报告原文。

---

## A. Scope and blast radius

| # | Claim | Verdict | Evidence | Note |
|---|---|---|---|---|
| A1 | Full changed-file list groups cleanly; no app/web changes; no Attention policy changes beyond additive calls | CONFIRMED | `git diff --stat b4e3f71..964c37f` (39 files: app/core/{bridge,core,governance}.py, app/{runtime,server,extensions}/*, app/tests/*, docs/*, evidence/*, engineering/*); `app/core/attention.py` has zero diff lines | `app/runtime/attention-tools.mjs` diff is purely additive: imports `GOVERNANCE_TOOL_NAMES`/`createGovernanceTools`, appends to `ATTENTION_TOOL_NAMES`, and prepends governance tools only when `governanceForProject` is supplied. `app/core/bridge.py`'s old `ensure_app_schema` body was renamed verbatim to `ensure_attention_schema`; a new `ensure_app_schema` wraps it. `docs/work-core/attention.md`/`contract.md` diffs are cross-reference prose only, no semantic change. |
| A2 | Three new Matter tables live in existing WorkCore SQLite; no second registry store; no copy of domain state/source bytes/Artifacts | CONFIRMED | `app/core/governance.py:9-25` (`GOVERNANCE_SCHEMA`), `app/core/bridge.py:207-217` (`GOVERNANCE_TABLES` folded into `validate_owned_schema`'s single reference schema alongside `FILE_SCHEMA+APP_SCHEMA+ATTENTION_SCHEMA`) | Tables: `matter_disclosure` (policy/current grant, PK project_id+matter_id), `matter_disclosure_event` (append-only, UNIQUE project/matter/revision), `matter_disclosure_request` (immutable receipts, PK project_id+request_id). Reads go through `store.conn.execute` against the same connection/db_path as Matter/Candidate tables — no second file, no second `Store`. `governance.py:189-220` (`matter_snapshot`) reads Matter/source/artifact rows by reference only; nothing is copied into the new tables (which hold only policy JSON). |
| A3 | Core3/app4→Core4/app5 upgrade validates old tables, writes exclusive backup, publishes schema+markers atomically; crash-mid-upgrade test exists | CONFIRMED | `app/core/bridge.py:355-378` (`ensure_app_schema`), `app/core/bridge.py:251-264` (`exclusive_migration_backup`, `O_CREAT\|O_EXCL`), `app/tests/governance-recovery.test.mjs:94-107` | `ensure_app_schema` validates existing Core3/app4 (`validate_owned_schema(...,'4',complete=True)`) before backup; backup uses `os.open(...,O_CREAT|O_EXCL|O_WRONLY,0o600)` refusing to follow/replace a symlink or existing file (also refused by `not allow_initialize and os.path.lexists(backup)` one line earlier for a pre-existing name). Schema DDL, `app_meta`, `meta`, `PRAGMA user_version` are updated inside one `BEGIN IMMEDIATE`…`commit`. Two SIGKILL tests exist at `governance_migration_before_commit`/`governance_migration_after_commit` (`app/tests/fixtures/work-core/governance-crash.py`, invoked from `governance-recovery.test.mjs:94-107`) asserting zero-or-one complete effect on both markers and the three new tables together. |

## B. Security boundary

| # | Claim | Verdict | Evidence | Note |
|---|---|---|---|---|
| B4 | Runtime cannot read policy endpoint or mutate grants via HTTP; rejection is uniform | CONFIRMED | `app/server/service.mjs:876-887` (`queryGovernance`/`setMatterDisclosure` always construct `{...this.#attentionContext(projectId), purpose:'human-governance'}` with hardcoded `actor:'local-user'`); `app/core/governance.py:112-132,358-362` (`kind in {'policy','policy_request'}` requires `ctx['actor'] != 'local-user' → unavailable()`); `app/tests/governance-http.test.mjs:36-55` (esp. line 51: injected `context:{actor:'runtime'}` in the HTTP body → 400, ignored) | The HTTP layer structurally cannot produce a `runtime` actor — client-supplied `context`/`actor` fields are discarded server-side. `governance.py:158-174` (`access()`) unifies all runtime-actor failure paths (missing grant, expired, corrupt state, unsupported schema) into a single `unavailable()`→`NOT_FOUND`, so no distinguishing signal leaks object existence; `governance-core.test.mjs:75-79` and `:209-223` exercise this uniformity across scope mismatch, corrupt provenance, and cross-project refs. Runtime mutation is separately impossible because `createGovernanceAdapter` (`app/extensions/governance-adapter.mjs`) exposes only `.query`, never `.action`, and `governance.py:380-382` hard-fails any non-local-user `action()` call with `DISCLOSURE_DENIED` (tested `governance-core.test.mjs:49`). |
| B5 | Grant binds human-observed complete permitted view (content hash); revoke uses null-hash policy CAS; works when content >128 sources | CONFIRMED | `governance.py:401-404` (grant path requires `expected_object_version` match on `matter_snapshot`'s `object_version`); `governance.py:387-388` (revoke requires `expected_object_version is None`); `app/tests/governance-core.test.mjs:225-237`; independently reproduced at `evidence/.../independent/runner.sh:64-95` | 129-source oversized-content counterexample: `governance-core.test.mjs:225-236` seeds 129 sources (over `MAX_REFS=128`), shows `inspect` fails `GOVERNANCE_LIMIT` while `policy`-only query still succeeds and revoke (`expected_object_version:null`) still commits (revision 1→2). |
| B6 | Old body-page token can't read new content version; old grant receipt replay doesn't resurrect revoked grant | CONFIRMED | `governance-core.test.mjs:100-107` (stale `expected_object_version` on `source` query after `replace_sources` → `VERSION_CONFLICT`); `governance-core.test.mjs:39-62` (`assert.deepEqual(await act(core, request), receipt)` after revoke, still returns old receipt, `inspect` for runtime still `NOT_FOUND`, policy grant stays `null`) | |
| B7 | Hidden source-field changes don't change registry-only hashes | CONFIRMED | `governance.py:199` (view built only from `allowed` fields — hidden fields never enter `digest(view)`); `governance-core.test.mjs:64-73` (`replace_sources` with a registry-only grant leaves `object_version` and the whole registry page byte-identical) | |
| B8 | Source descriptors mark integrity unchecked; byte reader verifies exact bytes | CONFIRMED | `governance.py:185` (`'integrity':'unchecked'` in `source_descriptors`); `governance.py:286-290` (`source_page` checks `row['digest']!=ref['digest'] or sha256_text(row['text'])!=ref['digest']` → `INTEGRITY_REFUSAL`); test `governance-core.test.mjs:171` (mutated `source.text` → `INTEGRITY_REFUSAL`) | Same pattern for Artifacts at `governance.py:314-316`. |

## C. Evidence integrity

| # | Claim | Verdict | Evidence | Note |
|---|---|---|---|---|
| C9 | focused.log 21/21, which tests | CONFIRMED | `evidence/backend-governance-20260910/focused.log` (tests=21,pass=21,fail=0) | Exactly the union of `governance-core.test.mjs` (11), `governance-http.test.mjs` (3), `governance-recovery.test.mjs` (7) = 21; names match 1:1 in the log. |
| C10 | integration-tests.log 467/0/0/0; concurrency setting; commit/SHA stated in log | PARTIAL | `integration-tests.log` tail (tests 467, pass 467, fail 0, cancelled 0, skipped 0); `author-tests.log` interrupted with `T-IDEM-1`/`T-IDEM-5` and others failing; `timeout-recheck.log` 19/19 | 467/0/0/0 confirmed by direct log read. The log itself contains no command line, concurrency flag, commit SHA, or working-tree statement — that framing is README narrative only. `author-tests.log` shows two of the six interrupted-run failures were themselves governance tests (`runtime adapter rejects mismatched/closed host Runs…` and `migration refuses existing or symlink backup…`, lines 187/191); `timeout-recheck.log`'s "three affected files, 19/19" does not include these two — they are shown passing only inside the full 467-test integration run and in the re-run below. Not blocking. |
| C11 | smoke.log content | CONFIRMED | `smoke.log` | Generic runtime smoke (material read, tool write, persisted artifact, close/reopen, continuation, revision, historical bytes) via `local-fake` provider — no governance-specific assertions, matching the README's own characterization. |
| C12 | independent/ pinned SHA, ran what, real assertions for 5 probes | CONFIRMED | `independent/{README.md,result.log,runner.sh}` | Pins `caa448ee784d1a360e81904ca535f691d2a41ea4` (integration merge — the product state). `runner.sh` does `git archive` into a fresh temp dir + fresh temp SQLite data dir, imports `CoreClient`/`createGovernanceAdapter` from the archived tree only. All 5 probes use real `assert.equal`/`assert.rejects`/`assert.deepEqual` (`runner.sh:70,77,86,89,94-95,102-118`). Re-executed `runner.sh` in this session: `status: PASS` with identical field values. |
| C13 | packets.json has no token/email/personal-path strings | CONFIRMED | `grep -ci 'bearer\|token\|@\|/Users/' app/tests/fixtures/governance/packets.json` → `0` | |

## D. Re-measurement

Ran `node --test tests/governance-core.test.mjs tests/governance-http.test.mjs tests/governance-recovery.test.mjs` from `app/` (package.json `test` script pattern; CoreClient uses `mkdtemp(tmpdir())`, writes only to OS temp, not the repo).

Result: 21/21 pass, 0 fail, duration 4036ms — matches `focused.log` exactly, including test names/order. `git status` before/after unchanged for all tracked files.

Also re-ran `evidence/backend-governance-20260910/independent/runner.sh` directly — reproduced `status: PASS` with the same field values as `result.log`.

## E. Gaps

| # | Finding | Verdict |
|---|---|---|
| E15a | Contract says relations are "not exposed by this first generic reader" (`governance.md:32`) — no relation traversal path in `governance.py`; `attention_snapshot` drops `relation_refs` (`governance.py:237`, tested `governance-core.test.mjs:122`) | Contract matches implementation |
| E15b | Contract persistence section (`governance.md:36`) doesn't cite the crash-mid-action tests, though `governance.md:19` states same-transaction commit of policy revision, event and receipt — implemented and tested (`governance-recovery.test.mjs:47-65`, SIGKILL at `before_commit`/`after_commit_before_ack`) | Implemented; under-cited in contract prose |
| E15c | No implementation for human policy-editor UI, general relation traversal, candidate/history readers, scheduling, Run/attempt, external-effect receipts — contract disclaims all (`governance.md:3,36`) | Contract and implementation agree |
| E16 | No TODO/FIXME/`.skip`/`.only` in any new governance file | Clean |

## Summary

(a) Blocking: none. A2, A3, B4–B8 confirmed against code and reproduced tests.

(b) Non-blocking: `integration-tests.log` has no inline command/SHA/concurrency annotation (C10). Two of six failures in the interrupted default-concurrency run were governance tests; they pass at concurrency 2 and in the re-run.

(c) Not checkable here: real-provider behavior, browser/UI coverage, large-scale query latency — out of scope per contract and README.
