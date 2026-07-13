# W7 验收报告：eval 评测框架与数据集骨架

验收日期：2026-07-09  
验收角色：Codex（验收工程师）  
结论：**不完全放行**。功能链路已实测可跑，mock provider 下可作为机制验证；但“promptfoo 专有边界只允许在 `src/promptfoo/` 与配置文件出现”这一硬条件未完全满足，因此 **eval 暂不应作为正式模型选型与回归门禁启用**（真实 provider 跑分除外事项另记）。

## 0. 验收中修复

- 已提交独立实现级修复：`f83fb7f fix-by-acceptance(eval): run full eval test suite`
- 修复内容：`eval/package.json` 原 `test` 脚本在包内定向运行时只跑到 8 个测试文件 / 38 个用例，未覆盖 `eval/src/rules/**` 等嵌套测试。已改为从仓库根运行 `vitest run eval/src`。

## 1. 干净环境与基础命令

结论：**通过（含验收修复后复测）**。

实测命令与结果：

- `rm -rf node_modules && pnpm install`：通过，Scope 为 7 个 workspace projects，安装 `typescript 6.0.3`。
- `pnpm --filter @courtwork/eval test -- --run`：通过，**12 个测试文件 / 57 个用例**。
- `pnpm test -- --run`：通过，**34 个测试文件 / 253 个用例**。
- `pnpm lint`：通过。
- `pnpm -r run build`：通过。

假绿防护：已核对输出均有真实 Test Files / Tests 计数；原 eval 定向测试口径不符已修复并提交。

## 2. 硬条件一：跑分器无关性

结论：**部分通过，存在硬条件缺口**。

通过项：

- 抽查 `eval/datasets/S3/**/case.json` 与 `eval/datasets/S4/**/case.json`，未发现 `promptfoo` 字符串。
- 数据集 schema 为 `{id, scenario, caseType, task, expectedAnswer, scoringRules, sourceRefs}`，case 文件未包含 promptfoo 的 `vars` / `assert` / provider 配置字段。

缺口：

- `rg -ni "promptfoo|vars|assert|llm-rubric|javascript|provider" eval/datasets eval/src eval/scripts eval/promptfoo eval/judges --glob '!eval/src/promptfoo/**' --glob '!eval/promptfoo/**'` 显示，promptfoo 专有输出结构与词汇仍散落在 `eval/src/report.ts`、`eval/src/regression.ts`、`eval/src/runner.ts`、`eval/src/mock-providers/**`、`eval/scripts/**` 的类型、注释或实现中。
- 这不污染 `datasets/`，但没有满足验收清单中“专有词汇只允许出现在 `src/promptfoo/` 适配层与其配置文件”的硬边界。

处置：标为实现边界缺陷，建议后续把 promptfoo CLI runner、mock provider、结果 JSON 解析/报告/回归适配统一收敛进 `src/promptfoo/` 或提供中性内部结果格式，脚本只调用中性 API。

## 3. 硬条件二：SPEC 记录

结论：**通过**。

`eval/SPEC.md` 已记录：

- DeepEval 因 Python/pytest 工具链运维税，降级为方法论参考；
- promptfoo 规则评分 + llm-rubric 双轨当前足以表达指标；
- 两个重估触发条件：出现双轨表达不了的指标；W8 引入 uv/Python 环境后边际成本下降。
- 真实 provider 跑分待凭证已作为 TODO 记录。

## 4. 数据集溯源纪律

结论：**通过**。

实测：

- `eval/datasets` 共 40 个 case，脚本校验 `sourceRefs` 指向的 `packages/demo-data/data/**` 文件均存在，缺失数 0。
- 抽查 6 例：`main-risk-01`、`neg-main-price`、`variant-v02-one-sided-liability`、`draft-contradiction-3-acceptance-dispute`、`draft-risk-04-ownership-transfer`、`draft-assignment-defense`。
- 正例可回到 `contracts/main-contract.md`、`artifacts/risk-list.json`、`contracts/variants/**`；负例取自主合同干净条款或变体干净条款；S4 矛盾/风险/补充议题均能回到 `case-bible.md`、起诉状/答辩状或 `risk-list.json`。
- 未发现编造的平行事实。

## 5. 双轨纪律与规则评分

结论：**通过**。

核对结果：

- 5 个规则评分器齐备：`schemaValid`、`riskListMatch`、`citationExists`、`factConsistency`、`revisionSetMatch`。
- 2 份 judge prompt 已入版本管理：`judges/s3-risk-quality.judge.md`、`judges/s4-draft-quality.judge.md`，且开头明确只评规则覆盖不到的文字质量。
- `riskListMatch` 同时覆盖召回与精确：正例按引用重叠匹配风险点；负例中候选虚构风险会失败，相关防假阳性测试存在。
- `citationExists` 递归抽取 `citation` 字段，并调用 `@courtwork/demo-data` 的 cite-check registry 校验。
- `revisionSetMatch` 校验 S4 `locator.quote` 必须存在于源文档。
- 生成数据中的 SourceAnchor 对象共 22 个，脚本补验两条跨字段规则（`bbox`/`textRange` 至少一个；有 `bbox` 必须有 `page`），违规数 0。

## 6. E2E 实测

结论：**通过**。

实测命令：

- `pnpm --filter @courtwork/eval exec tsx scripts/verify-s3-dataset.ts`：20/20 标准答案满分。
- `pnpm --filter @courtwork/eval exec tsx scripts/verify-s4-dataset.ts`：20/20 标准答案满分。
- `pnpm --filter @courtwork/eval exec tsx scripts/run-eval.ts --scenario S3`：输出 `reports/S3-results.json` 与 `reports/S3-comparison.md`。
- `pnpm --filter @courtwork/eval exec tsx scripts/run-eval.ts --scenario S4`：输出 `reports/S4-results.json` 与 `reports/S4-comparison.md`。

观察到的差异化模式：

- S3：40 行结果；mock-thorough 20/20 通过；mock-fast 19/20 通过。唯一失败为 `main-holistic`，`riskListMatch` 显示 5/6 命中，漏 `risk-06`。
- S4：40 行结果；mock-thorough 20/20 通过；mock-fast 5/20 通过。失败项由 `citationExists` 抓到“未包含任何 citation 字段”。

回归模式：

- `regression-check` 对 S3/S4 baseline vs current 均对比 40 个 provider × caseId 组合，零回归。
- 人为注入 S3 `mock-thorough/main-risk-01` 分数从 0.925 降到 0.200 后，脚本非零退出并精确报告 1 处回归。
- S3 baseline/current caseId 跨 run 匹配稳定：40/40，无 missing/added。

## 7. workspace 改动最小化

结论：**通过**。

- `pnpm-workspace.yaml` 仅纳入 `eval` workspace。
- `vitest.config.ts` 仅把 `eval/src/**/*.test.ts` 加入测试 include。
- 验收期间仅由我新增一个实现级修复提交，改动 `eval/package.json` 的 test script。

## 8. 工程决策尊重

结论：**通过**。

- 根 `package.json` 保持 `typescript: ^6.0.3`。
- 各包使用 `@types/node` 包内 devDependency 模式。
- 未发现真实凭证。
- 真实模型 id 只在 `eval/promptfoo/S3.promptfooconfig.yaml` 注释示例、`eval/SPEC.md` TODO 或测试样例中出现；生产代码未写死真实 provider 跑分目标。
- “真实 provider 跑分待凭证”已写入 `eval/SPEC.md` TODO。

## 9. 提交卫生

结论：**通过，另有非 W7 提交需注意**。

- W7 相关提交按层次拆分：judge、dataset、promptfoo adapter/mock、runner/report/regression、SPEC 记录。
- 验收修复为独立提交：`f83fb7f fix-by-acceptance(eval): run full eval test suite`。
- 当前工作区干净。
- 验收期间曾出现一个非 eval 的 `docs/decisions/ADR-002-schema-workflow.md` 未跟踪文件，随后成为独立文档提交 `67c66cd`，与本次 W7 验收无关，未纳入我的修复范围。

## 最终结论

W7 的**功能机制**已经成立：S3/S4 数据集各 20 例、规则 + judge 双轨、mock provider E2E、对比报告、回归模式与 caseId 匹配均经实测通过。

但因硬条件一仍有缺口，promptfoo 专有边界尚未完全收敛，**本次不放行 eval 作为正式模型选型与回归门禁使用**。修复该边界后，可复跑本报告第 1、2、6 项作为补验；真实 provider 跑分仍按 SPEC TODO 留给有凭证的会话建立第一份真实基线。

---

## 整改记录（W7.1，2026-07-10）

本节由实施本次整改的会话追加，Codex 原文（以上第 0-9 节及"最终结论"）未做任何改动。

针对第 2 节"硬条件一：跑分器无关性"标出的缺口，已完成以下整改（完整清单与自证
细节见 `eval/SPEC.md` "W7.1 整改记录"小节）：

- 新增中性内部结果格式 `EvalRunResult`/`EvalRunResultSet`（`src/results.ts`：
  `runId`/`caseId`/`provider`/`pass`/`score`/`ruleResults`/`judgeResults`/
  `timings`/`cost`/`tokensUsed`）。
- `src/promptfoo/` 收拢为唯一边界：新增 `raw-results.ts`（promptfoo 原始结果
  类型）、`map-results.ts`（原始结果 → 中性格式映射）；CLI runner（原
  `src/runner.ts`）迁入 `src/promptfoo/runner.ts`，内部完成调用 + 解析 + 映射，
  对外只返回/落盘中性格式；三个 mock provider 与 `degrade.ts` 迁入
  `src/promptfoo/mock-providers/`。
- 规则聚合逻辑下沉为中性纯函数 `evaluateCase`（`src/rules/evaluate.ts`），
  `src/promptfoo/run-rules.ts` 收窄为"vars JSON 字符串 → 中性参数"的薄适配层。
- `report.ts`/`regression.ts`/`scripts/**`（`run-eval.ts`/`regression-check.ts`/
  `verify-s3-dataset.ts`/`verify-s4-dataset.ts`）全部只消费中性格式；后两者不再
  import `src/promptfoo/`。
- `dataset-schema.ts`/`rules/types.ts` 等非适配层文件注释里残留的字面
  "promptfoo" 一并清理（含 1 处自证阶段补发现的路径引用残留，独立 fix 提交）。
- 既有回归基线文件选择**重建**（`reports/` 整体 `.gitignore`，原内容仅 mock
  provider 机制验证、非真实基线），未编写迁移脚本。

复跑本报告第 1、2、6 项对应的全部命令自证：

- 第 1 项：`rm -rf node_modules && pnpm install`（7 个 workspace projects，与本
  报告一致）、`pnpm --filter @courtwork/eval test -- --run`（**14 个测试文件 /
  64 个用例**，较本报告的 12/57 增加 `evaluate.test.ts`+`map-results.test.ts`）、
  `pnpm test -- --run`（**51 个测试文件 / 351 个用例**，全仓库计数含本报告之后
  其他层新增的测试）、`pnpm lint`、`pnpm -r run build` 均**通过**。
- 第 2 项：与本报告完全相同的 rg 命令复跑，剩余命中逐行核对后全部是 (a) 中性
  `provider`/`providerId` 字段（本报告"处置"一节建议的中性内部结果格式已落地，
  该格式明确包含 `provider` 字段，不属于跑分器专有词汇）、(b)
  `scripts/run-eval.ts` 里 2 处对 `src/promptfoo/` 的结构性路径引用（import 适配
  层入口 + console.log 提示配置文件位置）。精确到真正专有词汇集合的补充扫描
  （`promptfoo|llm-rubric`、word-boundary 精确匹配的 `vars`/`assert`/
  `javascript`）证实：`vars`/`assert`/`javascript` **零命中**；`promptfoo` 仅剩
  上述 2 处路径引用，无法进一步消除（脚本必须知道适配层入口在哪里才能调用它）。
- 第 6 项：S3/S4 数据集健全性检查 20/20 通过（两场景）；`run-eval.ts` 实测真实
  调用 `npx promptfoo eval`（非仅单元测试）跑通——S3 mock-thorough 20/20、
  mock-fast 19/20（唯一失败 `main-holistic` 缺 `risk-06`）；S4 mock-thorough
  20/20、mock-fast 5/20（退化剥掉引用被 `citationExists` 抓到）——失败模式与
  本报告描述完全一致；回归模式在中性格式上复验：两场景 40/40 用例可比、零回归，
  人为注入一处降分（`mock-thorough/main-risk-01`，0.925→0.425）后
  `regression-check.ts` 精确报告该 1 处回归并以非零码退出。

请 Codex 按原报告第 1、2、6 项标准补验。
