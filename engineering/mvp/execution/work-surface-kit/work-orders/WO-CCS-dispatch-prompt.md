# CC-S 派单提示词（Fable，2026-09-09；以 `opus-wo-low` 派出）

派单方式：Agent 工具，`subagent_type: opus-wo-low`（effort: low），后台运行。以下为提示词全文。

---

你是 Claude Opus，CourtWork 前端的单一 writer，执行第五轮工单 CC-S（Settings 替换全局导航）。Fable 派单，Astra 独验与合流；你只做作者验证，不自称独验。

## 树、分支、端口
- worktree（已建好，基线 main `683b6d1`）：/private/tmp/se-agent-ccs，分支 `claude/cc-s-settings-nav`。只在这里工作；不碰 /Users/lesprivilege/Projects/Courtwork 或其他树。
- 应用端口 8899，数据目录 /private/tmp/se-agent-ccs-data（已建、为空，可建子目录）；MCP 线路 fixture 用 8900；CDP 端口自选 19925 起。结束后停掉自己的全部进程。8850–8861、8810、8817、8818、8887–8898、8921–8937 是别人的，不动。
- 不读取任何凭据文件；全程 local-fake / loopback。

## 先读（顺序，均在你树内，除注明者）
1. engineering/mvp/execution/work-surface-kit/work-orders/WO-CC-round5.md §CC-S —— 你的工单全文，含 §VI 交接契约头（intent / constraints / existing_system / references / unresolved）与第 0 项。
2. engineering/mvp/execution/work-surface-kit/intake-round-3.md §4k WK-105、§4o WK-109、§4q WK-112（(c) 消融轮与 anti-slop 门、(d) 状态矩阵）、§4t WK-115（① `Unknown` 词、② Home / End 与两条列表）。
   §4u WK-116（CC-S 改约裁定）尚未合入你的树，只读路径：/private/tmp/se-fable-r4d/engineering/mvp/execution/work-surface-kit/intake-round-3.md §4u。不要写那棵树。
3. engineering/design/clean-cool-2026-09-09/shell-refinement.md §"已确认的结构方向" 3、§"原生窗口控制预留"、§"呼吸感" Settings 与设置分组两行、§"Claude 拆单入口" CC-S；claude-handoff.md "不可由图稿改变"；r4d-review.md（Astra 接缝评审，CC-S 相关：安全区补 Settings 与折叠态）。
4. docs/interface-components.md §Settings（你要改约的段）；engineering/design/frontend-layering-spec.md FN-26 注；engineering/design/ui-composition-standard.md 尺寸 token 表；engineering/mvp/execution/work-surface-kit/contracts/glyph-semantics.md §3（末尾 WK-115 ① 注）；copy-convention.md §3。
5. delivery-fe01.md §4（Settings 五轮收敛表、九组）、delivery-wk12.md（Settings 页化的原始交付，WK-78 两步 Escape）、delivery-fe04.md（体例与 §14 anti-slop 门行）。
6. 代码：app/web/index.html `#settings-page` 一带（`settings-back-button`、`settings-nav-column`、`settings-nav`、`settings-nav-select`、`settings-search`）；app/web/app.mjs 的 `openSettings` / `closeSettings` / `settingsOpen` 渲染段（约 2986–3025）、inbox 键盘段、tool 行元数据词（`Interrupted` 推断处，约 2560–2581）、Home 下带与 Chat Flow 未决卡容器；app/web/settings-view.mjs 九组；app/web/styles.css `.settings-*`、`.app-shell.settings-active`、`--nav`、`--page-gutter`；evidence/fe04/ 的脚本作为回归底本（composition-checks 的 SHELL-1 是你要扩的断言）。

## 第 0 项（先做，单独提交）
- **改约**：`docs/interface-components.md` §Settings 把 "while the sidebar stays operable" 一句改为 "settings-active 时全局侧栏不渲染，Settings 自身导航是唯一导航；Back to app 与 Escape 返回进入前的位置"，标注 WK-116；`frontend-layering-spec.md` FN-26 注同步（"Settings 为页面而非模态（WK-78）"保留，补一句侧栏不渲染）。不改 intake（Fable 已记）。
- tool 行第六个状态词 `Unknown`：Run 终态为 `unknown` 且工具无 result 时用 `Unknown`，`Interrupted` 只在 Run 终态明确 cancelled / failed 时；单测 + 浏览器断言（fixture 造一个 unknown 终态）。
- Inbox 列表加 `Home` / `End`（沿现有 j / k / o / Enter 处理器）；Home 下带与 Chat Flow 未决卡各自 `role="list"`（两条列表，不合并）；单测。

## 做什么（WO §CC-S 正文 1–6）
1. settings-active：全局侧栏不渲染（DOM 移除或 `hidden` + `inert`，不能只是视觉隐藏；折叠态同理）；主区 + 设置导航列两列；退出恢复。
2. 导航列 240–256、内容列 760–960 上限、gutter ≥48（≥1680 可 56–80）；组间 40–48、行 16–24；label / help 同起点、控件同右边界；沿现有 token，缺的加入尺寸 token 表并在 ui-composition-standard 登记。
3. Back to app：unresolved 第 1 条选最保守者（页标题行左端、安全区之后）并写明理由；unresolved 第 2 条（设置导航是否复用 `--nav` 轨道）同样选最保守者并写明；恢复 view / session / focus；Escape 两步序不变；有 dirty 表单时沿现有语义。
4. 安全区：`composition-checks` 新增 SHELL-2（Settings 态）与 SHELL-3（侧栏折叠态），桌面宿主壳与普通浏览器各一次；80×52 内零可聚焦元素。
5. 窄屏 390：导航列变 select（已有），gutter 16–20，控件 ≥44；1024 档一次；1440 下 200% 缩放一次（CDP `deviceScaleFactor` 或 `Emulation.setPageScaleFactor`，无横向溢出）。
6. 消融轮 + anti-slop 门（WK-112 §IX：necessity / hierarchy / system / reference fidelity / AI tells / reality）逐项自查写入交付页。

## 写权与禁令
- 可写：app/web/**、app/tests/**、docs/interface-components.md §Settings（仅改约段）、engineering/design/frontend-layering-spec.md FN-26 注、engineering/design/ui-composition-standard.md 尺寸 token 表、copy-convention.md、text-sweep.md、delivery-cc-s.md、evidence/cc-s/（仓根）。
- 不改：app/server、app/runtime、app/core、domains、brand、HTTP 契约、review-projection.md、glyph-semantics.md（已由 Fable 改）；不新增依赖、状态、字段或端点；不引新色、新字、新图形；新 web 模块需静态准入时向 Astra 提 allowlist 路径请求，不自己改 server。

## 交付
- 提交到 `claude/cc-s-settings-nav`，显式路径 git add；提交信息末尾加 `Co-Authored-By: Claude Opus <noreply@anthropic.com>`。
- 写 engineering/mvp/execution/work-surface-kit/delivery-cc-s.md，体例沿 delivery-fe04.md：基线 SHA、commit 表、改动文件、消融表、五轮收敛表（Settings 1440 / 1024 / 390）、状态矩阵（导航列、行、Back、搜索）、text-sweep 增量、SHELL-1/2/3 与 `Unknown` / Home-End 断言结果原文、既有回归（RC 三支、composition、shell、探测、Models、FE-T01 / T03 / T06 / T07 / T11）、allowlist / 后端请求、未检项分列（触控 / 读屏 / 真实 IME / 真实 provider 一律 not_run；200% 只在 1440 量一次）、待裁定、"哪一像素改变了哪一判断"、anti-slop 门自查。证据放 evidence/cc-s/。
- 作者验证至少：`npm --prefix app ci`、`npm --prefix app test`、`node tools/lint-colors.mjs`、`node tools/lint-materials.mjs`、`node tools/contrast-report.mjs`、`npm --prefix app run smoke`，浏览器脚本沿 evidence/fe04/ 的方式逐字复制只改端口。视觉四轴留用户。
- 冲突或缺口：记入"待裁定"，选最保守实现继续，不停工。

最终回复只需：分支头 SHA、delivery-cc-s.md 路径、验证结果一行、待裁定项列表、未做项与原因。
