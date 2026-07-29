# PI-CODE-STDIO-1 · 实现回执

状态：实现完成，待独立验收。权威契约只认父级 [`SPEC.md`](../SPEC.md)「并行相邻票与合流门」、
[`ADR-022`](../../../docs/decisions/ADR-022-pi-lane.md) 六-B 与实现就绪图同名行；本文件是该
工单的独占实现回执，不得在这里改 wire、状态机、依赖或验收标准。

- **目标 SHA**：`00c8dbdbad466f0ab2edbf9083cda2998b659de7`
- **实现提交**：`79a13d2c6a141c83c37e3f420093b7eac9069e36`（分支 `codex/pi-code-stdio-1`，
  未 push、未合入 main）。改动面恰为四份新文件：`src/product-protocol.ts`（1531 行）、
  `src/product-stdio.ts`（652 行）与两份同名测试（1087 + 878 行）。二者未从 `index.ts` 导出
  ——`index.ts` 在票面范围外，消费点由 `PI-HOST-LOOP-1` 接。

## 先红证据

先落两份只有类型与常量、函数体一律 `throw new Error('not implemented')` 的桩，再写测试，
实跑取红：

```
npx vitest run --root . packages/pi-lane/src/product-protocol.test.ts packages/pi-lane/src/product-stdio.test.ts
→ Test Files 2 failed (2) ／ Tests 122 failed (122)
```

红因逐条为 `not implemented`，非模块解析失败。收工 123 例：其间把 negative zero 一例拆出
独立用例——`JSON.stringify(-0)` 写出的是 `0`，该反例只能走文本注入，这本身即「integer 门必须
看 lexeme、不能看 parse 后数值」的实证。

红绿之外另做变异对照，共二十枚注入，逐枚跑后以 `cp` 备份还原（不用 `git checkout`）：

| 注入 | 结果 |
|---|---|
| 重复 member 放行 | 3 红 |
| fatal 解码退化为替换解码 | 2 红 |
| decoder framing 门撤 | 2 红 |
| integer 两道门全撤 | 2 红 |
| race-late cancel 升级为协议崩溃 | 1 红 |
| 撤 `effect_uncertain` 优先级 | 2 红 |
| 撤 `budget_unknown` 优先级 | 1 红 |
| raw tool call id 直接上 wire | 2 红 |
| 累计器从零重开而非取 supplied prior | 2 红 |
| 任何 terminal 都回 idle | 2 红 |
| 本 leg requestId 去重撤 | 1 红 |
| inbound seq 门撤 | 2 红 |
| host_result 恰好一次撤 | 1 红 |
| observed turn 严格递增撤 | 1 红 |
| capability 闸门撤 | 2 红 |
| cancel 后仍允许新 delta | 3 红 |
| 在途 operation 未收束也放行 terminal | 1 红 |
| ready capabilities 不去重排序 | 39 红 |
| host_result capability/operation 复述不校验 | 1 红 |
| partial packet 在 EOF 放行 | 1 红 |

另有两枚**等价变异**，如实记下，不冒充红证：

1. 撤 integer lexeme 正则、保留 `String(value) === lexeme` 回环，全绿；反之亦全绿；两道同撤
   才红。二者对现有字段集覆盖面相同（全部整数字段下限均不小于 0，负号 lexeme 先被范围门
   截住）。正则留着是因为 ADR 明写 `0|[1-9][0-9]*`，字面写出才可审。
2. 撤 encoder 自己的编码后尺寸门，全绿——回灌 decoder 的 framing 门先一步命中同一 code。
   下节实测表明合法包根本够不到 1 MiB，故该门在合法路径上不可达，属纵深冗余。

首轮注入里另有两枚 `sed` 未命中（缩进不符、`|` 与分隔符冲突），当时表现为全绿；已改用命中
校验后重跑，结果即上表的「任何 terminal 都回 idle」2 红与「capability/operation 复述不校验」
1 红。变异期间两份源码均以 `diff -q` 核对已还原。

## strict codec / framing 实现

- **严格 JSON 扫描器**自研（下节说明为何非自研不可）。任一层重复 member 拒；number 保留
  原始 lexeme 供 integer 门判定；token 间空白只收 SP 与 TAB。深度上限 32，防 1 MiB 的
  `[[[[…` 打穿栈。
- **字节先于字符**：`line + LF > 1_048_576` 先拒，再依次查空行、结尾 CR（CRLF 残留）、
  UTF-8 BOM、行内 LF，然后才以 `TextDecoder('utf-8',{fatal:true,ignoreBOM:true})` 解码。
  `ignoreBOM:true` 是为让 BOM 留在字节里被显式拒掉，而不是被解码器静默剥离。
- **字符串门**：`isWireString` 拒 NUL 与 lone surrogate，对 key 与 value 同等适用。它与内核
  `String.prototype.isWellFormed()` 的逐样本 parity 有断言（本包 lib 目标 ES2023，不能直接引
  其类型，故自实现同义规则；NUL 一条是 wire 侧另加，测试中显式区分）。
- **integer lexical gate**：`0|[1-9][0-9]*`，再叠 `Number.isSafeInteger` 与
  `String(value) === lexeme` 回环及按字段范围。非负 number 另拒前导负号（含 `-0`）与非有限值
  （`1e400` 解析为 Infinity 即拒）。
- **encoder** 次序固定：`JSON.stringify` → 按**编码后实际字节**复核 framing → 回灌本 decoder
  自检 → 补单字节 LF。不另写第二份校验器；对端能否收下由同一份 decoder 当场作证。尺寸门置于
  自检之前，故超限包报 `packet_too_large` 而非 `invalid_schema`。

最坏包实测（`encodePacketLine` 返回的整行字节，含 LF）：

| 包 | 整行字节 |
|---|---|
| prompt，131072 bytes 全 U+0001（六字节转义） | 786,534 |
| prompt，131072 bytes 全双引号／全反斜杠 | 262,246 |
| prompt，131072 bytes 全四字节 emoji | 131,174 |
| host_request write，logicalPath 满 1024 + content 全 U+0001 | **787,837** |
| host_result 满额 list，2000 条 × 255 bytes name | 676,223 |

787,837 是本 wire 上合法包的上界：list 的 name 依 grammar 不含 `"`、`\` 与控制字符，无转义
膨胀；write 的 content 是唯一能触发六倍膨胀的字段，而 raw cap 131,072 定其上限。故 1 MiB
framing 对 v1 全部合法包留有二十六万字节余量，且不存在「cap 内却发不出去」的字符串。raw cap
超一字节即 `invalid_schema`，实测已锁。

## 状态机与 ID 防复用证据

- **双向 per-leg seq**：inbound 期望值从 1 起逐枚递增，跳号与重复同判 `seq_mismatch`；outbound
  每发一包加一，含 `protocol_error`。
- **pre-bootstrap 面**：首包非 bootstrap、bootstrap 前非法 JSON、bootstrap schema 失败与超
  framing，一律由 `seq:1 / sessionId:null / requestId:null` 的 fatal `protocol_error` **取代**
  ready，随后 `exit(1)`。
- **tc/op 分工**：tc 在 `tool_started` 首见 raw id 时铸 `tc_<leg>_<ordinal>`；op 只在真发
  `host_request` 时铸 `op_<leg>_<ordinal>`。`publishAgentEvent` 的入参只接受 raw id、没有
  `toolCallId` 字段，raw id 零出 wire 由类型而非纪律保证；另以全量写出字节扫 raw id 作交叉证。
  `tool_started` 后被本地判死、不发 host request 的路径，op 计数不动。
- **upstream 违约**：本 leg raw id 重复、start 前先见 progress 或 finished，均以
  `failed + upstream_event_unsupported + retryable:false` 终止。
- **host correlation**：`host_result` 须回活动 prompt 的 requestId、对应在途 operationId，且
  capability 与 operation 与待办完全相同，恰好一次。同一时刻只允许一个在途 host request。
- **cancel**：正常 cancel 转交 runtime；terminal 已先发出后才到的同一 request cancel 只消费
  seq、no-op，不发第二 terminal，session 留在 idle 且可续 prompt；重复 cancel 与更早或未知
  request 的 cancel 仍 fatal。
- **累计器**：`countedTurns`、`observedTurns`、`usd` 三项从 bootstrap 的 `resume.prior*` 起算，
  idle 续 prompt 不重置；observed turn 须跨 prompt 严格递增。费用未知把累计 `usd` 传染为
  `null`，不伪记为零。
- **bootstrap 自洽门**（单包即可判定者，落在 codec 内）：fresh 须 `leg:1` 且 prior 三项全零；
  after_interruption 须 `leg>=2` 且 `priorObservedTurns >= priorTurns`；`maxUsd` 非 null 而
  `priorUsd` 为 null 即拒；`priorTurns >= maxTurns` 或 `priorUsd >= maxUsd` 即拒。

跨 leg requestId 去重、`leg == previous + 1`、`prior*` 是否精确等于历史 fold，以及
model/limits/grant/container/capability 漂移，本票一律不测、不宣称。新进程没有 journal，这些
事实由 `PI-HOST-LOOP-1` 的 Rust 侧独占。

## fail-closed / canary 证据

- **canary**：bootstrap 携 `apiKey = sk-canary-DO-NOT-LEAK-0001`、
  `caseRoot = /Users/canary/绝密案卷根`，跑完 ready、delta、host_request、host_result 与一枚
  垃圾包之后，扫全部写出字节，三条子串（含路径末段）零命中；runtime 侧抛出的
  `ProductSidecarError` message 亦零命中。
- **不回显**：`protocol_error.message` 只由本文件的字面量与契约字段名拼成。未知 type 与契约外
  member 名一律不入 message——`closedRecord` 以「字段数相等且契约键全在」判定闭集，从不点名
  越界键。测试以一枚 type 为 `勒索字段` 的包作证：得 `unknown_type`，message 不含该串，且不超
  1024 bytes。message 另有按 code point 的截断，不切碎 surrogate 对。
- **sidecar 自身产物**过不了本 decoder 或装不下 framing 时，一个字节都不写，转 fatal
  `protocol_error`；若失败的正是 `protocol_error` 本身，则不递归，直接 `exit(1)`。
- **runtime 违约不进 wire，改抛**：无活动 prompt 时 publish、cancel 后再发 delta 或 host
  request、未宣告 capability 发 request、两个在途 host request、在途 operation 未收束就
  `finishPrompt`、observed turn 回退——六条各有红证。静默丢弃任一条都是降级。

### 归因表

ADR 未逐条指定 code，下表是本实现的映射，供验收核对：

| 起因 | code |
|---|---|
| 空行、结尾 CR、BOM、行内 LF、EOF 前 partial、非法 UTF-8、JSON 语法错、重复 member、超深度 | `invalid_json` |
| 行 + LF 超 1 MiB | `packet_too_large` |
| 顶层非 object、字段集不符、标量越界、NUL 或 lone surrogate、闭集外枚举值、payload 互洽失败、bootstrap 自洽失败、host 方向 `sessionId:null` | `invalid_schema` |
| `protocolVersion != 1` | `unsupported_version` |
| type 不在本方向闭集 | `unknown_type` |
| inbound seq 跳号或重复 | `seq_mismatch` |
| sessionId 与 bootstrap 建立者不符 | `session_mismatch` |
| host_result 的 requestId 非活动 prompt、operationId 无对应在途、capability 或 operation 复述不符、cancel 引用更早或未知 request | `request_mismatch` |
| 首包非 bootstrap、第二枚 bootstrap、prompting 中再 prompt、prompting 中 shutdown、无活动 prompt 收 host_result、重复 cancel | `state_violation` |
| 本 leg requestId 复用、同一 operationId 二次收束 | `duplicate_id` |

`sessionId:null` 归 `invalid_schema` 而非 `session_mismatch`：codec 不持 session 状态，无从谈
不匹配；真正的 token 错配由状态机判 `session_mismatch`，两处分工不重叠。

## 全仓门结果

均在实现 tip `79a13d2` 的工作树实跑，退出码单独取，不经管道（zsh 无 `PIPESTATUS`）：

| 门 | 结果 |
|---|---|
| `pnpm -r build` | EXIT=0 |
| `pnpm lint` | EXIT=0 |
| `pnpm test` | EXIT=0；162 文件／1520 例 |
| `vitest run packages/pi-lane` | EXIT=0；197 例（基线 74，本票 +123） |
| `node apps/desktop/scripts/assert-isolation-binding.mjs` | EXIT=0；pi lane 扫描面 18→22 份源码，`nodePrimitiveLedger` 仍为空册 |
| `node apps/desktop/scripts/assert-test-count.mjs` | EXIT=0；Playwright 351 条，下限 351 未动 |
| `node apps/desktop/scripts/assert-app-highwater.mjs` | EXIT=0；App.tsx 2549 行，上限未动 |

Playwright 本体未跑：本票 `apps/` 零改动、生产码零 `child_process` 与 fs 写、新文件未接入任何
产品面消费点。此判断出自改动面而非实跑；验收若不采信应自行复跑。

构建门抓到两处 vitest 看不见的类型错，已修。其一为测试里 `as const` 的 readonly 元组不可赋给
`WorkspaceCapability[]`。其二为 TS 不会因跨函数赋值失效对捕获 `let` 的收窄，`receive` 循环里的
`phase === 'closed'` 被判成不可能比较，改经 `isClosed()` 读取；该判定确有必要，变异「fatal 后
继续收包」有 3 红。vitest 走 esbuild 不做类型检查，本层的类型门只有 `pnpm -r build`。

## 新增概念及必要性

只新增两个，均由票面直接拉动。

**一 · 严格 JSON 扫描器**（自研，约 200 行，不出本文件）。内核 API 做不到 ADR 要求的两条，
Node v25.9.0 实测：

- `JSON.parse('{"a":1,"a":2}')` 得 `{a:2}`，重复 member 被静默取末值，无钩子可拦；
- reviver 的 source text access 对 primitive 可见（`{"n":1.0}` 拿得到 `"1.0"`），对 object
  不可见。

故 lexeme 一项内核尚可单独完成，重复 member 一项不能。既然重复 member 必须自扫一遍，lexeme
在同一趟里顺带取出，比两套解析更省。

**二 · 可注入 stdio session**（`transport`、`runtime`、`hashProposal` 三个注入口）。票面要
「可注入 driver」且禁造无产品 driver 的 executable main，前两个注入口由此而来。第三个注入口
是为不复制第二份 hash 实现：ADR 六-B.2 的 frame 拼接归 `PI-WRITE-PROOF-1` 的
`workspace-write-env`，本票只铸 operationId、校验 hash 的格式（小写 64 hex），把计算交出去。

未引入：新依赖、新持久化格式、新通用抽象、第二份 schema 校验器（encoder 复用 decoder）。

### 成熟开源复核（CLAUDE.md 四选一）

结论：**保留自研**。

现行 HEAD 的真实缺口只有「任一层重复 member 拒绝」与「number 原始 lexeme」两条。一手复核
（2026-07-28）：Fastify `secure-json-parse` 当前 package/license 是 **BSD-3-Clause**，不是 MIT；它
先剥 BOM 后交 `JSON.parse`，再筛 `__proto__`/`constructor`，因此既不保留 number lexeme，也不能满足
本票的 BOM/framing 与重复 member 门。`json-bigint@1.0.0` 的 `strict:true` 实际会在递归 object parser
的任意层拒绝 duplicate key，不能笼统写成「非严格」；但它把 number 立刻转为 JS number / BigNumber /
BigInt（并接受 fraction/exponent），丢失 canonical raw lexeme 且引入数值语义分叉，仍不能替代此 codec。
它仅为传递依赖，`package.json`/lock 的零改动只排除了**直接依赖**，不等于免除借行为或源码范式复核。
`jsonc-parser`（MIT，Microsoft）提供 offset/token scanner，但其 scanner 可识别 comment 与 line-break
trivia、number token 也接受 fraction/exponent；即使借其扫描，仍要保有 duplicate-key stack、LF-only byte
framing、fatal UTF-8、canonical integer 和全部跨字段 terminal/state validator，不能删除本票的窄边界。
故本票四选一仍为**保留自研、无新依赖**；后续若架构重开依赖，必须以相同反例证明能删除这些边界，而
不是只以 package/lock 零差异或换约 200 行 tokenizer 作结论。

## 待独立验收项

1. **`[需架构拍板]` packet 的 payload 嵌套形状。** ADR 六-B.1 把 `Header` 写成恰五字段的严格
   record，逐包表另列 `payload` 一栏，并为 `AgentProjectionEvent`、`WorkspaceHostRequest`、
   `Terminal` 给出独立类型，但未明写 payload 是嵌在 `payload` 成员之下还是平铺进顶层。本实现
   取嵌套：顶层恰六字段 `{protocolVersion,seq,sessionId,requestId,type,payload}`。理由是嵌套
   才能让「所有层级都是 `additionalProperties:false` 的严格 record」对 header 自身也成立，且与
   三个独立 payload 类型对齐。此选择决定 wire 字节，Rust 侧须与之一致；若架构判定平铺，改动
   限于 `decodePacketNode` 与测试 fixture。
2. **优先级矩阵的一处后果**，如实登记而非私自变通：ADR 定
   `effect_uncertain > budget_unknown > 已知 limit reached > cancel > 其他 outcome`，故一次真实
   `provider_error` 若恰逢 turn 限额达成，终态是 `budget_stopped` 而非 `failed`。本实现逐字照
   办，测试亦按此断言。
3. 上文两枚等价变异（integer 双门互为冗余、encoder 尺寸门在合法路径不可达）不构成红证。验收
   若要求每道门各有独立红证，须另设注入点。
4. `product-protocol.ts` 1531 行中约 350 行为类型声明、约 200 行为扫描器，其余为逐字段校验。
   体量随 wire 面而非抽象层增长；如认为超出复杂度预算，可议之处在 wire 面本身。
5. 本票未跑 Playwright 本体，理由见上；亦未跑真 key 链路——本票零网络、零 provider 调用。
6. 两份新文件尚无生产消费点（`index.ts` 在范围外）。`PI-HOST-LOOP-1` 接线前，它们只由自身
   测试驱动。
