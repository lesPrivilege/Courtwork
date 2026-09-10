# Continuity checklist · 局部 UI 施工的召回与复核清单

配套 [README.md](README.md)（权威模型与状态词表）与 [precedent-map.md](precedent-map.md)（按问题寻址）。

本页为[已授权前端连续性v1](frontend-contract.md)的扩展检查表。适用项按v1执行；具体任务可使用[变更记录](change-template.md)短模板，不要求重复填两份表。自动机械门未因本页出现而建立。

## 1. Continuity header 模板

在实施**之前**填写，随交付一起回报：

```text
## Continuity header

Intent:
Touched surface(s):
Touched semantic(s):
Owner fact(s):

Changed dimension:
- information / geometry / component / typography / iconography /
  material / motion / interaction / placement

Held constant:
- ...

Canonical local precedent:
- ...

Relevant grammar:
- ...

Reference-only sources:
- ...

Existing implementation inspected:
- ...

Known misfit(s):
- ...

Unresolved:
- ...

Explicitly forbidden drift:
- ...
```

## 2. 施工前的召回检查

```text
[ ] 已读 AGENTS.md 与 engineering/current.md，确认本次 scope authority
[ ] 任务已解析成坐标：surface / semantic / operation / state / viewport / changed dimension
[ ] owner fact 已定位，并且确实存在（不是从 UI 反推的）
[ ] 已按 precedent-map 找到 problem_key，而不是按库名找组件
[ ] nearest precedent 的 rank 已确定（只有 1–5 可直接落地）
[ ] 先例的status/证据类型已区分；只有确切接受范围内的canonical约束可直接采用，未被superseded_by取代
[ ] 相关 grammar 的负规则已读（不是只读正面规则）
[ ] 已看过真实的当前实现，而不是只看文档
[ ] 检索已停在问题答完处，没有为"保险"批量加载
```

## 3. 一次一变量 / 声明式 delta

写明改了什么、什么不变。例：

```text
Changed:
icon family

Held constant:
semantic
visible label
accessible name
control size
hit target
spacing
shape
material
placement
state
```

```text
Changed:
typography + density per accepted FE-05a contract

Held constant:
color
material
navigation IA
owner facts
runtime behavior
```

若实施必须触碰一个**未声明**的维度，先归类为
`required dependency` / `existing defect` / `precedent mismatch` / `new design decision`，然后记录；已有授权内的必要依赖/修复继续处理，超出授权的设计决定再交owner。不得安静扩张PR。

## 4. 漂移检查（实施中）

```text
[ ] 没有新增 owner fact、域对象、状态名或权限
[ ] 没有把外部来源的具体数值 / token 名 / 组件 API 写进本地规则
[ ] 没有把尚未实现或无owner/capability的动作渲染成可用控件；已有动作的在途/禁用态沿原合同
[ ] 没有用颜色、计数或百分比伪造状态
[ ] 没有顺手修复相邻的无关 UI
[ ] 没有引入依赖、字体、runtime 或构建步骤
[ ] unknown 与 unavailable 没有混用；missing 没有当成 zero
[ ] 深浅色、1440 / 390、reduced-transparency / reduced-motion 都过了一遍
```

## 5. CONTINUITY-GAP 登记模板

代码、文档与先例互相矛盾时，**不要自动清理**：

```text
CONTINUITY-GAP
surface:
semantic:
current implementation:
expected precedent:
source of expectation:
difference:
likely class:
  stale docs /
  stale implementation /
  deliberate exception /
  unresolved
within current PR scope: yes/no
```

`no` → 保持产品不变并报告；按需登记进 [misfit-ledger.md](../../mvp/execution/work-surface-kit/misfit-ledger.md)。

## 6. 交付前检查

```text
[ ] Continuity header 已填全，Held constant 与实际 diff 一致
[ ] 每处改动都能回溯到 owner fact 或已裁 grammar
[ ] 引用的每个非权威来源都带 canonical / reference / unverified / deferred
[ ] 适用的机械检查已跑（见下）并附结果
[ ] 未决项、被拒项、显式未做项分列
[ ] merge / push / 部署符合已有授权，没有自称独立验收
```

适用时可跑的现有机械检查：

```text
node tools/check-doc-links.mjs
node tools/lint-colors.mjs
node tools/lint-materials.mjs
node tools/lint-interaction.mjs
node tools/contrast-report.mjs
```

（文档-only 的改动通常只需 `check-doc-links`。）

## 7. Dry run：六个提示词的召回轨迹

用来证明本索引可用而不需通读仓库历史。

### A · "把 Send 控件做得更醒目"

```text
problem_key: composer
→ owner fact: primitive-canon §2.2 / §3.2、ui-state-vocabulary §1（run 状态）
→ 现有 Send / Cancel 语义与实现：app/web/user-message.mjs
→ grammar: Atlas Control Grammar 段 + icon-controls IC-1
→ 视觉维度分流：排版 / 密度 → WO-FE05A；图标家族 → EX-IC1（deferred，未派）
```

结论：可做，但必须先声明改哪一维。

拒绝：不改 run / cancel 语义；未在 scope 内不加动效或材质；不新增 send 状态。

### B · "加一个 context window 百分比刻度"

```text
problem_key: projection.value
→ Projection Grammar 负规则：estimate ≠ meter
→ owner fact: app/docs/request-telemetry.md
```

结论：`deferred` —— 缺少 owner 测量口径。不做 UI 实现（既有比例条已按 WK-147 (a) 拒绝画成余量刻度）。

### C · "用 Appica 的 popover，它更精致"

```text
problem_key: popover.inspector
→ 本地：disclosure-overlay.md + Atlas + app/web/inspector.mjs + CC-I
→ Appica：sources.md S21，reference / 未核验
```

结论：不加依赖，不迁 React / Tailwind；只借可适用的行为与解剖，并且要能落回本地 grammar。

### D · "在授权卡上加 Always allow"

```text
problem_key: approval
→ 本地 permission / review 契约：review-projection.md、ui-state-vocabulary §2、docs/work-core/contract.md
```

结论：拒绝。外部审批组件示例不能扩张本地封闭动作集（S11 已明确 `Always allow` 不采纳）。

### E · "把内容卡片也做成玻璃的，跟 chrome 统一"

```text
problem_key: material.chrome / material.transient
→ material-grammar.md：内容层不 blur、禁 glass-on-glass、必须保留回退
```

结论：拒绝内容层 glass。可讨论的只有已登记的 chrome / transient 面，且需 FE-05a 前置。

### F · "加 TPS，agent 产品一般都有"

```text
problem_key: projection.value
→ owner fact: app/docs/request-telemetry.md
   decodeTokensPerSecond / providerTtftMs 被冻结为 null
```

结论：`deferred`，直到存在有效的 timing 测量。不用"别的产品有"作为理由。

## 8. 这份清单不做的事

本清单不自动加载context、不生成组件、不引入lint新门；本次整合已从AGENTS/current接入v1规范，无产品代码变化。它让"找到先例 → 声明 delta → 对照复核 → 记录 misfit"这条路径可重复。
