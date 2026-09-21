# Round 2 · the two remaining recovery gaps

2026-09-21 · Claude, author. On `claude-prepare-and-approval-20260920`, over
`6b39ecc` with the round-2 review documentation merged in. Answers the two
returns of the
[round-2 review](../prepare-round2-review-20260921/README.md), and the test
boundary it named. **Not accepted** — released for re-review.

Both were real, and the review's diagnosis of *why* the tests missed them was
right: the lifecycle tests drove a stand-in controller, so the transitions that
only exist between attempts were never the product's own.

## The test boundary first, because it caused the rest

`createHomePreparation` is now a **production** module
([home-preparation.mjs](../../../../../app/web/home-preparation.mjs)). It owns
every decision between attempts — which marker to continue, which folder to
continue against, whether an outcome is settled, whether a correction is safe,
and how an unknown create is settled. `app.mjs` keeps what is genuinely its
own: the persisted marker, the DOM and rendering, and it now reads

    const homePreparation = createHomePreparation({ request, read, write, onPrepared });

The 16 tests in
[prepare-lifecycle.test.mjs](../../../../../app/tests/prepare-lifecycle.test.mjs)
drive that instance and the real `createWorkspaceCard`; only the Home *state*
(marker, staged path, draft text) is local. `checkHomeStart` moved too, since
"is this outcome settled?" is the same question the rest of the module answers.

## PA-R2 · an unconfirmed create is no longer mutable

**What it was.** The lock covered `preparing` only. With the create's reply
lost, Remove stayed live, clearing the staged folder — and then Check status
recovered the Chat but Continue preparing failed with *Connect a folder before
preparing a chat for it*.

**What it is now.** The lock covers every state where an effect is outstanding,
not just a command in flight, and the two say different things because they are
different things. Browser, with the review's proxy method aimed at
`POST /sessions`:

    remove        { present: true, disabled: true }
    start-edits   { present: true, disabled: true }
    path/connect  not present
    card          "Whether the last step took effect is not known yet. The
                   folder cannot change until that is settled; your folder and
                   text are kept."
    Home status   "Creating the chat is unconfirmed. Check its status to
                   recover the same chat. Your instruction is kept.  [Check status]"
    staged folder still /…/round2-instance/source

The card never says something is running when nothing is. **Check status** is
outside the lock, because it is the way out of uncertainty rather than another
thing landing beside it — and for the same reason **Continue preparing** stays
usable while every folder mutation is locked.

Then: Check status → recovered → Finish preparing → ready. The proxy's log has
**one** `POST /sessions`, status 200; the Host has one session, binding
revision 1, candidate revision 1, **0 runs, 0 events**.

## PA-R1 · a definitively refused folder can be corrected

**What it was.** A nonexistent folder produced a Chat, a definitive bind
refusal, and a card offering only Close and Finish preparing — which repeats
the same failure forever.

**What it is now.** `uncertain` and `correctable` are opposite states and never
both. A preparation is correctable only when the Host answered, nothing landed,
and no binding or candidate exists; then the card offers the *same chooser the
unbound card uses*, over the same Chat.

Browser, staging `/…/does-not-exist`:

    Could not prepare: repository root could not be validated. Your instruction is kept.
    This chat was made, but that folder could not be connected. Connect a
    different one to finish it; the chat and what you typed stay as they are.
    [Connect folder…]  CONNECTED BEFORE: source  [Enter a path instead]

Choosing the good folder from **Connected before** issued exactly one bind:

    { operation: "bind", expectedRevision: 0, requestId: "fb244049-…",
      rootPath: "/…/round2-instance/source" }

a **different** request id from the refused one, because a different folder is
a different intent. The preparation then completed. Host after: the corrected
chat has binding revision 1, candidate revision 1, 0 runs, 0 events, and there
are **two** sessions in total — the two deliberate ones, no orphan from the
failure.

A retry that does *not* change the folder keeps its original identity, and
while any effect is outstanding the chooser is withdrawn and
`correctFolder()` refuses outright — covered by tests, since that combination
needs a lost reply the browser pass cannot also stage.

### One thing the browser corrected about the fix

My first classifier called every 5xx uncertain. The Host answers an invalid
folder with **503 `repository_validation_failed`** — a settled refusal — so the
correction was withheld exactly where it was needed, and the browser showed the
uncertainty sentence instead of the chooser. The test is now whether the *Host
answered*, not the status number: a reply carrying the Host's own error
envelope is settled, because on all three of these commands every coded refusal
is raised before the effect; anything without one — a transport failure, a
proxy's 503, a reply lost after the Host committed — stays uncertain. That
distinction is exactly what separates the two reproductions in this packet, and
it has its own test.

## Checks

16 lifecycle tests (11 carried forward, 5 new), all through the production
controller; four owner suites 41/41; lints and doc links ok; full suite
**1318 pass, 0 fail**. [checks.txt](checks.txt), with the not-run list.

Three existing source-pinned assertions moved with the code they pin — in
`prepare-and-approval`, `workspace-card` and `entry-audit`. The invariants are
unchanged; they now ask the module that owns them, and the entry-audit one
gained the 404 case it was implicitly relying on.

## Also corrected

The 2026-09-20 packet README said 1312 where its own `checks.txt` recorded
1313; the README now matches the recorded result, with no rerun.

## Evidence

- [browser/journey.md](browser/journey.md) — both passes, with sampled readings.
- [browser/create-commands.jsonl](browser/create-commands.jsonl) — one create,
  status 200.
- [browser/create-loss-proxy.mjs](browser/create-loss-proxy.mjs) — the review's
  method, aimed at the Chat create; no product code touched.
- [browser/host-receipts.json](browser/host-receipts.json) — both chats.

## Limits

Isolated Host 8924 behind the create-loss proxy 8925, Local test provider, no
credential read or exported; the user's 8787 and 8899 untouched and still
running. Synthetic source unchanged at `e3145db`. No PNG capture or OpenAI
computer use available to this author, so the captures are verbatim DOM and
network readings; no visual baseline claimed. 200 % zoom, screen reader,
forced-colors and material-upload recovery not run. No independent review, no
real model, no push, no deploy, nothing deleted.
