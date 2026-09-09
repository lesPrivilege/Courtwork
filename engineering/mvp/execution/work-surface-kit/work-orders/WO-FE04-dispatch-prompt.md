# FE-04 派单提示词（Fable，2026-09-09；以 `opus-wo-medium` 派出）

派单方式：Agent 工具，`subagent_type: opus-wo-medium`（effort: medium，逐 primitive 判断），后台运行。以下为提示词全文。

---

你是 Claude Opus，CourtWork 前端的单一 writer，执行第四轮工单 FE-04（Primitive reconciliation，WK-93）。Fable 派单，Astra 独验与合流；你只做作者验证，不自称独验。

## 树、分支、端口
- worktree（已建好，基线 main `af95bcb`）：/private/tmp/se-agent-fe04，分支 `claude/fe04-primitives`。只在这里工作；不碰 /Users/lesprivilege/Projects/Courtwork 或其他树。
- 应用端口 8897，数据目录 /private/tmp/se-agent-fe04-data（已建、为空，可建子目录）；MCP 线路 fixture 用 8898；CDP 端口自选 19905 起。结束后停掉自己的全部进程。8850–8861、8810、8817、8818、8887–8896、8921–8937 是别人的，不动。
- 不读取任何凭据文件；全程 local-fake / loopback。

## 先读（顺序，均在你树内，除注明者）
1. engineering/mvp/execution/work-surface-kit/work-orders/WO-FE-round4.md §FE-04 —— 工单正文。
2. engineering/mvp/execution/work-surface-kit/explore/ex-wk8-primitive-ledger.md 全文 —— 你的台账：§2 十一个 primitive 逐项，§3 gap 表（每行标了 **禁止 / 未禁止 / 不适用**），§4 未检项。
3. engineering/mvp/execution/work-surface-kit/intake-round-3.md §4g WK-93、WK-89 词表、§4j WK-100（五轮收敛表）、§4k WK-105、§4m WK-107、§4o WK-109。
   §4q WK-111 / WK-112 尚未合入你的树，只读路径：/private/tmp/se-fable-r4d/engineering/mvp/execution/work-surface-kit/intake-round-3.md §4q（WK-112 (d) 规定你要交的状态矩阵）。不要写那棵树。
4. engineering/mvp/execution/work-surface-kit/contracts/review-projection.md（§6 "不采纳"清单是硬边界）、presentation-primitives.d.ts、glyph-semantics.md；engineering/design/frontend-layering-spec.md（FN-18…28）、copy-convention.md §3。
5. 反例定义：delivery-wk10b-2.md 的 **FE-T06**（FN-18 / 19 · 三类事实不混同、不自动重放；含另半条 `allow` 后工具失败、`cancel requested ≠ stopped`）与 delivery-wk10b-1.md §6.4 的 **FE-T07**（FN-22 / 23 / 24 · 迟到响应与卡片展开收起）；delivery-fe03.md（交付格式与 §13）。
6. 代码：app/web/thread-projection.mjs、app.mjs 的 approval / question / inbox 键盘段、user-message.mjs、inspector.mjs、surface-modules.mjs、ui-controls.mjs；app/tests 中对应测试；evidence/fe03/ 与 evidence/fe03-main-integration-20260909/ 的脚本（RC 三支、composition、shell）作为回归底本。

## 做什么
逐 primitive（Thread / Composer / Message / Tool row / Approval / Artifact / Trace / Inbox / Question / Work surface / Decision receipt）做行为审计与修正：
- 台账标 **禁止** 的项一律不迁移（allow-always、批量批准、自动执行档、数字键切段等），在 canon 里写明"不采纳 + 依据"。
- 标 **未禁止 / 能力缺口** 的项逐条判断：前端可独立完成的（例如 Tool row 区分"失败"与"因取消未完成"——若后端事件已带可区分的字段；Trace 的 collapsed → timeline → raw 三层；键盘与 focus 行为对齐 WAI-ARIA / assistant-ui 契约）做；需要后端字段或端点的（Approval 乐观并发版本号、Question 结构化 schema、Decision receipt 时间）记"待验接口"并写 BE 请求草案（编号从 BE-24 起，先查 backend-requests.md 避免重号），不以本地状态伪造。
- 标 **不适用 / 已对齐** 的项只记入 canon，不改代码。
- 交付 `engineering/mvp/execution/work-surface-kit/contracts/primitive-canon.md`：component → Canon 映射（每个 primitive：来源、REUSE / REVERSE / REFERENCE / PROTOCOL / AVOID-COUPLING、迁移的行为清单 keyboard / send-cancel / attachment / focus / streaming / auto-scroll / approval 状态机 / expired-cancelled、不采纳项与依据）+ 消费台账（哪一行台账被哪次提交消费）。
- **状态矩阵（WK-112 (d)）**：每个 primitive 一张表，列 normal / hover / selected / loading / empty / error / disabled / dense / narrow / long-content，每格写 file:line 或 `not_applicable` + 一句理由；发现缺状态且前端可补的就补，不可补的记"待裁定"。不新建 gallery 模块。
- 实现仍为原生 ES module，不引 React、不加依赖；可创造 implementation，不可创造 ontology。

## 写权与禁令
- 可写：app/web/**、app/tests/**、contracts/primitive-canon.md（新）、engineering/design/copy-convention.md（词表补行）、text-sweep.md、delivery-fe04.md、evidence/fe04/。
- 不改：app/server、app/runtime、app/core、domains、brand、HTTP 契约、review-projection.md；不新增状态、字段或端点；新 web 模块需静态准入时向 Astra 提 allowlist 路径请求，不自己改 server。

## 交付
- 提交到 `claude/fe04-primitives`，显式路径 git add；提交信息末尾加 `Co-Authored-By: Claude Opus <noreply@anthropic.com>`。
- 写 delivery-fe04.md，格式沿 delivery-fe03.md：基线 SHA、commit 表、改动文件、消融表、五轮收敛表（逐 primitive）、状态矩阵、text-sweep 增量、FE-T06（含另半条）/ FE-T07 结果原文、既有回归（RC 三支、composition、shell、探测、FE-T03）结果、allowlist / 后端请求（BE-24 起草案）、未检项分列（触控 / 读屏 / 真实 IME / 200% / 真实 provider 一律 not_run）、待裁定、"哪一像素改变了哪一判断"。证据放 evidence/fe04/（仓根，沿 FE-03）。
- 作者验证至少：`npm --prefix app ci`、`npm --prefix app test`、`node tools/lint-colors.mjs`、`node tools/lint-materials.mjs`、`node tools/contrast-report.mjs`、`npm --prefix app run smoke`，浏览器脚本沿 evidence/fe03-main-integration-20260909/ 的方式逐字复制只改端口。视觉四轴留用户。
- 冲突或缺口：记入"待裁定"，选最保守实现继续，不停工。

最终回复只需：分支头 SHA、delivery-fe04.md 路径、验证结果一行、待裁定项列表、未做项与原因。
