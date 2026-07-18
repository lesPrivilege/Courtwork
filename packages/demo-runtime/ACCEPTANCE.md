# ACCEPTANCE: packages/demo-runtime

## AUDIT-SEAL-3 · Legal 绑定投影同步验收（2026-07-18）

- **✅ 放行**：`demo-assembly.ts::projectPartyRecord` 把富语料 `litigationSummary` 投影为 tools 中性 `relatedRecords[{reference,summary}]`；Legal 专属案号格式只存在于本受信绑定层，未泄漏回 tools。验收核实 `rg citationType===.statute. packages/legal apps/desktop` 全仓零命中生产代码——cite-check 当前确无生产 legal 消费面，SPEC 对此如实自陈，非夸大。`demo-assembly.test.ts` **2/2 passed**；`demo:legal`/`demo:s3` golden 在合并树亲跑均 PASS。零新依赖、状态、抽象或执行步骤。完整报告见 `packages/tools/ACCEPTANCE.md` 的 AUDIT-SEAL-3 报告。

## CORE-BOUNDARY-1 独立验收（2026-07-14）

**结论：放行。** 本包从原 core 机械承接 demo composition、acceptance runner、三条 CLI 与 golden，未改变 fixture、场景、事件、引用、确认、修订或 output 语义。

- 实现：`e42165d2c592c95a3dd00b36616f745f691d5f6b`；独立验收分支：`codex/accept-core-boundary-1`。
- 本包测试：8 files / 26 tests；S3 与 LEGAL scripted CLI golden 均通过。
- 六段组装 golden 与基线旧文件 SHA-256 同为 `0047e71264f6ddb6aa25cf5ceb10aca7b4a0bd7aee913b9630bb8cafb79bcd07`。
- 整包移出 workspace、清 core `dist` 后，core 仍可独立 build 且 22 files / 232 tests 通过。
- 最终全仓 build/lint 与 116 files / 1000 tests 全绿；无 UI 变化，未跑 Playwright。
- 环境无用户提供的真实卷宗路径，未冒充完成 `real:s3` 真材料验证。

完整差异、破坏性反例、compat 子路径、依赖图与 CLI 数字见 `packages/core/ACCEPTANCE.md` 的“CORE-BOUNDARY-1 独立验收”。

---

## WORK-STORE-MEASURE 独立验收（2026-07-15）

工单：`WORK-STORE-MEASURE-ACCEPT`

验收对象：`main@b993d8f`；测量基线 `303f2d2`。中间提交 `860c709` 仅为架构设计文档，不作为本单实现范围。

### 结论

**放行。** 独立复跑没有推翻「原子替换 0 撕裂」或「36 KiB–1 MiB 的 F_FULLFSYNC 延迟不随尺寸成比例增长」两项核心结论；无 `[需架构拍板]` 测量效度问题。v1 继续采用 ADR-010 的 whole-envelope CAS、原子替换与 F_FULLFSYNC，当前数据不支持引入 snapshot+tail 或手写 WAL。

实现级修复：无。`docs/status/current.md` 未更新；不推送。

### 范围与环境

- `git show b993d8f --stat` 实测恰 **7 文件 / 981 insertions**：core 与 demo-runtime 两份 SPEC、REPORT，以及三个测量源文件和一键脚本。
- `git diff 303f2d2..b993d8f -- packages/core/src packages/schemas package.json pnpm-lock.yaml docs/status/current.md` 为空；core 只改 `packages/core/SPEC.md`，没有 store 实现、schema 或依赖变化。
- 独立 detached clean worktree 执行 frozen install；实机环境与 REPORT 完全一致：MacBook Air `Mac14,2`、Apple M2 / 16 GB、Darwin 25.5.0 arm64、APFS Data 卷 `disk3s5`（内置 SSD / Apple Fabric）、Node v25.9.0、Apple clang 21.0.0。
- `packages/demo-runtime/tsconfig.json` 只 include `src/**/*.ts`；work-store-measure 脚本不进入 `pnpm -r build` 的编译产物链。提交文件全部是 UTF-8 文本源码/Markdown，无二进制或测量输出入库。

### 独立复跑数字

先执行 `pnpm install --frozen-lockfile`、`pnpm -r build`，再完整执行：

```bash
bash packages/demo-runtime/scripts/work-store-measure/run.sh
```

一键入口全程成功。实现报告与本验收实跑并列如下：

| 指标 | REPORT 实现数字 | 独立验收实跑 |
| --- | --- | --- |
| envelope 峰值 | 35,598 B / 34.76 KiB | **35,598 B / 34.76 KiB** |
| envelope 终值 | 26,410 B / 25.79 KiB | **26,410 B / 25.79 KiB** |
| write count | 6 / 14 / 28 CAS；84.40 / 220.95 / 503.53 KiB | **完全相同** |
| 36 KiB full p50 / p95 | 6.19 / 8.04 ms | **6.003 / 7.056 ms** |
| 1 MiB full p50 / p95 | 6.19 / 8.09 ms | **7.120 / 9.458 ms** |
| atomic SIGKILL 撕裂 | 0/100 | 一键轮 **0/40**；逐行审计轮 **0/40**；合计 **0/80** |
| direct SIGKILL 撕裂 | 20–33% | 一键轮 **4/40 (10%)**；逐行审计轮 **5/40 (12.5%)**；合计 **9/80 (11.25%)** |

字节确定性另将 `measure-envelope.ts` 连续独立执行两次：两跑均为 peak **35,598 B**、final **26,410 B**，逐字节相同。

尺寸无关性的判读成立但须按数据窄读：36 KiB → 1 MiB 大小增长约 28.4 倍，full p50 只增长约 1.19 倍、p95 约 1.34 倍，仍在同一 6–9.5 ms 刷盘量级，没有随字节数成比例增长；绝对值差异属于同机负载方差，不应解释成「每次必定精确 6.19 ms」。

crash 一键轮的 80 个子进程均由摘要确认 `exitSignal=SIGKILL`；为防摘要假绿，验收临时把日志采样从前 5 条扩为全量、再跑 40+40：全部 **80/80** 记录都有 pid、随机 delay 与 `sig=SIGKILL`，随后反向补丁还原，worktree 恢复只含本验收报告。direct 撕裂率低于 REPORT 的 20–33%，但两轮均显著非零，且出现 `unparseable(torn)` / `empty(truncated)`；核心对照仍是 atomic 在 80 次中恒 0、direct 在同机同 payload 下稳定大于 0。

### REPORT §6 / §7 诚实性复核

- **阈值建议有数据支撑。** 35.6 KiB 峰值、6–28 次写点、84–504 KiB 场景写量均由真实 scripted 链复现；本验收 full p95 最大 9.458 ms，支持每屏障约 10 ms 的预算。4 MiB 软告警落在报告已演算到 5 MiB 的材料曲线上；16 MiB 硬上限是 fail-closed 的保守操作上限，不是已实测性能拐点，后续不得误写成「16 MiB 延迟已验证」。
- **上线外推边界已标明。** 上界曲线明确使用真实 pause 结构，只替换 `pending.materials[].readingMarkdown` 总字节 M；REPORT 披露本地镜像、代表性元数据常量与近似线性假设，没有把合成卷宗写成真实客户卷宗。
- **无 WAL 推理链在 v1 范围成立。** durable-before-effect 的屏障数不会因 WAL 消失；本机数据表明 36 KiB–1 MiB 的 full 同步主要付固定介质刷盘往返，缩小 `write()` 不能省掉同一 F_FULLFSYNC；当前 whole envelope 低 KiB、写点有界，原子 rename 又在 80 次真 SIGKILL 中保持 0 撕裂。WAL 会额外引入 replay/checkpoint/尾损坏恢复而没有证据显示可收回对应复杂度。此结论只覆盖单机单写者 v1 与本机 APFS，不外推到多写者、其他文件系统、断电测试或高频流式持久。

### 复杂度审视 grep 复核

四项均与 core SPEC 提案区一致，且实现只列未删：

1. `ScenarioExecutorDeps.onTurnEvent` 排除 dist/SPEC/ACCEPTANCE 后仅命中 `executor.ts` 的可选字段定义与传给 turn runner 的内部使用；调用方传入为 **0**。
2. `ConfirmationStore.take()` 仍有接口声明和 memory/file 两处实现；生产 `resumeScenario` 无调用，生产消费为 **0**，仅保留 deprecated 兼容面。
3. `SessionEvent type:'error'` 生产源码只命中 `events/types.ts` 的 union 定义；生产者为 **0**。
4. `work/work-store-file.ts` 仍重复导出三枚 file adapter；根 `index.ts` 也导出同三面。`@courtwork/core/work-store-file` 子路径的唯一直接消费是 browser boundary 测试，因此当前是重复面兼 Node-only 边界标记，不是已删除死代码。

### 最终门禁与不泄漏

| 门禁 | 实测结果 |
| --- | --- |
| `pnpm install --frozen-lockfile` | 成功，lockfile 未变 |
| `pnpm -r build` | 13/14 workspace scope 全部成功；desktop Vite build 通过 |
| `run.sh` | 三项测量全程成功；临时目录由 trap 清理 |
| `pnpm lint` | 通过，零 error |
| `pnpm test` | **136 files / 1175 tests** 全绿 |
| 最终 `git status` | 除本验收报告外无源码、二进制或测量输出变化 |

最终裁决：`WORK-STORE-MEASURE` **放行，可作为 WORK-STORE-1 的测量前置证据**；WORK-STORE-1 仍须按 ADR-010 独立证明真实 Rust host 的 F_FULLFSYNC、CAS/并发与恢复语义。
