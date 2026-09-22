# Consumer proposal and finite K1/K2 evidence

This is the K0 proposal, not implemented results. [The contract](contract.md) is pending parent disposition.

## Concrete consumer proof

K1 may own new `app/runtime/kit-context.mjs`, matching `kit-*.d.ts` only if useful, and focused `app/tests/kit-context.test.mjs`. Reuse existing `compileControlContext` and `resolveRuntimeSource`; no shared-module export/hunk is necessary. Normal module imports do not authorize any RuntimeControl constructor, filesystem/network call, runtime factory, global cache or native discovery. No package installation or framework change is required.

K2 uses synthetic frozen Runtime Control bindings and explicit admitted descriptors, passes them into the plan, and verifies exact context output against the existing compiler sections. Use existing binding/source shapes, not 06a's proposed frontend DTO. The fixtures should state their fake runtime evidence rather than claim Pi/Hermes/Codex integration.

| Synthetic case | Required instructions / deferred content | Evidence to retain |
|---|---|---|
| General work | Instruction distinguishing facts/assumptions and asking for exact source attribution; a reference body containing a sentinel | Instruction in output once; reference catalogued, sentinel absent; source/plan/output hashes and sizes |
| Coding | Instruction requiring exact diff and existing Host check receipts; a coding Skill and request for `tool:check_run` | Copied `ask` or `deny` stays permission evidence; no check executes and no grant is created; Skill body absent |
| General + Praxis | Thin audience/expectation/requested decision/stage/evidence/tension contract; deeper organization notes as a deferred reference | Shared general instruction once, both Kit owners retained; required-fragment deletion refuses; labels do not imply Work acceptance |
| Same Kit, changed source/version | Change one core byte, then only Kit version, then only deferred body with fresh pins | Core change changes output and plan identity; version-only/deferred-only changes plan identity while context may remain identical; old frozen input/output still identical |
| Different runtime evidence | Exact matching supported/unsupported evidence versus absent or wrong-revision evidence | Unsupported refuses, unknown stays unchecked, scope is explicit; no runtime equivalence claim |

Include literal expected output for at least one example, including headers, blank lines and Unicode. Fixtures must independently compute expected digest/byte totals from those literal bytes; comparing two calls to the implementation is insufficient. All validation is offline and local; no model inference, provider authentication, process harness or full stress campaign.

## Minimal future Host/profile integration — proposal only

The first production consumer remains Runtime Control / Host. These call sites are fixed at source `f74ae1e`:

1. `app/server/service.mjs:2554–2556`: after `this.control.bind(this.getRuntimeControl(sessionId))` and existing composition checks, a future owner obtains an exact admitted descriptor set and runtime evidence for that binding, then computes the Kit plan before Run creation. This slice has no saved selection source; do not insert a default Kit registry or read frontend fixtures here.
2. `service.mjs:2568`, `store.createRun({runtimeSnapshot: ...})`: freeze the exact Kit pins, plan/output identity and necessary evidence alongside the existing binding in the owner-approved representation. The current snapshot/store schema does not have that representation. Do not smuggle fields through serialization or claim schema19 accepts them. Host/Store owner must decide schema/migration/backward-host behavior after LP-R5, independently of this packet.
3. `service.mjs:2877`: replace only the `compileControlContext(entry.runtimeBinding)` term for an explicitly frozen Kit-present Run with its retained, validated candidate text (or exact reconstruction checked against its recorded digest). Empty Kit selection keeps the original call. Do not recompile against current configuration/evidence on resume, and do not append the plan on top of the old term, which would duplicate instructions.
4. Preserve the existing `sparkAssignment ? "" : ...` branch, extension context, async context and subagent-library placement. A Kit selection cannot alter Spark assignment sources, Attention identity or Core work context. Extending any of those requires its original owner.

The profile transaction must select/import/remove the required resources under existing CAS/scope rules, then create the binding; this planner never saves or imports. Existing `parseProfile` accepts only schemaVersion/version/resourceIds/rules/uiSlots, so a future Kit binding field needs an explicitly selected profile contract. Per-profile revisions and Role/runtime/model selection remain separate 06a/06e gaps.

The future preview may project the plan but must keep saved/draft/effective/bound states distinct. Show requested resource, runtime evidence and permission as separate readings. It cannot collapse unchecked into incompatible, `ask` into granted, `compiled` into available, or a successful plan into active-Run selection. Current production model scope remains all chats/future runs. A late preview reply must be correlated to its draft/binding digest by the UI owner.

No proposed Host hunk is applied in K0/K1/K2. If the parent instead needs inline Kit content added to a binding, the demonstrated existing-owner blocker is resource admission: `bind` only includes already-exposed config resources and `runtime_load` reads the frozen content. The concrete alternative is an owner-controlled import/selection transaction before binding, not synthetic resources inserted by the compiler.

## Verification selected by failure risk

| Invariant | Lowest-cost meaningful check after K0 selection |
|---|---|
| No-Kit bytes and history | Existing literal compiler snapshot at `control-plane.test.mjs:345–373`, plus deep-frozen old binding without additive counts; passthrough equal to unchanged compiler and original input unchanged |
| Exact provenance and boundaries | Stale body with unchanged source hash; changed title with unchanged body; CRLF, emoji, empty catalog; wrong kind/scope/exposure; same ID with different Kit pins |
| Determinism | Reordered object keys and Kit/evidence collections produce equal plans; meaningful catalog order changes remain visible; code-unit ordering cases with dot/underscore/hyphen IDs |
| Required constraints survive limits | Required resource missing/not-exposed; budget equal and one byte/unit below; header/separator overhead; shared fragment counted once; whole candidate refused, no partial fallback |
| Deferred means not injected | Unique sentinels in Skill/reference bodies absent from text; template stays human-only; absent/disabled loader and optional missing references are distinguished |
| No second permission evaluator | Exact owner permission object preserved, `ask`/`deny`/path-specific/absent summaries retained; no action API called or permission fields created |
| Compatibility truth | Missing evidence, wrong Kit/hash/runtime revision, contradictory matched evidence, explicit unsupported, synthetic supported with exact attribution |
| Minimal descriptor safety | Unknown fields/dependency edges/cycles rejected; duplicate IDs, invalid hashes, malformed Unicode, bounds, caller mutation and output aliasing |

Author commands after implementation: focused new test, relevant existing compiler/source-resolver tests, `git diff --check`, and document links. Escalate only if a demonstrated seam risk warrants it; do not run paid providers or full application stress tests for a pure module. K2 is synthetic consumer evidence, not a Host integration test.

Luna non-author verification should use an exact committed author SHA and separate adversarial inputs. Store author logs, Luna logs and parent dispositions independently in the original task packet. Author green results do not establish independent acceptance. Stop at finite K2 delivery, or at a reproduced existing-owner blocker with the alternative above; parent owns merge and capability acceptance.
