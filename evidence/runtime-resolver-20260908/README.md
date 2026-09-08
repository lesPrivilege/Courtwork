# Runtime source resolver — isolated backend evidence

2026-09-08. User paused Web integration until Fable reports, while permitting backend self-development. Branch `codex/runtime-source-resolver` starts at `b0173deab477b9be577df75a712f446d14e3c356`, the then-current fresh candidate. The earlier integration/UI edits remain in their separate worktree and are not included. This branch does not integrate or replace Fable's work and is not pushed.

Implemented slice: [contract](../../docs/runtime-control/source-resolver.md). Pure source parsing and typed result only; no server, HTTP route, frontend or model-tool entry. Existing import validation is shared; IDs/scope/CAS/persistence remain with the control plane. This does not close full BE-5 acquisition or any R/H stage.

Node v25.9.0, npm 11.12.1, locked install via `npm --prefix app ci`; `install.txt` records 0 audit vulnerabilities. Tests use independent temporary directories; no personal credentials, providers or Web UI used. Paper remains pinned by PAPER.md.

Author focused verification:

```sh
node --test app/tests/source-resolver.test.mjs app/tests/control-plane.test.mjs
```

Results: `tests-focused.txt` reports 22/22. `npm --prefix app test` after the final YAML validation fix reports 145/145 in `tests-final.txt` (earlier pre-fix full run: 144/144 in `tests-full.txt`). The six resolver tests cover import parity for six kinds, exact byte/interpretation hashes, unverified provenance and copy ownership, declaration-versus-permission distinction, no target acquisition and malformed/unsupported sources. An additional YAML counterexample verifies that malformed YAML and cyclic projected metadata return 400 before config persistence; revision and resources remain unchanged. Existing control-plane regression protects CAS, context, scope, lifecycle and unknown effects after validator extraction. Independent review is recorded separately.

Independent Luna review: [independent-review.md](independent-review.md), independently repeated focused 22/22 and full 145/145; no blocking findings for this slice. Source hashes are pinned in `source-manifest.json`. No TypeScript compiler was available; declaration review was static. Full R2 acquisition, proposals/apply/rollback, model-side primitives, actual Workbench integration, real provider and external adapter compatibility remain unimplemented/not_run.
