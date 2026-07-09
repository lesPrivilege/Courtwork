# SPEC: packages/schemas（W1）

状态：未开工

## 职责

全仓库的契约根。定义领域 artifact 的 TS 类型 + JSON Schema + 运行时校验器。零运行时依赖（校验器可用 zod）。

## 交付清单

- `SourceAnchor`：来源引用锚（fileId + page + bbox/文本区间）。一切可溯源交互的地基，所有 artifact 的引用字段必须用它。
- `CaseFile`：案件档案——卷内文件清单、文书类型分类、摄取状态。
- `Timeline`：事件时间线——事件、日期（含模糊日期表达）、当事人关联、SourceAnchor[]。
- `PartyGraph`：当事人关系图谱——节点（主体：自然人/法人，含别名数组，服务实体对齐）、边（关系类型 + 证据 SourceAnchor[]）。
- `RiskList`：风险清单——风险点、等级、依据（法条/判例引用 + SourceAnchor）、处置状态（待确认/已确认/已否决）。
- `ReviewMatrix`：矩阵审阅——行=文档、列=问题、格=答案 + SourceAnchor[] + 置信标记。
- `RevisionEvent`：schema 级修正事件——谁、对哪个 artifact 的哪个字段、原值/新值、时间。反馈标注的统一载体，设计时假设它未来直接进训练管线。

## 验收

每个 schema：合法样例 ≥3、非法样例 ≥3 的校验测试；导出 JSON Schema 文件供 Python 侧（services/ingest）校验复用。

## 纪律

改任何已发布 schema = breaking change，需在本文件记录变更与受影响消费方。

## TODO（跨层放入区）

（空）
