# K4 · edited Kit profile preview — Sol author record

2026-09-23 · Isolated `codex/kit-profile-preview-20260923`, base `695820a29e1589bd3ded12f70f72807a5802db66`. Parent Astra owns architecture, integration and acceptance; GPT-6 Sol owns only the K4 backend/HTTP/pure-helper implementation, and GPT-6 Luna is the non-author reviewer. Main, the future Claude editor and user services are separate.

## Before product edits: responsibility, owners, precedent and DTO

Affected responsibility: Runtime Control validates an unsaved replacement body for the **existing imported profile resource explicitly selected at Session scope**; Host assembles a read-only preview from that overlay and the selected Pi port; K1/K3 provide Kit plan and retention limits. Nearest implemented precedents are `RuntimeControlPlane.change('put')` for exact resource kind/title/scope and whole-config CAS, `RuntimeControlPlane.inspect/bind` for effective resources/policies/context, `RuntimeService.getRuntimeControl/changeRuntimeControl` for authenticated Session scope/config freeze, `planKitContext` for pure pins/diagnostics/budget, and `retainKitContext` for the actual later Run's Pi-only eligibility and exact payload limits. The cross-layer change is one pure config overlay accepted by inspection/binding plus one Host method and authenticated route; neither creates a second profile/Kit owner nor changes the existing save route.

Proposed endpoint: `POST /api/v5/runtime-control/preview-profile?sessionId=<id>`; exact body `{expectedRevision,profileId,content}`. `expectedRevision` is a safe integer ≥0; `profileId` is an existing `local:<name>` resource ID (1–86 characters under the current owner regex); `content` is proposed JSON source text, 1–100000 UTF-16 code units and bounded by the existing total imported-content ceiling. The caller supplies no kind/title/scope, Kit evidence/budget, Run binding, permission/exposure, Provider/Model, executor or new resource.

Proposed response, all ephemeral and read-only:

```ts
{
  preview: true, applied: false, revision: number,
  session: { id: string, scope: "project" | "unassigned", projectId: string | null },
  profile: { id: string, title: string, scope: {type:string,id:string},
             schemaVersion: 1 | 2, version: string, draftSha256: string },
  composition: RuntimeControlComposition,
  executor: { id: string, revision: string, kitContextFormat: string | null },
  kit: {
    status: "passthrough" | "compiled" | "refused",
    planVersion: number, planSha256: string, pins: KitPin[],
    compatibility: KitCompatibility, references: object[], requirements: object[],
    diagnostics: object[], budget: object | null, accounting: object | null,
    candidate: {text:string,sha256:string,bytes:number,characters:number} | null,
    payload: {planBytes:number,contextBytes:number,totalBytes:number,
              maxPlanBytes:number,maxPayloadBytes:number} | null
  },
  permissions: Array<{resourceId:string, action:string, exposed:boolean,
                      effect:"allow"|"ask"|"deny",trace:object[],advisory:true}>,
  save: {available:boolean,reason:string|null}
}
```

`draftSha256` hashes the exact UTF-8 source bytes; the candidate hash/byte/UTF-16 counts come from K1. For Kit-present compiled output, candidate text is returned only if the actual Host plan/context payload limits also pass; a K1 refusal or retention-budget refusal has `kit.status:"refused"`, diagnostics and `candidate:null`. No-Kit/v1 uses the K1 legacy passthrough text without creating a Kit Run binding; the existing Host 100000-character context ceiling is still reported. Permissions are the overlay's current Host advisory readings, not grants or exact resource-action approvals. `save.available` reflects only current whole-config freeze and source validation; PUT still rechecks CAS/active Run and can accept syntactically valid but Kit-refused text. Neither preview revision nor plan hash is a saved profile revision, authorization token or provider-readiness guarantee.

The Host must reject absent/wrong Session; global/extension/Spark Session; builtin, unselected, wrong-kind or out-of-scope profile; stale whole-config revision (`409 runtime_conflict`); unavailable/managed Kit executor; invalid outer source (`invalid_runtime_config`) and invalid K1 declaration (`invalid_kit_input`) without state effects. Preview may run while a Run is active, with `save.available:false`. The profile resource's original owning scope is reused exactly, including shared user/workspace scope; only its `content` differs in the overlay. This author will check structural before/after equality of RuntimeStore, control config, ArtifactHistory and provider/native/MCP activity, plus public preview→existing CAS save→new Pi Run, old readback/replay and stale Send refusal.

No source has been edited for K4 at this point. Author checks, fixed source and exact evidence will be appended after implementation; prior K1/K3/R1 results remain pinned to their own sources.

## Fixed K4 backend candidate · source `98a3d693e4ac822d7dc9d86991ca0e5e3c638f2f`

`RuntimeControlPlane.previewProfileConfig` clones the current configuration, replaces only the selected imported profile's content, and runs the existing complete source/config validator. `inspect` and `bind` now accept that explicit isolated config; ordinary callers still default to the live one. `planKitRunContext` is a pure K3-shaped scope/adapter/K1/budget helper shared with actual `retainKitContext`; retention remains the only path that writes ArtifactHistory. The Host preview method runs inside the existing configuration queue, checks exact Session-level selection and current revision, resolves the pinned Pi port, then returns only the DTO recorded above. The API route requires one `sessionId` query value and rejects extra body fields. Typed API documentation is in `docs/runtime-control/api.md`, `app/docs/api-v6.md`, and `app/runtime/control-contract.d.ts`.

The actual response uses `kit.status` as the effective preview disposition, with K1 `planSha256`, normalized pins/readings and candidate only when both compiler and Host payload limits permit it. `save` is a current advisory gate: an active Run or operation reports its own freeze reason, while existing PUT still performs its separate CAS. The original resource title/kind/scope are never caller fields. A shared user-scoped profile stays user-scoped after the existing save; the public test proves a second Session that selected it sees the changed source. No per-profile revision, extra selection, Kit registry, permission grant or model readiness field was added.

| Required exit case | Direct author evidence |
| --- | --- |
| v2 unchanged/edited and v1/empty-v2 | Exact old/new instruction text, normalized Kit pin, plan/candidate SHA-256, UTF-8 bytes distinct from UTF-16 code units for emoji/CRLF, and no-Kit passthrough. |
| Refusals and budget | Missing source, changed digest, wrong core kind, missing required tool, conflicting Kit pins, source not exposed, context-character overflow and malformed descriptor have typed diagnostics/errors and no partial candidate. |
| Runtime and permissions | Managed Kit and unavailable executor refuse before inference; Pi without evidence remains `unchecked`, explicit unsupported evidence refuses. Ask/deny permission readings are advisory and do not modify policies. |
| Stale/active and race | Stale revision is `409 runtime_conflict`; active Run permits preview but reports save frozen while existing PUT returns `409 active_run`. A concurrent source save yields either an old-revision exact reading or the typed conflict. |
| Zero effects | Before/after RuntimeStore state bytes/structure, control JSON/config, ArtifactHistory tree, Pi journal tree and provider-request count are identical across the edited preview. Excluded builtin/nonselected/global/extension/Spark targets and extra caller fields refuse. Spark's actual child fixture observes no second process/provider effect from preview. |
| Public save and history | Real HTTP preview → existing user-scope CAS `put` → new Pi Run yields the preview's exact candidate text/hash and new source hash. The old Run's recorded context remains identical, original command replays to that Run, and stale new Send adds no Run/provider request. |

Author verification on the fixed source: [targeted Control/K1/K3/K4 log](targeted.log) **143/143**, exit 0; [full product log](full-suite.log) **1643/1643**, exit 0, including the pretest's 45 pinned historical commit/path/hash checks; [local-fake smoke](smoke.log) exit 0, real Provider `not_run`. Tests used independent disposable data and random loopback ports, with inherited OpenAI/DeepSeek keys removed from the commands. The first direct K4 run was **15/16**: a test fixture waited only for `blocked` after a source-free Spark child, which may validly settle `resolved`; the production preview had already refused correctly. The wait now accepts any terminal assignment state, the isolated child case passes, and the fixed-source targeted/full logs contain it. No production exception was hidden or test assertion weakened about the preview response.

Selected exact SHA-256 at source `98a3d69`:

| Artifact | SHA-256 |
| --- | --- |
| `app/runtime/control-plane.mjs` | `e252eb0979663ddeaa84d051610c4a86dc577db17c61adcbccd5b48d99562b97` |
| `app/runtime/kit-run-context.mjs` | `66ee07405f3511521435f17b5e01e0536107745bc7f34155c85f8302833385e8` |
| `app/server/service.mjs` | `006a67c608d5d0701bfe1ded707783df10dddede0186f4f3e1c8b20e31186a9a` |
| `app/server/index.mjs` | `ed4f73f9f96c7665a22afb880c80478b34d36267ca4e4f8b6044fa3a8af390c4` |
| `targeted.log` | `b1ac2853bb5c89bf663bac8777ec8a56224653fcdf5821b225725980d372ef5b` |
| `full-suite.log` | `1d28d390a572b91780807d62af3a6e66b567c7e7a44c718f88f3c0e623646044` |
| `smoke.log` | `126c063ab8d7ed70e6d957052aea3f4bfa40b4593a100eeaab12c9dba0195aea` |

This author does not claim independent acceptance, a frontend editor, live provider/managed Runtime support, screen-reader/browser design acceptance or formal Work acceptance. K4 changes no RuntimeStore22/Core4/bridge5 schema or package pins. Parent/Luna review and any main integration remain separate.

`node tools/check-doc-links.mjs` passes **1636 documents / 9650 checked links** after this packet; syntax and `git diff --check` pass. Only the three named logs were copied into Git evidence. The temporary dependency symlink to main's locked `app/node_modules` and the explicitly named external full-suite TMPDIR were removed after verification; no test Store, Pi journal, ArtifactHistory object, SQLite file or credential fixture was staged. Sol releases this backend writer after the evidence commit, leaving the isolated branch for independent review without merge, push or other-tree cleanup.
