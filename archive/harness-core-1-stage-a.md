# HARNESS-CORE-1 · Stage A 裁决材料（2026-07-20）

事件性文档。裁决闭合后随工单归档，届时在 `current.md` 留一行去处。

本文只承担**裁决输入**职责：不改变任何能力状态口径（那只认 [`current.md`](current.md)），不自行拍板。全部数字与坐标为本会话实测；凡引用归档路径均按 `docs/README.md` 史料引用例外，只作历史线索。

**Stage A 交付**：本文 + 四份 `Proposed` ADR（`ADR-016`/`017`/`018`/`019`）+ 一手源核实批 `archive/research-2026-07-20-pi-first-source/`。末尾 27 项编号裁决请求逐项可独立准驳。**未拍板不进 Stage B。**

**与并行会话的归口**：施工期 `ARCH-SCOPE-2026-07-20`（`57bc058`）已交付并已获逐项架构裁决。本单**不重开其已裁项**——A1 归口至其 §1.4（并如实更正本单一处错误结论），A4 受其 R-3 裁决约束（`TOOL-READ-1` 票面不得携任何 effect 面）。两文互补：其为组合排序，本文为四 ADR 与减法盘点的纵深。

---

## 零 · 三处口径校正（先行，因其改变后续判读）

消化过程中发现三处现行文档的自述与其所引材料不符。先列出，因为 A1–A5 的判读依赖校正后的口径。

### 0.1 「减法八条」不存在

就绪图 Round 5 方向②写「bash 入界属重大边界变更：与**「减法八条·无任意 shell」**直接冲突」。实测：

- `archive/research-2026-07-15-round-3/coding-agent-strategies-subtraction.md` 全文 24 行，**无编号清单**，无「八条」字样，且全文**零次**出现 shell / bash / 命令行 / 任意命令。
- 该文的「减法」只有一个所指：**减 UI 暴露面，不减能力**——把 coding agent 的手动上下文命令（`/to-goal`、`/handoff`、先缩再跑等）下沉为结构，对用户不可见。它与「不上抽象/能删优于能配置」（那是根 `CLAUDE.md` 复杂度节制条）**不同轴**。
- 「无任意 shell」的真实出处在归档 legacy：`archive/docs-legacy-2026-07-13/docs/11-会话唤醒prompt.md:620`「永无任意命令执行」与 `:657`「宿主零 shell」。

**影响**：bash 入界的冲突面**真实存在**，但对手不是「减法八条」，而是 legacy 的两句硬承诺 + 现行 ADR-011 决定二明列的「不引入……后台 bash」。ADR-017 按后者立论。**建议就绪图 Round 5 方向②的引用同批修正**（裁决请求 R-2）。

### 0.2 Qoder `evaluated_permission` 不能佐证「持久化先于 effect」

归档消费 pass 把该条登记为「授权决定**持久化**先于 effect 的同行实现」。回原文实测：`landscape.md` 只记录它是一个**事件字段**，取值闭集 `allow|ask|deny`，`ask` 分支产出 `user.tool_confirmation`，pending 不自动超时。**原文通篇无「持久化」相关表述**，无字段清单、无存储位置、无落盘时序。

「评估先于 effect」可从「ask→确认事件」推出；「**持久化**先于 effect」是素材袋起草时的加工。ADR-017 因此**不引该条作同行佐证**，改由本仓既有的 ADR-010 durable-before-effect 自证（那是已落盘、有确定性红证的机制）。

### 0.3 「tool 默认展开形态」原文只证明开关存在

归档只记录 Qoder 有 `Expand tool calls by default` 与 `Show tool execution steps in IM channels` 两个**设置项**，未记录出厂默认值；「查看原始输出」入口与长输出处理（截断/滚动/分页）四家**均无一字**。四家 tool 消息在真实 transcript 中的角色名被 `landscape.md` 自列为缺口。

**影响**：A4（TOOL-READ-1 票面）中 toolResult 的呈现形态**没有可借的既成答案**，必须自行拍板。这与 `pi-harness-comparison.md` 把它登记为未决问题（「toolResult 角色 vs 折叠文本，实现单前再拍」）一致。

---

## A1 · ARCH-DEBT 裁定会材料

### A1.0 归口：本节只提供增量，不重开已裁项

**施工期并行会话已交付 `ARCH-SCOPE-2026-07-20`（`57bc058`），其 §1.4 已完成七笔逐笔复核，且其 R-2「更正就绪图 ARCH-DEBT 清单」已获架构准。** 该节是本主题的权威台账，本单不重复、不覆盖。

其净结果：**七笔 → 需裁三笔（#1 Legal 四 panel／#3 存入卷宗／#4 interaction actor）、一笔先更正措辞（#2 S6）、三笔销号（#5 `workContextSegment`／#6 `.titlebar`／#7 `schema-marks` 红卫）**。

本节因此只承担两件事：**（一）如实更正本单的一处错误结论；（二）补五笔 §1.4 未覆盖的同性质债。**

### A1.1 更正：本单 D3 结论错误，以 ARCH-SCOPE §1.4 为准

本单初次实测时曾结论「存入卷宗全链零 `materialStore.ingest` 调用」。**该结论错误**，现已复核推翻：

- 错因：只追了容器化按钮路径（`Composer.tsx:271`/`:282` → `App.tsx:1475` `handleContainerize`，确实只翻 `scope` 与建空壳案），据此外推「全链零 ingest」——**未追发送路径**。
- 实况（本单复核实测，与 ARCH-SCOPE §1.4 第 3 行一致）：`App.tsx:567-569` 在 `caseBinding.kind === 'grant' && payload.attachments.length > 0` 时调 `ingestComposerUploads`，其实现（`:1694` 起）走 `materialStore.readSource` → sha256 比对 → 同名异内容**显式拒绝不覆写** → `hostAuth.writeFile` + `materialStore.ingest` 原班链。
- 因此真正的债是 **按钮语义与实际入库判据不一致**（按钮翻 `scope` 但入库判据只看 `caseBinding.kind`），不是「没有入库能力」。ARCH-SCOPE 的处置建议「二选一：接判据（3 处）或裁掉该 UI 字段（6 处）」成立，本单无异议。

**留痕理由**：本单在 A5 曾据错误结论排出 `DEBT-DOSSIER-1` 工单，其范围随之更正（见 A5）。判例登记：**单点路径实测不足以支撑「全链零 X」式全称结论**——全称否定须穷举调用点，不能从一条路径外推。

### A1.2 §1.4 未覆盖的五笔（本单补充）

以下五笔与 §1.4 的三笔半互不重叠，同属「实现先行 / 死面」性质，请一并入裁定会：

| # | 债 | 实测现状 | 坐标 |
|---|---|---|---|
| D6 | VPKG bindings 非真只读 | TS 面声明 `ReadonlyMap`，准入后仍以普通 `Map` 承载；`Object.freeze` 只冻外壳不冻 Map 槽位。调用方 `.set()` 可改写已准入 bindings（冲 ADR-012） | `packages/registry/src/admission.ts:550`；`packages/registry/SPEC.md:7`（提案已挂，未裁） |
| D7 | `ConfirmationStore.take()` 死接口 | `@deprecated` 已标，**全仓零生产消费方**（`.take(` 在非测试代码零命中）。`WorkStateStore` 的 confirmation 视图为接口一致性同样实现它，生产续行走 `peek`+`consume` | `packages/core/SPEC.md:458` |
| D8 | `onTurnEvent` 注入缝零供给方 | 管道已通（executor 声明并转发给 `TurnRunnerPort.onEvent`），但**无任何生产调用方供给该回调**。疑为 WORK-LIVE-1 流式预留 | `packages/core/src/scenario-executor/executor.ts:50`、`:280` |
| D9 | `pendingGateLabels` 恒空 | executor 硬编码 `[]`，投影段的「未决确认」行在生产路径**结构上不可达** | `packages/core/src/scenario-executor/executor.ts:351` |
| D10 | 死代码三项 | ⓐ 未消费导出 2 个；ⓑ 未被任何门/文档引用的 `capture-*-audit.mjs` 9 个（301 行）；ⓒ `lint:trace` 与 `lint:thinking` 指向同一命令 | 见 A2.4 |

### A1.3 已裁定的已知边界（只列，供核对是否需重裁）

这三笔**已有裁定留痕**，本单不重开，仅列出以免裁定会误当新债：

- 跨 resume 累计 runtime budget 不实现，`RuntimeGuard` 按 leg 重置（`packages/core/SPEC.md:448`，就绪图 WORK-STORE-1 行已裁）。
- 软上限走结构化回调 `onSoftLimitWarning`，不升格为可回放 SessionEvent（`core/SPEC.md:450`，已裁「callback 形态照准」）。
- 信源等级不落 `RiskBasis`/`Citation` 字段，走事件流 `evidenceGrades` 投影（`packages/schemas/SPEC.md:37`，已确认方案）。

另：`command_conflict` 单写者单机无生产触发面（`apps/desktop/src/work/work-command.ts:330`）——已由 WORK-LIVE-1-FIX 诚实登记为契约级可达、生产不可达，属**有意的完整闭集**，不是债。

### A1.4 五笔三选一方案与代价

口径沿就绪图忧一：**ⓐ ADR 追认为正解 / ⓑ 重构票入队 / ⓒ 显式容忍留痕**，不悬置。

| # | ⓐ ADR 追认 | ⓑ 重构票入队 | ⓒ 显式容忍 | 本单倾向 |
|---|---|---|---|---|
| D6 | 不可行——ADR-012 已要求不可改写 | 需不可变 facade 或查询接口 + `.set()` 真反例。代价：中，触 registry 公共面 | 可，但须补一条静态门锁住「生产代码零 `.set()`」，把语义约束降级为词法约束 | **ⓒ + 静态门**（成本/收益比最优），或 ⓑ 若架构要求语义级 |
| D7 | 追认「接口一致性保留」需说明为何保留无消费方的危险读法 | 删除。代价：低（零生产消费方），但触跨包接口面 | 可，须保 `@deprecated` 与门 | **ⓑ**（删），并入某张已触碰该面的票顺带 |
| D8 | 追认为「预留缝」需给出预期消费方与到期指针 | 删除，待真实需求再加。代价：低 | 可 | **ⓒ + 到期指针**，或 ⓑ 删 |
| D9 | 不可行——投影段有一整行为其而写，恒空即该行是死码 | 接线：`pauseAt` 时把 gate label 供给投影。代价：低，`PROJECTION-RESUME-1` 已备好 `awaitingConfirmation` 同源槽位 | 可，但须在 SPEC 明记「该投影行生产不可达」 | **ⓑ**，小票 |
| D10 | 不适用 | 删。代价：接近零 | 不适用 | **ⓑ**，清理票 |

---

## A2 · OSS-SUBTRACT-1 盘点

方针：**减法优先于替换；不换的理由同样是资产**。本节只给事实与倾向，采/驳见裁决清单。

### A2.0 现状基线（实测）

- 第三方依赖去重 **34** 个，其中生产侧 **18** 个。`zod` 全仓版本一致（`^4.4.3`）。
- Rust crate：构建期 1 + 运行期 8 + macOS 专属 2；Rust 源码 4 文件 **4631 行**。
- TS/TSX 规模：`apps/desktop` 30134 行为最大，`core` 11175，其余包均 &lt; 4500。

**这是一个已经很瘦的依赖图。** 减法的靶子不在「依赖太多」，在**自研面的重复与体量**。

### A2.1 三项「自研」实为克制，是资产不是欠账

这三项已有拍板留痕，**建议原样保留并把留痕升格为 OSS-SUBTRACT 的正面答卷**：

1. **diff 用前后缀裁剪而非 LCS**：`packages/output/SPEC.md:81` 已论证「完整 diff 是为两份不知道差异的文档设计的，本层不需要」，自述 15 行量级。
2. **SSRF 用 `node:net` 的 `BlockList` 而非手写 CIDR**：`packages/tools/src/web-fetch-ssrf.ts:18` 有注释留痕，`:8` 用 `addSubnet` 声明式配置。
3. **OOXML 纯 TS 直接著录**：`packages/output/SPEC.md:23` 已论证——桌面 Tauri 分发不能塞 JVM 子进程；docx4j 留档为 Plan B，接口已收窄为单一签名 `applyRevisionInstructionSet(docx, instructions) → docx`，真撞坑时只是换实现。

### A2.2 减法候选（删 > 换）

| # | 面 | 实测 | 倾向 |
|---|---|---|---|
| S1 | **版本化单键持久 store 五处逐字同构** | `case-store.ts:61`、`chat-memory.ts:163`、`model-config.ts:61`、`settings-store.ts:55`、`work-session-store.ts:49` 的 `defaultBackend` **除标识符名外逐字相同**（同一 localStorage 探测 → try/catch → memoryFallback 三段）；#1/#2/#5 连 `ReadResult` 判别式都同形。另有 **4 处裸 `localStorage`** 未走 store（`App.tsx:785`、`:827`、`:1344`、`chat/MessageActions.tsx:24`） | **本单最强减法信号**。归并为一个 backend 工厂是**减概念**（五份同构→一份），不是加抽象。但须与 ADR-019 决定一的分区模型**同批**决定，避免归并完又因容器化再改一次 |
| S2 | **markdown 两套并存** | chat 面 `ChatMarkdown.tsx` **228 行手写解析器、零 md 库**；reading-view 面用 `unified`+`remark-parse`+`remark-gfm`（`markdown-to-reading-view.ts` 仅 62 行） | 换：chat 面改用已在生产依赖里的 remark。代价：chat 渲染行为可能漂移，`CHAT-MD-TABLE-1` 的双层红证需重放。**收益明确**（删 228 行手写解析器，消除第二套 md 语义），但须单独立票带回归证据 |
| S3 | **`demo-runtime` 包内 3 处各写 `createHash('sha256')`** | `run-legal-demo.ts:117`、`run-s3-real.ts:175`、`demo-assembly.ts:113,116` 彼此不复用 | 包内归并，零风险。（跨 `crypto.subtle` / `node:crypto` 的分流**有注释依据、不动**：`apps/desktop/src/material/sha256.ts:2`） |
| S4 | **死代码三项** | 见 A1.2 D10 | 删 |
| S5 | **`spike/` 残留** | tracked 32 文件（docx4j 112K + ts 960K + fixtures 52K + py-redlines）。**不判死代码**——现行 SPEC/ACCEPTANCE 四处引其为 Plan B 证据，eslint 已忽略。待核两点：`spike/ts` 自带 npm `package-lock.json` 且**不在 pnpm workspace 内**（与技术基线不同源）；本地 `spike/py-redlines/.venv` 占 62M（已 gitignore） | **保留留档，清理不同源制品**（删 `spike/ts/package-lock.json` 或显式声明其为非 workspace 快照） |

### A2.3 「不换」的答卷（外采评估结论：维持自研）

| 面 | 为何不换 |
|---|---|
| 状态管理 | 全仓**零状态库**（无 zustand/redux/jotai/valtio/mobx）。`App.tsx` 2769 行 / 79 `useState` / 1 `useReducer`。引状态库是**加概念**且触碰面极大；`App.tsx` 体量问题应由拆分解决，不由换库解决 |
| 图渲染 | 已外采 `@antv/g6`；自研面只剩 47+260 行主题包装与 token 门。已是正确分工 |
| 文本提取 | 解析器全外采（`pdfjs-dist` / `@xmldom/xmldom` / `remark` / `fflate`）；自研面只有安全预检 265 行（zip/xml/limits guard）——**那正是自研加固清单点**，不外包 |
| 校验 | `zod` 单一校验库 + 三份 drift 门。无第二 validator（ADR-009 决定三已定 Ajv 只用于独立 CI 合规） |
| 重试/超时 | 三处机制（transport 指数退避 / 工具 `AbortController`+timeout / 结构化输出重试）各自窄且贴合语义。引通用重试库是加依赖减语义 |

### A2.4 E2E 工装：本单最大的单一发现

- Playwright 配置 **40 行**；spec **60 个 / 7707 行**。
- 自研 helper：`helpers.ts` 179 行（11 导出）+ `overlay-residue.ts` 347 行（6 导出）。
- **自研机器门脚本：`apps/desktop/scripts/*.mjs` 59 个 / 4758 行；`site/` + `release/` 13 个 / 3261 行——合计 8019 行。**
- `apps/desktop/package.json:11` 的 `test:e2e` 在跑 Playwright 前串联 30+ 个 `assert-*.mjs`。

**对比**：8019 行自研门 &gt; `output` 全包非测试 1104 行 + `reading-view` 全包非测试 1049 行之和的三倍。

这不自动是坏事——门禁是本仓的质量底座，且多数门锁的是**没有现成 OSS 能锁的东西**（设计 token 冻结、voice 词表、线级语法、残留态、包边界）。但它是**唯一体量已超过被守护物的自研面**，值得裁一次：是否有门可归并、可降频（如从 `test:e2e` 移到独立 `lint:*` 分组）、或已随其守护对象失效而可删。

### A2.5 本单提出的新依赖数：零

盘点结论：**Stage A 不提议引入任何新第三方依赖。**

- S2（chat markdown 换 remark）消费的是**已在生产依赖里**的 `unified`/`remark-parse`/`remark-gfm`（`packages/reading-view`），是**减法**（删 228 行手写解析器）不是加法。
- 沙箱运行时按 ADR-018 决定二属外采面，但当期不排期、不引入。
- 其余候选全部是「删」或「归并」。

---

## A3 · 四份 ADR 草案（已落 `docs/decisions/`，状态 `Proposed`）

| ADR | 主题 | 新增概念 | 核心裁点 |
|---|---|---|---|
| [ADR-016](../decisions/ADR-016-uniform-slot-filling-protocol.md) | 统一填格协议 | **1**（冻结填格模板） | Chat 侧填格的地址从哪来——答：系统供给闭集三来源，模型不参与 |
| [ADR-017](../decisions/ADR-017-controlled-command-execution.md) | 受控命令执行（bash 入界） | 0（提案—授权—执行是 `FileOpsPlan` 模式推广） | **决定零：建议先不开 bash** |
| [ADR-018](../decisions/ADR-018-execution-isolation-and-sandbox.md) | 执行隔离与沙箱边界 | **1**（隔离等级闭集及其能力绑定） | 只定边界与判据，不排期；无沙箱则能力面必须收窄 |
| [ADR-019](../decisions/ADR-019-dossier-container-and-local-cache.md) | 卷宗容器与本地缓存分区 | 0（ADR-013 时间维 + ADR-005 §1 容器隔离的空间维补全） | 容器是唯一持久分区单位，session 不是 |

**编号说明**：`ADR-015` 留给就绪图已预留的「包的装载与生命周期」议题（就绪图 `PACK-INTERACT-1` 行），故本批从 016 起。若架构不认该预留，四份可整体前移一位（裁决请求 R-5）。

**ADR-017 的性质须特别注意**：它是本批**唯一修订既有 Accepted ADR** 的一份（改 ADR-011 决定二明列的「不引入后台 bash」）。其决定零基于一手源核实给出**反向建议**——详见下节。

### A3.1 bash 一手源核实的结论（本批最重要的单条发现）

就绪图 Round 5 方向②以「reading/edits/writing/bash 采 **pi 成熟范式**」立论。归档 `pi-harness-comparison.md` 全文 17 行、未展开任何工具接口，故本单回一手源 `~/Projects/pi`（v0.75.4，MIT）核实，落 `archive/research-2026-07-20-pi-first-source/`。

实测：**pi 的 bash 范式恰恰是「不做权限模型」**——无白名单、无黑名单、无危险命令识别、无确认弹窗、授权决定零持久化；执行形态是 `spawn(shell, ["-c", command])` 整串交 shell；无默认超时；沙箱只是**示例扩展**非运行时依赖。其 README 把取舍写在明面：「**No permission popups.** Run in a container, or build your own confirmation flow with extensions」。

**因此「采 pi 范式」与就绪图同一句里的「沙盒后期」互相排斥**——pi 的范式**就是**把安全性整体外包给容器。取其形而不取其容器，得到的不是成熟范式，是它明确拒绝承担的那部分风险。

ADR-017 据此建议：**先不开 bash，只开 reading/edits/writing 三项**；若仍要开，其受控形态是本仓自建，不应以「采 pi 范式」描述。

（read/edit 的接口与截断纪律**值得借**，write 的无确认覆盖写与 ADR-004 冲突**不采纳**——见 ADR-017 决定八。）

---

## A4 · TOOL-READ-1 票面重建

**原票面**（就绪图开放工单表）：Work 对话 turn 可请求声明式白名单内的只读工具（首批：读某材料正文 / 列卷宗清单，复用 `resolveForProvider` 与 MaterialStore 既有链）；白名单静态声明（比照 `ScenarioRuntime.toolIds`），仅 `pure_read`，零 effect；**工具结果进 journal 的形状（toolResult 角色 vs 折叠文本）实现侦察后交拍板再动手**；模型不可发现/调用白名单外任何工具；GUI 呼应——工具调用在 Work 画布 trace 区显式呈现。

### A4.1 侦察结论：现状与原票面的落差

现行工具执行是**场景前置一次性全跑**，模型完全不参与选择：

- `runTools()` 在产出序列开始前把 `scenario.toolIds` 声明的全部工具一次跑完（`packages/core/src/scenario-executor/executor.ts:154`）；工具输入来自调用方传入的 `toolInputs: Record<string, unknown>`（`:82`），是确定性的。
- 结果以 `Record<toolId, ToolEnvelope>` 挂在 executor state 上（`:308`、`:446`），**不进 prompt、不进 journal 的独立条目**——只在失败时落一条 `step_failed`（`:181`）。

**落差**：从「全部前置跑完、结果不入上下文」到「turn 内按需请求、结果入上下文」是**真实的机制变更**，不是接线。它需要：
1. 一个模型可用于**请求**工具的通道（当前不存在——契约段四知的「知交互」明列合法交互只有步骤宣告 / ask_user / 通知 / 请求确认）；
2. 工具结果进入下一轮 prompt 的注入位（当前六段无此段）；
3. journal 的 toolResult 条目形状。

第 1 项直接触 ADR-009 决定二的 Work 步骤闭集（`model | deterministic_tool | interaction | projection | confirmation`）与 ADR-011 决定三（模型输出的 tool name 只是不可信文本）。**这是 TOOL-READ-1 的真正门槛，票面原表述「零新 core 机制预期」不成立。**

### A4.2 toolResult 形状：一手源给出了可直接借的答案

归档四家全景对此**无可借答案**（§0.3：只证明 Qoder 有「默认展开」开关存在，未证默认值；「查看原始输出」入口与长输出处理四家均无一字；transcript 角色名被自列为缺口）。

但 pi 一手源给出了一个**与本仓纪律高度契合**的形状：

```ts
interface ToolResultMessage<TDetails> {
  role: "toolResult";
  toolCallId: string; toolName: string;
  content: (TextContent | ImageContent)[];   // 回灌模型
  details?: TDetails;                        // 落盘 + UI 渲染，模型看不到
  isError: boolean; timestamp: number;
}
```

关键机制三条（坐标见归档件）：

1. **`details` 落盘且供 UI 渲染，但不上 wire**——provider 层只发 `tool_use_id`/`content`/`is_error`。这一刀同时满足**账本要全**（审计/溯源）与**上下文要窄**（成本/注意力），正是本仓「审计事件默认不进入下一轮模型上下文」（ADR-011 决定一末条）的现成实现形态。
2. **截断在生产时完成并内联告知模型**（`[Showing lines X-Y of N. Use offset=Z to continue.]`），事后无二次折叠——截断是显式事实不是静默丢弃，与不变量 4 相容。
3. **compaction 永不在 toolResult 处切**（`case "toolResult": break;`），结构性保证 toolCall/toolResult 配对不被劈开——本仓若实现 ADR-019 决定二的压缩，须同守此约束。

**建议**：toolResult 采「`content`（窄，回灌）+ `details`（全，落账本与 UI）」二分形态，作为本票的拍板项。

### A4.3 展开形态：无既成答案，须自裁

归档无料（§0.3）。本仓已有的对位物是 Work 画布 trace 区的账本条目族。建议按既有 voice 与克制审计纪律自裁，不借形。

### A4.4 已受既有裁决约束（ARCH-SCOPE R-3，2026-07-20 准）

并行会话的 R-3 已获架构准，直接落在本票面上：**「⑤ 的锁收窄到涉 effect 的票；`TOOL-READ-1` 待 HARNESS-CORE-1 Stage A A4 票面重建交裁后放行，票面不得携任何 effect 面。」**

本单据此把「零 effect」写成**票面硬边界**而非默认属性：

- 白名单仅 `pure_read`，且经既有 `sideEffect` 门（`executor.ts:118`）在**任何** `confirmationPolicy` 模式下强制（AUDIT-SEAL-1 已落地，`:166`）。
- 本票**不得**顺带实现 ADR-017 的提案—授权—执行三段式（那是 effect 面），即便 ADR-017 获准。
- 本票**不得**引入 `file_write` / `external_send` / `mcp_side_effect` / `authoritative_mutation` 任一类工具，含「无损级 copy/mkdir」——ADR-004 的无损级豁免属 effect 面，本票不取。
- 机器形态：本票新增的白名单常量须有静态门断言其 `sideEffect` 全为 `pure_read`，注入非 `pure_read` 项必须触红。

### A4.5 依赖关系

| 依赖 | 是哪一条 | 为何阻塞 |
|---|---|---|
| **ADR-017 决定八** | reading 类工具走既有 `ToolDefinition`/`ToolEnvelope` 契约，不新造工具协议 | 决定 TOOL-READ-1 的工具是否复用现有契约 |
| **ADR-017 未决 3** | 提案产生位置：新步骤种类 vs 既有 `deterministic_tool` 步 | 直接决定 A4.1 第 1 项（模型请求通道）的形态；不裁则无法开工 |
| **ADR-016 决定二** | 地址只由系统供给、来源为闭集 | 「模型请求工具」与「模型自选目标」的边界须同一套判据，否则两处不一致 |
| ADR-018 决定五 | 等级—能力绑定 | `pure_read` 在 `none` 等级下允许，本票不受阻，但须显式引该条留痕 |
| （前置，已清账） | AUDIT-SEAL-1 全模式 `sideEffect` 门 | 票面原列前置，实测已落地（`executor.ts:166`） |

---

## A5 · Stage B 实现分解

工单序按**依赖**排，不是按价值排。标注可并行者互不相交（已核文件面）。

### 第一梯队（零 ADR 依赖，可立即并行派发）

| 工单 | 一句话范围 | 验收要点 |
|---|---|---|
| `DEBT-CLEAR-1` | 删 D7（`ConfirmationStore.take()`）、D8（`onTurnEvent` 缝）、D10（2 导出 / 9 脚本 / 1 死配置） | 删后全链绿；跨包接口面变更须核消费方为零；`lint:trace`/`lint:thinking` 去重后门链不缺项 |
| `DEBT-DOSSIER-1` | ARCH-SCOPE §1.4 第 3 笔：**令按钮语义与实际入库判据一致**——二选一（接判据 3 处 / 裁掉该 UI 字段 6 处）。**注意：入库能力已在发送路径接通（`App.tsx:567`），本票不是「补入库」**（见 A1.1 更正） | 按钮态与 `listForCase` 实况一致；不产生第二条入库路径；文案与实际行为一致（voice 门）；demo 隔离不破 |
| `DEBT-GATE-LABEL-1` | D9：`pauseAt` 时把 gate label 供给投影，令「未决确认」行生产可达 | 停门场景投影段出现该行；缺省仍逐字节等同；`PROJECTION-RESUME-1` golden 不破 |
| `MD-CONVERGE-1` | S2：chat 面 `ChatMarkdown.tsx` 改用已在生产依赖的 remark，删手写解析器 | `CHAT-MD-TABLE-1` 双层红证重放全绿；渲染回归逐项对照；e2e floor 不降 |

四张互不相交：`core/session` + `core/scenario-executor` / `composer`+`material` / `core/assembly` / `chat`。

### 第二梯队（依赖单份 ADR）

| 工单 | 依赖 | 一句话范围 |
|---|---|---|
| `PERSIST-BACKEND-1` | ADR-019 决定一 + 未决 1 | S1：五处逐字同构 `defaultBackend` 归并为一份工厂 + 4 处裸 `localStorage` 收编；分区维随决定一 |
| `TOOL-READ-1` | ADR-016 决定二、ADR-017 决定八 + 未决 3 | 见 A4；含 toolResult `content`/`details` 二分落地 |
| `S6-EXEC-1` | ADR-017 效果授权面（决定四）+ ADR-004 | D2：gate resolve 后的执行触发、授权持久与事务日志 |

### 第三梯队（大票，另行分批）

| 工单 | 说明 |
|---|---|
| `PANEL-BLUEPRINT-1` | D1，就绪图已开放，四 panel 可分批；本单不改其票面 |
| `GATE-INVENTORY-1` | A2.4：8019 行自研门的一次归并/降频/失效清点。**建议先做清点再定动作**，不预设结论 |

### 不进 Stage B

- 沙箱实现（ADR-018 不排期）；
- bash 实现（ADR-017 决定零建议不开；即便开也须先裁未决 2/3）；
- `ADR-016` 的 UI 触发入口（归 UI 单，须 ADR 先拍板）。

---

## 裁决请求清单

逐项可独立准驳。未拍板项不进 Stage B。

### 一、口径修正（低风险，建议整体准）

1. **R-1**：删就绪图忧一「`workContextSegment` 死参数（SEAL-2③ 在途）」一句——已由 `WORK-TURN-1` H 消解（`App.tsx:575`/`:607`）。
2. **R-2**：修正就绪图 Round 5 方向②的「减法八条·无任意 shell」引用——该清单不存在；真实冲突面是 ADR-011 决定二与 legacy 两句硬承诺（§0.1）。
3. **R-3**：修正归档消费 pass 对 Qoder `evaluated_permission` 的登记——原文只是事件字段，无「持久化」表述，不足以佐证「授权持久化先于 effect」（§0.2）。
4. **R-4**：修正「tool 默认展开形态」的登记——原文只证明设置项存在，未证默认值（§0.3）。
5. **R-5**：确认 ADR 编号从 016 起（015 留给「包的装载与生命周期」预留），或指示整体前移一位。

### 二、四份 ADR 准驳

6. **R-6**：`ADR-016` 统一填格协议——准 / 驳 / 改。（新增概念 1：冻结填格模板）
7. **R-7**：`ADR-017` 受控命令执行——**含其决定零的反向建议（先不开 bash）**。准 / 驳 / 改。
8. **R-8**：`ADR-018` 执行隔离与沙箱边界——准 / 驳 / 改。（新增概念 1：隔离等级闭集及能力绑定）
9. **R-9**：`ADR-019` 卷宗容器与本地缓存分区——准 / 驳 / 改。
10. **R-10**：ADR-017 若准，是否同批修订 `ADR-011` 决定二的「不引入后台 bash」措辞（改为「不引入自由 shell 与后台执行」以免与受控提案形态冲突）。

### 三、ARCH-DEBT 增量五笔逐笔三选一

**§1.4 的三笔半不在此列**——已由 ARCH-SCOPE R-2 裁定（已准），本单无异议、不重开。以下只是 §1.4 未覆盖的增量。

11. **R-11**：D6 VPKG bindings 非真只读 → 建议 **ⓒ 显式容忍 + 静态门**（锁「生产代码零 `.set()`」），或 ⓑ 若要求语义级不可变。
12. **R-12**：D7 `ConfirmationStore.take()` → 建议 **ⓑ 删**。
13. **R-13**：D8 `onTurnEvent` 零供给方 → 建议 **ⓑ 删**（或 ⓒ + 到期指针）。
14. **R-14**：D9 `pendingGateLabels` 恒空 → 建议 **ⓑ 小票接线**。
15. **R-15**：D10 死代码三项 → 建议 **ⓑ 删**。
16. **R-16**：A1.3 三笔已裁定的已知边界是否需重裁（默认：不需要，只请核对）。

### 四、OSS 减法采驳

17. **R-17**：S1 五处同构 store backend 归并 → 建议**采**，但须与 R-9（ADR-019 决定一）同批定分区维，避免归并后再改。
18. **R-18**：S2 chat markdown 换 remark → 建议**采**（零新依赖，删 228 行手写解析器），单独立票带回归证据。
19. **R-19**：S3 `demo-runtime` 包内 3 处 `createHash` 归并 → 建议**采**（零风险）。跨 `crypto.subtle`/`node:crypto` 的分流**不动**。
20. **R-20**：S5 `spike/` → 建议**保留留档**（现行 SPEC 四处引为 Plan B 证据），但清理不同源制品（`spike/ts/package-lock.json` 属 npm 制品且不在 pnpm workspace 内）。
21. **R-21**：A2.1 三项「克制型自研」（diff 前后缀裁剪 / SSRF 用 `node:net` BlockList / OOXML 纯 TS）→ 建议**维持自研**，并把已有拍板留痕升格为 OSS-SUBTRACT 的正面答卷。
22. **R-22**：A2.3 五项「不换」结论（状态管理 / 图渲染 / 文本提取 / 校验 / 重试超时）→ 请核准或指出需重估项。
23. **R-23**：A2.4 自研门 8019 行 → 建议立 `GATE-INVENTORY-1` **先清点再定动作**，不预设归并/删除结论。

### 五、实测与排期

24. **R-24**：ADR-018 未决 1——是否现在投入 macOS Seatbelt 可行性实测（含 `sandbox-exec` 弃用风险）。不实测则当期永久停在 `none` 等级，这可接受但须显式选择。
25. **R-25**：ADR-017 未决 2/3——若准 bash：首批白名单内容（建议起点为**空集**，按真实场景逐条拉动）与提案产生位置（新步骤种类 vs 既有 `deterministic_tool`）。
26. **R-26**：A5 第一梯队四张是否即刻并行派发（零 ADR 依赖，文件面已核互不相交）。

27. **R-27**：`docs/decisions/README.md:25` 写「每份 ADR 的『来源』只列 commit SHA，**不引用归档文档**」，与 `docs/README.md:49` 的史料引用例外（2026-07-18 拍板：ADR 来源段可引 `archive/` 路径作历史线索）**直接冲突**。本批四份 ADR 按后者与本单票面执行（来源段含归档路径）。请裁：修订 `decisions/README.md:25` 使其与例外一致，或指示四份 ADR 改写来源段。**本单未擅改该规则行**（只增表行），留待拍板。

### 新依赖采驳

**本批提议新增第三方依赖数：零。** 无需逐项采驳（详见 A2.5）。

---

## 架构裁决（2026-07-20，逐项）

**一、口径修正：R-1 至 R-5 全准。** R-5 确认编号从 016 起，015 维持预留，不前移。

**二、四份 ADR：**

- **R-6 准 ADR-016**。未决同批裁定：①冻结填格模板随垂类包 descriptor 声明、registry 冻结（沿 ADR-011 决定四 InteractionTemplate 同一形态）；②Chat 填格产物以带版本字段的 Turn journal 条目持久，不上 `ArtifactEnvelope`（信封留给 artifact；跨版本问题实际出现再议）；③UI 触发入口另票，ADR 落 Accepted 后立。
- **R-7 准 ADR-017 含决定零：bash 当期不入界。** 理由照单：pi 范式即「安全外包给容器」，取形弃容器等于承接其明确拒绝的风险；work agent 已知场景无一必须任意命令；`FileOpsPlan` 形态更优。决定一至七**封存为「若入界」的既定受控形态**——未来重启 bash 议题不得从零辩论，须携新的必要性证据对着本 ADR 提修订（同洇染拒迁的保全逻辑）。决定八生效：reading 走既有 `ToolDefinition`/`ToolEnvelope` 直接实现；edits/writing 属 effect 面另票，写入必须落工作稿分区经既有 gate；三段式专属 effect 面，pure_read 不套（未决 4 随此裁定）。
- **R-8 准 ADR-018**。未决①见 R-24；未决②准——ingest 随本 ADR 登记「设计定位 `process`，实现后须越界反例证等级」；未决③文档级即可，首个申请超出 `none` 能力面的票出现时再升机器可读。
- **R-9 准 ADR-019**。未决同批裁定：①**就地补 container 维**（三次复用先例已稳，零迁移风险；统一布局无当期收益）；②渐进披露 index 惰性建立 + 可整体重建起步，失效即重建；③未归档区设上限，超限诚实提示归档/清理，不拒新建不静默丢，数值归实现票。
- **R-10 准**：同批修订 ADR-011 决定二措辞为「不引入自由 shell 与后台执行」，原禁令意图不变、表述更准。

**三、ARCH-DEBT 增量：** R-11 裁 **ⓒ+静态门**（SPEC 明记此为词法级约束，非语义级不可变）；R-12 **ⓑ删**；R-13 **ⓑ删**（真实消费方出现时可回）；R-14 **ⓑ小票接线**；R-15 **ⓑ删**；R-16 三笔已裁边界核对无误，不重裁。

**四、OSS 减法：** R-17 **采**，与 ADR-019 未决①同批（就地补维 + backend 工厂归并 + 4 处裸 `localStorage` 收编）；归并止于 backend 工厂，不越 ADR-019「明确拒绝」的通用 KV 线。R-18 **采**，单独票带 `CHAT-MD-TABLE-1` 红证重放。R-19 **采**。R-20 **采**（删 `spike/ts/package-lock.json` + SPEC 一行声明非 workspace 快照）。R-21 **准**，三项留痕升格为 OSS-SUBTRACT 正面答卷。R-22 **准**，五项不换维持；`App.tsx` 体量债走 D1 拆分线，不由换库解决。R-23 **准**，`GATE-INVENTORY-1` 先清点再定动作。

**五、实测与排期：**

- **R-24 裁：不实测，当期显式停在 `none`。** 依据决定五的等级—能力绑定：bash 不入界、TOOL-READ-1 为 `pure_read`，当前没有任何票需要超出 `none` 的能力面。Seatbelt 实测挂「首个需要超出 `none` 能力面的票」为强制前置——需求拉动，不预研。
- **R-25**：白名单议题随 bash 不入界失效。**TOOL-READ-1 模型请求通道方向裁定**：走「知交互」封闭动词集的显式扩集——新增 `request_tool` 动词，`toolId` 以注入白名单 `z.literal` 闭集锁定，白名单外即普通不可信文本在校验层拒收（与 ADR-016 决定二同一判据）；执行仍落 `deterministic_tool` 步，**步骤闭集不扩**。此扩集属跨层契约变更，以 ADR-011 修订形式落痕（动词集扩集条件 + 红证要求 + 四知文本 golden 同步），随 Stage A 收口批执行。toolResult 采 A4.2 的 `content`/`details` 二分形态，照准。
- **R-26 准**：第一梯队四张即刻并行派发。`DEBT-DOSSIER-1` 二选一裁**接判据**（保留容器化仪式语义并使其真实；硬约束：复用 `App.tsx:567` 既有链，不得产生第二条入库路径；实测不可行则暂停回报，不得自行改裁）。
- **R-27 准修订** `decisions/README.md:25` 与史料引用例外一致；四份 ADR 来源段维持现状。

**收口序**（本单 Stage A 闭合动作）：①按上列裁定回填四份 ADR（未决节改「已裁」并记裁定，状态 `Proposed`→`Accepted`）+ ADR-011 两处修订（决定二措辞、动词集扩集条款）+ 就绪图 R-1/R-2 修正 + `decisions/README.md:25` 修订；②提交分两枚——先提交交付原貌，再提交裁决回填，保留「草案→裁决」历史；纯文档批直接 `main`（先例 `57bc058`），注意与票乙会话的就绪图改动谁先落谁 rebase；③Stage B 第一梯队四张并行开工，第二梯队（`PERSIST-BACKEND-1`/`TOOL-READ-1`/`S6-EXEC-1`）在收口批落 main 后放行。

