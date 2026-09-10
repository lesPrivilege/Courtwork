# 当前工程状态

## 2026-09-11 · Summary / BE-41 施工派单

用户授权以 fresh Astra light 主责、Luna explore 接续，[认领施工单](execution/2026-09-11-summary-be41-dispatch/README.md)已就绪（READY_TO_CLAIM，未宣称worker已认领）。SD-FIX优先，SD-ENTRY另节点；BE41-A可隔离核账/准备，BE41-B真实前端接线待前端固定节点后串行。必须消费最新合推裁定与成熟实践index，记录采用/适配/拒绝及本地证据。此授权允许BE-41准备，不改变基础前端/通用Harness优先级，不把派单计为产品接受。

## 2026-09-11 · 前端与通用 Harness 的下一合推节点

本次从实际main `9097cbf` 核本地187棵非冻结工作树及远端PR；远端main `9c8b64e`，本地领先57提交，当前产品仍与已接受 `654411e` 的app/docs/tests完全相同。[Astra裁决与证据](execution/2026-09-11-merge-node/README.md)覆盖此前next-round核账时点：下一产品节点为 **Summary D1/D2修复 + CI-B/F × CS-01固定组合非作者验收**，当前NOT_READY，不直接合推68b3341或796c3a5。两行起步方向采纳，WORK-3从旧固定textarea高度改为两行可见、随字号扩展和控件可达的行为门；产品/测试尚未据此修改。Card/Entry新增语义单独复核，EX-IC2 C等固定产品基线。

Harness并行P00现状/版本清账，下一产品候选聚焦MCP结果保真与实际SDK目录接缝，effect语义先冻结；RV26-Q03独立沿store/service串行接收。Pro前版包有效但逐项处置未完，缺失后版不混编号；BE-41、第二runtime、Rust及新MAS实现后置。Benchmark/Pages两个远端Draft均未消费其独有补丁，继续保留。RD-005与本轮核账仅文档接入本地main；未做产品merge、remote push或部署，未关闭前端整体/通用Harness/G1–G5完成门。

Google Workspace CLI补充材料（2026-09-11）：[参考包](research/google-workspace-cli-2026-09-11/README.md)保存269行原文/哈希与14项处置，登记EX-GWS-01～03为未派工研究候选。Discovery、watch/subscribe、auth/dry-run、Skills等外部主张未核验；沿既有Tool ABI/Attention入口后续消费，不改变本节前端/通用Harness节点，未接入Google账户或产品能力。

## Pro 架构送审准备（2026-09-10）

用户确认通用 Agent Harness / Semantic Work Core 解耦，授权 Pro 主导选型裁决、必要自研设计与施工拆单；基本 GUI 与通用 harness 完备在先，Work Core 深化、第二 runtime 与 Rust 实施后置。[送审工单](execution/2026-09-10-harness-pro-review.md)和[原始输出/逐项处置规范](research/harness-pro-2026-09-10/README.md)已建立，覆盖既有决策重开、源码证据、接口/反例/迁移与回退。用户授权审查合并后推送选定送审分支，网页端由用户唤醒；实际远端结果见交接回执，不宣称 Pro 已接单或输出已消费。本次仅文档，产品接受与既有门不变。

## R2-SD01 · 摘要与阅读层级候选（2026-09-10）

隔离分支`codex/summary-disclosure-r2`产品`1c4138b`已将Run摘要→Files披露→同对象Preview接入原生产host，并统一有界目录、顶部tab、文档关闭/工作面隐藏、宽屏展开/还原与返回焦点。用户明确要求各级稳定，覆盖首轮fixture-only边界。最终38项针对通过；初次全量656/657的未改动Core启动超时经隔离13/13复验，原日志保留。Astra完成有界CUA；Luna仅静态/测试复核，无独立视觉接受。[交付、版本与限制](../evidence/summary-disclosure-20260910/README.md)。末次补披露圆角、内距与已有rim；保持实色材质合同，14项增量通过。本地候选未合流/推送/部署，Runtime11/Core4/app5不变，不覆盖在途PV/SD集成的状态或schema，也不关闭G1–G5。

## 范围登记：Chat 全量按钮、hover 与 Icon grammar（2026-09-10）

按用户补充接收两份研究原文和文件交付参考图，[EX-IC2 / Chat controls](design/chat-controls-2026-09-10/README.md)已进入本地 PR 施工稿、前端与长期 roadmap。覆盖全量 Chat space 按钮/hover/focus、浮层、消息与文件卡；无真实后端仅登记缺口。现有 IC-8 不换族保持；未完成全量逐控件盘点、未实现 Registry/新 glyph、未创建远端 PR。外部研究主张仍是转交输入，不称本轮已核验。产品仍为下段 PV/SD 已接受版本，本次仅文档登记。

## 最新接收：Provider 接入与 Spark 显式样本（2026-09-10）

用户授权 PV `bb21027` 与 SD `6b62579` 独验合流，候选从实际 main `67ed0fd` 隔离整合。产品固定 `654411e`，RuntimeStore **12 / Core 4 / app 5**；PV-54 纯投影已抽离并登记静态白名单，[SP-13](design/spark-surface-2026-09-10/integration-ruling.md)记录用户允许的显式、带来源标签、只读样本例外。

Astra 独验发现并修复三项：schema11 pending 升级丢失、verify 忽略活动身份端点/API 覆盖、Spark 样本异步覆盖 live/关闭/隐藏。三项修补均由非作者 Luna 复验，路由只命中合成 loopback、外网 0；Spark 15/15；PV 前端 8/8 浏览器及固定版 664/664、PV-54 31/31。最终组合固定产品全量 **685/685**，smoke、四项 lint、对比表与文档链接通过；首轮 682/683 的 readiness 超时与中间测试结果保留，不改写为一次全绿。[整合回执、原始反例与实际界面截图](../evidence/pv-sd-integration-20260910/README.md)分开记录作者和独立证据。

本节点接收本地 main，不包含推送或部署。BE-41、Attention 样本、真实 provider/个人数据迁移及 G1–G5 不关闭；共享 UI checkout 与其他 writer 的未提交变更保留。下列 schema/status 均为各自历史时点，不覆盖本段。

## 最新接收：VG01 与比较研究入账（2026-09-10）

用户授权接收 VG01 固定 `2eca488`：Opus 图示、Fable VG14–20 与 Pages 校验，经 Luna 固定版本有界独验及 Astra 最终页面检查后合入本地 main。[整合凭据](../evidence/vg01-main-integration-20260910/README.md)记录正反例和归因。Registry 迁往 design 留待 Fable 接续；无产品/schema改动，未推送或部署，不关闭 G1–G5。

[Codex 与 Courtwork 对比](research/codex-courtwork-comparison-2026-09-10/README.md)已完整登记可访问对话及来源哈希；其中外部产品主张待核验，不作为已采纳架构。下列记录保留各自交付时点。

## 最新接收：五项顺序独验与主线整合（2026-09-10）

用户授权的 ICON、FE-05a、FE-05 材质 specimen、ATT-FE-01 与 Spark 均已由 Luna 顺序独立验收通过，产品合流固定 `d0118ab356c541f0ff2dcd9bc867c438399d3e7d`；本轮台账回执提交后快进并推送唯一远端 main。当前 **RuntimeStore 11 / Core 4 / app 5**，保留 SK-1…4、Q01/Q02。此前各段 schema 数字仅属历史时点。

整合排除了原 Attention 分支的非工单回退；材质真实媒体回退与 Spark 绑定 Work 路由经 Astra 修补后分别由 Luna 复验。最终全量 **643/643**，Spark 独立 44/44 针对测试与 22/22 浏览器、Attention 独立 29/29 针对与 116/116 浏览器通过；FE-05a 的 baseline/Shape/治理/字阶/Home16、材质实际媒体与 ICON 重建核对通过。固定测试版本、最终树一致性、各轮归因与原始失败证据见[整合回执](../evidence/delivery-rollup-20260910/README.md)及[独立合流审计](../evidence/delivery-rollup-20260910/merge-audit/README.md)。

FE-05 接收范围仅材质标本及回退，不代表生产材质选向 A–E 已实施；BE-40@Attention 默认排序、grant/proposal 与 BE-41 Spark 后端仍开放，前端不关闭 RV26-SP01 / ME03。先前 CC-I `41966b6` 独验不通过保持。G1–G5 不关闭；未运行真实 provider、迁移个人数据或部署。下列历史交付描述保留原时点，不覆盖本段最新结果。

用户授权的 Skin/Review/Appearance 界面自主续行已完成；[完成清单与证据](design/skin-injection-2026-09-10/autonomous-loop.md)全部适用项通过，收束本轮 heartbeat。本轮无已知有界界面阻断，不扩大后端 authority、其余产品队列或部署授权。

## SK-3 / SK-4：Dystopia 与主题诊断（2026-09-10）

隔离实现 `7f92f69` 加入 Dystopia 中性外观 preset，由同一闭集 registry/resolver 服务首帧与设置；仅21项外观 token，固定语义与材质不变，默认仍为 Slate。`b7831b5` 修复跟随系统换主题后自定义对比警告陈旧的问题，刷新诊断同时保留草稿与焦点。作者57项针对测试、18组预设浏览器矩阵、24组相邻设置整页检查及200%等效重排/高对比通过；[交付证据与独立复核](../evidence/dystopia-sk3-20260910/README.md)。Luna 已完成35项真实合成 Home/Attention 状态、长文/空/失败与转换检查，预设/主题诊断固定版本非作者复核通过。`a7ff5c8` 补深链接退出设置后的可用焦点回退，固定 detached 树复核通过。与 Q02 主线 `a7b9822` 组合为 `c1b1f4e`，70项界面/配置接缝测试、smoke和独立新 Runtime 11 数据目录浏览器检查通过；本地 main 接收 SK-2/3/4，保持 Q02 的 schema 与原验证限制。

## SK-2：外观有效投影与旧值兼容（2026-09-10）

产品 `c415012` 从 main `a579929` 隔离实施：单一同步 `skin-policy.js` 服务首帧与设置模块；外观有效域 v1、旧完整值原文留存/导出、ignored/invalid 披露、草稿/应用分离、Reset/Remove 焦点与存储失败提示。Review/danger/success/focus/material 固定随 scheme，不随 skin；没有 runtime schema 或个人数据迁移。55 项针对测试、18 组浏览器固定角色矩阵、真实编辑/导出/首帧反例、三宽度明暗/高对比检查通过。[证据与独立复核](../evidence/skin-boundary-sk2-20260910/README.md)。SK-3/4 与整页收尾已完成，见上段与自主完成清单。

## RV26-Q02 · 配置校验与持久化（2026-09-10）

从main `a579929` 串行接续Q01，产品 `583a1b3` 统一Provider字段域并持久化最小pending：部分失败可inspect、阻止新Run、重启继续隔离，同操作重试恢复。Runtime **11** 新增pending字段，Core4/app5不变；3–10旧库原字节备份升级，保留schema10连接；旧host拒11、独立备份回读已验证。此段覆盖下文历史Runtime10当前值，原验收时点不改。

Astra负责schema/发布顺序/执行门，Luna有界字段与测试；另一非作者Luna固定版本30/30及四项独立反例通过。全量553项中551通过，另外两项旧夹具的不支持API字面值已在 `9380fd5` 修正，作者/非作者定向2/2通过；不宣称一次553/553。迁移测试的临时路径可移植性修正 `52b9330`，作者4/4。smoke与文档链接通过；[证据与限制](../evidence/rv26-q02-20260910/README.md)保留完整过程。

Q03接续RuntimeStore publication/lock，沿原串行写权；本单未调用真实provider、迁移个人数据、推送或部署，不关闭33单或G1–G5。共享UI checkout和既有未提交证据保持。

## SK-1：Review 与皮肤 accent 解耦（2026-09-10）

第一片产品整改已实施：Review 在 slate、gray-steel、合法 custom 下使用同一 scheme 语义色；Home 列表/详情与 Attention 列表只由 `needs_you` 接入。自定义对比预检补固定 Review × panel/float，并修复候选 token 探针继承旧 role 的问题。39 项针对测试、18 组 Chromium scheme/skin/system 计算色场景与低对比候选反例通过；作者证据与独立复核分列于 [SK-1 回执](../evidence/skin-review-sk1-20260910/README.md)。

本片不完成 SK-2 的旧 token 权限投影/首帧 parser、SK-3 preset 或 SK-5 Pages；旧 custom 原始数据保持，不宣称任意旧 CSS 输入都已被新边界隔离。以下“未改产品”是前一份规范交付时点，本段覆盖其 SK-1 当前状态。

## Skin / Review 与前端连续性规范（2026-09-10）

从实际`main@2e9da09`隔离消费《泛化陌生化设计》全部7轮及《补充控制语法》全部3轮，Astra裁决/整合，Luna有界源码核对。用户最新纠正为**Review稳定、不涉及skin；skin变化不影响Review**，覆盖早期review-only注入方案。[EX-SKIN-01](design/skin-injection-2026-09-10/README.md)登记现有custom/gray-steel→accent回退的耦合、兼容整改、Dystopia外观preset与Pages增量提案；当前产品/Pages已有稀疏review红，不重复报新增。

[前端连续性v1](design/agent-interface-2026-09-10/frontend-contract.md)已作为后续UI规范入口：四类合同、nearest precedent、变更记录、影响场景验证、baseline与独立复核分开；AGENTS与Atlas可达。不引入组件依赖、自动loader或新域对象；未改产品CSS/偏好行为、未完成specimen或部署，不关闭G1–G5。详细核对与文档检查见[本单回执](design/skin-injection-2026-09-10/verification.md)。

同题并行文档`12eb220`已在隔离树整合：保留problem-key导航与扩展checklist，由v1统一强制范围与证据等级，不建立第二套authority。共享writer的工作分支和原有证据不覆盖。

更新：2026-09-10。唯一开发入口为 `Courtwork`，主线 `main`。本次Attention后端合流读取main基线 `fa90763a4da1cdede47778b6487c801c0acb74cc`；此前合流已接收 Harness Core `d6247a8`（代码 `1332691`）与 Fable 文档 `99a9279`，实际合流证据见 [清洁节点回执](../evidence/harness-main-integration-20260908/README.md)。实际接单前重查HEAD与工作树，不按历史fresh/current路径继续。

## RV26 审查入账与首片施工（2026-09-10）

用户授权依序开工并指定 Astra 负责架构、裁决和关键自研 Core，Luna 负责探索与有界局部实现。从实际设计交接 HEAD `12eb220` 隔离消费固定 `0c60f4f` 审查包，33 单仅为现有路线执行别名；[基线与写权](reviews/2026-09-10/README.md)、[派工依赖](reviews/2026-09-10/dispatch.json)保留原单映射及条件触发。实际 Runtime10/Core4/app5 不变，架构入口旧值已纠正，BE-40 两来源限定消歧。原包字节与历史验收保持。

首片 RV26-Q01 产品 `74ab7ca` 已实现：Astra 撰写 CoreClient 有界生命周期、失败 worker 回收、代际/admission 隔离与关闭后兼容重开；Luna 构造13项故障反例，另一个非作者 Luna 在固定SHA独立树复核13/13通过。Q02 配置持久化随后串行，Q04/Q05/LG00 待明确各自写权。资料治理→Spark→稀疏 Attention 依赖链保留，现有前端单 writer 不变；本轮不代表33单交付、真实模型验证或 G1–G5 关闭。具体完成范围以[本轮回执](../evidence/rv26-20260910/README.md)为准。

## 当前合流：Pages 实录、并行产品与新研究理念（2026-09-10）

从实际main `8b1e0b1` 隔离接收Attention收尾、MA2前后端/文档、provider connections及Fable裁决；产品固定到 `e818463`。RuntimeStore **10** 消解两分支schema9重号，保留主线Run.supersedes并严格原字节备份迁移；Core4/app5保持。全量522/522、smoke与Luna固定版本有界迁移复核通过。此段覆盖旧段的当前schema描述，历史验收记录仍保留原版本。

Pages消费既有21e8a9b六子页，保留叙事与纸层视觉并展示实际新版Home；15份合成实录分离于9e5384f旧标本。用户随后指定本轮新讨论的核心自研理念，已消费研究370b891并加入确定性资料治理→Spark可重建派生/恢复→稀疏Attention，以及角色/执行分离与全生命周期质量/成本方向；均明确研究与待实现，不视为ME-01–10交付。[合流、验证与边界](../evidence/pages-main-visual-20260910/README.md)。共享未提交证据保持；未部署、未跑真实provider、未迁移个人数据，不关闭G1–G5。

Paper/Tour入口接续：用户指定“Paper承载理念、Tour承载编排”。首页首屏叙事后加入两大原生展开章节，位于Home实录之前；Paper接独立论文与明确标注的本轮产品研究，Tour接四步工作路径及既有11节点实录。六子页导航同步，当前Home与来源固定保持。[交付与浏览器验证](../evidence/pages-primary-entries-20260910/README.md)。后续按用户截图将Tour四项简明目录常驻，与Paper展开正文分隔线对齐；说明独立展开；再按用户反馈去除入口卡片旁白，补Event/State/Context简释，两卡等高、留白置于内部。仅Pages UI，无产品runtime/schema变更，未部署。

## 多专家全turn与long-life施工准备（2026-09-10）

从实际 `main@8b1e0b143f7091da0acba3ee24af58595e721eb8` 独立分支消费《多专家实现调研》可访问全部23个turn/44条消息；三页至hasMore=false，T07/T13无回复、T12原文末句中断及不可恢复citation均保留。按用户分工，Luna探索外部索引，Astra负责取舍、owner与PR。[研究包](research/multi-experts-2026-09-10/README.md)提供逐turn处置、44个唯一外链的阅读范围、选型/21模式负索引、接缝、ME-01…10候选PR、原HC/RA/AT全映射和long-life验证；[roadmap](roadmap.md#10-当前切片与扩展触发)已并入依赖顺序。

裁决为确定性资料治理→Spark派生/恢复→稀疏Attention；默认Pi薄集成，第二runtime/外部agent接口按需逐轴验证。沿LG/AM/MA/BG与现有Core/Attention/Runtime owner，不新造memory或任务真源。该基线实际Core4/app5、Runtime9；BG-02的Run.supersedes已有，旧段“BG-02待做”为历史时点，详细限制见[专项契约](../app/docs/run-attempts.md)。本轮只有研究/文档与完整性检查，无新产品API/schema/依赖、付费provider、用户数据迁移或部署；作者检查不构成独立产品接受，G1–G5与前端单writer队列保持。

## 本轮责任与完工节点

用户指定：**Claude Opus建立README/Pages；Astra负责current、架构、契约与下一轮派单。完工以足以修订resume并公开Pages的产品证据为准。** [本轮派单](execution/2026-09-08-main-round/README.md)已形成，[G1–G5完工条件](execution/2026-09-08-main-round/public-readiness.md)尚未满足，不以本轮文档交付或main接管关闭。

Core主单已交付：[Fresh Astra：通用Harness Core＋首个NDA场景](execution/2026-09-08-main-round/fresh-astra-core-handoff.md)，整合H0–H3进入实际实施；Fable在分支从前端逆向。Core允许从样本提炼通用owner，保持单写者并复用Pi运行循环；BE-5/完整Workbench后置。fresh指新任务上下文，不指退休目录。

| 面 | 本轮实际状态 | 下一步与owner |
|---|---|---|
| 对外口径 / README / Pages | PS-01/02 第一版完整版面已交付，PS-26 改为产品口吻；固定产品快照 9e5384f，308/308、E/S 各 6/6，页面浏览器 17/17 | 用户 PS-27 授权本轮 GitHub Pages 发布，随后独立 review；[交付与接续](release/publishing-surface-2026-09-09/delivery-ps-01.md)。品牌后置 |
| 通用工作面 / Workbench | CC-D0-a 与 r4d 5b4c981 已合流（4f7278f），验证与归因见页末 | Astra 接手清账；后续 FE-05a → FE-05 → ATT-FE-01 → CC-I；[第五轮工单](mvp/execution/work-surface-kit/work-orders/WO-CC-round5.md) |
| 领域主链 | ES-01文件候选与Attention后端已合流（当前Core3/app4，GUI待）；H0–H3后端已实现：单一Core、NDA规则/候选/决定、来源历史、跨Session/删除保留、producer缺席读取 | Fable消费冻结契约；Review与续行GUI已通过合成浏览器复验；真实运行纵切仍待，不关闭G2/G3 |
| Runtime来源 | Runtime R2纯解析器与BE-5认证HTTP检查已合流；无UI/model工具，locator获取未实现 | 后续消费inspect-only接口；获取/R3兼容/R4–R5提案与事务仍另单 |
| 真实模型 | 最终联调与远端clone使用local-fake/loopback；真实provider未跑 | 沿用户GUI配置与授权补G1/G2；不读取凭据、不假定现成配置 |
| 旧实现召回 | 已冻结并完成15条Luna只读索引，15/15路径核验 | 从 [召回索引](ecosystem/legacy-recall-index.md)定向读SHA/path，不默认继承旧代码 |
| Benchmark / SE 连续性 | Pro指出旧评分盲区与Context续行边界；现已修复观察关系/角色/raw绑定，E与普通S各六条开发符合性通过；Context v2引用+分页读与HTTP局部续行通过 | [Pro处置/证据](../evidence/pro-review-remediation-20260908/README.md)、[协议](research/se-continuity-2026-09-08/README.md)；D1/D2有界独立复核已完成，合流应用183/183与smoke通过；下一步冻结S/E差异与独立任务，后做有界模型pilot；真人/法律质量后置，不关闭产品门 |

Harness Core交付 `d6247a8` 已接收：代码 `1332691`，作者170/170与smoke通过，Core/adapter/abort与收尾恢复非作者复验有界通过，原始来源消费、Paper历史映射与Pro逐项处置见 [交付证据](../evidence/harness-core-20260908/README.md)。Pro初审针对旧 `e0d214d`，本轮修复收尾误报成功、未知结算恢复、partial tool事件与底层abort窗口，不冒充Pro已审新分支。

Fable文档交付 `claude/fable-settings` `99a9279` 已接收：WK-83按两分支合流后的清洁main开工，前端单一writer串行，WK10b第二段进入序2。Paper9.6、MIT与首屏文案既有裁定保留；Core历史9.3证据不重标为9.6验证。该清洁节点遗留的修订动作声明与renderer准入由下述Astra接缝单补齐；实际renderer由Opus第二段实现，其他新增静态路径仍由Astra串行处理。

WK10b第一段已接收：Opus代码 `84803ad`、作者回执 `f1ef5ae`、Fable复核 `d408961`，与main `7941bdb` 无冲突合流。Astra复跑浏览器22/22（含FE-T05/T07）、覆盖态5/5、全量174/174与smoke；合流时修正NDA renderer路径已声明但文件尚缺席的槽位失败状态，详见 [合流证据](../evidence/wk10b-main-integration-20260908/README.md)。第二段从本次清洁main建树。Astra后端前置交付 `codex/work-review-actions`，从同一main基线建独立树；版本化 `revise_candidate` 动作声明、NDA proposal schema与精确renderer准入已实现，代码 `3d97beb`，作者174/174与smoke通过，非作者接缝独验6/6；证据见 [本单回执](../evidence/work-review-actions-20260908/README.md)。该接缝已由第二段renderer消费，合成GUI证据见下；不关闭真实运行门。

WK10b第二段已接收：Opus实现 `e118992`、作者回执 `10f185a`、Fable复核 `a60187e`，与main `d879e2f` 无冲突合流为 `bf44b8f`。Astra复跑全量178/178、浏览器26/26与缺席/历史11/11（FE-T06/T08/T11），授权卡与取消补验见 [第二段合流证据](../evidence/wk10b2-main-integration-20260908/README.md)。WK-85受信renderer静态kit导入与conflict唯一着色按复核裁定接收；绑定面顺序已由WK13实现。BE-14决定时刻、BE-15事项标题/最近决定时间保持已登记后端请求，未实现、不阻塞本段。WK13已从该段清洁main节点建树交付，接收结果见下。

WK13 r2已接收：Opus实现 `f1875ae`、r2 `6de394e`、Fable复核 `a271d95`，与main `7a906a1` 无冲突合流为 `fbb18f1`；Astra在 `5fe8b38` 补入 `/web/presentation-adapters.mjs` 精确静态准入。合流全量190/190（183+7）、smoke、lint、contrast、Home浏览器46/46、三态4/4+2/2+2/2、既有几何4/4+4/4与Home回归7/7通过；[合流证据](../evidence/wk13-main-integration-20260908/README.md)分列作者、Fable与Astra验证。WK-86已实施：18vh留白退役、In progress为Continue集合可见名、两个只读adapter签名入契约。空态31vh（WK-11）原样保留，等用户裁定，不阻塞合流。WK12已从该次清洁节点建树交付，接收结果见下；新增静态路径继续由Astra准入，不扩大前端server写权。

WK12已接收：Opus实现 `7599a91`、Fable复核 `a2223e2`，与main `7982663` 无冲突合流为 `e2ec7f5`，保留Luna两单证据。无新增静态路径，未改server/runtime/core/runtime-view/home-view。Astra复跑全量204/204、lint、contrast、smoke、七支浏览器55/55（含FE-T09/T10与provider/key/lifecycle/绑定入口回归）；[合流证据](../evidence/wk12-main-integration-20260909/README.md)分列作者、Fable与Astra验证。WK-87保留This session行与当前内联首帧脚本；Appearance预览合一、用户skin接受前对比度警告（不阻止）随WK11实施。BE-16稳定工作区标识已登记未实现，偏好目前按origin分键；绑定入口异步焦点落body的既有缺陷仍记录在交付，不称修复。WK11从本次最终清洁main回执SHA建树，消费delivery-wk12 §10五组挂载点；空态31vh继续等用户裁定。

WK11已接收：Opus实现 `644cc43`、Fable复核 `3acff2d`，从main `14ebd61` 无冲突合流为 `f8643f8`；随后Fable第四轮文档 `19deb1e` 无冲突合流为 `54c0d24`。Astra全量208/208、lint、contrast、smoke与RC 20/9/36通过；FE-T03/T04及MCP unknown的实际范围见 [合流证据](../evidence/wk11-main-integration-20260909/README.md)。没有集成产品代码修补或静态准入变更。WK-98接受删除L2 Runtime面板，导轨卡打开Settings Runtime；WK-87两项已实施。Explain permission裸`null`与深链bootstrap 401竞态交FE-01首项，BE-13未复现仍保留。

第四轮WK-88…98与交接已进入主线。三项前置判断已定：恢复Chat用户词、Runtime移入Developer、Home以composer为唯一L1锚点；空态31vh退役随FE-01实施，覆盖此前“等待裁定”，不称已改代码。前端单一writer串行FE-01 → FE-02 → FE-03 → FE-04，材质/动效后置；BE-1/3、12、14…20按 [后端台账](mvp/execution/work-surface-kit/backend-requests.md)提供实际接缝，FE-02/FE-03未交付能力不画可用按钮。此处只接收交接，未启动新的执行会话；G4/G5等FE-01词表后施工。

FE-01已接收：Opus交付 `bfefcd2`、Fable复核 `2694001`，从当前main `a431650` 无冲突合流为 `6bdc6db`；随后Fable文档 `3eba008` 合流为 `ccc1076`，保留执行文件状态PR准备文档。产品词表、Settings九组、chrome与Home/Work composition已实现；WK-105六项裁定按 [交付§13](mvp/execution/work-surface-kit/delivery-fe01.md)接收。合流复跑212/212、两项lint、contrast、smoke、composition16/16与FE-T02/T09/T10反例12/12；新版RC与WK-98追加回归见 [本次证据](../evidence/fe01-main-integration-20260909/README.md)。Astra补修资源展开面把可选DOM的null写成文本的遗漏；该补丁当时为Astra作者验证；现由Fable在WK-106非作者复核接受（读码、212/212、WK-98回归10/10），不套用此前对2694001的接受。

FE-01节点交接时安排Fable以agent定义文件Low档派Opus FE-02，现已交付并接收，见下。第0项--nav 250→256附几何断言；Fetch models/Test connection现可消费下述BE-17/18固定契约，任意compatible/local provider的保存与执行仍未交付，不因探测成功画成可用。FE-03 Low、FE-04 Medium沿串行队列；FE-05按WK-104补本设备Reduce transparency等材质接缝。FE-01完成不等于public-copy已同步：发布面仍有旧Session/Ask/Write/Read词与旧截图基线说明，须按当前UI和证据另行更新后再施工README/Pages。G1–G5保持未闭合。

FE-02修订已接收：初版 `38717bd`、移除本设备display name修订 `a82c192`、Fable复核头 `565d18c`，与当前main `c529923` 合流为 `a9d1d15`；再合r4c `7026b09` 为 `2ab0193`。唯一冲突在backend-requests末尾，保留BE-17/18既有交付说明并加入BE-21/22，不回退后端接缝。--nav已256；Connections只画后端现有的一条，不以设备偏好制造连接属性；WK-107其余裁定按 [delivery-fe02§13](mvp/execution/work-surface-kit/delivery-fe02.md)接收。Astra组合版本全量219/219（FE-02修订218 + 主线provider preview 1）、两项lint、contrast、smoke、Models16/16、composition16/16；FE-T03与RC结果见 [本次合流证据](../evidence/fe02-main-integration-20260909/README.md)。无集成产品代码补丁、无新增allowlist。

FE-02节点按旧基线完成有界界面交付，当时Test/Fetch未接入且两句旧说明待更正；现由下述FE-03第0项消费并改正。不称完整Models连接工作流已验收。BE-21连接注册表（含display name与独立provider身份）、BE-22 MCP注册未交付；错误文案统一为FE-03后议题，尚未排期。该节点安排Fable派FE-03（Low），现已交付；FE-04用opus-wo-medium。public-copy及G1–G5状态不变。

FE-03已接收：Opus实现 `81390de`、交付 `fabfd22`、Fable复核 `f995778`，与main `386fbc6` 无冲突合流为 `6c77b54`；再合r4d固定提交 `00e33f9` 为 `f3d1785`，保留研究/设计包。BE-17/18已在compatible表单接入，结果只作目录探测显示，不注入Model、不保存配置；Chat/Work只读extensionBinding、Continue in Work复用原路由、Memory Off与Temporary chat均无控件。七项裁定按WK-109接收；BE-23无项目Chat创建仍待，BE-19/20/21/22不关闭。Astra全量228/228、两项lint、contrast、smoke及全部分配浏览器回归见 [合流证据](../evidence/fe03-main-integration-20260909/README.md)。

合流补验发现延迟探测回包会在地址/key/provider改变后重新显示旧ok；Astra补丁 `4b6aef4` 给结果加失效标记，改变表单后不消费旧回包，无新API或权限变化。延迟反例补前0/3、补后3/3，原探测8/8与Models18/18复跑通过；该补丁当时为Astra作者验证，现由Fable在WK-111独立复核接受（af95bcb：228/228、两项lint、延迟3/3、探测8/8、Models18/18），不套用WK-109。FE-04随后由Fable以opus-wo-medium派出并交付，见下。

FE-04已接收：Opus交付 `af29456`、Fable复核头 `4ac5ac9`，先合代码再合r4d固定头 `e8a950b`，组合产品提交 `ed9584e`；无冲突、无集成产品补丁、无新allowlist或依赖。Astra重跑237/237、两项lint、contrast、smoke、primitive11/11与FE-T07 6/6，见 [合流证据](../evidence/fe04-main-integration-20260909/README.md)。WK-115有界接收；Unknown实现、Inbox Home/End及两条列表role进入CC-S第0项，BE-30…33为待验接口，不称已有能力。下一单由Fable从最终main提交新建清洁树派CC-S（opus-wo-low），第0项显式修订Settings旧约，WK-116在派单时登记；本次未代派。

WK-112研究索引作为方法输入接收，WK-113/114为设计与候选接缝输入，画布仍待用户选向；必须一并消费 [r4d接缝评审](design/clean-cool-2026-09-09/r4d-review.md) R4D-1…6。合流已限定BE-28不得用临时probe冒充已保存配置健康；CC-D0外壳与Activity依赖拆分，导航恢复及renderer失效条件保留。邮件/日历已有路线意向，具体来源、scope、接入排期待裁。public-copy、ES-01与G1–G5保持。

CC-S已接收：Opus交付 `ca548ed`、Fable复核头 `45625b2`，先合为 `85c4e73`，再合r4d固定头 `66bd820` 为 `4fc3de2`，无冲突、无集成产品补丁或新依赖/allowlist。Settings-active全局导航hidden+inert、独立设置导航与Back已落地，Unknown及Home/End与列表语义已消费；七项裁定按WK-121接受，M-12视图状态整理、M-13未保存表单离开拦截仍待，不称已有跨表单dirty保护。Astra244/244、两项lint、contrast、smoke、composition32/32、Models18/18、shell12/12、探测8/8、第0项4/4（独立fixture播种→SIGKILL→重启）与RC结果见 [合流证据](../evidence/cc-s-main-integration-20260909/README.md)。下一单由Fable从最终main提交建清洁树派CC-W（opus-wo-medium），消费Back顶带槽位未决项；本次不代派。

WK-120成熟感原则及队列已接收：密度收敛、留白/对齐、层级先成立，材质与光后加。CC-W → CC-D0-a → FE-05a（字阶/密度）→ FE-05（材质/光）→ CC-I；FE-05a先由Fable给约束表，再由Opus用Settings与Work头部两张变体消融，用户比较后全站落地；anti-slop hierarchy检验字号/字重能否不靠颜色与框线建立层级。ATT-FE-01仍在FE-05后按接缝交付进入，不把序列当已派单或实现。

本表“可接单/下一步”不代表每张工单已有执行会话在运行。各作者回执记录实际开工SHA、worktree/端口、结果与未检项；Astra统一合流，不维护第二份产品状态表。

CC-W已接收：先合Opus/Fable固定交付 `67a6d8d`，再合r4d固定头 `c8d8ddb`，组合提交 `73ce524`；无冲突，无新增依赖、后端写入或allowlist。视口分档、单文档tab、关闭焦点归还、scope标题带与activity记号按WK-126接受，M-14视图状态双写与M-15 B态标题对齐留既定后单。[合流证据](../evidence/cc-w-main-integration-20260909/README.md)分列原交付复验与补丁作者验证；全量263/263包含并行后端新增8项，不能与作者255项直接混称。

Astra补丁 `48693ad`：短标签Answer/Send发送时原有影子只预留静止态，补前浏览器组件检查9/15，补后15/15；现在静止/在途两种标签始终占位。同步将未被终态调用的activity映射unknown改为Unknown，不称已验证终态记号展示。两处为Astra作者补丁，待Fable非作者复核，不套用WK-126对旧交付的接受。既有composer重绘丢失图标、文字挤入圆形按钮另记在[截图10输入](design/attention-surface-2026-09-09/README.md)，未声称由本补丁解决。

WK-122…127作为设计/契约输入接收：Visual Grammar在atlas之上，Shape/Identity仍待specimen与后续成单；WK-127单层backdrop blur + mask渐变只先用于滚动header，保留line回退、reduced-transparency清mask、<768关闭扩采样，帧时间只以真机验收。现不宣称材质实现或性能接受。下一步由Fable从最终main回执SHA建树派CC-D0-a（opus-wo-low），范围仍为现有事实与模块外壳；BE-1/3/25、BE-29已交付也不自动扩大到D0-b。EX-CC5/CS1/GI1仍沿原任务回执消费，r4d工作树保留，本次未代派、未push/部署；G1–G5不关闭。

## 执行文件状态：前后端 PR 准备（2026-09-09）

用户授权按第一性原理撰写前后端 PR 供后续消费，不依赖 LayerFS。[准备包](execution/2026-09-09-execution-state/README.md)从实际 `main@1688a7b` 核对既有 Core/工具接缝，分为 ES-BE-01（确切文件候选、验证绑定与接受恢复）和 ES-FE-01（既有 Work Review 的文件候选投影）。本次仅文档草案；新增 API/schema/测试尚未实施或验收。后端沿原 Core owner，前端等冻结接缝并进入单写者队列；保持 FE-01…04 与 G1–G5 当前顺序，不新增正式状态服务、不自动写回用户目录。

## 后端独立派工（2026-09-09）

用户授权后端先行，关键设计与实现由 Astra light 亲自撰写，explore 用 Luna 集群。本轮从 `main@a431650` 建隔离树，[派工包](execution/2026-09-09-backend-dispatch/README.md)启动三个 Luna max 只读分片，已返回后端/文件状态/前端消费事实；两个 Astra `gpt-6-astra/low` 分片分别交付 BE-17/18 代码 `f58c28c` 和 ES-00 施工合同 `42a4c2f`。根 Astra 非作者复读与集成，在纳入 FE-01 主线 `2b6c221` 后的 `f4774e5` 复跑全量213/213、smoke通过；原a431650基底209/209另列。实际结果见 [证据包](../evidence/backend-dispatch-20260909/README.md)。

BE-17/18以现有token保护两个POST，使用请求中的临时API根/可选key完成有界模型目录探测，不持久配置、不读保存key、不建Run、不注册模型。后续前端接缝按 [实际协议](../app/docs/runtime-foundation.md#unsaved-provider-preview-be-1718)消费；握手不证明key被验证或模型可推理，custom compatible/local的保存与执行另单。ES-00改为受信Run recorded artifacts → 完整历史字节 → Core的选定文件版本集合，避免inline提议冒充执行证据；ES-01代码仍待按合同实施，不称已有文件接受能力。前端实际进度以本页FE-04合流记录为准，单写者顺序及G1–G5保持。

## 本地资料治理：后续研究与 PR 准备（2026-09-09）

用户授权消费 [本地数据治理查询全量turn](research/local-governance-2026-09-09/source-index.md)。已读取接口返回的五个turn、九条文本和一张图片，T02未返回研究答复；30个外链完整索引，其中六个原始页面有界抽查。[准备包](research/local-governance-2026-09-09/README.md)给出只读Intake/rendition、派生索引、现有Core候选决定、Explore接缝与六层评测施工稿。仅规划和追溯交付，无新产品代码/API、模型运行或依赖；不把外文性能与示例数字记为本项目结果。沿Core历史/决定与既有Session/Run，派生缓存可重建，正式治理记录不随sidecar删除；FE串行队列、ES-01与G1–G5状态不变。

## 局部解耦与长期维护：研究并账（2026-09-09）

用户要求将“架构插件化调研”一并入账，并补充handoff.md；已消费一轮完整问答及366行交接原文。[准备包](research/architecture-maintenance-2026-09-09/README.md)在实际main4c1c420核对当前owner，提供AM-A…F后续PR、局部选型/来源index、缓存/维护契约草案和前后端合流Design。保持Pi与既有Core；先请求基线再两项只读慢任务纵切，区分执行/交付/接受、native/adapted和MCP协议代际。与上一单LG/EX及ES-00交叉连接，不复制任务/来源/成果owner。此次仅文档与有界只读核验，未实施async或插件平台、未运行真实provider；FE队列、ES-01及G1–G5不变。

## 数据系统原则：研究吸收与候选 PR（2026-09-09）

用户授权从第一性原理消费“架构设计参考”及672行（671个换行符）报告。已在实际main `af95bcb`核对Core/RuntimeStore/ArtifactHistory责任，并有界补查七个原始来源；[准备包](research/data-systems-2026-09-09/README.md)保留原文hash、来源限度、基线和DS-00…04候选计划。回执/确切接受复用Core及ES，重建并LG，兼容/替换并AM；外部效果对账仅保留条件触发。此次为文档交付，未实现新API/schema/迁移、安装依赖或运行产品/模型测试；不改变Paper、FE队列、ES-01与G1–G5状态。

## Clean and Cool：前端视觉审查与 Claude 输入（2026-09-09）

WK-110已接收为设计输入：只用现有brand包，生成图不作逐像素合同；80×52安全区既有合同保留，Settings/折叠态缺口并入CC-S。三面贯通与tab strip需先修订composition law、宽度折叠策略和tab identity，1440不得静默压窄中面；模块Home为布局版本，不替代简洁Home。次序FE-04 → CC-S → CC-W → CC-D0 → FE-05，CC-D1…随各数据源合同。用户回执称Sonnet EX-CC1/CC2已派，本次只接收r4d@00e33f9，不纳入尚未裁定的探索结果、不代派新代理；前端单writer，探索不构成实施或验收。

最新用户补充已并入设计交接：桌面window control安全区、左/中/右三面上下贯通、composer优先且热力图/统计缩为辅助模块；熟悉的frontier交互范式作为默认参照。沿既有shell合同，旧图不相容尺寸退为参考；本次仅文档，无产品实现或验收。

用户后续用七张截图补充：保留可解耦的模块首页（热力图、邮件、日历、Attention、Models/Usage），Settings以专用导航替换全局项目/会话栏，右侧工作区展开采用标签式chrome，并保留必要边距与呼吸感。[补充交接](design/clean-cool-2026-09-09/shell-refinement.md)及三张修订图已记录；这些结构方向覆盖旧图不相容部分，具体视觉细节仍可调整。仅设计输入，尚未实施或另启Claude任务；统计、来源、多实例等后端接缝分单，前端仍单writer。

用户要求复查已实现及待做前端PR/commit并提供更自由的图稿；从`main@61ab863`隔离启动local-fake，捕捉Home、Models和NDA Review的桌面流程及Models窄屏。[设计包](design/clean-cool-2026-09-09/README.md)附提交/工单索引、三张Image Gen图、完整prompt、偏差校正及Claude交接。图稿尚未选择或实施；Home几何/命名和Review全幅模式均为显式提案，BE-17/18探测不代表custom连接已可保存。仅文档与图像交付，无产品代码变更；FE单writer队列与G1–G5保持。

## 新接两单：Luna 首轮有界交付

2026-09-08 用户指定“code base 优化和 harness Core 验证”，并确认“落工单并启动 Luna 有界执行”。从实际 main `429fdd68febb9998f322a0b53c323651fc8cd7fd` 建临时隔离分支 `codex/luna-maintenance-core-validation`；[两单合同](execution/2026-09-08-luna-two-orders/README.md)已形成并启动三个 Luna max 分片：clarity Finder、Core 独立反例验证、agent capability compatibility index。首阶段仅各写对应证据；代码候选必须经另一人验证后才授予修复写权。Astra 负责架构、current 与合流，不触碰 WK12/WK11 前端写权。

[CB-01](execution/2026-09-08-luna-two-orders/WO-CB01-clarity-pilot.md)只做四文件 clarity 试点；[HC-01](execution/2026-09-08-luna-two-orders/WO-HC01-core-capabilities.md)检查 Core 不变量与基础 agent 能力/开放控制面缺口。首轮结果见 [证据包](../evidence/luna-two-orders-20260908/README.md)：CB-01两候选经非Finder复读与35/35复跑均拒绝，以四文件no-change完成本次试点；HC-01定向18/18与两个独立探针通过，探针另经非作者复跑，基础能力兼容性首版矩阵已交付。Astra接收有界证据，未修改产品代码；未声称全仓优化、全生态兼容或产品验收。不自动实现整个能力列表，不关闭 G1–G5，现有产品施工顺序保持。

## 已成立的证据

| 范围 | 已有证据 | 支持边界 |
|---|---|---|
| Harness Core与NDA后端 | 170/170、smoke与独立Core/adapter/故障注入；固定代码1332691 | [回执](../evidence/harness-core-20260908/README.md)；合成/loopback、无真实provider或前端验收 |
| 本地/远端恢复 | 独立clone安装、146/146、runtime smoke与启动静态资源通过 | [联调同步](../evidence/final-integration-20260908/sync.md)；测试提交与当前产品app/tests/brand一致，非真实provider |
| Web↔后端主链 | 回答/精确工具授权、File身份、Preview、deny/Stop/断连恢复9/9；MCP unknown回执3/3；extension恢复6/6 | [联调回执](../evidence/final-integration-20260908/README.md)；fixture、实际HTTP与浏览器，不代表完整NDA/专业正确性 |
| Runtime控制面 | CAS、parent gate、Source/Effective、历史Context与MCP生命周期；RC契约20/20、反例9/9、视口36/36 | 同上；characters非tokens，安装/连接/曝光/许可分别成立 |
| 当前GUI与品牌 | Home空/列表、1440/390浅深几何8/8；既有L0–L3、悬浮工作面/composer；brand独立包 | [联调回执](../evidence/final-integration-20260908/README.md)、[品牌验收](../brand/evidence/ACCEPTANCE.md)；部分画面目视，不宣称全面视觉/读屏/触控验收 |
| Runtime R2解析 | inline六kind、exact hash、unverified来源、inspect-only与locator unsupported | [解析契约](../docs/runtime-control/source-resolver.md)、[证据](../evidence/runtime-resolver-20260908/README.md)；不是R3兼容矩阵或R4/R5安装方案 |
| Main谱系与目录 | replacement `d20fbc3`继承旧`f9ade85`，文档后继`d86eba4`已同步；原Courtwork目录检出main，迁目录后smoke通过 | [接管回执](../evidence/main-cutover-20260908/README.md)；不代表Pages/DMG发行或产品G1–G5已完成 |

146/146、9/9等是不同范围的既有回执，不累加成一个“产品完成度”数字；本次Core作者全量验证与独验按各自SHA/范围分列；合流验证见清洁节点回执。

## 仍未闭合

- G1真实provider仍not_run；可信执行身份贯通已由loopback验证。G2/G3后端闭环已成立，Review/新Session GUI已有合成复验；Home/待处理卡键盘已有合成浏览器复验，真实IME、读屏与真实运行纵切尚待；不以工具allow代替成果accept。
- H1历史来源归属与H3 producer缺席后端读取已实现。领域renderer与版本化修订动作声明已交付并通过合成复验；H4完整卸载/重装/升级矩阵仍按实际需要验证。
- BE-1/3/25与BE-29保留记录投影已交付（见下），前端消费/完整历史仍待；BE-2多文档实例；BE-12模型effort；Runtime R2获取、R3兼容、R4 Proposal、R5事务apply/rollback、R6 Expert版本。分别消费既有契约，不为导航或演示造能力。
- VoiceOver/NVDA、IME/触控、桌面壳、200%缩放的完整产品验证及数据回退演练；旧135/1无栈flaky未复现，不称已修复。
- README/Pages真实媒体与发布；新DMG/签名公证/外部用户试点未完成。Paper已采用 [9.6固定SHA](../PAPER.md) `d78fd312955c1f594e59cbdcbb0d3074ac355940`（DEC-012）；版本采用不关闭产品验证门。

## 责任与历史

[架构](architecture.md)保持M01–M14所有权，[长期路线](roadmap.md)保持R0–R5与H0–H5；本轮不改Paper、不新增并行正式状态，此前已结束的Fable loop不自动覆盖用户本次新开工安排。过去的迁移条件已经由用户“先切main”的授权调整，不再当作当前分支门；其中真实验收/恢复要求继续由本轮产品完成度承接。

历史细节按需读 [第二节点](../evidence/node2-independent/README.md)、[最终联调](../evidence/final-integration-20260908/README.md)、[清账](../evidence/reconciliation-20260908/README.md)、[main接管](../evidence/main-cutover-20260908/README.md)。历史回执原文保留，其旧目录、等待状态与分支称呼不覆盖本页。

## 个人 Attention：讨论消费与 PR 准备（2026-09-09）

用户授权消费“解释 GoRaven”网页讨论，并建立独立 Attention Assistant 手动 loop。本轮从实际 main `683b6d1419242bd08d20b7deec77ce12af7dcf12` 隔离开工，Luna 分别研究产品接缝、局部选型与 Paper 提案；[准备包](research/attention-2026-09-09/README.md)与[关键裁决](research/attention-2026-09-09/adjudication.md)将 Attention 独立生命周期、受策略约束的存在性发现、schema/grep渐进披露、Human Attention UI与runtime替换分单。独立个人目录只运行文件化手动实践，不成为第二产品开发线或Core状态服务；应用项目注册尚需UI添加文件夹。Paper按独立仓协议先登记候选观察，未升级本仓PAPER.md固定采用版本。此次仅研究、文档与手动起步，无产品API/schema/迁移、外部发信、定时器或真实provider验证；既有FE单writer队列、ES-01与G1–G5状态保持。

## 截图复读与Attention前端衔接（2026-09-09）

用户提供七张线框及两张真实agent产品截图，已做静态复读；[交接包](design/attention-surface-2026-09-09/README.md)支持B+C与D0-B有条件方向，指出长文行宽、composer缺席与Home待办下沉。Attention建议常驻全局入口/独立工作面，Home仅可选摘要，复用并行研究ATT-BE-01/ATT-FE-01/ATT-RT-01，不复制对象owner或台账；并行研究当时未合流。CC-S继续，CC-W→D0-a→FE-05次序不变，Attention待后端接缝后进入单writer队列。本次仅文档与用户图片证据，不升级为产品验收或Paper修订。

本次文档合流同时接收Attention研究准备包与上述截图交接；常驻入口/独立工作面和可选Home摘要共用同一对象与service，后端接缝交付后再进入FE队列。Paper由Astra仅登记PI-22，Canonical/Practice正文不改。

## 多专家资源治理：TeamAI研究入账（2026-09-09）

后续同一讨论扩展为4个turn、8条文本；[增量索引](research/teamai-2026-09-09/attention-delta.md)补入MyContext与Attention两轮。核验来源采集/依赖负例、去重抑制、snooze和介入策略；保留原2-turn证据。Context快照可持久用于审计，不能替代正式状态；抑制通知不承诺事件永存。复用ATT/LG/AM，未启动产品或Paper施工。

用户授权消费“多专家架构分析”，本轮完整读取2个turn、4条文本与唯一上游仓库入口。从实际main `3af83eb` 隔离核对，[TeamAI索引](research/teamai-2026-09-09/README.md)将scope、原生格式转换、资源生命周期、recall来源锚点、friction与owned patch映射至已有AM/LG/ATT和Runtime接缝。原回答的12个内部citation没有URL映射，不冒称恢复原检索；上游另行有界核验。仅研究入账，不安装TeamAI、不新增并行registry或编排平台，不改变Paper、现有施工顺序及G1–G5。

## 设计方法与Chat Space：研究入账（2026-09-09）

用户授权消费“设计索引方法论”，从实际main `f9bafb6` 隔离完整读取5个turn、8条文本及1张截图。[研究索引](research/chat-space-2026-09-09/README.md)把约束/方案/减法方法、用户Markdown、ask_user/permission和File/Artifact下载映射至既有WK-112、前端工作面与服务合同。外部协议/库建议按原文与本轮核验分列；共享局部UI不合并状态owner，输入accept、工具allow、执行完成和Core接受分别成立。仅文档入账，不安装依赖或实现新状态/API，不改Paper、单writer队列、ES-01及G1–G5。


## 后端并行施工：Activity / Usage与AM离线基线（2026-09-09）

用户授权fresh Astra与Luna explore并行推进后端。本轮交付`codex/backend-bounded-20260909@52f75dd`，基线`5ea5ff0`；BE-1/3/25、BE-29代码`fd3861b`提供认证只读Activity/Usage与summary UTC日期过滤，无Core/Runtime schema迁移、前端、新依赖或静态准入变化。[正式协议](../app/docs/work-metrics.md)明确保留记录complete、历史unknown，partial/missing非账单；极端usage溢出时两端点均报错，未作为已修复缺陷。

AM-C配套`87c8818`仅固定local-fake最终出站请求golden与语义差异，不称原生async或真实cache收益。[合流证据](../evidence/backend-bounded-main-integration-20260909/README.md)记录代码审阅与组合验证，原作者/Luna独验在[交付包](../evidence/backend-bounded-20260909/README.md)分列。ES-01只完成可信record/history、输入覆盖与迁移边界探索；Attention仍研究。BE-2按最新CC-W范围交合同owner，不新增backend tab账本；后续前端模块消费沿现有队列，G1–G5不关闭。


## 可选浏览能力：研究入账（2026-09-09）

后端任务消费用户“考虑解耦提供”讨论，研究提交`5163ae95c3ce950dcc2b380ef93c37cedd84dbec`基于`751be02`。[Browser研究包](research/browser-capability-2026-09-09/README.md)完整登记1轮2条文本，固定上游`browser-use/browser-use-pi@e0df2743e680125a4378d4d578420917620711f2`；Astra/Luna只读核验后裁为可选Browser Agent adapter候选，Driver资源归属单列，不采用原答复的ADOPT结论。hooks不是sandbox、导航域名规则不是网络隔离、partial/事件日志不是持久成果或Core接受；Browser输入不能绕过ES输入覆盖。

来源Astra复读研究包、原文及合同/PR边界，核对逐字稿hash、15个本地链接和diff后接收文档。上游21文件hash由研究作者核验，不冒称本次重复独立核验。未安装/执行上游、浏览器或模型，npm发布artifact未验；不启动BR-01…03、Core或前端施工，不改Paper及G1–G5。


## Review Surface：CodeRabbit自研PR入账（2026-09-09）

用户授权消费“分析CodeRabbit巧思”，从实际main `a7a08f0` 隔离完整读取1轮2条文本、核验6个显式官方URL。[准备包](research/review-surface-2026-09-09/README.md)将15项机制归入历史定位/版本提示、阅读分组、领域比较与覆盖、Attention/局部对话四个有界PR建议，复用Core/ES/ATT与既有前端队列。分组不授予接受权，缺席不表示已解决，历史读取与逐动作当前基线分别成立。仅文档入账；未实现、未建立远端PR、未改Paper或关闭产品门。ES后端在途交付应由实际固定SHA另行接受。


## BE-30 / AM / ES-01：后端合流（2026-09-09）

从最新CC-W main `0b5ccd2` 无冲突接收 `95cfb16`，最终产品 `b1ff74b` 已包含 `429a2f2` 的验证记录损坏修复，不单独接受旧中间提交。BE-30可选permission载荷CAS在resolve事务内检查，AM有界依赖正负例已合流；ES-01完成opt-in file-memo-v1记录字节→Core候选/验证→人类接受→跨Session/producer缺席读取。正式接口、limits和输入覆盖见[协议](../docs/work-core/contract.md#es-01-opt-in-recorded-file-memo)。本段更新此前ES待做/仅探索的时点记录。

[合流证据](../evidence/harness-next-main-integration-20260909/README.md)：来源Astra代码审阅、组合290/290与smoke通过，BE-30七组及固定SHA迁移/Core反例复跑通过；作者与两位Luna证据分列，无集成产品补丁。Core2/app3仅从验证过的Core1/app1或app2备份迁移；旧host拒新库，恢复用独立目录。RuntimeStore仍4；没有升级用户数据。

文件GUI/catalog创建入口未做，旧renderer只读fallback；完整输入coverage限洁净Session且compaction禁用，额外输入保守unknown；结构PASS不等于专业质量。Attention fresh Astra任务已启动边界准备，本次合流后从最终main接Core/service写权；前端继续CC-D0-a → FE-05a → FE-05 → CC-I，main/current/台账由来源Astra持有。真实provider、Paper、发布和G1–G5保持原边界。


## Attention：后端独立接受与合流（2026-09-09）

用户授权fresh Astra沿ES完成后接续ATT-BE-01。来源Astra从main `fa90763` 独立审阅，接受最终产品 `d37704e` 与证据头 `ae595ed`：Attention current/event/receipt与Matter同属Core SQLite；project复合身份、revision/CAS与精确重放、typed human actions、最小registry/详情/来源/事件查询及默认拒绝的Runtime披露/signal接缝已实现。[正式合同](../docs/work-core/attention.md)与[实际HTTP/Pi/Core packets](../app/tests/fixtures/work-core/attention-packets.json)供后续消费。Session/Run结束或缺席不解决Attention，signal不产生Matter接受或工具许可。

[非作者证据](../evidence/attention-independent-20260909/README.md)记录来源Astra独立发现旧ES前置备份悬空链接缺陷、作者修复及原反例最终通过；de38中间产品不单独接受。五组新设计披露/状态反例、固定SHA迁移矩阵、作者15项定向复跑、最终全量305/305与smoke通过。Luna被作者补写的测试初稿不计独立接受；作者和来源非作者证据分别归因，无集成产品补丁。

当前Core3/app4、RuntimeStore4；支持既定旧schema经独占备份分阶段升级，回退用独立目录和对应旧host，未升级个人数据。ATT-FE可按稳定合同进入现有单writer队列，具体插入点由Fable按已排工单协调；本次无Attention UI、自动调度、外部发送、自动Pi工具安装或完整ATT-RT兼容矩阵。Core/service本轮写权交回来源Astra；Paper、真实provider、发布及G1–G5不随本单关闭。

## AM-B 异步 loop：后端续行派单准备（2026-09-09）

用户要求后端PR续行、Luna explore，成熟实践且验收明确的任务可派Terra，关键harness core与模型能力瓶颈由Astra亲写。从实际 `main@0480c17` 隔离形成 [可派工合同](execution/2026-09-09-async-loop/README.md)：T1协议/请求兼容探针与T2慢任务故障夹具可先并行；Astra A0冻结归属、结算、投递、选择性等待与恢复，A1实现两项只读任务的adapted纵切；固定接口后T3只读投影、T4非作者恢复演练，A2另评模型调度与native路径。Luna只读探索已返回并在合同末尾记录持久任务缺口与三项收窄；本轮交付派单准备，不表示Terra已启动或AM-B已有产品实现。Fable前端继续现有单writer队列；Core3/app4、Runtime4、真实provider与G1–G5保持。

## Attention human decision queue：handoff 消费（2026-09-09）

从实际 `main@fb50d21` 隔离消费用户 Email/GitHub handoff，[研究与派单增量](research/attention-human-loop-2026-09-09/README.md)保留原文hash、全部显式来源核验和Luna只读映射。采用先记录人类判断证据再治理偏好；五对象映射现有owner，不复制Attention状态；邮件disposition独立于生命周期。Gmail/GitHub离线同步反例与trace合成向量可派Terra，生产DTO/来源持久化、proposal批准、effect核对与恢复由Astra先冻结，继续AM-B只读主路径。Trace从P0记录，P5再分析；原生draft也属写操作，旧批准不覆盖新payload/目标版本。此包仅文档、未启动Terra或真实账户/外发/自动化，不将SDK的same-run恢复当Pi已实现。前端仍由Fable原队列，Core3/app4、Runtime4、Paper与G1–G5保持。

## CC-D0-a / Scout v2：合流与前端队列（2026-09-10）

从实际 main `7c07ef6` 隔离，依次接收 CC-D0-a `30014cf`（含 Fable §16 非作者接受）与 r4d `5b4c981`，两次无冲突。Home 模块带与 Scout v2、V1 基线和 FE-05a 提示词进入主线；[合流证据](../evidence/ccd0a-main-integration-20260910/README.md)分列本轮验证与既有 Fable 浏览器复核。共享树既有未提交证据原样保留。

Astra 按本次换序授权裁定：**FE-05a → FE-05 → ATT-FE-01 → CC-I**，覆盖此前队列。Attention 后端已稳定且不依赖 CC-I；四项文档前置仍由 Fable 补齐，grant 编辑器仍归候选 CC-P，PropertyRow modified/reset 仍归 CC-I。FE-05a 只落 V1，消费 M-15/16/17、Shape 与 M-18，由 Fable 从最终 main SHA 新建树派单；本次未派 writer。真实 provider、发布、Paper 与 G1–G5不变。

## 发布面 / 品牌接口清账（2026-09-10）

Astra 接手 Claude limit 后的清账。从实际 `4f7278f` 承接已合流的 CC-D0-a / r4d，接收发布面与品牌准备包固定头 `dcae9d7`。[本节点回执](../evidence/cleanup-20260910/README.md)记录范围与未结项。PS-24：公共站七行问题归 PS 批次，施工中不派 sweep；交付四轴复核判弱后才按“30 样本 → 3 候选 → specimen”补一次。真实 pricing 不适用与第 07 段概念研究稿并存。60fps 只作为品牌第 3 层（06）的 motion donor；第 1、2 层不派 sweep，站点继续零运动。

WK-136 换序沿 `4f7278f` 裁定：FE-05a → FE-05 → ATT-FE-01 → CC-I。当前 Opus 在途仍为 WO-PS-01 站点、WO-BR-01 glyph 板；分支中间提交不视为正式回执或接受。Astra 接收回执后复核，glyph 选向仍归用户，PS-02 待 PS-01。此节点只合流准备文档并对齐账本，不接收两条在途实现，不关闭 G1–G5。

## Markdown Review Surface：Astra 架构与评测（2026-09-10）

用户指定本单前后端架构/关键实现/异步节奏由 Astra 持有，Luna explore，成熟有界部分可派 Terra。从实际 main `1f437a98` 隔离完整消费“Markdown评审方案”1轮2条文本；[架构与工单包](research/markdown-review-2026-09-10/README.md)记录来源、接缝和执行状态。原始文件字节与既有 owner identity 为真源；AST/outline/diff 为可重建投影。首个正式评注限定 Core file Candidate/Artifact，评注处置与定位状态分开，跨版本仅产候选、不静默迁移；普通 Markdown 只读阅读不自动创建 Matter。

Astra 完成隔离 parser 坐标 probe，Luna 负责本仓/主源核验，Terra 实施当前 renderer 的真实浏览器基线与未来 revision oracle；具体结果和作者/非作者范围见包内回执，不称评注、精确inline或semantic diff已交付。下一产品单 MR-A1 身份/源投影、MR-A2 Core评注事务/迁移由 Astra 亲写；Terra reader/rail 等冻结 DTO 后派，不猜接口。生产代码、schema、vendor、Paper和G1–G5未变；既有FE共享文件单writer顺序保留，本单架构不再转交Fable。

## AM-B：持久只读异步任务与离线 human-loop 夹具（2026-09-10）

用户同意派单后，Terra完成T1最终协议/Pi出站探针、T2真实子进程故障夹具，以及Gmail/GitHub/trace三项离线夹具。Astra亲写A0/A1：host登记不可变read source、持久handle、至多一次dispatch尝试、选择性get/wait、独立取消/执行/投递记录与query-only重启恢复。具体实现和作者/非作者证据见 [本轮回执](../evidence/async-loop-20260909/README.md)，正式边界见 [合同](../app/docs/async-tasks.md)。此前派单准备段的“未启动/Runtime4”是历史时点。

当前RuntimeStore5，Core3/app4保持。schema3/4经完整验证和独占原字节备份升级；已有备份路径/非法UTF-8拒绝，旧host拒新库，恢复使用独立目录。没有升级个人数据。adapter默认缺席；仅不绑定domain的Session可用，防止绕过ES完整输入覆盖。旧任务/来源历史可读，任务成功不授予Core接受或解决Attention；未读取终态的final保持unknown。

T3专门前端投影/packets与A2真实模型调度评测后置；T1证明现有锁定SDK普通loop与native缺口，不声称原生async。HL包仍只是离线响应/向量，生产DTO、摄取、proposal/effect写链路待Astra冻结。无新UI、自动续行、真实provider、外发、部署或Paper变更，G1–G5保持开放；前端和发布面队列沿上文当前裁定。

本批组合实际基线 `a243a6c`，Astra合流验证346/346与smoke通过；T4四窗/分目录恢复与策略wrapper真红→绿独验已接收，详见上述回执。最小task adapter仍为opt-in，独立协议/fixture测试不授予模型native能力。

2026-09-10 Pages 接续：Claude 原施工 `e492dc9` 由 Astra 恢复为 `230a719`，Terra 定价 `082b35f`/`f412a62`，Astra 完整版面 `e142b56`；与 async 当前 main `85693a6` 合流为 `e2f3ef0`。唯一冲突 README 按页面生成器重建并保留 schema 5 迁移/独占备份要求。真实 composer 图标回退在 `9e5384f` 修复，独立复核与页面回执另列；固定快照测试不代表合流后全量数量。用户将独立 review 页面，不关闭真实模型与产品门。品牌 `15b6464` 保留独立分支，不随本轮发布。


## BE-5：声明式来源解析 HTTP 接缝（2026-09-10）

从实际main `5909f2f` 隔离接收作者代码 `9cbae87` 与证据 `470498b`，无产品冲突。新增认证 `POST /api/v5/runtime-sources/resolve` 直接复用既有resolver；原文identity、unverified来源、granted空与inspect-only保持，locator明确unsupported，不获取/安装/连接/执行。Astra独立3/3、组合全量352/352与smoke通过，见 [合流回执](../evidence/runtime-source-service-integration-20260910/README.md)。无产品集成修补，仅修正索引/接缝说明与当前状态。

共享body reader超1MiB会断连，不能承诺客户端收到JSON 413；本单接受其既有有界拒绝行为，若改善可观察错误需另做宿主级修复。此处关闭BE-5的HTTP检查接缝，不关闭R2获取、UI消费、R3–R5或G1–G5。Core3/app4/Runtime5保持；没有升级个人数据或运行真实provider。

## AM-B-T3：纯投影与 UI 消费 packets 接收（2026-09-10）

以main `5123d0f` 为组合基线，接收产品 `184e3f0`、作者证据 `bd4b92a`；期间发布面main `8e69032` 无冲突同步。AsyncTasks.view委托纯projectAsyncTask，owner仍提供Session存在性与当前adapter；schema1字段、availability优先级、options与历史/投递事实保持。Astra非作者固定旧SHA的392组对照及副本/adapter/时钟边界检查通过，组合全量361/361与smoke通过，见 [回执](../evidence/async-loop-20260910/task-view-integration/README.md)。无产品集成补丁或schema迁移。

T3纯投影/消费packets已交付，覆盖此前“尚未派/后置”的时点记录；UI本体、A2真实模型评测与native async仍未交付。delivery.taskRevision允许小于task.revision，投影不回填历史receipt、不推断动作许可。Core3/app4/Runtime5、HL生产合同与G1–G5保持。

## Markdown reader 与 Output Review 边界（2026-09-10）

用户授权施工后，MR-A1/T1 已交付：Astra 固定版本 source/分页与 File宿主接入，Terra局部reader，Luna独立source反例与实际HTTP/Core测试。产品 `ec7f4fd` 与当前main `85693a6` 无冲突合流，最终产品/测试 `b119fc3`，再保留Pages主线 `5909f2f` 合流为 `e8f1438`（current末尾双新增记录同时保留），随后保留BE-5/T3主线 `ecccac2` 合流，最终组合产品 `5f17cde`；[交付与归因](../evidence/markdown-reader-a1-20260910/README.md)列出最终386/386组合、reader独立19/19、输出边界14/14、组件28/28非作者复跑、真实宿主11/11及smoke/lint。Core文件入口、outline/find/raw source/块定位/复制已接现有File页；正式评注、迁移、重锚和semantic diff尚未实现。

用户明确Output Review与Markdown是相交而独立的边界，已裁为[双边界架构](../docs/output-review.md)：前者接收/保留/表示所有可见模型与工具输出，后者负责包括用户/外部来源在内的Markdown格式能力，不互为完整包含关系。Chat Space copycard沿已有Code/Copy消费；复制不构成评审或接受。输出链已完成有界调查，另在 `5f17cde` 修复连续完整assistant消息覆盖（Luna独立反例修前4/6、修后6/6）；OR-A0继续冻结非文本/未知output接收与历史协议给UI；MR-A2/A3分别保持Core评注事务与Markdown版本定位范围。

本单不称全output review已完成，不升级个人数据、不新增模型调用或部署；Core3/app4、已合流RuntimeStore5、Paper、G1–G5与原前端队列保持。

## Home composition / Attention 只读前端（2026-09-10）

用户明确要求首页编排与逐轮视觉输入消费后，Astra从实际 `00b2f288` 隔离实现：Attention/Activity置于composer上方，分层灰阶及窄review色槽，独立Attention主从读面与明确标注的Assistant前端预览，侧栏每项目8行真实会话及所有展开项目刷新。窗口控制预留按用户纠正移到品牌左侧同一行；版本化原生几何注入只传展示事实。三份补充Control/Sidebar/Selection材料与MingCute重新逐项消费，见[当前合同](design/home-composition-2026-09-10/README.md)与[回执](../evidence/home-composition-20260910/README.md)。

Astra作者全量395/395、smoke、色彩/对比度通过；Luna有界非作者392/392和竞态/DTO测试，发现返回加载残留后由Astra修复加回归。真实浏览器验证1440/390、浅深宗、只读来源、筛选、草稿保留及同一行native预留；未执行原生AppKit宿主验收。此处覆盖CC-D0-a旧默认/几何及“Activity/Attention无接缝”时点，未关闭完整ATT动作/RT、CC-I、icon选族或G1–G5；无个人数据迁移、真实provider、外发或部署。

## 仓库公开内容与目录整理（2026-09-10）

按用户授权，由 Luna 探查目录与公开素材，Astra 整理导航、README 架构、生成物和公开数据。`site/dist/` 与 specimen vendor 副本改为构建生成；品牌分发 SVG 保留。桌面参考图从当前树移除，保留来源哈希；当前固定快照 `9e5384f` 的机器路径作公开投影，旧标本仅留冻结来源索引。模块与验证包导航见 [仓库目录](../docs/repository-layout.md)，范围、验证与归因见 [本单回执](../evidence/public-repository-cleanup-20260910/README.md)。产品代码、数据 schema、品牌选向与 G1–G5 未改变。

本次整理已合入 `cd2a5b8` 并按既有授权发布 Pages；[线上回执](../evidence/public-repository-cleanup-20260910/live-verification.json)核对页面与脱敏标本 HTTP 200、manifest/字节一致。独立干净构建46/46、浏览器17/17及文档相对路径检查通过；产品快照仍为 `9e5384f`。


## MR-A1a · 原始文本坐标基础接收（2026-09-10）

从实际 main `a0ebcf0` 隔离，无冲突接收代码 `570fda8` 与作者证据 `7a6db4a`。Astra 非作者读码与5项边界反例发现伪 typed-array tag 被接受、非法 unit 对象导致错误码丢失；集成补丁 `dc564bd` 修正，Luna 对固定源码独验8/8并补伪造tag反例（同/跨 realm），修前0/2、修后2/2。组合定向19/19、全量405/405、smoke与1,114,368组UTF-8 parity通过；[接收与归因](../evidence/markdown-review-20260910/source-coordinates-integration/README.md)分列作者原378/378与当前组合结果。

本片只接受64 KiB内原始 UTF-8/codePoint/UTF-16 边界转换、字节hash与保真，不等于grapheme/parser/显示坐标。模块仍无产品调用方，既有MR-A1/T1 reader与HTTP/Core未接此模块；正式评注、重锚与Output Review范围不变。Core3/app4/Runtime5、Paper与G1–G5保持；未调用真实provider、迁移个人数据或部署。

Home合流复核：产品 `d2b91e5` 与已接受main `b176738` 组合为 `1f31f0b`，产品无冲突，current双新增保留；组合414/414与smoke通过。后补Composer Runtime与两份Tab输入已进入同一[设计消费包](design/home-composition-2026-09-10/README.md)，明确现有接缝与缺口，不新增未测量TPS或虚构Chat层。

Material接续（2026-09-10）：从实际 `f666c09` 消费用户Material Constitution与135候选研究摘要，形成[材质token草案/组件映射](design/home-composition-2026-09-10/material-grammar.md)。限定Product glass、实际modal smoke、review tint与Pages atmosphere辖区，排除Product refraction，明确whole-skin旧接口尚未收窄为review-only主题。产品只为两处既有blur补不支持backdrop-filter及forced-colors的实色回退；未新增玻璃组件。材质/色彩定向6/6、两项lint及544文档/2426链接通过；未重跑无关全量、未宣称新specimen或原生材质验收。

Data visualization 接续（2026-09-10）：从实际 `42f2ae9` 消费两张Usage截图及完整研究文本，形成 [热图/模型用量合同](design/home-composition-2026-09-10/data-visualization.md)。明确现有接口只有Run日计数与区间usage，缺少每日/model token和匹配下钻；冻结候选组件、相对分级、Top4+Other、coverage与主题边界。仅文档消费，未实现新图表或统计，不改变现有Home运行次数语义。

Disclosure / vocabulary 接续（2026-09-10）：从实际 `c788764` 完整消费两份28结果/3线、38来源/4线材料，登记 [Overlay分型与D0–D4矩阵](design/home-composition-2026-09-10/disclosure-overlay.md) 和 [Semantic→Glyph治理](design/home-composition-2026-09-10/interaction-vocabulary.md)，并接回IC-7。保持Project/Matter、Session/Chat及权限/接受边界；现行24枚Lucide renderer未替换，MingCute仅候选优先。仅文档合同，未新增菜单、telemetry、semantic adapter或specimen，不宣称全量交互验收。

Chat / Attention Assistant施工交接（2026-09-10）：用户明确二者可作为同级产品面注入，Chat可先做临时网页Chatbot前端、后接后端；不以现有Session无Chat子实体阻挡产品面。用户输入文档按与消息同级的attention优先级裁决消费，区分研究引用与实际指令。已形成 [新Astra施工交接](design/home-composition-2026-09-10/construction-handoff.md)，授权新任务轻量上下文、Luna有界探查、Astra前后端合流；不另建Fresh开发线，不宣称功能已完工。

最新收敛：用户随后提出由Attention Assistant承接Chat并提供agent能力，仅界面参考Codex；当前施工方向更新为单一Assistant的对话面，不另建纯Chatbot产品。已覆盖 [交接最新裁决](design/home-composition-2026-09-10/construction-handoff.md)，前端可先行，实际agent/runtime随后接通。

## Attention global agent / shared Runtime composition（2026-09-10）

最新用户裁决将 Chat 与 Assistant 收为单一 Attention 全局 agent：角色唯一、会话可多；与 Matter Experts 共用 Runtime 配置机制，当前不新增 Experts 导航。Astra 从 `444f80d` 隔离并接入 `405ad76` 实施全局 Session、真实 Run 对话与渐进历史读取、显式项目 Attention 查询和配置打包表单。输入框依最新要求为单行圆角方框，配套圆角方按钮；空态保留 “Attention is all you need!”。此段覆盖此前仅前端 Assistant preview 的状态与分离 Chat 方向。

RuntimeStore 当前为6（Core3/app4不变）：严格校验后从3/4/5保留原始字节备份迁移，旧会话标记project，全局会话无project/Matter绑定。全量418/418、最终定向6/6（含新增两项竞态）、smoke及色彩/材质lint通过，合成浏览器验证对话、工具、问答、单行发送与配置保存/选择；[证据及作者归因](../evidence/attention-agent-20260910/README.md)、[架构/后续边界](design/attention-agent-2026-09-10/README.md)。Luna仅有界复核，不冒充完整独立接受；连接器认证、派发Experts、通用记忆写回、原生与G1–G5未关闭，未运行真实provider、个人数据迁移或部署。

## Backend Governance 认领（2026-09-10）

用户授权认领后端治理PR并由Luna explore。Astra从实际 `main@27d37da` 建立 `codex/backend-governance-20260910` 隔离分支，形成[认领与首片合同](execution/2026-09-10-backend-governance/README.md)。沿既有Attention原子state/event/receipt及default-deny披露，首片BG-01聚焦Attention/Matter目录与渐进披露；Matter通用disclosure仍须先冻结，不能继承全局agent权限。Run/attempt和外部effect分别接执行owner与DS-04，不新建memory事实库。Luna只读源码探索与作者文档检查不等于产品实施或独立接受；未创建远端PR，不变更schema或产品门。探索基线Runtime6；提交前另一个writer已将main推进至 `6921dbd` / Runtime7，后续实现须重新对齐。

Home handoff后续施工（2026-09-10）：用户授权按 Runtime→Usage→Tabs→Material→Overlay→Glyph→Sidebar/Control 顺序实施，统一composer writer。[队列](design/home-backlog-2026-09-10/README.md)。Runtime第一片已实施共享模型/effort选择器、host观测请求延迟、上下文启发式与独立用量详情；RuntimeStore7持久化可选effort，严格备份迁移3–6并保留global身份。全量423/423、最终定向5/5与合成浏览器验证通过；[证据及归因](../evidence/home-backlog-20260910/runtime/README.md)。原生provider TTFT/decode TPS无必要测量时仍明确不可用，不以host延迟或字符数冒充。下一片Usage施工；其余队列未闭合。

Usage接续：已接每日/模型projection和快照一致的Run下钻、Overview/Models读面、精确日表/模型表、Top4+Other。模型身份固定为Run开始时配置，UTC起始日归属，缺失用量/历史覆盖保持明确，数据变化下钻返回409。全量431/431、定向18/18、最终Usage6/6及合成浏览器验证通过；[合同](../app/docs/usage-details.md)、[证据](../evidence/home-backlog-20260910/usage/README.md)。用户另补Chat Flow材料与气泡/首页会话管理要求：先落实右对齐窄气泡，余项在Usage收尾后优先接续，见[处置](design/chat-flow-2026-09-10/README.md)。


## Multi-agent · Thread与本地通信首片（2026-09-10）

本单原认领multi-agent、Thread、message other agent的入账与Harness入口；用户随后明确Attention Chat flow UI单独施工，最终交付已撤出本单全部web改动。两份原文、14项裁定、七接缝与MA-00–07在[研究账](research/multi-agent-2026-09-10/README.md)；Astra架构/实现，Luna有界只读探索与独立反例。实际从 `27d37da` 隔离，保留telemetry/effort及Usage `ee6df72`，最终产品 `105458a` 已快进合入main。

RuntimeStore8持有显式Thread成员关系与本地outbox/inbox，提供受认证HTTP、模型目录/收件箱/message_other_agent；源Session/Run、target revision、同键重试、重启投递与单次权限保持明确。消息投递不启动目标Run、不改Core接受。child invoke/grant/reducer只交付可执行符合性入口；生产Pi parallel child、持久child recovery、handoff、Workflow及跨Matter Core事务仍未接通，capabilities保持false。[合同](../app/docs/coordination.md)供另单前端消费。

Usage组合 `c1f2122` 全量446/446；撤出UI后定向22/22、smoke、两项lint与文档链接通过；Luna固定组合定向21/21为有界非作者证据，非完整独立产品接受，见[交付回执](../evidence/multi-agent-20260910/README.md)。Core3/app4、Paper与G1–G5保持；未迁移个人数据、调用付费provider、外发或部署。

Interaction Grammar 接续（2026-09-10）：从实际 `ee6df72` 认领并消费用户转交的 Projection / Control Grammar 材料（Exa 94 结果 / 5 workstream，[转录](mvp/execution/work-surface-kit/inputs/interaction-grammar-2026-09-10.md)），裁定见 [intake §4ar WK-139…144](mvp/execution/work-surface-kit/intake-round-3.md)。Projection Grammar 采纳为 [atlas 新段](design/atlas/README.md)，但定位为给既有纯 adapter 层（`presentation-adapters` / `usage-projection` / `thread-projection` 与 presentation-primitives 三条规则）命名，并加第四条「投影不得创造事实」；四条负规则中两条可 lint，另加本地第五条 `estimate ≠ meter`。context meter 与 TPS / TTFT sparkline 当期拒绝——今日 `Decode TPS · Unavailable · no token deltas`、host 首输出不是 provider TTFT、context 是启发式估算；Approval 不升为十一字段 grammar（无 reviewer 身份 / policy version / 到期钟等 owner 事实），只留「scope 可视化先于 scope 按钮」为 CC-P 前置；16 项 specimen board 不另立，Provenance 列与 applicability placement 并入 CC-I。Sonnet 只读 [EX-PG1](mvp/execution/work-surface-kit/explore/ex-pg1-projection-inventory.md) 回执已到并消费为 [WK-145…149](mvp/execution/work-surface-kit/intake-round-3.md)，更正四处事实：控件清点改写（两个 element builder 共存，Temporal 类今日不空）；context 今日已有比例条且代码逐字拒绝画成 percentage-of-limit，meter 类仍为空；`runtime-view.mjs` 的工具权限 CAS 规则表已经是一个 rule builder（与 Attention grant 是两个 policy 对象）；Attention typed actions 是后端合同已有、前端未建。四条负规则按"已验证合规 / 空集 / 不适用"三态记，不得简写为四条已通过。外部主张回填：Base UI 五模态与两阶段 commit、wavesurfer core/plugins 已核验；Braintrust 三视图经核验不成立；LangSmith / Tailscale / assistant-ui 未核验，不作规则依据。`presentation-primitives.d.ts` 名不副实（heatmap gap 注释过期、四个签名从未实现），裁为以代码为准并按事实收敛。施工只派 WO-PG-01（`tools/lint-interaction.mjs` 的三项机械检查 + 该契约收敛），写权不含 `app/web/**`，不抢 Home backlog 的单一 composer writer。本轮未改产品代码、未新增依赖或组件、未实现任何图表或控件，前端队列与 G1–G5 不变。


## Backend governance · BG-01（2026-09-10）

用户授权施工后，Astra交付同owner对象目录与Matter披露，Luna负责探索及固定版本有界独验。产品 `9a8a13a` 整合main `b4e3f71` 为 `caa448e`：Core4/app5持久化披露政策、事件与幂等回执；认证human HTTP可授权/撤权，全局Attention按发现→查看→精确读取消费获准来源与当前accepted Artifact。无第二份registry状态库；Runtime8、coordination与Usage保持组合主线实现。此段覆盖此前Core3/app4的当前版本描述。

[合同](../docs/work-core/governance.md)冻结权限矩阵、对象版本及预算；超预算对象仍可通过human-only policy查询撤权，旧grant回执重放不恢复授权。作者定向21/21、组合全量467/467与smoke通过；初次默认并发全量失败/中断和隔离19/19复验均保留归因。Luna固定 `caa448e` 的129来源撤权、重放及adapter身份反例通过，为有界非作者证据；[交付及原始结果](../evidence/backend-governance-20260910/README.md)。Core3/app4旧库严格校验、备份后迁移；固定旧Core拒绝新库并能在独立目录读取备份。

人类授权编辑器UI、通用relations/history reader、BG-02 Run/attempt与BG-03外部effect仍后置；不关闭G1–G5，不宣称完整独立产品接受。未调用真实provider、迁移个人数据、外发或部署。

Interaction Grammar 施工第一节点（2026-09-10）：两单已接受合流。WO-PG-01 交付 [`tools/lint-interaction.mjs`](../tools/lint-interaction.mjs)（progress / meter 元素与 role、`aria-valuenow`、`input[type=range]`、动态 tag 的 `ALLOWED_TAGS` 闭集四项；登记表为空即"表外一处即失败"）与 [presentation-primitives 契约](mvp/execution/work-surface-kit/contracts/presentation-primitives.d.ts)按事实收敛（删过时 heatmap gap 与从未实现的签名，补三个已发运的 Home adapter，加第四条"投影不得创造事实"）；该 `.d.ts` 是纯文档，不改变任何红绿。WO-CCI-01 把 `settingsRow` 长成 PropertyRow：有 owner 默认值的六行 Appearance 偏好长出 provenance（闭集两词，只作生效值与 `PREFERENCE_DEFAULTS` 的字面比较）、modified（由词承担，无色点）与 Reset（无确认、默认态不呈现、复位后焦点落回本行控件）；无 owner 默认值的行 DOM 逐字不变。Fable 非作者独立重跑 456/456、四项 lint 与定向 27/27，裁定见 [WK-151 / WK-161](mvp/execution/work-surface-kit/intake-round-3.md)。未新增依赖、未引入任何数值控件（`numeric ≠ slider` 仍是空集守恒）、未改偏好语义或存储通道；BE-31 数值 schema、applicability placement、element builder 与 attention 命名收敛只登记未动工。

补充 Control Grammar / agent-facing continuity（2026-09-10）：用户转交的三轮材料已登记为 [S21–S22](design/sources.md#s21--agent-facing-design-system-distribution)，完整输入与召回顺序见 [补充转录](mvp/execution/work-surface-kit/inputs/control-grammar-supplement-2026-09-10.md) 和 [agent interface 候选索引](design/agent-interface-2026-09-10/README.md)。Appica 的 agent-rules / llms.txt / component Markdown 分发链、Atlassian role-token tooling、`AGENT-RULES.md`、`design/index.md`、nearest canonical precedent 与 raw-literal lint 均明确标为 **REFERENCE / 未核验 / 未裁决**；只记录候选工作法，不构成组件、runtime、token 或架构选型。WK-162 不新增 PR、前端/后端 work order、schema 或依赖，既有 S16/S20、Atlas、Scout、FE-05a→FE-05→ATT-FE-01→CC-I 队列保持不变。
Chat Flow接续：按用户补充裁决接入共享用户Markdown/原文/长消息展开、深色用户气泡与气泡下方消息级复制/编辑，assistant整条复制在正文下方，内部文字/代码卡保留独立复制。Attention首页接真实会话搜索/最近列表/Open/New及Session持久化Rename，按实际Run聚合工具与回复并区分问题/权限回执。[证据与有界归因](../evidence/home-backlog-20260910/chat-flow/README.md)。Luna发现的重绘焦点键缺口已修复；定向7/7、有界并发全量432/432与浏览器验证通过（原无界并发9项超时/锁失败另存），没有新增Regenerate、Queue/Steer或虚构归档能力，不关闭其余Home队列与G1–G5。

Attention Chat交接（2026-09-10）：用户改为另行唤醒Opus收尾，Astra已停止扩展施工；[交接入口](design/attention-agent-2026-09-10/opus-handoff.md)汇总固定产品f4f2436、Chat收尾反例、Home3–7与main并行WK139–144/EX-PG1待合流裁定。Tabs早期代码只留未验收patch，已移出活动产品；不称已交付。交接实读main仍ee6df72且文档writer在途，f4f2436合流暂缓以保留其编辑，未另建任务。

Attention Chat 收尾独立验收与证据合流（2026-09-10）：当前 `main@9157bbb` 的独立树复核 Attention 定向 12/12、跨层接缝 18/18，主线完整套件 522/522；smoke、颜色/材质 lint、对比度与文档链接（632 份文档 / 2811 条链接）均通过。`4431dd7` 与 `0bff8b5` 的产品代码此前已在main祖先中；因此仅接收 `claude/attention-chat-closure@f552e22` 的 closure 文档与完整确认日志，非作者独立验收后以 `0d3297d` 合流。作者确认日志中 433/434 的唯一失败是 `work-summary` 测试自身递归快照在并发原子写 rename 窗口的竞态，非本片代码路径；其单独运行通过，已保留原始记录。收尾余项（会话读失败态、完整无障碍矩阵/原生宿主）与 FE-05a、FE-05、CC-I、ATT-FE-01 及 G1–G5 仍开放；未跑真实provider、未迁移个人数据、未部署。

Icon 家族选型裁定（2026-09-10）：EX-IC1 specimen（`claude/ex-ic1-icon-specimen@f5890fa`，基 `2e9da09`）以真实槽位并排 Lucide / MingCute Regular / Phosphor Regular，Fable 非作者接受并裁定 [WK-163](mvp/execution/work-surface-kit/intake-round-3.md) **D：不做家族级迁移**——候选族同名义尺寸下全站小一档（占比 0.56 对 0.69），MingCute 的 butt / miter 与 Phosphor 的填充轮廓都不满足 IC-6 canonical geometry，Phosphor 缺 `panel-right`。Lucide 1.41.0 静态子集仍是唯一 canonical 家族，MingCute 保持首选 donor 来源，Phosphor 降为参考；symbol id 语义化不触发。specimen 先于 FE-05a 回执，因不换族不动尺寸档而登记不返工。唯一产品改动是 WO-IC-01（`3667641`）：`plug.svg` 进 `tools/ui-vendor/lucide/` 生成源并重建 sprite / manifest / LICENSES.txt，新增白名单–sprite–manifest 三集合、manifest–sources.json、outputs 哈希三条 parity 测试；此前 `plug` 是手工追加进 sprite 的，重建会丢。见 [IC-8](design/icon-controls.md)、[atlas Iconography](design/atlas/README.md)。

## 多智能体实践选型 · RD-005（2026-09-10）

从实际main `9097cbfd4b2b3b4c7b1117db5558b73568db67cc` 隔离消费《多智能体实践选型》全部3 turn/6消息，hasMore=false；原文、hash、全量外链与逐轮处置见[消费包](research/multi-agent-selection-2026-09-10/README.md)。[RD-005](research/RD-005-multi-agent-selection.md)登记Astra架构/PR裁决及模型能力瓶颈实现，Luna fast explore与有成熟参考的有界实现，非作者接受仍独立。原MA-01…06映射为MAS消费切片并接既有MA/ME，未重复派单。保留MA2-D15受控Session/Run路线，SoL-Pi为机制/eval donor、PicoAgents为模式及负例；未改变capability或生产schema。本次为研究与文档交付，不关闭产品门；未创建远端PR。
