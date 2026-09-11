# FABLE partial review evidence

Review date: 2026-09-11. Main HEAD: `cf4ab5604ba5a7319fc35121c818d75f516e79b3`.

Candidate: `2c7d181c3f6af761b0d4d09b04097a9fce8b0460` on `claude/publication-final-v1`.
Test synchronization: `90d7b653f5f4df63d0a6fb7c22769b3047d2f0e2` on `codex/fable-stage1-testfix-20260911`.

Observed checks (the component counts below are the test names in the preserved logs):

- Candidate snapshot command: `node --test app/tests/product-icons.test.mjs app/tests/product-semantics.test.mjs app/tests/static-web-manifest.test.mjs`; 19 total, 16 pass, 3 fail. The component split is icons 4 pass, semantics 9 total with 3 failures, static manifest 6 pass. See [stage1-candidate-combined.log](stage1-candidate-combined.log).
- Candidate + narrow test synchronization command: `git diff --check && node --test app/tests/product-semantics.test.mjs app/tests/product-icons.test.mjs`; 13 total, 13 pass (9 semantic + 4 icon). See [stage1-testfix-13.log](stage1-testfix-13.log).
- Parent-side combined Stage 1 check: 19 total, 19 pass (9 semantic + 4 icon + 6 static); see [stage1-integration-19.log](stage1-integration-19.log).
- Native-chrome raw audit summary: 93/93 pass across 1440, 1280 and 390; see [native-chrome-summary.json](native-chrome-summary.json). The original raw result was `/tmp/fable-native-chrome-review-20260911-a/results.json` and its SHA-256 is recorded there and in [sha-manifest.txt](sha-manifest.txt).

The browser audit is geometry evidence for the simulated web fixture. It is not AppKit, native hit-testing or VoiceOver evidence, and it did not verify the 1440 expanded work surface. Stage 2/3 focused checks and the settings-reference constraints are recorded in the review; no Stage 4/5 return package was supplied.
