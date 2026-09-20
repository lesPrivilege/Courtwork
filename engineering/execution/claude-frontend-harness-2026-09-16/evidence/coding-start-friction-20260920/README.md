# Start coding without guessing · one bounded source candidate

2026-09-20 · Claude, author. Branch `claude-frontend-friction-20260920` from
integrated main `a04b9ac`, in its own worktree. Answers the four finite items
of [06b](../../06b-dogfood-friction-20260920.md) and nothing else. **Not
accepted:** this is an author delivery, released for Luna's non-author delta
review and Astra's integration decision.

## What a person can now tell, and from where

| Question | What answers it | Owner it reads |
|---|---|---|
| Which project organises this task? | `Project` on the Workspace card | `session.projectId` |
| Which folder supplies source? | `Folder` + `Access · Read only` | the Host's active binding |
| Where will edits land? | `Private candidate · from <commit>` | the Host's active candidate |
| When am I asked? | `File access · Ask before editing` | `session.permissionMode` |
| How many writes are in it? | `Writes` and the changes dialog heading | `repository.write.confirmed` and the diff reply |
| How do I use a different folder? | `Change folder…` | the existing `bind` command |

The longer definitions sit behind one **Which is which** disclosure, so the
default layer stays short. No Kit is named on this card, and nothing on it
grants anything.

## The five counterexamples, before and after

[counterexamples.txt](counterexamples.txt) is one script
([counterexamples.mjs](counterexamples.mjs)) run against two app trees — the
unchanged integrated main and this candidate — so each seam is stated as a
measurement rather than a description.

| | At `a04b9ac` | Here |
|---|---|---|
| CE-1 stale write count | card reads `Writes 0` with the confirmation in hand; heading never refreshed from the diff reply; no `app/web` module consumes `repository.write.confirmed` | `Writes 1`; heading painted from the projection and refreshed from the diff receipt |
| CE-2 focus after Start private candidate | `document.activeElement` → null, the page | → `review` ("Review changes"), inside the card |
| CE-3 boundary copy | "Nothing is uploaded", "Nothing is read before then" | replaced; the Host really does stat the folder and read its Git status before any send |
| CE-4a stale rows | `status=loading`, previous rows drawn as settled, nothing marked | same rows, `aria-busy="true"` and a `role=status` line saying so |
| CE-4b late list reply | landed as the confirmed list behind a newer navigation | dropped; the navigation stands |

## What changed

Four files in `app/web`, one new test file.

- **[workspace-card.mjs](../../../../../app/web/workspace-card.mjs)** — the
  four readings and the disclosure; `Change folder…` / `Keep this folder`
  through the existing bind command, withdrawn with a reason while a candidate
  exists (the Host's own `ACTIVE_CANDIDATE` rule); `REPOSITORY_HELP` and the
  new `REPOSITORY_DRAFT_SCOPE` corrected; `candidateWriteRevision(session,
  events)` exported as a pure projection over two Host receipts; a `FOCUS_CHAIN`
  so a command hands the keyboard to the control that now answers it.
- **[app.mjs](../../../../../app/web/app.mjs)** — `candidateHeading()`; the
  changes dialog opens on the projection and corrects itself from the diff
  reply's own `writeRevision`, in a separate text node so the patch is never
  rebuilt; the card is given the project, the file-access sentence and the
  event list, and is re-rendered while it is open so a Run's writes reach it.
- **[agent-profiles.mjs](../../../../../app/web/agent-profiles.mjs)** —
  `openProfile` retires the list read it navigates away from, the symmetric
  half of the rule `openList` already documents.
- **[agent-profiles-view.mjs](../../../../../app/web/agent-profiles-view.mjs)** —
  the list is a `<section aria-busy>` with an explicit pending line; the rows
  and the navigation anchor stay.
- **[coding-start-friction.test.mjs](../../../../../app/tests/coding-start-friction.test.mjs)** —
  12 tests at the event → projection → displayed-outcome seam, at the focus
  seam, at the copy, at the bind command and at the list controller.

## Evidence

- [browser/journey.md](browser/journey.md) — the whole journey on an isolated
  Host (8912) and an isolated 06a preview (8913), with verbatim DOM and focus
  captures. The user's Host on 8787 and the persistent-main preview on 8899
  were left alone; the provider is the deterministic Local test one and no
  credential was configured, read or exported.
- [browser/host-receipts.json](browser/host-receipts.json) — sessions,
  bindings, candidates, write effects, permission opens and resolutions, and
  the repository/check events, read from the Host, not from model prose.
- [browser/candidate-diff-receipt.json](browser/candidate-diff-receipt.json) —
  the diff reply behind the corrected heading. Same synthetic fixture and same
  patch hash `0a66a5d1…` as the recorded counterexample.
- [browser/profile-list-pending.json](browser/profile-list-pending.json) — the
  06a list at 300 ms and settled, plus the scenario-change and late-reply cases.
- [browser/source-integrity.json](browser/source-integrity.json) — the
  synthetic source clean at its initial commit, still holding its defect.
- [checks.txt](checks.txt) — every command, its result, and the not-run list.
- [change-record.md](change-record.md) — owners, precedents, kept and changed
  relationships, per the frontend continuity change template.
- [exploration.md](exploration.md) — the two observations, measured before
  implementation and **not** implemented.

## Checks

12/12 new seam tests; 33/33 across the three existing owner suites
(`candidate-ui`, `agent-profiles-specimen`, `diff-view`); `lint-interaction`,
`lint-colors`, `lint-materials` and `check-doc-links` all ok; full suite
**1289 pass, 0 fail**.

## What this does not claim

No screenshots: this author's browser tooling reads the live DOM, focus and
network but cannot write image files, and OpenAI computer use was not
available to it — the journey ran through the Claude desktop app's own browser
pane instead, and the packet carries DOM captures where the earlier packets
carry images. No visual baseline is offered or claimed as golden.
200 % native zoom, screen-reader verification and forced-colors were not run;
the existing G4 residuals stay exactly as open as they were. No real-model
execution, no independent review, no push, no deploy, and no source or
evidence tree deleted.

## Next owner

Three things go out with this, none of them built. Two are frontend
recommendations for the existing owners: let a private candidate start before
the first inference (the Host routes were verified to support it already — see
exploration.md A, with the zero-event session in the receipts), and show the
candidate revision in approval details (the payload already carries it). The
third is a genuine backend gap returned to Astra: a pending tool call that
opens no approval carries no arguments, because `tool.start` projects only
`callId` and `name`.
