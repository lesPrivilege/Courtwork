# W6 packages/core 验收报告

验收日期：2026-07-10  
验收角色：Codex 验收工程师  
验收基线：`508387d`；验收修复后 HEAD 另见下文  

## 结论

**不放行。** 当前 `packages/core` 的 S3 CLI 主链、声明式执行顺序、落盘暂停/恢复、修正回放、docx 产出和真实 TypeScript 构建均已跑通，但仍有两项协议/契约级缺口会直接破坏已声明的审计与信源门禁语义：

1. `[需架构拍板]` 独立落盘的 `RevisionEvent` 没有 `sessionId`，不满足验收 prompt 的“RevisionEvent 挂 sessionId”。
2. `[需架构拍板]` C 级门禁用 artifact 的 `basis.citation` 字符串与台账 key 做完全相等匹配；带展示前缀的未确认 C 级 citation 可绕过门禁。当前 schema 没有稳定的 evidence-key 关联字段，不能用字符串包含匹配安全修补。

另有一项架构纪律冲突需澄清：全仓库生产源码并非只有 composition 一处导入 `@courtwork/demo-data`，`eval/src/rules/citation-exists.ts` 也是运行时导入；同时 core 通用层公开命名仍有 `assertCitationAdmissible`/`InadmissibleCitationError` 等领域词汇，与 docs/decisions/ADR-001-package-abi.md 的字面纪律不一致。

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

### 7. docs/architecture/system.md 五点

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

此外，core 通用层仍有 `assertCitationAdmissible`、`InadmissibleCitationError` 公开命名，以及“修订指令集/citation/docx 批注/卷宗原文”等注释或错误文案。它们与 docs/decisions/ADR-001-package-abi.md“通用层命名与依赖不得渗入法律语义、发现领域词汇即上报”的字面纪律不一致。重命名公开 API 会影响消费契约，故只上报，不擅改。

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

`docs/decisions/ADR-001-package-abi.md` 已明文澄清：禁令针对生产链路运行时代码，测试文件与 eval 数据集构建脚本是合法消费方。本次仅核对存在，未触碰 eval 文件。

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
| FABLE-HARNESS 声称的 package 839 | 🔴 clean main 仅 817（全 packages 口径为 753），少 22；主树当时未跟踪迁移前旧路径 `packages/pm-schemas`（现为 `packages/pm`）含 3 个测试文件/约 22 tests，但不在本 detached main tip，不能借用其结果 |
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
- 树面自足可 push：**❌ 不可判定为可 push**。detached 树本身干净且可 build，但不能自足重现 839；共享主树当时位于迁移前旧路径 `packages/pm-schemas`（现为 `packages/pm`）的 WIP 不在验收树内，本轮没有推送。
- 本报告仅追加；修复权留给裁决之后。

### 6. 架构裁决追加（2026-07-13）

架构裁决确认 luna “数字不符即拦”程序正确，并建立数字语境判例：839 中的 22 项全属 B 线 WIP；A 线交付在 clean main 的正确口径为 **817/817 全绿**。据此，A 线在数字语境更正后判为**实质放行**，真 key 通道与 `statuteRef/MCP` 留置照案，不构成当前阻断。

正式放行与 Push 门仍须三条件同时闭环：

1. FABLE-HARNESS 记录补入数字语境更正；
2. GPT-SCHEMA 线修复 `LUNA-UI-001` Minimap 未处理 TypeError，补守护测试，并在第 0 步代收编 luna 两份报告；
3. B 线合流后总数字归位。

在三条件齐备前不 push；luna 不代修、不代收账。

## TURN-1 独立验收（2026-07-13，纯追加）

验收角色：未参与 TURN-1 实现的独立验收者；本会话此前实现的是 INTERACTION-1A，与 TURN-1 无实现继承关系。

### 1. 基线、范围与结论

- 独立 worktree：`/Users/lesprivilege/Projects/Courtwork-accept-turn-1`；分支：`codex/accept-turn-1`。
- 实现基线：`ea487ef1c85ad18d3131d4c50f3390d594a7463b`（`feat(core): add provider-neutral turn lifecycle`）。指定的 `main@c22fe1ee41a3c85db93dd43126f185c12c206601` 已是该实现基线祖先，`git merge --no-edit` 实测为 `Already up to date`，故没有伪造空 merge commit。
- 验收范围严格限制在 `packages/core/src/turn/` 与本报告；未改 Interaction、desktop、schemas、provider 契约或 tool calling。

**结论：TURN-1 放行。** 原实现的 provider-neutral TurnEvent、runner 与 append-only JSONL 主体方向成立；独立反例发现 4 项实现级闭集缺口，已用 `fix-by-acceptance` 修复并完成定向、core 与全仓复验。未发现需要架构拍板的 schema、跨层接口、ADR 或 SPEC 验收标准问题。

### 2. 不采信实现自述：反例先红

实现基线的既有 TURN 定向测试为 2 files、14/14 通过。验收者随后注入未覆盖反例，并在未修实现上实际观察到 4 项失败（当时反例集 21 项中 17 通过、4 失败）：

1. 纯空白 `reasoning_delta` 被持久化为 `reasoning: present`，并错误发布空白 reasoning 生命周期；
2. 未知运行时 stream event 被静默忽略，后续 turn 仍可成功；
3. 协议闭集外的 completion `finishReason` 被接受；
4. 协议闭集外的 failure `kind` 被原样持久化。

这 4 项均会让运行时输入绕过 TypeScript 的静态联合类型；红灯证明测试不是只重述类型。修复提交：`9cad130c2b8a52969612be444198bd70d35a1948`（`fix-by-acceptance(turn): close runtime protocol drift`）。

### 3. 协议矩阵实测

| 验收项 | 结果与证据 |
|---|---|
| `requestId` / `seq` / started identity | ✅ started 必须为 provider `seq=0`；request 漂移、重复/越序 seq、重复 started、providerId/modelId 任一漂移均收敛为唯一 `invalid_response`。core 公开事件保持同一 turn/request，core seq 从 0 连续。 |
| reasoning present / absent | ✅ 无 reasoning 与纯空白 reasoning 均为显式 `absent`，不发布伪造事件；一旦后续出现实质内容，之前的前导空白按模型原文保留，并只发布一次 reasoning start。 |
| 空正文 | ✅ empty 与 whitespace-only assistant content 均不得成功，不发布 assistant completed，唯一终态为 `turn_failed/invalid_response`。 |
| usage 与终态闭合 | ✅ 非负整数 usage 可进入终局快照；负数、重复 usage 被拒。completed 只在 provider 真 EOF 后转为 core success；EOF 缺终态、终态后事件、未知事件/finish reason/failure kind 均失败且无双终态。 |
| failure 与 cancellation | ✅ provider canceled、调用前已 abort、在途 provider 忽略 AbortSignal、流外 throw 均不挂起且只落一个失败终态；流外异常文案被替换，不回显异常对象。 |
| append-only JSONL replay | ✅ 新实例可重建最终正文、reasoning、usage、finish/failure；瞬态 delta 不落盘；重复 turnId 拒绝覆盖。新增 runTurn→真实 JSONL 集成反例验证只落 provider-neutral 终局快照。 |
| 敏感与 transport 边界 | ✅ request prompt、运行时额外 `rawBody` / `authorization` 字段、流外异常中的 bearer secret 均未进入公开事件、终局记录或 JSONL。协议内 `ProviderFailure.message` 仍按 ADR-007 作为公开、已由 provider 净化的字段保留；core 未读取或落盘私有 transport 帧。 |

修复后的 TURN 定向实跑为 **2 files、26/26** 通过。

### 4. 门禁与范围证据

- `pnpm install --frozen-lockfile`：成功，lockfile 无改写。
- `pnpm -r build`：exit 0；12/13 workspace projects，core TypeScript 与 desktop Vite 均通过；只有既有 chunk-size warning。
- `pnpm --filter @courtwork/core test`：首次在尚未生成依赖包 `dist` 的新 worktree 中运行，14 suites 因无法解析 `@courtwork/legal/tools/schemas` 未收集到测试，已通过的 78 项无行为失败。完成 `pnpm -r build` 后原命令复跑：**24 files、168/168**，exit 0。该环境性首跑不冒充通过，亦不列为产品缺陷。
- `pnpm lint`：exit 0，零 error。
- `pnpm test`：**110 files、894/894**，exit 0。
- `git diff --check`：通过。
- 生产 `packages/core/src/turn` 扫描 `Authorization/Bearer/apiKey/rawBody/header/URL` 无命中；Interaction、SourceAnchor、schema、tool-calling 关键词无命中。

### 5. 放行边界

本轮只放行 TURN-1 的模型回合生命周期与终局快照，不扩张为 Interaction、任意 tool calling、desktop 渲染或垂类 schema 放行。公开失败消息的净化责任仍依 ADR-007 位于 provider 边界；TURN 层拒绝并擦除闭集外事件和流外异常，但不擅自改写协议内用户可读失败文案。

### 6. 基线校正（前进式追加）

前述第 1 节关于 `main@c22fe1e`“已是实现基线祖先 / Already up to date”的记录不正确：早期短 SHA 祖先检查被同一 shell 命令后段的 `|| true` 掩蔽。按共享历史不得重写的纪律，本报告不改写旧句，改以本节显式纠正。

验收分支随后实际执行 `git merge --no-edit c22fe1ee41a3c85db93dd43126f185c12c206601`，产生合并提交 `60c7e1ebc03d90bbe03e161c9322e8fb2af479c1`，双亲为 `faab12735699a5681aa0ddf07d54733cdbb30d47` 与 `c22fe1ee41a3c85db93dd43126f185c12c206601`；无冲突，合入内容仅为指定 main 基线的 design/status 文档。完整 SHA 祖先检查现已确认 TURN 实现基线与 `main@c22fe1e` 都是合并态 tip 的祖先。

在该真实合并态上重新实跑：TURN 定向 **26/26**、`pnpm -r build` exit 0、core **168/168**、lint exit 0、全仓 **894/894**，结果均与修正前一致。因此第 1 节的放行结论保持有效；唯一被本节取代的是“无需 merge”的错误过程记录。

## INTERACTION-1B 独立验收（2026-07-14，纯追加）

验收角色：未参与 INTERACTION-1B 实现的独立验收者；本会话此前实现的是 INTERACTION-1A，与本工单没有实现继承关系。

### 1. 基线、合并态与结论

- 独立 worktree：`/Users/lesprivilege/Projects/Courtwork-accept-interaction-1b`；分支：`codex/accept-interaction-1b`。
- 实现基线：`6fd89a3f70df416e4d442835799fd89a8b2976b3`（`feat(core): add replayable interaction journal`）。
- 指定 `main@075d6161ee93651be90fbfd17ca35d41ad86895f` 已真实合入，合并提交为 `879b41907e1cb6f3c7a7ce1a8fcd51b06670db4c`，双亲正是实现基线与指定 main；完整 SHA 祖先检查均返回 0。
- 验收范围限制在 `packages/core/src/turn/` 与本报告；未修改 schemas、provider、desktop、registry、SessionEvent、ConfirmationStore 或 ADR。

**结论：INTERACTION-1B 放行。** 实现提供的独立 Interaction journal、可重放状态、原子解决与恢复门禁方向成立；独立反例发现运行时身份和持久可信边界的实现级缺口，已用 `fix-by-acceptance` 修复。修复提交：`6163ee26d069723cd49cc4da1a3335c50b640ed2`（`fix-by-acceptance(interaction): fail closed on journal corruption`）。未发现需要修改 schema、跨层接口、ADR 或 SPEC 验收标准的契约级问题。

### 2. 不采信实现自述：实际注入反例

实现基线的 6 个定向文件原有 **77/77** 通过。验收者随后在未修实现上注入反例并亲眼观察红灯：

1. 首轮 2 files、57 tests 为 **50 通过、7 失败**：内存/文件 store 接受带 secret 对象的非字符串 `actor.role`；新鲜 JSONL 与注入 backend 的未知事件、伪造 resolution、非连续 seq 未 fail closed；非法 JSON 只泄露原始 `SyntaxError`。
2. 单独注入 `reasoning: { status: 'present', content: '   ' }` 的持久反例，得到 **1 失败、42 skipped**，证明 journal admission 未继承 TURN-1 的非空 reasoning 纪律。
3. 单独在 SourceAnchor 的嵌套 `textRange` 注入额外 `rawBody` 字段，得到 **1 失败、43 skipped**，证明仅靠顶层检查不能封闭 transport 字段。

修复后同一批反例全部转绿；最终 6 个 INTERACTION-1B 定向文件为 **97/97**。

### 3. 身份、重放与原子性矩阵

| 验收项 | 结果与证据 |
|---|---|
| 身份分流 | ✅ Turn 继续以 `providerRequestId` 表达 provider 身份；Interaction 独立使用 `requestId`。消费点 grep 未发现旧 Turn `requestId` 残留。Interaction actor 仅允许精确键集合、非空 `channelId/actorId` 与可选非空字符串 `role`；空白、非字符串、secret 对象均在写入前拒绝，journal 保持 0 条。 |
| journal 状态与重放 | ✅ fresh / pending / resolved-waiting-resume / completed / failed 均可由 append-only journal 重建；不同 store 实例读取同一 backend/JSONL 可恢复。未知条目、畸形快照、非法迁移、伪造 resolution、跨 turn request 与 seq gap 均抛显式 `TurnJournalCorruptionError`，不清空、不改写原文件。 |
| anchor 严格性 | ✅ `none/optional/required` 与锚数量一致；ResolvedSourceAnchor 运行时 schema 与顶层、`bbox`、`textRange` 精确键同时检查。混合合法/非法 anchors 整批拒绝并保持零 journal，嵌套 transport 字段不能落盘。 |
| 原子 resolution | ✅ option 必须来自不可变请求快照，非 skippable 不可 skip；同一 request 的双解决只有一个胜者。CAS 失败后会重读并重新验证，竞争者先解决时败方不能覆盖；连续 32 次 CAS 失败后显式抛 `TurnJournalContentionError`。 |
| pending 门禁与 resume | ✅ pending interaction 阻断 terminal save 与 provider resume；resolved 后才允许恢复。恢复后的 empty body、provider failure、预先 abort 均保持 TURN-1 的唯一终态语义，未重复发 provider 请求。 |
| 隔离性 | ✅ backend append 接收 clone，公开 append 返回值、输入对象及 replay 结果后续变异均不能反向污染持久 journal。 |

### 4. Browser/Node 子路径与持久边界

验收者在真实 consumer `apps/desktop` 下临时创建对 `@courtwork/core/turn-protocol` 的导入入口，以 Vite 7.3.6 实际打包：**97 modules transformed**，输出 137.11 kB（gzip 33.72 kB）。产物扫描无 `node:`、`appendFileSync`、`readFileSync`、`createFileTurnStore` 或 `turn-store-file`；动态 import 成功，`runTurn`、`requestInteraction`、`createTurnStore` 均为函数，现场 replay 为 `pending_interaction`。临时入口与配置随后删除，工作树无残留。

Node 侧从 desktop consumer 实际导入 `@courtwork/core/turn-store-file`，用新鲜 JSONL 成功恢复 pending；根 barrel 亦可导入 `createFileTurnStore`、`requestInteraction`、`runTurn`。因此 browser-safe 子路径和 Node-only adapter 的导出边界均成立。

JSONL adapter 对无效 JSON 与任何已解析但不符合闭集/状态机的条目 fail closed，且原字节保持不变。其 CAS 是单 Node 进程内同步 read/append；本次不把它扩张表述为跨进程文件锁或抗恶意重写。真正的多进程/数据库 backend 仍须履行 `TurnJournalBackend.append(entry, expectedLength)` 的原子 CAS 责任；若未来要求对“语义完全合法但被宿主恶意重写”的 journal 做防篡改，需要另立完整性/签名契约，不能在本工单私自添加。

### 5. 门禁、范围与提交卫生

- `pnpm install --frozen-lockfile`：13 个 workspace project、1047 个包安装成功，lockfile 无改写。
- `pnpm -r build`：exit 0；12/13 workspace projects，core TypeScript 与 desktop Vite（3493 modules）通过；只有既有 dynamic-import/chunk-size warning。
- `pnpm --filter @courtwork/core test`：**28 files、239/239**，exit 0。
- `pnpm lint`：exit 0，零 error。
- `pnpm test`：**114 files、979/979**，exit 0。
- `git diff --check`：通过；临时 acceptance consumer/config 均已删除。
- 实现级修复显式逐文件暂存，cached 清单仅含 5 个 `packages/core/src/turn/` 文件；提交前检查无越界文件。指定 main 合并只带入 `docs/status/current.md`，未冒充本会话产品修改。

### 6. 放行边界

本轮放行的是 core 内 provider-neutral、可重放的单次受控 Interaction journal 与恢复门禁，不等于放行 desktop UI、任意 tool calling、SessionEvent/ConfirmationStore 合并、多进程 JSONL 锁或 journal 密码学防篡改。上述边界不阻断当前单进程 core 里程碑；任何扩张必须由后续架构工单明确契约与验收标准。

## CONFIRM-CAS-1 独立验收（2026-07-14，纯追加）

验收角色：未参与 CONFIRM-CAS-1 实现的独立验收者；在独立 clean worktree `/Users/lesprivilege/Projects/Courtwork-worktrees/accept-confirm-cas-1`、分支 `codex/accept-confirm-cas-1` 完成。实现 tip 为 `03088670c5e56d0068941237d725f8703c513da1`，指定基线为 `b881508`。

### 1. 结论

**结论：CONFIRM-CAS-1 放行。** `resumeScenario` 已在事件、revision 与 artifact 变更前完成身份、actor、decision 和全部 revision 的校验，再以 snapshot version 条件消费；同 request 的重复保存、重复消费和竞争续行均为 first-wins。独立反例发现 reject 回答携非法 revision 时未预校验的实现级缺陷，已在不改契约的前提下修复，提交为 `5e9d4c13153d9128ceef55ce802829eb7b882d27`（`fix-by-acceptance: validate rejected confirmation revisions`）。

### 2. 不采信实现自述：实际红灯

- 在未修实现上新增 `decision: reject` + 非法 revision 反例，实跑得到 **1 失败、31 skipped**：调用错误完成并消费 pending，证明 reject 路径没有遵守“全部输入先校验”。修复后 reject 仍不落 revision，但会在独立 validation clone 上构造并预执行每条 revision；非法输入零消费，随后合法回答仍可续行。
- 临时删除内存 store 的 `found.version !== expectedVersion` 条件，定向实跑得到 **1 失败、6 通过**：stale version 被错误消费。恢复条件后同文件 **7/7**，证明 CAS 门禁可被反例真实击穿，不是静态自述。

### 3. 原子消费与恢复矩阵

| 验收项 | 结果与证据 |
|---|---|
| validate-before-consume | ✅ actor、decision、request/session/scenario identity、revision 结构和 JSON Pointer 均在 `consume` 前验证。每类非法输入均不追加 `confirmation_resolved`、revision、artifact 或 completion；同一 pending 随后的合法回答仍成功。confirm 与 reject 都校验所有已提供 revision，reject 只校验而不应用或记录。 |
| expectedVersion / identity CAS | ✅ `resumeScenario` 先 `peek`，再以原 snapshot version 调 `consume`；stale version 明确失败。生产续行没有调用 deprecated `take`。request、session、scenario 任一漂移都不会触发 consume。 |
| 重复保存与 fresh instance | ✅ 内存与文件 store 对 pending 或已消费 request id 均拒绝再次保存，旧载荷不能被覆盖或复活。两个 fresh file-store instance 竞争同一 request 时，原子 `wx` tombstone 只允许首个消费者成功。 |
| 双消费者 | ✅ 两个并发 `resumeScenario` 只有一个 fulfilled；另一个因 CAS 失败 rejected。ledger 中只有一条 resolved 和一条 completed，不出现双终态、双 revision 或双 artifact 变更。 |
| deprecated `take` | ✅ 仅作为 `peek` + `consume(version)` 的兼容包装；生产 resume 无调用。它服从相同 first-wins，消费后不能绕过 seen-id/tombstone 重新保存。 |
| 旧文件兼容 | ✅ 无 version、无 tombstone 的旧 `<requestId>.json` 可由新鲜 file-store instance `peek` 并消费；版本由旧载荷确定性计算，不要求迁移文件格式。 |
| tombstone 最小化 | ✅ `.consumed` 仅含 `requestId` 和不透明 version；注入 artifact/material/secret 文本后，marker 中无正文、artifact 或 secret。成功消费后 pending body 被删除。 |
| 崩溃窗口真实性 | ✅ 模拟 marker 已原子创建而 pending body 尚未删除时，新鲜实例隐藏该 pending，`peek/take` 均不能再消费，同 id save 仍拒绝；first-wins 不因残留 body 失效。 |

### 4. 门禁与范围证据

- `pnpm install --frozen-lockfile`：13 个 workspace project、1047 个包，lockfile 无改写。
- CONFIRM 定向：**2 files、44/44**，exit 0。
- `pnpm --filter @courtwork/core lint` 与 core build：exit 0。
- `pnpm --filter @courtwork/core test`：**28 files、251/251**，exit 0。
- `pnpm lint`：exit 0，零 error。
- `pnpm -r build`：exit 0；12/13 workspace projects，desktop Vite **3504 modules transformed**；只有既有 dynamic-import/chunk-size warning。
- `pnpm test`：**114 files、993/993**，exit 0。
- `git diff --check`：通过。无 UI 变更，故本工单不运行 Playwright。
- 生产调用扫描确认 `resumeScenario` 只使用 `peek` 与 `consume(snapshot.version)`；`take` 不在生产续行路径。

### 5. 放行边界与 tombstone 后续

当前 file-store 的提交点是先以 `wx` 创建 tombstone，再删除 pending body，因此 first-wins 与防复活成立；但它不是跨 `ConfirmationStore`、event ledger 与 artifact store 的事务。若进程在 tombstone 创建后、事件追加前崩溃，请求会保持“已消费但尚无 resolved 事件”，本工单不把该窗口冒充为 crash-atomic resume。若未来要求 durable resume 的跨存储原子性，应另立 outbox/事务/恢复协议。

marker 目前会累积，且崩溃可能留下已被 marker 隐藏、仍含敏感内容的 pending body。后续 GC 可以安全删除“已有 marker 的 body”，但不得只删 marker，否则同 request id 可复活；若要压缩 tombstone，必须先引入持久 seen-id ledger 或明确不可复用的保留期契约。这些是已记录的后续耐久性边界，不阻断当前单进程/文件 store 的 CONFIRM-CAS-1 放行。

本轮没有修改 SessionEvent/schema、provider、desktop、Turn interaction、场景语义或 ADR；也不把当前结果扩张为多进程事务、跨存储 exactly-once 或崩溃后自动补偿的放行。

---

## CORE-BOUNDARY-1 独立验收（2026-07-14）

- **验收角色**：未参与 CORE-BOUNDARY-1 实现的独立验收会话。
- **对象**：实现分支 `codex/core-boundary-1`，tip `e42165d2c592c95a3dd00b36616f745f691d5f6b`，指定基线 `0f6b09403d9102bf48036bd5fd2985f22688476c`。
- **验收树**：独立 clean worktree `/Users/lesprivilege/Projects/Courtwork-worktrees/accept-core-boundary-1`，分支 `codex/accept-core-boundary-1`；未在共享主树 checkout、stash 或复用服务。
- **结论**：**✅ 放行。** 无产品代码修复、无契约级问题、无 `[需架构拍板]` 项。

### 1. 物理迁移与单一真源

`git diff --find-renames 0f6b094..e42165d` 共 26 个文件。以下内容为字节级 100% rename：

- `scripts/demo-s3-flow.ts`；
- `s3-assembly.golden.txt`；
- LEGAL integration、S3 real test、S3 golden test、demo assembly test。

其余 runner/acceptance 文件的 rename 相似度为 93%–97%，逐对 diff 只见两类变化：core 内相对 import 合并为 `@courtwork/core` 公共契约；CLI 注释中的 filter 从 `@courtwork/core` 改为 `@courtwork/demo-runtime`。`demo-assembly.ts` 为 98% rename，只把 core 内 `ToolRegistry/MaterialInput` 相对 import 改为根契约。fixture、脚本响应、场景、事件骨架、锚点、确认、修订与 output 逻辑未改。

core 中 `src/composition` 与 `src/acceptance` 均已删除；全仓没有第二份同名实现。`packages/demo-runtime` 同时声明 core/legal/demo-data/output/reading-view 依赖，作为开发/验收绑定点；core 与 desktop 对 `@courtwork/demo-runtime` 的 package/source import 均为零。依赖图守卫全绿，其注入的 `a → b → a` 反例可被 cycle detector 识别。

### 2. core、根 barrel 与 provider compatibility 边界

- `packages/core/package.json` 的生产依赖精确收敛为 provider/schemas/registry/tools/Zod；legal/demo-data/output/reading-view/demo-runtime 为零。
- `packages/core/src` 的非测试生产 import 对上述五包为零；旧绑定目录不存在。
- core 根 barrel 不转售 provider scripted/quirks/errors/pricing/openai，也不导出 demo/acceptance。唯一 provider type 重导出是 `GenerationNotice`；真实 consumer 为 `apps/desktop/src/protocol/client.ts`，且该 type export 在编译 JS 中被擦除。
- `provider-quirks`、`provider-openai`、`provider-types` 三个 compatibility 源文件各只有一行，分别一跳重导向 `@courtwork/provider/quirks|openai|types`。`package.json#courtwork.deprecatedExports` 明确登记三条替代路径；在 desktop 真实 consumer 上下文实际动态导入后，legacy/replacement 的 runtime export keys 分别为 4/4、2/2、0/0。
- `pnpm install --frozen-lockfile` 在 14 个 workspace project、1047 packages 上通过，lockfile 无改写；lockfile importer 精确移除 core 的四项依赖并新增 demo-runtime 的 workspace link，没有新增第三方 runtime 包。

### 3. 可证伪边界与整包移除

验收临时向 `packages/core/src/index.ts` 注入：

```ts
export * from '@courtwork/provider/openai';
```

core package boundary 与 provider compatibility 两组守卫同时真实变红：**2 failed / 5 passed**，失败点分别为“根 barrel 转售 provider 实现”与“compat 实现泄漏至根 barrel”。精确撤除后，core package boundary、provider compatibility、demo dependency boundary 合计 **3 files / 10 tests passed**，git 无反例残留。

随后把整个 `packages/demo-runtime` 临时搬出 workspace，并删除 `packages/core/dist`。在 `demo-runtime_present=no`、`core_dist_present=no` 的状态下：

- `pnpm --filter @courtwork/core build`：exit 0；
- `pnpm --filter @courtwork/core test`：**22 files / 232 tests passed**。

恢复整包后路径与 git 均无残留漂移。这证明 core 不依赖 demo-runtime 的源码、产物、package resolution 或测试副作用。

### 4. demo、CLI 与 golden 等价

- `pnpm --filter @courtwork/demo-runtime test`：**8 files / 26 tests passed**。
- 新 golden SHA-256：`0047e71264f6ddb6aa25cf5ceb10aca7b4a0bd7aee913b9630bb8cafb79bcd07`；从基线 `0f6b094` 直接读取旧 core golden 后计算得到同一哈希。
- `demo:s3`：redline **39,713 bytes**；risk-01–06 applied、risk-07 `locator_not_found`；8 项事件骨架原序；预埋考点 **7/7**；1 条 confirmation、1 条 RevisionEvent、场景完成，golden PASS。
- `demo:legal` scripted 档：**8 风险**、**11 claims / 11 resolved**、out-of-coverage 0、锚点复算零违规；**7 confirmed + 1 rejected**；15 项事件骨架；6 条修订 applied、1 条 `locator_not_found`；golden PASS。

环境中 `DEEPSEEK_API_KEY` 存在，但没有用户提供的 `COURTWORK_S3_CONTRACT` 与 QCC key。验收不拿仓库 demo fixture 冒充真实卷宗；`COURTWORK_S3_REAL=DeepSeek ... real:s3` 在读材料/发请求前以“缺 COURTWORK_S3_CONTRACT”退出，exit 1。本单只放行机械迁包与 scripted/golden 等价，不声称完成真实材料网络验证。

### 5. 最终机器门与范围

- clean `pnpm install --frozen-lockfile`：14 workspace projects、1047 packages，exit 0。
- `pnpm -r build`：**13/14 workspace projects** 全绿；desktop **3505 modules**，仅既有 Tauri static/dynamic import 与 chunk-size warning。
- `pnpm lint`：exit 0，零 error。
- `pnpm test`：**116 files / 1000 tests passed**。
- `git diff --check`：通过；破坏性补丁、临时目录与探针均已恢复。
- 本单无 UI 行为或样式变化，按 ADR-009/总纲无需 Playwright，未运行。

> **最终判定：CORE-BOUNDARY-1 放行 ✅。** `e42165d + 本验收记录` 可进入架构收账。下游可依赖 core 生产边界不携 legal/demo/output/reading-view 绑定、demo-runtime 为唯一开发/验收装配包；不得把本结论扩张为删除三个 ADR-007 compatibility 子路径或完成真实卷宗真 key 验证。

### 合流后补验：workspace 枚举耐受普通文件（2026-07-14）

CORE-BOUNDARY-1 合流主树后，真实 `packages/.DS_Store` 暴露 `packages/demo-runtime/src/package-boundary.test.ts` 的实现缺陷：扫描器把 `packages/` 下每个目录项都拼成 `<entry>/package.json`，普通文件触发 `ENOTDIR`，从而令全仓测试出现 2 项红灯。该文件属于用户环境，不删除、不改写，也不以 ignore 规则掩盖。

独立验收分支加入三类受控反例：普通文件、无 `package.json` 目录、带合法 manifest 的 workspace 目录。未修实现定向结果为 **2 failed / 4 passed**：普通文件精确触发 `ENOTDIR`，空目录精确触发 `ENOENT`；合法 workspace fixture 可进入图。最小修复改用 `readdirSync(..., { withFileTypes: true })`，仅接受真实目录，再检查 `package.json` 是否存在；manifest 一旦存在仍严格 JSON 解析并要求非空 `name`，不会把已声明但损坏的 workspace 静默跳过。修复后定向 **6/6**。

修复后门禁（本验收分支树口径；该分支基于原 CORE-BOUNDARY tip，不包含随后先进入主树的 ABI-2A 提交）：

- `pnpm --filter @courtwork/demo-runtime test`：**8 files / 29 tests passed**；包 build/lint exit 0。
- `pnpm -r build`：**13/14 workspace projects** 全绿；desktop **3505 modules**，仅既有 warning。
- `pnpm lint`：exit 0，零 error。
- `pnpm test`：**116 files / 1003 tests passed**。
- fixture 均在 `finally` 精确清理；`git diff --check` 通过，无 `.DS_Store`、临时文件或目录进入提交。

该修复只加固测试侧 workspace 枚举，不改 package ABI、依赖图语义、生产导出或任何产品代码。CORE-BOUNDARY-1 放行结论保持有效。

---

## TURN-WORK-1 独立验收（2026-07-14）

- **验收角色**：未参与 TURN-WORK-1 实现的独立验收会话；未修改 ADR、schema 或跨层契约。
- **对象**：实现 `35d38b026e0fbacc97c46ad6bb076a085c3ac418`，指定基线 `00c77e2`。
- **验收树**：独立 clean worktree `/Users/lesprivilege/Projects/Courtwork-worktrees/accept-turn-work-1`，分支 `codex/accept-turn-work-1`。
- **结论**：**✅ 放行。** Work 的模型步骤已只经 `TurnRunnerPort` 进入 Turn Engine；provider notice、成功/失败/取消终态、Work link 与失败账本均保持单一真源。无契约级问题、无 `[需架构拍板]` 项、无生产实现缺陷。

### 1. 差异与边界审核

`00c77e2..35d38b0` 共 27 个文件、836 insertions / 144 deletions。改动集中于 provider notice、Turn 终态持久化、SessionEvent/replay、Scenario executor 与 demo-runtime 装配；desktop 两个文件只把已经验真的 notice 机械投影到 `TurnProjection`，未新增请求路径、视觉或协议判断。未修改 Rust、credential、provider catalog、场景/schema/citation/confirmation 契约或产品 provider 范围。

生产源码扫描结果：

- `packages/core/src/scenario-executor` 与 `packages/demo-runtime/src` 中 `.generate(` 为 **0**；
- 非测试运行时代码的 `createTurnRunner(provider, turnStore)` 绑定只在 `packages/demo-runtime/src/composition/demo-assembly.ts`，core 只提供 adapter 定义；
- `ScenarioExecutorDeps` 已无 `provider`，S3 scripted/real 与 legal demo 全部注入 `turnRunner`；
- core 对 legal/demo-data/output/reading-view/demo-runtime 的生产依赖保持为 0；没有第二 Work journal 或自主 tool loop。

### 2. notice 闭集与单一消费

合法 downgrade notice 实测沿同一对象通过 `Provider.stream → provider_notice/PersistedTurn → artifact_produced.providerNotices`，stream 调用 **1** 次、`Provider.generate` 调用 **0**。completed 与 failed 的 TurnStore 快照均保留 notice；desktop projection 在瞬态与 terminal 快照间不丢失。

验收把既有非法 notice 夹具补成“非法事件后仍有完整 started/content/completed 后缀”，消除“因缺 terminal 偶然得到 invalid_response”的假阳性；随后逐项变异：

| 变异 | 实测红灯 |
|---|---|
| 删除 notice shape 与同 code 去重 | **3 failed**：duplicate / unknown code / extra field；其余协议反例仍按各自守卫失败 |
| 允许 notice 在 started 前 | **1 failed**：原应 failed，实际 completed |
| 允许 terminal 后继续消费 notice | **1 failed**：原应 failed，实际 completed |
| OpenAI `generate()` 预消费第二条 stream | **1 failed**：stream consumption 2 ≠ 1 |
| ScriptedProvider `generate()` 预消费第二条 stream | **1 failed**：脚本被第二次消费并耗尽 |

全部变异均用精确 patch 撤除；生产源码无反例残留。OpenAI 与 Scripted 的测试现在同时锁定“同一公开 stream 聚合”和“一次 stream consumption”，不再只数底层 transport。

### 3. Work → Turn 生命周期与失败语义

验收新增真实 Turn Engine 链路反例而非只信 fake terminal：

- rate-limit provider 先持久化 failed Turn，再由 Work 写 `step_failed(scope:model)`；stream 仅 1 次，零 artifact、零 `scenario_completed`、零自动 retry；
- 预先 abort 持久化 `canceled`，SessionEvent 同步记 model failure，signal 未进入 Turn/Session 持久载荷；
- completed Turn 的 assistant content 若随后被 Work schema 拒绝，异常仍为 `GenerationValidationError`；TurnStore 保持 completed，Session 只保留 `turn_linked`，不伪造 provider failure；
- citation repair 产生 attempt 1/2，turnId 与 providerRequestId 各自不同；复用身份在第二次调用前拒绝；
- replay 按事件顺序重建 linked turns，并同时兼容旧 tool 与新 model 两类 `step_failed`。

对应强制变异均真实咬住：link 移到 runner 调用后为 **1 failed**；`createTurnRunner` 绕过 Turn Engine 后 S3 全链 **1 failed**（`WorkTurnFailedError`）；citation 第二轮改回 attempt 1 为 **1 failed**；失败后注入第二次 runner 调用为 **1 failed**（calls 2 ≠ 1）；model failure 改写成 progress 为 **1 failed**；replay 改为逆序插入为 **1 failed**。恢复后 core **22 files / 248 tests** 全绿。

### 4. demo、golden 与产品回归

- `demo:s3`：redline **39,713 bytes**；risk-01–06 applied、risk-07 `locator_not_found`；事件骨架只增加前置 `turn_linked`，预埋考点 **7/7**，golden PASS。
- `demo:legal` scripted：**8 风险**、**11/11 锚点**、out-of-coverage 0、**7 confirm + 1 reject**；6 条 applied、1 条 `locator_not_found`；六段 wire marker、事件骨架、锚点复算与修订命中全部 PASS。provider stream witness 只观察到 **1** 次调用。
- `packages/demo-runtime`：**8 files / 29 tests**；`packages/provider`：**12 files / 88 tests**。

实现触及 desktop projection，因此即使没有视觉改动，仍以隔离端口 `COURTWORK_E2E_PORT=1649` 自起服务运行完整静态门与 Playwright：测试计数门为 208，最终 **208/208 passed**，未复用共享 `:1420` 服务。

### 5. 干净环境、最终门禁与验收修复

- `pnpm install --frozen-lockfile`：**14 workspace projects / 1047 packages**，lockfile 无改写。
- 干净安装后、依赖包尚无 `dist` 时直接跑 core 定向会有 13 个 suite 无法解析 workspace exports；按仓库真实构建顺序先执行 `pnpm -r build` 后，provider/core/demo 分别为 **88 / 245 / 29** 全绿。该现象是 exports 指向 build 产物的既有顺序要求，不是本实现失败。
- 验收补强后最终 `pnpm -r build`：**13/14 workspace projects** 全绿，desktop **3507 modules transformed**；只有既有 dynamic-import/chunk-size warning。
- `pnpm lint`：exit 0，零 error。
- `pnpm test`：**120 files / 1062 tests passed**。
- `git diff --check`：通过；所有 mutation、临时服务与反例均已撤除。

验收发现的是测试可证伪性缺口，不是生产缺陷：非法 notice 夹具的失败原因不唯一；OpenAI/Scripted 只数 transport、未数公开 stream consumption。以独立提交 `1e9e54d`（`fix-by-acceptance(core): strengthen turn-work lifecycle guards`）补齐 4 个测试文件，共新增 3 条 Work 真链测试并加强 notice/单消费断言；未改生产代码或契约。

> **最终判定：TURN-WORK-1 放行 ✅。** 可合入实现 `35d38b0`、验收测试补强 `1e9e54d` 与本报告。放行范围是 Work 模型步骤复用单一 Turn Engine 及其审计链接；不扩张为自动 retry、动态图、模型自主工具、跨存储事务或生产 WorkCommandPort。
