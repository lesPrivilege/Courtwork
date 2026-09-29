# Rule-vs-log analysis (checkout <checkout>, HEAD ffe68fb)

All line numbers are for that checkout. Paths are relative to it unless absolute. Link checks: every relative link in all 19 files resolves to an existing file (script `scratchpad/links.py`); every `#anchor` resolves (script `scratchpad/anch.py`, plus the `<a id>` aliases in app/README.md). Nothing in these files points at a missing evidence file.

Legend: (a) standing rule/architecture/method, (b) dated receipt/addendum, (c) navigation. "MERGE" = addendum changes/extends a rule stated (or implied) in the body, must be folded into the body. "MOVE" = reports a result only.

Global fact worth knowing: `engineering/current.md` (1567 lines) already carries almost every verification.md receipt: 60 of the 72 dated receipts in verification.md have the same evidence link also cited in current.md. The 12 that do not (lines 37, 39, 100, 102, 105, 108, 116, 125, 127, 156, 158, 160) are author deliveries/returns; their evidence READMEs exist and can be their home. So "move receipts out of verification.md" costs nothing: current.md (status ledger) + evidence README (owner) already exist.

---------------------------------------------------------------------------
## 1. engineering/verification.md (195 lines, ~66 KB; wide lines)

### 1.1 Layout
- L1 title.
- (b) L3-43: 21 receipts prepended, newest-first (2026-09-28 -> 2026-09-22). L3,5,7,9,11,13,15,17 = 09-28; L19,22,24,26 = 09-27; L29,32 = 09-26; L35 = 09-24; L37,39,41 = 09-23; L43 = 09-22. (Double blank lines at 20-21, 27-28, 30-31, 33-34 mark where paste-ins happened.)
- (a) L45-72: the actual method (dated "2026-09-14 · Astra裁决" only as provenance prefix on L45).
- (b) L74-195: 51 more receipts appended oldest-first (09-16 -> 09-24). Same items appear twice in opposite orders across the two blocks (see 1.4).
- (c) navigation: L47 (history index pointer to research/frontend-testing-stack), L45's link to research/ux-grammar-2026-09-14 (consumption record), L70's link to root README + design/agent-interface-2026-09-10/frontend-contract.md. No nav list otherwise.
- Inbound: `grep verification.md#` finds no anchor links into this file; only whole-file links (README.md/README.zh-CN.md/site/src/readme.mjs L127, AGENTS.md L27/L31, engineering/README.md L14, .github/pull_request_template.md L26, engineering/research/README.md L7, many research/evidence files). So a full rewrite breaks no anchors. NOTE README.md is generated from site/src/readme.mjs; the sentence there ("Use the verification guidance to select focused checks...") does not depend on the receipts.

### 1.2 Current method = these paragraphs (in order)
| Lines | Content |
|---|---|
| L45 | Scope statement: verification choice for the current work order; does not replace Core/Host contracts, Release gates, concrete test commands. Provenance "2026-09-14 Astra裁决" + link to consumption record (research/ux-grammar-2026-09-14/README.md) -> convert to a one-line provenance footnote. |
| L47 | User-registered frontend-testing-stack discussion is history-only; its external claims were not verified; does not change the adopted stack. (pointer -> history/related section) |
| L49 | Core principle: write user outcome, invariants that may fail, real seams crossed; choose the cheapest check that could detect the failure. Green tests support only the assertions executed; do not repeat the same full suite without change/failure/unresolved doubt. |
| L51 | Claims: state delivery scope and exit evidence in the original task contract before coding; four separate claims (source runs / synthetic path holds / real Agent completes task / human formal acceptance), not an automatic ladder; author self-check, non-author review and human Decision recorded with actual identity and scope; exploration report cannot replace independent acceptance. |
| L53-60 | Risk -> evidence table (header L53-54; rows: L55 copy/index/generated; L56 pure projection/field semantics/state branches; L57 save/CAS/permission/async receipts; L58 multi-surface user path; L59 real Agent capability; L60 cancel/recovery/lost receipt/migration). Columns: change & risk / preferred evidence / escalation condition. |
| L62 | Every new end-to-end path: six items in the original task/delivery record (user outcome, cross-system risk, invariant, why cheaper test insufficient, fixed input and reproduction, run cost and rerun trigger); no per-helper approval table. |
| L64 | Real-browser acceptance: exploratory; check findability, state legibility, recoverability, whole-page visual relations; stable semantic locators; screenshots for geometry/visual judgement, not per-action; no external token-saving ratios adopted; long-term automation only for complex/repeatedly failing paths. |
| L66 | Real-harness verification vs deterministic-GUI verification accounted separately (model completes task vs app presents/saves known facts); run/candidate/authorization/formal acceptance stay with their owners; reproducible product bugs: sink minimal counterexample to contract/integration tests, keep few E2E regressions. |
| L68 | Minimum delivery evidence: source and input versions, command/actual path, result, author vs non-author scope, unrun items and limits; reuse of old evidence needs source-relevance statement (no relabelling old screenshots); real-provider calls/sensitive data/outbound follow existing user authorization; no default paid model or background tasks. |
| L70 | Adopted stack now: existing Node tests, Host synthetic fixtures, available browser tools; XState/Playwright CLI etc. optional only; no new dependency/runtime state/second state machine; commands live in root README; UI coverage per frontend-contract. |
| L72 | Current-pointer check on affected changes: schema + migration owner, support list, media manifest, install source, paper adoption pin, release state consistent across current entry points; N/A allowed; link reachability != semantic consistency; historical receipts/specimens/media keep original SHA; paper pin moves only on explicit upgrade ruling; "PR index" holds completed checks (vague: "PR索引" is not linked - probably .github/pull_request_template.md or research/repository-governance-2026-09-14). |

Gaps inside the method text: none of L49-L72 mentions Node version/concurrency baseline, the recurring flake policy, browser identity for independent acceptance, or the unexecuted-matrix vocabulary; these live only in receipts (1.5).

### 1.3 Dated receipts (b): date, gist, cited link (exists=yes for all), rule-change?
All links below resolve. "cur" = same link also cited in current.md. EV = execution/claude-frontend-harness-2026-09-16/evidence, EX = execution/claude-frontend-harness-2026-09-16.
No receipt changes the risk->evidence table, claims, or independence rules. Exceptions listed under "MERGE".

MERGE (adds method-level content):
- L139 (2026-09-21) "Visual/spatial role guidance" -> design/visual-spatial-grammar.md (exists, cur). It is a rule, not a receipt: new UI construction/density migrations consume it via the Design path; record CSS viewport, pointer mode, text-scale, zoom, DPR separately; measure glyph/visible control/hit target and stacked chrome/content start; 200% text resize, WCAG reflow, text-spacing overrides are separate checks; native zoom/reader/forced-colors stay unexecuted unless performed; full composition, keyboard/focus, long/stateful content required alongside chosen lints. Already stated at design/visual-spatial-grammar.md L54/L60/L64 and AGENTS.md L15, so the rewrite can replace L139 with one pointer sentence in the method (UI change -> row "多面用户路径" or a new escalation note). Also contains dated process noise ("This turn changes documentation only", "The fresh Astra task is read-only first") -> drop.

MOVE (result only; grouped):
| Line | Date | Gist | Link | cur | Notes |
|---|---|---|---|---|---|
| 3 | 09-28 | First Models/Runtime simplification: 155/155 author, parent 37/37, Luna review, browser at 538/390/1440; unexecuted dark/zoom/reader/error matrices | EV/ux-simplification-20260928/README.md | y | result |
| 5 | 09-28 | Candidate dependency filtering: 36/36, 1/1, 6/6, Sol 2/2; fixed generated exclusions explicit | EV/candidate-generated-filter-20260928/README.md | y | contains product fact ("fixed generated exclusions", budgets/visibility unchanged) that belongs to candidate owner, not method |
| 7 | 09-28 | Real CW engineering closure: real-model Kit/Skill-bound authoring, 129/130 -> 130/130 | EV/harness-real-engineering-20260928/README.md | y | result |
| 9 | 09-28 | Third fixed Harness recipe: 35/35, npm install + fake-Host check_run 129/129 | EV/harness-check-recipe-20260928/parent-review/README.md | y | result |
| 11 | 09-28 | Dogfooding pre-push review: 30+8 HTTP probes, full 1808/1808 (Node 25.9.0) at 2487374 | EV/dogfood-review-20260928/README.md | y | holds the latest full-suite baseline count only here; belongs in current.md |
| 13 | 09-28 | New-surface UX acceptance: 16/16 + Luna 15/15, 1440/390 browser | EV/ux-continuity-20260928/README.md | y | result |
| 15 | 09-28 | G5 current-support and public-source-identity corrections; Pages build pins CLI 9e5384f, screenshot/install fd96f96 | execution/2026-09-08-main-round/public-readiness.md | y | result; mentions pins that are "current pointer" facts (owner: current.md/site) |
| 17 | 09-28 | B2 request-summary acceptance 10/10 + browser | EV/request-details-b2-20260928/parent-review/README.md | y | result |
| 19 | 09-27 | Hermes protocol acceptance (27 cases; synthetic only, no native Hermes) | EV/hermes-protocol-final-20260927/README.md | y | result |
| 22 | 09-27 | CB-D1 code-block density final acceptance | EV/code-block-density-20260927/parent-final/README.md | y | result |
| 24 | 09-27 | Fixed Attention recipe acceptance (catalog gains one recipe, not arbitrary args) | EV/attention-check-recipe-20260927/parent-review/README.md | y | result |
| 26 | 09-27 | Production 06c I1 frontend final acceptance | EV/runtime-settings-i1-final-20260927/README.md | y | result |
| 29 | 09-26 | Order 3 frontend independent acceptance | EV/stream-frontend-final-20260926/README.md | y | result |
| 32 | 09-26 | Order 3 backend independent acceptance | EV/stream-backend-final-20260926/README.md | y | result |
| 35 | 09-24 | P03-E cancellation parity correction: Host cancel persists exactly one canonical `check.settled` (cancelled, null exit/signal) | EV/core-runtime-loop-20260921/e-parity-evidence.md + EX/03-check-recipe.md | y | states a PRODUCT rule (cancelled check record shape) not a method rule; owner EX/03-check-recipe.md L72-L74 already carries it -> MOVE |
| 37 | 09-23 | K4 isolated backend preview AUTHOR candidate 98a3d69 (143/143, full 1643/1643) "not Luna/parent acceptance" | EV/kit-profile-preview-20260923/author-status.md | n | superseded by L189 K4 final acceptance; delete or move |
| 39 | 09-23 | Runtime selection R1 AUTHOR candidate 49e2c00 (full 1623/1623); "Main governance/status remain schema21 until parent review" | EV/runtime-selection-r1-20260923/author-status.md | n | superseded by L187 (schema22); stale statement |
| 41 | 09-23 | K3-R1 return 8e7171c; "Parent delta acceptance remains pending" | EV/kit-run-binding-20260922/r1/README.md | y | superseded by L175 |
| 43 | 09-22 | K3 backend author delivery b999007; "schema21 owns Kit summary..." | EV/kit-run-binding-20260922/README.md | y | superseded by L175/L187 (schema22) |
| 74-96 | 09-16 | Claude construction orders 01,02,03,04,05,06,07,00,P,08,09 and 09-review reply: each = targeted test counts, `npm test` totals (1086 ... 1196), browser eyeballing, "not done" list | EX/01-workspace-binding.md, 02-candidate-write.md, 03-check-recipe.md, 04-run-surface.md, 05-models-composer.md, 06-capability-consumption.md, 07-commands-compaction.md, 00-intake.md, p-home-identity.md, 08-presentation.md, 09-navigation-commands.md (+ anchor `#复核回应2026-09-16--luna-独立审查基线-f64c7e8` at L96) | y (all) | pure results. Each already has its owner record. (L74 and L116 record the known flake `review-core-client-lifecycle`, see 1.5) |
| 98 | 09-19 | Gap fixes independent acceptance (A-1, N-01/04/06); note "tracked evidence blob stayed byte-identical during the default run" | EX/node-acceptance-20260919.md#independent-acceptance-of-gap-fixes--2026-09-19 | y | result (+ small hygiene note, see 1.5) |
| 100 | 09-20 | 06b start friction (CE-1..4b counterexamples reproduced on unchanged a04b9ac first; 1289/1289; no PNG capture claimed) | EV/coding-start-friction-20260920/README.md | n | result; counterexample-first practice (1.5) |
| 102 | 09-20 | 06b two follow-ups (prepare Chat/candidate; approval identity) 1302/1302 | EV/prepare-and-approval-20260920/README.md | n | result; product boundary "ordinary tool-argument records untouched" |
| 103 | 09-20 | Independent review afc9f31; integration held PA-R1..R3 | EV/prepare-and-approval-review-20260920/README.md | y | superseded by L110 |
| 105 | 09-21 | Three prepare returns PA-R1/2/3 (1313/1313) | EV/prepare-lifecycle-returns-20260921/README.md | n | result; embeds lesson "test double controller != integration coverage" (1.5) |
| 106 | 09-21 | Round-2 review 6b39ecc, still held | EV/prepare-round2-review-20260921/README.md | y | superseded by L110 |
| 108 | 09-21 | Two recovery returns (production `createHomePreparation`, 1318/1318) | EV/prepare-round2-returns-20260921/README.md | n | result; same lesson |
| 110 | 09-21 | Preparation final independent acceptance b3f3fd7 | EV/prepare-final-integration-20260921/README.md | y | result |
| 112 | 09-21 | Integrated main a3503fb; idle Host 8787 restart; trees restored + bundle fsck | EV/prepare-final-integration-20260921/completion.md | y | result + cleanup ritual (1.5) |
| 114 | 09-21 | Prepared real coding dogfood (DeepSeek, 17 tool actions) | EV/prepared-real-dogfood-20260921/README.md | y | result |
| 116 | 09-21 | Answer-footer author return 1327/1328 (known flake) | EV/answer-footer-20260921/README.md | n | result |
| 118 | 09-21 | Independent answer-footer acceptance 17f57c0 | EV/answer-footer-review-20260921/README.md | y | result |
| 120 | 09-21 | P03-B independent acceptance (port tests, full 1326/1326) | EV/p03b-pi-runtime-port-review-20260921/README.md | y | result (product fact = architecture.md L29) |
| 123 | 09-21 | Transport final acceptance + Composer candidate review (held CE-R1) | EV/p03c-transport-acceptance-20260921/README.md, EV/composer-entry-acceptance-20260921/README.md | y | result |
| 125 | 09-21 | 06b work location entry author delivery 1332/1333 | EV/composer-entry-20260921/README.md | n | result |
| 127 | 09-21 | CE-R1 return (plain Home Send lock) 1352/1352 | EV/composer-entry-20260921/ce-r1-return.md | n | result |
| 130 | 09-21 | Composer CE-R1 final independent acceptance | EV/composer-ce-r1-final-20260921/README.md | y | result |
| 133 | 09-21 | 06c independent review (hold RM-R1/R2, RM-C1) | EV/runtime-management-review-20260921/README.md | y | superseded by L136 |
| 136 | 09-21 | 06c final frontend acceptance; Browser/Preview research intake, "Next 06d is authorized" | EV/runtime-management-final-20260921/README.md, research/architecture-node-2026-09-13/browser-preview-ruling-20260921.md | y | result |
| 142 | 09-22 | 06d split disposition (hold workspace-fetch close defect) | EV/tabbed-preview-review-20260922/README.md | y | superseded by L148 |
| 145 | 09-22 | First grammar audit ingestion; "Runtime-detail-only M1 lease is granted; 16px mapping is a measurement hypothesis" | design/grammar-convergence-20260921/disposition-20260922.md | y | design-governance decision; owner file already holds it (its L11, L16, L26, L32) -> MOVE |
| 148 | 09-22 | PV-R1 final / 06d B; C/D/E review hold CDE-R1 | EV/tabbed-preview-final-20260922/README.md, EV/core-cde-review-20260922/README.md | y | result |
| 151 | 09-22 | C/D/E final acceptance e49232e; schema19; ended tree removed | EV/core-cde-final-20260922/README.md | y | result |
| 154 | 09-22 | Local Pi parent review (hold LP-R5) | EV/local-pi-parent-review-20260922/README.md | y | superseded by L163 |
| 156 | 09-22 | Local Pi process author candidate (parent acceptance pending) | EV/local-pi-worker-20260922/author-status.md | n | superseded by L163 |
| 158 | 09-22 | LP-R4 author correction 6c87b7d | EV/local-pi-worker-20260922/README.md | n | superseded |
| 160 | 09-22 | LP-R5 author return 7ab46d0 (protect referenced Spark Session/Run at delete) | EV/local-pi-worker-20260922/lp-r5/README.md | n | superseded |
| 163 | 09-22 | Local Pi final adoption; closure audit | EV/local-pi-final-20260922/README.md, EV/work-closure-audit-20260922/README.md | y | result |
| 166 | 09-22 | Kit K1/K2 final adoption (pure compiler only) | EV/kit-final-20260922/README.md | y | result (product fact = architecture.md L37) |
| 169 | 09-22 | M1 final acceptance (40 -> 16px detail margin) | EV/m1-final-20260922/README.md, EV/clean-node-20260922/README.md | y | result |
| 172 | 09-22 | Post-push Pages parity correction: added Pi paragraph to site/src/readme.mjs; both READMEs byte-unchanged; site build + 188-file equality | EV/clean-node-20260922/README.md#push-dispatch-and-generator-correction | y | result; the rule "README.md is generated from site/src/readme.mjs" is already in site/README.md L26 |
| 175 | 09-23 | K3 parent final acceptance (persisted-history probe now refuses) | EV/kit-run-final-20260923/README.md | y | result |
| 178 | 09-23 | E1 combined parent review (frontend held) | EV/e1-parent-review-20260923/README.md | y | superseded by L181 |
| 181 | 09-23 | E1 final parent acceptance | EV/e1-final-20260923/README.md | y | result |
| 184 | 09-23 | LP-R6 final acceptance | EV/local-pi-recovery-final-20260923/README.md | y | result |
| 187 | 09-23 | R1 final acceptance (schema22/Core4/bridge5 aligned) | EV/runtime-selection-r1-final-20260923/README.md | y | result |
| 189 | 09-23 | K4 final acceptance | EV/kit-profile-preview-final-20260923/README.md | y | result |
| 191 | 09-23 | K5 parent review (R1/R2/F1 returned) | EV/kit-profile-editor-review-20260923/README.md | y | superseded by L195 |
| 193 | 09-24 | K5 correction delta review (R2 remains open) | EV/kit-profile-editor-review-20260923/return-r1-review/README.md | y | superseded by L195 |
| 195 | 09-24 | K5 final independent acceptance | EV/kit-profile-editor-final-20260924/README.md | y | result |

### 1.4 Contradictions / stale statuses inside verification.md (all are interim-vs-final, not rule conflicts)
- Same item at two states in the two blocks: K4 author candidate L37 ("not Luna/parent acceptance") vs K4 final L189; R1 author candidate L39 ("Main governance/status remain schema21") vs R1 final L187 ("Schema22"); K3-R1 return L41 ("parent delta acceptance remains pending") and K3 delivery L43 ("Schema21 owns Kit summary...") vs K3 final L175.
- "held"/"pending" entries later closed: L103,L106 (PA hold) -> L110; L127 (CE-R1 return) -> L130; L133 -> L136; L142 -> L148; L154,L156,L158,L160 -> L163; L178 -> L181; L191,L193 (R2 open) -> L195 (R2 closed).
- Test baselines conflict as status: L74-L96 (1086..1196), L172 "Backend 1538/1538 remains the product baseline", L11 "full 1808/1808 at 2487374" - only the last is current; belongs in current.md, not in the method.
- Schema numbers in receipts: L43 schema21 vs L187 schema22 (current per AGENTS.md L28 and app/README.md L120).
- Method L70 ("XState, Playwright CLI ... optional only, no dependency") vs architecture.md L33 (Playwright-controlled isolated Chromium "first later control candidate"): different scopes (verification tooling vs browser-control capability) but a reader may see tension; state scope once.

### 1.5 Method-level rules that appear ONLY inside dated receipts
1. UI evidence recording (L139) - see MERGE above. Duplicated in design/visual-spatial-grammar.md L54/60/64, AGENTS.md L15.
2. "Drive the production owner, not a test-local stand-in": lifecycle/integration tests must run through the production module and the real card/controller; source-pin assertions move with the code and keep the same invariant (L105 "两处断言...", L108 "复核指出的「替身控制器不等于集成覆盖」...三处既有源码钉断言随其所钉代码迁移", L125 "outdated home-scope source pin rewritten to the same invariant", L80). Not stated in the L45-72 method; closest is L56/L57 table rows and L66.
3. Counterexample-first: reproduce the failing counterexample on the unchanged baseline bytes before the fix, then show pre/post (L100 counterexamples.txt, L116 "six new tests fail against the unchanged product files", L127 reproduced first). L66 only says sink minimal counterexample into contract/integration tests.
4. Known concurrency flake policy: a single failure of `review-core-client-lifecycle` under concurrent `npm test` (Core bridge ready timeout) is reported as known flake with a solo re-run 13/13, no code change (L74, L116). Also documented in other execution docs (00-intake.md, 01-workspace-binding.md, p03b-pi-runtime-port-20260921.md, ux-polish-release-20260924.md), not in the method.
5. Ended-tree cleanup ritual: restore exact source tree/archive and clone-fsck a Git bundle before removing an ended worktree (L112, L151, L163, L166, L169, L189, L195). Owned by execution loop docs (design/grammar-convergence-20260921/astra-loop.md, execution/.../next-dispatch-20260921.md, local-pi-worker-loop-20260922.md, core-runtime-loop-20260921.md ...), not verification method -> MOVE out, do not merge.
6. Standard "unexecuted" vocabulary: ~40 receipts end with a list (native 200% zoom, screen reader, forced-colors, coarse pointer, dark, error matrices, real provider, non-author review, PNG capture when the author tool cannot write images -> "no visual baseline claim" L100/L102/L105/L116). L68 says only "未跑项和限制". A one-sentence checklist in the method would absorb this.
7. Independent-browser convention: "OpenAI in-app browser / computer use" is the independent acceptance browser; author-tool DOM/network records are not a visual baseline (L100, L102, L116; also design/visual-spatial-grammar.md L64; AGENTS.md L8 "Keep computer-use execution on an OpenAI provider"). Only partly in method L64.
8. Tests must not rewrite tracked evidence blobs during the default run (L98). Small hygiene rule; owner could be tests/README or the evidence owner.
9. Generated-artifact check (L172): for README/Pages changes, run the site build + generated-output equality check (README.md == site/src/readme.mjs output) rather than the product baseline. Table row L55 ("生成物: 链接/生成同步") is compatible; the concrete command lives in site/README.md L26.

---------------------------------------------------------------------------
## 2. engineering/architecture.md (130 lines)

### 2.1 Layout
(b) dated addenda as `##` sections, in scrambled order:
- L3-7 "2026-09-27 · Attention integration and development material"
- L13-15 "2026-09-13 · 当前五层架构"
- L17-25 "2026-09-19 · Local Agent Orchestra direction"
- L27-29 "2026-09-21 · Implemented Pi execution seam"
- L31-33 "2026-09-21 · Preview and browser surface boundary"
- L35-37 "2026-09-22 · Kit context planning seam"
- L39-41 "2026-09-23 · Selected profile draft preview"
- L128-130 "2026-09-20 · Pi identity and understandable configuration" (at end of file)
(a) standing body: L9-11 intro; L43-49 变更边界; L51-75 当前实现 (L53 BG-01, L55 baseline, L57-69 module table, L71-75 数据归属); L77-93 最小交付 + ASCII diagram; L95-112 M01-M14 table; L114-118 dependency boundaries; L120-122 replacement axes; L124-126 开工粒度.
(c) nav: L9 (options/current), L11 (roadmap), module table L57-69 (all links), L75 link to app/README.
Note the body's own H2s are undated ("变更边界", "当前实现", ...) but sit between dated H2s; the file title is L1.

### 2.2 Dated addenda: rule impact
| Lines | Date | Gist | Link (exists) | MERGE or MOVE |
|---|---|---|---|---|
| 5 | 09-27 | Attention/Dogfooding ruling: Hermes first research candidate for the next Attention-specific consumer of the Runtime Port; Core retains Attention state and human formal actions; Host retains admission, captured identity, disclosure, effects; native runtime persistence = execution evidence; "No gateway, watcher or Skill receives those authorities by installation. Notification delivery and Run completion do not resolve Attention." | research/attention-assistant-20260927/decisions.md (yes) | MERGE - standing authority split |
| 7 | 09-27 | "K3 final acceptance supersedes the September22 paragraph's missing Run-freezing consumer"; P03-B and K1-K5 accepted; developer reading index | execution/.../evidence/kit-run-final-20260923/README.md (yes); research/attention-assistant-20260927/INDEX.md (yes) | MERGE - explicitly overrides L37 |
| 15 | 09-13 | Five-layer ruling (Adapter, Harness Core/Extension, Work Core/Extension); "下表仍导航实现，不按目标名推导同名服务已存在" | research/architecture-node-2026-09-13/architecture.md, architecture-runtime-canon.md, explore/implementation.md (yes) | MERGE - it is the current architecture statement; should lead the file |
| 19 | 09-19 | Local Agent Orchestra: no sixth layer/second ledger/generic workflow engine; CW owns Host admission/effect/recovery etc.; Role/Kit/Agent Instance/Expert/Runtime/Provider/Model/Environment separate vocabulary | research/architecture-node-2026-09-13/orchestra-direction-20260919.md (yes) | MERGE |
| 21 | 09-19 | Minimum Runtime Port lifecycle `describe/admit`, `start/continue`, `observe/recover`, `reply/tool-result`, `interrupt/cancel`, `dispose`; cancel request != confirmed termination; unknown stays unknown | (RD-001/006/009 by name) | MERGE - standing contract |
| 23 | 09-20 | Local-runtime + Settings ruling: Agents -> Agent profiles/Runtimes; Models keeps provider ownership; removal, native uninstall, cancellation separate | research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md (yes) | MERGE (short) |
| 25 | 09-20 | Personal credentials/hooks ruling: Host-held secret refs, RD-009 hook governance; "Secure storage is a target, not a claim of current encryption or process isolation" | same file + anchor `#personal-credentials-hooks-and-browser-dogfooding--2026-09-20` (yes) | MERGE as a status caveat, or MOVE to that owner |
| 29 | 09-21 | P03-B accepted at c2be594: `server/runtime.mjs` constructs `createPiRuntimePort`, passes to `RuntimeService`; port owns native journal open/create/history, execution/steer, compaction, event translation; Host keeps Run identity/admission/status, tools/permissions, effects, credentials, recovery arbitration; "not completed arbitrary-runtime replacement" | EV/p03b-pi-runtime-port-review-20260921/README.md (yes) | MERGE - changes L122 and L61 |
| 33 | 09-21 | Browser/Preview: three separate concerns (artifact/dev-target Preview, human-visible Browser projection, Host-governed browser control); Playwright isolated Chromium first later candidate, WebContentsView conditional; "Browser resources are not automatically Work Core Matter state, closing/hiding a view is not execution cancellation or profile deletion"; "first authorized UI increment is tabbed Preview" (status; accepted per verification.md L142/L148) | research/architecture-node-2026-09-13/browser-preview-ruling-20260921.md (yes) | MERGE rules; drop status sentence |
| 37 | 09-22 | K1/K2 `planKitContext` pure Harness contribution; "Kit catalog/selection/import and production Kit->Run freezing remain separate missing consumers" | EV/kit-final-20260922/README.md (yes); ../app/runtime/kit-context.mjs (yes) | MERGE core rule; the "missing consumers" sentence is OVERRIDDEN by L7/L41/L73 |
| 41 | 09-23 | K4 selected-profile draft preview (in-memory overlay; no persistence/authority; whole-config CAS; Run admission freezes context); "K5 frontend consumer is now independently accepted" | EV/kit-profile-preview-final-20260923/README.md, EV/kit-profile-editor-final-20260924/README.md (yes) | MERGE rule; status wording "now ... accepted" drops |
| 130 | 09-20 | Pi is upstream runtime name and dev target; keep underlying IDs; Agent/Kit/Runtime/Provider/Model consistent presentation; Multica informs organization only | research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md#comprehension-presentation-and-document-ownership (yes) | MERGE - duplicates AGENTS.md L19 and product-direction.md L101 (three copies) |

### 2.3 Contradictions / staleness
1. L7 + L41 + L73 vs L37: L37 says production Kit->Run freezing is a missing consumer; L7 states K3 supersedes that; L73 states the K3 contract adds Run-owned Kit summaries with immutable payload refs. L37 also says "Kit catalog/selection/import ... missing"; L73 says Existing-Chat profile selection accepted under E1 and K5 editor accepted, but "structured Kit creation/acquisition" remains separate.
2. L29 (server/runtime.mjs constructs createPiRuntimePort) vs L122 ("当前service的Pi SessionManager耦合还需先移出"). Code check: `grep SessionManager app/server/service.mjs` finds nothing; SessionManager remains only in app/runtime/pi-runtime-port.mjs and pi-session-runtime.mjs; app/server/runtime.mjs L5/L41 imports/uses createPiRuntimePort. So L122 is stale: what remains is Provider/model helpers and Pi-shaped options/outcomes (as L29 itself says). Same staleness in decisions.md L179 (historical, correct at its date).
3. L73 mixes standing schema statement with acceptance status ("accepted schema22", R1 adoption, E1, K5) - rule text should be "schema 22 / Core 4 / bridge 5 evolve independently; Run/Session executor choice; K3 Kit summaries", statuses to current.md. It links `../app/README.md#store-schema-v5-validated-v3v4-upgrade` (L75): resolves only via an `<a id>` alias in app/README.md L108; the real heading is `Store schema (v22, validated v3–v21 upgrade)` (L120).
4. L55 "模块表起始基线 00b2f28..." is a dated baseline SHA inside a standing table.
5. L11 says "下方最小交付限定首个 continuity 纵切"; L17-25 Orchestra and L15 five-layer text partially overlap with the M01-M14 table (L95-112): M04 "薄适配", M02 "复用，不重写循环" vs L29 "port owns ... execution/steer, compaction".
6. L62 module-table row for local Pi describes an "Explicit offline Spark process consumer", consistent with README.md L72; fine.

---------------------------------------------------------------------------
## 3. engineering/decisions.md (231 lines) - an ADR log; dated by nature

### 3.1 Layout
(a) rule: L1-3 (status vocabulary; user final arbiter), L43-45 "后续记录格式" (when a DEC is required) - misplaced between DEC-004 and DEC-005.
(b) records: DEC-001 L5-13; DEC-002 L15-23 (proposed); DEC-003 L25-32 (proposed); DEC-004 L34-41; DEC-005 L47-53; supplements interleaved out of order: "DEC-003 追加" L55-57, "DEC-002 v3" L59-61, "DEC-002 v3.1" L63-69; DEC-006 L71-79 + supplement L81-85; DEC-007 L87-95 + supplements L97-116 (V5, V6, fresh Astra, V7); DEC-008 L118-124; DEC-009 L126-134 + supplements L136-138 (handoff to Codex), L153-160 (open-source provenance review); DEC-010 L140-144 + untitled "2026-09-07 后端持续施工补充" L146-150; DEC-011 L163-170; DEC-012 L172-189 (+接收补注 L185, 首屏分层 L187-189); DEC-013 L191-195; DEC-014 L198-202 + supplements L205-231 (Court L205-207, Spark L209-211, Workspace Substrate L213-215, 可接续工作场 L217-219, Orchestra L221-225, Attention/Dogfooding L227-231).
(c) nav: none besides embedded links; historical paths all resolve through `migration/2026-09-08/evidence-index.md`.
Every cited link exists.

### 3.2 Which entries change rules that live elsewhere (must be reflected in owner docs, not here)
- L229 (DEC-014 supp 09-27): Hermes first for the next Attention-specific integration research, "refining the earlier Agents API-first ordering ... for this use case only". Overlaps architecture.md L5, product-direction.md L5. The earlier ordering appears unscoped in product-direction.md L95, research/README.md L9, README.md L66.
- L223-225 (09-19 Orchestra): vocabulary and "no sixth layer" -> duplicated in architecture.md L19, product-direction.md L13.
- L231: developer documentation via Map/Grammar/Tools/Gates; reject `.cw/`/`specs/` roots.

### 3.3 Contradictions / stale statuses
- DEC-002 (L17) and DEC-003 (L27) still "proposed" (2026-09-05). DEC-009 (L131-133, accepted 2026-09-07) picks K1 Pi + DeepSeek and the shipped Core is SQLite State + audit (architecture.md L66, L104; app/README schema 22). No "superseded"/"accepted" update. RD-002 also still "experimenting" (research/RD-002-commit-recovery.md L3) and core-contracts.md L62 still lists "Event as sole source vs transactional State+audit" as an open question. Needs an Astra/user ruling, do not silently flip.
- DEC-006 supplement L81-85 leaves "是否需要正式修订...留待用户裁决"; DEC-009 L132 records "用户 2026-09-07 确认按此推进" (resolved but the earlier note still reads as open).
- DEC-008 L122 "当前位于 PT0, critical path G2 accept -> G1 -> ..." and L123 "正式Runtime未选(选择落在PT2)" contradict DEC-009 and the current Pi-default state; roadmap.md L72 says PT0-PT9 is historical.
- DEC-005 L51 "正式Runtime/provider和视觉仍未采纳" superseded by DEC-009.
- DEC-012 L179 "已知 service.mjs 直接使用 SessionManager" - true at 2026-09-08, false now (architecture.md L29; grep).
- DEC-013 L195 "现Pi0.85.1、RuntimeStore12/Core4/app5" - historical snapshot; current is schema 22.
- DEC-012 L180 asked roadmap/current to sync 9.3 -> 9.6: roadmap.md L72 and engineering/README.md L29 now say 9.6 (done). current.md L1255 keeps "Core历史9.3证据不重标" deliberately.

---------------------------------------------------------------------------
## 4. engineering/product-direction.md (101 lines)

(a) body: L9 (provenance "2026-09-15 · Astra裁定" - a metadata line buried under two addenda), L17-97: 从工作出发 L17-21; 下一节点完整路径 L23-29; 经典而有限的产品形态 L31-44 (table L33-40); Chat/Spark/Attention/执行角色 L46-54; 资料保留与合理遗忘 L56-64; 可组合呈现 L66-81 (table L70-75); 可替换执行与专业能力 L83-89; 节点的收敛边界 L91-97.
(b) addenda: L3-7 (2026-09-27 Attention and developer Kit direction); L11-15 (2026-09-19 Orchestra composition); L99-101 (2026-09-20 Understandable agent configuration).
(c) nav: L97 (release/product-node-2026-09-15/README.md, current.md), L9.

| Lines | Gist | Link (exists) | MERGE/MOVE |
|---|---|---|---|
| 5 | Attention = role independent of lifecycle/identity/permissions; event or periodic activation, no continuous model computation; Hermes first for next Attention-specific integration research; Pi stays accepted path; "refines the earlier Agents API-first research ordering for this use case only"; Spark keeps distinct preparation/comparison role | - | MERGE - contradicts L95 unless scoped |
| 7 | Dogfooding Kit follows Map -> Grammar -> Tools -> Gates; no second ledger, executable Skill, scheduler | research/attention-assistant-20260927/decisions.md (yes) | MERGE (one sentence) |
| 13 | Role/Kit/Agent Instance/Expert definitions; "A lightweight profile is not an accepted Expert loop" | research/architecture-node-2026-09-13/orchestra-direction-20260919.md (yes) | MERGE |
| 15 | Hermes+Attention Kit+Praxis and Pi/Codex+coding Kits are target compositions, not installed; Kit precedes Skill in Context compilation but grants no authority; one Adapter per Runtime family/version; Composer obeys existing Models card (`All chats · future runs`, `expectedVersion`, active-Run freeze); Pages registration | execution/.../orchestra-pages-registration-20260919.md (yes) | MERGE |
| 101 | Understandable-configuration target ("choose an agent, apply a Kit, execute through Runtime/model, inspect, continue"); same object names in Composer/Settings/README/Pages; no completed onboarding test claimed | research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md#comprehension-presentation-and-document-ownership (yes) | MERGE; duplicates AGENTS.md L19 and architecture.md L130 |

Contradictions / staleness: L95 "Agents API保持第二执行组合的优先核验候选; 当前 Pi dogfooding 沿原任务继续" vs L5 Hermes-first-for-Attention (scoped refinement, but only stated in an addendum). L93 "下一节点完成..." and L27 "下一节点的首个完整消费者" are relative-time phrases pinned to 2026-09-15; the 06b/K-series receipts show much of that path accepted (verification.md L114 real dogfood, L92 facts slice), so "下一节点" wording is stale. Mirrored by README.md "Next implementation milestone" (L39-49).

---------------------------------------------------------------------------
## 5. engineering/roadmap.md (329 lines) - structure only

(b) dated/override addenda occupy the top and the tail:
- L3-6 (2026-09-13 自足架构方向: "覆盖下方历史排序与同义候选")
- L8-12 (2026-09-12 Harness本轮授权排序: "本段覆盖下方历史'待用户排单'"; second Runtime replacement no longer prerequisite of coding dogfooding; L12 Chat Memory Broker registration)
- L14-16 (2026-09-12 资源、消息与持久成果治理准备)
- L18-26 (Paper出版面 2026-09-11 + two 09-11 continuation lines L22, L25)
- L28-34 (2026-09-11 架构消费与发布准备; L33 WO-VS-01 receipt: "产品f99af46, 767/767")
- L36-41 (本轮polish准备入口 2026-09-11)
- L43-66 (当前串行执行入口 2026-09-10: L45 "最新核账 2026-09-11 ... 当前NOT_READY ... 本段覆盖其中候选状态和WORK-3待裁定描述"; L47-55 "用户后续排序修订" "本段覆盖下表原先以 BE-41 并行片作为近期主导的排序"; table L57-62 with the overridden BE-41 row L60; L64 loop; L66 2026-09-10 supplement)
- L315-319 (2026-09-11 系统Design送审), L321-329 (2026-09-12 工作义务闭环登记, five dated 09-12 items)
(a) rule body: L68-72 (status header + scope + Paper pin "9.6 / d78fd31..." and numbering-systems note), L74-314 (§1-§12: 治理厚度, 三条工作链, 目标架构与所有权, 全交互覆盖, 多种工作表面, 部署/状态/信任, 长程执行, 代表性验证, R0-R5 L219-234, §10 当前切片与扩展触发 L236-283, §11 L284-292, §12 L294-313).
(c) nav-like: §10 L238-270 is a consumption index of research packets with links (2026-09-09/10 refs inside, e.g. L135, L251, L257, L261, L265, L269) plus one trigger table L271-280; L296 and L313 are pointers.
Order of top addenda is not chronological (09-13, 09-12, 09-12, 09-11, 09-11, 09-11, 09-10).

Rule-changing addenda (MERGE): L5 (five-layer ruling overrides old ordering; second runtime is not a prerequisite; Work governance expansion registers principle/owners/gaps, not full implementation); L10 (coding dogfooding first; P03/P04/DRT-03 and Compiler/Core-free/same-Expert proofs by actual consumer; G1-G5 stay with owner); L49-L55 (sequence: basic GUI + general harness closure -> self-sufficient stable node -> self-built orchestration wrapper + independent runtime replacement; "此处是唯一总顺序入口"; each round re-reads HEAD). Result-only (MOVE): L33, L45, L59-L62 table state, L25, L38-L40, L315-329 (registrations, "未宣称已实现"). Links: all exist (e.g. ../evidence/semantic-polish-20260911/README.md at L33, release/*, research/*).

Contradictions: table L57-L62 still lists BE-41 "并行施工" while L49 says it no longer leads; L45 "当前NOT_READY" is a 09-11 state that L33/L72 already say is historical; L53 sequence (replacement validation last) vs L5/L10 (second runtime not a prerequisite of dogfooding) are compatible but stated in two places; L72 "main已按用户授权先行接管" vs L45-L55 baselines `9097cbf`/`1992e90` (old main SHAs in a "唯一总顺序入口").

---------------------------------------------------------------------------
## 6. engineering/README.md (43 lines)
(a) L10 (repo ownership), L12 (start-here links), L14 (verification pointer), L25, L27-29 (Paper boundary: SE 9.6, DEC-012), L43.
(b) L3 (2026-09-27 "Attention / Dogfooding development reading route" - dated pointer at the top; link research/attention-assistant-20260927/INDEX.md exists; result/pointer only, no rule change).
(c) L5, L7 (product-direction, release/product-node-2026-09-15, canon, deepseek-runtime intake, architecture-reconciliation; note "保留各自范围与日期"), L16-23 reading order, L31-41 directory table, L12.
Issues: nav table omits `ecosystem/` (linked only at L10) and `reviews/`, `options.md`, `pre-takeover-roadmap.md`; L7 keeps 09-11 items in the top block; L18 says current.md is the sole product-status entry while it is a 1567-line dated log.

## 7. engineering/governance.md (67 lines)
(a) all rule: L3, L5-16 flow, L18-27 SE mapping table, L29-35 roles, L37-49 assignment template, L51-57 续行/收工, L59-63 propagation, L65-67. (b) none. (c) none.
Stale phrasing only: L31 "本轮同意文档落地不自动批准表中候选技术" (a 2026-09-05 event as "本轮"); L67 "尚未授权实际向维护者发送...本阶段" and L3 "当前由人和Agent手动执行" predate the Astra/Luna/DeepSeek routing in AGENTS.md L8. No contradiction with other rules found.

## 8. engineering/core-contracts.md (66 lines)
(a) all rule: L3-5 scope, §1-§6 L7-56, §7 open questions L58-66. (b) none. (c) none.
Inconsistencies: L1/L3 "设计候选 ... 尚未通过运行验证" vs L5 "样本Core已有部分实现" vs architecture.md L66 (Core implemented, user schema 4) - header status stale. L62 open question "Event vs State+audit" vs DEC-003/RD-002 still proposed/experimenting (see 3.3).

## 9. docs/README.md (32 lines) and docs/repository-layout.md (45 lines)
docs/README.md: (c) all. (b) L25-32 "历史交付记录" section (history list, appropriate). `repository-layout.md` is not listed in docs/README (only file unlisted).
docs/repository-layout.md: (c) L3-14 table; (a) L16-20 (generated vs source: `site/dist/`, `brand/exports/`), L22-27 (doc ownership: current.md sole status, contracts vs execution vs evidence), L29-41 "研究输入与下一轮开工" (rule + table L33-39; wording "下一轮"), L43-45 (public assets). No dated addenda. L24 duplicates engineering/README.md L18.

## 10. app/README.md (325 lines) and app/docs/README.md (37 lines)
app/README.md: (a) L1-106 and L178-325 reference/rules (Modules L12-28, Model connections L30-47, Run, Tools, Checks ...). (b)/(accumulated): L108-119 = 12 `<a id>` legacy anchors (v5, v7-v13, v17-v19) that exist only so old links keep working (inbound: app/docs/README.md L9 -> v9 alias; app/docs/api-v6.md L469 -> v17; docs/runtime-control/architecture.md L35 -> v13; engineering/architecture.md L75 -> v5; evidence/release-preflight-20260913/public-facts.md L13 -> v13). L120-176 "Store schema (v22, validated v3–v21 upgrade)" is layered version-by-version prose: Runtime22 L124-132, Runtime21 L134-143, Runtime20 L144-149, Runtime19 L149-153, Runtime18 L154-157, Runtime17/16 and older inside one 2,763-character line L157, then an orphan tail L158-171 ("INVALID_STATE ..." then " Sessions no longer keep a private `_history`...", which reads like text spliced from an older heading). No dates, but each layer is a per-schema addendum. Links to K3 contract (L141) and Spark contract exist.
app/docs/README.md: (c) all. Stale entries: L6 "尚未实现的slash/manual入口" (typed commands and manual compaction shipped: verification.md L86, app/docs/commands-and-compaction.md "Current support 2026-09-16 · CMD-01/CMP-01 first slices"); L9 "当前 Host schema 10" while the anchor `#store-schema-v9-...` lands on the v22 section; L31-L37 items appended after the footer L29; 9 docs in app/docs not listed (check-recipes.md, example-workspace.md, hermes-api-runs.md, projectless-chat.md, repository-binding.md, request-telemetry.md, runtime-proposals.md, spark-agent.md, supported-preview.md).

## 11. engineering/design/README.md (44), research/README.md (117), execution/README.md (16), release/README.md (38), ecosystem/README.md (51)
design/README.md: (c) L3 (UI read-first route), L5 (2026-09-16 Claude serial order pointer, dated), L11-32 series index (table L15-30; L13 Apple HIG 09-14; L32 09-09 integration design), L36 (09-09 Clean and Cool); (a) L7-9, L38-40, L42-44 (design role, relation to Core contracts/decisions, maintenance granularity). No rule-changing addenda; 31 of 35 subdirectories and 7 top-level .md (chat-reading-2026-09-11, icon-controls, les-privilege-paper-2026-09-11, object-command-grammar-20260914, surface-hierarchy, type-density-constraints, ux-conventions) are unlisted. L5 says the 09-16 packet is registered; execution/README.md L5 says "planning registration, not implementation acceptance" although verification.md shows most slices accepted (stale).
research/README.md: (c) L3-35 (newest-first packet links; L3 09-27, L5/9/11 09-19/20, L13-34 09-11..13) and L75-117 (later dated headings: 2026-09-10 Multi-agent L75, "近期来源消费" L79-87, 09-11 L89-109, 09-14 L111-117); (a) L37, L47, L49-55 共同证据格式, L57-69 共同门槛 G1-G7 (table L59-67), L71-73 新卡最小格式 - the standing rules are sandwiched between two nav lists; RD table L39-45. Stale statuses: L29 "用户指定稍后消费，未研究裁定或派单", L87 "待用户merge清洁节点开工", L15 RD-008 "未实现新入口" (implemented per verification.md L86); L9 "Agents API first new-runtime sample" vs L3 Hermes first. 40 of 67 subdirectories unlisted.
execution/README.md: (c) all (L5-14 packet list); (a) L3, L16 (packets are plans/records, current.md owns status). 10 of 20 packet dirs unlisted (2026-09-10-backend-governance, -benchmark-series, -chat-shell-proportion, -next-round, -summary-disclosure; 2026-09-11-claude-handoff, -claude-intake, -merge-node, -semantic-polish, -summary-be41-dispatch).
release/README.md: (c) L3-14 (top links) and L19-20 lists, L24-38 five dated `##` sections (09-11); (a) L17 and L22 (scope, "release note != deployed"). Order scrambled: description sits at L17 below eight link paragraphs. Contradiction: L9 and L26 say Claude Paper work is "待作者认领/已授权待作者认领", while L30 says "Paper预发布已返回" (returned/integrated per research/README.md L25, L95). L14 "当前未改Pages或部署" is a 09-11 status. 11 of 19 release subdirs unlisted.
ecosystem/README.md: (a) L3, L5-23 (consumption loop, source-card requirements), L35-37, L39-45 (adoption maintenance); (c) L47-51 index; table L27-33 = status ("内部问题，未发送"), L35 "本次未向任何维护者发送消息" (stale "本次"). No dated receipts. No contradictions found.

## 12. AGENTS.md (37) and README.md (143) / README.zh-CN.md (144)
AGENTS.md: (a) L3-15, L19-23, L27-31, L33, L37. (b) only L32 ("The user authorized main takeover on 2026-09-08 ... See evidence/main-cutover-20260908/README.md") - a dated authorization phrased as standing rule (exists, no rule change needed beyond stating "main takeover is authorized; gates continue"). Duplication: sole persistent development entry stated at L3, L33 and L37; Pi naming/Agent-Kit-Runtime consistency L19 duplicates architecture.md L130 and product-direction.md L101; schema numbers L28 (Host 22, Core 4, bridge 5) match architecture.md L73 and app/README.md L120. L31 requires synchronizing current entry points "under verification.md" -> depends on method L72 surviving the rewrite.
README.md: generated from site/src/readme.mjs (site/README.md L26); README.zh-CN.md handwritten. (a) L1-49 product description; L51-74 "Development direction" mixes intent (L53-61), planned sequence (L63-68), and status (L70 "the Agents API lane remains unavailable", L72 offline Pi consumer); L76-86, L88-109 run instructions, L111-126 rules/doc language, L128-139 nav. No dated receipts. Possible stale/overlap: L39-49 "Next implementation milestone" (mirrors product-direction "下一节点"); L66 Agents API sample second/Hermes step 4 (consistent with scoped Hermes-first refinement). Editing README.md means editing site/src/readme.mjs and README.zh-CN.md together (AGENTS.md L21).
zh parity: headings translated except `## Can the work continue?` (README.zh-CN.md L80 still English) and `## License`; otherwise same 12 sections.

---------------------------------------------------------------------------
## 13. Cross-file contradiction index (all evidence above)
1. Kit->Run freezing "missing consumer": architecture.md L37 vs L7/L41/L73 (K3/K4/K5 accepted).
2. Pi execution seam: architecture.md L29 (port constructed by runtime.mjs) vs L122 (service still coupled to Pi SessionManager) vs code (service.mjs has no SessionManager) vs decisions.md L179 (historical).
3. Second-runtime ordering: product-direction.md L95, research/README.md L9, README.md L66 (Agents API first) vs product-direction.md L5, architecture.md L5, decisions.md L229 (Hermes first for Attention-specific research only).
4. Schema level: app/docs/README.md L9 "schema 10"; decisions.md L195 "RuntimeStore12"; verification.md L39/L43 "schema21"; vs AGENTS.md L28, architecture.md L73, app/README.md L120 (22).
5. DEC-002/DEC-003/RD-002 "proposed/experimenting" and core-contracts.md L1-L5, L62 "design candidate, not run" vs shipped Core/State+audit and DEC-009 Pi/K1 selection.
6. DEC-008 L122-123 (PT0 current, runtime unselected) vs DEC-009 and roadmap.md L72.
7. Roadmap table L57-62 (BE-41 parallel) vs its own override L49; L45 NOT_READY vs L33/L72.
8. Interim vs final statuses in verification.md (see 1.4).
9. app/docs/README.md L6, research/README.md L15 "manual/slash not implemented" vs verification.md L86 and app/docs/commands-and-compaction.md (shipped 09-16).
10. release/README.md L9/L26 (Paper task awaiting claim) vs L30 (returned).
11. execution/README.md L5 and design/README.md L5 ("planning registration, not implementation acceptance") vs verification.md/current.md acceptances of the 09-16 packet slices.
12. Three-way duplication: Pi naming/config comprehension (AGENTS.md L19, architecture.md L130, product-direction.md L101); sole dev entry (AGENTS.md L3/L33/L37, engineering/README.md L10, docs/repository-layout.md L24).

## 14. Suggested disposition (for the rewrite, derived from the above)
- verification.md: keep L45-72 (+ one pointer for L139, plus optional one-sentence additions for items 1.5 #2,#3,#4,#6,#7); delete L3-43 and L74-195 (all 72 receipts already have an evidence README that exists; 60 already listed in current.md; the 12 not in current.md: L37,39,100,102,105,108,116,125,127,156,158,160 -> add to current.md or leave with evidence README). Optional history section: a plain list of evidence-owner links (no results). No inbound anchors to preserve.
- architecture.md: rewrite as one current-state body (five layers -> Runtime Port lifecycle -> authority split incl. Attention -> module table -> data ownership -> boundaries); fix L122 and L37 stale claims; drop dated headings and L55 baseline SHA; fix L75 anchor when app/README aliases are removed.
- product-direction.md / roadmap.md: fold override addenda into body; delete overridden roadmap table L57-62 and 09-11 status lines; keep provenance line once.
- decisions.md: keep as ADR log; needs status reconciliation (DEC-002/003/005/008) and reordering of supplements under parent DECs; move "后续记录格式" (L43-45) beside the status vocabulary (L3).
- app/README.md schema section: replace per-version layering with a single "current schema 22 + migration owner" statement; if legacy `<a id>` aliases are removed, retarget the 5 inbound links listed in section 10.
