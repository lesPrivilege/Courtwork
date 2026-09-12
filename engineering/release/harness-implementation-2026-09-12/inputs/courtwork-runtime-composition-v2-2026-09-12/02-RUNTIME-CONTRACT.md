# 02 · Runtime 接口、能力与替换条件

以下是设计责任和候选字段，不是已实现 DTO。接单时先查现 `control-contract.d.ts`、service 与持久化 owner，再冻结必要增量。

## 1. 两种 Runtime 接法

| 接法 | CW 控制什么 | 不重复实现什么 |
|---|---|---|
| Embedded / CW-owned | Pi core 的组合、允许的扩展、provider profile、模型 adapter、执行预算 | 上游已足够的基础循环/协议功能 |
| External / native-owned | 启动/连接、隔离实例、能力协商、task/run 映射、授权和回执适配 | Codex/Hermes/OpenClaw 自己的 loop、私有会话、模型 codec |

外部 runtime 不必实现 Pi extension API。CW 映射其原生可用能力；原生能力无法安全收敛时减少支持范围，不能用旁路获得所有文件/凭据/外发权。

禁止同一项 runtime-native 请求经过 CW ModelAdapter 编码后，再交给原生 runtime 重新编码。原生路径沿其官方 model/provider 接入面；CW 只提出可支持的选择与要求。否则会引入两份实际 model/config owner。

## 2. 接口责任

Runtime Port 至少能说明：身份与版本；支持哪些任务和控制；如何创建/打开原生会话；何时可以开始执行；如何请求取消；如何取得事件与唯一结算；旧执行与新执行如何关联；哪些历史不可恢复。

prepare 不应被模糊定义为永远无副作用：对 CW-Pi 可要求在 admission 后准备且不发模型请求；外部 Runtime 的启动/握手可能有本地 I/O 或网络行为，必须单列在 provider lifecycle 中披露、授权和隔离。真正模型执行不得早于 CW 幂等 admission 与运行绑定；无法分开的原生接口不列为兼容。

建议最小绑定记录：`runtimeProviderId`、runtime/adapter revision、role/profile ref、requested/effective model identity、能力支持快照、原生 session locator、context generation、来源/权限引用和预算。复用既有字段，不预占新数据库 schema。

## 3. 不能只用一个 supported 布尔值

每项能力至少应表达支持/不支持/未验证、语义限制、对应版本及证据。关键能力包括执行、流式事件、取消、逐次审批、历史读取、原生 resume、普通接手续行、tool 注入、文件范围、context reset、compaction、子任务与后台调度。

`interrupt` 接受请求 ≠ 执行已经静止；执行静止 ≠ 已发生外部效果可撤销。`resume` 一词必须区分原生 session 续接、CW 历史阅读和按工作状态重新开始。

UI 由实际快照驱动：当前/下一 Run/历史配置分开；不支持能力保持不可用并有说明。事件标识带 Run 与 runtime generation，旧 adapter 的晚到消息不得污染新运行。

## 4. 状态 owner

| 状态 | 归属 | 替换处理 |
|---|---|---|
| CW Run/命令/用户审批与回执 | 现 Host owner | 保留身份及版本，不随原生进程销毁 |
| 原生对话与协议 metadata | 对应 Runtime owner | 保真保留或按授权导出，不承诺任意互转 |
| 工作来源、候选、正式决定与义务 | 对应内容/Core/外部系统 owner | 保持真源，按当前授权供新运行引用 |
| 编译上下文 | 本次执行投影 | 可重编；不等于能删掉原生恢复所需状态 |
| UI 状态/索引 | 投影 owner | 可重建；不得替代正式/原生事实 |

单一 owner 不表示只有一个物理存储：关键是每类事实只由一条正式写入路径解释。不同 Runtime 各自的原生 journal 不是“重复真源”；额外维护一份试图冒充全部原生协议的统一 transcript 才是应避免的情况。

## 5. 安全切换流程

先停止旧 lane 的新任务准入；等待静止或请求取消并取得实际结算。固定旧 runtime binding、开放审批、未知效果和未完事项。准备隔离的新 native session，按获准的来源/任务/工作状态构造输入，记录新 generation 与接手关系，再开放新任务。

不自动重发不确定的外部行动；不把旧审批答复送到新 generation；同一专业工作冲突写入仍通过 Core 的当前版本/权限检查。

旧 runtime 可以保留为历史 reader 或隔离的在途结算者。发生 unknown 时，不允许替代运行自动重演该行动；对有明确隔离证据的无关只读任务可另行允许，不必把整个应用锁死。

替换默认在 Run/新 session 或重启边界发生。原生中途恢复、in-flight fork 和热换模型都不是基础兼容要求。

## 6. 原生 runtime 自带功能的采用纪律

Hermes/OpenClaw 之类候选不只拥有模型 loop。接入评估必须清点其可能自行运行的 scheduler、memory、skill discovery、外发 channel、模型 fallback、自动更新和 HOME discovery。默认 profile 明确启用所需部分，其余隔离或关闭；不能关闭则标成不适用。

上游生成的 memory 或 skill 是其执行资料/候选；要成为 CW 的持久配置或正式工作对象，仍通过对应 owner。不得以“原生自动学习”绕过 CW 的权限和提案版本。

候选生态入口见 [S09/S10](SOURCES.md#s09)。本包未实现或验证它们的 CW adapter。

## 7. 验证标准

换 provider endpoint 只证明 ModelAdapter；同 Pi 上的 fake provider 只证明确定性路径；独立 synthetic executor 证明端口可模拟。**节点二需真实第二执行器，且 Pi 参考 runtime 仍能回退运行。**

比较 task 合法性、来源与作用域、工具/批准/取消/断连/历史解释，不要求两模型给出相同文本、相同工具数量或相同内部轮次。
