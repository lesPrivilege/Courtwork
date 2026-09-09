# CC-W 派单提示词（Fable，2026-09-09；以 `opus-wo-medium` 派出）

派单方式：Agent 工具，`subagent_type: opus-wo-medium`（effort: medium，几何合同与 tab 生命周期需逐项判断），后台运行。以下为提示词全文。

---

你是 Claude Opus，CourtWork 前端的单一 writer，执行第五轮工单 CC-W（工作面：1440 主次切换 + tab strip，≥1680 三栏）。Fable 派单，Astra 独验与合流；你只做作者验证，不自称独验。

## 树、分支、端口
- worktree（已建好，基线 main `414b196`）：/private/tmp/se-agent-ccw，分支 `claude/cc-w-surface-tabs`。只在这里工作；不碰 /Users/lesprivilege/Projects/Courtwork 或其他树。
- 应用端口 8901，数据目录 /private/tmp/se-agent-ccw-data（已建、为空，可建子目录）；MCP 线路 fixture 用 8902；CDP 端口自选 19960 起。结束后停掉自己的全部进程。8850–8861、8810、8817、8818、8887–8900、8921–8953 是别人的，不动。
- 不读取任何凭据文件；全程 local-fake / loopback。

## 先读（顺序，均在你树内，除注明者）
1. engineering/mvp/execution/work-surface-kit/work-orders/WO-CC-round5.md §CC-W —— 工单全文：§VI 交接契约头（intent / constraints / existing_system / references / unresolved 四条）、第 0 项、做什么 1–6、写权、交付。
2. engineering/mvp/execution/work-surface-kit/intake-round-3.md：§4r WK-113（几何按视口分档、tab 契约）、§4u WK-116（R4D-3 单文档保留滚动 / 草稿 / 焦点；R4D-4 renderer 失效保留 status / modulePath；R4D-5 断点两侧与短高度验证）、§4v WK-117 (b)（面板宽 ≠ 正文行宽；← Chat 不入 tablist；C 态 composer 完整；消息不默认卡片化）、§4w WK-118（atlas ④⑤：tab 是状态容器，agent activity 以微型 indicator 入 tab；M-9 按钮在途保持宽度）、§4x WK-119（Inspector 归 CC-I，本单不做）、§4z WK-121 ②（Back to app 占顶带左端槽位，本单须一并裁定顶带槽位）。这些都已在你树内（main `414b196` 含至 WK-121）。
3. engineering/mvp/execution/work-surface-kit/explore/ex-cc1-three-pane-tabs.md（现状几何、identity 字段、tab 契约逐条对照；§1.2 的 392 已更正为 384）；misfit-ledger.md M-2 / M-4 / M-9 / M-10；engineering/design/atlas/README.md tab-chrome 行。
4. docs/interface-components.md §工作面定性（你要改约的段，含 "not a third column"）；engineering/design/ui-composition-standard.md §右侧 contextual surface 与尺寸 token 表；frontend-layering-spec.md FN-22 / FN-23 / FN-24；engineering/mvp/execution/work-surface-kit/backend-requests.md BE-2（多文档 tab 未交付）。
5. delivery-cc-s.md（体例、§16 anti-slop 门行、Back to app 槽位说明 §10 ①）、delivery-fe03.md §11 ②（scope 位现状）、delivery-wk10b-1.md §6.4（FE-T07 定义）。
6. 代码：app/web/app.mjs 的 surface 段（`state.surface`、`setSurfaceExpanded`、`surfaceIsModal`、`surfaceOverlayQuery` / `narrowQuery`、`disposeSurfaceRenderer`、`sameSurfaceIdentity`、`restoreLayerFocus`、`#surface-tabs` keydown 约 5522–5539）、`renderChatHeader`（scope 位）、settings-back-button 与 toggle-nav-button 槽位；app/web/surface-modules.mjs（宿主边界注释 1–18、`surfaceModules` 四类型）；app/web/index.html `#surface-panel` / `#surface-tabs` / `#surface-backdrop`；app/web/styles.css `.work-surface` 折叠 / 展开（约 4008–4131）、`--rail-width`、`--col-gap`、断点 1024 / 1199 / 767；app/web/ui-controls.mjs `installTooltips`（M-10）与 `requestLabel`（M-9）；evidence/cc-s/ 的脚本作为回归底本（composition-checks 含 SHELL-1…3、SETTINGS-*；fe-t07.mjs 是你要扩的反例）。

## 第 0 项（显式改约 + 遗留，单独提交，允许该提交跑绿为准）
- **改约**：`docs/interface-components.md` §工作面定性 "not a third column" 改为按视口分档——≥1680 工作面是真正的第三栏（三面上下贯通、各自滚动、共享顶部 chrome 基线）；1024–1679 保持覆盖 / 折叠语义并加 tab strip（主次视图切换，中面 ≥640 不动）；<1024 全屏 sheet 不变——标注 WK-113 / WK-116；`ui-composition-standard.md` §右侧 contextual surface 同步，尺寸 token 表加断点 `≥1680` 与 `--doc-min` 688、正文行宽上限 token（沿 `--column` 740 起）。不改 intake。
- **顶带槽位裁定（WK-121 ②）**：左端槽位今天由侧栏开合钮 / Settings 态 Back to app 共用；本单 B 态的 ← Chat **不放进这个槽位也不入 tablist**，放在 strip 同一行、strip 之外的左端控件（与 tab 视觉区分）；写明理由；Escape 两步序不变（工作面 → 页）。
- M-9：决定类与 composer 按钮在 `Sending…` 态保持静止态宽度（以静止标签量 min-width），焦点不丢；断言一条。
- M-10：tooltip 共享延迟——首个 400ms，随后 300ms 窗口内相邻即时切换，窗口过后恢复延迟；纯文本 tooltip 语义不变；断言一条。

## 做什么（WO §CC-W 正文 1–6，要点）
1. **tab strip**：四个类型 tab（run / file / workspace / runtime）保留为档位 + 至多一个可关闭文档 tab（第一段单文档，BE-2 未交付不做多实例、不做伪多实例、不建位置 map）；文档 tab 关闭命中区与选中区分离；截断保留 `title` / 可访问全名；关闭活跃文档 tab 回紧凑目录并用 `restoreLayerFocus` 归还焦点到打开它的控件；方向键 / Home / End 沿现有 tablist；tab key 复用既有身份（文件 / Run `{sessionId, path, kind, sha256, runId}`，领域渲染器 `{sessionId, extensionId, generation}`，来源 `{artifactId, version, digest}`），**不新增 scope 字段**；renderer 失效判定保留 `status` / `modulePath`（R4D-4）。agent activity（running / waiting-human / error）以微型 indicator 入对应类型 tab，不造 banner；indicator 不只靠颜色（FN-28）。
2. **B（1024–1679）**：展开态 = 主区视图切换：文档面占主区（1440 下 1136），strip 在顶部，**不套遮罩、不用模态卡外观**；chat 面 DOM 保留（`hidden` + `inert`），返回后聊天滚动位置与草稿不变（R4D-3）；**面板宽 ≠ 正文行宽**：文档正文行宽上限沿 token，宽表 / 代码按内容横向滚动（WK-117 (b)）；消息不默认卡片化。
3. **C（≥1680）**：三栏 grid（nav 256 / chat ≥640 / doc ≥688），各自 `overflow: auto`，顶部 chrome 同一基线；composer 完整可见；断点跨越（1679 ↔ 1680）不重挂 renderer、不重发命令、不丢滚动 / 草稿；三栏态 chat 列固定 640 还是 flex 至 740（unresolved ②）选最保守者并写理由。
4. **Memory scope 位**从会话 meta 行搬到工作面标题带（M-2；只在 Work 上，仍零控件、仍 `Memory · Off`）；文档 tab 标题来源（unresolved ③）选最保守者并写理由。
5. **断言**：`composition-checks` 新增 WORK-5…（B 态 doc 1136 / chat 隐藏但 DOM 与草稿保留；C 态三列宽度与各自滚动、chrome 基线；正文行宽 ≤ 上限）、SHELL-4 / SHELL-5（B 展开态与 C 三栏态安全区，桌面宿主与普通浏览器）、断点两侧各一次、短高度（≤720）、200%（1440 一次）；`fe-t07` 全部重跑 + 新增：断点跨越、关闭文档 tab 焦点归还、B 态返回后滚动与草稿；M-9 / M-10 各一条；RC 三支、shell、Models、探测、primitive、cc-s-checks、FE-T01 / T03 / T06 / T11 全量回归。
6. 消融轮 + anti-slop 门（WK-112 §IX）自查，hierarchy 项加一问：字号 / 字重差是否足以让层级不靠颜色与框线成立（WK-120）。

## 写权与禁令
- 可写：app/web/**、app/tests/**、docs/interface-components.md §工作面段、engineering/design/ui-composition-standard.md、copy-convention.md、text-sweep.md、delivery-cc-w.md、evidence/cc-w/（仓根）。
- 不改：app/server、app/runtime、app/core、domains、brand、HTTP 契约、review-projection.md、presentation-primitives.d.ts、glyph-semantics.md、intake；不新增依赖、字段、端点；允许的新前端状态只有文档 tab 的开合与 strip 选择（不建多文档 map）；不做 Inspector（CC-I）；不引新色、新字、新图形；新 web 模块需静态准入时向 Astra 提 allowlist 路径请求，不自己改 server。

## 交付
- 提交到 `claude/cc-w-surface-tabs`，显式路径 git add；提交信息末尾加 `Co-Authored-By: Claude Opus <noreply@anthropic.com>`。
- 写 engineering/mvp/execution/work-surface-kit/delivery-cc-w.md，体例沿 delivery-cc-s.md：基线 SHA、commit 表、改动文件、第 0 项逐条、消融表、五轮收敛表（1440 B 态、1680 C 态、1024、390 各一张）、状态矩阵（strip、类型 tab、文档 tab、← Chat、scope 位）、text-sweep 增量、断言结果原文（WORK-5…、SHELL-4/5、fe-t07 新增、M-9 / M-10）、两条以上 unresolved 的取舍、既有回归全量、allowlist / 后端请求（BE-2 保持登记）、未检项分列（触控 / 读屏 / 真实 IME / 真实 provider 一律 not_run）、待裁定、"哪一像素改变了哪一判断"、anti-slop 门自查。证据放 evidence/cc-w/。
- 作者验证至少：`npm --prefix app ci`、`npm --prefix app test`、`node tools/lint-colors.mjs`、`node tools/lint-materials.mjs`、`node tools/contrast-report.mjs`、`npm --prefix app run smoke`，浏览器脚本沿 evidence/cc-s/ 的方式逐字复制只改端口。视觉四轴留用户。
- 冲突或缺口：记入"待裁定"，选最保守实现继续，不停工。

最终回复只需：分支头 SHA、delivery-cc-w.md 路径、验证结果一行、待裁定项列表、未做项与原因。
