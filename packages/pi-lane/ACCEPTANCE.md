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
  `specs/PI-WRITE-PROOF-1.md`；架构澄清涉及的 ADR/SPEC/readiness 三文档只作输入，不计实现越界。
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
