# Acceptance and frontend handoff

## Backend checks

The added control-plane tests exercise scoped provenance/inheritance/CAS/restart; active-run freezes and original retry bindings; restrictive policy enforcement at actual tools; immutable arguments across approval; progressive skill loading; profile restrictions and missing-resource admission; malformed/future config rejection; schema 3 backup and schema 4 migration; modern/legacy MCP wire fixtures; remote provenance; unknown side-effect handling and same-run replay refusal; and deterministic permission/binding admission races.

Search tests cover Unicode/line preservation, regex complexity rejection, deadline and abort responsiveness; workspace tests cover existing file/artifact behavior. Remote MCP tests use loopback wire fixtures with the real SDK, not a live production service. They do not certify OAuth, stdio, arbitrary servers or cloud infrastructure.

Run from `app`:

```sh
npm ci
npm test
```

Targeted checks from repository root:

```sh
node --test app/tests/control-plane.test.mjs app/tests/runtime.test.mjs app/tests/durability.test.mjs
node --test app/tests/grep-isolation.test.mjs app/tests/workspace.test.mjs
```

Final verification on 2026-09-08: **134 tests passed, 0 failed**, using Node 25.9.0.
The full run includes all 15 new control-plane tests and the existing regression
suite. The older sync stress test now releases one real event after the first
snapshot so concurrent growth is guaranteed rather than scheduler-dependent;
its 50 joins still assert contiguity, no duplicates and exact stream equality.
Targeted search/workspace checks also passed 18/18. `git diff --check` passed.
No browser/new frontend or real remote-provider acceptance is claimed. The
`.d.ts` seam was reviewed against handlers; no standalone TypeScript compilation
was run because this JavaScript repository has no TypeScript compiler installed.

## New frontend contract

Consume `RuntimeControlClient` in `app/runtime/control-contract.d.ts` through an HTTP adapter using the existing token handling. The backend returns authoritative snapshots after writes. Display installed/running/exposed separately, permission traces on tools, source URI/hash/scope, applicability, unsupported-kind labels, live connection health and selected-profile compatibility. Use `running:null` as not applicable. Do not infer authority from a checked switch.

Use server-provided scopes and revision. Make “inherit” a removal of the local override. While active Runs exist, runtime edits are frozen; server 409 is authoritative even if the UI has stale state. Selection of a profile differs from generic exposure. Profile UI slots are declarative and must be mapped only to locally supported components.

Show effective-next-run context separately from recorded-run context and loaded resources. Character sizes are not token counts. Source inspection is a local-user administration capability; it is not a model tool. Prompt invocation inserts/reviews a draft and does not start execution. A disconnected MCP server, a connected server and an exposed capability are different states. Unknown effects need reconciliation before a new command, not a retry button that silently replays the operation.

Do not restore an older schema-3 host against an upgraded data directory.

## What the frontend now shows (WO-WK11, 2026-09-09)

The obligations above are met by the Runtime Workbench, which is the Runtime group of the Settings page (`app/web/runtime-view.mjs` rendering into the five `data-wk11-mount` blocks of `app/web/index.html`). The list below states where each obligation is discharged, so the next reader checks the thing rather than the claim.

| Obligation | Where it is shown |
|---|---|
| installed / running / exposed / permitted separate | four labelled dimensions on every object row; `running: null` reads `n/a` |
| permission trace on tools | the Permission block of an expanded row, plus an on-demand `POST /runtime-permissions/evaluate` reading that states it grants nothing |
| source URI / hash / scope, applicability | the Source layer and the Descriptor block of an expanded row; the profile's applicability in Composition |
| unsupported-kind labels | text rows carrying `Backend pending`, with zero interactive descendants, in the group each kind would belong to |
| live connection health, selected-profile compatibility | Overview's Attention list and profile line; the MCP state words on the server row |
| no authority inferred from a checked switch | every switch is set from the authoritative `exposed`; a failed submit re-renders from the snapshot |
| server scopes and revision | the scope tabs and the revision line come from the snapshot; no scope is invented and `org` / `agent` / `invocation` are not editable |
| inherit is removal of the local override | a text line that sends `exposed: null`; there is no third switch position |
| frozen while a run is active; 409 authoritative | the whole group turns read-only under one sentence that claims no queue and no later application; `active_run` and `runtime_conflict` both keep the unsent edit as a draft and never resend it |
| selection ≠ exposure | Composition selects with `operation: "profile"`; profile rows carry no switch |
| `uiSlots` declarative | printed as `declared, not executed`; the host mounts only a loaded renderer inside its own allowlist |
| effective-next-run vs recorded-run context | Overview's context bar and the Effective Context Inspector are the next run; Recorded bindings and the Run inspector are a finished run, read from its own binding |
| characters are not tokens | every size carries `characters, not tokens`; no token figure is shown or estimated, and no share, quota or remaining figure is drawn because the contract states no maximum |
| source inspection is administration | the inspector says the model is not authorized to read a resource it is reading for you |
| prompt invocation is a draft | `Use as draft` fills the composer, starts no run, and the reply's `draft-only` disposition is checked |
| MCP states are different facts | `configured` / `connected` / `exposed` / `error` only; connecting grants nothing |
| unknown effect needs reconciliation | one banner asking for reconciliation; there is no retry control anywhere in the group |

Two things this frontend adds beyond the list above, and one it does not. It adds the four layers of FN-14 — Source, Requested, Effective, Bound — as four separate lines per item, and an Attention list whose emptiness is stated rather than implied. It does not add any import, resolve, propose or apply path: `operation: "put"` is exercised only by fixtures, and the R2–R6 seams stay with their own backend contracts.

Frontend verification for this round is recorded in `engineering/mvp/execution/work-surface-kit/delivery-wk11.md` and its evidence directory: 208 unit tests, the colour lint and the contrast report, and three in-page suites against a real local server — RC contract 20/20, counterexamples 9/9, viewport 36/36 at 1440 and 390 in light, dark and reduced motion. Real providers, real remote MCP services, touch and screen readers are not certified there either.
