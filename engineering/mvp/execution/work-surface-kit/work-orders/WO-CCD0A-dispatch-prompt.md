# CC-D0-a 派单提示词（Fable，2026-09-09；以 `opus-wo-low` 派出；由 fresh Fable 会话派）

派单方式：Agent 工具，`subagent_type: opus-wo-low`（effort: low），后台运行。树与数据目录已建。以下为提示词全文。

---

你是 Claude Opus，CourtWork 前端的单一 writer，执行第五轮工单 CC-D0-a（Home 模块带外壳与现有事实投影）。Fable 派单，Astra 独验与合流；你只做作者验证，不自称独验。

## 树、分支、端口
- worktree（已建好，基线 main `fa90763`，2026-09-09 由 fresh Fable 从 `0b5ccd2` 重置，期间 main 只有后端与证据变更、app/web 未动）：/private/tmp/se-agent-ccd0a，分支 `claude/cc-d0a-home-modules`。只在这里工作；不碰 /Users/lesprivilege/Projects/Courtwork 或其他树。
- 应用端口 8905，数据目录 /private/tmp/se-agent-ccd0a-data（已建、为空，可建子目录）；MCP 线路 fixture 用 8906；CDP 端口自选 20000 起。结束后停掉自己的全部进程。8850–8861、8810、8817、8818、8887–8904、8921–8953 是别人的，不动。
- 不读取任何凭据文件；全程 local-fake / loopback。

## 先读（顺序，均在你树内，除注明者）
1. engineering/mvp/execution/work-surface-kit/work-orders/WO-CC-round5.md §CC-D0-a —— 工单全文：§VI 交接契约头（intent / constraints / existing_system / references / unresolved 两条）、做什么 1–4、写权。注意 constraints.density（次级带以 `--home-column` 820 为上限按剩余宽度分配、容不下换行）与 business_states（六态逐态注明事实来源或 not_applicable；不展示无契约的 stale / not connected）。
2. engineering/mvp/execution/work-surface-kit/intake-round-3.md：§4h WK-96 / 97（Home 三带、0.56）、§4s WK-114（CC-D0 范围：Attention 不成为第二个名字；Simple 默认；不放死模块；Models 不做第二处展示，只多一行 "Manage connections" 入口；显隐走 cw:prefs）、§4u WK-116 R4D-2（D0-a / D0-b 拆分）、§4v WK-117 (b)（不安装 Activity / Usage 占位、不写 "until BE-nn"；具体待办优先于统计，HOME-6 保持；0.56 是基线非原则）、§4w WK-118、§4y WK-120、§4ab WK-123（Auto 与 Question 卡行为契约，只作参照）、§4ah WK-129（Control Grammar：boolean 偏好 → Switch、小枚举 → Segmented；Inspector PropertyRow 的 modified / reset 只对本设备偏好行）。
   若某节尚未合入你的树（main `fa90763` 含至 WK-127），只读路径：/private/tmp/se-fable-r4d/engineering/mvp/execution/work-surface-kit/intake-round-3.md。不要写那棵树。
3. engineering/mvp/execution/work-surface-kit/explore/ex-cc2-home-modules.md（现状量测、数据接缝表、显隐存储建议）；misfit-ledger.md M-7；engineering/design/clean-cool-2026-09-09/shell-refinement.md §"首页模块退为辅助" / §"模块首页的解耦约定"；engineering/design/attention-surface-2026-09-09/README.md §"常驻Attention与Home"（Home 可选摘要只指向同一对象；本单不实现 Attention，只留模块 id 与位置的可扩展性）。
4. engineering/design/ui-composition-standard.md（Home 尺寸 token、composition law）；copy-convention.md §3；contracts/ui-state-vocabulary.md（六态只能映射到已有事实）；delivery-cc-w.md（体例与 §16 anti-slop 门）。
5. 代码：app/web/home-view.mjs（三带、`renderHomeBand`、StatTile、WorkCard、`emptyLabels`、`connection-line`）、presentation-adapters.mjs、app.mjs 的 Home 渲染与 `measureHomeLead()`（约 3179–3199）与 DOM 重排（约 3011–3025）、settings-view.mjs 的偏好通道（`PREFERENCE_DEFAULTS` / `readPreferences` / `writePreferences`、Appearance 组）；styles.css `--home-column`、`.home-top-band`、`.stat-row`、`.home-card`；evidence/cc-w-main-integration-20260909/ 的脚本作为回归底本（composition-checks 含 HOME-1…7、SETTINGS-*、WORK-*、SHELL-1…5）。

## 做什么（WO §CC-D0-a 1–4，要点）
1. Settings › Appearance 增 `Home layout: Simple / Modules`（本设备偏好，cw:prefs，默认 Simple；控件按 WK-129：两值枚举用 Segmented）；Simple 态与现状逐像素一致（HOME-1…7 不变）。
2. Modules 态：composer 之后渲染一条次级模块带；模块注册表（id、标题、数据来源、六态各自的事实来源或 not_applicable、折叠 / 移除、宽度分配 ≤820 与换行规则）；本片只安装 Today（原位，三个 tile 不改词）与 Models 入口行（一行："Manage connections" → Settings › Models；不重复 composer chip 的模型名）；Activity / Usage / Mail / Calendar / Attention 只在 `contracts/home-modules.md` 声明，不渲染、不占位、不写 "until BE-nn"；模块 id 与导航位置为未来 Attention 摘要留可扩展性，不画空卡、不造插件框架。
3. 显隐与折叠偏好走 cw:prefs（与 Appearance 同通道）；键盘顺序 composer → Today → 模块带 → 列表；折叠控件 ≥44（390）。
4. HOME-1 / HOME-6 在 900 与 1058 两个视口高各量一次（Simple 与 Modules 两态）；390 沉底顺序不变；具体待办（Waiting for you 列表）在 Modules 态不得被推出首屏可见区。
5. 消融轮 + anti-slop 门（特别是 fake dashboard density、gratuitous cards、decorative badges）；hierarchy 项加一问（字号 / 字重差是否足以让层级不靠颜色与框线成立，WK-120）。

## 写权与禁令
- 可写：app/web/**、app/tests/**、engineering/mvp/execution/work-surface-kit/contracts/home-modules.md（新）、engineering/design/copy-convention.md、text-sweep.md、delivery-cc-d0a.md、evidence/cc-d0a/（仓根）。
- 不改：app/server、app/runtime、app/core、domains、brand、HTTP 契约、其他 contracts、intake；不新增读取、端点、字段；不画热力图；不引依赖；不引新色、新字、新图形；新 web 模块需静态准入时向 Astra 提 allowlist 路径请求，不自己改 server。

## 交付
- 提交到 `claude/cc-d0a-home-modules`，显式路径 git add；提交信息末尾加 `Co-Authored-By: Claude Opus <noreply@anthropic.com>`。
- 写 engineering/mvp/execution/work-surface-kit/delivery-cc-d0a.md，体例沿 delivery-cc-w.md：基线 SHA、commit 表、改动文件、消融表、五轮收敛表（Home Simple / Modules × 1440 / 390）、状态矩阵（模块带、Today、Models 入口行、布局开关）、text-sweep 增量、断言结果原文（HOME-1…7 两态两高、新增 HOME-8…）、两条 unresolved 的取舍、既有回归全量（RC 三支、composition、shell、Models、探测、primitive、cc-s / cc-w checks、FE-T01 / T03 / T06 / T07 / T11）、allowlist / 后端请求（BE-1/3/25、BE-29 保持登记）、未检项分列、待裁定、"哪一像素改变了哪一判断"、anti-slop 门自查。证据放 evidence/cc-d0a/。
- 作者验证至少：`npm --prefix app ci`、`npm --prefix app test`、`node tools/lint-colors.mjs`、`node tools/lint-materials.mjs`、`node tools/contrast-report.mjs`、`npm --prefix app run smoke`，浏览器脚本沿 evidence/cc-w-main-integration-20260909/ 的方式逐字复制只改端口。视觉四轴留用户。
- 冲突或缺口：记入"待裁定"，选最保守实现继续，不停工。

最终回复只需：分支头 SHA、delivery-cc-d0a.md 路径、验证结果一行、待裁定项列表、未做项与原因。
