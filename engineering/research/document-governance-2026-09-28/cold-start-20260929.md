# Cold-start handoff test · 2026-09-29

Acceptance test G10 of the [document governance intake](README.md). A fresh Sonnet agent with no memory or prior conversation was given a clean detached checkout of `81e6263` (the convergence branch after its first four commits) and told to start wherever the repository says to start. It could read only the checkout and could not modify it. Summary by Opus; the agent's full answer was returned in-session and is condensed here.

## Questions and outcome

| Question | Expected | Agent's answer | Result |
|---|---|---|---|
| "Enter in the New project dialog cancels it. Fix it." | Not yours by default: UX lane is original Claude's; U1 is already returned there. Root cause, UX route, checks. | Not mine by default; lane and U1 found via current → review → UX record. Root cause confirmed in source, including the `createEntity` submitter branch. Route ux-grammar → frontend contract → precedents → change template; counterexample first; real-browser evidence; independent acceptance separate. Nearest precedent: `edit-message-dialog`. | Pass. It also found that U1 overcounted: the delete dialog defaults to Cancel on purpose (corrected). |
| "Can I use Hermes as the runtime today?" | No: standalone adapter, not Host-registered; native execution refused; what it would take. | No, with supported-preview, hermes-api-runs and current's Hermes row; five steps from refusal review to Host admission contract, registration and independent review. | Pass |
| "Where does a new ChatGPT report go; when is it consumed?" | Raw outside Git by default; research packet with summary/hash/dispositions; consumed when questions have landed dispositions. | Same, citing repository layout and governance; noticed the existing memory-broker packet. | Pass (whether to extend the existing packet was a judgment call) |
| "State of main; tests; known Run lifecycle problems?" | Baseline row; D1–D3 open with Astra. | Baseline from current; D1 re-read in code and matches; D2–D5, D9, D10 listed with owners; stated the suite count is documentary because it did not run tests. | Pass |

About 40 files touched (25 read, 6 excerpts, 9 grep-only). No file under `engineering/archive/`, no raw original and nothing under root `evidence/` was needed. The agent kept to the lanes and did not propose prepending to `current.md` or committing a raw transcript.

## Friction and disposition

| Friction reported | Disposition |
|---|---|
| U1 said four dialogs; delete defaults to Cancel on purpose | Fixed in the review and UX record |
| `current.md` omitted U1/U2/D11 and named main `ffe68fb` while the checkout was ahead | Fixed: rows name the findings; the reconciliation line states the branch it was written on |
| `engineering/README.md` routing table was found late; AGENTS did not link it | Fixed: AGENTS points to it after `current.md` |
| A second known flake (`profile-editor` K5-R2) lived only in the UX record | Added to [verification](../../verification.md) |
| Owner records such as the UX record are long append-only logs; the relevant part is at the end | Accepted for now: execution records are logs by nature, and `current.md` links the right record. Revisit if handoffs keep stalling there |
| Design grammar documents are mostly Chinese | Existing incremental-migration rule applies; not changed here |
| No precedent-map key for form dialogs or implicit submission | For the UX owner when U1 is fixed |
| The memory-broker packet stacks a dated note above its body; index and roadmap disagree on its state | Left; it falls under the seven open or unclear intakes in the [research index](../README.md#open-intakes) |
| Hermes native conformance sits on a branch outside the checkout | Correct as stated in `current.md`; the branch is the author's and unreviewed |
