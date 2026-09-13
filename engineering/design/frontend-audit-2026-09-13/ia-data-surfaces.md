# 信息架构收敛 · 数据与阅读表面映射

2026-09-13 · 有界源码映射。基于当前共享 `main` 工作树；它包含未提交的 Astra 修改，以下只记录可见代码事实，不视作合流或独立验收。范围仅 Spark、Usage、Run Telemetry、Materials 和 Markdown Reader。L1/L2/L3 是本轮注意力标记，不是新的产品模板。遵循 [IA Plan](ia-plan.md)、[precedents](ia-precedents.md) 和 [frontend contract](../agent-interface-2026-09-10/frontend-contract.md)；未做浏览器核验。

## Spark · 维护观察

- **当前信息层与 grammar**：标题/一句对象说明；项目范围与 Refresh；本地 Overview / Activity tabs。Overview 将 Matters 分成 `Behind the current source set`、`Unavailable`、`Up to date`，quiet 项不生成更新提示。Activity 以 Matter、status 两个筛选器缩小结果，按 Matter 分区并用表格呈现候选 revision、behind 数和 supersedes。as-of、scope partial、分页、无源/读取失败各有自己的状态。Sample 明确标为样本、可选情境，并以只读路径显示。
- **保留 / 可对齐**：保留维护状态分组、样本与 live 的来源区别、候选到 source version 的关系，以及无数据、不可用、失败的语义差异。可与 Usage 对齐的是观察 dialog 的可见标题/关闭、内部滚动、局部筛选与 tabs 的行为；不要把候选表格改成 Usage 图表或统一度量。
- **源码符号 / 最近先例**：`renderOverview`、`renderActivity`、`renderContents` (`app/web/spark-view.mjs`)；FA-02 已有的 observer-dialog 固定 header / 内滚 body 规则见 [work-orders](work-orders.md)；Grafana list-of-objects 只作列表组织参考，适用边界见 [precedents](ia-precedents.md)。
- **未验证**：当前视口下 tab / filter 重绘后的焦点和滚动；筛选为空、分页边界、partial scope 与 sample 切换的实际可达性。源码具备状态分支不能替代浏览器检查。

## Usage · 聚合与匹配 runs 下钻

- **当前信息层与 grammar**：标题说明 retained runs / reported tokens；project、period、metric controls；Overview / Models 本地 tabs。Overview 有按日强度日历、按模型排行与 matching-run 下钻；Models 有按日模型叠图及精确模型、UTC start-day 表。`Daily values`、`Model totals`、`Accounting details`、scale 说明按需展开。数字标注 incomplete/lower-bound；底部限定 retained records 和 coverage 未知。当前工作树加入显式 `Back to usage`，保留触发 control key、view 与 body scroll 位置。
- **保留 / 可对齐**：保留 UTC 起始日、run-start 配置身份、缓存字段不一定互斥、删除记录与历史覆盖未知、缺失用量为下限、非 billing 等口径；绝不把 retained zero 写成历史无活动。与 Spark 同属 observer dialog，可对齐标题/关闭、滚动/focus 返回和 tabs/filter 的 chrome 行为；聚合 chart/table 和 exact matching-run list 的层级、语义不同，应保留。
- **源码符号 / 最近先例**：`createUsageView` 中 `inspect` / `returnToUsage` / `render` (`app/web/usage-view.mjs`)；[Usage data visualization contract](../home-composition-2026-09-10/data-visualization.md) 定义 interval、coverage、partial 值不可冒充完整总额；FA-06 与 `materials-view.mjs:returnFromFile` 是局部返回/恢复最近先例，状态见 [work-orders](work-orders.md)。
- **未验证**：FA-06 的返回原图表行为目前有定向回归文件 `app/tests/usage-view-navigation.test.mjs`，仍需真实浏览器验证不同图表/表格触发点、分页、迟到响应、scroll/focus 恢复；核对空、全零、部分覆盖的视觉读法。

## Run Telemetry · 请求观测详情

- **当前信息层与 grammar**：Telemetry 不构成另一个全局 Usage 面。Run Inspector 的 Usage facts 之后，`renderRequestMeasurements` 给出 latest request / 请求数与阶段、host 观测 elapsed，展开后列每次请求、first output/text 与 provenance/缺失项。`compact` 只展示最新请求摘要；完整读数属于 run 级诊断披露。Schema / source 校验约束可读取的记录。
- **保留 / 可对齐**：保留 host semantic-stream 来源、requested/observed model 区别、phase、精度边界、缺失字段；`providerTtftMs` 与 decode token rate 被明确标为 unavailable，context 是字符数估算，不能包装成 provider waterfall 或确切 token telemetry。沿用 Inspector 的按 run 归属及 disclosure；可与其他详情对齐技术字段格式，不与 Usage 聚合面合并。
- **源码符号 / 最近先例**：`requestMeasurements`、`requestTiming`、`renderRequestMeasurements` (`app/web/telemetry-view.mjs`)；`renderRun` 中 Usage 与 telemetry 的相邻挂载 (`app/web/inspector.mjs`)；[Disclosure / Overlay Grammar](../home-composition-2026-09-10/disclosure-overlay.md) 支持次级事实按需披露，但决策相关状态不得藏起。
- **未验证**：长请求列表、缺失字段较多、失败/中断 phase 的可读性与 disclosure 重绘状态；当前源码检查不能证明 host clock / first-output 文案对用户足够清楚。

## Materials · 资源、修订与比较

- **当前信息层与 grammar**：Files/Materials 是 resource dialog：工作区资源列表 → source 的 retained versions → 选择两个精确 revisions 比较 → added/removed diff；读文件进入 revision-fixed Reader。Source、revision id/time 与比较端点是对象身份和操作上下文，不是装饰性技术项。Reader 关闭回到原 Files DOM 并恢复列表滚动与 opener focus。
- **保留 / 可对齐**：保留精确 revision、来源和比较双方身份，以及失败/取消/过期结果；比较任务中 revision 就是 L1，raw hash 等未参与当下选择的实现细节才可后置。和 observer dialog 可对齐关闭/焦点生命周期；Materials 还需保留资源→版本→阅读/比较的父子轨迹，不能压成 Spark / Usage 式平面面板。
- **源码符号 / 最近先例**：`renderWorkspace`、`renderVersions`、`renderComparisonControls` / `renderComparisonOutput`、`returnFromFile` (`app/web/materials-view.mjs`)；FA-09 stale `Comparing…` 按钮标签问题仍列为待复现/裁决，见 [work-orders](work-orders.md)；Reader round trip 是 Files 原位恢复的本地先例。
- **未验证**：FA-09 在当前修改后是否能复现、成功/失败/取消的 button label 和焦点；两个相邻 revision、跨 source、没有可比较版本时的对照语义与滚动。已有工作树差异保留 comparison button 引用，不能据此认定 label 修复已验收。

## Markdown Reader · 连续阅读与 source inspection

- **当前信息层与 grammar**：以固定文件修订为阅读对象；toolbar 提供 Rendered / Raw source、Find。Rendered 模式保留段落、标题、链接、实际 table/code block 语义；选中 block 后在原文位置展开 source copy / code-point 区间。Inspector 是按块、按需展开的技术证据，不是另一份编辑器。长正文连续纵向滚动，宽表/代码块可在内部横向检查。
- **保留 / 可对齐**：保留 revision-fixed identity、source position、raw fallback 与复制来源能力，Reader 的连续阅读节奏和 block grammar；不要因 Markdown 格式本身强制统一成 serif 或把所有原文细节常驻。它与 Materials 共用固定修订和 return/focus 轨迹；与普通 detail disclosure 对齐可访问性和可见状态，不改成一屏表单或 accordion 文档。
- **源码符号 / 最近先例**：`createMarkdownReader`、`buildReader`、`render` (`app/web/markdown-reader.mjs`)；`inspector.mjs` 内 Reader mount；[Markdown Reader contract](../../../docs/markdown-reader.md) 定义 fixed revision、64KiB boundary、source positions 与 raw-source fallback；[precedents](ia-precedents.md) 说明字体需按实际阅读 profile 判断。
- **未验证**：长篇、含代码/宽表/链接、raw/rendered 切换及 Find 无结果/多结果下，真实窄视口与键盘阅读；返回后 selected block、scroll 及 inspector 是否连续。现有 DOM/source contract 不等于视觉验收。

## 横向裁决

共用的是**行为关系**：对象标题与关闭、控件不越权改写事实、读面内部可滚动、详情需要明确进入/退出与焦点归还。内容 grammar 依任务分开：Spark 是维护状态分组与候选关系；Usage 是聚合、口径与匹配 run；Telemetry 是单次 run 的 host 观测；Materials 是资源及版本 lineage；Reader 是固定 revision 的连续阅读。不得为同级一致而合并时间口径、来源身份、coverage 或父子访问轨迹。以上映射不新增 owner 或后端事实，也不替代 IA-4 浏览器及回归检查。

## Astra后续验证回填

映射形成后，FA-06日下钻返回与FA-09 reader→比较已完成作者浏览器检查，见[IA交付](ia-delivery.md)。上文“未验证”表示Luna源码映射自身的边界，不抵消后续带截图的作者证据；其余触发点/全部状态矩阵继续按实际覆盖保留。
