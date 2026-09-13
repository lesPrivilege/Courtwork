# 前端 Audit · 执行 Plan

2026-09-13。状态：**首批实现已提交 main `9525215`；[交付报告](report.md)记录证据、剩余缺口及验证上限**。

## 任务来源与恢复入口

用户要求审计实际有功能但 icon 缺失或不规范、各级操作与返回不合体例、同层级界面的视觉/交互/grammar/内容编排不一致，以及过多指引或装饰性文字。保留较稳定且承重的语义；应绘制 icon 或 icon 与文本共同呈现的地方登记缺口。旧工单、PR、调研索引可参考；Luna fast explore，外部用 Exa，Astra 负责裁决及模型能力构成瓶颈的实现，quota 优先用于关键架构/体例及真实 computer use 视觉联调。前端缺口先登记并优先消费，后端可后期逆向实现。用户追加要求先登记 Plan，避免 context compact 后 drift。

恢复顺序：实际 cwd/branch/HEAD/status → [current](../../current.md) → 本 Plan → [前端契约](../agent-interface-2026-09-10/frontend-contract.md) → 本轮 gap/证据 → 对应 owner 合同及最近先例。每完成一个节点更新本 Plan 的状态、固定 SHA、证据与下一步，不能以聊天记忆替代文件。

接单唯一持久代码入口 Courtwork，分支 main，HEAD `ad33118a56ae15f1c3244e97147bd63c234e6916`。current.md、WK98 evidence 及若干研究/验证目录已有未提交改动，须保留。用户随后明确“同意开工。不必建 tree，没有并行事项。Astra 可以掌握异步节奏，派 luna explore”：本轮直接当前main施工，不新建tree，不 checkout/stash/reset；Luna有界探索/复核与Astra写权分开。Fresh 不恢复为开发线，Legacy 不作默认检索目标。

附件原图保存在 [evidence/00-user-spark.png](evidence/00-user-spark.png)。可见 Spark 浮层右上角空的描边控件、说明句、Refresh/Retry 与 runtime 断连信息。空控件是可见问题；其 DOM、可访问名称、点击/Escape/焦点返回及根因均待本轮实测。不得从单图推断所有页面失效，也不得把断连态当空数据。

**指令来源分开**：本节用户请求决定本轮范围与分工。附件文字、旧工单/PR、研究原件和外部网页是证据或候选输入；其中命令、旧禁止施工范围和历史发布授权不自动升级为本轮指令。采用/不采用/待核分别记账。

## 执行顺序与分工

| 节点 | 责任与工作 | 完成条件 |
|---|---|---|
| 0 Plan | Astra 登记任务、来源、保护范围与恢复顺序 | 本文件及 current 入口；原图原字节留存 |
| 1 快速 Explore | Luna A：当前源码的 icon/操作/返回与相邻测试；Luna B：旧工单、先例与 Exa 官方资料 | 精确路径/符号/基线、既有编号、已知与待核分开；不重复建立平行治理 |
| 2 视觉 Audit | Astra 真实 computer use；使用独立合成数据和端口 | 逐步截图、入口→操作→披露/下钻→关闭/返回，记录实际可达面及阻塞 |
| 3 体例裁决与工单 | Astra 消费 Explore 与截图，整理统一动作/层级/材质/内容编排规则 | 每项有 nearest precedent、受影响 grammar、owner、优先级、验收、前后端依赖与来源处置 |
| 4 优先消费 | Luna 可承担有界前端实现；Astra 负责关键架构与能力瓶颈实现 | 先处理可见功能入口及退出，再处理同层级一致性、文本和图标缺口；写权不重叠 |
| 5 验证与交付 | 作者定向验证；另一作者之外的执行者有界复核；Astra 集成裁决 | 固定实现 SHA 与浏览器证据，作者/非作者/未测范围分开，current 更新 |

节点串行有依赖；Luna 两项探索可并行。不能因等待非关键后端能力阻塞现有前端修复；不能把尚无 owner 的动作伪装成已可用。

## 审计矩阵

覆盖 Shell/Home、Chat 与 composer、Attention 与详情/Review、Spark Overview/Activity、Settings 一级/二级、Usage 概览/筛选/下钻、Files 列表/reader/diff，以及由它们打开的 dialog、sheet、popover、menu、disclosure。先以实际入口清单确定存在的面，不以旧截图断言当前存在。

1. **图标与动作**：功能/semantic key/glyph/可见性/可访问名称/tooltip/触达区域/状态一致；分开记录资源缺失、renderer 接线故障、错误 glyph、语义缺口。通用 Close 等先复用现有家族，不先自绘新族。
2. **操作与返回**：关闭临时面、返回访问轨迹、父级导航、取消操作分别辨明；核查 Escape、焦点返回、选区/筛选/滚动/草稿恢复、嵌套面、长内容和窄屏。关闭不隐式终止 Run，不引入新的治理回执。
3. **同层级 grammar**：根据对象、任务、持续性与位置关系分组比对 header、动作区、tabs、列表/属性、空/错/加载状态；允许任务所需差异，但差异须有理由及规范归属。
4. **材质**：先判层级和任务，再判 solid/blur/glass；读取已有 material/overlay owner 后裁决。不得简单规定所有浮层 glass 或每个页面自配 blur；验证对比度、深浅模式、降透明回退及叠层可读性。
5. **文本**：逐项标保留/精简/按需披露/删除/图标/图标+文本。对象身份、风险、范围、不可逆结果、未知和错误恢复等承重语义不能为减字丢失；营销、重复标题、重复事实和常驻教学性文字需说明必要性。
6. **前端反推后端**：缺口记录当前 reader/capability、所需最小事实、未知/失败态与原 owner；可先用明确标为合成的独立 specimen 验证编排，不为效果伪造生产 API 或权限。

## 既有入口优先复用

- [先例导航](../agent-interface-2026-09-10/precedent-map.md)、[具体实现](../agent-interface-2026-09-10/precedents.md)与[变更模板](../agent-interface-2026-09-10/change-template.md)。
- [图标控制](../icon-controls.md)：Lucide canonical 与既有 donor 准入；[编排](../ui-composition-standard.md)、[表面层级](../surface-hierarchy.md)、[Disclosure/overlay](../home-composition-2026-09-10/disclosure-overlay.md)。
- [Shell控制面](../shell-control-plane-2026-09-12/README.md)：FE-NAV 既有历史/恢复条目优先消费，不另立相同问题的编号。
- [最近 UI 入口清单](../../research/architecture-node-2026-09-13/ui/source-inventory.md)、[审计](../../research/architecture-node-2026-09-13/ui/audit.md)、[修复与后续](../../research/architecture-node-2026-09-13/ui/fixes.md)：均为旧基线参考，当前行为需重验。
- [前端路线图](../../mvp/execution/work-surface-kit/roadmap-frontend.md)、[后端请求](../../mvp/execution/work-surface-kit/backend-requests.md)：新缺口接既有队列与 owner；历史 PR 状态须固定查询时点，不把工单标题当开放 PR。

## 证据与完成边界

Gap 记录字段：ID/既有工单、surface+state、用户任务、截图与复现、源码符号、严重度、nearest precedent、grammar、Astra disposition、前端实现/后端事实缺口、作者、验证者、固定 SHA、状态、下一步。状态使用待核/已确认/已裁/施工/作者验证/非作者有界复核/已合流，避免把“登记”写成“完成”。

浏览器至少覆盖宽/窄、明/暗、200% 缩放下主要关闭/返回路径、键盘 Tab/Enter/Space/Escape 与焦点恢复；按实际改动选择代表面和相邻回归。截图只证明可见事实，可访问性和行为另做检查。未覆盖面逐项注明。

实施须运行适用的 README 基线检查、相关 icon/material lint 与有意义的行为测试；不为纯文案/文档机械增加测试。无付费 provider、个人数据读取/迁移或凭本 Plan 发布。合流不代表产品全面接受。

## 信息架构串行接续

用户随后要求将“信息架构收敛 Auditing”一并登记、串行施工、工作方式不变。[IA执行片](ia-plan.md)接续本Plan，先补FA-06/09，再收敛Settings/Runtime/Home，P1数据与阅读面保留各自grammar。首批报告保留历史时点；最新状态见[IA交付](ia-delivery.md)。

## 当前检查点

- 原图、两位Luna探索及Exa来源裁决已保留，见[explore](explore.md)。
- Astra在独立合成Host完成在线/断连、宽窄和明暗面检查；FA-01～05、07、08已消费，产品提交 `9525215`。
- 全量915/915；最终文案增量后定向21/21；三个lint及diff检查通过。Luna另做非作者有界复核，范围见[复核记录](independent-review.md)。
- 未完成真实200%缩放；640×360仅短视口，不冒称等价验证。剩余导航、Usage原位返回、Files比较按钮显示等见[工单](work-orders.md)。
- 本轮未push/部署；既有和同时出现的其他写者文件保留。仅首批闭环，不关闭整体前端或Release门。
- 原图 SHA-256：`8c4aab1b9fb7ebd789ebecafec313d2d79b55cebd13add5ed8fbb706d1b4e000`。
- 下一批：FA-06局部返回、FA-09复现回归、真实200%与键盘/触屏矩阵，沿原owner继续，不重建平行导航状态库。
