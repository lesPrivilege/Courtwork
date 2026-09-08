# Courtwork legacy recall index

状态：只读召回入口，`reference not authority`。本索引在 2026-09-08 复核；冻结对象为
`f9ade85b72e5abcdc64c3a6c43ed3a13a2292476`。`archive/courtwork-pre-takeover` 只是发现入口，
不是权威锚点；使用者必须按下表的完整 SHA 和路径读取。

当前工程事实与决策只认当前 `Courtwork` 的 `main`（接管提交
`d20fbc3c9da983e1e7620fc28274fdebf51cbd4d`）、`AGENTS.md`、`engineering/current.md`、对应
contract/SPEC/ACCEPTANCE 及新证据。旧完整工作树、未跟踪/ignored 个人内容和旧代码均不在本索引
范围内；不执行冻结代码，不从旧源推断采纳（ADOPT）、product-live、当前发布或外部兼容。

在当前 Courtwork 仓根读取（仅只读）：

```sh
git show f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:<path>
git ls-tree f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:<parent-path>
```

本仓的 `engineering/ecosystem/local-sources.md` 已登记同一冻结锚点及 L01–L08
历史入口；下表复用这些定位并补充按需召回的品牌、fixture、UX 和发行材料，不另开状态 ledger。
表中“未知/未验”必须在当前合同与独立证据中重新核对，不能静默升级为结论。

| ID | 固定来源（完整 SHA + 仓内真实路径） | 可按需召回 | 边界、未知/未验 |
|---|---|---|---|
| L01 | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:docs/status/current.md`（local-sources L01） | 追查旧版产品 live、包/契约、demo、外部兼容、发行与遗留门的原始状态记录；按章节找失败或未闭合项。 | 历史状态快照，内部含多次时间点和已变动措辞；不能证明当前 `Courtwork` 或任何 product-live 能力。 |
| L02 | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:docs/architecture/implementation-readiness.md`（local-sources L02） | 召回 `product-live`、`package-ready`、`demo-integrated`、`contract-only`、`external-validated`、`released` 的证据边界，以及“released 不晋级 product-live”的治理不变量。 | 这是旧版开工图；能力现状和制品只认当前基线，条目中的依赖顺序、票面与日期均需重查。 |
| L03 | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:archive/research-gui-design-direction-2026-07-28.md`（local-sources L03） | 对照 GUI primitive、stream/Stop、scroll ownership、tool proposal、授权、overlay/focus、恢复态，以及“机制成熟”和视觉设计分开评审的 UX 取舍。 | 历史研究与外部坐标会漂移；不等于当前依赖、当前 UI 验收或指定视觉稿，不能据此直接实现或采纳。 |
| L04 | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:archive/benchmark-openwork-2026-07-26.md`（local-sources L04） | 对照产品壳、外包 runtime、审批旁路和历史实现分层，作为架构/UX 反例检索入口。 | 文内“实测”标题不能替代可复现实验；源码 tip、许可证和 OpenWork 当前行为均需重查，不代表当前本地实现。 |
| L05 | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:archive/research-pi-host-loop-inventory-2026-07-30.md`（local-sources L05） | 召回 host/sidecar wire、seq/lifecycle、tool proposal/result correlation、journal、取消、预算和 `pi-agent-core` 无持久化/恢复原语等架构与失败边界。 | 是冻结时的源码研究与反例清单；版本、坐标和依赖可能已漂移，未证明新实现、真实 provider 或 crash/restart 全链。 |
| L06 | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:docs/decisions/ADR-021-dossier-work-semantics.md`（local-sources L06） | 召回 container/session 分界、单一 Dossier compiler、两个 Work adapter、来源冲突 manifest、CAS、预算与 fail-closed 语义。 | 旧 ADR 的 Accepted 状态不赋予当前实现继承权；文内明确有未实现/后置链路，普通 Chat 排除，必须逐条对照当前 contract。 |
| L07 | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:docs/architecture/vertical-package-authoring.md`（local-sources L07） | 召回垂类包的 descriptor、schema、renderer、fixture、catalog-only 与验收边界，作为包 ABI 研究入口。 | 规范与示例不证明 Extension E2E、宿主装配或生产数据成立；旧目录结构和票面不自动适用于当前实现。 |
| L08 | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:packages/legal/SPEC.md`（local-sources L08） | 召回 Legal 的 system anchor、citation binding、coverage/pending 阻断与领域编译边界；只在需要法律样本机制时读取。 | 不能推出法律正确性、真实文档兼容、真实模型质量或其他垂类泛化；`official`/`pending` 等状态须回当前证据复核。 |
| R09 | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:docs/design/icon.md` | 召回品牌母题“线 + 文”、512 源稿、浅/深图标关系、小尺寸变体登记，以及品牌 mark 不消费风险语义色的规则。 | 文档把 SVG 源稿称为品牌几何真源，但这是冻结历史设计约束；不等于当前资产已通过验收，也不授权创建新母题或颜色。 |
| R10 | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:docs/design/tokens.json` | 召回 token 机器真值的版本/日期、冷白/藏青浅宗、铅黑/冷灰深宗、语义色与 provenance 双轨，用于精确视觉回归对照。 | 冻结文件元数据为 `1.5.0`（2026-08-23）；token 值可能已变化，单看 token 或对比图不能证明组件、对比度、主题或当前品牌验收。 |
| R11 | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:site/craft-evidence/SKIN-B1/ACCEPTANCE.md` | 召回品牌换色批的独立驳回、site guard fixture 漂移、旧锚回注未触红、AA 数值不符及后续复验阻断，作为失败证据样本。 | 这是特定旧实现/基线的验收记录；失败模式可供设计测试借鉴，但不证明当前树仍有同一缺陷，也不证明后来清账完成。 |
| R12 | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:packages/pi-lane/fixtures/product-wire-v1.jsonl` | 召回 bootstrap、prompt/cancel、host request/result、read/write、denied/uncertain/failed、budget terminal 等确定性 wire 边界，构造协议负例或恢复测试。 | 是 JSONL fixture，不是运行时日志；provider、模型和 key 均为样例标记，未证明真实网络、真实模型或 UI 行为。 |
| R13 | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:packages/pi-lane/fixtures/write-session-journal-v1.jsonl` | 召回 `session_started`、`tool_proposed`、授权、effect start/success 及其 operation/hash/path 关联，用于 journal 与写入授权链的最小反例。 | 仅覆盖冻结仓提交的样例事件序列；不等于完整 crash/restart、并发、跨 container 隔离或当前 journal schema。 |
| R14 | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:eval/src/dataset-schema.test.ts` | 召回 eval case 的 `id/scenario/task/expectedAnswer/scoringRules/sourceRefs` 最小结构、S3/S4 取值、强制溯源和未知规则拒绝。 | 单元测试只证明 schema 判定；不证明数据集事实、评分器质量、mock 以外的 provider 或正式模型回归门禁。 |
| R15 | `f9ade85b72e5abcdc64c3a6c43ed3a13a2292476:release/ACCEPTANCE.md` | 召回 v0.1.2 release truth、DMG/SHA 对齐、真实 href 计数、guard 反例、Pages/挂载复核及 ad-hoc/未公证边界。 | 旧发行与后置验收记录，不是当前发布授权或当前远端状态；`codesign`/DMG 完整性不能推出 notarization，任何 release claim 都要回当前证据。 |

使用规则：先按问题读取最小条目，再把可迁移的不变量与当前 contract/测试/证据逐项对账；保留“未知/未验”状态直到有新证据。不得复制冻结源码或把本表当作当前实现、架构裁定、产品 acceptance、ADOPT 清单或发布 ledger。
