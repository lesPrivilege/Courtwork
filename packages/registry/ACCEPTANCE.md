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
