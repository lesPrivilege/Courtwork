# Kit context plan v1 — proposed contract

Status: K0 author proposal, pending Parent Arch disposition. Names in this document are a minimal new pure-module API, not registered resources, saved schema or routes. [Responsibility and selection](README.md) and [source map](source-map.md) govern the scope.

## Inputs and trust boundary

Proposed entry: `planKitContext({ binding, kits, runtime, compatibilityEvidence, budget })`.

- `binding`: immutable, already-validated `RuntimeControlPlane.bind` result. It is an owner-supplied snapshot, not arbitrary frontend JSON. Its composition must be compatible for Kit-present planning. The function never calls `inspect`, `bind`, policies, a factory, a loader or an importer.
- `kits`: explicit Harness/RD-009 supplied array of `{ descriptor, descriptorSha256 }`. The caller has admitted the descriptors as declarations; hashing is an integrity check, not authentication. No current registry supplies these in production.
- `runtime`: `{ adapterId, revision, bindingHash }`, or `null` when the owner has no exact runtime revision. `bindingHash` must equal the input binding hash. This is explicit Adapter-owned evidence supplied by the Harness caller, not an existing RuntimeBinding fact. The current binding has no adapter ID or runtime revision; the Run carries adapter ID separately but does not thereby supply a verified runtime revision. The planner cannot derive a revision from `adapterId`, a model name or a profile title. Future Host persistence must freeze this adapter ID/revision together with the Kit plan.
- `compatibilityEvidence`: explicit owner-supplied records described below; empty means unverified. No queries or tests occur inside this function.
- `budget`: `{ maxCoreBytes, maxContextBytes, maxContextCharacters }`, all explicit nonnegative safe integers. `maxContextCharacters` must be at most the existing Host limit of 100000. No token estimate, truncation ratio, platform context capacity or default core allowance is invented.

All new inputs are JSON data with exact supported keys, dense arrays and finite safe integers. Reject unknown fields, functions, cycles, undefined values and malformed hashes. Descriptor strings must be valid Unicode scalar text (reject lone surrogates); no normalization of Unicode, whitespace, CRLF or Markdown. Existing no-Kit bindings retain their legacy behavior. In the Kit-present branch, validate every string entering rendered instruction/catalog text, including non-Kit content, as scalar text so UTF-8 identity cannot alias distinct lone-surrogate strings. Runtime adapter/revision strings are nonempty and at most 200 units; all supplied SHA-256 fields use lower-case 64-hex.

Operational caps for this proposed bounded API: at most 32 Kits; each descriptor at most 100 core/deferred/requirement/conflict entries per array and 64 KiB canonical UTF-8; at most 64 compatibility records; resource IDs at most 200 UTF-16 units. These are proposed implementation limits for review, not claims about model capacity. Existing Runtime Control resource/content limits still apply. Caller budgets can be smaller. Reject excessive input before rendering; diagnostic count is bounded by input entries. Do not traverse arbitrary nested metadata because no such field is admitted.

## Minimal descriptor

```ts
type KitDescriptorV1 = {
  schemaVersion: 1;
  id: string;                 // /^kit:[a-z0-9][a-z0-9._-]{0,79}$/
  version: string;            // 1..80 ASCII [A-Za-z0-9._-], exact; no ranges
  core: ContentRef[];         // 1..100, all required, kind must be instruction
  deferred: DeferredRef[];    // 0..100, kind must be skill or reference
  requirements: ResourceRequirement[]; // 0..100
  conflicts: string[];       // exact Kit IDs; no precedence expression
};
type ContentRef = {
  resourceId: string;
  contentSha256: string;      // lower-case 64-hex, exact UTF-8 source content
  artifactSha256: string;     // resolver's kind/title/content tuple identity
};
type DeferredRef = ContentRef & { required: boolean };
type ResourceRequirement = { resourceId: string; required: boolean };
```

Kinds, title, scope, source, activation and content are read from the existing binding, not repeated in the descriptor. Kit ID/version identifies this new grouping; both source digests refer to existing resolver facts. Resource requirements request existing non-content resources only. If a present requirement resolves to instruction, skill, reference or prompt_template, refuse with `requirement-content-ref-required` even if optional: instruction/Skill/reference must use the digest-pinned core/deferred arrays, and templates stay outside this Kit contract. A missing requirement reports missing without guessing its kind. Requirements cannot express arbitrary capabilities, permission rules, code, model routes, native configuration, policy effects or execution arguments. If a caller needs those, the owning contract must supply a concrete later version.

The professional work contract is the exact referenced core instruction text. Verification rules and precise materials may be additional instruction/reference resources. There is no second structured Work Contract or acceptance engine. Title/responsibility/Role are intentionally absent: the existing profile/product owner may project human labels separately. No description is converted into instruction content.

`dependencies`, `requiresKits`, `native`, hooks, factories, globs, locators and semver ranges are unsupported fields. v1 has no dependency graph, discovery, topological order or package solver. A dependency edge, including self-edge or cycle, is refused at shape validation instead of silently flattened. The caller must explicitly supply the complete independent Kit set; a future graph needs an actual consumer and parent disposition.

## Exact identity and canonical order

`descriptorSha256` is SHA-256 of UTF-8 canonical JSON of the descriptor: object keys sorted recursively by UTF-16 code-unit order; arrays keep their input order; strings/numbers/booleans use JSON serialization without spaces; supported objects only. Do not hash the digest field into itself. Descriptor array order is declared source identity even where execution semantics later treat it as a set. No timestamps, UUIDs, filesystem roots or environment variables enter a plan.

Verify `contentSha256` and `artifactSha256` using `resolveRuntimeSource({ type:'inline', kind, title, content })` for each referenced content resource. Require the existing resource's `source.hash` to equal that exact content hash. Never rewrite the owner hash or replace it with a differently canonicalized binding hash. `origin` from source inspection remains declared provenance and is not manufactured from the Kit name.

The new planner's order is deterministic:

1. Unique selected Kit pins ordered by ID, version, descriptor digest using code-unit comparison, independent of the caller's Kit array order.
2. All already-admitted instruction resources ordered by existing `SCOPES` rank, then resource ID with code-unit comparison. Kit core remains before the Skill/reference catalog; it does not gain higher authority or displace Host/system instructions.
3. Existing exposed Skill/reference catalog order remains the binding resource-array order, as in the current compiler. Reordering that array is a changed ordered input, not an equivalent snapshot.
4. Provenance owners for a shared source are sorted Kit pins. Requirements and diagnostics are sorted by Kit ID, resource ID (empty if none), then diagnostic code. Duplicate identical diagnostics collapse.

Exact duplicate Kit pins/descriptors deduplicate once. Same Kit ID with another version or digest refuses the entire candidate; no last writer wins. A conflict refuses only when its target Kit ID is also selected; the target need not declare a reciprocal conflict. An absent conflict target does not refuse. Self-conflict is invalid. Repeated identical content references within/across descriptors deduplicate for emission/accounting, retaining all owners; contradictory pins for the same resource refuse. Required wins over optional for duplicate deferred/requirement entries. An ID cannot be both core and deferred. Duplicate binding resource/content IDs are rejected in the new path, rather than selecting an arbitrary match.

No semantic conflict detector interprets prose. Undeclared contradictory instructions remain a descriptor-author/Host admission review obligation. The compiler cannot promise consistency of natural-language methods.

## Resource and permission readings

For each core/deferred reference, require a uniquely matching content entry and resource descriptor, the correct kind, exposure, matching ID/kind/title/scope between the entries, matching source digest, and matching resolver tuple digest. Instruction activation must be `always`. Deferred entries must actually be in the existing skill/reference catalog and have a frozen body in `binding.content`; an enabled `tool:runtime_load` descriptor is also necessary. Never add missing bodies or widen a profile allowlist.

Readings are distinct:

| Reading | Meaning / behavior |
|---|---|
| `missing` | No referenced resource or required frozen body supplied; required entry refuses, optional deferred/requirement records omission |
| `not-exposed` | Resource exists but exposure/loader is absent; same required/optional behavior, never re-expose |
| `mismatch` | Digest, kind, activation, envelope or binding identity conflicts; always refuse, even optional entries |
| `instructions` | Exact core instruction is already admitted and appears once in the candidate text |
| `deferred` | Catalog entry is available; full body is not injected. `required:true` requires catalog availability, not eager body loading |
| `unchecked` | No trustworthy supplied runtime compatibility or exact permission-call evidence; do not manufacture a result |

Requirements can refer to non-content resources such as `tool:repo_read`, `tool:check_run` or an admitted plugin. They check only identity/presence/exposure; they do not equate `installed`, `exposed`, `running` or `health` with support or permission. Return these existing fields as readings, including an existing `PermissionExplanation` or `null` if absent. A resource ID that cannot resolve remains missing. Optional absence does not enable an alternate capability.

Do not evaluate `evaluatePolicy`, interpret Skill `allowed-tools` as grants, or turn a wildcard permission summary into an exact-path decision. `ask` remains pending actual action approval; even `allow` does not authorize a future call. Actual inputs still cross `governTools`, `createPathAdmission` and Host admission. A copied `deny` is reported as such, without being relabeled runtime-unsupported. The planner's compilation result is not action readiness.

## Runtime compatibility evidence

Each supplied record has exact keys:

```ts
{
  kit: { id: string, version: string, descriptorSha256: string },
  bindingHash: string,
  runtime: { adapterId: string, revision: string },
  result: 'supported' | 'unsupported',
  evidence: { ref: string, sha256: string }
}
```

The evidence owner is the admitted Harness/Adapter caller, not descriptor metadata or a frontend fixture. `ref` (1..4000 units) is an opaque exact source/evidence locator and is never fetched; its digest binds the retained evidence supplied by that owner. This module checks structural/exact-pin consistency only. It does not authenticate the caller or independently verify that the evidence proves the claim. Synthetic records are labeled synthetic by the K2 delivery and cannot become production capability evidence.

Only a record matching the exact Kit, binding hash and supplied runtime identity can contribute a result. Wrong Kit/revision/runtime records are retained as `evidence-not-applicable` diagnostics and yield `unchecked`, not unsupported. Repeated identical records deduplicate; contradictory matching results refuse as `compatibility-evidence-conflict`. Multiple agreeing records are preserved in deterministic order by evidence ref/digest. A malformed record is an invalid input.

No matching evidence, missing runtime revision, or a declaration such as a Skill compatibility string yields `unchecked`. Matching owner evidence yields `supported` or `unsupported` with its attribution. Verified unsupported refuses a candidate; unchecked may yield preview text with compatibility explicitly unchecked. Even supported means only the evidence's recorded scope, not permission, model capability, equivalent runtime semantics or an accepted Expert.

Aggregate compatibility is `unsupported` if any matched unsupported record, else `unchecked` if any Kit is unchecked, else `supported`; it is `not-applicable` for an empty Kit set. Per-Kit readings and contradictions are retained, not hidden by the aggregate.

## Rendering and budget contract

No-Kit is an explicit early passthrough: `planKitContext({ binding, kits:[] })` calls `compileControlContext(binding)` with no transformation. Runtime/evidence/budget inputs may be omitted; if supplied they are ignored in this branch, with output runtime/budget set to null and no compatibility evidence retained. Preserve bytes, instruction/catalog order, template omission, historical missing accounting fields and the original binding. New Kit budgets/evidence are not a new validation or refusal gate for this legacy path. Measure the original output as one legacy segment. Existing Host admission remains authoritative. Historical locale-dependent ordering is deliberately untouched in this branch.

For nonempty Kits, after validation:

1. For each instruction in the deterministic order above, call the existing `compileControlContext` with a temporary view `{ content:[instruction], resources:[] }`. It returns the existing instruction heading and exact body; no comparator runs on a singleton.
2. Call `compileControlContext` on `{ content:[], resources:binding.resources }` for the catalog. This retains existing descriptions/titles, exposure filtering and deferred bodies. Do not reimplement the catalog serializer or parse rendered text for identity.
3. Discard empty pieces. The first segment text is its raw compiler piece; every later segment text is exactly `\n\n` plus its raw compiler piece. Form candidate text by concatenating these segment texts with no additional separator (`segments.map(s => s.text).join('')`). Thus each separator belongs to the following segment exactly once. This is composition of existing rendered sections, not a new authority layer. Any non-Kit instructions and catalog entries already in the binding remain included and count toward total budget.

These views are serializer arguments only. They are not runtime bindings, have no replacement owner hash, and must never reach a loader, permission evaluator, Host or store. All originals remain immutable.

Segments are one per instruction plus one whole catalog segment. Each records kind, contributing resource IDs, relevant Kit pins, exact text including its allocated separator, UTF-16 start/end offsets, byte count, character count and SHA-256. Source attribution lists exact resolver identities separately from rendered segment hashes. Catalog descriptions are not full body content; shared catalog header remains one segment instead of guessing per-item bytes. Existing `context.admittedCharacters` is historical owner data and may be absent; do not synthesize or overwrite it.

The emitted candidate's exact totals are `Buffer.byteLength(text,'utf8')`, `text.length` and SHA-256 of the same UTF-8 bytes. Segment byte/unit sums must equal totals; joining segment texts must reproduce the candidate exactly. Deferred body source sizes/hashes are recorded separately and excluded from injected totals. A shared instruction is rendered once and attributed to all Kits; per-Kit totals are non-additive views, not extra context.

`maxCoreBytes` applies to the sum of unique Kit-owned rendered instruction segments including headings and allocated separators. `maxContextBytes` and `maxContextCharacters` apply to the whole candidate. Equality passes; any overflow refuses the whole candidate with exact measured totals and limits. No required fragment, optional body, catalog row or unrelated admitted instruction is shortened, silently omitted or reordered to fit. To use a smaller set, the owning caller must supply a different admitted binding and descriptor set. The budget is for this Runtime Control contribution only, excluding system prompt, extension/Work context, current user input and native history.

## Output, failure and identity

Return a fresh serializable plan, not a modified `RuntimeBinding`:

```ts
{
  planVersion: 1,
  status: 'passthrough' | 'compiled' | 'refused',
  binding: { revision, hash, composition }, // copies of existing facts
  runtime, kits,                          // exact normalized supplied pins
  compatibility,                        // aggregate + attributed per-Kit readings
  requirements, references, diagnostics,
  budget, accounting,
  candidate: null | { text, sha256, bytes, characters, segments },
  planSha256
}
```

Malformed new input throws a typed `invalid_kit_input` error before compilation, with deterministic field path/code. Well-formed composition/ref/resource/compatibility/budget failures return `refused`, `candidate:null` and explicit diagnostics; no partial text may escape as an executable fallback. Where complete source rendering is valid but over budget, retain exact measured counts and candidate digest as accounting evidence, without the text. Where rendering cannot be validated, candidate accounting is `null`, not zero. Optional missing inputs remain diagnostic and do not invent content.

`planSha256` hashes canonical JSON of all returned fields except itself. It binds exact Kit pins, effective limits, runtime/evidence/readings, binding reference, source attribution, diagnostics and candidate identity. It differs from `candidate.sha256`: a changed Kit version, deferred body hash, evidence or budget can change the plan while emitted context is unchanged. Retain both identities. All strings/readings used in the plan come from validated input or fixed codes; no locale-specific formatted values, clock or random state.

Return no aliases to caller objects and do not mutate even array order on frozen input. Determinism for Kit-present output is independent of caller object insertion order and Kit/evidence collection permutations (except explicitly ordered descriptor arrays and binding catalog order). No-Kit equality is defined against the unchanged compiler in the same existing Host environment; the new API does not retroactively change historical locale behavior.

The plan conveys no grant, saved profile, verified source origin, loaded Skill, runtime installation, native contribution, Run binding or formal acceptance. A future live caller must explicitly decide whether its evidence is sufficient, and must not dispatch on `status === 'compiled'` alone.
