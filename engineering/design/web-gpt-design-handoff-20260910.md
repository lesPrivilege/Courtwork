# Web GPT Design Handoff · Courtwork（2026-09-10）

仓库：[https://github.com/lesPrivilege/Courtwork.git](https://github.com/lesPrivilege/Courtwork.git)

## 目标

把可独立验收的局部 Design / frontend PR 交给网页端 GPT 施工或产出设计稿。每个 PR 只解决一个问题，必须保留 Courtwork 现有的语义、owner、视觉语法和单一 writer 边界；不要把组件库调研扩张成迁栈工程。

## 开始前的固定上下文

1. 以 `main` 当前 HEAD 为基线；本 handoff 编写时为 `0c60f4f`，进入网页端 GPT 前重新读取实际 HEAD。
2. 先读仓库 [AGENTS.md](../../AGENTS.md)、[engineering/current.md](../current.md)、[PAPER.md](../../PAPER.md)，再读所选候选的工单、Atlas、intake 和 evidence。
3. 从 `main` 创建独立分支：`codex/web-gpt-design-<short-name>`。不要使用 `Courtwork-fresh`，不要直接在 `main` 施工。
4. 当前工作区已有用户改动：`evidence/fe01-main-integration-20260909/wk98-regression.json` 与 `site/verification/main-20260910/`。不要 reset、stash、覆盖或纳入候选 PR。
5. 每个候选独立提交、独立验证；网页端 GPT 不自行 merge、push、部署或宣称产品接受。完成后返回 branch、commit、改动路径、验证结果、未决项。

## 推荐候选

### A · EX-IC1 Iconography specimen（现在最适合做 Design PR）

**目的**：建立真实 Courtwork 语义槽位的图标家族对照，不迁移生产图标。

**依据**：[icon-controls.md](icon-controls.md)、[Atlas Iconography](atlas/README.md)、[S17/WK-133](../mvp/execution/work-surface-kit/intake-round-3.md)、[dispatch-round-4 EX-IC1](../mvp/execution/work-surface-kit/dispatch-round-4.md)。

**允许交付**：`engineering/design/icon-specimen/` 静态对照页、文字观察、候选资产来源 / sha / license 清单；Lucide current vs MingCute Regular vs Phosphor Regular，一次只改变 icon family，在真实 sidebar / tab / inspector / contextual slot、浅深色、1440 / 390 中比较。

**硬边界**：Lucide 仍是唯一发货中的通用家族；MingCute / Phosphor 仍是候选，不得改 `app/web/vendor/`、不得替换 sprite、不得混用家族、不得新增依赖。候选页必须明确“参考 / 待用户四轴裁定”，不能写成默认选型。

**验收**：每个观察绑定语义和槽位；保留可访问名称、尺寸、光学重量、浅深色结果；无假数据、无生产代码、无“已选 MingCute”结论。

### B · Agent Interface / UI Continuity 文档 PR（现在可做，docs-only）

2026-09-10接续：用户已授权建立[前端连续性v1](agent-interface-2026-09-10/frontend-contract.md)与[先例索引](agent-interface-2026-09-10/precedents.md)，并要求Luna核对。本候选的规范入口已交付；后续扩展先消费现有文件，不重复建立第二套索引。自动loader/全库机械lint仍未实现。

**目的**：把短上下文 agent 如何延续既有 Polish 的工作法写成可召回 handoff，而不是新增 runtime 或组件库。

**依据**：[agent-interface 候选索引](agent-interface-2026-09-10/README.md)、[S21–S22 来源登记](sources.md)、[补充转录](../mvp/execution/work-surface-kit/inputs/control-grammar-supplement-2026-09-10.md)。

**允许交付**：补充候选索引、canonical / reference / unverified / deferred 状态表、nearest canonical precedent 的召回模板、局部 PR 的验收清单；可提出 `AGENT-RULES.md` / `design/index.md` / role-token lint 的未来方案，但必须保持候选状态。

**硬边界**：不创建 package-coupled `agent-rules.md`、不引入 `llms.txt` 运行时、不引入 Appica / React / Tailwind / AI Elements / assistant-ui / AG-UI，不把 Appica 或 Atlassian 的具体规则写成 Courtwork 硬规范，不改 `AGENTS.md` 的项目治理 authority。

**验收**：文档能从仓库约束 → 问题索引 → 对应 grammar → precedent / specimen → work order / evidence 回溯；每个未裁项都标“仅供参考 / 未核验 / 未裁决”。

### C · FE-05a Typography + density V1 + Shape（可做，但属于实现 PR）

**目的**：落地已选的 V1 字阶 / 控件密度与 Shape grammar，解决局部施工最容易产生的视觉龃龉。

**依据**：[FE-05a 派单提示词](../mvp/execution/work-surface-kit/work-orders/WO-FE05A-dispatch-prompt.md)、[type-density constraints](type-density-constraints.md)、[V1 对照基线](type-density-ablation/v1/README.md)、[roadmap](../mvp/execution/work-surface-kit/roadmap-frontend.md)。

**允许交付**：只按既有工单修改 `app/web/`、相关测试、`tools/lint-shapes.mjs`、指定设计 / delivery / evidence 文件；包含 M-15 / M-16 / M-17、M-18、V1 token、Shape lint、1440 / 390 浅深色对照。

**硬边界**：不改 server / runtime / core / schema / brand；不引新字体、颜色、材质、依赖、数值控件或 `corner-shape`；不做 V2；不改 `HOME_COMPOSER_CENTRE` 0.56，除非工单规定的 M-18 实测明确触发并留下证据。

**验收**：全量回归、颜色 / 材质 / Shape lint、对比度、按钮不折行、触控命中区、HOME-16 三档 text-scale、作者验证与独立复核分列；视觉四轴留给用户。

### D · Attention triage front-end slices（有界实现 PR，需避开未决入口反转）

**目的**：把已交付 Attention 后端的真实 typed actions 接到只读事项面，或先制作不改产品代码的状态 / placement 设计稿。

**依据**：[attention-triage](attention-triage-2026-09-10/README.md)、[WO-ATT-FE01](../mvp/execution/work-surface-kit/work-orders/WO-ATT-FE01.md)、[Attention contract](../../docs/work-core/attention.md)。

**推荐拆法**：优先做 WK-157 / WK-158 / WK-160 的详情动作、时间、键盘和 Later 视图；WK-155“常驻入口从助手改事项面”的反转仍需 Astra 确认，不要在同一 PR 偷改。

**硬边界**：只写 `app/web/` 与对应前端 evidence；不改 `app/core/`、`app/server/`、`app/runtime/`、BE-40 或 Attention schema；按钮只由 `human_actions` 广告生成，沿 expected revision / request id / 409 回执，不新增批量动作、source-aware 字段、proposal 卡或真实外部接入。

**验收**：真实 Attention fixture、键盘 J/K/Enter/Escape、action revision / stale failure、reason 必填、Later 可见、unknown / unavailable 语义；不得用计数、颜色或百分比伪造状态。

### E · CC-I applicability / contextual toolbar（先做 Design contract，后做实现）

**目的**：将“工具栏放哪里”改为由 action applicability 推导，而不是堆叠 floating / bubble 变体。

**依据**：[WO-CCI-01](../mvp/execution/work-surface-kit/work-orders/WO-CCI-01-property-row.md)、[Atlas Control Grammar](atlas/README.md)、[WK-143 / WK-161](../mvp/execution/work-surface-kit/intake-round-3.md)。

**允许交付**：先产出 `appliesTo / requiresSelection / requiresCapability / risk / frequency / preferredSurface` 的事实表与真实已有动作映射；实现只覆盖已有 action contract 的 contextual surface。PropertyRow 的 provenance / reset 已有第一片，不要重复重做。

**硬边界**：不创建 BE-31 number schema、不臆造 Evidence / reviewer / policy scope、不增加 universal Dropdown / command palette、不改变现有 DOM builder 之外的架构。没有 owner fact 的 action 只能记为候选。

**验收**：每个动作都有 owner fact、适用对象、权限和首选 surface；不可用动作不渲染；focus / Escape / return path 可复现；不因参考库文档自动生成新组件。

### F · FE-05 Material / blur specimen（有前置，适合后续 Design PR）

**目的**：在 FE-05a 后对 solid / glass / smoke / review / Pages 的边界做一次一变量 specimen。

**依据**：[material grammar](home-composition-2026-09-10/material-grammar.md)、[EX-CC6 / WK-127](../mvp/execution/work-surface-kit/dispatch-round-4.md)、[roadmap](../mvp/execution/work-surface-kit/roadmap-frontend.md)。

**硬边界**：只在已登记 chrome / transient 面比较；内容面不 blur、禁止 glass-on-glass、必须保留 reduced-transparency / unsupported fallback；不得以 material 表达 agent 状态；不改变既有两处生产 blur 的边界。

**前置**：先完成 / 接受 FE-05a 的密度与 Shape 基线；若只是静态 specimen，可独立出图，但不能提前改生产材质。

## 暂不适合提交网页端 GPT 的方向

- Appica / React / Tailwind 组件库迁移或新 runtime：S21 明确只是未核验参考，不是架构授权。
- 全量 16-control board、TPS / TTFT sparkline、Context Meter：owner fact 或 provider timing 不足，当前已有明确拒绝。
- Waveform / waveform-playlist：Courtwork 当前无音频 artifact 域对象，只能参考。
- ApprovalGate 的 reviewer / policy version / expiry / quorum 全字段：会凭空创造域对象；当前只保留 authorization scope 可视化前置。
- BE-31 number schema、BE-34/35、真实 Email / GitHub 接入：属于后端 / 外部效果契约，不是网页端 Design PR。
- 一次性“大改全站视觉”或组件库统一迁移：违反局部 PR、单一 writer 和现有 grammar / evidence 追溯要求。

## 网页端 GPT 可直接复制的任务开头

```text
Repository: https://github.com/lesPrivilege/Courtwork.git
Base branch: main (read the actual HEAD before starting)
Task: choose exactly one candidate from engineering/design/web-gpt-design-handoff-20260910.md and execute only that bounded scope.

Read first: AGENTS.md, engineering/current.md, PAPER.md, the selected work order, the relevant Design Atlas / grammar, and its intake/evidence links.

Create an isolated branch from current main. Preserve the pre-existing changes in evidence/fe01-main-integration-20260909/wk98-regression.json and site/verification/main-20260910/; do not reset, stash, overwrite, or include them.

Treat external libraries and supplied research as references unless the local intake explicitly marks them canonical. Do not add dependencies, invent owner facts, create unsupported controls, or turn an unverified source into a hard selection. Do not merge, push, deploy, or claim independent acceptance. Return the branch, commit, changed paths, validation commands/results, unresolved decisions, and explicitly omitted work.
```
