# PV + Spark sample · Astra integration receipt

2026-09-10. User requested independent verification and integration of PV
`bb2102790567d193dd412e1d4d99b09281b5ad2e` and SD
`6b6257937e2dff0bcf46f9a31f40184ee95c57b3`, including PV-54 and SP-13.
Base main was `67ed0fd748017f3d71d426de51d9f1f63860ea54`.

## Source and ownership

- Astra integrated in isolated `codex/pv-sd-integration-20260910`; shared UI
  checkout remained on `claude/ex-ss1-secondary-surface@3a61336`, with its
  existing three dirty paths untouched. No legacy worktree was consulted.
- PV merge `8bd9b97`, SD merge `68d2495`: automatic clean merge. Relative to
  `9c8b64e`, both touch `app/server/index.mjs` and `app/web/styles.css` at
  different append sites. The earlier no-shared-files claim is not retained
  as fact. FE02 author test head is `f4e601b`; `bb21027` adds delivery/evidence.
- [Provider intake](sources/provider-intake-6d5c444.md.txt) and
  [sample intake](sources/sample-intake-6d5c444.md.txt) are exact bytes from
  Fable `6d5c444`; Git blob IDs respectively
  `e3fba7cf22607c6c726b64720a3741b1e9557c43` and
  `cc7543d5076ea07580df8e0f05cc409cc8997717`. Historical paths/links inside
  these frozen inputs are not active navigation or current status.

## Repairs and decisions

| Product commit | Scope | Verification owner |
| --- | --- | --- |
| `d4819ec` | PV-54: pure provider config/effort projection extracted verbatim; settings compatibility exports retained; picker imports pure module directly; exact static allowlist entry | Astra author; Luna independent 31/31 |
| `792174c` | Runtime 11 → 12 must preserve all pending recovery fences, including missing-record operations; prior migration dropped them | Astra author; Luna independent backup/reopen/one-finish counterexample |
| `dc3068b` | Sample request epoch independent of live epoch; recheck after JSON body; invalidate on hide/close/live/scope; scenario disabled during live probe | Astra author; independent race verification recorded separately |
| `654411e` | Verify uses Run's active-identity API/endpoint override, including another admitted model; inactive identity never borrows active override | Astra author; independent loopback dispatch verification recorded separately |

[SP-13](../../engineering/design/spark-surface-2026-09-10/integration-ruling.md)
records SD-16's explicit, labeled, read-only sample exception. No new backend
owner, automatic sample fallback, global switch, or Attention sample is added.

## Evidence levels

- [FE independent](../pv-sd-independent-frontend-20260910/README.md): fixed
  `bb21027`, full 664/664, targeted 50/50, browser 8/8. The initial missing
  dependency attempt is distinguished from product failures.
- [PV-54 independent](../pv-sd-independent-pv54-20260910/README.md): fixed
  `d4819ec`, pure/static/import checks 31/31.
- [Initial backend independent](../pv-sd-independent-backend-20260910/README.md):
  proves the migration failure on `bb21027`, migration repair on `792174c`,
  and verify wrong-endpoint failure on both. External requests were blocked
  before I/O; only loopback was allowed.
- [Fixed backend independent](../pv-verify-route-independent-654411e-20260910/README.md):
  fixed `654411e`, migration remains correct; two active catalog models hit
  configured loopback `/v1/chat/completions`, 401 is authentication_failed,
  external request count is zero, inactive fake uses its own route.
- [Spark independent](../pv-sd-independent-spark-20260910/README.md): original `6b62579` reproduced three sample/live races;
  [fixed `dc3068b` result](fixed-dc3068b-checks.json) is 15/15. Spark product
  bytes are unchanged between that fix and `654411e`.
- [Actual in-app flow audit](ui/README.md): seven numbered steps with accepted
  screenshots, focus observations, narrow-screen findings and explicit limits.

## Test-run attribution

- Initial unconstrained run on `d4819ec`: 682/683, one Core bridge readiness
  timeout in the lifecycle fixture. [Captured chunks](initial-test-output.json)
  retain this failure and the separate migration regression's expected failure.
  A subsequent targeted migration/lifecycle run passed 31/31 without relaxing
  any assertion or timeout.
- `full-792174c.log`: 684/684 with test concurrency 4. This run started on
  `792174c` but overlapped a Spark source edit, so it is **intermediate evidence,
  not a fixed-tree acceptance run**.
- `full-654411e.log`: the final full run is kept separately. Throughout this
  run, app/tests/tools bytes remained identical to `654411e`; later integration
  commits add only documentation/evidence. Its terminal result is recorded in
  the final status below: **685/685, exit 0, 219809 ms**.
- `npm run smoke`: pass, local-fake material/tool/artifact/reopen/continuation/
  historical-byte checks. Colors, materials, shapes, interaction lint and
  contrast report passed. No added dependencies.

## Boundaries

RuntimeStore 12 / Core 4 / app 5. Old hosts must not read upgraded data;
synthetic migration and exact backup checks are not a personal-data migration.
No actual credentials were inspected or copied, no paid/real provider called,
no external messages, push or deployment. Compatible connections remain
directory-admitted; arbitrary custom IDs are the catalog/local extra-model
path, not a relaxation of compatible discovery.

BE-41, Attention samples, real-provider coverage, full assistive-technology
acceptance, and G1–G5 remain outside this integration's acceptance.

## Final status

Astra accepts the two candidates with the three integration repairs above,
PV-54 extraction and SP-13 ruling. The repairs have non-author rechecks;
fixed-product full suite is 685/685. This receipt is the accepted candidate
for a local main fast-forward from `67ed0fd`; no push or deployment is included.
The final handoff reports the actual main HEAD after that operation.
