# Summary / BE-41 · fresh Astra light 认领施工单

2026-09-11 用户授权派单。状态：READY_TO_CLAIM；不是产品接受。fresh 指新任务上下文，不是 Courtwork-fresh。建议主责 gpt-6-astra / low（Astra light）；Luna max 做有界 explore、确定性反例与非作者复验。来源 Astra 持有最终架构、主线集成和 current 写权；施工作者不得自称独立接受。

## 先读与认领

1. 重查 cwd、branch、HEAD、main、候选 refs、worktree status，再读 [current](../../current.md)、[最新合推裁决](../2026-09-11-merge-node/README.md) 与本单。记录认领时实际 SHA；本单基线 main `1b666e8a3d361b14179fc9c01f02b2771c058adb`。
2. 单独建立持久隔离 worktree，分支用 codex/。共享 Courtwork 当前 Claude checkout 有未提交内容，不得切换、stash、reset、prune；不触碰 Pages/Claude 工作树。已消失的临时目录不是有效工作现场。
3. 两张单分别认领、分别交付。Summary 优先；BE-41 可以并行只读核账和后端隔离准备，产品接收排在前端固定节点之后，不抢通用 Harness 完成度优先级。
4. 认领回执写明 owner/model、实际基线、候选 SHA、写权、消费裁定、下一固定检查点。新会话由下面的启动文本接单，不能把本文的 READY_TO_CLAIM 当作已有 Astra worker 正在运行。

## 必须消费的成熟实践 index

- [RD-005 分工裁定](../../research/RD-005-multi-agent-selection.md)及[实践选型 index](../../research/multi-agent-selection-2026-09-10/selection-index.md)：fresh scoped explorer、consult/delegate/handoff 边界；本单不实施新多智能体 runtime。
- [Design Scout 按问题索引](../../design/scout/README.md)、[设计来源](../../design/sources.md)、[四层来源规则](../../mvp/execution/work-surface-kit/inputs/ui-source-tiers-2026-09-09.md)：按 inspector、control、projection、responsive、empty/error 寻址，先本地 canonical precedent，再语义/行为来源。Scout 候选不是已采纳规则。
- [Disclosure / Overlay 裁定](../../design/home-composition-2026-09-10/disclosure-overlay.md)、[Spark 接缝裁定](../../design/spark-surface-2026-09-10/integration-ruling.md)。历史 index 的“在途/未实现”不得覆盖固定交付与最新裁定。
- 每项实际采用输出一行：问题 → 本地 precedent/来源路径与版本 → 已核验范围 → 采纳/适配/拒绝及理由 → 本地验证。只在本地证据不足时定向核验上游官方来源并固定版本；不另开泛化研究，不按未核验来源引入库或重造状态 owner。

## SD-FIX · Summary D1/D2 与组合收敛（优先）

输入：`claude/cs01-ci-bf-integration@68b3341` 含旧 Summary `eff0e41`；后续 `codex/summary-disclosure-r2@796c3a5` 必须分别消费。用 git show 固定 SHA 读取候选中的 `engineering/execution/2026-09-10-summary-disclosure/{README,layout-ruling,card-semantics,entry-grammar}.md` 与 `evidence/summary-disclosure-20260910/`，不能把未入 main 的文件当主线现状。

Astra 写权限于 Summary 模块、直接 app 接缝、对应布局/测试/契约及本单证据。Claude 继续 composer/CS 写权；app.mjs、共享 CSS 等重叠路径在隔离候选中逐段接合，最终接收串行，不改 Claude 源分支。Luna 先只读定位 D1/D2 和最近 canonical precedent，返回最小反例；Astra 写修复。

- D1：禁用 Open 前保留真实 opener；关闭文件/Run及 Escape 返回可用原控件或同 scope 明确回退。包含异步、重绘和已知 Chromium147 路径；152 不复现不能抵销旧反例，无法运行147须列限制。
- D2：长 Unicode 路径不撑爆 SHA 标签列、不挤没值或 Open；保留完整来源可读与可访问，测窄卡、窄屏和大字，不能缩短 fixture 消除反例。
- 消费 WORK-3 最新两行、内容驱动裁定，替换旧80–96px固定 textarea 断言；54.2px不是新常量。保留单增长机制、Home96/160锚点、Work180及短视口28dvh候选行为，检验两行可见、随字体扩展、工具/错误/发送可达。
- 固定最终组合后验证1440/1280/390明暗、真实200%重排、Home↔Chat草稿、sheet焦点/Escape、正文/composer齐边、STATIC200/未知404、适用lint与完整回归。README命令为准，独立合成数据/端口、不用付费provider。
- Card/Entry增量单独交付后续节点 SD-ENTRY：固定语义合同、真实浏览器证据及相同接缝回归；不能凭36/36静态检查捎带接受。Q1未接read-state、Q3跨客户端同步、原生/IME/软键盘未验证边界分列，不把删除404当通用撤权。

交付：修复SHA、组合SHA、输入manifest、裁定消费表、前后反例、原始测试/截图、已知限制。Luna或另一非作者在固定最终树复验，来源Astra决定接收。只交付D1/D2不自动关闭SD-ENTRY。

## BE41-INTAKE · 后端接收与前端接缝（第二节点）

输入：`codex/be41-work-derivations-20260910@4c2a56a`，产品 `30fd470`；先读该固定SHA的 `evidence/be41-20260910/README.md`、独立反例与provenance，再读候选中的DTO/服务契约与实际diff。main中的[旧DTO](../../design/spark-surface-2026-09-10/be41-dto.md)仍写后端未实现，只是历史冻结，不能据它重做后端，也不能直接当最终报文。

BE41-A：Astra确认既有后端交付与当前主线兼容，明确 schema、权限、快照、分页、null/0、source/version 合同差异；先定向复验实际服务及认证HTTP、无producer读取、旧快照拒绝、空页/越界分页、partial/unavailable、来源版本0、截断和合成数据。旧6/6、46/46只保留归因，不转记新组合通过。必要修补限原service/domain owner与对应测试，不新建Spark状态库。

BE41-B：BE41-A和前端固定节点就绪后，沿现有Spark adapter接真实后端；补version0/source fallback、expected snapshot与空页token的消费。保留显式带来源标签的只读sample边界，测live/sample切换、关闭/隐藏时异步回执、陈旧快照拒绝及分页一致性。UI只展示事实，不能自行推导接受/恢复权威。共享web路径由同一Astra串行写，不另开并行前端writer。

分别交付后端接收候选与前端接线候选 SHA/证据，不因A通过关闭B；不扩大到Spark重建/恢复、新Core事务、第二runtime、Rust或MAS。最终新组合按实际变更跑定向、全量、smoke及适用UI检查，由非作者复验后来源Astra接收。未接adapter与snapshot之前不关闭SP01/ME03。

## 可直接交给 fresh Astra 的启动文本

> 认领 engineering/execution/2026-09-11-summary-be41-dispatch/README.md。使用 Astra light 主责，Luna explore 有界定位成熟实践和反例。先核实际main/候选/工作树并提交认领回执；按current和最新merge-node裁定，从SD-FIX开始，SD-ENTRY另节点，BE41-A可隔离准备、BE41-B排在前端清洁节点后。消费本单index并记录来源→裁定→验证，不重新发明owner或重做已交付后端。你不是唯一writer，保留Pages/Claude现场及其他编辑；隔离树、合成数据/端口，完整交付固定SHA与可复验材料，再交非作者接受。已有施工授权无需重复询问；本单不授权部署或外发。
