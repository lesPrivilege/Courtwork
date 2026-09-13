# Optional workspace chats · BE-23 / DWB-05

The Home composer accepts a first message without a Project or a title form. Its
left controls independently manage draft attachments and an optional workspace
(Project organization). Projects and Recent are peer sidebar sections, with
Projects first. Recent includes ordinary project and unassigned conversations;
global Attention keeps its separate entry and history. A selected workspace is
an organization choice, not an external directory or a file access grant.

## Identity and persistence

`POST /sessions` accepts an omitted or null `projectId` and creates
`scope: "unassigned", projectId: null`. An explicit existing Project creates
`scope: "project"`. It never creates global Attention. The dedicated
`POST /attention/conversations` keeps its existing replayable global identity.
An optional client-assigned UUID v4 `sessionId` makes creation replayable. Replaying the same ID and organization returns the existing Session without changing its title, permissions or binding; a different scope/Project conflicts. Client-supplied scope and unsupported fields remain rejected. Every HTTP-created
Session has a nonempty managed workspace at `workspaces/<sessionId>`.

RuntimeStore **14** validates old schemas 3–13 before exclusive byte-for-byte
backup and atomic upgrade. v13→v14 preserves Session/Run IDs, workspace paths,
model capabilities, provider configuration epoch and verification records; the
older model-capability upgrade behavior remains for v12 and earlier. Old hosts
reject v14. Restoring a backup requires a separate data directory and matching
host. Core/app database schemas are unchanged.

An unassigned Chat resolves user and its own Session configuration. It inherits
neither a workspace layer nor the Attention agent layer. It has the ordinary
model and workspace-tool pipeline, with independently managed sources, artifacts,
drafts and Pi history. Matter binding and the existing project-owned async read
adapters require a project conversation; choosing nothing does not widen them.
An unassigned coordination Thread additionally captures `sessionId` in its scope,
so unrelated null-project conversations cannot join or discover each other's
Threads through ordinary runtime tools. Human and global Attention capabilities
remain subject to their existing contracts.

## Creation, recovery and attachments

The first message supplies the default title (first line, at most 100 characters).
Existing rename remains available. New chat starts from Home with only explicitly
passed project context; it does not select the previous or first Project.
The single Home draft is retained rather than silently discarded during navigation.
After creation, the UI cannot relocate a Session by changing its label.

Draft text, optional Project and staged text attachments stay in tab-local
sessionStorage when available. File staging creates no Session or Run. The
existing text-material contract applies: UTF-8, owner-valid filenames, at most
1 MB per request; draft attachments are bounded to 4 MB total. Files are retained
through the existing idempotent material command before Run admission. Each
upload keeps its command ID through a lost receipt; an uncertain attempted
upload cannot be removed as though nothing was saved. No new file-permission or
external-folder mechanism is added. Attention stages attachments per conversation
in page memory, matching its existing unsent draft lifetime.

A failed create keeps the draft and requested organization. An uncertain create
keeps its exact client-assigned Session ID. Refresh reconciles the real list; a
subsequent send resumes that Session or retries the same identity, never a new ID. A confirmed Session is kept on later
upload/draft failures and resumed without creating another Session. Run submission
continues through the existing command ID, draft revision and admission guards.

Existing chats and reloads select by Session ID, using the fetched identity for
Project context; no Project is needed to restore an unassigned or Attention
conversation. An explicit Settings deep link keeps precedence over restoring Chat.

## Activity and presentation

`GET /sessions` returns `recordedActivityAt`: the maximum of creation and its
recorded Run start/end timestamps, sorted descending with Session ID ascending
as the tie-breaker. It does not claim visit time or activity from untimestamped
stream events. Work-summary items now also carry explicit Session `scope`, so
null Project is not mislabeled as Attention. Missing scope remains unknown.

Workspace choice uses existing anchorPopover positioning and native popover
behavior; options are buttons with pressed state. Escape returns focus to the
originating attachment/workspace control, and full workspace names remain in
accessible labels when visible text truncates. The nearest implemented precedents
are Home draft/Run admission in `web/app.mjs`, retained-source commands in
`web/materials-view.mjs`, `ui-controls.mjs` anchorPopover and the existing sidebar
Project rows. Review projections and formal actions retain their original owner.

Verification and source identity: [delivery evidence](../../evidence/projectless-chat-20260913/README.md).
