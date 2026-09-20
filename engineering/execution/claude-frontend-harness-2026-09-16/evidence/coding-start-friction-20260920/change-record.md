# UI 局部变更记录 · start coding without guessing

Filled per [change-template](../../../../design/agent-interface-2026-09-10/change-template.md).

```text
Task / scope:
  06b, the four finite items: folder/project/write-target readable at the
  decision point; boundary copy measured against behaviour; candidate result
  continuity (count, reading position, focus); 06a list refresh. Nothing else.

Base SHA / branch / isolated checkout:
  a04b9ac056e6f197897702eefeefe4007bba7f9a (integrated main)
  branch claude-frontend-friction-20260920
  /Users/lesprivilege/Projects/.worktrees/courtwork-frontend-friction-20260920
  The persistent main checkout (which serves preview 8899) was read, never
  written; its worktree was not modified and nothing was pushed or deployed.

Writer / reviewer:
  Writer: Claude (Opus 5), sole writer on this tree.
  Reviewer: not this author. Released for Luna's non-author delta review and
  Astra's integration decision.

Owner fact + contract:
  Host stays the authority for binding, candidate, write effect, permission and
  check. Every fact this change displays is a Host receipt already in the
  client's hands: session.repositoryCandidate.writeRevision (Session read),
  repository.write.confirmed .writeRevision (event stream), the
  /repository-candidate/diff reply's writeRevision, session.permissionMode,
  session.projectId. No new route, no new event, no backend ledger, no
  client-side authority.

Semantic / projection / control / placement:
  Semantic — project ≠ connected folder ≠ private candidate ≠ file-access mode;
    they are read side by side and never merged into one permission word
    (RD-006 semantic-reference §1, frontend-contract 任务入口与资源维度).
  Projection — candidateWriteRevision(session, events) is pure: it folds two
    Host receipts for one candidate id and creates nothing. It never lowers a
    count, ignores other candidates, and ignores prepared/failed effects
    because only the confirmation carries a revision.
  Control — the change-folder path issues the existing `bind` command; no new
    command, and the Host's own ACTIVE_CANDIDATE precondition is stated rather
    than worked around.
  Placement — everything stays on the existing Workspace card and the existing
    candidate dialog; the 06a change stays inside the synthetic
    adapter/controller/view. No new surface.

Affected UX rule IDs / persistent text purpose / disclosure level:
  UX-01 — the four readings are the decision's own facts; the longer
    definitions were deleted from the default layer into one disclosure
    ("Which is which") and the page still works without opening it.
  UX-02 — the sentence needed to act stays at the control (the rebind
    precondition, the read/send scope); the rationale is the disclosure.
  UX-04 — the pending list read is reported in the affected region, not in a
    toast, and keeps its screen-reader announcement (role=status, aria-busy).
  UX-05 — "request in flight" is expressed separately from the result; a
    pending read is not drawn as a settled one.
  ui-orchestration-contract, 对象可用性/读取错误 row — directly: "失败留下无提示
    的旧投影冒充最新" and "迟到A结果清B输入" are the two 06a counterexamples.

Action result / feedback / recovery / draft and scope identity:
  Change folder keeps the binding until a bind receipt returns; leaving it
  keeps both the binding and the typed path. A failed bind keeps the typed
  text and the Host's message (unchanged behaviour). The candidate count is
  re-read from the diff receipt when the dialog's read settles, in a separate
  text node, so the patch is never rebuilt and the reading position is kept.
  Focus: each command remembers the field it was started from and hands the
  keyboard to the control that now answers the action.

Nearest precedent: repository path + symbol + evidence + fixed SHA
  app/web/agent-profiles-view.mjs · FOCUS_CHAIN / pendingFocusKey / restore()
    — the destination-chain rule this card now follows.
    evidence/agents-profile-round2-20260920/README.md, accepted at aca21c8.
  app/web/attention-view.mjs · registry() — section + aria-busy + role=status
    for a list being re-read; the loading grammar the 06a list now uses.
  app/web/local-extension-view.mjs — Host path input, inline error, focus
    preserved across re-render (the card's existing precedent, kept).
  app/web/settings-view.mjs · renderConnectionCard / settingsRow — card
    sections and the data-list reading shape, unchanged.

Evidence type: implemented precedent (all four), consumed as reuse entries.
Governance status:
  FOCUS_CHAIN — canonical within 06a's accepted scope; reused, not extended.
  attention-view loading grammar — implemented precedent; its own acceptance
    scope is Attention, so this is reuse of a shape, not a claim about it.
  RD-006 dimension separation — canonical (Astra 裁决 2026-09-12 §1).

Kept relationships:
  The card's anatomy, spacing, type and icon family are untouched; the new
  readings use the same `.data-list` dt/dd, the disclosure the same
  `.repository-path-details`, the change-folder row the same `.context-row`
  with the same folder glyph as Connect folder. The 06a list rows are byte-for-
  byte the same `.settings-row` markup, now inside a bare <section> that adds
  no box of its own. Read-only source access, the approval path, the fixed
  check runner and every command shape are unchanged.

Intentional changes:
  1. Two sentences replaced because they were false (see counterexamples.txt
     CE-3). "Nothing is uploaded" → what the Host actually guarantees, without
     naming or excusing any runtime. "Nothing is read before then" → the
     folder path and Git details are read now, which is why the Branch chip
     beside it exists.
  2. Project and File access become readings on the card.
  3. Change folder… added as a path through the existing bind command; it is
     withdrawn, with a reason, while a candidate exists.
  4. The candidate write count becomes a projection of two Host receipts
     instead of one cached field, in the card and the dialog heading.
  5. Focus after a card command goes to a named destination.
  6. The 06a list says when its read is out, keeping the rows and the anchor.
  7. openProfile retires the list read it navigated away from.

New terms / roles / tokens / primitives / dependencies: none.
  No new CSS token, class, icon, colour, z-index, animation or dependency.
  One new exported pure function (candidateWriteRevision), one new
  card-internal FOCUS_CHAIN constant, two new data-repository-field values
  ("change-folder", "keep-folder", plus "roles-summary" on the disclosure).

Reuse / variant / grammar gap decision:
  Reuse throughout. No grammar gap was claimed and none is proposed.

Skin / review / deterministic semantic color impact: none. No colour, material
  or elevation changed; the diff's single-red change language is untouched.

Exceptions: none.

Fixture and setup command (synthetic; no personal data):
  node app/scripts/prepare-coding-dogfood.mjs --root <instance>
  node app/server/index.mjs --data-dir <instance>/runtime-data --port 8912
  CW_SPECIMEN_PORT=8913 node app/scripts/agent-profiles-preview.mjs
  Two synthetic Git folders under <instance>; Local test provider; no key.

Affected scene + nearest adjacent scene + full composition:
  Workspace card (bound, bound+candidate, draft on Home, change-folder path);
  adjacent: the composer context strip and the chat overview that opens it;
  full composition: the whole coding journey, folder → send → candidate →
  approved write → check → diff → reload, plus the 06a Settings page.

Viewport / scheme / keyboard / failure / zoom / fallback coverage:
  1280x900 light and dark; 375x812. Keyboard: focus measured across Start
  private candidate, Stop edits, Change folder, Connect (real browser,
  document.activeElement). Failure/empty/in-flight: no-Git folder, rebind
  blocked by an active candidate, list read pending, list empty after a
  scenario change, late reply behind a navigation. NOT covered: 200% native
  zoom, screen reader, forced-colors — see checks.txt.

Checks: exact command, exit/result, output/evidence path; not-run and reason
  See checks.txt. Summary: 12 new seam tests pass; the three existing owner
  suites 33/33; lint-interaction, lint-colors, lint-materials, check-doc-links
  all ok; full suite 1289 pass / 0 fail.

Visual change: before/after at fixed SHA; candidate baseline paths
  Before: evidence/real-dogfood-20260920/08-host-diff.png ("0 writes" over a
  one-line patch) and 02-candidate.png (the card without Project/File access
  and without a change-folder path), both at their recorded SHAs.
  After: browser/journey.md §2 and §5, as verbatim DOM and heading captures.
  No candidate baseline image is offered and none is proposed as golden.

Author checks: as above; all by this author, on this tree.
Independent review: not run. Released for Luna's non-author delta review.
Remaining work / accepted-baseline decision:
  Two explorations recorded in exploration.md, neither implemented: (A) start a
  private candidate before the first inference — Host semantics verified to
  exist already, smallest frontend change proposed; (B1) candidate revision in
  approval details — payload already carries it, frontend change proposed;
  (B2) request arguments for a pending tool call that opens no approval —
  returned to Astra as a Host projection gap. No accepted baseline is claimed
  by this delivery.
```
