# Frontend intake: bounded upstream verification

**Date:** 2026-09-08

**Scope.** This note checks only the three reference slices named in
`Downloads/courtwork_se_gui_review_runtime_index_2026-09-08.md`: assistant-ui
runtime/headless boundaries, Vercel AI Elements source ownership and React
assumptions, and CopilotKit governed actions/interrupts. It does not validate
the index's other P0 claims. Each reference below uses at most two official
documentation/source locations. The sources were accessed 2026-09-08.

## 1. assistant-ui: runtime layering and the headless boundary

**Official evidence.** [Runtime architecture](https://www.assistant-ui.com/docs/runtimes/concepts/architecture)
defines three layers: core runtimes (`LocalRuntime`, `ExternalStoreRuntime`),
protocol layers (`DataStream`, `AssistantTransport`), and framework adapters.
The core runtimes own or consume messages, threads, branching, edit/regenerate
state, and run lifecycle; `ExternalStoreRuntime` lets the application own the
message array and callbacks. [The repository's package-boundary guidance](https://github.com/assistant-ui/assistant-ui/blob/main/AGENTS.md#package-boundaries--public-surface)
places framework-agnostic runtime logic in `@assistant-ui/core`, the React
coupling in its `./react` subpath, and web primitives in `@assistant-ui/react`.

**Verified mechanism.** assistant-ui is a layered runtime/UI system. A backend
adapter or wire protocol feeds a core runtime; UI components consume the
runtime state. The external-store path is the relevant headless boundary for
an application that already owns canonical messages/state: assistant-ui
provides conversion and runtime behavior while the application supplies state
and callbacks. The framework-specific React surface remains a separate layer.

**CourtWork implication.** Treat assistant-ui as a possible interaction/runtime
reference or adapter boundary for chat-thread mechanics. Keep WorkEvent,
ReviewItem, Matter state, policy, and commit authority in CourtWork-owned
contracts. A vanilla-MJS CourtWork surface can reuse the layering idea and
event/state contracts without importing React; using assistant-ui components
directly would be a separate React integration decision.

**Limit.** The sources do not make assistant-ui a durable Matter store, an
approval authority, or a general framework-neutral widget library. Its
`ExternalStoreRuntime` boundary means the host owns state, but does not by
itself define persistence, authorization, replay, or commit semantics.

## 2. Vercel AI Elements: source-owned delivery with React assumptions

**Official evidence.** [AI Elements usage](https://elements.ai-sdk.dev/docs/usage)
says installed components become part of the application's codebase rather
than remaining hidden in a library, and can be customized there. [AI Elements
setup](https://elements.ai-sdk.dev/docs/setup) lists React 19, Next.js 14+, the
AI SDK, shadcn/ui, and Tailwind CSS 4 as setup prerequisites.

**Verified mechanism.** AI Elements uses a registry/CLI to copy selected
component source into the consumer's configured components directory. The
source is then owned and edited by the consumer, while the supplied component
set assumes a React/Next/shadcn/Tailwind environment. This is source delivery,
not a backend/runtime or persistence boundary.

**CourtWork implication.** The useful idea is source ownership for a small,
reviewable primitive that CourtWork can adapt or vendor. The React and
Next/shadcn assumptions are a material compatibility constraint. Current
CourtWork's vanilla-MJS frontend should not migrate stacks merely because this
reference has useful component anatomy; selectively reproduce the behavior or
keep it behind an explicitly chosen adapter.

**Limit.** Source copying does not transfer AI Elements' dependency graph,
styling system, accessibility coverage, or update policy automatically. Any
vendored component must be reconciled with CourtWork's existing DOM, tokens,
event contracts, and browser/runtime constraints.

## 3. CopilotKit: governed action envelope and interrupt gap

**Official evidence.** [Governed Action Approval UI](https://docs.copilotkit.ai/langgraph-typescript/human-in-the-loop/governed-actions)
defines a serializable action envelope with `id`, `summary`, `tool`,
`reference`, `verdict`, and exact `arguments`. Its example approval response
returns `approved`, `actionId`, and `reference`, and the example handler checks
the approval plus matching ID/reference before calling
`executeSideEffect(action.tool, action.arguments)`. The guide recommends
server-side policy checks, stable IDs/references, showing exact arguments, and
logging proposal/decision/result. [Pausing the Agent for Input](https://docs.copilotkit.ai/langgraph-typescript/human-in-the-loop/useInterrupt)
says `resolve(...)` round-trips its payload to the agent and explicitly says
`responseSchema` is surfaced for the UI but does not validate `resolve`
payloads; validation is the agent's responsibility on resume.

**Verified mechanism.** CopilotKit distinguishes an LLM-initiated approval tool
from a graph-enforced interrupt. Its governed-action example gives a useful
application-level correlation pattern: the UI displays the proposal and sends
back an approval tied to the action ID and policy/reference, while the resumed
backend rechecks that correlation before invoking the effect.

**What is and is not guaranteed.** The official material provides a recommended
envelope and example handler, plus a warning that interrupt response payloads
are not client-validated. It does **not** guarantee that approval is bound to
an immutable/current argument payload, that the payload cannot be changed
between display and execution, or that approval and a backend/Matter commit are
one atomic transaction. It also does not provide a CourtWork DecisionReceipt or
commit protocol. Those are explicit gaps for SE.

**CourtWork implication.** Reuse the distinction between agent-requested
approval and runtime-enforced authority, and the correlation fields as a
starting shape. For a consequential SE operation, CourtWork must define its
own durable proposal snapshot/version or digest, revalidate policy and
authorization on the backend, bind the decision receipt to that exact proposal
and Matter/work revision, and make the commit boundary explicit. A UI
`resolve` response alone cannot establish those guarantees.

## Intake disposition

| Reference | Use | Direct dependency decision |
|---|---|---|
| assistant-ui | Runtime/headless layering and generic thread interaction reference | No React migration follows from this review; keep any integration behind an adapter. |
| Vercel AI Elements | Source-owned component delivery and interaction anatomy | Copy/adapt only after local DOM, token, dependency, and contract review. |
| CopilotKit | Reuse the approval-versus-interrupt distinction and correlation pattern | Do not treat its example as a commit gate; CourtWork owns payload binding and commit authority. |

The report records mechanisms only. Reusing a mechanism or source-delivery
pattern does not select or install a dependency.

