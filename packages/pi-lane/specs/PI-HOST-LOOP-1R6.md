# PI-HOST-LOOP-1R6 · encode-before-effect 与普适不变量

状态：**待 Fable 实现（第六轮返修）**

角色与纪律同原票与 1R…1R5。六件的全部合同、九门、既有闭口与禁止面原样有效；本件新增
结构性裁定一项、装置替换一项，并明确一处**受契约祝福的装置退役**（见 §二 H2——这不是
回退行为担保，是把担保从「文本同步验证」升级为「结构性成立」后拆除失效脚手架）。

拒绝证据：`PI-HOST-LOOP-1R5@a082257`（实现 tip `3f0bc6f`）经独立复验 `9d4013e`
**REJECT**。G1 四道 NUL 门、四类副作用边界、撤门阳性对照全部成立；唯一决定性：
`scan_refusal_branches()` 以 `body.find("return Err(")` 识别拒绝分支——字面 marker 即
隐式 allowlist，unknown 在进入种群之前已被当作不存在。验收把票面 M4 门改写为合法等价
`return Err::<(), HostError>(...)`，扫描/账本/行为反例/整套 pi-loop 全部 FALSE_GREEN。

## 零、结构性裁定（对三层同败的回答）

常量名（1R3）→函数名（1R4）→`return Err(` 字面量（1R5）三层同败，病根同一：**在富语言
里用文本模式枚举语义构造，合法拼写无穷，枚举器的种群谓词永远追不上**。第七个更聪明的
模式不会赢。裁定改道：

**裁定一 · encode-before-effect。** Host 在任何 journal append 与 spawn 之前，先把将要
发出的 exact wire packet **真实编码成 bytes**（bootstrap 于 `start_inner`、prompt 于
`prompt()`）；编码失败即以既有具名 code 拒绝（config 侧 `invalid_config`、prompt 侧沿
既有 code，携 codec 的通用文案、零值回显），成功后**同一份 bytes** 供后续发送（复用或
重编码后 byte-equality 断言）。效果：codec 是唯一校验真源，**每一条今日与未来的 wire
判据自动前置**——需要在「codec 规则」与「前置门」之间同步的账**结构性消失**，扫描器
失业。既有 G1 四道手写门保留在编码之前（它们给出带字段归属的更好文案）；caseRoot 的
shape/lstat 与 `delete_container` 的 SafeToken 等非 wire 判据维持显式前置门。

**裁定二 · 普适不变量替换文本扫描。** 新常驻探针以逐字段违规电池（自 protocol 常量与
判据族派生：NUL/超长/空串/纯空白/非法 token 字符/非法 shape/控制字符/分隔符等，电池
构成入回执）驱动完整 `start`/`prompt` 入口，断言**普适不变量**：`结果为 Err ⇒ 副作用
恰零`（spawn 零、journal 字节零增、内存 records 零增、writes 零、requestId 不占用）。
它不需要知道门在哪里——任何位置、任何拼写的门，只要拒绝了电池内输入而副作用已发生，
即红。验收的 turbofish 形态转为 permanent mutation。

**担保边界（如实声明）**：wire 判据的前置自此结构性成立（∀今日与未来 codec 规则）；
非 wire 判据靠显式门＋清单行为反例；未来若有人在 journal 之后**故意**新增非 wire 拒绝
门且其输入不在电池内，装置不宣称能证——这由违规电池的广度、两相结构的代码形状与独立
验收承担，不再假装文本扫描能证。

## 一、基线配方

从本冻结件所在 `main` tip 新建 clean worktree/branch `codex/pi-host-loop-1r6`，顺取
`4c4aeba→9fa714a→079ba85→d7f0662→0d4799c→314117d→6f3a337→fa9e2f8→427f4fa→
b4175ea→1ab9c03→23f8339→51c823f→51369e4→a0644cd→a204d13→d4163df→5271342→
be0d9ad→3f0bc6f→a082257→9d4013e` 二十二枚；逐枚 patch-id 与源提交相同，冲突即停回
架构。六轮拒绝报告随链入树后 `ACCEPTANCE.md` 只读零触碰。

## 二、三项闭口

### H1 · encode-before-effect（Rust production）

- `start_inner`：secret/root/既有前置门通过后、`session_started` append 与 spawn **之前**，
  用真实 StartConfig 编码 exact bootstrap packet；编码失败→`invalid_config`（携 codec
  通用文案，key/root 值零回显——canary 断言随附）；成功 bytes 存留，spawn 后发送时复用
  （或重编码＋byte-equality 断言，二选一并在回执写明取舍）。
- `prompt()`：requestId/text 既有门后、`user_prompted` append 与发包**之前**编码 exact
  prompt packet；失败→沿既有 prompt 侧 code，requestId 不占用；成功 bytes 同上复用。
- cancel/shutdown 同形（字段本已受验，代价极小，形状统一）。
- 不改 wire/payload 闭集、不改 codec 本身；`scan_string` 等继续原位（现在它天然在
  效果之前运行）。

### H2 · 装置替换（受契约祝福的退役＋新常驻）

- **退役**：`scan_refusal_branches` 轴 A（36 行表）、协议对照面轴 B（90 行表）与
  `bounded_judgment_ledger`（75 行同步账）整体删除——它们验证的同步已被裁定一结构性
  消灭；其死代码留存即双轨第二真源（复杂度节制条）。退役理由与本票坐标写入代码删除处
  的提交信息，不在源码留注释残骸。
- **保留**：D1 手写清单（11 行）与全部行为反例（34 枚）、G1 四道 NUL 门及其常驻、
  1R4 的 SafeToken 七成员清账、四轴 `prompt_axis_probe`——凡行为级证据全数保留。
- **新增**：裁定二的普适不变量探针（违规电池 ≥ 既有 34 枚反例的输入面并集＋每字段
  逐违规类，电池清单入回执）；电池由 protocol 常量派生处直接 import，不另抄值。

### H3 · first-red、mutation 与复扫

- **first-red**（untouched 尖 `9d4013e` 组合后）：① 复验 turbofish 门原形——旧装置四件
  全绿实录（逐值复现验收表）；② 同一 turbofish 门下跑新普适探针的雏形——红（Err 而
  journal 已增）；③ 临时撤一道 G1 手写门（如 modelId NUL）——旧装置下行为反例红在
  `Protocol(InvalidSchema)`（后置），装 encode-early 后同输入转为**前置具名拒绝且零副作
  用**（结构性担保的对照实证，绿形也入回执）。
- **mutation ≥5**：撤 encode-early（编码移回 journal 之后）→探针红；撤 G1 某门＋撤
  encode-early→探针红；turbofish 未登记后置门（permanent 形态）→探针红；发送路径改
  重编码且 bytes 不等→equality 断言红；编码失败映射丢具名 code→具名断言红。逐枚命中
  校验、定向红、byte-identical 恢复；等价如实登记。
- 装置替换后以违规电池对四模块 host 方向面复跑一遍（G3 同义复扫），结果入回执。

## 三、门与卫生

原票九门全量非受限域取数，逐门独立退出码；全部保留的常驻绿；「只收紧」按**行为担保**
衡量（wire 前置从枚举子集升为全称成立），装置退役按 H2 契约条款执行并在回执列明删除的
测试/函数名（此清单是本轮唯一允许的判据名删除，逐名对应 H2 退役条）。生产前缀 SHA 必变
如实报；sealed CJS 零漂移（Node 零触碰）。E2 卫生条款继续：计数摘实跑原始行、真源在
exact target 树内。

## 四、回执与停点

实现提交先于回执提交；本文件只追加回执。停在待独立验收：全新 Codex 会话从独立 clean
worktree 复验（自建 snapshot、turbofish 与电池反例自行实注、退役清单逐名核对 H2 授权）。
未获 PASS 前不 push、不 merge、不更新 `current.md`、不开 `PI-WRITE-HOST-1`。
