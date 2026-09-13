# Independent review source pack

**Package status:** source intake only; no review article has been written.  
**Observation date:** 2026-09-11.  
**Review posture:** read the supplied project and publication materials as an independent analyst. Do not infer capabilities, company facts, user impact, or acceptance status beyond the sources listed here.

## Assignment

Prepare a neutral third-party profile and critical review of the project represented by these materials.

The review should answer:

1. What problem does the project believe a model-based system must solve beyond generation?
2. Which objects, contracts, or boundaries are intended to survive a model, runtime, or session change?
3. How do the early project principles relate to the later Paper and the current implementation?
4. What does the visual and naming system communicate when read from the outside?
5. Which claims are source-backed, which are interpretations, and which remain unresolved?

Use three explicit labels in working notes:

- **Observed:** directly present in a fixed source or publicly attributable reference.
- **Interpretation:** a reasoned connection across observed materials.
- **Open question:** plausible but unsupported, conflicting, or still unverified.

Do not invent interviews, employees, funding, customers, model access, deployment status, or product outcomes. Do not turn a page, screenshot, fixture, or author check into independent acceptance.

## Project source set

### Early Courtwork position

Frozen source: `archive/courtwork-main@f9ade85b72e5abcdc64c3a6c43ed3a13a2292476`.

- [Project README at the frozen revision](https://github.com/lesPrivilege/Courtwork/blob/f9ade85b72e5abcdc64c3a6c43ed3a13a2292476/README.md)
- [Architecture principles at the frozen revision](https://github.com/lesPrivilege/Courtwork/blob/f9ade85b72e5abcdc64c3a6c43ed3a13a2292476/docs/architecture/principles.md)
- [Schema Engineering notes at the frozen revision](https://github.com/lesPrivilege/Courtwork/blob/f9ade85b72e5abcdc64c3a6c43ed3a13a2292476/docs/architecture/schema-engineering.md)

The early README describes Courtwork as a local-first Work Agent GUI rather than a chatbot. Its stated separation is:

- model generation and summarisation;
- deterministic checking of coordinates, scope, authorization, contracts, budgets, and irreversible actions;
- human confirmation and finalization;
- read-only originals and traceable source coordinates.

The principles document records the same boundaries as “model generation, system adjudication,” source anchoring, human confirmation, explicit degradation, contract-first integration, separation of generic mechanisms from domain judgment, immutable history, and real-data honesty.

### Current architecture and Work Core

Current implementation reference: Courtwork `main@2337ada33f1d59543c33ac9e98fcacc5a9e34d21`.

- [Current architecture](../../../engineering/architecture.md)
- [Work Core contract](../../../docs/work-core/contract.md)
- [Public narrative and product-surface boundaries](../../../engineering/release/public-narrative-2026-09-10/README.md)

Observed current boundaries:

- Work Core owns Matter, Candidate, Decision, Artifact, sources, and formal commitment state.
- Host, Runtime, GUI, and adapters project or execute facts but are not a second accepted-work authority.
- Provider and Runtime are replacement axes; changing a model should not silently change completion semantics.
- A successful tool call, completed Run, or visible UI control does not itself grant acceptance authority.
- Synthetic fixtures, local checks, screenshots, and published pages have their own evidence scope.

### Publication source

Courtwork binds, but does not copy editable Paper text. The fixed Paper baseline is **Schema Engineering 9.6 / 2026-09-07**, commit `d78fd312955c1f594e59cbdcbb0d3074ac355940`.

- [Courtwork Paper pointer](../../../PAPER.md)
- [Canonical](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/canonical.md)
- [Practice](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/practice.md)
- [Practice Index](https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/practice-index.md)

Paper observations to test against the product material:

- a Run can end, a model can be replaced, and a context can be compressed while work must continue;
- Matter is the durable work object, while Session is temporary interaction and Run is an execution attempt;
- a model output is a proposal, not an automatic organizational commitment;
- Context is a projection and output is a candidate state update, not default memory;
- the system must distinguish deterministic invariants from evaluator judgment and human authority.

### Brand and visual material

- [Brand registration and visual revision](../../../engineering/research/le-brand-2026-09-11/update.md)
- [Brand package](../../../brand/les-privilege/README.md)
- [Current SVG exports](../../../brand/les-privilege/)

Observed brand material:

- the current external name is `les Privilege`;
- `lesPrivilege` is used as a handle and `le` is a graphic mark;
- the mark is derived from the Courtwork geometry family and uses a continuous L with two right-side horizontal strokes and a shorter lower stroke;
- the package contains monochrome and colour variants with light/dark adaptations;
- the brand package is a separately documented visual asset, not proof that a product or publication has adopted every variant.

Read the geometry and typography as evidence of a design system. Do not infer a legal name, company registration, language etymology, or business operation from the spelling alone.

## External context set

These are public references for context, not evidence about the project.

### Model access, distillation, and safety framing

- [Anthropic: Detecting and preventing distillation attacks](https://www.anthropic.com/news/detecting-and-preventing-distillation-attacks)
- [Anthropic: Detecting and countering misuse of AI, September 2026](https://www.anthropic.com/threat-intelligence-report-september-2026)
- [Anthropic: Our position on open-weights models](https://www.anthropic.com/news/position-open-weights-models)

When using these references, attribute allegations and quantities to Anthropic. Do not present them as independently verified findings.

### Harness, authorization, and product-layer behaviour

- [Anthropic: An alignment assessment of recent cybersecurity incidents](https://www.anthropic.com/research/alignment-assessment-cybersecurity-incidents)
- [Anthropic: An update on recent Claude Code quality reports](https://www.anthropic.com/engineering/april-23-postmortem)
- [Anthropic: How Claude’s text watermark works](https://www.anthropic.com/news/claude-text-watermark)

These references may be used to compare public discussions of model capability with the surrounding harness, authorization, configuration, provenance, and review layers. They do not establish equivalence between Anthropic’s systems and this project.

### Community reception samples

- [Claude Code postmortem discussion](https://www.reddit.com/r/ClaudeAI/comments/1stq98j/postmortem_on_recent_claude_code_quality_issues/)
- [Long-term Claude Code user report](https://www.reddit.com/r/ClaudeAI/comments/1tdxwgx/long-term_user_report_claude_code_quality_in_may/)
- [Claude watermark discussion](https://www.reddit.com/r/claude/comments/1vm38n4/claudes_take_on_the_recent_watermark_announcement/)

These are anecdotal sentiment samples. They can show what some users discussed or distrusted; they are not representative surveys, benchmarks, or independent incident findings.

## Suggested review method

1. Read the frozen Courtwork README and principles before reading the current implementation.
2. Read the Paper at the fixed commit and record where its durable-work concepts appear in current contracts.
3. Inspect the brand package without importing author explanations that are not visible in the assets themselves.
4. Use the external references only for comparison and context, with source attribution.
5. Write an evidence table that separates observed facts, interpretations, and open questions.
6. Include contradictions and unfinished boundaries; do not produce promotional copy.

The desired output is an independent reading of the project, not a restatement of this intake. Preserve uncertainty where the source set does not close it.

## Handoff limits

- No credentials, personal data, or paid provider access are part of this pack.
- No external message or publication action is authorized by this pack.
- No editable Paper body is copied into Courtwork.
- No current product or brand acceptance is implied by the existence of this source pack.
- The external sources may change after the observation date; retain their access date in any later publication record.

## Research-lab preparation addendum

The project is now preparing a research/software lab track around reproducible evidence, replaceable runtimes, durable work semantics, and human authority. This is a preparation status, not a claim that a lab, team, benchmark, foundation model, funding base, or Anthropic-equivalent organization already exists.

The proposed comparison axes are model capability, runtime/harness behavior, durable work substrate, evidence and authority, publication discipline, and operational continuity. The first proposed methods are an evidence compiler, blind writer/blind reviewer with controls, and a replacement/continuity benchmark. None has been run as a formal benchmark yet. The latest conversation and attached images are treated as authored research input and semiotic material, not independent evidence.

Any later review should keep the following separate:

- observed project and Paper material;
- interpretation of the project’s architecture and visual language;
- hypotheses to test with synthetic fixtures or explicitly authorized providers;
- editorial or satirical material, kept separate from project facts;
- open questions about real provider behavior, product acceptance, organization, and external impact.

The lab-preparation record is maintained separately at [`engineering/research/lab-preparation-2026-09-11/README.md`](../lab-preparation-2026-09-11/README.md). It does not authorize external messages, publication, credentials, paid providers, product changes, or deployment.
