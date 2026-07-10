# SPEC: packages/core（W6）

状态：已完成

## 职责

Headless agent core。协议化对外（会话/事件流），UI 是纯客户端；provider 无关；场景执行器是核心。

## 要点

- agent loop 自研，只借鉴 pi-mono 的设计形状（极简、协议化、provider 无关的 Provider 抽象）；不引入其代码依赖；不把场景/schema 逻辑写进这层壳。
- 场景执行器：从 registry 取场景定义 → 编排（工具调用 / 生成）→ 产出符合 schemas 的 artifact → **停在确认节点**，等待客户端确认事件后继续。数据驱动、零场景特判：`outputArtifacts` 声明顺序即产出顺序。
- 事件流协议：会话事件（进度、artifact 产出、确认请求/解决、修正记录、进度快照、步骤失败、完成、错误）以可序列化事件对外发布——W9 桌面端与测试脚本共用同一协议。
- Provider 封装：模型 id/参数来自配置，禁止写死；接 eval/ 的选型结论；不含工具调用能力（场景是声明式固定编排，工具调用由执行器编排，不是模型自主选择）。
- RevisionEvent 捕获：客户端对 artifact 的每次修正经 core 落盘（追加写 JSONL）。
- 信源等级传播与门禁：证据台账 + 通用门禁函数，等级判定在装配点声明，通用机制不认识任何具体工具/场景。
- 装配点：`src/composition/demo-assembly.ts` 是全仓库唯一 import `@courtwork/demo-data` 的运行时文件。

## 验收

无 UI 跑通 S3 全流程：输入合同 → RiskList artifact（依据含信源等级）→ 用户确认（脚本模拟，含一条真实字段修正）→ 修订指令集 → 调 output 产出 docx。全程事件流可回放。CLI 入口：`pnpm --filter @courtwork/core demo:s3`；自动化断言：`src/acceptance/s3-flow.integration.test.ts`。

## TODO（跨层放入区）

- [W6.1 微工单，2026-07-10 拍板，源自 sol review 裁决 2] **最小审阅遥测事件**：事件协议新增三个事件类型——`review_item_opened` / `review_evidence_expanded` / `review_disposition_submitted`（各带 sessionId/itemRef/时间戳），供确认质量分析（"秒批"识别在分析侧，MVP 只告警不阻断）。不采原始输入流；隐私归 docs/28 使用遥测档。TDD、独立 commit，不改既有事件语义。

- [已解决 2026-07-10] ~~事件流协议设计时假设存在远程瘦客户端与异步确认~~——`ConfirmationActor`（渠道无关身份标识）+ `PendingConfirmation`（打包续行所需的一切并落盘，`ConfirmationStore`）+ `resumeScenario` 接受全新构造的依赖实例（模拟另一进程）。file store 测试证明"指向同一磁盘状态的全新实例能正确接续"不是类型层面的空话。W6 未实现任何真实网关适配器，协议不隐含确认方与 core 同进程/同机/同客户端。
- [已解决 2026-07-10] ~~session 续行与会话链~~——`src/session/types.ts` 的 `Session{id, chainId, predecessorSessionId?}` + `createSession`/`continueSession`。W6 未实现续行本身（结构化再水化按钮是 W9 之后的事），只保证 `sessionId` 贯穿事件与确认记录、artifact 按引用而非内联复制，未来接 `chainId` 不需要改动现有协议形状。
- [已解决 2026-07-10，依据 docs/12 调研] ~~长任务协议五点~~——①`deriveTodoSnapshot` 纯函数（场景声明 + 当前产出/暂停位置 → todo 快照），LLM 不参与撰写增删，`todo_snapshot` 事件在每次暂停前与全部完成时发布；②`step_failed` 事件覆盖工具调用粒度（`@courtwork/tools` 的失败契约本身已是结构化降级，不抛异常，这里只是把"发生过一次工具级降级"显式发布到事件流），生成节点级失败仍保持显式抛出中断，不预先构建未经验证的 Saga 式部分成功恢复语义（docs/12 5.3 节明确把跨步骤补偿/子agent并行归为 W8 ingest-v1 场景层的事）；③`createRuntimeGuard`（`maxSteps`/`maxSeconds`/`maxToolCalls` 真实enforcement，`maxUsd` 目前只是类型层面占位——假 provider 无真实费用、真实 provider 未接入，无成本信号可核对，诚实注明 enforcement 待补，不假装已经在管），缺省不限制，MVP 默认行为不变，具体阈值留给场景实测调整；④确认门禁检查点已具体化为 `PendingConfirmation.remainingArtifactTypes`（场景步骤位置）+ `producedArtifacts`（已确认 artifact 内容，按值携带）；⑤摄取子agent并行未进 core（本层没有任何相关代码，留给 W8）。另借 Manus"待办复述进上下文末尾"技巧：`generateArtifact` 的请求 payload 把 `todo` 作为最后一个插入键，JSON 序列化后真的落在请求内容末尾。deepagents 整体架构未引入。

## 验收记录

- 2026-07-10：W6 完成。开工前先完成 W2.1 微工单（`packages/registry` YAML 声明加载 strict 化，独立提交 `21c4492`）与两处跨层文档修正（CLAUDE.md 技术基线更正 `6cc21bc`；registry SPEC 场景执行语义补注 `3814cc9`），随后交付本层。

  **架构判断点（开工前与用户逐条确认，均获批准）**：
  1. **pi-mono 借形不借库**：license 未核实、且依据 docs/24（场景是声明式固定编排，工具调用由执行器编排而非模型自主选择）通用 agent loop 的核心能力（模型自主选工具）本就用不上——引入依赖是负资产。agent loop 自研，只借鉴 Provider 抽象的设计形状与"极简协议化"哲学。CLAUDE.md 技术基线已同步更正为如实表述。
  2. **`outputArtifacts` 声明顺序即执行顺序**：数据驱动、`core` 零场景语义，`toolIds` 全部前置一次性执行，label-only 门禁落产出序列尾。已同步补注为 `packages/registry/SPEC.md` 的显式契约语义（跨层文档补注，架构显式授权），避免未来场景作者把它当无序集合处理。
  3. **信源等级台账走事件流，不改 schemas**：等级判定（`sourceId→grade`）在装配点声明，通用门禁函数不认识任何具体工具/场景，台账不塞进 schemas 定义的 artifact 本体——`artifact_produced` 事件携带台账投影（`evidenceGrades`），W9 渲染信源角标不需要改 schemas。已在 `packages/schemas/SPEC.md` TODO 区留一条观察记录（若未来需要跨 session 持久化角标，可能需要给 `RiskBasis`/`Citation` 加字段，非本层实现，供架构拍板参考）。

  **六项交付**（D1–D6，均含 TDD 测试）：
  - **D1**（`src/provider/`）：`Provider` 接口（`id`/`modelId`/`generate`，不含工具调用能力）+ `ScriptedProvider`（录制回放假 provider，测试与 CLI 演示专用，不依赖真实 API）。
  - **D2**（`src/scenario-executor/`）：`runScenario`/`resumeScenario`。用 S3（1 产出/1 门禁）与 S1 真实连线形状（3 产出/2 门禁）两种场景验证泛化性；`resumeScenario` 用全新构造的依赖实例（模拟另一进程）验证过能正确接续。
  - **D3**（`src/events/`、`src/session/`）：`SessionEvent` 判别联合（七种基础事件 + docs/12 追加的 `todo_snapshot`/`step_failed`）+ 落盘事件日志（`createFileEventLog`）+ 纯函数 `replaySession`；`Session` 会话链类型；`ConfirmationStore` 落盘续行状态。
  - **D4**（`src/evidence/`）：`EvidenceLedger` + `assertCitationAdmissible` 通用门禁——C 级且未确认拒绝，A/B 级或已确认放行，非工具来源（台账无记录）放行。
  - **D5**（`src/revision/`）：`RevisionEventStore` 追加写 JSONL；`resumeScenario` 应用 `revisions[]` 时构造合规 `RevisionEvent`、落盘、用 `applyJsonPointer` 真实应用回 artifact，并重新发一次 `artifact_produced`（否则 replay 只能重建出修正前状态）。
  - **D6**（`src/composition/demo-assembly.ts`）：全仓库唯一 import `@courtwork/demo-data` 的运行时文件；`projectPartyRecord` 是 `packages/tools` 测试里"提前演示装配点长什么样"投影函数的生产标准正式落地。

  **docs/12 长任务协议追加**（架构会话在本层开工后新增的拍板，commit `e919539`，本次一并纳入而非留作遗留）：`todo_snapshot`/`step_failed` 事件类型、`createRuntimeGuard` 运行时保护、Manus"待办复述进上下文末尾"技巧。详见上方 TODO 区已解决记录。

  **验收流程**（`src/acceptance/run-s3-demo.ts`，CLI 脚本与集成测试共用同一实现）：加载 registry 真实 `S3.yaml` → `runScenario`（`party-verify` 走 demo-fixture 适配器，B 级信源记入证据台账）→ 落盘暂停于 `RiskList` 确认门禁 → 全新依赖实例模拟另一进程 `resumeScenario`（confirm + 一条真实 `RevisionEvent` 字段修正）→ 编译确认后的 `RiskList` 为 `RevisionInstructionSet`（demo glue，过 D4 门禁，不进 core 通用库——依据 docs/40 S5 设计先例：产出是 `RevisionInstructionSet` 不代表编译逻辑归通用层）→ 调 `output.applyRevisionInstructionSet`（复用 `packages/output` 自带 sample docx）产出带修订与批注的 docx → 全新 `EventLog` 实例重读磁盘完整历史并 `replaySession`。7 条指令 6 条（clause 级，引文取自 output 黄金样例合同真实文本）定位成功，1 条（`risk-07`，party-verify 来源，依据锚点在 demo-data 卷宗文件、不在 output 的 stand-in docx 里）报 `locator_not_found` 后被跳过——测试显式断言这一结果，是"报错并跳过、不错插"纪律的真实展示，不是缺陷。人工核验：`unzip` 产出的 `redline.docx`，`comments.xml` 含 6 条真实中文批注文本（非乱码/空壳）。

  **设计取舍**：
  - `S3_RISK_LIST_RESPONSE`（`src/composition/s3-risk-list-response.ts`）有意分两层，不假装无缝：案件/主体层沿用 demo-data 真实语料（临江精铸诉起云智能），文档文本层改用 output 黄金样例合同的真实文本（而非 demo-data 主合同文本）——因为 demo-data 主合同目前只有 markdown 形态，还没有对应的 docx（"markdown → 新建 docx"是 output 包 W4.1 挂账工单，未排期），硬套两份不同合同的引文只会让指令定位全部失败，不是更真实，是自欺。
  - 场景执行器的通用算法（`produceSequence`）一次性写对多产出顺序遍历与 label-only 门禁逻辑，用后续新场景形状（S1）补测试覆盖此前未触达的分支，而非拆两次 TDD 增量各写一半——循环体是不可拆分的单元，拆开写反而会先写出残缺分支再回来补。
  - `resumeScenario` 应用 `revisions[]` 后必须重新发一次 `artifact_produced`：这是集成测试跑通 S3 全流程时发现的真实设计缺口（不是测试造假）——原设计只在内存里改了 `pending.producedArtifacts`，从未写回事件流，导致"事件流可回放"对修正后的状态是假话。修复后 7 处既有测试的事件序列断言相应更新。
  - `ScenarioExecutorDeps.limits`（运行时保护）按次 `runScenario`/`resumeScenario` 调用单独计额，不跨暂停边界累计——真正的 runaway 循环更可能发生在一段执行 leg 内部，跨 session 累计预算是产品/计费层面的问题，超出"运行时保护"的工程含义，刻意不做。
  - `ToolDefinition<any, any>`（`src/tools/tool-registry.ts`）：异构工具注册表在类型层面没有比"受控 any + eslint-disable-next-line"更干净的表达，已实测 lint 通过。
  - `SessionEventInput = Omit<SessionEvent, ...>`：普通 `Omit` 在判别联合上不分发（`keyof (A|B)` 只保留公共键），会把类型塌缩成只剩 `BaseEvent` 字段——改用 `T extends unknown ? Omit<T,K> : never` 触发分发式条件类型逐个联合成员处理。这类问题只有 `tsc` 真实 build 能捕获，vitest 的 esbuild 转译层做类型擦除、不做类型检查，type-only import 甚至不需要目标真的存在对应导出——干净环境复核阶段（`pnpm --filter '!@courtwork/eval' -r run build`）额外发现并修复了两处同类问题（`executor.ts` 里 `ConfirmationActor` 与 `events/types.ts` 重复定义导致 `index.ts` 的 `export *` 冲突；`ScenarioDefinition` 误从 `@courtwork/schemas` 导入，实际应来自 `@courtwork/registry`）。这是"不能只信 `pnpm test`，必须实测 `build`"这条纪律在本层的具体案例，记录以免遗忘。
  - `packages/core/package.json` 从骨架阶段就带 `test`/`lint` 脚本——W5 验收记录过"包缺脚本导致 `--filter` 静默 no-op 假绿"的先例，本层不重犯。
  - 工具链：沿用 W1/W5 记录过的坑（`typescript` 锁 `^6.0.3`；`@types/node` 声明在本包自己的 `package.json` + `tsconfig.json` 显式 `"types": ["node"]`）；`scripts/demo-s3-flow.ts` 故意不在 `tsconfig.json` 的 `include` 范围内，沿用 `packages/schemas/scripts/generate-json-schema.ts` 的既有模式（独立可执行脚本走 workspace 级 `tsx` 二进制，不进 `dist/`，不声明为本包依赖）。

  **实测记录**：`find . -name node_modules -type d -prune -exec rm -rf {} +` → `pnpm install` → `pnpm test -- packages/`（285 例全绿，覆盖 schemas/registry/tools/demo-data/output/core 六包，不含 eval）→ `pnpm lint`（无 error）→ `pnpm --filter '!@courtwork/eval' -r run build`（6/6 非 eval 包通过，含新增的 core）。全部在移除全部 workspace 包 `node_modules` 后的干净环境重新 `pnpm install` 复核过，非增量安装的残留假绿。`pnpm --filter @courtwork/core demo:s3` 单独重跑验证 CLI 入口。

  **工作区纪律遵守**：全程未触碰 `eval/` 目录任何文件；仓库命令统一用路径过滤（`vitest run "packages/"`）或包过滤（`--filter '!@courtwork/eval'`）排除 eval；`git add` 全程显式路径，未使用 `git add -A`/`.`；开工期间架构会话并行落地的多个跨层文档提交（防呆交互调研 `872d8c5`、长任务架构调研 `e919539`、安全合规调研等）均只读取相关部分、未触碰其文件本身。

  **通用层纪律自查**（docs/22）：`src/` 下不含任何法律领域词汇——领域味仅出现在 `src/composition/`（装配点 + demo glue，docs/21/docs/40 明确允许的例外角落）与验收脚本的 fixture 数据里。

- 2026-07-10：W6.2 整改（承接 `ACCEPTANCE.md` 的"不放行"结论，两项契约级阻塞 + 两项记录件）。

  **阻塞①（RevisionEvent 无法直接定位 session）**：`@courtwork/schemas` 的 `RevisionEventSchema` 增加可选字段 `sessionId?`（纯增量，见 `packages/schemas/SPEC.md` 验收记录）。`RevisionEventStore.record()`（`src/revision/revision-store.ts`，内存与落盘两个实现）在 schema 校验之上强制要求 `sessionId` 存在，缺失即抛 `MissingSessionIdError`，写入被拒绝、文件不落笔。`executor.ts` 的 `buildRevisionEvent` 从 `PendingConfirmation.sessionId` 取值填入。复验：`s3-flow.integration.test.ts` 新增独立读 revision store（不经事件流旁证）的断言，证明每条落盘记录自带可直接定位的 `sessionId`。

  **阻塞②（citation 展示文本可绕过 C 级门禁）**：`@courtwork/schemas` 的 `RevisionInstructionSet.Citation` 增加可选不透明字段 `evidenceKey?`（纯增量）。`EvidenceLedger`（`src/evidence/grade.ts`）新增 `issueKey(candidateKey)`——candidateKey 命中台账记录原样返回，未命中返回 `undefined`。门禁函数（改名为 `assertEvidenceKeyAdmissible`，见下）签名改为 `(ledger, evidenceKey: string | undefined)`：只认 key，不接受也不解析任何展示文本；`evidenceKey` 缺失或无法在台账解析到记录，一律按 C 级未确认处理（fail closed）。`compileConfirmedRiskListToRevisionInstructions`（`src/composition/compile-risk-list-to-revisions.ts`）在编译期用 `issueKey()` 对每条 `RiskBasis.citation` 做一次精确匹配签发；命中则交给门禁按等级判断，未命中视为非工具来源（如直接的法条原文，或本案 risk-07/party-verify 那样展示文本经润色不再与台账 key 字面相等的情形）继续免检——这条边界维持现状，不是本次修复的目标，本次堵住的是"key 一旦正确签发后，citation 展示文本再怎么编辑都不能让门禁改判"这一类。复验：`grade.test.ts` 新增测试直接复现 W6 验收报告的原始反例（ledger key `web-search`，C 级未确认；citation 展示文本改写为"网络参考：web-search"），证明门禁结论不受展示文本影响，仍正确拦截；`grade.test.ts` 另有测试覆盖 `evidenceKey` 缺失/无法解析两种 fail-closed 分支；`compile-risk-list-to-revisions.test.ts` 新增测试锁定"未命中不回归"边界（risk-07 一类场景继续编译成功）。

  **记录件①（命名清理）**：`assertCitationAdmissible` → `assertEvidenceKeyAdmissible`，`InadmissibleCitationError` → `InadmissibleEvidenceError`（纯改名，无外部消费方，`packages/core/src/index.ts` 是 barrel export 但仓库内无 core 之外的导入方）。grade.ts 原先提到"修订指令集/docx 批注/卷宗原文"的两处注释随门禁重构一并改写为通用措辞（不再需要那些具体措辞），"非工具来源示例（如直接引用法条原文）"的说明移到了允许带领域色彩的 composition 层（`compile-risk-list-to-revisions.ts`）。

  **记录件②（eval 对 demo-data 的例外范围）**：已由 `docs/21-架构决定-演示数据包与样板案.md` 的 2026-07-10 澄清段落解决（生产链路运行时代码禁止直接 import `@courtwork/demo-data`，测试文件与 eval 数据集构建脚本是合法消费方，不受此限）——不在本工单范围内，未触碰。

  **回归**：本次未执行 `rm -rf node_modules && pnpm install`——改动零涉及任何 `package.json`/依赖，且工作目录当时有并行会话（eval/ 侧 W7.1 补验）在跑，删全仓 node_modules 有跨会话风险，遂在现有环境直接验证（依赖零变更时，clean-install 仪式验证的"增量安装残留假绿"风险不适用；干净环境安装复核建议留给下一次真正改了依赖的层）。`pnpm test -- packages/`：37 个文件，**297/297** 通过（W6 基线 287 + 本次新增 10 例：schemas 3 例、core grade.test.ts 5 例、revision-store.test.ts 2 例）。`pnpm lint`：零 error。`pnpm --filter '!@courtwork/eval' -r run build`：6/6 非 eval 包真实 `tsc` 通过。`pnpm --filter @courtwork/core demo:s3` 重跑：`redline.docx` 39,713 bytes——与 W6 验收记录字节数完全一致；`unzip -t` 零错误；`word/comments.xml` 6 条 `w:comment`、`word/document.xml` 6 条 `w:commentReference`，与 W6 记录一致；指令结果 risk-01~06 `applied`、risk-07 `locator_not_found`，与 W6 记录一致；事件类型序列（`artifact_produced → todo_snapshot → confirmation_requested → confirmation_resolved → revision_recorded → artifact_produced → todo_snapshot → scenario_completed`，共 8 条）与 W6 记录一致。`pnpm --filter @courtwork/core test` 单独复跑：15 个文件，**91/91** 通过（W6 基线 84 + 本次新增 7 例）。全程无回归。
