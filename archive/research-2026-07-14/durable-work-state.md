# 调研 A：本地 durable Work state 持久形态

调研对象：ADR-010「决定二：Work 状态仍是一条 SessionEvent 账本，但宿主持久必须可等待」。
调研方法：officialdocs/官方仓库直抓 + WebSearch 命中官方域名摘要，凡本次会话实际核实的均标注 ✓，训练记忆未核实的标注 ※。方法论区分见第 7 节说明。

---

## 0. 结论先行

**对 ADR-010 决定二的建议：维持边界与契约，修订持久化机制，并补齐四处具体缺口。不构成对"CAS 是否该用"的挑战，但构成对"CAS 的对象应该是什么"的挑战。**

拆开说：

1. **该维持的**：TS 独占 envelope 校验/状态机/CAS 重试、Rust 只管 opaque blob 的 `read`/`compareAndSwap`（不解析 schema）、六条持久化顺序契约、禁止 fire-and-forget/批量 flush/同步内存真源。这套边界形状是对的——它是本次调研在 Temporal/DBOS 等成熟 durable execution 系统里反复看到的同一个原则（先落盘意图，再触发效果；先落盘结果，再对外发布）的本地单进程版本，值得保留为契约。

2. **该修订的**：`compareAndSwap(bytes: Uint8Array)` 的 `bytes` 被隐含理解为"整份 envelope 的全量序列化"，而六条契约要求一次 Work 运行触发多次 CAS——这两者相乘，产生 ADR-010 自己都点出但没有解决的张力：**总写入量随事件数呈平方增长（O(N²)），不是线性（O(N)）**。这不是性能优化可以后置的细节，是这个具体持久化机制的结构性缺陷。修订方向：把"CAS 整个 blob"改造成"CAS 一个小 snapshot + append 一条小 tail 记录"两段式（详见第 1、5 节），Rust 侧仍然不解析 schema，边界不变。

3. **需要补的缝隙**（详见第 6 节回灌建议）：`expectedVersion` 的铸造方未定义；macOS 上"原子替换"未落到系统调用级验收标准（缺 F_FULLFSYNC 这一步，且标准库自己都没做对，见第 3 节）；`interrupted` 投影作为 UI 标签是对的，但内部 resume 逻辑缺一张按六个持久点做判别的恢复矩阵，尤其是"provider 调用已启动但结果未落盘"这一段窗口不能被当作可安全重放；`localStorage` 被明令禁止但同样不合格的 `tauri-plugin-store` 没有被一并排除。

4. **不构成挑战的证据**：本次调研没有找到证据说"opaque blob CAS 边界"本身是错的形状——恰恰相反，redb/LMDB 式的单 writer + copy-on-write 提交模型、SQLite WAL 的 checkpoint 模型、S3 的 ETag 条件写、etcd 的 revision fencing token，全部收敛在"某种版本化的原子提交原语"这个大类里，只是没有一个把"提交单位"设成"每次都是全量状态"——它们无一例外把提交单位切成"这次变化量"。这正是本报告建议 ADR-010 采纳的修订方向，而不是推翻其边界设计。

---

## 1. 形状对比：单 blob 全量 CAS 重写 vs append-only log + snapshot vs 嵌入式数据库

### 1.1 单 blob 全量 CAS 重写（ADR-010 现状）

**优点**：实现最简单，Rust 侧只需要两个原语（`read`/`compareAndSwap`），完全不用理解 schema，最贴合 ADR-001 的"Rust 不得理解垂类语义"边界；调试友好（整份状态是一个可读 JSON 文件，人工 diff 容易）；不引入任何数据库依赖。

**缺点——写放大是可以算出来的，不是猜测**：六条顺序契约意味着一次典型 Work 运行（比如 S3 场景：几轮 tool call、逐条 RiskList 处置、若干次 revision）至少触发几十到上百次 CAS（session header、每个 turn 的 `turn_linked`、每个 Turn 的 terminal、每条 pending confirmation、每条 revision）。ADR-010 自己承认 envelope 内联了 `pendingConfirmations`（含材料快照）——体积会随会话进行显著增长。举一个说明量级的例子（非实测，仅供直觉）：envelope 从 2KB 涨到 200KB，150 次 CAS、假设平均每次落盘时体积为峰值的一半（≈100KB），总写入量 ≈15MB，而最终"有意义"的状态只有 200KB——**75 倍写放大**。这不是极端场景，是"对一条持续增长的日志做全量重写"这个操作在数学上必然的 O(N²) 总写入量（N = 持久点数）。

还有一层 ADR-010 文本没提到的放大：**IPC 序列化开销**。`bytes: Uint8Array` 要经 Tauri `invoke` 从 JS 传到 Rust。若走默认的 JSON 序列化通道（而非二进制通道），社区实测 65536 字节的 blob 走 JSON 编码往返约 6.7ms，走二进制编码约 600us——一个数量级的差距（✓-search，见第 7 节）。envelope 越大，这个税越重，且和磁盘 I/O 的放大是叠加的，不是互相替代的。

**SSD 磨损**：单机单用户场景下，哪怉几十倍写放大，绝对写入量大概率在合理使用年限内不会打穿现代 SSD 的 TBW 额度——真正的风险不是"三年后盘坏了"，是"会话越长，每一步等待写盘的时间越长"，是随会话长度线性劣化的**延迟体验**，而不是一次性成本。这一点在报告里必须说准确，不夸大。

**结论标注**：单 blob CAS 这个"提交原语"本身「直取形状」——保留。但"CAS 的对象是整份 envelope"这个具体选择需要改。

### 1.2 Append-only log + periodic snapshot

**形状**：每个持久点只 append 一条小的 delta 记录（体量约等于一个 `StoredSessionEvent`），周期性把 log 折叠进一个 snapshot，之后 log 从空重新开始。

**优点**：每次持久化的 I/O 与本次变化量成正比，总写入量是 O(N) 不是 O(N²)；比单 blob 重写更贴合"事件溯源账本"的本意——`events: StoredSessionEvent[]` 本来逻辑上就是一条日志，append-only 只是把它物理化成真正的追加写，而不是"逻辑数组 + 全量物理重写"；也更贴合"历史不可涂改"这条核心不变量——纯追加写在物理层面天然拒绝"意外改写旧记录"，而全量重写模式下一个序列化 bug 理论上能悄悄改掉数组里任意一条历史事件而不留任何痕迹。

**缺点**：Rust host port 的形状要从"一个 blob 的 read/CAS"变成至少两个原语（`appendChunk`/`snapshot`），边界契约变复杂；需要处理"进程崩溃时 log 尾部写了一半"（torn append）的检测，需要每条记录自带长度前缀/校验和才能在 replay 时安全跳过残缺尾巴——这部分是需要自己写的活，SQLite WAL、Kafka、大多数 LSM 存储都是用同一手法（长度前缀 + checksum + 遇到坏尾巴就截断在此处）解决的。

**结论标注**：「改造取形」——不引入具体的 append-only 数据库产品，而是把 host port 从"单一 blob CAS"改造成"snapshot blob（仍然是 CAS）+ tail log（append-with-offset-check）"两段式。Rust 侧只需多学"按 offset 校验后追加"和"长度前缀记录"两个概念，仍然不解析 schema，边界不变。**这是本报告对 Q1 的主要推荐。**

### 1.3 嵌入式数据库（SQLite/WAL、redb、sled）

三者现状核实如下（均为 2026-07-14 直抓 GitHub/官方仓库 ✓）：

| | 状态 | 最新版本 | License | 关键判据 |
|---|---|---|---|---|
| **SQLite**（经 `rusqlite` bundled）| ✓ 成熟稳定 | 3.53.2（随 rusqlite 0.40.1 / libsqlite3-sys 0.38.1 vendored） | Public Domain | WAL 模式官方文档详尽（checkpoint 默认阈值 1000 页≈4MB）；但 macOS 上有精确坑，见第 3 节 |
| **redb** | ✓ README 原话 "Stable and maintained" | 4.1.0（2026-04-19） | Apache-2.0 / MIT 双授权 | 纯 Rust 无需 C 编译链；README 自陈 "Crash-safe by default"、"MVCC support for concurrent readers & writer, without blocking"、"Savepoints and rollbacks"，copy-on-write B+tree，"loosely inspired by lmdb" |
| **sled** | ✓ 事实停滞 | 0.34.7（**2021-09-12**，近 5 年未出正式版） | Apache-2.0 / MIT 双授权 | README 自己承认 "This README is out of sync with the main branch which contains a large in-progress rewrite"、"quite young, should be considered unstable"、"on-disk format is going to change in ways that require manual migrations before the 1.0.0 release" |

有意思的细节：sled 的 README 示例里字面秀出了 `tree.compare_and_swap(...)` API——这正是 ADR-010 想要的原语名字，但这个具体实现处于事实停滞状态，**查得到但不能用**，必须如实报告，不能因为 API 名字对上了就误判为可用。

redb 的单 writer + 多并发 reader 的 MVCC 模型恰好匹配 ADR-010 决定一已经定死的产品约束——"第一版每个 case 只允许一个 active Work command"——也就是说本来就不存在多 writer 并发，`expectedVersion` 要解决的问题在 redb 里由事务系统内部串行化直接解决，甚至不需要用户态显式传版本号。

SQLite 若引入需要显式处理 macOS `fullfsync` 陷阱（第 3 节详述），且要求团队接受"数据库文件格式"作为新的长期依赖面（SQLite 本身以格式向后兼容极强著称，这是加分项，但仍是新增依赖）。

**结论标注**：「可评估 vendored」——不是纪律里点名的必须单独论证的例外（那个例外专指第 3 题的 atomic-replace crate），但按 CLAUDE.md"只借设计形状、不引第三方依赖"的既定判例，本报告不建议在这里替 ADR 拍板引入完整数据库。若团队后续认为值得引入，redb 是三者中风险最低的选项（纯 Rust、双宽松协议、无 C 依赖）；sled 应排除；SQLite 需要为 macOS 显式配置 `PRAGMA fullfsync=ON`。但更推荐的路径仍是 1.2 节的"改造取形"——直接照抄 WAL/redb 的核心形状（snapshot + 小步 delta + 周期 checkpoint），手写实现，不新增数据库依赖。

---

## 2. 崩溃一致性：六条契约点逐点分析

**先框定一个关键区分**：Temporal 的 durable execution 建立在"workflow 必须确定性"（✓-search，docs.temporal.io：给定同样输入，同样顺序产出同样 Command，才能用 replay 做恢复）之上；DBOS 的模型是"每个 step 执行前先查 Postgres 有没有记录过结果，有就复用，没有就重跑"（✓-search，dbos.dev）。这两个系统能安全"重放"是因为它们默认 step 是确定性纯函数或幂等外部调用。**Courtwork 的 Turn（LLM 调用）不是确定性纯函数**——这是六条契约里唯一一个不能简单套用"重放即恢复"的环节，必须单独处理。

逐点分析（"正确语义"栏是本报告给出的建议，不是 ADR-010 现有文本）：

| 契约点 | 崩溃窗口 | 正确恢复语义 | 是否可简单重放 |
|---|---|---|---|
| ① session header 持久 → 才能执行工具/调用 provider | 崩溃在①之前 | envelope 里连 session header 都没有，等同没开始，安全丢弃 | 是（无副作用发生） |
| ② `turn_linked` 持久 → 才能调用 Turn | **崩溃在②已持久、Turn 是否被调用/是否已产生外部效果未知** | **不能假装没发生，也不能假装已完成**——provider 调用是否真的发出、是否已被计费/消耗，本地状态无法判断。正确做法：把这次 attempt 标记为作废，要求全新 attempt id 重新发起，绝不能"续接"同一次未知结局的 Turn | **否**——这是六点里唯一真正危险的窗口 |
| ③ Turn terminal 持久 → 才能解析并发布 artifact | 崩溃在③已持久、解析/发布之间 | 解析是"从已持久的 Turn terminal 到 artifact"的确定性纯函数，重新解析一次即可，无副作用 | 是 |
| ④ pending confirmation 持久 → 才能发布 `confirmation_requested` | 崩溃在④已持久、发布之间 | 纯粹重新发布，是幂等投影动作 | 是 |
| ⑤ resume 的 validate-before-consume 与 `confirmation_resolved` 是同一次 CAS 状态转换 | 崩溃发生在这次 CAS 之内 | ADR-010 这里的设计已经是对的——因为强制"验证+消费"是单次原子 CAS，崩溃后只会看到两种状态之一（仍 pending，或已完全消费+已解决），不存在中间态，可以直接按落盘结果重放对应投影 | 是（这一点 ADR-010 已经设计对了，值得在报告里明确表扬） |
| ⑥ revision 载荷持久 → 才能发布 `revision_recorded` | 崩溃在⑥已持久、发布之间 | 纯粹重新发布 | 是 |

**结论**：六个点里五个可以用"envelope 是唯一真相、republish 是幂等投影"这套已经隐含在 ADR-010 里的模型正确处理（前提是 replay 真的实现成纯函数，这是一条需要在实现层验证的断言，不是自动成立的）。**唯一的例外是②到③之间跨越真实 provider 调用的窗口**，这个窗口的正确处理方式是"作废 + 新 attempt id"，而不是"重放/重连"。

有意思的是，**已归档的 58 号文档在"turn 级用户主权与留痕"一节里已经写了这个形状**："重试/重连……每次尝试 = 账本新事件（attempt id），旧尝试不抹除"。这个子构件虽然出自整体已不再权威的旧文档，但符合"取形不取码"纪律，本报告建议单独援引进 ADR-010 的崩溃恢复语义（详见第 6 节）。

**`interrupted` 投影够不够？** 作为**外部 UI 标签**，一个扁平的 `interrupted` 是对的——它正确履行了"静默降级零容忍"：reload 后不装作 running。但作为**内部 resume 决策依据**不够——resume 逻辑需要能从 envelope 里"最后一个成立的持久点是哪一个"推导出六种不同的具体动作（大多数是"重新 republish"，唯独②→③窗口是"作废重来"），目前 ADR-010 文本没有把这张判别矩阵写清楚。这是一处具体、可回灌的缺口，不是要推翻 `interrupted` 这个设计。

**行业成熟范式可取形之处**：Temporal 的"journal intent before effect, journal outcome right after effect"和 DBOS 的"step 级幂等键 + 先查已有记录再执行"，两者的共同内核就是 ADR-010 六条契约已经在做的事（先落盘意图再触发效果）——**这部分不需要新学，ADR-010 已经吃透了这个原则**；需要补的只是"外部不确定性调用不能被无条件重放"这一条 Temporal/DBOS 自己也严格遵守（用确定性约束或幂等键约束）的边界条件，Courtwork 目前对这条边界条件没有显式建模。

---

## 3. 原子替换的现实：macOS 系统调用序列与 Rust crate 生态

### 3.1 完整序列

```
写临时文件（与目标文件同目录、同卷）
  → fcntl(tmp_fd, F_FULLFSYNC)     ← macOS 特有，见 3.2
  → close(tmp_fd)
  → rename(tmp_path, final_path)   ← POSIX 保证同卷 rename 原子
  → open(目标所在目录)
  → fcntl(dir_fd, F_FULLFSYNC)     ← 让 rename 本身（目录项更新）也变得抗掉电
  → close(dir_fd)
```

### 3.2 为什么普通 `fsync()` 在 macOS 上不够，`F_FULLFSYNC` 是否必需

Apple 官方 `fsync(2)` 手册页原文（✓-fetch，2026-07-14）：

> "the drive itself may not physically write the data to the platters for quite some time and it may be written in an out-of-order sequence… if the drive loses power or the OS crashes, the application may find that only some or none of their data was written… For applications that require tighter guarantees about the integrity of their data, Mac OS X provides the F_FULLFSYNC fcntl."

`F_FULLFSYNC` 的官方定义（✓-fetch，`fcntl(2)`）：「做 `fsync(2)` 的事，然后要求驱动器把所有缓冲数据刷到永久存储」，"currently implemented on HFS, MS-DOS (FAT), and Universal Disk Format (UDF)"（APFS 未在这份较旧的手册页文本里被列出，但社区与 Apple 后续文档确认 APFS 同样支持，见下）。

**是否必需，取决于愿不愿意接受一个更弱的折中**：Apple 官方"Reducing Disk Writes"指南（经 bonsaidb.io 引用核实，✓-fetch 二手引用原文）建议大多数 App 用更轻量的 `F_BARRIERFSYNC`（只保证写入顺序屏障，返回时数据未必已落盘），只有"需要强掉电持久性保证"的 App 才应该用真正更慢的 `F_FULLFSYNC`。**对 Courtwork 这种把 Work 账本当作留痕/不可逆动作载体的产品，应该明确选择 `F_FULLFSYNC`，不是默认的 `F_BARRIERFSYNC`折中**——这是一个需要在实现规范里显式写死的选择，不能让实现者顺手选了更快但更弱的那个。

一个值得警惕的真实案例（✓-fetch，bonsaidb.io 2022 年文章，用 `dtrace` 实测验证）：**Apple 系统自带的 `sqlite3` 二进制文件，在用户开启 `PRAGMA fullfsync=on` 时，实际调用的是 `F_BARRIERFSYNC`（fcntl 命令码 0x55），而不是文档所说的 `F_FULLFSYNC`（0x33）**——即 Apple 系统 SQLite 的这一处行为和其官方文档不一致。这个案例的意义不在于 Courtwork 会不会用到系统 SQLite（下面会说明大概率不会），而在于说明**"文档写了 F_FULLFSYNC"不代表"实际路径真的调用了 F_FULLFSYNC"，必须用 dtrace/strace 级别的手段验证自己实现的代码路径**，不能只读文档就假设正确。

另一个近期、直接相关的独立信源（✓-fetch，avi.im，写于 2025 年并已修订）：macOS 系统自带的 SQLite CLI 默认 `journal_mode=wal`、`synchronous=NORMAL`（等于 1）、`fullfsync=0`——**默认配置下 commit 不是掉电持久的**。这与 Apple 系统 SQLite 的上一段发现相互印证。

**对 rusqlite 用户的关键澄清**（✓-search）：若 Courtwork 未来经 `rusqlite` 的 `bundled` feature 引入 SQLite，`libsqlite3-sys` 会用 `cc` crate 从源码编译一份 vendored SQLite（当前版本 3.53.2，随 rusqlite 0.40.1），**这条路径不经过 Apple 系统 sqlite3 那个被替换过的 fullfsync 实现**，走的是标准 SQLite 源码里原生的 `F_FULLFSYNC` 分支——只要显式 `PRAGMA fullfsync=ON` + `PRAGMA synchronous=FULL`（或 `EXTRA`），就能拿到文档承诺的行为。这个区分（系统 SQLite vs vendored SQLite）在任何未来讨论"要不要用 SQLite"时都必须讲清楚，否则容易把系统 SQLite 的坑错误地扣到 vendored 用法头上，或反过来误以为 vendored 也自动安全。

**目录 fsync 是否也需要 F_FULLFSYNC**：SQLite 官方文档（✓-fetch，`sqlite.org/pragma.html` 描述的 `EXTRA` 同步级别）证实了"目录也需要 sync"是被工业界正式承认的需求："EXTRA synchronous is like FULL with the addition that the directory containing a rollback journal is synced after that journal is unlinked to commit a transaction… EXTRA provides additional durability if the commit is followed closely by a power loss." 这条原理在"rename 而非 unlink"的场景下同样成立：只 fsync 新文件本身不够，还要 fsync 目录，否则崩溃后可能出现"新文件内容已落盘，但目录项还指向旧文件"的状态。目录是否也要用 `F_FULLFSYNC` 而非普通 `fsync`，本报告未找到专门针对目录 fd 的官方说明，按 Apple `fsync(2)` 手册页的措辞（没有把目录排除在警告范围外）推断应同样适用，**此处标记为 ※ 合理推断，非逐字核实**。

### 3.3 APFS 的 rename 原子性

本报告没有找到 Apple 官方文档就"APFS 上 rename(2) 是否原子"给出逐字书面承诺；能确认的是 rename 的原子性是 POSIX `rename(2)` 的通用契约（同卷内 rename 要么整体生效要么整体不生效），社区实测未发现 APFS 违反此契约的反例。**标记为 ※**——这是一条通用 POSIX 文件系统的常识性保证，而不是本次会话逐字核实到的 APFS 专属条款，如果这一点在实现前需要更硬的把握，建议实现阶段用 `dtruss`/崩溃注入做一次专门验证（呼应 bonsaidb.io 案例展示的方法论）。

### 3.4 Rust crate 生态（本节适用"取形不取码"的例外条款，逐个单独论证）

| Crate | 核实结果 | 能不能解决问题 |
|---|---|---|
| **tempfile**（`NamedTempFile::persist()`） | ✓-fetch(经 lib.rs，数据截至 ~2024-11，已陈旧) + ✓-search(docs.rs 摘要，声称最新 3.27.0 于 2026-03) — MIT/Apache-2.0，长期是 Filesystem 类目下载量第一的 crate | **必要不充分**——`persist()` 基于 rename 做原子替换，但文档原话明确"neither the file contents nor the containing directory are synchronized"，即它不做 fsync，调用方必须自己在 `persist()` 前后补 fsync/F_FULLFSYNC |
| **atomicwrites** | ✓-fetch(crates.io API JSON) — MIT，v0.4.4 发布于 2024-09-19，240 行代码，作者为知名 Rust 社区人物（`untitaker`/后期由 `sunfishcode` 维护发布） | 同样只做"临时文件同目录 + rename"，未见证据其内部处理了 macOS 的 F_FULLFSYNC 特例（体量只有 240 行，大概率没有覆盖此平台特例）——必要不充分，且近 22 个月无新版本，需判断是"小而稳定"还是"停止维护"，本报告不下定论 |
| **rustix**（`fcntl_fullfsync`） | ✓-search(docs.rs 摘要) + ✓-fetch(lib.rs，但该镜像数据只显示到 2022 年，**明确无法核实 2026 年真实版本号与最近提交时间**) — Bytecode Alliance 项目，Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT 三选一宽松协议 | 直接提供 macOS 的 `F_FULLFSYNC` 系统调用包装——这是前两个 crate 都没有的那一块拼图 |

**一个更值得注意的发现**：Rust 标准库自己都没把这件事做对。`rust-lang/rust` 官方仓库 issue #55920（✓-fetch，2026-07-14）明确提出"`File::sync_all` 在 macOS/iOS 上是不是应该用 `libc::fcntl(fd, libc::F_FULLFSYNC)`"，说明**`std::fs::File::sync_all()` 在 macOS 上不能被信任为真正掉电安全**，必须绕开标准库自己动手调用 `fcntl`。

**结论与推荐（这是纪律里点名的"第 3 题例外"，单独论证如下）**：

不建议引入 `tempfile`、`atomicwrites` 或 `rustix` 作为新的顶层依赖。理由：①"临时文件同目录 + rename"这部分逻辑只有几十行，不值得为此新增一个顶层依赖来对齐"不引第三方依赖"的既定判例；②真正稀缺、必须靠外部支持的只是 macOS 独有的 `F_FULLFSYNC` 系统调用，而这只需要 `libc` crate（Tauri 应用的依赖树里本来就有）里的一个 `fcntl` 符号，用几行 `unsafe` 代码直接调用即可；③既然连 Rust 标准库自己都没把这件事做对（issue #55920），说明这不是一个"自己实现不如用现成的"的场景——现成的（标准库）也没做对，用几行手写 `unsafe fcntl` 反而是更可控、更可审计的选择，比引入一个新 crate 更符合 CLAUDE.md 的既定判例。

**标注：可评估 vendored（但本报告的推荐是不 vendor，改用已在依赖树里的 `libc` 直接调用）。**

### 3.5 Tauri v2 的 fs / app-data API 提供到哪一层

- `tauri-plugin-store`（✓-fetch，2026-07-14）：JSON key-value 存储，`save()` 要么手动调用要么按 debounce（默认 100ms）自动保存，**文档全篇没有出现任何 CAS/版本号/fsync 顺序的语义承诺**。不适合直接承担 ADR-010 的持久点职责。
- `tauri-plugin-fs`：提供 `writeFile`/`rename` 等底层原语，可以从 JS 直接调用，但这意味着 Rust 不再是每次写入的强制守门人——ADR-010 要求的"Rust 强制 app-data scope、id 形状、大小上限、符号链接/路径穿越隔离"这些检查，只有在**每次写入都经过一个专属 Rust command**时才能生效；如果 JS 拿着（哪怕限定在 app-data 范围内的）文件系统权限直接调用，这些检查就被绕开了。

**结论**：Tauri 官方插件都不够，ADR-010 现有文本要求"宿主只提供 case-scoped opaque blob 的 read/CAS"、由一个专属 Tauri command 实现，这个判断本身是对的，本次调研没有找到理由推翻它，只是要在实现规范里把"原子替换"四个字具体化到 3.1 节的系统调用序列，否则容易被实现成"随手 `fs::write` 加个 `fsync`"而拿不到真正的掉电安全。

---

## 4. version token 语义：`expectedVersion: string | null` 该是什么

**先指出一个 ADR-010 文本里已经存在但没被使用到刀刃上的字段**：`WorkStateEnvelopeV1` 里已经声明了 `revision: number`（ADR-010 第 121 行），但 `compareAndSwap` 的 `expectedVersion` 类型是独立的 `string | null`（第 155 行），**两者的关系没有在文本里说明**——`expectedVersion` 到底是不是 `String(envelope.revision)`？还是一个完全独立、由 Rust host 自己维护的东西？这是一处需要回灌的具体空白（见第 6 节）。

四种候选逐一评估：

| 候选 | ABA 风险 | 精度/粒度问题 | 跨进程正确性 | 计算成本 |
|---|---|---|---|---|
| **mtime** | 高——两次真实不同的写入若落在同一时间粒度内会产生相同 mtime，CAS 检查会"误判无冲突" | HFS+ 历史上是 1 秒粒度的著名坑；APFS 理论上到纳秒级，但跨卷复制/部分工具链仍可能被截断到更粗粒度；调度延迟也可能让两次快速写入落在同一 tick | 不涉及（本地文件系统属性，天然跨进程一致），但精度问题依旧 | 免费（stat 自带） |
| **size + mtime** | 中——两次不同内容长度恰好相等的情况可以人为构造（比如一个字段值替换成等长字符串），mtime 部分的坑依旧在 | 同上，只是把碰撞概率降低而非消除 | 同上 | 免费 |
| **内容 hash（如 sha256）** | 低但不为零——若内容真的字节级回退到旧状态（合法的"revert"），hash 会相同，这其实是"正确"行为不是 bug，但如果调用方把"hash 相同"简单等同于"没有并发写入"，逻辑上仍有微妙陷阱；序列化必须规范化（字段序、数字格式固定）否则两个语义相同的对象会产生不同 hash——这一点archived 58 号文档第七节已经提出"规范化序列化、字段序固定"的纪律，可以直接复用 | 需要对整份 envelope 重新序列化再 hash，成本随 envelope 增长而增长（虽远小于全量重写的磁盘 I/O，但不是零） | 若 hash 由 TS 侧计算再传给 Rust，两个 TS 进程各自算出的 hash 需要与 Rust 侧记录的"当前真实 hash"比对——没有本质问题，但把"版本真源"放在了会被序列化差异污染的地方 | 中等（一次哈希遍历） |
| **单调 generation counter（由 Rust host 铸造）** | 无——计数器严格递增，不会重复出现同一 token，这正是 Kleppmann 提出的 fencing token 设计要解决的问题：即使内容真的回退到旧值，计数器也不会回退 | 无粒度问题——是整数不是时间戳 | **最强**——因为计数器由持有物理文件的唯一权威方（Rust host）铸造和保管，任何一个 TS 进程无论自己内存里以为的 revision 是多少，CAS 检查的永远是"host 记录的上一次成功写入编号"，不存在"两个进程各自相信自己是对的"的循环论证 | 极低（自增 1） |

**生产实践佐证**：

- **AWS S3 的条件写**（✓-search，2024-11 官方公告）用 `If-Match` + `ETag` 做生产级 CAS，这是"内容 hash 作为版本 token"在超大规模生产系统里的真实案例，值得参考；但同一批资料也提醒了一个边界情况——S3 的 multipart 上传产生的 ETag **不是**整个对象内容的纯 MD5（是分片 hash 的 hash，带 `-N` 后缀），说明就连 S3 自己的旗舰实现，"hash"也只是"恰好经常由内容派生的不透明比较 token"，不是严格意义上"任何相同内容都产生相同 token"的纯函数——这提醒我们不要把"hash"想得比它实际承诺的更强。
- **etcd 的 revision**（✓-search，etcd 官方文档）是一个集群级单调递增计数器，文献明确把它类比为 Kleppmann 的 fencing token；**Martin Kleppmann 本人的原始论证**（✓-search，"How to do distributed locking"）正是"单调递增 token，接收方拒绝比自己见过的更小的 token"这套模型，专门用来关闭 ABA 类问题。

**本报告的核心建议**：**version token 应该由持久层（Rust host）铸造和保管，而不是调用方（TS）计算后传入。** 理由是循环论证问题——如果信任调用方自己算的版本号（不管是 mtime、hash 还是 TS 侧的 `revision` 字段），一个状态过期的调用方完全可能基于自己过期的内存状态算出一个"看起来合法"的 token；只有让 Rust（唯一持有物理文件、唯一见证"这份文件真的被成功替换过几次"的角色）自己维护一个单调计数器，并把它作为 `version` 返回给调用方，才能让"过期"这件事被**持久层**而不是**调用方的自我报告**裁决。具体做法可以是：Rust 在每次 `compareAndSwap` 成功后把内部计数器加一，作为下次 `read()`/`compareAndSwap()` 返回值里的 `version` 字符串；TS 侧的 `envelope.revision` 字段可以继续独立存在（作为 TS 自己的审计/展示用途），但不应该被当成 `expectedVersion` 的来源，两者是两条平行的账，不要混用。

**标注：直取形状**（fencing token 单调计数器模型），**不引入 etcd/S3 本身，只借鉴"谁来铸造版本号"这个设计决定。**

---

## 5. snapshot/compaction：两种前提下的收敛策略

### 5.1 若改用 append-only（呼应 1.2 节推荐）

**切分方式**：一个小的 snapshot blob（仍然用 CAS 管理，第 4 节的单调计数器直接复用为 snapshot 的版本号）+ 一段 append-only tail log，log 里每条记录带自increment 的 seq。恢复 = 读 snapshot + 重放 seq 大于 snapshot 记录的 `lastCompactedSeq` 的 tail 记录。

**compaction 的触发**：建议按 SQLite WAL 的思路定量起点（✓-fetch：SQLite 默认在 WAL 达到约 1000 页/4MB 时自动 checkpoint），但 Courtwork 的单条记录远小于数据库页，更适合按事件条数或 tail 累计体积设阈值（比如每 20-50 个事件或 tail 超过 ~256KB）。**具体数字不应该在这份调研报告里拍板**——已归档 58 号文档自己的工程纪律（"调研预案……实测驱动后置"）也认为这类阈值应该等真实遥测数据出来后再调，本报告只给出机制，不给出最终数字。

**compaction 的原子性——直接照抄 SQLite WAL checkpoint 的排序原则**（✓-fetch 原文：「The WAL must be synced to persistent storage prior to moving content from the WAL into the database and the database file must be synced prior to resetting the WAL」）：

1. 先把新 snapshot（覆盖到 seq = S+K）完整、原子地落盘（复用第 3 节的原子替换序列，本身也是一次对旧 snapshot 的 CAS）；
2. **只有在新 snapshot 确认落盘之后**，才截断/重置 tail log。

若崩溃发生在①②之间：恢复时会看到"新 snapshot 已存在 + 旧 tail log 里那些已经被折进新 snapshot 的记录还在"——只要每条 tail 记录带 seq、snapshot 自己记录 `lastCompactedSeq`，重放逻辑天然幂等（跳过已经被折叠过的 seq），不会丢数据也不会重复应用，代价只是多做一点点冗余重放工作。这个顺序绝不能反过来（先清 tail 再写 snapshot），反过来会在崩溃时造成真正的数据丢失。

**"历史不可涂改"在这里的物理含义需要澄清**：这条不变量保护的是**用户可见的历史**（对话可分叉、旧 turn 与下游 artifact 不可篡改），不是承诺"每一条内部 `StoredSessionEvent` 的原始字节必须永远逐字留在磁盘上"。envelope 里的四个数组地位并不相同：

- `events`（扁平 SessionEvent 流）更接近"transcript 投影缓存"，理论上可以从 `turnEntries`/`revisionEvents`/artifact envelope 重新推导；
- `turnEntries`、`pendingConfirmations`、`revisionEvents` 是结构化的权威记录（尤其 `revisionEvents` 承载 actor/时间戳/新旧值，是"历史不可涂改"真正要保护的东西）。

**建议只压缩 `events`，不压缩后三者**——这是一处需要在 ADR 里明确写清楚的区分，目前文本把四个数组并列声明，没有说明谁可压缩、谁是权威记录。

**标注：改造取形**（照抄 WAL checkpoint 排序原则，不引入 SQLite 本身）。

### 5.2 若维持单 blob（不采纳 1.2 节建议的情况下的最小缓解）

不改 host port 签名，只在 TS 侧组装 envelope 时对 `events` 数组做同样的"折叠进结构化数组、只保留最近若干条用于 UI 回滚/调试"的处理，`turnEntries`/`pendingConfirmations`/`revisionEvents` 不动（自然受会话轮次数量限制，增长比扁平事件流慢得多）。

这只是**收窄 O(N²) 的常数因子和封顶**（防止 `events` 无限增长把单次全量重写的体积推向失控），**不能修复 O(N²) 这个结构性问题本身**——只有 5.1 的 append-only 切分能做到。应该把这个方案定位成"短期路标"而不是长期方案。

**标注：直取形状**（ADR-010 决定二内部就能做的调整，不改 host port 签名）。

---

## 6. 回灌建议（逐条对应 ADR-010 具体段落）

以下每条建议都标注 ADR-010 中对应的大致行号（基于本次调研读取的版本），供 ADR 责任人直接定位：

1. **`WorkStateHostPort.compareAndSwap` 签名段（约第 147-159 行）**：补充说明 `bytes` 不必是整份 envelope 的全量序列化；建议改为两个 host 原语——snapshot blob（CAS）+ append-only tail（按 offset 校验后追加）。若团队短期内决定维持单 blob，至少要在 ADR 里显式承认"O(N²) 写放大是已知代价而非疏漏"，不能保持沉默。

2. **`expectedVersion: string | null` 的定义（约第 155 行）**：需要明确其铸造方。建议写成"由 Rust host 维护的单调 generation counter，每次 CAS 成功后自增，与 TS 侧 envelope 自身的 `revision` 字段（第 121 行）各自独立、互不作为对方的来源"，并说明排除 mtime/hash 作为版本源的理由（见第 4 节）。

3. **"宿主只提供……原子替换"一句（约第 161-163 行）**：需要补一份系统调用级验收标准——临时文件同目录 + 显式 `F_FULLFSYNC`（非普通 `fsync`，Rust 标准库的 `sync_all` 在 macOS 上不可信，见第 3.4 节）+ `rename` + 目录 `F_FULLFSYNC`。需要注明这是 macOS/APFS 专属要求，不是跨平台通用假设（Windows/Linux 的对应实现需要单独核实，本次调研未覆盖）。

4. **"localStorage 不得充当生产 Work store"一句（约第 163 行）**：建议同句追加排除 `tauri-plugin-store`——理由相同（无 CAS 语义、`save()` 依赖 debounce 而非同步落盘），否则容易被实现者当成"介于 localStorage 和自写 command 之间的省事选项"误用。

5. **崩溃恢复的内部状态机（呼应决定一第 110 行 `interrupted` 定义与决定二第 165-174 行的六条契约）**：建议补一段"恢复判别矩阵"——按 envelope 里最后一个成立的持久点，明确六种不同的 resume 动作；尤其要显式禁止在 `turn_linked` 已持久、Turn terminal 未持久这一窗口内做任何形式的自动重放/重连，必须作废该次 attempt 并生成新的 attempt id。这个"attempt id"概念可以直接从已归档 58 号文档"turn 级用户主权与留痕"一节吸收（该文档整体不再权威，但这个子构件符合取形纪律，建议在 ADR-010 里正式落地并标注来源，而不是让它随归档一起消失）。

6. **envelope 内四个数组的地位区分（第 135-138 行 `events`/`turnEntries`/`pendingConfirmations`/`revisionEvents` 并列声明处）**：建议明确写出"`events` 是可重新推导的投影缓存，允许在 compaction 中折叠；`turnEntries`/`pendingConfirmations`/`revisionEvents` 是结构化权威记录，是'历史不可涂改'实际保护的对象，任何 compaction 方案都不得压缩后三者"。

---

## 7. 来源清单

方法论标注：**✓-fetch** = 本次会话内用 `web_fetch` 直接抓取页面原文；**✓-search** = 本次会话内用 WebSearch 命中官方域名并取得可信摘要/引用片段，但未逐页 fetch 全文；**※** = 训练语料所知，本次未核实，可能已漂移。日期均为抓取当日 **2026-07-14**，另注明原文发布/更新日期（如有）。

| # | 来源 | 方法 | 用途 |
|---|---|---|---|
| 1 | [cberner/redb GitHub](https://github.com/cberner/redb) | ✓-fetch | redb 状态"Stable and maintained"、v4.1.0（2026-04-19）、License、基准测试表 |
| 2 | [spacejam/sled GitHub](https://github.com/spacejam/sled) | ✓-fetch | sled 最新正式版 0.34.7（2021-09-12）、README 自陈停滞/不稳定、`compare_and_swap` API 示例 |
| 3 | [SQLite Write-Ahead Logging](https://sqlite.org/wal.html)（页面标注 last updated 2026-04-13） | ✓-fetch | WAL 机制、checkpoint 阈值、2026-03-03 披露并于 3.51.3 修复的 WAL-reset bug |
| 4 | [SQLite Powersafe Overwrite](https://sqlite.org/psow.html) | ✓-fetch | torn page 处理原则 |
| 5 | [Tauri v2 Store 插件文档](https://v2.tauri.app/plugin/store/)（页面标注 last updated 2025-11-10） | ✓-fetch | Store 插件 API 形状、autoSave 100ms debounce、无 CAS 语义 |
| 6 | [avi.im "SQLite commits are not durable under default settings"](https://avi.im/blag/2025/sqlite-fsync/)（原文 2025 年，含后续修订） | ✓-fetch | macOS 系统 SQLite 默认 `synchronous=NORMAL`、`fullfsync=0` |
| 7 | Apple `fcntl(2)` 官方手册页：`https://developer.apple.com/library/archive/documentation/System/Conceptual/ManPages_iPhoneOS/man2/fcntl.2.html`（未写成 markdown 链接：该 URL 含 `/archive/` 字样，会触发 `deslop-scan` 的 archive-reference 误报，详见 `docs/research/README.md`「已知门误报」） | ✓-fetch | `F_FULLFSYNC` 官方定义 |
| 8 | [bonsaidb.io "SQLite on macOS: Not ACID compliant"](https://bonsaidb.io/blog/acid-on-apple/)（原文 2022-06-14） | ✓-fetch | dtrace 实测 Apple 系统 sqlite3 用 `F_BARRIERFSYNC` 替换 `F_FULLFSYNC`；转引 Apple 官方 `fsync(2)` 与 "Reducing Disk Writes" 原文 |
| 9 | [atomicwrites crates.io API](https://crates.io/api/v1/crates/atomicwrites) | ✓-fetch | v0.4.4，MIT，2024-09-19 发布，33 个历史版本 |
| 10 | [tempfile / NamedTempFile::persist 文档](https://docs.rs/tempfile/latest/tempfile/struct.NamedTempFile.html) | ✓-search | persist() 基于 rename、不 fsync 文件也不 fsync 目录；最新版本号（3.27.0/2026-03）未逐页核实 |
| 11 | [rustix / lib.rs](https://lib.rs/crates/rustix)（镜像数据陈旧，仅显示到 2022 年） + docs.rs 摘要 | 部分✓-fetch(陈旧)+✓-search | 提供 `fcntl_fullfsync`；Bytecode Alliance 项目；三选一宽松协议；**2026 年真实版本号未能核实** |
| 12 | [rust-lang/rust issue #55920](https://github.com/rust-lang/rust/issues/55920) | ✓-fetch | 标准库 `File::sync_all` 在 macOS 上是否应调用 `F_FULLFSYNC` 的未决问题 |
| 13 | libsqlite3-sys / rusqlite bundled feature 相关页面 | ✓-search | bundled 编译 vendored SQLite 3.53.2（随 rusqlite 0.40.1），不经过系统 SQLite 的 fullfsync 替换路径 |
| 14 | Temporal 官方文档（docs.temporal.io，event history/replay/determinism 相关页） | ✓-search | durable execution 的确定性重放模型、"effectively once" activity |
| 15 | DBOS 官方文档/博客（docs.dbos.dev、dbos.dev） | ✓-search | Postgres 检查点、PENDING 恢复、step 级幂等键 |
| 16 | [Event Sourcing pattern - Azure Architecture Center](https://learn.microsoft.com/en-us/azure/architecture/patterns/event-sourcing)（页面标注 last updated 2026-03-28） | ✓-fetch | snapshot 是优化非替代、at-least-once 幂等要求、乐观并发拒绝重试、四种事件版本化策略、crypto-shredding |
| 17 | Martin Kleppmann "How to do distributed locking" | ✓-search | fencing token / 单调 token 抗 ABA 的原始论证 |
| 18 | etcd 官方文档（etcd.io，revision/MVCC 相关页） | ✓-search | revision 作为集群级单调计数器与 fencing token 的生产实践 |
| 19 | [AWS S3 conditional writes 公告（2024-11）](https://aws.amazon.com/about-aws/whats-new/2024/11/amazon-s3-functionality-conditional-writes/) | ✓-search | `If-Match`/ETag 作为生产级 CAS token；multipart ETag 非纯内容 MD5 的边界情况 |
| 20 | [Ink & Switch "Local-first software"](https://www.inkandswitch.com/essay/local-first/) | ✓-search | 背景印证，未直接支撑具体结论 |
| 21 | Tauri v2 IPC 性能相关讨论（社区 benchmark + 官方 concept 页） | ✓-search（含社区数据点） | JSON vs 二进制 IPC 编码开销数量级差异（65536 字节：6.7ms vs 600us） |
| 22 | Apache Kafka log compaction | 未能核实（官方文档页面为 JS 重定向，本次未取得正文） | 本报告仅以 ※ 训练知识描述其"按 key 折叠、tombstone 删除"机制，未在结论中作为主要依据 |
| — | ADR-010（项目内部文档，全文读取） | 本地文件，非网络来源 | 本次调研的核心分析对象 |
| — | 归档 58 号文档（项目内部文档，全文读取，已归档不再权威） | 本地文件，非网络来源 | 仅作历史形状参照，"attempt id"子构件按取形纪律单独援引 |
