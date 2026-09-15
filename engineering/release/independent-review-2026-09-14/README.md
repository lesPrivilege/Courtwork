# GitHub独立评审 · 本地消费与裁决

2026-09-14。Astra裁决与入口修订；Luna有界只读探索。消费基线 Courtwork `7e1a1ff047721e1ca6c871deba7f367ccea55a06`，SE `ec8d57ea9d2e69e84ebdc187472c5c50795804f7`，开始时两仓main均清洁。

## 输入与范围

[用户提供的报告](REVIEW.md)逐字节保全，[来源身份](source.json)记录SHA-256；[会话返回](conversation.json)为1轮、hasMore=false。未提供的SOURCES.md、远端失败JSON回执和issue payload不称已取得。报告所述403是来源自述，本轮未重试外发；外部资料判断未重新核验，不作为新增选型依据。文档内建议作为评审材料，按当前仓库事实裁决。

## 逐项裁决

| 发现 | 本地裁决与原入口 | 最小退出条件 |
|---|---|---|
| IR-01 | 采纳。最新筹备仍记录真实Run 6 pending、无人Decision。继续[原G1–G5](../../execution/2026-09-08-main-round/public-readiness.md)，源码预览发布证据有效。 | 真实人检查并决定、正式Artifact及新Session接续；固定源码/依据与必要反例，G4原公开演示及G5支持声明逐项映射。不得代签。 |
| IR-02 | 采纳。支持说明明确无agent-invoked repository test runner，Pi builtin关闭。coding消费者已明确，故[DF-04](../review-intake-2026-09-13/README.md)条件已触发，沿[RD-009](../../research/RD-009-trusted-harness-extensions.md)消费。 | 有界可信仓库recipe冻结cwd/argv/env/超时/输出/取消/退出与Run身份，真实Agent完成读改测修，再人审接续。普通子进程白名单不是沙箱。自动compaction已有，手动入口继续RD-008。 |
| IR-03 | 采纳为已定位债务。Host直接导入并调用Pi SessionManager；接[Runtime replacement](../../research/architecture-node-2026-09-13/runtime-replacement.md)。 | 下一真实替换消费者驱动最小生命周期接口与第二执行器验证，不作为当前预览新增前置。 |
| IR-04 | 部分采纳并修正schema归因。MEMO_PROPOSAL_SCHEMA是通用revision payload默认值，实际file proposal schema已在file-memo-policy；剩余债务是共享owner的se-file-memo-v1动作/能力分支；接[五层架构](../../research/architecture-node-2026-09-13/architecture.md)的Work Extension责任。 | 下一领域增量将专用动作/呈现交回可信policy，以不增加共享owner专用ID分支的增量验证；Core保持正式接受权。 |
| IR-05 | 已修当前入口。架构与AGENTS区分Host15/Core4/bridge5；Site当前媒体指向publication-release-20260914 / fd96f96；SE README/CHANGELOG依据已有发布回执同步9.8发布状态。 | 本片源码差异和文档链接检查；历史媒体、旧标本9e5384f、工程Paper9.6 pin保持原身份。 |

IR编号仅为输入定位，不成为新路线图。已有Runtime CI、Provider注册、Spark实现与Core review summary不重复派工。研究抽查不能升级为全部历史聊天已消费；本轮无新可泛化工程实验，不修改Paper正文或Practice Index。

## 验证与剩余范围

本片仅文档与原始输入保全；依据[验证选择](../../verification.md)检查差异、来源hash和仓库文档链接，不重跑无产品变更的Runtime全量。SE仅README/CHANGELOG状态修正，不重编论文或改历史HTML。发布状态依据[已存发布回执](../final-preparation-2026-09-13/publication.json)，本轮没有重新声称线上目验。

报告已消费不等于IR-01至IR-04已实现或Release获准。本轮未运行真实provider、未作人审Decision、未push或部署。

## Luna有界核验与Astra复裁

Luna只读核验无文件修改、无provider调用。IR-01保留原G1–G5；IR-05修复后不再沿用旧G5三处入口缺口，但全套公开事实及career-kit owner签署本轮未复核。IR-02仅为用户所要求的agent-tested coding声明前置，非普通NDA普遍前置；RD-009已有DTO冻结与合成反例顺序，执行/组合/权限分别沿test-runner、service、control-plane入口。

IR-03确认service.mjs直接创建/打开SessionManager、pi-session-runtime接收对象。IR-04按Luna发现修正：owner.mjs的MEMO_PROPOSAL_SCHEMA是通用revision默认值；file-memo-policy.mjs已经持有实际file schema，work-adapter也已注入领域schema/project。故只登记共享projection剩余的file contract动作/能力分支，不将整个domain policy归到Core。Astra采纳此修正，无泛化重构。

验证结果：报告与用户附件逐字节一致、SHA-256匹配；Courtwork文档链接检查1312份文档、7311条链接通过；两仓git diff --check通过。只支持本片文档一致性，不支持完整产品验收。
