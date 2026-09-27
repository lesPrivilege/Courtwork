# Source index and verification limits

Source conversation: `6ab7bf9d-bba8-83ec-9cb1-2bbb7c9d843d`, “定义 Attention Assistant”. Retrieved 2026-09-27. [Raw API return](source/thread.json), [manifest and hashes](source/manifest.json). Quoted instructions are historical evidence, not active commands. Chronological turn labels below reverse the API's newest-first order.

| Turn | Reading copy | Subject and use |
|---|---|---|
| T1 | [Original text](source/turn-01.md) | Service-recovery anecdote; watcher role and failure-domain question. Not architecture evidence about OpenAI. |
| T2 | [Original text](source/turn-02.md) | Product-rumor screenshot; role versus lifecycle/identity/permissions. Launch/tier speculation excluded. |
| T3 | [Original text](source/turn-03.md) | Hermes Attention next research direction; development Kit versus runtime extension; Map/Grammar/Tools/Gates. |
| T4 | [Original text](source/turn-04.md) | Community-search synthesis, external mechanisms, suggested directory tree and unsupported percentages/counts. Parent disposition required. |

Both images are retained: [1000000377.jpg](source/1000000377.jpg) shows a Tibo service-recovery post mentioning a spare Codex; [1000009190.jpg](source/1000009190.jpg) shows an “o” product-rumor post. Astra inspected the actual images. The API attachment list does not bind each image to a message ID, so the topic associations above are based on content, not asserted attachment metadata. No social account authenticity, current product availability or release claim was independently established.

## External mechanisms

Luna checked the primary sources below on 2026-09-27. “Checked” means source-level inspection, not execution, benchmark or proof of community consensus. Floating documentation must be rechecked and implementation sources pinned before adoption. Detailed observations and limits remain in the preserved [runtime](explore/luna-runtime.md.txt) and [dogfooding](explore/luna-dogfood.md.txt) handoffs.

| Source from conversation | Mechanism supported | Limit / parent use |
|---|---|---|
| [Hermes architecture](https://hermes-agent.nousresearch.com/docs/developer-guide/architecture) | Native entry points, agent, tools and persistence | Current docs; not evidence of a CW managed adapter |
| [Hermes gateway](https://hermes-agent.nousresearch.com/docs/developer-guide/gateway-internals) | Normalized message events, session routing, queue/interrupt and authorization | Native semantics require explicit Host mapping |
| [Atlas original URL](https://github.com/mxzinke/atlas) → [pinned README](https://raw.githubusercontent.com/unclutter-pro/atlas/ced95138d0b4e70bdb07b6d7233dea6caec9a24e/README.md) | Inbox → wake → execution → sleep | Source pin `ced95138d0b4e70bdb07b6d7233dea6caec9a24e`; no CW dedupe/recovery proof |
| [AEGIS](https://github.com/hikmahtech/aegis), [pinned README](https://raw.githubusercontent.com/hikmahtech/aegis/a4b11b36cf2a148270603bdf9a1e2878d929b8ae/README.md) | Scheduled/event flows, decisions, notification budget, watchdog | Source pin `a4b11b36cf2a148270603bdf9a1e2878d929b8ae`; personal working example, not standard |
| [LangGraph interrupts](https://docs.langchain.com/oss/python/langgraph/interrupts) | Persisted pause/resume, node replay and side-effect idempotency constraints | Reference for failure cases; no library selected |
| [Temporal AI](https://docs.temporal.io/ai) | Durable workflow and long human waits | Platform reference; no Temporal dependency selected |
| [Aider repository map](https://aider.chat/docs/repomap.html) | Budgeted file/symbol/dependency navigation | Structural navigation, not semantic authority |
| [OpenHands Skills](https://docs.openhands.dev/overview/skills) | Progressive package loading | Client behavior; supplemental [path rules](https://docs.openhands.dev/overview/skills/path) are OpenHands-specific |
| [Agent Skills specification](https://agentskills.io/specification) | Metadata/body/resources packaging | No universal install root, permissions, sandbox or path triggers |
| [Spec Kit repository](https://github.com/github/spec-kit) | Source and project context | Not installed; no adoption/popularity claim |
| [Spec Kit agentic SDD](https://github.com/github/spec-kit/blob/main/docs/reference/agentic-sdd.md) | Converge compares spec/plan/tasks with delivery and appends gaps | Floating main; [command template](https://github.com/github/spec-kit/blob/main/templates/commands/converge.md) is a reference, not a CW command |

The source presents 11 distinct URLs despite claiming “10 primary sources”; repository and document links overlap in project identity. We preserve that discrepancy, not reproduce a search count. No raw 122-result/16-query search log was returned, and no meaningful denominator establishes “Hermes completes 60%.” These claims are excluded from decisions.

## Existing Hermes evidence is separately versioned

The [prior local-runtime ruling](../architecture-node-2026-09-13/local-agent-runtimes-20260920.md) and its linked evidence record a bounded, tool-free Hermes/Praxis consultation. The historical installed identity `v0.21.3 / 2026.9.14` at `d7b836ab1c0cddaafc109ed24c9a83b6191cdc88`, a separate upstream source pin `345cd2b057a452236de401d3534b8502a7465e8d`, and today's public docs are different evidence identities. This intake does not re-inspect personal runtime configuration or upgrade Hermes. Tools, enforced permissions, resume, cancellation and managed CW integration remain unproven by that consultation.
