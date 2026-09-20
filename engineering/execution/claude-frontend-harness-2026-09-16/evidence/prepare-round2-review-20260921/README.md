# Preparation round 2: two remaining recovery corrections

2026-09-21 · Astra decision after Luna's bounded non-author review and OpenAI browser checks. Source **6b39ecc920500ecac63903b3085f3c3d6b35f824**, review-document merge **68ef4cd**, persistent main **caffdc2**. **Hold product integration for the remaining PA-R1/PA-R2 cases. PA-R3 is accepted within the evidence below.** Claude retains the existing correction assignment; no product source was edited during this review.

## Retained corrections

- **PA-R1, lost candidate/binding reply:** adopt the Host read before deciding which commands remain, the same-marker recovery actions and suppression of ordinary competing candidate commands. Luna's production-wiring review and focused tests support the fix for the former fresh-ID/409 route. The author's real proxy replay remains author evidence; this round's independent browser fault injection targets the earlier Chat-create reply instead.
- **PA-R2, in-flight phase:** adopt the external busy reason and pending mutation lock. The [pending browser AX](browser/03-pending.ax.txt) shows both Remove and start disabled. The unconfirmed phase remains open below.
- **PA-R3:** adopt matching Run receipt/detail/restored-marker retirement. In the actual browser, prepare → Recent → first Send → Home → New chat now leaves the original Home draft intact, hides the obsolete status and enables Project. [Browser AX](browser/04-recent-fixed.ax.txt) and [Host receipts](browser/host-receipts.json), session `93385c0b-d135-4025-aa09-03287c5d09e0`, establish the completed Local test Run. The separate zero-event session with the same title was created later for the invalid-folder counterexample; it is not a duplicate caused by the Recent send. The restored-marker/other-tab extension is accepted as the same lifecycle responsibility using existing Session facts; it has author browser evidence plus Luna source/tests, not a repeated independent browser pass here.
- **Canonical path adjustment:** adopting the existing Host binding's path for presentation and avoiding automatic rebind is appropriate. Do not add a client path-string resolver or reject `/tmp` versus `/private/tmp`.

Earlier approval identity acceptance and the prepared-title decision remain intact. No next frontend journey is opened by partial acceptance.

## Remaining PA-R2: unconfirmed is still mutable

The test proxy forwards `POST /sessions` to this review's isolated Host, lets it return HTTP 200, then substitutes one synthetic 503. The product correctly displays **Creating the chat is unconfirmed** and disables Send/Start. **Remove remains enabled.** Clicking it clears the staged folder; Check chat creation status then recovers the actual Session, but Continue preparing fails with **Connect a folder before preparing a chat for it**, and the folder chip is disabled.

Evidence: [unconfirmed AX](browser/01-unconfirmed.ax.txt), [dead-end AX](browser/02-recovery-deadend.ax.txt), [screenshot](browser/02-recovery-deadend.png), [actual create command/status](browser/lost-reply-commands.jsonl), [test-only proxy](browser/lost-reply-proxy.mjs). Luna independently probes the real card: `removeDisabled:false`, `startDisabled:true`. The proxy forwards only to our synthetic Host; it logs no credential/header.

**Disposition: adopt, still blocking, same Claude PA-R2 owner.** Carry the preparation owner's unconfirmed/unknown lock through every folder mutation path, including Remove and any chooser exposed by a rerender. Explain uncertainty accurately; it is not a command still running. Keep Check status/read-only recovery reachable. Do not unlock mutations until the outcome has been reconciled.

## Remaining PA-R1: definite invalid folder cannot be corrected

Independently of the uncertainty case, Astra staged a nonexistent synthetic folder and pressed Start private candidate. The Chat was created, binding definitively failed with **repository root could not be validated**, and the Workspace card then offered only Close and Finish preparing. There was no field or chooser to replace the bad path. Clicking Finish repeats the same failure.

Evidence: [invalid-folder AX](browser/05-invalid-folder.ax.txt), [screenshot](browser/05-invalid-folder.png), and Host session `67905697-c494-4499-a906-7ba90c7304ad` in [receipts](browser/host-receipts.json), with no binding/candidate/events. Luna's actual-card probe independently finds no change/path/connect control.

**Disposition: adopt, still blocking, same Claude PA-R1 owner.** Distinguish uncertain effects from a reconciled, definitively rejected bind. Once no binding/candidate has landed and correction is safe, offer an existing-style folder correction owned by the same prepared Chat. Keep the Chat identity and Home text/materials. A corrected path is a new binding intent: do not reuse an old request ID with a different payload, do not silently rebind an already bound Chat, and do not solve this by allowing mutations while the earlier effect is unknown. Retry without a changed intent keeps its original identity. Exercise invalid path → correct path → completed preparation with one Chat and zero Runs, as well as the unconfirmed lock/recovery route.

## Test boundary and evidence correction

Luna reran **52/52** focused tests: 11 lifecycle plus 41 neighboring preparation/card/candidate/friction tests. [Report](luna-review.md), [unfiltered output and probes](luna-review.log). No full suite was rerun. The lifecycle tests use real card/sequence modules but a **test-defined stand-in controller**, not the actual app.mjs controller; the remaining unconfirmed case demonstrates that difference. Correct the production seam and cover these actual transitions, with browser fault injection or production controller logic exercised directly, rather than treating the stand-in as full integration coverage.

Author `checks.txt` records **1313 pass / 0 fail**, while its README says **1312**. Adjust the README to the recorded author result; do not rerun the full suite just to repair that transcription. Both remain author evidence at `6b39ecc`.

## Operating bounds

Independent Local test Host 8922 and reply-loss proxy 8923 only; no personal credential store, real provider or user 8787/8899 access. Actual OpenAI browser actions supply the AX/PNG evidence. Native 200% zoom, screen reader, forced colors, material-upload recovery and wider G4 coverage remain unexecuted. Source repository stays unchanged. Review tabs and processes are closed/stopped. Claude's candidate branch/worktree and author evidence remain intact for correction; main receives documentation only. No source merge, cleanup deletion, push or deployment; heartbeat remains paused.
