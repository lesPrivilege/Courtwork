# W1 验收报告：packages/schemas + monorepo 工程底座

验收日期：2026-07-09

## 结论

放行：W2 / W4 / W5 可并行开工。

## 验收清单

1. 干净环境跑通：通过。已删除根目录与 `packages/schemas` 下全部 `node_modules` 后重新 `pnpm install`，再执行 `pnpm test`、`pnpm lint`、`pnpm -r run build`，全部通过。
2. 七个 schema 齐全且字段与 SPEC 对齐：通过。`SourceAnchor` / `CaseFile` / `Timeline` / `PartyGraph` / `RiskList` / `ReviewMatrix` / `RevisionEvent` 均已实现并从 `src/index.ts` 导出。重点项已核对：`SourceAnchor.quote?` 的 JSDoc 明确“展示与重锚定辅助、非权威定位器”；`bbox` 存在时 `page` 必填的 zod refine 生效；`textLayerVersion?` 存在；`RevisionEvent.fieldPath` 使用 JSON Pointer 形态（以 `/` 开头），并含 `reason?` / `sourceAnchors?` / `caseId?`。
3. 测试质量抽查：通过。每个 schema 合法样例不少于 3 个、非法样例不少于 3 个；断言使用 `safeParse(...).success` 校验真实结果。非法样例覆盖了枚举错误、必填缺失、数组 `min(1)`、日期格式、`SourceAnchor` 跨字段 refine 等真实规则，不是空壳测试。
4. `json-schema/` 导出：通过。七个静态 JSON Schema 文件齐全，路径为 `packages/schemas/json-schema/<Name>.schema.json`。`src/json-schema-drift.test.ts` 会重新从 zod 源生成并与提交文件深比较。验收时临时将 `SourceAnchor.quote` 改为 `.min(1)`，drift 测试如预期变红；还原后测试恢复通过。
5. 工程底座为最小集：通过。具备 pnpm workspaces、严格 `tsconfig`、ESM + NodeNext、eslint flat config、vitest、`engines.node >=22`、`.nvmrc`、`.gitignore`。未发现 turbo、CI、prettier、husky 等越界工程设施。
6. 纪律检查：通过。未发现硬编码 provider、凭证或真实当事人信息；测试数据使用“某某”“张三/李四”等脱敏占位。`packages/schemas/SPEC.md` 状态区已更新。git 历史呈现“文档入库 → 底座 bootstrap → schemas package → 逐 schema → JSON Schema 导出 → 工程决策修正 → 完工记录”的分层提交。
7. 两个已知工程决策复核：通过并尊重。`typescript` 保持 `^6.0.3`，未升级到会打断 `typescript-eslint@8.63.0` peer 范围的 TS7；`@types/node` 位于 `packages/schemas` 自身 `devDependencies`，且 `packages/schemas/tsconfig.json` 显式 `"types": ["node"]`。
8. 契约缺口文档核验：通过。`packages/schemas/SPEC.md` 已说明 zod→JSON Schema 导出不含 `.refine()` 跨字段规则；`services/ingest/SPEC.md` TODO 区已有 JSON Schema 路径说明，并有“W8 Python 校验层必须等效实现”的架构拍板条目。
9. 干净环境验证自己做一遍：通过。未采信实现会话自述，验收方已实际执行删除依赖目录、重新安装、测试、lint、build。
10. 仓库卫生：已修复。`.claude/settings.local.json` 为本地会话权限配置/缓存，不应入库；已将 `.claude/` 加入 `.gitignore`。

## 修复列表

- `fix-by-acceptance: ignore local Claude settings`：将 `.claude/` 加入 `.gitignore`。
- `fix-by-acceptance: add W1 acceptance report`：新增本验收报告。

## 遗留问题

无阻塞项。

## 放行结论

W1 验收通过。可以放行 W2（registry）、W4（output）、W5（tools）并行开工；W3/W8 需继续遵守已拍板的 `SourceAnchor` 跨字段规则在 Python 侧等效实现要求。
