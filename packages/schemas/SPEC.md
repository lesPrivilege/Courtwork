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

## 验收

每个 schema：合法样例 ≥3、非法样例 ≥3 的校验测试；导出 JSON Schema 文件供 Python 侧（services/ingest）校验复用。

**JSON Schema 导出路径（正式契约）**：`packages/schemas/json-schema/<Name>.schema.json`（`SourceAnchor` / `CaseFile` / `Timeline` / `PartyGraph` / `RiskList` / `ReviewMatrix` / `RevisionEvent` 共 7 个文件），由 `pnpm --filter @courtwork/schemas run generate:json-schema` 生成并提交进 git，Python 侧无需装 Node 工具链即可直接读取静态文件。每个文件自包含：引用的子 schema（如 `SourceAnchor` 出现在 `Timeline`/`PartyGraph`/`RiskList`/`ReviewMatrix`/`RevisionEvent` 里）以内联方式展开，不使用跨文件 `$ref`。`src/json-schema-drift.test.ts` 在测试套件里重新生成并与已提交文件 diff，zod 源变更后忘记重新生成会导致该测试报红。

**已知限制**：`z.toJSONSchema()` 只能表达结构性约束（类型、必填、枚举、min/max、pattern），无法表达 `.refine()` 的跨字段业务规则。因此导出的 JSON Schema 校验力度弱于 zod 源：`SourceAnchor` 的"bbox/textRange 至少一个"与"bbox 存在时 page 必填"这两条规则不会出现在导出文件里。Python 侧如果需要这两条规则的等效保证，需要在 ingest 自己的校验代码里补，或接受这里的校验只覆盖结构正确性、不覆盖业务规则正确性。这是任何 zod→JSON Schema 转换方案的固有限制，不是实现疏漏。

## 纪律

改任何已发布 schema = breaking change，需在本文件记录变更与受影响消费方。

## TODO（跨层放入区）

- [架构拍板 2026-07-09] 文书起草/修订指令集产物类型待 W4 提案（架构已拍板路径，见 `packages/output/SPEC.md` TODO：暂名 `RevisionInstructionSet`，含 `ArtifactTypeEnum` 增量扩展）；矛盾清单（`ContradictionList`，供 S1 卷宗阅卷使用）产物类型待 W3 spike 结论后定。两者合入前，`packages/registry` 的 S4 声明以 label-only 确认门禁过渡（不声明 outputArtifacts），S1 声明不含矛盾清单产出。

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
