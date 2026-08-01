# PI-HOST-LOOP-1R · 首轮验收拒绝的十一项闭口

状态：**待 Fable 实现（返修）**

角色与纪律同 `PI-HOST-LOOP-1.md`（下称原票）：Fable 实现、Sonnet 只读跑腿、完成后交
全新 Codex 会话独立验收。原票全部合同条款、文件白名单、九门与禁止面**原样有效**；本件只
新增闭口，不回退任何既有门，不改 wire/payload 闭集本身——十一项全部是把既有契约语义收紧
到实现里。

拒绝证据：`PI-HOST-LOOP-1@0d4799c` 经独立验收 `314117d` **REJECT**（报告见其
`packages/pi-lane/ACCEPTANCE.md`「PI-HOST-LOOP-1 独立验收（2026-08-01，拒绝）」节）。
Node 三枚与 Rust 八枚反例全部命中 production 方法；正向 Route A controls 通过不抵消。

## 一、基线配方

从本冻结件所在 `main` tip 新建 clean worktree/branch `codex/pi-host-loop-1r`，顺取
`4c4aeba→9fa714a→079ba85→d7f0662→0d4799c→314117d` 六枚；逐枚 patch-id 与源提交相同，
冲突即停回架构。`314117d`（拒绝报告）随链入树后 `ACCEPTANCE.md` 只读零触碰。

## 二、十一项闭口

**Node（原票 §二.1/2 语义内）**

- **N1 非法输入零回显**：`FileError` 与一切工具错误/安全提示的任何字段（含 `path`、
  message）不得包含不满足 `/case` grammar 的输入原文；非法输入一律以固定占位符
  `（非法路径）` 表示，合法输入只以归一化逻辑路径出现。canary：把真实 caseRoot 本身作
  read 参数，序列化整个错误对象零物理字节。
- **N2 provider 失败终态如实**：上游 `stopReason:'error'` 的 prompt 必以
  `failed{code:'provider_error'}`（retryable 按既有闭集）收场，`'aborted'` 走 canceled 路径；
  一切非 `'stop'|'toolUse'` 收尾不得产出 `{status:'completed'}`。
- **N3 政策拒绝的工具账如实**：case-env/policy 拒绝的 read/glob/grep，
  `tool_finished.outcome` 必为 `denied`，不得 `succeeded`；上游 error tool-result 到
  outcome 的翻译按此冻结。

**Rust（原票 §二.3/5/6/7 语义内）**

- **R1 preflight 全序冻结**：`start_inner` 次序恰为 route-pair 身份门 → case root →
  credential（Keychain read）→ durable `session_started|session_resumed` → cwd → spawn。
  counting-credential 探针下任何 route/root 失败 credential reads 恰 0；任何 preflight
  失败 journal 零字节、spawn 计数 0。
- **R2 start config 闭集前置**：`maxTurns≥1`、`maxUsd` 为正或 null 等 bootstrap/config
  非法值在 journal/spawn 前以具名错误拒绝；`maxTurns=0` 反例 spawn 计数恰 0。
- **R3 prompt 门前置**：trim 非空与 ≤131,072 bytes 校验先于 `user_prompted` append；
  非法 prompt 返回具名错误且盘上 journal bytes 逐字节不变。
- **R4 预算真值归 fold**：prompt terminal 的 `budget` 由 Rust 对本 request 已 durable
  `turn_usage_recorded` fold 得出；sidecar 自报 budget 只作 parity，逐值漂移按
  `session_failed{cause:{kind:'protocol',code:'state_violation'}}` 关 leg，不得采信或
  静默覆盖。
- **R5 wire fault 先 fold 再抛**：decode 失败、意外 EOF、超限与其他 fault 不得经 `?`
  直接逸出 `expect_packet`/driver；必须先按已 durable journal 执行 crash fold、按
  SIGTERM→SIGKILL→confirm 回收 child、落对应 durable 终态，才停止 outward publish 并
  返回错误。malformed `{` 反例：child `terminated=true` 且 session 有 durable terminal。
- **R6 shutdown 出口如实**：deadline 内 EOF + exit 0 才落 `session_completed`；
  nonzero/signal 按 `session_failed{runtime:'nonzero_exit'|'signal'}`，超时按
  `'lifecycle_timeout'` 族既有语义。child exit 7 反例必落 failed，不得 completed。
- **R7 resume fold 逐值**：`session_resumed` 的 `priorObservedTurns/priorTurns/priorUsd`
  逐值等于前序 journal fold（validator 不得只核 `previousLeg`）；篡改任一值
  `load_session`/start 必拒且零 spawn。
- **R8 单写者独占**：同一 logical session 的 journal 以 OS 级独占 advisory lock（flock
  同义，随 Host 持有至 teardown）保证单写者；第二 Host 对 live session 的 start/load 以
  具名 `session_active` 拒绝，零 journal 变化、零 spawn。锁实物路径不进模型/journal/error
  正文。`delete_container` 的 active 判定与该锁同源，不得双真源。

## 三、首红、mutation 与门

1. **首红＝验收反例原形转 permanent 测试**：十一枚按报告形态各写一枚常驻测试（Node 三枚
   入既有 `product-*.test.ts`；Rust 八枚入对应模块测试区），先在 untouched 组合树
   （`314117d` 链尖）上逐枚见红（Node 跑包内 vitest、Rust 逐测试名跑），留原始输出，再
   实现。禁 helper 缺失/stub/module-load 冒充红。
2. **mutation ≥6 枚**：分别撤 R1 次序、R3 前置、R4 fold 真值、R5 fold-before-throw、
   R7 逐值、R8 锁；逐枚验证命中、定向红、byte-identical 恢复；等价项如实登记不计红证。
3. **九门全量**（原票 §五 清单与形态不变，逐门独立 exit）。受限执行域的 localhost bind
   三红属环境事实，如实登记不计本票；门取数须在非受限域完成。
4. 回执追加在本文件尾部；实现提交先于回执提交；停在待独立验收；不 push、不 merge、不
   启动 `PI-WRITE-HOST-1`、不更新 `current.md`。

## 四、白名单

同原票 §三 全部文件（Node 产品四对＋tools＋fixture＋build 脚本＋package.json；Rust 四模块
＋lib.rs＋Cargo.toml 注释＋manifest＋tauri.conf；isolation 两件），另加本文件回执区。
`ACCEPTANCE.md`、原票合同区与其余一切只读。R8 若需锁文件落点，物理上只许住
`app_data_dir()/pi-loop/<containerId>/` 既有层级内（如 `<sessionId>.jsonl.lock`），不新增
顶层目录；命名在回执登记。
