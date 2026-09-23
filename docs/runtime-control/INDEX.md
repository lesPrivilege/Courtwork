# Runtime Control Plane Index

Selected-profile editing (2026-09-24): [accepted K5](../../engineering/execution/claude-frontend-harness-2026-09-16/evidence/kit-profile-editor-final-20260924/README.md) connects an existing Chat's selected imported source to K4 preview and the existing CAS save in Settings. Source scope is retained; preview neither persists nor grants permission, and existing Run context stays unchanged. Structured creation/acquisition and live alternate runtime configuration remain separate.

Runtime resources, permissions, context, model connections and MCP are composed by the local Host and presented in Settings and Work. This index links the current contracts; delivery history is recorded in [engineering/current](../../engineering/current.md). The original backend baseline was `b26670c`; historical reviews below retain that scope.

- [Architecture and compatibility](architecture.md)
- [HTTP contract and examples](api.md)
- [Source intake and borrowing boundaries](sources.md)
- [Search source investigation](search-reference.md)
- [Acceptance and frontend handoff](acceptance.md)
- [Independent Luna backend review](backend-review.md)
- [Runtime R2 source inspection](source-resolver.md) — pure parser and authenticated inspect-only HTTP seam; no UI/model tool or locator acquisition
- [Developer control panel intake](../../engineering/research/developer-control-panel-2026-09-13/README.md) — source review and adapter follow-up; not an implementation claim
- [Developer intake implementation](../../engineering/design/developer-control-panel-2026-09-13/README.md) — MCP/Skill forms, explicitly trusted local CW package acquisition and native object SVGs
- [Typed control contract](../../app/runtime/control-contract.d.ts)

## Resource coverage

“Available” means the described host adapter exists. It does not mean arbitrary third-party packages or every transport can be installed.

| Kind | Implemented behavior | Remaining boundary |
|---|---|---|
| tool | Native/domain/MCP catalog, exposure and execution policy | No arbitrary executable import |
| mcp_server | UI configuration intake/edit, explicit connect/disconnect/restart, tool discovery/calls, remote provenance | Streamable HTTP only; no OAuth or stdio; resources/prompts catalog only |
| skill | SKILL.md paste/file/root-directory intake, frontmatter validation, metadata catalog, explicit body load | No scripts, bundled asset loader or package discovery |
| plugin | Reviewed local CW package registration, trusted extension registry/lifecycle and bindings | No sandbox, dependency installer, custom renderer or package update/removal |
| instruction | Scoped text, next-run admission, pinned historical source | No repository file discovery |
| prompt_template | Human invocation returning a draft | No automatic model invocation |
| memory_provider | Adapter-required marker | Persistence/retrieval provider not implemented |
| reference | Metadata first, explicit content load | No external retrieval adapter |
| agent_profile | Versioned resource composition, restrictive policy, UI-slot declarations | No profile-owned execution authority or renderer |
| workflow | Adapter-required marker | Workflow runner not implemented |
| hook | Adapter-required marker | Executable hooks not implemented |
| provider | Existing provider configuration/lifecycle projection | Existing provider support applies |
| model | Existing selected-model projection | Existing model support applies |
| permission_policy | Scoped rules, exact-call ask, execution enforcement and trace | No organization identity/ACL service |
| secret | Credential status projection; existing credential API | No generic secret vault |
| sandbox | Current workspace boundary projection | No OS/process isolation |
| registry | Adapter-required marker | Package resolution and signing not implemented |
| session_context | Effective next-run context, historical binding and explicit load events | No reconstructed exact token estimate |

## Invariants

Installed, running, exposed, and permitted are separate dimensions. Scope and provenance explain how a value was obtained; the executor always checks the bound policy. Profiles and skills cannot raise host authority. Canonical work state remains with the shared Work Core, execution remains with Pi AgentSession, and configuration remains with the host control plane.

Changes bind at the next new Run. Idempotent retries return the original receipt and original binding. Configuration and connection mutations are frozen during active Runs and serialized with admission. Runtime state now upgrades validated schema 3/4 to schema 5 with an exclusive exact-byte backup; older hosts reject it. See [persistence](architecture.md#persistence-upgrade) and [async read tasks](../../app/docs/async-tasks.md).
