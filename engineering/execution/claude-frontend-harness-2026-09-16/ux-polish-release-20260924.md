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


## 2026-09-28 · New-surface continuity audit opened

At inspected main78a1b43 the user assigns original Claude independent frontend/backend consumption and UX polish/governance while Astra owns critical core boundaries. The original Claude conversation has received this lane and dispatched a real Sonnet Explore for bounded source/precedent recall. Scope: production Settings Agents runtime inventory, selected imported Kit profile editor, B2 tool-request disclosure, and nearby preparation/Preview. Existing accepted behavior and writer history remain; only a new reproduced deviation may reopen a concrete seam.

Astra uses the current in-app browser on an independent synthetic Host prepared by Sol, saving current-run screenshots and measurements before any visual finding or product lease. The audit consumes UX Grammar, frontend contract, visual/spatial role map and only the related Design Scout/precedent entries. External W3C resize/reflow/status guidance is reference context, not a pixel scale or proof of conformance. Role/token, text/pointer assumptions, semantic states, keyboard/focus/recovery and full composition are recorded per surface. Sonnet source suggestions remain hypotheses until corroborated; no whole-site restyle, global token migration, new UI surface, permission/state reinterpretation or new ledger is authorized. A bounded implementation lease follows the concrete findings under this same owner, with Claude writing, Luna independently reviewing and Astra integrating. No new or reused author screenshot is independent acceptance.


### B2 summary reading-role correction · screenshot finding UX-B2-READ

Astra captured current synthetic main78a1b43 in the in-app browser at1440×900 and390×844, normal text scale/fine pointer. [B2 wide](evidence/ux-continuity-20260928/04-b2-1440-before.png) and [narrow](evidence/ux-continuity-20260928/05-b2-390-before.png) show complete omitted-path explanations rendered with metadata weight/size. DOM measurement gives11.5px/17.25px for the primary `dd` values, while the accepted [Runtime detail](evidence/ux-continuity-20260928/02-runtime-detail-1440.png) precedent measures15px/24px. This is a newly measured cross-surface reading-role adjustment, not a backend defect or claim that historical B2 acceptance covered full typography.

**Adopt and release to original Claude:** keep the request summary in the existing shared disclosure; give only its primary values, truncation and omission explanation the established reading role (`--text-reading`,1.6), with baseline alignment and existing wrapping. Labels remain metadata; controls retain existing28px desktop/44px narrow/coarse conventions. Nearest precedent: `.data-list.runtime-inventory-reading` and `appendRequestSummary`; affected UX-02/07/08/09, reading/review role. Reuse current tokens and anatomy, with no new page, field, event, wording, permission or state. Lease only the summary's scoped class in `app/web/run-rows.mjs`, corresponding narrowly scoped rule in `app/web/styles.css`, and author evidence/subsection of this record. Do not change global `.data-list`, check details, Result text, Inspector, Host or other workers' files.

Run existing request-summary/run-row checks and appropriate CSS/interaction checks; no new test that only mirrors a CSS declaration and no full application rerun for this isolated visual adjustment. Parent will independently compare current fixed screenshots at1440/390 and normal text scale, check long-value wrapping and unchanged adjacent detail, and record the remaining accessibility matrix. Product source stays isolated; no user Host restart, paid provider, native Hermes execution or deployment.

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


**UX-B2-READ parent acceptance · 2026-09-28.** [Current screenshot audit](evidence/ux-continuity-20260928/README.md) accepts656d8a1/619a20f: fixed1440/390 measurements15px/24px with11.5px labels, actual long-path truncation/wrapping, parent16/16 and Luna scoped-source review. Runtime/K5 behavior is retained at its measured role split, not globally restyled. Original Sonnet precheck is source recall only; cross-surface acceptance uses the new screenshots. Remaining accessibility/error matrices are explicit in the packet.

### Deferred surface simplification · user direction · 2026-09-28

The user reports excessive visible text and unnecessary controls across current UX, and requests a later consolidated pass after the active engineering dogfood closure. Original Claude retains frontend authorship; Astra owns the cross-surface contract and independent acceptance. This is registered work, not a claim that every surface has been audited.

Start from each subpage's user task, expected decisions and resulting state. Keep controls that serve that task; remove redundant explanation, consolidate repeated actions and disclose implementation detail only when it supports a decision. Use the existing UX grammar, frontend precedent index and visual-spatial grammar rather than a global density or text-removal rule. Preserve necessary permission, failure/recovery and state information. The next pass should capture current surfaces, inventory each visible control/text by purpose, and record keep/remove/move decisions in this owner record before implementation. Models configuration is a concrete starting observation: choosing Provider/Model and saving a credential required separate actions during this exercise. Evaluate that flow without exposing credentials or assuming the user's report establishes a specific source defect. This pass is queued after the active engineering closure; it has not started and introduces no new approval gate.

## 2026-09-28 · Next UX round · read-only text/control inventory (source-inferred)

This is a read-only inventory at main `3898f31` (plus the candidate-diff scope-note seam, `68e2c08`), using UX-01/02/03/04/06/09, the frontend contract's Properties anatomy and the visual-spatial surface roles. A real Sonnet Explore (`claude-sonnet-5`, about 19 read-only calls) read the source, and the author settled two of its open questions from source. **All items are source-inferred.** No visual, size or layout claim is made. Astra's current screenshots set the construction boundary, and nothing is edited here.

| Page · task | Keep (reason) | Candidates (rec · rule) |
|---|---|---|
| **Models** · connect a provider and choose the model a chat uses | Connection summary line; in-force `capability.notice`; "Save and ask once…" consequence line beside its buttons; Advanced disclosure note; protocol-unavailable notice (UX-01/02/04) | Needs a screenshot: the `#settings-runtime-environment` mount on this page, whose content wasn't read. |
| **Agents** (profiles + read-only runtime reader) · choose/edit the agent profile future Runs use | Role/Kit/runtime definition line; requested-vs-granted and not-acceptance sentences; "Requested:" draft summary (frontend-contract requested/effective/bound) | None. |
| **Runtimes** (reader inside Agents) · see reported runtimes and their declared capabilities | Empty/unknown distinctions ("reports no…", "Not reported…", "Declared, not checked live") (UX-01) | None in the reader. The runtime management panels (`runtime-view.mjs:createRuntimeView`: overview, composition, environment, capabilities, instructions, permissions, plugins) were **not read**, and need a follow-up source read plus screenshot before any recommendation. |
| **Developer** · manage host extensions, runtime composition and info | Scope line; "Only host-trusted extensions load…" warning; extensions help with its Plugins cross-link; "Unavailable capabilities" disclosure. The refresh button's name is set to "Refresh extensions" (`app.mjs:7367`). | **Naming overlap** (screenshot first): "Runtimes" (host inventory under Agents), "Runtime" (Developer block) and "Runtime info" name three different scoped objects. Candidate: REWORD the Developer headings to name their object (UX-01 identify), only if the screenshot shows readers can't tell them apart. |
| **Candidate preparation** (workspace card) · connect a read-only folder and start/stop a private candidate | "Which is which" disclosure; separate repository/candidate/prepare helper lines; separate "Connect folder…" and "New project…"; "Review changes" button. These follow the accepted 01 dimension-separation ruling. | None. The same sentence, "Available after this run ends.", is shared with the connection card, which is deliberate shared vocabulary. |
| **Candidate diff** · read the candidate's exact diff against its base | Title plus base/revision heading, loading, empty state, per-file path/status/bytes, Host scope note, patch hash with copy (UX-01/02; 02 record) | None. |

**Cross-page candidate.** The chat connection card's "Connections" row is an action button that closes the popover and opens Settings → Models (`app.mjs:5829`, `settings-view.mjs:455`). It is navigation to an addressable page, not a second connection form. Per UX-03 (Link to an addressable context, Button for an action), consider giving it navigation semantics or wording ("Open Models settings") while keeping the row. It is low priority, and the row should stay.

**Proposed order after screenshots:** (1) the unread `runtime-view` panels and the Models environment mount, where most remaining text density is likely; (2) the Developer "Runtime" naming overlap; (3) the connection-card navigation semantics. No REMOVE candidates have enough evidence yet. The Agents, candidate preparation and diff pages look disciplined in source and should be left alone unless a screenshot shows a concrete problem.

## 2026-09-28 · First UX simplification · author result (Claude)

Contract: [scope](evidence/ux-simplification-20260928/scope.md), Astra `ac98a07`, merged into this tree as `bd3f0c3`. Product commit `e7ffd04`. **Disposition of my source-only inventory above: adjust.** Astra ruled that a true statement is not therefore necessary default-page text. Necessity is judged against the page's task, and this slice implements that ruling. Grammar: UX-01/02/04/07/09, the reading/review role plus compact settings chrome. Existing tokens and controls only; no CSS or density change.

**Adopted:**
- **Models** (`runtime-view.mjs` `renderEnvironment`; precedent: the existing `runtime-environment-details` disclosure):
  - The section is now only the existing, closed-by-default "Saved model and host details" disclosure.
  - Inside it: the runtime adapter row and its explanation, the Tools/Permissions/Developer links, then the existing saved model and host facts.
  - The separate "In force" heading is removed. The "not read yet" loading note moved inside the disclosure. Its open state still survives re-renders.
  - Load errors keep their existing place in the runtime view.
  - Model/key saving and the test call are unchanged.
- **Runtimes** (`runtime-inventory-view.mjs`; precedent: the existing Technical detail disclosure and the list/detail reading grammar):
  - The list intro is now "Configured runtimes. Live status is not checked."; rows keep "· live status not checked".
  - Detail "Live status" is now "Not checked".
  - The constant Owner note moved to Technical detail.
  - The repeated "Declared, not checked live" paragraph under "Declared operations" is removed.
  - Configuration, availability with unavailable reasons, default, operation values with unsupported reasons, "Not reported", error/last-good/retry, focus and read-only behaviour are unchanged.
- **Developer:** deferred, per scope.

Author checks:
- `provider-registration.test.mjs` gains a behaviour test: one closed disclosure, the loading note inside, no "In force", adapter/links/facts present, open state kept across a re-render.
- The runtime inventory tests now assert the shortened text, the Owner row in Technical detail, and no repeated paragraph. The existing headless-Chrome Runtimes check against a disposable Host also passes.
- The Settings/Models/runtime/profile suites pass 155/155 ([log](evidence/ux-simplification-20260928/author-targeted-tests.log)).
- The interaction, spacing, colour and material lints pass, as do `check-product-copy`, `check-semantic-consumers` and `git diff --check`.

Parent does the current browser acceptance (compact and default-open states, disclosure contents, narrow/desktop views). This slice does not complete the wider UX pass.


**First-slice independent acceptance · 2026-09-28.** [Current before/after receipt](evidence/ux-simplification-20260928/README.md) accepts original Claude e7ffd04/d79c1c7. Luna independently traces unchanged provider/key save/test semantics, moved facts and retained runtime status/error/capability behavior; no blocker, source-only review. Parent37/37 plus OpenAI actual browser confirms Models default collapse/keyboard expansion/open-state return and Runtime Owner relocation/refresh persistence; actual538 and390/1440 layouts retain content. Safe provider/model/credential-status/Run/candidate projections are unchanged. Adopt the two scoped simplifications, adjust the earlier source-only almost-all-keep assessment, defer Developer hierarchy and model/key save-flow redesign for their distinct contracts. No CSS/token/authority change, paid model call, user8787 restart or all-UX claim.

## User-expanded UX ownership · 2026-09-28

The user now grants original Claude decision and implementation authority for all UX work, with a cohesive product that grows naturally as the governing aim. This supersedes the earlier requirement for Astra to pre-approve each UX construction boundary. Claude may decide page responsibility, information hierarchy, text/control keep/remove/move, interaction and layout, and necessary native SVG icons, consuming the existing Design and implemented precedents. Luna audits the previously registered queue as evidence and gap detection; its audit is not another approval gate. Original Claude retains the serial frontend writer; independent review and acceptance remain separate from authorship.

Use existing UI/icon primitives and canonical geometry first; user-authorized native SVG additions are allowed where needed, with accessible semantics, consistent optics and source/provenance recorded. Do not force every action into an icon or change families solely to restyle. Keep user-facing action, consequence, state and recovery understandable. Resolve routine UX tradeoffs autonomously and record the result in the original owner ticket; do not create a parallel roadmap.

UX authority does not itself change Host permissions, provider credentials, data/schema authority or the earlier native Hermes execution refusal. For a UX decision requiring a cross-layer implementation, Claude states the concrete required behavior and coordinates with the existing core owner, without inventing repeated user confirmation gates. Preserve other writers and use the existing isolated author checkout. Each coherent delivery includes focused behavior checks, Design/precedent consumption, evidence and a review-ready commit; computer-use verification stays with OpenAI. Current main is b1d5023; the latest Models/Runtime and candidate aggregate slices are accepted, not reopened.

### Claude acceptance of expanded UX ownership and prepared queue · 2026-09-28

Original Claude accepts the UX decision and serial-author role recorded above (`0ff3682`, merged into the author tree on top of main `b1d5023`). There is no second frontend writer. Permissions, credentials, data/schema authority and the native Hermes refusal are unchanged.

**Working method for each delivery:**
- Start from the page's real task and existing grammar: UX Grammar → frontend contract → visual-spatial roles → implemented precedents.
- Existing primitives first: `ui-controls.mjs` (`action`, `setAction`, `icon`, `flowRow`, `copyAction`) and the icon family and rules in `design/icon-controls.md` (IC-1–3).
  - Text keeps objects, consequences, state and recovery. Icons only for high-frequency, universal, well-placed actions, with a native `<button>`/`<a>` and an accessible name.
  - A new SVG only when no canonical glyph fits, with its source recorded.
- Each delivery has one owner-record entry: disposition (adopt/adjust/reject/defer), nearest precedent, focused behavior tests, lints, and a review-ready commit.
- Independent review and computer-use acceptance remain with Parent.

**Prepared queue (existing registrations, before Luna's audit):**

| # | Item | Source | Initial disposition |
|---|---|---|---|
| 1 | Developer page hierarchy, profile controls, package instructions | UX simplification scope item 3 (deferred) | First whole-page pass after the audit |
| 2 | Runtime management panels (overview, composition, environment, capabilities, instructions, permissions, plugins) and the "Runtimes / Runtime / Runtime info" naming overlap | Inventory above; `runtime-view.mjs` not yet read | Read, then decide with item 1, since the pages share objects |
| 3 | Chat connection card "Connections" row is navigation shown as an action button | Inventory above (UX-03) | Decide with item 1/2 wording |
| 4 | Object-command menus on Chat list and Attention rows | 09 N-07 | Pending audit |
| 5 | Back-to-latest geometry; `ask_user` prompt selectability | 00-intake:151/152 | Pending audit |
| 6 | Fine/coarse target split for reader chrome | grammar-convergence F2 | Pending audit |
| 7 | Back/Forward shortcuts | 09 | Only if a real supported behavior exists (IC-3) |
| 8 | Preview accessibility items left open by PV-R1: 200% zoom, forced colors, screen reader, touch | tabbed-preview-final README | Pending audit; Parent's browser evidence is needed for acceptance |
| 9 | Home-first Agent choice; bound-Run reading | E1 follow-ups | Pending audit |

Luna's audit will be reconciled into this table (confirm, drop as stale, or add). It is evidence and gap detection, not an approval gate. Accepted slices (B2 reading role, Preview visibility, Models/Runtime simplification, candidate diff note) are not reopened.

**Luna audit → original Claude serial dispatch · 2026-09-28.** [Bounded audit and work packet](evidence/ux-queue-audit-20260928/README.md) separates three construction areas (Developer hierarchy, Models save-flow clarity, connection-card destination) from older unverified queue leads and already-accepted slices. Adopt the audit as source/status evidence, not visual acceptance; Claude owns UX disposition and implementation under the expanded user mandate, including necessary native SVG with existing Design continuity. Older Composer/menu/reader/shortcut/E1 registrations need current verification, not automatic reopening. Original author receives this packet after the completed Luna audit; independent acceptance follows delivery.

## 2026-09-28 · Developer · first unit: read by object (Claude, UX owner)

Audit input: [queue audit](evidence/ux-queue-audit-20260928/README.md), row "Developer hierarchy", **adopted**. Grounding: the current [Developer capture](evidence/ux-simplification-20260928/05-developer-before.png) and the source. Product commit `b2f54a3`.

**Page task.** See and set what this chat's next runs use (runtime and profile), manage the Host's trusted extensions, and read Host diagnostics when something is off.

**Decisions:**
- **Remove** the page-level "Runtime" intro block. It was a heading with no object, followed by two notes, above a second intro line.
  - Its scope sentence **merges** into the chat runtime line, now "What the next run in this chat would use, and what past runs recorded."
  - Its trust consequence **moves** to Host Extensions, the thing it describes: "Only host-trusted extensions load, and they are not sandboxed." The Plugins link stays.
- **Rename** "Overview" to **"Chat runtime"**. It names its object and no longer collides with the Host runtime list under Agents → Runtimes. The Bound-layer hint now points to "Chat runtime › Recorded bindings".
- **Move** "Runtime info" (Adapter, Host state, Tools) into a **closed "Host runtime details"** disclosure beside "Unavailable capabilities". These are Host diagnostics, and Adapter already appears in Chat runtime when a chat is open.
- **Keep:** scope tabs and scope details, requested/effective/bound layers, profile selection and package editor, Attention and context summary, recorded bindings, extension intake/list and refresh, unavailable capabilities, and error/retry/last-good reading. Behaviour, geometry and CSS are unchanged.
- **Next Developer units, after capture:** the Chat runtime block's internal density (scope strip, notes, Attention and context all default-open), and the package editor's long notes. They're left for a current capture so they aren't cut blind.

**Precedents and grammar:** UX-01 (text that identifies an object), UX-02 (a consequence stays beside its action), UX-09 (zoning by object), the accepted Models/Runtime disclosure reduction (`e7ffd04`), and the Runtimes Technical-detail pattern. Existing primitives only (`settings-block`, `details`/`summary`, `blockTitle`).

**Author checks:**
- New `app/tests/developer-page.test.mjs`:
  - on the shipped markup: object order, no object-less heading, the trust consequence with the Plugins link inside Host Extensions, Host runtime details closed with `#runtime-info`;
  - on the real runtime view: the Chat runtime heading, loading, failure with Retry, the reading, and last-good at the stale revision after a later failure.
- Adjacent Settings, runtime, extension, profile and inspector suites pass 130/130 ([log](evidence/ux-developer-20260928/author-targeted-tests.log)).
- The interaction, spacing, colour, material and shape lints pass, as do product copy, semantic consumers, doc links and `git diff --check`.

**Capture needed from Parent:**
- Developer at 538×762 and 1440×900, with and without an open chat.
- Host runtime details and Unavailable capabilities, both closed and open.
- The Host Extensions block.
- Keyboard: Tab order through the page and Enter/Space on both disclosures.

### DEV-R1 · review return · adopt (Claude, UX owner)

Parent's independent review of `b2f54a3` found that Settings opened from Home, with no Session, still showed "Chat runtime" and "…in this chat…". There the view reads only the user layer (no `sessionId`), so that wording implied a chat that doesn't exist. **Adopt.** Fix: `7e66552`.

- **No chat:**
  - Heading "**Default runtime**", with "What new chats start from. Open a chat to see its own runtime and recorded runs."
  - Recorded bindings: "Runs are recorded per chat. Open a chat to see what its runs used." No chips are listed: `getRuns()` is the app's run state and may belong to another chat, so it isn't consulted without a Session.
  - Bound-layer hint: "open a chat to choose one of its recorded runs".
- **Chat open:** unchanged ("Chat runtime", "…in this chat…", its recorded runs).
- User-layer scope, profile, facts, Attention, errors, Retry and last-good reading are unchanged.

**Checks.**
- `developer-page.test.mjs` gains two cases. The null-`getSessionId` case covers: no Session in the request path, a failed read with Retry, then the default heading and line, no "in this chat", the user scope only, no chips even when another chat's runs exist, and the Bound hint. The open-chat case covers "Chat runtime" with its own run.
- The adjacent suites pass ([log](evidence/ux-developer-20260928/dev-r1-targeted-tests.log)); the interaction/copy/semantic lints and `git diff --check` pass.

Parent's capture: the no-chat and open-chat Developer tops at 538 and 1440.

**DEV-R1 check correction.** The first adjacent run ([log](evidence/ux-developer-20260928/dev-r1-targeted-tests.log)) was **73/74**. One failure, `K5-R2: an in-flight save in one Chat/profile slot does not hold another` in `profile-editor.test.mjs`, failed with `release is not a function`. That test doesn't import `runtime-view.mjs`. It waits a single `setTimeout(0)` for the held adapter save to start, and under `--test-concurrency=4` load that can be too short. I reran the suite alone three times (26/26 each) and the same concurrent set three times (74/74 each). The retained [rerun](evidence/ux-developer-20260928/dev-r1-targeted-tests-rerun.log) is 74/74. This is recorded as a pre-existing timing flake for the K5 owner, not a DEV-R1 result or a fix. I committed the first log before reading it; that's corrected here rather than rewritten.

**Developer independent acceptance · 2026-09-28.** [Parent capture/review packet](evidence/ux-developer-20260928/parent-review/README.md) accepts b2f54a3/90d6d32 plus7e66552/9d789de. Parent browser returns DEV-R1 (no-chat Chat runtime wording); original Claude adopts and fixes both heading/record hints, then parent repeats actual no-chat/chat at measured538×762/1440×900 and native disclosure keyboard operations. Fixed39/39 pass; Luna independently reviews correction and corrects its earlier unverified no-session inference. The packet supplies current Host Extensions, closed/open diagnostic and actual Tab evidence for Claude's autonomous next UX decisions. Release the writer to the already-dispatched Models save-flow unit; density/package details remain separate. No paid call/key/extension action or Host restart.

## 2026-09-28 · Models · save-flow clarity and the Models destination row (Claude, UX owner)

Audit rows "Models connection/save clarity" and "Connection card destination": **adopt**. Grounding: the [Models captures](evidence/ux-simplification-20260928/02-models-desktop-before.png) and a trace of the current form. Product commit `1beb385`.

**Page task.** Connect a provider and choose the model future runs use: choose provider → give its key → choose model → save, optionally testing once.

**Decisions:**
- **Move the API key** from a separate form below the save buttons (with its own "API key" heading) to a row right after Provider, before Model.
  - Before, a user saved the model, scrolled down, entered the key, and hit "Save this connection before adding its key" after touching anything above.
  - The key still **saves separately**: its input and Save key belong to the existing credential form through the HTML `form` attribute (the holder is hidden). Enter in the key saves the key, and the connection/model buttons never send it.
  - Receipts and flows kept distinct: "API key saved." / "Saved key removed.", and `PUT`/`DELETE /provider-credential` against the selected connection.
  - A new compatible endpoint's key still travels with the connection save, so that case shows "Sent with this connection when you save it." and no separate key action.
- **Key feedback at the key (UX-04).** Key errors (unsaved change, no saved connection, Host refusal) now appear beside the key, not on the model/connection error line.
- **Key row help replaces the status paragraph.** The three states are "No key saved for this connection. Keys stay on this device.", "Saved on this device for this connection. It is never shown here." and "Sent with this connection when you save it." These absorb "Stored on this device only."
- **Remove the default status sentence** "Saved locally. A model call happens only when you send an instruction." It isn't a receipt, and the call consequence is already stated once under the buttons ("Save and ask once sends one short prompt…"). The active-run lock sentence and the local-test sentence remain when they apply.
- **Keep** "Save and ask once" / "Save only" (explicit test-call intent), the saved-elsewhere conflict error, the active-run lock of every control, credential secrecy (never read back), Add provider/probe/Advanced, and every connection row.
- **Connections rows → "Open Models settings"** in the chat connection card and the model/effort card, with the rows' existing trailing `chevron-right` for a destination. "Add provider" keeps its action wording.
  - **Link semantics: rejected for now.** The row closes its popover and routes through `openSettings({trigger})`, which keeps focus return on Back. A bare hash link would lose that, and `.context-row` has no anchor styling.
- **CSS:** one scoped rule, `.settings-row-control.credential-control { flex-wrap: wrap; gap: var(--space-2) }`, so Save key/Remove wrap under the field on narrow rows. No other density or token change.

**Author checks:**
- New `app/tests/models-save-flow.test.mjs` runs a real disposable Host through the shipped `createSettingsView`:
  - Provider → API key → Model order, with no second API key heading;
  - the key hidden for the in-force local test provider, and its status shown;
  - after Configure DeepSeek, the key and Save key belong to the credential form, the help text is right, the status line is quiet, and exactly the two model save buttons remain;
  - a real key save sends `PUT /provider-credential` and not `PUT /provider-config`, produces "API key saved.", flips the help and connection to configured, and never reads the key back;
  - an unsaved change gives a key-local error, the form error line stays quiet, and no key is stored;
  - a new endpoint shows its "sent with" help and no key actions;
  - the connection card row is "Open Models settings" with a trailing chevron, no form, and its callback.
- The `model-effort` row test is updated to the new name.
- One tiny-dom gap is handled in the test only: input `value` attribute reflection is mirrored before the first read.
- My first build declared the key row after `form.append`, and this test caught it (ReferenceError); fixed before commit.
- The adjacent Models/provider/credential/settings/developer suites pass 105/105 twice ([log](evidence/ux-models-20260928/author-targeted-tests.log)).
- The interaction, spacing, colour, material and shape lints pass, as do product copy, semantic consumers and `git diff --check`.

**Capture needed from Parent:**
- Models at 538×762 and 1440×900 in three states: local test in force, a catalog provider with no key, and one with a saved key (entered by the user or a synthetic key; never a real key in evidence).
- Save key/Remove wrapping at 538.
- The key-local error.
- Keyboard: Tab order, Provider → key → Remove → Save key → Model (the existing button order, primary last), and Enter in the key saving the key.
- The connection card and model/effort card rows.

### MS-R1 · review return · adopt (Claude, UX owner)

Parent's independent browser review of `1beb385` found the API key row with Remove/Save key still showing while Local test was in force. The key row had `hidden=false` and computed `display: grid` ([capture](/tmp/cw-models-review-20260928/local-key-visible-before.png), outside the repository). Parent located the cause: the Settings page search/render reset `hidden = false` on every row and block when there was no query, overriding `lock()`. My form-only tiny-dom test didn't mount the page, so it missed this. **Adopt.** Fix: `aebd712`.

**Root cause and scope.**
- `createSettingsPage.applyFilter` used `hidden` as its own filter and cleared it wholesale. Page selection runs it, so it undid owner-hidden rows from the first paint.
- The unfixed page in real Chrome ([before](evidence/ux-models-20260928/ms-r1-browser-before-1beb385.json)) shows the same class beyond the key row:
  - Context window and Supported effort values (compatible-only) visible on local and catalog paths;
  - the Session block un-hidden with no Session.
- Collapsed runtime child rows (`.runtime-row.is-child[hidden]`) are un-hidden by the same code path.

**Fix: separate the two states.**
- Search owns only `data-search-hidden`, with one `[data-search-hidden] { display: none !important }` rule beside the global `[hidden]` rule. It never writes or clears an owner's `hidden`.
- A row whose owner hid it (itself or an ancestor inside the panel) is not a match, so searching a hidden field's words doesn't reveal it.
- Blocks use the same mark. Panels stay under the page's own tab `hidden`, which the page owns.
- The single-match Enter shortcut also excludes search-hidden runtime rows.
- `lock()` is unchanged. This isn't a per-row re-hide or a CSS-only patch.

**Coverage:**
- New `app/scripts/settings-conditional-browser.mjs` and `app/tests/settings-conditional-browser.test.mjs` run the whole Settings page in real headless Chrome against a disposable Host. The test skips without Chrome, like the Runtimes browser test.
- Steps: local in force; search "key"; clear; switch to General and back; Configure DeepSeek; search "effort"; clear; search "api key"; clear.
- **Before** (`1beb385`): the API key and compatible-only rows show for local, and the Session block shows with no Session.
- **After** ([record](evidence/ux-models-20260928/ms-r1-browser-after.json)): every owner-hidden row and block stays hidden, the DeepSeek key row shows, search filters to the match, and no search mark is left behind after clearing.
- Targeted suites including both real-Chrome page tests pass 123/123 with 0 skipped ([log](evidence/ux-models-20260928/ms-r1-targeted-tests.log)).
- The interaction, spacing, colour, material and shape lints pass, as do product copy, semantic consumers and `git diff --check`.

Parent continues its separate synthetic checks (Enter saving only the key, key-local error, button Tab order, navigation rows).

### MS-R2 · review return · adopt, with the adjacent typed-key fix (Claude, UX owner)

Parent's direct evidence ([capture](/tmp/cw-models-review-20260928/stale-key-error-before.png), outside the repository):
- A saved loopback-compatible connection with no key; an API-format change leaves an unsaved edit.
- Enter in the key correctly shows "Save this connection before adding its key.".
- After Configure moved to the saved DeepSeek connection, that error still showed, implying the new target was unsaved.

Parent later clarified that its earlier "dirty reset" was an inference, not a read of internal state. This record doesn't treat it as verified, and dirty/connection-save semantics are left unchanged. **Adopt.** Fix: `84aaf85`.

**Key-error lifecycle (target-scoped).**
- The error belongs to the key's target, `path|provider`. `keyTargetChanged()` runs at the end of `applyPath` and in the provider change handler. It retires the error only when that target actually changed.
- A background `refresh`/`resetFields` that re-aims the form at the same target keeps a current failure.
- A successful connection save clears the error it resolves.
- Key save and remove failures carry the target they were sent for, and a late reply for an earlier target is dropped. A new failure for the target on screen is always shown, including the unsaved-change error re-raised on the next submit.

**Adjacent typed-key ownership: adopt.**
- A provider change already cleared the typed key; Configure and the path choice did not. A key typed for one connection could therefore stay in the field after switching, and Enter would save it to the new target.
- Both explicit target switches now clear it too.
- The clear is deliberately not placed in `applyPath`, so a background reset doesn't wipe what the reader is typing.

**Checks.** `models-save-flow.test.mjs` covers these with a real disposable Host and a synthetic loopback-compatible connection (the Host's fake provider), no external provider:
- Parent's case: Configure DeepSeek retires the error and clears the typed key; a path change clears the typed key.
- A provider change retires the error.
- On the same unsaved target the error stays while typing and is re-raised on submit.
- "Save only" resolves it, and the key then saves ("API key saved.", configured).
- A held DeepSeek key failure that arrives after Configure OpenAI isn't shown, while a current unsaved-change failure still is.
- With the loopback connection in force, a Host-refused key error and the retyped key both survive `view.refresh()`.

The first two MS-R2 cases fail on `aebd712` and pass with the fix. The refresh case passes on both: it's a guard against over-clearing, which my first draft of this fix did.

The Models, credential, settings and Developer suites, plus both real-Chrome page tests, pass 104/104 with 0 skipped ([log](evidence/ux-models-20260928/ms-r2-targeted-tests.log)). The interaction, copy and semantic lints and `git diff --check` pass.

**Models independent acceptance · 2026-09-28.** [Parent review/capture packet](evidence/ux-models-20260928/parent-review/README.md) accepts1beb385 plus MS-R1 aebd712 and MS-R2 84aaf85 (record0580527). Parent browser found both page-search overriding owner visibility and old-target key error carryover; original Claude adopted corrections and added target/draft/error lifetime guards. Parent initial9/9, search/browser/navigation14/14 and final14/14 pass; Luna source reviews pass with browser limits explicit. Synthetic-only actual UI confirms Provider→key→Model order, native Enter independent key save, key-local error, target-switch clearing,538 wrapping, both Models destination rows and return focus. No real key/inference or backend change. Current screenshots are available for Claude's next autonomous UX prioritization.

## 2026-09-28 · Developer · Attention context line and named repeated actions (Claude, UX owner)

Inputs: Parent's [Developer packet](evidence/ux-developer-20260928/parent-review/README.md) (current no-chat and chat captures, and [tab-order.json](evidence/ux-developer-20260928/parent-review/tab-order.json)), which recorded two observations. **Both adopted.** Product commit `ebb8946`.

1. **No-chat Attention listed nine "… reports health unavailable. Open" rows** for repository and candidate tools.
   - Source: the Host reports those tools `unavailable` and unexposed exactly when no folder or private candidate is bound (`control-plane.mjs` source-repository/candidate descriptors). That's a fact of the context, not a fault, and nothing in it is offered to the next run.
   - **Decision:** a resource that is `unavailable` and not exposed joins one summary line, "N capabilities are unavailable here and not offered to the model: …", with no Open.
   - Unhealthy resources that *are* exposed (or degraded), diagnostics, ask permissions, trust, missing declarations and profile status stay individual entries.
   - The Attention count now counts entries, so the summary counts once.
2. **Repeated verbs without objects in the actual Tab order:** three "Open" buttons, and "Load"/"Invalidate" (plus Unload/Reload) on each extension row.
   - **Decision:** the short visible words stay. Each button gains an accessible name with its object ("Open Docs server", "Invalidate <extension>") per IC-1 and IC-3. Nothing is converted to an icon.

**Precedents:** the Attention "facts that are not healthy and quiet" rule already in `attentionItems`, IC-1 (a name says what it acts on), UX-01. No CSS or layout change.

**Checks:**
- `runtime-workbench.test.mjs`: unavailable-and-unexposed resources become one summary with no target; singular and plural wording; an exposed unavailable resource and a degraded one stay individual; the existing Attention cases are unchanged.
- `developer-page.test.mjs` (rendered): "Attention · 2", "Open Docs server", the summary row with no button, and no bare "Open".
- The extension-row names are in `app.mjs` (not importable), so Parent should confirm them in a fresh Tab walk.
- Adjacent Developer, Settings and extension suites, including the real-Chrome Settings page test, pass 36/36 ([log](evidence/ux-developer-20260928/attention-names-targeted-tests.log)). The interaction, spacing, copy and semantic lints and `git diff --check` pass.

**Capture needed from Parent:** Developer with no chat and with a chat at 538 and 1440 (the Attention block), and a Tab walk through the Attention and extension names.

**Queue after this unit.** The remaining Developer density (scope strip notes, package editor notes) waits for these captures. Next I'll verify the older audit leads against current source before any construction: Composer P1, N-07 menus, Back-to-latest, `ask_user` selectability, reader F2, Back/Forward and E1.

### Older audit leads · reconciled against current source (read-only, 2026-09-28)

A real Sonnet Explore (`claude-sonnet-5`, 20 read-only calls) read the seven leads from the [queue audit](evidence/ux-queue-audit-20260928/README.md) against later records and current source at `79265f6`. The author settled lead 4 from source. **All source-state claims are source-inferred.** No visual defect is claimed.

| Lead | Later record | Current source | Disposition |
|---|---|---|---|
| **P1 narrow Composer density** (`design/chat-flow-2026-09-10/polish-slices-20260914.md`) | Relocation delivered and independently verified (`composer-access-verification-luna.md`, 2026-09-14). The 375px label shrink (`A.` / `Local t…`) was recorded but not changed at line 22 of this record. | `index.html` nests both controls in `.composer-context`; the narrow query only truncates by `max-width`. | Relocation **accepted, closed**. Narrow label density: **open, needs a current 375/390 capture** before any decision. |
| **09 N-07 row menus** (Chat page and Attention rows) | `node-acceptance-20260919.md` (2026-09-19): "still open". | `attachObjectCommands`/`createObjectMenu` are wired only for sidebar Recent/Project rows (`app.mjs`); no wiring in Chat-page or Attention row code. | **Open, confirmed.** Next construction unit (below). |
| **Back to latest geometry** (`00-intake:151`) | None. | `.jump-latest-button` is still absolutely positioned and centred in the reading wrapper (`styles.css`). | **Open**, but the original report's root cause was rejected and no geometry was measured. **Needs a capture** of its position against the composer top across viewport heights before any change. |
| **`ask_user` selectability** (`00-intake:152`) | None. | The live card renders the prompt as a plain flow-row title with no `user-select` restriction. A resolved question renders it as the `<summary>` title of a closed `<details>`, where a click toggles the disclosure, which makes selection awkward in browsers. | **Open, cause unconfirmed.** The resolved `<summary>` title is the leading hypothesis. **Needs a reproduction capture:** live versus resolved prompt, drag-select and copy. |
| **Reader F2 fine/coarse targets** (`grammar-convergence-20260921`) | `disposition-20260922.md`: adopted as a scoped mapping/verification follow-up, with its original severity reduced. | Not re-measured. | Original finding **superseded**. Coarse-pointer verification **open; needs a touch/coarse capture**. |
| **09 Back/Forward shortcuts** | `node-acceptance-20260919.md`: "09 has no shortcuts". | No global history-shortcut handler exists (only surface, list, row and composer keydown handlers). | **Open.** Under IC-3, shortcuts appear only when actually supported, so this is a product decision, not a label fix. **Deferred** behind N-07. |
| **E1 Home-first Agent choice; bound-Run reading** | `06e-role-composer-selection-20260922.md`: "E1-H short contract (draft for parent decision)" with decisions D1 and D2, 2026-09-25, still unresolved. | Contract only; no product edit. | **Open, waiting on a cross-layer decision:** D1/D2 involve Host runtime-control scope. To be raised with the core owner when reached, not built from the UI side alone. |

**Order.**
1. **09 N-07:** give Chat-page and Attention rows the same object-command menu as sidebar rows. It's confirmed open, has an existing precedent (`attachObjectCommands`), and needs no new authority.
2. The capture-gated items (P1 narrow labels, Back to latest, `ask_user` selection, reader F2), batched into one capture request to Parent.
3. Back/Forward shortcuts, and E1 once D1/D2 are decided.

**Older leads · Parent capture evidence (2026-09-28, author dispositions).** Parent's independent synthetic captures (the full packet follows later) settle three rows of the reconciliation table above:
- **`ask_user` selectability: adjust.** Both the live and the answered prompt can be drag-selected and copied, so the original "cannot select" is not a current defect. The remaining friction is that drag-selecting an **answered** prompt also toggles its `<summary>`, as hypothesised above. Candidate: keep the answered prompt's text selectable without toggling, for example by moving the full prompt into the disclosure body with the summary as a short title. It's queued, not built here.
- **Back to latest: closed, no defect.** Stable 12px above the Composer at two viewport heights. The original misalignment is not reproduced.
- **P1 narrow Composer labels: confirmed.** At 375 and 390 the model and permission labels read `A…` / `Local t…`. This is the next construction candidate after N-07's acceptance.

**Reader F2 / Preview coarse targets: measured input (Parent, 2026-09-28), queued.** Under coarse emulation, Back, Hide, Copy and code-copy measure 44px. The **Preview tab-close** measures **24×24**, and the **Version details summary** is **17.25px** tall ([measurements](/tmp/cw-ux-batch-review-20260928/reader-targets.json), [capture](/tmp/cw-ux-batch-review-20260928/reader-touch.png), outside the repository). These go to the reader F2 / Preview follow-up (06d owner) as concrete input, not into the N-07 menu work. They'll be taken up after N-07 and the P1 narrow-label unit.

**Developer Attention / registered-lead independent review · 2026-09-29.** [Actual batch packet](evidence/ux-batch-review-20260929/README.md) accepts ebb8946's unavailable/unexposed summary and object-named actions with parent19/19 and current no-chat/chat538/1440/tab readings. The same packet closes Chat N07-R1/R2/R3 under09. Current evidence adjusts ask_user from “cannot select” to selection-plus-toggle, confirms narrow label truncation, finds approximately12px stable Back-to-latest gaps in two heights, and measures unresolved coarse Preview close24px / disclosure17.25px. Claude retains UX disposition/implementation authority for these original tickets. No new menu/reader work beyond the accepted slice is implied; navigation shortcuts/E1 remain as reconciled, with no new verification.

**Reader coarse targets: delivered** (`b4bfedb`, recorded in the 06d owner). Preview tab close is 44×44 on touch (24 fine); the Version details summary is 28 fine / 44 coarse. Next in my queue: **P1 narrow Composer labels** (375/390 confirmed as `A…` / `Local t…`), then the **answered `ask_user` drag-toggle**.
