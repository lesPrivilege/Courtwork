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
6. **范围纪律：通过。** 实现差异只触及 `packages/registry` 与 `packages/legal`；`packages/core`、`apps/desktop`、`packages/pm-schemas`、ADR 均为零差异，未提前实现暂停续行或 renderer。

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
