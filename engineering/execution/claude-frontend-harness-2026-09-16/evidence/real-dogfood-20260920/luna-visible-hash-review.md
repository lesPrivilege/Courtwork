# Luna independent review: visible candidate hash

- Reviewed commit `bb10925ec2760b174d7e515cad7f79c6dc4adc31` against main ancestor `6191733` in `/Users/lesprivilege/Projects/.worktrees/courtwork-dogfood-visible-hash-20260920`.
- Exact changed paths: `app/runtime/repository-candidate-tools.mjs`, `app/tests/candidate-visible-hash.test.mjs`, and the owner handoff record. No other source paths changed; worktree was clean before and after review.
- Scoped acceptance: **accepted within the requested visible-hash scope**. `candidate_read` keeps the first text block as undecorated ranged decoded file text, adds provider-visible metadata containing the canonical full-file SHA-256, byte count, path, hash scope, returned line bounds, full-file line count, and write guidance, and preserves the existing `details` shape.
- The focused provider capture proves installed Pi serializes the metadata through the OpenAI-completions tool-result content, including Unicode and trailing-newline/full-file hash behavior. The stale expected-hash test proves `repo_write` still forwards the supplied hash to the Host CAS boundary.
- Existing candidate creation, read/write serialization, stale-hash/new-file behavior, approval context, CAS, and receipt paths are unchanged in the diff. No paid provider, personal credential store, user instance, browser, or product source was accessed.
- `resultSha256` remains intentionally scoped to the decoded file text passed to `record()`; `sources[].sha256` remains the full-file digest. The added metadata is provider transport content and does not change the read provenance contract.

## Verification

- `node --test tests/candidate-visible-hash.test.mjs tests/repository-candidate.test.mjs` — **25/25 pass**, exit 0. The worktree temporarily symlinked the existing main checkout `app/node_modules`; the symlink was removed immediately after testing.
- `node --check runtime/repository-candidate-tools.mjs` — exit 0.
- `node --check tests/candidate-visible-hash.test.mjs` — exit 0.
- `git diff --check 6191733..bb10925` — exit 0.
- Full test output: `/tmp/cw-visible-hash-luna-tests.log`.

Source SHA-256:

- `app/runtime/repository-candidate-tools.mjs`: `3ae6dccf25593b5c24fd97a4bc77540d87be221044dccedbb041f1422c6a4301`
- `app/tests/candidate-visible-hash.test.mjs`: `04fdbde5f3490e4e1da78915fe362a5f62b632321844b359f859a1b1766e48e2`
