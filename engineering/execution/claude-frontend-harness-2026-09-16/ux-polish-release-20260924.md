# UX polish before the basic harness GUI release · 2026-09-24

Author: Claude (Opus 5.5, self-claimed under the user's 2026-09-24 "claim UX Design polish" instruction). Baseline `main@10c364e`, isolated worktree `claude/ux-polish-20260924`. Author evidence only; independent acceptance and merge stay with the parent owner.

## Method

Actual Host on a fresh synthetic data directory (fake loopback provider, no credentials), Claude built-in browser at 1440×900 and 375×812, walking first run (Example) → Chat → Settings → a real project/chat. A Sonnet explorer separately inventoried registered-but-open polish items; that list is recorded below, not re-dispatched.

## Change record

| ID | Observed defect (live) | Responsibility / owner | Nearest precedent | Change |
| --- | --- | --- | --- | --- |
| RP-1 | Opening any Example chat shows `Could not read this chat's agent: session not found`, `Agent unknown` and Retry. The Agent chooser reads `/runtime-control?sessionId=<example id>` from the real Host, which the Example layer does not record. | Composer Agent chooser visibility (E1 `agentChoiceGate`, app.mjs `syncAgentChoice`). Host runtime-control owner unchanged. | E1 treats global/Attention Sessions as "no chooser, no hold"; Example Send is already refused with a toast (app.mjs example guard). | Example Sessions take the same no-chooser path: no Host read, chooser hidden, Send's existing Example refusal remains the only answer. |
| RP-2 | Example chats with an extension binding show a lone refresh icon and `Work review summary unavailable: This part of the example was not recorded.` as an alert. | Chat work-review summary mount (`workReviewSummaryFor`). | Preview layer stage 4: the example "changes nothing" and unrecorded reads are not product errors. | The summary is not mounted for Example Sessions; real Sessions are unchanged. |
| RP-3 | Sidebar project headings truncate names to ~65px ("Project C…", "Northsid…") because every Example project carries an `Example` pill, although the top bar chip and Home banner already say the whole workspace is the example. | Sidebar project heading (app.mjs `renderProjectList`). | Stage 4 preview chip: one word while the example is shown. | The per-project pill appears only when Example and real projects are listed together, where it still distinguishes them. |
| RP-4 | At narrow widths (375px) the top bar shows `Harbor lease renewal and v…` and the chat title is clipped away: the WK-40 project prefix and chat title share one ellipsis. | Chat header title line (styles.css WK-40 rule). | WK-40 · one title line with muted project prefix below 1024px or with collapsed navigation. | Only when the line overflows, the prefix shrinks first (twice the title's shrink weight); its name truncates inside the prefix while the separator stays whole, and both clip away together when no room is left. With room, both stay whole. Desktop with open navigation is unchanged. |

Affected grammar: status honesty (no false error for an unrecorded example read), single-object title line (WK-40), sidebar row density. No token, material, control height or copy-registry change. Pointer/text-scale assumptions: fine pointer at 1440, coarse/narrow at 375; no control size changes.

## Recorded, not changed here

- **Stale Example fixture:** `web/samples/preview/responses.json` work-summary items predate the `scope` field, so an unassigned/global Example chat reads `Project not resolved` on Home. Re-recording the fixture is the owner fix; guessing scope in the adapter would be dishonest.
- **Narrow composer density:** at 375px Agent, File access and Model labels shrink to `A.`/`Local t…`. WK-94 deliberately removed the Access icon; the icon-only fallback belongs to the registered P1 Composer density contract (`design/chat-flow-2026-09-10/polish-slices-20260914.md`), not this slice.
- **Registered open items (explorer inventory, unchanged):** object-command menus on Chat-list/Attention rows (09 N-07), Back-to-latest geometry (00-intake:151), ask_user prompt selectability (00-intake:152), fine/coarse target split for reader chrome (grammar-convergence F2), Back/Forward shortcuts (09). Home-first Agent choice and bound-Run reading remain E1 follow-ups. The explorer also listed CE-F2 (work-location panel opening at Disconnect); that is stale: 06d implemented it with six `CE-F2 ·` regressions (see `design/role-composer-20260922/e1/logs/full-suite.log`), so it is not reopened here.

## Author verification

- Live Host A (fresh synthetic data, real project `Harbor lease renewal and vendor review` / chat `Summarize renewal terms`), 375×812: title reads `Harbor l… · Summarize re…` (prefix 67px of 263, title 124px of 189) instead of the project name alone. 1440×900: navigation open hides prefix and separator; collapsed shows `prefix · title`.
- Live Host B (fresh data, automatic Example), 1440×900, Example chat `Inbound NDA — Project Cedar`: zero `/runtime-control` requests, no chooser or error line, no review-summary block, Send answers `This chat is part of the example and cannot run…`. Sidebar shows `Project Cedar review` in full (133/133px) with no per-project pill.
- Focused tests: every test file that reads `styles.css`/`app.mjs` or imports agent-choice, preview-layer or work-review-summary — 40 files, 361/361 on Node 25.9.
- Not checked by the author: mixed Example + real sidebar (the Example re-entry is not reachable once real projects exist in this build), dark mode, 200% text, Node 22/24.

## Non-author review and disposition

Sonnet non-author review of `7a24a48`: RP-1 confirmed (all real↔Example transitions traced plus a throwaway lifecycle probe; one load per real Session, none for Example), RP-2 confirmed (only caller null-guarded), RP-4 confirmed (separator specificity and `[hidden]`/≥1024 suppression correct), 361/361 independently.

- **RP-3 accessibility delta — adopt.** Dropping the pill also removed "Example" from each project button's accessible name. The word now stays as `sr-only` text when the pill is not shown; the visual change is unchanged.
- **RP-4 inert h1 ellipsis rule — reject removal.** `.chat-title-wrap h1 { overflow:hidden }` still clips the flex container; leaving it avoids touching the shared WO-CS-01 rule.

## Parent review of `04c9263` · RP-4 desktop regression — adopt

Parent acceptance held the batch: at 1440×900 with navigation collapsed, the Example `Inbound NDA` title wrap is ~583px but the 136px project name was clipped to 123px. `max-width: 35%` resolved against the shrink-to-fit title itself, so it capped even with room; baseline CSS showed the name whole. The author's "desktop unchanged" claim was wrong for the collapsed state.

Correction: no percentage cap; the prefix only yields through weighted `flex-shrink` on actual overflow. The project name moves into its own `.title-project-name` span with the separator as the prefix's `::after`, so a fully collapsed prefix no longer leaves an orphan `·` in front of the title (seen at 375px in the Example, where the Work/Example chips leave ~80px). The ≥1024px hide rule is raised to `#session-title > .title-project` specificity so the prefix's own `display:flex` cannot override it.

Live geometry after correction (fresh synthetic Hosts, measured widths rendered/needed):

| Case | Prefix name | Chat title |
| --- | --- | --- |
| Example, 1440, nav collapsed | 136/136, separator shown | 201/201 |
| Example, 1440, nav open (and after re-toggle) | hidden, no separator | 201/201 |
| Real, 1440, nav collapsed | 263/263 | 175/175 |
| Real, 1440, nav open | hidden | 175/175 |
| Real, 375 | 64/263 + separator | 112/175 |
| Example, 375 (Work + Example chips) | 0, prefix and separator clipped together | 72/201 |

Focused files 361/361 after correction. Existing tests do not measure layout; this matrix is the regression evidence. Still unverified: dark mode, 200% text, Node 22/24, mixed Example + real sidebar, full real↔Example switching.

## Parent acceptance of `4ef7065` · RP-1–4 accepted

Parent re-review (2026-09-25) accepts the RP-1–4 batch at `4ef7065`: independent browser geometry matches the author table, the mixed sidebar (Example kept open, a real project added) shows the pill only on Example projects, independent 361/361 and Luna 19/19 pass. Scope is this batch only, not release acceptance. Dark mode, 200% text, Node 22/24 and a full real↔Example round trip remain uncovered. Not merged or pushed.

## RP-5 · Re-record the Example workspace against current main (next serial order)

| Field | Record |
| --- | --- |
| Observed defect | The Example fixture (`web/samples/preview/responses.json`, source `2c7d181`, recorded 2026-09-11) predates the Host's `scope` on work-summary items, so an unassigned/global Example chat reads `Project not resolved` on Home. The first-run surface is the one every new user sees. |
| Responsibility / owner | Example recording (`app/scripts/record-preview.mjs`) over the canonical capture fixture (`evidence/semantic-polish-merge-20260911/capture-fixture.mjs`). Preview layer, Host, adapters unchanged. |
| Nearest precedent | `1397b99` re-recorded the Example from the corrected capture fixture with the same two scripts. |
| Change | Seed a fresh synthetic fixture with `--active none --seed-only --retain`, serve it on an independent port, re-record, and review the fixture diff. No hand edits to recorded payloads. |
| Exit evidence | Home shows no `Project not resolved`; Example chats, Attention, Spark and Usage still render; preview-layer tests pass; manifest records the new source SHA and hash. |

### RP-5 result

- **Seed moved to a current owner.** `evidence/semantic-polish-merge-20260911/capture-fixture.mjs` no longer runs against the Host (`PUT /provider-config` now requires `expectedVersion`). Rewriting historical evidence bytes is not allowed, so the maintained seed is now `app/scripts/example-fixture.mjs` (a copy with imports localized and that one API fix). The same drift broke the documented audit; its current copy is `app/scripts/example-audit.mjs`. The evidence copies are unchanged. `app/docs/example-workspace.md` names the new scripts; Pages media are not recaptured.
- **Recorder walk updated.** The first re-record quietly lost four reads the old one had (Attention item detail, `/runs/<id>`, the working-artifact file, the second project's Spark derivations) because `record-preview.mjs` still drove the pre-06d card launchers. The walk now uses the current controls: `home:attention:` rows, the Preview tab, each `.artifact-thread-row`, Measurements → Inspect run, and Spark Source maintenance for every project. The final recording (source `b46ddf8`, 34 answers, 72 ids) is a superset of the previous one plus review summaries.
- **RP-2 withdrawn at its owner.** All three bound Example chats now have recorded `available` review summaries, so the RP-2 exclusion would hide real Example content. It is removed; the Example shows `Inbound NDA — Project Cedar · 1 pending · Review`, and Review opens the recorded playbook workspace.
- **Live check** (fresh Host, 1440): Home rows read `Project Cedar review`, `Northside housing ledger`, `Global Attention` (no `Project not resolved`); five Example chats, their Preview, recorded file, Inspect run, review Open and Attention show no error text.

### RP-6 · First Home Send was not sent (release blocker, found during RP-5)

| Field | Record |
| --- | --- |
| Observed defect | Actual `main@10c364e` on fresh data, with and without the Example: Home → first instruction creates and selects the chat, then shows `No messages yet` with the draft kept. No `POST /sessions/<id>/runs`. A second Send admits normally. With the Example open, it therefore never closes. A DOM observer captured the transient `Reading this chat's agent… Not sent.` |
| Root cause | `submitHomeRun` selects the new chat and calls `submitSessionRun` immediately. The E1 gate (`agentChoiceGate`) holds Send while that chat's Agent read, started by the selection render, is still loading. Present since E1 integration; not caused by RP-1 (reproduced on unmodified main). |
| Responsibility / owner | Home → Chat hand-off in `app.mjs` `submitHomeRun`; E1 gate and controller unchanged. |
| Nearest precedent | E1-R1/R3: Send is held only for the current chat's own unsettled or failed reading; the hand-off simply waits for that reading. |
| Change | `await agentChoice?.load()` before `submitSessionRun`. A failed read still holds Send with its reason; the page's earlier read is discarded by the controller's existing epoch guard (one extra runtime-control GET). |
| Evidence | Branch, fresh Hosts: with the Example open, one run admitted and completed on the first Send, the Example closes with `established`, and no `Not sent` is observed; with the Example closed, one run and the draft cleared. New `agent-choice` regression (19/19): with the page's read still out, the awaited `load()` releases the hold and the late read does not reopen it. `example-audit.mjs` 17/17 PASS, including `3-first-run-closes-example` and `5-admitted-run-closes-example-after-provider-failure` (the audit's old flow also needed the current Home-first chat creation and the RP-3 pill rule; counter-check without the fix below). |

### Found during RP-5/6, not changed

- **Spark Explore on an Example chat** shows `Source scope unavailable`: `subagent-view.mjs` reads `/subagents/source-directory?sessionId=<example id>` from the real Host, which refuses with `spark_scope`. Same class as RP-1; candidate next slice.
- **Home Attention in a mixed list** once read `Attention unavailable. Retry` after a real project was added beside the Example (fresh Host, 1440). Cause not yet reproduced or isolated.

### RP-5/6 verification

- Counter-check: the same `example-audit.mjs` with only the RP-6 line removed fails `3-first-run-closes-example`, `3-reload-established`, `3-reopen-after-established` and `5-admitted-run-closes-example-after-provider-failure`; restored, 17/17 PASS.
- Full app suite on the branch: 1670/1670 (Node 25.9). An earlier run, with six extra synthetic Hosts running, hit one `review-core-client-lifecycle` bridge-ready timeout; it did not recur on the quiet rerun and is recorded as load-sensitive, not changed.
- Not covered: dark mode, 200% text, Node 22/24, a repository-bound or prepared Home start, and any Pages media recapture.

## RP-7 · Spark Explore offers only real chats while the Example is open

| Field | Record |
| --- | --- |
| Observed defect | Fresh Host, Example open, Spark → Explore shows `Source scope unavailable`. Its Task conversation list reads `/sessions` through the Example layer, so it lists only Example chats, then reads `/subagents/source-directory?sessionId=<example id>` from the real Host, which refuses with `spark_scope`. Starting a real Spark task under an Example chat could never succeed. |
| Responsibility / owner | Spark Explore view (`web/subagent-view.mjs` `directory()`); Host subagents owner and preview layer unchanged. |
| Nearest precedent | `loadRecentSessions` reads `/sessions` with `bypassPreview` while the Example is open, so Recent lists only the person's own chats. |
| Change | The Task conversation list reads the real `/sessions`. With no real chat the picker is empty and Start creates the existing `Spark tasks` chat, as it already does. |
| Exit evidence | Example open: no `Source scope unavailable`, no source-directory read for an Example id; mixed list offers only real chats. Example closed: unchanged. |

### RP-7 result

Fresh Host, 1440: with only the Example, Spark Explore shows an empty conversation list, no `Source scope unavailable` and no source-directory read; after a real chat is added it offers only `Renewal terms` and reads its sources. New `subagent-recovery-view` check (6/6): every `/sessions` read from the directory uses `bypassPreview`.

## RP-8 · Example IDs must be object identifiers, not route words

| Field | Record |
| --- | --- |
| Observed defect | Fresh Host, Example open, create a real project, then New chat in it: Home's Attention module reads `Attention unavailable · This part of the example was not recorded`, and no `/attention/query` reaches the Host. |
| Root cause | `record-preview.mjs` collects Example IDs from every `id`-like key and from path segments after `/sessions`, `/runs`, `/attention`. The set therefore holds `query`, `conversations`, `local`, `inbound-nda`, `agent:general`, `tool:*`, `plugin:*` and similar (main's recording has the same class). `preview-layer.mjs` `isExamplePath` matches IDs as substrings, so any work-route path containing one of those words is treated as an Example object: the real project's `/attention/query` became a 404 "not recorded", and real writes whose path contains such a word would be refused as Example writes. |
| Responsibility / owner | Example recording's ID collection (`app/scripts/record-preview.mjs`). The preview layer's matching rule stays; it is correct for real identifiers. |
| Nearest precedent | The layer's own contract (`app/docs/example-workspace.md`): it refuses writes aimed at example objects, and mentioning an example is not a write. |
| Change | Collect only Host-generated object identifiers: UUIDs, prefixed UUIDs (`matter-`, `source-`, `capture-attention-`, `capture-fixture-response-`, …) and 64-hex `candidate-` IDs. Re-record. |
| Exit evidence | The recorded ID set contains no route words or resource names; the Example-open mixed Home reads real Attention; audit and preview-layer tests pass. |

### Non-author review of `f639644`/`69412b3` and disposition

Sonnet non-author review: RP-6 mechanics confirmed (the load targets the selected chat; the controller epoch discards the page's in-flight read; one extra GET). RP-5 recording is a structural superset (26→34 entries); RP-2 removal degrades to the existing "not recorded" message if a future bound Example chat lacks a summary. Independent 35/35.

- **RP-6 navigation window — adopt.** The await sat after `submitHomeRun`'s last navigation check, so moving to another chat during the read could let `submitSessionRun` act on that chat's draft. The await now sits directly after `selectSession` and before the existing check, which again covers the whole hand-off; only synchronous work remains between the check and Send.
- **RP-6 test scope — adopt as stated.** The controller test proves the double-read pattern is safe, not the hand-off itself (`app.mjs` is not importable by tests). The hand-off evidence is the audit counter-check (4 failures without the line, 17/17 with it) and the live checks.
- **Local paths in the recording — adopt.** `sessions[].workspaceDir` and `hostSession.path` carried the recording machine's temp path (with the username). The recorder now rewrites the seed's data directory to `/example-data` and refuses to write a recording that still has a local absolute path; the current recording has none. Local commit `f639644` still contains the old file; squash on merge so it does not enter main's history.

### RP-8 result

Re-recorded (34 answers, 27 IDs; every ID is a UUID, a prefixed UUID or a `candidate-` hash, and every ID in recorded paths and the story is kept). Fresh Host, Example open, real project → New chat: Home reads real `/attention/query` from the Host, no `not recorded` error. preview-layer/subagent/agent-choice/work-review tests 41/41; audit 17/17.

Full app suite after RP-6 correction, RP-7 and RP-8: 1671/1671 (Node 25.9).

### Parent review of `e548a6a` · RP-6 hand-off not locked — adopt, rework

Parent acceptance held the batch: while RP-6 waited for the Agent read (`app.mjs` `submitHomeRun`, after `selectSession`), the page was already in Chat and nothing was locked. With the new chat's `runtime-control` response delayed, editing the still-editable composer from A to B without pressing Send made the eventual `/runs` carry B; Work location path/Connect were also usable. Cross-chat protection held. RP-5/7/8 passed; independent targeted 86/86.

**Rework.** The wait moves out of the Home hand-off into the Run pipeline's existing lock. `agentChoiceGate` now marks the one hold that is only a wait (`reading: true`: this chat's own read has not settled and there is no snapshot). `submitSessionRun`, on such a hold, first takes the pending-Run command fact it already uses for admission (composer read-only, Send disabled, Work location `RUN_SENDING`) with the text and draft revision captured at Send, then awaits `agentChoice.load()`, then applies the gate to the settled reading:

- ready → the captured text is sent with the fresh `runtimeSelection`;
- refused (failed or incompatible read) → the pending fact is released, `<reason> Not sent.`, the draft is kept and editable;
- the person left the chat during the read → released and not sent, with the draft kept in its own chat.

The Agent chooser cannot change the selection meanwhile, because `choose()` already requires a ready snapshot. File access, previously locked only for an active Run, is now also locked while a Run is pending: the chat card and Settings pass `active` for a pending Run, and the chat card's handler refuses at click time. The same path now also covers pressing Send in any chat whose read is still loading, which used to be dropped with `Not sent`. The Home hand-off keeps only synchronous work between its navigation check and `submitSessionRun`.

**Evidence (actual delayed read).**

- Live, fresh Host, with `runtime-control` held by a page `fetch` wrapper: in Chat during the hold, typing (Cmd-A, type B) leaves `A`; Work location shows `Your message is being sent with this location…` with folder, path and Connect disabled; File access reads `Available after this run ends.` and a click sends no `permission-mode` request. On release, exactly one `/runs` with `A` and a `runtimeSelection`.
- Failed read: no run, `The agent reading failed: Synthetic read failure Not sent.`, draft kept and editable; Retry then Send admits it.
- Leaving for another chat during the hold: no run; the draft stays in its chat, unlocked; the other chat is untouched.
- `example-audit.mjs` section 7 repeats this in headless Chrome (CDP `Input.insertText`, radio click, location controls, release, failure): 20/20 with the rework. Counter-check with `e548a6a`'s `app.mjs`/`agent-choice.mjs` swapped in: `7-held-read-locks-the-send` fails (`perm:1`, composer `A … B`, location unlocked) and `7-held-read-sends-the-captured-text` fails (`/runs` carries `A … B`), matching the parent's reproduction.
- `agent-choice` 19/19: the reading hold is flagged and a failed read is not.

Full app suite after the RP-6 rework: 1671/1671 (Node 25.9).

### Parent review of `76bdfb2` · leave-and-return still auto-sent — adopt

Parent review: captured text, input/location/permission locks, failed-read release and Retry pass; but holding S's Agent read, going to T, returning to S, then releasing the return read before the original, auto-submitted A. After the wait `submitSessionRun` checked only that S was the active chat, so a navigation away and back during the wait was missed.

Correction: after the wait the Send also requires the navigation ticket it registered before waiting (`guardAdmitNavigation(focusTicket)`). Any navigation during the wait, including away and back, releases the pending command, keeps the draft and says `The chat was left before its agent was read. Not sent.`

Evidence: `example-audit.mjs` adds `7-away-and-back-does-not-send`, which repeats the parent's order (hold, leave, return, release the return read first and the original last). With `76bdfb2`'s `app.mjs` it fails (`/runs` carries A3, draft cleared); with the correction 21/21 PASS.

## Parent acceptance and integration · 2026-09-25

Parent accepts RP-6 at `25e824b`: leaving and returning with the reads released in the reported order submits zero runs, the draft stays editable, and only an explicit Send sends. Independent targeted 63/63 on the combined tree; Luna narrow review 52/52. RP-1–8 are integrated into main as one squash commit of `claude/ux-polish-20260924` (the intermediate commit with recorder temp paths does not enter main's history). Not pushed.

Ended-tree preservation and cleanup: [receipt](evidence/ux-e1b-integration-20260925/README.md).

## 2026-09-28 · GUI governance / UX polish lane reopened · read-only pre-check

The user reopens original Claude's GUI governance/UX-polish lane under this record. Astra holds core Host/Runtime in its own tree, and the Hermes refusal stands. This round is read-only: no product, global CSS or design-rule writes, and no computer-use. Astra captures current screenshots with its own browser and then rules on construction. No second roadmap.

**Exploration.** A real Sonnet Explore (`claude-sonnet-5`, 20/20 tool calls) read main `78a1b432ac7bd5c18aa7c580d1fd7cf3d27ae97a` in the order UX Grammar → frontend contract → visual-spatial grammar → `design/sources.md` → this record. It fetched no external page. The external precedents it recalled are only those already recorded in `design/sources.md` and `visual-spatial-grammar.md`: Design Scout S18/S19 (topology only), S20 interaction grammar (Base UI NumberField core-verified; the Braintrust three-view split recorded as not holding), S21 method-only, W3C APG Tabs, and WCAG 2.2 target size. It reported no versions beyond those records.

**Four newest sub-surfaces.** Symbols were checked by the author at the same HEAD.

| Surface | Current symbols | Acceptance on record | Real difference from accepted precedent |
|---|---|---|---|
| Settings → Agents / Runtimes reader | `runtime-inventory-view.mjs:createRuntimeInventoryView`; `agent-profiles-view.mjs:createAgentProfilesView`; `settings-view.mjs` | `evidence/runtime-settings-i1-final-20260927` (RFS-R1/R2 accepted) | None. It is the reading-role reference: 15px reading, 11.5px meta labels, 28/44px controls. |
| K5 profile / Kit source editor | `profile-editor-view.mjs:createProfileEditorView`, `describeDiagnostic`; `styles.css:6392-6400` | `evidence/kit-profile-editor-final-20260924` | Source-inferred: none. The source textarea uses `--text-body` (14px, control/code editing), the candidate preview uses `--text-reading` (15px), and labels use `--text-meta` (11.5px) (`styles.css:399-404`), which matches the role split. Sonnet's "possible drift" was unresolved in its budget and is not supported by the source. |
| B2 request disclosure | `run-rows.mjs:appendRequestSummary`, `appendToolDetails` | `evidence/request-details-b2-20260928/parent-review/README.md` (accepted) | None. Same `h4.tool-detail-heading` + `dl.data-list` anatomy as DF-04 `appendCheckDetails`. Sonnet's "author-only" doubt is answered by the parent-review record. |
| Preview / prepare | `preview-tabs.mjs:createPreviewTabs`, `renderPreviewTabs`, `installPreviewTabKeys`; `preview-layer.mjs:createPreviewLayer` (Example preview) | `evidence/tabbed-preview-final-20260922` (PV-R1 accepted); preparation in `prepare-final-integration-20260921` | No source difference found. That acceptance itself leaves real zoom, reader, forced-colors, touch and native-shell checks open, and assigns density, narrow/coarse mapping and native Back/Forward to separate Design owners. These are recorded open items, not observed defects. |

**Candidates for Astra, none assumed a defect before capture:**
1. Preview/tabs: the open PV-R1 checks (200% zoom, forced colors, narrow/coarse). Owner: tabbed-preview record. Precedent: the visual-spatial grammar's normative floor.
2. A cross-surface consistency pass after capture, on Save/modified/reset, Unknown/unavailable, retry and focus return, against UX-01–06 and the Properties anatomy. It should touch only the surfaces where a screenshot shows a concrete mismatch.

**Synthetic capture paths**, all on an isolated Host with a temporary data directory and the loopback fake provider; 1440×900 and 390×844, light and dark:
- Settings → Runtimes / Agents: the reader with one supported and one unreadable/unsupported report.
- K5: import one synthetic profile at Session scope, open the source editor, make one long requirement wrap, cause a revision conflict, then Save using only the keyboard.
- B2 (corrected from Sonnet's list):
  - `repo_list` with `src`, with `../outside` (`invalid_path`), with `src/a\u0001b` (`unsafe_display`), and with a path over 256 code points (truncated).
  - A path over 1000 characters produces `invalid_path`, not `run_limit`.
  - `run_limit` needs more than 32 summaries in one Run, which the 32-call fixture script cannot reach through the GUI.
- Preview: open two or more tabs, close the active tab and then an inactive one, reopen, use the keyboard tab keys, and at 200% zoom.

**Open for Astra:** whether "prepare/Preview" means the tabbed file preview, the Example preview layer, or the preparation/approval surface.

No product write, browser run, deployment, credential read or Hermes retry.

### UX-B2-READ · author result · 2026-09-28 (Claude, Opus)

Implements the leased correction from `0c79d7e`. Source commit `656d8a1`, in the existing isolated tree, which also carries this record's earlier pre-check (`dfb6cec`). `app/web` is identical between that tree and `0c79d7e`, so the only overlap is this record's end, and Parent keeps both sections when merging.

- **`app/web/run-rows.mjs` `appendRequestSummary`:** the summary's `dl` gets `data-list request-summary-reading`. Terms, values, wording and the h4 are unchanged.
- **`app/web/styles.css`:** a scoped rule after the `.runtime-inventory-reading` precedent: `.data-list.request-summary-reading { align-items: baseline; }` and `… dd { font-size: var(--text-reading); line-height: 1.6; }`. This covers the path value, the truncation note ("Shown") and the omission explanations. `dt` labels keep the `.data-list` metadata size, and existing `overflow-wrap: anywhere` wrapping is kept. Global `.data-list`, check details, Result, Inspector and controls are unchanged.
- **Grammar applied:** UX-02/07/08/09 reading/review role and the nearest precedent, Runtime detail `.data-list.runtime-inventory-reading` (RFS-R2), with existing tokens only.

Author checks:
- `tools/lint-interaction`, `lint-colors`, `lint-materials`, `lint-shapes` and `lint-spacing` pass.
- request-summary, run-rows, material-governance and check-ui pass 24/24 ([log](evidence/ux-b2-read-20260928/targeted-tests.txt)).
- `git diff --check` passes.
- No new CSS-literal test, full suite or browser run. Parent owns the fixed 1440/390 screenshot comparison and the accessibility matrix.

No other current screenshot defect was reported, so the scope is not expanded. Writer released.
