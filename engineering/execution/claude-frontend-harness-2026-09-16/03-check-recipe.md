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
