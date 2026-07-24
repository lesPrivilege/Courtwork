# MD-CONVERGE-1+ 独立验收（2026-07-20，首轮驳回）

- **裁决：驳回，不放行 `impl/md-converge-1 @ 32d2688`。** 实现基线 `bd9a550`；验收在独立 clone `/tmp/courtwork-md-accept.piYVXm`、分支 `accept/md-converge-1-32d2688` 完成，未在共享主仓 checkout/stash，突变探针均已逐项还原且未留下产品实现改动。固定项「自述与实现逐条对照」发现现行 SPEC 与测试自述仍和实现/实测冲突；按 RELEASE-VERIFY-1 fail-closed，本票不得合并，视觉实测、完整 E2E 与部署链未继续。
- **架构已裁补记：** legacy 语义兼容层维持旧行为并转为常设；`32d2688` 的 SPEC 提案区仍写「开放/临时件」属于提交时点如实状态，本验收按既定裁决执行，不重裁语义。兼容层本身读码与突变成立：现值 **44/44 passed**；旁路 `unwrapSetext` 与 `truncateRaggedTable` 后精确 **2 failed / 42 passed**，只有「Setext 仍拆段落+hr」和「不齐表格止步、残行回段落」两例翻红；还原后 **44/44 passed**。

## 阻断项与复现坐标

1. **[阻断] `CHAT-MD-TABLE-1` 的现行缺口表仍在陈述退役实现，D3“已知边界③删除”未真正收口。** `apps/desktop/SPEC.md` 的 MD-CONVERGE 节已写 `<ol start>` 落地、边界③删除，旧边界清单第 3 项也有删除线记账；但同文件「现渲染缺口清点」仍以现在时声称「现渲染器仍是零依赖单层解析器」，逐项声称嵌套、引用、链接、斜体、删除线、任务清单不支持，并在 C 总表继续列 `13. 有序列表起始数字不保留（边界③，pre-existing）`。实现 `ChatMarkdown.tsx` 的 `renderBlock` 明确输出 `<ol start={node.start}>`，定向用例对 `3.` 实测 `start="3"`。复现：`nl -ba apps/desktop/SPEC.md | sed -n '143,172p'` 对照 `nl -ba apps/desktop/src/chat/ChatMarkdown.tsx | sed -n '251,269p'`。这不是历史沿革措辞，而是被标题定义为“现渲染”的 active 事实表，违反本单指定的 D3 与三条文档失真复核。
2. **[阻断] 测试名称与其断言逐字相反。** `chat-markdown.test.ts` 用例名为「起始为 1 时不写冗余 start」，下一行却断言 `getAttribute('start') === '1'`；实现也无省略 1 的分支。复现：`nl -ba apps/desktop/src/chat/chat-markdown.test.ts | sed -n '317,325p'`。测试虽绿，但只能证明属性在场，不能证明标题所宣称的“不写”；命中工作流固定项“门/测试自述也是宣称”。
3. **[阻断] 渲染预算门的突变自述与当前真实失败机制不符。** SPEC 声称短路守卫后组件例在 5131ms 由 `<2000ms` 时间断言咬住；测试内注释仍称会同步冻结 `>20s`。本 clone 短路 `plainFallbackReason` 后确为预期总数 **7 failed / 37 passed**，但组件例运行 **4938ms** 后先在递归 `renderPhrasing` 抛 `RangeError: Maximum call stack size exceeded`，时间断言未执行。复现：临时在 `plainFallbackReason` 首行 `return null`，运行 `pnpm --filter @courtwork/desktop exec vitest run src/chat/chat-markdown.test.ts --reporter=verbose`；撤除临时改动后 44/44 复绿。守卫有效与“7 条会红”的结论成立，但失败机制自述不成立，必须按实测纠正，不能把未到达的时间断言记为红证。
4. **[阻断] 行号引用失真仍残留。** 同一测试文件原始 HTML 用例仍写 `SPEC.md:70`，而本单 SPEC 明称相关引用已“由行号改为节名”、工作流又明确现行文档引码用符号/节锚而不用行号。复现：`nl -ba apps/desktop/src/chat/chat-markdown.test.ts | sed -n '328,345p'`；当前 `SPEC.md:70` 已是渲染预算诚实边界，并非 HTML 安全边界。

## 已完成证据（驳回前止步）

| 项目 | 独立实跑结果 |
|---|---|
| 安装 | `pnpm install --frozen-lockfile --offline`：1047 packages，exit 0 |
| 定向现值 | `vitest run src/chat/chat-markdown.test.ts`：**1 file / 44 tests passed** |
| 兼容层可红性 | 旁路两兼容函数：**2 failed / 42 passed**；还原 44/44 |
| 两层预算门可红性 | 短路 `plainFallbackReason`：**7 failed / 37 passed**；还原 44/44 |
| 解析器稳健性/边界输入 | 子进程 + `alarm`：`n=8000` 在 1s 内未返回，alarm 终止 `exit 142`；`n=16000` 在 15s 限额内抛 `RangeError`，探针 `exit 91`；管道退出码由 zsh `pipestatus[1]` 取原命令，未吞码 |
| 阈值两侧 | 32,768 字符（交替文本）放行、32,769 返回 `length`；连续 256 放行、257 返回 `run`；`_`、`[` 的 257 游程同返 `run`；降级态 `data-plain-fallback`、显式说明和全文逐字包含均成立 |
| 上限内残余 | 32 KiB、最大游程 256 的边界输入本机 parse **125.0ms**、组件静态渲染 **152.1ms**；只记“已测量、有界残余”，不宣称已解决，也不要求与实现者约 553ms 的不同机器测值逐毫秒相等 |
| 构建与 floor | clean clone 首次 `--list` 因 workspace `dist` 尚未构建而报模块缺失（前置不足，非产品结果）；随后 `pnpm -r build` **13/14 workspace PASS**，再跑 `assert-test-count.mjs` 得 **327 tests / floor 327 PASS** |

读码已确认五项扩围映射、链接落 `span.md-link` 而非 `<a>`、原始 HTML/未支持节点走原文切片，以及松散/紧凑列表与 `<ol start>` 的实现落点；但因上述固定项阻断，未把读码替代为剩余真渲判例，也未继续完整 Playwright。回炉要求仅为纠正这些宣称/现行表并保留现有行为与红证；验收会话不代修。

---

# SKIN-B4 · 记号批独立验收（2026-07-19）

- **裁决：放行。**对象 `impl/skin-b4 @ 758553a`，基线 `4dde0f0`；验收在独立 clean worktree 完成。`758553a` 非 main 祖先，已对 `main @ b879d84` 做无冲突 trial merge（tree `989606538e3a00aecb5d87324dbcb5e1e4e52ea9`），合并树 build/lint/list 与记号、线级关键门通过。
- **两上三不上逐件复核**：鱼尾落在 `.reader-pane h3`，落定章仅 `disposition === 'confirmed'` 的风险详情卡；界行/圈点/骑缝各在 `UNCONSUMED` 有理由登记。`assert-schema-parts` 实测为 5 枚单源、2 消费、3 登记；逐一接线登记件、无数据移章、无数据线型均 `exit 1`。
- **视觉与动效**：亲摄鱼尾与位移后的落定章；章在 52px、正文右上可见，`use` 计算态 `vector-effect: non-scaling-stroke`。`--motion-seal` 的声明/消费/消费者三事实唯一；常态 `seal-press`，reduce 计算态 `none`。删除显式停摆及放宽驳回钤印均使对应 e2e 变红，复位复绿。
- **C-4 / 欠账**：ⓐ token mutation 使消费记号跟随，阴性 token 不动；ⓑ 壳内当前无第二宗，前向红卫在场并登记 B5 的「替换为真双主题几何断言、不得放宽」出口。`PartyEdge.factTier` 注入准确点名图谱欠账、复位恢复绿；`TimelineEvent.actor` 同样触发。该项不把 B5 未实施误报为 B4 缺陷。
- **回归与清账**：线级普查实得 **71→69 / 186→184**；首段 kebab 属性、icon 门豁免收窄及 workbench 朱/绿断言已在全链中通过。图标重导出可复现且重跑零 diff；128px 旧退役像素清零，32px 仅余一枚 alpha=14 的边缘混色（非旧源色）；应用图标源稿与重导出结果一致。
- **反例与全门**：12 条票面反例逐条均红后复绿（包括仪式二消费者、reduce、三件未消费、落定数据、actor/factTier、无数据线型、失参照、件库纯度、JSX kebab、TSX 内联 SVG、驳回钤印）。`pnpm -r build`、`pnpm lint`、root Vitest **148 files / 1261 tests**、静态链、`test:e2e:list` **311** 与隔离端口完整 Playwright **311** 均实跑通过。

---

# AUDIT-SEAL-2 独立验收（2026-07-18）

- **验收角色**：未参与实现的独立验收会话；不采信实现自述，本节全部数字均来自隔离 worktree 亲手复跑。
- **验收坐标**：worktree `/Users/lesprivilege/Projects/Courtwork-audit-seal-2-3`，验收即在 `impl/audit-seal-2-3` 分支进行；实现 SHA `7c960f0`（rebase 后 `4842feb`），基线 `main @ 92d1fd4`。验收期间 main 前进一条纯 docs 提交（`146003a`，只动 `implementation-readiness.md`），`git rebase main` 干净重放、零冲突。
- **裁决：AUDIT-SEAL-2 放行 ✅。** 审计单门残余四项（credential/providerConnection 双门、两 demo 模块 caseId 双门、`workContextSegment` 死参数清理、rust overwrite fail-closed 回归覆盖）均独立复核成立，未发现实现级或契约级问题，验收期间未修改产品实现。

### 1. credential/providerConnection 两 hook 双门

- 生产构建亲自验证：`pnpm --filter @courtwork/desktop build` 后对 `dist/**` 全量 grep `installCredentialTestHooks`/`installProviderConnectionTestHooks` 两函数名与其暴露的 `__courtworkCredentials`/`__courtworkProviderConnection` 两个 window 全局名，**四项均零命中**（Vite 对 `import.meta.env.DEV` 常量分支的死码消除生效）。
- `assert-credential-contracts.mjs` 反例覈真：`git checkout <基线> -- apps/desktop/src/main.tsx` 撤回为修复前的无条件调用，脚本立即报两条违规（`必须只在 DEV+E2E 双门内安装`）、`exit 1`；`git checkout HEAD` 归位后重跑 `exit 0`，文案「AUDIT-SEAL-2 credential hooks and dead-parameter boundaries passed」。

### 2. 两 demo 模块 case-real 红证

- `file-ops-demo.ts`（`createDemoFileOpsPlan`/`executeDemoPlan`/`undoDemoPlan`/`getDemoHostSnapshot`/`resetFileOpsDemo`）与 `legal-interaction.ts`（`ensureLegalDemoInteraction`/`resolveLegalDemoSource`）新增 `assertDemoCaseId`，复用既有 `isDemoCaseId`/`DEMO_CASE_ID`（`case/case-scope.ts`，CASE-ROOT-1 既有原语，零新概念）。所有调用点（`FileOpsPlanPanel.tsx`、`App.tsx`）同步改传 `caseId`，现场读码确认无遗漏。
- stash 隔离复现：`git checkout <基线> -- 两文件` 撤回（保留新测试 `file-ops-demo.test.ts`——新文件、`legal-interaction.test.ts` 新增例不变），跑 `vitest run`：**2 failed / 3 passed**，失败均为「expected [Function] to throw an error」——即修复前 `'case-real'` 被静默接受、从不拒绝，精确复现审计病灶。`git checkout HEAD` 归位后 **5/5 passed**。

### 3. `workContextSegment` 死参数清零 + Work 真链不回退

- `rg workContextSegment apps/desktop/src` 排除测试后仅剩三处：`App.tsx` 的 `handleComposerSend`（真实 Work 链，`selectedCase`/`caseBinding.kind==='grant'` 时构造并透传给 `sendChatTurn`）、`chat-client.ts` 的 `SendChatTurnOptions.workContextSegment`（六段组装契约，WORK-TURN-1 既有字段）、`work-context.ts` 的 `workContextSegmentFor` 本体——均是真链，非残留。`handleChatSend`/`submitChatContent` 的死参数与死透传已完全移除，`assert-credential-contracts.mjs` 静态锁二者签名。
- e2e 亲跑 `work-turn.spec.ts`：**3/3 passed**，含「H 案语境注入：Work 面自由输入携案根与材料清单；chat 面缺省不携（红证双向）」——真链两侧行为均未回归。

### 4. Rust `overwrite=true` 对 symlink/目录 fail-closed 回归覆盖

- 新增 `explicit_overwrite_refuses_a_symlink_and_preserves_its_target`/`explicit_overwrite_refuses_a_directory_and_preserves_it`，基线 `cargo test --lib explicit_overwrite`：**2/2 passed**。
- 亲跑 mutation：把 `atomic_write` 的 `overwrite=true` 分支实体类型判据从「必须是非符号链接的普通文件」放宽为「只要存在即放行」，重跑同两例：**2/2 failed**——symlink 例显示写入实际成功（覆盖穿透，`left: None` 即 `Wrote`）、目录例显示虽仍失败但退化为语义错误的 `Unavailable`（而非有意的 `OutOfScope`，因 OS 级 `rename` 到既存目录本身报错，但推理链已不是设计意图）。撤销 mutation 后 **2/2 passed** 复原，`git status` 归零。

### 5. 全量门（合并树，rebase 后）

| 门 | 结果 |
|---|---|
| `pnpm -r build` | PASS（13/14 workspace；仅既有 chunk-size 提示） |
| `pnpm lint` | PASS |
| root Vitest | **148 files / 1261 tests passed** |
| desktop Vitest | **59 files / 354 tests passed** |
| `cargo test --lib` | **69/69 passed** |
| `demo:s3` / `demo:legal` golden | 均 PASS |
| 完整 `test:e2e`（隔离端口，独立三轮） | 首轮曾有 1 例超时/悬停无关 flake（`global-verbs.spec.ts` 复制按钮 hover 用例，与本单零 diff 重叠；隔离单跑 3/3 与全量重跑均绿，判定为无关抖动非回归）；三轮完整链最终均 **290/290 passed**（2.7m/3.1m/2.9m） |

registry 契约零变更（`git diff <基线>..<实现尖端> -- packages/registry` 空）；本单不改 `docs/status/current.md`。

> **最终判定：放行 AUDIT-SEAL-2。** 四项审计单门残余均已补齐且不回退；SEAL-1 遗留的 rust fail-closed 覆盖率缺口（本轮④）已转正为固定回归测试。SEAL-3 报告见 `packages/tools/ACCEPTANCE.md`。

未更新 `docs/status/current.md`；未推送；未 prune。

---

# AUDIT-SEAL-1 · desktop 覆盖保护下沉验收

- **✅ 放行（2026-07-18）**：`scoped_write`/`write_case_output_docx_impl` 新增显式 `overwrite: bool`，既存文件默认拒绝（no-replace `hard_link` 提交）、`overwrite=true` 时对 symlink/目录仍 fail closed（验收亲写探针 3×2 确认，交付测试集本身缺此分支回归覆盖，已记录为非阻断跟进项）；三个显式写入 consumer（附件入库/授权探针/case_output）、`host-auth-port.ts`/`tauri-host-auth.ts`/`assert-host-auth-contracts.mjs` 均已随契约更新。App 层 sha256 二道核实仍在写入前生效；`pilot-case-upload.spec.ts` F 系列幂等/拒绝覆写断言隔离端口亲跑 3/3 不回退。desktop Vitest **352/352**、cargo **67/67**（含验收亲写反例复核）、完整 `test:e2e` 独立三轮 **290/290** 均在验收 worktree 内亲手复跑绿；floor 290 不动。详见 `packages/core/ACCEPTANCE.md` 的 AUDIT-SEAL-1 完整报告（含三层独立红证与放行闭集覈真）。

---

# ACCEPTANCE: WORK-TURN-2

日期：2026-07-18

角色：独立验收会话

对象：`impl/work-turn-2` tip `7e02229`（基线 `main @ 7a289c3`；验收开始时 `main` 尖端即为 `7a289c3`，`merge-base` 确认零需 rebase）。新 worktree `/Users/lesprivilege/Projects/Courtwork-accept-work-turn-2` 建 `accept/work-turn-2`。验收修复 `4faaad4`。

## 裁决

**✅ 放行 WORK-TURN-2（含一项 fix-by-acceptance 实现级小修）。**

面隔离、账本隔离（journal key 格式/fail-closed/逐案隔离/chat 零污染/chat 零案语境/demo 脚本化回放零回归）、组装分道（`packages/**` 零 diff、六段契约零触碰）、运行中语义（禁用+显式提示+不排队）、布局与残留门均成立。验收不采信实现自述：亲跑 stash 红证复现旧代码 pane 仍切至 `chat`；发现并修正一处实现级缺口（见下）；全量门在验收 worktree 内独立实跑绿。

## 缺陷发现与修复（fix-by-acceptance，经架构复核前置留痕）

**缺陷**：`workChatPending`/`workChatFlightRef`（Work 对话在途标记/单飞行锁）实现为组件级全局 `useState`/`useRef`，未按 caseId 分区——与本单同批新增、正确按 case 分区的 `workChatMessagesByCase`/`workTurnJournalStorageKey` 不一致。案 A 的 Work Turn 在途时切至案 B，案 B 的 composer 发送钮被跨案静默禁用（零 `disabledReason`、零可见理由，文本填入后仍 disabled），实质阻断案 B 发送。违反账本隔离验收项②「逐案隔离」与仓库不变量 4「静默降级零容忍」。定位：`App.tsx` 三处状态声明 + `handleComposerSend` 内五处读写，共 7 个站点。

**红证**：新增 `work-turn-2.spec.ts` 测例「案 A 的在途 Work Turn 不得阻塞案 B 的 composer」，用可控 stall 流（`started` 后挂起直到测试显式 release）令案 A 在途。首次断言顺序有误（`composer-send` 断言先于 `fill()`，任何 case 在空文本下都会 disabled，与缺陷无关）；改正为先填正文使 `canSend` 前提成立、再单独断言在途态后，`git stash` 两次隔离复核：
1. stash 至 `impl/work-turn-2` 未修复态：新例精确红于填正文后 `composer-send` 仍 `disabled`（非空文本假阳）。
2. 另将 `App.tsx` 单文件 checkout 回 `main`（本工单未落地前）复跑主隔离例：精确红于 `workspace[data-view-segment]` 实得 `chat`（期望 `work`），逐字印证 SPEC 根因叙述（`switchSegment('chat')`）。
两次 stash 均完整 `pop` 归位，其间 `git status`/内容逐次核对。

**修复**：`workChatPendingByCase: Record<caseId, boolean>` + `workChatFlightRef.current: Record<caseId, boolean>`，`handleComposerSend` 全部读写点改按 `workCaseId` 索引；渲染处新增派生 `workChatPending = workChatPendingByCase[selectedCaseId] ?? false`。零新概念——复用本单已确立的 by-case Record 范式；Chat 侧对等实现（`chatFlightRef`/`chatPending`）本就案无关，未受影响也未改动。`assert-test-count.mjs` floor 289→290；`SPEC.md` 留痕缺陷/红证/修复三段（`apps/desktop/SPEC.md` WORK-TURN-2 节新增「验收修复」小节）。

## 1. 面隔离

- e2e 亲跑：`work-turn-2.spec.ts` 主例断言 Work 发送后 `workspace[data-view-segment]` 恒 `work`、`work-chat-assistant-message` 可见；`pilot-entry.spec.ts`（A）、`pilot-case-upload.spec.ts`（F）、`work-turn.spec.ts`（H）均已改断言为留在 Work 面，随全量门通过。
- stash 红证：见上，复现旧代码 `data-view-segment` 精确红于 `chat`。
- 现场读码：`ChatAssistantMessage` 新增 `testIdPrefix` 区分 `chat`/`work-chat`；Work 对话气泡（`workChatMessages.map`）与 demo 场景 `ProcessTrace`/`TurnCard` 事件流插入同一 `conversation-scroll`（`App.tsx:2276-2437`，非自述、现场行号核实）。

## 2. 账本隔离（双向逐验）

- **①版本化单键 + fail-closed**：`workTurnJournalStorageKey(caseId)` 返回 `courtwork.work-chat.<caseId>.v1`，与 chat 共用同一 `createLocalStorageTurnJournalBackend(storage, key)`；`parseEnvelope`（含 invalid JSON / 未知字段 / 版本不符 / turnId 索引漂移等全部 `corrupt()` 分支）本单零改动、key 完全参数化，无 key 条件分支——现存「corrupt journal fails closed」等既有反例覆盖同一函数，按构造对新 key 同等成立。
- **②逐案隔离**：`workChatMessagesByCase`（消息投影）与 `workTurnClient`（`useMemo` 随 `selectedCaseId` 重建的独立 `TurnProtocolClient`）按构造隔离；`workChatPending`/`workChatFlightRef` 原未隔离（详见上节缺陷），验收修复后新增专项红证覆盖。
- **③chat 零 work 污染 + chat 零案语境**：`work-turn-2.spec.ts` 主例双向断言——work journal 写入 completed Turn 时，chat journal（`courtwork.turn-journal.v1`）逐字节等于发送前快照；切入 chat 发送后 `systemPrompt` 不含"案件语境"。`handleChatSend`（`App.tsx:698`）与本单零 diff，独立确认其未读取 case/work 状态。
- **④demo 案语义不回退**：demo 脚本化回放全链（`session.progress`/`TurnCard`/`ProcessTrace`/`workFixture.sessionRefFor`）与本单零 diff；`demo:s3`、`demo:legal` golden 均在验收 worktree PASS（39,651 / 4,606 bytes，7/7、11/11 考点，与历史记录同值）。**留痕（非缺陷，如实登记供产品侧知悉）**：demo 案 Work composer 在场景**未运行**时（开局前/完成后）的自由输入，已从旧「纯本地回显」（`setLocalMessages`）改为与非 demo 案同源的真实 `sendChatTurn` 请求——`handleComposerSend` 现无 `isDemoCase` 分支；`setLocalMessages` 调用点现场 grep 只余 chat-handoff（`routing-law.spec.ts` 覆盖）与 demo replay 重置两处，均与 composer 发送无关。核验 Chat 面对 demo 案历来无此守卫（`handleChatSend` 零 `isDemoCase` 判断，一贯对任意 case 真实发送），故本变化是 Work 面与 Chat 面能力对齐的自然结果；未发现被测试或文档锁定的反向承诺，不作为放行阻断。

## 3. 组装分道

`main..7e02229` 全部 16 个改动文件均在 `apps/desktop/{src,tests,scripts,SPEC.md}`（验收自身 fix-by-acceptance 提交同样只触及其中 4 个既有文件，文件集合不扩大）；`packages/**`、`src-tauri/**`、`docs/status/current.md` 零 diff（`git diff --stat` 现场核实）。`chat-client.ts`（六段 assembly 契约实现）与本单零 diff；`SendChatTurnOptions.workContextSegment` 为 WORK-TURN-1 H 既有字段，本单仅复用既有缝，未改契约签名。

## 4. 运行中语义

- `composer.spec.ts`「Work 场景运行中 composer 禁用并说明下一步，不排队」、`d1-case-scope.spec.ts`「案件 A 有 demo 状态 → 案件 B 零继承 → 回到 A 恢复 demo」运行中断言、`rp28.spec.ts` 均已从旧排队断言改为禁用 + `composer-disabled-reason`（"合同审查正在运行；等待当前步骤完成后再继续提问。"）断言，随全量门通过。
- `assert-ui-surface-contracts.mjs` 由 W5 queue marker 改为反向守卫（`queuedMessages`/`queued-message`/`queued-chip` 零出现），未开通态标记精确 6 项（原 ≥7），随门禁通过确认。
- 现场 grep 坐实 `handleComposerSend` 无任何 `setQueuedMessages`/队列相关代码路径残留。

## 5. 布局与残留门

- `pilot-layout.spec.ts` 全部既有断言（都开/仅左收/仅右收/双收/chat 段与 welcome 回归锁/右栏窄态目检）零 diff、随全量门通过——`conversation-canvas`/`chat-canvas` 与 `composer-stack`/`scene-strip` 居中基准未回归。
- residue 独立三轮亲跑：**22/22 × 3**（本单未新增 residue 谱；Work 画布对话区为纯内联插入、无新 overlay/portal，既有 17 行疊层清单枚举不变，故沿用既有门禁）。

## 6. 全量门（验收 worktree 内独立实跑）

| 门 | 结果 |
|---|---|
| `pnpm -r build` | PASS（13/14 workspace；仅既有 chunk-size 提示） |
| `pnpm lint` | PASS |
| root Vitest | **144 files / 1244 tests passed** |
| desktop Vitest | **58 files / 352 tests passed** |
| 完整 `test:e2e`，端口 `14207` | 全静态门链 PASS（含四设计门 neutral/elevation/signature/motion、voice 5/5 + 116 文件扫描、layout-converge、work-safe-case-id parity 等）；floor **290**；Playwright **290/290**（~2.4–2.8m，两轮） |
| residue 单独三轮，端口 `14207` | 各 **22/22**（43–44s/轮） |
| `demo:s3` golden | PASS（39,651 bytes，7/7 考点） |
| `demo:legal` golden | PASS（4,606 bytes，11/11 anchors） |

先在implementation worktree（`Courtwork-work-turn-2`，`impl/work-turn-2` 原树）完成上述发现、修复与首轮全量门实跑，随后按工程纪律要求的「clean worktree」补正——`git stash` 移出全部驗收改动、于新 `accept/work-turn-2` 分支+worktree 重新 `pnpm install` 并完整重跑同一套门禁（build/lint/root+desktop Vitest/完整 `test:e2e`/residue 三轮/两条 demo golden），两处worktree结果逐项一致；implementation worktree 已复原至 `impl/work-turn-2` 干净尖端，无遗留改动。

> **最终判定：放行 WORK-TURN-2。** 成立范围严格为 apps/desktop 内 Chat/Work 面隔离、journal 分账、组装复用既有缝、运行中禁用语义与布局/残留门不回退，含验收发现并修复的跨案在途状态隔离缺口。真机复验（Work 气泡与场景 trace 共存视觉、case-keyed localStorage 跨刷新、demo 案新真实请求路径的产品侧确认）仍待产品负责人执行，不据此宣称 external-validated。fix-by-acceptance 提交 `4faaad4` 待架构逐 diff 复核。

未更新 `docs/status/current.md`；未推送；未 prune 任何 worktree/分支。

---

# PROVIDER-STREAM-1 · desktop 显示边界验收

- **✅ 放行（2026-07-17）**：桌面 failure 显示已对纯英文技术栈、含单个中文的技术残文与正常中文归一报文完成三探针核验；原单中文字可穿透的洞已按「技术 marker 优先」收紧，含模型片段的 `InvalidResponse` 不会进入 UI 或 provider evidence。voice / work-live / parity 门、完整 E2E **287/287** 与 residue **22/22 × 3** 均在最终 rebase 树通过。详见 `packages/provider/ACCEPTANCE.md` 的 PROVIDER-STREAM-1 报告。

---

# ACCEPTANCE: WORK-TURN-1

日期：2026-07-17

角色：獨立驗收會話

對象：`impl/work-turn-1`（原基線 `main @ 7d7e55c`；原 G=`961398d`、H=`28e0a12`），於新 worktree `/Users/lesprivilege/Projects/Courtwork-accept-work-turn-1` 建 `accept/work-turn-1`；最終乾淨 rebase 至 `main @ 4370200` 後，G=`c4d12da`、H=`97d38ee`。驗收修復 `a014a16`。

## 裁決

**✅ 放行 WORK-TURN-1（含三項 fix-by-acceptance 實現級小修）。**

G 的 UUID 鑄號、Rust `safe_token` parity、存量非安全 id 原位容忍、grant/title 保全與產品語言引導成立；H 的可選尾段、缺省字節不變、四態純編譯、Work/chat 雙向供給、journal 不分家與重試已知邊界成立。驗收不採信實現自述，親跑脏 id、雙側 parity 漂移、未知宿主報文、絕對路徑材料、core/client/module/E2E mutation。

驗收發現並修正三個實現級缺口：① 原實作只有人工 parity mirror，沒有機器級同步防線；新增 `assert-work-safe-case-id-parity.mjs`，逐字鎖 TS 正則與 Rust 謂詞並接入 `test:e2e`；② 未知 Rust 技術報文原樣上拋，改在 TS 顯示邊界統一收斂為「發生了什麼＋下一步」產品語言；③ `workContextSegmentFor` 對畸形 path-shaped label/fileName 會裸送絕對路徑，改為只投影末級展示名。三項均不改 schema/wire、包公開出口、持久格式、依賴或 Rust 實作。

共享樹未 checkout；未更新 `docs/status/current.md`，未 push、未 prune。E2E 全程 `reuseExistingServer=false`，使用獨立埠 `17831–17873`。

## G · caseId 去標題化與存量容忍

- **鑄號與 Rust parity**：`mintCaseId()` 產出 `case-${randomUUID()}`，定向單測與 E2E 持久記錄均過安全語法。人工逐字符比對兩側：空／`.`／`..`／任意 `..` 子串／>128 bytes 均拒；唯一字符集皆為 ASCII alnum + `-_.`。原 H tip 與最終合併樹對 `apps/desktop/src-tauri` 均為 **0 行 diff**，`safe_token` 未放寬。
- **同步防線紅證**：先確認原樹無機器門；補門後分別把 Rust 放寬 `+`、把 TS 字符集放寬 `+`，兩次 `lint:work-safe-case-id` 均 exit 1，精確報相應側漂移；還原後 PASS。此門已進完整 `test:e2e`，不是只存在於驗收命令。
- **舊式脏 id**：`case-1752736000000-合成卷宗案` 單測判不安全；E2E 從持久 case-list 載入後，標題仍顯示、grant 仍可入庫，點場景得到 info 引導「新建案件並重新入庫材料」，零 revision panel、零「引用/token/InvalidRef/id」技術措辭。ASCII 舊 id 保持可運行。
- **顯示邊界**：已知 `Work 状态引用非法` 仍映射 `LEGACY_CASE_SCENARIO_COPY`；另注入未知 `WorkStateError::Io(/Users/alice/... generation=7)`，修前裸透紅，修後只見「案件進度暫時無法讀取或保存，請重新開始合同審查」，路徑／錯誤名／generation 均不出界。voice 門 PASS。
- **中文標題全鏈**：新建「合成卷宗案」→ grant 入庫 → 跑 S3 樁 turn → revision panel 顯示風險，定向 E2E **3/3 × 3 輪**；標題只作展示欄，持久 id 不含標題。

## H · workContextSegment 純組裝與供給邊界

- **core golden**：無段、只有 memory 的既有字節均逐字不變；有段時順序固定為 base → memory → work，memory-only 是 with-work 嚴格前綴，易變段靠尾。core mutation 忽略 work 段時精確 **2 failed / 8 passed**，還原後 10/10。
- **純編譯**：案根、材料清單／產品狀態與四態 `not_started/running/paused_review/recoverable` 各自恰一，互斥測試齊；同輸入兩次 byte-equal，零模型呼叫。注入 macOS `/Users/alice/...` 與 Windows `C:\\...` 材料／label 時修前 **1 failed** 且完整路徑出段，修後只留 `設備採購合同.md`／`公章頁.png`。
- **供給與 journal**：Work grant 面 request body 含案名與材料；切入 chat 面後第二次 request body 無案語境。驗收加固為 captured request 數先恰 1、後恰 2，避免讀上一 body 假綠。client mutation 丟第二參時精確 **1 failed / 6 passed**；Turn journal 原始持久字串斷言不含 `workContextSegment`，仍是同一 Chat Turn。
- **已知邊界核對**：`retryChatTurn` 只取配對 user 的已存 `content`，以三參 `submitChatContent(content,text,historyBase)` 重發，確實不重編 work 段；與 SPEC「失敗輪次重試復用已存 content、回 chat 缺省語義」一致，未宣稱重試具有活案語境。

## stash 紅證、計數與全量門

驗收先 stash 自身未提交修補，於 clean 實作 tip 逐項注入再完整恢復：core 忽略 work 段 **2 紅**；client 丟傳導 **1 紅**；刪 `case-id.ts`／`work-context.ts` 得 **2 failed suites**；E2E 三線抽 G 鑄號與 H 供給，兩條均紅在預期斷言。恢復後 core 10/10、desktop 定向 22/22、WORK-TURN E2E 3/3 各連跑三輪。

floor 留痕核對：合併樹原 floor 284；G +2 → 286；H +1 → **287**。`assert-test-count.mjs` 在正確 desktop cwd 親數 287，未降 floor。

| 門禁 | 隔離實跑結果 |
|---|---:|
| root Vitest | **143 files / 1239 tests passed** |
| `pnpm lint` | PASS |
| `pnpm -r build` | PASS（13/14 workspace；僅既有 Vite chunk warning） |
| 完整 `test:e2e` | rebase 前首輪 **286/287**（既有 `goal1 #39` onboarding click 30s timeout；本單 3/3、residue 22/22 均綠），換埠即完整重跑 **287/287**；rebase 至 `main @ 4370200` 後再完整實跑 **287/287 passed**（3.0m） |
| residue 專跑，單 worker、三獨立埠 | post-rebase **22/22 × 3**（44.0s / 44.3s / 44.0s；埠 17871/17872/17873） |
| work-live / voice / parity | 均 PASS；voice node tests **5/5** |

> **最終判定：放行 WORK-TURN-1。** 成立範圍嚴格為 G caseId 去標題化／存量原位容忍與 H L0 純組裝注入；不擴張至 L1 工具、L2 loop/steering、存量跨層改號或真機產品負責人復驗。

---

# ACCEPTANCE: PILOT-LIVE-2

日期：2026-07-17

角色：獨立驗收會話

對象：`impl/pilot-live-2`（基線 `main @ 3da7894`；原 F=`308fba1`、E=`3fa617b`），於隔離 worktree rebase 到 `main @ b616578` 後為 F=`80b34bc`、E=`a900764`；驗收修復 `ab85768`、`b69069c`。

## 裁決

**✅ 放行 PILOT-LIVE-2（含三項 fix-by-acceptance 實現級小修）。**

F 的 grant scope 寫入、material-ingress 原班入庫、DOM 即時可見、hash/provenance 復驗、同名雙徑與 A 正文必達均成立；E 的最新／歷史／在途三態及段落塊界成立，管道表格渲染未越權代建。驗收不採信實現自述，親自做寫失敗哨兵、越 scope 反例、兩項折疊 mutation 及 48px 視覺幾何反例。

驗收發現三個實現級缺陷並在本 worktree 前進式修正：① `running` assistant 原會搶走 latest 席位，使上一條完整回覆瞬時坍縮；② browser host stub 在 Node Vitest 無條件引用 `window`；③ 所謂固定 48px 遮罩實際只在完整段落後留 `23.9375px`，漸層仍壓到段落尾。修後新增在途專項用例，並把裁窗改為完整塊底後另留 48px fade band；不改契約、包、後端或持久語義。

隔離 worktree：`/private/tmp/courtwork-pilot-live-2-accept`，分支 `accept/pilot-live-2`；服務使用獨立埠 `19200–19214`。共享樹未 checkout；未更新 `docs/status/current.md`，未 push、未 prune。

## F · effect 紀律

- **寫只限 grant scope**：產品鏈仍為 `hostAuth.writeFile → host_write_file → write_in_grant`；`src-tauri` 零 diff。驗收臨時 Rust 反例以 `../outside` 呼叫 `write_in_grant`，實得 `OutOfScope` 且外部目標不存在，**1/1 passed**。另以 browser host 注入越 scope 寫，DOM 顯示「超出已授權文件夾範圍」，`material-item=0`。
- **無案／未綁定零寫入**：把 browser `writeFile` 預設改成必拋哨兵後，`chat-material` 3 例與 A 主例仍綠；純 chat 附件正文行為不變。相同哨兵下 F 同名同內容與同名異內容兩例亦綠，證明兩徑在寫入前由 `readSource` 主動判定，不是碰巧寫失敗。
- **賬可對**：F 主例親斷 DOM：上傳後卷宗材料行即時出現，且請求正文逐字含附件 marker。實作只新增一次 `materialStore.ingest(caseId, { grantId, relativePath, fileName })` 編排呼叫；store 仍走既有 material-ingress hash/provenance 與 provider 前漂移復驗。`material-ingress` 原班漂移／刪除案例隨 31/31 回歸及全量鏈通過；無新 ingest 類別、後端命令或落盤實作。
- **永不覆寫**：同名異內容例實跑得到顯式拒絕、零寫入、零入庫；同名同內容在「寫路徑默認失敗」哨兵下仍就地入庫。兩者均不是覆寫後再補賬。
- **A 與顯式反饋**：指定回歸集合 **31/31 passed**；A 主紅證逐字 marker 綠。`system-open-feedback` 在 work/chat 兩段各一處、由 segment 互斥渲染；拒絕例實斷 chat 段回饋，活 DOM testid 唯一。

## E · 回覆摺疊紀律

| 驗收反例 | 修前／mutation 實得 | 還原／修後 |
|---|---:|---:|
| 移除 latest 裸渲染、令最新長回覆走折疊 | `collapse-toggle` 期望 0、實得 **1**，紅 | 最新全文、尾 marker 可見 |
| 移除塊界下探 | 跨裁線段落 `intact` 期望 true、實得 **false**，紅 | 歷史塊完整，Show more/less 往返綠 |
| 在第二輪 running 期間檢查上一條 | 前一條出現折疊容器，紅 | `lastAssistantIndex` 排除 running；新增專項綠 |
| 固定 48px 遮罩幾何 | 完整塊後空間僅 **23.9375px**，`>=48` 斷言紅 | 完整塊底 + 48px fade band，E **3/3** 綠 |

目前 latest 是裸 `ChatMarkdown`；只有歷史已完成回覆進 `CollapsibleMessage`。48px 斷言量取活 DOM 的 `clip.bottom - block.bottom`，不是只查 CSS 字面。`ChatMarkdown` 本單零 diff、沒有 `<table>` 渲染；管道文字仍以段落為結構單元。`CHAT-MD-TABLE-1` 僅在 `implementation-readiness.md` 已批准項留痕，未被本單越權實現。

## 計數、全量門與範圍

派單所述 `281` 是 PILOT 分支自身 `276→279→281` 的只升點；rebase 合入 READER 的 +2 後真實並集為 **283**。驗收為實際缺陷補一條在途用例後，`playwright test --list` 親數為 **284 tests / 51 files**，`assert-test-count.mjs` floor 精確為 284；若仍鎖 281 會低報真實並集，故不能以 281 作終局數字。

| 門禁 | 隔離實跑結果 |
|---|---:|
| 完整 `test:e2e`（含全靜態鏈） | **284/284 passed**（4.2m） |
| residue，單 worker、三獨立埠 | **22/22 × 3** |
| 指定 F/A/material 回歸掃 | **31/31** |
| desktop Vitest | **55 files / 332 tests** |
| root Vitest | **143 files / 1235 tests** |
| `pnpm -r build` | PASS（13/14 workspace；僅既有 Vite chunk warning） |
| `pnpm lint` | PASS |
| material / host-auth / work-live / voice | 均在完整鏈親跑 PASS；voice node tests **5/5** |

實作與驗收修復（本報告提交前）共 9 個文件，全部嚴格位於 `apps/desktop/{src,tests,scripts,SPEC.md}`；本報告只再增加 `apps/desktop/ACCEPTANCE.md`。零 `packages/**`、零 `src-tauri/**`、零 schema/wire/依賴／lockfile 改動。`App.tsx` 的 READER 合併語義保持 `readerEntries={isDemoCase ? [...] : []}`。`docs/status/current.md` 零觸碰。

> **最終判定：放行 PILOT-LIVE-2。** 以實際合併樹 floor **284** 為準；三項驗收小修及本報告均已／應在驗收分支獨立提交，本會話不推送。

---

# ACCEPTANCE: DESIGN-MD-1-ACCEPT

日期：2026-07-16

角色：獨立驗收會話

對象：`impl/design-md-1 @ 67577a3`（基線 `2ad8eda`，8 文件），合入 `main @ 348155a`；驗收基準為 `main` 尖端 `348155a`。

## 裁決

**✅ 放行 DESIGN-MD-1（含兩項 fix-by-acceptance 實現級小修）。**

`tokens.json` + `principles.md` 到 `courtwork-design.md` 的純編譯、非權威雙聲明、兩源 SHA 溯源、drift 接線與零第二手寫 token 源均成立。驗收實際注入 token hex、principles 要點、刪除產物三類漂移，`lint:design-md` 均 exit 1；第四類「向產物手寫 tokens.json 外的 `#ABCDEF`」起初暴露一項測試假綠：專門的「無第二份手寫 token」測試錯查記憶體中新編譯結果而非入庫產物，故 exit 0（同時 drift lint 正確 exit 1）。本驗收會話將該測試改為直接讀入庫產物後，同一反例確定性 exit 1，還原後全門轉綠。另修正 CLI 把 JavaScript 字符長度誤報為字節的誠實性小缺陷（`17901` 誤稱字節 → UTF-8 實值 `24586` 字節）。兩項均不改契約、導出、依賴或產品運行時。

驗收在獨立 clean worktree `/private/tmp/courtwork-design-md-1-accept`、detached `348155a` 完成；共享樹未 checkout、未 stash，未執行 `git worktree prune`。未更新 `docs/status/current.md`，不推送。不採信實現自述。

## 確定性、溯源與非權威聲明

- 連續兩次 `pnpm --filter @courtwork/desktop design:md`：產物 SHA-256 均為 `255eb9847c5088f54aaa8be6d2cdd3a52a5906f67083b866e7feec7a89d9f21f`，與入庫原件一致；`cmp` 字節恒等，實際大小 `24586` bytes。
- 源文件現算 SHA-256：`tokens.json = 17b63a2ff442b6e4b1b1995c74ddfc3a6162e626346d2acd5526f9b5b013ac23`；`principles.md = 309b58b49d202a8cf1eab236de625f41afc79b986036dc7ee474ba51d982da79`；兩值均逐字出現在 frontmatter `sources`。
- frontmatter 實見 `authoritative: false`、`truth: "docs/design/tokens.json"`；正文實見 `⚠️ **非權威。**` 且再次聲明 `tokens.json` 為唯一機器真值。
- `docs/design/README.md` 新增行如實標為「編譯產物，非權威」，明示兩源、重生成命令、`lint:design-md`/`site:guard` 接線與 `tokens.json` 唯一真值。

## drift 門紅證四連

| 注入反例 | 未修正產物時的實跑結果 | 還原 |
|---|---:|---:|
| `tokens.json`：`#EAEFF4` → `#EAEFF5` | `lint:design-md` exit **1** | exit 0 |
| `principles.md`：L0 要點追加「保持靜止」 | `lint:design-md` exit **1** | exit 0 |
| 刪除 `courtwork-design.md` | `lint:design-md` exit **1**，精確報產物缺失 | `design:md --write` 後 exit 0 |
| 產物正文手寫 `#ABCDEF` | 修前專門測試 exit **0 假綠**；fix-by-acceptance 後同一測試 exit **1**，精確報 `#abcdef` 不在 token 聲明集；drift lint 亦 exit 1 | 重生成後專門測試與 lint 均 exit 0 |

第四項修正保留既有 7 例數量，只把檢查對象從 `compileDesignMd(...)` 的新鮮輸出改為 `docs/design/courtwork-design.md` 入庫產物；因此名義與實際守護對齊，沒有新增測試范式。

## 接線與全量門

| 門禁 | 獨立實跑結果 |
|---|---:|
| `pnpm install --frozen-lockfile` | PASS；14 workspace、1047 packages，lockfile 一致 |
| `pnpm site:guard` | PASS；`node --test` **39/39**（含本單 7），末段 `lint:design-md` PASS |
| 四既有設計門 | neutral（24 token 值 / src 158 文件）、elevation、signature、motion 全部 PASS |
| `pnpm -r build` | PASS（13/14 workspace；僅既有 Vite chunk/dynamic-import warning） |
| `pnpm lint` | PASS，exit 0 |
| root Vitest（build 後） | **140 files / 1210 tests passed** |

根 `vitest.config.ts` 的 include 僅為 `packages/*/src/**/*.test.ts` 與 `eval/src/**/*.test.ts`；desktop include 僅為 `src/**/*.test.ts`。本單 `.test.mjs` 只由 `site:guard` 的 `node --test` 顯式收集，未污染 Vitest 的 1210 floor。fresh install 尚未 build 時直接跑 root Vitest 會因 workspace `dist` 缺失而發生既有 package-entry 解析失敗；按門禁順序完成 `pnpm -r build` 後完整實跑即為上述 1210/1210，裁決只采用 build 後全量數字。

## 範圍與消費可用性

- `2ad8eda..67577a3` 恰好 **8 文件**：3 個 compiler/CLI/test 文件、入庫產物、desktop/root scripts 接線、設計 README 與 desktop SPEC；無第 9 文件。
- `pnpm-lock.yaml` 零 diff、零新依賴；`docs/status/current.md` 零 diff；`apps/desktop/src/` 零 diff。無 desktop 行為變更，Playwright **N/A** 成立。
- 編譯核心只有 Node 內建 `node:crypto`，CLI 只有 Node 內建 fs/path/url；YAML emitter 為嵌套 map + scalar + scalar array 的受限、fail-closed 自寫子集，未引第三方依賴。
- 真實機器消費模擬：用 Ruby YAML parser 成功讀出 frontmatter `tokens.color.bg.app.value = #F6F9FC`，再從正文讀出 `- L0 画布：页面底纸与对话地面，无投影。`，成功組成視覺生成 prompt：「為 Courtwork 生成法律 Agent 工作台；畫布底色嚴格使用 `#F6F9FC`；L0 無投影；不得自行新增顏色或投影。」證明 token 機器值與正文語義可被同一次生成前置約束共同消費。

> **最終判定：放行 DESIGN-MD-1。** 驗收小修與本報告應以 `fix-by-acceptance` 前綴提交；`current.md` 仍不更新，本會話不推送。

---

# ACCEPTANCE: UI-SURFACE-1-FIX-FOCUSED-REACCEPT

日期：2026-07-16

角色：獨立驗收會話（聚焦復驗；未重跑完整產品審計）

對象：`impl/ui-surface-1-fix @ 7cac094`，基線 `9f5dfc2`（含前輪驗收加固 `b757d20` / `04185ac`），合併尖端 `main @ 0d120e8`

## 裁決

**❌ 不放行 UI-SURFACE-1。**

前輪三項阻斷中，疊層清單修復與 §9 文案／靜態門修復均由獨立實開、源碼核對及 mutation 觸紅證實成立；前輪兩枚驗收加固亦未回退，合併尖端全量門為綠。然而第三項「C1–C31／W1–W11 證據雙錨」仍未完成：指定抽樣 10 行實得 9 行正確、1 行錯位，且同表仍殘留多個「已有」項只有檔名或沒有 `file:line`。這正是上輪驳回項本身，不能以符號可 grep 或全量測試綠替代「file:line 指向正確」的修復義務。

本次驗收在獨立 clean worktree `/private/tmp/courtwork-ui-surface-1-fix-accept`、分支 `codex/accept-ui-surface-1-fix` 完成；共享樹未 checkout、未 stash。未更新 `docs/status/current.md`，不推送。

## 1. 疊層清單：通過

17 行逐行對照 `9f5dfc2` 源碼完成；3 個新增項另由驗收會話在隔離 `127.0.0.1:18601` 親自實開：

| 新增項 | 活 DOM 實得 | 反向收斂 |
|---|---|---|
| owner/user menu | `user-menu`、`role=menu`；恰有 Settings & updates / Give us feedback 兩項；trigger `aria-expanded=true` | Esc 後節點 0 |
| analytics opt-in confirm | `settings-optin-confirm`、`role=dialog`、`aria-modal=true`；Settings modal 同時在場，背板 1 | Cancel 後 confirm 0，Settings 仍為 1 |
| 編譯為 Word modal | `.compile-dialog`、`role=dialog`、`aria-modal=true`、`aria-labelledby=compile-title`；confirm testid 1，父背板 `role=presentation` | 取消後節點 0 |

幽靈 dock 由源碼與活 DOM雙證為零：`rg data-mode="dock" apps/desktop/src apps/desktop/tests/e2e` 無命中；頁面 `[data-mode="dock"]` 實得 0；`RightRailModules` 根節點固定 `data-mode="modules"`。

dismiss 語義抽查 5 行均與實作一致：ModelConfigPopover（popover，`useDismissOnOutside`）、AttachmentChip scope（popover，僅顯式取消／確認）、store-chat（popover，`useDismissOnOutside`）、Command Palette（sheet，Esc／選中／點背板）、Settings（sheet，Close／Esc）。panel 類現行無成員。

## 2. §9 文案與門：通過

- W5 title 實得 `停止當前運行即將開通`；reader-entry disabled title 實得 `閱讀視圖即將開通`，兩者均無執行器／接線／接入等工程詞。
- 獨立掃描 6 個未開通文案真源（App、MessageActions、Composer、composer/types、RightRailModules、MaterialsZone），工程詞違例 **0**；7 枚 unwired marker 的 disabled／title 形制保持成立。
- mutation 實證：把 W5 重注入舊字串 `停止當前請求將在執行器接線後啟用`，`lint:ui-surface` exit 1，精確報 `含工程詞「接線」`；以精確 patch 還原後門重新 exit 0，產品源碼零 mutation diff。

## 3. 證據雙錨：不通過

按要求抽 10 行在 `9f5dfc2` 實地核對 C1、C2、C10、C14、C16、C19、C21、C28、W1、W5：

- 9 行的符號／testid 與行號吻合；
- **C21 不吻合**：SPEC 寫 `testid command-palette (CommandPalette.tsx:74)`；`9f5dfc2` 的 `:74` 是 `className="command-palette"`，真正 `data-testid="command-palette"` 在 `:78`。若意圖以 class 作次錨，文字就不能宣稱 testid。

此外，在同一 31+11 清單可直接確認「全行雙錨」宣稱尚未成立：C22 `CollapsibleMessage.tsx`、C23 `PasteBlock.tsx`、C26 `TurnCard.tsx` 仍只有檔名無行號；W10 僅寫 RP-2.7，無符號/testid 與 `file:line`。C12 同樣把 `model-config-popover` testid 寫在 `ModelConfigPopover.tsx:26`，實際 testid 在 `:29`（`:26` 是 class）。

所需修復是文件證據校準，不涉及產品行為或跨層契約；但在精確修復完成前，第三項驳回阻斷仍在。

## 4. 不回退與全量門

- 前輪加固保持：`MINIMUM_UNWIRED_MARKERS = 7`；未開通控件 force-click 不產生 dialog／feedback；非末位失敗輪次不提供 Retry。
- Playwright floor：**231**，未下降。
- `pnpm -r build`：PASS（僅既有 chunk-size warning）。
- `pnpm lint`：PASS。
- root Vitest：**140 files / 1210 tests passed**。
- desktop Vitest：**49 files / 265 tests passed**。
- 完整靜態門：全部 PASS，含 motion/signature/neutral/elevation/view ABI/work port/host auth/material/UI surface 等。
- 隔離端口 `COURTWORK_E2E_PORT=18602`：**231/231 passed**（1.8m），零 fail／skip；`goal2:54` 本輪正常通過，無需 6 次隔離定性。

> **最終判定：不放行。** 下一輪只需聚焦復核第三項：把所有「已有」能力的雙錨補全並校準 testid／symbol 的實際行，至少修正 C12、C21、C22、C23、C26、W10；其餘兩項與全量產品行為本輪已證成立，不要求重做。

## 5. 終局裁決（fix-by-acceptance）

日期：2026-07-16

架構裁定上述 6 格屬文檔級實現小缺陷，由本驗收會話按 AGENTS 紀律直接修正；本節保留前述驳回歷史並取代其終態裁決。

**✅ 放行 UI-SURFACE-1。** 前述疊層清單與 §9 文案／靜態門兩項已獨立驗收通過；本次產品證據表只修 `apps/desktop/SPEC.md` 的 6 個證據格，並追加本終局裁決；未動產品碼、測試、契約語義或 `current.md`。逐格以 `git show 9f5dfc2:<file> | nl -ba` 及 `git grep -n` 自核如下：

| 格 | 穩定主錨 | `file:line @ 9f5dfc2` 自證 |
|---|---|---|
| C12 | 符號 `ModelConfigPopover`；testid `model-config-popover` | `provider/ModelConfigPopover.tsx:21`；`:29` |
| C21 | 符號 `CommandPalette`；testid `command-palette` | `command-palette/CommandPalette.tsx:23`；`:78` |
| C22 | 符號 `CollapsibleMessage`；testid `collapsible-message` | `chat/CollapsibleMessage.tsx:14`；`:36` |
| C23 | 符號 `PasteBlock`；testid `paste-block` | `chat/PasteBlock.tsx:8`；`:15` |
| C26 | 符號 `TurnCard`；預設 testid 工廠 `turn-card-${kind}`；具體 file 卡 testid `output-docx-card` | `chat/TurnCard.tsx:33`；`:40`；`App.tsx:1909`（`kind="file"` 在 `:1904`） |
| W10 | 符號 `CaseRail`；testid `nav-artifacts`；handler `openOutputFolder` | `rail/CaseRail.tsx:66`；`:375`；`App.tsx:1280` |

六格均形成「可 grep 的 symbol/testid + `file:line@9f5dfc2`」雙錨，錯位與缺位歸零。此前全量門證據仍鎖定同一產品合併尖端 `0d120e8`，本修正只改文檔，不重跑產品門。

> **終局判定：放行 UI-SURFACE-1。** `current.md` 仍由架構角色按能力成熟度另行處置；本驗收會話不更新、不推送。

---

# ACCEPTANCE: UI-SURFACE-1-ACCEPT

日期：2026-07-16

角色：獨立驗收會話

對象：`impl/ui-surface-1 @ 16a319b`（基線 `056500a`，13 文件、4 提交），合入 `main @ e238563`；驗收基準為 `main` 尖端 `e238563`。

## 裁決

**❌ 不放行 UI-SURFACE-1。**

實作行為與全量門本身成立：失敗輪次 Retry 復用既有 Turn 發送/取消路徑，末位失敗原地替換且無重複；7 處 `unwired` 控件均為 disabled/aria-disabled，逐一強制派發 click 後無 toast、空彈窗或狀態改變；完整 Playwright **231/231** 通過。範圍、零依賴、零新後端、Legal 四 panel 與 `current.md` 零觸碰也成立。

但核心交付物不能放行：

1. **[需架構拍板] 全 app 疊層清單不完整且含不存在項。** SPEC 聲稱覆蓋「本倉當前全部疊層控件」，源碼卻至少漏列 `App.tsx:2217` 的「編譯為 Word」modal、`SettingsPage.tsx:574-590` 的 analytics opt-in confirm modal、`CaseRail.tsx:424-434` 的 owner/user menu；反之表內「RightRailModules dock 態 L2 臨時下拉」在現行 `RightRailModules.tsx` 無 dock 分支，唯一根節點固定 `data-mode="modules"`，`rg data-mode="dock"` 為零。該表是 `UI-RESIDUE-1` 的直接輸入，漏列/幽靈項會污染後續殘留門清單；驗收角色不擅自改契約分類。
2. **未開通態文案未全數遵守 §9。** W5 實際 title 為 `停止当前请求将在执行器接线后启用`（`App.tsx:1966`），向普通使用者暴露「執行器／接線」工程概念；新靜態門的黑名單只掃行銷腔，未守 §9 工程詞。此項是產品文案實作缺陷，但正確替代措辭應先由架構/產品拍板後同步 SPEC 與測試。
3. **31+11 清單的 file:line 證據有漂移/缺位。** 抽查超過 15 行時，三態與功能實況大致一致，C19 `queued-chip` 實為 Badge 的勘誤亦屬實；但多個 App 行號仍指向實作前位置（如 C1 `App.tsx:610` 實為 `:630`、C14 `:243-247` 實為 `:252-256`、C19 `:1926-1928` 實為 `:1964-1966`、C28 `:625` 實為 `:662`、W5 `:1929` 實為 `:1966`），另 C10/C12/C21/C24 等只列檔名或元件名、沒有 line。核心交付物要求 file:line 證據，不能把語義「找得到」等同精確證據成立。

驗收於獨立 clean worktree `/private/tmp/courtwork-ui-surface-1-accept`、分支 `codex/accept-ui-surface-1` 執行；未 checkout/stash 共享樹、未執行 `git worktree prune`、未更新 `docs/status/current.md`、不推送。不採信實現自述。

交接事實差異：驗收開始時共享 `main` 尖端為 `e238563`；報告提交後復核時共享 `main` 已前進至 `246448c`，新增內容僅為 `archive/research-2026-07-15-round-3/README.md` 與 `chinese-display-font.md` 的調研歸檔。`e238563` 仍是其祖先，`apps/desktop` 與本單組合碼未變；因此驗收證據仍鎖定指定合併尖端 `e238563`，不把並行 archive 變化混入本單裁決。

## 全量門（獨立實跑）

| 門禁 | 結果 |
|---|---:|
| `pnpm install --frozen-lockfile` | 14 workspace projects、1047 packages；lockfile 一致 |
| `pnpm -r build` | PASS（13/14 workspace 執行；僅既有 chunk/dynamic-import warning） |
| `pnpm lint` | PASS，exit 0 |
| root Vitest | **140 files / 1210 tests passed** |
| desktop Vitest | **49 files / 265 tests passed** |
| 四設計門 motion/signature/elevation/neutral | 全部 exit 0 |
| 全靜態門 | 全部通過，含修正後 `assert-ui-surface-contracts` |
| `assert-test-count` | floor **231**，實收 231 |
| 完整 Playwright，`COURTWORK_E2E_PORT=15931` | **231/231 passed（1.8m，4 workers，reuseExistingServer=false）** |

全量 231 先在實作尖端原始測試完整通過。驗收補強三個既有 e2e 檔後，用例數不變；定向 `ui-surface + composer + material-ingress` 復跑 **11/11**（其中 composer 初版驗收斷言寫法 2 紅，改成 force click/innerText 等價比較後 `composer` **5/5**，其餘已先得 **6/6**）。報告與驗收修正落定後再於隔離端口 `15936` 從頭跑完整靜態鏈 + Playwright，最終仍為 **231/231 passed（1.8m）**。

## 31+11 對標清單審計

抽查 C1/C2/C3/C5/C7/C9/C10/C12/C14/C16/C17/C18/C19/C21/C24/C27/C28/C29/W1/W4/W5/W8/W11，超過要求的 15 行：

- **處置語義**：已有／本單補／減法不取均與現況相符；唯一新 wired 項是 C2 Retry；C8/C13/C15/C20/C29/C30/C31/W4 的減法理由均可由現行協議/單入口/容器化定位支持。
- **C29**：已明確記為「原則合規、歸 CHAT 線後續」，舊 `[需架構拍板]` 已撤；沒有 C29 懸掛裁決。SPEC 提案區仍有 WorkDraft 持久化的另一個 `[需架構拍板]`，與 C29 無關。
- **C19 正名**：`App.tsx:1964` 的 `queued-chip` 只是非互動狀態標記；移除在 `:1965` 的獨立「撤回」button，按判據確為 **Badge** 而非 Chip，文檔只記錄不改 class 的處置成立。
- **file:line 精度**：如裁決第 3 點，若只核功能可找到；若按核心交付物要求核精確 line，則多項不合格，須修正文檔錨點。

## Retry 接線與反例

- a. 清潔實作：`ui-surface.spec.ts` 真實 fail→Retry→success；舊失敗 DOM 消失，assistant 消息總數保持 1，**原地替換不重複**。
- b. 實作提交原測試雖名為「非末位失敗」，實際只建立單條末位失敗並斷言 Retry 可見，沒有覆蓋題名。驗收最小修正為：再送第二條並成功，使首條失敗成為中段，再斷言 Retry count 0；清潔實作 **3/3 綠**。隨後臨時把 `onRetry` 條件由 `!chatPending && index === chatMessages.length - 1` 退化為只看 `!chatPending`，定向例 **exit 1**，收到 `Expected 0 / Received 1`；還原後綠。
- c. `handleChatSend` 與 `retryChatTurn` 均進入 `submitChatContent`；該共享函數建立同一 `AbortController` 並把 signal 傳給 `sendChatTurn`，`stopChatTurn` 仍 abort 同一 ref。`056500a..16a319b` 的新增碼對 `invoke/fetch/http/CommandPort` 無新增命中，`src-tauri`、packages、host command/port 零 diff，故零新後端成立。

## 七處未開通態與靜態紅證

| 位點 | disabled 語義／title | click 行為 |
|---|---|---|
| MessageActions · Read aloud | native disabled；`Coming later` | 強制 click 無 dialog/ledger 變化 |
| MessageActions · More | native disabled；`Message fork editing comes later` | 強制 click 無 dialog/ledger 變化 |
| Composer · camera | `aria-disabled=true`；提供替代路徑 | 強制 click 後 menu 留在原態，無 dialog/toast |
| Composer · voice | `aria-disabled=true`；提供替代路徑 | 強制 click 後 menu 留在原態，無 dialog/toast |
| RightRail · reader-entry | native disabled；`閱讀視圖待接入` | 強制 click 無 dialog/狀態變化 |
| Work queued · 停止當前 | native disabled；含 §9 違規工程詞 | 強制 click 後 queued 文本/DOM 不變，無 dialog |
| MaterialsZone · 在訪達中顯示 | native disabled；誠實即將開通 | 強制 click 後 feedback、material status、dialog 均不變 |

靜態門反例：

- 原門對每個檔案只用 `indexOf` 檢查第一個 marker，再取 ±400 字窗；臨時令 MessageActions 第二個 marker 移除 disabled 並加 `alert`，門仍 **exit 0 假綠**。
- 驗收以實作級最小修正令門逐一枚舉 2+2+1+1+1 個 marker、限定在同一 JSX opening tag 核 disabled/title、並鎖每檔精確數量。重注入同一第二 marker 可點擊行為後門 **exit 1**，精確報 `MessageActions ... #2：同一元素缺少 disabled`；還原後 exit 0。
- 另以 MaterialsZone 單 marker 移除 disabled 並加入 `alert`，原/修正門均 exit 1，證明基本紅證成立；較隱蔽的同檔第二 marker 假綠則由驗收修正補閉。

## 疊層清單抽查與完整性

指定抽查 5 項均與代碼一致：

1. `ModelConfigPopover`：錨定 composer model chip，`useDismissOnOutside`，popover 分類正確。
2. Composer `+` menu：`role=menu/menuitem`，選中收斂，popover 錨定正確。
3. Composer case menu：`role=listbox/option`，錨定選擇下拉分類正確。
4. `CommandPalette`：全窗 backdrop + `role=dialog aria-modal=true`，sheet/window modal 分類正確。
5. `NewCaseDialog`：全窗 backdrop + modal dialog，sheet/window modal 分類正確。

但「抽查 5 項為真」不等於「全 app 清單完整」；裁決第 1 點的三個漏列與一個幽靈 dock 項已由全源碼 `role=dialog/menu/listbox`、popover/menu/dialog/backdrop/overlay 掃描坐實。因其直接供 `UI-RESIDUE-1` 消費，列為阻斷項。

## 範圍、複雜度與驗收修正

- `git diff 056500a..16a319b --name-status` 恰 **13 文件**，全部 `apps/desktop/**`；主線合併尖端另有與本單無關的 readiness/archive 提交，範圍判定只認實作分支 diff，不誤算 main 另一父線。
- `pnpm-lock.yaml` 零 diff，package manifest 只加 script 接線；zero 新依賴。
- `workbench/Panels.tsx`、`GraphPanel.tsx`、`ArtifactTableRenderer.tsx`、`docs/status/current.md`、`src-tauri` 零觸碰。
- 新概念留痕與實況一致：`submitChatContent` 是既有發送狀態流程的必要因子化，沒有新狀態機/持久化；`data-state="unwired"` + 靜態門是唯一新標記約定。除此之外無新通用抽象。
- 驗收保留的實作級小修僅三個既有 e2e 的真 click/非末位反例補強，以及靜態門逐 marker 精確檢查；不改產品契約、產品碼、依賴或 floor，應以 `fix-by-acceptance` 前綴提交。

> **最終判定：UI-SURFACE-1 不放行。** 待架構角色修正/拍板全 app overlay 清單，產品/架構拍板 W5 的 §9 文案，並把 31+11 的 file:line 錨點更新到合入後實況；之後須在新的獨立 clean worktree 復跑全量門與兩個 mutation。`current.md` 不更新，不推送。

---

# ACCEPTANCE: OUTPUT-CONFIRM-UI-1-ACCEPT

日期：2026-07-16

角色：獨立驗收會話

對象：`impl/output-confirm-ui-1 @ bf64fe5`（基線 `47c9c6b`，9 文件全在 desktop）；經衝突解決合入 `main @ 700bc3c`；驗收基準 **合併尖端 `main @ 936d9ef`**（含 CHAT-MEMORY 與本單接線）

## 裁決

**✅ 放行 OUTPUT-CONFIRM-UI-1（含合併組合）。**

OUTPUT-CORRECTNESS #6 的產品側確認在合併尖端閉合：non-applied 逐條顯式展示 + 針對性確認後落盤、取消零產出；`packages/output` 契約與門禁零觸碰。歷史兩條 e2e 紅（`rp210:43` / `system-open:12`）於合併尖端全量門 **首次轉綠**，根因台賬（`instr-risk-02`/`instr-risk-06` 的 `basis[0]` 為法條正文 → `locator_not_found` → 門禁正確阻斷、產品確認 UI 此前缺席）由獨立 probe 復現。CHAT-MEMORY 注入鏈與本單確認鏈互不干擾（定向 e2e 同端口雙綠）。未發現需標 `[需架構拍板]` 的契約問題。

驗收在獨立 worktree `/private/tmp/courtwork-output-confirm-ui-1-accept.31533`、detached `936d9ef` 完成；共享樹未 checkout、未 stash；未更新 `docs/status/current.md`，不推送。不採信實現自述。

## 合併組合完整性

| 門禁 | 合併尖端 `936d9ef` 實跑 |
|---|---|
| `pnpm install --frozen-lockfile` | 1047 packages，lock 一致 |
| `pnpm -r build` | PASS |
| `pnpm lint` | PASS，exit 0 |
| root Vitest | **140 files / 1210 tests passed**（實現自述 1204 為合入 CHAT-MEMORY 前數字；驗收以尖端實得為準） |
| desktop Vitest | **48 files / 251 tests passed** |
| 四設計門 neutral/elevation/signature/motion | 均 exit 0 |
| `assert-test-count` floor | **225**（223 CHAT-MEMORY + 2 本單；門禁文案「假綠防護通過：225 條用例（下限 225）」） |
| 隔離端口 Playwright `COURTWORK_E2E_PORT=18611` | **225 passed / 0 failed（1.7m）** |

關鍵轉綠（全量門內）：

- `rp210.spec.ts:43` ✓
- `system-open.spec.ts:12` ✓
- `output-confirm.spec.ts` ×2 ✓
- `chat-memory.spec.ts` ✓（合併後記憶注入鏈仍過）

定向複跑（還原後，`COURTWORK_E2E_PORT=18612`）：`chat-memory` + `output-confirm` ×2 = **3/3 passed**，互不干擾。

## 範圍核對

| 項 | 實得 |
|---|---|
| `git diff --name-only 47c9c6b..bf64fe5` | 恰 **9** 文件，全部 `apps/desktop/**` |
| `packages/output` / `packages/demo-runtime` | 功能 diff 零觸；#6 API（`onNonApplied:'block'\|'confirm'` + `confirmNonApplied` + `NonAppliedInstructionsError`）源碼仍在 |
| 「跳過並交付」 | `apps/desktop` 對 `跳过并交付` / skip-deliver 等 **0 命中**；`needs_confirmation` 分支不攜 `docx` |
| CLI demo 流 | 本單 diff 未改 `demo-runtime` |
| App.tsx 合併 | 同時持有 `memorySegmentFor`/`distillMemory` 與 `produceContractDocx`/`confirmNonApplied`/`needs_confirmation` 兩鏈 |

## 產品語義反例（注入→紅→還原；終態 clean）

| 反例 | 變異 | 實得 |
|---|---|---|
| a. 確認清單不一致 | 任意非空 confirm 列表 loose 確認全部 non-applied | 「確認清單與實際 outcome 不一致」例：`expected needs_confirmation, received compiled`（1 failed） |
| b. 取消仍落盤 | `needs_confirmation` 非法附帶 `docx` | 「取消即零落盤」例：`expected not to have property docx`（1 failed） |
| c. 全應用直通 | 清潔樹：`全部落点` **綠**；強行恒返回 `needs_confirmation` → 直通/落盤例紅；還原後直通再綠 | 不誤傷正常流 |
| d. §9 零技術概念 | 原因文案改為 `locator_not_found instruction schema` | `output-confirm` e2e 紅（未見「未能在文書中找到對應原文」；received 含工程詞）；還原後 3/3 綠 |
| e. §6 邊界 | 靜態審計 | 無「確認全部」一鍵；僅逐條「確認知悉」+ footer「已確認 c/N」+ 標題「有 N 處…」；無隱式全批控件 |

## 根因閉環（獨立 probe，3/3）

以真源 `packages/demo-data/data/artifacts/risk-list.json` + `packages/demo-data/data/dossier/04-设备采购合同.md`：

1. `risk-02`/`risk-06` 的 `basis[0].sourceAnchors[0].quote` **不在**合同正文（法條正文）。
2. `compileConfirmedRiskListToRevisionInstructions` 僅取 `basis[0]` 作 locator quote。
3. `applyRevisionInstructionSet(..., { onNonApplied:'block' })` 拋 `NonAppliedInstructionsError`，未應用項恰為  
   `instr-risk-02:locator_not_found`、`instr-risk-06:locator_not_found`。
4. desktop `compileConfirmedReviewToDocx`（全 confirmed）→ `needs_confirmation`，pending ids 同上、reason 皆 `not_located`、無 `docx`。

與就緒圖台賬一致：`f38c17a` 門禁行為正確；歷史 e2e 紅是產品確認 UI 缺席，非「環境性/缺宿主橋」。本單補 UI 後全量 225 全綠。

## 視覺與交互

- 確認區 `nonapplied-confirm` 居審閱面內：逐項「確認知悉」/「已確認」禁鈕、`SignatureLine` attention→authority、footer「已確認 c/N」+「取消，不生成產物」——e2e 實跑與文案斷言一致。
- CSS：token 化、1px 描邊、`border-radius: 6px`、**無 box-shadow / 無新動畫屬性**（註釋明示無投影無動效）。
- 簽名線/零投影/動效白名單四門均過。

## 複雜度審視

- 聲明「判別聯合 `CompileConfirmedReviewOutcome` 是把中間態建模進編排的最小手段」成立：#6 要求未落點在落盤前可交互確認，拋出的 error 無法承載審閱面逐步確認；`PendingRevisionConfirmation` + `NonAppliedReason` 投影為 §9 所必需。
- 零新依賴、零新持久格式、零跨層契約；僅 desktop 內部類型 + 兩枚 React state + `recompileGuard` ref。
- 提案區「demo 未落點是結構性的」——probe 證實；本單不動 legal 語料、不繞過門禁，驗收同意只登記。

## 契約與禁止項

- 無 `[需架構拍板]` 項。
- 未改 `packages/output` 門禁語義；未做「跳過並交付」；未改 CLI demo 流。
- 已知邊界（誠實）：取消後無「重新生成」入口——屬本單明示範圍外，非缺陷。
- 未更新 `docs/status/current.md`；不推送。

---

# ACCEPTANCE: CHAT-MEMORY-1-ACCEPT

日期：2026-07-16

角色：獨立驗收會話

對象：`impl/chat-memory-1 @ 49d0ef8`（已合入 `main @ 2d82252`）；基線 `47c9c6b`；功能 diff 14 文件

## 裁決

**✅ 放行 CHAT-MEMORY-1。**

ADR-013 §2/§3 退出證據均由獨立 clean worktree 實跑與反例注入觸紅證實：規則蒸餾（兩族）攜來源坐標、`generic-chat` 純加法注入縫（缺省字節等同基線常量）、substring 檢索 hook、Settings 僅查看+一鍵清除、版本化單鍵 fail-closed、案件/密鑰隔離。未發現需標 `[需架構拍板]` 的契約問題。兩條 e2e 紅（`rp210:43` / `system-open:12`）於基線 `47c9c6b` 同簽名復現，歸檔為 OUTPUT-CONFIRM-UI-1 既有缺口（該單尚未合入 tip），不歸責本單。

驗收在獨立 worktree `/private/tmp/courtwork-chat-memory-1-accept.6053`、detached `2d82252` 完成；共享樹未 checkout、未 stash；未更新 `docs/status/current.md`，不推送。不採信實現自述。

## 範圍與複雜度核對

| 項 | 實得 |
|---|---|
| 文件清單 | `git diff --name-only 47c9c6b..49d0ef8` 恰 **14** 文件（desktop 12 + core 2），與宣稱一致 |
| 零新依賴 | `package.json` / `pnpm-lock.yaml` / Cargo 於 `47c9c6b..49d0ef8` 與 `47c9c6b..2d82252` 均零 diff |
| 零模型/embedding | `chat-memory.ts` 僅註釋否定；蒸餾為 `DIRECTIVE_RULES`/`PREFERENCE_RULES`/`ENTITY_RULES` 正則；檢索為 substring；grep 無 openai/embed/vector 實現 |
| 存儲 | 單鍵 `courtwork.chat-memory.v1`，信封 `{version,entries}`，localStorage 版本化；無新持久格式 genre |
| core 觸碰 | 僅 `assembleGenericChatSystemPrompt(memorySegment?)` 可選參；缺省/`''`/空白 → 返回 `GENERIC_CHAT_SYSTEM_PROMPT` |
| 缺省字節等同 | 基線常量 vs tip 常量：`BASELINE_CONSTANT === TIP_CONSTANT`（len 180）；`assembleGenericChatSystemPrompt()` 與常量逐字相等；diff 無 golden/snapshot 文件 |
| floor | `assert-test-count.mjs` `minimum = 223`（222→223） |

真源隔離：`App.tsx` 完成回調只以 `payload.text` 餵 `distillMemory`，不餵 `readingMarkdown` / 組裝 content。`ChatMemoryPanel` 僅一枚清除 `<button>`，無 input/textarea/分條編輯/導入導出。

### 複雜度審視（SPEC 聲明 + 提案區）

- SPEC「新增概念留痕」四項（`chat-memory` 模塊、`MemoryEntry`/`v1` 信封、`ChatMemoryPanel`、core 可選參）均為 ADR 退出證據所必需，形態落在拍板上限內（規則/substring/單鍵 localStorage/加法縫）。
- 明確未新增：模型判定、embedding、第二持久格式、狀態機、新依賴、雲同步、autonomous hook 觸發、Turn/schema 語義改動——與源碼一致。
- 提案區已登記、本單只列不刪：`settings-clear-prefs-row` 與真實記憶清除並列易混淆；`effectiveBaseUrl`/`reasoningLabel` 沿 CHAT-SESSION-1 待架構拍板。驗收同意只登記、不越權刪。

## 全量門（獨立實跑）

環境：macOS 26.5.2 arm64、Node v25.9.0、pnpm 9.15.0。`pnpm install --frozen-lockfile`（1047 packages）後全倉 build（跨包經 dist）。

| 門禁 | 實跑結果 |
|---|---|
| `pnpm -r build` | PASS（既有 chunk-size warning） |
| `pnpm lint` | PASS，exit 0 |
| root Vitest | 首輪 1 紅：`packages/output/src/ooxml-diff.test.ts` 5000ms timeout（**非本單**；本單零觸 output）；單測連跑 2/2 綠；全量複跑 **140 files / 1210 tests passed** |
| desktop Vitest | **48 files / 247 tests passed** |
| 四設計門 neutral/elevation/signature/motion | 均 exit 0 |
| `assert-test-count` | Playwright 假綠防護通過：**223** 條（下限 223） |
| 隔離端口 Playwright `COURTWORK_E2E_PORT=18591` | **221 passed / 2 failed**（floor 223） |

定向 memory 單測：`chat-memory.test.ts` **25/25**；`ChatMemoryPanel.dom.test.ts` **4/4**；`generic-chat.test.ts` **6/6**；`chat-client` memory 段 **2** 例含於 desktop 全量綠。

## ADR-013 反例（注入→紅→還原）

全部 mutation 在 accept worktree 對源碼局部改寫後跑定向 Vitest，觀察失敗後 `git checkout --` 還原；終態 `git status --short` 空、memory/core 定向再綠。

| 反例 | 變異 | 實得紅燈 |
|---|---|---|
| a. 可追溯 | `verifyTraceable` 恒 `{ok:true}` | 偽 `turnId` / 偽 `sessionId` 兩例：`expected true to be false`（2 failed） |
| b. 清除徹底 | `clearMemory` 改 no-op | 「清除後組裝零 memory」與「未知版本亦重置」雙證紅：entries 殘留 / 仍 unreadable（2 failed） |
| c. 穩定前綴 | `assembleGenericChatSystemPrompt` 改為 prepend memory | 「基身份是穩定前綴」等 3 例紅（`startsWith` 失敗） |
| d. 案件/Work 隔離 | 頂層 `containsCaseContent` 短路為 false | 材料邊界內嵌 `記住：本案被告是張三` 被蒸出 length 1（1 failed）——獨立重放變異實證 |
| e. 密鑰隔離（兩層） | e1 僅去頂層 secret → **仍 25 綠**（切出正文層兜底）；e2 僅去正文層 → **仍 25 綠**（頂層兜底）；e3 兩層同去 → 攜 `sk-…` 輸入蒸出 length 1（1 failed） |
| f. 未知版本 fail-closed | 版本守衛短路 | `loadMemory` 對 version 99 返回 `ok` 而非 `unreadable`（1 failed）；契約要求 fail-closed 讀入成立 |

## 端到端

- 隔離端口 `COURTWORK_E2E_PORT=18592` 定向 `tests/e2e/chat-memory.spec.ts`：**1/1 passed**（7.0s）。
- 鏈路實證：發送含標記文本 → localStorage v1 含正文與 `chat-` 前綴 turn 坐標 → 次輪 system 含 `[長期記憶]` 且基身份前綴保留 → Settings privacy 只讀列表含來源、面板內 input/textarea/select = 0 → 一鍵清除後空信封 `{version:1,entries:[]}` → 再請求 system 無 `[長期記憶]`。
- 無管理入口：僅查看 + 清除；面板零編輯控件（e2e 與源碼雙證）。

## 兩條既有紅歸檔

tip `2d82252` 與基線 `47c9c6b`（獨立 worktree `/private/tmp/courtwork-chat-memory-1-baseline-47c9c6b.10051`，frozen install + 全倉 build，`COURTWORK_E2E_PORT=18593`）均：

- `tests/e2e/rp210.spec.ts:43` — `confirmDemoReview` 等待 `output-docx-card` 30s timeout
- `tests/e2e/system-open.spec.ts:12` — 同上 stack（`helpers.ts:36`）

簽名一致，故確認為 OUTPUT-CONFIRM-UI-1 缺口（`impl/output-confirm-ui-1` 仍停在 `47c9c6b`，未合入 tip），非 CHAT-MEMORY-1 引入。

## 契約與禁止項

- 無 `[需架構拍板]` 項。
- 未改 Turn journal / session 窗口語義；未接 autonomous trigger；未改 schema / provider 契約語義。
- 未更新 `docs/status/current.md`；不推送。

---

# ACCEPTANCE: HOST-AUTH-LITE-ACCEPT

日期：2026-07-15

角色：獨立驗收會話

對象：`main @ f44a13d`；功能實現 `d58701a` + 前進修復 `580e90c`，diff 基準 `a600cc5`

## 裁決

**✅ 放行 HOST-AUTH-LITE。** 授權作用域的詞法與 canonical 兩層 fail-closed、opaque grant 邊界、四類失敗可見、composition-root 注入與零 demo 回落均由獨立實跑及反例觸紅證實。完整 Playwright 的兩個非本單 timeout 已在乾淨基線 `a600cc5` 逐例復現，排除本單問責。未發現需新增 `[需架構拍板]` 的契約問題；persisted-scope 不採用、durable ref 延後 `CASE-ROOT-1` 的既有裁定保持不變。

驗收在獨立 worktree `/private/tmp/courtwork-host-auth-lite-accept.moDrgS`、分支 `codex/accept-host-auth-lite` 完成；共享樹未 checkout、未 stash、未寫入，未更新 `docs/status/current.md`，不推送。

## 範圍、依賴與事故複核

- `git diff --name-only a600cc5..580e90c` 實得 **16 文件**，`outside apps/desktop = 0`。`Cargo.lock`、根 `package.json`、`pnpm-lock.yaml` 與 `docs/status/current.md` 均零差異；`Cargo.toml` 僅為既有 objc2 crate 開啟 `NSPanel/NSSavePanel/NSOpenPanel/NSApplication/NSString/NSArray/NSURL` feature，沒有新 crate/npm 依賴。
- `main.tsx` 在 composition root 選擇 Tauri/browser adapter 並注入 `App`；`App.tsx` 要求 `HostAuthPort` 並透傳；`SettingsPage.tsx` 要求同一 port 並掛載 `HostAccessPanel`。`pnpm -r build` 的 `tsc -b` 通過，注入鏈閉合。
- `9518953 → a600cc5 → d58701a → 580e90c` 均為祖先鏈；tip 的已提交 `App.tsx` 對 `SessionHistory|continuationHistory` 為 **0 命中**，未含 CHAT-SESSION-1 內容。
- renderer HostAuth port/wire 對外 grant 只含 `{ grantId, label }`；HostAuth 相關 renderer 文件無 `absolutePath/caseRoot/app_data_dir` 通道，Tauri adapter 只傳 opaque id、relative path 與 bytes。

## 獨立門禁實跑

驗收機：macOS 26.5.2（arm64）、Node v25.9.0、pnpm 9.15.0、rustc/cargo 1.97.0。先執行 `pnpm install --frozen-lockfile`（1047 packages）及全倉 build，再跑包級測試。

| 門禁 | 實跑結果 |
|---|---|
| `pnpm -r build` | PASS；13 個 workspace project，desktop `tsc -b && vite build` 通過 |
| `pnpm lint` | PASS，exit 0 |
| root `pnpm test` | **136 files / 1175 tests passed** |
| desktop Vitest | **41 files / 176 tests passed**；SPEC 的 `44 / 199` 是實現自述數字漂移，不作驗收數字 |
| `cargo test` | **38/38 passed**；`cargo test host_auth::tests -- --list` 實得 **13** 個 HostAuth 測試 |
| `COURTWORK_E2E_PORT=18473 pnpm --dir apps/desktop test:e2e` | 所有靜態門通過，floor 實得 **216**；Playwright **214 passed / 2 failed** |
| focused HostAuth E2E（還原後） | 隔離端口 18476，**4/4 passed** |

完整 E2E 的兩例失敗為 `rp210.spec.ts:43` 與 `system-open.spec.ts:12`，均在 `confirmDemoReview` 等待 `output-docx-card` 30 秒超時。另建乾淨 `/private/tmp/courtwork-host-auth-baseline.a600`，checkout `a600cc5`，frozen install + 全倉 build 後以隔離端口 18475 專跑兩例，得到 **同樣 2/2 timeout、相同 locator 與堆疊**，故確認是基線既有，不歸責 HOST-AUTH-LITE。

## Fail-closed 反例注入

所有 mutation 均為「注入 → 觀察紅 → apply_patch 還原」，最終靜態門與 focused E2E 再次全綠，三個被改源文件 `git diff` 為空。

| 反例 | 實際紅燈 |
|---|---|
| 停用 `lexical_relative_ok` 的 component 拒絕 | `lexical_scope_rejects_absolute_parent_and_empty` 失敗，`../escape.txt` 被測試捕獲 |
| 還原詞法層，再停用 canonical target containment | `symlink_escape_is_out_of_scope` 失敗，實際結果由 `OutOfScope` 漂為讀取成功 |
| UI `data-reason` 硬編為 `denied` | HostAuth E2E 在期望 `revoked` 時收到 `denied`，**3 passed / 1 failed** |
| 對 renderer `HostGrant` 注入 `absolutePath?: string` | `assert-host-auth-contracts.mjs` exit 1，同時報「不得出現絕對路徑通道」與「只允許 grantId + label」 |

四類失敗均由 Playwright browser stub 驅動到 UI：authorize 的 `denied`，write 的 `revoked`/`unavailable`，read 的 `out_of_scope`；逐類斷言 `data-reason` 與可見文案，沒有靜默成功或 demo 回落。同一 unknown grant 分類測試連跑兩次都穩定得到 `revoked`，判定順序具確定性。

## 手工記錄與複雜度審視

- 此驗收環境不能自動控制 Tauri 原生 `NSOpenPanel`，因此不偽稱完成真彈窗點擊。驗收機 `diskutil list external physical` 為空，沒有可安全卸載的外接卷，亦不偽稱完成真卷卸載。可自動化部分實跑：grant record round-trip 與 missing-root/unmounted 分類各 **1/1 passed**；macOS picker 代碼已由 cargo 完整編譯。
- 原 SPEC 只列項目、沒有可操作步驟，不足以稱為可復現記錄。已以 fix-by-acceptance 補上真彈窗/取消、可卸載卷、退出重啟三套步驟與預期 UI/宿主觀察；未把未執行的真機結果寫成成功。
- `webkitdirectory` production 命中恰 **3**：SettingsPage、Composer、NewCaseDialog；只列未刪。
- renderer 絕對 `case_root` 反模式仍存在於 `case-output-client.ts`，Rust 的 `write_case_output_docx` / `case_output_docx_exists` 仍接收 `case_root: String`；只列未改。
- `CASE_SCOPE_AUDIT` 實際 **13** 條，consumer 只有 `case-scope.ts` 與 `case-scope.test.ts`，測試只守 `>=12` 與少數 symbol；原 SPEC「14 項」已更正為 13。
- `.gitignore` 有 `.DS_Store` 規則，但 `git ls-files`、全歷史路徑查詢與現行文件查找均為零；原 SPEC「已被跟蹤」被事實推翻，已更正，沒有文件可 `git rm --cached`。

## 驗收自修

只修改 desktop 文檔：`apps/desktop/SPEC.md` 更正兩項複雜度掃描事實並補完整手工復現步驟；本報告追加到 `apps/desktop/ACCEPTANCE.md`。未修改產品代碼、schema、依賴或跨層契約。

---

# ACCEPTANCE: DOCS-SELF-CONTAINED-1

日期：2026-07-15

角色：独立验收会话

对象：实现提交 `fde08a8c46c788d086d437728f232bf4a1a63b9f`，基线 `7db01fafd67bf5b70349c275205309ca56b416f7`

## 范围与历史语义

- 独立 clean worktree / `codex/accept-docs-self-contained-1` 上复核；未采信实现自述。基线到实现 tip 的 diff 仅有 `apps/desktop/SPEC.md` 与 `apps/desktop/ACCEPTANCE.md` 两个 Markdown 文件，无源码、契约、测试、二进制或视觉资产增删。
- 机械提取差异得到恰好 **33** 个退役的 `visual-audit/*.png` Markdown 链接，33 个目标在现行树均不存在、33 个文件名均原样保留为 inline code，且没有新增同名链接或伪造图片。受影响的 19 行在只去除链接标记后与现行文本逐字命中，历史结论与说明未删除。
- `apps/desktop/ACCEPTANCE.md` 恰好退役 1 个指向已删除 `apps/desktop/src/workbench/ThinkingStream.tsx` 的链接；该目标确实不存在，路径改为 inline code，冒号后的历史验收正文逐字不变。
- 新的现行证据入口 [`release/evidence/v0.1.2/README.md`](../../release/evidence/v0.1.2/README.md) 与 [`apps/desktop/visual-audit/manifest.json`](visual-audit/manifest.json) 均存在且受 git 跟踪。差异未增加 `archive/` 链接；额外 consumer grep 覆盖 Markdown link、import/from/require/fetch/readFile 与 href/src，活动树为 **0 命中**。

## 独立活动 Markdown 链接扫描

- 验收侧独立实现扫描器，输入为 `git ls-files '*.md'` 后排除 `archive/**`；实际覆盖 **116** 个 tracked 活动 Markdown、**133** 个本地链接。
- 扫描器剔除 fenced code block 与 inline code，跳过外部 scheme 和纯锚点，解析 inline/reference Markdown link，并处理 query、hash、URI decode、`:line[:column]` 坐标；路径按文档相对路径、仓库根前缀与 `/` repo-root 约定解析。
- 实现 tip 实跑结果：`markdownFiles=116`、`localLinks=133`、`brokenCount=0`。
- 真实红测：先记录 `docs/status/current.md` SHA-256 为 `ba614f9ff8d7b9aa8c9b129e9b9588e4e7e4179e0aff7ace5fac38dfdbc598c6`，临时注入 `./__missing_docs_self_contained_probe__.md`；同一扫描器报告 **134 local / broken=1** 并精确指出该文件。撤除反例后 SHA-256 恢复为同值，git diff 为空，扫描恢复 **133 local / broken=0**；写入本报告的两个有效证据链接后再次复跑为 **135 local / broken=0**。

## 最终门禁

| 门禁 | 独立实跑结果 |
|---|---|
| `pnpm release:guard` | **10/10** Node tests；release truth PASS |
| strict release truth | `--expected 0.1.2 --require-site-match` PASS；app/site `0.1.2` 与 DMG SHA `f4af2a…de83d` 一致 |
| `pnpm site:guard` | **31/31** tests；deslop **689 active text files**；neutral/elevation/signature/motion 全绿 |
| `pnpm lint` | exit 0；clean worktree 初次无 `node_modules`，先以 frozen lock + offline cache 安装后重新完整实跑 |
| `pnpm -r build` | **13** workspace projects 通过；desktop **3532 modules**；仅既有 Tauri dynamic/static import 与 chunk-size advisory |
| `pnpm test` | **131 files / 1127 tests** 全绿 |

## 结论

**✅ 放行 DOCS-SELF-CONTAINED-1。** 本单只把不存在的历史目标从可点击链接退为可追溯文件名，不伪造资产、不召回 archive、不改写历史结论；现行证据入口有效，活动 Markdown 本地链接为零断链，且扫描器已由真实反例证明能报红。下游可以把该实现与本验收报告合入 main。

---

# ACCEPTANCE: apps/desktop（W9）

验收记录按批次追加。每节结论必须明确回答是否放行下游工单（AGENTS.md 验收处置规则）。验证一律实测（干净环境重装、drift 类实际触发），不采信实现会话自述。

---

## VISUAL-KIT-1 · 十二族可视化组件样板与 schema-first 运行时（2026-07-14）— ✅ 放行

- **角色与对象**：独立验收会话；实现提交 `4f4b4ac6e7ae963b18964b52a40b5026f3219a8b`，基线 `f7532f7`。验收在独立 worktree、独立分支 `codex/accept-visual-kit-1` 完成，不采信实现自述。
- **验收修复**：`670ec29abede695d088d0e95994edea5e7fb0e6c`（runtime 比例白名单、gallery `implemented` 必须绑定真实 primitive，并补强 schema-first/零 wire/展示契约测试）；`16f764d15ccb2feaf11199ab3d55fdca799d9949`（仅消除验收测试的 lint 告警）。两枚均为实现级 fail-closed 小修，无 schema 字段、跨层接口、导出或 ADR 变更。
- **边界核验**：仓库无 `packages/ui`；生产代码未依赖 demo/testing、Node builtin 或第三方可视化运行时；实现只在 desktop `devDependencies` 增加 `@courtwork/demo-data`。G6 仍由既有 `GraphPanel` lazy boundary 管理，本工单未触碰。registry 仅登记 `courtwork.artifact-table.v1`，candidate/deferred 不进入运行时；Legal/PM fixture 复用同一 primitives，锁定各自 provenance/hash。

### 反例注入（均先红后恢复）

| 边界 | 实际注入的反例 | 观察到的红灯 |
|---|---|---|
| 冻结与状态 | shallow freeze；放入未知 status tone | contract 分别 `4 failed`、`1 failed` |
| Estimate / Partial | 同时提供多个 estimate 形态；未知总量伪造 `20%` | contract 各 `1 failed` |
| 组合与 gallery | 接受 `3:2`；伪造 implemented 无 primitive；删 missing-family guard；标题加 `01 ·` | 对应 contract/gallery 测试逐项变红 |
| 零 wire 与命名空间 | primitive 读取 `descriptor/pointer/payload/artifact/store/event/typeId`；加入 PM `typeId` 分支；输出 raw payload | visual-kit guard 或 namespace/zero-wire 测试变红 |
| blueprint 登记边界 | 临时登记 candidate blueprint；临时生产文件导入 demo/testing、`node:path`、`echarts` | static guard 分别报告违规 |
| Interaction | Anchor 无回调仍可点；Decision 无回调不锁；删 first-wins；吞掉 error；提前显示 Recorded；截断 quote | SSR/DOM 测试分别捕获 source-ready、重复 resolve、错误态、阶段与原文完整性漂移 |
| Artifact schema-first | 绕过必填 `documentId`；缺 pointer 默认空串；enum 忽略 `valueLabels`；文件标签泄漏完整 `fileId` | renderer 9 例中的对应 schema/pointer/enum/provenance 断言逐项变红 |
| fixture 固定性 | 改动 PM fixture hash 一位 | fixture hash 测试 `1 failed` |

所有临时 mutation 均已逆向恢复；最终工作树不含反例残留。验收过程中真实暴露的任意 runtime 比例与假 implemented 两个 fail-open 缺口，已由 `670ec29` 前进式修复。

### 最终门禁实跑

| 门禁 | 结果 |
|---|---|
| `lint:visual-kit` | PASS |
| focused Vitest | **25/25**（6 文件） |
| desktop Vitest | **161/161**（39 文件） |
| root Vitest | **1117/1117**（128 文件） |
| `pnpm -r build` | 13 个 workspace project 通过；desktop 3524 modules，仅既有 Tauri dynamic/static import 与 chunk-size 提示 |
| `pnpm lint` | exit 0 |
| `pnpm site:guard` | fixture **12/12**；deslop 扫描 670 个 active text files，neutral/elevation/signature/motion 全绿 |
| 独立 Playwright | `COURTWORK_E2E_PORT=1638 pnpm exec playwright test --workers=1`：**209/209**，明确 `Running 209 tests using 1 worker`，3.2m |

### 真机渲染与人工目检

- Playwright 在真实 Chromium 生成 1180 / 1280 / 1440 / 1600 四档 gallery 全页截图，并逐张以原图/高分辨率人工目检：1180 为两列，1280–1600 为三列；十二族齐全，hairline grid 连续，Legal/PM provenance 与 fixture hash 可见，Partial 显示 `Completed 2/3 · Pending 1` 且不伪造百分比，无全局横向溢出或 card-inside-card 膨胀。
- 普通 ask-user 的 pending/resolved 不出现 Partial 噪音、error 只呈失败态、Recorded 仅在 core acceptance 后出现，并由同一次单 worker Chromium 全量用例及 SSR/DOM focused 测试共同锁定。
- **非阻断 P2 观察**：1280/1440 的个别 Evidence 样板中，`implemented` 状态 badge 靠近单元格边界时存在局部遮挡；不影响 primitive、数据或交互契约，也不进入生产 blueprint，后续仅作 gallery 排版 polish，不扩成本工单契约修复。
- 已按 browser skill 尝试 in-app browser，但本地 browser-client bootstrap 两次均在初始化时报 `Cannot redefine property: process`；因此本报告不伪称完成 in-app 手工点击。该环境阻塞不影响独立真实 Chromium 的 209/209 与四档截图证据；accepted main 上的 in-app browser 真机证据留给主会话补录。

### 结论

**✅ 放行 VISUAL-KIT-1。** 十二族样板、schema-first 校验、零 wire、跨垂类同源 primitive、interaction 阶段语义及静态边界均有绿门与实际 mutation 红灯证据。上述 gallery-only badge 边界观察与 browser-client 本机 bootstrap 故障均已透明留痕，不构成实现/契约阻断；下游可基于 `4f4b4ac + 670ec29 + 16f764d` 继续集成。

---

## F 批合批验收（2026-07-10）

- **角色**：验收工程师（Opus 4.8 会话）。三不变量核对：实现与验收异会话异模型（实现 = Grok 为主，F-2 前半 = Sonnet；验收 = 本会话，非任一实现前身）；契约未单方面更改（唯一契约缺口 `PartyEdge.markers` 沿用既有 `[需架构拍板]`，本批未动）；纪律对模型一视同仁。
- **对象**：F-1 composer 输入区整备 · F-2 全局动词补全 · F-3 最小 work 能力包。
- **HEAD**：`f6a07c1`（验收开始）。**工作树**：干净；仅 1 份未跟踪文件 `历史实施计划`（superpowers 计划稿，非本批交付，未纳入任何提交）。
- **环境**：Node v25.9.0 / pnpm 9.15.0 / rustc + cargo 1.97.0。干净重装：`rm -rf` 全部 `node_modules` + `src-tauri/target` 后 `pnpm install`（1046 包全 reuse，6.1s，exit 0）。

### 一、干净环境全链实测

| # | 步骤 | 命令 | 实测 | 判定 |
|---|---|---|---|---|
| 1 | install | `pnpm install`（清空后） | 1046 包，6.1s，exit 0 | ✅ |
| 2 | tools | `pnpm --filter @courtwork/tools test` | **193/193**（11 文件，1.26s） | ✅ 契合 SPEC 193 |
| 3 | desktop 单测 | `pnpm --filter @courtwork/desktop test` | **35/35**（8 文件） | ✅ 契合 SPEC 35 |
| 4 | Playwright | `pnpm --filter @courtwork/desktop test:e2e` | **57/57**（20.3s，4 workers） | ✅ 契合 SPEC 57 |
| 5 | 假绿下限 | `assert-test-count.mjs`（链内前置） | 打印「57 条用例（下限 57）」 | ✅ 下限已随 F-2 余量升至 57 |
| 6 | 四门禁 | motion / signature / graph / icons（链内前置） | 逐条打印「通过」 | ✅ |
| 7 | 根 lint | `pnpm lint`（`eslint .`） | exit 0，零 error | ✅ |
| 8 | 生产构建 | `pnpm -r build` | 全包过；desktop `tsc -b && vite build` 4.63s | ✅ |
| 9 | cargo check | `cargo check`（清 target 从零编） | `Finished dev … in 51.01s`，exit 0 | ✅ |

**四门禁打印原文**（e2e 链前置，全部先于 Playwright 通过）：动效属性门禁（仅 transform/opacity/background-color/border-color）· 法理之线（右栏白名单 + 五色封闭集 + icon 品牌单色）· G6 主题（tokens 对齐 + 边色封闭 + 结构化 marker）· SVG 图标（19 具名 SVG / 17 概念 + Lucide 静态按需导入）。生产构建仅余既声明的「单 chunk > 500 kB」提示（图谱 lazy chunk，SPEC 已如实保留）。

**e2e 用例分布核对**（假绿防线不只看总数）：composer 5 + global-verbs 21 + icons 1 + system-open 4 + workbench 26 = **57**，与下限一致。

> 全链绿。判定：**全局标准一达标**。

### 二、git 考古（本批特别项）

F-2 期间 3–4 个会话在共享索引上同编热点文件（`App.tsx` / `styles.css` / `Icon.tsx`），发生多次误吞与前进式修复。逐笔核对 `App.tsx` 提交链（`--follow`）与五处前进式修复的净效果：

| 前进式修复 | 事故 | 净效果核验 |
|---|---|---|
| `6dd8b45` / `fdc5458`（revert 并发 icon rename ×2） | 并发 lucide 迁移会话的「别名名→lucide 规范名」rename 漏进本会话 `App.tsx` 提交 | 两次都把 rename 归还迁移会话；本会话 `App.tsx` 保留自有命名，迁移由 `b629332` 独立提交 |
| `96efdb3`（撤回 `b9d5c14` 误吞的 App.tsx） | 文档提交 `b9d5c14`（F-4 工单）扫走并发会话已暂存的 `App.tsx`（含尚未提交的 `NewCaseDialog` import） | `git rm --cached` 归还未提交态（-21 行含早到的 import）；`95142dc` 后按序重新落地，HEAD `NewCaseDialog` 在位可用 |
| `3604573`（keep icon aliases） | 并发窗口内两套 icon 命名并存 | `Icon.tsx` 增 8 个过渡别名（`case`/`conversation`/`panels`/`settings`/`compare`/`stack`/`columns`/`reset`→同一 lucide 组件），令两套命名都解析，化解冲突 |
| `d145e61`（return concurrent App changes） | 并发 `App.tsx` 改动被带入 | 归还工作树 |

**净效果判定**：

1. **无未授权功能性 hunk 残留**：HEAD `App.tsx` 通读连贯，F-1/F-2/F-3 功能齐备；`App.tsx`/`styles.css` 工作树干净；全链绿。
2. **图标迁移未被误吞或回滚**：HEAD `Icon.tsx` 仍 `lucide-react` 具名导入 + `IconName = keyof typeof standardIcons`（严格联合，`satisfies Record<string,LucideIcon>`）；`tsc -b` 通过即证每个 `<Icon name>` 解析。App.tsx 9 个 + 全 desktop 18 个 icon 名 **全部 ⊆** 别名表，**零孤儿**。App.tsx 最终收敛为 lucide 规范名（`cog`/`panels-top-left`/`briefcase-business`/`message-square-text`/`rows-two`/`columns-two`/`rotate-counter-clockwise`）。
3. **纪律遵守**：全程前进式修正、从未重写共享历史——误吞提交（`b9d5c14`）与其归还（`96efdb3`）**并存于线性历史**，无 rebase/force 痕迹，符合 AGENTS.md 第三/第四判例。
4. **唯一残留（非阻塞）**：`Icon.tsx` 8 个「过渡别名」现已成 dead code（App.tsx 全用规范名，全 desktop 无一处用别名）。其注释「并发案件工作流提交后删除」的条件随 `acd74cc` 落地已满足，可择机清理；不影响构建/门禁/运行。

> 判定：**git 考古通过，净效果正确**。

### 三、当时的 UI 清单 活清单一致性

F 批回填的 13 个「真实实现」项逐一对源码核验，全部属实：

| 当时的 UI 清单 控件 | 工单 | 实现位（已核） |
|---|---|---|
| ⌘K 场景与检索提示 / 命令面板本体 | F-2 | `App.tsx` 标题栏钮 + `Meta/Ctrl+K`；`CommandPalette.tsx`（场景+案件+新建/归档/专注/打开产出文件夹，fuzzy，Esc） |
| composer 按钮族六项 | F-1 | `composer/`（见分项 F-1） |
| AI callout / data-card 复制 | F-2 | `CopyButton` 挂 data-card + generated-callout；e2e 锁定复制文本以 `D04` 起（含来源标记） |
| artifact 放大/全屏（专注模式） | F-2 | `App.tsx` 条件渲染卸装左中栏 + `styles.css:80 transition:none` |
| 新建案件 / 归档案件 | F-2 | `NewCaseDialog`（双入口）/ `ArchiveConfirmPopover`（可逆、无删除） |
| reveal-in-folder / open-file / 打开产出文件夹 | F-3 | `system-open` 工具 + `system-open-client.ts` + 状态条钮 |
| 新建工作稿 / 工作稿编辑面 / 卷宗原件区只读 | F-3 | `WorkDraftPanel`（自动保存、白名单闸）/ `OriginalsZone`（`data-readonly`、无 contentEditable） |

> 判定：**活清单与实现一致**。

### 四、分项验收

#### F-1 composer 输入区整备（Grok）— ✅ 放行

- **八裁决对照**（`composer/Composer.tsx`）：① 按钮族平铺不聚合（上传/案件 chip/发送 + 拍照·语音常驻禁用）✓；② 附件文件名 chip（`AttachmentChip` + 移除/重试/存卷宗）✓；③ 禁用态模板文案（camera/voice `aria-disabled` + `DISABLED_TOOLTIPS`，且 click 与 Enter/Space 键盘激活双拦截）✓；④ 存卷宗 popover 单向（`onCommitToDossier` 置 `scope:'dossier'`，无反向路径）✓；⑤ 全窗拖放（window 级 `dragenter/leave/over/drop` + `dragDepth` 计数正确处理嵌套 drag，只认 `Files`）✓；⑥ ⌘V（`onPaste` 抽文件 item→chip，纯文本落 textarea）✓；⑦ IME 防误发（`composingRef` **与** `nativeEvent.isComposing` 双守卫）✓；⑧ KBD（`⏎ 发送 · ⇧⏎ 换行`）✓。
- **上传真实路由 reading-view**：`process-upload.ts` 调真实 `convertToReadingView`（Composer 默认注入），`needs_ocr` → chip 失败态办案语言（`outcome-copy`），e2e「needs_ocr 呈现为 chip 失败态说明（非空文）」锁定；如实呈现，不吐半坏 md。
- **协议壳零业务逻辑**：`handleComposerSend` 仅 append `localMessages`（注释「壳层只呈现…不新增业务编排」）；`process-upload` 注释「不写卷宗、不发 SessionEvent」。
- **遗留补查（本批要求）**：reading-view 跨包 FNV 修复的**对方 SPEC 留痕原缺**（`packages/reading-view/SPEC.md` 仍写 sha256）→ 追认条件② 不满足，**已按裁决补写**（见该 SPEC 2026-07-10 F-1 追认留痕 + 本会话 fix-by-acceptance 提交）。**FNV 充分性**：FNV-1a 双 32-bit 级联、第二 lane 混入位置量、输出 64-bit，确定性且跨壳同算法，漂移检测充分（偶发碰撞仅致漏报一次漂移、非安全绕过；位置 lane 还挡换位碰撞）。

#### F-2 全局动词补全（Sonnet 前半 + Grok 余量）— ✅ 放行

- **⌘K 兑现**（`App.tsx` + `CommandPalette.tsx`）：打开（标题栏钮/`Meta·Ctrl+K`）、Esc（`App` 统一收口，含优先级栈 palette→newCase→archive→focus）、模糊（`fuzzy-match`）、场景（S1/S3/起草）、案件（动态列出含已归档标注）、新建/归档/专注四操作齐备；**「打开产出文件夹」实调 F-3 `openOutputFolder()`→`systemOpenClient.revealInFolder`（非占位）**，源码注释「F-3 已接通真实 reveal」，e2e「⌘K 打开产出文件夹显示访达反馈」锁定。
- **专注模式**：`{!focusMode && …}` 条件渲染**真卸装**左中栏（非 CSS 隐藏）；`styles.css:80 .workspace{transition:none}` → **0ms 硬切**；Esc 退出；进入时清对照态。e2e 锁定退出后 `.case-rail`/`.conversation` 重新可见（真重挂）。
- **归档可逆 · 全 app 无删除**：`toggleArchive` 布尔翻转 + `ArchiveConfirmPopover`（文案明示「案件内容不会被删除」「随时可取消归档」）；e2e 锁定归档→`archived` class、取消归档→移除、取消不改状态。**全仓 delete 语义核查**：desktop+tools src 仅 `Map.delete`（cache 淘汰），无 `unlink/fs.rm/std::fs::remove/trash`；Rust `delete_credential` 是 keyring 条目移除。docs/decisions/ADR-004-documents-and-files.md 销毁级永不 = 守住。
- **callout 复制含溯源引文**：`CopyButton.getText` 闭包含 domain-badge（D20/D04）等来源标记 + 正文；e2e 锁定 data-card 复制文本 `startsWith('D04')`、callout 复制写入提示全文。
- **十裁决抽查**：裁决 2「全局刷新不做」= 守住（desktop src 无全局刷新控件；`WorkDraftPanel.refresh` 是内部状态同步函数、非全局刷新钮）；裁决 10「下载落点 = 案件文件夹产出子目录 + reveal，不逐次询问」= 落在 `DEMO_OUTPUT_DIR = ${caseRoot}/产出` + `revealInFolder`，无弹窗询问。

#### F-3 最小 work 能力包（Grok）— ✅ 放行

- **越界路径始终可见失败（构造用例亲测）**：直跑 `dist/case-path.js`，10 例全对——相对/绝对/同级兄弟/「工作稿」目录名伪装四类越界均 `outside_case`；原件写入 `original_write_forbidden`、产出写入 `not_work_draft_zone`、工作稿非 md/txt `unsupported_extension`、工作稿 .md 放行。正确性关键：`resolvePath` 先坍缩 `..` 再比前缀，越界判定先于分区判定，伪装路径挡得住。（详见 `packages/tools/SPEC.md` F-3 验收留痕。）
- **宿主零 shell**：`capabilities/main.json` 权限 = `core:default` + `opener:allow-open-path` + `opener:allow-reveal-item-in-dir`（无 shell/fs-write/网络）；`lib.rs` 仅 3 凭证命令 + `tauri_plugin_opener::init()`（注释「任意 shell 执行不在能力面」）；`SystemOpenHost` 仅 reveal/open 两动词。
- **工作稿只写工作稿区 · 原件区无编辑入口（含无障碍树）**：`work-draft-store` 全部写入过 `assertWorkDraftWritable` 闸（越界/原件硬拒、失败经 `onFeedback` 可见）；`OriginalsZone` `data-readonly="true"`、无 `contentEditable`、仅 reveal/open 查看动作，a11y 树只读；e2e「卷宗原件区只读：无 contentEditable、无编辑入口」锁定。工作稿 `WorkDraftPanel` 才是 `contentEditable`（合规——它落在「工作稿」区）。
- **子路径导出未把 node:net/web-fetch 打进 desktop 包**：desktop 生产包 grep `node:net`/`BlockList`/`jsdom`/`readability` 均 **0 命中**，仅 `web_reference` 字面量（contract.ts 判别联合，良性）。`./case-path`/`./system-open`/`./contract` 三子路径导出隔离成功。

### 五、对照记录：同约束体系下 Sonnet 段 vs Grok 段（实验数据，供架构选型）

同一 CLAUDE.md/AGENTS.md 纪律、同一 SPEC 契约、同一门禁体系下，两段实现的装配质量对比。归属（git 核实）：**Sonnet** = `cc42a7a`(fuzzy-match, TDD) · `95142dc`(新建案件) · `1692630`(复制按钮/F-2 第五项)；**Grok** = `16002e2`(F-1 composer) · `7688a3a`+`63d7198`(F-3) · `acd74cc`(F-2 余量)。

| 维度 | Sonnet 段（fuzzy-match / 新建案件 / 复制按钮） | Grok 段（F-1 / F-3 / F-2 余量） |
|---|---|---|
| **任务体量/性质** | 小而独立的纯函数与轻组件（模糊匹配、两步对话框、复制钮） | 大面、含安全关键面（路径白名单、宿主能力、子路径打包隔离）与跨包接通 |
| **缺陷密度** | 0 缺陷（fuzzy 边界干净、CopyButton 剪贴板拒绝优雅兜底、NewCaseDialog 校验齐） | 0 阻塞缺陷；1 低危 demo 边界（见发现②）；1 dead-code 残留源自并发 churn（见考古④） |
| **规格贴合度** | 高、克制——严格落在裁决面，不多做（如 fuzzy 只做子序列打分） | 高、且把红线做成**结构性不可违反**（判别联合失败分支无 data、`resolvePath` 先坍缩、能力面最小化） |
| **自主发现质量** | 中——TDD 纪律好（fuzzy 先测后码），但发现面窄 | 高——自主定位并修 reading-view `node:crypto` 打包阻塞（FNV 换实现）、自造子路径导出挡 `node:net`、越界判定顺序（坍缩先于分区）等非显性正确性 |
| **纪律副作用** | 无 | 1 处**留痕纪律疏漏**：跨包 FNV 修复未在对方 SPEC 留痕（追认条件②），验收补写 |
| **工程惯用** | 干净、可测、注释到位 | 干净、注释密度高（每个红线点有「为什么」注释），防御式（drag 深度计数、IME 双守卫） |

**综合**：两段在本约束体系下**都达到可放行质量、零阻塞缺陷**。差异在**任务难度而非纪律水位**——Sonnet 段承接的是规格完备的小件、交付克制无瑕；Grok 段承接的是大面 + 安全关键 + 跨包接通，展现了更强的**自主发现**（把三处非显性的正确性/打包/安全问题就地解决），代价是一处**留痕纪律疏漏**（宜以「跨包修复完工必在对方 SPEC 留痕」入手册硬化）。对选型的读法：**Grok 适配「中大型、规格完备但含隐性硬骨头」的装配+接通连体任务**（与现行「实现默认 Grok」任命一致）；**Sonnet 在小而定义清晰的件上稳定无瑕、TDD 自觉好**，可作规格完备小件的可靠承接与 Grok/Opus 不可用时的兜底。样本量小（各 3 件），结论供参考，不作单点定性。

### 六、发现与处置

| # | 发现 | 严重度 | 处置 |
|---|---|---|---|
| ① | reading-view 跨包 FNV 修复未在 `packages/reading-view/SPEC.md` 留痕（追认条件②），SPEC 仍写 sha256 | 中（纪律） | **已补写**（reading-view SPEC 追认留痕 + 行内更正），fix-by-acceptance 提交 |
| ② | `openOutputFolder`/`revealOutputDocx` 等系统动词调用位硬编 `DEMO_OUTPUT_DIR` 常量，未用 `outputPath(caseRoot)` 从当前案件派生；demo 案件正常，**新建（非 demo）案件点「打开产出文件夹」会得可见 `outside_case` 拒绝** | 低（demo 边界，失败可见非静默） | 记录；建议 F-4/真实接线时改用 `outputPath(caseRoot)`（helper 已在 case-path.ts 存在），不阻塞演示（演示用 demo 案件） |
| ③ | `Icon.tsx` 8 个过渡别名现为 dead code | 低（无害） | 记录；注释预设的清理条件已满足，可择机删 |
| ④ | `opener:*` 权限未在 Tauri ACL 层做路径 scope，案件白名单实际强制在 JS | 低（观察） | 记录；MVP 可接受（CSP 紧 + 无远程内容 + 无损级动词），Stage 1 可加 ACL scope 作纵深防御 |
| ⑤ | desktop SPEC 顶层「验证记录」节仍留 17/17 历史快照（各分期节已有当期数，最新 57） | 低（文档卫生） | 记录，非缺陷（append-only SPEC 的历史层） |
| ⑥ | `CopyButton` 用 `navigator.clipboard`（Web API），仅 Playwright chromium 实测；真实 Tauri WKWebView 未单独验证 | 低（观察） | 记录；用户手势下通常可用，catch 已优雅兜底 |

无契约级问题（唯一契约缺口 `PartyEdge.markers` 沿用既有 `[需架构拍板]`，本批未触）。除发现①（已按裁决补写）外，其余均为非阻塞记录项。

### 七、结论（三问）

1. **三单各自是否放行**：
   - **F-1 composer 整备 —— 放行 ✅**（八裁决全兑现、上传真实路由 reading-view、协议壳零业务逻辑；遗留补查①已补齐）。
   - **F-2 全局动词 —— 放行 ✅**（⌘K 全项兑现含真实 reveal、专注 0ms 真卸装、归档可逆且全 app 无删除、callout 复制含溯源、十裁决抽查守住）。
   - **F-3 最小 work 能力包 —— 放行 ✅**（越界亲测全拒、宿主零 shell、原件只读含无障碍树、子路径导出隔离 node:net 成功）。

2. **产品可用面是否达「对外可演示版」增补标准**：**达标 ✅**。composer + 全局动词（⌘K/新建/归档/专注）+ 系统动词（reveal/open/产出文件夹）+ 工作稿轨（新建/自动保存/原件只读）四面均为**真实实现**，由 193(tools)+35(desktop 单测)+57(e2e) 共 285 项自动化 + 干净构建 + cargo check 锁定。**演示注意**：系统动词在浏览器为 mock、真实访达行为须在 **Tauri app 内**跑；演示用内置 demo 案件（新建案件为 in-app 注册 + 指向既有文件夹，不落盘 mkdir，且见发现②）。以此边界演示，达「对外可演示版」增补标准。

3. **工作树是否安静可放行 F-4 开工**：**可放行 ✅**。全链绿、`App.tsx`/`styles.css` 工作树干净、git 历史线性无重写、无契约悬案（除既有 `[需架构拍板]`）。本次验收新增提交（reading-view 追认留痕 fix-by-acceptance、tools SPEC + 本报告）均路径显式、未吞未跟踪计划稿。建议 F-4 开工前顺手清理发现②③（均低危、非阻塞）。

> **总判定：F 批三单全部放行，产品对外可演示面达标，工作树安静，F-4 可开工。**

---

## F-4 验收（文件操作分级与卷宗整理 / FileOpsPlan，2026-07-11）

- **角色**：验收工程师（Opus 4.8 会话，AGENTS.md 全判例适用）。实现者：Grok（四层 `d559678` schemas → `f98a55c` tools → `d49080a` registry → `06cb66c` desktop）。三不变量：实现与验收异会话异模型；契约未单方面改（FileOpsPlan 走 docs/decisions/ADR-004-documents-and-files.md 拍板 + 工单任命的「提案合入」，见下）；纪律一视同仁。
- **HEAD**：`6ae568d`（main）。**环境**：Node v25.9.0 / pnpm 9.15.0 / cargo 1.97.0；干净重装（`rm -rf` 全 node_modules + `pnpm install`，exit 0）。
- **git 现场如实声明**：验收期同仓有并发会话活动（`历史实施计划`、`eval/ACCEPTANCE.md` W7.1、`.obsidian/`、`usecase/*.pdf`、一个 `acceptance-temp` 命名 stash）。本会话诊断期误用 `git stash -u`+`git checkout <sha>` 复核旧提交，触发 stash pop 冲突并短暂 detached HEAD；已前进式收拾：`pnpm-lock.yaml` 冲突还原为 HEAD 版（并发会话的 620 行 lock 改动仍留存于其 stash，无损）、`eval/ACCEPTANCE.md` 撤出暂存（不提交、不还原其内容）、HEAD 重挂 `main`。**未 drop 他人 stash、未提交任何并发会话文件、未重写共享历史**。教训：验收复核旧提交应用独立 worktree，勿在共享工作树上 stash/checkout。

### 一、干净环境全链实测

| # | 步骤 | 实测 | 判定 |
|---|---|---|---|
| 1 | install | 清空重装 exit 0 | ✅ |
| 2 | schemas | **94/94**（10 文件） | ✅ |
| 3 | tools | **204/204**（13 文件） | ✅ |
| 4 | registry | **38/38**；builtin = `['S1','S2','S3','S4','S6']`，含 S6 专项用例 | ✅ |
| 5 | Playwright | **60/60**（20.5s）；假绿下限 `minimum=60` | ✅ |
| 6 | 四门禁（drift 实跑） | motion/signature/graph/icons 逐条「通过」 | ✅ |
| 7 | 生产构建 `pnpm -r build` | 初测**红（core TS2741）→ 验收补漏后绿** | ⚠️→✅ |
| （附） | core / desktop 单测 | core **156/156**、desktop **35/35** | ✅ |

### 二、契约核对（本单重点）

- **FileOpsPlan 忠实 docs/decisions/ADR-004-documents-and-files.md**：`FileOpsVerbEnum = z.enum(['move','rename','copy','mkdir'])`，源码注释「故意不含 delete/overwrite——销毁级永不进入能力面」。**无 delete 三重证**：① 类型层 `safeParse('delete'/'overwrite'/'rm')===false`；② schemas `file-ops-plan.test.ts` `.options` 精确断言；③ tools `file-ops-redline.test.ts` **源码 grep** 禁 `verb:'delete'`/enum 带 delete 字面量（允许中文注释「删除」）。`contentHashBefore/After`（move/rename 应相等 = 零字节证据）、`originalFileName`、`selected` 齐；两层 schema `.strict()` + superRefine（mkdir 无 source / 余必带）。
- **ArtifactTypeEnum 扩展消费方核对**：`'FileOpsPlan'` 追加为纯增量。RevisionEvent 可用范围 ✅（`artifactType` 可取 FileOpsPlan，契合 docs/decisions/ADR-004-documents-and-files.md「修正=RevisionEvent」）、registry S6 引用 ✅、UI ✅。**但 `packages/core` 的 `ARTIFACT_SCHEMAS: Record<ArtifactType, ZodType>` 穷尽映射被漏——见发现①（已修复）**。
- **CaseFile 增量纯加法**：`originalFileName?`/`contentHash?` 均 optional，schema 非 strict，既有消费方零破坏。✅
- **「提案合入」格式**：`packages/schemas/SPEC.md:62` 以 W4 先例（RevisionInstructionSet）同款格式记录 F-4（「docs/decisions/ADR-004-documents-and-files.md 已拍板 + 工单任命」，非单方改契约）。✅ 唯「受影响消费方」句漏列 core（发现①的文档面）。

### 三、tools→schemas 依赖 + 浏览器包隔离

- `packages/tools` 新增 `@courtwork/schemas`（`dependencies`，`file-ops-executor` 需校验 FileOpsPlan artifact）。方向向上指向 schemas 根，**合法**，与 CLAUDE.md「可依赖」修正一致。
- desktop 子路径 import `@courtwork/tools/{case-path,contract,system-open,file-ops-executor,file-ops-host}`；生产包实测 `node:net`/`BlockList`/`web-fetch`/`jsdom`/`readability` **均 0 命中**（仅 `web_reference` 字面量 7 次，contract 判别联合，良性）。web-fetch 的 `node:net` 未入浏览器壳。✅

### 四、执行器语义亲测（隔离直跑 + 读断言真实性）

`file-ops.test.ts`+`file-ops-redline.test.ts` 11 例隔离全绿，逐条核断言：
- **吃已确认计划 / 未确认拒执行**：`execute` 先 `FileOpsPlanSchema.safeParse`（非法抛错），仅执行 `selected:true`；`selected:false` → applied 0 / skipped 1；**单文件 move 同样必须勾选才执行**（`selected` 即轻确认形态）。✅
- **哈希比对留痕**：move 记录 `contentHashBefore===After===hashBytes(原文)`；不等则回滚 + 拒绝。✅
- **撤销后内存 FS 快照逐字节一致**（亲跑）：`host.snapshot()` before/after `size` 相等 + 每路径 `[...restored].toEqual([...content])`（真·逐字节，非仅存在性）。✅
- **事务日志无删除路径**：`'deleteLog' in executor===false`、grep 禁 `deleteLog/clearLog` 可调用形态；undo 只 `move-back`/`remove-copy`/`remove-empty-dir`（回退加法创建物，**不删原件**）；`undoneAt` 标记后日志仍在 map、不可二次撤销。`FileOpsHost.removeFile/removeEmptyDir` 注释明确「仅供 undo 逆向，不作为用户/agent 能力」，不入契约/verb 枚举。✅
- **目标已存在拒覆盖**：move 到已存在目标 → failed「拒绝覆盖」、源仍在。✅

### 五、S6 声明完整性（`S6.yaml` + strict）

触发**双通道**（`fileTypes: pdf/docx/md/txt/jpg/png` + `userActions: drop-unsorted-files/open-file-ops-scene`）；`outputArtifacts:[FileOpsPlan]`；工具位 `[copy-file, mkdir, file-ops-executor]` 齐；`uiTemplateId: file-ops-plan-panel`；门禁 `confirmationGates:[{artifact:FileOpsPlan, label:"…单文件也需轻确认；大批量强制抽看"}]`（分层确认）。registry `scenario.ts` `.strict()` + loader `safeParse` → S6 过 strict（registry 38 绿，含「S6 produces FileOpsPlan with plan confirmation gate and move-capable tools」专项）。✅

### 六、UI 走查（`FileOpsPlanPanel` + e2e）

计划表列齐：勾选 / 动词 / 源 / 目标 / **理由** / **原始文件名** / **哈希**；执行报告（已执行/跳过/失败 + 每行 verb→target·哈希）；撤销**轻 popover**（「撤销后文件回到整理前位置与名称。事务日志仍保留」+ 取消/确认撤销）；大批量（`selected≥5`）提示「抽看理由」；单文件也过「确认并整理」。**全 app 仍无删除入口**——e2e `file-ops.spec.ts` 显式 `getByRole('button',{name:/删除/}).toHaveCount(0)` + 原名留痕断言，另两例锁 S6 计划执行/报告与撤销 popover 流。当时的 UI 清单 回填属实（行 111–113「卷宗整理计划表/执行报告/撤销整理」F-4 真实实现，行 110 原件区补「展示原始文件名留痕」）。✅

### 七、边界记录 + git 卫生

- **边界（checklist 7）**：演示宿主为内存 FS（`file-ops-demo.ts` `createMemoryFileOpsHost`，与 F-3 mock 同构），不触真磁盘；真磁盘/Tauri host 为已知后续（`file-ops-host.ts` 已留注入点）。此边界原仅在**代码注释**中如实，未上 SPEC——已 fix-by-acceptance 于 `apps/desktop/SPEC.md` F-4 节补一行声明（发现②）。
- **git 卫生（checklist 8）**：四层提交文件清单**各守其层**——schemas 只碰 `packages/schemas/*`、tools 只碰 `packages/tools/*`(+lockfile)、registry 只碰 `packages/registry/*`、desktop 只碰 `apps/desktop/*`(+ 授权的 当时的 UI 清单 回填)；无跨层污染、无他人文件删改。✅

### 八、发现与处置

| # | 发现 | 严重度 | 处置 |
|---|---|---|---|
| ① | **F-4 消费方补漏**：`ArtifactTypeEnum` 增 `FileOpsPlan` 未同步 core `ARTIFACT_SCHEMAS` 穷尽 Record → `tsc` TS2741、`pnpm -r build`（生产构建）红；companion 测试「六项」硬编断言亦失败 | 🔴（阻塞生产构建） | **已 fix-by-acceptance 修复**：Record 补 `FileOpsPlan: FileOpsPlanSchema`；guard 测试改从 `ArtifactTypeEnum.options` 派生（防再漂移）。core 156/156、`pnpm -r build` 转绿。建议 schemas SPEC 的 F-4「受影响消费方」句补 `packages/core` |
| ② | 内存 FS 演示边界原仅在代码注释、未上 SPEC | 🟡 | 已补写 desktop SPEC F-4 节一行 |
| ③ | `contentHash` 字段 schema 注释写「sha256 hex」，但演示 host `hashBytes` 用 FNV-1a 64-bit | 🟢 | 内存演示做「零字节变动」比对足够（确定性、before==after）；真磁盘 host 若要面向证据完整性宜用 sha256，记录留待真实接线 |
| ④ | `copy` 仅支持文件、不支持目录（`move` 支持目录） | 🟢 | MVP 边界，docs/decisions/ADR-004-documents-and-files.md「整案打包」如需目录复制再扩，记录 |
| ⑤ | 执行器对同 planId「撤销后再执行」会覆盖内存 map 中的已撤销日志（append-only 留痕靠未来真实落盘保证） | 🟢 | 演示不触发（每次 reset 新 planId）；真实落盘存储接入时保证 append-only，记录 |

无契约级违规（FileOpsPlan/ArtifactTypeEnum/CaseFile 增量均合法，走提案合入）。除①（已修复、曾阻塞）外均非阻塞。

### 九、结论（三问）

1. **F-4 是否放行**：**放行 ✅**（附条件已就地满足）。全链绿（生产构建经验收补漏①后转绿）、契约忠实 docs/decisions/ADR-004-documents-and-files.md（无 delete 三重证）、执行器语义亲测（撤销逐字节一致、未确认拒执行、日志不可删）、S6 声明完整、UI 无删除入口 e2e 锁定。**放行前提**：发现① 的 core 补漏为验收 fix-by-acceptance 修复项，需并入本批；若架构要求由实现会话回修，则本单转「有条件放行，待 core 补丁合入」。
2. **S6 卷宗整理是否可进演示剧本**：**可进 ✅**。场景双通道触发、计划表→确认→执行→报告→撤销全链 e2e 锁定，演示宿主内存 FS 剧本自洽（乱文件入库→归档/规范命名/隔离重复→一键撤销）。**演示口径**：内存 FS，不落真实磁盘（真磁盘/Tauri 为后续），演示时如实说明即可，不影响「卷宗整理杀手场景」的对外呈现。
3. **FileOpsPlan 契约是否背书**：**背书 ✅**。动词封闭集（move|rename|copy|mkdir，delete/overwrite 类型+JSON Schema+源码 grep 三拒）、哈希前后 + originalFileName 留痕字段、CaseFile 纯增量、ArtifactTypeEnum 增量，均忠实 docs/decisions/ADR-004-documents-and-files.md 且以 W4「提案合入」格式入档。唯一附注：消费方枚举须含 core `ARTIFACT_SCHEMAS`（本次已补齐并加固 guard）。

> **总判定：F-4 放行（含验收 fix-by-acceptance 修复 core 消费方补漏①）；S6 卷宗整理可进演示剧本（内存 FS 口径）；FileOpsPlan 契约背书。**

---

## D-1 验收（真机三缺陷 + 死路由/容器作用域，2026-07-11）

- **角色**：验收工程师（Opus 4.8，AGENTS.md 全判例 + worktree 复核纪律）。实现者：Grok，两提交 `4f59ab9`（凭证探针三态）+ `5541d9c`（容器隔离/溢出/切换矩阵），均只碰 `apps/desktop/*`（层洁）。
- **HEAD**：`debe6e5`（main）。**环境**：Node v25.9.0 / pnpm 9.15.0 / cargo 1.97.0；干净重装 exit 0。
- **worktree 纪律**：本单不复核旧提交、无 stash/checkout（吸取 F-4 教训，`478f5e7` 已修宪）。**git 现场如实**：工作树仍有前批并发会话的未提交 work（`eval/ACCEPTANCE.md` + `.obsidian/`/`usecase/` untracked + `acceptance-temp` stash），**非本会话产物、原样未动**；我的提交仅含显式路径的自有文件。

### 一、干净环境全链实测

| # | 步骤 | 实测 | 判定 |
|---|---|---|---|
| 1 | install | 清空重装 exit 0 | ✅ |
| 2 | desktop Vitest | **45/45**（10 文件） | ✅ |
| 3 | Playwright | 干净全跑初测 **66/67（1 假红）→ 验收修复后稳定 67/67** | ⚠️→✅ |
| 4 | 假绿下限 | `minimum=67`；`--list` 定义 67 条 | ✅ |
| 5 | 四门禁 | motion/signature/graph/icons 逐条通过 | ✅ |
| 6 | pnpm -r build | **9 包**全绿（schemas/registry/core/tools/output/reading-view/demo-data/eval/desktop） | ✅ |
| 7 | cargo test | **2/2**；亲读断言：`status`/`failed` 序列化不含 `secret`/`value`/`Keyring`/`password`，仅 `phase`/`source`/`failureMessage`（`&'static str` 定值） | ✅ |

**Playwright 假红根因（本单最值得记录）**：干净全跑首测 66/67，唯一失败 `global-verbs.spec.ts:213 命令面板·方向键在结果间移动高亮`（`aria-selected` 期望 `true` 实得 `false`，行 217）。该用例 F-2 起就在、F-2/F-4 恰好过。隔离单跑 6/6 绿一度误判并行 flake；深挖发现**顺序重复也 5/12 红**——真因是 `openWorkbench` 点「先查看演示」后光标停在面板中心，命令面板一渲染，光标下选项 `onMouseEnter` 抢占初始高亮，令首项 `aria-selected` 初值随机（非 rAF 聚焦竞态；我的首个 `toBeFocused` 修法定错根因、已自我纠正）。**fix-by-acceptance**：keyboard-only 导航用例前 `page.mouse.move(0,0)` 移开光标。验证：顺序 15/15、并行 8/8、全套 67/67 连过 4 次。属 F-2 遗留的测试脆弱性，非 D-1 产品缺陷。

### 二、凭证连接探针三态（信任级重点）

**无任何「乐观已连接」路径——状态只能由探针派生，代码双侧核实：**
- **TS `client.ts`**：`ConnectionPhase = pending|connected|failed`；`status()` 每次 `invoke('provider_credential_status')`（catch→failed），注释「不缓存乐观态」；`save()` 先格式校验（失败即 failed），Tauri 路径 `connected` **只来自 Rust 返回**（浏览器 `connected` 仅 Playwright 用、且格式门控）。
- **Rust `lib.rs`**：`credential_status()` 的 `connected` **只在真读到钥匙串密钥 + 格式过**（pasted）或**环境变量解析到非空**（environment）时返回；`read_source`/`get_password` 任何 `Err`/`NoEntry`/空/短 → `pending`/`failed`。`save_provider_credential` 末尾**再调 `credential_status()` 复探**，不乐观返回 connected。序列化仅 3 字段、`failure_message` 是 `&'static str` 定值，结构上不可能夹带 secret。
- **Playwright 三分支 + 不关窗**（`d1-case-scope.spec.ts`）：未配置→`data-phase=pending`「待连接」不含「已连接」；强制 failed→「连接失败」+ title 引导文案；合法保存→「已连接」；**短凭证保存失败→`provider-setup-error` 可见、对话框保持 visible、状态条不「已连接」**。`ProviderSetup.save()` 仅 `phase==='connected'` 才 `onClose`。
- **引导文案零技术概念**：「连接文书助手」「粘贴访问凭证/使用电脑已有凭证」「只保存到电脑的安全凭证库，不写入案件记录/运行记录/使用统计」——无 API key/token/keychain 黑话。
- ⚠️ **真实钥匙串拒绝路径无法自动化**：代码路径已核（`get_password → Err(_) → failed(钥匙串授权未通过)`），但真机钥匙串弹窗拒绝/错误密码需**用户真机复测一次**（见结论清单）。

### 三、demo 语料容器隔离

- **isDemo 角标**：标题栏 `demo-case-badge`「样板案·演示」+ 案卡 `data-demo` + `case-demo-badge`。✅
- **DEMO_ARTIFACTS 仅 demo 回落**：`App.tsx` `riskList/timeline/graph/matrix = isDemoCase ? (session ?? DEMO_ARTIFACTS) : session`（注释「禁止 `?? DEMO_ARTIFACTS` 污染真实案件」）；非 demo 得 `undefined`→空态。✅
- **新建案五工作面 + 对话 + chrome（当时的 UI 清单 #8 五处逐一）**：e2e 锁新案→5 视图 `case-empty-state`、无 user-message/风险卡/flow-s1/originals；titlebar=新案名、stage=「尚未开始阶段」、statusbar-progress=「新案件·等待任务」、statusbar-stage=「尚未开始阶段」、viewCount=「尚无」。**四处已闭：标题栏 ✅ / 面包屑阶段 ✅ / 时间线计数 ✅ / 状态条摄取与用量 ✅**。
  - ⚠️ **第五处「composer 文件夹 chip 跨案件粘滞」未闭（发现①）**：`App.tsx:704` 渲染 `<Composer>` **未传 case props/key**，chip 恒取 `DEMO_CASE_OPTIONS`（静态临江案），新建案下仍显示 demo 案名（且附件会挂错案）。`CASE_SCOPE_AUDIT` 与 SPEC 死路由表**均漏登此符号**。此项使 demo 隔离未 100% 关账。

### 四、死路由 / 容器作用域

- **`CASE_SCOPE_AUDIT`（10 行）逐行抽查定性合理**，且与 `App.tsx` 实码交叉核对：容器切换 `useEffect`（selectedCaseId 变）整体 `__clear__` + 重置全部案件域态、demo→S3/非demo→null；死路由三项（DEMO_ARTIFACTS 回落 / caseRoot 回落 / DEMO_OUTPUT 直读）均已按表所述改为派生。唯**漏登 composer chip**（见发现①）。
- **切换矩阵测试真实覆盖**：`d1-case-scope.spec.ts` demo(A) 有 S3 状态 → 新建 B 零继承（无风险卡/output-docx-card、statusbar「新案件」）→ 回 A 恢复 demo → 再进 B 仍空。往返零继承 ✅。
- **产出路径由 caseRoot 派生（F 批发现②销账确认）**：`resolveCaseRoot(active)` 非 demo 无 folderPath 返回 undefined、绝不回落 DEMO 根；`openOutputFolder` 走 `caseOutputDir(caseRoot)`，无 caseRoot 时「本案尚未绑定文件夹」可见反馈。**F-4 报告发现②（openOutputFolder 硬编 DEMO 常量）本单已销账。** ✅

### 五、溢出审计

- **长案名（34 字中文）归档 popover**：`ArchiveConfirmPopover` 的 `.archive-case-title.truncate` + `title=全名`；e2e 断言 `text-overflow:ellipsis` + `title` 属性。✅
- **全局 ellipsis 抽查**：`.truncate`（标题栏案名/案号、案卡、阶段行、状态条进度/阶段）、`.credential-button{max-width:200px;ellipsis}`（凭证钮）、`.mono-ellip`/`.case-chip-label`（composer chip）、`.user-message-attachments span{max-width:160px}`。chip/标题/阶段/凭证钮四类均覆盖。✅

### 六、当时的 UI 清单 #9 蓝色团块

⚠️ **排查结论不在案（发现②）**：SPEC D-1 节、styles.css、两提交 message 均无 #9 结论；静态 CSS 扫描未见 fixed/absolute 蓝色定位元素或 bottom/right 蓝色规则。checklist 6 要求「修复或定性在案」未满足——需实现者真机运行时目视排查（拖拽 ghost / focus outline 残留 / 渲染残留）并记录，本单无法从静态码定性。

### 七、git 卫生

两提交文件清单**各守 `apps/desktop/*`**：`4f59ab9` = lib.rs / ProviderSetup.tsx / client.ts+test / main.tsx；`5541d9c` = App.tsx / case-scope.ts+test / d1-case-scope.spec.ts / ArchiveConfirmPopover.tsx / styles.css / SPEC.md / assert-test-count.mjs / workbench.spec.ts / 2 截图。无跨层污染、无他人文件改删。✅

### 八、发现与处置

| # | 发现 | 严重度 | 处置 |
|---|---|---|---|
| ① | **composer 文件夹 chip 未案件作用域**（当时的 UI 清单 #8 第五处）：`<Composer>` 未传 active case，chip 恒显 demo 案名；audit/SPEC 均漏登 | 🟡（信任级·demo 隔离未闭） | **不属 fix-by-acceptance 范围**（产品行为改动，非测试/类型/构建）→ 打回实现者：给 Composer 注入 activeCase 投影并随切换重置，或非 demo 隐藏该 chip；同时补登 `CASE_SCOPE_AUDIT` |
| ② | 当时的 UI 清单 #9 蓝色团块排查结论不在案 | 🟡（checklist 6 未满足） | 打回：真机目视排查 + 记录（本单静态扫描无明显 CSS 定位元素，需运行时复现） |
| ③ | 命令面板方向键用例假红（F-2 遗留脆弱性，光标 hover 抢初始高亮） | 🟢→✅ | **已 fix-by-acceptance**（`mouse.move(0,0)`），稳定 67/67 |

### 九、结论

**四项信任级缺陷关账判定：**
1. **凭证探针三态 → 关账 ✅**（TS+Rust 双侧无乐观 connected、save 复探、三分支+不关窗 e2e、零技术文案；唯真实钥匙串拒绝流待真机复测一次，属固有不可自动化项、非码缺口）。
2. **demo 语料容器隔离 → 有条件关账 ⚠️**：五处 chrome 已闭四处，**composer 文件夹 chip（#8-⑤）未案件作用域，须打回补一次**方可全闭。
3. **容器作用域 → 关账 ✅**（audit 定性合理且与实码一致、切换矩阵往返零继承 e2e、产出路径由 caseRoot 派生并销账 F 批发现②；唯 audit 漏登 composer chip，随发现①一并补）。
4. **溢出 → 关账 ✅**（长案名截断 + 全局 ellipsis 抽查齐）。

**真机复测清单（留给用户的手动项）：**
1. **错误密码 / 钥匙串拒绝流**（唯一不可自动化的探针路径）：真机构建里输入一次错误凭证或触发钥匙串拒绝，确认显示「连接失败」+「钥匙串授权未通过…」、对话框不关闭、绝不「已连接」。
2. **环境变量凭证真机流**：用真实存在的环境变量名保存，确认仅解析到非空值才「已连接」（否则「电脑中未找到/为空」）。
3. **当时的 UI 清单 #9 蓝色团块**：真机目视右下角是否仍有蓝色团块，排查来源并把结论回填 当时的 UI 清单 #9。
4. （可选）真机确认 composer 文件夹 chip 在新建案件下的呈现（本单静态判定为 demo 案名粘滞，见发现①）。

> **总判定：凭证探针三态 / 容器作用域 / 溢出 三项关账；demo 隔离有条件关账（composer chip #8-⑤ 须打回补一次）。Playwright 假红已 fix-by-acceptance 修复至稳定 67/67；当时的 UI 清单 #9 排查结论待补。真机复测四项清单交付用户。**

## UX-1 / SET-1 合批验收（批次一 10 项 + D-1 打回 0a/0b + 设置页清单，2026-07-11）

- **角色**：验收工程师（Opus 4.8，AGENTS.md 全判例 + worktree 复核 + 尾随 echo 判例）。范围两单：**UX-1**（当时的 UI 清单 批次一 #1–#10 + D-1 打回 0a/0b，实现落点已在 当时的 UI 清单 表）与 **SET-1**（当时的 UI 清单 设置页清单，提交 `0f82141`/`841cbe0`/`c9960e8`）。UX-1 实现落于 `34ef2c5`(feat)+`fa3040f`(e2e)+`bbf2fa6`/`08d2f70`(docs)。
- **环境**：Node v25.9.0 / pnpm 9.15.0。清除全部 `dist` + `*.tsbuildinfo` 后从零构建。
- **git 现场如实（HEAD 漂移已记录）**：验收开工 HEAD=`aabd54b`（合批 prompt）；验收进行中并发架构会话（"Courtwork Architecture (Cowork)"）追加两提交 `7d6c06c`+`09f15c8`，HEAD 前移至 `09f15c8`。**两提交经核 docs-only**（当时的 UI 架构裁决 + 手册；`git show --name-only` 不含 `apps/desktop`/`packages/`）。**被验代码即 `c9960e8`（apps/desktop 最后一次落码），全程逐字节未变**——build/test/e2e 证据不因 HEAD 漂移失效。工作树另有前批/他会话遗留 `eval/ACCEPTANCE.md`(M) + `历史实施计划`(??)，非本会话产物、原样未动。

### 一、干净环境全链实测

| # | 步骤 | 实测 | 判定 |
|---|---|---|---|
| 1 | 清 dist/tsbuildinfo + `pnpm -r run build` | **9 包全绿 exit 0**（schemas/registry/core/tools/output/reading-view/demo-data/eval/desktop）；唯 desktop 产物 chunk >500kB 为构建 advisory（非阻断） | ✅ |
| 2 | desktop Vitest | **55/55（13 文件）exit 0** | ✅ |
| 3 | 全库 Vitest | **723/723（83 文件）exit 0**（跨包回归无溢出） | ✅ |
| 4 | Playwright | **78 passed（28.0s）exit 0**，零 flaky/零 skipped；退出码单独查=0。分布：workbench 26 / global-verbs 21 / ux1 7 / d1-case-scope 7 / composer 5 / system-open 4 / settings 4 / file-ops 3 / icons 1 | ✅ |
| 5 | 假绿下限 | `assert-test-count.mjs` minimum=**78**；`playwright --list` Total=**78** | ✅ |
| 6 | 四门禁 | motion（仅 transform/opacity/bg/border-color）✅ ／ signature（右栏白名单+五色封闭集+icon 品牌单色）✅ ／ graph（tokens.json 对齐+边色封闭+矛盾 marker）✅ ／ icons（19 具名 SVG/17 概念+Lucide 静态按需）✅ — 逐条 exit 0 | ✅ |

> 假绿下限演进链自洽：D-1=67 → UX-1(`fa3040f`)=74 → SET-1(`841cbe0`)=78（settings.spec 4 条）。

### 二、UX-1 打回项 0a：composer chip 案件作用域（D-1 发现①关账）

D-1 发现①（`<Composer>` 未传 case props、chip 恒显 demo 临江案名、audit/SPEC 漏登）——本单四证闭环：

- **投影注入**：`ComposerProps` 增 `cases?`/`activeCaseId?`（[Composer.tsx:29-31](apps/desktop/src/composer/Composer.tsx:29)，注释"禁止默认 DEMO 粘滞到真实容器"）；App 真投影 `cases={cases.map(...)}` `activeCaseId={selectedCaseId}`（[App.tsx:801-809](apps/desktop/src/App.tsx:801)）；`DEMO_CASE_OPTIONS` 仅孤立预览/单测回落（[Composer.tsx:63-64](apps/desktop/src/composer/Composer.tsx:63)）。
- **切换重置**：`useEffect([activeCaseId])` 同步 chip、关菜单、清 containerize、真变更时清附件（[Composer.tsx:81-98](apps/desktop/src/composer/Composer.tsx:81)）；chipLabel 取 `selectedCase.name`，无容器示"选择案件"（[Composer.tsx:243](apps/desktop/src/composer/Composer.tsx:243)），零硬编码临江。
- **`CASE_SCOPE_AUDIT` 补行**：新增 `'Composer DEMO_CASE_OPTIONS / case chip'` 定性 `死路由→已改 activeCase 投影注入；随 selectedCaseId 重置；非 demo 禁止粘滞临江案名`（[case-scope.ts:100-104](apps/desktop/src/case/case-scope.ts:100)）。审计漏登已补。
- **切换矩阵 e2e 含 chip 断言**：[d1-case-scope.spec.ts:91-122](apps/desktop/tests/e2e/d1-case-scope.spec.ts:91) A(demo,S3)→新建 B 零继承→回 A 恢复→再进 B 空；**第 118-121 行 chip 断言**：`composer-case` `toContainText('案件乙')` + `not.toContainText('临江')`（标签 UX-1 0a）。单测 [case-scope.test.ts:41-47](apps/desktop/src/case/case-scope.test.ts:41) 断言 audit≥11 行 + `some(symbol.includes('Composer'))` + 无未分类 kind。

**判定：0a 关账 ✅**（D-1 发现①随之关账）。

### 三、UX-1 打回项 0b：e2e 光标依赖（helpers 统一 + mouse.move(0,0)）

- `openWorkbench` 统一入 [helpers.ts:9-17](apps/desktop/tests/e2e/helpers.ts:9)，点"先查看演示"后 `page.mouse.move(0, 0)`（:16），注释记 D-1 根因（光标停面板中心，浮层 `onMouseEnter` 抢初始 aria-selected）。
- **抽查=全查**：8 个 spec 全部 `from './helpers'` 引入，**零本地重定义**（`grep 'function openWorkbench' *.spec.ts` 空）。远超"抽 3 个"要求。

**判定：0b 关账 ✅**。

### 四、UX-1 #9 结案核验：G6 minimap 库蓝渗出（D-1 发现②关账）

- **定性入 SPEC**：[SPEC.md:40](apps/desktop/SPEC.md:40)「结论：G6 minimap 右下角库蓝 → `courtwork-minimap` tokens 压制」。
- **tokens 压制（源）**：[styles.css:489-503](apps/desktop/src/styles.css:489) 强制 `.courtwork-minimap` bg=`--bg-raised`、border=`--border-strong`、`box-shadow:none`；`canvas`=`--bg-raised`；视口遮罩 `[class*="mask"]` border=`--text-primary`、bg=`color-mix(--bg-selected 36%)` — 全 `!important` 盖 G6 默认蓝。[GraphPanel.tsx:113-118](apps/desktop/src/workbench/GraphPanel.tsx:113) 注册 minimap 带 `className:'courtwork-minimap'`。
- **预览真机目视（本验收亲测）**：dev server 起、进 关系图谱、`getComputedStyle` 实测右下角 minimap（120×72 @ vp(1148,520)）：bg `rgb(255,255,255)`、border `rgb(213,219,226)`、遮罩 bg `#E9EEF4@36%`、遮罩 border `rgb(10,37,64)=--text-primary`——**无任何饱和库蓝**；缩放目视右下角为中性白底缩略团，**蓝色团块消失**。gate `assert-graph-theme` 亦绿。

**判定：#9 关账 ✅**（D-1 发现②由静态无解 → 本单运行时定性+目视确认）。

### 五、UX-1 四项交互语义抽查

| 项 | 核验 | 判定 |
|---|---|---|
| 容器化仪式 popover（先聊后建·与存入卷宗同族） | 无绑定容器时"存入"触发 `containerize-popover`（[Composer.tsx:165-168](apps/desktop/src/composer/Composer.tsx:165) → :273-304），同 `scope-popover` 交互族，出 新建工作区/新建案件/取消；确认后 `scope='dossier'` + `onContainerize` | ✅ |
| 「+」菜单内禁用态（平铺仅真实动词） | `composer-plus` 菜单：选择文件夹=真（`composer-plus-folder`），相机/语音=`aria-disabled`+`preventDefault`+keydown 拦截+tooltip（[Composer.tsx:325-378](apps/desktop/src/composer/Composer.tsx:325)）；平铺仅 上传/案件 chip/发送 真实动词 | ✅ |
| 双词表随容器 kind 切换 | [container-copy.ts](apps/desktop/src/case/container-copy.ts) case=卷宗 / workspace=资料（5 函数）；`containerKind=selectedCase.kind`（[Composer.tsx:101](apps/desktop/src/composer/Composer.tsx:101)），`composer-scope-copy` sr-only 随 kind 渲染（:516-518），AttachmentChip 收 `containerKind`（:263） | ✅ |
| model-config 真实读写（改推理强度→持久化·无假活） | [model-config.ts](apps/desktop/src/provider/model-config.ts) 持久化 store+校验+`withProvider` 一致性；`updateModelConfig` 写盘（[App.tsx:347-350](apps/desktop/src/App.tsx:347)）**同一 handler** 供状态条 popover(:898)与设置页(:924)；round-trip 单测 [model-config.test.ts:24-27](apps/desktop/src/provider/model-config.test.ts:24)（含 reasoning:deep）；e2e #10 [ux1.spec.ts:88-100](apps/desktop/tests/e2e/ux1.spec.ts:88) 改 qwen/qwen-max/深思→关闭后 trigger 持久显示 | ✅ |

### 六、UX-1 #7 ThinkingStream 仅壳

`apps/desktop/src/workbench/ThinkingStream.tsx`（历史实现路径，现行树已移除，不构成链接）：默认 content=占位"思考过程将在接通流式生成后显示。"（:16，**无伪造思考内容**）；`SparkLinesIcon`（:2/:30）作"机器的话"区隔标识；折叠交互 `open` 态、body 仅展开时渲染（:34），内容显式接 T-provider.1。e2e [ux1.spec.ts:79-85](apps/desktop/tests/e2e/ux1.spec.ts:79)：body 初始 count 0 → toggle → 含"思考过程"。**判定 ✅**。

### 七、SET-1 双入口 + 全局浮层（容器无关 / Esc / 分组 0ms）

- **双入口**：标题栏齿轮 `open-settings`（[App.tsx:620-624](apps/desktop/src/App.tsx:620)）+ ⌘K 命令面板 `action-settings`（[App.tsx:600-603](apps/desktop/src/App.tsx:600)），均 `openSettings('model')`。
- **全局浮层容器无关**：`role=dialog aria-modal`，标头"全局偏好 · 与当前案件无关"（[SettingsPage.tsx:177-180](apps/desktop/src/settings/SettingsPage.tsx:177)）；预览真机标头亲见。NAV 六组（模型/产出/通道/隐私/承诺/关于，[SettingsPage.tsx:34-41](apps/desktop/src/settings/SettingsPage.tsx:34)）。
- **Esc 关闭**：keydown Escape→onClose（[SettingsPage.tsx:87-97](apps/desktop/src/settings/SettingsPage.tsx:87)）；预览真机按 Esc 实关。
- **分组 0ms**：各 section `{section===x && ...}` 条件渲染、无 transition，结构性瞬切（与 motion 门禁一致）。e2e [settings.spec.ts:8-20](apps/desktop/tests/e2e/settings.spec.ts:8)（双入口开+关）/:22-69（真实组行为）。

### 八、SET-1 真实组逐项行为

| 条目 | 核验 | 判定 |
|---|---|---|
| 凭证入口复用 D-1 探针 | `credentialStatus` 单一 App 态（[App.tsx:117/:919](apps/desktop/src/App.tsx:919)）；`onOpenCredentialSetup` 重开**同一** `ProviderSetup`（:920 `setProviderSetupOpen(true)`，与 :906 同模态），**无第二套连接逻辑**；`ConnectionPhase='pending\|connected\|failed'` 闭合枚举（[client.ts:12](apps/desktop/src/credentials/client.ts:12)）。e2e :96-101 管理凭证开 `provider-setup` | ✅ |
| maxUsd → RuntimeGuard 配置语义 | settings maxUsd（美元、clamp≥0、2 位）↔ core `RuntimeLimits.maxUsd` 真强制（[runtime-limits.ts:67-72](packages/core/src/scenario-executor/runtime-limits.ts:67) checkUsd 累加超限抛错，executor 按 `response.usage`+价目接入）。**语义对齐+持久化真**；见发现① | ✅（配置语义）／见① |
| 默认产出目录 + reveal | webkitdirectory 选择（[SettingsPage.tsx:352-360](apps/desktop/src/settings/SettingsPage.tsx:352)）→ `onRevealPath`→`systemOpenClient.revealInFolder`（[App.tsx:359-361](apps/desktop/src/App.tsx:359)）；无目录时 reveal 真禁用（:345）。e2e :37-45 | ✅（浏览器为虚拟路径，见发现②） |
| 遥测 / opt-in 持久化 | 见下条 docs/decisions/ADR-005-data-security.md 逐条 | ✅ |

**opt-in 语义 docs/decisions/ADR-005-data-security.md 逐条对表**：

| docs/decisions/ADR-005-data-security.md 语义 | 实现 | 判定 |
|---|---|---|
| opt-in（默认关） | `DEFAULT_SETTINGS.behaviorDataOptIn=false`（[settings-store.ts:37-40](apps/desktop/src/settings/settings-store.ts:37)） | ✅ |
| 条款明示 + 确认对话框 | "逐项确认开启"→ `settings-optin-confirm` 对话框（[SettingsPage.tsx:458-465](apps/desktop/src/settings/SettingsPage.tsx:458) → :577-600），文案"仅不可逆脱敏后汇总字段级修正…不含案件实质内容" | ✅ |
| 同意时间戳留痕 | 确认→ `setBehaviorDataOptIn(true)` 写 ISO 戳（[settings-store.ts:147-162](apps/desktop/src/settings/settings-store.ts:147)），UI "同意时间：…"显示（:441-445） | ✅ |
| 可随时关 + 关闭清空不溯及 | "关闭授权"→ `setBehaviorDataOptIn(false)` 清戳（`undefined`）；单测 [settings-store.test.ts:30-37](apps/desktop/src/settings/settings-store.test.ts:30) on 记戳/off 清戳 | ✅ |
| 遥测默认仅本机 | `telemetryEnabled` 默认 true+文案"本机可随时关闭/不含密钥与案件正文"，`setTelemetryEnabled` 持久（单测 :39-43） | ✅ |

### 九、SET-1 诊断导出安全审查（重点）

**主张"无密钥、路径脱敏"逐字段核实 + 实物导出检查：**

- **载荷构造器**：`buildDiagnosticPayload`（[settings-store.ts:174-197](apps/desktop/src/settings/settings-store.ts:174)）仅 7 字段：`exportedAt`/`appVersion`/`credentialPhase`/`modelConfig{providerId,modelId,reasoning}`/`runtimeGuard{maxUsd}`/`output`/`privacy`。**无 key 字段**。`output.defaultOutputDir` → `'[configured]' | null`（**路径脱敏**，绝对路径不出）。
- **credentialPhase 不可夹带密钥**：`= credentialStatus.phase`，类型是 `ConnectionPhase` 闭合枚举（[client.ts:12](apps/desktop/src/credentials/client.ts:12)）；浏览器模式连粘贴值都丢弃（[client.ts:137](apps/desktop/src/credentials/client.ts:137) `browserStatus={phase,source}`），密钥从不入 JS 态。
- **单测护栏**：[settings-store.test.ts:50-59](apps/desktop/src/settings/settings-store.test.ts:50) 断言 `JSON.stringify(payload)` 不匹配 `/sk-\|password\|secret/i` 且 `output={defaultOutputDir:'[configured]'}`（喂 `/Users/secret/path`）。
- **实物导出检查（本验收亲导一份）**：预览真机装载"已连接"凭证 + 敏感路径 `/Users/lin-lawyer/Cases/临江精铸/产出` 后点"导出诊断"，拦截 blob 得实际载荷：`credentialPhase:"connected"`、`output.defaultOutputDir:"[configured]"`、**敏感路径全串缺席**、无 `sk-`/secret、恰 7 顶层键。物件存档 `scratchpad/courtwork-diagnostics-live-export.json`。

**判定：无密钥 + 路径脱敏 逐字段属实，实物验证一致 ✅（重点项通过）。**

### 十、SET-1 预留组零假开关 + 明确不出现

- **预留组 aria-disabled + 「即将支持」逐个点**：`sources`（[SettingsPage.tsx:369-379](apps/desktop/src/settings/SettingsPage.tsx:369)）、通道 wecom/feishu/email/enterprise-lib（:388-413）、clear-prefs（:495-505）、check-update（:560-570）——均 `aria-disabled="true"` + `preventDefault` + `title=RESERVED_COPY.*`；`RESERVED_COPY` 全模板"…即将支持 · 当前可通过…实现"（[data-promise-copy.ts:55-67](apps/desktop/src/settings/data-promise-copy.ts:55)）。e2e [settings.spec.ts:71-94](apps/desktop/tests/e2e/settings.spec.ts:71) 七项逐点断言。预览真机 `检查更新` 可及名含"即将支持"。
- **「明确不出现」三项 grep 确认（全 app 无入口）**：主题/dark-mode → **零命中**；语言/i18n → 仅 `toLocaleDateString`/`localeCompare`（日期与排序，非 UI）；skill/customize/技能管理 → **零命中**。设置 NAV 六组亦无主题/语言/skill。**判定 ✅**。

### 十一、SET-1 数据承诺声明页（docs/decisions/ADR-005-data-security.md 逐条·不改写语义）

`DATA_PROMISE_SECTIONS`（[data-promise-copy.ts:8-52](apps/desktop/src/settings/data-promise-copy.ts:8)）五块逐条对 docs/decisions/ADR-005-data-security.md：案件内容永不训练（红线+委托代理法理+"写进主协议正文非隐私附件"）｜脱敏行为数据（不可逆脱敏字段级修正/opt-in 条款明示·可随时关·不溯及既往）｜使用遥测（不含密钥与案件正文·本机仅存本机）｜公开判例专业判断标注｜我们不会做的事。**无语义改写/增删**。预览真机文书级排版抽查：粗体藏青分节标题、舒展行距、约束栏宽、主协议摘录体例——达标。e2e :60-63 内容断言。**判定 ✅**。

### 十二、git 卫生

- **SET-1**：`0f82141`(App.tsx/SettingsPage.tsx/data-promise-copy.ts/index.ts/settings-store{,.test}.ts/styles.css，7 文件) + `841cbe0`(assert-test-count.mjs/settings.spec.ts) + `c9960e8`(SPEC.md/docs46)——全 `apps/desktop/*` 或 `docs/`，tracked。
- **UX-1**：`34ef2c5`(16 文件 case/composer/provider/workbench/styles) + `fa3040f`(9 e2e/helpers/assert) + `bbf2fa6`(SPEC) + `08d2f70`(5 张 ux1 PNG)——全 tracked（5 张 `*-ux1-*.png` `git ls-files` 实证在库；`--stat` 显"UNTRACKED"系长路径 `...` 截断解析假象，`git status` 工作树净）。
- **desktop 工作树 0 未提交**；跨层无污染、无他人文件改删。HEAD 漂移（并发 docs-only）见抬头"git 现场如实"。

### 十三、发现与处置

| # | 发现 | 严重度 | 处置 |
|---|---|---|---|
| ① | maxUsd 已按 `RuntimeGuard.maxUsd` 语义持久化（美元/clamp/2 位），core 侧 `checkUsd` 亦真强制，但 **desktop→executor 桥接未接**（`loadSettings().runtimeGuard.maxUsd` 仅设置模块自用，core 无 desktop 耦合）。UI 文案"超限中断生成"为前瞻描述 | 🟢（诚实 MVP 边界，合 当时的 UI 清单"真实"=配置真读写 + "接真实流式 UI 零改动"） | **不打回**；记为 T-provider 流式接入时的桥接跟踪项（届时 executor `deps.limits` 取 `loadSettings()`） |
| ② | 浏览器 webkitdirectory 无绝对路径，产出目录落"虚拟前缀+文件夹名"（代码注释已声明 Tauri 真机替换） | 🟢（平台固有限制，已声明） | 无需处置；真机 Tauri 路径待发行阶段目视一次 |
| ③ | desktop 产物单 chunk >500kB（vite 构建 advisory） | 🟢（非阻断） | MVP 后 code-split polish |

**无 🔴/🟡 阻断级发现。** D-1 两打回（composer chip #8-⑤、#9 蓝团块）本单确认关账。

### 十四、结论（三问）

1. **UX-1 放行？→ 放行 ✅**。批次一 #1–#10 逐项照案；D-1 打回 0a（composer chip 案件作用域 + `CASE_SCOPE_AUDIT` 补行，四证闭环）/0b（helpers 统一 + `mouse.move(0,0)`，8 spec 全统一）关账；#9 蓝团块运行时定性 + 目视确认消失。四项交互语义 + ThinkingStream 仅壳无假内容俱实。
2. **SET-1 放行？→ 放行 ✅**。当时的 UI 清单 设置页 12 行逐项核实（真实/预留禁用/真实静态）；双入口全局浮层容器无关 + Esc + 分组瞬切；真实组行为 + opt-in 语义 docs/decisions/ADR-005-data-security.md 逐条对齐（确认对话框 + 同意时间戳 + 关闭清空不溯及）；**诊断导出无密钥、路径脱敏经实物导出逐字段验证（重点项通过）**；预留组零假开关 + "明确不出现"三项 grep 确认；数据承诺声明页语义未改写。
3. **desktop 就绪进入 RP-1？→ 就绪 ✅**。九门禁全绿（build 9 / vitest 55·全库 723 / playwright 78·退出码 0 / 假绿下限 78 / 四门禁），两单关账、无阻断缺陷、层洁 git 净。唯留两跟踪项**不阻断 RP-1 重排**：maxUsd→executor 桥接（随 T-provider 流式）、真机钥匙串拒绝流复测（D-1 遗留固有不可自动化项）。

> **总判定：UX-1 放行 ✅ · SET-1 放行 ✅。批次一 10 项 + D-1 打回 0a/0b 全闭；设置页清单逐项真实/预留/静态核实，诊断导出安全实物验证无密钥·路径脱敏。desktop 九门禁全绿、无阻断缺陷，就绪进入 RP-1（最后一张重排单）。跟踪项两条（maxUsd executor 桥接 / 真机钥匙串复测）交发行·流式阶段，不阻断重排。**

---

## RP-1 验收（左右栏分层 + 画布-浮面三层 + 混排左栏，Build 门从严，2026-07-11）

- **角色**：验收工程师（Opus 4.8，AGENTS.md 全判例 + 尾随 echo 判例 + 干净环境自跑不采信自述）。实现者 Grok。**Build 门**：放行即触发首个正式分发 Build（Build 工序另单）。
- **范围五提交**：`1800925`（代验收会话提交 UX-1/SET-1 报告，核纯追加）/ `014ce0c`（SPEC+tokens elevation 先写）/ `9f52b50`（A/B/C 主体）/ `8a25b78`（e2e 八例 + floor 86 + 截图）/ `03a2f1a`（口径补丁 A2/B2/C2 + floor 87）。HEAD 另含两枚 docs-only 后续提交（`c4da1e4` elevation 白名单补遗 + `7122346` docs/architecture/schema-engineering.md），非本单代码，但白名单是 check 4 对照基准。
- **权威**：docs/decisions/ADR-006-ui-host.md 全五章（含四章补遗 elevation 三拍板 + 琥珀白名单 +1）、docs/decisions/ADR-005-data-security.md 混排修正、当时的 UI 清单 #16/#17、SPEC elevation 节、实现落点对照表（A2/B2/C2 标记）。

### 一、干净环境全链实测（不采信自述：node_modules + dist + *.tsbuildinfo 全清后重装重建）

清 `node_modules`/`*.tsbuildinfo`/`dist` → `pnpm install --frozen-lockfile`（"Lockfile is up to date"）→ 各门退出码单独捕获（**尾随 echo 判例**：不 `&&`/管道掩盖前序码）：

| 门 | 命令 | 结果 | 退出码 |
|---|---|---|---|
| 9 包 build | `pnpm -r build` | 安装 10 workspace（9 包 + root）；build 9 包各 `tsc`（demo-data/schemas/eval/reading-view/output/registry/tools/core/desktop），desktop `tsc -b && vite build` 3424 模块 | `___INSTALL_EXIT=0___` / `___BUILD_EXIT=0___` |
| Vitest 全绿 | `pnpm -r test` | 退出码 0；有套件 5 包实跑 **66 文件 / 503 用例全过**（demo-data 15 / eval 64 / tools 204 / core 156 / desktop 64） | `RC_vitest=0` |
| Playwright | `playwright test` | **87 passed (35.3s)**；末例 de-slop 基线（零投影/无语义线/紧凑行/细滚动条/线框图标）过 | `___PW_EXIT=0___` |
| --list 计数 | `playwright test --list` | **Total: 87 tests in 10 files**（= 假绿下限 87，铁闸咬合） | 0 |
| 门禁 1 动效 | `assert-motion-properties` | 仅 transform/opacity/bg/border | `RC_motion=0` |
| 门禁 2 法理之线 | `assert-signature-line` | 右栏白名单 + 五色封闭 + icon 单色 | `RC_signature=0` |
| 门禁 3 图谱 | `assert-graph-theme` | tokens 对齐 + 边色封闭 + 矛盾 marker | `RC_graph=0` |
| 门禁 4 图标 | `verify-icons` | 19 具名 SVG（17 概念）+ Lucide 静态按需 | `RC_icons=0` |
| 假绿下限 | `assert-test-count` | **87 条（下限 87）** | `RC_floor=0` |

**假绿下限禁降史（`git show <sha>:file` 真实文件值，非采信 commit message）**：`fa3040f`=74 → `841cbe0`=78 → `8a25b78`=86 → `03a2f1a`=87 → HEAD=87，单调不降；命中工单 78→86→87。下限=实测 87=`--list` 87 三者一致。

### 二、git 卫生（五枚提交清单 + 纯追加核 + 工作树）

| 提交 | 文件（增/删） |
|---|---|
| `1800925` docs 代提交 | `ACCEPTANCE.md` +128/-0 |
| `014ce0c` SPEC+tokens | `SPEC.md` +74/-1、`docs/design/tokens.json` +15/-0 |
| `9f52b50` A/B/C 主体 | `App.tsx` +475/-193、`CaseRail.tsx` +353、`rail/types.ts` +74、`rail.test` +56、`ModuleStack.tsx` +205、`module-stack.ts` +83、`module-stack.test` +52、`ModelConfigPopover` +2/-1、`case-scope.ts` +5、`case-scope.test` +2/-1、`styles.css` +148/-11、`Icon.tsx` +14 |
| `8a25b78` e2e+floor+截图 | `assert-test-count` +1/-1、`capture-rp1-compact.mjs` +22、`rp1.spec.ts` +133、`workbench.spec.ts` +8/-5、`22/23-*.png`（二进制） |
| `03a2f1a` 口径补丁 | `SPEC.md` +4/-4、`assert-test-count` +1/-1、`App.tsx` +56/-18、`ModuleStack.tsx` +4、`CaseRail.tsx` +3/-2、`rp1.spec.ts` +47/-2、`ux1.spec.ts` +10/-0、`workbench.spec.ts` +3/-1 |

- **`1800925` 纯追加核**：`ACCEPTANCE.md` **+128/-0，零删除行** → 原样提交无改一字，达标。
- 五提交仅动 `apps/desktop/*` + `docs/design tokens.json`，显式路径分层，无宽 `add` 误吞、无跨会话污染。
- **工作树**：RP-1 scope 零未提交残留；干净重建后 `dist`/`*.tsbuildinfo`/`test-results` 均 gitignore（`git check-ignore` 确认），**未脏任何跟踪文件**。遗留两非 RP-1 项——`eval/ACCEPTANCE.md`（W7.1 eval 补验 +39 纯追加，另垂类）+ `历史实施计划`（未跟踪计划稿，本会话前既存）：均文档、非本单 scope、零 Build 影响；**不越权处置**，记为仓库 housekeeping。

### 三、结构验收逐 ID（重点抽实现，非仅跑测试）

**A2 双证——toggle 对消已死**：App `onSelectCase` 对 case 行 `setExpandedCaseId(id)` **强制展开**（非 toggle），chevron 走独立 `onToggleExpand`；`case-file-count` 点击仅 `onSelectCase + onFocusOriginals`，**不调 toggle**（CaseRail 注释显式"禁止再 toggle——与 select 同批会对消回 null"）。ux1 #1 e2e 含 `data-highlight` + **「收起后再点计数仍自动展开并高亮」**（收 chevron→originals-zone count 0→再点计数→复现可见+高亮），`03a2f1a` 该 spec **+10/-0 纯增零放宽**。双证成立。

**B2 单实例铁证**：全库 `<ModelConfigPopover` 挂载点唯一 `App.tsx:1219`（`ModuleStack:190` 为注释非第二套）；context chip `onOpenModelConfig = () => setModelConfigOpen(true)` 唯一动作、无第二套读写，与状态条共用同一 `modelConfigOpen`/`updateModelConfig`；rp1 #8 e2e：chip 开→popover count **1**→改 provider/model/深思→状态条 trigger 反映 Qwen Max·深思→再开仍 count 1。

**C2 只迁不清**：`N/M` 唯一权威位 = progress 面板头 `progress-module-count`（`progressHeadCount`）；状态条 `statusbar-progress` 改非计数文案（摄取/审阅进行中）。五项原位断言：用量 `usage-ring` / 摄取「摄取余量 1,154」/ 续行「继续本案工作」/ 产出「打开产出文件夹」/ 模型 `model-config-trigger` 全留状态条。既有 workbench e2e **强化非放宽**：`getByText('摄取进行中 16 / 20')`→`progress-module-count='16/20'` + `statusbar-progress contains 摄取进行中`。

**标题栏琥珀仅 failed**：App titlebar warn 仅 `phase==='failed'` 渲染，pending/connected 无；rp1 #5 e2e 三态驱动（pending 无→failed 有 `data-phase=failed`+连接失败）；预览实测 connected 态 `titlebarWarnPresent=false`。白名单：全库 `--elevation-warn` 消费位仅 `.titlebar-credential-warn`（styles.css 76-77）——符合 docs/decisions/ADR-006-ui-host.md 四章补遗「琥珀审阅面外唯一合法使用位」。

**混排列表**：图标三态 `railIconName`（案件 briefcase-business / 工作区 folder-open / 未归档 message-square-text 三具名）；`canExpandRailRow` 仅 `case` 返 true → **案件行独有 chevron**，工作区/未归档为 spacer；Pinned（置顶）在上 + 混排「最近」，**类型不分区**（无案件/工作区/未归档分段标题；置顶/最近为时序分组，同 frontier 五章参照）。**［见七节 F-1：未归档「存入」未接容器化 popover］**

**导航骨架**：产出 `nav-artifacts`→`openOutputFolder`（真 reveal 路由）；定时/派发 `aria-disabled`+「即将支持」tooltip+`preventDefault` 零假活；全库 `Customize` grep **0**。

**#16 / #17**：#16 model-config 关闭钮「关闭」+ `quiet-button` 次要层级（docs/design），全库「先看」grep **0**；#17 `showLeadAttorney(isDemoCase)` 仅 demo 渲染，`CASE_SCOPE_AUDIT` 含 `rail-footer lead attorney` 行（12 行），`case-scope.test` 断言该行存在，rp1 #7 e2e 非 demo 案件 `lead-attorney` count 0。

### 四、elevation 一致性专项（三处逐 token 对表）

SPEC 提案值 ↔ `tokens.json elevation` ↔ `styles.css :root` 11 token 逐一致；关键解析值经浏览器 computed 实测：canvas **#EDEDED** / float **#FFFFFF** / border **#EBEBEB** / radius **12px** / inset **8px** / gap **8px**。

- **无新增色相**：warn 三轨 `--amber-bg/fg/graphic` = `#FCF6E8/#B45309/#D97706` = gate.pending 三值（复用非新增）。
- **box-shadow 全库恒 none**：`*{box-shadow:none}` + `.surface-float{box-shadow:var(--elevation-shadow)=none}`，四处声明全 none。
- **无裸值绕过**：消费侧圆角走 `var(--elevation-float-radius)`；全库无 `border-radius:12px` 字面；warn 走变量（列表卡 radius.md 6px 属既有语义，非浮面壳）。

### 五、真机/预览目视（自跑 1440 视口，不采信 implementer 截图）

**L0/L1 层级（浏览器 computed 实测，非目测）**：L0 app-shell bg **#EDEDED**、对话画布 bg **transparent**（坐底色）；L1 `.surface-float` **恰 3 面**（左栏/右栏/composer），各 白 #FFFFFF + 细描边 #EBEBEB·1px + 圆角 12px + **box-shadow none**，workspace padding **8px**（inset 不贴边）+ gap **8px**；标题栏 bg **transparent**（融入 chrome）。逐值坐实 docs/decisions/ADR-006-ui-host.md 四章三层模型。

**收缩态实测**（自点 `enter-compact-layout`）：左栏折叠 48px + 展开钮 + 三通用模块头折 + 画布/composer 浮卡放大占中——**与截图 22 一致**。活动垂类工作面（修订预览）在窄右栏留存（非全空）：与过目截图 22 既态 + 收缩态 e2e 定义一致，记解读注（七节 F-2）。

**专注/Tab/对照未回归**：Tab 五工作面 + 对照 + 专注钮在位；相关 e2e 在 87 全绿内。

### 六、回归红线（既有 e2e 逐文件 diff 语义核）

- `workbench.spec.ts@8a25b78`：`heading 对话`→`conversation-canvas`+`right-module-stack`（增断言）；`.titlebar .case-number`→`.toolbar .case-number`（案号迁工具栏）；`.case-card`→`.case-card.first()`（混排多卡，box-shadow none + radius 6px 保留）——**结构迁移零放宽**。
- `workbench.spec.ts@03a2f1a`：`摄取进行中 16/20` 文本→面板头 `16/20`+状态条文案——**C2 迁移强化**。
- `ux1.spec.ts@03a2f1a`：**+10/-0 纯增** A2 断言。
- D-1 切换矩阵（`d1-case-scope.spec`）/ SET-1 诊断导出（`settings.spec`）：随 desktop 64 vitest + 87 e2e 全集抽跑通过，未回归。

### 七、发现与处置

| # | 发现 | 定性 | 处置 |
|---|---|---|---|
| **F-1** | 左栏未归档「存入」（`handleContainerizeUnfiled`）**直建 `kind:'case'`，跳过容器化仪式 popover**——`containerize-popover` 存在且 composer-first 路径在用（含工作区/案件选择），rail 路径未接、硬编码案件、无选择；rp1 #2 e2e 锁的正是无 popover 直建行为。与 check 5「未归档行尾存入接容器化仪式同一 popover」+ 当时的架构工单册 A.1「接既有容器化仪式」不符。 | 🟡 实现级 UX 路由缺口（**非契约、非安全/数据**；容器化增量可逆、无留人确认违规） | **不由验收顺手改**（属特性路由决策，非 test/type/export/build 类 bug，且触及仪式设计）；据 AGENTS.md 不变量 2，验收无权单方豁免验收标准 → **Build 触发前须清**：rail 存入复用既有 containerize popover（App 内 handler 小改，不动契约/结构）**或**经架构明示豁免 check 5。 |
| F-2 | 收缩态右栏留活动工作面（非「全空仅画布+composer」）；三通用模块头折但垂类工作面不折。 | 🟢 解读注（与过目截图 22 + 收缩态 e2e 一致；base 结构不破） | 无需阻断；「全折至纯底座态」如需归架构后续 polish 定。 |
| F-3 | e2e 覆盖粒度：混排图标三态测 2/3（无 workspace fixture）；C2 五项测 3/5（摄取/续行未显式）；琥珀三态测 2/3（connected 缺省未单测，单条件 `phase==='failed'` 保证 + 预览实测 false）。 | 🟢 覆盖注（实现码全覆盖；机制单条件） | 记覆盖补强项，非阻断。 |
| F-4 | desktop 产物单 chunk >500kB（vite advisory，UX-1 已在册） | 🟢 非阻断 | 沿用处置，MVP 后 code-split。 |

**无 🔴 阻断级发现。** 唯一 🟡（F-1）系实现级 UX 路由缺口，不破 base 结构、不触契约、不涉安全，但偏离一条明列验收标准。

### 八、结论（三问）

1. **RP-1 放行？→ 结构验收通过 · 条件放行 ✅**。全局门全绿（build 9 exit 0 · vitest 503 · playwright 87/87 · 四门禁 · 假绿 87 禁降史 78→86→87 · git 净）；A2 双证 / B2 铁证 / C2 只迁不清 / 琥珀仅 failed / 混排 / 导航骨架 / #16#17 逐 ID 抽实现坐实；elevation 三处对表逐 token 一致、零投影、无新色相；L0/L1 浏览器 computed 逐值成立。**唯 F-1（存入未接容器化 popover）偏离 check 5 验收标准**——验收不擅自豁免（不变量 2），故放行附**硬前置**：F-1 修复或架构豁免，二者其一。
2. **base 是否定形？→ 定形 ✅**。三层（L0 底色 / L1 三浮面 / L2 popover）+ 混排左栏 + 右栏模块栈 + statusbar 迁移 + elevation token 组，结构冻结且逐值实测成立。F-1 修复为 App 内 handler 路由变更，**落在冻结结构内，不重开重排**——base 定形不受 F-1 牵动。
3. **可出首个正式 Build？→ 可出，但触发前须清 F-1 ⏳**。base 定形、无 🔴 阻断、九门全绿，Build 裁切前提已备；唯 Build「放行即触发」故触发闸眼落在 F-1：**推荐实现会话快速补丁（rail 存入接既有 popover）+ 单点复验后触发**为最稳路径；若架构就「从严」判 F-1 可豁免或转 Build 后 fix-forward，则该裁决权归架构（门禁/验收标准独属架构，不变量 2）。

> **总判定：RP-1 结构验收通过 · 条件放行 ✅ · base 定形 ✅ · 首个正式 Build 触发前须清 F-1 ⏳。** 干净环境 9 包 build + 503 vitest + 87/87 playwright + 四门禁 + 假绿 87（禁降史 78→86→87）全绿；A2/B2/C2 三补丁抽实现坐实（toggle 对消死 / 单 popover 实例 / 只迁不清）；elevation 三处逐 token 一致、box-shadow 恒 none、无新色相；L0/L1 三浮面浏览器 computed 逐值成立、标题栏透明、收缩态与截图 22 一致。唯一 🟡 F-1（未归档存入跳过容器化 popover）偏离一条明列验收标准，验收不擅自豁免——记 Build 触发硬前置（修复或架构豁免），不破 base 结构、不改 base 定形结论。

### 九、F-1.1 复验（硬前置清算，2026-07-11）

架构裁决 F-1 **不豁免**（`2da6d28`：直建=替用户选名词）→ 实现补丁 `287ca17` + 第 0 步代提交我方报告 `8202d18`。复验（不采信自述，清 dist/tsbuildinfo 全量重建；无依赖变更故免重装）：

**F-1 闭合核实（读实现非仅跑测试）**：
- App.tsx **废除** `handleContainerizeUnfiled` 直建 `kind:'case'`；新 `confirmContainerizeUnfiled(kind: ContainerKind)` 以**用户所选 kind** 建容器（workspace→项目 / case→案件），经 `containerizeUnfiledId` 锚点。
- CaseRail.tsx「存入」→ `onRequestContainerizeUnfiled`（开 popover）；行内渲染 `scope-popover containerize-popover rail-containerize-popover`，**复用 composer 同一 `CONTAINERIZE_COPY` + 同 `data-testid="containerize-popover"` + 工作区/案件二选**——check 5「接容器化仪式同一 popover」达标。
- styles.css `.rail-containerize-popover`：`var(--border-strong)`/`var(--bg-raised)` + radius 6px（同既有 popover 惯例）——**无投影、无裸 hex、无新色相**。

**门复跑（HEAD=`287ca17`，杀旧 :1420 起新服务跑当前源码）**：

| 门 | 结果 | 码 |
|---|---|---|
| 9 包 build | `pnpm -r build` 全绿 | `BUILD_EXIT=0` |
| Vitest | **503 全过**（desktop 仍 64；补丁只加 e2e 非单测） | `VITEST_EXIT=0` |
| Playwright | **88 passed (39.5s)** | `PW_EXIT=0` |
| --list | **Total: 88 tests**（= 下限 88） | 0 |
| 假绿下限 | **88（禁降 87→88）** | 0 |
| 四门禁 | 动效/法理之线/图谱/图标 | 各 0 |

**e2e 强化非放宽**：旧「存入触发容器化」→ 改为 `#21 选案件`（点存入→popover 可见→选案件→行消失+标题栏见名）+ 新 `#25 选工作区`（同链 + `rail-icon-workspace` 实测）；两分支过，**顺带闭七节 F-3 图标三态覆盖**（workspace 图标 e2e 首次实跑）。de-slop 零投影基线例仍在 88 内。

**git 卫生**：`8202d18` = 我方 RP-1 报告 **+98/-0 verbatim、独立、无夹带**既存两项（`git show` 零删除行、锚点在）；`287ca17` 仅动五显式文件、无 `pnpm-lock.yaml` 变更；工作树复验后仍仅两非本单既存项（`eval/ACCEPTANCE.md` W7.1 / superpowers 计划稿），零新脏。

**复验结论（更新三问）**：
1. **RP-1 → 全数放行 ✅**（F-1 硬前置已清，无遗留 🟡/🔴）。
2. **base → 定形 ✅**（F-1.1 为冻结结构内 handler+popover 增量，未动契约/分层）。
3. **首个正式 Build → 可触发 ✅**（九门全绿于 `287ca17`；BUILD-1 工序单已发，据此裁切）。

> **F-1.1 复验总判：硬前置清算完毕，RP-1 全数放行 ✅ · base 定形 ✅ · 首个正式 Build 可触发 ✅。** 存入接同族容器化 popover（用户选名词）实现+e2e 双证，直建路径废除；干净重建 9 包 build + 503 vitest + 88/88 playwright + 假绿 88（禁降 87→88）+ 四门禁全绿；step-0 代提交我方报告 verbatim 无夹带。RP-1 关账。

---

## FIX-KC-1 验收（凭证授权流·安全敏感件·主张逐条证伪，2026-07-11）

- **角色**：验收工程师（Opus 4.8，AGENTS.md 全判例；安全敏感，主张逐条证伪、不采信自述）。实现者 Grok。
- **范围**：`815bf15`（11 文件显式路径）。**权威**：当时的架构工单册 FIX-KC-1 + DBG-2（H1 ad-hoc CDHash/ACL 漂移主因）+ **docs/decisions/ADR-005-data-security.md 红线**「key 永不进事件流/日志/遥测（进验收项）」。
- **五件合施**：DBG-2.1 trace / F2 ACL 止血 / F4 分型 / F5 恢复 / F6 dev 隔离；F1（Developer ID）/F3（单条目合并）明确不做。

### 一、隔离验证方法（安全件从严：并发脏树 + 端口争用两处纠偏）

- **并发脏树**：主工作树被并发 RP-2 会话（sol）重度污染（`App.tsx`/`Composer.tsx`/`CaseRail.tsx`/`styles.css`/`assert-test-count.mjs`/多个 e2e + 新 `rp2.spec.ts` 等 10+ 文件未提交）。据 AGENTS.md 判例（禁共享树 checkout/stash），**建独立 `git worktree` detached@`815bf15`** 验证，彻底隔离 RP-2 在途。
- **端口争用纠偏（不采信自述关键）**：首轮 worktree playwright 因 `reuseExistingServer:true` + 端口 1420，**误连主树 RP-2 dev server**（`lsof` 实证 :1420 属 `/Users/.../Projects/Courtwork/apps/desktop`），跑出 22 假失败（`model-config-trigger`="待连接"、`credential-status-button` 不存在——正是 RP-2 #18′「状态条撤模型名」的在途改动，非 FIX-KC-1 缺陷）。**改 worktree 端口 1421 + `reuseExistingServer:false` 起自有服务重跑 → 90/90 全绿**（两 FIX-KC-1 新例耗时从 38.8s/27.1s 超时降至 984ms/1.2s，佐证系错服务污染）。

### 二、全局门（worktree@815bf15 干净环境，退出码单查）

| 门 | 结果 | 码 |
|---|---|---|
| 9 包 build | `pnpm -r build` 全绿 | `BUILD=0` |
| Rust 单测 | `cargo test` **9 例逐名全过**（classify_keyring_no_entry / classify_os_status_maps_known_codes / dev_service_suffix_matches_build_profile / parse_os_status_from_display_and_debug_text / trace_disabled_by_default / status_payload_contains_no_secret_field / failed_payload_carries_user_facing_message_and_fail_kind / trace_line_never_embeds_secret_fields_or_values / wire_names_and_messages_are_zero_tech） | `CARGO=0` |
| Rust release | `cargo test --release dev_service_suffix…` 过（F6 release 分支实证） | `CARGO_REL=0` |
| Vitest | **509 全过**（demo-data 15 / eval 64 / tools 204 / core 156 / **desktop 70**） | `VITEST=0` |
| Playwright | **90 passed（隔离 :1421）** | `PW=0` |
| --list | **Total: 90 tests**（= 下限 90） | 0 |
| 假绿下限 | **90**；`815bf15` = 90，禁降史 87→88（F-1.1）→**90**（命中工单 88→90） | 0 |
| 四门禁 | 动效/法理之线/图谱/图标 | 各 0 |

### 三、安全主张逐条证伪

**1. trace 无泄漏（码 + 实测双证）**：读 lib.rs 逐调用点——`trace_op`/`trace_status_exit`/`trace_startup_once` 仅收 account 常量（`provider-secret`/`active-source`，非值）、service、ok、fail_kind 枚举、os_status、phase、source_kind 枚举、签名元数据；**secret 值/source 值/env 名/env 解析值零写入路径**（`rewrite_password` 传 account 不传 value；env 路径注释「不把 env 名写入日志」）。另有 `key_looks_sensitive` 防御式丢弃敏感键。**实测**（`COURTWORK_CRED_TRACE=1` + 临时 HOME 直驱真实写盘路径，故意注入 `secret="sk-…"`/`apiKey`/`password`）：日志实载 = `{event,op,account:"provider-secret",service:"…provider.dev",ok,fail_kind:"auth_failed",os_status:-25293}` 等；**注入的敏感字段整行被丢至仅剩 `{event:"keychain_op"}`**；grep 无 `sk-`/sentinel/`hunter2`。断言测试 `trace_line_never_embeds_secret_fields_or_values` 真断言（含防御丢弃）。→ **docs/decisions/ADR-005-data-security.md 红线成立。**

**2. 默认关（实测文件系统）**：`write_trace_line` 未开先返回。**实测**：不设 env 驱动多条 trace → **日志文件与目录均不创建**（`!log.exists() && !log_dir().exists()`）。单测 `trace_disabled_by_default` 佐证。

**3. F6 dev/release 双向（防反转灾难）**：`#[cfg(debug_assertions)]`→`…provider.dev`；`#[cfg(not)]`→`…provider`。debug `cargo test` 断言 `.dev`；**`cargo test --release` 断言 == `cn.courtwork.desktop.provider`（无 .dev）**——release 不带 .dev 双向证明。

**4. F4 分型不越权**：wire_name 闭集 {user_canceled/auth_failed/acl_denied/missing/platform}；user_message + TS `FAIL_KIND_MESSAGES` 对外零技术（单测断言无 keyring/OSStatus/ACL）；`CredentialStatus` 序列化仅 phase/source/failureMessage/failKind（`status_payload…no_secret` 断言精确 JSON 无 secret）。**SET-1 导出回归**：`buildDiagnosticPayload` 增 `credentialFailKind`（枚举/null），`defaultOutputDir→'[configured]'`；单测重建实物 payload 断言无 `sk-`、不夹带用户长文案、path `[configured]`。os_status 仅落 opt-in dev trace，**不入 status JSON/导出**。

**5. F2 顺序 + 半写诚实**：`rewrite_password` = `delete_credential_ignore_missing`（吞 NoEntry）→ `set_password`；pasted 存 = 重写 secret `.and_then` 重写 source（整组）；**secret 成功但 source 失败 → `and_then` 短路 → `failed_keychain`（非 connected）**；成功后 `reprobe` 复读定态。半写不假 connected。

**6. F5 文案对表**：`KEYCHAIN_RECOVERY_GUIDE` 两段 = H4 钥匙串密码指引（登录钥匙串锁定/改密同步）+ 手动删 `cn.courtwork.desktop.provider` 两项（`active-source`/`provider-secret`，注 dev `.dev`）；SettingsPage **`phase==='failed'` 才渲染**（e2e + 单测断言无 secret）。

**7. e2e 回归红线**：`settings.spec` +29 **纯增**（failed 分型文案 + 恢复指引呈现）；`d1-case-scope` +20 **纯增**（auth_failed 呈状态条 title，既有「钥匙串授权未通过」例保留）；`settings-store.test`/`client.test` 断言**强化非放宽**。零既有断言放宽。

### 四、git 卫生

`815bf15` = 恰 **11 文件**显式路径（lib.rs / client.ts / settings-store.ts / SettingsPage.tsx + 两单测 + 两 e2e + SPEC + assert-test-count），**未含任何 RP-2 热点文件**（App/Composer/CaseRail/rp2.spec）；无 `pnpm-lock.yaml` 变更。验收全程在隔离 worktree，**主树零改动**——RP-2 并发脏文件（10+）与既存两项（eval/superpowers）均未动。

### 五、真机采集剧本评估（结论问二）

- **F-KC-a**：工单要求「完工报告附：真机采集剧本」，但**交付物（SPEC/当时的架构工单册/报告）未见可执行剧本**（当时的架构工单册 仅引用之）→ 未随交付。
- 验收据实现补齐并实证：`codesign` 步已在机跑通——`/Applications/Courtwork.app` 在机，输出 `flags=0x10002(adhoc,runtime)` / `Signature=adhoc` / `TeamIdentifier=not set` / `CDHash=04d33791…`，**实锤 DBG-2 H1**（ad-hoc 签名→每次构建 CDHash 变→ACL 漂移）。trace 步已实测无泄漏（三节 1）。
- **可直接交用户的剧本**（安全：日志无密钥，实测在案）：

```sh
# 1) 退出 Courtwork（若在运行）
# 2) 终端直跑二进制并开 trace（open -a 不传 env，须直跑二进制）：
COURTWORK_CRED_TRACE=1 "/Applications/Courtwork.app/Contents/MacOS/courtwork-desktop"
# 3) 在应用内复现凭证连接（粘贴 key / 完成连接），触发问题；trace 同步回显终端
# 4) 退出后回传两份（均无密钥，可安全外发）：
cat ~/Library/Logs/cn.courtwork.desktop/credential-probe.log
codesign -dv --verbose=4 "/Applications/Courtwork.app/Contents/MacOS/courtwork-desktop"
```

### 六、发现与处置

| # | 发现 | 定性 | 处置 |
|---|---|---|---|
| F-KC-a | 完工报告未附「真机采集剧本」（工单明列交付项） | 🟡 交付项缺失（非代码缺陷） | 验收据实现补全并实证（五节），可直接交用户；建议实现/架构收编入正式交付物。不阻代码放行。 |
| N-1（过程注） | 主树被并发 RP-2 会话重度污染，含 `assert-test-count.mjs`（floor）与多 e2e | 🟢 他单在途，非本单 | 记录：本单代提交 / RP-2 提交时须交叉核 floor 与 e2e 计数（避免误吞 / floor 冲突）；本单已隔离验证不受影响。 |

**无 🔴；无安全红线破口**（trace 无泄漏码+实测双证、默认关实测、F6 release 无 .dev、导出无密钥、UI 零技术概念）。

### 七、结论（两问）

1. **放行？→ 放行 ✅**。七条安全主张逐条证伪均立（trace 无泄漏码+实测、默认关实测、F6 双向、F4 分型不越权+导出回归、F2 半写诚实、F5 failed-only 文案、e2e 纯增不放宽）；隔离环境全门绿（build 9 / cargo 9 逐名 + release F6 / vitest 509 / playwright 90/90 / floor 90 禁降 88→90 / 四门禁）；docs/decisions/ADR-005-data-security.md 红线实测成立；git 仅 11 文件、他会话脏未动。
2. **真机采集剧本可直接交用户执行？→ 交付缺失，验收已补可执行版 ✅**。实现完工报告未附剧本（F-KC-a）；验收据实现补一份并实证（codesign 在机跑通证 H1 ad-hoc；trace 步实测无泄漏；路径 `/Applications/Courtwork.app` 在机），**该剧本可直接交用户跑一轮回传**（日志无密钥，安全外发）。建议收编为正式交付物。

> **总判定：FIX-KC-1 放行 ✅（安全敏感·主张逐条证伪·隔离验证）。** trace 无泄漏（读码零写入路径 + 实测注入哨兵整行丢弃 + 默认关不落盘）、F6 release 无 .dev（debug/release 双证）、F4 分型对外零技术且导出无密钥、F2 半写诚实不假 connected、F5 failed-only 恢复指引——docs/decisions/ADR-005-data-security.md 红线守住。干净隔离 worktree 全门绿（9 build / 9 cargo+release / 509 vitest / 90-90 playwright / floor 90 / 四门禁）；仅 11 文件、主树 RP-2 脏未动。唯 F-KC-a（采集剧本未随交付）记 🟡，验收已补可执行版并实证，可直接交用户，建议收编。

---

## RP-2.5 验收（双宿主解耦 + 响应式收口 + 设置 modal，2026-07-11）

- **角色**：独立验收会话（实现者 sol；实现与验收分离）。
- **范围**：`850d956`，以 当时的架构工单册「RP-2.5 验收」+ docs/decisions/ADR-006-ui-host.md 三章修正 + docs/design 为权威。
- **隔离**：主树保持在 `4fe2773` 且有他会话 `eval/ACCEPTANCE.md` 修改与 provider 计划稿未跟踪；本验收新建 `/tmp/courtwork-rp25-accept`、分支 `codex/accept-rp25` 固定 `850d956`，未在共享树 checkout/stash。E2E 前 `lsof -nP -iTCP:1427 -sTCP:LISTEN` 为空，使用 `COURTWORK_E2E_PORT=1427` 且 `reuseExistingServer:false` 自起服务。

### 一、全局门与守卫负测

| 门 | 实测结果 |
|---|---|
| 干净安装 | `pnpm install --frozen-lockfile`，1046 包复用缓存，退出 0 |
| 全仓构建 | `pnpm -r build`，9/9 workspace 项通过；desktop Vite 构建退出 0 |
| Vitest | desktop **70/70**（15 files） |
| Playwright 清单/floor | `--list` **107**；`assert-test-count.mjs minimum=107`，禁降史 90→107 |
| 四门禁 + Preview 门禁 | motion / signature / graph / icons / preview 全绿 |
| Playwright 全量 | 隔离 `:1427`，**107/107 passed（40.8s）** |

**Preview 守卫非空证明**：用临时补丁在 `UtilityRail.tsx` 加 `../preview/renderers/WorkbenchPreviewRenderer` 越界 import，`lint:preview` 实际红：`utility -> renderer import`、exit 1；随即以反向补丁撤销，门禁恢复 `Preview host/import boundaries: OK`，该文件 diff 归零。守卫源码同时递归扫描 `utility/**`、`preview/renderers/**`，并对 `PreviewHost.tsx` 禁词 `(法律|案件|卷宗|合同|风险|修订)`；不是空断言。

### 二、结构、响应式与视觉实测（独立浏览器探针）

**双宿主**：初态 `utility-rail[data-mode=dock]` + Preview 可见；dock 恰 3 项，进度权威位 `0/6`；关闭 Preview 后 `data-mode=base`、恰 3 张 `.utility-card`、schema tab 数 0；等待 800ms 手动关闭仍保持；点击「预览/展开」恢复。旧 e2e 只改两处：D-1 在 dock 点进度回基础态后继续核原断言（+2 无删除），file-ops 从窄档「更多」进入同一路由（结构迁移）；无语义放宽。D-1 / SET-1 / FIX-KC-1 关键例均包含在 107 全量绿色中。

**四档与声明**：1180/1240/1440/1600 的 document `scrollWidth-clientWidth` 均 0，chat↔右栏间隙均精确 8px。免责声明在 1180/1240/1440 为 `white-space:normal`、实高 36.78px（约两行），1600 为 `nowrap`、实高 19.39px；feedback 链接四档均 `nowrap`。场景「更多」popover 在 1180 的盒为 x=142..274、y=651.2..723.2，完整位于 chat；model-config popover 为 x=239..519、y=485.7..775.2，也未被裁切。

**消息与设置**：用户消息右沿与对话流误差 ≤5px，实宽比 0.7664（≤78%）、浅中性底 `rgb(233,238,244)`、border 0；agent bubble 类计数 0。设置页 1180 水平/垂直居中、`scrollWidth-clientWidth=0`，Esc 与关闭按钮均可卸载 dialog。

### 三、发现与处置

| # | 发现 | 定性 | 处置 |
|---|---|---|---|
| **F-1** | **阴影契约冲突**：当时的 UI 架构裁决仍写 L1「零投影（de-slop #6 不破）」；当时的设计原则写「阴影全站归零（含弹层）」且 `shadow.none=none`。验收工单第 3 条又明确要求 SurfaceCard 解析值必须仍为 none。实现却把 `elevation.shadow` 改为 `0 1px 2px rgba(...), 0 8px 24px rgba(...)`，CSS `--elevation-shadow` 同值；浏览器 computed 的 SurfaceCard 与 composer 均为两层非零 box-shadow。`workbench` 的“零投影”旧例只查 `.case-card`，因此 107 全绿未覆盖 L1 偷渡。 | 🔴 **契约级阻断**；用户上一轮要求轻影接口与既有宪法冲突，验收者无权自行选择新旧口径 | **[需架构拍板]**：若维持当时的零投影规则，`elevation.shadow` 必须回 `none` 且增加 SurfaceCard/composer computed 断言；若采纳轻影，须按修宪程序同步设计契约与验收标准后再验。验收不代改契约。 |
| **F-2** | **composer 仍越 chat 并与右栏重叠**。内部 overflow 被 `document scrollWidth=0` 掩盖：1180 chat 右=524.45、右栏左=532.45，但 composer 右=562、send 右=553（与右栏重叠 20.55px）；1240 chat 右=591.5、右栏左=599.5，但 composer 右=662、send 右=653、provider 右=619（分别与右栏重叠 62.5/53.5/19.5px）；1440 send 右=753 > chat 右=749.58（侵入 8px gap 3.42px）；仅 1600 全含。现有 `rp25.spec` 只测 document overflow + chat/right gap，未测 composer 控件相对 chat 的边界，故假绿。 | 🔴 明确实现级视觉阻断，正中工单「composer/send/provider 右边界不越 chat」 | 实现会话修 composer 宽度/min-width/containment，并加四档 send/provider/composer `right <= chat.right` 与 `composer.right <= chat.right` 断言；修后隔离复验。 |
| **F-3** | **artifact 自动打开 Preview 未形成真实机制**。`session.artifacts` effect 只调用 `applyArtifactAutoExpand` 更新 `moduleOpen`，从不 `setPreviewOpen(true)`；Preview 仅因默认 true、选场景/切视图等显式动作而打开。旧名为“artifact 自动展开”的 e2e 只断 `module-progress[data-open=true]` 后主动点击 revision，无法证明 artifact 驱动宿主。手动关闭保持成立，但“artifact 自动打开 + 手动关闭优先”没有可区分的 auto/manual override 状态。 | 🟡 明列结构行为未落实、测试存在命名大于断言 | 增 Preview auto-open 策略与用户 override（新 artifact 仅在未手动关闭时打开），用受控 artifact 事件分别锁自动打开与手动关闭优先。 |
| **F-4** | 完工自述称已锁“composer popover 裁切”，但提交内无任何 e2e 打开 `model-config-popover` 并断边界；本验收手动探针证明当前 1180 实现未裁切，但回归门未锁。dock 进度权威位则由 `rp1.spec` 的 `progress-module-count=0/6` 实际锁住。 | 🟡 工单第 6 条的测试交付缺一条 | 增 model-config popover 在窄档完整落于 chat/viewport 的 bounding 断言，不以本次手动探针代替长期门禁。 |

### 四、git 卫生

`850d956` 恰 22 文件：仅 `apps/desktop/*` 与 `docs/design/tokens.json`；**未触 `packages/*`、`src-tauri/*` 或凭证 Rust/TS**，无 lockfile 改动。负测与浏览器探针均已删除/反向补丁归零，报告追加前 worktree 干净。主树两项既存脏文件始终未触。

### 五、结论

1. **RP-2.5 放行？→ 不放行 ❌**。全局机器门虽然全绿（build / Vitest 70 / Playwright 107 / floor 107 / 五静态门），但存在两项 🔴：F-1 阴影违反当前权威契约且需架构拍板；F-2 composer 在 1180/1240 与右栏实质重叠、1440 侵入 gap。另有 F-3 artifact 自动开宿主机制缺失、F-4 popover 回归断言缺失。
2. **0.1.1 可出？→ 不可出 ⛔**。先完成 F-1 架构裁决并按裁决收敛；修 F-2；补 F-3/F-4 自动化后，由独立验收复跑 `pnpm -r build`、70+ Vitest、floor≥107 Playwright、守卫负测与四档浏览器边界，方可触发 BUILD-1 工序复用。

> **总判定：RP-2.5 阻断，不放行；0.1.1 不可出。** 107/107 并非充分证据：现有四档用例只锁全局 scrollWidth，遗漏了内部 composer 越界；现有 de-slop 只锁 case-card，遗漏 SurfaceCard 非零投影。验收实测已分别证实这两处红线。阴影属于契约冲突，标 `[需架构拍板]`，验收不擅改；其余交回实现会话修复后复验。

---

## RP-2.5.1 单点复验（几何 / Artifact→Preview / 阴影白名单，2026-07-11）

- **角色与范围**：独立验收会话；实现提交 `e1ae88e`（三项缺陷修复）+ `e84c9f8`（批准阴影落 token），架构拍板 `1df436e`。严格只复验 当时的架构工单册 指定三点，不重跑已绿的 110 例全量。
- **隔离**：新建 `/private/tmp/courtwork-rp251-spot`、分支 `codex/accept-rp251` 固定 `e84c9f8`；未在共享主树 checkout/stash。E2E 前查 `lsof -nP -iTCP:1428 -sTCP:LISTEN` 为空，使用 `COURTWORK_E2E_PORT=1428` 且 Playwright `reuseExistingServer:false` 自起服务。首次因干净 worktree 尚无 workspace `dist` 而无法解析 reading-view/tools；执行真实 `pnpm -r build`（9/9 workspace 全绿）后重跑，未借用主树产物或服务。

### 一、三点定向证据

| 复验点 | 实测证据 | 结论 |
|---|---|---|
| 四档 bounding-box 几何 | 隔离 `:1428` 定向运行 `rp25.spec.ts` 四档用例：1180 / 1240 / 1440 / 1600 全过。独立浏览器探针实值：四档 chat→右栏 gap 均 **8px**；`chatRight / composerRight / sendRight / providerRight` 分别为 `524.453 / 515.453 / 506.453 / 472.453`、`591.5 / 582.5 / 573.5 / 539.5`、`749.578 / 740.578 / 731.578 / 697.578`、`816.547 / 808.438 / 799.438 / 765.438`。三控件右缘逐档均小于 chat 右缘，旧 scrollWidth 假绿口已由坐标学锁死。 | ✅ |
| `artifact_produced` 真开 Preview + 手动关闭优先 | 定向两例均绿：关闭旧 Preview 后切至新 S1，`data-artifact-revision` 真实变化、Preview 自动出现且 Timeline 为选中 renderer；同案件同 S1 手动关闭后再次回放，revision 仍变化但 Preview 不重开、Utility 恢复 base。与旧 `moduleOpen` 假证明可区分。 | ✅ |
| 阴影 token / 白名单 / L0 零影 | `pnpm --filter @courtwork/desktop lint:elevation` 输出 `Elevation shadow boundary: OK`。源码 token 与 CSS 均精确为 `0 1px 2px rgba(10,37,64,0.045), 0 4px 12px rgba(10,37,64,0.035)`；组件 TS/TSX 无 shadow 字面量，CSS 非零消费选择器唯一为 `.case-rail.surface-float, .right-rail-collapsed.surface-float, .surface-card-raised`。浏览器 computed 复核：CaseRail、Utility dock、三张 Utility base 卡、PreviewHost、右收敛 bar 均呈批准双层藏青影；chat、composer、artifact、model-config popover、settings 均为 `none`。 | ✅ |

定向 Playwright 总计 **6/6 passed（4.4s）**：四档几何 4 例 + Artifact 行为 2 例。未把 model-config 例重复纳入本次三点单测范围；其长期回归已存在于 `rp25.spec.ts` 且全量 110 由实现前置跑绿。

### 二、视觉与卫生

- 对照 `visual-audit/34-rp25-1-shadow-none-1440.png` 与 `36-rp25-1-shadow-approved-1440.png`：批准影在两侧 L1 边缘提供极轻分层，L0 chat、composer 与数据承重区保持平面；未出现黑灰脏边或廉价悬浮感，符合「存在感而非立体感」。
- 验收未修改实现、凭证 Rust/TS 或 `packages/*`。独立 worktree 在追加本节前干净；最终只提交 `apps/desktop/ACCEPTANCE.md` 本节。

### 三、结论

1. **RP-2.5.1 单点复验：通过 ✅**。三项指定证据全部成立，无新增发现、无 🔴/🟡。
2. **0.1.1：放行出包 ✅**。RP-2.5 原阻断的几何重叠、Artifact→Preview 行为与阴影契约/白名单均已闭环；可进入既定 BUILD-1 工序复用。

> **总判定：RP-2.5.1 放行，0.1.1 可出。** 隔离 `:1428` 下四档坐标边界与 8px gap 真断言、Artifact 自动打开与手动关闭优先、批准阴影精确 token + 消费白名单 + L0 computed 零影全部实测通过；全仓构建亦绿，验收仅追加报告。

---

## RP-2.10 验收（三卡一纸 + 品牌 icon 推理动画，2026-07-11）

- **角色与范围**：独立验收会话 sol；实现者 Opus 4.8；固定审查提交 `24c61bd` 的 20 文件。权威逐条对照当时的 UI 架构裁决与架构工单册中的 RP-2.10、#26.2/#26.3 收账裁决；未改 schema、跨层接口或 QF-1 队列语义。
- **隔离**：从 `24c61bd` 新建 `/private/tmp/courtwork-rp210-acceptance`、分支 `codex/accept-rp210`，未在共享主树 checkout/stash。Playwright 配置实核 `reuseExistingServer:false`；全量两轮分别先查空闲端口后自起 `:1431` / `:1432`，定向五连跑使用 `:1433`，目视探针使用 `:1434`。首次 `pnpm install --frozen-lockfile` 虽回报 up to date 却未生成 `node_modules`，首个 build 因 `tsc ENOENT` 未进入编译；以 `pnpm install --frozen-lockfile --force` 重建 1220 个依赖链接后，从 build 重新计次。

### 一、全局门与稳定性

| 门禁 | 原始实跑结果 | 结论 |
|---|---|---|
| 全仓 build | `pnpm -r build`：9/9 workspace 完成；desktop `tsc -b && vite build` 完成（3433 modules） | ✅ |
| desktop Vitest | 17 files passed；**79/79 passed**（699ms） | ✅ |
| 全门禁 + Playwright 第一轮 | `:1431`：motion/signature/graph/icons 20/preview/elevation/RP-2.6/2.7/thinking/2.8/2.9/2.9.1/2.10 全绿；**145 passed / 146**（1.2m） | ✅（仅登记基线红） |
| 全门禁 + Playwright 第二轮 | `:1432`：同一整链门禁再绿；**145 passed / 146**（1.2m） | ✅（仅登记基线红） |
| 唯一失败 | 两轮均仅 `tests/e2e/composer.spec.ts:56`：发送后 `queued-message` 不存在；与 当时的架构工单册 QF-1 登记证据逐字相符，本单不计 | 留置 QF-1 |
| `rp25:60` 竞态修复 | `:1433 --repeat-each=5 --workers=1`：**5/5 passed**（7.6s）；两轮全量中也各过一次 | ✅ |
| 假绿 floor | 按收账裁决仅改 `assert-test-count.mjs` 一行 `143 → 146`；实跑输出 `146 条用例（下限 146）`，提交 `db9c271` | ✅ |

### 二、ch12 契约与视觉实测

| 验收点 | 实测证据 | 结论 |
|---|---|---|
| 至多三卡 / 两态右列 | `rp210.spec.ts` 两轮均绿；Preview 态 `right-module-stack .surface-card = 1` 且唯一为 `preview-host`，dock 透明坐 L0；关闭 Preview 后右列 surface card **0**，`data-mode=base` 且 `preview-open` 可重开。折叠钮 DOM 位于 `right-rail-chrome`、不在卡内，bounding-box 横向居中误差 <28px。 | ✅ |
| dock 带与留空 | 真机 1440×900 新截帧显示三 tap 横带直接落底纸，折叠钮独居其上留空；chat 两侧 computed padding 为 **12px 16px**，正文、turn 行与 composer 均未贴栏边。 | ✅ |
| composer / user message | `.composer-box` computed 为 1px `border-strong`（`rgb(213,219,226)`）、`box-shadow:none`、白底，文本与沉底按钮同住该有界容器；user message computed `border-width:0`、无影、微深藏青混合底；编辑态描边语义未被常态占用。 | ✅ |
| chat 卡片清算 | 两轮实测 gate/question 为白底 1px 轻卡；event/artifact/file 为 `border-radius:0` + transparent 扁平行。active 文本只消费灰阶 `breathe`，`session.confirmation` settle 后切 success，不永久闪烁。 | ✅ |
| 品牌锚位形 | turn 截图与 bounding-box 均显示 `brand-mark` 位于 assistant message actions 之后、turn 尾左下；静默态仅留无框 icon，点击可展开/收回思考摘要。SVG 恰四 path：藏青竖线 + 三横杠；无 spark-lines 替身。 | ✅ |
| 四项动效纪律 | `:1434` 真机逐帧采样：t0 竖线 opacity 1 / animation none，三横杠待写；t420ms 第一横完成、第二横书写中、第三横未开始，证明逐写；正文到达后 React 状态直接换 settled，path `transition:none`。Preview 数据卡与法理之线 computed 均 `animation:none`；motion 门仅准 transform/opacity/background/border。 | ✅ |

### 三、门禁反例与 git 卫生

1. **RP-2.10 boundaries 反例**：临时把 composer `border-strong` 降为普通 `border`，`lint:rp210` 立即 exit 1，明确报“composer 外框须略重”；反向补丁后复跑 `RP-2.10 ... boundaries: OK`。
2. **icons 20 反例**：临时把期望数 20 改为 21，`lint:icons` 立即 exit 1，明确报“实际 20”；反向补丁后复跑 `20 个具名 SVG（18 概念）` 通过。
3. 两项反例均只存在于隔离 worktree 且已反向补丁归零；未触 credentials、`src-tauri/*`、`packages/*` 或任何契约文件。验收实现级顺手项仅 floor 一行，独立提交前逐项检查 cached name；本节为 `apps/desktop/ACCEPTANCE.md` 纯追加。

### 四、主观视觉判断与结论

**视觉已达到 ch12“壳层视觉终章”的意图。** 1440px 全景里左栏是一张贯通锚卡，chat 回到底纸，composer 成为唯一中栏有界浮面，右侧只由 schema 承重；dock 与折叠钮退到底纸后，三层主从第一次不再互相争抢。gate/question 的轻卡仍可被一眼识别为“需要人回应”，但其描边和体量没有与 schema 卡争级；event/artifact/file 降为账本行后，turn 尾品牌锚成为安静的句号。base 态右栏大片留白不是缺内容，而是清楚表达“工作面已收起”；16px 留空与 composer 强边界把这种克制撑住。品牌横杠逐写短促、静默后只留卷宗形锚，识别度与反馈同体，没有借用法理之线，也没有把数据区带动。

1. **RP-2.10：放行 ✅**。20 文件范围内未发现新增实现级或契约级缺陷；ch12、#26.2/#26.3、chat 清算、composer 凡例与 `rp25:60` 修复均获机器 + 真机双证据。
2. **下游：可放行 QF-1 清账 ✅**。两轮唯一红均为已登记 `composer:56` 队列语义基线，本验收不越权修改、不把它计作 RP-2.10 失败；QF-1 仍须按独立工单修复并重新跑全门。

> **总判定：RP-2.10 放行；视觉达到 ch12 终章意图。** 两轮独立端口全量稳定为 145/146，唯一红严格等于登记 QF-1；Vitest 79/79、build 9/9、两项门禁反例、`rp25:60` 五连跑、floor 146 与实机逐帧/几何证据全部闭环。


---

## PRV-1 验收（provider 自配最小闭环·安全敏感件·主张逐条证伪，2026-07-11）

- **角色**：独立验收会话（Opus 4.8，AGENTS.md 全判例；安全敏感，逐条证伪、不采信自述）。实现者 sol。实现与验收分离。
- **范围**：`6fb92b9`（core：provider 推理路由声明）+ `193fa7e`（desktop：provider 自配闭环）。**权威**：当时的架构工单册 PRV-1 单 + FIX-KC-1 节（凭证语义基线）+ **docs/decisions/ADR-005-data-security.md 红线**「key 永不进事件流/日志/遥测」+「不做静默扫描本地第三方配置」。
- **隔离（复核历史提交判例 + 端口隔离判例）**：范围 tip `193fa7e` 落后当前 HEAD `24c61bd`（RP-2.10）两提交，据 AGENTS.md「复核历史提交一律用独立 worktree」建 detached worktree `/private/tmp/courtwork-prv1-accept@193fa7e`，未在共享主树 checkout/stash；`pnpm install --frozen-lockfile` 干净装。Playwright 起跑前 `lsof :1420/:1421` 均空，用 `COURTWORK_E2E_PORT=1421`、config 本身 `reuseExistingServer:false` 自起服务。集成态交叉核在主树 HEAD `24c61bd`（隔离 `:1422`）。

### 一、全局门（worktree@193fa7e 干净环境，退出码单查）

| 门 | 实测结果 | 码 |
|---|---|---|
| 9 包 build | `pnpm -r build`：`Scope: 9 of 10`（第 10 = 无 build 的根）全 `Done`，desktop `tsc -b && vite build` ✓ | `BUILD=0` |
| Vitest core | **158/158**（22 files） | `VITEST_CORE=0` |
| Vitest desktop | **79/79**（17 files） | `VITEST_DESKTOP=0` |
| cargo test | **10/10 逐名全过**（status_payload_contains_no_secret_field / mock_endpoint_discovers_models_then_runs_real_one_token_smoke / failed_payload_carries_user_facing_message_and_fail_kind / classify_os_status_maps_known_codes / parse_os_status_from_display_and_debug_text / wire_names_and_messages_are_zero_tech / trace_line_never_embeds_secret_fields_or_values / trace_disabled_by_default / dev_service_suffix_matches_build_profile / classify_keyring_no_entry） | `CARGO=0` |
| rustfmt（顺手，非阻断） | 装 `rustup component add rustfmt`；`cargo fmt --check` **报格式偏差**（lib.rs 若干处紧凑 match 臂/长数组/多行签名非 rustfmt 规范）——工单明示「失败不阻断但记录」，记录见五节 P-3 | `FMT=1`（非阻断） |
| Playwright @193fa7e | **139 passed / 141 total（隔离 :1421）**，两红 icons:3 + composer:56 → 二节归因（均非 provider） | `PW=1` |
| floor 门 | `assert-test-count.mjs`（minimum=143）@193fa7e **实抛红**：`Playwright 用例不足：发现 141，至少需要 143`（exit 1）→ 二节归因 | `1` |
| 门禁反例可触红 | `assert-elevation-shadow.mjs`：绿→注入 untracked `src/__redtrip__.tsx`（含 `boxShadow` 字面量）→**红 exit1**（`component contains shadow literal`）→删档→复绿，worktree 归零。门禁非空断言实证 | 复绿 0 |

### 二、Playwright 门归因（关键：`143/143 + floor 143` 不在 193fa7e tip 独立成立，系并行线前引用）

**事实（实跑，不采信自述）**：worktree@193fa7e `--list` = **141**；`assert-test-count.mjs`（floor 143）**实抛** `发现 141，至少需要 143`。全量跑 **139/141**，两红：

1. **`icons.spec.ts:3`（确定性，非 provider）**：`git show 193fa7e -- icons.spec.ts` 实证 PRV-1 把断言 `toHaveCount(19)`→`(20)`；但第 20 个图标 **brand-mark 由下一提交 RP-2.10（24c61bd）交付**——`git diff --stat 193fa7e 24c61bd` 实证 RP-2.10 新增 `src/icons/custom/brand-mark.svg`+`custom-icons.generated.ts`(+33)+`manifest.json`(+1)。故 193fa7e 只渲染 **19**（失败日志 `resolved to 19 elements`），期望 20 → 确定性红。**集成态 HEAD 实测 icons:3 绿**（20 齐）。
2. **`composer.spec.ts:56`（并行 flake，非 provider）**：193fa7e **单跑 composer.spec 5/5 全绿**（隔离 :1421）；仅全量并行下 flake 红——PRV-1 diff 注释自陈「回放进度到达后发送才进入 queued 分支；全量并行下不能只等静态 event-stream 壳」，QF-1 登记为在案基线。集成态 HEAD 单跑亦绿。
3. **计数缺口**：193fa7e=141 < floor 143。PRV-1 把 floor 禁降 137→143，但第 142–146 例由 **RP-2.10 的 `rp210.spec.ts`（+95 行 ≈ +5 例，141→146）** 补齐。

**集成态交叉核（主树 HEAD `24c61bd`，隔离 `:1422`）**：`--list` = **146 ≥ floor 143** ✓；`prv1.spec` **4/4 绿**、`icons:3` 绿；全量并行 flake 3 例（`composer:56` / `rp210:6` / `ux1:81`——均 paced-replay/品牌动画时序，属视觉/UX 线，非 PRV-1）。`prv1.spec` 四例（预设自动填 URL·custom 露 Base URL / 真冒烟标 connected+发现模型 / 诚实降级不阻塞 / 失败按分型不误报 connected）在两态均全绿。

**定性**：provider 闭环自身测试全绿；`143/143 + floor 143` **仅在集成树（HEAD）成立，193fa7e tip 独立不成立**——系 PRV-1（功能线）与 RP-2.10（视觉线）**并行、错峰提交**（当时的架构工单册 明列）且 PRV-1 前引用了 RP-2.10 的 icon#20 与 floor 值所致。**提交卫生问题（193fa7e 非独立门绿），非 provider 逻辑缺陷**；HEAD 已闭环。记 🟡 P-1。

### 三、安全主张逐条证伪

**1. WebView 无明文读取 ✅**：枚举 IPC 面——`invoke_handler`（lib.rs:833-838）恰注册 **4 command**：`provider_credential_status` / `save_provider_credential` / `clear_provider_credential` / `validate_provider_connection`。逐个读返回型：仅 `CredentialStatus`（序列化字段 phase/source/failureMessage/failKind，结构注释 lib.rs:408「永不含 secret」）与 `ProviderProbeStatus`（+ models/model_discovery）——**无 secret 字段**；单测 `status_payload_contains_no_secret_field` 断言精确 JSON `{"phase":"connected","source":"pasted"}`。持 secret 的 `get_password`(436) / `active_secret`(592) 是**私有 Rust fn（非 #[command]），JS 不可达**。key 仅**入**（`save_provider_credential` 的 `value: String` 参，用户粘贴）不**出**。冒烟请求 `bearer_auth(&secret)`（lib.rs:656/678）**全 Rust 侧组装**；JS 只经 `buildProbeInput` 传 base_url/model/reasoning_body，只收 phase/failKind/models（connection-client.ts:8-12,36-44）。

**2. connected 唯冒烟成功论 ✅（D-1 残留证伪）**：状态机读透——App.tsx `credentialStatus` 唯一写入者 `probeCredentials`(240-245) 走 `providerConnectionClient.validate()`（smoke），**非** `credentialClient.status()`（keychain）。`validate`(connection-client.ts:65-85) 以 keychain-connected 为**前置门**（68 早返回非 connected），Tauri 下必 `invoke('validate_provider_connection')`(80) 真冒烟；Rust `probe_provider_endpoint` **唯 `smoke.is_success()` 才 `phase:"connected"`**（lib.rs:680）。三处 `setCredentialStatus`（156 pending 初值 / 243 smoke 结果 / 1245 `onStatusChange`）——ProviderSetup 的 `save` 结果 `onStatusChange` 只在 `stored.phase!=='connected'` 分支触发（ProviderSetup.tsx:36-37），connected 恒来自 smoke `result`（42）。**无「钥匙串读到即 connected」残留**。冷启动零探针（懒探针 RP-2.9，无 mount 时 probe，初值 pending）。**模型发现失败不影响 connected**：probe 中 /models 非 401/403 失败仅置 discovery=unsupported、models=None，冒烟照跑（lib.rs:657-670）。UI 安全声明明写「连接状态只以真实请求成功为准，读取到钥匙串不代表服务可用」（ProviderSetup.tsx:86）。`prv1.spec`「真实请求失败按分型呈现且不得误报 connected」实测（failKind=endpoint → composer-provider `data-phase=failed`）。

**3. key 不进日志 ✅（码 + 实测双证）**：trace builder `build_trace_line`(224) + `key_looks_sensitive`(246) 防御式丢弃敏感键（secret/password/value/key/apiKey/token）；逐个 trace 调用点（`trace_op`/`trace_event`/`trace_status_exit`/`trace_startup_once`）**仅收 account 常量（`provider-secret`/`active-source`，非值）、service、ok、枚举、签名元数据——secret/value/env 名零写入路径**。冒烟路径唯一 trace 是 keychain `get`（记 account 名非值）；`probe_provider_endpoint` 本身零 trace 调用。**实测**：`COURTWORK_CRED_TRACE=1 cargo test -- --nocapture` 一轮（含 mock 冒烟 secret `never-log-this-secret` + 单测注入 `sk-leaked`/`hunter2`/`should-not-appear`）→ 全输出中该等 secret **0 次**、无 `Authorization`/`Bearer` 值；单测 `trace_line_never_embeds_secret_fields_or_values` 真断言（注入敏感键整个被丢弃）。docs/decisions/ADR-005-data-security.md 红线守住。（真机日志文件 `~/Library/Logs/cn.courtwork.desktop/credential-probe.log` 的 grep = 用户真 key 首跑闭环，见七节；FIX-KC-1 已 runtime 注入实测在案。）

**4. 分型全覆盖 + UI 零技术 ✅**：Rust `classify_http_failure`(637-645) **穷举 match**——401/403→`auth_failed`、404→`endpoint`、429→`rate_limited`、400/422→`model`、else→`invalid_response`；`probe_provider_endpoint` `is_timeout()`→`timeout`、`Err(_)`→`network`。**鉴权/限流/端点/模型/超时/网络六型齐**（+ invalid_response/platform 兜底）。文案全零技术（无 HTTP 码/ACL/OSStatus/keyring/bearer，grep 实证 Rust `user_message` 与 TS `PROVIDER_CONNECTION_MESSAGES`/`FAIL_KIND_MESSAGES`）。**自动 mock/hook 驱动覆盖**：成功（Rust mock TCP 端点 + TS + e2e 三层）、`endpoint`（`prv1.spec` + `connection-client.test`）、`auth_failed`（`d1-case-scope.spec:40` + `settings.spec:118`）——共 3 型 + 成功端到端驱动；余 rate_limited/model/timeout/network 由穷举 match + 文案表覆盖（非各自 mock 端点单驱），列覆盖注记（五节 P-4），非缺陷。

**5. quirk 声明化铁证 ✅**：`ReasoningRoute` = 判别联合 `model_switch | request_field`（quirk-profile.ts:3-5）；`resolveReasoningRoute`(40-47) **switch 于 `route.kind`、非 providerId**（注释「调用方只解释 kind，不按 providerId 分支」）。grep 全域（apps/desktop/src + packages/core/src）**零** `if(providerId==)`/`switch(providerId)` 类路由分支——唯 `.find(item=>item.id===config.providerId)` 数据表查 + `providerId==='custom'` 露 Base URL 的 UI 开关；Rust 侧 `let _provider_id`（lib.rs:692）显式弃用、仅诊断标识，路由由声明生成的 `reasoning_body` 驱动。**三家逐条对 PRV-1 单**：DeepSeek=`model_switch`（standard `deepseek-v4-flash`/deep `deepseek-v4-pro`）、Qwen=`request_field enable_thinking`（false/true）、豆包/custom=`request_field reasoning_effort`（low/high）——与单一致。单测 `quirk-profile.test`「without a provider branch」+ `model-config.test`「reasoning request delegates to the declared quirk route」三路由实证。

**6. 降级诚实 ✅**：/models 不支持（非 401/403 失败/空/畸形）→ `discovery=unsupported`、models=None，**冒烟照跑**，成功即 connected（不阻塞）。空列表 `.filter(|items| !items.is_empty())`→None；畸形 `response.json().await.ok()`→None（lib.rs:664-667）**不崩**。`modelOptions` 合并 discovered+预设+当前 modelId（model-config.ts:154-157）——发现失败仍有预设+手输。UI：ProviderSetup 于 `modelDiscovery==='unsupported'` 提示「服务商未提供模型列表；已保留推荐模型与手动填写，不影响连接」(ProviderSetup.tsx:51-52)。单测 `connection-client.test`「honestly degrades discovery while keeping a successful smoke connected」+ `prv1.spec`「模型发现不支持时诚实降级但不阻塞连接」实测。

**7. 真实网络路径不在本验收（无 key）**：见七节结论闭环标注。

### 四、git 卫生

`6fb92b9` = `packages/core/src/provider/*` 9 文件（quirk-profile + openai-compatible-provider + structured-output + http-client + 各单测 + SPEC/package.json）；`193fa7e` = `apps/desktop` 26 文件（src-tauri/lib.rs +149、connection-client.ts 新、model-config.ts、ProviderSetup.tsx、SettingsPage.tsx、prv1.spec.ts 新、assert-test-count.mjs floor 等）。均**未触** demo-data/其它 src 包越界或 lockfile 语义外改动。验收全程隔离 worktree + 主树 HEAD 只读跑，**主树零改动**（他会话脏 docs/AGENTS.md/eval 未动）；反例 `src/__redtrip__.tsx` 已删、worktree `git status` 归零。本报告仅追加 `apps/desktop/ACCEPTANCE.md` 本节。

### 五、发现与处置

| # | 发现 | 定性 | 处置 |
|---|---|---|---|
| **P-1** | **`193fa7e` tip 非独立门绿**：`--list`=141 < floor 143（assert-test-count 实抛红）；`icons.spec:3` 前引用 RP-2.10 的 icon#20（19→20）在 193fa7e 确定性红。 | 🟡 提交卫生（并行线前引用 icon/floor，非 provider 缺陷） | 集成态 HEAD（24c61bd）已闭环（floor 146≥143、icons 绿）。记录供架构判并行线错峰提交口径；本单不代改（回退 19 会碾坏 HEAD）。**不阻 provider 放行。** |
| **P-2** | 套件全量并行 flake：`composer:56`（单跑绿）/ `rp210:6` / `ux1:81`——均 paced-replay/品牌动画时序敏感。 | 🟡 非 PRV-1（视觉/UX 线；`composer:56` 由 QF-1 在跟） | 记录。非本单范围；provider 四例（prv1.spec）两态全稳。 |
| **P-3** | `cargo fmt --check` 报 lib.rs 多处格式偏差（紧凑 match 臂/长数组/多行签名）。 | 🟢 非阻断（工单明示「失败不阻断但记录」） | 建议实现会话 `cargo fmt` 一遍归一；不影响功能/安全。 |
| **P-4** | 六型分型仅 3 型（成功/endpoint/auth_failed）端到端 mock/hook 单驱；rate_limited/model/timeout/network 由穷举 match+文案表覆盖，无各自 mock 端点单测。 | 🟢 覆盖注记（映射与文案代码级完备，穷举 match 低风险） | 建议补四型 mock 端点/hook 驱动固化为长期回归。不阻放行。 |

**无 🔴；无安全红线破口**（无明文返回通道 + connected 唯冒烟 + key 不入日志码+实测双证 + 六型齐零技术 + quirk 数据表零分支 + 降级诚实不崩）。

### 六、真实网络路径（无 key）说明

本验收无真实 provider key，故**未跑真实网络冒烟**（工单第 7 条明示「真实网络路径不在本验收」）。已证：冒烟请求组装、鉴权头、分型、connected 判定、降级、日志脱敏全部**代码 + mock/单测层实证**；真实往返（含真机日志文件 grep 无 key）留待用户产品内『验证连接』真 key 首跑——此为 provider 闭环**最终闭环**，承 FIX-KC-1 已在案的 runtime trace 注入实测。

### 七、结论（两问）

1. **PRV-1 放行？→ 放行 provider 闭环 ✅（附 🟡 提交卫生记录）**。安全七主张逐条证伪全立（WebView 无明文通道 / connected 唯冒烟成功 / key 不入日志码+实测 / 六型齐且 UI 零技术 / quirk 数据表零 `if(provider==)` 分支 / 降级诚实不崩）；provider 自身测试全绿（build 9/10、Vitest core 158 + desktop 79、cargo 10、`prv1.spec` 4/4）。两 Playwright 红**均非 provider 缺陷**：`icons:3` = 前引用 RP-2.10 icon#20（HEAD 绿）、`composer:56` = 并行 flake（单跑绿）。**唯 `193fa7e` tip 非独立门绿**（floor 141<143 + icon 前引用）记 🟡 P-1——系 PRV-1/RP-2.10 并行错峰提交后果，**集成态 HEAD `24c61bd` 已闭环**（`--list` 146≥floor 143、icons 绿、prv1.spec 4/4）；「Playwright 143/143 + floor 143」在集成树成立。
2. **「验证连接」按钮可直接交用户执行真 key 首跑？→ 可 ✅**。按钮全路径实现正确：Tauri 下 `验证连接`→`validate`→`invoke('validate_provider_connection')`→`probe_provider_endpoint` 真冒烟；bearer 头 Rust 侧组装无 key 外泄；`connected` 唯 `smoke.is_success()`；失败走 F4 六型零技术文案；/models 降级诚实不阻塞。真实网络往返本验收无 key 未跑——**用户产品内『验证连接』真 key 首跑 = provider 闭环最终闭环**（真机日志无 key 承 FIX-KC-1 runtime 实测在案）。

> **总判定：PRV-1 放行 provider 闭环 ✅（安全敏感·逐条证伪·隔离验证）。** 安全七主张全立（无明文返回通道、connected 唯冒烟、key 不入日志码+trace 实测双证、六型齐零技术、quirk 判别联合数据表零分支、降级诚实不崩）；隔离 worktree@193fa7e 全 provider 门绿（9/10 build、Vitest 158+79、cargo 10 逐名、prv1.spec 4/4）；门禁反例 elevation-shadow 触红即撤复绿实证非空。两 Playwright 红经四轮实跑（193fa7e 全量/193fa7e 单跑/HEAD 双 spec/HEAD 全量）归因确定：`icons:3`=RP-2.10 icon#20 前引用（HEAD 绿）、`composer:56`=全量并行 flake（单跑 5/5 绿），**均非 provider 逻辑缺陷**。唯 🟡 P-1：`193fa7e` tip 因并行线前引用 icon/floor 而非独立门绿，集成态 HEAD `24c61bd`（146≥143、icons 绿）已闭环——记录供架构判错峰提交口径，不阻 provider 放行。P-3 rustfmt 偏差 / P-4 分型 3/6 端到端单驱为 🟢 记录建议。「验证连接」按钮可直接交用户执行真 key 首跑（最终闭环）。


---

## 0.1.1 合流终验（Ship Gate Phase 3 · 放行 BUILD 的唯一钥匙，2026-07-12）

- **角色**：独立终验会话（Grok 4.5；AGENTS.md 全判例：实跑 / 端口隔离 / 裸 HEAD 禁用 / 提交独立成立 / 合流即清账 / 禁宽 add）。**实现与验收分离**——本会话未参与 QF-2 / RP-2.11 / PRV-1 实现。
- **tip**：合流后 `main` @ **`3adb34d`**（`docs(design): 终验第 0 步——tokens 契约同步 controlHover/gap12`）。祖先核验：`79f72c4`（QF-2）+ `d563a1b`（RP-2.11）+ `674b21d`（QF-2 merge）+ `193fa7e`/`6fb92b9`（PRV-1）均为 `merge-base --is-ancestor` 真。
- **隔离**：独立 worktree `/private/tmp/courtwork-final-011` **detached @ 3adb34d**（主树 `main` 当时被 `/private/tmp/courtwork-qf1` 占用且含他会话大量暂存回退，**未**在共享树 checkout/stash；未触 qf1 索引）。`pnpm install --frozen-lockfile` 干净装。Playwright **`reuseExistingServer: false`** + 隔离端口 R1 `:1431` / R2 `:1432`；首屏主观截图另起 `:1435`。

### 第 0 步 · tokens ↔ CSS 契约对表（契约先行·必先）

| 契约键 | tokens.json | styles.css | 期望 | 结果 |
|---|---|---|---|---|
| `color.bg.controlHover` | `#E6EAF0` | `--control-hover: #e6eaf0` | `#E6EAF0` / `#e6eaf0` | ✅ |
| `elevation.floatInset` | `12` | `--elevation-float-inset: 12px` | `12` / `12px` | ✅ |
| `elevation.shellGap` | `12` | `--elevation-shell-gap: 12px` | `12` / `12px` | ✅ |

tip 已含 `3adb34d`，**无需**另落契约提交。不一致即 🔴——未触发。

### 一、全局门（全量实跑，退出码单查）

| 门 | 实测 | 码 |
|---|---|---|
| 9 包 `pnpm -r build` | `Scope: 9 of 10`（根无 build）全 `Done`；desktop `tsc -b && vite build` ✓ | `BUILD=0` |
| Vitest core | **158/158**（22 files） | `0` |
| Vitest desktop | **79/79**（17 files） | `0` |
| `cargo test` | **10/10 逐名全过**（status_payload_contains_no_secret_field / mock_endpoint_discovers_models_then_runs_real_one_token_smoke / failed_payload_carries_user_facing_message_and_fail_kind / classify_os_status_maps_known_codes / parse_os_status_from_display_and_debug_text / wire_names_and_messages_are_zero_tech / trace_line_never_embeds_secret_fields_or_values / trace_disabled_by_default / dev_service_suffix_matches_build_profile / classify_keyring_no_entry） | `0` |
| floor | `assert-test-count.mjs`：**152 ≥ 146** | `0` |
| Playwright R1 | **152/152** 隔离 `:1431`，**零红**（含 `composer:56` 合流后绿） | `0` |
| Playwright R2 | **152/152** 隔离 `:1432`，**零红** | `0` |
| 全部门禁基线 | motion / signature / graph / icons(20) / preview / elevation-shadow / rp26–rp211 / thinking-stream / floor — **15/15 exit 0** | `0` |

**原始日志路径（本机，非摘要）**：`/tmp/courtwork-final-build.log`、`/tmp/courtwork-final-vitest-core.log`、`/tmp/courtwork-final-vitest-desktop.log`、`/tmp/courtwork-final-cargo.log`、`/tmp/courtwork-final-pw-r1.log`、`/tmp/courtwork-final-pw-r2.log`。

### 二、门禁反例抽三（绿→红→撤→复绿）

| 反例 | 注入 | 触红信息 | 撤后 |
|---|---|---|---|
| shadow 白名单 | untracked `src/__redtrip_shadow__.tsx` 含 `boxShadow` 字面量 | exit 1：`component contains shadow literal` | 删档 → elevation OK |
| thinking 字符契约 | `ThinkingStream.tsx` 注入 `thinking-stream-glyph` | exit 1：`Character version must not use an SVG glyph` | 还原 → thinking OK |
| elevation 对 tokens | `styles.css` 将 `--elevation-shell-gap` 暂改为 `8px` | tokens 对表 `shellGap=12`≠`8px`；`assert-rp211` exit 1：`② 三栏间距须 8→12` | 还原 → rp211 OK |

worktree 反例后 `git status` **归零**（无脏吞）。

### 三、抽验矩阵

**① QF-2 四步切案 + 报告零编码 ✅**  
- e2e：`d1-case-scope`「案件 A 有 demo 状态 → 案件 B 零继承 → 回到 A 恢复 demo」含 QF-2 排队随 `caseId` 作用域（A 排队 → B 零 → 回 A 恢复）两轮绿。  
- `file-ops.spec`：报告断言「机器枚举/绝对路径/hash 留诊断层」+ `not.toContainText('/Users/')` 两轮绿。  
- 源：`CASE_SCOPE_AUDIT` queued 行；`FileOpsPlanPanel` 零编码暴露律注释与相对路径呈现。

**② RP-2.11 ①–⑧ + gap12 + 字符推理 ✅**  
- `rp211.spec` 五例全绿（段控真路由 / chat 内存态+存入 / ① 标题居顶栏 / ⑤ workmode 同源 / ⑥⑦ 20px+hover token / ⑧ 渐隐收敛）。  
- 门禁 `assert-rp211-contracts` + `assert-thinking-stream` 绿；gap12 即第 0 步 `floatInset`/`shellGap`=12。  
- **brand-mark 旧断言已迁移退役**：`rp210`/`ux1` 注释标明字符版改判；`ThinkingStream` 无 `BrandMarkIcon`/`thinking-stream-glyph` SVG 路径；icons 审计仍 20 具名 SVG（含 brand-mark 资产）但**推理锚不走 SVG 两套并存**。

**③ PRV-1 七主张摘要复核 ✅（合流态）**  
- 凭证 wire：`CredentialStatus` 序列化仅 phase/source/failureMessage/failKind，注释与单测 `status_payload_contains_no_secret_field` 仍立。  
- `prv1.spec` 4/4 两轮绿；cargo 10/10 含 trace 脱敏与 mock 冒烟。  
- **凭证语义零回退**（相对 PRV-1/FIX-KC-1 基线）：无 secret 出通道、connected 仍经冒烟路径、trace 默认关。

**④ ch12 三卡一纸不回归 ✅**  
- `rp210.spec`「三卡一纸：右列两态皆无 utility 卡，schema 唯一右卡」+ dock 坐底纸 / 折叠钮迁顶栏 两轮绿。  
- `assert-rp210-contracts` 绿。

**⑤ tokens↔CSS 契约 ✅**  
- 复证第 0 步三值对表全过。

**⑥ 首屏 1440 主观段**  
- 实截：`/tmp/courtwork-final-shots/03-work-1440.png`、`04-chat-1440.png`；仓内对照 `visual-audit/57-rp211-work-topchrome-1440.png`、`58-rp211-chat-canvas-1440.png`。  
- **观感**：Work 面三栏秩序清晰（左容器轨 / 中事件账本+composer / 右 schema 修订预览），法理之线与风险分级可读，字符推理锚（`| Thought process`）克制不抢戏，英/中分层不混；Chat 面轻画布+沉底五钮，顶栏标题居中、chrome 透明浮层不抢内容。  
- **判定：达投递演示标准 ✅**（可直接用于装包后对内/对外走查；真 key「验证连接」仍为用户闸最终闭环，不阻 BUILD）。

### 四、git 卫生

| 项 | 结果 |
|---|---|
| 收编祖先 `79f72c4` + `d563a1b` | ✅ 均为 main tip 祖先 |
| 凭证语义零回退 | ✅ 见第三节③ + cargo 脱敏单测 |
| 无脏吞 | ✅ 终验 worktree 始终 clean；反例注入均撤；**未** `git add -A` / 未碰 qf1 他会话暂存 |
| 本报告提交 | 纯追加 `apps/desktop/ACCEPTANCE.md`；提交时显式核对 `HEAD` → `refs/heads/main`（见提交记录） |

### 五、三问结论

1. **各线放行？**  
   - QF-2 ✅  
   - RP-2.11 ✅  
   - PRV-1（合流集成态）✅  
   - tokens 契约第 0 步 ✅  
2. **0.1.1 可 BUILD？→ ✅ 可放行 BUILD 0.1.1**（工序照 BUILD-1，版本号 0.1.1）。全局门 9 包 build / Vitest 158+79 / cargo 10 / Playwright **两轮 152/152 零已知红** / floor 152≥146 / 门禁反例可触红 / 祖先与凭证卫生齐。  
3. **首屏达标？→ ✅ 达投递演示标准**（见⑥主观段）。

> **总判定：0.1.1 合流终验放行 ✅ —— BUILD 钥匙签发。**  
> tip `3adb34d` 干净 worktree 全门实测：第 0 步 tokens 三值↔CSS 三变量对齐；9/9 build；Vitest desktop 79 + core 158；cargo 10/10；Playwright 隔离端口两轮 **152/152**（`composer:56` 合流消解后双轮绿）；15 门禁基线绿 + shadow/thinking/elevation 三反例触红即撤；抽验 QF-2 切案队列 + 报告零编码、RP-2.11 ①–⑧/gap12/字符推理（brand-mark 旧断言退役不并存）、PRV-1 七主张摘要、ch12 三卡一纸、首屏 1440 投递级观感均过。无 🔴。下游：**BUILD 0.1.1** → 用户闸（真 key「验证连接」+ 装包走查）。


---

## RELEASE-1 发版验收（2026-07-12，Fable @ Code · goal 模式——全量验收/debug/polish/push）

角色声明：发版级全量验收 + fix-by-acceptance（AGENTS.md 验收处置规则）；契约零改动，两处实现级缺陷顺手修（独立 commit `09d8b0b`）。

### 一、机器门全量（最终树双轮）

| 门 | 结果 |
|---|---|
| `pnpm -r build`（全仓真实 tsc） | ✅ 零错 |
| `pnpm test`（vitest 全仓） | ✅ 85 文件 / **734/734**（改动后复跑同绿） |
| `pnpm lint` | ✅ 零 error |
| 16 道门禁 + Playwright | ✅ **两轮 169/169** |
| floor | **167→169**（发版验收补测 +2，assert-test-count 禁降史续记） |
| `demo:s3` golden | ✅ PASS，预埋考点 **7/7**，事件序列与 W6 记录一致 |
| push 通道 | ✅ dry-run fast-forward |

### 二、浏览器真走查（dev 1420，全程 console 零错误）

待机主屏（品牌 icon/宋体 slogan/居中 composer/Ideas 行）→ 样板案直入 Preview 浏览器态 → 五视图逐 tab（时间线 47 件含 E08 矛盾行+B 级信源 peek / 图谱 14·15 dagre+关系依据 / 矩阵 10×7+「原文定位待接入」诚实句 / 修订预览高危拆出+民法典 C 级引用 / 起草画布+编译为 Word 钮）→ Gate 卡路由回修订预览 + question 轻卡 → 批量确认真按（阶段 0/6→4/6 联动）→ 大纲态四模块序（Progress 实时 4/6 / Preview 五条目 / Working folders 20 / Context 91%）→ 原件阅读汇流（同一 Preview；催告函/验收记录「待接入」三态诚实）。左栏「打开」走 systemOpen 属设计（Tauri 生效浏览器降级），非缺陷。

### 三、发现与处置

**实现级两缺陷（已修，各附"本应抓住它的测试"，`09d8b0b`）：**
1. 批量确认池不随处置递减——批后仍显"可批量 4 项"且钮可点（假报）；更重语义洞：先逐条驳回批内条目再批量，驳回被覆写回已确认（违"用户修正最高优先级事实"）。修：batchRefs 排除已处置条目；浏览器实证批后 0 项禁钮，e2e 断言驳回条目 data-tone 保持 neutral。
2. 阅读器三处——只读原件标题漏挂前视图「起草中」（话语层事故：原件只读是信任红线）；读态仍高亮工作面 tab；行内 `**强调**` 19 处字面星号漏出。修：meta=「原件 · 只读」、读态五 tab 零选中、行内 strong 渲染（实证 20 strong/0 星号）。

**契约审计（独立 subagent，只读）：违规零发现。** 依赖方向/装配点唯一性（core/src/composition/demo-assembly.ts 全仓唯一导入点实测）/provider 无关（quirk 单 DeepSeek 属既裁排期，通用工厂+custom 入口在）/留人确认（销毁级动词不存在，S3 修订仅 confirm 后产新文件不覆原件）/key 纪律（Rust 结构化脱敏，JS 全仓零 console.*）逐条通过。三项文档-实况漂移收账（`7a42a74`）。

**desktop 源码质量审计（独立 subagent）：在途未回。** 范围为 polish 级（死代码/孤儿样式/残留），非发版阻塞：技术词暴露与色板纪律已有机器门（AUDIT 正则/assert-neutral-source）双轮压过。回报后按需另行追加处置记录——不冒充已完成。

### 四、收束件

RM-1 定形版 README（`0c8a463`，命令全部当日实跑）；当时的架构工单册 镜像材料六件 + career-kit prompt + 当时的 UI 清单 验收册入库、数字对齐实测（`e5cd42f` 等）；根 test-results/ 入 .gitignore（`3241753`）。

### 五、结论

**发版放行 ✅**：build/unit/lint/16 门禁/e2e 双轮 169、demo 全动线真走查零 console 错误、演示无 key 自足、工作树清账、判例卫生（显式路径分批、零宽 add）。push 随本报告提交执行。

### 六、desktop 源码质量审计回报收账（RELEASE-1 追加，2026-07-12）

**通过项（独立 subagent 实测）**：console.log/debugger/TODO/FIXME 双侧（TS+Rust）零命中；组件零裸 hex，styles.css 色值 100% 收束 :root token 块；5 个 tauri command 调用链零 unwrap/expect（唯一生产 .expect 在启动引导，官方模板惯用）；转发白名单（探针公证 origin 四元精确匹配+禁 userinfo/query+固定子路径）与 CSP/capabilities 窄权限被点名为强项；package.json 脚本零断链；UtilityRail 退役零残留。

**[需架构拍板] 一项**：`provider/ModelConfigPopover.tsx:36` composer 模型 chip 弹层直露 "Provider" 标签与下拉——收敛令②（provider 撤入 developer 层，设置页已落 4030e45）与 #40 拍板（允许显式覆盖禁静默，chip 显实际生效模型为刻意设计、源码注释自证）在此并行入口交叉；弹层归属哪条规则待裁，验收不代判。

**慢火池清单（polish 级，非发版阻塞，全部留置待专单）**：①6 处零引用导出（StackModule 族/AttachmentStatusKind/DEMO_WORK_DRAFT_DIR/getDemoHostSnapshot/isConfigured@deprecated/recordingFor）；②9 个 capture-*.mjs 历史审计脚本未接线（visual:audit 之外）；③孤儿 CSS ~30 块——其中 utility-dock 族/generated-callout/chat-global-action 三族有 e2e 负测实锤已死，titlebar/statusbar 族因 rp1/rp2 断言方向未复核置信度降档，长尾未穷举；④icon-audit.css（dev-only 独立页）绕 token 手抄色值。留置理由：宁留置勿误吞——发版前夕批量删码与"克制"相悖，且清单含未定项（statusbar 断言方向）。

**结论不变：发版放行 ✅。**

---

## FABLE-BASE 底座修缮报告（2026-07-12，Fable @ Code——批次七全项 + Button 全量核对 + 滚底首例）

方法照章程：**先分发功能核验**（两支 Sonnet 探针端口隔离 1425/1426，真点真发真量测——批次七探针 9 子场景 23 截图零 console 错误；Button 探针 40 脚本 150+ 次交互全程监听），**证据先行再动码**；每修必附守护测试，floor 只升（169→181，禁降史续记）。

### 一、批次七落地

| 项 | 探针实证现状 | 处置 |
|---|---|---|
| ① system prompt | messages 仅 [user]，零 system 段 | chat-assembly 三件（身份/红线简版/语言约定），systemPrompt 一等字段上 wire，快照锁字节（d7ee188） |
| ② md 渲染 | 标签计数全 0，换行都丢 | 零依赖小解析器：段落/标题/两种列表/围栏代码块（paste 同凡例复用）/行内加重与 code；思考折叠同走（ab5a809） |
| ③ 测宽 | 消息列 75-76% vs composer 95-97%，差值随视口扩大 | **值提案报裁**（见三-1），未擅动 |
| ④ 路由律 | chat 内建案/点案/点阶段三条全不切面 | switchSegment 正门四接线：建案（含容器化/存 chat）/左栏点案/点阶段/⌘K 跳案（4f37359） |
| ⑤ 导入反馈 | 链路全通；"Unnamed container" 英文串泄漏 | 兜底改「未命名容器」（b4202d3）；keychain 多弹与导入怪象照预裁归 DBG-4 等用户 trace |
| ⑦ 思考动画 | chat 品牌三横/work 字符▏两面不统一 | work thinking 态换 BrandThinking，settled 字符锚保留，terminal-blink 随消费者退役，门禁改判随批（87f17be） |
| ⑨ 红绿灯 | —（真机项） | 避让机制核对在位（Overlay+浮层 chrome+避让区）；像素间奏照既裁属 sol 真机核 |

滚底首例（工单点名）：MutationObserver 跟随 + 48px 钉底阈 + 上翻暂停 + sticky 零高槽浮标（无字圆钮），浏览器三步实证 + e2e 双守护（a83f43a）。

### 二、Button 全量核对（验收标准：每一个 Button 都是期待的效果）

探针判定表全量在册（探针产物目录）；**七实锤全修**（67a938e，五条可确定性复现项入守护）：+菜单 overflow 裁剪整层不可见（case-menu 单独豁免过的同病漏项）｜+菜单/case 下拉/Owner 菜单三处收敛纪律孤立缺口｜未连接点 Send 吞草稿（onSend 增受理语义）｜Focus+收栏白屏（Focus 态藏钮）｜Owner 菜单幽灵开态｜剪贴板裸异常｜Ran command 收不起（受控 details 打架）。

### 三、[需架构拍板] 报裁清单

1. **测宽收敛值提案**：内容列统一 max-width **760px 居中**，composer 与消息列同宽对齐（现两者 75% vs 96% 且差值随视口扩大；frontier 惯例单列 720-768 封顶）。批②预裁"值提案过目"，此为提案值。
2. **store-chat 建案后切 work**：照④预裁字面实现，副作用=刚存对话离开当前视野（work 面显示 work 会话）。若观感突兀，可选"切面+chat tab 轻提示"变体。
3. **Settings 默认落地 tab**：现为 About & updates；探针建议候选 Model（近期改造重心）。
4. **Model 设置页中英并存**：英文外壳内嵌中文凭证表单，同页两处"验证连接"（中文凭证区/英文 Reasoning 区），词表归宿待裁。
5. ModelConfigPopover Provider 暴露（RELEASE-1 已上报，仍待裁）。

### 四、留置与他线

- **DBG-4**（keychain 多弹+导入反馈怪）：照批⑤预裁等用户 trace 剧本回传，本单未动。
- **慢火池追加**：R 卡"复制卡片内容"混入 UI 标签文字；Output 导航"已绑定文件夹"路径补测；probe A 未覆盖项清单（原生对话框系/Review and enable/Usage telemetry/Send feedback）。
- **原件「打开」裁定非缺陷**：走 systemOpenClient（Tauri 系统打开/浏览器降级 toast），应用内阅读另有 Working folders 入口（RELEASE-1 已验）——探针存疑项①结案。
- **Panels.tsx 留痕**：他线在途热文件一处 unused param，就地最小修（`(risk, index)`→`(risk)`）不入本会话提交，随他线收编——跨包阻塞性实现级三条件：语义等价/本处留痕/完工回报标出。

### 五、RELEASE-1 更正（假绿自曝）

RELEASE-1 验收表「`pnpm lint` 零 error」为**假绿记录**：历史验证跑法 `pnpm lint | tail` 令管道尾命令吃掉退出码，143 errors 长期隐身（干净 worktree @ HEAD 复现实证）。本批修至 **lint 整仓真绿 exit 0（仓史首次）**：config 补 scripts node 全局与 docs 出面、五处真代码清账（2610c9b）。历史各单 SPEC 中"lint 零 error"记录同疑，未逐条回溯——以今日起的 exit 0 为新基线。同型教训：验证命令一律保真退出码，禁 `| tail`/`| grep` 终端。

### 六、机器门终值（本单收口）

全仓 build 零错（exit 0 保真）｜root vitest **734/734**｜desktop vitest **94/94**（+9 本单）｜**lint 整仓真绿 exit 0（仓史首次）**｜16 门禁 + Playwright：R1 184/185（Split-Tab 单红=环境性 flake：他线共树编辑触发 vite 重载,隔离 3/3 绿,D-1 flake 判例形制分诊）→ **R2/R3 连续 185/185 exit 0**；floor **181**（本单 +12,禁降史 …169→171→172→173→176→181）。总数 185 含他线在途重建 spec（其 4 条,过验归他线收编,本单不代收）。

---

## FABLE-BASE 五裁执行收账（2026-07-12，用户当场清五项）

用户对 FABLE-BASE 报裁五项当场裁决，逐条落地（浏览器实证 + 守护测试 + 双轮门禁）：

| # | 裁决 | 落地 | 提交 |
|---|---|---|---|
| ① | 测宽 760 批准（4 基阶，与 welcome 560 成梯度） | --content-measure 760，内容列与 composer 同源；1280/1600 双测恒 760，病根消除 | ef861c1 |
| ② | 语义解法：chat 内建案=隐式存入 | chatHandoff ref + createCase 返回 id + 切案 effect 定向注入（D-1 隔离不破）；chatspace 单例保留；浏览器三态实证 | 2c44113 |
| ③ | 默认 tab = Model（最高频入口） | openSettings('about')→('model') | af56b0a |
| ④ | Model 页统一英文 + 双验证去重 | CredentialForm 全英译（含信任声明句）；删 Reasoning 区冗余 Verify + 孤儿 prop，页级唯一入口；5 spec 按钮名同步 | af56b0a |
| ⑤ | Popover Provider = 既裁（27d9b2b），非新裁 | ModelConfigPopover 撤 Provider 下拉（并行入口口径就此统一）；3 spec 删 provider 附带步 | 99b1527 |

**机器门终值**：build 零错｜desktop vitest 94/94｜lint 整仓 exit 0｜16 门禁 + Playwright **R1/R2 连续 186/186 exit 0**；floor 181→182。词表归宿（F4 分型/恢复指引中文、Model 页 chrome 律余项）另裁未动，如实标注。

---

## LUNA-UI-001 Minimap 生命周期快修（2026-07-13）

实现提交：`7a60764 fix-by-acceptance: flush minimap before graph destroy`。

根因：G6 5.1.1 Minimap 默认以 128ms debounce 执行 `renderMinimap()`，但插件 `destroy()` 不取消已排队回调；关系图谱渲染后快速切到矩阵等工作面时，Graph 已清空 `context`，迟发回调继续执行 `model.getData()`，形成 `Cannot read properties of undefined (reading 'getData')`。

最小修复：Minimap render delay 归零，并把 Graph 销毁推迟到下一宏任务，使已排队 minimap render 在 context 尚有效时先落完；功能、样式与 `.courtwork-minimap` 既有契约不变。

守护测试先红后绿：新增 `LUNA-UI-001：图谱渲染后快速切面不得留下 minimap 迟发异常`，监听 `pageerror`，在 graph `data-layout-ready=true` 后立即切矩阵并覆盖旧 128ms 窗口。旧代码稳定捕获 `getData` 错误；修复后单跑通过，重复 **10/10**，UX-1 **8/8**。

回归：desktop Vitest **99/99**；`pnpm lint` exit 0；`pnpm -r build` exit 0；独立端口 `1422` 的 16 门禁全部通过，Playwright floor **190→191**，全量 **191/191**。

按“实现与验收分离”不变量，本会话只记录实现与自测，`LUNA-UI-001` 正式关闭仍须另一验收会话复验。

---

## LAUNCH-FIX 独立验收（2026-07-13）

验收对象：`origin/codex/launch-fix@559d8d9`；环境：全新 detached worktree `/Users/lesprivilege/Projects/Courtwork-launch-fix-accept`，`pnpm install --frozen-lockfile`，Playwright 独立端口 `1521/1522`，未复用共享 dev server。

结论：**三项承诺护栏全部放行；允许合流 main 并恢复 SOL-LAUNCH。** 验收中发现并修复一项实现级缺口，提交 `f4a9fb1 fix-by-acceptance: rederive Word freeze after artifact removal`；无契约改动、无 `[需架构拍板]` 项。

### 1. 遥测真开关

- 运行码静态核对：`App.tsx` 三类事件（`review_item_opened`、`review_evidence_expanded`、`review_disposition_submitted`）只调用 `emitReviewTelemetry`；唯一 `.emitReviewTelemetry(` 直连仅存在于门后 sink 装配行。
- 关闭实测：真实 spy sink 收到 **0/3** 事件；开→关→开逐发射重读，sink 只收到第 1、3 枚。定向 Vitest **1 file / 2 tests passed**。
- 拔门变异：临时把 `if (!readEnabled()) return` 改为无条件 sink，原测试实跑 **2/2 failed**；首例明确显示 sink 被调用 3 次，第二例明确多出 `review_evidence_expanded`。随后用补丁原样恢复，复跑 **2/2 passed**，worktree 无变异残留。

### 2. Word 真接线与冻结权威

- S3 UI：确认前 `output-docx-card` 数量为 0；完成六项门禁后复用 `RiskList → RevisionInstructionSet → applyRevisionInstructionSet`，卡片出现并可打开/在访达显示。
- S4 UI：确认编译后桥回报 `答辩意见.docx` 存在，起草面才进入 `.frozen`；浏览器宿主仅承担 UI 接线测试，不作为磁盘证据。
- 删除反例首次实跑稳定红：删除浏览器宿主产物并派发窗口 focus 后，旧实现仍返回 `draft-panel frozen`。验收修复 `f4a9fb1` 后，同一用例证实 focus 会重新查询存在性，冻结与“打开 Word”能力均撤回。
- 真实磁盘证据：Rust 测试把仓内 **37,601 bytes 的真实 OOXML DOCX** 写到临时案件根的 `产出/答辩意见.docx`，核对绝对路径、长度、逐字节内容与 `exists=true`；随后真实 `remove_file`，复查 `exists=false`。`../escape.docx`、`nested/a.docx`、`/tmp/escape.docx`、非 docx 扩展名均被拒。
- Rust 全量：**18/18 passed**；Word/browser 客户端定向：**2 files / 3 tests passed**；`system-open.spec.ts`：**5/5 passed**。

### 3. 全门回归

- root Vitest：**104 files / 850 tests passed**。
- desktop Vitest：**24 files / 106 tests passed**。
- `pnpm lint`：exit 0；`pnpm -r build`：11/11 workspace projects exit 0。
- 16 道静态门禁：全部 exit 0；Playwright 独立端口 `1521` 全量 **192/192 passed**（4 workers），独立端口 `1522` 顺序复跑 **192/192 passed**（1 worker）。
- 环境事实：clean install 后若在 workspace 依赖尚无 `dist` 时直接单跑 output 跨包测试，会因 export 指向未构建产物而找不到模块；先执行仓库标准拓扑 `pnpm -r build` 后定向/全量均绿。此为现行 workspace 测试顺序要求，不是产品路径红项。

最终放行：**是**。`559d8d9 + f4a9fb1 + 本验收记录` 可由收账会话合流 main；本验收会话不自行 merge/push main。

---

## POLISH-P0 独立验收（2026-07-13）

- 验收角色：独立验收会话，非实现者。
- 权威主线：`main@54629896821b2f5c10a375b5a2a19e0315a5b65c`。
- 被验分支：`codex/polish-p0@3ad54919650978eaed56528c60720ce7b8cabced`；实现链为 `304daac`（Minimap 生命周期）→ `944ee8f`（thinking gate 边界）→ `3ad5491`（视觉证据与 SPEC）。
- 独立 worktree：`/Users/lesprivilege/Projects/Courtwork-accept-polish-p0`；Playwright 全部使用 `:1531`–`:1534` 隔离端口，`reuseExistingServer=false`，未复用共享 `:1420`。
- 结论：**✅ 放行合入 main；POLISH-P0 可关闭，并允许依赖其静态门的 SCHEMA-POLISH 验收继续。**

### 1. Minimap 旧反例与修复态

验收会话把 `GraphPanel` cleanup 精确回置为旧逻辑：`instance.rendered` 提前分支 + `MINIMAP_RENDER_DELAY_MS=0` 的 0ms destroy grace；在 `:1531` 对新回归实跑 40 轮 Graph ↔ Timeline 快切：

```text
Received Array [
  "pageerror: Cannot destructure property 'Symbol(Symbol.iterator)' of 'this.options' as it is undefined.",
  ... 共 11 条
]
1 failed
```

exit 1，证明回归不是假绿。随后用精确补丁恢复目标 tip，确认 `GraphPanel.tsx` 对 HEAD 零 diff。

修复态在 `:1532` 以 `--repeat-each=5 --workers=1` 连续 **5/5** 通过，共 **200 轮**快切；每轮同时收集未过滤的 `pageerror` 与 console error，结果均为空。全量 Playwright 另含一次同回归（再 40 轮）并通过。

源码核对：

- Minimap 仍注册、仍使用 `delay=0` 与 `.courtwork-minimap`；没有移除功能规避。
- cleanup 始终等待完整 `renderPromise.finally(...)`，再留 32ms 回调清空窗口后 destroy；不再读取 `instance.rendered` 决定提前销毁。
- 没有吞异常、全局 console/pageerror 过滤、patch `node_modules`，也未修改 `PartyGraph`、renderer ABI、主题语义或布局算法。

### 2. 图谱功能与静止边界

`:1533` 定向 Playwright **5/5**：

1. `.courtwork-minimap` 可见；
2. 放大后 zoom 数值上升，fit view 后回落；
3. 节点与关系选择能切换“节点关联依据 / 关系依据”；
4. G6 dagre 全量渲染 **14 节点 / 15 边**且标签零重叠；
5. 无极缩放仅在关系图谱沙盒生效。

配置与静态门继续锁定 graph/node/edge/layout `animation:false`；`lint:motion` 与 `lint:graph` 均通过，数据区未新增动画。

### 3. 四档视觉证据

`visual-audit/manifest.json` 与 PNG 独立逐项复算：

| 文件 | manifest viewport / 实际像素 | SHA-256 复算 |
|---|---|---|
| `polish-p0-graph-1180.png` | `1180×900 / 1180×900` | `46ac12d56ada80529ddaebe0700d51788b2313c62bd2fc91262246d4474f6beb` ✅ |
| `polish-p0-graph-1280.png` | `1280×900 / 1280×900` | `a1cc64809abd9384dbde04b44249e07db1df6afaa00f07c284704966a9e355e3` ✅ |
| `polish-p0-graph-1440.png` | `1440×900 / 1440×900` | `f72590eee8b12ef0b5a505c759ecb06ef1d0e510b4719c3a9fd9427f24d5b117` ✅ |
| `polish-p0-graph-1600.png` | `1600×900 / 1600×900` | `af5900a1de1aadfd9eb66e5977394a831e4e85bc6687f8db6a63a4b95b4cb8a4` ✅ |

manifest 记录 `actualHead=304daac`、`baseURL=http://127.0.0.1:1523`、`port=1523`、`reducedMotion=reduce`、`screenshotAnimations=disabled`。`304daac` 是被验 tip 祖先，且 `304daac..3ad5491 -- apps/desktop/src` 零 diff，因此截图与当前运行 UI 同源。四张图片逐张目视，均可见完整关系图、图谱控制和右下 Minimap，无旧帧冒充或重复帧。

生成器防污染反例：缺少 `COURTWORK_AUDIT_URL` 时 exit 1；显式传共享 `:1420` 时 exit 1，报 `visual audit must not reuse the shared Playwright port 1420`。

### 4. `944ee8f` thinking gate 阻塞修复

该提交只把 CSS slice 的 end marker 从与 start 相同的 `/* docs/design/principles.md` 改回紧邻的 `/* 状态条模型配置 */`，未修改 `ThinkingStream.tsx`、`App.tsx` 或 CSS 契约。

验收把 gate 单行精确回置旧 marker，对当前相同 UI 源实跑：

```text
Silent anchor must have no frame
Cursor must use the navy ink (竖线用藏青)
OLD_THINKING_GATE_EXIT=1
```

恢复 `944ee8f` 后 `lint:thinking` 输出 `ThinkingStream three-state/char boundaries: OK`、exit 0；完整 e2e 前置 16 门也通过。该修复是静态门自身的既有切片 bug 修复，不改变契约，可随 POLISH-P0 放行。

### 5. 完整门禁原始数字

- `pnpm install --frozen-lockfile`：12 workspace、1047 packages，exit 0。
- desktop 定向 Vitest：**24 files / 106 tests**，exit 0。
- root `pnpm test`：**104 files / 850 tests**，exit 0。
- `pnpm -r build`：**11/12 workspace projects** 全部通过；desktop **3485 modules**，仅既有 chunk size warning。
- `pnpm lint`：exit 0。
- `:1534` 完整 `test:e2e`：16 道前置设计/边界门全绿，假绿防护确认 floor **194**，Playwright **194/194 passed（1.8m，4 workers）**。
- `git merge-tree --write-tree main target`：exit 0，无合流冲突；生成候选 tree `2c8ce6b866768e3fd40c66df54910b5c4486eeff`。

验收未发现实现级缺陷，未产生 `fix-by-acceptance` 代码提交；仅追加本报告。未改契约、未合并、未 push。

> **最终判定：POLISH-P0 放行 ✅。** `3ad5491 + 本验收报告` 允许由架构/收账会话合入 `main@5462989`；Minimap TypeError 已由真实反例与 240+ 轮修复态快切闭环，四档视觉证据与当前代码同源，thinking gate 自身假红亦已由 `944ee8f` 独立反例验证修复。

---

## SCHEMA-POLISH-1 独立验收（2026-07-13）

- 验收角色：独立验收会话，非 `9ec3967` 实现者。
- 被验实现：`codex/schema-polish-1@9ec3967`；独立 worktree `/Users/lesprivilege/Projects/Courtwork-accept-schema-polish-1`。
- 集成基线：任务起点 `main@5462989`，首次合并 `9a344cd`；POLISH-P0 独立放行后前进式合并 `main@7ae3be4`，最终集成 merge `f8724d1`。
- Playwright 均使用隔离端口 `1547/1549/1551/1552/1553`，`reuseExistingServer=false`；未复用共享服务。
- 结论：**✅ 放行。`9ec3967 + 2e25859 + 本验收记录` 允许合入 main；SCHEMA-POLISH-1 可关闭。**

### 1. 边界与契约

- `git show 9ec3967` 只有 11 个 `apps/desktop/**` 文件：SPEC、呈现组件/CSS、Vitest、E2E 与测试 floor；没有 `packages/schemas`、`packages/core`、`packages/legal`、ADR 或 schema 字段/语义改动。
- 矩阵短名只由 `question.text` 机械裁切，没有领域 alias 表，也不写回 schema。临时删除 `是否/有无` 前缀裁切后，定向 Vitest 实跑 **1/2 failed**：`expected '是否约定了书面' to be '约定了书面验收'`；恢复目标实现后 **2/2 passed**，变异零残留。
- 首次完整 `test:e2e` 在进入 Playwright 前被当时 main 的已知 thinking CSS 空切片假红阻塞；该脚本不在 `9ec3967` 差异内，故记为“前置阻塞、非 SCHEMA 回归”。POLISH-P0 独立放行并合入 `main@7ae3be4` 后，本验收只前进式同步 main，没有单独夹带未验提交；最终 ThinkingStream 门与其余 15 道前置门全部通过。

### 2. 呈现、证据与门禁行为

- 矩阵列头呈现 `Q1 · 违约金`；focus 后完整 tooltip 为 `违约金比例（买方逾期付款）是多少？`。真实“查看引语”按钮可 Tab 聚焦、Enter 展开，`aria-expanded/aria-controls` 成对；未接通的“回到原件”保持独立禁用动词，不冒充可跳转。
- 风险行与详情同时显示严重度、核验、处置、下一步；样板案批量范围为 **4 项**、明确排除 **2 项**。高危/未核验项只有逐条通路，未展开全部依据前确认禁用；展开后下一步从“展开依据”变为“逐条确认”。
- 引语正文使用 `white-space: normal` 与 `overflow-wrap: anywhere`；文件名元信息承担截断。Context 承载 `Continue this case`，背景计算值为 ink `rgb(10, 37, 64)`；Progress 中无 continuation。L1 实测仍只有 Preview 一个 `.surface-card`，未新增空壳面板或装饰卡；既有空态、English chrome / 中文法律与 schema 内容边界由 RP-2.6/RP-2.7 与 SCHEMA 定向用例共同通过。

### 3. 验收发现与 `fix-by-acceptance`

四档截图发现首行矩阵引语 peek 向上展开：完整 rect `top=-35.5`，而 Preview host `top=8`；自动化此前只判 DOM `visible`，实际截图只剩底部“回到原件”，引语正文被 overflow 裁掉。

- 先补几何守护，旧 CSS 定向实跑 **1/1 failed**：`Expected >= 8, Received -35.5`。
- 最小修复只把 `.cell-peek` 从 `bottom: calc(100% + 4px)` 改为 `top: calc(100% + 4px)`，不改卡片、锚点、颜色或 schema 语义；提交 `2e25859 fix-by-acceptance: keep matrix evidence inside preview`。
- 修后定向 **1/1 passed**；1180/1280/1440/1600 四档的完整 peek 均为 `top=140.5, bottom=291.5`，位于 host `8..892` 内，页面均 `scrollWidth === clientWidth`。最终全量也包含该几何守护并通过。

### 4. 四档独立视觉证据

隔离预览 `http://127.0.0.1:1550`，`900px` 高、`deviceScaleFactor=1`、`prefers-reduced-motion=reduce`、截图动画禁用。每档分别生成风险详情、矩阵完整列头 tooltip、矩阵完整引语三帧；以下列出承重的风险/矩阵引语帧 SHA-256：

| 宽度 | 风险详情 | 矩阵引语 | 复核 |
|---|---|---|---|
| 1180 | `/tmp/courtwork-schema-polish-1-accept/schema-polish-risk-1180.png` · `95dbee3586d2d2797e7a10ede49282b90713526a64c6d4877313ce2445c2e275` | `/tmp/courtwork-schema-polish-1-accept/schema-polish-matrix-evidence-1180.png` · `0b3563300401d96fc0d19e049921d0317a4a8366596a2cf23efbac6b748040da` | 无全局横溢；引语完整 |
| 1280 | `/tmp/courtwork-schema-polish-1-accept/schema-polish-risk-1280.png` · `56ddf70ea59291887274b67ae0fdf162d85e1d607f0fe575dcf0bec6cab13412` | `/tmp/courtwork-schema-polish-1-accept/schema-polish-matrix-evidence-1280.png` · `28bc6627d1990ab115f3d226354d040b1ce75792da4eccedf4ef18de88a2214d` | 无全局横溢；tooltip 完整 |
| 1440 | `/tmp/courtwork-schema-polish-1-accept/schema-polish-risk-1440.png` · `fd70652c1f3e0f31cb5cccd257eeeeb26073c51a08ec30da160372c748efd5fb` | `/tmp/courtwork-schema-polish-1-accept/schema-polish-matrix-evidence-1440.png` · `191c2d55da574db076f00b43f4b8ab5db554b71ccc744bc8f6717794cbc3eb94` | 无全局横溢；来源动作诚实 |
| 1600 | `/tmp/courtwork-schema-polish-1-accept/schema-polish-risk-1600.png` · `2b33f1546cef32f701631e87e2558a58d72499b02806036a180879677b383990` | `/tmp/courtwork-schema-polish-1-accept/schema-polish-matrix-evidence-1600.png` · `e61f429852aa7ec42b7ea89a539e2fc7ce65c1de68284f31db52c7fd2fca5169` | 引语按窄列自然换行；无截断冒充 |

### 5. 最终机器门原始数字

- `pnpm install --frozen-lockfile`：12 workspace、1047 packages，exit 0。
- `pnpm -r build`：scope **11/12 workspace projects** 全部通过；desktop **3485 modules**，仅既有 chunk-size warning。
- `pnpm lint`：exit 0。
- root `pnpm test`：**104 files / 850 tests passed**。
- desktop Vitest：**25 files / 108 tests passed**。
- 提交 `2e25859` 后最终 `:1553` 完整 `test:e2e`：16 道前置静态/设计/边界门全部通过，假绿 floor **198**，Playwright **198/198 passed（4.1m，4 workers）**。

> **最终判定：SCHEMA-POLISH-1 放行 ✅。** 真实证据、状态与下一步动作均达到本单验收标准；验收发现的首行引语裁剪已由红测、最小实现级修复、四档视觉复核与全量回归闭环。无 `[需架构拍板]` 项，无 schema/core 契约变化。

---

## BRAND-1 独立验收（2026-07-13）

- 验收角色：独立验收会话，非 `e9bd9c3` 实现者。
- 被验实现：`codex/brand-1@e9bd9c319d2df5e22570136110ae04a552f7fc1a`。
- 合流基线：独立验收树最终合入 `main@c22fe1e`（含 PROVIDER-2、ADR-008 与现行 Evidence Line）；合流提交 `999e41f`。唯一冲突为 `docs/status/current.md` 的已完成任务排序，按 main 现行状态机械解决；BRAND 组件、样式与测试均无冲突。
- 独立 worktree：`/Users/lesprivilege/Projects/Courtwork-accept-brand-1`；最终 Playwright 使用隔离端口 `17646`、`reuseExistingServer=false`、单 worker，未复用共享服务。未触碰 `site/` 或 `archive/` WIP。
- 结论：**✅ 放行。BRAND-1 可合入 main。**

### 1. 品牌形制与边界

- 展开态 `.rail-wordmark` 中只有一枚 `BrandMarkIcon`，DOM 顺序恰在 `Courtwork` 文本左侧；SVG 源为 **4 条 `path`**，没有 `rect`、`img`、`title`、背景、底盘或其他装饰几何。
- 图标计算尺寸 **17×17px**，图标与文字水平间距 **7px**，两者垂直中心差不超过 **1px**。wordmark 与图标的计算样式均为透明背景、零边框、零圆角、零阴影。
- 图标 `aria-hidden=true`，没有 `aria-label` 或 `role`；可访问树只有一枚名称为 `Courtwork` 的 heading，没有品牌名重复播报。
- 静止态与 hover 后均为 `animation-name:none`、`transition-duration:0s`、`transform:none`、`opacity:1`，没有 hover、入场、磁吸或其他动画。
- 左栏折叠后品牌标记与 heading 同时撤出，原位展开控制仍可见；再次展开后恰恢复一枚标记与一枚 heading，collapsed 行为无退化。

### 2. 独立反例与验收加固

验收把 `.rail-brand-mark` 宽度从 `17px` 临时改为 `24px`，在隔离端口 `17643`、单 worker 只跑 BRAND 用例。用例真实失败：

```text
Expected: <= 18
Received:    24
1 failed
```

随后用精确补丁恢复 `17px`，确认样式零变异残留。验收另补齐 4-path、无可访问名重复、无 hover/animation 漂移、折叠撤出与再展开恢复断言，提交 `4da4e75 fix-by-acceptance: harden BRAND-1 e2e contract`。该提交只增强既有 E2E，不改变产品契约或实现。

### 3. 合流态最终机器门

- `pnpm -r build`：scope **12/13 workspace projects** 全部通过；desktop **3493 modules**，仅既有 chunk-size warning。
- `pnpm lint`：exit 0。
- root `pnpm test`：**108 files / 868 tests passed**。
- desktop `test:e2e` 前置 **16 道静态/设计/边界门全部通过**，含 motion、signature line、graph theme、SVG icons、preview/elevation、RP-2.6 至 RP-2.11、neutral-source 与 test floor；假绿门确认 **198** 条用例。
- `COURTWORK_E2E_PORT=17646 pnpm --filter @courtwork/desktop test:e2e --workers=1`：**198/198 passed（4.9m，1 worker）**；BRAND 定向用例包含于全量并通过。

无实现缺陷、无契约级问题、无 `[需架构拍板]` 项。

> **最终判定：BRAND-1 放行 ✅。** `e9bd9c3 + 4da4e75 + 本验收记录` 已在 `main@c22fe1e` 合流态完成全门验证，可由架构/收账会话合入 main。

---

## CHAT-UI-1 独立验收（2026-07-14）

- 验收角色：独立验收会话，非 `98826e6` / `bb5bddd` 实现者。
- 被验实现：provider seam `98826e6`，desktop/core/legal 集成 `bb5bddd6ea16fe4ff2e47091c27e0d1a6d0ffd7e`。
- 验收树：以任务基线 `main@5cce90e` 建立独立 worktree `/Users/lesprivilege/Projects/Courtwork-accept-chat-ui-1`，前进式合并为 `fb290f7`；分支 `codex/accept-chat-ui-1`。未在共享树 checkout、stash 或复用 dev server。
- 最终 Playwright 使用隔离端口 `1572`、`reuseExistingServer=false`、`--workers=1`，未复用 `1420`。
- 结论：**✅ 放行。无实现缺陷、无契约级问题、无 `[需架构拍板]` 项。**

### 1. provider / core 流式真值

- 真 HTTP 401 与 transport network failure 均先发 `started(seq=0)`，再分别以 `failed(kind=auth/network, seq=1)` 收敛。验收临时删除 `started` 发布后，provider 定向测试真实 **2/2 failed**：两条失败都从 `seq=0` 开始且缺少 started；恢复后 **2/2 passed**。
- core 对 provider 失败分类作机械透传。验收临时把 `providerTerminal.kind` 强制改为 `invalid_response`，重新 build core 后 auth/network 两条 desktop 定向测试真实 **2/2 failed**，分别收到 `invalid_response` 而非 `auth` / `network`；恢复后 **2/2 passed**。
- production chat 只经 `sendChatTurn → core runTurn → provider.stream`；测试 provider 的 `generate()` 明确抛错且测试确认从未调用。`started/reasoning/content/usage/completed/failed/canceled` 均由 core `TurnEvent` 机械投影，真实 content delta 在 provider terminal 前可见；旧 Typewriter/final responder 已退出生产路径。
- 测试 hook 只在 `import.meta.env.DEV && VITE_COURTWORK_E2E === '1'` 安装，注入面只接受 `ProviderStreamEvent`。验收把安装改为无条件后，`lint:chat-ui` exit 1（`Chat test hook must be explicit DEV+E2E only`），且生产 bundle 可检出 hook；恢复后 production build 中 `__courtworkChatHooks` / `setStreamFactory` / E2E provider 文案均为零命中。

### 2. journal、interaction 与来源授权

- localStorage 只有 `courtwork.turn-journal.v1` 单 envelope，精确字段为 `version/revision/entries/turnIds`。坏 JSON、未知字段、非法 envelope、index drift 均 fail closed 且不改写原始字节；quota 写失败直接抛出并保留前一份合法 envelope。验收临时探针覆盖非法字段、幽灵 turnId 与 quota，结果 **2 tests passed**；另以真实浏览器注入 index drift / 非法 known turn，恢复态 **3/3 passed**。
- 验收临时删除 index/entries 一致性检查，浏览器 recovery 断言真实变红，幽灵 turn 得以绕过；恢复后变绿。临时删除 `knownTurnIds()` 对每个 id 的 core replay，`lint:chat-ui` exit 1（`Known index must not bypass core replay validation`）；恢复后门禁通过。索引只作导航，不能替代 core replay 校验。
- `InteractionTurnCard` 只消费 `TurnReplay` 快照；question/options/anchors/resolution 均不另造本地真值。提交锁定 `submittingRef` first-wins、manifest `skippable`、失败后可重试、刷新后 pending card 恢复且不重复请求；Recorded 只在 core 接受 `interaction_resolved` 后出现。
- legal demo 由 `LEGAL_PACKAGE + registry + requestInteraction` 组装。样板合同引语在当前 `fileId/textLayerVersion` 文本中恰好唯一，range 与 slice 精确相等。source-open 先验证 file/version/range/quote slice，再 focus/scroll 原文；验收临时删掉 fileId 守卫后，未授权 anchor 会错误打开默认合同，定向 E2E 真实失败；恢复后错误可见且 reader 不打开。

### 3. 视觉、输入与静态边界

- interaction card 使用 verified/generated 冷色混合、1px hairline、6px radius；目标 slice 无 shadow、gradient 或 card-in-card。option 采用 ledger 分隔，不新增嵌套白卡。
- 指针按压只在允许控件产生 `.98` feedback；键盘激活不缩放焦点控件，`focus-visible` 保持；reduced-motion 下取消缩放且 source scroll 使用 `auto`。以上 pointer / keyboard / reduced-motion 与刷新恢复均在完整 E2E 中通过。
- `lint:chat-ui` 同时锁 production hook、core replay、TurnReplay 取值、样式 slice 与来源校验；`assert-test-count` 实测 **208**，达到 floor **208**。

### 4. 最终机器门原始数字

按验收要求在 `fb290f7` 代码 tip 顺序实跑：

- desktop Vitest：**30 files / 129 tests passed**。
- provider Vitest：**12 files / 86 tests passed**。
- `pnpm site:guard`：scanner fixture **12/12 passed**，扫描 **585 active text files**；neutral/elevation/signature/motion 全绿。
- `pnpm lint`：exit 0。
- `pnpm -r build`：scope **12/13 workspace projects** 全部通过；desktop **3504 modules**，仅既有 dynamic-import / chunk-size warning。
- root `pnpm test`：**114 files / 981 tests passed**。
- `COURTWORK_E2E_PORT=1572 pnpm --filter @courtwork/desktop test:e2e --workers=1`：16 道静态/设计/边界门全绿，假绿防护确认 floor **208**；Playwright **208/208 passed（2.7m，1 worker）**。

验收未产生产品代码修复或 `fix-by-acceptance` 提交；所有破坏性补丁与临时探针均已精确恢复，提交前工作树仅含本报告。

> **最终判定：CHAT-UI-1 放行 ✅。** `98826e6 + bb5bddd + 本验收记录` 可进入架构收账；provider 生命周期、core 终态语义、持久化防腐、interaction replay、legal source 授权与反 slop 输入边界均由真实反例和全量门禁闭环。

---

## HOST-PORT-1 独立验收（2026-07-14）

- **验收角色**：独立验收会话；未参与本工单实现，也不是实现会话前身。
- **对象**：`codex/host-port-1@ba6426acdc76b56b183c7b44edd3f33600b608fb`；任务基线 `b8815080501d7775a6e2fa27fefa756588496d92`。
- **验收树**：`/Users/lesprivilege/Projects/Courtwork-worktrees/accept-host-port-1`，分支 `codex/accept-host-port-1`，直接基于实现 tip 建立；未在共享主树 checkout、stash 或复用 dev server。
- **结论**：**✅ 放行。** 无产品代码修复、无契约级问题、无 `[需架构拍板]` 项。

### 1. 差异与架构边界

`git diff b881508..ba6426a` 共 8 个 `apps/desktop/**` 文件：新增 Tauri provider transport adapter 与 fake 测试，修改 composition root、`App` transport 注入、chat client 去宿主依赖、静态边界测试和 SPEC。以下范围在差异中均为零：

- `apps/desktop/src-tauri/**`：Rust command、受控 catalog、keychain、请求 body 与 raw frame 传输未改；
- `packages/provider/**` / `packages/core/**`：DeepSeek-only catalog、OpenAI-compatible adapter、provider stream/Turn 生命周期、失败闭集与 journal 未改；
- `packages/registry/**` / `packages/schemas/**`：manifest/schema/interaction 契约未改；
- `styles.css` 与工作面组件：chat 视觉、credential UI、持久化和 Work 语义未改。

新 `host/tauri-provider-transport.ts` 是从旧 `chat-client.ts` 搬出的同一窄桥：只提交 `requestId/providerId/modelId/reasoningBody/body`，没有 URL、header、authorization 或 key；`Channel`、async queue、`provider_chat_request` 与同 request id 的 `cancel_provider_request` 只留在 host adapter。`App.tsx` 与 `chat-client.ts` 对 `@tauri-apps/api`、`Channel/invoke` 和两枚 Rust command 名均为零命中；production 代码中 adapter 只由 `main.tsx` 在 `isTauriHostRuntime()` 成立时创建并注入。

没有第二 provider 状态机：`sendChatTurn` 仍构造已登记 descriptor 的 OpenAI-compatible provider，并唯一进入 core `runTurn`。浏览器 E2E hook 的形状仍是 `setStreamFactory(context) → AsyncIterable<ProviderStreamEvent>`；测试 provider 的 `generate()` 明确抛出 `E2E stream providers must run through core runTurn`。实际 E2E 脚本逐帧注入 `started/reasoning_delta/content_delta/usage/completed|failed`，没有 final answer 或 terminal projection 捷径。

### 2. fake transport 与边界反例

定向执行 adapter、chat client、静态边界三文件：**3 files / 12 tests passed**。其中 fake host 实测：

1. raw `response_started → chunk(bytes) → end` 原序透传，invoke 入参保持既有窄形；
2. `AbortSignal` 映射到同一 `requestId` 的 cancel command；
3. host invoke rejection 收敛为 typed、non-retryable `network` failure。

按验收纪律实际注入边界反例：在 `chat-client.ts` 临时加入 `@tauri-apps/api/core` 字面依赖，运行 `src/chat/chat-ui-boundary.test.ts` 后真实 **1 failed / 4 passed**，失败点精确为“chat 业务编排不依赖 Tauri host API”；撤除反例、确认 git 零残留后同文件 **5/5 passed**。

### 3. clean 环境与完整机器门

- `pnpm install --frozen-lockfile`：scope **13 workspace projects**，lockfile 无漂移，**1047 packages**，exit 0。worktree 安装前无任何 `node_modules`。
- clean install 后第一次定向 desktop 测试因 workspace package 尚无 `dist`，`@courtwork/core/turn-protocol` 无法解析；先执行仓库规定的真实 `pnpm -r build` 后，同一测试转为 12/12。该失败是 clean workspace 的构建前置证据，不是 HOST-PORT 回归。
- `pnpm -r build`：scope **12/13 workspace projects** 全部通过；desktop **3505 modules**，仅既有 Tauri static/dynamic import 与 chunk-size warning。
- `pnpm --filter @courtwork/desktop build`：**3505 modules**，exit 0。
- `pnpm exec eslint apps/desktop` 与 root `pnpm lint`：均 exit 0。
- desktop Vitest：**31 files / 133 tests passed**。
- root Vitest：**114 files / 981 tests passed**。
- `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`：lib **25/25 passed**，bin/doc tests 0，exit 0；含 arbitrary provider/input 安全、raw UTF-8 frame 与 cancellation tests。
- `COURTWORK_E2E_PORT=1592 pnpm --filter @courtwork/desktop test:e2e --workers=1`：所有静态/设计/边界前置门通过，假绿守卫确认 **208** 条，Playwright **208/208 passed（3.5m，1 worker）**；`reuseExistingServer=false`。

### 4. 真实 Tauri 壳 smoke 与端口记录

默认 Tauri 配置固定 `:1420`，验收用 CLI 临时 merge config 把 `beforeDevCommand` 与 `devUrl` 改到独立 `:1593`，未写仓库配置。`Vite :1593` ready 后 Rust dev binary 编译并出现：

```text
Running `target/debug/courtwork-desktop`
```

外部核验 PID `45560` 为 `target/debug/courtwork-desktop`，状态 `S+`，持续存活至少 **13 秒**；Vite 仅监听 `127.0.0.1:1593`。验收后 Ctrl-C 正常结束，复核无残留 Tauri 进程、无 `:1593` listener。

操作留痕：首次临时命令误写成 `pnpm dev -- --port 1593`，Vite 把 `--` 后参数当 positional，短暂启动默认 `:1420`。发现 Tauri 正在等待 `:1593` 后立即在 Rust shell 启动前终止，并确认 `:1420/:1593` 均无 listener，再以正确 `pnpm dev --port 1593` 重跑上述真实壳 smoke。未连接、复用或污染其他会话服务。

> **最终判定：HOST-PORT-1 放行 ✅。** `ba6426a + 本验收记录` 可进入架构收账。下游可依赖唯一 `ProviderTransport` 注入缝接 Tauri provider transport；本单只完成 provider host adapter，不把它冒充完整 Work/Credential/File port，也未改变任何 provider、Turn、Rust 或 UI 契约。

---

## VIEW-ABI-1 / VIEW-ABI-1C 独立验收（2026-07-14）

- **验收角色**：独立验收会话；未参与 `43e617607f4be694834b23005eeb807474f5986c` 的实现，也不是实现会话前身。
- **验收树**：`/Users/lesprivilege/Projects/Courtwork-worktrees/accept-view-abi-1`，分支 `codex/accept-view-abi-1`，直接从实现 tip 建立；未在共享主树 checkout/stash，未复用共享 dev server。
- **合入序列**：初始实现 `43e6176`；验收修正 `9b06175`、`cabdac0`；架构拍板原提交 `5ed2713` 在本树的等价 cherry-pick `3f55f59`；estimate 实现 `e48cc2c` 在本树的 cherry-pick `0b4c5a8`。
- **安装**：`pnpm install --frozen-lockfile`，13 workspace projects、1047 packages，lockfile 零漂移。
- **结论**：**✅ 放行。** 首轮发现的一项契约缺口已由架构角色拍板并由原实现会话补齐；验收会话未自行修改 schema/ADR。最终无未决契约问题或 `[需架构拍板]` 项。

### 1. 准入、路由与零入口边界

composition root 实测同次准入 `legal + pm`，artifact registry 共 **11** 项；scenario registry 共 **5** 项且全部来自 Legal。PM 只贡献 4 个 artifact/schema/presentation 与 `courtwork.artifact-table.v1` renderer 声明，`scenarios=[]`、`promptSegments=[]`，没有 PM 导航、demo 或空工作面。

生产路由先按 admitted artifact descriptor 取 `uiTemplateId`，再查 host blueprint。`App.tsx` 不再用四个 `artifactType === 'legal.*'` 分支、`HOMED_ARTIFACT_TYPES` 或 raw generic tree；模块状态机也不再持有 Legal type-id map。未知 artifact、未知 template、缺 host blueprint、schema/pointer/format drift 全部汇入同一 `UnsupportedArtifactView`，只显示人读标题或中性“结构化产出”与固定不兼容文案。

Legal 七类 template 与旧实现逐项对照：Timeline/PartyGraph/RiskList/ReviewMatrix 保持自动打开对应五面，CaseFile 保持 passive，FileOpsPlan 只展开 Working Folders，RevisionInstructionSet 保持不自动打开。首轮实现给 draft blueprint 留了 `moduleTarget:'draft'`，模块展开路径不读取 `autoOpen:false`，会改变旧行为；验收删除该 target 并把七个 blueprint 的完整形状锁入测试，提交 `cabdac0 fix-by-acceptance(view-abi): preserve draft auto-open behavior`。

### 2. 通用表、证据与 estimate 契约

原始 PrdReview 合法 fixture 证明：表头只来自 field-local label，枚举/status/tags 只显示 field-local `valueLabels`；anchor 只显示来源数、去重页码与完整 quote。含绝对路径、bbox、textRange、textLayerVersion/hash 的 fixture 静态 HTML 对这些值均零命中，quote CSS 为正常换行而非截断。

首轮验收额外构造 schema-valid `pm.PriorityScore`：低置信参数为 `{value:null, range:{low,high}}`，score 也为区间。实测当时 `schema.safeParse=true`，但 renderer 返回 `{status:'unsupported'}`，暴露 `/params/*/value + mono score` 无法承载合法区间。该项属于 presentation 契约，验收未越权修复；架构随后以 ADR-009 增量拍板通用 `estimate` format，原实现会话完成 registry 静态准入、PM descriptor `0.1.1`（`schemaVersion` 仍为 1）与宿主投影。

补丁后实际混合载荷同表投影成功：

- 直接 number score 与 envelope 单值显示 `8` / `10` / `0.8`；
- 直接 range 与 envelope range 显示 `10–12` / `0.4–0.8` / score `4–8`；
- envelope 的 value/range 皆空时只显示 field-local “未覆盖·需补材料”；
- 静态 HTML 对 `low/high/status/filled/out_of_coverage/range/value/fileId` 全部零命中，无 wire key/status 泄漏。

registry 准入只接受 finite number、精确 `{low,high}`、两者 union 或 `{value:number|null, range:{low,high}|null, status:enum}` envelope。envelope status labels 必须精确覆盖 enum；直接 number/range 禁带 labels。非法形状只拒载所属 PM 包，不污染同批 Legal catalog。

### 3. 真实变异与 fail-closed 证据

所有补丁均用 `apply_patch` 临时注入并精确恢复；下列红灯不是读取实现自述：

| 变异 | 实测红灯 |
|---|---|
| host 的通用 table template 改成未知 id | Host/composition 定向 **2 failed / 1 passed** |
| 删除通用 table host blueprint | Host/composition 定向 **2 failed / 1 passed** |
| PrdReview presentation pointer 改为 `/missing` 并重建 PM | desktop renderer 三项因 package admission fail closed，**3 failed** |
| 同时绕过 schema-first 与未知 enum label 拒绝 | malformed payload 泄漏 `wire-secret`，renderer 定向 **1 failed / 2 passed** |
| 在 `App` 恢复 `artifactType === 'legal.Timeline'` | `lint:view-abi` exit 1，精确报 Legal type-id switch |
| 在 fallback 恢复 `JSON.stringify(payload)` | 原门禁曾错误保持 9/9 绿；增强后同一变异 exit 1，精确报 raw payload serialization |
| PriorityScore Reach 退回旧 `/params/reach/value` | PM admission 报 estimate shape 不兼容，**2 failed / 6 passed** |
| 删除 `out_of_coverage` status label | 四参数分别报缺映射，PM 整包拒载，**2 failed / 6 passed** |
| 同时绕过 schema-first 与 envelope 双值守卫 | 双值被错误投影为 `1100`，renderer **1 failed / 7 passed** |
| 同时绕过 schema-first 与逆区间守卫 | 错误显示 `640–400`，renderer **1 failed / 7 passed** |
| 同时绕过 schema-first 与未知 status 拒绝 | 泄漏 `future-wire-status`，renderer **1 failed / 7 passed** |

raw fallback 静态门的首轮假绿是实现级缺陷，验收提交 `9b06175 fix-by-acceptance(view-abi): block raw artifact fallbacks`，新增对 `JSON.stringify(payload)`、`Object.entries/keys/values(payload)` 与 `Reflect.ownKeys(payload)` 的扫描；恢复后 VIEW-ABI 门为 **12/12**。这枚修正不改变 schema/ADR 或产品契约。

### 4. 最终机器门

在所有变异恢复、estimate 架构与实现合入后的最终 tip 顺序实跑：

- registry + PM 定向：**3 files / 69 tests passed**；desktop VIEW 定向：**4 files / 14 tests passed**。
- desktop Vitest：**34 files / 142 tests passed**。
- root Vitest：**120 files / 1060 tests passed**。
- `pnpm lint`：exit 0；`pnpm build`：scope **13 of 14 workspace projects** 全绿，desktop **3519 modules**，仅既有 Tauri dynamic/static import 与 chunk-size warning。
- `pnpm site:guard`：scanner fixtures **12/12**，扫描 **613 active text files**；neutral/elevation/signature/motion 全绿。
- `COURTWORK_E2E_PORT=1601 pnpm --filter @courtwork/desktop run test:e2e --workers=1`：全部静态/设计/边界前置门通过，假绿下限 **208**；Playwright **208/208 passed（2.8m，1 worker）**，配置 `reuseExistingServer=false`。

验收曾为可视抽查建立临时 PM/fallback 页面，但 in-app browser control 返回可用浏览器列表 `[]`，因此没有冒充 computer-use 截图。临时 HTML/TSX 与 Vite `:1599` 服务已全部删除/结束，git 零残留；视觉与几何仍由隔离真实 Chromium 全量用例覆盖，其中包含 1180/1280/1440/1600、品牌 SVG 位置、证据换行、零溢出与反 slop 判例。

> **最终判定：VIEW-ABI-1 与 VIEW-ABI-1C 放行 ✅。** `43e6176 + 9b06175 + cabdac0 + 3f55f59 + 0b4c5a8 + 本验收记录` 可进入架构收账。下游可以依赖 admitted descriptor → host blueprint → schema-first presentation 的唯一工作面链；PM 仍是 catalog-only，不得把本次通用表准入误解为已存在 PM workflow 或产品入口。

---

## WORK-PORT-1 独立验收（2026-07-14）

- **验收角色**：独立验收会话；未参与本工单实现，也不是实现会话前身。
- **对象**：精确实现 SHA `c2fcf6c149a9733638ebde29e245ecbaa8de1f47`；任务基线 `7be2855`。
- **验收树**：`/Users/lesprivilege/Projects/Courtwork-worktrees/accept-work-port-1`，分支 `codex/accept-work-port-1`；未在共享主树 checkout/stash，未复用共享 dev server。
- **结论**：**✅ 放行。** 无产品代码缺陷、无契约级问题、无 `[需架构拍板]` 项；验收补强一项 fixture 跨 session 回归测试。

### 1. 差异与架构边界

`git diff 7be2855..c2fcf6c` 共 11 个 `apps/desktop/**` 文件：通用 Work port 类型、demo fixture、composition root 注入、App 机械回放、静态边界门、定向测试与 SPEC。差异中没有 `packages/core/**`、`src-tauri/**`、provider、schema、registry、样式或 PM 代码。

- `WorkCommandPort` 只在 `protocol/client.ts` 声明 `start/resume/cancel` 契约；没有实例、React prop、executor 或 live wiring。
- `App` 不再 import/构造 demo client 或 recordings；`main.tsx` 是 `createDemoWorkFixture()` 的唯一装配点，显式注入 `WorkProjectionPort` 与 fixture-only adapter。
- `ScenarioRunInput`、`inputArtifacts`、`toolInputs`、actor/schema 构造在 React 中均为零；本单没有新增 Tauri command、provider path、localStorage Work state 或 PM UI。
- recording、paced replay、固定 gate、DEMO_ARTIFACTS、review/continuation 与 telemetry 空 sink 全留在 `demo/client.ts`。App 对非 demo case 不调用 fixture；已存在的 chat/provider/Tauri transport 路径相对基线没有语义改动。

### 2. 真实反例与 fail-closed 证据

所有破坏性补丁均用精确 patch 注入并恢复，提交前零残留：

| 反例 | 实测红灯 |
|---|---|
| App 临时回引 `createDemoClient` | `lint:work-port` exit 1，精确报 `App must not import or construct demo recordings` |
| `assertDemoRef` 临时取消 caseId 约束 | 定向 **2 failed / 2 passed**；非 demo case 得以读取 recording，被现有测试咬住 |
| 未知 session 临时回退 S3 recording | 定向 **1 failed / 3 passed**；错误 session 得以回放，被现有测试咬住 |
| 临时取消 requestId → session 归属校验 | 定向 **1 failed / 3 passed**；S1 ref 错读 S3 gate 被新增测试咬住 |
| 临时取消 telemetry event.sessionId 校验 | 定向 **1 failed / 3 passed**；S3 ref 携 S1 telemetry 被新增测试咬住 |

实现原测试已覆盖非 demo case、未知 session、非 demo review/continuation/telemetry/artifact 与 injected fake projection；但未永久锁住合法 demo ref 之间的跨 request/telemetry 污染。验收新增一条用例同时覆盖 S1 ref 读取 S3 gate、S3 ref resolve S1 request 与 telemetry session 错配，提交 `5b3441f26cf9cc6770e94052de79a59e837c7687 fix-by-acceptance(desktop): lock fixture session isolation`。该提交只改测试，不改实现或契约。恢复态定向为 **4/4 passed**，静态门全绿。

fake injected projection 由 `replayWorkProjection` 定向用例实测：查询参数精确传给 fake port，返回 events 只经 injected presenter 发布，phase 原样回传；结合 App 静态门对模块 singleton、demo import 与直接 recording 构造的禁止，证明 UI orchestration 不依赖隐藏 singleton。

### 3. clean 环境与完整机器门

- `pnpm install --frozen-lockfile`：scope **14 workspace projects**、**1047 packages**，lockfile 零漂移，exit 0。
- fresh install 尚无 workspace `dist` 时直接跑 desktop，真实出现 **14 failed suites / 21 passed files / 84 passed tests**，均为 workspace exports 指向未构建产物；随后按仓库拓扑执行 build，同一 desktop 全量转绿。该记录是现行 clean workspace 构建前置，不是本工单回归。
- `pnpm -r build`：scope **13 of 14 workspace projects** 全绿；desktop **3520 modules**，仅既有 Tauri static/dynamic import 与 chunk-size warning。
- desktop Vitest：**35 files / 146 tests passed**。
- root Vitest：**120 files / 1078 tests passed**。
- `pnpm lint`：exit 0。
- `pnpm site:guard`：scanner fixtures **12/12 passed**，扫描 **618 active text files**；neutral/elevation/signature/motion 全绿。
- `COURTWORK_E2E_PORT=1604` 完整 desktop `test:e2e`：所有静态/设计/边界前置门通过，WORK-PORT 门通过，假绿守卫确认 floor **208**；Playwright **208/208 passed（1.6m，4 workers）**。配置 `reuseExistingServer=false`，启动前确认 `:1604` 无 listener；未复用共享服务。

完整 Playwright 覆盖既有样板案节奏、artifact 自动开面、S3 gate、逐条/批量 review、确认响应、Context continuation 与跨案件清空/恢复；208 条零回归，证明端口抽离保持 demo UX 等价。

> **最终判定：WORK-PORT-1 放行 ✅。** `c2fcf6c + 5b3441f + 本验收记录` 可进入架构收账；验收提交必须与实现一同合入。下游 **WORK-BROWSER-1、WORK-STORE-1、CASE-ROOT-1 均可放行开工**，但本结论只背书 command/projection 注入缝与 fixture/live 物理分界，不代表 executor、durable store、material ingress、Tauri Work host 或 production live 已实现。

---

## TRACE-UI-1 独立验收（2026-07-14）

- **验收角色**：独立验收会话；未参与本工单实现，也不是实现会话前身。
- **对象**：精确实现 SHA `cef91484258bd15c9458ef619103e6a1ad3603ec`；任务基线 `bed44095133723d33de3e153b58a286a886a612b`。
- **验收树**：`/tmp/courtwork-trace-ui-1-acceptance`，分支 `codex/accept-trace-ui-1`，直接基于实现 tip 建立；未在实现 worktree 或共享 `main` checkout/stash，未复用共享 dev server。
- **结论**：**✅ 放行。** 无产品代码修正、无契约级问题、无 `[需架构拍板]` 项。

### 1. 同源组件与协议投影

Chat reasoning 与 Work progress 实际共用 `ProcessTrace` 组件、状态并集 `running | settled | empty | failed`、同一 `BrandThinking` 与 disclosure 交互；旧 `ThinkingStream` 已删除，Chat 没有独立 `<details>`。差异 grep 与 DOM/SSR 定向测试共同证明，复用不是只共享类名。

- Chat adapter 只读取 core `TurnProjection.reasoning/status`：pending/running、present delta、completed/failed 与 explicit absent 均作机械投影；`absent` 和空 content 不产生占位或伪文案。
- Work adapter 只读取 `progress/failures/completed/confirmation/phase`；正文只由 progress events 连接而来，不叫 model reasoning。`failed/canceled/interrupted` 优先于 completed/confirmation，因此不会渲染 settled 或完成事件。
- 运行态只含品牌 thinking、正确 mode label 与可选 actions；终态 0ms 移除动画。settled/含正文 failed 才提供原生 button disclosure，键盘 Enter 可展开；empty 零 DOM。

### 2. interaction card 与输入边界

`InteractionTurnCard` 只消费 core `TurnReplay` 中首个 `interaction_requested` 及匹配 requestId 的 `interaction_resolved`；question、options、description、skippable、source anchors 与 recorded answer 均来自不可变 replay snapshot。generic card 不按 Legal artifact/template type 分支，source-open 继续把 snapshot anchor 交给授权路由。

真实 Chromium 计算样式为：background `color(srgb 0.966824 0.977882 0.988941)`（位于 `--generated: #f6f9fc` 与 `--bg-raised: #fff` 的批准混合）、`1px` hairline、`6px` radius、`box-shadow: none`。完整引语正常换行，卡内没有第二层白卡、gradient 或 glow。

### 3. 实际变异与红灯

所有反例均用精确补丁临时注入并撤回；恢复后对应门重新变绿，提交前零产品代码残留。

| 变异 | 实测红灯 |
|---|---|
| Chat 退回独立 `<details className="chat-reasoning">`，Work 退回 `<ThinkingStream>` | `lint:trace` exit 1，命中 Work 所属 turn、Turn adapter、并行实现三项；`lint:chat-ui` exit 1，命中共享 adapter 与 native details 两项 |
| explicit `reasoning.absent` 伪造“无可用推理内容”并投影 settled | ProcessTrace 定向 **1 failed / 5 passed**，精确断言应为 empty 且零 markup |
| stopped Work 在 `completed=true` 时绕过 failed 优先级 | ProcessTrace 定向 **1 failed / 5 passed**，实际收到 settled 而非 failed |
| reduced-motion 下把品牌线动画恢复为 `1s infinite` | 独立端口 Playwright 定向 **1/1 failed**，计算值 `1000ms`，门限 `<= 0.01ms`；撤回后 **1/1 passed** |
| interaction card 改成纯白 raised surface 并加 shadow | `lint:chat-ui` exit 1，同时报 approved generated surface 丢失与 shadow 禁令 |
| generic card 按 `legal.risk-evidence-confirmation` 做领域分支 | `lint:chat-ui` exit 1，精确报 generic chat surface 泄漏 vertical content |
| source quote 改为本地伪造锚点，不再取 snapshot | InteractionTurnCard 定向 **1 failed / 2 passed**，精确缺失 replay 中完整引语 |

### 4. 真浏览器行为核验

在独立 `Vite :16652` 启动真实 Chromium，未复用 Playwright suite 的 browser context；临时审计脚本与服务验后均删除/停止。实测：

- Work mutation observer 捕获精确序列 `running → settled`；终态 label 为 `Work progress`，不是 `Thought process`；toggle 聚焦后 Enter 得到 `aria-expanded=true`，正文为真实 progress event。
- Chat 在途 label 为 `Thinking…`，只有 **1** 枚 `.brand-thinking`，Stop 可见；provider terminal 后同一组件成为 settled，键盘展开显示原始 reasoning delta。
- 第二轮点击 Stop 后 core 收敛为 `data-status=failed`、文案“已停止”，保留“已经到达的部分正文”，且 pending reasoning 没有伪造终态 trace。
- interaction source 逐字显示样板合同快照引语和文件名；卡片实际计算样式与上节 token/框线/零阴影一致。

内置浏览器控制连接在初始化时报 `Cannot redefine property: process`，因此未冒充 in-app computer-use；上述视觉与交互证据来自本验收树独立服务上的真实 Playwright Chromium，并另外生成两张 `/tmp` 审计截图作人工目检，未写入仓库。

### 5. 最终机器门

- `pnpm install --frozen-lockfile`：scope **14 workspace projects**、**1047 packages**，lockfile 零漂移。
- `pnpm -r build`：scope **13 of 14 workspace projects** 全绿；desktop **3521 modules**，仅既有 Tauri static/dynamic import 与 chunk-size warning。
- root `pnpm lint`：exit 0。
- root `pnpm test`：**120 files / 1078 tests passed**。
- TRACE/interaction 定向：**4 files / 13 tests passed**；`lint:trace` 与 `lint:chat-ui` 均通过。
- `COURTWORK_E2E_PORT=16651 pnpm --filter @courtwork/desktop test:e2e --workers=1`：全部静态/设计/边界前置门通过，假绿守卫确认 floor **208**；Playwright **208/208 passed（3.6m，1 worker）**，`reuseExistingServer=false`。

操作留痕：第一次定向 Vitest 在仓库根执行时被 root include 规则拒绝为 `No test files found`，改用显式 desktop cwd 后 13/13；第一次 E2E 命令误传额外 `--`，Playwright 启动 4 workers，发现后主动 Ctrl-C（22 passed、4 interrupted），随即换新端口以正确参数完成上述 208/208 单 worker 结果。两者均为验收命令问题，不是产品失败，且相关服务已停止。

> **最终判定：TRACE-UI-1 放行 ✅。** `cef9148 + 本验收记录` 可进入架构收账。下游可以依赖“一个 ProcessTrace、两种机械投影”的共享交互原语，以及 replay-snapshot 驱动的通用 interaction card；本结论不把 Work progress 冒充模型推理，也不扩展任何垂类 schema 或 provider 契约。

## CHAT-MATERIAL-1 独立验收（2026-07-15）

验收对象为 `main@6420f50481a1f31f95fa262e3f54479de3f24b5f`，基线 `ab79b5b2dda3b2fb087516b3e8031e1c4767a3ab`；验收在独立 detached clean worktree `/Users/lesprivilege/Projects/Courtwork-chat-material-1-accept` 完成。`pnpm install --frozen-lockfile` 实收 **14 workspace projects / 1047 packages**，lockfile 零漂移。Playwright 使用独立端口 `17651`–`17659`，均在启动前确认无 listener，配置 `reuseExistingServer=false`，未复用 `1633` 或共享服务。

### 1. 范围与越界

- `git diff ab79b5b..6420f50 --name-only` 精确 **9 文件**：4 源码、2 Vitest、1 E2E、`SPEC.md` 与 `assert-test-count.mjs`。
- `packages/schemas/**`、`packages/provider/**`、`packages/core` 的 `turn-protocol` 出口及 `packages/core/package.json` 差异为零；未改 schema、provider 或跨层导出。
- `Composer.tsx`、`AttachmentChip.tsx` 相对基线及验收修复均零差异。SPEC 所记“把 `ready ⟹ readingMarkdown 非空` 升为纯类型不变量属越界”判断成立：当前 `ComposerAttachment` 把 status 与可选正文正交保存，若改为真正 discriminated union，需连带改变 Composer retry 时的 status/正文重置构造，超出本单四源文件范围。未发现偷改，也无 `[需架构拍板]` 项。
- target 的 `apps/desktop/src` 尚残留 3 处旧附件占位字面（两处注释、一处单测）；另缺 handleChatSend 接线 unit 守卫与多轮 history 同源断言，因此 `6420f50` 单独不放行。验收以实现级小修提交 `74b5c19 fix-by-acceptance(desktop): lock chat material history assembly` 消除字面残留、补接线守卫与第二轮 E2E，并把 Playwright floor 单调升至 **212**；未改变产品契约或跨层接口。修复后 `rg` 在 `apps/desktop/src` 为零命中。

### 2. 真实请求与多轮 history

- target 首轮 E2E 捕获真实 `request.messages`，逐字收到用户文本与附件 `readingMarkdown` marker；空 markdown chip 为 `failed`、发送键 disabled、模型请求保持零次。
- 验收新增第二轮实收：第二次请求包含两条 user history；第一条同时含首轮展示文本 `FIRST-DISPLAY-TEXT-8R4X` 与附件正文 `MATERIAL-HISTORY-8R4X`，且不等于展示文本；第二条含本轮文本。由此证明上一轮使用 `ChatMessage.content` 的组装正文，不是 `message.text`。
- 修复态定向 `process-upload.test.ts` **10/10 passed**，`chat-material.spec.ts` **3/3 passed**。

### 3. 反例触红

所有变异均用精确补丁临时注入并撤回；恢复后工作树无变异残留。

| 变异 | 实测结果 |
|---|---|
| a. `handleChatSend` 退回 `payload.text || 旧附件占位` | target 初验时 E2E **1 failed / 1 passed**，unit 因只测纯组装器仍 **9/9 passed**，据此补守卫；修复态重注入后 unit **1 failed / 9 passed**，E2E **2 failed / 1 passed**，均精确缺附件正文 marker |
| b. `needs_ocr` 强制映射为 ready | unit **1 failed / 8 passed**（预期 failed、实得 ready）；真 UI needs_ocr E2E **1/1 failed**（chip 实得 `data-status=ready`） |
| c. 空与纯空白 markdown 映射为 ready | unit **2 failed / 7 passed**；空附件 E2E **1/1 failed**（chip 实得 ready） |
| d. 首轮留存/history 绕开 `requestContent`，自行保存 `payload.text` | target 初验 unit **9/9** 与既有 E2E **2/2** 假绿，据此补同源守卫；修复态重注入后 unit **1 failed / 9 passed**，新增第二轮 E2E **1 failed / 2 passed**，精确缺首轮附件 marker |
| e. spec 数降到 floor 以下 | target 把 211 降为 210 时守卫报“发现 210，至少 211”并 exit 1；修复态把 212 降为 211 时同样报“发现 211，至少 212”并 exit 1 |

### 4. 全量门

target `6420f50` 原样实跑：

- `pnpm -r build`：scope **13 of 14 workspace projects** 全绿；desktop **3532 modules**，仅既有 dynamic/static import 与 chunk-size warning。
- `pnpm lint`：exit 0。
- `pnpm test`：**131 files / 1127 tests passed**。
- `COURTWORK_E2E_PORT=17651 pnpm --filter @courtwork/desktop test:e2e`：全部静态门通过，floor **211**，Playwright **211/211 passed（1.6m，4 workers）**。

叠加验收修复 `74b5c19` 后从头复跑：

- `pnpm -r build`：scope **13 of 14 workspace projects** 全绿；desktop **3532 modules**，同上仅既有 warnings。
- `pnpm lint`：exit 0。
- `pnpm test`：**131 files / 1127 tests passed**。
- `COURTWORK_E2E_PORT=17659 pnpm --filter @courtwork/desktop test:e2e`：全部静态门通过，floor **212**，Playwright **212/212 passed（1.6m，4 workers）**。

操作留痕：验收补测最初使用 `node:fs` 读取 App 源码，desktop TypeScript 因不含 Node types 令 build 真实失败；该未提交验收写法随即改为 Vite `?raw` 导入，未新增依赖，随后上述全仓 build 与全部门从头转绿。

> **最终判定：条件放行 ✅。** `6420f50` 单独因 src 字面残留及两处防回归缺口不放行；`6420f50 + 74b5c19 + 本验收记录` 放行 CHAT-MATERIAL-1。成立范围仅为 desktop Chat：ready 附件正文、pasteBlocks 与用户文本逐字进入真实请求，needs_ocr/空内容显式阻断，且多轮 history 复用同源组装正文；不升级 MaterialStore、原件 hash、宿主授权、OCR、多模态或任何跨层契约。`docs/status/current.md` 未修改，能力行留给架构角色更新。

## CHAT-SESSION-1 独立验收（2026-07-16）— ❌ 不放行（[需架构拍板]）

验收对象：`e4832364325b0d49f6865e7be03427a8bf3788f7`，基线 `f4f06a6`；验收 checkout 为 `main @ 79d583d5b841b65bdae4cb37211af86f615f68f2`，确认实现提交是其祖先。验收在独立 clean worktree `/Users/lesprivilege/Projects/Courtwork-chat-session-1-accept` 完成，未在共享树 checkout、stash 或 prune worktree。

### 1. 范围与复杂度核对

`git diff f4f06a6..e483236 --name-status` 实收恰好 10 文件、`+810/-5`：

- `apps/desktop/scripts/assert-test-count.mjs`
- `apps/desktop/src/App.tsx`
- `apps/desktop/src/chat/SessionHistory.dom.test.ts`
- `apps/desktop/src/chat/SessionHistory.tsx`
- `apps/desktop/src/chat/session-transcript.test.ts`
- `apps/desktop/src/chat/session-transcript.ts`
- `apps/desktop/src/chat/session-window.test.ts`
- `apps/desktop/src/chat/session-window.ts`
- `apps/desktop/src/styles.css`
- `apps/desktop/tests/e2e/chat-session.spec.ts`

`packages/core`、`packages/schemas`、`packages/provider`、provider 导出及 `docs/status/current.md` 相对基线均零差异；package manifest 与 `pnpm-lock.yaml` 零差异。transcript 只通过 `readTranscriptSessions(store)` → `store.list()` 读取既有 Turn journal，没有新持久化格式、依赖、状态机或状态机库。复杂度扫描结论：确为 SPEC 声明的三个新模块；`effectiveBaseUrl` 无生产消费者，`reasoningLabel` 函数也无生产消费者（同名 React prop 不属于该函数），两项均留在提案区，未越权删除。

SPEC 对持久边界登记诚实：journal 只持久化助手 turn 与 interaction，历史 transcript 因而只有助手侧记录；用户 prompt 不入 journal。既有 `turn-protocol-client.test.ts:212` 实测锁定 prompt、secret、transport/systemPrompt 均不进入持久内容；当前实时会话仍在内存保留用户+助手上下文。

### 2. 全量门禁实跑

先执行 `pnpm install --frozen-lockfile`：14 workspace projects、1047 packages，lockfile 零漂移。

| 门禁 | 独立实跑结果 |
|---|---|
| `pnpm -r build` | 13/13 workspace project 通过；desktop Vite build 通过，仅既有 Tauri dynamic/static import 与 chunk-size warning |
| `pnpm lint` | exit 0 |
| root `pnpm test` | 139 files / **1203 tests passed** |
| desktop `pnpm test` | 44 files / **200 tests passed** |
| CHAT-SESSION 定向 Vitest（还原后） | 3 files / **24 tests passed** |
| `COURTWORK_E2E_PORT=1657 pnpm test:e2e` | 静态门全绿，floor 219；Playwright **217/219 passed**（4 workers、`reuseExistingServer=false`） |

Playwright 两项失败均为既有输出链路径：`tests/e2e/rp210.spec.ts:43` 与 `tests/e2e/system-open.spec.ts:12`，两者都在 `helpers.ts:36` 等待 `output-docx-card` 超时。CHAT-SESSION 新增的三项（跨窗新开、窗口内延续、只读导航）均通过。由于全量门没有全绿，本单不能放行；floor 已按实现提交的 `216 → 219` 保持，不伪造为 219/219。

### 3. ADR-013 §1 反例触红（每项注入后均还原）

| 边界 | 注入 | 红灯证据 |
|---|---|---|
| 窗口边界 | `withinWindow` 临时由 `<=` 改为 `<` | `session-window.test.ts` **1 failed / 9 passed**，恰在 60 分整边界失败 |
| 跨窗续行 | `App.tsx` 临时把 `sessionMessages` 改回全量 `chatMessages` | `chat-session.spec.ts` **1 failed / 2 passed**；跨窗捕获请求重新含 `FIRST-SESSION-MARK-7K2Z` |
| transcript 涂改 | `readTranscriptSessions` 临时吞掉 `store.list()` 异常并返回空数组 | `session-transcript.test.ts` **1 failed / 8 passed**；损坏 journal 未再显式抛错 |
| 分叉不涂改 | 临时把追加 turn 的 id 改成既有 `t1` 并改正文 | `session-transcript.test.ts` **1 failed / 8 passed**，core `TurnAlreadyExistsError` 触红；正常追加仍保持既有条目字节不变 |
| 管理入口 | `SessionHistory` 临时注入 `data-testid="session-delete"` | `SessionHistory.dom.test.ts` **3 failed / 2 passed**，列表与只读态管理入口断言触红 |

全部 mutation 已撤除；最终验收 worktree `git status --short` clean、`git diff --check` clean。还原后 CHAT-SESSION 三文件定向测试为 3/3、24/24。

### 4. 既有两项 Playwright 失败的根因收口

交接叙述称两项是“纯 Vite 缺真实 Tauri output-write 宿主桥”。仓库事实不一致：当前树已经有 `apps/desktop/src/output/case-output-client.ts` 的纯 Vite 内存宿主，且 `system-open.spec.ts` 的 draft 编译、window focus 重新询问等其余路径通过；失败页面捕获到的真实反馈是：

`修订指令集有 2 条指令未应用且未获针对性确认，已阻断整份落盘：instr-risk-02(locator_not_found)、instr-risk-06(locator_not_found)`。

历史复核与独立实跑如下：

- `ab21d6d`（实现记录 211/211 的树）：先 build，在隔离端口 `1663` 定向跑这两项为 **2/2 passed**。
- `f38c17a` 是之后的第一个行为根因提交：`applyRevisionInstructionSet` 把未应用指令从“跳过后继续交付”改为默认 `NonAppliedInstructionsError` fail-closed。该提交属于 OUTPUT-CORRECTNESS-1 的输出契约加固。
- `02c1e52`（端口 `1660`）与 `fc05282`（端口 `1661`）各自 frozen install + build 后，定向两项均为 **0/2 passed、2 failed**；因此不是 CHAT-SESSION-1 引入，也不是当前环境偶发。
- `ce37d53` 的实现留痕后来首次记录“210 passed + 2 docx failures”；该提交只改 usage 形状，失败根因仍来自更早的 `f38c17a` output gate。

所以纯 Vite browser stub 尚未被调用，补 Tauri output-write stub 不能修复当前失败；要么由架构角色决定 desktop 如何对 `locator_not_found` 做逐条针对性确认/修正 demo locator，要么由架构角色明确把这条输出契约改判为 Tauri-only 并同步测试与 floor。该问题触及跨层输出契约，验收会话不做 `fix-by-acceptance`，标记 **[需架构拍板]**，不以 skip 掩盖真实 fail-closed 行为。

> **裁决：不放行 CHAT-SESSION-1。** CHAT-SESSION-1 自身的窗口、跨窗不回灌、只读 transcript、journal fail-closed、分叉不涂改与无管理入口均有独立绿测和反例红测；但本单要求的全量 Playwright 门在实现祖先已有的 OUTPUT-CORRECTNESS-1 契约失败上仍为 217/219。待架构拍板并收口该输出契约/环境门后，须在新 clean worktree 复跑完整门禁；本报告不更新 `docs/status/current.md`，不推送。

## CASE-ROOT-1-ACCEPT · 独立验收（2026-07-16）

验收对象：`impl/case-root-1 @ 2c5470d`，验收基线为已合入 `main @ ec4f29e`，工单基线 `1e9efc2`。本报告由独立 clean worktree `/Users/lesprivilege/Projects/Courtwork-case-root-1-accept-ec4f29e` 在 detached `ec4f29e` 完成；未复用实现 worktree、未 checkout/重写共享树、未运行 `git worktree prune`，不更新 `docs/status/current.md`，不推送。

### 1. 范围、依赖与复杂度

- `git diff --name-only 1e9efc2..2c5470d` 精确为 **19 文件**，全部在 `apps/desktop`；`packages/*`、`docs/status/current.md` 均为零触碰。
- `pnpm-lock.yaml` 与 `apps/desktop/src-tauri/Cargo.lock` 相对 `1e9efc2` 无变化；无新依赖。
- `CaseBinding` 是唯一新增概念：`demo | grant | unbound` 判别式 union；复用 HOST-AUTH-LITE 的 `grantId`，不引入第二套授权格式、状态机、持久化格式或跨包导出。
- `CASE_SCOPE_AUDIT` 整表与实现 tip 字节等价，未动。
- 按已批清理先以 `rg -n "defaultOutputDir|updateOutputDir" apps/desktop/src apps/desktop/tests` 自证无其他消费后，`fix-by-acceptance` 删除 settings-store 的退役 output 配置、`updateOutputDir` 与诊断冗余输出，并保留“snapshot 无退役 output 配置”测试护栏；同时删除 Rust 宿主内部未消费的 `CaseOutputArtifact.absolute_path`，回执只保留 `byteLength`。清理后 grep 为零。

### 2. 全量门（最终 clean worktree 实跑）

| 门禁 | 结果 |
|---|---:|
| `pnpm install --frozen-lockfile` | 通过 |
| `pnpm -r build` | 通过（13/14 workspace project 执行，desktop Vite build 通过） |
| `pnpm lint` | 通过 |
| root `pnpm test` | **139 files / 1204 passed** |
| desktop `pnpm --dir apps/desktop test` | **46 files / 216 passed** |
| `cargo test` | **41 passed / 0 failed**（其中 CASE-ROOT 新增 3） |
| `assert-host-auth-contracts` | 通过 |
| Playwright floor | **222/222**，静态门全绿 |
| 完整 Playwright，`COURTWORK_E2E_PORT=17894` | **220 passed / 2 failed** |

CASE-ROOT 新增的 3 个 E2E（denied 不推进、授权建案无绝对路径、重授权换 grant）均通过；renderer 只见 `grantId`/`label`，产出回执无绝对路径。

### 3. 反例触红（每项均注入 → 红 → 还原）

| 边界 | 注入与红灯证据 | 还原后 |
|---|---|---|
| Rust 跨案 | 同时移除 lexical `..` 与 canonical root 边界守卫；`cargo test grant_root_isolates_cases_and_never_reaches_a_sibling_case` 在 `left: None / right: Some(OutOfScope)` 处失败 | targeted 通过，最终 Rust **41/41** |
| Rust 重授权 | `resolve_root` 临时反向匹配 grant，旧 grant 测试收到新目录而非旧目录，断言失败 | 最终 Rust **41/41** |
| 静态绝对路径三连 | `CaseSummary.folderPath`、`CaseSummary.absolutePath`、生产 `webkitdirectory` 注入分别令 `lint:host-auth` exit 1；webkit 注入同时命中组件门与生产源码扫描门 | `HOST-AUTH-LITE boundary checks passed` |
| NewCaseDialog 四类失败 | 将宿主失败 reason 临时只映射 `denied`；四类 stub 测试 **1 failed / 4 passed**，恢复映射后定向 **5/5 passed** | 四类 `denied/revoked/unavailable/out_of_scope` 均 `data-reason` 可见且停留选择步 |
| demo 边界 | 临时把 grantId 判定放到 `isDemo` 前；`isDemo 优先于 grantId` 测试收到 `{kind:'grant'}` 而非 `{kind:'demo'}` | case-scope 与最终 desktop **216/216** 通过 |

另外，case-output-client 定向 **4 files / 26 passed**，覆盖回执、跨案隔离、unbound 阻断及 demo 内存宿主往返。

### 4. 非通过用例复核

- 完整 Playwright 的两个失败固定为 `tests/e2e/rp210.spec.ts:43` 与 `tests/e2e/system-open.spec.ts:12`，均在 `helpers.ts:36` 等待 `output-docx-card` 超时；CASE-ROOT 相关用例无失败。
- 在独立 clean worktree `/Users/lesprivilege/Projects/Courtwork-case-root-1-baseline-1e9efc2`、checkout `1e9efc2`、frozen install + build、隔离端口 `17892` 对这两个精确用例重跑，得到 **2 failed / 2**，相同 locator、相同堆栈。因此维持既有 `OUTPUT-CONFIRM-UI-1` 缺口定性，不归责 CASE-ROOT-1。
- `tests/e2e/global-verbs.spec.ts:7` 在隔离端口 `17893` 使用 `--repeat-each=3` 得 **3/3 passed**；不改断言、不新增稳定化补丁。

### 5. 最终裁决

**CASE-ROOT-1 放行 ✅。** `CaseBinding` 三态、`isDemo` 优先 fail-closed、Rust grant root 宿主解析、grant 产出回执剥离绝对路径、跨案/重授权隔离、生产 `webkitdirectory` 零出现、composer-plus-folder 入口保留并改走 host picker、floor `219→222` 均有独立绿测与反例触红证据。全量 E2E 的两项红为基线已存在且已独立复现的 OUTPUT-CONFIRM-UI-1 缺口，不构成本单不放行理由；本报告未新增 `[需架构拍板]` 契约问题。

交接事实差异：验收开始时共享 `main` 为 `ec4f29e`；报告提交前再次核对时共享 `main` 已由并行会话前进至 `70a7d8f`，新增内容仅为 `archive/research-2026-07-15-round-3/` 调研归档（`docs(archive): file grok-build design-pattern research`），未改变 CASE-ROOT 代码。验收证据仍锁定于独立 clean worktree 的 `ec4f29e`；未将并行归档变更纳入本单裁决。

## MATERIAL-INGRESS-1-ACCEPT · 独立验收（2026-07-16）

验收对象：`impl/material-ingress-1 @ 18ea195`（基线 `47c9c6b`，4 枚提交），合并组合验收尖端为 `main @ 6b9a482`。本报告在独立 detached clean worktree `/tmp/courtwork-material-ingress-accept-6b9a482` 完成；未复用实现 worktree，未运行 `git worktree prune`，不更新 `docs/status/current.md`，不推送。

验收期间共享 `main` 后续前进到 `62cc66c`，新增提交只修改 `docs/architecture/implementation-readiness.md` 与 `docs/product/vision.md`，`6b9a482` 仍为其祖先，未改变本单或 desktop 组合代码；本报告的可复现证据按工单指定锁定 `6b9a482`。

### 1. 范围、合并组合与架构裁定复核

- `git diff 47c9c6b..18ea195 --name-status` 实收精确 **17 文件、+1818/-13**，全部位于 `apps/desktop`；`packages/core`、`packages/schemas`、`packages/tools`、`packages/reading-view` 与 `Cargo.lock` 差异均为零。无新 crate、npm 依赖或跨包导出。
- `6b9a482` 的父提交为 `00ab0a0 + 18ea195`；合并解冲突只把 Playwright floor 与并行 `CHAT-MEMORY-1`、`OUTPUT-CONFIRM-UI-1` 接线共同保留。最终全量门与 material/memory/confirm 三链定向连跑均通过，未发现组合互扰。
- **Add folder 就地入库裁定与 ADR-010 一致**：原件留在各自授权 grant root 下只读；实现只读取 bytes，在 app-data `materials/<materialId>.json` 持久元数据、ReadingView 派生与宿主 provenance，不移动、改写或复制原件。`read_original` 仍经 grant 作用域守卫再读。
- **MaterialRef desktop-local 裁定与 ADR-010 不相悖**：ADR-010 固定的是 source-neutral 字段/语义及 Work wire 的 `materialRefs: string[]`，未指定型别必须由 core 导出；当前 core executor 消费 `MaterialInput`，无 `MaterialRef` 消费点。驻 `apps/desktop` 是纯加法最小落点，建议架构师据本验收追认；未发现需停单的契约冲突。
- 复杂度留痕完整：`MaterialRef/StoredMaterial`、`MaterialBlockReason`、宿主 per-material 记录、`MaterialHostPort`、`host_list_dir` 五项均在 SPEC 说明必要性；零新状态机、零未声明通用抽象。提案区 grep 实收两项既有偶然复杂度：demo/真实原件区近重复与 `CASE_SCOPE_AUDIT` 文档即数据表，均只登记未越权处理。

### 2. 诚实边界

- Browser/E2E adapter 确为模块内存态，只在 `DEV + VITE_COURTWORK_E2E=1` 安装测试 hook；浏览器重启持久不成立，重启证据来自 Rust 磁盘层。
- `resolveForProvider` 只有 `App.tsx` 的「核验」按钮消费，尚未接入 live Work/provider；通过时返回的是重新读取并验证的当前 ReadingView，但本单成熟度只到 **package-ready**，不是 product-live。
- `docs/status/current.md` 仍把 `MATERIAL-INGRESS-1` 写为下一环可开工，验收会话未擅自更新能力成熟度。SPEC 的三条已知边界与仓库事实一致，无需改写。

### 3. 全量门（合并尖端独立实跑）

| 门禁 | 结果 |
|---|---:|
| `pnpm install --frozen-lockfile` | 14 workspace projects、1047 packages；lockfile 零漂移 |
| `pnpm -r build` | 13/14 workspace projects 执行并通过；desktop Vite **3547 modules**，仅既有 chunk/dynamic-import warning |
| `pnpm lint` | 首跑发现新 material 静态门 2 处 `no-regex-spaces`，验收最小修正为 `{2}` 后 exit 0 |
| root `pnpm test` | **140 files / 1210 passed** |
| desktop `pnpm --filter @courtwork/desktop test` | **49 files / 265 passed**（material 14/14） |
| `cargo test`（全部 mutation 还原后重跑） | **52 passed / 0 failed** |
| 全静态门（含 `assert-material-contracts`） | 全部通过；Playwright floor **227** |
| 完整 Playwright，隔离端口 `14873` | **227/227 passed（1.7m，4 workers，reuseExistingServer=false）** |
| material + memory + confirm 三 spec，隔离端口 `14874` | **5/5 passed（8.8s，1 worker）** |

### 4. 六条反例与静态红证（均注入 → 红 → 还原）

| 边界 | 独立红灯证据 |
|---|---|
| a. 原件字节漂移 | 临时失效 `freshContent !== stored.contentSha256` 守卫；定向 Vitest **1 failed**，预期 `content_drift`、实得后置 `reading_drift`，证明原件 hash 守卫被真实观察 |
| b. 删除/卷卸载 | 临时把 browser host 缺原件映射由 `unavailable` 改为 `revoked`；定向 Vitest **1 failed**，显式失败原因漂移被捕获 |
| c. `needs_ocr` | 临时把 provider-front 阻断原因改为 `rejected`；定向 Vitest **1 failed**，闭集原因必须保持 `needs_ocr` |
| d. 跨 case | Rust `get_material` 的 case guard 临时改为恒假；`get_cross_case_is_none_fail_closed` **1 failed**，case B 实际读到 case A 记录 |
| e. 重启持久 | Rust `list_materials` 的 case 选取临时改为恒假；`list_materials_filters_by_case_and_survives_restart` **1 failed**（期望 `mat-1/mat-2`、实得空）。还原后另暂留测试目录手动抽查 3 个实体 JSON：case A 两件、case B 一件，元数据/ReadingView/provenance 完整；新磁盘读取测试通过 |
| f. demo 隔离 | 临时向 `material-store.ts` 注入 `@courtwork/demo-data`；`assert-material-contracts` exit 1，精确报 material store 不得依赖 demo |

额外静态红证：向 `MaterialRef` 注入 `absolutePath` 时门禁 exit 1；向 `sha256.ts` 注入 `node:crypto/createHash` 时门禁 exit 1。全部 mutation 恢复后，相关源码相对 `6b9a482` 零差异，最终仅保留验收 lint 修正与本报告。

### 5. 验收修复与裁决

实现尖端原样不能通过根 lint：`assert-material-contracts.mjs` 两处用字面双空格匹配函数结束，触发 ESLint `no-regex-spaces`。验收以实现级最小修复改为 `\n {2}\}`，不改变门禁语义、契约或导出；修复后 lint、material 静态门及完整 E2E 全绿。该修复应以 `fix-by-acceptance` 前缀提交。

> **最终判定：MATERIAL-INGRESS-1 放行 ✅（含验收 lint 修复）。** 原件只读原地、app-data 元数据/ReadingView 持久、source-neutral MaterialRef、provider-front 漂移/删除/OCR/跨案阻断、Rust 重启恢复与 demo 隔离均有独立绿测及红证。成立范围仅为 package-ready 材料入口与核验口；不宣称 live provider、WORK-LIVE、OCR 或 product-live。两项中场裁定经独立复核与 ADR-010 相容，请架构角色追认并收账。

## VOICE-SPEC-1-ACCEPT · 独立验收（2026-07-17）

验收对象：`impl/voice-spec-1 @ 0b9c837`（基线 `2ad8eda`，4 枚提交），合并提交 `c69a944`；验收开工时 `main` 尖端为 `39a7a39`（含 VOICE-SPEC-1 架构复审裁定留痕），据此建立独立 clean worktree `/tmp/courtwork-voice-accept-0Yx4xR` 与分支 `codex/accept-voice-spec-1`。报告提交前共享 `main` 又前进到 `0f9dbf8`（合入 `LEGAL-S3-BINDING-1`、待其自身独立验收），故已把该新 main 合入验收分支，并在最终组合尖端 `0e28841` 从 frozen install 起重跑全量门。`0b9c837` 与 `0f9dbf8` 均为最终验收尖端祖先；未复用实现 worktree，未运行 `git worktree prune`，不更新 `docs/status/current.md`，不推送。

### 1. 范围、规范成册与登记项

- `git diff 2ad8eda..0b9c837 --name-status` 实收精确 **12 文件、+421/-8**，与 SPEC 列册一致：3 个设计文档触面、3 个 voice 门脚本、`apps/desktop/package.json`、`Panels.tsx`、3 个 E2E 文件与 `apps/desktop/SPEC.md`。
- `packages/legal/**`、`docs/status/current.md`、根 `package.json` 与 `pnpm-lock.yaml` 相对工单基线均零触碰；manifest 只新增脚本与门链节点，依赖字段零变化，零新依赖。
- `docs/design/voice.md` 六节完整：动作、错误、完成、进行、空态与零技术概念暴露；开篇及 §6 均明确与 `principles.md §9` 合并成册。`principles.md` 仍为 §1–§10，§9 未重排，只新增完整规范指针；`docs/design/README.md` 的 `voice.md` 条目在位。
- `rg -n -C 3 '§9|零技术概念暴露' apps/desktop/scripts/assert-ui-surface-contracts.mjs apps/desktop/SPEC.md docs/design/{principles,voice}.md` 实收既有门仍以 `§9` 注释、扫描与报错，SPEC 的既有 §9 引用未破。
- 唯一真违例修复成立：`Panels.tsx` RiskGate 主按钮为 `确认此项`；E2E 定位符精确同步 **6 处**（`helpers.ts` 2、`workbench.spec.ts` 3、`rp27.spec.ts` 1）。隔离端口 `16542` 定向实跑“法理之线确认转绿”与“混合处置完成后确认响应按条目上报” **2/2 passed**；最终全量同两例再次通过。
- 登记项定性合理：VOICE 实现尖端的 `packages/legal/src/presentation/index.ts:19` 仍为 `需 OCR`，且 `2ad8eda..0b9c837` 对 `packages/legal/**` 零触碰，证明本单没有越权偷改。验收期间 carrier `LEGAL-S3-BINDING-1` 合入新 main，其中 `e2aff97` 已按批准改为“需文字识别”并重算 golden；这是另一工单的落地且仍待其自身独立验收，不反向扩大 VOICE 的 12 文件范围。presentation 纳入 `lint:voice` 的扫描面扩展仍按就绪图后置便利单。`App.tsx:1862` 的“知道了”仅关闭无副作用导览气泡，符合 §1 明列例外。`App.tsx:1564` 与 `CaseRail.tsx:312` 两处可填充主区空态确缺第一动作，但架构已裁定留终局 UI polish；本薄单登记而不擅改合理。

### 2. 三条机器规则红证与安全放行

先在 `39a7a39` 无变异树运行 `lint:voice`，扫描 **107** 个 `.ts/.tsx` UI 源文件为绿。随后每次以独立临时 `apps/desktop/src/__voice_accept_probe.tsx` 注入一例，观察 exit 1，再删除探针并复跑恢复绿；最终工作树无探针残留。合入新 main 后因新增 `legal-s3-binding.ts`，最终组合扫描面自然增为 **108** 文件并保持全绿。

| 规则 | 注入 | 独立红灯证据 |
|---|---|---|
| §1 `bare-confirm` | `<button>确认</button>` | 精确报 `src/__voice_accept_probe.tsx:1` 裸确认词“确认”，exit 1 |
| §3 `success-claim` | `<output>成功删除</output>` | 精确报完成提示“成功删除”，exit 1 |
| §6 / principles §9 `eng-leak` | `<output>解析 schema 失败</output>` | 精确报中文文案含工程词 `schema`，exit 1 |

恢复后 `node --test apps/desktop/scripts/assert-voice-copy.test.mjs` 为 **5/5 passed**。另以独立安全探针直接调用规则库，实收“此轮请求未成功”“只以真实请求成功为准”、模板 `${schema.payload}` 插值、行/块/JSX 注释均零命中；重放 `/^(?:my name is|i am|i'm|call me)/i` 后仍只抽取其后的安全中文“请核对材料”，证明正则字面量内引号不会误开字符串态或制造假阳。安全探针随后删除，`lint:voice` 再次扫描 107 文件全绿。

### 3. 合并组合缺陷与验收修复

`c69a944` 已正确手解 `apps/desktop/package.json`，VOICE-SPEC-1 的 `lint:voice`/`test:e2e` 节点与 DESIGN-MD-1 的 `lint:design-md`/`design:md` 节点并存；根 `site:guard` 也保留 DESIGN-MD-1 链。但在 `39a7a39` 原样首跑 `pnpm site:guard` 时，`lint:design-md` 确定性变红：VOICE-SPEC-1 修改了 `principles.md`，合并后 `docs/design/courtwork-design.md` 未随源重编译。

该项为既有生成器可机械修复的实现级组合缺陷，不涉及契约或导出。验收执行 `pnpm --filter @courtwork/desktop design:md`，仅更新编译产物中的 `principles.md` SHA 与新增 voice 指针正文；`pnpm site:guard`、`lint:design-md`、`lint:voice` 随后全绿，并以 `657ae55 fix-by-acceptance: regenerate design guide after voice merge` 独立提交。该提交仅触碰 `docs/design/courtwork-design.md`，提交前逐文件暂存且缓存区文件清单精确为一项。

### 4. 全量门与 Playwright 组合证据

| 门禁 | 独立实跑结果 |
|---|---:|
| `pnpm install --frozen-lockfile` | 14 workspace projects、1047 packages；lockfile 零漂移 |
| `pnpm -r build` | 13/14 workspace projects 执行并通过；desktop Vite 3547 modules，仅既有 dynamic/static import 与 chunk-size warning |
| `pnpm lint` | exit 0 |
| `pnpm -r test` | provider 104、legal 79、pm 44、demo-data 23、eval 64、tools 204、core 319、demo-runtime 29、desktop 280，全部通过 |
| `pnpm site:guard`（`657ae55` 后） | 39 个 guard 单测及 release/deslop/neutral/elevation/signature/motion/design-md 全绿 |
| `COURTWORK_E2E_PORT=16546 pnpm --filter @courtwork/desktop test:e2e` | 含新增 `LEGAL-S3-BINDING-1` 静态节点的全链通过；voice 反例门 5/5、108 文件实扫通过、floor **231**；Playwright **231/231 passed**（4 workers，`reuseExistingServer=false`） |

完整 Playwright 首次用端口 `16543` 冷启动时为 **229 passed / 2 failed**；两项都发生在早段整块 DOM 消失，失败日志明确记录等待首屏导航完成后重新导航，快照已回到欢迎面。未修改源码，在端口 `16544` 原样重放两项为 **2/2 passed**；随后从静态门链起在端口 `16545` 完整重跑 `39a7a39 + 657ae55` 为 **231/231**。共享 main 前进后，又在端口 `16546` 对 `0f9dbf8 + 657ae55` 最终组合从头实跑为 **231/231**。因此最终裁决只采信完整绿跑，不把首轮 Vite 依赖预优化重载伪写成产品通过，也未用 skip、降 floor 或放宽断言掩盖。

> **最终判定：VOICE-SPEC-1 放行 ✅（含验收组合修复 `657ae55`）。** 六节规范、§9 合并关系与编号兼容、README 登记、三条静态规则红证、安全用法放行、RiskGate 唯一真违例及 6 处定位符同步均成立；`lint:voice` 与 `lint:design-md` 组合在验收修复后全绿，当前 main 组合的最终 Playwright 231/231。成立范围仅为 desktop 用户文案规范与当前扫描面；“需文字识别”统一已由 carrier `e2aff97` 落地但归 `LEGAL-S3-BINDING-1` 自身验收，Legal presentation 扫描面扩展仍按批准后置便利单，本报告不把两者虚报为 VOICE 自身完成。

## LEGAL-S3-BINDING-1-ACCEPT · 独立验收（2026-07-17）

验收对象：`impl/legal-s3-binding-1 @ e2aff97`（核心 `bdbb526` + 词表跟进，工单基线 `2ad8eda`）；首次合并尖端 `main @ 0f9dbf8`。验收期间共享 `main` 因 VOICE-SPEC-1 独立验收前进，本验收分支 fast-forward 后的最终组合尖端为 `main @ 97e0044`；最终裁决只认该尖端。验收在独立 clean worktree `/tmp/courtwork-legal-s3-binding-accept.28zYpv`、分支 `codex/accept-legal-s3-binding-1` 完成；未复用实现 worktree，未运行 `git worktree prune`，不更新 `docs/status/current.md`，不推送。

### 1. 范围、合并组合与复杂度

- `git diff 2ad8eda..e2aff97 --name-status` 实收精确 **17 文件，+1315/-5**：
  - desktop 5：`apps/desktop/{SPEC.md,package.json,scripts/assert-legal-s3-contracts.mjs,src/work/legal-s3-binding.ts,src/work/legal-s3-binding.test.ts}`；
  - core 7：`packages/core/{SPEC.md,src/index.ts,src/work/work-protocol.ts,src/work-state/artifact-envelope.ts,src/work-state/artifact-envelope.test.ts,src/work-state/work-state-store.ts,src/work-state/work-state-store.artifact-envelope.test.ts}`；
  - legal 3：`packages/legal/{SPEC.md,src/package/layout-golden.test.ts,src/presentation/index.ts}`；
  - tools 2：`packages/tools/{SPEC.md,package.json}`。
- `packages/schemas/**`、`packages/registry/**`、`packages/reading-view/**`、`docs/status/current.md`、`pnpm-lock.yaml`、`Cargo.toml/Cargo.lock` 在实现范围内均为零差异。无新 crate、npm 依赖、持久化格式或状态机。
- core 只新增 ADR-010 决定三已拍板的 `ArtifactEnvelope` + codec，并在 `WorkStateStore` 以可选 `artifactCodec` 接入写侧封装/读侧迁移；既有不注入路径字节语义不变。`packages/tools` 只增 browser-safe `./party-verify` 子路径导出，未改工具契约/实现。
- 复杂度声明与仓库事实一致：工单仅引入一枚业务概念——browser-safe `legal.S3` 生产装配模块；core 的 ArtifactEnvelope 为就绪图明示并入的同批裁定，不是偷渡的第二状态机或持久格式。
- `0f9dbf8` 解冲突后 `apps/desktop/package.json#test:e2e` 同时保留 `assert-legal-s3-contracts` 与 voice 的 `assert-voice-copy.test/assert-voice-copy`，两门非二选一。验收期间 main 新增的 `657ae55/18d3940/aecd560/97e0044` 只是 VOICE-SPEC-1 验收修复、报告与状态清账；最终尖端上 design-md drift 也已由其独立验收修复收口。

### 2. 合并尖端全量门

`pnpm install --frozen-lockfile` 实收 **14 workspace projects / 1047 packages**，lockfile 零漂移。最终 `main @ 97e0044` 独立实跑：

| 门禁 | 结果 |
|---|---:|
| `pnpm -r build` | **13/14 workspace projects** 执行并通过；desktop **3547 modules**，只有既有 dynamic/static import 与 chunk-size advisory |
| `pnpm lint` | exit 0 |
| root `pnpm test` | **142 files / 1222 passed** |
| desktop Vitest | **50 files / 280 passed**（binding **15/15**） |
| `pnpm site:guard` | **39 node tests** + release/deslop + neutral/elevation/signature/motion/design-md 全绿；design-md drift 门通过 |
| desktop 全静态前链 | 全绿；voice **5/5** 并扫描 108 UI 源文件，legal-s3 boundary passed，floor **231** |
| 完整 Playwright | `COURTWORK_E2E_PORT=14918`，`reuseExistingServer=false`，**231/231 passed（3.5m，4 workers）** |
| `demo:s3` | golden 骨架 PASS，预埋考点 **7/7**，redline 39,651 bytes |
| `demo:legal` | golden PASS（骨架/考点/锚点复算/六段标记/修订命中全符） |

为证明合并窗口没有将偶发结果写成事实，首次尖端 `0f9dbf8` 也以独立端口 `14917` 跑完同一全链，同样为 **231/231 passed**；最终数字仍以 `97e0044` 为准。root suite 内 `packages/demo-runtime/src/no-demo-in-harness.test.ts` 通过，demo golden 与 no-demo-in-harness 审计未被 ArtifactEnvelope 默认路径破坏。

### 3. ADR-010 反例逐条重放（全部注入 → 观察红 → 还原）

| 反例 | 破坏注入 | 独立红灯证据 |
|---|---|---|
| a. 缺主体 | 把空/空白主体默认为「默认主体」 | binding 定向 **1 failed / 14 skipped**；预期 `MissingContractPartyError`，实际未抛错 |
| b. 缺工具输入 | 令 missing tool id 集合恒空 | 定向 **1 failed / 14 skipped**；预期 `MissingToolInputError`，实际未抛错 |
| c. 材料漂移绝不入 provider | 将 `blocked` 分支由抛 `MaterialResolutionBlockedError` 改为跳过 | 「原件漂移」测试红：promise 实际 resolve `[]` 而非 reject |
| d. session 原文绑定 | 同一阻断守卫跳过后重放「首次通过、漂移后复验」 | 「session 原文绑定」独立红：漂移后实际 resolve `[]`，不再整体阻断；证明正常代码不会让调用方拿到源文或回落 demo |
| e. 逐条 revision | 同时关闭 revise/coverage 守卫并把 reject 错映射为 confirmed | 定向 **3 failed / 12 skipped**：单项 reject 拿不到 `/risks/1/dispositionStatus=rejected`；revise 未抛 `ReviseNotTerminalError`；未覆盖全部未抛 `IncompleteReviewError` |
| f. ArtifactEnvelope 未知版本 | 跳过 `schemaVersion` 比较 | core 定向 **1 failed / 7 skipped**；实际 `ready`，预期 `isolated/unknown_version` |
| g. demo 依赖注入 | 向 binding 代码注入 `@courtwork/demo-runtime/mock` 与 `createMockPartyVerifyAdapter` | `lint:legal-s3` **exit 1**，精确报 2 项：不得依赖 demo-runtime、不得挂 mock adapter |

全部 mutation 撤除后，binding **15/15**、core ArtifactEnvelope/store **12/12**、`lint:legal-s3` 与最终全量门从头恢复全绿；`git diff --check` 通过。

### 4. live gate、诚实边界与 browser-safe

- 源码 + 测试双证成立：`projectRiskListGate` 直接遍历 `riskList.risks`；`level=high → high_risk + individual`，风险 citation 命中 `grade=C && !confirmed` 台账才标 `unverified + individual`，其余为 batch。生产 binding 剔除注释后 `GATES`、`DEMO_ARTIFACTS`、`contractSourceMd`、recording/demo import 均零命中。
- 缺证据台账时 `evidenceGrades=[]` 为默认：高风险仍只由 RiskList 标 `high_risk`，不凭空标 `unverified`；既有 live-gate 测试中未命中台账的条目保持 batch，边界与实现一致。
- 成熟度只到 **package-ready**：binding 纯装配件成立，但 `WorkCommandPort` start/done/cancel、跨重启 replay、运行 UI 与 docx-in-UI 未接，全部归 `WORK-LIVE-1`。没有 product-live 声称。
- QCC 诚实降级聚焦复验 **2/2**：无配置为 `not_configured`；`apiKey/baseUrl` 齐全时仍为 `not_implemented`，不伪造成功数据。生产注册的 sourceId 是 `qcc`，不是 mock/demo-fixture。
- browser-safe 静态门与人工抽查一致：binding 代码零 `node:*`；core runtime 只走 `@courtwork/core/work-protocol`，根 `@courtwork/core` 只有 `import type`；party-verify 走 `@courtwork/tools/party-verify`，该子路径的生产传递闭包不引入 root barrel 的 Node 依赖。

### 5. 词表跟进与版本信封

- `packages/legal/src/presentation/index.ts` 实收 `needs_ocr: '需文字识别'`；`packages/legal/SPEC.md` 明记「有意的内容契约变更，非 golden 漂移」。
- 独立实算 `sha256(JSON.stringify(LEGAL_PACKAGE_DESCRIPTOR))` = `d9c789baf973786e8022c5545b56391b65eadf7dbbe273cf31cef882a60c882b`，与新 VPKG-LAYOUT-1 golden 一致；`promptBlob()` = `41b8073be2f7d5b6e20a0d940ba300ce476046f642e21fecb2d14ad0de43618a`，与 `2ad8eda` 基线字节哈希相同。Legal 包级 **11 files / 79 tests** 通过。
- ArtifactEnvelope 写侧持久为 `{packageId,typeId,schemaVersion,payload}`，payload 只出现一次；读侧未知 type/package/version、schema mismatch 与 malformed 均隔离，自身会话 reload 遇隔离贡献抛 `StoredArtifactIsolatedError`，不回落 raw JSON。

### 6. 最终裁决

> **LEGAL-S3-BINDING-1 放行 ✅。** 显式主体/工具输入、provider 前材料复验、session 原文绑定、真实 RiskList gate、逐条 confirm/reject/revise 映射、QCC 诚实降级、ArtifactEnvelope 未知版本 fail-closed、demo 双向隔离、browser-safe 子路径与词表 golden 均有独立绿测及反例红证。成立范围严格为 **package-ready**，不宣称 UI/product live 或真实 QCC 核验已接入；下游 `WORK-LIVE-1` 可消费本装配件。本验收未发现 `[需架构拍板]` 契约问题，未修改 `docs/status/current.md`。

## FRONTEND-FOUR-CRITERIA-AUDIT · 并行只读审计（2026-07-17）— ❌ 不放行

**标注**：并行只读审计；四准则来自产品负责人（非就绪图既有工单验收）。不落盘裁决不作数——本节约为可引用真源。

**审计范围**：`apps/desktop/src`（全量读相关布局 / 控件 / process-trace 实现与门禁）  
**被验 tip**：`3c7be96`（审计会话读码时 tip；至本记录写入时 `main @ c4b91cd` 仅增 readiness 登记 `LAYOUT-CONVERGE-1`，`apps/desktop/src` 相对 `3c7be96` 零 diff）  
**四准则**：

1. 同类控件务出同源  
2. 两侧收敛时不留残余  
3. chat 流相应收缩到中间  
4. work 的 thought process 引用与 chat only 同样的动画  

**角色**：只读验收，不采信实现自述；证据来自源码、静态门与既有 e2e 契约。未改实现、未更新 `docs/status/current.md`、不推送。架构已据本审计 P1/P2 立单 `LAYOUT-CONVERGE-1`（`c4b91cd`）；本报告本身不宣称该工单已交付。

### 总判

| 准则 | 判定 | 说明 |
|---|---|---|
| 1. 同类控件同源 | **条件通过** | 主路径已收敛到共享原语；仍有死支与测宽 token 未单源 |
| 2. 两侧收敛无残余 | **条件通过** | 运行时双侧收拢 DOM 主路径干净；源码/CSS 仍有撤卡前窄条残余 |
| 3. chat 流收缩到中间 | **部分通过** | `chat-segment` 760 测宽居中成立；work 双侧收拢时正文列未收至测宽 |
| 4. work thought 同动画 | **通过** | 唯一 `ProcessTrace` + `BrandThinking`，门禁与投影适配器闭合 |

**综合结论：不放行（条件驳回）。**  
产品主路径（双侧撤卡、ProcessTrace 同源动画、chat 面测宽）大体正确，但未达到「收敛无残余 + 流随两侧收缩到中间」的字面验收；存在可定位的死支、幽灵网格列与测宽不对称。

### 1. 同类控件务出同源

#### 已同源（通过）

| 控件族 | 单一源 | 消费点 |
|---|---|---|
| 输入区 | `renderComposer` → `Composer` | work / chat / welcome 同一渲染函数（`App.tsx:1710-1742`） |
| chat\|work 状态 | `viewSegment` + `switchSegment` | 左栏 `rail-segment`（`CaseRail.tsx:351`）与 composer `composer-workmode`（`Composer.tsx:486-499`）同状态，非双 store |
| 过程轨迹 | `ProcessTrace` + `process-trace-projection` | Chat：`processTraceFromTurn`（`App.tsx:225-226`）；Work：`processTraceFromWorkProjection`（`App.tsx:1745,1943`） |
| 运行态动画 | `BrandThinking` 唯一 | 仅 `ProcessTrace.tsx:70` 引用；CSS `@keyframes brand-line-write` 唯一 |
| 长文/粘贴/动作 | `CollapsibleMessage` / `PasteBlock` / `MessageActions` | chat 与 work/local 消息共用 |
| 凭证表单 | `CredentialForm` | 引导与设置同源（文件头自证 + `ProviderSetup` 消费） |
| 图标 | `workbench/Icon.tsx` | 标准入口；`MiniIcon` 仅少数 glyph |
| 疊层收敛 | `useDismissOnOutside` | 多 popover 共用 hook |

静态门（审计会话实跑 exit 0）：

- `assert-process-trace.mjs` → `ProcessTrace shared lifecycle boundaries: OK`
- `assert-rp211-contracts.mjs` → workmode 同源断言 OK  
- `assert-chat-ui-contracts.mjs` → OK  

#### 同源缺口 / 残余双源（扣分）

| 项 | 证据 | 严重度 |
|---|---|---|
| 左栏收拢双实现 | App 在 `!effectiveLeftCollapsed` 才挂 `CaseRail`（`App.tsx:1767-1768`），展开钮走 detached `WindowChrome`；但 `CaseRail.tsx:108-137` 仍完整实现 `is-collapsed` 窄条 + `expand-left-rail`，运行时不可达 | **P2 源码残余** |
| 测宽 token 未单源 | `--content-measure: 760` 仅绑 `.chat-segment`（`styles.css:226-228`）；`--home-welcome-measure: 560` **零消费**；welcome 硬编码 `min(720px, …)`（`styles.css:447-448`） | **P2** |
| Copy 控件并行 | `MessageActions` 内联 clipboard；`CopyButton` 另路（workbench） | P3，场景不同可接受 |

### 2. 两侧收敛时不留残余

#### 运行时主路径（通过）

双侧收拢约定（注释 + 实现一致）：

- 左：`收敛即撤卡（不留窄条）` — 不渲染 `CaseRail`，展开钮驻 chrome（`App.tsx:1767-1768, 1750-1755`）
- 右：整卡退出网格，仅 `workspace-edge-control` 展开（`App.tsx:2089, 2204-2215`）
- CSS：`.workspace.left-collapsed.right-collapsed` → 单列 `1fr`，`gap:0`，`padding-inline:0`（`styles.css:196`）

e2e 契约：

- `rp1.spec.ts:126-140`：双侧收拢后 `case-rail` count 0、`expand-right-rail` 可见、`module-progress` 0  
- `chrome-in-card.spec.ts:37-54`：`right-module-stack` 0；conversation 占满视口宽  

**允许保留的控件**：`collapse-left-rail`（chrome 同位展开）、`expand-right-rail`（边缘展开）—— 属再入动作，不是面板残骸。

#### 残余缺陷（未清）

| ID | 残余 | 位置 | 说明 |
|---|---|---|---|
| R1 | 左栏窄条死支 | `CaseRail.tsx:108-137` | 与「撤卡」策略矛盾；`leftCollapsed` prop 在挂载路径上恒为展开语义 |
| R2 | 窄条 CSS 族 | `styles.css:237-244, 297-298` | `.case-rail.is-collapsed`、`.collapsed-case-icons` 服务死支；comparing 仍引用 icons 布局 |
| R3 | 脚本仍点 `expand-left-rail` | `scripts/capture-rp1-compact.mjs:18` | 运行时 testid 已不出现（展开钮为 `collapse-left-rail`） |
| R4 | `rails-compact` 幽灵列 | `App.tsx:1655-1656,1757` + `styles.css:195` | 左收 + 模块全折时加 `rails-compact`（`48px \| chat \| 320px`），与 `left-collapsed` 同特异性且后写 → **空 48px 首列**（CaseRail 已卸载）。双侧收拢时被更高特异性 `left-collapsed.right-collapsed` 盖住，故双侧 e2e 仍绿 |
| R5 | 过期注释 | `App.tsx:378` | 仍写「▏字符指示（RP-2.11 推理字符版）」；运行态已是 `BrandThinking` |

**判定**：用户可见的「左右都收」主路径基本无面板残余；**源码与部分单侧布局未做到零残余**，不满足「不留残余」的严格验收。

### 3. chat 流相应收缩到中间

#### chat 面（`viewSegment === 'chat'`）——通过

```css
/* styles.css:226-228 */
.chat-segment .conversation-scroll { padding-inline: max(16px, calc((100% - var(--content-measure)) / 2)); }
.chat-segment .composer-stack { max-width: var(--content-measure); margin-inline: auto; }
```

左栏收拢：`.workspace.chat-segment.left-collapsed` 单列（`styles.css:225`），测宽规则仍作用 → 流在视口中线收成 760。

#### work 面双侧收拢——未充分收缩

| 区域 | 行为 | 是否「收缩到中间」 |
|---|---|---|
| 网格列 | 单列全宽 L0 画布 | 列占中，但不收测宽 |
| `chat-titlebar` / `chat-case-head` | `left-collapsed` 时 `content-measure` 磁吸（`styles.css:1505-1509`） | 仅标题带 |
| `.conversation-scroll` | 固定 `padding: 12px 16px`（`styles.css:423`），**无** content-measure | **否** |
| `.composer-stack`（work） | `max-width: 100%`，无 760 封顶 | **否**（全宽时几何中心恒为视口中线） |

既有 e2e `chrome-in-card.spec.ts:45-54` 断言：

- `conversation.x === 0` 且 `width === viewport`（**满宽**，非 760）
- composer 中心 ≈ 视口中线（全宽时恒真）

→ 门禁**不保证**「流内容列收缩到 760 中间」，只保证列铺满与 composer 几何居中。

**判定**：chat-only 测宽收缩 **通过**；与两侧收敛联动的 work 对话流 **未** 做到相应测宽收缩 → **部分通过**。  
（架构于 `LAYOUT-CONVERGE-1` 已裁定：跨模式阅读宽度一致，work 单列态须套用 `--content-measure`。）

### 4. work thought process ≡ chat only 动画

#### 通过证据

1. **组件唯一**  
   - Running：`<BrandThinking />`（`ProcessTrace.tsx:59-70`）  
   - Settled/failed 锚：同一 `process-trace-cursor`（▏），无 `terminal-blink`（门禁禁止）

2. **Work 与 Chat 同入口**  
   - Work：`<ProcessTrace view={workTraceView} />` 且位于 owning turn 内（`App.tsx:1943`；`assert-process-trace` 校验 turn 边界）  
   - Chat：`ChatAssistantMessage` + pending 占位均走 `ProcessTrace`（`App.tsx:225, 2074-2077`）  
   - **无** `ThinkingStream`、**无** `<details className="chat-reasoning">`（文件不存在 + 静态门禁止）

3. **投影分离、呈现合一**  
   - `processTraceFromTurn` / `processTraceFromWorkProjection` 只映射状态，不另写 UI  
   - running 态无论 `reasoning` | `progress` 都渲染同一 `BrandThinking`（`ProcessTrace.test.ts:51-64`）

4. **动画 CSS 单份**  
   - `brand-line-write` + `.brand-thinking-line` scaleX（`styles.css:1485-1497`）  
   - reduced-motion 全局守卫仍由 `assert-process-trace` 要求

5. **语义差异（允许）**  
   - 文案：`Thinking…` / `Working…`、`Thought process` / `Work progress`（mode 分流）  
   - **动画与交互原语相同**，符合 TRACE-UI-1「同源不同义」

**判定：通过。**

### 5. 交叉矩阵

| 场景 | 左栏 DOM | 右栏 DOM | 流测宽 | ProcessTrace 动画 |
|---|---|---|---|---|
| 三栏 work 默认 | CaseRail 展开 | right-workbench | 无 760（分栏内 stretch） | 共享 BrandThinking |
| 双侧收拢 work | 无 case-rail | 无 stack + edge expand | 满宽 L0，非 760 | 同上 |
| chat + 左收 | 无 case-rail | 无右栏 | **760 居中** | 同上 |
| chat pending | — | — | 760 | BrandThinking running |

### 6. 阻塞项清单（须修后再验）

#### P1（影响「不留残余 / 收缩」验收语义）

1. **清除左栏收拢死支**  
   - 删除或永不挂载 `CaseRail` `leftCollapsed` 窄条分支；同步删/收 CSS 与 `expand-left-rail` 脚本引用。  
   - 单一展开控件：`WindowChrome` 的 `collapse-left-rail`。

2. **`rails-compact` 与撤卡策略对齐**  
   - 左栏已卸载时不得再申请 `48px` 首列；或 `rails-compact` 退役/降优先级到与撤卡一致。

3. **双侧收拢后 chat 流测宽**（产品意图为「相应收缩」；架构已裁定跨模式阅读宽度一致）  
   - work 单列态应对 `.conversation-scroll` / `.composer-stack` 套用与 chat-segment 相同的 `--content-measure`；  
   - e2e 须断言 **宽度 ≈ 760（或 max-width）**，而非仅中心点重合。

#### P2（同源卫生）

4. `--home-welcome-measure` 与 welcome `720px` 二选一单源。  
5. 删除 `App.tsx:378` 过期「字符指示」注释。

#### 不阻塞（已通过或已知边界）

- ProcessTrace / BrandThinking 同源动画  
- Composer / segment 状态同源  
- ThinkingStream 已删除  
- UI-RESIDUE-1 批一（overlay 残留门）不在本四准则内；批二状态代数未做，另单

### 7. 复验建议（独立 clean worktree）

```text
1. node apps/desktop/scripts/assert-process-trace.mjs
2. node apps/desktop/scripts/assert-rp211-contracts.mjs
3. 双侧收拢：case-rail=0, right-module-stack=0, 无 48px 空列（getBoundingClientRect 查 grid）
4. chat-segment：conversation-scroll padding-inline 与 composer max-width = content-measure
5. work running：.brand-thinking 存在且与 chat running 同一 class/动画名
6. rg "expand-left-rail|case-rail.is-collapsed|ThinkingStream|terminal-blink" apps/desktop/src → 期望 0（修后）
```

下游修复落地后由**另一独立会话**按上表复验；修复工单坐标见就绪图 `LAYOUT-CONVERGE-1`。

### 8. 最终裁决

> **最终判定：FRONTEND-FOUR-CRITERIA 不放行 ❌。**  
> 准则 4（work thought = chat only 动画）**通过**；准则 1–3 主路径大体正确，但 **左栏撤卡后源码/网格仍有残余**，且 **work 双侧收拢时对话流未按测宽收到中间**，与「两侧收敛不留残余 + chat 流相应收缩到中间」不一致。  
> 修完 P1 三项（及 P2 卫生项）后，由独立会话复验方可改判放行。本报告为并行只读审计落盘真源；不更新 `docs/status/current.md`，不把 `LAYOUT-CONVERGE-1` 登记虚报为已交付。

## LAYOUT-CONVERGE-1 复验 · FRONTEND-FOUR-CRITERIA 改判（2026-07-17）— ✅ 放行

**标注**：独立复验会话（Grok 验收角色）；复验基准 = 上节 `FRONTEND-FOUR-CRITERIA-AUDIT` 的六条建议 + 就绪图 `LAYOUT-CONVERGE-1` 退出证据单行。不采信实现自述；证据来自 clean detached worktree 实跑。未更新 `docs/status/current.md`、不推送、不 prune。

**对象**：`impl/layout-converge-1` @ `fbc7209`（基线 `6cbf75e`，10 文件），经解冲突合入 `main` @ **`f0ceae7`**（floor 255；与 `WORK-LIVE-1` 疊加——合并组合全量门为本单一部分）。

**隔离**：`/private/tmp/courtwork-layout-converge-reverify` detached @ `f0ceae7`；`pnpm install --frozen-lockfile`；Playwright `reuseExistingServer: false` + 隔离端口 `:1491`（全量）/ `:1493–1495`（residue×3）/ `:1505`（几何探針）。

### 1. 合并组合全量门（WORK-LIVE + LAYOUT-CONVERGE 双新门并存）

| 门 | 结果 |
|---|---|
| `pnpm -r build` | exit 0（既有 chunk-size 提示，非本单） |
| `pnpm lint`（根 eslint） | exit 0 |
| root Vitest | **142 files / 1222 tests** 全绿 |
| desktop Vitest | **51 files / 294 tests** 全绿 |
| `lint:work-live` + `lint:layout-converge` | 双门各绿；`test:e2e` 链内两节点并存 |
| 全静态门链（motion→…→work-live→voice→layout-converge→assert-test-count） | 全绿；floor **255**（下限 255） |
| 隔离端口 Playwright `:1491` | **255 passed / 255 total**（app + residue） |
| residue project 连跑 3 轮 | 各 **21/21**（:1493/:1494/:1495） |

### 2. 死支零命中 + 静态门红证重放

- `rg "expand-left-rail|case-rail.is-collapsed|collapsed-case-icons" apps/desktop/src` → **0 命中**
- `apps/desktop/scripts`（排除门自身）同上 **0 命中**
- 红证：注入 `expand-left-rail` 入 `CaseRail.tsx` → `assert-layout-converge` **exit 1**；还原 → exit 0
- 红证：注入 `case-rail.is-collapsed` 入 `styles.css` → **exit 1**；还原 → exit 0

### 3–5. 几何实測（getBoundingClientRect / computed style，视口 1440×900）

| 场景 | 断言 | 实測 |
|---|---|---|
| 双侧收拢 work | case-rail=0、right-module-stack=0 | 通过 |
| 双侧收拢 grid | 无 48px 首列 | `firstTrack=1440px`（单列） |
| work 正文列测宽 | `.conversation-scroll` 内容列 / `.composer-stack` / `.scene-strip` ≈ `--content-measure`(760) 且同 x | contentW=composerW=sceneW=**760**，x=**340**，中心 720=视口中线；居中偏差 0 |
| rails-compact（左收+模块全折） | 无 48px 幽灵列；正文列不被挤压 | `data-compact=true`；`first=1076px`；conv x=8 / w=1076 |
| welcome | 消费 `--home-welcome-measure`；720 硬编码零残留 | token=`560px`；`.welcome-home` 宽 **560**；styles 内 720 仅注释述史 + `animation-delay:720ms`（非测宽） |
| comparing | 48px chrome 条照旧；icons 死支不复活 | `.workspace.comparing { grid-template-columns: 48px … }` 仍在；`.case-expanded{display:none}` 强制 class 实測生效；`.collapsed-case-icons` 零 DOM |

既有 e2e 锁定：`chrome-in-card` 双侧收拢测宽断言、`layout-converge` rails-compact 幽灵列反例（均在 255 全绿内）。

### 6. 准则一至三复判（准则四不重验）

对照审计原表逐项改判：

| 准则 | 审计原判 | 复判 | 依据（对应 P1/P2） |
|---|---|---|---|
| 1. 同类控件同源 | 条件通过 | **通过** | R1/R3 死支删除 + P2-4 welcome token 单源 + P2-5 注释述实；主路径 Composer/segment/ProcessTrace 同源未回退 |
| 2. 两侧收敛无残余 | 条件通过 | **通过** | R2 CSS 族清除 + R4 rails-compact 去 48px 首列；双侧收拢与 compact 几何零空列；comparing 功能 48px 通道保留 |
| 3. chat 流收缩到中间 | 部分通过 | **通过** | P1-3 work 单列套 `--content-measure`；正文/composer/scene-strip 三者 760 对齐；伪断言（仅中心点）已退役 |
| 4. work thought 同动画 | 通过 | **不重验（维持通过）** | 审计已闭合；静态门 `assert-process-trace` 本会话仍绿 |

审计阻塞项 P1×3 + P2×2 **全部闭合**。Copy 控件并行（P3）仍为已知边界、不阻塞。

### 7. 最终裁决

> **最终判定：LAYOUT-CONVERGE-1 / FRONTEND-FOUR-CRITERIA 放行 ✅。**  
> 合并 tip `f0ceae7` 上，合并组合全量门（含 WORK-LIVE 与 layout-converge 双新门、floor 255、Playwright 255/255、residue 3×21/21）全绿；生产源码死支零命中且静态门接受注入反例；work 双侧收拢正文列收至 760 居中、rails-compact 无幽灵列、welcome 560 token 单源、comparing 48px chrome 零回归。准则 1–3 由条件/部分通过 **改判通过**；准则 4 维持通过。  
> 成立范围：审计四准则 + 就绪图 `LAYOUT-CONVERGE-1` 退出证据。本会话未改实现、未更新 `docs/status/current.md`、不推送。

# ACCEPTANCE: WORK-LIVE-1-ACCEPT

日期：2026-07-17

角色：独立验收会话

对象：`impl/work-live-1 @ 80c378d`（基线 `0dae3bc`，12 文件，均在 `apps/desktop`）；合入 `main @ f5ba9ef`。验收在独立 clean worktree `/private/tmp/courtwork-work-live-1-accept-86fd85c` 的当前 `main @ 86fd85c` 完成；此尖端额外包含待验 `WORK-HOST-1`，故只把它作为组合事实，不误算入本单的 12 文件范围。共享树未 checkout/stash；未更新 `docs/status/current.md`、未推送、未执行 prune。

## 裁决

**❌ 不放行 WORK-LIVE-1。**

唯一阻断项是 ADR-010 决定一已经固定的 `rejected/not_configured` 语义没有生产实现，而不是测试数字或 demo 隔离问题：

- `src/protocol/client.ts:92-96` 的 `WorkCommandOutcome` 虽列出四个 `rejected` reason；
- `src/main.tsx:46-51` 在未取得 `providerTransport` 时仍构造 production `workCommand`；
- `src/work/work-runtime.ts:120-124` 对该未装配情况返回普通 `Error('…缺 provider transport')`；
- `src/work/work-command.ts:268-271` 因此将其映射为 `failed/internal`，而非 ADR-010 决定一规定的 `rejected/not_configured`。全文件 grep 亦证实 `not_configured` 仅出现在类型/注释，实际返回路径为零。

ADR 原文要求：production composition 未装配时必须返回闭集中的 `not_configured`，不得裸 Promise rejection 或降回 demo。当前实现已避免裸 rejection，但错误地给出 `failed/internal`；静态门只锁了类型闭集，14 个 command 单测也未覆盖此变体，故全绿不能替代该语义。

建议由实现会话以最小范围补上该既定 ADR 语义及反例测试；这不是验收会话可自行拍板的契约变更。修复后须由新的独立验收复跑本单全量门和这条反例。

## 已成立的组合证据（不抵消阻断项）

| 门禁 | 本次独立实跑 |
|---|---:|
| `pnpm install --frozen-lockfile` | PASS（1047 packages，lockfile 一致） |
| `pnpm -r build` | PASS（仅既有 chunk advisory） |
| `pnpm lint` | PASS |
| root Vitest | **142 files / 1222 tests** PASS（含 `no-demo-in-harness`） |
| desktop Vitest | **52 files / 298 tests** PASS |
| 完整静态链 + 隔离端口 `18634` Playwright | **255/255** PASS（floor 255） |
| residue 独立三轮，端口 `18635` / `18636` / `18637` | 各 **21/21** PASS |
| `demo:s3` | 7/7 考点、golden PASS，redline 39651 bytes |
| `demo:legal` | golden PASS，8 risks / 11 anchors |

生产链零 demo 已另行核验：`work-command.ts`、`work-runtime.ts`、`legal-s3-binding.ts` 的可执行路径对 `recording`、`fixture`、`contractSourceMd` 无命中（仅注释说明边界）；`assert-work-live-contracts` clean PASS。验收实际向 `work-command.ts` 注入 `const __acceptanceDemoDependency = 'recording'`，门立即报一条 violation 并 exit 1；精确撤除后恢复 clean，worktree 无产品源码残留改动。

全链 E2E 的两例都在 255/255 内实跑：grant 授权→就地 ingest→显式主体→真实 executor 风格的 E2E turn stub→逐项 gate confirm/reject→`resolveReview`→OUTPUT-CONFIRM 的逐项确认→docx 经 grant 授权写入；运行中 cancel 则收敛为 canceled、取消控件消失、零 docx 落盘。`work-command.test.ts` 聚焦复跑 **14/14**：start/pause/resume/ArtifactEnvelope、跨端口 replay/resume、cancel、first-wins、`command_conflict`、`case_busy`、`invalid_scope`、材料阻断及 interrupted 均通过；未覆盖的正是 `not_configured`。

## ADR、边界与复杂度核对

- 决定一其余逐字语义成立：UI 不构造 run/tool 输入；actor 由 runtime 注入；first-wins、单 case active、cancel 无 active 不伪报成功、interrupted 不自动重放均有代码与上述反例；但 `not_configured` 缺口使决定一整体不成立。
- W5 语义判断成立：`queuedMessages.map(...)` 内每条消息的 W5 是聊天队列消息控件，并非 Work cancel；保留 `data-state="unwired"` 合理。真正 Work 取消是 grant 工作面的 `work-cancel`，已由 E2E 实跑。SPEC 对旧 W5「Work 执行器未接通」的归因张力已诚实留痕，需架构裁定是否改 marker，验收不擅改。
- 成熟度表述可接受：WORK-LIVE-1 在其实现尖端仅内存参考 host，真机跨重启诚实后置给 `WORK-HOST-1`；当前组合尖端已注入 Rust opaque-blob host，但真机 key/Tauri/`F_FULLFSYNC` 手工试点仍未跑。因此只能称 **package-ready**，不得称 product-live 或 external-validated。
- 四项需架构裁定与就绪图一致：真机跨重启耐久/手工试点（已拆 `WORK-HOST-1`）、generic `StartWorkCommand` 的垂类 preflight wire、authenticated principal/actor、以及 W5 marker 的语义归属。没有把它们静默改写为已解决事实。
- 复杂度声明可核：恰一新概念为 `createLegalS3WorkCommand` 的 production `WorkCommandPort` 实现；`rejected` 是 ADR-010 已有闭集的缺项补全，runtime 组合缝、DEV/E2E stub 与 App 接线均非新抽象。零新依赖、持久格式及状态机，12 文件范围成立。

## 后续放行条件

补齐 production composition 未装配时的 `rejected/not_configured` 真实返回路径，并增加能触红的反例；新的独立验收须确认该路径不再成为 `failed/internal`，再复跑 build/lint/root+desktop Vitest、静态链、隔离端口完整 E2E、demo golden 与 no-demo-in-harness。`current.md` 仍只由架构角色按成熟度处理。

---

# ACCEPTANCE: WORK-HOST-1-ACCEPT

日期：2026-07-17

角色：独立验收会话

对象：`impl/work-host-1 @ 1670e8e`，基线 `f0ceae7`，验收基准 `main @ 86fd85c`。本节在同一验收链中紧接 `WORK-LIVE-1-ACCEPT`；worktree 为独立 clean `/private/tmp/courtwork-work-host-1-accept-86fd85c`。未更新 `docs/status/current.md`、未推送、未执行 prune。

## 裁决

**❌ 不放行 WORK-HOST-1。** Rust/adapter 的常规功能证据成立，但两项明确退出证据未成立：

1. **原子替换 mutation 红证假绿。** 验收将 `work_state.rs` 的 `fs::rename(&tmp, target)` 精确替换为 `fs::write(target, &framed)`（直接覆盖 target），然后独立运行 `cargo test --lib work_state::tests::crash_injection_atomic_replace_never_tears_across_real_sigkills -- --exact`。该测试内含 **24** 轮真实 SIGKILL，却仍 **PASS**，没有 exit 101/撕裂失败。此 mutation 已精确还原，随后 `cargo test --lib` 最终 clean 通过。实现自述的「直写必红」不能由这次重放复现；当前 64 KiB payload 与随机 1–12ms kill 窗口不足以可靠咬住直接覆盖，故测试不能证明原子替换被破坏时必红。
2. **WORK-LIVE SPEC 的跨重启试点步骤不可由现有产品完成。** 步骤 5 声称重启后以同一 ref 调 `workCommand.replay(ref)` 并 `resolveReview`。但 `App.tsx:328` 的 `workSessionId` 只在 React state，重启/切案即清空（`:778-782`），全 App 对 `workCommand.replay` 零消费点；grant case/session ref 亦未成为可恢复 UI 状态。Rust 能按已知 ref 读 blob，不等于用户能在真机重启后重新发现该 ref 并续行。因此「从跨重启未验证晋升为可复现试点」的 SPEC 声明过早；不得以 host blob 存在冒充 desktop resume 能力。

两项均不涉及新 schema 语义；前者需把 mutation 设计成确定性触发 direct-write 撕裂或等价可观测破坏，后者需由架构/实现厘清并实现 session-ref 恢复入口后，再由独立验收复跑。前单的 `rejected/not_configured` 阻断仍独立存在，未被本节覆盖。

## 已成立证据（不抵消阻断项）

| 核验 | 独立实得 |
|---|---:|
| `git diff f0ceae7..1670e8e` | 恰 **7** 文件；`Cargo.toml`、`Cargo.lock`、`current.md` 均零 diff |
| `cargo test --lib` | **64 passed / 0 failed**；`work_state` 12 例；仅 5 条既有 `lib.rs` unnecessary-unsafe warnings |
| CAS 败者 | `stale_expected_version…` 与 `fresh_expected_null…` 均 PASS，`applied:false` 不覆盖赢家 |
| 大小边界 | 4 MiB 软告警仍落盘；16 MiB 硬限 fail-closed 且旧 bytes 保留；均 PASS |
| 损坏/穿越 | 缺分隔帧 read/commit 均 fail-closed；非法 ref 拒写/读 not-found，均 PASS |
| opaque | `work_state.rs` 运行代码无 `serde_json`、envelope/schema/event/legal 解析；仅测试 payload 含 `storageVersion` 字样。版本/信封判定仍留 TS codec |
| TS adapter | `tauri-work-state-host.test.ts` **4/4**：命令名、input、`number[] ↔ Uint8Array`、CAS 败者/缺失透传均 PASS |
| swap/边界 | `main.tsx` 以同一 `isTauriHostRuntime()` 门控：Tauri 注入 `createTauriWorkStateHost`，DEV/E2E 缺省内存 host；`assert-work-live-contracts` PASS |
| 合并 E2E/residue | 同一 `86fd85c` 组合基准此前隔离端口实跑 **255/255**，residue 三轮各 **21/21**；本次 adapter/static 复核未回退 |

`work_state.rs` 的 host 内部仍保持正确的扁平 opaque frame、CAS、临时文件→`sync_all`→rename→目录 `sync_all` 结构；但是必须以会红的反例证明该结构不可被直写退化，不能只凭源码阅读或偶然绿的 SIGKILL 采样放行。

## 真机与成熟度边界

`File::sync_all` 在 macOS 的实际 `F_FULLFSYNC`、真实 key/Tauri 的跨重启和 docx 验证均未在本会话运行；这些本应是人工试点，不能宣称 external-validated。由于上列 ref 恢复入口缺失，现行步骤也不能称为完整可复现试点。`package-ready` 只能描述 Rust host/adapter 局部实现与自动化；不得据此升级为 product-live。

## 后续放行条件

1. 在不依赖运气的前提下，使 direct-write mutation 稳定触发崩溃完整性测试失败，并保留 clean 原子实现绿色证据。
2. 补齐或经架构改写跨重启 session-ref 的恢复路径；若仍要承诺 UI 续行，必须有从重启后发现 ref、replay paused、resolveReview 至 docx 的可执行产品步骤与独立证据。
3. 新的独立验收复跑 cargo 全库、两类 mutation/恢复证据、adapter、静态门、隔离 E2E 与 residue；不更新 `current.md` 直到架构按成熟度裁定。

---
## UI-RESIDUE-1-BATCH1-ACCEPT · 终局裁决（2026-07-17）

初轮独立验收已在 clean worktree 对 `main @ 0dae3bc` 完成全部技术证据：全仓 build/lint、root Vitest **1222/1222**、desktop Vitest **280/280**、全静态门与独立端口完整 Playwright **252/252**；residue project 连跑三轮分别 **21/21**（43.7s / 43.5s / 43.4s）。摘除 `useDismissOnOutside` click 吞噬器后 user-menu→new-case 穿透红、恢复绿；portal/focus/无限动画注入均令残留门确定性 rejects；关闭后注入无 role 真残留令像素门红（**17600** 个通道差 `>2/255` 的像素，样本 Δ=244），撤除后绿。

本轮在新的 clean worktree 核对 `main @ 3c7be96`：`apps/desktop/SPEC.md:341` 已记录 rail 死线索「登记保留，不删不复活」，归 Chat→Work 晋升桥评估或 polish 清扫；`:342` 已记录 focus-restore 归 `UI-RESIDUE-1` 批二；两处 `[需架构拍板]` 悬置标记均已撤销。记录与架构裁定一致，初轮唯一阻断消除。

> **最终判定：UI-RESIDUE-1 批一放行 ✅。** 成立范围严格为已枚举 17 行疊层状态图内无已知残留／焦点丢失／状态串线／不可逆跳变，不作绝对零 bug 宣称；批二的三区状态代数、竞态与 focus-management 仍未验收。本终局裁决不更新 `docs/status/current.md`，不推送。

---

# ACCEPTANCE: WORK-LIVE-1-COMBINED-FOCUSED-REACCEPT

日期：2026-07-17；对象：`main @ e0a256a`（`5a3bacb` / `31d068d` / `26dbf05`），独立 clean worktree `/private/tmp/courtwork-live-host-combined-accept-e0a256a`。

**✅ 放行 WORK-LIVE-1。** 未注入 transport/stub 的两种 start 均实得 `rejected/not_configured`、零 header/artifact；`isConfigured`→`false` mutation 使二例分别红为 `paused` / `invalid_scope`，还原绿。四 reason 中 `not_configured`、`case_busy`、`invalid_scope` 均有真实 port 路径；`command_conflict` 有 first-wins 单测但单写者 App 无诚实 UI 触发面，已如实登记。rejected 渲染为 `tone:'info'`，不是 error 红条。

`workCommand.replay` 现被 App 消费；摘除接线令静态门立即红。切案→水合 paused gate→resolve→docx、以及信封缺失→中性失效+清残 ref 两 e2e 均通过。切案不是规避 reload：案列表未持久与 DEV/E2E 内存 host 不跨 reload 的边界已由 `CASE-PERSIST-1` 承接。

组合门：build/lint PASS；root **142/1222**；desktop **53/311**；隔离 `18644` 完整 Playwright **258/258**（floor 258）；residue 三轮各 **21/21**；`demo:s3` 7/7、39651-byte redline，`demo:legal` PASS。真机 Tauri/key/F_FULLFSYNC 试点仍未执行，不扩大为 external-validated/product-live。未更新 current、不推送、不 prune。

---

# ACCEPTANCE: WORK-HOST-1-COMBINED-FOCUSED-REACCEPT

日期：2026-07-17；对象：`main @ e0a256a`。

**✅ 放行 WORK-HOST-1。** 相对 `86fd85c`，`work_state.rs` production 行 **1–245 零改动**，只从测试模块 line 248 加强检测。将 `rename` 直写突变后崩溃测试 **5/5 必红**（每次 19–23 次子完整帧观察、6–10 次损坏恢复）；还原原子实现后 **5/5 恒绿**。每次含 24 SIGKILL、2 MiB 确定性指纹和并发采样。

最终 `cargo test --lib` **64/64**，CAS、4/16 MiB、帧损坏、穿越、opaque 纪律与 adapter 四例均通过；Tauri/DEV-E2E host swap 与 Work-Live 静态/E2E 未回退。replay 消费点关闭旧 UI ref 发现阻断，完整跨重启案列表前提仍诚实由 `CASE-PERSIST-1` 承接。真机 F_FULLFSYNC/key/Tauri 试点仍待执行；不宣称 external-validated。未更新 current、不推送、不 prune。

---

# ACCEPTANCE: CASE-PERSIST-1

日期：2026-07-17；对象：`impl/case-persist-1 @ 9a2c909` rebase 至 `main @ 99b69e7` 后验收尖端 `6ccbd90`，独立 clean worktree `/private/tmp/courtwork-accept-case-persist`。本条为架构师对验收会话裁决的转录（原始记录在验收 worktree 未提交，随该 worktree 清理消亡；证据要点如下，验收会话回报全文为准源）。

**✅ 放行 CASE-PERSIST-1。** 关键证据：rebase 无冲突；三层 reload 重建 e2e 3/3（真 `page.reload()`：grant 案回侧栏、caseBinding 重建、恢复入口可达）；hydration neuter 连跑三轮均 2/2 稳定变红、复原转绿（确定性红证）；demo 持久化突变 1/1 变红（恒挂语义非空洞）；失效 grant 显式警示可见、「移除此案」可用，移除后持久层精确清为 `{"version":1,"cases":[]}`（建/清对称）；`pnpm -r build`、`pnpm lint`、voice/host-auth/work-live/neutral/elevation 静态门通过；全量 e2e **261/261**（floor 258→261）；residue 连跑三轮各 **21/21**。真机 Tauri/key/F_FULLFSYNC 试点仍待产品负责人执行；s3-launcher「跨重启保留即将开通」注释未动（真机半边不提前宣称）。验收会话未触碰 `current.md`、未推送、未 prune。

---

## PILOT-LIVE-1-FIX 聚焦複驗（2026-07-17）

**裁決：PILOT-LIVE-1（含 FIX）放行 ✅。** 前輪 `f8f41b` 報告的三項阻斷已逐條關閉：架構已明確豁免 `apps/desktop/src|tests|scripts|SPEC.md` 為授權面；demo 回顯塊已恢復為基線上的純插入；合併樹完整 E2E 連續兩輪均為 276/276。A/B/C/D 前輪已通過的專項維持成立，本輪未發現新阻塞。

- **實現證據**：原分支 `impl/pilot-live-1 @ 8d530094cc243b87ca2ff9a68c9ab8aca8ee3a20`（B=`d496324`、A+C=`f253e7f`、D=`887133e`、SPEC=`7b242e4`、糾偏=`6b1aa08`、追平=`8d53009`）。
- **隔離與合併樹**：新 worktree `/Users/lesprivilege/Projects/Courtwork-pilot-live-1-fix-accept`、分支 `accept/pilot-live-1-fix`。驗收開始時共享 `main` 已由交接的 `0db350c` 前進到 `81938020574dac984784f45ceb3d96d22662b582`（新增 PROJECTION-RESUME-1 core 清帳）；乾淨 rebase 無衝突，合併樹產品尖端 `7c882f94ec54fec47b93746cbc591d3508557bd6`。
- **觸碰面**：`main..7c882f9` 恰 13 檔，全部位於架構豁免的 `apps/desktop/src`、`tests`、`scripts`、`SPEC.md`；`packages/**`、`src-tauri/**`、`docs/status/current.md` 與試點台賬均零差異。

### 1. demo 字節復原

以含 CHAT-MATERIAL-1 已驗收碼的 `f6f0da5` 對原實現尖端 `8d53009` 做 `App.tsx` 函數級 diff，`handleComposerSend` 實得 **8 additions / 0 deletions**。新增內容只有非 demo 路由早退；其後既有 demo 排隊與本地回顯區塊沒有 `-` 或改寫行。SPEC A 行已如實改寫為「純插入」，不再沿用前輪被駁回的錯誤字節宣稱。

行為抽驗：`pilot-entry.spec.ts` + `chat-material.spec.ts` 合跑 **6/6**，同時覆蓋非 demo request body 的附件正文、空內容阻斷與第二輪 history 同源；`Composer.dom.test.ts` **4/4**，含讀取失敗顯式 failed chip 與 C 的目錄/多檔/再添引導。`demo:s3` golden PASS（39,651 bytes、7/7 考點、9 事件），`demo:legal` golden PASS（8 risks、11/11 anchors、4,606 bytes）。

### 2. E2E 追平三根因

#### 2.1 墻鐘自證與歸一化非削弱

驗收暫時只刪除 `suppressFocusRing` 的 `[data-testid="message-relative-time"] { visibility:hidden }`，保留全部斷言及閾值。墻鐘自證確定性變紅：**1 failed**，超閾像素 262，樣本 `(429,674) Δ=52`、`(427,675) Δ=135`、`(428,675) Δ=136`，與前輪收割的 y≈674 簽名一致。恢復後同例綠。

A≡B 閾值在 FIX 前後逐字相同：`maxChannelDelta=2`、`maxDiffPixels=800`，沒有放寬。另臨時加入機器探針，在真頁面套用歸一化後斷言 computed `visibility === hidden` 且 timestamp 的 bbox 寬、高均 `>0`；探針與墻鐘例共同通過，證明消除繪製但保留盒佔位。臨時探針已還原，產品/測試提交內容未改。

#### 2.2 延時歸零鉤子的生產隔離

`main.tsx` 只在 `import.meta.env.DEV && VITE_COURTWORK_E2E==='1'` 的雙門真分支讀取 `window.__courtworkDemoReplayDelayMs`，source 近鄰檢查成立。合併樹 production Vite build 後，`apps/desktop/dist` 對 `__courtworkDemoReplayDelayMs` 與 `VITE_COURTWORK_E2E` 均零命中；production composition 仍以既有預設 `replayDelayMs=180` 建 demo fixture，沒有讀取測試 override。上述兩條 demo golden 同時全綠，延時歸零沒有改 demo 業務語義或事件骨架。

#### 2.3 鎖定收緊

把現行 `^批量确认 \d+ 项$` 暫退為舊 `/批量确认/` 後，residue 真 DOM 立即 strict-mode 失敗：locator 實得 **5 個匹配**——動作鈕 `批量确认 4 项` 加四個 next-step 含 `可批量确认` 的風險行。`Panels.tsx` 的第二命中字面仍在（`riskNextStep(..., 'batch') → 可批量确认`）。因此精確錨定是由 5→1 的收緊，不是斷言削弱；突變已還原。

### 3. 禁用手段與 floor

對 FIX 前父提交 `7b242e4..8d53009` 的全文 diff 掃描：timeout/`waitForTimeout` 字面零增刪，沒有放大既有 timeout；沒有新增 `test.skip`、`describe.skip`、`fixme` 或 `only`。測試斷言的唯一既有行替換是上述 locator 從寬 regex 收緊為全字串 regex；A≡B 閾值不變。floor 注記由 **275→276**，唯一增量是墻鐘自證例；完整靜態鏈兩輪均報「276 條（下限 276）」。

### 4. 合併樹終局門

| 門 | 獨立實跑結果 |
|---|---|
| `pnpm -r build` | PASS；13/14 workspace，desktop production Vite 3574 modules；僅既有 chunk advisory |
| `pnpm lint` | PASS |
| root Vitest | **143 files / 1235 tests** |
| desktop Vitest | **55 files / 332 tests** |
| 完整 `test:e2e` 第 1 輪，端口 19075 | 靜態鏈全綠；Playwright **276/276**（2.8m） |
| 完整 `test:e2e` 第 2 輪，端口 19076 | 靜態鏈全綠；Playwright **276/276**（4.3m） |
| residue 單 worker 三輪，端口 19077/19078/19079 | 各 **22/22**（44.5s / 44.5s / 44.4s） |
| demo golden | S3 / Legal 均 PASS |

完整兩輪均包含 B 的 grant 開面/切 tab、D 的九例、A/C pilot-entry 與墻鐘自證；本輪另對 A/C 做上述聚焦抽驗。所有暫時 mutation 均精確還原，驗收記錄寫入前工作樹只有本文件變更。

### 5. 復跑入口與真機邊界

```text
pnpm install --frozen-lockfile
pnpm -r build
pnpm lint
COURTWORK_E2E_PORT=<獨立端口> pnpm --filter @courtwork/desktop test:e2e
COURTWORK_E2E_PORT=<獨立端口> pnpm --filter @courtwork/desktop exec playwright test --project=residue --workers=1
pnpm test
pnpm --filter @courtwork/desktop test
pnpm --filter @courtwork/demo-runtime demo:s3
pnpm --filter @courtwork/demo-runtime demo:legal
```

放行只覆蓋自動化與 desktop 裝配修復，不把尚未執行的產品負責人真機清單冒充成立：真 Tauri+DeepSeek 附件正文、grant 案實際工作面、WKWebView 點選/拖放文件夾、雙顯示器/系統縮放下布局仍待真機復驗。本會話不更新 `docs/status/current.md`，不推送、不 prune。

---

# ACCEPTANCE: READER-ISOLATION-1

日期：2026-07-17；原實作：`impl/reader-isolation-1 @ 04cf728`（基線 `8535b84`，單提交）；獨立驗收樹 `/private/tmp/courtwork-reader-isolation-accept`，重放至委託基線 `main @ 6d6c364` 後產品尖端 `87f332c`。驗收開始時共享倉本地 `main` 實為後續 docs-only `3da7894`，與委託座標不一致；本次嚴格採 `6d6c364`，未混入後續提交。

**裁決：✅ 放行 READER-ISOLATION-1。** 非 demo 的 grant/unbound 案右欄不再可達硬編碼 demo 語料，「原件閱讀」連標頭整塊缺席，非空殼或 disabled 偽裝；demo 案三入口與點擊進只讀閱讀維持成立。FILE-PREVIEW-1 未被代建，rails-compact 四步退役一字未動，`data-preview-open` 刪除前零消費者聲稱經獨立 grep 坐實。觸碰面嚴格為 `apps/desktop/{src,tests,scripts,SPEC.md}`；零 package、契約、`src-tauri`、`docs/status/current.md` 改動。

## 1. 紅證與誠實缺席

- 先暫時把 `App.tsx` 的 `readerEntries={isDemoCase ? [...] : []}` 恢復為無條件供給，端口 `19121` 跑 `reader-isolation.spec.ts`：demo 對照 **1 passed**；非 demo 例在 `reader-entry` 計數斷言確定性紅，`Expected 0 / Received 3`。反例到達目標斷言，非啟動或環境假紅。
- 精確還原後，端口 `19122/19123/19124` 各跑同一兩例，三輪均 **2/2**：非 demo 案 `reader-entry=0`、右欄無「設備採購合同」、`reader-entries=0`；因此「原件閱讀」內容與標頭同時不在 DOM，不是空殼或 disabled 偽裝。demo 案每輪均三入口在場，首入口可點進 `preview-host` 並顯示「設備採購合同」。
- `workbench.spec.ts` 的既有「原件閱讀態：只讀元信息、無工作面 tab 選中、行內強調不漏星號」聚焦復跑 **1/1**；完整 278 鏈再次通過同例。S3 golden PASS（39,651 bytes、7/7 考點）；Legal golden PASS（11/11 anchors、4,606 bytes）。

## 2. 不越界覈真

- `6d6c364...87f332c` 僅 5 檔：`App.tsx`、`RightRailModules.tsx`、`reader-isolation.spec.ts`、`assert-test-count.mjs`、`SPEC.md`。產品碼只做 demo 入口供給條件、零入口不渲染模塊，以及刪死 attribute；沒有真實材料讀取、reading-view 派生、文件點擊預覽或格式處理，故 FILE-PREVIEW-1 未被代建。
- 相對 `6d6c364`，`styles.css`、`assert-layout-converge.mjs`、`layout-converge.spec.ts`、`pilot-layout.spec.ts` 四個 rails-compact 執行面 `git diff --quiet` 為 0；`App.tsx` 的 `compactLayout` 派生、`rails-compact` class、`data-compact` 標記亦未改。SPEC 僅保留退役提案留痕；`6d6c364` 就緒圖已把四步執行歸 FILE-PREVIEW-1。
- 對刪除前 `6d6c364` 親跑 `git grep -n 'data-preview-open' -- apps/desktop/src apps/desktop/tests apps/desktop/scripts`：唯一命中是 `App.tsx` 自身 `data-preview-open="true"`，tests/scripts/CSS 消費者為 0；刪除後同範圍零命中。

## 3. 合併樹全量門

| 門 | 獨立實跑結果 |
|---|---|
| `pnpm -r build` | PASS；13/14 workspace，desktop production Vite 3574 modules；僅既有 chunk advisory |
| `pnpm lint` | PASS |
| desktop Vitest | **55 files / 332 tests** |
| 完整 `test:e2e`，端口 `19132` | 全靜態鏈通過；floor 明報 **278（下限 278）**；Playwright **278/278**（4.8m） |
| residue 單 worker 三輪，端口 `19133/19134/19135` | 各 **22/22**（1.2m / 50.6s / 47.8s） |
| demo golden | S3 / Legal 均 PASS |

首輪完整鏈端口 `19130` 曾為 **276 passed / 2 failed**：既有 `goal1` 與 `goal2` 均在 helper 的 click/wait 卡滿 30 秒，未到本單斷言；同碼在新端口、單 worker 聚焦立即 **2/2**，其後完整 278 鏈 **278/278**。未改 timeout、helper、斷言或產品碼，故如實記為首輪既有啟動時序失敗，不以其替代終局全綠門。

所有暫時 mutation 均已還原；提交前工作樹除本驗收記錄外乾淨。本會話不更新 `docs/status/current.md`，不推送、不 prune。

---

# ACCEPTANCE: KEY-PERSIST-1

日期：2026-07-18；對象：`impl/key-persist-1 @ 8621c75`（單提交，基線 `main @ bded9ac`）；獨立 clean worktree（`EnterWorktree` 建立，`reset --hard` 至委託 SHA，未在共享樹 checkout/stash；`pnpm install` 全新裝）。驗收開始時 `git fetch origin main` 核對本地/遠端 `main` 均仍為 `bded9ac`，與委託基線一致——`impl/key-persist-1` 恰為其後一枚提交，故「rebase 至 main 尖端」對本單是零操作，工作樹內容與 rebase 後結果逐位元組等同。

**裁決：✅ 放行 KEY-PERSIST-1。** 六項委託動作逐一亲手覈真，全部通過；發現一項 SPEC 真機清單的登記缺口（見第 6 節），屬待補登記而非代碼缺陷，不阻塞本單放行。全程僅對已提交程式碼做**臨時**注入-觀察-撤除的反例覈真，未產生任何遺留修改；`git status`/`git diff --stat` 在每次撤除後即核對回空，最終提交前工作樹只新增本節記錄。

## 1. 紅證復刻：啟動驗證接線缺席 → 紅，恢復 → 三輪綠

- 用 `git show 8621c75~1:apps/desktop/src/App.tsx > apps/desktop/src/App.tsx` 把 `App.tsx` 精準退回父提交版本（唯一改動檔，`git diff --stat` 顯示 `2 insertions(+), 10 deletions(-)`，與委託 diff 逐行對稱），端口 `19821` 跑 `key-persist.spec.ts`：**1 failed / 1 passed**——「stored Keychain readiness restores after reload」確定性紅在 `data-credential-probed` 斷言（`Expected "true"／Received "false"`），另一條清除用例因不依賴啟動接線而保持綠，反例精準命中目標斷言而非環境假紅。
- `git stash push -- apps/desktop/src/App.tsx` 收起退回版、工作樹核對回 HEAD 逐位元組一致後，於埠 `19821/19822/19823` 三輪重跑同一 spec：**均 2/2 passed**（3.9s/3.8s/3.8s）。`git stash drop` 清理暫存，`git status` 確認乾淨。

## 2. Probe 語義：真實失敗必須顯式，非靜默 ready、非靜默清除

- 臨時新增探針 `tests/e2e/zz-kp1-probe-failure.spec.ts`（非委託測試集一部分，驗證後已刪除，`git status` 復核零殘留）：`addInitScript` 用屬性攔截確保 `installProviderConnectionTestHooks()` 一裝好即注入一筆 `connection.phase:'failed'（failKind:'auth'）` 的 probe 結果，避免與啟動 effect 的非同步時序賽跑。
  - **關鍵方法論修正（如實記錄）**：首版探針在 `openSettings()` 之後才讀狀態，結果對兩項後續注入的 mutation 均「假綠」——根源是 `openSettings()` 自身呼叫 `probeCredentials()`，會用一次獨立、未被 mutate 的 probe 覆蓋掉啟動接線自己的（被 mutate 的）輸出，等於用第二條合法路徑掩蓋了第一條路徑的缺陷。改為在**打開 Settings 之前**先讀主 chrome 常駐的 `composer-provider`（`data-phase`/文字），確認才進 Settings 覆核 storage/connection 雙徽標與復原指引，兩條觀測互補、不互相污染。
  - 未 mutate 時：**1/1 passed**——`composer-provider` 顯示 `failed`／`Connection failed`；Settings 內 `settings-credential-storage` 仍 `data-phase="stored"`／`Saved in Keychain`（非靜默清除），`settings-credential-phase` 顯式 `failed`／`Connection failed` 並展開 `settings-credential-recovery` + 精確失敗文案；`settings-clear-credential` 入口仍在場。
  - 反例 A（`App.tsx` 靜默優化為 ready）：`setCredentialStatus(restored)` 改為 `setCredentialStatus({ ...restored, connection: { phase: 'ready' } })`，重跑：**1 failed**（`composer-provider` 實得 `ready`，非預期 `failed`）。撤銷後複核 **1/1 passed**。
  - 反例 B（`connection-client.ts` 靜默清除為 absent）：`validate()` 的瀏覽器 override 分支改為「凡 `failed` 一律折成 `{credential:{phase:'absent'}, connection:{phase:'unverified'}}`」，重跑：**1 failed**（`composer-provider` 實得 `unverified`／`Connect`，非預期 `failed`）。撤銷後複核：探針 + 委託 `key-persist.spec.ts` 合跑 **3/3 passed**。
  - 兩處 mutation 撤銷後 `git diff --stat` 均核對回空；探針檔案事後 `rm` 刪除，非委託交付物。
- 文案覈實：探針復用既有 `FAIL_KIND_MESSAGES.auth`（既有字串，非本單新文案）。本單新增之英文文案（`Saved in Keychain`／`Not saved`／`Clear saved credential`／`Clearing…`／`Couldn't clear the saved credential. Try again.`／`Saved credential cleared from Keychain`）親自複核 `lint:voice`（`node scripts/assert-voice-copy.mjs`）：**通過（116 個源檔）**。但如實記錄一項掃描面邊界：讀 `voice-copy-lib.mjs` 可知該門的字串字面量分支只收錄含 CJK 者，JSX 文本分支排除含 `{expr}` 的混排——上述新文案全部是包在 `{三元表達式}` 內的純 ASCII 字面量，兩個分支都不命中，故**machine gate 對這批新文案實際零掃描**，「通過」是「掃描面之外」而非「逐條判定合規」。這與同一元件族既有先例一致（`CredentialForm.tsx` 已有的 "Couldn't complete verification. Try again." 等亦是同構的英文-`{}`-ASCII 組合，長期在掃描面外）；人工覆核新文案的語氣、`Couldn't X. Try again.` 句式與既有錯誤/清除文案一致，未發現偏離。此為誠實記錄的邊界，非本單引入的新缺口，不構成缺陷。

## 3. 清除徹底性：Rust 親跑 + mutation

- `cd src-tauri && cargo test`：**71 passed; 0 failed**（含本單新增 `clear_deletes_current_and_all_legacy_keychain_entries`、`clear_stops_on_keychain_failure_instead_of_reporting_success` 兩例，均 `ok`）。刪除目標精確為 `CREDENTIAL_ACCOUNT="credential"`（現行）+ `LEGACY_SOURCE_ACCOUNT="active-source"` + `LEGACY_SECRET_ACCOUNT="provider-secret"`（兩個 legacy）。
- Mutation C（漏刪兩個 legacy，迴圈只留 `CREDENTIAL_ACCOUNT`）：`cargo test clear_` → **2 failed**（`remaining.is_empty()` 斷言失敗；`deleted` 集合不含 legacy 兩項）。撤銷後複核 **71/71**。
- Mutation D（吞錯繼續刪，恆回 `Ok`——`let _ = delete(account);` 取代 `delete(account)?;`）：`cargo test clear_` → **1 passed / 1 failed**：「全刪」例仍綠（三帳號確實都被訪問），但「失敗須停且不得偽報成功」例確定性紅（`matches!(result, Err(AuthFailed))` 失敗）——精確證明兩例分別鎖住「刪全」與「錯即停、不偽報」兩條獨立語義，缺一不可。撤銷後複核 **71/71**，`git diff --stat -- src-tauri/src/lib.rs` 核對回空。
- 「清除後啟動回未配置態」交叉覈實（非只信 stub）：`clear_provider_credential` 成功路徑呼叫 `set_verified_provider(None)`（撤銷行程內 verified 快取）後回傳 `unverified_readiness(&pending())`；`pending()` 之 `phase:"pending"` 經 `credential_readiness()`／`unverified_readiness()` 精確映射為 `{credential:{phase:"absent"}, connection:{phase:"unverified"}}`——非幽靈 `ready`，源碼層面即成立，非僅 e2e stub 巧合。委託 `key-persist.spec.ts` 第二例（清除 e2e）本輪亦在第 1/5 節的完整鏈與 residue 前多次獨立重跑中持續綠。
- 邊界複核（如實記錄，非缺陷）：`grep LEGACY_*_ACCOUNT src-tauri/src/lib.rs` 確認兩個 legacy 帳號**只作為刪除目標出現，全程序零讀取／零消費**（無任何 `get_password`/等價讀路徑引用它們）；且既有（非本單）`save_provider_credential` 尾段本就對兩個 legacy 帳號做「靜默盡力刪除、失敗只 trace 不阻塞」的補償清理（註解：「殘留舊條目由下次 save/clear 再清」）。因此 `clear_all_credential_accounts` 「錯即停」在極端交錯失敗下即便某 legacy 條目一次未清乾淨，也不構成幽靈可用憑證（該條目從未被任何讀路徑消費），且下次 save 會再嘗試一次——確認此為合理設計而非需求 5 條件下的「小缺陷」。

## 4. 不變量 8 核真（靜態門六類反例逐一覈真）

於 `assert-credential-contracts.mjs`（baseline 先確認 `exit 0`）逐一注入、觀察紅、撤除、複核綠，`git diff --stat` 每次撤除後歸零：

| # | 注入反例 | 觸發訊息 | 結果 |
|---|---|---|---|
| 1 | `credentials/client.ts` `status()` 內加 `window.localStorage.setItem(...)` | `前端凭证链禁止 localStorage` | exit 1 → 撤銷後 exit 0 |
| 2 | `connection-client.ts` `validate()` 內加 `console.log('probe readiness', readiness)` | `前端凭证链禁止 console.log` | exit 1 → 撤銷後 exit 0 |
| 3 | `credentials/client.ts` `setStatus` 的 `CustomEvent` 加 `{ detail: status }` | `凭证事件不得携带 detail/secret` | exit 1 → 撤銷後 exit 0 |
| 4 | `status()` 復原歷史洩漏模式：直接讀 `window.__CW_FORCE_CREDENTIAL__` | `生产 credential status 不得直读 E2E window seed` + `credential E2E seed 属性读取必须恰好一个` | 同時觸發兩條 exit 1 → 撤銷後 exit 0 |
| 5 | `credentialClient` 新增 `readSecretForDebug()` 呼叫 `invoke('read_credential_secret')` | `WebView 不得新增凭证明文读取命令` | exit 1 → 撤銷後 exit 0 |
| 6 | `App.tsx` 啟動接線內加一行文字上符合 `credential.phase === 'stored'` 後 160 字元內接 `connection:{phase:'ready'}` 的樂觀提升 | `启动恢复不得把 stored 直接乐观提升为 ready` | exit 1 → 撤銷後 exit 0 |

反例 4 精確復現本單 SPEC 偵察結論所述的歷史洩漏形狀（`readForcedProbe()` 直讀模式），證明本單新增的兩條門（生產路徑零直讀 + 讀取點恰好一次）確實鎖住了它修復的那個具體漏洞，非空文檢查。六項全數撤除後，`node scripts/assert-credential-contracts.mjs` 複核 `exit 0`，訊息「AUDIT-SEAL-2 + KEY-PERSIST-1 credential persistence/security boundaries passed」。

**bundle 零明文覈真**：`pnpm --filter @courtwork/desktop build` 全新產出後，對 `dist/**` grep `__CW_FORCE_CREDENTIAL__`／`__courtworkCredentials`／`__courtworkProviderConnection`／測試假鑰 `cw-valid-secret-key`／`VITE_COURTWORK_E2E`／`installCredentialTestHooks`／`installProviderConnectionTestHooks`：**全部零命中**（Vite 對 `import.meta.env.DEV` 常量分支死碼消除生效，測試樁鏈路徑不可達 production bundle）。額外防禦性 grep `sk-[A-Za-z0-9]{8,}`／`Bearer` 命中僅為 `risk-`／`mask-image` 等業務詞彙的規則巧合（非金鑰），以及一段既有的**脫敏規則陣列**（`fB=[/sk-.../,/Bearer.../,...]`，用於日誌/診斷淨化，屬保護機制本身而非洩漏）——均非缺陷。

**SEAL-2 雙門不回退覈真**：`git diff 8621c75^ 8621c75 -- apps/desktop/scripts/assert-credential-contracts.mjs` 顯示本單對既有「credential/providerConnection 兩 hook 雙門」檢查區塊（`hookNames`/`guardBody` 一段，line 16–49）**零改動**，唯一變動是把兩個 `readFile` 合併為 `Promise.all`（純機械等價，同名變數同值）；本輪完整鏈與本節六反例均在同一次腳本執行內驗證，雙門邏輯與本單新增邏輯共存互不削弱。

## 5. 全量門（合併樹）

`main` 於驗收全程停留 `bded9ac`（`git fetch` 二次核對），故下表即「rebase 至 main 尖端」後的結果：

| 門 | 獨立實跑結果 |
|---|---|
| `pnpm -r build` | PASS；13/14 workspace（`services/ingest` 為 Python，非 pnpm 專案，符合既有基線）；desktop production Vite 3578 modules，僅既有 chunk-size advisory |
| `pnpm lint` | PASS（`eslint .` 零輸出） |
| 根 Vitest | `pnpm test` → **148 files / 1261 tests passed**（10.00s） |
| cargo | `cargo test`（`src-tauri`）→ **71 passed; 0 failed**（含本單兩新例） |
| 完整 `test:e2e`，埠 `19831` | 26 道靜態/設計/邊界門全綠（含 `assert-credential-contracts.mjs` 與 `assert-rp29-contracts.mjs` 的條件式冷啟動檢查）；`文案门通过：扫描 116 个 UI 源文件`；`Playwright 假绿防护通过：292 条用例（下限 292）`；Playwright **292/292 passed**（2.7m） |
| residue 單 worker 三輪，埠 `19835/19836/19837` | 各 **22/22**（43.7s / 43.5s / 43.8s），含門禁自證三例（不清 portal／不還 focus／不停動畫均必紅） |
| demo golden | `demo:s3`：**PASS**，`redline.docx` 39,651 bytes、7/7 考點命中、golden 骨架比對一致；`demo:legal`：**PASS**，`redline.docx` 4,606 bytes、11/11 錨點、六段標記與修訂命中全符 |

floor 註記核對：`assert-test-count.mjs` 註解鏈precisely 記錄 `290 → 292`（本單 `+2` 對應委託之新增兩條 e2e：跨 reload 自動恢復 ready + Settings 顯式清除/零前端殘留），與腳本內 `const minimum = 292;` 及實跑「下限 292」訊息一致，無漂移。

## 6. 真機復驗清單（SPEC 覈實，歸產品負責人；本單不執行）

`apps/desktop/SPEC.md` 的 `KEY-PERSIST-1` 節「產品負責人真機復驗清單」現有四項：①真實 DeepSeek 驗證＋完全退出重啟免重輸；②保留 key、斷網重啟＋恢復網路重試；③`Clear saved credential`＋完全退出重啟仍不得幽靈 ready，並用「鑰匙串訪問」核對現行與兩個 legacy 條目均不存在；④WebView console／`credential-probe.log`（僅顯式開 trace 時）／診斷匯出零金鑰明文。

**發現一項登記缺口**：委託動作第 6 點明確點名「重啟免重輸／清除後重輸／**鎖屏喚醒**」三徑，但親自覈對 SPEC 全文（`grep -n "锁屏\|唤醒\|睡眠\|sleep" apps/desktop/SPEC.md` 零命中）確認**鎖屏喚醒路徑未被登記**於上述四項真機清單中。此路徑與①③已覆蓋的「完全退出＋冷啟動」在系統行為上不同——macOS 鑰匙串的解鎖狀態與螢幕鎖定/喚醒週期、登入鑰匙串的閒置自動鎖定策略相關，冷啟動測試無法覆蓋「進程不重啟、僅螢幕鎖定再喚醒後首次 probe/送出」這一路徑是否會被瞬時誤判為 `failed`（進而依第 2 節已驗證的語義正確顯示失敗態，但若使用者頻繁鎖屏喚醒可能造成不必要的重複驗證觀感）。

此為**登記缺口，非代碼缺陷**——本單自動化與本報告第 1–5 節的紅證/mutation 覆蓋範圍不涉及螢幕鎖定/喚醒系統事件，無法也不應由自動化 e2e 代為斷言；不阻塞本單放行，但建議產品負責人在執行真機清單前，將「鎖屏喚醒後首次 probe 行為」補為清單第五項（或經架構明確裁定「歸入①③範圍，不需獨立項」並留痕），避免真機試點台賬遺漏此徑。

## 7. 不越界覈真

`git diff bded9ac 8621c75 --stat`：恰 11 個檔案，全部落在 `apps/desktop/{SPEC.md,scripts/assert-credential-contracts.mjs,scripts/assert-rp29-contracts.mjs,scripts/assert-test-count.mjs,src-tauri/src/lib.rs,src/App.tsx,src/credentials/client.ts,src/provider/connection-client.ts,src/provider/connection-client.test.ts,src/settings/SettingsPage.tsx,tests/e2e/key-persist.spec.ts}`；零 `packages/**`、零 `docs/status/current.md`、零其他 app/服務改動。`src-tauri/src/lib.rs` 改動精確為新增一個可測試核心函式 `clear_all_credential_accounts` 並讓既有 `clear_provider_credential` 消費它（零新 crate、零 `Cargo.lock` 變動、零持久格式變更）；`assert-rp29-contracts.mjs` 改動把「冷啟動零 probe」的斷言從無條件改為「非 stored 時仍零 probe」，未放寬既有 RP-2.9 語義。

**最終判定：KEY-PERSIST-1 放行 ✅。** 六項委託驗收動作（紅證復刻、probe 語義、清除徹底性、不變量 8、全量門、真機清單覈實）逐一亲手覈真，均通過或如實登記邊界；第 6 節發現的「鎖屏喚醒」登記缺口留待產品負責人在真機試點前定奪，不影響本單工程面放行。本會話未修改任何委託實現代碼（僅臨時 mutation 並全部撤除復核），未更新 `docs/status/current.md`，未推送，未 prune。

---

# ACCEPTANCE: CHAT-MD-TABLE-1

日期：2026-07-18；對象：`impl/chat-md-table-1 @ 4ee17b3`（單提交，基線 `main @ cc90bf0`）。獨立 clean worktree（`git worktree add .claude/worktrees/accept-chat-md-table-1`，未在共享樹 checkout/stash）；`git rebase main` 後 tip `6d0d128`。驗收啟動時 `main` 已由 `6ec7067`（工單委託時的「現尖端」）前進一枚並發文檔提交至 `fe7687a`（`docs: SITE-CRAFT-2 字體策略修訂`，僅動 `docs/design/*`，與本單零重疊）；rebase 落點即 `fe7687a`，如實記錄此漂移非本單引入。另建合併驗收樹 `.claude/worktrees/accept-chat-table-case-title-1`（見全量門一節）與 `CASE-TITLE-CONVERGE-1` 並票驗收。

**裁決：✅ 放行 CHAT-MD-TABLE-1。**

## 1. 紅證復刻（stash 隔離雙層）

- Unit 層：`git checkout HEAD~1 -- src/chat/ChatMarkdown.tsx src/styles.css`（僅退兩個實現檔，測試檔不動），跑 `vitest run src/chat/chat-markdown.test.ts`：**7 failed / 12 passed（19 例）**，精確命中：合法表格三態（基礎/對齊/免首尾豎線）、表格不吞尾段、歧義數據行止步、hr 兩態（獨占行/緊鄰段落）共 7 例；其餘畸形降級例（分隔行缺失/列數不符/非法語法）與圍欄回歸例確定性維持綠——證實「其餘一律降級回段落」是既有安全默認，非本單引入。`git checkout HEAD -- <同兩檔>` 復原後 **19/19 passed**。
  - 誠實記錄一項 SPEC 敘述小瑕疵：SPEC.md 把「數據行列數歧義止步」歸入「實現前即已通過」一類，但親自追蹤代碼與實跑均證實該例屬 7 紅之一（無表格邏輯時整段合併為單段落，形狀與「表格+段落」雙塊期望不符）。計數（7）與覆蓋面本身無誤，僅分類敘述不精確，不構成缺陷，附此存證。
- E2E 層：同樣退回兩實現檔，隔離埠 `14301` 跑 `playwright test chat-markdown.spec.ts pilot-reply-fold.spec.ts --project=app`：**3 failed / 4 passed**，精確命中「合法管道表格渲染」「--- 渲染為 hr」「歷史折疊塊界對齊」——第三例確定性紅在新增的 `isTableBlock` 斷言（`expect(intact.isTableBlock).toBe(true)` 失敗），實證該斷言依賴本單新結構塊，非泛匹配巧合通過的空斷言。畸形表格降級 e2e 例維持綠（既有兜底）。復原兩檔後 **7/7 passed**。
  - 過程瑕疵如實記錄：本節第二次退回（e2e 復刻）後，驗收會話一度遺漏及時復原，被後續「畸形降級反例親跑」子任務的非預期全紅意外測出（詳見第 2 節）；隨即以 `git checkout HEAD -- <兩檔>` 補正，`git status`/`git diff --stat` 復核歸零，未污染任何裁決依據。

## 2. 畸形降級反例親跑（自擬 ragged 輸入，非既有測試集）

在 `src/chat/` 下臨時新增驗收自寫用例（驗證後即 `rm`，`git status` 復核零殘留），覆蓋既有 14 例未觸及的角度：

| 反例 | 輸入特徵 | 斷言 | 結果 |
|---|---|---|---|
| 數據行列數「多於」表頭 | 3 格行插入 2 列表格中段 | 表格止步收 1 行，超列行連同其後內容逐字節回段落，零截斷 | PASS |
| 連續 ragged（3列/1列/4列交替） | 表格後接三種不同錯列行 | 表格只收合法首行，其後三行原樣進同一段落 | PASS |
| 分隔行部分格合法部分格非法 | `\| --- \| 不合法 \| :---: \|` | 一格非法即整行判非法分隔行，不做部分採用 | PASS |
| 單列表格（基數邊界） | 表頭/分隔/數據行均 1 列 | 仍正確識別為合法表格，不因列數=1 特殊化 | PASS |
| 表格止步後列數「巧合」再次相符 | 止步後再現 2 列行 | 不被誤重啟為原表延續（止步永久，非逐行重判入原表） | PASS |

5/5 全通過，經驗證「零猜測補全」（不填不裁）在自擬輸入下同樣成立，非僅覆蓋實現者自選的既有例。

## 3. hr / Setext 邊界

`isHrLine` 僅識別獨占一行的 `-{3,}`，不識別 Setext 標題下劃線語義；既有測試「緊跟段落無空行：--- 仍獨立成 hr 塊（不支持 Setext 標題語法，不猜測意圖）」在第 1 節紅證中確認為 7 紅之一（真實依賴實現，非平凡斷言）。獨立複核代碼路徑：`isBlockBoundary` 對 hr 行的判定與段落止步條件共用同一分支，無特殊路徑把 hr 前一行升格標題，邏輯與斷言一致。

## 4. CSS 中性色門 + 缺口清點範圍核真

- `node scripts/assert-neutral-source.mjs` 獨立實跑（非管道吞退出碼，顯式 `echo $?`）：**exit 0**，`tokens 中性組 24 值冷調同源；src 177 文件全部色值 ∈ tokens 聲明集；廢除族零回流`。CSS diff（`.md-table-wrap`/`.md-table`/`.md-hr`）逐行核對，僅 `var(--*)` 引用，零字面 hex/rgb。
- 缺口清點越權掃描：`grep -nE "blockquote|'>'|\[.*\]\(.*\)|~~|task.?list|\\\\\\*|strikethrough"` 對 `ChatMarkdown.tsx` 僅命中既有 `**加重**` 正則本身，10 項清點條目（嵌套列表/列表內代碼/引用塊/鏈接/自動鏈接/單星號斜體/刪除線/任務清單/轉義字符）均零代碼痕跡——確證「只清點不實現」。
- SPEC 缺口清點三項敘述性 claim 抽核（自擬 vitest 用例，驗證後即刪）：嵌套列表拍平（`- 甲\n  - 甲子\n  - 甲丑\n- 乙` → 單層 4 項）、單星號斜體不識別（星號原樣可見）、引用塊不識別（`>` 原樣可見）——**3/3 與 SPEC 敘述一致**，確證缺口清點是實測而非臆測。

## 5. 全量門（合併樹）

見文末共享章節「CHAT-MD-TABLE-1 + CASE-TITLE-CONVERGE-1 合併全量門」。

## 6. 不越界核真

`git diff HEAD~1 HEAD --stat`（rebase 後）與委託前原始 `git show --stat 4ee17b3` 逐行相同（7 檔，363 insertions/12 deletions）：`SPEC.md`/`assert-test-count.mjs`/`ChatMarkdown.tsx`/`chat-markdown.test.ts`/`styles.css`/`chat-markdown.spec.ts`/`pilot-reply-fold.spec.ts`。零 `packages/**`、零 `src-tauri`、零 `docs/status/current.md` 改動，rebase 未引入內容漂移。

**最終判定：CHAT-MD-TABLE-1 放行 ✅。** 五項委託驗收動作（雙層紅證復刻、畸形反例親跑、hr/Setext 邊界、CSS 中性色門+缺口清點範圍、全量門+不越界）逐一親手覈真，全部通過；第 1 節記錄一項 SPEC 敘述分類小瑕疵（不影響計數與覆蓋面判定），第 1 節另記錄驗收自身操作一次遺漏復原並已補正，均不構成駁回理由。

---

# ACCEPTANCE: CASE-TITLE-CONVERGE-1

日期：2026-07-18；對象：`impl/case-title-converge-1 @ b72d174`（單提交，基線 `main @ af46ef3`）。獨立 clean worktree（`git worktree add .claude/worktrees/accept-case-title-converge-1`）；`git rebase main` 後 tip `5b5750c`，落點同上 `fe7687a`（並發只升點，見 CHAT-MD-TABLE-1 條目開篇說明）。另建合併驗收樹與 `CHAT-MD-TABLE-1` 並票驗收。

**裁決：✅ 放行 CASE-TITLE-CONVERGE-1。**

## 1. 遷移紅證 + 寫新層先於刪舊鍵順序核真

- Unit 層：`git checkout HEAD~1 -- src/case/case-store.ts` 退實現檔，跑 `vitest run src/case/case-store.test.ts`：**1 failed / 18 passed（19 例）**，精確命中新增的正向遷移例（`readCaseList` 未吸收舊鍵，title 停留列表原值）；fail-closed 例（未知版本列表）確定性維持綠（舊代碼本就不觸碰舊鍵，天然安全）。復原後 **19/19 passed**。
- E2E 層：同時退 `case-store.ts` + `App.tsx`，隔離埠 `14302` 跑 `case-persist.spec.ts` 全檔（含既有 CASE-PERSIST-1 三例）：**1 failed / 4 passed**，唯一紅為新增遷移正向例（`case-card` 停留列表舊標題「列表中的旧标题」而非舊鍵最新值「退出前最后改名」）；既有三例（三層重建/失效 grant/demo 恒挂歸檔對稱）**全綠**——初步證實既有斷言不回退。復原後 **5/5 passed**。
- 順序靜態門逆向注入（`assert-host-auth-contracts.mjs` 對 `writeCaseList(...)` 早於 `removeItem(...)` 的文本序斷言）：手術交換 `readCaseList` 內兩條語句順序（先刪後寫），`node scripts/assert-host-auth-contracts.mjs`（顯式 `echo $?`，不經管道吞退出碼）：**exit 1**，`旧 title 必须先写回 case-list.v1 再删除旧键`；撤銷交換後複核 **exit 0**，`git diff --stat` 歸零。確證該門並非空文本掃描，確實鎖住「先寫後刪」這一崩潰安全序，能攔住把序反轉的迴歸。
  - 如實記錄門的機制邊界：此為原始碼文本序正則斷言（非運行期故障注入的行為級證明），對本單「兩條件語句無條件順序執行」的簡單形狀是恰當且足夠的鎖定手段（house style 既有先例，如 `webkitdirectory` 退役門同構）；但它不覆蓋「`writeCaseList` 內部半寫崩潰」等更細粒度的故障窗口——該層由 `localStorage.setItem` 平台原子性承接，非本單引入的新假設，不在本單覈真範圍內另行擴大。

## 2. fail-closed 反例親跑 + 零寫入靜態門獨立覈真

- `case-store.test.ts` 內建 fail-closed 例（`case-list.v1` 為未知 version 999）親跑：`readCaseList` 返回 `[]`；`getItem` 呼叫序透過 spy 確認**僅** `[CASE_LIST_STORAGE_KEY]`（舊鍵從未被讀取）；`backend.map.get(legacyKey)` 停留原值「不得复活的旧标题」（未被消費也未被刪除）。此例在第 1 節單元紅證中確認屬「實現前即已通過」的 18 例之一（舊代碼本就不觸碰舊鍵，語義上是「巧合安全」而非本單新斷言目標）——如實記錄：本例的價值是**鎖定新代碼不得引入舊鍵讀取的迴歸**，而非證明本單新增了 fail-closed 行為（該行為在 `loadCaseList` 層本就既有）。
- 生產源碼零寫入命中：手術於 `App.tsx` 插入含字面量 `courtwork.case-title.` 的臨時探針行，`node scripts/assert-host-auth-contracts.mjs`：**exit 1**，`旧 title 键不得在迁移边界外被生产源码读取或写入（命中 src/App.tsx）`；撤除後複核 **exit 0**。
- 獨立 `rg` 交叉核（不依賴腳本內部邏輯，另起爐灶驗證同一結論）：`rg -n "case-title\." apps/desktop/src --glob '!*.test.ts' --glob '!tests/**'` **僅一處命中**：`case-store.ts:27`（遷移前綴常量宣告本身，即遷移邊界）。零其他生產源碼命中。

## 3. CASE-PERSIST 既有斷言不回退 + demo 標題行為變更的裁定

- 第 1 節 e2e 復刻已證：`case-persist.spec.ts` 既有三例（三層重建/失效 grant 顯式態/demo 恆掛歸檔對稱）在实现復原前後均為綠，非本單觸碰面。
- `rp2.spec.ts` 一例斷言文字被本單修改：舊斷言「案件頭…可編輯持久化」期望 demo 案改名後 reload 仍顯示新標題；本單改為「demo 改名不越過 case-list 持久邊界」，reload 後回固定樣板標題。**裁定：此非既有斷言回退，而是修正一項與 `CASE-PERSIST-1` 自身 SPEC 明文矛盾的舊斷言**——`CASE-PERSIST-1 SPEC.md`（`apps/desktop/SPEC.md:460`）明文「demo 雙向隔離：demo 恆掛案永不入持久（`projectPersistableCases` 剔除 `isDemo`），重載後仍由 App 固定注入 DEMO_CASE 呈現（非來自持久層）」。舊實現能讓 demo 標題「看似持久」，根源是舊版 `courtwork.case-title.${id}` 单键旁路寫入不分辨 `isDemo`，繞過了 `case-list.v1` 的 demo 剔除投影——`CASE-PERSIST-1` 自身 SPEC 複雜度掃描提案區（`apps/desktop/SPEC.md:471`）已明確登記此「雙持久輕重疊」為已知偶然複雜度並標註 `[需架構拍板]`，本單正是該登記項的後續收斂，非新引入的行為變更。獨立親跑 `rp2.spec.ts` 全檔：**6/6 passed**（含被改動的該例）。

## 4. 全量門（合併樹）

見文末共享章節「CHAT-MD-TABLE-1 + CASE-TITLE-CONVERGE-1 合併全量門」。

## 5. 不越界核真

`git diff HEAD~1 HEAD --stat`（rebase 後）與委託前原始 `git show --stat b72d174` 逐行相同（8 檔，175 insertions/13 deletions）：`SPEC.md`/`assert-host-auth-contracts.mjs`/`assert-test-count.mjs`/`App.tsx`/`case-store.test.ts`/`case-store.ts`/`case-persist.spec.ts`/`rp2.spec.ts`。零 `packages/**`、零 `src-tauri`、零 `docs/status/current.md`、零 schema/core/provider 改動，rebase 未引入內容漂移。`PersistedCase` 字段/語義未變，未碰 grant/MaterialStore/Work journal。

**最終判定：CASE-TITLE-CONVERGE-1 放行 ✅。** 四項委託驗收動作（遷移紅證+順序核真、fail-closed 反例+零寫入靜態門、CASE-PERSIST 既有斷言不回退、全量門+不越界）逐一親手覈真，全部通過；第 3 節就 `rp2.spec.ts` 一例斷言變更給出明確裁定（修正矛盾舊斷言，非回退），有 `CASE-PERSIST-1` SPEC 原文與其自身登記的複雜度提案區為證，不構成駁回理由。

---

# 共享章節：CHAT-MD-TABLE-1 + CASE-TITLE-CONVERGE-1 合併全量門

兩單為並發只升點分支（分別基線 `cc90bf0`/`af46ef3`，均已 rebase 至 main 尖端 `fe7687a`），依委託要求另建合併驗收樹 `.claude/worktrees/accept-chat-table-case-title-1`（`git worktree add ... main` → `git merge --no-ff accept/chat-md-table-1` → `git merge --no-ff accept/case-title-converge-1`）取真實並集驗證。合併衝突僅兩處：`SPEC.md`（兩節順序拼接，零內容丟失）、`assert-test-count.mjs`（floor 手術取並集 `292+3+2=297`，並以 `playwright test --list` 親數核實 **`Total: 297 tests in 54 files`**，與算術並集精確相符，非假設）。`assert-host-auth-contracts.mjs` 無衝突自動合併。合併提交 `b2a1210`。

| 門 | 結果 |
|---|---|
| `pnpm -r build` | PASS（14 workspace projects，含 desktop `tsc -b && vite build`） |
| `pnpm lint`（eslint） | PASS，零告警 |
| 根 `pnpm test` | **148 files / 1261 tests passed**（packages+eval，兩單均未觸碰，逐字節零回退） |
| desktop `pnpm test`（vitest） | **59 files / 371 tests passed**（355 既有基線 + 14 CHAT-MD-TABLE-1 + 2 CASE-TITLE-CONVERGE-1，精確並集） |
| demo golden | `demo:legal`：PASS（骨架/考點/錨點復算/六段標記/修訂命中全符，`redline.docx` 4,606 bytes）；`demo:s3`：PASS（golden 骨架比對一致，7/7 考點命中，`redline.docx` 39,651 bytes） |
| 完整 `test:e2e`，埠 `14303` | 30 道靜態/設計/邊界門全數 `OK`/`通过`/`passed`（含中性色單源律「24 值冷調同源；177 文件全數 ∈ tokens 聲明集」、文案門「掃描 116 個 UI 源文件，無裸確認詞/成功自評/工程詞洩漏」、`AUDIT-SEAL-2+KEY-PERSIST-1`/`VIEW-ABI`(12/12)/`WORK-PORT-1`/`VISUAL-KIT`/`HOST-AUTH-LITE`/`MATERIAL-INGRESS-1`/`LEGAL-S3-BINDING-1`/`UI-SURFACE-1`/`WORK-LIVE-1`/`LAYOUT-CONVERGE-1`/RP-2.6~2.11 等全部邊界檢查通過）；`Playwright 假绿防护通过：297 条用例（下限 297）`；Playwright 實跑 **297/297 passed（2.7m，1 worker，0 flake）**，`app`(275)/`residue`(22) 兩 project 全含 |
| residue 額外兩輪覆核，埠 `14304`/`14305` | 各 **22/22 passed**（43.9s / 45.1s），含門禁自證三例（不清 portal／不還 focus／不停動畫均必紅）——連同第一輪合計三輪 22/22/22，零 flake |

floor 註記核對：`assert-test-count.mjs` 注釋鏈為兩單並發只升點的合併寫法（跟隨既有 `READER 與 PILOT-LIVE-2 並發只升點` 先例句式），`const minimum = 297;` 與實跑 `--list` 總數逐位元組相符，無漂移。

**合併樹本身的驗收範圍聲明**：本合併樹僅用於取得兩單真實並集下的全量門結果，其產生的合併提交 `b2a1210` 不代表任何新工單的實現，不單獨放行/駁回；兩單的裁決分別見上方各自條目。

---

# ACCEPTANCE: SKIN-B2-1 · 排印置換批

日期：2026-07-19；對象：`impl/skin-b2-1 @ 88aba1a30323cf47449b31d3432b60be98309f02`（`d59e9dd → 9196a07 → 88aba1a`），原基線 `2401e47`。本會話以 `git clone --local` 建立獨立乾淨驗收樹，未在共享樹 checkout、未改實作、未推送。另以 `main @ 15049cd0a410d56a4624c10a92ed35b617529a60` 進行 trial merge：`git merge-tree --write-tree` 為 exit 0，合併樹 `b6ad28acb565cb44e9bcf555af7b467a03e5ad60`，衝突數 **0**；再以獨立暫存 clone 落地 `--no-commit --no-ff` 合併態實跑。

**裁決：✅ 放行 SKIN-B2-1。**

## 1. 置換清單與別名契約（紅證親手重放）

- 原基線在清空 `PENDING_MIGRATION` 的只讀記憶體探針下，精確轉紅兩條：`src/styles.css` 的 Songti 原型棧與 `src/icons/icon-audit.css` 的 UI 基棧；將兩條舊清單帶回即綠。候選 `88aba1a` 的空清單下全域掃描為 **0**，完成「清單即進度條」閉合。
- 三件 `@font-face` 與 `subset-manifest.json` 逐件對上（朱雀 400、思源 SC 400、思源 SC 600，且每件 `src` 指向正確 woff2）。把 400 的 CSS 別名改回內名 `Source Han Serif CN`，門報缺 SC/400；刪除 SemiBold 的獨立 600 face，門報缺 SC/600。兩個靜默系統衬線穿透陷阱均確實轉紅。

## 2. 真渲、光學與改寫斷言

獨立埠 `15478` 跑 `typography-consume`、`typography`、`rp23-responsive`：**12/12 passed**。另以瀏覽器計算態探針重放：文書為 **16px / 28px (=1.75)**、章節題 **400**、welcome **600**；三 face 的 `document.fonts.check` 全 true；整個文書字棧十數字均為 10px，朱雀單體陰性對照為 7.08–10.66px，確證 Times 配衬確實接手。

- `text-autospace: normal`：232.91px → **236.91px（+4px）**；偽值陰性對照仍為 232.91px。
- `text-spacing-trim`：base / `trim-start` / `trim-both` / `space-all` 皆為 **232.91px**，拒裝依據成立。
- `CSS.supports('hanging-punctuation','allow-end') === false`；SPEC/證據已將 WebKit 真機效果列為待真機清單，未把引擎限制冒充已驗。
- RP-2.9：候選為零裸衬線 consumer；記憶體注入 `font-family: Georgia, "Songti SC", serif` 後 raw 與 stray 各命中 1，確實轉紅。RP-2.3 1440px 關係斷言實跑（文書 computed 值關聯 :root 的 document track，非硬編碼空轉）通過；`typography.spec.ts` 亦確認預熱只將真實 `var(--font-*)` 元素放入渲染樹，零 `new FontFace` 手工注入。

## 3. 紅線與原基線全量門

`2401e47..88aba1a` 核對：`docs/design/tokens.json`、`docs/status/current.md`、所有 `apps/desktop/src/**/*.tsx` 均為零 diff；`styles.css` 零新增/刪除 raw hex/rgb/hsl 色值。前後四張文書證據圖人工比對，確認朱雀正文、思源章題與 Times 拉丁數字均上身，深宗只讀探針沒有改變字軌。

| 門 | 結果 |
|---|---|
| `pnpm -r build` | PASS |
| `pnpm lint` | PASS |
| 根 `pnpm test` | **148 files / 1261 tests passed** |
| `assert-typography` / RP-2.9 / test floor | PASS；floor **305** |
| `site:guard` | **52/52** PASS |
| 完整 `pnpm test:e2e`（獨立埠 15480） | 靜態鏈全綠，**305/305 passed（3.7m）** |

## 4. main 合併態實跑

在 trial merge 暫存 clone（未提交）中：`pnpm install --offline --frozen-lockfile`、`pnpm -r build`、`pnpm site:guard` 全通過；site 靜態測試 **52/52**。合併態 `assert-typography` 和 305-floor 均綠；獨立埠 `15481` 跑真渲四軌譜 **4/4 passed**（文書 16/1.75、三件別名、數字齊寬、光學與 hanging 掛賬）。故 `main @ 15049cd` 與本批不存在可觀測的合併態回退。

本會話僅追加此驗收紀錄；未部署，亦未將視覺終審或 Pages 驗收冒充為本單已完成。

---

# ACCEPTANCE: SKIN-B3 · 線級批

日期：2026-07-19；對象：`impl/skin-b3 @ 7390d32328387e6dbcfeeb94d126439f809f9e78`（rebase 後唯一有效五提交鏈），基線 `b6c6bb19b89020a6d90ff47595ed9e7ec18bad2d`。以 `git clone --local` 建立獨立乾淨驗收樹；基線祖先檢查 exit 0。未改實作、未推送。

**裁決：✅ 放行 SKIN-B3。**

## 1. 三分類帳與線級真渲

`assert-rule-grammar` 直跑 exit 0：主界 **8**、次界 **105**、具名不換 **71**，合計 **186**，與 rebase 後 SPEC 對版。三項「答不出即不換」實物親讀：`.composer-shell` 是輸入控件外殼、`.utility-dock-popover` 是浮面描邊、`.reader-focus-anchor` 是藍色溯源語義線，均不承載層級語法，保持不換合理。

只讀記憶體 CSS probe 忠實重放門邏輯：主界 token 改 3px → `drift:major`；次界改 4px → `drift:minor` + 層級倒置；刪 `.scene-strip/.rail-user-wrap::after` → 兩條 `missing-hair`；`.dense-row` 回退字面 1px → 次界未按名消費；新增裸線 → 未分類；重宣告 `--rule-minor` → 線寬隨宗改寫；細線塞 gradient → 兩條越界畫法。另向動效門注入 `transition: border-width`，確實報 `border-width`。

瀏覽器計算態（獨立埠）為主 2px／細 1px／gap 2px。頁面臨時覆蓋將主界降到 1px 時「主 > 次」關係轉紅；把 `::after` 細線覆蓋為 0px 時「細線存在」轉紅。此為靜態七類以外的第九類運行態雙紅，非文字掃描重述。主界文武線光柵以證據圖的全行掃描自動定位（不預設 y）重放：before 單暗行 y=88（219）；after 自動配對為 y=84 暗 1（204）／y=85–86 亮 2（244）／y=87–88 暗 2（204）。

## 2. 值面追認、rebase 與不越界

8 條主界全部按名消費 `--rule-ink`；其中 `.gallery-header` 遷移前已是 `--border-strong`，故僅其餘 7 條有渲染線色位移。已親讀 SPEC 的架構追認理由：`rule.ink` 的既定定值即較深描邊槽，若主界不消費它則 B0 token 無落點；本批零 hex 編輯、`tokens.json` 零值 diff。B3 節內 `[需架构拍板]` 僅出現在明確「已銷號」的歷史記錄，無待決殘留。

rebase 後 B2-1 亦重跑：`assert-typography` 綠，真渲四軌（文書 16/1.75、三件別名、數字配衬、光學陰性對照）**4/4 passed**。線級解析器排除 `@font-face` 體，三 face 仍由排印門逐件驗證；`assert-test-count` 位於鏈尾，`playwright --list` 親數 **307 tests in 57 files**（floor 307）。

`b6c6bb1..7390d32` 僅有 CSS、門、測試、SPEC、B3 證據與 package 鏈變更：零 `.tsx`、零 `tokens.json`、零 `docs/status/current.md`、零記號／深色面。`merge-tree --write-tree 7390d32 main`（main=`b6c6bb1`）exit 0，衝突數 **0**。

## 3. 前後證據與全量門

before=`main@b6c6bb1`、after=`7390d32`，同為 B2-1 字體條件（`:root` 字棧逐字相同）。獨立兩服務測得 bounding rect：`.workspace`、`.case-rail`、`.conversation`、`.right-workbench`、`.composer-stack` 全為 `[0,0,0,0]`；`.scene-strip` 僅 `[0,-1,0,+1]`，`.conversation-scroll` `[0,0,0,-1]`，正好由主界增長 1px 在本列吸收，無外溢。

| 門 | 結果 |
|---|---|
| `pnpm -r build` | PASS |
| `pnpm lint` | PASS |
| 根 `pnpm test` | **148 files / 1261 tests passed** |
| `site:guard` | **52/52** PASS |
| `assert-rule-grammar` / `assert-typography` / floor | PASS；186 分類點／B2 三軌／floor **307** |
| B3 + B2 真渲抽樣（獨立埠 15483） | **6/6 passed** |
| 完整 `pnpm test:e2e`（獨立埠 15489） | 靜態鏈全綠，**307/307 passed（2.8m）** |

本會話只追加此驗收紀錄；未部署，未將後續記號、深色或視覺終審擴入本單。

---

# ACCEPTANCE: SKIN-R2 P0 · DESIGN-CANON-1

日期：2026-07-19；验收对象：`main @ 72787d78c1260c5b0482a6f606918c115cd0c131`（`feat(design): establish SKIN-R2 schema exemplar canon`）。本验收会话从共享仓库以 `git clone --no-local --no-hardlinks` 建立全新独立 clone，detach 检出目标 SHA：`/private/tmp/courtwork-skin-r2-p0-acceptance.IukUet`；未复用共享 Playwright/Vite 服务，未修改实现、契约或门禁，未 push。签署基线 `27990dd` 是目标提交祖先（`merge-base --is-ancestor` exit 0）。

**裁决：✅ 放行 SKIN-R2 P0。**

## 1. 签署投影、裁量例外与收拢边界

- 两份已签提案的封存摘要逐位匹配：P0 proposal SHA-256 为 `5efbb65649198ddc9c9d22b4d40d46e067012360193e15df4afc0a89dc29e5b9`，P1 proposal 为 `ef84049d1cfbd20b8c7ddbcdc8700760b7c58350cbb398a9a398640b57b72423`；P0/P1 两处 `ARCHITECTURE-SIGNATURE.md` 同为 `018b071374fbe38279f7e1097120235329ab6335e9d44b13da102e15c1a7640d`。签署全文、两表及实现证据均已落在 `site/craft-evidence/SKIN-R2-P0/`，不依赖聊天口述。
- `P0-A05` 例外实物核对：完整三档梯度在 `docs/design/principles.md` 首条；`CLAUDE.md` 仅在「工程纪律」有一条设计凡例指针，核心九不变量零增项。平铺 `r2-tier-ledger.json` 每项一档、一个已批提案行，零状态机/通用抽象。
- `P0-A08` 已按产品复裁而非旧文案执行：`typography-density.md` 只保留 C（现行三轨）对 D（全量陌生化），同分取 C；文书朱雀仿宋与拒系统黑体正文仍写为产品定讞、盲测不构成自动授权。
- `docs/design/README.md` 的旧模型派工、具体模型名、已清账入场叙述均已移除；入口只指向 readiness 与新的 `schema-exemplar.md`。`principles.md` 保留 signature-line 指针而不复制白名单；`visualization-kit.md` 与 exemplar 双向分工，未合成第二真源。
- `P0-S08` 迁移有明确且受签 `P0-A11` 约束的解释：签署前 `2ad1f393…12024a50`，现行 `30cf868d…e9970234`，差异仅为 exemplar 互链与 1px 收窄到次界/数据格；primitive、ViewModel、blueprint 语义未变。其余 `P0-S01`–`S07`、`S09` 保持签署值，现行 manifest 对真实来源逐位锁定。
- P0 新增 canon、manifest、ledger、gate 及 P0 SPEC 段落不存在 `archive/` 反向输入；新 `consolidation-survey` 已迁出设计权威目录。`apps/desktop/SPEC.md` 内其他历史工单既有 archive 证据行不属于本批新增内容，也没有被 exemplar/manifest/gate 消费。

## 2. 对真实仓库件的反例注入

每项均在独立 clone 的真实文件上手术、执行 `pnpm --filter @courtwork/desktop lint:schema-exemplar` 观察 exit 1 和定点报错，再原样撤销。最终 `git diff --check`、`git diff --exit-code` 均为 0，门回绿。

| 注入位置 | 实际红证 |
|---|---|
| manifest 移除 `P0-S09` | `正式来源缺项：P0-S09` |
| `P0-S01` SHA 改为全零 | `来源哈希漂移 P0-S01` |
| `P0-S09` 路径改为 `P0-S08` 路径 | `同一路径重复登记权威角色` |
| `P0-S09` 路径改为 `archive/historical-signature-line.md` | `archive 历史材料禁止输入`（并同时报来源缺失） |
| exemplar 追加 JSON schema code fence | `schema exemplar 不得复制 JSON/TypeScript schema` |
| ledger 的 Pages 行清空 tier | `档位账 …#总纲-pages 缺唯一档位` |
| ledger 的同一行清空批准提案 | `档位账 …#总纲-pages 缺已批提案行` |
| derivation 加入 `DecorativeCard` | `未登记 primitive：DecorativeCard` |
| exemplar 声称 `Panels.tsx 当前五列是跨域字段契约` | `Panels 当前列不得成为字段契约` |

这九项覆盖缺来源、错哈希、重复权威、archive/历史输入、复制 JSON/TS schema、漏档位、漏批准提案行、未登记 primitive 与把当前 Panels 列反冻为跨域契约；均不是只跑实现者自带单测。

## 3. 独立全量门

独立 clone 先以 `pnpm install --frozen-lockfile` 安装锁定依赖。首次根 `pnpm test` 在全新 clone 尚未生成 workspace `dist` 时按预期因 package export 不可解析失败；这是构建产物前置缺失，不是测试断言失败。随后完整 `pnpm -r build` 生成各 workspace 产物，重跑测试如下，所有结果均在同一独立 clone 得到：

| 门 | 结果 |
|---|---|
| `pnpm site:guard` | PASS；58/58 Node tests，`deslop` 扫描 846 个现行文本文件，schema-exemplar 5/5 正反例通过 |
| `pnpm lint` | PASS |
| `pnpm -r build` | PASS；13 个具 build 脚本的 workspace 全部完成，desktop `tsc -b && vite build` 通过 |
| 根 `pnpm test`（构建后复跑） | PASS；148 files / 1261 tests |
| `pnpm --filter @courtwork/desktop test` | PASS；59 files / 371 tests |
| `COURTWORK_E2E_PORT=19325 pnpm --filter @courtwork/desktop test:e2e` | PASS；独立端口静态前链（含 schema-exemplar、线级、排印、SchemaParts）全绿，Playwright **311/311** |

P0 零组件、token、布局、schema、scenario、wire 与行为变更，故本批不将浏览器视觉终审冒充为已完成的 P1/P2 证据；其交付是经可注入机器门保护的单一设计谱系与新表衍生入口。后续 P1 消费值仍受精确 1280×720、2400×1000 全帧前置约束，不因本 P0 放行而解除。

---

# ACCEPTANCE: SKIN-R2 P1 · 线级复调

日期：2026-07-19；验收对象：`main @ 434c7fce776145b709d8b5f7c7257901fc8b81af`（`feat(design): retune SKIN-R2 P1 line hierarchy`）。本验收会话从共享仓库以 `git clone --no-local` 建立全新独立 clone，detach 检出目标 SHA：`/private/tmp/courtwork-skin-r2-p1-acceptance.kt8eh9`；未 checkout/stash 共享树，未复用共享 Playwright/Vite 服务，未修改实现文件，未 push。

**裁决：✅ 放行 SKIN-R2 P1。**

## 1. 签署账、迁移值与真实前后帧

- 逐界签署表 SHA-256 实测为 `ef84049d1cfbd20b8c7ddbcdc8700760b7c58350cbb398a9a398640b57b72423`，签署投影 SHA-256 为 `018b071374fbe38279f7e1097120235329ab6335e9d44b13da102e15c1a7640d`；113 条平铺账实算为 target 113 唯一、提案行 113 唯一，判词 **留 97／减薄 12／回单线 4**，分类 **主 4／次 109**。
- 亲读 CSS diff 与机器账：`M05` Settings、`M06` Gallery 保留 `--rule-major` + `::after --rule-minor` 全形文武线；`M01/M03` 保留粗细几何并同退至 `--border`；`M02/M04/M07/M08` 均为 `--rule-minor solid var(--border)`，旧伴生 `::after` 已撤。十条 N 项仅由 `--border-strong` 退至 `--border`。`tokens.json`、`rule-grammar-lib.mjs`、EXEMPT 账与 DOM/TSX 均未改。
- BEFORE/AFTER 图逐张人工核对：E01 是 welcome 画面，保持没有指定主界消费证据，不补造；AFTER 的 Settings/Gallery 总界仍有层级，Session history 与 Compare pane 为单线，RiskList 的 panel/preview 层级仍在而 scene/owner 高频分隔退场。画面使用真实样板案与真实 fixture，不是空白骨架。
- 精确帧哈希与登记一致：1280×720 `c17cb8f9…d4398955` 是 Safari 顶层 `AXWebArea` 原生、无缩放、无裁切；2400×1000 `b2be98d…22d3303` 是真实 Safari WebKit 精确 layout iframe 的完整帧，经 0.58 缩放后归一。后者只证明布局、状态与线级关系，**不作为 native-scale AA 证据**；README/metadata 对物理屏幕限制、DPR、缩放与 `nativeAA:false` 均如实披露。AFTER 源指纹 `styles.css=1099f768…bf51f14`、`assert-rule-grammar.mjs=17085c02…90fb2` 与目标提交实物逐位一致。

## 2. 五类真实 mutation 定点翻红

每项均在独立 clone 的真实文件上单独注入、执行 `pnpm --filter @courtwork/desktop lint:rule-grammar` 观察 exit 1，再用精确反向补丁复位；最终 `git diff --exit-code` 为 0、线级门与 schema-exemplar 门复绿。

| 注入 | 实际红证 |
|---|---|
| `--rule-major: 2px → 1px`，制造均一 1px | 同时报 `线级 token 漂移 --rule-major` 与 `线重层级倒置：major=1 未大于 minor=1` |
| 删除 `P1-M02` 档位账行 | 定点报缺 `P1-M02`、112/113、次界 108/109、回单线 3/4 与漏 `.pane-head|bottom` |
| 复活 `.scene-strip::after` 双线 | 定点报 `styles.css:180 线消费点未归一分类：.scene-strip::after|top` |
| `.sample-tour` 的签署薄色退回 `--border-strong` | 定点报 `P1 签署色槽漂移：.sample-tour|all = var(--border-strong) / var(--border)` |
| 把 `P1-M02` target 复制为 `P1-M01` 的 `.panel-head|bottom` | 同时报消费点重复、minor/major 不一致、宽度漂移、伴生标记错误与漏原 `.pane-head|bottom` |

这些反例同时证明均一 1px、漏账界线、未登记双线、签署色槽回退与重复/遗漏提案映射都不能静默穿门。

## 3. 独立全量门

独立 clone 先以 `pnpm install --frozen-lockfile` 从锁定 store 安装依赖。首次 `pnpm lint` 在安装前因 `eslint` 不存在而环境失败；安装后原命令重跑通过。首次根 `pnpm test` 在 workspace `dist` 尚未构建时因 package exports 无法解析而失败（62 suites + 3 tests；均是入口缺失/0-test 形状），随后完整 `pnpm -r build` 生成各包产物，再重跑根测试全绿。两次前置环境红均未冒充代码门通过。

| 门 | 结果 |
|---|---|
| `pnpm site:guard` | PASS；58/58 Node tests；fresh clone 的 deslop 为 851 个现行文本文件，全部设计门（含 schema-exemplar）通过 |
| `pnpm lint`（安装后） | PASS |
| `pnpm -r build` | PASS；13 个具 build 脚本的 workspace 全部完成，desktop `tsc -b && vite build` 通过 |
| 根 `pnpm test`（构建后复跑） | PASS；148 files / 1261 tests |
| `pnpm --filter @courtwork/desktop test` | PASS；59 files / 371 tests |
| `COURTWORK_E2E_PORT=19341 pnpm --filter @courtwork/desktop test:e2e` | PASS；独立端口静态前链全绿，Playwright **312/312 passed（2.9m）** |

实现证据所记 deslop 863 与 fresh clone 的 851 是工作树当时额外现行文本库存差异；同一提交的守卫规则与全部 58 测试在独立 clone 通过，故不把扫描文件计数当作稳定契约或回退数字。

P1 只改线级消费值、签署账、门与证据；未改 schema、payload、scenario、wire、token 值、字体、主题、记号、Rust、数据或交互骨架。以上实物、反例与全门均成立，故放行本批；本结论不扩大到 P2 排印/版式、P3 巧思、P4 深色或 P5 Pages。

---

# ACCEPTANCE: SKIN-R2 P2 · 版式与排印重选

日期：2026-07-20；验收对象：`20f9667ac416e966980e5faab71c61e4c2515e9d`（`fix(desktop): close P2 compare layout overflow`），其直接父提交与治理投影均为 `52c61588233f5ed4f5fcf1d6e12fcfd201c6ba14`。本验收会话以完整独立 clone `/private/tmp/courtwork-skin-r2-p2-accept.t1KyzY` 建立 `codex/accept-skin-r2-p2`；`git status --short --branch` 起点干净，未复用共享 Vite/Playwright 服务，未修改产品实现或契约，未 push。

**裁决：✅ 放行 SKIN-R2 P2。** 排印裁量只放行已签的保 C 结论；本结论不撤回文书轨产品定讞，也不把缩放后的 Safari 帧冒充 native-scale AA 证据。

## 1. 签署投影、排印边界与实现范围

- 档位账逐项核对 `P2-T01…T14`、`P2-L01…L18`：每个 target 只绑定一个已签提案行；T/L 全部为 Agent 中间档，L04/L05/L10 三处 schema 工作面仍为最克制档。退场的 `P5-F06…F08` 不在活账。
- C/D 盲测实物仍为 C `86.5`、D `87.8`，差值 `+1.3` 落在预锁同分区；按签署的「同分取 C、举证责任在挑战方」保留现行三轨。候选对 `tokens.json`、字体资产、`@font-face`、子集 manifest、SOURCE/许可链均为零 diff，因此没有退役字栈，也不触发物理删除或产品改判。
- L01…L16 保持签署的零消费 diff；本候选只落实追加签署的 L17/L18：`comparing` 纳入既有真撤卡路径，比较态显式收为 conversation + workface 两轨；`.composer-stack` 以 `minmax(0,1fr)` 关闭隐式 auto-track 的 min-content 撑宽。DOM payload、数据、写入路径、主题、记号及 UX 行为骨架未改。

## 2. 真实仓库 mutation 定点翻红

每项都在独立 clone 的真实文件上单独注入，执行对应静态门或独立端口 Playwright，观察失败后以精确反向补丁复位。四类账门反例与两类几何反例全部成立；复位后 `git diff --exit-code`、两项 P2 e2e 与账门均回绿。

| 注入 | 实际红证 |
|---|---|
| 删除 `P2-L18` 活账行 | `已签提案行缺失：P2-L18` |
| `P2-L18` 从 `agent-interface` 改为 `schema-workface` | `P2-L18 档位漂移：应为 agent-interface，实为 schema-workface` |
| 将 `P2-L18` target 改绑到 `P2-L17` target | 同时报 `P2-L17 target 未唯一绑定`、`P2-L18 target 漂移` 与原 target 无唯一 owner |
| 新增活账 `P5-F06` | `退场提案行不得进入活档位账：P5-F06` |
| 比较态首轨复活为 `48px` | `P2-L18：comparing.left-collapsed 不得再申请 48px 幽灵轨` |
| 从 `.composer-stack` 移除 `grid-template-columns: minmax(0,1fr)` | 独立埠 `19327` 的 P2-L17 e2e 定点红：应 `composerRight ≤ 429`，实为 `539.4375`；同轮 L18 仍绿，证明失败定位在 composer auto-track |

几何反例复位后以独立埠 `19328` 重跑 `p2-layout.spec.ts`，L17/L18 **2/2 passed**。

## 3. Safari exact 1600×900 独立复摄

验收会话复用仓内哈希为 `9aaf10b…2fc26d19` 的 `safari-exact-wrapper.html`，在 Safari `26.5.2` / macOS `26.5.2 (25F84)` 上打开候选的独立 Vite 埠 `19330`。Safari 标题探针实报 `frame=1600x900 | scale=0.8 | outer=1440x746 | dpr=2`；Accessibility 同时暴露内层 `AXWebArea` 为 `Courtwork 1600 by 900 exact viewport`、尺寸 `1600×900`。通过 System Events AX 真点击 `Get started with the sample case` → `先查看演示` → `Compare`，不是脚本伪造状态或 Chromium 截图。

独立 AFTER 归一帧为 `site/craft-evidence/SKIN-R2-P2/after/acceptance-compare-1600x900-safari.png`：左侧 CaseRail 真正不在场，chrome 只保留既有 `Expand sidebar`；composer shell 完整停在 conversation 列内，右缘早于右工作面起点，完整右边与底边均在帧内，故不是靠裁切隐藏溢出。Retina 原帧 `2560×1440`，归一交付帧 `1600×900`；两者 SHA-256 分别为 `335b89c9…b2cd97c4`、`1a21d98a…8e03046`。采集方法、系统、viewport、DPR、源码指纹及限制见同目录 `ACCEPTANCE-SAFARI.md`。

WebDriver 的系统拒绝原文为 `Could not create a session: You must enable 'Allow remote automation' in the Developer section of Safari Settings to control Safari via WebDriver.`；Apple Events JS 亦要求启用 `Allow JavaScript from Apple Events`。验收没有改系统设置，而是使用本机已有的 Safari Accessibility 权限完成真实操作和窗口层截图；因此不以这两条自动化路径不可用为理由降格到 Chromium。缩放帧只取得布局、状态与跨 WebKit 几何放行权，不声称 native-scale 1:1 AA。

## 4. 独立全量门

依赖以 `pnpm install --frozen-lockfile` 安装。所有命令均在目标 clone 执行；Playwright 完整链使用独立埠 `19329`，没有复用共享 dev server。

| 门 | 结果 |
|---|---|
| `pnpm -r build` | PASS；13 个具 build 脚本的 workspace 完成，desktop `tsc -b && vite build` 通过；只有既有 chunk-size 提示 |
| `pnpm lint` | PASS |
| 根 `pnpm test` | PASS；148 files / 1261 tests |
| `pnpm site:guard`（追加验收证据后） | PASS；64/64 Node tests，deslop 扫描 869 个现行文本文件，设计与发布真值门全绿 |
| `lint:skin-r2-ledger` / `lint:layout-converge` | PASS；签署账完整、撤卡/幽灵轨/测宽边界全绿 |
| `COURTWORK_E2E_PORT=19329 pnpm --filter @courtwork/desktop test:e2e` | PASS；完整静态前链全绿，floor 314，Playwright **314/314 passed（3.1m）** |

本验收提交只追加独立 Safari 证据与本报告，不修改实现、SPEC、门或产品契约。放行范围止于 SKIN-R2 P2；P3 巧思、P4 深色、P5 Pages 与终局 one-shot 仍须各自按既定门序独立验收。

---

# ACCEPTANCE: SKIN-R2 P3 · 巧思回迁

日期：2026-07-20；验收对象：`ebe4b78505da4c9d2b1cfb94360f3ad029e23702`
（`feat(desktop): complete SKIN-R2 P3 craft return`）。本验收会话以 `git clone --no-hardlinks`
建立全新独立 clone `/tmp/courtwork-p3-acceptance.nRHbBv/repo`，detach 精确检出目标 SHA；依赖以
`pnpm install --offline --frozen-lockfile` 装入，Playwright 使用独立端口 `19437/19438`，Tauri
fixture 使用工单固定端口 `19354`。未复用共享 Vite／Playwright 服务，未改实现或契约，未 push。

**裁决：❌ 拒绝 SKIN-R2 P3。** 真 Tauri WKWebView 的 23px 悬出／39px 行移独立复现，朱印
三段关键帧、reduce 停摆与墨迹拒迁本身也成立；但 P3-H01 的固定 fixture、测量与截图哈希没有
进入仓内机器门。验收把正负声明改成同一值、把测量改为 24px 并把截图哈希改成全零时，完整
`pnpm site:guard` 仍 67/67 全绿。证据可以静默失真，未满足本线「实机证据是验证主轴」和
drift/guard 必须实际拦反例的退出条件。

## 1. 真 Tauri WKWebView 独立复跑

验收直接以仓内 `tauri-evidence.conf.json` 启动真实 `courtwork-desktop` 二进制；HTTP 只供固定
页面，渲染与测量发生在 WKWebView。macOS Accessibility 树独立读到正例 `正 · allow-end`、
负例 `负 · none` 及壳内测量 JSON；不是采信实现截图或 Chromium 结果。

| 项 | 独立实测 |
|---|---|
| 系统 | macOS 26.5.2 (25F84)，Darwin 25.5.0 |
| 壳／引擎 | Tauri CLI 2.11.4；AppleWebKit 605.1.15 |
| 视口 | 1280×720；DPR 2；fixture width 385 CSS px |
| 正例 | `CSS.supports=true`；逗号留前行并悬出 **23 CSS px** |
| 负例 | `hanging-punctuation:none`；同一逗号下移 **39 CSS px** |
| 独立帧 | `acceptance-ebe4b78/tauri-wkwebview-independent-1280x720.png`；SHA-256 `049a4c67…b6714` |

独立重摄在相同机器、字节和窗口几何下得到与实现帧相同的哈希；这是确定性复现，不是复制实现
截图。结构化系统、源哈希与 AX 结果见同目录 `tauri-independent-measurements.json`。故 P3-H01
所述 WebKit 效力事实成立；拒绝原因只在其证据链未被仓门保护。

## 2. 真实 mutation 与门缺口

每项都在独立 clone 的真实文件上单独注入；成立的门观察 exit 1 后精确反向补丁复位。P3-H01
三项则特意保留「仓门误绿」事实：独立验收探针会诊断失败，但该探针不在产品门内，不能冒称
仓门已经成立。

| 注入 | 实际结果 |
|---|---|
| 删除 `P3-H01` 档位账行 | `lint:skin-r2-ledger` 红：`已签提案行缺失：P3-H01` |
| `P3-S01` 改为 `schema-workface` | 红：`P3-S01 档位漂移` |
| `P3-A01` 与 `P3-I01` 绑同一 target | 红：重复 owner、target 漂移与原 target 无 owner 三项同报 |
| 删除 `58%` keyframe | 独立埠聚焦 e2e 红，diff 精确显示缺 `.62 / scale(.96)` 中段 |
| 在 58% 新增 `filter:blur(1px)` | `lint:motion` 红：`CSS keyframes: filter` |
| reduce 下把 `animation:none` 换成 `.01ms` | `lint:schema-parts` 红：`落定章未…显式停摆` |
| 在壳侧 `mark-seal-frame` 留 `filter/feTurbulence/feDisplacementMap` | `lint:schema-parts` 红：单源漂移 + `记号越界画法…filter` |
| 正负 fixture 均改为 `allow-end`（同时造成 CSS 源哈希漂移） | **仓内 `site:guard` 仍 67/67 PASS**；独立探针才红 `control collapsed` |
| `overhangCssPx:23→24` 且截图哈希改为 64 个零 | **仓内 `site:guard` 仍 67/67 PASS** |

这不是「测试可再多一条」的便利缺口：P3-H01 明定 WKWebView 是唯一放行权威，若 fixture 的阴性
对照、测量或帧可在门外漂移，权威结论便退回不可验证叙事。因此本轮不得放行。

## 3. 朱印、墨迹拒迁与零残留复核

- CSSOM e2e 独立读得三段 `0% 0/1.16 → 58% .62/.96 → 100% .5/1`，三段
  `rotate(-4deg)` 相等；`--motion-seal` 仍为 320ms 唯一消费，reduce 计算态为 `none` 且印本体
  保留。实现所交 `seal-before-058/000/058/100.png` 的 SHA-256 与 README 登记逐位相等；人工查看
  58% 帧，章在详情右上保持可读、无额外滤镜。
- `ink-a-clean.png` / `ink-b-bleed.png` 哈希分别为 `721c61e…b4ee` / `00f322a…e84c`；
  `ink-ab-measurements.json` 的同 bbox、三采样静止、cleanup=0 与 `decision=reject-migration` 自洽。
  目标树 `apps/desktop/src` 与 `src-tauri` 实扫零 `feTurbulence`、`feDisplacementMap`、
  `p3-ink-bleed`、`ink-bleed`、`filter=url(...)` 及 inline filter 消费。墨迹正式拒迁、零半实现成立。

## 4. 独立全量门

| 门 | 结果 |
|---|---|
| `pnpm lint` | PASS |
| 根 `pnpm test` | PASS；**148 files / 1261 tests** |
| `pnpm -r build` | PASS；13 个具 build 脚本的 workspace 完成；desktop 只有既有 chunk-size 提示 |
| `pnpm site:guard`（报告与独立证据加入后复跑） | PASS；**67/67** Node tests；deslop 880 个现行文本文件 |
| `pnpm site:build` | PASS |
| 首轮 `COURTWORK_E2E_PORT=19437 … test:e2e` | 312/314；两个旧谱均在共享 `openWorkbench` 首启点击／等待处 30s 超时，P3 schema-marks 谱通过 |
| 第二轮完整 `COURTWORK_E2E_PORT=19438 … test:e2e` | PASS；静态前链全绿；Playwright **314/314 passed（4.6m）** |

首轮两红没有被隐藏：新端口完整重跑后两项各在约 1–2s 通过，且 P3 定点谱两轮均绿，故登记为
首启偶发而不把它冒充 P3 缺陷。本轮拒绝仍只由可稳定复现的 P3-H01 门缺口触发。

## 5. 最小复验要求

只补仓内漂移门与其真实 mutation，不重做已成立的视觉消费值：

1. 正／负 `hanging-punctuation` 同值必须由仓门定点红；
2. HTML、CSS、JS、Tauri config 任一字节变化或其登记 hash 漂移必须定点红；
3. 截图实际字节与登记截图 hash 不一致必须定点红；
4. 测量记录的 23px／39px、源 hash、截图 hash 任一漂移必须独立定点红；
5. 复位后再跑真实 Tauri WKWebView、`site:guard` 与独立端口完整 e2e，由新的验收会话复验。

本验收提交只追加拒绝报告与独立真机证据，不修改实现、SPEC、门或契约。P3 未放行，故 P4 与
终局 one-shot 不得据本报告越过队列；P5 并行线仍按其自身验收结论处理。

---

# ACCEPTANCE: SKIN-R2 P3 · 证据门复验

日期：2026-07-20；复验对象：`e4fec988d145dbd97dfde8a5475071fbcd756357`
（`fix(site): pin SKIN-R2 P3 evidence bytes`）。本复验会话从该 SHA 建立全新独立 clone
`/tmp/courtwork-p3-reacceptance.7BGK6W/repo` 并 detached 精确检出；依赖以
`pnpm install --offline --frozen-lockfile` 装入，Playwright 使用独立端口 `19448`，Tauri
fixture 使用工单固定端口 `19354`。未复用共享服务，未修改产品实现或契约，未 push。

**裁决：✅ 放行 SKIN-R2 P3。** 上轮拒绝的唯一缺口已经关闭：仓内守卫现同时钉住正负语义、
fixture／壳配置字节、23px／39px 测量、两张权威帧、测量记录及墨迹拒迁记录。五类要求的真实
mutation 均令完整 `pnpm site:guard` exit 1，精确复位后 69/69 Node tests 全绿；真实 Tauri
WKWebView 亦再次独立复现同一排印效力。朱印消费、墨迹拒迁与此前已成立的实现结论不重做消费值。

## 1. 证据门实物与五类必红反例

`checkP3Evidence` 由根 `deslop-scan` 实际调用，不是孤立测试 helper。固定摘要覆盖
`hanging-fixture.html/css/js`、`tauri-evidence.conf.json`、两张权威帧、
`hanging-measurements.json`、墨迹 A/B 帧与 `ink-ab-measurements.json`；结构门另验
Tauri authority、WebKit、viewport、DPR、正负声明、23/39 数值、记录哈希到实际字节的互绑，
以及墨迹 `reject-migration`、cleanup=0／none、几何与动画不变。

每项均在 fresh clone 的真实文件上单独注入，运行**完整** `pnpm site:guard` 观察 exit 1，再以
精确反向补丁复位；五轮均只有 `SKIN-R2-P3 pins WKWebView semantics, fixture bytes,
measurements, and frames` 定点测试失败，复位后 `git diff --exit-code` 恢复干净。

| 注入 | 实际红证 |
|---|---|
| 负例 `hanging-punctuation:none → allow-end`，使正负声明相同 | `p3-evidence` 同时报 fixture CSS 字节漂移与正负语义／23px／39px 锚漂移 |
| 在 `hanging-fixture.css` 加无效注释，只改变 fixture 字节 | `fixtureCss bytes drifted from the independently reviewed P3 anchor` |
| `positive.overhangCssPx:23→24` 且 `lineShiftCssPx:39→40` | `measurementsRecord bytes drifted` 与 WKWebView 23px／39px 语义锚同时翻红 |
| 将 `comparisonFrameSha256` 记录改为 64 个零，权威 PNG 字节不动 | `comparisonFrameSha256 does not bind the recorded file bytes` |
| 墨迹 decision 改为 accept、cleanup 0→1 且 filter none→url(...) | `inkRecord bytes drifted` 与 `ink A/B evidence no longer proves a clean rejected migration` 同时翻红 |

因此「正负对照坍缩、fixture 漂移、测量漂移、截图记录脱绑、墨迹拒迁／清场失真」均不能再像
上轮那样静默穿过仓门；门也未扩大为内容生成器，证据重摄仍须显式更新锚并重新独立验收。

## 2. 真 Tauri WKWebView 独立复跑

复验直接以目标树的 `tauri-evidence.conf.json` 启动真实 `courtwork-desktop`。macOS
Accessibility 树独立读到正例、负例、运行时和测量 JSON；随后按 live CGWindow id 新摄壳窗，
未复用实现帧或上轮验收帧。停止壳与证据服务器后，进程复核为零残留。

| 项 | 独立实测 |
|---|---|
| 系统 | macOS 26.5.2 (25F84)，Darwin 25.5.0 |
| 壳／引擎 | Tauri CLI 2.11.4；AppleWebKit 605.1.15 |
| 视口 | 1280×720；DPR 2；fixture width 385 CSS px |
| 正例 | `CSS.supports=true`；`allow-end` 令逗号留前行并悬出 **23 CSS px** |
| 负例 | `none` 令同一逗号下移 **39 CSS px** |
| 新摄帧 | `reacceptance-e4fec98/tauri-wkwebview-authority.png`，2784×1664 physical px，SHA-256 `e25317bf…aed932` |

系统、源摘要、完整帧摘要、采集方法与限制见同目录
`tauri-wkwebview-authority.json` / `README.md`。数值来自 live WKWebView 测量与 Accessibility，
不是从截图像素推算；Chromium 不承担该项放行权。

## 3. 独立全量门

| 门 | 结果 |
|---|---|
| `pnpm site:guard`（五类注入复位后） | PASS；**69/69** Node tests；设计、发布与 P3 evidence 门全绿 |
| `pnpm lint` | PASS |
| 根 `pnpm test` | PASS；**148 files / 1261 tests** |
| `pnpm -r build` | PASS；13 个具 build 脚本的 workspace 完成；desktop 只有既有 dynamic-import／chunk-size 提示 |
| `pnpm site:build` | PASS |
| `COURTWORK_E2E_PORT=19448 pnpm --filter @courtwork/desktop test:e2e` | PASS；完整静态前链全绿，Playwright **314/314 passed（4.1m）** |

本复验提交只追加新的独立真壳证据与本报告，不修改实现、SPEC、门或产品契约。上轮拒绝报告作为
历史红证原样保留；本节以目标 `e4fec98` 的真实反例和全门结果解除该拒绝，放行范围止于
SKIN-R2 P3，不替 P4 深色、P5 Pages 或终局 one-shot 作任何放行。

---

# ACCEPTANCE: SKIN-R2 P4 · B5 深色批

日期：2026-07-20；验收对象：`f8d10b59eb3167fd36e0d65985ca638924953b85`
（`feat(desktop): add signed SKIN-R2 dark theme`）。验收从该 SHA 建立全新独立 clone
`/tmp/courtwork-p4-acceptance.YhTB7h/repo` 并 detached 精确检出；依赖以
`pnpm install --offline --frozen-lockfile` 装入，Playwright 使用独立端口 `19502–19507`，真壳
使用独立 Vite 端口 `19458`。未复用共享服务，未修改产品实现、门或契约，未 push。

**裁决：❌ 拒绝 SKIN-R2 P4。** `themeMode` 单键迁移、system／显式模式、C-4 双宗断言、裸
`.titlebar` 清理和真实 WKWebView 四槽消费本身成立；但暗宗根映射门只禁止非 custom-property
的几何声明与 raw color，没有验证 custom property 的闭集和精确 token 绑定。验收把
`--bg-app` 错接到 `var(--text-primary)`，以及额外加入布局变量 `--content-measure:999px` 时，
完整 `pnpm site:guard` 均全绿。故组件仍可经根暗宗映射获得错误颜色或主题专属几何，未满足
「只映射 `themes.dark`、布局不写主题分支、双宗几何逐位相等」的退出条件。

## 1. 设置契约与 C-4 实跑

- 独立临时 Vitest 探针覆盖旧 snapshot 缺 `appearance`、畸形 `themeMode:"sepia"` 及畸形 JSON，
  三者均归一为 `system`；backend 只读取 `courtwork.settings.v1`。探针运行后已删除。
- 注入第二存储键 `courtwork.settings.theme.v1` 后，独立端口 e2e 定点红，实际 keys 为
  `['courtwork.settings.theme.v1','courtwork.settings.v1']`，精确拒绝新增键。
- 无变异基线在独立端口通过 `themeMode` 路径与真实 C-4 断言：system 随模拟 OS，显式
  light/dark 固定，根只暴露解析后的 `data-theme`；light/dark 的 SchemaParts 几何逐位相等、
  颜色随宗变化（2/2 passed）。完整 e2e 亦覆盖旧 snapshot、Settings opt-in、reduced-motion
  与叠层残留。

## 2. 真实 mutation：成立的门与两处假绿

每项均在 fresh clone 的真实文件上单独注入，运行目标实际消费的完整门，观察后精确反向补丁
复位；最终目标实现树无残留 diff。

| 注入 | 实际结果 |
|---|---|
| 在组件 selector 新增 `[data-theme='dark'] .reader-pane` | `site:guard` 红：`theme branch escaped root token map` |
| 新增 `@media (prefers-color-scheme:dark)` 组件分支 | 红：`CSS prefers-color-scheme branch bypasses...` |
| 在暗宗根直接写 `grid-template-columns:1fr` | 红：`dark root map changed geometry...` |
| 把暗宗 `--bg-app` 改成 raw `#0e1622` | 红：raw color 不是精确 token consumer |
| 恢复裸 `.titlebar` + `border-bottom` | `lint:rule-grammar` 红：未分类 `.titlebar|bottom`；目标仍保留 `.chat-titlebar`、`.titlebar-credential-warn`、`.titlebar-settings` 等活 selector |
| 暗宗 `--bg-app:var(--text-primary)` | **完整 `site:guard` 71/71 PASS**，错误 token 绑定未被发现 |
| 暗宗额外加入 `--content-measure:999px` | **完整 `site:guard` 71/71 PASS**，主题专属 layout custom property 未被发现 |

后两项不是可选的加固：现门把任意 `--*` 都当作安全颜色映射，既不能证明值来自指定
`themes.dark` 槽，也不能证明 root 暗宗只含获批颜色属性。因此 C-4 当前只证明基线样本相等，
无法阻止后续漂移；P4 不得放行。

## 3. 真 Tauri WKWebView 四槽复核

验收在 macOS Dark 外观下启动目标的真实 `courtwork-desktop`，经壳内 command palette 打开
Settings → Appearance，并从 live CGWindow 新摄 Welcome／Settings 两帧；不是复用实现截图或
Chromium。Settings 帧同时呈现 focus、strong、hairline 与 disabled 消费，视觉上 focus 清晰、
两档结构线可分、disabled 可辨且不承担唯一信息，未见组件局部补色。

| 项 | 独立实测 |
|---|---|
| 系统／壳 | macOS 26.5.2 (25F84)，Darwin 25.5.0；Tauri CLI 2.11.4，WKWebView |
| hairline | `#2A3A52`；app `1.5762:1`，raised `1.1541:1` |
| strong | `#3E5270`；app `2.2844:1`，raised `1.6726:1` |
| focus | `#6A94F1`；app `6.1467:1`，raised `4.5006:1` |
| disabled | `#4C5A70`；app `2.5935:1`，raised `1.8990:1` |
| 新摄证据 | `acceptance-f8d10b5/tauri-dark-welcome.png`、`tauri-dark-settings.png`，均 3424×2024 physical px |

完整系统、帧 SHA-256、独立重算值、观察和限制见同目录 `tauri-dark-slots.json` / `README.md`。
真壳四槽成立，但不能代替失败的机器边界门。

## 4. 独立全量门

| 门 | 结果 |
|---|---|
| `pnpm lint` | PASS |
| 根 `pnpm test` | PASS；**148 files / 1261 tests** |
| `pnpm -r build` | PASS；13 个具 build 脚本的 workspace 完成；desktop 只有既有 dynamic-import／chunk-size 提示 |
| `pnpm site:guard`（实现树复位后） | PASS；**71/71** Node tests；deslop 与全链通过 |
| `pnpm site:build` | PASS |
| 首轮 `COURTWORK_E2E_PORT=19504 … test:e2e` | 313/315；`goal1 #39` 与 `host-auth` 均在首次导航／工作台启动处超时 |
| 独立端口定点复跑 | 两项分别在 `19505/19506` 一次通过（1.4s／0.9s），登记为首启偶发 |
| 第二轮完整 `COURTWORK_E2E_PORT=19507 … test:e2e` | PASS；静态前链全绿；Playwright **315/315 passed（4.4m）** |

## 5. 最小复验要求

只收紧暗宗根映射的机器门，不改本轮已成立的 token 值或组件消费：

1. 以获批 light/dark 主题表建立根映射的**精确属性闭集与精确 var 绑定**；错绑、缺槽、重复槽、
   多余 custom property 均须定点红；
2. `--content-measure` 或其他 layout／geometry custom property 进入 `[data-theme='dark']` 必须红；
3. 保持已有组件主题分支、CSS media 分支、raw color、直接 geometry 与裸 `.titlebar` 红证；
4. 精确复位后复跑 C-4、同键 Settings 契约、真实 Tauri 四槽、全仓门和独立端口完整 e2e；
5. 由新的独立会话复验修复 SHA，不在本报告提交中夹带门实现。

本验收提交只追加拒绝报告与独立真壳证据。P4 未放行，故不得据本报告启动终局 one-shot；
P5 仍按其并行线的独立签署与验收结论处理。

---

# ACCEPTANCE: SKIN-R2 P4 · 暗宗根映射门复验

日期：2026-07-20；复验对象：`962c51338dafa315447beeb8da2956ae5a3a4e0b`，其中包含修复
`1f0861d0430186bbb7bf96ce3fad85f70bb18856` 及上轮拒绝证据。本会话从 current main 的该精确
SHA 建立全新 clone `/tmp/courtwork-p4-reacceptance.DUNod1/repo`，使用独立分支
`codex/p4-reacceptance-962c513`、独立端口 `19511–19513`；没有退回只验修复提交，也没有复用
上轮 clone、服务或进程。依赖由 `pnpm install --offline --frozen-lockfile` 装入；未改产品实现、
契约或机器门，未 push。

**裁决：✅ 放行 SKIN-R2 P4。** 上轮两项阻断性假绿已经关闭：错 token 绑定和暗宗 root 布局
custom property 现在都令完整 `site:guard` 的 P4 root-boundary 定点红。另验缺槽、重复槽、多余
无害变量和错误派生 color-mix 也全部红；既有组件主题分支、CSS media、直接几何、raw color 与
裸 `.titlebar` 红证没有退化。精确复位后 71/71，且消费 token、CSS 和 Settings 实现与上轮目标
逐字节相同，因此本复验解除上轮拒绝而不重裁消费值。

## 1. 暗宗闭集门的真实 mutation

每项都在 fresh clone 的真实 `apps/desktop/src/styles.css` 上单独注入。前十项运行**完整**
`pnpm site:guard`，均只使基线 P4 root-boundary 测试由绿转红；裸 `.titlebar` 运行其真实消费门
`lint:rule-grammar`，精确报未归一分类。每轮以反向补丁复位，最终实现树零 diff。

| 注入 | 复验结果 |
|---|---|
| 上轮原始阻断：`--bg-app:#0f1622 → var(--text-primary)` | `site:guard` exit 1；P4 root-boundary 70/71 |
| 上轮原始阻断：dark root 新增 `--content-measure:999px` | exit 1；P4 root-boundary 70/71 |
| 删除 `--bg-app` 槽 | exit 1；缺槽被闭集拒绝 |
| 重复声明 `--bg-app` | exit 1；重复槽被拒绝 |
| 新增无视觉副作用 `--audit-note:inherit` | exit 1；未批准 custom property 被拒绝 |
| `--bg-hover` 派生式的 `78%` 改为 `77%` | exit 1；完整 color-mix 值漂移被拒绝 |
| 新增 `[data-theme='dark'] .reader-pane` | exit 1；组件主题分支仍红 |
| 新增 `@media (prefers-color-scheme:dark)` root 覆写 | exit 1；CSS media 旁路仍红 |
| 新增第二个 dark root，直接写 `grid-template-columns:1fr` | exit 1；直接几何与重复 root 声明均红 |
| `--bg-app` 改为未批准 raw `#0e1622` | exit 1；精确 token consumer / root 值双门拒绝 |
| 恢复裸 `.titlebar { border-bottom:… }` | `lint:rule-grammar` exit 1：`.titlebar|bottom` 未分类；活 selector 保留不受影响 |

修复门不是把合法 `var()` 一概放行或只锁 raw hex；它从 `themes.dark` 解析批准直值，并对派生式
保存精确 normalized 值，以 property→value 闭集同时拒绝缺、错、重、多。因此上轮指出的
「C-4 只证明当前样本，不能阻止后续漂移」缺口已经实质关闭。

## 2. Settings、C-4 与壳内宗解析

- 独立临时 Vitest 探针与既有 settings/controller tests 合跑 **3 files / 13 tests**：旧 snapshot
  缺 `appearance`、畸形 `themeMode:'sepia'`、坏 JSON 均回退 `system`，每类只读
  `courtwork.settings.v1`；system 跟随 OS、显式 light/dark 固定，controller 的 root dataset
  只有解析后 `theme`。临时探针随后删除。
- 独立端口 `19511` 跑 Settings + schema-marks **10/10**：同键持久、单键枚举、system/explicit OS、
  root-only、C-4 双宗几何逐位相等且色随宗、Settings opt-in 及 reduced-motion 均通过。
- 完整 e2e 再次覆盖旧 snapshot、畸形值、Settings opt-in、reduce 停摆和叠层残留；不是用定点
  测试替代全量。

## 3. 真 Tauri WKWebView 复核

复验用 fresh clone 自身编译并启动真实 `courtwork-desktop`，连独立 Vite 端口 `19512`。macOS
处于 Dark；通过 live Accessibility 树从 command palette 进入 Settings → Appearance，读到
Appearance 面和 `Theme mode` 控件，并从 live CGWindow 新摄实壳帧。截图明确显示 **System**，
同时壳面消费暗宗；浏览器真断言同一代码路径的 root 为 `data-theme='dark'` 且没有
`data-theme-mode`。停止后 Tauri/Vite 进程均退出，端口释放。

`f8d10b5..962c513` 对 `tokens.json`、`styles.css`、`src/settings` 的 diff 为空；新摄 Settings 帧
也与首次独立验收帧 SHA-256 逐位相同。因此首次报告独立重算的 hairline/strong/focus/disabled
四槽结论继续有效，不因门修复而漂移。新帧、系统、AX 结果、hash、等价路径及 cleanup 见
`site/craft-evidence/SKIN-R2-P4/reacceptance-962c513/`。

## 4. 独立全量门

| 门 | 结果 |
|---|---|
| `pnpm lint` | PASS |
| 根 `pnpm test`（build 完成后顺序复跑） | PASS；**148 files / 1261 tests** |
| `pnpm -r build` | PASS；13 个具 build 脚本的 workspace 完成；desktop 只有既有 dynamic-import／chunk-size 提示 |
| `pnpm site:guard`（报告与证据加入后最终复跑） | PASS；**71/71** Node tests；deslop 891 个现行文本文件 |
| `pnpm site:build` | PASS |
| `COURTWORK_E2E_PORT=19511` Settings + schema-marks | PASS；**10/10** |
| `COURTWORK_E2E_PORT=19513 pnpm --filter @courtwork/desktop test:e2e` | PASS；完整静态前链全绿；Playwright **315/315 passed（3.6m）** |

为诚实保留运行噪声：最初把根 test 与 fresh-clone workspace build 并发启动时，测试进程在 dist
尚未生成的窗口得到 46 个 0-test import 失败和 3 个 browser-boundary resolve 失败；并行 build
随后成功。build 完成后不改源码按顺序完整复跑即 148/1261 全绿，故归类为验收编排竞态，不冒称
目标回归，也不把失败记录隐藏。

本复验提交只追加放行报告与新的独立真壳证据，不修改实现、SPEC、机器门或产品契约。上轮
`f8d10b5` 拒绝报告作为红证原样保留；本节仅以 current main `962c513` 的真实反例与全门结果解除
该拒绝，放行范围止于 SKIN-R2 P4，不替 P5 或终局 `pm.PrdReview` one-shot 作任何放行。

---

# ACCEPTANCE: VERSIONAL-LANG-1 · 首轮独立验收

日期：2026-07-20；对象：`45fb39510902b7b7a99eb0792024328bc27672df`；全新 clone、独立端口，
未改实现或机器门，未 push。

**裁决：❌ 拒绝。** `.composer-shell:focus-within` 的 `border-color` 改为 `transparent` 后，完整
`site:guard` 仍为 76/76，独立 VERSIONAL-LANG e2e 仍为 4/4，签署 `VL-L05` 的 focus 强边界可
静默退场。其余档位账、routine/P1 复活、结构强边界、schema 新装饰及 Pages 反例均按报告红；
完整 desktop e2e 321/321、根 tests 148/1261、13 workspace build 均绿。真实 Tauri/WKWebView
已在 fresh clone、独立端口新摄 1600×900 暗宗壳帧，当前首行、侧栏与 composer 无可见溢出。

完整 mutation、尺寸／状态矩阵、真壳截图与最小复验入口见
`site/craft-evidence/VERSIONAL-LANG-1/acceptance-45fb395/README.md`。补上非透明获批 token 的静态
断言及聚焦前后 computed 差异门后，须由另一新会话从修复 SHA 完整复验；本轮不得视为放行。

---

# ACCEPTANCE: VERSIONAL-LANG-1 · focus 守卫独立复验

日期：2026-07-20；对象：`b93796aca5110c4f349d9c0398710a38207741ea`。新会话从目标 SHA 建立
fresh clone `/tmp/courtwork-vl-reacceptance.VO5wt4/repo`，使用独立分支与端口；未参与实现或首轮
拒绝，未复用旧 clone、服务、进程或报告结论，未 push。

**裁决：✅ 放行 VERSIONAL-LANG-1。** 把活动 `.composer-shell:focus-within` 的获批 token 真改为
`transparent` 后，定点 Node **4/5 红**，完整 `site:guard` **76/77 红**，精确报 VL-L05；复位后
真实 Chat 输入 focus 的 computed composer 外框色等于 computed `--text-tertiary` 且非透明，定点
e2e **4/4**。档位账缺／错／双绑定、routine 复活、composer／preview／master-detail／ledger／
Settings 删除、schema 新装饰、Pages 三项、字体与 raw color 逃逸均逐件真实红并复原。

独立端口完整 desktop e2e **321/321（4.6m）**，覆盖 1180/1280/1440/1600/2400、双宗、收栏／
折叠、比较、focus、Settings 与真实 RiskList；根 tests **148 files / 1261 tests**、13 workspace
build、site guard **77/77**、lint/site build 全绿。fresh clone 从零编译并启动真实 Tauri/WKWebView，
native AX 明确聚焦 `AXTextArea / Message`，新摄 1600×900 Chat composer focus 帧未见溢出或左栏
残线。完整反例、hash、系统与截图见
`site/craft-evidence/VERSIONAL-LANG-1/reacceptance-b93796a/README.md`。

`45fb395..b93796a` 对 desktop/site 消费 CSS 零 diff；本复验只解除首轮守卫拒绝，不重裁消费值，
也不替终局 one-shot 放行。

---

# ACCEPTANCE: SKIN-R2 P2-L21 · 焦点态 Preview 首行安全区

日期：2026-07-20；对象：`b9c1bf140caba475baf028476d6fd72f32835aa0`。独立会话以 fresh clone
`/tmp/courtwork-p2-l21-acceptance.J4uM7P/repo`、独立端口 `19842–19845` 验收；未参与实现，未
复用实现进程或结论，未改消费值，未 push。

**裁决：✅ 放行 P2-L21。** 撤掉 `.workspace.focus-mode .preview-host-head` 的动态安全内距后，
1440×900 几何门 **0/1 红**，`backLeft=19 < chromeRight+8=147`；复原后 **1/1**。删除档位账
P2-L21 行精确报 `已签提案行缺失：P2-L21`，复原 PASS。P2/RP-2.5 当前定向谱实际为
**15/15（12.9s）**，不是旧 14 项数字。

浏览器后帧实测 chrome→back 9px、back→title 10px、title→meta 8px，root 1440=1440；fresh clone
另从空 cargo target 编译真实 Tauri/WKWebView，通过 native AX 进入 Focus（`Exit focus Esc`
value=1）并新摄 1440×900 暗宗原生窗口。肉眼复核交通灯、应用按钮、back、标题与计数零叠压。

全仓 lint、148 files / 1261 tests、13 workspace build（desktop 3580 modules）均绿。完整命令、
mutation、几何、系统、hash 与两帧见
`site/craft-evidence/SKIN-R2-OVERFLOW-2/acceptance-b9c1bf1/README.md`。本放行只覆盖获批 P2-L21
Focus 消费面，不扩大到其他状态或终局 one-shot。

---

# ACCEPTANCE: VERSIONAL-LANG-3 · 首轮独立验收

日期：2026-07-20；对象：`d32985ff255aa2b9535e2fbfab3fdd998d3bb638`（`920bdae` 实现 +
`d32985f` 截图字节门）。fresh clone `/tmp/courtwork-vl3-reacceptance.Li6FMD/repo`，独立端口
`19961–19963`，未复用实现树或服务，未 push。

**裁决：❌ 拒绝。** Pages 双宗、六枚截图 manifest、VL2 五线迁账及 Agent welcome/case/settings
三类标题成立；但签署的第四类 `.gallery-header h1` 在真实 `/visual-gallery.html` 深色浏览器环境
仍解析为浅宗 `rgb(35,43,56)`。该入口固定 light 且不装 theme controller；人工补
`data-theme=dark` 才变金，不能算自然运行成立。现有 `VL3-T01` 静态合同正向检查也漏掉 gallery，
`visual-gallery` e2e 只验结构，故完整 **322/322** 仍绿。

要求的六类反例均真实注入并红：深宗／Agent token 漂移、正文泥金、ledger 缺行／错档、VL2
routine 复活，以及 WebP 单字节漂移的 manifest actual/expected SHA。复原后 site guard 89/89、
root 148/1261、13 workspace build、lint/site build 与完整 e2e 322/322 全绿；1280 Pages 双宗均
overflow=0、brokenImages=0，标题／正文分色。完整证据见
`site/craft-evidence/VERSIONAL-LANG-3/acceptance-d32985f/README.md`。

复验前须让 gallery 入口自然消费 resolved dark theme 并加第四消费者 computed／静态门，或由产品
与架构撤回该白名单项；验收会话不得自行改契约。

---

# ACCEPTANCE: VERSIONAL-LANG-3 · gallery 自然深宗独立复验

日期：2026-07-20；对象：`39f1b1506cf3bb4b4d08778135c966f8e2d346f7`。新会话从目标 SHA 建立
fresh clone `/tmp/courtwork-vl3-gallery-reacceptance.9cWljT/repo`，使用独立分支和端口
`20041–20044`；未参与实现或首轮拒绝，未复用旧 clone、服务或进程，未 push。

**裁决：✅ 放行 VERSIONAL-LANG-3。** 自然访问 `/visual-gallery.html`，只模拟 OS dark、不手写
`data-theme`，根自动解析 `dark`；`.gallery-header h1` 为 `rgb(217, 174, 106)`，body 为
`rgb(228, 233, 241)`，恢复态定向 e2e 两轮 **2/2**。真实移除／破坏 `color-scheme light dark`、
theme controller import、安装调用时，VL3 合同各自 **13/14 红**并精确命中 `VL3-T01`；把泥金
标题期望改成浅宗墨色时 e2e **1/2 红**，received 明确仍为泥金且正文冷白。逐项复位后消费文件
零 diff。

独立全门：site guard **90/90**（报告 tip 918 active files）、lint、site build、13 workspace build
（desktop 3580 modules）、root tests **148 files / 1261 tests**、完整 desktop e2e
**323/323（3.2m）** 全绿。完整反例与命令记录见
`site/craft-evidence/VERSIONAL-LANG-3/reacceptance-39f1b15/README.md`。

本轮只关闭首轮 `d32985f` 的 gallery 自然深宗和前向守卫缺口；不重裁其他批次，不替终局
one-shot 放行，也不授权 push／部署。

---

# ACCEPTANCE: MD-CONVERGE-1+ · 同主体回炉复核

日期：2026-07-20；对象：修复提交 `2c9bbf1`（首轮受验 tip `32d2688`，本文件首节驳回报告原样保留）。
**修复与复核同主体，凭据为突变红证。** 本轮只订正首轮枚举的四处自述失真及同类已裁状态漂移，
未改变 parser、渲染 DOM、CSS、依赖、floor 或产品契约。

- CHAT-MD-TABLE-1 的单层手写解析器清点已明确标为历史快照；当前闭合数订正为 8、未闭合数为 2，
  有序列表旧边界③明确由 `<ol start>` 消解。
- `start=1` 测试名与真实断言统一为显式保留 `start="1"`；HTML 安全测试改用符号节名，不再引用漂移行号。
- 守卫短路自述订正为组件约 4.938s 后抛 `RangeError`；n=8000 同步冻结由子进程 1s alarm / exit 142
  单独证明，不再误写成组件时间断言命中。
- 兼容层既定裁决落痕：维持两条旧行为、转为常设，SPEC、实现注释和测试注释不再记为开放提案。
- 文案机器门恢复任一旧测试名后精确红（落盘退出码 **1**），还原后 **0**；恢复态
  `chat-markdown.test.ts` **44/44 passed**。

**裁决：✅ 放行 MD-CONVERGE-1+ 回炉尖端。** 本轮只解除首轮四项固定项阻断；完整 Playwright、
合并态 floor、真渲与发布仍由 RELEASE-VERIFY-1 后续阶段实跑决定。
# ACCEPTANCE: MODEL-CONFIG-EXPLICIT-1 · 独立验收

日期：2026-07-20；对象：`8af06f7875e067275866d04c300da6a8b119c522`（实现
`43b0f7f72c0e2c2e968f6805502bf7116e3b429b` + 架构裁决文档；基线 `86b2282`）。验收在
fresh clone `/tmp/courtwork-model-accept.4oyyhH/repo`、独立端口 `19671` 完成；未参与实现，未改
实现／SPEC／机器门，未 push。`packages/provider` 在受验 diff 中零改动，故本票只在 desktop
`ACCEPTANCE.md` 留一份报告，不复制第二份 provider 报告。

**裁决：❌ 驳回。** 现值行为在 Chromium 真渲下注入成立，但票面承诺的“任一路径静默即红”
没有机器证明：把 `useModelConfig` 中唯一的 `deps.notify(MODEL_CONFIG_RESET_NOTICE)` 调用替换为
无副作用语句后，`model-config.test.ts` 仍 **16/16**，desktop 完整单测仍 **61 files / 396 tests**
全绿（两命令 exit 0）。也就是说，五条真实降级可在一次未来改动中全部重新静默，而现有门不会红；
这直接违反实现就绪图验收项“五条降级路径逐条有可见痕迹（反例：任一路径静默即红）”及本单要求的
mutation 红证。突变已撤，目标源码恢复零 diff；验收会话按 fail-closed 只记录，不代修。

## 逐项实测

- **六条返回值原因成立。** 目标态 `model-config.test.ts` **16/16**（exit 0）；浏览器分别注入
  `provider_invalid`／`model_invalid`／`reasoning_invalid`／`unreadable`，返回值逐项只携对应原因；
  模拟 `localStorage` 在场且读取目标键抛 `SecurityError` 时返回
  `['storage_unavailable','no_stored_value']`；无值时返回 `['no_stored_value']`。
- **五条 UI 现值可见成立。** 上述前四项与 `storage_unavailable` 分别使用全新 BrowserContext 启动
  真应用，五次均在 `data-testid=system-open-feedback` 看到逐字
  `模型配置已重置为默认`；五次 `isUserVisibleDegradation=true`。这只证明现值效力，不解除缺门。
- **`no_stored_value` 裁决成立。** 单独无值时 700ms 内反馈节点计数 0，返回原因仍显式且
  `isUserVisibleDegradation=false`。Node 中把 `globalThis.localStorage` 明确置为 `undefined` 后加载，
  exit 0，返回只含 `no_stored_value`、零可见提示判据；`stripDegradation(loaded)` 与
  `DEFAULT_MODEL_CONFIG` JSON 字节相同。
- **reasoning 核心反例成立。** 损坏 `deep-ish` 真渲后 Settings 为 `Current: Standard`，返回
  `reasoning='standard'`，wire 为 `{thinking:{type:'disabled'}}`，且可见降级判据为真；合法 deep
  对照无反馈、Settings 为 `Current: Deep`、wire 为 `{thinking:{type:'enabled'}}`。
- **两消费点同步。** `App.tsx` 只经 `useModelConfig` 取纯 `ModelConfig`；应用入口 `src/main.tsx`
  的 `providerConfig` 经 `stripDegradation(loadModelConfig())`，降级标记不进 provider/work 链。
  `src/preview/gallery/main.tsx` 对 model-config 零消费，SPEC 对 rider 坐标的订正与实现一致。
- **旧正向断言已改。** `defaults and labels` 与 legacy custom/baseUrl 两例均改为先断显式原因、再断
  默认值；原 round-trip `expect(loadModelConfig()).toEqual(next)` 保留且目标态通过。
- **过手即拆／高水位成立。** `App.tsx` 基线 `2747` 行、目标 `2740` 行；
  `lint:app-highwater` 输出 `2740 行（上限 2740）`（exit 0）。外提文件确实承接两个 state、update 与
  一次性提示，App 只留一次 hook 调用。

## Mutation 与自述逐条对照

1. 把 `isUserVisibleDegradation` 恒改为 false，定向测试精确 **1 failed / 15 passed**（exit 1），命中
   reasoning 核心反例；撤除后恢复 **16/16**。这证明返回值到“可提示判据”已有红证。
2. 把唯一 UI 通知调用移除，定向 **16/16**、desktop 完整 **61 files / 396 tests** 仍绿（均 exit 0）。
   `rg` 亦确认提示常量无任何测试消费。故“提示真的抵达 UI”没有红证，是本轮驳回坐标：
   `apps/desktop/src/provider/use-model-config.ts` 的初次加载 effect 与缺失的对应测试／e2e。
3. SPEC 与提交自述称“本单不新写守卫测试证明未降级路径字节等同，只保留既有 round-trip 作证”，
   但实现 diff 实际新增了测试 `未降级路径逐字等同：返回值不得多出任何可枚举字段`，并新增
   `Object.keys` 与 `degradation` 两条断言。结论（字节等同）成立，前提自述不实，违反固定项
   “自述与实现逐条对照”；回炉须订正文档／提交可维护文案，提交历史本身不得改写。
4. 其余自述与实现相符：六值闭集、五显一静的裁决、storage 收窄、standard wire=disabled、两消费点、
   App 净减 7 行及 floor 未动，均由读码与实跑交叉确认。

## 命令与门状态

| 命令 | 结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | exit 0，1047 packages |
| `pnpm -r build` | exit 0；13/14 scope 成功，desktop 3584 modules |
| `pnpm exec vitest run packages/provider/src/quirk-profile.test.ts` | exit 0，1 file / 6 tests |
| `pnpm --filter @courtwork/desktop exec vitest run src/provider/model-config.test.ts` | 目标态 exit 0，1 file / 16 tests |
| `pnpm --filter @courtwork/desktop lint:app-highwater` | exit 0，2740/2740 |
| 独立 `:19671` Chromium 七 Context（五降级 + no-value + valid-deep） | exit 0；结果见上 |
| UI 通知移除突变后同一 model-config 定向测试 | **exit 0，16/16（不应绿）** |
| UI 通知移除突变后 desktop 完整单测 | **exit 0，61 files / 396 tests（不应绿）** |
| 撤突变后 model-config 定向复跑 | exit 0，16/16；实现文件 `git diff --exit-code`=0 |

fresh clone 初次在 workspace build 前跑 desktop 定向测试曾因 `@courtwork/provider` dist 尚未生成而
0-test exit 1；另一次从根 vitest 直接过滤 apps 路径因根 include 不含 apps 而 no-files exit 1。两者均为
验收编排错误，按治理要求如实披露；先 build、改用 desktop workspace 后目标态稳定 16/16，不归责本票。

发现缺门后按“任何红即停”没有继续跑 root lint/test、完整 Playwright 或合并态链；这些未跑项不得被
上游报告为通过。回炉要求：为五条用户可见降级逐条建立真正经过 `useModelConfig → notify → 真 UI` 的
反例门，至少删除通知调用时必红；同时订正“未新写字节等同守卫”的失真自述。修复 SHA 必须由另一
独立会话复验，本会话不验收自己的报告后续。

---

# ACCEPTANCE: MODEL-CONFIG-EXPLICIT-1 · 同主体回炉复核

日期：2026-07-20；对象：修复提交 `64044d6`（首轮受验 tip `8af06f7`，上节驳回报告原样保留）。
**修复与复核同主体，凭据为突变红证。** 本轮只补通知咬合测试与订正 SPEC 自述，不改变生产 UI、
降级闭集、提示文案、持久格式、provider wire、App.tsx 或门常量。

- 新增 `use-model-config.dom.test.ts`，直接观察 App 注入的 `showSystemFeedback` 回调缝：
  `provider_invalid` / `model_invalid` / `reasoning_invalid` / `unreadable` / `storage_unavailable`
  五条逐项断言通知一次且文案同源；`no_stored_value` 反向断言零通知。
- 删除 hook 内唯一 `deps.notify(...)` 后，五条正例精确 **5 failed / 1 passed**，唯一通过项正是
  `no_stored_value`；落盘退出码 **1**。还原后新门 **6/6**，与 model-config 原 16 例合跑 **22/22**。
- SPEC 已如实改为「保留既有 round-trip，同时新增 Object.keys/degradation 守卫」；临时恢复
  「本单不新写守卫测试」后文案门精确红（退出码 **1**），还原后 **0**。
- 提交前恢复态：desktop build 通过（3584 modules）、root lint 通过、desktop 完整单测
  **62 files / 402 tests passed**。

**裁决：✅ 放行 MODEL-CONFIG-EXPLICIT-1 回炉尖端。** 首轮“静默可回归且门不红”与自述失真均已
关闭；完整 Playwright、合并态高水位/floor、真渲和发布仍由 RELEASE-VERIFY-1 后续阶段实跑决定。

---

# ACCEPTANCE: FILE-PREVIEW-1 · 当前 main 独立验收

日期：2026-07-24；验收对象：`b0f667b2fd65abf60750036113286b7cf447251a`
（当时 `HEAD == main`）。验收会话未参与实现或回炉，在独立 detached clean worktree
`/private/tmp/courtwork-file-preview-accept.GaNJkC` 完成；Playwright 自起端口 `14871`（定向）
与 `14872`（完整），`reuseExistingServer=false`，未复用共享服务。未修改产品实现、SPEC、
`current.md` 或 implementation-readiness。

**裁决：❌ 当前 SHA 不放行清账。** FILE-PREVIEW-1 自身的功能链与架构边界通过：真实材料从唯一
「阅读」动作经 `resolveForProvider` 重验后才进入共用 `ReaderPane`，八项阻断闭集、demo/跨案隔离、
原件零写和旧窄轨退役反向锁均有读码、真渲与 mutation 红证。但目标 SHA 的全仓固定门
`pnpm lint` 为 **1 error / 0 warnings**：`site/craft-evidence/VERSIONAL-LANG-3/capture.mjs:91`
直接使用未声明全局 `localStorage`，触发 `no-undef`。该行由目标 HEAD 自身 `b0f667b` 引入，
不属于 FILE-PREVIEW 改动面；临时改为 `globalThis.localStorage` 后全仓 lint exit 0，撤回后目标树
恢复 clean。验收角色不得借 FILE-PREVIEW 越界提交站点修复，因此在该全量红灯清除并由独立会话
复跑前，不能把「范围内通过」写成「当前 main 可清账」。

## 真链、fail-closed 与原件零写

- `rg` 与 `git grep` 交叉得到：生产源码只有一个 `data-testid="material-read"`，唯一生产调用为
  `App.readMaterial → readMaterialAction → openMaterialReader → MaterialResolver.resolveForProvider`；
  ready 后唯一落点是 `materialSink.openReader → setReaderDoc/setPreviewOpen → <ReaderPane>`。
  Work 的另一处 `resolveForProvider` 消费属于 LEGAL-S3 binding，不是第二条 UI 阅读旁路。
- ready 真渲、needs_ocr 不开空面、content drift 不渲旧视图由独立端口定向 Playwright **6/6**
  覆盖；MaterialStore 单测另覆盖删除、reading drift、跨案、demo、not_found 与重启重验，
  reader 闭集映射逐项覆盖 rejected/revoked/out_of_scope 等其余 reason。八项 reason 由独立字面量
  冻结，不能靠被测 COPY 表给自己出考卷。
- 原件读取链为 `resolveForProvider → readOriginal → material_read_original → read_original →
  host_auth::read_in_grant → scoped_read → fs::read`。TS ready 探针断言 `readOriginal` 恰一次、
  `put` 与 `readSource` 零次（**1/1**）；Rust material 定向 **7/7** 覆盖 source-neutral roundtrip、
  跨案、删除与再读。该材料链的写入只发生在入库时的 app-data 记录，不在阅读动作，也不回写 grant root。
- 退役名的 `rg` 与 `git grep` 交叉结果均只命中门自身；`data-compact` 在生产源码零命中，
  `data-right-narrow` 的活消费只在 `workspace`。反向锁递归覆盖 `src/**/*.ts|tsx|css` 与
  `scripts/**/*.mjs` 并排除门自身，不再只是两文件存在锁。

## A–K 回炉条件逐项对照

| 项 | 当前实现对照 | 判定 |
| --- | --- | --- |
| A | 闭集期望为独立八值字面量；新增 `quarantined`（含 COPY）后 **1 failed / 12 passed**，撤回后复绿 | 通过 |
| B | `MaterialResolver` 返回 `Promise<ResolveResult>`；actions 复用同一声明，生产代码无 `Promise<unknown>`/结果强转 | 通过 |
| C | 历史基线 `2777` 行、回炉 tip `2746` 行；`git diff --numstat` 为 `+28/-59`，净减 31，与订正账一致；合并态门为当前 `2739/2739` | 通过 |
| D | 禁形锁覆盖整个生产源码集；向 `MaterialsZone.tsx` 注入退役名后静态门 exit 1 并精确报命中文件 | 通过 |
| E | demo 应用内阅读真入口是 `readerEntries`，`OriginalsZone` 是系统打开；承重隔离为非 grant 清空 `caseMaterials`、provider gate 的 demo 拒绝及 `readerEntries` 的 `isDemoCase` 三向，不把 CaseRail `!demo` 当安全边界 | 通过 |
| F | `verifyMaterialAction` 捕获宿主拒绝并映射 `unavailable`；验收动作探针含本例在内 **3/3** | 通过 |
| G | 两模块仍未合并，且 actions 无常驻单测；这与架构已登记的后续票 `MATERIAL-READER-MERGE-1` 一致。本轮探针证实现值，不擅自代建后续票 | 非本票阻断，债保留 |
| H | `app-shell` 的死 `data-right-narrow` 已删除；三处 E2E 均读取 `workspace`，活属性未误删 | 通过 |
| I | 回炉遗留连续空行已收口，当前 App 高水位与历史净减账均吻合 | 通过 |
| J | 「零出现反向锁」现准确指整个生产源码集；两种检索工具交叉只见门自身 | 通过 |
| K | 本轮完整 Playwright **327/327**，历史两轮 `325/326` 与父提交 `321/323` 红证不因此作废；`E2E-FLAKY-HOVER-1` 继续独立挂账，本报告不以一次绿替其销号 | 非本票阻断，债保留 |

## Mutation 红证

1. 阻断闭集新增 `quarantined` 并补 COPY：reader 定向 **1 failed / 12 passed**，只红闭集冻结例。
2. 删除 `resolveForProvider` 的 demo 首行守卫：行为例 **1 failed / 13 passed**（应为
   `out_of_scope`、实得 `not_found`），`lint:material` 同时精确红「必须拒绝 demo 案」。
3. 同时移除 browser host `get/readOriginal` 两层 caseId 比对：跨案例 **1 failed / 13 passed**，
   实际收到案 A 的 ready 正文而非 blocked，证明反例咬的是内容泄漏而非文案差异。
4. 向生产 `MaterialsZone.tsx` 注入旧窄轨标识：`lint:layout-converge` exit 1，命中文件准确。

四项均用 `apply_patch` 撤除；恢复态 `git diff --exit-code=0`，material 定向 **2 files / 26 tests**、
`lint:material` 与 `lint:layout-converge` 全部复绿。另行只读动作探针 **3/3**、ready 零写探针
**1/1** 均在运行后删除，未混入报告提交。

## 门禁原始数字

| 命令 | 结果 |
| --- | --- |
| `pnpm -r build` | exit 0；13/14 workspace scope，desktop 3584 modules |
| desktop material 定向 | 2 files / **26 tests passed** |
| `cargo test ... material_store` | **7 passed / 0 failed / 64 filtered** |
| FILE-PREVIEW 定向 Playwright `:14871` | **6/6 passed**（9.2s） |
| `pnpm --filter @courtwork/desktop test` | **62 files / 427 tests passed** |
| `pnpm test` | **148 files / 1261 tests passed** |
| `pnpm --filter @courtwork/desktop test:e2e`，独立 `:14872` | 静态链全绿；floor 327；完整 **327/327 passed**（3.3m） |
| `pnpm lint`（目标原样） | **exit 1；1 error / 0 warnings**，`capture.mjs:91 no-undef` |
| lint 单点归因探针（`globalThis.localStorage`，随后撤回） | **exit 0** |

冻结依赖第一次以 `--offline` 执行因 store 缺 tarball 失败，授权后同一 lockfile 安装成功；clean
worktree 在 workspace build 前跑 material-store 曾因 reading-view dist 尚不存在而 import 失败，
拓扑 build 后稳定复绿；第一次 Playwright 因 sandbox 禁止监听端口报 `EPERM`，获准后在独立端口
成功。这三项是验收编排／环境前置，不归责产品，但均未从数字中省略。

---

# ACCEPTANCE: MD-CONVERGE-1+ · 当前 main 治理复验

日期：2026-07-24；验收对象：`4998ab3bbbd98997976f0a0f423b080e300a71de`
（验收开始及报告前均为 `HEAD == main`）。本会话未参与实现或同主体回炉，在独立 detached clean
worktree `/private/tmp/courtwork-md-reaccept.fUAfUU` 完成；Playwright 自起端口 `19432`
（MD 定向）、`19433`（完整）与 `19434`（完整轮红例隔离复现），三轮均
`reuseExistingServer=false`，未复用共享服务。验收只追加本报告，未修改产品实现、SPEC 或全局状态文档。

**工单范围裁决：✅ 逻辑通过。治理裁决：❌ 当前 SHA 不放行清账。** remark/GFM 汇流、两条
legacy 兼容行为、32 KiB/256 游程预算、链接只渲染不导航、扩围五项与旧手写 parser 退役均由
读码、DOM 真渲和 mutation 红证成立；但 current-main 固定门仍有两类票外红：

1. `pnpm lint` 在 clean target 为 **1 error / 0 warnings**，唯一命中
   `site/craft-evidence/VERSIONAL-LANG-3/capture.mjs:91` 的 `localStorage no-undef`；排除该唯一文件
   后同一 target 的其余 ESLint 扫描 exit 0。该文件不在 MD 工单改动面，验收角色不得越界代修。
2. 独立端口完整 Playwright 静态链与 327 floor 全绿，但行为轮为 **324/327**：已登记
   `E2E-FLAKY-HOVER-1` 的 `global-verbs.spec.ts:7` 悬停透明度抖动一条，另有
   `goal2.spec.ts:54` 与 `host-auth.spec.ts:41` 两条在全量负载下卡于共用 `openWorkbench` 首屏等待。
   三条在新端口隔离复跑 **3/3** 绿，证明与 MD 触面无关，但按“一次绿不构成对 flaky 的反驳”，
   完整轮红仍必须如实保留，不能改写成全量通过。

因此本报告只证明 `MD-CONVERGE-1+` 的 current-main **范围逻辑成立**；在全仓 lint 红清零并由后续
current-main 验收取得固定门全绿前，不得把本结论列入已清账清单。

## 实现、依赖与边界对照

- `ChatMarkdown` 的解析入口为
  `unified().use(remarkParse).use(remarkGfm)`；desktop 与 reading-view 对
  `unified`/`remark-parse`/`remark-gfm` 的声明逐项同为 `^11.0.5`/`^11.0.0`/`^4.0.0`，
  实际解析版本逐项同为 `11.0.5`/`11.0.0`/`4.0.1`，没有第二套解析版本。
- 生产源码对 `parseMarkdownBlocks`、`splitTableRow`、`parseDelimiterRow`、`isTableStart`、
  `isHrLine`、`BLOCK_START`、旧 `MarkdownBlock`/`TableAlign` 导出的双工具检索均为零；
  `ReaderPane.renderInline` 是独立 reader 本地函数，不是退役 parser 消费点。
- 工单提交范围未触 `App.tsx` 或 `SessionHistory.tsx`；两处仍只按 `{ text: string }` 消费
  `ChatMarkdown`。链接落 `span.md-link[title]`，DOM 与 e2e 均锁定零 `<a>`；图片、公式、原始 HTML
  和未支持节点保留原文可见，不造导航、多模态或 HTML 执行能力。
- 32 KiB/256 精确边界探针实得：
  `32768 → null`、`32769 → length`、`256 连续字符 → null`、`257 → run`。
  超预算分支先于 `processor.parse` 返回完整纯文本与显式说明，未截断原文。

## Mutation 红证

| 反例 | 实际红证 | 恢复 |
| --- | --- | --- |
| 绕过 `unwrapSetext` 与 `truncateRaggedTable` 两件兼容层 | **2 failed / 42 passed**，精确红 Setext 与不齐表格两例 | 44/44 |
| 移除 `.use(remarkGfm)` | 定向 **3 failed / 41 skipped**，精确红 table / delete / task-list | 44/44 |
| 旁路长度门 | 定向 **1 failed / 43 skipped**，`length` 实得 `run` | 44/44 |
| 旁路通用游程门 | 下划线 600 游程定向 **1 failed / 43 skipped**，`run` 实得 `null` | 44/44 |
| 把 `span.md-link` 改成 `<a href>` | 定向 **1 failed / 43 skipped**，零导航断言实得一枚 anchor | 44/44 |

五项均以 `apply_patch` 注入并逐项撤回；恢复后 `git diff --check` 通过，报告前工作树产品源码零 diff。

## 门禁原始数字

| 命令 | 结果 |
| --- | --- |
| `pnpm --filter @courtwork/desktop exec vitest run src/chat/chat-markdown.test.ts` | **1 file / 44 tests passed** |
| MD + 历史折叠定向 Playwright，独立 `:19432` | **8/8 passed**（7.4s） |
| `pnpm test` | **149 files / 1291 tests passed** |
| `pnpm -r build` | exit 0；13/14 workspace scope 的 13 个 build 脚本全过；desktop 3584 modules |
| `pnpm --filter @courtwork/desktop test:e2e`，独立 `:19433` | 静态链全绿；floor 327；完整 **324 passed / 3 failed**（3.9m） |
| 完整轮三红隔离复跑，独立 `:19434` | **3/3 passed**（3.4s），只作归因，不抹除完整轮红 |
| `pnpm lint`（目标原样） | **exit 1；1 error / 0 warnings**，`capture.mjs:91 no-undef` |
| `eslint . --ignore-pattern .../capture.mjs`（票外归因） | exit 0 |

冻结依赖首次 `--offline` 因 store 缺 tarball 失败，按同一 lockfile 获准安装后成功；第一次定向
Playwright 在 workspace build 前因各包 `dist` 尚未生成而无法解析入口，立即中止，完成拓扑 build
后稳定 8/8；sandbox 首次禁止本地监听报 `EPERM`，获准后全部使用上述独立端口。这些是验收编排/
环境前置，不记作产品失败，也未从实录中省略。

---

# ACCEPTANCE: MODEL-CONFIG-EXPLICIT-1 · 当前 main 治理复验

日期：2026-07-24；验收对象：
`4998ab3bbbd98997976f0a0f423b080e300a71de`（接单时 `HEAD == main`，报告时仍为 `main`
祖先）。本会话未参与实现或同主体回炉，在独立 detached clean worktree
`/private/tmp/courtwork-model-config-BXrGwX` 完成；Playwright 自起端口
`:14982`、`:14983`、`:14984`、`:14985`、`:14986` 与完整轮 `:14990`，
全部 `reuseExistingServer=false`，未复用共享服务。报告前只快进吸收了两枚并行验收文档提交，
`4998ab3..1bbccb6` 的生产源码零变动；本报告只追加本文件，不改实现、SPEC、全局状态或机器门。

**裁决：❌ 驳回 MODEL-CONFIG-EXPLICIT-1，不放行治理清账。** 六值 reason、返回值类型、
`reasoning_invalid` 到 standard wire、五显一静判据及 hook 内通知调用的现值都成立；但权威票面要求的
Settings 域提示与“存储回落不得无痕”仍有两项真实生产缺口，且现有回炉门绕过了 App 实际接线与
defaultStore 的真实 localStorage fallback。即使票外 root lint 修复，本票也仍须返修并由另一会话复验。

## 两项票内阻断

### P0-1 · reset notice 没有进入 Settings 域，且 3.2 秒后不可追溯

实现就绪图对本票的硬约束是“提示 UI 仍优先落 Settings 域，App.tsx 侧改动收敛到取值处”。
现实现却把 `useModelConfig.notify` 接到 App 全局 `showSystemFeedback`；`SettingsPage` 没有接收
degradation/notice，也没有对应节点。独立真渲反例在启动前写入
`reasoning:'deep-ish'`：

1. 页面启动时底层 `system-open-feedback` 确实出现“模型配置已重置为默认”；
2. 立即打开 Settings，`settings-page` 子树内该文案 **count=0**；
3. Settings 保持打开，等待 3.4 秒后全局 feedback 也 **count=0**。

契约探针“Settings 内持续可见直到用户知悉或被新状态替代”在 `:14982` 为 **1 failed / 0 passed**；
改成只记录现实现的诊断探针在 `:14983` 为 **1/1 passed**，逐项证实“提示在 Settings 外、固定
3.2 秒消失”。这不是待架构拍板的新要求，而是现行就绪图已有落点未实现。

### P0-2 · localStorage 写失败时配置仍会跨重载静默蒸发

`ModelConfigDegradationReason` 对 `storage_unavailable` 的现行注释明确覆盖 localStorage
**读写**抛异常与内存回落；就绪图也点名“配置跨会话蒸发同样无痕”必须关闭。现实现的
`defaultStore.setItem` 捕获异常后只置 module-local sticky flag 并写 `memoryStore`，
`saveModelConfig` 仍返回 `void`；而 `useModelConfig` 只在首渲染调用一次 `loadModelConfig`，
本次写失败后没有任何路径读取该 sticky flag 或通知用户。

独立端口 `:14986` 只让 `courtwork.model-config.v1` 的 `Storage.setItem` 抛
`QuotaExceededError`，`getItem` 保持正常：

1. localStorage 原值为 Deep；用户在 Settings 选择 Standard，当前 UI 显示 Standard；
2. Settings 与全局 feedback 均无失败提示；
3. reload 后内存回落消失，Settings 静默恢复旧 Deep；
4. reload 后仍无任何降级提示。

契约正例“内存选择蒸发前显式告知” **1 failed**，同轮诊断“无提示且 reload 回旧值”
**1 passed**。这证明的是已发生的数据持久失败，不是对 `no_stored_value` 首次启动裁决的翻案；
无需新增“曾保存过”持久位，只需让现有写失败按现行 storage contract 可判且可见。

## 六值、类型与现值链逐项对照

- `ModelConfigDegradationReason` 是六值字面量联合：
  `no_stored_value | storage_unavailable | unreadable | provider_invalid |
  model_invalid | reasoning_invalid`；`LoadedModelConfig.degradation` 让调用方在类型层判别，
  正常 round-trip 不增加可枚举字段。
- `no_stored_value` 在返回值显式、单独出现时不通知，符合架构“首次启动不造假警报”裁决；
  其余五类经 `isUserVisibleDegradation` 为 true。
- 非法 `reasoning` 返回 `reasoning_invalid`、实际降为 `standard`，并沿
  `reasoningRequest` 发出 `{thinking:{type:'disabled'}}`；合法 Deep 对照为 `enabled`。
- `main.tsx` 通过 `stripDegradation(loadModelConfig())` 不把 UI 降级元数据送入
  provider/work；App 表面只保留一次 hook 调用，概念边界最小。
- 六个 reason 的生产 push/return 各自替换成另一合法 reason 后，`model-config.test.ts`
  分别为：no-value **3 failed / 13 passed**、provider **2/14**、model **1/15**、
  reasoning **1/15**、unreadable **1/15**、直接抛出的 storage **1/15**；逐项撤回后
  **16/16**。六值本身的判别门成立。
- 删除 hook 内唯一 `deps.notify(...)` 后，DOM 门精确 **5 failed / 1 passed**，唯一通过项为
  `no_stored_value`；撤回后 hook **6/6**，与 model-config 合跑 **22/22**。

## 两道回炉门的旁路实证

1. **App 真实接线未被门锁住。** 把 `App.tsx` 的
   `notify: (message) => showSystemFeedback(...)` 改为 `notify: () => undefined` 后，
   model + hook 定向仍 **22/22**、desktop 完整单测仍 **62 files / 427 tests**、
   `lint:app-highwater` 仍通过。现有 DOM 测试自造 Harness 并自行传入 spy，证明 hook 会调用
   callback，但没有证明 App 生产组合根真的把 callback 接到用户面。
2. **defaultStore 的真实 fallback 未被门锁住。** 把 `localStorage.getItem` catch 中的
   `storageFellBackToMemory=true` 改为 false 后，同样定向 **22/22**、desktop 完整单测
   **427/427** 全绿；临时真渲 storage probe 才在 `:14984` 精确红（提示节点不存在），恢复源码后
   `:14985` **1/1** 绿。现有 storage 单测注入的是“activeStore 自身直接抛”，没有经过
   defaultStore catch → memory fallback 这条生产路径。

以上 mutation 均以 `apply_patch` 逐项注入并逐项撤回；报告前产品源码与临时 e2e 探针
`git diff --exit-code=0`。

## 固定门与票外 root lint（与票内驳回分开）

| 命令 / 探针 | 结果 |
| --- | --- |
| `pnpm -r build` | exit 0；13/14 workspace scope 的 13 个 build 脚本全过；desktop 3584 modules |
| model + hook 定向恢复态 | **2 files / 22 tests passed** |
| `pnpm --filter @courtwork/desktop test` | **62 files / 427 tests passed** |
| `pnpm test` | **149 files / 1291 tests passed** |
| `pnpm --filter @courtwork/desktop test:e2e`，独立 `:14990` | 静态链全绿；floor 327；完整 **327/327 passed**（3.0m） |
| `pnpm lint`（clean target 原样） | **exit 1；1 error / 0 warnings**，仅 `capture.mjs:91 localStorage no-undef` |
| lint 单点归因探针（仅声明 `localStorage` global，随后撤回） | **exit 0** |

`site/craft-evidence/VERSIONAL-LANG-3/capture.mjs` 不在本票范围；clean target 的唯一 lint 红由
该文件造成，临时补其 global 声明后全仓 lint 立即绿，撤回后工作树恢复。它是独立治理阻断，
不能拿来遮住本票两个 P0，也不能由本验收会话借机代修。

冻结依赖首次在 sandbox 内因 registry 访问受限而中止，获准后同一 lockfile 以缓存包完成；
workspace build 前首次定向测试因 `@courtwork/provider` dist 尚未生成而 0-test 失败，拓扑 build
后稳定复绿；所有真渲均使用仓库自带 Playwright 与上述独立端口。这些是环境/验收编排事实，
不归责产品，也未从数字中省略。

---

# ACCEPTANCE: MODEL-CONFIG-EXPLICIT-1R · 独立回炉验收

日期：2026-07-24；验收对象：
`6c44946a5d772249e1eb5c96a090fbb21fb134f6`。本会话未参与 Terra 的实现，也未验收自己的
前身实现；在 detached clean worktree
`/private/tmp/courtwork-model-config-1r-WizZfA` 独立复核。Playwright 自起端口
`:15001`（恢复态 Settings 定向）、`:15002`—`:15005`（逐项 mutation）与
`:15009`（完整轮），均未复用共享 dev server。除本报告外未修改产品、SPEC、
`current.md` 或 implementation-readiness。

**工单范围裁决：✅ 放行 MODEL-CONFIG-EXPLICIT-1R 的功能逻辑。治理裁决：❌ 目标 SHA 暂不作
全仓清账。** 两个原 P0 均已关闭：读失败的 reset notice 与写失败的 save notice 都由 hook
持有，并且只在 Settings → Model 的唯一 inline `role=status` 节点呈现；真实
`Storage.prototype` getter/setter 回落、当前会话选择、跨 reload 的旧值恢复及无伪提示均由
独立浏览器实跑和 mutation 红证成立。全仓固定 `pnpm lint` 仍有本票范围外唯一
`capture.mjs:91 localStorage no-undef`；临时单点声明后 lint exit 0，撤回后目标树恢复 clean。
验收会话不借本票代修站点治理项，因此“本票逻辑放行”不等于“当前 SHA 全仓清账”。

## 契约、边界与真实交互

- `ModelConfigSaveResult` 精确为
  `{ persisted: true } | { persisted: false; reason: 'storage_unavailable' }`；
  `ModelConfigNotice` 精确为 reset/save 两支，message 分别由两枚精确中文常量约束。生产
  `writeDefaultStoreItem` 在真实 `localStorage.setItem` 抛错时写入本次会话内存但返回
  `persisted:false`，不把内存回落冒充跨会话持久化。
- `loadModelConfig` 先把 JSON 当 `unknown`，`null`、array、string、number、boolean 都精确归类
  `unreadable` 并整份 strip 回默认；验收临时补 plain `{}` 探针 **1/1**，精确得到唯一
  `provider_invalid`。常设聚焦单测 **29/29** 同时锁住 `no_stored_value` 不提示、降级元数据不入
  wire、写失败联合与成功保存清空 notice。
- getter 真链在启动前只让 model-config key 的真实 `Storage.prototype.getItem` 抛错：
  全局旧 reset toast 数量始终为零；等待 3.4 秒、切 Appearance→Model、关闭并重开 Settings 后，
  唯一 inline reset notice 仍在。setter 真链先以原生 API 保存 Deep，再只让该 key 的
  `setItem` 抛错：用户选择 Standard 后当前 summary 保持 Standard、save notice 超过 3.4 秒且
  切组后仍在，底层旧值仍是 Deep；reload 后恢复 Deep，且 notice 数量为零。
- 相对架构基线 `0074a826489b2195e31fa2bcd59968bd2c0aeb61` 的 diff 只有 9 个授权文件，
  共 **282 insertions / 67 deletions**；`main.tsx`、provider/work、Settings store、Tauri、
  schema、`current.md`、implementation-readiness 均零漂移。生产
  `settings-model-config-notice` 只有 SettingsPage 一处；App 不再把 reset notice 接入旧全局
  feedback。`App.tsx` diff 为 `+2/-2`，现值与门均为 **2739** 行。

## Mutation 红证与棘轮

| 反例 | 实际红证 |
| --- | --- |
| 删除 hook 返回值中的 `notice` | hook **7/7 failed**，五显、一静及写失败/成功清理全部咬住 |
| 删除 App → Settings 的 notice 透传 | getter/setter 定向 Playwright **2/2 failed**，节点不存在 |
| 删除 Settings 唯一 inline notice 节点 | getter/setter 定向 Playwright **2/2 failed**，节点不存在 |
| defaultStore 写失败却返回成功 | setter 真链 **1/1 failed**，精确因 save notice 缺失 |
| getter catch 吞掉 sticky fallback marker | getter 真链 **1/1 failed**，精确因 reset notice 缺失 |
| 成功保存后保留旧 save notice | hook 清理专测 **1/1 failed**，实得旧 notice 而非 `null` |
| App 临时增加一行 | 高水位门精确红：**2740 > 2739** |
| 临时不注册一条新增 e2e | floor 门精确红：**328 < 329** |

八项均以 `apply_patch` 独立注入、观察红灯后逐项撤回；完整轮前
`git diff --exit-code=0`，产品源码与临时探针均无残留。

## 门禁原始数字

| 命令 | 结果 |
| --- | --- |
| `pnpm -r build` | exit 0；13/14 workspace scope；desktop **3584 modules** |
| model-config + hook 聚焦单测 | **2 files / 29 tests passed** |
| Settings 定向 Playwright，独立 `:15001` | **8/8 passed**（19.8s） |
| `pnpm --filter @courtwork/desktop test` | **62 files / 434 tests passed** |
| `pnpm test` | **149 files / 1291 tests passed** |
| App 高水位 | **2739/2739**；临时 +1 行 mutation 精确红 |
| Playwright floor | **329/329**；临时少一例 mutation 精确红为 328 |
| `pnpm --filter @courtwork/desktop test:e2e`，独立 `:15009` | 静态链全绿；完整 **329/329 passed**（2.9m） |
| `pnpm lint`（clean target 原样） | **exit 1；1 error / 0 warnings**，仅 `capture.mjs:91 no-undef` |
| lint 单点归因探针（仅声明 `localStorage` global，随后撤回） | **exit 0** |

冻结依赖首次 `--offline` 因 pnpm store 缺 `@eslint/js` tarball 失败，获准后按同一 lockfile 安装
成功；第一次定向 Playwright 因 sandbox 禁止监听 `:15001` 报 `EPERM`，获准后所有浏览器轮均使用
上述独立端口成功。这两项是环境前置，不归责产品，也未从实录中省略。

---

# GOVERNANCE-CLEAR-1 · FILE / MD / MODEL current-main 独立清账验收（2026-07-24）

- **对象与独立性**：`main @ 94f83abbdc7b7ee51347af98ce70c274febc7656`；本会话未实现 FILE、MD 或 MODEL-1R，在 detached clean worktree `/private/tmp/courtwork-governance-clear-1-94f83ab` 完成，未 checkout/stash 共享树。
- **祖先与漂移**：目标即验收开始时的 `main`，`94f83ab..main` 无路径差异；五组实现和既有独立报告均为祖先，FILE / Markdown / Model-config 受验 production 面无票外行为漂移。
- **裁决：放行。** 仅追加验收事实，不改产品、SPEC、`current.md`、readiness 或门常量。

| 项 | 恢复态实跑 | mutation 红证 |
| --- | --- | --- |
| FILE | reader/store **2 files / 26**；Rust `cargo test material_store` **7/7**；端口 `14675`、`reuseExistingServer=false` focused Playwright **6/6** | 新增 `quarantined` 闭集值 **1 failed / 12 passed**；移除两层 caseId 校验，跨案 **1 failed / 13 passed** 且读到案 A 内容 |
| MD | `chat-markdown` **44/44**；端口 `14676`、同样自起服务的 Markdown + history Playwright **8/8** | 移除 `remarkGfm` 后 **8 failed / 36 passed**，table/delete/task-list 均红 |
| MODEL-1R | model-config + hook **29/29**；端口 `14677`、同样自起服务的 Settings Playwright **8/8** | setter fallback 伪报 `persisted:true` 后端口 `14674` 真链 **1/1 failed**，Settings inline status notice 缺失 |

每项均以 `apply_patch` 注入并反向恢复。共享固定门在同一 target 上只运行一次：`pnpm -r build` PASS（13/14 scope，desktop 3584 modules）、`pnpm lint` PASS、root Vitest **149 files / 1291 tests**、desktop Vitest **62 files / 434 tests**；完整 desktop Playwright 在独立端口 `14673`、`reuseExistingServer=false` 下 floor **329**、实跑 **329/329 passed**。

lint 承重反例：临时把 `capture.mjs` 退回 `/* global process */` 后，root lint **仅**报 `site/craft-evidence/VERSIONAL-LANG-3/capture.mjs:91:5 no-undef`；恢复 `localStorage` 声明后重回零错。报告前所有 mutation、临时探针与测试产物均已清除。
