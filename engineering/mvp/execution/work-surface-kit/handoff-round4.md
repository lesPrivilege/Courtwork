# 第三轮收口与第四轮交接（Fable，2026-09-09）

本页是本 Fable session 的清账：给 Astra 的合流与后端清单，给 fresh Fable 的阅读顺序与开工节点。状态仍只在 [current](../../../current.md)；本页不另立状态账本。

## 1. 本轮已合流与待合流

| 分支 | 内容 | 状态 |
|---|---|---|
| `claude/fable-two-lines` → main `8023e1b` | 合流复验、harness-core、frontend-entries、public-copy、frontend-layering-spec（WK-82） | 已合流 |
| `claude/fable-settings` → main `a2c2e4c` | WK-77…83、WO-WK12 / WK13、EX-WK7、dispatch-round-3 | 已合流 |
| `claude/wk10b-first` → main `62556b7` | glyph 语义表、Chat Flow 一行解剖、槽位契约、缺席四态（WK-84） | 已合流 |
| `claude/wk10b-second` → main `b7fa5e2` | NDA renderer、决定 / 修订 / 回执、续行、只读历史（WK-85） | 已合流 |
| `claude/wk13-home` → main `429fdd6` | Home 三带、StatTile、adapter、j/k（WK-86） | 已合流 |
| `claude/wk12-settings` → main `14ebd61` | Settings 整页、外观自定义、本设备偏好（WK-87） | 已合流 |
| `claude/wk11-workbench` `644cc43`（+ 复核提交） | Runtime Workbench 入壳 + WK-87 追加（WK-98） | 待 Astra 合流 |
| `claude/fable-round4` | WK-88…97：两份独立审查裁决、composition law、WO-FE-round4、EX-WK8 台账、BE-17…20、本页 | 待 Astra 合流 |

合流顺序：先 `claude/wk11-workbench`，再 `claude/fable-round4`（只有文档，与 WK11 无文件重叠）。

## 2. WK11 复核

`claude/wk11-workbench` `644cc43` + Fable 复核提交（WK-98）：208/208 独立重跑通过；接受删除 L2 Runtime 面板；两处小缺陷（裸 `null`、深链 401 竞态）列入 FE-01 首项；BE-13 未复现保留。详见 [delivery-wk11 §17](delivery-wk11.md)。

## 3. 给 Astra

1. 合流上述两支；复跑分配到 WK11 的 FE-T03 / T04 与 RC fixture（20 / 9 / 36）。
2. 后端请求台账 [backend-requests](backend-requests.md)：BE-1 / 3（work-activity）、BE-12（effort）、BE-14（decidedAt）、BE-15（Matter title）、BE-16（runtime-info 数据目录）、BE-17 / 18（Fetch models / Test connection）、BE-19 / 20（Memory adapter / Temporary chat）。FE-02 与 FE-03 的可见入口以这些为前置；未交付前前端不画按钮。
3. Pages 发布面：[public-copy](../../../release/2026-09-08/public-copy.md) §2 词表随 FE-01 更新后再交 Opus 发布面施工；G1 真实 provider 仍由用户在 GUI 配置。
4. roadmap / current 中的 Paper 9.3 表述若仍未同步，按 DEC-012 改为 9.6。

## 4. 给 fresh Fable

阅读顺序：
1. `engineering/current.md`（Astra 维护的唯一状态）。
2. [intake-round-3](intake-round-3.md) §4g / §4h（WK-88…97）与 [WO-FE-round4](work-orders/WO-FE-round4.md)。
3. [frontend-layering-spec](../../../design/frontend-layering-spec.md)（主规范；§2.1 / §3.1 已按 WK-90 加修订注）。
4. 三份输入：[语义审查](inputs/review-semantics-2026-09-09.md)、[视觉审查](inputs/review-visual-2026-09-09.md)、[composition 参考](inputs/composition-references-2026-09-09.md)。
5. [EX-WK8 台账](explore/ex-wk8-primitive-ledger.md)（FE-04 输入）与 [EX-WK7](explore/ex-wk7-frontend-consumption-diff.md)。
6. 最近三份交付：[delivery-wk13](delivery-wk13.md)、[delivery-wk12](delivery-wk12.md)、[delivery-wk11](delivery-wk11.md)。

开工规则：只从 Astra 合流后的清洁 `main` 建树；Opus 单一 writer 串行；每单引用裁定编号与三份体例；交付附消融表、text-sweep 增量与分配反例；作者验证与 Astra 独验分列；视觉四轴留用户。

次序（WK-95）：FE-01（词表 + Settings IA + chrome + Home / Work composition）→ FE-02（Models & Connections）→ FE-03（Chat / Work / Memory shell）→ FE-04（primitive 审计）。材质 / 动效在四单之后。

FE-01 的三个前置判断已定，不再重议：Chat 恢复为用户词；Runtime 入 Developer；Home 以 composer 为唯一 L1 锚点、StatTile 移到其下、Heatmap Planned 行移除、空态 31vh 退役。

## 5. 未闭合（本轮不解）

- G1 真实 provider：not_run，待用户 GUI 配置。
- G2 / G3：后端闭环与前端 Review / 续行 / 只读历史已交付，未做独立产品验收与真实模型演示。
- G4 / G5：Pages 与根 README 未施工；等 FE-01 词表。
- 触控、读屏（VoiceOver / NVDA）、真实 IME、200 % 浏览器缩放、1024–1439 中间档：各单均 not_run。
- FlowGate 来源未找到；`agenttrace-react` 只找到低成熟度替代。
