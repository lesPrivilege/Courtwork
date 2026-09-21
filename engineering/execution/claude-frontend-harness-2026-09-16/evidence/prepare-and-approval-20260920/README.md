# Prepare before inference · approval identity · one bounded source candidate

2026-09-20 · Claude, author. Branch `claude-prepare-and-approval-20260920` from
accepted main `962046d`, in its own worktree. Builds the two consumers the
[owner disposition](../../06b-dogfood-friction-20260920.md#astra-exploration-disposition--2026-09-20)
adopted and nothing else. **Not accepted:** an author delivery, released for
Luna's non-author review and Astra's integration decision.

## A · Preparing a Chat and a candidate before any inference

With a folder staged on Home, the Workspace card offers **Start private
candidate**. It runs the three Host commands that need no Run — create the
Chat, bind the folder, create the candidate from the folder's live HEAD — and
stops there. The Home draft and its materials are untouched, no message is
sent, and no model is called.

| | Evidence |
|---|---|
| Three commands, no `/runs` | the network capture in [journey.md §2](browser/journey.md), and a real-Host test asserting the prepared session's event list is `[]` |
| No second Chat on the next send | [journey.md §3](browser/journey.md): Send issued zero `POST /sessions`, zero binds, zero candidate creates, and admitted the Run in the prepared chat |
| A lost reply is replayed, never repeated | `tests/prepare-and-approval.test.mjs` drops the reply after each of the three commands has really landed, retries the persisted marker, and asserts one chat, one binding, one candidate |
| Draft and materials preserved | the composer still holds the typed task after preparing and after a full reload |
| Explicit lifecycle | the chat is in Recent under its own title; Home states it without error styling; "New chat" refuses and says why |

The sequence and its exactly-once identities live in a module of their own,
[home-preparation.mjs](../../../../../app/web/home-preparation.mjs): every
identity is minted once and persisted **before** the command that uses it goes
out, and each step is skipped when the Session read back says it is already
done — so a resumed preparation finishes the missing part rather than starting
over. That is the discipline `submitHomeRun` already used for the Chat and the
binding, extracted so it can be tested at its seam and extended to the third
step.

## B · What an approval says it was asked about

**Write details** and **Check details** now read the private candidate and the
revision the request was bound to, from the payload the Host recorded with it:

    Private candidate   9a8ab169-0c42-48c8-80fa-6c853349c92c
    Candidate revision  1
    Write revision      0
    As recorded when this approval was requested.

These are the exact values the Host re-checks before it acts — both governed
tools compare the whole approved context and refuse with `candidate_changed` if
any of it moved. So it is the fence, shown to the person it protects.

Three properties, each measured rather than asserted:

- **Absent stays absent.** `check_run`'s recorded context carries no
  `candidateRevision`, so no such row is drawn — while its `Write revision`
  correctly reads **1**, the write that had just landed, a different number
  from the one the write approval carried.
- **Recorded, not current.** After the candidate was stopped and replaced, the
  decided records still name `9a8ab169…` while the Host holds `3c956cac…` at
  revision 3. Nothing reads the Session, the binding or the live candidate.
- **A recorded zero is a fact.** `writeRevision: 0` is drawn; a missing or
  non-integer field is not.

**One thing this pass changed about its own scope.** The disclosure was built
on the open request first. Driving the journey showed that a *decided* request
is kept in the transcript as its own record, and that record carried the
target, the decision, the preview and the scope but not the identity it was
bound to — which is exactly what "what did I approve?" asks. The same reading
is now drawn in both places from one helper. That completes the ordered item;
it adds no control, no row kind, and no change to what is collapsed or decided.

## What changed

- **[home-preparation.mjs](../../../../../app/web/home-preparation.mjs)** — new.
  The three-command sequence, its identities and its refusals. No DOM, no state,
  no draft.
- **[app.mjs](../../../../../app/web/app.mjs)** — `prepareHomeChat` (which
  marker to continue, what to call the Chat, what the screen says);
  `preparedHomeChat`/`workspaceCardSession` so the card, its read-backs and the
  composer strip follow a Chat that exists but has not been sent to;
  `recordedApprovalIdentity`, drawn on the open request and on the decided
  record; the prepared state kept distinct from the failed-send banner.
- **[workspace-card.mjs](../../../../../app/web/workspace-card.mjs)** — the
  Home draft card offers the command and says what pressing it makes. It does
  not own the sequence; without an owner to call, the section is not drawn.
- **[thread-projection.mjs](../../../../../app/web/thread-projection.mjs)** —
  `approvalCandidate`, a pure reading of the recorded payload.
- **[server/index.mjs](../../../../../app/server/index.mjs)** — the new module
  joins the served allowlist.
- **[prepare-and-approval.test.mjs](../../../../../app/tests/prepare-and-approval.test.mjs)** —
  12 tests: the sequence, the lost-reply replay at each step, the refusals, the
  Home wiring, a real Host, and the four approval-reading properties.

## Bounds this delivery kept

- **Non-approval tool arguments: untouched.** No request capture, no new event
  or schema, nothing persisted or displayed by analogy with the approval
  preview. That preview remains a bounded 400-character substring and is not
  treated here as a redaction guarantee; the contract decision stays with
  Runtime/Host.
- **A prepared chat is not retitled by a later first message.** It is named
  from what has been typed when it is prepared, or from the folder, and is
  renamed from Recent like any other chat. Adding a retitle-on-send would be a
  new rule on the send path, which this order did not ask for.
- **No automatic Run, ever**, and no navigation: preparing leaves the person on
  Home with their draft.

## Checks

12/12 new tests; 69/69 across the eight owner suites this touches;
`lint-interaction`, `lint-colors`, `lint-materials` and `check-doc-links` all
ok; full suite **1302 pass, 0 fail**. Commands and results in
[checks.txt](checks.txt), with the not-run list.

## Evidence

- [browser/journey.md](browser/journey.md) — the whole pass on an isolated Host
  (8916), with verbatim DOM and network captures.
- [browser/host-receipts.json](browser/host-receipts.json) — two sessions: one
  prepared and never sent to (**0 events**, active candidate), and the worked
  one with its three approvals and their recorded candidate identities.
- [browser/approval-identity.json](browser/approval-identity.json) — the open
  and decided readings, plus the narrow-viewport measurements.
- [browser/source-integrity.json](browser/source-integrity.json) — the
  synthetic source clean at its commit, still holding its defect, with no
  `NOTES.md` from the denied write.
- [change-record.md](change-record.md) — owners, precedents, kept and changed
  relationships.

## What this does not claim

No screenshots (this author's tooling cannot write image files and has no
OpenAI computer use); no visual baseline; no 200 % zoom, screen-reader or
forced-colors pass; no real-model execution; no independent review; no push, no
deploy, nothing deleted.
