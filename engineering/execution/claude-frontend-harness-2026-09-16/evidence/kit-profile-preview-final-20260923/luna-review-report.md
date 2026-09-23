# K4 independent nonauthor review

Date: 2026-09-23  
Candidate implementation SHA: `98a3d693e4ac822d7dc9d86991ca0e5e3c638f2f`  
Evidence HEAD reviewed: `ac5252bb6b8c6a73f7135472dcd212840eafc403`  
Result: no blocking findings in the assigned K4 scope; this is bounded nonauthor evidence, not product acceptance.

## Checks performed

- Read `AGENTS.md`, `engineering/current.md`, the K4 order and `evidence/kit-profile-preview-20260923/author-status.md`.
- Reviewed the preview overlay, shared K1/K3 planner, Host preview method, HTTP route, and API contract. The source blob hashes match the author's pinned values for all four changed runtime files.
- Ran two independent adversarial synthetic HTTP probes using disposable test data and a local fake provider. The saved profile denied `ws_write`; an unsaved overlay proposed `allow`. Preview returned a compiled Kit plan and the `allow` reading with `advisory:true`, while the authoritative pre-save snapshot remained `deny`, persisted policy count stayed 0, and provider request count stayed 0. A second overlay added a nonexistent profile resource: outer composition was `incompatible`, K1 emitted `binding-composition-incompatible`, Host returned `kit.status:"refused"` with `candidate:null`. Assertions passed; log: `adversarial.log`. A second probe sent duplicate `sessionId` and an extra `debug` query parameter; both returned typed `400 invalid_input`, with zero provider requests; log: `route-boundary.log`.
- `node --check` passed for `control-plane.mjs`, `kit-run-context.mjs`, `service.mjs`, and `index.mjs`; `git diff --check ac5252b^ ac5252b` passed.
- No source edits were made. The temporary `app/node_modules` symlink to the locked main dependency tree was removed. Worktree is clean.

## Evidence boundaries

The author's fixed-source logs record 143/143 targeted tests, 1643/1643 full-suite tests, and local-fake smoke success (real Provider not run). I did not rerun those suites. The two independent probes made zero provider calls and passed their assertions. The checked SHA is the fixed source commit above; `ac5252b` records only the author evidence packet.
