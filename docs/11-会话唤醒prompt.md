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

开工前按顺序读：根目录 CLAUDE.md、docs/10-实施切分-层与工单.md、services/ingest/SPEC.md、docs/05-调研报告-开源选型.md 的 OCR 章节、docs/27-架构决定-sandbox与fetch分期.md（其 MVP 最小集第 1–2 条是 W8 验收项：解析进程隔离、解压比例上限、禁宏禁 XXE——spike 阶段即按此习惯搭环境）。读完复述验证目标与样张分类，与我确认后动手。

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

## W6｜packages/core（前置已齐：W2/W4/W5 均验收放行）

```
你认领 Courtwork 的 W6 工单：packages/core。这是 core MVP 的收口层。

开工前按顺序读：根目录 CLAUDE.md、docs/10、packages/core/SPEC.md（TODO 区有三条协议预留：异步确认、session 续行与会话链，必读）、docs/20-信源分级、docs/21-演示数据包、docs/22-泛化边界，并通读 schemas（含新落地的 RevisionInstructionSet）/registry/tools/output 四层的 SPEC 验收记录与公开接口。读完复述架构边界（尤其：哪些只借 pi-mono、哪些必须长在本仓库；装配点的位置），确认后动手。

先做开胃菜 W2.1 微工单（registry SPEC TODO 区有拍板全文）：YAML 声明加载路径 strict 化（scenario 及嵌套 trigger/gate 对象未知键报错，报错含文件名 + 未知键名）+ 对应测试，独立 commit，然后进入本层。

交付：
1. pi-mono 借壳的 agent loop 与 provider 无关封装（模型 id/参数全部来自配置；eval 选型在途，测试用假 provider/录制回放，不依赖真实 API）。
2. 场景执行器：registry 取场景定义 → 编排（工具调用 / 生成）→ 产出 schemas 合规 artifact → 停在确认门禁，等确认事件续行。
3. 可序列化事件流协议，遵守 SPEC TODO 的异步确认预留：确认请求可推送到进程外通道、响应可延迟数小时回流、携带通道无关身份标识（对应 RevisionEvent.actor）；协议不得隐含确认方与 core 同进程/同机/同客户端。
4. 信源等级传播与门禁的通用执行逻辑预留（docs/20）：artifact 的依据字段带信源等级标记流转，C 级事实未经确认不得进入 RevisionInstructionSet 的 citation——通用机制，不写任何场景特判；web-search 工具本体不做。
5. RevisionEvent 捕获落盘：客户端对 artifact 的每次 schema 级修正经 core 记录。
6. 装配点（docs/21 定义的唯一例外）：demo 装配配置在 core 落地——注入 demo-fixture 适配器与 demo-data 语料的组装代码，是全仓库唯一允许 import @courtwork/demo-data 的运行时位置，边界清晰可替换。

验收：无 UI 用 CLI 脚本跑通 S3 全流程演示装配——样板案主体过 party-verify（demo-fixture 适配器）→ RiskList artifact（依据含信源等级）→ 脚本模拟确认 → RevisionInstructionSet → 调 output 产出带修订与批注的 docx（输入 docx 可用 output 包的 sample）。全程事件流可回放。

工作区纪律：W7（eval/）在途，其未提交文件一律不碰；全仓库命令用 --filter 排除 @courtwork/eval（W4 验收已验证此法）；git add 一律显式路径。通用层不得渗入法律语义（docs/22）。UI 是协议纯客户端，业务逻辑漏进壳层算验收失败。
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

## W4 验收（Codex，含 computer use 视觉核验）

```
你是 Courtwork 的验收工程师（角色边界见根目录 AGENTS.md）。验收 W4 工单：packages/output（RevisionInstructionSet 契约 + 纯 TS 直接著录管线）及其跨层同步（schemas 新类型、registry S4）。实现已完工（8 个分层提交；注意 packages/output/SPEC.md 在架构提交 fa0b5e3 内，属已知情况非违规）。

先读：CLAUDE.md、AGENTS.md、docs/10、packages/output/SPEC.md（含验收记录与两条拍板 TODO）、packages/output/spike-report.md、packages/schemas/src/revision-instruction-set.ts、docs/07 调研报告。

**已知缺陷（本次验收的首要任务，实现级、授权修复）**：人工 WPS/Word 预览发现输出文档字体错乱——部分仿宋正确、部分错误，隔行/隔字交替。诊断方向（按嫌疑排序，实证为准）：① 管线只给新构造的 run 声明了 rFonts，原文档保留/重组的 run 未补全；② 中西文切分出的 run 缺 hAnsi/ascii 维度，西文字符掉主题字体；③ w:ins/w:del 内层 run 与外层 rPr 继承不一致；④ 主题字体（minorEastAsia）兜底未被显式覆盖。

修复要求：
a. 先建自动化不变量测试再修——"输出文档中每个 w:r 的 rPr 必须含完整 w:rFonts（ascii + eastAsia + hAnsi + cs）"，作为 golden 测试的回归守卫；该测试此刻应当变红（复现缺陷），修复后变绿。
b. computer use 视觉回路确认：用 computer use 打开修复后的 sample docx（WPS 优先，Word 如有则双端），放大含中西文混排/修订痕迹/批注的段落截图核对：正文仿宋、标题黑体、数字与西文 Times New Roman、无隔行隔字交替。修一轮 → 重新生成 sample → 重开截图，直至稳定。截图核对结论写进报告。
c. 把本缺陷作为具体病例补进 verification-checklist.md 的字体核对项。
d. 若修复触及契约（RevisionInstructionSet 字段）或需要重构著录器架构，停下标 [需架构拍板]。

常规验收清单：
1. 干净环境：rm -rf node_modules → pnpm install → 全量 test（口径 196，本层 16）→ lint → build；核对输出有真实用例计数（假绿防护）。
2. 契约核对 revision-instruction-set.ts：四种 kind 判别联合（replace/insert/delete/commentOnly，annotation 仅 commentOnly 必填）；locator 三策略（text/tableCell/tableRow）；citation 的 refine——sourceAnchors 非空或 statuteRef 存在至少一腿，纯散文引用不合法；ArtifactTypeEnum 已扩展；JSON Schema 导出含新类型且 drift 测试覆盖。
3. 跨层同步核对：registry S4.yaml outputArtifacts 引用 RevisionInstructionSet、门禁升级为产物引用、builtin 测试更新、schemas/registry 两处 SPEC 挂账已清。
4. 管线语义抽查：模糊定位三级（精确唯一/模糊显著优于次佳/拒绝跳过 locator_not_found，绝不错插）有测试；批注与修订同遍构造（无 diff 后搜索）；golden files 与 spike 的 docx4j 黄金参照结构对照说明可信。
5. spike 卫生：spike/ 归档完整（三条路径）、已进 lint ignore、无构建产物（target/、__pycache__）入库。
6. 工程决策尊重：typescript ^6.0.3；纯 TS 无 JVM/Python 运行时依赖；接口收窄为 applyRevisionInstructionSet 单签名（Plan B 可逆性）。
7. 注意：工作区可能有 W7（eval/）在途未提交文件，一律不碰；你的修复提交用显式路径 add。

处置规则同前（fix-by-acceptance 独立提交；契约级标 [需架构拍板]）。报告写入 packages/output/ACCEPTANCE.md，结论明确：是否放行 W6 消费 output 与新契约。
```

## W7 验收（Codex，范围 = eval/ + workspace 纳入改动）

```
你是 Courtwork 的验收工程师（角色边界见根目录 AGENTS.md）。验收 W7 工单：eval 评测框架与数据集骨架。实现会话已回报完工，你的任务是独立复核并给出放行结论。

先读：CLAUDE.md、AGENTS.md、docs/10、eval/SPEC.md（含 DeepEval 取舍记录）、docs/21、packages/demo-data/data/manifest.md。

验收清单（逐项给结论）：
1. 干净环境：rm -rf node_modules → pnpm install → eval 定向 test（口径 57）→ 仓库全量 test（口径 253）→ lint → build；核对输出有真实用例计数（假绿防护——本条规则正是从验收先例来的，eval 包自己不许再犯）。
2. 硬条件一·跑分器无关性：抽查 datasets/S3、datasets/S4 的 case 文件，不得含任何 promptfoo 专有字段；grep -ri promptfoo，专有词汇只允许出现在 src/promptfoo/ 适配层与其配置文件——评测数据资产必须可整体迁移到任何跑分器。
3. 硬条件二·SPEC 记录：DeepEval 降级为方法论参考的取舍理由 + 两个重估触发条件（出现规则/judge 表达不了的指标；W8 引入 Python 环境时）如实在案。
4. 数据集溯源纪律：抽查 ≥6 例（含正例与负例），每例可回溯到 packages/demo-data/data/ 的具体源文件（case-bible/主合同/变体/review-matrix）；负例取自既有语料的未标记条款或"无冲突"判定，不存在编造的平行事实；S4 手写标准答案与 case-bible 的事件/矛盾对应。
5. 双轨纪律：能规则评分的不上 judge——核对 5 个规则评分器覆盖面与 2 份 judge 提示词的分工边界；judge 提示词入版本管理；riskListMatch 同时度量召回与精确（有防假阳性测试）；citationExists 对 cite-check 语料库真实校验；生成数据中的 SourceAnchor 满足两条跨字段规则。
6. E2E 实测（自己跑，不采信自述）：mock providers 跑 promptfoo eval S3+S4 全量，确认差异化通过/失败模式真实出现（mock-fast 降档应被 riskListMatch 抓到）；对比报告生成器出报告；回归模式建基线 → 注入一处人为降级 → 确认被检出且无假阳性；caseId 跨 run 匹配稳定。
7. workspace 改动最小化：pnpm-workspace.yaml 与 vitest.config.ts 的改动仅限纳入 eval，无越界。
8. 工程决策尊重：typescript ^6.0.3；@types/node 模式；无真实凭证/写死模型 id；"真实 provider 跑分待凭证"已记 SPEC TODO。
9. 提交卫生：分层提交、显式路径、无遗漏未跟踪文件。

处置规则同前（fix-by-acceptance 独立提交；契约级/评测方法论级问题标 [需架构拍板]）。报告写入 eval/ACCEPTANCE.md。结论必须明确：eval 是否就绪作为模型选型与回归门禁使用（真实 provider 跑分除外）。
```

## W7.1｜eval 边界收敛（验收缺口整改，Claude Code）

```
你认领 Courtwork 的 W7.1 整改工单：收敛 eval 的 promptfoo 专有边界。背景：W7 验收结论"不完全放行"，缺口见 eval/ACCEPTANCE.md 第 2 节——promptfoo 专有词汇与输出结构散落在 src/report.ts、src/regression.ts、src/runner.ts、src/mock-providers/、scripts/ 中，违反硬条件"专有词汇只允许出现在 src/promptfoo/ 适配层与配置文件"。

先读：eval/ACCEPTANCE.md、eval/SPEC.md、根目录 CLAUDE.md。

整改方案（按此执行）：
1. 定义**中性内部结果格式**（如 EvalRunResult：runId/caseId/provider/score/ruleResults/judgeResults/timings，类型放 src/results.ts）——这是本次整改的核心产出：回归基线以中性格式存储后成为可移植数据资产，换跑分器基线不作废。
2. src/promptfoo/ 成为唯一边界：promptfoo CLI 调用、结果 JSON 解析（promptfoo → 中性格式的映射）、mock providers 全部移入；report.ts / regression.ts / scripts/ 只消费中性 API 与中性格式，全文不得出现 promptfoo 词汇（类型、注释、字符串都算）。
3. 既有回归基线文件迁移为中性格式（写一次性迁移或重建基线，SPEC 里说明选了哪种）。
4. 复跑验收报告第 1、2、6 项对应的全部命令自证（含 rg 边界扫描零命中），结果写进 SPEC 状态区。
5. TDD；显式路径分层提交；完工更新 SPEC 与 eval/ACCEPTANCE.md 附"整改记录"节（不改 Codex 原文，追加）。

完工后由 Codex 按原报告第 1、2、6 项补验。
```

## W6 验收（sol 执行，范围 = packages/core + W2.1 + 两处跨层文档修正）

```
你是 Courtwork 的验收工程师（角色边界见根目录 AGENTS.md，对任何模型同等约束）。验收 W6 工单：packages/core（agent core 收口层）及其附属（W2.1 registry strict 化、CLAUDE.md/registry SPEC 两处授权文档修正）。实现会话已回报完工，你的任务是独立复核并给出放行结论。

先读：CLAUDE.md、AGENTS.md、docs/10、docs/12、docs/20/24/26、packages/core/SPEC.md（含验收记录与全部 TODO 裁决痕迹）、docs/superpowers/plans/2026-07-09-core-package.md（执行依据）。

验收清单（逐项给结论）：
1. 干净环境自己跑：rm -rf 所有 node_modules → pnpm install → 全量 test（口径 285）→ lint → pnpm --filter '!@courtwork/eval' -r run build（真实 tsc，非 vitest 假绿——本工单曾靠它抓出三处类型错误，验收必须复跑）。
2. W2.1：registry 三处 .strict() 生效、报错含文件名+未知键名、四个内置 YAML 未误伤（有测试）。
3. 依赖纯净：packages/core/package.json 无 pi-mono 及任何 agent 框架依赖；provider/模型 id 全部来自配置，grep 无硬编码。
4. 执行器语义：声明顺序=执行顺序有测试；S1 形状（3 产出 2 门禁）泛化测试存在且非照抄 S3；label-only 门禁落序列尾；门禁暂停→落盘→resume 的跨进程真实性（测试用全新依赖实例，非同对象复用）。
5. 三条协议预留兑现：确认请求可序列化、actor 通道无关、无同进程假设；Session{id, chainId, predecessorSessionId} 存在且 RevisionEvent/确认记录挂 sessionId；事件流无单 session 生命周期假设。
6. 信源台账与门禁：等级判定声明在装配点（core 通用代码 grep 无具体工具等级硬编码）；artifact_produced 事件携带 evidenceGrades 投影；C 级未确认进 citation 被拒有测试。
7. docs/12 五点：todo 快照为纯函数（场景定义→快照，LLM 零参与——读实现确认无模型调用）；step_failed 事件；RuntimeGuard 四限额走配置；Manus 待办复述已接；摄取并行未进 core（确认不存在）。
8. 修正回放缺口的修复有测试：resumeScenario 应用修正后重发 artifact_produced，回放可见修正后状态。
9. 装配点纪律：grep 全仓库运行时源码，import @courtwork/demo-data 仅 composition 一处；core 通用层无法律语义词汇（docs/22）。
10. S3 演示实测：pnpm --filter @courtwork/core demo:s3 亲手跑通；unzip 检查产出 docx 的批注真实非乱码；确认 6 命中 + 1 条 locator_not_found 如实跳过；事件流回放完整（含修正后 artifact 与 todo_snapshot）。
11. 提交卫生（本工单特别项）：该会话与并行会话共享 git 索引——逐个核对 W6 系列 commit 的文件清单，确认无误扫入他人文件（实现会话已自查，验收复核）。
12. 工程决策尊重：TS ^6.0.3、@types/node 模式、无凭证入库。

处置规则同 AGENTS.md（实现级顺手修 fix-by-acceptance；契约级标 [需架构拍板]）。报告写入 packages/core/ACCEPTANCE.md。结论必须明确：core 是否放行供 B 阶段（UI）与 CLI 演示消费，core MVP 是否宣告成立。
```

## W6.2｜core 验收阻塞项整改（Claude Code）

```
你认领 Courtwork 的 W6.2 整改工单。背景：W6 验收结论"不放行"，两项契约级阻塞 + 两项记录件，见 packages/core/ACCEPTANCE.md 与 docs/34-sol-review/（如有关联）。架构已裁决，按下述方案执行，不再自行设计。

先读：packages/core/ACCEPTANCE.md、packages/core/SPEC.md、packages/schemas/SPEC.md、docs/21（含 eval 豁免澄清）、docs/22。

整改项（各自独立 commit，全 TDD）：
1. **schemas 增量：RevisionEvent.sessionId?**——可选字段（兼容既有数据与测试），JSDoc 注明"core 落盘时必填"；重新导出 JSON Schema 过 drift 测试；schemas SPEC 记录变更与消费方核对（本次为纯增量，无破坏）。
2. **schemas 增量：citation.evidenceKey?**——RevisionInstructionSet 的 citation 增加可选不透明键（string），JSDoc 注明"由 core 信源台账签发；门禁按 key 查验，不看展示文本；无 key 引用按 C 级未确认待遇"。同步 JSON Schema + drift。
3. **core：落盘校验与门禁重构**——RevisionEvent 落盘路径强制 sessionId 存在（缺失即抛错，有测试）；信源门禁改为按 evidenceKey 查台账（编译 RevisionInstructionSet 时签发 key），新增测试：修改 citation 展示文本后门禁仍正确拦截 C 级未确认（复现原绕过手法并证明已堵）；手工新增无 key 引用被拦截有测试。
4. **core 通用层领域命名清理**——按 ACCEPTANCE.md 记录的具体位置改名（docs/22 纪律），领域词汇只许出现在装配点与场景声明消费处。
5. 全量回归：干净环境 test（原口径 287+新增）/ lint / 真实 tsc build / demo:s3 重跑（docx 产出与事件回放不回归）。
6. 更新 packages/core/SPEC.md 验收记录追加"W6.2 整改记录"节；完工回报后由 sol 按 ACCEPTANCE.md 阻塞项做补验。
```

## W7.1 补验（sol，范围 = eval 边界收敛整改）

```
你是 Courtwork 的验收工程师（角色边界见 AGENTS.md）。任务：对 W7.1 整改做补验——只复验原验收报告（eval/ACCEPTANCE.md 上半部）判"不通过/部分通过"的第 1、2、6 项，其余项不重跑。整改会话已回报完工（9 个 commit，整改记录以 append-only 方式附于 ACCEPTANCE.md）。

先读：eval/ACCEPTANCE.md（原报告 + 整改记录）、eval/SPEC.md（状态更新）、docs/11 的 W7.1 工单原文。

补验清单：
1. 干净环境重跑：rm -rf node_modules → pnpm install → pnpm --filter @courtwork/eval test（新口径 14 文件/64 例）→ 全仓库 test（口径 351）→ lint → build。核对真实计数（假绿防护）。
2. 边界扫描亲手跑：原报告第 2 节的同一 rg 命令 + 词界精扫（promptfoo|llm-rubric、词界 vars/assert/javascript）。预期：datasets/src/scripts/judges 中性层专有词汇为零，仅剩 run-eval.ts 两处结构性引用（import 适配器入口、配置路径 console 消息）——架构已预裁此两处合规（import 适配器是使用适配器的唯一方式，不属词汇泄漏）；若你发现预裁未覆盖的其他残留，标 [需架构拍板]。
3. 中性格式实质核验：reports/ 落盘文件为 EvalRunResultSet 形状（抽查字段）；report.ts/regression.ts 源码零 promptfoo 类型依赖（读 import 清单）。
4. E2E 重做：真实 npx promptfoo eval 跑 S3+S4 → 落盘中性格式 → 失败模式与 W7 基线一致（mock-fast S3 19/20、S4 5/20）→ 注入一处降级、regression-check 在中性格式上正确检出且非零退出。
5. 基线处置核验：基线为重建而非迁移（gitignored mock 数据，SPEC 已说明）——确认说明在案即可，不追溯旧文件。
6. ACCEPTANCE.md 完整性：git diff 核对整改记录对原报告零删改（纯追加）。

处置规则同 AGENTS.md。结论写入 ACCEPTANCE.md 追加"补验结论"段：eval 是否放行作为正式模型选型与回归门禁（真实 provider 跑分仍按 SPEC TODO 挂账，不阻塞本结论）。
```

## W6.2 补验（sol，范围 = W6 验收阻塞项整改）

```
你是 Courtwork 的验收工程师（AGENTS.md）。任务：对 W6.2 整改做补验——只复验 packages/core/ACCEPTANCE.md 判定的两项契约级阻塞与两项记录件，加整改自身的回归；W6 原报告已通过的项不重跑。

先读：packages/core/ACCEPTANCE.md、packages/core/SPEC.md 的 W6.2 整改记录、docs/superpowers/plans/2026-07-10-w6.2-core-remediation.md、packages/schemas/SPEC.md 的两条增量记录。

补验清单：
1. 干净环境（整改会话因并行风险合理跳过、已如实记录，本次由你补跑——当前无并行会话）：rm -rf 所有 node_modules → pnpm install → 全量 test（口径 ≥297/packages + eval 64）→ lint → 真实 tsc build（6/6 非 eval 包）。
2. 阻塞 1 核验：schemas 的 RevisionEvent.sessionId?（可选 + JSDoc"落盘必填"）、JSON Schema 再导出过 drift；core 落盘缺 sessionId 抛 MissingSessionIdError 有测试；executor 贯穿 sessionId。
3. 阻塞 2 核验（重点）：Citation.evidenceKey? 落地；门禁只认 key 不解析展示文本、fail-closed；**你原报告的绕过手法在 grade.test.ts 被逐字复现并证明拦截**——亲自改一处展示文本再跑确认；手工新增无 key 引用按 C 级未确认拦截有测试；risk-07 保持诚实 locator_not_found（非门禁拦截），与 W6 基线逐字节一致。
4. 记录件：core 通用层领域命名清理（rg 无残留领域词汇，改名 commit 独立）；eval 豁免已成文于 docs/21（核对存在即可）。
5. demo:s3 亲手重跑：docx 39,713 字节、6 条批注可读、1 条 locator_not_found、事件序列与 W6 基线一致。
6. 提交卫生：整改系列 commit 逐个核对文件清单（共享索引环境，eval/ACCEPTANCE.md 应无 core 会话触碰）；SPEC/ACCEPTANCE 记录为纯追加。

处置规则同 AGENTS.md。结论以纯追加写入 packages/core/ACCEPTANCE.md"补验结论"段，必须明确回答两问：core 是否放行供 B 阶段（UI）消费；core MVP 是否宣告成立。
```

## B 阶段｜全量 UI + Tauri 成品（sol，core MVP 已放行）

```
你是 Courtwork 的 UI 实现者与设计第二作者（sol）。B 阶段任务：从设计语言与 core 事件流协议出发，交付可安装的 Tauri v2 桌面成品（apps/desktop）。core MVP 已验收放行（packages/core/ACCEPTANCE.md），你的 A 阶段 review 三项裁决在 docs/34-sol-review/architecture-rulings.md。

先读：CLAUDE.md、AGENTS.md、apps/desktop/SPEC.md、docs/30/31、docs/32-设计语言包（含你的 review 与裁决）、docs/23（编辑面）、packages/core 的事件流协议与 demo 装配点源码、docs/12 五点（todo_snapshot/step_failed 事件已在协议中）。

先做 A 阶段收尾（独立 commit）：按 architecture-rulings.md 执行 tokens 双轨拆分（*.graphic/*.fg，琥珀 #B45309 起红绿板岩同步复算）、四项非拍板修正、北极星屏同步更新。

交付：
1. 三栏工作台（左案件/中对话+场景卡片/右五交互：时间线/图谱/矩阵/修订预览/起草画布）+ 完整工作台帧（docs/32 二轮规格）+ 状态条（用量圆盘）。
2. 纯客户端纪律：UI 只消费 core 事件流协议与确认/续行接口，一行业务逻辑不进壳（验收红线）；tier 角标只消费 artifact_produced 的 evidenceGrades 投影，零推断（你 A 阶段裁决 1）。
3. 防呆三原则落地：分层确认（高危/未核验不入批量、逐条展开）、生成与确定视觉区隔（provenance tokens）、遥测事件发射（消费 W6.1 的三个事件类型；若 W6.1 未落地则先埋发射点、发空实现）。
4. demo 装配：接 demo-fixture + 样板案语料，S3 与 S1 两条流程可在成品内走通（S1 摄取进度可用模拟事件流，W8 未就绪）。
5. Tauri v2 打包：capability 最小化（docs/27 第 5 条）、图标接 docs/32 icon、macOS 产物可安装可运行。
6. 测试：Playwright 回归（关键流程 + 协议契约测试用录制事件流回放）+ 假绿防护（用例计数）。

纪律：零技术概念暴露；法理之线规格严格执行（纯白卡贴边通高 2px，禁 callout 化）；挑战设计走 [需架构拍板]；显式路径提交；desktop SPEC 完工更新。验收三角照旧——你完工后由独立会话验收，报告规格届时另发。
```

## Polish 工单｜UX 打磨（sol，B 阶段验收回报后执行）

```
你是 Courtwork 的 UI 实现者（sol，任命见 AGENTS.md）。任务：对 desktop 成品做系统性 UX 打磨。依据三份输入：docs/35-设计素材-GeminiUX提案.md（de-slop 12 条清单 + Split-Tab Grid 落地细则，已架构审定）、docs/41（法理之线静默态取消拍板）、apps/desktop/ACCEPTANCE.md（B 阶段验收缺陷清单，如有）。

执行项：
1. **法理之线静默态取消**：无语义状态的卡片无左线（普通卡靠 1px 中性边框/背景色差区分）；线只在语义态出现（2px，红/琥珀/蓝/绿），出现即有含义。docs/32/signature-line.md 同步修订（独立 commit）。
2. **de-slop 12 条逐项执行**（docs/35 第一部分）：卡片去嵌套改分割线、图标统一线框不着色、紧凑密度（列表 6–8px/数据行 4–6px padding-y）、圆角收紧（标签 2–4/卡 6/主面板 8 上限）、静态面板零投影、tabular-nums 全域核查、空状态文字化（虚线框 + 快捷键引导，禁插画）、长文本截断 + tooltip、自定义细滚动条。**注意：第 8 条色彩预算的示例映射不采，语义色一律以 tokens.json 为准。**
3. **Split-Tab Grid**（docs/35 第三部分照案实现）：右栏五工作面默认 Tab 切换；对照工作流可上下对切（默认方向）；窗口 ≥1600px 解锁左右分栏；启动对照时左栏折叠为图标条 + 中栏收窄让宽（合计让出 200–300px）；提供一键复位。
4. **缩放沙盒隔离**：无极缩放/平移只存在于关系图谱面板内部（可配 overview 小地图）；起草画布/时间线/矩阵/docx 预览绝对静止、零视口缩放，交互物理学严格隔离（Ctrl+滚轮在非图谱面板无效果）。
5. B 阶段验收缺陷清单逐项销账（如有）。
6. B 阶段验收新发现三项修复：①起草画布编辑态不得暴露原始 markdown 语法（`## ` 等）——渲染态编辑，含无障碍树（零技术概念暴露纪律）；②时间线"矛盾"高亮改为消费 TimelineEvent.markers 结构化字段（**S-1 已落地，直接接入**；Playwright 回归断言用 evt-24——文本无"矛盾"二字但 markers 应高亮、evt-25——文本提及"矛盾"但无 markers 应取消误高亮，这对事件是 S-1 立项理由的实证样本）；③批量门禁逐条上报——个别条目驳回/修正时确认响应按条目携带处置，不得统一 confirm（core SPEC 已有拍板条目）。
7. Provider 凭证 UI（docs/27 增补）：key 存 OS 钥匙串（Tauri keychain/stronghold）、UI 全程掩码、首启配置引导（显式粘贴或指定环境变量名，零技术概念话术、不扫描第三方配置）；验收项含"key 不进事件流/日志"。
8. 回归：Playwright 更新（含分栏/让宽/缩放隔离/钥匙串引导用例）、协议契约测试不动、Tauri 重打包、逐屏视觉走查记录（截图对照 de-slop 清单写进 SPEC 验收记录）。

纪律照旧：硬约束挑战走 [需架构拍板]；显式路径提交；完工回报后独立验收。
```

## S-1｜Timeline 结构化标记（Claude Code，微工单）

```
你认领 Courtwork 的 S-1 微工单：Timeline 事件结构化标记。背景与拍板见 packages/core/SPEC.md TODO 区 S-1 条目（UI 靠 description 文本匹配"矛盾"做高亮，违反零推断原则）。

先读：CLAUDE.md、packages/schemas/SPEC.md、packages/core/SPEC.md 的 S-1 拍板、packages/demo-data/data/case-bible.md 的矛盾点清单。

交付（TDD，分层 commit）：
1. schemas 增量：TimelineEvent 加可选 `markers?: string[]`，JSDoc 注明当前词表仅 "contradiction"、词表将随 ContradictionList 类型落地后收编；合法/非法样例测试；JSON Schema 再导出过 drift。
2. demo-data 补录：data/artifacts/timeline.json 中与 case-bible 矛盾清单对应的 4 处事件补 `markers:["contradiction"]`，重新对导出 schema 校验通过；manifest.md 追加一行变更记录。
3. schemas SPEC 记录增量与消费方核对（纯增量无破坏；UI 消费改造归 polish，非你的范围）。
纪律：显式路径提交；不碰 UI；跨层发现写对方 SPEC TODO。
```

## W3.0｜阅读视图管线（Claude Code）

```
你认领 Courtwork 的 W3.0 工单：阅读视图管线（packages/reading-view，新 TS 包）。定位见 docs/41——MVP 的摄取路径：office 生态文件 → md 阅读视图 + 段落级锚点映射，供模型阅读与 UI 溯源；OCR 是 v1（不做）。

先读：CLAUDE.md、docs/41、docs/23（双表示：原件保真、md 是模型母语、SourceAnchor 永指原件）、docs/27 MVP 最小集第 1–2 条（解析安全：禁宏禁 XXE、解压比例上限）、packages/schemas 的 SourceAnchor/CaseFile、packages/output 的 docx 解析先例。

交付（TDD，golden files 用样板案语料）：
1. 转换器：docx（可评估 mammoth 或复用 output 的 OOXML 读取路径，二选一写明理由）/ md / txt / 含文本层 PDF（pdfjs-dist 类）→ md 阅读视图。复杂文档降级策略：转换失败或保真度不足时整文件降级为"禁用态声明"（不吐半坏的 md）。
2. 段落映射：阅读视图每段落 ↔ 原件 SourceAnchor（fileId + 段落定位 + quote；PDF 用页 + 文本区间）。映射表是一等产物，UI 溯源与 core 生成节点共用。
3. 扫描件检测：PDF 无文本层 → 明确返回"需要 OCR"状态（对应缺口三态的禁用态），不静默出空文。
4. 安全基线：禁宏禁 XXE、解压比例上限、文件大小限制走配置。
5. CaseFile 对接：输出可填充 CaseFile 的文件清单与摄取状态字段（阅读视图版语义，与未来 OCR v1 兼容——若字段语义需扩展，走 schemas TODO 提案不擅改）。
6. 验收：样板案 20 份 dossier 文书 + 主合同全量跑通 golden 快照；一个刻意构造的坏文件走降级路径有测试。
纪律照旧：TDD、显式路径、共享索引核对、领域语义不进通用转换器（docs/22）。
```

## T-fetch｜web fetch 工具最小实现（Claude Code）

```
你认领 Courtwork 的 T-fetch 工单：packages/tools 新增 web-fetch 工具（MVP 自足的关键件，docs/41 缺口 #3）。

先读：CLAUDE.md、docs/20（C 级信源语义）、docs/27（SSRF 拦截、证书失败即 adapter_error、spotlighting、红线：不关证书校验不绕 WAF）、packages/tools/SPEC.md 与 contract 源码（六 reason/sourceId/缓存语义）。

交付（TDD）：
1. 契约增量：reason 枚举增加 `web_reference`——C 级结果的承载形态（结构上属 verified:false 家族、携带抓取内容与元数据，类型上进不了已核验通道，docs/20 拍板）。SPEC 记录第七个 reason 及其与下游（UI 网络参考角标）的稳定契约。
2. fetch 实现：纯 HTTP GET（不执行 JS，JS 渲染站如实返回内容不足的降级）；SSRF 拦截（私网段/云元数据端点黑名单，重定向逐跳检查）；证书失败 = adapter_error 绝不放行；超时走契约；大小上限与 content-type 白名单（html/text/json）；html → 正文提取为 md/纯文本。
3. spotlighting 消毒层：抓取内容进入返回值前打结构化隔离标记（标记 + datamarking），JSDoc 注明"消费方必须将其作为数据非指令传入生成节点"——消毒是本工具实现的一部分（docs/27 解耦点）。
4. search 适配器接口：定义可配置的搜索适配器位（serper/博查类，凭证走配置）；无凭证时返回 not_configured（禁用态），不做假搜索。首个真实适配器可留骨架 + not_implemented（诚实边界，W5 先例）。
5. 缓存：成功抓取可缓存（TTL 短默认），失败家族不缓存——沿用既有语义。
纪律：mock HTTP 测试（录制夹具），不在测试里真实出网；凭证不入库；显式路径提交。
```

## T-provider｜provider 首批适配（Claude Code）

```
你认领 Courtwork 的 T-provider 工单：packages/core 的 provider 适配层实装（当前为配置化抽象 + 假 provider，无真实 HTTP 实现）。拍板依据：packages/core/SPEC.md TODO 的 wire format 基线条目 + docs/18 全文（quirk 清单）+ docs/27 凭证三形态。

先读：上述三份 + core 的 provider 抽象源码 + eval/SPEC.md（跑分器将消费你的实现）。

交付（TDD，mock HTTP 录制夹具，不依赖真实 key）：
1. OpenAI Chat Completions 兼容客户端（唯一主基线）：消息/流式 SSE/超时/重试；base URL 与模型 id 全部走配置。
2. quirk 层：首批三家（DeepSeek / 阿里百炼 Qwen / 火山方舟豆包）的差异处理，按 docs/18 清单——base URL 路径、response_format 支持档位探测、reasoning 字段名归一、参数互斥规避；**任何"provider 静默吞参数"必须被检测并显式报错**（反静默降级哲学，MiniMax 判例）。
3. 结构化输出统一策略：strict json_schema 优先 → 降级 json_object + zod 校验重试（重试次数走配置，最终失败走既有 invalid_response 语义），对上层（场景执行器）透明。
4. 凭证纪律：key 由配置注入（桌面侧钥匙串对接归 polish，你只定义注入接口）；**key 永不进事件流/日志/错误消息**（docs/27 红线，有测试断言错误对象不含 key）；RuntimeGuard maxUsd 对接各家计价（价格表走配置文件可更新）。
5. 真实冒烟脚本：scripts/smoke-provider.ts，读环境变量 key、无 key 即跳过并说明——供拿到 DeepSeek key 后一键验证与 eval 真实基线解锁。
纪律：Anthropic 原生适配器不在本工单（具名例外，选型需要时另立）；显式路径提交；SPEC 完工记录。
```

## Polish 验收（Claude Code，实现者为 sol，范围 = 72f5756/f59e8c0/f8ec008 三提交）

```
你认领 Courtwork 的 polish 工单验收（角色：验收工程师，AGENTS.md 约束全适用，注意宽 add 禁令与 commit 前查暂存清单两条新判例）。实现者 sol 已回报完工。

先读：AGENTS.md、docs/11 polish 工单原文（8 项）、docs/35（de-slop 12 条 + Split-Tab 细则）、docs/32/signature-line.md 文末架构修订、apps/desktop/SPEC.md 的销账与截图索引、docs/27 凭证节。

验收清单：
1. 构建链干净自跑：install → Vitest（口径 6）→ Playwright（口径 17，核对假绿下限）→ lint → desktop build → Cargo（1）→ Tauri release → codesign/DMG 校验 → 挂载实际启动。原协议契约测试文件逐字节比对未改（git diff 核实，防"改测试凑绿"）。
2. 静默态取消实证：开 app 走查——无语义状态卡片无左线；语义线只在红/琥珀/蓝/绿态出现；左栏对话流中 D/E 引用芯片的细左线核实其语义定义（在 tokens/规格里有出处则过，纯装饰则记缺陷）；AI callout 全 app 仅允许的形态与数量核对。
3. de-slop 12 条逐条走查（对照 docs/35 表格 + visual-audit/ 截图索引），任何一条未达标记录具体屏位。
4. Split-Tab Grid 行为实测：默认 Tab；上下对切；≥1600px 左右分栏解锁（改窗口宽度实测）；让宽（左栏折叠图标条 + 中栏收窄）；一键复位。
5. 缩放沙盒：图谱面板内滚轮缩放/平移可用；其余四面 Ctrl/Cmd+滚轮无效果（逐面实测）；图谱节点连线同坐标系（拖动/缩放不脱节）。
6. 验收三发现销账：起草画布渲染态编辑（无 ## 暴露，含无障碍树抽查）；时间线消费 markers——用 evt-24（应高亮）/evt-25（不应高亮）断言（S-1 实证样本）；批量门禁逐条提交（驳回一条后检查上报载荷按条目携带处置）。
7. 凭证实装：首启引导掩码全程；显式粘贴/指定已有凭证两路径；Rust 端 keyring 系统凭证库、WebView 无明文读取命令（读源码核实 IPC 面）；**key 不进事件流/日志/错误对象**（grep + 触发一次失败观察日志）。
8. 提交卫生：三提交文件清单核对（共享索引环境，reading-view/eval 等并行文件不应在内）。

报告纯追加写入 apps/desktop/ACCEPTANCE.md"polish 验收"节。结论明确：是否放行为"对外可演示版"（Developer ID 公证仍为既有边界不阻塞）。sol 本轮表现照例记录。
```

## P-1｜法理之线语义收敛微补丁（sol，非阻断）

```
你认领 Courtwork 的 P-1 微补丁（实现者 sol）。背景：polish 验收放行但记录一项 [需架构拍板]（R5 低危待处理显琥珀线，tokens/signature-line.md/代码三方矛盾），架构已裁决。

裁决（照案执行）：法理之线表达单一维度"处置状态"，不混严重度——高危待处理=红；依据未核验=琥珀（任何严重度）；已修订未确认=蓝；已确认=绿（任何严重度，"中危确认仍琥珀"是 bug 一并修）；已驳回=灰；中/低危待处理=无线（严重度由等级列徽章表达）。优先级红>琥珀>蓝>绿>灰。

执行项（各独立 commit）：
1. signature-line.md 状态表按裁决重写（权威规格）；tokens.json 遗留 neutral token 改判"已驳回灰"或删除，与规格一致。
2. UI 实现同步 + Playwright 断言：R5 无线、中危确认后转绿、驳回转灰。
3. 顺带销账验收另两项非阻断：被删的"状态圆盘用量明细"Playwright 用例恢复或重写（删除不是重构）；font 简写重置 tabular-nums 的隐患修复（显式 font-variant-numeric，虽当前视觉零影响但属潜伏坑）。
验证：Playwright 全量 + 截图两张（修复前后对照）入 visual-audit/。微补丁不走完整验收轮，完工回报架构会话抽查即可（比例原则）。

【P-1 增补（2026-07-10 架构裁决：使用域白名单制——线回到诞生源头）】
4. 法理之线只许出现在右栏审阅语义场景：风险清单处置态、修订预览、时间线矛盾行、确认门禁卡——白名单成文进 signature-line.md 新增"使用域"节。**中栏对话流/通用 agent 层零线**：D/E 引用芯片去线（mono 编号已足够区分）、AI callout 改无线形态（区隔靠 provenance 底纹）。
5. 线色封闭集：全 app 线色只取五语义 token（红/琥珀/蓝/绿/灰），Playwright/样式审计断言无第六种线色。
6. icon 定性为品牌母题引用（藏青/中性单色），与语义色系分离，图标永不因状态变色（icon.md 补一句）。
```

## 合批验收｜MVP 补强四工单（Grok 4.5 CLI，首次任命——完全自包含版）

```
你是 Courtwork 仓库的验收工程师（本工单任命：Grok 4.5）。这是你首次进入本仓库，以下为全部必要上下文，验收结论只依据你的实测，不采信任何实现会话自述。

【项目与治理】法律垂类 agent 的 TS monorepo（pnpm，Node 22，TDD 纪律）。先读：根目录 CLAUDE.md（工程总纲）、AGENTS.md（角色治理三不变量 + 你作为验收者的处置规则：实现级 bug 可顺手修——独立 commit 前缀 fix-by-acceptance；契约级问题不许改，标 [需架构拍板]；git 纪律：禁宽 add、commit 前必查 git diff --cached --name-only、pathspec 限定 commit——本仓库多会话共享索引，有两次事故判例）。再读 docs/90-架构会话工作手册.md 第五节（哲学速查）。

【验收对象】四张已完工工单（工单原文都在本文件上方对应节）：
A. S-1：packages/schemas 的 TimelineEvent 增 markers?: string[]；packages/demo-data 的 timeline.json 8 个事件补 ["contradiction"]。
B. W3.0：新包 packages/reading-view（office 文件 → md 阅读视图 + 段落级 SourceAnchor 锚点），含三项授权跨层（schemas IngestStatusEnum 增 needs_ocr、registry S1.yaml fileTypes 增 docx/md/txt、CLAUDE.md 架构图补行）。
C. T-fetch：packages/tools 增 web-fetch/web-search 工具，含契约增量（第七个 reason "web_reference"、缓存门禁从"仅 verified:true"扩为"或 web_reference"、describeError 沿 cause 链展开）。
D. T-provider：packages/core/src/provider/ 的 OpenAI 兼容客户端 + DeepSeek/Qwen/豆包 quirk 层 + 结构化输出降级链 + RuntimeGuard 计价 + 冒烟脚本。

【全局验收】
1. 干净环境：rm -rf 所有 node_modules → pnpm install → pnpm test（全量）→ pnpm lint → pnpm --filter '!@courtwork/eval' -r run build。**记录逐包真实用例数**并与各包 SPEC 完工记录比对——两个实现会话先后报过"全仓 619"与"607"，你负责裁定真实口径并排查任何无解释的用例数下降（用例被删而非改写是既有违规形态）。所有 JSON Schema drift 测试须实际在跑。
2. 四工单全部 commit 的文件清单核对（git log 逐个 --stat），无误吞并行文件（并行在途：apps/desktop 的 P-1 可能同期动工）。
3. 全仓 grep 无任何真实凭证/key。

【分项要点（每项给结论：通过/已修复/不通过/需架构拍板）】
A-1 markers 过 drift；8 事件与 packages/demo-data/data/case-bible.md 第六节矛盾清单精确对应（4 类矛盾横跨 8 事件；evt-24 无"矛盾"字样但应有 marker、evt-25 提及"矛盾"但不应有——这对是立项实证）。
B-1 reading-view 定向测试（口径 136/15 文件）；21 份真实语料 golden 快照存在且非空壳。
B-2 安全实测：zip 炸弹检测在解压前发生（读源码确认中央目录先读 + 跑高压缩比样本测试）；DOCTYPE/ENTITY 拒绝；.docm 与 zip 内 vbaProject.bin 拒绝；大小/超时走配置。
B-3 锚点纪律：docx/PDF 路径每个 anchor 带 textLayerVersion（抽查快照）；md/txt 指向原始字节；合并单元格触发整文件降级而非拼错表（有测试）；无文本层 PDF/图片 → needs_ocr 而非空文。
B-4 跨层三变更各自独立 commit 且 registry 内置测试同步。
C-1 编译期红线实测：尝试写一个返回 verified:true 的 fetch 适配器——应当无法通过 tsc（Data=never 的意义）；mock 适配器同样只能 throw ToolWebReferenceError。
C-2 SSRF：私网段/云元数据/IPv4-mapped IPv6 拦截 + 重定向逐跳检查（有测试）；证书失败 = adapter_error 绝不放行；spotlighting 输出含随机边界标记 + datamarking（读实现）。
C-3 缓存门禁扩展是本批唯一动共享执行器逻辑的变更——重点核对：web_reference 可缓存、其余 verified:false 家族仍不缓存、TTL 生效，均有测试。
C-4 search 无凭证 → not_configured，serper 骨架 → not_implemented（诚实边界，无假搜索）。
D-1 凭证金丝雀：注入可识别假 key → 触发各类失败 → grep 全部错误对象/日志/事件无 key 泄漏（有测试且你亲手复跑）。
D-2 反静默吞参：unsupported 档位在发 HTTP 前拒绝（MiniMax 判例的机制化）；ProviderInvalidResponseError 带 suspectedSilentParamSwallow 信号。
D-3 结构化输出降级链：strict → json_schema → json_object + zod 校验重试（次数走配置），最终失败走 invalid_response 语义；quirk-profile 中"已确认 vs 推测"的字段有诚实标注。
D-4 auth.kind/billing.kind 判别字段存在；maxUsd 与 billing.kind==='metered' 关联；价格表走配置；未知 provider/model 时 checkUsd 诚实跳过（非静默算零）。
D-5 冒烟脚本无 key 时明确说明并跳过（跑一次验证）。

【报告】写入 docs/42-合批验收报告-MVP补强.md（新建）。结论必须明确回答三问：四张工单各自是否放行；五项契约变更（web_reference/缓存门禁/needs_ocr/markers/auth.billing 判别）是否背书；MVP 补强是否齐备、可进入"真实 key 首跑 + 对外演示"阶段。
```

## P-2｜交互反馈与空路由收尾（sol，最后一轮 UX debug）

```
你认领 Courtwork 的 P-2 工单（实现者 sol）。目标：消灭"点击木讷"——补交互确认反馈层，清理空路由。规格依据 docs/19-调研报告-交互反馈动效.md（已架构审定），既有拍板不动：数据区绝对静止，但界面必须应答。

执行项：
1. 反馈时长阶梯表全站落地（docs/19 第五节七行表）：按压态 60–80ms（数据卡零位移零缩放，仅按钮加深底色）；hover 全站统一 120ms ease-out（架构裁决：原 100/150 两处不一致收敛于此，principles.md/tokens 同步修订）；Tab 指示器 80–120ms + 内容区 0ms 瞬切；面板对切 0ms；确认/驳回落定 = 本体 0ms 硬切 + 150ms 非对称衰减光效叠加层；续行跳转 200–260ms。
2. 技术纪律：纯 CSS transition/animation + Web Animations API，不引入 motion 库；只动 transform/opacity/background-color/border-color 四类属性（lint 可查则加查）。
3. 绝不许做八条（docs/19）写进 principles.md 并逐条自查：整卡位移/缩放、弹簧回弹、spinner 裸奔、状态本体淡入淡出、Tab crossfade、hover 阴影升起、动画 layout 属性、入口物理消失重现。
4. 空路由清理（docs/19 判据）：结构位（三栏帧、五工作面 Tab）永不隐藏，用既有文字型空态；功能/场景级入口一律禁用态 + tooltip 说明（如"模型服务·待连接"先例），不物理隐藏——保护空间记忆。逐路由走查清单入 SPEC。
5. Playwright：按压态/落定光效/Tab 时长抽样断言 + 空态走查用例；全量回归；截图前后对照入 visual-audit/。
比例原则同 P-1：完工回报架构会话抽查，不走完整验收轮。与 P-1 可同会话连续执行。
```

## P-3｜关系图谱换库（sol，MVP 量产版）

```
你认领 Courtwork 的 P-3 工单（实现者 sol）。目标：关系图谱从手绘 SVG 手排坐标升级为量产版。规格依据 docs/43-调研报告-场景UI可视化选型.md（已架构审定）。

裁定（照案执行）：
1. 渲染库 = AntV G6 5.x；布局 = 内置 dagre 层次布局为默认（谱系语义），力导向仅作二级探索视图（非默认）；**布局算法不自研**。
2. 皮肤自控：G6 主题系统对接 tokens.json（藏青黑/语义色/1px 描边/浅色唯一），库默认样式一律覆盖——原则：**声明式拓扑归数据（PartyGraph schema），怎么画归 tokens**（Craft beautiful-mermaid 同构机制，写进 principles.md 一行）。
3. 既有交互契约不降级：缩放/平移沙盒仍限图谱面板内部（docs/19 八禁不破）；节点/边点击溯源（SourceAnchor）保留；矛盾关联边琥珀标记消费结构化字段。
4. 数据源不变：demo-data party-graph.json（14 节点 15 边）全量渲染无标签压字（此前手排坐标的压字问题应由 dagre 自动布局根治，Playwright 加防回归断言：无节点/标签几何重叠）。
5. 包体积记录进 SPEC（G6 按需引入，tree-shaking 实测数字）；Playwright 更新 + 截图对照入 visual-audit/。
比例原则：抽查制，与 P-1/P-2 同队列连续执行。Stage 2 挂账已记（ELK 切换判据、sigma.js 量级评估、Observable Plot/ECharts 分诊）——不预做。
```

## P-4｜图标体系与 SVG 工程规范（sol，随 P 队列执行）

```
你认领 Courtwork 的 P-4 工单（实现者 sol）。目标：图标体系建库 + 模型编写 SVG 的工程规范落地。规格依据 docs/44-调研报告-组件与图标库.md（已架构审定）。前提裁决不重开：产品内素材一律 SVG-as-code，image-gen 不入产品 UI。

执行项：
1. Lucide 接入（首选已裁定：ISC、stroke 全局锁 1.35px、tree-shaking 按需引入）；存量手工图标逐个替换或保留（保留需符合规范第 3 条）；Tabler 仅补缺口且人工核对描边密度后混用。
2. SVG 工程规范成文（docs/32-设计语言包/ 新增 svg-standards.md）：24×24 网格、1.35px 描边、stroke=currentColor、禁内联色值/禁 fill、元素白名单、svgo 配置（preset-default + removeViewBox:false + floatPrecision:2 + multipass）、16px/24px 缩小可辨自查、**命名按形状而非法律用途**（docs/22 纪律的图标层体现）。
3. 校验脚本自写（CI 可跑）：规范第 2 条的机器可查项全覆盖（通用 eslint-svg 插件已停维，不引入）。
4. 领域图标首批 17 个自绘（docs/44 缺口清单：卷宗/盖章核验/门禁三态/定稿冻结/修订矛盾/图谱摄取/生成核验区隔/分层确认/阶段续行/场景入口等）：模型编写 SVG → 过校验脚本 → 16px 自查截图入 visual-audit/ → 架构抽查人审。
5. Base UI 不在本工单（触发式引入，判据：下一个需要 Dialog/Popover 级新组件时）；packages/ui 不抽（第二个 UI 壳出现前不动）。
比例原则同 P 队列：抽查制。
```

## F-1｜composer 输入区整备（Grok 4.5 实现试点——首次实现任命）

```
你是 Courtwork 的实现工程师（本工单任命：Grok 4.5——你此前已通过验收校准，本单为实现能力校准；AGENTS.md 三不变量与实现处置规则对你同等约束，git 纪律注意：禁宽 add、commit 前查 git diff --cached --name-only、pathspec 限定 commit）。

范围：apps/desktop 中栏 composer 输入区整备。规格依据 docs/45-调研报告-composer输入区惯例.md（已架构审定）+ 以下裁决，先读：AGENTS.md、docs/45、docs/32-设计语言包/（tokens/principles 全部硬约束）、docs/19（反馈阶梯 + 八禁）、docs/41（缺口三态）。

裁决（照案执行）：
1. 按钮族平铺不聚合：文件上传、案件文件夹选择、发送（真实）+ 拍照/扫描、语音（禁用态常驻置灰 + tooltip，文案模板"〔功能〕即将支持 · 当前可通过〔替代路径〕实现"，零技术概念话术）。图标全用 Lucide 通用隐喻（stroke 1.35px 全局锁定）。
2. 附件用文件名 chip（类型图标 + 截断文件名 + 移除 + 失败重试内联），上传 2–5s 边框微光、>5s 事件流进度；成功/失败本体 0ms 硬切 + 150ms 衰减光效。
3. "仅本条 vs 存入卷宗"：默认仅本条；chip 带可点击归属徽章 → popover 轻确认（增量型不可逆按比例原则用轻确认，非 modal）→ 确认后硬切绿"已存入卷宗"，无反向操作（与定稿编译同一单向纪律）。
4. 拖放（全窗 overlay 提示落点）与 ⌘V 粘贴文件；Enter 发送/Shift+Enter 换行 + KBD 提示（typography-density.md §五规格）。
5. 上传路由：真实接 packages/reading-view 转换（needs_ocr/disabled 状态如实呈现为 chip 失败态 + 说明）；发送与事件流对接沿用既有协议客户端，不新增业务逻辑进壳。
验证：Playwright 覆盖按钮态/chip 生命周期/作用域确认/拖放粘贴 + 假绿防护；截图入 visual-audit/；显式路径分层提交。完工回报后由 Claude Code 会话验收（异模型不变量）。
```

## F-2｜全局动词补全（Claude Code/Sonnet，与 F-1 对照组）

```
你认领 Courtwork 的 F-2 工单（实现者：Claude Code）。范围：apps/desktop 全局动词补全，五件事，规格依据 docs/46-控件全量清单.md 及其架构裁决节（十项拍板照案执行，不重开）。

先读：AGENTS.md（git 纪律：禁宽 add、commit 前查暂存、pathspec commit）、docs/46、docs/32-设计语言包/（硬约束）、docs/19（反馈阶梯/八禁）、docs/45（popover 轻确认先例）。

执行项：
1. ⌘K 最小命令面板（兑现已上屏的 KBD 承诺）：场景触发 + 案件切换 + 全局动作（新建案件/归档/专注模式/打开产出文件夹），模糊匹配，零技术概念文案；Esc 关闭；样式吃 tokens（surface-popover 语义）。
2. 新建案件：左栏 + ⌘K 双入口 → 系统文件夹选择器 → 案件命名 → 进入案件（接既有 CaseFile 语义）。
3. 归档案件：popover 轻确认，归档/取消归档可逆；无删除入口（数据保全裁决）。
4. 专注模式：任一工作面全窗独占，Esc 退出，KBD 提示；进出 0ms 硬切（八禁：无 crossfade）。
5. AI callout/数据卡补复制动作（hover 显现，60–80ms 按压态），复制为纯文本含溯源引文。
验证：Playwright 全覆盖 + 假绿防护；截图入 visual-audit/；显式路径分层提交。完工回报后独立验收（届时与 F-1 同批，验收会话对比记录两模型装配质量——对照组实验数据）。
```

## S-2｜PartyEdge 结构化标记（Claude Code，微工单——S-1 同构复刻）

```
你认领 Courtwork 的 S-2 微工单：PartyGraph 边的结构化矛盾标记。完全复刻 S-1 的模式（读 packages/schemas/SPEC.md 的 S-1 验收记录作先例），背景：P-3 图谱已实现 markers 消费（拒绝按文案/边 ID 猜测），当前 demo 矛盾边计数为 0，缺数据侧。

交付（TDD，分层 commit，git 纪律照 AGENTS.md）：
1. schemas 增量：PartyEdge 加可选 `markers?: string[]`（JSDoc 与 TimelineEvent.markers 同措辞：词表仅 "contradiction"，待 ContradictionList 收编）；合法/非法样例测试；JSON Schema 再导出过 drift。
2. demo-data：party-graph.json 中与 case-bible 矛盾清单对应的矛盾关联边（e-14/e-15，以 case-bible 第六节为权威核对）补 `markers:["contradiction"]`；重校验；manifest 追加变更记录。
3. schemas SPEC 记录增量；验证 apps/desktop 图谱矛盾边计数由 0 转正（现有消费逻辑应自动生效，若需一行适配属实现级可改）。
```

## F-3｜最小 work 能力包：系统动词 + 工作稿轨（Grok 4.5，按新派发默认）

```
你是 Courtwork 的实现工程师（本工单任命：Grok 4.5）。范围：apps/desktop + packages/tools 的最小通用 work 能力。规格依据 docs/23 双轨增补节 + docs/29 增补 + docs/46 活清单（先登记再实现）。先读：AGENTS.md（git 三判例全适用：禁宽 add、commit 前查暂存、混合文件手术暂存+裸 commit）、docs/23、docs/27（凭证与安全红线）、docs/46。

执行项（优先级排序）：
1. **reveal-in-folder（最高优先，用户找不到文档是真实流失点）**：tools 契约新增受限系统动词工具——`reveal-in-folder` 与 `open-file` 两个动词，Tauri opener API 实现，**路径白名单限案件文件夹内**（越界路径 = 拒绝并降级报错，不静默）；每次调用 UI 有可见反馈（"已在访达中显示"/"已为您打开〔文件名〕"，零技术概念话术，macOS 称"访达"）。agent 可调用（进场景工具位）+ UI 按钮直调（产出 docx 卡片、状态条"打开产出文件夹"）双路径。永无任意命令执行。
2. 工作稿轨：案件文件夹内新建/编辑 md/txt 工作稿（笔记/备忘/草稿），复用起草画布编辑面 + 自动保存；文件落案件文件夹"工作稿"子目录。
3. **原件只读红线（有测试）**：上传的卷宗原件在任何路径不可写——工作稿轨与 system-open 的白名单都必须结构性排除原件写入；Playwright 断言原件区无编辑入口。
4. docs/46 活清单登记本批新控件（reveal/open 按钮、新建工作稿入口）后再实现。
验证：tools 契约测试 + desktop Vitest/Playwright + 假绿防护；截图入 visual-audit/；分层 pathspec commit（注意混合文件判例）。完工回报后独立验收（Claude Code 或 sol）。
```

## F-4｜文件操作分级与卷宗整理场景（Grok 4.5，F-3 完工后接续）

```
你是 Courtwork 的实现工程师（本工单任命：Grok 4.5）。范围：文件操作三级动词 + "卷宗整理"场景。规格依据 docs/47-架构决定-文件操作分级.md（照案执行，销毁级永不出现）。先读：AGENTS.md（git 三判例）、docs/47、docs/23 双轨节、F-3 的 system-open 实现（复用其白名单基建）、docs/24（场景声明规范）、packages/schemas/SPEC.md（提案先例）。

执行项：
1. schemas 提案：整理计划 artifact 类型（暂名 FileOpsPlan：条目 = {源路径, 目标路径, 动词(move|rename|copy|mkdir), 理由, 勾选态}，含内容哈希前后字段）——过架构 review 的提案流程（提案 → 我拍板 → 落地），JSON Schema + drift 照旧。
2. tools 扩展：无损级动词直执（copy/mkdir 并入 F-3 白名单基建）；移形级执行器（吃已确认的 FileOpsPlan、逐条执行、内容哈希比对留痕、事务日志落盘、一键撤销 = 逆向重放，有测试：撤销后文件系统状态与执行前逐字节一致）。
3. 场景注册表新增"卷宗整理"声明（S6）：触发 = 拖入未归档文件批 / 场景按钮；产出 = FileOpsPlan；门禁 = 计划确认（分层：大批量强制抽看）；工具位 = 移形执行器。
4. UI：计划表格（逐条勾选/理由列/目标预览）、执行报告、撤销按钮（含撤销确认轻 popover）；原始文件名与哈希留痕入 CaseFile 条目展示。
5. 红线测试：delete/覆盖语义全链路不存在（grep + 类型层证明）；撤销日志不可删；单文件 move 也过轻确认。
6. F 批验收遗留销账（顺手，各自小 commit）：`openOutputFolder` 从 demo 常量改为 `outputPath(caseRoot)` 派生（新建案件当前会得可见拒绝）；Icon.tsx 中 8 个已注明"并发提交后删除"的过渡别名清理。
验证：契约测试 + Playwright（整理计划全流程 + 撤销一致性）+ 假绿防护；docs/46 活清单登记；分层提交。完工后独立验收。git 纪律含热点文件独占确认（App.tsx 现已安静）。
```

## F 批合批验收（Claude Code，范围 = F-1 composer / F-2 全局动词 / F-3 系统动词+工作稿）

```
你认领 Courtwork 的 F 批合批验收（角色：验收工程师；实现者：Grok 为主 + F-2 前半为 Sonnet）。三单工单原文在本文件上方对应节；实现回报要点已录入各 SPEC。

先读：AGENTS.md（git 判例全集——本批实现期共享索引冲突高发，多次前进式修复，验收含"git 考古"项）、docs/45/46/47、docs/32-设计语言包/、apps/desktop/SPEC.md、packages/tools/SPEC.md。

全局验收：
1. 干净环境全链：install → tools 193 → desktop Vitest 35 → Playwright 57/57（假绿下限核对）→ lint + lint:icons/motion/signature/graph 四门禁 → 生产构建 → cargo check。
2. **git 考古（本批特别项）**：F-2 期间发生多次误吞与前进式修复（1692630 等）——核对最终 HEAD 的 App.tsx/styles.css：无未授权 hunks 残留、图标迁移改动未被误吞或回滚（对照其自身提交）、各前进式修复的净效果正确。
3. docs/46 活清单与实现一致性：F 批回填的"真实实现"项逐一属实。

分项焦点（实现者自列 + 架构加码）：
F-1：八裁决对照（平铺/文件名 chip/禁用态模板文案/存卷宗 popover 单向/全窗拖放/⌘V/IME 防误发/KBD）；上传真实路由 reading-view（needs_ocr 如实呈现）；协议壳零业务逻辑；**遗留补查**：reading-view 跨包修复在其 SPEC 留痕（追认条件②，缺则补写）+ FNV 短哈希漂移检测充分性一句话评估。
F-2：⌘K 兑现（打开/Esc/模糊/场景/案件/新建/归档/专注/打开产出文件夹——最后一项须真实调 F-3 reveal 非占位）；专注模式 0ms 硬切、左中栏真卸装、Esc 恢复；归档可逆且全 app 无删除语义；callout 复制含溯源引文；十裁决抽查（无全局刷新、下载落点等）。
F-3：越界路径始终可见失败（构造越界用例亲测）；宿主零 shell（读 Tauri capability + Rust 命令面）；工作稿只能写工作稿区、原件区无任何编辑入口（含无障碍树）；子路径导出未把 node:net/web-fetch 打进 desktop 包（读产物或构建分析确认）。
4. **对照记录（实验数据交付）**：同约束体系下 Sonnet 段（fuzzy-match/新建案件/复制按钮）vs Grok 段（F-1/F-3/F-2 余量）的装配质量对比——缺陷密度、规格贴合度、自主发现质量，写成一节供架构选型参考。

处置规则照 AGENTS.md（git 操作全程遵三判例 + 高峰期 CAS 协议）。报告纯追加写入 apps/desktop/ACCEPTANCE.md"F 批验收"节（F-3 tools 部分在 packages/tools/SPEC.md 留痕）。结论三问：三单各自是否放行；产品可用面（composer+全局动词+系统动词+工作稿）是否达"对外可演示版"增补标准；工作树是否安静可放行 F-4 开工。
```

## F-4 验收（Claude Code，范围 = 四层提交 d559678/f98a55c/d49080a/06cb66c）

```
你认领 Courtwork 的 F-4 验收（角色：验收工程师，AGENTS.md 全判例适用；实现者 Grok）。工单原文与完工回报要点在本文件 F-4 节与各 SPEC。

先读：AGENTS.md、docs/47（含全部增补）、packages/schemas/SPEC.md 的 FileOpsPlan 提案合入记录、packages/tools/SPEC.md、registry S6 声明、docs/46 回填。

验收清单：
1. 干净环境全链：install → schemas 94 → tools 204 → registry（builtin 含 S6）→ Playwright 60/60（假绿下限）→ 生产构建；drift 测试实跑。
2. 契约核对（本单重点）：FileOpsPlan 落地是否忠实 docs/47 拍板（verb 枚举封闭 move|rename|copy|mkdir、**无 delete**——类型层 + grep 测试双证；哈希前后字段；originalFileName 留痕）；ArtifactTypeEnum 扩展的消费方核对（RevisionEvent 可用范围、registry S6 引用、UI）；CaseFile 增量 originalFileName?/contentHash? 为纯增量；SPEC 以"提案合入"格式记录（W4 先例，非单方改契约）。
3. tools 新增对 schemas 的依赖：与 CLAUDE.md 架构图"可依赖"修正一致，确认依赖方向合法且 desktop 子路径 import 未把 web-fetch 带进浏览器包（复用 F 批验收手法）。
4. 执行器语义亲测：吃"已确认"计划（未确认计划拒执行有测试）；哈希比对留痕；**撤销后内存 FS 快照逐字节一致**（亲手跑该测试并读断言真实性）；事务日志无删除路径；单文件 move 仍过轻确认。
5. S6 声明完整性：触发双通道、产出 FileOpsPlan、门禁计划确认（大批量分层）、工具位齐；strict 校验过。
6. UI 走查：计划表勾选/理由/目标/原名/哈希列齐全；执行报告；撤销轻 popover；全 app 仍无删除入口；docs/46 回填属实。
7. 边界记录核对：演示宿主为内存 FS（与 F-3 mock 同构）已在 SPEC 如实声明，真磁盘/Tauri 装配为已知后续（不阻塞）。
8. git 卫生：四层提交文件清单核对。

报告纯追加写入 apps/desktop/ACCEPTANCE.md"F-4 验收"节（schemas/tools 部分在各自 SPEC 留痕）。结论：F-4 是否放行；S6 卷宗整理是否可进演示剧本；FileOpsPlan 契约是否背书。
```

## SEC-1｜push 前安全清扫（Grok 4.5，阻塞 push）

```
你认领 Courtwork 的 SEC-1 工单：远程 push 前的数据安全清扫。范围 = 工作树 + **git 全历史**（泄漏进历史的东西 push 后收不回）。AGENTS.md git 判例全适用；本单可改 .gitignore（实现级）。

清扫清单：
1. **凭证全历史扫描**：git log -p 全量 grep 密钥形态（sk-/api[_-]?key/token/password/BEGIN.*KEY 等模式）+ 工作树同扫。测试金丝雀假 key 需逐个确认标注为假（fake/canary 字样在旁）；发现任何疑似真实凭证 → 立即停止并报告（届时走历史清洗方案另议，不自行 filter-branch）。
2. **.gitignore 加固 + 未跟踪核查**：.obsidian/（用户本地文档查看器，架构预裁不入 repo）、usecase/（真实判例 PDF，获取手法不宜分发，架构预裁不入 repo）、.claude/、apps/desktop/src-tauri/target/、node_modules、各类 reports/临时产物——加 ignore 并 `git log --all -- <路径>` 确认从未入过历史（入过则报告，不自行清洗）。
3. **敏感数据抽查**：demo-data 虚构纪律复核（合批验收做过，抽查即可）；visual-audit 截图里无真实个人信息；测试夹具无真实当事人（CLAUDE.md 纪律）。
4. **个人信息盘点（报告不处置）**：docs/工单 prompt 中的绝对路径（/Users/lesprivilege/...）、提交人邮箱、机器名等——列清单交用户定级（私有 repo 可留 / 公有须洗）。
5. **仓库卫生**：他会话遗留的 acceptance-temp stash 提醒收口（stash 不 push，不阻塞）；大文件盘点（>5MB 逐个列出用途）；DMG 等构建产物不入库确认。
6. 产出：SEC-1 报告（docs/51-push前安全清扫报告.md）——逐项结论 + .gitignore diff + 个人信息定级清单 + push 放行建议（放行/待用户定级/发现凭证阻塞三态之一）。
纪律：只读扫描为主，唯一写操作是 .gitignore 与报告；发现历史污染不自行改写历史。
```

## D-1｜真机 debug 首批（Grok 4.5，信任级优先）

```
你认领 Courtwork 的 D-1 工单：真机实测三缺陷修复。AGENTS.md 全判例适用（含全仓 -r build 自查）。按优先级执行：

1. **【信任级】模型连接状态造假**：填错钥匙串密码/未填 api key 时 UI 仍显"模型已连接"。修复原则：连接状态必须**探针驱动三态**——待连接（未配置）/已连接（钥匙串读取成功 + 凭证格式校验，可选轻量 ping 但不强制出网）/连接失败（读取被拒/授权失败，附零技术概念的引导文案如"钥匙串授权未通过，请重试或重新填写"）；**任何路径不得默认或乐观显示已连接**（静默降级零容忍在状态条上的适用）。补 Playwright：未配置态、授权失败态、成功态三分支断言——demo 装配的"永远已连接"是本 bug 逃过测试的原因，测试必须能在非 demo 装配下跑。
2. **【信任级】demo 语料污染真实容器**：新建案件后 demo 的卷宗/阶段/时间线文本仍占位。修复原则：**demo 装配只属于 demo 案件容器**（docs/21 装配点边界的 UI 面）——新建案件从文字型空态起步（空态规格已有：虚线框 + 引导文案），卷宗/阶段/时间线随真实任务流填充（上传→阅读视图→artifact 到达事件驱动）；demo 案件在列表中明确标识（如"样板案·演示"角标）。补 Playwright：新建案件后各工作面为空态断言。
3. 归档按钮文本溢出 + **同类全局审计**：按 de-slop 第 11 条（单行截断 + hover tooltip）修复归档按钮，并全局扫一遍按钮/标签/chip/面包屑的溢出处理（中文长案件名、长文件名为测试素材），审计结果与修复清单入 SPEC。
4. **【信任级】死路由/容器作用域系统审计**：真机发现新建案件仍继承前一案件的阶段/路由（阶段注入不随容器变）——这是状态所有权错位的一族（F 批验收的 DEMO_OUTPUT_DIR 是首个标本）。方法定死，不许逐个摸：
   a. **静态扫描**：grep apps/desktop 全部模块级常量/单例/闭包缓存中持有案件域数据者（阶段列表、路由表、路径、面包屑文案、demo 引用），逐个列表定性（合法全局 / 应派生 / 死路由）。
   b. **修复原则**：一切案件域状态由 activeCase 派生、容器切换即整体重派生（单一 selector 出口，禁散落读取）；模块级不得持有任何案件数据。
   c. **容器切换矩阵测试（Playwright，防复发）**：建案件 A → 各工作面产生状态 → 建案件 B → 断言零继承（阶段/时间线/卷宗/面包屑/产出路径/场景卡全部空态或 B 自有）；A↔B 往返切换再断言。
   审计清单 + 定性 + 修复对照入 SPEC。
验证：全仓 -r build + 全量测试 + 新增三分支/空态/切换矩阵断言 + 截图前后对照入 visual-audit/。显式路径分层提交。完工回报后独立验收（Claude Code）。
```

## D-1 验收（Claude Code，范围 = 4f59ab9/5541d9c）

```
你认领 Courtwork 的 D-1 验收（验收工程师，AGENTS.md 全判例 + worktree 复核纪律；实现者 Grok）。工单原文在本文件 D-1 节（四项 + docs/52 #8 实例清单）。

验收清单：
1. 干净环境：install → desktop Vitest 45 → Playwright 67/67（假绿下限）→ pnpm -r build 9 包 → cargo test 2/2（亲读断言：错误对象无 secret 字段）。
2. 凭证探针三态（信任级重点）：读 TS+Rust 探针实现——确认无任何"乐观已连接"路径（状态只能由探针结果派生）；Playwright 三分支（未配置/强制 failed/合法保存）逐个跑；保存失败不关窗有断言；引导文案零技术概念。**真实钥匙串拒绝路径无法自动化**——代码路径核完后在报告注明"待用户真机复测一次错误密码流"。
3. demo 隔离：isDemo 角标存在；DEMO_ARTIFACTS 仅 demo 案件回落（读装配点边界）；新建案五工作面 + 对话 + chrome（标题栏/面包屑/状态条/composer chip——docs/52 #8 五处逐一）全空态/自有值，无"阶段一·阅卷整理"串味。
4. 容器作用域：CASE_SCOPE_AUDIT 表逐行抽查定性合理；切换矩阵测试真实覆盖 demo↔新案往返零继承；产出路径由 caseRoot 派生（F 批发现②销账确认）。
5. 溢出：长案名（≥30 字中文）归档 popover 截断 + title；全局 ellipsis 抽查（chip/标题/阶段/凭证钮）。
6. docs/52 #9 蓝色团块排查结论在案（修复或定性）。
7. git 卫生：两提交文件清单。
报告纯追加 apps/desktop/ACCEPTANCE.md"D-1 验收"节。结论：四项信任级缺陷是否关账；真机复测清单（留给用户的手动项）列出。
```

后续工单（W3/W8-OCR-v1）验收实例在各实现会话回报后按同一结构生成。

## SET-1｜设置页（Grok 4.5，D-1 验收放行后开工）

```
你认领 Courtwork 的 SET-1 工单：设置页整体实现。规格 = docs/46"设置页清单"节（分组/条目/路由状态已裁死，不增不减）。先读：AGENTS.md、docs/46 该节、docs/28（opt-in 确认制交互——关键授权逐项确认，不埋长文本）、docs/27（key 管理纪律）、docs/25（清除偏好与清空对话双入口语义）、docs/19（空路由判据：预留项禁用态+tooltip"即将支持·当前替代路径"）。

要点：
1. 入口：标题栏齿轮 + ⌘K"设置"动词；设置为全局层（容器无关），路由切换 0ms。
2. 真实路由组全部接真：key 管理复用 D-1 探针三态组件；用量限额读写 RuntimeGuard 配置；默认产出目录带文件夹选择器 + reveal 验证按钮；遥测开关与 opt-in 本地持久化（同意态带时间戳留痕——docs/28 审计语义）。
3. 预留组一律禁用态 + 模板 tooltip，零假开关（点了没反应的开关比禁用态更伤信任）。
4. 数据承诺声明页：主协议级文案（"案件内容永不训练"等，从 docs/28 矩阵摘录），静态但排版按 typography-density 文书级处理——这一页会被律所客户逐字读。
5. Playwright：真实组逐项行为断言 + 预留组禁用态断言 + 假绿下限更新；docs/46 状态回填。
纪律照旧：全仓 -r build、显式路径、独立验收。
```

## UX-1｜微调批次一（Grok 4.5，D-1 验收放行后开工，与 SET-1 串行）

```
你认领 Courtwork 的 UX-1 工单：docs/52 批次一全部 10 项（裁决已死，逐项照案，不重开）+ D-1 验收打回两项（优先做）。

打回项（第 0 优先）：
0a. composer 文件夹 chip 案件作用域：注入 activeCase 投影、随容器切换重置（非 demo 案件不显示 demo 案名），CASE_SCOPE_AUDIT 补登该符号 + SPEC 死路由表补行；切换矩阵 e2e 补 chip 断言。
0b. e2e 光标依赖排查：D-1 验收发现 palette 测试因 openWorkbench 后光标悬停位置被 onMouseEnter 抢占初始高亮（已修）；全 e2e 扫一遍同类隐性光标位置依赖，发现即按同法（mouse.move(0,0)）加固。
先读：AGENTS.md、docs/52 全文、docs/45（含第 4 项修正案）、docs/49、docs/19/32（动效与 tokens 硬约束）。

要点提醒（易错处）：
- #3 composer-first 新建：容器化仪式 popover 复用"存入卷宗"同族交互；两路新建并存。
- #4 修正案：相机/语音移入"+"溢出菜单（菜单内禁用态+tooltip），平铺只剩真实动词。
- #10 ①组做真：provider 切换/模型/推理强度全部读写 provider 配置（T-provider 层现成），状态条模型名可点；推理强度文案"标准/深思"；无任何假活开关。
- #2 双词表：容器 context 驱动（案件"卷宗 N 件"/工作区"资料 N 件"）。
- #7 思考流折叠仅做容器与折叠交互（内容留 T-provider.1 接流式）。
- #9 蓝色团块若 D-1 未查清则本单查清。
验证：全仓 -r build、Playwright 全量 + 新增断言 + 假绿下限更新、截图对照 visual-audit/、docs/46/52 状态回填。显式路径、独立验收。
```

## SITE-1｜产品官网（GitHub Pages，Grok，触发条件：全测通过 + key 首跑后）

```
你认领 Courtwork 的 SITE-1 工单：产品展示官网（GitHub Pages 静态站，无域名）。目标："看起来与有品味的商业成品一模一样"——第一眼 + 向上游投递的门面。

先读：docs/32-设计语言包（tokens/规格全约束——官网与产品同语言）、docs/92（叙事母本）、docs/28（信任区文案依据）、visual-audit/ 真机截图库、架构会话提供的叙事文案稿（届时随工单附）。

区块（照叙事骨架）：Hero（定位一句话 + 下载按钮：macOS/版本/SHA-256）→ 三招牌场景（真机截图/动图：S6 成卷、时间线矛盾、审查出修订 Word）→ 信任区（永不训练/原件只读/钥匙串/留人确认——docs/28 直译，法律买家核心屏）→ 工艺区（法理之线故事）→ 合作与联系。
要求：单页静态 HTML + tokens（北极星屏技法复用）；零投影浮面语法（docs/49 第四章）；Hero 微交互一处——法理之线滚动点亮（签名动作官网首秀，克制）；移动端可读；Lighthouse 90+；截图使用须过 SEC 纪律（无 PII，visual-audit 已核）。
```

## UX-1 + SET-1 合批验收（Claude Code，实现者 Grok）

```
你认领 Courtwork 的 UX-1/SET-1 合批验收（验收工程师，AGENTS.md 全判例 + worktree 复核 + 尾随 echo 判例）。范围：UX-1（docs/52 批次一 10 项 + D-1 打回 0a/0b，落点列已在表）与 SET-1（docs/46 设置页清单，提交 0f82141/841cbe0/c9960e8）。

全局：干净环境 → pnpm -r build 9 包 → Vitest 55 → Playwright 78/78（下限 78，退出码单独查）→ 四门禁 → git 卫生（两单全部 commit 文件清单）。

UX-1 焦点：
1. 打回项闭环：composer chip 案件作用域（切换矩阵 e2e 含 chip 断言 + CASE_SCOPE_AUDIT 补行核对——D-1 验收指出的审计漏登必须已补）；e2e helpers 统一 + mouse.move(0,0)（抽 3 个 spec 核实）。
2. #9 结案核验：G6 minimap 默认蓝渗出的定性 + tokens 压制——真机/预览目视右下角确认团块消失，定性写进 SPEC。
3. 抽查四项交互语义：容器化仪式 popover（先聊后建，与存入卷宗同族交互）；「+」菜单内禁用态（平铺仅真实动词）；双词表随容器 kind 切换；model-config 真实读写（改推理强度 → 配置持久化验证，无假活）。
4. ThinkingStream 仅壳（折叠交互 + spark-lines 标识，无假内容）。

SET-1 焦点：
1. 双入口（齿轮 + ⌘K）→ 全局浮层容器无关；Esc 关闭；分组 0ms。
2. 真实组逐项行为验证：凭证入口复用 D-1 探针（无第二套连接逻辑）；maxUsd 写入 → RuntimeGuard 配置语义核对；默认产出目录选择 + reveal；遥测/opt-in 持久化——**opt-in 确认对话框 + 同意时间戳留痕 + 关闭清空不溯及**（docs/28 语义逐条对）。
3. **诊断导出安全审查（重点）**：读导出实现——无密钥、路径脱敏的主张逐字段核实，导出一份实物检查。
4. 预留组零假开关（aria-disabled + 「即将支持」逐个点）；「明确不出现」三项 grep 确认（主题/语言/skill 全 app 无入口）。
5. 数据承诺声明页：与 docs/28 矩阵逐条对（不许改写语义），文书级排版抽查。

报告纯追加 apps/desktop/ACCEPTANCE.md「UX-1/SET-1 验收」节。结论：两单各自放行与否；desktop 是否就绪进入 RP-1（最后一张重排单）。
```

## RP-1 最终重排：左右栏分层 + 画布-浮面层级（Grok，Build 门工单）

```
你认领 Courtwork 的 RP-1 工单：desktop 最终重排——这是 base 定形的最后一张结构单，验收通过即出首个正式 Build。热点文件（App.tsx/styles.css）独占期，无并行会话。

必读：CLAUDE.md → docs/49 全五章（三章右栏模块栈、四章画布-浮面三层、五章 frontier 实测参照与 Build 门）→ docs/25 增补与修正（左栏即容器列表、混排列表图标承载类型）→ docs/32 设计语言包（tokens 纪律）→ docs/52 批次二 #11/#12 + 批次三 #16/#17 → apps/desktop/SPEC.md 与 ACCEPTANCE.md 末节。读完先复述范围确认。

第 0 步：apps/desktop/ACCEPTANCE.md 有一份验收会话留下的未提交追加（UX-1/SET-1 验收报告，+128 行纯追加）——核实为纯追加后**原样提交**（显式路径，独立 commit，信息注明"代验收会话提交"），不改一字。

交付（三块一次重排，docs/49 为唯一权威）：

A. 左栏（五章参照 + docs/25 修正）
1. 混排时序列表：案件/工作区/未归档对话同列，前置 SVG 图标承载类型（P-4 域图标：卷宗/文件夹/气泡），未归档对话行尾「存入」轻动词（接既有容器化仪式）。不分区；Pinned 区保留在上。
2. 案件行独有 chevron 展开：阶段 + 三区（工作结构非对话历史）；现左栏的阶段/卷宗原件/工作稿区收编进展开态。
3. 导航骨架四位：产出（真路由，跳工作区级产出目录）；定时/派发（禁用态骨架 + 「即将支持」tooltip，与设置页预留组同纪律，零假活）；Customize 不做。
4. 批次三 #17 顺手：主办律师占位为 demo persona，非 demo 案件不显示（CASE_SCOPE_AUDIT 补行）。

B. 右栏模块栈（三章）
1. 声明渲染的折叠模块栈：通用三件常驻（progress/working folders/context）+ 垂类工作面同栈；全模块默认面板头可见（名称+计数+状态点）。
2. progress 面板头吸收底部状态条的阶段进度（`0/6` 升入面板头，frontier `17 of 17` 形制）；working folders = 三区树（原件行带只读标记）；context = 用量圆盘明细 + 附件来源 + 已连接模型 chip（connected 态常驻声明位）。
3. artifact_produced 自动展开对应模块并铺数据；用户手动折叠/展开优先于自动。
4. 既有 Tab/对照/专注不推翻：同栈三种视图密度，实现为增量迁移。

C. 画布-浮面三层（四章）
1. L0：对话流直接坐页面底色（冷灰系），去卡壳。L1：左栏/右栏/composer 上浮——纯白面 + inset 不贴边 + 圆角 12 + 细描边、零投影。L2：popover 既有。
2. 标题栏透明化融入红绿灯 chrome 层，只留 wordmark + 全局动作；模型服务常驻归状态条（模型名可点开 model-config popover），非 connected 态才在标题栏浮现琥珀警示。
3. 收缩态：左栏折叠 + 右栏全折 → 画布 + composer 浮卡 + 折叠按钮。
4. tokens 增 elevation 组（底色级联 + inset 间距）：先在 SPEC 写提案值再实现，完工报告列全量供架构过目；不得引入投影、不得新增语义色。
5. 批次三 #16 顺手：模型服务 popover「先看」按钮语义修正（实为取消却像完成链接——动词改直白，主次按钮层级照 docs/32）。

验收标准：9 包干净 build；Vitest 全绿；Playwright 全过且**下限随新增用例上调**（assert-test-count floor 同步，禁降）；四门禁全绿；新增 e2e 至少覆盖：混排列表图标与展开、未归档对话「存入」、progress 面板头计数、artifact 自动展开、标题栏琥珀警示仅 failed 态、收缩态成立；CASE_SCOPE_AUDIT 表与切换矩阵随 #17 更新；全程零假活（禁用位一律 aria-disabled + tooltip）。

纪律：TDD；显式路径分层提交（A/B/C 可分批 commit）；tokens 之外禁止硬编码色值；对既有 e2e 的改动只许因结构迁移，断言语义不得放宽；完工自检含 pnpm -r build。完工报告写明：elevation 提案全量、floor 新值、收缩态截图。
```

## RP-1 验收（Claude Code，实现者 Grok，Build 门从严）

```
你认领 Courtwork 的 RP-1 验收（验收工程师，AGENTS.md 全判例 + 尾随 echo 判例 + 干净环境自跑不采信自述）。这是 Build 门：放行即出首个正式 Build，从严。

范围提交：1800925（第 0 步代提交，核纯追加）/ 014ce0c（SPEC+tokens elevation 先写）/ 9f52b50（A+B+C 主体）/ 8a25b78（e2e 八例+floor 86+截图）/ 03a2f1a（口径补丁+floor 87）。先读：docs/49 全五章（含第四章补遗 elevation 放行三拍板）、docs/25 增补与修正、docs/52 批次三 #16/#17、apps/desktop/SPEC.md elevation 节、完工报告的 A1–A4/B1–B4/C1–C5 对照表（docs/11 上一单随附）。

全局门：干净环境 pnpm -r build 9 包（退出码单查）→ Vitest 全绿 → Playwright 87/87 + floor=87（--list 计数核对，禁降史：78→86→87）→ 四门禁逐条 exit 0 → git 卫生（五枚提交文件清单，工作树净）。

结构验收（按对照表逐 ID 核，重点抽实现不只跑测试）：
1. A2 双证：ux1 #1 e2e 含「收起后再点仍成立」断言未放宽；读 App 的 select 强制 expandedCaseId 逻辑确认 toggle 对消已死。
2. B2 单实例铁证：全库 grep ModelConfigPopover 挂载点必须唯一；context chip 实现只许 setModelConfigOpen(true)，无第二套读写。
3. C2「只迁不清」：状态条用量/摄取/续行/产出/模型五项原位断言；阶段计数唯一权威位在 progress 面板头；statusbar 文案已改非计数描述。
4. 标题栏琥珀仅 failed：e2e 三态驱动（pending/connected 无警示、failed 有）；琥珀使用位符合 docs/49 四章补遗白名单（全库 grep --elevation-warn 消费位仅 titlebar-credential-warn）。
5. 混排列表：图标三态（案件/工作区/未归档）、未归档行尾「存入」接容器化仪式同一 popover、案件行独有 chevron、Pinned 区在上、无分区标题。
6. 导航骨架：产出真路由实跳；定时/派发 aria-disabled + tooltip 零假活；全库无 Customize。
7. #16：「先看」已改直白取消动词，主次按钮层级照 docs/32；#17：非 demo 案件无主办律师行 + CASE_SCOPE_AUDIT 有该行 + 单测断言。

elevation 一致性专项（三处对表）：SPEC 提案值 ↔ tokens.json elevation 组 ↔ styles.css :root 变量逐 token 一致；全库 grep 消费侧无裸 hex/裸 12px 圆角绕过变量；box-shadow 全库仍 none；无新增色相（warn 三轨解析值 = gate.pending 三值）。

真机/预览目视：L0/L1 层级成立（对话坐底色、三浮面 inset 不贴边零投影）；收缩态实测（enter-compact-layout → 画布+composer 浮卡+折叠按钮）与截图 22 对照；标题栏透明融入 chrome；专注模式/Tab/对照未回归。

回归红线：既有 UX-1/SET-1 断言只许因结构迁移改（diff tests/e2e 逐文件看语义是否放宽）；D-1 切换矩阵、SET-1 诊断导出不回归（抽跑）。

报告纯追加 apps/desktop/ACCEPTANCE.md「RP-1 验收」节。结论三问：RP-1 放行与否；base 是否定形；是否可出首个正式 Build（放行即触发，Build 工序另单）。
```
