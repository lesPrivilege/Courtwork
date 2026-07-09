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
