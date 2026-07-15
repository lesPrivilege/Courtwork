# WORK-STORE-MEASURE 测量报告

工单：`WORK-STORE-MEASURE`（Round 3，Work live 主线）
授权文档：[ADR-010 决定二「v1 whole-envelope CAS 与测量门」](../../../../docs/decisions/ADR-010-work-live-boundaries.md)（第 213–217 行）、[实现就绪图 WORK-STORE-MEASURE 行](../../../../docs/architecture/implementation-readiness.md)
基线：`main @ 303f2d2`
本报告供 `WORK-STORE-1` 开工消费。本工单只测量，不实现 WORK-STORE-1、不改 store、不动 schema。

## 0. 结论先行

- 峰值单次 whole-envelope CAS = **34.76 KiB**（合成 2 页卷宗实测）；上界随案件抽取文本近似线性，1 MiB 文本的大案 ≈ **1.03 MiB**。
- F_FULLFSYNC 原子替换 CAS 延迟 ≈ **6.2 ms p50 / 8.0 ms p95**，且在 36 KiB–1 MiB **与信封大小无关**（成本是介质刷盘往返，不是写字节）。
- 单场景 **6–28 次 CAS**（屏障最小 6 / per-mutation 上界 28），累计写入 84–504 KiB；耐久开销 ≈ 36–170 ms，对比动辄数秒的 provider 调用可忽略。
- 100 次真实 `kill -9`：原子替换 **0 次撕裂**，恢复窗口 = 至多 1 次在途 CAS；直接就地覆写 20–33% 撕裂并连旧版本一起丢。
- **数据结论：v1 whole-envelope CAS + 原子替换 + F_FULLFSYNC 足够且正确，未触及任何产品阈值。不需要 snapshot+tail，也不需要手写 WAL。** 这是对 ADR-010 决定二的**确认**，非推翻，无需 `[需架构拍板]`。

## 1. 目的与范围

ADR-010 决定二第 215 行要求：`WORK-STORE-MEASURE` 与 `WORK-STORE-1` 同批必须记录实际 envelope bytes、CAS latency、write count 与 kill/crash 恢复窗口；在真实阈值触线前不得换 snapshot+tail 或手写 WAL。第 217 行：若测量证明 whole-envelope 已触及产品阈值，须另立 ADR（契约级）。

本报告用**真实执行机**产出四项可复现数字，并据此给出 WORK-STORE-1 的阈值建议与「不需要 WAL」的论证。

**本质复杂度只有一条**：durable-before-effect 的耐久语义度量。故本工单只有三个度量脚本 + 本报告，不建仪表框架、不引 benchmark 库、不产新存储架构。

## 2. 环境

| 项 | 值 |
|---|---|
| 机型 | MacBook Air `Mac14,2`（Apple M2，16 GB） |
| OS / 内核 | Darwin 25.5.0（xnu arm64 T8112） |
| 文件系统 | APFS，内置 NVMe SSD（Data 卷 `disk3s5`） |
| Node | v25.9.0（libuv 的 `fs.fsyncSync` 在 macOS 上映射 `F_FULLFSYNC`，见 §4 注） |
| clang | Apple clang 21.0.0 |

> 阈值判读随平台变。外置/USB SSD、机械盘、Windows/Linux 的 `F_FULLFSYNC` 对应原语延迟不同。WORK-STORE-1 的 Rust host 必须在**目标卷**上另证 F_FULLFSYNC 实际发生（ADR-010 第 196 行）。本报告数字代表 Apple 内置 NVMe。

## 3. 度量一：whole-envelope bytes 分布 + write count

**方法**：用真实 `legal.S3` scripted 全链（合成卷宗 fixture，同 `demo:legal`：8 风险 / 单 Turn / 7 确认 + 1 驳回）驱动真实 core executor。在每一次会真正落账的 store 变更点，按 ADR-010 决定二的 `WorkStateEnvelopeV1` 形状把当前四段账本（`events` / `turnEntries` / `pendingConfirmations` / `revisionEvents`）+ 会话元数据组装成一份 whole envelope，度量紧凑 JSON 的 UTF-8 字节数——即「若此刻做一次 whole-envelope CAS 要写多少字节」的观测真值。脚本：[`measure-envelope.ts`](measure-envelope.ts)。

> 元数据保真度：`WorkStateEnvelopeV1` 尚未落 core（contract-only，WORK-STORE-1 才实现），脚本内按 ADR-010 决定二的形状本地镜像。元数据字段（`scenarioFingerprint`、`packageVersion`、`costBasis` 等）是代表性常量，合计约 0.6–1.0 KiB，随本报告披露；字节主项是四段账本的**真实数据**，元数据是稳定小常量，不改变阈值判读。

### 3.1 逐写点字节与分布

关键写点（合成卷宗实测）：

| 写点 | envelope 字节 | 说明 |
|---|---|---|
| session:header | 998 B | 空账本 + 元数据（CAS 下限） |
| turn_linked | 1,281 B | 追加 turn_linked（provider 调用前须持久） |
| turn:terminal | 7,358 B | 追加 Turn 终态（含 assistantMessage/reasoning） |
| artifact_produced | 13,834 B | 追加首份 RiskList |
| **pending:save** | 34,987 B | **pending 落账：复制 RiskList + 材料快照 + toolResults + ledger** |
| confirmation_requested | **35,598 B** | **峰值**（暂停点，pending 在场 + 4 事件 + Turn） |
| pending:consume | 14,445 B | 消费 pending，回落 |
| …8 条 revision… | 15,206 → 19,586 B | 每条 payload + revision_recorded |
| scenario_completed | **26,410 B** | **终值**（16 事件含 2 份 RiskList + 8 revision，无 pending） |

分布：`min=998 B`，`p50=17,152 B`，`p95=35,334 B`，`max(peak)=35,598 B (34.76 KiB)`，`final=26,410 B (25.79 KiB)`。

**峰值结构洞察**：峰值出现在**暂停点**——`pending:save` 一步从 13.5 KiB 跳到 34.2 KiB（+21 KiB）。因为 `PendingConfirmation` 同时封存了「继续所需的一切」：`producedArtifacts`（再复制一份 RiskList）+ `materials[].readingMarkdown`（卷宗抽取全文快照，本例合同 3,391 B + 信用单 2,538 B = 5,929 B）+ `toolResults` + `evidenceLedgerSnapshot`。**材料快照在 envelope 内只出现在 `pending.materials` 一处**，是峰值随案件规模增长的主导项。

### 3.2 峰值上界曲线（真实结构，仅变案件抽取文本总字节 M）

拿真实暂停快照（真实 events/turns/pending 结构），只把 `pending.materials` 的 `readingMarkdown` 总量替换为不同案件抽取文本字节 M：

| 案件抽取文本 M | 峰值 envelope |
|---|---|
| 5,929 B（实测合成卷宗） | 34.76 KiB |
| 50 KiB | 79.0 KiB |
| 200 KiB | 229 KiB |
| 1 MiB | 1.028 MiB |
| 5 MiB | 5.028 MiB |

近似线性：`peak ≈ 29.7 KiB 非材料基线 + M`。即便 5 MiB 抽取文本的超大卷宗，单次 CAS 也只有约 5 MiB——对任何原子文件写/嵌入式存储都是小 blob。

### 3.3 write count 与写放大（三模型）

whole-envelope CAS 每次写整份信封，故写放大 = Σ(各 CAS 点信封字节)。write count 取决于 WORK-STORE-1 如何把 ADR-010 决定二第 199–206 行的 durable-before-effect 屏障归并成 CAS（本工单不实现，故给区间）：

| 模型 | CAS 次数 | 累计写入 | 归并口径 |
|---|---|---|---|
| **屏障最小** | **6** | 84.40 KiB | header / turn_linked / turn_terminal / 暂停批 / resume 解析 / resume 尾 各 1 次 |
| per-revision 保守 | 14 | 220.95 KiB | 上者 + 8 条 revision 各 1 次 CAS |
| per-mutation 上界 | 28 | 503.53 KiB | 每个真实落账点各 1 次 CAS（绝对上界） |

屏障最小的 6 次对应 ADR-010 决定二的六条顺序（header→turn_linked→turn terminal→pending/暂停→consume+resolved→revision/产出/完成）。真实 WORK-STORE-1 落在 6–14 之间。

## 4. 度量二：原子替换 CAS 系统调用级延迟

**方法**：C 直调系统调用，在 APFS 真机上度量「同目录临时文件 → 落盘 → rename → 目录项落盘」在四种落盘原语下每次的延迟。脚本：[`cas-latency.c`](cas-latency.c)。每组 200 次迭代 + 5 次 warmup，对**文件与父目录都**施加所选原语（目录 fd 上 `F_BARRIERFSYNC`/`F_FULLFSYNC` 均成功，未回退 `fsync`）。

> 为何用 C：Node 的 `fs.fsyncSync` 在 macOS 上经 libuv 已映射为 `fcntl(F_FULLFSYNC)`（失败回退 `F_BARRIERFSYNC`/`fsync`），无法单独度量「不加 full 的差」。C 直调才能隔离原语差异，也满足 ADR-010「系统调用级证据」的要求（第 338 行：库级 `sync_all` 名称不能替代）。

实测（ms）：

| 大小 | 原语 | min | p50 | p95 | mean |
|---|---|---|---|---|---|
| 36 KiB | none | 0.15 | 0.18 | 0.37 | 0.21 |
| 36 KiB | fsync | 0.19 | 0.22 | 0.29 | 0.23 |
| 36 KiB | barrier | 0.65 | 1.31 | 6.12 | 2.43 |
| 36 KiB | **full (F_FULLFSYNC)** | 3.27 | **6.19** | **8.04** | 6.46 |
| 256 KiB | full | 3.13 | 6.01 | 7.93 | 6.11 |
| 1 MiB | none | 0.23 | 0.28 | 5.24 | 1.16 |
| 1 MiB | fsync | 0.48 | 0.54 | 6.11 | 1.26 |
| 1 MiB | barrier | 1.56 | 2.24 | 5.69 | 3.04 |
| 1 MiB | **full (F_FULLFSYNC)** | 4.27 | **6.19** | 8.09 | 6.65 |

**两条关键洞察**：

1. **F_FULLFSYNC ≈ 6.2 ms p50，与信封大小无关**（36 KiB 与 1 MiB 的 p50 均为 6.19 ms，尺寸差约 28× 而延迟差约 0）。成本是盘的介质刷盘往返/NAND program 延迟，不是写字节。
2. **`fsync` 便宜（~0.2 ms）但在 Apple 上不刷介质**（`fsync(2)` man 明载），断电不保证耐久——不能用作 whole-envelope 的崩溃耐久原语。`barrier` 居中（~1–2 ms，发屏障弱于 full）。

**单场景耐久开销**：屏障最小 6 CAS × 6.2 ms ≈ **37 ms**；per-mutation 上界 28 × 8 ms(p95) ≈ **224 ms**。对比 provider 调用（秒级）可忽略。

## 5. 度量三：kill -9 崩溃注入 → 恢复窗口

**方法**：真实 `SIGKILL`。子进程 writer 猛写 ≈36 KiB 信封（同实测峰值量级）；先把 target 播种为完整 v0，随机 3–30 ms 后 `kill -9`，读回判定完整/撕裂。两 arm 对照：`atomic`（写临时+fsync+rename+fsync 目录）vs `direct`（O_TRUNC 就地分块慢写）。脚本：[`crash-inject.mjs`](crash-inject.mjs)。`atomic` arm 的 `fsyncSync` 在 macOS 上即真实 F_FULLFSYNC。

实测（两轮共 100 次真实 SIGKILL，均确认 `exitSignal=SIGKILL`）：

| arm | 崩溃后完整 | 崩溃后撕裂 |
|---|---|---|
| **atomic**（原子替换） | **100/100** | **0/100** |
| direct（就地覆写） | ~70–80% | ~20–33%（`unparseable` + `empty(truncated)`） |

- **原子替换 0 撕裂**：target 任何时刻都是某个完整版本（rename 前后二选一）。**恢复窗口 = 至多 1 次在途 CAS**——崩溃后读回最后一次成功 rename 的完整信封即可，无部分状态、无需 WAL 重放。
- **直接覆写会撕裂**：`O_TRUNC` 先清空 target，crash 落在写窗即得部分/空文件，且**旧完整版本一并丢失**。这正反证 whole-envelope 必须走原子替换，而非就地改写。

## 6. 给 WORK-STORE-1 的阈值建议

| 维度 | 实测 | 建议阈值 / 动作 |
|---|---|---|
| 单次 CAS 信封大小 | 峰值 34.76 KiB；上界 ≈ 29.7 KiB + 案件抽取文本 | Rust host 的「大小上限」（ADR-010 第 195 行）设 **硬上限 16 MiB、软告警 4 MiB**。越限 = ADR-010 第 217 行的触发信号（显式 fail，另立 ADR），不得静默换设计。16 MiB ≈ 单会话 16 MiB 抽取文本，远超单案单会话工作集。 |
| CAS 延迟 | F_FULLFSYNC 6.2 ms p50 / 8.0 ms p95，尺寸无关 | 每个 durable 屏障预算 **~10 ms**（p95 + 余量）。无需按大小分级。 |
| write count / 场景 | 6（屏障）–28（上界） | 建议**按 durable-before-effect 屏障归并到 ~6 次 CAS**（非 per-event），纯为整洁；非性能瓶颈。 |
| 单场景写放大 | 84–504 KiB | 无需阈值：SSD 带宽/寿命可忽略。 |
| 崩溃恢复 | 原子替换 0/100 撕裂，窗口 = 1 CAS | 用**原子替换（临时文件+fsync+rename+fsync 目录）**作唯一耐久原语；恢复 = 读最后完整信封 + 把「turn_linked 已持久但 Turn terminal 缺席」的 attempt 标 interrupted（ADR-010 第 209–211 行）。 |

## 7. 「不需要 snapshot+tail / 不需要手写 WAL」的数据论证

WAL / snapshot+tail 的存在理由是「用追加小 delta 避免重写大 base」。本测量逐条否定该前提在 v1 成立：

1. **主导成本是固定的 F_FULLFSYNC 刷盘（~6 ms），与写字节数无关**（§4 洞察 1：36 KiB 与 1 MiB 的 full p50 都是 6.19 ms）。WAL 只省下 ~26–36 KiB 的 `write()`（GB/s 带宽下是微秒级），却仍要为同样的 durable-before-effect 屏障付同样的 ~6 ms 刷盘。**写放大不是瓶颈，刷盘才是；WAL 不减少屏障数，故不省刷盘。** 无延迟收益。
2. **信封本就很小**（峰值 34.76 KiB，1 MiB 文本大案也才 ~1 MiB）。根本不存在「大 base 不敢重写」的问题——WAL 是为 GB 级可变状态设计的技术，单机单案单会话信封是 KiB–低 MiB。WAL 要解决的问题在此不存在。
3. **原子替换已提供崩溃原子性，恢复窗口 = 1 CAS**（§5：真实 SIGKILL 0/100 撕裂）。WAL 的核心价值（恢复撕裂/部分状态）已由 APFS rename 的全有全无语义交付。再手写 WAL = 叠加第二套耐久机制（自带 replay、checkpoint、损坏恢复、撕裂尾解析），去解决 rename 已解决的问题——净增复杂度（ADR-010 第 215 行「更不得手写 WAL」；就绪图明确拒绝项）。
4. **写次数有界且低**（6–28 次/场景，累计 84–504 KiB）。没有高频写流使「每次重写整份信封」在总量上变昂贵。

**结论：whole-envelope CAS（整份序列化 → 临时文件 → F_FULLFSYNC → 原子 rename → F_FULLFSYNC 目录）对 v1 足够且正确，未触及任何产品阈值。确认 ADR-010 决定二，非推翻。**

**何时才需重新评估（未来 ADR 触发条件，非本轮）**：单会话材料文本进入多 MiB 且写频显著上升（如把流式 delta 逐 token 持久——ADR-010 第 208 行已禁），或多写者/共享状态到来（ADR-010 第 219 行明列后续 ADR）。这些都不是 v1。Rust host 的大小上限使越界成为显式失败，即 ADR-010 第 217 行的触发闸。

## 8. 复杂度节制留痕（本工单新增概念）

本工单在**产品代码**中新增概念 = **0**：无新依赖、无新持久化格式、无新状态机、无新通用抽象。新增物全部是 dev/acceptance-only 的测量脚本，落在受信的 `packages/demo-runtime/scripts/`（demo-runtime 是仓库唯一「只由开发/验收消费」的装配根）：

- `measure-envelope.ts` 内的 `WorkStateEnvelopeV1` 是 ADR-010 已拍板形状的**本地镜像**，只在脚本内、不落 core（WORK-STORE-1 才拥有真本），不构成新契约。
- `cas-latency.c` 是测量工具（clang 直编），非产品依赖：无 benchmark 库、无 npm 包。
- `crash-inject.mjs` 用 Node 内置 + 真实 SIGKILL，无新依赖。

对 `packages/core/src/work/` 与 `scenario-executor/` 既有代码的偶然复杂度扫描结果 → 见 [`packages/core/SPEC.md`](../../../core/SPEC.md) 的 `WORK-STORE-MEASURE 复杂度扫描`提案区（本工单只列，不越权删）。

## 9. 复现

前置：`pnpm install` 完成、`pnpm -r build`（core 等已出 dist）、macOS + clang。

```bash
# 一键跑三项（默认 200 CAS 迭代 / 40 崩溃轮）
bash packages/demo-runtime/scripts/work-store-measure/run.sh
# 或分别跑：
pnpm --filter @courtwork/demo-runtime exec tsx scripts/work-store-measure/measure-envelope.ts
clang -O2 -o /tmp/cas-latency packages/demo-runtime/scripts/work-store-measure/cas-latency.c && /tmp/cas-latency /tmp/cas-tgt 200
node packages/demo-runtime/scripts/work-store-measure/crash-inject.mjs 40
```

- 度量一字节数**确定性可复现**（UUID/ISO 时间戳定长，注入 fixed `now`）：峰值恒 35,598 B、终值恒 26,410 B。
- 度量二/三的延迟与撕裂率随机器负载有方差；**稳定判据**是：F_FULLFSYNC p50 ~6 ms 且尺寸无关；原子替换撕裂 **恒为 0**、直接覆写撕裂 **恒 > 0**。
