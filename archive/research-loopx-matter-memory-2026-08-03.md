# LoopX（huangruiteng/loopx）matter/memory 一手核查与架构消费结论

日期：2026-08-03。产出：Sonnet 只读跑腿（未 clone、未执行仓内代码、未遵循其 agent 指令），
Fable 架构消费。对象 `main` HEAD `91d8ed0`（合并 PR #2749 时点）。本件是归档输入，不替代
现行 ADR/SPEC；消费坐标已写回就绪图（DOSSIER-FLOW-1 行、memory 议题池、scheduled 判例段）。

## 取证边界（如实）

GitHub `/commits/`、`/graphs/contributors` 等 JS 渲染页抓取失败：逐文件提交日期、贡献者数
未获取。star/fork 两次读数不一致（15★/1 fork 与 668★/55 forks，间隔一分钟内，repo id 相同），
不采信。已证事实：MIT（LICENSE 原文核对）；Python≥3.11、运行时零依赖、v0.4.1；main 约
1,217 commits，issue 三枚开放（最近 2026-07-21）且 issue 创建受限；founder 单核主导。README
自述 "not an autonomous production controller"、"LoopX is early"——自限与源码实况一致。

## 核实到的架构事实（摘）

- **工作单位是 goal 非 session**：registry 条目＋`ACTIVE_GOAL_STATE.md`＋quota 车道＋
  per-goal append-only run history＋状态投影；todo 是 goal 内子对象，无独立 issue 对象。
- **工作语义核四字段**：active state 记 current belief／priority stack／non-goals／
  next action，文档明言 "without becoming a complete diary"——结构化字段，非转录日记。
- **三条记忆能力全部默认关闭**（reward_memory／agent_turn_recall／semantic_preference），
  按 goal+agent 显式配置才启用；写入走白名单 adapter＋`--execute`＋人工
  candidate-review（accept/edit/reject/retire/no_write，edit/retire 强制理由回执）；陈旧化
  显式十态枚举（stale/wrong-project/…/applied-verified）。
- **下游准入=上游回执**：agent_turn_recall 要求已 commit 的 quota should-run 回执且
  goal/agent/turn 三 id 与调用参数一致，缺回执即拒。
- **loop 节奏归系统层 quota 确定性状态机**（blocked_health/operator_gate/focus_wait/
  eligible/waiting/throttled/paused），Agent 被架构文档明文禁持 "unscoped effect authority"；
  `next_automatic_turn` 只是 advisory hint。预算是分钟占空比，非 step/token。
- **注入通道是进程外 CLI 文本**：Turn Envelope（带 `compaction.within_budget` 字节预算
  判定字段）打印 Markdown，宿主 agent 自行拼接；MCP/hook 直连在路线图第 6 步未落地。
- **claim≠实现两处**：并发写安全（per-goal 锁/幂等键/乐观修订）自列为服务器化前路线图
  第 1 步，未证完备；~12 个未展开 capability（dreaming/multi_agent 等）未核，不代表无反例。

## 架构消费结论（逐条，2026-08-03 裁）

| # | 对象 | 裁定 | 落点 |
|---|---|---|---|
| 1 | 工作语义核四字段（belief/priority/non-goals/next action，「不成日记」为显式反需求） | **借理念** | DOSSIER-FLOW-1 冻结 SPEC 时的 notebook 复杂度上界参照；non-goals 入格候选字段 |
| 2 | 每次编译留预算读数回执（`within_budget` 作字段非注释） | **借理念** | DOSSIER-FLOW-1 compiler 回执形态候选（包上限拒绝已有，补「读数入回执」） |
| 3 | 下游能力以上游已 commit 回执为准入凭证（id 三配缺即拒） | **借形态**（既有设计确认） | ADR-021 terminal CAS 先行已同族；「准入凭证=回执引用」显式形态入 DOSSIER-FLOW-1 素材 |
| 4 | 记忆写入网关谱系（五动作复核、edit/retire 强制理由）＋陈旧化显式十态 | **借理念** | memory 演进 ADR 议题池，与 OWASP Memory Guard 四态并挂 |
| 5 | quota 确定性状态机＋advisory hint（自动节奏被显式态穷举约束） | **后置登记** | scheduled invocation ADR（后续队列 1–2）trigger context 建模正面参照，与 OPENWORKER 负判例成对 |
| 6 | CLI 文本旁路注入通道 | **结构性不借** | 撞 ADR-009/021 进程内编译与 typed dossierContext；出程文本拼接即第二真源 |
| 7 | self-repair「policy 开关后同类修复不逐次问人」；dreaming/自主进化面 | **结构性不借** | 撞「授权作用域=单次提案」（opencode 先例）与触发主权归用户（ADR 前置锁死） |
| 8 | `seed_model_training_eligible` 逐记录字段化 | **显式不采纳** | 本仓全局禁训（不变量 8）；per-record 字段暗示存在可训记录，弱于全局禁令 |
| 9 | 其恢复机制（lease/幂等键） | **核实提醒** | 上游自认未完备；未来任何借用先核当时合并状态，不认路线图文字 |

## 与本仓距离的一句校正

产品负责人观察「区别在触发权归属、工作语义保持一贯而更轻」经一手核实成立且需收窄：LoopX
同为人主权设计（effect 层人闸、自主生产控制自禁），差异在**节奏**——其 quota 批节奏、
本仓显式触发。「轻」的可转移部分＝持久工作语义核可以很小（四字段而非机器）；不可转移
部分＝出程文本旁路（其轻的另一半来源，已裁不借）。
