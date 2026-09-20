# CourtWork

**English** · [简体中文](README.zh-CN.md)

Orchestrate your agents. Govern your work.

CourtWork is a local AI workspace where people and agents carry work forward. Projects, materials, artifacts, and decisions form a shared place to work; models and executors contribute, divide responsibilities, and hand work over. The work remains after a conversation or run ends.

Start with a question, connect your materials, delegate to an agent, inspect the results, and make a decision. Each participant has responsibilities and permissions, materials have provenance, and judgments have supporting evidence. Together, these form what we call a Court.

You remain part of the work. Step in, adjust instructions, or change direction at any time—or step away and return to the existing record.

[Explore CourtWork](https://lesprivilege.github.io/Courtwork/) · [Read the paper](https://lesprivilege.github.io/Schema-Engineering/) · [Run locally](app/README.md) · [Architecture](engineering/architecture.md) · [UX Grammar](engineering/design/ux-grammar.md)

## Give the next participant a basis to continue

**Keep the history of the work.** Each Matter preserves sources, candidates, decisions, and unfinished items for an ongoing piece of work. Materials have versions; judgments have evidence.

**Define the boundaries of participation.** Work contracts describe scope, evidence, and completion conditions. You can permit an agent to use tools while retaining review of its output. Each decision refers to specific materials and versions.

**Continue from the current state.** Execution leaves a record, formal work state preserves valid decisions, and the next run retrieves relevant materials as needed. Models and runtime configurations can change while the basis for the work remains.

## Chat, Spark, and Attention

Chat carries conversation and execution, Spark prepares materials for the work, and Attention brings people back to decisions that need them. All three contribute to the same work.

**Chat · Conversation and handoff.** Choose a supported model connection and keep discussing the question and its materials. CourtWork manages the conversations, attachments, and references retained by the application, providing materials and tools to each run within its authorized scope so the discussion can inform subsequent work.

**Attention · Follow-up and inspection.** Important requests, existing responses, and their results appear together, helping people and agents find the next step. After an interruption or a task switch, continue from inspectable records and see what still needs a decision.

**Spark · Preparation, exploration, and checking.** Spark is a product role for ongoing work. It compares and checks retained materials authorized for the current task and produces findings that refer back to exact versions. Sources and exploration notes can be opened as needed to support later judgments and work.

Experts organize responsibilities, capability requirements, and verification requirements through professional work contracts. These roles can use different execution configurations; formal work enters a Matter, and human decisions refer to specific sources and versions. Ordinary conversation does not require creating a Matter first.

**Return knowing where to continue.** A Matter brings together current state, decisions already made, unfinished items, and relevant evidence. New participants first see where the work stands, then open materials as needed. Continuity comes from the state left by the work itself, without depending on the previous participant remembering everything.

[Chat](https://lesprivilege.github.io/Courtwork/chat.html) · [Features](https://lesprivilege.github.io/Courtwork/features.html) · [Product tour](https://lesprivilege.github.io/Courtwork/tour.html) · [Experts](https://lesprivilege.github.io/Courtwork/experts.html)

## Next implementation milestone: a workspace you can return to

**Start with a question, connect your materials or repository when needed, and complete real work that can be inspected, interrupted, and resumed.**

**Start and connect.** Begin with conversation, then connect materials or a repository for the task. Project membership, connection scope, and execution permissions are expressed separately.

**Execute and inspect.** Read materials, edit files, and check results in one workflow. Chat stays readable, with runtime details available on demand; Preview presents originals, diffs, and structured results, while Review brings evidence and decisions together.

**Preserve and hand over.** Keep exact versions, reusable preparation results, and unfinished items. Continue from the work record next time, retrieving materials according to the task.

[Product direction and functional semantics](engineering/product-direction.md) defines the stable responsibilities and continuity relationships in this workflow.

## Development direction: a local agent orchestra

CourtWork's next development stage combines a Harness Core and Extensions built on upstream Pi with replaceable local and hosted agent runtimes. The immediate milestone is a real read–edit–check workflow with inspectable results and recovery after interruption. Runtime replacement and bounded delegation build on that working foundation.

**Choose an agent for the job.** Its Role describes what it does; a Kit adds working methods and expected results. A Runtime such as Pi executes the task with an available provider/model connection and permitted tools. An Expert is an agent prepared with professional Kits. Agents can share a runtime adapter while keeping their sessions, settings, permissions, and budgets separate.

The intended interface puts the agent's role first and model choices close at hand. Settings groups agent profiles and runtime connections under Agents, while Models manages provider connections. Setup should need only a brief product introduction for an experienced agent user; paths, protocols, and diagnostics appear when needed. This is the target structure, not the current support matrix.

Examples of the intended composition are Hermes with an Attention Kit and Praxis for field work, or Pi/Codex with frontend, backend, or migration Kits for specialized coding. Praxis organizes discovery, organizational cooperation, decision materials, and evidence of useful outcomes. Document, presentation, and coding Skills provide task-specific methods within the chosen Kit's work contract. Context compilation establishes that contract before loading relevant Skills; it selects material by task and preserves its authority and provenance.

The implementation sequence follows the existing work records:

1. Complete Pi dogfooding and the controlled Extensions needed to read, edit, check, and continue real work.
2. Validate the Runtime boundary with the existing OpenAI Agents API sample; add installed-agent adapters through the same lifecycle and permission contracts.
3. Support bounded delegation across runtimes while preserving each runtime's native child ownership and exact result references.
4. Connect role-first Composer configuration, independent Spark execution profiles, and Hermes/Praxis Attention work. Browser, computer-use, and swarm capabilities follow concrete demand.

Kits declare requirements; Host policy and current grants determine executable permissions. Formal work decisions remain with Work Core. Portable Kit content and runtime-specific integrations are versioned separately. The current source preview still uses the pinned Pi stack; the Agents API lane remains unavailable pending its integration and runtime checks. The compositions above guide development.

[Architecture ruling and owner mapping](engineering/research/architecture-node-2026-09-13/orchestra-direction-20260919.md) · [Praxis Kit direction](engineering/research/architecture-node-2026-09-13/praxis-kit-20260919.md)

## Connecting capabilities

Harness Extensions organize composable capabilities for computer work: files, commands, retrieval, vision, and collaboration. Developer scenarios test this integration through repository understanding, file changes, result checks, and task continuity. Coding is a validation scenario; the product can serve other kinds of work. Extensions prioritize reuse of the open ecosystem, with explicit configuration, permissions, run records, and interface integration.

## Can the work continue?

Work Continuity Evals examine work state after source changes, request retries, and execution interruptions. The current Continuity suite uses synthetic data and deterministic executors to compare shared conformance requirements across CourtWork Core and an ordinary persistent approval system.

The state-machine, fault-replay, and Disclosure evaluation designs ask further questions: do combinations of operations preserve valid state, what survives an interruption, and how much information must a new executor read to continue correctly?

[Eval](https://lesprivilege.github.io/Courtwork/eval.html) · [Evaluation contract](benchmarks/SPEC.md) · [Run Continuity](benchmarks/continuity/README.md)

## Run locally

Requires Node.js 22.19+, Python 3, and Git 2.36+.

```sh
git clone https://github.com/lesPrivilege/Courtwork.git
cd Courtwork
npm --prefix app ci
npm --prefix app start -- --data-dir /absolute/path/outside-repo/courtwork-data --port 8845
```

Open the address printed in the terminal. The default is a local deterministic provider; configure your model connection in Settings → Models. The source preview reuses a pinned Pi execution stack, and Local test checks connection and execution paths. The synthetic NDA guide uses a supported real model to generate candidates for a person to inspect and decide on. See the [runtime documentation](app/README.md) for configuration, current capability scope, data migration, and backups.

Local product checks use synthetic fixtures and deterministic providers, with no real model credentials required:

```sh
npm --prefix app run check:product
```

Tests require the full Git history; historical inputs are validated before execution.

Default tests run at most four test files concurrently. To observe resource contention, run `npm --prefix app run test:load` separately; its concurrency limit is eight. This load entry point does not replace the default acceptance command.

## How the work fits together

Schema Engineering asks what work must retain across sessions and executors, and which rules should govern its changes. CourtWork applies these distinctions to everyday work: materials enter a Matter, execution produces candidates, and verification and authorized acceptance ground judgments in specific versions.

The product centers on a shared workspace where work can be handed over and continued. Resource services retain materials; Work Core manages formal state, version relationships, and decisions. Orchestration brings agents, models, and execution environments into the work. Work objects and responsibilities remain stable while execution configurations connect and change along those relationships. The current implementation adopts [Schema Engineering 9.6](PAPER.md) and reuses Pi for execution integration; professional contracts and runtime adapters remain separate. See the [Features architecture diagram](https://lesprivilege.github.io/Courtwork/features.html#architecture) and [Experts](https://lesprivilege.github.io/Courtwork/experts.html) for these boundaries, the parts of a run, and the path from professional requirements to formal decisions. Module ownership is documented in [Architecture](engineering/architecture.md); conceptual and implementation boundaries are in [Runtime and Work](engineering/architecture-runtime-canon.md).

## Development entry points

Before starting, check the branch, HEAD, and [current engineering status](engineering/current.md), then read [product direction](engineering/product-direction.md), the relevant assignment, and its evidence.

- **Architecture**: [Modules and responsibilities](engineering/architecture.md) · [Runtime and Work](engineering/architecture-runtime-canon.md) · [Core contracts](engineering/core-contracts.md)
- **UX**: [UX Grammar](engineering/design/ux-grammar.md) · [Frontend continuity contract](engineering/design/agent-interface-2026-09-10/frontend-contract.md) · [Copy](engineering/design/copy-convention.md) · [Composition](engineering/design/ui-composition-standard.md) · [Controls and icons](engineering/design/atlas/README.md)

Before adding an interface, establish object, action, state, and recovery semantics, then reuse registered components, native SVGs, and implementation precedents. Use the [verification guidance](engineering/verification.md) to select focused checks, real user paths, and browser inspection. Delivery records retain the scope of evidence and any exceptions.

English is the default documentation language. Keep the root README available in English and Chinese, updating both together. Prefer English for new and substantially revised architecture, Design, API, contract, and other secondary documentation. Preserve historical evidence and quotations in their original language; migrate existing Chinese documentation as needed. See [AGENTS.md](AGENTS.md#documentation-language) for the convention.

## Repository structure

| Directory | Contents |
|---|---|
| [app/](app/README.md) | Web UI, local Host, runtime integration, and Work Core |
| [docs/](docs/README.md) | API, data, and interface contracts |
| [site/](site/README.md) | Pages source and interactive specimens |
| [brand/](brand/README.md) | Standalone SVG symbol package |
| [benchmarks/](benchmarks/README.md) | Reproducible conformance evaluations |
| [engineering/](engineering/README.md) | Architecture, design, and engineering progress |
| [evidence/](evidence/README.md) | Delivery and verification records |
| [tools/](tools/README.md) | Validation and maintenance tools |

## License

[MIT](LICENSE)
