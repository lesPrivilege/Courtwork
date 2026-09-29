# Technical documents

This directory holds product contracts (interface, data, runtime and work-state) and a small set of historical handoffs. Contracts are current and are edited in place; handoffs are kept as delivered and are not start instructions. Status is [engineering/current.md](../engineering/current.md); where each kind of material goes is [repository layout](repository-layout.md).

Effect labels: **contract** = current, edited in place; **index** = routes to contracts; **history** = a handoff or audit kept as of its delivery; **superseded** = names its replacement.

## Contracts

### Run, HTTP and runtime

| Entry | Serves | Effect |
|---|---|---|
| [app/README.md](../app/README.md) | Local run, model connection, data and migration | contract |
| [app/docs/README.md](../app/docs/README.md) | HTTP API and runtime implementation documents | index |
| [runtime-control/INDEX.md](runtime-control/INDEX.md) | Runtime Control Plane: resources, permissions, context, MCP | index |
| [work-core/README.md](work-core/README.md) | Work Core: Matter, sources, candidates, decisions, Attention | index |

### Interface and reading

| Entry | Serves | Effect |
|---|---|---|
| [interface-components.md](interface-components.md) | Composer, messages, workspace, focus and controls | contract |
| [markdown-reader.md](markdown-reader.md) | Fixed-revision files, Core text and source identity | contract |
| [output-review.md](output-review.md) | Model output versus the Review surface | contract |
| [ui-composition.md](ui-composition.md) | Containers, expansion, return and state ownership; visual-replacement boundary | contract |
| [ui-orchestration-contract.md](ui-orchestration-contract.md) | UI orchestration contract and SE traceback | contract |
| [typography-refinement.md](typography-refinement.md) | Type scale and controls | contract |

### Repository

| Entry | Serves | Effect |
|---|---|---|
| [repository-layout.md](repository-layout.md) | Directory ownership, generated files, raw inputs, what each kind of material is for | contract |

Design rules are in [engineering/design](../engineering/design/README.md), module architecture in [architecture](../engineering/architecture.md), and verification records in [evidence](../evidence/README.md).

## Historical handoffs and audits

These keep the scope and wording of their delivery date. They do not describe the current start method (see [app/README.md](../app/README.md)); the branch names, ports and paths in them may no longer exist; none authorizes new work. Read one only when a question needs what was handed over then.

| Entry | What it was | Effect |
|---|---|---|
| [CLAUDE-POLISH-HANDOFF.md](CLAUDE-POLISH-HANDOFF.md) | Claude polish handoff against a 2026-09-07 baseline | history |
| [command-assignment.md](command-assignment.md) | V7-01 command, draft and receipt identity boundary | history |
| [surface-assignment.md](surface-assignment.md) | V7-02 work-surface entry and reading layout; still cited by evidence packets | history |
| [restore-v6.md](restore-v6.md) | V6 restore and local run | history |
| [restore.md](restore.md) | V7 restore and local run | history |
| [scope-correction-v6.md](scope-correction-v6.md) | V6 scope correction to a generic work-agent foundation | history |
| [reference-entrypoint-audit.md](reference-entrypoint-audit.md) | Audit of an earlier reference entry; states it does not describe current code | history |
| [reading-marks.md](reading-marks.md) | Restrained reading marks | superseded by [typography-refinement.md](typography-refinement.md) |
