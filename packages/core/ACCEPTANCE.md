## AUDIT-SEAL-3 · core 装配点静态锁验收（2026-07-18）

- **✅ 放行**：新 `tools/tool-registration-boundary.test.ts` 硬编码全仓恰三处 `tools.register()`/`createToolRegistry()` 受信装配点，逐点锁 `toolToken→toolId→factory→sideEffect` 四元组。验收亲写区分探针——保持注册计数不变（仍 1 处），只把 `demo-assembly.ts` 的 `sideEffect` 由 `pure_read` 改 `file_write`，主生产扫描测试独立触红且**零计数类违规**，确认锁的是配对本身而非仅统计次数；既有伪装反例（「expected exactly one … got 2」）复核不变。零新 runtime 分支、依赖、导出、事件或 registry 契约。root Vitest **1261/1261**、`pnpm -r build`/`pnpm lint` 均在验收 worktree 内亲手复跑绿。完整报告见 `packages/tools/ACCEPTANCE.md` 的 AUDIT-SEAL-3 报告。

## AUDIT-SEAL-1 独立验收（2026-07-18）

- **验收角色**：未参与实现的独立验收会话；不采信实现自述，本节全部数字均来自隔离 worktree 亲手复跑。
- **验收坐标**：worktree `/Users/lesprivilege/Projects/Courtwork-audit-seal-1`（既有隔离 worktree，独立于主仓 `/Users/lesprivilege/Projects/Courtwork`），验收即在 `impl/audit-seal-1` tip `ac6e512` 上进行；基线与验收开始时 `main` 尖端均为 `bcafc5e`，`git merge-base impl/audit-seal-1 main` 确认零需 rebase。
- **裁决：AUDIT-SEAL-1 放行 ✅。** 解耦审计（`archive/research-2026-07-15-round-3/decoupling-audit-2026-07-18.md`）裁定的两处 P0 结构性口子——① `runTools()` sideEffect 门此前只在 `confirmationPolicy.mode==='none'` 生效、② `scoped_write` 无 target-exists 保护——均已在 core/legal/desktop 三处密封；legal `S6` 悬空 `file-ops-executor` 声明（口子①在场景层的具体病灶）已清理。三层独立红证均亲手复现×3 轮；触碰面精确、零新依赖；全量门在验收 worktree 内独立实跑绿。验收期间发现两项非阻断观察（见第 5、6 节），均未构成驳回理由，验收期间未修改产品实现。

### 1. 触碰面、审计溯源与复杂度

`git diff --stat bcafc5e..ac6e512` 为 **18 files / 275 insertions / 44 deletions**，逐档只落在三处：

- `apps/desktop`：`SPEC.md`、`scripts/assert-host-auth-contracts.mjs`、`src-tauri/src/{host_auth,lib}.rs`、`src/{App.tsx,host/HostAccessPanel.tsx,host/host-auth-port.ts,host/host-auth.test.ts,host/tauri-host-auth.ts,output/case-output-client.ts}`。
- `packages/core`：`SPEC.md`、`src/scenario-executor/{executor.ts,citation-repair.test.ts}`、`src/tools/tool-registry.ts`。
- `packages/legal`：`SPEC.md`、`src/scenarios/index.ts`、`src/package/{manifest.test.ts,layout-golden.test.ts}`。

`package.json`、`Cargo.toml`、`Cargo.lock`、`pnpm-lock.yaml` 全仓零 diff（现场逐一核对，零新依赖）。`packages/registry`、`packages/schemas`、`packages/tools`、`packages/output`、`packages/reading-view`、`packages/pm`、`packages/demo-data`、`packages/demo-runtime`、`services/ingest`、`docs/status/current.md`、`eval/` 均零触碰。

溯源 `decoupling-audit-2026-07-18.md`：本单精确对应审计裁定的两处 P0（引文：「`runTools()` 的 sideEffect 门只在 `confirmationPolicy.mode==='none'` 生效……`scoped_write`（`host_auth.rs`）底层无 target-exists 保护」），legal S6 的 `file-ops-executor` 悬空声明是口子①在场景层的具体病灶而非独立第三项，与三份 SPEC.md 的自述叙述一致。

复杂度审视：三层改动均为既有分级/既有判据的平铺或收窄（`toolPermittedBeforeConfirmation` 复用既有 `SideEffectClass`；`atomic_write` 新增 `overwrite: bool` 参数复用既有 `HostAuthReason` 闭集），零新事件类型、零新持久格式、零新状态机、零新外部依赖。legal/SPEC.md「精确触面」清单遗漏 `layout-golden.test.ts`（该文件的 hash 变更已在同节前文逐字说明「该有意 descriptor 声明收窄使既有整面 golden……重算为……」，非隐瞒，只是清单未列该文件）——记录供 SPEC 维护参考，不构成驳回理由。

### 2. Core 层独立红证（stash 隔离复现，×3）

`packages/core/src/scenario-executor/citation-repair.test.ts` 修复后固定状态先跑通基线：**9/9 passed**。

以 `git checkout bcafc5e -- packages/core/src/scenario-executor/executor.ts packages/core/src/tools/tool-registry.ts` 隔离撤回实现（保留新测试文件不动），连跑 3 次：

```
Test Files  1 failed (1)
     Tests  2 failed | 7 passed (9)
```

三次结果逐字节一致。关键失败精确复现审计病灶：

```
gates 场景在门禁前绑定非纯读、非无损工具即拒跑
AssertionError: promise resolved "{ status: 'paused', … }" instead of rejecting
```

即修复前 `gates` 模式场景绑定非法工具会静默执行并落至 `paused`，而非在门禁前拒绝——与 SPEC 自述「修复前实际执行并返回 paused」逐字吻合。`git checkout HEAD -- <两文件>` 归位后连跑 3 次，**9/9 passed** 逐字节一致。

### 3. Legal 层独立红证（stash 隔离复现，×3）

`manifest.test.ts` + `layout-golden.test.ts` 修复后固定状态基线：**15/15 passed**。

以 `git checkout bcafc5e -- packages/legal/src/scenarios/index.ts` 隔离撤回（保留两份新/改测试不动），连跑 3 次：

```
Test Files  2 failed (2)
     Tests  2 failed | 13 passed (15)
```

三次结果逐字节一致，关键失败：

```
expected [ 'copy-file', 'mkdir', …(1) ] to deeply equal [ 'copy-file', 'mkdir' ]
+ "file-ops-executor"
```

精确复现 S6 悬空声明。`git checkout HEAD -- <文件>` 归位后连跑 3 次，**15/15 passed** 逐字节一致。

### 4. Rust 层独立红证（cargo 反例亲跑，×3）

Rust 测试与实现同文件，修复引入的函数签名变化（`scoped_write` 由 3 参增至 4 参）使新测试无法对旧签名编译，不能沿用「revert 实现、保留新测试」的隔离手法。验收会话改为：`git checkout bcafc5e -- apps/desktop/src-tauri/src/{host_auth,lib}.rs` 整体撤回（含旧测试），亲写反例探针 `audit_seal_1_counter_example_scoped_write_silently_clobbers_existing_file`（验收会话自製，非实现自带）：对已存在 `original.txt` 用旧 3 参 `scoped_write` 写入新字节，断言旧代码会覆盖成功。`cargo test --lib` 定向连跑 3 次：

```
test host_auth::tests::audit_seal_1_counter_example_scoped_write_silently_clobbers_existing_file ... ok
test result: ok. 1 passed; 0 failed
```

三次一致——探针验证的是「旧代码会覆盖」这一断言为真，即漏洞在修复前确实存在。`git checkout HEAD -- <两文件>`（连同验收探针一并丢弃）归位后 `cargo test --lib` 连跑 3 次，**67/67 passed** 逐次一致（`existing_file_is_refused_instead_of_overwritten_by_default`、`existing_regular_file_can_be_overwritten_only_when_explicit`、`overwrite_flags_are_fail_closed_and_explicit_on_host_wires` 均在场）。

### 5. 放行闭集覈真（含伪装反例注入）

`toolPermittedBeforeConfirmation(toolId, sideEffect)` 判据为具名闭集而非字符串巧合：`SideEffectClass` 是 5 值闭合 union（`pure_read | file_write | external_send | mcp_side_effect | authoritative_mutation`，`packages/schemas/src/artifact-descriptor.ts`）；`copy-file`/`mkdir` 的「无损级」身份独立见于 `packages/tools/src/file-ops-lossless.ts`（本单零触碰）的既有实现——两工具本身即对已存在目标显式 `throw new Error('目标已存在，已拒绝覆盖。')`，与 ADR-004「无损动作可直接执行……删除、覆盖等销毁级动词不进入 agent 能力面」逐字吻合，构成独立佐证而非命名巧合。仓库唯三处 `createToolRegistry()`/`.register()` 生产调用点（`demo-runtime/src/composition/demo-assembly.ts`、`demo-runtime/src/acceptance/run-s3-real.ts`、`apps/desktop/src/work/legal-s3-binding.ts`）均为受信组合根，与 CLAUDE.md「可执行跨域绑定只允许出现在受信组合根」一致。

验收会话亲写伪装反例：注册一个实际执行副作用、但 `sideEffect` 谎报为 `'pure_read'` 的工具（`disguised-writer`），在 `gates` 场景下运行——**该工具确实执行了**（`executed === true`，门禁未拦截，TypeScript 亦未在类型层拒绝该注册）。此为**遗留信任边界，非本单引入**：修复前的 `none`-only 门对同一伪装同样会放行（新旧代码在此点行为一致），且 SPEC 明确自陈本单范围「只把既有 sideEffect……平铺到姊妹模式」，未承诺验证声明真实性。鉴于 `.register()` 仅三处受信装配点可达，此信任边界有界、非任意包/场景可利用，记录为**非阻断观察**，不构成驳回理由；探针测试验收后已丢弃（`git checkout HEAD` 归位），未进入交付分支。

### 6. Rust overwrite 闭集边界（symlink/目录 fail-closed，验收亲写探针）

SPEC 自陈「`true` 只替换安全实体文件，符号链接/非文件仍 fail closed」，但交付测试集里没有任何用例针对 `overwrite=true` 撞见既存符号链接或目录的分支（`grep symlink` 命中的既有测试均为 `resolve_target` 的路径逃逸门，不是 `atomic_write` 提交阶段的目标类型判定）。验收会话亲写两条探针（`audit_seal_1_probe_overwrite_true_still_fails_closed_on_symlink_target`、`_on_directory_target`），针对固定（已修复）实现连跑 3 次：

```
test ... _on_symlink_target ... ok
test ... _on_directory_target ... ok
test result: ok. 2 passed; 0 failed
```

三次一致，行为如实：symlink 目标不被写穿到宿主外文件、目录目标不被替换。**这是覆盖率缺口，不是缺陷**——`fs::symlink_metadata` 判据本身正确，只是交付测试集未固化该分支的回归保护。验收探针已丢弃，未提交进交付分支；建议后续补一条正式回归测试（已用 `spawn_task` 登记为独立跟进项，见会话结尾）。

### 7. 覆盖语义三道核

- **case_output 覆盖语义不回退**：`case_output_write_is_bounded_to_case_output_directory` 新增断言——`overwrite=false` 撞见既存 `答辩意见.docx` 时 `is_err()` 且原字节不变；`overwrite=true` 显式替换后新字节在场；`overwrite_flags_are_fail_closed_and_explicit_on_host_wires` 断言 `CaseOutputWriteInGrantInput` 省略 `overwrite` 时 `serde` 反序列化直接失败（不静默默认，呼应仓库不变量「静默降级零容忍」）。三例均在第 4 节 67/67 全量内确认通过。
- **App 层 sha256 第二道仍在**：现场读码 `apps/desktop/src/App.tsx` 的 `ingestComposerUploads`——`sha256Hex(existing.bytes)` vs `sha256Hex(attachment.bytes)` 比对仍在写入之前执行；同名异内容分支 `refused.push(fileName); continue`，从不到达 `hostAuth.writeFile`；未命中既存文件分支才调用 `writeFile(..., overwrite: false)`，与宿主层新增的默认拒绝构成纵深防御（App 层判断失误或被绕过时，宿主层仍独立拒绝），非单点依赖。
- **PILOT-LIVE-2 附件断言不回退**：验收会话在隔离端口 `18744` 亲跑 `pilot-case-upload.spec.ts` 全部 3 例：

  ```
  ✓ F 主红证：grant 案 work 面上传 → 落入项目文件夹并入库（卷宗可见）+ 正文仍必达模型
  ✓ F 幂等：同名同内容已在项目文件夹 → 跳过写入、就地入库（不重复上传）
  ✓ F 拒绝覆写：同名异内容 → 显式拒绝反馈，零写入零入库（原件只读红线）
  3 passed (5.0s)
  ```

### 8. 全量门（合并树；`main` 尖端即基线，零需 rebase）

| 门 | 结果 |
|---|---|
| `pnpm -r build` | PASS（13/14 workspace projects；desktop Vite 3578 modules，仅既有 chunk-size 提示） |
| `pnpm lint` | PASS，零 error |
| root Vitest | **144 files / 1247 tests passed** |
| desktop Vitest | **58 files / 352 tests passed** |
| `cargo test --lib`（`apps/desktop/src-tauri`） | **67/67 passed**（第 4 节复跑口径） |
| `demo:s3` golden | PASS（7/7 考点，9 事件） |
| `demo:legal` golden | PASS（骨架/考点/锚点复算/六段标记/修订命中全符） |
| 完整 `test:e2e`（隔离端口 `18744`/`18745`/`18746`，独立三轮） | 三轮均 **290/290 passed**（2.7m / 2.8m / 3.2m），含全部 `[residue]` 疊层清单与 mutation 自证例 |

floor **290** 不动的理据：本单新增覆盖全部落在 vitest（core 2 例、legal 1 例）与 cargo（rust 新增 `existing_file_is_refused_instead_of_overwritten_by_default`/`existing_regular_file_can_be_overwritten_only_when_explicit`/`overwrite_flags_are_fail_closed_and_explicit_on_host_wires` 共 3 例，另在既有 `case_output_write_is_bounded_to_case_output_directory` 内追加断言）层，交付范围内没有新增可达的用户可见 E2E 场景——legal S6 尚未装配执行入口（`[需架构拍板]` 留痕在案），`gates` 模式非法工具在当前唯一生产场景集（legal 五场景）中不存在可触发实例，`scoped_write` 的覆盖保护是既有三条写入调用点（附件入库/授权探针/case_output）的既有语义显式化而非新增用户旅程。既有 290 项 E2E 中与本单相关的用例（`pilot-case-upload.spec.ts` F 系列、`assert-host-auth-contracts.mjs` 静态门）均在第 7、8 节确认不回退。

### 9. 复跑命令

```text
git merge-base impl/audit-seal-1 main && git rev-parse main
pnpm -r build && pnpm lint
pnpm test
(cd apps/desktop && pnpm test)
(cd apps/desktop/src-tauri && cargo test --lib)
(cd packages/demo-runtime && pnpm demo:s3 && pnpm demo:legal)
(cd apps/desktop && COURTWORK_E2E_PORT=<free-port> pnpm test:e2e)
```

> **最终判定：放行 AUDIT-SEAL-1。** 三处结构性口子（core 全模式 sideEffect 门、legal S6 声明清理、rust 覆盖保护下沉）均成立，三层独立红证与全量门均在验收 worktree 内亲手复跑绿。第 5、6 节两项观察（工具伪装声明的遗留信任边界、rust fail-closed 分支覆盖率缺口）均非本单引入、均非阻断，已如实记录并各自登记后续跟进方式。desktop/legal 侧简述见对应 `ACCEPTANCE.md`。

未更新 `docs/status/current.md`；未推送；未 prune 任何 worktree/分支。

---

## WORK-TURN-1 · core 組裝縫（2026-07-17）

- **✅ 放行**：`assembleGenericChatSystemPrompt(memorySegment?, workContextSegment?)` 缺省逐字不變、順序 base→memory→work、穩定前綴與同輸入同字節均成立；忽略 work 段 mutation 精確 2 紅，還原後 10/10 × 3，並隨 root Vitest **1239/1239** 與完整 E2E **287/287** 通過。core 不解釋案語義、不另立 journal；desktop 供給與已知重試邊界見 `apps/desktop/ACCEPTANCE.md`。

---

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

---

## WORK-BROWSER-1 独立验收（2026-07-14）

- **验收角色**：未参与 WORK-BROWSER-1 实现的独立验收会话；未修改 ADR、schema 或跨层契约。
- **对象**：实现 `f18ad31073810bfe913022eb3324096804352149`，指定基线 `bed44095133723d33de3e153b58a286a886a612b`。
- **验收树**：独立 clean worktree `/tmp/courtwork-work-browser-1-acceptance`，分支 `codex/accept-work-browser-1`；未在共享主树 checkout/stash，未复用共享服务。
- **结论**：**✅ 放行。** browser-safe Work protocol、Node-only file adapter 边界、根入口兼容与既有持久语义均成立。无生产代码修复、无契约级问题、无 `[需架构拍板]` 项。

### 1. 包出口与运行时图

实现把 EventLog、ConfirmationStore、RevisionEventStore 的同步 Node file adapter 物理迁到独立文件，并发布三个有意不同的面：

- `@courtwork/core/work-protocol`：Scenario executor、Work/Session 类型、内存实现与 TurnRunner port；没有 file adapter；
- `@courtwork/core/work-store-file`：三个 Node-only file factory；
- `@courtwork/core`：为既有消费者保留三个 file factory，不破坏根入口兼容。

验收新增真实 package export 导入，逐一确认 `createFileEventLog`、`createFileConfirmationStore`、`createFileRevisionEventStore` 在根入口和 file 子路径中是同一函数，而 browser protocol 不具有这些属性。已有 Vite consumer 从 package subpath 而非源码相对路径导入，并扫描真实 bundle；最终构建无 `__vite-browser-external`、`node:crypto/fs/path`。

实现差异共 22 个文件，集中于 core 的 adapter 拆分、executor 身份源、package exports、Vite consumer 和本层 SPEC。对 `SessionEvent`、session types、schemas、legal 与 pm-schemas 的基线差异均为空；没有新增事件、字段、终局或跨层接口。file adapter 仍是同步接口，未冒充 WORK-STORE-1 的 async/CAS host。

### 2. 不采信实现自述：实际红灯与撤回

所有反例都在独立树实际注入、观察失败，再用精确 patch 撤回；最终生产源码无 mutation 残留。

| 反例 | 实测红灯 |
|---|---|
| `work-protocol.ts` 直接注入 `node:fs` | 递归图门 **1 failed / 3 skipped**；重建 core 后真实 Vite consumer 同样 **1 failed / 3 skipped**，bundle 命中 Vite browser-external。 |
| 可达子模块 `events/event-log.ts` 递归注入 `node:crypto` | **1 failed / 3 skipped**，错误精确指向子模块路径与 `node:crypto`，证明不是只扫入口文本。 |
| Web Crypto 缺失时弱降级为固定字符串 | 新 fail-closed 测试 **1 failed / 42 skipped**；期望 Web Crypto 错误，实际落到弱身份错误。恢复后缺 `crypto.randomUUID` 会在 link/runner 前失败且事件为零。 |
| 删除空 `turnId` 的 trim 校验 | **1 failed / 42 skipped**；非法空身份进入 runner，暴露 `must not run`。 |
| 删除已链接 turn/provider request 去重 | citation repair **1 failed / 6 skipped**；原应拒绝的第二轮错误完成，证明身份唯一门真实承重。 |
| file CAS version 改为固定值 | SHA 字节契约 **1 failed / 9 skipped**；实际 version 与原始 pending JSON 的 SHA-256 不同。 |
| tombstone 注入完整 pending payload | **1 failed / 9 skipped**；marker 现场泄漏 `TOP-SECRET-ARTIFACT`。 |
| 删除 `snapshot.version !== expectedVersion` | **1 failed / 9 skipped**；fresh instance 以 stale version 错误消费 pending。 |

### 3. store 与演示等价

file confirmation adapter 保留原始 pending JSON 字节的 SHA-256 version、仅含 `requestId/version` 的 tombstone、`wx` first-wins 和 expected-version CAS。验收新增直接读取文件字节并独立计算 SHA-256 的守卫，避免只验证长度或实现自身返回值。内存 store 按 SPEC 使用进程内不透明 `memory-N` token，不把 file hash 契约错误扩张到 browser 内存实现。

EventLog 与 RevisionEventStore 的既有持久/回放测试随 core 全套通过；根出口和 file 子路径实际动态导入通过。两条 scripted 全链未发生事件、confirmation、revision、artifact 或输出漂移：

- `demo:s3`：redline **39,713 bytes**，risk-01–06 applied、risk-07 `locator_not_found`，事件骨架 golden PASS，预埋考点 **7/7**，1 条 confirmation、1 条 RevisionEvent，场景完成；
- `demo:legal`：8 risks，**11/11** claims resolved、out-of-coverage 0，7 confirmed + 1 rejected，6 applied + 1 `locator_not_found`，骨架/考点/锚点复算/六段标记/修订命中全部 PASS。

### 4. 最终门禁与验收补强

- `pnpm install --frozen-lockfile`：14 workspace projects、1047 packages，lockfile 无改写。
- browser/executor/citation/confirmation 定向：**4 files / 64 tests passed**。
- `pnpm --filter @courtwork/core test`：**23 files / 254 tests passed**。
- `pnpm --filter @courtwork/demo-runtime test`：**8 files / 29 tests passed**。
- `pnpm -r build`：**13/14 workspace projects** 全绿；desktop **3520 modules transformed**，仅既有 Tauri static/dynamic import 与 chunk-size warning。
- `pnpm lint`：exit 0，零 error。
- `pnpm test`：**121 files / 1084 tests passed**。
- 无 desktop 行为或视觉变化，按 SPEC 不要求 Playwright，未运行。

验收补强 3 条守卫：缺 Web Crypto fail-closed、file CAS version 对原始 JSON 字节的 SHA-256、根/browser/file 三入口的实际导入与隔离。它们只增强可证伪性，不改产品代码、导出或契约。

> **最终判定：WORK-BROWSER-1 放行 ✅。** 可合入实现 `f18ad31`、本验收测试补强与报告。放行范围仅是现有同步 Work protocol 的 browser-safe 图和 Node file adapter 物理边界；不扩张为 WORK-STORE-1、Tauri durable host、跨存储事务、live Work command 或 HARNESS-KERNEL-1。

---

## HARNESS-KERNEL-1 独立验收（2026-07-14）

- **验收角色**：未参与 HARNESS-KERNEL-1 实现的独立验收会话；未修改 ADR、schema 或跨层契约。
- **对象**：实现 `94c430efebcfbbcc75d4a04f7c4f69212c528695`，父提交 `409bfec`。
- **验收树**：独立 clean worktree `/tmp/courtwork-harness-kernel-1-acceptance`，分支 `codex/accept-harness-kernel-1`；未在共享主树 checkout/stash，未复用共享服务。
- **结论**：**✅ 放行。** 该 facade 只机械装配既有 Turn runner、interaction coordinator 与同一 TurnStore replay/resolve；没有第二 loop、journal、事件、hook、Work step 或产品接线。无契约级问题、无 `[需架构拍板]` 项、无生产实现缺陷。

### 1. 窄 facade 与语义等价

`TurnHarnessRuntime` 运行时对象只有 `turns`、`interactions`；两个 port 分别只有 `run` 与 `request/resolve/replay`，三层对象均冻结。provider、store、template registry 只被 factory 闭包持有，不作为属性、events、journal 或 mutation hook 转售。一次相同 provider stream 经直接 `createTurnRunner` 与 facade 得到同序 TurnEvent、同一 terminal；interaction request、resolve、replay 与 first-wins 也和原函数/同一 store 等价。

实现只把 `InteractionCoordinatorDeps.materials` 与 `resolveClaim(..., layers)` 的数组入参从可变类型增宽为 `readonly`。父提交到实现的生产差异在这两个文件均只有签名中的 `readonly`，resolver 函数体、匹配顺序、唯一性判断、坐标与事件形状没有变化；readonly fixture 可同时通过直接 coordinator 与 facade，并经真实 TypeScript build，属于语义等价的类型收窄。

实现没有修改 `TurnEvent`、`SessionEvent`、TurnStore、ScenarioExecutorDeps、desktop、demo composition、provider/schema 或依赖清单。Work 仍只持有 `turnRunner: TurnRunnerPort`；当前 Desktop Chat/Work 也未接入完整 facade。

### 2. 不采信实现自述：实际变异矩阵

全部反例都在独立树逐项注入、观察失败，再用精确 patch 撤回；提交前对被变异的五个生产文件逐一检查，diff 为零。

| 反例 | 实测红灯 |
|---|---|
| facade 转售 provider/store/template registry | 定向 **1 failed / 5 passed**，精确报出多余三个 key |
| 移除 runtime、turns、interactions 的冻结 | **1 failed / 5 passed**，`Object.isFrozen` 由 true 变 false |
| 执行任意 `beforeProviderRequest` hook | **1 failed / 5 passed**，注入 hook 调用数由 0 变 1 |
| interactions 转售第二 `journal` | **1 failed / 5 passed**，port key 闭集检出 `journal` |
| request 绕开注入的 template registry | **3 failed / 3 passed**；新增专门守卫要求未知模板仍抛 `UnknownInteractionTemplateError` 且 journal 为 idle |
| request 为缺失材料伪造可解析锚点 | **1 failed / 5 passed**；原应 `InteractionAnchorResolutionError`，实际错误落账 |
| replay 改读 shadow turn | **3 failed / 3 passed**，terminal、pending 与回放身份同时漂移 |
| resolve 改写 request identity | **1 failed / 5 passed**，同一 pending 无法由同 store 解析 |
| pending interaction 时跳过前置拒绝 | harness + resume **2 failed / 9 passed**，provider 调用从 0 变 1 |
| 放宽 already-resolved / replay state 的 first-wins | harness + journal **4 failed / 50 passed**，重复回答被 journal transition 门拦为 corruption，而非覆盖首答 |
| turn-protocol 可达图直接注入 `node:fs` | **1 failed / 4 passed**，递归图门精确指向 facade 文件 |
| turn-protocol 可达图注入 `Math.random()` | **1 failed / 4 passed**，弱身份随机守卫命中 |
| Desktop Chat/Work host import 完整 facade | **1 failed / 4 passed**，扫描报告 `apps/desktop/src/App.tsx` |
| `ScenarioExecutorDeps` 增加完整 runtime | **1 failed / 4 passed**，仍要求只保留 `turnRunner: TurnRunnerPort` |

没有新增 Turn/Session event type、第二 journal 或生命周期改写入口；`request` 继续只能经 template registry 与系统 anchor resolver，非法请求零落账；pending provider=0 和回答 first-wins 均由既有 store/runner 门而非 facade 内复制逻辑保证。

### 3. browser 出口与真实 consumer

`@courtwork/core/turn-protocol` 增量导出 facade，递归运行时图包含 `turn-harness-runtime.ts`、不包含 `turn-store-file.ts`。真实 Vite consumer 从 package subpath 导入 `createMemoryTurnStore/createTurnHarnessRuntime` 并保留到 Rollup 产物；bundle 无 `__vite-browser-external` 或 `node:crypto/fs/path`。定向最终为 **2 files / 11 tests passed**。

验收以独立提交 `0e6328f`（`fix-by-acceptance(core): strengthen harness boundary guards`）补强三项可证伪性：facade 不能绕过 registry/anchor resolver；turn-protocol 递归图禁弱随机数；完整 facade 不得直接进入 Desktop Chat/Work 或 ScenarioExecutorDeps。只改测试，不改产品代码、导出或契约。

### 4. 最终机器门与范围

- clean `pnpm install --frozen-lockfile`：**14 workspace projects / 1047 packages**，lockfile 无改写。
- facade/browser 定向：**2 files / 11 tests passed**。
- `pnpm --filter @courtwork/core test`：**24 files / 262 tests passed**。
- `pnpm -r build`：**13/14 workspace projects** 全绿；desktop **3521 modules transformed**，只有既有 Tauri static/dynamic import 与 chunk-size warning。
- `pnpm lint`：exit 0，零 error。
- `pnpm test`：**124 files / 1097 tests passed**。
- `git diff --check`：通过；所有 product mutation 均已撤除。无 UI 行为或样式变化，按 SPEC 不要求 Playwright，未运行。

> **最终判定：HARNESS-KERNEL-1 放行 ✅。** 可合入实现 `94c430e`、验收守卫 `0e6328f` 与本报告。放行范围仅是既有 Turn/interaction primitive 的冻结窄 facade；不扩张为 Chat/Work 接线、第二控制循环、Steering/follow-up、session tree、MCP、动态工具、subagent、后台任务或 WORK-STORE-1。

---

## WORK-STORE-1 独立验收（WORK-STORE-1-ACCEPT，2026-07-16）

- **验收角色**：未参与 WORK-STORE-1 实现的独立验收会话；不采信实现侧测试数字。
- **对象**：`main @ f4f06a6`，实现 `2a34ff3` 经 `bee9d12` 合入；指定实现差异 `540269a..2a34ff3`。
- **验收树**：独立 clean worktree `/Users/lesprivilege/Projects/Courtwork-work-store-1-accept`，分支 `codex/accept-work-store-1`；共享主树与实现 worktree 均未 checkout、stash 或改写。按新规未运行 `git worktree prune`。
- **结论**：**❌ 不放行。** 大小闸、CAS 败者、版本迁移、runtime-limit 终态、原子替换崩溃恢复和 browser-safe 出口均成立，但发现两项实现阻塞：Turn terminal 屏障位置晚于 artifact 解析，以及 `scenario_failed` 未同步全部 desktop 消费点。两项契约在 Accepted ADR 已明确，不需要重新拍板；应按现行契约修复后由另一验收轮复验。

### 1. 差异范围与概念预算

`540269a..2a34ff3` 精确为 **15 文件 / 1579 insertions / 86 deletions**：

1. `packages/core/SPEC.md`
2. `packages/core/src/events/event-log.ts`
3. `packages/core/src/events/types.ts`
4. `packages/core/src/index.ts`
5. `packages/core/src/scenario-executor/executor.test.ts`
6. `packages/core/src/scenario-executor/executor.ts`
7. `packages/core/src/work-state/envelope.test.ts`
8. `packages/core/src/work-state/envelope.ts`
9. `packages/core/src/work-state/work-state-host-file.test.ts`
10. `packages/core/src/work-state/work-state-host-file.ts`
11. `packages/core/src/work-state/work-state-store.test.ts`
12. `packages/core/src/work-state/work-state-store.ts`
13. `packages/core/src/work/work-protocol.ts`
14. `packages/core/src/work/work-store-file.ts`
15. `packages/demo-runtime/src/acceptance/run-s3-real.ts`

`packages/schemas` 与 `docs/status/current.md` 差异均为 0；无 package manifest、lockfile 或第三方依赖变化。`work-state-store.ts` 为 UTF-8 纯文本，13,504 bytes，NUL=0、替换字符=0，`git diff --numstat` 为 `340/0`，可正常文本 diff。

复杂度留痕与代码抽查一致：新增通用概念只有 `WorkStateEnvelopeV1` 持久格式和 `WorkStateStore` whole-envelope CAS 权威；Node file host、可选 barrier、`scenario_failed` 终态与软限 callback 均是 ADR 指派概念的 adapter/注入缝/闭集替换，没有第三套 journal、WAL、snapshot-tail、新依赖或远程/多写者抽象。既有 `take()`、`onTurnEvent` 与同步 file compatibility 面只在 SPEC 提案区留痕，未越权顺手删除。

### 2. 出口、宿主与 demo 等价证据

- `@courtwork/core/work-protocol` 定向 **4/4**：递归运行时图和真实 Vite package-subpath consumer 均无 `__vite-browser-external`、`node:crypto/fs/path`。实际动态导入确认 browser 出口具有 `readWorkStateEnvelope/loadWorkStateStore`，不具有 `createFileWorkStateHost`；Node-only `work-store-file` 出口具有该 factory。
- 本机 Node `v25.9.0` / libuv `1.52.1` 的 `_uv__fs_fsync` 反汇编先调用 `fcntl(fd, 0x33)`，失败才依次退到 `0x55` 与 `fsync`；本机 SDK 定义 `0x33=F_FULLFSYNC`、`0x55=F_BARRIERFSYNC`。独立 C 探针在当前 APFS 上对普通文件和父目录调用 `F_FULLFSYNC` 均返回 0，故本机 Node host 的文件与目录强同步路径成立。
- 尖端 `demo:s3`：39,651 bytes、7/7 考点、9 事件、golden PASS；`demo:legal`：8 风险、11/11 锚点、7 confirm + 1 reject、17 事件、golden PASS。两条集成已包含在全量 1203 测试中。
- 另建 `540269a` detached baseline worktree、frozen install/build 后实际重跑两条 CLI；S3/Legal 的事件骨架、考点、锚点与处置逐项一致。提交中的 `s3-assembly.golden.txt` 在基线与尖端 blob id 同为 `c0f9dae0...`；两条 `revision-instruction-set.json` 分别逐字节相同，S3/Legal docx 的 `word/document.xml` 与 `word/comments.xml` 逐字节相同。zip 容器哈希受既有 mtime 影响而不同，不冒充全 zip byte-stable。
- demo composition 全仓零 `persistBarrier` 注入；尖端与基线等价实跑证明无 store 时可选屏障为 no-op，没有改变 demo 事件与业务载荷。

### 3. 全量门与反例矩阵

- `pnpm install --frozen-lockfile`：**14 workspace / 1047 packages**，exit 0。
- `pnpm -r build`：**13/14 workspace** 全绿，desktop **3537 modules transformed**；仅既有 dynamic-import/chunk-size advisory。
- `pnpm lint`：exit 0。
- `pnpm test`：**139 files / 1203 tests passed**（基线口径 1175 + 28）。
- `demo:s3`、`demo:legal`：均 exit 0、golden PASS。

每个 mutation 都在验收树单独注入、看到目标红灯后精确还原：

| 反例 | 独立实测 |
|---|---|
| 删除 provider 前 `turn_linked` barrier | **1 failed / 45 skipped**；provider 现场读到 `providerSawDurableTurnLink=false` |
| 删除 in-memory host 的 expected-generation CAS 守卫 | **1 failed / 10 skipped**；败者错误 resolve 为 generation 3，未抛 `WorkStateConflictError` |
| 删除 16 MiB 硬限 | **1 failed / 10 skipped**；16,779,008-byte 信封错误落到 host |
| 删除未知 `storageVersion` 闸并注入 version 2 | **1 failed / 7 skipped**；未知版本不再抛错 |
| 移除 runtime-limit 终态化 | **1 failed / 45 skipped**；回归为裸 `RuntimeLimitExceededError` rejection |
| 把原子替换退化为慢速就地覆写 | crash guard 首轮即 **1 failed / 5 skipped**，读回 torn envelope |
| 删除 4 MiB callback | **1 failed / 10 skipped**；`onSoftLimitWarning` 调用数 0 ≠ 1 |

真实原子实现另把内置 6 轮临时加严为 **20 轮**，并把“至少一次 SIGKILL”断言收紧为 `killed === trials`：**20/20 SIGKILL 确实落下、20/20 完整可读、0 撕裂**。软限测试证明 callback 被调用且写入仍成功；生产 `SessionEvent` 闭集中 `softLimit`/warning 事件为 0，符合架构裁定的 callback 形态。所有临时 mutation 与加严断言均已还原。

### 4. 阻塞发现

#### B1 · Turn terminal 未在 artifact 解析前经过 durable barrier（实现阻塞）

ADR-010 决定二第 3 条要求“Turn terminal 成功持久后才能解析并发布 artifact”。当前 `runWorkTurn` 在 provider 前持久 `turn_linked` 后，`turnRunner.run()` 返回便直接进入 JSON/schema/citation 解析；`produceSequence` 直到 `artifact_produced` 已 append 后才调用下一次 barrier，实际是把 terminal 与已经解析出的 artifact 同批持久。

验收临时注入带观测器的 artifact schema，以 barrier 调用数为顺序证据：header=1、turn_linked=2；若 terminal 先持久，schema parse 现场至少应见 3。实测为 **2**，定向 **1 failed / 46 skipped**（`expected 2 >= 3`）。这不是性能差异，而是 Accepted ADR 的 durable-before-parse 顺序未成立；实现侧现有“六屏障”测试只覆盖 provider 前的 `turn_linked`，未覆盖第 3 条。

#### B2 · `scenario_failed` 全消费点同步宣称不成立（实现阻塞）

SessionEvent 的旧 `type:'error'` 生产/消费正则在现行 `packages/core/src`、`packages/demo-runtime/src`、`apps/desktop/src` 为 **0 命中**，死分支移除成立；core `replaySession` 已记录 `scenarioFailure`，`RealS3RunResult.status` 也诚实加宽为 `failed`。

但全仓消费图仍有两处遗漏：

- `apps/desktop/src/protocol/client.ts#projectSession` 没有 `scenario_failed` case，落入 default；
- `apps/desktop/src/demo/client.ts#phaseFor` 只把 `step_failed` 判为 failed，不识别 `scenario_failed`。

运行时向 `projectSession(EMPTY_SESSION, scenario_failed(runtime_limit))` 注入合法事件后，结果仍为 `failures:[]`、`completed:false`，只推进 `lastSeq`，失败终态和原因被丢弃。因此“所有消费者（replaySession 等）已同步”不成立。ADR 已把该事件定义为场景失败终态，修复不需要新增契约判断；应同步投影/phase 与相应反例测试。

### 5. 架构裁定落点与最终判定

目标 SPEC 实际只有两处字面 `[需架构拍板]`；第三项“跨 resume 累计预算”已经写成已知边界但未带该标记。验收按 `f4f06a6` 唯一就绪图把三处统一补成明确裁定留痕：

1. 跨 resume 累计预算：单机单写者 MVP 的已知边界，本单不实现；
2. 软限：`onSoftLimitWarning` callback 形态照准，不进 SessionEvent；
3. `ArtifactEnvelope`：延后至 `LEGAL-S3-BINDING-1`，体量过大时拆 `WORK-STORE-2`。

这三项不构成本次阻塞，也未更新 `docs/status/current.md`。本验收没有发现需要另立新语义的契约问题；B1/B2 都是现行 Accepted ADR 已能直接判定的实现偏差。

> **最终判定：WORK-STORE-1 不放行 ❌。** 复验前至少须：①把 Turn terminal durable barrier 移到 artifact JSON/schema/citation 解析之前，并以真实顺序反例锁定；②同步 desktop `scenario_failed` projection/phase 消费及反例。修复后须在新验收轮重跑全量门、a–g 变异与 demo 基线等价；不得据本报告更新能力成熟度或 `docs/status/current.md`。

## WORK-STORE-1 聚焦复验（WORK-STORE-1-FIX-REACCEPT，2026-07-16）

- **验收角色**：未参与 WORK-STORE-1-FIX 实现的独立验收会话；本轮只复验前轮报告点名的 B1/B2 两项阻塞及指定不回退抽样，不重跑前轮已成立的完整审计矩阵。
- **验收对象**：独立 clean worktree `/Users/lesprivilege/Projects/Courtwork-work-store-1-fix-accept-2be3e72`，detached `HEAD 2be3e72192af4ad3ec4c33dae4e252116e86e81e`。`79d583d..2be3e72` 实际为 **7 文件**，正是 `ddb6a5f`、`ad05d88`、`da911a9` 修复链及其 SPEC/测试留痕；无 envelope 格式、store 接口、阈值、lockfile 或 `docs/status/current.md` 触碰。
- **仓库事实差异**：验收开始时共享 `main` 为 `2be3e72`；验收期间其他会话将共享主树前进至 `31123fc`。本节全部证据固定来自上述 detached `2be3e72`，未使用后继主树，也未 checkout、stash 或运行 `git worktree prune`。

### 1. 环境、B1 与写次数

- `pnpm install --frozen-lockfile`：14 workspace、1047 packages，lockfile 无改写；实现与临时突变还原后，除本报告追加外无工作树改动。
- B1 现场重放 schema parse 反例：观测到 `barrierCountsAtParse=[3]`，暂停 leg 实测 `commitCount=4`。这证明 `runWorkTurn` 返回后的 Turn terminal 屏障先于 JSON/schema 解析，且 artifact 没有新增一次 CAS。
- 对照 `WORK-STORE-MEASURE` 实跑：屏障最小模型仍为 **6 次 CAS/场景**（per-mutation 上界 28）；本轮 4 次是单 artifact、在确认门暂停的 leg 计数，与归并目标一致。
- 注入指定回退：移除 `runWorkTurn` 返回后的屏障并把屏障挪回 `artifact_produced` append 后；新 B1 回归实测 **1 failed / 46 skipped**，失败值为 `expected 2 to be greater than or equal to 3`。突变已还原；最终 B1 定向测试 **1/1** 通过。

### 2. B2 与全仓 SessionEvent 消费审计

- `projectSession(EMPTY_SESSION, scenario_failed(runtime_limit))` 的回归测试实测投影含 `{ reason: 'runtime_limit', message }`，且 `completed=false`；`phaseFor([progress, scenario_failed])` 实测为 `'failed'`。desktop 两个定向文件共 **11/11** 通过。
- 分别注入回退并观察变红：删除 `projectSession` 的 `scenario_failed` case 得 **1 failed / 7 skipped**（`scenarioFailure` 变 `undefined`）；删除 `phaseFor` 的场景失败判定得 **1 failed / 2 skipped**（错误回到 `'running'`）。两处均已还原。
- 验收者重新 grep 全仓生产消费点：`packages/core/src/events/event-log.ts#replaySession` 已处理 `scenario_failed`；desktop 的 `projectSession` 与 `phaseFor` 已处理；`work-state-store.ts#interruptedTurns` 只处理 `turn_linked` 与 Turn terminal 的中断关系，demo-runtime 脚本只做 artifact/黄金字段提取，不是场景终态投影。除上述已修复两点外，未发现第三处同类遗漏。

### 3. 指定不回退抽样

| 抽样 | 反例实测 |
|---|---|
| `turn_linked` 屏障 mutation | 删除 provider 前屏障后，`providerSawDurableTurnLink=false`，**1 failed / 46 skipped**；还原后绿 |
| 并发 CAS 败者 | 将 in-memory `expectedVersion` 守卫改为恒不触发，两例均错误 resolve，**2 failed / 9 skipped**；还原后绿 |
| kill-9 崩溃窗口 | 临时将真实 SIGKILL 试验设为 10 轮并输出计数：`trials=10, killed=10, completeCount=10, torn=0`；还原测试默认值 |
| browser bundle | `work-protocol.browser.test.ts` **4/4** 通过；递归 runtime graph 与真实 Vite consumer 均无 `node:*` |

### 4. demo/golden 字节与门禁

- `demo:s3`：golden PASS，`redline.docx` **39,651 bytes**，预埋考点 **7/7**，事件骨架 **9** 项，risk-01–06 applied、risk-07 `locator_not_found`。
- `demo:legal`：golden PASS，`redline.docx` **4,606 bytes**，**11/11** claims resolved，out-of-coverage 0，**7 confirmed + 1 rejected**，事件骨架 **16** 项。
- 与独立 `79d583d` 基线树重跑并逐字节对照：`s3-assembly.golden.txt` SHA-256 均为 `0047e71264f6ddb6aa25cf5ceb10aca7b4a0bd7aee913b9630bb8cafb79bcd07`；`assembled-request.golden.txt` SHA-256 均为 `43fda441828a5b76871c98a6f07451a1eea002a3c480af7c8a209210b3831759`；S3/Legal `revision-instruction-set.json` 均 `cmp` 相同；两条 docx 的主要 OOXML parts 逐字节相同，且两档 `unzip -t` 均无错。
- `pnpm -r build`：**13/14 workspace projects** 全绿，desktop **3540 modules transformed**；仅既有动态导入/chunk-size advisory。
- `pnpm lint`：exit 0，零 error。
- `pnpm test`：**139 files / 1204 tests passed**。

### 5. 复验裁决

**WORK-STORE-1 放行 ✅。** B1 的 terminal durable barrier 已在 artifact 解析前成立，且迁移没有增加暂停 leg 的 CAS 次数；B2 的两个 desktop `scenario_failed` 消费点已补齐，全仓 grep 未发现第三处同类遗漏；指定的 turn-link/CAS/kill-9/browser 抽样均保持前轮结论。放行仅覆盖 `2be3e72` 中 WORK-STORE-1-FIX 的实现与本节证据，不升级 `docs/status/current.md` 的能力成熟度，不扩张 envelope schema、store 接口、阈值或 Work live 装配边界。

## PROJECTION-RESUME-1 獨立驗收（2026-07-17）

- **驗收角色**：未參與實現的獨立驗收會話；不採信實現自述，本節全部數字均來自隔離樹親手復跑。
- **驗收座標**：隔離 worktree `/Users/lesprivilege/Projects/Courtwork-projection-resume-1-accept`，驗收分支 `accept/projection-resume-1`；實現證據 SHA `2f6b43c3e9f55bf2e1221e39e26212fd31f1da9a`，基線及當前 `main` 均為 `0db350c0accbd2514bec407bd7c4d15312a813e0`。`git rebase main` 回報 up to date。
- **裁決：PROJECTION-RESUME-1 放行 ✅。** 純 core 編譯規則、缺省字節相容、三態語義、歸併與窄接線均成立；未發現實現級或契約級阻塞，驗收期間未修改產品實現。

### 1. 觸碰面、文字完整性與複雜度

`git diff --stat 0db350c..2f6b43c` 為 **8 files / 406 insertions / 1 deletion**，逐檔只有：

1. `packages/core/SPEC.md`
2. `packages/core/src/assembly/assemble.test.ts`
3. `packages/core/src/assembly/segments.test.ts`
4. `packages/core/src/assembly/segments.ts`
5. `packages/core/src/scenario-executor/executor.test.ts`
6. `packages/core/src/scenario-executor/executor.ts`
7. `packages/core/src/scenario-executor/pending-projection.test.ts`
8. `packages/core/src/scenario-executor/pending-projection.ts`

`packages/schemas`、`packages/provider`、`apps/desktop`、事件類型與 work envelope 均零差異；沒有 package manifest、lockfile、ADR port 或 `docs/status/current.md` 變更。`--numstat` 八行均為文字數字，`git diff --binary` 無 binary patch；逐檔 NUL 掃描零命中，`file` 均判為 UTF-8 text，未重現實現過程曾混入裸 NUL 的事故。

SPEC 的「為何非加不可」與來源調研一致：唯一誠實性缺口是續行投影不能區分「曾失敗待重試」與「從未開始」。新增物限於 core 內可選輸入載體、既有事件的純歸併及確定性編譯規則；無新事件、schema、envelope、wire 或 LLM 摘要概念。`interruptedSteps`/`awaitingConfirmation` 的生產供給仍明記為窄，沒有宣稱已全接線。

### 2. 缺省字節相容與穩定前綴

- 既有 `assembled-request.golden.txt` 在提交 diff 中零觸碰；基線與尖端 SHA-256 同為 `43fda441828a5b76871c98a6f07451a1eea002a3c480af7c8a209210b3831759`。
- `segments.test.ts` 的缺省例證明不傳 `pending` 時輸出仍逐字為 `[續行投影 v5]\n■ 未決確認：確認清單`，子節整體缺席；既有 golden 未重鑄且全量綠，構成機器字節證明。
- `assemble.test.ts` 親跑證明攜/不攜 pending 的前三段 `id/body` 逐字相同，且新子節只出現在第四段 projection；剝離編譯實現後此例在第四段標頭斷言變紅。

### 3. 獨立紅證與穩定性

以具名 stash 隔離驗收用剝離差異：保留新增測試及最小型別/空 derivation 骨架，移除三態編譯、失敗歸併與 executor 注入，使紅色落在行為斷言而非缺符號編譯錯。實測：

| 分層紅證 | 剝離實現後結果 |
|---|---|
| 三態字節、態不混淆、retryable、中斷勝出、空失敗三態 | **5 failed / 11 skipped** |
| 穩定前綴且子節只進第四段 | **1 failed / 8 skipped** |
| model/tool 最新失敗歸併 | **2 failed / 2 skipped** |
| executor 下一次 `systemPrompt` 攜子節 | **1 failed / 47 skipped** |

恢復實現並刪除該 stash 後，四個相關檔合跑 **77/77**；另在剝離前連跑三次均為 **77/77**，無偶發。

### 4. 反例與語義咬合

- 三態 exact block 同時鎖定等待確認、失敗的 `reason/attempt`、從未開始及工具失敗行；同輸入兩次輸出深等/字節相同，禁模型摘要偷換。
- 態混淆測試雙向鎖定：失敗步不得寫成從未開始，從未開始步不得寫成失敗；已落格且未停門的步不得重列。
- `retryable=false` 明示「不可自動重試」；驗收手動刪除此字節後，定向 **1 failed / 15 skipped**。
- 中斷是較晚事實，必須壓過同步的早先失敗且明示新 attempt 身份；驗收手動令 interrupted lookup 失效後，輸出錯退為早先 `timeout`，定向 **1 failed / 15 skipped**。
- model/tool 歸併按 `(stepId, artifactType)` / `toolId` 取最新一條；reason、retryable、attempt 均在斷言中，散文 message 不入投影。

### 5. 誠實登記與生產接線

`derivePendingProjection` 只從既有 `step_failed` 歸併模型級與工具級失敗，`interruptedSteps` 恒回空；中斷真源仍是持有 Turn journal 終態的調用方經可選槽位供給。驗收另以只有 `turn_linked`、沒有 `artifact_produced` 的引語修復窗口事件手工呼叫，結果為：

```json
{"failedModelSteps":[],"failedToolSteps":[],"interruptedSteps":[]}
```

因此不會把 attempt-2 組裝窗口誤判成中斷。executor 接線只在既有 `generateOnce` 組裝位傳入 `derivePendingProjection(deps.eventLog.list())`：工具級失敗可在下一次同流程生成即刻進 prompt；模型級失敗在其事件已隨續行/水合賬本帶入時生效。兩條分別由 executor 定向測試與 model 歸併測試實跑覆蓋；SPEC 沒有把 interrupted/awaiting 的後續跨窗供給冒充成已完成。

### 6. 合併樹全量門與 desktop 豁免

在 `main @ 0db350c` 的合併樹實跑：

- `pnpm -r build`：**13/14 workspace projects** 全綠；desktop Vite **3574 modules transformed**，只有既有 chunk-size advisory。
- `pnpm lint`：exit 0。
- `pnpm test -- --reporter=dot`：**143 files / 1235 tests passed**。
- 提交 diff 新增 `it(...)` 恰為 **13**，與基線 **1222 + 13 = 1235** 完全相合。
- `git diff main..HEAD -- apps/desktop` 為空；`apps/desktop/scripts/assert-test-count.mjs` 與 main 逐字相同，desktop floor **275** 未動，符合零 desktop 觸碰的 e2e 豁免條款。

### 7. 復跑命令

```text
git diff --stat 0db350c..2f6b43c
git diff --numstat 0db350c..2f6b43c
git diff --binary 0db350c..2f6b43c
git diff --check 0db350c..2f6b43c
pnpm install --frozen-lockfile
pnpm exec vitest run --root . packages/core/src/assembly/assemble.test.ts packages/core/src/assembly/segments.test.ts packages/core/src/scenario-executor/pending-projection.test.ts packages/core/src/scenario-executor/executor.test.ts --reporter=dot
git rebase main
pnpm -r build
pnpm lint
pnpm test -- --reporter=dot
```

本驗收未更新 `docs/status/current.md`，未推送、未 prune；實現 worktree 與 PILOT-LIVE-1 worktree 全程未觸碰。

## RELEASE-VERIFY-1 · DEBT-CLEAR-1 + DEBT-GATE-LABEL-1 独立验收驳回（2026-07-20）

- **验收角色**：未参与两票实现的独立验收会话；只在独立 clone 读码与实跑，未修改产品实现。
- **精确坐标**：受验 SHA `5f8fa7b40d7d5afe93d5a1e2e714e3191560a562`；独立 clone `/tmp/courtwork-accept-debt.ZfiZk2/repo`。交付称“三枝均基于 `86b2282`”，但 Git 实证本枝的直接父链为 `a49db9c → 6e95928 → 5f8fa7b`，`git merge-base 86b2282 5f8fa7b` 亦为 `a49db9c097a75ead5d7344c996c44e8de26220e8`，不是 `86b2282`；本报告按实际提交图验收并登记该坐标差异。
- **裁决：驳回 ❌。** 阻塞项是本票新增 SPEC 的现行宣称与实现不一致，违反 `docs/engineering/workflow.md` 验收固定项「自述与实现逐条对照」。未进入合并、部署或全链收束。

### 1. 阻塞项与最小复现

**B1 · 本票 SPEC 把四种不同删除判据误写成同一组判据。** `packages/core/SPEC.md:556-565` 的本票现行节先宣称四项“共用同一判据：零供给方 + 结构性不可达”，但其紧随表格与源码实际分别是：

- `ConfirmationStore.take()`：零生产调用方；
- `ScenarioExecutorDeps.onTurnEvent`：零供给方；
- `pendingGateLabels`：executor 唯一供给且恒空，并由生成/未消费 pending 互斥证明结构不可达；
- 2 个导出、9 个采集脚本、死配置和 `newLine`：零消费方或零外部引用。

只有 `pendingGateLabels` 同时具有“结构性不可达”的执行模型证明；`take()`、普通死导出/脚本/字符串并没有该判据，且不需要伪造该判据才能安全删除。复现：

```text
nl -ba packages/core/SPEC.md | sed -n '556,565p'
git grep -n -E '\.take\(|take\(requestId|take:|onTurnEvent|pendingGateLabels' a49db9c -- ':!*.md' ':!archive/**'
git grep -n -E '\.take\(|take\(requestId|take:|onTurnEvent|pendingGateLabels' 5f8fa7b -- ':!*.md' ':!archive/**'
```

基线命中显示 `take` 为接口 + 三处实现 + dev 转发/自身测试，`onTurnEvent` 为声明与转发，只有 `pendingGateLabels` 由 executor 恒传 `[]`；tip 产品码中前三者均零命中（`pendingGateLabels` 只余解释性注释）。该总括不是措辞偏好，而是本票“主要资产”的前提叙述失真。

**B2 · 同一现行 SPEC 的 PROJECTION-RESUME 设计节仍以已删除结构作现在时坐标。** `packages/core/SPEC.md:35` 仍称三态子节“紧跟 `pendingGateLabels` 行之后”，`:37` 仍称“与 `pendingGateLabels` 生产恒 `[]` 同先例”；实际 `buildProjectionSegment` 已无该字段与该行。后文新节虽然说明退役，但没有改写这两条现行设计声明，导致同一权威文件内部互斥。复现：

```text
nl -ba packages/core/SPEC.md | sed -n '32,38p;529,579p'
rg -n 'pendingGateLabels' packages/core/src packages/core/SPEC.md
```

修复边界只应是文档回炉：按逐项真实判据改写总括，并把旧设计坐标改成删除后的现行结构；不得借机改契约或产品实现。回炉后须由另一独立验收会话复核。

### 2. 已坐实且不构成驳回的实现面

- `take()` 接口成员、in-memory/file/work-state 三实现及 measure dev 转发同步删除；墓碑用例只把 destructive `take` 改为 `peek + consume`，仍逐字断言 tombstone 不含 `TOP-SECRET-ARTIFACT`/`secret-file`、键仅 `requestId/version`，并模拟 marker 已提交而旧 pending 文件尚在的崩溃窗口。
- `onTurnEvent` 声明、转发与失效 `TurnEvent` import 同步删除；基线无任何供给方。
- `SectionComposition` 删除后 `.visual-composition-section` 同批清理；`isImplementedVisualBlueprint`、`newLine` 与 9 个 `capture-*-audit.mjs` 在基线均无生产消费或外部脚本引用。
- `apps/desktop/package.json` 只保留 `lint:thinking → assert-process-trace.mjs`，而 `test:e2e` 仍直接调用 `node scripts/assert-process-trace.mjs`，没有经被删别名间接调用。
- 两份 golden 数据在实际父基线 `a49db9c` 与受验 tip 的 SHA-256 分别恒为 `43fda441828a5b76871c98a6f07451a1eea002a3c480af7c8a209210b3831759`、`0047e71264f6ddb6aa25cf5ceb10aca7b4a0bd7aee913b9630bb8cafb79bcd07`；`git diff --exit-code a49db9c..5f8fa7b -- <golden>` 两档均 exit 0。
- 生成/停门互斥读码成立：`pauseAt` 保存 pending 后返回 paused；`produceSequence` 命中 gate 即返回；`resumeScenario` 在续 `produceSequence` 前先 `consume`。`awaitingConfirmation` 则仍可由 `ProjectionPendingInput` 调用方提供，`segments.test.ts` 的三态合成输入实际渲染“等待确认”，因此“可达性是保留判据、真源位置解释生产供给为何为空”的实现事实成立。

### 3. 独立实跑、突变红证与恢复

```text
pnpm install --frozen-lockfile
# exit 0；14 workspace，1047 packages

pnpm -r build
# exit 0；13/14 workspace projects，desktop 3580 modules transformed

pnpm exec vitest run --root . \
  packages/core/src/session/confirmation-store.test.ts \
  packages/core/src/assembly/segments.test.ts \
  packages/core/src/assembly/assemble.test.ts \
  packages/core/src/scenario-executor/pending-projection.test.ts \
  packages/core/src/scenario-executor/executor.test.ts \
  packages/demo-runtime/src/acceptance/s3-assembly-golden.test.ts --reporter=dot
# exit 0；6 files / 90 tests passed
```

两项临时反例均只用于验收，随后逐字还原：

1. 去掉 file confirmation `peek()` 的两处 tombstone 遮蔽检查：墓碑崩溃窗口用例 **1 failed / 9 skipped，exit 1**，旧秘密载荷错误复现；还原后通过。
2. 令 `awaitingConfirmation` 分支不可达：三态 golden **1 failed / 15 skipped，exit 1**，精确缺失“产出清单：等待确认”；还原后通过。

最终恢复核验：

```text
git diff -- packages/core/src/session/confirmation-store-file.ts packages/core/src/assembly/segments.ts
# exit 0，零差异
pnpm exec vitest run --root . packages/core/src/session/confirmation-store.test.ts \
  packages/core/src/assembly/segments.test.ts \
  -t 'writes a payload-free tombstone|三态同框字节 golden' --reporter=dot
# exit 0；2 passed / 24 skipped
```

fresh clone 首次在 build 前直接运行六文件 Vitest 曾因 workspace `dist` 尚不存在出现 4 个 package-entry resolve suite error（另 2 files / 14 tests passed）；这是验收命令前置顺序错误，不是产品断言红，随后先 `pnpm -r build` 并原样重跑得到上述 90/90。为避免把错误调用隐去，本报告显式登记。

### 4. 停止点

发现 B1/B2 后按 fail-closed 停止，没有继续运行 `pnpm lint`、root `pnpm test`、完整 desktop 静态门或 Playwright；因此不采信实现提交自述中的“148 files / 1261 tests、36 道门、floor 323”为验收数字。已知 `material-actions` 零单测与 hover 负载 flaky 均未用于本次裁决，也未代修。验收只追加本报告，未改 `SPEC.md`、源码、测试、`current.md`、归档或门常量；未合并、未 push、未部署。
