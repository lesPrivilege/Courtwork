# 归档索引

历史材料唯一存放处。本索引是归档的**唯一入口**：续行会话按此定位历史证据，不逐文件回读原文。

## 使用纪律

归档材料是历史证据链，不是现行规范。`archive/` 全部内容不参与实现或验收，不得被现行文档、源码、脚本或 SPEC 直接引用（例外面只有一份枚举，在 `docs/README.md`「文档体例」的归档条，2026-08-05 收编为唯一枚举：ADR **来源段**、实现就绪图工单行、`engineering/` 工程报告、各层 `ACCEPTANCE.md` 验收记录，共四类可引 `archive/` 路径作历史线索；**ADR 正文、SPEC、源码与脚本一律不可**，要引改用「去处按归档索引的 `<条目名>` 条目定位」的转指形式）。归档结论——即便文内标有「架构定调」——只有经现行 ADR、SPEC 或就绪图工单逐条吸收后才具约束力；升格动作须经架构拍板并在现行文档留痕。归档报告中的行号、计数、版本号与外部事实是当时工作树的历史坐标，会漂移；当前验收只认 `docs/status/current.md` 与现行 SPEC/ACCEPTANCE，不得从归档恢复字段、状态或验收标准。reconnect 时架构层文档（`docs/README.md` 起）自足开工，仅在追查现行规则历史成因或核实调研结论是否被推翻时按本索引定位。

## 如何召回

只读本索引即可回答三问，无须打开任何归档件。

**(a) 归档里有什么。** 下方「条目」节穷举 `archive/` 全部在册材料，一件一条；条目名即唯一召回键。索引未收的 `archive/` 内容属未入册材料，引用前须先补条目。

**(b) 其中还有约束力的是什么。** 没有，一件都没有。`archive/` 恒不具约束力（见上「使用纪律」）。每条的「归档类别」只交代它当初为何离开现行链，**不是效力分级**——事件闭合、结论已被吸收、被后件取代，三类的现行效力同为零。区分它们只为一件事：判断该去哪里找现在的说法。事件闭合→找事件的现行台账；结论已被吸收→找吸收它的 ADR/SPEC；被后件取代→找后件。

**(c) 现行真值去哪里读。** 每条的「现行真值继承者」给出应读的现行文档路径。召回者读继承者，不读归档件本体；只有在追查现行规则的历史成因，或核实某条旧结论是否已被推翻时，才回读原文，且回读所得仍不构成依据。

**继承者缺位即死账。** 若某条的继承者写「未考」，或其所指路径已不存在，该条就是一笔死记录——它记着一件无人继承的旧结论。此时正确动作是**上报，请架构补记继承者或销条**；不得把归档件本身当继承者用，更不得据以恢复字段、状态或验收标准。

**「未考」的读法。** 本索引凡不能由仓内证据（归档件本体、`git log`、`docs/status/current.md`、`docs/architecture/implementation-readiness.md`）核实的字段一律写「未考」，绝不以推断填充。「未考」是缺证登记，不是「不存在」；要用该字段须自行取证。索引里一枚错的 SHA 比一枚缺的 SHA 更坏——缺的会让人去查，错的会把人送到错地方。

## 条目体例

每条七格，缺一即不合格：

1. **票号／事件名**——唯一召回键。
2. **起讫**——材料产生日 → 离开现行链（归档）日。
3. **SHA**——实现 tip／验收／合入三链；非实现工单无此三链者记「无」，另记该件的**入仓 commit** 作可核坐标。
4. **本件证明什么**——一句话。
5. **归档类别**——事件闭合 ／ 结论已被吸收 ／ 被后件取代，三选一，不混写。
6. **现行真值继承者**——召回者该去读的现行文档路径。
7. **已知失效点**——沿 `benchmark-openwork-2026-07-26.md` 的「时效订正」体例，记已坐实的漂移与死指针。

## 条目

### `handoffs/fable-pi-foundation-post-r5-2026-07-30.md`

- **票号／事件名**：Fable 长会话接棒（R5 后 Pi 基础线增量件）。
- **起讫**：2026-07-30 → 2026-07-30（写就即入仓 `archive/`）。
- **SHA**：实现／验收／合入 无（非实现工单）；入仓 `d3b84ec`（2026-07-30）。
- **本件证明什么**：R5 独立放行、Route A 裁定与 `PI-HOST-LOOP-1` 冻结之后，基础施工链、debug 制品支线、Fable/Sonnet/独立 Codex 分工与 GUI/Design/anti-slop 使用边界当时是如何排布的。
- **归档类别**：事件闭合（接棒事件已完成）。
- **现行真值继承者**：→ `docs/status/current.md`（能力与清账真源）＋ `docs/architecture/implementation-readiness.md`（开工依赖图）＋ `packages/pi-lane/SPEC.md`。本件自陈「召回索引，非权威契约」，实际能力、字段、依赖与开工条件本就只认这三处及 ADR/ACCEPTANCE。
- **已知失效点**：其架构锚 `main@45d97cb` 与「唯一基础施工链」排布已被后续清账推进——`docs/status/current.md` 记 `PI-HOST-LOOP-1`（合入 `653c121`）起至 `PI-READ-TOOLCALL-1`（合入 `ca7bf1c`）全链已合入。故本件的在途状态、施工序与停点一律不作现行事实。

### `handoffs/fable-pi-foundation-2026-07-29.md`

- **票号／事件名**：Fable 长会话接棒（首件）。
- **起讫**：2026-07-29 → 2026-07-30（次日被增量件取代）。
- **SHA**：实现／验收／合入 无（非实现工单）；入仓 `c60c9b3`（2026-07-29），末次改动 `6908009`（2026-07-30）。
- **本件证明什么**：Pi 基础线合流后的 authority 索引、串行收敛链、Fable/Sonnet 分工、GUI/Design 边界、调研召回与 OSS 复用闸门当时的形态。
- **归档类别**：被后件取代——`handoffs/fable-pi-foundation-post-r5-2026-07-30.md` 文内明写「它取代」本件。
- **现行真值继承者**：→ 上一条（post-R5 增量件）为接棒面的直接后件；现行真值仍只认 `docs/status/current.md` ＋ `docs/architecture/implementation-readiness.md`。
- **已知失效点**：后件已点名——本件的 R4 blocked、路线未裁、Host 不可开工三项状态过时。长会话纪律与历史成因仍可查阅。

### `handoffs/desktop-audit-handoff-2026-07-13.md`

- **票号／事件名**：独立审计交接（原 `apps/desktop/AUDIT-HANDOFF.md`）。
- **起讫**：2026-07-12 建、2026-07-13 更新 → 2026-07-28 移出活动 desktop 层。
- **SHA**：实现／验收／合入 无（非实现工单）；原件入仓 `28a1638`（2026-07-12），移入 `archive/` 于 `00c8dbd`（2026-07-28）。
- **本件证明什么**：`main@2e5c014` 基线上的视觉批坐标、当时的机器门数字、并行索引清理动作与 lint 假绿判例。
- **归档类别**：事件闭合（审计事件完成；文内自陈「审计完成后可删」）。
- **现行真值继承者**：→ `apps/desktop/ACCEPTANCE.md`（现行验收与门数字）＋ `docs/status/current.md`（现行能力）。
- **已知失效点**：件内「最新／待办」措辞正是其被移出活动层的原因——路径、数字与待办均不得恢复为当前事实；`2e5c014` 是旧基线。

### `status-handoffs-2026-07/handoff-2026-07-19.md`

- **票号／事件名**：架构会话交接快照 2026-07-19（前端皮层批收束 + 四则仅存于聊天的裁决落痕）。
- **起讫**：2026-07-19 → 2026-08-05（在途事项清零后移入 `archive/`）。
- **SHA**：实现／验收／合入 无（非实现工单）；入仓 `1e5500f`（2026-07-19，原位 `docs/status/`），末次改动 `459dd45`（2026-07-20）。移入 `archive/` 的提交**尚未落地**——当前为工作树暂存重命名（`R`），合入 SHA 待协调者提交后补记。
- **本件证明什么**：四则当时只存在于聊天里的架构裁决在此首次落痕——朱印记色（朱＝印记色非状态色，`line.*` 封闭集 5→6，「封闭是设计法，基数不是」）、阴影乙+补偿（残留门 `maxChannelDelta` 2→3 及四条补偿）、判例「对照实验须在复现条件下做」、以及四项未消费裁定的挂账与 D-5 更正。
- **归档类别**：事件闭合（B1/B2-0/B2-1/B3/B4/磁青宗批等八件在途项全部闭环合入后清零）。
- **现行真值继承者**：朱印记色 → `docs/design/courtwork-design.md:674`（`color.line.settled` 定值与「绿答何态、朱答谁按」分工，2026-07-19 拍板全文）；其接线面 → `apps/desktop/SPEC.md`（B4 记号批节，`:3037` 明引本件 §1 作史料线索）。残留门阈值与补偿 → `apps/desktop/tests/e2e/overlay-residue.ts:243`–`:246`（默认 `maxChannelDelta ?? 3` 与「放宽必带补偿」注）。对照实验判例 → `docs/engineering/workflow.md:176`。「素净即敬业」→ `docs/design/principles.md:13`（以中立声明形态存续，经 R-7 裁 ⓐ 关闭挂账）。
- **已知失效点**：**本条被现行文档在册引用**（`apps/desktop/SPEC.md:3037`），销条前须先解引。件内在途清单、下一轮开工序（B5 出票／LEGAL-FIELD-1／案头序）与「收尾动作交 Sol」诸项均已被后续排程覆盖，不得据以复原队列；B5 票面事后销号（见 `docs/architecture/implementation-readiness.md:166`），与件内「B5 出票」相冲，以就绪图为准。

### `status-handoffs-2026-07/handoff-2026-07-26.md`

- **票号／事件名**：架构会话交接 2026-07-26（远程 Cowork；索引与取舍记录）。
- **起讫**：2026-07-26 → 2026-08-05（在途事项清零后移入 `archive/`）。
- **SHA**：实现／验收／合入 无（非实现工单）；入仓 `3c5a886`（2026-07-27，原位 `docs/status/`）。移入 `archive/` 的提交尚未落地（工作树暂存重命名），合入 SHA 待协调者提交后补记。
- **本件证明什么**：`main@2cbd6bc` 当日终态、三笔清账坐标（`e473fbb`／`78655bd`／`64d48b4`）、待落痕四件的清单与散条登记，以及当日产品定调脉络（通用 work agent 全量功能为阶段目标、底座与契约二元升格为叙事判据句、甜点档自足为产品承诺面）。末节自陈是 ADR-021 蒸馏笔记本的人肉先例。
- **归档类别**：事件闭合（待落痕四件已于 2026-07-27 成文各自归档，散条已入权威层）。
- **现行真值继承者**：→ `docs/status/current.md`（当日清账与能力口径）＋ `docs/architecture/implementation-readiness.md`（票池与排序）。待落痕四件各自的现行去处见本索引 `arch-rulings-2026-07-26.md`／`adr-drafts-2026-07-26.md`／`benchmark-openwork-2026-07-26.md`／`pi-ecosystem-2026-07-26.md` 四条。蒸馏先例 → `docs/decisions/ADR-021-dossier-work-semantics.md`。
- **已知失效点（2026-08-05 登记）**：**§二所指 `docs/status/pending-2026-07-26/` 目录已不存在**——该批四件已于 2026-07-27 成文落痕并各自归档，本索引有对应条目；件内指向 pending 目录的路径此后是**死指针**，不得据以复原（同一事实已由 `docs/status/current.md` 前置登记）。§四「下一序」四项与 `main@2cbd6bc` 均为当日坐标，早经推进。

### `status-handoffs-2026-07/handoff-2026-07-27.md`

- **票号／事件名**：架构会话收束交接 2026-07-27（当日清账八笔索引）。
- **起讫**：2026-07-27 → 2026-08-05（在途事项清零后移入 `archive/`）。
- **SHA**：实现／验收／合入 无（非实现工单）；入仓 `e6284be`（2026-07-27，原位 `docs/status/`），末次改动 `00c8dbd`（2026-07-28，即件头续行订正）。移入 `archive/` 的提交尚未落地（工作树暂存重命名），合入 SHA 待协调者提交后补记。
- **本件证明什么**：当日八笔清账的提交坐标（`CONTRACT-TRACE-1`／2026-07-26 落痕批／`DEBT-DOSSIER-1`／`SANDBOX-PROBE-1`／pi lane 立线／`PANEL-BLUEPRINT-1` matrix 首枚／`COMPOSER-SPEC-SYNC-1`／调研三批归档），以及当日新立的六条纪律（含 Playwright 单链排程律、「数字取自哪个 tip」、无 scope npm 名占位包属供应链陷阱）。
- **归档类别**：事件闭合（当日事项收束；提交索引已被 `current.md` 源流表吸收）。
- **现行真值继承者**：→ `docs/status/current.md:73`「已发布与已清账工单源流」（清账真源）＋ `docs/architecture/implementation-readiness.md`（队列与锁）。`SANDBOX-PROBE-1` 证据 → `docs/engineering/sandbox-probe-1.md`（现行工程文档）。当日纪律 → `docs/engineering/workflow.md`。
- **已知失效点**：件头已自带 **2026-07-28 续行订正**——§二、§三的开放队列已由现行就绪图重排、`PI-LANE-2` 总包名退役；§四「乙路定谳」因违反 ADR-018 外采纪律**已撤销**，只保留 Seatbelt 探测证据。不得从本件恢复排程或沙箱选型。§三欠单中「`PI-LANE` 真 key 端到端复核」**至今未执行**，该笔债已由 `docs/status/current.md` 前置登记以免随本件归档而失落。

### `headless-accept-probe-2026-08-05.patch`

- **票号／事件名**：`PI-BASE-HEADLESS-ACCEPT` 验收会话 scratch 装置（`mod headless_accept`）。
- **起讫**：2026-08-05 → 2026-08-05（当日写就、当日归档）。
- **SHA**：实现／验收／合入 **无**——本件从未进入提交史，是未跟踪的一次性 patch 文件（466 行新增，`mod tests` 内新模块）。后继票的三链见继承者格。
- **本件证明什么**：它是「合成 harness 当时不存在」的实物证据。验收会话为跑 `PI-BASE-HEADLESS-ACCEPT` 六格矩阵，必须自建 466 行 Rust scaffold 才能把「真 Agent↔真 stdio wire↔真 `WorkspaceFsHost`（注入 Approve driver）↔真盘＋restart」这条链拉起来——而该票是纯验收票（不实施契约修补）。自建即越界，且建成后仍因缺真 DeepSeek key 无法推进。这一缺口实证就是新立 `PI-HEADLESS-HARNESS-1` 的依据。
- **归档类别**：被后件取代——`PI-HEADLESS-HARNESS-1` 的正式 harness 已落地合入。
- **现行真值继承者**：→ `packages/pi-lane/specs/PI-HEADLESS-HARNESS-1.md`（票面）＋ harness 本体 `apps/desktop/src-tauri/src/pi_loop.rs:8567`（「`PI-HEADLESS-HARNESS-1` 组件B：headless 合成 harness」）；立票理由与范围两件 → `docs/architecture/implementation-readiness.md:208`。据 `docs/status/current.md`，该票验收 PASS `b055d7a`／合入 `56559e7`。
- **已知失效点**：patch 锚在 `apps/desktop/src-tauri/src/pi_loop.rs` 的 `@@ -9235,4 +9235,470 @@`（blob `b2ccfb9..87baca2`），该基线已被后续多票改写，**patch 不可再 apply**。其自建的 `EnvKey`／`RecordingApprover` 桩与落地 harness 的显式注入形态（ADR-022 六-C 的 `ScriptedApprove`）不同，不得据以推断现行注入契约；凭证读法（只读 `COURTWORK_ACCEPT_DEEPSEEK_KEY`、源码零字面量）是当时写法，非现行契约。**真 DeepSeek key 前置至今未解除**（`docs/status/current.md` 在册）。

### `pi-lane-receipts-2026-07-28--08-05/`（目录说明，五枚条目共用）

**这五条是同一批**：2026-08-05 从 `packages/pi-lane/specs/` 移出的 24 份**已清账工单独占回执**。
它们当初是「一票一件、实现会话独占、不争用父级 SPEC」的过程账；票清账后，其载重结论已分别进入
`packages/pi-lane/SPEC.md`、`packages/pi-lane/ACCEPTANCE.md`、`docs/decisions/ADR-022-pi-lane.md`
与实现就绪图，件本身只剩历史证据价值，故整批入档。**留在 `specs/` 的十一份不属本批**——它们各自
仍在承载未消费的移交、未偿项或源码点名引用（清单见 `packages/pi-lane/SPEC.md`「并行票独占回执」节）。

**目录名注（须先读）**：目录名里的 `2026-07-08` 是批次代号，**不是材料日期**——本批材料实际产生于
2026-07-28 至 2026-08-05，归档日为 2026-08-05。各条「起讫」格记的才是真日期，取日期一律看那里。

**SHA 坐标通则（本批五条共用，2026-08-05 于 `5807adc` 逐枚 `git merge-base --is-ancestor` 实测）**：
被拒轮次的实现/回执/验收 SHA **多数不是现行 `main` 的祖先**——它们住在未合入的 worktree 分支上，
只以 patch-id 等同随最终放行轮入树（`docs/status/current.md` 语）。这些 SHA 本地对象可达、可
`git show`，但**不能用来判定内容是否在树内**；判定内容在树内一律以现行 `main` 的文件与门为准，
`no-ff` 合入 SHA 才是进树锚点。下方各表逐枚标注 `祖先` / `非祖先`，不作推断。

### `pi-lane-receipts-2026-07-28--08-05/PI-WRITE-PROOF-1.md`

- **票号／事件名**：`PI-WRITE-PROOF-1`（package/headless 层 write characterization，与 STDIO／分发三票并行）。
- **起讫**：2026-07-28 → 2026-08-05。
- **SHA**：实现 `c0b7989`／回执 `3d45775`／验收修复 `4fee6d2`／放行 `9caa8ae`／no-ff 合入 `7216b2f`——五枚**全部为现行 `main` 祖先**。入仓 `00c8dbd`（2026-07-28），末次改动 `3d45775`（2026-07-28）。
- **本件证明什么**：直接实例化上游 `createWriteTool()` 的极薄 binder 在注入 port 下的逐项 characterization——nested `.md` create、existing overwrite、精确回读、`prepareArguments` 是唯一早于上游 coercion 的接缝、Unicode「4 code units ≠ 10 UTF-8 bytes」、pre/post-write abort、同 env queue vs per-call env 无共享，以及产品 workspace write 的 basename 规则（扩展名前至少一个字符、ASCII 大小写不敏感的 `.md`，恰为 `.md` 必拒）。件内另记本票明确只到 package/headless proof，不宣称产品可达。
- **归档类别**：结论已被吸收（契约面进 `packages/pi-lane/SPEC.md` §九 `PI-WRITE-PROOF-1` 节与 ADR-022 决定六；实现已随 `7216b2f` 入树）。
- **现行真值继承者**：→ `packages/pi-lane/SPEC.md`（write 面现行契约与已知边界）＋ `packages/pi-lane/ACCEPTANCE.md`（该票验收记录，`:403` 起）＋ `docs/architecture/implementation-readiness.md` 同名行（三链 SHA 与退出证据）。产品线 write 的**现行**形态不在本件里，在 `PI-WRITE-HOST-1` 之后的 SPEC/ACCEPTANCE。
- **已知失效点**：件内「只到 package/headless proof、未由 `index.ts`/产品 host 装配」的自陈**已过时**——`PI-WRITE-HOST-1`（合入 `66862ef`）之后 host-mediated write 已在产品线落地。件内 `basename 恰 .md 必拒` 的旧放行口径经验收修复才收紧，读本件须连读 `ACCEPTANCE.md:404` 起的修复记录。件内到父级 SPEC/ADR 的相对链接（`../SPEC.md` 等）随移档失效。

### `pi-lane-receipts-2026-07-28--08-05/PI-CODE-STDIO-1*.md`（三轮：`1` / `1R` / `1R2`）

- **票号／事件名**：`PI-CODE-STDIO-1` 及其两轮返修——产品 stdio wire 与状态机（ADR-022 六-B.1／B.2）。
- **起讫**：2026-07-28 → 2026-08-05（`1R2` 末次改动 2026-07-29）。
- **SHA**：逐轮如下（`祖先` 指现行 `main` 祖先）。

  | 轮 | 实现 | 回执 | 验收 | 判定 | 入仓 |
  |---|---|---|---|---|---|
  | `1` | `79a13d2`（非祖先） | `223185e`（非祖先） | 最小修复 `0ffae46`、报告 `cfb4715`（均非祖先） | **REJECT**（3 blockers + 2 majors） | `00c8dbd` |
  | `1R` | `9f9255b`（非祖先） | `7c8c9c3`（非祖先） | `4df2e84`（非祖先） | **REJECT**（原 227 绿测外注入 9 枚 production 反例全红） | `a4d32bd` |
  | `1R2` | `7686dfd`（祖先） | `710faaa`（祖先） | 验收修复 `43b3796`、放行 `cc5faf5`（均祖先） | **PASS**，no-ff 合入 `db4f360`（祖先） | `74d76f3` |

- **本件证明什么**：strict discriminated union wire、per-direction seq、1 MiB framing、可注入 driver 的逐项证据链；以及两轮拒绝各自的决定性根因——首轮 message 泄漏／pending effect 丢失／同步重入复活／value correlation 缺失／retryability 漏门；二轮 tc registry 未真正绑定 `{requestId,toolName,capability,phase}` 且普通 finish 可抹已确认 effect。1R2 落 request-scoped 单向 tc registry 与每 prompt 至多一枚 active tc。件内另存两条方法判例的原始现场：`JSON.parse` 拦不住重复 member（reviver 的 `source` 只对 primitive 可见）、`sed` 变异必须带命中校验。
- **归档类别**：结论已被吸收（wire 与状态机契约全文在 ADR-022 六-B；实现随 `db4f360` 入树）。
- **现行真值继承者**：→ `docs/decisions/ADR-022-pi-lane.md` 六-B.1／六-B.2（wire 标量、状态机与逐包 payload 的唯一现行契约）＋ `packages/pi-lane/SPEC.md`「并行相邻票与合流门」节＋ `packages/pi-lane/ACCEPTANCE.md`（三轮验收记录）＋ 就绪图同名三行。
- **已知失效点**：`1` 与 `1R` 两轮**整轮被拒**，其结论、计数与「已闭合」自述一律不作事实，只作拒绝根因的证据；不得从被拒轮恢复任何判据。`1R2` 之后 wire 与状态机又经 `PI-HOST-LOOP-1` 七轮、`PI-READ-TOOLCALL-1`、`PI-TOOLCALL-BINDING-1`、`PI-UNKNOWN-TOOL-1` 多次收紧——件内的闭集、门与投影口径均为当时值，现行只认 ADR-022 与源码。

### `pi-lane-receipts-2026-07-28--08-05/PI-SIDECAR-DIST-1*.md`（六轮 + `-1R5-ACCEPT` 验收令）

- **票号／事件名**：`PI-SIDECAR-DIST-1` 及五轮返修与架构冻结的验收令——Node sidecar 分发路线实测（ADR-022 六-E）。
- **起讫**：2026-07-28 → 2026-08-05。
- **SHA**：逐轮如下。

  | 轮 | 实现 | 回执 | 验收 | 判定 | 入仓 |
  |---|---|---|---|---|---|
  | `1` | `70e6482`（非祖先） | `01ff5e7`／订正 `3207b27`（非祖先） | 报告 `9b8142f`（非祖先） | **REJECT**（probe 假绿、缺产物可跳过、Node archive 未过 SHA 门） | `00c8dbd` |
  | `1R` | `ba71df8`（非祖先） | `61c2b09`（非祖先） | `f261347`（非祖先） | **REJECT**（多制品、首坏后正 identity drift、`[null,null]` SHA） | `3737df3` |
  | `1R2` | `42858b2`（非祖先） | `33100d8`（非祖先） | fix-by-acceptance `850fa11`、报告 `9ebb92a`（非祖先） | **REJECT**（entitlement 可提取性未登记为可复现前提等） | `deb9d6b` |
  | `1R3` | `7b4184b`（非祖先） | `47fd7e5`（非祖先） | `eb71d6f`（非祖先） | **REJECT**（host/runtime identity 未进 hard verdict、DER 判读等六枚） | `4e2d07a` |
  | `1R4` | `891c23d`（非祖先） | `07d2dbc`（非祖先） | 验收 SHA **未考** | **REJECT**（三项 P1） | `efcd0ab` |
  | `1R5` | 见回执 | exact target `6cdb9ba`（祖先） | `0b0d985`（祖先） | **PASS**，no-ff 合入 `5aef222`（祖先） | `9b8705f` |
  | `-1R5-ACCEPT` | 架构冻结的验收令，非实现件 | — | — | 冻结 target `6cdb9ba`、允许面、反例与 mutation（逐组项数 8/5/14/23/15/11＝76＝68 负注入 + 8 对照） | `71660f1` |

- **本件证明什么**：两条分发路线（Node 22 LTS runtime + sealed JS bundle ／ Node SEA）的逐项对照证据、库存闭集、冷启与可复现性读数、签名与 entitlements 四层证据模型，以及**四次独立拒绝逐层把实验装置从「红了」推到「红得准确」**的全过程。件内另存多条方法判例的原始现场：判定层与被测同源＝零区分力；首红要落既有缺陷；`tar` 过 ≠ 身份对；静默零（空枚举与全通过同形）一律硬失败。
- **归档类别**：结论已被吸收（路线裁定已作出——Route A `node22-runtime-sealed-cjs-v1` 为现行 default）。
- **现行真值继承者**：→ `docs/decisions/ADR-022-pi-lane.md`「2026-07-30 路线裁定：Route A 为现行 default」节＋六-E＋ `packages/pi-lane/SPEC.md:663` 起（Route A 现行 default、官方 Node v22.23.1、tracked manifest）＋ **`docs/engineering/pi-sidecar-dist-1.md`（现行工程文档，实测正文的真源——本批回执只写链接与结论，正文从不在回执里）**＋ 就绪图六行。
- **已知失效点**：`1`…`1R4` 五轮**整轮被拒**，其读数、路线建议（尤其首轮的 SEA-default 建议，已被 ADR-022 明文撤销消费资格）与「已闭合」自述一律不作事实。`1R5` 的放行范围只到分发实验本身，不代表 Host、GUI、debug DMG 或公开发行成立。`PI-SIDECAR-RELEASE-1` 仍 parked。`1R2` 的 entitlement 可提取性依验收机而异（验收机 `codesign -d --entitlements` stdout 0 字节、实现机 568 字节），凡引其签名读数须连读该前提。

### `pi-lane-receipts-2026-07-28--08-05/PI-HOST-LOOP-1*.md`（原票 + `1R`…`1R7`，八份）

- **票号／事件名**：`PI-HOST-LOOP-1` 及七轮返修合同——Rust 侧 pi loop host（fresh/resume 全序、容器原语、closed codec、耐久 journal）。
- **起讫**：2026-07-30 → 2026-08-05。
- **SHA**：逐轮如下。原票是 680 行的专属冻结件；`1R`…`1R7` 是逐轮返修**合同**（架构冻结闭口范围），不是实现回执。

  | 轮 | 该轮 target（实现 tip／回执） | 独立验收 | 判定 | 入仓 |
  |---|---|---|---|---|
  | `1`（原票） | `0d4799c`（非祖先） | `314117d`（非祖先） | **REJECT**（决定性＝凭证读取先于 route 身份门；另十枚） | `2f9fd2d` |
  | `1R` | `fa9e2f8`（非祖先） | `427f4fa`（非祖先） | **REJECT**（`aborted` 未走 canceled、三项上界后置于 spawn 等四类） | `c418b2c` |
  | `1R2` | `1ab9c03`（非祖先） | `23f8339`（非祖先） | **REJECT**（两枚 blocker 皆同批判据的未点名同族成员） | `40d818d` |
  | `1R3` | `51369e4`（非祖先） | `a0644cd`（非祖先） | **REJECT**（扫描轴按 `MAX_*` 枚举而族定义是受验输入） | `7992b3a` |
  | `1R4` | `d4163df`（非祖先） | `5271342`／澄清 `be0d9ad`（非祖先） | **REJECT**（扫描轴仍语法白名单，协议既有 NUL 门不在轴上） | `157407a` |
  | `1R5` | `a082257`（非祖先） | `9d4013e`（非祖先） | **REJECT**（`body.find("return Err(")` 字面量定义种群，turbofish 出圈） | `bb20cef` |
  | `1R6` | `57a19a5`（非祖先） | `cd3810a`（非祖先） | **REJECT**（`start_inner` 在编码前调会写盘的 `load_session`） | `4dc8e85` |
  | `1R7` | 实现 `f915eea`／回执 `744c070`（均祖先） | `6da6aea`（祖先） | **PASS**，no-ff 合入 `653c121`（祖先） | `497a288` |

- **本件证明什么**：Host 读面基础的全部结构性判据，以及**六轮独立拒绝逐层收窄同一个错误家族**的完整现场——十一项闭口 → 四项闭口 → 按族闭口 → 扫描轴对齐族谓词 → NUL 前置与 fail-closed 扫描 → encode-before-effect → 恢复分相（`load_session` 拆读/计划与 durable apply，apply 后置于编码成功）。件内另存数条跨工单方法判例的原始现场：闭口按族不按验收点名的实例；扫描谓词与族定义同宽；名字清单换材质仍是白名单，病根＝unknown→跳过；同步消灭优于同步验证；「撤除断言→红」不是成立的 mutation 形状。
- **归档类别**：结论已被吸收（八项跨层裁点全文在 ADR-022「`PI-HOST-LOOP-1` 开工补拍」节与修订记录；实现随 `653c121` 入树）。
- **现行真值继承者**：→ `docs/decisions/ADR-022-pi-lane.md`「`PI-HOST-LOOP-1` 开工补拍」节（八项跨层裁点）与「修订记录」（逐轮拒绝与裁定全文）＋ `apps/desktop/src-tauri/src/pi_loop*.rs`（实现真源，模块头逐条点名票面章节）＋ `packages/pi-lane/ACCEPTANCE.md`（逐轮验收记录）＋ `docs/status/current.md`「2026-08-03 pi Host loop 收束」行＋ 就绪图八行。
- **已知失效点**：`1`…`1R6` 七轮**整轮被拒**，其闭口清单、计数与自证一律不作事实。`1R7` 放行范围**只到 Host 读面基础**，不及 WRITE／GUI／headless 总验与真 key 端到端。此后 journal 耐久面又经 `PI-HOST-JOURNAL-1`（合入 `62047d5`）三缺陷修复、tool↔capability 绑定经 `PI-TOOLCALL-BINDING-1` 修回归——件内 journal 与 tc 口径均为当时值。`1R7` §五冻结后的四则裁定随票受理，其中「永久关闭态的 crash fold 在 start 路径不再落盘」是如实声明的能力删减，不是缺陷。

### `pi-lane-receipts-2026-07-28--08-05/PI-WRITE-HOST-1-STAGE2…STAGE6.md`（五份分段回执）

- **票号／事件名**：`PI-WRITE-HOST-1` 七段施工链的中段回执（开工序②…序⑥）。
- **起讫**：2026-08-04 → 2026-08-05（同批入仓、同批归档，每份一次写就再未改动）。
- **SHA**：五份**各自即其分段实现提交**，全部为现行 `main` 祖先。

  | 件 | 分段 | 提交（＝入仓＝末次改动） | 基线 |
  |---|---|---|---|
  | `-STAGE2` | 开工序② 五枚前向债前置门＋电池／D1 增行 | `32ad737` | 序① |
  | `-STAGE3` | 开工序③ `HostRequest` 臂四段落账＋假 effect 注入座 | `f9e6a1b` | `32ad737` |
  | `-STAGE4` | 开工序④ cap-std 真落盘＋`TempFile` replace＋持久化屏障 | `dcbd53f` | `f9e6a1b` |
  | `-STAGE5` | 开工序⑤ Node 五处装配＋`md-work-v1`＋握手闭集加 `workspace_write` | `5ba36f1` | `dcbd53f` |
  | `-STAGE6` | 开工序⑥ 裁定A 落地＋双端 golden＋`proposalHash` 债清偿＋矩阵收口 | `cc81eaa` | `5ba36f1` |

  全票三链：序⑦总表回执 `c2b395d`、独立验收 `4bd2628` **PASS**、no-ff 合入 `66862ef`（均祖先）。
- **本件证明什么**：write 链逐段落地的过程账与段间移交项——每段件头写明其消费的上一段移交条目，故五份连读即该票的施工时序。载重内容（durable-before-effect 四段账、cap-std 真落盘、`md-work-v1` 与握手闭集扩员、双端 golden）已进 SPEC/ACCEPTANCE。
- **归档类别**：事件闭合（施工链已完成并合入；段间移交在序⑦总表收口）。
- **现行真值继承者**：→ **`packages/pi-lane/specs/PI-WRITE-HOST-1-STAGE7.md`（序⑦总表，仍在 `specs/`，是七段链的验收读序与偏离总账，未归档）**＋ `packages/pi-lane/SPEC.md`（write 面现行契约）＋ `packages/pi-lane/ACCEPTANCE.md`（该票验收记录）＋ `docs/status/current.md`（能力行与制品身份）。同票另有两份未归档前置件仍在 `specs/`：`-PREFLIGHT`（措辞按此钉死）与 `-RECON`（后继会话直接消费的测绘真源）。
- **已知失效点**：五份记的是**分段中途态**，段内「当前/现值/待办」一律不是终态——终态只认序⑦总表与合入后的 SPEC/ACCEPTANCE。件内引用的分支 `claude/pi-write-host-1` 已随清账可删。`-STAGE5`／`-STAGE6` 里的制品身份值（bundle 字节与 sha256）是当时实测，此后随任何 TS 改动漂移，现行值见 `packages/pi-lane/ACCEPTANCE.md`。

### `research-loopx-matter-memory-2026-08-03.md`

- **票号／事件名**：LoopX goal/memory 核查与消费裁定。
- **起讫**：2026-08-03 → 2026-08-03。
- **SHA**：实现／验收／合入 无（调研件）；入仓 `2af80da`（2026-08-03）。
- **本件证明什么**：只读核查 `huangruiteng/loopx@91d8ed0`（MIT，goal 而非 session 为持久单位）得出九条消费裁定——借理念四（工作语义核四字段、编译预算回执、回执准入形态、记忆写入网关与陈旧化显式态）、后置登记一（quota 状态机作 scheduled ADR 正面参照）、结构性不借二（出程文本注入、开关后免逐次授权）、显式不采纳一（逐记录可训字段）、核实提醒一（其并发写安全未完备）。
- **归档类别**：结论已被吸收。
- **现行真值继承者**：→ `docs/architecture/implementation-readiness.md:383`（`DOSSIER-FLOW-1` 行，明写 loopx 素材「只作 SPEC 冻结参照」）＋ `:496`（memory 演进 ADR 议题池，记记忆写入网关谱系与陈旧化十态、quota 状态机作 scheduled ADR 正面参照）。
- **已知失效点**：件内自陈两项——star 数两读不一致故不采信，JS 渲染页数据缺口如实登记。结论锚定 `91d8ed0`，随对象仓演进折旧。

### `research-design-anti-slop-recall-2026-07-30.md`

- **票号／事件名**：Fable Design／GUI 召回补记（anti-slop）。
- **起讫**：2026-07-30 → 2026-07-30。
- **SHA**：实现／验收／合入 无（调研件）；入仓 `6908009`（2026-07-30）。
- **本件证明什么**：核读 René Wang `Field Notes`、仓外 `anti-ai-slop-kit` 与两份 `.dc.html` 后的取舍——只借 before/after 决策日志、「3 借 3 拒」参考、状态矩阵与人工 anti-slop 问题集；拒绝复制 token、prompt、法律布局、截图与外部皮层（kit 整包无可复用许可）。附 GUI/OSS 证据状态速查与 Fable 固定召回顺序。
- **归档类别**：结论已被吸收（件自陈「是归档输入，不替代 `docs/design/` 或当票上游复核」）。
- **现行真值继承者**：→ `docs/design/`（`principles.md`／`courtwork-design.md`／`README.md` 为 token 与体例真源）＋ `docs/architecture/implementation-readiness.md:420`（`PI-LANE-UI-1` 行的浅色 craft 方向锁）。**注**：现行文档无一处点名本件——`PI-LANE-UI-1` 行的「证据索引」点的是 `research-gui-design-direction-2026-07-28.md`。故本条继承者为**域级而非逐条指名**；若需逐条追溯，须自行取证。
- **已知失效点**：件内已记两份 HTML 与 VERSIONAL-LANG 证据链同 SHA、kit 八站数据与旧归档大量重复且有观察漂移。外部许可边界不得从归档反推为可依赖。

### `research-pi-sidecar-route-prep-2026-07-30.md`

- **票号／事件名**：`PI-SIDECAR-DIST-1R4` 路线裁定备料。
- **起讫**：2026-07-30 → 2026-07-30。
- **SHA**：实现／验收／合入 无（调研件）；入仓 `7891a44`（2026-07-30）。
- **本件证明什么**：对 `codex/pi-sidecar-dist-1r4@07d2dbc` 回执与工程报告的只读消化——两路线对照、十二决策点证据状态、六条最强反对意见、残留与验收面预览；另核出三处漂移（分支树 ADR-022 较 `main` 缺 38 行、esbuild/postject 随 R1–R3 血缘入 devDependencies、§十四冷启行为为 R1 旧值），前两处经亲测复核坐实。件自陈**零路线建议**。
- **归档类别**：结论已被吸收（其服务的路线裁定已作出）。
- **现行真值继承者**：→ `packages/pi-lane/SPEC.md:663`（Route A `routeId:"node22-runtime-sealed-cjs-v1"` 为现行 default，官方 Node v22.23.1）＋ `:713`（tracked manifest 管 verified Node+CJS 与十九型 closed journal）。
- **已知失效点**：件面明写「R4 数字在独立验收 PASS 前不作主线事实」，该约束对本件全部数字长期有效。所锚 `07d2dbc` 属已退役的分支态；`docs/status/current.md` 无 `PI-SIDECAR-DIST` 行，其清账坐标**未考**（须自 `git log` 取证）。

### `research-pi-host-loop-inventory-2026-07-30.md`

- **票号／事件名**：`PI-HOST-LOOP-1` 开工前仓内盘点。
- **起讫**：2026-07-30 → 2026-07-30。
- **SHA**：实现／验收／合入 无（调研件）；入仓 `7891a44`（2026-07-30）。
- **本件证明什么**：`main@6908009` 上的只读盘点——R2 已验收 wire／状态机不变量清单、票面 journal 语义与既有定义的三档对应、`pi-agent-core@0.82.1` 生命周期一手事实（协作式 abort、零耐久原语、context 纯内存）、仓内 Rust 耐久手法可复用坐标与反面教材、七项 `[需架构拍板]`。件自陈不做设计拍板、不构成开工授权。
- **归档类别**：结论已被吸收（载重项经架构复核后落 SPEC/ADR）。
- **现行真值继承者**：→ `packages/pi-lane/specs/PI-HOST-LOOP-1.md`（在册点名本件）及其 `1R`…`1R7` 系列；wire／journal 现行契约 → `packages/pi-lane/SPEC.md` ＋ `docs/decisions/ADR-022-pi-lane.md`。据 `docs/status/current.md`，`PI-HOST-LOOP-1` 已于 `653c121` no-ff 合入并清账。
- **已知失效点**：所锚 `main@6908009` 与 `pi-agent-core@0.82.1` 均为当时坐标；七项 `[需架构拍板]` 的现行去留只认票面与 `current.md` 结转项，不得从本件读取。

### `research-gui-design-direction-2026-07-28.md`

- **票号／事件名**：pi 基础 GUI／Design 复核。
- **起讫**：2026-07-28 → 2026-07-28。
- **SHA**：实现／验收／合入 无（调研件）；入仓 `0e50b03`（2026-07-28）。
- **本件证明什么**：复核 Moda Micro-interaction Pack、OpenDesign、Logue、Open WebUI 0.11.0、assistant-ui 与旧 Radix/cmdk/dockview/OpenWork 供料，区分「成熟 GUI 机制」与「Courtwork Design」；结论为浅色先行、冷白与深墨拉开、扁平、版本目录学、克制反乌托邦及 anti-slop 禁区，并明确不在开工前冻结 wireframe、最终色值或逐处间距。
- **归档类别**：结论已被吸收（部分）。
- **现行真值继承者**：→ `docs/decisions/ADR-022-pi-lane.md:740`（六-D，在册点名本件为史料线索）＋ `docs/architecture/implementation-readiness.md:420`（`PI-LANE-UI-1` 行，明写「证据索引见」本件，且「只作筛选过的参考，不作视觉真源、源码来源或 runtime 依赖」）。
- **已知失效点**：件本身不是组件或 token 真源；外部许可边界不得从归档反推为可依赖。所核外部项目版本（Open WebUI 0.11.0 等）随上游演进折旧。

### `harness-core-1-stage-a.md`

- **票号／事件名**：`HARNESS-CORE-1` Stage A 决策材料。
- **起讫**：2026-07-20 → 2026-07-20（同日随裁决收敛闭合）。
- **SHA**：实现／验收／合入 无（决策材料，非实现工单）；入仓 `8eafe07`（2026-07-20），末次改动 `3e6d7b5`（2026-07-20，Stage A/C 裁决收敛）。
- **本件证明什么**：Stage A 全文——口径核实（含「减法八条不存在」的坐标订正）、四份 ADR 草案、`TOOL-READ-1` 票面重建、Stage B 实现分解，末附 R-1…R-27 与架构逐项裁决。
- **归档类别**：结论已被吸收。
- **现行真值继承者**：→ `docs/decisions/ADR-016-uniform-slot-filling-protocol.md`（统一填格协议）、`ADR-017-controlled-command-execution.md`（受控命令执行）、`ADR-018-execution-isolation-and-sandbox.md`（执行隔离与沙箱）、`ADR-019-dossier-container-and-local-cache.md`（卷宗容器与本地缓存）——四份均 `Accepted`，决定与理由全文在 ADR 本体，`docs/decisions/README.md:30` 明写「无须回读材料」。Stage B 各票 → `docs/architecture/implementation-readiness.md`。门盘点承接 → `docs/engineering/gate-inventory-1.md:3`（在册点名本件 §A2.4）。
- **已知失效点**：**本条被现行文档在册引用**（`docs/engineering/gate-inventory-1.md:3`、`docs/decisions/README.md:30`），销条前须先解引。件内 ADR 草案文本与最终成文有出入，一律以 ADR 本体为准；`docs/status/current.md` 另记两项已推进的事实——bash 当前仍不入界（ADR-017 一至八已启封为「若有真实需求时的受控形态」，启封不等于实现或排产），执行隔离等级显式停在 `none`（曾预定的自研窄 profile **已撤销**）。

### `harness-core-1-stage-c.md`

- **票号／事件名**：`HARNESS-CORE-1` Stage C 九域对照。
- **起讫**：2026-07-20 → 2026-07-20。
- **SHA**：实现／验收／合入 无（决策材料）；入仓 `3e6d7b5`（2026-07-20）。
- **本件证明什么**：chat/work 面九域功能对照、存疑取舍自评、顺带发现与批次建议，末附 R-1…R-16 逐项裁决（含「重新生成／多回答分支」与「`/command` 上下文操作」两条裁死、附录 A 减法八条现行锚点对照）。
- **归档类别**：结论已被吸收。
- **现行真值继承者**：→ `docs/architecture/implementation-readiness.md`（C3-1…C3-5 各行，带裁决坐标 `C/R-n`、依赖与 `App.tsx` 串行约束）；两条「已裁不做」→ `docs/product/roadmap.md`；i18n 取舍 → `docs/design/voice.md`。`docs/status/current.md` 在册点名本件为归档去处。
- **已知失效点**：**本条被 `docs/status/current.md` 在册引用**，销条前须先解引。件内批次建议与波次排布已被就绪图重排；「入图、实现提交与独立清账是三个不同事实」（`current.md` 语），成熟度不得从本件读取。

### `arch-scope-2026-07-20.md`

- **票号／事件名**：`ARCH-SCOPE-2026-07-20` 架构评估单。
- **起讫**：2026-07-20 → 2026-07-20（同日闭合归档）。
- **SHA**：实现／验收／合入 无（评估单）；入仓 `57bc058`（2026-07-20），归档移位 `6afd595`（2026-07-20，`close ARCH-SCOPE-2026-07-20 and archive it`）。
- **本件证明什么**：候选盘点（就绪图开放工单／案头队列／归档待立项／长期缺口逐项判定与排序）、对外叙事口径审查、设计体例实况评估，末附 R-1…R-17 裁决请求与架构逐项裁决。
- **归档类别**：事件闭合（结论已全部落入现行文档）。
- **现行真值继承者**：→ `docs/architecture/implementation-readiness.md`（ARCH-DEBT 清单与 B5 销号，`:166` 记 B5 三项已由 `SKIN-R2 P4` 实质吸收）＋ `docs/design/typography-density.md:55`（发凡六之一，墨迹洇染产品壳拒迁）＋ `docs/design/voice.md`（门的边界与 chrome 语言口径）＋ `apps/desktop/SPEC.md`（ledger 契约节）＋ `maturity-claim`／`source-hashes`／ledger target 三道门。`docs/status/current.md` 在册点名本件为归档去处。
- **已知失效点**：**本条被 `docs/status/current.md` 在册引用**，销条前须先解引。件内数字与排序为当日坐标；能力状态仍只认 `current.md`。

### `arch-rulings-2026-07-26.md`

- **票号／事件名**：2026-07-26 架构裁决备忘录。
- **起讫**：2026-07-26 → 2026-07-27（成文落痕当日归档）。
- **SHA**：实现／验收／合入 无（裁决备忘录）；入仓 `e6835a5`（2026-07-27）。
- **本件证明什么**：ARCH-DEBT 裁定会三笔半定谳（`PANEL-BLUEPRINT` 上提至 DOSSIER 后、S6 装配点模式定谳、actor 显式容忍）、调研消费 pass 七条清零、GUI 候选八项裁决（`UI-TOAST-1`／`WORK-PLAN-PANEL-1` 立票，四项不做留痕，两项后置）。
- **归档类别**：结论已被吸收（裁定与新票已于 2026-07-27 落图）。
- **现行真值继承者**：→ `docs/architecture/implementation-readiness.md:99`（裁定会已执行节，在册点名本件为原件）＋ `:129`（消费 pass 七条逐条去向）＋ `:374`（原件三份按索引定位）；不做留痕批 → `docs/product/roadmap.md`；依赖许可节 → `docs/engineering/workflow.md`。
- **已知失效点**：无在册时效订正。件内票号排布与依赖已由就绪图重排，以就绪图为准。

### `adr-drafts-2026-07-26.md`

- **票号／事件名**：ADR 草案两份（甲 ADR-017 修订案／乙 ADR-021 草案／丙 ADR-021 增补）。
- **起讫**：2026-07-26 → 2026-07-27（成文闭合）。
- **SHA**：实现／验收／合入 无（草案件）；入仓 `b2c1dc0`（2026-07-27，即 ADR-017 修订与 ADR-021 占号提交本身），末次改动 `e6835a5`（2026-07-27）。
- **本件证明什么**：甲——携 Socmdia kit 证据启封受控脚本执行、隔离前置链 `SANDBOX-PROBE-1`→`EXEC-SCRIPT-1`；乙——工作语义层四类供给者、笔记本形态、热窗收割／冷时 rebase 两只表、必要性三态、v1 最简与三组对比实验设计（蒸馏节整体标为**暂定假说**，实测前不冻结）；丙——`CONTEXT-SURVEY-1` 调研回执（opencode/pi 增量形态同构、DeepSeek 无精确 TTL 整体失配、前缀确定性门）。
- **归档类别**：结论已被吸收（甲三件已落 ADR-017 修订记录；乙丙已合并成文为 ADR-021）。
- **现行真值继承者**：→ `docs/decisions/ADR-017-controlled-command-execution.md:198`（2026-07-26 三处修订，在册点名甲案）＋ `docs/decisions/ADR-021-dossier-work-semantics.md:213`（在册点名乙丙两案为草案原件；该 ADR 已于 2026-07-28 转 `Accepted`）。
- **已知失效点**：草案与成文有出入，一律以 ADR 本体为准。ADR-017 原文件头「决定零成立、一至七封存」的旧文本只在 Git 提交史中；启封≠实现或排产，`EXEC-SCRIPT-1` 仍 parked（`docs/status/current.md`）。

### `benchmark-openwork-2026-07-26.md`

- **票号／事件名**：OpenWork 标杆实测。
- **起讫**：2026-07-26 → 2026-07-27。
- **SHA**：实现／验收／合入 无（调研件）；入仓 `e6835a5`（2026-07-27）。
- **本件证明什么**：`different-ai/openwork` tip `1f41a52` 源码实测——agent loop 100% 外包 opencode 的结构判定（GUI 标杆成立、harness 标杆是 pi/opencode 本体）、三栏对照（已裁不做全部经受实测／有票项获借形坐标／真空白仅三项）、差异化资产清单（预算硬限额／持久授权／原件只读／fail-closed 门禁均在其空白区）。
- **归档类别**：结论已被吸收（三枚裁决已落就绪图；导航栈与产物面板动作排不采纳入 roadmap 留痕）。
- **现行真值继承者**：→ `docs/architecture/implementation-readiness.md:374`（原件三份按索引定位）＋ 同文件 OPENWORKER 负判例续档段；不采纳留痕 → `docs/product/roadmap.md`。
- **已知失效点（2026-07-28 时效订正，部分过时）**：二次复核锚定 OpenWork `dev@1aba9e3`、OpenCode `dev@3f9dad3`。旧报告仅「OpenWork 把 agent loop 委托给 OpenCode」这一结构结论仍有效；原 file:line、薄壳归纳及 busy/steer 生命周期已漂移。当前 OpenCode 会先持久 user message，再由运行中的 loop 重读形成 immediate steer；OpenWork 同时提供 immediate steer 与 Zustand 内存队列，Stop 会清队列，队列不耐久。`CHAT-QUEUE-1` 不再以上游「无 steer／busy reject」为事实依据。GUI 成熟度未经当前截图、交互、恢复与源码验收，不构成选型放行。时效随对象仓演进折旧，结论锚定 `1f41a52`。

### `pi-ecosystem-2026-07-26.md`

- **票号／事件名**：pi 生态摸底。
- **起讫**：2026-07-26 → 2026-07-27。
- **SHA**：实现／验收／合入 无（调研件）；入仓 `e6835a5`（2026-07-27）。
- **本件证明什么**：云端网页层调研——官方 registry 5,312 包实存、五类扩展编目（权限确认／sandbox／compaction-memory／工具扩展／UI-TUI）、textbook 零命中改拼装消费（作者博客四篇＋官方 extensions 文档）、深读名单五项。
- **归档类别**：结论已被吸收（三枚裁决已落就绪图）。
- **现行真值继承者**：→ `docs/architecture/implementation-readiness.md:355`（`TOOL-READ-1` 行的「借形坐标（2026-07-26 pi 生态摸底）」：官方 `permission-gate`／`protected-paths`／`tool-override` 三例＋cc-safety-net 外置反例）＋ `:374`（原件三份按索引定位、深读三仓各票开工前本地 clone 取用）＋ `docs/decisions/ADR-022-pi-lane.md`。
- **已知失效点**：件内自证——WebFetch 取得的数字（star／日期）不可靠，机制描述系多源交叉方为可用。`SANDBOX-PROBE-1` 候选对（sandbox-runtime vs gondolin）之后的沙箱选型已变：`docs/status/current.md` 记执行隔离等级显式停在 `none`、自研窄 profile 已撤销。

### `design-prototype-2026-07-19-r2/`

- **票号／事件名**：历史 R2 封版原型与 consolidation survey（随 `SKIN-B4` 清账归档）。
- **起讫**：2026-07-19 → 2026-07-19。
- **SHA**：实现／验收／合入 无（设计件）；入仓 `19e8f94`（2026-07-19），随 B4 清账归档并更名 `c5a249b`（2026-07-19），末次改动 `72787d7`（2026-07-19）。
- **本件证明什么**：封版原型、构图盘点与当时的 consolidation survey——可追查版式取舍与反例（如「乌丝栏」在原型中实为引语卡框廓装饰件，与层级线同名实异，不得借形）。
- **归档类别**：结论已被吸收（部分结论已被现行设计覆盖）。
- **现行真值继承者**：→ `docs/design/`（现行 token、字体、线级、组件真源）＋ `site/craft-evidence/`（`SKIN-R2-*`／`VERSIONAL-LANG-*`／`SITE-CRAFT-2*` 的真实验收证据）。在册引用两处：`apps/desktop/SPEC.md`（B4 记号批节，转指本索引条目）与 `docs/architecture/implementation-readiness.md:166`／`:72`（B4 票面盘点全文、R2 供料口径修正）。
- **已知失效点**：**本条被现行文档在册引用**（`apps/desktop/SPEC.md`、`docs/architecture/implementation-readiness.md`、`site/craft-evidence/VERSIONAL-LANG-1/SOURCE-HASHES.json`），销条前须先解引。旧原型与现行证据冲突时以后者为准，不得照图复刻。就绪图 `:72` 另订正：曾称「四面设计稿+17 族已齐」为仓外悬空承诺，仓内零实物。

### `docs-legacy-2026-07-13/`

- **票号／事件名**：第一代 `docs/` 全量快照（2026-07-13 文档重整时退出权威链）。
- **起讫**：起 **未考**（第一代 `docs/` 编写期跨度无单一起点，快照本身未记）→ 2026-07-13 归档。
- **SHA**：实现／验收／合入 无（文档快照）；快照基线 `f03e742`（件内自记），入仓 `e6d6575`（2026-07-13），补入 `88623a0`（2026-07-13，最终视觉方向研究）。
- **本件证明什么**：143 文件、原编号 00–94 + superpowers/plans 的第一代文档全貌；`MANIFEST.md` 逐段标注归档原因（已省并／已由 ADR 重述／已被后续契约替代／证据快照）。
- **归档类别**：结论已被吸收（整体视为已升格或已过时的历史底稿）。
- **现行真值继承者**：→ 现行 `docs/` 全树（`README.md` 为入口）。逐条捡回的两例在册：`docs/decisions/ADR-014-preview-tabs-and-package-tiers.md:9`／`:50`（原编号 `docs/49` 第十五章中转层席位、`docs/53`／`docs/93` 三层包体系定本，经调研复核吸收）；`docs/decisions/ADR-017-controlled-command-execution.md:194`（「永无任意命令执行／宿主零 shell」原始承诺，`docs/11-会话唤醒prompt.md:620`、`:657`）。
- **已知失效点**：**本条被 ADR-014 与 ADR-017 来源段在册引用**，销条前须先解引。只在追查某条现行规则历史成因时按原编号定位；未被显式捡回的内容一律视为已过时。

### `research/`（`workbuddy-interaction-bench-2026-07-16`）

- **票号／事件名**：`WORKBUDDY-INTERACTION-BENCH` 行为语料批。
- **起讫**：2026-07-16 → 2026-07-16。
- **SHA**：实现／验收／合入 无（调研件）；入仓 `3006f4e`（2026-07-16）。
- **本件证明什么**：`BEHAVIOR-MATRIX.md` 按「触发前→动作→过渡可操作性→终态→反向→回基线」六段体例枚举 WorkBuddy 只读交互行为，另附 20 帧证据截图。定调：**行为语料源非正确性真源**。
- **归档类别**：结论已被吸收（已升格为 `WORKBUDDY-INTERACTION-BENCH` 工单）。
- **现行真值继承者**：→ `docs/architecture/implementation-readiness.md:298`（`WORKBUDDY-INTERACTION-BENCH` 行：作 `UI-RESIDUE-1` 枚举完整性输入与失败反例语料，「WorkBuddy 非正确性真源」的声明须留痕）＋ `apps/desktop/SPEC.md`（在册引用）。
- **已知失效点**：**本条被 `apps/desktop/SPEC.md` 在册引用**，销条前须先解引。语料锚定 2026-07-16 的 WorkBuddy 版本，随上游演进折旧；不得复制其组件代码。

### `research-2026-07-14/`（A–F 批）

- **票号／事件名**：2026-07-14 调研 A–F 批。
- **起讫**：2026-07-14 → 2026-07-14。
- **SHA**：实现／验收／合入 无（调研批）；入仓 `a69fc61`（2026-07-14，`absorb current research decisions`）。
- **本件证明什么**：六份专题调研——`durable-work-state`、`host-file-authorization`、`legal-scan-corpus`、`package-machine-gates`、`wps-compat`、`deepseek-usage-billing`，另有过程性文件 `INTAKE-RAW`。
- **归档类别**：结论已被吸收（全部已升格）。
- **现行真值继承者**：逐条——`durable-work-state` → `docs/decisions/ADR-010-work-live-boundaries.md` ＋ `WORK-STORE-1`；`host-file-authorization` → `ADR-004-documents-and-files.md`／`ADR-005-data-security.md` ＋ `CASE-ROOT-1`／`HOST-AUTH-LITE`；`legal-scan-corpus` → `services/ingest/SPEC.md`；`package-machine-gates` → `packages/registry/SPEC.md` ＋ `packages/tools/SPEC.md`；`wps-compat` → `packages/output/SPEC.md`；`deepseek-usage-billing` → `packages/provider/SPEC.md` ＋ `USAGE-LEDGER-1`。
- **已知失效点**：`INTAKE-RAW` 为过程性文件，已过时。现行文档无一处点名本批，继承者为**域级映射**（承自本索引历次登记），逐条追溯须自行取证。

### `research-2026-07-15-round-2/`（R1–R6）

- **票号／事件名**：2026-07-15 Round 2 调研（R1–R6）。
- **起讫**：2026-07-15 → 2026-07-15。
- **SHA**：实现／验收／合入 无（调研批）；入仓 `8560faf`（2026-07-15），复核补入 `36883f3`／末次 `bd933bc`（2026-07-15）。
- **本件证明什么**：R1 多宿主解耦、R2 多写者×跨案矛盾、R3 材料链真实度、R4 output 真实度、R5 触发／门禁推演、R6 claimed-vs-real。**须按目录内 `README.md` 的「阅读校正」读取**——该校正是本批的使用前置。
- **归档类别**：结论已被吸收（R1–R3）／被后续校正推翻（R4–R6，见失效点）。
- **现行真值继承者**：R1 → `docs/architecture/system.md`（复用边界）；R2 → `docs/product/roadmap.md`（前置）；R3 → `docs/status/current.md` ＋ `docs/architecture/implementation-readiness.md`（实测清单）。
- **已知失效点**：**R4／R5／R6 三项已过时**——R4「真实产品可达」判断被目录内阅读校正推翻；R5 触发／门禁推演未被采纳部分作废；R6 claimed-vs-real 系 v0.1.1 口径，已过期。此三项不得作线索使用。现行文档无一处点名本批，继承者为域级映射。

### `research-2026-07-15-round-3/`

- **票号／事件名**：2026-07-15 Round 3 调研批。
- **起讫**：2026-07-15 → 2026-07-19（末次增补 `2c41949`，session-recall-survey 八条采纳）。
- **SHA**：实现／验收／合入 无（调研批）；入仓 `88e0218`（2026-07-15，`file round 3 research originals`），后续增补 `4f5c37d`（2026-07-15）、`2c41949`（2026-07-19）。
- **本件证明什么**：本批分四类。**已升格**：`interaction-visual-regression`→`UI-RESIDUE-1`；`oss-gui-source-patterns`→`UI-RESIDUE`／`CHAT-SESSION` 等票供料；`geist-design-md`→`VOICE-SPEC-1`／`DESIGN-MD-1`；`vault-site-craft`→`SITE-CRAFT-1`；`grok-build-patterns`→`OUTPUT-CONFIRM-UI-1`／`CHAT-MEMORY-1`；`pi-harness-comparison`→`WORK-TURN-1`；`session-handoff-survey`→`PROJECTION-RESUME-1`；`chinese-display-font`→`SITE-CRAFT-2`（已拍板朱雀仿宋，SIL OFL）。**方向已定待立票**：`skill-refinery-feasibility`、`invest-daily-brief-testbed`＋`invest-daily-digest-field`。**定调型**：`anysearch-retrieval-tier`（检索类 plugin 三原则：具名／fail-closed／外部检索恒为未锚定线索级）、`generic-connectors-tier`、`frontier-vertical-scan-2026h1`、`harness-landscape-2026h1`、`kimi-k3-capability-audit`（法律库传言证伪，不立 provider 单）、`newmax-competitive-teardown`。**论证素材／词表**：`provider-switch-mechanisms`、`fortune-invest-schema-stress-test`、`coding-agent-strategies-subtraction`、`chat-as-dossier-thesis`、`emil-skills-polish-input`、`cognitive-debt-mapping`、`namethatui-vocabulary`、`trae-work-landscape`、`upstream-positioning`（内部定位，不入公开叙事）。
- **归档类别**：结论已被吸收。
- **现行真值继承者**：在册点名四处——`docs/decisions/ADR-016-uniform-slot-filling-protocol.md:100`（`harness-landscape-2026h1.md`，稳定前缀产业实证）、`docs/decisions/ADR-019-dossier-container-and-local-cache.md:86`（`chat-as-dossier-thesis.md`，容器同构论）、`docs/decisions/ADR-014-preview-tabs-and-package-tiers.md:50`（三层包体系复核吸收）、`docs/architecture/implementation-readiness.md:293`（`GENERIC-PACK-1` 行引 `generic-base-inventory.md`）与 `:296`（`ARCHIVE-MANAGE-1` 行引 `session-recall-survey.md` 召回入口八条）。
- **已知失效点**：**本条被四份现行文档在册引用**，销条前须先解引。`harness-landscape-2026h1` 的监控补记须连读订正：Opus 5 发布属实（2026-07-24 官方公告），但「系统提示删约 80%」为团队成员炉边**口头声明**——changelog 零记录，且按模型条件加载非版本删减，引用只按口头声明级（复核详情见 `research-2026-07-27-parallel-survey/`）。消费 pass 补记（2026-07-26，裁决原件 `arch-rulings-2026-07-26.md`）：oss-gui #4 入 `UI-TOAST-1`／`WORK-PLAN-PANEL-1` 素材；#3 挂 `UI-RESIDUE-1` 批二；#8 分隔条命令式直写 DOM **显式不采纳**（重启判据＝分栏拖拽出现可测卡顿）；emil polish 挂 R2 既有通道不另立票；namethatui 并入 voice 词表扩展便利单；SkillsBench 归因协议与 OWASP Memory Guard 四态均显式后置。

### `research-2026-07-19-agent-pedagogy/`

- **票号／事件名**：`AGENT-PEDAGOGY-SURVEY`（只读，不进权威链）。
- **起讫**：2026-07-19 → 2026-07-19。
- **SHA**：实现／验收／合入 无（调研批）；入仓 `5f38d1f`（2026-07-19）。
- **本件证明什么**：两教材仓摸底（microsoft/ai-agents-for-beginners 多为通识；bojieli/ai-agent-book 工程细节密度高）。消费 pass 逐条零悬置：可借形六条全采——proposer-reviewer＋Sidecar 执行安全、幂等／先检后确认（两条入 bash 受控 ADR 素材袋）、结构化输出实践（入统一填格协议 ADR）、toolResult 工程细节（入 `TOOL-READ-1`）、自底向上因子发现＋聚类的司法案例分析管线（入法律垂类评测集，本批最高价值一条）。反面三条留档：MS L08 与 bojieli ch10 多 agent 编排（ADR-011 拒项佐证）、双方 memory 分类学（ADR-013 刻意窄设计的对照）。中性四条留档。
- **归档类别**：结论已被吸收。
- **现行真值继承者**：→ `docs/decisions/ADR-016-uniform-slot-filling-protocol.md:99`（结构化输出工程反证）＋ `docs/decisions/ADR-017-controlled-command-execution.md:193`（同行形态与反面教材）＋ `docs/decisions/ADR-018-execution-isolation-and-sandbox.md:106`（隔离分级与「venv 不是沙盒」）。
- **已知失效点**：**本条被三份 ADR 来源段在册引用**，销条前须先解引。**警示独立记**：MS `18-securing-ai-agents` 含疑似注入／营销内容（伪引用＋三方包推装），已隔离不采不装——公开教材仓属**不可信输入面**，引用前逐条核真；「一手来源」判例适用于仓外一切材料。

### `research-2026-07-19-work-agent-landscape/`

- **票号／事件名**：`WORK-AGENT-LANDSCAPE-1`（只读，不进权威链）。
- **起讫**：2026-07-19（一手抓取）→ 2026-07-19。
- **SHA**：实现／验收／合入 无（调研批）；入仓 `0ce08b1`（2026-07-19），消费 pass 落痕 `b879d84`（2026-07-19）。
- **本件证明什么**：市场流通 work agent 架构全景（WorkBuddy／TRAE Work／QoderWork／Kimi Work＋frontier 旁节），按工具集·授权·容器·工作流·记忆·知识包·toolResult·降级八问逐家对照，分三桶（可借形／反面教材／中性事实）。消费 pass 零悬置：可借形六条全采——TRAE 命令三态＋白名单＋高风险弹窗、Qoder `evaluated_permission` 事件（授权决定持久化先于 effect 的同行实现）入 bash 受控 ADR 素材袋（后者兼入 `TOOL-READ-1` 参照）；WorkBuddy 先批后执行 vs Full Access 双面入 effect 授权语义材料；Qoder 回收站／tool 默认展开／Task Monitor／定时 missed 显式分三处（回收站佐证 `ARCHIVE-MANAGE-1` 既采防呆、tool 展开入 `TOOL-READ-1` journal 侦察、missed 显式入未来 scheduled ADR 素材）；Qoder Dreams COW＋无 bash consolidation 入 ADR-013 memory 演进正对照；Expert Kit／指令+RAG 为垂类知识包最近流通物而契约／锚点／事实等级为空白带，作产品定位佐证。反面教材五条**显式留档不入票**（各条已点名所违不变量，作反例语料；公开链分享一条另挂后续 ADR 队列 shared state／ACL 素材）。中性两条留档。
- **归档类别**：结论已被吸收。
- **现行真值继承者**：→ `docs/decisions/ADR-017-controlled-command-execution.md:193`（同行形态与反面教材，口径校正见 Stage A §0）＋ `docs/decisions/ADR-018-execution-isolation-and-sandbox.md:107`（沙箱失败显式分支的同行参照与反面教材）。
- **已知失效点**：**本条被两份 ADR 来源段在册引用**，销条前须先解引。**时效用法**：有效＝可作线索；监控＝竞品大版本后复扫；过时＝被更新调研或 ADR 吸收声明替代。本批标「有效（2026-07-19 一手抓取）」，随竞品大版本折旧，至今未复扫。

### `research-2026-07-20-pi-first-source/`

- **票号／事件名**：`PI-FIRST-SOURCE`（`HARNESS-CORE-1` Stage A 立的一手源核实批）。
- **起讫**：2026-07-20 → 2026-07-20。
- **SHA**：实现／验收／合入 无（调研批）；入仓 `8eafe07`（2026-07-20，随 Stage A 同批）。
- **本件证明什么**：因 round-3 的 `pi-harness-comparison.md` 全文仅 17 行、未展开工具接口，而就绪图 Round 5 方向②以「四项基础工具采 pi 成熟范式」立论，故回一手源 `~/Projects/pi`（v0.75.4，MIT）核实 read/edit/write/bash 精确接口、bash 权限模型、toolResult 形态与回灌、agent loop 控制结构。**关键结论**：pi 的 bash 范式**就是不做权限模型**（无白名单／黑名单／确认／授权持久化），安全性整体外包给容器；沙箱只是示例扩展非运行时依赖——故「采 pi 范式」与就绪图「沙盒后期」互相排斥。read/edit 的接口与截断纪律可借形；write 的无确认覆盖写与 ADR-004 冲突，不采纳。
- **归档类别**：结论已被吸收。
- **现行真值继承者**：→ `docs/decisions/ADR-017-controlled-command-execution.md:192`（在册点名本件为「决定零与决定八的证据基底」）＋ `docs/decisions/ADR-018-execution-isolation-and-sandbox.md` ＋ `docs/decisions/ADR-022-pi-lane.md` ＋ 就绪图 `TOOL-READ-1` 票面。
- **已知失效点**：**本条被 ADR-017 来源段在册引用**，销条前须先解引。**核实边界**：本机快照无 `.git`，提交日期与 issue/PR 响应时延无法从本地判定。**2026-07-28 产品窄修订**：历史「不采纳 write」结论对用户原件、工作稿、产出和 Node 直写仍成立；**仅** app-data、session-scoped agent workspace 例外采用上游覆盖式 `write`，由 Rust 宿主逐次授权、先落账再执行。该例外**不含** edit、revision、diff、CAS、promotion 或 bash；本条归档说明本身不构成现行契约。所核 pi 版本 v0.75.4 早于现行 pi-lane 所用版本。

### `research-2026-07-27-memory-continuation/`

- **票号／事件名**：记忆与续行对照批（只读，不进权威链）。
- **起讫**：2026-07-27 → 2026-07-27。
- **SHA**：实现／验收／合入 无（调研批）；入仓 `67e9d7f`（2026-07-27，OpenClaw／pi 生态两路），同日补入 `baa34db`（Hermes 本体）。
- **本件证明什么**：两路 Sonnet 调研——OpenClaw（注入组装／缓存边界二分／记忆写入／压缩生命周期／心跳）与 pi 生态记忆扩展（pi-hermes-memory／官方 handoff.ts／pi-rewind／pi-observational-memory），另补 NousResearch/hermes-agent 本体。批内 `README.md` 载消费 pass：加固三条、反例实证一条、新输入一条、深读 +1、显式不采纳两条、license 红线一条。
- **归档类别**：结论已被吸收（ADR-021 评审素材已挂指针）。
- **现行真值继承者**：→ `docs/decisions/ADR-021-dossier-work-semantics.md:194`（对照批补记，在册点名本批）：缓存边界二分与「动态值经工具调用取、不入前缀」加固决定六第 1 条；两层笔记本同构加固决定二；**自动静默蒸馏的外部事故实证**（OpenClaw flush 轮泄漏致压缩死循环）把「无自动静默蒸馏、水位建议经 ask-user」由设计偏好升为携证裁量；policy-only 策略块注入作注入编排实现选项。两枚 Hermes 事故反例（后台复盘并发覆盖 #2670、去重状态不持久重复 flush #3059）定为 `DOSSIER-FLOW-1` 票面**必须显式处理**的冲突面。`pi-observational-memory`（MIT）入 `DOSSIER-FLOW-1` 开工前深读清单 → `docs/architecture/implementation-readiness.md:383`。
- **已知失效点**：**本条被 ADR-021 在册引用**，销条前须先解引。所锚外部仓 issue 编号与 star 数随上游演进折旧；批内数字不作现行事实。

### `research-2026-07-27-parallel-survey/`

- **票号／事件名**：并行时效调研批（只读，不进权威链）。
- **起讫**：2026-07-27 → 2026-07-27。
- **SHA**：实现／验收／合入 无（调研批）；入仓 `1ab13a0`（2026-07-27）。
- **本件证明什么**：`DEBT-DOSSIER-1` 在途期间的四路云端并行调研——opencode 定向三题（`TOOL-READ-1` 前置）、沙箱案头对照（`SANDBOX-PROBE-1` 前置）、历史论断五组时效核查、竞品态势脉搏。批内 `README.md` 载文件表、时效三态与消费去向。
- **归档类别**：结论已被吸收（裁决已于 2026-07-27 落就绪图与 roadmap 复核行）。
- **现行真值继承者**：→ `docs/architecture/implementation-readiness.md:355`（`TOOL-READ-1` 行在册点名 `opencode-three-questions.md`：归一化借形——统一 Rule/Ruleset、last-match-wins 确定性判定；**不借默认**——其有效默认 `"*": allow`，本仓默认 deny 不变；其运行时 approved 规则即 session 级 always，与「授权作用域＝单次提案」相悖，只借皮再证；「中断 tool_use 必补 tool_result」与「截断显式内联告知」两条可借）。
- **已知失效点（2026-07-28 时效订正）**：批内 Q3 所据「server 无 steer、忙时拒绝」已被当前 OpenWork／OpenCode 源码复核替代；其余结论不随之自动失效。现行行为事实与 Courtwork 排队裁决只认实现就绪图，不得从本批恢复旧口径。**本条被就绪图在册引用**，销条前须先解引。

### `OPENWORKER-SURVEY-1`（只读，不进权威链，**报告存于仓外**）

- **票号／事件名**：`OPENWORKER-SURVEY-1`（andrewyng/openworker 调研）。
- **起讫**：2026-07-24（一手，锚定 commit `4766e59c`）→ 2026-07-24（消费 pass 同日）。
- **SHA**：实现／验收／合入 无（调研件）；**入仓 无——报告全文存于仓外**，仅索引条目入仓，落于 `8a23150`（2026-07-24，`land OPENWORKER-SURVEY-1 consumption pass`）。报告路径：`~/Projects/openworker-survey/survey/openworker-structure.md` 与 `~/Projects/openworker-survey/survey/openworker-vs-schema-engineering.md`（2026-08-05 复核：两文件存在）。
- **本件证明什么**：核心问题是其实现方式与 `schema-engineering.md` 是否相似；结论——**相似仅在最浅一层**（双方都用 JSON Schema 约束模型工具调用），而 `schema-engineering.md` 真正花复杂度预算的层（双后端编译、descriptor 闭合、字段职权三分、来源锚点、包化 ABI）在 OpenWorker 逐条缺席或退化为中央硬编码／自由文本／人工约定同步。消费 pass 三桶：**桶一（佐证既有裁定）**——其人类后端是硬编码 React 组件按工具名分支、与 schema 无编译关系，是「干线运力型通用 agent 不自发长出最后一公里」的外部实证；其 path-scope 是纯 Python `resolve()`+`relative_to`、与 agent 进程同权限、非 OS 沙箱，`run_shell` 按设计不限定路径，即「取形弃容器＝承接其明确拒绝的风险」的实例。**桶二（可借形，当期零实现）**——排程自动化的 `_scheduled_approver` 旁路：cron 触发的 run 对四个本地写盘工具无条件 auto-approve，不查 `is_unattended`、无需既往授权、首次运行即成立，且因写盘工具无 `target_arg` 而从不出现在自动化的同意卡片上；其 README「unattended 只入箱不自行动作」对该写盘路径**为假**。登记为未来 scheduled/webhook ADR 的**负面判例**。**桶三（不采纳，留痕）**——第一方连接器中央硬编码枚举与第三方 MCP 整体信任远端 schema，两极端均非版本化可移除包，正是 ADR-008／唯一 ABI 明令反对的形态；工具层零运行时 schema 校验同不采纳。
- **归档类别**：结论已被吸收。
- **现行真值继承者**：→ `docs/architecture/implementation-readiness.md`「后续 ADR 队列」（scheduled／webhook ADR 的负面判例登记）＋ `docs/architecture/schema-engineering.md`（一之二命题：双后端编译是护城河所在）＋ `docs/decisions/ADR-008-schema-conformance-and-authority.md`。对外叙事引此对照须落「结构性差异」措辞并过 `maturity-claim` 门。
- **已知失效点**：**报告在仓外，不受本仓版本控制**——随时可能移动或删除，是本索引唯一的仓外指针，最脆弱的一条。**同族负面判例续档（2026-07-26，源 `benchmark-openwork-2026-07-26.md`，对象为 `different-ai/openwork` tip `1f41a52`，另一仓，判例同族）**：`_scheduled_approver` 类标识符在该仓不存在，但行为判例换名存续——桌面内嵌 server 硬编码 `approvalMode:"auto"`，19 处 host/write API 的 `requireApproval` 事实上无条件放行；真正门控工具调用的是 opencode 侧 permission.ask。两层分明：工具级审批外包且形态尚可，自建 host API 层仍是 auto 直放。**2026-07-27 复核**：`approvalMode:"auto"` 于 dev 分支仍现行、scheduled 仍 Building/Next 零发布。**2026-07-28 时效注**：上述 OpenWork 审批坐标未再重核，**不作当前事实**，只保留其锚定旧 tip 的历史判例效力。本件结论锚定 `4766e59c`，上游日更不追。

### `handoffs/fable-arch-wake-2026-08-05.md`（架构唤醒件，非权威契约）

- **票号／事件名**：`FABLE-ARCH-WAKE-2026-08-05`（长会话交接件；上一枚同类为 `handoffs/fable-pi-foundation-post-r5-2026-07-30.md`）。
- **起讫**：2026-08-03 深夜（守夜审计批）→ 2026-08-05（架构/功能层验收批清账）。
- **SHA**：实现／验收 无（交接件非工单）；写就时 `main` 为 `5807adc`，入仓 SHA 见本条所在提交。
- **本件证明什么**：一轮工程的**坐标图而非叙述**——三十秒定位（仓在何处、产品是什么、卡在哪）、主线阶梯已合入七票与「尚未成立」四条诚实边界、可直接消费的四份冻结定本（UI-1 的 ADR-022 六-D／write 面的 PREFLIGHT+RECON／HEADLESS 的 SPEC §九与两枚移交件／OpenWork 对标口径，均标「不要重研」）、两道闸的性质（`PI-HOST-CONCURRENCY-1` 须先 ADR 且挡 UI-1；六格总验须真 DeepSeek key，SPEC §九:744 白纸黑字「无 key 只能记 external-validated blocked」）、三条跨轮判例（验收刀须换层／闭口按族／改在册来源须同批重封哈希）、结转待追认六项。
- **归档类别**：事件闭合（该轮工程收官）。**注意**：交接件写就即冻结，其中「现在卡在哪」随下一轮推进而失效——它是**入口**不是真值。
- **现行真值继承者**：→ `docs/status/current.md`（唯一能力真源）＋ `docs/architecture/implementation-readiness.md`（唯一开工图）。本件所述任一能力状态与该二者冲突时，一律以该二者为准。
- **已知失效点**：件内所有「当前 `main`」「现在卡在」类表述以 2026-08-05 为准；**两道闸一旦解除，§四整节即过时**；§三「不要重研」清单随对应票开工而消费；§六结转项随架构追认逐条销号。用法：新会话读 §一§三§四即可起手，§二§五作背景，不必回读本轮过程。
