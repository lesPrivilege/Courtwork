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

后续工单（W3/W8-OCR-v1）验收实例在各实现会话回报后按同一结构生成。
