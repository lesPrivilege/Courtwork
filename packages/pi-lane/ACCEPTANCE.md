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
