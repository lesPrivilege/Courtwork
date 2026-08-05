# PI-LANE-UI-1 · 实现回执（2026-08-05，pi 线基础成熟 GUI）

票面：`docs/architecture/implementation-readiness.md` 的 `PI-LANE-UI-1` 行（逐字为验收判据，
含 2026-08-05 派单增补与开工序重排注记）。权威面：ADR-022 **六-0/六-A/六-C.1/六-D** ＋
ADR-009 **2026-08-05 窄修订**（命令通道端口）；设计面 `docs/design/principles.md` 全册
（**§12 冷调与克制反乌托邦为权威护栏**）＋ `tokens.json` ＋ `voice.md` ＋ `typography-density.md`。
总纲不变量 3（留人确认）、4（静默降级零容忍）、6（历史不可涂改）、7（demo/真实双向隔离）。

基线 `claude/pi-lane-ui-1`，分叉自 `main@7a02007`。两枚提交：①宿主面、②GUI 面。

**开工序如实登记**：`PI-BASE-HEADLESS-ACCEPT` 六格未跑（真 key 未到），产品负责人 2026-08-05
拍板本票提前开工、与其并行。本票的全部运行证据出自 **scripted 樁**（ADR-022 六-C harness
注入面），**不构成** agent 称谓或 product-live 的任何依据；`PI-BASE-GUI-ACCEPT` 与 agent 称谓
仍锁真 key 证据。

---

## 一 · 本单新增了什么概念、为何非加不可（复杂度节制留痕）

**新增恰三个概念**，逐个说明为何不能不加：

| 概念 | 落点 | 为何非加不可 | 为何不是别的形状 |
|---|---|---|---|
| **账本流态出口**（`RecordSink`） | `pi_loop.rs` | 界面要在事情发生的当刻看见它。旧形只有 `records`／`published` 两本累计册，没有出口 | 不新造第二份投影：sink 交出去的就是 `encode_record` 的**同一份字节**，与盘上那一行逐字相同 |
| **pi lane 薄壳**（五枚 Tauri command） | `pi_lane.rs` | ④ 已备好命令通道，但 WebView 与它之间还差一层过桥 | 薄到零业务判断：`start` 之外一律投通道即返，结果只经账本回流。不是 gateway、不是第二条回程 |
| **历史工作稿索引缓存**（`pi-history.ts`） | desktop | 12 回合是 session 级硬顶，触顶即终态；而新 session workspace 初始为空、索引只认同 session 账本 ⇒ 正常用满就失去上一段工作稿的入口（2026-08-05 架构裁定：取 GUI 侧方案） | 它**不是第二真源**：存的是同一份 fold 的缓存，打开一律经宿主命令重读当刻字节，hash 只用于比对；宿主说 `not_found` 就是没有了 |

**刻意不加的**：不写增量 reducer（累计行→全量重折；首版 12 回合，重折代价可忽略，
「增量与全量会不会分叉」这个问题因此不存在）；不加第二套状态机；不加 thread persistence；
不加虚拟化（ADR-022 六-D 明写「首版最大回合仍为 12，不为假想长列表先加虚拟化」）。

---

## 二 · 成熟开源复核（CLAUDE.md 工程纪律「成熟开源优先」四选一）

**结论：直接依赖**，exact `@assistant-ui/react@0.15.4`（2026-08-05 npm latest 一手核实）。

| 核实项 | 当次实测 |
|---|---|
| 版本 | `0.15.4`（ADR-022 六-D 记的 `0.14.28` 是 2026-07-28 的 latest；本票按「实现前锚定当时 exact version」重锚，`package.json` 写死无 `^`） |
| 许可 | 自身 MIT；传递依赖逐包核实：`@assistant-ui/core`／`store`／`tap`、`assistant-cloud`、`assistant-stream`、`safe-content-frame`、`radix-ui`、`zustand`、`nanoid`、`zod`、`react-textarea-autosize` **全部 MIT** |
| 宿主兼容 | peer `react ^18 || ^19`，本仓 React 19.1 |
| bundle delta | app chunk **1,298.80 kB → 1,582.34 kB**（gzip **399.20 → 482.55 kB**）。该 delta 含本票自身约 1.5k 行新 UI 代码，不全归上游 |
| 语义边界 | 只用 headless primitives（`Thread`/`Message`/`Composer`）＋公共 `useExternalStoreRuntime`；只提供 `onNew`/`onCancel` 两枚 callback，**未提供**的 edit/reload/branch/queue 因此结构性关闭 |
| `unstable_*` | 零使用。`grep -rn 'unstable_' apps/desktop/src` 恰 **1 命中**，是 `PiLanePanel.tsx` 头注里「零 `unstable_*`」那一句本身——判据是**零 import／零调用**，逐行看那一命中即可确认（描述禁形不得复现禁形本身，故此处写清是哪一行而不是报 0） |
| 禁类核对 | 零 `LocalRuntime`、零 `AssistantCloud`、零 AI SDK／AG-UI／OpenCode adapter、零 thread persistence/export、零 stock Tailwind/shadcn 皮层、零 `@tanstack` |

**一手核实中发现、如实登记的两件**：

1. `useExternalStoreRuntime` 在 0.15.4 里住 `dist/legacy-runtime/…` 目录，但**从根 barrel 公开导出**、
   非 `unstable_` 前缀。它是公开稳定 API，可用；目录名提示上游有 runtime 换代计划，
   升级时须复核该导出是否仍在（本条即那次复核的坐标）。
2. 依赖树里有 `assistant-cloud`（云 SDK）与 `safe-content-frame`（沙箱 iframe）。
   **在树上 ≠ 被使用**：本票零 import，Cloud 相关 API 一处未触；但它们确实进了
   node_modules 与 bundle 的可达面，故上表的 delta 已把它们计入。

---

## 三 · 唯一状态真源：journal → projection

界面上的每一格都从 journal 记录折出来，没有第二本账。链路逐段：

```
Rust `PiLoopHost::record()`（唯一入册口）
  → sink（当刻，不攒批）
  → `encode_record` 的同一份字节
  → Tauri `Channel<String>`
  → `decodePiJournalRecord`（十九型闭集，认不出即具名拒）
  → `createRecordCoalescer`（至多每 rAF 一次；terminal／提案／坏行立即 flush）
  → `foldPiRecords`（纯函数）
  → 视图
```

- **决定只认 journal**：点「允许写入」的全部作用是 `pi_lane_decision` 投一枚回执；
  卡面状态在 `authorization_decided` 落账之前一动不动（ADR-009 2026-08-05 窄修订原句）。
- **未知即拒**：解不出的记录让整条会话进显式失败态，不跳过、不留部分状态。
- **索引只从 succeeded fold**：`effect_uncertain`／`effect_failed` 都不进；uncertain 的工具卡
  另给「核验当前文件」，核验结果如实显示并标未确认，**永不补写成成功**。
- **未知费用不折成 0**：`usd` 为 `null` 即显示「未知」。

---

## 四 · craft（浅宗先行、明快的冷色）

档位：**Agent 中间档**（设计凡例总纲）。构图、比例、间距与浅色微调由真实截图迭代
（票面授权面），未冻结 wireframe，也不以「像某参考站」为验收标准。

- **零新色**：全部取 `tokens.json` 现值。实测：`styles.css` 的 pi 段 138 行内 hex/rgb/hsl 字面量
  **0 命中**，`src/pi/**` 亦 0。
- **零阴影、零渐变、零圆角汤**（扁平）；动效只用既有 `--motion-hover`，四属性白名单不破。
- **版本目录学**：三位编号（`001`）、等宽核验体（session 号、字节、hash 前 12、回合与开销）、
  目录学式索引标题。
- **朱砂稀缺律（§12）**：全面只有**拒绝／未能写入／无法确认**三态带红，交互上唯一的朱是
  「拒绝写入」按钮。无风险即整屏无红——`release/evidence/pi-lane-ui-1-2026-08-05/` 的
  12 枚浅宗截图逐枚可验（01–08 零红，09–12 有红）。
- **线级（§10）——本面零新增线消费点**：面头复用**已签署**的 `.panel-head`（文武线，P1-M 在册），
  其余层级改由 §2 允许的字号／字重／明度／间距与一级底色台阶承担；只有控件边、语义色标线与
  浮面描边三族以 1px 具名登记在「不换」清单。理由写在 CSS 注释里：新起一条线要一枚已批提案行
  与 `r2-tier-ledger` 签署账行，本票授权面是构图与浅色微调、不含线级签署——**答不出即不换**。
- **Vercel `design.md`（2026-08-05 读取）只借工艺判断**：构图先于组件（先定「问—答—工具卡—
  索引—输入」五段的关系，再挑控件）、单焦点（待决定的那一枚卡是全屏唯一强调）、squint 自检
  （眯眼看只剩三条横向节奏带）、拒生成式反射清单。其 `vbg-*`／Geist 字体／壳资产／网络资产
  **一概未接**，token／字体／动效只认仓内现法。

**深宗（磁青）只守同构回归**：同一脚本同状态各摄一枚（`*-dark.png` 12 枚），结构逐枚同构、
无溢出、无破图。磁青精修后置未动。

**深宗对比度如实登记**：`--text-tertiary`（`#6e7c92`）在深宗三种底面上分别为
**4.28／3.87／3.14**，均低于 AA 4.5。这是 **token 层的既有事实**（`tokens.json` 明记浅宗已闭合、
深宗保留原值，双宗共用中性就此拆分），非本面引入。本面把「要读来核对的数字与标题」
（编号／字节／hash／索引标题／状态条 ident／facts 标签）全部移到 `--text-secondary`
以缩小暴露面，只把补充性提示留在 tertiary，同全站现况。**深宗 tertiary 的 AA 属另单
[需架构拍板]**。同批实测的语义红：深宗 5.02（白卡）／6.20（竖栏底），浅宗 6.67／6.05，均过 AA。

---

## 五 · 退出证据（票面逐条对照）

| 票面判据 | 落点与实测 |
|---|---|
| assistant-ui headless + 公共 `useExternalStoreRuntime`，只把 journal→projection 适配成视图态 | §二、§三；`PiLanePanel.tsx` |
| React→Rust command 经④已建的入站命令通道 | `pi_lane.rs` 五枚薄壳 → `CommandSender::send` |
| `start` 按六-A 收 `{containerId,grantId,modelId,limits}` | `PiLaneStartInput`；`caseRoot` 由 grantId 在宿主内解析，secret 由 Keychain 取，二者只进 bootstrap |
| prompt/cancel/decision/teardown 投通道即返 | `dispatch()` 丢弃回执 `Receiver`；结果只经账本回流 |
| production `CommandDecisionDriver` 装配 | `start_inner` 构造点；红证 M1 |
| 审批按钮只发 command，决定只认 journal | `use-pi-lane.ts::decide` 只调端口；卡面读 `call.decision` |
| Prompt/Stop | `ComposerPrimitive.Send` / `ComposerPrimitive.Cancel` → `onNew`/`onCancel` |
| 真实运行/预算 | 状态条：回合 `n / 12`、开销（`null` ⇒「未知」）、段号 |
| tool proposal ＋ 逐次授权 | `PiToolCard` 决定区；e2e 全链＋拒绝两例 |
| 结果/错误/恢复 | succeeded／denied／failed／uncertain 四态卡；`prompt_failed` 终态；`session_resumed` ⇒「上一段被中断 · 已从账本恢复」 |
| succeeded write fold 出 workspace `.md` 索引 | `foldPiRecords` 的 `drafts`；单测四例＋e2e |
| `openWorkspaceMarkdown` 三元组只读查看 | `PiDraftViewer`；复用 `ChatMarkdown`（raw HTML 不执行）；零编辑/保存/改名/删除/diff/晋升 |
| uncertain 不进成功索引但工具卡可核验当前文件 | 单测＋e2e；核验面标「未确认」 |
| 当前 hash 异于 succeeded hash 必提示 | `PiDraftViewer` 的 `differs`；e2e 一例＋M11 红证 |
| 同 container 历史「上一段工作稿（只读）」入口 | `pi-history.ts` ＋ `另起一段工作`；e2e 一例。**不改**「新 session workspace 初始为空」冻结语义 |
| 流态更新至多每 rAF 合并一次；terminal 取消 pending frame 立即 flush | `pi-stream.ts`；6 例单测（含逐一枚终态型） |
| 用户上滚后 streaming/Stop/terminal 不夺回视口 | e2e 真滚轮一例（判据取相对量：离底距离 > 200px 且 `after === before`） |
| Stop race 在 UI 面复证 | e2e「Stop 收束悬置提案为拒绝」；宿主侧两枚真竞态在 ④ 已在册 |
| 未知 event fail-closed | `decodePiJournalRecord` 六型拒因；单测 4 例＋e2e 一例＋M3/M7/M13' 红证 |
| 全状态截图（浅宗）＋dark 烟测 | `release/evidence/pi-lane-ui-1-2026-08-05/`（24 枚，逐枚 SHA-256 在册） |
| bundle delta 留证 | §二表 |
| 禁类零出现 | §二末行；`unstable_*` grep 计数 0 |

**未由本票兑现、如实登记的一条**：**WKWebView 键盘/读屏/焦点真测未执行**。本会话没有可驱动
真实 Tauri 窗口与 VoiceOver 的手段；键盘（Escape 关闭、焦点归还、送出）与焦点在 Chromium
e2e 内已实跑，读屏名与 WKWebView 差异未验。这条同时也是 `PI-BASE-GUI-ACCEPT` 的票面项
（「键盘/读屏/焦点/reduced-motion/scroll ownership/Stop race 全实跑」），移交该票在真机执行；
**不以 Chromium 绿冒充 WKWebView 绿**。

---

## 六 · 红证（先证明测试会红）

| # | 变异 | 判据 | 结果 |
|---|---|---|---|
| M1 | 撤 `start_inner` 的 `CommandDecisionDriver` 装配 | `production_start_lets_a_decision_command_authorize_a_write` | 红：「提案必须出现在命令通道上」（5s 内 `bus.pending()` 恒 `None`） |
| M2 | 账本 sink 改成 prompt 收尾一次性 flush | `the_tool_card_reaches_the_sink_before_the_user_is_asked_to_authorize` | 红：「提案送达界面之前 `tool_proposed` 必须已发布过」，诊断打印出攒批后的整串 |
| M3 | 未知 type 解成一枚空 `agent_event`（unknown→跳过的病根形） | `pi-projection.test.ts` | 红 2 |
| M4 | 索引把 `effect_uncertain` 也 fold 进去 | 同上 | **绿——等价变异，零区分力**：`effect_uncertain` 的 payload 只有 `toolCallId`/`code`，没有 `logicalPath`/`contentSha256`/`byteLength`，fold 的字段前提本身就挡住了它。如实登记，不冒充红证 |
| M4' | 索引改从 `effect_started` fold（started 只是屏障不是成功） | 同上 | 红 2（uncertain／failed 两例）；e2e 同变异另红 2 |
| M5 | 待授权改由 `effect_started` 消而非 `authorization_decided` | 同上 | 红 2 |
| M6 | 未知费用折成 0 | 同上 | 红 2 |
| M7 | 解码失败改「跳过坏行接着折」 | 同上 | 红 1 |
| M11 | 撤掉 viewer 的 hash 比对 | e2e「当前内容与已确认版本不同」 | 红 |
| M13 | 未知 type 的拒因由 `unknown_type` 换成 `not_json` | e2e「认不出的记录」 | **绿——等价变异**（换 reason 不换行为）。作为「变异靶是否真打在判据上」的守卫如实登记 |
| M13' | 未知记录真跳过（`continue`） | e2e「认不出的记录」 | 红 |

M2 的第一形态曾以「prompt 是否仍在跑」作判据，**攒批变异下仍绿**——因为 flush 也发生在
prompt 内。判据因此改落**因果**（用户被要求授权之前，提案必须已在界面上），这才有区分力。
该次无效判据如实登记，不留在册。

---

## 七 · 偏离登记（待架构追认）

1. **新增第三个 view segment `Draft`**（`chrome/copy.ts` 的 `segment.draft = 'Draft'`）。票面写明
   本票是 App 首票、独占 App 槽，但未指定入口形态。取第三段的理由：pi 线与场景线**并立、
   各自账本**（ADR-022），第三段是与该结构同形的最小入口。**刻意不叫 `Agent`**——agent 称谓门
   未触发，此处不得顶名。若架构另有落点裁定，改的是挂载处，面本身不动。
2. **四道门的读取面随「过手即拆」迁移**：`assert-chat-ui-contracts.mjs` 与
   `assert-process-trace.mjs` 的 `processTraceFromTurn(turn)` 判据改指
   `chat/ChatAssistantMessage.tsx`（判据一字未改，只是它现在指着这一段真正住的地方）；
   `assert-rp211-contracts.mjs` 的段值判据由二枚扩三枚并新增「Draft 面须真路由」一条；
   `assert-rule-grammar.mjs` 的「不换」清单加三族（控件边×2、语义色标线、浮面描边）。
3. **`real_write_host_without_a_decision_driver_denies_and_writes_nothing` 改为显式造缺席**。
   production 构造点自本票起装 driver，故「什么都不装」不再等于「没有 driver」。该例问的一直是
   **座**的 fail-closed 语义，判据一字未变，只是缺席态从此要自己造出来。
4. **`#[allow(dead_code)]` 逐枚收窄**：本票令 `start`／`records`／`leg`／`capabilities`／
   `adopt`／`sender`／`join`／`CommandSender::send`／`HostCommand`／`DecisionVerdict`／
   `CommandDecisionDriver::new`／`KeychainCredentials`／`ProcessSpawner` 全部真实可达，具名放行
   随之删除；`published`／`projection`／`CommandBus::discarded`／`delete_container`／
   `start_with_pair` 仍只有测试读，保留具名放行。
5. **`pi-projection.ts`／`pi-journal.ts` 先写实现后写测试**，红证以逐条 mutation 补齐（§六 M3–M7）。
   `pi-stream.ts` 与 Rust 两枚均严格先红。如实登记为 TDD 纪律的一处偏离。
6. **desktop 单测读 `packages/pi-lane/fixtures/write-session-journal-v1.jsonl?raw`**（跨包 fixture）。
   取它而非手写样本，是为了让「宿主换了记法而界面没跟上」当场红；这是**只读 fixture**，
   不是可执行绑定，不引入跨包 runtime 依赖。
7. **Playwright floor 351 → 365**：先把 `AGENT-CLAIM-CORRECTION-1` 留下的观测值 352 补进 floor
   （该票明记「floor 文件升档随下一张 desktop 票」——本票即那一张），再加本票 13 例。
8. **App.tsx 高水位 2549 → 2475**：净增 24 行、外提 95 行、随外提删四枚失去消费者的 import 再收 3。

---

## 八 · 门禁实跑（本树自跑，逐条记，未经管道吞码）

| 门 | 结果 |
|---|---|
| `pnpm -r build` | 绿 |
| `pnpm lint` | 绿 |
| `pnpm test`（root） | **1938 / 170 文件** |
| `pnpm --filter @courtwork/desktop test` | **715**（base 690，+25） |
| `cargo test`（`apps/desktop/src-tauri`） | **250 过 / 1 忽略**（base 246 过，+2 本票新测；另 +2 属 base 与本树的既有差） |
| `cargo clippy --all-targets` | **7 枚告警，与 base 同**（全在 `lib.rs`，非本票引入） |
| `pnpm site:guard` | 绿（fail 0） |
| `pnpm --filter @courtwork/desktop test:e2e` | 全序 34 道静态门逐条绿 ＋ Playwright **365 passed**（4.3m，`app` ＋ `residue` 两 project，零 flaky、零豁免） |

---

## 九 · 移交与开放项

- **[需架构拍板] 深宗 `--text-tertiary` 的 AA**：三面 4.28／3.87／3.14，均低于 4.5。本面已把核验类
  文字移出该档，但全站仍在用。属 token 层裁定，不由本票单方面改。
- **WKWebView 键盘/读屏/焦点真测**移交 `PI-BASE-GUI-ACCEPT`（§五末条）。
- **本票不取得 agent 称谓、不更新 `current.md` 的能力成熟度**：全部运行证据出自 scripted 樁，
  真 key 端到端与 `PI-BASE-HEADLESS-ACCEPT` 六格仍未跑。
- 结转的既有 [需架构拍板] 四项（`logicalPath` 空串两侧异源、②游标二元性、④`cost_usd` Disabled 臂
  裸 inf、maxUsd retryable 抖动永久关 session）本票未触碰，原样在册。

### 独立验收互引（2026-08-05）

本票独立验收记录见 `apps/desktop/ACCEPTANCE.md` 的「PI-LANE-UI-1 独立验收（2026-08-05，PASS）」
节；该节反向以本 SPEC §六／§七／§九及本票交验点 `d64e2ea` 为判定坐标。
