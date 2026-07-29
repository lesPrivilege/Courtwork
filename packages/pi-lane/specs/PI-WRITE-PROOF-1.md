# PI-WRITE-PROOF-1 · 实现回执

状态：待独立验收。权威契约只认父级 [`SPEC.md`](../SPEC.md)「PI-WRITE-PROOF-1」与
[`ADR-022`](../../../docs/decisions/ADR-022-pi-lane.md)；本文件是该工单的独占实现回执，
不得在这里改字段、语义、依赖或验收标准。

实现会话只更新下列回执，不改父级 SPEC：

- 目标 SHA：`00c8dbdbad466f0ab2edbf9083cda2998b659de7`（`docs(architecture): freeze thin pi harness and base GUI path`）。
  独立 worktree/branch `codex/pi-write-proof-1`；开工前核对 HEAD 与目标 SHA 相符、工作树 clean。

- 实现提交：`c0b7989`（生产源码与定向测试）。本回执另作一枚提交——回执要引实现 SHA，
  而一枚提交不能引用自身，故拆两枚；两枚各自在自身 tip 上通过所触门禁。

- 先红证据：测试先落地、生产模块缺席时整套 suite 加载即失败
  （`Cannot find module './workspace-write-env.js'`，`0 test`）。**这一形态只证「测试确实接在待建模块上」，
  不证任一断言有效**；断言效力由下文 mutation 逐条给红，不拿「先红过一次」冒充。

- 上游 characterization（`@earendil-works/pi-agent-core@0.82.1`，均有测；升版触红即回 ADR-022 决定五复核）：
  1. `createWriteTool()` 参数表面只有 `{path,content}`，但 TypeBox object **非闭集**——额外字段 `mode` 原样通过 validation。
  2. `Value.Convert` 真做 primitive→string coercion：`123→"123"`、`true→"true"`、**`null→"null"`**、`path:7→"7"`；
     空串通过；只有 array/object/缺字段才抛。故「参数看起来只有两项」不等于 strict schema。
  3. 两次 `createWriteTool()` 共用同一 `parameters` 对象；`validateToolArguments` 的 validator 缓存按 schema
     **对象身份**取，binder 换对象即换一份编译产物——同一性是契约，不是巧合。
  4. 上游自身不声明 `executionMode`；`Agent` 缺省 `toolExecution:'parallel'`（`agent.js:132`）。两把锁须分别显式。
  5. `resolveToolPath`（`path-utils.js`）会剥掉前导 `@`、把 `[\u00A0\u2000-\u200A\u202F\u205F\u3000]` 折成普通空格，
     即**静默改写真实目标**；对照测试在无 gate 时实测 `@a.md → a.md`。
  6. 成功文案 `Successfully wrote ${content.length} bytes`：`备忘😀` 报 4（UTF-16 code units），真 UTF-8 为 10。
  7. `withFileMutationQueue` 的串行队列挂在 **env 对象身份**（`WeakMap`）；`canonicalPath` 回 `not_supported`
     时队列键退回 absolutePath。
  8. abort 检查有两处，分别在 `env.writeFile` 之前与之后。后者使「上游抛 `Operation aborted`」与「effect 已发生」同时成立。
  9. `tool_execution_start` 早于 `prepareToolCall`（validate/`beforeToolCall`/execute），已在真 `Agent` 上实测——
     故 public tc 的首分配属未来 event projector，binder 只查表。
  10. `prepareArguments` 是**唯一**早于 coercion 的接缝（`prepareToolCallArguments` → `validateToolArguments`）；
      在此抛出即 immediate error 结果，`execute` 根本不进入。`beforeToolCall` 拿到的 `args` 已是 coerce 后的形状。

- 最小实现与文件清单：
  - 新增 `packages/pi-lane/src/workspace-write-env.ts`（生产）与 `packages/pi-lane/src/workspace-write-env.test.ts`（98 例）。
    未改父级 SPEC、`index.ts`、`session.ts`、product tool table/policy、wire、Rust/Tauri、package/lock、GUI；零新依赖。
  - 工具定义**直接实例化**上游 `createWriteTool()`：零 schema 复制、零 execute 复制、零新工具名。
  - binder 保留上游 `name/label/description/parameters`（同一对象引用），固定 `executionMode:'sequential'`；
    raw `toolCallId` 查预种 public tc、缺失即拒；每次 tool call 现建 invocation-scoped env，
    恰一次 delegate 上游五参 execute。不预分配 tc/op，不用共享可变 `currentOperation`。
  - `writeFile` 门序固定：路径 grammar → `.md` → content 良构/容量 → **此时才** `allocateOperationId` → port。
    任一门失败均 port 零调用、op 零分配。`canonicalPath` 固定 `not_supported`；
    读面与 append/remove/createDir/temp 全 `not_supported`、`exec` 全 `shell_unavailable`。
  - port request 恰八字段；`contentSha256` 与 `proposalHash` 按 ADR-022 六-B.2 的 `frame()` 拼接取 SHA-256，
    测试用 `node:crypto` **独立重算**比对（生产走 `crypto.subtle`），避免同源假绿。
  - 生产码零 Node builtin import（含零 `node:fs`、零 `child_process`）；落 fs 的临时目录 host 只活在 `.test.ts`，不进生产。
  - 新模块**暂不从 `index.ts` 导出**：公共面扩张属 `PI-WRITE-HOST-1` 的装配范围，本票不提前改消费点。
  - 三处判定按 ADR 字面执行并留痕：
    - `.md` 判定按「最终 basename 以 `.md` 结尾」实现，故 basename 恰为 `.md`（空 stem）会通过。
      收紧属契约变更，未自行加严——**[需架构拍板]**。
    - content 的 lone surrogate 与裸 NUL 按六-B.1「hash/byteLength 一律在良构门之后计算」拒绝；
      本地码 `invalid_content` 无 wire 对应项（按构造不可能上 wire）。
    - ES2023 lib 无 ADR 指名的 `String.prototype.isWellFormed()`（ES2024），改用同义的代理项配对判定，
      不做「有就用、没有就跳过」的降级；tsconfig 未动（不在本票范围）。
  - pi 的 `FileErrorCode` 闭集表达不出 denied/failed/uncertain 分型，工具错误必然被压扁——已单列一条断言锁住。
    这正是「产品 outcome 只认 host_result/journal，不解析上游文案」的理由。

- mutation / 防串线证据：每例只改生产码单点，跑定向 98 例，`cp` 备份还原并 `diff` 校验还原后逐字节一致。

  | 变异 | 红数 |
  |---|---|
  | M1 去掉 `.md` 门 | 7 |
  | M2 门之前就铸 operation | 2 |
  | M3 撤掉 raw exact-key/type gate | 10 |
  | M4 只撤 alias 检查（保留 key/type 门） | 4 |
  | M5 binder 复用同一 env | 3 |
  | M6 byteLength 退化成 UTF-16 长度 | 3 |
  | M7 tc 缺失时自行代分配 | 2 |
  | M8 proposalHash 不绑 operationId | 2 |
  | M9 binder 丢掉 `executionMode:'sequential'` | 1 |
  | M10 `canonicalPath` 不再 `not_supported` | 1 |

  M5 首版补丁只声明了一个没人用的 `sharedEnv`，跑出 0 红——**那是无效变异，不是绿证**，已作废重做；
  另一变体（只改 body 不加声明）触 ReferenceError 崩 13 例，属崩溃而非语义变异，同样不计。
  有效 M5 是「真复用同一 env」，红 3。由此暴露的覆盖缺口（原先无人证明 binder 每次现建 env）已补一例并发用例。

  防串线的三条正反证据：
  - 正：共享同一 env 对象时，上游 queue 确实按 canonical path 串行——trace 只见一条 `enter`。
  - 反：两只 invocation-scoped env 走同一 logicalPath **不**串行——第一件还卡在 port 里，第二件已整趟跑完；
    经 binder 复现同形。
  - 产品侧串行真源是 `Agent toolExecution:'sequential'`：同回合两枚 write 的 trace 为
    `enter/exit/enter/exit`，两枚独立 op。上游 env queue 不得冒充跨调用串行，更不是持久化并发控制。

- 全仓门结果（本树 `codex/pi-write-proof-1`，Node v25.9.0；退出码单独取，不经管道读）：
  - `pnpm -r build` EXIT=0
  - `pnpm lint` EXIT=0
  - `pnpm test` EXIT=0：161 files / 1495 tests。
    基线为**移出本票两份文件后实测**（非相减推算）：160 files / 1397 tests；净增 +1 文件 / +98 例。
    `packages/pi-lane` 由 74 例增至 172 例（9 files）。
  - ADR-018 门 R3 `apps/desktop/scripts/assert-isolation-binding.mjs` EXIT=0
    （扫 20 份 pi lane 源码，`nodePrimitiveLedger` 仍为空册——即生产码零 Node 侧写/执行原语）。
  - 未跑 Playwright：本票零 e2e 用例、`apps/` 零改动；`assert-test-count` 只数 Playwright 用例，floor 不动。
  - 门跑完后只再动过本回执；`packages/pi-lane/specs/*.md` 不在任何门的读取面内。

- 新增概念及必要性（复杂度节制留痕）：只新增三个，都由 ADR-022 决定六直接拉动。
  1. **workspace 逻辑路径**（`/workspace` + logicalPath grammar）——六-B.2 已冻结的跨平台 grammar 必须在 Node 侧
     有一份可注反例的实现，否则「Node/Rust 两端同一 golden」无处对照，一端拒而另一端收就成了协议漂移。
  2. **`WorkspaceWritePort`（八字段 request）**——「Node 只提案、Rust 兑现 effect」这条分界需要一个可注入接缝；
     没有它就只剩 Node 直写一条路。
  3. **`WorkspaceWriteRegistry`（tc 查表 + op 铸造）**——ADR 要求 tc 首分配属 event projector、op 只在真发 request 时铸；
     两件都不能由 binder 代劳，故必须是注入项而非模块内计数器。

  未引入：新依赖（零新包）、新持久化格式、状态机、通用抽象。`WorkspaceWritePortOutcome` 刻意只分
  `ok/denied/failed/uncertain` 四态，精确 code 闭集留给 wire（`PI-CODE-STDIO-1`）与 Rust（`PI-WRITE-HOST-1`），
  本层不复制第二份判定。

- 待独立验收项：
  1. 本票只到 **package/headless proof**：无 Rust host、无 loop journal、无授权账本，
     **不构成写面放行**，未更新 `docs/status/current.md`，也不宣称 coding agent 基础已闭合。
  2. 临时目录 host 适配器只证「port 语义可被兑现」，**不**证 durable-before-effect、原子可见性、no-follow
     或断电 durability——那些属 `PI-WRITE-HOST-1` 的 `cap-std` 面。
  3. 新模块未进 `index.ts` 公共面，产品 tool table/session/policy 未接线；`PI-WRITE-HOST-1` 接线时须复核
     binder 双锁与 op 分配点在真实装配下是否仍成立。
  4. `.md` 字面判定放行了 basename 恰为 `.md` 的一例，请架构裁定是否收紧（见上「[需架构拍板]」）。
  5. mutation 红数与全仓门结果请在独立 clean worktree 复跑复核；本会话是实现角色，不验收自己的实现。
