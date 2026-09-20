# PA-R1 / PA-R2 / PA-R3 · the three preparation returns

2026-09-21 · Claude, author. On `claude-prepare-and-approval-20260920`, over the
held candidate `afc9f31` and the review documentation merged in at `caffdc2`.
Answers the three bounded returns of the
[independent review](../prepare-and-approval-review-20260920/README.md) and the
secondary path item inside PA-R1. **Not accepted** — released for re-review.

All three were real. What follows is the fix and the measurement, each against
the review's own reproduction.

## PA-R1 · a lost reply routed to a new candidate command

**What it was.** After the create landed at the Host and only its reply was
lost, the card fell back to the *Session* it could now see and offered its
ordinary Start private candidate. That command mints its own identities, so the
review's log shows two creates — `bb647b9f…`/`aaa56ff1…` at HTTP 200, then
`499b3745…`/`ee640a38…` at HTTP 409, "repository candidate changed".

**What it is now.** An unfinished preparation still owns that chat's
identities, so the card is told so and routes its Edits command back to the
preparation instead of its own create. The control says what it is —
**Finish preparing this chat** — and the recovery is also reachable from the
Home status (**Continue preparing**), because the card may be closed.

`prepareChat` now reconciles before deciding: it reads the Session, skips every
step the Host already holds, and sends the steps that remain with the Host's
current revisions rather than the marker's stale ones. That is what removes the
409 at the root — a retry is decided on facts, not on a snapshot.

The same run, with the same proxy method, against this candidate
([log](browser/lost-reply-commands.jsonl)):

    {"…/repository-candidate", {"operation":"create","requestId":"60b539de-…",
      "expectedRevision":0,"candidateId":"6f3f4617-…"}, "hostStatus":200}

**One line. One create, ever.** Pressing Finish preparing issued a single
`GET /sessions/:id`, found the candidate the lost command had created, and sent
no command at all. Host after: one session, binding revision 1, candidate
revision 1, candidate `6f3f4617…` active, **0 events**.

The card no longer falls through even before the folder binds: an unfinished
preparation is its own branch, so the ordinary Connect chooser is not offered
over a bind command that may already have landed.

**Secondary — binding identity and the canonical path.** Nothing compares path
strings. This client has no Host-canonical resolver and must not invent one, so
the binding's own `rootPath` — which the Host resolved when it bound — is
adopted as the folder Home names, and a chat that is already bound is never
bound again. `/tmp` versus `/private/tmp` therefore cannot be rejected, and no
surface can name a source the chat is not reading. Covered by a test that
stages one spelling and asserts Home ends up naming the Host's.

## PA-R2 · conflicting controls during preparation

**What it was.** `prepareHomeChat` guarded its own reentry, but the card knew
nothing, so Remove could move the staged folder out from under a bind in
flight, and the start control was still live. Luna's probe:
`removeDisabled:false, startDisabled:false`; Astra's AX shows Remove enabled
*and focused*.

**What it is now.** The card takes a `busyReason` from whoever holds its
objects, and that feeds the same `busy` its own in-flight command uses. Home
passes it while preparing. Sampled in the browser at 0/60/120 ms:

    remove       { present: true, disabled: true }
    start-edits  { present: true, disabled: true, text: "Sending…" }
    change-folder  not offered
    says "Preparing this chat"  true

and once it settled, every control was usable again. Reading and navigation —
the Which-is-which disclosure, Review changes, Close — stay available
throughout. Because the control is properly disabled, the 06b focus rule now
applies to it: the keyboard waits rather than being handed to a mutation.

## PA-R3 · a first send from Recent left a stale Home marker

**What it was.** Only `submitHomeRun` cleared the marker, so a first send made
from Recent left Home saying "Nothing was sent" and refusing a new chat while
the chat itself read Completed.

**What it is now.** The marker is retired where a Run becomes a fact, which
every send path reaches: at the matching run receipt in `submitSessionRun`.
Two more reconciliations cover work this client never watched — the session
detail load (it already carries `runs`), and one read of a marker restored from
storage. An unconfirmed or failed admission never reaches any of them, so a
send that did not land stays recoverable.

Browser, first send made from Recent: back on Home the status is empty and
hidden, New chat produces no refusal, the project control is enabled, and the
unsent Home text is untouched. Reload case, with the run admitted over the Host
API as another tab would: the restored marker is asked, found to have a run,
and retired — `markerInStorage: null`, status hidden, draft
"Restored marker review" still in the composer.

Retiring touches the marker and nothing else: it never clears the Home draft,
its materials or the staged folder, and never sends or deletes anything.

## Checks

11 new tests in
[prepare-lifecycle.test.mjs](../../../../../app/tests/prepare-lifecycle.test.mjs),
each driving the real `createWorkspaceCard` and the real `prepareChat` through
a Home controller that stands in for app.mjs's marker and render decisions —
the path the review asked for, not helper calls alone. They include all three
lost-reply steps, the 409 counterexample kept as a test, the pending lock, the
send-from-elsewhere retire, the unadmitted send, and the restored marker.

Four existing owner suites 41/41; `lint-interaction`, `lint-colors`,
`lint-materials` and `check-doc-links` ok; full suite **1313 pass, 0 fail**
(as recorded in checks.txt; this line said 1312 by transcription until the
round-2 review caught it, and was corrected without a rerun).
Commands, results and the not-run list in [checks.txt](checks.txt).

Two assertions from my own earlier tests were updated rather than loosened:
they pinned the pre-reconcile call sequence, and now state that preparing again
sends no *command* while making one read.

**Superseded on 2026-09-21.** The round-2 review showed that a stand-in
controller is not full integration coverage, and the two gaps it found lived
exactly in the transitions it hid. The controller is now a production module
and these tests drive it; see
[prepare-round2-returns-20260921](../prepare-round2-returns-20260921/README.md).

## Evidence

- [browser/journey.md](browser/journey.md) — the three passes with their
  sampled readings.
- [browser/lost-reply-commands.jsonl](browser/lost-reply-commands.jsonl) — the
  proxy's log: one create, status 200.
- [browser/lost-reply-proxy.mjs](browser/lost-reply-proxy.mjs) — the method,
  carried over from the review packet; no product code is touched by it.
- [browser/host-receipts.json](browser/host-receipts.json) — both chats, one
  binding and one candidate each.

## Limits

Isolated Host 8920 behind the reply-loss proxy 8921, Local test provider, no
credential read or exported; the user's 8787 and 8899 were not used and are
still running. Synthetic source unchanged at `042ccda`. As before, this
author's tooling cannot write PNGs and has no OpenAI computer use, so the
captures are verbatim DOM and network readings; no visual baseline is claimed.
200 % zoom, screen reader and forced-colors not run. No independent review, no
real model, no push, no deploy, nothing deleted.
