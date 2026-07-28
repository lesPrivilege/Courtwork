# PI-LANE-1 独立验收（2026-07-27，放行）

对象：`codex/pi-lane-1@51c27b6`；基线：`01f4ac7`。验收由独立会话在 clean target tree
完成；`main` 与 `origin` 已同步，未把旧的基线分叉当作对照。范围为新
`@courtwork/pi-lane` 读面、ADR-018 R3 的 pi-lane 扫描扩面、开发 sidecar、pi 的精确版本与
评估件；未触 `App.tsx`、既有场景线或生产 GUI。

## 范围与七件行为

- diff 复核为 27 文件、2922 行新增/64 行删除；包只依赖精确版本
  `@earendil-works/pi-agent-core@0.82.1` 和 `@earendil-works/pi-ai@0.82.1`。源码 import 复扫零
  无 scope `pi-agent-core`/`pi-ai`；SPEC/ADR 文字中的无 scope 名只是「错误占位包」警示，非 import，未误报。
- 授权根路径对相对/绝对/`..`/同前缀兄弟目录/界外 symlink 与不存在路径逐项 fail-closed；只读容器的
  read/list/info/exists 亦逐入口复核界外拒绝，写/append/mkdir/remove/temp 与 exec 均不成立。
- 工具表恰为 `read`、`glob`、`grep`；read 走我方容器，glob/grep 不泄漏界外或 symlink 子树，非法正则显式报错。
- 闸门为默认拒绝：`edit`、`write`、`bash` 与任意编造工具均给可见拒绝；已注册越权工具也在 execute 前被拦，未注册
  工具的内核错误回灌可见而非静默吞掉。
- faux provider 的 loop 真跑覆盖 read 回灌、禁用 bash、编造工具与已注册越权工具；预算上限在回合边界 abort，
  未消费剩余脚本回应，理由对调用方可见。该证据不混同真 key 或「永不越限」宣称。
- DeepSeek `deepseek-v4-flash` 的 pi-ai 原生目录、openai-completions 路由、价目、缺 key 显式未就绪及
  usage 无公开 `rawUsage` 均核实；真 key 端到端仍按 SPEC 留作另行登记，未被伪称已跑。
- dev sidecar 的 localhost HTTP/SSE 真跑覆盖首页、状态面（不含凭据）、404、工具事件/预算收尾、缺 key 503、
  空提问与 bash 拒绝可见。上述七组由 `pnpm exec vitest run packages/pi-lane --reporter=verbose` 实跑为
  **8 files / 74 tests passed**；首次沙箱因禁止临时 localhost 监听使 sidecar 8 例统一超时，转隔离环境同代码复跑全绿。

## R3 真树注入与未决四题

R3 不采信实现自述，实际向 production tree 注入后再还原：

1. 在 `src/sidecar.ts` 注入 `node:child_process`，`lint:isolation-binding` 以
   `packages/pi-lane ... child_process` 精确变红；
2. 在 `src/scoped-env.ts` 注入 `writeFile`，同门以 `fs:writeFile` 精确变红；
3. 两次均用补丁还原，最终真树门绿（扫描 6 份 Rust、18 份 pi-lane 源码），工作树无 mutation 残留。

`docs/engineering/pi-lane-1.md` 与源码对照后的 ADR-022 四题结论如下：预算只能在 `turn_end` 事后
`abort()`，不是请求前硬封顶；`beforeToolCall` 被 await，时序可承载 future durable-before-effect，但本读面未实现
授权账本；`Agent` 与 `AgentHarness` 的当期分层令 journal 尚未落地，卷宗内 `loop/` 与随容器备份/删除仍是
`[需架构拍板]` 提案；当前仅 dev sidecar，未进入 `.app`，嵌 Node 的签名/公证/JIT entitlement 与分发体积
成本后经 2026-07-28 拆票为 `PI-SIDECAR-DIST-1`（开发分发路线）与
`PI-SIDECAR-RELEASE-1`（Developer ID/notarize 真值）实测；两票未完成前仍不能宣称已解决。

## 全量门与 Playwright

- `pnpm -r build`：14 workspace projects 通过；`pnpm lint`：exit 0；root `pnpm test`：**160 files / 1397 tests passed**。
- `pnpm --filter @courtwork/desktop test:e2e` 在独立端口 `19066`、`reuseExistingServer:false` 完整执行；原始日志
  `/private/tmp/pi-lane-51c27b6-e2e-19066.log` 的终局为 **350 passed / 1 failed（4.4m）**，最后一行为
  **`EXIT_CODE=1`**。唯一失败为记名豁免 `composer.spec.ts:45`（期待「已存入卷宗」，实际「随本条存入卷宗」），
  是含 `56bb556` 的各 tip 无条件既有红，修复在 `main` 但不在本验收树；不并入本票。
- flaky 观察项 `goal1.spec.ts:77`、`host-auth.spec.ts:41` 本轮均通过，零单发红，故不触发隔离复跑或两轮再现升级。

**最终判定：放行 `PI-LANE-1@51c27b6` ✅。** 放行只覆盖以我方容器约束的 pi read lane、开发入口及 R3
机器门；不放行写/bash、生产 GUI/sidecar 嵌入、journal/确认账本、真 key external validation、sidecar
签名公证，亦不等同场景线保障或隔离等级提升。

---

# PI-CODE-STDIO-1 独立验收（2026-07-28，拒绝）

目标实现 `223185e9b3197c4c07ab5a4b1e738504d3cd5a80`，验收树
`/private/tmp/courtwork-accept-pi-code-stdio-1`，分支 `codex/accept-pi-code-stdio-1`；先后精确
cherry-pick 架构澄清 `e87471f`、`19036b1`，未 merge `main`。实现相对 `00c8dbd` 的五文件范围成立；
架构三文档变更仅来自指定 cherry-pick。App/apps 零改，App 高水位仍为 2549/2549。

## 先红与验收修复

- 首次定向红为 **1**：`product-protocol.ts:1246` 的 terminal decoder 原只检查
  `stopReason` 是否存在/为空，接受 `budget_stopped` 无 known reached、`completed/canceled` 携
  known reached 或 `usdLimit:'unknown'`、以及错误的 `budget_unknown` 组合，违反 ADR-022 六-B.1
  308–315 行的 stateless 门。
- 新增 `validateTerminalBudget()`（`product-protocol.ts:1251–1290`）及
  `product-protocol.test.ts:1014–1075`；它仅拒绝单包可判的优先级矛盾，不猜 bootstrap 的实际阈值。
  修复后定向 `product-protocol` + `product-stdio` 为 **2 files / 124 tests passed**。

## 独立复核与门禁

- codec source：`product-protocol.ts:437–759` 的 fatal UTF-8、BOM/NUL/surrogate、SP/TAB-only、
  raw lexeme integer、任层 duplicate、depth、1 MiB/encoder 回灌；`1368–1438` 的六字段 nested
  packet；`1246–1347` 的 Terminal；stdio `product-stdio.ts:205–520` 的 framing/seq/state，
  `517–652` 的 tc/op/correlation/cancel，`235–310` 的优先级。
- 现有定向反例覆盖 nested/flat/extra、duplicate、UTF-8/partial/LF/CRLF/EOF/size、integer 两门、
  per-leg seq、request/op correlation、late cancel、prior 累计、tc/raw-id、uncertain 和 budget。
  明确不伪测 Rust/journal 的跨-leg requestId、previous+1 与 historical fold 事实。
- `node apps/desktop/scripts/assert-isolation-binding.mjs`: EXIT 0（6 host / 22 pi-lane files）。
- `pnpm -r build`: EXIT 0；`pnpm lint`: EXIT 0；`pnpm --filter @courtwork/desktop lint:app-highwater`: EXIT 0；
  `pnpm test`（脱离 loopback 限制复跑）: **162 files / 1521 tests passed**。
- `pnpm exec vitest run packages/pi-lane`: sandbox 首跑的 8 个 localhost sidecar 用例均 5 s timeout；
  同树、解除该环境限制后 EXIT 0，**10 files / 198 tests passed**，故首跑记环境失败而非产品失败。

## OSS 事实订正

一手读取 Fastify `secure-json-parse` 的当前 `package.json`、LICENSE、`index.js`：license 为
BSD-3-Clause（非 MIT），实现剥 BOM 后调用 `JSON.parse` 再处理 prototype key。工作区的
`json-bigint@1.0.0` 源码实核 `strict:true` 会在递归 object parser 任层拒 duplicate key，但数字
立即化为 number/BigNumber/BigInt，丢失 raw lexeme 并接受 fraction/exponent。Microsoft
`node-jsonc-parser` 的 scanner 明示 comments/line-break trivia 与 fraction/exponent token；它不能删除
duplicate-key stack、strict framing/fatal UTF-8、canonical integer 或跨字段 validator。专属回执已作
前进式事实修正，结论仍为「保留窄自研、无新依赖」。

## 追加源码复核：真实逻辑缺陷

在 `0ffae46` 的 clean tree 上，临时独立测试
`pnpm exec vitest run packages/pi-lane/src/acceptance-logic-defects.test.ts --reporter=verbose` 实跑为
**1 file / 6 failed**；文件已删除，以下均为实际 production 行为而非 mutation：

1. **Blocker — runtime failure canary 泄漏**：`product-stdio.ts:273–277` 把注入 runtime 的 failed
   message 仅按长度截断，`sk-secret-accept /private/case/file.md` 原样进入 terminal wire。
2. **Blocker — pending write 被 force terminal 丢弃**：`product-stdio.ts:296–321` 的
   `failUpstream()` 对仍有 pending host operation 调 `terminate(..., true)`；临时运行在 write request
   后注入未 started 的 tool_progress，实际发出 terminal，未等 host_result/uncertain 收束。
3. **Blocker — bootstrap re-entry 可 fatal 后复活**：`product-stdio.ts:347–363` 在
   `runtime.capabilities()` 返回前没有 reentrancy guard。该同步 hook 送入 seq 2 prompt，先得到
   fatal protocol_error，外层仍继续设为 idle 并发 ready。
4. **Major — host_result ok value 未 correlation**：`product-stdio.ts:403–427` 只比
   operationId/capability/operation。对 write `a.md` 的 pending op 回 `b.md`、不同 hash/byteLength 仍
   deliver 给 runtime；这违反 request/result 严格同构。
5. **Major — terminal retryable 语义未闭合**：`product-protocol.ts:1324–1338` 接受
   `failed + budget_unknown + retryable:true` 及 `failed + effect_uncertain + retryable:true`（两枚独立红）。
   两者都是不可重试的安全终态，却可被伪造成 retryable。

## Mutation 限制与结论

独立设计的临时 counterexample 文件实际运行为 **12/12 passed**，随后删除（故不改产品树）。逐项
输入 → 实测如下：flat/mixed header → `invalid_schema`；nested duplicate → `invalid_json`；lone
continuation byte 与 CRLF → `invalid_json`；合法 bootstrap 的无 LF EOF → sidecar
`protocol_error:invalid_json`；`seq:1e0` → `invalid_schema`；bootstrap 后 seq 跳至 3 →
`seq_mismatch`；terminal 后复用 requestId → `duplicate_id`；错误 operationId host_result →
`request_mismatch`；terminal 后同 request late cancel → 零新包/零 exit；resume supplied prior 3 →
snapshot `turns:3,usd:0`；completed+turn reached → `invalid_schema`；含 api-key/case-root canary 的
畸形行 → 输出零泄漏。这些是独立输入/状态反例，**不替代**要求的 production semantic mutation。

尝试对 production codec 作临时 patch（closed-record 放宽；随后仅过度拒绝的 root payload 缺失、
`expectedInboundSeq=2`）均被执行安全策略拒绝；按派单要求不绕过、不把它们计入红证。因此已取得
**0/至少 8** 个可计的 production mutation 红证，也无法满足要求的至少 12 类高风险 mutation 证据。
其余门虽全绿，仍不得放行。

**最终判定：REJECT（3 blockers + 2 majors 的真实逻辑缺陷；另有 mutation 证据缺口）**。最小 terminal
decoder 修复与 OSS 事实订正可保留；必须先由实现角色修复上述五项，再由新的独立验收会话复验；其后仍须补齐
production semantic mutation 证据，才可改为 PASS。

---

# PI-CODE-STDIO-1R 独立验收（2026-07-28，拒绝）

目标实现为 `codex/pi-code-stdio-1r@7c8c9c3`（实现锚 `9f9255b`，主线基线 `0e50b03`）；验收树
`/private/tmp/courtwork-accept-pi-code-stdio-1r`，分支 `codex/accept-pi-code-stdio-1r`。本会话与实现
会话独立。`9f9255b` 自身严格只改四份 stdio/protocol source/test，`7c8c9c3` 自身只改专属回执；组合
树中的旧 `ACCEPTANCE.md`、旧回执来自票面指定的历史证据顺取，不计为本返修实现越界。

## 复核范围、接缝与原有绿门

- 先读根治理、状态/就绪图、ADR-022 六-B、pi-lane SPEC/旧验收与 1R 回执；ADR 的 `upstream
  投影违约一律把累计 usd 传染为 null` 高于 SPEC 中较窄的文字，故实现把所有投影违约置为
  `usd:null` 的取法正确。`reserve` 也确应只接受已登记 public tc：上游 write binder 只查预登记
  tc，随后把同一 op/hash 原样交 port；stdio 不得自行二次铸造。
- 未修改 `workspace-write-env`。只读复核 `codex/pi-write-proof-1` 证实 binder 在 gate 后调用
  `allocateOperationId(publicToolCallId)`，据该 op 算 hash，再将同一八字段 request 交 port。因此
  stdio 必须同时守住 tc 的 toolName、当前 prompt 与阶段，不能只查 tc 字符串存在。
- clean target 原定向 protocol/stdio 绿 **10 files / 227 tests**；其后撤去所有临时反例，再跑一次
  同一门仍为 **10 / 227**。这只说明既有考卷未覆盖下述状态，不能抵消红证。
- clean target 全仓 `pnpm -r build`、`pnpm lint`、`pnpm test` 均 EXIT 0；最后一门为
  **162 files / 1550 tests**。`node apps/desktop/scripts/assert-isolation-binding.mjs` EXIT 0，扫描
  6 host / 22 pi-lane 源码。apps 未改，故 Playwright 不适用。

## 实际注入的九条生产反例

临时把九例加入 `product-stdio.test.ts`，在未改 production source 的目标树运行：
**10 files / 236 tests，其中 9 failed、227 passed**。随后用补丁逐块撤回；`git diff --quiet --
packages/pi-lane/src/product-stdio.test.ts` EXIT 0，故红证不留在产品树。九例均直接命中 production：

1. 已登记 `read` tc 可 reserve/send `workspace_write`，把只读工具升级为写 effect；反向的
   toolName/capability 绑定根本不存在。
2. write 的 host_result 已到而 upstream tool_finished 未到时，callback 能再 reserve/send 第二个
   operation；形成 `settledWrite(op1)+pending(op2)`。随后违约只会收束后者，前者的 finished 可丢。
3. 同一已登记 raw tc 的 `tool_progress`/`tool_finished` 可换成另一 toolName 并照样上 wire；tc→
   toolName 没有单向约束。
4. cast 塞入未来/未知 runtime event 会落入 `switch default`、读取不存在的 turn/usage 后逃逸为
   callback `ProductSidecarError`，而非 `upstream_event_unsupported` terminal。
5. write 仍 `operation_pending` 时，上游先发 tool_finished 会被直接投影；它没有等 host_result
   作为唯一 outcome 真源。
6. write 只有 started、尚无 operation 时，上游 finished:succeeded 被直接发出；ADR 的本地阶段
   分型要求此未知结束为 failed，再按 upstream 违约关闭。
7. write 已 settled 时 callback 直接 `finishPrompt(completed)`，`terminate()` 只检查 pending，清空
   settledWrite 后发 completed，零自合成 tool_finished。
8. finished 后的同 tc progress 仍可出 wire，registry 未实行 `started → … → tool_finished` 单向阶段。
9. prompt1 已结束的 tc 可在 prompt2 reserve/send；registry 未把 tc 限在当前 prompt 的有效期。

这些不是同一断言的九种表面写法：它们分别破坏 effect 最小权限、两个 latch 条件互斥、公开投影
稳定性、closed event union、host-result truth、write 阶段分型、effect 收束、单向 registry 与
request-scoped reservation。任何一项都足以使 Rust 后续 journal 看见不可信工具账；合并后再由
`PI-HOST-LOOP-1` 补救已太晚。

## 结论与架构裁定

**REJECT。** 此轮不适用 `fix-by-acceptance`：九条红证共同表明 core tc registry/state machine
缺少显式阶段记录与 request/tool/capability 绑定；把它们零散加 guard 会新造未定义的收束优先级，
不是“定位明确的小实现修复”。必须由实现角色以新的返修票先把 registry 状态表和以下不变量冻结并
测试：

- public tc 记录 `{requestId, toolName, phase}`；toolName→capability 固定映射，且 reserve 只收
  当前 prompt、未 finished 的 tc；
- `pending` 与 `settledWrite` 结构性互斥；settled 时任何 runtime finish/new reserve 都按上游
  违约走保存 outcome 的恰一 tool_finished，再按现有优先级 terminal；
- unknown event、name mismatch、progress/finished 倒序、pending 前 finished 均 fail-closed，且
  write 无 op 的 finished 按 ADR 本地阶段分型；
- 对上述每个转移做 production mutation/反例红证，并另会话从 clean worktree 重新验收。

USD「一律」与已登记 public tc 两项不需架构回退；callback Error 不回滚状态本身亦可成立，但不得
以它绕过 settled effect 收束。`PI-HOST-LOOP-1` 继续阻塞，不能把 `PI-CODE-STDIO-1R` 计为完成。
