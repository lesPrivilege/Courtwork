# HPR-03 · 有限的自足节点与后续决策树

## HPRO-0022 · 稳定节点的完成定义

不是“复制成熟 Agent 全部能力”，而是**明确支持范围内，每个入口有真实执行、权限、持久结果、错误、取消与恢复**。按 S01/S11 保持模型与工具层、工作效力层、GUI 三者可区分。

建议冻结的范围：Pi 0.85.1 的当前两类 wire format/已支持连接；普通 Chat 与可选 Work；现有文件读写/grep/ask；手动或授权 workspace skill intake；已支持协议的 unauthenticated HTTP MCP；有界网页读取；多级指令/有效输入快照；可编辑 scoped memory 与明确的 context-reset；已有 usage/诊断。任一子项没完成就公开收窄，不让 planned 按钮冒 ready。

明确后置：任意 shell/OS sandbox、浏览器自动化、Google/其他 OAuth、MCP stdio、plugin marketplace、任意脚本安装、自动 scheduler、多 runtime 平台、第二 transcript/通用 memory database、Windows 支持、Rust 全面重写。这些不是本节点的隐含承诺。

| Gate | 必须证明 | 最小证据与失败判定 |
|---|---|---|
| G-H1 基础任务闭环 | 选模型→读取→用skill→ask→获准写→展示输出/usage/来源 | 清洁依赖、固定synthetic inputs、实际fake-provider wire+GUI交互。仅保存配置或截图不算闭环 |
| G-H2 权限与输入 | 指令来源/完整有效snapshot、越scope拒绝、批准绑定原call、无隐藏HOME/key读取 | wrong session/callId/hash、跨项目、source prompt injection、read_only与network外发区别、old审批晚到 |
| G-H3 MCP/网络 | 完整catalog、有界内容、正确效果unknown、拒私网/redirect、cancel后不publish | 真实安装SDK/Node传输的隔离fixtures；本包VM桩不足以关闭此门 |
| G-H4 取消/重启/命令幂等 | 用户cancel、预算、断线、进程kill后不误报成功/不重复外部动作 | 同commandId、pendingconfig、nativejournal缺席、每个命名写窗口、terminal receipt。断网≠操作没发生 |
| G-H5 memory/context | current/next/historical准确；关闭自动注入与clean-context分别兑现 | 在旧消息和summary中种sentinel；reset后实际请求不含旧项；旧Chat历史仍可有权阅读，开放义务不丢 |
| G-H6 Core 可选/正式工作 | pure Harness不构造Core；Core不可用时Chat可用而绑定Work明确失败 | 不偷启动旧producer；正式成果/来源/决定可独立读；candidate不被Run complete自动接受 |
| G-H7 备份恢复 | 停机全量备份可按支持坐标恢复；原版本代码/数据配对 | 缺credentials/control/journal/inputs/Core任一类即失败；合成key；不可将目录随意搬迁支持混入此门 |
| G-H8 独立复核/真实体验 | 作者与复核者分列；产品范围真实provider纵切另有授权receipt | 本次未跑真实provider，不关闭G1–G5。无法授权可标工程fixture节点，不能叫真实模型产品接受 |

以上 G-H 是本报告的验收分组，**不重命名或覆盖仓库既有 G1–G5**。每组映射到原 gate 和具体测试 ID，由本地集成者入账。必须保留 not-run、blocked、failed；不能把 unknown 通过平均分冲淡。

### 双轨验收

确定性轨：工具/来源版本/权限/恢复/GUI合同，以冻结 oracle 的合成材料验证。模型轨：同一任务在明确版本、配置、工具和预算下运行，记录质量、实际tokens/cache/计费、review与修正时间。没有实际cache统计就unknown；不以host首输出代称provider TTFT。

独立质量和安全门先于节省tokens。沿原 S11 的强基线，不以缺搜索、缺正常handoff的raw chat作为唯一对照。跨事件合成时间线不是跨周真实采用，参考函数10/10不是长期收益或PMF。

## HPRO-0023 · 自足节点之后的决策树

**换 provider 还是换 runtime？** 只需更多模型/认证时，先看 ProviderDriver/connection 能否满足，不动执行/工作状态。确实需要另一整套 native session/tool loop，才单开第二 adapter。

**第二 adapter 首选验证对象。** 沿既定决策采用 Codex App Server 的稳定可用子集，先FakeRuntime符合性再真实adapter。逐项验证start/stream/approval/interrupt/terminal/history/auth/usage；native thread不能直接复用为CW Thread，experimental dynamic tools未验证就unsupported。原生TUI/browser DOM不是控制面的替代协议。第二adapter失败只收窄兼容声明，不迁Matter来迁就vendor。[S08–11、U02、W01]

**SDK/RPC 与外部 agent。** 只有真实第二进程/语言消费者需要才开放RPC；外部agent消费CW从已认证、有限额/分页/错误不泄漏的read-only API开始。连接协议没有赋予决定/外部效果权限。capture导入为Source/外部conversation ref，不自动变成CW native Session。

**Rust 条件。** 先量出可归因的CPU、内存、启动、存储/解析/IPC或分发负担，再决定哪个边界值得替换。先冻结state/port/恢复测试，单独替换一个worker或hot path，不把GUI、store、runtime、数据格式同时重写。数据目录在本地不等于全部依赖/模型外发已主权可控。

**自研 Spark/Attention。** 原有跨Matter/治理/有限attention的方向保留；复杂调度、蒸馏和衍生重建收益按原benchmark逐项证伪。没有净收益则删除或缩小派生层，不用更多架构补救未经验证的产品假说。

## HPRO-0024 · 开放项与明确停止边界

本轮可直接进入本地裁决的事项：MCP两项补强；Pi/Work最小接缝；input snapshot；已有control上的prompt/memory能力；有界web与skill；有限稳定门。没有必要等待“全面runtime平台”或“Rust重构”再开始。

仍须在对应工单中补证，而不是本轮默认放行的事项：完整service方法/路由清单；真实MCP SDK的两协议分页路径；网络传输/DNS/IP规则与新parser依赖的pin、license、安全/大小反例；next schema分配与本地main差异；浏览器真实DOM回归；真实provider授权与纵切；正式retention/purge策略。每项已分别进入P00/P01/P05/P08/P09/P11/P12的停线条件。

这些未决点不授权施工者扫描个人HOME、读取已有credentials、调用收费provider、推remote main、部署或发真实外部消息。测试全部采用临时、合成、明确隔离的数据，真实体验另走用户明确授权。
