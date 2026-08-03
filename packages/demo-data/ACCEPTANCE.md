# packages/demo-data 独立验收

## PM-FIXTURE-1 独立验收（2026-07-14）

- **验收角色**：未参与 PM-FIXTURE-1 实现的独立验收会话；此前只实现 HARNESS-KERNEL-1。
- **对象**：实现 `7cddd59bbc789882b53e1bbf8358e3db758e3ef6`，基线 `7e5c705503177ace635bcf8085939269e34e6029`。
- **验收树**：独立 clean worktree `/tmp/courtwork-pm-fixture-1-acceptance`，分支 `codex/accept-pm-fixture-1`；未在共享主树 checkout/stash，未合入 main。
- **结论**：**✅ 放行。** 两份 PM catalog fixture、材料、锚点、交叉引用与只读 accessor 满足 ADR-012 和本层 SPEC。无生产实现缺陷、无 schema/契约问题、无 `[需架构拍板]` 项。

### 1. 范围与真值审核

实现仅在 `data/pm/` 增加固定的 6 文件全集：案情册、manifest、两份材料与 `PrdReview` / `FeedbackDigest` 两份 artifact；accessor 只在模块加载时读取、用公开 `@courtwork/pm` schema 解析并递归冻结。包依赖和 lockfile 只增加 `@courtwork/pm` workspace link；没有旧 npm alias、第二份 schema、scenario、prompt、PriorityScore、live harness、企业接口、React/CSS 或产品 UI。

独立读取原始 JSON/Markdown 得到：

- PrdReview：6 条 finding，六类 defect 各一次，全部 `pending`；
- FeedbackDigest：5 个渠道、2 个双向闭合 cluster、1 个 `out_of_coverage`；
- 锚点共 15 次出现、11 条唯一引语；每次均逐字回到指定材料；
- `01-prd.md` 为 272 个 UTF-16 code units / 271 code points，SHA-256 为 `8adf1e571a47a6016786819d61201fe084c2026e256319dbf84ae78c3caa4042`；
- `02-feedback.md` 为 279 个 UTF-16 code units / 278 code points，SHA-256 为 `ba5c16a8b3f32cdf117017b93b126e49a6899b36b6a8fb6236e20d2204005a6c`。

首枚锚之前的 surrogate 字符使 UTF-16 与 code-point offset 可观测地不同，不是只在文档中口头声明坐标口径。

### 2. 实际反例矩阵

所有生产/fixture 变异均在独立树逐项注入、观察红灯，再精确撤回；最终 `data/pm/**` 与 accessor 均无 mutation 残留。

| 反例 | 实测结果 |
|---|---|
| 新增第 7 个文件 | 文件全集门 **1 failed / 6 skipped**，精确列出 `extra.md`。 |
| 删除 `case-bible.md` | suite 在 accessor 模块加载时以 `ENOENT` 失败，零测试假绿。 |
| 删除 manifest 显式“虚构…水印”行 | 原守卫因正文另有“虚构”字样错误通过；补强为显式水印行后 **1 failed / 6 skipped**。 |
| 删除一种 PRD defect | **1 failed / 7 skipped**，精确缺 `untestable`。 |
| 重复 defect type | **1 failed / 7 skipped**，显示重复 `vague-metric`、缺 `untestable`。 |
| finding 改为 `confirmed` | **1 failed / 7 skipped**，all-pending 断言失败。 |
| 删除 schema 必填 `projectId` | accessor 加载时由公开 PrdReviewSchema 抛 ZodError。 |
| 两 artifact 使用不同 `DEMO-*` projectId | 原门错误通过 8/8；补交叉 ID 守卫后 **1 failed / 7 skipped**。 |
| `documentId` 错连反馈材料 | 新 ID 守卫 **1 failed / 7 skipped**，期望 `01-prd.md`、实际 `02-feedback.md`。 |
| finding id 重复 | **1 failed / 7 skipped**，唯一 id 数 5 ≠ 6。 |
| item 指向不存在的 cluster | accessor 加载时由 FeedbackDigestSchema 明确拒绝 `cluster-missing`。 |
| cluster 漏掉仍指向它的 member | 双向闭合门 **1 failed / 7 skipped**，`feedback-02` 缺失。 |
| 渠道收窄为 2 类 | **1 failed / 7 skipped**，2 不满足至少 3。 |
| OOC 被挂入 cluster | schema 以“clusterId 与 rootCause 均为 null”拒绝。 |
| OOC rootCause 非 null | 同一 closed schema 门拒绝。 |
| textRange `start=0` | **1 failed / 7 skipped**，明确要求 start > 0。 |
| end off-by-one | **1 failed / 7 skipped**，slice 少末尾句号。 |
| 以 code-point offset `86..105` 代替 UTF-16 `87..106` | **1 failed / 7 skipped**，slice 多前导换行且少句号。 |
| clause/quote 同步改写而坐标不变 | **1 failed / 7 skipped**，改写值与材料原文 slice 不同。 |
| textLayerVersion 换成伪 64 位 hash | **1 failed / 7 skipped**，与完整材料 SHA-256 不同。 |
| accessor 去掉 deepFreeze | **1 failed / 7 skipped**，顶层可变。 |
| 每次返回新鲜的递归冻结 clone | **1 failed / 7 skipped**，重复读取不再是同一 snapshot。 |
| import 改回 `@courtwork/pm-schemas` | demo-data build 以 TS2307 明确失败；没有 compatibility alias。 |
| 同时混入 PriorityScore、scenario、prompt、UI 文件 | 文件全集门 **1 failed / 7 skipped**，四项均出现在差异中。 |

### 3. 验收补强

实现数据和 accessor 本身无需修复；独立验收发现两处测试可证伪性缺口并只补测试：

1. 水印从“全文任意位置出现 `虚构`”收紧为显式引用行同时包含“虚构”和“水印”，避免正文偶然命中；
2. 新增 project/document identity 闭合：两个 artifact projectId 必须相同、必须被 case bible 登记，PrdReview.documentId 必须是权威 `01-prd.md` 且存在于材料 map。

未修改 PM schema、fixture 字节、accessor、package export、依赖或任何产品代码。

### 4. 最终门禁

- `pnpm install --frozen-lockfile`：14 workspace projects、1047 packages，lockfile 无改写。
- `pnpm --filter @courtwork/demo-data test`：**3 files / 23 tests passed**。
- `pnpm --filter @courtwork/pm test`：**6 files / 39 tests passed**。
- `pnpm --filter @courtwork/pm generate:json-schema`：四份 schema 重生成成功，git 零 drift。
- `pnpm -r build`：**13/14 workspace projects** 全绿；desktop **3521 modules transformed**，仅既有 Tauri static/dynamic import 与 chunk-size warning。
- `pnpm lint`：exit 0，零 error。
- `pnpm test`：**124 files / 1099 tests passed**。
- `git diff --check`：通过；最终 fixture/accessor mutation 全部撤回。

本单没有 desktop 行为或视觉变化，按总纲不运行 Playwright。

> **最终判定：PM-FIXTURE-1 放行 ✅。** 可合入实现 `7cddd59`、验收测试补强与本报告。放行范围只是 schema catalog/demo 权威样板；不得扩张表述为 PM scenario、PriorityScore、prompt、live harness、企业 integration 或 Pages live 场景已经完成。

4db54a1a796e004dad09edcdc67dab6b009b7a4d

## DEMO-ANCHOR-1 聚焦复验（2026-08-03，放行）

- **Exact target / 首步登记**：新建 clean clone `/Users/lesprivilege/.codex/visualizations/2026/08/03/019fc64a-7c43-79e2-9e63-b651fb0f7b65/demo-anchor-1-recheck-80WIxX` 后第一步 `git rev-parse HEAD` 输出上方完整 SHA；HEAD 精确等于 `4db54a1`，detached clean，未进入实现树。
- **八文件白名单**：`git diff 19435b4..4db54a1` 恰为 8 件：`apps/desktop/SPEC.md`、`apps/desktop/src/demo/legal-interaction.test.ts`、`apps/desktop/src/demo/legal-interaction.ts`、`apps/desktop/src/demo/recordings.ts`、`apps/desktop/src/protocol/session-event.contract.test.ts`、`packages/demo-data/SPEC.md`、`packages/demo-data/data/artifacts/risk-list.json`、`packages/demo-data/src/risk-list-anchors.test.ts`；`git diff --check` 通过，零其他实现文件。

### 判别性探针

- **G1 生产层漂移**：手改 `apps/desktop/src/demo/legal-interaction.ts:31` 的生产 `CONTRACT_TEXT_LAYER` 版本为 `acceptance-injected-production-layer-drift`，`legal-interaction.test.ts` 实测 **2 failed / 9 passed**：source-route 版本守卫与 6 focus 对齐均红；恢复生产字节后 **11/11 passed**。红来自真实生产层漂移，不是副本谓词。
- **G2 展品出口**：隔离端口 `1541`、`--workers=1` 串行运行 `output-confirm.spec.ts`，两枚 `nonapplied-confirm` 展品均出现，**2/2 passed**。
- **真实 resolver 对齐**：`legal-interaction.test.ts` 直接导入生产 `CONTRACT_TEXT_LAYER` 与真实 `DEMO_ARTIFACTS`，经真实 `resolveReaderFocus` 得到 **6 focus + 2 blocked/anchor_invalid + 5 invalid fixtures blocked/anchor_invalid**；F2 共 11 tests 通过。

### 数据、留痕与 golden

- **F1/F3**：risk-list 恰 8 枚，6 枚可定位、2 枚指定展品（risk-02[0]、risk-06[0]）；8 枚 quote 零 Markdown 标记；risk-04 精确为 `设备交付即视为风险转移至乙方`。`risk-list-anchors.test.ts` 检索不到 FNV/hash 算法；版本门只断言 6 枚可定位版本彼此相等，不重算。
- **SPEC 预裁/追认 a/b**：`packages/demo-data/SPEC.md` 记录（a）risk-01 quote 改写，（b）risk-02[0]+risk-06[0] 两枚 non-applied 展品及其 2 处出口；并记录 risk-06 basis[1] 为合同 `905..930` 原句。`apps/desktop/SPEC.md` G1/G2 留痕记录生产真源、6 focus、2 blocked、5 invalid 与 `citationStats 6/2`。
- **Golden 零受影响**：检索并核对 `packages/core/src/assembly/__golden__/assembled-request.golden.txt`（只锁 assembly wire）、`packages/demo-runtime/src/acceptance/__golden__/s3-assembly.golden.txt`（使用独立 `FIXTURE_MATERIAL`）、`packages/demo-runtime` S3 golden（使用 `@courtwork/legal/testing` 的 `S3_RISK_LIST_RESPONSE`），均不读取本票 risk-list。`reading-view` snapshot 虽出现带 `**` 的合同原句，但其测试只读 dossier/main-contract Markdown，非 risk-list 输入。desktop `session-event.contract.test.ts` 不是 golden，已按 locatable 机械派生 `citationStats`；无需重铸 golden。

### 门禁与功能出口

- `pnpm -r --workspace-concurrency=1 run build`：通过（desktop Vite 3594 modules transformed）；`pnpm lint`：通过。
- 目标包：demo-data **4 files / 34 tests**、desktop **75 files / 690 tests**、demo-runtime **8 files / 29 tests** 全绿；`pnpm --filter @courtwork/demo-runtime demo:legal` 全链通过，`generateCalls=1`、11/11 anchor first-pass resolved、retry=0、golden PASS、7 revisions applied。
- Playwright 全链：独立端口 `1543`、`reuseExistingServer:false`，静态门与 351 下限通过，实际 **351/351 passed**。
- 样板案 UI：独立端口 `1546` 实际 `risk-04 → 查看引语 → 回到原件`；DOM 恰一枚 `<mark data-testid="reader-focus-anchor">设备交付即视为风险转移至乙方</mark>`，并经 `toBeInViewport()`；截图 `/Users/lesprivilege/.codex/visualizations/2026/08/03/019fc64a-7c43-79e2-9e63-b651fb0f7b65/demo-anchor-1-recheck-80WIxX/apps/desktop/test-results/demo-anchor-4db54a1.png` 已目视确认高亮落在第七条风险转移句。
- 额外根 `pnpm test` 为 **163 files / 1667 passed，8 failed**，8 项均为 `packages/pi-lane/src/sidecar.test.ts` 的 5s sidecar 启动超时；未触及本票八文件，目标相关测试与 Playwright 均不受影响，故不将其冒充为全仓绿。

**最终判定：放行 DEMO-ANCHOR-1 ✅。** 本判定只覆盖 exact target `4db54a1` 的八文件改动、上述 resolver/展品/Playwright/runtime 证据；不覆盖根 pi-lane 环境超时，也未修改 `docs/status/current.md`、未 push、未 merge。
