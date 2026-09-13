# Luna 快速探索回收

2026-09-13，固定源码基线 `ad33118a56ae15f1c3244e97147bd63c234e6916`。两位 Luna 只读探索；Astra 汇总。此为源码/合同/外部来源发现，不是当前 UI 行为验收。

## 当前源码

- `app/web/spark-view.mjs` 的 `action('x', 'Close Spark', ...)` 与 `app/web/vendor/icons.svg` 的 X 均存在；附图空控件不能直接登记成资产不存在。下一步看实际 SVG use 解析、加载与 computed box。源码与照片的具体版本、host、状态尚未对齐。
- Spark/Usage 各自有 native dialog close 和 opener focus，样式在 `app/web/styles.css` 相邻但分开；不因独立实现就判定体验不一致，需同状态并排核验。当前 solid panel + scrim，附图灰色背景不是必须增加 glass 的证据。
- `app/web/materials-view.mjs` 有文件返回时恢复 scroll/opener 与 retained-version 对应控件的实现；作为深层返回的近例。
- `app/web/app.mjs` 的 Settings 返回与 modal 关闭分开；FE-NAV 仍有完整访问历史缺口，不能把局部焦点恢复称为全局 Back/Forward 已实现。
- 定向检查候选：`app/tests/spark-view.test.mjs`、`spark-routing.test.mjs`、`spark-live.test.mjs`、`product-icons.test.mjs`、`settings-navigation.test.mjs`。源码断言不证明 glyph 在当前浏览器可见。

## 旧规则和增量范围

- 入口仍为 [前端契约](../agent-interface-2026-09-10/frontend-contract.md)。图标沿 [glyph semantics](../../mvp/execution/work-surface-kit/contracts/glyph-semantics.md) 和 [icon controls](../icon-controls.md)，IC-8 / WK-163 保留 Lucide，不能将较早家族候选当当前选型。
- [copy convention](../copy-convention.md) 与 [text sweep](../../mvp/execution/work-surface-kit/text-sweep.md) 已有稳定文案及历史逐条处置；新单只登记当前差额。
- [material grammar](../home-composition-2026-09-10/material-grammar.md)、[disclosure overlay](../home-composition-2026-09-10/disclosure-overlay.md) 及 `tools/lint-materials.mjs` 已约束材质/透明度回退。Blur/glass不是从零选型；具体未落地部分按原交付与deferred状态核对。
- WO-FE-round4、WO-FE01、FE02–05A、EX-IC1/WK-163、WO-PG-01、WO-WK12、[Chat controls](../chat-controls-2026-09-10/README.md)、[Shell FE-NAV](../shell-control-plane-2026-09-12/README.md) 以及最近架构节点UI修复是优先召回索引。当前修复是否覆盖用户现象仍待实测，不因旧测试通过关闭本轮缺口。

## Exa 外部核查

由 Luna 经 Exa 定向查询，检索日期 2026-09-13。仅支持具体交互原则，非本地实现或产品接受证据。尚未归档工具原始全文，不作逐字引文。

| 官方来源 | 可消费的原则 | Astra 本轮处置 |
|---|---|---|
| [WAI APG Dialog Modal](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/) | 可见关闭入口、初始焦点、Tab containment、Escape、合理的返回焦点 | 用作已有 overlay 规则的审计依据 |
| [Apple HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials) | 控制/导航层与内容层区分，材质服务层级；Reduce Transparency | 作为层级理由参考，不将 Apple 材质直接移植为 CSS 选型 |
| [WAI APG Names and Descriptions](https://www.w3.org/WAI/ARIA/apg/practices/names-and-descriptions/) | 可访问名称说明功能，关闭图标按 Close 动作命名 | 名称与可见 glyph 分开验收；已有名称不替代可见入口 |

下一步按 [Plan](PLAN.md) 节点2执行浏览器审计，先对齐实际版本和独立合成服务，再裁定首批工单。
