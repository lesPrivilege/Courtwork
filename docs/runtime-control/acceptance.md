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

The existing `app/web` frontend is unchanged. This branch should be integrated with the future frontend by contract after backend review. Do not restore an older schema-3 host against an upgraded data directory.
