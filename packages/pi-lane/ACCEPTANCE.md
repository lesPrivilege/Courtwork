# PI-SIDECAR-DIST-1 独立验收（2026-07-28，拒绝）

## PI-SIDECAR-DIST-1R 独立验收（2026-07-28，拒绝）

对象：`codex/pi-sidecar-dist-1r@61c2b09`（实现 `ba71df8`，组合基线
`7a500d1`）。验收树为独立 clean worktree
`/private/tmp/courtwork-accept-pi-sidecar-dist-1r`，分支
`codex/accept-pi-sidecar-dist-1r`；本结论不采信实现回执。

**结论：REJECT。** `PI-HOST-LOOP-1` 不得消费本票，也不得据此裁定分发路线。
实现的共享 pure verdict 虽替换了旧版「恒报 ok」的聚合，却仍没有把票面要求的磁盘闭集、
每个冷启样本身份和有效 SHA 闭合进 production verdict。三个独立、可复现的 blocker 足以
否决；因此没有把空 `dist/` 的 31 枚昂贵矩阵重跑当作放行条件。

### 先核对的边界

- `ba71df8` 对 `7a500d1` 的实现足迹恰为票面 14 文件；`61c2b09` 只改专属回执。
  `sidecar-fixture.mjs` 的跨基线 diff 为空；验收开始时目标工作树 clean。
- `node --test packages/pi-lane/fixtures/sidecar-dist/scripts/probe-verdict.test.mjs`：
  **102/102** 绿。这只说明现有 102 例覆盖它们构造的 observation，不抵消以下生产反例。
- 规定门均在独立树实跑：`pnpm -r build`、`pnpm lint`、
  `pnpm --filter @courtwork/desktop lint:isolation-binding`、`pnpm test` 均 exit 0；全仓
  **160 files / 1397 tests**。首次 build 因新 worktree 缺 `node_modules` 未起门；用 frozen
  lockfile 安装后重跑，以上才是有效读数。

### Blocker 1：所谓“十件闭集”不检查实际随包磁盘集合

`toolkit.resolveInventory()` 只由常量 `INVENTORY` 推出十个预期坐标，`artifactPresent()` 也只
检查每个坐标的预期文件；`measure.mjs` 把由此得到的静态 `observedIds` 交给
`verdictInventory()`。它从不枚举 `route-a/` 或 `route-b/` 的实际目录、文件或附带资源。
实现自报的 `inventory.extra` 反例只是在内存 `observedIds` push 一个 ID，不是磁盘反例。

我在**验收树自己的**已 clone `dist/route-a/` 落入
`unexpected-physical/proof.txt`，未删除或改动任一预期产物，随后运行未改的
`node scripts/measure.mjs`。真实十件 probe 全部执行结束，输出为
`status=ok failures=0`。因此一个实际多制品/多资源分发仍被 production 误报通过，直接违反
SPEC 对“多一件”必须顶层 failed、进程非零的要求。

### Blocker 2：冷启身份可在首个坏样本后假绿

`coldstart-rounds.mjs` 把第一份 `ready` 设为 identity；若随后样本不同，只把随后样本写入
`identityDrift`，并将 **drift 后的** identity 作为 `round.identity` 返回。
verdictColdstart()` 只验 `round.identity`，完全不读 `identityDrift`。

直接调用 production `verdictColdstart()`，构造“第一个 ready 三元组错误、后 24 个正确”的实际
收束形状（`round.identity` 为后来正确值、`identityDrift` 非 null），返回 `[]`。既有测试的
“身份漂移”仅把最终 `round.identity.node` 改坏，未命中这一收束路径。票面要求每轮身份不得漂移；
当前实现不能证明它。

### Blocker 3：可复现性接受不存在/非法 SHA

`deterministic()` 只比较两个值的 JavaScript 相等性，未先要求二者均为 64 位小写 SHA-256。
直接调用 production `verdictReproducibility()`，其 sealed 项为合法相同 SHA、code-cache 为合法
不同 SHA、cross-arch warning 正确，而两个 SEA default 项均为 `shas:[null,null]`、
`identical:true`；函数仍返回 `[]`。也就是说构建摘要丢失 executable SHA 时，可复现性门仍假绿。

### 其余已定位的失败闭口

- `measure.mjs` 的 crash `throw`/`exit` 只 await `crashing`，不判其是否收到；随后无 deadline 地
  await `proc.exited`。若进程既不发 ack 也不退出，整支 probe 永久挂起，既不写 failed verdict
  也不非零退出。`hang` 的 SIGKILL 特判不能覆盖此前两类。
- `build-sea.mjs` 收集了 `codesign --remove-signature`、最终 `--sign` 与 `--verify` 的退出码，
  但即使三者非零仍把 variant 写成 `status:'ok'`；只有 postject 非零被拦。既没有 shared verdict
  消费这些值，也没有逐件 final verify 作为生成成功前提。
- 报告/README/回执改为 **2.35 GiB**，但父级 SPEC 本票明确要求 README/报告统一 **2.27 GiB**。
  这可能是实测订正，却是验收会话无权追认的契约漂移，须架构先裁定；不可借全绿静默覆盖。

### 未继续耗时的项目

官方 archive partial→校验→rename 的 source path、十件预期 ID、负控、双 cycle/随机化形状、
签名矩阵和 postject 自身 MIT + vendor LIEF（许可证中另含 Apache-2.0 文本）的登记均已阅读；
但这不修复上述三项 production 假绿。按验收纪律，已坐实 blocker 后停止从空 `dist/` 的全量
31 反例、双 cycle、冷启和签名矩阵，以免把数小时运行误写成放行证据。返修至少须把真实 shipped
file/dir 闭集、每个 coldstart sample identity、SHA lexical validity、crash ack/exit deadline 和
SEA 重签每步结果接入同一个 hard verdict，并重新由独立会话验收。

对象：`codex/pi-sidecar-dist-1@3207b27`；实施基线
`00c8dbdbad466f0ab2edbf9083cda2998b659de7`。验收在独立 clean worktree
`/private/tmp/courtwork-accept-pi-sidecar-dist-1` 的
`codex/accept-pi-sidecar-dist-1` 分支进行。未合并、未推送、未改生产源码或 ADR。

**判定：拒绝，不能据此裁定分发路线。** 这不是路线甲/乙的功能反证；是实验装置没有把
自身的关键判据做成失败条件，且本验收无法在通过 Node 来源完整性门的前提下复跑二进制制品。

## 范围、依赖与可复建的静态部分

- `00c8dbd..3207b27` 恰为 14 文件：fixture 10 文件、独立工程报告、独占回执、
  `packages/pi-lane/package.json` 与根 lockfile；无 `apps/**`、无
  `packages/*/src`、无父级 SPEC/ADR 改动，符合票面范围。
- exact devDependency 复核为 `esbuild@0.28.1` 与
  `postject@1.0.0-alpha.6`；后者的唯一传递项为 `commander@9.5.0`。本地安装后逐份读取
  `LICENSE.md`/`LICENSE`，三者均为 MIT；production dependency 未变化。
- 使用隔离树的 Node v25 只复建 bundle（**不是 Node 22 制品复验**）：三种 minified bundle
  均为 959 inputs、零 warning，SHA 精确重现报告的
  `34b11452…`（ESM naive）、`463e75a5…`（ESM + createRequire）与
  `33ae7197…`（CJS）；SEA 输入 CJS 与 sealed CJS 亦逐字节相同。
  同环境 ESM naive 实际以 `Dynamic require of "process" is not supported` 退出 1，
  createRequire 形态可启动，CJS 的 ping/UTF-8 echo 可通。这只复核 bundle/反例，不能替代
  Node 22 SEA、双架构、冷启或签名结论。

## 拒绝理由

1. **量测不会因关键语义失败而判红。**
   [`measure.mjs`](fixtures/sidecar-dist/scripts/measure.mjs) 只把 `stdio()` 的 pong、三项 payload、`init`、tool loop 和
   EOF 结果序列化；它在这些任一缺失/不匹配时仍从 207 行返回 `status: 'ok'`。`abort()` 在
   246 行只以收到了 `slow-ended` 判 `ok`，不要求 `stopReason === 'aborted'` 或
   `survivedAbort === true`；`crashes()` 在 279 行也不核对异常/exit/SIGKILL/SIGTERM 的预期
   code/signal。故「八枚全过」没有由装置自动证伪，不能充当验收证据。须先将上述语义变为
   非零/failed 条件，并为每类各注入一枚反例观察变红。
2. **独立 Node 22 重放被来源门正确阻断。** 从报告指定的官方 URL 下载后，arm64 archive
   为 49,274,880 B、SHA `8fec0b59…`（期望 `ef28d8fa…`）；x64 archive 虽为
   51,245,086 B，SHA 为 `358e430c…`（期望 `b8da981b…`）且 `tar -tzf` 报 truncated input。
   `extract-runtime.mjs` 因此拒绝继续。这是本验收环境的传输/缓存异常，**不推断为上游文件
   变更**；但在取得通过官方 checksum 的 archive 前，无法独立确认 SEA 注入、八制品启动、
   abort/crash、三轮冷启与 ad-hoc 签名读数。
3. **两处回执精度漂移。** fixture README 仍写 clean 为 `~1.4 GiB`，与
   `3207b27` 已订正的 2.27 GiB 相冲突；并且仓库根没有 `lint:isolation-binding` script，
   无限定的 `pnpm lint:isolation-binding` 实测 exit 254。正确命令
   `pnpm --filter @courtwork/desktop lint:isolation-binding` 本验收 exit 0。报告与 README
   应写完整可执行命令及同一残留数。

## 已实跑门与环境说明

- `pnpm -r build`、`pnpm lint`：通过。
- root `pnpm test`：受限沙箱下仅 8 个 localhost sidecar 例统一超时，其余
  1389/1397 通过；在独立提升环境复跑为 **160 files / 1397 tests passed**。
- `pnpm --filter @courtwork/desktop lint:isolation-binding`：通过，输出扫描 6 份宿主源码与
  18 份 pi-lane 源码、等级 `none`。

## 复验后才可放行的最小条件

1. 修复量测的 pass/fail 聚合，实际注入 stdout、abort 与四类 crash 的反例并留红证；
2. 使用 checksum 通过的官方 Node 22 arm64/x64 archives，从空 `dist/` 重建两路线；
3. 重跑八制品的功能/abort/crash、三轮冷启、default/code-cache 可复现性及 sign-probe；
4. 统一 README/报告/回执的清理体积和 isolation gate 命令。路线选择及 entitlements 归票仍是
   **[需架构拍板]**，验收不作裁定。

---

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

# PI-SIDECAR-DIST-1R2 独立验收（2026-07-29，拒绝）

对象：`codex/pi-sidecar-dist-1r2@33100d83fe9499d1639d45997d6a16c562bf9bbb`；实现提交
`42858b2f011535d9e3d9cf4fc0d599a4a0df3c78`。验收在独立 clean worktree
`/private/tmp/courtwork-accept-pi-sidecar-dist-1r2` 的
`codex/accept-pi-sidecar-dist-1r2` 分支进行；未触实现 worktree、未 push、未 merge、未裁分发路线。

**结论：REJECT。** `PI-HOST-LOOP-1` 不得消费本票，路线继续是 `[需架构拍板]`。此结论不以实现
回执的 202/202、76 枚或全仓绿数字为依据。

## 范围与验收修复

- 实现范围相对 `166a89a` 恰为票面 12 文件：原报告、fixture README、9 个 harness 文件、verdict
  测试与专属 R2 回执；`33100d8` 仅在 `42858b2` 上追加专属回执。生产 wire/session、依赖、旧回执、
  父级 SPEC/ADR/ACCEPTANCE 均未由实现提交触碰。
- target 的 `probe-verdict.test.mjs` 是 **202/202** 绿，但独立把一个成功 SEA 格的
  `publishedPath` 改为 `../bogus`（四阶段仍全 0、目录仍在）后，`verdictSeaBuild()` 返回零 failure。
  它只判非空字符串，不证明成功行指向该 triple/variant 的 assembly 成品，违反 R2 对有效
  `publishedPath` 的闭口要求。
- 这是不改契约的实现级小缺陷。验收树以 `fix-by-acceptance` 加入 exact
  `assembly/${seaExecutableAssemblyPath(triple, variant)}` 门与首红测试：新增用例在未修 target 上
  单独红，修后 **203/203** 绿；再把该 production 条件变异为 `false`，定向套件为 **201 pass / 2 fail**，
  精确落在缺 path 与 path escape 两例，随后恢复。该两文件修复待单独提交，不能反写实现回执。
- 同一轮还把 assembly root-type 门变异为 `false`，原 202 例转 **199 pass / 3 fail**（真实 symlink、
  完整 entries 的 symlink、file/FIFO/null root 三组），随后 SHA 字节级恢复；说明已有 root 门不是装饰。

## 不采信自述后的实测

- 冻结 Node v22.23.1 的 arm64/x64 archive 均重新下载、bytes/SHA/SHASUMS/tar、解包 version 与
  Mach-O arch 全过；sealed/SEA 从空 assembly 构建成功，正常 `measure.mjs` 对十件库存返回
  `status=ok/failureCount=0`。
- 实物向 assembly 注入额外目录与文件，production `observeAssembly()` + `verdictAssembly()` 命中
  `assembly.unexpected`，随后恢复原状。`crash.ignored` 的真实受控子进程在 **136,028 ms** 收束为
  failed，留 `ack/exit/respawn-eof` deadline 的结构化 failure，而非永久等待。
- 先有一轮四格 SEA 成功，再分别注入 `removeSignature`、`postject`、`sign`、`verifyStrict` 的真实
  外部命令失败。每一轮四格均为 `status:failed`、stage 精确、stderr 非空、`published:false`、
  `publishedPath:null`，且 `lstat` 观察 `publishDirPresent:false`；双 cycle reproducibility 返回 ok。

## 拒绝原因：签名矩阵在可信 runtime 上实际 blocked

`sign-probe.mjs` 没有复现回执所称的六格全过，而是 **2 failure**：两枚
`adhoc-hardened-with-official-entitlements` 均为 `entitlements-missing`。根因可复现且发生在已通过
冻结 SHA 的官方 arm64 Node 上：

```text
codesign -d --entitlements - --xml <official-node>
stdoutBytes=0
warning: binary contains an invalid entitlements blob. The OS will ignore these entitlements.
```

脚本从 `dumped.stdout` 提取 XML，因此无法生成官方 entitlements 文件，shared `verdictSign()` 正确将
两格判为 blocked。不能凭回执中旧环境的读数、手写 entitlement 文件或降低 verdict 来把这次失败涂绿。
这可能是当前 macOS/codesign 对同一冻结 Node 二进制的环境差异，也可能意味着报告的签名证据缺少
可复现前提；无论哪一种，在重新给出可信、可重复的官方 entitlement 来源与完整六格重测前，票面
签名退出证据不成立。

已因此停止昂贵的 600-sample cold-start 与 76-counterexample 全量重跑；它们不能修复一个已实测失败的
必需签名格，也不得用实现会话保存的读数代替。报告/README/R2 回执的无路线建议、2.27/2.35/R2 三口径
并列文字已作静态复核，未发现借此裁路线的表述。

## 仓库门

- `pnpm -r build`：exit 0。
- `pnpm lint`：exit 0。
- `pnpm test`：沙箱内 8 个 pi localhost sidecar 用例统一 5 s 超时（1389/1397）；在独立提升环境重跑
  **160 files / 1397 tests，exit 0**。
- `pnpm --filter @courtwork/desktop lint:isolation-binding`：exit 0（6 host / 18 pi-lane source）。

复验前最小动作是：保持 exact `publishedPath` acceptance fix，调查/冻结官方 Node entitlement 提取在此
macOS 上的事实来源，令六格签名矩阵不依赖无效 blob 后从空 assembly 重跑签名面；随后再以独立会话重跑
cold-start、76 枚反例与最终读数。不得据本次拒绝结果选择路线。

---

# PI-SIDECAR-DIST-1R3 独立验收（2026-07-29，拒绝）

对象：`codex/pi-sidecar-dist-1r3@47fd7e530e44964b233560f97043f7c7d3d4d788`；实现／报告锚点
`7b4184b70cecea26fe583d177fbb9eb62b644369`；组合基线
`ba374d867ff34a1a620220debd5f9e4049fb4a40`；架构锚点
`4e2d07a08f0a772873ddea65a66bf4ef312f5e05`。验收在独立 worktree
`/Users/lesprivilege/.codex/worktrees/a204/Courtwork` 的
`codex/accept-pi-sidecar-dist-1r3` 分支进行；实现 worktree 位于
`/Users/lesprivilege/.codex/worktrees/889c/Courtwork`，两者物理隔离。开工时本树 detached HEAD
恰为 target 且 clean；target 分支指向同一 SHA，implementation、baseline、architecture anchor
均为 target 祖先，`main...target` 为 0 behind / 13 ahead。

**结论：REJECT。** R3 的签名 verdict 仍可在关键证据缺失或结构不合法时 false-green，且
preflight 会把控制进程失败误报成执行域阻断。它们都是契约级证据链缺口，验收会话不得自行改写契约后
放行；没有产生 `fix-by-acceptance` 提交。`PI-HOST-LOOP-1` 不得消费本票，分发路线仍由架构角色裁定。

## 范围、保全门与 target 基线

- `baseline..target` 恰为票面 7 路径：工程报告、fixture README、`probe-verdict.mjs`、
  `probe-verdict.test.mjs`、`sign-probe.mjs`、冻结的
  `upstream/node-v22.23.1/osx-entitlements.plist`、R3 专属回执。零父级 ADR/SPEC/current/readiness、
  旧 ACCEPTANCE、依赖或产品源码越界；target 回执提交只增加 R3 回执。
- `850fa11` 经 `473bc00` 进入组合基线的 SEA exact publishedPath 门仍在：
  成功格必须精确等于 `assembly/${seaExecutableAssemblyPath(triple, variant)}`；缺 path、escape、
  错格与错扩展反例均保留。R3 未回退该门。
- target 原样运行
  `node --test packages/pi-lane/fixtures/sidecar-dist/scripts/probe-verdict.test.mjs`
  为 **20 suites / 224 tests passed，exit 0**。该数字只说明既有用例绿，不证明下列契约。

## 拒绝原因一：同轮 host/runtime identity 没有进入 hard verdict

`sign-probe.mjs` 的完整 receipt 实际采集了 `host`、`harnessNode`、`developerTools`、
`officialNode`、`canonicalSource`、`tools` 与 commands；但向 `verdictSign()` 传值时只保留
`tools` 和 Apple commands（第 447–450 行）。`verdictHostToolReceipt()` 也只消费这两个字段
（`probe-verdict.mjs` 第 1204–1243 行）。因此报告可写出宿主、CLT、harness Node、官方 runtime
和 canonical source 身份，判定器却不要求它们存在，更不证明来自同一轮。

独立在 target 测试 fixture 中补入完整、合法的 identity 后，分别删除 `host`、`harnessNode`、
`developerTools`、`officialNode`；每个 mutation 均确认命中传给 `verdictSign()` 的 observation，
但四次都得到 **0 failure**。定向首红合计 **0 pass / 4 fail**（断言期望判红、实际 false-green）。
mutation 随后逐字节还原，测试文件 SHA-256 恢复为
`18087e9627e31668d6bdefab632d700a2cc1aa4a876887b37b1c58917feaf34c`。

## 拒绝原因二：DER human parser 接受未知层级

`parseHumanObservation()` 对任何不是 `[Key]` 的行直接 `continue`（`sign-probe.mjs`
第 678–704 行），而传给 verdict 的 human observation 又丢弃 `parseError`（第 443–445 行）。
`verdictOfficialEntitlements()` 只复核派生后的六条 entries/values 和流 bytes/SHA；它无法证明原始
`codesign -d --entitlements :-` 输出是严格 flat dictionary。

独立把一条未知 `[Array]` 层级前缀加入成功 human command 的真实 stdout，再同步重算 bytes/SHA；
六个 canonical 键值保持不变。mutation 确实命中原始流，`verdictSign()` 仍返回 **0 failure**。
与上节四例合并运行的首红为 **0 pass / 5 fail，exit 1**。这不是 duplicate/extra/false 已有用例
的等价重复，而是 R3 明列的「未知 hierarchy 必须拒绝」反例。

## 拒绝原因三：`probe_failed` 可被 blocked reason 覆盖

`runPreflight()` 先收集官方签名／Gatekeeper 的 blocked reasons，再以
`blockedReasons.length > 0` 无条件优先定为 `security_execution_domain_blocked`
（`sign-probe.mjs` 第 323–325 行），没有先要求控制进程成立。

本验收树第一次从空 package build 状态运行独占 id `accept-r3-a204-seatbelt` 时，控制进程因
`packages/pi-lane/dist/index.js` 不存在而 `ERR_MODULE_NOT_FOUND`，观测为
`ready=false`、`eofSent=false`、exit 1、`ready` deadline timeout；脚本却返回
`security_execution_domain_blocked`，manifest SHA-256 为
`1976405d0e26bf501a4513ad66624c914aaeb6037ee4661356c58b43643607fe`。这是真实入口反例：
控制协议／启动失败按契约必须是 `probe_failed`，不能被随后采到的 Authority unavailable 或
Code Signing subsystem internal error 掩盖。

为避免把该反例误当 seatbelt 正证，先构建 `@courtwork/pi-lane`，再用另一独占 id
`accept-r3-a204-seatbelt-built` 重跑。此轮控制 sign/verify/XML 全 0，XML 568 bytes，
`ready=true → eofSent=true → exit 0`；官方 Node verify exit 1 且 Authority unavailable，
`spctl` exit 1 且首行精确为 Code Signing subsystem internal error，故准确返回
`security_execution_domain_blocked`、进程 exit 1。manifest SHA-256
`196e1c5602a5d8eb59edcee9016a905cebd7f6df4fcab53303c2822f021c359d`，其中两项实物：

- `host-tool-receipt.json`：22,167 bytes，
  `04c13b72352a54d029c194899886cb2782b97b78871286c40787a31a03b52e20`；
- `preflight.json`：12,947 bytes，
  `1a2122c8959deb4c806406a35ff2a7cd47a0d229a8bbda3e6db4bd7355707951`。

manifest 中的 path/bytes/SHA 与实物逐项一致，13 条 Apple command receipt 均为绝对
`/usr/bin/codesign`、`/usr/sbin/spctl`、`/usr/bin/plutil`，工具 SHA 同轮一致、`LC_ALL=C`，
stdout/stderr 原文及 bytes/SHA 在 receipt；该 preflight 目录没有 `sign-probe.json`，也没有覆盖
第一次 execution-domain 目录。

## 独立来源、许可证、报告与残留

- 未用实现者保存的 4.34 GiB `dist`、manifest 或读数。本树从无 `dist` 开始，由冻结脚本从
  `https://nodejs.org/dist/v22.23.1/` 下载 arm64/x64：50,067,502 /
  51,245,086 bytes，SHA-256 `ef28d8fa…` / `b8da981b…`，SHASUMS、tar、解包后的
  `v22.23.1` 与 Mach-O arm64/x64 均过。
- 独立访问 Node 官方 Git 仓库：annotated tag `v22.23.1` 为 `af059a8d…`，peeled commit
  `bd96dfbf…`。该 commit 的 plist 为 632 bytes、blob `045df8ea…`、SHA-256 `a0387464…`，
  与仓库副本 `cmp` 相同并解出恰六个 true；官方 `osx-codesign.sh` blob `346afdbe…`
  在 `codesign --entitlements tools/osx-entitlements.plist` 中直接消费它。无手写、旧件或
  extraction fallback。
- 实装依赖复核为 `esbuild@0.28.1` MIT、`postject@1.0.0-alpha.6` 自有部分 MIT 且其
  LICENSE 第 32 行起明确 `vendor/LIEF` Apache-2.0、`commander@14.0.3` MIT；R3 无依赖改动。
- 报告明确区分实测、推论、blocked，多处写明不作选型且 R3 节为零路线建议；静态复核未发现 R3
  借签名证据裁路线。`get-task-allow:true` 只登记为 Node 上游 canonical ad-hoc probe 控制变量，
  报告明确禁止直接进入 Courtwork product signing plan。
- 未清理本验收树证据。`clean.mjs --report-only` 实测总计 **698,356,051 bytes（0.65 GiB）**：
  runtime 473,562,352 + security-domain 224,791,101 + runtime-source 1,608 +
  runtime-fetch 990，逐项求和与 total 相等。

## 仓库门与停止边界

- `pnpm -r build`：exit 0（14/15 workspace scope；Vite 仅既有 chunk warning）。
- `pnpm lint`：exit 0。
- 提升到非 seatbelt 域运行 `pnpm test`：**160 files / 1397 tests passed，exit 0**。
- `pnpm --filter @courtwork/desktop lint:isolation-binding`：exit 0（6 host / 18 pi-lane source）。

全仓绿不修复上述 false-green。由于 contract-level blocker 已用六个独立命中证据确认，本会话没有再请求
批准域 full 六格，也没有从空 assembly 运行 76 counterexamples、600 cold-start、双 cycle、
十件 inventory/runtime source/sign 全矩阵；这些昂贵读数无法令不消费关键证据的判定器成立，也不得拿
实现回执数字补齐。本停止原因是 **REJECT**，不是外部条件 BLOCKED。复验前须由架构角色确认契约落实方式，
实现者修复三处 hard verdict／classification 后，再由新的独立验收会话从空目录完整执行 R3 票面矩阵。
不得据本回执选择 sidecar 路线、启动 Host、构建 DMG 或改写父级权威文档。

# PI-WRITE-PROOF-1 独立验收（2026-07-28，放行）

对象：实现回执目标 `3d457752e133363096b4a4c5df059422d5d1c1e6`
（实现 `c0b7989c81b71cb1d465c27503d005a758a7076a`）；基线
`00c8dbdbad466f0ab2edbf9083cda2998b659de7`。验收在独立 clean worktree
`/private/tmp/courtwork-accept-pi-write-proof-1`、branch
`codex/accept-pi-write-proof-1` 完成。仅 cherry-pick 架构澄清
`e87471f443e12d5378bca166cae6ba9c92aa2d11`（本树对应 `18818ae`），未 merge main、未复用实现树。

## 范围、修复与判定

- 相对基线的实现 scope 精确为三件：新增
  `src/workspace-write-env.ts`、`src/workspace-write-env.test.ts`，以及专属
  `specs/PI-WRITE-PROOF-1.md`（写作时路径；该件已于 2026-08-05 随批移入
  `archive/pi-lane-receipts-2026-07-28--08-05/PI-WRITE-PROOF-1.md`——**史料线索**，不构成现行依据）；架构澄清涉及的 ADR/SPEC/readiness 三文档只作输入，不计实现越界。
- 验收发现原实现按旧回执放行 basename 恰为 `.md`，与已拍板的
  `unsupported_file_type` 冲突。先把 `.md` 加入拒绝参数化测试，定向实跑
  **99 tests 中 1 failed**；随后以最小的 `<= '.md'.length` stem 门修复，提交
  `4fee6d2 fix-by-acceptance: reject empty markdown basename`。同一 99 例复跑全绿，
  `.md` 不分配 operation、port 零调用。
- 未修改 `current.md`、父 SPEC、product tool table/session/policy、wire、Rust/Tauri、lock、index
  或 GUI。模块仍未由 `index.ts` 导出。

## 一手源码与行为证据

- 已安装的精确上游位于
  `node_modules/.pnpm/@earendil-works+pi-agent-core@0.82.1_.../node_modules/@earendil-works/pi-agent-core`。
  `dist/harness/tools/write.js:5-29` 给出开放 TypeBox object、五参 `execute`、pre/post-write abort
  和以 `content.length` 报“bytes”；`dist/agent.js:110-133` 证实 Agent 缺省 parallel；
  `dist/harness/tools/file-mutation-queue.js:1-44` 证实 WeakMap 以 env identity 加 queue、
  `not_supported` 时退 absolutePath；`dist/harness/tools/path-utils.js:2-10` 证实 `@` 和 Unicode
  spaces 会先被静默归一。`workspace-write-env.test.ts` 的真实 Agent、faux provider 与 direct upstream
  调用分别锁住上述行为：schema identity/metadata 原样保留、binder sequential、Agent explicit sequential、
  raw tc 查表（缺失拒绝）、每 call 新 env、exactly-once delegate、同 env 串行而 per-call 并行、两条真实
  port request 的 operation 独立、pre/post abort 以及 `备忘😀` 的 4 code-units / 10 UTF-8 bytes。
- 本实现 `workspace-write-env.ts:215-246` 按 path grammar → `.md`（非空 stem）→ Unicode/NUL → UTF-8
  capacity 的顺序 gate；`339-365` 在全 gate 通过后才 allocate op、构造八字段 request 并唯一调用 port。
  `473-497` 只用 raw toolCallId 查预种 public tc、原样保留 upstream metadata/schema object、固定 sequential、
  per-call 建 env 后五参 delegate。Unicode request 的 byteLength/contentSha256/proposalHash 由原 bytes 独立
  重算，绝不解析上游 success text。
- `workspace-write-env.ts` 本身零 Node builtin import/直接 fs 写；临时目录 fs adapter 仅在同名 `.test.ts`。
  它只证 port semantics（nested create、overwrite、逐字节回读），不宣称 durable-before-effect、atomic/no-follow
  或断电 durability；这些仍属 `PI-WRITE-HOST-1`。

## 反例、变异与门禁

- 实际有效 mutation：上述 `.md` 空 stem 契约反例先红 1/99、修复后绿。弱化 raw gate 的源码 patch 被本环境
  安全策略拒绝，未绕过且**不计 mutation**；改以安全的真实 upstream counterexample：绕开 binder 直调
  `createWriteTool`，`@a.md` 实际被改写成 `a.md`，且 upstream characterization 证明额外字段和
  primitive-to-string coercion 均会通过。其余 raw exact-key/type、metadata/schema identity、sequential、tc
  mapping、op 时点、一次 delegate、env/并发、UTF-8 hash、pre/post abort 均由独立定向运行的真实反例与
  Agent 装配断言覆盖；没有把 ReferenceError 或 no-op 当红证。
- 路径反例实际覆盖空/root/其他 absolute、`.`/`..`、backslash、drive/UNC、Windows reserved、超长、
  cross-session grammar、raw `@`、NBSP/U+2009/U+3000 alias；file/content 覆盖 non-md、exact `.md`、
  Unicode nested markdown、lone surrogate/NUL 与 oversize，全部失败均断言 port=0/op=0。
- ADR-018 R3 实跑：`node apps/desktop/scripts/assert-isolation-binding.mjs` EXIT=0，扫描 6 份 Rust、20 份
  pi-lane TypeScript。R3 绿只是当前 production scan；本轮未能安全注入弱化写/执行原语，未伪称该项为
  新 mutation 红证。

## 实跑结果与局限

- `pnpm exec vitest run packages/pi-lane/src/workspace-write-env.test.ts --reporter=verbose`：EXIT=0，
  **1 file / 99 tests**。
- `pnpm exec vitest run packages/pi-lane/src/*.test.ts --reporter=verbose`：受限 sandbox 首轮 sidecar localhost
  timeout（其余 8 files / 165 tests 通过）；移出限制重跑 EXIT=0，**9 files / 173 tests**。
- `pnpm -r build` EXIT=0；`pnpm lint` EXIT=0；`pnpm test`（移出 loopback 限制）EXIT=0，
  **161 files / 1496 tests**。

**最终判定：放行 `PI-WRITE-PROOF-1` ✅。** 放行只到 package/headless proof，并包含验收修复
`4fee6d2`；不代表产品写面、Rust host durability/no-follow、journal/逐次授权、GUI、workspace 回读或
external validation 已放行。

## 架构复核补证（2026-07-28）

`8061861` 后按架构复核要求，在同一独立验收树逐一施加**不会扩大能力面**的临时 production
mutation；每次只用 recording port、运行指定定向断言、立即以反向补丁还原，并在还原后完整复跑
`workspace-write-env.test.ts` **99/99**。不是编译错、ReferenceError 或 no-op。

| 类别 | 临时 patch | 观察到的有效红证 |
|---|---|---|
| metadata/schema identity | `parameters: upstream.parameters` 改成浅复制的新 object | **1 red**：`toBe` Object.is identity 失败，值深相同但 binder schema 不是 upstream 的同一对象。 |
| sequential 双锁 | binder `executionMode` 设为 `undefined`；真实 Agent fixture 保持显式 `toolExecution:'sequential'`，未运行并行 effect | **1 red**：`undefined !== 'sequential'`，证明 binder 自身锁不可省且不以 Agent 锁替代。 |
| operation 时点 | 仅把 `allocateOperationId` 移至 `gateWorkspaceWrite` 之前；失败路径仍不发 port | **1 red**：`.txt` 拒绝时 port=0、但 `allocations` 为 `['tc_1_1→op_1_1']`，精确击中 op=0 guard。 |
| Unicode bytes/hash | 分两次：`byteLength + 1`，再将 content hash 改为 empty bytes hash；均只流向 recording port | byte mutation **2 red**（`备忘😀` 11≠10、普通 request 35≠34）；hash mutation **2 red**（`备忘😀` 与八字段 request 的 SHA-256 都变成 `e3b0…b855`，不等于从原 UTF-8 bytes 独立重算值）。 |
| env freshness / operation correlation | 在 binder closure 缓存 first env，第二次 call 复用，未触外部 host | **1 red**：两次 allocation 变为 `tc_1_1→op_1_1`, `tc_1_1→op_1_2`，期待的第二 public tc `tc_1_2` 未被使用。 |

本补证共得到 **7 个语义红证**；每个 patch 均已还原，随后全组定向实跑为 **1 file / 99 tests passed**。
此前 raw-gate 弱化 mutation 仍因安全策略禁止而未执行、亦不计入；没有绕过该限制。R3 弱化同样未注入，
其已记录的当前树实际命令结果仍为绿，不冒充为本轮 mutation。

**复核后最终判定：放行 `PI-WRITE-PROOF-1` ✅。**
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

---

# PI-CODE-STDIO-1R2 独立验收（2026-07-29，验收窄修后放行）

验收对象为组合 target `710faaa30c9383d3642b06223e88e32cc0b3654d`，实现提交
`7686dfd3d2137f0085d5b49810bfe920e5305d97`，组合基线
`63787cb7b4528953e33544a5aca7c06a86d284af`。独立 worktree
`/private/tmp/courtwork-accept-pi-code-stdio-1r2-gpt`、分支
`codex/accept-pi-code-stdio-1r2` 从 exact target 建立；实现与验收会话分离。验收开始时树 clean，
`63787cb → 7686dfd → 710faaa` 的逐段 ancestry 均成立：实现段只改
`product-stdio.ts`／`.test.ts`，target 尾提交只改专属 1R2 回执。架构裁定
`main@1e14894` 不在 target 祖先链，两树 merge-base 为 `efcd0ab`；本验收按裁定明确允许两处旧绿测
再成形，并以「settled `finishPrompt` 先发保存 outcome 的 finished、再发优先级 terminal、正常返回」
作为冻结契约，未自行扩张 schema 或跨层接口。

## exact target 的两处真实缺陷与验收窄修

exact target 原定向门为 **2 files / 167 tests passed**，但独立把冻结契约写成断言后发现两处
实现级缺陷；两者均定位明确、无契约歧义，按验收权限落为
`fix-by-acceptance@43b3796e29ce6f97ba288be49b541afad61bb26b`：

1. **pending `finishPrompt` 假绿。** 原测试把 operation pending 时的抛错写成绿色；
   production 实际进入 `terminate()` 并抛 `ProductSidecarError`，既未置
   `upstreamLatched`，也未把 `usd` 传染为 null。把旧测试依架构裁定改成「正常返回、零 terminal、
   pending 保留、后续 runtime 输出被 latch、严格匹配的 host_result 后恰一
   `tool_finished` + upstream terminal」后，未修 production 的首跑 **EXIT 1**，实际逃逸
   `在途 host request 未收束前不得发 terminal`。修复仅在 `finishPrompt()` 加
   `pending → failUpstream() → return`；删除该分支的 production mutation 再次 **EXIT 1**。
2. **runtime event 非 record 可绕过闭集。** target 在读取 `event.kind` 前没有运行时 record
   门：`null as OutboundAgentEvent` 首跑 **EXIT 1**，逃逸
   `TypeError: Cannot read properties of null (reading 'kind')`；补 null 后，带合法
   `assistant_text_delta` 字段的伪装 Array 又被直接投影，仍 **EXIT 1**。最终入口先拒绝
   非 object、null、Array、无字符串 kind，再进入 union switch；`null`、`undefined` 与伪装
   Array 各自撤掉对应 production 子门均独立变红，均无 TypeError/callback failure 逃逸。

验收同时补强三处原本可假绿的断言，但不改变生产语义：settled `finishPrompt` 明确断言正常返回，
人工在正确 finished/terminal 后再抛会红；settled 时尝试起新工具锁完整
`['tool_started','tool_finished']` 序列（只有旧 write 的 start/finished，新 read 零投影），人工提前
投影新 `tool_started` 会红；event-record 例补 `undefined`，单撤 `typeof object` 子门会以
`'kind' in undefined` TypeError 变红。

## 反例、旧测再成形与 production mutation

- 九枚历史拒绝反例逐项实跑：tool/capability 双向错配、settled 后第二 operation、同 tc 改名、
  unknown event、pending 提前 finished、pre-op 伪成功、settled 被普通 finish 抹掉、finished 后
  倒退、stale tc 跨 prompt，最终全绿；另有 single-active、settled-new-tool 与 finished-reservation
  late-send 三条独立边界。
- 架构允许改写的两条旧绿测没有把非法输入藏掉。验收另以旧原序列重放：
  `write started/progress → 未 finished 即 read started → pre-op succeeded` 当场 fail-closed，
  新 read/旧伪 finished 均零出 wire；`read tc → workspace_write` 在烧 ordinal 前拒绝，随后合法
  read 仍拿 `op_1_1`。改写后的合法 read 多 operation 子循环及合法 tc 释放亦经独立 mutation
  证明有 production 区分力。
- 本会话在真实 production source 上逐枚注入并恢复：read 映射、single-active、pre-op
  success 改投、pending `tool_finished` latch、settled/new reservation、settled
  `finishPrompt` 正常返回、新工具零投影、pending `finishPrompt` latch、event record 的
  object/null/Array 子门，以及**整块 send-time 有效性门**。各对应反例均 **EXIT 1**；整块
  send 门删除时 late-send 明确不再被拒并出现 `expected [] to equal ['finished-send']`。裁定所称
  M16/M17 单撤在可达状态结构性等价如实保留，不伪报逐条红；四个 send 子条件仍全在最终源码中。
- 所有 mutation 均用补丁逐枚还原；最终搜索无 `mutation`／`false &&` 残留，`git diff --check`
  **EXIT 0**。另由只读审计复核 live diff 与上述关键门，结论同为无残留、覆盖可放行。

1R 的六组回归均未改语义：固定安全文案/retryability、pending upstream latch、五 callback
reentrancy guard、reserve/send 接缝、pending 不可变镜像与逐值关联、protocol retryability 与两条
canary 均在最终定向/全包门内通过。最终定向
`product-protocol.test.ts + product-stdio.test.ts` 为 **2 files / 168 tests passed**；pi-lane
全包为 **10 files / 242 tests passed**。pi-lane 首次沙箱运行仅
`sidecar.test.ts` 的 8 个 localhost 用例统一 5 秒 timeout（其余 9 files / 234 tests 通过）；
允许本机回环随机端口后，同树 242/242、**EXIT 0**，故记环境限制，不记产品红。

## 最终门与结论

| 门 | 退出码 | 结果 |
|---|---:|---|
| `pnpm -r build` | 0 | 14/15 workspace 范围通过 |
| `pnpm lint` | 0 | ESLint 全绿 |
| `pnpm test` | 0 | **162 files / 1565 tests passed** |
| `pnpm --filter @courtwork/desktop lint:isolation-binding` | 0 | 等级 `none`；扫描 6 host / 22 pi-lane 源码 |
| `git diff --check` | 0 | 无空白错误 |

apps、Host/Rust、R4 与导出面均未触；Playwright 不适用，未启动 `PI-HOST-LOOP-1`，也未把本票放行
外推成 Rust journal/host loop 已完成。

**最终判定：exact target `710faaa` 原样为 NO-GO；连同窄修提交 `43b3796` 后，
`PI-CODE-STDIO-1R2` ACCEPT / 放行 ✅。** 放行理由是两处真实缺陷已以契约内最小实现修复，分别有
首红、production mutation 红证与最终全仓绿门；九枚历史反例、late-send 组合门、旧非法序列及
settled 正常返回均不再依赖假绿。

---

# PI-SIDECAR-DIST-1R5 独立验收（2026-07-30，PASS）

**最终判定：exact target `6cdb9bab9632edf5c965ac3f0ba888b83b1d9809`
ACCEPT / 放行 ✅。**

本轮没有修改 production、测试、fixture、SPEC、ADR、依赖或 lockfile；验收唯一持久化改动是本节。
放行仅表示 R5 四道闭口及其冻结证据在该 exact target 上成立，**不裁路线、不消费路线、不外推**
Developer ID、公证、跨绝对路径 reproducibility、DMG 或 release readiness。

## 对象、契约与隔离

- 独立 worktree：
  `/private/tmp/courtwork-accept-pi-sidecar-dist-1r5-codex`；独立分支
  `codex/accept-pi-sidecar-dist-1r5`，从 exact target 建立。未进入实现树
  `/private/tmp/courtwork-pi-sidecar-dist-1r5`，也未读取其 `dist`、manifest 或旧 R4 验收树。
- target 始终为 `6cdb9ba`；验收末 `main` / `origin/main` 均为
  `41710438c43dd73e28330b098ef289ecde2025b2`。后者是本轮架构对 76 项口径的订正：
  历史账精确为 **68 个失败注入 + 8 个恢复／证据对照**，另造 8 个 acceptance-owned
  失败变体并分计。本报告按该架构提交裁定，不把 exit 0 或数值证据伪报成红证。
- 依赖在独立树以 `pnpm install --frozen-lockfile` 自装；首次 sandbox 因网络权限失败，
  批准联网后成功，lockfile 与 tracked tree 未变。fixture 的 `dist` 起初不存在；全部 runtime、
  assembly、读数与 execution-domain manifest 都由本会话新生。
- 长矩阵、cold-start、签名与仓库门严格串行；没有并发第二个测试、probe 或 repo gate。
  fresh execution-domain id 均以 `accept-r5-` 开头，未复用 `impl-r5`。

## 组合树复核

`5ec9839` 是 target 祖先；`5ec9839..94f662e` 恰 **16** 枚，
`94f662e..6cdb9ba` 恰 **5** 枚。十四枚 cherry-pick 的 source/combo patch-id
逐枚相同：

| source | combo | `git patch-id --stable` |
|---|---|---|
| `f0162fd` | `7b561af` | `eb2e876c288bb63cde00ade2d4ffa4d58d0a437b` |
| `eb806f2` | `4b306f8` | `dbd149ec3be05f66f5cec881ed58c44ca66d6e69` |
| `b284764` | `5b2aa81` | `2f070b5799d8f4bf962319aff7ac6c3c1e3099f3` |
| `f7ecd32` | `d48de2e` | `148bf2a8c4c128e416cd42da5a1e56e539ac6d62` |
| `20461aa` | `5de8815` | `c645b83ebec973d11a166050cc37497f1e9786fe` |
| `c6a9819` | `72aff11` | `9c8966e28a9c3b70c3400ef5eb35208c4bbb63c0` |
| `df65ab0` | `87b388c` | `4036c223deb6127329f77a8aba88817442c31ca6` |
| `0230bf6` | `0ef21cf` | `071e1ab23141ac2e01b4054f8fa1b40ae32e9be6` |
| `57f91dc` | `cf23b8a` | `94acd3999205f636425200f10bb7b8a5f3dcf09f` |
| `473bc00` | `dcf8696` | `b4037d53cf531ca314adfe692cad57ec4a802d15` |
| `7b4184b` | `aa4a5ef` | `fa5124e618e71681b2ae0eba8a7e9997592d5125` |
| `47fd7e5` | `82b3c9d` | `624672855389fc64fb263b25f28eafc015af61a3` |
| `891c23d` | `1f8a07a` | `9f0f456c3ad2cd97f55c095908d8481fd6bf4215` |
| `07d2dbc` | `94f662e` | `2d31e1de57df446c622b34db07d155d77f34cb2b` |

两块 `[架构移植]` 以文件区域而非 diff hunk 提取：

- target `ACCEPTANCE.md` 第 193–266 行为 74 行，
  SHA-256 `cd9c553592a8ebb78c272720feb98b5e1e58c477bb616074da05710cc2452cb4`，
  与 source `ba374d8` 同区域相同；
- target 第 267–388 行为 122 行，
  SHA-256 `49694a9feb437b28b79c75b90b5891f2454ff6541b11be5d0a4a21ed86564d28`，
  与 source `eb71d6f` 同区域相同。

R4 untouched 面也成立：`07d2dbc` 与 `94f662e` 下 fixture tree 均为
`f83e798e31e0872778ebad3e504bb915f22b73b9`，工程报告 blob 均为
`7ae61d757ec4993cbed04c2f0839ff48169837e8`；T2/T3 相对 T1c 的 `scripts/` diff
均为空。target 尾段只改冻结的七文件。

## 从空 assembly 的健康基线

1. `probe-verdict.test.mjs` 独立实跑：**40 suites / 384 tests / 384 pass / 0 fail**。
   356 条既有基线与 R5 增量 28 条均在同一最终总数内。
2. 官方来源门与解包：
   - arm64 archive：50,067,502 B，
     SHA `ef28d8fab2c0e4314522d4bb1b7173270aa3937e93b92cb7de79c112ac1fa953`；
   - x64 archive：51,245,086 B，
     SHA `b8da981b8a0b1241b70249204916da76c63573ddf5814dbd2d1e41069105cb81`；
   - 解包 arm64 binary：112,928,848 B，
     SHA `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`，
     `v22.23.1` / arm64；
   - 解包 x64 binary：115,447,952 B，
     SHA `03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b`，
     `v22.23.1` / x64。
   两架构 bytes、冻结 SHA、同次 SHASUMS、tar、version 与 Mach-O arch 全过。
3. 从空 assembly 连跑双 cycle：sealed 三档各自相同；两架构 SEA default 各自相同；
   两架构 code-cache 各自不同；cross-arch 见 exact `Code cache data rejected.`、
   `launched:true`、`timeouts:[]`、`exit:{code:0,signal:null}`。整支
   `status:"ok" failures:0` / exit 0。
4. 健康 `measure`：10 个 inventory item 全量、8 candidate + 2 negative control；
   stdio、三 payload、tool loop、abort、四类 crash 与 respawn 全过；
   assembly 实物闭集为 **28 项（12 目录 + 16 文件）**，`status:"ok" failures:0`。
5. cold-start 以 `--rounds 3 --samples 25 --warmup 3` 实跑：
   8 candidate × 3 × 25 = **600** 个 retained sample，三轮各为排列且不全同，
   `status:"ok" failures:0`。

上述 healthy 基线及后续物理组恢复后，production 源最终 SHA 为：

| 文件 | target SHA-256 |
|---|---|
| `measure.mjs` | `fa35fad82d2bb341091a14a6cdda9f0334378a9d0480f958cab07b9c5ba48425` |
| `coldstart-rounds.mjs` | `4aa79b474f336da3e0682aff34e5ee205586d79810b5d678198c4603d5451e88` |
| `reproducibility-probe.mjs` | `fd4c9cb971af816922b8df2eafafdfe8a4a7e344d12354d056fb296f877bf544` |
| `build-sea.mjs` | `e3933d2d6b01e568cfe3a2a21c1ce8b7d804ed1ccb3633734e5baad036e2e85e` |
| `extract-runtime.mjs` | `1eef1219c288248be65b34d4c17a3589c2cfd272be04d43d8d51ab481570e0fd` |
| `sign-probe.mjs` | `056d014ba342901dd2a7886b31e701e86a2a4502eab0f2ece2d6bb4f3f70cea9` |
| `lib/probe-verdict.mjs` | `f2f3d480a13b2450171fbce51f670686af1901c396af833746c25a0caf0ebfc7` |

## 历史 76 项回归矩阵

验收期望名单与组数由冻结契约字面量独立写入临时 harness，没有从被测 CLI 的枚举输出生成；
尤其没有向不支持枚举的 `reproducibility-probe.mjs` 传
`--list-counterexamples`。实跑总账为 **76/76**，精确构成为
**68 个失败注入 + 8 个恢复／证据对照**：

| 组 | 冻结项数 | 独立实跑结果 |
|---|---:|---|
| `measure` | 23 | 23 个 production counterexample 均 exit 2；identity、stdio、loop、abort、crash、negative-control、inventory 各具名门命中 |
| `coldstart` | 15 | 13 个 observation 变形均 exit 2；`--rounds 1`、`--samples 10` 各 exit 1；sample ordinal/warmup position/round numbers 均命中 |
| `repro` | 14 | 14 个源码字面名单均真实注入并 exit 2；SHA/path/exists/regular-file/bytes/non-deterministic/cross-arch warning 各门命中 |
| `sea` | 8 | 四阶段各 exit 1 + 各自 evidence 对照 exit 0；每阶段顶层 failure 只命中 `seaBuild.<stage>` |
| `fetchextract` | 5 | truncated 与 wrong-file fetch 各 exit 1；not-overwritten 数值证据、fetch restored、extract restored 三项按冻结观察通过 |
| `physical` | 11 | 十个物理失败各 exit 1；`reportsOutside` 反向对照 exit 0 / failures 0 |
| **合计** | **76** | **68 negative + 8 evidence/control；零逃逸，逐组复绿** |

关键实物证据：

- `crash.ignored` 的受控子进程忽略 crash 后在有界 deadline 内收束，exit 2，命中
  `crash.throw.deadline`、`crash.throw.ack`、`crash.throw`；stdout 明记
  `applied=true caught=true`。该 special branch 在给 `counterexample.caught` 赋值前先写一次
  `measurements.json`，所以 JSON 留 `caught:null`；这是一处**既有证据写入时序瑕疵**，
  不影响真实非零退出、具名 failures 或随后健康 measure，未越 R5 范围代修。
- SEA 四阶段分别为 `removeSignature`、`postject`、`sign`、`verifyStrict`。每项注入前目标
  cell 真存在；失败 row 的 status/stage、阶段非零与 stderr、`published:false`、
  `publishedPath:null`、后续阶段未冒充成功、publishDir 物理不存在、顶层 failure 唯一归因，
  九项全部为真；末尾健康 SEA 重建及 `measure` exit 0。四行 `:evidence` 是对照，不冒称红证。
- 截断 arm archive 精确为 49,274,880 B，fetch exit 1 后 bytes 与
  SHA `85d9c1720e94c368b4ad09fd5d2c4f5390dea242924e5d9dfd38df9dbce4f61b`
  均未改变；把完整 x64 archive 放到 arm 正式名时 `tarOk:true`，仍因冻结 bytes/SHA 被拒。
  恢复后 fetch / extract 都 exit 0。
- physical 十项逐个实造并逐个恢复：extra file、`unexpected-physical/proof.txt`、第三 route、
  FIFO、artifact symlink、missing file、wrong basename、nested subdir、missing carried
  bundle、assembly root symlink。root symlink 指回完整合格树时只命中
  `assembly.rootType`；artifact symlink 只命中 `assembly.fileType`。每项恢复后另跑一次
  `measure`，均 exit 0。

## 8 个 acceptance-owned strengthened negatives

按 `main@4171043` 的订正逐行独立注入、失败、恢复并健康复证；与历史 76 分计：

| 对应对照 | 本轮真实变形 | 结果 |
|---|---|---|
| SEA remove evidence | 真实 remove-signature 失败 row 把 `status` 改报 `ok` | exit 1；`seaBuild.removeSignature` + `seaBuild.status` |
| SEA postject evidence | 真实 postject 失败 row 把 `stage` 改报 `sign` | exit 1；`seaBuild.postject` + `seaBuild.stage` |
| SEA sign evidence | 真实 sign 失败 row 填非空 `publishedPath` | exit 1；`seaBuild.sign` + `seaBuild.publishedPath` |
| SEA strict-verify evidence | 真实 verify 失败 row 把 `publishDirPresent` 改报 `true` | exit 1；`seaBuild.verifyStrict` + `seaBuild.publishDirPresent` |
| truncated not-overwritten | 独立重造截断件，拒绝后从 49,274,880 B 漂到 49,274,881 B，SHA 同步变化 | acceptance checker exit 1；再恢复拒绝前错件，最后恢复 canonical archive |
| fetch restored | canonical 恢复后独立放入 8,192 B 非冻结 regular archive | fetch exit 1；target `rejected`、`problems` 非空、错件未被覆盖 |
| extract restored | verdict 前把 arm 解包观察的 `nodeVersion` 改为 `v0.0.0` | extract exit 1；唯一命中 `runtime.nodeVersion` |
| reportsOutside | 把同类 `measurements.json` 实物放入 assembly root | measure exit 1；`assembly.unexpected` + `assembly.count` |

四份 source mutation 均逐枚用补丁恢复；canonical archives 最终仍为前述冻结 bytes/SHA；
最后 `measure` 与 extract 各自回 `status:"ok" failures:0`。

## R5 五枚有效反例、验收自造变体与等价形态

实现回执所引 `scratchpad/r5-stage-{b,c}`、`ce76.mjs`、`r5-counterexample.mjs` 均不在
target Git 对象中，不能作为可复跑交付物。本会话从冻结契约与 production 源码独立重建设备；
此项记为 **evidence-packaging 缺口**，但所有受影响红证已被独立重跑补足，故不阻断 production
放行。

| 项 | 真注入 | production 结果 |
|---|---|---|
| R5 CE1 | exact warning + ready 后忽略 EOF、持续存活 | exit 1；`reproducibility.crossArch.timeouts`，并合理附带 SIGKILL 后的 `crossArch.exit` |
| R5 CE2 | exact warning + ready + EOF 后 exit 7 | exit 1；`timeouts:[]`，只命中 `reproducibility.crossArch.exit` |
| R5 CE3 | 全部 command 的 started/finished 同填一枚 canonical UTC | preflight exit 1；只命中 `sign.receipt.commandTimeline.advance` |
| R5 CE4 | official path 三处同步漂为 `/bin/../bin/node` | preflight exit 1；`officialNodePath` + 两条 `officialCommandBinding` |
| R5 CE5 | 六格 row 的 raw sign clone 改为 exit 1，summary 与 receipt 仍为 0 | full exit 1；六格各命中 raw sign、signExit parity、command binding，共 18 failures |
| acceptance CE6 | exact warning + ready + EOF 后由 SIGTERM 收束 | exit 1；`timeouts:[]`、`exit:{code:null,signal:"SIGTERM"}`，只命中 `crossArch.exit` |

CE5 首次验收注入曾原地改共享 receipt 对象，虽命中 raw/parity，却没有形成 receipt 分叉；
该次不计冻结红证。改为独立 clone 后三类门全部命中。另把
`row.signExit = signed.exit` 改成 `row.signExit = 0` 的历史形态以 fresh full id 真跑，
结果仍 `status:"ok" failureCount:0`；因为健康 `signed.exit` 本来就是 0，明确作废为等价变异，
不计红证。两份 source 最终恢复为 target SHA。

## 四枚 production mutation 与追认复核

判定器 target SHA 为
`f2f3d480a13b2450171fbce51f670686af1901c396af833746c25a0caf0ebfc7`。
每枚 mutation 都先证明 SHA 改变与 patch 命中，定向观察转红，再 byte-identical 恢复并独立跑
**384/384**；测试文件总数从未漂移。

| mutation | 变形后 SHA | 定向红证 |
|---|---|---|
| A：撤 cross-arch timeout / exit 两门 | `02aaebc77ff889e5b6339186c1fb6e4d8ba9218882de006dbe60d28296836f39` | A1–A4 恰 4 tests / 4 fail |
| B：timeline 严格 `<` 放宽为 `<=` | `61d2b1e61ae9b0a2c993556fe6e2c5e4af5f0b6f86e4c2a098d531a522e4e51f` | B2 恰 1 test / 1 fail |
| C：hard verdict status 回退 producer status | `23f0cedbf090231092e02ec99d0f975d2953aab147d5001597b2a9c6f66b9475` | C1/C2 恰 2 tests / 2 fail |
| D：撤六格 `verdictSignCellRaw` | `d2c8f29a18fe964a6033f08d0da9ec8219e7198c9fe422172244b094d8c355e7` | D1–D4、E3、E4a、E4b、串味追认例，恰 8 tests / 8 fail |

追认例在健康 target 上另跑为 1/1 pass：full matrix 的 internal error 命中
`sign.matrix.raw.display.security`，failures 不含
`sign.preflight.blockedReasons`、`blockedReasonDerivation`、`classification`、
`classificationDerivation`、`status` 五个 preflight check；raw 重导仍为 `ok/passed`。
撤 full raw 真源时该例按要求转红。旧“整份观察绿”形态没有被冒充重现。

## 三格 execution domain

分类只认功能 preflight，不以环境变量自证。三格均使用 fresh id；批准域按冻结要求分开跑
preflight 与 full，所以共有四份新 manifest，外算 SHA 与 production 自报逐字一致：

| 功能域 / id | 结果 | manifest path | 外算 SHA-256 |
|---|---|---|---|
| seatbelt `accept-r5-seatbelt-0730a` | preflight exit 1，`security_execution_domain_blocked`；raw 同分类 | `packages/pi-lane/fixtures/sidecar-dist/dist/security-domain/accept-r5-seatbelt-0730a/manifest.json` | `495a39ecbe9e8193cc0a49279a7e71b8a70ca1c30f7e4c74d4f518293eb8b35b` |
| seatbelt + 缺 build `accept-r5-missing-0730a` | 临时隐藏 `packages/pi-lane/dist` 后 exit 1，`probe_failed`；ordinary lifecycle failure 优先 | `packages/pi-lane/fixtures/sidecar-dist/dist/security-domain/accept-r5-missing-0730a/manifest.json` | `9bea1d417bedefdea199e221c36138df04184ac2b1108e87cbe0f0b7fc40d1ab` |
| approved preflight `accept-r5-open-pre-0730a` | exit 0，`ok/passed` | `packages/pi-lane/fixtures/sidecar-dist/dist/security-domain/accept-r5-open-pre-0730a/manifest.json` | `dd066ec41bf369cdfde8c55f1c7ae293c568b01885a6a34edee9b0834d4aa7cd` |
| approved full `accept-r5-open-full-0730a` | exit 0，`status:"ok" failures:0` | `packages/pi-lane/fixtures/sidecar-dist/dist/security-domain/accept-r5-open-full-0730a/manifest.json` | `025885e13907a43d525f18119677d2d349785a89f1cad73d781b7866c03e808b` |

缺 build 格在 `finally` 中恢复真实目录，随后 build/gates 全绿。approved full 有 **6 个 resign
rows**；nested / outer sign、deep strict verify 均 exit 0，nested sidecar
`ready → EOF → exit {code:0,signal:null}` 且 `timeouts:[]`，`spctl` 为冻结的 exit 3 /
首非空行 `rejected`。

## 仓库门与稳定性事实

所有矩阵结束、所有 mutation 恢复后，五门逐门独立运行：

| 门 | 最终退出码 | 结果 |
|---|---:|---|
| `pnpm -r build` | 0 | 14/15 workspace scope；desktop Vite build 完成 |
| `pnpm lint` | 0 | ESLint 全绿 |
| `pnpm test` | 0 | **163 files / 1664 tests passed** |
| `pnpm --filter @courtwork/desktop lint:isolation-binding` | 0 | 等级 `none`；扫描 6 份 host / 24 份 pi-lane 源码 |
| `git diff --check` | 0 | 无空白错误 |

测试门的过程事实不抹除：

1. sandbox 首跑为 162 files pass / `sidecar.test.ts` 8 个 localhost 用例统一 5 秒 timeout；
   同文件在明确批准的非受限域独立复跑为 8/8 pass（49 ms），故归因为 loopback bind 域限制。
2. 非受限全跑首轮为 1663 pass / 1 fail：`workspace-write-env.test.ts` 的并发
   characterization 在 `settle()` 后读到空 trace；该精确用例隔离复跑 1/1 pass（24 ms）。
3. 不改代码、不放宽 timeout 后，再做完整非受限全跑得到上述 163/163、1664/1664、exit 0。

第二项是与 R5 七文件改动面无交集的调度敏感性观察，未拿隔离绿替代最终全量门；完整门已另轮
真实闭合。

## 放行理由与保留项

R5 四道 production 闭口分别有 healthy 阳性、真实行为/观察反例、独立 production mutation
转红与恢复后的 384 全绿；历史 76 项按订正后的真实口径全量闭合，另 8 个 strengthened
negative 全部逐行成立；空 assembly、官方来源、600 samples、双 cycle、十件 inventory、
三 execution domains 与最终五门均由验收会话亲跑。

保留但不阻断的两项均已明确边界：

- 实现回执引用的 scratchpad harness 未入 Git，是 evidence-packaging 缺口；本轮独立重建已消除
  对其取信，但后续回执不应再把 untracked scratchpad 称为可复跑交付物。
- `crash.ignored` special branch 的 JSON `caught` 写入顺序滞后一拍；真实 exit 2、具名 failure、
  stdout applied/caught 与健康复证都有区分力，且该文件不在 R5 改动面，故本轮不跨票代修。

**结论：`PI-SIDECAR-DIST-1R5` 在 exact target `6cdb9ba` 上 PASS。** 下一步只可由架构角色消费
本报告决定能力状态与路线；本验收不 merge、不 push 实现链，也不改 `current.md`。

---

# PI-HOST-LOOP-1 独立验收（2026-08-01，拒绝）

对象：exact target `0d4799c872044c196aa74cacc0fcbc0d29012f9f`，其中 code tip 为
`d7f06623acde8cca9cebfc573feb341f1392d320`，冻结契约锚为
`4ceedad16252709d1525c8b574d95830b2e84441`。验收在独立 worktree
`/private/tmp/courtwork-accept-pi-host-loop-1-codex`、分支
`codex/accept-pi-host-loop-1` 进行；没有进入或读取实现 worktree 的 ignored snapshot、cache 或
自报 manifest。实现与验收会话分离。

**最终判定：REJECT。** 最小真实反例已坐实 Node 产品面的路径泄漏与两类 false-success，并在
Rust Host 上得到八枚直接命中 production 方法的红证。尤其 Route A 坏件会在身份门之前读取凭据，
逐字违反冻结件 §四“所有 route-pair 失败必须先于 Keychain read、journal 与 spawn”的次序；这
一项已经是契约级 blocker。其余启动、prompt、预算、protocol、shutdown、resume 与单写者缺口又
分别破坏耐久语义，不能按 `fix-by-acceptance` 由验收者代修。按冻结件 §六与续行纪律，确认决定性
blocker 后停止昂贵的完整 failure matrix；本报告不以未跑完的大数字伪装放行。

## 独立重建与正向 control

- 验收 `dist` 起初不存在；本会话独立安装 frozen lockfile 并执行
  `build:product-sidecar`。snapshot 恰为双官方 Node v22.23.1 runtime 与一件 sealed CJS：
  arm64 runtime `112,928,848` B /
  `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`，x64 runtime
  `115,447,952` B /
  `03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b`，sealed CJS
  `522,649` B /
  `4c09a985f489bbc791686197f44a5303fb1295a657c855d3df679bf776967f6b`；两次构建
  byte-identical。tracked route manifest 为 `1,272` B /
  `79e72a0523e4c24bd1c1c28c89e71b530cb16aa15407899a004701797f37babc`。
- 冻结 arm64 Node 直接运行 production CJS：恰得到
  `ready{capabilities:['case_read']}` 与 `terminal{status:'shutdown'}`，随后 EOF / exit 0，
  stderr 0 B。production bundle 不含 control canary。
- 同一 runtime 运行由 `createProductRuntime` factory 构建的 test-only control CJS：真实完成
  `read` 的 `tool_started → tool_finished:succeeded → turn_finished`，随后
  `completed → shutdown`、EOF / exit 0，stderr 0 B；从案件实物读得 `HT-2024-081`。
  这些阳性证明 Route A 正常样本能启动，不抵消下面的失败判定与 false-success。

## Node 产品面的三枚契约红证

验收临时追加三枚 acceptance-only 测试，运行
`product-case-env.test.ts + product-runtime.test.ts` 得 **3 failed / 69 passed，exit 1**；测试在
取证后已完整移除，target 原测试复跑 **69/69，exit 0**。三枚均直接驱动 production factory/env：

1. **物理案件根泄漏。** 把真实 `caseRoot` 本身作为非法 read 参数时，返回的 `FileError` 把该
   绝对路径保存在 `path`，合并观察为
   `拒绝访问：绝对路径只接受 /case ... /private/.../案卷`。冻结件 §二.1 要求
   `FileInfo.path`、工具结果与安全错误只出现 `/case` 或 `/case/...`；当前错误对象可序列化出
   物理根，canary 断言真实变红。
2. **provider error 被伪成成功。** scripted provider 以 `stopReason:'error'` 结束时，journal
   虽出现 error stop reason，最终 terminal 实际仍是 `{status:'completed'}`，而不是结构化
   `failed/provider_error`。这会把上游失败写成产品成功终态。
3. **政策拒绝被伪成工具成功。** 模型请求 read `/workspace/记录.md`，case-only policy 明确拒绝，
   但 runtime 发布的 `tool_finished.outcome` 实际为 `succeeded`，不是 `denied`。后续 Rust journal
   因而会收到与真实授权结果相反的工具账。

## Rust Host 八枚直接红证

验收临时在 `pi_loop.rs` 测试模块加入八枚反例；每枚以完整测试名单独运行，均真实命中目标
production 方法并 **exit 101**。测试使用计数 credential、scripted leg/spawner 只隔离外部 I/O，
未复制被判状态机；取证结束后整块测试已补丁移除。

| 反例 | target 实际结果 | 违反的冻结事实 |
|---|---|---|
| bad route + counting credential | route 最终拒绝，但 credential read 为 **1**（应为 0） | route 身份门必须先于 Keychain read/journal/spawn |
| `maxTurns=0` start config | 仍执行 **1 次 spawn** | bootstrap/config 闭集须在 journal/spawn 前拒绝 |
| 空白 prompt | records 从 **1 增为 2**，盘上 journal bytes 改变 | prompt trim 非空/容量门须在 `user_prompted` durable 前成立 |
| schema-valid 假 terminal budget | `prompt()` 返回成功并接受 `turns:9/usd:7.5` | 累计预算真值归 Rust journal fold，不能信 sidecar 自报 |
| malformed packet `{` | 返回 protocol error，但 child `terminated=false`，无 durable session terminal | decode/EOF/fault 必须先 fail/fold/reclaim 再停止 outward publish |
| shutdown 后 child exit 7 | `shutdown()` 返回成功并准备落 `session_completed` | nonzero/signal/kill-confirm 失败不得成为 completed |
| resume `priorTurns` 从 1 改为 0 | `load_session()` 仍成功 | prior observed/turns/usd 必须逐值等于 preceding journal fold |
| 第二 Host 打开同一 live session | 第二次 start 成功并继续 spawn/recover | 同一 logical session 必须由 Rust 单写者独占 |

源码对照说明这些并非测试构造错误：`start_inner` 当前顺序是 credential → case-root → route；
`prompt` 先 append `user_prompted` 才由 encoder 暴露非法文本；`expect_packet` 的 decode/EOF/fault
直接经 `?` 逸出；`shutdown` 只特殊处理 `Pending`，随后不论 `Code(7)`/signal 都追加
`session_completed`；journal validator 只核 `session_resumed.previousLeg`，没有把 prior 三值与
前序 fold 比较；Host 也没有 live-session writer/file lock。

## 停止边界、现场恢复与门

- 八枚 Rust 红与三枚 Node 红均为 payload/lifecycle/durability 契约问题，故没有修改 production，
  没有产生 `fix-by-acceptance`。
- 三份临时 tracked 测试改动全部以补丁移除；写报告前 `git status --short --branch` 只剩分支行，
  `git diff --check` exit 0。Node 原定向套件恢复为 69/69。
- 恢复后 `cargo test --lib` 在受限执行域为 147 pass / 3 fail / 1 ignored；三红均是既有 localhost
  bind `Operation not permitted`（cancel endpoint 与两枚 mock endpoint），不是本票新增失败。
  由于契约 REJECT 已成立，未申请提升环境重跑，也未继续 full cargo/root/pnpm 长矩阵。
- 动态 spawn gate 与独立 snapshot 没有被改写；报告之外无 tracked 验收残留。

**结论重申：`PI-HOST-LOOP-1@0d4799c` REJECT。** `current.md` 不更新，
`PI-WRITE-HOST-1` 不得开工；本验收不 merge、不 push，也不启动 WRITE/GUI/DMG/Pages。返修须由
实现角色先闭合上述契约，再交另一全新会话从 clean worktree 复验。

---

# PI-HOST-LOOP-1R 独立复验（2026-08-01，拒绝）

对象：exact target `fa9e2f892fac45acde2b5bef4ae9e3f1ec759a9a`，其中 implementation tip 为
`6f3a337`，本轮冻结契约与组合基线为 `main@70dae96097710afedb3dfeb4b93abd6ccaa7de8d`。
验收在独立 worktree `/private/tmp/courtwork-accept-pi-host-loop-1r-codex`、分支
`codex/accept-pi-host-loop-1r` 进行；未进入或读取实现 worktree，也未消费实现者 ignored snapshot、
cache 或自报 manifest。实现与验收会话分离。

**最终判定：REJECT。** 十一枚返修常驻测试与正向 Route A controls 本轮均绿，但冻结契约仍有四类
可复现反例：N2 明定的 `aborted → canceled` 被写成 `failed/unknown`；R2 没有在 I/O 前执行 bootstrap
上界闭集，`maxTurns=13` 已实际 spawn；journal 接受孤儿 usage 与倒序 observed turn；新增的 verified
Node hard gate 对同尺寸 runtime 篡改及 symlink 假绿。前三类是产品语义/耐久语义违约，第四类使原票
门 3/4 不能证明它运行的是冻结 runtime。它们都不是验收者可代修的实现级小缺陷。

## 独立重建与正向 controls

- 验收 worktree 的 `dist/product-sidecar` 起初不存在。本会话独立执行 frozen-lockfile install 与
  `build:product-sidecar`；第二次构建报告 `reused-identical`。snapshot 为 arm64 runtime
  `112,928,848` B /
  `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`、x64 runtime
  `115,447,952` B /
  `03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b`、sealed CJS
  `523,057` B /
  `b72fe521439022c494477b2d41bc7b230d6aa5df2bde8668dba248d3cbf4107d`。tracked route manifest
  SHA-256 为 `c74ecd1878dd7105fb5ea19112cbf921f205eec7bbb3a9dff71f746524c3a2f0`。
- 非受限域 `pnpm --filter @courtwork/pi-lane test` 为 **14 files / 443 tests passed**；
  `test:product-sidecar` 为 **10/10**。独立仓外脚本复核 N1 物理根、`/workspace` 与 `../` 均固定投影
  `（非法路径）` 且零泄漏；N2 的 `stopReason:error` 得 `failed/provider_error`；N3 越界 read 的
  `details.denied === true`。
- production verified-node gate 为 **10/10**；scripted control gate 为 **14/14**，双 read 的 outcome
  恰为 `['succeeded','denied']`。缺 runtime、bundle、manifest，以及 bundle bytes/SHA 漂移都能
  exit 2。这里先登记健康路径；其 runtime 身份 false-green 见下文 blocker 4。
- Rust 常驻 R1–R8 八枚逐名实跑 **8/8 pass**；`pi_loop` 为 29 pass / 1 ignored，
  `pi_loop_journal` 为 20/20，`pi_loop_process` 为 16/16。受限域 `cargo test --lib` 为
  155 pass / 3 fail / 1 ignored；三红仍是 localhost bind 的 `Operation not permitted`，不是本票
  代码回归。阳性与常驻反例都绿，证明返修覆盖了报告中的原形，但不抵消下面独立扩边所得红证。

## Blocker 1：N2 的 `aborted` 没有走 canceled

返修件 §二 N2 逐字规定：上游 `stopReason:'error'` 收 `failed/provider_error`，`'aborted'` 走
canceled 路径；一切非 `stop|toolUse` 不得 completed。本轮用临时 faux provider 真实发
`stopReason:'aborted'`，观察序列为 `ready → agent_event(turn_finished, aborted) → terminal`，但
terminal 实得：

```text
{status:'failed', error:{code:'unknown', retryable:false}}
```

而不是 `canceled`。`product-runtime.ts` 的 `completionFor()` 只特判 `error`，其余 default 固定
返回 `failed/unknown`；当前常驻 N2 只测 `error` 与 `length`，没有钉住票面 `aborted` 分支。临时
动态脚本取证后已删除，tracked tree 无残留。这是 1R 自己明列的 N2 闭口未完成，单项足以拒绝。

## Blocker 2：R2 bootstrap 上界在 spawn 后才失败

ADR-022 冻结 `maxTurns` 为整数 `1..12`、`maxUsd` 为 `null` 或 `0 < n <= 100000`，`modelId` trim
后最多 256 UTF-8 bytes，并要求长度边界在 Rust 发包前校验。返修件又要求所有 bootstrap/config
非法值在 journal/spawn 前以具名错误拒绝。当前 `validate_start_config()` 只检查
`maxTurns >= 1`、`maxUsd > 0 && finite`、`modelId` 非空，漏掉三项上界。

本轮把常驻 R2 表临时扩入 `maxTurns=13`，两次取证分别钉住外观与副作用：

1. 原断言顺序下，实得 `Protocol(InvalidSchema)`，不是 `invalid_config`，证明错误拖到后置 packet
   encoder；
2. 把 spawn 断言前置后，实得 `spawns left: 1, right: 0`，证明非法配置已经拉起 child。

`maxUsd=100001` 与 257-byte `modelId` 从源码走同一漏检路径；本报告不把源码推演冒充额外动态数字。
临时测试已精确移除，`pi_loop.rs` 恢复 target SHA-256
`1bb635183f1b3a8f092c70e847cf249d54855ebe4bd709c031db043dd3133b96`。

## Blocker 3：不可能的 durable turn 历史被当成可恢复 session

原票/ADR 要求 observed upstream turn 从 1 开始跨 prompt/leg 严格递增；已 LF 完整但次序不可能或
`turn_finished ↔ turn_usage_recorded` 非尾端半对的 journal 必须整份 quarantine。本轮在
`pi_loop_journal.rs` 的 test module 临时加入两枚直接驱动 `load_session` 的反例，均真实
**exit 101**：

| 反例 | 完整 LF 历史 | target 实际结果 |
|---|---|---|
| orphan usage | `session_started → user_prompted → turn_usage_recorded → prompt_completed → session_interrupted`，没有对应 `agent_event.turn_finished` | 期望 quarantine，实得 `LoadedJournal`；`priorObservedTurns=1`、`priorTurns=1`、`repaired=false` |
| descending ordinal | 完整 event+usage pair 的 turn 依次为 `2 → 1` | 期望 quarantine，实得 `LoadedJournal`；`priorObservedTurns=2`、`priorTurns=2`、`repaired=false` |

源码原因与红证一致：`validate_records()` 对 turn 只取 `observed_turns.max(turn)` 并累计 counted，既不
要求从 1 起也不要求严格递增；`plan_turn_usage_repair()` 只从 `AgentEvent::TurnFinished` 向 usage
查找，没有反向拒绝孤儿 usage。两枚临时测试已精确移除，`pi_loop_journal.rs` 恢复 target
SHA-256 `8396d690fe7e31d5fa21256453942ae9a67b7d81ee493a04df41a6e06b1da897`。

## Blocker 4：新增 verified-node hard gate 对 runtime 身份假绿

返修件「三·补」把 `verified-node-gate.mjs` 纳入 tracked 实现，目的正是让原票门 3/4 从可复核的
冻结 Node 身份上运行。当前 resolver 对 sealed CJS 检查 bytes + SHA，却对 runtime 只比较 bytes；
`requireFile()` 又用跟随 symlink 的 `statSync()`。本轮逐枚改 ignored snapshot、实跑、恢复：

- 把 arm64 runtime 最后一字节 XOR，文件长度不变但 SHA 已漂移，production gate 仍
  **10/10、exit 0**；
- 把 runtime 换为 symlink，gate 同样通过；
- 删除或修改 manifest 的 `routeId`、`nodeVersion`、`useCodeCache`、`resourceRelativePath`，gate
  仍通过。

每次注入后均恢复 snapshot；最终两 runtime 与 CJS SHA 回到本报告首节值。Rust production
preflight 的其他测试不能替代门 3/4 对“本次实际执行哪枚二进制”的证明，因此这不是普通测试增强
建议，而是硬门可 false-green。另有一项同源漂移：builder 回执仍写
`pi-sidecar/sidecar.cjs`，而 tracked manifest、Tauri mapping 与 Rust 冻结的 resource path 是
`pi-loop-resources/sidecar.cjs`。

## 停止边界、现场恢复与结论

- 四类 blocker 中前三类已直接违反产品/耐久契约，第四类违反本返修新增 hard-gate 目的；验收会话
  没有作 `fix-by-acceptance`，也没有改任何 production 或合同。
- 所有临时 Node/Rust 反例与 snapshot mutation 均已删除或 byte-identical 恢复。写报告前
  `git status --short --branch` 只显示分支行，`git diff --check` exit 0；报告之外无 tracked 残留。
- 决定性 blocker 成立后按原票停止边界，没有继续耗费完整九门/root 长矩阵，也不拿常驻测试数字
  替代遗漏契约的动态反例。

**结论重申：`PI-HOST-LOOP-1R@fa9e2f8` REJECT。** `current.md` 不更新，
`PI-WRITE-HOST-1` 继续不得开工；本验收不 merge、不 push，也不启动 WRITE/GUI/DMG/Pages。返修须由
实现角色先闭合上述契约，再交另一全新会话从 clean worktree 复验。

---

# PI-HOST-LOOP-1R2 独立复验（2026-08-02，拒绝）

对象：exact target `1ab9c0313cd68e03c4ff3a19b948ca8cf1d7c769`，其中 implementation tip 为
`b4175eafb69b5eb2d79c58a3d0bea66bde256b6b`，组合链 parent 为
`d42ba8b53f0b9334bf62d0ad5ec2b2ae8e27f790`，冻结契约所在 main 为
`bee7c79fc3a6ed00b6bb7ab8debb184f31cf63ad`。验收在独立 worktree
`/private/tmp/courtwork-accept-pi-host-loop-1r2-codex`、分支
`codex/accept-pi-host-loop-1r2` 进行；没有进入或读取实现 worktree，也没有消费实现者 ignored
snapshot/cache。实现与验收会话分离。

**最终判定：REJECT。** 1R2 明列的 `aborted`、三项配置上界、journal 不可能历史与三类 runtime
身份反例都已转成常驻绿测；但原票与 1R 保持有效的 bootstrap 闭集仍漏掉 `apiKey/caseRoot` 长度门，
其中 8193-byte key 会先落 journal、拉起 child，最后才报 protocol error。verified-node gate 也只让
sealed CJS 与被判 manifest 自洽，没有独立冻结 `bundle.bytes/sha256`，故 bundle 与 manifest 同步
篡改可 false-green。两项都命中 production-used 路径与冻结契约，不属于验收者可代修的小缺陷。

## 独立重建与正向 controls

- 新验收 worktree 的 `dist/product-sidecar` 起初不存在；本轮独立安装 frozen lockfile、执行
  `build:product-sidecar` 并复跑得到 `reused-identical`。snapshot 为 arm64 runtime
  `112,928,848` B /
  `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`、x64 runtime
  `115,447,952` B /
  `03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b`、sealed CJS
  `523,235` B /
  `75eff9b9c6089b613e85638a2f7a1b3159c1df08bd5439eb1db9978e6d65399b`；tracked route manifest
  SHA-256 为 `590827f328ee9d8c24b84e3a32935005cb8a7abf6b79855988a300f9c1a0f19e`。
- 非受限域 `pnpm --filter @courtwork/pi-lane test` 为 **14 files / 448 tests passed**；受限域先跑的
  8 红全是 `sidecar.test.ts` localhost 5 秒 timeout，非受限完整复跑消失。builder 为 **10/10**，
  verified-node 常驻注入为 **5/5**，production gate 为 **10/10**，scripted control gate 为
  **14/14**；control 双 read outcome 恰为 `succeeded/denied`，两门均用上述新 runtime/CJS 身份。
- C1 定向 `aborted` 反例与 canceled 优先级回归均绿：terminal 为
  `canceled{reason:'host'}`，且已有 cancel/预算/effect 优先级未回退。C2 现有 R2 七行表全部
  `invalid_config + journal absent + spawn=0`；C3 `pi_loop_journal::tests` 为 **21/21**，包含
  descending/orphan/cross-request quarantine，跨 prompt/leg 累计预算正向用例亦绿。这些 controls
  证明票面四枚原形已修，不抵消下面的扩边红证。

## Blocker 1：bootstrap 长度闭集仍在 journal/spawn 后拒绝

ADR-022 冻结 `caseRoot` 非空且最多 4096 UTF-8 bytes、`apiKey` 非空且最多 8192 UTF-8 bytes，
并要求全部长度边界在 Rust 发包前与 sidecar 收包后各验一次。1R R2 又要求 bootstrap/config 的
非法值在 journal/spawn 前以具名错误拒绝；1R2 §一/开头明确原票与 1R 全部合同原样有效、只收紧
不回退。当前 `validate_start_config()`（`pi_loop.rs:218-237`）只核
`maxTurns/maxUsd/modelId`；`caseRoot` 先进入 lstat，credential 解析出的 `apiKey` 则经过 journal
append 与 spawn 后才由 packet encoder 的 `MAX_API_KEY_BYTES` 拒绝。

本轮临时加入 production Host 反例并逐枚 exact 运行：

| 反例 | target 实际结果 | 契约期望 |
|---|---|---|
| `apiKey = 'k' × 8193` | `spawns=1`、`journal_exists=true`、`Err(Protocol(InvalidSchema))`；测试 exit 101 | credential 解析后、journal/spawn 前具名 `invalid_config`，零副作用 |
| 4097-byte 绝对 `caseRoot` | `validate_start_config() = Ok(())`；start 得 `Err(CaseRoot("案件根不可 lstat"))`，测试 exit 101 | 长度闭集先报 `invalid_config`，不得拿文件系统外观代替配置门 |

第一枚同时钉住错误外观和真实副作用，单独已足以拒绝；第二枚证明漏项不只 credential。1R2 新加的
三项上界常驻表全绿，只覆盖了本轮新列出的 `maxTurns/maxUsd/modelId`，不能删去仍然有效的原合同。
临时测试块已精确移除，`pi_loop.rs` 恢复 target SHA-256
`2588f86e02af308fd85de41d4efabd8029f628a834cd48eef101f3aa013258f0`。

## Blocker 2：bundle 与 manifest 同步漂移仍可过 verified-node 门

1R2 C4 要求 manifest closed-decode 后逐值核
`schemaVersion/routeId/nodeVersion/useCodeCache/bundle/targets` **全部冻结值**，判据不得从被判物
自取。当前 `FROZEN_ROUTE.bundle`（`verified-node-gate.mjs:60-66`）只含
`resourceRelativePath`；文件注释在 `:145` 明说 `bundle.bytes/sha256` 不冻结，
`assertManifestFrozen()`（`:147-163`）也只比较 path。resolver（`:230-235`）再把 CJS 实物的
bytes/SHA 与同一份被判 manifest 比较，形成“对象与自报一致”而非“对象等于独立真值”的门。

本轮在 `/private/tmp` 合成 app-layout，保持 runtime 与其他冻结字段正确，只把 sealed CJS 换成
29-byte 新实物，并把 manifest 的 `bundle.bytes/sha256` 同步为
`29` / `7afe7c3e922a2eb1d8fdb7534e2a4d1c9794d56382018f2a479c7bd3736fd5f6`。调用
production resolver **exit 0，实得 `FALSE_GREEN`**，返回的 bundle SHA 与被改 manifest 完全相同。
常驻 C4 mutation 表虽为 5/5，却只变异 runtime、symlink 与 route/target 字段，没有覆盖
bundle identity 的同步漂移。临时脚本与 fixture 已删除，真 snapshot 未变。

## 偏离追认、停止边界与现场恢复

回执 §五的六项登记偏离本轮逐项复核，均可追认：C3 合法绿测补真实配对、独占 gate script、
builder 资源目录同源常量、`GateFailure + invokedDirectly` 注入装置、旧→新身份归因注释，以及额外
M10 状态机变异；它们没有扩张 wire/contract，也不是本次拒绝原因。

- 两枚 blocker 均在临时注入下直接变红；验收会话没有修改 production、合同或测试来代修。
- 所有临时 Rust/Node 反例与合成 fixture 均已删除；两份 Rust 源码恢复 target hash，snapshot
  （`pi_loop.rs` 为 `2588f86e02af308fd85de41d4efabd8029f628a834cd48eef101f3aa013258f0`，
  `pi_loop_journal.rs` 为 `116b0ee1eb2fe57120ca1deb8e971a557db090e0cf7772e9fd48248284f4b407`），
  snapshot 复核为本报告首节身份。写报告前 `git status --short --branch` 只显示分支行，
  `git diff --check` exit 0，报告之外无 tracked 残留。
- 决定性违约成立后依冻结件停止边界，没有继续虚耗 full cargo/root 九门长矩阵；已跑 controls
  只说明已覆盖部分健康，不作为遗漏契约的替代证明。

**结论重申：`PI-HOST-LOOP-1R2@1ab9c03` REJECT。** `current.md` 不更新，
`PI-WRITE-HOST-1` 继续不得开工；本验收不 merge、不 push，也不启动 WRITE/GUI/DMG/Pages。返修须由
实现角色闭合上述两项后，再交另一全新会话从 clean worktree 复验。

---

# PI-HOST-LOOP-1R3 独立复验（2026-08-02，拒绝）

对象：exact target `51369e4d7143497d3c8a4e9c3af3f20e44893d79`，implementation tip
`51c823f`，组合基线 `5396ad8`；票面冻结于 `main@7992b3a`，验收时 main 为 `56822a9`，后者只另加
`PI-WRITE-HOST-1` 前向债。验收在独立 worktree
`/private/tmp/courtwork-accept-pi-host-loop-1r3-codex`、分支
`codex/accept-pi-host-loop-1r3` 进行；没有进入或读取实现树，也没有消费实现者 snapshot/cache。
组合基线的十二枚证据链经 `git cherry` 复核为 patch-id 12/12 等价。

**最终判定：REJECT。** D2 的 tracked-manifest expected side 与三类同步漂移已闭合；D1 当前生产
也确实会拒绝坏 `requestId`。但 1R3 的完成态不是“今天实现里恰有一道门”，而是“该族闭集被手写
清单穷举，且覆盖本身有机器自证”。当前所谓完整 D1 清单漏掉 host→sidecar prompt header 的
`requestId`；临时撤掉唯一 production 门后，清单、MAX ledger 与既有 prompt 常驻测试全部继续绿。
这正是本票 §零要消灭的“下一轮再找到一个同族兄弟”，故属于票面自证合同未完成，不是验收者可
代补的小测试缺口。

## 独立 snapshot 与健康 controls

- 新 worktree 起初没有 `dist/product-sidecar`。本会话从该树安装 frozen lockfile 并执行
  `build:product-sidecar`，自建 snapshot；sealed CJS 为 `523,235` B /
  `75eff9b9c6089b613e85638a2f7a1b3159c1df08bd5439eb1db9978e6d65399b`，arm64 runtime 为
  `112,928,848` B / `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`，
  x86_64 runtime 为 `115,447,952` B /
  `03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b`；tracked manifest 为
  `1,272` B / `590827f328ee9d8c24b84e3a32935005cb8a7abf6b79855988a300f9c1a0f19e`。
- `test:verified-node-gate` 为 **8/8**；production gate 与 scripted control 均 exit 0。独立
  `/private/tmp` CoW layout 的 bundle+manifest 同步漂移、arm64 runtime+manifest 同步漂移、
  layout manifest 冻结字段漂移三类反例均在 tracked-vs-layout byte identity 门真实变红，fixture
  已清理。D2 的 expected side 确为 tracked manifest，layout manifest 先逐字节相等才允许 decode。
- Rust `pi_loop::tests` 为 **31 passed / 1 ignored**；D1 清单、bounded ledger、config/prompt
  时序的定向正向 tests 均绿。它们证明现有列项健康，但不能替代下文对自证盲区的 mutation。

## Blocker：D1 的 SafeToken 族漏 `requestId`，撤门后全套自证假绿

ADR-022 六-B.1 明列
`containerId/grantId/sessionId/requestId/operationId/eventId/toolCallId` 共用 SafeToken；prompt 是
host→sidecar 闭集，且 `requestId` 是其公共 header 上的非空 SafeToken。当前
`PiLoopHost::prompt()` 在 `pi_loop.rs:678` 用 `is_safe_token(request_id)` 前置拒绝，语义本身正确；
但 `bounded_input_manifest()` 的十行只列 `containerId/sessionId/grantId` 三枚 SafeToken 输入，
没有 `requestId`。另一道 scanner 只枚举 `MAX_*` 常量，而 SafeToken 判据是函数、没有可被它发现的
`MAX_REQUEST_ID_*`，所以两道证明共享同一盲区。

验收先以临时 test 构造 `requestId = 'r' × 129` 与 `bad/id`：原 target 均在
`user_prompted`/send 前以 `invalid_ref` 拒绝，journal bytes、内存 records 与 writes 不变。随后只
临时撤掉 `prompt()` 的三行 `is_safe_token(request_id)` production guard，命中数恰一；实跑结果：

| 常驻证据 | 撤门后的结果 |
|---|---|
| `counterexample_every_bounded_host_input_is_refused_before_journal_and_spawn` | **PASS（假绿）** |
| `bounded_constant_ledger_matches_the_source_and_covers_every_frozen_bound` | **PASS（假绿）** |
| `counterexample_prompt_gate_runs_before_the_user_prompted_append` | **PASS（假绿）** |
| 独立 requestId 扩边 probe | **exit 101**；实得 `protocol`，期望 `invalid_ref` |

因此现有机器证据既不能证明 SafeToken 前置闭集完整，也不能在删除已存在的同族门时报警。cancel 只
复用已验证 active request、shutdown 为 null；当前 host 不生成 `host_result`，event/toolCall 是
反方向，均不改变 prompt `requestId` 是本票当前 production-used 漏项这一事实。

## D3 清账与偏离复核

- `MAX_*` scanner 的四模块范围与仓库 production 使用面相符，15 枚声明常量、39 行 ledger 的
  定向测试通过；五枚当前不适用的 host-result/list/logical-path 项均有理由，且已在
  `main@56822a9` 挂为 `PI-WRITE-HOST-1` 开工必偿债。本轮按架构交接口径接受该前向登记。
- 表②的 Rust decoder 期望是源码内手写闭集键/范围，未从被判 manifest 派生；本票 D3 要求登记
  expected source，不另要求复制第二份 decoder 真值表，故该行的“独立”分类不作为拒绝理由。回执
  §七八项偏离也都在白名单与只收紧范围内，可追认。
- 回执仍有须订正的事实误差：`bounded_input_manifest()` 实为 **10 行 / 28 枚反例**，不是
  “9 行 / 26 枚”；39 行 ledger 实为 **12 Fronted + 27 Other**，不是 “11 + 28”；所称完整表
  `12-d3-table1.md` 也不在 exact target，当前可核的完整真源只有 Rust 函数。这些不另立第二枚
  blocker，但下一轮回执必须据实修正，不能继续拿错误计数宣称穷举完成。

## 停止边界、恢复与结论

- 决定性 D1 blocker 成立后，按票面停止边界没有继续虚耗 full cargo/root 九门长矩阵；已跑的
  D2/Rust controls 只登记健康范围，不抵消覆盖自证假绿。
- 临时 requestId test、production mutation、CoW layout 与依赖 symlink 均已移除；
  `pi_loop.rs` 的 blob 恢复为 target 的
  `5ae2a107f478fb8306c2e638359bafb21a021a59`，报告落笔前 `git diff --check` 为零，报告之外无
  tracked 残留。验收没有作 `fix-by-acceptance`，也没有改 production 或合同。

**结论重申：`PI-HOST-LOOP-1R3@51369e4` REJECT。** `current.md` 不更新，
`PI-WRITE-HOST-1` 不得开工；本验收不 merge、不 push，也不启动 WRITE/GUI/DMG/Pages。返修至少须
把 `requestId` 纳入手写族清单与双轴常驻反例，并让删除其前置门的 mutation 真实变红；订正 D3/回执
计数后，再交另一全新会话从 clean worktree 复验。

---

# PI-HOST-LOOP-1R4 独立复验（2026-08-02，拒绝）

对象：exact target `d4163df2adfc3e481b0ccecad09728be918f509b`，implementation tip
`a204d139e44edd4d4ec6807be01fdcec2b4cedd4`，组合基线
`f20e27696c718bba79775c4742a5f89b7b20fee4`；票面冻结于 `main@157407a`。验收在独立
worktree `/private/tmp/courtwork-accept-pi-host-loop-1r4-codex`、分支
`codex/accept-pi-host-loop-1r4` 进行；未进入或读取实现树，十五枚证据链经 `git cherry` 复核为
patch-id **15/15** 等价。

**最终判定：REJECT。** 本轮指名的 requestId 门、SafeToken 七成员清账、M1–M4 与 E2 真源订正
都成立，D2/D3 也没有回退；但 E1 的完成态仍未达到“扫描谓词与受验输入族同宽”。当前 scanner
只识别三枚手写函数名、`MAX_*` 与 `.trim()`，看不见协议里已经存在的 wire-string NUL 格式门。
`modelId`、`apiKey` 与 prompt `text` 含 NUL 时均越过应在 append/spawn 前完成的 Host preflight；
前两者已落 `session_started`（apiKey 本体仍不落账）并 spawn，prompt 则已落 `user_prompted`，
最后才由 encoder 回灌 decoder 报错。故本轮唯一决定性 blocker 同时有**现存契约成员＋production-used
副作用＋覆盖装置假绿**三轴证据，不依赖假设未来会新增什么规则。

## 独立基线、快照与健康 controls

- `f20e276..a204d13` 只改 `apps/desktop/src-tauri/src/pi_loop.rs` 的 test module；生产前缀在
  base/implementation/target 逐字节相同，SHA-256 均为
  `44a7ff55ecef4a0dfca5706c2b7fb4acbe18704fa6764017109076d66f29f33a`。
  `a204d13..d4163df` 只追加本票回执，`ACCEPTANCE.md` 在实现树零触碰。
- 本验收自建 product snapshot：sealed CJS `523,235` B /
  `75eff9b9c6089b613e85638a2f7a1b3159c1df08bd5439eb1db9978e6d65399b`；arm64 runtime
  `112,928,848` B / `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`；x64 runtime
  `115,447,952` B / `03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b`；
  tracked manifest `1,272` B /
  `590827f328ee9d8c24b84e3a32935005cb8a7abf6b79855988a300f9c1a0f19e`。Route A 身份无漂移。
- 独立实跑：pi-lane Vitest **14 files / 448 passed**；Rust **162 passed / 0 failed / 1 ignored**，
  其中 `pi_loop::tests` **32 passed / 0 failed / 1 ignored**；builder **10/10**、verified-node gate
  **8/8**、production gate **10/10**、scripted control **14/14**、isolation **43/43**，desktop
  isolation lint 与 `git diff --check` 均绿。全仓 `cargo fmt --check` 的 56 hunk 全属既有五文件，
  本票 `pi_loop.rs` 定向 rustfmt 为绿。

这些 controls 证明现有列项健康，不替代下面对 E1 自证闭集的反例。

## E1 指名闭口与 E2 复核

requestId 两形态反例会在 `user_prompted`/send 前以 `invalid_ref` 拒绝，journal bytes、内存 records、
writes 三不变。验收自行实注并逐枚恢复四枚 mutation：

| mutation | 独立结果 |
|---|---|
| M1 撤 requestId production 门 | exit 101，ledger 锚点与 requestId 行为反例共 2 failed |
| M2 扫描轴回退到只认 `MAX_*` | exit 101，函数型判据行全部失锚 |
| M3 删除 requestId manifest 行 | exit 101，清单外门与 SafeToken 清账共 2 failed |
| M4 同时撤 production 门并删清账行 | exit 101，manifest 正向锚与行为反例共 2 failed |

四枚均命中、定向红、零等价；这部分 PASS。SafeToken 七成员以及 cancel/shutdown 两条现状理由也
逐行有据。E2 计数从 exact target 真源重算：1R3 为 manifest **10/28**、ledger
**12 Fronted + 27 Other**；1R4 为 **11/30**、**22 Fronted + 37 Other**，与回执订正一致。
回执引用的清账真源均在树内，八项偏离可追认，不构成拒绝原因。

## Blocker：现存 NUL 格式门不在扫描族内，三类 Host 输入后置失败

ADR-022 六-B.1 冻结“所有 wire 字符串不得含 NUL 或 lone surrogate”；R4 E1.2 要求扫描
host 方向生产段的格式判据（列举项前写的是“至少”），并明确“生产段出现清单外的受验门即红”。
workflow 同批补正又把受验输入展开为“常量上界门＋格式门＋非空门…”，禁止用语法标记反过来
定义族。

R3 D1 的旧句只点“冻结上界或非空/形状”，但 R4 正是对此扫描轴作补正，并用“格式判据、至少”
和“格式门…”显式扩宽族；本验收以较新的 R4 条款为准，不能把未写在三枚示例名字里的既有格式门
静默降成 `Other`。若架构意图排除 decoder-only wire-scalar，须另在票面具名排除，不能由实现的
hardcoded allowlist 代替该裁定。

仓库里这道门不是推演：`pi_loop_protocol.rs::scan_string()` 对 `unit == 0` 具名返回
`InvalidSchema`；直接打 `scan_json` 的 `\u0000` fixture 常驻反例为 **1 passed**，源码另证
`encode_packet_line()` 序列化后会回灌同一 decoder。但 Host 前置层只做：

- `validate_start_config()`：modelId trim/长度，caseRoot 非空/长度/shape；
- `validate_api_key()`：trim/长度；
- `prompt()`：requestId SafeToken、text trim/长度。

1R4 的 `PREDICATE_JUDGMENTS` 则仍是
`[is_safe_token,is_safe_container_token,is_absolute_path_shape]` 三枚硬编码名字，另特判
`.trim()`；inline `unit == 0` 既不进 scanner，也不进 ledger/manifest。验收临时加入一枚只记录
production-used 结果的 NUL 探针，实跑 **1 passed / 163 filtered**，原始状态变化为：

| 输入 | target 返回 | spawn | durable journal / 内存 records | sidecar writes |
|---|---|---:|---|---:|
| `modelId = "m\0x"` | `Protocol(InvalidSchema)` | `0 → 1` | `0 B → 563 B`；`0 → 1` | `0 → 0` |
| `apiKey = "k\0x"` | `Protocol(InvalidSchema)` | `0 → 1` | `0 B → 564 B`；`0 → 1` | `0 → 0` |
| prompt `text = "p\0x"` | `Protocol(InvalidSchema)` | 已为 1 | `564 B → 784 B`；`1 → 2` | `1 → 1` |

前两枚先 durable `session_started`、再 spawn，bootstrap encoder 才拒；第三枚先 durable
`user_prompted` 并占用 requestId，prompt encoder 才拒。Host 对外只保留
`Protocol(InvalidSchema)`；另行直调 codec 得到的 rejection reason 恰为
“wire 字符串必须是不含 NUL 与 lone surrogate 的 Unicode scalar 序列”。这与 R3 首红中“先落账/
spawn、再由 encoder 拦”的机制同形，也证明 NUL 是当前实际闭集成员，而不是为验收杜撰的新契约。

覆盖装置的结构反例与动态结果一致：验收临时在 `validate_start_config()` 加一条不命中既有 fixture
的 `model_id.contains('/')` 格式门，不登记 ledger/manifest；ledger 常驻与 D1 全反例常驻仍各自
**1 passed**。本项只用来证明 hardcoded syntax allowlist 的 false-green 机制；决定性结论本身由
上述既有 NUL 契约与真实副作用承担。

## 停止边界、恢复与结论

所有 M1–M4、NUL probe 与 scanner 结构反例均已精确拆除。报告落笔前 `pi_loop.rs` 恢复 target
blob `89a97c98ef7811a72cc70917a20428440153c45b`、SHA-256
`f84d265ab2e0076a3feb8c2160271bd5b62dfd76c4669f2e7714e376b35c12d1`；`git diff --check`
与报告外 tracked diff 均为零。验收没有代修 production、测试或合同。

**结论重申：`PI-HOST-LOOP-1R4@d4163df` REJECT。** `current.md` 不更新，
`PI-WRITE-HOST-1` 不得开工；本验收不 merge、不 push，也不启动 WRITE/GUI/DMG/Pages。
**[需架构拍板]** 返修前须先在票面裁定 wire-scalar/NUL 在 E1 的归属：若属 `Fronted`，纳入 D1
显式清账与 Host 前置边界；若属 codec `Other`，则须具名写出允许上述 durable 副作用的依据，并让
scanner/ledger 至少能发现、登记这道现存格式门。两路都不能继续由三枚函数名字面量静默决定族；
裁定与实现完成后交另一全新会话从 clean worktree 复验。

---

# PI-HOST-LOOP-1R5 独立复验（2026-08-02，拒绝）

对象：exact target `a08225752e76ee1f42853760ef6f4456b5422cee`，implementation tip
`3f0bc6fa92318a6dfa7803d2d55c9b5a6d5dbb58`，组合基线
`84f0710cbfa05a0666570832f9fbc06141f04591`；票面冻结于 `main@bb20cef`。验收在独立
worktree `/private/tmp/courtwork-accept-pi-host-loop-1r5-codex`、分支
`codex/accept-pi-host-loop-1r5` 进行；未进入或读取实现树。十九枚证据链逐枚比较 patch-id，结果
**19/19 等价**；`84f0710..3f0bc6f` 只改 `apps/desktop/src-tauri/src/pi_loop.rs`，回执提交只改
`packages/pi-lane/specs/PI-HOST-LOOP-1R5.md`（写作时路径；该件已于 2026-08-05 随批移入
`archive/pi-lane-receipts-2026-07-28--08-05/PI-HOST-LOOP-1R5.md`——**史料线索**），`ACCEPTANCE.md` 与
`current.md` 在目标树零触碰。

**最终判定：REJECT。** G1 的四道 NUL production 门、四类副作用边界以及撤门阳性 mutations
均成立；但 G2 的完成态仍不是“枚举全部拒绝分支，unknown 判红”。当前
`scan_refusal_branches()` 只寻找字面 token `return Err(`。验收把票面指定的 M4——
`model_id.contains('/')` 未登记门——保持语义不变，仅改用合法 Rust 等价构造
`return Err::<(), HostError>(...)`；新增分支编译、rustfmt 均绿，却完全不进入扫描集，G2 轴、
bounded ledger、既有行为反例和完整 pi-loop 测试全部 **FALSE_GREEN**。这正是 1R5 §零裁定要
永久消灭的“语法标记定义族”，不是未来规则推演，也不是普通测试增强建议。

## 独立事实、snapshot 与健康 controls

- `pi_loop.rs` production 前缀从基线 `49,093` B /
  `44a7ff55ecef4a0dfca5706c2b7fb4acbe18704fa6764017109076d66f29f33a` 变为目标
  `50,780` B / `67bcfa26238d218fc0cf3f0ea5ec209a2ce887f7a8f7b0650170b33aeea5dfde`；本轮确有 Rust
  production 改动。Node production、route manifest 与三枚宿主接缝相对基线零 diff。
- 本验收从独立树重建 product snapshot。sealed CJS 为 `523,235` B /
  `75eff9b9c6089b613e85638a2f7a1b3159c1df08bd5439eb1db9978e6d65399b`；arm64 runtime 为
  `112,928,848` B / `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`；x64 runtime 为
  `115,447,952` B / `03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b`。
  三件均为 regular file；sealed CJS 与 1R4 身份逐字节相同。
- 独立 Node controls：pi-lane Vitest **14 files / 448 tests**、builder **10/10**、
  verified-node gate **8/8**、production gate **10 PASS**、scripted control **14 PASS**、
  isolation Node **43/43** 与 desktop isolation script 均 exit 0。sandbox 首跑 Vitest 的八枚
  localhost timeout 在非受限完整复跑消失，未冒充产品红。
- exact target 静态重算与回执一致：轴 A **36 行 = 17 HostInput + 19 Other**，轴 B
  **90 行 = 12 Fronted + 78 Other**，bounded ledger 75 行，manifest 11 行 / 34 枚反例。
  这些数量证明当前表自洽，不能证明 scanner 的 population 与“拒绝分支族”同宽。

## G1 正向与撤门阳性对照

验收用临时 probe 逐枚走 production gate，结果如下：

| 输入 | target 返回 | 最早副作用边界 |
|---|---|---|
| `modelId` 含 NUL | `InvalidConfig("modelId 不得含 NUL")` | spawn/journal/write 均零 |
| `caseRoot` 含 NUL | `InvalidConfig("caseRoot 不得含 NUL")` | 先于 shape、lstat；spawn/journal/write 均零 |
| `apiKey` 含 NUL | `InvalidConfig("apiKey 不得含 NUL")` | credential 后、journal/spawn 前；三者均零 |
| prompt `text` 含 NUL | `InvalidPrompt("prompt 文本不得含 NUL")` | journal/records/write 均零增，requestId 未占用 |

阳性 mutation 也真实变红：撤 prompt NUL 门后，行为反例实得
`Protocol(InvalidSchema)`，行为门与轴 A 均 exit 101；只撤 caseRoot NUL 门后，行为反例实得
`CaseRoot("案件根不可 lstat")`，行为门与轴 A 同样 exit 101。恢复后既有
`counterexample_every_bounded_host_input_is_refused_before_journal_and_spawn` 为 1 passed。
因此下节假绿不能归因于测试环境、未编译 mutation 或轴 A 从未能变红。

## Blocker：轴 A 仍由 `return Err(` 的一种拼写定义 refusal family

目标源码的 `scan_refusal_branches()`（`pi_loop.rs:5367-5415`）在每个归属函数块里执行
`body.find("return Err(")`（`:5375`）；找不到就结束该块扫描。所谓 unknown 并没有进入“判红”
分支，而是在成为 scanner population 之前已经被当作“不存在”。回执所称“扫描器内零跳过型
过滤器”不改变这一事实：字面 marker 本身就是隐式 allowlist。

验收从 exact blob 出发，在 `validate_start_config()` 加入票面与回执均指定的 M4 语义：

```rust
if config.model_id.contains('/') {
    return Err::<(), HostError>(HostError::InvalidConfig("modelId 不得含路径分隔符"));
}
```

这只是把实现回执 M4 的 `return Err(...)` 写成标准库 `Err` 构造器的显式泛型形式；函数仍从同一
guard 返回同一 `HostError::InvalidConfig`，没有换判据、site、code 或时序。该写法经 rustfmt 后
稳定，完整测试编译通过；命中核确认新增 `contains('/')` 与 `Err::<(), HostError>` 均在生产段，
而新增分支不含 scanner 唯一识别的 `return Err(` token。实跑结果：

| 证据 | mutation 后结果 |
|---|---:|
| `host_refusal_branches_are_fail_closed_against_the_source` | **1 passed / 0 failed** |
| `bounded_judgment_ledger_matches_the_source_and_covers_every_frozen_bound` | **1 passed / 0 failed** |
| `counterexample_every_bounded_host_input_is_refused_before_journal_and_spawn` | **1 passed / 0 failed** |
| 完整 `pi_loop::tests` | **34 passed / 0 failed / 1 ignored** |
| `pi_loop.rs` 定向 rustfmt check | **exit 0** |

这枚反例不是要求 scanner 预知新判据；恰恰相反，G2 的明文合同就是“前置函数族的全部拒绝分支
判据表达式，未登记即红”，并把同一 `contains('/')` 门列为 permanent mutation。当前装置只对
实现者碰巧采用的 token 拼写 fail-closed，对合法等价 Rust 写法仍 fail-open。轴 B 也使用三枚
marker 字面量并对 `(function, reason)` 去重，但决定性轴 A 反例成立后按停止边界未再注入第二枚
blocker。

## 停止边界、恢复与结论

- 全部 G1 probes、M1/M5 与 G2 等价 M4 均已用 `apply_patch` 精确拆除；没有作
  `fix-by-acceptance`，没有修改 production 或合同来代修。
- `pi_loop.rs` 恢复目标 blob `6cd888fd849bdc20fa8eddc0d9654e7faab19a32`、SHA-256
  `0f3519f2340b667a4385831420bf11c8529ca709f72ec562593cb091e404fca8`；报告落笔前源码 diff 与
  `git diff --check` 均为零，报告之外无 tracked 残留。
- 决定性 G2 自证违约成立后，按票面停止边界不再虚耗 cargo/clippy/root full-build 长矩阵；
  已跑的 G1/Node controls 只登记健康范围，不抵消 coverage apparatus 的假绿。

**结论重申：`PI-HOST-LOOP-1R5@a082257` REJECT。** `current.md` 不更新，
`PI-WRITE-HOST-1` 继续不得开工；本验收不 merge、不 push，也不启动 WRITE/GUI/DMG/Pages。返修须让
scanner population 由 Rust 拒绝结构而非若干源文本 token 派生，并把当前 M4 的等价返回形态转为
常驻定向红；完成后交另一全新会话从 clean worktree 复验。

---

# PI-HOST-LOOP-1R6 独立复验（2026-08-02，拒绝）

对象：exact target `57a19a5f7fabf0315055f3b0b294580ac7ec5132`，implementation tip
`e3118a715887b7dcc5360735792020c97242232b`，组合基线
`601ba56f4c8c2dc9235ddd8176189f3355f31c05`；票面冻结于 `main@4dc8e85`。验收在独立
worktree `/private/tmp/courtwork-accept-pi-host-loop-1r6-codex`、分支
`codex/accept-pi-host-loop-1r6` 进行；未进入或读取实现树。二十二枚证据链逐枚比较 stable
patch-id，结果 **22/22 等价**；`601ba56..e3118a7` 只改
`apps/desktop/src-tauri/src/pi_loop.rs`，回执提交只改
`packages/pi-lane/specs/PI-HOST-LOOP-1R6.md`（写作时路径；该件已于 2026-08-05 随批移入
`archive/pi-lane-receipts-2026-07-28--08-05/PI-HOST-LOOP-1R6.md`——**史料线索**），`ACCEPTANCE.md`、
`current.md` 与 readiness 在目标树零触碰。

**最终判定：REJECT。** fresh start、prompt、cancel/shutdown 的先编码形状与同一份 bytes 复用
成立，H2 的退役/保留边界与 142 枚电池构成也成立；但 `start_inner()` 在真实 bootstrap 编码前
先调用会写盘的 `load_session()`。恢复旧会话时，后者会截断 partial tail、补 usage 或执行 crash
fold。验收加入一条 Host 尚未手抄的 codec-only future rule 后，第二次 start 最终返回具名
`invalid_config`，却已先把 `session_interrupted` durable append：journal **558 B → 790 B**，
spawn `0`、wire write `0`。这直接否定票面“任何 journal append 前编码”、`Err ⇒ journal 字节零增`
以及“∀今日与未来 codec 规则结构性成立”；同步账并未在 resume/recovery 路径上消失。

## 独立事实、snapshot 与健康 controls

- 验收树先在 exact target 保持 clean；target parent=`e3118a7`、implementation parent/base=
  `601ba56`、target/main merge-base=`4dc8e85`。`4dc8e85..main@5642c65` 仅有 WRITE-HOST 前向债的
  readiness 文档一行，不含本票实现，交接坐标成立。
- 独立 frozen install 后自建 product snapshot。sealed CJS 为 **523,235 B** /
  `75eff9b9c6089b613e85638a2f7a1b3159c1df08bd5439eb1db9978e6d65399b`；arm64 runtime 为
  **112,928,848 B** / `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`；
  x64 runtime 为 **115,447,952 B** /
  `03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b`。三件身份与交接一致。
- `pi_loop.rs` production prefix 独立重算为 **55,787 B** /
  `c6cc789aa4ce2f579a190fd5f108d3b6d92297d1b9bd2df19f1b8df95ddc82ea`，与回执一致；Node
  侧 production 零漂移。
- 独立 Node controls：product-sidecar builder **10/10**、verified-node gate **8/8**（同尺寸
  XOR、symlink、manifest 漂移及同步漂移均实注变红）、production gate **10 PASS**、scripted
  control 全 PASS。
- H1 两枚定向 baseline：`the_bytes_validated_before_the_effect_are_the_bytes_put_on_the_wire`
  与 `a_codec_refusal_surfaces_as_a_named_refusal_without_echoing_the_input` 各 **1 passed / 0 failed**。
  它们证明 fresh/正常路径的 bytes 复用与具名零回显映射可达，不替代下节 recovery 反例。

## 成立面：fresh/prompt 两相形状与 H2 装置替换

H1 在正常路径上的形状成立：bootstrap 于 `pi_loop.rs:585-628` 编码，早于本函数自己的
opening append（`:630-632`）与 spawn（`:634-635`）；prompt 于 `:795-806` 编码，早于
`user_prompted` append/内存认领（`:808-817`）与 write（`:819-820`）；cancel/shutdown 共用
只在编码成功后推进 seq 的 `send()`。`write_encoded()` 只搬运 `OutboundLine.bytes`，定向守卫也
确认发出的就是效果前验证过的同一份 bytes。

H2 的完成态按明文合同成立：

- 三枚退役测试及轴 A/轴 B/75 行同步账的 35 枚函数、类型、常量逐名对应授权清单；目标源码
  对这 35 名全文零残留。`#[test]` 数量 parent/target 均为 35。
- D1 手写清单 11 行/34 枚行为反例、G1 四道 NUL 门、SafeToken 七成员与四轴
  `prompt_axis_probe` 均在位。父树主保留段与目标唯一逐字节匹配。
- `violation_battery()` 静态为 **142** 行、10 字段：三枚 token 字段 `3×16`、model `16`、
  caseRoot `19`、apiKey `16`、maxTurns `3`、maxUsd `8`、prompt text `16`、requestId `16`；
  protocol 上界直接 import，SafeToken 上界经实际判据探出。普适 probe 对已拒样本逐项核
  spawn/journal bytes/records/writes/requestId/no-echo，并带一枚合法 control。

一处非阻断事实偏差：回执 §三称保留面 `3,129` 行且 parent `4114–4273` 共 160 行逐字节原样；
实际内容保留到 `4272`，目标少的是测试后的单枚空行，即 **3,128 行内容 + 1 行格式空缺**，行为
零影响，但后续回执应订正。另源码 `pi_loop.rs:211-222` 仍以现在时声称 encoder 在 spawn 后并提及
已退役的“源码扫描双向自证”，属于自陈漂移；它不构成本次 production blocker。

## Blocker：`load_session()` 的 durable recovery 发生在真实编码之前

票面 §零明文要求 Host 在**任何** journal append 与 spawn 前真实编码 exact packet
（`PI-HOST-LOOP-1R6.md:21-27`），并承诺 wire 判据对“今日与未来 codec 规则”结构性成立
（`:37-40`）；普适不变量是 `Err ⇒ journal 字节零增`（`:30-35`）。ADR-022 同样裁定
“journal/spawn 前真实编码”（`ADR-022-pi-lane.md:1267-1271`）。

目标实现的实际顺序是：

1. `start_inner()` 于 `pi_loop.rs:511-521` 调 `load_session()`；
2. `load_session()` 可先截断 partial tail（`pi_loop_journal.rs:2168-2184`）、补
   `turn_usage_recorded`（`:2260-2284`），再调用 crash fold（`:2291-2297`）；open idle leg 的
   step 5 会 durable append `session_interrupted`（`:2588-2603`）；
3. 直到上述动作完成，`start_inner()` 才于 `pi_loop.rs:627-628` 真实编码 bootstrap。

验收从 exact blob 出发作一枚结构性 mutation：只在 protocol 的 bootstrap decoder 为
`provider.modelId` 增加 `contains('/')` 的 codec-only future wire rule，不在 Host 增加/删除手写门。
然后用正常 start 建立一份 leg-open journal，把历史 `modelId` 改成 journal schema 本来允许、且与
二次 config 相同的 `deepseek/v4`，再驱动完整 resume/start。该历史可恢复、不是 malformed/quarantine
样本；唯一新增拒绝来自 exact bootstrap 的真实 codec。focused test 实得：

```text
future-codec-after-load: journal_bytes_before=558 after=790 spawn=0 writes=0 error_code=invalid_config
temporary_future_codec_rejection_after_load_session_writes_before_err ... ok
test result: ok. 1 passed; 0 failed
```

新增 rule 的 code 映射是对的，spawn/write 也确为零；失败点恰在 durable append **之后**：790 B
journal 已包含 `session_interrupted`。因此不是“哪道显式门漏抄”的第七轮实例，而是裁定所依赖的
两相边界仍切在副作用函数之后。回执偏离 5（`PI-HOST-LOOP-1R6.md:360-365`）只实测并披露 fresh
失败会留下零字节 journal/lock，没有披露既有 session 上 `load_session()` 的非零截断、补写与 crash
fold；该偏离不能豁免 §零/ADR 的 broad invariant。

这枚反例也解释为何目标常驻 142 电池照绿：`universal_start_case` 每行都从 fresh harness/session
起步，只观察 `load_session()` 新建的零字节文件；它没有一枚 recoverable existing-session 输入，因而
无法命中编码前的 durable recovery 分支。

## 停止边界、恢复与结论

- codec-only rule 与临时 recovery test 均以 `apply_patch` 精确拆除；没有作
  `fix-by-acceptance`，没有修改 production、测试或合同来代修。
- 恢复后 `pi_loop_protocol.rs` target blob 为
  `47991acb84e09f731d19eb95b315012eacc0a0c6`，`pi_loop.rs` target blob 为
  `fdc75ff91c224020c7eefdc7ce96ea4d7a335d1d`；`git diff --check` 净，报告之外无 tracked diff。
- 决定性 H1 结构违约成立后，按停止边界不再虚耗 cargo/clippy/root full-build 长矩阵；已跑的
  snapshot、Node controls、H1 focused controls 与 H2 静态核验只登记健康范围，不抵消 blocker。

**结论重申：`PI-HOST-LOOP-1R6@57a19a5` REJECT。** `current.md` 不更新，
`PI-WRITE-HOST-1` 继续不得开工；本验收不 merge、不 push，也不启动 WRITE/GUI/DMG/Pages。
**[需架构拍板]** 下一轮必须让 recovery 的“读取/校验/计划”与 durable apply 分相：先从纯投影构造并
真实编码 exact bootstrap，成功后才执行 partial-tail/usage repair/crash-fold/opening append 与 spawn；
或在契约层明确撤回“任何 append”“Err ⇒ 零字节”“∀ future codec rule”三项结构担保并给出新的可验
边界。不能继续以 fresh journal 的零字节读数代替已有 session 的恢复副作用；完成后交另一全新会话
从 clean worktree 复验。

---

# PI-HOST-LOOP-1R7 独立验收（2026-08-03，PASS）

对象：exact target `744c070a1f4fcee61d2a7cca4711643f445b5911`，implementation tip
`f915eea932e022bc9733d79c563833301340d6c5`；独立 worktree
`/private/tmp/courtwork-accept-pi-host-loop-1r7`、branch `codex/accept-pi-host-loop-1r7`。
未进入或读取实现 worktree `/private/tmp/courtwork-pi-host-loop-1r7`。按票面合并读取，§八.9
两项架构追认及两处换靶按已准偏离处理。

## 基线与 sealed snapshot

- `HEAD=744c070`，target/main merge-base=`497a28806d7f8ca737fb20dc54fcca1c01745e50`；
  `ac0d326..main` 为 0 枚。票面 25 枚加 `f915eea`、`744c070`，稳定 patch-id multiset
  **27/27 等同**；frozen install 成功，product build 成功。
- product snapshot inventory 恰三件，无残留 `.product-sidecar.stage-*`：CJS
  `523,235 B`, SHA-256 `75eff9b9c6089b613e85638a2f7a1b3159c1df08bd5439eb1db9978e6d65399b`；
  arm64 `112,928,848 B`, SHA-256 `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`；
  x64 `115,447,952 B`, SHA-256 `03afb3618a2685335209c93f8c34633f8316dbe6cc32196bc19daa1a73852e5b`。
  三件值与 exact target 的 route manifest 逐字段一致；CJS 零漂移。

## J1：两相边界源码审计与 future-rule 双臂

生产源码逐函数复核结论：`pi_loop.rs:527-533` 只调用 `plan_session` 并取内存投影；closed
门 `:535-537`、resume 判定 `:544-595`、exact bootstrap 编码 `:639-640` 均先于
`planned.apply()` `:644`、opening append `:649`、spawn `:652`。`plan_session_locked`
（`pi_loop_journal.rs:2288-2452`）只读完整内存切片、构造 `truncate_to`/usage/crash-fold
完整 `JournalRecord` 计划并折叠投影；`write_staged` 仅在 `PlannedSession::apply`
（`:2213-2245`）中调用。锁、目录、0-byte inode 创建与 quarantine 属票面明示的 inode/账本处置，
不是 journal 内容写入；编码前没有 append、write_all、物理 set_len、修复 apply 或 spawn。

从 exact target blob 临时注入同一 codec-only future rule（`modelId` 含 `/`），同一恢复 journal
及配置做双臂实跑：

| 臂 | journal | spawn | writes | 实得 |
|---|---:|---:|---:|---|
| 实验臂：当前 apply 后置 | 558 → **558** | 0 | 0 | `invalid_config` |
| 对照臂：apply 前移 | 558 → **790** | 0 | 0 | `invalid_config` |

对照复现 558→790 类增长；临时 rule/test 逐字节拆除，生产 `pi_loop.rs`、`pi_loop_journal.rs`、
`pi_loop_protocol.rs` SHA-256 恢复为 `6889bc39a5d3baac774cbe08d5ddc35ea3528913bb7ef8f4168c103eae065372`、
`ac96253538fb5111077e1ae4edc67f1814044518c7d81c6f658515282f595ac5`、
`f9b47ddc6b7cba7654dd220cd5c5b96b0ac2d12b49fc6347fe965b46e81473de`；源码无临时 marker 残留。

## first-red、J2 电池与 §五.4

自演旧 apply 顺序的 first-red 五形状实跑，均为旧行为红（spawn/writes 均 0）：

| 形状 | journal bytes | 错误面 |
|---|---:|---|
| `recovery.partialTail` | 601 → **796** | `resume_refused` |
| `recovery.missingUsageTail` | 1119 → **1699** | `resume_refused` |
| `recovery.openIdleLeg` | 564 → **796** | `resume_refused` |
| `recovery.activePromptBudget` | 755 → **1394** | `session_closed` |
| `recovery.danglingEffect` | 1211 → **2107** | `session_closed` |

常驻 target 电池 `RECOVERY_SHAPES` 恰五类、五类各两触发；原始实跑为 **152 枚、15 字段，
拒 114 / 放行 38**。十枚 recovery 行的 pre-start journal 均逐字节原样（partial tail 未截、
usage/session-interrupted/prompt-failed/effect-uncertain 修复未应用），records、spawn、writes、
requestId 断言全为零/不变；resume 漂移行分别实得 `resume_refused`、计划关闭的 active prompt 与
dangling effect 分别实得 `session_closed`，modelId NUL 行实得 `invalid_config`。对照测试
`recovery_seeds_all_carry_a_repair_and_a_successful_start_applies_it` 通过，证明五类种子确有修复，
成功路径会 apply；open idle 成功次序为 `session_started → session_interrupted → session_resumed`。

§五.4 两态对照成立：计划 fold 后的 closed projection 在 `pi_loop.rs:535-537` 先返回
`SessionClosed`，所以计划关闭态不经过 apply；同一错误面由
`shutdown_writes_session_completed_after_terminal_and_eof` 锁定的盘上 durable closed 再次 start
复现，且 spawn 为 0。`reclaim_after_fault` 仍立即 apply，characterization 通过；延迟 apply 的
mutation 使同一断言 `564 B → 564 B` 命中红。

## 七枚 mutation 独立重注

每枚均在 exact target blob 命中唯一锚点，定向红后 `apply_patch` 还原并复核 byte-identical：

1. apply 前移：电池 partial-tail `601 → 796` 红。
2. 物理截断前移：计划/电池 partial-tail `601 → 564` 红。
3. apply 重新 stage：计划值与盘上 seq `4/5` 对 `6/7` 红。
4. recovery 族删空：塌缩守卫以 `recovery 族只剩 0 行` 红。
5. grant 拒绝前 apply：`601 → 796` 红。
6. `reclaim_after_fault` 延迟 apply：characterization `564 → 564` 红。
7. M7 codec-only future rule：后置臂 `558 → 558`，前移臂 `558 → 790`，等价靶亦红。

## J3、R6 订正与门禁

- `pi_loop.rs:211-229` 已将 spawn-after-encoder 改为历史陈述，清除当前时错误断言，并明确
  “源码扫描双向自证”已退役、当前由行为反例和普适电池自证。
- R6 计数独立重算：pristine `28d81b2` 的 `4114..4272` 为 159 行内容，前段为 2,969 行，
  合计 **3,128 行内容 + 1 行格式空行缺失**；目标对应块逐字节相等，边界差异仅空行/测试模块收尾。
- 非受限域门禁原始结果：pi-lane `14 files / 448 tests`；product-sidecar `10/10`；verified-node
  tests `8/8`；isolation-binding `43/43`；verified production `10 PASS`，control 全 PASS；
  Rust `cargo test --lib` **167 passed / 0 failed / 1 ignored**，ignored snapshot **1 passed**；
  四模块 rustfmt `exit 0`。clippy `-D warnings` 按 parent 基线预期 `exit 101`，恰 **7** 项且
  全在 `src/lib.rs`（5 unnecessary-unsafe、2 needless-return）；四个 `pi_loop*` 模块零新增，
  target 与 pre-implementation parent 的 `lib.rs` 无 diff。
- 仓级 `pnpm -r build`、`pnpm lint`、顺序重跑的 `pnpm test` 均通过；root test 原始结果
  **166 files / 1,771 tests**，desktop `lint:isolation-binding` 通过；`git diff --check` 通过。
  root test 以 build 完成后顺序重跑，避免并行 build/test 的包 dist 竞态。

## 结论与停止边界

判定：**PASS，待架构消费**。本会话只追加本段 `packages/pi-lane/ACCEPTANCE.md`；不 merge、不
push、不更新 `current.md`、不开 `PI-WRITE-HOST-1`，PASS 也停在待架构消费。

---

# PI-LANE-SIDECAR-HANG-1 独立验收（2026-08-04，PASS）

对象：exact target `19d64b9375db93343e0be224ae56183f9373752d`，base
`8d90aa8`；目标 worktree `/Users/lesprivilege/Projects/Courtwork/.claude/worktrees/ext-accept-sidecar-hang`，
另建 base 对照 worktree `/Users/lesprivilege/Projects/Courtwork/.claude/worktrees/ext-accept-sidecar-hang-base`。
实现会话未被采信；验收从 target clean tree 独立安装、审 diff 与实跑。目标树安装
`pnpm install --frozen-lockfile` 成功，base 对照树同命令亦成功。

## 范围与静态核验

- `git diff --name-status 8d90aa8..19d64b9` 恰为 `packages/pi-lane/src/sidecar.test.ts` 与
  `packages/pi-lane/SPEC.md`；stat 为 `146 insertions(+), 13 deletions(-)`。
- `git diff --check` 通过；build/test 后目标 worktree 仍无 tracked 漂移。
- `sidecar.test.ts` 的修法是监听 `listen` 的 `'error'` 并携 errno/环境事实 reject，且把唯一
  回环请求出口收紧为 `ROUND_TRIP_BUDGET_MS = 2000`；该预算小于既有 Vitest 5s 通用超时。
  断言未放宽，未加入 skip、retry 或 timeout 放大；代理只记录 `NODE_USE_ENV_PROXY`、
  `HTTP_PROXY`、`NO_PROXY` 的有无，不记录值。
- `git diff` 未触碰产品码；`apps/desktop/src`、desktop e2e 与其行为契约零改动。

## 正常环境与失败环境双臂

可 bind 的正常 shell 下，连续三轮定向命令
`npx vitest run packages/pi-lane/src/sidecar.test.ts` 均通过：

| 轮次 | 结果 | Vitest duration |
|---|---|---:|
| 1 | 1 file / 10 passed / 0 failed | 2.35s |
| 2 | 1 file / 10 passed / 0 failed | 2.36s |
| 3 | 1 file / 10 passed / 0 failed | 3.46s |

拒 bind 注入命令为：
`sandbox-exec -p '(version 1)(allow default)(deny network-bind (local ip "*:*"))' npx vitest run packages/pi-lane/src/sidecar.test.ts`。

- target tip：`10 failed`（原八枚 + 两枚注入反例），测试耗时 `18ms`、外层 `real 0.81s`；
  失败具名为 `回环监听失败 ... EPERM`，含 `node v25.9.0`、代理变量有无与
  `Caused by: listen EPERM`，没有 `Test timed out in 5000ms`。
- base `8d90aa8`：`8 failed`，测试耗时 `40041ms`、外层 `real 42.75s`；八枚逐一为
  `5003–5010ms` 的 `Test timed out in 5000ms`，无 errno，复现旧的无信息悬挂。

拒 connect 对照命令为：
`sandbox-exec -p '(version 1)(allow default)(deny network-outbound (remote ip "localhost:*"))' npx vitest run packages/pi-lane/src/sidecar.test.ts`。

- target：`9 failed / 1 passed`，测试耗时 `45ms`、外层 `real 1.40s`；原八枚均快红为
  `connect EPERM`，没有 5s 悬挂。第十枚黑洞反例在该 profile 下无法建立“连上但不回话”
  条件，因连接已被拒绝而按预期走 `回环请求失败：EPERM`，不是超时。
- base：`8 failed`，测试耗时 `25ms`、外层 `real 1.08s`，直接观察到 `connect EPERM`。

这两种 Seatbelt 形态区分成立：bind 受限把旧树拖成 40s 无信息超时，而连接被拒绝在两树中
均为亚秒具名快红；tip 还覆盖了真实可达但黑洞不回话时的 2000ms 具名预算。默认受限沙箱
本身也曾让 tip 在约 443ms 内报具名 `listen EPERM`；该轮仅作环境红证，没有冒充正常绿证。

## 全量门

- `pnpm -r build`：exit 0；14/15 workspace projects 完成，desktop Vite `3594 modules transformed`
  并完成 production build。
- `pnpm lint`：exit 0。
- 可 bind 正常 shell 下连续三轮 `pnpm test`：

| 轮次 | 结果 | Vitest duration |
|---|---|---:|
| 1 | 167 files / 1784 passed / 0 failed | 13.66s |
| 2 | 167 files / 1784 passed / 0 failed | 11.45s |
| 3 | 167 files / 1784 passed / 0 failed | 12.03s |

本票不触 desktop 行为，未运行 Playwright；理由为目标 diff 无 `apps/desktop` 产品码或 e2e
变更，desktop build 已由 `pnpm -r build` 覆盖。该豁免不扩展为产品行为通过宣称。

## 结论与停止边界

判定：**PASS，待架构消费**。失败环境由无信息 5s 悬挂变为具名 fail-fast，正常定向测试与
连续三轮 root test 全绿，build/lint 全绿，且触碰面严格为票面两文件。本会话只追加本段，
不修改实现、不 merge、不 push、不更新 `current.md`，清理时只删除本会话创建的 target/base
验收 worktree。
# PI-HOST-JOURNAL-1 独立验收（2026-08-04，拒绝）

对象：`claude/pi-host-journal-1` 分支尾 `b238d28acd23a3aae56a0649b32de5190e8c5866`（回执提交），
实现提交 `98467ec`；基线 `main@ac6ba06`。验收在独立 detached worktree
`/Users/lesprivilege/Projects/Courtwork/.claude/worktrees/accept-pi-host-journal-1` 进行，
与实现 worktree `.claude/worktrees/pi-host-journal-1` 物理隔离，全程未触碰后者。开工与收工时
本树 HEAD 恰为 target 且工作树 clean；`ac6ba06` 经 `git merge-base --is-ancestor` 确认是 target
祖先，`main...target` 为 2 behind / 2 ahead（main 侧两枚为纯 docs 提交 `8f4e937`、`d62e22d`）。
`pnpm install --frozen-lockfile` 与 `packages/pi-lane/scripts/build-product-sidecar.mjs` 均在本树
自行执行；sidecar bundle 实测 `bytes 523235`、
`sha256 75eff9b9c6089b613e85638a2f7a1b3159c1df08bd5439eb1db9978e6d65399b`、`reproducible: true`。

**结论：REJECT。** 票面缺口③（quarantine 内容寻址）只在四个 `quarantine_session` 调用点中的
**一个**闭口，另外三个仍传 LF 截断前缀；本会话在 target 上以独立反例实测到该缺陷的两种原形态
（命名 SHA 与搬运内容不符、同前缀异尾撞名把 sessionId 卡死）**原样存活**。这直接落在票面③
「同前缀异尾两档不撞名」的验收摘要上，属验收标准未达成，非实现级小瑕；且实现回执把该修复
自述为「四处调用点……改传 `&existing`」，与实测不符。按 `workflow.md`「闭口按族，不按验收
点名的实例」与「自述与实现逐条对照」两条判据，本会话不做 `fix-by-acceptance`，退回默认动作
驳回返修。

## 范围判定：合票面边界

- `ac6ba06..b238d28` 恰三路径：`apps/desktop/src-tauri/src/pi_loop.rs`、
  `apps/desktop/src-tauri/src/pi_loop_journal.rs`、`packages/pi-lane/specs/PI-HOST-JOURNAL-1.md`。
  实现面恰两文件，与票面「三枚，全住 `apps/desktop/src-tauri/src/`」一致；零 ADR/SPEC 父级、
  零 `current.md`/readiness、零依赖、零 GUI、零 write 面越界。
- wire／记录形状／codec 零改动：`pi_loop_protocol.rs` 逐字节未动。新增的写侧序号门只是在既有
  `state_violation` 上多一条拒绝分支，不新增 wire 字段、不改任何 payload 形状。
- R6 encode-before-effect 与 R7 恢复分相装置未回退：`plan_session_locked` 的读／计划／apply 分相
  结构原样保留，截断仍只算计划值（`truncate_to`）不在读取函数内落盘；全量 `cargo test` 173 枚
  （172 passed / 0 failed / 1 ignored）通过，R7 的 recovery characterization 与普适电池全绿。
- 一处措辞遗留：`plan_session_locked` 中「单写者门在**任何读写之前**」的注释下方，本批新增的
  两次 `sync_directory` 位于 `SessionLock::acquire` **之前**。因 `create_dir_all` 与
  `assert_owned_directory` 原本就在该注释之上，此注释此前即取「任何 **journal** 读写之前」的读法，
  本批未新增违背，但注释的字面与代码次序的落差被本批放大一档，建议随返修一并钉准。

## born-red 独立复现（逐 hunk 反向注入，非采信自述）

不采用「整体回退到基线」的做法（新测与生产码同住两文件，回退会连测试一起抹掉，红因不可归属）。
改为在 target 树上**逐一反向注入单个生产 hunk**，每次 perl 置换带命中校验（`HIT=1`，否则
`die`），跑后以 `diff` 对 pristine 备份核实改动面恰为该 hunk，再从备份逐字节还原。全部六次注入
的还原后 `git status --short` 为空，两文件 SHA-256 恢复为
`03d1a9d7…`（`pi_loop_journal.rs`）与 `79e50ee5…`（`pi_loop.rs`）。

| 反向注入的生产 hunk | 受影响测试 | 实测红形（原文） |
|---|---|---|
| 撤 `sync_directory(container.parent())` | `fresh_session_plan_syncs_directory_entries` | `目录项 sync 不足：实测 2 次，至少须 3 次`，exit 101 |
| 撤 `sync_directory(root)` | 同上 | `实测 2 次，至少须 3 次`，exit 101 |
| 撤 `open_append` 后的 `sync_directory(&container)` | 同上 | `实测 2 次，至少须 3 次`，exit 101 |
| 撤 `pump` 写侧序号门（5 行） | `counterexample_out_of_order_turn_is_refused_before_append` | `须 StateViolation，实得 Journal("quarantined")`，exit 101 |
| 撤 quarantine 在案拒绝块（11 行） | `counterexample_fresh_start_after_quarantine_is_refused_not_silently_zeroed` | `quarantine 在案时 start 必须显式拒绝而非静默 fresh`，exit 101 |
| `&existing` 改回 `&complete`（唯一已改调用点） | `counterexample_quarantine_digest_covers_untruncated_bytes`＋`counterexample_same_prefix_different_tails_do_not_collide_in_quarantine` | 前者 `left e487f60c… ≠ right 06be59b3…`；后者 `实得 QuarantineRefused("quarantine 目标已存在，拒绝覆盖")`，exit 101 |

还原后五枚定向测试 `5 passed / 0 failed`、exit 0。**票面要求的「mutation 撤任一目录 fsync 复红 ×3」
独立复现成立**，红因逐条与缺陷叙事相符；写侧序号门那一枚的红形 `Journal("quarantined")` 确如回执
所述，把审计全链叙事（写侧收下 → 读侧整档隔离）压进一枚测试内。这五枚的红绿证本身没有问题。

## 拒绝理由：③ 只闭了四分之一，族内其余三个入口原样带病

`quarantine_session` 的 doc 自述与文件命名契约是 `<sha256-of-original-bytes>.jsonl`，而它 rename
搬走的永远是**含 partial tail 的原文件**（R7 分相后截断只是计划值，不落盘）。故四个调用点都必须
传未截断原字节。target 实测：

| 调用点（`plan_session_locked` 内） | 触发条件 | 本批实参 |
|---|---|---|
| `"已 LF 结束的记录不合 schema"`（`decode_record` 失败） | 坏 JSON 行 | **`&existing`（已修）** |
| `"journal 含空行"` | 含空行 | `&complete`（未修） |
| `validate_records` 失败（`problem.0`） | 结构违规 | `&complete`（未修） |
| `plan_turn_usage_repair` 失败（`problem.0`） | usage 配对违规 | `&complete`（未修） |

逐字实测：`&existing` 恰 1 处（行 2375），`&complete` 恰 3 处（行 2387／2398／2411）。该计数以两种
工具交叉（`/usr/bin/grep` 与 `rg`，承「否定性结论须换第二工具交叉」的同源纪律），并经产品负责人
在实现 worktree 上第三次独立复核坐实（同为 1︰3，三处缩进各异——缩进差异正是单一固定模式扫描会
漏掉的形态）。本会话在 target 上另写两枚独立反例，把票面③
的同一判据改由 `validate_records` 入口触发（构造法：把首枚合法记录字节整份重复一次，`decode_record`
仍过、`validate_records` 以「event seq 必须从 1 起逐枚递增」拒），两枚在 **未经任何变异的 target
上直接红**：

- `acceptance_probe_digest_via_validate_records_path`：
  `命名 SHA 必须盖住未截断原字节（validate_records 调用点）`，
  `left a90207cd…` ≠ `right b4fbe865…`；
- `acceptance_probe_collision_via_validate_records_path`：第二形实得
  `QuarantineRefused("quarantine 目标已存在，拒绝覆盖")`——**即票面明列的「同前缀异尾两档撞名把
  sessionId 卡死」原形态，在 target 上原样复现**。

合计 `0 passed / 2 failed`、exit 101。两枚探针跑后即删，`git status --short` 空、
`pi_loop_journal.rs` SHA-256 复原为 `03d1a9d7…`。

这不是「验收点名的实例」清单问题，而是族覆盖问题：本批的两枚 born-red 都只经 `decode_record`
失败这一个入口构造语料，测试面本身没有覆盖族，于是修一处即全绿。按 `workflow.md` 该判据的完成态
——「闭集被穷举覆盖，且覆盖本身有机器自证」——本批未达成。返修须同时做到：四个调用点全部传
未截断原字节，且测试面对四个入口各有一枚（或有一枚机器自证：`quarantine_session` 的调用点
全集扫描，实参非未截断原字节即红）。

## 回执宣称与实现的逐条对照

- **不实**：「四处调用点由 `&complete`（LF 截断前缀）改传 `&existing`（未截断原字节）」——实测
  `git diff ac6ba06..98467ec` 只含一处该置换，另三处未动。同段的「实现自此与其 doc 自述
  `<sha256-of-original-bytes>.jsonl` 一致」对四分之三的入口不成立。
- **口径偏松**：「`pump` 在 append 前按读侧 `validate_records` 同一真源拒绝跳号」——实为**第二份
  规则副本**，非同一真源：读侧是 `pi_loop_journal.rs` 内 `validate_records` 的游标
  `last_observed_turn`（严格 +1 递推），写侧是 `pi_loop.rs` 内读 `self.projection.prior_observed_turns`
  （由 `fold` 以 `max()` 维护）。两者今日语义等价（本会话逐分支核对：`fold` 只在
  `TurnUsageRecorded` 臂更新该字段，而 `pump` 每写完 `turn_finished`＋`turn_usage_recorded` 两笔
  即重折叠，故两侧游标同步），但没有共享函数、没有机器自证的同步锁。按 R6 复验立下的
  「同步消灭优于同步验证」，此处宜标为待架构裁定，不宜以「同真源」措辞收口。
  附带一项**未成问题的核实**：读侧另一条序号判据（`turn_usage_recorded` 必须接在同 turn 的
  `turn_finished` 之后）在写侧是结构性不可违反的——`pump` 的 usage 笔逐值抄自刚落账的
  `turn_finished`，此处正是「同步消灭」的正确形态，无需补门。
- **属实并已复现**：三处目录 fsync 的位置与比照 `work_state.rs` 的说法、`cfg(test)` 线程局部计数器
  为生产零码、`QuarantineRefused` 复用既有错误变体（错误闭集零移动）、`reclaim_after_fault` 语义
  零变化、cargo `172 过 / 0 败 / 1 忽略`。

## 待复核子项（`cost_usd` 无界 f64）裁定复核

票面给的是「核后二选一」，故**登记而不修**这一动作本身在票面许可内，形式合规。但登记所依据的
前提只在一半分支上成立，本会话实测：

- 单值确无上界但**拒非有限数**：`read_nullable_non_negative_number` → `read_non_negative_number(_,_,false,None)`，
  其中 `if !value.is_finite() { reject }` 在场。故 `+inf` 只能由累加产生，不能由单值直送——回执
  未提这一层，属对己方有利的省略，但结论方向一致。
- `max_usd = Some(limit)` 时回执的说法**成立**：`budget_from` 的 `usd >= limit` 对 `+inf` 为真 →
  `BudgetUsdLimit::Reached`，确是 fail-closed。
- `max_usd = None` 时**不成立**：`budget_from` 走 `(None, _) => Disabled` 臂，`usd` 字段随即取
  `projection.prior_usd`，即 `Some(+inf)` 原样带出。而 `write_budget_view` 以
  `nullable_number("usd", budget.usd)` → `format_js_number` 落字面量，本会话在 target 上以探针实测
  `format_js_number(f64::MAX + f64::MAX)` 返回 **`"inf"`**——一个非 JSON 数值 token。
  该路径若被写进 journal，即构成「本机 durable 写入自家读侧必拒的记录」，正是本票缺口②要消灭的
  那一类，不是 fail-closed。

需如实区分证据层级：`format_js_number(+inf) == "inf"` 与 `budget_from` 两分支的取值是**实测/逐行
核对**；从 `BudgetView.usd` 到一条落盘 journal 行的端到端可达性，本会话**只做了源码链路核对
（`write_budget_view` → `nullable_number` → `format_js_number`），未端到端实跑构造**。故此项不作为
驳回依据，登记为：**「已知边界」的登记理由需重写，`max_usd = None` 分支的定性请架构裁定**是随本票
返修收口，还是另票。

## 门禁实跑

本树自跑，逐条记退出码（未经管道吞码）：

| 门 | 结果 | 退出码 |
|---|---|---|
| `pnpm -r build` | 通过（仅既有 Vite chunk-size warning） | 0 |
| `pnpm lint` | 通过（`eslint .` 无输出） | 0 |
| root `pnpm test` | **167 files / 1782 tests passed** | 0 |
| `pnpm --filter @courtwork/desktop test` | **75 files / 690 tests passed** | 0 |
| `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml` | **173 running；172 passed / 0 failed / 1 ignored** | 0 |
| `pnpm --filter @courtwork/desktop test:e2e`（完整 Playwright） | **未取得**（一轮截断作废，经裁决不补跑） | 无 |

Playwright 一轮**作废、不计入通过率**，两条独立理由各自充分：其一，该轮被 `SIGTERM` 截断
（日志尾为 `Command failed with signal "SIGTERM"`，list reporter 的失败摘要从未打印，无失败详情
可归因）；其二，同机另一验收会话的 Playwright（worktree `ext-accept-output-apply`，vite
`--port 21420`，多枚 chrome-headless worker）与本轮并发在跑，按「环境红禁入任何批次验收结论」
与「反例期禁并发跑全仓门」，该窗口内读数不具归属力。截断处计数为 163 ✓ / 14 ✘，失败单条耗时
39 s–1.7 min，形态与负载超时一致而非断言不符，但**本报告不据此下任何结论**，如实登记为截断。
端口层面无串扰：本树 `playwright.config.ts` 为 `reuseExistingServer: false`、默认端口 1420，
与对方 21420 不同源；返修批重跑时须以 `COURTWORK_E2E_PORT` 显式取隔离端口。

**该门经裁决不予补跑**，理由见下节；本报告因此**不含任何 Playwright 通过率宣称**，该格是
「未取得」而非「通过」，返修批必须自行取得完整一轮。

## 停止边界

契约级 blocker 已由 target 上未经变异的两枚独立反例直接坐实（`0 passed / 2 failed`，exit 101），
按 `PI-SIDECAR-DIST-1R3` 先例，昂贵读数无法令未达成的验收摘要成立，**停止原因是 REJECT，不是
外部条件 BLOCKED**；完整 Playwright 经产品负责人裁决不予补跑，如实登记为未取得。本会话不做
`fix-by-acceptance` 提交，不 merge、不 push、不更新 `docs/status/current.md` 与
implementation-readiness、不开 `PI-WRITE-HOST-1`；`PI-HOST-JOURNAL-1` 仍占「须早于
`PI-WRITE-HOST-1`」的在途位。

复验前的最小条件：

1. `quarantine_session` 四个调用点全部传未截断原字节，并对该闭集补机器自证（调用点全集扫描，
   实参不是未截断原字节即红），使新增入口不入清单亦红；
2. 测试面按族铺满——至少 `journal 含空行`、`validate_records`、`plan_turn_usage_repair` 三个入口
   各有一枚「命名 SHA 覆盖全字节」与「同前缀异尾不撞名」的反例；
3. 回执改写「四处调用点」与「同一真源」两处不实/偏松措辞，写侧序号门与读侧的关系按事实描述为
   两份副本，并标注是否请架构按「同步消灭优于同步验证」裁定；
4. `cost_usd` 登记理由重写，`max_usd = None` 分支的定性请架构拍板；
5. 全量门（含隔离端口的完整 Playwright）在返修 tip 上重跑，由新的独立验收会话复验。

## 附：两枚验收反例原形（按「验收反例原形转 permanent」判例移交返修批）

下列两枚是本轮的决定性反例，在 target 上跑后即删（本树零残留）。按 `PI-HOST-LOOP-1R2` 立下的
「验收反例原形转 permanent 首红」判例，返修批须把它们收作**永久测试**并署名本验收轮，不得只当
一次性证据。语料构造的要点是**换入口而非换判据**：把首枚合法记录的字节整份重复一次，
`decode_record` 仍过（字节合法）而 `validate_records` 以「event seq 必须从 1 起逐枚递增」拒，
于是 quarantine 走的是第三个调用点而非已修的第一个。

```rust
#[test]
fn acceptance_probe_digest_via_validate_records_path() {
    let root = temp_root("probe-validate-path");
    let mut loaded = open(&root);
    loaded
        .journal
        .append(None, None, JournalPayload::SessionStarted(started_payload()))
        .expect("首枚落账");
    drop(loaded);
    let path = journal_path(&root, "cnt-1", "sess-1");
    let good = fs::read(&path).expect("读原文");
    let mut bytes = good.clone();
    bytes.extend_from_slice(&good); // 重复 seq=1：decode 过、validate_records 拒
    bytes.extend_from_slice(b"{\"partial");
    fs::write(&path, &bytes).expect("写探针形");
    let error = load_session(&root, "cnt-1", "sess-1", SessionInterruptReason::SidecarEnded)
        .expect_err("结构违规必须 quarantine");
    let JournalError::Quarantined { target_sha256, .. } = &error else {
        panic!("必须是 Quarantined，实得 {error:?}");
    };
    assert_eq!(
        *target_sha256,
        sha256_hex(&bytes),
        "命名 SHA 必须盖住未截断原字节（validate_records 调用点）"
    );
}

#[test]
fn acceptance_probe_collision_via_validate_records_path() {
    let root = temp_root("probe-validate-collide");
    let mut loaded = open(&root);
    loaded
        .journal
        .append(None, None, JournalPayload::SessionStarted(started_payload()))
        .expect("首枚落账");
    drop(loaded);
    let path = journal_path(&root, "cnt-1", "sess-1");
    let good = fs::read(&path).expect("读原文");
    let mut first = good.clone();
    first.extend_from_slice(&good);
    first.extend_from_slice(b"{\"tail-one");
    fs::write(&path, &first).expect("写第一形");
    let first_err = load_session(&root, "cnt-1", "sess-1", SessionInterruptReason::SidecarEnded)
        .expect_err("第一形 quarantine");
    assert!(
        matches!(first_err, JournalError::Quarantined { .. }),
        "第一形必须 Quarantined，实得 {first_err:?}"
    );
    let mut second = good.clone();
    second.extend_from_slice(&good);
    second.extend_from_slice(b"{\"tail-two");
    fs::write(&path, &second).expect("写第二形");
    let second_err = load_session(&root, "cnt-1", "sess-1", SessionInterruptReason::SidecarEnded)
        .expect_err("第二形 quarantine");
    assert!(
        matches!(second_err, JournalError::Quarantined { .. }),
        "第二形必须 Quarantined 而非撞名 QuarantineRefused，实得 {second_err:?}"
    );
}
```

两枚在 target `b238d28` 未经变异直接红（`0 passed / 2 failed`，exit 101），红因分别为
`left a90207cd… ≠ right b4fbe865…` 与 `实得 QuarantineRefused("quarantine 目标已存在，拒绝覆盖")`。
移交提醒两条：其一，返修后这两枚**必须仍能以撤除修复而复红**，否则说明它们被改成了自洽断言；
其二，它们只覆盖四个入口中的第三个，返修批仍须按上节「复验前的最小条件」第 1、2 项把闭集铺满，
**不得把这两枚当成待修清单的全部**——那正是本轮驳回所依据的同一条判据。

# PI-HOST-JOURNAL-1R 独立复验（2026-08-04，放行）

对象：`claude/pi-host-journal-1` 分支尾 `2bdba2503a7338df8d822e6613598a40a100ca05`（1R 回执），
返修实现 `6005bd9`；复验基线为本会话同日 REJECT 提交 `bdba10a`。链：`98467ec` 实现 →
`b238d28` 回执 → `bdba10a` REJECT → `6005bd9` 返修 → `2bdba25` 1R 回执。复验在独立 detached
worktree `.claude/worktrees/accept-phj-1r` 进行，与实现 worktree 物理隔离；`pnpm install
--frozen-lockfile` 与 `build-product-sidecar.mjs` 均本树自跑，bundle 实测 `bytes 523235`、
`sha256 75eff9b9c6089b613e85638a2f7a1b3159c1df08bd5439eb1db9978e6d65399b`、`reproducible: true`
——与 REJECT 轮在另一棵树上的产物**逐字节相同**，制品可复现性再获一次独立佐证。

**结论：PASS，待架构消费。** REJECT 轮点名的③族缺陷已由**结构性收束**闭合，而非逐点闭口：
`quarantine_session` 删去 `original: &[u8]` 参数、rename 前自读源文件全字节取摘要，「调用方传对
切片」这本账随参数一并消灭。本会话按票面对**全部四条隔离入口**做专项证伪，未能构造出任何一条
使摘要不盖全字节的路径；撤修复变异使摘要族**六枚**测试全红，区分力坐实。

## 范围判定

`bdba10a..2bdba25` 恰三路径：`pi_loop.rs`（5 行，改调共用判据）、`pi_loop_journal.rs`（132 行）、
`packages/pi-lane/specs/PI-HOST-JOURNAL-1.md`（16 行回执）。wire／记录形状／codec 零改动
（`pi_loop_protocol.rs` 未动）；`JournalError` 错误闭集零移动——新增的「读取待隔离 journal 失败」
复用既有 `QuarantineRefused` 变体，未新增变体（diff 实测）。零 GUI、零 write 面、零父级文档越界。

## 专项证伪一：四条隔离入口逐条构造，未能证伪

1R 回执自陈「行为面保留 decode 与 validate 两入口共四枚反例，其余两入口的等价性由结构性保证」
——即**空行**与 **repair 拒**两条入口在 1R 交付面上无反例。本会话为这两条各写一枚探针补齐族，
且**以 `reason` 字段断言确实走到了目标入口**（避免探针自以为换了入口、实际仍落在已测入口上）：

| 隔离入口 | 语料构造 | 反例来源 | 实测 |
|---|---|---|---|
| `decode_record` 失败 | 坏 JSON 行＋partial tail | 首轮既有两枚 | 绿 |
| `validate_records` 拒 | 首枚合法记录整份重复（seq 撞）＋partial tail | **REJECT 轮探针转 permanent** | 绿 |
| `journal 含空行` | 合法记录＋裸 `\n`＋partial tail | **本复验轮新增探针** | 绿，`reason == "journal 含空行"` |
| `plan_turn_usage_repair` 拒 | 同 request/turn 重复 `turn_usage_recorded`＋partial tail | **本复验轮新增探针** | 绿，`reason == "同一 request/turn 出现重复 turn_usage_recorded"` |

四条入口合计六枚，在 target 上 `6 passed / 0 failed`、exit 0。每枚除断言
`target_sha256 == sha256(未截断全字节)` 外，另断言 `fs::read(隔离档) == 全字节`——**名与实双向
互证**，而非只比对两个哈希字符串。证伪未遂：自读发生在 rename 之前、读的与搬的是同一路径、
active handle 已在函数首行置空、单写者锁在外层持有，故「摘要输入」与「被搬字节」在结构上不可
分离；调用方已无参数可传错。

## 专项证伪二：撤修复复红（M1）

在函数内注回「LF 截断哈希」旧语义（perl 置换带命中校验 `HIT=1`，`diff` 核改动面恰为该两行）：

```
-    let digest = sha256_hex(&original);
+    let mutant_len = ...rposition(b'\n')...;
+    let digest = sha256_hex(&original[..mutant_len]);
```

摘要族**六枚全红**（`0 passed / 6 failed`，exit 101），含本轮新增的空行与 repair 两枚。这同时
证明两件事：1R 回执「四枚全红」的自述属实且实际覆盖面比自述更宽；本轮新增的两枚探针具备区分力，
不是恒真断言。变异后逐字节还原，`git status` 空，`pi_loop_journal.rs` SHA-256 复原为
`119276085967002e716cfc6f3d05bb69feffeb2ffbac5ebc01e3c5f537fd5892`。

## 观察②裁定：共用判据成立，游标二元性登记为观察、不阻断

REJECT 轮指出写侧序号门是读侧规则的第二份副本。1R 抽出
`turn_finished_follows(last_observed_turn, turn)`，读侧 `validate_records` 与写侧 pump 门同调。
**「共用」不采信自述，以变异证**：把该函数改为恒真（`HIT=1`），跑全量 cargo——

- 写侧 `pi_loop::tests::counterexample_out_of_order_turn_is_refused_before_append` **红**；
- 读侧 `pi_loop_journal::tests::counterexample_impossible_turn_history_is_quarantined` **红**；
- 其余 172 枚全绿（`172 passed / 2 failed / 1 ignored`）。

两侧各有独立红证同时落地，说明该函数确被两个消费点真实消费，不是一侧接线、另一侧留旧副本的
装饰性重构。**规则副本已消灭，观察②按「同步消灭优于同步验证」正确收口。**

游标二元性（读侧 `last_observed_turn` 沿记录流严格递推、写侧 `prior_observed_turns` 取自 `fold`
且在 `TurnUsageRecorded` 臂以 `max()` 更新）**裁定为足够，不要求本票进一步收束**，理由与残余风险
一并如实登记：

- `pump` 是直线双写——`turn_finished` 落账后紧接同 turn 的 `turn_usage_recorded`，随即整体重折叠，
  两笔之间不可能插入第二枚 `turn_finished`，故进程内无发散窗口；
- resume 路径上 `prior_observed_turns` 折叠自**已过 `validate_records` 的**耐久记录，而该门正是
  严格递推，故 `max()` 永远看不到违规历史；
- 残余风险是这份一致性属**涌现性质**（由 pump 的直线结构＋validate 把守 resume 共同保证），
  不是机器自证的不变量。它今日不构成缺陷，但下一位改动 pump 写序或 `fold` 更新臂的人不会被门拦住。
  建议架构在 `PI-WRITE-HOST-1` 一并考虑把两侧游标也收敛为单一来源；本票不作阻断条件。

回执把该二元性主动写明并留给复验审视，属正确披露，本会话据此裁定而非另行发掘。

## 其余观察的落实核对（逐条对照，不采信自述）

- **观察⑤（注释措辞）**：已钉准为「单写者门在**任何 journal 读写之前**」，并补注目录项 fsync
  属容器结构准备、不触 journal 字节。核对代码次序属实。
- **观察④（`cost_usd` Disabled 臂）**：维持 `[需架构拍板]`，且回执措辞已按 REJECT 轮的实测收窄
  ——明写 `max_usd=None` 时 `Some(+inf)` 原样带出、`format_js_number` 对非有限值输出裸 `inf`
  （非 JSON token）。与本会话 REJECT 轮的实测一致，不再是「一律 fail-closed」的半真前提。
  是否加界属 wire 面，本票不动，留待架构。
- **③失实自述**：回执已用删除线纠正原句，并具名引用本会话 REJECT 提交 `bdba10a` 与「实际只改到
  1/4 调用点」的实测，另留下「`Edit replace_all` 的全部替换指字面串全部出现、不等于语义位点全部
  覆盖」的自伤记录。**纠正留痕合格**——不是删掉旧句了事，而是保留原句并标注被证伪。
- **REJECT 轮探针转 permanent**：`counterexample_validate_entry_quarantine_covers_untruncated_bytes`
  与 `counterexample_validate_entry_same_prefix_tails_do_not_collide` 已在位并署名验收轮；其
  「先红」由本会话 REJECT 轮在 `b238d28` 的实测（`0 passed / 2 failed`，exit 101）构成，
  「后绿」与「仍可红」由本轮的 `6 passed` 与 M1 六枚全红分别构成。首轮实现只修 decode 一入口
  即全绿的病根，自此被这两枚永久钉住。

## 门禁实跑（本树自跑，逐条记退出码，未经管道吞码）

| 门 | 结果 | 退出码 |
|---|---|---|
| `pnpm -r build` | 通过（仅既有 Vite chunk-size warning） | 0 |
| `pnpm lint` | 通过 | 0 |
| root `pnpm test` | **167 files / 1782 tests passed** | 0 |
| `pnpm --filter @courtwork/desktop test` | **75 files / 690 tests passed** | 0 |
| `cargo test`（先行 `build:product-sidecar`） | **175 running；174 passed / 0 failed / 1 ignored** | 0 |
| `pnpm --filter @courtwork/desktop test:e2e`（完整 Playwright，隔离端口 31420） | **352 passed / 0 failed，4.8m**；其前 38 枚静态 assert-* 门全过（含 `App.tsx` 高水位 2549、isolation-binding 10 宿主／30 pi-lane 源码） | 0 |

Playwright 以 `COURTWORK_E2E_PORT=31420` 自起服务、`reuseExistingServer: false`，整机独占无并发
负载（REJECT 轮那一次因截断＋他会话并发已作废，本轮为重新取得的完整一轮）。root 与 desktop
两组数字与 REJECT 轮逐值相同，返修零回归。

## 结论与停止边界

**判定：PASS，待架构消费。** 票面三缺口全部闭合且各有独立红证：①三处目录 fsync（REJECT 轮已
逐一撤除复红，本轮 174 全绿沿用）；②写侧序号门（M2 两侧各自变红证共用判据成真）＋quarantine
在案显式拒绝；③内容寻址由结构性收束闭合，四入口证伪未遂、M1 六枚全红。R6 encode-before-effect
与 R7 恢复分相装置零回退。

本会话只追加本段 `packages/pi-lane/ACCEPTANCE.md`；不 merge、不 push、不更新
`docs/status/current.md` 与 implementation-readiness、不开 `PI-WRITE-HOST-1`——PASS 亦停在待架构
消费。移交架构的两项：**观察②游标二元性**（建议随 `PI-WRITE-HOST-1` 收敛为单一来源，本票不阻断）
与**观察④ `cost_usd` Disabled 臂**（`[需架构拍板]`，加界属 wire 面）。

# PI-WRITE-HOST-1 独立验收（2026-08-05，PASS）

target `c2b395d`（链 `3908333`→`b660d15`→`32ad737`→`f9e6a1b`→`dcbd53f`→`5ba36f1`→`cc81eaa`→
`c2b395d`），base `main@4ab5671`。本会话在 `.claude/worktrees/accept-pwh` 自建 clean worktree，
`pnpm install --frozen-lockfile` 后先 `build:product-sidecar`、再 `cargo`。实现回执的每一句
在本会话都是未证断言；下列数字与红证一律为本树自跑，非采信自述。

## 一 · 总审：票面冻结范围逐项在场

| 票面条款 | 实测坐标 | 判定 |
|---|---|---|
| cap-std / cap-fs-ext / cap-tempfile exact `=4.0.2` | `Cargo.toml:37-39`；registry 实解 `cap-tempfile-4.0.2` | 在场 |
| 注册 pi 原版 `write` | `tool-policy.ts:23` `PRODUCT_TOOL_NAMES` 四件 `satisfies ProductToolName[]`；`product-runtime.ts:525` 恰 `[...readTools, writeTool]` | 在场 |
| Agent sequential ＋ binder `executionMode:'sequential'` | `product-runtime.ts:521`；`workspace-write-env.ts:481`（本票逐字节未动） | 在场 |
| 逐 toolCall 独立 env/operation | `publicToolCallId` 只读查询面 ＋ `pendingHostOperation` 按 operationId 对号 | 在场 |
| `md-work-v1` 六条 ≤2048B | `product-runtime.ts:70-77` | 在场 |
| 逐段 `open_dir_nofollow`、单段建再重开 | `pi_loop_workspace.rs:214-248` | 在场 |
| `TempFile` 私有同目录写入／同步／replace | `pi_loop_workspace.rs:463-486` | 在场 |
| 物理根只在 app-data | `pi_loop.rs:858`；G-22 断言 journal 不含 `pi-workspaces` 与绝对路径 | 在场 |
| 逐次授权先 durable | `pi_loop.rs:1310-1345` 四段账序 | 在场 |
| Node 零 fs 写 | 本票触碰的四份 pi-lane 生产文件全无 `node:fs`/`child_process`/`writeFile` | 在场 |
| 五枚前向债 | 偿形＝`encode_packet_line` 编码后**用同一份 decoder 当场回解**（`pi_loop_protocol.rs:2833`），结构性覆盖 | 在场 |
| **不得加 edit/diff/CAS/promotion/bash/GUI** | wire 闭集零扩员（`git diff` 中 `+.*closed_enum!` 零命中）；`lib.rs` 只加 `mod`，零新 Tauri command；diff 内 `edit/bash/晋升` 全部是否定式条款或反例断言 | **未越界** |

## 二 · 裁定A 再裁：闭集扩员成立，判 PASS，建议架构追认

读实现核实：`LEGAL_PROMPT_IDS` 恰二元、`LEGAL_CAPABILITY_SETS` 恰二组，判据是
`contains(&capabilities.as_slice())` ——比的是整张表，**不是**「每一员都合法」那种逐项放行；
次序、重复、空集、集外组合都在同一枚判据里现形。四枚 mutation 构成完整四角箱，逐枚本会话自注：

| 变异 | 注入 | 实测 | 证成 |
|---|---|---|---|
| M-A1 | 闭集收窄回 `[LEGACY]` | 32 red，含 `session_started_accepts_exactly_the_two_...` | 「维持现状」不可行 |
| M-A4 | 闭集收窄到 `[CURRENT]` | 1 red（恰同一枚） | 「收窄毁旧档」不是修辞——旧档语料真在门内 |
| M-A2 | `contains` 判据置 `false`（放通配） | 1 red：`counterexample_prompt_and_capability_sets_are_closed_not_open` | 闭性是闭性，非通配 |
| M-A3 | 写侧改回硬编码常量 | 1 red（恰同一枚） | 逐字节往返**不是**「解码丢弃、编码补回」的假往返 |

三选一论证成立：扩员是唯一同时满足「旧档续 valid」与「写侧不撒谎」的形态。修订面恰
`promptId`／`capabilities` 两枚字段；`pi_loop_protocol.rs` 自③ 起逐相 SHA 恒
`cf3aa9aa71a3d88e…`（④⑤⑥⑦ 逐值相同），**wire 一字未动**，裁定A 只落 journal codec——本会话
逐相 `git show | shasum` 复核属实。

**一处描述订正（不改判定）**：⑦ §四／偏离 ⑥-1 写「写侧记当刻真值／记实况」。实测写侧取的是
**编译期常量**（`pi_loop.rs:723-730`：`CURRENT_PROMPT_ID`、`EXPECTED_CAPABILITIES.to_vec()`），
落账在第 5 步，**早于** spawn（第 6 步）与 ready 握手（第 7 步 `pi_loop.rs:874` 逐值比对）。
代码注释自陈是准确的（「在任何能继续往下跑的路径上恒等」），受订正的是回执散文。差别仍是实质的
——旧形是贯穿整场且被后续每一份档继承的假话，现形只在握手当场即 `StateViolation` 收束的死路上
短暂不符，且紧随其后的失败记录自己否定它。故裁定A 结论不变，措辞应改为「写侧记本会话**必须**
谈成的那张表；谈不成即当场收束」。

## 三 · 上浮 B / D：均不阻断，维持上浮

- **B（`logicalPath` 空串两侧异源）**：实测 journal 生产段 3 处 `read_string(… "logicalPath")`、
  `read_non_empty_string` 0 处，wire 侧 `read_logical_path` 走非空判据——异源属实。三层挡法逐层
  复核在场（wire 判据前置／encode-before-effect／`parse_write_path` 对空串 `invalid_path`）。
  影响面恰是「手工构造的空路径 journal 不会被 quarantine」，非 effect 面。**不阻断**。
- **D（resume 缺 prompt/capability 漂移门）**：实测漂移门覆盖 grant／model／limits／
  routeManifest／targetTriple／usd／turns 七项，确无 promptId 与 capabilities。两重实况把风险
  压到记账层：一、production 至今无 decision driver，任何 write 恒 `policy_denied`，旧档 resume
  后不可能发生「头部声称只读、实际写入」；二、每一枚 effect 各自逐条落账，审计不依赖头部那一行。
  **不阻断**，但它是 A3 GUI／headless 注入真 driver **之前**必须清偿的前置——一旦有了 driver，
  这条就从记账问题升级为账实不符。建议架构在 `PI-LANE-UI-1` 开工门上挂此项。

## 四 · 回执互核四处：本会话立唯一真值

1. **capability 种子计数（⑦ §八.1 的裁定不成立）**。⑦ 判「现读以⑤ 的 `changed: 36` 为准」。
   本会话逐相实测 `pi_loop.rs` 中一员制 `[WorkspaceCapability::CaseRead]` 位点：
   base **33** → ② 33 → ③ **36**（+3，③ 自述属实）→ ④ **37**（+1，④ 自述「新增 4 枚」**不实**）
   → ⑤ **0**（全数改写，同形回灌 0）。⑤ 相 diff 删除侧命中 **37**，TS 侧另 3 处
   （`product-runtime.ts`／`product-runtime.test.ts`／`product-main.test.ts`）。
   **唯一真值：⑤ 改写 40 枚（Rust 37 ＋ TS 3）；分支总账为 33+3 枚既有位点被改值＝36，另 5 枚
   Rust 新位点直接出生为两员制。** `36` 恰等于分支总账、却不描述⑤ 做了什么，三谱与⑦ 的裁定
   都应照此改记。该数不是任何门的判据（门是 `EXPECTED_CAPABILITIES` 逐值比对 ＋
   `revoke_workspace_write` 反例），故属记账失实，不阻断。
2. **⑤ 触碰面名单**。实测 `git diff --name-only dcbd53f..5ba36f1` 恰 12 项；`product-stdio.test.ts`
   一字未动、`index.test.ts` 树内不存在，受影响的第四份测试是 `workspace-write-env.test.ts`。
   ⑦ 的自陈属实。**本会话已单独审到那 32 行**：一枚 characterization「多塞的第五参不改变容器」，
   以 `writeFile` 必抛的 hostileEnv 作靶，有牙、非占位。影响面已闭合。
3. **cargo `--lib` 口径**。本树实测：`src-tauri/` 无 `tests/` 目录；两口径逐值相同
   （带 `--lib` **218 passed / 0 failed / 1 ignored**；不带 `--lib` 同为 218/0/1，另两枚
   0 例目标）。⑦ 的「本仓等值」结论**成立**。处置建议：口径以 `--lib` 冻结并写入 SPEC §十，
   日后该 crate 增设集成测试时两口径才分叉。
4. **SPEC §十 计数陈旧**。实测 `vitest run packages/pi-lane` ＝ **469 例 / 15 文件**，§十 仍写
   「450 例 / 14 文件」。该行自身的体例是「本票只据实更新该计数」，故它是本票范围内、
   实现有义务也有权限修的一句活体假话。**已按 fix-by-acceptance 订正**（见 §七）。

## 五 · 红证抽样：逐枚本会话反向注入，非采信自述

变异一律带唯一锚定（命中数 ≠ 1 即中止）、还原后逐值核 SHA。

| # | 注入 | 实测红 | 意义 |
|---|---|---|---|
| M-B1 | `open_dir_nofollow` → `open_dir`（逐段下降改跟随） | **恰 1 red**：`counterexample_symlinks_within_the_root_are_still_never_followed` | 复现 M④3 的**三层遮蔽**：指向 root 外的链接撞 cap-std root confinement、绝对目标解析器直拒，两层都会假绿；只有「两端都在 root 内且目标为相对」那一枚咬得动。遮蔽结构在代码注释里已如实写明，实测与之逐条吻合 |
| M-C1 | Rust `CURRENT_PROMPT_ID` 单侧漂移 | 4 red，含 `dual_end_golden_journal_ledger_matches_byte_for_byte` | 跨端钉子：本侧漂移，**对端** golden 当场红 |
| M-C2 | Node `PRODUCT_PROMPT_ID` 单侧漂移 | 1 red：`跨端常量：journal golden 的 promptId / capabilities …` | 反向同理。两枚合看才是「双端」，单侧自证不成立 |
| M-D1 | `write` 同时留在禁用表与产品表 | 2 red（绿证三＋红证八） | ⑤ R1 两表自洽有牙 |
| M-E1 | `effect_started` durable 屏障去掉中止力（`?`→`.ok()`） | **恰 1 red**：`counterexample_any_durable_barrier_failure_leaves_the_effect_at_zero` | 票面退出证据「append+sync 失败必须零 temp/replace」实证 |
| M-F1 | `read_logical_path` 上界放宽 4 倍（撤五枚前向债之一） | **恰 1 red**：`counterexample_every_bounded_host_input_is_refused_before_journal_and_spawn` | 前向债偿形有牙——放松一枚上界，220 枚电池即红 |
| M-G1 | 缺 decision driver 时默认 `Approved` | 2 red（臂上一枚＋模块内一枚） | 逐次授权闸有牙 |
| M-G2 | 撤 0.1 能力门 | **恰 1 red**：`counterexample_host_request_gates_refuse_before_any_effect` | 能力门在能力已谈成之后**仍保有可证否形态** |
| M-H1 | 撤 temp 权限收紧 | 2 red（landed mode 实得 `0o644`≠`0o600`） | 「`TempFile::new` 默认 0o644」的平台宣称由本会话独立复现 |
| M-A1/A2/A3/A4 | 见 §二 | 见 §二 | 裁定A 四角箱 |

**上游一手复核（不引回执）**：`cap-tempfile-4.0.2/src/tempfile.rs:162` 实测
`pub fn new_anonymous(dir: &'d Dir) -> io::Result<File>` ——返回 `File` 而非 `TempFile`，
**结构性没有 `replace`**，④「不可用于就位路径」的宣称属实；`:176-198` 的 `impl_replace` 实测
恰一枚 `self.dir.rename(&tempname, self.dir, destname)`，路径上无 `remove`/`unlink`，
矩阵 #14「remove-then-rename 零出现」由上游结构性满足，本仓另有静态门与 inode 反例双锁。
上游 doc 自称 `replace` 后 "default to read-only" 一句实测在源码中确实存在，而本平台无对应
chmod 路径——④ 登记「不引用该句、改由实测钉死」属实。

## 六 · 两道产品闸与 `driver=None` 诚实边界：成立

production 构造点 `pi_loop.rs:858` 实测**不带** `.with_decision_driver(...)`，真件 `decide`
因此恒 `policy_denied`。`real_write_host_without_a_decision_driver_denies_and_writes_nothing`
逐条断言：能力**已谈成**（两闸不得互相顶名）→ `tool_proposed` 在账 → `effect_started` **不在账**
→ `host_result` 恰 `Denied{policy_denied}` → workspace 物理根**根本不存在**。M-G1／M-G2 两枚
反向注入各自触红，证明两闸各有独立区分力。

按 ADR-022 六-C（「headless 的 decision driver 必须显式注入，不得用 session always-allow 冒充
产品授权」）与总纲不变量 3，**判「当期诚实边界」成立**：宣告 `workspace_write` 只表示可以
**申请**，与「每一枚 write 今日都被拒」不矛盾；拒绝是显式的、落账的、可复核的，不是静默跳过。

## 七 · 偏离总账过目与新发现

38 条逐条过目（另有专项交叉核）。**推翻结论：零条**——⑥-1 是唯一契约级，且已自标待架构追认，
验收只上浮不受理；其余 37 条均为实现级，追认无异议。两条描述与现状不符（②-5「今日无生产
调用点」在③ 接线后已失效；③-6「`probe` 保持不可失败」在④ 已放宽），属阶段态残留，非实质。

**未登记偏离（本会话新发现，均实现级，不阻断，建议补登记）**：

1. `pi_loop_protocol.rs:161-211` 新增 15 枚 wire 可见失败/拒绝文案。schema 确未变（`message`
   字段本就在册），但这是它们**首次有值**，且双端 golden 只跑 `status:"ok"`，故无跨端 golden。
   缓解：`pi_loop_protocol.rs:2924` 有 ∀-code 电池逐值钉死 `error.message == code.message()`，
   且全部为静态字面量、臂上零插值，「不含物理路径/secret」结构性成立。
2. `pi_loop.rs:1150-1156`：第二枚 `tool_started{write}` **无条件覆盖** `active_tool_call`，
   槽位已占用不是 fail-closed 而是丢掉前一枚认领。影响有界（Node 状态机已禁「每 prompt 二枚
   未 finished tc」；`proposalHash` 不绑 tc，故覆盖换不来授权），但属账面归属的静默态丢失，
   与不变量 4 的字面相抵。建议随 `PI-WORKSPACE-READ-1` 改 fail-closed。
3. `session_started` 写侧记编译期常量而非握手真值——见 §二 的描述订正。
4. `pi_loop_workspace.rs:511-513`：`lstat_owned_directory_chain` 把「祖先不是目录」也报成
   `SymlinkForbidden`，与同模块 `open_child_dir:220-224` 刻意区分 `SymlinkForbidden`/
   `NotDirectory` 的体例不一致。理由不准，但门本身是 fail-closed，不影响放行。
5. `pi_loop_workspace.rs:243`：`ensure_child_dir` 把 `AlreadyExists` 视同建成。安全性由随后
   `open_dir_nofollow` 重开兜住，属未登记的行为选择。
6. 包公开面两处扩张未按偏离登记：`ProductSidecarSession.publicToolCallId`、
   `index.ts` 导出 `PRODUCT_TOOL_NAMES`。低危。

**fix-by-acceptance（本会话唯一改动的生产/文档面）**：`packages/pi-lane/SPEC.md` §十 单测计数
`450 例 / 14 文件` → `469 例 / 15 文件`，并记本会话实测日期。理由：该行体例自陈「本票只据实更新
该计数」，它今天是一句活体假话且修复在本票层内、零语义风险；⑦ 因「触碰面恰一处」自缚而未修，
由验收补上。**回执散文的订正（capability 计数、裁定A 措辞）不改实现回执**——STAGE7 留作实现方
历史记录，订正以本节为准。

## 八 · 门禁实跑（本树自跑，逐条记退出码，未经管道吞码）

| 门 | 结果 | 退出码 |
|---|---|---|
| `build:product-sidecar`（先于 cargo） | `sidecar.cjs` **534,219 B** / `8520026cb78e4fbd773b020a8b59a23082e55790403149de5fb91be332fce562`，`reproducible: true`，snapshot `created` | 0 |
| `pnpm -r build` | 通过（仅既有 Vite chunk-size warning） | 0 |
| `pnpm lint`（`eslint .`） | 通过 | 0 |
| root `pnpm test` | **168 files / 1813 tests passed** | 0 |
| `pnpm --filter @courtwork/desktop test` | **75 files / 690 tests passed** | 0 |
| `cargo test --lib`（`src-tauri`） | **218 passed / 0 failed / 1 ignored** | 0 |
| `pnpm test:e2e`（apps/desktop cwd，完整 Playwright，隔离端口 1487，`reuseExistingServer:false`） | **352 passed，3.0m**；其前全部静态 assert-* 门通过 | 0 |

sidecar 制品身份在**本树从源码独立重建**得出，与⑤ 建、⑥ 复核、⑦ 实测逐值相同；
`route-manifest.json`／`pi_loop_process.rs` 冻结真值表／同文件负注入语料三处钉值与实物一致，
全树无旧值（`523235`/`75eff9b9`）活体残留（仅存变迁叙事注释与既往相回执）。

**环境登记两枚**：（一）`nodejs.org` runtime 下载在本机首轮**挂死**（19 分钟、1.3s CPU、socket
空闲），同址 `curl` 实测 ~1.9 MB/s——判为环境态，改以已验 archive 预置后由脚本自身
`ensureArchive` 重验（`origin: "reused"`，逐项过冻结身份与 SHASUMS 记录）通过，门未放宽。
（二）本机 `umask` 实测 `0o022`、app-data 卷 `apfs`，G-12／G-13 的可复现前提成立。

**一枚自伤判例（记录在案，避免后人重蹈）**：变异还原用 `shutil.copy`+`move` 会把文件 mtime
**回拨**到备份时刻，早于 cargo 上一次记录的构建时间，于是 cargo 认定源码未变、**不重编**——
源码 SHA 逐值还原、`git status` 全净，跑出来的却仍是上一枚变异体（本会话据此一度读到
「216 passed / 2 failed」的假红）。`touch` 刷新 mtime 后两口径均复归 218/0/1。
**判例：还原核 SHA 只证源码，不证构建缓存；凡按 mtime 做指纹的构建系统，还原后必须前推 mtime 再复跑。**

## 九 · 结论与停止边界

**判定：PASS，待架构消费。** 票面冻结范围逐项在场、禁区未越；裁定A 经四角箱复裁成立；两道
产品闸与 `driver=None` 诚实边界成立；五段最重红证逐枚由本会话反向注入复现，无一采信自述；
八相全量门在本树全绿，sidecar 身份独立重建逐值相同。三十八条偏离无一需推翻为契约级。

移交架构四项：**裁定A 追认**（措辞按 §二 订正）；**上浮 B**（`logicalPath` 空串异源，
不阻断）；**上浮 D**（resume 漂移门缺 prompt/capability——**建议挂为 `PI-LANE-UI-1` 与
`PI-BASE-HEADLESS-ACCEPT` 注入真 driver 的前置**，在那之前它只是记账问题，在那之后是账实不符）；
**六条未登记偏离补登记**（§七），其中第 2 条（`active_tool_call` 静默覆盖）建议随
`PI-WORKSPACE-READ-1` 改 fail-closed。

本会话只追加本段 `packages/pi-lane/ACCEPTANCE.md` 与 §七 那一处 fix-by-acceptance；
**不 merge、不 push、不更新 `docs/status/current.md` 与 implementation-readiness、不开下游票**。
PASS 只覆盖 **package／host 级** write 面：`/workspace` 回读闭环属 `PI-WORKSPACE-READ-1`，
headless 总验属 `PI-BASE-HEADLESS-ACCEPT`，真 key 复核属 `PI-BASE-GUI-ACCEPT`，
power-loss durability 本链不宣称——⑦ §七 的四项「不宣称」经本会话复核，逐条如实。

合入时须同批跟进一处（非本分支缺陷）：`docs/status/current.md` 仍记 sidecar 身份
`523235 B / 75eff9b9…`（描述 `main@8d90aa8`），本票合入后与树上钉值不合。

# PI-TOOLS-HONESTY-1 独立验收（2026-08-05，REJECT）

目标 `39271f8`（实现 `f9cbc26` ＋回执 `39271f8`），base `main@f0d6df0`。
独立 clean worktree `.claude/worktrees/accept-pth`（detached 39271f8），本树自 install、
自建 `build:product-sidecar`、自跑八相门。**回执一律当未证宣称**：下列全部数字与红证均本会话实测。

## 一 · 总审：冻结范围在场，禁区未越

票面两枚缺陷逐项在场且形态正确：①`matchesTruncated` 与 `truncated` 分列，两件工具的 `details`
与结果文本双通道同批出账；②`skipped: {path, code}[]` 覆盖 `walkFiles` 的 `listDir` 失败与 grep
的 `readTextLines` 失败两处，`code` 直取上游 `FileErrorCode` 不自造词表。

禁区逐条核，均未越：`MAX_FILES_SCANNED=2000`／`MAX_MATCHES=200`／`MAX_LINE_LENGTH=400` 三枚值
逐字未动；`globToRegExp` 不在 diff 内；`if (entry.kind === 'symlink') continue;` 未动；write 与
host 行为面零触碰；wire 零改动——全仓 `.details` 消费点只有 `product-runtime.ts:172`
的 `isDeniedToolResult`（只读 `details.denied`），新增两键不进 journal、不进 golden。
`f0d6df0..39271f8` 恰九个文件，无越界文件。

D1 的四处钉值（`route-manifest.json` 的 bytes/sha256、`pi_loop_process.rs` 的冻结表两值与负注入
语料两靶）核为身份追随、零语义改动：Rust 侧唯一新增是一段变迁注释，`assert_ne!(mutated, compact,
"{label}：变异必须真的命中")` 这道变异靶失效守卫原样在位，故「replace 靶落空 → 静默 no-op」的
假绿形态被机器挡住。**判 D1 越「不动 host 面」字面边界成立，但属票面「包级全绿」直接逼出的
最小追随，不作拒因。**

## 二 · 拒绝理由：第三枚上限仍是静默截断，而本票新写入 SPEC 的「无注记即完整」是可证伪的全称句

本票的命题是「结果的不完整性必须**分因**可见」。它把两类说出来了，第三类原样留在同一个函数里，
且**新写入的 SPEC 句子把这条缺口盖住了**。

`tools.ts:273`（本票 hunk#4 改的正是它上面那两行）：

```ts
if (matcher.test(line)) hits.push(`${relative}:${index + 1}: ${line.slice(0, MAX_LINE_LENGTH)}`);
```

超过 400 UTF-16 单元的命中行被**无标记地切掉尾部**：无省略号、无注记、`truncated`／
`matchesTruncated`／`skipped` 三枚字段全部报「完整」。本会话反例（`dist` 现编产物，产品与 dev
共用的同一件 grep）：

| 输入 | 原行长 | 输出文本总长 | 行尾证据是否在场 | 任何截断标记 | details |
|---|---|---|---|---|---|
| 单文件单行，行内含 `关键证据在这里结尾` | 1211 | 416 | **否** | **无** | `{matched:1, scanned:1, truncated:false, matchesTruncated:false, skipped:[]}` |

与之直接冲突的是本票**新增**的两句：

- `SPEC.md` 五-8：「而**「没有注记」是一句可依赖的断言——本次检索完整**」；
- `tools.ts` `incompleteNote` 文档：「不完整注记：**三类**来源各自成句……「没有注记」因此是一句
  可依赖的断言——**结果完整**；而不是「本工具从不说这些」」。

这是一句闭集全称句（来源恰三类 ⇒ 无注记即完整），上表一行即证伪。落在法律材料上，它的形态
恰是本票开篇要治的病换了个位置：一条 400 字后才出现操作性内容的合同条款，模型看到的是一句
**看起来完整**的引语，而系统刚刚向它保证过「没有注记即完整」。ADR-022（本票所据同一 ADR）
第 110–111 行把「**截断未显式**」逐字列为 harness 缺陷、不得归因模型；不变量 4 与不变量 2 同向。

三条判定要件都成立，故不作「上浮不阻断」处理：

1. **同族、同函数、同一次改动的邻行**。回执三节自陈「`MAX_FILES_SCANNED`/`MAX_MATCHES`/
   `MAX_LINE_LENGTH` 三枚值……一概未动」——三枚都被点到眼前，只有两枚被诚实化，第三枚连一行
   登记都没有。`MAX_LINE_LENGTH` 在全仓现行文档（SPEC、ADR-022）里零出现，不存在「早已在别处
   登记」的退路。
2. **最小诚实动作在范围内且成本近零，且实现方当天演示过它**。修此缺口**不需要改上限值**（禁区
   是「不改上限值」，不是「不许说」）：要么给命中行加一枚标记＋一枚字段，要么把 五-8 那句全称句
   收窄并按 五-8 末段既有体例补一行「仍未收口的一处」。后者正是实现方为 `listDir` 单条目
   `lstat` 缺口写过的形状——同一份回执里，一个缺口如实交出，另一个同族缺口被一句全称句盖住。
3. **本票是把断言写强的那一票**。旧 五-7 只说「超限在结果里显式告知模型」，没有闭集承诺；
   本票把它改写成逐类枚举并追加「无注记即完整」。留旧措辞尚只是含糊，写成全称句即是新增的
   活体假话——D3 自己的判据（「不改即当日第二句活体假话」）在这里反向适用。

**同句还被另外两条既有行为二次证伪**（不单独构成拒因，但返修那一句须一并收口）：
`walkFiles` 对 `symlink` 的 `continue`（SPEC 五-5 登记为已知边界，但模型侧同样看不见任何注记）；
`product-case-env.ts:310` 产品形态下 `if (!normalizeCasePath(childLogical).ok) continue`——
保留名／控制字符／超长段的真实文件在产品链上被**静默**排除，全仓 SPEC 无登记，只有一行代码注释。

### 返修要求（二选一，选哪一枚属架构拍板）

- **甲**：命中行超长时出显式标记，并出一枚与 `truncated`／`matchesTruncated` 并列的独立字段
  （命名与是否进注记属契约，须回票面）；反例＝一枚超 400 的命中行必须可从输出判出被截，
  撤该标记须定向复红。
- **乙**：不改行为，但把 五-8 那句全称句改为**列名例外**：逐条写明 `MAX_LINE_LENGTH` 行截断、
  symlink 跳过、产品 grammar 排除三者不出注记，并按 五-8 末段体例交给下游票。
  代码里 `incompleteNote` 的「三类来源」文档同步订正。

两条都不需要动上限值、glob 语法、symlink 保守解、write／host 面或 wire。

## 三 · born-red 独立复现（逐 hunk 反向注入，非采信自述）

把 `tools.ts`／`sidecar-main.ts`／`route-manifest.json` 三份逐字回退到 `f0d6df0`、删除
`dev-config.ts`，测试面保持 tip 原样：

| 相 | 结果 | EXIT |
|---|---|---|
| 反向注入后 | `dev-config.test.ts` **整文件加载失败**（`Cannot find module './dev-config.js'`，0 test）＋ `tools.test.ts` **12 枚定向红** / 469 绿（481） | 1 |
| `cp` 还原 ＋ 前推 mtime | **489 例 / 16 文件全绿**，`git status` 全净 | 0 |

**12 vs 回执的 11：差额可解释且解释成立。** 多出的一枚是 `grep 单文件内命中超限：行层判据同样置
matchesTruncated`——回执 D7 已如实登记它是变异相补的、非先红后绿（红证＝M3）。回执 4.1 的 11 枚
是当时测试面的真值，本会话在**最终**测试面复现自然是 12。同理 `dev-config.test.ts` 现有 8 枚而
回执记 7 枚未计入，差额是 D7 的另一枚（`空值与坏值给两条理由`）。两处对得上，不作发现。

## 四 · 变异 11 枚逐枚复跑（本会话独立脚本，命中数校验恰为 1 方允改写，改后前推 mtime，跑毕 `cp` 还原并核 `git status` 归零）

| 变异 | 本会话定向红 | 回执宣称 | 附带 route-manifest 结构红 |
|---|---|---|---|
| M1 glob `else matchesTruncated = false` | 1 | 1 | 1 |
| M2 grep 跨文件满额撤置位 | 1 | 1 | 1 |
| M3 grep 行层满额撤置位 | 1 | 1 | 1 |
| M4 撤目录拒读登记 | 5 | 5 | 1 |
| M5 撤文件拒读登记 | 2 | 2 | 1 |
| M6 注记退回旧文案（`details` 不动） | 7 | 7 | 1 |
| M7 撤拒读路径投影（`path: absolute`） | 4 | 4 | 1 |
| M8 只撤 glob `details.matchesTruncated` | 3 | 3 | 1 |
| M9 只撤 grep `details.skipped` | 2 | 2 | 1 |
| M10 `dev-config` 有限正数门 → `value < 0` | 5 | 5 | **0** |
| M11 `dev-config` 撤空值专属分支 | 1 | 1 | **0** |

十一枚逐值相同，命名的红也逐条相同。M6 与 M8/M9 的双向唯一锚定成立（前者只动文本、后者只动
字段，两侧各有专属红）；M2/M3 互不遮蔽成立（250 份单行文件只打跨文件判据、250 行单文件只打行层
判据）。M10/M11 结构红为 0 是一条**独立证据**，坐实 `dev-config.ts` 不在 product bundle 内。

**M7 收窄读数：判「如实登记」，不要求补产品面独立锚。** 实测撤投影只红 dev 形态四枚，
`产品形态：skipped 路径只出逻辑根，物理根零泄漏` 仍绿——原因经本会话核实成立：产品容器
`createProductCaseEnv` 逻辑进逻辑出，`entry.path` 与 `absolutePath` 都已是 `/case/…`，物理根
**从未进入** `projectSkipped` 的入参，故该函数在产品形态是恒等。要求补一枚"产品面投影锚"只会造出
一枚恒真断言。该测试名里的「零泄漏」锚的是容器而非投影，这一点回执已在正文与 M7 段两处点明；
且该枚在 M4／M5／M9 下均转红，说明它对「拒读登记是否出账」这条真判据仍有区分力。**如实且够格。**

**M11 等价史：补锚确有区分力，实测无误。** 撤空值分支后 `Number('')===0` 仍被「非正数」门接住，
`空串不当成 0 收下` 那枚照绿；唯一转红的正是补的那枚 `空值与坏值给两条理由`。区分力由该锚独家
提供，D7 的「补于变异相、不冒充先红」登记如实。

## 五 · 两件工具 `matchesTruncated` 的语义差：如实且可辩护（专项探针四枚，本会话构造，跑毕删除、树净）

| 探针 | 观测 | 与 SPEC 五-7 措辞 |
|---|---|---|
| glob 恰 200 命中 | `matchesTruncated=false` | 「只在**真有**第 201 条被丢弃时置位」成立 |
| glob 201 命中 | `matched=200, matchesTruncated=true` | 同上 |
| grep 恰 200 命中且**无余文件** | `false` | 与「因命中已满而**停止继续搜**」自洽 |
| grep 恰 200 命中 ＋ 一份零命中余文件 | `true`，文本出「命中上限 200」 | 「满 200 条整时即便余下恰好零命中也置位」逐字成立 |

即：SPEC 的措辞不是「满 200 即置位」而是「因满额而停止」，本会话四枚探针与之逐字相符，未见
夸大。宁多报不少报的取向可辩护。「命中满额之后遇到的拒读**文件**不再进 `skipped`」经源码核实
成立（满额判据先于 `readTextLines`，那些文件根本没被尝试读）；同一条件下拒读**目录**仍会登记
（`listDir` 在 `walkFiles` 层无条件发生），SPEC 用词恰为「文件」，无误。

## 六 · CONTESTED 裁定核实：startup fail-closed 成立

- **结构论证核实**：`sidecar-main.ts:42` 是模块顶层 `await createDeepSeekLane()`，模块级另有三处
  `process.exit`——`import` 即执行全链，结构上确实进不了单测面。判定逻辑外提到 29 行纯函数
  `dev-config.ts` 是正确落点，不是为了凑一个可测面。
- **病根核实**：`budget.ts:41/43` 是 `usd >= limits.maxUsd` 与 `turns >= limits.maxTurns`；NaN 参与
  比较恒假，`exceeded` 永远 false。ADR-022 决定三的上限整枚失守属实。
- **三变量含 `PI_LANE_PORT`**：`sidecar-main.ts:38-40` 三枚全部经 `requirePositiveNumber`，无遗漏。
- **不回落默认**：`DevNumberResult` 的失败臂无 `value` 字段，调用方拿不到「先凑合用」的分支；
  测试 `拒绝时不返回任何可用值` 与 M10 的五枚红双向锁住。判据只到「有限正数」、端口值域交给
  Node `ERR_SOCKET_BAD_PORT` 的取舍，避免第二处可漂移真源，合理。

**裁定成立，不作拒因。**

## 七 · 移交条与未收口缺口登记：如实

`scoped-env.ts:144` 与 `product-case-env.ts:312` 逐行核对，两处 `if (info.ok) entries.push(...)`
确实存在且确为静默略过，行号逐字准确；SPEC 五-8 末段与九节两处均已登记且指向 env 契约与
`PI-WORKSPACE-READ-1` 同一接缝，判如实够格。D5 复核成立：全仓（去 `archive/`）无
`PI-WORKSPACE-READ-1-RECON.md`，`specs/` 目录实物核对确认不存在，改据就绪图定序无误。
D9 复核成立：`docs/status/current.md:149` 现记 `534,219 B / 8520026c…`，合入后即过时，须由架构同批改。

## 八 · 制品身份与 cargo：本会话独立重建、本门首次实跑

- `node packages/pi-lane/scripts/build-product-sidecar.mjs` 在本树从源码独立重建：
  `sidecar.cjs` **535,040 B** /
  `b3d974eff19fc1b984fe0d92ce7f2e769f44d6b375938b5d9f579c8354718206`，`reproducible: true`，
  snapshot `created`。另以 `buildDeterministicBundle()` **连编两次**取 SHA 相等复核。
  与 D1 宣称逐值相同。
- **`cargo test` 是 D8 自承未跑的那道门，本会话首次实跑：218 passed / 0 failed / 1 ignored，
  EXIT=0。** D1 的四处重钉无漏；负注入语料两枚 `replace` 靶均真命中（若落空，
  `assert_ne!(mutated, compact)` 当场红）。7 条 warning 全为既有 `unnecessary unsafe block`，
  与本票无关。

## 九 · 门禁实跑（本树自跑，逐条记退出码，未经管道吞码）

| 门 | 结果 | 退出码 |
|---|---|---|
| `build:product-sidecar`（先于 cargo） | 535,040 B / `b3d974ef…`，`reproducible: true`，snapshot `created` | 0 |
| `pnpm --filter @courtwork/pi-lane test` | **489 例 / 16 文件** | 0 |
| `pnpm -r build` | 通过（仅既有 Vite chunk-size warning） | 0 |
| `pnpm lint`（`eslint .`） | 通过 | 0 |
| root `pnpm test` | **169 files / 1874 tests passed** | 0 |
| `pnpm --filter @courtwork/desktop test` | **75 files / 690 tests passed** | 0 |
| `cargo test`（`src-tauri`） | **218 passed / 0 failed / 1 ignored** | 0 |
| `pnpm test:e2e`（apps/desktop cwd，完整 Playwright，隔离端口 1491） | **352 passed，3.0m** | 0 |

root 对账：`PI-WRITE-HOST-1` 合并 tip 记 1854，本票包级净增 20（469→489），1854+20=**1874**，
实测逐值相符。SPEC §十 的 489/16 与本树实跑一致，D3 订数如实。跑毕 `chrome-headless-shell`
残留计零，工作树 `git status` 全净、HEAD 仍为 `39271f8`。

## 十 · 结论与停止边界

**判定：REJECT。** 单一拒因即第二节：`MAX_LINE_LENGTH` 的命中行截断仍是静默的，而本票**新写入**
`SPEC.md` 五-8 与 `incompleteNote` 文档的「来源恰三类／没有注记即结果完整」是一句可被单条 1211 字
命中行当场证伪的全称句。返修按第二节甲／乙二选一，选哪一枚属架构拍板；两条都不触碰票面禁区。

**其余全部通过，返修勿重做**：两枚缺陷的实装形态、11 枚变异的红数与命名、born-red 全链、
CONTESTED 裁定、移交条与 D5／D9 复核、制品身份、cargo 首跑、八相全量门——本会话已逐项独立复现，
数字均在上表。M7 的收窄读数与 M11 的等价史两条，实测支持回执的登记，判「如实」，不要求补锚。

本会话只追加本段 `packages/pi-lane/ACCEPTANCE.md`，**未做任何 fix-by-acceptance**（第二节的两条
处方都触碰 SPEC 承诺或工具结果契约，属契约级，验收不得代改）；不 merge、不 push、不更新
`docs/status/current.md` 与 implementation-readiness、不开下游票。worktree
`.claude/worktrees/accept-pth` 保留至收编。

# PI-TOOLS-HONESTY-1R 独立复验（2026-08-05，REJECT）

目标 `5528222`（1R 实现 `801f522` ＋回执 `5528222`），链
`f9cbc26` → `39271f8` → 本会话首轮 REJECT `fa01eca` → `801f522` → `5528222`。
同一保留 worktree `.claude/worktrees/accept-pth`，`git checkout 5528222` 后自建制品、自跑八相门。
回执一律当未证宣称。

## 一 · 首轮拒因已闭合，形态正确

首轮单一拒因（`MAX_LINE_LENGTH` 行截断静默）按处方甲收口，本会话逐项复现：

- **反例转 permanent**：1211 字命中行现出行尾具名标记 `…（本行截断：原 1211 字符，只给前 400）`，
  `lineTruncated: 1` 进 `details`，注记出「1 行超长截断」子句。首轮反例的三个观察点全部翻转。
- **标记／字段／注记三向互斥实测成立**（M12/M13/M14，见五节）：撤任一枚只红其专属那一枚（或两枚），
  互不遮蔽。`clipLine()` 让「出面文本」与「是否被裁」同源返回，撤标记不可能仍报未裁——这一形状对。
- **symlink 二次证伪已闭合**：`symlinksSkipped` 计数＋独立注记子句，dev 与产品两形态各有锚（M15–M17）。
- **收窄句在两处容器排除下确为真**（三节复核），**D13 的分层判据成立**。

首轮我在报告第二节点名的两条二次证伪（symlink、grammar 排除）均已按其可观察性分别处置，无遗漏。

## 二 · 再拒理由：同一函数最后一条丢弃分支仍无账，1R 新写的「恰五类」与收窄句被同一条真命中同时证伪

`tools.ts:320`（1R 未触碰，就在本票 hunk#10 改动的三行之上）：

```ts
read.value.forEach((line, index) => {
  // 裸 NUL 是二进制的可靠信号：按二进制跳过，不把乱码喂给模型。
  if (line.includes('\u0000')) return;      // ← 裸 return，无字段、无注记、不计数
  ...
  if (!matcher.test(line)) return;
```

判据在 `matcher.test(line)` **之前**：一条**本会命中**的行，只要含裸 NUL 就被压掉，且不进任何账。

### 2.1 反例（本会话构造，dev 与产品两形态各一，附对照臂）

| 探针 | 语料 | 观测 |
|---|---|---|
| dev 形态 | 案卷内一份「像 PDF 的」二进制件（正文含 `合同编号 HT-2024-081`，该行含裸 NUL）＋一份普通 md | `无命中`，**无注记**；`{matched:0, scanned:2, truncated:false, matchesTruncated:false, lineTruncated:0, symlinksSkipped:0, skipped:[]}` |
| 产品形态 | 同件走 `/case` 链 | 同上，`{matched:0, scanned:1}`，无注记 |
| **对照臂** | 同一份内容**去掉 NUL** | `{matched:1}` |
| 单行 md | 一份 md，命中行尾带一枚 NUL | `无命中`、无注记、五枚字段全空 |

对照臂是关键：被压掉的确是一条**真命中**，不是「本来就没有」。

### 2.2 这直接证伪 1R 新写入 SPEC 的两句

`SPEC.md` 五-8（1R 新增）：

> **本层可观察的不完整来源恰五类**——扫描上限、命中上限、行截断、容器拒读、symlink 不跟随——
> 五类各自出字段与注记。故「工具结果里没有注记」是一句可依赖的断言，其**确切含义**是：
> **容器交给本层的每一个条目都被检索、每一条命中都完整列出**。

- 「恰五类」为假：NUL 行排除是**第六**类，且它 100% 属于「本层可观察」——判断就写在本层、
  用本层手里的整行数据做出。1R 自己选定的分层判据（可观察性）明白无误地把它划进甲路。
- 「每一条命中都完整列出」为假：上表对照臂证明那一行 `matcher.test` 为真，它既没被列出，
  也没有任何字段或注记提到它。

### 2.3 全函数丢弃分支逐条扫描：九条，八条有账，第九条没有

不按我点名的实例收口，按**族**收口。`tools.ts` 检索路径上全部会丢内容的分支：

| # | 位置 | 分支 | 出账 |
|---|---|---|---|
| 1 | `walkFiles:105` | `!listed.ok`（目录拒读） | `skipped` ✓ |
| 2 | `walkFiles:113` | `kind === 'symlink'` | `symlinksSkipped` ✓（1R） |
| 3 | `walkFiles:120` | `scanned >= MAX_FILES_SCANNED` | `truncated` ✓ |
| 4 | `glob:247` | `matches.length >= MAX_MATCHES` | `matchesTruncated` ✓ |
| 5 | `grep:308` | `hits >= MAX_MATCHES`（跨文件） | `matchesTruncated` ✓ |
| 6 | `grep:313` | `!read.ok`（文件拒读） | `skipped` ✓ |
| 7 | `grep:322` | `hits >= MAX_MATCHES`（行层） | `matchesTruncated` ✓ |
| 8 | `clipLine:141` | 行长 > `MAX_LINE_LENGTH` | `lineTruncated` ＋行尾标记 ✓（1R） |
| **9** | **`grep:320`** | **`line.includes('\u0000')`** | **无** ✗ |

（`globToRegExp` 的两处 `continue` 是模式解析，`!matcher.test` 两处是「不命中」，均非丢弃。）
九条丢弃/限幅分支，八条有账。**这是一次可穷举、已穷举的扫描**——不是又挑了一个更尖的尖端，
而是本函数最后一条没账的分支。

### 2.4 为什么这不作「上浮不阻断」

三条与首轮同构：

1. **判据是 1R 自己立的，而扫描没做完。** 1R 把处置规则写成「本层可观察 → 甲」，这条规则对；
   但没有按这条规则把函数扫一遍，于是又留下一枚落在规则内、却被闭集句盖住的成员。
   首轮判例「闭口按族不按验收点名的实例」在这里第二次适用——这一次实现方已经走到了「立族」，
   只差把族里的成员点完。
2. **产品语义上是同一种病，不是更轻的一种。** 案卷里放着扫描件 PDF、docx 导出的带控制字节的 md，
   是这条产品线的常态；模型问「本案有没有 HT-2024-081」，工具答「无命中」并**附带一句结构性保证
   说结果完整**。这正是票面开篇写的「对法律材料的自信假阴」，换了个触发条件。
3. **最小诚实动作照旧在范围内、成本近零。** 不需要改 `MAX_LINE_LENGTH`、不需要改 NUL 判据本身
   （二进制不喂给模型这一策略我不反对，就像不跟随 symlink 一样）：需要的只是**让跳过出账**——
   1R 自己为 symlink 写下的那句话逐字适用：「保守解是策略，隐瞒不是」。

**如实登记我方的账**：这一枚首轮我没找到，首轮报告第二节只点了 symlink 与 grammar 排除两条。
1R 在我点名之外自行提炼了判据，方向正确；本次拒的是判据之下的**清点不全**，不是判据。

### 2.5 返修要求

- **甲（推荐）**：`grep` 的 NUL 分支出账——一枚与其余并列的计数（例如「N 行按二进制跳过」或
  按文件计的「N 份疑似二进制未按文本检索」，命名与粒度属契约，须回票面）＋注记子句；
  反例＝上表 dev/产品两形态与对照臂各转 permanent，撤字段、撤注记、撤计数源三层各自窄红。
- **乙**：不改行为，但把 五-8 的「恰五类」与「每一条命中都完整列出」按实收窄，并把 NUL 排除
  逐条登记为已知边界。**注意乙路在这里比 symlink 那次更难自洽**：symlink 最终没走乙，理由是
  「本层看得见就得说」；同一理由对 NUL 同样成立。
- 无论甲乙，请**同批把整条丢弃分支表（上表九行）写进 SPEC 或回执**，让下一次改这个函数的人
  不必再靠逐次验收来发现族里还有谁。

**同批上浮一枚（不作拒因，属 env 契约面）**：`scoped-env.ts:111` 的
`readFile(absolute, 'utf8')` 对非法 UTF-8 字节静默替换成 U+FFFD——命中行**内容被改写**后原样
交给模型，无任何标记（本会话实测：`合同编号 HT-2024-081 <FF FE FD> 尾` 出面为含替换字符的一行，
无注记）。它住 env 而非工具层，与 五-8 已登记的两处容器排除同一接缝，建议一并挂
`PI-WORKSPACE-READ-1`；ADR-022 六-B.1 对 wire 侧明令禁止这种替换后继续，读取侧目前无对应条款。

## 三 · 分层裁定 D13 终裁：**分层成立，予以确认**

协调留我终裁，据下列独立核实结果确认：

- **甲路对「本层可观察」正确**：行截断与 symlink 都在 `tools.ts` 内、以本层持有的数据判定，
  出字段＋注记是唯一诚实解。1R 的处置正确。
- **乙路对 grammar 排除结构上必需**，本会话核到上游契约层：
  `@earendil-works/pi-agent-core@0.82.1` `dist/harness/types.d.ts:182`
  `listDir(path, abortSignal?): Promise<Result<FileInfo[], FileError>>`——**单个 Result**，
  `FileInfo`（同文件 138–148 行）无「被排除」变体，`FileErrorCode`（91 行）是闭集 8 枚。
  容器在 `listDir` 内部 `continue` 掉的条目，在这个契约下**没有任何位置**可以带出来。
  故对第三形按甲实施确实不可能，不改 env 契约就办不到，而那属 `PI-WORKSPACE-READ-1`。
- **收窄句在两处容器排除下确为真**：（a）产品 grammar 排除——1R 新增测试直接钉住形态
  （容器 `listDir('/case')` 只回 `['/case/正常.md']`，保留名条目从未交给工具；工具把拿到的
  一个条目全检索了，故按收窄口径无注记，成立）；（b）单条目 `lstat` 失败——同理，工具收不到该条目。
  两处均落在「容器交给本层的条目」之外，收窄句对它们成立。

**分层判据本身我确认为对，并建议架构追认。** 本次拒的是甲路成员清点不全（二节），不是分层。

## 四 · D12 复核：首轮那条正面证据确曾立在坏地基上

反向注入实测：把 1R 改过的那枚正面语料换回**首轮原样**（跑在主 fixture 上），对 1R 生产面复跑——

```
FAIL  未触任一上限时两枚字段都出 false，且不附注记
AssertionError: expected '命中 3 份…（另有 1 处符号链接未跟随（本容器一律不跟随）；结果可能不完整）'
  not to contain '不完整'
```

1 红 / 495 绿。主 fixture 的 `外链` symlink 使那棵树在 1R 口径下本就不完整，故**首轮我复现通过的
那枚「无注记」正面证据，当时是在一棵不完整的树上取得的**。D12 的登记如实，改动必要且形态正确
（改用无 symlink 的干净 sandbox，而不是放宽断言）。还原后逐字复原、`git status` 归零。

## 五 · born-red 与变异复跑（本会话独立脚本，命中数校验恰为 1 方允改写，还原后前推 mtime）

**born-red**：把 `tools.ts` 与 `route-manifest.json` 逐字回退到 `fa01eca`（测试面保持 1R 原样）——
**8 枚定向红** / 488 绿（496），EXIT=1；`cp` 还原后 **496/16 全绿**、`git status` 归零。
回执 8.3 记 7 枚，差额来自其后把「标记」与「字段」拆成两枚锚（M12/M13 各自窄红所必需），
拆前 495 例、拆后 496 例——**回执自陈了这次拆分**，对得上，不作发现。

| 变异 | 本会话定向红 | 回执宣称 | 附带结构红 | 命名的红 |
|---|---|---|---|---|
| M12 撤行截断**标记** | 1 | 1 | 1 | 反例·标记与原长 |
| M13 撤 grep `details.lineTruncated` | 2 | 2 | 1 | 反例·计数／未超长零标记 |
| M14 撤行截断**注记子句** | 1 | 1 | 1 | 行截断进注记 |
| M15 撤 glob `details.symlinksSkipped` | 4 | 4 | 1 | 干净树无注记／symlink 双工具／symlink 产品形态／grammar 收窄形 |
| M16 撤 symlink **注记子句** | 2 | 2 | 1 | symlink 双工具／symlink 产品形态 |
| M17 撤 `walkFiles` **计数源** | 2 | 2 | 1 | symlink 双工具／symlink 产品形态 |

六枚逐值相同。**M12/M13/M14 的三向互斥经实测成立**：三枚红集两两不相交，标记、字段、注记
各有专属锚。**M16 与 M17 红同一对测试名**——回执对 symlink 族只宣称「覆盖字段/注记/计数源三层」
而未宣称互斥，措辞与实测相符，不作发现；grep 侧的 `symlinksSkipped` 字段由 `symlink 双工具`
那枚的循环断言覆盖，未失锚。

## 六 · 制品身份第三录与 cargo（1R 后首次实跑）

- 本树从源码独立重建：`sidecar.cjs` **535,827 B** /
  `a9ae0f93f20bce27a42c3630ab5f76f6c19b7f511fe4b7b38c13913a03172072`，`reproducible: true`。
  与 D11 宣称逐值相同。
- **首跑落在正式根 fail-closed 上**：`action: "failed"`，理由「正式根已存在且与本轮不一致，
  拒绝原地覆盖：sidecar.cjs 与本轮 stage 不 byte-identical——换 source 须显式 clean snapshot」，
  EXIT=1。按 `PI-WRITE-HOST-1` 验收已在册的同一处方，显式删正式根后重建，`action: "created"`、
  EXIT=0。**这是该 fail-closed 第二次被实证，门未放宽。**
- **七处钉值逐条核**：`route-manifest.json` bytes/sha 两处、`pi_loop_process.rs` 变迁注释一处、
  冻结表 bytes/sha 两处、负注入语料 bytes/sha 两处——全部为新值；旧值 `535040`/`b3d974ef`
  在现行源码与配置中**零活体残留**（仅存于 `ACCEPTANCE.md` 首轮报告与本票回执的历史叙事）。
- **`cargo test` 1R 后首次实跑：218 passed / 0 failed / 1 ignored，EXIT=0。** 负注入的
  `assert_ne!(mutated, compact, "…变异必须真的命中")` 靶失效守卫原样在位，故两枚 `replace` 靶
  确实命中，非静默 no-op。

## 七 · 门禁实跑（本树自跑，逐条记退出码，未经管道吞码）

| 门 | 结果 | 退出码 |
|---|---|---|
| `build:product-sidecar`（clean snapshot 后） | 535,827 B / `a9ae0f93…`，`reproducible: true`，`created` | 0 |
| `pnpm --filter @courtwork/pi-lane test` | **496 例 / 16 文件** | 0 |
| `pnpm -r build` | 通过（仅既有 Vite chunk-size warning） | 0 |
| `pnpm lint`（`eslint .`） | 通过 | 0 |
| root `pnpm test` | **169 files / 1881 tests passed** | 0 |
| `pnpm --filter @courtwork/desktop test` | **75 files / 690 tests passed** | 0 |
| `cargo test`（`src-tauri`） | **218 passed / 0 failed / 1 ignored** | 0 |
| `pnpm test:e2e`（apps/desktop cwd，完整 Playwright，隔离端口 1493） | **352 passed，3.0m** | 0 |

root 对账：首轮 tip 实测 1874，1R 包级净增 7（489→496），1874+7=**1881**，实测逐值相符，
与回执九节给的对账口径一致。SPEC §十 的 496/16 与本树实跑一致。跑毕 `chrome-headless-shell`
残留计零，工作树 `git status` 全净、HEAD 仍为 `5528222`。

## 八 · 结论与停止边界

**判定：REJECT。** 单一拒因即第二节：`grep` 的 NUL 分支是本函数九条丢弃分支里**最后一条没有账**
的，它压掉的是 `matcher.test` 为真的真命中（对照臂已证），而 1R 新写入 SPEC 五-8 的「本层可观察
的不完整来源恰五类」与「每一条命中都完整列出」被同一条反例同时证伪。返修按 2.5 甲／乙二选一，
并同批把九行丢弃分支表写进现行文档。

**已通过、返修勿重做**：首轮拒因的收口形态（标记＋字段＋注记，三向互斥实测）、symlink 族三层
锚（M15–M17）、born-red 全链、D12 复核、**D13 分层裁定（本节予以确认并建议架构追认，含上游
`listDir` 契约的结构性核实）**、收窄句在两处容器排除下为真、制品身份第三录与七处钉值、
cargo 1R 后首实跑、八相全量门——本会话已逐项独立复现，数字均在七节。

本会话只追加本段 `packages/pi-lane/ACCEPTANCE.md`，**未做 fix-by-acceptance**（2.5 的两条处方
都触碰 SPEC 承诺或工具结果契约，属契约级）；不 merge、不 push、不更新 `docs/status/current.md`
与 implementation-readiness、不开下游票。合入相仍须把 `current.md` 的 sidecar 身份改为
**535,827 B / `a9ae0f93…`**（不是首轮的 535,040）。worktree `.claude/worktrees/accept-pth`
保留至收编。

# PI-TOOLS-HONESTY-2R 独立三验（2026-08-05，PASS）

目标 `078c9e8`（2R 实现 `84b8b7b` ＋回执 `078c9e8`），链
`f9cbc26` → `39271f8` → REJECT `fa01eca` → `801f522` → `5528222` → REJECT `13eab2e` →
`84b8b7b` → `078c9e8`。同一保留 worktree `.claude/worktrees/accept-pth`，`git checkout 078c9e8`
后自建制品、自跑八相门。回执一律当未证宣称。

## 一 · 三验核心：族表审计——我自扫一遍，与回执十节逐条对码，无第十条

复验拒因给的收口条件是「把族清点完，并把清单交出来」。故本节先做**独立扫描**，扫完再与回执
十节对表——两表若有差，那个差就是三验的结论。

我方独立扫描（读全文 436 行，逐个 `continue`/`break`/裸 `return` 分类，不参照回执十节）：

| # | 位置 | 分支条件 | 我方判定 | 现行账目 |
|---|---|---|---|---|
| 1 | `walkFiles:104-106` | `!listed.ok` | 丢弃 | `skipped` ✓ |
| 2 | `walkFiles:111-113` | `entry.kind === 'symlink'` | 丢弃 | `symlinksSkipped` ✓ |
| 3 | `walkFiles:120` | `scanned >= MAX_FILES_SCANNED` | 限幅 | `truncated` ✓ |
| 4 | `glob:257/259` | `matches.length >= MAX_MATCHES` | 限幅 | `matchesTruncated` ✓ |
| 5 | `grep:318-320` | `hits >= MAX_MATCHES`（跨文件） | 限幅 | `matchesTruncated` ✓ |
| 6 | `grep:324-326` | `!read.ok` | 丢弃 | `skipped` ✓ |
| 7 | `grep:334-336` | `line.includes('\u0000')` | 丢弃 | **`nulLinesSkipped` ✓（2R）** |
| 8 | `grep:338-340` | `hits >= MAX_MATCHES`（行层） | 限幅 | `matchesTruncated` ✓ |
| 9 | `clipLine:139-144` | `line.length > MAX_LINE_LENGTH` | 限幅 | `lineTruncated` ＋行尾标记 ✓ |

**两表逐条相同，坐标相同（个别条目差 ±1 行，回执已自陈「行号会漂，条件与函数名不漂」），
判定相同，账目相同。无第十条。**

非丢弃分支我方亦独立分类，与回执点名的四类逐条相同：`globToRegExp:73/77`（模式解析推进）、
`walkFiles:101` `break`（`queue.length > 0` 已保证不可达的防御守卫）、`walkFiles:117`
（目录入队，继续走）、`glob:256` 与 `grep:342` 两处 `!matcher.test`（「不命中」是检索结论）。

**我方补一条回执未写、但族表穷尽性实际依赖的结构前提**，本会话核实成立：上游
`FileKind = "file" | "directory" | "symlink"`（`pi-agent-core@0.82.1`
`dist/harness/types.d.ts:89`）是**闭三集**。`walkFiles` 的 `for` 体先判 symlink、再判 directory、
其余落入文件分支——若 `FileKind` 还有第四枚，就会有一类条目从「其余」悄悄落进文件分支
（那是**多算**不是丢弃，故仍不构成第十条丢弃分支，但穷尽性论证少了这一步就不闭合）。
建议返修外由架构把这条前提补进十节表下，作为族表可证穷尽的显式依据。

另核三枚**不属于检索路径**的早退（`glob:245`、`grep:297`、`grep:303`、以及 read binder 的
`bindReadToLogicalRoot:403`）：它们整枚中止调用并回 `denied: true` / `invalidPattern: true` 的
显式结果，模型收到的是拒绝而非残缺结果，故不入本族。回执十节未点名它们，我方判定不构成遗漏。

## 二 · 拒因收口：三臂反例转 permanent，红证与现绿双向复现

复验第二节的三臂反例已逐字转 permanent（`tools.test.ts` 的 `2R · 裸 NUL 行：跳过是策略，
隐瞒不是`，四枚）。**born-red**：把 `tools.ts` 与 `route-manifest.json` 逐字回退到 `13eab2e`
（测试面保持 2R 原样）——**4 枚定向红** / 496 绿（500），EXIT=1，逐枚正是那四枚；
`cp` 还原并前推 mtime 后 **500/16 全绿**、`git status` 归零。与回执 9.3 的「4 红/496 绿」逐值相同。

**对照臂断言判别词已改，自伤登记如实**：原写 `not.toContain('二进制')` 而语料正文含
「附件二进制尾」，命中行一出面即自撞；现改为只认注记子句 `按二进制跳过`。本会话核实
语料与判别词已无交集（语料无「按二进制跳过」，注记子句为「已按二进制跳过」），
且该枚在 M18/M20 下红绿分明，改后仍有区分力。登记的教训（**断言的判别词不得与语料词表相交**）
与首轮「反例装置须自证有效」同族，措辞准确。

### M18/M19/M20 三向窗口（本会话独立脚本，命中数校验恰为 1，还原后前推 mtime）

| 变异 | 本会话定向红 | 回执宣称 | 结构红 | 命名的红 | **不红的那一枚（窗口）** |
|---|---|---|---|---|---|
| M18 撤 grep `details.nulLinesSkipped` | 3 | 3 | 1 | 对照臂／dev 计数／产品形态 | **dev 注记** |
| M19 撤 NUL **注记子句** | 2 | 2 | 1 | dev 注记／产品形态 | **dev 计数**、对照臂 |
| M20 撤**计数源** `nulLinesSkipped += 1` | 3 | 3 | 1 | dev 注记／dev 计数／产品形态 | **对照臂**（0 仍是 0） |

三枚逐值相同，且三向互斥经实测成立：每一枚都有一枚**别人红而它不红**的判据，故字段、注记、
计数源三层各自被独家锚定，与 1R 的 M12/M13/M14（行截断族）同形。

## 三 · NUL 粒度（D16）与注记措辞：如实，策略确实一字未改

- **策略未动经逐字核**：`13eab2e..078c9e8` 的 `tools.ts` diff 显示判据行
  `if (line.includes('\u0000'))` **本身未改**，改的只有函数体（裸 `return` → 先 `+= 1` 再
  `return`）；判据仍是 `forEach` 体第一句，位置在 `hits >= MAX_MATCHES` 与 `matcher.test` **之前**。
  「先认出二进制、再谈匹配」的语义与「不把乱码喂给模型」的策略确实一字未改。
- **注记措辞如实**：「另有 N 行含裸 NUL，已按二进制跳过（未按文本检索，**其中可能有命中**）」。
  判据既在 matcher 之前，就既不能说「有命中」也不能沉默，「可能有」是唯一诚实的量词；
  「未按文本检索」把行为说清楚而不越界宣称。措辞与 SPEC 五-7/五-8 逐字相符。
- **粒度取行（D16，[需架构追认]）判如实**：按行＝与分支同位、零新增状态；按份需引入文件级状态
  与路径投影两个新概念，与复杂度节制相冲。取舍已登记进 SPEC 五-8 且标注待追认，**不悬置**。
  我方无异议，建议架构追认。
- **一处如实登记的过报**（不作缺陷）：`nulLinesSkipped += 1` 位于命中上限判据之前，故命中满额
  之后遇到的 NUL 行仍计数。方向是**多报不完整**，与 五-7 已登记的「宁可多报一次，不肯少报一次」
  同向；同一注记里 `matchesTruncated` 亦在场，模型不会被误导。

## 四 · 容器层三处边界与移交措辞：齐备

- 五-8 末段现列**三处**：（a）产品 grammar 排除、（b）单条目 `lstat` 失败、
  （c）**`readFile(…, 'utf8')` 的 U+FFFD 静默替换**（复验上浮，已如实收进）。
  前两处「丢条目」与第三处「改内容」的形态差被点明，未混为一谈。
- 结构性理由与我方复验核到的上游事实逐字一致：`Result<FileInfo[], FileError>` 单值、
  `FileInfo` 无「被排除」变体、`FileErrorCode` 闭集 8 枚。ADR-022 六-B.1「wire 侧禁替换后继续、
  读取侧无对应条款」的不对称亦如实点出，并随之交出。
- 九节移交条：未收口处两处→**三处**，另交出九行族表，并写明 `ExecutionEnv` 若在双根改造里
  获得 per-entry 失败/排除通道**与「内容已被替换」的标记位**即可同批收口。措辞准确、去向明确。

### fix-by-acceptance（本会话唯一改动的文档面，一处）

`packages/pi-lane/SPEC.md` 五-8：`现有**两处**，逐条登记：` → `现有**三处**`。该数字是 1R 措辞
的残留，与紧随其后的 (a)(b)(c) 三条枚举、同段两行后的「**三处**都要改 env 契约本身」、
以及九节的「同批未收口的**三处**」三处自相矛盾。**零语义风险**：正确值已由同段与九节三处独立
确定，本次只是让那一枚数字与它自己的清单一致。按 `PI-WRITE-HOST-1` 验收「SPEC §十 订数」
的同形先例处理。改后 `pnpm lint` 与 root `pnpm test` 已复跑（见六节末行）。

**不作拒因的理由，如实写明**：本票前两轮的拒因都是「一句关于系统行为的假话独占该论断、
且掩盖着一枚真缺陷」；本处是一个紧接着自己完整枚举、并在同段与他节被两次正确复述的**陈旧数词**，
读者无从据它得出错误结论，亦未掩盖任何行为。二者不同族，故按实现级小缺陷处理。

## 五 · 制品身份第四录、九处钉值与三轮变迁注释

- 本树从源码独立重建：`sidecar.cjs` **536,123 B** /
  `060cc00afff2f5d1178d16e0a8c4c18a136525936caf1d4133ffde96938fec17`，`reproducible: true`，
  snapshot `created`。与 D15 宣称逐值相同。
  **如实登记**：本轮我在建之前已先删正式根（1R 验收实测过的处方），故未再观察一次 fail-closed
  拒绝——该守卫的实证在 1R 那一节（`action:"failed"`／EXIT=1），本轮是**应用处方**而非复测守卫。
- **九处钉值逐条核**：`route-manifest.json` bytes／sha 两处；`pi_loop_process.rs` 变迁注释**三段
  值**（首轮 →535,040/`b3d974ef…`、1R →535,827/`a9ae0f93…`、2R →536,123/`060cc00a…`）；
  冻结表 bytes／sha 两处；负注入语料 bytes 一处、sha 小写/大写一对。全部为新值。
- **变迁注释三轮完整链**成立：`pi_loop_process.rs:915-925` 现记「`PI-TOOLS-HONESTY-1` 的
  `tools.ts` 只读检索面诚实化第四次换，其中三轮各移一次」并逐轮列值，不再只留末值——
  这比 1R 的写法更可追。
- **旧值零活体残留**：`535827`／`a9ae0f93` 在 `pi_loop_process.rs` 内仅出现于上述变迁注释
  （920–923 行），断言、负注入靶与 manifest 中零出现；其余命中只在 `ACCEPTANCE.md`
  与本票回执的历史叙事里。
- **`cargo test` 三验重跑：218 passed / 0 failed / 1 ignored，EXIT=0。** 负注入的
  `assert_ne!(mutated, compact, "…变异必须真的命中")` 靶失效守卫原样在位，两枚 `replace` 靶确实命中。

## 六 · 门禁实跑（本树自跑，逐条记退出码，未经管道吞码）

| 门 | 结果 | 退出码 |
|---|---|---|
| `build:product-sidecar`（clean snapshot 后） | 536,123 B / `060cc00a…`，`reproducible: true`，`created` | 0 |
| `pnpm --filter @courtwork/pi-lane test` | **500 例 / 16 文件** | 0 |
| `pnpm -r build` | 通过（仅既有 Vite chunk-size warning） | 0 |
| `pnpm lint`（`eslint .`） | 通过 | 0 |
| root `pnpm test` | **169 files / 1885 tests passed** | 0 |
| `pnpm --filter @courtwork/desktop test` | **75 files / 690 tests passed** | 0 |
| `cargo test`（`src-tauri`） | **218 passed / 0 failed / 1 ignored** | 0 |
| `pnpm test:e2e`（apps/desktop cwd，完整 Playwright，隔离端口 1495） | **352 passed，3.0m** | 0 |

root 对账：复验 tip 实测 1881，2R 包级净增 4（496→500），1881+4=**1885**，实测逐值相符，
与回执十一节的对账口径一致。SPEC §十 的 500/16 与本树实跑一致。
**四节的 fix-by-acceptance 之后已复跑** `pnpm lint`（EXIT=0）与 root `pnpm test`
（**169 files / 1885**，EXIT=0）——按「门跑过之后又编辑就必须重跑」。跑毕
`chrome-headless-shell` 残留计零，工作树只余本段追加。

## 七 · 移交架构（均不阻断）

1. **D13 分层裁定**（1R 立、2R 沿用）——复验已确认，**请追认**。
2. **D16 `nulLinesSkipped` 命名与按行粒度**——三验判如实且合理，**请追认**。
3. **D17 九行族表入回执十节**——本节一节的独立扫描与之逐条对码通过；建议架构把
   `FileKind` 闭三集这条**穷尽性前提**补进表下（见一节末）。
4. **上浮：产品形态下授权根自身拒读时 `skipped[0].path` 为 `/case/`（末尾多一枚斜杠）**。
   本会话实测：case 根 `chmod 0` 后产品链回 `[{path:'/case/', code:'permission_denied'}]`。
   条目**已出账**，只是路径形态与 dev 形态（D6 已把空相对路径显示成 `.`）不一致，属外观级。
   `PI-WORKSPACE-READ-1` 要动 `HitProjection` 做双根，建议顺手收口，本票不改。
5. 合入相请把 `docs/status/current.md` 的 sidecar 身份改为 **536,123 B / `060cc00a…`**
   （既非首轮 535,040，亦非 1R 535,827）；D9 登记的这一条至今仍未由架构面更新。

## 八 · 结论与停止边界

**判定：PASS，待架构消费。** 三验的核心问题——「族清点完了没有」——以本会话独立扫描给出
肯定回答：九条丢弃/限幅分支现全部有账，四类非丢弃分支的排除理由逐条成立，**无第十条**；
两轮拒因（行截断、裸 NUL）的收口形态各由三向互斥变异独家锚定；三臂反例已转 permanent 并
双向复现；容器层三处边界登记齐备、移交去向明确；制品身份第四录与九处钉值本树独立重建逐值相同；
八相全量门在本树全绿。

本会话唯一改动的产品/文档面是四节那一处 fix-by-acceptance（SPEC 五-8 数词 两处→三处），
**未做任何契约级修改**；不 merge、不 push、不更新 `docs/status/current.md` 与
implementation-readiness、不开下游票。PASS 只覆盖 `packages/pi-lane` 只读检索面的**诚实出账**
与本票冻结范围：容器层三处（grammar 排除、单条目 `lstat`、U+FFFD 替换）本票未修、按边界登记，
其收口属 `PI-WORKSPACE-READ-1`；真 key 复核属 `PI-BASE-GUI-ACCEPT`。
worktree `.claude/worktrees/accept-pth` 保留至收编。

# PI-WORKSPACE-READ-1 独立验收（2026-08-05，PASS）

目标 `8af1db9`，链 `1117569`（自侦察）→ `06e777b`（Node 读面）→ `dbf4d4f`（Rust 读臂＋
`openWorkspaceMarkdown`）→ `8af1db9`（回执），base `main@26c2acf`。独立 clean worktree
`.claude/worktrees/accept-pwr`，自 install、自建制品、自跑八相门。回执与 SPEC 的每一句宣称
一律当未证，逐条自证或自否。

## 一 · 总审：票面五项退出证据逐条在场，禁区未越

| 票面判据 | 本会话核到的落点 | 判 |
|---|---|---|
| write→批准→Rust 落盘→byte-identical read-back | Rust `real_read_arm_returns_the_bytes_the_write_arm_landed`：真件 `perform`（`AlwaysApprove` 测试 driver）落盘后同 leg `read_file`，`content`/`contentSha256`/`byteLength` 三值逐值等于写入那一份；Node 侧同闭环由 `product-runtime.test.ts`「write → 回读」以内存宿主表建模 | 成立 |
| glob/grep 双根 | `tools.test.ts` 双根七枚：不给起点两根全检索、给起点只走所属根、跨根行号与前缀各自成立 | 成立 |
| interrupted/resumed 新 leg read-back | `a_new_leg_after_interruption_reads_back_what_the_previous_leg_wrote`：第一腿写入后 `reclaim_after_fault` 落 `session_interrupted`，第二腿（新 requestId）逐字节读回，并断言 journal 真含 `SessionInterrupted`＋`SessionResumed` 两型作前置对照 | 成立 |
| viewer 对 session/path/UTF-8/131072 双验，物理路径零泄漏 | `viewer_double_gate_…`（八格）、`viewer_session_gate_runs_before_touching_the_filesystem`、`viewer_refuses_oversized_markdown`；出参结构体无物理路径字段，`WorkspaceViewError::message()` 是静态八行表，测试逐格断言不含 `app_data` 与链接目标。ADR 六-D 的 1,024 bytes 上限与八枚 code 闭集逐字对上 | 成立 |
| 两根无串读、symlink 不跟 | `sessions_do_not_read_through_to_each_other`（换 session、换 container 各一）、`read_face_does_not_follow_symlinks_at_any_segment`（末段＋中间段） | 成立 |
| `list` 不成为模型工具 | `READ_ONLY_TOOL_NAMES` 未变，`createReadOnlyTools` 仍恰三件 | 成立 |
| 不得自动晋升工作稿 | 本批零新增写路径；读容器六枚写面方法与 `exec` 全部 `not_supported`，且 `port` 零调用（有专测） | 成立 |

**wire 零 schema 变更**：`git diff 26c2acf..8af1db9 -- apps/desktop/src-tauri/src/pi_loop_protocol.rs`
空，Node 侧 `product-protocol.ts`／`product-stdio.ts` 亦不在改动面内——本票确是接线不是扩契约。
**journal 十九型闭集零变化**：`pi_loop_journal.rs` 的 diff 中 `JournalType` 命中数为 **0**；
唯一动的是 `LEGAL_CAPABILITY_SETS` 的**值域扩员**（三员并存、旧两档续 valid），循裁定A 先例。
读不落账由 `real_read_arm_…` 的记录序断言钉住（与纯写那一枚逐型相同），并另断言回读正文与
物理根都不进 journal 文本。

**ADR 六-B.2 read 行确实存在**：域串 `courtwork.pi.workspace_read.v1` ＋ sessionId／requestId／
operationId／operation／logicalPath 六枚 frame，与实装逐字相同。回执七.2-A 的自我更正
（RECON 曾误报「未定义」）如实，且 ADR 本身未被本票改动。

**`tools.ts` 对 `PI-TOOLS-HONESTY-1` 九行族表逐条核**：九条丢弃/限幅分支（目录拒读、symlink、
扫描上限、glob 命中上限、grep 跨文件命中上限、文件拒读、裸 NUL 行、grep 行层命中上限、行截断）
判据、位置与口径**一条未动**，只把遍历基准与投影按根拆开；`skipped`／`symlinks` 按根归并，
`scanned` 以 `scannedBefore` 续账（全次调用一份额度，用尽即 `break`）。六类来源与九条分支的
对应关系不变。上一轮验收移交的「`/case/` 尾斜杠」已由 `rootProjection` 的空相对路径特例收口，
M1 是它的红证。

## 二 · 核心行为专项：不采信自述，逐条注反例

九枚变异全部由本会话独立施加（Edit 唯一匹配即命中数校验恰为 1），跑毕 `cp` 还原并前推 mtime，
每次 `git status --porcelain` 归零后才做下一枚。

| 编号 | 变异 | 本会话实测 | 回执宣称 | 判 |
|---|---|---|---|---|
| M1 | 撤 `rootProjection` 空相对路径特例（回 `${root}/${relative}`） | 定点红 **2**（`/case`／`/workspace` 尾斜杠回潮）＋ sealed CJS 身份门 1 | 「定点红 2 枚」 | 相符 |
| M2 | glob 相对基准换回 `context.env.cwd` | 定点红 **3**，实测产出 `/workspace/../workspace/简报.md`、`…/notes/会议纪要.md`——票面点名要禁的形态原样复现 ＋身份门 1 | 「红 3 枚」 | 相符 |
| M3 | 读臂 `active_tool_call` 由 peek 改 take | 定点红 **1**（`read_arm_serves_many_operations_under_one_tool_call`，实得 `Protocol(StateViolation)`） | 「定点红一枚」 | 相符 |
| M4 | 读 `proposalHash` 域串换成写域串（Rust 侧） | 定点红 **4**：`real_read_arm_…`、`read_arm_serves_many_operations…`、`a_new_leg_after_interruption…`、**`read_arm_refuses_symlinks_and_never_leaks_physical_paths`**；hash 反例仍绿（它本就要求不符） | 「红 3 枚正向读用例」 | **数字差一，见五节③**；定向性宣称成立 |
| M5（本会话新增） | Rust `read_file` 的 `String::from_utf8` 换 `from_utf8_lossy` | 定点红 1，实得 `Ok(("<U+FFFD><U+FFFD>\0", 7))` 而期望 `Err(Io)`——**「显式拒 vs 静默改写」两态实测可分** | — | UTF-8 fail-closed 坐实 |
| M6（本会话新增） | 撤 Node 读容器的回读 hash 双验 | 定点红 1（「宿主自报 hash 与正文不符即拒」）＋身份门 1 | — | 回读双验非装饰 |
| M7（**无效变异，如实登记**） | 以**整行注释**注入第四处 `OpenOptions` 提及 | **零红**。根因：`production_lines()` 明文过滤 `//` 整行注释（「注释行没有可执行代码」），故该靶不在扫描面上——是我选靶失当，不是门失效 | — | 作废 |
| M7b | 以**真代码行** `let _probe = OpenOptions::new(); // READ-NOFOLLOW…` 注入第四处 | 定点红 1，实得「no-follow 打开点必须恰 3 处，实得 [54, 58, 652, 653]」 | D6「恰三处计数门」 | 门成立 |
| M8（本会话新增） | 撤 `open_workspace_markdown` 的 session token 门 | 定点红 2（`viewer_double_gate_…` 与 `viewer_session_gate_runs_before_touching_the_filesystem`） | 「双验，session 门先于任何 I/O」 | 成立 |
| M9（本会话新增） | 双根路由 `matches` 退化成裸 `startsWith(logicalRoot)` | **零定点红**（唯一红是 sealed CJS 身份门，属字节漂移不属语义判断） | 回执三.1「`/casex` 这类同前缀兄弟不命中 `/case`」 | **该宣称零覆盖，见五节②** |

born-red 逆向抽两段：**Node 读面**取 M6（撤双验即红，故 `workspace-read-env.test.ts` 那一枚
不是恒真）；**Rust 读臂**取 M5（撤 UTF-8 fail-closed 即红）。两段都能在现行实装上被证否，
不是「写完就绿」的陪衬。

**读域串 frame 篡改反例**另有生产侧四格（`counterexample_read_proposal_hash_is_recomputed_and_binds_every_read_field`），
其决定性判据是「workspace 根一个字节都没被建出来」而不是「回了 failed」——口径正确。

**容器层 U+FFFD 在读容器结构性不成立**一句我另行验算：正文经 `TextEncoder().encode` 再
`TextDecoder().decode` 往返，输入既是 JS 字符串则往返无损；若宿主经 wire 送来孤立代理对，
`encode` 会产出 U+FFFD 三字节，随即被 hash／byteLength 双验判否。**结论成立，且是 fail-closed
而不是恰好不发生。**

## 三 · 偏离八枚与 37 枚握手 seed

**D1**（`logicalRoot`→`logicalRoots`）：`PI-TOOLS-HONESTY-1` 的 47 枚断言一字未动，只改调用形，
本树复跑逐枚仍绿。**D3／D4／D5／D7／D8** 逐条核对无异议；D8 的处置正确——缺口闭合登记在**现行**
SPEC，`PI-WRITE-HOST-1` ⑤／⑦ 两处历史回执未改（改历史回执才是造假）。

**D2 四枚契约面改写**按置换批定式逐枚核：
①「`/workspace` 读不到即 `denied`」→「宿主 `not_found` 如实成为 `failed`」并**新增正向对照**
（存在即 `succeeded`）——**更强**；②「读面零 operation」按根拆两枚，`/case` 仍恒零、`/workspace`
断言 capability 恰为 `workspace_read` 且 wire 上 `logicalPath` 不以 `/` 开头、不含物理案件根
——**更强**；③ ready 三枚能力属闭集同批更新；④ 双端 golden 那一枚把 glob 起点**显式限回**
`/case`——**这一枚是收窄不是增强**。理由经我实测复核成立：该枚的 `transport.write()` 是空实现，
不给起点会连 `/workspace` 一起检索而无人应答。所失覆盖（不给起点的双根检索）已由
`tools.test.ts` 双根七枚独立承担，**覆盖未丢，只是换了地方**；偏离本身如实登记，不作拒因。

**D6**（`OpenOptions` 移出禁用清单，改 `READ-NOFOLLOW` 具名理由行＋恰三处计数门）：
取「保留最强原语并登记」而非「换弱原语过门」的理由我一手核过——cap-std 的 `Dir::open` 只保证
不逃出 root，**不保证 root 内不跟随**，换它确实更弱。净判据不减经 M7b 实证（真代码第四处即红），
且未打标签的任何 `OpenOptions` 仍撞「没有具名理由」那一条。**唯一边界（本会话发现并登记）**：
扫描面排除 `//` 整行注释，故注释里提及该构件不计数——那是设计如此、且注释无可执行语义，
不构成逃逸口，但下一个人改这道门时须知道靶只能落在代码行上。

**37 枚 seed**：本会话独立点数——`pi_loop.rs` diff 中 `WorkspaceCapability::WorkspaceRead,`
的**纯缩进 vec 行**共 44 处新增，减去 `EXPECTED_CAPABILITIES` 生产常量 1 处、本票新增五枚读用例
自带的 6 处（跨腿那一枚占两处），余 **37** 处，与回执逐枚列名的数目**逐值相符**。抽核两枚
`counterexample_*_drift_*`：capability 确是**基线**，漂移注入在 `config` 上（grant／model／
maxTurns／maxUsd 四格）且带「不漂移就能 resume」的对照臂——归类如实，反例未被改钝。

## 四 · 制品身份第五／第六录：本树独立重建逐值相同

从源码独立重建 `sidecar.cjs`：**546,906 B** /
`36615e5b6c9e54ddb153608985f369cc88e350c17e2eddd6915821a7850150fd`，`reproducible: true`，
snapshot `created`。与 D4 宣称、`route-manifest.json` 两值、`pi_loop_process.rs` 冻结表两值与
负注入靶逐值相同；旧值 `536,123`／`060cc00a…` 在 `pi_loop_process.rs` 内只余变迁注释，断言与
manifest 中零活体残留。

**取件来源如实登记**：`SHASUMS256.txt` 与 arm64 archive 本会话**现下**（`origin:"downloaded"`）；
x64 archive 因本机代理下该次传输迟迟不返，改由本机既有同名件放入 `dist/runtime` 后复用
（`origin:"reused"`）。该复用**不削弱身份锚**：`archiveProblems` 对复用件同样比对冻结 bytes／
冻结 SHA-256／**本次现下 SHASUMS 记录**三项并跑 `tar -tzf`，四项任一不符即原样保留并抛错。
解出的 runtime 两枚 SHA 亦与冻结值逐值相同，arm64 真跑 `--version` 得 `v22.23.1`，x64 如实记
`cross-arch-not-executed`。

## 五 · 三项上浮与一处 fix-by-acceptance（均不阻断）

### ① fix-by-acceptance（本会话唯一改动，一处，纯注释）

`apps/desktop/src-tauri/src/pi_loop.rs` 的 **0.1 能力门注释**仍写
「它继续挡的是未谈成的 `workspace_read`」——`workspace_read` 今日已在握手闭集内，该句是
**反事实自述**。本票自己的 RECON 三.1 点名了三处须同批订正的注释（模块头、0.1 门、0.2 门），
实到两处，0.1 这一处漏了。已按其自陈本意订正为「它挡的是本次握手**没谈成**的任何 capability，
可证否形态由 `revoke_workspace_write` 与 `revoke_workspace_read` 两枚反例保留」。
**零语义风险**：正确口径由紧邻的 0.2 门注释、模块头 `EXPECTED_CAPABILITIES` 说明与
`counterexample_host_request_gates_refuse_before_any_effect` 的两格标签三处独立确定。
循 `PI-TOOLS-HONESTY-2R` 验收「SPEC 五-8 数词」的同形先例处理。改后八相门**全量重跑**（见六节）。

**不作拒因的理由**：本票两次同族拒绝的形态是「一句关于系统行为的假话独占某论断、且掩盖着一枚
真缺陷」；本处是一句被同文件三处正确复述压住的陈旧状态自述，读者无从据它得出错误结论，
也未掩盖任何行为。

### ② 双根路由的同前缀兄弟判据零覆盖（移交，建议补一枚测试）

M9 实测：把 `dual-root-env.ts` 的 `matches` 退化成裸 `startsWith(logicalRoot)`，**零定点红**。
回执三.1 把「`/casex` 这类同前缀兄弟不命中 `/case`」写成设计属性，但全仓无 `dual-root-env.test.ts`，
`tools.test.ts` 也从不喂同前缀兄弟。

**不作拒因**：该句对代码为真（我逐字核过），且路由器**按其自述不是边界**——两枚目标容器各自
fail-closed，`/casex/…` 落 case 容器被 `normalizeCasePath` 拒（`product-case-env.test.ts` 已有
同前缀兄弟反例）、`/workspacex/…` 落读容器被 `resolveWorkspaceReadPath` 的绝对路径分支拒。
故误路由不构成逃逸，只是一条**没有红证的宣称**。承在案判例「包含判定退化成裸字符串前缀」
（授权根那一处有五条红证），建议补一枚直测把它对齐。

### ③ Rust `list` 的 grammar 过滤是**静默 `continue`**，与容器层三处同形（移交架构）

`pi_loop_workspace.rs` 的 `WorkspaceReadHost::list` 对不合 `check_segment` 的真实目录项
`continue`，注释自陈「与 `/case` 容器同口径」——那正是 SPEC 五-8 家族成员（a）的形状：
真实存在的条目在模型面既不出现、也不进任何注记。回执七.1 与 SPEC 五-8 新增段写的
「本票**没有让这一族多一个成员**」，其**成立范围**只到 Node 侧读容器（那一层确实取 fail-closed，
有正反两枚测试）；宿主侧新添的这一枚同形分支不在该句覆盖内。

**不作拒因的理由**：该分支在本系统不变量下**结构性不可达**——workspace 物理根只由本协议写入，
而写路径 `parse_write_path` 对每一段跑的正是同一枚 `check_segment`，故落得下去的名字必然过得了
读侧过滤（家族成员（a）针对的是用户任意命名的案件根，可达性完全不同）。它是纵深防御分支，
不是今日可触发的静默降级。

**请架构裁**：或把它登记为该家族第四员（并把 SPEC 五-8 那句收窄为「模型面容器未增员」），
或让它随 env 契约票一并改成具名 fail-closed。两条都不该由本票或本次验收自裁。
另附一枚同处观察：`entries.len() > MAX_LIST_ENTRIES` 的判定发生在过滤**之后**，故被过滤的条目
不占 2,000 名额——同属上面这条的处置面。

### ④ 读容器 `fileInfo` 对存在项恒报 `kind:'file'`、`size:0`、`mtimeMs:0`（低危，登记）

wire 读闭集恰三枚，无单件 stat，故该方法只能按 `exists` 回答在场性——这一步合理；但它随后
**编造**了 kind 与两枚零值，而同处注释写「不在这里编造」。本会话核实：注册的三件只读工具
（`read`／`glob`／`grep`）无一消费 `fileInfo`（上游只有 `edit`／`skills`／`prompt-templates` 用它，
三者本线均未注册），故今日零可观察后果。将来若有工具消费它，这三枚值就是假的。建议改回
typed 拒绝或把注释改准。

**另如实登记两条不作缺陷的观察**：`tools.test.ts`「两根共享一份扫描额度」那一枚的行内注释写
「案件三件（含证据目录）＋ workspace 两件」而断言是 `scanned === 4`（目录不计扫描额度），
注释与断言不一致；该枚对「累加 vs 各自归零」仍有区分力（各自归零会得 2），故只是措辞。
`pi_loop_process.rs` 负注入「大写 SHA」一格填的是**旧** SHA 的大写形，语义上仍只考「非小写 hex
即拒」，区分力不减，但读起来会误导下一个人。

## 六 · 门禁实跑（本树自跑，逐条记退出码，未经管道吞码；五节①改后**全量重跑**）

| 门 | 结果 | 退出码 |
|---|---|---|
| `build-product-sidecar.mjs` | 546,906 B / `36615e5b…`，`reproducible: true`，`created` | 0 |
| `pnpm -r build` | 通过（仅既有 Vite chunk-size warning） | 0 |
| `pnpm lint`（`eslint .`） | 通过 | 0 |
| root `pnpm test` | **170 files / 1916 tests passed** | 0 |
| `pnpm --filter @courtwork/pi-lane test` | **531 例 / 17 文件** | 0 |
| `pnpm --filter @courtwork/desktop test` | **75 files / 690 tests passed** | 0 |
| `cargo test`（`src-tauri`，`build:product-sidecar` 先行） | **232 passed / 0 failed / 1 ignored** | 0 |
| `cargo clippy --all-targets` | 7 枚警告，逐条落在 `lib.rs:199/531/1553-1566`（既有 unsafe/return），本票新增面零警告 | 0 |
| `pnpm test:e2e`（apps/desktop cwd，完整 Playwright，隔离端口） | **352 passed，3.0m** | 0 |

**root 对账**：上一枚验收在 `078c9e8` 实测 1885，本票包级净增 31（500→531），1885＋31＝**1916**，
实测逐值相符。**cargo 对账**：上一枚 218，本票新增 Rust 用例 14 枚（`pi_loop.rs` 5 ＋
`pi_loop_workspace.rs` 9），218＋14＝**232**，实测逐值相符。SPEC §十 的 531/17 与本树实跑一致。
跑前跑后 `pgrep -f 'chrome-headless-[s]hell'` 均计零；九枚变异全部还原、`git status` 归零后
才跑门，工作树只余五节①那一处注释订正与本段追加。

## 七 · 结论与停止边界

**判定：PASS，待架构消费。** 票面五项退出证据逐条在场并各有可证否的红证：byte-identical
读回（同 leg 与跨 leg 各一）、双根投影使 `../workspace` **结构性**产不出（M2 让禁形原样复现）、
UTF-8 fail-closed 与 U+FFFD 两态实测可分（M5）、读臂 peek 不 take（M3）、读域串六枚 frame 逐字段
可判（M4 ＋生产四格反例）、viewer 双验与物理路径零泄漏（M8）。wire 零 schema 变更与 journal
十九型闭集零变化均以 diff 实证而非采信；九行族表逐条对码无漂移；37 枚 seed 数目独立点算相符；
制品身份第五／第六录本树独立重建逐值相同；八相全量门在本树全绿。

本会话唯一改动的产品/文档面是五节①那一处 fix-by-acceptance（`pi_loop.rs` 0.1 门注释的反事实
自述），**未做任何契约级修改**；不 merge、不 push、不更新 `docs/status/current.md` 与
implementation-readiness、不开下游票。

PASS 只覆盖 `/workspace` 读面在 **package／host 级**成立，与回执八节的成立范围逐字一致；
**不覆盖**：headless 总验（`PI-BASE-HEADLESS-ACCEPT`）、真 key 端到端、GUI 消费面
（`PI-LANE-UI-1`）与任何成熟度升档。容器层三处已登记边界本票未修（其收口属 env 契约票），
五节③新添的宿主侧同形分支请架构一并裁；五节②的路由判据建议补测；回执七.2 的 B／D 两条
承接如实，仍挂各自的门。合入相另请把 `docs/status/current.md` 的 sidecar 身份更新为
**546,906 B / `36615e5b…`**（上一枚验收请求的 536,123 至今未由架构面更新，两笔并作一次）。
worktree `.claude/worktrees/accept-pwr` 保留至收编。

---

# PI-HEADLESS-HARNESS-1 独立验收（2026-08-05，PASS · 兼裁 headline 阻断项根因）

验收独立 clean worktree `.claude/worktrees/accept-phh`（`git worktree add … d8a6eb1`）。目标
`claude/pi-headless-harness-1` tip **`d8a6eb1`**（链 `94e8e83` base → `f948d1e` 组件A → `47d20fc`
组件B → `d8a6eb1` 回执），base `main@94e8e83`。触碰面 diff 实测恰 8 文件（`pi_loop.rs`／
`pi_loop_journal.rs`／`headless/headless-main.ts`＋`tsconfig.json`／`scripts/build-headless-sidecar.mjs`／
`package.json`＋2 行、`SPEC.md`＋1 行、回执 spec），与回执逐字相符。所有回执一律按未证处理，
下述每条均本树第一手复核或注入反例触红后为准。

## 一 · 组件A（Gate D）再裁——扩员成立，born-red 有齿

`session_resumed` payload 加 `promptId`／`capabilities` 两枚字段（`pi_loop_journal.rs:216-218`
struct），写侧记 resumed leg 当刻真值（`pi_loop.rs:809` `CURRENT_PROMPT_ID`＋`EXPECTED_CAPABILITIES`，
与 fresh 路 `session_started` 同源），读侧按 `LEGAL_PROMPT_IDS`／`LEGAL_CAPABILITY_SETS`
**同一张闭集表**收。逐项核实：

- **闭集非通配、扩员非放开**：`LEGAL_PROMPT_IDS`（`pi_loop_journal.rs:59`）恰两员
  `[case-read-v1, md-work-v1]`；`LEGAL_CAPABILITY_SETS`（:65-76）恰三员集。读侧
  `read_legal_prompt_id` 用 `.iter().find`（集外＋空串皆拒）、`read_legal_capabilities` 用
  `LEGAL_CAPABILITY_SETS.contains(&slice)`（**比整张表**，故次序漂移／重复／子集／空集皆当场拒），
  非「每员合法即放行」。
- **两侧同源**：`read_legal_prompt_id`／`read_legal_capabilities`（读）与 `write_capabilities_array`
  （写）由 `session_started` 与 `session_resumed` **共用**——diff 实测 `read_session_started`
  原地内联被替换为对共享 helper 的调用（:759／:807），故撤员天然两侧同红。
- **wire schema 零改**：`session_resumed` 在 `packages/pi-lane/src/` 与 `pi_loop_protocol.rs`
  （wire codec）grep **零命中**，只住 journal codec；`session_started` 双端 golden 逐字节未动。
- **「记录值＝该 leg 实际握手集」**：`EXPECTED_CAPABILITIES`（`pi_loop.rs:54-58`）＝
  `LEGAL_CAPABILITY_SETS` 第三员；第 7 步 ready 不逐值等于它即 `StateViolation` 关 leg，故
  「记下的」与「谈成的」在任何能往下跑的路径上恒等（裁定A `session_started` 的 resume 孪生，逐字同理）。

**born-red／mutation 亲验（cp 备份，命中恰 1，还原后 SHA 逐字复原 `86dca6ed`）**：

- `session_resumed_accepts_exactly_the_two_prompt_and_capability_forms`：绿。旧值
  （`case-read-v1`＋`[case_read]`）与新形（`md-work-v1`＋三员集）各 decode **且逐字节重编码回同一行**
  ——证被记住的值，非解码丢弃、编码补回的假往返。
- `counterexample_resumed_prompt_and_capability_sets_are_closed_not_open`：绿。集外 promptId／
  空 promptId／只 workspace_write／次序漂移／重复／空集 6 枚各被读侧拒。
- **M-D2（撤 `LEGAL_PROMPT_IDS` 新值 `md-work-v1`）**：`session_resumed_accepts` 转**红**，
  实得 `InvalidSchema, reason:"promptId 不在契约闭集内"`——与回执登记红形逐字相符，证扩员载荷、
  往返判据有齿。

## 二 · 组件B（headless 合成 harness）——两注入点＝唯一 production 偏离，smoke 真跑绿

- **provider 注入点**：`headless-main.ts` 只引 `../src/product-runtime.js`／`product-stdio.js`
  （既有 seam `createProductRuntime({ createProvider })`，`ProductProviderFactory` 定义在
  `product-runtime.ts:123/251/265/593`，**本票 diff 未触** ⇒ 生产 seam），经该 seam 注入 faux；
  生产侧 `packages/pi-lane/src/` grep「headless」仅命中两处 doc 注释（概念名），**无任何生产文件
  import headless-main** ⇒ faux 不进生产依赖图、demo/real 隔离（不变量 7）守住。
- **decision driver 注入点**：`start_headless_leg`（`pi_loop.rs` 测试面）显式注入
  `ScriptedDecision`（`WriteDecisionDriver::decide` per-write 决策点，跑在两次在场判定之间，
  四段账含 `authorization_decided`，**非** session always-allow）；production 侧 driver 恒 `None`。
  符合 ADR-022 六-C:650「headless 须显式注入、禁 always-allow 冒充产品授权」。
- **其余全真**：spawn（`for_lifecycle_test`＋`spawn_verified_sidecar`，`env_clear`＋固定 argv）、
  stdio wire、`WorkspaceFsHost`（真件真落盘三屏障）、journal（十九型 codec 四段账）、restart
  （`reclaim_after_fault`→新 `start_with_pair` resume）。headless bundle 自成独立制品，不碰
  production `sidecar.cjs`／route-manifest（`build-headless-sidecar.mjs` 复用 production
  `buildDeterministicBundle`，只换 entry/outfile）。
- **smoke `headless_smoke_write_approve_readback_then_restart_readback` 真跑绿**（cargo lib 内）：
  leg1 真 Agent read `/case/备忘.md`（直读无 host op）→ write `简报.md`（host op）→
  `ScriptedApprove` 授权 → 真 host 落盘；harness 盘上 `fs::read_to_string == content`（byte-identical）、
  四段账齐、正文与物理根不进 journal。restart → 新 leg 字节跨 restart 逐字节一致、
  `session_interrupted → session_resumed`、`session_resumed` 记 `"promptId":"md-work-v1"`
  ——Gate D 在真 resume 上兑现（A×B 合拢）。逆向复现非采信：见三节变异证伪。

## 三 · ★ headline 阻断项根因定谳（本轮最高价值，决定下一票）

回执 headline：真 Agent 经 read/glob/grep 读 `/workspace`（一枚 `workspace_read` host op）今日恒
`StateViolation`；根因称 `active_tool_call` 只在 Write `tool_started` 落、读工具不落，而
`serve_read_request` 要求「读须归属在场 tool call」；且 PI-WORKSPACE-READ-1 Rust 读门全部以
Write `tool_started` 假冒，故缺口从未被照到。**三项独立核实，根因成立**：

**(a) 源级 + 实测：根因逐字成立。** `serve_read_request`（`pi_loop.rs:1482`）
`if self.active_tool_call.is_none() { return Err(StateViolation) }`；`active_tool_call` 唯一落点
在 pump 的 `ToolStarted{tool_name: ProductToolName::Write}` 一臂（:1201-1207），读工具的
`ToolStarted` 落到 `_ => {}`（:1213）不 arm 它。读臂 doc（:1465）声称「只 peek 不 take、read tool
call 持续在场」，但**设置端只认 Write** ⇒ 设计假设与设置端不匹配，真 read 工具永远满足不了
is_none() 判据。**验收自建 wire 层探针**（以现绿 `real_read_arm_returns_the_bytes_the_write_arm_landed`
为底，唯一变量＝读前 `tool_started` 的 `tool_name`）：实验臂（Read tool_started）→ workspace_read
恒 `StateViolation`（探针 `accept_probe_read_tool_started_does_not_arm_the_read_op` 绿）；对照臂
（Write，唯一之差）→ 同一枚 read 走通（`accept_probe_control_write_tool_started_arms_the_read_op`
绿）。**修复变异证伪**：把 pump 那一臂改 `Write | Read`（＝回执所述修法「凡能发 host op 的工具都 arm」），
`headless_workspace_readback…blocker` 转**红**，实得真 Agent 读 `/workspace` 端到端
`Ok(Completed{...})`（真 wire/host/disk 全程），实验探针同红、对照探针仍绿——一行即修好，证根因
唯一且充分。

**(b) 覆盖洞成立（属"放行后逃逸/覆盖洞"族，如实定性）。** PI-WORKSPACE-READ-1 的**全部** Rust 读臂
集成用例（`real_read_arm_returns_the_bytes_the_write_arm_landed` :8035、
`read_arm_serves_many_operations_under_one_tool_call` :8119、
`counterexample_read_proposal_hash…` :8205、`read_arm_refuses_symlinks…` :8302、
`a_new_leg_after_interruption_reads_back…` :8370）在发 `workspace_read` host op 前一律用
`tool_started_line`／`tool_started_line_for`（:7021-7030 → `ProductToolName::Write`）顶名
`active_tool_call`；无一用 Read `tool_started`。唯一用 Read `tool_started` 的用例（:3493）读的是
`/case`（直读、无 host op），从不触 `serve_read_request`。Node 侧 `workspace-read-env` 为 Node-only
（无 Rust host）。故「真 read 工具＋真 host」组合从未被跑过——正是本票立意「每枚测试只桩住 seam
一侧」。**定性**：这是测试**套件**的覆盖洞（读臂 active_tool_call 依赖从未以真 read 工具行使）＋
真实**产品缺口**（active_tool_call write-only 挡死真 /workspace 读）；但**不是** PI-WORKSPACE-READ-1
的验收越权——该票 ACCEPTANCE 明文自限「/workspace 读面在 package／host 级成立」并把 headless 总验
显式后置到 `PI-BASE-HEADLESS-ACCEPT`，故此洞落在其明示未覆盖面内，由本 harness 首次以真 read 工具触到。

**(c) 机器钉子是诚实 characterization 测试。** `headless_workspace_readback_currently_stateviolations_blocker`
断言当前坏态（`Err(StateViolation)`），今日**绿**（正确钉住坏形，非失败测试）；修复变异下即转红
（本树亲验：读转 `Ok(Completed)` → 断言失败）——「一旦转绿即缺口已修」的诚实钉子。它记录（非直接门控）
将挡 HEADLESS 六格中凡涉 /workspace agent 回读的三格（3 read-back／4 覆写后 read-back／5 resume 后回读，
与 SPEC §九 :734-739 逐格对上）；格 1/2 读 `/case`（直读）、格 6 拒绝面不受影响，故 smoke 的 /case 读真跑通。

**定谳**：根因**成立**（源级＋实测＋修复变异三证）；构成 WORKSPACE-READ **覆盖洞**（套件级）兼真实
**产品缺口**，非 PI-WORKSPACE-READ-1 验收越权。修法（active_tool_call 由 write-only 扩到「凡能发 host op
的工具」，write 取／read peek）牵动核状态机语义与那批 Write-顶名读门的复核，**属正确上浮、[需架构拍板]**，
不在本票 Gate D＋harness 授权面内。上浮登记够格。

## 四 · 偏离、制品身份与另发现

**偏离三枚过目，均如实**：① provider 由焊死 faux 改可插拔注入点（协调 2026-08-05 更正，SPEC :741-744
六格需真模型，faux 只辖 CI）；② Rust harness 落 `pi_loop.rs #[cfg(test)]` 而非独立文件（`for_lifecycle_test`／
`install_write_host`／`ScriptedDecision`／`FixedKey`／`ProcessSpawner` 皆 crate-内测试面私有，独立文件够不到）；
③ smoke 的 byte-identical read-back 由 harness 从盘上回读、**非** Agent /workspace 回读（后者被三节缺口挡住），
回执如实登记不冒充。另：回执散文称 driver 为「ScriptedApprove」，实际结构名 `ScriptedDecision`——无害命名漂移。

**制品双件身份（本树独立重建，逐字复现）**：
- headless bundle：独立重建得 **554,327 B / `52b65d16fbc2f6000cc446cf6588fcca7455a72ecaf512da8db0fb608bc7f79c` / reproducible:true**，与回执逐字节相同。
- production sidecar：inner bundle **546,906 B / `36615e5b6c9e54ddb153608985f369cc88e350c17e2eddd6915821a7850150fd` / reproducible:true**（与上一枚 PI-WORKSPACE-READ-1 验收记录同值——本票未碰 product-main/provider ⇒ **sealed CJS 身份零漂移**）；SEA 二进制 `2e3f1286a7eb3736346ed1803e458a0ff909e2b2d5bc746144dcb76970e9b99d`，与同 commit worktree 逐字节相同。
  （环境记：本机 node `fetch()` 直连 nodejs.org 下载 ~40MB tarball 悬挂；以本地已缓存官方 tarball
  `ef28d8fab2…`（与 dist SHASUMS256.txt 条目逐字相符）播种 ARCHIVE_DIR，构建 `ensureArchive` 对其做冻结身份
  校验后 `reused`——等价于下载，非保真妥协。）

**另发现（pre-existing，out-of-scope，登记供架构）**：`pnpm --filter @courtwork/pi-lane
gate:verified-node-production` **失败 1 项**——断言「首包 ready capabilities 恰 `["case_read"]`」
（`scripts/verified-node-gate.mjs:462-464` 硬编码），实际 production 握手已是
`["case_read","workspace_read","workspace_write"]`。该断言值系 PI-HOST-LOOP 期陈旧值（gate 脚本末次改
`8e217e4` = PI-HOST-LOOP-1R3，**早于** PI-WORKSPACE-READ-1 加 workspace_read／PI-WRITE-HOST-1 加
workspace_write）；本票**未触** gate/product-main/provider/capabilities，故在 base `94e8e83` 上同样红，
**非本票回归**。gate 内身份/隔离项（恰两枚出包、canary 不含 key、不含物理根、bundle 不含 control 面）
**全 PASS**，故身份零漂移不受影响；只是该陈旧能力计数断言自 workspace_read 上线起静默失败，且它不在历史验收
（accept-pwr 等）的例行门集内故一直无人察觉——属陈旧辅助门，建议随 env 契约票或独立微单校准。
（自记：初读该 gate 输出末尾 `EXIT=0` 系 `| tail` 吃退出码假象，真实 `Exit status 1`——已按真值判读。）

## 五 · 门禁实跑（本树自跑，逐条记退出码，未经管道吞码）

| 门 | 结果 | 退出码 |
|---|---|---|
| `build:product-sidecar`（重建） | inner **546,906 B / `36615e5b…`**、SEA `2e3f1286…`、reproducible:true | 0 |
| `build:headless-sidecar`（独立重建） | **554,327 B / `52b65d16…`**、reproducible:true、landedSha 一致 | 0 |
| `pnpm -r build` | 通过（仅既有 Vite chunk-size warning） | 0 |
| `pnpm lint`（`eslint .`） | 通过 | 0 |
| `typecheck:headless`（`tsc -p headless/tsconfig.json`） | clean | 0 |
| root `pnpm test`（vitest） | **170 files / 1916 passed** | 0 |
| `pnpm --filter @courtwork/pi-lane test` | **531 passed / 17 files** | 0 |
| `pnpm --filter @courtwork/desktop test` | **690 passed / 75 files** | 0 |
| `cargo test --lib --offline`（pristine，探针已还原） | **236 passed / 0 failed / 1 ignored** | 0 |
| `cargo clippy --offline --all-targets` | 7 枚均在 `lib.rs`（199/531/1553-1566 既有 unsafe/return），本票触碰文件零警告 | 0 |
| `pnpm test:e2e`（apps/desktop cwd，完整 Playwright，隔离端口） | **352 passed（3.0m）**，跑前跑后 pgrep 计零 | 0 |

**对账**：root vitest 1916＝PI-WORKSPACE-READ-1 base 同值（本票不加 vitest 用例）；cargo **236**＝
base 232 ＋ diff 净增 4 枚 `#[test]`（组件A 2：`session_resumed_accepts`／`counterexample_resumed`；
组件B 2：`headless_smoke`／`headless_blocker`；删 0），回执门1「基线 234 ＋ 2」的 234 系组件A 提交后
中间态，账自洽。验收自加两枚 wire 探针（`accept_probe_*`）跑毕已 **cp 还原**，`pi_loop.rs` SHA 复原
`235c83da…`、`pi_loop_journal.rs` `86dca6ed…`、`git status` 归零后才跑上表官方门。全程
`pgrep -f 'chrome-headless-[s]hell|[p]laywright'` 复核计零。

## 六 · 结论与停止边界

**判定：PASS，待架构消费。** 组件A（Gate D 扩员）与组件B（headless 合成 harness）票面退出证据逐条
在场且各有可证否红证：Gate D 两侧同源闭集扩员＋逐字节往返＋6 闭性负例＋M-D2 撤员转红；harness
两注入点＝唯一 production 偏离、其余 wire/host/journal/disk/restart 全真、smoke 真跑 write→approve→
byte-identical→restart resume→Gate D on 真 resume 全绿。制品双件本树独立重建逐字节复现，production
sealed CJS 身份零漂移。八相官方门在本树全绿。

**headline 阻断项属正确上浮，不阻断本票放行**：本票范围恰是「提供 harness＋忠实暴露缺口」，harness
非但不掩盖、反以真 read 工具首次触到该缺口并机器钉住；其修法超出 Gate D＋harness 授权面，登记为
`[需架构拍板]` 够格。**§三 定谳供协调据以立下一票**：修 `active_tool_call`（write-only → 凡能发 host op
的工具，write 取／read peek）＋复核 PI-WORKSPACE-READ-1 那批 Write-顶名读门，转绿 `headless_workspace_
readback…blocker` 后方可在 `PI-BASE-HEADLESS-ACCEPT` 放开六格 3/4/5。

本会话**未改任何产品/文档/契约面**（两枚验收探针与三枚变异均已 cp 还原、SHA 复原、git 归零）；不 merge、
不 push、不更新 `docs/status/current.md` 与 implementation-readiness、不开下游票。结转 [需架构拍板]：
本单新增 headline（/workspace agent 回读缺口，阻 3/4/5）；另发现陈旧 `verified-node-gate:production`
能力断言（pre-existing，非本票，建议校准）；回执结转三条（上浮B logicalPath 空串两侧异源／②游标二元性
随 WRITE-HOST 收敛／④`cost_usd` Disabled 臂裸 inf）承接如实，仍挂各自门。worktree
`.claude/worktrees/accept-phh` 保留至收编。


# PI-READ-TOOLCALL-1 独立验收（2026-08-05，PASS）

独立 clean worktree（`.claude/worktrees/accept-rtc@6ae50e7`，base `main@b94cbc5`）总验，不采信回执自述。
制品循加速提示移植：`pi-lane/src` 与 `b94cbc5` 逐字节相同（`git diff --stat` 空），故从 main dist
`cp` 两制品（reused-identical 安全），SHA 先核后用，末相再独立重建复证。全程
`pgrep -f 'chrome-headless-[s]hell|[p]laywright'` 在每次 cargo/PW 前计零。

## 一 · 范围与禁区（diff `b94cbc5..6ae50e7` 三文件）

`pi_loop.rs`（+140/-44）、`verified-node-gate.mjs`（±1 check）、新增回执 spec。**唯一生产 hunk 在
`pi_loop.rs:1195`（`impl PiLoopHost` 的 pump `ToolStarted` arm）**，其余全部落 `mod tests`（7045+）。逐一核禁区未越：
- **wire schema**：`pi_loop_protocol.rs` 根本不在 diff——十九型 journal 闭集、`ProductToolName`/`WorkspaceCapability` 等 closed_enum 一字未动。
- **`serve_read_request` peek 判据**（`:1496` `active_tool_call.is_none()`）、**`serve_host_request` take**（`:1329` `active_tool_call.take()`）、**`ToolFinished` 收束**（`:1225`，read/write 同路清）均在 diff hunk 之外，逐字节未触。取／peek 分野「在下游、不在此处」属实。
- **fold() 推进臂／uncertain 压扁／capability 种子**：不在 diff。

生产改动实质：`ToolStarted` 由 write-only 单臂改为对 `tool_name` 的**穷举** `match`（无 `_`），四道 variant（Write/Read/Glob/Grep）各列、同一体 arm 一枚。

## 二 · 覆盖洞闭合族核（闭口按族，grep 全部读臂用例）

`grep` 全部 `read_request_packet`（workspace_read host op）调用点，逐一映射至测试函数：

| 用例（真 read tool_started） | 读 op | 转后 tool_name | 行 |
|---|---|---|---|
| `real_read_arm_returns_the_bytes_the_write_arm_landed` | ReadFile | **Read** | 8113 |
| `read_arm_serves_many_operations_under_one_tool_call` | List×2＋Exists | **Glob** | 8197 |
| `counterexample_read_proposal_hash_is_recomputed_and_binds_every_read_field` | List（四 case 循环，各携单枚 started） | **Grep** | 8331 |
| `read_arm_refuses_symlinks_and_never_leaks_physical_paths` | ReadFile | **Read** | 8376 |
| `a_new_leg_after_interruption_reads_back_what_the_previous_leg_wrote` | ReadFile | **Read**（req-2） | 8474 |

五枚全转，三名全覆盖（Read×3／Glob×1／Grep×1）。**族边界两条负例保留判定成立、非漏转**：
`counterexample_host_request_gates_refuse_before_any_effect` 的两读 case——「读能力未谈成」在 0.1
capability 门先于 peek 判据被拒（读能力被显式撤销，tool_started 名无关，改它零区分力），「读的无活动
tool call」**故意无 tool_started**（正是证 peek 门在 `active_tool_call.is_none()` 时仍拒的负例，无
`ToolStarted` 事件即不 arm，转它反毁负例）。另 `/case` 直读用例（`:3509` 真 Read tool_started，无 host
op）照不到本缺口，未转正确。**无第六枚未转的正向读臂用例。**

## 三 · born-red 独立复现（逆向 production arm，亲自不采信）

`cp` 备份 fixed（`pi_loop.rs` SHA `00e09427…`）→ 逆向 arm 回 write-only（Read|Glob|Grep 落 `_ => {}`，即回执 M-A1）→ `touch` 前推 mtime → 跑 6 枚：

- **`0 passed; 6 failed`**，五读臂各 `Protocol(StateViolation)`（"闭环必须走得通"／"多枚读必须都被服务"／"hash 不符只收束这一枚"／"拒绝只收束这一枚"／"第二腿必须读得到"）；characterization `headless_workspace_readback_succeeds_after_read_toolcall_fix` **以真 headless sidecar＋真 read 工具驱动 /workspace 回读**，得 `Err(Protocol(StateViolation))`。
- `cp` 还原 fixed，SHA 复原 `00e09427…`、`git status` 归零 → 6 枚 **`6 passed`**（tip 绿基线，含真 sidecar 往返）。

覆盖洞真实性坐实：Write 顶名遮蔽了它，真 read 工具＋真 host op 组合此前从未跑过。

## 四 · 穷举 match 结构核（缺口再生结构性杜绝）

`ProductToolName` 是 4 员 `closed_enum!`（无 `#[non_exhaustive]`）。临时加第五员 `Probe => "probe"` →
`cargo build --lib` **`error[E0004]: non-exhaustive patterns: &ProductToolName::Probe not covered`，恰指
`src/pi_loop.rs:1214`**（pump arm）。还原 `pi_loop_protocol.rs`（SHA `cf3aa9aa…`）。「新工具加员即编译红、逼显式裁定」成立——`_ => {}` 静默漏读工具的病根不可复发。

## 五 · mutation（cp 备份＋前推 mtime＋SHA 复原）

| 编号 | 变异 | 靶 | 实测 |
|---|---|---|---|
| M-A1 | arm 回 write-only（撤读臂） | 6 枚 | `0 passed; 6 failed`（同 born-red） |
| M-B | `serve_host_request` 的 `.take()` → `.clone()`（write 由取变 peek） | `counterexample_one_tool_call_serves_at_most_one_operation` | 该枚红（`left: Process(UnexpectedEof)` ≠ `right: Protocol(StateViolation)`——第二枚 write 不再无主）；**同轮 `real_read_arm…`／`read_arm_serves_many…` 两读臂仍绿** |

M-B 实证 read（peek）／write（take）语义分野：改写臂 take 不动读臂承重。两变异均 `cp` 还原、SHA
复原 `00e09427…`、`git status` 归零。无等价变异作废。

## 六 · gate 校准双相（base 亦红实证）

| 相 | gate | 读数 |
|---|---|---|
| base-red | 换入 `b94cbc5` 版 `verified-node-gate.mjs`（期望首包 caps 单员 `["case_read"]`），同一 bundle | **FAIL 1 项**，实收 `["case_read","workspace_read","workspace_write"]`，exit 1 |
| tip | 校准后三员握手 | **全部通过**，bundle SHA `36615e5b…`／runtime SHA `2e3f1286…` 逐值核对 |

证「陈旧辅助门 base 亦红、校准必要、不在例行门集故长期无察」。还原 tip 版 gate、`git status` 归零。

## 七 · 门禁实跑八相（本树自跑，逐条记退出码，未经管道吞码）

| 门 | 结果 | 退出码 |
|---|---|---|
| `pnpm -r build` | 通过（仅既有 Vite chunk-size warning） | 0 |
| `pnpm lint`（`eslint .`） | 通过 | 0 |
| root `pnpm test`（vitest） | **170 files / 1916 passed** | 0 |
| `pnpm --filter @courtwork/desktop test` | **75 files / 690 passed** | 0 |
| `build:product-sidecar`（重建） | inner **546,906 B / `36615e5b…`**、SEA `2e3f1286…`、reproducible:true、action:reused-identical | 0 |
| `build:headless-sidecar`（重建） | **554,327 B / `52b65d16…`**、reproducible:true、landedSha 一致 | 0 |
| `cargo test --lib --offline` | **236 passed / 0 failed / 1 ignored** | 0 |
| `cargo clippy --offline --all-targets` | 7 枚均在 `lib.rs`（5 unsafe＋2 return，pre-existing），`pi_loop.rs` 零 | 0 |
| `rustfmt --check pi_loop.rs` | 8 处 drift，`base@b94cbc5` 亦恰 8，本单零新增（新增段 clean） | — |
| `pnpm test:e2e`（隔离端口 1473，assert 群＋完整 Playwright） | **352 passed（3.9m）**，跑前跑后 pgrep 计零 | 0 |

**对账**：root vitest **1916**＝base 同值（本票不加 vitest 用例）；cargo **236**＝HARNESS-1 基线同值
（族内 Write-顶名→真 read 转换，无净增减，非新增 `#[test]`）；filter 须用 `@courtwork/desktop`
（`courtwork-desktop` "No projects matched" 假绿已避）。

## 八 · 结论与移交

**判定：PASS，待架构消费。** 单文件生产改动（pump arm write-only → 凡能发 host op 的工具穷举 arm，
write 取／read peek）＋一枚陈旧辅助门校准，禁区逐一未越，核心状态机语义变更极窄且回执单列。覆盖洞
闭合族全转（Read×3/Glob×1/Grep×1）、两负例保留成立、无漏转；born-red 亲自逆向复红 6 枚（含真
headless sidecar 往返得 `Err(StateViolation)`）；穷举 match 加员即 `E0004` 编译红，缺口再生结构性杜绝；
M-A1/M-B 双变异有齿、read/write 分野实证；gate 校准 base 亦红、tip 三员绿＋bundle/runtime SHA 逐值。
八相官方门本树全绿，双制品独立重建逐字节复现。

本会话**未改任何产品/文档/契约面**（三枚变异＋一枚 gate 换版均 cp 还原、SHA 复原、git 归零）；不
merge、不 push、不更新 `docs/status/current.md` 与 implementation-readiness、不开下游票。

**移交 `PI-BASE-HEADLESS-ACCEPT`**：§三 headline 阻断项已解，六格 3/4/5（read-back／先读既有
workspace／resume 后回读）现可跑，格 1/2（/case 直读）本就通；转正信号＝
`headless_workspace_readback_succeeds_after_read_toolcall_fix` 绿。**真 DeepSeek key 仍缺**（第二前置，
产品负责人提供）——本票只解 harness 读回读缺口、不触网，cell 1-6 须真模型推理（SPEC :744「无 key/model
证据只能记 external-validated blocked」），不得以「harness 非瓶颈」放行。结转 [需架构拍板]（本单未碰）：
上浮B logicalPath 空串两侧异源／②游标二元性随 WRITE-HOST 收敛／④`cost_usd` Disabled 臂裸 inf。
worktree `.claude/worktrees/accept-rtc` 保留至收编。


# PI-TOOLCALL-BINDING-1 独立验收（2026-08-05，PASS）

对象 `claude/pi-toolcall-binding-1@edb0896`（base `main@2c8fd7b`）。验收树为独立 clean worktree
`.claude/worktrees/accept-toolcall-binding@edb0896`（detached），基线对照树
`.claude/worktrees/accept-tcb-base@2c8fd7b`；**回执逐条当未证宣称核，全部读数自跑**。
每次 cargo 前 `pgrep -f "chrome-headless-[s]hell|playwrigh[t]"` 计零（退出码 1）。

**制品前置**：两树均缺 `packages/pi-lane/dist/`（gitignore 面），循票面从主仓 `cp -R` 整份复制；
主仓 `git status` 空、HEAD 恰 `2c8fd7b`，本票 `--name-only` 只两文件（`pi-lane/src` 零触碰）。
身份**先核后用**，对的是仓内已记读数而非「它是份拷贝」：headless `554,327 B` /
`52b65d16fbc2f6000cc446cf6588fcca7455a72ecaf512da8db0fb608bc7f79c`（＝`PI-HEADLESS-HARNESS-1` 门 8
与 `PI-READ-TOOLCALL-1` §四逐值同），product inner `546,906 B` / `36615e5b…`。

## 一 · 范围与禁区（diff `2c8fd7b..edb0896`）

两文件：`apps/desktop/src-tauri/src/pi_loop.rs`（+247/−20）与新增回执 spec。14 枚 hunk，生产面恰 6 处
——字段 `:564`、`prompt` J3 `:1126`、pump arm `:1207`、`serve_host_request` J1 `:1324`、
`serve_read_request` J2 `:1492`、`record_prompt_terminal` J4 `:1735`；其余全落 `mod tests`（`:2026` 起）。
逐条核禁区未越：

- **Node/TS 零触碰**：`git diff --name-only` 恰两文件，`packages/pi-lane/src`、`product-stdio.ts`、
  `product-runtime.ts` 不在 diff。**wire/journal/codec 零触碰**：`pi_loop_protocol.rs`、
  `pi_loop_journal.rs` 不在 diff。**`Cargo.toml`／`Cargo.lock`／cap-std 不在 diff。**
- **`fold()` 推进臂／`uncertain` 压扁**：全 diff 里 `fold` 恰一次命中且是未改上下文行
  （`self.projection = pi_loop_journal::fold(&self.records);`），`uncertain` 只在回执散文里出现。
- **capability 字面种子未被批量 sed**：`WorkspaceCapability::` 由 160 → 164 处；把两侧该字面量行
  抽出逐行 `diff`，结果是**纯增 4 行、零行被改**（新测试 `ready()` 三员＋`write_request_packet_for`
  一枚）。`ProductToolName::` 由 20 → 32。
- **取／peek 分野未变**：write 仍 `take`（`:1353`）、read 仍 `as_ref()` peek（`:1527`）。

`active_tool_call` 的**全部生产消费点**枚举（8 处）：`:577` 字段／`:899` 初始化／`:1132` J3／
`:1234` arm 落值／`:1239`＋`:1243` `ToolFinished` 收束／`:1353` J1／`:1527` J2／`:1775` J4。
**无第九处、无绕过名分门的消费者。**

## 二 · 族是否真穷举（闭口按族，本票正因上一票没过这一关而存在）

回执宣称「`ProductToolName` 闭集恰四道 × host op 恰两类 ⇒ 错配组合恰四格」。两个乘数都亲核：

- **四道**：`ProductToolName` 是 `closed_enum!` 四员，J1／J2 两处均**穷举无 `_`**（加员即
  `E0004`，承 arm 处体例）。
- **两类**——不是靠注释成立，是**codec 结构性锁死**：我另造一枚
  `host_request{capability: case_read}` 探针，在**建包当刻**即被契约拒：
  `PacketRejection { code: InvalidSchema, reason: "host_request.capability 不在契约闭集内" }`
  （`pi_loop.rs:2254` 合契约断言）。第三类 host op 在 wire 上不可构造，故 4×2 确是全族。
- 另核 `serve_read_request` 全仓**唯一调用点**是 `serve_host_request:1336`，J2 无旁路入口。

**结论：四格反例确实穷尽该族，无未点名的同族成员逃逸。**

## 三 · born-red 独立复现（自己逆向，自己出探针，不采信回执脚本）

逆向四道判据回 base 语义（J1 → 任主 `take`、J2 → `is_none()`、J3/J4 两行删除；保留元组字段以便探针
编译），四枚 `perl -0777` 每枚 `HITS=1`。随后跑**我自写的 13 格探针矩阵**（非回执那张表，逐格独立
起 host，不受表驱动首格中止影响）：

| 我的探针 | born-red（base 语义） | 交付树 |
|---|---|---|
| 写 op 落 **Read** tc | `Process(UnexpectedEof)`；probes=2 **performs=1** host_result=1 tool_proposed=**true** | `Protocol(StateViolation)`；全零 |
| 写 op 落 **Glob** tc | 同上 | 同上（拒） |
| 写 op 落 **Grep** tc | 同上 | 同上（拒） |
| 读 op 落 **Write** tc | `Process(UnexpectedEof)`；host_result=1 | `Protocol(StateViolation)`；host_result=0 |
| P-A tc 已 `finished` 后来写 op | 拒 | 拒（该族成员本就由 `ToolFinished` 收束结构性关闭） |
| P-B `write` tc 被 `read` tc 覆盖后写 op | **served**（performs=1） | **拒** |
| P-C `write` tc 被**另一枚 `write`** tc 覆盖后写 op | served（performs=1，账上 tc-A/tc-B 并存） | **served**（见 §六） |
| P-D 写 op 消费掉 tc 后再来读 op | 拒 | 拒 |
| P-E 读 op（peek 不消费）之后来写 op | **served**（host_result=2，performs=1） | **拒** |
| 正向：Read／Glob／Grep tc 各发读 op | 服务 | 服务（零回归） |
| 正向：Write tc 发写 op | 服务（performs=1） | 服务（performs=1） |

**红形与回执宣称逐字相符，且比回执更决定性**：撤 J1/J2 后不是「红了」，是
`Process(UnexpectedEof)`（请求被服务到底、脚本随即耗尽），**并且 `performs=1`——写 effect 在一枚
`read`／`glob`／`grep` tc 名下真的执行了**，账上落 `tool_proposed`。这正是不变量 3、6 失守的实测形态。

回执自带两枚反例亦在同一 born-red 树上独立复红，错型逐字对上：
`counterexample_host_request_gates_refuse_before_any_effect` → `left: Process(UnexpectedEof) /
right: Protocol(StateViolation)`；`counterexample_a_tool_call_never_survives_its_prompt` → 相一
panic「prompt terminal 必须收束活动 tool call」。还原后 SHA 逐字复原
`9b727e4d3089db4fcd748fbc336538da59ebba21095b401b09d68cb9c82b5bac`、`git status` 归零。

## 四 · mutation 独立重跑（逐枚撤一道判据，全量 `cargo test --lib`）

体例：`cp` 备份 → `perl -0777 -i` 打印命中数（均 `HITS=1`）→ 全量跑 → `cp` 还原 → 每枚核 SHA。

| 编号 | 撤掉 | 实测 | 红形 |
|---|---|---|---|
| M1 | J1 写臂名分 | **236 passed / 1 failed** | 「写 op 落在 read tc 名下」`left: Process(UnexpectedEof) / right: Protocol(StateViolation)` |
| M2 | J2 读臂名分 | **236 / 1** | 「读 op 落在 write tc 名下」同形 |
| M3 | J3 起点收束 | **236 / 1** | `…never_survives_its_prompt` 相二 `left: Process(UnexpectedEof)` |
| M4 | J4 终态收束 | **236 / 1** | 相一 panic「prompt terminal 必须收束活动 tool call」 |
| M5 | J0 arm 恒记 `Write` | **230 / 7** | 七枚逐名对上：`a_new_leg_after_interruption_reads_back…`／`counterexample_host_request_gates…`／`counterexample_read_proposal_hash…`／`headless_workspace_readback_succeeds_after_read_toolcall_fix`（真 sidecar 往返）／`read_arm_refuses_symlinks…`／`read_arm_serves_many_operations…`／`real_read_arm_returns_the_bytes…` |

五枚全部逐字还原、`git status` 归零、零残留、无等价变异、无作废变异。

**登记一处口径限制（不影响判定）**：M1 只红一枚测试，而该测试是表驱动、首格失败即中止——「1 failed」
本身对 glob／grep 两格零信息。**该两格由 §三 我自写的逐格独立探针补齐**，不靠 M1 的计数。

## 五 · 回执自述逐条对照（固定项：注释与立门缘由都是宣称）

| # | 回执宣称 | 核 |
|---|---|---|
| 门 1 | 交付 237/0/1、基线 236/0/1 | **两端亲跑核实**（§七），净增恰 1 |
| 门 2 | clippy 7 warnings 全 pre-existing 全住 `lib.rs`，本单归属 0 | **属实**：5 unsafe（`lib.rs:1553/1554/1560/1564/1566`）＋2 return（`lib.rs:199/531`），`pi_loop.rs` 零 |
| 门 3 | rustfmt 8 处 drift，与 base 逐字节相同 | **属实**：两树各 8 枚 `Diff in`，剥掉首行路径后 drift 正文 `diff` 退出 0（逐字节同）；新增段零 drift |
| §五-6 | J3 今日两条可达路径不可脚本驱动 | **属实**：`ScriptedLeg::write_packet` 恒 `Ok(())`；`write_encoded` 只 `map_err(HostError::Process)`，不走 `fail_*` 故不关 session |
| §四.1 B4 | 「读 op 被 peek 放行、**走到真读件座**」 | **不准确**（见下） |
| §五-2 | 「旧写法下 write 主发读 op，本单之后会先被 J2 顶掉」 | **前提被证否**（见下） |

**B4 措辞订正**：该表格用的是局部闭包版 `read_request_packet()`，其 `proposal_hash` 是 `PROBE_SHA`
（非真值）。我在 born-red 树上直取该形态实测，出站是
`HostResultPayload{ capability: WorkspaceRead, operation: List, outcome: Failed{ code: HashMismatch,
message: "内容与提案哈希不一致" } }`——它止步于**早一道**的本侧重算门，从未走到读件座。判据不受影响
（该格断言是 `StateViolation` ＋ `host_result_count == 0`，born-red 下两条都破），只是决定性列的散文
把「过了名分门」写成了「到了读件座」。

**偏离②的理由被证否（结论对、前提假）**：0.1 能力门在 `serve_host_request` 顶部
（`capabilities.contains(&request.capability)`），**严格早于** `serve_read_request` 内的 J2，且
`serve_read_request` 全仓唯一调用点就在 0.1 之后。故 J2 不可能「顶掉」那一格。实测坐实：把该格主
改回 `Write` **并且**同时撤掉 J2，该格**仍然通过**（本轮失败发生在第 9 格「读 op 落在 write tc
名下」，即第 2 格已过）。换主本身无害——两种主都落在 0.1 上，该格证的东西没变——但回执给的理由
是假前提，按验收固定项登记。

## 六 · 我另造的探针：一枚同族缺陷仍开放（本票未闭、未恶化、已收窄）

`ACCEPTANCE.md:2409` 曾登记「第二枚 `tool_started` **无条件覆盖** `active_tool_call`，槽位已占用
不是 fail-closed 而是丢掉前一枚认领」，建议随后续票改 fail-closed。本票 arm 处仍是无条件赋值，
故亲测两形：

- **跨工具形（P-B）**：`tool_started{tc-A, write}` → `tool_started{tc-B, read}` → 写 op。
  base **served**（performs=1）；**交付树拒**（主是 `read`）。⇒ 本票把该缺陷**收窄**到同名工具内。
- **同工具形（P-C）**：`tool_started{tc-A, write}` → `tool_started{tc-B, write}` → 写 op。
  base 与交付树**双双 served**（probes=2 / performs=1 / host_result=1），journal 里 tc-A 与 tc-B 并存
  ——tc-A 的认领被静默丢弃，写入记在 tc-B 名下。**该缺陷仍开放。**

判定：**不阻断本票**。本票行的族定义是「tool↔capability 名分」与「tc 作用域」两条，槽位占用属
ADR-022 :285-290 另一句（「状态机仍须显式守住每 prompt 至多一枚未 finished tc」），不在本票面上；
且本票只把它变窄、未变宽。**据实上浮，请架构决定是否随 `PI-HOST-CONCURRENCY-1` 一并收口**——
那一票要改 prompt 出口形态，正是同一处。

另外两枚探针确认既有边界成立、非本票新洞：tc 已 `finished` 后来写 op 拒（P-A）；写 op `take` 掉 tc
后再来读 op 拒（P-D）；读 op peek 之后来写 op，交付树拒而 base 放行（P-E）。

## 七 · 门禁实跑（本树自跑，逐条记退出码，未经管道吞码）

| 门 | 读数 | 退出码 |
|---|---|---|
| `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`（交付 `edb0896`） | **237 passed / 0 failed / 1 ignored** | 0 |
| 同上（基线 `2c8fd7b`，独立 worktree＋同一份 dist） | **236 passed / 0 failed / 1 ignored** | 0 |
| `cargo clippy --all-targets --offline` | 7 warnings 全住 `lib.rs`，`pi_loop.rs` 归属 0 | 0 |
| `rustfmt --edition 2021 --check pi_loop.rs` | 8 处 drift；base 亦 8 且正文逐字节同 | — |
| `pnpm -r build` | 通过（仅既有 Vite chunk-size／dynamic-import warning） | 0 |
| `pnpm lint`（`eslint .`） | 通过 | 0 |

**Playwright 与 desktop vitest 不跑，理由显式**：本票是 Rust-only 单文件改动，`.ts`／`.tsx`／配置
零触碰（`--name-only` 两文件为证），二者的被测面与本票无交集；TS 侧编译与静态面已由
`pnpm -r build`＋`pnpm lint` 两枚实跑覆盖。**这是判断，不是静默跳过。**（附带一条订正：回执以
「并行 worktree 非空 ⇒ 根 lint 可能环境红」为由未跑仓级门；该判例成立，但在本验收树内
`.claude/worktrees/` 不存在，两枚仓级门实跑均退出 0，无环境红。）

## 八 · 偏离裁定与结转

回执六条偏离逐条：①case 表元组第四位 `bool → Option<ProductToolName>`（5 行既有格随改，其中 4 行
机械等价 `true→Some(Write)`／`false→None`）——**追认**；②「读能力未谈成」格换主——**动作追认，
理由驳回**（§五，假前提）；③`GateCase` 局部别名收 `type_complexity`——**追认**（clippy 实测 7 枚
pre-existing、本单归属 0）；④`read_tool_started_line` 命名残留只加注不改名——**追认**（知情接受，
改名属工单外 churn）；⑤两枚新测试助手（`write_request_packet_for`／`canceled_line`）——**追认**
（既有助手的参数化／同构版，无新概念）；⑥相二直接注入陈旧 tc——**追认，并登记覆盖形态限制**：
其可达性自述经核属实，但「本票边界内能让 J3 单独承重的最小手段」略有过头——给 `ScriptedLeg`
补一枚写失败注入是纯测试面改动，同样在 Rust-only 边界内，只是被判为工单外 churn 而未做。故 J3
今日**只由注入输入承重、从未被脚本路径驱动**，随 `PI-HOST-CONCURRENCY-1` 转真竞态驱动前，这是
一处如实登记的覆盖形态债，不是零覆盖。

**`[需架构拍板]` 裁定（Node `TOOL_CAPABILITY` 与 Rust J1/J2 两份同源真值）**：两侧合并真源确须先在
wire 上放 `toolCallId`，票面明令不改 wire ⇒ **该轴上「超出边界」成立**。但「两侧各自穷举是本票边界内
可得的最强形态」这句**在另一根轴上过头了**：Rust 这一侧的映射今天仍写了**两遍**（J1、J2 两处
穷举 `match`）。一枚 `fn capability_for(ProductToolName) -> WorkspaceCapability` 单点穷举、两臂各自
比对，同样在边界内、更便宜，且严格更强——按本仓 1R5 判例「同步消灭优于同步验证」（实现者自己引了
这条去论证 Node↔Rust 轴），加第五道工具时它只逼**一次**裁定，而现形态逼两次、两处可各自改成互相矛盾。
不阻断放行（现形态两臂都 fail-closed，M1/M2 已证各自承重），**作为建议上浮**，与 §六 的槽位缺陷一并
供架构在 `PI-HOST-CONCURRENCY-1` 排产时合并考虑。

结转（本单未碰、原样挂各自门）：上浮B `logicalPath` 空串两侧异源／②游标二元性随 `PI-WRITE-HOST-1`
收敛／④`cost_usd` Disabled 臂裸 inf。

## 九 · 结论

**判定：PASS。** 回归确已修复，且 Rust 侧恢复的是**等价或更强**的判据：旧形态「主必是 write」由
`match` 模式顺带承担、只覆盖写臂；新形态把它显式化为两臂各一道穷举名分门，**读臂那一半是旧形态
从来没有的**，作用域两道（J3/J4）也是新增。族确已穷举——四道工具由 `closed_enum!` 锁死，两类
host op 由 codec 在建包当刻锁死，4×2 的四格错配全列且逐格独立复红；`active_tool_call` 八处生产
消费点无旁路。born-red 亲自逆向复现，红形是回执宣称的 `Process(UnexpectedEof)` 而非
`StateViolation`，并实测到 `performs=1`——撤门之后写 effect 真的在读 tc 名下执行。五枚 mutation
逐枚独立、零残留、SHA 逐字复原。门禁本树实跑：cargo 237/236 两端对账、clippy 本单归属 0、rustfmt
零新增 drift、`pnpm -r build` 与 `pnpm lint` 双 0。

本会话**未改任何产品面**（born-red、13 格探针、5 枚 mutation、2 枚偏离核验全部 `cp` 还原、SHA 复原
`9b727e4d…`、`git status` 归零），只新增本节验收记录；不 merge、不 push 分支、不更新
`docs/status/current.md` 与 implementation-readiness、不开下游票。两处上浮见 §六（槽位覆盖同族缺陷
仍开放）与 §八（Rust 侧映射可单点化）。worktree `.claude/worktrees/accept-toolcall-binding` 与基线树
`.claude/worktrees/accept-tcb-base` 保留至收编。
# PI-UNKNOWN-TOOL-1 独立验收（2026-08-05，PASS）

target `ece479c`／base `2c8fd7b`（≡ main）。独立 worktree `.claude/worktrees/accept-unknown-tool`
（detached），`pnpm install --frozen-lockfile` 后自跑，回执一切读数均视为未证断言、逐条重算。

## 一 · 范围与禁区（diff `2c8fd7b..ece479c` 八文件）

生产改动**恰一个文件**：`packages/pi-lane/src/product-stdio.ts`（+69/-13）。逐条核禁区：

| 票面禁区 | 实测 | 判 |
|---|---|---|
| 不扩工具闭集 | `tool-policy.ts` diff **空**；`PRODUCT_TOOL_NAMES = ['read','grep','glob','write']` **恰四件**，仍由 `TOOL_CAPABILITY` 键派生 | 未越 |
| 不改 wire | `product-protocol.ts` diff **空** | 未越 |
| capability 集不变 | 同上，零改动 | 未越 |
| 不动 Rust **逻辑** | `pi_loop_process.rs` 两处改动落在 `@@ -923` 与 `@@ -1009`，而 `#[cfg(test)] mod tests {` 起于 **:862**（全文件 1512 行）⇒ 二者**全在测试模块内**，零 production 逻辑、零签名、零控制流 | 未越（见偏离二） |

`product-runtime.ts` 仅两段注释（零行为）；`SPEC.md` 两处措辞＋计数；`specs/PI-UNKNOWN-TOOL-1.md` 回执。

**概念账复核：`unprojectedToolCalls` 是否第二套状态机？** 判**否**。决定性依据是既有设计的同构性：
`product-stdio.ts:493` 注释自陈「tc 记录本身留着：下一 prompt 引用它必须被判 stale，而不是被当成
『从未登记』」——公开 tc 的两本册子本就**跨 prompt 存活、以 requestId 判 stale**。新册子逐条照抄该形状
（owner／同名／未收尾），`resolveUnprojectedToolCall` 与 `resolveActiveToolCall` 行行对位。它不铸 id、
不占 ordinal、不占 `activeToolCallId`、不上 wire、不进任何计数器——**非同类新增**，是既有机器在
「不投影」这一支上的镜像。

## 二 · born-red 独立复现：六枚，且全部是断言红

`product-stdio.ts` 与 `route-manifest.json` 一并回退至 base（测试段与 `product-runtime.ts` 保持 tip），
`cp` 备份／`cp` 还原，全程不用 `git checkout` 清未提交面：

| 相 | 读数 |
|---|---|
| born-red（production=base） | **6 failed / 534 passed（540）** |
| green（production=tip） | **540 passed / 17 files**，EXIT **0** |

回执宣称的六枚逐字复现。**票面点名要核的「断言形而非抛错逃逸」成立**——六枚红形逐条实测：

| # | 红形（实测原文） | 类型 |
|---|---|---|
| 1 | `AssertionError: bash: expected ProductSidecarError: 当前没有活动 prompt to be null` | AssertionError |
| 2 | `AssertionError: expected { snapshot: { …(9) }, …(1) } to deeply equal { …(2) }` | AssertionError |
| 3 | `AssertionError: expected ProductSidecarError: 当前没有活动 prompt to be null` | AssertionError |
| 4 | `AssertionError: expected [ 'capabilities', 'startPrompt:req-1' ] to include 'startPrompt:req-2'` | AssertionError |
| 5／6 | `AssertionError: expected 'failed' to be 'completed'`（`product-runtime.test.ts` 真内核臂） | AssertionError |

六枚**全部** `AssertionError`，零 unhandled 抛错。第 1／3 枚正文里的 `ProductSidecarError` 是被
`capture()` **收下后作为断言值**参与比较，不是逃逸——正是回执所称「首版红成抛错、已改写为可诊断断言形」
的落地形态。第 4 枚的 `startPrompt:req-2` 判据确实是「跨 prompt」与「会话早死」的分辨点，成立。

还原后 `shasum -a 256` = `9d9e925e29c2b12f8b4fc40e4a4431c058da996f700ec5d8328d1c793963d78a`
（与回执登记值逐字相同），`git status` 归零。

## 三 · mutation 八枚独立重跑：全部有齿，但回执「互不相同」一语需订正

自建 `mutate.py`，每处替换先 `text.count(old)`，非 1 即硬失败拒绝写入；八枚均报命中 1 处，
每枚跑毕 `cp` 还原、末次 SHA 复原 `9d9e925e…`、`git status` 归零。

**读数须先扣除两类与判据无关的红**：①`route manifest 与 product source 的跨侧核验` 在**每一枚**
变异下必红——改 `product-stdio.ts` 即改 bundle 字节，该门按构造必红，不属判据总体；
②`workspace-write-env.test.ts` 的墙钟 flake（见 §六）。扣除后：

| # | 变异 | 回执宣称 | 我实测（扣除后） | 打红的判据 |
|---|---|---|---|---|
| M1 | 撤拆分⇒`failUpstream()` | 6 | **6** ✓ | 与 born-red 同一六枚 |
| M2 | 查重门去 `unprojectedToolCalls.has` | 1 | **1** ✓ | 实现层违约三形 @`:2226`（`dupUnknown`） |
| M3 | 未投影侧去同名门 | 1 | **1** ✓ | 实现层违约三形 @`:2276`（`renameIn`） |
| M4 | 未投影侧去 owner prompt 门 | 1 | **1** ✓ | 跨 prompt stale |
| M5 | 未投影侧去 `finished` 单向门 | 1 | **1** ✓ | progress／二次收尾 @`:2193`（二次收尾） |
| M6 | 未投影早返上移到两道结构门之前 | 1 | **1** ✓ | 拆分不绕开结构门 |
| M7 | 删 `tool_progress` 未投影早返 | 1 | **1** ✓ | progress／二次收尾 @`:2162`（progress） |
| M8 | 删 `tool_finished` 未投影早返 | 5 | **5** ✓ | (a) 五枚 |

**订正一处回执不实**：回执称「M2–M7 各自只打红一枚**且互不相同**」。以 `it()` 为粒度，
**M2≡M3**（同打「实现层违约三形」）、**M5≡M7**（同打「progress／二次收尾」）——六枚变异只落到
**四个** `it()`。我据此追查断言级坐标，四枚**确在互不相同的断言行**（M2`:2226` 重复登记／M3`:2276`
改名／M5`:2193` 二次收尾／M7`:2162` progress 不上 wire），故**「判据之间无互相顶名」这一实质成立**，
不实的只是「互不相同」的粒度表述。属回执精度问题，非正确性缺陷；建议措辞改为「各自打红一枚判据，
四枚 `it()` 内断言互不相同」。

## 四 · 我自跑的九枚探针（实现者未跑形状）：族是闭的

新建 `zz-accept-probe.test.ts`（harness 逐条镜像 `product-stdio.test.ts`），**9 passed**，验收后已删除。

| 探针 | 问题 | 实测 |
|---|---|---|
| P1 | 闭集外 start **之后没有 end**（对端违诺，内核虽保证必发） | 不占公开 ordinal（后续 `read` 仍 `tc_1_1`）、`publicToolCallId('call_x')` 为 `undefined`、terminal `completed`、phase 回 `idle`。**零泄漏、不 fail-open** |
| P2 | 未投影 tc 改名为**另一个闭集外**名字（`bash`→`edit`） | fail-closed。**票面要我核的「改名族在未点名方向是否也闭」——闭** |
| P2b | 未投影 tc 的 **progress** 改名（`bash`→`edit`） | fail-closed |
| P3 | 已收尾的未投影 tc 再来 progress | fail-closed |
| P4 | 未投影调用与**真 write host op 交错** | write 仍认领 `tc_1_1`／`op_1_1`，`tool_finished` 恰一枚、terminal `completed`。**与 `active_tool_call` 零交互** |
| P5 | **洪水**：同 prompt 内 50 枚互异闭集外名字 | 会话存活、ordinal 零漂移（`read` 仍 `tc_1_1`）、wire 恰两枚事件 |
| P6 | 两枚**并发**未投影 start（都未收尾） | **不被拦**（见下） |
| P7 | 跨 prompt 复用同一 raw tc id | 闭集内臂与闭集外臂**同判** fail-closed ⇒ 对称，非本票新增语义 |
| P8 | 未投影调用是否进 turn/预算账 | snapshot 与 terminal 双臂逐值相等 ⇒ 零漂移 |

**P6 登记（观察，非缺陷）**：未投影 tc 刻意不占 `activeToolCallId`，故「重叠 tc」这道门在未投影侧
**结构上不适用**——两枚并发未投影 start、以及「未投影未收尾＋公开 start」都不被拦。判非缺陷：该支
零 effect／零 wire／零计数器，且内核 `toolExecution:'sequential'`；但回执「三道结构门一道不减」
宜精确为「查重与 settled effect 两道对未投影侧同样生效；重叠门因未投影不占闩锁而不适用」。
M6 已证「不绕开」的那一半（早返上移即红），此处只是口径收窄。

**关于洪水的内存**：`unprojectedToolCalls` 与既有 `toolCallIds`／`toolCalls` 同样跨 prompt 存活
（`:493` 明文「tc 记录本身留着」），三者同受 12 回合 session 硬顶约束，无新增无界增长面。

## 五 · 偏离二（票面点名「最高风险」）：四枚未验证钉值，现已逐值验证

回执如实声明「本单未跑 cargo，四处改动未经编译验证，请验收复核」。我在本树重建并复核：

| 项 | 实测 | 对 registered 值 |
|---|---|---|
| `build-product-sidecar.mjs` 重建 | `action: **created**`（本树全新构建，非 reused）、`reproducible: **true**` | — |
| bundle 字节 | `wc -c` = **547,283** | manifest／Rust 真值表登记 `547_283` **逐值相符** |
| bundle sha256 | `93f04a1cd767d5541bffd24f8b4845129a6ed2dafd00872a1e22dc991fb0185c` | 两处登记值 **逐字符相符** |
| `cargo test --lib --offline` | **236 passed / 0 failed / 1 ignored**，EXIT **0** | 与 base 236/1 **同值，本票零净增减** |

四处（manifest bytes／manifest sha／Rust 编译期真值表两枚断言／两枚变异夹具搜索串）**全部坐实**。
偏离本身判**必要且正确**：该处注释自身冻结「双方由 `product-main.test.ts` 跨侧门逐值锁死，不许只改
一边」，只改 manifest 必留 Rust 红；票面「不动 Rust」的立意是不动**逻辑**，而改动确在 `mod tests` 内。

**首轮 cargo 曾 234/2 red**：两枚 `headless_*` 报「缺 headless bundle——先跑 build:headless-sidecar」，
系**全新 worktree 缺制品**的环境前提，非缺陷；补跑 `build-headless-sidecar.mjs` 后复绿 236/0/1。

**随附登记（非本票缺陷，但须留值）**：`product-stdio.ts` 一动，headless bundle 同步漂移
**554,327 → 554,704 B ／ `7a09318127510ee03771ae367aab0fe5e16bb8767d5052417be933ada1abeb91`**
（+377 B，与 product bundle 增量同值）。全仓 `git grep` 于 `*.mjs/*.rs/*.ts/*.json` 对
`554,327|554327` **零命中** ⇒ **无任何机器门冻结该身份**，故本票不改它不留红，处置正确。但
`specs/PI-HEADLESS-HARNESS-1.md:198` 在「移交·开工前必读」节以**「现值」**口吻写 `554,327 B / 52b65d16…`，
该数自本票起为陈旧。循「回执是历史记录、不回改」的成例，本验收不动那份回执，改在此处登记真值，
供 `PI-BASE-HEADLESS-ACCEPT` 取用。

## 六 · 既有 flake 的归因（实现者已登记，我独立复核并确认）

mutation 多轮中见 `workspace-write-env.test.ts` 两枚红（`经 binder 的同路径并发调用…`、
`characterization：共享同一 env 对象时…`）。**归因确认为非本票**：该文件对 `product-stdio` 引用计数
`/usr/bin/grep -c` = **0**（零因果路径）；其等待器为 `:705` 的
`const settle = () => new Promise((resolve) => setTimeout(resolve, 20))`——赌 20ms 墙钟，
属「异步前置不赌时长」标准判例的在案违例。本树高负载（load average 峰值 **7.50**，同机另有验收会话）
下塌红，静息下 540/540 全绿。**不记本票回归，亦不在本票内修**（只做工单范围）；
建议另立票按判例改为事件驱动等待。

## 七 · 门禁实跑（真退出码，未经管道吞码）

| 门 | 读数 | 退出码 |
|---|---|---|
| `npx vitest run packages/pi-lane` | **540 passed / 17 files**（base 531 ⇒ 净增 9，与 SPEC §十 订数一致） | **0** |
| `pnpm -r build` | 通过（仅既有 Vite chunk-size warning） | **0** |
| `pnpm lint`（`eslint .`） | 通过（本树无嵌套 worktree，不触 parsing-error 判例） | **0** |
| `build:product-sidecar`（独立重建） | **547,283 B / `93f04a1c…`**、reproducible:true、created | **0** |
| `build:headless-sidecar`（独立重建） | 554,704 B / `7a093181…`、reproducible:true | **0** |
| `cargo test --lib --offline` | **236 passed / 0 failed / 1 ignored** | **0** |

## 八 · 其余偏离逐条裁定

1. **偏离①（SPEC §三.1 订正宽于点名）——ACCEPT。** 原文「只注册 read/glob/grep。edit/**write**/bash
   从不构造」自 `PI-WRITE-HOST-1` 起为假（我核：`PRODUCT_TOOL_NAMES` 含 `write`，产品装配确实构造
   host-mediated write）。它与本票要澄清的「叫哪些名字会得到 `Tool X not found`」是同一句话里的第二版
   真值，留着即违反不变量 5。订正准确、范围止于该句，§三.2/§三.3 与六格其余五格未动。
2. **偏离③（宿主侧看不到未遂调用）——ACCEPT 并登记。** 对不变量 4（静默降级零容忍）判**不构成违反**：
   显式面存在且非静默——内核把 `Tool X not found`／`isError:true` 直接交给**必须据此改道的那一方**
   （模型），这正是 SPEC §三.1 承诺的收信人；wire 的 `toolName` 是闭集类型，无表达该事件的形状，
   扩 wire 是票面明禁。**我另核一条可能的隐忧并排除**：宿主看不见 ⇒ 模型若反复空叫是否**无形烧回合**？
   P8 实测 `turn_finished` 计数与不叫时**逐值相同**（照常递增），故 12 回合硬顶与预算门照常兜底，
   不存在不可见的无界消耗。若日后要给 GUI「模型试了不存在的工具」提示，属扩 wire 另票。
3. **偏离④（`tool_progress` 未投影支今日结构不可达）——ACCEPT。** 三行成本，M7 证其承重（`:2162`），
   我的 P2b／P3 另加两枚形状。本票的病根恰是「凭上游形状假设自保」，故此处不靠上游形状自保是对的姿态。
4. **偏离⑤（既有反例四改瞄而非删除）——ACCEPT。** 改瞄后仍守「同 tc 说了两个名字」这一半威胁模型；
   我的 P2 补上未点名方向（两端**都**在闭集外）亦 fail-closed ⇒ 改名族闭合，无兄弟逃逸。
5. **偏离⑥（`product-runtime.ts` 两段注释）——ACCEPT。** 零行为；旧注释断言的「已冻结」自本票起为假，
   按不变量 5 必须同批改。

## 九 · 结论

**判定：PASS。** 缺口真实且与票面根因逐段对上（内核查表在 `tool_execution_start` **之后**，
故该事件的 `toolName` 是模型输出而非实现层违约）；改法最小——单文件、门序重排、放行的**只有
「名字不在闭集」一条**，三道既有结构门在未投影侧的适用性经 M2／M6 与 P4／P7 双向验证；
新增概念恰一个且与既有 tc 册子逐条同构，非第二套状态机。born-red 六枚独立复现且**全为断言红**，
八枚变异全部有齿、命中校验齐备、SHA 复原；我自跑九枚未跑过的探针（含悬空 start、双向改名、
洪水、与真 host op 交错）**未发现族外逃逸**。票面点名的最高风险项——四枚未经编译验证的钉值——
经独立重建与 cargo 双证**逐值坐实**（547,283／`93f04a1c…`；cargo 236/0/1 与 base 同值）。

**未做 fix-by-acceptance**：本轮只发现两处**措辞精度**问题（§三 mutation「互不相同」粒度、
§四 P6「三道结构门一道不减」口径），均在回执文档内、不影响实现正确性与契约，按「只做工单范围」
留待清账时随手订正，不在验收树改动交付面。**本会话除 ACCEPTANCE.md 外零改动**（变异与回退全 `cp` 还原、
SHA 复原、探针文件已删、`git status` 归零）；不 merge、不 push、不动 `docs/status/current.md`
与就绪图、不开下游票。

**移交**：六格 cell 6 判读口径自本票起变更——`delete`/`bash` 族**不产生 terminal**，收到 terminal
反而是 harness 红（SPEC §九 已同批改）。`PI-DUALROOT-CONTRACT-1` 的裸相对路径判读不再被本缺陷污染。
`PI-BASE-HEADLESS-ACCEPT` 取 headless 制品真值 **554,704 B / `7a093181…`**（§五）。
结转 [需架构拍板]（本单未碰）：②游标二元性、④`cost_usd` Disabled 臂裸 inf、
`PI-HOST-CONCURRENCY-1` 并发/中断模型待 ADR 修订。
worktree `.claude/worktrees/accept-unknown-tool` 保留至收编。

## PI-DUALROOT-CONTRACT-1 独立验收（2026-08-05）

验收会话：Codex 独立验收会话；目标 `4e8eb99`（`claude/pi-dualroot-contract-1`），独立 clean
snapshot `/private/tmp/courtwork-dualroot-accept.WWmK35`；主工作树未触碰。

### 判定

**PASS（具名：Codex 独立验收会话）。** 实现未修；本节是验收回执。

### 票面退出证据

- `createDualRootEnv` 的裸相对路由由必填 `defaultLogicalRoot` 决定；未知默认根装配即拒绝，交换
  `roots` 次序不改变寻址。唯一生产装配点 `product-runtime.ts` 明确写死 `/workspace`。
- `read`／`glob`／`grep`／`write` 裸相对路径均落 `/workspace`；write 后以同一裸串 read-back
  命中同一文件；显式 `/case/...` 的 read、glob、grep 均照常可达。
- 四件工具 description 均追加同一枚 `DUAL_ROOT_ADDRESSING_NOTE`；上游 read/write 原文逐字在前，
  glob/grep 的 `path` 参数说明已是双根口径。静态断言和行为断言均通过。

### 七枚变异

M1（默认根退回 `roots[0]`）、M2（read description 撤回上游原文追加）、M3（glob/grep 撤口径）、
M4（write description 撤回上游原文追加）、M5（未知默认根不拒绝）、M6（path 说明退回单根）、
M7（route 去前缀匹配）均在本验收 clone 实施后观察到目标断言变红，并逐枚还原复绿。M1 定向族
复现 4 枚裸相对／回读红证；M7 定向复现 2 枚显式 `/case` 红证；其余五枚各自命中对应静态或装配
断言。变异没有留在目标树。

### 既有绿测与身份复核

- 十处 product-runtime 测试仅把案件读取路径显式改为 `/case/...`，断言未改；两处 characterization
  由「description 原文相等」改为「上游原文逐字在前＋口径追加」的 exact equality，parameters
  同一性断言保留。
- `write-session-wire-v1.jsonl` 的两枚 `inputTokens` 从 `516/548` 重烤为 `636/667`；Rust 侧仅按
  wire usage 编解码／校验，未对这两个输入 token 值作断言。
- 独立从当前 source 连编两次 sealed CJS：均为 `547,893 B`、SHA-256
  `951acf8ed3b541988041cd4b1ed80402c02c643d7d95f4cbce0b25a3ff74bc6c`、`reproducible: true`。
  `route-manifest.json` 与 Rust 编译期真值表逐值一致。

### 四项偏离

1. binder description 条款按 main `90912f4` 的架构订正判定：保留上游原文，仅在其后追加寻址口径，
   **接受**，不属违约。
2. 上游 read/write `path` 参数说明维持 `(relative or absolute)`；parameters 同一性约束下，双根
   规则已由 description 足额承载，且 SPEC 五-9 已登记，**接受**。
3. `md-work-v1` 未改；独立核对与裸相对 `/workspace`、显式 `/case` 新口径无冲突，**接受**。
4. `logicalRoots` 未收窄；生产装配固定双根，其余仅为既有特征化测试形态，未引入新风险，**接受**。

### 门禁

| 门 | 独立实跑读数 |
|---|---|
| `pnpm -r build` | 通过（Vite 仅既有 chunk-size warning） |
| `pnpm lint` | 通过 |
| `pnpm test` | **1938 passed / 170 files，EXIT 0** |
| pi-lane | 全仓结果包含本票 **553 passed / 17 files**；一次独立定向复跑确认既有 `PI-TEST-WAITER-1` 的 20ms 墙钟抖动，非本票回归 |
| `build:headless-sidecar` | `555,314 B` / `061248fa…`，reproducible |
| `cargo test` | **237 passed / 0 failed / 1 ignored，EXIT 0** |

Playwright 未跑：票面门清单未列、本票零 desktop UI 面改动，且同期已有 Rust 会话按排程律占用全仓
Playwright 配额。`site:guard` 未跑：无站面改动。两项均按票面豁免登记，不影响本票放行。

不更新 `docs/status/current.md` 或 implementation-readiness，不开下游票；验收 clone 中除本节外无实现
改动。

---

## PI-HOST-CONCURRENCY-1 · 独立验收（2026-08-05）

**判定：PASS。** 本节对应交验点 `58d3bb3`（独立 clean clone，detached HEAD），未修改实现，
未触碰主仓工作树。

### 票面逐条证据

- 两枚真竞态均成立：`stop_during_an_active_prompt_reaches_the_pump_through_the_command_channel`
  与 `stop_while_waiting_for_authorization_settles_the_proposal_as_user_denied` 使用宿主专属线程、
  真 `mpsc` 命令通道和 `RacingLeg`；Stop 均实际穿过泵，第二枚以 durable
  `authorization_decided(denied,user_denied)` 收束，effect `performs == 0`。
- `a_decision_receipt_that_arrives_after_the_proposal_settled_never_takes_effect` 实测迟到批准被
  `NoPendingProposal` 拒绝并进入 discarded 登记册，`effect_started` 不出现，effect 恰零次。
- base `480b4ea` 的独立 probe 复现同工具形缺陷原形：`tool_started(tc-A,write)` →
  `tool_started(tc-B,write)` → write request 得到 **`Process(UnexpectedEof)`**，而非应有的
  `Protocol(StateViolation)`；交付树的 `counterexample_a_second_tool_started_never_silently_replaces_the_slot`
  通过，槽位门位于 journal append 之前，坏事件零落盘。
- `the_tool_capability_mapping_has_exactly_one_site` 通过；M1 将 `Write` 映射为
  `WorkspaceRead` 时，write/read 行为轴均红；M5 注入第三处映射时结构轴红。
- `cargo check --all-targets` 通过，未见 `dead_code` 告警；仅 base 已有 `lib.rs` 的 5 枚
  `unused_unsafe`。`pi_loop.rs` 的 crate 级遮罩已移除；剩余 journal 模块级遮罩为 base 既有项。
- `out_of_order_commands_are_named_refusals_never_silent_drops` 通过，五枚错序拒绝均具名：
  `prompt_busy`、`no_active_prompt`、`cancel_in_flight`、`no_pending_proposal`、
  `operation_mismatch`；M6/M7 分别撤泵内/空闲循环登记，均实际红。
- `a_pending_proposal_is_tolerated_only_at_the_tail_of_a_leg` 通过：leg 尾部一枚无 decision
  可容忍，中部同形整份 quarantine，恢复不代答；M3 撤中部门实际红。
- `pi_loop_journal` 的 `JournalType` 逐值核为十九型，`PacketPayload` 与
  `AgentProjectionEvent` 闭集未扩；六-B.1 cancel 既有 golden/竞态/uncertain 优先级测试全绿。
  `real_write_host_without_a_decision_driver_denies_and_writes_nothing` 仍证明 production 无
  driver 恒 `policy_denied`，无 effect。
- teardown 同 Stop 形收束、删除 `PiLoopHost::cancel`、trait 加 `Send` 三项与 §七追认逐条一致；
  `teardown_during_an_active_prompt_collapses_it_then_closes_the_session` 通过。

### 七枚 mutation（逐枚亲跑，均先红后还原）

| 变异 | 独立结果 |
|---|---|
| M1 `capability_for(Write)` 改为 `WorkspaceRead` | write/read 两枚行为测试均红 |
| M2 泵跳过 `service_commands` | 两枚 Stop 真竞态均以 5s 无回执红 |
| M3 删除 `validate_records` 中部未决提案门 | 中部 quarantine 断言红 |
| M4 删除 `read_host.is_none()` fail-closed 门 | 「读件座缺席」断言红，实得 `Process(UnexpectedEof)` |
| M5 注入第三处 tool↔capability 映射 | `the_tool_capability_mapping_has_exactly_one_site` 红 |
| M6 泵内撤 `register_discarded` | 失效回执登记数量红 |
| M7 空闲循环撤 `register_discarded` | 失效回执登记数量红 |

### 门禁与制品

| 门 | 实测 |
|---|---|
| `pnpm -r build` | 通过 |
| `pnpm lint` | 通过 |
| `pnpm test` | **1925 passed / 170 files** |
| `pnpm --filter @courtwork/desktop test` | **690 passed / 75 files** |
| `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml` | **246 passed / 0 failed / 1 ignored** |
| `COURTWORK_E2E_PORT=1658 pnpm --filter @courtwork/desktop test:e2e` | **352 passed / 4.0m** |
| product sidecar 独立重建 | **547,283 B / `93f04a1c…` / reproducible:true**，与 base 在册值同；未混用 `547,893 B / 951acf8e…` |
| headless sidecar（补齐 clean clone 制品） | **554,704 B / `7a093181…` / reproducible:true** |

首轮 root/cargo 的回环监听失败均为 sandbox `EPERM`，未计入门禁；以授权方式在独立端口/本地 mock
端口复跑后通过。全程只运行一条 Playwright 链。验收提交除本节 `ACCEPTANCE.md` 外无源文件改动，
不做 `fix-by-acceptance`，不更新 `current.md`/readiness，不 merge/push。

---

## PI-BOUNDED-SITE-1 · 独立验收（2026-08-09）

**判定：REJECT。** 本节对应交验点 `203cb1c`（base `13415e4` 直接子，`git rev-parse` 核实），
验收树 `/private/tmp/courtwork-pi-bounded-site-1-accept`，未修改实现，未触碰主仓工作树。

拒绝理由恰一枚，且是票面为乙路开出的唯一退出判据：**旧宣称未零残留**。选路本身成立，
边界干净，八相门禁全绿——但票面「订正后旧宣称零残留」在同一文件内有两处未订正，其中一处
住在活测的文档注释上，与本票新写的注释直接互斥。

### 一 · 成立的部分（逐条独立核，不采信回执）

- **`.site` 零断言消费成立**。`/usr/bin/grep -rna '\.site\b'` 扫全仓 `*.rs`/`*.ts`/`*.tsx`/
  `*.js`/`*.mjs`/`*.cjs`（排除 `node_modules`、`archive/`、`target/`），四枚命中全在 release
  与 skin 脚本的 `.site-marginalia` 等无关标识上，`pi_loop.rs` 侧零命中。`site` 在
  `pi_loop.rs` 只出现于结构体定义与十六条清单行的初始化，无任何读取点。票面前提成立。
- **1R6 装置退役真实在案，且辖面覆盖此类扫描器**。`git log -S"scan_bounded_judgment_uses"`
  恰两枚：`e269ce5`（1R4 引入）、`d70c1b5`（删除）。`d70c1b5` 提交信息自陈「H2：退役文本
  扫描双轴与 75 行同步账（删 2258 行、3 测试+35 符号逐名对应授权条）」，净 894 增 2367 删。
  该套辅助件在当前树零存在（唯一字面命中是本票新写的注释本身）。`docs/engineering/workflow.md`
  「闭口按族」判例的再订正段（2026-08-02，源 1R5 复验）载有总判据「在富语言里用文本模式
  枚举语义构造结构性不可胜」及出路「同步消灭优于同步验证」，辖面确覆盖 `site` 版扫描器。
- **生产语义零触碰**。`git diff 13415e4..203cb1c` 恰两文件；`pi_loop.rs` 侧抽取全部
  `+`/`-` 行后剔除 `///` 与 `//` 开头者，剩余为空——31 行改动纯注释，且全部落在 `mod tests`
  内。cargo 面零回归由下文门禁实测佐证。
- **实现列出的四份无关命中，逐一复核确为无关**：`ACCEPTANCE.md:2633`（端口值域红证）、
  `PI-WRITE-HOST-1-RECON.md:19`（`BoundedInput{input,site,judgments,code,probe}` 结构引用）、
  `sandbox-probe-1.md:364`（R3 能力面登记册）、`workflow.md:95`（`UNCONSUMED` 表）。
  另 `workflow.md:209` 虽以现在时写「手写期望清单＋源码扫描双向核对」，但同节三段补正逐层
  推翻至再订正段收束，属判例演进叙事，不构成现行宣称，不计入残留。

### 二 · 选路正当性：乙成立，但不因此豁免退出判据

甲路要求的断言若按 1R4 原形写，就是把 `d70c1b5` 删掉的那套逐行文本扫描搬回来；三代同类
装置（常量名单 1R3 → 判据函数名单 1R4 → `return Err(` 字面量 1R5）逐轮被下一轮验收找出
盲区，无一终局站稳。`site` 粒度比 1R4 已败的判据粒度更粗——一个函数体内可合法调用多枚
判据——故第四代更易被绕。撤销一次已落痕的架构退役裁定属契约级动作，不由实现会话单方面
执行。乙路的选择与其论证独立复核后成立。

一项观察，不构成拒绝理由：存在一种不复活退役装置的甲——判**结果**而非**形状**，令拒绝
路径自带发生位置（如判据 helper 上 `#[track_caller]`，由反例驱动器断言实测 site 等于清单
行 site）。它不读源码一个字，与 1R6 退役的文本扫描不同族。但它须触碰生产码，越出票面
「只动测试与文档宣称」的边界，故属架构是否放宽边界重开甲路的问题，非本票可为。请架构在
核销就绪图该行时一并裁定。

### 三 · 决定性：旧宣称两处残留，且 SPEC 的核对宣称本身不成立

把 SPEC §十「乙路收口」自述的检索命令
`grep -rn "site.*judgment\|双向锁" --include='*.md' --include='*.rs'`（排除 `archive/`）
逐字复跑，返回两枚该节从未列出的 `pi_loop.rs` 命中：

- **`pi_loop.rs:5286-5307`（D1 覆盖自证段）**，通篇现在时：`:5291`「手写冻结清单持有整个
  闭集，并与源码扫描**双向**核对」；`:5294`「② 清账表登记四模块生产段每一处受验门消费点，
  **新增一道门而不补表即红**」；`:5302-5306`「本轮把扫描谓词改成与族同宽：③ 扫描面 =
  `MAX_*` 冻结常量 ∪ 函数型格式判据……④ 清单与 `pi_loop.rs` 生产段的前置门在
  `(site, judgment)` 粒度上**一一对应**」。②那句是对一道机器门的事实陈述，而该门自
  `d70c1b5` 起不存在——新增一道门而不补表今日恒绿。
- **`pi_loop.rs:7387-7390`**，活测 `safe_token_family_is_fully_accounted_for` 的文档注释：
  「这一道把 ADR 的族定义与 D1 清单接起来；清单又由 ②（`(site, judgment)` 双向锁）接到
  生产段消费点。三段接完，『ADR 说是一族』到『源码里真有那道门』才闭合。」其中的「②」正
  指上一处 `:5294`。两处互相引用，合成一份仍然站立的完整假宣称。

第二处与本票新写的注释直接互斥：`:5372-5375` 把该测试列为「已验证的单向」关系之一，并写
明「两者都不回锚清单行到生产段源码位置」；同文件下方一千九百行处，该测试自己的注释仍称
三段接完才闭合。读者在同一文件内得到两条对立陈述，且落在同一枚测试上——本票要消除的
形态，在本票交付树内复现。

SPEC §十「零处仍暗示装置在场」因此是一句可证伪且已被证伪的核对宣称（承回执卫生：宣称须
与实测一致）。

补一层同族观察：该节把残留族定义为两条文本模式，而 `:5291` 的「与源码扫描**双向**核对」
两条都不匹配——按文本模式枚举语义构造，正是本票在甲路评估里判定不可胜的那件事，此处施
于自查，同败。这不额外增加拒绝理由，但说明返修不应再按模式枚举，须按「凡断言退役装置在
场的句子」这一族逐句读完 `pi_loop.rs` 相关段落。

树内已有正确订正的先例可循：`pi_loop.rs:263-271` 经 1R7 改写为「1R3 那套『清单与源码扫描
的双向自证』已按 1R6 H2 整体退役；今日的自证是 `bounded_input_manifest` 的行为反例，加上
违规电池驱动完整入口的普适不变量」——过去时叙述加指向今日真自证。该形态由 1R6 验收在
`ACCEPTANCE.md:1657-1659` 以「自陈漂移」立案、1R7 以 J3 兑现。本票两处残留照此形态订正
即可。

### 四 · 门禁实跑（本树自跑，逐条记退出码，未经管道吞码）

| 门 | 实测 | 退出码 |
|---|---|---|
| `pnpm install --frozen-lockfile` | 通过 | 0 |
| `pnpm --filter @courtwork/pi-lane run build:product-sidecar` | **547,893 B / `951acf8e…` / reproducible:true** | 0 |
| `pnpm --filter @courtwork/pi-lane run build:headless-sidecar` | **555,314 B / `061248fa…` / reproducible:true** | 0 |
| `pnpm -r build` | 通过（仅既有 Vite chunk-size 告警） | 0 |
| `pnpm lint` | 通过 | 0 |
| `pnpm test`（root vitest） | **1941 passed / 170 files** | 0 |
| `cargo clean` ＋ `cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml` | **250 passed / 0 failed / 1 ignored** | 0 |

八项读数与 SPEC §十自报表逐格相符，含两枚 sidecar 的字节数与 sha 前缀。cargo 面零回归成立。
未跑 Playwright：`apps/desktop/src` 零改动，改动面限于 Rust 测试段注释与一份 SPEC；全程未取
`/private/tmp/courtwork-pw-lock`，未起任何 e2e 链。root 与 cargo 两门顺序跑，未并发。

### 五 · 返修判据

1. `pi_loop.rs:5286-5307` 与 `:7387-7390` 两段按 `:263-271` 的既有形态订正：退役事实用过去
   时，并指向今日真自证（行为反例 ＋ 普适不变量电池）。`:5294` 的「新增一道门而不补表即红」
   须删或改写，它今日为假。
2. 订正后重扫，且族按语义定义、不按文本模式：通读 `pi_loop.rs` 内 D1 与 SafeToken 两段的
   全部注释，逐句判断是否断言退役装置在场。
3. SPEC §十「乙路收口」小节据实重写：现行列举漏掉了自述命令能返回的两枚命中，须补列并
   标明处置。
4. 生产语义仍不得触碰；门禁按本节口径复跑。

验收提交除本节 `ACCEPTANCE.md` 外无文件改动，不做 `fix-by-acceptance`，不更新
`current.md`/readiness，不 merge/push。

### PI-BOUNDED-SITE-1 · 聚焦复验（2026-08-09，返修 `7064dd8`）

**判定：PASS。** 上节 REJECT 的决定性理由已消解。复验点 `7064dd8`（`203cb1c` 的直接子，
`git merge-base --is-ancestor` 核实，单枚返修提交），验收树同前，未修改实现。返修 diff 仍
恰两文件；`pi_loop.rs` 侧抽取全部 `+`/`-` 行剔除 `//`、`///` 后剩余为空——37 行改动纯注释。
全票累计 `13415e4..7064dd8` 触及文件集不变。

**(a) 两处拒因位已按 `:263-271` 先例订正。** D1 覆盖自证段（现 `:5286-5314`）把②③④重写为
「1R3-1R5 三轮曾……」的过去时叙述，紧接显式否定现状：「**②③④这套装置已按 1R6 H2 整体
退役（`d70c1b5`）**……『新增一道门不补表即红』不再是真的」，并指出今日自证为①的行为反例
加违规电池普适不变量。①（清单每行 pre-journal/pre-spawn 红例）保留现在时，独立核为今日
仍真。`safe_token_family_is_fully_accounted_for` 的文档注释（现 `:7394-7402`）删去「三段
接完才闭合」，改为两条已验证单向关系，并显式声明「**两段都不回锚清单行到生产段源码
位置**」——与 `BoundedInput` 结构体注释（现 `:5364-5388`）的同一断言一致，互斥消除。
新注释点名的四枚符号独立核实全部在场：`violation_battery`（3 次）、
`universal_invariant_refused_host_input_leaves_zero_side_effects`（1 次）、
`counterexample_every_bounded_host_input_is_refused_before_journal_and_spawn`（2 次）、
`safe_token_ledger`（2 次）。

**(b) 12 段核对表抽验 7 段，含两段拒因位，全部与表述相符**：`:281`（`safe_token_ledger`
的「清账表」措辞，另一张活表）、`:365-373`（1R3→1R5 手工同步已退役、改道
encode-before-effect，既有正确先例）、`:5286-5314`、`:5504-5508`（「production 门**当时**
就在……撤掉它整套证据全绿」，显式过去时）、`:7394-7402`、`:7411`（同名异物）、
`:10081`（codec 双向唯一，同词异指）。

**(c) 首轮同一检索命令逐字重跑**，`pi_loop.rs` 得四枚命中，逐一判族：`:5304` 落在「三轮
曾……」的过去时句内且紧随退役声明；`:5364`／`:5377` 为首轮已正确的结构体注释；`:7399`
为本轮新写的显式退役陈述。零处以现在时断言退役装置在场。另按语义口径自扫
`\bsite\b|judgment|双向|扫描|清账表`，得三处落在 12 段表之外：`:143`（凭证面「不扫描、
不猜测、不回落」，同词异指）、`:5389`（`judgments` 字段声明）、`:7434-7438`
（`listed.judgments` 的活断言代码）。三处均非宣称，不构成残留。

**(d) 架构裁定原文留痕成立**：`PI-HOST-CONCURRENCY-1.md:392-398` 载「架构已裁：**不重开
甲路、不放宽票面边界**——既有两条已验证单向关系已覆盖行为约束，`track_caller` 型结果锁
的增益仅是『锚点定位精度』而非新增行为保证，且触碰生产码……不符合复杂度节制预算」。上节
移交的观察项就此结案。

**(e) 门数字抽验**：`cargo test --manifest-path apps/desktop/src-tauri/Cargo.toml`
**250 passed / 0 failed / 1 ignored**，退出码 0，与首轮及 SPEC 自报表逐格相符。改动面纯
注释，零行为面，其余七门不重跑。未跑 Playwright，未取 `/private/tmp/courtwork-pw-lock`。

另记：SPEC §十把首轮小节如实改题为「已被独立验收判非」，并自陈首轮失误的真实形态是把
核对做成了 `-l` 的目录级枚举、未对命中文件本身逐行重读。该订正与我的独立观测一致。

#### 观察项（均不构成阻断，留给清账/后续票）

1. `:5309-5310`「源码侧今天不存在任何扫描器或清账表」中的「任何……清账表」略宽于实况：
   `safe_token_ledger()` 是一张活着的清账表，`:281` 与 `:7411` 都以该词指它，SPEC 表的
   `:7411` 行也正靠「同名异物」区分。该句由前句「②③④这套装置」限定，不构成断言退役装置
   在场，故非残留；宜在下次触碰该段时收窄为「不存在②那张判据消费点清账表，也不存在任何
   源码扫描器」。
2. 12 段核对表未收 `:143`、`:5389`、`:7434-7438` 三处，与该表「全部段落」的措辞略有出入；
   三处经核均非宣称，不影响结论。
3. 架构「不重开甲路」裁定目前只落在实现票 SPEC。`docs/architecture/implementation-readiness.md`
   `PI-BOUNDED-SITE-1` 行仍待清账/架构会话核销，与「实现会话不改中央就绪图」的纪律一致。

验收提交除本节 `ACCEPTANCE.md` 外无文件改动，不做 `fix-by-acceptance`，不更新
`current.md`/readiness，不 merge/push。
## PI-TEST-WAITER-1 · 独立验收（2026-08-09，REJECT）

对象：`claude/pi-test-waiter-1@9883f3c`（base `main@f96937c`；`git rev-parse 9883f3c^` = `f96937c`，
直接子关系已核）。验收树 `/private/tmp/courtwork-pi-test-waiter-1-accept`，分支
`claude/accept-pi-test-waiter-1`，零共享上下文。本结论不采信实现回执数字，所列读数一律本树实跑。

**结论：REJECT。** 拒因一枚，决定性：三处调用点里的第一处 `waitForTraceLength(1)`
**消灭了它所守护那枚断言的区分力**。票面点名的反例（「只把赌注换个地方且更难归因」）在此处以更重的
形态发生——赌注不是被搬走，而是连同观测窗口一起被撤掉，用例对其所刻画的性质从此恒绿。

### 一 · 范围核（通过）

`git diff f96937c..9883f3c --stat` 恰两文件：`packages/pi-lane/specs/PI-TEST-WAITER-1.md`（新增 164 行）
与 `packages/pi-lane/src/workspace-write-env.test.ts`（+55/−4）。生产源码零触碰；`package.json`
与 lockfile 零改（零新依赖）；三处 `expect(...)` 期望值字面量逐字未改。改后全文件 `setTimeout` 恰两处：
等待器自身上界（`:101`）与 `:977` 的有意延迟注入——原 `settle()` 裸墙钟零残留。范围合票。

### 二 · 等待器形核（机制通过，用法见第三节）

机制本身成立：`write()` 在同步 `trace.push` 之后立即 `notifyWaiters()`，属事件驱动而非轮询；
默认上界 3000ms 小于 vitest 5000ms 缺省超时；超时错误携带当时实际 `trace`。
**上界与诊断经本树活体实测坐实，非读码推断**——对调用点二注入「强制串行」变异（两次调用改共享同一 env）后：

```
Error: waitForTraceLength(3) 在 3000ms 内未达标；实际 trace=["enter:a.md"]
Duration  3.41s
```

调用点三（binder 面，第二件改为串在第一件之后）复现同形态的红。
**两枚 `waitForTraceLength(3)` 区分力完好**：它们等的是**正向终态**，被刻画的性质若不成立，
轨迹永远到不了 3，等待器超时报红且报对理由。

### 三 · 拒因：调用点一的区分力塌陷（决定性）

`waitForTraceLength(1)` 守护的断言是一枚**否定命题**——「第二件被 mutation queue 挡在门外，
所以此刻只有一条 enter」。而 `trace.length >= 1` 这个信号**并不蕴含**该否定命题：
判例要求的「信号在则前置必在」在此处不成立。轨迹长度达到 1 的那一刻，
正是第二条 enter 是否会到来尚未见分晓的那一刻；等待在此终止，等于把断言要观测的那段窗口整个撤掉。

对照实验（唯一变量＝被刻画性质在否；等待器与断言字面量均不动）：把该用例第二次调用的 `env: shared`
换成一枚独立 `createWorkspaceWriteEnv`，即令「共享 env ⇒ 按 canonical path 串行」这一被刻画性质
**不成立**（同文件次枚用例正是该事实的在册证据）。两臂读数：

| 臂 | 等待形态 | 结果 |
|---|---|---|
| 对照（`main@f96937c` 原形） | `await new Promise((r) => setTimeout(r, 20))` | **红**：`expected [ 'enter:a.md', 'enter:a.md', …(1) ] to deeply equal [ 'enter:a.md' ]` |
| 实验（本单交付） | `await port.waitForTraceLength(1)` | **绿，10/10**（顺序单跑十轮，逐轮 EXIT=0） |

再取实际值坐实（把期望值临时换成哨兵字面量，令报错吐出真实轨迹，验后即复原）：

- 等待解除那一刻，实际 `trace` = `['enter:a.md']`——与串行成立时**逐字同形**，不可分辨；
- 整趟 `Promise.all` 之后，实际 `trace` = `enter,exit,enter,exit`——恰好是**串行成立**时的期望终态。

即：该用例的**两枚断言同时被一个并不串行的系统满足**。它已不再刻画「上游按 canonical path 串行」，
只是在测量微任务排队次序。文件头把这一族明确标为 characterization——锁
`@earendil-works/pi-agent-core@0.82.1` 现状、升版行为若变须触红——该职能在此处已经失效。
塌陷是结构性的而非环境性的：等待经微任务链在同步 `trace.push` 之后即解除，次序确定，与负载无关。

回执 §一表格把结论写成了前提：「第二件被队列挡在门外，`trace` 终态锁定在 `['enter:a.md']`，不会再长」。
这句话正是本用例待验的命题本身，却被当作选择等待长度的依据；循环由此成立，区分力塌陷是其直接后果。

同批登记一条供返修的定性：调用点一的原 `settle(20)` **身兼两职**——既「等前置」，
又「撑开可观测违例的窗口」；后者与 `:977` 的 5ms 属同一族（有意的延迟注入）。本单只置换了前一职，
把后一职一并删去。返修须把两职分开处置，不得以再次调整等待长度了事。

### 四 · `:971` 处置核（通过）

判「有意的延迟注入、随本票不改」成立，且经实测而非仅凭读码：该用例唯一的
`expect(port.trace).toEqual([...])` 挂在 `await agent.prompt('写两份')` 整趟 resolve 之后的四元终态，
不依赖这 5ms 是否够用。回执宣称「值本身可以是 0 也可以是 500，结论不变」，本树逐值复跑坐实：

| 注入值 | 结果 |
|---|---|
| `0` | 1 passed |
| `5`（现状） | 1 passed |
| `500` | 1 passed |

新增六行中文注释把该核定固定在场，满足票面「二选一、不得悬置」。此项接受。

### 五 · 负载与对照独立复跑（通过）

本机 8 核。按票面在**验收方自行注入的负载**下复跑，负载形态取「同文件 20 路 vitest 进程自争用」：

| 臂 | 负载读数（`uptime` 1m，跑前→跑后） | 结果 |
|---|---|---|
| 变异（三处撤回 `setTimeout(resolve, 20)`；改动带命中校验：剩余调用点 **0**、注入点 **3**） | 2.25 → **11.13** | **3/20 红**（run3 / run10 / run11） |
| 交付（`waitForTraceLength`） | 8.95 → **15.36** | **20/20 绿** |

三枚红的报错为 `expected [] to deeply equal [ 'enter:a.md', 'enter:a.md', …(1) ]`（两枚）
与 `expected [] to deeply equal [ 'enter:a.md' ]`（一枚），指向票面点名的同两枚用例。
**复现条件在本树独立取得**，红绿两方向同批产出，判例「对照实验须能同时产出红与绿」满足。
实现自报 2/20 与本树 3/20 属同一量级；比例不可移植一节回执已如实声明，接受。

无负载对照：单文件单跑 `Test Files 1 passed / Tests 100 passed`，436ms，EXIT=0。

**须与第三节合读**：本节只证「原塌红的那枚墙钟赌注确已消失」，不证「消失的方式正当」。
调用点一恰是靠**恒绿**取得的这枚绿。

### 六 · 回归与门禁（通过）

| 门 | 命令 | 读数 |
|---|---|---|
| sidecar 前置 | `build:product-sidecar` / `build:headless-sidecar`（先清 `dist`/`dist-sidecar`） | EXIT 0；`bundle.bytes` **547893** / **555314**（与回执逐字节相符） |
| 包级·前 | 基线文件回灌后 `vitest run --root . packages/pi-lane/` | **17 files / 553 tests passed**，EXIT 0 |
| 包级·后 | 同上，交付态 | **17 files / 553 tests passed**，EXIT 0 |
| 构建 | `pnpm -r build` | **EXIT 0** |
| lint | `pnpm lint` | **EXIT 0**，零诊断输出 |
| 根测试 | `pnpm test` | **EXIT 0**，**170 files / 1941 tests passed** |

净增 0／净减 0；`it(` 字面量前后同为 40。票面「约 540 枚」与实测 553 的出入：回执归因为票面撰写时点的
引用数已被其后新增文件超出——本树以**同树前后对照**（而非与票面数字相减）锁定净变化为零，口径正当，接受。
desktop 行为零变更，未跑 Playwright，合票面范围。退出码一律以 `cmd > log 2>&1; echo $?` 读取，未经管道吃码。

### 七 · 偏离逐条裁定

1. **改事件驱动而非轮询** —— **接受**。较轮询更贴「派生信号」本意，且不引入次级墙钟。
2. **等待器挂 `RecordingPort` 而非模块级 helper** —— **接受**。需访问 `recordingPort()` 闭包内的
   `trace`/`waiters` 私有态，替身本身不进生产，未越「只改该测试文件的等待器与其调用点」边界。
3. **`:971` 核定为有意延迟注入并加注释** —— **接受**，理由见第四节（已独立实测，非仅采信回执）。
4. **首轮负载注入无效（0/10）如实登记、改换负载形状** —— **接受**。此即判例「不复红说明负载注入无效，
   须先修注入再判」的正确执行；登记留痕的做法本身值得沿用。

四条偏离全部接受。**本单被拒不因任何一条偏离**，而因第三节的区分力塌陷。

### 八 · 观察项

1. 返修若沿用 `waitForTraceLength`，须为调用点一另找一枚**正向可观测量**支配该否定命题，
   或按第三节末段把「等前置」与「撑开违例窗口」两职分开；单纯把长度参数调大或调小都不解决问题。
2. 本次拒因的通用形态建议入 `workflow.md`：**否定断言没有正向派生信号**——「等到期望长度」这一改法
   对「不会再多」这类断言天然不成立，等待的终止点恰是观测窗口的起点。与在册「异步前置不赌时长」互补，
   防下一位按同一模板改出同族恒绿。
3. `waitForTraceLength` 的快路径与 `waiters` 清理逻辑本身无缺陷，两枚长度 3 的调用点亦已实证正当，
   返修可整体保留，不必推倒。

验收提交除本节 `ACCEPTANCE.md` 外无文件改动；不做 fix-by-acceptance，不改实现，不更新
`current.md`/readiness，不 merge、不 push。全部临时探针文件与变异均已复原，提交前
`git status --porcelain` 仅本文件。
