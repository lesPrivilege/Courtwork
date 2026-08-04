# ACCEPTANCE: packages/registry（W2）

验收日期：2026-07-09  
验收角色：Codex（验收工程师）  
结论：**放行。`packages/registry` 已就绪供 W6（core）消费。**

## 实测记录

在本机从干净依赖环境复核，未采信实现会话自述：

- `find . -name node_modules -type d -prune -exec rm -rf {} +`
- `pnpm install`：通过
- `pnpm test`：通过，`86 passed (86)`，对应 schemas 57 + registry 29
- `pnpm lint`：通过
- `pnpm -r run build`：通过，`packages/schemas` 与 `packages/registry` 均 build 完成

## 验收清单

1. **干净环境验证：通过。** 重新安装依赖后，测试、lint、递归 build 全部 0 退出。
2. **ScenarioDefinitionSchema 字段与语义：通过。** 显式字段为 `id` / `name` / `trigger{fileTypes,userActions,classifierTags}` / `inputArtifacts` / `toolIds` / `outputArtifacts` / `uiTemplateId` / `confirmationGates` / `promptTemplateRef`，未新增 `priority`、`provider` 等契约字段。触发条件至少一维非空；`confirmationGates` 至少 1 个，`artifact` 可选且存在时必须属于 `outputArtifacts`；`toolIds` 仅做非空字符串与去重校验，无硬编码白名单。
3. **无平行枚举：通过。** artifact 类型校验直接 import `@courtwork/schemas` 的公开 barrel `ArtifactTypeEnum`；registry 包内未自定义产物类型枚举或清单。
4. **加载器：通过。** `parseScenarioYaml` 与 `loadScenarioFile`/`loadScenariosFromDir` 分离；YAML 语法错误和 zod 校验错误均包含 source label/文件路径与字段路径；目录加载按文件名顺序 fail-fast，并额外校验场景 id 跨文件唯一。
5. **查询 API：通过。** `findByTrigger` 为 fileType/userAction/classifierTags 跨维度 OR，返回注册顺序过滤结果，无额外排序或优先级；`list()` 可用并返回数组副本；有专门单测。
6. **四个内置场景连线：通过。** S1 `[] -> [CaseFile, Timeline, PartyGraph]`；S2 `[CaseFile] -> [ReviewMatrix]`；S3 `[CaseFile] -> [RiskList]` 且 `toolIds` 含 `party-verify`；S4 `[CaseFile, Timeline, PartyGraph] -> []`，使用 label-only 确认门禁，符合已拍板过渡方案。
7. **跨层 TODO 一致性：通过。** `packages/schemas/SPEC.md`、`packages/registry/SPEC.md`、`packages/output/SPEC.md` 对 `RevisionInstructionSet` 由 W4 在 schemas 提案、`ContradictionList` 待 W3 结论的口径一致。
8. **测试质量抽查：通过。** 非法样例覆盖并实际踩中校验规则：空 trigger、未知 artifact、gate.artifact 越界、空 confirmationGates、重复 toolIds、缺字段、YAML 语法错误、重复场景 id；断言不是空壳。
9. **工程决策尊重：通过。** 根 `typescript` 仍锁定 `^6.0.3`；registry 使用 `node:fs`/`node:path`，本包自己的 `package.json` 声明 `@types/node`，`tsconfig.json` 显式 `"types": ["node"]`。
10. **纪律与卫生：通过。** 未发现硬编码 provider、凭证或 API key；实现提交历史按 plan/scaffold/schema/loader/query/built-ins/TODO/完工记录分层；验收开始前 tracked 工作树干净，仅有忽略的 `node_modules`/`dist` 构建产物。

## 观察项

- `ScenarioDefinitionSchema` 未声明额外业务字段，满足 W2 的 9 字段契约。当前 zod object 对未知键采用默认行为（剥离而非报错）；若未来要求 YAML 声明中出现未知键必须失败，应作为契约收紧另行拍板。

## 修复记录

本次验收未发现需要 Codex 顺手修复的实现级 bug，未产生 `fix-by-acceptance` 提交。

---

# INTERACTION-1A 独立验收（2026-07-13）

验收分支：`codex/accept-interaction-1a`

实现提交：`61668f3`

合流基线：`main@c22fe1e`

结论：**放行。INTERACTION-1A registry/vertical 段可合入 main，供后续 core 交互状态机消费。**

## 契约复核

1. **模板形状与兼容性：通过。** `InteractionTemplateSchema` 精确限定 namespaced `id`、两种 `kind`、非空问题、非空且 option id 唯一的 strict options、显式 `skippable`、三态 `anchorPolicy` 与唯一 `question-card`；顶层和 option 的未知字段均拒绝。`VerticalPackageManifest.interactionTemplates` 保持可选，未声明模板的存量包不受影响。
2. **准入与 id 所有权：通过。** 非法 namespace、空/重复 options、非法 UI、包内/跨包重复均拒载；只有整包成功准入后才登记 template id，先到拒载包不会污染后到合法包。验收另补了该所有权反例。
3. **系统坐标边界：通过。** 模板内 `anchorRefs`、bbox、textRange（含 option 嵌套）均被 strict schema 拒绝；legal 声明未携带这些运行时事实。
4. **查询与不可变快照：通过。** registry 按 `packageId + templateId` 双键解析；装配时复制顶层、options 数组及 option 对象并逐层冻结。修改源 manifest 或尝试改写查询结果均不能污染已装配快照。
5. **垂类声明：通过。** legal 提供无锚 `single_choice` 与 required 锚点 `confirmation` 两枚最小真实语义模板，覆盖 `none` / `required`；未读取 demo-data，未写入样板案真值，UI 样式与运行时坐标没有进入垂类包。
6. **范围纪律：通过。** 实现差异只触及 `packages/registry` 与 `packages/legal`；`packages/core`、`apps/desktop`、PM 垂类包、ADR 均为零差异，未提前实现暂停续行或 renderer。

## 反例注入与修复

- 新增当前实现测试之外的反例：向准入边界注入 `interactionTemplates: [null]`。修复前定点实跑稳定红，报错为 `TypeError: Cannot read properties of null (reading 'id')`，证明 malformed manifest 会击穿拒载边界。
- 实现级修复提交：`d8e1a46 fix-by-acceptance: harden interaction template admission`。准入现在把非数组 `interactionTemplates` 与非对象 template 转为明确拒载结果；同时保留“拒载包不占 id”回归测试。未改变字段、语义或跨层接口。

## 最终实测

- 干净 worktree 执行 `pnpm install --frozen-lockfile`：通过，13 个 workspace project、1047 个包完成链接。
- 定点：`pnpm exec vitest run packages/registry/src/package-manifest.test.ts packages/registry/src/admission.test.ts packages/registry/src/package-registries.test.ts packages/legal/src/manifest.test.ts --reporter=verbose`：**4 files / 48 tests 全绿**。
- 全仓 `pnpm test`：**108 files / 882 tests 全绿**。
- 全仓 `pnpm lint`：通过，0 error。
- 全仓 `pnpm -r build`：通过，12/12 workspace build 完成；desktop Vite 仅保留既有 chunk-size warning，无失败。

## 下游放行

**允许合入 main。** 下游可开始 core 的请求解析、锚点校验、不可变 `interaction_requested` / `interaction_resolved` 事件与暂停续行；本验收不授权变更 ADR-007 的事件快照或回答语义。

---

# ABI-2A 独立验收（2026-07-14）

验收分支：`codex/accept-abi-2a`

实现提交：`3702f1a`、`db819b5`（实现 tip `db819b5a92bc8083e65b7beec455868777645fc9`）

验收修复：`c35ccb7 fix-by-acceptance(registry): reject remote dynamic schema refs`

结论：**放行。ABI-2A 的 descriptor / bindings 双平面、Legal 迁移与 Draft 2020-12 单向出口符合 ADR-001/008/009；一处远程动态引用守卫漏网已由验收补丁修复。**

## 契约复核

1. **data plane 与不可变快照：通过。** `VerticalPackageDescriptorV1` 只含 strict 声明字段；准入在解析前递归拒绝 function、symbol、bigint、非有限 number、循环、accessor、Zod/React-like 非普通对象，再由 V1 schema 克隆并递归冻结。源对象后改与调用方写入均不能污染已准入快照。
2. **runtime plane：通过。** `VerticalPackageBindings.schemas` 是按显式逻辑 `schemaId` 索引的 `ReadonlyMap<string, ZodType>`；final `schemaId` 与可选 draft `draftSchemaId` 各自独立绑定，Legal 实际为七个 final + `legal.RiskListDraft`，没有以 artifact type 猜 key 或把 final/draft 藏进同一 value。
3. **准入隔离：通过。** 未知 ABI、缺 final/draft binding、重复 schema 引用、binding/descriptor 越 namespace、执行对象混入均显式拒载；先到拒载包不占 package/template id、不泄漏 warning，也不污染后到合法包。
4. **compatibility 唯一性：通过。** 全仓生产搜索只有 `package-registries.ts` 的 `bindArtifactDescriptorCompatibility` 一处把 bindings 接回既有 `descriptor.schema/draftSchema`；data plane 往返字段不漂移。core 的三处 schema 消费继续走既有 registry entry，未出现第二准入真源。
5. **JSON Schema 出口：通过。** `toDraft202012JsonSchema` 显式固定 `target: 'draft-2020-12'` 与 `unrepresentable: 'throw'`，`z.date()` 反例会抛错；逻辑 id 与 schemaVersion 生成固定 `urn:courtwork:schema:<logicalSchemaId>:v<schemaVersion>`。本地 fragment 可用，远程/相对 `$ref`、`$dynamicRef`、`$recursiveRef` 均 fail closed。
6. **Legal 契约面：通过。** 提交态恰有 8 份 schema，全部为 Draft 2020-12 且 `$id` 与 descriptor 引用一致；drift 测试逐份对比生成结果。FileOpsPlan 与 RevisionInstructionSet 去除 `$schema/$id` 后与中央 wire schema 结构一致，法律字段语义未改。
7. **范围与下游兼容：通过。** 实现差异未触及 PM 垂类包、`apps/desktop`、`packages/provider`、`packages/core` 或依赖锁；没有新增 Ajv 产品依赖、动态插件、反向 schema 转换或第二 runtime。PM 仍按 ADR-009 留给 ABI-2B。

## 反例注入与验收修复

- 临时削弱 `$ref` 守卫后运行 `packages/registry/src/schema-export.test.ts`，稳定得到 **1 failed / 2 passed**：远程 URL 不再抛错，证明门禁真实咬住；随后原样恢复，**3/3** 转绿。
- 独立探针证明 Zod metadata 可原样导出远程 `$dynamicRef` / `$recursiveRef`，原实现只检查 `$ref`。新增回归先稳定得到 **1 failed / 3 passed**，再以 `c35ccb7` 扩展同一守卫；最终 schema-export **4/4**、registry **54/54**、legal **70/70**。该补丁未改字段、接口或准入语义。

## 最终实测

- clean worktree 执行 `pnpm install --frozen-lockfile`：通过，13 个 workspace project、1047 个包完成链接。
- 三包定向：schemas **11 files / 90 tests**；registry **4 files / 54 tests**；legal **8 files / 70 tests**。
- 全仓 `pnpm -r build`：通过，12/12 workspace build 完成；desktop 仅保留既有 chunk-size warning。
- 全仓 `pnpm lint`：通过，0 error。
- 全仓 `pnpm test`：**116 files / 1003 tests** 全绿。
- `pnpm --filter @courtwork/core demo:legal`：黄金对照 PASS；8 risks、11/11 anchors、7 confirmed / 1 rejected、7 revision instructions，事件骨架从 `artifact_produced` 经确认、revision 到 `scenario_completed` 完整。
- 本单无 UI 行为变化，按工单不运行 Playwright。

## 下游放行

**允许合入 main。** ABI-2B 可在这套唯一 descriptor/bindings 准入真源上迁 PM；不得复制 admission、compatibility rebind 或 JSON Schema export 逻辑。

---

# ABI-2B 跨层验收指向（2026-07-14）

结论：**放行。** 独立验收以真实 `LEGAL_PACKAGE + PM_PACKAGE` 同次准入得到 `[legal, pm]`、零拒载、零 warning，四个 PM artifact 全部进入统一 `artifactSchemas` registry；注入坏 PM 后只有 `pm` 被拒，Legal 不受污染。registry 的 RFC 6901/valueLabels 门和 anchor model-output draft/citation 门均经强制变异实际观察红灯，恢复后 registry **4 files / 62 tests**、PM/registry/legal/schemas 合跑 **28 files / 255 tests**。

完整 PM catalog、JSON Schema、旧真源清零、变异与全仓门禁证据见 [`packages/pm/ACCEPTANCE.md`](../pm/ACCEPTANCE.md)。本节不重复建立第二份验收真源。

---

# ADMISSION-ENUM-1R 独立验收（2026-08-04）

验收树：`.claude/worktrees/accept-admission-enum-1`（detached `b5a172c`）

实现分支：`codex/admission-enum-1`，链 `7a2e3c4`（首轮）→ `b5a172c`（1R 返修），base `d62e22d`

结论：**驳回。** 一相四项发现逐条复核成立，六枚 mutation 全部命中，born-red 与回执逐字相符。驳回依据只有一条，且不在既往发现之内：本票的受控外溢改动了设计权威来源 `packages/legal/src/presentation/index.ts`，未同步 `docs/design/schema-exemplar.sources.json` 的封存哈希，`assert-schema-exemplar` 在 desktop `test:e2e` 相位红；该门位于 `&&` 串链中 `playwright test` 之前，红即短路，352 条 Playwright 用例在本票既定跑法下从未启动。

## 一相四项发现复核

前次验收会话在完成一相后进程崩溃，四项发现经返修宪章转述。本次自零复核，不采信转述。

1. **F-A（`z.email()/z.uuid()/z.url()` 被误判未识别节点）：已闭合，措辞如实。** zod 4.4.3 实测 `z.email()→ZodEmail`、`z.uuid()→ZodUUID`、`z.url()→ZodURL`，三者 `instanceof z.ZodString` 均为 `false`、`instanceof z.ZodStringFormat` 均为 `true`，与 SPEC 第 149 行逐字相符。搜索「已覆盖」「含全部」「全部格式」，仅命中该行的撤销声明本身，无残留宣称。
2. **F-B（键判据取全子树，误拼撞深层同名键即静默过门）：已闭合，镜像之说成立。** 裁定见下节。
3. **F-C（`visited` 跨 collect 共享致假拒）：已闭合，掩盖之说经对照实验坐实。** `checkCitationBinding` 内 `collect()` 每次新建 `visited`，环保护仍由单次 collect 内承担。
4. **F-D（瞬态红）：已改写为机制结论。** SPEC 第 186 行登记为「门对、红真、非 flaky」，病因是 mutation 备份的游离 `.ts` 短暂落仓内且消费 `/testing`，对治为备份落 `$TMPDIR`；「待验收复跑观察」措辞已撤。

## F-B 口径裁定

返修未把 `draftField`/`anchorField` 收紧到 item 根直接键，改取「item 树中某对象节点的直接键且值为数组」，理由是该谓词与消费面同宽。消费面为 `packages/core/src/citation/resolver.ts` 的 `resolveItem`：深走全部对象节点，在 `key === binding.draftField && Array.isArray(value)` 处公证。legal 的 `quoteClaims`/`sourceAnchors` 住在 `basis[]` 元素层而非 risk item 根，收紧到 item 根确会误拒现行 legal 包。

以真实门与真实 resolver 同时驱动同一组 binding，实测三形：

- 深层 STRING 值同名键（`draftField` 误指 `basis[].citation`）：门拒载，拒因具名；消费面 `claims=0`，`quoteClaims` 原样穿过未公证，静默丢引语。门与消费面同判。
- 深层 ARRAY 值同名键（`draftField` 误指 `basis[].notes`）：门准入；消费面确实公证同一节点，`status=needs_repair`、`claims=1/failed=1`，剪枝后该单元入 `outOfCoverage` 并标 `citation_unresolved`。门放行的正是消费面真正到达的节点，失败显式，不复现缺陷②的「零报错」病象。
- 真实 `LEGAL_PACKAGE` 单独准入：`admitted=1`、零拒载。

**裁定：门谓词与消费面谓词在键名与值形两轴上同宽，F-B 按返修宪章判据成立。** `outOfCoverageField` 与 `itemSummaryField` 已分别落 final 根直接键（`binding.outOfCoverageField in finalRoot.shape`）与 draft item 根直接键（`binding.itemSummaryField in draftItem.shape`），与 `rebuildFromSurvivors` 的 `root[field]`、`outcome.item[field]` 两处消费坐标一致。

## 驳回依据

**G-1 `assert-schema-exemplar` 来源哈希漂移。**

`docs/design/schema-exemplar.sources.json` 以 `P0-S01`–`P0-S09` 封存设计权威来源的 sha256，`docs/design/schema-exemplar.md` 第 67 行定「正式来源只认」该登记。本票的受控外溢在 `packages/legal/src/presentation/index.ts` 的 `LEGAL_ARTIFACTS` 补 `enumLabels.reason`，该文件正是 `P0-S02`，role 为 `presentation-contract`。四方哈希对照：

| 取值处 | sha256 |
| --- | --- |
| `sources.json` 登记值 | `4c24f2cb…719f829f` |
| base `d62e22d` 的文件 | `4c24f2cb…719f829f` |
| 首轮 `7a2e3c4` 的文件 | `f19a76a2…c29e1892` |
| target `b5a172c` 的文件 | `f19a76a2…c29e1892` |

base 与登记值逐字相等，漂移自首轮引入并延续至 target；`sources.json` 在 `d62e22d..b5a172c` 全程未改。此红由本票自身产生，非既存条件，非环境。

后果有二。其一，设计权威账本已不覆盖实际出货的 presentation 契约。其二，`test:e2e` 是 `&&` 串链，该门红即短路，其后的 Playwright 从未启动；回执列出的零回归证据全属 vitest 相位，未触及该门。

登记哈希属设计权威行为，`schema-exemplar.md` 正文另有章节须与来源一致，故不作 fix-by-acceptance，交返修与架构处置。

## 本相另获两项，不构成独立驳回依据

**G-2 SPEC 红绿证表数字失准。** SPEC 第 174 行记「registry 全量 1R 后 **6 files / 97 tests**（admission 67 例）」。实测 `b5a172c` 为 **6 files / 105 tests**，其中 admission 67；把首轮 `7a2e3c4` 的生产面与测试面一并还原后实测恰为 **6 files / 97 tests**。该句把首轮总数与 1R 的 admission 分项并列于同一行。同段「legal/pm/registry 合跑 25 files / 237 tests」实测相符。属「跑门后又编辑未重跑」一族。

**G-3 `anchorField` 位置轴未闭合，登记不自裁。** 门对 `draftField` 与 `anchorField` 分别在 draft、final 两棵树独立判存在，不校验二者同位；而 `resolveItem` 把铸出的锚写在 `draftField` 命中的那个节点上。构造 final 在 item 根另有数组键 `topAnchors`、`basis` 元素的 `sourceAnchors` 取 `.default([])` 的形状，`anchorField` 误指 `topAnchors` 时：门准入，resolver 报 `resolved=1`，而 executor 的 `descriptor.schema.safeParse` 把错位写入的 `topAnchors` 从 `basis` 节点 strip 掉、`sourceAnchors` 回落 `[]`，`success=true`，最终形零锚点且零报错。此形与缺陷②描述的病象同族，但票面改法只要求「其余字段须为对应 schema 已声明键」，返修宪章亦只就键形轴设判据，故不作本次驳回依据，供架构决定是否另立票。SPEC 缺陷②节「写错一字不再被 zod strip 静默吞」一句宜加轴限定。

## mutation 复红

每枚先备份至 `$TMPDIR`、注入、grep 校验命中、定向跑、还原、`git status --porcelain` 复核零残留。

| 变异 | 命中校验 | 实得 |
| --- | --- | --- |
| `draftField` 数组直接键 → 回全树 | 1 | 1 failed / 66 passed，红在「draftField 只活在数组元素内层」 |
| `anchorField` 数组直接键 → 回全树 | 1 | 1 failed / 66 passed，红在「anchorField 只活在数组元素内层」 |
| `outOfCoverageField` 根直接键 → 回全树 | 1 | 1 failed / 66 passed |
| `itemSummaryField` 根直接键 → 回全树 | 1 | 1 failed / 66 passed |
| 撤 `ZodStringFormat` 叶子 | 残留 0 | 3 failed / 64 passed，三枚格式类正例 |
| `visited` 恢复跨 collect 共享 | 1 | 1 failed / 66 passed |

## born-red 与 F-C 掩盖之说

以 `b5a172c` 的测试面对 `7a2e3c4` 的生产面：**7 failed / 60 passed**，与回执逐字相符；红为格式类三枚、`anchorField`/`draftField`/`itemSummaryField` 三形、共用 schema 一枚。此态下 `outOfCoverageField` 一形为绿。

在同一生产面上只施 F-C 一处修（`visited` 改每 collect 新建），仍 **7 failed / 60 passed**，红的成员恰换一枚：`outOfCoverageField` 转红，共用 schema 转绿。掩盖机制由此坐实——首轮 `collect(finalSchema)` 排在 final item 收集之后且共享 `visited`，深层键所在子树已被访过而遭跳过，全子树判据恰好收不到该键，于是误判为拒载。回执「该形的绿是被 visited bug 偶然掩盖、F-C 修后独立复红」成立。

## 二相全量门

- `pnpm -r build`：通过，desktop 仅余既有 chunk-size warning。
- `pnpm lint`：通过，EXIT=0。验收树内无 `.claude/` 目录，未触发嵌套 worktree 的解析歧义。
- 根 `pnpm test`：**167 files / 1802 tests** 全绿。
- `pnpm --filter @courtwork/desktop test`：**75 files / 690 tests** 全绿。
- `pnpm --filter @courtwork/desktop test:e2e`（`COURTWORK_E2E_PORT=1467`）：**红**，止于 `assert-schema-exemplar`，见 G-1。
- 越过该门单独复核其后各关：`assert-skin-r2-ledger` 绿、`assert-app-highwater` 绿（2549 行，上限 2549）、`assert-isolation-binding` 绿、`assert-test-count` 绿（352 条，下限 351）、`npx playwright test` **352 passed**。G-1 是本票 e2e 相位的唯一阻断。
- cargo 非本票面，未跑。开跑 Playwright 前 `chrome-headless-shell` 实计为 0。

## 返修指向

1. 同步 `docs/design/schema-exemplar.sources.json` 的 `P0-S02` 哈希，并核 `docs/design/schema-exemplar.md` 正文是否须随 presentation 契约变化同改。该登记属设计权威行为，须经架构拍板，不由实现会话自决。
2. 订正 SPEC 第 174 行的 registry 计数。
3. G-3 由架构裁定：另立票收位置轴，或就地为缺陷②节的宣称加轴限定。
4. 返修后须以完整 `test:e2e` 收尾；提交前最后一个动作是跑门。

---

# ADMISSION-ENUM-1R2 独立验收（2026-08-04）

验收树：`.claude/worktrees/accept-admission-enum-1`（detached `b53d303`）

实现链：`7a2e3c4`（首轮）→ `b5a172c`（1R）→ `0b16072`（1R 驳回报告）→ `b53d303`（2R 返修，单枚 4 文件 +83/−18），base `d62e22d`

验收修复：本轮一处 fix-by-acceptance，只动 `packages/registry/SPEC.md` 措辞，不触生产面（见 G-3 边界二）

结论：**放行。** 上轮驳回依据 G-1 已闭合并经完整 `test:e2e` 实跑坐实——`assert-schema-exemplar` 绿，Playwright **352 passed** 真启动（上轮它从未跑过）。G-3 位置轴以路径追踪收口，双驱复核门与消费面同判；G-2 三组数字与实测对账相符。两则边界宣称中，record 一则成立，共享子 schema 一则的范围措辞与实测不符，已按实测收窄留痕。

## 三轮记事

| 轮次 | tip | 裁决 | 决定性事由 |
| --- | --- | --- | --- |
| 首轮 | `7a2e3c4` | 驳回（前任会话，四项 F-A/F-B/F-C/F-D） | 格式类误判、键判据取全子树 fail-open、visited 跨 collect 共享、瞬态红未结案 |
| 1R | `b5a172c` | 驳回（`0b16072`） | G-1：受控外溢改 `P0-S02` 来源却未重封存哈希，`assert-schema-exemplar` 红并短路其后 Playwright |
| 2R | `b53d303` | **放行** | G-1 重封存到位且 e2e 全链实跑；G-3 位置轴收口；G-2 数字订正 |

## G-1 来源哈希重封存

- `sources.json` 的 `P0-S02.sha256` 现值与 `packages/legal/src/presentation/index.ts` 实物 sha256 逐字相等，同为 `f19a76a253b0549923664b467ac30cebffab70e4c3271013a95bdc8bc29e1892`。
- `sources.json` 改动面恰一逻辑行（一删一增），`id`/`path`/`role`/`symbols` 均未动，无格式漂移。
- authorization 双处在场：提交信息正文（票面「扩紧后须补词表使合规」＋返修宪章「哈希重封存是其必要完件」）与 registry SPEC 受控外溢清单第 1 条的 **authorization** 子条。
- SPEC 宣称「`schema-exemplar.md` 正文为符号指针式，经核无需同改」成立：该文第 7 行自陈「payload 字段、枚举、默认值与 token 数值只认各自机器真源；本文不复制它们」，全文搜 `enumLabels`/`not_found`/`ambiguous`/`file_unavailable` 零命中。
- **最终证据是实跑**：`assert-schema-exemplar` 单独跑 `SCHEMA-EXEMPLAR contracts passed`、EXIT=0；完整 `test:e2e` 一路走到 `playwright test` 并 **352 passed**。

## G-3 位置轴：双驱复核

判据为「`draftField` 与 `anchorField` 命中节点路径集非空交集」，路径＝从收集根起的 shape 键序列、数组元素以 `[]` 占位。判据取值正当性在于 `resolveItem` 由草稿值重建成品，成品结构即草稿结构（仅 `draftField` 换成 `anchorField`），故跨 draft/final 两棵 schema 比路径成立。

以真实门与真实 `resolveDraftArtifact` 同驱同一 binding，并把成品交 final `safeParse` 数落库锚点：

| 形 | 门 | resolver | executor 落库锚点 |
| --- | --- | --- | --- |
| 错位形（`topAnchors` 于 final item 根） | **拒**，拒因具名同位 | `resolved=1` | `finalParse=true`，**0** |
| 合法 legal 形（`quoteClaims`/`sourceAnchors` 同住 `basis[]`） | **准入** | `resolved=1` | `finalParse=true`，**1** |
| 真实 `LEGAL_PACKAGE` | **准入**，零拒载 | — | — |

错位形正是 `0b16072` 的 G-3 语料，现已转 permanent 反例入 `admission.test.ts`。门拒的那一形，消费面实测确为「零锚点且零报错」，与不变量二「无锚不落格」的触点一致；门准入的那一形，锚点真落库。**门与消费面同判，G-3 收口成立。**

### 边界一：record 动态键不推进路径

两侧同构时同位仍成立，实测两形：

- record 同位形（draft `answers: record(_, {quoteClaims})` × final `answers: record(_, {sourceAnchors})`）：门准入，resolver `resolved=1`，落库锚点 1。
- record 错位形（final 把 `sourceAnchors` 挪到 item 根）：门拒，且消费面 `finalParse=false` 显式失败。

宣称成立。

### 边界二：共享子 schema 只记首访路径（**范围措辞不实，已按实测收窄**）

`visited` 键控 `(schema, fieldName)`，同一子 schema 在同名字段下二次挂载即被跳过，故只记首访路径。

- **方向实测**：构造 anchor 侧同一对象两处挂载、`quoteClaims` 只在第二处的形——门**拒**，而消费面实际可工作（resolver `resolved=1`，`finalParse=true`，**落库锚点 1**）。即该截断产生的是**误拒**。
- **方向论证**：记录路径集是真路径集的子集，子集交集非空蕴含真集交集非空，故判据 sound（不误放）、incomplete（可能误拒）。误拒属 fail-closed 方向，不构成安全缺口。
- **范围实测**：SPEC 原文称「当期 legal/pm 无此形状」。实测该形状在 legal 与 pm **确实存在**——`legal.RevisionInstructionSet` 6 处（`(ZodDiscriminatedUnion, locator)`、`(ZodObject, annotation)`），pm `FeedbackDigest` 6 处、`PriorityScore` 17 处、`ActionItems` 1 处。真正成立的是收窄后的命题：**参与同位判据的 schema**（`legal.RiskList`/`legal.RiskListDraft`，pm 无任何 citationBinding）实测 **0 处**。
- **处置**：本轮 fix-by-acceptance 只改 `packages/registry/SPEC.md` 该句措辞，按实测收窄至判据参与面并补记方向结论；不触生产面，判据行为零变化。此项不构成驳回依据——门本身正确且 fail-closed，操作性结论（当期两包不受影响）经实测为真，失准只在范围措辞。

## mutation 与 born-red

- **mutation（撤同位判据）**：`coLocated` 恒真化，命中校验 1，实得 **1 failed / 67 passed**，红在「anchorField 与 draftField 不在同一对象节点必拒载」；还原后 `git status --porcelain` 零残留。
- **born-red（2R，返修前）**：以 `b53d303` 测试面对 `0b16072` 生产面（`arrayKeyPaths`/`coLocated` 命中数均为 0，确认生产 hunk 已逆向），实得 **1 failed / 67 passed**，与回执相符；还原后 **68 passed / 68**。

## G-2 数字对账

SPEC 表内三组数字与实测逐一相符：`7a2e3c4` 首轮 registry **6 files / 97 tests**（上轮实测）、1R **6 files / 105 tests**（上轮实测）、2R **6 files / 106 tests**（本轮实测，admission 68）。合跑 1R **25 files / 237 tests**、2R **25 files / 238 tests**（本轮实测）。上轮 G-2 所指「97 标作 1R 后」的错位已订正。

## 二相全量门

- `pnpm -r build`：通过，desktop 仅余既有 chunk-size warning。
- `pnpm lint`：通过，EXIT=0。验收树内无 `.claude/` 目录，不触发嵌套 worktree 解析歧义。
- 根 `pnpm test`：**167 files / 1803 tests** 全绿。
- `pnpm --filter @courtwork/desktop test`：**75 files / 690 tests** 全绿。
- `apps/desktop` cwd 完整 `pnpm test:e2e`（`COURTWORK_E2E_PORT=1467`）：**全绿**，`assert-schema-exemplar` 通过，`assert-app-highwater` 2549（上限 2549），`assert-test-count` 352（下限 351），`playwright test` **352 passed**，EXIT=0。
- 开跑 Playwright 前以括号法 `pgrep -f 'chrome-headless-[s]hell|[p]laywright'` 实计为 0（裸模式会命中 pgrep 自身的 wrapper shell，假报 1）。cargo 非本票面。

## 下游放行

**允许合入 main。** 同位判据是键形轴之上的第二道，二者同为 `checkCitationBinding` 内的静态对账，不得在别处复制第三份路径口径。后续若有包需要「共享子 schema 多处挂载 + citationBinding」形状，须先改 `visited` 的路径记录粒度再准入——当期该形状不落在任何判据参与面上，SPEC 已按实测留痕。
