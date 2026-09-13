# Fact ledger — The Acceptance Gap

Paragraph-level evidence classifications for `report.md`. Labels follow the source package's rubric: **Observed** (directly present in supplied material), **Reported claim** (a public organization's own statement, attributed), **Interpretation** (a reasoned connection across supplied material), **Open question** (unresolved or requiring evidence outside this package).

---

## Lead (§1–§2)

| ¶ | Key claim | Label |
|---|---|---|
| 1 | les Privilege is the external name for a constellation including Courtwork and Schema Engineering | **Observed** — visible in `00-project-facts.md` and `01-brand-and-naming.md` |
| 1 | The project argues that model output is a proposal, not a conclusion | **Observed** — stated in the SE semantic summary (`00-project-facts.md`) |
| 1 | No legal entity, employees, customers, or deployed product | **Observed** — stated in `00-project-facts.md` § Limits |
| 2 | This profile works from the supplied materials alone | **Observed** — meta-statement about the package and this process |

## The problem beyond generation (§3–§5)

| ¶ | Key claim | Label |
|---|---|---|
| 3 | Most AI tooling treats the model as the primary actor; this conceals an elision between generation and accepted work | **Interpretation** — a reasoned characterization of the industry landscape, not a sourced claim |
| 4 | Courtwork is described as a "local-first Work Agent GUI rather than a chatbot" | **Observed** — `00-project-facts.md` first bullet |
| 4 | A chatbot presents output as conversation; a work agent must separate proposal, check, and confirmation | **Interpretation** — connecting the project's stated separation to a general distinction |
| 4 | A successful tool call, completed Run, or UI control does not constitute acceptance | **Observed** — `00-project-facts.md` sixth bullet |
| 5 | The separation is stated, not demonstrated; no running system, test suite, or user study is supplied | **Observed** (that these materials are absent) + **Open question** (whether the separation holds) |

## What survives a model change (§6–§9)

| ¶ | Key claim | Label |
|---|---|---|
| 6 | Schema Engineering is at version 9.6 / 2026-09-07, bound at a specific commit | **Observed** — `00-project-facts.md` § Schema Engineering |
| 7 | Matter is durable work; Session is temporary interaction; Run is an execution attempt; Context is a projection; model output is a proposal; deterministic invariants, evaluator measurement, and human authority are separate | **Observed** — SE semantic summary in `00-project-facts.md` |
| 8 | Provider and Runtime are replacement axes; model change should not change completion semantics | **Observed** — `00-project-facts.md` fifth bullet |
| 9 | The paper is maintained separately from implementation; no formal verification or type-system mapping is supplied | **Observed** (that the mapping is absent) + **Open question** (whether the invariants actually hold) |

## From principle to implementation (§10–§12)

| ¶ | Key claim | Label |
|---|---|---|
| 10 | Work Core owns Matter, Candidate, Decision, Artifact, sources, and formal commitment state; Host/Runtime/GUI/adapters are not a second authority | **Observed** — `00-project-facts.md` third and fourth bullets |
| 11 | The implementation structure reflects the paper's categories: Matter → durable objects, Candidate ≠ Decision, deterministic checking ≠ evaluator measurement | **Interpretation** — reasoned correspondence; the mapping is not explicitly provided in the source material |
| 12 | No source code, schemas, or integration tests are supplied; fidelity of implementation to paper is unknown | **Observed** (absence) + **Open question** (implementation fidelity) |
| 12 | The project's own labelling of fixture and screenshot evidence scope suggests awareness that description ≠ observation | **Interpretation** — inferring an awareness from the project's own discipline |

## The naming and visual system (§13–§16)

| ¶ | Key claim | Label |
|---|---|---|
| 13 | External spelling, handle, graphic mark, variants, and tritone palette are documented | **Observed** — `01-brand-and-naming.md` § Directly visible |
| 13 | The brand red is fenced against error/active/permission/safety semantics | **Observed** — `01-brand-and-naming.md` and SVG package documentation |
| 14 | les → lace → Lovelace; Claude → Shannon; Juliana Sorel literary echo; Chinese rendering candidates; "elegant dystopia" direction | **Observed** as supplied creative material — `01-brand-and-naming.md` § Naming and visual associations, `03-conversation-ledger.md` |
| 14 | These are explicitly labelled as creative material, not etymologies or corporate history | **Observed** — `01-brand-and-naming.md` closing paragraph and `03-conversation-ledger.md` classification column |
| 15 | The naming system communicates literary rather than purely technical sensibility | **Interpretation** — a reading of the overall naming and visual material |
| 15 | Whether this is a strength or a liability depends on what exists behind the name | **Open question** |

## The knowledge-flow landscape (§16–§18)

| ¶ | Key claim | Label |
|---|---|---|
| 16 | The source conversation discusses knowledge flows, DeepSeek/OpenAI/Anthropic reasoning timelines, and "observation privilege" | **Observed** — `03-conversation-ledger.md` rows 6–7 and `02-public-context.md` § Reasoning |
| 17 | Anthropic's distillation, threat-report, open-weights, cybersecurity, and watermark materials are registered in the package | **Reported claim** — Anthropic's own public statements, attributed to Anthropic; URLs listed in `02-public-context.md` |
| 17 | No causal claim can be drawn about which lab learned from which | **Observed** — explicit package constraint in `02-public-context.md` § Excluded conclusions |
| 18 | Provider-replaceable architecture can be read as a response to the knowledge-flow question | **Interpretation** — the materials do not assert this connection directly; stated as such in the report |

## What remains open (§19–§22)

| ¶ | Key claim | Label |
|---|---|---|
| 19 | No legal entity, funding, customers, or deployment | **Observed** — `00-project-facts.md` § Limits |
| 19 | Whether Courtwork operates as described is unknown | **Open question** |
| 20 | Paper-to-codebase fidelity is described but not demonstrated | **Open question** |
| 20 | The brand is more developed than might be expected at this stage | **Interpretation** |
| 21 | The knowledge-flow discussion is suggestive but unresolved | **Open question** |
| 22 | The project supplies the vocabulary for its own critique | **Interpretation** — a connection between the project's evidence taxonomy and the report's own method |
