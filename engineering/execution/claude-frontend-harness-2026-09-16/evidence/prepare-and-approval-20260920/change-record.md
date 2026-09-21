# UI 局部变更记录 · prepare before inference, approval identity

Filled per [change-template](../../../../design/agent-interface-2026-09-10/change-template.md).

```text
Task / scope:
  The two consumers the owner disposition adopted after 06b: (A) explicitly
  prepare a Chat, its folder binding and a private candidate before inference;
  (B) show the candidate identity and recorded write revision in write/check
  approval details. Nothing else. Non-approval tool arguments deliberately
  untouched.

Base SHA / branch / isolated checkout:
  962046d (accepted main, 06b merged)
  branch claude-prepare-and-approval-20260920
  /Users/lesprivilege/Projects/.worktrees/courtwork-prepare-approval-20260920
  The persistent main checkout (which serves preview 8899) was read, never
  written; nothing pushed or deployed.

Writer / reviewer:
  Writer: Claude (Opus 5), sole writer on this tree.
  Reviewer: not this author. Released for Luna's non-author review.

Owner fact + contract:
  Host stays the authority throughout. (A) uses three existing commands with no
  new route: POST /sessions, PUT /sessions/:id/repository-binding, PUT
  /sessions/:id/repository-candidate, with GET /repositories/inspect for the
  base commit and GET /sessions/:id as the only source of what was recorded.
  #changeRepositoryCandidate asks for an active binding, no active Run and a
  real base commit; it has never asked that a Run happened, which is why this
  needs no backend work. (B) reads only the permission.open payload the Host
  recorded: candidateId, candidateRevision (repo_write only),
  candidateWriteRevision, spread into the request by control-tools.mjs
  governTools from each tool's permissionContext.

Semantic / projection / control / placement:
  Semantic — a prepared Chat is a real Session with no Run, not a draft and not
    a failed send; the two are kept apart in state, in the status line and in
    the New-chat refusal. Requested ≠ recorded ≠ current: the approval reading
    is the recorded one and never the live candidate.
  Projection — approvalCandidate(payload) is pure and touches nothing but the
    payload; a non-integer or missing revision becomes null, a recorded 0 stays
    0. prepareChat creates no fact: every value it keeps came from a receipt or
    a Session read-back.
  Control — no new control kind. The Home card reuses the existing Edits
    section and the existing start-edits field, so the 06b focus chain carries
    it. The approval reading reuses `.data-list`, the same shape the card and
    the runtime detail already use for a reading.
  Placement — preparation stays on the Workspace card where the folder already
    is; the approval reading stays inside the disclosure that already existed
    for the hash, on the open request and on the decided record.

Affected UX rule IDs / persistent text purpose / disclosure level:
  UX-01 — two new persistent sentences, each load-bearing: the one at the
    preparation control says what pressing it creates and that nothing is sent;
    the one under the recorded identity says it is as-recorded, without which a
    reader would take it for a live reading.
  UX-02 — the identity sits inside the details disclosure, not on the card
    face: it is needed to check a decision, not to make the ordinary one.
  UX-04 — the prepared state is reported where the action was taken (the Home
    status line), with data-error="false"; it does not reuse the failed-send
    error styling or its words.
  UX-05 — "prepared" and "sent" are separate states and are said separately;
    a prepared chat never implies a Run.
  UX-06 — preparing creates a Chat, which is recoverable (it is in Recent and
    deletable), so it is a sentence at the control rather than a confirmation
    dialog.

Action result / feedback / recovery / draft and scope identity:
  Each identity is persisted before its command goes out, so a lost reply
  replays: one chat, one binding, one candidate in every drop case. A
  preparation that stopped half way finishes the missing part. The Home draft
  and materials are never spent by preparing; the next send reuses the prepared
  Chat and issues no create/bind/candidate. An unconfirmed create keeps the
  existing Check-status recovery. Folder commands issued from a prepared chat's
  card update the marker and the composer strip together, so the strip cannot
  keep naming a folder that was just disconnected.

Nearest precedent: repository path + symbol + evidence + fixed SHA
  app/web/app.mjs · submitHomeRun — the client-chosen sessionId, the persisted
    creation marker written before the POST, and one reused bindRequestId.
    Accepted with 06b at f5b3752; the candidate is the third step it never
    needed.
  app/web/workspace-card.mjs · FOCUS_CHAIN / startCandidate — the Edits section
    and the focus destination, accepted at d4a433d; reused unchanged.
  app/web/settings-view.mjs · settingsRow, app/web/runtime-view.mjs detail
    `.data-list` — the reading shape for term/value pairs.
  app/web/thread-projection.mjs · permissionPresentation — the pure approval
    projection this extends.

Evidence type: implemented precedent (all four).
Governance status: canonical within 06b's accepted scope for the card and the
  Home start marker; the Host routes are canonical contracts.

Kept relationships:
  No new control kind, token, colour, icon, material, z-index or dependency.
  The approval card's anatomy, its decision controls, the execution disclosure
  and what it collapses are all unchanged. The Home composer, its send guard
  and its recovery banner keep their existing behaviour for an ordinary send.
  workspace-card.mjs still owns no session lifecycle: it calls an injected
  owner and draws nothing when there is none.

Intentional changes:
  1. Home offers preparation when a folder is staged, and Home's Workspace card
     then reads the prepared Session rather than the draft.
  2. The Home start marker gains prepared/candidateRequestId/candidateId, all
     persisted.
  3. The status line and the New-chat refusal distinguish a prepared chat from
     a half-failed send.
  4. Approval details carry the recorded candidate identity, on the open
     request and on the decided record.

New terms / roles / tokens / primitives / dependencies:
  One new module (home-preparation.mjs) and one new exported projection
  (approvalCandidate). Three new reading labels: Private candidate, Candidate
  revision, Write revision — all the Host's own field semantics. No new token,
  class, colour, icon or dependency.

Reuse / variant / grammar gap decision: reuse throughout; no grammar gap
  claimed or proposed.

Skin / review / deterministic semantic color impact: none.

Exceptions: none.

Fixture and setup command (synthetic; no personal data):
  node app/scripts/prepare-coding-dogfood.mjs --root <instance>
  node app/server/index.mjs --data-dir <instance>/runtime-data --port 8916
  Local test provider; no key; synthetic Git source outside the repository.

Affected scene + nearest adjacent scene + full composition:
  Home with a staged folder, the Workspace card on Home, the Home status line;
  adjacent: the composer strip, Recent, the New-chat control; the approval card
  and the decided record inside a Run; full composition: stage → prepare →
  reload → send → approve → check → deny → stop/start candidate → re-read.

Viewport / scheme / keyboard / failure / zoom / fallback coverage:
  1280x900 light, 375x812 dark. Keyboard: focus measured across the preparation
  command (dropped to BODY by the platform, restored to Review changes).
  Failure/empty: no folder, no Git commit, mismatched create receipt, a reply
  lost after each of the three commands, preparing twice, a half-done
  preparation. NOT covered: 200% native zoom, screen reader, forced-colors.

Checks: exact command, exit/result, output/evidence path; not-run and reason
  See checks.txt. 12 new tests; 69/69 across eight owner suites; four lints ok;
  full suite 1302 pass / 0 fail.

Visual change: before/after at fixed SHA; candidate baseline paths
  Before: at 962046d the Home card has no Edits section, and approval details
  hold only the hash and its copy action. After: browser/journey.md §1, §4, §5
  and browser/approval-identity.json, as verbatim DOM captures. No candidate
  baseline image is offered and none is proposed as golden.

Author checks: as above, all by this author on this tree.
Independent review: not run. Released for Luna's non-author review.
Remaining work / accepted-baseline decision:
  Non-approval tool arguments remain a Runtime/Host contract gap, untouched by
  this batch. A prepared chat is not retitled by a later first message, by
  choice. No accepted baseline is claimed by this delivery.
```
