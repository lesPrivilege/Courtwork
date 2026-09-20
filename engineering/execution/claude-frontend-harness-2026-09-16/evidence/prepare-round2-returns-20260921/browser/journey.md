# Round-2 browser passes · isolated Host 8924, create-loss proxy 8925

2026-09-21 · author run, Claude (Opus 5), through the Claude desktop app's own
browser pane against a Host built from this candidate.

The review's method, aimed at the Chat create this time: a proxy that forwards
everything to the isolated Host, logs every `POST /sessions` with the Host's
real status, and replaces exactly one successful reply with a synthetic 503. No
product code is touched by it.

    instance  /Users/lesprivilege/Projects/.worktrees/courtwork-prepare-round2-instance
    source    <instance>/source · synthetic Git repo at e3145db
    Host      127.0.0.1:8924   proxy 127.0.0.1:8925 (the browser talks to 8925)
    provider  Local test · realProvider false, mode local-fake

The user's 8787 Host and 8899 preview were not connected to, read or changed,
and are still running. No credential configured, read, copied or exported. This
author's tooling reads live DOM, focus and network but cannot write PNG files.

## PA-R2 · the create whose outcome is unknown

Task typed, folder staged, Start private candidate pressed; the proxy dropped
the create's reply. Immediately after:

    remove        { present: true, disabled: true }     ← was enabled, and clearing it broke recovery
    start-edits   { present: true, disabled: true }
    path          not present
    connect       not present
    card          "Whether the last step took effect is not known yet. The folder
                   cannot change until that is settled; your folder and text are kept."
    Home status   "Creating the chat is unconfirmed. Check its status to recover
                   the same chat. Your instruction is kept."   [Check status]
    staged folder /Users/…/round2-instance/source  (still there)

The card does not claim anything is running. **Check status** sits on the Home
status line, outside the card's lock.

Pressing it recovered the Chat; **Finish preparing this chat** was then enabled
and completed the preparation:

    GET  /api/v5/repositories/recent
    GET  /api/v5/sessions/c223a928-…          ← reconcile
    PUT  /api/v5/sessions/c223a928-…/repository-binding
    GET  /api/v5/sessions/c223a928-…
    GET  /api/v5/repositories/inspect?rootPath=…%2Fsource
    PUT  /api/v5/sessions/c223a928-…/repository-candidate
    GET  /api/v5/sessions/c223a928-…
    GET  /api/v5/sessions

The proxy's whole create log:

    {"path":"/api/v5/sessions","body":{"projectId":null,
     "sessionId":"c223a928-b96e-4e09-9ceb-d3535fa760b4",
     "title":"Unconfirmed create review","permissionMode":"ask"},"hostStatus":200}

One line. Host after: 1 session, binding revision 1, candidate revision 1,
**0 runs, 0 events**. The Home draft "Unconfirmed create review" was intact
throughout.

## PA-R1 · the folder the Host refused

A fresh Home, a nonexistent folder staged, Start private candidate pressed. The
Chat was created; the bind was refused with *repository root could not be
validated*.

**First reading, with my initial classifier** — the card showed the uncertainty
sentence and no chooser, because that refusal arrives as a 503 and I had
treated every 5xx as uncertain. That is the counterexample against my own fix;
it is why the classifier now asks whether the Host answered rather than what
the number was.

**After the correction:**

    Could not prepare: repository root could not be validated. Your instruction is kept.
    This chat was made, but that folder could not be connected. Connect a
    different one to finish it; the chat and what you typed stay as they are.
    [Connect folder…]
    Read only. The next run can read files under the folder you connect. …
    CONNECTED BEFORE
      source   /Users/…/round2-instance/source
    [Enter a path instead]

Choosing `source` from **Connected before**, with the binding commands watched:

    { "operation": "bind", "expectedRevision": 0,
      "requestId": "fb244049-fa3f-41a3-a166-74b7380134c5",
      "rootPath": "/Users/…/round2-instance/source" }

One bind, and a different request id from the one the refused folder used — a
different folder is a different intent. The preparation then completed:

    Private candidate  from e3145dbe27cf
    Writes             0
    Home status        "Chat and private candidate are ready. Nothing was sent…"
    composer           "Invalid folder review"   ← untouched

## Host receipts

    'Invalid folder review'      bindingRev=1 candidateRev=1 runs=0 events=0  candidate=active
    'Unconfirmed create review'  bindingRev=1 candidateRev=1 runs=1 events=15 candidate=active

Two sessions in total — the two deliberate ones. The refused attempt left no
orphan chat, no second binding and no candidate. Synthetic source unchanged at
`e3145db`, working tree clean.

## Not run

200 % native zoom, screen reader, forced-colors, material-upload recovery; PNG
capture and OpenAI computer use (unavailable to this author); real provider;
independent review.

The combination "an effect is outstanding, so the chooser is withdrawn and the
correction is refused outright" is covered by tests rather than here: it needs
a lost reply staged at the same time as a refused folder, which this proxy
cannot do in one pass.
