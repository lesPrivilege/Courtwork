# 工单消费台账（Fable，2026-09-09）

用户要求回顾最初工单，确保每一笔都被消费。状态：`已合入整合支` = 在 `claude/wsk-integration`；`已交付待合` = 有分支与交付但未进整合；`设计已交付` = 画布 / 契约；`未实施` = 有裁定无实现。

| 单 | 内容 | 状态 | 落点 |
|---|---|---|---|
| EX-WK1 | 本地 Canon 映射 | 已消费 | explore/ex-wk1，WK-24、WO-WK3 |
| EX-WK2 | Review 溯源 | 已消费 | review-projection §6 |
| EX-WK3 | 色彩与留白溯源 | 已消费 | WO-WK7 |
| EX-WK4 | 窗口控件官方接口 | 已消费 | WK-30 消费记录、WK8 留位条 |
| EX-WK5 | Home / 工作页数据与结构 | 已消费 | WK-37、WK9 |
| WO-WK3 | Review 投影契约 | 已冻结 | contracts/review-projection |
| WO-WK4 | Review 纵切（inline + inbox 同源、fixture 四态） | **未实施**（依赖 WK10 导轨与 Core 契约不变） | 排在 WK10 之后 |
| WO-WK5 → WK6 | 品牌注入 | 已合入整合支；WK-51 后收窄为 wordmark 一处 | wk6 |
| WO-WK6 | Home 构图 + 文本收编 | 已合入整合支；hero 符号按 WK-32 取消 | wk6 |
| WO-WK7 | 色彩三层治理与深宗 | 已合入整合支 | wk7 |
| WO-WK8 | slogan、按钮降级、命名、留位条 | 已合入整合支 | wk6 |
| WO-RC | Runtime 控制面 UI | 已合入整合支；B-1/2/4/10 转后端，B-8/9 留后续 | rc |
| WO-WK9 r1 / r2 | Home 三带与工作页两态画布、对齐带 | 设计已交付；r3（扩展六态板、消融表）**未做** | design/wk9 |
| WK-32 Home 三带 | 上带 StatTile、下带 WorkCard 行 / 卡两态 | **未实施**（上带需 BE-1 / BE-3；下带两态可在 WK10b 做） | WK10b |
| WK-33 / 41 / 72 工作面 | 模块登记表、悬浮卡 → 覆盖层 tab、glyph 竖条 | 已合入整合支（WK10a + r2） | wsk |
| WK-42 对齐带 | `--band-top` / `--col-gap`，两方对齐 | 已合入整合支 | wsk |
| WK-43 / 45 热插拔槽位 | 控制面快照驱动 mount / dispose | **未实施** | WO-WK10 |
| WK-44 / 59 文本清退扫描 | 全站三列清单与单词化 | 已合入整合支（text-sweep.md） | wsk |
| WK-47 消融表 | 每模块去除测试 | 已合入整合支（ablation-wk10a.md） | wsk |
| WK-13 / IC-1 图标尺寸档 | 行 16 / 控件 18 / 导航 20 | 已合入整合支 | wsk |
| WK-55 / 58 composer 稳定部分与悬浮层 | 下方上下文行在框外、Home 留白；沉底与窄宗材质 | 上下文行已合入整合支；悬浮层材质与窄宗沉底 → WO-WK10a | wsk / WK10a |
| WK-57 Chat Flow 卡片减法 | output / ask-user / edits | **未实施** | WO-WK10 |
| BR-1 | 品牌宿主取色 | 已合入整合支 | wk6 |
| WK-27 gaps | runtime-ui-gaps、gaps-wk9 | 已登记，后端待 Astra | — |
| WK-69 / 73 高度层与 composer anatomy | `--float`、区域映射、背景 lint；composer 框内 / 框外 | 已合入整合支（r2） | wsk |
| EX-IC1 | Icon 家族 specimen（Lucide / MingCute / Phosphor） | 已消费 | explore/ex-ic1-icon-specimen，WK-163 裁定 D；WO-IC-01 |
