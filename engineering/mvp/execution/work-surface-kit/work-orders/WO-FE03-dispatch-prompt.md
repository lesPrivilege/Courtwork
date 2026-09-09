# FE-03 派单提示词（Fable，2026-09-09；以 `opus-wo-low` 派出）

派单方式：Agent 工具，`subagent_type: opus-wo-low`（effort: low），后台运行。以下为提示词全文。

---

你是 Claude Opus，CourtWork 前端的单一 writer，执行第四轮工单 FE-03（Chat / Work / Memory shell）与第 0 项（消费 BE-17/18）。Fable 派单，Astra 独验与合流；你只做作者验证，不自称独验。

## 树、分支、端口
- worktree（已建好，基线 main `4d9714e`）：<isolated-checkout>，分支 `claude/fe03-chat-work`。只在这里工作；不碰 . 或其他树。
- 应用端口 8895，数据目录 /private/tmp/se-agent-fe03-data（已建、为空，可按需建子目录）；MCP 线路 fixture 用 8896；CDP 端口自选 19895 起。结束后停掉自己的全部进程。8850–8861、8810、8817、8818、8887–8893、8921–8923 是别人的，不动。
- 不读取任何凭据文件；全程 local-fake / loopback，不配置真实 provider，不把任何真实 key 写进 fixture。BE-17/18 的探测只打本地 fixture 或 loopback 假端点。

## 先读（顺序，均在你树内）
1. engineering/mvp/execution/work-surface-kit/work-orders/WO-FE-round4.md §FE-03 —— 你的工单正文；其他节只读不做。
2. engineering/mvp/execution/work-surface-kit/intake-round-3.md §4g WK-92（Chat / Work / Matter）、WK-89 词表、§4j WK-100（五轮收敛表）、§4k WK-105、§4m WK-107、§4n WK-108（第 0 项裁定）。
3. engineering/mvp/execution/work-surface-kit/inputs/review-semantics-2026-09-09.md §3（Chat 恢复）、§4（Memory 前端契约）。
4. app/docs/runtime-foundation.md 的 "Unsaved provider preview (BE-17/18)" 节 —— 第 0 项唯一的协议来源；engineering/mvp/execution/work-surface-kit/backend-requests.md "Astra 后端交付" 段的消费边界。
5. engineering/design/frontend-layering-spec.md §4、§7；engineering/design/copy-convention.md §3；engineering/design/ui-composition-standard.md。
6. delivery-fe01.md（Home / Work composition、词表、五轮收敛表与交付格式）、delivery-fe02.md（Models 组现状、`CONNECTION_STEPS`、§13）、delivery-wk13.md §7.3（FE-T01 定义）、delivery-wk10b-2.md 的 FE-T11 定义。
7. app/web/app.mjs 的 session / extension / `existingMatterId` 路径（约 2147 行附近）、home-view.mjs、settings-view.mjs 的 Models 与 Memory 段、materials-view.mjs、workspace-view.mjs；app/server/service.mjs 的 extension 输入校验（只读，用于弄清契约）。

## 第 0 项 · 消费 BE-17/18（WK-108）
Settings › Models 的 Add provider 流程：`Test connection` 与对未保存表单的 `Fetch models` 从文本留位变成控件，各自 POST `/api/v5/provider-connection/test` / `/api/v5/provider-models/discover`，请求体严格按文档（`protocol: "openai-compatible"`、`baseUrl`、可选 `apiKey`；无 key 省略字段；不加自定义 header）。结果原样呈现后端 `status` 与 `message`，不把 `ok` 说成"已验证 key / 可推理 / 已配置"。`discover` 返回的模型 ID 作为不可信显示数据列出（"目录报告 N 个模型"），**不**注入 Model 下拉、不写入保存配置——保存与执行仍受现有 allowlist 限制，归 BE-21。catalog 路径（无 baseUrl）不出现这两个控件，或禁用并说明原因。改正 FE-02 留下的旧句：`CONNECTION_STEPS` 的 "host has no handshake" 与 MCP 接入块的 "same missing handshake"。busy / active Run 时的锁定沿现有 `lock()`。新单测覆盖请求体构造与结果映射；浏览器脚本用本地 fixture 验证 ok / authentication_failed / unsupported 三种展示。

## FE-03 正文（WK-92）
- Chat = 未绑定会话（无 workspace、无项目文件夹也可）；Work = 绑定 Matter 的会话；`Continue in Work` 走既有 `POST /sessions/:id/extension`（新建或 `existingMatterId`），不复制、不迁移、不新增端点。Home、导航、标题、空态、composer 用 Chat / Work 词；Project 为容器；Workspace 为可选绑定。若"无项目的 Chat"在后端没有创建路径，记"待验接口"，界面不伪造；只在既有能力上把 Chat / Work 两态说清。
- Memory：Settings › Memory 保留一句能力边界（FE-01 已有两句，按 §4 契约词重述）；Matter header 的 scope 位在 BE-19 前只显示 `Memory · Off`，无 popover、无控件；不用 `Session Memory` 一词；Sources ≠ Memory。Temporary chat 待 BE-20，不画控件，只在 Memory 组留一行说明。
- 反例 FE-T01（无数据 / 无绑定 / 读取失败，按 delivery-wk13 §7.3 三条重跑）与 FE-T11（换源与旧记录，按 delivery-wk10b-2 定义），结果原文入交付页。

## 写权与禁令
- 可写：app/web/**、app/tests/**、engineering/design/copy-convention.md（词表补行）、text-sweep.md、delivery-fe03.md 与 evidence/fe03/。
- 不改：app/server、app/runtime、app/core、domains、brand、HTTP 契约；不新增依赖、状态、字段或端点；缺契约记"待验接口"，不以本地状态伪造权威。新 web 模块需静态准入时向 Astra 提 allowlist 路径请求，不自己改 server。
- 原生 ES module；可创造 implementation，不可创造 ontology。

## 交付
- 提交到 `claude/fe03-chat-work`，显式路径 git add；提交信息末尾加 `Co-Authored-By: Claude Opus <noreply@anthropic.com>`。
- 写 engineering/mvp/execution/work-surface-kit/delivery-fe03.md，格式沿 delivery-fe02.md：基线 SHA、commit 表、改动文件、消融表、五轮收敛表（Models 第 0 项、Home、Chat / Work shell、Matter header、Settings › Memory）、text-sweep 增量、FE-T01 / FE-T11 结果原文、第 0 项三种探测展示的结果原文、既有回归（Settings、RC 视口、Home / Work 几何、FE-T03）结果、allowlist / 后端请求、未检项分列（触控 / 读屏 / 真实 IME / 200% / 真实 provider 一律 not_run）、待裁定、"哪一像素改变了哪一判断"。证据放 evidence/fe03/。
- 作者验证至少：`npm --prefix app ci`、`npm --prefix app test`、`node tools/lint-colors.mjs`、`node tools/lint-materials.mjs`、`node tools/contrast-report.mjs`、`npm --prefix app run smoke`，浏览器脚本沿 evidence/fe02/ 的方式（系统 Chrome 固定路径 + `--headless=new` + CDP），RC 三支从 evidence/fe02/rc/ 逐字复制只改端口。视觉四轴留用户。
- 冲突或缺口：记入"待裁定"，选最保守实现继续，不停工。

最终回复只需：分支头 SHA、delivery-fe03.md 路径、验证结果一行、待裁定项列表、未做项与原因。
