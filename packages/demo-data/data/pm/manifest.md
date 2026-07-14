# 雾灯项目板 · PM 样板清单

> **虚构样板水印：本目录全部组织、产品、人物、反馈、日期与指标均为虚构，仅供 Courtwork schema catalog 演示与测试。**

## 固定文件集

- `case-bible.md`：虚构项目身份、范围与边界。
- `materials/01-prd.md`：`pm.PrdReview` 的唯一原始材料。
- `materials/02-feedback.md`：`pm.FeedbackDigest` 的唯一原始材料。
- `artifacts/prd-review.json`：六类 PRD 缺陷的带锚结果。
- `artifacts/feedback-digest.json`：跨渠道反馈归集、聚类与未覆盖项。

## 材料内容版本

01-prd.md: sha256:8adf1e571a47a6016786819d61201fe084c2026e256319dbf84ae78c3caa4042

02-feedback.md: sha256:ba5c16a8b3f32cdf117017b93b126e49a6899b36b6a8fb6236e20d2204005a6c

上述值是材料完整 UTF-8 内容的 SHA-256；artifact 的每枚 `textLayerVersion` 必须与之相同。`textRange` 使用 JS UTF-16 string offset，并满足 `source.slice(start, end) === quote`。

## 边界

本样板只预览 schema catalog，不包含 PriorityScore、排序建议、PM scenario、prompt、live harness、企业接口或产品 UI。
