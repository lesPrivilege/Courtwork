# ACCEPTANCE: packages/pm-schemas

## ABI-2B 独立验收（2026-07-14）

验收角色：未参与 ABI-2B 实现的独立验收者。验收在 clean worktree `/Users/lesprivilege/Projects/Courtwork-worktrees/accept-abi-2b`、分支 `codex/accept-abi-2b` 完成；实现 tip 为 `7fc531a9008b667235d13a534da05a0c6081a3eb`，指定 baseline 为 `bb4919dc913d0b4fdc22ccf7e01c71b8675b7d5d`。

### 结论

**ABI-2B 放行。** PM 四类 catalog 已迁入 ABI-2A 建立的唯一 descriptor/bindings 准入与 JSON Schema 出口；未发现需要架构拍板的 schema、跨层接口、ADR 或验收标准问题，也未发现需要 `fix-by-acceptance` 的实现缺陷。范围没有触及 desktop UI、provider、core、场景执行语义或法律 schema。

### 契约矩阵

| 验收项 | 结果与证据 |
|---|---|
| 旧真源清零 | ✅ `descriptor.ts`、`descriptors.ts`、`view-resolver.ts` 已删除，根 barrel 与 clean build 产物不再导出旧 API；全仓生产搜索对 `pmArtifactDescriptors`、`resolveArtifactView`、`DescriptorVocabError`、`parseArtifactDescriptor`、`assertVocabCoversEnum` 零命中。PM 没有兼容 adapter 或第二准入/词表/renderer 真源；全仓唯一兼容重绑定仍是 ABI-2A 已验收的 `registry/package-registries.ts` 单点。 |
| 身份与 bindings | ✅ identity 精确为 `pm / 0.1.0 / schemaVersion 1`；bindings 恰含 `pm.FeedbackDigest`、`pm.PrdReview`、`pm.PriorityScore`、`pm.ActionItems` 四个逻辑 id，各绑定原有 Zod schema。descriptor 可 JSON 往返，准入结果递归冻结。 |
| catalog-only 与 blueprint | ✅ `scenarios=[]`、`promptSegments=[]`、`interactionTemplates` 缺省；未虚构 workflow、prompt 或 demo payload。四个 artifact 只使用 `courtwork.artifact-table.v1`，renderer 声明亦只有这一 blueprint。 |
| JSON Pointer 与按址收货 | ✅ collection pointer 从 artifact 根命中 `items/findings/rows` 数组，field pointer 从条目根命中；语法门严格接受 RFC 6901，拒绝 dot-path、`*` 通配符，准入再拒绝 collection 非数组或 field 不命中。四份合法 fixture 逐字段实取值通过。 |
| field-local labels | ✅ `enum/status/tags` 的 wire 集合均由绑定 schema 推导，`valueLabels` 必须精确完整、非空且无 schema 外键；`text/mono/number/anchor` 携 labels 直接拒载。PM 当前没有 grade presentation；通用 `grade` 与其余三类走同一闭集门。presentation 存在时不读取旧 artifact-level enum 词表，因此没有 wire fallback 路径。 |
| 锚点与模型写入边界 | ✅ FeedbackDigest、PrdReview、ActionItems 主条目 `/sourceAnchors` 均声明；PriorityScore 的 reach/impact/confidence/effort 四组来源锚均声明。任何 scenario 把含 `format: anchor` 的 artifact 列为输出时，缺独立 `draftSchemaId` 或 `citationBinding` 任一项即整包拒载；PM 当前因 catalog-only 正常准入。 |
| Legal 同宿主与隔离 | ✅ 使用真实 `LEGAL_PACKAGE + PM_PACKAGE` 同次准入，结果为 admitted `[legal, pm]`、rejected `[]`、warnings `[]`，四个 PM artifact 均可从统一 `artifactSchemas` registry 查询。把 PM 的 `community` label 删除后以 `[badPm, LEGAL_PACKAGE]` 准入，只有 `pm` 被拒，后到 `legal` 仍独立准入。 |
| 四份 JSON Schema | ✅ 提交态恰有四份文件；均为 Draft 2020-12，`$id` 分别是 `urn:courtwork:schema:pm.<Name>:v1`。递归扫描没有 remote `$ref`、`$dynamicRef` 或 `$recursiveRef`，实际生成结果当前不含任何 `$ref`，故文档自包含。严格 Ajv2020 在禁 coercion/default/removeAdditional 下、登记仓库既有注释关键字 `x-courtwork-invariant` 后四份均可编译。 |

### 强制变异：实际先红后撤

不采信实现自述，在验收 worktree 逐项破坏并每次原样恢复：

1. 删除 Feedback channel 的 `community` label：PM manifest 定向 **1 failed / 5 skipped**，明确报缺 `community`、禁止 wire fallback。
2. 把 PrdReview item pointer `/id` 漂移为 `/missing`：**1 failed / 5 skipped**，明确报 pointer 未命中 schema。
3. 给普通 `mono` 字段注入 `valueLabels`：**1 failed / 5 skipped**，明确报普通字段不得携 labels。
4. 临时移除 registry 的 anchor model-output 门禁：admission 定向 **1 failed / 32 skipped**，无 draft/citation 的 artifact 被错误准入，证明该门禁由测试真实锁定。

四项恢复后，PM manifest + registry admission 为 **2 files / 39 tests** 全绿，工作树无变异残留。

### JSON Schema 与工程门禁

- `pnpm install --frozen-lockfile`：13 个 workspace project、1047 个包，lockfile 无改写。
- `pnpm --filter @courtwork/pm-schemas generate:json-schema`：四文件重生成成功，随后 `git status` 无 drift。
- PM：**5 files / 33 tests**；registry：**4 files / 62 tests**；legal：**8 files / 70 tests**；schemas：**11 files / 90 tests**。四包合跑为 **28 files / 255 tests**。
- `pnpm -r build`：exit 0，12/13 workspace projects；desktop Vite **3507 modules transformed**，只有既有 dynamic-import/chunk-size warning。
- `pnpm lint`：exit 0，零 error。
- `pnpm test`：**118 files / 1034 tests**，exit 0。
- `git diff --check`：通过。实现无 UI 行为变化，按工单不运行 Playwright。

### 放行边界

本轮只放行 PM catalog、presentation、bindings、统一准入与 JSON Schema wire 契约。`courtwork.artifact-table.v1` 的真实 host renderer、PM scenario/prompt、模型 draft/citation 链和 desktop zero-wire fallback 仍属于后续 `VIEW-ABI-1`/垂类场景工单；不得把 catalog 准入表述成这些下游能力已经交付。
