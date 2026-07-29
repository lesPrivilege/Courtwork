# PI-SIDECAR-DIST-1R3 · entitlements 四层证据返修回执

状态：待实现。权威契约只认父级 [`SPEC.md`](../SPEC.md)「并行相邻票与合流门」、
[`ADR-022`](../../../docs/decisions/ADR-022-pi-lane.md) 六-E 与实现就绪图同名行；本文件只是
本工单的独占实现回执，不得在这里改 canonical bytes、降低 execution-domain preflight、
裁 sidecar 路线或宣称发行成熟度。

实现会话从当前架构 `main` tip 新建 clean worktree/branch，顺取父级 SPEC 固定的十一枚提交；
冲突即停。只更新本回执和票面白名单，不改父级文档、旧回执或 ACCEPTANCE：

- 组合基线、十一枚 cherry-pick 与目标 SHA：
- 实现提交：
- `850fa11` exact `publishedPath` 修复保全与 mutation：
- 未改 R2 production 上的新增 first-red（逐具名判据）：
- Node v22.23.1 上游 tag/commit、签名脚本 blob、plist blob/632-byte/SHA-256 一手核对：
- 仓内 canonical fixture 的 exact path、`lstat`、bytes/hash、`plutil` 与六键全 true：
- 任意手写、历史 `dist/`、临时生成、extraction 替换与路径逃逸的反向锁：
- 以 `9ebb92a` 保存形状构造的受限域 `security_execution_domain_blocked` first-red /
  mutation；若本会话可真跑受限域，另附 physical receipt：
- 本会话实际 execution domain 的显式 id、独占目录、`--preflight-only` manifest path + SHA；
  只有同一进程/域 preflight 通过时才可生成正式签名读数：
- official Node 副本以 canonical input 重签后的 strict verify/XML 等义与
  `sidecar-fixture.mjs` bounded `ready → EOF → exit 0` control：
- official `/usr/bin/codesign --verify` receipt、display 的 exact Identifier/CDHash/
  TeamIdentifier/runtime flags/三条 ordered Authority，与 synthetic `.app` 的
  `/usr/sbin/spctl` exact exit 3 / rejected：
- XML 与 DER human-readable 双 extraction 的 argv/exit/signal/stdout/stderr bytes+SHA，
  严格解析与 canonical 逐值同义：
- 两候选 × 三姿势 exact matrix、逐格 canonical input path/SHA、签后 actual entitlements、
  strict verify/flags/launch：
- `/usr/bin/codesign`、`/usr/sbin/spctl`、`/usr/bin/plutil` 绝对 invocation、regular/bytes/
  SHA/Mach-O、`LC_ALL=C` 与 PATH-shim 反例：
- `host-tool-receipt.json` 的同轮 host/harness Node/tool/official Node 完整指纹，
  `preflight.json`/`sign-probe.json`/`manifest.json` 的路径、bytes/SHA 与不可覆盖证明：
- ready/EOF/kill-confirm deadline、超时清理与零裸 `await proc.exited`：
- source mutation 总账（含 applied 校验、红例数与恢复后 SHA）：
- 快速签名门通过后从空 assembly 的 203 verdict / 76 counterexamples / 600 cold-start /
  双 cycle / 六格 sign / runtime source 全量复跑：
- `pnpm -r build`、`pnpm lint`、`pnpm test`、
  `pnpm --filter @courtwork/desktop lint:isolation-binding` 独立退出码：
- 报告的零路线建议、旧 `dist/final` 零回填、实测/推论/blocked 分界：
- `get-task-allow` 仅为 upstream ad-hoc probe 控制变量，零流入 product signing plan：
- 新增概念及必要性、复杂度扫描与待独立验收项：
