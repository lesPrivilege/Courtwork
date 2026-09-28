# 03 · 从产品里执行检查

2026-09-16 · Claude（Fable 5.1）裁决与 GUI；Sonnet 5 按裁决实现执行器、结算与治理。owner 回写见 [RD-009 · 2026-09-16 节](../../research/RD-009-trusted-harness-extensions.md)与 [DF-04](../../release/harness-implementation-2026-09-12/harness-dogfooding.md)。

```text
Task / scope: DF-04 / RD-009：一个 Host 固定检查 recipe，真实进程，取消后独立结算，工具卡与批准卡
Base SHA / branch: 02 片末 4717ef2 / claude-frontend-harness-20260916
Writer / reviewer: Claude 作者；Sonnet 5 实现 6f7186f；非作者复核与人的目验未做

Owner fact + contract: RD-009 DF-04 可施工合同；app/docs/check-recipes.md（本片新增）
Ruling: recipe 只在私有 candidate 内运行（Host 自建、无共享写目录），永不在用户目录或托管 workspace 执行；catalog 固定在代码里（node-test v1：node --test，120 s，每流 64 KiB，最小环境 PATH/HOME(临时)/LANG）；模型只传 recipeId；check_run 在 read_only 下 deny，其余模式一律 ask；结算由 Host 直接写 check.started / check.settled 事件，不依赖 Pi 的 tool.result；重启后未结算的 check 记 unknown 且不重放；退出 0 不是接受
Semantic / projection / control / placement: 批准卡与 ws_write/repo_write 同一解剖，标题 Approve this check?，对象 recipe 名与版本，范围行写命令、位置、时限、输出上限、环境；工具行状态词 Checking / Exit N / Cancelled / Timed out / Unknown；结算详情按事实（Recipe/Outcome/Duration/Output cut）+ stdout/stderr 原文；活动行 Running checks
Affected UX rule IDs: UX-02（限额与位置在动作旁）、UX-05（取消只在进程组退出后落词；unknown 是 unknown）、UX-06（不自动重试丢回执的调用）、UX-08（进程结果、模型自述、Core 接受分列）
Nearest precedent: renderPermission / permissionPresentation；appendToolDetails；repository-candidate-tools（Host 结算沿 recordRepositoryCandidateRead 的 store 事件模式）；固定 SHA 4717ef2
Evidence type: implemented precedent
Governance status: candidate（无非作者复核）
Kept relationships: 普通子进程不称 sandbox；ws_*/repo_*/candidate_* 不变；Run/callId 识别执行，不用 commandId
Intentional changes: TOOLS 加 check_run（随 candidate 曝光）；store 新增两类事件与重启围栏；问题载荷校验加 check_run 字段集
New terms / primitives / dependencies: 词见 copy-convention §3.2b（Check · Approve this check · Checking · Exit N · Timed out · Unknown）；无新依赖
Exceptions: 无

Fixture: 同 01 合成仓库；Local test provider 的 /fixture script 依次发起 check_run、repo_write（修复）、check_run
Checks: 见下
Independent review: 无
```

## 提交

| 提交 | 内容 |
|---|---|
| `c149558` | GUI：批准卡、Host 结算投影到工具行、结算详情、活动词、9 项 UI 测试 |
| `6f7186f` | Host：recipe 目录、执行器（进程组、超时、输出上限、取消）、check_run 工具与治理、事件结算与重启围栏、文档、12 项测试 |

## 作者检查

| 检查 | 结果 |
|---|---|
| `node --test tests/check-recipes.test.mjs tests/repository-candidate.test.mjs tests/control-plane.test.mjs tests/permission.test.mjs tests/runtime.test.mjs tests/check-ui.test.mjs` | 66/66（含成功/非零退出、输出上限、超时杀进程组、取消后结算、read_only 零启动、ask 载荷、deny 无 check.started、重启围栏 unknown、unknown recipe） |
| `npm test` | 1109/1109（Node 25.9，并发 4） |
| 浏览器目验（Local test，合成仓库，同一 Chat 同一 candidate） | `check_run node-test` → 批准卡 `Approve this check? / node-test v1 / node --test · in the private candidate · 120 s · 64 KiB per stream · minimal environment` → Approve → 行 `check_run · Exit 1`，详情 stdout 含 `2 !== 3` 与候选树路径 → `repo_write` 修复（expectedSha256 前态）+ `check_run` → 两次批准 → 行 `Exit 0`，stdout `pass 2 / fail 0`；Review changes 显示 `From commit 7c8dd3fc8709 · 2 writes`：`src/parcel.mjs · modified · 445 B（1 added, 1 removed）`与 `NOTES.md · added · 16 B` |
| lint 与文档链接 | 通过 |

一次真实反例：Host 重启后 fixture provider 的 toolCallId 计数归零，与重启前的写入 callId 撞车，Host 以"callId already used with different input"拒绝写入并让后续检查仍为 Exit 1；这是幂等守卫按合同 fail-closed，不是产品缺陷；真实 provider 的 callId 不重复。

## 用户中途指令处置

"Chat 列表页露出其他面的 UI 残余，根因是折叠与收敛两套逻辑混乱" → 采用：新增唯一谓词 `surfaceAllowed()`（有 Session 且非 Home/Chat 列表/Attention/Settings），工作面面板、折叠 rail 与头部入口按钮三处同源；折叠（open/expanded）只在该谓词为真时才有意义。原先 rail 与后一次布局重绘各自维护一份缺少 Chat 页的判断。

## 未完项

- 只有一条 recipe，catalog 固定在代码里；Settings/Runtime 未列出 recipe（RD-009 要求的"可理解的默认检查入口"留 06/10）。
- 取消路径与重启围栏只有 Host 测试，浏览器未走 Stop working 中断检查。
- 真实模型从 GUI 发起一次检查（合同验收序列最后两步）未做；非作者复核未做。
- Inspector 对 check 事件的呈现未改（工具行已含结算）。


## First post-integration correction — 2026-09-20

Astra implements the bounded [same-Run candidate approval correction](evidence/core-check-revision-20260920/README.md) under this original owner and RD-009. A successful write earlier in the Run now advances the check permission and start receipt to the current revision; subsequent candidate/binding or recipe-descriptor drift rejects before process execution. The Store validates the start atomically and the runner rechecks after asynchronous preparation. Author affected-seam checks pass 79/79, including real synthetic command execution and reopen. Luna's exploration recommendation is adjusted to support fresh exact approval rather than reject every same-Run write/check. Independent acceptance is recorded in the evidence packet when completed. Real-model/browser dogfood and broader G4 acceptance remain open.

### Independent F-01 disposition — adopt

[Luna's first review](evidence/core-check-revision-20260920/luna-review-round1.md) found cancellation could arrive during temporary-HOME preparation and still spawn a child before killing it. Astra adopts this blocker. Add a final synchronous signal/admission fence; a recorded check start cancelled before any child exists settles once as `cancelled`, with null exit code/signal/failure and empty output. A signal already aborted, one aborted by the final Host callback, and admission closed while persisting the start must all prevent process creation. Existing in-flight process cancellation still waits for group termination.

### Bounded acceptance — 2026-09-20

F-01 is closed. [Final author 82/82 and independent Luna 27/27 evidence](evidence/core-check-revision-20260920/README.md#final-independent-acceptance-and-f-01-disposition) supports local integration of this correction, with exact final hashes. Astra accepts this bounded slice and retains N-02/real-model GUI and full G4 residuals with their existing owners.

Accepted source commit: `8aef0bd41fe9426d775f86e47aec6435d46f9ac5`. The preserved failing-test stdout has two whitespace-only output lines; they remain raw evidence rather than rewritten output. Product source whitespace checks pass.


## 2026-09-24 · P03-E cancellation parity correction

The original owner contract recorded an in-flight child's raw exit code/signal after cancellation. P03-E reproduced two OS close tuples for the same cancelled check (handled `SIGTERM` → exit 1, and direct `SIGTERM` → signal). Per the user-directed canonical Host record, `check.settled` now stores `status:"cancelled"`, null `exitCode`/`signal`, and retains partial output and duration after the process group is confirmed closed. The child runner's raw close tuple remains available internally but is not persisted for cancelled checks; completed and timed-out facts are unchanged. This deliberately supersedes the in-flight raw exit/signal sentence in `app/docs/check-recipes.md` at the accepted 2026-09-16 baseline. The exact-one-settlement regression remains in the P03-E integration test. RuntimeStore schema is unchanged.

## 2026-09-27 · Fixed Attention contract recipe: Sol assignment

User authorizes independent Sol work alongside the single Claude core/frontend lane. Astra adopts [Luna's bounded preflight](evidence/attention-check-recipe-20260927/README.md), correcting the omitted `--test` flag. This addresses RL-1's recorded narrow-check friction for the next Attention consumer under existing DF-04/RD-009. It does not make RL-1's old tests retrospectively run in CW.

**Owner/precedent:** Host frozen recipe catalog, existing `node-test` v1 and unchanged check approval/runner/settlement. Add exactly one `node-test-attention-contract` v1 titled `Run Attention backend contract tests`. Command is `process.execPath`; cwd remains private candidate;120000ms,65536 bytes per stream and minimal environment remain. Exact argv is `['--test','--test-concurrency=1','app/tests/attention-core.test.mjs','app/tests/attention-http.test.mjs','app/tests/attention-recovery.test.mjs','app/tests/attention-github-fixture.test.mjs','app/tests/attention-gmail-fixture.test.mjs','app/tests/attention-trace-fixture.test.mjs']`. These are Courtwork-root-relative tests, synthetic/provider-free, not a live connector/Agent capability claim.

**Sol ownership:** `app/runtime/check-recipes.mjs`, `app/docs/check-recipes.md`, `app/tests/check-recipes.test.mjs`, and a focused new check integration test/fixture if needed; author evidence under this packet and a delivery append here. Do not edit runner/check-tools, Host/Store/runtime factories, Core/Attention implementation, other test assertions, UI, dependencies or shared current/dispatch documents. You are not alone: Claude owns shared Markdown/UI and subsequent Hermes core work, preserve all other edits. No dynamic arguments, test paths, command/env/cwd/timeout input, new registry, applicability engine or approval change.

**Required behavior/evidence:** old recipe unchanged; model still supplies only recipeId. Actual permission descriptor reaches unchanged runner with exact new argv, candidate identity/revision and existing limits. Unknown ID/read_only/deny/stale remain fail-closed with no new spawn. Demonstrate true multi-file execution, ordinary nonzero outcome for a failing test/missing target, and success against all six actual suites. Reuse existing cancellation/restart/settlement tests, not duplicate implementation-shaped tests. No missing-path fallback to another command. Candidate code execution is not a sandbox or formal acceptance.

**Preparation and checks:** use isolated source/tree and disposable candidate/data/ports. Candidate dependencies must be explicitly prepared only in test fixtures/evidence; no hidden install, personal config, user-data reuse or product change to dependency resolution. Run changed check tests plus the existing governance/parity tests selected by verification.md, the actual six-file command and fake smoke where the Host seam is exercised. Record raw log/count/file coverage. A real local fake-provider Host `check_run` integration may support approval/settlement but must not be labelled real-model CW dogfood. Parent can later exercise real CW once the candidate is accepted; do not restart user8787.

Deliver committed source and evidence with exact SHAs; parent owns independent acceptance/integration. No push, deployment, paid provider, unrelated refactor or main mutation. If success requires a new Host authority/dependency contract, report the concrete blocker instead of expanding this slice.

**Actual dispatch:** parent created the managed isolated `attention-check-recipe` checkout from committed contract `6e983dc`, branch `codex/attention-check-recipe-20260927`, and dispatched `/root/sol_attention_check_recipe` (GPT-6 Sol, high). Only the bounded recipe/catalog/test/documentation scope is leased. Existing attached trees retain unrelated untracked evidence and were preserved rather than overwritten. Delivery and independent acceptance are pending.

### Sol implementation boundary

The affected responsibility is the Host-owned frozen recipe catalog. The nearest implemented precedent is `node-test` v1 in `app/runtime/check-recipes.mjs`; the existing check approval, candidate revision fence, runner and durable settlement remain the authority. This change adds one fixed Attention test descriptor and its documentation/tests. It needs no cross-layer change: Core, Runtime Port, service/store, and UI consume the existing `check_run` facts without modification. Sol owns the bounded author result; Astra retains integration and independent acceptance.

### Sol delivery · author evidence

Sol source `ee6afb5b08c86ec902b6176c913e4ce7c6116c03` plus focused test/probe correction `49417c6` deliver the fixed row and its direct Host contract coverage in the isolated `codex/attention-check-recipe-20260927` tree. [Author evidence](evidence/attention-check-recipe-20260927/README.md#sol-author-result--2026-09-27) records exact argv, synthetic pass/fail/missing-path outcomes, 32/32 governance/parity tests, the actual six Attention suites 25/25, local-fake smoke and a disposable private-candidate Host receipt. The preflight finding is adopted with the explicit `--test` correction; no new owner or approval mechanism was introduced. Independent review and integration remain with Astra/Luna; this author result does not close formal Attention, live-connector or real-model gates.

### Independent review F-01 disposition · adjust

Luna's independent F-01 review found a low-severity coverage regression: the existing read-only and ask/deny checks had been retargeted to the new recipe, so they no longer directly exercised `node-test`. Sol adjusts those two tests to run both frozen ids, retaining exact approval argv and zero-start assertions for each. There is no runtime defect or product change. The focused `check-recipes.test.mjs` command passes **15/15** on Node 25.9.0; [raw author correction log](evidence/attention-check-recipe-20260927/author-f01-check-recipes.log) is retained. Astra retains final independent acceptance and integration.

**Parent acceptance:** [independent receipt](evidence/attention-check-recipe-20260927/parent-review/README.md) accepts `75027fc` and closes F-01. Luna15/15 plus25/25 and a fresh private-candidate fake-Host receipt pass; Parent changed-path2/2 passes on isolated merge with byte-identical app source. The fixed second recipe is accepted; real-model dogfood/native connectors/full product closure are not claimed. Both original task histories are retained.


## 2026-09-28 · Serial Harness self-check closure — expanded Claude lease

The user agrees to serial construction and explicitly broadens worker Claude's permissions. Original Claude may autonomously implement, locally commit, run relevant Node/Python tests and own/dispose independent synthetic Hosts/processes across this finite work order. Routine reversible implementation choices do not require renewed user confirmation. Astra retains architecture/integration and independent acceptance; the author cannot self-accept. This is task-local construction/execution authority, not a global permission-mode change or a bypass of the separately rejected native Hermes server execution.

**Outcome and owner.** Close the RL-1 own-repository self-check gap under existing DF-04/RD-009. First deliver the third frozen Host recipe; after independent acceptance, run a bounded real CW development task against an isolated candidate using the engineering Kit/Skill, actual approved checks, independent review and continuation. Existing DF01–06/P05/P06 bounded acceptance is retained, not reopened. Planning baseline is inspected main d38a93ae64238828351aec17dd4f37ddd5a02363.

**Fixed descriptor:** id `node-test-harness-contract`, version1, title `Run Harness Core and Extensions contract tests`, command `process.execPath`, cwd `candidate`, timeout120000ms, output65536bytes per stream, env `minimal`. Exact argv, from the private candidate root:

```text
--test
--test-concurrency=1
app/tests/hermes-api-runs.test.mjs
app/tests/request-summary.test.mjs
app/tests/runtime-load-recovery.test.mjs
app/tests/kit-context.test.mjs
app/tests/control-plane.test.mjs
app/tests/check-recipes.test.mjs
```

Luna verified these existing paths and dependencies without executing the suite. The descriptor retains the current hard ceiling; author must measure the actual command under the minimal runner environment. If it does not fit, return measured timing for a deterministic smaller contract decision; do not silently increase limits or drop a target. The Hermes file is pure synthetic HTTP conformance, not the rejected native server. This recipe is a selected regression set, not all of Harness, Extensions or product acceptance.

**Authority and predecessor:** extend `app/runtime/check-recipes.mjs` as the accepted Attention fixed-recipe precedent. The model supplies only recipeId; existing candidate identity/revision, exact Host approval, read_only denial, pre-spawn/cancel/unknown/restart and independent settlement continue unchanged. No generic command/argv, fallback command, install hook, policy relaxation or schema change.

**Dependency preparation:** candidate-local `app/node_modules` must materialize the exact current app lockfile. No link to mutable user/global node_modules is evidence for this real engineering closure. Claude may provision existing dependencies with `npm ci --ignore-scripts --no-audit --no-fund` in its owned candidate/app using an isolated HOME/cache, empty user/global npm configuration and explicit public npm registry; preserve package/lock bytes and record inventory/identity. An already verified immutable dependency image may be copied with provenance instead. No upgrades, global install, interpreter download, personal credential/config reads or copied provider keys. This is explicit fixture/candidate preparation before check approval, never automatic check_run behavior. Missing dependencies/targets remain normal nonzero process results with no hidden install or retry.

**Implementation latitude:** expected source is the frozen catalog, `app/docs/check-recipes.md`, focused recipe/governance tests and this original record/evidence. Claude may also correct a directly necessary existing check-runner/tool/Host projection seam and its exact consumer tests if a concrete reproduction establishes the need; record owner/precedent and cross-layer reason before the edit. New authority, persistence schema, native runtime/provider support and global UX rules still require Astra's concrete contract. Frontend changes, if needed, consume existing UX/frontend/spatial rules; OpenAI parent performs computer-use verification. Do not refactor unrelated code or rewrite historical captures/goldens.

**First handoff evidence:** all three recipes retain original meaning/order; synthetic candidate fixed paths prove every new target runs, pass→nonzero→pass after an exact candidate write, missing file and missing dependency are truthful failures, deny/read_only/unknown-id start zero processes, and approved identity/argv/revision match the actual check. Run the actual current suite with candidate-local dependencies through a real fake-provider Host/check_run and retain check.started/settled/output/source hashes. Author/source and independent acceptance remain separate; meaningful existing adjacent check-revision/cancellation tests suffice, not repeated full suites. Commit explicit paths and release the writer for non-author review before real-provider execution.

**Second phase:** parent prepares the accepted current source in an independent review environment, with user-entered provider key outside Git. Select one bounded real engineering task and record exact task/source, Kit/Skill/profile/Run/candidate/check/permission/effect identity; cap the initial exercise at two substantive Runs and existing per-Run limits, with further attempts based on a concrete failure. Skill text is working guidance, not authority. The model must actually invoke the frozen recipe and consume its failure/pass output; tests run by an outside reviewer cannot be attributed to CW. Independent review/merge, browser reload and safe continuation/unknown handling finish the stated scope. Do not claim fresh-user configuration or real model evidence until it actually occurs. No new release gate or automatic deployment is introduced.


**Actual dispatch and missing-target adjustment · 2026-09-28.** Original Claude has received fixedf3bc8b0 in the existing isolated serial lane; UI confirms Running and implementation. Its preliminary six-file timing (linked development dependencies, not final candidate evidence) is126/126 in about45s, within the unchanged120s ceiling. Candidate-local dependency/Host receipts remain required.

Claude's missing-target regression exposed Node25.9 silently skipping a missing explicit test path when another path exists. Astra independently reproduces `node --test present.test.mjs missing.test.mjs` yielding exit0/pass1. Adopt a fixed-target guard at the existing synchronous check-tool beforeSpawn boundary for both fixed-path recipes, preserving generic node-test discovery and the current cancel/candidate/approval checks. This supersedes the earlier contract wording only for missing targets: missing fixed targets cause no child spawn and one Host `failed` settlement with failure.code `missing_target`; missing dependencies still produce an actual nonzero test-process result. No new approval fields, schema or authority. The worker's expanded lease includes this demonstrated adjacent seam; no new user confirmation is needed. Require a partial-missing-target test, not just an entirely empty candidate.


### Real engineering consumer selected for phase two

The first actual CW-authored task after recipe acceptance is the existing check-recipe discoverability gap exposed by RL-1: `check_run` advertises a recipeId string but no available IDs, and `runtime_load` correctly refuses to serve as a recipe catalog. Current source has one frozen `listCheckRecipes()` owner and no model catalog consumer. This is a bounded real product improvement, not a new shell/discovery service or a deliberately reintroduced production bug.

In a fresh independent private candidate, the CW model may change only `app/runtime/check-tools.mjs`, focused `app/tests/check-recipes.test.mjs` coverage and the corresponding check-recipe documentation. Derive the recipeId parameter's human-readable choice guidance from the frozen Host catalog (IDs and titles only), preserving the string validation shape, unknown-ID refusal, candidate exposure and all approval semantics. No duplicated recipe list, new tool/endpoint/registry, imported execution authority or automatic install. The model first adds a meaningful regression observing the actual model-facing tool declaration for an active candidate, runs the new fixed recipe to see it fail, implements the smallest source change, and runs the same recipe to pass. Parent reviews proposed candidate writes/check approvals and tests that existing unknown-id/refusal behavior still holds. Native or personal credentials are never model arguments or recipe metadata.

This work is reserved for the CW real-model phase, not original Claude's recipe implementation; original Claude prepares/reviews only the infrastructure first. Parent will verify exact code/test/Run/check/candidate identities, preserve original tests and failure evidence, and perform independent integration after model delivery. The first task may be explicitly told the new recipe ID; do not claim that this proves unaided discovery. Any later discovery claim must inspect the newly served model schema after an accepted Host restart. Real execution remains pending user configuration in the isolated acceptance environment.

### Harness recipe · pre-edit seam record (Claude, 2026-09-28)

**Concrete reproduction.** Node 25.9's `node --test` treats each positional path as a glob pattern. When one fixed target is missing but others exist, it skips that target silently and exits 0: two present files plus one missing gave `tests 2`, exit 0. A fixed recipe with one missing target would therefore settle as a passing `completed` check, so "missing target is a truthful failure" cannot rest on Node alone. The accepted Attention recipe shares this latent gap; its test covered only a candidate with no targets. A missing dependency is already a truthful nonzero result (`ERR_MODULE_NOT_FOUND`, exit 1).

**Seam and owner.**
- The fix goes in the existing check tool, `app/runtime/check-tools.mjs`, at the `beforeSpawn` fence.
- The precedent is the approved-candidate recheck there, which already settles a pre-spawn Host refusal as `failed` with `{code}` and starts no process.
- **Rule:** each fixed recipe path argument (argv entries not starting with `-`) must be a regular file inside the approved candidate. A missing one stops the check before spawn and settles it as `failed`, with `failure.code = "missing_target"`, empty output and no process.
- **No new authority:**
  - no schema change, since `failure.code` is an existing free identifier;
  - no approval change;
  - no fallback command, install or retry;
  - `node-test` has no path arguments and is unaffected.
- **Deviation from the contract wording:** the contract text says missing targets remain "normal nonzero process results". For a partially missing set, that is not what Node does, so this reports a Host pre-spawn failure instead. Astra should confirm or return a different rule.

### Harness recipe · phase 1 author result (Claude, 2026-09-28)

Source `c32c492`; [author evidence](evidence/harness-check-recipe-20260928/README.md).

- **Recipe:** the third frozen recipe, `node-test-harness-contract` v1, exactly as contracted.
- **Missing-target rule:** Parent independently reproduced Node 25's partial-missing false pass and adopted the guard.
  - A missing **fixed target path** (Attention or Harness) starts no process. The check settles once as Host `failed` with `failure.code = "missing_target"`, after the cancel/admission and approved-candidate/revision fences.
  - A missing **dependency** is still the real test process's nonzero result.
  - `node-test`'s default discovery, approval fields and settlement are unchanged.
  - A single-target-missing counterexample (5 of 6) is covered, not only all-missing.
- **Checks:** the governance/adjacent suites pass 56/56. The real fake-provider Host `check_run` against a private candidate with candidate-local `npm ci --ignore-scripts` dependencies ran the six files 129/129, exit 0, in 59.5 s of 120 s.

Writer released for independent review. The phase 2 real-provider task waits for Parent's environment and the user's key.
