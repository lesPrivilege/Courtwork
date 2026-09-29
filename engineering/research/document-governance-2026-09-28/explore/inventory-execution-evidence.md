# Inventory: execution / release / mvp / migration / evidence / docs / site / brand / benchmarks / tools / tests

Read-only exploration. Checkout: `<checkout>`, HEAD `ffe68fb` (branch main; identical HEAD in the primary checkout). Nothing in the repository was modified; only this file was written. Analysis scripts are in the scratchpad (`reach.py`, `stats.sh`).

## 0. Method and legend

- "files" = tracked/on-disk files under the package (`find -type f`). KB = `du -sk`. README = has `README.md` at package root.
- "reach" abbreviations: `exec-R` = engineering/execution/README.md, `eng-R` = engineering/README.md, `ev-R` = evidence/README.md, `docs-R` = docs/README.md, `app-R` = app/docs/README.md, `cur` = engineering/current.md. Matching is textual (`grep` of the `dir/name` token). "rules" = mentioned in a set of rule/contract docs (architecture, verification, core-contracts, architecture-runtime-canon, decisions, governance, product-direction, roadmap, AGENTS.md, README(s), brand/CONTRACT, site/README, tools/README, docs/*, app/docs/*, docs/runtime-control/*, docs/work-core/*).
- "/Users/": file contains a literal `/Users/...` path (444 occurrences in scope, essentially all `/Users/lesprivilege`; 3 `/Users/fixture`, 1 `/Users/me`). "big" = a single file over 500 KB. "raw" = raw conversation/transcript/zip inputs.
- effect values: current-contract | active-work | accepted-history | superseded | generated | frozen-input | unknown.
- Caveat: "effect" is derived from the packet's own text plus current.md/evidence cross-references; I did not re-verify acceptance claims. Anything I could not establish is marked unknown.

## 1. Headline findings (read these first)

1. **engineering/current.md is a 314 KB, 1567-line, 308-section newest-first ledger** (2026-09-29 at the top, 2026-09-11 at the bottom, plus ~56 undated topic sections). It is both "current status" and the archive of everything before it. `evidence/README.md`, `engineering/README.md`, and `execution/README.md` all defer to it, so it is the main reachability path for most packets (see reach columns), and also the main thing readers must not be forced to read in full.
2. **The "two similarly named dirs" are not two tracked packages.** `engineering/execution/claude-frontend-harness-2026-09-16/` (tracked, 1829 files, 51.7 MB) is the packet. `claude-frontend-harness-20260916` is (a) the *worktree/branch label* used in prose ("施工树 `claude-frontend-harness-20260916`" in verification.md line 74, 09-navigation-commands.md, 00-intake.md, node-acceptance-20260919.md, etc. — 10 tracked files mention it) and (b) an **empty untracked stray directory** in the primary checkout `<primary checkout>/engineering/execution/claude-frontend-harness-20260916/evidence/runtime-load-recovery-20260927/` (0 files, created 2026-09-27 09:49; the real tracked packet with that name is `claude-frontend-harness-2026-09-16/evidence/runtime-load-recovery-20260927/`, 13 files). It does not exist in the HEAD checkout. Git does not track empty dirs, so it never reaches readers; it is a leftover from a mistyped `mkdir -p`. Not touched (read-only task).
3. **The CFH packet README top-of-file "Current" lines are stale.** It opens with `Current continuation (2026-09-24): K5 selected-profile editor accepted ... no active author or new product lane is claimed. Manual Claude relay remains available.` while current.md's top entries are dated 2026-09-29 and record E1-H (09-25), streaming Order 3 (09-26), Hermes/Runtime-settings (09-27), dogfood review/Models/Developer/UX batches (09-28), reader touch targets and Developer/Chat menus (09-29), with Claude holding an "expanded mandate" over the UX queue. See section 3.
4. **Several rule docs cite evidence that lives under the CFH packet, not top-level `evidence/`.** engineering/verification.md contains 69 lines referencing `claude-frontend-harness-2026-09-16`, architecture.md 5 (kit-final-20260922, kit-run-final-20260923, kit-run-binding-20260922, runtime-selection-r1-final-20260923, kit-profile-preview-final-20260923, kit-profile-editor-final-20260924, p03b-pi-runtime-port-review-20260921). Top-level `evidence/` is barely cited by contract docs (only AGENTS.md -> main-cutover-20260908, and a handful in docs/ and app/docs/ — listed in section 6). Any move/archive must keep those CFH `evidence/*-final-*` paths reachable.
5. **evidence/README.md indexes only 56 of 132 top-level packets** (the 2026-09-07..09-10 set). 76 are not indexed there; 40 are named in neither evidence/README.md nor engineering/current.md (70 packets are named in current.md); 6 have no inbound link from any tracked text file at all (see section 5 and appendix).
6. **Live code/CI dependencies on doc/evidence paths (moving or editing these breaks build/CI):**
   - `site/build.mjs` `emitMethod()` throws `Method source drift` if `benchmarks/SPEC.md` or `engineering/execution/2026-09-10-benchmark-series/README.md` differ byte-for-byte from git blob `b9122180dd0c75fe68ba783c4b70dcb4e3835263`. These two files are effectively **frozen inputs** to the Pages build.
   - `site/scripts/release.mjs` includes `benchmarks/SPEC.md`, all of `engineering/execution/2026-09-10-benchmark-series/`, and `evidence/publishing-surface-2026-09-09/` in the `site_sha` content digest; `.github/workflows/pages.yml` triggers on the same paths. `site/scripts/evidence.mjs` reads `evidence/publishing-surface-2026-09-09/continuity-9e5384f.json` (+ `.attempts.json`, `.journal.jsonl`, `tests.log`) with sha256s pinned in `site/release.json`.
   - `site/media/main/manifest.json` (26 entries) `evidence_path` -> `evidence/publication-release-20260914/README.md`; older manifests -> `evidence/publication-final-20260911`, `evidence/semantic-polish-merge-20260911`, `evidence/final-integration-20260908`, etc.
   - `app/tests/output-message-boundary.test.mjs:205` reads `engineering/execution/claude-frontend-harness-2026-09-16/evidence/prepared-real-dogfood-20260921/events.json` at run time.
   - `site/build.mjs` reads `docs/first-work.md`, `docs/supported-preview.md` (via `app/docs/...` at the pinned source SHA), and `site/src/*` reference `engineering/current.md`, `engineering/roadmap.md`, `docs/runtime-control/INDEX.md`, `engineering/research/multi-experts-2026-09-10/README.md` (`site/src/product-pages.mjs:51-59`) and many engineering paths in `site/src/readme.mjs` (see section 9).
   - `tools/check-doc-links.mjs` (run in both workflows, `runtime.yml` and `pages.yml`) fails if **any relative link in any tracked/untracked .md/.html** does not resolve to a repository path. Any relocation must rewrite all inbound links.
   - `app/scripts/check-historical-fixtures.mjs` pins git objects + a frozen `app/tests/fixtures/historical/schema3/` byte manifest (CI "Verify fixed historical test inputs").
   - Comment-only (non-functional) references exist to `evidence/cc-s/browser.mjs`, `evidence/fe05a/shape-checks.mjs`, `evidence/wk7/contrast.md`, `evidence/att-fe01`, `evidence/cc-w`, `evidence/sd-01`, `evidence/chat-shell-proportion-20260910`, `evidence/publication-final-20260911/preview-audit.mjs`, `evidence/semantic-polish-merge-20260911/capture-fixture.mjs` in app/tests, app/scripts, tools, site/scripts.
7. **Stale/dangling facts in current-facing docs (found in passing):**
   - `app/docs/README.md` says "运行数据与迁移 ... 当前 Host schema 10" and links to anchor `#store-schema-v9-validated-v3v4v5v6v7v8-upgrade`; AGENTS.md says RuntimeStore schema 22 and app/README.md mentions a "pre-upgrade backup from schema 21". app/docs/README.md is stale on schema.
   - `app/docs/README.md` does not link 9 of its 27 sibling files (check-recipes, example-workspace, hermes-api-runs, projectless-chat, repository-binding, request-telemetry, runtime-proposals, spark-agent, supported-preview). `docs/README.md` does not link `repository-layout.md` (linked from engineering/README.md and current.md instead).
   - `app/docs/runtime-api-proposal.md` opens "superseded by ../../docs/api-v5.md and ../../docs/framework-contract-v5.md"; neither file exists in the repo (superseder is not in-tree; `app/docs/api-v6.md` is the actual HTTP contract).
   - `engineering/README.md` "当前阅读顺序" item 2 points to the 2026-09-08 main-round README as "本轮派单" (dated 2026-09-08; the file is an accepted-history round record; its only active file is `public-readiness.md`).
   - `engineering/release/README.md` still lists as pending: "Claude Paper正式串行开工 ... 待作者认领/返回" and "Claude diff／Settings／Chat工单已授权待认领".
   - `engineering/mvp/README.md` still links `fresh-handoff-v5.md`/`astra-handoff.md` and gate files but not `fresh-astra-handoff-v7.md` / `frontend-design-handoff-v8.md`; and its execution/README lists 2 of 4 subpackages (missing provider-surface, surface-sample-data).

## 2. engineering/execution/ (top-level packages)

Entry doc `engineering/execution/README.md` lists only 10 items (CFH + 9 packets dated 2026-09-08/09). It says explicitly packets "are plans and execution records, not a second status ledger." Its CFH bullet still describes the packet as "planning registration, not implementation acceptance" (stale: node accepted 2026-09-19, many slices accepted since).

| path | files / KB | README | purpose (<=15 words) | effect | reach | cited by rules | flags |
|---|---|---|---|---|---|---|---|
| execution/2026-09-08-luna-two-orders | 3 / 12 | Y | Luna bounded clarity pilot + Core capability verification work orders | accepted-history (evidence/luna-two-orders-20260908; cur L1331) | exec-R, cur | - | - |
| execution/2026-09-08-main-round | 5 / 76 | Y | First post-takeover architecture dispatch; G1-G5 public-readiness owner | mixed: README/WO-BE5/fresh-astra-core-handoff = accepted-history; `public-readiness.md` (+`g5-fact-map-20260928.md`) = **active-work** (G5 owner, last edited 2026-09-28; open: fresh user config, timed media, whole-release acceptance) | exec-R, eng-R (as reading-order #2 and #public-readiness), cur | roadmap.md, verification.md | README status is 2026-09-08 |
| execution/2026-09-08-two-lines | 9 / 108 | Y | Merge recheck and publishing-surface line (Fable rhythm), plus evidence/explore | accepted-history | exec-R | decisions.md | supporting `evidence/`, `explore/` sub-dirs owned by packet |
| execution/2026-09-09-async-loop | 1 / 16 | Y | AM-B async read-task dispatchable contract (Terra/Astra) | accepted-history (implemented: cur L1443; evidence/async-loop-*) | exec-R, cur | - | README still says "不表示 Terra 已启动或 AM-B 已实施" (B) |
| execution/2026-09-09-attention | 1 / 12 | Y | ATT-BE-01 Attention backend implementation contract | accepted-history (docs/work-core/attention.md is the live contract; evidence/attention-*) | exec-R | - | - |
| execution/2026-09-09-backend-bounded | 1 / 4 | Y | Activity/Usage backend bounded batch | accepted-history (cur L1385; evidence/backend-bounded-main-integration) | exec-R | - | - |
| execution/2026-09-09-backend-dispatch | 2 / 12 | Y | Backend independent dispatch, Astra low + Luna explore | accepted-history | exec-R, cur | - | - |
| execution/2026-09-09-execution-state | 4 / 56 | Y | ES-01 exact-file candidate PR preparation (BE/FE) | accepted-history (ES-01 implemented; cur L1299) | exec-R, cur | - | README/PR-BE/PR-FE say "待实施 / 未实施 / not implemented" (B) |
| execution/2026-09-09-harness-next | 2 / 12 | Y | Next-round parallel/serial plan (ES-01 then Attention) | accepted-history | exec-R | - | - |
| execution/2026-09-10-backend-governance | 10 / 92 | Y | BG-01/02 claim, contract, rulings and delivery | accepted-history (contracts live in docs/work-core/governance.md, app/docs/run-attempts.md) | cur only (not in exec-R) | governance.md, run-attempts.md | `input.txt` raw user input (15 KB); 1 file with /Users/ |
| execution/2026-09-10-benchmark-series | 6 / 24 | Y | BM-01 contract (written) + BM-02..05 implementation briefs | active-work? (BM-02..05 "Implementation brief / not started", no in-flight author) and **frozen-input** for Pages (`README.md` pinned to blob b912218; whole dir in `site_sha`; pages.yml trigger) | cur | - | do not edit README.md without updating site/build.mjs pin |
| execution/2026-09-10-chat-shell-proportion | 1 / 16 | Y | WO-CS-01 ChatSpace/composer shell proportion (author delivery) | accepted-history? unknown (README: author verification only, "不代表独立验收"; folded into CS-01 x CI-B/F integration, evidence/cs01-ci-bf-integration "Not merged, not independently browser-accepted"); no acceptance line found | **none** (not in exec-R/cur; 0 hits in current.md) | - | orphan in entry docs; evidence/chat-shell-proportion-20260910 has 90 files / 6.7 MB and no README |
| execution/2026-09-10-harness-pro-review.md (file) | 1 / 8 | n/a | Pro architecture review request packet | accepted-history | cur | roadmap.md | - |
| execution/2026-09-10-next-round | 2 / 8 | Y | Next round prep / consumption audit (roadmap appendix) | superseded (by 2026-09-11-merge-node per its own first line) | none (roadmap.md only) | roadmap.md | orphan in entry docs |
| execution/2026-09-10-summary-disclosure | 4 / 32 | Y | R2-SD01 summary -> local disclosure -> same-object tab | accepted-history (evidence/summary-disclosure-20260910) | cur | - | - |
| execution/2026-09-11-claude-handoff | 1 / 8 | Y | Claude frontend-line wrap-up SHAs/status handed to Astra | accepted-history (received by 2026-09-11-claude-intake) | **none** (0 inbound anywhere) | - | orphan; worktree paths note `/private/tmp` cleared |
| execution/2026-09-11-claude-intake | 2 / 24 | Y | Receipt/adjudication of Claude handoff + Astra wrap-up order | accepted-history (cur L1128); table lists EX-IC2 B "未交付", C "尚未施工" (later overtaken by Fake-UI-first ruling) | cur | - | - |
| execution/2026-09-11-merge-node | 6 / 196 | Y | Merge/push node ruling, three-way audit (NOT_READY at the time) | accepted-history (superseded by later merge nodes) | cur | roadmap.md | `worktree-inventory.json` 170 KB machine inventory |
| execution/2026-09-11-semantic-polish | 13 / 240 | Y | WO-VS-01 semantic/UI polish roadmap + registry plan | accepted-history (LOCAL_CANDIDATE_COMPLETE f99af46; evidence/semantic-polish-*) | cur | README.md, roadmap.md | README carries two status lines: "LOCAL_CANDIDATE_COMPLETE" then "PREPARED / WAITING_FOR_USER_MERGE" and "自动化/定时唤醒尚未创建" (B) |
| execution/2026-09-11-summary-be41-dispatch | 2 / 12 | Y | Summary/BE-41 fresh-Astra claim order (+claim.md) | accepted-history (claim.md: CLAIMED then MERGE_READY; evidence/summary-be41-construction) | cur | - | README status "READY_TO_CLAIM" (B) |
| **execution/claude-frontend-harness-2026-09-16** | 1829 / 51712 | Y (440 lines, 57 KB) | Claude serial frontend + real Harness integration order and all follow-on slice records | **mixed** — see section 3 | exec-R, cur | verification.md (69 refs), architecture.md (5), product-direction.md, docs/runtime-control/INDEX.md, app/docs/{api,hermes-api-runs,runtime-foundation,spark-agent,supported-preview}.md | 164 files with /Users/; 6 big (4 dispatch PNGs 605-700 KB, 2 JSON 640 KB); raw progress transcripts (section 3) |

Not a package but in `execution/`: `execution/README.md` (see above).

## 3. Part A · engineering/execution/claude-frontend-harness-2026-09-16/

### 3.1 Shape

- 41 top-level files (README.md + 40 order/slice/registration files) and `evidence/` (1788 files, 50.7 MB; 122 subpacket directories + 7 loose files).
- README structure (440 lines): title; then **three stacked "Current" banners at lines 3/5/7** (`Current continuation (2026-09-24)`, `Current consumption check (2026-09-22)`, `Current gap/dispatch map (2026-09-23)` — newest first), baseline line 9 (main@f76dd7ec, 2026-09-16), three revision banners v4/v3/v2 (lines 11-15, v3/v2 marked "继续有效"), tagline line 17; numbered TOC (10 sections: scope/baseline, unified grammar, serial PR queue 00-13, per-slice contracts, backend-from-frontend registration, prototype queue, Pages design, combined acceptance, consumed indexes, Claude intake entry); then a **long appended dated log** from `## 2026-09-20 · Frontend-first follow-up under the existing management owner` (line 407) to 2026-09-21 (last entry: 06c accepted, 06d next, P03-C/D/E lane authorised) — lines 407-440 are an append-only journal, not a contract.
- The README's own opening statement calls it a "串行施工单" (serial construction order) and says "实际产品状态仍由 current 持有".

### 3.2 "Current continuation" section and staleness

Quote (README line 3): `Current continuation (2026-09-24): [K5 selected-profile editor accepted](evidence/kit-profile-editor-final-20260924/README.md) after R1/R2/F1 closure; no active author or new product lane is claimed. Manual Claude relay remains available. Earlier lane snapshots below retain their historical dates.`

- **Stale relative to engineering/current.md (top entry 2026-09-29).** Between 09-24 and 09-29 current.md records: E1-B/E1-H Home-first Agent choice accepted (09-25, in 06e); live streaming Order 3 accepted (09-26); Hermes protocol/Runtime settings I1/attention check recipe (09-27); Hermes server-permission refusal, dogfood review + normal push, harness check recipe, real CW engineering task, candidate-generated filter, UX simplification, Developer structure, Models save flow, B2/G5 batch (09-28); reader touch targets, Developer Attention and Chat menus (09-29). current.md also states original Claude "retains the remaining registered UX queue under its expanded mandate" (2026-09-28/29), contradicting "no active author ... claimed".
- The 2026-09-22 banner (`Current consumption check`) and 2026-09-23 banner (`Current gap/dispatch map`, "supersedes historical pending claims for accepted K3/E1/M1") are older still. All three "Current" banners are historical snapshots that predate the last week of work.
- Slice queue text still says "Claude 是本单唯一产品 writer ... 串行" (line ~40) even though next-dispatch-20260921.md records that global single-writer scheduling was superseded for separate file owners (Codex/Astra core, Sol, Luna).

### 3.3 Evidence subpackets

- **122 evidence subpacket directories** (17 dated 20260920, 23 for 0921, 20 for 0922, 21 for 0923, 1 for 0924, 2 for 0925, 6 for 0926, 15 for 0927, 15 for 0928, 2 for 0929) plus 7 loose files: `06-capability-consumption.json`, `09-full-test.txt` (cited in verification.md), `claude-g1-g2-progress-20260920.txt`, `claude-g3-g4-progress-20260920.txt`, `claude-g1-g4-final-report-20260920.txt` (raw agent progress narration, ~39 KB), `dogfood-review-source.json` (65 KB), `review-test-generated-capability.json`.
- 104 of 122 have a README; 18 do not (agents-profile-journey-20260920, attention-meta-r1-20260928, candidate-diff-scope-note-20260928, code-block-density-20260927 (53 files, 2.3 MB), core-runtime-loop-20260921, gui-final-2b98abb-20260920, gui-independent-20260920, gui-rereview-213ef4d-20260920, gui-rereview-3413978-20260920, kit-profile-preview-20260923, preview-tab-reveal-20260928, reader-targets-20260929, runtime-selection-r1-20260923, stream-backend-return-20260926, ux-b2-read-20260928, ux-developer-20260928, ux-models-20260928, ux-n07-20260928).
- Largest: composer-entry-20260921 (103 files, 6.9 MB), tabbed-preview-20260921 (69 files, 5.8 MB), runtime-management-20260921 (55 files, 4.5 MB), kit-profile-editor-20260923 (75 files, 3.8 MB), code-block-density-20260927 (2.3 MB), runtime-settings-i1-20260927 (2.3 MB), prepared-real-dogfood-20260921 (1.7 MB; two 640 KB JSON), ux-batch-review-20260929 (1.2 MB).
- Naming convention: `<topic>-<yyyymmdd>` = author/working packet; `*-review-*`, `*-final-*`, `*-acceptance-*`, `parent-review/` = independent/parent acceptance. Verification.md and architecture.md cite mainly the `*-final-*`/`*-review-*` ones.
- Subpackets cited by verification.md (must stay reachable; 53 of the 122, and 100 of 122 are named in verification.md or current.md; 95 in current.md alone): local-pi-worker-20260922, runtime-selection-r1-final-20260923, prepare-final-integration-20260921, p03b-pi-runtime-port-review-20260921, kit-run-final-20260923, kit-run-binding-20260922, kit-profile-preview-final-20260923, kit-profile-editor-review-20260923, kit-profile-editor-final-20260924, kit-final-20260922, composer-entry-20260921, clean-node-20260922, work-closure-audit-20260922, ux-simplification-20260928, ux-continuity-20260928, tabbed-preview-review-20260922, tabbed-preview-final-20260922, stream-frontend-final-20260926, stream-backend-final-20260926, runtime-settings-i1-final-20260927, runtime-selection-r1-20260923, runtime-management-final-20260921, runtime-management-review-20260921, request-details-b2-20260928, prepared-real-dogfood-20260921, prepare-round2-review/returns-20260921, prepare-lifecycle-returns-20260921, prepare-and-approval-review/-20260920, p03c-transport-acceptance-20260921, m1-final-20260922, local-pi-{worker,final,parent-review,recovery-final} (4), hermes-protocol-final-20260927, harness-real-engineering-20260928, harness-check-recipe-20260928, e1-parent-review-20260923, e1-final-20260923, dogfood-review-20260928, core-runtime-loop-20260921, core-cde-final/review-20260922, composer-entry-acceptance-20260921, composer-ce-r1-final-20260921, coding-start-friction-20260920, code-block-density-20260927, candidate-generated-filter-20260928, attention-check-recipe-20260927, answer-footer(-review)-20260921, 09-full-test.txt.
- Subpackets NOT named in current.md, verification.md or architecture.md (reachable only via packet READMEs or nowhere; 22 dirs): coding-dogfood-readiness-20260920, e1-backend-contract-20260922, e1-host-capability-20260923, e1h-integration-20260925, gui-independent-20260920, gui-rereview-213ef4d/3413978-20260920, hermes-api-runs-20260927 (app/docs/hermes-api-runs.md cites the code, not this), hermes-tool-profile-conformance-20260927 (677 KB), kit-k0-20260922, kit-run-index-20260922, p03c-dispatch-20260921, preview-tab-reveal-20260928, stream-backend-return-20260926, stream-frontend-20260926, ux-b2-read-20260928, ux-e1b-integration-20260925, ux-n07-20260928, ux-queue-audit-20260928, attention-meta-r1-20260928, candidate-diff-scope-note-20260928, agents-profile-journey-20260920.
- /Users/ : 164 files across the packet (52 md, 44 txt, 38 json, 29 log, 1 mjs). Only 4 top-level order docs: core-runtime-loop-20260921, 06c-runtime-management-20260921, 00-intake, 06a-agents-profile-journey-20260920.
- Raw transcript-like material: three `claude-g*-progress/final-report-20260920.txt`; `evidence/core-loop-index-20260921/{dispatch-prompt,dispatch-output}.txt` + `dispatch-status.json`; `clean-node-20260922/push-and-dispatch.json`; `runtime-load-recovery-20260927/dispatch.json`; four `*dispatch*.png` (605-700 KB) screenshots of Claude dispatch dialogs (code-block-density, hermes-protocol-preflight, hermes-protocol-review, hermes-tool-profile-conformance); `.jsonl` gate logs (13, machine logs not transcripts).

### 3.4 Order/slice documents: which are active

The NN-*.md files are slice records ("施工记录") that write back to owner docs (RD-006, DF-04, RD-009, RD-008, Run-surface PR...). Contract authority is in the owner docs, not in these files. Status by file (based on the file's own latest dated section and current.md):

| file | lines / KB | effect |
|---|---|---|
| README.md | 440 / 57 | queue + banners; **partly stale** (3.2). Live parts: unified grammar/scope tables. Cited by verification.md/current.md |
| 00-intake, 01-workspace-binding, 02-candidate-write, 04-run-surface, 05-models-composer, 06-capability-consumption, 07-commands-compaction, 08-presentation, p-home-identity | 165/26 ... 43/6 | accepted-history (independently accepted at node-acceptance-20260919.md); each is individually cited by verification.md (must stay reachable) |
| 03-check-recipe.md | 195 / 31 | **active-owner record**: has 2026-09-27 (Attention recipe) and 2026-09-28 (Harness self-check closure, expanded Claude lease, accepted) sections; DF-04/RD-009 owner writeback; cited verification.md x2 |
| 09-navigation-commands.md | 153 / 24 | accepted-history but cited verification.md x2 |
| 06-agents-frontend-first-20260920.md (order) | 96 / 15 | accepted-history; top line "2026-09-21 · **Current:** ... 06c ... next complete frontend journey" is stale (06c/06d/06e all accepted since) |
| 06a-agents-profile-journey | 273 / 25 | accepted-history; header "Status: reviewed, returned, corrected. ... Not self-accepted, not integrated" is stale (accepted 2026-09-20, evidence/agents-profile-round2-20260920) |
| 06b-dogfood-friction-20260920.md | 539 / 62 | **active-work owner** (B2 request-summary author delivery 2026-09-28 last; CB-D1/R1 09-27); header says "Ready for Claude pickup; no author process has been started" (2026-09-20, stale) |
| 06c-runtime-management-20260921.md | 200 / 32 | accepted-history; header "Authorized and ready for Opus pickup" stale (accepted evidence/runtime-management-final-20260921) |
| 06d-surface-continuity-20260921.md | 162 / 28 | accepted-history; header "Ready for Opus pickup after the 06c merge" stale (tabbed Preview accepted 2026-09-22) |
| 06e-role-composer-selection-20260922.md | 241 / 32 | accepted-history through E1-H (2026-09-25); header "Ready handoff to the existing Claude frontend worker" stale |
| 11-coding-dogfood-handoff-20260920.md | 135 / 24 | accepted-history with 09-27 EC-1 formal-work dogfood schema correction appended; header "2026-09-22 Current status" stale |
| core-runtime-loop-20260921.md | 217 / 39 | **active-work**: Hermes native tool-loop conformance blocked (permission refusal, preserved) + external recall (2026-09-28); C/D/E accepted |
| ux-polish-release-20260924.md | 544 / 78 | **active-work**: Claude UX owner, sections through 2026-09-28+ (per current.md 09-29 remaining queue: narrow Composer, answered-question toggle) |
| live-assistant-text-streaming-20260916.md | 580 / 67 | accepted-history for Order 3 (2026-09-26) + AT-META-R1 (09-28); **header "Status: implementation slice registered; no product implementation, deployment, or acceptance is claimed" is stale** |
| next-dispatch-20260921.md | 276 / 46 | routing record; top section 2026-09-28 "Current bounded author batch complete" — current routing note; older sections are history |
| gui-grammar-convergence-20260919.md | 441 / 67 | accepted-history (2b98abb, 2026-09-20 local integration); title still says "PR registration (draft, uncommitted)" |
| home-layout-zoning-pr-20260919.md | 42 / 5 | superseded (absorbed by gui-grammar G1); header claims nothing implemented |
| frontend-entry-audit.md, sidebar-trace-review.md | 174/20, 172/21 | contract-like addenda ("继续有效" in README v2/v3), accepted-history; not cited by current.md (cur=0) but by README |
| frontend-backend-live-integration-20260922.md | 66 / 12 | superseded by next-dispatch-20260921 (routing snapshot, mentions "obsolete G1->G4 sequence") |
| node-acceptance-20260919.md | 132 / 27 | accepted-history (acceptance of the node + gap register); cited verification.md |
| orchestra-start-node-20260919.md | 207 / 39 | accepted-history/superseded by later nodes; "Status (2026-09-20): GUI fresh node accepted..." |
| orchestra-pages-registration-20260919.md | 67 / 10 | active-work? (deferred Pages revision under slice 13; site/README cites it) |
| kit-context-core-20260922.md | 47 / 8 | accepted-history (K0-K2 accepted, kit-final-20260922); header "Ready for a fresh Astra K0 ..." stale |
| kit-run-binding-20260922.md, kit-profile-preview-20260923.md, kit-profile-editor-20260923.md, local-pi-worker-loop-20260922.md, p03b-pi-runtime-port-20260921.md, p03c-agents-transport-20260921.md, p03c-host-consumer-contract-20260921.md, runtime-selection-contract-20260923.md, runtime-selection-r1-20260923.md | 40-121 lines | accepted-history (final receipts in evidence/*-final-*; cited by architecture.md/verification.md); header lines are dated pickup/"Ready" statements superseded by their own "final acceptance" sections at the bottom |

Contracts/standing rules that are still active in this packet (owner-of-record, not merely history): 03-check-recipe.md (fixed-recipe set incl. 2026-09-28 third recipe), 06b-dogfood-friction (B2/CB), core-runtime-loop (Hermes boundary + Host consumer), ux-polish-release (UX owner queue), next-dispatch-20260921 (routing), kit-run-binding / runtime-selection-contract / p03c-host-consumer-contract (contract text cited from architecture.md and evidence finals). Everything else in NN-*.md is a per-slice construction record.

## 4. engineering/release/, engineering/mvp/, engineering/migration/

`release/README.md` mixes two generations (a top block of 2026-09-11..15 notes and an English block listing only 2026-09-08 and 2026-09-09) and links 8 of the 19 package directories (2026-09-08, claude-paper, claude-ui-followthrough, final-preparation, fresh-claude-pages, product-node, publishing-surface, work-first-narrative) plus architecture-reconciliation-2026-09-11.md. `mvp/README.md` and `migration/README.md` are short pointers.

### release/

| path | files / KB | README | purpose | effect | reach | rules | flags |
|---|---|---|---|---|---|---|---|
| release/2026-09-08 | 16 / 140 | Y | Merge, two-line iteration and publication handoff | accepted-history | rel-R | decisions.md, roadmap.md | - |
| release/architecture-reconciliation-2026-09-11.md | 1 file | n/a | F1-F5 figure/architecture reconciliation contract | accepted-history | eng-R (link), rel-R | - | - |
| release/claude-paper-2026-09-11 | 2 / 20 (ONE-SHOT.md, PRE-PUBLISH.md) | **N** | Claude Paper pre-publish order | superseded (return received: research/claude-paper-return-2026-09-11/prepublish-v1/README.md; evidence/paper-release-review-20260911) | cur, rel-R (as "已授权待认领") | - | README says pending author (B) |
| release/claude-ui-followthrough-2026-09-11 | 1 / 12 | **N** | Claude diff/Settings/Chat one-shot order | superseded by release/ui-publication-closure-2026-09-11 (its README: "新单替代旧...") and evidence/ui-followthrough-integration-20260911 | cur, rel-R (as "已授权待认领") | - | (B) |
| release/final-preparation-2026-09-13 | 51 / 1596 | Y | Pre-release prep, merge/push/deploy receipt, audits | accepted-history; rel-R calls it "当前 merge/push/部署责任 ... 单一批次回执" — superseded as "current" by product-node-2026-09-15 + evidence/publication-release-20260914 | cur, rel-R, site/README | README.md | 2 files /Users/ (main-cleanup-inventory.md, node-20260915/runtime-test.log); `node-20260915.md` is its own successor |
| release/fresh-claude-pages-2026-09-11 | 2 / 24 | Y | Claude A/B v2 receipt + independent Pages task preparation | superseded (Pages shipped: evidence/pages-v3-20260911, semantic-polish-merge) | cur | roadmap.md | README says "用户已批准Claude开工" (B) |
| release/frontend-node-2026-09-12 | 7 / 48 | Y | Frontend node convergence (ONE-SHOT 1-5), unified preview | accepted-history | cur | - | branch-cleanup JSONs |
| release/governed-work-loop-2026-09-12 | 5 / 24 | Y | Governed-work-state ruling; deployment run | accepted-history (direction ruling cited by roadmap) | cur | roadmap.md | - |
| release/harness-implementation-2026-09-12 | 125 / 2380 | Y | Full Harness implementation package: adoption, DF-04 dogfooding contract, raw v2 inputs | **current-contract** for DF-04 (`harness-dogfooding.md` cited by 03-check-recipe and RD-009) + accepted-history + **frozen-input** (`inputs/*.zip`, receipt.json hashes) | cur | roadmap.md; RD-009, agents-api-first plan | raw: 131 KB zip + nested zip; `evidence/dogfood-long-20260914/session.json`; 2 files /Users/ |
| release/harness-next-node-2026-09-12 | 1 / 8 | Y | Next-node index (real Runtime + generic Harness) | superseded (README's own note: "本段更新下方仅候选/待排单 状态") | cur | - | stale "candidate" wording (B) |
| release/independent-review-2026-09-14 | 4 / 56 | Y | GitHub independent review: local consumption and ruling | accepted-history | cur | - | raw `conversation.json` 17 KB, `REVIEW.md` byte-preserved |
| release/merged-ui-captures-2026-09-10 | 3 / 16 | Y | Post-merge unified screenshots/publish authorization | accepted-history | cur | - | - |
| release/pages-ordered-integration-2026-09-11 | 1 / 8 | Y | Pages ordered integration decisions (BM-01 accepted etc.) | accepted-history | cur | README.md | - |
| release/product-node-2026-09-15 | 10 / 148 | Y | Public-node consumption: README/Pages claims, deployment.md | accepted-history; the latest release baseline named in rel-R | eng-R, cur, rel-R | architecture-runtime-canon.md, decisions.md, product-direction.md | raw `input-conversation.json` 11 KB |
| release/public-narrative-2026-09-10 | 2 / 12 | Y | Public product narrative editorial scope | accepted-history | cur | - | - |
| release/publishing-surface-2026-09-09 | 22 / 260 | Y | Pages/README preparation batch, work orders, PS-01 delivery | accepted-history | cur, rel-R, site/README | README.md | - |
| release/publishing-visuals-2026-09-10 | 8 / 76 | Y | Pages imaging layer: semantic registry, visual grammar, QA | accepted-history | **none** (not in cur; rel-R no) | - | orphan in entry docs |
| release/review-intake-2026-09-13 | 22 / 644 | Y | Release independent-review local increment decision | accepted-history | cur | app/docs/supported-preview.md, work-review-summary.md | raw: `round-24bd954/inputs/conversation.json` 48 KB + 19 KB zip; text says "未实施产品代码" |
| release/ui-publication-closure-2026-09-11 | 17 / 808 | Y | ONE-SHOT/DECISION for icons, secondary chrome, red control, preview | accepted-history (superseded its predecessor); README: "新单为待交付合同，尚未声称Claude已施工" | cur | app/docs/example-workspace.md | 1 big file (settings-reference.png 687 KB); (B) |
| release/work-first-narrative-2026-09-11 | 14 / 596 | **N** | Work-first narrative DECISION (Court definition) | accepted-history; `brand/README.md` links its DECISION.md | cur | - | no README |

### mvp/

| path | files / KB | README | purpose | effect | reach | rules | flags |
|---|---|---|---|---|---|---|---|
| mvp/README.md + 01-preparation, 02-validation, 03-construction, 04-acceptance.md | 5 / small | Y | 26-ticket MVP plan (2026-09-06), "完整草案, 不是全量开工令" | accepted-history (self-declares superseded by DEC-007/fresh handoff v5); 01-04 have 0 inbound links except mvp/README | mvp README linked from eng-R | - | 01-04 = 0 inbound outside README |
| mvp/astra-handoff.md, fresh-handoff-v5.md, fresh-astra-handoff-v7.md, frontend-design-handoff-v8.md | 4 files / 5-10 KB | n/a | 2026-09-05/06 handoffs (each says older ones are "历史输入") | superseded (v8 explicitly supersedes v7; v5/astra-handoff linked from mvp/README) | - | decisions.md cites astra, v5, v7 | v7/v8 not linked from mvp/README |
| mvp/execution (dir) | 454 / 17148 | Y | Work-surface line: work-surface-kit (434 files), provider-surface, surface-sample-data, gui-maturity-visual-diff | accepted-history (WK/CC/FE/PV records; delivery docs) | cur (via work-surface-kit README), eng-R via mvp | acceptance.md, decisions.md, runtime-api-proposal.md, source-resolver.md | 3 files /Users/ (explore/*); work-surface-kit/evidence has 295 files (14 MB); mvp/execution/README lists 2 of 4 children |
| mvp/execution/work-surface-kit | 434 / 16408 | Y | WK intake, contracts, dispatches, deliveries, evidence | accepted-history | cur | acceptance.md etc. | `work-orders/*dispatch-prompt.md` raw dispatch prompts |
| mvp/execution/provider-surface | 14 / 276 | Y | PV provider surface batch (Fable, 2026-09-10) | accepted-history | none (not in mvp/execution README) | - | 2 files /Users/, `inputs/` raw user-forwarded research |
| mvp/execution/surface-sample-data | 1 / 16 | N | SD-01 delivery | accepted-history | none | - | - |
| mvp/execution/gui-maturity-visual-diff | 4 / 444 | N | Screenshot comparison report | accepted-history | mvp/execution README | - | - |

### migration/

| path | files / KB | README | purpose | effect | reach | rules | flags |
|---|---|---|---|---|---|---|---|
| migration/2026-09-08 | 8 / 108 | Y | Bounded 2026-09-08 Fresh-integration doc migration record + evidence index | accepted-history (self: "迁移已完成 ... 134项后端测试/恢复 smoke通过") | migration/README (pointer), not in eng-R except directory table | decisions.md | its `evidence-index.md` is the redirect target for two retired paths (`execution/next-round-plan-v4.md`, `execution/charter.md`) named in mvp/README, so it must stay |

## 5. evidence/ (132 top-level packets; 133 entries incl. README.md)

Indexed by evidence/README.md: 56 packets (2026-09-07..09-10 set, incl. three "not encoded" dates). "Classification describes the packet's evidence surface" per its README; it is explicitly "only a directory map; not a second status ledger". Post-2026-09-14 work is **not** in evidence/ at all — 2026-09-16+ evidence (122 subpackets) lives under `engineering/execution/claude-frontend-harness-2026-09-16/evidence/` (see section 3). Only `gui-grammar-20260920` at top level is later than 09-14.

Default disposition for every family: **accepted-history** (dated receipts pinned to SHAs). None of the top-level packets names an in-flight author; current.md cites none of the post-0914 top-level ones. Exceptions are listed after the family table.

| family (prefix) | packets | files | size | README | reach (ev-R / cur / neither) | effect | flags |
|---|---|---|---|---|---|---|---|
| early 2026-09-07/08 acceptance and integration: ui-maturity, final-ui-audit, final-integration-20260908, harness-core-20260908, harness-main-integration-20260908, luna-two-orders-20260908, main-cutover-20260908, migration-independent, node2-independent, pro-review-remediation-20260908, reconciliation-20260908, remote-recovery-20260908, runtime-resolver-20260908, se-continuity-20260908, work-review-actions-20260908 | 15 | 275 | 7.0 MB | 15/15 | ev-R 15/15; cur 10 | accepted-history. `main-cutover-20260908` = frozen cutover receipt, **cited by AGENTS.md and engineering/README.md** (keep) | ui-maturity has 1 big PNG (1.1 MB) |
| `wk*` Work Surface Kit: wk6, wk7, wk10a, wk10a-r2, wk10b-main-integration-20260908, wk10b2-main-integration-20260908, wk11/wk12/wk13-main-integration | 9 | 213 | 6.6 MB | 9/9 | ev-R 9/9; cur 5 | accepted-history | wk13/wk10b2 are heavily linked from the mvp work-surface-kit docs (76/28 evidence-side inbound) |
| `cc-*`: cc-d0a, cc-s, cc-w, cc-s-main-integration-20260909, cc-w-main-integration-20260909, ccd0a-main-integration-20260910 | 6 | 575 | 14.5 MB | 6/6 | ev-R 6/6; cur 3 | accepted-history; cc-s (76 inbound) / cc-w (35) are widely cited; `cc-s/browser.mjs` is a named capture-script precedent (comment in site/scripts) | cc-d0a 203 files 5.2 MB |
| `fe0x` / `att-fe01` / `sd-01` / `pv-*` / `vg01` / `rc` / `ci-b-f` / `cs01-ci-bf-integration` / `home-composer-independent` frontend work orders | 24 | 690 | 19.7 MB | 20/24 | ev-R 8/24; cur 6 | accepted-history. fe02-main-integration is cited by 110 files, fe04 81 | fe05a 243 files 7.0 MB (`shape-checks.mjs` precedent for tools/lint-shapes); README missing: ci-b-f, pv-be02, pv-be03, pv-fe02; **4 packets with no inbound link at all**: pv-sd-independent-{backend,frontend,pv54}, pv-verify-route-independent-654411e |
| backend deliveries 2026-09-09/10 + spark: async-loop-20260909/10, attention-agent/backend/human-loop/independent, backend-attempts/bounded/bounded-main-integration/dispatch/governance, be41, bg02-main-integration, harness-next(-main-integration), multi-agent, runtime-source-service(-integration), rv26, rv26-q02, rv26-q02-independent, spark-delivery, spark-agent-20260913 | 23 | 254 | 5.0 MB | 22/23 (rv26-q02-independent none) | ev-R 12/23; cur 15 | accepted-history (contracts they delivered live in docs/work-core, app/docs) | be41 and spark-agent-20260913 (66 files, 2.9 MB); 2 packets with /Users/ files |
| summary/semantic-polish/skin/home/chat/dystopia/markdown/agent-presence/projectless family: summary-be41-construction, summary-disclosure, semantic-polish, semantic-polish-merge, skin-boundary-sk2, skin-review-sk1, dystopia-sk3, home-backlog, home-composition, chat-shell-proportion, delivery-rollup, convergence, design-handoff, attention-chat-closure, markdown-reader-a1, markdown-review, expert-sidebar-glyph, agent-presence-convergence/review, response-action-audit, work-review-object-card, projectless-chat-20260913 | 22 | 969 | 48.4 MB | 20/22 (home-backlog, chat-shell-proportion none) | ev-R 2/22 (markdown-reader-a1, markdown-review); cur 16 | accepted-history. `projectless-chat-20260913` is cited by `app/docs/projectless-chat.md` (a live contract) -> keep reachable | biggest family by size: chat-shell-proportion 6.7 MB/90 files, dystopia-sk3 6.7 MB, summary-disclosure 6.3 MB/142 files, delivery-rollup 11 MB (3 big files incl. 922 KB TSV), summary-be41-construction 4.5 MB; 4 packets with /Users/ files (summary-be41-construction, summary-disclosure, semantic-polish, semantic-polish-merge); response-action-audit-20260912 has no inbound link |
| pages / publication / brand / paper (2026-09-09..09-14): pages-first-edition, pages-main, pages-main-visual, pages-polish, pages-primary-entries, pages-product-life, pages-v3, pages-common-red, publishing-surface-2026-09-09, publishing-visuals, publication-final/-fast-review/-integrated/-release-20260914, cleanup, public-repository-cleanup, dark-authored, paper-release-review, work-loop-public-copy, ui-followthrough-integration, se-design-return, fable-partial-review, fable-stage1-integration, claude-v2-intake, deepseek-runtime-intake, secondary-material-review | 26 | 424 | 35.0 MB | 24/26 (paper-release-review, publication-final none) | ev-R 4/26 (cleanup, pages-first-edition, public-repository-cleanup, publishing-surface-2026-09-09); cur 9 | accepted-history for older ones; **publication-release-20260914** is the *current* public screenshot receipt (site/README, 26 media manifest entries) and **publishing-surface-2026-09-09**, **publication-final-20260911**, **semantic-polish-merge-20260911** are pinned/loaded by site or app scripts (see section 1.6) | pages-v3 14.8 MB (5 big PNGs), pages-polish 3.1 MB (2 big PNGs), publishing-visuals 5.9 MB; 3 packets with /Users/ files (paper-release-review x2, public-repository-cleanup, publication-integrated); claude-v2-intake-20260911 has no inbound link |
| `release-*` (2026-09-13): release-core-summary, release-input-binding, release-mcp-failures, release-preflight, release-readiness, release-test-contract | 6 | 161 | 12.8 MB | 6/6 | ev-R 0/6; cur 6 | accepted-history (pre-release gates for the 09-13/14 publication) | release-readiness-20260913: 8.9 MB, 6 files >500 KB (`live/*.json` up to 2.5 MB), 1 /Users/ file |
| gui-grammar-20260920 | 1 | 28 | 2.0 MB | Y | ev-R no; cur no (cited by CFH docs only) | accepted-history | - |

Exceptions worth individual decisions:

- **No README (9):** chat-shell-proportion-20260910 (90 files, 6.7 MB), ci-b-f (2 files, 160 KB), home-backlog-20260910 (12), paper-release-review-20260911 (14 files, 1.6 MB, 2 /Users/), publication-final-20260911 (5 files; but 52 site/media manifest refs and `preview-audit.mjs` precedent), pv-be02, pv-be03, pv-fe02, rv26-q02-independent.
- **Zero inbound links from any tracked text file and not in evidence/README.md (6):** claude-v2-intake-20260911, pv-sd-independent-backend-20260910, pv-sd-independent-frontend-20260910, pv-sd-independent-pv54-20260910, pv-verify-route-independent-654411e-20260910, response-action-audit-20260912.
- **Cited by live contracts (must stay reachable):** main-cutover-20260908 (AGENTS.md), projectless-chat-20260913 (app/docs/projectless-chat.md), spark-agent-20260913 (app/docs/spark-agent.md), backend-bounded-20260909 (app/docs/work-metrics.md), harness-next-20260909 (app/docs/permission-cas.md), runtime-resolver-20260908 (docs/runtime-control/source-resolver.md), ui-maturity (docs/typography-refinement.md), wk10b-main-integration-20260908 (docs/surface-assignment.md), markdown-reader-a1-20260910 (docs/output-review.md), home-composition-20260910 (docs/interface-components.md), work-review-actions-20260908, harness-core-20260908, be41-20260910, pro-review-remediation-20260908 (docs/work-core/contract.md, docs/runtime-control), semantic-polish-merge-20260911 (app/docs/example-workspace.md), publication-* / public-repository-cleanup-20260910 (site/README). These come from the `rules=` column in the appendix.
- **Raw input / dispatch material at the top level:** evidence contains almost no raw transcripts. Large machine dumps: release-readiness-20260913/live/*.json (2.5 MB, 0.7 MB x4), delivery-rollup-20260910 (922 KB TSV, 3 big files).
- **Not cited by verification.md/architecture.md:** essentially none of the top-level evidence (the 57 + 5 lines with `evidence/` in verification.md/architecture.md resolve to the CFH packet's `evidence/` subdir; the one exception, `evidence/09-full-test`, is a CFH loose file too).
- **Executable material inside evidence** (scripts that other docs treat as reusable precedents): cc-d0a/, cc-s/, cc-w/, fe03, fe04, fe05a, att-fe01, async-loop-*, wk*, rc, sd-01 (~120 `.mjs/.py/.sh` files) — retire with care; see section 1.6 (mostly comments, no runtime import found except the two site/app cases).

Per-package numbers for all 132 packets are in the appendix (section 12).

## 6. docs/ and app/docs/ (one row per file)

docs/README.md groups: run/interface links, UI/reading, design & engineering, and a section "历史交付记录" (V6/V7 restore, assignments, Polish handoff, entrypoint audit, reading marks) that it labels as preserving the scope at that time.

### docs/

| path | lines / KB | last commit | title / purpose | effect | reach | flags |
|---|---|---|---|---|---|---|
| docs/README.md | 32 / <1 | 2026-09-10 | Technical docs index (22 links) | index (current) | root | omits repository-layout.md |
| docs/CLAUDE-POLISH-HANDOFF.md | 106 / 4 | 2026-09-10 | Claude Polish handoff (2026-09-07 baseline, branch `codex/gui-completeness`, port 8816, `/private/tmp/se-ui-maturity-data-20260907`) | **historical handoff** (accepted-history/superseded; work "条目 1-6 已落地") | docs-R (历史交付记录) | absolute `/private/tmp` paths and dead branch names; 2 inbound (docs-R + one evidence) |
| docs/command-assignment.md | 29 / 1 | 2026-09-10 | V7-01 ordinary command/draft/receipt identity boundary | historical handoff (assignment) | docs-R | 3 inbound |
| docs/surface-assignment.md | 29 / 2 | 2026-09-08 | V7-02 general work-surface entry/reading layout (WK-43/45 slot rules) | historical handoff but cited as rule in mvp/wk (11 inbound; wk10b-main-integration evidence) | docs-R | - |
| docs/restore-v6.md | 15 / <1 | 2026-09-08 | V6 restore and local run (Node>=22.19, Pi 0.83.0) | historical handoff | docs-R | says Pi 0.83.0; upstream is 0.85.1 (app/docs/upstream-integration.md) |
| docs/restore.md | 32 / 1 | 2026-09-10 | V7 restore and local run | historical handoff | docs-R | - |
| docs/scope-correction-v6.md | 17 / <1 | 2026-09-08 | V6 scope correction: generic work-agent foundation | historical handoff | docs-R | - |
| docs/reference-entrypoint-audit.md | 84 / 6 | 2026-09-10 | Audit of SE entrypoint 8816 (implementation snapshot 2026-09-07) | historical audit (self: "不代表当前代码状态") | docs-R | - |
| docs/reading-marks.md | 26 / 2 | 2026-09-08 | Restrained reading marks | **superseded** (self: "superseded visual treatment: see typography-refinement.md") | docs-R (as "已替换的 reading marks 设计") | - |
| docs/typography-refinement.md | 23 / 3 | 2026-09-08 | Typography and control refinement | current-contract (superseder of reading-marks); cited by evidence/ui-maturity | docs-R | - |
| docs/interface-components.md | 139 / 32 | 2026-09-27 | Interface component contract (composer, messages, workspace, focus, controls) | **current-contract** (64 inbound; cited by architecture/verification) | docs-R | 32 KB; still being edited 2026-09-27 |
| docs/markdown-reader.md | 41 / 5 | 2026-09-10 | Markdown reader v1 fixed-revision contract | current-contract | docs-R | - |
| docs/output-review.md | 43 / 3 | 2026-09-10 | Output Review vs Markdown product boundary | current-contract | docs-R, cur | - |
| docs/ui-composition.md | 49 / 3 | 2026-09-21 | UI composition and visual-replacement boundary | current-contract | docs-R | - |
| docs/ui-orchestration-contract.md | 30 / 1 | 2026-09-08 | V7 UI orchestration contract and SE traceback | current-contract (short); "V7" naming | docs-R | - |
| docs/repository-layout.md | 45 / 1 | 2026-09-14 | Directory ownership, source vs generated, research intake rules | **current-contract** (defines generated files rule) | eng-R, cur (not docs-R) | - |
| docs/runtime-control/INDEX.md | 49 / 5 | 2026-09-27 | Runtime Control Plane index | current-contract (index) | docs-R, app-R, cur | - |
| docs/runtime-control/api.md | 202 / 20 | 2026-09-23 | HTTP contract protocol v1 | current-contract | INDEX | - |
| docs/runtime-control/architecture.md | 41 / 7 | 2026-09-23 | Architecture and compatibility | current-contract (147 inbound counting basename "architecture.md") | INDEX | - |
| docs/runtime-control/acceptance.md | 69 / 7 | 2026-09-09 | Acceptance and frontend handoff | accepted-history (RC acceptance record) | INDEX | cited by 21 evidence packets |
| docs/runtime-control/backend-review.md | 35 / 3 | 2026-09-10 | Backend diff review | accepted-history | INDEX | 3 inbound |
| docs/runtime-control/search-reference.md | 137 / 6 | 2026-09-10 | SE Runtime Control / search reference index | reference (historical intake list) | INDEX | - |
| docs/runtime-control/source-resolver.md | 53 / 6 | 2026-09-10 | Runtime R2 explicit declarative source resolution | current-contract | INDEX | cited by architecture.md/verification.md |
| docs/runtime-control/sources.md | 22 / 3 | 2026-09-08 | Source intake and implementation boundaries | accepted-history / reference | INDEX | 62 inbound |
| docs/work-core/README.md | 12 / <1 | 2026-09-10 | Work Core index | current-contract (index) | docs-R | - |
| docs/work-core/contract.md | 113 / 23 | 2026-09-27 | Work Core v1 / frontend seam | **current-contract** (255 inbound; cited by AGENTS.md, README, architecture, verification) | docs-R | - |
| docs/work-core/attention.md | 84 / 12 | 2026-09-27 | Attention backend contract v1 | current-contract | work-core README | - |
| docs/work-core/governance.md | 38 / 8 | 2026-09-10 | Governed object directory and Matter disclosure v1 (BG-01) | current-contract | work-core README, app-R | - |
| docs/work-core/nda.md | 19 / 4 | 2026-09-13 | Inbound NDA v1 adapter seam | current-contract | work-core README | - |

### app/docs/

app/docs/README.md (37 lines, 2026-09-13) is stale on Host schema ("当前 Host schema 10") and omits 9 files (marked "not linked" below).

| path | lines / KB | last commit | title / purpose | effect | linked from app-R? | flags |
|---|---|---|---|---|---|---|
| app/docs/api-v6.md | 517 / 29 | 2026-09-23 | Minimal interface contract C1/C2 for `/api/v5` | current-contract (file name says v6, routes say v5) | yes | largest HTTP contract |
| app/docs/runtime-foundation.md | 431 / 32 | 2026-09-26 | Runtime foundation and integration contract | current-contract | yes | 56 inbound |
| app/docs/api-runtime-mx-r1.md | 34 / 3 | 2026-09-08 | MX-R1 additions to v6 contract ("Store schema remains 3") | accepted-history (incremental contract; schema statement stale) | yes | - |
| app/docs/async-tasks.md | 110 / 7 | 2026-09-10 | AM-B adapted read tasks v1 | current-contract | yes | - |
| app/docs/attention-agent.md | 45 / 7 | 2026-09-27 | Global Attention conversations schema 1 | current-contract | yes | - |
| app/docs/check-recipes.md | 224 / 10 | 2026-09-28 | Host check recipes (DF-04) | current-contract (edited 09-28 for 3rd recipe) | **no** | not in README; 18 inbound |
| app/docs/commands-and-compaction.md | 71 / 6 | 2026-09-16 | Command surfaces and compaction availability | current-contract (says slash/manual "not implemented" in README bullet, CMD-01/CMP-01 done 2026-09-16 -> README bullet stale) | yes | 1 `/Users/` |
| app/docs/coordination.md | 156 / 9 | 2026-09-10 | Thread and local messaging API 1 / RuntimeStore 8 | current-contract (RuntimeStore 8 label stale vs 22) | yes | - |
| app/docs/dependency-ledger.json | 2430 / 93 | 2026-09-21 | Package-lock dependency license ledger | **generated** (from app/package-lock.json, lockfileSha256 embedded); generator not found in tools/ (unknown) | yes | 93 KB JSON; 9 inbound |
| app/docs/example-workspace.md | 39 / 4 | 2026-09-25 | The example workspace | current-contract | **no** | - |
| app/docs/first-work.md | 67 / 4 | 2026-09-13 | First work: synthetic NDA review | current-contract; read by site/build.mjs (previewFiles pin at source SHA) | yes | - |
| app/docs/hermes-api-runs.md | 129 / 10 | 2026-09-28 | Hermes `/v1/runs` standalone adapter contract | current-contract (active work: native profile boundary) | **no** | 6 inbound |
| app/docs/permission-cas.md | 17 / 2 | 2026-09-09 | Permission payload expectations BE-30 | current-contract | yes | - |
| app/docs/projectless-chat.md | 80 / 5 | 2026-09-16 | Optional workspace chats BE-23/DWB-05 | current-contract | **no** (linked from current.md) | - |
| app/docs/repository-binding.md | 274 / 18 | 2026-09-28 | Session repository binding and private candidate tools | current-contract | **no** | 18 inbound |
| app/docs/request-telemetry.md | 27 / 5 | 2026-09-14 | Model effort and request measurements | current-contract | **no** | 28 inbound |
| app/docs/run-attempts.md | 109 / 5 | 2026-09-10 | Run attempts and lineage v1 | current-contract | yes | - |
| app/docs/runtime-api-proposal.md | 286 / 14 | 2026-09-10 | V5 runtime API proposal | **superseded** (self; superseder `docs/api-v5.md` not in repo) | yes ("历史 API 提案") | dangling superseder |
| app/docs/runtime-proposals.md | 21 / 2 | 2026-09-16 | Declarative Skill proposals BE-6/BE-7 | current-contract | **no** | 1 inbound |
| app/docs/spark-agent.md | 84 / 12 | 2026-09-22 | Spark independent Explore Agent | current-contract | **no** (cited by architecture.md and README) | - |
| app/docs/supported-preview.md | 32 / 8 | 2026-09-28 | Source preview supported use | current-contract; pinned by site/build.mjs at `source-preview.json` SHA | **no** | - |
| app/docs/turn-ownership-review.md | 34 / 3 | 2026-09-08 | Per-turn harness ownership review | accepted-history (review record) | yes | - |
| app/docs/upstream-integration.md | 59 / 4 | 2026-09-08 | Pi dependencies locked to v0.85.1 | current-contract | yes | - |
| app/docs/usage-details.md | 11 / 2 | 2026-09-10 | Usage detail drill-down | current-contract | yes | - |
| app/docs/work-metrics.md | 36 / 4 | 2026-09-09 | Recorded Activity and Usage | current-contract | yes | - |
| app/docs/work-review-summary.md | 13 / 2 | 2026-09-13 | Bound Core Review summary | current-contract | yes | - |
| app/docs/work-summary-api.md | 107 / 6 | 2026-09-13 | Work summary API (C4) | current-contract | yes | - |
| app/docs/README.md | 37 / 1 | 2026-09-13 | index | index — **stale** (Host schema 10; missing files) | - | - |

## 7. site/, brand/, benchmarks/, tools/, tests/

| path | files / KB | README | purpose | effect | what generates what / edit rule |
|---|---|---|---|---|---|
| site/ | 243 / 27876 | Y | Pages source, media, recorded specimen, build/verify/capture scripts | mixed | see below |
| site/src (33 files) | 332 KB | - | Handwritten page sources (copy.mjs, page.mjs, site.css, readme.mjs, steps.mjs, product-pages.mjs, ...) | handwritten (authoritative; `readme.mjs` is the source of root README.md) | edit here |
| site/scripts (18 files) | 184 KB | - | build helpers, capture (capture-media, capture-specimen), checks, verify (CDP), preview | handwritten tooling | `verify.mjs` writes `site/verification/*`; capture scripts write `site/media/**`, `site/specimen/capture.json` |
| site/media (140 files) | 10.4 MB | - | Captured product screenshots + manifests by batch (`main/`, `merged-20260911/`, `publication-final-20260911/`, `publication-integrated-20260912/`, `publication-release-20260914/`, `archive/`) | **frozen-input** (captured at pinned source_sha; JPEG bytes never transcoded; manifest sha256 validated by build) | do not hand-edit; replace via capture scripts in an isolated checkout |
| site/specimen (5 tracked: 9e5384f.json, capture.json, recorded-source.mjs, shell.mjs, specimen.css) | 328 KB | - | Recorded synthetic-data replay + renderer shell | 9e5384f.json = **frozen-input** (sha256 in capture.json); others handwritten | `index.html`, `copy.mjs`, `manifest.json`, `vendor-product/` under specimen are **generated by build.mjs and gitignored** |
| site/verification (44 files) | 16.6 MB | - | Browser verification outputs (PNGs, contrast/links/material/reproducibility JSON); `main-20260910/`, `ordered-design/`, `product-pages-main-20260910/` | **generated** (by `site/scripts/verify.mjs`, check-links, check-material) but tracked as evidence; large (10 PNGs > 500 KB) | do not hand-edit |
| site/dist/ | (not present) | - | Built Pages output | **generated, gitignored** (`node site/build.mjs`) | never commit |
| site/release.json | 1 | - | source_sha (9e5384f) + evidence_sha256 map | frozen-input pin | updated only by release procedure |
| brand/ | 115 / 2936 | Y | Independent SVG/Web-component symbol package | mixed | see below |
| brand/geometry/mark.svg | 1 | - | canonical geometry | handwritten source (single source of truth) | edit then run build |
| brand/src/geometry.generated.mjs | 1 | - | geometry parts + hash | **generated** by `node brand/scripts/build.mjs` ("Do not edit") | - |
| brand/exports (41: 40 SVG + manifest.json) | 232 KB | - | 8 concepts x 5 materials static SVGs | **generated** by `brand/scripts/build.mjs` (manifest.generatedBy) | - |
| brand/src/symbol.mjs, court-symbol.mjs, scripts/, tests/, index.html, lab.*, catalog.json | - | - | renderer, Web component, preview, tests | handwritten | - |
| brand/les-privilege (18) | 332 KB | Y | Vendor-name mark candidate (status "pending-independent-review; not-published") | **generated** by `brand/les-privilege/build.py` (mark*.svg, manifest.json, index.html, identity.html); previews/PNGs captured | build.py is the source |
| brand/studies/le-2026-09-11 (10) | 168 KB | Y | Historical first-draft LE candidate | accepted-history (self: "历史首稿") | - |
| brand/sources (8), references (2, material-board.png 1.6 MB), exploration-2026-09-09 (6), evidence (12), HANDOFF.md, CONTRACT.md | - | - | provenance, references, historical briefs, browser evidence | sources = frozen-input (legacy 512-SVG + provenance); HANDOFF/exploration = accepted-history; CONTRACT.md = current-contract; brand/evidence = accepted-history | CONTRACT.md cited by engineering/README.md and README.md |
| benchmarks/ | 14 / 72 | Y | Continuity harness + SPEC | mixed | `SPEC.md` **frozen for Pages** (pinned blob b912218); `continuity/*` handwritten harness; its outputs are recorded in evidence/publishing-surface-2026-09-09 (frozen-input, hash-pinned) |
| tools/ | 87 / 472 | Y | Lint/check scripts + vendoring recipes | mixed | check-doc-links, lint-*, contrast-report, check-* = handwritten checks (contrast-report writes evidence/wk7/contrast.md only when redirected); `ui-vendor/` (70 files) and `markdown-vendor/` (5) are **recipes that generate `app/web/vendor/*`** (floating.mjs, icons.svg, icon-data.generated.mjs, manifest.json, LICENSES.txt, markdown-parser*.mjs, markdown-parser-manifest.json); `ui-vendor/lucide/` and `ui-vendor/courtwork/` = frozen SVG inputs pinned by `lucide/sources.json` |
| tests/ (repo-level) | 4 / 20 | N | color-governance, extension-renderer, extension, runtime-lock tests | handwritten; run by `npm --prefix app test` (`../tests/*.test.mjs`) | - |

## 8. Part B · packets whose README still presents dispatches as pending/active though later accepted elsewhere

Each entry: stale wording -> where it was later accepted/superseded.

1. `engineering/execution/README.md` (index): CFH bullet "planning registration, not implementation acceptance" -> node accepted `node-acceptance-20260919.md`; dozens of accepted slices in current.md.
2. `claude-frontend-harness-2026-09-16/README.md`: top `Current continuation (2026-09-24)`/`Current consumption check (2026-09-22)`/`Current gap/dispatch map (2026-09-23)`; "Claude 是本单唯一产品 writer"; and the appended log ends 2026-09-21 -> current.md 09-25..09-29 entries (section 3.2).
3. CFH `06-agents-frontend-first-20260920.md` ("Current: ... 06c ... next"), `06a` ("Not self-accepted, not integrated"), `06b` ("Ready for Claude pickup; no author process"), `06c` ("Authorized and ready for Opus pickup"), `06d` ("Ready for Opus pickup after the 06c merge"), `06e` ("Ready handoff to the existing Claude frontend worker"), `11-coding-dogfood-handoff` ("Current status"), `kit-context-core-20260922` ("Ready for a fresh Astra K0 ..."), `live-assistant-text-streaming-20260916` ("no product implementation, deployment, or acceptance is claimed"), `gui-grammar-convergence-20260919` ("PR registration (draft, uncommitted)"), `home-layout-zoning-pr-20260919` (registered only) -> all accepted per their own later sections and per evidence/*-final-*, current.md.
4. `execution/2026-09-11-summary-be41-dispatch/README.md`: "状态：READY_TO_CLAIM" -> `claim.md` (same dir): CLAIMED then MERGE_READY; evidence/summary-be41-construction-20260911.
5. `execution/2026-09-11-semantic-polish/README.md`: "准备时点：PREPARED / WAITING_FOR_USER_MERGE ... 自动化/定时唤醒尚未创建；本页不会在用户merge前启动施工" alongside "LOCAL_CANDIDATE_COMPLETE" -> evidence/semantic-polish-merge-20260911 (merged/pushed a01dee8 per current.md L1092).
6. `execution/2026-09-09-async-loop/README.md`: "本文是可派工合同，不表示 Terra 已启动或 AM-B 已实施" -> implemented (current.md L1443; evidence/async-loop-20260909/10).
7. `execution/2026-09-09-execution-state/README.md` and its `PR-BE-exact-file-candidates.md`, `PR-FE-file-candidate-review.md`, `backend-contract-draft.md`: "待实施 PR / 未实施 / 尚未实施" -> ES-01 implemented (harness-next README, current.md L1299).
8. `execution/2026-09-10-chat-shell-proportion/README.md`: author-only delivery; acceptance not recorded anywhere reachable (unknown).
9. `execution/2026-09-10-next-round/README.md`: "本页以下保留前次准备时点" (it already says it is superseded by 2026-09-11-merge-node; leaves stale queue text).
10. `execution/2026-09-11-claude-intake/README.md`: EX-IC2 B "未交付", "C尚未施工" -> overtaken by Fake-UI-first ruling (line 24 of the same file) and later work.
11. `execution/2026-09-11-merge-node/README.md`: "当前为 NOT_READY" -> superseded by later merge nodes (unknown which exact receipt; current.md L1136).
12. `execution/2026-09-10-benchmark-series/`: BM-02..05 "Ready implementation brief; not started" — **not stale** (still unimplemented; benchmarks/ contains only Continuity); listed to avoid false positives.
13. `release/README.md` (index): "Claude Paper正式串行开工 ... 待作者认领/返回" and "Claude diff／Settings／Chat工单已授权待认领" -> returns received (research/claude-paper-return-2026-09-11/prepublish-v1, evidence/paper-release-review-20260911, release/ui-publication-closure-2026-09-11, evidence/ui-followthrough-integration-20260911); "final-preparation ... 当前 merge/push/部署责任" -> superseded by product-node-2026-09-15/deployment.md and evidence/publication-release-20260914.
14. `release/claude-paper-2026-09-11/`, `release/claude-ui-followthrough-2026-09-11/` (no READMEs; ONE-SHOT.md orders) and `release/fresh-claude-pages-2026-09-11/README.md` ("用户已批准Claude开工"), `release/harness-next-node-2026-09-12/README.md` ("仅候选/待排单"), `release/ui-publication-closure-2026-09-11/README.md` ("待交付合同，尚未声称Claude已施工"), `release/review-intake-2026-09-13/README.md` ("未实施产品代码").
15. `engineering/README.md`: "当前阅读顺序 #2 本轮派单 = execution/2026-09-08-main-round" (2026-09-08 round record; only public-readiness.md remains active).
16. `engineering/mvp/README.md`: "当前派发范围见方案v4 (历史路径 ...)" + 26 tickets described as a plan "不是全量开工令" (self-declared historical; dispatch tables not superseded in-file).
17. `docs/README.md`: nothing pending; `app/docs/README.md`: "当前 Host schema 10", CMD/compaction bullet "尚未实现的slash/manual入口" (implemented 2026-09-16 per CFH 07).

## 9. Part C · hand-written vs generated

### Root README.md is generated from site/src/readme.mjs (confirmed)

- `site/build.mjs` lines 173-186: `const readme = renderReadme({ identity, evidence }); ... if (current !== readme) { if (process.argv.includes("--write-readme")) { writeFile(README.md, readme); console.error("README.md regenerated from site/src/readme.mjs"); } else throw new Error("README.md is out of step with site/src/readme.mjs; run: node site/build.mjs --write-readme"); }`. So `README.md` is a checked-in generated file: `node site/build.mjs` (without flag) *fails* if README.md differs from `renderReadme()` output; `node site/build.mjs --write-readme` regenerates it. `site/src/readme.mjs` (148 lines) header: "English project README generation source. Keep README.zh-CN.md aligned."
- `site/README.md` states the same: "The English root README.md is generated from src/readme.mjs with node site/build.mjs --write-readme; keep its authored Simplified Chinese counterpart README.zh-CN.md aligned in the same change." AGENTS.md separately requires updating both READMEs together.
- `README.zh-CN.md` (144 lines) is **hand-written**; no generator. Alignment is by convention only (not checked by any script I found).
- Last commit touching README.md/readme.mjs: `294ebb5` 2026-09-22.
- I did not run the build (it writes files in `site/`), so I did not verify README.md is currently byte-equal to the generator output. unknown; the CI Pages workflow would fail if not.
- `readme.mjs` embeds many links into engineering docs (architecture.md, product-direction.md, core-contracts.md, architecture-runtime-canon.md, design/ux-grammar.md, design/agent-interface-2026-09-10/frontend-contract.md, design/copy-convention.md, design/ui-composition-standard.md, design/atlas/README.md, verification.md, docs/README.md, engineering/README.md, evidence/README.md, docs/spark-agent.md [note: file lives at app/docs/spark-agent.md], research/architecture-node-2026-09-13/{local-agent-runtimes-20260920,orchestra-direction-20260919,praxis-kit-20260919}.md). Renaming/moving any of these requires editing `site/src/readme.mjs` then regenerating README.md — never hand-edit README.md.

### Other generated / derived outputs

| generated file(s) | generator | tracked? | notes |
|---|---|---|---|
| `README.md` | `node site/build.mjs --write-readme` (from `site/src/readme.mjs`) | tracked | see above |
| `site/dist/**` | `node site/build.mjs` | gitignored | Pages CI builds twice and compares hashes (reproducibility) |
| `site/specimen/{index.html,copy.mjs,manifest.json,vendor-product/}` | `site/build.mjs` (copy.mjs copies `site/src/steps.mjs`; vendor-product from git blobs at `release.json.source_sha`) | gitignored | not present in the checkout |
| `site/verification/**` | `node site/scripts/verify.mjs`, `check-links.mjs`, `check-material.mjs` | tracked | outputs; do not hand-edit |
| `site/media/**`, `site/specimen/capture.json` | `site/scripts/capture-media.mjs`, `capture-specimen.mjs` (isolated checkout at pinned SHA) | tracked | frozen evidence |
| `site/dist/benchmark-contract.md`, `benchmark-series.md` | `emitMethod()` copies **frozen blob b9122180** versions of `benchmarks/SPEC.md` and `engineering/execution/2026-09-10-benchmark-series/README.md` | (dist) | source files must stay byte-identical |
| `brand/src/geometry.generated.mjs`, `brand/exports/*.svg`, `brand/exports/manifest.json` | `node brand/scripts/build.mjs` (reads `brand/geometry/mark.svg`) | tracked | "Do not edit" header |
| `brand/les-privilege/{mark*.svg,manifest.json,index.html,identity.html}` | `python3 brand/les-privilege/build.py` | tracked | PNG previews captured separately |
| `app/web/vendor/{floating.mjs,icons.svg,icon-data.generated.mjs,manifest.json,LICENSES.txt}` | `node tools/ui-vendor/build.mjs` (`--icons-only` for sprite/data only) from `tools/ui-vendor/lucide/` + `courtwork/` SVG sources and npm lock | tracked | product distribution input |
| `app/web/vendor/markdown-parser.mjs`, `markdown-parser-LICENSES.txt`, `markdown-parser-manifest.json` | `tools/markdown-vendor` (`npm ci && npm run build`) | tracked | pinned by lockfile hash |
| `app/docs/dependency-ledger.json` | derived from `app/package-lock.json` (records `lockfileSha256`); generator script not found in tools/ (unknown) | tracked | 93 KB |
| `evidence/wk7/contrast.md` | `node tools/contrast-report.mjs > evidence/wk7/contrast.md` (manual redirect) | tracked | historical output |
| `evidence/publishing-surface-2026-09-09/continuity-<sha7>.json` (+attempts/journal) | `node benchmarks/continuity/run.mjs --output ...` | tracked | frozen-input, hash-pinned in `site/release.json` |
| `engineering/design/product-semantics/registry.json`, `pages-map.json`, `raw-consumers.json`, `copy-exceptions.json` | hand-maintained data checked by `tools/check-pages-semantics.mjs`, `check-product-copy.mjs`, `check-semantic-consumers.mjs`, `product-semantics.mjs` | tracked | not generated; tools validate them |

Frozen inputs (do not edit): `benchmarks/SPEC.md` and `engineering/execution/2026-09-10-benchmark-series/README.md` (blob b912218 check); `evidence/publishing-surface-2026-09-09/**`; `site/specimen/9e5384f.json`; `site/media/**` (sha256 in manifests); `app/tests/fixtures/historical/schema3/**` (byte manifest, CI-checked); `engineering/release/harness-implementation-2026-09-12/inputs/*`, `receipt.json`; `release/review-intake-2026-09-13/round-24bd954/inputs/*`; `engineering/research/*-return-*/source.zip|tar.gz` (21 MB largest; out of this scope).

## 10. Reachability quick view for entry docs

- `engineering/execution/README.md` links: CFH + 9 packets (luna-two-orders, main-round, two-lines, async-loop, attention, backend-bounded, backend-dispatch, execution-state, harness-next). Not linked: 2026-09-10-{backend-governance, benchmark-series, chat-shell-proportion, harness-pro-review.md, next-round, summary-disclosure}, 2026-09-11-{claude-handoff, claude-intake, merge-node, semantic-polish, summary-be41-dispatch}. Of these, only chat-shell-proportion, next-round (roadmap.md only) and claude-handoff have no inbound from current.md.
- `engineering/README.md` links (relevant): execution/, release/, mvp/, migration/, evidence/, main-round README, release/product-node-2026-09-15, research/attention INDEX; evidence link `main-cutover-20260908`.
- `evidence/README.md`: 56 packets, all 2026-09-07..10 (incl. 3 "not encoded" dates).
- `docs/README.md`: 22 links, omits repository-layout.md; `app/docs/README.md`: links 18 of its 27 sibling files.
- `engineering/current.md`: names 36 of 41 CFH top-level md files (not: kit-context-core-20260922, frontend-entry-audit, sidebar-trace-review, p03b-pi-runtime-port-20260921, 06a-agents-profile-journey-20260920) and 95 of 122 CFH evidence subpackets, plus 70 of 132 top-level evidence packets (via dated sections).

## 11. Flag roll-up

- Absolute personal paths: 444 `/Users/lesprivilege` occurrences. CFH: 164 files (52 md/44 txt/38 json/29 log/1 mjs). Elsewhere: engineering/release/final-preparation (2), harness-implementation (2), mvp/execution (3), backend-governance (1); evidence: be41, paper-release-review (2), public-repository-cleanup (1, intentional redaction receipt), publication-integrated, release-readiness, rv26, semantic-polish (2), semantic-polish-merge, summary-be41-construction (2), summary-disclosure (2); app/docs/commands-and-compaction.md (1), site/scripts/public-data.test.mjs (redaction test fixture). `site/build.mjs` rejects machine absolute paths in public *site* text only; docs are not covered. `docs/CLAUDE-POLISH-HANDOFF.md` and `docs/restore*.md` carry `/private/tmp` paths.
- Raw transcripts / dispatch prompts / inputs in scope: `execution/2026-09-10-backend-governance/input.txt`; `release/independent-review-2026-09-14/{conversation.json,REVIEW.md}`; `release/product-node-2026-09-15/input-conversation.json`; `release/review-intake-2026-09-13/round-24bd954/inputs/{conversation.json,*.zip}`; `release/harness-implementation-2026-09-12/inputs/*.zip` (+nested zip) and `evidence/dogfood-long-20260914/session.json`; `mvp/execution/work-surface-kit/work-orders/*dispatch-prompt.md`, `dispatch-round-3/4.md`, `provider-surface/inputs`; `release/publishing-surface-2026-09-09/work-orders/WO-PS01-dispatch-prompt.md`; CFH `claude-g*-progress/final-report-20260920.txt`, `core-loop-index-20260921/dispatch-{prompt,output}.txt`, four `*dispatch*.png`.
- Very large files (>500 KB) in scope: CFH: 4 dispatch PNGs (605-700 KB), `prepared-real-dogfood-20260921/{after-run,events}.json` (640 KB); evidence: release-readiness-20260913/live/*.json (2.5 MB + 4 x ~0.7 MB), pages-polish-20260910 (2 PNG, 1.8/1.3 MB), pages-v3-20260911 (5 PNG up to 1.6 MB), delivery-rollup-20260910 (922 KB TSV + 2 others), ui-maturity/typography/image-study.png (1.1 MB); release/ui-publication-closure settings-reference.png (687 KB); site/verification (10 PNGs, ~1.6 MB max), brand/references/material-board.png (1.6 MB). Outside scope but adjacent: engineering/research `*.zip/*.tar.gz` up to 21 MB, `claude-paper-return...zh-print-*.pdf` 2.5 MB.
- Largest packages by size: CFH 51.7 MB; mvp/execution 17.1 MB; site 27.9 MB (16.6 MB verification); evidence families: summary/semantic-polish 48.4 MB, pages/publication 35 MB, frontend WOs 19.7 MB, cc-* 14.5 MB, release-* 12.8 MB.

## 12. Appendix: per-packet numbers for evidence/ (132 packets)

Columns: packet | files | KB | README | ev-R = listed in evidence/README.md | cur = mentioned in engineering/current.md | rules = contract/rule docs that cite it | other = other citing file counts by area (eng/design, eng/release, eng/mvp, eng/execution, eng/research, ...) | flags (usr = files with /Users/, big = files >500 KB).

| packet | files | KB | README | ev-R | cur | rules | other inbound | flags |
|---|---|---|---|---|---|---|---|---|
| agent-presence-convergence-20260912 | 6 | 232 | Y | - | - | - | design:1; evidence:0 | - |
| agent-presence-review-20260912 | 24 | 1268 | Y | - | Y | - | design:2,eng-top:1,release:1,research:1; evidence:0 | - |
| async-loop-20260909 | 18 | 168 | Y | Y | Y | - | eng-top:1,execution:2,release:1,reviews:1; evidence:0 | - |
| async-loop-20260910 | 24 | 180 | Y | Y | Y | - | eng-top:1,execution:1,release:1; evidence:1 | - |
| att-fe01 | 26 | 940 | Y | - | - | - | app:1,execution:1,mvp:1; evidence:4 | - |
| attention-agent-20260910 | 4 | 64 | Y | - | Y | - | design:4,eng-top:1,release:1; evidence:0 | - |
| attention-backend-20260909 | 4 | 60 | Y | Y | - | - | -; evidence:1 | - |
| attention-chat-closure-20260910 | 4 | 192 | Y | - | - | - | design:1; evidence:0 | - |
| attention-human-loop-20260909 | 4 | 16 | Y | Y | - | - | execution:1; evidence:0 | - |
| attention-independent-20260909 | 4 | 40 | Y | Y | Y | - | design:1,eng-top:1,execution:1,mvp:3,release:1; evidence:0 | - |
| backend-attempts-20260910 | 5 | 124 | Y | - | - | - | execution:3; evidence:0 | - |
| backend-bounded-20260909 | 7 | 48 | Y | Y | Y | work-metrics.md | app:1,eng-top:1,execution:2,release:1; evidence:1 | - |
| backend-bounded-main-integration-20260909 | 2 | 8 | Y | Y | Y | - | eng-top:1,mvp:1,release:1,research:1; evidence:0 | - |
| backend-dispatch-20260909 | 8 | 96 | Y | Y | Y | - | eng-top:1,execution:5,mvp:1,release:1; evidence:0 | - |
| backend-governance-20260910 | 9 | 116 | Y | - | Y | - | eng-top:1,execution:3,release:1; evidence:0 | - |
| be41-20260910 | 14 | 216 | Y | - | Y | contract.md | design:1,docs:1,eng-top:1,execution:2,mvp:1,release:1; evidence:0 | usr=1 |
| bg02-main-integration-20260910 | 3 | 68 | Y | - | - | - | execution:1; evidence:0 | - |
| cc-d0a | 203 | 5180 | Y | Y | - | - | design:2,mvp:7; evidence:10 | - |
| cc-s | 67 | 1936 | Y | Y | - | - | design:3,mvp:5,site:1; evidence:67 | - |
| cc-s-main-integration-20260909 | 62 | 1768 | Y | Y | Y | - | design:1,eng-top:1,mvp:1,release:5,site:2; evidence:0 | - |
| cc-w | 83 | 2272 | Y | Y | - | - | app:1,design:1,mvp:3; evidence:30 | - |
| cc-w-main-integration-20260909 | 153 | 3664 | Y | Y | Y | - | design:2,eng-top:1,mvp:1,release:1; evidence:1 | - |
| ccd0a-main-integration-20260910 | 7 | 64 | Y | Y | Y | - | design:1,eng-top:1,mvp:1,release:1; evidence:0 | - |
| chat-shell-proportion-20260910 | 90 | 6720 | N | - | - | - | app:1,execution:1,release:2; evidence:0 | noREADME |
| ci-b-f | 2 | 160 | N | - | - | - | mvp:1; evidence:0 | noREADME |
| claude-v2-intake-20260911 | 1 | 4 | Y | - | - | - | -; evidence:0 | no-inbound |
| cleanup-20260910 | 1 | 4 | Y | Y | Y | - | eng-top:1,release:1; evidence:0 | - |
| convergence-20260911 | 4 | 120 | Y | - | Y | - | design:2,eng-top:1,release:2; evidence:1 | - |
| cs01-ci-bf-integration | 6 | 124 | Y | - | - | - | execution:4; evidence:1 | - |
| dark-authored-20260911 | 17 | 536 | Y | - | - | - | design:4; evidence:1 | - |
| deepseek-runtime-intake-20260911 | 1 | 4 | Y | - | - | - | release:1; evidence:0 | - |
| delivery-rollup-20260910 | 169 | 11124 | Y | - | Y | - | design:8,eng-top:1,mvp:5,release:1; evidence:2 | big=3 |
| design-handoff-20260911 | 4 | 36 | Y | - | Y | - | eng-top:1,release:1; evidence:0 | - |
| dystopia-sk3-20260910 | 76 | 6692 | Y | - | Y | - | design:2,eng-top:1,release:1; evidence:0 | - |
| expert-sidebar-glyph-20260912 | 17 | 676 | Y | - | - | - | design:2,exec-CFH:1; evidence:0 | - |
| fable-partial-review-20260911 | 6 | 28 | Y | - | - | - | release:1; evidence:0 | - |
| fable-stage1-integration-20260911 | 3 | 12 | Y | - | - | - | release:1; evidence:0 | - |
| fe01-main-integration-20260909 | 38 | 564 | Y | Y | Y | - | design:4,eng-top:1,execution:1,mvp:1,release:5,research:2,reviews:1; evidence:8 | - |
| fe02-main-integration-20260909 | 41 | 940 | Y | Y | Y | - | eng-top:1,mvp:1,release:2; evidence:106 | - |
| fe03 | 58 | 1520 | Y | Y | - | - | mvp:7,release:3,site:2; evidence:20 | - |
| fe03-main-integration-20260909 | 73 | 1508 | Y | Y | Y | - | eng-top:1,mvp:1,release:4,research:1,site:2; evidence:0 | - |
| fe04 | 59 | 1584 | Y | Y | - | - | mvp:5; evidence:76 | - |
| fe04-main-integration-20260909 | 19 | 132 | Y | Y | Y | - | design:1,eng-top:1,release:1; evidence:0 | - |
| fe05a | 243 | 6968 | Y | - | - | - | design:1,execution:1,mvp:2,tools:1; evidence:3 | - |
| final-integration-20260908 | 65 | 1272 | Y | Y | Y | - | eng-top:1,execution:1,mvp:20,release:7,site:2; evidence:62 | - |
| final-ui-audit | 18 | 524 | Y | Y | - | - | design:1,migration:1; evidence:0 | - |
| gui-grammar-20260920 | 28 | 2000 | Y | - | - | - | exec-CFH:5; evidence:0 | - |
| harness-core-20260908 | 14 | 128 | Y | Y | Y | contract.md | docs:1,eng-top:1,exec-CFH:1,execution:2,mvp:1,release:3,research:1; evidence:0 | - |
| harness-main-integration-20260908 | 5 | 36 | Y | Y | Y | - | eng-top:1,mvp:1,release:1; evidence:0 | - |
| harness-next-20260909 | 7 | 68 | Y | Y | - | permission-cas.md | app:1,execution:2; evidence:2 | - |
| harness-next-main-integration-20260909 | 2 | 12 | Y | Y | Y | - | eng-top:1,mvp:1,release:1; evidence:0 | - |
| home-backlog-20260910 | 12 | 256 | N | - | Y | - | design:4,eng-top:1,execution:1,release:2; evidence:0 | noREADME |
| home-composer-independent | 4 | 28 | Y | Y | - | - | -; evidence:3 | - |
| home-composition-20260910 | 5 | 32 | Y | - | Y | interface-components.md | design:2,docs:1,eng-top:1,execution:1,release:2; evidence:0 | - |
| luna-two-orders-20260908 | 13 | 124 | Y | Y | Y | - | eng-top:1,execution:3,release:1; evidence:1 | - |
| main-cutover-20260908 | 3 | 12 | Y | Y | Y | AGENTS.md | AGENTS.md:1,eng-top:2,execution:1,release:4; evidence:1 | - |
| markdown-reader-a1-20260910 | 36 | 916 | Y | Y | Y | output-review.md | docs:1,eng-top:1,release:1,research:2; evidence:0 | - |
| markdown-review-20260910 | 33 | 340 | Y | Y | Y | - | eng-top:1,release:1,research:4; evidence:1 | - |
| migration-independent | 6 | 36 | Y | Y | - | - | brand:1,migration:1; evidence:2 | - |
| multi-agent-20260910 | 13 | 208 | Y | - | Y | - | eng-top:1,release:1,research:4,reviews:1; evidence:0 | - |
| node2-independent | 52 | 1288 | Y | Y | Y | - | eng-top:1,mvp:1,release:3; evidence:1 | - |
| pages-common-red-20260911 | 16 | 72 | Y | - | - | - | release:2; evidence:0 | - |
| pages-first-edition-20260910 | 14 | 380 | Y | Y | - | - | release:1; evidence:0 | - |
| pages-main-20260910 | 1 | 4 | Y | - | - | - | -; evidence:1 | - |
| pages-main-visual-20260910 | 31 | 1308 | Y | - | Y | README.md | eng-top:1,release:2,site:1; evidence:0 | - |
| pages-polish-20260910 | 4 | 3136 | Y | - | - | - | execution:1,release:3; evidence:0 | big=2 |
| pages-primary-entries-20260910 | 13 | 464 | Y | - | Y | - | eng-top:1,release:1; evidence:0 | - |
| pages-product-life-20260910 | 5 | 244 | Y | - | - | - | execution:1; evidence:0 | - |
| pages-v3-20260911 | 111 | 14796 | Y | - | Y | - | design:1,eng-top:1,release:1,research:1; evidence:0 | big=5 |
| paper-release-review-20260911 | 14 | 1588 | N | - | - | - | release:2; evidence:0 | usr=2 noREADME |
| pro-review-remediation-20260908 | 42 | 1692 | Y | Y | Y | contract.md | docs:1,eng-top:1,release:3,research:2; evidence:0 | - |
| projectless-chat-20260913 | 57 | 3468 | Y | - | Y | projectless-chat.md | app:1,eng-top:1,release:2,research:1; evidence:0 | - |
| public-repository-cleanup-20260910 | 7 | 60 | Y | Y | Y | README.md | eng-top:1,release:1,site:2; evidence:0 | usr=1 |
| publication-fast-review-20260912 | 15 | 208 | Y | - | Y | - | eng-top:1,release:1; evidence:0 | - |
| publication-final-20260911 | 5 | 56 | N | - | - | - | app:1,design:1,research:3,site:1; evidence:0 | noREADME |
| publication-integrated-20260912 | 24 | 960 | Y | - | - | README.md | release:3,research:1,site:1; evidence:0 | usr=1 |
| publication-release-20260914 | 6 | 192 | Y | - | Y | README.md | eng-top:1,execution:1,release:1,site:2; evidence:0 | - |
| publishing-surface-2026-09-09 | 8 | 956 | Y | Y | - | - | execution:1,release:1,site:2; evidence:2 | - |
| publishing-visuals-20260910 | 44 | 5944 | Y | - | - | - | release:2; evidence:0 | - |
| pv-be02 | 3 | 64 | N | - | - | - | mvp:1; evidence:0 | noREADME |
| pv-be03 | 4 | 84 | N | - | - | - | mvp:1; evidence:1 | noREADME |
| pv-fe01 | 19 | 660 | Y | - | - | - | execution:1,mvp:1; evidence:1 | - |
| pv-fe02 | 15 | 648 | N | - | - | - | mvp:1; evidence:2 | noREADME |
| pv-sd-independent-backend-20260910 | 3 | 20 | Y | - | - | - | -; evidence:0 | no-inbound |
| pv-sd-independent-frontend-20260910 | 6 | 316 | Y | - | - | - | -; evidence:0 | no-inbound |
| pv-sd-independent-pv54-20260910 | 1 | 4 | Y | - | - | - | -; evidence:0 | no-inbound |
| pv-sd-independent-spark-20260910 | 3 | 36 | Y | - | - | - | -; evidence:1 | - |
| pv-sd-integration-20260910 | 17 | 680 | Y | - | Y | - | design:1,eng-top:1,release:1; evidence:1 | - |
| pv-verify-route-independent-654411e-20260910 | 3 | 20 | Y | - | - | - | -; evidence:0 | no-inbound |
| rc | 25 | 2472 | Y | Y | - | - | execution:1,mvp:8,release:4,research:1,site:2; evidence:7 | - |
| reconciliation-20260908 | 3 | 16 | Y | Y | Y | - | eng-top:1,exec-CFH:1,release:1; evidence:0 | - |
| release-core-summary-20260913 | 42 | 1452 | Y | - | Y | - | design:1,eng-top:1,release:4; evidence:0 | - |
| release-input-binding-20260913 | 4 | 16 | Y | - | Y | - | eng-top:1,execution:1,release:2; evidence:0 | - |
| release-mcp-failures-20260913 | 5 | 28 | Y | - | Y | - | eng-top:1,execution:1,release:2; evidence:0 | - |
| release-preflight-20260913 | 38 | 1652 | Y | - | Y | - | eng-top:1,execution:2,release:4; evidence:0 | - |
| release-readiness-20260913 | 54 | 8936 | Y | - | Y | - | eng-top:1,release:4; evidence:0 | usr=1 big=6 |
| release-test-contract-20260913 | 18 | 996 | Y | - | Y | - | eng-top:1,release:3; evidence:0 | - |
| remote-recovery-20260908 | 5 | 32 | Y | Y | - | - | migration:1; evidence:0 | - |
| response-action-audit-20260912 | 4 | 128 | Y | - | - | - | -; evidence:0 | no-inbound |
| runtime-resolver-20260908 | 7 | 52 | Y | Y | Y | source-resolver.md | docs:1,eng-top:1,execution:1,release:1; evidence:0 | - |
| runtime-source-service-20260910 | 6 | 80 | Y | Y | - | - | -; evidence:1 | - |
| runtime-source-service-integration-20260910 | 5 | 64 | Y | Y | Y | - | eng-top:1,execution:1,mvp:1,release:1; evidence:0 | - |
| rv26-20260910 | 22 | 296 | Y | - | Y | - | eng-top:1,release:2,reviews:1; evidence:0 | usr=1 |
| rv26-q02-20260910 | 18 | 156 | Y | - | Y | - | eng-top:1,release:1,reviews:2; evidence:0 | - |
| rv26-q02-independent | 1 | 12 | N | - | - | - | reviews:1; evidence:1 | noREADME |
| sd-01 | 11 | 460 | Y | - | - | - | app:1,mvp:1; evidence:2 | - |
| se-continuity-20260908 | 5 | 156 | Y | Y | - | - | release:5,research:2,site:2; evidence:2 | - |
| se-design-return-20260911 | 49 | 4208 | Y | - | - | - | design:1,release:1,research:1; evidence:0 | - |
| secondary-material-review-20260912 | 1 | 4 | Y | - | - | - | release:1; evidence:0 | - |
| semantic-polish-20260911 | 78 | 2872 | Y | - | Y | roadmap.md | design:2,eng-top:2,execution:4,release:1; evidence:2 | usr=2 |
| semantic-polish-merge-20260911 | 53 | 1696 | Y | - | Y | README.md,example-workspace.md | app:3,design:3,eng-top:1,exec-CFH:2,execution:1,release:4,site:2; evidence:4 | usr=1 |
| skin-boundary-sk2-20260910 | 24 | 1324 | Y | - | Y | - | design:2,eng-top:1,release:1; evidence:0 | - |
| skin-review-sk1-20260910 | 5 | 32 | Y | - | Y | - | design:1,eng-top:1,release:1; evidence:0 | - |
| spark-agent-20260913 | 66 | 2992 | Y | - | Y | spark-agent.md | app:1,eng-top:1,execution:1,release:3,research:3; evidence:0 | - |
| spark-delivery-20260910 | 8 | 40 | Y | - | - | - | -; evidence:2 | - |
| summary-be41-construction-20260911 | 111 | 4532 | Y | - | - | - | design:3,execution:1; evidence:1 | usr=2 |
| summary-disclosure-20260910 | 142 | 6320 | Y | - | Y | - | eng-top:1,execution:7,release:1; evidence:1 | usr=2 |
| ui-followthrough-integration-20260911 | 24 | 688 | Y | - | Y | - | eng-top:1,release:3,research:1; evidence:0 | - |
| ui-maturity | 31 | 1800 | Y | Y | - | typography-refinement.md | design:1,docs:2,migration:1; evidence:4 | big=1 |
| vg01-main-integration-20260910 | 11 | 288 | Y | - | Y | - | eng-top:1,release:1; evidence:0 | - |
| wk10a | 17 | 764 | Y | Y | - | - | execution:1,mvp:1; evidence:1 | - |
| wk10a-r2 | 26 | 1148 | Y | Y | - | - | mvp:3; evidence:4 | - |
| wk10b-main-integration-20260908 | 16 | 120 | Y | Y | Y | surface-assignment.md | docs:1,eng-top:1,release:1; evidence:0 | - |
| wk10b2-main-integration-20260908 | 20 | 268 | Y | Y | Y | - | design:1,eng-top:1,release:4; evidence:22 | - |
| wk11-main-integration-20260909 | 29 | 388 | Y | Y | Y | - | eng-top:1,mvp:4,release:1; evidence:0 | - |
| wk12-main-integration-20260909 | 46 | 1780 | Y | Y | Y | - | eng-top:1,release:1; evidence:0 | - |
| wk13-main-integration-20260908 | 46 | 1480 | Y | Y | Y | - | design:1,eng-top:1,mvp:6,release:1; evidence:67 | - |
| wk6 | 10 | 788 | Y | Y | - | - | execution:1,mvp:7; evidence:6 | - |
| wk7 | 3 | 12 | Y | Y | - | - | execution:1,mvp:2,tools:1; evidence:0 | - |
| work-loop-public-copy-20260912 | 3 | 24 | Y | - | Y | - | eng-top:1,release:2; evidence:0 | - |
| work-review-actions-20260908 | 6 | 40 | Y | Y | Y | contract.md | design:1,docs:1,eng-top:1,mvp:2,release:1; evidence:0 | - |
| work-review-object-card-20260913 | 15 | 580 | Y | - | Y | - | design:1,eng-top:1,release:2; evidence:0 | - |
