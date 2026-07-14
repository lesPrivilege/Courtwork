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
