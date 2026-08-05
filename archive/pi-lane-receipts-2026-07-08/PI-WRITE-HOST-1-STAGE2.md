# PI-WRITE-HOST-1 · 开工序② 实现回执（2026-08-04，纯 Rust，待后续阶段接线）

票面：就绪图 `PI-WRITE-HOST-1` 行 ＋ 本包 SPEC 九 ＋ `PI-WRITE-HOST-1-RECON.md`／`-PREFLIGHT.md`。
基线 `claude/pi-write-host-1@b660d15`（前置 `3908333` 前置记录 ＋ `b660d15` 侦察落痕）。

本阶段范围恰按 PREFLIGHT §三 开工序②：**五枚前向债的前置门 ＋ 电池／D1 增行 ＋ effect 六型真值样本**。
`HostRequest` 臂、cap-std 落盘、Node 装配、prompt 换版全属③—⑤，本单一行不碰。
触碰面恰三文件：`apps/desktop/src-tauri/src/pi_loop.rs`、`pi_loop_journal.rs`，以及本回执。
**wire schema、记录形状、codec 判据语义零改动**（`pi_loop_protocol.rs` 在本单结束时与基线逐字节相同，
`f9b47ddc…` 全程未变——变异期改过，逐次还原后 SHA 复核）。

## 一 · 五枚前向债的口径与偿形

1R3 D1 表①登记原文：`read_host_result_payload`×3、`read_list_entry`、`read_logical_path` 的出站面共 5 行，
理由是「本票 ready capability 恰 `['case_read']`，宿主一枚 `host_result` 都不生成」。
按表①的 `(模块, 函数, MAX_*)` 去重粒度，五枚落实为：

| # | 受判输入 | 消费点 | 判据 |
|---|---|---|---|
| 1 | `host_result.error.message` | `read_host_result_payload` | `MAX_HOST_ERROR_MESSAGE_BYTES` |
| 2 | `host_result.value.content`（含同函数的 `byteLength` 交叉门） | `read_host_result_payload` | `MAX_TEXT_BYTES` |
| 3 | `host_result.value.entries` | `read_host_result_payload` | `MAX_LIST_ENTRIES` |
| 4 | `host_result.value.entries[].name` | `read_list_entry` | `MAX_SEGMENT_BYTES` ＋ `non_empty` |
| 5 | `host_result.value.logicalPath` | `read_logical_path` | `MAX_LOGICAL_PATH_BYTES` ＋ `non_empty` |

偿形循 1R6 裁定，**不补第二份手工前置门**：出站 `host_result` 与 prompt 同走 `encode_outbound_line`
（`encode_packet_line` 序列化后回灌同一份 decoder 自检），codec 是唯一校验真源，五枚 wire 判据因此
结构性排在 journal append、真实 effect 与发包之前。1R3 的「源码扫描双向自证」已依 1R6 H2 退役，
不再是偿债形态。本单补的是这条结构性担保的**行为反例**——判据在不在、拒得准不准、
拒的那一轮有没有副作用，逐行现场实测。

## 二 · 本单新增了什么概念、为何非加不可

**生产恰一枚**：`PiLoopHost::encode_host_result`（`pi_loop.rs:715`）——出站 `host_result` 的唯一编码入口。
与既有 `send` 分成两相，因为这条路上编码与发送之间**有**效果（`tool_proposed`/`effect_started` 的
durable append、真实落盘、三态收束都排在中间），`send` 的「编完立刻发」合成形在这里不成立。
签名只吃 `&self`：不落账、不发包、不推进 `outbound_seq`——出站方向的「Err ⇒ 副作用恰零」今日
是**结构性**的。拒绝映射逐字沿用 `send` 既有形（`PacketRejection.reason` 丢弃，只留闭集
`ProtocolErrorCode`），**不新增 `HostError` 变体、不新增 refusal mapper 函数**（复杂度节制：
`config_codec_refusal`/`prompt_codec_refusal` 两枚存在是因为它们要换具名 `HostError` 语义，
出站面不换）。

**测试面新增四枚概念**：`BoundedProbe::HostResult` ＋ `HostResultCase`（D1 第五探针形态，前四种全入站）；
`ViolationDrive::HostResult` ＋ `HostResultScale`（电池的效果域驱动，字符串轴与规模轴各一）。
非加不可的理由是同一条：前四种驱动全是**入站**方向，「Err ⇒ 副作用恰零」在出站面此前一枚样本都没有，
而这正是五债在 HOST-LOOP 全程为债的成因。

**净删一枚概念**：`pi_loop_journal.rs` 里 `logicalPath` 上界的第二份字面量（`1_024`×3）——换成
`MAX_LOGICAL_PATH_BYTES` 导入。两谱各抄一份上界就各自漂移；见 §四 M-P 成对对照。

## 三 · 落点

| 落点 | 内容 |
|---|---|
| `pi_loop.rs:715` | 生产：`encode_host_result`，出站 `host_result` 唯一编码入口 |
| `pi_loop.rs:3968` | `HostResultCase`：`cap: Some(n)` ⇒ `make(n)` 必编得出、`make(n+1)` 必被拒；`cap: None` ⇒ 纯负例 |
| `pi_loop.rs:3988` | `BoundedProbe::HostResult` 第五形态 |
| `pi_loop.rs:4240/4258/4276/4291/4304` | D1 清单五枚债行，逐行带行为反例（合计 7 枚：5 枚边界对 ＋ 2 枚空串） |
| `pi_loop.rs:4404` | `host_result_axis_probe`：**五轴**零副作用（journal bytes 逐字节／内存账本／出包数／`outbound_seq`／不回显） |
| `pi_loop.rs:4507` | 清单塌缩守卫：出站恰 5 行、清单 ≥16 行（入站 11 ＋ 出站 5） |
| `pi_loop.rs:4643/4645` | 电池效果域两枚驱动 |
| `pi_loop.rs:5371` | `universal_host_result_case`：电池侧同五轴 |
| `pi_loop.rs:5520/5580` | 全局下限抬高 ＋ 效果域塌缩守卫（恰 5 字段、≥60 行） |
| `pi_loop_journal.rs:40,912,989,1032` | `logicalPath` 上界换单一真源 |
| `pi_loop_journal.rs:3189` | `effect_family_truth_samples_cover_every_closed_value`：effect 六型逐值真值样本 |
| `pi_loop_journal.rs:3260` | `effect_family_path_and_length_bounds_come_from_the_wire_constants`：三型 journal 的路径／长度上界与 wire 同源 |

### 「拒得准」这一层单列

出站族的具名 `HostError.code()` 是粗粒度 `protocol`——`packet_too_large` 与 `invalid_schema` 同压成它。
只判 `code` 撑不住「红了≠红得准确」（在案判例，源 `PI-SIDECAR-DIST-1R2`）。两道补正：

1. 逐枚断言 `error == HostError::Protocol(ProtocolErrorCode::InvalidSchema)`；撞到 framing 上限即红。
2. 每枚带 cap 的行另跑 **cap 处正向对照**：同一枚构造器、同一条路径，只差 1 字节／1 条。
   没有它，「+1 被拒」与「这形状根本编不出来」在读数上同形。上界值只从 protocol 常量取，
   测试里不另抄数字（承 1R4「两谱各抄一次就各自漂移」）。

`entries` 那一行的条目名恒取 1 字节：2001 条约 120 KB，离 `MAX_PACKET_BYTES` 还远，
于是被判的确实是条目数上界。

## 四 · 红绿证

### 首红：五枚债行逐枚证明「缺门即红」（7 枚，全落 `pi_loop_protocol.rs` 生产段）

债的形态是「判据未被证明前置」，故首红取「把那道判据撤掉／放宽，该行必须当场红」。
逐枚带命中校验（`grep -c` 先核，计数不符即中止），跑完逐次还原并复核 SHA 恒为 `f9b47ddc…`。

| 编号 | 变异（`pi_loop_protocol.rs`） | 命中 | 实测红形 |
|---|---|---|---|
| BR-1a | `read_logical_path` 上界 → `usize::MAX` | 1 | `host_result.value.logicalPath/上界 ±1 字节 必须被拒` |
| BR-1b | `read_logical_path` 换 `read_string`（撤非空） | 1 | `host_result.value.logicalPath/空串 必须被拒` |
| BR-2a | `read_list_entry` 的 `MAX_SEGMENT_BYTES` → `usize::MAX` | 1 | `host_result.value.entries[].name/上界 ±1 字节 必须被拒` |
| BR-2b | `read_list_entry` 的 `name` 换 `read_string` | 1 | `host_result.value.entries[].name/空串 必须被拒` |
| BR-3 | `MAX_LIST_ENTRIES` → `usize::MAX` | 1 | `host_result.value.entries/上界 ±1 条 必须被拒` |
| BR-4 | `read_file` 分支的 `MAX_TEXT_BYTES` 两处 → `usize::MAX` | 2（行域内计数） | `host_result.value.content/上界 ±1 字节 必须被拒` |
| BR-5 | `MAX_HOST_ERROR_MESSAGE_BYTES` → `usize::MAX` | 1 | `host_result.error.message/上界 ±1 字节 必须被拒` |

BR-4 取两处是因为 `content` 与 `byteLength` 共用同一枚常量且互相交叉校验——只放宽 `content`
会被 `byteLength` 的上界顶名，读数仍是绿。变异粒度因此与表①的 `(函数, 常量)` 去重粒度一致，
不是「点名一处」。

**如实声明**：这七枚是「判据缺席即红」，**不是**「HEAD 存在生产缺陷」。五债在 1R6 改道之后
已由 `encode_outbound_line` 结构性覆盖，故本阶段不存在「先落账后拒绝」形态的可复现缺陷；
新增行的价值是把结构性担保变成可红的机器判据，不是修一个今天会犯的错。

### 成对对照 M-P：journal 侧 `logicalPath` 上界的两谱漂移（唯一变量＝字面量 vs 导入常量）

同树、同变异（`MAX_LOGICAL_PATH_BYTES: 1_024 → 1_023`，命中 1），只差 journal 侧那三处取值来源：

| 臂 | journal 侧取值 | 同一变异下 `effect_family_path_and_length_bounds_…` |
|---|---|---|
| 对照 | 字面量 `1_024`（HEAD 原样） | **红**：`tool_proposed：journal 收下了 wire 已拒的逻辑路径——两谱上界漂移` |
| 实验 | 导入 `MAX_LOGICAL_PATH_BYTES` | **绿**：wire 收紧一字节，journal 同步收紧，漂移结构性不存在 |

对照臂坐实漂移是真实可达的（不是假想），实验臂坐实它被消灭。承在案判例
「同步消灭优于同步验证」——修复之后该变异不再咬得动，是因为需要同步的账没了，不是因为判据松了。

### 生产 mutation（`pi_loop.rs`，逐枚命中校验＋还原复核 `ee0f90db…`）

| 编号 | 变异 | 命中 | 实测红形 |
|---|---|---|---|
| M-②A | `encode_host_result` 的 `self.outbound_seq` → `self.outbound_seq + 1` | 行定位（721 行，两处同名锚点只改出站那一处） | `编码只定 seq，不认领`，left 3 / right 2 |
| M-②B | 出站拒绝映射 → 恒 `Protocol(PacketTooLarge)` | 行定位（726 行） | `拒绝理由必须恰是闭集违规`，left `Protocol(PacketTooLarge)` / right `Protocol(InvalidSchema)` |

M-②A 锁的是「验过的那一份与发出去的那一份是同一份字节」——`OutboundLine.seq` 必须绑当刻的
`outbound_seq`，否则③ 拿去 `write_encoded` 时会与真实发包序错位。
M-②B 坐实 §三 那两道补正确有牙：只判粗粒度 `code` 时这一枚是绿的。

### 塌缩守卫 mutation（判据即枚举本身，删空与全绿同形）

| 编号 | 变异 | 实测红形 |
|---|---|---|
| M-②C1 | 电池效果域字符串轴 `.take(0)`（删 64 行） | `电池只剩 156 枚：枚举塌缩与全通过同形，一律硬失败` |
| M-②C2 | 规模轴 `field` 改成与字符串轴同名（行数不变、字段数 5→4） | `效果域必须恰覆盖五枚前向债字段`，left 4 / right 5 |
| M-②D | D1 清单删掉 `host_result.error.message` 一行 | `出站清单必须恰 5 行`，left 4 / right 5 |

M-②C1 恰好证明**全局下限必须随电池同步抬高**：156 枚在旧下限 100 上是全绿的。
M-②C2 与 M-②C1 分工不同——前者行数不变，只有族内字段数塌了，全局三道下限一枚都接不住，
由效果域专属守卫接住；两层各有独立红证，不互相顶名。

### 计数

- 电池：142（1R6）→ 152（1R7）→ **220 枚 / 20 字段 / 拒 126**；效果域独占 **68 行 / 5 字段 / 拒 12**。
  （出站族「放行」多是有意的：`a/b`、`a b`、`-ab` 等类对逻辑路径与正文本就合法，
  电池只判「被拒的那一轮零副作用」，不要求整族全拒。）
- 三道全局下限随之抬高：`100/10/100` → `200/18/115`。族内两道新守卫：`≥60 行`、`恰 5 字段`。
- D1 清单：11 行（入站）→ **16 行**，反例 34 枚 → **41 枚**。
- `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`：**176 passed / 0 failed / 1 ignored**
  （基线 174；净增两枚 journal effect 测试）。
- `cargo clippy --all-targets`：7 warnings，逐条归属 `src/lib.rs`（198/530/1552/1553/1559/1563/1565），
  **本单归属 0**（新写代码首轮引入的 `collapsible_match` 与 `type_complexity` 两枚已就地消除）。
- `rustfmt`：仅对 `pi_loop.rs`／`pi_loop_journal.rs` 执行，diff 逐条落在本单新增段内，
  零行外溢（全仓其余文件的既有 fmt 漂移原样保留，不在本单范围）。

## 五 · effect 六型真值样本（票面第三项）

十九型 round-trip 只担保「每型至少一枚样本走得通」。effect 六型此前每型只挑了一枚枚举值——
`EffectFailed` 的 13 枚 `HostFailureCode` 里只跑过 `symlink_forbidden`、`AuthorizationDecided`
的两枚 deny code 里只跑过 `user_denied`、三枚带 `WriteDisposition` 的型只跑过其中一半。
本票是这六型首次被真实生成，「值域被测过」与「值域从没被碰过」在读数上同形，故按闭集逐值补齐：
`WriteDisposition::ALL` × 三型、`AuthorizationDenyCode::ALL` ＋ approved、`HostFailureCode::ALL`、
`EffectUncertain`，共 23 枚样本，逐枚 round-trip ＋ canonical 重编码逐字节相等。
期望侧一律取闭集自己的 `ALL`——枚举日后加一枚 code 而不补样本，当场红。

## 六 · 偏离与待追认

1. **journal 侧三处 `1_024` 换成 `MAX_LOGICAL_PATH_BYTES`**（值零变化）。票面只说「五债的出站面」，
   journal 侧不是五债之一。理由：五债之一 `read_logical_path` 收口的那条逻辑路径，随后要原样落进
   `tool_proposed`/`effect_started`/`effect_succeeded` 三型 journal；两谱各抄一份上界就各自漂移，
   而 encode-before-effect 的担保恰恰依赖「journal 里那一枚已经被 wire 判过」。带 §四 M-P 成对对照。
2. **D1 清单新增两道塌缩守卫**（出站恰 5 行、清单 ≥16 行）。票面未点名；理由是在案判例
   「静默零＝空枚举与全通过同形，枚举为空一律硬失败」——本测试的判据就是清单本身，此前删行即静默失覆盖。
3. **电池三道全局下限抬高**（`100/10/100` → `200/18/115`）。不抬高即等于「删掉整个效果域仍旧全绿」
   （M-②C1 实证：156 枚在旧下限上是绿的）。
4. **出站族的具名 code 取粗粒度 `protocol`，不新增 `HostError` 变体**。精度由
   `Protocol(InvalidSchema)` 逐枚断言 ＋ cap 处正向对照承担（§三）。
5. **`encode_host_result` 今日无生产调用点**。模块既有 `#![allow(dead_code)]`（四枚 pi_loop 模块同惯例，
   本单未新增任何 allow）。开工序②先建门、③再接线是 PREFLIGHT §三 采纳的序，非遗漏。

## 七 · 禁区遵守

- 观察②：`fold()` 推进臂一字未动，仍由 `TurnUsageRecorded` 驱动；effect 落账未在本阶段发生，
  游标零触碰。
- `uncertain` 压扁为 `FileError('unknown')` 属有意设计——本单零触碰；`read_host_result_payload` 的
  「uncertain 只允许 workspace write」判据原样保留。
- capability 字面量零 `sed`：`EXPECTED_CAPABILITIES` 仍恰 `[CaseRead]`，33 处测试种子一处未改。
  未新增自由 `capability_mismatch` code。
- wire schema 零改：`pi_loop_protocol.rs` 结束态与基线逐字节相同（`f9b47ddc…`）。
- 未加 edit/diff/CAS/promotion/bash/GUI；未碰 Node 侧、`Cargo.toml`、`package.json`、lock。

## 八 · 移交③（开工前必读）

1. **唯一出站入口**：`HostRequest` 臂的四段落账必须以 `encode_host_result` 取得 `OutboundLine`，
   在 `tool_proposed`/`effect_started` 的 durable append、真实 effect 与三态收束**全部完成之后**
   才 `write_encoded(line)` 照搬同一份字节。
   **担保边界（如实声明）**：D1 出站探针判的是「这一枚编码函数拒得准、拒时零副作用」，
   对「③ 是否真的先编码后落账」**零区分力**——那一层必须由③自己的四段账序反例承担，
   不得引本单的绿当作已证。
2. **`packet_too_large` 是 list 面的真实可达形态**：`MAX_LIST_ENTRIES=2000` × `MAX_SEGMENT_BYTES=255`
   在最坏转义下约 3.2 MB，越 `MAX_PACKET_BYTES=1 MiB`。逐字段合法 ≠ 一定装得下。
   今日由 encoder framing 门显式拒（不是静默截断），属已知边界七的延伸；④ 的 list 实现须
   在 effect 前就知道这条，不能等发包时才发现。本单不改。
3. **[需架构拍板]**：journal 侧 `logicalPath` 用 `read_string`（**允许空串**），wire 侧
   `read_logical_path` 用 `read_non_empty_string`——非空判据两侧不同源。今日由 encode-before-effect
   结构性挡住（空路径的 `host_result` 编不出来，故也永远不会走到 append），但 journal codec
   单独看仍收空串。收紧属改既有 journal 解码语义（可能拒既有档），本单不自裁。
4. `encode_host_result` 不检 capability。ready 握手仍恰 `[CaseRead]`，`workspace_write` 的加入
   属⑤（`EXPECTED_CAPABILITIES` ＋ Node 侧 `PRODUCT_CAPABILITIES` 同批），③ 的假 effect 打通序
   不得顺手改握手闭集。
