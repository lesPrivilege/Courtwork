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
