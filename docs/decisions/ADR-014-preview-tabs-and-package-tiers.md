# ADR-014: Preview 分页宿主与三层包体系

状态：Accepted（2026-07-15）

## 上下文

现行 Preview 已有 tab 条 UI，但 tab 取值是六种固定工作面视图（`WorkbenchView`），artifact 槽位单选（同会话多个 artifact 只显示最近一个）；Legal 四个工作面（timeline/graph/matrix/revision）是 `route` 类 blueprint 直连 App.tsx 硬编码组件，ADR-012 已点名为迁移债；通用 descriptor→projection 管线（`courtwork.artifact-table.v1`）namespace-blind 且 fail-closed，是唯一版本化 blueprint。

归档裁决（`archive/docs-legacy-2026-07-13/docs/49` 第十五章）曾定："Preview 浏览器 tab 即混包视图容器，UI 零欠账；`containerPackBinding` 为数组、MVP 长度恒 1——多包激活改约束不改结构。" 归档另有三层包体系定义（`docs/53`、`docs/93` 定本）。本 ADR 把这两条从归档捡回现行契约，并消除术语歧义。

## 决定

### 一、tab = 一张 schema 表

Preview 的 tab 语义从"固定视图种类"改为**按已产出 artifact 动态开 tab**：tab 集合由会话 artifact 集合生成，每个 tab 绑定一个 artifact type，经 descriptor（`uiTemplateId` 字符串引用）路由到版本化 blueprint 渲染。多 artifact 并列共存，tab 间切换不销毁彼此状态（开合闭合门约束适用）。

固定工作面视图不再是独立 tab 类别：Legal 四个 `route` blueprint 按 ADR-012 迁移债条款逐个迁为版本化 `component` blueprint（如 `courtwork.timeline.v1`），迁移完成后同样以 artifact tab 形态呈现。迁移期间两种形态可短暂共存于同一 tab 栏，但新增能力只许走版本化路径。

### 二、混包视图容器与跨垂类调用

- `containerPackBinding` 保持数组形制、当期长度恒 1；多包激活只改约束不改结构（席位条款沿归档原文）。
- 跨垂类调用是**声明级引用 + 组合根绑定**：其他容器（如未来招投标）声明引用 legal 的场景/schema/工具 id，可执行绑定只发生在受信组合根，垂类包之间永不互相 import（ADR-001 边界不动）。
- desktop renderer registry 保持单一全局表；descriptor 只携 `uiTemplateId` 字符串，registry 准入继续 fail-closed 拒绝可执行对象（registry SPEC 既有机制）。混包 tab 栏内不同垂类 artifact 共存靠 namespaced artifact type 天然隔离，不引入第二套命名空间机制。

### 三、三层包体系（商业/维护分层，与工程 ABI 分层正交）

| 层 | 内容 | 维护责任 |
|---|---|---|
| **通用底座** | schemas/registry/core/tools/reading-view/output + desktop 宿主机制、渲染词表、握手/投影协议、门禁机器 | 底座独有独维护，永不随包分发核心 |
| **轻量包** | 每垂类最小稳定实现：schema、声明式场景、词表、presentation、范例语料与 Design 规范——开箱即用、产品内自足；亦是其他容器声明级调用与一切微调的基线范本 | 垂类维护者有限维护 |
| **重度包** | 轻量包之上叠加企业定制：真实上游接口、专业库/私域库路由、内嵌工作流替代——技术形态即 ADR-012 决定三的 `/runtime` 子路径与 composition root 注入；只为 agent 必要依赖改造基建，不做全量转型 | 垂类 provider 驻场定制 |

**术语纪律**：本三层是商业/维护责任分层；ADR-001 的契约层/机器层/绑定层是工程 ABI 分层。两套正交，文档引用时不得混用。"重度包"不是新包体，是轻量包 `/runtime` 的开放条件与定制深度——ADR-012 决定三的技术门槛不变（无真实 integration 不造空 adapter）。

## 后果

1. 新工单 `PREVIEW-TAB-1`（tab 动态化 + 多 artifact 并列）与 `PANEL-BLUEPRINT-1`（Legal 四 panel 迁版本化 blueprint，可分批）进入就绪图；前者不依赖后者，共存期语义已在决定一定义。
2. `docs/architecture/system.md` 与 vertical-package-authoring 后续修订时引用本 ADR 的三层术语。
3. 多包激活（中转层路由索引、模型选包）仍属后续 ADR 队列第 1–2 项的前置议题，本 ADR 只保留结构席位，不开工。

## 明确拒绝

- 不做多包激活/模型自主选包（席位保留，约束恒 1）；
- 不为"企业级"预造 mock 接口、空 `/runtime`（ADR-012 决定三不变）；
- 不引入第二套 renderer 注册或命名空间机制；
- tab 状态不做跨重启持久化（会话内 UI 态，复杂度不达立持久格式的门槛）。

## 来源

- 归档：`archive/docs-legacy-2026-07-13/docs/49`（第十五章中转层席位）、`docs/53`/`docs/93`（三层包体系定本）——经调研复核吸收，见 `archive/research-2026-07-15-round-3/`。
- 现状审计：preview 机制与迁移债对照 ADR-012 与 `apps/desktop/src/preview/` 源码（2026-07-15）。
