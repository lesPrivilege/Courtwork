# E1 → K3 backend requests

2026-09-22 · Claude (E1 frontend writer) to the K3 backend writer / parent Arch. Consumer: `app/web/agent-choice.mjs` + `app/web/agent-chooser-view.mjs` on branch `claude-role-composer-20260922`, against the [pinned E1 contract](../../../execution/claude-frontend-harness-2026-09-16/evidence/e1-backend-contract-20260922/README.md) (`76d91d6`). The frontend does not edit these backend-owned files.

| # | Request | Why | Frontend behaviour until then |
|---|---|---|---|
| R-1 | Add `"agent-choice.mjs"` and `"agent-chooser-view.mjs"` to the `/web/*` static allowlist in `app/server/index.mjs` (the `for (const name of [...])` list). | `app.mjs` imports both; without them the product page cannot load, and `tests/static-web-manifest.test.mjs` fails its two allowlist cases (observed: 4 pass / 2 fail on this branch). | Author browser proof runs on a **scratch copy** whose `server/index.mjs` is patched with exactly these two names; nothing is committed to the backend file. |
| R-2 | Advertise that `POST /sessions/:id/runs` checks `runtimeSelection`, e.g. `snapshot.compatibility.runtimeSelection: "expectation-v1"` in `GET /runtime-control`. Any explicit, versioned snapshot fact is fine; name it and E1 follows. | A Host without K3 rejects the unknown key (`assertKeys`), so the frontend must not send it blind; a label/version guess is not a capability. | `agent-choice.mjs` sends `runtimeSelection` only when `compatibility.runtimeSelection === "expectation-v1"`; otherwise the Send body is the legacy `{input, commandId}` and the chooser still selects through the existing `operation:'profile'` CAS write. |
| R-3 (confirm, no change expected) | `sessionScope.kind` (`chat` / `global`) stays in the snapshot. | The chooser is offered for ordinary Chats only; it hides for the global Attention Session so a Role label cannot move a Chat. | Hidden when `sessionScope.kind === "global"` or Attention is open. |

Unresolved UI obligations the frontend keeps (not asking backend to fabricate): Home before a Session exists shows no chooser (the contract requires a real Session before selection is persisted); a recorded Run's binding (`GET /runs/:id` `kitBinding`, `GET /runtime-context?runId=`) is not yet surfaced by the chooser.

## Disposition — 2026-09-23 (parent E1 review)

R-1 adopted: the two exact entries are added to `app/server/index.mjs` **by the frontend owner**, atomically with their files, under the parent's narrow exception. R-2 adopted and on main (`a59d188`): `compatibility.runtimeSelection: "expectation-v1"`. R-3 corrected: Session scope values are kept verbatim; `project` is an ordinary Chat. Only `global` (and the Attention surface, and no Session) excludes the chooser, via `session.scope` and the current Session's own read.
