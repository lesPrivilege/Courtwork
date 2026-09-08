# 前端必要入口：G1–G3 的编排指引（Fable，2026-09-08）

基线 `main` `e0d214d`。**2026-09-08 更新：** Astra `codex/harness-core` `d6247a8` 已交付本页所列 H1 / H3 契约（[docs/work-core/contract.md](../../../docs/work-core/contract.md)：`existingMatterId` 重绑定、`GET /projects/:id/work`、`readOnly` 只读历史、`work-query` 回执与历史来源、逐规则 `domain` payload、版本化 `humanActions`）；合流 main 后 §3 四个入口按 [WO-WK10b 第二段](../../mvp/execution/work-surface-kit/work-orders/WO-WK10b-work-surface.md) 开工，下表"契约依赖"列视为已满足。对象：为达到 [G1–G3](../2026-09-08-main-round/public-readiness.md) 必须存在的前端入口；哪些已有、哪些等契约、Opus 如何画。完整入口清单与 hunk 核对见 [EX-B](explore/ex-b-frontend-entries-diff.md)。写权沿 [WK10b](../../mvp/execution/work-surface-kit/work-orders/WO-WK10b-work-surface.md)：Opus 拥有 `app/web/**` 与 `evidence-memo/renderer.mjs` 第二段；不改 server / runtime / Core。

## 1. 后端路由（`app/server/index.mjs:98–134`）

| 路由 | owner | 入口用途 |
|---|---|---|
| GET/PUT `provider-config`；PUT/DELETE `provider-credential`；GET `provider-models` | `service.setProviderConfig` 等 | G1：Connection / Model / API key |
| POST `projects`、POST `sessions`、POST `sessions/:id/runs`、POST `runs/:id/cancel`、POST `runs/:id/questions/:qid` | `service.createRun` 等 | Run 链 |
| PUT `sessions/:id/permission-mode`、POST `sessions/:id/materials` | 同上 | Ask / Write / Read，材料 |
| POST `sessions/:id/extension` | `service.#createExtensionBinding` | 绑定扩展（现只能新建 Matter） |
| GET `sessions/:id/surface`、POST `sessions/:id/actions` | `service.getSurface` / `humanAction` | 领域投影与合法动作 |
| GET/PUT `runtime-control`、`runtime-resources`、`runtime-context`、`runtime-permissions/evaluate`、POST `mcp/:id/lifecycle` | control plane | Runtime 面 |

## 2. 门 → 入口

| 门 | 必要入口 | 现状 | 契约依赖 | Opus 动作 |
|---|---|---|---|---|
| G1 真实运行 | Connection 设置：provider、API 格式、base URL、模型、API key 保存 / 删除 | 已有：`settings-view.mjs` connection card + credential form；徽标 `#capability-badge` | 无新契约 | 不改结构；核对 key 输入不进日志、保存后徽标由 Local test 变为实际连接名；真实 provider 由用户输入 |
| G1 失败 / 取消 / 重启可检查 | Run 终态与 unknown 显示、Stop、重连 | 已有：composer Cancel、连接状态行、Run 面 | 无 | 保持；文案按体例 |
| G2 候选与依据 | 候选列表 → 逐规则 finding、来源锚点、未决、修改内容 | 部分：`renderer.mjs` 显示 Sources / Evidence / Draft / Review（memo 级），无逐规则 | H1-c per-rule packet | 先画只读逐规则形态，字段只取交付 packet 实际存在者 |
| G2 正式决定 | accept / return（reject）/ request evidence，带 reason、base_version | 已有：`renderer.mjs:reviewPanel` 三个按钮 dispatch `decide`，经 `/sessions/:id/actions`；host 校验 generation、active run、actor | H1 固定 humanActions 版本化 | 按钮只在 `projection.humanActions` 含该动作时出现；过时版本 409 后刷新并保留 reason 草稿 |
| G2 决定回执可见 | accept / return / request evidence 的结果进入 Chat Flow 或 Home 待处理集合 | 无：决定只回写在扩展自身的 projection（`app.mjs:3394–3454`），主线事件流与 work-summary 看不到（EX-B 表二） | H1 host 侧 decision 事件类型 | 等契约；有事件后按 ReviewProjection 之外的领域投影只读呈现 |
| G3 新 Session 继续同一事项 | 在同一 Project 内新建 Session 时选择"继续已有事项" | 无：`#binding-panel` 由 Settings 的 Bind to session 打开（`app.mjs:1910–1922`），表单只有 title + sourceText（`app.mjs:1944–2049`）；`createSession` 也不接受 binding 参数 | H1-a rebind 契约 | 等契约；先在 binding panel 预留"Continue existing"分段，无契约前不渲染 |
| G3 producer 缺席读历史 | 扩展卸载 / 失效后仍可读候选、决定、版本 | 无：`getSurface` 返回 null projection，前端显示缺失 | H3 只读路径 | 等契约；缺失态文案区分"扩展未加载"与"无记录"，不画动作 |
| G3 键盘与遮挡 | 关键路径键盘可达、无主要遮挡 | 已有：既有 Escape / 焦点回归回归测试 | 无 | WK10b 第一段沿既有验证项 |

G1 不需要新入口。G2 缺逐规则视图与决定回执，G3 缺两个入口；四者都等 H1 / H3 后端契约，前端不先造数据。`probe` 扩展未核对同类缺口（EX-B 未检项）。

## 3. 待建入口的编排

### 3.1 逐规则候选视图（G2）

- 位置：工作面 Preview 模块内，候选卡展开态；沿 WK-72 悬浮卡 → L3 展开。
- 形态：一行一规则：rule_id · 状态词（supported / missing / conflict / uncertain，按 H0 词表）· finding 一句 · 来源锚点（source_id:revision [start,end]）· 未决计数。展开显示引文与候选修改。
- 成熟实践：代码审阅的"按文件分组的变更 + 行锚点"（GitHub / GitLab review），只取分组、锚点、逐项状态，不取评论线程。
- 文案：状态词灰字，仅 conflict / uncertain 可着色；无"AI 建议"类修饰。
- 验收：同一 stateVersion 下 inline 与展开一致；packet 缺字段显示空，不补。

### 3.2 继续已有事项（G3）

- 位置：`#binding-panel`，与现有"Bind"表单并列为两段：Create new / Continue existing。
- 形态：列出同 Project 内已有 Matter（title、当前版本、最近决定时间、来源 revision）；选中后提交 `{ matterId, expectedVersion }`。
- 成熟实践：编辑器"最近打开 / 重新打开工作区"与 git worktree 附着已有仓库：选择既有 identity，不复制内容。
- 文案：Continue · 列表空态一句条件句。
- 验收：跨 Project 不可见；版本过时 409 后刷新列表；成功后 surface 显示原候选与决定。

### 3.3 只读历史（G3）

- 位置：工作面 Preview 模块，替代现有"缺失"占位。
- 形态：与 3.1 同一组件、`humanActions` 为空；顶部一行说明 producer 状态（unloaded / invalidated）与 stateVersion。
- 成熟实践：issue tracker 的历史视图：动作不可用但记录完整。
- 验收：卸载扩展后刷新仍显示候选与决定；无任何按钮；重新加载后动作恢复。

### 3.4 决定回执（G2）

- 位置：Chat Flow 该 Run 之后一行只读回执；Home "Needs a look" 集合不新增第四集合。
- 形态：动作词 · 候选 id · stateVersion · 时间；无按钮。
- 成熟实践：版本控制的 merge / close 事件行：一行事实，不复述内容。
- 验收：与工作面同一 stateVersion；决定被 409 拒绝时不生成回执。

## 4. 顺序

1. 现在：WK10b 第一段（glyph、Chat Flow、Home 下带、工作面生命周期）；G1 设置面核对。
2. H1 契约固定后：3.1、3.2 与 3.4；H3 只读路径交付后：3.3。
3. 各入口分别固定 SHA、消融表与未检项；作者验证与 Astra 独验分列；视觉四轴留用户。
