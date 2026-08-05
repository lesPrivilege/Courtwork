# Fable 架构唤醒件 · 2026-08-05

**这不是历史叙述，是坐标图。** 你不必读完本轮的过程；按需召回即可。归档件永不具约束力（见 `archive/README.md` 的「如何召回」），现行真值只认下列四份。

---

## 一 · 三十秒定位

| 问题 | 答案 |
|---|---|
| 我在哪 | `origin/main`（本件写就时 `5807adc`，以 `git log -1` 现读为准）；工作树干净，零临时分支、零 worktree |
| 产品是什么 | 面向中国律所/企业法务的本地优先法律工作台。**通用 work agent 是 `PI-BASE-GUI-ACCEPT` 独立放行后才可用的称谓**，现在不得外推 |
| 现在推的是什么 | pi 通用 agent loop 线（ADR-022）：内嵌 `@earendil-works/pi-agent-core` 的 Node sidecar ＋ Rust host，与法律场景线并立、各自账本 |
| 卡在哪 | 见 §四「两道闸」——一道要你拍 ADR，一道要你的 DeepSeek key。其余都能自主推 |

**固定读取序**（接手必读，勿跳）：根 `CLAUDE.md` → `docs/README.md` → `docs/status/current.md`（唯一能力真源）→ `docs/architecture/implementation-readiness.md`（唯一开工图）→ 相关 ADR / 层 `SPEC.md`。

---

## 二 · 主线阶梯：走到哪了

ADR-022 冻结的生产阶梯是**薄 harness → 基础 GUI → 个人 debug → 原生语义生长**；收敛节点链为
`PI-BASE-HEADLESS-ACCEPT → PI-LANE-UI-1 → PI-BASE-GUI-ACCEPT → PI-DEBUG-BUILD-1`。

**已合入并逐票独立验收**（plumbing 全链，faux-smoke 端到端）：

```
PI-HOST-LOOP-1（七轮）      Rust host：manifest 双件核验 spawn、单写 durable journal、
                            crash/quarantine/resume、encode-before-effect、普适电池
PI-WRITE-HOST-1（七段链）   cap-std =4.0.2 逐段 nofollow、TempFile replace＋四屏障、
                            HostRequest 臂四段账序、md-work-v1 prompt、双端 golden
PI-WORKSPACE-READ-1         /workspace 双根读回、`../workspace` 结构性消除、UTF-8 fail-closed
PI-HEADLESS-HARNESS-1       dev-only 合成 harness：真 Agent↔wire↔host↔disk＋restart；
                            Gate D 清偿（session_resumed 记实收 promptId/capabilities）
PI-READ-TOOLCALL-1          读工具 host op 修复；穷举 match 无 `_`（加员即编译失败）
PI-TOOLCALL-BINDING-1       tool↔capability 绑定回归修复（见 §五 教训）
PI-UNKNOWN-TOOL-1           模型叫错工具名不再杀会话；闭集外调用入未投影登记册
```

**尚未成立**（不得外推）：无生产 GUI，且 **production 零触发路径**——`PiLoopHost::start/prompt/cancel` 皆 `pub(crate)`、`pi_loop*.rs` 零 `#[tauri::command]`；production decision driver 为 `None`，write 恒 `policy_denied` 显式落账（诚实边界）；`PI-BASE-HEADLESS-ACCEPT` 总验未跑。

---

## 三 · 可直接消费的冻结定本（**不要重研**）

这些已被独立会话核实过，直接读、直接用：

| 要开工什么 | 读哪份 | 它已经回答了什么 |
|---|---|---|
| `PI-LANE-UI-1`（GUI 首票） | ADR-022 六-D ＋ 就绪图 `PI-LANE-UI-1` 行 | 依赖 `@assistant-ui/react` headless primitives＋`useExternalStoreRuntime`；禁 LocalRuntime/Cloud/AI SDK/OpenCode adapter/branch/edit/queue/stock 皮层/`unstable_*`/`@tanstack`；craft 方向浅色先行、扁平、版本目录学、克制反乌托邦、不取 cyberpunk；负面护栏成表；viewer 只经 `openWorkspaceMarkdown` 三元组、只读、`effect_uncertain` 不进成功索引；流态 rAF 合帧、terminal 立即 flush、上滚不夺视口。**不得提前冻结 wireframe，不得以「像某参考站」作验收标准** |
| 任何触 workspace 写面的活 | `packages/pi-lane/specs/PI-WRITE-HOST-1-PREFLIGHT.md` ＋ `-RECON.md` | cap-std 三项一手风险（`open_dir_nofollow` 只管末段⇒逐段下降属自研义务；macOS 无内核 beneath⇒swap-race 反例门结构性必需；TempFile 权限须实证取法）、ambient 逃逸口穷举（含 `from_std_file` 静默口）、七步开工序。**PREFLIGHT 的 symlink 措辞「按此钉死」，勿改写** |
| `PI-BASE-HEADLESS-ACCEPT` | `packages/pi-lane/SPEC.md` §九 ＋ 两枚移交件（`PI-HEADLESS-HARNESS-1.md`、`PI-READ-TOOLCALL-1.md` 各带「开工前必读」） | 六格矩阵定义、restart 语义（同 logical session 经 interrupted→resumed 以新 leg 回读，pi message context 明示从空开始）、记分规则（枚举/读取不通一律记 harness 失败，非模型能力） |
| GUI 易用对标 | 本轮 OpenWork 召回表（见 §六指针） | OpenWork＝OpenCode 内核、此处＝pi 内核，GUI 完备度对标同之；其 branch/edit/queue 类能力为 ADR 明禁，对标时须剔除 |

---

## 四 · 两道闸：一道你拍板，一道你给 key

### 闸一 · `PI-HOST-CONCURRENCY-1` —— **须先 ADR，且它挡着 UI-1**

架构层验收实证：`prompt()` 阻塞独占 `&mut self` 且无总时限；`cancel()` 需同一独占借用，故 prompt 在泵中时**结构性无人可调**（全 `src-tauri/src` 内 `cancel` 唯一出现即其定义行，零调用点被 `#![allow(dead_code)]` 遮住）；`WriteDecisionDriver::decide` 同步跑在同一阻塞泵内，等用户点授权期间 host 线程整体卡住。

**要害不是覆盖率，是形状**：以现 API 形状，`PI-BASE-GUI-ACCEPT` 要求的「Stop race 真测」**写不出来**——借用检查器先拦住。零覆盖是零可达的影子。而 ADR-022 A1 已把 cancel 列为可交付能力。

需要你裁的是 pi host 的并发/中断模型（建议形态：host 专属线程＋入站命令 channel，pump 每轮 poll；`decide` 改「投提案＋等 channel 回执」）。同 crate 的场景线已有现成先例可循（`cancellation_store()`＋oneshot/`select!`＋`cancel_provider_request`）。**随该票收口两项**：同工具形槽位覆盖（write tc-A 被 tc-B 覆盖，tc-A 认领静默丢弃）、Rust 侧 tool↔capability 映射双写收敛为单点 `capability_for`。

### 闸二 · `PI-BASE-HEADLESS-ACCEPT` 六格总验 —— **须真 DeepSeek key**

SPEC §九:744 白纸黑字：**无 key/model 证据只能记 `external-validated blocked`，不得放行「harness 非瓶颈」**。六格要真模型答问、带文件名摘要、写 brief，faux 造不出。代码层现已跑得起来（3/4/5 格所依赖的 `/workspace` 回读与读工具 host op 均已修）。

做法：你在自己终端导出 key，跑一条 `cargo test … --ignored`，数分钟完事。我不代取、不代填、不动你额度。

> 注意区分（曾被两名会话读岔）：SPEC §七「自动化门」是常绿 CI 门、用 faux、不触网；§九六格是另一件更重的总验，要真模型。两者不可互相冒充。

---

## 五 · 三条本轮打出来的判例（下一轮直接用）

1. **验收刀必须换层**。七票 build 全绿之后另起一层问「设计是否成立／功能是否真能用／宣称与实况是否相符」，立刻出四枚缺口，其中一枚是自家上一票制造的回归。**凡全绿批次，都要另起一层再问一遍。**
2. **闭口按族，不按验收点名的实例**。今日两次咬中实现方（journal 四调用点只改一处、reading-view 四过滤器只闭两道）。推论：**修一道门之前，先按模式 grep 同形调用点全集，闭合表随回执交验**；扩一道门的适用面之前，**先问它原来的窄形态在承担什么判据**（「只认 write」看着是注释，实为结构性绑定）。
3. **改在册来源文件，同批必须重封哈希**。`docs/design/schema-exemplar.sources.json` 登记的文件被改而未重封，`assert-schema-exemplar` 会红在 `test:e2e` 串链的 `playwright test` **之前**——红即短路，其后 352 条从未启动。「跑了 e2e」≠「跑到 PW」。本轮两次犯（一次被验收判 REJECT，一次被门当场咬）。

其余操作性判例（`git push .` 动不了已检出分支、`|tail` 吃退出码、pgrep 自匹配须用 `chrome-headless-[s]hell` 括号法、纯 Rust 票免重建 sidecar 可 `cp` 移植、改 TS 的票合流后首跑 cargo 前须 clean snapshot 重建制品）散落在各 ACCEPTANCE 与 `docs/engineering/workflow.md`。

---

## 六 · 按需召回的入口

- **归档索引**：`archive/README.md` —— 31＋条，每条七格（票号／起讫／实现+验收+合入 SHA／证明什么／为何归档／**现行继承者路径**／已知失效点），带「如何召回」协议。**先读索引再决定要不要回读原件**；索引里 13 条标了「销条前须先解引」（正被现行文档在册引用）。
- **判例与纪律**：`docs/engineering/workflow.md`（跨工单判例）、`AGENTS.md`（角色与 Git 纪律）。
- **本轮四缺口的完整证据**：`docs/status/current.md` 通用 loop 线行的「架构/功能层验收」段 ＋ 就绪图 2026-08-05 批次表。
- **待架构追认的结转项**（不阻塞，但别忘）：`logicalPath` 空串两侧异源、游标二元性、`cost_usd` Disabled 臂裸 `inf`、maxUsd 开启时 retryable 抖动永久关 session（体验待复核）、container 整删未兑现（ADR 冻结「journal 与 workspace 随 container 整删」但只删 journal 树）、12 回合硬顶触顶即失工作稿入口（**UI-1 派单前必须二选一**）。

---

## 七 · 下一轮起手建议

若要最快见到「work agent 基本功能」：**先拍闸一的 ADR**（它挡着 UI-1，且越晚拍越贵——UI-1 开工第一天就会撞上），同时可并行派 `PI-DUALROOT-CONTRACT-1`（无前置、不占 App 槽、票面已冻结）。key 到位后跑六格，六格过则 UI-1 点火，UI-1 过则 `PI-BASE-GUI-ACCEPT` 取得 agent 称谓——之后才进插件化解耦相（`GENERIC-PACK-1` → `PACK-INTERACT-1` → 需求已到、届时先立 ADR-015），该相全程携 matter 不变量：卸垂类后 chat/work 仍以案件为单位，蒸馏自主续行，人工 review 面在案上产物与账本、不在 session 清单。
