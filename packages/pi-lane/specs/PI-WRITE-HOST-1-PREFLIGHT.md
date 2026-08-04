# PI-WRITE-HOST-1 · 开工前置记录（2026-08-04，尚未动生产码）

票面：就绪图 `PI-WRITE-HOST-1` 行 ＋ 本包 SPEC 九。基线 `main@4ab5671`（`PI-HOST-JOURNAL-1` 已清账，互斥解除）。本文件只登记两项开工前置的结论与一项待分析裁定，**不含任何实现**。

## 一 · cap-std / cap-fs-ext / cap-tempfile `=4.0.2` 开工复核（一手，2026-08-04）

依就绪图忧二引言的直接依赖复核律执行；核验机 `cargo 1.97.0`、host `aarch64-apple-darwin`。

- **版本**：三件 `4.0.2` 即上游 newest/max_stable、未 yank ⇒ 不触发升级裁定。**`4.0.1` 全家被 yank**，经 upstream compare 实证两版**零源码 delta**（仅 9 个 `Cargo.toml` 版本字符串）——属发布机制 yank，非安全 yank，不构成阻断。
- **许可**：macOS/aarch64 传递图 18 crate 实解，零白名单外。核心件 `Apache-2.0 WITH LLVM-exception OR Apache-2.0 OR MIT`（ADR-022 六-D 窄批在案）。GitHub 仓库页显示 `NOASSERTION` 系三元 SPDX 表达式不被识别所致，**不得据此下「许可不明」结论**。
- **安全**：`RUSTSEC-2024-0445`（Windows 设备名）fixed 3.4.1，4.0.2 不受影响；rustix 解析值 1.1.4 不受 CVE-2024-43806；rand advisory 双重不适用（版本已修＋仅 emscripten 依赖）。OSV 其余零命中。
- **编译/体积**：`cargo check --target aarch64-apple-darwin` 本机通过；四件源码合计约 166 KB；`io-lifetimes` 2.0.4 与 3.0.1 双版本共存（经 fs-set-times 引入）已登记。`cap-fs-ext`/`cap-tempfile` `#![forbid(unsafe_code)]`、`cap-primitives` `#![deny(unsafe_code)]`，**`cap-std` 本身无该属性**（登记）。
- **维护风险（登记，不阻断）**：上游自 2026-02-15 起零 commit（约 5.5 个月），单一发布者。对冲三条：exact pin、feature `fs_utf8`/`arf_strings` 保持关闭、以上游 `ambient-authority` 的 clippy 禁用清单作本仓静态门种子。

### symlink 边界（措辞按此钉死，不得改写）

上游自陈 **"cap-std is not a sandbox for untrusted Rust code"**——防的是恶意**路径名**，不防恶意 Rust 代码。保证是**「链接解析不逃出 capability root」，不是「root 内链接一律不跟随」**（ADR-022 六-D 既有措辞成立）。

三项一手发现，各须随实现落具名反例门：

1. **`open_dir_nofollow` 只管末段**（`cap-fs-ext-4.0.2/src/dir_ext.rs` doc：路径**命名**一个 symlink 时失败）——票面要求的「逐段 no-follow」由本仓薄层逐段下降自行编排，**属自研义务，不得宣称为上游保证**。
2. **macOS 后端是用户态逐组件解析器**（`cap-primitives` 在 `not(android|linux|freebsd)` 走 `manually::open`；Linux 有 `openat2`/`RESOLVE_BENEATH`、FreeBSD 有 `O_RESOLVE_BENEATH`，**macOS 无内核 beneath 原语**，`O_NOFOLLOW_ANY` 快路径 upstream 仍 open）⇒ **swap-race 反例门结构性必需**，竞态须由本仓持 fd ＋ 逐段重开收口，不得指望上游原子性。
3. **`TempFile::new` 权限同 `File::create_new`，Unix 下依 umask 可产出对所有用户可读的文件**——私有须取 `new_anonymous` 或显式 `set_permissions`，SPEC 须钉死取法；`impl_replace` 为同目录 `rename` 直接就位（上游结构性满足 no-remove-then-rename，仍以反例门锁死防改写）。**macOS 下 `new_anonymous` 实际行为本次未实测，开工须实证，不得预先宣称。**

### ambient 逃逸口穷举（静态门种子）

`Dir::open_ambient_dir`、`Dir::open_parent_dir`、**`Dir::from_std_file`（无 `AmbientAuthority` 参数的静默口，最易漏）**、`cap_tempfile::TempDir::new`、`cap_tempfile::tempdir(ambient_authority)`、`ambient_authority()` 系，以及全部 `std::fs` mutation。

**裁定：维持 exact `=4.0.2` 开工**；随实现修订 `apps/desktop/src-tauri/Cargo.toml` 既有「libc 只限 dirfd/no-follow/`*at`」依赖范围注释，不默默扩面。

## 二 · 待分析裁定：观察②（游标二元性）本票内不盲改

`PI-HOST-JOURNAL-1R` 复验移交观察②，建议随本票把读写两侧游标收敛为单一来源。侦察建议的最小形是把 `fold()` 的推进臂由 `TurnUsageRecorded` ＋ `max()` 改为 `AgentEvent(TurnFinished)` ＋ `turn_finished_follows`。

**本会话核 `fold()` 现形后暂缓，理由是一处侦察未标出的语义相交**：`fold` 今日只由 `TurnUsageRecorded` 驱动，而 R7 的 `plan_turn_usage_repair` 正是为「崩在 `turn_finished` 与其 usage 两笔之间」而设——改挂 `AgentEvent` 臂会使「已有 TurnFinished、usage 行尚未补写」的中间态被计入游标，与该修复路径的既有语义相交。**在这层相交被逐点核清（含 crash-fold 中途调用点）之前不动**，符合「确认根因前不改代码」。

规则同源（`turn_finished_follows` 共用）已由 1R 落地并经复验以恒真变异双侧同红证实；**残余的只是推进算子不同源**，属涌现性一致而非机器自证——本记录保留该风险登记，收敛形态与时机随分析结论另定，必要时以独立微单落地。

## 三 · 开工序（侦察建议，本记录采纳）

①本前置记录（本枚）→ ②五前向债前置门＋电池/D1 增行（纯 Rust）→ ③Rust `HostRequest` 臂四段落账状态机（假 effect 打通序）→ ④cap-std 真落盘＋TempFile replace＋屏障 → ⑤Node adapter 与五处装配改动＋prompt 换 `md-work-v1` → ⑥双端 golden 与 crash/symlink/并发矩阵 → ⑦全量门（`build:product-sidecar` 先于 cargo）。`/workspace` 回读属 `PI-WORKSPACE-READ-1`，本票不做。
