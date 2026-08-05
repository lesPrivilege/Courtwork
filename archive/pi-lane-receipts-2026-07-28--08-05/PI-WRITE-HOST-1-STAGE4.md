# PI-WRITE-HOST-1 · 开工序④ 实现回执（2026-08-04，纯 Rust，cap-std 真落盘＋屏障）

票面：就绪图 `PI-WRITE-HOST-1` 行 ＋ 本包 SPEC 九 ＋ `PI-WRITE-HOST-1-PREFLIGHT.md`／`-RECON.md`
＋ `-STAGE2.md` ＋ `-STAGE3.md` §七 移交五项。基线 `claude/pi-write-host-1@f9e6a1b`（开工序③）。

本阶段范围恰按 PREFLIGHT §三 开工序④：**cap-std `=4.0.2` 入依赖 ＋ `WorkspaceWriteHost` 真件
＋ `TempFile` 私有写入与 `replace` 就位 ＋ 平台持久化屏障 ＋ 反例门**。Node 装配五处与
`md-work-v1` prompt 属⑤；双端 golden 与矩阵属⑥；全量门属⑦；`/workspace` 回读属
`PI-WORKSPACE-READ-1`。本单一行不碰。

触碰面恰五处：`Cargo.toml`／`Cargo.lock`、`src/lib.rs`（一行 `mod`）、`src/pi_loop.rs`、
**新增** `src/pi_loop_workspace.rs`，以及本回执。
**`pi_loop_journal.rs` 与 `pi_loop_protocol.rs` 与基线逐字节相同**——`git show f9e6a1b:` 复核
SHA 分别恒为 `f7fe4c04…`／`cf3aa9aa…`，wire schema、journal codec 与 `fold()` 推进臂零触碰。

## 零 · `TempFile` 私有性实测记录（探针先行，PREFLIGHT 发现③ 明令「不得预先宣称」）

实测环境：macOS（`std::env::consts::OS == "macos"`）、aarch64、APFS、**进程 umask `0o022`**、
`cap-tempfile 4.0.2`。探针在写任何真件之前跑，两枚 `panic!` 直接把读数打出来。

| 观察项 | 实测值 |
|---|---|
| `TempFile::new` 权限 | **0o644**——对组与其他用户可读；PREFLIGHT 发现③ 的风险在本机真实成立 |
| `TempFile::new_anonymous` 权限 | `0o000` |
| `TempFile::new_anonymous` 返回类型 | **`cap_std::fs::File`**（不是 `TempFile`） |
| `new_anonymous` 之后目录项数 | **0**（macOS 无 `O_TMPFILE`，走「建后即 `unlink`」回退路径） |
| 不设权限时 `replace` 之后最终权限 | **0o644** |
| `new` ＋ `set_permissions(0o600)` ＋ `replace` 之后最终权限 | **0o600** |
| `replace` 之后目录内容 | 恰 `target.md`／`target2.md`，临时名消失 |

**取法结论（据实测钉死，非预先宣称）**：

1. **`new_anonymous` 结构性不可用于就位路径**。它在 macOS 上返回的是一枚**没有名字**的
   `File`，类型本身就没有 `replace`；Linux 的 `AT_LINKAT_REPLACE`/procfs `linkat` 补名手法在本平台
   不存在。因此私有性**只能**取「`TempFile::new` ＋ 显式 `set_permissions(0o600)`」。
2. 收紧必须排在**写入正文之前**：创建到收紧之间的窗口里文件恒为空。
3. 上游 doc 自称 `replace` 后 "The file permissions will default to read-only"——**在本平台不成立**
   （实测 0o644）。`impl_replace` 只做同目录 `rename`，一个权限位都不改。如实登记，不引用该句。
4. `replace` 是同目录 `rename` 直接就位，上游结构性满足 no-remove-then-rename；仍以反例门锁死
   防改写（§三 G-8）。

### 第二枚探针：归因不靠 errno（同批实测）

| 输入 | `open_dir_nofollow` 的 `ErrorKind` |
|---|---|
| 目标是 symlink | `NotADirectory` |
| 目标是普通文件 | **`NotADirectory`（与 symlink 同形）** |
| 目标不存在 | `NotFound` |
| `"../outside"` | `PermissionDenied`（cap-std 自家 root confinement） |
| `open_dir`（跟随版）对同一枚 symlink | **成功** |

「路径含链接」与「中间段不是目录」在 errno 上**不可分**。本模块因此一律：
**`open_dir_nofollow` 作门（fail-closed），`symlink_metadata` 只用来报理由**；理由查不实
（竞态里被换回普通目录）也绝不放行，一律 `io`。承在案判例「TCC 与 Seatbelt 拒绝 errno 同形
⇒ 归因不能靠 errno」。

## 一 · 本单新增了什么概念、为何非加不可

生产侧新增六枚，逐枚给「非加不可」：

| # | 概念 | 非加不可的理由 |
|---|---|---|
| 1 | `pi_loop_workspace` 模块 | 落盘件必须有一枚**精确的扫描面**：ambient 与 `std::fs` mutation 的 fail-closed 静态门要能说清「在哪一段里恰零出现」。摊进 7,200 行的 `pi_loop.rs` 就只剩「按函数名挑」，正是 1R4/1R5 判死的白名单形态 |
| 2 | `WorkspaceFsHost` | ③ 的注入座要真件。物理坐标（`app_data_dir`/container/session）只活在它内部，不回流进 plan、journal、`host_result` 或错误文案 |
| 3 | `WritePathPlan` ＋ `parse_write_path` | wire 的 `read_logical_path` 只判「非空 ＋ ≤1024 bytes」；ADR-022 六-B.2 grammar 的其余全部条款今天在 Rust 侧**一条都没有**。这是票面点名的「Rust 防御门」 |
| 4 | `WriteDecisionDriver`（住 `pi_loop.rs`） | production 的 `write_host` 从 `None` 换真件那一刻，`decide` 必须有答案。硬编码 `Approved` 是 ADR-022 六-C 明禁的「用 session always-allow 冒充产品授权」；缺席即 `policy_denied` 是唯一 fail-closed 的答案，⑤ 在此装真 driver |
| 5 | `DURABLE_FILESYSTEMS` 闭集 ＋ `filesystem_type` | `unsupported_filesystem` 是票面退出矩阵的一行。取**闭集**而非黑名单：未知类型一律不支持，且判在**任何物理 mutation 之前**（总纲不变量 4） |
| 6 | `before()`／`after()` 两枚结局标 | `replace` 之前失败 ⇒ `failed`（目标可证零变化），之时或之后 ⇒ `uncertain`。用 `bool` 裸传会让这条 ADR 结构性事实散落在七个 `map_err` 里 |

**刻意不新增的四样**（复杂度节制）：

- **不抄 SafeToken 判据**。container/session token 的合法性真源在 `start_inner`；真件再抄一份就是
  「两谱各抄一次就各自漂移」。跨容器边界改由 cap-std 自家 root confinement 承担，并以行为反例
  实证（§三 G-6：`containerId = ".."` 被 `PermissionDenied` 结构性拒）。
- **不新增 `HostError` 变体、不新增 refusal mapper**：真件的出口恰是既有 `HostFailureCode` 闭集。
- **不新增 journal 记录型、不动 codec**：屏障读数全部落在既有 effect 六型上。
- **不为 `probe` 造 `Result<Option<..>>` 三态**：缺目录直接读成 `Created`，不立第二枚「不确定」语义。

## 二 · 屏障次序（`WorkspaceFsHost::write_through_barriers`）

次序即语义，前一步不过就绝不走到后一步：

```text
1 内容 hash 重算（sha256 ＋ byteLength）   ── 不符即 hash_mismatch，零 mutation
2 capability 根：祖先 lstat 链 → ambient 取得 → dev/ino 回证 → 文件系统闭集
                                          ── 不支持即 unsupported_filesystem，零 mutation
3 session 根三段 pi-workspaces/<c>/<s>     ── 每段：建一段 → 父目录项 sync → open_dir_nofollow 重开
4 逻辑父段逐段                              ── 同上；create_dir_all 一次吞多段一律不用
5 末段复核（symlink / 目录 一律拒，永不跟随）
6 TempFile::new → set_permissions(0o600) → write_all → flush → sync_all   【屏障①】
    ── 6 及以前任一失败 ⇒ failed：replace 未被调用，目标可证零变化，temp 由 Drop 清尽
7 replace(basename)：同目录 rename 直接就位
    ── 失败 ⇒ uncertain（见下「保守支」）
8 父目录项 sync                                                          【屏障②】
    ── 失败 ⇒ uncertain：replace 已成功，屏障不可自证
9 EffectOutcome::Succeeded ── 臂随后落 effect_succeeded                  【屏障③】
10 三道全过之后才 write_encoded 发 host_result（③ 的 encode-before-effect 字节原样搬运）
```

`EffectOutcome::Succeeded` 的语义因此恰是 ③回执 §七.2 交代的那一条：**「④ 的全部屏障已过」，
不是「rename 返回了 0」**。

**macOS 的 full barrier 零 crate**：`File::sync_all` 在本平台即 `fcntl(F_FULLFSYNC)`
（在案先例 `WORK-HOST-1`）；目录项屏障用 `dir.try_clone().into_std_file().sync_all()`，
与 `pi_loop_journal::sync_directory` 同一手法、同一保证。

### `replace` 失败取保守支（如实声明）

ADR-022 六-C 只把 `effect_failed` 许给「replace **调用前**失败且可证明目标未变」。`rename` 返回
错误时目标**通常**未变，但 POSIX 对 `EIO` 明文留了口子，而本仓在案判例禁止按 errno 分叉。
故 **`replace` 的任何失败一律 `uncertain`**：既不声称回滚，也不复用授权重试。这条使
`failed` 的不变量变得干净——**`failed` 只可能发生在 `replace` 被调用之前**。

## 三 · 反例门清单（RECON 退出矩阵逐项）

| # | 票面矩阵行 | 门 | 落点 |
|---|---|---|---|
| G-1 | 非 `.md`（含 basename 恰 `.md`）、畸形逻辑路径 | `counterexample_write_path_grammar_refuses_every_closed_violation`（31 枚负例逐枚断言**恰是哪一枚 code** ＋ 7 枚正向对照） | workspace |
| G-2 | 畸形 request 到 Rust ⇒ 同 code 拒且零 effect | `counterexample_malformed_requests_are_refused_with_zero_effect`（5 形态；断言零 `tool_proposed`／零 `effect_started`／**workspace 物理根根本不存在**） | 臂 |
| G-3 | root **外** symlink 父段 | `counterexample_symlink_above_the_capability_root_is_refused` | workspace |
| G-4 | root **内** symlink 父段（指向 root 外） | `counterexample_symlinks_inside_the_root_are_never_followed` | workspace |
| G-5 | root **内** symlink 父段与末段（指向 root **内**、相对目标） | `counterexample_symlinks_within_the_root_are_still_never_followed` | workspace |
| G-6 | cross-container | `counterexample_containers_cannot_reach_each_other`（两 container ＋ 两 session 互不串写；`".."` token 被 cap-std root confinement 结构性拒） | workspace |
| G-7 | swap race | `counterexample_swapping_a_segment_mid_effect_cannot_redirect_the_bytes`（真替换）＋ `counterexample_segment_swapped_between_authorization_and_effect_refuses_with_zero_write`（臂上真窗口） | workspace ＋ 臂 |
| G-8 | remove-then-rename 零出现 | `replace_is_a_same_directory_rename_never_remove_then_rename`（inode 换新 ＋ 旧句柄仍见完整旧版）＋ 静态门 | workspace |
| G-9 | ambient／`create_dir_all`／canonicalize／`std::fs` mutation 零出现 | `ambient_and_mutation_surface_is_fail_closed` | workspace |
| G-10 | 并发 reader 只见 old/new | `concurrent_readers_only_ever_see_the_old_or_the_new_version` | workspace |
| G-11 | kill 窗覆盖 temp sync、replace、目录项屏障 | `counterexample_real_sigkills_never_leave_a_torn_workspace_file`（12 轮真 SIGKILL 子进程注入） | workspace |
| G-12 | 宽权限 temp 必红 | `counterexample_temp_permissions_are_narrowed_not_left_to_umask`（带**区分力自证**，见下） | workspace |
| G-13 | unsupported FS effect 前拒 | `unsupported_filesystem_is_a_closed_set_decided_before_any_mutation`（闭集表 ＋ 活体读数） | workspace |
| G-14 | `effect_started` 落不住 ⇒ 零 temp/replace | ③ 既有 `counterexample_any_durable_barrier_failure_leaves_the_effect_at_zero`（不回退） | 臂 |
| G-15 | replace 后屏障失败只落 uncertain | `barrier_failures_at_or_after_replace_settle_uncertain`（**replace 失败是真故障**：窗口里把目标名换成非空目录） | workspace |
| G-16 | denied/failed 必须能证明目标零变化 | `counterexample_failures_before_replace_leave_the_target_and_directory_untouched`（旧内容逐字节不变 ＋ temp 零残留） | workspace |
| G-17 | hash 必须 Rust 重算 | `counterexample_content_hash_is_recomputed_before_any_mutation` | workspace |
| G-18 | 逐次授权不得自动放行 | `counterexample_missing_decision_driver_denies_instead_of_approving` ＋ `real_write_host_without_a_decision_driver_denies_and_writes_nothing` | workspace ＋ 臂 |
| G-19 | `probe` 纯读 | `counterexample_probe_is_pure_read_and_creates_nothing` | workspace |
| G-20 | `created/overwritten` 走真 capability 查询 | `disposition_comes_from_a_real_capability_lookup` | workspace |
| G-21 | `ensure_runtime_cwd` 禁 cwd 落 workspace | `runtime_cwd_never_lands_inside_the_workspace_root` | workspace |
| G-22 | 端到端真落盘 ＋ 四段账 ＋ 物理根不泄漏 | `real_write_host_lands_bytes_and_settles_the_four_stage_ledger` | 臂 |

### G-12 的区分力自证（承「静默零一律硬失败」判例）

`replace` 是 rename，最终文件的权限就是 temp 的权限，故直接读最终件。这一枚同时量一份
「不收紧时上游会给什么」的对照（`0o666 & !umask`）：若本机 umask 恰好让二者相等，测试
**硬失败并说明原因**，不允许零区分力伪装成绿。**可复现前提：本机 umask `0o022`**（承
`PI-SIDECAR-DIST-1R2` 判例：可复现前提必须登记）。

### G-9 扫描器的 fail-closed 形态

三段判据，承 1R5「名字清单换材质仍是白名单，病根是 unknown ⇒ 跳过」：

1. **禁用构件恰零出现**（16 枚：`open_parent_dir`／`from_std_file`／`TempDir::new`／`tempdir(`／
   `create_ambient_dir_all`／`create_dir_all`／`canonicalize`／`remove_file`／`remove_dir`／
   `hard_link`／`read_link`／`OpenOptions`／`File::create`／`File::open`／`set_len`／
   `new_anonymous`）。种子照 PREFLIGHT §ambient 逃逸口穷举，含**无参静默口 `from_std_file`**。
2. **ambient 只许住在具名理由行上，且恰一处**。capability 必须从某处起头——`base()` 里
   那一行带 `AMBIENT-ROOT` 理由，前有祖先 lstat 链、后有 dev/ino 回证。
3. **`std::fs::` 逐处清账，未登记即红**。全模块生产段登记项恰一枚：只读 `symlink_metadata`。
   这不是「允许清单」，是「未登记一律判红」——M④16 实测有牙。

扫描面取「测试段之前」的非整行注释行（本模块 doc 大量引用这些构件名，逐字扫会全员误伤；
行尾注释仍留在扫描面内，方向保守），并带塌缩守卫（`> 150` 行）。

### 不可构造项（如实登记为记录性边界，不伪装成绿）

| 项 | 登记 |
|---|---|
| Windows junction / mount point / name-surrogate reparse point | 概念不在 macOS 存在。本模块对它们的处置与 symlink 同源（`open_dir_nofollow` 作门、末段一律不跟随），**实证须在 Windows 宿主上另做**。由 `platform_boundaries_are_registered_not_faked` 显式登记，移植到 Windows 时该测试当场红 |
| 「无 delete-share 占用保旧文件」 | delete-share 是 Windows 语义。POSIX 等价面已实测：旧版本被已打开句柄占着时 `rename` 照样成功，**旧句柄仍读到完整旧版**（G-8） |
| 真实 remote/removable FS 挂载 | 本会话环境不可构造。判据本身是闭集分类器（表驱动，9 枚未知类型逐枚断言不支持）＋ 一枚**活体读数**（本机 app-data 卷实测 `apfs`，不在闭集内即硬失败） |
| 真实 `fsync` 失败 | 本机不可构造。目录项屏障那一支由**唯一一枚**具名 `#[cfg(test)]` 标志驱动；`replace` 失败那一支是**真**故障，不是标志位 |
| power-loss durability | ADR-022 六-C 明文「atomic visibility、durable success 与 power-loss durability 是三个不同主张」。本单只证前两者：原子可见性由 12 轮真 SIGKILL ＋ 并发采样实证，durable success 由 `F_FULLFSYNC` 兑现。**断电实证不在本单，也不宣称** |

## 四 · 红绿证：生产 mutation（逐枚命中校验 ＋ 还原后 SHA 复核）

④ 的生产面在 ③ 并不存在（production `write_host` 恒 `None`、模块未建），故 born-red 的形态是
**「撤守卫即红」**，与 ②回执 §四 同一体例——**如实声明：这不是「HEAD 存在生产缺陷」**。

还原后复核 SHA 恒为 `pi_loop_workspace.rs` `09073b67…`（M④3 复跑之后的树）、
`pi_loop.rs` `0d098212…`。

**时效性补跑（承「门跑过之后又编辑就必须重跑」判例）**：整批变异跑在 clippy 修与 `rustfmt`
**之前**的树上。终树（`pi_loop_workspace.rs` `16cce7dd…`／`pi_loop.rs` `501cee03…`）另取三枚
跨面代表复跑，逐枚命中 1、逐枚仍红、还原 SHA 复原：M④2R（模块·权限）、M④3R（模块·no-follow）、
M④13R（臂·probe 失败）。

| 编号 | 变异 | 实测红形 |
|---|---|---|
| M④1 | `probe` 的 `session_root(false)` → `(true)`（探测顺手建目录） | `probe 不得建出 workspace 根` |
| M④2 | 删 `set_permissions(0o600)` | `上游 TempFile::new 默认 0o644——不显式收紧就会对外可读`，left 0o644 / right 0o600 |
| M④3 | `open_dir_nofollow` → `open_dir`（跟随） | **见下「两层遮蔽」** |
| M④4 | 末段 `symlink_metadata` → `metadata`（跟随） | in-root 轴红：末段链接被当成 overwritten |
| M④5 | 逐段下降 → `create_dir_all` 一次吞多段 ＋ 一次 `open_dir_nofollow(joined)` | in-root 轴红：中间段的 no-follow 判定被整个跳过 |
| M④6 | `replace` 失败改判 `failed` | `barrier_failures_at_or_after_replace_settle_uncertain` 红 |
| M④7 | 目录项屏障失败改判 `failed` | `assertion failed: matches!(..., EffectOutcome::Uncertain)` |
| M④8 | 撤内容 hash 重算（条件恒 `false`） | `hash 不符的一轮零 mutation` 红 |
| M④9 | `filesystem_is_durable` 恒真 | `未知文件系统一律判不支持` 红 |
| M④10 | 缺 driver 时改回 `Approved` | `counterexample_missing_decision_driver_denies_instead_of_approving` 红 |
| M④11 | 撤 capability 根**头顶**的祖先 lstat 链 | `counterexample_symlink_above_the_capability_root_is_refused` 红 |
| M④12 | 放宽 `.md` 判据 | 模块面：`非 md：拒绝理由必须恰是 UnsupportedFileType，实得 None` |
| M④12b | 同一变异，臂面靶 | `counterexample_malformed_requests_are_refused_with_zero_effect` 红 |
| M④13 | 臂第 1 步吞掉 `probe` 失败（`unwrap_or(Created)`） | 同上臂面测试红：畸形请求被照常提案 |
| M④14 | 臂第 4 步把 `probe` 失败压成 `state_changed` | `被换成链接的父段必须以 symlink_forbidden 现形` |
| M④15 | production 构造点退回 `write_host: None` | `real_write_host_without_a_decision_driver_denies_and_writes_nothing` 红（**须取不另装 driver 的那一枚靶**，见下） |
| M④16 | 生产段偷加一句 `std::fs::metadata("/tmp")` | `未登记的 std::fs 调用：[...]` |

**作废一枚（如实登记）**：M④17「把 `write_encoded` 前的注释删掉」是**等价变异**（只动注释，
零语义），实测绿，作废，不计入有效红证。

### M④3 的两层遮蔽（判例：mutation 遮蔽层级要逐层剥）

`open_dir_nofollow` → `open_dir` 这一枚**连续两轮假绿**，逐层剥开才咬得动：

| 轮次 | 反例形态 | 结果 | 遮蔽层 |
|---|---|---|---|
| 一 | 父段 symlink 指向 **root 外**目录 | **绿** | cap-std 自家 root confinement：跟随版 `open_dir` 同样被拒，判据零区分力 |
| 二 | 父段 symlink 指向 **root 内**目录，链接内容取**绝对**路径 | **绿** | cap-std 的解析器对绝对目标一律直接拒——仍然轮不到「跟不跟随」 |
| 三 | 父段 symlink 指向 root 内目录，链接内容取**相对**路径 | **红** | 至此「不跟随」才是本仓薄层自己在起作用 |

这正是 PREFLIGHT §symlink 边界那段措辞的行为证据：上游的保证是
**「链接解析不逃出 capability root」，不是「root 内链接一律不跟随」**。第三轮的反例
（`counterexample_symlinks_within_the_root_are_still_never_followed`）因此不可被前两轮顶名，
两族分工写进了测试 doc。

### 自伤登记（工程卫生）

变异还原按「替换串出现次数 == 1」校验，而 M④6 的替换串
（`.map_err(|_| before(HostFailureCode::Io))?;`）在文件里**本就有三处**，还原当场中止并
把 M④7 叠在了脏树上。修法：变异一律带**双向唯一的锚定上下文**（多行 ＋ 尾部哨兵注释），
apply 与 revert 两侧都唯一。已按锚定形重跑 M④6/M④7，SHA 复原。

## 五 · 计数

- `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml --lib`：**211 passed / 0 failed /
  1 ignored**（基线 185；净增 26 枚：`pi_loop_workspace::tests` 22 枚、`pi_loop::tests` 4 枚）。
  连跑两轮同数，非逐轮随机。
- `cargo clippy --offline --all-targets`：7 warnings，逐条归属 `src/lib.rs`
  （199/531/1553/1554/1560/1564/1566——与③ 同一集合，行号因 `mod pi_loop_workspace;` 整体 +1），
  **本单归属 0**（首轮引入的 `type_complexity` 与两枚 `assertions_on_constants` 已就地消除，
  **未新增任何 `allow`**）。
- `rustfmt`：只对 `pi_loop.rs`／`pi_loop_workspace.rs` 执行。
- diff：`pi_loop.rs` +354/−28、`lib.rs` +1/−0、`Cargo.toml` +14/−1、`Cargo.lock` +187/−5；
  新增 `pi_loop_workspace.rs` 1,646 行（生产段 262 行，测试段自 263 行起）。
- 依赖：新增 18 crate（`cap-std`/`cap-fs-ext`/`cap-tempfile`/`cap-primitives` 各 `4.0.2` ＋
  传递图），与 PREFLIGHT §一 登记的解树逐项一致，含已登记的 `io-lifetimes` 2.0.4／3.0.1 双版本共存。
  全程 `--offline`，零网络取件。

## 六 · 禁区遵守

- **观察②**：`pi_loop_journal.rs` 与基线 `f9e6a1b` **逐字节相同**（`f7fe4c04…`）；`fold()` 推进臂、
  游标、`turn_finished_follows` 零触碰。
- **`uncertain` 压扁**：`read_host_result_payload` 的「uncertain 只允许 workspace write」与 binder
  侧压成 `FileError('unknown')` 原样保留，本单零触碰。
- **wire schema 零改／journal codec 零改**：`pi_loop_protocol.rs` 与基线逐字节相同（`cf3aa9aa…`）。
  `logicalPath` 空串的 **[需架构拍板]** 原样上浮，未顺手收紧（见 §八.3）。
- **capability 字面量零 `sed`**：`EXPECTED_CAPABILITIES` 仍恰 `[CaseRead]`；diff 里 `CaseRead`
  的**删除行恰 0**；33 枚既有种子逐字节原样，新增的 4 枚是本单四枚新测试自己的 ready 握手。
  `workspace_write` 入握手闭集仍属⑤。
- **不加 edit/diff/CAS/promotion/bash/GUI**；未碰 Node 侧、`package.json`、prompt 常量、
  `EXPECTED_CAPABILITIES`。
- **不跑仓级 pnpm 门**（属⑦）；每次 `cargo` 之前 `pgrep -f "chrome-headless-shell|playwright"`
  复核，全程零命中。

## 七 · 偏离与待追认

1. **新增模块文件 `pi_loop_workspace.rs`**。票面未点名落点。理由：G-9 的 fail-closed 扫描需要一枚
   **精确的扫描面**；摊进 `pi_loop.rs` 只能退回按函数名挑，正是 1R4/1R5 判死的形态。生产段 262 行，
   与 ③ 的臂之间只有 trait 一条缝。
2. **`WriteDecisionDriver`（住 `pi_loop.rs`）与真件的 `decide` fail-closed**。票面只说「真件」。
   理由：production 装真件那一刻 `decide` 必须有答案，硬编码 `Approved` 违 ADR-022 六-C 明文。
   带 M④10 红证。真 driver 属⑤／验收票。
   **副作用（如实声明）**：③回执 §七.1 说「0.1 能力门是那之后唯一的产品闸」，本单实装后
   产品线上其实有**两道**（0.1 能力门 ＋ 真件的 `policy_denied`）。⑤ 加 `workspace_write` 时
   两道都须逐一复核仍在。
3. **`probe` 纯读、不建 workspace 根**。票面与 RECON 未逐字点名，但 ADR-022 六-C 明文
   「`effect_started` 是第一次 temp create/write/replace **或其他物理 mutation** 前的最后一道门」
   ——建目录就是物理 mutation。带 M④1 红证。
4. **内容 hash 由 Rust 重算并以 `hash_mismatch` 拒**。票面未点名，ADR-022 六-B.2 明文「Rust 必须重算」。
   带 M④8 红证。
5. **`replace` 失败取保守支 `uncertain`**（§二）。ADR 原文只覆盖「调用前失败」，本单把「调用失败」
   归到保守侧，理由是禁止 errno 分叉。带 M④6 红证。
6. **`unsupported_filesystem` 以 `fstatfs` 判定，`Cargo.toml` 的 libc 注释随之修订**（PREFLIGHT
   裁定「修订而非默默扩面」）。新增用途只有一枚：已打开 dirfd 上的只读 `f_fstypename`。
   带 M④9 红证。
7. **0.4 门在④ 之后于产品线上结构性不可达**（构造点恒 `Some`）。保留为 fail-closed 兜底，并把
   `#[cfg(test)] install_write_host` 的签名放宽为 `Option<..>`，让「真件座缺席」那一格显式置 `None`
   ——反例因此不因真件到位而悄悄失去覆盖。
8. **臂上两处改动**（③回执 §七.1 授权的「签名放宽」范围内）：第 1 步 `probe` 的 `Err` 走
   `settle_failed`；第 4 步的 `Err` **原样带 code**（不压成 `state_changed`）。带 M④13／M④14 红证。
   **`probe` 失败的账本形态如实声明**：从未成为提案的请求账上只有一枚 `effect_failed`，
   **没有** `tool_proposed`——`tool_proposed` 需要一枚 `action`，而畸形请求根本产不出。
   ADR-022 六-B.2 对这一路的要求恰是「以同 code 拒绝且零 effect」，本单逐值兑现。
9. **`FORBIDDEN_CONSTRUCTS` 含 `create_dir_all`，而 `descend`/`session_root` 的正例本就不用它**
   ——静态门与行为反例（M④5）两层各有独立红证，不互相顶名。
10. **grammar 的两处如实登记，未擅自收紧**：`...md`／`..md` 是合法 segment（ADR 闭集只禁 `.`/`..`
    两枚整段，且 `.md` 前有字符），`x .md`（段中空格）合法（只禁**结尾**空格）。均写进正向对照。

## 八 · 移交⑤（开工前必读）

1. **`workspace_write` 入握手闭集是⑤ 的活**。`EXPECTED_CAPABILITIES` 本单一字未动；加它的同批
   必须逐一复核 §七.2 的**两道**产品闸仍在，并装上真 decision driver（GUI 或 headless 验收），
   否则真件恒 `policy_denied`。
2. **`proposalHash` 的重算本单未做，如实登记为⑤ 的债**。ADR-022 六-B.2 给了 `frame()` 定义，
   但今天 wire 上的生产者还不存在（③ 的测试喂的是常量），没有可比对的真值。⑤ 接上 Node 侧
   proposal 计算时须同批补 Rust 重算与 `hash_mismatch` 反例；本单的内容 hash 重算已就位，
   两者是**两枚不同的 hash**，不得互相顶名。
3. **[需架构拍板]（②→③→④ 原样上浮，本单仍不自裁）**：journal 侧 `logicalPath` 用 `read_string`
   （允许空串），wire 侧 `read_logical_path` 用 `read_non_empty_string`——非空判据两侧不同源。
   ④ 之后这条的结构性挡法又厚了一层：真件的 `parse_write_path` 对空串直接 `invalid_path`，
   故空路径连 `probe` 都过不去。收紧 journal codec 仍属改既有解码语义，不自裁。
4. **物理坐标零泄漏已成机器判据**：`real_write_host_lands_bytes_and_settles_the_four_stage_ledger`
   断言 journal 文本里既没有正文、也没有 `pi-workspaces` 与 app-data 绝对路径。⑤ 接 Node 侧
   错误文案时须保持同一条线（错误 message 由 `HostFailureCode::message()` 单表产出，不拼路径）。
5. **`/workspace` 回读仍属 `PI-WORKSPACE-READ-1`**：本单的 `session_root`/`descend` 已是可复用的
   只读下降，读侧票直接沿用同两枚函数即可，不要另起一套解析。
6. **⑥ 的 crash/symlink/并发矩阵可直接消费本单装置**：`inject_window`（真故障窗口）、
   `workspace_crash_writer_child`（子进程 SIGKILL 编排）、`ambient_and_mutation_surface_is_fail_closed`
   （扫描器）三枚都是常驻件，不是一次性脚手架。
