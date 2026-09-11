# 架构发布面与下一轮Claude图表合同

2026-09-11 · Astra负责语义裁决与最终整合。当前只准备README/架构与绘制合同；用户下一轮提交Claude绘图，串行接续，不自动外发。本文件不称独立架构review已通过。

语义源：[架构概念](../architecture-runtime-canon.md)、[实际模块](../architecture.md)、DEC-013及对应领域合同。视觉源：[现figure registry](../../site/src/assets/figures/figures.json)、[发布视觉语义](publishing-visuals-2026-09-10/visual-semantic-registry.md)、[最新Design裁决](../design/se-control-one-shot-2026-09-11/return-intake.md)。语义变化先回Astra，图形作者不自行改owner或成熟度。

## 发布文案处理

README保留产品阅读节奏，明确Runtime替换是架构边界且当前运行集成为Pi；Expert说明为专业契约组合，不以persona/任意插件注入代替。架构文档保留实际模块表，补目标词表；不把完整Work Compiler说成已交付。Pages保留现Hero、导航、Ideas与f137媒体，本轮不改站点代码；下一轮结合DR-06五拍做局部修订，不再造总架构巨图。

## 逐图合同

| 图 | 只回答的问题 / 必须保留 | 现状与下一轮处理 |
|---|---|---|
| F1 ownership | CW持有哪类工作语义，哪些执行系统可替换？Work Core与Expert/Compiler为逻辑责任，Runtime Adapter为控制接缝 | 新view候选；当前Pi标实现，Codex/DSH标候选，不能画成三个已接通runtime |
| F2 compile / execute / commit | 专业要求如何成为本次运行，又如何产生正式决定？ | 新view候选；编译/执行/候选/Review-Authority/commit必须分开；回边通向Core有效状态，执行成功不直接commit |
| F3 runtime anatomy | Runtime由什么执行要素组成？ | 先复核现runtime图，再决定替换；Core+capabilities+model adapter+environment为组合；不画叠床架屋的额外Runtime层 |
| F4 continuity / commitment | 新执行者如何从已有状态继续？ | 复用现anatomy-instrument与state-to-commit可消费部分，逐边核对；不重画已正确图，trace≠state≠context |
| F5 Schema/Contract/Expert inset | 专业能力包组合什么？ | 仅F1/F2解释不足才做；禁止严格包含链；Schema可复用，Expert声明需求不授予权限 |

F1–F5是本轮工作编号，尚非figures.json已注册ID；制作时沿现registry分配唯一ID。README compact与Pages view共用本合同事实，不能从记忆独立改SVG。

每图交付：所消费语义源的commit/path/hash、claim与audience、节点/边/成熟度清单、当前旧图、可编辑source、SVG及必要PNG、placement/最小展示尺寸、alt/文字等价说明、变更理由、渲染与检查回执。现registry持续为资产入口，本轮不创建第二份Visual IR注册表，也不安装Kami/LikeC4/Structurizr。

## 下一轮接收条件

语义检查：Expert不连provider私有对象；Work Core不依赖Model Adapter；协议只在执行适配边界内；Environment不画成Matter；candidate/committed与trace/work state分别可辨；重要authority边界有文字。控制查询边不必强行通过compiler。

视觉检查：独立于语义检查，记录实际渲染尺寸，桌面/窄屏、明暗适用面、裁切/重叠/箭头端点、静态/reduced-motion与可读文字；不用颜色独占状态。绑定语义source与可编辑source hash，作者render不自称独立接受。最终图实现后再跑site build/links/media检查，发布另记回执。

## Visual Compilation八个待研究问题的本轮处置

1. 复用figures.json作为资产入口；语义合同引用架构源，暂不扩成产品ontology。
2. 当前docs+显式figure合同足够；重复维护成本出现后再评估model-as-code。
3. F1/F2/F3共用同一事实集，但各自回答一题；本轮不承诺自动生成。
4. import边界可沿现代码检查；图的edge/maturity目前人工验，不能把计划的lint写成已运行。
5. 现可编辑SVG/HTML继续适用；renderer选型待具体布局，不预设新框架。
6. 最小生命周期为source→合同→编辑→render→三类QA→registry/hash→发布回执。
7. 稳定语义icon、长期架构图、活动插图分开；现figure逐项status/claim优先，不把所有营销图升级为规范图。
8. 可绑定双hash；下一轮接收必须带实际值，本片不编造未画source的hash。

Kami、Structurizr、LikeC4、Oh My Design、AgentsORG/DESIGN、design-dna、get-design-done、neat-annotations保留在完整输入中作为REFERENCE待核验。采纳的是本地可执行的维护原则，不对未检查的外部实现背书。
