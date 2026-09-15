# Claude 串行施工单 · 统一前端与真实 Harness 合流

2026-09-16 · Courtwork。研究基线：`main@f76dd7ec9f6cef845f67360cc0a22768ae309ca6`。本文登记施工顺序、跨面约束与验收；产品代码由 Claude 后续串行交付。实际产品状态仍由 [current](../../current.md) 持有。

> 从一个问题开始，连接明确的材料或仓库，完成获准修改和真实检查，在同一工作面读懂结果，再从保留的工作记录继续。所有界面说同一种语言。

施工记录：[00 接单基线与公共语言](00-intake.md)。后续每片在本目录追加记录并回写原 owner；[current](../../current.md) 只登记最新状态。

## 目录

1. [交付范围与基线](#交付范围与基线)
2. [统一 grammar 与文字收敛](#统一-grammar-与文字收敛)
3. [串行 PR 队列](#串行-pr-队列)
4. [逐片施工合同](#逐片施工合同)
5. [从前端反推后端的登记方式](#从前端反推后端的登记方式)
6. [Prototype 队列](#prototype-队列)
7. [发布面设计](#发布面设计)
8. [组合验收](#组合验收)
9. [已消费的 Index 与选型](#已消费的-index-与选型)
10. [Claude 接单入口](#claude-接单入口)

## 交付范围与基线

### 本单的三条完成线

| 完成线 | 交付物 | 完成条件 |
|---|---|---|
| 真实 Harness | 模型、资源绑定、读搜写、受控检查、运行控制、能力配置与消费、命令、文件/回执呈现 | GUI 意图进入真实 Host/adapter，执行留下可查回结果；刷新、取消、撤权与重启不靠前端补事实 |
| 产品 Prototype | 资源关系、Memory 披露、Attention 组织与更丰富的 Presentation | 隔离的交互原型、固定 fixture、状态矩阵、后端缺口与迁移路径；不接生产写入，不充当 Harness 实现 |
| 发布面 | 更有表现力的 Pages 与可理解的产品故事 | 独立 campaign 设计、真实产品媒体与概念图分源，构建和浏览器检查；不改产品语义，不自动部署 |

Claude 是本单唯一产品 writer，按队列串行修改前后端。开发时可以用 fixture 比较界面；**Harness 卡的交付必须换成真实后端，不接受把 fixture 留在生产路径作为结案方式。** Hook、浏览器/桌面操作、任意 shell、第二 Runtime 等未纳入本单基础集合的能力，继续保留原后续任务，不能画成可用功能。

本单复用 [产品方向](../../product-direction.md)、[五层责任](../../architecture.md) 与 [Runtime/Work](../../architecture-runtime-canon.md)，不新建领域状态、全局 registry 或另一套 agent loop。下列数字只表示本包顺序，不替换 DWB、DF、RD、FE、BE、P/G 原编号。原合同持有功能语义，本包持有施工编排与本次设计要求。

### 已有实现与真实增量

| 面 | 固定基线的依据 | 本单处置 |
|---|---|---|
| Pi / 模型 loop | [Harness 实施包](../../release/harness-implementation-2026-09-12/README.md)、[实际 adapter](../../../app/runtime/pi-session-runtime.mjs)；Pi 三包锁定 0.85.1 | 复用；不重新接一个聊天 demo，不用升级底座代替补齐接缝 |
| MCP / Skill / 本地 Plugin | [Developer 交付](../../design/developer-control-panel-2026-09-13/README.md)、[当前资源覆盖](../../../docs/runtime-control/INDEX.md) | Add/Edit/导入/受信登记与生命周期已有实现，列为真实消费和回归，不按旧缺口重建 |
| 普通免 Project Chat、Recent、Copy/Composer | [current](../../current.md)、[前端连续性规范](../../design/agent-interface-2026-09-10/frontend-contract.md) | 保留现有交付；剩余布局和浏览器覆盖单独完成，不把历史待办全量重新打开 |
| 外部仓库绑定与写入 | [RD-006 最新读写增量](../../research/RD-006-deferred-workspace-binding.md)；current 保留原在途树 | 首先核对并接续在途交付，完成真实 GUI 纵切；远端 main 无法代替本地 worktree 盘点 |
| 检查进程 | [DF-04](../../release/harness-implementation-2026-09-12/harness-dogfooding.md)、[RD-009](../../research/RD-009-trusted-harness-extensions.md) | 本单必须实现；模型写出的测试文件或 Claude 外部执行不算 CW 自运行 |
| Context / 活动行 | [production 交付](../../design/context-tps-motion-2026-09-13/production/README.md) | 圆环与活动行已经接入，复用 `run-activity.mjs` / `chat-measurements.mjs`；不按旧候选重做位置，增量在计量与一致性 |
| 自动 / 手动压缩 | [RD-008](../../research/RD-008-command-compaction.md) | 自动压缩已有实现，做回归；typed command 与手动 compact 是待接真实增量 |
| 公共语义与控件 | [Product Semantics](../../design/product-semantics/README.md)、[现有 facade](../../../app/web/semantic-controls.mjs) | 迁移新增/触及消费者；不再建立一套局部 label/icon map |
| 发布媒体 | [site 合同](../../../site/README.md) | 产品媒体固定来源与当前 main 分开；本单不重开已经验证的部署工作 |

Host15 / Core4 / bridge5 是本次读取基线。迁移从 Claude 开工时的真实版本递增，不机械预定下一个 schema；旧 journal、历史 binding、媒体与证据不改写。

## 统一 grammar 与文字收敛

### 不是统一皮肤，而是统一构造方式

新增面遵循同一条链：**owner 的对象与动作 → 公共语义键 → 读态/控件 → 页面编排 → 视觉与动效**。允许任务所需的布局差异；不允许各页面重新解释保存、授权、运行状态、返回和成果接受。

| 维度 | 本单共同规则 | 原入口 / 最近先例 |
|---|---|---|
| 对象与动作词汇 | 相同语义复用 key、标签、可访问名称与 glyph；不同动作不因外观相似合并。Access、Approval、Review、Question 分开 | `design/product-semantics/registry.json`、`app/web/semantic-controls.mjs`、[文案体例](../../design/copy-convention.md) |
| 读态与状态 | 列表、Chat、Inspector、Preview 读同一对象/版本；unknown、empty、failed、stale 分开；装饰不补进度 | [Atlas](../../design/atlas/README.md)、`thread-projection.mjs`、`presentation-adapters.mjs`、`usage-projection.mjs` |
| 控件与表单 | 复用 action/setAction、Model picker、settingsRow、作用域/偏好控件；保存时点来自服务，不由 switch 的外形决定 | `app/web/ui-controls.mjs`、`model-picker.mjs`、`settings-view.mjs`、`runtime-view.mjs` |
| 配置语法 | 已登记、运行中、已曝光、被许可、下一次有效、本次已绑定、实际使用分开；默认层只露当前任务所需事实 | [Runtime Control](../../../docs/runtime-control/INDEX.md)、[GUI 控制面](../../research/gui-agent-control-plane-2026-09-12/README.md) |
| 导航与披露 | 返回恢复访问位置而非撤销工作；Tab、视图切换、展开、对象命令有各自规则；Escape/焦点返回一致 | [Shell 合同](../../design/shell-control-plane-2026-09-12/README.md)、[对象命令](../../design/object-command-grammar-20260914.md) |
| 排印与密度 | 阅读区、控件区、诊断区按角色定级；共用列边界、间距、圆角、线重和命中区；不靠缩字塞更多信息 | [编排标准](../../design/ui-composition-standard.md)、`app/web/styles.css` |
| 图标、材质与 motion | 复用当前已登记原生 SVG 与 token；图标表达对象/动作，材质表达层级；motion 只反馈真实变化 | [UX Grammar](../../design/ux-grammar.md)、[Atlas](../../design/atlas/README.md)、[连续性规范](../../design/agent-interface-2026-09-10/frontend-contract.md) |

每片开工只在原变更记录写明：**最近先例、复用的语义键/primitive、有意变化、相邻消费者、验收证据**。确有 grammar gap，先在现有 owner/Atlas/registry 补一处定义，再实现并迁移相关消费者；不新建“统一设计框架”，不逐页面复制规范。

旧文档可能保留不同时间的 `Allow this write` / `Approve this write`、`Cancel run` / `Stop working` 等措辞。Claude 在 00 中定位活动消费者与覆盖关系，以当前语义注册和适用 owner 裁决收敛，给旧活动入口补替代指向；不把历史原件全局替换，不按一篇旧 Index 恢复已淘汰文案。

### 默认表面只留下需要读的内容

| 文字层 | 保留内容 | 位置 |
|---|---|---|
| 主任务层 | 对象名、内容、必要状态、当前动作；操作所需范围/版本/后果；阻塞与恢复办法 | 当前对象和动作附近 |
| 上下文层 | 已完成工具、次要配置、来源摘要、比较依据、可恢复的过程细节 | 原位 disclosure 或同对象 Inspector |
| 诊断层 | 完整 ID/hash、原始事件、adapter/config revision、协议及调试细节 | 有名称、可寻址的技术详情，不在默认行逐项平铺 |

删掉重复标题、重复状态、装饰性 eyebrow、解释页面自身的短句、同一事实在组说明和对象行的重复出现。默认不为每条记录加 subtitle，不为成功结果再叠一条泛化 Success toast。用户自有正文和来源内容不为凑页面字数而删节。

**减字不等于减事实。** 精确授权的目标与后果、冲突前后版本、unknown 原因、失败和需要人决定的内容不得藏到 hover；完整 ID/hash 可进入详情，但动作仍绑定原值。不能用更浅的灰、更小字号、无标签 glyph 或无限截断代替收敛。

Copy、状态反馈和错误文案与组件一起施工，不留到最后统一润色。每片附一个同屏对照：默认层删除了什么、移到哪里、哪项必须保留；不采用全站统一字数上限。

### 跨面“一手”验收

以一套合成工作分别打开 Home、Chat、Preview、Review、Settings、Runtime 和 Attention。比较同类对象行、动作区、状态、空/错态、弹层、返回路径、代码块和文字密度。不能只凭每个组件的孤立截图通过。

共享 primitive 的改动同时检查最近相邻消费者；小改动不触发无关全站重测。需要新变体时说明它服务什么任务，并证明不是另一个同义组件。Pages 可扩大表现幅度，但产品内的对象名、动作含义与嵌入产品标本保持一致。

## 串行 PR 队列

| 顺序 | 原任务 / 工作面 | 本片输出 |
|---|---|---|
| 00 | 接单 / UX continuity | 在途盘点、共享 grammar 映射与本轮固定场景；不先大重构 |
| 01 | DWB-01/02 | 仓库连接、读取、撤权与 GUI 状态 |
| 02 | DWB-04 | 精确授权的真实仓库写入、差异与故障结算 |
| 03 | DF-04 / RD-009 | Host 固定检查 recipe、真实进程、取消后结算与工具卡 |
| 04 | Chat Flow / Run surface | 单 Run 聚合、流式阅读、权限插入、最终答复和恢复 |
| 05 | Models 原 PR | Composer→模型配置→原草稿返回；真实 effort 保存与绑定 |
| 06 | Runtime R4/R5、BE-6/7 | 既有能力真实消费回归；声明式 Skill 提案→人审→下一 Run |
| 07 | CMD-01 / CMP-01 | typed command 与真实手动 compact，分两个可验提交 |
| 08 | Review / Presentation 原线 | 文件差异、检查回执、facts 的 Host→Chat→Preview 纵切 |
| 09 | FE-NAV / Object Command | 返回前进、对象更多菜单与原命令复用 |
| 10 | BE-42 / Telemetry P1 / Chat polish | Context/活动/用量的真实投影与跨面文字、代码阅读收敛 |
| 11 | 原 DF / P / G 与 UX 验收 | 单一候选提交上的真实工作闭环、失败路径及跨面一致性 |
| 12 | RD-007 / Memory / Attention / Presentation | 独立 Prototype 与后端缺口登记，不扩大 Harness 完成声明 |
| 13 | PS / Pages | 更激进的发布面设计及新媒体采集候选，不自动部署 |

01→02→03 接续 current 已指定的 RD-006→DF-04 顺序。00 只是必要接单，不以设计系统重建阻塞它们。各片完成代码、定向检查及文档回写后再改下一片；原卡有非作者门时照原门执行。不得把本地 Claude 的工作树操作算作 CW 产品能力。

## 逐片施工合同

### 00 · 基线与公共语言

读 AGENTS/current，记录 cwd、branch、HEAD、dirty paths 与 worktree 清单；定位 RD-006 原在途树，按来源提交/补丁与原 owner 接续，不重置共享 checkout，不另做重复实现。

读取 [UX Grammar](../../design/ux-grammar.md)→[frontend contract](../../design/agent-interface-2026-09-10/frontend-contract.md)→[precedent map](../../design/agent-interface-2026-09-10/precedent-map.md)，仅展开当片的相关先例。用同一合成仓库、同一长 Chat、同一权限卡和同一 Settings 配置制作贯穿本轮的场景；历史 golden 不自动升级为新基线。

本片退出：每个待改工作面有可定位的 owner、现有 primitive 和缺口；已交付项去重，当前原型与真实功能分清。无新增通用 registry、状态机库、UI 框架或大规模目录迁移。

### 01 · 连接并读到真正的仓库

承接 [RD-006](../../research/RD-006-deferred-workspace-binding.md) 与 DWB 原 PR，写入由 Runtime service/store 持有；前端复用 Home/Chat Access 与对象/弹层 primitive。

完成 Connect repository、路径校验、已连接范围、读取失败、断开/撤权。Project 归属、外部资源 binding、managed cwd、Access 分别表达；普通提问无须选目录。浏览器不能提供 Host 目录句柄时使用明确的 Host 路径输入，不伪装上传为挂载。

`repo_list/read/grep` 在访问点重验授权、root 身份、相对路径与 binding revision；源回执保留精确路径/hash/Run 归因。下一 Run 固定 binding，活动 Run 不热换 cwd。撤权阻断后续调用；刷新不能凭旧本地选择恢复“已连接”。

验收：无绑定、连接成功、失败/失效、撤权、symlink/root 替换、跨会话、重复请求/旧 revision、刷新和重开。读取后的资料能从 GUI 回到对应来源。改动候选为 `app/server/service.mjs`、原 store、`app/runtime/` 与现有 Home/Chat 接线，精确写权以在途成果核对后登记。

### 02 · 写入必须是真实效果

沿 DWB-04 外部写入合同，保持 `ws_*` 托管成果与 `repo_*` 外部资源工具分开。`repo_write` 绑定目标、预期前态 hash、新内容 hash、binding revision 和精确批准；冲突拒绝，不能覆盖后再解释。

GUI 用同一 Approval 语法展示目标、变化及后果；返回后可打开精确 diff。写入效果与模型自述、检查结果、Core 接受分列。prepared/确认结果/unknown 沿原效果 owner 持久结算；重启核对实际前后态，不自动重放未知写入。

验收：Read only 拒写；Ask 精确批准/拒绝；允许编辑仍限绑定范围；批准后修改源、撤权、重复/迟到回执、kill/restart 均不产生误覆盖。平台路径竞态与提交边界按 RD-006 证明，不能把普通先检查后 rename 宣称原子 CAS。删除、移动、任意命令不搭车加入。

### 03 · 从产品里执行检查

承接 [RD-009 的 DF-04 合同](../../research/RD-009-trusted-harness-extensions.md)。首消费者为隔离合成 coding 仓库的一个受信 Host recipe；模型只选 recipe ID 和允许输入，不提交任意 command/argv/cwd/env。

复用工具注册、exposure、policy、精确批准和 Run/call 身份；独立 ask/deny 上限不因注册而向全局开放。Host manifest 固定版本、执行入口、位置、输入版本、环境、超时和输出限额。子进程不继承 provider 密钥与任意启动环境；普通子进程不称 sandbox。

UI 的折叠工具行→结果详情展示真实 exitCode/signal、stdout/stderr、duration、truncated 和结算结果。取消后结算独立于可能已关闭的普通 tool 事件准入；确认进程/进程组退出才称已停止。缺回执显示 unknown，不能自动重试可能已执行的调用。

先验证成功/非零退出、Deny 零执行、超时/超输出、取消、回执丢失/重启不重放、下次 Run 挂起与恢复；再用获准的真实模型从 GUI 发起一次检查。Claude 在自己的终端运行测试只属于开发验证。

### 04 · 让真实长 Run 保持可读

消费 [Run surface 原 PR](../../design/chat-flow-2026-09-10/run-surface-pr-20260914.md)。最近先例为 `thread-projection.mjs`、`user-message.mjs`、`chat-actions.mjs`、`app.mjs` 及 followLatest。

一条用户输入对应稳定的 Run 工作面；中间叙述与工具聚合，已完成过程默认折叠，等待授权、失败和当前活动可发现。中间片段不重复普通消息 footer；确有 final 才展示最终答复。取消/失败/unknown 保留部分内容，不把最后一段叙述冒充 final。

稳定身份增量更新，保持选择、展开、键盘焦点、滚动及代码块完整性。用户时间在气泡所属 footer 右侧，不按全屏右缘对齐。Chat/Attention 共用该解剖；不复制第二套运行卡。

Stop 发真实 cancel；请求在途、Host stopping、确认终态分开。刷新/重连读取原 Run，不自动重发。SSE/long-poll 仅在定位传输缺口后另片实现；动效不冒充实时性。宽泛“Allow edits for this run”不混入本片，继续原独立授权合同。

### 05 · 模型配置与 effort 的短路径

完整消费 [Composer Models 原 PR](../../research/models-provider-registration-2026-09-14/composer-pr.md)。复用 `createModelPicker`、provider-config、Settings Models 和 adapter 能力，不复制配置表单。

Composer 能直达对应连接，返回恢复 Chat、草稿、附件和焦点；导航不触发模型调用。effort 快选取真实能力枚举，不硬编码六档或连续算力滑轨；Provider default 是省略参数，不是最低档。unknown/unsupported 和失效旧值有明确恢复路径。

保存遵守现有 scope 和活动 Run 冻结；控件靠近 Chat 不意味着配置变成 Chat-local。验证 Host 已存值、下一 Run binding 与实际编码一致；失败/迟到回执不覆盖新选择。用两组不同能力 fixture 加一个受支持真实组合验证，不承诺所有 Provider。

### 06 · 能力管理必须被下一次运行真正消费

复用 [已交付的 MCP/Skill/Plugin 面](../../design/developer-control-panel-2026-09-13/README.md)。首段只补缺口和回归：一个 MCP 连接的发现/曝光/批准/调用；一个 Skill 或 Instruction 的导入、来源查看、load/admission；一个本地受信 Plugin 的 Load/Unload/重启事实。记录实际 Binding 与 used，不把 Save 当作已启用。

第二段接 [声明式 Skill 提案原片](../../research/gui-agent-control-plane-2026-09-12/skill-proposal-slice.md)：Agent 产生提案，Host 保留 Proposal 及精确版本，人看 diff 后 Apply/Discard，下一 Run 才消费。Agent 文本“已创建”不能直接进入 installed list，模型不得替人 approve/apply。所需事务、current pointer/fail-back 与独立 proposal revision 按 BE-6/7 原合同实现；只完成 proposal/apply 子片时不关闭完整 BE-7。Rollback 若在本轮实现，作为新的 CAS 人类请求，不倒退全局 revision 或恢复旧权限。

正常列表只露名称、必要状态和主要动作；Source/Requested/Effective/Bound 的完整解释进同对象详情，授权范围和变更后果留在动作旁。采用现有 Settings 布局，不新建四个等权顶级管理器。

Hook 的第一真实消费者、视觉/浏览器/桌面操作、完整包安装器和有界 subagent 沿 RD-009/RD-005 分别登记后续纵切。本片不以假开关、假连接或模拟执行填满这些栏目。

### 07 · 命令与手动压缩，不把字符串送给模型碰运气

消费 [RD-008](../../research/RD-008-command-compaction.md)，拆 CMD-01、CMP-01 两个可回归提交。

CMD-01 用 Host discovery/dispatcher 提供 read/client_ui/setting 行为；`/status` 零普通 Run、零模型请求，`/model` 复用 picker。unknown、shadow、旧 discovery、撤权和参数错误不能静默 fallthrough；明确 literal escape/绝对路径输入。`Run.commandId` 仍是幂等键，不拿来存命令名称。前端菜单与 slash 同源，不维护第二份命令数组。

CMP-01 只在 idle Session 的共享 admission 中运行 native compact，不隐式 abort 活动 Run。持久化操作 ID、查回、预算、失败/取消/unknown 与 journal 顺序；ACK 丢失先查回，不能重复付费压缩。压缩前后 provenance、真实 usage 与估算分开；不改用户历史、Core 记录或权限。自动压缩按既有合同回归，不重新实现 summarizer。

### 08 · Preview 与检查：四种来源不混成一个绿色结果

沿 [产品方向的呈现分源](../../product-direction.md)、[Presentation Gateway](../../research/review-surface-2026-09-09/presentation-gateway-20260915.md) 及 [多源投影增量](../../research/review-surface-2026-09-09/projection-runtime-20260915.md)施工。

把模型说明、Host 实际文件变化、检查进程回执、Core 正式决定放在可组合但来源明确的阅读面。原件、记录版本和当前版本可区分；打开当前文件不改写历史检查所依据的版本。优先 Files/diff/Inspector 与现有 renderer，不另建一个“万能 Review”。

facts 最小纵切必须真实：获准提交→Host 校验/持久回执→Chat inline→同 instance/version 的 Preview→重开恢复；有文本 fallback。系统命令、资源预览、提问/授权/接受保持原 handler，不全塞进模型 Presentation Gateway。

新 wire 先冻结 instance/part/source/version、顺序、预算、重复/迟到及取消后处理。无任意 HTML/JS/Mermaid 执行。chart/flow 和受限组合的丰富表现先入 12 的 Prototype，不能凭 renderer 存在宣称后端已消费。

### 09 · 返回与对象命令共同语法

沿 [FE-NAV](../../design/shell-control-plane-2026-09-12/README.md) 和 [Object Command](../../design/object-command-grammar-20260914.md)。建立最小跨对象 location/history：对象身份、view、需要恢复的滚动/焦点/草稿引用；Back/Forward 不动 Run、绑定或决定。不存在/撤权对象显示恢复去向，不回退成另一个看似相同的对象。

Project/Chat/Recent 的右键、更多与 inline 共用 command descriptor/handler。可显示条件和当前可执行条件分开；只接真实 capability，不用菜单承诺尚不存在的删除/迁移/批处理。触屏与键盘可走等价入口。

通知中心等待真实已读/去重 owner；不把 toast 或 Attention 队列复制为第二账本。本单导航可真实交付，通知的交互比较进入 12。

### 10 · 观测与阅读面的最终收敛

消费 [Telemetry P1](../../design/context-tps-motion-2026-09-13/telemetry-p1-20260914.md)、[Context/TPS 方向](../../design/context-tps-motion-2026-09-13/README.md) 和 [Chat polish 原片](../../design/chat-flow-2026-09-10/polish-slices-20260914.md)。

复用 [production](../../design/context-tps-motion-2026-09-13/production/README.md) 的 `run-activity.mjs` / `chat-measurements.mjs` 及已采用位置：Context 在 model/effort 与 Send/Stop 之间；不恢复旧左侧候选。圆环/细节和活动行只使用同口径、同身份的数据。缺容量/速率不给伪百分比或 decode TPS；估算、Host 首输出、provider usage 与 cache provenance 分列。终态/断线不继续动画；reduced-motion 有静态形态。现有 Usage 日历/模型下钻复用，小时矩阵及新归因无数据不填色。

代码阅读覆盖 inline 与 fenced 两类：边界、对比、溢出、选择/复制、长中文混排及明暗；不只修一个 selector。保留已交付 Copy/Composer 行为，修的是当前剩余问题。App 不新增局部字体/颜色/token 方言。

最后跨 Home/Chat/Preview/Settings/Runtime/Attention 做一次默认文字层审阅；每处重复文字在源头收敛，而非藏在小字号和 tooltip 中。

### 11 · 同一候选提交的真实合流

按下节组合验收记录一条真实成功路径、一条取消路径及一条版本/授权失效路径。全部使用同一候选 SHA 和独立数据；不同切片的旧截图不拼成“整版已验”。Claude 作者自检、非作者复核、人类判断分列；沿原 Gate 逐项记证据，不以文档登记或一次成功全关 G1–G5。

### 12–13 · 产品探索与发布面

分别按后两节执行。先形成基础真实闭环，再做本单隔离 Prototype 和 campaign。它们可消费相同 renderer/词汇，但不反向改变已闭合的权限、正式状态和运行事实。

## 从前端反推后端的登记方式

前端可以首先揭示缺口：按钮需要什么命令、卡片需要什么状态、返回需要什么身份、图表需要什么口径。缺口直接写回原功能 PR，不另造公共状态总表。

| 每个缺口必须回答 | 登记内容 |
|---|---|
| 用户结果 | 人在什么对象上完成什么动作；默认面需要看见什么 |
| 事实与写入 owner | 现有 service/store/adapter 或 Core；字段是否已存在、谁能变更 |
| 最小读写合同 | 读 projection、typed action、对象/scope/revision、capability 与错误；候选字段明确到原合同冻结 |
| 生命周期 | pending/终态由谁产生；重复、迟到、撤权、取消、重启/丢 ACK 怎么查回 |
| 前端消费 | 复用哪个 grammar/primitive，在哪里浮现，如何失败、返回与保留草稿 |
| 验收与迁移 | 一正例、一反例、真实接缝、所需迁移及 fixture→Host 切换条件 |

对 Harness 缺口，本单实现最小后端后才能合入可用控件。对 12 的产品探索，可以先做无生产能力的 fixture adapter；后端 DTO 明确前不把示例 JSON 变成公共 ABI。不能为一个进程、一个面板或一种图表创建新的总线、总 registry 或通用 DSL。

## Prototype 队列

这些是可运行交互原型，不是只画一个理想终态。放在与生产入口隔离的原型宿主或原有 specimen 目录，复用真实 primitive/renderer，不连接生产写 API、不带真实凭据。开发入口明确 Prototype；公开概念展示的来源身份写在媒体清单，不在每张卡上铺保护性文字。

| 原型 | 消费来源 | 完成交互 | 反推的后端缺口 |
|---|---|---|---|
| 资源与 Notes 的工作阅读面 | [RD-007](../../research/RD-007-resource-governance.md) | 列表→来源/版本 Inspector→exact preview→关系返回；metadata-only、失效、不同 owner 的产物可区分 | Resource/Note 稳定 ID、revision、relations、引用权限、跨 owner 保存/查回 |
| Memory 的保留/召回/激活 | [Memory 增量](../../research/chat-memory-broker-2026-09-12/attention-governance-20260915.md) | 解释一项材料为何被选/未选，当前适用与历史版本切换，归档与恢复的交互 | 检索/适用性与抑制解释、policy、查询覆盖；不把归档当物理删除 |
| Attention 的跟进与结果消费 | [异步 Attention 参考](../../research/spark-explore-2026-09-13/async-attention-20260915.md) 与原 Attention 合同 | 待判断列表→对应结果/依据→返回原位置；比较已读与工作处置的不同反馈 | notification read/dedupe、结果消费关系、义务 owner；不把研究草案直接升为状态枚举 |
| chart / flow / 受限组合 | [Presentation Gateway](../../research/review-surface-2026-09-09/presentation-gateway-20260915.md) | 一个 chart、一个 flow、一个 facts+chart/flow 组合；inline↔Preview、选择/筛选/返回、窄屏降级 | spec/catalog/renderer 版本、受权 dataRef、预算、fallback；图中 Approve 不产生授权 |
| 能力关系的只读视图 | [GUI 控制面](../../research/gui-agent-control-plane-2026-09-12/README.md) | 用同一合成资料比较列表+Inspector 与关系视图；区分配置/允许/实际调用边 | 真实关系类型和 trace 归因；不画可运行的虚构 Harness 拓扑 |

每项交付固定 fixture、状态转换、完整场景、文字层对照、原 owner 缺口和迁移条件。外部选择来自 Scout→成熟先例→本地 specimen；最多比较三个有结构差异的候选，不做海量 moodboard。无独立用户价值的图谱删掉，不为图形丰富而增加常驻面板。

## 发布面设计

### 方向：更有张力的 Archival Instrument

保留 CourtWork 字标、文书/版本/接续的母题和产品语义，允许重排首屏与全页叙事。视觉强度来自大字阶、留白、尺度反差、真实产品片段和阅读节奏，不来自更多解释卡片。

主叙事采用 **开始问题 → 连接材料 → 看见工作 → 检查依据 → 回来继续**。首屏只承担定位和一个主要入口；后续章节把真实工作逐步展开。产品架构退到可选深层，不在首屏平铺五层术语。

Claude 在现有 campaign 源中比较两个局部方案后选一：一是纸面/索引式编辑布局，以版本与旁注组织真实产品大图；二是留白更强的产品舞台，用一段可暂停、可逐步浏览的离线真实工作回放承重。不是两套完整网站，不重画另一套 App。选择与淘汰理由记录到原 PS/design decision。

### 消费路线与实现

依 [Design Scout](../../design/scout/README.md)：Unsection / Navbar Gallery 只用于站点 section；One Page Love/recent.design 用于全页节奏；60fps 只取运动关系与时序。优先消费已有选择；需要补查时，每个开放问题做一次有界 section sweep，回到产品官方先例。不得把站点导航样式直接移入 App，不能下载/照搬他人素材。

写权候选为 `site/src/site.css`、`site/src/copy.mjs`、`site/src/product-pages.mjs`、`site/src/product-interactions.mjs` 与原页面构建入口。沿 [site/README](../../../site/README.md) 的 campaign 隔离、产品标本来源守卫、base path 和现有字体/资源策略。根 README 若需同步，从 `site/src/readme.mjs` 生成，不能手改生成结果。

真实运行截屏绑定新产品 SHA；旧媒体保持原 manifest。概念图、离线回放和新截图分源，不把原型的美化结果标成已经运行的 Harness。故事可提前表达下一节点，不编造用户数、速度、客户、执行结果或验收。

动效可更大胆，但不劫持滚动、延迟读正文或强迫等待；键盘/触屏与 reduced-motion 下仍完整。允许 campaign 独立材质和字阶，不改产品语义 token，不把 blur 施加到正文和关键动作。Pages 这一片交付构建、预览与发布候选；实际部署另按明确授权执行。

## 组合验收

### 一条主路径，三组决定性反例

**主路径：** 无 Project/目录也能开始 Chat → 按任务连接隔离合成仓库 → 读取确定 bug → 精确授权修改 → 从 CW 调用真实检查 recipe → 打开变更与检查回执 → 关闭/重启 Host → 重开原 Chat 并继续工作。

| 反例 | 必须看见的结果 |
|---|---|
| 取消与迟到 | 工具/进程在运行时请求停止；进程组最终状态有独立结算；部分输出可读；迟到成功事件不把 cancelled/unknown 伪装成完成 |
| 版本冲突与撤权 | 批准后原文件改变或资源被撤权；执行拒绝，GUI 保留原意图并说明冲突；不默认重新批准/覆盖 |
| 重试与恢复 | 丢 ACK、刷新或重启后用原操作身份查回；不重复写入或付费调用，历史 binding 不由当前配置重算 |

另做一个有真实来源/版本的成果检查路径；需要 Core 正式接受时走原 Candidate→Decision→Artifact，不把测试 exit 0 当作接受。Spark 已有准备结果可进入此路径，独立后台 Provider/调度器不是本单前置。

### 证据各自承重

确定性 fixture 证明状态与前后端合同；真实进程证明执行与取消；真实模型 Run 证明指定组合从产品发起了任务；浏览器证明布局和交互；人类决定与非作者复核各自记录。测试类别不互相替代。

按实际影响覆盖 1440/1280/390、跨断点场景、明暗、键盘/IME、长文本/代码、真实 200% zoom；修改三栏关系时加 ≥1680。motion/material 变更补 reduced-motion、forced-colors 与相关透明度回退。截图保留实际视口和缩放事实，不把 resize 或大字号冒称原生 200%。不要求每个按钮重复全矩阵，组合候选对共享模式完成一次覆盖。

### 复用检查入口

```sh
# 文档与已有公共语义
node tools/check-doc-links.mjs
node tools/product-semantics.mjs
node tools/check-semantic-consumers.mjs
node tools/check-product-copy.mjs

# UI 按实际改动选择
node tools/lint-interaction.mjs
node tools/lint-colors.mjs
node tools/lint-shapes.mjs
node tools/lint-materials.mjs
node tools/contrast-report.mjs

# 定向 node --test <实际测试文件> 后，在集成候选执行
npm --prefix app run check:product

# Pages 片
node site/build.mjs
node site/scripts/check-links.mjs
node site/scripts/check-material.mjs
```

按 [verification](../../verification.md) 选择检查；完整历史和依赖须满足仓库既有前提。只有有新变化/新失败风险才重跑全量，不替换已接受截图掩盖回归。真实模型仅使用用户已配置且授权的范围；本登记本身不授权读取凭据、迁移个人数据或新增外发。

每片回写原 owner 的状态、实现提交、检查结果、未完项和证据范围；`current` 只作最新状态入口。对受影响的支持清单、schema/迁移文档、public claim 和媒体清单同步，不为无关条目重做台账。Paper pin 不随本单修改。

## 已消费的 Index 与选型

以下是本单实际定点读取后采用的入口；历史索引中的“待实现”须服从该 owner 后续交付，不据旧索引重开工程。研究基线统一为文首 SHA。

| 问题 | 本地入口 | 本单采用 / 去向 |
|---|---|---|
| 产品责任和下一节点 | [product-direction](../../product-direction.md)、[architecture](../../architecture.md)、[current](../../current.md) | 工作闭环优先；RD-006→DF-04；正式/执行/呈现分源 |
| 通用界面语言 | [UX Grammar](../../design/ux-grammar.md)、[连续性规范](../../design/agent-interface-2026-09-10/frontend-contract.md)、[precedent map](../../design/agent-interface-2026-09-10/precedent-map.md) | 每片按 nearest precedent 施工；不新建规范体系 |
| 语义/词汇落地 | [Product Semantics](../../design/product-semantics/README.md)、[facade 源码](../../../app/web/semantic-controls.mjs)、[Copy](../../design/copy-convention.md)、[Composition](../../design/ui-composition-standard.md) | 公共 key 与已有检查；默认文字层收敛 |
| 形态与来源消费 | [Atlas](../../design/atlas/README.md)、[Scout](../../design/scout/README.md)、[Scout digest](../../design/se-control-one-shot-2026-09-11/scout-digest.md) | assistant-ui/AI Elements 取解剖，APG/Base UI/React Aria 取行为，60fps 取 motion；不引入整库 |
| 真能力/旧缺口去重 | [Runtime Index](../../../docs/runtime-control/INDEX.md)、[Developer 交付](../../design/developer-control-panel-2026-09-13/README.md)、[Harness 实施](../../release/harness-implementation-2026-09-12/README.md) | 既有 MCP/Skill/Plugin 复用；真实消费而非表单数量 |
| 仓库与检查 | [RD-006](../../research/RD-006-deferred-workspace-binding.md)、[DF](../../release/harness-implementation-2026-09-12/harness-dogfooding.md)、[RD-009](../../research/RD-009-trusted-harness-extensions.md) | 01–03；不把 cwd、工具和 sandbox 混为一谈 |
| Run 与模型 | [Run PR](../../design/chat-flow-2026-09-10/run-surface-pr-20260914.md)、[Models PR](../../research/models-provider-registration-2026-09-14/composer-pr.md)、[Pi 源码](../../../app/runtime/pi-session-runtime.mjs) | 04–05；真实状态、配置与能力枚举 |
| 能力提案与命令 | [GUI Control](../../research/gui-agent-control-plane-2026-09-12/README.md)、[RD-008](../../research/RD-008-command-compaction.md) | 06–07；提案/配置/执行分开 |
| 多源可组合呈现 | [Gateway](../../research/review-surface-2026-09-09/presentation-gateway-20260915.md)、[Runtime Projection](../../research/review-surface-2026-09-09/projection-runtime-20260915.md) | 08 真实 facts；12 更丰富交互 |
| 位置与观测 | [Shell](../../design/shell-control-plane-2026-09-12/README.md)、[Object Command](../../design/object-command-grammar-20260914.md)、[Telemetry](../../design/context-tps-motion-2026-09-13/telemetry-p1-20260914.md) | 09–10；返回不是撤销，图形不是测量 |
| 资源/Memory/Attention | [RD-007](../../research/RD-007-resource-governance.md)、[Attention 增量](../../research/spark-explore-2026-09-13/async-attention-20260915.md) | 12；只做有明确消费目标的原型，参考草案不升为新 schema |
| 发布与验证 | [site](../../../site/README.md)、[verification](../../verification.md) | 11/13；新媒体/旧证据分源，产品/部署分开 |

2026-09-16 补核两项已登记体系中的官方行为依据：[WAI-ARIA Tabs Pattern](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/) 用于键盘/激活方式；[VS Code Contribution Points](https://code.visualstudio.com/api/references/contribution-points#contributes.menus) 用于菜单可见条件与命令 enablement 的区分。它们提供行为参照，不提供 CW 授权、后端状态或新的 UI 技术栈；本轮不宣称重新核验全部历史 donor。

## Claude 接单入口

读取本包、AGENTS 与最新 current，先对账原 RD-006 在途树，然后按 00→13 串行推进。每片只打开对应 owner、最近实现和必要 Explore/Design 来源；已有实现按实际证据复用，不从旧待办重建。

每个 Harness 控件都要沿真实服务完成读写和查回；每个新增局部面都要继承共同语义、控件、编排与文字层。原型放隔离入口，未来后端缺口写回原 PR。遇到可逆的本单内局部选型直接完成并记理由；涉及新增权限、正式状态或超出当前架构边界时保留具体反例交回裁决，不能悄悄扩大。

本单结束时交付一条可重开的真实 Harness 工作路径、一套如出一手且文字收敛的产品工作面、一组有后端接续条件的 Prototype，以及一个更有表现力的 Pages 发布候选。
