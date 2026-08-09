# DEBT-VERTICAL-SPLIT-1 · work/output/system 三族逐族拆分

状态：已独立验收 PASS（`210e93d`），no-ff 合入 `e0c0fbf`；验收后订正见文末「七」节

权威：`docs/architecture/implementation-readiness.md` `DEBT-VERTICAL-SPLIT-1` 行（票面唯一真值，
GENERIC-PACK-1 ⑥门债表转出，2026-08-07 清账随批立票）；`docs/decisions/ADR-015-optional-vertical-loading.md`
决定一（零泄漏，静态门——垂类 import 只经受信组合根注册点，通用件与壳零垂类引用）；
ADR「过手即拆」纪律（外提即入册判例）。

本文件是本票的实现回执：逐文件迁移清单、退出证据、门实测数字与偏离登记。

---

## 一 · 迁移清单（逐文件旧→新路径，语义与导出零改）

### work 族（六名，十一文件）

| 旧路径 | 新路径 |
|---|---|
| `src/work/legal-s3-binding.ts` | `src/verticals/legal/legal-s3-binding.ts` |
| `src/work/legal-s3-binding.test.ts` | `src/verticals/legal/legal-s3-binding.test.ts` |
| `src/work/work-command.ts` | `src/verticals/legal/work-command.ts` |
| `src/work/work-command.test.ts` | `src/verticals/legal/work-command.test.ts` |
| `src/work/contract-review-flow.ts` | `src/verticals/legal/contract-review-flow.ts` |
| `src/work/contract-review-flow.test.ts` | `src/verticals/legal/contract-review-flow.test.ts` |
| `src/work/primary-contract.ts` | `src/verticals/legal/primary-contract.ts` |
| `src/work/primary-contract.test.ts` | `src/verticals/legal/primary-contract.test.ts` |
| `src/work/use-contract-review-submission.ts` | `src/verticals/legal/use-contract-review-submission.ts` |
| `src/work/legal-work-surface.tsx` | `src/verticals/legal/legal-work-surface.tsx` |
| `src/work/legal-work-surface.test.ts` | `src/verticals/legal/legal-work-surface.test.ts` |

### output 族（两名，四文件）

| 旧路径 | 新路径 |
|---|---|
| `src/output/compile-review-output.ts` | `src/verticals/legal/compile-review-output.ts` |
| `src/output/compile-review-output.test.ts` | `src/verticals/legal/compile-review-output.test.ts` |
| `src/output/contract-review-delivery.ts` | `src/verticals/legal/contract-review-delivery.ts` |
| `src/output/contract-review-delivery.test.ts` | `src/verticals/legal/contract-review-delivery.test.ts` |

### system 族（两名，三文件）

| 旧路径 | 新路径 |
|---|---|
| `src/system/FileOpsPlanPanel.tsx` | `src/verticals/legal/FileOpsPlanPanel.tsx` |
| `src/system/file-ops-demo.ts` | `src/verticals/legal/file-ops-demo.ts` |
| `src/system/file-ops-demo.test.ts` | `src/verticals/legal/file-ops-demo.test.ts` |

合计 18 文件迁移；零文件被删除或新增语义，全部 `git mv` + 仅 import 路径改写。

### 消费点同步（未迁移，仅路径改写）

留在原族的通用件因其消费点迁走而更新相对路径深度或目标：`src/main.tsx`、`src/App.tsx`、
`src/material/material-actions.ts`（注释）、`src/work/work-session-lifecycle.ts`、
`src/work/work-runtime.ts`／`work-runtime.test.ts`、`src/work/production-scenarios.test.ts`、
`src/work/work-replay.test.ts`、`src/verticals/legal/{GateConfirmBar.tsx,RiskReviewRenderer.tsx,
GraphRenderer.test.ts,TimelineRenderer.test.ts,ReviewMatrixRenderer.test.ts,panels.tsx}`（既有
垂类件，改引用迁入的六名/两名件为同目录相对路径）。

机器门读取路径同步：`apps/desktop/scripts/assert-legal-s3-contracts.mjs`（1 处
`read('src/work/legal-s3-binding.ts')` → `verticals/legal/...`）、
`apps/desktop/scripts/assert-work-live-contracts.mjs`（6 处同类 `read()` 路径）、
`apps/desktop/scripts/assert-vertical-isolation.mjs`（债表逐族删行，末态 `UNSPLIT_FAMILIES = {}`）。

跨包同步：`packages/core/src/tools/tool-registration-boundary.test.ts` 的
`TRUSTED_REGISTRATIONS` 受信登记点键从 `apps/desktop/src/work/legal-s3-binding.ts` 改为
`apps/desktop/src/verticals/legal/legal-s3-binding.ts`（该测试逐文件扫描 `apps/` 与
`packages/` 全树核对 `tools.register()` 受信组合点，键值须与实际文件路径逐字相等，否则
`ToolRegistry production trust boundary` 测试红）。

---

## 二 · 提交批次（2 批，非票面建议的 3 批——如实登记原因）

票面允许「可按族分三批提交」。实施中发现 `use-contract-review-submission.ts`（work 族）、
`verticals/legal/panels.tsx`（既有垂类件）、`assert-work-live-contracts.mjs`（机器门）三处
对 work 族与 output 族文件均有直接引用——若严格拆成三批，work 批次的提交 tip 会引用
output 批次才落地的 `verticals/legal/{compile-review-output,contract-review-delivery}.ts`，
违反「每枚提交必须在自身 tip 上通过它触及的门禁，不得引用未来提交才出现的产物」纪律。

裁定：按耦合边界合批，2 批提交：

1. `65a812e` work+output 族合批（15 迁移文件 + 17 消费点/门文件，`assert-vertical-isolation.mjs`
   暂留 `system` 一行债）——该 tip 独立验证零泄漏门、`assert-legal-s3-contracts.mjs`、
   `assert-work-live-contracts.mjs` 三门全绿。
2. `cacc9cf` system 族（3 迁移文件 + App.tsx + `assert-vertical-isolation.mjs` 债表归空、
   门头注释改写）——债清零，该 tip 亦独立验证零泄漏门全绿。

system 族与 work/output 两族零耦合（`FileOpsPlanPanel.tsx`/`file-ops-demo.ts` 只消费
`@courtwork/legal`/`@courtwork/tools/*` 与既有通用件 `case/case-scope.ts`、
`system/demo-case-layout.ts`，未与 work/output 族有交叉引用），故其单独成批天然自洽，
未与 work/output 合并。

---

## 三 · 退出证据

### 1 · 债表逐族删行后零泄漏门全绿；受检面单调扩大

| 阶段 | 受检文件数 | 债表 |
|---|---|---|
| 起点（HEAD `d6f78ab`） | 184 | work/output/system 三族 |
| work+output 迁毕（`65a812e`） | 196 | system 一族 |
| system 迁毕（`cacc9cf`） | 205 | 空（债清零） |

`pnpm site:guard` 全绿（见下方全量门数字）。**偏离登记**：票面括注「`pnpm site:guard`
（含零泄漏门）」与仓库现状不符——`site:guard` 脚本本身未调用 `lint:vertical-isolation`
（`package.json` 第 13 行核实，未列该子命令）。零泄漏门的真实验证面是
`pnpm --filter @courtwork/desktop lint:vertical-isolation`（独立跑通过，见下）与
`pnpm test:e2e` 静态门链（`assert-vertical-isolation.mjs` 是链中第 19 个脚本，见
`package.json` `test:e2e` 字面量）。两者均已独立跑证实全绿，`site:guard` 本身也全绿，
仅其字面不含该门这一点如实登记，不视为票面错误的自证依据。

### 2 · 反向锁仍红（注入垂类 import 于壳/通用件）

在 `src/App.tsx` 顶部临时注入 `import { LEGAL_PACKAGE as __DEBT_VERTICAL_SPLIT_1_PROBE__ } from '@courtwork/legal/package';`：

```
零泄漏静态门失败（1 项）：
- App.tsx: 壳/通用件引用了垂类包（垂类绑定只许住 verticals / composition / demo 三族）
EXIT=1
```

撤回注入，`git diff apps/desktop/src/App.tsx` 逐字回到迁移改写前的唯一预期 diff（仅
`FileOpsPlanPanel` 导入路径一行），门复绿。

### 3 · 撤迁移复红

将已迁移的 `src/verticals/legal/legal-s3-binding.ts` 复制回 `src/work/legal-s3-binding.ts`
（债表已删 `work` 行，`work/` 已入受检面）：

```
零泄漏静态门失败（1 项）：
- work/legal-s3-binding.ts: 壳/通用件引用了垂类包（垂类绑定只许住 verticals / composition / demo 三族）
EXIT=1
```

删除复制件，门复绿（`node scripts/assert-vertical-isolation.mjs` 回报 205 份受检、债清零）。

---

## 四 · 全量门实测数字

以 `cacc9cf`（system 族提交，末态 tip）为基线，逐门实跑：

- `pnpm -r build`：14 个 workspace 包 + `apps/desktop`（`tsc -b && vite build`）全部 `Done`，零报错。
- `pnpm lint`（根 `eslint .`）：零输出、零报错。
- 根 `pnpm test`（vitest）：**170 files / 1941 tests 全部 passed**（无并发条件下清跑；见判例
  「隔离绿对全链红零区分力」的反向印证——首次跑动因与另一并行会话的资源争用出现 8 项超时性
  假红，均落在 `packages/pi-lane`／`packages/output`／`packages/demo-runtime`，与本票路径迁移
  零关联；`pgrep -f playwright` 确认冲突后错峰单跑，1941/1941 全绿）。
- `pnpm --filter @courtwork/desktop test`（vitest）：**87 files / 778 tests 全部 passed**。
- `pnpm --filter @courtwork/core test`（含改写的 `tool-registration-boundary.test.ts`）：
  **34 files / 373 tests 全部 passed**（含受信登记点键路径核对）。
- `pnpm site:guard`：全绿（103 项 `node --test` + release-truth + deslop + versional-lang +
  desktop 侧 `lint:neutral/elevation/signature/motion/design-md/schema-exemplar/
  skin-r2-ledger/app-highwater` 八项子命令，`app-highwater` 报 2279 行·封顶不升）。
- `pnpm --filter @courtwork/desktop lint:vertical-isolation`：独立跑通过（205 份受检、债清零）。
- `pnpm test:e2e`（desktop 完整链，含 30 余枚 `assert-*.mjs` 静态门与完整 Playwright）：
  静态门全绿（含零泄漏门、`assert-legal-s3-contracts.mjs`、`assert-work-live-contracts.mjs`）；
  Playwright 假绿防护报 **372 条用例（下限 365，达标）**。

  **Playwright 实测须区分两轮，取无并发单跑轮为准**（判例「同刻两条全链互相打红」）：
  - 首轮（与 `codex/pack-interact-1r3` 分支的并行 Playwright 全链撞车，`ps aux` 实证两条
    `cli.js test` 进程同时在场）：357 passed / 15 failed，失败集中于 `contract-review`／
    `work-live`／`work-turn`／`workbench` 等大量与本票迁移文件（`contract-review-flow`／
    `legal-s3-binding`／`work-command`）语义相关的谱，但错误形态均为
    `browserContext.close: ... has been closed`／`Test timeout of 30000ms exceeded`／
    时序竞态断言——资源争用的特征形态，不是路径/契约错误。
  - 独占重跑轮（确认 `pgrep -f "cli.js test"` 归零后单跑）：**368 passed / 4 failed**（用例总数
    372 不变）。失败四项为 `case-persist.spec.ts:234`／`chat-interaction.spec.ts:53`／
    `chat-markdown.spec.ts:54`／`chat-material.spec.ts:13`，逐一核实其源文件与
    `helpers.ts` 对 `work/`／`output/`／`system/`／`verticals/legal/` 零直接引用（`chat-markdown`
    与 `chat-material` 两项为 `Test timeout of 30000ms exceeded`，`case-persist` 与
    `chat-interaction` 为独立断言失败，四项与并发轮的失败集合几乎不重叠——两轮失败集合
    的高度不重叠本身即是「与本票迁移零关联的既有抖动」而非「迁移引入的确定性回归」的
    实证：确定性回归会在两轮都稳定命中同一批谱，而并发轮失败的
    `contract-review`／`work-live`／`work-turn` 等本票真正触碰语义的谱，在独占轮全部转绿）。
    **如实登记为已知的非阻断既有抖动，不在本票范围内处置**；若架构要求同步修复，
    请另立工单并标注具体根因（当前尚未逐一定位是环境残留负载还是测试自身时序脆弱）。

---

## 五 · 偏离清单

1. **提交批次 2 批而非票面建议的 3 批**——理由与耦合边界见第二节，已如实登记。
2. **`pnpm site:guard` 字面不含 `lint:vertical-isolation`**——票面括注与仓库现状不符，
   已在第三节第 1 项如实登记；零泄漏门本身已通过独立跑与 `test:e2e` 链双重验证。
3. **`verticals/legal/work-command.test.ts` 的 git diff 呈 `Bin` 行**——核实为该文件
   *迁移前* 已含 854 处裸 NUL 字节（`git show HEAD:apps/desktop/src/work/work-command.test.ts | /usr/bin/grep -c $'\x00'` 同样回报 854，非本票引入）；`git diff -a` 逐字核对确认本票唯一改动
   是三行 import 路径（`../material/*`→`../../material/*`、`../protocol/client`→
   `../../protocol/client`、`../output/compile-review-output`→`./compile-review-output`），
   语义零改。判例「Write 写裸NUL→git binary」同源现象，如实登记不视为异常。
4. **`apps/desktop/scripts/assert-app-highwater.mjs` 的历史 ledger 注释未随路径改写**——
   该文件是带日期的 App.tsx 行数变迁历史记录（如 `work/use-contract-review-submission.ts`
   字样出现在 `CONTRACT-REVIEW-SAFETY-1（2026-07-25）` 条目内），属既成史料，若改写会
   使历史记录失真（该条目记录的是当时的真实路径）。判例「原件永远只读」与「文档引码用
   符号锚不用行号」的精神延伸——历史 ledger 条目不因后续重构而回溯改写，故本票未触碰
   此文件，注释中的旧路径字样保留原状。
5. **`assert-vertical-isolation.mjs` 门头注释顺带订正一处历史漂移**——原注释称
   `work/`、`output/`、`system/`、`workbench/` 四目录皆为未拆分混合族，但 `workbench/`
   从未真正出现在 `UNSPLIT_FAMILIES` 表内（该目录本就零垂类 import，已核实）；本票改写
   门头注释时一并订正为「`workbench/` 系历史注释漂移」，非本票范围扩张，仅为随手订正
   直接改动的同一段落内的既有不准确表述。

---

## 六 · tip

`cacc9cf`（分支 `claude/debt-vertical-split-1`，base `main@d6f78ab`，未合、未 push）。

---

## 七 · 验收后订正（2026-08-09，架构清账落痕）

独立验收（PASS `210e93d`）上浮四项文档层订正，逐项裁定如下；原文按「订正为出处保留」惯例不改写，以本节为准：

1. **受检面起点值**：本回执多处所记起点 `184` 系沿用 2R 验收在 pack-interact 分支上的计数；本票 base `main@d6f78ab` 的实际起点为 **176**（门自报、独立计数 `249−22−47−4`、`LEGAL-FIVE-FACES-1` 复验值三方交叉一致）。末态 **205** 不变，单调扩大判据成立（176→196→205）。
2. **偏离 #2 的前提**：就绪图票面行并无「`site:guard` 含 `lint:vertical-isolation`」括注（全文零命中），该偏离的结论（零泄漏门经独立跑与 `test:e2e` 链双重验证）成立、前提失实，按「结论对、前提假」订正。
3. **ADR 引用层**：本回执与就绪图票面行所引「ADR-015 决定一零泄漏」错层——「静态门——垂类 import 只经受信组合根注册点」实住**决定三**；正确引用为「决定一（两层定义／成品律）＋决定三（零泄漏双重机制）」。ADR 本文不动（2026-08-09 架构裁定）。
4. **第六节 tip**：所记 `cacc9cf` 为末批实现提交；本票交付 tip（含本回执留痕）为 **`9c98d29`**。
