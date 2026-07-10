# SPEC: packages/schemas（W1）

状态：已完成

## 职责

全仓库的契约根。定义领域 artifact 的 TS 类型 + JSON Schema + 运行时校验器。零运行时依赖（校验器可用 zod）。

## 交付清单

- `SourceAnchor`：来源引用锚（fileId + page + bbox/文本区间）。一切可溯源交互的地基，所有 artifact 的引用字段必须用它。
- `CaseFile`：案件档案——卷内文件清单、文书类型分类、摄取状态。
- `Timeline`：事件时间线——事件、日期（含模糊日期表达）、当事人关联、SourceAnchor[]。
- `PartyGraph`：当事人关系图谱——节点（主体：自然人/法人，含别名数组，服务实体对齐）、边（关系类型 + 证据 SourceAnchor[]）。
- `RiskList`：风险清单——风险点、等级、依据（法条/判例引用 + SourceAnchor）、处置状态（待确认/已确认/已否决）。
- `ReviewMatrix`：矩阵审阅——行=文档、列=问题、格=答案+SourceAnchor[]+置信标记。
- `RevisionEvent`：schema 级修正事件——谁、对哪个 artifact 的哪个字段、原值/新值、时间。反馈标注的统一载体，设计时假设它未来直接进训练管线。
- `RevisionInstructionSet`（2026-07-09 由 W4 提案，架构拍板通过）：修订指令集——驱动 packages/output 产出带 Word 原生修订痕迹与批注的 .docx。每条指令 = 定位（文本锚/表格单元格/表格行，判别联合）+ 操作（替换/插入/删除/纯批注，判别联合）+ 可选批注（含依据引用，依据引用要求 sourceAnchors 与 statuteRef 结构化法条引用至少一项，纯散文引用不可核验故不允许）。
- `FileOpsPlan`（2026-07-10 F-4，权威规格 docs/47 已拍板）：卷宗整理计划 artifact。条目 = `{id, verb(move|rename|copy|mkdir), sourcePath?, targetPath, reason, selected, contentHashBefore?, contentHashAfter?, originalFileName?}`。**销毁级动词不在枚举内**（类型层证明）。`CaseFile` 条目同步增量 `originalFileName?`/`contentHash?`（原件移形留痕）。

## 验收

每个 schema：合法样例 ≥3、非法样例 ≥3 的校验测试；导出 JSON Schema 文件供 Python 侧（services/ingest）校验复用。

**JSON Schema 导出路径（正式契约）**：`packages/schemas/json-schema/<Name>.schema.json`（`SourceAnchor` / `CaseFile` / `Timeline` / `PartyGraph` / `RiskList` / `ReviewMatrix` / `RevisionEvent` 共 7 个文件），由 `pnpm --filter @courtwork/schemas run generate:json-schema` 生成并提交进 git，Python 侧无需装 Node 工具链即可直接读取静态文件。每个文件自包含：引用的子 schema（如 `SourceAnchor` 出现在 `Timeline`/`PartyGraph`/`RiskList`/`ReviewMatrix`/`RevisionEvent` 里）以内联方式展开，不使用跨文件 `$ref`。`src/json-schema-drift.test.ts` 在测试套件里重新生成并与已提交文件 diff，zod 源变更后忘记重新生成会导致该测试报红。

**已知限制**：`z.toJSONSchema()` 只能表达结构性约束（类型、必填、枚举、min/max、pattern），无法表达 `.refine()` 的跨字段业务规则。因此导出的 JSON Schema 校验力度弱于 zod 源：`SourceAnchor` 的"bbox/textRange 至少一个"与"bbox 存在时 page 必填"这两条规则、`RevisionInstructionSet` 的 Citation "`sourceAnchors` 与 `statuteRef` 至少一个"规则，都不会出现在导出文件里。Python 侧如果需要这类规则的等效保证，需要在 ingest 自己的校验代码里补，或接受这里的校验只覆盖结构正确性、不覆盖业务规则正确性。这是任何 zod→JSON Schema 转换方案的固有限制，不是实现疏漏。

## 纪律

改任何已发布 schema = breaking change，需在本文件记录变更与受影响消费方。

## TODO（跨层放入区）

- [已解决 2026-07-09] ~~文书起草/修订指令集产物类型待 W4 提案~~——`RevisionInstructionSet` 已落地（`src/revision-instruction-set.ts`），`ArtifactTypeEnum` 已扩展。`packages/registry` 的 S4 声明与内置场景测试已由 W4 同步更新（架构显式授权的跨层同步，见 `packages/registry/SPEC.md`）。
- 矛盾清单（`ContradictionList`，供 S1 卷宗阅卷使用）产物类型待 W3 spike 结论后定。合入前 `packages/registry` 的 S1 声明不含矛盾清单产出。
- [观察，非缺陷，2026-07-10 W6 core 会话记录] 信源等级（A/B/C，docs/20）当前不是 `RiskBasis`/`Citation` 的字段——等级判定与传播走 `packages/core` 自己的事件流协议（`artifact_produced` 事件携带的 `evidenceGrades` 投影），不落进本包定义的 artifact 本体（架构已确认此方案，理由见 `packages/core/SPEC.md` 验收记录判断点 3）。若未来 W9 需要跨 session 持久化的信源等级角标（当前会话内的事件流回放已够用，跨 session 是否需要尚不确定），可能需要给 `RiskBasis`/`Citation` 加可选的 `evidenceGrade` 字段——按本文件"嵌入形状归 schemas、映射归 core"的既有原则（见 CLAUDE.md），这类字段需要走本包提案与架构拍板，不由消费方单方面加。

## 验收记录

- 2026-07-09：W1 完成。七个 schema（SourceAnchor / CaseFile / Timeline / PartyGraph / RiskList / ReviewMatrix / RevisionEvent）的 TS 类型 + zod 校验器 + JSON Schema 导出全部交付。`pnpm test` 全绿（57 用例：7 个 schema 各 7 条 + RevisionEvent 8 条 + drift 测试 7 条），`pnpm lint` 无 error，`pnpm -r run build` 通过。全部在移除 node_modules 后的干净环境重新 `pnpm install` 复核过，非增量安装的残留假绿。
  - 设计取舍：
    - `SourceAnchor.textLayerVersion?`：为未来 OCR 重跑导致 `textRange` 偏移失配预留的版本标记字段，由 ingest（W8）填写；现在加是一个字段的成本，以后加是全量数据迁移的成本。
    - `SourceAnchor.quote?`：展示/重锚定辅助，非权威定位器，权威定位只认 `bbox`/`textRange`（已在 JSDoc 中注明）。
    - `SourceAnchor` 校验规则：`bbox`/`textRange` 至少一个；`bbox` 存在时 `page` 必填（这两条只在 zod 侧生效，JSON Schema 导出无法表达，见上方"已知限制"）。
    - `CaseFile.documentType` / `PartyGraph.relationType`：故意用开放字符串而非枚举——真实分类/关系体系是 ingest 分类器（W8）与产品侧后续决定的，此处提前锁定会在体系调整时构成 breaking change。
    - `RevisionEvent.fieldPath` 用 JSON Pointer（RFC 6901）而非任意字符串，使训练管线可程序化重放/应用修正；额外保留 `reason?`/`sourceAnchors?`/`caseId?` 三个 SPEC 字面之外的可选字段（训练信号与按案件切分/脱敏的需要）。
  - 工具链决定：
    - `typescript` 固定 `^6.0.3`，未跳最新的 `7.0.2`（TypeScript 原生 Go 编译器重写版）：`typescript-eslint@8.63.0` 的 `peerDependencies` 目前是 `typescript >=4.8.4 <6.1.0`，装 TS7 会破坏类型感知 lint。后续任何一层升级 TypeScript 前应先核实 typescript-eslint 的兼容范围。
    - `@types/node` 必须声明在**实际使用 `node:*` 内置模块的包自己的** `package.json` 里，不能只放根 devDependencies——pnpm 的严格 node_modules 隔离只把一个包自己声明的依赖链接进它自己的 `node_modules`，根 devDependencies 对叶子包不可见。`typescript`/`vitest`/`tsx`/`eslint` 这类提供 CLI 二进制的包不受影响（pnpm 的 `.bin` 链接是 workspace 级别的），只有像 `@types/*` 这样纯类型、无二进制的包才有这个陷阱。后续任何一层如果直接用 `node:fs`/`node:path` 等内置模块，记得在**那个包自己的** `package.json` 里加 `@types/node`，并在其 `tsconfig.json` 里显式 `"types": ["node"]`（不要依赖自动 `@types` 发现，实测在当前 pnpm + TS 组合下不可靠）。
  - 跨层动作：已在 `services/ingest/SPEC.md` 的 TODO 区留言，指向 JSON Schema 导出路径与生成命令。
- 2026-07-09：W4（packages/output）在 spike 结论确定管线走"直接著录式"架构后，按本文件 TODO 提案 `RevisionInstructionSet`，经架构拍板通过合入。第 8 个 schema：TS 类型 + zod 校验器 + JSON Schema 导出 + 10 条合法/非法样例测试全绿；`pnpm test`（178 用例）、`pnpm lint`、`pnpm -r run build` 全部通过。
  - 设计取舍：
    - `RevisionInstruction` 用 `discriminatedUnion('kind', ...)`（replace/insert/delete/commentOnly）而非单一 object + 可选字段：`text` 只在 replace/insert 有意义、`annotation` 只在 commentOnly 必填，判别联合让 TypeScript 在编译期而非运行期挡住这类错配，延续 `Timeline.EventDate` 已建立的模式。
    - `InstructionLocator` 同样是判别联合（text/tableCell/tableRow）：spike 阶段用真实合同验证过表格场景（付款进度表）是常态需求，不是过度设计。
    - `Citation.sourceAnchors` 不像 `RiskBasis.sourceAnchors` 那样 `min(1)` 强制——引用法条本身是对外部权威文本的引用，不天然挂在已入卷文件上。但纯散文引用不可核验（`docs/20`："不许让 C 级事实未经确认流入 docx 批注依据"），故加 `statuteRef?`（结构化法条引用，供 `packages/tools` 的 cite-check 核验存在性）+ refine：`sourceAnchors` 与 `statuteRef` 至少一项非空。`StatuteRef.law`/`article` 用开放字符串而非枚举/子字段拆分——同 `CaseFile.documentType` 的设计取舍，法律体系变动不应构成 schema breaking change。
  - 跨层动作：`packages/registry/scenarios/S4.yaml` 的 `outputArtifacts` 与 confirmationGate、`packages/registry` 内置场景测试已由本次改动同步更新（架构显式授权，见对话记录）；`packages/registry/SPEC.md` 对应 TODO 已清。
- 2026-07-10：W6.2 整改（sol 审阅裁决，见 `packages/core/ACCEPTANCE.md`）——`RevisionEvent` 增加可选字段 `sessionId?`（`src/revision-event.ts`）。纯增量，不改变任何既有必填字段，不破坏历史数据与既有测试。受影响消费方：`packages/core`（唯一读写 `RevisionEvent` 的运行时消费方）——core 的 `RevisionEventStore.record()` 落盘路径在 schema 校验之上强制要求 `sessionId` 存在，缺失即拒绝写入（schema 层的"可选"与 core 落盘契约的"必填"是两层不同强度的约束，行为定义在 `packages/core/SPEC.md`）。`pnpm --filter @courtwork/schemas run generate:json-schema` 已重新生成，drift 测试通过。
- 2026-07-10：W6.2 整改（同上）——`RevisionInstructionSet` 的 `Citation` 增加可选字段 `evidenceKey?`（`src/revision-instruction-set.ts`）。纯增量。受影响消费方：`packages/core`（`compileConfirmedRiskListToRevisionInstructions` 编译期签发；门禁函数消费）。`pnpm --filter @courtwork/schemas run generate:json-schema` 已重新生成，drift 测试通过。
- 2026-07-10：W3.0 阅读视图工单（`packages/reading-view` 前置依赖，架构当场拍板通过，见对话记录）——`IngestStatusEnum` 增补字面量 `needs_ocr`（`src/case-file.ts`）。语义：文件可读但无可提取文本层（扫描件/纯图片），是预期内的能力边界声明（缺口三态"禁用态"的字段级体现），与 `failed`（异常/出错）语义不同，故不允许复用 `failed` 做有损投影。纯增量（追加一个枚举字面量），不改变任何既有取值与必填字段，不破坏历史数据与既有测试。新增 1 例合法样例测试（`needs_ocr` 状态）。`pnpm --filter @courtwork/schemas run generate:json-schema` 已重新生成，`json-schema-drift.test.ts` 通过，diff 仅 `CaseFile.schema.json` 的 `ingestStatus` 枚举数组新增一项。受影响消费方核对：全仓 `ingestStatus`/`IngestStatus` 引用仅命中 `packages/schemas` 自身（定义+测试）与 `packages/core/src/acceptance/run-s3-demo.ts` 一处硬编码字面量 `'done'`（非穷尽 switch，不受影响）；`packages/registry`/`packages/demo-data`/`apps/desktop` 均未引用该枚举，无需同步。此增量落地后 `packages/reading-view` 的 `ReadingViewOutcome → CaseFileEntry` 投影 helper 从第一天起就是无损映射，不带占位/道歉性质的 JSDoc。
- 2026-07-10：S-1 微工单（`packages/core/SPEC.md` TODO 区，架构拍板 2026-07-10）——`TimelineEvent` 增加可选字段 `markers?: string[]`（`src/timeline.ts`），JSDoc 注明当前词表仅 `"contradiction"`，词表将随 `ContradictionList` 类型正式落地后收编（沿用 `CaseFile.documentType`/`PartyGraph.relationType` 已建立的"开放字符串而非枚举"设计先例，避免词表扩展时构成 breaking change）。纯增量，不改变任何既有必填字段；新增 4 例合法/非法样例测试（含"markers 缺省仍合法""markers 内空字符串非法""markers 非数组非法"）。`pnpm --filter @courtwork/schemas run generate:json-schema` 已重新生成，`json-schema-drift.test.ts` 通过，diff 仅 `Timeline.schema.json` 新增 `markers` 一处结构。受影响消费方核对：`packages/demo-data`（`data/artifacts/timeline.json` 已按 `case-bible.md` 第六节矛盾点权威映射为 8 个事件补 `markers` 字段，详见其 `manifest.md` 变更记录）——用改动后的 `TimelineSchema` 与导出的 `Timeline.schema.json` 双重重新校验通过；`packages/core`（`scenario-executor/artifact-schemas.ts` 直接复用 `TimelineSchema` 做运行时校验，字段可选故无需改动）；`apps/desktop`（`src/demo/recordings.ts` 将 `timeline.json` 整体透传进 `SessionEvent`，无解构/精确字段断言，未受影响）——`pnpm --filter '!@courtwork/eval' -r run build`（7/7 非 eval 包，含 core 与 desktop）复核通过。UI 侧改为消费 `markers`（替代此前 description 文本匹配"矛盾"二字的做法）留给 polish 承接，不在本次范围。
- 2026-07-10：F-4（docs/47 文件操作分级已拍板 + 工单任命）——新增 `FileOpsPlan` schema + `ArtifactTypeEnum` 字面量 `FileOpsPlan`；`CaseFile` 条目增量 `originalFileName?`/`contentHash?`。JSON Schema 已生成（`FileOpsPlan.schema.json`），drift 通过。动词封闭集 `move|rename|copy|mkdir`，delete/overwrite 在类型与 JSON Schema 双重拒绝。受影响消费方：`packages/registry` S6、`packages/tools` 执行器、`apps/desktop` 计划表 UI。
- 2026-07-10：S-2 微工单（`docs/11-会话唤醒prompt.md`，架构拍板 2026-07-10，S-1 同构复刻）——`PartyEdge` 增加可选字段 `markers?: string[]`（`src/party-graph.ts`），JSDoc 措辞对齐 `TimelineEvent.markers`：当前词表仅 `"contradiction"`，词表将随 `ContradictionList` 类型正式落地后收编。纯增量，不改变任何既有必填字段；新增 4 例合法/非法样例测试（含边、"markers 缺省仍合法""markers 内空字符串非法""markers 非数组非法"）。`pnpm --filter @courtwork/schemas run generate:json-schema` 已重新生成，`json-schema-drift.test.ts` 通过，diff 仅 `PartyGraph.schema.json` 新增 `markers` 一处结构。受影响消费方核对：`packages/demo-data`（`data/artifacts/party-graph.json` 已按 `case-bible.md` 第六节矛盾点清单权威核对，为 `e-14`（对应矛盾点2）、`e-15`（对应矛盾点4）两条边补 `markers` 字段，详见其 `manifest.md` 变更记录；矛盾点1/3 是文书内容冲突不体现为 `PartyGraph` 边，已由 S-1 的 `timeline.json` markers 覆盖）——用改动后的 `PartyGraphSchema` 与导出的 `PartyGraph.schema.json` 双重重新校验通过，全部 15 条边校验通过；`packages/core`（`scenario-executor/artifact-schemas.ts` 直接复用 `PartyGraphSchema` 做运行时校验，字段可选故无需改动）；`apps/desktop`（`src/workbench/GraphPanel.tsx` 此前已实现 `hasContradictionMarker` 消费逻辑——P-3 图谱建设时即拒绝按 `relationType` 文案/边 ID 猜测矛盾边，改用 `PartyEdge & { markers?: string[] }` 类型断言绕过当时 schema 缺该字段的空档；本次增量落地后该断言成为冗余代码，已按工单授权的"一行实现级适配"简化为直接读 `edge.markers`，语义等价、不改变任何运行时行为，独立 commit `refactor(desktop): drop redundant PartyEdge markers cast`）。矛盾边计数验证：Playwright 无头浏览器实测 `graph-panel` 的 `data-contradiction-count` 由 0 转正为 2（`e-14`/`e-15`），`data-edge-count` 保持 15 不变；核验脚本为一次性用例，未提交进仓库（与 S-1 对 `party-graph.json` 的 ad hoc 重校验方式一致）。`pnpm --filter '!@courtwork/eval' -r run build`（8/8 非 eval 包，含 core 与 desktop）、`apps/desktop` 自身 `pnpm test`（26 例）复核通过。
  - 操作事故与订正（如实记录，供后续会话参考）：`apps/desktop/src/workbench/GraphPanel.tsx` 当时存在另一并发会话（图标系统改造）未提交的改动（`Icon name="fit"`→`"scan-frame"`，与本工单无关）。为只提交本工单这一 hunk，先用 `git apply --cached` 精确暂存该 hunk 到 index，但随后执行的 `git commit -- <path>` 因带 pathspec 会以**工作区当前内容**而非 index 暂存内容为准，导致对方未提交的改动被一并录入 commit `48a1f1c`。按 `AGENTS.md`"永不重写共享历史"纪律未做 amend/rebase，改用 forward commit `abbe0e5`（`git apply -R --cached` 只作用于 index、不触碰工作区文件）把该行精确 revert 回 index 后提交，使对方改动在工作区中恢复"未提交"状态，如实交还。**教训**：`git commit` 携带显式路径参数时的语义是"以工作区当前内容重新 add 后提交"，而非"提交 index 中已暂存的该路径内容"——共享索引环境下若要精确提交某个 hunk，应先 `git apply --cached` 暂存，再用不带路径参数的裸 `git commit`（提交时 index 已只含目标改动），不可再于 `commit` 命令后附路径，否则会重新拉入工作区的全部改动。
