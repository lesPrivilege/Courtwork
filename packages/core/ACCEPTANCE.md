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

## 补验结论（W6.2 整改）

补验日期：2026-07-10

补验基线：`2afec56`

补验范围：只复验本报告判定的两项契约级阻塞、两项记录件与 W6.2 整改自身回归；W6 原报告已通过项未重跑。

### 总结论

**补验通过，两项契约级阻塞已解除。** 本轮未发现新的实现级或契约级缺陷，无验收修复提交。

- **core 放行供 B 阶段（UI）消费。** `RevisionEvent` 独立落盘可直接定位 session，C 级信源门禁不再依赖 citation 展示文本，不会把 W6 报告中的两项缺口固化成 UI 契约。
- **core MVP 宣告成立。** W6 原验收已通过的主链能力结论保持不变，本次补验已将原两项阻塞与整改回归全部关闭。

### 1. 干净环境与全量回归

**通过。** 当前无并行会话，验收者实际删除全仓 8 处 `node_modules`，再执行 `pnpm install`：8 个 workspace project、793 个包安装成功，lockfile 无变更。随后实测：

- `pnpm test -- packages/`：37 个文件，**297/297** 通过。
- `pnpm --filter @courtwork/eval test`：14 个文件，**64/64** 通过。
- `pnpm lint`：通过，零 error。
- `pnpm --filter '!@courtwork/eval' -r run build`：6/6 非 eval 包逐包实际执行 `tsc -p tsconfig.json` 并通过。
- `pnpm --filter @courtwork/core test`：15 个文件，**91/91** 通过。

### 2. 阻塞①：RevisionEvent.sessionId

**通过。** `RevisionEventSchema` 已增加可选的 `sessionId?`，JSDoc 明确 schema 兼容历史数据、core 落盘必填的分层契约。现场重新执行 JSON Schema 导出，已提交导出物无 diff，drift 测试 **8/8** 通过；导出文件含 `sessionId` 的 `string/minLength: 1` 属性且未进入 `required`。

core 内存与文件 `RevisionEventStore.record()` 均在缺少 `sessionId` 时抛 `MissingSessionIdError`，文件存储不落笔；对应测试通过。`buildRevisionEvent` 从待确认记录贯穿 `sessionId`，executor 测试断言 `session-1`。S3 现场产物的 `revision-events.jsonl` 独立读取到 `sessionId: "demo-s3-session"`，无需借助事件流旁证。

### 3. 阻塞②：Citation.evidenceKey 与 C 级门禁

**通过。** `Citation.evidenceKey?` 已进入 zod/TS 契约与 JSON Schema 导出，schema round-trip 与 drift 测试通过。通用门禁 `assertEvidenceKeyAdmissible` 的入参只有台账与 `evidenceKey`，不接受、不解析 citation 展示文本；key 缺失或伪造 key 无法解析时均按 C 级未确认 fail closed。

`grade.test.ts` 保留了 W6 验收报告反例的原值：台账 key `web-search`、C 级未确认、展示文本 `网络参考：web-search`，并断言仍抛 `InadmissibleEvidenceError`。补验现场又临时将该展示文本改为“补验现场改写：这段展示文本不再包含台账键”，单跑 `grade.test.ts` **14/14** 通过，未确认 C 级仍被拦截；测后已恢复提交原文并确认无 diff。另单跑“无 `evidenceKey`”用例 **1/1** 通过，证明手工新增但未附 key 的受管引用按 C 级未确认拒绝。

risk-07 的既有边界未被门禁误改：其编译结果仍不签发 `evidenceKey`，进入 output 后因原文无 locator 而诚实返回唯一的 `locator_not_found`，不是门禁拦截。旧、新 `revision-instruction-set.json` 整文件 `cmp` 完全一致（SHA-256 均为 `7301fbcad5f27d3eb802eb8648da742985f360ec19e9180006e200dd766738ba`），risk-07 片段亦逐字节一致。

### 4. 两项记录件

**通过。** 通用 API 已独立提交改名为 `assertEvidenceKeyAdmissible` / `InadmissibleEvidenceError`。按整改计划口径对 `packages/core/src` 执行领域词汇 grep（排除允许带领域语义的 `composition/`、测试与 `acceptance/`）无输出；旧 API 名全仓 core src grep 亦无输出。

`docs/21-架构决定-演示数据包与样板案.md` 已明文澄清：禁令针对生产链路运行时代码，测试文件与 eval 数据集构建脚本是合法消费方。本次仅核对存在，未触碰 eval 文件。

### 5. demo:s3 回归

**通过。** 验收者亲自重跑 `pnpm --filter @courtwork/core demo:s3`，产物目录为 `/var/folders/g8/ggxmnsrs3t91bg8zz4s4yp300000gn/T/courtwork-core-s3-demo-CONw5b`。

- `redline.docx` 为 **39,713 bytes**，`unzip -t` 无错。
- `comments.xml` 有 6 条可读中文批注，`document.xml` 有 6 个 `commentReference`。
- risk-01 至 risk-06 均 `applied`；risk-07 唯一 `locator_not_found`。
- 8 条事件类型序列与 W6 基线一致：`artifact_produced → todo_snapshot → confirmation_requested → confirmation_resolved → revision_recorded → artifact_produced → todo_snapshot → scenario_completed`。
- 旧、新 docx 的 ZIP 容器流因重新打包元数据不同而哈希不同；解包后全部文件 `diff -rq` 无差异，`word/document.xml`、`word/comments.xml`、`docProps/core.xml` 均与 W6 产物逐字节一致。业务产物无回归。

### 6. 提交与记录卫生

**通过。** 逐个核对 `b3cd453`、`ba91723`、`161804a`、`27c1d25`、`8e3913f` 的文件清单：两个 schemas 契约增量、core 行为整改、通用命名清理、core SPEC 记录各自独立；无 core 会话触碰 `eval/ACCEPTANCE.md` 或其他 eval 文件。当前工作区的 `eval/ACCEPTANCE.md` 修改与未跟踪 `usecase/` 为验收前已有状态，全程保留且未触碰。

`packages/schemas/SPEC.md` 的两个整改提交分别为 `1 insertion / 0 deletion`，`packages/core/SPEC.md` 为 `12 insertions / 0 deletion`，均为文件末尾纯追加。本“补验结论”亦仅追加在原 W6 报告末尾，未改写原结论与证据。

## LUNA-ACCEPT 合并态独立验收（2026-07-13，纯追加）

角色：未参与任何实现的独立验收者。只记录，不修复；本轮无 `fix-by-acceptance`，无产品代码改动。

### 1. 验收基线与证据等级

- 独立 worktree：`/Users/lesprivilege/Projects/Courtwork-acceptance-luna`，detached `HEAD`，基线 `4ab60449692c31a066ebb20ba47d6d49981469cc`；`06de9e5`、`41b3a0b` 均为祖先。
- 端口：独立 `http://127.0.0.1:1421`；共享主树服务未复用。浏览器走查 viewport 为 `1280×720`。
- 依赖：该 worktree 实跑 `pnpm install --frozen-lockfile`，无 lockfile 改写。
- E3 已满足的部分：独立 worktree/端口、全仓 build、双轮 Playwright、真实退出码、浏览器截图与控制台读取。E3 未闭合项在下文明确列出：真 key/真 provider 七通道尚未取得，且包测试计数不符。

### 2. 全门实跑（不采信完工自述）

| 门 | 实测结果 |
|---|---|
| `pnpm -r build` | ✅ exit 0；10/11 workspace project 实际构建，desktop Vite 3452 modules；仅 chunk size warning |
| `pnpm test -- packages/` | ✅ exit 0；83 files，753 tests |
| `pnpm exec vitest run packages eval/src` | ✅ exit 0；97 files，817 tests |
| FABLE-HARNESS 声称的 package 839 | 🔴 clean main 仅 817（全 packages 口径为 753），少 22；主树未跟踪 `packages/pm-schemas` 含 3 个测试文件/约 22 tests，但不在本 detached main tip，不能借用其结果 |
| desktop Vitest | ✅ exit 0；21 files，99 tests |
| Playwright list | ✅ exit 0；190 tests / 32 files |
| Playwright full run #1 | ✅ exit 0；16 gate scripts 全通过，190 passed |
| Playwright full run #2 | ✅ exit 0；16 gate scripts 全通过，190 passed |
| `pnpm lint` | ✅ standalone exit 0；未接管道尾码 |
| Rust `cargo test` | ✅ exit 0；16 passed，0 failed，0 doc-test failed |

结论：`build / desktop 99 / e2e 190×2 / 16 gates / lint / cargo` 亲跑成立；**839 这一必要门在 clean main 不成立**。该差额不能以共享主树的未跟踪 WIP 补齐，列为 `LUNA-CONTRACT-001 🔴`。

### 3. 八项放行标准与反例

| 标准 | 证据与结果 |
|---|---|
| byte-stable 双 golden、DIFF 敏感性 | ✅ 两座 golden/字节稳定/正交段断言通过；临时改 golden 1 字符后单跑 exit 1，golden 对照变红，恢复后无 diff |
| ref 禁上 wire | ✅ `promptSegmentRef`/`-v0` wire 全文断言通过；临时回填 `promptSegmentRef` 后 registry 单跑 exit 1 |
| 材料边界与祈使句保留 | ✅ boundary 与 imperative sentence 通过；临时清空 boundary 后 2 个测试变红 |
| `quote===slice` 逐锚 | ✅ resolver 精确坐标/quote slice 通过；临时 `start + 1` 后 3 个测试变红 |
| 变异矩阵抽验 | ✅ 本轮亲手抽 4 项，4/4 变红；另以越界 import/字面量 sentinel 验证 package-boundary 不是空转 |
| `assert-no-demo-in-real` 反例 | ✅ `run-s3-real.test.ts` 7/7；缺 provider、脚本 provider、事件 `demo-fixture`、demo material、假 anchor 等反例均被拒 |
| 真机证据七通道 | ❓ real-shaped provider 测试得到 sha256、promptSha256、versionTriple、modelEvents、citationStats、gatePaused、demo violations 等字段；但本会话无真 key，未完成真 provider/真卷宗七通道，按 `packages/core/SPEC.md` 的用户手动项留置 |
| core 包域律 | ✅ clean grep 通过，composition/acceptance 白名单例外成立；临时新增 forbidden import/literal 后 package-boundary exit 1 |

### 4. 五提案逐条核对

1. `citationStats`：✅ `artifact_produced` 可选字段、executor 入账、desktop providerNotices 传递及测试均在。
2. core 依赖 legal/reading-view：✅ `package.json` 依赖存在；生产越界仅限已批准的 composition/acceptance 白名单；real S3 走 legal/reading-view，机器守卫通过。
3. “谁的机器读，住谁家”：✅ `RevisionInstructionSet`、`FileOpsPlan`、`IngestStatus` 留中央 schemas；legal 仅消费/re-export，output/tools/reading-view 依中央契约。
4. steps + `promptSegmentRef` + projection：✅ registry/runtime 去 ref、步骤树、prompt 构造与 projection 断言均通过。
5. `statuteRef` 挂账 + MCP 双轨：❓ `[需架构拍板]`。`statuteRef` 已在 schemas/output 使用，但 `packages/legal/SPEC.md:43` 仍保留未勾选的“提案，需架构拍板”；本 tip 代码未见 MCP 双轨落地，不能把“照案”自述当作完成。

### 5. 上半结论

- A 线放行：**❌ 不放行**。直接阻断为 `LUNA-CONTRACT-001 🔴`（clean main 817 ≠ 要求 839）；真 key 七通道与 `statuteRef/MCP` 仍需分别补证/拍板。
- 树面自足可 push：**❌ 不可判定为可 push**。detached 树本身干净且可 build，但不能自足重现 839；共享主树的 `packages/pm-schemas` WIP 不在验收树内，本轮没有推送。
- 本报告仅追加；修复权留给裁决之后。

### 6. 架构裁决追加（2026-07-13）

架构裁决确认 luna “数字不符即拦”程序正确，并建立数字语境判例：839 中的 22 项全属 B 线 WIP；A 线交付在 clean main 的正确口径为 **817/817 全绿**。据此，A 线在数字语境更正后判为**实质放行**，真 key 通道与 `statuteRef/MCP` 留置照案，不构成当前阻断。

正式放行与 Push 门仍须三条件同时闭环：

1. FABLE-HARNESS 记录补入数字语境更正；
2. GPT-SCHEMA 线修复 `LUNA-UI-001` Minimap 未处理 TypeError，补守护测试，并在第 0 步代收编 luna 两份报告；
3. B 线合流后总数字归位。

在三条件齐备前不 push；luna 不代修、不代收账。
