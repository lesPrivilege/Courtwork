# SPEC: packages/pm-schemas

状态：现行工单 `ABI-2B` 待实现。

## 职责

PM 第二垂类包。拥有反馈归集、PRD 评审、优先级计算与跨纪要行动项的 schema、presentation、词表和确定性计算；不得把 PM 语义放进 core、registry 或 desktop。

## ABI-2B · 唯一 Package ABI

权威：`docs/decisions/ADR-008-schema-conformance-and-authority.md` 与 `ADR-009-runtime-ports-and-harness.md`。

- 删除本包平行 `ArtifactDescriptor` 与只服务该 descriptor 的 view resolver；四类 artifact 全部进入 `PM_PACKAGE: VerticalPackageManifest` 的 descriptor/bindings 双平面。
- identity 为 `packageId=pm`、`version=0.1.0`、`schemaVersion=1`；四个逻辑 schema id 分别绑定现有 Zod schema。data plane 必须纯 JSON、可冻结、可生成 Draft 2020-12。
- 使用宿主 blueprint `courtwork.artifact-table.v1`。`collectionPointer` 从 artifact 根命中数组；字段 pointer 从每条 item 根命中，全部为 RFC 6901 JSON Pointer。枚举、状态、tags、grade 的 `valueLabels` 必须完整且禁止 wire fallback。
- 当期 `scenarios=[]`、`promptSegments=[]`、`interactionTemplates` 缺省；不得为展示完整度虚构 workflow、prompt 或 demo payload。
- FeedbackDigest、PrdReview、ActionItems 的主条目锚点，以及 PriorityScore 四参数的来源锚点，都必须进入 presentation；因为本单不提供 draft/citation binding，registry 必须阻止未来 scenario 把这些 final artifact 直接声明为模型输出。

## 验收

1. PM 与 Legal 同次准入，任一 PM 坏包隔离且不污染 Legal。
2. 删除旧 descriptor/view resolver 后全包无引用；不存在第二准入、第二词表或第二 renderer 真源。
3. 四个 schema binding、collection/field pointer 和 valueLabels 均由 golden/非法样例锁定；漏一枚枚举值、pointer 漂移、wire fallback、锚 artifact 无 draft 的 model-output scenario 必须实际变红。
4. PM package test/build、全仓 build/lint/test 通过；不修改 desktop UI。
