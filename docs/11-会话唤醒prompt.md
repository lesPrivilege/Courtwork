# Claude Code 会话唤醒 Prompt（按工单复制使用）

用法：在 Courtwork 仓库根目录启动 Claude Code（Sonnet 5），整段粘贴对应工单的 prompt。一张工单一个会话，不复用。

---

## W1｜packages/schemas（现在就开，其余全部依赖它）

```
你认领 Courtwork 的 W1 工单：packages/schemas。

开工前按顺序读三样：根目录 CLAUDE.md、docs/10-实施切分-层与工单.md、packages/schemas/SPEC.md。读完先复述你理解的交付范围与验收标准，与我确认后再动手。

额外职责（仅此会话有）：仓库还没有工程底座，由你完成 monorepo 初始化——pnpm workspaces、Node 22、严格模式 TypeScript、vitest、根 tsconfig/eslint 基线。初始化只做够用的最小集，不引入与 W1 无关的工具链。

交付：SPEC 列出的 7 个 schema（TS 类型 + JSON Schema 导出 + zod 校验器），每个 schema 合法/非法样例各 ≥3 的测试全绿；JSON Schema 导出文件放在约定目录供 Python 侧复用。完工更新 SPEC.md 状态区并写验收记录。

纪律提醒：SourceAnchor 是一切可溯源交互的地基，设计它时假设未来所有 UI 点击溯源都压在它身上；RevisionEvent 假设未来直接进训练管线。范围外的想法写进对应层 SPEC 的 TODO 区，不要顺手实现。
```

## W3｜services/ingest spike（卷宗样本到位后开）

```
你认领 Courtwork 的 W3 工单：services/ingest 技术 spike。这是全项目最高优先级工单，你的结论决定 S1 滩头假设是否成立。

开工前按顺序读：根目录 CLAUDE.md、docs/10-实施切分-层与工单.md、services/ingest/SPEC.md、docs/05-调研报告-开源选型.md 的 OCR 章节。读完复述验证目标与样张分类，与我确认后动手。

环境：uv 管理 Python；样本卷宗位于 <填入路径>（已脱敏）。

验证矩阵：PaddleOCR-VL + PP-StructureV3（主候选）vs DeepSeek-OCR（备选），在印章遮挡、倾斜、手写批注三类样张上量化对比（字符准确率、版面还原、耗时）。baidu/Unlimited-OCR 只跑一轮记录数据，不做依赖。

交付：spike 报告（写入 services/ingest/spike-report.md）——主链路选型结论、手写批注的现实策略（识别 or 标记转人工）、单套卷宗端到端耗时预估（对照"午休之内出时间线"口径给结论：成立/不成立/需缩水）。所有跑分脚本入库可复跑。

纪律提醒：样张与中间产物不得含真实当事人信息；报告里的每个数字都要能从脚本复现。
```

## W2｜packages/registry（W1 验收后开）

```
你认领 Courtwork 的 W2 工单：packages/registry。

开工前按顺序读：根目录 CLAUDE.md、docs/10-实施切分-层与工单.md、packages/registry/SPEC.md，并通读 packages/schemas 已交付的类型。读完复述交付范围，确认后动手。

交付：场景定义 schema 与校验、声明文件加载器、触发匹配与场景清单查询 API、内置 S1–S4 四场景声明文件（提示词模板占位即可）。验收按 SPEC：四场景加载通过校验，非法定义报错清晰，触发匹配有单测。完工更新 SPEC 状态区。

纪律提醒：注册表的意义是产品团队不动 core 就能周级上新场景——任何"这个逻辑写死在代码里更快"的冲动都违背本层存在的理由。
```

## W4｜packages/output（W1 验收后开，可与 W2 并行）

```
你认领 Courtwork 的 W4 工单：packages/output。

开工前按顺序读：根目录 CLAUDE.md、docs/10-实施切分-层与工单.md、packages/output/SPEC.md。读完复述交付范围与验收标准，确认后动手。

第一步先做技术 spike：Python-Redlines vs docx4j，用一份样例合同 + 十条修改指令对比生成质量与工程复杂度，给出选型结论后再实现管线。

交付：修改指令集 JSON 契约（对齐 schemas）、修订 + 批注生成管线、模糊锚点定位（文档轻改后仍可定位，失败则报错跳过不错插）、golden files 快照测试。**WPS 渲染正常是验收标准**：产出 Word/WPS 双端人工核验清单，我来执行核验。完工更新 SPEC 状态区。
```

## W5｜packages/tools（W1 验收后开，可并行）

```
你认领 Courtwork 的 W5 工单：packages/tools。

开工前按顺序读：根目录 CLAUDE.md、docs/10-实施切分-层与工单.md、packages/tools/SPEC.md。读完复述交付范围，确认后动手。

交付：统一工具契约（输入/输出 schema、超时、缓存、失败降级），party-verify 与 cite-check 两个工具（先 mock 实现 + 真实接口的适配器骨架，凭证走配置不入库），契约测试含超时与降级路径。

纪律提醒：失败降级只许降为"标记未核验"，任何路径都不许静默回退到模型生成——这条是本层存在的理由，测试要覆盖。
```

## W7｜eval（可与 W3 并行开）

```
你认领 Courtwork 的 W7 工单：eval。

开工前按顺序读：根目录 CLAUDE.md、docs/10-实施切分-层与工单.md、eval/SPEC.md。读完复述交付范围，确认后动手。

交付：promptfoo + DeepEval 底座、评测集目录规范（任务/输入/专业标准答案/评分规则，规则评分 + LLM judge 双轨，judge 提示词入版本管理）、S3 与 S4 最小评测集骨架、多 provider 跑分脚本与对比报告格式。评测素材直接取自 packages/demo-data/data/（读 docs/21 与 data/manifest.md）：案件圣经 case-bible.md 是 ground truth（预埋矛盾点清单、事实时间线），主合同的预埋风险条款是 S3 标准答案来源，卷宗文书支撑 S4 起草任务——评测例从语料派生，不要另编平行素材。

纪律提醒：评测集是抗上游折旧的核心资产，目录规范的设计优先级高于例子数量；provider 一律走配置。
```

## W6｜packages/core（W2/W4/W5 验收后开）

```
你认领 Courtwork 的 W6 工单：packages/core。

开工前按顺序读：根目录 CLAUDE.md、docs/10-实施切分-层与工单.md、packages/core/SPEC.md，并通读 schemas/registry/tools/output 四层已交付的接口。读完复述架构边界（尤其：哪些东西只借 pi-mono、哪些必须长在本仓库），确认后动手。

交付：pi-mono 借壳的 agent loop 与 provider 封装、场景执行器（registry 取定义 → 编排 → schemas 合规 artifact → 停在确认节点）、可序列化事件流协议、RevisionEvent 捕获落盘。验收：无 UI 用 CLI 脚本跑通 S3 全流程（合同进 → RiskList → 脚本模拟确认 → 修订指令集 → output 产出 docx），事件流可回放。

纪律提醒：UI 是本协议的纯客户端，任何业务逻辑漏进壳层都算本层验收失败；provider 与模型 id 不许写死。
```

---

## 通用收工检查（每个会话结束前自查）

1. SPEC.md 状态区已更新，验收记录可复现
2. 测试全绿且覆盖 SPEC 验收项
3. 范围外发现写进了对应层 SPEC 的 TODO 区
4. 无真实当事人信息、无硬编码凭证/模型 id

---

# 验收 Prompt（分发给 Codex，实现会话回报完工后使用）

验收模式：实现（Sonnet/Claude Code）与验收（Codex）分离。验收会话可顺手修实现级 bug，**无权改契约级设计**——契约问题上报架构会话（Cowork）拍板。

## 验收通用规则（随各工单实例一起粘贴）

```
处置规则：
- 实现级 bug（测试断言缺失、类型缺漏、导出遗漏、构建配置错误）顺手修，每处修复独立 commit，message 前缀 fix-by-acceptance，并在报告中逐项记录。
- 契约级问题（schema 字段/语义、跨层接口、SPEC 验收标准本身）不许改，写进报告标 [需架构拍板]。
- 验收报告写入本层 ACCEPTANCE.md：验收清单逐项结论（通过/不通过/已修复）+ 修复列表 + 遗留问题 + 是否放行下游工单的明确结论。
- 任何"测试/构建通过"的判定，必须核对命令输出里有真实的用例计数/产物证据——W5 验收发现过"包缺 test/lint 脚本导致 --filter 静默 no-op 假绿"的先例；实现会话收工自查同样适用此条。
```

## W1 验收（Codex）

```
你是 Courtwork 的验收工程师。验收 W1 工单：packages/schemas + monorepo 工程底座。实现会话已回报完工，你的任务是独立复核并给出放行结论。

先读：根目录 CLAUDE.md、docs/10-实施切分-层与工单.md、packages/schemas/SPEC.md（含状态区完工记录）。

验收清单（逐项给结论）：
1. 干净环境跑通：pnpm install → 全部测试绿（Node 22+ / ESM / NodeNext / strict TS）。
2. 七个 schema 齐全且字段与 SPEC 对齐：SourceAnchor / CaseFile / Timeline / PartyGraph / RiskList / ReviewMatrix / RevisionEvent。重点核对已拍板的追加项：SourceAnchor 的 quote 语义注释（展示辅助非权威定位器）、bbox⇒page 必填校验、textLayerVersion? 字段；RevisionEvent 的 JSON Pointer fieldPath、reason?/sourceAnchors?/caseId?。
3. 测试质量抽查：合法/非法样例各 ≥3 且断言真实（防"跑了但没验"的空壳测试）；非法样例要真的踩中校验规则而非随便缺字段。
4. json-schema/ 导出：七个文件齐全、与 zod 源一致；drift 测试有效性实测——故意改一处 zod 源确认测试变红，再还原。
5. 工程底座为最小集：workspaces / strict tsconfig / eslint flat / vitest / engines + .nvmrc / .gitignore；确认没有越界引入（turbo、CI、prettier、husky 等）。
6. 纪律检查：无硬编码 provider/凭证、无真实当事人信息、SPEC 状态区已更新、git 历史按任务分步提交（应能看到"文档入库 → 底座 bootstrap → 逐 schema"的分层历史）。
7. 复核两个已知工程决策，**尊重、不许"顺手升级"**：typescript 锁定 ^6.0.3（typescript-eslint@8.63.0 peer 卡 <6.1.0，装 TS7 会打断类型感知 lint）；@types/node 放在 packages/schemas 自己的依赖里 + tsconfig 显式 types（pnpm 严格隔离所致）。
8. 契约缺口文档核验：zod→JSON Schema 导出不含 .refine() 跨字段规则（bbox⇒page、bbox-or-textRange），确认 services/ingest/SPEC.md TODO 区已有说明及"W8 Python 侧必须等效实现"的架构拍板条目、packages/schemas/SPEC.md 验收记录有对应描述。缺则补记（属文档修复，允许）。
9. 干净环境验证自己做一遍：rm -rf 所有 node_modules → pnpm install → test/lint/build，不采信实现会话的自述结论。
10. 仓库卫生：检查未跟踪的 .claude/ 目录——若为本地会话配置/缓存则加入 .gitignore（实现级，允许）；若含应入库的计划文档则移入 docs/ 后提交。

（附验收通用规则，见上）

结论必须明确：是否放行 W2 / W4 / W5 并行开工。
```

## W2 验收（Codex）

```
你是 Courtwork 的验收工程师（角色边界见根目录 AGENTS.md）。验收 W2 工单：packages/registry 场景注册表。实现会话已回报完工，你的任务是独立复核并给出放行结论。

先读：根目录 CLAUDE.md、AGENTS.md、docs/10-实施切分-层与工单.md、packages/registry/SPEC.md（含状态区完工记录与验收记录）。

验收清单（逐项给结论）：
1. 干净环境自己跑一遍：rm -rf 所有 node_modules → pnpm install → pnpm test（应为 86 条：schemas 57 + registry 29）→ pnpm lint → pnpm -r run build，不采信实现会话自述。
2. ScenarioDefinitionSchema 与 SPEC 的 9 字段清单严格一致、无擅自增项：id / name / trigger{fileTypes, userActions, classifierTags} / inputArtifacts / toolIds / outputArtifacts / uiTemplateId / confirmationGates / promptTemplateRef。核对三条已拍板的校验语义：trigger 至少一个维度非空（refine）；confirmationGates 至少 1 个，其 artifact 字段可选、存在时必须属于 outputArtifacts；toolIds 仅结构校验（非空字符串、无重复、无硬编码白名单）。
3. 无平行枚举：artifact 类型引用必须直接 import 自 @courtwork/schemas 的公开 barrel（ArtifactTypeEnum），全包内不得出现自定义的产物类型清单。
4. 加载器：YAML 解析与校验失败时报错含文件名 + 字段路径；fail-fast 语义；纯函数 parse 与文件 IO 分离（可测性）。
5. 查询 API：findByTrigger 为跨维度 OR、无排序（MVP 拍板语义，不许"顺手"加优先级）；list() 场景清单可用；有专门单测。
6. 四个内置场景声明逐一核对连线：S1 输入 [] → 输出 [CaseFile, Timeline, PartyGraph]；S2 [CaseFile] → [ReviewMatrix]；S3 [CaseFile] → [RiskList] 且 toolIds 含 party-verify；S4 [CaseFile, Timeline, PartyGraph] → []（label-only 确认门禁过渡，属架构拍板）。
7. 跨层 TODO 一致性：packages/schemas/SPEC.md 与 packages/registry/SPEC.md 的缺口记录与 packages/output/SPEC.md 的架构拍板条目口径一致（RevisionInstructionSet 由 W4 在 schemas 提案；ContradictionList 待 W3 结论）。
8. 测试质量抽查：非法样例要真的踩中校验规则（缺维度的 trigger、gate.artifact 不在 outputArtifacts、重复 toolIds 等），防空壳断言。
9. 工程决策尊重：typescript 锁 ^6.0.3 不许升级；loader 用了 node:fs/path，核对 @types/node 已按 W1 记录的坑声明在本包自己的 package.json + tsconfig types。
10. 纪律与卫生：无硬编码 provider/凭证；git 历史分层（plan → scaffold → schema → loader → query → built-ins → TODO → 完工记录）；工作树干净。

处置规则：
- 实现级 bug 顺手修，独立 commit，前缀 fix-by-acceptance，报告逐项记录。
- 契约级问题（schema 字段/语义、跨层接口、SPEC 验收标准）不许改，报告标 [需架构拍板]。
- 验收报告写入 packages/registry/ACCEPTANCE.md，结论必须明确：registry 是否就绪供 W6（core）消费。
```

## W5 验收（Codex，范围 = packages/tools + packages/demo-data）

```
你是 Courtwork 的验收工程师（角色边界见根目录 AGENTS.md）。验收 W5 工单及其增量 W5.1：packages/tools（统一工具契约 + 两工具三适配器）与 packages/demo-data（演示数据包）。实现会话已回报完工（提交 9409c0c 等），你的任务是独立复核并给出放行结论。

先读：根目录 CLAUDE.md、AGENTS.md、docs/10、docs/20-信源分级、docs/21-演示数据包、packages/tools/SPEC.md 与 packages/demo-data/SPEC.md（含验收记录）、packages/demo-data/data/manifest.md。

注意：仓库内 W4（packages/output + packages/schemas 的 RevisionInstructionSet）正在途，工作区可能有其未提交文件——一律不碰；测试跑分用 --filter 限定 tools 与 demo-data 两包，仓库全量数字仅作参考不作断言。

验收清单（逐项给结论）：
1. 干净环境：rm -rf 所有 node_modules → pnpm install → pnpm --filter @courtwork/tools --filter @courtwork/demo-data test（回报口径：tools 66 + demo-data 15）→ lint → build，不采信自述。
2. 契约核心语义：判别联合的失败分支**类型上不存在 data 字段**（读类型定义确认，且有测试显式断言）；六个 reason：timeout / not_configured / not_implemented / adapter_error / invalid_response / out_of_coverage；入参不合法抛 ToolInputValidationError 而非降级；超时经 AbortSignal 真实联动（有测试）。
3. sourceId 机制（本轮关键发现）：适配器声明期定 sourceId、进缓存键、结构性防冒充；存在"同一 tool id 下 mock 与 demo-fixture 缓存不串"的碰撞防护测试。
4. 缓存语义：只缓存成功；demo-fixture 成功结果可缓存；out_of_coverage 属失败家族不缓存；TTL 生效有测试。
5. 三种适配器齐备且边界清晰：mock（source:"mock"，测试专用）；demo-fixture（source:"demo-fixture"，**显式配置选择，不存在"未配置凭证默认落 demo"的路径**——找反例测试）；真实骨架（凭证注入配置、不入库，配置齐备仍诚实抛 not_implemented，无编造的响应映射）。
6. demo-data 解耦纪律（docs/21）：party-verify.ts / cite-check.ts 运行时源码 **零 import** demo-data（grep 确认）；tools 对 demo-data 仅 devDependency 且只在 *.test.ts 引用；demo-data src 只有数据访问器无业务逻辑。
7. 语料互锁：out_of_coverage 测试从 listPartyOutOfCoverage() 读语料 manifest 名单，非硬编码字符串；citation 访问器带 officialTextVerified 标记且法条条目默认 false（复核微工单挂账中，验收只查标记存在）。
8. 虚构纪律抽查 data/registries：主体全虚构、信用代码非真实格式；法条为真实公开文本且注明版本；虚构判例案号明显标注 demo。发现任何疑似真实主体即 [需架构拍板]。
9. 工程决策尊重：typescript ^6.0.3 不许升级；@types/node 按 W1 记录模式；import.meta.dirname 等 Node 版本特性与 engines 声明一致。
10. 提交卫生：9409c0c 应恰好 22 个文件且全在两包范围内；两份 SPEC 验收记录含中途修正（sourceId 重构、fixtures 降级）的如实记载。

处置规则：实现级 bug 顺手修（独立 commit，fix-by-acceptance 前缀）；契约级问题标 [需架构拍板] 不许改；报告写入 packages/tools/ACCEPTANCE.md（demo-data 部分一并写明）。结论必须明确：tools 与 demo-data 是否就绪供 W6（core）与演示装配消费。
```

后续工单（W3/W4/W6–W8）验收实例在各实现会话回报后按同一结构生成。
