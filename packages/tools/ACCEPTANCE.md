## AUDIT-SEAL-3 独立验收（2026-07-18）

- **验收角色**：未参与实现的独立验收会话；不采信实现自述，本节全部数字均来自隔离 worktree 亲手复跑。
- **验收坐标**：worktree `/Users/lesprivilege/Projects/Courtwork-audit-seal-2-3`，验收即在 `impl/audit-seal-2-3` 分支进行；实现 SHA `2ba0d31`（rebase 后 `8b9a64d`），基线 `main @ 92d1fd4`（此前 SEAL-2 `7c960f0`/`4842feb` 同分支先行）。`git rebase main`（尖端 `146003a`，纯 docs 差 1 commit）干净重放、零冲突。
- **裁决：AUDIT-SEAL-3 放行 ✅。** tools 去法律化（citation 开放 discriminator、`relatedRecords` 中性化）、三包 boundary 守卫铺满、受信装配点静态锁三线均独立复核成立；`packages/registry` 契约逐 diff 确认零变更。验收期间未修改产品实现。

### 1. citation 开放 discriminator 语义核

- `CitationTypeEnum` 由 `z.enum(['statute', 'case'])` 改为 `z.string().trim().min(1).max(64)`；`cite-check.test.ts` 新增例「accepts an open, domain-owned citationType instead of imposing a legal enum」用完全非法律的 `'project_standard'` 值实测通过，「still rejects an empty citationType」确认非无限开放；`createMockCiteCheckAdapter` 的 `currentlyValid: input.citationType === 'statute' ? true : null` 改为恒 `null`，机器层不再按字面自作垂类判断；中国法律数据源候选注释（原「国家法律法规数据库公开检索、中国裁判文书网」）已从 `createPublicLawDbCiteCheckAdapter` 的错误文案与注释移除。`packages/tools/src/cite-check.test.ts`：**22/22 passed**。
- **诚实范围澄清（非缺陷）**：`rg "citationType\s*===\s*'statute'"` 全仓扫描（含 `packages/legal/src`、`apps/desktop/src`）零命中生产代码——`cite-check` 当前确无任何 production Legal 消费面，`demo-runtime/SPEC.md` 对此如实自陈「cite-check 当前无 production Legal 注册消费面」。因此「垂类闭集规则在绑定层生效、legal 消费面注入非法 kind 仍被拒」这条判据对 cite-check **尚不可执行**（没有绑定层可测）；SPEC 未夸大此点，只是诚实占位，验收对此不作阻断，仅记录澄清供后续 cite-check 真正装配时对照。

### 2. `relatedRecords` 迁移 + legal demo golden 不回退

- `PartyVerifyDataSchema.litigationSummary[{caseNumber,summary}]` → `relatedRecords[{reference,summary}]`；唯一受信绑定点 `packages/demo-runtime/src/composition/demo-assembly.ts::projectPartyRecord` 把富语料 `litigationSummary` 投影为该中性形状，Legal 专属案号格式（`(2025)云章03民初472号`）只存在于这一绑定层，未泄漏回 tools。`party-verify.test.ts` + `demo-assembly.test.ts`：**22/22 passed**。
- `demo:legal` golden 在 rebase 后合并树亲跑：**PASS**（骨架/考点/锚点复算/六段标记/修订命中全符，redline.docx 4606 bytes）；`demo:s3` **PASS**（7/7 考点）。

### 3. 三包 boundary 守卫红证（tools / reading-view / output）

- 三份 `package-boundary.test.ts` 逐字节比对：除 `describe()` 标签外完全一致；`FORBIDDEN_LITERALS` 与 `packages/core/src/package-boundary.test.ts` 的既有表逐项核对**完全相同**（`'legal.`、`"legal.`、`'RiskList'`、`'CaseFile'`、风险清单、卷宗）；`FORBIDDEN_PACKAGES` 按各包实际依赖面合理裁剪（不要求相同，只要求字面量表相同）。
- 亲自逐包植入反例：向三包各自 `src/index.ts` 追加一行含「风险清单」的注释，独立运行三份测试——**三包均 1 failed / 2 passed**；`git checkout HEAD` 撤除后**三包均 3/3 passed** 复原。
- `case-path.ts`/`party-verify.ts` 的「卷宗」「具名 demo 包」等违规字面量已中性化（先红后清）：`assertWorkDraftWritable` 的拒绝文案由「卷宗原件不可修改」改「原件不可修改」，`case-path.test.ts` 断言同步更新，未留旧字符串残留（`rg 卷宗 packages/tools/src` 零命中生产文件）。

### 4. 受信装配点静态锁红证

- `packages/core/src/tools/tool-registration-boundary.test.ts`：`TRUSTED_REGISTRATIONS` 硬编码全仓恰三处 `tools.register()`/`createToolRegistry()` 生产调用点（`apps/desktop/src/work/legal-s3-binding.ts`、`packages/demo-runtime/src/composition/demo-assembly.ts`、`packages/demo-runtime/src/acceptance/run-s3-real.ts`），逐点锁 `toolToken → toolId → factory → sideEffect` 四元组，非仅计数。基线 **3/3 passed**（含既有反例「rejects a writer disguised as pure_read even inside a trusted file」精确红于「expected exactly one … got 2」）。
- 验收亲写区分探针：**保持注册计数不变（仍 1 处）**，只把 `demo-assembly.ts` 真实注册的 `sideEffect: 'pure_read'` 改为 `sideEffect: 'file_write'`——主生产扫描测试独立触红：`"packages/demo-runtime/src/composition/demo-assembly.ts: party-verify must declare sideEffect pure_read"`，**零计数类违规**。这确认守卫锁的是装配点清单 + id/factory/sideEffect 配对本身，而非仅统计调用次数；同一 mutation 下伪装反例测试因文件内容已变而级联多报一条，两者共同印证判据独立生效。`git checkout HEAD` 撤除后 **3/3 passed** 复原。

### 5. registry 契约零变更核实

`git diff 92d1fd4..2ba0d31 -- packages/registry` 输出为空（`wc -l` = 0）；`ToolRegistry` 接口（`register`/`get`）本身未改一字，只在其消费方（core 的 `tool-registration-boundary.test.ts`、demo-runtime 的绑定投影）新增静态测试与迁移字段。

### 6. 全量门（合并树，rebase 后）

| 门 | 结果 |
|---|---|
| `pnpm -r build` | PASS（13/14 workspace） |
| `pnpm lint` | PASS |
| root Vitest | **148 files / 1261 tests passed** |
| desktop Vitest | **59 files / 354 tests passed** |
| `cargo test --lib` | **69/69 passed** |
| `demo:s3` / `demo:legal` golden | 均 PASS |
| 完整 `test:e2e`（隔离端口，独立三轮） | **290/290 passed** × 3（首轮一处与本单零交集的 hover 用例抖动，隔离重跑与全量重跑均绿，非回归——详见 `apps/desktop/ACCEPTANCE.md` AUDIT-SEAL-2 报告） |

> **最终判定：放行 AUDIT-SEAL-3。** tools 去法律化、三包守卫铺满、受信装配点静态锁三线均成立，`packages/registry` 零变更；唯一诚实澄清（cite-check 无生产 legal 绑定，闭集判据暂不可测）已如实记录，不构成驳回。SEAL-2 报告见 `apps/desktop/ACCEPTANCE.md`；`packages/core`/`packages/reading-view`/`packages/output`/`packages/demo-runtime` 各侧一条指回本报告。

未更新 `docs/status/current.md`；未推送；未 prune。

---

# W5 / W5.1 验收报告：packages/tools + packages/demo-data

验收时间：2026-07-09

验收角色：Codex（验收工程师）

验收对象：

- `packages/tools`：统一工具契约 + `party-verify` / `cite-check` 两工具三适配器。
- `packages/demo-data`：演示数据包与 typed accessors。

结论：**放行**。`@courtwork/tools` 与 `@courtwork/demo-data` 可供 W6 core 的工具注册/编排装配与演示路径消费。验收中发现一个实现级构建配置问题（过滤 `test`/`lint` 命令没有实际执行），已按规则独立修复并提交：`1f81224 fix-by-acceptance: make tools demo-data filtered scripts run`。

## 一、实测命令

按要求执行了干净环境复核：

1. `find . -name node_modules -type d -prune -exec rm -rf {} +`
2. `pnpm install`
3. `pnpm --filter @courtwork/tools --filter @courtwork/demo-data test`
4. `pnpm --filter @courtwork/tools --filter @courtwork/demo-data lint`
5. `pnpm --filter @courtwork/tools --filter @courtwork/demo-data build`

结果：

- `pnpm install`：通过，lockfile up to date。
- `test`：通过，`@courtwork/demo-data` 2 个 test file / 15 tests，`@courtwork/tools` 4 个 test file / 66 tests。
- `lint`：通过，两个包均实际执行 `eslint .`。
- `build`：通过，两个包均实际执行 `tsc -p tsconfig.json`。

说明：当前工作区存在 W4/W1/W2 在途未提交文件，且 `packages/output/spike/ts/package.json` 使 pnpm scope 总数显示为 6；本次验收命令用 `--filter @courtwork/tools --filter @courtwork/demo-data` 限定，未把在途包纳入断言。

## 二、逐项验收

1. **干净环境**：通过。清空全部 `node_modules` 后重装，目标两包测试/ lint / build 全部实测通过。原实现缺少包级 `test`/`lint` 脚本，导致过滤命令未实际执行；已用 `fix-by-acceptance` 提交修复。

2. **契约核心语义**：通过。失败分支类型为 `{ verified:false, reason, message, checkedAt }`，无 `data` 字段；测试显式断言失败 envelope 中 `'data' in result` 为 false。六个 reason 均存在：`timeout` / `not_configured` / `not_implemented` / `adapter_error` / `invalid_response` / `out_of_coverage`。输入非法抛 `ToolInputValidationError`，且 adapter 不会被调用。超时路径会触发 `AbortSignal.aborted`，有测试覆盖。

3. **sourceId 机制**：通过。`ToolAdapter.sourceId` 构造期声明，`defineTool` 校验非空；缓存键为 `toolId + sourceId + stable input`。存在同一 tool id 下不同 sourceId 共享缓存不串的测试，且 `cacheKeyFor('party-verify','mock',input)` 与 `demo-fixture` 不同。

4. **缓存语义**：通过。执行器只缓存 `verified:true`；`adapter_error` 和 `out_of_coverage` 等失败家族不会缓存；TTL 过期、惰性淘汰、稳定序列化均有测试。demo-fixture 成功结果经统一执行器进入成功 envelope，因此可缓存。

5. **三种适配器**：通过。`mock` 固定 `sourceId:'mock'` 且零配置；`demo-fixture` 固定 `sourceId:'demo-fixture'` 且只接受注入 lookup；真实骨架 `qcc` / `public-law-db` 凭证走 config，未配置降级 `not_configured`，配置齐备仍诚实降级 `not_implemented`，无伪造请求/响应映射。测试覆盖“无凭证不回落 mock/demo”。

6. **demo-data 解耦纪律**：通过。`packages/tools/src/party-verify.ts` 与 `cite-check.ts` 生产源码零 import `@courtwork/demo-data`；`@courtwork/demo-data` 仅在 `packages/tools/package.json` 的 `devDependencies` 中，且只在两个 `*.test.ts` 集成烟雾测试中导入。`packages/demo-data/src` 只读 JSON 并提供访问器，未 import tools 契约类型，未实现工具业务逻辑。

7. **语料互锁**：通过。`party-verify` 的 out_of_coverage 集成测试从 `listPartyOutOfCoverage()` 取 manifest/语料名单，不硬编码具体主体。citation 访问器为 statute 类记录派生 `officialTextVerified:false`，测试覆盖所有 effective/repealed 条目默认 false；demo case 不附加该字段，符合 SPEC 说明。

8. **虚构纪律抽查**：通过，未发现疑似真实主体需要架构拍板。`party-verify.json` 共 22 条主体，信用代码全部 `DEMO` 前缀，且无真实 18 位社会信用代码格式。`cite-check.json` 为 57 条现行法条、7 条已失效旧法、3 条 demo 判例；法条带版本/来源标识，虚构判例案号与法院均含“虚构”标记。

9. **工程决策尊重**：通过。根 `typescript` 保持 `^6.0.3`，未升级；两个包各自声明 `@types/node` devDependency，并在 tsconfig 中 `"types":["node"]`；`import.meta.dirname` 使用与根 engines `node >=22` 一致。实测 Node 为 `v25.9.0`。

10. **提交卫生**：部分通过。`9409c0c` 恰好 22 个文件；但其中含 `CLAUDE.md` 与 `pnpm-lock.yaml` 两个根文件，并非“全在两包范围内”。两份 SPEC 验收记录含 sourceId 重构、fixtures 降级/装配点修正等中途修正，记录充分。该提交范围偏差属流程记录问题，不影响当前 W6 消费面；本次验收不改历史提交，仅在此如实记录。

## 三、修复记录

- `1f81224 fix-by-acceptance: make tools demo-data filtered scripts run`
  - 给 `packages/tools` 与 `packages/demo-data` 补充 `test` / `lint` 脚本。
  - 修复前：`pnpm --filter @courtwork/tools --filter @courtwork/demo-data test` 退出 0 但未实际运行测试；`lint` 报 selected packages 无 lint script。
  - 修复后：过滤命令实际执行，测试口径为 tools 66 + demo-data 15。

## 四、放行结论

`packages/tools`：**放行 W6 core 使用**。统一工具契约、失败降级、缓存、sourceId、防冒充、三适配器边界均满足 W5/W5.1 验收要求。

`packages/demo-data`：**放行演示装配消费**。作为 dev/test 语料与 typed accessors 可支撑 W6 装配点投影；生产装配点仍应在 W6 实现，不应把 demo-data import 进 tools 生产源码。
