# 投资讯息日更：轻量包实验田（2026-07-16）

产品负责人提案 + 架构分析。调研原稿，不具约束力；实施前需 ADR。

## 为什么是好实验田

社区已有成熟 skill（数据源/摘要/推送），无技术瓶颈——价值全在做减法、结构化可视化、下沉防呆：同一需求，通用 chatbot 给一段自由文本，我们给结构化日报（每条结论锚定到公告/财报坐标、事实等级分层、待确认决策清单而非荐股）。震撼度来自结构不来自模型，是「最后一公里电瓶车」的教科书样本，且与 `fortune-invest-schema-stress-test.md` 的 invest schema 草案（Watchlist/Thesis/RiskList/PortfolioSnapshot）直接接续。

## 关键依赖（不可绕）

**每日自动更新 = scheduled invocation = Stage 3 门槛**：roadmap 明确须先有 ADR 定义 authenticated principal、trigger context、idempotency、session budget、effect authorization；推送本身是 `external_send` effect，必须执行前授权。这与我们对外「不在授权语义定义前发布不可逆自动化」的立场一致——绕开即自毁叙事。

**但它是该 ADR 的最佳拉动者**：真实用例逼出真实需求（谁触发、幂等如何判、推送授权如何前置），远优于凭空立 ADR。

## 两段路径

- **前段（不碰 Stage 3，可在发版后立即做）**：用户显式触发的「今日简报」场景——轻量包 schema + 确定性工具（行情/公告拉取）+ 结构化 preview + 逐条锚点。这已能验证全部差异化主张，只差「自动」二字。
- **后段（Stage 3）**：前段跑通、真实使用产生定时需求后，以其为用例立 scheduled invocation ADR，再把触发从手动升为定时。

## 顺带记录

自动化日程、多 agent、Deep research 均属预设功能，集成形态是「加 harness/加场景声明」而非改 core——开源方案可取用；但每一项落地仍走各自 ADR 门槛（多 agent 涉 ADR-011 最小 harness 边界，Deep research 涉工具契约与来源分级）。不存在技术瓶颈，存在的是授权语义与复杂度预算的排队。
