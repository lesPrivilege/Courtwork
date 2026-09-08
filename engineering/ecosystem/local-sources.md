# 本地材料召回与裁取索引

召回日期：2026-09-05。两组 Luna 只读消费 Courtwork 与 Career kit；本轮再次核对 Courtwork 当前状态与 OpenWork 历史报告。未复测历史代码，未改原目录，未导入个人案件、简历或投递记录。

原材料不随 SE 分发，不擅自上传。局部工程论证在本目录重新组织，只引支持当前问题的最小内容。Career kit 条目（L09–L13）指本机可变目录，行号可能漂移，因此同时保留标题与用途；Courtwork 条目已改为对冻结 tag 解析，不漂移。

## Courtwork Legacy Freeze

Courtwork 于 2026-09-06 冻结为来源，不再作为实现基座。L01–L08 自此对下列不可变锚点解析，不再指向工作树。

| 项 | 值 |
|---|---|
| 冻结 SHA | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476` |
| tag | `archive/courtwork-pre-takeover` |
| archive branch | `archive/courtwork-main` |
| 冻结前 `origin/main` | `f8dc25e`；冻结时快进发布其后 69 个提交 |
| 冻结时门 | vitest 2251 项、site:guard 全链、eslint 全绿 |

含 main 之外独立提交的分支保留为显式 archive surface：

| 分支 | tip |
|---|---|
| `archive/legacy-branch/gui-hierarchy-1` | `d213d5f` |
| `archive/legacy-branch/accept-pi-base-gui-2737c98-luna` | `385f18e` |
| `archive/legacy-branch/codex-arch-tool-read-1r1` | `a9aa6cd` |
| `archive/legacy-branch/accept-pi-bounded-site-1` | `5f3e1ca`；原为已失效 remote `mainrepo` 的 tracking ref，冻结时救回 |

提交已全含于冻结 SHA、已删除 ref 的分支，仅留名称与 tip 备查：

| 分支 | tip |
|---|---|
| `claude/tool-read-1` | `b5a8302` |
| `codex/accept-public-surface-real-1-v2` | `5187c79` |
| `codex/accept-site-motion-natural-growth-1` | `7788e67` |
| `codex/accept-site-public-surface-proof-1` | `adc239c` |
| `codex/site-motion-natural-growth-1-cr1` | `dc3da86` |
| `codex/site-motion-natural-growth-1-r1` | `6393eba` |
| `codex/site-motion-natural-growth-1a` | `7151c20` |
| `codex/site-motion-natural-growth-1bc` | `e4bc151` |

余下三条 `mainrepo/*`（`13415e4`、`7064dd8`、`0b05743`）均含于冻结 SHA，其 tracking ref 已清理。具体历史由 Git 回答，此处只作索引。

消费方式为 inspect → extract → re-admit → implement。冻结件是证据与来源，不取得继承权；不因某项已存在于 Courtwork 而免除在 SE 中重新论证与实现。`mvp/execution/` 下各批次记录中的 Courtwork 路径是当时实际消费的记录，保持原样不改写，即使其后失效。live index 必须解析到稳定 provenance，historical execution record 保留当时事实。[PT7](../pre-takeover-roadmap.md) 的 provenance 门只核验 candidate 当前消费的资产，不要求历史施工记录仍可直接执行。

## Courtwork

| ID | 来源 / 类型 | 可支持的消费 | 不能外推 |
|---|---|---|---|
| L01 | 当前基线 `archive/courtwork-pre-takeover:docs/status/current.md:13`；状态文件，文内更新至 2026-08-18 | Pi/Tauri/Rust/sidecar 与 GUI 已有装配经验，但记录明确保留真实链验收缺口；用于 RD-001 成本与失败样本选择 | 不是 SE 当前实现；历史测试通过不证明 Work Agent product-live |
| L02 | 实现就绪图 `archive/courtwork-pre-takeover:docs/architecture/implementation-readiness.md:7`；原项目开工依赖 | 借鉴能力成熟度与开工条件分开，供手动治理 loop 使用 | 不接管其工单、旧优先级或架构权限 |
| L03 | GUI 方向研究 `archive/courtwork-pre-takeover:archive/research-gui-design-direction-2026-07-28.md:38`；历史调研 | GUI primitives 与 Core 状态责任分离，供 RD-003 比较 | 对库的历史评价不等于当前版本验收 |
| L04 | OpenWork 对照 `archive/courtwork-pre-takeover:archive/benchmark-openwork-2026-07-26.md:3`；2026-07-26 源码分析，文内指 tip 1f41a52 | 区分产品壳与外包 runtime；历史审批旁路作为待注入反例 | 标题“实测”不能替代运行证据；不声称当前 OpenWork 仍有相同问题 |
| L05 | Pi host loop inventory `archive/courtwork-pre-takeover:archive/research-pi-host-loop-inventory-2026-07-30.md:72`；历史源码研究 | 裸 agent-core 与宿主持久化、协作式取消边界；供 RD-001 | 不外推新 SDK 层仍有同样缺口 |
| L06 | Dossier ADR `archive/courtwork-pre-takeover:docs/decisions/ADR-021-dossier-work-semantics.md:38`；原项目契约 | 来源、冲突、裁决、版本化工作包，供 Core/Evidence 设计 | 原项目 Accepted ADR 不自动成为 SE 采纳决定 |
| L07 | 垂类包编写 `archive/courtwork-pre-takeover:docs/architecture/vertical-package-authoring.md:27`；规范 | descriptor/schema/renderer/fixture/验收与 catalog-only 边界 | 有 manifest 或预览不证明 Extension E2E |
| L08 | Legal SPEC `archive/courtwork-pre-takeover:packages/legal/SPEC.md:117`；契约/历史记录 | system anchor、citation binding、未覆盖与 pending 的阻断条件 | 不能推出法律正确性、真实文档兼容或其他领域泛化 |

解析方式：在 Courtwork 仓内 `git show <上表路径>`。Courtwork 的用途是已有工程经验与失败材料。保留可迁移的不变量；其六段 harness、旧产品功能取舍和完整治理票据不整体移植。尤其不因已有 Rust/桌面装配而直接冻结新项目语言。

## Career kit

Career kit 是求职研究和归档库，不是另一套已运行 Work Agent。下列定位只用于领域机制，不消费个人求职身份和私密评价。

| ID | 来源 / 类型 | 可支持的消费 | 不能外推 |
|---|---|---|---|
| L09 | [法律 AI 材料（历史路径：`</Users/lesprivilege/Projects/career-kit/20-投递/垂类/君合律师事务所-产品经理-法律AI方向/弹药库.md:1321>`）](../migration/2026-09-08/evidence-index.md)；垂类研究 | 原件、claim、证据、Review 与工作包，形成 RD-003 样本候选 | 不是法律意见或实际客户验收 |
| L10 | [ATS 材料（历史路径：`</Users/lesprivilege/Projects/career-kit/20-投递/垂类/BOSS直聘-ATS测评产品经理/弹药库.md:562>`）](../migration/2026-09-08/evidence-index.md)；垂类研究 | 对象 identity、状态转换、actor/reason/version；作为第二责任结构 | 不证明生产招聘公平性、业务效果或系统实际能力 |
| L11 | [Agent 规则策略（历史路径：`</Users/lesprivilege/Projects/career-kit/20-投递/垂类/拼多多集团/产品经理-Agent规则策略-上海/弹药库.md:359>`）](../migration/2026-09-08/evidence-index.md)；垂类研究 | 规则/模型/人工分流、例外、owner、回滚；用于 activation 与失败用例 | 不把研究描述写成企业生产实践或普遍有效策略 |
| L12 | [AlphaGPT 调研（历史路径：`</Users/lesprivilege/Projects/career-kit/_archive/垂类-历史JD-2026-07-13/iCourt(新橙科技`）](../migration/2026-09-08/evidence-index.md)/资深产品经理-诉讼AI-北京/产品实测调研-AlphaGPT具体功能与2026路线图.md:1>)；公开资料整理 | 正文说明未亲自试用；只用作产品问题和外部来源线索 | 标题“实测”不提供实测证据；产品指标需回原来源重查 |
| L13 | [小模型与 Harness（历史路径：`</Users/lesprivilege/Projects/career-kit/_archive/垂类-历史JD-2026-07-13/调研-企业垂类Agent小模型与Harness.md:5>`）](../migration/2026-09-08/evidence-index.md)；历史归档 | 受控工具、校验、错误分层与评测候选 | 场景/测试数字为历史声明；demo/goldset 不证明长期效果 |

## 在 SE 中如何别裁

| 已召回内容 | 落入位置 | 当期处置 |
|---|---|---|
| 正式版本、证据与裁决 | core-contracts / RD-002 | 作为设计候选与反例，尚未采纳具体代码 |
| 宿主 loop、取消、持久化与 GUI 对照 | options / RD-001 | 与当前上游重新比较，避免重复造轮子 |
| 法律、ATS、规则的不同责任结构 | RD-003 / R4 | 先选一个个人 demo，其他保留对照，不扩大首版范围 |
| 独立验收、当前事实与开工图 | governance / current / roadmap | 借工作方式，不复制原工程工单 |

若后续需要证明历史测试确实通过，必须回到原 ACCEPTANCE、目标版本、命令与完整日志核查；此索引不替代该步骤。外部产品结论使用原始外链与当前版本，不能只引用本地二手整理。
