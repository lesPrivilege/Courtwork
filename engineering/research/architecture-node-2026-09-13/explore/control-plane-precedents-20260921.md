# Control-plane precedents: bounded first-party verification

Date: 2026-09-21
Scope: OpenHands Agent Canvas/ACP, AgentTeams, and Microsoft Magentic-UI. No installs, code changes, provider calls, credentials, or local runtime changes.

## Sources and revisions

| Project | First-party source | `main` revision checked | Status |
|---|---|---:|---|
| OpenHands product | https://github.com/OpenHands/docs/blob/450c8a64cd81f371a0cf930358fc185448005ee4/openhands/usage/agent-canvas/overview.mdx | `450c8a64cd81f371a0cf930358fc185448005ee4` (`OpenHands/docs`) | current product documentation |
| OpenHands ACP integration | https://github.com/OpenHands/docs/blob/450c8a64cd81f371a0cf930358fc185448005ee4/openhands/usage/agent-canvas/acp-agents.mdx and https://github.com/OpenHands/OpenHands/blob/a5eb10d584f4dfbc6ac0fd7043c5b73bc0fa9f8e/docs/ACP_AGENTS.md | docs `450c8a64`; app `a5eb10d584f4dfbc6ac0fd7043c5b73bc0fa9f8e` | implemented/documented Canvas integration; live provider behavior not independently run |
| AgentTeams | https://github.com/agentscope-ai/AgentTeams/blob/018834059d7d92748c26d8cfb002c2fe57a43aaf/docs/overview.md and https://github.com/agentscope-ai/AgentTeams/blob/018834059d7d92748c26d8cfb002c2fe57a43aaf/docs/design/architecture.md | `018834059d7d92748c26d8cfb002c2fe57a43aaf` | current project docs and repository; claims below are docs/source claims, not a local deployment test |
| Magentic-UI / MagenticLite | https://github.com/microsoft/magentic-ui/blob/d3c9d13c39288257286a66daabf7c5b5fb72ee69/README.md and https://www.microsoft.com/en-us/research/blog/magentic-ui-an-experimental-human-centered-web-agent/ | `d3c9d13c39288257286a66daabf7c5b5fb72ee69` | open-source research/product prototype; current main describes MagenticLite as the next generation |

The name “AgentTeams” is ambiguous. The authoritative source checked here is `agentscope-ai/AgentTeams`; `docs.agentteams.live`, `agentteams.com`, `agentteams.online`, and unrelated GitHub projects were not treated as evidence.

## Verified claims

### OpenHands Agent Canvas and ACP

The Agent Canvas overview describes a browser control surface whose selected backend owns conversations, tools, settings and persistent state. It distinguishes Browser UI, Backend, Workspace, and Agent/model, and says switching backends switches the execution environment. A conversation belongs to one active backend and has its own history, agent configuration and backend-managed state. Source: [Agent Canvas overview](https://github.com/OpenHands/docs/blob/450c8a64cd81f371a0cf930358fc185448005ee4/openhands/usage/agent-canvas/overview.mdx) and its conversation/workspace isolation section.

The ACP guide documents an implemented integration path: the Agent Server launches an external ACP CLI subprocess over JSON-RPC on stdio, while the external agent owns its LLM, tools and execution. The Agent Server owns the subprocess and credentials; Canvas stores agent settings and renders the configuration surface. It names Claude Code, Codex and Gemini CLI presets and supports custom stdio ACP servers. Source: [ACP guide](https://github.com/OpenHands/docs/blob/450c8a64cd81f371a0cf930358fc185448005ee4/openhands/usage/agent-canvas/acp-agents.mdx).

The guide also documents an important identity/configuration boundary: changing Agent/Model in Settings applies to conversations started afterward; a running conversation keeps the agent it started with. Source: [ACP switching](https://github.com/OpenHands/docs/blob/450c8a64cd81f371a0cf930358fc185448005ee4/openhands/usage/agent-canvas/acp-agents.mdx). The OpenHands source documentation independently says Canvas only sends secrets and the SDK handles credential materialization, and records a current limitation around per-conversation ACP data-directory isolation. Source: [OpenHands ACP implementation notes](https://github.com/OpenHands/OpenHands/blob/a5eb10d584f4dfbc6ac0fd7043c5b73bc0fa9f8e/docs/ACP_AGENTS.md).

These are implemented/documented product boundaries. They do not prove every provider preset works, nor do they establish ACP protocol semantics beyond the OpenHands integration.

### AgentTeams

The checked AgentTeams repository describes a human-in-the-loop multi-agent system centered on Matrix rooms. A Manager creates/organizes Workers and Teams, tracks progress, and consolidates results; a controller manages Worker, Manager, Team and Human lifecycles. Higress is the gateway for model/MCP traffic, identity and access control, while object storage holds configuration, shared task context and artifacts. Source: [AgentTeams overview](https://github.com/agentscope-ai/AgentTeams/blob/018834059d7d92748c26d8cfb002c2fe57a43aaf/docs/overview.md).

Its architecture document describes a multi-container control plane: controller/API and reconcilers, Matrix/Tuwunel communication, Higress gateway, MinIO/object storage, and separate Manager/Worker runtimes. Source: [AgentTeams architecture](https://github.com/agentscope-ai/AgentTeams/blob/018834059d7d92748c26d8cfb002c2fe57a43aaf/docs/design/architecture.md) and its component relationship section.

The overview lists Manager and Worker runtime choices including OpenClaw, CoPaw/QwenPaw and Hermes. The architecture document names `agentteams-hermes-worker` and an experimental `agentteams-deepseek-harness-worker` image. The repository README release notes call the DeepSeek Harness Worker experimental. These are AgentTeams repository/documentation claims; I did not build images, inspect their code paths, or run a Worker. Source: [runtime list](https://github.com/agentscope-ai/AgentTeams/blob/018834059d7d92748c26d8cfb002c2fe57a43aaf/docs/overview.md), [runtime images](https://github.com/agentscope-ai/AgentTeams/blob/018834059d7d92748c26d8cfb002c2fe57a43aaf/docs/design/architecture.md), and [release notes](https://github.com/agentscope-ai/AgentTeams/tree/018834059d7d92748c26d8cfb002c2fe57a43aaf).

The same overview explicitly says a standalone agent is simpler when there is no need for role separation, shared task space or human oversight. That makes AgentTeams a control-plane/team precedent, not evidence for a universal single-agent runtime abstraction.

### Magentic-UI

Microsoft’s research source calls Magentic-UI an experimental human-centered web-agent research prototype. It documents collaborative planning, collaborative execution/co-tasking, action guards, and plan learning, with browser interaction, code execution and file understanding. Source: [Microsoft Research description](https://www.microsoft.com/en-us/research/blog/magentic-ui-an-experimental-human-centered-web-agent/).

The current repository README says MagenticLite is the next generation of Magentic-UI, with an orchestrator model and browser-use model, user steering/approval/takeover, and a lightweight VM sandbox. It is a current open-source application repository, but the research framing and the README’s prototype/limitations context mean it should be treated as an experimental product precedent rather than a stable runtime contract. Source: [Magentic-UI README](https://github.com/microsoft/magentic-ui/blob/d3c9d13c39288257286a66daabf7c5b5fb72ee69/README.md).

## Claims not established

- No source here proves that OpenHands ACP, AgentTeams, and Magentic-UI share an adapter or identity model.
- No source here proves Hermes is an OpenHands Canvas runtime. Hermes appears in the AgentTeams Worker runtime list.
- DeepSeek Harness Worker is documented by AgentTeams as experimental; that is not a stable runtime guarantee or evidence of a CourtWork-compatible adapter.
- Magentic-UI’s human-in-the-loop features do not establish a general approval/effect ledger contract; its “action guards” are a product feature in a research prototype.
- AgentTeams’ Matrix/object-storage/controller architecture is not evidence that CourtWork should adopt Matrix, Kubernetes, MinIO, or a second control plane.
- No source inspection or runtime execution was performed for the cited projects beyond reading the linked first-party pages and resolving repository `main` revisions.

## Adoption suggestions for CourtWork

1. Keep identity explicit across layers: stable CW Chat/Run identity, selected backend/runtime identity, model identity, workspace boundary, and native adapter binding should remain separate. OpenHands’ Browser UI → Backend → Conversation → Workspace decomposition is a useful naming precedent.
2. Keep native adapters responsible for their own process/session and credential mechanics. Canvas configures an ACP backend, while the Agent Server owns subprocesses and secrets. This supports CW’s existing Host-owned admission, tool governance and effect settlement.
3. Treat task/artifact presentation as a projection of durable facts. AgentTeams’ visible Matrix rooms and shared artifacts suggest an inspectable task stream; Magentic-UI’s plan/co-task/action-guard sequence suggests explicit user intervention points. Neither justifies a new authority store or automatic approval semantics in CW.
4. Preserve status labels: “implemented/documented,” “experimental,” and “unverified” should remain distinct. In particular, keep Hermes/DeepSeek Harness claims scoped to AgentTeams documentation and do not advertise them as CW runtime capabilities.
