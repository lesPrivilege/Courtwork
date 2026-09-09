# Global Attention conversations · schema 1 API / RuntimeStore 6

Attention is one global product role with multiple conversations. Session remains the conversation owner and Run the execution owner. The global role is not a project, Matter, imported profile or second agent loop. [Architecture and PR slices](../../engineering/design/attention-agent-2026-09-10/README.md).

## Identity and persistence

Every stored Session now has `scope:'project'|'global'`. Project Sessions require an existing `projectId`; global Sessions require `projectId:null` and `extensionBinding:null`. Scope is immutable. Global Sessions cannot bind Matter extensions. Their workspace remains a distinct directory per Session; global coordination does not expose arbitrary filesystem paths.

`GET /api/v5/attention/conversations` returns `{schemaVersion:1,scope:'global',sessions:[...]}` using actual retained global Sessions, ordered newest creation first. It is not a synthetic recent-history list.

`POST /api/v5/attention/conversations` accepts exactly `{conversationId:<UUID-v4>}`. Creation is idempotent by that identity. Repeating the identity returns the existing global Session and preserves title, draft, permissions and host history; a project identity conflicts. New conversations start with `permissionMode:'ask'`. This endpoint makes no Run, provider call or Matter. Client retries must reuse the same ID.

Existing `/sessions/:id`, draft, Run/event/question/cancel, provider and workspace routes remain the owners. Run replay still requires identical `commandId` and input. Global and project Runs share the host's existing one-active-Run admission; an Attention panel cannot silently cancel another Run. Closing the panel stops its polling only. Unknown receipts retain the exact command for retry/reconciliation.

RuntimeStore 3/4/5 are strictly validated against their original shapes, backed up byte-for-byte through an exclusive mode-0600 file, and atomically upgraded to 6. Existing Sessions gain `scope:'project'`; existing Runs/events/async records and historical Runtime bindings are preserved. Older hosts reject 6. Restore exact backups in a separate directory with the matching host. No personal data is upgraded by development validation.

## Runtime composition and authority

Global configuration scopes are user/local → agent/attention → session/id. Project scopes remain user/local → workspace/project → session/id. The shared Attention layer customizes the one resident role across future Runs of all its conversations. It is not an arbitrary agent impersonation endpoint. The service only accepts a mutation target present in the selected Session's returned scope chain. `agent:general` remains the unrestricted built-in profile; its global display title is Attention default. An imported profile can restrict the actual tools/context in either role, but cannot add a missing role capability, enable a plugin, relax a host policy or change Session scope.

The exact Session scope is captured in `runtime.bound`; new Runtime binding hashes include scope. Old bindings are read unchanged. Attention-specific tools exist only for global Sessions. Project-only async task protocol remains unavailable to global Sessions until a separately versioned origin contract exists. User-scoped MCP, tools, instructions, skills and references use the existing owner, policy and between-Run configuration rules.

## Progressive source tools

- `attention_projects`: bounded project directory; source identity only.
- `attention_list(project_id,offset?,limit?)`: existing Core Attention registry, under runtime actor, captured global Session/Run and explicit target project.
- `attention_inspect(project_id,attention_id,expected_revision?)`: existing disclosure-filtered detail. No human action or grant setter is exposed to the model.
- `memory_list(offset?,limit?,session_id?)`: without Session, retained conversation source metadata; with Session, user/assistant message identities (event sequence, role, character count, SHA-256). Limit 1–50. No drafts, tool payloads or synthesized facts.
- `memory_read(session_id,event_seq,sha256,offset?,limit?)`: exact retained message text, max 16,000 UTF-16 units/page, with nextOffset and authority `historical-statement`. Missing/deleted sources or mismatched hash refuse; no current-file substitution. Concatenating pages reconstructs the original string. Historical coverage is explicitly unknown.

All executors pass the existing `governTools` boundary, exposure/profile/policy checks, cancellation and bound-argument handling. Model arguments cannot select actor or execution identity. Item disclosure remains project-local Core v1, scoped to the actual runtime adapter and `attention-runtime` purpose. Global discovery does not grant access to every Attention item. Memory source text is historical conversation evidence, not current permission or formal acceptance. The global memory tool exposes retained conversations of this local user, and can be disabled in the shared Attention or Session configuration.

Generalized memory providers, synthesized memory persistence, source-level revocation across copied transcripts, authenticated email/GitHub/calendar connectors, global scheduler and Expert delegation are not delivered by these tools. MCP resources/prompts remain catalog-only under the existing connector contract.

## UI and packaging

One permanent Attention navigation entry opens the real conversation panel over underlying work. Native dialog modality manages inert background/Tab; close and Escape restore the opener. Unsent panel drafts remain local to the page and survive close/reopen/conversation switching; reload clears them. Sent messages and history are backend records. The existing Home/Session composer is independent. Attention items open the separate Core registry inspection surface; opening it never acknowledges/resolves an item.

Developer Runtime can package selected actual capabilities/context as an existing `agent_profile` source with ID/name/version, current profile rules and declared UI slots. Wider policies remain live. Saving uses CAS, is not automatic profile selection and never publishes a verified Expert. Missing resources make a profile incompatible when applied elsewhere. The Attention scope provides development customization; no additional Experts sidebar is installed.

Recorded Activity/Usage without project filter includes all retained Sessions, including global Attention. A specified project includes only that project's Sessions. In metrics DTOs `scope.projectId:null` still means the unfiltered aggregate, never a new global-only query. Summary rows with `projectId:null` describe a global Session and the UI labels them Global Attention. Reported Run usage is not billing or decode TPS; cache is not added as a disjoint partition.
