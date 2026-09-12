# 02 · 两条解耦线、运行契约与故障语义

本文件是目标合同草案，不是新增 API 已存在的声明。字段必须先与当前 DTO 对账，再由唯一 owner 冻结；优先兼容提取，不先迁数据。[R03](SOURCES.md#r03)[R04](SOURCES.md#r04)

## 1. 依赖图

```text
Work Surface / Chat Surface
        │ 意图与检查；不拥有正式权威
        ▼
Host application / Run admission ─────── Human decision ──► Work API / Core
        │                      ▲
        │ ApplicationContribution（可缺席）
        ▼                      │
Work prepare / Compiler ◄── 获准来源、Matter 投影、Expert / policy
        │ frozen Run Plan
        ▼
Runtime Port ──► Pi adapter（现参照） / 独立 runtime adapter（未来）
        │                     │
        │ scoped capability   └── Native protocol journal / codec
        ▼
Tool / Model / Environment boundary
        │ observations / candidates / effect receipts
        └──────────────────► 对应原 owner
```

这是模块化单体的责任图，不要求新建这些目录，更不要求服务拆分。控制、查询和正式决定不必绕行 Compiler。

## 2. 解耦线 A：Host 与 Pi 原生 session

当前 seam 是 service 的 `#ensureHostSession`、SessionManager import/open/create 和后续 native handle 生命周期。[R05](SOURCES.md#r05)

目标是 adapter 持有 Pi 对象，Host 只持 opaque locator 与能力事实。`ModelDriver` 的身份、catalog、凭据来源、协议选择是独立 facet，不塞入 Expert。模型参数不能指定 actor、Session 或绕开绑定身份。

最小设计伪接口如下；它不是对所有 runtime 的完整公分母，也不预设所有能力都为 true：

```ts
// PROPOSED contract sketch, not implemented SDK code.
interface RuntimePort {
  capabilities(): CapabilityFacts;
  openConversation(locator: OpaqueNativeLocator | null): Promise<ConversationRef>;
  prepareRun(plan: FrozenRunPlan, conversation: ConversationRef): Promise<PreparedRun>;
  inspectRecovery(locator: OpaqueNativeLocator): Promise<RecoveryFacts>;
}
interface PreparedRun {
  // prepare 不外发模型请求，不执行工具。
  start(): Promise<void>;
  interrupt(reason: string): Promise<InterruptReceipt>;
  settled: Promise<RuntimeOutcome>;
}
// steer / native resume / fork / context reset 是按 adapter 公开的可选 facet。
// unsupported 必须在相应动作发生前被明确拒绝，不伪造实现。
```

保留既有顺序：受串行保护的 `commandId`/single-active-run admission → 取得唯一 Run ownership → 准备并绑定 native handle/输入证据 → 确认撤销状态 → start。不能为接口整齐，把 native 创建或 provider 请求提前到幂等仲裁之前。[R05](SOURCES.md#r05)[R10](SOURCES.md#r10)

作者需证明旧 façade 与新 adapter 的 fixture wire、工具顺序、事件与结算等价。允许随机 ID/时间戳规范化，但不能把影响含义的 prompt 或 tool schema 差异从比较中抹掉。端口完成不需要升级 Pi、改 journal 路径或重写历史 adapterId。

## 3. 解耦线 B：普通 Harness 与 Work application

现 `createRuntime` 的 Core 构造是应用组合决策，不应成为所有运行的必需依赖。[R06](SOURCES.md#r06)

提取 `WorkApplication`，把现 Work/Attention 工具、角色贡献与专业 finish/reconcile 留在该侧；新增纯 Harness 构造路径。旧完整应用入口和 HTTP shape 保留。第一片只提 façade，第二片切组合，分别通过行为测试。

ApplicationContribution 提供 scoped context/tools、关闭 admission、finish/reconcile 等窄操作；不能拿到裸 Core store 全量写权。正式 human decision 继续走现认证和 Core 命令，不暴露成模型工具。缺席时纯运行可用；已有 workRef 的运行必须显式 `work_unavailable`，不偷偷退成无绑定聊天并假装完成。

**必须测转递依赖**：纯入口 import、构造、启动和普通运行都不能读取/启动 Core。这个门可用阻断 Core constructor/bridge 的 fixture 证明；但它不要求卸载 Python 或重构全仓。现 project 身份、managed workspace、配置/导航不在此片顺带改变。

## 4. Run Plan：冻结的是证据与要求，不是永远有效的权限

首版只冻结已经有消费者的最小字段族：

| 字段族 | 要证明什么 |
|---|---|
| identity | runId、commandId、Session、工作绑定；由可信 Host 建立 |
| selection | requested/effective/bound 的 runtime、model、profile 身份与 revision |
| input sources | source ref/version/hash、获准读取范围、必要的 coverage/unknown |
| compiler | compiler revision、稳定指令贡献和生成输入的版本 |
| capabilities | 实际广告工具及 schema hash；要求、支持事实与缺失原因 |
| grants | 当前授权引用、作用域、动作限制；执行时重新检查撤权 |
| budget | 最大轮次/调用、deadline、读取/输出预算；token 与 chars 分开 |
| output contract | 候选/观察类型、证据与 verifier 要求；不赋予 accepted 权 |
| native recovery | opaque locator、runtime/codec revision、恢复支持与缺席原因 |

必要的作用域信息保留，不把 JSON Schema 当作安全策略。许可集合取交集：用户当前授权 ∩ 宿主政策 ∩ 工作范围 ∩ profile ∩ runtime 实际支持；文本中的 allowed-tools 或“忽略规则”不能改变这个集合。

## 5. 输入证据的三个层次

`prepared` 证明 Host 编译/准备了什么；`submitted` 证明 adapter 在哪次请求边界实际发送了什么；模型是否真正利用某条信息需另行评测，不能由前两者推导。

原生 journal 是唯一原生历史 owner。Run 输入证据可引用其稳定位置，并保存必要的系统/工具/贡献 blob 和摘要 hash，避免每次复制全部 transcript。对隐私敏感原文按现数据域保留，不写公开日志；不采集或展示私有 chain-of-thought。重放必需的 provider 私有协议字段只在受限 codec/native owner 内保真，不转成通用记忆。

快照数据准备失败不得继续启动付费请求。已外发而 submitted 回执写入失败的窗口不能被伪记为 never-sent；需留下 unknown-disclosure 状态或可查恢复线索，停止后续动作并复核。一次 Run 内动态加载的正文、tool 结果及 compaction 的后续请求也要有有界来源增量，不能拿首个 system 字符数代表整轮所有模型输入。

历史无字段返回 partial/unavailable，不能用当前配置伪造旧输入。字符长度不是 token；provider 报告的 usage、Host 观测时间、估算值分别标记。[R10](SOURCES.md#r10)

## 6. MCP：结果与效果分轴

下列是判别语义，不强制立即加三张新表。沿现 onUnknown、notice、Run status 与 adapter 结果扩展最少字段。[R05](SOURCES.md#r05)[R08](SOURCES.md#r08)

| 可见情形 | 工具结果 | 外部效果 | 默认恢复动作 |
|---|---|---|---|
| 参数/权限在本地派发前拒绝 | rejected | 有证明的 none | 修正请求后可新建合法动作 |
| 已派发且工具返回成功 | success | 由具体回执证明的效果；成功本身不等于 Core 接受 | 正常进入下一校验/候选步骤 |
| 已派发返回 isError，效果无证据 | error | unknown | 记录精确 callId，关闭后续相应工具 admission，先核对，不自动重发 |
| Host 可证明只读的调用返回 error | error | 无状态变更；读取/网络披露仍可能已发生 | 不把“无写效果”说成未披露；按错误与权限策略处理 |
| 已派发但超时、断连、取消或回执丢失 | unknown/cancelled | unknown | 保留不确定，禁止当作已回滚 |

实现要区分 not_dispatched/dispatched/result_received，以及结果状态与 effect certainty。`isError` 不天然证明无副作用；远端自报 readOnlyHint 不授予可信只读证明。未知效果的清理需要原 owner 的明确核对结果，context reset、UI 已读或新模型会话不能清掉它。

目录发现使用**实际安装 SDK + 本地 loopback server**验证：legacy 与宣称支持的 modern 分别测。若 SDK 本已合并，则不要重复叠分页循环；修补 Host 仍缺的上限、coverage 和失效竞态。需要完整或明确失败的目录快照；第二页失败、重复/循环 cursor、跨页重名、超量、旧连接晚到均不能发布 healthy 截短集合。

保留 `content` 与 `structuredContent` 的共存结果、工具错误正文及所需来源/版本信息。结构化结果按所用协议/schema 校验，不能一律假定为 object 或用自由 JSON 文本代替有类型数据。UI/model 投影可以裁切，但原始有界证据与 unsupported content 状态应保留；不把不支持的媒体假装渲染成功。

## 7. 取消、重启与替换

取消先关闭后续 admission，再向实际 executor 请求中断，等待主事件链/写者 drain 与真实 settle；取消回执不等于工具回滚。保存失败、late event、extension finish/reconcile 失败和无法确认停止都必须有明确状态，不能提前释放仍有 writer 的锁。

当前重启安全路径是 active Run → unknown，不是恢复到继续执行同一调用。[R05](SOURCES.md#r05) 本轮先保持该语义。可分别添加：①原进程/原协议可支持的恢复；②同一工作的新 Run 接手。二者 UI 和合同分开。

第二 runtime 的接手读取获准 Matter/source/obligation refs，编译新输入并生成新 native conversation；不把 Pi 的协议私有 messages 或 compaction summary 强行交给 Codex。换执行器不要求模型输出逐字相同，但要求相同 Expert 字节与 Core 提交合同不变，权威边界和故障语义仍成立。

## 8. 反例优先的验收矩阵

Runtime：准备中取消、问题待答中取消、tool 已发未回、compaction 中取消、主事件落盘失败、terminal 前崩溃、native journal 缺失、old approval 晚到、重复 commandId。

Work：Core 不可用时纯 Chat 正常；已绑定 Work 明确拒绝；候选不被自动接受；版本变更使旧审批失效；重复决定不重复生效；恢复不能制造已接受成果。

权限：scope 切换、撤权、旧 source/index、跨 Session 引用、profile 中有名但实际 runtime 不支持、模型伪造 actor。所有测试使用独立合成数据；禁止为验负例触碰真实副作用服务。
