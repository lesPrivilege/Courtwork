# FE-02 派单提示词（Fable，2026-09-09；供新会话以 `opus-wo-low` 原样派出）

派单方式：Agent 工具，`subagent_type: opus-wo-low`（用户级定义 `~/.claude/agents/opus-wo-low.md`，effort: low），后台运行。以下为提示词全文。

---

你是 Claude Opus，CourtWork 前端的单一 writer，执行第四轮工单 FE-02（Models & Connections）。Fable 派单，Astra 独验与合流；你只做作者验证，不自称独验。

## 树、分支、端口
- worktree（已建好，基线 main `2b6c221`）：<isolated-checkout>，分支 `claude/fe02-models`。只在这里工作；不碰 . 或其他树。
- 应用端口 8887，数据目录 /private/tmp/se-agent-fe02-data（已建、为空）；MCP 线路 fixture 用 8888；CDP 端口自选 19887 起。结束后停掉自己的全部进程（server、fixture、headless Chrome）。8850–8861、8810、8817、8818 是别人的，不动。
- 不读取任何凭据文件；全程 local-fake / loopback，不配置真实 provider，不把任何真实 key 写进 fixture。

## 先读（顺序，均在你树内）
1. engineering/mvp/execution/work-surface-kit/work-orders/WO-FE-round4.md §FE-02 —— 你的工单全部（含第 0 项 `--nav` 256）；其他节只读不做。
2. engineering/mvp/execution/work-surface-kit/intake-round-3.md §4g WK-91（provider UX 裁定）、WK-89 词表、§4j WK-100（五轮收敛表）、§4k WK-105、§4l WK-106。
3. engineering/mvp/execution/work-surface-kit/inputs/review-semantics-2026-09-09.md 的 provider / Models 段；explore/ex-wk6-dsh-plugins-webui.md 与 ex-wk6-r2-dsh-official.md（DSH 为交互参考，Pi 为能力底座；只取交互形态，不搬代码）。
4. engineering/design/frontend-layering-spec.md §4（设置条目与动作闭集）、§7；engineering/design/copy-convention.md §3；engineering/mvp/execution/work-surface-kit/backend-requests.md BE-17 / BE-18（未交付：对未保存表单的 Fetch models、Test connection —— 对应按钮不出现，只留位说明）。
5. engineering/mvp/execution/work-surface-kit/delivery-fe01.md（Settings 九组结构、Models 组现状、五轮收敛表与交付格式范例）；docs/runtime-control/ 下 provider 相关契约；app/web/settings-view.mjs、runtime-view.mjs、app.mjs 中现有 provider-config / provider-credential / provider-models 的使用；app/tests 中 provider 相关测试。

## 做什么（WK-91）
Settings › Models：Connections 列表 + Add provider 三条 happy path（catalog：API key → Connect；compatible：Base URL + key；local：Base URL）；统一流程 Configure → Test → Fetch models → 选 model → Save connection，其中 Test 与对未保存表单的 Fetch models 因 BE-17/18 未交付而不画按钮，流程在 UI 上以已保存连接的既有 provider-models 路径为准；display name 用户填、provider ID 内部生成；compat / headers / API format 收进 Advanced disclosure；credential 与 endpoint 分离存取；默认模型只影响以后的 Chat / Work，已有会话固定其 `runtime.bound`（界面上说清）。MCP servers（Tools & Integrations）沿同一 Add → Configure → Test → Review permissions → Save / Enable → Advanced 形态，同样不画未交付的 Test。第 0 项：`--nav` 250 → 256，Home / Work 几何断言随之更新。

## 写权与禁令
- 可写：app/web/**、app/tests/**、engineering/design/copy-convention.md（若词表需补行）、text-sweep.md、delivery-fe02.md 与 evidence/fe02/。
- 不改：app/server、app/runtime、app/core、domains、brand、HTTP 契约；不新增依赖、状态、字段或端点；缺契约记"待验接口"，不以本地状态伪造权威。新 web 模块需静态准入时向 Astra 提 allowlist 路径请求，不自己改 server。
- 原生 ES module；可创造 implementation，不可创造 ontology。

## 交付
- 提交到 `claude/fe02-models`，显式路径 git add；提交信息末尾加 `Co-Authored-By: Claude Opus <noreply@anthropic.com>`。
- 写 engineering/mvp/execution/work-surface-kit/delivery-fe02.md，格式沿 delivery-fe01.md：基线 SHA、commit 表、改动文件、消融表、五轮收敛表（Models、Tools & Integrations 两组）、text-sweep 增量、分配反例 FE-T03（请求值 / 有效值 / 绑定值）结果原文、既有回归（Settings、RC 视口、Home / Work 几何含 `--nav` 256）结果、allowlist / 后端请求（BE-17/18 保持登记，标注 UI 留位）、未检项分列（触控 / 读屏 / 真实 IME / 200% / 真实 provider 一律 not_run）、待裁定、"哪一像素改变了哪一判断"。证据放 evidence/fe02/（脚本、json、log、截图）。
- 作者验证至少：`npm --prefix app ci`、`npm --prefix app test`、`node tools/lint-colors.mjs`、`node tools/lint-materials.mjs`、`node tools/contrast-report.mjs`、`npm --prefix app run smoke`，浏览器脚本用 evidence/fe01/ 的方式（系统 Chrome 固定路径 + `--headless=new` + CDP）。视觉四轴留用户。
- 冲突或缺口：记入"待裁定"，选最保守实现继续，不停工。

最终回复只需：分支头 SHA、delivery-fe02.md 路径、验证结果一行、待裁定项列表、未做项与原因。
