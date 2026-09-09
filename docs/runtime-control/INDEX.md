# Runtime Control Plane Index

Status: backend implementation, protocol v1, 2026-09-08. Base: `b26670c` on the existing Pi runtime. Frontend integration is a separate step. This index is the entry point for runtime resources, authority, adapters, acceptance evidence, and the future frontend contract.

- [Architecture and compatibility](architecture.md)
- [HTTP contract and examples](api.md)
- [Source intake and borrowing boundaries](sources.md)
- [Search source investigation](search-reference.md)
- [Acceptance and frontend handoff](acceptance.md)
- [Independent Luna backend review](backend-review.md)
- [Runtime R2 local source parser](source-resolver.md) — backend parser only, no HTTP/UI/tool entry
- [Typed control contract](../../app/runtime/control-contract.d.ts)

## Resource coverage

“Available” means the described host adapter exists. It does not mean arbitrary third-party packages or every transport can be installed.

| Kind | Implemented behavior | Remaining boundary |
|---|---|---|
| tool | Native/domain/MCP catalog, exposure and execution policy | No arbitrary executable import |
| mcp_server | Explicit connect/disconnect/restart, tool discovery/calls, remote provenance | Streamable HTTP only; no OAuth or stdio; resources/prompts catalog only |
| skill | Frontmatter validation, metadata catalog, explicit body load | No scripts, bundled asset loader or package discovery |
| plugin | Existing trusted extension registry/lifecycle and bindings | No third-party code sandbox or package installer |
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

Installed, running, exposed, and permitted are separate dimensions. Scope and provenance explain how a value was obtained; the executor always checks the bound policy. Profiles and skills cannot raise host authority. Canonical work state remains with the domain extension/system of record, execution remains with Pi AgentSession, and configuration remains with the host control plane.

Changes bind at the next new Run. Idempotent retries return the original receipt and original binding. Configuration and connection mutations are frozen during active Runs and serialized with admission. Runtime state now upgrades validated schema 3/4 to schema 5 with an exclusive exact-byte backup; older hosts reject it. See [persistence](architecture.md#persistence-upgrade) and [async read tasks](../../app/docs/async-tasks.md).
