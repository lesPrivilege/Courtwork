# Attention Assistant：局部选型与下一动作索引

日期：2026-09-09。核对基线：Courtwork `main` / `683b6d1419242bd08d20b7deec77ce12af7dcf12`。这是将外部实践压缩为可复查候选的研究索引，不是新 API、schema、runtime 或产品验收决定。来源等级和未检项见 [`source-index.md`](source-index.md) 与 [`verification.md`](verification.md)；当前裁决见 [`adjudication.md`](adjudication.md)。

## 选择原则

这轮只消费有明确机制的局部，不复制任一项目的整体 ontology。外部 signal 是 evidence，不携带本地 authority；star、reply、activity、关系数量都不是 Attention 的目标状态。每项选择必须能回答四个问题：它解决哪一个边界、证据读到了哪里、Courtwork 借什么、还有什么没有证明。

研究中的基本循环保持为：

```text
Discover → Inspect → Disclose → Compile → Execute → Review → Commit
```

`Memory` 在这里表示被治理且可寻址的状态空间；`Context` 是按 `role × task × attention × policy` 对该空间的一次临时编译。全量可寻址不等于全量进入模型上下文，也不等于任何角色可以看到 registry 的全部存在性。

## 局部选型表

| 局部问题 | 来源与核验等级 | 本地采用的机制候选 | 明确不继承 |
|---|---|---|---|
| Attention 控制面与执行器分离 | Agent Inbox，`primary_page_spotchecked`；MAAT，`primary_page_spotchecked` | 用一个低噪声 attention projection 表达“现在为何需要人”；保存 saved / delivered / acted 等状态的区分，刷新可由文件/状态确定性计算。 | 不把 dashboard 当 runtime inventory；不把 delivery receipt 当 agent 已恢复；不把 README 的可靠性说法当产品结果。 |
| 个人工作对象与 session 关系 | Open Walnut，`primary_page_spotchecked` | Attention、task、session、notes 作为不同披露层；session 可成为执行历史，不能取代 durable attention。 | 不复制 Walnut 的完整 personal OS、存储实现、恢复承诺或 UI。 |
| Practice 的可移植封装 | Agent Skills 页面 + OpenAI Codex 官方 Skills 文档，均已读 | 高层 `Practice` 保留治理语义，执行封装尽量使用 `SKILL.md`、`scripts`、`references`、`assets` 的薄映射；Codex 仅作为当前执行 adapter。 | 不新造平行 skill/package 规范；格式兼容不证明任意 runtime 的语义无损、权限或隔离兼容。 |
| 手动优先的 source of truth | Sid Bharath 作者实践，`primary_page_spotchecked` | 先用可读的手动 loop 观察字段和重复流程；当格式漂移真实出现，再考虑结构化机器 source 与生成视图。 | 不把作者的 JSON 迁移经验当本地 schema 决策；不提前做自动化和全局索引。 |
| 外部 signal 的 authority 边界 | Martin Schenk 作者实践，`primary_page_spotchecked` | 将 `signal ≠ authorization` 作为 Attention Practice 候选；公开回复、承诺、方向变化保留 human review。 | 不把作者实践当安全标准；不让 Issue、邮件或网页文本授予本地工具能力。 |
| GoRaven workspace / shell / plugin | README `primary_page_spotchecked`；6 个 Go 路径和 plugin guide 固定 commit `55eda72890230a0a42c72b9599f6cfe1c480ead8` | 只作为 runtime isolation 与 extension seam 的工程样本：文件 workspace 路径、`resolvePath`、显式 hook registration、per-agent plugin factory 可供反例和 fixture 研究。 | 不采纳“完整 Agent isolation”结论；shell 默认 `/bin/sh -c` 且无默认 command validator，未证明 cwd/OS/container/MCP/DB/并发隔离。 |
| Pi 的并发反例 | `earendil-works/pi#7812`，`supplemental_upstream_context` | 把“第二交互式进程复用默认 session 导致状态干扰”记录为真实问题线索；把页面 closed / not planned 作为当前上游状态。 | 不说问题已修复；不把 issue 状态当实现验收或 PR 合并证据。 |
| Codex wrapper、其余实践 | 包含 wrapper 在内的 10 条明文外链为 `indexed_unverified` | 仅保留待复查 URL 和问题标签，暂不进入实现选择。 | 不依据对话二手摘要主张 wrapper 的 timeline、approval、delegation、recovery，或其他项目的成熟度、数字和许可。 |

## 对象和披露边界

Attention 与 Matter 可处于同一 durable governed state 层；二者治理对象不同。Attention 维护个人持续关注、外部 signal、待跟进责任和跨 session 关系；Matter 维护领域工作事实。一个 Attention 可以跨多个 Matter，也可以暂时没有 Matter。Session 只记录执行/交互历史，不能从 session finished 推导 Attention resolved。

Human Attention UI 是 Attention state 的一个人类 projection。候选的四个语义区是 `Needs You`、`In Motion`、`Waiting`、`Later`；它们是视图分类，不是底层对象的最终 schema。卡片优先显示 `title / why now / required action / state / source or owner / time signal`，展开后再提供 evidence、next action、Matter/Session drill-down。

“全量 memory”只保留为可寻址空间的解释。披露顺序候选为：

1. policy 约束的 registry / existence；
2. typed 或 exact schema lookup；
3. 有界 grep 或关系遍历；
4. 必要时的 bounded semantic retrieval；
5. 最后才是原始 trace/corpus。

每一步都应有 source、role、reason 和 freshness；存在性本身也可能需要 human disclosure。模型或另一个 Matter 不能直接取得整个 Attention store。

对话中出现过的最小 Attention 字段——`id`、`title`、`state`、`next`、`sources`、`sessions`、`artifacts`、`last_touched_at`、可选 `review_at`——仍是候选观察表，不是已冻结的 Courtwork schema。正式对象应沿既有 Core/state ownership 和当前工程合同决定。

## GoRaven 首轮使用结论

GoRaven 的页面级设计目标与 Courtwork 关注的 workspace、skills、hooks、observability 有真实重合，但实现级证据目前只到：

- `NewLocalSandbox(userName)` 取得 `Paths.UserSpace/userName`；
- file manager 在 `ReadFile`/`WriteFile` 前做清理路径和 workspace 前缀检查；
- `extraWorkspace` 是另一个显式共享路径；
- plugin factory 为每个 agent 建立新实例，hook 通过显式注册进入进程。

同时，`LocalShell` 默认命令校验是 no-op，通过 `/bin/sh -c` 运行，代码路径没有把 `cmd.Dir` 设为用户 workspace；现有 local tests 没有两用户、越界、shell、并发或恢复断言。因此首轮 briefing 应把 GoRaven 标为“有界实现样本 + 隔离反例待验证”，不把 README 的 `isolated workspace` 直接写成可复用能力。

如果未来需要产生 upstream 工件，先做独立 fixture，再选择 issue、测试、文档或小 PR：

1. 为两个 `userName` 建立独立临时目录，验证文件读写不会交叉；
2. 对同一用户的两个并发 session 检查是否有唯一 session identity、共享文件冲突或写入顺序保证；
3. 分别检查 file API、shell、MCP、extra workspace 的允许范围；
4. 验证取消、超时、后台 shell 和子进程不会留下越界或悬挂状态；
5. 检查 plugin 的实例边界、注册顺序、错误处理和版本字段是否足以支撑生命周期契约。

本轮没有运行这些测试，也没有发送邮件、Issue 或 PR。它们是下一次有明确消费者后的最小复现面。

## 产品消费接缝的研究边界

### Attention Assistant / personal loop

先验证一个可由 Codex 手动执行的 Practice：每次运行先读小型 index，按当前 request 展开相关 Attention，再读取 evidence；外部 signal 只改变待治理的 `state / next / waiting_on / evidence` 候选；重要公开动作先准备草稿，人工决定是否发送；完成后保留 provenance 和可复查更新。

这一步观察的不是模型能力排名，而是：哪些字段每次续行必需、哪些内容只需 grep、Attention 是否自然拥有多个 session、`waiting` 与 `review` 是否足够、恢复时如何避免 stale state，以及哪些重复步骤值得自动化。个人状态和 mutable credentials 留在私有目录，不进入本仓库。

### Human Attention Surface

第二个 PR 只消费 governed state 的 projection：列表、四种人类语义区、Attention card、`Why now / evidence / next action` 展开、wait/snooze/delegate/resolve 等人工动作、Matter/Session drill-down 和本地 cached projection。动作应进入 governed event，再让 projection 更新；UI badge 自身不取得状态权。

这个 surface 不承担自动优先级、复杂推荐、CRM、scheduler、notification delivery、telemetry dashboard、全局 RAG 或完整 Expert UI。刷新不应因为展示卡片而调用模型；未交付的后端能力不画成可用按钮。

### Runtime adapter

Codex 是当前手动实践的执行 provider，不能成为 Attention schema 的隐含 owner。Practice、Attention state、Session history、runtime adapter 和 human projection 应分别记录。每个未来 provider 都需要 capability matrix，至少覆盖输入编译、工具权限、取消、恢复、结果交付、来源回写和失败/未知结算；Codex wrapper 页面当前未读，不能据其二手摘要填矩阵。

## 暂不选择的方向

- 不复制 GoRaven、Walnut 或任何 personal AI 项目的整体产品形态。
- 不以 GoRaven README 的 workspace 文字替代 shell/OS/container/并发隔离证据。
- 不把插件注册、Skills 格式或 provider 兼容写成权限授予、事务能力或安全隔离。
- 不把所有历史压进 global memory，也不把 semantic search 置于 schema/exact/grep 之前。
- 不先做 Gmail/GitHub automation、定时续行、relationship CRM、career graph、批量 outreach 或 star KPI。
- 不因一条作者实践或一篇未读文章修改 Paper、架构权威、当前状态或产品路线。

## 下一动作与完成条件

1. 以 [`verification.md`](verification.md) 的 V01–V05 为 briefing 事实，单独记录 GoRaven 的 identity、文件边界、shell 负面证据、plugin seam 和 Pi issue 状态。
2. 在个人 Attention 项目中继续手动 loop，并只记录可复查的 state、source、next、人工 gate 和恢复反例；不把一次对话完成当作对象完成。
3. [`courtwork-pr-plan.md`](courtwork-pr-plan.md) 已准备 Attention Assistant、Human Attention Surface 和 Runtime adapter 的候选施工草稿；待手动实践产生稳定字段和至少一个失败/恢复反例后，由架构 owner 细化并冻结最小 contract，再决定开工顺序。
4. 任何 upstream 互动都先完成代码/测试/历史讨论的有界阅读，再准备技术工件；公开发送、合作承诺和代表用户立场的动作遵循现有人工授权边界。
5. 重新实施时固定上游 commit/release，复核许可和依赖；没有具体消费者和反例时，保持索引而不扩展研究面。

本索引因此只授予“可消费的局部观察”这一证据等级，不授予外部项目成熟度、Courtwork 产品验收或未来 runtime 的兼容承诺。
