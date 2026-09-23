# Runtime R0 parent architecture disposition

2026-09-23 · Fixed author proposalf1641f87451546e8f424610d0aa260201f2d518a. Parent inspected the proposal and actual Pi/Provider/service/native-binding owners; [GPT-6 Luna independent contract review](luna6-review.md.txt) agrees. **Adopt the overall direction, return two precise facts before R1.** No product schema or code is accepted by this review.

## R0-R1 — executor fingerprint must not own credentials

The proposal hashes credential reference/generation into factory configuration identity while separately owning Provider/Model elsewhere. That risks permanently fencing a Pi Chat after ordinary key rotation. Remove credential generation/reference, model/provider selection and user data paths from `configurationRef`. Hash only canonical immutable executor-specific configuration plus Adapter revision/protocol (for example the configured transport endpoint identity). Existing per-Run Provider fields and managed remote connection/hash/version/credential-generation checks stay in their current owners. A matching factory ref must never waive those checks. A changed remote credential may still refuse by the existing remote contract; ordinary Pi credential/model changes must retain their existing between-Run behavior.

Clarify availability wording: an available descriptor must have complete identity/capability facts; an unavailable descriptor may still expose facts actually known, with an explicit reason. No fixture or boolean alone promotes the managed runtime to live availability. Preserve actual selected-runtime Provider/Model eligibility; do not treat a generic connection readiness check or the factory hash as proof that every model works on every executor.

## R0-R2 — pure migration and first pin need one atomic rule

All schema21 Sessions lack a persisted executor factory ref. Migration must set their migrated `configurationRef:null`, including empty Pi-default Sessions; it cannot consult today's composition root. Preserve adapter identity only when Run/native evidence agrees. Contradictory history stays readable and fenced; Local Pi child dispatch remains under its existing separate owner, never blocked merely by the ordinary selector's null choice.

**Parent selects this concrete first-pin rule:** before admitting the first schema22 bound Run in a legacy-unpinned Session, service resolves an explicitly matching eligible port and preserves all native/unknown checks. Inside `Store.createRun`, after original-command replay lookup and after validating the submitted choice revision/adapter against current state, atomically materialize the ref on Session, increment `executorChoice.revision` once, and create the Run's immutable executor binding from that same descriptor. Record the consumed post-pin choice revision explicitly in the bound Run contract (e.g. `choiceRevision`); legacy Run bindings keep that fact null. Incoming expectation is checked against the pre-transaction revision. Later Runs use the pinned ref/revision and cannot repin; duplicate command replay returns its original binding before current checks and does not increment again. No-history public PUT still cannot change a historical Session; this Host normalization is not that public operation.

New schema22 Sessions can receive the resolved default descriptor at creation; specify that service→Store input instead of teaching pure migrations to inspect live factories. Clarify the representation and route behavior of global/extension/child Sessions so ordinary-selector exclusions preserve their current execution paths.

## Retained decisions and exit

Keep single RuntimeStore authority, separate profile expectation, Pi default, one managed alternate under original P03 gate, no automatic fallback, first-Run Session lineage lock, strict proposed21→22 backup/old-reader refusal, and unchanged Core4/bridge5. Accepted C/D/E action/root data and K3 reference-only unchecked policy remain untouched. The credential-rotation and first-pin/replay cases must enter the proposed acceptance matrix.

Original GPT-6 Sol owns only the R0 packet correction. Revise the concrete DTO/transition/migration/refusal text consistently, commit and stop with a fixed handoff. Parent/Luna review the delta; R1 product write lease remains unissued. This is a contract return, not a new roadmap, product defect or user approval request.
