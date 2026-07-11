# PM 包 MVP 规格终稿（2026-07-11，架构亲笔）

状态：设计时终稿，据 docs/61 普查 + docs/48 五项裁决。施工时序：收束后第一批（与 SCHEMA-SPEC-1/HARNESS-1/词表第一批合并工单序）。本稿即工单的"必读+验收标准"母本；实现零 core 改动，全部落 `packages/pm-*` 与声明文件。

## 〇、包结构

```
packages/pm-schemas    ← PM 产出契约（zod，依赖 @courtwork/schemas 基础类型：SourceAnchor/RevisionEvent/信源分级）
packages/pm-scenarios  ← 四场景声明 YAML + 提示词段 + 续行投影声明
packages/demo-data/pm  ← 栖屋 App 3.0 样板项目语料（分目录，装配点纪律照旧）
```

容器语义声明：项目=容器，迭代=阶段；三区映射：语料区（用户反馈/纪要原文，**只读红线**）／工作稿／产出（PRD/报告落用户文件夹）。信源分级换词表：A=容器内原文（带锚）、B=结构化导入、C=web 竞品材料（verified:false 族）。

## 一、PM-1 反馈归集（FeedbackDigest）

- trigger：语料区含反馈类文件（分类器 tag `user-feedback`）× 容器 kind=project × 动词"归集/整理反馈"。
- 步骤（固定编排）：逐文件抽取条目 → 归因聚类（跨渠道同根因合并）→ 声量×严重度标注 → 矩阵落格。
- 产出 `FeedbackDigestArtifact`：条目{quote(带 SourceAnchor)、channel、cluster、rootCause、volume、severity、status:enum[new|triaged|out_of_coverage]}；聚类{name、memberIds、evidence[]}。
- 门禁：无（纯分析产出）；无锚条目不落格。
- 渲染：矩阵原语（聚类×渠道）+ 清单原语；溯源 hover 引语。
- 投影声明：聚类名+条目计数+未处置数（≤6 行）。

## 二、PM-2 PRD 评审（PrdReview）——S3 换皮，差异化主打

- trigger：工作稿/上传含 PRD 类文档 × 动词"评审"。
- 步骤：章节完备性核对（against 声明的 PRD 骨架表）→ 逐条缺陷检查（模糊指标/缺验收标准/未定义边界/依赖缺失/冲突需求/不可测表述）→ 风险分级 → 修订建议落格。
- 产出 `PrdReviewArtifact`：发现{clause(锚)、defectType:enum 六类、severity:高中低、suggestion、status:待确认|已确认|已驳回}。**字段级同构 S3 RiskList**，仅枚举表不同。
- 门禁：修订建议写回文档 = 确认门禁（与 S3 修订轨同机制）；逐条确认/驳回落 RevisionEvent。
- 渲染：主从列表（评审矩阵）+ 文书预览；法理之线五态照用（处置状态语义完全同构）。
- 投影：已处置 n/m + 高危未决清单。

## 三、PM-3 优先级打分（PriorityScore）——S10 第二租户

- trigger：需求池文件/FeedbackDigest 存在 × 动词"排优先级"。
- 步骤：参数抽取预填（reach/impact/confidence/effort，各带来源锚或 out_of_coverage）→ **确定性脚本计算 RICE**（零 LLM 节点）→ 区间与敏感度标注（confidence 低者出区间不出单值——裁量区间纪律同源）。
- 产出 `PriorityScoreArtifact`：行{item、四参数(值+锚+填充方式:auto|manual)、score、rank、band:enum[P0-P3]}；公式版本号（参数表零年更，但公式可声明替换：RICE/ICE/WSJF）。
- 门禁：采纳排序进 roadmap = 轻确认。
- 渲染：表格原语（tabular-nums）+ statcard（分布概览，词表第一批消费方）。
- 投影：Top5 + 参数缺口计数。

## 四、PM-4 纪要行动项（ActionItems）

- trigger：语料区含会议纪要 × 动词"抽行动项"。
- 步骤：行动项抽取（谁/做什么/何时，各带锚）→ 跨纪要闭环核对（同项换负责人/未闭环检测——S1 矛盾标记同构，markers:"unclosed"|"reassigned"）→ 清单落格。
- 产出 `ActionItemsArtifact`：项{action、owner、due、sourceAnchors[]、markers[]、status:open|done|out_of_coverage}。
- 门禁：外发提醒类动作自动到门禁为止（docs/47 对外提交纪律）。
- 渲染：checklist 原语（词表第一批）+ 时间线（due 视图）。
- 投影：未闭环项 + 三日内到期项。

## 五、样板项目与验收标准

- demo 语料"栖澜·栖屋 App 3.0"照 docs/61 五考点预埋（跨渠道同根因/高声量低价值/PRD 六缺陷/行动项三换负责人/out_of_coverage 噪声）——每考点对应一条 golden 断言。
- 包级验收：①四场景声明过注册表校验（trigger 三维/双命名空间 pm.*）；②golden files 五考点全中；③**零 core diff 证明**（commit 清单全落 pm-*/demo-data/pm）；④与法律包并存零串扰（容器隔离既有 e2e 扩两断言）；⑤PRD 评审与 S3 同屏对照截图（投递展品页素材）。

## 六、明确不做（MVP）

竞品分析自动抓取（fetch 分期照 docs/27）、roadmap 甘特（gantt 原语挂账）、数据周报接数（S11 汇报族排期）、Jira/飞书项目同步（适配器 Stage 1）。
