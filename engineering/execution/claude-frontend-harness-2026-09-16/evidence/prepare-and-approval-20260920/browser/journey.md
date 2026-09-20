# Browser journey · isolated Host 8916

2026-09-20 · author run, Claude (Opus 5), through the Claude desktop app's own
browser pane against a Host built from this candidate branch.

**Nothing the user owns was touched.** The user's Host on 8787 and the
persistent-main preview on 8899 stayed up and were not connected to, navigated
to or read. This journey used its own Host process on 8916 with its own data
directory and a synthetic Git folder made by the product's own
`scripts/prepare-coding-dogfood.mjs`. The provider is the deterministic Local
test one (`bootstrap`: `"realProvider": false, "mode": "local-fake"`). No
credential was configured, read, copied or exported, and no paid inference was
made.

As in the previous packet, this author's tooling can drive the real browser and
read back live DOM, `document.activeElement`, console and network, but cannot
write PNG files and has no OpenAI computer use. The captures below are verbatim
DOM and network readings; no visual baseline is claimed.

    instance  /Users/lesprivilege/Projects/.worktrees/courtwork-prepare-approval-20260920-instance
    source    <instance>/source · synthetic Git repo at 2729e71414be, known pagination defect
    data      <instance>/runtime-data · empty before this run

## 1 · Home, before anything is sent

The task was typed into the composer first, then the folder staged, and only
then the card opened. Its Edits section reads:

    EDITS
    Edits go to a private candidate the Host creates from the folder's current
    commit. The folder itself is never written.
    This makes the chat and connects the folder now. Nothing is sent and no
    model is called until you send.
    Start private candidate

The second sentence is the one that earns its place: this is the only control
on Home that creates something, and the button beside it is the one that costs
a model call.

## 2 · Preparing, with the network watched

Every request the page made while the command ran:

    POST /api/v5/sessions
    PUT  /api/v5/sessions/18424fea-…/repository-binding
    GET  /api/v5/sessions/18424fea-…
    GET  /api/v5/repositories/inspect?rootPath=…%2Fsource
    PUT  /api/v5/sessions/18424fea-…/repository-candidate
    GET  /api/v5/sessions/18424fea-…
    GET  /api/v5/sessions

Three commands, the read-back between each, and the Recent list. **No `/runs`.**
The Host agrees: the session's event list is empty.

    GET /sessions/18424fea-…/events?afterSeq=0  →  events: 0  []
    candidate: active · base 2729e71414be · writes 0
    sessions on this Host: 1

Focus, sampled across the command: it dropped to `BODY` while the control was
disabled, then landed on `data-repository-field="review"` — the Review changes
control the new candidate offers, through the focus chain 06b already
established.

Afterwards the card reads the Session's own facts rather than a draft:

    Project        No project
    Folder         /Users/…/instance/source
    Access         Read only
    File access    Ask before editing
    ▸ Which is which
    Stop edits first: the private candidate is built from this folder's commit,
    so the folder cannot change while it exists.
    Disconnect
    EDITS
    Private candidate   from 2729e71414be
    Writes              0
    Review changes · Stop edits

and Home says, without error styling (`data-error="false"`):

    Chat and private candidate are ready. Nothing was sent; send to start work
    in them.

The composer still holds the typed task, and the chat is in Recent under it.

## 3 · Recovery, and not making a second chat

A full browser reload: the status, the draft and the card all come back the
same, and the card no longer offers preparation because the chat already has
everything. Pressing the command again after the reload issued **zero**
requests.

Then Send, with the network watched again:

    POST /api/v5/sessions          → 0
    PUT  …/repository-binding      → 0
    PUT  …/repository-candidate    → 0
    POST /api/v5/sessions/18424fea-…/runs   ← the Run, in the prepared chat

The send reused the prepared Chat, did not re-bind, did not make a second
candidate, and did not create a second Chat.

Trying to start an unrelated chat while one is prepared goes Home and says so
rather than silently starting a second:

    A prepared chat is waiting for your first message. Send in it before
    starting another.

The lost-reply cases — a reply dropped after the chat, the binding or the
candidate really landed — are covered at the sequence seam in
`tests/prepare-and-approval.test.mjs`, which retries the persisted marker and
asserts one chat, one binding and one candidate in every case.

## 4 · What an approval says it was asked about

A Local test script drove an exact candidate write and the fixed `node-test`.
The open write approval's **Write details**:

    Private candidate   9a8ab169-0c42-48c8-80fa-6c853349c92c
    Candidate revision  1
    Write revision      0
    As recorded when this approval was requested.
    8561b3ab75fe80603092e14c3228abfbf74a6ff588389eccf71ff2241ebcba51
    [Copy proposed content hash]

Approved. The check approval's **Check details**, on the same candidate:

    Private candidate   9a8ab169-0c42-48c8-80fa-6c853349c92c
    Write revision      1
    As recorded when this approval was requested.

Two things to read there. The check is bound to write revision **1** — the
write that had just landed — which is a different number from the one the write
approval carried, so the reading is per-request and not a repeat of the card.
And there is **no Candidate revision row**, because `check_run`'s recorded
context has never carried one. An absent field stays absent.

A third request, a write to `NOTES.md`, was **denied**; it recorded the
candidate that was current at that moment.

## 5 · The part that makes it worth showing: looking back

After the check completed, the candidate was stopped and a new one started from
the same folder. The Host then holds a different candidate:

    current candidate  3c956cac-c2fa-4316-ae1a-46dc668c1add · revision 3 · writes 0

The transcript's decided requests, re-read at that point:

| record | recorded identity |
|---|---|
| `src/parcel.mjs · Write approved` | candidate `9a8ab169…` · candidate revision 1 · write revision 0 |
| `node-test v1 · Check approved` | candidate `9a8ab169…` · write revision 1 |
| `NOTES.md · Write denied` | candidate `3c956cac…` · candidate revision 3 · write revision 0 |

The first two name a candidate that no longer exists. Nothing on screen was
updated to the live one, and nothing reads the Session, the binding or the
current candidate to produce it.

**A finding from this pass, and the reason the change grew.** The disclosure
was built on the open request first. Driving the journey showed that a decided
request is kept in the transcript as its own `.resolved-permission` record — and
that record carried the target, the decision, the preview and the scope, but not
the identity it was bound to, which is exactly the thing "what did I approve?"
asks. The same reading is now drawn in both places from one helper. That is a
completion of the ordered item, not a new surface: no new control, no new
row kind, no change to the decision or to what is collapsed.

## 6 · Viewport and scheme

1280×900 light, and 375×812 dark. At phone width the recorded identity reads as
ordinary rows, the candidate id wraps inside its code block
(`overflow-wrap: anywhere`), and there is no horizontal page scroll
(`scrollWidth 375 === clientWidth 375`; the list measures 343 px inside a
375 px viewport). No new colour, token, icon or material.

200 % native zoom, screen-reader verification and forced-colors were **not**
run; the existing G4 residuals stay as open as they were.

## What this journey does not establish

An author's own pass with a deterministic local provider. Not an independent
review, not a real-model result, not a visual acceptance, and it reopens
nothing that the accepted 06b batch closed.
