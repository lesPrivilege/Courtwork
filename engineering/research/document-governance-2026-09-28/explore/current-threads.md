# current.md thread extraction (raw material, not final wording)

Source: `engineering/current.md` at HEAD ffe68fb (1567 lines, 308 `## ` sections, whole file read). All paths below are relative to `engineering/` exactly as written in current.md unless marked `[git]` (read-only `git` observation, not in current.md) or `[owner]` (from a linked packet, not current.md). Uncertain groupings are marked `(?)`. **Line references** in parts 1-4 point either to the `## ` heading line or to its first body paragraph (heading+2, occasionally a later paragraph of the same section); part 5 lists the heading lines, so `line N` maps to the section whose heading is the nearest listed line <= N.

File-structure caveat (matters for the history split): the file is newest-first only down to line ~1140 (2026-09-11 entries). Below that it is a mixed 2026-09-08..09-11 block in **no consistent order**: old-format headings (`## Xxx（2026-09-10）`), undated 09-08 sections (`本轮责任与完工节点`, `新接两单`, `已成立的证据`, `仍未闭合`, `责任与历史`), a stray paragraph at line 1215 (`更新：2026-09-10。唯一开发入口为 Courtwork...`), and the newest of that block (`Pages 合流裁决（2026-09-11）`, line 1563) at the very end. Section 1237 (`本轮责任与完工节点`, lines 1237-1295) is a 60-line rolling status table plus a chain of WK10b/WK13/WK12/WK11/FE-01..04/CC-S/CC-W acceptances (2026-09-08..09).

Role vocabulary as used in current.md: **Astra** = parent/main coordinator (architecture, independent acceptance, main integration); **original Claude** (Opus; also "Claude Code conversation") = frontend/UX and (until 09-28) core author, serial writer; **Sonnet** = bounded exploration via Claude; **Luna** (GPT-6 Luna) = read-only explorer + non-author verifier; **Sol** (GPT-6 Sol/high) = isolated disjoint backend/worker; **Fable** = earlier Claude core-author label (2026-09-21 loop; last used ~09-22); **Codex** = older name for the parent role (09-21..09-23). **DeepSeek** = the real provider used in CW dogfood runs.

Thread codes used in the section index (part 5): UXQ, DOG, HRM, ATT, CBD, RTM, STR, E1, KIT, RSL, LPI, CDE, PRV, 06B, GUI, PUB, B2G5, FE16, COORD, RES, AGP, DOG0, PAG, SPK, PRES, CHAT, REL, WSK, BE, SKN, POL, MD, HOME, BM, GOV, BASE.

---

## 1. Threads

### 1A. Live / recently active threads (2026-09-19 .. 2026-09-29)

#### UXQ — Claude frontend UX queue (incl. RP polish, N-07, Models, Developer, reader targets)
- **Latest**: 2026-09-29 · *Reader touch targets accepted* (line 3). Status: **accepted** (original Claude b4bfedb/bb550dc). Key sentence: "Narrow Composer and answered-question selection/toggle are next in the original UX queue; no user key, paid provider or service restart."
  Preceding same-day: 2026-09-29 · *Developer Attention and Chat menus independently accepted* (line 7): accepts ebb8946 and Chat 36fdc01 after N07-R1/R2/R3 (16d5b94/1a435fc/81dd965).
- **Owner/packet links**: `execution/claude-frontend-harness-2026-09-16/evidence/reader-targets-20260929/parent-review/README.md`; `.../evidence/ux-batch-review-20260929/README.md`; `.../evidence/ux-models-20260928/parent-review/README.md`; `.../evidence/ux-developer-20260928/parent-review/README.md`; `.../evidence/ux-simplification-20260928/README.md`; `.../evidence/ux-continuity-20260928/README.md`; UX owner `execution/claude-frontend-harness-2026-09-16/ux-polish-release-20260924.md` (current.md links `#2026-09-28--new-surface-continuity-audit-opened` and, for RP-1..8, the bare file). Grammar entries: `design/visual-spatial-grammar.md`, `design/agent-interface-2026-09-10/frontend-contract.md` are named in AGENTS.md, not in these entries.
- **Open obligations (latest text)**:
  - Narrow Composer labels (P1) and answered `ask_user` selection/toggle: "next in the original UX queue" (09-29, line 5). No later entry closes them. `[owner]` UX record line 542 (2026-09-29): "Next in my queue: P1 narrow Composer labels (375/390 confirmed as `A…` / `Local t…`), then the answered ask_user drag-toggle."
  - "Older Composer/question/reader evidence returns to Claude; Back-to-latest stayed about 12px above Composer in two heights" (09-29 line 9). Back-to-latest recorded as "closed, no defect" `[owner]`.
  - Not claimed (09-29 lines 5, 9): direct touch events / physical device / Safari / full accessibility matrices; "Example Chat rows remain unit/source-only in this fixture; Attention Delete, all-UX and physical-touch acceptance are not claimed."
  - Deferred items closed by later entries: "Developer hierarchy and save-flow consolidation remain deferred" (09-28 line 19) → closed by Developer structure (09-28 line 15) and Models save flow (09-28 line 11). "broader simplification is not yet accepted" (09-28 line 23) → superseded by line 19 then 15/11. New-surface audit `remaining native accessibility/theme/error matrices are explicit` (09-28 line 51) — no closure.
  - `[owner]` still-open leads not mentioned in current.md: Back/Forward keyboard shortcuts (product decision, deferred behind N-07), remaining Developer density (scope strip notes, package editor notes).
- **Author/lease**: "Claude retains the remaining registered UX queue under its expanded mandate" (09-28 line 11); Claude "retains full UX decision authority" (09-28 line 15); user expanded mandate 2026-09-28 (UX record: decision + implementation for all UX work, no per-boundary Astra pre-approval; Luna audit is evidence, not a gate). Independent acceptance = Astra ("Parent") + Luna bounded source review; Sonnet supplied bounded source/precedent recall, Sol supplied disposable fake-provider fixtures (09-28 line 51). Original Claude remains serial frontend writer.
- **In-flight branch/worktree named**: none in the latest entries. `[git]` branch `claude/request-details-b2-20260928` contains all UX commits through ffe68fb.
- **Boundaries**: no user key/real inference, no backend/schema/authority change, no paid provider, no service restart, "not whole-product UX acceptance"; UX acceptance packets are "finite synthetic/fake-Host slice" evidence.
- Earlier pieces of the same owner record: 09-24/09-25 RP-1–4, RP-5/6/7/8 (accepted, integrated as squash `aebcb8c`, "not pushed" at the time; later pushed under 4c42ffd - see DOG).

#### DOG — Harness self-check (DF-04 / RD-009) and real CW dogfooding (incl. pre-push review and push)
- **Latest**: 2026-09-28 · *Real CW engineering task accepted; UX simplification queued* (line 27) and *Candidate dependency friction corrected; UX pass active* (line 23, later same day). Status: **accepted**. Key sentence (line 27): "No native Hermes, all-Extensions, unaided discovery, live new-schema or deployment claim."
- **Links**: `execution/claude-frontend-harness-2026-09-16/03-check-recipe.md#2026-09-28--serial-harness-self-check-closure--expanded-claude-lease`; `.../evidence/harness-check-recipe-20260928/parent-review/README.md`; `.../evidence/harness-real-engineering-20260928/README.md`; `.../evidence/candidate-generated-filter-20260928/README.md`; `.../evidence/dogfood-review-20260928/README.md` and `.../publication.json`. Earlier: `.../evidence/lease-queue-dogfood-20260927/README.md`, `.../evidence/runtime-load-recovery-20260927/README.md` (RL-1), `.../evidence/schema-doc-dogfood-20260927/README.md` (DS-1), `.../evidence/production-closure-20260927/README.md` and `walkthrough.md` (G1-G3 results; G4/G5 handoff), `.../evidence/attention-check-recipe-20260927/parent-review/README.md`.
- **Open obligations and closures**:
  - 09-28 line 35: real CW task "still needs actual isolated provider configuration/user key entry and a fixed task" → closed by 09-28 line 27 (fafc626, failing 129/130 then 130/130).
  - 09-28 line 33: "final source update and user provider/key configuration are pending" (phase two) → closed by line 27.
  - 09-28 line 27: candidate aggregate search/diff dependency-tree friction "adopted for the existing owner" → closed by line 23 (Astra 1876791 + Claude 68e2c08/c71fadb; HTTP 200/three files).
  - 09-27 RL-1: "The existing fixed check recipe cannot select this repository's narrow tests, so external targeted verification is explicit" → addressed by third recipe `node-test-harness-contract` (line 31) and Attention recipe (line 87); no entry says RL-1's narrow-test selection is fully closed.
  - Still stated open (no closure found): "historical RuntimeLock case, broader N-02 robustness and G4 residuals" (09-20 line 472); production-closure G4/G5 (fresh-clone GUI configuration, timed public media, public claim mapping) "remain open under existing owners" (09-27 line 120); "Remote CI completion is not claimed" (09-28 line 39); author full-suite claims separate from independent acceptance.
- **Author/lease**: 09-28 line 35: user "expands original Claude's task-local implementation/test/fixture authority and authorizes serial completion of the existing DF-04/RD-009 self-check gap"; Astra owns "independent acceptance/main integration"; Luna read-only preflight/review, "not a second product writer"; Sol for independent source review/HTTP probes (line 43). 09-27: "user assigns small bounded work to actual CW dogfooding and keeps important self-developed mechanisms/decisions with Astra/Claude" (line 113).
- **Boundaries**: recipeId-only Host approval, unchanged approval/settlement; "No full-suite/native/real-provider claim" (line 31); "Global security settings and the earlier native Hermes refusal are unchanged" (line 35); "no user Host restart or global permission-mode change"; no skill installation / copied DSH rules (line 39, 43).
- **Push**: 2026-09-28 · *Reviewed main pushed to origin* (line 39): "normal push of reviewed 4c42ffd to configured origin/main (previous 1296b8d), exact remote SHA match and 0 ahead/0 behind"; receipt `execution/claude-frontend-harness-2026-09-16/evidence/dogfood-review-20260928/publication.json`. Pre-push review (line 43) fixed: SSE/pre-aborted event reads (Astra 830e328), Attention Session/list metadata refresh (Claude 4935712/2487374). Default suite 1808/1808 at that point.

#### HRM — Hermes native runtime / protocol (native exact-dispatch repair)
- **Latest**: 2026-09-28 · *Core research and new-surface governance run in parallel* (line 53) and *External recall consumed…* (line 47); status of native execution: **blocked / permission-refused, preserved**. Quote (line 59): "Hermes server execution remains specifically permission-blocked with preserved source/environment". Quote (line 71): "native Hermes API-server execution remains blocked by the original Claude permission review... reported native-loop 9/9 and dependency provenance remain author evidence, with API-server run/stop unexecuted."
- **Accepted piece**: 2026-09-27 · *Hermes standalone protocol accepted; native loop next* (line 75): final receipt `execution/claude-frontend-harness-2026-09-16/evidence/hermes-protocol-final-20260927/README.md`; standalone `/v1/runs` adapter/transport accepted (acf5694), HPR-R1/R2 closed; "No production executor/Host/Store/schema/UI or native/live-provider capability is enabled."
- **Links**: `evidence/hermes-protocol-review-20260927/README.md` (line 81); `evidence/hermes-protocol-preflight-20260927/external-recall-20260928.md` (line 49); `core-runtime-loop-20260921.md#2026-09-28--external-recall-and-astra-core-ownership` (line 55); `core-runtime-loop-20260921.md#2026-09-27--hermes-protocol-slice-next-claude-serial-core-assignment` (line 97); `research/attention-assistant-20260927/README.md` (line 101). `[owner]` core-runtime-loop also cites `evidence/hermes-tool-profile-conformance-20260927/README.md` (not linked from current.md).
- **Open obligations**: native profile/MCP tool-loop conformance: "Native execution results remain pending" (09-27 line 77) → 09-28 lines 59/67/71 say permission-blocked, unexecuted; **no acceptance entry exists**. "Full Attention tool/Host integration remains a separate consumer requiring native tool lockdown and Run-bound authority, not text-only consultation" (09-27 line 81). "Astra authorized only a disposable frozen-lock/mcp-extra test environment (`cc120c0`)... No global/upstream/Courtwork dependency change is implied" (line 77). Luna's 09-28 primary-source research: "bounded primary-source research is active" (line 55) → outcome recorded as the external-recall disposition (line 49): required-boundary decision only.
- **Author/lease**: Astra owns "critical core implementation after external-reference recall" (user authorization 2026-09-28, line 55); original Claude "retains its Hermes source/evidence through `4402592`" and is released to integration/frontend/UX; earlier serial Claude core-author routing superseded `[owner]`. Luna does recall.
- **Boundaries**: "Original server permission refusal remains; no reroute occurred" (line 49); "exact emitted names must be checked before native repair, and every operation retains Host Run/object authority and receipt/unknown semantics"; "not new Host code, model-callable signal, schema or restored native execution"; Hermes "not accepted as a managed runtime; Pi execution and existing Core/Host authority remain" (line 101). Pre-push review also fixed Hermes transport HPT-C1/HPT-F1 (Astra 830e328, line 43).
- `[git-external memory, not current.md]` user memory index says: "Hermes native MCP loop conformance 224d221 (head ebb735b) awaiting Parent" - not present in current.md; flag for verification.

#### ATT — Attention Assistant / Dogfooding Kit research; fixed Attention contract check
- **Latest**: 2026-09-27 · *Attention Assistant / Dogfooding Kit research registered* (line 99) and *Fixed Attention contract check accepted* (line 87). Status: research **registered**; recipe **accepted**. Quote: "Hermes is selected first for the next Attention-specific integration research, not accepted as a managed runtime; Pi execution and existing Core/Host authority remain."
- **Links**: `research/attention-assistant-20260927/README.md`, `research/attention-assistant-20260927/INDEX.md`; `execution/claude-frontend-harness-2026-09-16/evidence/attention-check-recipe-20260927/parent-review/README.md`; `.../03-check-recipe.md#2026-09-27--fixed-attention-contract-recipe-sol-assignment`.
- **Open**: recipe: "No real-model dogfood or general test-selector claim"; "Dependency preparation remains explicit, with no install/fallback" (line 87). Research: "No product code/schema, provider, scheduler, live connector or user Host change; current assignments and product gates remain." Developer Kit "adopts task-oriented progressive documentation with existing Kit/Profile/immutable Run bindings, not a new plugin system or ledger." Attention Delete not accepted (09-29 line 9).
- **Author**: Sol `75027fc` (recipe, isolated `codex/attention-check-recipe-20260927` from `6e983dc`), Luna review; no live Attention author (Attention feature work in older threads: ATT-BE-01 backend accepted 2026-09-09, global-agent 2026-09-10).

#### CBD — Code-block density CB-D1
- **Latest**: 2026-09-27 · *CB-D1 accepted and integrated; Hermes slot released* (line 83): "accepts Claude `b57dad0` / correction `f660251`, fast-forwarding main from `7f4b05e`. CB-R1 closes." Status: **accepted/closed**. Link: `execution/claude-frontend-harness-2026-09-16/evidence/code-block-density-20260927/parent-final/README.md`; intake `06b-dogfood-friction-20260920.md#2026-09-27--cb-d1-code-block-density-intake--queued-not-dispatched`.
- Residuals: "Native accessibility/system clipboard limits remain"; side-column width trade-off adopted.

#### RTM — Runtime Settings / runtime inventory (I1) / 06c runtime management
- **Latest**: 2026-09-27 · *Runtime Settings production reader accepted and integrated* (line 103): `evidence/runtime-settings-i1-final-20260927/README.md`, original Claude `6acad62` / head `d37320c` fast-forwarding main from `7b29ee7`; RFS-R1/R2 closed. Status **accepted**. Quote: "No runtime connection/management mutations or live-check claim; every row still not_checked."
- **Links**: `execution/claude-frontend-harness-2026-09-16/06c-runtime-management-20260921.md#2026-09-26--production-continuation-i1-truthful-host-inventory`; `.../evidence/runtime-inventory-i1-final-20260927/README.md` (Sol backend I1 accepted, product 766a4fb); `.../evidence/runtime-management-final-20260921/README.md` (synthetic 06c accepted 09-21).
- **Open**: "live Runtime management remains deferred" (09-26 line 181); "production runtime-management API and native credentials remain unimplemented" (09-21 line 389); user Host 8787 was restarted idle on 2026-09-27 and reports "Pi configured, managed not_configured, every liveStatus not_checked".
- **Author**: original Claude/Opus (frontend, branch `claude/runtime-settings-i1-20260927`, done); Sol backend (done). No active writer.

#### STR — Order 3 live assistant text streaming
- **Latest**: 2026-09-26 · *Order 3 frontend accepted and integrated* (line 147): `evidence/stream-frontend-final-20260926/README.md` accepts 4d0bd98/10bc6f3 over product 88e3e7e; backend accepted 10f27aa/76dee98 (line 157, `evidence/stream-backend-final-20260926/README.md`). Status **accepted (finite synthetic-Host/browser slice)**. Quote: "Poll cadence, first/terminal row rebuilds, G1 super-linear mitigation and native/accessibility/provider limits remain. Host22/Core4/bridge5 unchanged."
- **Links**: `execution/claude-frontend-harness-2026-09-16/live-assistant-text-streaming-20260916.md` (+ `#2026-09-25--order-3--current-path-audit-and-minimal-contract-for-parent-decision`, `#2026-09-26--frontend-high-throughput-and-motion-intake`).
- **Open**: measured TPS/unified motion grammar "reproduction, recipe selection and acceptance remain pending" (09-26 line 181) - partly answered by "restored 1.8s activity recipe" (line 147) but never stated as closed; SSE "stays a candidate" (09-25 line 186). Stale "awaiting decisions" entry (line 184) is explicitly superseded in line 181.
- **Author**: original Claude (backend correction rounds STR-R1/R2, then frontend STR-FE1); no active writer after 09-26.

#### E1 — Agent selection (E1, E1-B, E1-H, 06e Role-first Composer)
- **Latest**: 2026-09-25 · *E1-H Home-first Agent choice, accepted and integrated* (line 188) (`0ac0b4c`, fast-forwarded to local main, "not pushed" then), *E1-B bound-Run reading* (line 192). Status **accepted**. Link `execution/claude-frontend-harness-2026-09-16/06e-role-composer-selection-20260922.md#e1-h-author-delivery` and `#e1-b--bound-run-reading-in-the-chooser--2026-09-25`; E1 final `evidence/e1-final-20260923/README.md`.
- **Open**: E1 accepted (09-23 line 264): "Home-first choice, chooser bound-run reading, profile/Kit editing and native accessibility remain open" → Home-first (09-25), bound-run (09-25), profile/Kit editing (K5, 09-24) closed; native accessibility not closed.
- **Author**: original Claude (E1 UI), Codex/Sol K3 backend; both boundaries "expanded" 09-22.
- Cross-doc staleness `[owner]`: UX record table (2026-09-28) says E1-H "D1/D2... still unresolved" although current.md 09-25 (line 188) says accepted under D1(a)/D2(stop).

#### KIT — Kit K0-K5 (context contract, planner, Run binding, profile preview/editor)
- **Latest**: 2026-09-24 · *K5 selected-profile editor accepted and integrated* (line 208): `evidence/kit-profile-editor-final-20260924/README.md` accepts 136f1d6/1228161 at main 928ba61; R1/R2/F1 close. Status **accepted**. Quote: "No live managed/structured Kit-authoring or deployment claim. No active product writer or new lane follows; manual Claude coordination remains available."
- **Links**: `kit-profile-editor-20260923.md`, `kit-profile-preview-20260923.md`, `kit-run-binding-20260922.md`, `evidence/kit-final-20260922/README.md`, `evidence/kit-run-final-20260923/README.md`, `evidence/kit-profile-preview-final-20260923/README.md` (all under `execution/claude-frontend-harness-2026-09-16/`).
- **Open**: K3: "persisted G1 draft not claimed" ("Page-local draft intent does not implement Host-persisted/reload-restored G1 draft semantics", 09-22 line 288) - no later closure. K1/K2 "production Kit selection/profile→Run binding still open" (09-22 line 314) → K3 (09-23) closed it.
- **Author**: Sol/fresh Astra (K3 backend), Sol (K4), original Claude (K5 editor). Nothing active.

#### RSL — Runtime selection R0/R1 (schema 22)
- **Latest**: 2026-09-23 · *Runtime R1 accepted; schema22 backend integrated* (line 228): `evidence/runtime-selection-r1-final-20260923/README.md`, 3454559/5bb2dc8 at main e86a5a1. Status **accepted**. Quote: "Host schema22/Core4/bridge5 is now accepted. Product startup remains Pi-only; no live managed availability or new frontend selector is claimed."
- **Links**: `runtime-selection-contract-20260923.md`, `runtime-selection-r1-20260923.md`, R0 final `evidence/runtime-selection-r0-final-20260923/README.md`.
- **Open**: frontend selector, live managed runtime availability: not scheduled anywhere after 09-23 (09-26 "live Runtime management remains deferred").
- **Author**: GPT-6 Sol `/root/sol6_runtime_binding` (released), Luna reviewer.

#### LPI — Local Pi worker loop (L0-L3, LP-R5, LP-R6)
- **Latest**: 2026-09-23 · *LP-R6 accepted: readable findings with unknown fences retained* (line 248): `evidence/local-pi-recovery-final-20260923/README.md`, afa6b17/a0a1c46 at db04448. Status **accepted**. Quote: "Current result is readable once, assignment remains blocked, Host/attempt unknown and retry/admission/deletion fences remain."
- **Links**: `local-pi-worker-loop-20260922.md#lp-r6--recover-already-retained-findings-2026-09-23`; `evidence/local-pi-final-20260922/README.md` (LP-R5); `evidence/local-pi-recovery-index-20260923/README.md`.
- **Open**: "exact-root recovery and extension lifecycle/hooks" listed as architecture-first (09-23 line 256, `evidence/harness-gap-map-20260923/README.md`) with no later entry; accepted path is "an explicitly injected offline/no-tool subprocess path, not real provider selection or user-operable recovery" (09-22 line 330).
- **Author**: Sol / fresh Astra task `01a0c77b-b19c-7e33-9f82-4721b0a09ed7`; ended.

#### CDE — Core C/D/E, P03-B Pi Runtime Port, P03-C Agents transport / Host consumer, Agents API adapter (P03/DRT-03)
- **Latest**: 2026-09-22 · *Core C/D/E accepted; fresh Astra Pi loop started* (line 344): `evidence/core-cde-final-20260922/README.md`, e49232e at main ca859a5, "Final RuntimeStore19 is adopted, Core4/bridge5 unchanged; ... no remote runtime selection/live API capability claim." Status **accepted (injectable offline parity)**.
- **Links**: `core-runtime-loop-20260921.md`, `p03c-host-consumer-contract-20260921.md`, `p03c-agents-transport-20260921.md`, `p03b-pi-runtime-port-20260921.md`; transport final `evidence/p03c-transport-acceptance-20260921/README.md`; P03-B `evidence/p03b-pi-runtime-port-review-20260921/README.md`; adapter protocol `research/agents-api-first-2026-09-14/adapter-protocol-20260915.md` (09-15, 09-19).
- **Open**: "Host selection, durable remote binding/receipts and live Agents access remain unimplemented by this slice" (transport, 09-21 line 417) → Host consumer implemented inside C/D/E? current.md never says "live Agents API" done; "real API probes need user-authorized credentials and bounded budget" (09-15 line 648); adapter "A-2…A-4" and "three items deferred to slices B/D" (09-19 lines 576/580) - no closure entry (?).
- **Author**: Fable/Claude (P03-C, C/D/E, e49232e), fresh Astra (Pi loop), authority later moved to Astra ("Astra critical core", 09-28).

#### PRV — 06d tabbed Preview / reader
- **Latest**: 2026-09-29 reader coarse targets (UXQ) + 2026-09-22 · *Preview integrated; Core C/D/E has one recovery return* (line 354): `evidence/tabbed-preview-final-20260922/README.md`, 31c09e5/PV-R1 4698d8b at main 6c0bd32. Status **accepted**. Link `06d-surface-continuity-20260921.md`.
- **Open**: "density/coarse/native follow-ups remain separate" (09-22 line 356) - coarse closed 09-29; "native Back/Forward" separate owner (line 372) - no closure; 09-28 line 51 accepts "active Preview tab revealed inside its own strip" (0695b90/e318c7a).

#### 06B — Composer working location, coding-start friction, prepare/approval, answer footer
- **Latest**: 2026-09-21 · *Composer working-location and CE-R1 accepted* (line 410): `evidence/composer-ce-r1-final-20260921/README.md`, 4695426 at main d52f44f. Status **accepted**. Quote: "CE-F2 initial focus/scroll and native accessibility remain deferred; lost post-create bind/read-back replies are explicitly unexecuted, not accepted as complete recovery." No later closure (orphan-ish).
- Other: 09-21 answer footer accepted (line 440); prepare/approval accepted (line 452, main a3503fb); 09-20 coding-start friction accepted (line 464). Residuals: "G4/material-upload and ordinary-tool-argument residuals stay with existing owners" (line 452); "ordinary tool argument capture awaits the existing Runtime/Host contract" (09-20 line 464). The request-detail backend need ("Request-detail backend work awaits its narrow existing-owner contract", 09-21 line 446) → B2 (below).

#### B2G5 — B2 request summaries and G5 fact mapping (2026-09-28)
- **Latest**: 2026-09-28 · *Registered B2/G5 batch complete* (line 57): "This completes the finite G5 mapping/support/identity batch alongside accepted B2; Claude and Sol writers are released." B2 accepted (line 61): `evidence/request-details-b2-20260928/parent-review/README.md`, original Claude d1e9919/9b0fb91. G5: `execution/2026-09-08-main-round/public-readiness.md#astra-disposition-and-independent-receipt--2026-09-28`, `execution/2026-09-08-main-round/g5-fact-map-20260928.md` (Sol 52bcb5d/6ca2c96; Claude C13/C14 33db5d8/4f1768c). Status **accepted / closed**.
- **Open (carried to PUB)**: "fresh user configuration, timed media and whole-release acceptance remain open"; "Public README/Pages/media remain with original Claude after B2, and G1/G4/G5 are not declared closed" (line 67); "B2 writer released; existing Hermes server refusal and G1/G4/final publication work remain open" (line 63).
- **Author**: released; contract `06b-dogfood-friction-20260920.md#2026-09-28--b2-bounded-repo_list-request-summary--implementation-contract`; Sol branch `codex/registered-completion-20260928` (contract `a9694d0`).

#### GUI — GUI grammar convergence G1-G4 / Orchestra / visual-spatial grammar
- **Latest**: 2026-09-22 · *Grammar audit consumed; Runtime-only M1 lease granted* (line 361) and *Kit K1/K2... / Clean checkpoint* (M1 "independently accepted/integrated", line 306-308: `evidence/m1-final-20260922/README.md`). GUI merge 2026-09-20 (`a8aa323`, line 502). Status **accepted (local integration)**; G4/full-matrix acceptance **explicitly withheld**: "Astra explicitly defers the disclosed full-matrix visual residuals from local integration, preserving G4/UI ownership and withholding full G4/accessibility acceptance" (09-20 line 510).
- **Links**: `design/visual-spatial-grammar.md`; `design/grammar-convergence-20260921/README.md`, `.../disposition-20260922.md`, `.../astra-loop.md`; `execution/claude-frontend-harness-2026-09-16/gui-grammar-convergence-20260919.md`; `orchestra-start-node-20260919.md`.
- **Open**: G4 evidence/visual residuals; "N-13's unexplained historical count difference" (09-20 line 504); "fine-pointer narrow target differences require scoped owner mapping" → reader targets 09-29.
- **Author**: original Claude (G1-G3 serial, Sonnet slices), Astra acceptance, Luna verification; M1 Sol lease (done).

#### PUB — Public readiness G1-G5, README/Pages/media, releases
- **Latest**: 2026-09-28 (B2G5 above) and 2026-09-28 · *Reviewed main pushed to origin* (line 39). Status **open (G1/G4 open, G5 mapping accepted 09-28)**.
- **Links**: `execution/2026-09-08-main-round/public-readiness.md`; `release/product-node-2026-09-15/deployment.md`; `release/final-preparation-2026-09-13/publication.json`; `../evidence/publication-release-20260914/README.md`.
- **Facts**: "Screenshot/install pins remain fd96f96" (09-28 line 59); Pages last recorded deploy: 09-15 (run 34946272671 deploys public source fe7f317, line 654); 09-22: "Remote Pages build exposed a previously omitted source update ... corrective follow-up to push, not a deployment" (line 304); "no further Pages work or deployment is scheduled" (09-22 line 298). Remote CI: "Initial Runtime CI completed successfully for 678d71c; the separate Pages failure and local correction remain explicitly recorded" (line 304); 09-28 push: "Remote CI completion is not claimed; no manual deployment" (line 39).
- **Boundary** (AGENTS.md, not current.md): main takeover 2026-09-08 "does not authorize deployment"; current.md repeats "no deployment" in nearly every entry. README EN/zh-CN parity (2026-09-16 line 636).

#### COORD — Routing, coordination loop, checkpoints, inventories
- **Latest**: 2026-09-28 lines 53/69: Astra critical core; original Claude core/frontend "one Claude lane in a separate checkout"; Sol disjoint work; Luna/Sonnet exploration. 09-27 lines 95/113: serial ownership; small bounded tasks to actual CW dogfooding.
- **Open**: coordination heartbeat `courtwork-claude` "updated in place, active hourly" (09-23 line 272); paused again (09-23 line 220 "paused at the no-dispatchable-successor boundary", 09-23 line 216 "stays paused"); **no later entry states its status** (orphan).
- **Standing**: "Continue original backend disposition → Claude frontend consumption → independent combined acceptance, serially" (09-26 line 181); "No new generic Harness/Core project or parallel product writer is created" (line 179); worker routing 2026-09-20 (`research/RD-005-multi-agent-selection.md#2026-09-20--current-execution-routing`): Luna exploration/non-author verification, DeepSeek may implement bounded work where engineering execution is the bottleneck, OpenAI provider for computer use, Astra architecture/integration.

#### RES — Architecture / research intakes (still steering)
Latest relevant: 09-27 Magpie (`research/architecture-node-2026-09-13/magpie-consumption-20260927.md`, line 134), 09-21 control-plane references (`research/architecture-node-2026-09-13/control-plane-precedents-20260921.md`), 09-20 Pi naming (line 526), Multica (line 530: `research/architecture-node-2026-09-13/multica-consumption-20260920.md`), local CLI/Runtime Settings ruling (line 542: `research/architecture-node-2026-09-13/local-agent-runtimes-20260920.md`), Hermes/Praxis (line 546), Orchestra/Kits/Praxis direction (line 560: `research/architecture-node-2026-09-13/orchestra-direction-20260919.md`, `praxis-kit-20260919.md`). Status: **registered references / rulings; no product acceptance**. Standing rulings: Pi is "the single public/development name for this runtime family"; keys "use a protected local JSON file, not an OS keychain; native Pi/Hermes authentication remains separately owned" (09-20 line 500); Runtime Settings target: "Settings → Agents contains Agent profiles and Runtimes; Models retains provider configuration, and Developer retains diagnostics".

#### AGP — 06a Agent profiles frontend (synthetic journey)
- Latest 2026-09-20 · *Agent profiles 06a accepted and integrated* (line 468): `evidence/agents-profile-round2-20260920/README.md`, `aca21c8`, main b98e8ae. "The journey remains an explicit synthetic preview; no production Settings/backend capability is implied." Superseded in practice by K4/K5 (real profile preview/editor).

#### DOG0 — Order 11 coding-dogfood readiness and first real coding runs (2026-09-20/21)
- Latest 2026-09-21 · *Prepared real coding dogfood completed* (line 448) / 09-20 *Basic real coding dogfood accepted* (line 472), *Dogfood readiness independently accepted* (line 476). Links: `execution/claude-frontend-harness-2026-09-16/11-coding-dogfood-handoff-20260920.md`, `.../evidence/real-dogfood-20260920/completion.md`, `.../evidence/prepared-real-dogfood-20260921/README.md`, `.../evidence/coding-dogfood-final-20260920/README.md`. Superseded by DOG (09-27/28). Residuals: "historical RuntimeLock case, broader N-02 robustness and G4 residuals are not claimed closed."

#### FE16 — Claude construction slices 00-09/P + Agents API slice A + main node (2026-09-16 .. 09-19)
- Latest: 2026-09-19 · *Main node: Claude frontend/Harness candidate accepted and merged* (line 584): `execution/claude-frontend-harness-2026-09-16/node-acceptance-20260919.md`; merged fa03143 (slices 00-09 and P; Host RuntimeStore schema 18), `npm test` 1196/1196; "With the user's later authorization, `187b27c` was pushed and the worktrees were cleaned up ... 31 trees were removed, 59 stale entries pruned". Status **accepted/merged**.
- **Open at that node (N-list)**: N-01 (fixed 22b4bf6), N-04 (fixed), N-06 (fixed), N-11 Pages README generator (line 584 "Pages build fails ... because README and site/src/readme.mjs diverge" → later corrected 09-22 line 304 and 09-19 line 566 "source integration still pending"), N-12/14/15 disposed (line 580), N-08 (Agents API tree) accepted 09-19 slice A. **Still listed open with no closure entry**: N-02 (real coding loop; partly later DOG0/DOG), N-03, N-05, N-07, N-09 (?), N-13 (historical count difference, 09-20 line 504). Slice 10 (观测与阅读面收敛) "未开始" (09-16 line 594) - no entry ever reports it delivered (?).
- Slice-level open items (2026-09-16 entries lines 592-634): 06 Rollback not implemented / "完整 BE-7 不关闭"; 07 no cancel-compaction control, `/model <id>`, `/skill:name` not done; 08 chart/flow/composition not done; P photo upload/real account not done; 03 recipe entry in Settings/Runtime not done.

---

### 1B. Historical threads (2026-09-08 .. 09-15), compact
(Status = last recorded state; most are "accepted/merged, superseded by later schema/product state". Do not treat as active.)

- **PAG — Pages / Paper / SE / brand (les Privilege)**, 09-10..09-15. Latest: 09-15 *产品节点发布与下一轮基线* (line 652): `release/product-node-2026-09-15/deployment.md`, public source fe7f317 pushed, Pages run 34946272671 success. Paper: CW adoption pinned SE **9.6** (`../PAPER.md` `d78fd312955c1f594e59cbdcbb0d3074ac355940`); SE 9.8 published independently and "Courtwork的工程采用仍固定9.6，未自动迁移Paper pin" (09-14 line 748). Brand: `../brand/les-privilege/README.md`.
- **SPK — Spark independent Agent + Workspace Substrate**: 09-13 *Spark独立Agent与Workspace Substrate交付* (line 750): `../evidence/spark-agent-20260913/README.md`, RuntimeStore schema 15, merged local main 83df385; design `research/spark-explore-2026-09-13/design.md`. Supersedes "待施工" (line 788). Open: Spark reconstruction/recovery, BE-41 residuals (09-11), SparkBench not implemented.
- **PRES — Agent Presence design (robot/mouth/thinking)**: 09-12 final accepted (line 968-980); production wiring not done ("生产App未接线, thinking_delta今日仅计时未投影").
- **CHAT — Chat / Attention / Memory Broker / Chat-space research**: 09-11..09-15, mostly research registration. Implemented: BE-23/DWB-05 projectless Chat + Recent, schema 14 (line 792). Others "登记待实现".
- **REL — Release readiness + UI polish wave 09-12..09-14** (Settings M1, IA convergence, Context/TPS, Work review card, Attention UI02, model/effort production wiring, data surfaces, Release clean install, release-input/MCP failures): final release prep `release/final-preparation-2026-09-13/README.md`, product source `fd96f96bc40725e301a4c92e0f2f50fd3245458c`, 26 screenshots, pushed + Pages success (line 744-746, `release/final-preparation-2026-09-13/publication.json`). "不关闭真实工作G1–G5、原生200%或完整辅助技术门."
- **WSK — Work-surface-kit FE queue (WK/FE-01..05/CC-S/CC-W/CC-D0)** 2026-09-08..09-10: FE-01..04, CC-S, CC-W, CC-D0-a accepted (lines 1237-1295, 1423); "FE-05a → FE-05 → ATT-FE-01 → CC-I" reordering (line 1427); ICON/FE-05a/FE-05 specimen/ATT-FE-01/Spark accepted at d0118ab (line 1175).
- **BE — Backend Core threads 09-09..09-10** (ES-01 file memo, ATT-BE-01 Attention, AM-B async tasks, BE-5 source resolve, MR-A1a, BG-01 governance, Multi-agent thread MA): accepted; schema progression in text: Core3/app4 → Core4/app5 (BG-01, line 1529); RuntimeStore 4→5→6→7→8→10→11→12 (all superseded by 22).
- **SKN — Skin/Review/RV26/PV-SD**: SK-1..4, RV26-Q01/Q02, PV/SD integration (lines 1161-1221): accepted; RuntimeStore 11/12 then.
- **POL — Semantic polish / Summary-Entry / BE-41 / Chat icon Fake UI (09-11)**: WO-VS-01 (f99af46), convergence 035134b, merge node; "Chat actions明确不在本次交付". 
- **MD — Markdown reader / Output Review** (09-10): MR-A1/T1 accepted; MR-A2/A3 annotations not implemented.
- **HOME — Home composition / Attention global agent** (09-10): accepted; Runtime 6 then.
- **BM — Benchmark series** (09-10): BM-01 spec + BM-02..05 PR docs only.
- **GOV — Repository governance** (09-14): pre-code governance in AGENTS/architecture/verification; independent GitHub review consumed (IR-01..05).
- **DOG0 (older half)**: 09-12..09-14 harness dogfooding rounds (live DeepSeek five Runs, long task counterexamples); superseded by 09-20+ DOG.
- **BASE — 2026-09-08 baseline tables** (lines 1335-1361): evidence table + "仍未闭合" open list (stale; see part 4).

---

## 2. Current baseline facts stated in current.md

**Schema / identity (latest statements)**
- Host RuntimeStore **22**, Core user **4**, bridge app **5**: "Host22/Core4/bridge5 unchanged" (2026-09-26 lines 149/159/179; 2026-09-24 line 208 "schema22/Core4/bridge5"; adopted 2026-09-23 line 228 "Host schema22/Core4/bridge5 is now accepted"). Consistent with AGENTS.md. DS-1 (2026-09-27 line 115) fixed the Work Core contract's stale "Host schema13/upgrade 3-12" to "22/3-21".
- Schema history statements inside current.md (all superseded): RuntimeStore 4 (09-09), 5, 6, 7, 8 (09-10), 10, 11, 12 (09-10/11), 14 (09-13 projectless Chat), 15 (09-13 Spark), 18 (09-16/09-19), 19 (09-22 C/D/E), 20 (Local Pi L3 / K1-K2), 21 (K3), 22 (R1 09-23). Core: 3/app4 → Core4/app5 at BG-01 (09-10). "Host15/Core4/bridge5" (09-15) etc.
- Backup/migration doctrine (repeated): strict validate → exclusive original-byte backup → staged upgrade; old host refuses new store; recovery uses an independent directory with the old host; "Upgraded data must not be shared with an old host" (AGENTS.md).

**Main / origin**
- Last pushed SHA recorded in current.md: **`4c42ffd`** pushed to origin/main on 2026-09-28 (previous `1296b8d`, "exact remote SHA match and 0 ahead/0 behind", receipt `execution/claude-frontend-harness-2026-09-16/evidence/dogfood-review-20260928/publication.json`). The 09-28 line 19 also says "Prior candidate dependency filtering is already pushed `12980f0`" — no dedicated push entry for 12980f0 exists.
- Earlier pushes recorded: `187b27c` (09-19), `678d71c` (09-22, "Initial Runtime CI completed successfully"), pushed `695820a` / `abcd30e` / `1ae7d94` / `18e3af5` used as dispatch bases (09-23), `fe7f317` public source (09-15).
- `[git]` observation (not in current.md): local remote-tracking `origin/main` == HEAD == `ffe68fb` (reflog: last 5 updates "update by push"; 55 commits after 4c42ffd). So pushes at 4c42ffd..ffe68fb (incl. Models/Developer/Reader acceptance commits d44e0fc, 7701eb6, 13ad62b) are **not recorded in current.md**.
- User Host **8787** (preview 8899): last recorded idle restart 2026-09-27 for the Runtime Settings reader (line 105/117); 09-28 entries repeatedly say "no user Host restart"; earlier restarts for static module allowlist (09-21/09-22). Owned Host used for candidate-diff browser check (line 25).
- Frozen legacy: "Courtwork-legacy-frozen/.git currently owns the shared Git database" (09-19 line 554); "frozen shared Git dependency" retained through 09-22 receipts. `[git]` state not re-verified here.

**Supported-capability / claim statements (latest)**
- "Product startup remains Pi-only; no live managed availability or new frontend selector is claimed" (R1, 09-23).
- Current supported-use documentation "describes existing GUI repository preparation, approved fixed checks and typed commands/manual compaction accurately" (G5, 09-28 line 67).
- Runtime inventory: "Pi configured, managed not_configured, every liveStatus not_checked" (09-27 line 117).
- Fixed check recipes: node-test (03), node-test-attention-contract v1 (09-27), node-test-harness-contract (third, 09-28); all recipeId-only through Host approval and private candidate execution.
- Local Pi: injected offline/no-tool subprocess only (09-22). Hermes: standalone `/v1/runs` adapter/transport accepted; no production executor/native capability. Agents API: offline adapter/protocol only; "self-hosted整lane本轮unsupported" (09-15).
- Kit: planner reference-only; profile preview/editor via existing CAS; no managed/structured Kit authoring. Streaming: finite synthetic slice. Keys: protected local JSON, not OS keychain.
- Media/install pins remain `fd96f96` (09-28 line 59); Paper adoption pinned SE 9.6.
- Test counts are scoped, never summed: e.g. default suite 1808/1808 at 4c42ffd (line 45), author 1801/1801 (B2), 1677/1677 (E1-H).

**User authorizations still in force (as stated, with date)**
- 2026-09-28: original Claude task-local implementation/test/fixture authority for serial DF-04/RD-009 self-check closure (line 35).
- 2026-09-28: Astra critical core implementation after external-reference recall; original Claude free for separate integration/frontend/UX (line 55).
- 2026-09-28: original Claude expanded UX ownership: decision and implementation authority for all UX work; consolidated per-subpage text/control simplification requested (line 27) `[owner]` UX record `## User-expanded UX ownership · 2026-09-28`.
- 2026-09-28: user prioritizes other registered work while native Hermes stays blocked (line 71).
- 2026-09-28: "User explicitly authorizes this merge/push" (line 45) — consumed by the 4c42ffd push (per-action).
- 2026-09-27: Astra adjudication/dispatch; Claude core self-development + frontend integration serially; independent Sol/CW dogfood tasks; Luna references (line 95). 2026-09-27: real development authorized after coding dogfood (line 132).
- 2026-09-26: next slice + independent backend Sol (line 142). 2026-09-22: parallel frontend/backend lanes (line 294); push authorized (line 306, consumed). 2026-09-20: Claude frontend-first construction (line 488); worker routing (line 534). 2026-09-19: local merge/cleanup after fresh node (line 554, consumed).
- AGENTS.md (not current.md): main takeover authorized 2026-09-08; does not authorize deployment/product acceptance.
- **Global "no" list repeated in nearly every entry**: no paid provider / real-provider run by default, no user key reading or entry, no user Host restart, no schema/authority change unless stated, no push/deployment unless authorized, no user data migration.

---

## 3. Next queue (per the most recent entries, in order)

1. **Original Claude (UX owner)**: narrow Composer labels (P1, 375/390 `A…`/`Local t…`) — line 5, `[owner]` line 542.
2. **Original Claude (UX owner)**: answered `ask_user` selection/toggle — line 5.
3. **Original Claude**: "remaining registered UX queue under its expanded mandate" (line 11): `[owner]` Back/Forward shortcuts (deferred; product decision), remaining Developer density notes, native accessibility/theme/error matrices.
4. **Astra**: critical core implementation "after external-reference recall" (line 55) — Hermes exact-dispatch/native repair stays blocked by the permission refusal; "broader backend/runtime integration still follows concrete owner contracts" (line 51). No specific next core order is named after 09-28.
5. **Public readiness**: "fresh user configuration, timed media and whole-release acceptance remain open" (line 59); "Public README/Pages/media remain with original Claude after B2" (line 67); G1/G4/final publication work (line 63).
6. **Dogfooding**: more real CW tasks under the expanded lease (line 35/27); Attention-specific Hermes integration research (line 101, blocked behind Hermes).
7. Deferred: live Runtime management / runtime selector frontend (09-26 line 181; 09-23 line 230); Kit managed authoring (line 208).

---

## 4. Contradictions / staleness / orphaned obligations

(Date = the entry that makes the claim; "no closure" = nothing later in current.md addresses it.)

**Orphaned obligations (stated pending, never closed in current.md)**
1. Coordination heartbeat `courtwork-claude`: enabled hourly 2026-09-23 (line 272), then "paused" 2026-09-23/24 (lines 216, 220), no later status.
2. Hermes native profile/MCP tool-loop conformance: dispatched 09-27 (line 77), "Native execution results remain pending", then "permission-blocked... unexecuted" (09-28 lines 59, 67, 71); no acceptance or formal deferral entry; author evidence 9/9 through `4402592` unadopted. User memory index mentions `224d221`/`ebb735b` awaiting Parent (not in current.md).
3. Local Pi: exact-root recovery, extension lifecycle/hooks (09-23 line 256); "user-operable recovery" and real provider selection (09-22 line 330).
4. Composer CE-F2 initial focus/scroll; lost post-create bind/read-back replies "explicitly unexecuted" (09-21 line 414).
5. "ordinary tool argument capture awaits the existing Runtime/Host contract" (09-20 line 464); G4/material-upload residuals (09-21 line 454).
6. Kit K3 "Host-persisted/reload-restored G1 draft semantics" not implemented (09-22 line 288).
7. Streaming: poll cadence, first/terminal row rebuilds, G1 super-linear mitigation, measured TPS/unified motion grammar (09-26 lines 149, 181).
8. Agents API: live probes (need credentials/budget, 09-15 line 648); adapter slices A-2..A-4 / B/D deferred items (09-19 lines 576, 580); "Host selection, durable remote binding/receipts and live Agents access remain unimplemented" (transport, 09-21 line 417) vs C/D/E "remote runtime selection/live API capability" not claimed (09-22 line 346) - no entry says live Agents API is done or dropped.
9. N-list from the 09-19 merge node: N-02, N-03, N-05, N-07, N-09 (?), N-13 (09-20 line 504: "unexplained historical count difference"). Slice 10 (观测与阅读面收敛) "未开始" (09-16 line 594).
10. Runtime selector frontend and live managed runtime (R1, 09-23 line 230).
11. Personal credentials/hooks UI, native config migration, enterprise gateway, browser dogfood (09-20 line 500: "No key/hook UI ... was performed") - no later entry.
12. 09-19 line 568 G1 re-ruling "no product code, baseline or visual acceptance claimed" - G1 Home zoning PR `home-layout-zoning-pr-20260919.md` registered (line 572), no delivery entry.
13. Full-suite/CI: "Remote CI completion is not claimed" (09-28 line 39) - later pushes not recorded.
14. Sept-10/11 open items never revisited in current.md: BE-42 (context/TPS) "registered / pending owner contract"; BE-40 Attention default ordering, grant/proposal; Q1/Q3, Spark rebuild/recovery (line 1114); FE-05 production material A-E "not implemented" (line 1181); Paper pin migration to 9.8.

**Contradictions / stale statements**
- Push record: line 39 says pushed `4c42ffd`; line 19 (same date, later) says `12980f0` "already pushed"; `[git]` origin/main is `ffe68fb` and current.md records none of the later pushes. Also E1-H/RP entries say "not pushed" (09-24/09-25) before the 09-28 push.
- Line 298 (09-22) "no further Pages work or deployment is scheduled" vs 09-28 public-readiness work keeping Pages/README/media open (lines 59, 67).
- Line 1351 ("G1真实provider仍not_run", 09-08 baseline) vs 09-12/13 real DeepSeek runs (lines 908, 802) and 09-27 production-closure G1/G2/G3 results (line 122). Also 1239 "G1–G5完工条件尚未满足" and 1247 "真实运行纵切仍待".
- Schema numbers: lines 1247/1385/1413 "Core3/app4", "RuntimeStore4" etc. (09-09) vs Core4/app5 (09-10) vs current 22/4/5; each is dated but the file does not mark them superseded (only some have "此段覆盖..." notes).
- Line 1215 stray header paragraph ("更新：2026-09-10。唯一开发入口为 Courtwork ... 读取main基线 fa90763...") sits inside the Skin/RV26 block.
- Line 1550 BE-41 "待组合接收" (09-10) vs line 1110/1112 BE41-A/B accepted (09-11).
- Line 184 (09-25, "awaiting decisions") explicitly superseded by line 181 (09-26); line 588 streaming PR "施工顺序尚未指定" superseded by Order 3.
- Line 322 (09-22) K0 "K1/K2 are not yet implementation acceptance" superseded by line 312 (same day).
- Line 216/212 K5 "returns issued"/"R2 open" vs line 208 K5 accepted — correct chronologically, but a reader scanning the file top-down sees "accepted" before "open".
- Line 1160/1181-type historic statements "本节点接收本地main，不包含推送或部署" vs later Pages deployments.
- `[owner]` UX record (2026-09-28) lists E1-H as unresolved D1/D2 although current.md 09-25 line 188 records E1-H accepted.
- Role naming drifts: "Codex" (09-21..09-23) / "Fable" core author (09-21/22) / "Astra" (09-22+), while AGENTS.md says Astra owns architecture; 09-28 line 55 supersedes exclusive Claude core-author routing.
- Line 1237-1295 table is a 09-08 "本轮" status; several rows ("真实模型: 真实provider未跑", "Pages... 用户 PS-27 授权本轮发布") are stale.
- Line 117 (09-27) "current CLI auth reports loggedIn false and original author idle" vs later 09-27 dispatch "UI confirms Running/Waiting" (resolved by manual relay/UI submission; not a real conflict).
- Line 1140 Google Workspace CLI candidates EX-GWS-01..03 "未派工研究候选" - never revisited (?).

---

## 5. Section index (all 308 headings; line = line number of the `## ` heading in current.md)

Thread codes: see legend at the top.

| line | date | gist | thread |
|---|---|---|---|
| 3 | 2026-09-29 | Reader coarse touch targets accepted | UXQ |
| 7 | 2026-09-29 | Developer Attention, Chat menus accepted | UXQ |
| 11 | 2026-09-28 | Models save flow accepted | UXQ |
| 15 | 2026-09-28 | Developer structure accepted after correction | UXQ |
| 19 | 2026-09-28 | First Models/Runtime simplification accepted | UXQ |
| 23 | 2026-09-28 | Candidate dependency friction fixed | DOG |
| 27 | 2026-09-28 | Real CW engineering task accepted | DOG |
| 31 | 2026-09-28 | Harness check recipe accepted | DOG |
| 35 | 2026-09-28 | Serial dogfooding construction authorized | DOG |
| 39 | 2026-09-28 | Reviewed main 4c42ffd pushed | DOG |
| 43 | 2026-09-28 | Pre-push review fixes three regressions | DOG |
| 47 | 2026-09-28 | External recall; Hermes boundary; UX corrections | HRM |
| 53 | 2026-09-28 | Astra core ownership; UX audit | HRM |
| 57 | 2026-09-28 | B2/G5 batch complete | B2G5 |
| 61 | 2026-09-28 | B2 request summaries accepted | B2G5 |
| 65 | 2026-09-28 | G5 fact map accepted | B2G5 |
| 69 | 2026-09-28 | Resumed lanes; Hermes blocked; B2 started | HRM |
| 75 | 2026-09-27 | Hermes protocol accepted; native loop next | HRM |
| 79 | 2026-09-27 | Hermes protocol held; two returns | HRM |
| 83 | 2026-09-27 | CB-D1 accepted; Hermes dispatched | CBD |
| 87 | 2026-09-27 | Fixed Attention check recipe accepted | ATT |
| 91 | 2026-09-27 | CB-D1 held for copy fidelity | CBD |
| 95 | 2026-09-27 | CB-D1, Hermes, Attention recipe dispatched | COORD |
| 99 | 2026-09-27 | Attention Assistant/Kit research registered | ATT |
| 103 | 2026-09-27 | Runtime Settings reader accepted | RTM |
| 108 | 2026-09-27 | Runtime Settings reviewed; RFS returns | RTM |
| 113 | 2026-09-27 | Runtime inventory I1 accepted; DS-1 | RTM |
| 120 | 2026-09-27 | Formal Work dogfood; EC-1 fix | DOG |
| 127 | 2026-09-27 | Code-block density follow-up registered | CBD |
| 132 | 2026-09-27 | RL-1 first real backend task; Magpie | DOG |
| 137 | 2026-09-27 | Lease queue real-provider dogfood | DOG |
| 142 | 2026-09-26 | Next order: runtime inventory I1 | RTM |
| 147 | 2026-09-26 | Order 3 frontend accepted | STR |
| 152 | 2026-09-26 | Order 3 frontend held (references) | STR |
| 157 | 2026-09-26 | Order 3 backend accepted | STR |
| 162 | 2026-09-26 | Live settlement accepted; recovery seam | STR |
| 167 | 2026-09-26 | Streaming return: C10 ok, race | STR |
| 172 | 2026-09-26 | Order 3 backend held; correction order | STR |
| 177 | 2026-09-26 | Harness/Core inventory; serial routing | COORD |
| 184 | 2026-09-25 | Streaming audit; decisions D1/D2 | STR |
| 188 | 2026-09-25 | E1-H Home-first Agent accepted | E1 |
| 192 | 2026-09-25 | E1-B bound-Run reading accepted | E1 |
| 196 | 2026-09-25 | RP-5..8 Home Send fix accepted | UXQ |
| 200 | 2026-09-24 | RP-1..4 polish candidate | UXQ |
| 204 | 2026-09-24 | Check cancellation parity corrected | DOG |
| 208 | 2026-09-24 | K5 profile editor accepted | KIT |
| 212 | 2026-09-24 | K5 correction reviewed; R2 open | KIT |
| 216 | 2026-09-23 | K5 reviewed; returns issued | KIT |
| 220 | 2026-09-23 | K4 profile preview accepted | KIT |
| 224 | 2026-09-23 | K4 slice selected and dispatched | KIT |
| 228 | 2026-09-23 | Runtime R1 accepted; schema 22 | RSL |
| 232 | 2026-09-23 | R1 held for three seams | RSL |
| 236 | 2026-09-23 | R0 accepted; R1 dispatched | RSL |
| 240 | 2026-09-23 | R0 reviewed; ownership clarified | RSL |
| 244 | 2026-09-23 | R0 contract prepared | RSL |
| 248 | 2026-09-23 | LP-R6 accepted | LPI |
| 252 | 2026-09-23 | Sol/Luna dispatched; LP-R6 UI | LPI |
| 256 | 2026-09-23 | Harness gaps mapped to owners | COORD |
| 260 | 2026-09-23 | LP-R6 slice selected | LPI |
| 264 | 2026-09-23 | E1 ordinary-Chat selection accepted | E1 |
| 268 | 2026-09-23 | E1 Kit path reached; return | E1 |
| 272 | 2026-09-23 | Astra coordination loop enabled | COORD |
| 276 | 2026-09-23 | K3 backend accepted | KIT |
| 280 | 2026-09-23 | K3-R1 correction delivered | KIT |
| 284 | 2026-09-22 | K3 author delivery | KIT |
| 290 | 2026-09-22 | K3 held for invariant | KIT |
| 294 | 2026-09-22 | E1/K3 boundaries expanded | E1 |
| 300 | 2026-09-22 | Main pushed 678d71c; Pages parity | COORD |
| 306 | 2026-09-22 | Clean checkpoint; push authorized | COORD |
| 312 | 2026-09-22 | K1/K2 planner accepted | KIT |
| 318 | 2026-09-22 | 06e direction A selected | E1 |
| 322 | 2026-09-22 | K0 selected; K1/K2 released | KIT |
| 326 | 2026-09-22 | Closure audit; Local Pi accepted | LPI |
| 332 | 2026-09-22 | Kit core, Role-first Composer prepared | KIT |
| 336 | 2026-09-22 | Local Pi held (LP-R5) | LPI |
| 340 | 2026-09-22 | Local Pi L3 contract adjusted | LPI |
| 344 | 2026-09-22 | Core C/D/E accepted; schema 19 | CDE |
| 350 | 2026-09-22 | Local Pi loop prepared | LPI |
| 354 | 2026-09-22 | Preview integrated; CDE return | PRV |
| 361 | 2026-09-22 | Grammar audit consumed; M1 lease | GUI |
| 368 | 2026-09-22 | 06d A accepted; B return | PRV |
| 375 | 2026-09-21 | Visual/spatial grammar consumed | GUI |
| 382 | 2026-09-21 | Core author loop authorized | CDE |
| 389 | 2026-09-21 | 06c accepted; tabbed Preview next | RTM |
| 396 | 2026-09-21 | 06c reviewed; bounded return | RTM |
| 403 | 2026-09-21 | Runtime management frontend authorized | RTM |
| 410 | 2026-09-21 | Composer location, CE-R1 accepted | 06B |
| 417 | 2026-09-21 | Transport accepted; Composer return | CDE |
| 424 | 2026-09-21 | P03-C transport reviewed | CDE |
| 428 | 2026-09-21 | Control-plane reference intake | RES |
| 432 | 2026-09-21 | P03-C transport order ready | CDE |
| 436 | 2026-09-21 | P03-B Pi Runtime Port accepted | CDE |
| 440 | 2026-09-21 | Answer footer accepted | 06B |
| 444 | 2026-09-21 | Updated author routing | COORD |
| 448 | 2026-09-21 | Prepared real dogfood; presentation return | 06B |
| 452 | 2026-09-21 | Preparation and approval accepted | 06B |
| 456 | 2026-09-21 | Preparation round 2 | 06B |
| 460 | 2026-09-20 | Preparation reviewed; PA-R1..R3 | 06B |
| 464 | 2026-09-20 | Coding-start friction accepted | 06B |
| 468 | 2026-09-20 | Agent profiles 06a accepted | AGP |
| 472 | 2026-09-20 | Basic real coding dogfood accepted | DOG0 |
| 476 | 2026-09-20 | Order 11 readiness accepted | DOG0 |
| 480 | 2026-09-20 | Agent profiles reviewed; return | AGP |
| 484 | 2026-09-20 | Coding handoff reviewed; return | DOG0 |
| 488 | 2026-09-20 | Frontend-first continuation authorized | AGP |
| 492 | 2026-09-20 | Order 11 handoff order ready | DOG0 |
| 496 | 2026-09-20 | First Core correction; personal Settings | DOG0 |
| 502 | 2026-09-20 | GUI merged; trees cleared | GUI |
| 506 | 2026-09-20 | GUI fresh node accepted | GUI |
| 510 | 2026-09-20 | 213ef4d reviewed; two fixes | GUI |
| 514 | 2026-09-20 | Remaining GUI fixes; G4 capture | GUI |
| 518 | 2026-09-20 | 3413978 reviewed; return | GUI |
| 522 | 2026-09-20 | G3 committed; G4 capture | GUI |
| 526 | 2026-09-20 | Pi naming clarified | RES |
| 530 | 2026-09-20 | Multica source consumed | RES |
| 534 | 2026-09-20 | Worker routing updated | COORD |
| 538 | 2026-09-20 | G1/G2 delivered; G3 active | GUI |
| 542 | 2026-09-20 | Local CLI, Runtime Settings ruled | RES |
| 546 | 2026-09-20 | Hermes/Praxis consultation | RES |
| 550 | 2026-09-19 | Serial construction, merge, core R&D | COORD |
| 560 | 2026-09-19 | Orchestra, Kits, Praxis direction | RES |
| 568 | 2026-09-19 | GUI grammar drafted; G1 re-ruled | GUI |
| 572 | 2026-09-19 | Home layout zoning PR | GUI |
| 576 | 2026-09-19 | Gap fixes independently accepted | FE16 |
| 580 | 2026-09-19 | Gap closure; Agents API slice A | FE16 |
| 584 | 2026-09-19 | Main node fa03143 merged | FE16 |
| 588 | 2026-09-16 | Live text streaming PR registered | STR |
| 592 | 2026-09-16 | Slice 09 navigation/object commands | FE16 |
| 596 | 2026-09-16 | Slice 08 presentation facts | FE16 |
| 600 | 2026-09-16 | Slice P Home identity | FE16 |
| 604 | 2026-09-16 | Slice 07 typed commands, compaction | FE16 |
| 608 | 2026-09-16 | Slice 00 v2/v3 entry review | FE16 |
| 612 | 2026-09-16 | Slice 06 capability consumption | FE16 |
| 616 | 2026-09-16 | Slice 05 Composer model card | FE16 |
| 620 | 2026-09-16 | Slice 04 Run surface | FE16 |
| 624 | 2026-09-16 | Slice 03 Host check recipe | FE16 |
| 628 | 2026-09-16 | Slice 02 candidate write GUI | FE16 |
| 632 | 2026-09-16 | Slices 00-01 RD-006 recovery, binding | FE16 |
| 636 | 2026-09-16 | English-first bilingual documentation | PUB |
| 640 | 2026-09-15 | Async rhythm, Attention reference | RES |
| 644 | 2026-09-15 | Spark form reference registered | RES |
| 648 | 2026-09-15 | Agents API adapter protocol slice | CDE |
| 652 | 2026-09-15 | Product node published; next baseline | PUB |
| 656 | 2026-09-15 | Continuable workplace public node | PUB |
| 660 | 2026-09-15 | Branch cleanup | COORD |
| 664 | 2026-09-15 | Main self-contained node | COORD |
| 668 | 2026-09-15 | Multi-agent bottleneck, Spark eval | RES |
| 672 | 2026-09-15 | Multi-source projection, Runtime Review | RES |
| 676 | 2026-09-15 | Presentation Gateway, composable grammar | RES |
| 680 | 2026-09-15 | Memory disclosure, reasonable forgetting | RES |
| 684 | 2026-09-15 | Agent visual orchestration, Notes | RES |
| 688 | 2026-09-14 | Chat/Preview Presentation research | RES |
| 692 | 2026-09-14 | Object Command grammar registered | GUI |
| 696 | 2026-09-14 | P1 Telemetry, Chrome verification | CHAT |
| 700 | 2026-09-14 | Composer Access local delivery | CHAT |
| 704 | 2026-09-14 | P1 environment gap, reassigned | CHAT |
| 708 | 2026-09-14 | Chat polish, P1 density | CHAT |
| 712 | 2026-09-14 | Copy feedback P0 fix | CHAT |
| 716 | 2026-09-14 | Chat run-state PR; coding recheck | CHAT |
| 720 | 2026-09-14 | Long coding dogfood counterexamples | DOG0 |
| 724 | 2026-09-14 | Composer model/effort quick-pick PR | CHAT |
| 728 | 2026-09-14 | Built-in browser dogfood; Agents API split | DOG0 |
| 734 | 2026-09-14 | Pre-code governance norm | GOV |
| 738 | 2026-09-14 | GitHub independent review consumed | GOV |
| 742 | 2026-09-14 | Release convergence, history preserved | REL |
| 750 | 2026-09-13 | Spark agent, Workspace Substrate delivered | SPK |
| 758 | 2026-09-13 | Settings resource management, icons | REL |
| 764 | 2026-09-13 | Frontend/backend merge, UI copy | REL |
| 772 | 2026-09-13 | Runtime detail hierarchy candidate | REL |
| 776 | 2026-09-13 | Settings M1 user-accepted | REL |
| 780 | 2026-09-13 | Settings spatial hierarchy M1 | REL |
| 784 | 2026-09-13 | Spark independent Agent design ruled | SPK |
| 788 | 2026-09-13 | Coding dogfood first; Spark re-ruling | SPK |
| 792 | 2026-09-13 | Optional workspace Chat, Recent | REL |
| 798 | 2026-09-13 | Release review fixes; real model candidate | REL |
| 804 | 2026-09-13 | UI hierarchy polish registered | REL |
| 808 | 2026-09-13 | Attention UI02 ruled, merged | REL |
| 812 | 2026-09-13 | Court positioning references consumed | RES |
| 816 | 2026-09-13 | Slash/compaction registered | RES |
| 820 | 2026-09-13 | Chatspace/Work review closeout | REL |
| 824 | 2026-09-13 | Work review object card | REL |
| 828 | 2026-09-13 | Chatspace Context/activity wiring | REL |
| 832 | 2026-09-13 | Release clean install, submit protocol | REL |
| 836 | 2026-09-13 | Context/TPS visual candidate | REL |
| 840 | 2026-09-13 | Release input, MCP faults, Core review | REL |
| 844 | 2026-09-13 | Attention UI drawing work order | REL |
| 848 | 2026-09-13 | Attention positioning, multi-view | REL |
| 852 | 2026-09-13 | Context/TPS audit; code gray | REL |
| 856 | 2026-09-13 | Information-architecture convergence serial | REL |
| 860 | 2026-09-13 | Release first slice, lifecycle evidence | REL |
| 864 | 2026-09-13 | Release independent review adopted | REL |
| 868 | 2026-09-13 | Frontend audit first batch | REL |
| 872 | 2026-09-13 | Self-contained architecture, governance node | RES |
| 878 | 2026-09-13 | Data-surface serial slices | REL |
| 882 | 2026-09-13 | Chat UI full redesign wiring | REL |
| 886 | 2026-09-13 | Model/effort production wiring | REL |
| 890 | 2026-09-12 | Model/effort adaptation registered | REL |
| 894 | 2026-09-12 | Chat Space/Composer attention registered | CHAT |
| 898 | 2026-09-12 | Chat continuity three-scenario specimen | CHAT |
| 902 | 2026-09-12 | Chat last round; cross-chat actions | CHAT |
| 906 | 2026-09-12 | Harness implementation package; live DeepSeek | DOG0 |
| 912 | 2026-09-12 | Home text six gaps deferred | PUB |
| 916 | 2026-09-12 | First work-loop public copy published | PUB |
| 920 | 2026-09-12 | Work-site recovery, patrol scope | RES |
| 924 | 2026-09-12 | Chat thin capability boundary | RES |
| 928 | 2026-09-12 | Governed work loop; Pages node | PUB |
| 932 | 2026-09-12 | Work obligation closure ruled | RES |
| 936 | 2026-09-12 | Chat Memory Broker registered | RES |
| 940 | 2026-09-12 | Public pages published; next Runtime index | PUB |
| 946 | 2026-09-12 | RD-007 merged into main | RES |
| 950 | 2026-09-12 | Shell return, notification contracts | RES |
| 954 | 2026-09-12 | Frontend node accepted; runtime validation | REL |
| 960 | 2026-09-12 | GUI Agent control-plane selection | RES |
| 964 | 2026-09-12 | RD-006 frontend-first consumption | RES |
| 968 | 2026-09-12 | Presence final design merged | PRES |
| 972 | 2026-09-12 | Presence mouth convergence | PRES |
| 976 | 2026-09-12 | Presence return accepted; message placement | PRES |
| 980 | 2026-09-11 | Presence Design handoff | PRES |
| 984 | 2026-09-11 | Spark/Attention product image redesign | PRES |
| 988 | 2026-09-11 | Fable partial accept; Paper closeout | PAG |
| 994 | 2026-09-11 | Spark bounded work, first target | SPK |
| 998 | 2026-09-11 | UI return merged; final Design round | PAG |
| 1004 | 2026-09-11 | Work-first definition, natural language | PUB |
| 1008 | 2026-09-11 | Chat peer page, dedicated Design | CHAT |
| 1012 | 2026-09-11 | Chat/Attention/Spark product rationale | CHAT |
| 1016 | 2026-09-11 | Paper pre-publish accepted; red diff | PAG |
| 1020 | 2026-09-11 | Chat/Attention long-term snapshot | CHAT |
| 1024 | 2026-09-11 | Paper pre-publish order; icon | PAG |
| 1028 | 2026-09-11 | Claude Paper v1 integrated | PAG |
| 1032 | 2026-09-11 | Research lab preparation track | RES |
| 1040 | 2026-09-11 | FakesNews reviewer distillation | RES |
| 1044 | 2026-09-11 | Context Window productization pending | RES |
| 1048 | 2026-09-11 | Claude Paper serial start authorized | PAG |
| 1052 | 2026-09-11 | les Privilege vendor, optical revision | PAG |
| 1056 | 2026-09-11 | LE native SVG signature candidate | PAG |
| 1060 | 2026-09-11 | SE branch read-only audit | PAG |
| 1064 | 2026-09-11 | Paper publishing surface consumed | PAG |
| 1068 | 2026-09-11 | Claude v3 received; Pages published | PAG |
| 1072 | 2026-09-11 | Work temporary capability research | RES |
| 1076 | 2026-09-11 | Claude Pages start authorized | PAG |
| 1080 | 2026-09-11 | Claude A/B v2 received | PAG |
| 1084 | 2026-09-11 | Runtime architecture, release semantics | RES |
| 1088 | 2026-09-11 | Pages published; Design return ruled | PAG |
| 1096 | 2026-09-11 | Pages first-principles re-ruling | PAG |
| 1100 | 2026-09-11 | WO-VS-01 local candidate delivered | POL |
| 1106 | 2026-09-11 | WO-VS-01 goal start | POL |
| 1110 | 2026-09-11 | Summary/Entry/BE41 node received | POL |
| 1116 | 2026-09-11 | Semantic/UI polish preparation | POL |
| 1122 | 2026-09-11 | Chat icon Fake UI first | POL |
| 1126 | 2026-09-11 | Claude handoff; Astra single-writer | POL |
| 1130 | 2026-09-11 | Summary/BE-41 dispatch | POL |
| 1134 | 2026-09-11 | Next merge/push node ruling | POL |
| 1142 | 2026-09-10 | Pro architecture review preparation | RES |
| 1145 | 2026-09-10 | R2-SD03 entry grammar first | POL |
| 1149 | 2026-09-10 | R2-SD02 card semantics | POL |
| 1153 | 2026-09-10 | R2-SD01 summary reading hierarchy | POL |
| 1157 | 2026-09-10 | Chat buttons, hover, Icon grammar | POL |
| 1161 | 2026-09-10 | Provider access, Spark sample accepted | SKN |
| 1169 | 2026-09-10 | VG01, comparison research booked | SKN |
| 1175 | 2026-09-10 | Five-item sequential verification, main | SKN |
| 1185 | 2026-09-10 | SK-3/4 Dystopia, theme diagnostics | SKN |
| 1189 | 2026-09-10 | SK-2 appearance effective projection | SKN |
| 1193 | 2026-09-10 | RV26-Q02 config validation, persistence | SKN |
| 1201 | 2026-09-10 | SK-1 Review decoupled from accent | SKN |
| 1207 | 2026-09-10 | Skin/Review, frontend continuity norm | SKN |
| 1217 | 2026-09-10 | RV26 review intake, first slice | SKN |
| 1223 | 2026-09-10 | Pages records, parallel products merged | PAG |
| 1231 | 2026-09-10 | Multi-expert full-turn, long-life prep | BE |
| 1237 | 09-08/09-09 (undated) | Round duties, completion node (rolling) | WSK |
| 1297 | 2026-09-09 | Execution-file-state PR preparation | BE |
| 1301 | 2026-09-09 | Backend independent dispatch BE-17/18 | BE |
| 1307 | 2026-09-09 | Local data governance research | BE |
| 1311 | 2026-09-09 | Local decoupling, maintenance research | BE |
| 1315 | 2026-09-09 | Data-system principles research | BE |
| 1319 | 2026-09-09 | Clean and Cool visual review input | WSK |
| 1329 | 2026-09-08 (undated) | Luna two orders CB-01/HC-01 | BE |
| 1335 | 2026-09-08 (undated) | Evidence established table (09-08) | BASE |
| 1349 | 2026-09-08 (undated) | Still-open list (09-08) | BASE |
| 1357 | 2026-09-08 (undated) | Responsibility and history pointers | BASE |
| 1363 | 2026-09-09 | Personal Attention research, PR prep | BE |
| 1367 | 2026-09-09 | Screenshot reread; Attention frontend link | BE |
| 1373 | 2026-09-09 | Multi-expert resource governance research | BE |
| 1379 | 2026-09-09 | Design method, Chat Space research | BE |
| 1383 | 2026-09-09 | Backend Activity/Usage, AM baseline | BE |
| 1389 | 2026-09-09 | Optional browsing capability research | BE |
| 1395 | 2026-09-09 | Review Surface CodeRabbit PR intake | BE |
| 1399 | 2026-09-09 | BE-30/AM/ES-01 backend merge | BE |
| 1407 | 2026-09-09 | Attention backend accepted, merged | BE |
| 1415 | 2026-09-09 | AM-B async loop dispatch prep | BE |
| 1419 | 2026-09-09 | Attention human decision queue handoff | BE |
| 1423 | 2026-09-10 | CC-D0-a/Scout v2 merged; queue | WSK |
| 1429 | 2026-09-10 | Publishing/brand interface cleanup | PAG |
| 1435 | 2026-09-10 | Markdown Review Surface architecture | MD |
| 1441 | 2026-09-10 | AM-B durable async tasks | BE |
| 1453 | 2026-09-10 | BE-5 declarative source resolve HTTP | BE |
| 1459 | 2026-09-10 | AM-B-T3 pure projection packets | BE |
| 1465 | 2026-09-10 | Markdown reader, Output Review boundary | MD |
| 1473 | 2026-09-10 | Home composition, Attention read-only | HOME |
| 1479 | 2026-09-10 | Repository public content cleanup | PAG |
| 1485 | 2026-09-10 | MR-A1a raw text coordinates | MD |
| 1503 | 2026-09-10 | Attention global agent, shared Runtime | HOME |
| 1509 | 2026-09-10 | Backend Governance claim | BE |
| 1517 | 2026-09-10 | Multi-agent Thread, local messaging | BE |
| 1527 | 2026-09-10 | Backend governance BG-01 | BE |
| 1546 | 2026-09-10 | Multi-agent practice selection RD-005 | RES |
| 1550 | 2026-09-10 | BE-41 backend isolated delivery | BE |
| 1553 | 2026-09-10 | Benchmark series BM-01..05 | BM |
| 1563 | 2026-09-11 | Pages merge ruling (09-11) | PAG |

Counts per thread code: RES 32, REL 28, BE 25, PAG 19, FE16 14, CHAT 13, KIT 12, GUI 12, POL 12, COORD 11, DOG 10, SKN 9, STR 8, DOG0 8, PUB 8, UXQ 7, RTM 7, LPI 7, CDE 7, 06B 7, E1 6, HRM 5, RSL 5, PRES 5, SPK 4, B2G5 3, CBD 3, AGP 3, WSK 3, BASE 3, MD 3, ATT 2, PRV 2, GOV 2, HOME 2, BM 1

Total rows: 308
