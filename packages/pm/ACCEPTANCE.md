# ACCEPTANCE: packages/pm

## PM-PACKAGE-RENAME-1 独立验收（2026-07-14）

验收对象：实现提交 `6f12d1b31cbd0e2f79a51ae579637ecd1c09be91`。验收在独立 clean worktree
`/tmp/courtwork-pm-package-rename-1-acceptance`、分支 `codex/accept-pm-package-rename-1` 完成，未使用实现
worktree 或共享 main。

### 结论

**PM-PACKAGE-RENAME-1 放行。** 目录、npm 名与真实 desktop consumer 已唯一迁为
`packages/pm` / `@courtwork/pm`；旧 npm import 失败，活动源码、workspace 与 lockfile 不再消费旧名。
`packageId=pm`、`identity.version=0.1.1`、`schemaVersion=1`、四个 `pm.*` id、payload、descriptor、
四份 JSON Schema、`scenarios=[]` 与 `promptSegments=[]` 均保持不变。

验收发现一个实现级小缺陷：临时创建第二个 `packages/pm-schemas` workspace 时，pnpm 9 的 frozen install
意外返回成功并向 lockfile 写入空 importer，不能独立承担“双目录禁止”门禁。已以
`fix-by-acceptance(pm): reject legacy package directory` 补入显式 metadata guard；该修复只检查旧目录不存在，
不修改包 ABI、schema、导出或跨层契约。

### 身份、消费与 rename-only 证据

| 验收项 | 结果 |
|---|---|
| 唯一目录 | ✅ `packages/*` 只有 `packages/pm`，新增 guard 锁定 `packages/pm-schemas` 不存在。 |
| npm import | ✅ 从 desktop 依赖图真实 `import('@courtwork/pm')` 得到 `pm / 0.1.1`；`import('@courtwork/pm-schemas')` 明确得到 `ERR_MODULE_NOT_FOUND`。 |
| desktop consumer | ✅ `apps/desktop/src/composition/package-runtime.test.ts` **1/1**；真实 composition 同次准入 `[legal, pm]`，PM artifact 可查询且 scenario 仍全属 Legal。 |
| 活动消费点 | ✅ apps/packages/eval（排除历史 SPEC/ACCEPTANCE）对旧 npm 名和旧路径零命中；desktop `package.json`、composition 与 lockfile 只使用新名。历史文档仅以“迁移前”语境保留旧名。 |
| lockfile | ✅ `apps/desktop` 依赖键为 `@courtwork/pm → link:../../packages/pm`，唯一 importer 为 `packages/pm`；最终 frozen install 无改写。 |
| blob 同一性 | ✅ 将当前 `packages/pm/src` 与 `json-schema` 逐文件映射到父提交 `packages/pm-schemas`，排除本单 metadata test 后 **18/18** blob 逐字节一致。Git 对四份 schema 与其余业务源码亦均识别为 100% rename。 |
| catalog-only | ✅ `identity={packageId:'pm',version:'0.1.1',schemaVersion:1}`；四 binding/type/schema id 不变；`scenarios=[]`、`promptSegments=[]`、interaction templates 缺省。 |

### 强制变异：实际变红后撤回

1. 把 desktop 活动 import 改回 `@courtwork/pm-schemas`：composition suite **1 failed / 0 tests**，明确无法解析旧包；撤回后 **1/1**。
2. 临时创建第二个 `packages/pm-schemas/package.json`：原 frozen install 未触红，确认守卫缺口；新增 metadata guard 后 **1 failed / 3 passed**，明确“双包共存”；删除旧目录后 **4/4**。
3. 把 lockfile 的 desktop 依赖名改回旧名：frozen install 以 `ERR_PNPM_OUTDATED_LOCKFILE` 拒绝，明确 package.json 为 `@courtwork/pm`；把 importer `packages/pm` 改回旧路径时同样以 outdated lockfile 拒绝。
4. 分别把 `package.json.name` 改为 `@courtwork/pm-drift`、version 改为 `9.9.9`：metadata 各 **1 failed / 3 passed**；把 descriptor packageId 改为 `pm-drift`：metadata + manifest **5 failed / 7 passed**，并触发 namespace 拒载。
5. 在非 metadata 的 `score-calc.ts` 注入一行注释：父/子 blob 比较在 **char 1780 / line 44** 明确失败；撤回后全量 **18/18** 同字节。
6. 把 `ActionItems.schema.json` 根 description 改写：JSON Schema drift **1 failed / 4 passed**；撤回并重生成后四份 schema 零 diff。

所有变异均已原样撤回；最终工作树只有验收 guard 与本报告。

### 最终工程门

- `pnpm install --frozen-lockfile`：全部 **14 workspace projects**，初始 clean 安装复用/落盘 **1047 packages**，lockfile 无改写。
- PM：**6 files / 39 tests**；Legal：**9 files / 73 tests**；desktop 真实 consumer：**1/1**。两垂类 lint/build 均通过。
- PM 与 Legal JSON Schema 均实际重生成；PM 四份提交态 schema 零 drift。
- `pnpm -r build`：**13/14 workspace projects** 全绿；desktop Vite **3520 modules transformed**，只有既有 dynamic-import/chunk-size warning。
- `pnpm lint`：exit 0；`pnpm test`：**122 files / 1085 tests**，exit 0；`git diff --check`：通过。
- clean install 后、全仓拓扑 build 前直接跑垂类测试时，两包都因 workspace registry/schemas 尚无 `dist` 而无法解析；按仓库标准先完成 `pnpm -r build` 后，以上定点与全仓结果稳定全绿。该前置对 Legal/PM 对称，不是 rename 回归。
- 本单不改变 desktop 行为或 UI，按 SPEC 不运行 Playwright。

### 放行边界

本结论只放行 PM 包路径/npm 名的机械迁移及其 metadata 防回归门。`VPKG-LAYOUT-1`、`PM-SCHEMA-1`、
PM scenario/prompt/runtime/testing 出口与新 UI 均未交付；不得因新包已被 desktop catalog consumer 导入而宣称
PM 执行链已经接通。

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
- 迁移前命令 `pnpm --filter @courtwork/pm-schemas generate:json-schema`：四文件重生成成功，随后 `git status` 无 drift；现行 npm 名为 `@courtwork/pm`。
- PM：**5 files / 33 tests**；registry：**4 files / 62 tests**；legal：**8 files / 70 tests**；schemas：**11 files / 90 tests**。四包合跑为 **28 files / 255 tests**。
- `pnpm -r build`：exit 0，12/13 workspace projects；desktop Vite **3507 modules transformed**，只有既有 dynamic-import/chunk-size warning。
- `pnpm lint`：exit 0，零 error。
- `pnpm test`：**118 files / 1034 tests**，exit 0。
- `git diff --check`：通过。实现无 UI 行为变化，按工单不运行 Playwright。

### 放行边界

本轮只放行 PM catalog、presentation、bindings、统一准入与 JSON Schema wire 契约。`courtwork.artifact-table.v1` 的真实 host renderer、PM scenario/prompt、模型 draft/citation 链和 desktop zero-wire fallback 仍属于后续 `VIEW-ABI-1`/垂类场景工单；不得把 catalog 准入表述成这些下游能力已经交付。

## VPKG-META-1 独立验收（2026-07-14）

**结论：放行。** 实现 `07c317ee4e01aacc160ccecb6541741c41849669` 把 PM `package.json.version` 对齐既有 descriptor release `0.1.1`，并补齐与 Legal 同体例的 metadata 门；`packageId=pm`、`schemaVersion=1`、四个 `pm.*` artifact、payload、descriptor、`scenarios=[]` 与 `promptSegments=[]` 均未变化。

- PM 定点：**6 files / 37 tests**；包内 lint、build、四份 JSON Schema 重生成通过且无 drift。
- 版本漂移反例：把 package release 改为 `9.9.9` 后，metadata 定点 **1 failed / 1 passed**，明确期望 descriptor `0.1.1`。
- 深层 remote-ref 反例：在 `ActionItems` 的 `$.properties.items.items.allOf[0].$ref` 注入远程 URL 后，drift 定点 **1 failed / 4 passed**，递归守卫精确拒绝；撤回后全绿。
- 与 Legal 合计的工程证据、另两类反例与全仓 **122 files / 1083 tests** 结果，见 `packages/legal/ACCEPTANCE.md` 的同名验收记录。

放行范围仅为 VPKG metadata 与 JSON Schema drift 门；PM 仍是 catalog-only，后续 rename/layout/export/runtime/scenario 不在本结论内。
