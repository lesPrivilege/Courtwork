# 架构评估 · ARCH-SCOPE-2026-07-20

事件性文档，随裁决闭合归档。本单性质是**读源码评估 + 对外叙事修订**，不写产品代码、不改 schema、不动门的断言集。

基线：`main@e0dc4ac`（评估起点）；T2 改动已提交 `10a354e`。

口径纪律：本文所有「实况」结论均来自本轮实跑或 `file:line` 复核；凡未找到确凿证据的一律写「未找到证据」，不以推断补齐。与 `docs/status/current.md` 冲突处，以 current.md 为准并在 §5 登记漂移。

---

## 1 · T1 候选盘点

### 1.1 判定口径

- **现在可做**：前置在源码内实测就绪，无未拍板契约点。
- **需前置**：缺一个具名前置（ADR、契约单、外部条件）。
- **不适合本阶段**：前置不在工程控制范围内，或收益不支付复杂度成本。

规模按「实现会话数」估：**小**≈1 单内轻松完成；**中**≈1 单饱满；**大**≈需拆批。

排序原则依工单要求：**真实用户价值与主线推进 > 门禁完备性**。

### 1.2 候选表

#### A 组 · 就绪图开放工单表

| 候选 | 判定 | 依据坐标 | 规模 |
|---|---|---|---|
| `FILE-PREVIEW-1` | **现在可做** | `convertToReadingView` 已由 desktop 直接消费（`apps/desktop/src/composer/Composer.tsx:85`，注入契约 `composer/process-upload.ts:6`）；rails-compact 四步退役对象四个全在（派生 `App.tsx:2100`／类名 `App.tsx:2210`／CSS `styles.css:305`／存在锁 `scripts/assert-layout-converge.mjs:48`），可原样执行 | 中 |
| `TOOL-READ-1` | **现在可做**（但被对齐计划⑤挡，见 R-3） | 三项前置全绿：`ScenarioRuntime.toolIds`（`packages/registry/src/package-registries.ts:30`）、`resolveForProvider` 注入面（`apps/desktop/src/work/legal-s3-binding.ts:146`，测试已证可注入 `legal-s3-binding.test.ts:136`）、AUDIT-SEAL-1 全模式门（`packages/core/src/scenario-executor/executor.ts:118-121`，反例 `citation-repair.test.ts:145/172/189`） | 中 |
| `UI-RESIDUE-1` 批二 | **现在可做** | 批一 helper 在 `tests/e2e/overlay-residue.ts:153`；七个状态变量原名全在（`App.tsx:390/411/412/421/477/999/1137`），DOM 投影已就位（`App.tsx:2211-2218`）可直接供矩阵断言 | 中 |
| `ARCHIVE-MANAGE-1` | **需前置**（持久底座缺一半） | `archived` 只是内存过滤谓词：`case-store.ts:181` 注释「已归档案不入持久」，`:189-192` 投影时 `continue` 剔除；`PersistedCase`（`:32-41`）五字段无 `archived`。**票面要的「查看／恢复」在持久层没有底座**——归档即不可逆消失。Settings 七区无数据管理席位（`SettingsPage.tsx:31-38`） | 中（先补持久语义再做面） |
| `PM-SCHEMA-1` | **现在可做** | 缺口在源码坐实：`score-calc.ts:45` 返回 `number \| {low,high} \| null`，`schemas/priority-score.ts:73` 的 `score` 不收 null。顺带项（凡例 OOC/Estimate 三态件）设计缺口仍在 | 小—中 |
| `EXPLORE-RAIL-1` | **需前置**（宿主能力位缺） | Turn journal 正文可读（`turn-store.ts:202-206` → `chat/session-transcript.ts:90`）；但 opener 插件虽注册（`src-tauri/src/lib.rs:1958`），**capability 白名单只有 `opener:allow-open-path` / `allow-reveal-item-in-dir`，无 `allow-open-url`**，TS 侧同样只有两个动词（`system/system-open-client.ts:29/32`）。开系统浏览器需新增权限位 | 小—中 |
| `PREVIEW-TAB-1` | **需前置**（与 PANEL-BLUEPRINT 定序） | 现状是构建期写死六项 + 单个布尔过滤（`App.tsx:162-174`），非按 artifact 动态生成；ADR-014 已 Accepted（`docs/decisions/README.md:20`）。多 artifact 并列与 `containerPackBinding` 数组席位在 desktop 源码内未找到 | 中 |
| `PANEL-BLUEPRINT-1` | **需前置**（先定分批口径） | 见 §1.3 B 组第 1 笔 | 大 |
| `GENERIC-PACK-1` | **需前置**（挡在⑤后） | `admitPackages` 准入点在 `packages/registry/src/admission.ts:562`，组合根写死 `admitPackages([LEGAL_PACKAGE, PM_PACKAGE])`（`composition/package-runtime.ts:18`），符合票面「本单零动态装载」边界 | 大 |
| `PACK-INTERACT-1` | **需前置**（配对 GENERIC-PACK-1） | Settings 无包管理席位；建案链无选包交互；「未安装垂类包」空态文案未找到 | 中 |
| `SCHEMA-EXEMPLAR-1` | **需前置**（下半无实证） | 上半已完成且已上门：`docs/design/schema-exemplar.md` + `assert-schema-exemplar.mjs`。下半「至少一张新表从凡例衍生过门」**未找到实证**——就绪图 `:117` 所称的 `RiskReviewSurface` 在 `apps`/`packages`/`docs` 全仓 grep **命中 0**；`r2-tier-ledger.json` 内 `PrdReview` 命中 **0** | 中 |
| `WORKBUDDY-INTERACTION-BENCH` | **不适合本阶段** | 只读研究台，不进权威链；其唯一下游 `UI-RESIDUE-1` 批二的枚举输入已由批一清单 + 七变量 DOM 投影覆盖 | — |

#### B 组 · handoff 案头队列

| 候选 | 判定 | 依据坐标 | 规模 |
|---|---|---|---|
| **ARCH-DEBT 裁定会（七笔）** | **现在可做，且比票面便宜得多** | 逐笔复核后**七笔实为三笔半**，详见 §1.4 | 小（半单） |
| `OSS-SUBTRACT-1` | **现在可做** | 一次性盘点票，无源码前置 | 小（派 Sonnet） |
| ADR · 统一填格协议 | **现在可做** | 素材袋已备（调研消费 pass 已裁 bojieli 结构化输出实践入此 ADR，`archive/README.md:54`） | 小 |
| ADR · bash 受控 | **现在可做，且是⑤的真正关键路径** | 素材三簇齐（TRAE 命令三态／Qoder `evaluated_permission`／WorkBuddy 先批后执行，`archive/README.md:34`） | 中 |
| ADR · 容器化 | **需前置** | 需先定 chat-as-dossier 是否升格；素材在归档但未立项 | 中 |
| `LEGAL-FIELD-1` | **现在可做** | B4 已把「新语义两件」的**拦路点定位在数据不在画法**：无 `TimelineEvent.executor`、无 `PartyEdge.factTier` 即无形，前向守卫两向已装。契约单本身零 UI | 小—中 |
| **B5 票面** | **建议销号**——已被 SKIN-R2 P4 实质吸收 | `themes.dark` 已上身（`styles.css:157-194` 单块 34 行纯 token 换值，零组件分支，边界门 `deslop-scan-lib.mjs:805` + 四类真 mutation 红证 `apps/desktop/ACCEPTANCE.md:3812-3816`）；`.titlebar` 已删（裸选择器零命中，死账已清 `assert-rule-grammar.mjs:237`，删除有 mutation 红证 `ACCEPTANCE.md:3816`）；开工铃 `schema-marks.spec.ts:69` 已于 `f8d10b5` 同 commit 翻红并置换为真断言；深宗四槽已有真 Tauri WKWebView 独立复摄证据（`craft-evidence/SKIN-R2-P4/acceptance-f8d10b5/`）。**仅余一项**：settings-optin 贴阈例 B5 复测注记未落——`tests/e2e/ui-residue.spec.ts:323-326` 前置注释仍是待办态，放宽到 3 之后该例深宗底下实测 Δ 是多少未找到证据 | 余量：**小**（一条注记 + 一次实测） |

#### C 组 · 归档「方向已定、工单待立」

| 候选 | 判定 | 依据 | 规模 |
|---|---|---|---|
| `SKILL-REFINERY-1` | **不适合本阶段** | 定位已自陈为「内部 dogfood」（`archive/README.md:42`），不在产品主线；发版后队列合理 | 中 |
| invest 实验田 | **不适合本阶段** | 后段挂 scheduled ADR 门槛，而 scheduled 必须等 ADR 队列第 1–2 项（identity／trigger context）——`implementation-readiness.md:155` 明拒「以 trigger-blind executor 作支持证据」 | 大 |

#### D 组 · 长期缺口

| 候选 | 判定 | 依据坐标 | 规模 |
|---|---|---|---|
| **Word/WPS 真机 roundtrip** | **现在可做，且性价比最高** | 不是编码票，是一次核验会话。当前状态：`current.md:56` 记本机当时无 Word，双端「打开—轻改—保存—回读」从未执行。output 侧 golden／安全反例／`verification-checklist.md` 已备 | 小（一次会话，需装 Word） |
| `services/ingest` | **不适合本阶段** | 全目录仅 `SPEC.md` 一个文件、35 行，零代码零测试零 `pyproject`。`SPEC.md:3` 自陈 W3 spike 未开工，`:18` 明写版本化 wire 未立契前不得接入。真正阻塞项是**经授权且脱敏的真实法律扫描件**（`implementation-readiness.md:128`），不在工程控制范围 | 大（且外部阻塞） |
| 真机复验四项 | **现在可做（只剩 D）** | A（附件正文）`pilot-2026-07-17.md:44` 已复验成立（Input 241→5337）；B（场景全链）`:129` 第六轮通过；C（材料入口）`:44` 成立。**D（布局居中）在台账全文未找到复验成立记录**——第二/三/五/六轮成立项清单均未提及。另 C 的「拖拽文件夹」径在成立记录中未单独点名 | 小 |
| 公证链 | **不适合本阶段** | 零工程前置可做：`tauri.conf.json:35` `signingIdentity: "-"`，无 `hardenedRuntime`/`entitlements`/`notarize` 配置位；`release/` 无任何 `notarytool`/`stapler` 脚本；`ACCEPTANCE.md:259-261` 实测 `find-identity` 0 valid、`notarytool` exit 64。**卡在采购 Apple Developer ID，非代码** | — |

#### E 组 · 附录 C1–C5

见 §3，判定与规模随该节。

### 1.3 建议排序

**第一梯队 · 真实用户价值（建议本轮派）**

1. **`FILE-PREVIEW-1`** — 当前非 demo 案的右栏「原件阅读」是**整块诚实缺席**（READER-ISOLATION-1 的正确产物）。后果是：用户把 20 份材料入了卷宗，一份也打不开。对一个以文书为中心的产品，这是最大的可见空洞，而前置全绿、顺带条款（rails-compact 退役）可原样执行。
2. **Word/WPS 真机 roundtrip** — 产品论点是「用户认 Office，不认 md」（README §packages/output），而这条论点从未在 Word 里验证过一次。一次核验会话即可把仓内最大的一项 external-validated 空白转为有证据，或者暴露真缺陷。**单位成本的信息量全表最高。**
3. **真机复验 D 项**（含 C 的拖拽径补测）— 台账里唯一未见复验留痕的一项，小，且不补就无法宣称首轮试点闭合。

**第二梯队 · 主线推进**

4. **ARCH-DEBT 裁定会** — 因实为三笔半（§1.4），现在是半单成本；它是⑤的第一道闸，清掉即解锁后续。
5. **ADR · bash 受控** — ⑤ 三 ADR 里唯一真正卡住 harness 真实化线的一张；素材袋已满。
6. **`TOOL-READ-1`** — 前置全绿，零 effect，建议连同 R-3 的复议一起放行。
7. **`LEGAL-FIELD-1`** — 契约单，解锁 B4 两件新语义；零 UI，风险低。

**第三梯队 · 结构性还债（分批，不宜大爆炸）**

8. `PANEL-BLUEPRINT-1` 首批一枚（建议 `matrix`，78 行、prop 面最窄）— 用一枚跑通 `kind:'component'` 全链，把「descriptor→view 通、view→component 不通」这半段补上，再决定余三枚节奏。
9. `PM-SCHEMA-1`、`UI-RESIDUE-1` 批二、`ARCHIVE-MANAGE-1`（持久语义先行）。

**暂不派**：`GENERIC-PACK-1`/`PACK-INTERACT-1`（挡在⑤后且规模大）、`PREVIEW-TAB-1`（与 8 定序）、`EXPLORE-RAIL-1`（需权限位裁定）、`SCHEMA-EXEMPLAR-1` 下半（需先补 one-shot 实证载体）、`services/ingest`、公证链、C 组两项。

### 1.4 ARCH-DEBT 七笔逐笔复核（就绪图 `:64` 清单的实况修正）

裁定会开会前应先接受下列修正，否则会在已清偿项上耗时：

| # | 就绪图所述 | 实况 | 处置建议 |
|---|---|---|---|
| 1 | Legal 四 panel 硬编码（最大一笔） | **属实且全额未偿**。硬编码是 `App.tsx:1917-2036` 的顺位 `if` 链 + 末尾 fallthrough（`revision` 无判等，是默认落点，20 个 prop 手工穿线 `:2015-2035`）；同套 view 字面量在 App.tsx 另硬编码 5 处（`:132`/`:162-169`/`:1085-1099`/`:2761-2769`/`:2101`）+ flow 映射 3 处。四 panel 本体约 533 行。**关键实况：`kind:'route'` 载荷只有一个 view 字符串不携组件（`preview/HostRendererRegistry.ts:13-19`），故 descriptor→view 已通、view→component 仍全靠 if 链**；只有 `courtwork.artifact-table.v1` 走了 `kind:'component'` 全链 | 重构票入队，分批 |
| 2 | S6 执行时序「已裁 desktop 装配点模式，待实现」 | 「待实现」属实（`courtwork-host-renderers.ts:19` 登记为 `passive`；唯一入口是本地 `fileOpsMode` boolean `App.tsx:400`，且 `:1920-1922` 非 demo 直接返回空；plan 来自 `createDemoFileOpsPlan`，宿主是 `createMemoryFileOpsHost`）。但**「已裁 desktop 装配点模式」未找到证据**——找到的全是 `[需架构拍板]` 悬置（`packages/legal/SPEC.md:13`、`ACCEPTANCE.md:5`、`packages/core/ACCEPTANCE.md:120`）。最接近的是 S3 的裁定（`apps/desktop/SPEC.md:614-630`），不是 S6 的 | **先更正就绪图措辞**，再按未裁项裁 |
| 3 | chat 附件「存入卷宗」容器化仪式 | **问题陈述需重写**。按钮本体确是纯状态迁移（`Composer.tsx:271-290` 只翻 `scope`，`App.tsx:1475-1481` 只建空壳案）；但**真入库在另一条路径已接通**：`App.tsx:567-569` 判据是 `caseBinding.kind === 'grant'`，对该案所有 ready 附件一律 ingest（`:1694-1740` 真调 `hostAuth.writeFile` + `materialStore.ingest`）。真正的债是**按钮语义与实际入库判据不一致**，不是「没有入库能力」 | 二选一：接判据（3 处）或裁掉该 UI 字段（6 处）。**小** |
| 4 | interaction actor 写死 `desktop/local-user` | **实为两笔，就绪图并成一笔**。`App.tsx:531` 是 `{channelId:'desktop', actorId:'local-user'}`（**无前缀**，InteractionActor）；`work/work-runtime.ts:33` 才是 `'desktop/local-user'`（ConfirmationActor，另带硬编码 `role:'主办律师'`）。两处**均落持久事件**（InteractionResolvedEvent / RevisionEvent + `event-log.ts:34` confirmations） | 拆两笔登记；替换须带存量事件迁移策略，前置 authenticated principal ADR（当前不存在） |
| 5 | `workContextSegment` 死参数（SEAL-2③ 在途） | **已清偿**。AUDIT-SEAL-2 已放行（`apps/desktop/ACCEPTANCE.md:16/28-30`），静态锁在 `assert-credential-contracts.mjs`；现存三处全是真链 | **销号** |
| 6 | `.titlebar` 顺带删（挂 B5） | **已清偿**（见 B 组 B5 行） | **销号** |
| 7 | `schema-marks.spec.ts:69` 前向红卫（B5 开工铃） | **已响并已兑现**——`f8d10b5` 同 commit 触发翻红条件并置换为真断言（几何双宗逐位相等 + 四色位各随宗），验收实跑 2/2 | **销号** |

**净结果：七笔 → 需裁三笔（#1／#3／#4），一笔先更正措辞（#2），三笔销号（#5/#6/#7）。**

---

## 2 · T2 对外叙事（已实施 + 提案）

已提交 `10a354e`，全链门绿（`pnpm -r build`／`lint`／`test` 148 files·1261 tests；site:guard 子门 `node --test` 90/90、release-truth PASS、versional-language PASS、七条 desktop lint 全 0；deslop-scan 非 `.dc.html` 来源失败 **0** 条）。

### 2.1 已改三处

1. **`site/og.html` 成熟度越界**（本轮最严重一处）。量化：`index.html` 出现「合成数据试点」**7 次**，`og.html` 出现同类限定词 **0 次**——og 卡是全站唯一零对冲面。
   - 撤下「案件内容永不训练」：`current.md` 无对应能力条目；`current.md:25` 记唯一注册 provider 为 DeepSeek，即案件正文经第三方 API 出站，该断言的对象是第三方数据处理政策，本项目无验证手段。保留可自证的「原件只读」。
   - 补上制品边界（`开发构建未公证`）：`index.html` 由 `release-truth-lib.mjs:146` **强制**携带 `ad-hoc` 与 `未公证`，og 卡无此门也无此话。
   - 「律所与法务团队的案件级 AI 协作工作台」→「面向律所与法务团队的案件级 AI 工作台」：述定位不述交付，与 `index.html:59` 的中性品类词对齐。
2. **`site/index.html` 卷二补段级对冲**。卷一（`:100`）与卷三（`:162`/`:189`）均有，卷二没有——而卷二恰是唯一展示**真实产品截图**的一节，其 alt 带「合成数据试点」而正文不带（alt 不为视力正常读者所读）。新增行与卷一同构，字符全部取自既有页面用字（字体子集门实证：首版含 `三`/`作` 二字触红 `[display-font]`，改用在册字后转绿）。
3. **README 漂移数字**。实跑复核三处已过期：core 测试文件 `24`→实测 **33**；provider「九个导出子路径」→实测 **10**；reading-view「16 个测试」→实测 **17**。另 schemas「11 个单测与源文件一一对应」计数对而配对断言假（11 测试 vs **13** 非测试源文件）。按「会漂移的数字退出文案、改指门槛真源」一律撤下裸计数；架构师在树修订新写的「60 个 Vitest 文件」虽当前准确但无门守护，同类处置。保留 `十二族`（有运行时闭集门 `VisualizationGallery.tsx:112` 反锁）与指向 `assert-test-count.mjs` 的表述。

**差异点叙事**：README §7 的「schema 管理 + 结构化 preview」两句本轮复核判定已到位，无需重写；站面对应承载是卷一（证据链四步）与卷三（同一底座换判断），亦到位。本轮未新增营销性表述。

### 2.2 提案（未改，待裁）

- **P-1 · `site/assets/og.png` 字节已漂移且无门看管**。`index.html:11` 的 og:image 指向它，`build.mjs:16` 直接拷贝不重渲；当前 SHA-256 `a91c0120…dc2a`，唯一留档 `craft-evidence/SKIN-R2-P5/after/manifest.json:18` 记为 `21eed725…`，已不一致，且无任何脚本读该 manifest。**后果：本轮 og.html 的文案修正对读者不可见**——og.html 从不发布（`build.mjs:15-20` 不拷贝它），其文案只经 og.png 抵达读者。需重渲 og.png 并补字节绑定门（体例照 `d32985f` 的 manifest+测试双绑先例）。
- **P-2 · `site/index.html:113`「页码与文本区间由系统解析」**读作 runtime 能力，而 citation resolver 在 `current.md:38` 属「包与契约成立，production 未完全装配」。段级已有 `:100` 对冲，判定为**可接受但边缘**；若从严则需改写，成本是新字入子集。
- **P-3 · 站面无任何成熟度门**。C 节实况：站面文案的全部机器约束是 11 个禁词 + 一条占位正则 + 两条 PM 专项串；**不存在任何规则要求对冲词出现、或禁止「已上线」类断言**。`已验收工作链`（`fixture-claims.mjs:133`）与 `Schema catalog preview / 尚未接通运行链`（`:190-194`）是仅有两条被逐字锁定的口径串，且是**锁既有措辞不被删**，不是**禁新增越界措辞**。本轮 og 卡的越界正是这个缺口的产物。建议立一条「成熟度断言黑名单」门（禁 `已上线`／`生产可用`／`全面可用` 类，扫全部对外文件含 og.html）。
- **P-4 · `lint:voice` 未接站面且结构上看不见英文**。作用域 `apps/desktop/src`（`assert-voice-copy.mjs:11`），不在 site:guard 链内；且 §6 机器判据要求「工程词与中文同串」，故**纯英文文案整体不进该门**——详见 §4.5。

---

## 3 · 附录 C1–C5 核实结论

### C1 · 档位账 `target` 不验内容 —— 成立，但缺口位置与原判不同

`r2-tier-ledger.json` 206 条，无 `fragment` 字段（片段内联在 `target` 里，形如 `path#anchor`，三种词汇混用无类型标注）。校验在 `skin-r2-ledger-contract-lib.mjs:110-120`，只做**字符串逐字相等 + 同 target 全账唯一**，不验路径存在、不解析片段。`signedR2LedgerRows` 只有 85 行，**121 条从不进入 target 检查**（实测探针：给未签行注入 `zzz/nonexistent/path.css#garbage` → 零失败）。

**原判「文件路径实际不存在」未证实**：206/206 路径全部存在。真实缺口是**片段大面积不可解析**——markdown 锚 13 条中 **9 条**无对应标题，含 `P0-A06 → principles.md#素净中性条款`（无此标题）、`P0-A05 ×3 → #总纲-pages/agent/schema`（全文唯一「总纲」标题是 `principles.md:5` 的 `## 总纲 · 激进度梯度`）、`P2-T14 → apps/desktop/SPEC.md#SKIN-R2-P2`（该文件无含此串的标题行）。CSS 片段 168 条中 21 条的选择器在目标文件内不作为字面量存在（多为概念分组名）。两门当前均绿，与九条死锚共存。

**处置建议**：赞成原提案（SPEC 言明流程台账定位 + 补路径存在性半边校验 + fragment 诚实降格为文档性指针）。补一条：**存在性校验须覆盖全部 206 条而非 85 条已签行**，否则新缺口仍从未签行进入。

### C2 · `--important-title` 无穷举闭集门 —— 成立，但建议**先答该 token 该不该存在**

实况确认：Agent 侧 5 个消费点（`styles.css:346/543/582/1485/1836`），正向断言（`versional-language-contract-lib.mjs:60-68`）只锁 3 个（346/582/1485），漏 `543`（`.chat-case-title` 另一变体）与 `1836`（`.gallery-header h1`）。闭集门**只存在于 Pages 侧**（`deslop-scan-lib.mjs:1224-1275`，真闭集 + 反向守卫 + keyframe 逃逸封堵），且只吃 `site/styles.css`。Agent 侧唯一反向防线是 6 项**具名黑名单**（`:69-73`），列举式非闭集——探针实证：向未登记的 `.risk-grid` 注入泥金零失败。

**但本轮实测发现一个更前置的问题（见 §4.2）：该 token 在两宗都不产生可辨的独立视觉身份。** 浅宗 `--important-title: #232b38` ≡ `--text-primary`（逐位相同）；深宗 `#d9ae6a` ≡ `themes.dark.semantic.amber.fg`（tokens.json `:119` 明载同值）。深宗实测该值共 13 处渲染，其中**重要标题 1 处、数据区语义 chip 12 处**。

**处置建议**：维持原「排在 T3 体例复议结论之后」的判断，并把复议问题具体化为 R-8。若 R-8 判定该 token 保留，则闭集门按 Pages 侧现成形态迁一份到 Agent 侧即可（有现成实现可抄）。

### C3 · 三份 `.dc.html` 悬空锚 —— 成立，且当前正让 site:guard 红

三份均未跟踪，且 `git log --all` 证明**从未进入过 git 历史**（非被 ignore）。SHA 引用四处（`VERSIONAL-LANG-1/SOURCE-HASHES.json:8/14`、`VERSIONAL-LANG-2/PROPOSAL.md:7/8`、`VERSIONAL-LANG-3/PROPOSAL.md:4/6`），**实算 SHA 全部匹配无漂移**。分野：`Work Agent 原型.dc.html` 与已跟踪的 `archive/design-prototype-2026-07-19-r2/work-agent-prototype-r2.html` 逐字节同源（同 148,735 bytes、同 SHA），仓内有备份；**另两份仓内零备份**——被四处 SHA 引用，字节只存在于本机未跟踪文件。`SOURCE-HASHES.json` 无任何脚本消费者，无 SHA 校验门。

当前实跑：`node site/scripts/deslop-scan.mjs` **EXIT=1，81 条失败 100% 来自这三份**（41/35/5），live tree 其余零失败。扫描面定义在 `deslop-scan.mjs:218-236`：只有目录黑名单没有扫描根白名单，`docs` 不在黑名单、`.html` 在收录集，故必然被扫；未跟踪状态不构成豁免（用 `readdirSync` 不读 git index）。同形态先例已处置过一次：`:214-217` 记 2026-07-19 因 `.claude/worktrees/*` 的 109 项误报而拍板加排除目录。

**处置建议**：赞成原提案（落 craft-evidence，deslop 范围按角色不按目录）。补两条：①另两份**仓内零备份**是真实的证据链断裂风险——四处 SHA 引用指向本机文件，换机即锚空，落仓优先级高于扫描面调整；②扫描面调整不宜再加目录黑名单（那是第二次打补丁），宜改为**按角色分面**：产品面（site/、apps/desktop/src）走全规则，证据实物面走 SHA/许可规则，不走 raw-color。

### C4 · `model-config` parse 失败静默落默认 —— 成立，且不止「低危」

`model-config.ts:128-146` 有**五条降级路径全部静默**（`:131` 无值／`:133` providerId 非法／`:138-139` modelId 损坏／`:140-141` reasoning 非法／`:143-145` 裸 `catch {}` 无绑定变量）。全文件 grep 日志/事件/遥测/上报通道**零命中**。同文件 `:59-69` 另有第二个裸 catch（localStorage 抛异常静默回落 memoryStore，配置跨会话蒸发同样无痕）。现存单测 `model-config.test.ts:50-60` **正向确认了「静默落默认」是当前契约**。

**用户可见性的确切影响**：降级后 composer 芯片、popover 与 Settings（`App.tsx:2143-2145/2173/2726/2752`）**照常渲染默认值**，与「用户确实选了这个配置」在像素上不可区分；无 toast、无角标、无 `data-*`、无 console。函数签名 `(): ModelConfig` 本身不携带「是否降级」信息。

**最隐蔽的是路径④**：用户曾选 `deep`，降级后静默变 `standard`，而 `App.tsx:1323` 把 `reasoning` 打进 `modelRoute` **随每次请求发出**——用户以为在用深度推理档，实际每一轮都走标准档，账单与延迟特征随之改变，界面始终显示「标准」且从未收到切换通知。

对照不变量 4（「静默降级零容忍；缺配置、缺覆盖、**降档**、拒载与失败都必须显式」）：路径④ 字面就是「降档」且完全不显式。**建议从「低危」上调**，处置见 R-11。

### C5 · README 会动的数字是否全部退出 —— 本轮已裁并已实施

见 §2.1 第 3 条。裁定口径：**只保留有机器门反锁的计数**（`十二族`）**与指向门槛真源的表述**（`assert-test-count.mjs`），其余裸计数一律退出散文。

---

## 4 · T3 设计体例实况评估

复议行体例：旧裁定原文坐标 → 效果证据 → 处置建议。

### 4.1 用色 · 语义色配额

**实现与裁定一致**：是。四色相 + 中性（`tokens.json:41`）、graphic/fg 双轨、tint 只用于 chip 不作数据行底——本轮在 S3 修订预览实测均守住。

**实际效果**：本轮在最密面（样板案 → 阶段二 → 修订预览）逐元素统计有色渲染：

| 色 | 浅宗渲染数 | 消费面 |
|---|---|---|
| 琥珀 `#8F6420` | **12 文字 + 12 底** | 待确认 ×6、中危 ×3、未核验 ×1、含未核验依据横幅、C 级角标 |
| 绿 `#15803D` | 5 | 已核验 ×5 |
| 红 `#A83226` | 3 + 3 | 高危 ×2、删除线 |
| 蓝 `#1D4ED8` | 2 | 新增修订 |
| 朱 `#BE4B2F` | **0** | 本屏无已落定项（绑 `disposition==='confirmed'`，符合设计） |

**琥珀独占有色 chip 的 55%**。其中「处置」整列 6 行全是「待确认」——**初始态下该列每格同值，颜色携带零区分信息**。按 §2「彩色只表达语义状态」与「层级优先用字号/字重/明度/线重/间距，背景色块是最后手段」，一列恒定值占用彩色预算是该条的边缘违例：它表达的不是「这一项处于什么态」，而是「这张表刚打开」。对照「核验」列（5 绿 1 琥珀）确实在区分，是彩色的正当用法。

**处置建议：修订**。见 R-6。

### 4.2 用色 · 泥金与朱在深宗的克制 —— **按名成立，按值不成立**

> 旧裁定：`site/SPEC.md:298`「色彩语法四位落账：磁青为底 / 墨为记 / 朱仅裁决 / 泥金 hero 唯一强调」；`tokens.json:119` Q7 裁定「泥金降格为琥珀 dark-fg 轨」；机器门 VL3-T02「泥金越界进入正文或数据」。

**效果证据（本轮 dev server 实测，深宗）**：

- `--important-title` 解析值 `#d9ae6a`；`themes.dark.semantic.amber.fg` 同为 `#D9AE6A`（`tokens.json:119` 明载「同一值另作为双宗语义别名的深宗 important-title」）。
- 全屏渲染该 RGB 的元素 **13 个**：`chat-case-title` **1 个**；`gate-state pending` **6 个**、`severity severity-medium` **3 个**、`verification-state unverified` **1 个**、`individual-note` 1 个、`tier tier-c` 1 个 —— **12 个在数据区**。

即：「泥金只落开篇与卷级主句、正文与数据零泥金」在 **token 名**层面为真，在**像素**层面为假。用户在深宗屏上无法把泥金与琥珀区分开；被宣告为「唯一强调」的颜色，实际是该屏出现次数最多的颜色。机器门抓不到，因为它比对的是 token 名（`--important-title` vs `--amber-fg`）而非解析值——这正是本仓既有判例「**按名 vs 按值对照实验**」与「**在场≠可见**」的又一次实例。

**另一半**：浅宗 `--important-title: #232b38` 与 `--text-primary: #232b38` **逐位相同**。故该 token 在浅宗零视觉效果、在深宗与数据区撞色。**它在任一宗都不产生可辨的独立视觉身份。**

**朱**：`--zhu-graphic` 浅 `#be4b2f` / 深 `#d75a3c`，消费面严格（`.line-settled` + `.settle-seal`，`assert-schema-parts.mjs:141-148` 前向守卫要求消费文件必须携落定处置数据，字面 + 计算两条路径同守）。**朱的克制成立且机制完备**，问题只在泥金。

**处置建议：修订**（R-8）。三条路可选，倾向乙：
- 甲：给深宗泥金取一个与 `amber.fg` 可辨的值（需重过 AA 与退役账）；
- **乙：废除 `--important-title` 别名**，重要标题的层级交回字号/字重/字轨（凡例 §发凡二「字重即层级」本就是这么写的），泥金退回 hero-only 的站面用法。这与「层级优先用字号、字重…背景色块是最后手段」同向，且顺带解掉 C2 的闭集门需求（无 token 即无需闭集）；
- 丙：维持现状但把「泥金 = 深宗琥珀同值」写进设计文档正文，停止使用「唯一强调色」的表述（口径诚实化，零代码）。

### 4.3 字体与字重

**实现与裁定一致**：基本一致。三轨制已上身：`Zhuque Fangsong|400|loaded`（文书轨真加载）、`Source Han Serif SC|600|loaded`（标题轨重字重）；`Source Han Serif SC|400|unloaded` 属懒加载正常态。零粗体律有 `font-synthesis: none` 静态门。四道排印门在册。

**一处实况与裁定张力**：`typography-density.md` 发凡四「度量律」要求「字栈与**字号槽** token 化」。字栈已落（`--font-title`/`--font-body`/`--font-ui`），**字号槽只落了 dense/body/meta/document/reading 五个**（`styles.css:85-95`），标题档无对应变量。实测 `styles.css` 内 `font-size` **裸 px 25 处**（11px×11、16px×5、18px×4、15px×2、26px、24px、10px）vs token 化 193 处。其中 `--important-title` 五个消费点的字号全是裸值：**13 / 16 / 26 / 16 / 24 px**——`.welcome-slogan` 26px 与 `.gallery-header h1` 24px **越过 `typography.scale.display` 自述的「页面级标题上限」20px**，而 `.chat-titlebar .chat-case-title` 的「案件重要标题」只有 **13px**（等于 dense 档，低于 body 14px）。机器门清单（`typography-density.md:90-95`）**无字号单源门**，故这些都不触红。

**处置建议：修订**（R-9）——补标题档字号槽 + 一条字号单源门；「重要标题」跨越 13→26px 三倍差距这件事本身也支持 R-8 的乙案（该别名并未表达一个稳定的层级）。

### 4.4 陌生化巧思逐项

| 巧思 | 实现与裁定 | 实际效果 | 建议 |
|---|---|---|---|
| **鱼尾**（节标） | 一致。件库 `icons/schema-parts.tsx:16`，壳侧消费 **1 处**（`App.tsx:2680`，卷宗原件区段起首），站面 5 处 | 用得准：稀疏、位置有语义（区段起首）、不与任何其他编码重复 | **保留** |
| **文武线**（主界/次界） | 一致。CSS 实现（border + `::after`），零 gradient 零 shadow；实跑 `assert-rule-grammar` 报「主界 4 条文武线 · 次界 93 条乌丝细线 · routine 退 16 · 具名不换 65 · 共 164 处」 | 线级语义确已替代均一 1px；主界仅 4 条，克制 | **保留** |
| **圈点**（强调） | **一致，且是克制审计的正面样板**。件库有 symbol，壳侧 **0 消费**，但在 `assert-schema-parts.mjs` 的 `UNCONSUMED` 表内**具名登记不上**，理由是「可强调之处已由语义色与徽章编码，圈点落上去只是同一事实的第二遍编码；『用户自行圈点』产品未建模，无数据即无形」 | 「答不出即不上」被机器化，且**双向锁**（登记为不上的件一旦被接线即红） | **保留机制，维持不上** |
| **骑缝**（接缝完整） | 同上，`UNCONSUMED` 登记「壳内无文书接缝语义面；同名 `.rail-seam-toggle` 是折叠控件，借形即误用」 | 同上 | **保留机制，维持不上** |
| **朱印落定章** | 一致。`.settle-seal` 唯一消费面，绑 `disposition==='confirmed'`，前向守卫覆盖计算路径；`--motion-seal` 是全站唯一仪式预算，reduce 下真停摆（印本体留存，不以 `.01ms` 冒充） | 机制完备。但**合成对比 2.1104:1**（`ink-ab-measurements.json:31`），靠 `aria-hidden` + 「不承担唯一信息」取得装饰豁免 | **保留**，但见下方「注意」 |
| **墨迹洇染** | 一致。产品壳**已正式拒迁**（`SKIN-R2-P3/README.md:41` 判定 reject-migration，理由：只把 52px 印框边缘变毛、未增裁决语义或可读性、AA 准入不成立、回迁需新增 filter 定义与消费门收益不足）；站面单点存活（`site/SPEC.md:382`，`feTurbulence`+`feDisplacementMap(scale 1.7)` 扰动界行边缘，唯一落点是证据链「引语」节点） | **拒迁结论正确且留痕完整**。站面单点符合「Pages＝激进档、先锋实验田」定位，落点唯一、纯几何零色值零动效 | **保留站面单点，产品壳维持拒迁**；但见 R-10 |

**巧思密度总评：未过。** 壳侧记号系实际只有两枚上身（鱼尾 1 处、朱印 1 处），三枚具名不上；洇染已拒；文武线是线级语法不是装饰件。这是本轮评估里**做得最好的一块**——「克制审计」在此已从美学主张升格为带双向锁的机器事实（`assert-schema-parts.mjs:122-152`），值得作为其他面的样板。

**注意（朱印）**：2.11:1 的记号靠「aria-hidden + 不承担唯一信息」豁免——这个论证是成立的，但它同时说明**该记号对绝大多数用户在视觉上接近不存在**。它当前的价值是仪式感而非信息。若将来有人提议提高其 opacity 以「让它可见」，那会同时取消豁免前提并越出已签朱印值——建议把这条**互斥关系**写进设计文档，避免后来者重走。

### 4.5 「素净即敬业」裁定 —— 工单前提需更正：**已落地，但落成了另一个东西**

工单称该裁定「尚未落地」，`handoff-2026-07-19.md:10` 亦记「裁定已批、docs/ 尚零落地」。**实况：已由 SKIN-R2 P0（提案行 `P0-A06`）写入 `principles.md:13`。**

但落地的文本是：

> 素净是专业性的一种有效形态，而非装饰缺失；衬线、无衬线与扁平处理**不预设高下**。衬线不是完成度指标，也不是待清除项。

这是一条**中立声明**（拒绝在素净与繁复之间排序），而奖级工艺 #4「素净即敬业」原本是一条**主张**（素净更好）。落地形态把主张降格为「素净不低人一等」——几乎是相反的力。且它**不带任何密度上限或机器门**：全仓无任何门约束「视觉元素总数」或「单屏语义色数」。

故：若架构本意是拿它当克制预算，**它没有兑现**；若本意只是防止「衬线=未完成」一类误判，**它兑现了**。这是一个需要架构确认原意的岔口（R-7）。

### 4.6 顺带发现 · 一条不在 T3 列举轴上的体例问题

产品壳通用 chrome 全部为硬编码英文（`apps/desktop/src/chrome/copy.ts`，含 `Where should we start?`／`Choose case`／`Ideas for you`／`Output`／`Scheduled`／`Dispatch`／`Pinned`）。这是**已裁事项**，非缺陷：`apps/desktop/SPEC.md:2269` RP-2.7「通用 chrome 使用英文」，理由 `:2285`「语言边界与双宿主一致，未来租户词表替换 chrome 时不牵动 schema 断言」，有 `lint:rp27` 锁定，Playwright 有互不依赖的中/英双语断言组。

登记两点供架构判断，不作缺陷上报：

1. **效果面**：产品面向中国律所（`voice.md:6`），而用户第一眼看到的主标题是 `Where should we start?`。数据是中文（案由、卷宗、风险），chrome 是英文。这一分层是否仍适宜，属产品口径，不属本单裁量。
2. **门的结构性盲区**（这一条是工程事实）：`lint:voice` 的 §6 判据是「工程词黑名单**与中文同串**」（`voice.md:62`），故**纯英文文案整体不进该门**。加上 §1/§3 也都以中文为形，`voice.md` 的三条机器门对全部英文 chrome **零覆盖**。即：产品最大的一块用户文案面，voice 门看不见。若 RP-2.7 维持，建议至少把这个盲区写进 `voice.md` 的「门的边界」节（该节已如实登记了另外三条盲区，体例现成）。

---

## 5 · 文档漂移登记（本轮顺带发现，均未擅改）

| # | 位置 | 漂移 |
|---|---|---|
| D-1 | `docs/status/current.md:3` | 自述「本轮至 2026-07-18」，其「已清账工单」表止于 `WORK-LIVE-1`+`WORK-HOST-1`；而 SKIN-R2 P0–P5、VERSIONAL-LANG-1/2/3、`CHAT-MD-TABLE-1`、`CASE-TITLE-CONVERGE-1`、SITE-CRAFT-2 B1–B3 均已在 main。**唯一状态真源落后于 main 约两周**——这是 T2 用它作基准时的实际风险 |
| D-2 | `docs/design/tokens.json:6` 与 `:10` | 仍写「themes.dark＝磁青宗（深，B5 目标值，**零消费面**）」「**届时**由 `[data-theme]` 在 token 层置换」。`styles.css:157` 落地后即失效 |
| D-3 | `docs/architecture/implementation-readiness.md:64` | ARCH-DEBT 清单含三笔已清偿项与两处事实误述，详见 §1.4 |
| D-4 | `docs/architecture/implementation-readiness.md:117` | 称 `RiskReviewSurface` one-shot 自证已过；该标识符全仓 grep **命中 0**，仓内无对应 presentation config／fixture／golden／craft-evidence |
| D-5 | `docs/status/handoff-2026-07-19.md:10`、`:25` | 称奖级工艺 #4「素净即敬业」docs/ 零落地；实已在 `principles.md:13`（见 §4.5） |
| D-6 | `packages/pm/SPEC.md:86` | 写 `status='out_of_contract'`；源码枚举实为 `out_of_coverage`（`schemas/priority-score.ts:30`），仓内无 `out_of_contract` 实现 |
| D-7 | `docs/status/pilot-2026-07-17.md:96` | 称 N 项四条复验清单「在验收记录」；该清单不在台账文件内，本轮未找到 |
| D-8 | `apps/desktop/scripts/assert-test-count.mjs:46` | 注释仍写「C-4 前向红卫（themes.dark 未上身）」；红卫已于 `f8d10b5` 兑现 |

---

## 裁决请求清单

每项可独立准/驳。除 R-1 外均不含已实施内容。

| 编号 | 请求 | 关联 |
|---|---|---|
| **R-1** | **追认 T2 已提交改动**（`10a354e`：og 卡撤下「案件内容永不训练」并补制品边界、卷二补段级对冲、README 裸计数退出）。若任一条驳回，本单回滚该条 | §2.1 |
| **R-2** | **更正就绪图 ARCH-DEBT 清单**：`workContextSegment`／`.titlebar`／`schema-marks` 红卫三笔销号；S6「已裁 desktop 装配点模式」一句改为「未裁，`[需架构拍板]`」；interaction actor 拆为两笔（`local-user` 与 `desktop/local-user` 非同一物）。裁定会按修正后的**三笔半**开 | §1.4 |
| **R-3** | **复议对齐计划⑤的锁定粒度**：⑤ 锁「harness 真实化线」整体，但 `TOOL-READ-1` 三项前置全绿、语义为 `pure_read` 零 effect，与 bash 受控 ADR 的风险面无交集。请求把⑤的锁精确到**涉 effect 的票**，单独放行 `TOOL-READ-1` | §1.2 A 组、§1.3 |
| **R-4** | **B5 票面销号**，余量转一条便利项（settings-optin 贴阈例深宗复测注记，`ui-residue.spec.ts:323-326`） | §1.2 B 组 |
| **R-5** | **本轮派单排序拍板**：第一梯队 `FILE-PREVIEW-1` → Word/WPS 真机 roundtrip 核验会话 → 真机复验 D 项。若不同意排序，请指定替代 | §1.3 |
| **R-6** | **语义色配额复议（琥珀）**：「处置」列初始态整列同值仍占彩色预算，颜色零区分信息。建议改为——恒定态走中性 + 字重，仅在**偏离默认态**时着色（已确认/已驳回/异常）。准则可推广为一条设计法：**「一列恒同值即不着色」** | §4.1 |
| **R-7** | **确认「素净即敬业」的原意**：`principles.md:13` 已落的是中立声明（不预设高下），非克制主张，且无密度门。请裁定 ⓐ 原意即中立声明，挂账关闭；或 ⓑ 原意是克制预算，另立带机器形态的条款（可复用 `assert-schema-parts.mjs` 的「不上也要登记 + 双向锁」体例） | §4.5 |
| **R-8** | **`--important-title` 存废复议**（**建议先于 C2 加门**）：该别名浅宗 ≡ `text-primary`（逐位相同）、深宗 ≡ `amber.fg`（深宗实测 13 处该值渲染中 12 处在数据区）。三案：甲=深宗取可辨新值；**乙=废除该别名，层级交回字号/字重/字轨**；丙=维持但停用「唯一强调色」表述并写进文档。裁定为乙则 C2 的闭集门需求自动消解 | §4.2、C2 |
| **R-9** | **补标题档字号槽 + 字号单源门**：发凡四要求字号槽 token 化，实际只落五档且无标题档；`styles.css` 裸 px `font-size` 25 处，`.welcome-slogan` 26px 与 `.gallery-header h1` 24px 越过自述上限 20px 且不触红 | §4.3 |
| **R-10** | **拒迁结论的保全**：墨迹洇染的「拒」目前只活在 `site/craft-evidence/SKIN-R2-P3/`（事件件，随批归档），而归档材料**无约束力**。请求把「洇染在产品壳拒迁」及其理由升格为 `principles.md` 或 `typography-density.md` 的常设条款，否则下一轮会重新提案同一件事。同批建议写入朱印的「豁免与可见性互斥」关系 | §4.4 |
| **R-11** | **C4 上调处置**：`model-config` 路径④（`reasoning` 降档）字面命中不变量 4 的「降档」且完全不显式，且随每次请求发出。建议不止「补显式痕迹」，而是**让降级出现在 UI**（一次性提示「模型配置已重置为默认」），并给 `loadModelConfig` 返回值带上降级标记 | §C4 |
| **R-12** | **立站面成熟度门**（P-3）：站面现无任何规则要求对冲词出现或禁止「已上线」类断言；og.html 尤其只受色值门与字标门约束。建议加一条成熟度断言黑名单，扫全部对外文件 | §2.2 P-3 |
| **R-13** | **og.png 重渲 + 字节绑定**（P-1）：og.html 从不发布，本轮文案修正对读者不可见；且现产物 SHA 与唯一留档已不一致、无门看管 | §2.2 P-1 |
| **R-14** | **C3 处置**：赞成落 craft-evidence + deslop 按角色分面；补两点——另两份 `.dc.html` **仓内零备份**而被四处 SHA 引用，落仓优先于扫描面调整；扫描面不宜再加目录黑名单（第二次打补丁），宜改按角色分规则 | §C3 |
| **R-15** | **C1 处置**：赞成原提案，补一条——存在性校验须覆盖全部 206 条而非 85 条已签行；并处理 9 条失效 markdown 锚 | §C1 |
| **R-16** | **文档漂移批量修正**（D-1…D-8）：其中 **D-1（current.md 落后 main 约两周）**建议单独优先——它是唯一状态真源，本单 T2 即以它为基准 | §5 |
| **R-17** | **voice 门盲区登记**（不改 RP-2.7）：`lint:voice` 三条判据均以中文为形，对全部英文 chrome 零覆盖。建议至少在 `voice.md`「门的边界」节如实登记该盲区 | §4.6 |
