# Dynamic-fact drift scan (HEAD ffe68fb, worktree courtwork-doc-convergence-20260929)

Read-only exploration. Paths are repo-relative to the worktree root. Code cites are `app/...:line`.

## 0. Ground truth from code

| Fact | Value | Cite |
|---|---|---|
| Host RuntimeStore schema | **22** (`SCHEMA_VERSION`). Upgrade accepted from validated 3..21 only; error text says "schema 3 through 21". | app/server/store.mjs:45, :435, :838 (list `[3..21]`), :883 (log), export :1914 |
| Core user schema | **4** (`CORE_SCHEMA_VERSION`) | app/core/bridge.py:53 |
| Bridge app schema | **5** (`APP_SCHEMA_VERSION`). Accepted (user_version, app) pairs: (1,'1'),(1,'2'),(2,'3'),(3,'4'),(4,'5'); user_version in {1,2,3,4} | app/core/bridge.py:52, :416, :426, ready message :984 |
| HTTP API version | **`v5`**, prefix `/api/v5/`. Docs file is named `api-v6.md` (revision label only; doc itself says so at app/docs/api-v6.md:8-9). package name `se-agent-v5-runtime` | app/server/service.mjs:441, :1049; app/server/index.mjs:286; app/package.json:2 |
| Pi SDK | `@earendil-works/pi-{agent-core,ai,coding-agent}` **0.85.1**; Node >=22.19.0; MCP client 2.0.0 | app/package.json:6-8, :20-25 |
| Slash commands implemented (Host-owned dispatcher) | Exactly six descriptors: `status` (read, :38), `tools` (read, :41), `model` (client_ui -> picker, no args, :44), `effort` (setting, enum `default`+model efforts, :47), `compact` (control, optional `focus` <=4000 chars, :52), `fixture` (passthrough; available only on Local test provider, :57). `parseSlash`: `//x` literal escape, `/name[ args]` lowercase name = command, everything else (`/Users/x`, leading space, `/skill:name` because of `:`) = text. `protocolVersion:1`, source `courtwork-commands-1`. | app/runtime/commands.mjs:9, :19-25, :34-69 |
| Command routes | `GET/POST /sessions/:id/commands`, `POST /sessions/:id/commands/:name`; errors `409 command_revision`, `404 unknown_command`, `409 command_unavailable`, `400 invalid_arguments` | app/server/index.mjs:229-231; app/server/service.mjs:691-756 (errors :703-708) |
| Manual compaction | `POST/GET /sessions/:id/compactions`, `GET .../:opId`, `POST .../:opId/cancel`; errors `nothing_to_compact` (service.mjs:861), `compaction_unavailable` (:868), `operation_active` (:880, :2911) | app/server/index.mjs:232-235; app/server/service.mjs:861-880 |
| Executors registered in production startup | **Only in-process Pi** (`createPiRuntimePort`, id `pi-coding-agent@0.85.1/agent-session`). CLI passes no `managedRuntimePort` and no `localPiWorker`. | app/server/executor-choice-state.mjs:5; app/runtime/pi-runtime-port.mjs:19; app/server/runtime.mjs:42-63; app/server/cli.mjs:33-40 |
| Managed Agents (`agents-api`) | Selectable option exists in the executor-choice contract (`MANAGED_EXECUTOR_ID="agents-api"`), but only becomes available when a trusted `managedRuntimePort` factory is *injected* into `createRuntime/startServer`; no production wiring found (no import of agents-host-gateway / openai-agents-transport under server/). Otherwise option reports `unavailable: Managed Agents has no configured and verified service on this Host`. Also refused for non-fake provider routes. | app/server/executor-choice-state.mjs:6; app/server/runtime.mjs:57-63; app/server/service.mjs:788-799, :806-816; app/server/index.mjs:271 |
| Local Pi process (`pi-local-print`) | Offline Spark consumer, off unless `localPiWorker === true` is explicitly passed to `createRuntime`; deterministic-provider only; not a selectable runtime | app/runtime/local-pi-process.mjs:11; app/server/service.mjs:221-227 |
| Hermes API-runs adapter | Exists (`hermes-api-runs`, v0.21.3 pin, `verification: "synthetic-loopback-fixture"`), imported only by tests and check-recipes; **not registered with Host/Store/UI**. Capabilities start/continue/observe/cancel/recover supported (fixture-verified); steer/approval/submitToolResult/compact unsupported. | app/runtime/hermes-api-runs-adapter.mjs:36-42, :48-60; grep: no import under app/server/ or app/web/ |
| Kit support | Reference-only Kit context (`reference-only-v1`) admitted **only** for in-process Pi adapter (id + revision `pi-agent-session-context-v1`); max 8 Kits/Run; Run-owned immutable `kitBinding` (schema >=21) | app/runtime/pi-runtime-port.mjs:55; app/server/service.mjs:534-537; app/runtime/kit-binding-state.mjs:8-11, :128, :140; app/runtime/kit-run-context.mjs:23 |
| Other tool facts | `check_run` (fixed Host recipes, in private candidate only) exists | app/runtime/check-tools.mjs:69 |
| Web Connect/Working-folder UI | Exists: `web/workspace-card.mjs` uses `host/choose-directory` + `repositories/*` | app/web/workspace-card.mjs (grep) |
| Runtime-source resolver UI consumer | Exists: `web/runtime-intake.mjs:59` POSTs `/runtime-sources/resolve` | app/web/runtime-intake.mjs:59; app/server/index.mjs:251 |
| SessionManager coupling in service | `server/*.mjs` contain **no** `SessionManager`; it lives only in `runtime/pi-runtime-port.mjs:2,64,65,94` (P03-B port) | grep |

Owner of each fact should be: schema numbers -> code + `app/README.md#Store schema` (the single doc copy) + migration tests; command list -> `app/docs/commands-and-compaction.md` (+ api-v6.md endpoint section); runtimes/executors -> `app/docs/api-v6.md` executor-choice + `runtime-foundation.md`; Hermes status -> `app/docs/hermes-api-runs.md`; overall status -> `engineering/current.md`.

---

## 1. Drift in navigation / index / entry documents

Verdict key: CORRECT, STALE (was true once), CONTRADICTS (contradicts owner/code now), AMBIGUOUS.
Severity: H = wrong current fact in an entry/index doc; M = wrong/misleading in a contract or index description; L = historical-in-place, cosmetic, or incompleteness.

### 1.1 High

| # | Location | Quoted | Code / owner says | Verdict | Owner should be |
|---|---|---|---|---|---|
| H1 | app/docs/README.md:9 | `[运行数据与迁移](../README.md#store-schema-v9-validated-v3v4v5v6v7v8-upgrade)：当前 Host schema 10。` | Schema 22 (store.mjs:45). Anchor is a legacy alias (app/README.md:112) that resolves to the "Store schema (v22 ...)" heading (:120), so link works but label lies. | CONTRADICTS (stale 12 versions) | app/README.md store-schema section; index should say "Store schema, migration and backups" with no number |
| H2 | app/docs/README.md:6 | `现有GUI/API、原生自动压缩与尚未实现的slash/manual入口。` | Six-command dispatcher + manual compaction implemented (commands.mjs:34-69; index.mjs:229-235). Target doc itself (commands-and-compaction.md:9-22) says supported. | CONTRADICTS | commands-and-compaction.md; index should describe scope ("commands, manual and automatic compaction") without status |
| H3 | app/docs/runtime-foundation.md:6-7 | `distinguishes that support from the unimplemented Host slash/manual-compaction entry.` | Same as H2; this is body text of a contract that links to commands-and-compaction.md. | CONTRADICTS | commands-and-compaction.md |
| H4 | app/docs/commands-and-compaction.md:63-71 (section "Command contract (RD-008)") | `An eventual command dispatcher must reject unsupported command invocations without a model request and provide explicit literal-text behavior. That is a future acceptance condition, not a claim about today's ordinary text channel.` | Same doc lines 9-26 describe the dispatcher, `//` literal escape and no-model-request errors as implemented; code confirms (commands.mjs:19-25; service.mjs:703-708). | CONTRADICTS (intra-doc; user-reported) | same doc; rewrite as historical RD-008 pointer or delete |
| H5 | docs/runtime-control/INDEX.md:49 | `Runtime state now upgrades validated schema 3/4 to schema 5 with an exclusive exact-byte backup; older hosts reject it.` | Schema 22; sibling docs/runtime-control/architecture.md:35 already says "3-21 ... persisted as schema 22". | STALE | docs/runtime-control/architecture.md#persistence-upgrade (INDEX should only link) |
| H6 | app/docs/api-v6.md:469 | `The current Host RuntimeStore is schemaVersion 21; ... validated migration from schemas 3–20` | 22 / 3-21. Same doc line 145 says "current Store22" (internal inconsistency). | STALE | app/README.md store-schema section |
| H7 | engineering/architecture.md:122 | `当前service的Pi SessionManager耦合还需先移出，不能把该目标当成今天仅改一个adapter即可完成的事实。` | server/ has no SessionManager; P03-B port owns it (pi-runtime-port.mjs:2,64). Same doc :29 and :73 describe the port and executor choice. | STALE / contradicts own :29 | engineering/architecture.md :29 section (delete or restate as "Provider/model helpers remain Pi-coupled") |
| H8 | engineering/research/agents-api-first-2026-09-14/README.md:23 | `当前 service 仍直接引用 Pi SessionManager 与 createSessionRun` | Same as H7. (dated research record; but says "当前".) | STALE | dated packet; would need a "superseded by P03-B" note, or leave as history (see §4) |

### 1.2 Medium

| # | Location | Quoted | Code / owner says | Verdict | Owner |
|---|---|---|---|---|---|
| M1 | app/docs/api-v6.md:480-481 | `The service has no Connect/Access UI, external source writes, automatic merge, or repo test runner.` | Connect UI exists (web/workspace-card.mjs; supported-preview.md:10 "GUI preparation ... Working folder"); candidate `repo_write` exists (api-v6.md:476-478 same page); `check_run` exists (check-tools.mjs:69, check-recipes.md). "external source writes" and "automatic merge" still true. | CONTRADICTS (2 of 4 clauses) | supported-preview.md / repository-binding.md / check-recipes.md |
| M2 | app/docs/repository-binding.md:244 | `Any future Connect UI must explain this namespace-visible scope before binding.` (also :53, :77 "helps the Connect UI") | Connect UI exists (workspace-card.mjs). | STALE | repository-binding.md (needs "the Connect UI must ..." + evidence pointer) |
| M3 | docs/runtime-control/INDEX.md:15 and docs/runtime-control/source-resolver.md:49 | `pure parser and authenticated inspect-only HTTP seam; no UI/model tool or locator acquisition` / `BE-5 now exposes authenticated HTTP inspection, with no UI consumer.` | web/runtime-intake.mjs:59 consumes `/runtime-sources/resolve`. INDEX line also lists "Developer intake implementation" (:17) which is that UI. | CONTRADICTS (index copy of a stale owner claim) | source-resolver.md; INDEX should drop "no UI" |
| M4 | app/docs/repository-binding.md:34-36 | `RuntimeStore schema 20 (the binding arrived in 16, the private candidate in 17) is separate from Core user schema 4 and bridge app schema 5` | Current is 22. Reads as current-state statement. | STALE / AMBIGUOUS | app/README.md; say "introduced in 16/17" only |
| M5 | app/docs/api-runtime-mx-r1.md:3 | `Store schema remains 3.` | 22. Reads as current. Dated delivery header ("MX-R1 additions") but not marked historical. | STALE | app/README.md |
| M6 | app/docs/run-attempts.md:1, :81-83 | Title `... · BG-02 / RuntimeStore 10`; heading `Lineage introduction in schema 9; current schema 10`; `The combined main now uses schema 10` | 22. Heading literally says "current schema 10". | STALE | app/README.md; heading should be "Lineage introduction in schema 9" |
| M7 | app/docs/attention-agent.md:5 | `Current additive schema8 and explicit Thread messaging are defined in coordination.` | "Current" store is 22; schema 8 is when coordination was added. | STALE wording | coordination.md; drop "Current" |
| M8 | app/docs/async-tasks.md:7 | `Core3/app4 are unchanged.` (with `Current Attention scope and schema6 migration ...`) | Current Core is 4 / app 5 (bridge.py:52-53). Reads as current. | STALE | docs/work-core/governance.md / AGENTS.md pair |
| M9 | app/docs/README.md (whole file, entries missing) | Index has no entry for: check-recipes.md, example-workspace.md, hermes-api-runs.md, projectless-chat.md, repository-binding.md, request-telemetry.md, runtime-proposals.md, spark-agent.md, supported-preview.md (9 of 28 docs). Some are reachable from app/README.md (supported-preview, repository-binding) or dated sub-headings. | Index incomplete; hermes-api-runs.md (which owns "not in product") and supported-preview.md (support table) are unreachable from the docs index. | incomplete | app/docs/README.md |
| M10 | app/docs/README.md:31-37 | Structure: entries after L29 are appended after the closing "模块位置见 ..." paragraph, in mixed zh/en and ungrouped (attention-agent, coordination, run-attempts, usage-details, first-work). | Not a fact drift; makes the index hard to maintain. | cosmetic | — |
| M11 | app/README.md:66 | `RuntimeStore8 is unchanged by BG-01.` (inside undated "Governed object reads") | Historical fact about a delivery slice; current store is 22. | AMBIGUOUS | drop version; governance.md owns |
| M12 | app/README.md:154 | `No remote runtime is selectable or exposed by this schema.` (Runtime19 sentence) | Runtime22 paragraph at :122-132 says managed Agents option requires explicit trusted factory; code: option is listed/readable, selectable only when injected (service.mjs:788, :806). Historical-per-version sentence without a "at that time" marker. | AMBIGUOUS | app/README.md schema-history (mark as version-scoped) |
| M13 | app/README.md:195-204 ("Tools available to the model") | Baseline list `ask_user, ws_list/read/write/grep, domain-extension tools, runtime_load`; "There is no arbitrary shell/browser tool" | Also `check_run`, `candidate_*`, `repo_*`, `thread_*`, Spark tools, attention tools exist (check-tools.mjs:69 etc). "No arbitrary shell" still true. Section L212-216 covers repo tools but not check_run. | AMBIGUOUS/incomplete | supported-preview.md + check-recipes.md |
| M14 | app/web/README.md:1-31 | Title `V6 generic UI handoff`; hashes `index.html 455c540c…`, `styles.css a382d421…`, `app.mjs ea234992…`; check paths `<isolated-checkout>/deferred/structural-checks/ui-v6-*.test.mjs` | Actual sha256 now: index.html 39231513…, styles.css 9bf5681e…, app.mjs 79c65cf2…; no `deferred/` directory exists in repo. Doc claims "complete UI-author handoff hashes after the V6 changes". | STALE (historical handoff presented in a live module README) | move to evidence/ or mark historical; app/web/README.md should describe module only |
| M15 | engineering/research/README.md:15 | `RD-008 ... CMD-01/CMP-01登记Release后期Developer增量，CMP-02质量优化后置，未实现新入口。` | Implemented (engineering/current.md:604-606 "施工单 07"; code). Dated 2026-09-13 snapshot inside a live index without "superseded" marker. RD-008 header itself (engineering/research/RD-008-command-compaction.md:4) also says `未实现、未派发`. | STALE | RD-008 record + current.md:604; index should have a neutral one-liner |
| M16 | engineering/execution/claude-frontend-harness-2026-09-16/README.md:61 | `typed command 与手动 compact 是待接真实增量` | Done (07 record; current.md:604). Packet README is a planning ledger ("planning registration, not implementation acceptance" per engineering/execution/README.md:5). | STALE-in-ledger | current.md |
| M17 | app/docs/supported-preview.md (whole support table) | Rows: Chat, Models, Files, External repository, Tools/MCP, Formal work, Spark, Attention, Extensions, Commands. No row for executor/Runtime choice (Pi default; managed Agents option unavailable), nor Kit/profile support. | Code has executor-choice (service.mjs:782-830) and Kit (Pi only). Omission, not contradiction. | incomplete | supported-preview.md is the natural single owner for "what works" |

### 1.3 Low

| # | Location | Note |
|---|---|---|
| L1 | app/docs/first-work.md:3 | `[repository instructions](../../README.md#本地运行)` — root README.md heading is `## Run locally` (README.md:88); `本地运行` exists only in README.zh-CN.md:88. Anchor broken; tools/check-doc-links.mjs strips `#…` (lines ~28-30) so it does not catch this. Same broken anchor in evidence/release-preflight-20260913/public-facts.md:7. |
| L2 | app/docs/api-v6.md:3-15 vs app/README.md:3 | Filename `api-v6.md` documents `/api/v5`; app/README.md:3 calls it "the current HTTP contract is api-v6.md" — fine, doc explains itself; consider noting in the index (app/docs/README.md:7 correctly says `/api/v5`). |
| L3 | app/docs/runtime-api-proposal.md:1 | Historical banner points to `../../docs/api-v5.md` and `../../docs/framework-contract-v5.md`, neither exists in docs/. (Banner says historical; broken pointer only.) |
| L4 | docs/restore-v6.md:5, docs/restore.md:14 | "Pi 0.83.0" — listed under "历史交付记录" in docs/README.md:25-32 with the scope disclaimer at :27. Correctly handled. |
| L5 | engineering/release/harness-implementation-2026-09-12/README.md:23 | `当前 RuntimeStore schema 12` — dated packet; "当前" is time-of-writing. Leave as history; the AGENTS/current rule (verification.md:72) says historical receipts keep their SHAs. |
| L6 | engineering/release/review-intake-2026-09-13/README.md:85 | `当前Release只声明 ... 不声明Host slash dispatcher或手动compact可用` — dated 2026-09-13 section. supported-preview.md:32 links this packet as "the release record" for "remaining release qualification". Stale as current statement; fine as history. |
| L7 | engineering/architecture.md:37 (2026-09-22 entry) | `Kit catalog/selection/import and production Kit→Run freezing remain separate missing consumers` — the doc's own :7 says K3 supersedes ("supersedes the September22 paragraph's missing Run-freezing consumer") and :73 says Run-owned Kit summaries exist. Handled with a cross-note, but the stale sentence remains. |
| L8 | engineering/architecture.md:5 | `selects Hermes as the first research candidate ...` while code has a standalone Hermes adapter (not in product) and current.md:75 records "Hermes standalone protocol accepted". Consistent with "research candidate" wording only loosely — AMBIGUOUS; owner is current.md + app/docs/hermes-api-runs.md. |
| L9 | evidence/README.md | Lists 56 of 132 packet directories (76 missing, e.g. `publication-release-20260914`, which site/README.md:3/:50/:65 treats as the current media receipt). Header says it is a "directory map"; incompleteness is not stated. |
| L10 | engineering/execution/README.md | Lists 10 of 20 entries (19 dirs + 1 file). Missing from 2026-09-10-backend-governance… onward except claude-frontend-harness. |
| L11 | docs/README.md | No link to repository-layout.md (linked from engineering/README.md:43 and README.md instead). Otherwise all targets exist and descriptions match. |
| L12 | brand/README.md:13 | `10 项本轮核实来源与附件候选` — visual-runtime-index.json has 24 entries: 10 `verified`, 14 `unverified`. AMBIGUOUS. `40 个静态 SVG` = 40 files, CORRECT. |
| L13 | site/README.md:50 vs :63 | :50 "当前批次 publication-release-20260914 ... fd96f96 13对" (matches media/main/manifest.json: 26 media, fd96f96). :63 (2026-09-12 final captures at 07688226…) is superseded but kept as a separate paragraph; it says it overrides an older state but not that it is itself superseded. Low. |
| L14 | app/README.md:120 anchor forest | 11 `<a id=…>` aliases (:108-119) encode schema versions in URLs (`store-schema-v9-…`, `-v17-…`, `-v5-…`). Every external link (app/docs/README.md:9, api-v6.md:469, engineering/architecture.md:75) points at one of these old aliases, which is why they never got updated. |

### 1.4 Verified CORRECT (no action)

- AGENTS.md:28 (schema 22 / Core 4 / app 5) — matches code; but it is a *copy*.
- engineering/architecture.md:73 (schema22, Core4/app5, executor choice, Kit Pi-only, managed live availability separate) — matches code; also a copy.
- docs/work-core/contract.md:9 (Core 4 / app 5, Runtime JSON 22, 3-21) — matches; copy.
- docs/runtime-control/architecture.md:35 (3-21 -> 22) — matches.
- app/README.md:93, :120-132 (schema 22, Core4/app5, Pi default, managed option needs trusted factory) — matches (this is the natural owner).
- app/docs/api-v6.md:145 ("current Store22"), :318 (kitBinding schema21), :56-73 executor-choice contract — match code.
- app/docs/commands-and-compaction.md:9-32 — matches code exactly (six commands, error codes, `//` escape, routes).
- app/docs/supported-preview.md:16 — command list matches code; `/model <id>` "unavailable" matches (`model` has `args:null`, commands.mjs:44 -> "takes no arguments").
- app/docs/hermes-api-runs.md:3-8 ("Nothing registers these modules with the Host") — matches code.
- README.md:66-72 (Agents API lane unavailable; local Pi process consumer offline/explicitly injected) — matches code. Root README.md is *generated* from site/src/readme.mjs (site/README.md:26; line 73 of readme.mjs carries the same sentence) — edit the generator, not the output. README.zh-CN.md is hand-authored.
- README.md/zh-CN Node 22.19+, Python 3, Git 2.36+ — match package.json engines and app/README.md:70.
- site/README.md:20, :50, release.json (`9e5384f`), media/main/manifest.json (`fd96f96`, 26 files) — consistent.
- tools/README.md, benchmarks/README.md, docs/work-core/README.md, engineering/README.md, engineering/design/README.md — no dynamic-fact drift found.

---

## 2. Intra-doc future-vs-implemented contradictions (app/docs, docs)

| # | Doc | Passage saying future/unimplemented | Same doc / owner says implemented |
|---|---|---|---|
| I1 | app/docs/commands-and-compaction.md | :69-71 "An eventual command dispatcher must reject ... That is a future acceptance condition, not a claim about today's ordinary text channel." | :9-26 dispatcher implemented, `//` escape, no-model-request refusals. Code: commands.mjs:19-25. |
| I2 | app/docs/commands-and-compaction.md | :59-61 "A future `estimatedTokensAfter` must remain an estimate, not be labeled provider-exact usage" | :32 the manual-compaction record already exposes `result.tokensBefore` / `estimatedTokensAfter` as `sdk-estimate`. (Reading: :57-58 is about `run.notice` events only, so wording "future" is ambiguous; the fact exists in operation records.) |
| I3 | app/docs/runtime-foundation.md | :6-7 "unimplemented Host slash/manual-compaction entry" | commands-and-compaction.md (its own link target) + api-v6.md:283-305 (CMD-01/CMP-01 sections). |
| I4 | app/docs/api-v6.md | :480-481 "no Connect/Access UI ... or repo test runner" | supported-preview.md:10,16; check-recipes.md; repository-binding.md:53-89 (Connect UI helper routes used by web/workspace-card.mjs). |
| I5 | app/docs/repository-binding.md | :244 "Any future Connect UI must explain ..." | :53, :77-89 describe Connect UI helper routes; UI exists. |
| I6 | docs/runtime-control/source-resolver.md | :49 "with no UI consumer" | Code: web/runtime-intake.mjs:59; docs/runtime-control/INDEX.md:17 lists Developer intake implementation. |
| I7 | app/docs/api-v6.md | :469 "current Host RuntimeStore is schemaVersion 21" | :145 "current Store22". |
| I8 | app/docs/attention-agent.md | :3 "Future runtime/lifecycle research ... accepted Hermes adapter" | Consistent with code (adapter standalone). Not a contradiction; just note that status wording lives here and in hermes-api-runs.md and current.md:75. |
| I9 | app/docs/coordination.md | :72 "formal input-coverage integration is not yet delivered"; :113, :152 "A future ..." | Not contradicted by anything found (UNVERIFIED against code; only doc-level scan). |
| I10 | docs/runtime-control/INDEX.md | :32-42 table `memory_provider/workflow/hook/registry ... not implemented` | Spot-check: no `kind: 'hook'|'workflow'|'registry'|'memory_provider'` executors in app/runtime (grep returned only "registry" query kinds in attention/governance tools, unrelated). Looks CORRECT; not exhaustively verified. |

Reverse direction (doc says implemented, code says otherwise): none found. Closest: app/README.md:154 "No remote runtime is selectable" (M12) understates rather than overstates.

---

## 3. Index entries whose link target exists but description no longer matches target

1. app/docs/README.md:6 -> commands-and-compaction.md: says "尚未实现的slash/manual入口"; target documents them as implemented. (H2)
2. app/docs/README.md:9 -> ../README.md#store-schema-v9-...: says "当前 Host schema 10"; target section is v22. (H1)
3. docs/runtime-control/INDEX.md:15 -> source-resolver.md: "no UI/model tool"; UI consumer exists. (M3)
4. docs/runtime-control/INDEX.md:49 (text, links persistence anchor) -> architecture.md#persistence-upgrade: says schema 3/4 -> 5; target says 3-21 -> 22. (H5)
5. app/docs/README.md:7 -> api-v6.md: "`/api/v5` 下的会话、运行、凭据、文件与事件" — target now also owns commands, compactions, executor-choice, repository binding/candidate, kitBinding. Under-describes; not wrong.
6. app/README.md:3 -> "the current HTTP contract is api-v6.md" — file name vs `/api/v5` (L2) — fine.
7. engineering/research/README.md:15 -> RD-008: "未实现新入口" (M15).
8. evidence/README.md, engineering/execution/README.md — descriptions fine per row; the *set* is incomplete (L9, L10).
9. app/web/README.md — title "V6 generic UI handoff" vs the directory's actual content (M14).
10. app/docs/first-work.md:3 -> README.md#本地运行: anchor missing in English README (L1).

---

## 4. Structural observations (why drift keeps happening)

1. Schema version numbers are hand-copied into at least: AGENTS.md:28, app/README.md (:93, :120-132), engineering/architecture.md:73, docs/work-core/contract.md:9, docs/runtime-control/architecture.md:35, app/docs/api-v6.md (:145, :469), app/docs/repository-binding.md:34, plus historical-per-slice mentions in ~10 app/docs. engineering/verification.md:72 and its dated entries (e.g. :96, :175, :187) show each schema bump requires a manual "entry points aligned" pass; the misses are exactly app/docs/README.md:9, api-v6.md:469, INDEX.md:49.
2. Old versioned anchors in app/README.md (:108-119) act as stable link targets, so index links never need editing when the version moves — and their *labels* silently rot (H1, H6).
3. tools/check-doc-links.mjs ignores `#anchor` fragments, so broken heading links (L1) and stale-label links pass.
4. Status prose ("尚未实现", "future", "当前") inside index bullets (app/docs/README.md:6, research/README.md:15, INDEX.md:15) is a second copy of a status that the target owns.
5. Slice-history doc sections (Runtime11…22 paragraphs in app/README.md:120-171; "Schema N upgrade" in coordination/async-tasks/request-telemetry/attention-agent/run-attempts) each contain "old hosts reject N" / "Core3/app4 unchanged" that read as current when the heading does not say "historical".
6. Root README.md is generated (site/src/readme.mjs); fixes there must be made in the generator and zh-CN counterpart together.

## 5. Unverified / not checked

- engineering/current.md (1567 lines) not scanned for internal drift; used only as owner reference (current.md:604 confirms CMD-01/CMP-01 delivery; :75 Hermes standalone accepted).
- ~140 engineering/**/README.md at depth <=3 were only keyword-scanned (schema/command/Hermes/managed/"未实现"); dated packet READMEs deliberately treated as history. Not read line by line.
- coordination.md:72/113/152 "future/not yet delivered" claims not checked against code.
- docs/runtime-control/INDEX.md resource-coverage table (:24-43) only spot-checked (I10).
- Whether every listed route/code in app/docs/api-v6.md exists was not audited beyond commands, compactions, executor-choice.
- Test counts / SHA pins in engineering docs not audited.
- Did not run tools/check-doc-links.mjs (task said no test/tool runs); anchor findings are from manual heading comparison.
