# Multi-agent 第二轮 · 后端测试与前端施工

用户于 2026-09-10 认领本轮：在[首片](../README.md)之上做 multi-agent 后端测试与前端施工，Sonnet 只读探查。认领时 `main@5b405b3`，开工基线 `main@b4e3f71`（两者之差为纯文档，未触 `app/`）。工作树带有另一单未提交的 `evidence/fe01-main-integration-20260909/wk98-regression.json`，本轮不动。Astra 持有架构、实现与合流；Luna 只读探查与独立反例。

首片交付范围见[生产合同](../../../../app/docs/coordination.md)与[C1–C10 账](../verification.md)。四单探查回执见 [explore/](explore/)，已逐项消费为下列裁定；回执是有界只读观察，不自动成为已验证事实。

## 本轮基线

`main@b4e3f71` 全量 `node --test tests/*.test.mjs ../tests/*.test.mjs` **446/446**，0 失败，61s。首片记的 446/446 属于组合提交 `c1f2122`，两者数目相同但不是同一次运行；本轮以此次为回归基线。

## 裁定

**范围**

- MA2-D06 后端测试只做今日可测的两类：无须改生产代码的 (a) 类与只需新 fixture 的 (b) 类。被生产代码阻塞的 (c) 类——持久 child intent、native lane adapter 注册表、Matter policy 交集与审批升级、handoff、Core proposal 消费方、broker、OTel、Workflow——不在本轮。
- MA2-D07 不加固 `app/harness/child-execution.mjs`。它今日零生产调用方（EX-MA-R1 §一），加固无生产调用方的代码不成立；现有测试保留不动。
- MA2-D08 三处名宽于实的测试（reply 血缘、SIGKILL 时点、reducer 的 `conflicts` 透传）按事实补足反例或改名，不改生产代码。
- MA2-D04 不为迁就测试改动生产准入。测试暴露的差异按事实修正一侧，逐项记明。

**vendor 与并行 child**

- MA2-D01 不升级 vendor。EX-MA-R2 在已安装 0.85.1 的 `.js` 实体上核实：`watchSession` 是整棵 harness 唯一的 `SliceNotImplemented` 抛出点，lane/drive/restore 均为完整实现；三包内**不存在 subagent / spawn-child API**，vendor 原生只有并行 lane 与轮内并行工具调用。
- MA2-D02 **本轮不建 MA-02 的 lane fixture**。生产从不调用 `AgentHarness.create`（零命中），走的是 `pi-coding-agent` 的 `AgentSession`，两者在源码层互不引用；lane fixture 只刻画 vendor 自身，不构成生产并行的证据。它的定位降为"采纳 lane 的前置门"，须先定路线再决定是否建。路线问题见下方开放项。
- MA2-D03 `capabilities.explore/handoff/workflow` 保持 false，直到能力真正接通且有本地 fixture。

**前端**

- MA2-D09 只建消费面，坐在既有 Attention 对话面内，不另起入口、消息列表控件或 composer。沿用已撤出原型的两处做法：`<details>` 折叠面挂在 `dialog.append(header, toolbar, [此处], stream, status, composer)`；**发请求前先构造回执对象**，以闭包变量跨重试保持同一对象，满足合同"未知回执后保留精确 ID 与载荷"。
- MA2-D10 Thread 消息不得折进 `projectThread` 的行模型——它不在 `state.events` 中，且合同要求投递与 Run／Core 接受分开显示。按本仓体例分为纯投影与视图两文件，投影遇不认识的形状返回 `null`。
- MA2-D11 消息流一律实色，不用 glass 或 `backdrop-filter`；颜色只引角色 token；不新增图标；Answer/Allow/Deny 一类不得纯图标。继承当前字号与控件高度，**不预支 FE-05a 的 V1 值**，亦不顺手修 M-16/M-17。
- MA2-D12 人类 HTTP 的收件箱读取不按成员关系限权，服务端不为前端兜住越权 Thread ID；前端只从已知列表显式选择，不接受任意 ID 输入。
- MA2-D13 `app/web` 写权**不在本轮手上**。开工当日 `6b8656e` 已把该写权移交 CC-I，[WO-CCI-01](../../../mvp/execution/work-surface-kit/work-orders/WO-CCI-01-property-row.md) 在 `claude/cci1-property-row` 上写 `settings-view.mjs` 与 `styles.css`。前端片与之唯一的文件重叠是 `styles.css`。故前端片不擅自并行开写，路线见开放项。
- MA2-D14 CF 编号材料未入版本控制，本轮不按编号引用 CF 项，只按 chat-flow README 的散文裁定执行。是否补入原始编号材料留给用户。

**分片**

- MA2-D05 两片写权互不重叠，可并行：后端测试片只写 `app/tests/**`；前端片写 `app/web/**`、`app/server/index.mjs` 静态白名单与自己的新测试文件。各自跑全量与相应 lint 后分别合入。

## 施工单

| 单 | 范围 | 状态 |
|---|---|---|
| [WO-MA2-01](WO-MA2-01-backend-tests.md) 后端测试 | global scope 目录与跨 scope 发送、domain 绑定守卫、reply 血缘对抗反例、coordination 写入撕裂恢复、`/web/*.mjs` 静态白名单机械对表、三处名实收敛 | 已派，`claude/ma2-backend-tests` @ `964c37f` |
| [WO-MA2-02](WO-MA2-02-frontend-consumer.md) 前端消费面 | Attention 对话面内的 Thread 目录／收件箱／发送与回执，含投影模块与源码回归测试 | 已派，`claude/ma2-frontend` @ `6b4f4cd` |

## 用户定向（2026-09-10）

- MA2-D15 **生产并行 child 走既有并发机制**，不采纳 vendor lane。依据：已装 0.85.1 内无 subagent/spawn-child API，vendor 原生只有并行 lane；而生产从不调用 `AgentHarness`，走 `pi-coding-agent` 的 `AgentSession`，两者源码互不引用。`app/server/service.mjs` 的 `this.active` 已并发持有多个 Run，跨 Session 并发在生产上已经存在；child 将作为受控的第二个 Session/Run。**MA-02 的 lane fixture 就此不建**，`child-execution.mjs` 不动。迁移 session runtime 到 `AgentHarness` 一路关闭。
- MA2-D16 **前端片与 CC-I 分文件并行**。前端片只新增 `coordination-view.mjs` 与投影模块、小改 `attention-agent-view.mjs` 的挂载、往 `app/server/index.mjs` 白名单加项、加自己的测试文件；与 CC-I 唯一重叠的 `styles.css` 新增集中成一整块带标记的末尾追加，合流前先 rebase。此为对"单一 `app/web` writer"字面规则的一次具名例外，仅限本片。

本轮尚未改动产品代码，未新增依赖，未运行真实 provider，未部署；G1–G5 与 Paper 不变。
