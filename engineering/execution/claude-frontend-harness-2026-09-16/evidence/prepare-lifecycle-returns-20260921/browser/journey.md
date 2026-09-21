# Browser passes for the three returns · isolated Host 8920, proxy 8921

2026-09-21 · author run, Claude (Opus 5), through the Claude desktop app's own
browser pane against a Host built from this candidate.

Method carried over from the review packet: an isolated Host, and in front of
it a proxy that forwards everything, logs every candidate-create with the
Host's real status, and replaces exactly one successful create reply with a
synthetic 503. No product code is touched by the proxy.

    instance  /Users/lesprivilege/Projects/.worktrees/courtwork-prepare-approval-fix-instance
    source    <instance>/source · synthetic Git repo at 042ccda
    Host      127.0.0.1:8920   proxy 127.0.0.1:8921 (the browser talks to 8921)
    provider  Local test · bootstrap "realProvider": false, "mode": "local-fake"

The user's 8787 Host and 8899 preview were not connected to, read or changed,
and are still running. No credential was configured, read, copied or exported.
This author's tooling reads live DOM, focus and network but cannot write PNG
files; the captures below are verbatim readings.

## PA-R2 · the lock, sampled while the command is in flight

Task typed, folder staged, then Start private candidate pressed. Sampled every
60 ms from the click:

    +0ms    remove { present: true, disabled: true }
            start-edits { present: true, disabled: true, text: "Sending…" }
            change-folder: not offered · path/connect: not present
            card says "Preparing this chat": true
            Home status: "Preparing your chat…"
    +60ms   identical
    +120ms  identical

Compare the review's capture, where Remove was enabled and held the keyboard,
and the start control was a live button labelled "Sending…".

Once it settled every control was usable again; Review changes and the
Which-is-which disclosure were available throughout.

## PA-R1 · the lost reply, and what the visible command does now

The proxy dropped the first successful create reply. The card and Home
afterwards:

    card
      Project        No project
      Folder         /Users/…/courtwork-prepare-approval-fix-instance/source
      Access         Read only
      File access    Ask before editing
      EDITS
      This chat was prepared but not finished. Continuing uses the same request
      it already sent, so nothing is created twice.
      [Finish preparing this chat]
      Could not prepare: Request failed (503).. Your instruction is kept.

    Home status
      Could not prepare: Request failed (503).. Your instruction is kept.
      [Continue preparing]

No Connect chooser, no Change folder, no ordinary Start private candidate.

Pressing **Finish preparing this chat**, with the network watched:

    GET /api/v5/sessions/7cb0fb7e-…      ← reconcile
    GET /api/v5/sessions                 ← the Recent list

No candidate command at all: the reconcile found the candidate the lost command
had already created, so nothing was owed. The card went straight to

    Private candidate  from 042ccda15fc4
    Writes             0
    Review changes · Stop edits

and Home to "Chat and private candidate are ready. Nothing was sent…".

The proxy's whole log for this pass:

    {"…/repository-candidate",{"operation":"create","requestId":"60b539de-a53c-4ce0-847e-de2b5fa8ddd4",
     "expectedRevision":0,"expectedBindingRevision":1,
     "candidateId":"6f3f4617-76cf-4912-a46d-8d45760d5076",
     "baseCommit":"042ccda15fc4f667a5d6f1f1c787363a329ab691"},"hostStatus":200}

One line, status 200. The review's log had two, the second a 409. The Host
after: one session, binding revision 1, candidate revision 1, candidate
`6f3f4617…` active, **0 events** — so no Run was admitted by any of it.

## PA-R3 · a first send made from Recent

The prepared chat was opened from Recent — not through Home's Send — and
"Synthetic lifecycle check" was sent there; the Run completed.

Back on Home:

    home-start-status   text: ""   hidden: true
    New chat            no refusal toast
    home-project-button disabled: false
    composer            "Lost candidate reply review"  ← the unsent Home text, intact

Compare the review's capture: "A prepared chat is waiting for your first
message" while Home still displayed "Nothing was sent" and the same chat read
Completed.

### The reload case, which this client never watched

A second chat was prepared, and its first Run was then admitted directly over
the Host API — what another tab doing the first send looks like from here.
Before reload, Home still said "Chat and private candidate are ready. Nothing
was sent…", and the stored marker still carried `prepared: true`.

After reload:

    marker in sessionStorage   null      ← asked, found a run, retired
    home-start-status          ""  hidden: true
    New chat                   no refusal
    composer                   "Restored marker review"  ← still there

## Host receipts

    Lost candidate reply review   binding rev 1 · candidate rev 1 · candidate 6f3f4617… · 1 run
    Restored marker review        binding rev 1 · candidate rev 1 · candidate 33d68539… · 1 run

One binding and one candidate each, across a dropped reply, a retry, a send
from Recent and a reload. Synthetic source unchanged at `042ccda`,
`src/parcel.mjs` still `d2a9ace4a0d9…`, working tree clean.

## Not run

200 % native zoom, screen reader, forced-colors; PNG capture and OpenAI
computer use (unavailable to this author); real provider; independent review.
