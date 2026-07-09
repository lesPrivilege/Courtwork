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

交付：promptfoo + DeepEval 底座、评测集目录规范（任务/输入/专业标准答案/评分规则，规则评分 + LLM judge 双轨，judge 提示词入版本管理）、S3 与 S4 最小评测集骨架（先建 5 例真实性占位，扩到 20 例的素材我后续提供）、多 provider 跑分脚本与对比报告格式。

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

后续工单（W2–W8）验收实例在各实现会话回报后按同一结构生成。
