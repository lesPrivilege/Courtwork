# Pricing specimen · 商业化研究稿（Fable，2026-09-09）

用途：Pages 第 07 段的文案与规格。它是视觉与产品模型的探索，不是商业承诺；裁定 PS-22。文案改动回到本页，不在站点源码里另改。

## 1. 段落身份

段标题：**Where the value would sit** / **商业价值会落在哪一层**

标记（段首第一行，灰字，全程可见）：

> Concept pricing · commercialization study · not currently for sale

引句：

> 这一节回答的是"商业价值会落在哪一层"，不是报价。CourtWork 现在不出售任何东西。三条轨道是一份产品模型的研究稿，把 local-first、自带模型、Expert、Eval、治理与组织保证压成一眼能懂的形状。

前提句（研究稿的假设，不是结论）：

> **Keep intelligence portable; charge for coordination, assurance and operation.**
> 智能保持可迁移；收费的是协调、保证与运维。

## 2. 三轨

三列。Local 列的内容是仓库今天已经是的东西；另两列是概念。列标下各一行小字说明这一点。

| | Local | Professional | Organization |
|---|---|---|---|
| 价 | **$0** | **$29 / month** | **Custom** |
| 小字 | what the repository is today | concept | concept |
| 一句 | Your work stays yours. | A maintained professional workbench. | Governed work at organizational scale. |
| 项 | Local Matter store · Event log & provenance · Local runtime, bring your own provider or local models · Public eval suite · Exportable schemas · MIT source | Signed desktop builds · Managed updates · Cloud sync & backup · Hosted runtime · Continuous private eval · Managed integrations · Longer history | Shared Matters · Policy & review controls · RBAC / SSO · Audit exports · Private deployment · Sovereign-model support · Expert lifecycle management · SLA / deployment assistance |
| 动作 | **View source** | 无按钮；列脚一行 "concept · nothing to buy" | 无按钮；列脚同 |

列下一条，横贯三列：

> **Model usage is separate.** Bring your own provider, use local models, or use managed inference with a spending cap.
> 模型用量另计：自带 provider、用本地模型，或用带上限的托管推理。

不出现：月 / 年切换、Most Popular、Start free trial、annual discount、对比勾选表、Starter / Business 一类词。

## 3. 互动：哪一层产生价值

三列之下一组 segmented control：**Local · Hosted · Organization**。切换只替换下方一张静态 SVG，无运动；键盘可达；无 JS 时三张图纵向全部显示。

```text
LOCAL                    HOSTED                          ORGANIZATION

Matter store             Local / cloud Matter            Users
   │                            │                          │
CourtWork                CourtWork service               Policy ── Review
   │                      ├── Sync                          │         │
Your provider             ├── Eval                       Matter governance
                          └── Managed runtime               │
                                 │                       Expert runtime
                          BYOK / managed model              │
                                                         Audit · Eval · Provenance
```

图注：

> 三张图里，Matter store、event log、schema 与 eval 在每一层都在，且可导出；变化的只是谁来运维、谁来保证、谁来治理。

## 4. 材质与层级（沿 PS-3 / PS-19，只用产品 token）

- 外壳 `--panel-muted`，内层三张卡 `--panel`，圆角用产品 surface 档；卡与外壳之间是唯一的 nested elevation，不再给卡内行加阴影。
- Professional 列顶部一条 4px accent 带（Tier S accent），不整卡上色；不加徽章。
- Organization 列整体反色：容器上重声明产品深色 token 块（构建从 `styles.css` 抽取，同源），不是只换边框。
- 价格用产品最大字阶，feature 行用正文字阶，行距放宽；价与行之间留足空白。
- segmented control 沿产品既有样式（`--shadow-thumb`），不新作。
- 全段零 blur、零外部请求、零运动。

## 5. 与声称表的关系

本段不使用三档状态词；它的唯一状态词是段首标记。Professional 与 Organization 两列所列能力若在 05 段声称表中为 not yet，两处不冲突：一处说"今天没有"，一处说"若有商业层，它会长在哪里"。README 不含本段。
