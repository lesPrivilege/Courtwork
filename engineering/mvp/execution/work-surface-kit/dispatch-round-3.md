# 第三轮派单（Fable，2026-09-08）

依据 [EX-WK7 消费对照](explore/ex-wk7-frontend-consumption-diff.md)：前几轮前端裁定中已消费的有色彩三层、四层高度模型、壳位、侧栏次序、文案扫描、消融、BR-1、RC-1…10、UP-1…15；未消费集中在 Home 三带与表示原语、Settings 整页、Runtime Workbench IA、Chat Flow 卡片、glyph 表、热插拔槽位、键盘导航、文档清理。`presentation-primitives.d.ts` 至今零消费。以下按局部派单，每单引用裁定编号与体例（[copy-convention](../../../design/copy-convention.md)、[ui-composition-standard](../../../design/ui-composition-standard.md)、[icon-controls](../../../design/icon-controls.md)），实现者不得局部自说自话。

## 清洁节点（用户 2026-09-08：merge 后从清洁节点开始）

Opus 只从 Astra 合流后的 `main` 建工作树：合流内容 = `codex/harness-core` `d6247a8`（Work Core、NDA 后端闭环、跨 Session 续行、独立历史读取；代码基线 `1332691`，170/170）+ `claude/fable-settings`（本轮文档）。合流前不开任何前端单；Fable 已撤回预建的 WK10b 工作树。合流后 WK10b 第二段的契约依赖视为满足，排入序 2。

## 前端（Opus，单一 writer，串行）

| 序 | 单 | 局部 | 裁定 | 主要文件 | 开工条件 |
|---|---|---|---|---|---|
| 1 | [WK10b 第一段](work-orders/WO-WK10b-work-surface.md) | glyph 语义表（WK-71）、Chat Flow 卡片减法（WK-57）、热插拔槽位（WK-43 / 45；契约 `uiSlots` 已在 `control-contract.d.ts:74`）、工作面生命周期 | WK-43 / 45 / 57 / 71 / 72 / 74 | `app.mjs`、`surface-modules.mjs`、`contracts/glyph-semantics.md` | Astra给出合流清洁main SHA后。原第 2 项 Home 下带移入 WK13 |
| 2 | [WK10b 第二段](work-orders/WO-WK10b-work-surface.md) | NDA 逐规则 Review renderer、决定与修订、决定回执、继续已有事项、只读历史 | H1 / H3 契约（`docs/work-core/contract.md`）、frontend-entries §3、spec FN-17…25 | `extensions/inbound-nda/renderer.mjs`（新）、`app.mjs`（binding panel、回执行）、`styles.css` | WK10b 第一段合流后；allowlist 路径请求交 Astra |
| 3 | [WK13](work-orders/WO-WK13-home-bands.md) | Home 三带、StatTile、WorkCard 两态、adapter 落地、j/k 键盘、文档清理 | WK-4 / 32 / 34 / 37 / 46 / 56 / 76 / 79 / 80、DC-2 / 3 | `home-view.mjs`、`app.mjs`、`styles.css`、`presentation-adapters.mjs`（新）、`docs/ui-composition.md` | WK10b 第二段合流后 |
| 4 | [WK12](work-orders/WO-WK12-settings-page.md) | Settings 整页壳 + General / Appearance / Keyboard / Developer、用户 skin、本设备偏好 | WK-27 / 69 / 74 / 78 | `index.html`、`settings-view.mjs`、`app.mjs`、`styles.css` | WK13 合流后 |
| 5 | [WK11](work-orders/WO-WK11-runtime-workbench.md) | Runtime 组六节点入 WK12 页壳 | WK-63 / 64 / 66 / 68、RC-1…10 | `runtime-view.mjs`、`settings-view.mjs` | WK12 合流后 |

所有单以 [frontend-layering-spec](../../../design/frontend-layering-spec.md)（WK-82）为主规范，交付附其 §7 分配到本单的反例结果。每单交付：固定 SHA、受影响文件、同条件截图、消融表、`text-sweep.md` 增量、未检项；作者验证与 Astra 独验分列；视觉四轴留用户。

## 后端前置（Astra，登记不施工）

| 项 | 阻塞的前端局部 | 来源 |
|---|---|---|
| BE-1 / 3 `GET /work-activity?days=N` 按日 recorded run 计数、UTC 日界 | Home 上带 Heatmap 去 Planned | WK-37、EX-WK7 §1.6 |
| BE-12 `effort` 字段进入 provider-config / provider-models | composer 模型 chip 推理强度（WK-73） | EX-WK7 局部 10 |
| `revise_candidate` 的版本化 humanActions 声明与packet更新 | WK10b 第二段人工修订；现API已实现但未声明动作 | `docs/work-core/contract.md`、当前 `app/core/owner.mjs` |
| 静态 allowlist 增 `extensions/inbound-nda/renderer.mjs`、`app/web/presentation-adapters.mjs`（及 WK12 若新增模块） | WK10b 第二段、WK13、WK12 | `app/server/index.mjs:18–21` |
| 窄宗 composer 沉底 | Astra 暂缓项，待其回执 | WK-58 / 76 |

## 已超越或无需派单

runtime-ui-gaps B-7"无深色主题"已由 WK7 交付，标 superseded；WK9 r3 六态板设计不存在，热插拔的六态呈现待 WK10b 交付后按实际状态数补，不先画板。
