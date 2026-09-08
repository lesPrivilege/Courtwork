# Source consumption · Harness Core / NDA

**Date:** 2026-09-08
**Reviewer:** Luna, read-only source and contract audit
**Implementation reference:** branch `codex/harness-core`; first Core node SHA `6d0a09d`; NDA fixture refactor `48942de`; source-bound evaluator fix `c0afb2d`. This record does not accept any implementation node.

This file records the bounded source material actually consumed for the Harness Core handoff. It records mechanisms and contract implications; it does not claim a full upstream source, security, runtime, GUI, provider, or professional-work audit.

## PT2 source package

The handoff package was read from the external evidence directory. The raw private package is not copied into this repository.

| Input | Read range | SHA-256 | Size |
|---|---:|---|---:|
| `harness-primitive-index.md` | lines 1–815 | `170fe09abddb4a5fe0476dc2e68d392459868e050eaf0066854ef8dc1ce3f7a8` | 62,962 bytes |
| `source-manifest.json` | lines 1–1498 | `3c10d146f11d60a66c2e34366e5b74b72be1b7fd38e22f8e631887013157b8d5` | 58,656 bytes |

Private source coordinates are recorded once in the [implementation handoff](../../engineering/execution/2026-09-08-main-round/fresh-astra-core-handoff.md); use its exact paths and the hashes above for targeted recall.

The manifest reports schema `fresh-courtwork-harness-explore-index/v1`, status `breadth-first-static-explore; all selection decisions provisional`, four primary projects, 21 mechanism cards, 51 sources, nine supplementary entries, and eight queued questions. Its scope explicitly says that runtime and GUI were not modified or executed, tests were not run, no crash/cancel/reconnect or fault injection was done, no full security or source audit was done, and the sources provide mechanisms rather than SE product effectiveness.

The pinned primary inputs recorded by the manifest were Pi `v0.85.1` / `d981de1229ef899957bbe968bc8dcda02a21f477` / MIT; DeepSeek Harness preview / `d347e703908d0406b7a7ef80e3a0e594d86b2215` / MIT; Codex CLI `rust-v0.153.4` / `3d2ee51ca2d5db578f328aa75e20aa22c0197c9a` / Apache-2.0; and OpenCode `v1.18.29` / `02a167e048d3bd7299225068d79e4fce5c830d67` / MIT.

## Card dispositions

These are the source audit recommendations, not the final implementation adoption or upstream acceptance claims. Actual consumers and rejected/deferred alternatives are fixed in [adoption.md](adoption.md).

| Cards | Disposition for CourtWork | Boundary |
|---|---|---|
| Pi K01, K02, E05, S01, C01 | Thin adapter | Reuse the existing Pi loop/provider, tool lifecycle, C3 session/RPC, and context projection seams; keep Matter/work semantics outside the loop. |
| Pi S02 / H4 | Reference only / experimental | H4 is WIP; do not make its intent→effect→settlement or incomplete watch/search/telemetry/fork/migration behavior the formal state store. |
| DSH K03, K04, S03, C02, X01 | Reference; thin-adapt only if DSH is selected as host | Monotonic guards, shared execution world, flush/interrupted-turn repair, logged input, and profile/bundle scope inform seams; they do not prove MCP Tasks, flush durability, or a stable preview ABI. |
| Codex E03, S04 | Thin adapter through app-server stdio | Use Thread/Turn/Item and ThreadStore as an external executor seam; do not copy its internal writer or call Thread/Turn a Matter. |
| OpenCode E01 | Reference / possible server adapter | EventV2 and aggregate cursor are mechanism references until gap/duplicate/replay behavior is tested. |
| OpenCode E02 | Explicit mapping | `idle`, `busy`, and `retry` are execution observations, not completed or accepted work. |
| T01, P01 | Candidate pending lock and tests | Lock Playwright/SRT versions, license and security configuration before adoption; reuse isolation and do not build a new sandbox. |
| T02, G01, G02 | Reference only for the first slice | Defer high-risk computer action; assistant-ui/AI Elements and ACP inform UI/interoperability only, not the source of record or exactly-once commitment. |

The PT2 selection matrix (index lines 683–706) supports adopting or thin-adapting provider, shell, session persistence, verification and GUI facilities while keeping Candidate/Review/Commitment in the existing SQLite source of record. The formal-commit supplement requires Candidate and active version to remain distinct; a commit to carry expected Matter version, candidate identity/hash, Review decision and Authority; failure to preserve the candidate/current pointer; success to return a queryable commit receipt; and no second distributed event store or generic framework.

In the original upstream exploration, the queued Q1–Q8 probes were unexecuted: single owner/no Core patch; cancel settlement; durability windows; reconnect gaps; version conflict; Authority closure across tool/shell/MCP/browser; fresh-context/cache sufficiency; and Run completion versus work acceptance. No upstream experiment is retroactively marked as run. The local Courtwork probes are separately mapped in [adoption.md](adoption.md).

## Paper binding and byte checks

`PAPER.md:7-13` binds CourtWork to SE 9.3 / 2026-09-05, commit `f8ecb091895559389bb4e75f3c6f28052b71c5a3`. A temporary read-only Git fetch verified the three fixed 9.3 blobs:

| Blob | SHA-256 | Size |
|---|---|---:|
| Canonical | `4966b48745f8a365cec915c138fdb8e7139ce036fcb4c54b718c04ed1eba1b14` | 142,382 bytes |
| Practice | `be24dd348c1c1d2929a749e2ec0e6bb5d0eb605b5492aa3c17c8e999b28cc86c` | 31,241 bytes |
| Practice Index | `cb75e23b381e44cd73b628ed94aadf23633d1b294fbede01e092539ac7531254` | 47,671 bytes |

The PT2 manifest instead records research inputs labelled 9.4 / 2026-09-06: Canonical `7fb6645c3f4836041f5f77b04cd58392aa59064935e4c7c2ced0a1e8619672c8`, Practice `8def805dd68aa8412c83c2128be21c7dac0a632cf31ebcdac491979cf0b918e8`, and Practice Index `174ef14ebd912e03c12c0f112b5f2b2d2d003eb1cea52a9fa269cb2e7dacb51a`. These are recorded as research inputs only. The local 9.6 candidate is also not adopted. The implementation contract therefore uses the fixed 9.3 commit above until a later decision and evidence update changes `PAPER.md`.

## P1–P21 implementation mapping

The labels below are the paper invariants used in the prior source reconciliation. They map the fixed 9.3 semantic baseline to observable local checks; they do not claim that each check has passed.

| Paper point | Local implication and decisive counterexample |
|---|---|
| P1 / P2 | Matter is the user work object; Session/Conversation is infrastructure or a surface. Replace/delete a Session and verify Matter, active Artifact, obligations and evidence remain queryable. |
| P3 | Transcript is execution evidence, not canonical state. A transcript summary or UI response must not write current state or approve work. |
| P4 | Keep Stable Contract, Current Semantic State and retrievable History separate. Source revision replacement, producer absence and fresh Session must preserve independently readable state/history. |
| P5 | Formal commit is a narrow typed operation bound to version, candidate identity/hash, evidence and authority. Unbound or stale packets must be rejected. |
| P6 | Model proposes; deterministic system invariants and Evidence checks validate; an accountable human adjudicates. Forged reviewer/actor or direct model accept must have no committed effect. |
| P7 | Provenance is durable state. Preserve source/rule/playbook/provider/run identity needed to explain each proposal and decision. |
| P8 | Completion is outside the model. A successful Run or provider response cannot create an accepted Artifact without the commitment path. |
| P9 | Lane, Operator and Accountable Principal remain distinct. Parallel workers or background cleanup do not acquire final authority. |
| P10 | Product/runtime integration absorbs execution complexity behind the work contract; domain code must not make users reconstruct runtime state from traces. |
| P11 | Capture, infer and selectively promote are separate steps. Inferred facts/findings remain candidates until reviewed and committed. |
| P12 | Production traces and synthetic fixtures are different evidence classes. Current NDA gold is deterministic engineering evidence, not a production or legal-quality result. |
| P13 | Delete executable scaffolding while preserving durable semantics. Unload/producer absence must leave a readable historical fallback. |
| P14 | Evaluation infrastructure is a separate contract. Record corpus, playbook, adapter, model/provider, config, reviewer and code hashes before holdout inspection. |
| P15 | Training is optional and cannot substitute for runtime invariants, evaluation or human adjudication. |
| P16 | Do not use training as validation, globalize local preference, or replace an accountable decision with automation. Keep unresolved/unknown cases visible. |
| P17 | Extension release requires the author absent path plus E2E behavior, compatibility, lifecycle and acceptance evidence. A type/API/mock or loaded plugin is insufficient. |
| P18 | Context is a projection; output is a Candidate. Context mutation/compression must not erase raw evidence or formal state. |
| P19 | Runtime success is not work acceptance. Keep Run status, Candidate status, Artifact version and Decision distinct. |
| P20 | Preserve the paper's separation of mechanism, work semantics and evidence strength when reporting results; do not promote vendor mechanism claims into product efficacy. |
| P21 | Use layered contracts and local evidence. Runtime, extension, domain and evaluator contracts need separate hashes/tests and explicit `not_run` boundaries. |

Fixed 9.3 sections used for the mapping were Canonical §3, §4.6–4.9, §5, §6, §8, §13–§15 and the corresponding Practice §2–§7.3. In particular, Canonical §4.6–4.9 separates Candidate/Committed Events, immutable Artifact versions, Current Semantic State and History; §5 separates Store/Govern/Retrieve/Compile and preserves context mutation boundaries; §8 and §13 preserve the Work Extension/runtime adapter and single canonical owner boundaries; §14 and Practice §7.3 define negative tests such as no Core patch, reload, Candidate/Committed isolation, Authority failure, retrieval separation, context preservation, renderer equivalence, evaluator lifecycle and accepted-work-product checks.

## NDA verification evidence and limits

At source-bound evaluator SHA `c0afb2d`, `node --test app/tests/nda-domain.test.mjs` passed 8/8. The deterministic outcomes were:

```text
development normal:    pass, pass, pass, pass
development missing:   pass, pass, missing, pass
development conflict:  pass, pass, pass, conflict
development unknown:   unknown, pass, pass, pass
holdout normal:        pass, pass, pass, pass
holdout deviation:     pass, pass, deviation, pass
```

The combined focused run `node --test app/tests/nda-domain.test.mjs app/tests/nda-runtime.test.mjs` initially passed 9/10 tests at `c0afb2d` plus the then-current working tree; the unresolved-facts acceptance scenario returned 500 `internal_error` because `app/server/index.mjs:77` did not map the extension's `OBLIGATION_OPEN` code. After the working-tree route mapping added `OBLIGATION_OPEN` to the 409 extension-error set, the same command passed 10/10. The route fix was uncommitted at the time of this audit; the deterministic domain verifier rejected the unresolved acceptance path throughout.

This was a fixture/domain check only. It did not run a real provider, professional Reviewer, full 12-variant corpus, or complete lifecycle experiment.

The first independent adversarial pass at `48942de` found three concrete verifier gaps; the current `c0afb2d` domain verifier recheck shows those domain-boundary cases fixed:

1. Deleting `review.contractVersion` now returns `CONTRACT_MISMATCH`, and `assertReview` rejects it with `VERSION_MISMATCH` before candidate conversion.
2. Replacing a finding reason with `model says pass` now returns `REASON_MISMATCH` from `verifyReview`.
3. Extending the trailing source anchor beyond the source code-point length now returns `INVALID_EVIDENCE` (with the expected coverage/reconciliation follow-on errors).

The `c0afb2d` evaluator now consumes `conflictQuotes` and `sourceMarkers`: the conflict fixture produces a bounded two-anchor `conflict` finding, and the changed Purpose fixture produces an anchored `unknown` finding. The standalone `reviewToCoreCandidate` helper remains trust-based by contract: direct calls with a forged reason or out-of-bounds anchor are accepted, while the extension's `normalizeProposal` path invokes `verifyReview` first. The fixture hash gate is green at the current commit. These observations are adapter evidence, not accepted professional legal evidence.

## Commands and evidence boundary

The source hash and size checks used `sha256sum` and `wc -l -c` on the two PT2 files. The local deterministic checks used:

```sh
node --test app/tests/nda-domain.test.mjs
node --test app/tests/nda-domain.test.mjs app/tests/nda-runtime.test.mjs
```

The three NDA counterexamples were run with an inline Node ESM script importing `buildReview`, `verifyReview`, `reviewToCoreCandidate`, `reviewToArtifact`, `GOLD_FIXTURES`, and `serialization.sha256`; each result was captured as a structured return or verifier exception. No credential store, personal data, paid provider, GUI, or external messaging service was accessed. The PT2 upstream files were not modified, and this record does not claim full upstream or Paper audit coverage.
