# 当前工程状态

更新时间：2026-09-08（Asia/Singapore）。当前载荷已合入 Claude UI `dd65d2b`（包含 `4fab4bd`、`f8e3c19`）、Runtime Control Plane `8722259`、Brand `faef241`，以及 Astra 权限修复 `787bf1c`、Home composer 和 UI 编排收敛。准备迁入 `codex/fresh-courtwork`；实际同步结果以 [迁移回执](migration/2026-09-08/README.md) 为准。Legacy `main` 仍冻结。

## 已交付与验证

| 面 | 交付 | 边界 |
|---|---|---|
| Home | composer 主导，显式项目/写权限；草稿隔离与创建收据保护 | Home 10项反例、浏览器创建/等待/重连，非真实provider |
| 通用 UI | Claude 最新 polish，统一字阶、留白、卡片、Button、动作语义和对齐 | [编排标准](design/ui-composition-standard.md)；窄宽重排不等于完整浏览器缩放验收 |
| Runtime Control Plane | schema 4、资源/权限与 MCP 后端 | 后端134项已验；新控制面 UI 待施工 |
| Brand | 8个语义样板、5材质、40 SVG与独立动效组件 | 产品品牌语义注入由用户 merge 后首单交 Claude |
| 修复与回归 | 权限回滚/焦点，waiting 静态状态，Home创建失败后项目选择 | [最终 UI 审核](../evidence/final-ui-audit/README.md)：Home10 + UI20 |

品牌另有 [验收记录](../brand/evidence/ACCEPTANCE.md)：浏览器10项和独立组件13项。独验与作者观察分开登记；不据此声称真实模型、完整读屏/物理IME、全部触控/缩放或最终产品通过。

## 后续施工

1. 完成本次候选同步与独立远端 clone/恢复；结果登记迁移回执。
2. 用户在 merge 后第一轮向 Claude 提交 Court Work 品牌语义注入；本轮已交付可复用的通用 UI 编排标准与品牌包。
3. Runtime 基础配置/状态应属于第一层 GUI，按 [Astra范围裁定](migration/2026-09-08/runtime-control-frontend-intake.md) 消费真实后端契约；不虚构 MOE 或未接入能力。
4. 用户在 Web UI 配置真实 provider 后补真实运行/tool/恢复链；Matter、完整工作纵切与 legacy distill 按既定边界推进。
5. `main` takeover 留待自足、真实链、legacy distill 与回退条件成立。Paper独立，固定入口 [PAPER.md](../PAPER.md)。
