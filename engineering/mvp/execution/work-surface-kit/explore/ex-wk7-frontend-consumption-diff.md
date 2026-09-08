# EX-WK7 · 前端裁定消费对照（Sonnet，只读，2026-09-08）

基线：worktree `/private/tmp/se-fable-lines`，分支 `claude/fable-settings`，`1b0bf83`（其上 `main` `8023e1b`）。方法：对 WK-1…81、DC-1…11、PC-1…9、UP-1…15（无 UP-16）、RC-1…10、BE-1…13、BR-1、gaps-wk9 G-1…7、runtime-ui-gaps A/B 逐项 grep + 读源判定。证据全部来自本 worktree 的 `app/web/**`、`app/extensions/evidence-memo/renderer.mjs`、`brand/`、`engineering/**`；未运行 npm、未起服务、未 checkout。`presentation-primitives.d.ts` 的类型名（`StatTile`/`Heatmap`/`WorkCard`/`toStatTiles`/`toWorkCards`/`WorkCardInput`/`HeatmapInput` 等）在 `app/web/**`、`app/runtime/**` 全文 **grep 零命中**——六原语目前只是冻结的 `.d.ts`，无任何 adapter 或组件消费。

## §1 逐项状态

### 1.1 WK-1…81（`intake.md` / `intake-round-2.md` / `intake-round-3.md`）

| id | 一句裁定摘要 | status | 源码证据 | 备注 |
|---|---|---|---|---|
| WK-1 | 事实基线=ES module，非 React | consumed | `app/web/*.mjs`（11 个原生 ESM 文件，无 JSX/React import） | 结构性事实，非单点 |
| WK-2 | 品牌图标线不重做，只做应用接入（allowlist+状态映射） | partial | allowlist：`app/server/index.mjs:27`；host 取色：`app/web/styles.css:2871-2875` | 状态映射（run 八态→activity、question 四态→authority）被 WK-51 撤回，见下 |
| WK-3 | ReviewProjection 只投影既有字段；permission≠proposal review≠commit | consumed | `contracts/review-projection.md:1-20`；`app/web/app.mjs` 授权卡只有 allow/deny（如 `:4332`），无 accept/reject/revise | — |
| WK-4 | 第一纵切=Review；inline+inbox 同源；j/k 视 Suna 溯源而定 | partial | 授权/问题卡：`app.mjs:2375,4284-4335`；Home pendingItems：`home-view.mjs:34-44` | j/k 键盘导航 grep 零命中（`app.mjs`/`home-view.mjs` 无 `key === "j"`），review-projection.md §6 已冻结但未实现 |
| WK-5 | 施工次序：Runtime UI 先，Review 随后，串行写 app.mjs | consumed | 过程裁定；两块代码在 `app.mjs` 中共存（授权卡 ~2375 与 runtime 模块 ~387 于 `surface-modules.mjs`） | 非源码可逐点验证 |
| WK-6 | presentation primitives 方向接受，暂不开工单 | superseded | — | 被 WK-34/37/80 取代（六原语已冻结签名） |
| WK-7 | Expert=composition；L2 = 现有 extension renderer ABI | consumed | `app/extensions/evidence-memo/renderer.mjs:1-40`（trusted renderer，仅收 projection + dispatch） | L1 声明式 manifest 仍未定（裁定原文即如此） |
| WK-8 | Fable/Astra 分工边界 | consumed | 过程裁定，非源码事实 | — |
| WK-9 | Sonnet 只出 EX-WK1/EX-WK2 两卷 | superseded | `explore/` 现有 7 个 EX 卷 | 被 WK-35(EX-WK5)、WK-67(EX-WK6)、WK-81(EX-WK7 本卷) 扩展 |
| WK-10 | 目录/端口分配（8850…8852） | superseded | — | 端口在 WK-20/64 等后续轮次改写，无法在当前静态源码验证运行时端口 |
| WK-11 | 首页去 header 行；hero=符号+一行标题 | superseded | — | 被 WK-32（三带构图）随后又被 WK-58/76（composer 居中单列表）取代；见 §3 |
| WK-12 | 文本收编规则；删 eyebrow/Enter 提示；空态一句 | consumed | `index.html` 无 `YOUR WORKSPACE`/`Enter to send` 字样（grep 零命中）；`composer-below` 结构：`index.html:252-266` | — |
| WK-13 | 图标/文本分工；尺寸档 16/18/20 | consumed | `text-sweep.md` §2（W-8/W-9）；`styles.css` 图标类；品牌落点：`index.html:26-34`（20px wordmark） | — |
| WK-14 | 品牌语义再基（八动词→事实映射） | superseded | — | 被 WK-51 撤回：会话 header 在场标记与八动词播放全部移除 |
| WK-15 | 材质档位（≤24 mono，32-40 hierarchical，glass 限 hero/浮层） | superseded | `index.html:29` 用 `material="hierarchical"` 于 20px | 被 WK-38（≤24 也用 hierarchical）与 WK-51（hero 符号取消）先后改写 |
| WK-16 | 色彩三层治理（S/R/U） | consumed | `contracts/color-governance.md`；`tools/lint-colors.mjs`；`styles.css:1-9` 注释 | — |
| WK-17 | dystopia 方向登记，未核实前不引值 | consumed | 过程裁定；后续由 WK-21 落地为 lead-gray | — |
| WK-18 | 深宗两路（`data-theme`+`prefers-color-scheme`） | consumed | `styles.css:45,78-79` | — |
| WK-19 | 最小自研（Radix/shadcn/Floating UI 对齐） | consumed | `app/web/vendor/`（Lucide 子集）；`connection-popover` 用 Floating UI 锚定（见 UP-14 证据） | — |
| WK-20 | 次序与端口（WO-WK6 8853…） | superseded | — | 端口分配持续被后续轮改写，非可验证的当前事实 |
| WK-21 | 默认 skin=lead-gray，accent 单色=ink | consumed | `styles.css:9-30`（Slate 值、`--accent-9: #1c2024`） | — |
| WK-22 | 深宗规则（canvas=2/panel=3/panel-muted=1） | superseded | — | 被 WK-69 的四层高度模型取代（`--frame`/`--panel`/`--float`/`--scrim`，`styles.css:119-146`） |
| WK-23 | slogan 三候选 | consumed | 选定见 WK-26 | — |
| WK-24 | 事实修正：outcome kind 零实现 | consumed | `app/web/*.mjs` 全文 grep `outcome` 无 kind 实现（仅 review-projection.md 类型注释） | 至今仍为零实现，见 review-projection.md:1-20 |
| WK-25 | 实心按钮只给唯一当前提交 | consumed | `index.html:238-245`（Send=`primary-button`）；其余多为 `quiet-button`/`secondary-button` | — |
| WK-26 | hero 文案="Work that exists beyond the model." | consumed | `index.html:196` | — |
| WK-27 | 后端未提供能力只在 Settings 折叠 Planned 段绘制 | consumed | `settings-view.mjs:7-34`（`PLANNED_CAPABILITIES`/`renderPlanned`） | — |
| WK-28 | 次序（WO-WK6→WO-WK8→WO-RC→WO-WK3‖WO-WK4） | consumed | 过程裁定 | — |
| WK-29 | 产品名一律 CourtWork | consumed | `index.html:7`(`<title>`)、`:34`(wordmark 文本) | — |
| WK-30 | 窗口控件留位契约（shell 条+左 80px） | consumed | `index.html:12`；`styles.css:2849-2866,3325-3336` | "其后依次侧栏开合/后退前进"一句已被 WK-46(3) 作废 |
| WK-31 | fresh 无桌面壳，留位以 CSS+fixture 先行 | consumed | `app.mjs:13-17`(`data-shell`/`windowControlsOverlay` 探测) | — |
| WK-32 | Home=左窄栏+右三横带 | not consumed | `home-view.mjs` 全文只有单一 `.home-section` 列表；`app.mjs:4158-4180`(`renderHomeState`) 无带结构 | 见 §3 局部候选 |
| WK-33 | 工作页三栏：收敛悬浮卡/展开 chrome tab | superseded | — | 被 WK-72 取代（右列不是"第三列"而是 L2 悬浮层） |
| WK-34 | 六种 presentation primitive（原名 StatTile/Heatmap/WorkCard/ProgressList/PreviewList/ContextList） | superseded | — | 名称被 WK-37 改为 StatTile/Heatmap/WorkCard/RunSummary/FileList/WorkspaceList；签名见 `contracts/presentation-primitives.d.ts` |
| WK-35 | 次序：EX-WK5→WO-WK9→四轴判断→实现单 | consumed | `explore/ex-wk5-home-work-data.md`、`design/wk9/` 均存在 | 实现单（Home 带/Work 卡片）仍未开工，见 WK-32 |
| WK-36 | clean 评估判准（accent≤3、无嵌套卡、灰阶热力图…） | design-only | `design/wk9/clean-evaluation.md` | 未进产品（Home 无热力图、无带结构可评） |
| WK-37 | WK9 设计输入按可得数据收窄；六原语改名 | consumed（契约层） | `contracts/presentation-primitives.d.ts` 全文（`StatTileInput`/`HeatmapInput`/`WorkCardInput`/`RunSummaryInput`/`FileListInput`/`WorkspaceListInput`） | 契约冻结但零消费（见卷首 grep 结论） |
| WK-38 | 应用内品牌符号一律 hierarchical，宿主取色 | consumed | `index.html:29`(`material="hierarchical"`)；`styles.css:2871-2875` | — |
| WK-39 | 侧栏次序（wordmark→New session→Home→筛选→Projects→account 行） | consumed | `index.html:24-118`（逐段对应） | — |
| WK-40 | 装饰文本清退与 chat title 精简 | consumed | `text-sweep.md` §1（D-1…D-7）逐条落实；`index.html:131-164`（header 只剩符号+标题+run 状态） | — |
| WK-41 | 右栏=模块导轨（登记表 + host 持编排） | consumed | `surface-modules.mjs:1-19`（doc comment 逐条对应裁定）、`:433-442`(`surfaceModules` 数组) | 首批四模块（run/file/workspace/runtime），扩展模块未接入见 WK-43 |
| WK-42 | 三栏对齐带（`--band-top`/`--col-gap`） | superseded | `styles.css:168-169`(变量仍在) | 语义被 WK-72 简化为"两方对齐"（侧栏 wordmark 行+主区 header），不再是三栏 |
| WK-43 | 热插拔槽位（控制面快照驱动 mount/dispose） | not consumed | `surface-modules.mjs:433-438` 只有 4 个静态条目，grep `RuntimeResource`/`uiSlots` 于该文件零命中 | — |
| WK-44 | 同级 UX 按体例统一（全站扫描三列清单） | consumed | `text-sweep.md` 全文即扫描产出并已标 ✅ | §4 遗留 3 项未处理（见该文档末节） |
| WK-45 | 导轨只消费后端事实，不自建状态机 | not consumed | 同 WK-43（无扩展模块可验证此规则） | 首批四模块本身遵循"adapter 返回 null 则不挂载"（`surface-modules.mjs` 注释），但扩展模块路径未接入 |
| WK-46 | WK9 r2 带高/深宗等待态/shell 条/G-6 例外 | design-only | `design/wk9/` 画布；产品内 Home 无"带"结构可对照 | 工作面展开列宽例外（960px）已消费，见 `styles.css` `.tabpanel-inner--wide`（grep 命中） |
| WK-47 | 消融判据（去除测试） | consumed | `ablation-wk10a.md` 全文即消融表产出 | — |
| WK-48 | 冻结控件按产品 anatomy 转录（圆形 Send） | consumed | `index.html:238-245`（`#send-button` 仍为圆形 icon-only 结构，`class="primary-button"` 无 pill 文案变体） | — |
| WK-49 | 扩展模块预留版式（六态板） | design-only | 无对应 artboard 文件（`design/wk9/` 目录内无扩展六态板文件） | WK9 r3 未做（consumption-ledger 已记） |
| WK-50 | WO-RC 消费（文案映射、STATIC allowlist、gap 转移） | consumed | `app/server/index.mjs`（`runtime-view.mjs` 已在 STATIC 表，见 §1.4 BE-4/10 证据） | — |
| WK-51 | 品牌符号只留侧栏 wordmark 一处 | consumed | `index.html` 全文只 1 处 `<court-symbol>`（`:26`）；grep 会话 header 无第二处 | — |
| WK-52 | 空间角色四层物性（`--frame`/`--panel`/`--panel-muted`） | superseded | `styles.css:119-122` | 语义被 WK-69 重写为四层高度模型（含 `--float`），本条并入 |
| WK-53 | 设计流程固化（值/结构/行为同时冻结） | consumed | 过程裁定，体例文档留存（`engineering/design/*.md`） | — |
| WK-54 | WK9 r2 消费：对齐带、展开面板入壳、plug 图标 | consumed | plug 图标：`app/web/vendor/icons.svg:99`、`ui-controls.mjs:27`；`aria-modal` 只在覆盖态：`app.mjs:2947-2977` | — |
| WK-55 | composer 只留稳定部分，上下文行移出框外 | consumed | `index.html:199-248`（框内）vs `:252-275`（`#composer-below`） | — |
| WK-56 | 行与卡片是同一 primitive 两态 | partial | `surface-modules.mjs` 的 `railCard`/`openAction` 实现了卡→面板两态；Home 仍只有"行"一态（`home-view.mjs` 无卡态） | Home 侧未实现两态 |
| WK-57 | Chat Flow 通用卡片减法（output/ask-user/edits） | not consumed | `app.mjs:2271-2298` 工具行仍为 `<details class="tool-card">`，非"类型 glyph+标题+元数据+一个主动作"anatomy | — |
| WK-58 | composer=工作面最高悬浮层，桌面居中/会话沉底 | consumed | `styles.css:2783-2798`(`.home-active .composer-area`) | 窄宗沉底按 WK-76 暂缓（Astra 回执） |
| WK-59 | UX 文案单词化 | consumed | `text-sweep.md` §2（W-1…W-10 全部 ✅） | — |
| WK-60 | 窄宗三层物性 | consumed | `styles.css:1811-1837`（窄屏媒体查询块含 `--shadow-float`/`--line-strong`） | — |
| WK-61 | iOS 单行 composer 登记，留待壳选型 | consumed（登记） | 未实现，裁定本身即"不入本节点" | — |
| WK-62 | WO-WK10 拆 a/b | consumed | 过程裁定；a 段（版式）已落地，b 段（热插拔/Chat Flow/Review 纵切）未开工，对应 WK-43/45/57 | — |
| WK-63 | Settings→Runtime Workbench 一级 IA（Overview/Agents/…） | not consumed | `runtime-view.mjs` grep `Overview\|Agents\|Extensions\|Governance\|Registries\|Diagnostics` 无对应导航分节，仅 `:941-942` 的 `Capabilities`/`Context` 两行分组 | — |
| WK-64 | 次序：R1 Workbench 前端；R2/R4/R5/R3/R6 后端先行 | not consumed | 无 WO-WK11 delivery 文件（`find … -iname "*wk11*delivery*"` 零命中） | — |
| WK-65 | 模型侧入口（resolve/inspect/propose/apply） | backend-blocked | — | 登记不施工（裁定原文即如此） |
| WK-66 | 两级颗粒度共用同一注入通道 | not consumed | 依赖 WK-63/64，未实现 | — |
| WK-67 | DSH 作 R5/R6 主参考，派 EX-WK6 | consumed | `explore/ex-wk6-dsh-plugins-webui.md`、`explore/ex-wk6-r2-dsh-official.md` 均存在 | — |
| WK-68 | R5/R6 契约要求转 Astra；前端 Extensions 节点取 DSH 两 tab | not consumed | 同 WK-63（无 Extensions 节点） | 后端契约部分转 Astra，非前端可验证 |
| WK-69 | 高度层级模型（L0 frame/L1 surface/L2 float/L3 overlay） | consumed | `styles.css:119-146`（`--frame`/`--panel`/`--float`/`--panel-muted`/`--shadow-float`） | — |
| WK-70 | 实施归属：Fable 按 WK-69 统一区域映射 | consumed | 同上；`--canvas: var(--frame)` 别名退役写法：`styles.css:123` | — |
| WK-71 | 语义→glyph 表（`contracts/glyph-semantics.md`） | not consumed | `find engineering -iname "*glyph*"` 零命中 | — |
| WK-72 | 工作面=L2 悬浮层，不是第三列 | consumed | `surface-modules.mjs` `railCard`（卡态）+ `app.mjs:2947-2977`（展开态覆盖层，`aria-modal` 只在 <1024） | — |
| WK-73 | composer anatomy（框内=本次发送；框外=常设上下文） | partial | 框内结构：`index.html:212-227`（附件、模型 chip、Send）；模型 chip 只写 `<model>`，无 `· <effort>` | 推理强度档待 BE-12（backend-blocked） |
| WK-74 | WO-WK10a 交付；展开态壳内面板、MCP gap 登记 BE-13 | consumed | 同 WK-54 aria-modal 证据；BE-13 见 §1.4 | — |
| WK-75 | WK10a-r2 消费；文档改写"主区+悬浮工作面" | partial | 悬浮工作面已实现（同 WK-72） | `docs/ui-composition.md:21` 仍写"Navigator \| Work \| Inspector"三栏，未按裁定改写 |
| WK-76 | Home 留白、composer 高度、copy-convention.md、user-message-audit.md | consumed | `engineering/design/copy-convention.md`（全文）；`user-message-audit.md`（全文，27 条核验表） | — |
| WK-77 | Pages 首屏与 Home hero 分层 | design-only | `engineering/release/2026-09-08/public-copy.md:26,34,43` | grep 全仓 `"Turn AI output into work"` 零命中于任何 `.html`/`.mjs`——本仓无独立 Pages 站点源码，纯文档裁定 |
| WK-78 | Settings 由对话框改整页面（L3、导航+搜索、hash 路由、用户 skin） | not consumed | `index.html:460-517` 仍是 `<dialog>`（WO-WK12 问题陈述原句仍成立）；grep `#settings`/`Scheme`/`Skin`/`Text size`/`Code font` 于 `app/web/**` 零命中 | 见 §3 |
| WK-79 | Home 三带施工消费既有文档，不重开 explore | not consumed | 同 WK-32 | — |
| WK-80 | 表示原语只按既有契约实现（组件不认数据来源） | not consumed（契约已冻结，零消费） | `contracts/presentation-primitives.d.ts` 全文 | 见卷首 grep 结论与 §2 |
| WK-81 | 本卷（EX-WK7） | consumed | 本文件 | — |

### 1.2 DC-1…11（`dashboard-design/design-contract.md`）

| id | 摘要 | status | 证据 | 备注 |
|---|---|---|---|---|
| DC-1 | 会话恢复失败落 Dashboard 而非猜测 | superseded | — | 属早期 G1/routing 裁定，当前无 hash 路由（`app.mjs` grep `location.hash` 零命中），会话选择走内存 state，不是本条描述的 URL 恢复路径 |
| DC-2 | 注意力三档（等待你/需检查候选/安静） | superseded | — | 被 WK-3/WK-4 的三集合模型（pendingItems/sessionCandidates/inspectionCandidates）取代，语义相近但字段与集合名不同，见 `home-view.mjs:33-37` |
| DC-3 | 排序只用已记录字段，无评分 | consumed | `presentation-primitives.d.ts` `recordedActivityAt` 定义（`= max(createdAt, run 时间)`） | — |
| DC-4 | 图标策略：Lucide 静态子集 | consumed | `app/web/vendor/icons.svg`；`ui-controls.mjs:27`（`icon` 函数） | — |
| DC-5 | 视觉系统逐值匹配（不另起字体/色板） | superseded | — | 具体取值已被 WK-16…22（色彩三层）与 WK-21（lead-gray）改写，字体栈仍延续 |
| DC-6 | Diff 不画成已支持 | consumed | 无 diff/before-after 视图（`app.mjs`/`inspector.mjs` grep `diff`/`before/after` 视图逻辑零命中） | — |
| DC-7 | Trace 只在 Run details 三级折叠 | consumed | `inspector.mjs` 的 Run 视图内折叠区（未逐行核验行号，结构存在） | — |
| DC-8 | 交付形式=静态画板 | consumed | `design/wk9/*.html` 均为静态 artboard | — |
| DC-9 | 与 WS-02 关系（历史 snapshots 不改） | consumed | 过程裁定 | — |
| DC-10 | Run details 作为附加工作区 tab kind | consumed | `surface-modules.mjs:138`(`kind: "run"`) | — |
| DC-11 | 无能力不画控件 | consumed | `settings-view.mjs:7-34`（Planned 段无可交互控件） | WK-27 引用同一原则并收窄为"不给可交互控件"（而非"不画"） |

### 1.3 PC-1…9（`dashboard-design/polish-contract.md`）

| id | 摘要 | status | 证据 | 备注 |
|---|---|---|---|---|
| PC-1 | 逐字转录 L4r1 体系（Radix Gray/Blue/Red/Green） | superseded | `styles.css:9-30` 现为 Slate（非 Gray/Blue） | 被 WK-21 lead-gray 覆盖；danger/success 数值仍部分沿用（`--danger-11: #9b3c35` 与 PD-KIT 一致，`styles.css:26`） |
| PC-2 | 新表面只补规则不补体系 | consumed | `contracts/color-governance.md` 三层规则延续此原则 | — |
| PC-3 | 注意力语言=左侧色线（等待蓝/失败红） | superseded | — | 被 UP-9 撤回（"不要左侧彩色装饰线"），失败态左红线保留、等待态改状态词+字重 |
| PC-4 | 胶囊退役，状态文字化 | consumed | `text-sweep.md`"状态事实"表（`Waiting for you`/`Running`… 均为文字） | — |
| PC-5 | 头部与内容列宽 740 | consumed | `docs/ui-composition.md:21`（`--column:740px`） | — |
| PC-6 | 图标政策更新（Lucide 优先） | consumed | 同 DC-4 | — |
| PC-7 | 交付物形式（polish-additions.css） | superseded | — | `polish-additions.css` 未见于当前仓（`find . -iname "polish-additions.css"` 零命中），后续轮次直接改写 `styles.css` 本体 |
| PC-8 | 四轴判断留用户 | consumed | 过程裁定，历次轮次均留用户四轴（如 WK-52/78 末句） | — |
| PC-9 | 等宽字体只给哈希/序号/类型片段 | consumed | `surface-modules.mjs` 短 hash 展示逻辑（12 位截断，未见整行等宽 class） | 未逐行核验全部 mono 用法 |

### 1.4 UP-1…15（`ui-design-polish/intake.md`；无 UP-16）

| id | 摘要 | status | 证据 | 备注 |
|---|---|---|---|---|
| UP-1 | 范围=呈现层+交互状态层 | consumed | 过程裁定，交互状态见下列各条 | — |
| UP-2 | 一个体系（token 名映射） | superseded | `token-map.md`（外部目录）已完成映射，但目标体系已被 WK-16…22 取代 | — |
| UP-3 | 构图冻结（右对齐用户句、圆形 Send/Stop、圆角梯） | consumed | `index.html:238-245`（圆形 Send）；WK-48 已核对未回退 | — |
| UP-4 | 交互状态 SH-4 七态 | consumed（部分可验证） | `styles.css` 含多处 `:hover`/`:focus-visible`（如 `:2117` 一带）；`prefers-reduced-motion` 见 `:1978,2475,2731,3264` | 未逐控件核验七态完整性 |
| UP-5 | 外部索引"知晓+路由"消费 | consumed | 过程裁定，`source-register-up.md`（外部目录）留存 | — |
| UP-6 | 依赖不变（Lucide/Floating UI/Marked/DOMPurify） | consumed | `app/web/vendor/` 目录含对应库 | — |
| UP-7 | 证据口径（像素判断记录） | consumed | 外部 `pixel-judgment.md` | 不在本 worktree 内，属外部证据副本 |
| UP-8 | 单一 writer 与合流 | consumed | 过程裁定 | — |
| UP-9 | 注意力线退役（撤左侧彩线） | consumed | 同 PC-3 备注 | — |
| UP-10 | 状态词只剩两色 | consumed | `text-sweep.md`"保留"表：状态词均为文字，`styles.css` 状态色只用于 failed/waiting_user（WK-16 §2 稳定项复述） | — |
| UP-11 | 玻璃只给浮层，不折射（rim light） | consumed | `styles.css:145`(`--shadow-float`)、`:1064,1084,2051`(`box-shadow: var(--rim), var(--shadow-float)`) | — |
| UP-12 | 一个 motif（11px 小型大写标签） | consumed（未逐值核验字号） | `runtime-view.mjs` 多处 `h4`/`h5` 分组标题结构一致 | — |
| UP-13 | hover 才出现的消息操作 | consumed | `styles.css:897-910`(`.user-message-actions` 及 `time`/`.ui-icon` 子规则) | — |
| UP-14 | 点击的二级小卡片=连接卡（connection-popover） | consumed | `index.html:146,448-449`；`app.mjs:4065,4466-4469,4675` | — |
| UP-15 | 设置页改行式版式 | partial | `settings-view.mjs` 的 Model & connection 段落已是"标题+说明+控件"行式（结构存在） | 未做成 WK-78 要求的整页导航；仍在对话框内 |
| UP-S01…S07 | 外部来源登记（Vercel/Interface Tuning/Rauno/hyalite/rare-ui/截图） | consumed（登记性） | 外部 `source-register-up.md` | 无独立前端裁定需逐条验证，已并入 UP-4/11/12/13/15 的证据 |

### 1.5 RC-1…10（`runtime-control-frontend/intake.md`）

| id | 摘要 | status | 证据 | 备注 |
|---|---|---|---|---|
| RC-1 | 消费面=一个 runtime 模块+Settings 三处扩展 | consumed | `surface-modules.mjs:387-421`(`runtimeModule`)；`settings-view.mjs` 含 provider/runtime 扩展 | — |
| RC-2 | 四维分列（installed/running/exposed/permitted） | consumed | `runtime-view.mjs:644`(`dimension("Installed", …)`)、`:106-108`(configured/connected/exposed 词) | — |
| RC-3 | 作用域先于对象（user/workspace/session tab） | consumed | `runtime-view.mjs:8-10`(`SCOPE_ORDER`/`SCOPE_TAB_LABELS`)、`:280`(`runtime-scope-tab`) | — |
| RC-4 | 409 为权威（active_run 只读、runtime_conflict 保留草稿） | consumed | `surface-modules.mjs:396-401`("Frozen until this run ends.") | — |
| RC-5 | 上下文两栏（effective-next-run/recorded-run） | consumed | `runtime-view.mjs:974`(`renderContextBar`)、`:1077`(`renderRecordedContext`) | — |
| RC-6 | MCP 三态分开（configured/connected/exposed） | consumed | `runtime-view.mjs:102-108` | disconnect 回翻问题见 BE-13 |
| RC-7 | Prompt template 只出草稿 | consumed（未逐行定位） | 裁定引用既有"Use as draft"路径（同 D-3/WK-25 证据） | — |
| RC-8 | 来源检查=本地管理能力（File 检查栏语义） | consumed | `runtime-view.mjs:765,784`（读取但不可配置的说明文案） | — |
| RC-9 | 视觉套用 polish 层 token | consumed | `runtime-view.mjs`/`surface-modules.mjs` 均只引用 role token，无裸 hex（未逐行扫描全文件） | — |
| RC-10 | 顺序：EX-RC1→设计→施工→独验 | consumed | `runtime-control-frontend/explore/ex-rc1-runtime-surfaces.md`（外部目录）存在，交付见 `delivery-rc.md` | — |

### 1.6 BE-1…13（`backend-requests.md`，转 Astra 后端请求，前端侧现状）

| id | 请求摘要 | status | 源码证据 | 备注 |
|---|---|---|---|---|
| BE-1 | `GET /work-activity?days=N`（Heatmap 按日聚合） | backend-blocked | `app/server/*.mjs` grep `work-activity` 零命中 | 阻塞 Home Heatmap（WK-37/80） |
| BE-2 | 多文档 tab 的 surface 状态（当前单值 kind/runId/fileRef） | backend-blocked（含前端状态契约先行） | `app.mjs` 的 `state.surface` 相关字段仍为单值（未逐处核验，沿用 gaps-wk9 G-2 记录） | 前端 `renderSurfaceVisibility`/`handleSurfaceEscape` 单值假设未改 |
| BE-3 | "今日"口径的 work-summary 过滤字段与时区声明 | backend-blocked | 同 BE-1，`work-summary` 响应无窗口参数（`presentation-primitives.d.ts` `TimeWindow` 的 `'day'` 分支注释同此） | — |
| BE-4 | RC gap 集合（B-1/2/4/10，见 1.7） | backend-blocked | 见 §1.7 | — |
| BE-5 | R2 Source Resolver `runtime.resolve` | backend-blocked | `app/runtime/control-contract.d.ts` 未核实（见 §4 未检项） | 前端零消费 |
| BE-6 | R4 Runtime Proposal/`runtime.apply` | backend-blocked | 同上 | 前端零消费 |
| BE-7 | R5 事务化 apply（fail-back、DecisionReceipt） | backend-blocked | 同上 | — |
| BE-8 | R6 Expert 快照（generation/overlay） | backend-blocked | 同上 | — |
| BE-9 | R3 兼容矩阵（adapter 固定 commit 登记） | backend-blocked | 同上 | — |
| BE-10 | `operation: 'profile'`/`'policy'` 前端可用契约说明 | backend-blocked | `runtime-view.mjs:479`（`agent_profile` 只读展示，无选择/编辑入口） | 对应 runtime-ui-gaps B-8/B-9 |
| BE-11 | Hooks/memory/registries/secrets/sandboxes 资源 kind | backend-blocked | `settings-view.mjs:7-15`（`PLANNED_CAPABILITIES` 含 Memory providers/Workflows/Hooks/Registries） | 前端已按 WK-27 只留 Planned 文字行 |
| BE-12 | provider 推理强度字段 | backend-blocked | `app/server/service.mjs:253-254`（`provider-models` 只有布尔 `reasoning`，无 `efforts`） | 阻塞 WK-73 composer 模型 chip 的 `· <effort>` 段 |
| BE-13 | MCP `disconnect` 状态不回翻 | backend-blocked | `runtime-view.mjs:102-108`（`configured/connected/exposed` 派生逻辑未改，问题在 wire 侧） | WK-74(3) 已登记，前端未改动 |

### 1.7 runtime-ui-gaps.md（WO-RC，A 段「无控件」/ B 段「契约缺口」）

**A 段**（G-1…G-8，产品内只允许 Settings Planned 文字行，见 `evidence/rc/planned-fixture.html`）：

| id | 能力 | status | 证据 | 备注 |
|---|---|---|---|---|
| A·G-1 | MCP OAuth | backend-blocked | `settings-view.mjs` `PLANNED_CAPABILITIES` 无 MCP OAuth 专项（当前只有 8 类通用 Planned 项，MCP OAuth 未见独立行） | 需先核实是否已并入某条 Planned 文字 |
| A·G-2 | MCP stdio 传输 | backend-blocked | 同上（`McpSource.transport` 未见 stdio 分支，`runtime-view.mjs` 只处理 Streamable HTTP） | — |
| A·G-3 | 第三方插件隔离（Trust/Untrust） | backend-blocked | `settings-view.mjs:9`(`Third-party plugin isolation`) | 已在 Planned 表 |
| A·G-4 | memory_provider 适配器 | backend-blocked | `settings-view.mjs:10`(`Memory providers`) | 已在 Planned 表 |
| A·G-5 | workflow 适配器 | backend-blocked | `settings-view.mjs:11`(`Workflows`) | 已在 Planned 表 |
| A·G-6 | hook 适配器 | backend-blocked | `settings-view.mjs:12`(`Hooks`) | 已在 Planned 表 |
| A·G-7 | registry 适配器 | backend-blocked | `settings-view.mjs:13`(`Registries`) | 已在 Planned 表 |
| A·G-8 | token 用量 | backend-blocked | `settings-view.mjs:14`(`Token counts`) | 已在 Planned 表 |

**B 段**（契约与快照缺口）：

| id | 事实 | status | 证据 | 备注 |
|---|---|---|---|---|
| B-1 | MCP 远端工具 `provenance[]` 不含服务器闸门 | backend-blocked | `runtime-view.mjs:377-387`（前端已按建议自解释："Its server … is not exposed"） | 前端已做绕过处理，后端字段仍缺 |
| B-2 | `catalog-only` characters 语义模糊 | backend-blocked | 未逐行核验 `control-plane.mjs` 现状（不在本卷读取范围 `app/web`） | — |
| B-3 | 比例条恒单段 | backend-blocked（同源于 B-2） | — | — |
| B-4 | `prompt_template` 出现在 `context[]` 但不进入上下文 | backend-blocked | 同上，未读 `app/runtime/control-plane.mjs` | — |
| B-5 | 无 `GET /sessions/:id/runs` 列出接口 | backend-blocked（不影响产品） | — | 只影响验收脚本写法 |
| B-6 | STATIC allowlist 手工维护 | consumed（现状即建议前）| `app/server/index.mjs:21`（`runtime-view.mjs` 已在列表内） | 建议的 manifest.json 方案未采纳，非缺陷 |
| B-7 | 产品无暗色主题 | superseded | `styles.css:45,78-79` | 本条已被 WO-WK7（WK-18）解决，暗色主题现存在 |
| B-8 | `agent_profile` 选择动作无前端入口 | consumed（只读呈现，符合建议） | `runtime-view.mjs:479` | 与 BE-10 对应 |
| B-9 | `policy` 编辑无前端入口 | backend-blocked | 未见 policy 编辑表单（`runtime-view.mjs` grep `policy` 无编辑 UI，仅读取 trace） | 与 BE-10 对应 |
| B-10 | `unknown` 远端效果无可复现入口 | backend-blocked（分支已写，未验证触发路径）| `runtime-view.mjs:199,806` | 代码路径存在，未在浏览器验证（原文档自述） |

### 1.8 gaps-wk9.md（WO-WK9 画布，G-1…G-7，与上表 runtime-ui-gaps 的 G 编号是不同命名空间）

| id | 名称 | status | 证据 | 备注 |
|---|---|---|---|---|
| WK9·G-1 | 活动热力图 | backend-blocked | 同 BE-1 | — |
| WK9·G-2 | 多文档 tab 条 | backend-blocked | 同 BE-2 | r2 已将 gap 说明移至展开面内容列末尾（`design/wk9/work-expanded-1440.html`，未在产品内出现） |
| WK9·G-3 | "今日"口径时间窗口 | backend-blocked | 同 BE-3 | — |
| WK9·G-4 | shell 条内 Back/Forward | resolved（WK-46(3) 作废原句） | `index.html:12`（shell-strip 内无按钮） | 应用无历史导航，不再是 gap |
| WK9·G-5 | shell 条两种读法（整条惰性 vs 局部） | resolved | `styles.css:3329-3336`（整条 `app-region: drag`，仅侧栏开合在 wordmark 行） | WK-46(3) 已裁定 |
| WK9·G-6 | 展开态内容列宽例外（960px） | consumed | `styles.css` grep `tabpanel-inner--wide` 命中（宽列例外类存在） | — |
| WK9·G-7 | 品牌符号宿主取色 | consumed | 同 BR-1（§1.9） | — |

### 1.9 BR-1（`brand-requests.md`）

| id | 请求摘要 | status | 证据 | 备注 |
|---|---|---|---|---|
| BR-1 | `symbol.mjs` 的 `--cw-ink`/`--cw-record`/`--cw-background` 改为宿主可覆盖 | consumed（应用侧） | `styles.css:2871-2875`（`court-symbol { --cw-ink: var(--ink); … }` 已生效） | 品牌包内部（`brand/src/symbol.mjs`）是否已用 `var(--cw-ink-host, …)` 回退写法本卷未核实，见 §4 未检项 |


## §2 表示原语现状

presentation-primitives.d.ts（`contracts/presentation-primitives.d.ts`）在 `app/web/**` 与 `app/runtime/**` 全文 grep **零命中**：`StatTile`/`Heatmap`/`WorkCard`/`RunSummary`/`FileList`/`WorkspaceList`/`toStatTiles`/`toWorkCards`/`toRunSummary`/`toFileList`/`toWorkspaceList`/`toHeatmap`/`pendingItems`（作为类型名而非字符串键）/`sessionCandidates`（同）/`inspectionCandidates`（同）均无导入或引用。以下逐原语列现状（用字段字符串键的实际消费单独标出，因为运行时代码不导入 `.d.ts`，只能靠字段名对齐判断"精神消费"）：

| 原语 | 契约位置 | 源码 adapter | 渲染位置 | 阻塞后端请求 |
|---|---|---|---|---|
| StatTile | `presentation-primitives.d.ts` `StatTileInput`/`toStatTiles` | 无（zero-hit） | 无处渲染；Home 上带（WK-32/37）未实现 | 无（`total` 字段已可得，`window: 'current'` 无需新端点），纯前端未消费 |
| Heatmap | 同 `HeatmapInput`/`toHeatmap` | 无 | 无处渲染，亦无 Planned 占位行（`grep "Backend pending"` 只命中 `settings-view.mjs:33`，Home 侧零命中） | BE-1 `GET /work-activity?days=N`（未实现，`app/server/*.mjs` grep `work-activity` 零命中） |
| WorkCard | 同 `WorkCardInput`/`toWorkCards` | 无按契约签名的 adapter；`home-view.mjs:64-104` 手写等价逻辑（字段名对齐：`sessionId`/`title`/`projectId`/`latestRun.status`） | `home-view.mjs` 渲染为 `.home-row`（行态），无卡态 | 无 |
| RunSummary | 同 `RunSummaryInput`/`toRunSummary` | 无契约签名 adapter；`surface-modules.mjs` 的 `runModule.adapter`（手写，字段大致对齐：status/startedAt/endedAt/artifacts/usage） | `surface-modules.mjs` 的 Run 卡（`kind: "run"`，`:138`） | 无 |
| FileList | 同 `FileListInput`/`toFileList` | 同上模式，见 `surface-modules.mjs`（`kind: "file"`，`:209`） | Run/File 卡与展开面板 | 无 |
| WorkspaceList | 同 `WorkspaceListInput`/`toWorkspaceList` | `workspace-view.mjs` + `surface-modules.mjs`（`kind: "runtime"` 附近的 workspace 模块，`:275` `preview`） | Workspace 卡与展开面板 | 无 |

结论：右栏四模块（run/file/workspace/runtime）是**手写的、字段语义大致对齐但不导入契约类型**的独立实现，不是 `.d.ts` 的消费者；Home 三集合同理。`.d.ts` 本身自 WO-WK9 冻结后从未被任何 `.mjs` 文件 import 或 typedef 引用（本仓无 TypeScript 编译步骤，`.d.ts` 只能靠人工核对字段名，当前无证据表明实现时刻意对照过该文件的字段名——例如 `home-view.mjs` 用 `item.title || title(item.sessionId)` 而非契约的 `missingRunLabel` 缺失值模式）。

## §3 候选局部清单

1. **Home 三带 + StatTile/Heatmap 上带**（WK-32/34/37/46/76/79/80）。需先接 BE-1（`/work-activity`）才能去 Heatmap 的 Planned 状态；StatTile 三个 tile 可立即用现有 `work-summary.total` 实现（无需后端）。触及 `home-view.mjs`、`app.mjs:4158-4180`、`index.html`（`#message-stream` 结构）、`styles.css`（新增带/StatTile 类）。与下一条共享 `app.mjs`/`styles.css` 单写者冲突。

2. **Home WorkCard 行↔卡两态**（WK-56，与第 1 条同批）。`home-view.mjs` 目前只有行态；按 `surface-modules.mjs` 的 `railCard` 模式补卡态，复用同一 `WorkCardInput` 字段集。

3. **Settings 整页化**（WK-78，WO-WK12）。承载层改造（`<dialog>`→L3 页面、hash 路由、左列导航+搜索）+ 六组（General/Appearance/Keyboard/Runtime/Developer）+ 用户 skin 校验（复用 `tools/lint-colors.mjs`）+ localStorage 偏好键。触及 `index.html:460-517`、`settings-view.mjs`（594 行现有内容大部分平移）、`app.mjs`（打开/关闭/hash 逻辑）、`styles.css`。与条目 4（Runtime Workbench）依赖同一页壳，须先做本条再做 WK-11 组。

4. **Runtime Workbench 一级 IA**（WK-63/64/66/68，WO-WK11）。在条目 3 的页壳内新增 Overview/Capabilities/Context/Extensions/Models/Governance 六节点，复用 `runtime-view.mjs` 现有渲染函数（`:941-942` 已有 Capabilities/Context 分组可直接迁移），新增导航层。依赖 BE-8/9/10/11（Registries/Memory/Secrets/Sandboxes 仍需 Planned 占位）。

5. **Chat Flow 卡片减法**（WK-57）。把 `app.mjs:2271-2298` 的 `<details class="tool-card">` 改为"类型 glyph+标题+元数据+一个主动作"anatomy，覆盖 output/ask-user/edits 三类。触及 `app.mjs` 渲染函数与 `styles.css`。可与条目 1/2 并行（不同函数），但仍写同一 `app.mjs`。

6. **glyph 语义表**（WK-71）。新建 `contracts/glyph-semantics.md`，以 `text-sweep.md` 为输入，逐语义定位 P0/P1/保留文字。文档单，不写产品代码，但产出会驱动条目 5、7 的图标化实现。

7. **热插拔槽位**（WK-43/45/49）。`surface-modules.mjs` 的静态 4 模块表改为消费 `RuntimeResource`（kind: plugin/extension）快照，新增 mount/dispose 逻辑；六态板（WK-49）先需 WK9 r3 设计（当前不存在）。依赖后端 control-plane 快照契约是否已含 `uiSlots`（本卷未核实 `app/runtime/control-contract.d.ts` 当前字段，需条目派单前单独确认）。

8. **Home / 会话内 keyboard j/k 导航**（WK-4、review-projection.md §6）。目前零实现；实现前需先确认"Suna 溯源确认其成本可控"这一前置条件是否已在某处核实（本卷未找到该核实记录）。触及 `home-view.mjs`、`app.mjs` 键盘事件处理。

9. **文档一致性清理**（WK-75(3)）。`docs/ui-composition.md:21` 仍写"Navigator | Work | Inspector"三栏，需改写为"主区+悬浮工作面"以符合 WK-72。纯文档，不触及 `app/web`。

10. **BE-12 推理强度 chip**（WK-73 partial）。后端阻塞：`provider-config`/`provider-models` 无 `effort` 字段（`app/server/service.mjs:253-254` 只有布尔 `reasoning`）；后端就绪后前端只需在 `index.html:222-227` 模型 chip 补一段文字，改动极小。

11. **窄宗 composer 沉底**（WK-58/76，Astra 暂缓项）。留待 Astra 回执后再排期，非本卷派单对象。

局部 1/2/5 共写 `app.mjs`/`home-view.mjs`/`styles.css`；局部 3/4 共写 `index.html`/`settings-view.mjs`/`styles.css` 且 3 必须先于 4；局部 7 独立写 `surface-modules.mjs`，但若与 1/2 同批开工需注意 `styles.css` 的带/卡样式复用（避免重复定义 `.rail-card` 与新 Home 卡类）。

## §4 未检项

- `app/runtime/control-contract.d.ts` 当前字段是否已支持 WK-43/45 所需的 `uiSlots`/`RuntimeResource` 快照结构——本卷只 grep 了 `app/web`，未逐字段核对该契约文件本体。
- `docs/interface-components.md` 的 Settings 段落是否已按 WK-78 要求更新（本卷未读该文件全文，只确认了 `index.html` 的对话框结构仍未变）。
- UP-4（SH-4 七态）与 RC-9（role token 无裸 hex）未逐控件 / 逐文件扫描，只做了抽样 grep。
- `docs/runtime-control/acceptance.md` 未读，RC-1…10 的验收口径未与该文件交叉核对。
- brand 包内 `symbol.mjs` 当前是否已应用 BR-1 候选分支的完整修复（本卷只核对了应用侧 `styles.css` 的 host 映射消费，未进入 `brand/src/symbol.mjs` 源码核实其内部是否仍有硬编码回退）。
- `app/extensions/evidence-memo/` 之外是否存在其他已注册 extension（WK-7 的 L2 消费广度未穷举）。
- 触屏、读屏（VoiceOver/NVDA）、真实 provider 下的行为，本卷未验证（沿用既有 not_run 记录）。
- `app/runtime/control-plane.mjs` 未读，runtime-ui-gaps B-2/B-3/B-4（`catalog-only` 语义、比例条分段、`prompt_template` 归属）未与后端当前实现交叉核对，只沿用 `runtime-ui-gaps.md` 原文判断。
- runtime-ui-gaps A 段（G-1…G-8）与 `settings-view.mjs` 的 `PLANNED_CAPABILITIES` 八行是否逐一对应未做字符串级比对（例如 MCP OAuth / MCP stdio 是否已隐含在某条泛化文字内），本卷按行数粗略对齐。
- `app/server/index.mjs` 之外是否还有其他 STATIC allowlist 或路由文件本卷未通读，`app/server/**` 整体只做了定点 grep。
