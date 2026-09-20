# Browser journey · isolated Host 8912 and isolated 06a preview 8913

2026-09-20 · author run, Claude (Opus 5) through the Claude desktop app's own
in-app browser pane, against a Host built from this candidate branch.

**Nothing the user owns was touched.** The user's Host on 8787 and the
persistent-main 06a preview on 8899 both stayed up and were not connected to,
navigated to or read. This journey used its own Host process on 8912 with its
own data directory, its own 06a preview on 8913, and two synthetic Git folders
created for it. The provider is the deterministic Local test one
(`fake-openai-loopback`); `bootstrap` reports `"realProvider": false,
"mode": "local-fake"`. No credential was configured, read, copied or exported,
and no paid inference was made.

Instance (outside the product repository, created by the product's own
`scripts/prepare-coding-dogfood.mjs`):

    root    /Users/lesprivilege/Projects/.worktrees/courtwork-frontend-friction-20260920-instance
    source  <root>/source        · synthetic Git repo, commit 58503f3df3af, known pagination defect
    other   <root>/other-source  · second synthetic Git repo, commit 18f872405dac (for Change folder)
    data    <root>/runtime-data  · the Host's SE_RUNTIME_DATA_DIR, empty before this run

## Capture method, stated plainly

This author's toolchain can drive the real browser and read back the real DOM,
accessibility state, `document.activeElement` and the Host's own HTTP replies,
but it cannot write PNG files. So this packet carries verbatim DOM and focus
captures instead of screenshots. That is a real gap against the earlier
packets' image evidence and is listed as unexecuted in the delivery record; it
is **not** a claim that the visual result was independently accepted.

## 1 · Home · the staged folder, and the sentence about it

Workspace card on Home, folder staged as a draft:

    Workspace
    Folder    /Users/…/courtwork-frontend-friction-20260920-instance/source
    Access    Read only

    Connected when you send. Until then the Host reads the folder's path and
    Git details only, to show them here.

    Remove

and, at the same moment, the composer strip beside it:

    source · Local · Branch · main

The branch on that strip is the point. It is there because staging the folder
made the Host stat it and read its Git status (`service.mjs`
`getRepositoryInspection`, called from `renderContextStrip`). The sentence this
replaces — *"Connected when you send. Nothing is read before then."* — was
contradicted by the chip printed next to it.

The unbound chooser now reads:

    Read only. The next run can read files under the folder you connect. The
    folder is never written, and what a run reads is sent to the model this
    chat is configured with.

replacing *"…Nothing is uploaded and the folder is not changed."* The part the
Host really guarantees is kept and sharpened ("never written"); the part it
cannot guarantee is stated as what it is, without naming a runtime and without
claiming anything about which one is configured.

## 2 · The decision point, with four owners kept apart

First send bound the folder and started a Run; the chat overview then leads to
the same card. Verbatim:

    Workspace
    Project        No project
    Folder         /Users/…/instance/source
    Access         Read only
    File access    Ask before editing
    ▸ Which is which
    ▸ Change folder…

    Disconnecting stops further reads. Files the model already read stay in
    this chat.
    Disconnect

    EDITS
    Edits go to a private candidate the Host creates from the folder's current
    commit. The folder itself is never written.
    Start private candidate

`Project · No project` is a fact, not an omission: this chat is in no project
and still has a folder, which is exactly the case RD-006 says must stay
distinguishable. Opening **Which is which**:

    Project             How this chat is organised. It does not connect a
                        folder or grant access to one.
    Folder              Where a run reads source. It stays read only and is
                        never written.
    Private candidate   The Host's own copy of the folder's current commit. It
                        is the only place an edit lands.
    File access         What happens when a run proposes a write: either the
                        exact file and content are shown for approval first, or
                        they are not.

No Kit is named anywhere on this card, and nothing here grants anything.

## 3 · Start private candidate · where the keyboard goes

Focus was put on `Start private candidate` and the control activated. Sampled
`document.activeElement` across the command:

    before   data-repository-field="start-edits"
    during   BODY                         ← the platform dropped it, as the
                                            dogfood journey reported
    after    data-repository-field="review"   ("Review changes"), inside the card

`Stop edits`, same measurement, landed on `start-edits`. The card no longer
relies on focus it can still see: it remembers the field a command was started
from and hands the keyboard to the control that now answers the action.

With the candidate active the card correctly withdraws **Change folder…** and
says why, because the Host itself refuses to rebind then
(`store.mjs` `ACTIVE_CANDIDATE`):

    Stop edits first: the private candidate is built from this folder's commit,
    so the folder cannot change while it exists.

## 4 · Approved write, in the real approval card

One user message drove the Local test provider's scripted tool calls. The
approval card, verbatim:

    Approve this file write?
    src/parcel.mjs
    Private candidate · replaces the file whose hash starts d2a9ace4a0d9
    445 B · Approval for this exact write only
    [the exact proposed content]
    ▸ Write details
    Deny this write   Approve this write

Approved. Then the check approval, also verbatim:

    Approve this check?
    node-test v1
    node --test · in the private candidate · 120 s · 64 KiB per stream ·
    minimal environment
    24 B · Approval for this exact check only
    {"recipeId":"node-test"}
    ▸ Check details

Approved. `check.settled`: status `completed`, exit code 0, 183 ms, nothing
truncated. Both approvals are captured independently in
[host-receipts.json](host-receipts.json), not taken from model prose.

## 5 · The count that used to stay at zero

Reached the changes dialog by the same route that produced the counterexample —
chat overview → **Review changes** — which does *not* re-read the Session:

    heading at open        From commit 58503f3df3af · 1 write
    heading after the read From commit 58503f3df3af · 1 write
    body                   src/parcel.mjs · modified · 445 B
                           1 added, 1 removed
                             5  −   return Math.floor(count / perPage);
                                5 + return Math.ceil(count / perPage);
                           Patch 0a66a5d141eb87b1a92124976dc385502680005cceaa4342037c068f48263fa3

The recorded counterexample is
[08-host-diff.png](../../real-dogfood-20260920/08-host-diff.png): *"From commit
c8310f06ef60 · 0 writes"* over this same one-line patch — same synthetic
fixture, same patch hash `0a66a5d1…`. The heading is right at open because the
Host's own `repository.write.confirmed` event is folded into the reading, and
right after the read because the diff reply carries `writeRevision` itself; it
is a separate text node, so the correction never re-enters the patch or moves
the reader's position in it. Full receipt: [candidate-diff-receipt.json](candidate-diff-receipt.json).

A browser reload restored the same chat, and the card then read `Writes 1` from
persisted state.

## 6 · Change folder, without disconnecting

With no candidate open, **Change folder…** keeps the bound folder readable at
the top of the card, adds `Keep this folder`, and shows the same chooser
(Connect folder…, Connected before, Enter a path instead). Connecting
`/…/other-source` produced exactly one command, observed on the wire:

    PUT /sessions/:id/repository-binding
    {"operation":"bind","expectedRevision":1,
     "rootPath":"/…/instance/other-source","requestId":"9fa298b6-…"}

with **zero** `revoke` commands. The card then read that folder, and focus
landed on `Disconnect`. Rebinding to `/…/source` from **Connected before**
worked the same way. The typed path survives leaving the change path and coming
back (covered by the unit test; the browser pass exercised the picker rows).

## 7 · Viewport and scheme

1280×900 light and dark, and 375×812. At phone width the card stacks into two
columns, the long absolute path wraps inside its code block, and there is no
horizontal page scroll. Dark scheme renders through the existing tokens with no
new colour. 200 % native zoom, screen-reader verification and forced-colors
were **not** run — see the delivery record.

## 8 · Agent profiles · the list that showed what you had just changed

Isolated preview on 8913, **Slow replies** on.

Saved a Kit change to the *Work* profile (specimen revision 8), then pressed
**Back**. Sampled 300 ms later, while the list read was still out:

    section[data-testid="profile-list"]  aria-busy="true"
    p[data-testid="list-pending"]        "Reading the current agent profiles…
                                          the rows below are the previous reading."
    first row                            " Work | Ordinary work: … |
                                          General work · Kits: Coding review, Praxis · Pi | Open"
    document.activeElement               data-focus-key="row:ap-work"

The row is the *previous* reading — the save had changed that Kit list — and it
is now explicitly marked as such instead of sitting there as the confirmed
list. The rows stay because they are worth reading and because the anchor you
returned to is one of them; focus is on it. When the read landed, `aria-busy`
went to `false`, the notice went away, and the row showed the saved values.

The full capture, including that section's own markup, is in
[profile-list-pending.json](profile-list-pending.json).

Scenario change, same measurement:

    at +300 ms   aria-busy="true", the pending notice, 3 rows from the previous scenario
    settled      aria-busy="false", no notice, 0 rows, and the empty state:
                 "No agent profile is configured on this host yet. An agent
                  appears here once one is installed or created."

Late reply behind a newer navigation: a slow list read was started, a profile
was opened while it was out, and the reply was allowed to resolve. The page
stayed on the profile, no list was rendered, and the reply was not adopted as
the confirmed list.

## What this journey does not establish

It is an author's own pass with a deterministic local provider. It is not an
independent review, not a real-model coding result, not a visual acceptance,
and it reopens nothing that the 2026-09-20 dogfood completion left open.
