# PI-HOST-JOURNAL-1 · 实现回执（2026-08-04，待独立验收）

票面：就绪图「2026-08-04 审计双确认批」`PI-HOST-JOURNAL-1` 行。基线 `main@ac6ba06`，分支 `claude/pi-host-journal-1`，实现提交 `98467ec`，触碰面恰两文件（`pi_loop_journal.rs`／`pi_loop.rs`），wire、记录形状、codec 零改动。

## 三修复

1. **目录项落盘（①）**：`plan_session_locked` 在 `create_dir_all` 后子先父后 `sync_directory(container.parent())`、`sync_directory(root)`；`open_append` 后 `sync_directory(&container)`（journal 文件目录项）。比照 `work_state.rs` 既有先例（ADR-010 决定二）。掉电本身不可在进程内证明——在场性以 `cfg(test)` thread_local 计数器（生产零码）＋撤除 mutant 锁定，口径入本回执。
2. **写侧序号门＋quarantine 显式化（②）**：`pump` 在 append 前按读侧 `validate_records` 同一真源拒绝跳号 `turn_finished`——坏事件与其 usage 第二笔**零落盘**，失败经 `fail_protocol` 落显式 `session_failed`（pump 全部既有门的唯一惯用形，亦是不变量 4 的落点）；`plan_session_locked` 对「空 journal ＋ 非空 `quarantine/<sessionId>/`」显式拒绝（复用既有 `QuarantineRefused` 变体，错误闭集零移动），fresh 支不再静默把已计费历史归零。
3. **quarantine 内容寻址（③）**：四处调用点由 `&complete`（LF 截断前缀）改传 `&existing`（未截断原字节），文件名 SHA 与搬运内容互证，同前缀异尾两档不再撞名把 sessionId 卡死；`quarantine_session` 本体零改，实现自此与其 doc 自述 `<sha256-of-original-bytes>.jsonl` 一致。

## 本单新增了什么概念、为何非加不可

生产概念零：三处 fsync 是既有 `sync_directory` 在既有语义空位上的补位；写侧门是读侧既有判据的前置（同真源，非第二套规则）；显式拒绝复用既有错误变体。测试面新增一枚 `cfg(test)` 线程局部计数器——掉电级效果无进程内观测面，计数是「fsync 在场」唯一可红的锚，非加不可。

## 红绿证

五枚 born-red 于基线实跑五红（红因即缺陷叙事）：

| 测试 | 基线红形 |
|---|---|
| `fresh_session_plan_syncs_directory_entries` | 实测 0 次 sync（须 ≥3） |
| `counterexample_quarantine_digest_covers_untruncated_bytes` | 命名 SHA ≠ 未截断原字节 |
| `counterexample_same_prefix_different_tails_do_not_collide_in_quarantine` | 第二档 `QuarantineRefused("目标已存在")`——卡死形态原样复现 |
| `counterexample_fresh_start_after_quarantine_is_refused_not_silently_zeroed` | start 静默成功（预算归零面） |
| `counterexample_out_of_order_turn_is_refused_before_append` | `Journal("quarantined")`——审计全链叙事一枚测试内复现：写侧收、读侧隔离 |

mutant：三枚 fsync 逐一撤除各红（实测 2<3），perl 置换带命中校验、结束零残留复绿；②③与 quarantine 显式化的「撤除即红」由 born-red 基线运行直接构成（撤除＝回到基线）。

## 待复核子项裁定（cost_usd 无界 f64）

**显式登记为已知边界，不随本票修**：单值经 `read_nullable_non_negative_number(max=None)` 无上界；极值累加溢出成 `+inf` 时 `budget_from` 判 `Reached`——fail-closed 而非静默归零，且受 `max_turns ≤ 12` 每腿有界。加上界属 wire 判据面（`pi_loop_protocol` 解码门），越本票「不改 wire」边界；如需收紧，随 `PI-WRITE-HOST-1` 或另票。

## 票面措辞对齐（一则，随批钉准）

行文「append 前拒且 journal 字节零增」精读为「**坏事件与 usage 第二笔零落盘**」；失败本身经 `fail_protocol` 落一枚显式 `session_failed`（若连失败都不落账，即违静默降级零容忍）。就绪图行已同步改写为该口径（main 侧同日 docs 提交）。

## 边界遵守

R6 encode-before-effect 与 R7 恢复分相装置零回退——152 行普适电池、recovery characterization（`reclaim_after_fault` 立即 apply）、quarantine 全家族反例全绿；未接 GUI、未碰 write 面；`reclaim_after_fault` 语义零变化。

## 退出证据（实现会话自测，不代表验收）

cargo **172 过 / 0 败 / 1 忽略**（167 既有全绿 ＋ 5 新）；`build:product-sidecar` 先行（制品可复现）。全量门（build/lint/root/desktop/Playwright）数字见分支尾提交所附登记。验收提示：mutant 复现用 perl 置换须带命中校验；`fresh_session_plan_syncs_directory_entries` 的计数为线程局部，并行跑不互染。
