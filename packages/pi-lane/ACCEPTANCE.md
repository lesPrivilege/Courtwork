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
成本须由 `PI-LANE-2` 实测，不能宣称已解决。

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
