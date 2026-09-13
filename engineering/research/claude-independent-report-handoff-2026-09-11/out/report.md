# The Acceptance Gap

*les Privilege, Courtwork, and Schema Engineering address a question most AI tooling defers: what happens to the work when you change the model?*

---

les Privilege is the external name for a constellation of projects — a local-first work agent called Courtwork, an accompanying paper called Schema Engineering, and a visual and naming system — that together argue for a particular kind of discipline in model-based work. The project does not yet have a legal entity, employees, customers, or a deployed product. What it has is a detailed position: that a model's output is a proposal, not a conclusion, and that the boundaries between generation, checking, and human authority must be architectural, not implied.

The materials examined here were supplied as a self-contained source package. This profile works from those materials alone. It includes no independent interviews, external verification, or access to a running system.

## The problem beyond generation

Most AI-assisted tooling treats the model as the primary actor. The user prompts; the model generates; the result is presented as though the interesting work is done. Courtwork's position is that this framing conceals a dangerous elision. Between the moment a model produces output and the moment that output becomes accepted work, several things must happen that no model should perform on its own behalf: scope checking, authorization verification, budget validation, and — critically — the irreversible commitment of a result to the record.

The project's early description frames Courtwork as a "local-first Work Agent GUI rather than a chatbot." The distinction is not merely one of interface. A chatbot presents model output as conversation; a work agent, in Courtwork's framing, must separate what the model proposed from what the system checked and what the human confirmed. A successful tool call, a completed execution run, or a visible UI control does not, in this architecture, constitute acceptance. Authority over the work product remains with the human until explicitly granted.

This separation is stated, not demonstrated. The supplied materials include project architecture and semantic definitions but not a running system, test suite, or user study. Whether the separation holds under real conditions — where models are persuasive, users are hurried, and the path of least resistance is to accept what appears on screen — is precisely the kind of question the project's own evidence categories would label "open."

## What survives a model change

The theoretical backing for Courtwork's position is a paper called Schema Engineering, currently at version 9.6 (dated 2026-09-07), bound to Courtwork at a specific commit hash. The paper proposes a set of semantic distinctions that, taken together, form what might be called an ontology of model-based work.

The central distinctions: Matter is durable work — the thing that persists after the session ends and the model is replaced. Session is temporary interaction. Run is an execution attempt. Context is a projection — a shaped view of the state, not the state itself. Model output is a proposal. Deterministic invariants, evaluator measurements, and human authority are each categorically separate from each other and from all of the above.

The practical consequence of this taxonomy is a design principle: Provider and Runtime are replacement axes. Changing a model should not silently change completion semantics. If a piece of work was accepted under one model and the system later switches to another, the acceptance should still mean what it meant. The model contributed a proposal; the checking was deterministic; the authority was human. None of those roles should collapse into each other merely because the underlying model changed.

This is an architectural claim, not a proven property. The paper is maintained separately from the implementation, and the supplied materials do not include a formal verification or a mapping between the paper's categories and the codebase's type system. The relationship between the paper's semantic intentions and the running system's actual invariants remains, by the project's own standards, an interpretation rather than an observed fact.

## From principle to implementation

The current Courtwork implementation, as described in the supplied material, organizes around a Work Core that owns Matter, Candidate, Decision, Artifact, sources, and formal commitment state. Host, Runtime, GUI, and adapters may project or execute facts but are explicitly not a second authority on whether work has been accepted.

This design reflects the paper's categories in structural form. Matter in the paper becomes the Work Core's durable objects. The paper's insistence that model output is a proposal becomes the implementation's rule that a Candidate is not a Decision. The paper's separation between deterministic checking and evaluator measurement becomes, presumably, a boundary between what the Core validates and what external measurement can report about a completed artifact.

The word "presumably" does the necessary work here. The supplied materials include architectural descriptions but not source code, database schemas, or integration tests. Whether the implementation actually enforces the paper's boundaries — or whether, like many principled architectures, it has accumulated pragmatic compromises — cannot be determined from a source package alone. The project's own source discipline, which carefully labels the evidence scope of synthetic fixtures and screenshots, suggests an awareness that observing a system's description is not the same as observing the system.

## The naming and visual system

The project presents itself to the world through a layered naming and visual system that operates at several registers simultaneously.

At the surface: les Privilege is the external spelling; lesPrivilege is a handle; le is a graphic mark consisting of a continuous L-like path and horizontal strokes, rendered in monochrome and tritone variants. The tritone's red is documented as brand identity rather than a state token — it must not be read as error, active, review, permission, or safety. This is a small but telling constraint: the project is aware that color carries semantic freight in software interfaces and has explicitly fenced its brand color against that freight.

Beneath the surface, the supplied materials include a set of associative readings that the source package itself labels as creative material, not etymology or corporate history. les can be read toward lace, and from lace toward Lovelace. Claude — the name of Anthropic's model family — can be read toward Shannon. A proposed parallel-world founder, Juliana Sorel, carries a literary echo of Stendhal's Julien Sorel. Chinese rendering candidates explore how the name translates across linguistic registers, with one (蕾丝·普里维莱吉) introducing a soft, textile, feminine dimension. The overall aesthetic direction is described as "elegant dystopia" — a soft, civil surface examining authority, evidence, governance, and privilege.

To an outside reader, the naming system communicates a project that is aware of its own semiotics and has chosen to operate in a literary rather than purely technical register. Whether this is a strength — positioning the project as culturally literate and self-aware — or a liability — inviting the suspicion that the naming is more developed than the product — depends on what the reader finds when they look past the name. At the moment, there is not enough public evidence to settle the question.

## The knowledge-flow landscape

The supplied materials include a discussion of public knowledge flows between model providers — specifically, the relationship between openly published model weights and technical reports on one hand, and closed frontier model releases on the other. The source conversation references DeepSeek, OpenAI, and Anthropic reasoning timelines, and proposes a concept of "observation privilege": the asymmetric access that a provider has to its own model behavior, wire traffic, logs, and the account of events.

Anthropic's own public materials on distillation, its September 2026 threat report, and its positions on open weights and cybersecurity are registered in the source package as comparison context. The package is explicit: these are Anthropic's reported claims and should be attributed as such, not presented as independently verified findings. No causal claim about which lab learned from which, or whether any provider misused another's work, can be drawn from this material.

The project appears to position itself within this landscape not as a participant in the model-training competition, but as concerned with what happens downstream — in the space where models are used rather than built. Schema Engineering's insistence on provider-replaceable architecture can be read as a response to the knowledge-flow question: if you cannot fully trust any single provider's account of events, design the system so that the provider is an interchangeable component rather than a privileged authority. This is an interpretation. The supplied materials do not assert the connection directly.

## What remains open

Several questions cannot be resolved from the supplied materials alone.

The project has no established legal entity, no reported funding, no customers, and no public deployment. Whether Courtwork operates as described — or operates at all beyond its documentation — is unknown. The relationship between Schema Engineering's semantic categories and the actual codebase is described but not demonstrated. The paper's version is pinned to a specific commit, but the implementation's fidelity to the paper is an open question.

The brand and naming system is more developed than might be expected for a project at this stage, which raises a question the materials do not answer: is this a project that named itself before it shipped, or one that understands naming as part of the intellectual work?

The knowledge-flow discussion is suggestive but unresolved. No causal claims about model provenance, distillation, or provider conduct can be drawn from this package.

These limitations are structural, not accidental. The project's own evidence taxonomy — observed, reported, interpreted, open — provides the categories for stating them. That the project supplies the vocabulary for its own critique is, at minimum, a sign that it has thought about the problem of self-description with the same care it brings to the problem of model-generated authority. Whether that care extends to the engineering remains to be seen.
