# Attention Assistant：来源消费与追溯索引

观察日：2026-09-09。此索引是研究输入和实现前核验记录，不是产品验收、许可结论、上游背书或当前工程状态表。当前产品状态仍由 [`engineering/current.md`](../../current.md) 管理；本轮架构处置见 [`adjudication.md`](adjudication.md)。

## 输入边界

本轮消费的是 Attention Assistant 讨论的全部 13 个 turn：主来源 10 个、较早来源 3 个。接口读取结果为两页 `10 + 3`，第二页 `hasMore=false`；读取项没有截断标记。原始会话为 [`chatgpt-conversation://6aa122d3-ac50-83ec-bbb3-a7959c28d9d3`](chatgpt-conversation://6aa122d3-ac50-83ec-bbb3-a7959c28d9d3)。逐字来源副本只保留在个人 Attention 项目的私有 `private/sources/`，下表用于按文件名和 hash 追溯，不将私有原文复制入 Courtwork：

| 文件 | 内容范围 | 行数 / 字节 | SHA-256 |
|---|---|---:|---|
| `source-conversation.md`（私有快照） | 主来源 10 turns | 1,983 / 62,141 | `92deffceb8004c9309b41c094b2a82fcc78bd8afb5983da7a9a9e6043a976769` |
| `source-conversation-earlier.md`（私有快照） | 较早来源 3 turns | 236 / 14,372 | `0fab1f2d7fe22dc93ba07def32d6774b6913eed84f4d2edc9a8bef68e31f7d90` |

这两个文件是本轮输入副本，不是产品运行时的状态源。私有 manifest `source-manifest.json` 记录会话 ID、13 个 turn、上述两个快照 hash，以及附件 `IMG_2378.jpeg`（SHA-256 `9069665ef62c7f37d81bccaebcdf2988379315e0e9aa7e60cb93ae3476b266e7`）。截图继续留在个人 Attention 项目，没有复制到仓库。`source-conversation-earlier.md` 第一 turn 的图片内容不在逐字副本中，因此图片中的事实只按私有来源和本次实际网页核验处理。

“已核验”只表示在观察日读过指定网页或固定代码路径；没有安装这些项目、运行其生产部署、复现实验、验证作者的效果数字，也没有把外部许可自动解释为 Courtwork 可再分发许可。`master`、`latest` 和动态文档入口均不构成实施版本；实施前应重新固定 release 或 commit。

状态含义：

- `primary_page_spotchecked`：读过原始项目页、README 或作者原文；只支持页面中明确写出的范围。
- `code_path_spotchecked`：在固定 commit 上读过代码路径；不等于运行验证或安全审计。
- `official_page_spotchecked`：读过官方文档；只支持文档能力，不证明本产品接入。
- `indexed_unverified`：仅保留对话中的引用和 URL；不把标题、API、数字、许可或成熟度当作事实。
- `supplemental_upstream_context`：不是对话明文 URL，而是为核对 GoRaven/Pi 关系补读的上游页面；不改变 18 条明文 URL 的清单。

## 逐 turn 消费

行号是私有快照的起始位置和下一 turn 前的结束位置，便于以后用相同 hash 的副本复读。表中“原文主张”描述对话中的 assistant 论述；“本轮处置”区分采用的研究候选、只作背景的说法和当前未证实项。

| ID / 原文定位 | 原文主张 | 本轮处置与后续消费者 |
|---|---|---|
| `fd0c91e6-425a-4cd9-988e-df1ac0d0c2e7` · earlier:1–38 | GoRaven 冷邮件来自 Pi 并发隔离问题；GoRaven 被描述为团队 Agent workspace、技能/插件/MCP、权限与自部署平台。 | GoRaven README 和实现路径已补读；Pi #7812 作为补充上游背景核对。保留“产品自述”和“实现证据”两层，不接受“完整隔离”结论。 |
| `a94868a7-832f-4bc1-aed6-d22080db2dee` · earlier:39–107 | 建议从真实问题出发参与 upstream，以 issue、测试、文档、benchmark 或小 PR 形成技术连接；star 是结果而非目标。 | 采用为 community participation 的人工门槛候选；不建立增长指标，不自动发信或发帖。 |
| `46b187e6-1a95-4d12-9c40-e81a5b9e1ae6` · earlier:108–236 | 讨论 Gmail/GitHub plugins 和长期 Codex 互动 loop，把外部关系保存为可渐进披露的本地状态。 | 只采用“外部 signal 需要 provenance、重要公开动作保留人工 gate”的边界。插件可用性、账户连接和邮件发送状态不在本轮证明。 |
| `2afc2233-0892-4fd8-86a4-1ff395137f15` · main:1–56 | 提出克制的开源参与政策：先读代码和历史，再留下有内容的公共工件；外部互动形成 observation → practice → implementation → feedback 链。 | 作为 Attention Practice 的行为原则候选；`Why us / Why upstream / Evidence / Marginal value / Future edge` 留作人工 review checklist，不升级为产品规则。 |
| `4c2091fb-1b86-4b70-8572-a179d46c701d` · main:57–280 | 建议按 runtime isolation、continuity、permissions、plugin lifecycle 等问题发现相近 issue；不以索取 star 为目标。 | 采用“真实问题 → 有证据的公开工件”的顺序；不把贡献数量、star、followers 作为 attention 状态。 |
| `4556a2ab-917e-4060-8fe3-35c8ee65a6b3` · main:281–510 | 建议将外部 issue 依次蒸馏为 observation、practice candidate、反例、reference implementation、cross-project validation，再决定是否进入 roadmap 或 Paper。 | 采用三类证据（capability / practice / connection）的区分；Paper 仍由其自身仓协议管理，本包不改 Paper 正文。 |
| `b59faf19-8a3e-4d55-9242-e4c8068fa430` · main:511–586 | 认为真实技术互动也可能带来开发者或公司联系，但 community graph 与 career graph 应分离，不能把开源贡献伪装成求职营销。 | 作为关系 provenance 的反例边界；不创建 career graph、CRM 或 outreach 自动化。 |
| `e646cf8d-0c6a-41ed-a5b6-e3d274a11ac2` · main:587–618 | 将目标收敛为持续解决真实问题，让 connection 自然出现，而不是经营 connection。 | 采用为 loop 的目标约束；不登记 activity quota。 |
| `90460a8c-c209-4750-8fa9-db432cc26472` · main:619–783 | 提出 Attention Assistant 与 Matter、Session、Practice、Runtime 分离；先用 Codex 手动 loop，再将稳定语义封装成可替换 runtime 的 PR。 | 与 [`adjudication.md`](adjudication.md) 对齐：Attention 生命周期可独立，UI 和 runtime adapter 分单；手动实践不等于产品 API/schema 已交付。 |
| `fbd2f53a-17f3-4d34-9989-cd236f968349` · main:784–1056 | 从 Agent Inbox、Walnut、MAAT、Codex wrapper、Agent Skills 等局部选择，提出 first-class Attention、多个 session、确定性 loop、Skills-compatible Practice、外部 signal 无 authority。 | 这是选型主输入。已读页面和未读页面分列；GoRaven 的完整隔离、Codex wrapper 的实现细节和所有 author 数字不继承。 |
| `4ebda7c7-5204-443b-b248-7047afddc1cb` · main:1057–1389 | 将 Human Attention UI 独立为第二个 PR：Needs You / In Motion / Waiting / Later、Why am I seeing this、人工动作产生 governed event，刷新不依赖模型。 | 采用为 UI 候选边界；“session finished = resolved”和“notification/read = obligation closed”明确拒绝。未交付后端能力不画成可用按钮。 |
| `42a4840b-5dbc-43b3-9a21-375811ea6ce8` · main:1390–1746 | 认为 Attention 与 Matter 同纬度，拥有可寻址的完整 store；跨 Matter/Role 先发现存在性，再按 policy 请求披露，最后编译上下文。 | 采用 `Memory = governed addressable state`、`Context = role × task × attention × policy` 作为研究解释；存在性本身也受 policy 约束，不实现全局 memory 注入。 |
| `d07026da-cb9f-4194-bbc9-29aee4f1a8be` · main:1747–1983 | 将“全量 memory”定义为全量可寻址而非全量进入 context；schema/exact lookup → grep/关系遍历 → bounded semantic fallback。 | 采用 `Discover → Inspect → Disclose → Compile` 作为披露顺序候选；不把 grep 或 schema 顺序写成跨场景性能定理。 |

## 对话中明文外链逐项清单

以下 18 条均直接出现在两个来源副本中。括号中的 turn 是原文引用入口；观察状态不等于该项目的质量、维护状态或许可已被本项目接受。

| ID | 原文链接 | 来自 | 状态 | 局部消费 |
|---|---|---|---|---|
| G0 | [GoRaven GitHub](https://github.com/8treenet/goraven?utm_source=chatgpt.com) | earlier `fd0c91e6-425a-4cd9-988e-df1ac0d0c2e7` | `primary_page_spotchecked`；代码见 [核验记录](verification.md) | workspace / plugin / shell 隔离边界 |
| A01 | [Agent Inbox](https://github.com/shariqh/agent-inbox) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `primary_page_spotchecked` | attention control plane、shared state、delivery 状态 |
| A02 | [Open Walnut](https://github.com/EvanZhang008/walnut) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `primary_page_spotchecked` | personal work + sessions 的 UI/state 形态 |
| A03 | [MAAT](https://github.com/eragonlonelyboy-lab/maat) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `primary_page_spotchecked` | deterministic attention、trace 与 status 分离 |
| A04 | [octomux](https://github.com/ShreyPaharia/octomux) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `indexed_unverified` | 仅保留 permission/review surface 候选 |
| A05 | [Codex app-server wrapper 实践](https://dev.to/cloudx/how-i-built-a-personal-ai-super-app-by-wrapping-codex-app-server-5fp6) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `indexed_unverified`；直接页面读取失败 | 仅保留 wrapper 方向，不证明 timeline/approval/delegation/recovery 实现 |
| A06 | [Agentre](https://github.com/agentre-hub/agentre) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `indexed_unverified` | 仅保留 profile/backend 分离候选 |
| A07 | [Agent Skills specification](https://github.com/agentskills/agentskills) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `primary_page_spotchecked` | `SKILL.md`、渐进披露、跨产品 Practice 封装 |
| A08 | [OpenAI Codex Skills](https://developers.openai.com/codex/skills) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `official_page_spotchecked` | Skills authoring、plugins 分发、按需加载 |
| A09 | [Dialogue](https://github.com/dimsedra/dialogue-ai) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `indexed_unverified` | 仅保留 conversation/observer 分离候选 |
| A10 | [TARS](https://github.com/ajayjohn/tars-work-assistant) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `indexed_unverified` | 仅保留 ledger/context bundle 候选 |
| A11 | [Bryti](https://github.com/larsderidder/bryti) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `indexed_unverified` | 仅保留 projection/follow-up 候选 |
| A12 | [Nerve](https://github.com/SolAstrius/nerve) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `indexed_unverified` | 仅保留 source cursor / consumer 候选 |
| A13 | [Sid Bharath — Jarvis](https://sidbharath.com/blog/how-i-built-jarvis/) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `primary_page_spotchecked`；作者实践 | Markdown → JSON source of truth → generated view 的演化 |
| A14 | [Crystal Widjaja — Chief of Stuff](https://crystalwidjaja.substack.com/p/my-chief-of-chores-via-claude-code) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `indexed_unverified` | 仅保留 staging / acceptance candidate |
| A15 | [Martin Schenk — 15 projects](https://dev.to/martinschenk/how-i-run-15-projects-with-claude-code-without-losing-the-thread-23lb) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `primary_page_spotchecked`；作者实践 | `origin` 与 signal classification 的边界候选 |
| A16 | [Lars Peters — Clara](https://larsp.de/posts/clara-claude-code-secretary/) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `indexed_unverified` | 仅保留 waiting / relationship loop 候选 |
| A17 | [Joe Amditis 的实践](https://strugglestreet.substack.com/p/im-a-claude-code-agent-with-my-own) | main `fbd2f53a-17f3-4d34-9989-cd236f968349` | `indexed_unverified` | 仅保留 cursor、Approve/Edit/Cancel 候选 |

对话中把这些来源合称“候选”时，不能把 10 个 `indexed_unverified` 项目的描述提升为页面已读事实。A05 也不能用对话中的二手摘要代替原文；其余已读作者实践仍是作者自述，不是独立 benchmark。

## 有界核验入口

详细的固定 commit、函数名、负面发现、许可可见范围和未检项见 [`verification.md`](verification.md)。当前最关键的结论是：GoRaven 的 README 与代码支持“按用户生成 workspace 路径、文件管理器做路径前缀检查”这一局部观察；`LocalShell` 默认不校验命令并以 `/bin/sh -c` 执行，代码路径没有证明 shell 被限制在该 workspace。Pi #7812 的实际页面状态是 closed / not planned，不能引用为已修复的并发隔离能力。

所有外部页面仅支持 [selection-index](selection-index.md) 中的局部候选。没有一项外部页面核验会自动改写 Paper、架构权威、产品 schema、当前状态或 G1–G5 门。

## 2026-09-11补充来源 · Google Workspace CLI

[EX-GWS-02 / Attention Event Bridge](../google-workspace-cli-2026-09-11/README.md)收录用户提供的gws watch/subscribe、NDJSON、去重/确认/续期研究建议；状态indexed_unverified，未创建真实订阅或读取邮件。外部事件不直接成为Attention item或正式决定，后续沿原owner核验。
