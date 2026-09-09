# EX-PS2 · "产品自身即证据"的页面解剖与 Courtwork 素材映射

Sonnet，只读 explore。派单：`work-orders/EX-PS2-proof-patterns.md`；裁定依据 [intake](../intake.md) PS-2、PS-9。

**状态**：带溯源索引 —— 六站解剖与素材映射行内已含转录值（引文、状态词、SHA），但 evidence/ 下 PNG 与长脚本仍以路径指向原文件，供 Fable 复核时重新打开，不在本卷内联二次分发大文件字节。

**来源文件与 SHA-256**（分支 `claude/fable-publishing-surface`，HEAD `0741d2e239cf8648558f731d8ec9161179aea1be`；本卷检查时该分支工作区无未提交改动）：

| 文件 | SHA-256 |
|---|---|
| `work-orders/EX-PS2-proof-patterns.md` | `0da454c24c63811eb967809f3d9d7da4cd7e0eca0950abde62d1f8c56234a3b8` |
| `../intake.md` | `3100109dd101a445180e50dd978c0a69834b2b086bedcf1db9af383def3fe4fb` |
| `engineering/mvp/execution/work-surface-kit/handoff-convention.md` | `7ab1df384a41845cb3378a45a711fa5d7cf13d781841fed1c6aa9b44e6285084` |
| `engineering/release/2026-09-08/pages-preparation/reference-index.json` | `af108b0bcb8f94a55c98e1a6613147290871b2fbe8f1e46066ab5dab5df8ad44` |
| `engineering/design/copy-convention.md` | `af5b15a6a67d72085a3c049ec8135089947e560a67e6d3c84cdda64c6d032975` |
| `engineering/research/review-surface-2026-09-09/README.md` | `8be6594117b75fbd3bc9768643d58d268b260f4f4fe120f664813f60b8d4a14a` |
| `engineering/research/review-surface-2026-09-09/source-index.md` | `b0e8593eb41d5c700a14b291eb0b55283f5e38d887fc33f2333e2e8d33548305` |
| `engineering/research/review-surface-2026-09-09/pr-plan.md` | `5a651672fc7b418c82f4664d607c817efec00796e581afc49266fd77da6e7ff5` |
| `engineering/research/chat-space-2026-09-09/courtwork-mapping.md` | `df0c6ca78cefb1a2f1d1176f874e80f81cb96f0608839a6e2232d854eac7b6c2` |
| `evidence/final-integration-20260908/README.md` | `d246c862d7699d697dca71e8aeb3a70a354fea24b0c9ad960d25fab3c2c03737` |
| `evidence/rc/README.md` | `c3588487a5aa43307b3f08a130c35a7cb89356e03ec622e42b9cdc03d6c8d144` |
| `evidence/cc-s-main-integration-20260909/README.md` | `5fa092d2b3024ce43f38212078564e4e5f6f488c3d61c3b8e542d112f8a10e9b` |
| `evidence/fe03/README.md` | `49ec858a73393778308dcd90f7376764b7142e1fcb49b77cf2fb893186a4b9fa` |
| `evidence/fe03-main-integration-20260909/README.md` | `d28713c856dcd6ea7f1a4a2f968802b054826cbe93161f4c23bdee624f49d55c` |
| `evidence/wk10b2-main-integration-20260908/README.md` | `e2caed07bf9bb459ddd3dd43c57401e7d032267cda047994ea246bfbb787cab5` |
| `evidence/se-continuity-20260908/README.md` | `da26fed164414478dbd311f8b97e5e5f4f9c9a4f5e7beda4f88dbd0a7eca5dcb` |
| `evidence/harness-core-20260908/README.md` | `a78ceb8ba2039407e19f09244b02bbbb26679072c4c9ea0d1351f747b642b413` |

**只读声明**：未修改本卷之外的任何文件；未启动任何服务、未运行 `npm --prefix app start` 等命令；未下载任何资产；未截图外部站点（外部六站全部经 WebFetch 取回其 HTML→Markdown 转写，未在浏览器中渲染或截屏）；未读取任何凭据文件。

**未访问 / 未成功访问的 URL**：`https://kairnai.com/` —— WebFetch 两次均返回 `HTTP 403 Forbidden`（2026-09-09），未取得任何页面内容，其"原始文件↔渲染视图"并置做法本卷**未能核实**，需 Fable 另择工具或用户人工核对。其余五站均于 2026-09-09 经 WebFetch 成功取回。

---

## 一、溯源索引行

外部六站（格式：`ID · URL · 访问日 · 许可 · 消费模式 · 转录到`）：

- `otty-site · https://otty.sh/ · 2026-09-09 · 公开站点，仅描述不转载版权文本 · REFERENCE · 转录到 本卷「二」otty.sh 行`
- `korren-site · https://korren.dev/ · 2026-09-09 · 公开站点，仅描述 · REFERENCE · 转录到 本卷「二」korren.dev 行`
- `lpm-site · https://lpm.cx/mac-terminal-for-developers · 2026-09-09 · 公开站点，仅描述 · REFERENCE · 转录到 本卷「二」lpm.cx 行`
- `kairn-site · https://kairnai.com/ · 2026-09-09（访问失败，403） · — · 未消费 · 转录到 本卷「二」kairnai.com 行（标记不可用）`
- `twill-site · https://twill.design/ · 2026-09-09 · 公开站点，仅描述 · REFERENCE · 转录到 本卷「二」twill.design 行`
- `pedro-site · https://ped.ro/ · 2026-09-09 · 公开站点，仅描述 · REFERENCE · 转录到 本卷「二」ped.ro 行`

本地来源（格式：`ID · frozen SHA:path · 访问日 · 许可 · 消费模式 · 转录到`；SHA 均为本分支 HEAD `0741d2e2`）：

- `ref-index · 0741d2e2:engineering/release/2026-09-08/pages-preparation/reference-index.json · 2026-09-09 · 仓内只读 · REUSE（不重新抓取） · 转录到 本卷「四」`
- `evidence-final · 0741d2e2:evidence/final-integration-20260908/ · 2026-09-09 · 仓内只读 · REUSE · 转录到 本卷「三」01/04 行`
- `evidence-rc · 0741d2e2:evidence/rc/ · 2026-09-09 · 仓内只读 · REUSE · 转录到 本卷「三」01 行`
- `evidence-ccs · 0741d2e2:evidence/cc-s-main-integration-20260909/ · 2026-09-09 · 仓内只读 · REUSE · 转录到 本卷「三」01/02/06 行`
- `evidence-fe03 · 0741d2e2:evidence/fe03/ · 2026-09-09 · 仓内只读 · REUSE · 转录到 本卷「三」01 行（早于合流基线，作次选）`
- `evidence-fe03-main · 0741d2e2:evidence/fe03-main-integration-20260909/ · 2026-09-09 · 仓内只读 · REUSE · 转录到 本卷「三」01 行`
- `evidence-wk10b2 · 0741d2e2:evidence/wk10b2-main-integration-20260908/ · 2026-09-09 · 仓内只读 · REUSE · 转录到 本卷「三」04 行`
- `evidence-secontinuity · 0741d2e2:evidence/se-continuity-20260908/ · 2026-09-09 · 仓内只读 · REUSE · 转录到 本卷「三」05 行`
- `evidence-harness · 0741d2e2:evidence/harness-core-20260908/ · 2026-09-09 · 仓内只读 · REUSE · 转录到 本卷「三」05 行（无 UI，仅后端事实登记）`
- `review-surface · 0741d2e2:engineering/research/review-surface-2026-09-09/ · 2026-09-09 · 仓内只读 · REUSE（只登记与 04 段相关行） · 转录到 本卷「三」04 行`
- `chat-space-mapping · 0741d2e2:engineering/research/chat-space-2026-09-09/courtwork-mapping.md · 2026-09-09 · 仓内只读 · REUSE（只登记与 04 段相关行） · 转录到 本卷「三」04 行`
- `copy-convention · 0741d2e2:engineering/design/copy-convention.md §3 · 2026-09-09 · 仓内只读 · PROTOCOL（词表核对基准） · 转录到 本卷「二」「三」缺陷列`

---

## 二、六站解剖表

列：`首帧内容 · 互动性质 · 在线标注 · 无 JS 首屏可读 · reduced-motion · 数据来源标注 · 导航项 · 页脚`

| 站点 | 首帧内容 | 互动性质 | 在线标注 | 无 JS 首屏可读 | reduced-motion | 数据来源标注 | 导航项 | 页脚 |
|---|---|---|---|---|---|---|---|---|
| otty.sh | 图标 + 标题 "Otty"，随即 "A native, beautiful terminal app."，紧邻一张标为 `screenshot-1.png` 的产品截图 | 静态图为主，下方另有 download 按钮与 command palette 演示图；WebFetch 未见首屏本身可交互 | 模拟终端内文字 "agentonline"（终端内容本身的状态文本，非页面级"在线"徽标） | 是——标题、正文、`screenshot-1.png` 等静态资源在原始标记中直接存在 | 抓取内容中未见相关声明 | 未见 | Documents · Articles · Change Log · Price | Legal（License Agreement / Privacy Policy / Credits）、Contact（Team / Email / Twitter） |
| korren.dev | 纯文字标题行 "korren — gpu-accelerated terminal emulator for linux & macos · panes, tabs, workspaces"，随即一个内嵌的终端模拟器演示（非截图，是可操作的假终端） | 真运行脚本回放：command palette 可键入、主题可切换、面板可拖拽调整、标签可重排；底部状态栏显示 "korren ~/korren 10 blocks [main] osaka-jade scr 0% — fps" | 无独立"在线"徽标；状态栏本身即持续更新的模拟系统状态（fps 等），近似"看起来在跑" | 是——标题与各分区说明文字在标记中即可读，仅主题切换/面板拖拽等交互需 JS | 抓取内容中未见相关声明 | 未见来源标注；数据为演示脚本内建 | what · layout · blocks · ssh · themes（另有 GitHub、download、command palette 入口） | product（layout / palette / blocks / ssh / themes）、guides（tmux alternative、terminal for claude code）、project（source / issues），标语 "ai is just a pane." |
| lpm.cx/mac-terminal-for-developers | 标题 "Terminal built for your developer workflow" + 副标题，随后是下载按钮区，再下是标为 "Live interactive demo" 的分区 | 明确标注的"录制回放"：demo 区文字写明 "A recording of lpm booting a project and handing it to Claude Code — lpm is a macOS app, so the clickable demo runs on desktop. Click anything — it runs live in your browser."——即：桌面软件的操作被录制，网页端点击驱动同一份录制回放，而非真运行桌面 App | 未见独立"在线"徽标；demo 区文案本身承认这是录制而非真机 | 是——标题、下载区、比较表、FAQ 等文本在标记中直接存在 | 抓取内容中未见相关声明 | 是——demo 区文字明确注明数据是"录制"而非实时抓取，来源属性透明 | Docs · For AI agents · Compare · Download · GitHub Stars | Terminal guides、AI agents、Git worktrees、lpm resources，及与 Foreman / tmux / Docker Compose 等的对比链接 |
| kairnai.com | 无法获取——WebFetch 两次均返回 `HTTP 403 Forbidden`（2026-09-09），无响应体 | 未知 | 未知 | 未知（未取得原始标记，无法判断） | 未知 | 未知 | 未知 | 未知 |
| twill.design | 纯文字标题 "Designing (+coding) delightful product experiences for ambitious startups."，logo 与导航先于标题 | 基本静态；"Book a call" 等为外链按钮（跳转日历预约服务），未见页面自身的产品回放 | 未见 | 是——标题、说明、testimonials 等在标记中直接存在 | 抓取内容中未见相关声明 | 未见 | How it works · Wall of love · Book a call（CTA） | 品牌区、"Let's Chat"（预约链接 + 邮箱）、Connect（LinkedIn / X）、一个 "Close" 按钮（推测为移动端菜单收起） |
| ped.ro | 纯文字："R0/0" 随即 "Yo! I'm Pedro Duarte."（个人介绍句） | 静态个人站，无产品回放 | 未见 | 是——引导文字与导航在标记中直接存在 | 抓取内容中未见相关声明 | 未见 | Home · Writing · Speaking · Shooting | 本次抓取内容未覆盖到页脚区 |

**Kairn 的"原始文件 ↔ 渲染视图"并置做法**：本卷**未核实**——kairnai.com 对 WebFetch 返回 403，两次尝试（首次完整 prompt、二次精简 prompt）结果一致，判断为该站点对自动抓取工具的访问控制拒绝，而非临时故障的强证据尚不充分（只试了两次，同一小时内）。此项需 Fable 换用其他只读手段（例如请用户人工描述，或后续批次用不同 UA/时间重试）另行核实；本卷不代为下裁定或猜测其实现方式。

---

## 三、素材映射表：六段 × 可用素材

列：`路径 · 代码基线 SHA · data_kind · viewport/theme · 显示的状态文字 · 适用段落 · 缺陷`

### 01 Raw → Governed

| 路径 | 代码基线 SHA | data_kind | viewport/theme | 显示的状态文字 | 缺陷 |
|---|---|---|---|---|---|
| `evidence/cc-s-main-integration-20260909/continue-in-work-1440-light.png` | 合流 `4fc3de24c0d431f6a6f72edac5117d9c69649035`（README 自述；intake.md 另处记 CC-S 落点 `414b196`，为该合流链更早一步，二者不冲突，取 README 自述值为准） | interactive-fixture（screenshot，非本身即回放） | 1440 · light | "Continue in Work" 标题；"This chat keeps its history and its project; continuing in Work binds it to a Matter that Inbound NDA Playbook Review owns."；"Existing work in this project" 列出三条 `matter-*` 行，每行 `inbound-nda · source revision 1 · inbound-nda-v1`，右侧 `version 0`；"New Work" 段含 Title / Source text 字段 | 词表现行（Chat / Work / Continue in Work，符合 copy-convention §3.1）；可直接体现"同一原始来源如何被接入治理边界"，但截图未展示 Run 事件本身（Event log）与 Compiled context 面 |
| `evidence/rc/run-recorded-context-1440-light.png` | `9ef1710`（rc README 自述基线，早于 WK-89 词表改写） | interactive-fixture（Runtime Control UI 截图） | 1440 · light | 右栏 "Runtime context · recorded"：Bound revision 10 / Resources 25 / Profile agent:general / Profile status compatible / Policy scopes 1 / Binding hash `103626899c4f`；"Explicit loads · 0"，"This run loaded no skill or reference body. The bound context measured 60 characters, not tokens." | **旧词表**：左栏 "New session" "Find a session"，用户词表 §3.1 已改为 Chat/Work，"Session" 应退回 Developer 用词，此截图不可直接作对外证据；基线早于 2026-09-09 主线合流 |
| `evidence/final-integration-20260908/mcp-permission.png` | `0a3b9b22f47f5605ccedc227106b0c17a4df6120`（`source-manifest.json` 自述） | interactive-fixture | 1440 · light | 卡片 "Allow this remote tool call?"；"effect · local:unknown-…"；"Recorded source: http://127.0.0.1:64386"；"27 B · Permission for this exact action only"；按钮 "Deny action" / "Allow this action" | **旧词表**：左栏 "New session" "Find a session"；按钮词与 §3.2/联调补充现行的 `Approve this action` / `Deny this action` 不一致（早于该次修正）；标题 "Synthetic MCP browser run" 含 "Synthetic" 字样，属证据自描述而非产品文案，若采用需裁剪 |
| `evidence/final-integration-20260908/run-chain.png` | 同上 `0a3b9b22f4…` | interactive-fixture | 未标注（推断桌面宽度，非 1440/390 标准两档） | "Write denied · out/denied.txt"；"SIMULATED scripted response"；卡片 File "Recorded"、Workspace "1 file"、Runtime "17 resources · Capabilities 8 · Context 0" | **旧词表**（Session）；"SIMULATED scripted response" 字样是测试夹具自曝，不可用于对外页面；右侧三卡片（File/Workspace/Runtime）结构可作 01 段"三层真实数据"版式参考，但字段口径需 EX-PS3 核实是否即 Event log / Work state / Compiled context 三者 |

**02 段所需的 Run 事件 / Core surface 投影 / recorded Context 三者来源映射，intake PS-2(b) 注明"由 EX-PS3 核实"，本卷不代为下裁定。**

### 02 A matter in motion

未见任何"发布 SHA 上由捕获脚本生成、带 sha256 的只读回放 JSON"（PS-7 要求的 `interactive-fixture` kind）。现有材料：

- `evidence/rc/planned-fixture.html`：README 自述"a static mock of the capabilities that were drawn and then removed (WK-27). **Not linked from the product and not in the server's STATIC allowlist**"——即已废弃、不可达的静态草稿，非 02 段可用素材，仅作反例登记（intake 事实表已引用同一句作 PS-8 佐证）。
- 上列 `continue-in-work-1440-light.png`、`run-chain.png`、`mcp-permission.png` 均为**脚本驱动截图**，不是"页面不发起网络请求、点击只显示记录事实"的回放产物；可作 PS-7 退路"六步条 + 每步一张真实图"的候选静态帧，但需按发布 SHA 重新捕获（截图分别来自 `0a3b9b22f4…`、`9ef1710`、`4fc3de24c…` 三个不同基线，与"发布 SHA"不是同一版本）。

**结论：需捕获。** 缺失画面与状态：(a) 一份带 `source_sha`、`sha256` 的只读交互 JSON（PS-7 要求，尚待 EX-PS3 判断"渲染优先复用产品投影模块"是否可行）；(b) 标签固定文案 `Replay · synthetic data · recorded at CourtWork <sha7>` 在产品任何现有截图中未出现；(c) 若走退路六步条，需从发布 SHA 逐步捕获同一 Matter 从 Chat → Continue in Work → Run → Question → Answer → Artifact 的六张状态图，现有素材各步分散在不同基线、不同数据集（NDA fixture vs `WK6 interaction` vs `Runtime control fixture` 三套不同项目名），无法拼成同一 Matter 的连续步进。

### 03 Why this architecture

未见任何 evidence 目录含 editorial / 无卡片排版的素材；六个已列目录全部是产品截图或测试日志，不含论文式排版稿。

**结论：需捕获（更准确地说，需撰写）。** PS-2(c) 定"编辑排版、无卡片、退焦只用于本段"，这是文案 + 版式命题，不是产品截图证据；缺失的是 Fable 亲写的 03 段文本本身（`public-copy-v2.md`，intake PS-5 已指向该文件但 EX-PS2 范围不含产品文案撰写）与配套版式稿，不属于"从产品截图取证"的范畴。参考索引中 `minard-editorial`（见「四」）是这一段落最贴近的外部模式，但状态仍为 `queued`，未被本仓验证。

### 04 Review is a first-class surface

| 路径 | 代码基线 SHA | data_kind | viewport/theme | 显示的状态文字 | 缺陷 |
|---|---|---|---|---|---|
| `evidence/wk10b2-main-integration-20260908/run-chain.png` | 合流 `bf44b8f1b0c75ebd7b794ea1c080449335e26fcc`（README 自述，输入 main `d879e2ff9…`，Opus 实现 `e118992486…`） | interactive-fixture | 未标注 viewport | README 自述含 "Write denied"、"permission.resolved: allow"、"tool.result.isError: true" 等事件语义，PNG 本身未逐字核对（README 描述早于本卷截图查验范围） | 基线早于 2026-09-09 主线合流，未核对是否已随 FE-01（WK-89）改写为现行词表；需重新目视 |

**04 段消费既有 review-projection 契约与 review-surface 研究包（PS-2d），本卷登记 `review-surface-2026-09-09` 与 `chat-space-2026-09-09/courtwork-mapping.md` 中与 04 相关的结论行，不重新分析全文：**

- `pr-plan.md` PR-RS-A（历史来源定位与版本提示）：Core 已有的只读字段——candidate 不可变、base/source/contract 版本、humanActions、accepted artifact 的 digest 与 basis——是 04 段可引用的"既有事实"层；深链接/UI 是否完整消费这些字段"尚需确认"，本卷未见对应产品截图。
- `pr-plan.md` PR-RS-B（可验证的阅读分组与文本比较）：计划针对"一个合成 NDA fixture"提供 Review 分组、Sources 原顺序与文本 source fallback；**尚未实现**，本卷未见任何分组 UI 的截图证据。
- `pr-plan.md` PR-RS-D（Attention 摘要与局部对话范围）：依赖 ATT 后端接缝交付后才能在已有入口呈现真实投影；**尚未交付**。
- `review-surface README`「Astra 裁决」段落："阅读版本与动作基线分别检查"——历史 accepted 事实不因 basis 变旧被撤销；这条是 04 段可直接引用的产品不变量描述，但**属文字裁决而非可视证据**，若 04 段要展示，需要一张体现"历史 accepted 保留、旧 candidate 仍可读"的真实截图，本卷在已列评估目录中未找到这样一张图。
- `chat-space-2026-09-09/courtwork-mapping.md` 中与 04（Review）直接相关的一行：**Artifact / File / Preview / Download / Version / Provenance** 一条——"预览表示与可下载原件必须有明确身份"，状态"已实现窄形，Download 待做"，反例含"下载身份错配"（若 preview 已转码，须保持 bytes/MIME/hash 一致）。该行是 04/05 两段都可能引用的不变量陈述，非截图证据。

**结论：核心 UI 证据基本"需捕获"**——现有 evidence 目录里没有一张展示"NDA candidate 打开、显示 source 版本/finding/human decision"的完整 Review 界面截图；`wk10b2-main-integration-20260908` 只有 run-chain 一张流程截图且基线较旧，不足以支撑 04 段"Review 是一等证据面"的主张。

### 05 Evidence（含 Eval）

| 路径 | 代码基线 SHA | data_kind | viewport/theme | 显示的状态文字 | 缺陷 |
|---|---|---|---|---|---|
| `evidence/se-continuity-20260908/author-first.json` | `62556b7f65170ecf30efb2869447ae85fe69d721`（`git.head` 字段自述，`dirty: true`） | 非截图，JSON 原始报告 | 不适用（非 UI） | `protocol: "se-continuity-mechanism-v0"`；`condition: "courtwork-core-scripted"`；`model: null`；`limitations: ["development fixtures","scripted trusted Core client","no model, host Session, GUI, SIGKILL, legal-quality or comparative claims"]` | 无 UI 呈现，仅脚本化 Core 调用；`model: null` 说明尚未跑模型对照，与 intake PS-13"有界模型 pilot 未跑之前不出现对比分数"一致 |
| `evidence/harness-core-20260908/*.md` | `43e3dc058b77cb38d295b261b977469accc18478` → 最终 `1332691` | 文字记录，非截图 | 不适用 | "G1 real provider remains **not_run**"；"G4 actual public UI demonstration and G5 README/Pages/resume evidence remain open" | 纯后端证据，无渲染层；不能直接作 05 段可视素材 |

PS-13 的八问结构（What was tested · Against what · With which model · Which harness · Which fixture · What was held constant · What failed · Can I reproduce it）对照 `se-continuity` 材料：

- What was tested → `benchmarks/continuity` 三项可证伪命题（协议见 README 引用，本卷未展开读取协议全文，只读取了 evidence 内的运行结果 JSON）
- Against what → 未见强基线对照结果落在本卷已读文件中
- With which model → `model: null`，即**尚无**
- Which harness → `se-continuity-mechanism-v0`
- Which fixture → `courtwork-core-scripted`，五条开发轨迹，"只有一个合成 memo 任务族，不是五个独立领域样本"（README 自述）
- What was held constant → 未在已读文件中找到显式陈述
- What failed → README"限制"段列出多项不做的事，但未见具体失败用例枚举
- Can I reproduce it → 是，命令已给：`node benchmarks/continuity/run.mjs --output <new-result.json>`

**结论：数据存在但呈现形态需捕获。** 05 段若要用八问网格展示，现有材料是原始 JSON/Markdown，没有对应的产品页面截图或已排版的证据卡片；`model: null`、G1 `not_run` 等字段直接支持 PS-13"缺者显示 not yet"的处理方式，但版式本身需另建。

### 06 Build / inspect / reproduce

| 路径 | 代码基线 SHA | data_kind | viewport/theme | 显示的状态文字 | 缺陷 |
|---|---|---|---|---|---|
| 上列各 evidence README 的"复跑"命令段（`final-integration-20260908/README.md`、`rc/README.md`、`cc-s-main-integration-20260909/README.md`、`fe03/README.md`、`fe03-main-integration-20260909/README.md`） | 各自基线见上 | 文字，非截图 | 不适用 | 均含 `npm --prefix app ci`、`npm --prefix app test`、`npm --prefix app start -- --data-dir <...> --port <...>` 等真实可执行命令 | 命令是真实可复现的证据来源，但**不是页面素材**——06 段若要"展示"而非仅"链接"，仍需从发布 SHA 单独捕获一张"命令行 + 测试通过输出"或"仓库结构"截图；本卷已列目录中未见此类截图 |

**结论：文字证据充分，可视素材需捕获。** 06 段的核心可复用资产是这些 README 里真实存在、真实可执行的命令与测试计数（如 `fe03-main-integration-20260909`："全量、lint、contrast、smoke...在 `4b6aef4` 产品字节上跑"），但若页面设计需要一张画面（终端截屏或仓库树），现有目录未提供。

---

## 四、既有 12 条参考的有效性表

`reference-index.json`（`schema_version:1`，`status:"preparation-only"`，全部 `state:"queued"`、`decision:"pending"`，notice 明确"All observations are hypotheses imported from the source chat. No original-site captures or current visual verification completed"）——以下按 PS-2/PS-3/PS-4 冻结的骨架逐条核对是否仍能落位到 01–06 六段（不含首屏/页脚，那两处不在本单范围）：

| ID | 优先级 | 类别/模式 | 本工程状态 | 本批应取段落 | 不取理由 |
|---|---|---|---|---|---|
| `linear-hero` | A0 | hero・"product as first-frame content" | 仅登记，未验证 | 不适用于 01–06（该条描述首屏，PS-2a 已裁定首屏为发布 SHA 静态 Home 图，非本单范围） | 类别是 hero，六段范围不含首屏 |
| `minard-editorial` | A0 | editorial・"pipeline / lenses / annotations" | 仅登记，未验证 | 03（Why this architecture）——"用真实结构解释复杂理念"与 PS-2c "编辑排版、无卡片" 方向一致 | — |
| `unlost-position` | A0 | hero・"short proposition → concrete scenario" | 仅登记，未验证 | 不适用于 01–06 | 类别是 hero |
| `exat-motion` | A0 | motion・"interaction explains state" | 仅登记，未验证 | 02（A matter in motion）——"显露来源与版本关系"与 PS-7 回放语义相关 | 需先由 EX-PS3 确认 02 段可行性，本条暂只登记 |
| `rk-navigation` | A0 | navigation・"hero / dock / editorial continuity" | 仅登记，未验证 | 不适用于 01–06（导航/头尾连续性是全站骨架问题） | 不落在具体某一 proof surface 段落内 |
| `nova-proof` | A1 | product-proof・"desktop surface framing" | 仅登记，未验证 | 01（Raw → Governed）——"展示可检查的软件实体"，与 01 段用真实 UI 截图的方向一致 | do_not_copy 已注明"不暗示 fresh 已有桌面发行"，Courtwork 是 Web app，采用时需先剥离桌面窗框隐喻 |
| `things-proof` | A1 | product-proof・"clear structure / spatial motion" | 仅登记，未验证 | 01 或 04——"约束产品证据区的噪声" | do_not_copy 已注明"不把设备合成图当真实跨平台支持" |
| `zed-proof` | A1 | product-proof・"real UI as visual content" | 仅登记，未验证 | 01（Raw → Governed）——"用产品素材代替营销插画"，与「三」01 段找到的三张真实截图方向一致 | do_not_copy 已注明"不把编辑器语法套到所有专业对象"（Courtwork 的对象是 Matter/NDA，不是代码文件） |
| `raycast-navigation` | A1 | navigation・"shared product and marketing language" | 仅登记，未验证 | 不适用于 01–06 | 类别是全站 navigation，且 do_not_copy 明确"不照搬黑底彩色光晕"（与 PS-4 排除项冲突） |
| `lookback-continuity` | A2 | motion・"same object across views" | 仅登记，未验证 | 02——"局部放大保持对象连续性"，可能对应 PS-4 "标本步进的焦点移动" | — |
| `podium-transition` | A2 | motion・"object expands to detail" | 仅登记，未验证 | 02 或 04——"截图直接展开细节" | 与 PS-7 "无打字动画、无假光标"边界需要核对，展开动效是否合规待裁 |
| `horeca-performance` | A2 | performance・"sticky / selective choreography" | 仅登记，未验证 | 不直接落位于 01–06 单一段落 | 是全站性能/编排技巧条目，且"整套复杂动效"已被 do_not_copy 排除，与 PS-4 "无 scroll reveal" 冲突面较大 |

12 条中 5 条（`linear-hero`、`unlost-position`、`rk-navigation`、`raycast-navigation`、`horeca-performance`）不落在 01–06 任一段落内，属首屏/全站骨架/性能范畴；其余 7 条可初步对应到 02、03、01、04 四段，但全部仍是 `queued`／`pending`，未做原站二次核验，字面模式描述本身也来自"source chat 的假设"（notice 原句），**不构成已验证的设计依据**。

---

## 五、结论

1. 六站中五站（otty.sh、korren.dev、lpm.cx、twill.design、ped.ro）经 WebFetch 成功取回，首屏文字均直接存在于原始标记中，无 JS 亦可读；kairnai.com 两次均返回 403，其"原始文件↔渲染视图"并置做法未能核实。
2. korren.dev 的首帧不是截图而是可操作的脚本化终端演示；lpm.cx 的 demo 区文字明确自称"录制"而非真机直连，两者都不构成"真实运行"。
3. 六个指定 evidence 目录（final-integration-20260908、rc、cc-s-main-integration-20260909、fe03、fe03-main-integration-20260909、wk10b2-main-integration-20260908、se-continuity-20260908、harness-core-20260908；共八个，多于点名的六个目录名，均已核对）没有任何素材来自"发布 SHA"，代码基线分散在 `9ef1710`、`0a3b9b22f4…`、`bf44b8f1b0…`、`4fc3de24c0…`、`62556b7f6…`、`43e3dc058b…` 等六个以上互不相同的提交。
4. 01 Raw → Governed 有三张可用截图（`continue-in-work-1440-light.png` 词表现行，另两张为旧词表），但没有任何一张同时展示 Run 事件、Core surface 投影、recorded Context 三层；PS-2(b) 注明的三者来源映射仍待 EX-PS3。
5. 02 A matter in motion 完全"需捕获"：既无带 `sha256` 的只读回放 JSON，也无同一 Matter 连续步进的六张状态图；`rc/planned-fixture.html` 是已废弃、不在 STATIC allowlist 内的静态草稿，只可作反例登记。
6. 03 Why this architecture 无任何产品截图素材可用，因为它是编辑排版命题而非产品证据段；本卷未找到"需捕获"之外的第三种状态。
7. 04 Review 目前只有一张较旧基线的流程截图（`wk10b2-main-integration-20260908/run-chain.png`），review-surface 研究包里三条与 04 直接相关的工作（PR-RS-A/B/D）均未实现，"Review 是一等证据面"这一命题当前缺产品可视证据支撑。
8. 05 Evidence（Eval）有真实的 `se-continuity` JSON 与 `harness-core` 文字记录，八问结构可部分填出（`model: null` 与 G1 `not_run` 直接支持 PS-13 的 not yet 处理），但没有任何已排版的可视素材。
9. 06 Build 的命令与测试计数是真实可复现证据（各 README 均含可执行命令与实际通过数），但同样没有截图或仓库结构画面。
10. 既有 12 条参考索引全部仍是未核验的假设（`state:"queued"`），5 条不落在 01–06 任一段落，其余 7 条的可能落位与该条自身的 do_not_copy 排除项之间存在张力（如 `raycast-navigation` 与 PS-4 的 glow 排除相冲突），采用前需逐条重新核验原站，本卷不作是否采用的裁定。
