# Runtime source resolver — HTTP service seam (BE-5) evidence

2026-09-10. Bounded implementation of work order [WO-BE5-resolver-service](../../engineering/execution/2026-09-08-main-round/WO-BE5-resolver-service.md): a thin, sessionless HTTP seam that lets a local user call the already-shipped pure declarative source resolver over the existing authenticated boundary. Architecture, contract and final acceptance remain with Astra; the author does not claim independent acceptance.

## Fixed code

- Worktree: `/private/tmp/cw-runtime-source-service-20260910`, branch `codex/runtime-source-service-20260910`.
- Baseline: `85693a6d185f284ecc68324e4dda6d7d677abb03` (actual main HEAD when the order was taken).
- BE-5 code commit: `9cbae87` (this evidence directory is committed after it and references that SHA).
- Node v25.9.0, npm 11.12.1, locked install via `npm --prefix app ci` (0 audit vulnerabilities). Only synthetic temp data directories and OS-assigned ports were used; no real provider, personal credential or network target was touched.

## Changed files (exclusive scope honored)

| File | Change |
|---|---|
| `app/server/index.mjs` | One new route: `POST /api/v5/runtime-sources/resolve` (thin, inherits token/origin/body handling) |
| `app/server/service.mjs` | One new method `resolveRuntimeSource(input)`: thin wrapper over the pure resolver + required error adaptation (resolver 400s → host `ServiceError`), plus its import |
| `app/tests/runtime-source-service.test.mjs` | New: 6 BE-5 service/HTTP tests (incl. isolated child probe) |
| `docs/runtime-control/api.md` | Table row + "Declarative source resolution" section recording the actual contract |
| `docs/runtime-control/source-resolver.md` | Status + "HTTP service seam (BE-5)" section |
| `evidence/runtime-source-service-20260910/` | This directory |

No change to `store`, Core/runtime loop, `app/web`, schema, dependencies, `engineering/current.md`, `PAPER.md`, or the resolver itself (`app/runtime/source-resolver.mjs` is reused unchanged). Parsers were not modified; no parser defect was found that required an Astra counterexample report. The shared main tree was never checked out/stashed/reset; the single uncommitted main-tree edit (`evidence/fe01-main-integration-20260909/wk98-regression.json`) was left untouched.

## What the seam does

`POST /api/v5/runtime-sources/resolve` takes the resolver input directly as the body (no proposal envelope): `{type:'inline', kind, title, content, origin?}` for the six existing inline kinds, or `{type:'locator', locator:'url'|'repository'|'package'|'path'|'manifest', value}`. The response is directly the existing `ResolvedRuntimeArtifact | UnsupportedRuntimeSource` union. Inline keeps exact bytes/hash, declared `origin` is echoed under `provenance.declaredOrigin` with `verified:false`, `capabilities.granted` stays `[]`, disposition stays `inspect-only`, and locators return explicit `unsupported` (`source_acquisition_not_implemented`). The route is sessionless and stateless: no store, configuration, revision, audit, resource directory or mutation-queue involvement, so pure resolution also works while a Run is active and never alters that Run's binding or capabilities. No model tool is registered and request bodies are not logged. Resolution is not import: a later import still requires the existing `PUT /runtime-control` target validation/CAS, and a resolver hash is not approval.

## Verification (author-focused)

Commands (from the worktree):

```sh
node --test app/tests/source-resolver.test.mjs app/tests/runtime-source-service.test.mjs app/tests/control-plane.test.mjs app/tests/architecture-boundaries.test.mjs app/tests/runtime-foundation.test.mjs   # 35/35
npm --prefix app test        # 352/352 (346 pre-existing + 6 new BE-5 tests), 0 fail
npm --prefix app run smoke   # status passed, local-fake, revision/historical-bytes checks green
```

Logs: [tests-focused.txt](tests-focused.txt), [tests-full.txt](tests-full.txt), [smoke.txt](smoke.txt).

Real HTTP transcript (actual production server, synthetic data dir, OS port): [transcript.txt](transcript.txt) and its portable generator [capture-http-examples.mjs](capture-http-examples.mjs).

### Mapping to the six acceptance criteria

1. **Exact UTF-8 identity, unverified origin over real HTTP** — transcript #1 and test 1: `contentSha256` equals `sha256(UTF-8 content bytes)` for `'Exact source bytes 条款 🙂\r\n'` (bytes 32 / characters 26), `artifactSha256` binds the ordered `{kind,title,content}`, `provenance.verified=false`, `capabilities.granted=[]`, `disposition='inspect-only'` for all six inline kinds.
2. **Host boundaries** — test 2: absent/wrong `x-work-token` → 401, disallowed `Origin` → 403, non-JSON content type → 415, invalid JSON/array/`null` → 400 `invalid_json`, bodies over the shared 1 MiB cap are discarded by the host body reader, 100001-char content → 400 `invalid_runtime_config`, and 15 malformed/extra-field inputs return the deterministic 400 codes (`invalid_runtime_source` / `invalid_runtime_config`) — never a 500, never silent reinterpretation.
3. **Locator unsupported proven by an isolated probe** — tests 3 and the child-probe test. The probe is a separate OS process that replaces `fs`/`fs/promises` read-family, `net.connect`/`createConnection`, `http(s).request`/`get`, `globalThis.fetch` and `child_process` with guard wrappers **before** importing the production server, so the runtime's own bindings point at the guards (a negative control verifies `RuntimeControlPlane.initialize()` is blocked by the armed `fs` guard and a new socket connect is blocked by the armed `net` guard). With the guards armed, all five locator kinds over real HTTP (fs/http/fetch/process blocked, only the client's own socket allowed) and at the service layer with everything including `net` blocked return `unsupported`/`resolved` with `200` — i.e. no file read, socket connect, HTTP request, fetch or child process occurs during resolution, not merely the right response text.
4. **No state change; active Run binding unchanged; no auto-import** — test 4: before/after full recursive byte manifest of the data directory is identical, control revision/snapshot identical, and an active `waiting_user` Run's recorded `runtime-context` binding is deep-equal before and after six inline + one locator resolutions; the control-plane mutation freeze (`409 active_run`) is confirmed in force during the same window, proving pure resolution is allowed while mutations are frozen; the `local:` resource catalog stays empty (nothing imported).
5. **Coverage of six inline kinds and five locator types** — tests 1 (six kinds), 3 (five locators, exact pure-resolver parity) and 4 (six kinds + locator during an active Run).
6. **Resolver/service regression, full suite and smoke** — focused 35/35 (includes the pre-existing resolver tests), full 352/352, smoke passed. No TypeScript compiler is configured in this repo; the resolver declaration file was unchanged and is not re-reviewed here.

## Observations for Astra (not blocking, within scope discipline)

- **Oversized-body response shape**: the shared `body()` reader in `app/server/index.mjs` rejects a body over its 1 MiB cap by destroying the request socket before a JSON 413 can be written (pre-existing behavior for every POST route; no existing test asserted a 413). BE-5 inherits that boundary unchanged; the test pins the actual observable behavior (connection closed, nothing resolved, runtime stays healthy). If Astra wants a clean JSON 413 host-wide, that is a separate host change outside this order.
- **`docs/runtime-control/INDEX.md`** still describes source-resolver as "backend parser only, no HTTP/UI/tool entry" — that one-line description is now stale but `INDEX.md` was outside this order's documented write scope (`api.md`, `source-resolver.md`). Astra may refresh it on merge.
- The route is not yet consumed by any UI, and no model-side resolve tool was registered (frozen contract).

## Unchecked items

- No real provider, external network target or personal credential was used; everything is synthetic/loopback with OS-assigned ports.
- Non-author independent review and Astra merge are outstanding by design; this branch is not pushed, not merged to `main`, not deployed.
- Frontend/workbench consumption (WK-11+ stages) and full Runtime R2 acquisition/R3–R5 remain out of scope.
