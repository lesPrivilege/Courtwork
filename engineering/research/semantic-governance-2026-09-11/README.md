# 语义治理与对齐 · 全量入账与消费登记

2026-09-11。来源：[语义治理与对齐](https://chatgpt.com/c/6aa2f24e-7bfc-83ec-bff0-77fdbad0ca05)。接单 main `9bc6090b5b463bdf6286a0c42bdcd399781fc067`；隔离分支 `codex/semantic-polish-prep-20260911`。本包只登记、review、explore、plan；本轮 polish 的唯一执行附件是 [WO-VS-01 roadmap](../../execution/2026-09-11-semantic-polish/README.md)，由[总 roadmap](../../roadmap.md)索引，实际交付仍由[current](../../current.md)持有。

## 用户后续补充已消费

[Product Semantics Registry补充原文](semantic-registry-supplement.txt)按附件原字节保存，§1–11逐节处置见[P0.5准备裁决](../../execution/2026-09-11-semantic-polish/semantic-registry-plan.md)。它明确补上机器可读semantic层与collision gate，复用现有geometry/来源账与icon(name)，覆盖初稿仅文档修约的过窄范围；仍等待用户merge后施工。新增Atlassian官方分类/迁移实践已核验，Apple variants待核。

## 完整性与证据等级

接口返回全部 5 turn、9 条消息，hasMore=false、nextCursor=null。按时间顺序记为 T1–T5，其中 T3 只有用户消息。保存[接口 JSON](conversation.json)、[按 turn 排列正文](input-conversation.md)。T4 assistant 被接口明确标记 truncated，正文止于“P1 首”；通过正在打开的同一 ChatGPT 对话原生 UI，读取完整 Pages 文档及回复结尾，保存[目标回复 AX 正文](pages-response-ax.txt)和[末段补录](pages-response-tail.md)。接口原字节不覆盖；AX 是渲染文本，不能声称恢复原 Markdown 字节。可见正文内容已补齐，未返回的工具运行日志/隐藏推理不在完整性声明内。

T5 附件[IMG_2413.png](IMG_2413.png)按工具提供文件原字节复制并目视读取：推荐 Phosphor、Lucide、Remix、Hugeicons、MingCute 的帖子截图，不是 CW 实际 UI 或这些图标库的许可/质量证据。[manifest](source-manifest.json)绑定消息 ID、截断状态与文件 hash。原回复所称 Exa 46/40 结果和 workstream 是转交自述，没有原始检索明细，不计为本轮研究量。opaque citation 未有 URL 映射者保持 unresolved；可解析外链见[sources](source-links.json)。

## 逐轮处置

“采纳”指准备方向或约束，未改产品、未冻结新全站词表，也不把历史 assistant 的“裁定”自动提升为用户指令。

| ID / 来源 | 议题 | Astra 本地处置 / 去向 |
|---|---|---|
| SG-01 / T1 分层与 CW 核对 | Session / Task / Run / Runtime / Thread | 采纳产品投影与内部对象分层；Session≠Run≠Thread、Project≠Matter沿原 owner。Task保留独立委派工作槽位，不借 polish 新建对象 |
| SG-02 / T1 Execution、Agent setup及词汇替换表 | Run→Execution、Runtime→Agent setup | 被T2更晚“删除不必要名词”收敛；拒绝全局替换及新的默认执行名词 |
| SG-03 / T1 未来Task/attempt树 | goal/lifecycle/artifacts、lineage | 后置既有MA/BG路线，不能从线性事件推导嵌套或并行 |
| SG-04 / T2 §0–1、§10 | 一个词一个职责、按用户决定投影 | 采纳；先对象/owner/用户问题，再选词或图。外部依据分级，见下节 |
| SG-05 / T2 §2–5、§8 | Chat、Inbox、Access、Activity、History、Matter、Profile | 进入VS-01词义裁决。Inbox仅队列显示候选，Attention品牌/agent不改；Matter保留持久工作本体，普通Chat不强制Matter。Profile只对应真实可复用对象 |
| SG-06 / T2 §5–6 | 状态缩短、Edits→Ask/Allow/Block | 有条件适配：必须保留持久Access、单次Approval、成果Review的区别；未知效果、取消请求、未测量不可折叠成Error/Stopped/0。不能省掉必要授权范围 |
| SG-07 / T2 §7、§9 | Settings信息架构及全量用户文案 | 纳入VS-00/04，使用现有settingsRow/model-picker；不把API registry照搬导航，不顺带更名内部标识或迁移schema |
| SG-08 / T2 §11–12 | copy gate与视觉接受 | 纳入VS-06；覆盖渲染文本/ARIA/tooltip和中英文，排除用户内容、源代码标识，Diagnostics精确allowlist。不能靠grep作视觉接受 |
| SG-09 / T3用户、T4 §0–3 | 商业化fake产品口径，Spark/Attention核心，Runtime降级 | 采纳为本轮Pages目标。Harness/Work Core仍解耦；不改论文、不把公开叙事当生产capability或实验结果 |
| SG-10 / T4 §4–6 | 首页优先产品证明、简化导航、Paper下沉 | 候选重排；显式重开旧Paper/Tour位置与同排导航裁定，由Astra在merge后真实页面固定对照裁，不直接照搬通用SaaS导航 |
| SG-11 / T4 §7–11 | Features/Experts/Models/Download/Pricing | VS-05逐面重写；以产品结果组织，Runtime不作价值类别；价格/下载目标不由文案伪造可交易能力 |
| SG-12 / T4 §12 | 13截图以Start/Know/Judge/Specialize/Control编组 | 采纳叙事分组方向，保留现有capture IDs、来源和缺口。实际是否13图/哪些已补需在clean节点再核 |
| SG-13 / T4 §13–16 | Changelog/Eval/Privacy/Research | VS-05消费：变化讲可见行为，研究后置；方法、真实/合成、数据流边界仍可精确核查 |
| SG-14 / T4 §17–18 | Hero层级、截图宽台、减少同权章节 | VS-05视觉候选；保留archive/灰阶/稀疏review色，不按46/88px等历史测量盲改新节点 |
| SG-15 / T4 §19–20及末段 | 更新copy convention、P0→P4及页面验收 | 并入VS-01/05/06；旧Run产品词需显式修约。应用语义先冻结，Pages IA准备可并行，最终截图等固定UI |
| SG-16 / T5图标方向与附件 | Lucide主族、Phosphor variants、多donor、native品牌 | 沿IC-8保留Lucide、MingCute既有donor优先级；Phosphor只是状态研究参考，不凭转交建议改已裁顺序或引第二依赖 |
| SG-17 / T5 Representation表与负约束 | 文本/icon/status/metric/tree/timeline/heatmap/table/raw | 适配既有Atlas与data-visualization；图是投影。未知/不完整/零/未观测不同；不能由两个无可比性数字画图 |
| SG-18 / T5 Inspector、Trace | Summary→Activity→Files→Usage→Details、三类trace视图 | VS-02采用按任务与披露深度组织的机制；不是强制五tab。无真实父子/时间边界时不建tree/waterfall |
| SG-19 / T5 Telemetry | request strip、tokens构成、模型effort | VS-03：只画同请求host时钟；不称provider TTFT。cache与input可能重叠，不可直接stack成总量/命中率；TPS须BE-42真实owner后另判 |
| SG-20 / T5 Usage | 图/legend/tooltip/definition/table分工 | VS-03复用既有热图、模型图、精确table和snapshot下钻，非重写统计；限制与缺测在作判断时可见，完整定义可披露 |
| SG-21 / T5 Phase A | exhaustive inventory与统计 | VS-00正式全量台账在clean SHA上运行；此轮Luna是有界explore，不能把源码命中当可见词数或穷尽全站 |
| SG-22 / T5 Phase B | 三份canonical spec | 合并到既有copy-convention、icon-controls、Atlas/data-visualization；后续用户补充明确新增机器可读semantic映射与enforcement，复用geometry/来源账，不建立第二份领域状态库 |
| SG-23 / T5 Phase C | 29类图标、16/18/20明暗board | 复用EX-IC1已裁与EX-IC2在途；只补新增或有歧义semantic slot，不重跑整族竞赛。selected/fill需要语义和a11y依据 |
| SG-24 / T5 Phase D–F | KEEP/COMPRESS/VISUALIZE/DISCLOSE；迁移顺序；Glance/Inspect/Trace | 四类逐项裁决，三层作为信息深度而非必有tab；统一进入本轮顺序，BACKEND-GAP另列依赖属性，不冒充第五种美化判决 |
| SG-25 / T5 Phase G及总原则 | Recognition/Scan/Truth/Drilldown/Keyboard/SR/390/200%/scheme/Regression | VS-06固定候选+合成fixture+内置浏览器computer use真视觉；Astra最终裁决，Luna可联调及另一作者复核，作者不独验自身 |

## 外部主张核验与复用索引

2026-09-11只重新核验三个会影响本轮裁决的官方入口，未再跑一轮泛搜索：

- [Fluent Content Design](https://fluent2.microsoft.design/content-design)：支持减少行话、按层级组织及提供图形文本等价。采纳方法，不照抄术语。
- [Lucide design language](https://lucide.dev/contribute/icons/design-principles)：24×24、2px、round cap/join与统一optical weight得到核验，与IC-8现有方向相容。
- [Braintrust Examine traces](https://www.braintrust.dev/docs/observe/examine-traces)：明确有Spans、Thread、Timeline，并另有Debugger；支持层次/对话/时序与raw披露的参考价值。旧[EX-PG1](../../mvp/execution/work-surface-kit/explore/ex-pg1-projection-inventory.md)仅核logging页面，不能将“该页未证实”泛化为产品不存在。本条增补当前证据，不改历史原文，不宣称CW已有span树。

其余Apple、Shopify、A2A、AWS、Claude、LangSmith、Langfuse、Vercel、OpenRouter、Cursor/Devin/Kimi/Linear、图标donor保持原文外链与待核验状态。按切片有需要再查官方版本/源码及许可，不将历史Exa引用数当已消费证据。现有[EX-PG1](../../mvp/execution/work-surface-kit/explore/ex-pg1-projection-inventory.md)、[Agent interface](../../design/agent-interface-2026-09-10/frontend-contract.md)、[IC-8](../../design/icon-controls.md)、[Control principles](../control-principles-2026-09-10/README.md)、[视觉编译](../visual-compilation-2026-09-10/README.md)先于新选型。

## Pages本地源码观察（Astra，有界）

固定9bc6090：`site/src/product-pages.mjs:16`同时输出primaryNav与product-nav；`:51`仍把Runtime列为feature，`:55`包含ROLE → BINDING → EXECUTION与Runtime叙事。`site/src/page.mjs:298`仍以EXPERTS & RUNTIME组织章节。`site/src/pricing.mjs:25–50`的SVG可访问标题、描述和文本包含Managed/Expert runtime，`:73–86`计划条目仍含Local/Hosted runtime。这些是源码可见的具体消费靶点，说明不仅要改HTML正文，也要查SVG描述与ARIA；尚未据此宣称当前屏幕的视觉密度/词数或全站审计完成。

## PR与交付节点review

[PR快照](pr-snapshot.json)为本次远端读取，不继承旧merge-node状态。PR #1已MERGED；PR #2 OPEN Draft、head bd1f815、base仍是benchmark分支，CLEAN只对旧base，无check/review记录。`git cherry main bd1f815`为空；PR head已被main包含（祖先关系另见[git review](git-review.txt)）。旧PR内容已沿Pages ordered integration消费，不再整树合回；main→旧PR的site差异会移除新图解/截图门等1304行，不能作为本轮施工diff。远端关闭/重写PR未执行。

Summary/CI-B/F/CS-01、EX-IC2 Fake UI以及BE-41仍按各自交付验收；本单不替代正在收尾的writer，也不凭branch头判断产品接受。[源码探索](luna-explore.md)为固定基线有界证据。执行前重新读取各候选与merge后的current。

本次作者检查、首次失败与最终结果见[verification](verification.md)。
