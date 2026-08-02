# PI-HOST-LOOP-1R4 · 扫描轴对齐族谓词与回执真源在树

状态：**待 Fable 实现（第四轮返修）**

角色与纪律同原票与 1R/1R2/1R3：Fable 实现、Sonnet 只读跑腿、完成后交全新 Codex 会话独立
验收。四件的全部合同、白名单、九门、既有闭口与禁止面**原样有效**；本件只新增闭口，不回退
任何既有门。

拒绝证据：`PI-HOST-LOOP-1R3@51369e4`（实现 tip `51c823f`）经独立复验 `a0644cd`
**REJECT**（报告见其 `packages/pi-lane/ACCEPTANCE.md`「PI-HOST-LOOP-1R3 独立复验
（2026-08-02，拒绝）」节）。D2 三类同步漂移已闭合通过；D3 前向债与八项偏离获追认；
决定性 blocker 恰一枚，落在 **D1 覆盖自证装置自身的盲区**。

## 零、盲区成因（架构自陈）

1R3 的 D1 是双道自证：手写清单＋源码扫描双向锁。但扫描轴选的是**语法标记**（`MAX_*`
常量消费），而族定义是**受验输入**。SafeToken 是函数型判据、无 `MAX_REQUEST_ID_*` 可扫，
于是 prompt header 的 `requestId`（ADR-022 六-B.1 SafeToken 七成员之一）同时躲过两道：
清单手写漏行、扫描轴上不可见。复验实测：production 门本身正确（`pi_loop.rs:678`
`is_safe_token(request_id)` 在 `user_prompted`/send 前以 `invalid_ref` 拒），但撤掉该门后
清单、MAX ledger、既有 prompt 常驻**全部假绿**——「今天恰有一道门」不等于「族被自证覆盖」。

**判据订正：扫描谓词必须从族定义出发，与族同宽；语法标记只是实现便利，不得反过来定义族。**

## 一、基线配方

从本冻结件所在 `main` tip 新建 clean worktree/branch `codex/pi-host-loop-1r4`，顺取
`4c4aeba→9fa714a→079ba85→d7f0662→0d4799c→314117d→6f3a337→fa9e2f8→427f4fa→
b4175ea→1ab9c03→23f8339→51c823f→51369e4→a0644cd` 十五枚；逐枚 patch-id 与源提交相同，
冲突即停回架构。四枚拒绝报告随链入树后 `ACCEPTANCE.md` 只读零触碰。

## 二、两项闭口

### E1 · SafeToken 族全员入册，扫描轴对齐族谓词（Rust）

1. **`requestId` 入清单**：`bounded_input_manifest()` 增行——输入 `prompt.requestId`、
   判据 `is_safe_token`、拒绝 code `invalid_ref`（既有 code，不新增）；双轴常驻反例
   （超长与非法字符两形态）断言具名 `invalid_ref` ＋ 零副作用（journal bytes、内存
   records、writes 三不变），且先于 durable `user_prompted` 与发包。撤掉
   `prompt()` 的 production 门必红（清单行的源码锚点核对与反例双双报警）。
2. **扫描轴扩到函数型判据**：源码扫描除 `MAX_*` 常量外，同轴枚举 host 方向生产段的
   格式判据消费点（至少 `is_safe_token`、`is_absolute_path_shape` 与 trim 非空门），与
   清单双向核对——生产段出现清单外的受验门即红；清单行在生产段无对应消费点即红。
3. **SafeToken 七成员全员清账**：`containerId/grantId/sessionId/requestId/operationId/
   eventId/toolCallId` 逐枚入表——前四枚为 host 方向受验输入（前三 start、第四 prompt）；
   `operationId/eventId/toolCallId` 按实况登记（宿主生成／反方向校验），写明理由，
   不省行（承 D3 体例）。cancel 复用已验证 active request、shutdown 为 null 两条现状
   一并登记为「不适用另门」的理由行。

### E2 · 回执计数据实、真源必须在树（流程闭口）

1. 订正 1R3 回执两处计数：`bounded_input_manifest()` 实为 10 行/28 枚（本轮加 requestId
   后按实数重报）；ledger 实为 12 Fronted + 27 Other（扫描轴扩后按实数重报）。
2. **回执引用的每一件证据真源必须在 exact target 树内**：清账表的真源是 Rust 函数本身，
   回执引用函数名＋测试实跑输出；scratchpad 路径只可作过程留档补充，不得充当唯一真源
   （1R3 回执引 `12-d3-table1.md` 而该件不在 target，此形不得再现）。
3. 回执计数一律从实跑输出摘取（引用原始行），不得手抄转述。

## 三、first-red、mutation 与门

- **first-red**：在 untouched 链尖复现复验形态——撤 `prompt()` 的 `is_safe_token` 门后
  清单/ledger/常驻全绿（假绿实录），以及新扫描轴上 `requestId` 缺行即红。
- **mutation**：≥3 枚有效——撤 requestId production 门（清单锚点＋反例双红）；扫描轴
  回退为仅 `MAX_*`（requestId 行失去源码锚点即红）；清单删 requestId 行（扫描发现清单外
  受验门即红）。逐枚命中校验、定向红、byte-identical 恢复；等价如实登记。
- **门**：原票九门全量非受限域取数，逐门独立退出码；全部既有常驻保持绿；只收紧不回退；
  身份漂移（若有）按 1R Stage-2 仪式同批。

## 四、回执与停点

实现提交先于回执提交；本文件只追加回执。停在待独立验收：全新 Codex 会话从独立 clean
worktree 复验（自建 snapshot、撤门 mutation 自行实注、七成员清账逐行核）。未获 PASS 前
不 push、不 merge、不更新 `current.md`、不开 `PI-WRITE-HOST-1`、不启动 GUI/DMG/Pages。
