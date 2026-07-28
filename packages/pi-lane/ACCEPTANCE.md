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
