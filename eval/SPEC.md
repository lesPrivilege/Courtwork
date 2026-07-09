# SPEC: eval（W7）

状态：已完成（当期范围）

## 职责

垂类评测集与回归跑分——"甜点区模型每代重选"机制的工程落点，也是抗上游折旧的核心资产（规划稿既定判断）。

## 架构决定：底座只用 promptfoo，DeepEval 降级为方法论参考

DeepEval 是纯 Python 包（confident-ai/deepeval，pytest 体系），本仓库是纯 TS monorepo。docs/05
选型报告选它是为了 G-Eval/忠实度这类指标，但这些指标在 promptfoo 的"规则评分 + llm-rubric"
双轨里都能表达；为边际指标引入第二套语言工具链，与本仓库一路拒绝 JVM/pandoc 之类"运维税该花
在壁垒上、不该花在工具选择上"的判断相悖。eval 层真正的资产是 `datasets/`（任务/输入/标准答案/
评分规则）与评分方法论——跑分器本身是可换的租来件，这与"schemas 自有、框架可换"是同一条原则。

**重估触发条件**（满足其一即应重新评估是否引入 DeepEval，不是永久关闭）：

1. 出现规则评分 + llm-rubric 双轨都表达不了的指标需求；
2. W8 落地、仓库已有 uv 管理的 Python 环境（services/ingest）之后，引入 DeepEval 的边际运维
   成本大幅降低。

到时候加回是增量，不是返工——因为 `datasets/` 的中性 schema（下一节）不含任何跑分器专有词汇，
换/加跑分器只需要重写 `src/promptfoo/` 这一层适配代码，数据资产原样可用。

## 评分方法论：能走规则评分的绝不上 judge

案件圣经的预埋矛盾点清单、主合同的预埋风险条款、真实法条引用都是**可程序化比对的 ground
truth**（citation 字符串匹配、schema 结构校验、`locator.quote` 在源文档中的存在性核验）。
judge 只留给"文字分析/起草质量"这类真主观维度，两份 judge 提示词（见下）都在开头明确写明
"只评估规则评分覆盖不到的维度"，避免与规则评分重复判断、也避免不必要的 judge 成本与漂移。

## 交付清单

- **底座**：promptfoo（`promptfoo/*.promptfooconfig.yaml`）。provider 一律走配置——YAML 的
  `providers:` 列表是唯一允许出现具体 provider/model id 的地方，`src/`、`scripts/` 下的代码
  不写死任何 provider。
- **评测集目录规范**：`datasets/<场景id>/<case-id>/case.json`，单文件承载
  `{id, scenario, caseType, task:{instruction, input}, expectedAnswer, scoringRules[], sourceRefs[]}`，
  schema 定义见 `src/dataset-schema.ts`（zod）。**scorer-agnostic 是硬约束，也是验收标准的一
  部分**：这份 schema 和它校验的数据完全不知道 promptfoo 的存在；`src/promptfoo/generate-tests.ts`
  是全仓库唯一允许出现 `vars`/`assert`/`type: javascript`/`type: llm-rubric` 这类跑分器词汇
  的文件。数据加载见 `src/dataset-loader.ts`。
- **双轨评分**：
  - 规则评分：`src/rules/*.ts`——`schemaValid`（对着 `@courtwork/schemas` 的 zod 定义校验，
    不额外维护 JSON Schema 副本）、`riskListMatch`（按依据引用重叠匹配风险点，不要求候选
    id 与标准答案一致；对"标准答案判定无风险"的负例同时约束假阳性）、`citationExists`
    （递归抽取所有 `citation` 字段，核对 `@courtwork/demo-data` 的 cite-check 语料）、
    `factConsistency`（核对候选输出文本里是否原样出现标准答案 `facts` 字段登记的关键
    事实）、`revisionSetMatch`（核对 `locator.quote` 是否逐字存在于源文档，抓幻觉锚点）。
    全部纯函数、逐条 TDD；聚合入口 `src/promptfoo/run-rules.ts`（`type: javascript` 断言，
    对 provider 返回的原始字符串做 JSON 解析 + 剥 markdown 代码围栏后再派发）。
  - LLM judge：`judges/*.judge.md`，版本化 markdown（随 git 历史走，SPEC 里点名版本号）。
    当前两份——`s3-risk-quality.judge.md`（风险分析文字质量）、`s4-draft-quality.judge.md`
    （起草文字质量）。
- **S3 最小评测集**：`datasets/S3/`，20 例——6 例对应主合同 `risk-list.json` 的 6 个预埋风险点
  （逐条款摘录）、1 例整体审查（全文 → 完整 6 风险点 RiskList）、4 例主合同干净条款负例
  （标准答案 `risks: []`）、9 例取材 10 份 S2 变体合同（`contracts/variants/`）中法律实质
  相同/相反的条款，复用与主合同同一批真实法条引用。生成脚本 `scripts/build-s3-dataset.ts`，
  健全性检查 `scripts/verify-s3-dataset.ts`。
- **S4 最小评测集**：`datasets/S4/`，20 例，标准答案（RevisionInstructionSet 形状）由本层
  基于 case-bible.md 事实、risk-list.json 的 6 个风险点、案件圣经第六节的 4 处预埋矛盾点、
  以及 dossier 的起诉状/答辩状文风参照手写——demo-data 的 manifest.md 明确记录"S4 尚无
  预生成 artifact，待该产物类型定稿后补充"，撰写标准答案本就是评测层的交付物，不是跨层
  缺口。生成脚本 `scripts/build-s4-dataset.ts`，健全性检查 `scripts/verify-s4-dataset.ts`。
- **多 provider 跑分脚本**：`src/runner.ts`（调用 promptfoo CLI）+ `scripts/run-eval.ts`
  （`tsx scripts/run-eval.ts --scenario S3|S4`）。
- **对比报告**：`src/report.ts`（quality × cost × latency 聚合 + Markdown 渲染 + 选型建议），
  输出到 `reports/<scenario>-comparison.md`（该目录已加入 `.gitignore`：内容可重新生成，
  且当前只用 mock provider 验证过机制，不代表任何真实基线）。
- **回归模式**：`src/regression.ts`（按 `provider × caseId` 匹配基线/当次分数，超阈值判定
  回归）+ `scripts/regression-check.ts`（`--scenario --baseline --current --threshold`，
  发现回归时以非零码退出，可接 CI）。建立基线：`cp reports/S3-results.json reports/S3-baseline.json`。
- **mock provider**（`src/mock-providers/`）：本机没有任何真实 provider 的 API key，
  `mock-thorough`/`mock-fast`/`mock-judge` 三个 provider 只用于在本机验证整条跑分链路
  机制本身跑得通，不代表任何真实模型的评测分数。

## 验收

- ✅ 两个场景各自跑通"规则评分 + llm-rubric judge"双轨：实际执行 `promptfoo eval`（非仅单元
  测试），S3 20 例 × 2 provider（合计 40 组）中 39 通过（唯一失败：`mock-fast` 在整体审查例上
  的模拟退化被 `riskListMatch` 正确抓到"5/6 命中，未命中 risk-06"）；S4 20 例 × 2 provider
  （合计 40 组）中 25 通过（`mock-fast` 的退化会剥掉全部引用，被 `citationExists` 正确抓到）。
  两边的失败模式都与各自 mock provider 的退化逻辑精确对应，证明规则评分链路真实生效而非空跑。
- ✅ 至少两个 provider 的对比报告已产出：`reports/S3-comparison.md`、`reports/S4-comparison.md`
  （mock-thorough vs mock-fast，含通过率/平均分/成本/tokens/延迟对比与选型建议）。
- ✅ 回归模式已验证：自身对比 40/40 用例可比、零回归；人为注入一处退分后能正确识别、按
  `provider × caseId` 定位、非零码退出。
- ✅ `pnpm lint` / `pnpm -r run build` / `pnpm test` 全仓库跑通（34 个测试文件、253 个用例，
  含本层 12 个测试文件、57 个用例）。
- ⚠️ **因环境限制未做**：本机没有配置 `ANTHROPIC_API_KEY`/`OPENAI_API_KEY` 等任何真实 provider
  凭证，以上"跑通"均基于 mock provider 验证机制本身，不代表任何真实模型的评测表现。真实
  选型跑分只需把 `promptfoo/*.promptfooconfig.yaml` 的 `providers:` 换成真实 provider id
  （如 `anthropic:messages:claude-opus-4-8`）——这是改配置文件，不需要改代码——留给有凭证
  的会话执行并建立第一份真实基线。

## 不许做 / 已知边界

- `datasets/` 下的 `case.json` 不许出现任何跑分器专有字段（`vars`/`assert`/`provider` 等）——
  这是验收标准的一部分，不是风格建议。
- S3 的变体合同衍生例（`variant-*`）复用主合同风险点的同一批真实法条引用：同一法律问题在
  不同合同里再次出现、援引同一条文，是正当的法律推理，不是编造平行素材。
- S4 的补充议题例（非风险清单/矛盾点驱动的 8 例：保证连带责任、债权转让、诉讼时效、迟延
  履行利息等）取材 case-bible.md 里未被 `risk-list.json`/矛盾点清单覆盖的其他既有事实，
  同样不是编造平行素材。
- `@courtwork/demo-data` 在本包 `package.json` 里是 `dependencies`（不是 `devDependencies`）：
  docs/21 的"src 只认接口"解耦铁律明确约束的是 `tools/core/output/ingest` 的生产代码，
  eval 存在的目的就是消费这批语料做评测夹具，不适用该铁律；用户任务描述也明确要求
  "评测素材直接取自 `packages/demo-data/data/`"。

## TODO（跨层放入区）

- [留给有真实 provider key 的会话] 把 `promptfoo/S3.promptfooconfig.yaml`、
  `promptfoo/S4.promptfooconfig.yaml` 的 `providers:` 换成真实 provider，跑一次真实评测，
  建立第一份真实基线（`cp reports/S3-results.json reports/S3-baseline.json`）。这是本工单
  验收清单里唯一因环境限制、只能用 mock provider 验证机制、无法在本次会话内完成真实评测
  的一项。
- [挂账，非本层处置] `packages/demo-data` 目前没有为 S4 预生成 RevisionInstructionSet 形状
  的 artifact（其 manifest.md"五、已知边界"已声明待该产物类型定稿后补充）。本层已自行手写
  20 例标准答案交付验收；demo-data 侧若未来想另外补一份"预生成"版本供其他消费方（如 UI
  开发夹具）使用，是独立小工单，不影响本层验收，也不必现在做。
- [观察，非缺陷] `packages/registry` 的 S2（矩阵审阅）场景不在 W7 范围（docs/10 只要求
  S3/S4）。S3 的变体合同衍生例复用了 S2 的语料（`contracts/variants/`、`review-matrix.json`）
  作为素材来源之一，属于合理的跨场景语料复用，不代表 S2 已有评测集。

## 验收记录

- 2026-07-09：当期范围完成。架构决定（promptfoo-only、DeepEval 降级为方法论参考）经确认，
  两个硬条件（数据集格式跑分器无关、SPEC 如实记录取舍 + 重估触发条件）均已落实。
  - 实现过程中 TDD 抓到的两处真实缺陷（均已修复并补测试）：`riskListMatch` 早期实现对
    "标准答案判定无风险"这一分支没有假阳性约束（候选虚构风险点也会被判满分）；
    `run-rules.ts` 早期实现假设 promptfoo 传入的候选输出已经是解析好的对象，实际是
    provider 的原始字符串，未做 `JSON.parse`——这一处是靠实际跑 `promptfoo eval`
    （而非只跑单元测试）才发现的，因为 mock provider 在单元测试里是被直接函数调用，
    不会暴露"跨进程边界数据形状变化"这类问题。
  - 数据集生成阶段自建的健全性检查（把标准答案当候选输出跑一遍规则评分，"完美模型"必须
    满分）额外抓到 1 处数据缺陷：S3 变体例的 `sourceAnchors` 漏了 `textRange`。
  - 交付：中性数据集 schema + loader、5 个规则评分器、2 份版本化 judge 提示词、promptfoo
    适配层（`generate-tests.ts` + `run-rules.ts`）、S3/S4 各 20 例数据集（脚本生成，均可
    回溯到 `packages/demo-data/data/` 具体源文件）、多 provider 跑分脚本、对比报告生成器、
    回归模式，全部 TDD（config/数据文件除外）。`pnpm lint`/`pnpm -r run build`/`pnpm test`
    全仓库通过（34 测试文件/253 用例）。
