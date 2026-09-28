# Harness fixed check recipe · phase 1 author evidence (2026-09-28)

Author: original Claude (Opus). Contract: [03 · Serial Harness self-check closure](../../03-check-recipe.md#2026-09-28--serial-harness-self-check-closure--expanded-claude-lease), baseline `f3bc8b0`. Source commit `c32c492` on `claude/request-details-b2-20260928`. This is author evidence only. Independent acceptance and the phase 2 real-provider task belong to Astra/Parent.

## Source

- **`app/runtime/check-recipes.mjs`:** the third frozen descriptor, `node-test-harness-contract` v1, titled "Run Harness Core and Extensions contract tests". It runs `process.execPath` with `--test --test-concurrency=1` plus the six fixed paths, in the candidate, with 120000 ms, 65536 bytes per stream and the minimal environment. The first two recipes keep their bytes and order.
- **`app/runtime/check-tools.mjs`, the missing-target guard (adopted by Parent):**
  - The problem: Node 25.9 treats each path argument as a glob and silently skips one that matches nothing. Reproduced: two present files and one missing gave `tests 2`, exit 0.
  - The rule: at the existing synchronous `beforeSpawn` fence, after the cancel/admission check and the approved-candidate/revision recheck, every argv entry not starting with `-` must be a regular file (`lstat`) in the approved candidate. Otherwise the check starts no process and settles once as `failed` with `failure: {code: "missing_target"}` and empty output.
  - Scope: this applies to the closed set of fixed Node paths only (Attention and Harness). `node-test`'s default discovery, approval fields, cancel priority and revision fence are unchanged.
  - No schema change, since `failure.code` is an existing free identifier.
- **`app/docs/check-recipes.md`:** the descriptor, and the difference between a missing fixed target (Host `failed`/`missing_target`, no process) and a missing dependency (real process, nonzero).
- **`app/tests/check-recipes.test.mjs`:**
  - The descriptor and order of all three recipes.
  - The `read_only` and deny loops cover all three recipes.
  - Harness pass → nonzero after one exact candidate write (revision 1) → pass after the correcting write (revision 2). Every check checks the exact permission and start (argv, candidate, revision).
  - A single missing target (5 of 6 present) gives `missing_target` with no process. A missing dependency (`ERR_MODULE_NOT_FOUND`) gives a nonzero `completed` result.
  - The accepted Attention test's all-missing case now asserts `missing_target`.

## Checks

| Check | Result |
|---|---|
| Rough timing, six files, minimal env, repository tree (dependencies linked; timing only, not evidence) | 126/126, 45.1 s |
| `node --test --test-concurrency=1` check-recipes, check-approval-revision, p03e-write-check-parity, check-ui, control-plane ([log](author-governance.log), sha256 `ed1e585a…`) | 56/56 |
| `tools/check-doc-links.mjs`, `git diff --check` | 10,468 links / 0 problems; clean |
| Real fake-provider Host `check_run` on a private candidate ([probe](harness-host-probe.mjs), [result](harness-host-probe.json), [stdout](harness-host-probe.stdout.txt)) | Run completed; check `completed`, exit 0, **129/129**, 59.5 s, no truncation |

**Real probe details:**
- The source was a `git clone --no-local` of `c32c492`. A session in `ask` mode bound it and created a private candidate at that base.
- **Dependencies:** `npm ci --ignore-scripts --no-audit --no-fund` in `candidate/app`, with an isolated HOME and cache, empty separate user/global npmrc files and the explicit `https://registry.npmjs.org/`. npm 11 installed 278 packages in about 71 s.
  - `package-lock.json` sha256 `d858bd27…`, identical to the source commit.
  - `package.json` sha256 `35821468…`, identical.
  - The candidate's tracked tree stayed clean. The installed inventory is in the result.
  - No link to user or global `node_modules`.
- **Permission:** exactly the descriptor above, with candidate write revision 0. `check.started` matched it, and `check.settled` has the same callId.
- **Output:** stdout sha256 `94d85fc1…`, 13,623 bytes; stderr empty.
- **Timing:** 59.5 s of the 120 s ceiling under the real runner. No limit change is needed.

The first probe attempt failed before the Host started a check. npm refused one empty file loaded as both user and global config, so the probe now uses two empty files; the successful receipt is the rerun. The Host process ran from the author tree, whose dependencies are linked, but only the candidate's dependencies take part in the check.

**Not done:**
- Real-provider or model-authored development (phase 2), Hermes native/server, paid provider, user Host restart, push or deployment.
- The full product suite was not rerun.
