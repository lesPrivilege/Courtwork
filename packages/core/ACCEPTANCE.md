# W6 packages/core 验收报告

验收日期：2026-07-10  
验收角色：Codex 验收工程师  
验收基线：`508387d`；验收修复后 HEAD 另见下文  

## 结论

**不放行。** 当前 `packages/core` 的 S3 CLI 主链、声明式执行顺序、落盘暂停/恢复、修正回放、docx 产出和真实 TypeScript 构建均已跑通，但仍有两项协议/契约级缺口会直接破坏已声明的审计与信源门禁语义：

1. `[需架构拍板]` 独立落盘的 `RevisionEvent` 没有 `sessionId`，不满足验收 prompt 的“RevisionEvent 挂 sessionId”。
2. `[需架构拍板]` C 级门禁用 artifact 的 `basis.citation` 字符串与台账 key 做完全相等匹配；带展示前缀的未确认 C 级 citation 可绕过门禁。当前 schema 没有稳定的 evidence-key 关联字段，不能用字符串包含匹配安全修补。

另有一项架构纪律冲突需澄清：全仓库生产源码并非只有 composition 一处导入 `@courtwork/demo-data`，`eval/src/rules/citation-exists.ts` 也是运行时导入；同时 core 通用层公开命名仍有 `assertCitationAdmissible`/`InadmissibleCitationError` 等领域词汇，与 docs/22 的字面纪律不一致。

因此：

- **core 暂不放行供 B 阶段（UI）消费。** UI 若现在接入，会把缺少 session 关联的修正记录和可绕过的信源门禁固化成客户端契约。
- **CLI 演示可作为内部技术演示继续运行，但不作为已放行 MVP 契约。**
- **core MVP 暂不宣告成立。** 待上述两项契约选择由架构拍板、实现并复验后再放行。

## 环境与独立实测

按要求先执行：

```text
find . -name node_modules -type d -prune -exec rm -rf {} +
pnpm install
pnpm test -- packages/
pnpm lint
pnpm --filter '!@courtwork/eval' -r run build
```

干净基线结果：

- `pnpm install`：成功，8 个 workspace project，新增/链接 793 个包。
- 全量 packages 测试：37 个文件，**285/285** 通过。
- lint：通过，零 error。
- 真实 build：6/6 非 eval 包通过；每包均实际执行 `tsc -p tsconfig.json`，core 在依赖包之后真实编译完成。

验收期间修复 3 项实现级问题后最终回归：37 个文件，**287/287** 通过；lint 通过；6/6 真实 tsc build 通过。`pnpm --filter @courtwork/core test` 也实跑 15 个文件、84/84 通过。

工作区原有未跟踪目录 `usecase/` 全程未触碰。

## 逐项验收

### 1. 干净安装、test、lint、真实 build

**通过（含验收修复）。** 原始 285 口径全绿，真实 tsc build 抓类型的路径已复跑。验收新增两条限额回归测试后最终口径为 287。

另发现 `packages/core/package.json` 原 `test: vitest run` 在 `pnpm --filter @courtwork/core test` 下找不到测试并退出 1；已独立修复，见 `3865954`。

### 2. W2.1 registry strict 化

**通过。** `ScenarioDefinitionObjectSchema`、`TriggerConditionSchema`、`ConfirmationGateSchema` 三处 `.strict()` 均存在；schema 级与 YAML 加载级测试覆盖三层未知键；四个内置 YAML 全部加载通过。

除既有测试外，验收现场构造 `/tmp/S-drift.yaml`，向 `trigger` 注入 `fileTyps`，实际报错：

```text
场景声明校验失败 [/tmp/S-drift.yaml]：
  - trigger: Unrecognized key: "fileTyps"
```

文件名与未知键名均在错误中。

### 3. 依赖纯净与 provider 配置

**通过。** `packages/core/package.json` 无 pi-mono、LangGraph、AgentKit 或其他 agent 框架依赖。全仓 lockfile 中的 agent SDK 条目来自 eval importer，不属于 core importer。Provider 接口的 `id`/`modelId` 由构造参数注入；core 通用执行代码无真实 provider/模型 id 硬编码，只有测试与 demo composition 的 fake scripted 配置。

### 4. 执行器语义与跨进程恢复真实性

**通过（含验收修复）。** 有测试证明：

- `outputArtifacts` 声明顺序即执行顺序；
- S1 形状使用 `CaseFile → Timeline → PartyGraph`、两道 artifact 门禁，非照抄 S3 单产出；
- label-only 门禁在产出序列尾触发；
- 暂停状态、事件流均落盘后恢复。

原“跨进程”测试和 S3 演示通过 `{ ...firstDeps }` 复用了 tools/provider/toolExecutor/revisionStore，只重建了部分依赖，不满足验收清单“全新依赖实例”的原文。已改为所有依赖重新构造，只共享磁盘路径与可序列化配置，并逐一断言不是同一对象，见 `4df0ee9`；测试、build、S3 CLI 均复跑通过。

### 5. 三条协议预留

**部分通过，阻塞。** 确认请求/`PendingConfirmation` 可 JSON 序列化；`ConfirmationActor{channelId, actorId, role?}` 通道无关；file event/confirmation store 与全新依赖恢复证明无同进程要求；`Session{id, chainId, predecessorSessionId?}` 与链式构造测试存在；所有 SessionEvent 和确认待办记录均带 `sessionId`。

`[需架构拍板]` 但 `RevisionEventSchema` 没有 `sessionId`，`buildRevisionEvent` 也未附加，独立 `revision-events.jsonl` 实测记录只有 id/timestamp/actor/case/artifact 字段。虽然事件流的 `revision_recorded` 包装事件可用 `revisionEventId` 间接关联 session，这不等于 RevisionEvent 本身“挂 sessionId”。需决定：修改 schemas 契约，还是由 core 引入 `{sessionId, event}` 的持久化 envelope；验收者无权代选。

事件类型均自带 sessionId，`Session` 另有 chainId/前驱引用，没有把整个产品生命周期建模成单一 session；此部分通过。

### 6. 信源台账与门禁

**部分通过，阻塞。** 等级绑定只在 `demo-assembly.ts` 的装配点声明；core 通用执行器无具体工具等级表。`artifact_produced.evidenceGrades` 有实现和测试，S3 事件实测携带 `party-verify/B/demo-fixture` 投影。

`[需架构拍板]` 现有“C 级未确认拒绝”测试只覆盖 `basis.citation === ledger key`。验收现场反例：

```text
ledger key: web-search (grade C, confirmed false)
basis.citation: 网络参考：web-search
结果: BYPASS，RevisionInstructionSet 编译成功
```

原因是 `assertCitationAdmissible(ledger, basis.citation)` 只做 Map 的完全相等查询，查不到即按“非工具来源”放行。citation 是展示文本而不是稳定外键；字符串模糊/包含匹配会产生误关联，不能作为安全修复。需由 schemas/core 契约明确 citation 与 evidence ledger 的稳定关联方式，再补“任意展示文本都不能绕过”的测试。

### 7. docs/12 五点

**通过（按 SPEC 已披露的 maxUsd 边界）。** `deriveTodoSnapshot` 仅接收场景声明、已产出状态与暂停位置，源码无 provider/模型调用；`todo_snapshot`、`step_failed` 已进入事件协议和 replay；Manus todo 被放在 generation JSON payload 的最后一个键；core 不含摄取子agent并行。

`RuntimeLimits` 的 `maxSteps`/`maxSeconds`/`maxToolCalls` 均从 `ScenarioExecutorDeps.limits` 注入并实际 enforcement；`maxUsd` 按 SPEC 明示仅为配置占位，真实 provider 成本信号未接入。

探索性反例发现 `maxSeconds` 原先只在异步调用前检查：provider 内把假时钟从 0 推到 6 秒、上限 5 秒时仍返回 paused。已在工具/provider await 返回后复核 wall-clock，并补 guard 与 executor 两层测试，见 `d1d5b82`。

### 8. 修正回放缺口

**通过。** `resumeScenario` 应用修正并写 RevisionEvent 后，按被修正 artifactType 重发 `artifact_produced`；既有单测验证最后一条产出是修正后状态，S3 集成测试及现场 events.jsonl 均显示原始产出与修正后产出各一条，replay 取后者。

### 9. 装配点纪律与通用层语义

**不通过，需架构澄清。** 对 core 本包而言，生产源码中 `@courtwork/demo-data` 仅 `packages/core/src/composition/demo-assembly.ts` 一处。但按验收清单要求 grep“全仓库运行时源码”，另有：

```text
eval/src/rules/citation-exists.ts: import ... from '@courtwork/demo-data'
```

该导入已被 W7 的 SPEC/ACCEPTANCE 当作有意依赖，和 W6/CLAUDE.md 的“全仓唯一 composition”字面结论冲突。`[需架构拍板]` 应明确 eval 是否是例外；验收者不越界修改 W7。

此外，core 通用层仍有 `assertCitationAdmissible`、`InadmissibleCitationError` 公开命名，以及“修订指令集/citation/docx 批注/卷宗原文”等注释或错误文案。它们与 docs/22“通用层命名与依赖不得渗入法律语义、发现领域词汇即上报”的字面纪律不一致。重命名公开 API 会影响消费契约，故只上报，不擅改。

### 10. S3 演示与 docx 解包

**通过。** 验收者亲自运行 `pnpm --filter @courtwork/core demo:s3`；修复前后均跑通。最终一次产物目录为 `/var/folders/g8/ggxmnsrs3t91bg8zz4s4yp300000gn/T/courtwork-core-s3-demo-OLCsQf`。

- `redline.docx`：39,713 bytes，zip 完整性检查无错误。
- `word/comments.xml`：6 条 `w:comment`，均为可读中文真实批注；`word/document.xml` 有 6 条 `w:commentReference`。
- 指令结果：risk-01 至 risk-06 均 `applied`；risk-07 唯一 `locator_not_found`，如实跳过。
- 事件流：`artifact_produced → todo_snapshot → confirmation_requested → confirmation_resolved → revision_recorded → artifact_produced → todo_snapshot → scenario_completed`，共 8 条；修正后 RiskList 与最终 todo 快照均可回放。

### 11. W6 系列提交卫生

**通过。** 逐个核对 `6cc21bc`、`3814cc9`、`21c4492` 以及 `b025234` 至 `0adf9fe` 的 W6 实现系列 commit 文件清单。提交范围均落在授权文档、registry W2.1、core、lockfile及 schemas SPEC 观察记录内；未发现并行 eval、设计稿或其他会话文件被扫入。

`0c213ab` 除 JSON Pointer 文件外还清理了同属 core 的 scripted-provider 未用参数，commit message 已如实说明；不是他人文件。并行架构/设计提交保持各自独立。

### 12. 工程决策与凭证

**通过。** 根依赖保持 TypeScript `^6.0.3`；core 自己声明 `@types/node ^26.1.1`，tsconfig 显式 `types: ["node"]`；未升级既定工具链。扫描当前受控文件未发现 `.env`、私钥、API key/token 等凭证入库迹象。运行环境 Node 25.9.0，满足 Node 22+ 基线。

## 验收期间实现级修复

均按规则独立提交，未改 schemas/跨层契约：

- `d1d5b82 fix-by-acceptance: enforce maxSeconds after async work`
- `3865954 fix-by-acceptance: make core filtered test run`
- `4df0ee9 fix-by-acceptance: rebuild every resume dependency`

## 复验入口

架构拍板并整改后，至少应新增并实测：

1. 独立读取 revision store，断言每条记录可直接定位 session，而非依赖另一份日志猜关联。
2. C 级 evidence 的稳定关联测试：citation 展示文本任意变化仍不能绕过未确认门禁。
3. 明确 eval 对 demo-data 的例外范围，并把“唯一装配点”断言改成与最终纪律一致的自动化 grep/架构测试。
4. core 通用 API 的领域词汇处置结论（保留为通用“证据可采性”概念，或重命名为更中性的 admission/policy API）。

