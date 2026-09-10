# Claude 前端线收尾 · 交 Astra 合流（2026-09-11）

用户要求收尾后交 Astra 合流。本页只登记 Claude 这一侧的固定 SHA、状态和阻断，不自行合入 main、不推送，也不宣称独立接受。接收顺序和最终组合以[最新合推裁决](../2026-09-11-merge-node/README.md)和 [Summary / BE-41 派单](../2026-09-11-summary-be41-dispatch/README.md)为准，本页不另建队列。

核对时 main 为 `dedf005494e3f17a18ee261a81e367026d0a0f70`。2026-09-11 凌晨机器重启，`/private/tmp` 被清空，下列 Claude worktree 目录都已不在（git 显示为 prunable），但所有分支与提交都保留在共同仓库里。这些 prunable 记录没有逐个清理，留给 Astra 统一处理。

## 分支与状态

| 线 | 分支 · 头 | 关键提交 | 状态 |
|---|---|---|---|
| CS-01 外壳比例 | `claude/chat-shell-proportion` · `f6ba379` | 基线 `438bb9c`（main `1992e90` 合入 Summary `eff0e41`）；产品 `106330b`；证据 `bb0a501`；文档同步 `c616933`；引用 Q1–Q3 `f6ba379` | 已交付，作者验证。已由 Composer 会话并入组合 `claude/cs01-ci-bf-integration@68b3341`，单独不再合流 |
| CI-B/F × CS-01 组合 | `claude/cs01-ci-bf-integration` · `c073f54`（owner：Composer 会话） | `525aed0`、`bf508fe`、`65043fa`、`7b69327`、`1614318`、`776ee4e`、`3b4212b`、`420370c`、`68b3341`；WORK-3 合同与断言 `d2fdeed`；交接 `c073f54`（`evidence/cs01-ci-bf-integration/HANDOFF-astra.md`） | 下一产品节点的输入，状态 NOT_READY。WORK-3 已在 `d2fdeed` 改写：两行内容，按行数计不写像素，默认字号和大字号各查一遍；作者全量 712/712。仍待 SD-FIX 的 D1/D2 修补，再由非作者对固定最终树独验 |
| Summary `eff0e41` 非作者复核 | `claude/summary-disclosure-review` · `87a202f` | 复核 `2265649`；引用用户 Q1–Q3 裁定 `87a202f` | 结论为有条件通过：D1/D2 为 P2，D3/D4 为 P3；D5 已被 CS-01 的 640 公式取代；D6 是 `current.md` 冲突。该分支基于 `eff0e41`，**不要整分支合入 main**，只取 `evidence/summary-disclosure-20260910/independent-review/` |
| EX-IC2 A 全量清点 | `claude/ic2-chat-controls` · `f3895aa` | 清点 `cd3b056`；Composer 边界标注 `f3895aa` | 只含文档，可以干净合入 main。114 行；动态截图拍在 `1992e90` 上，早于 CS-01，已过时 |
| EX-IC2 B specimen / 裁决 | `claude/ic2-controls-b` · `8421fde` | 只有两个合并提交 | **未交付**。三次派发都在提交之前中断：一次机器重启，一次流式停滞，一次收尾时由我停止。C 分片未开写。不要合入这条分支 |
| TPS 参考与 specimen | `claude/tps-reference-specimen` · `62295b4` | EX-TPS1 `799f54a`；WO-TPS-01 `0d72a9b`；用户 D-1…D-7 `62295b4` | 只含设计文档与 specimen，可以干净合入 main。不接生产；40px 柱图仍只是候选 |

对 `dedf005` 做机械预检：TPS 与 EX-IC2 A 无冲突，也不涉及 `app/`；其余四条只在 `engineering/current.md` 冲突。

## 合流建议（由 Astra 裁定）

1. **可以随时接入的文档**：`claude/tps-reference-specimen@62295b4` 与 `claude/ic2-chat-controls@f3895aa`，两者都无冲突、不改产品。TPS 在 `mvp/execution/work-surface-kit/backend-requests.md` 末节登记了「每请求 decode 终值」这一通用 Harness 缺口，没有自取编号（BE-40 曾经撞号），**请 Astra 分配编号**；它同时作为 HPR-01 provider/streaming 行的输入，不抢在基本功能之前施工。
2. **产品节点**：沿 SD-FIX 执行。以 `c073f54` 为输入（`68b3341` 之后只多了 WORK-3 与交接），叠加 D1/D2 修补。WORK-3 已由 Composer 会话在 `d2fdeed` 改写，覆盖 `fe01/composition-checks.mjs`、`ui-composition-standard.md`、`primitive-canon.md:178` 和 `styles.css` 的 WK-97 注释；SD-FIX 消费即可，不必重做。同一 fixture 下，候选 13/16，main 12/16。HOME-1/2/5 两边都不过：fixture 默认是 Modules 版式，这三条是按旧的 Simple 版式写的，属于既有前提，不是回归。修补落在 Astra/Luna 自己的候选里，Claude 的源分支不改。Composer 会话在 `68b3341` 的 `evidence/cs01-ci-bf-integration/README.md` 里说过会合入 D1/D2 修补并重跑组合检查；这一步与 SD-FIX 的分工由 Astra 定，不要两边各做一次。
3. **复核证据**：`87a202f` 相比 `eff0e41` 只在 `independent-review/` 下有增量（按路径取），可以作为 SD-FIX 的输入与反例来源，其中 `repro-focus-return.mjs` 可在 Chromium 147 上复现 D1。
4. **EX-IC2 后续**：前端固定节点接收以后，从那个节点重新起 B：在新基线上重拍截图，出 specimen、`rulings.md` 和 `wo-ic2-c.md`；C 按 B 的清单施工。输入仍是 [范围与 PR 施工稿](../../design/chat-controls-2026-09-10/pr-plan.md) 加 A 清单。Composer、外壳比例和 Summary 模块不在 EX-IC2 的写权内。
5. **写权**：Claude 保留 composer/CS 与 EX-IC2 的前端写权，Astra 负责 Summary 缺陷、接缝与合流；同一文件串行写。

## 保留的边界（不因接收而关闭）

- 原生宿主安全区 `max(48, toolbar)` 只有合成事件验证，仓内没有原生宿主。不能用 Safari/WebKit 版本推断兼容性。
- Summary 的 Q1（生产环境未接卡片读取状态）和 Q3（跨客户端撤权同步）仍然开放；删除会话后返回 404 只证明删除这条路径，不能当作通用撤权。
- 真实 200% 缩放、forced-colors、触屏、IME、软键盘、VoiceOver 都没有完整验证。
- TPS 的测量来源仍是阻断：`host-tokenizer` 与 provider 时钟是两种测量，不能混为一种；遥测合同排在通用 Harness 缺口队列里。
- 所有交付都只是作者验证，或非作者复核（`2265649`）。712/712 等作者结果不转记为最终组合的 PASS。

## 本页验证

本页与分支预检只读取 git 对象，没有运行产品。`tools/check-doc-links.mjs` 通过。
