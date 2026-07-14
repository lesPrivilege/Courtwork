# ACCEPTANCE: packages/legal

## VPKG-META-1 独立验收（2026-07-14）

- 验收角色：未参与实现的独立验收会话。
- 基线：`bed44095133723d33de3e153b58a286a886a612b`。
- 实现：`07c317ee4e01aacc160ccecb6541741c41849669`；验收 worktree 中等价 cherry-pick 为 `e987a6969651f77f053723301ce1a7dda5679818`。
- 环境：clean worktree `/tmp/courtwork-vpkg-meta-1-acceptance`，分支 `codex/accept-vpkg-meta-1`；冻结 lockfile 安装后先完成拓扑 build。

### 结论

**VPKG-META-1 放行。** Legal 已具备与 PM 同体例的 `test / lint / build / generate:json-schema` 脚本、package/descriptor 版本一致性门，以及 JSON Schema 文件全集、Draft、URN、drift 和递归 remote-ref 门。未发现实现级缺陷，无 `fix-by-acceptance` 产品补丁，也没有需要架构拍板的契约问题。

### 独立证据

- Legal 定点：**9 files / 73 tests**；包内 lint、build、JSON Schema 重生成均通过，重生成后工作树无 drift。
- 直接审计提交态文件：Legal 恰为 descriptor 引用的八份 schema；与 PM 合计 **12** 份文档，全部是 Draft 2020-12、`urn:courtwork:schema:<logicalSchemaId>:v1`，递归扫描只允许文档内 fragment ref。
- 差异面只有 package metadata、门禁测试与 SPEC/registry 提案留痕；`manifest.ts`、全部 payload/schema 源、场景、prompt、descriptor 与提交态 JSON Schema 字节对基线均无差异。运行态仍为 `legal / 0.1.0 / schemaVersion 1`、7 artifacts、5 scenarios、5 prompt segments。
- clean install 后直接运行包测试会因 workspace 依赖尚无 `dist` 而在解析 `@courtwork/schemas` / `@courtwork/registry` 时失败；按仓库规定先执行 `pnpm -r build` 后，包测试与全仓测试均通过。这是现行 workspace 构建前置条件，不是本单新增回归。

### 强制变异：实际触红后撤回

| 反例 | 观察到的红灯 |
|---|---|
| 从 Legal `package.json` 删除 `test` 与 `lint` | metadata 定点 **1 failed / 1 passed**，明确列出两枚缺失脚本 |
| 在 Legal `json-schema/` 新增 `Legacy.schema.json` | drift 定点 **1 failed / 8 passed**，文件全集差异明确出现残余文件 |
| 把 PM package release 改为 `9.9.9` | PM metadata 定点 **1 failed / 1 passed**，明确期望 descriptor `0.1.1` |
| 在 PM `ActionItems` 深层 `allOf[0].$ref` 注入远程 URL | PM drift 定点 **1 failed / 4 passed**，错误路径精确到 `$.properties.items.items.allOf[0].$ref` |

四项反例均用最小补丁原样撤回；撤回后 `git diff --check` 与全部门禁通过。

### 全仓门禁

- `pnpm install --frozen-lockfile`：14 个 workspace scope，1047 个包全复用，lockfile 无改写。
- `pnpm -r build`：13 个 workspace build 全通过；desktop Vite **3520 modules transformed**，仅有既存 dynamic-import/chunk-size warning。
- `pnpm lint`：exit 0。
- `pnpm test`：**122 files / 1083 tests**，exit 0。
- 本单没有 UI 行为变化，按范围不运行 Playwright。

### 放行边界

本轮只放行两垂类包的 metadata 与 JSON Schema drift 门，不放行后续目录迁移、PM rename、根出口分面、企业 runtime、bindings 真只读快照或任何新场景。上述工作仍须按 ADR-012 的后续独立工单实施与验收。
