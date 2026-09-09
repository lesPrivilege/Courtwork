# Attention · global agent and Runtime composition

2026-09-10 · Astra architecture/implementation. Base `444f80d`, then intake `405ad76`. This is the current construction decision following the user's successive corrections, not a second Fresh development line. [Current](../../current.md), [construction handoff](../home-composition-2026-09-10/construction-handoff.md), [implementation contract](../../../app/docs/attention-agent.md), [evidence](../../../evidence/attention-agent-20260910/README.md).

## Product identity and ownership

Attention is the user's single resident global assistant. It can have multiple conversations; uniqueness belongs to the role and its configuration, not to a single eternal transcript or a process that must always run. Chat is its conversational presentation. There is no parallel bare Chatbot product. “Attention is all you need!” is a quiet empty-state Easter egg, not persistent chrome or a capability claim.

Attention and Matter Experts use the same Runtime composition mechanism. Attention has broad coordination scope; an Expert is a reusable configuration and professional contract applied to particular work. A Matter is the work object, not an agent configuration. Higher coordination scope does not bypass user policy, credential ownership, disclosure, tool admission or formal review. Expert profiles can omit plugins/context/tools they do not need. Saving a profile is not installing a plugin or certifying a Work Expert.

The frontend remains one shell with a permanent Attention entry and existing project/work entrances. No separate Experts navigation is added. Developer Runtime gets a shared packaging UI; a dedicated Expert library/navigation waits for multiple actual consumers. Configuration and work are deliberately different objects.

## Actual implementation slices

| Slice | Owned change | Boundary |
|---|---|---|
| AG-1 global conversation | RuntimeStore 6 adds explicit Session `scope:global/project`. Global means `projectId:null`, no Matter binding. Run, event, cancellation and permission owners are reused. | No sentinel project, no new execution loop, no nullable Core Matter migration. |
| AG-2 singleton configuration | Existing Runtime composition applies user → Attention (`agent:attention`) → session to global conversations; project conversations retain user → workspace → session. Same imported profile schema/editor. | Agent scope is writable only for `attention` and only from a global conversation. A profile cannot make a project conversation global. |
| AG-3 progressive memory | Global tools discover retained conversation sources, then immutable message descriptors, then bounded exact text by Session/event/SHA. | First source only: retained user/assistant message projections. No synthetic memory extraction, tool-payload scraping, private credential reads, provider memory or complete-history claim. |
| AG-4 Attention items | Global agent chooses an explicit project, then existing Core v1 disclosure queries. Registry state remains in Core. | An empty visible set does not imply no items. Runtime cannot resolve/acknowledge via these read tools. |
| AG-5 conversation UI | Modal panel over existing work, its own draft/history/real Run view, tools, ask-user, permission, cancellation, full-conversation and Runtime entrances. | Close preserves work/drafts and does not cancel; history comes from backend; no fake replies, TPS or billing. |
| AG-6 profile packaging | Select actual capabilities/context, name/version and save through existing Runtime CAS. Select separately to activate. | Saves configuration only; no auto-selection, no new Expert owner or external plugin installation. |

## Memory and connectors, from first principles

“Full memory” is the set of authorized discoverable sources, not an ever-growing system prompt. Discovery metadata, source read, selected context, derived memory and formal work state have different lifecycles. Sources require owner identity/version, provenance, scope, availability and explicit missing/deleted states. Loading text records an actual tool event; a model's recollection is not a new fact. Source content and quoted research cannot override system instructions or grant permissions.

The shipped conversation source is the first real progressive provider, not BE-19's completed generalized memory system. Next sources include retained Matter/source/Decision records and external message/meeting records behind their existing owners. Their typed adapters must preserve original identity and availability; do not copy all records into a second ungoverned store. Memory retention, amendment, revocation and synthesized fact acceptance require explicit contracts before persistent writeback.

Plugins package capabilities; connectors connect real services; tools execute bounded actions. The current MCP adapter can provide explicitly configured/exposed unauthenticated Streamable HTTP tools, with host policy, cancellation and unknown-effect handling. It is not Gmail/GitHub/Calendar OAuth delivery. Those require connector authentication, source identity, progressive discovery/read and outbound effect receipts. Their existing offline human-loop fixtures remain fixtures. No external message or paid provider is authorized by this UI work.

Expert delegation is a subsequent execution contract: parent task identity, Matter/Contract version, exact input sources, capability ceiling, permissions, cancellation and output/result receipt must be bound. Expert output returns evidence/candidates; it does not inherit global authority or become formally accepted because Attention used it. Current profile selection/capability filtering is real; automatic multi-agent delegation is not claimed.

## Home design package consumption in construction

| Input | Current use / decision |
|---|---|
| Control / Sidebar / Selection | One stable glyph+text Attention entry; native conversation select, explicit commands; no Experts placeholder, current/focus/selected/run status kept distinct. |
| Runtime | Recorded provider/model and Run input/output with incomplete accounting. Tools/permissions have real receipts. No TPS, token-speed or cache partition invention. |
| Tabs | Conversation select changes real conversation identity; items are a separate inspection destination; no fake sibling Chat tabs. |
| Material | Solid reading panel with actual native dialog modality and smoke, existing tokens; no long-text blur or decorative animation. |
| Charts | Global Runs enter all-retained-work totals; project totals exclude global Runs. Captions corrected. Daily/model token charts still require their specific backend projections and are not fabricated. |
| Overlay | Native modal focus containment, explicit close/Escape and opener restoration; no outside-click draft discard. Runtime details are inline disclosure. |
| Glyph | Existing trusted Lucide renderer only. Semantic labels remain stable; no unreviewed MingCute migration or custom sparkle. |

[Verification](../../../evidence/attention-agent-20260910/README.md) separates author tests from non-author evidence. G1–G5, full connector/auth coverage, expert delegation, generalized memory, formal Attention maintenance actions and native AppKit acceptance remain separate gates.
