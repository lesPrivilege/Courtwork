# equity-research-skill 标本与 invest 垂类形态定调（2026-07-18）

调研原稿，不具约束力。标本：github.com/rollingSirius/equity-research-skill（MIT，中文，九章投研报告 skill，纯 Markdown 指令，五步工作流 + 估值三方法交叉验证）。

## 标本价值：prose 纪律 ↔ schema 字段的逐条同构

该 skill 的「研究纪律」四条与我们已有/已设计的件一一对应：

| skill prose 纪律（求模型自律） | Courtwork schema 件（系统强制） |
|---|---|
| 每个关键数据标注来源与时间 | 锚点/引语坐标（无锚不落格） |
| 冲突数据显式对账 | 双值锚（同一事实两来源并置，时序图谱面已设计） |
| 缺失数据如实标注「未获取到」 | OOC 出格（score=null 显式态，挂 PM-SCHEMA-1） |
| 事实与判断分离 | 事实等级 + 模型只生成不裁决 |

这是 skill-refinery 可编译性类型学 (a) 类（确定流程+结构化产出）的理想标本：九章模板/估值交叉验证表/分析师观点汇总/催化剂清单全部天然成表。

## 产品定调（产品负责人 2026-07-18）

**invest 类垂类的接入形态 = skill 生态供研究能力，我们供可视化 schema 表**。股票域现成 skill 众多（能力已商品化），我们不重写研究逻辑——做的是把 skill 的 prose 纪律升格为 fail-closed 字段的那张表：估值区间（Estimate 点值/区间件）、来源时间戳（锚点）、冲突对账（双值锚）、缺失（OOC）、判断确认（分级确认门）。与 anysearch 定调（检索恒为未锚定线索级）、frontier 扫描（LAB 供弹格局）同一条线：**能力层繁荣即我们的上游繁荣，秩序面是唯一不可商品化的层**。

## 落地钩子

- SKILL-REFINERY-1（发版后队列）试点序更新候选：本标本可替代或并列 Vercel react-rules 作为首个 (a) 类试点——中文、MIT、表格骨架现成（references/report-template.md），且 invest.RiskList 同构证据已有（fortune-invest 压力测试）。
- 设计侧：RiskReviewSurface 的 domain 词表缝已证跨域（PM）；invest 域第三词表是零成本验证候选。
- Estimate 族（点值/区间/敏感性）在本标本的估值表里是刚需——为 PM-SCHEMA-1 顺带拍板的 OOC/Estimate 件再添一个消费者。
