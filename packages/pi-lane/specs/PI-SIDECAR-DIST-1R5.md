# PI-SIDECAR-DIST-1R5 · R4 evidence-truth 闭口回执

状态：待实现。

权威契约只认父级 [`SPEC.md`](../SPEC.md)「并行相邻票与合流门」、
[`ADR-022`](../../../docs/decisions/ADR-022-pi-lane.md) 六-E 与
[`implementation-readiness.md`](../../../docs/architecture/implementation-readiness.md) 同名行。
本文件只是本工单的独占实现回执，不得在这里改变 R2–R4 已冻结的来源、assembly、canonical
四层、双 execution domain、签名模式、库存、wire、deadline、路线候选或产品 signing plan。

R4 目标 `07d2dbc`（实现 `891c23d`）经独立验收判定 REJECT；验收树五文件约 1800 行的
未提交返修只作诊断输入，不能由实现会话接管、复制或代提交。实现须从当前架构 `main` tip
新建 clean worktree/branch，按父级 SPEC 顺取 R4 链及两枚 R4 提交，在 untouched R4 target
上自行取得 first-red。

只更新本回执和父级 SPEC 的七路径白名单；不改 toolkit/canonical fixture、其他
fixture/build/runtime 脚本、旧回执/ACCEPTANCE、父级文档、依赖、产品源码、Rust/Tauri 或 GUI：

- 架构锚点、十四枚 cherry-pick 逐枚 patch-id、两枚 ACCEPTANCE 架构移植的
  added-lines 逐字节对照、组合基线与 untouched R4 target SHA：
- 旧脏验收树零接管、零复制及实现起点 clean 证据：
- first-red A：跨架构 exact warning + 非零 exit、exit timeout/kill-confirm：
- first-red B：command timestamps 两副本同时缺失、全填同一 canonical UTC 常量：
- first-red C：preflight-only target 同步漂移：
- first-red D：full raw 非零/signal/error/security stderr 被摘要洗绿：
- first-red E：A/B physical cell 串格、run/actual-entitlements/nested `.app` raw 失败：
- ready 60,000 ms、`CRASH_DEADLINES.exitMs`、`killConfirmMs` 的显式状态与最终
  `timeouts:[]` / `{code:0,signal:null}` hard gate：
- 每条 canonical UTC、逐条 `start<=finish`、相邻 `finish<=start`、全轮首尾严格推进的
  command timeline：
- preflight-only 在发布 manifest/status 前执行 production-used hard verdict：
- preflight raw receipt membership、target/exit/signal/error/streams、四 gates、official
  identity、XML/plutil 与 Gatekeeper 重导及 summary parity：
- semantic role + subject + mode → 唯一 command occurrence/index、零跨 role/cell 复用，
  以及从 trusted stage root + 冻结 coordinate 独立构造 expected target：
- preflight/full hard verdict → final manifest/status 的唯一映射；producer 自报值只作 parity：
- full 六格的 stage root、subject/mode physical cell、sign/verify/display、launch、
  Node/SEA source、actual-entitlements、nested `.app` inner/outer/deep verify、spctl 与 run
  raw 真源闭口：
- 至少四枚 production mutation 的 applied 校验、定向红数、结构性等价项、逐枚恢复与最终
  source SHA：
- built seatbelt control 的 blocked execution-domain id、manifest path/SHA：
- 缺 sidecar build 混合态的 `probe_failed` execution-domain id、manifest path/SHA：
- 批准非受限域 preflight/full 六格的 execution-domain id、manifest path/SHA：
- 从空 assembly 的 verdict baseline→R5 增量、既有 76 counterexamples 全量、R5 新增反例
  另计、600 cold-start、双 cycle、十件 inventory/source 与六格 sign：
- `pnpm -r build`、`pnpm lint`、`pnpm test`、
  `pnpm --filter @courtwork/desktop lint:isolation-binding`、`git diff --check` 独立退出码：
- README 与原工程报告的 R5 追加、零路线建议、旧 `dist` 零回填：
- 实现提交、回执提交、最终 tree clean 与七路径精确改动面：
- 交付不可变实现 SHA 后待架构冻结的 `PI-SIDECAR-DIST-1R5-ACCEPT` target/允许面/反例/mutation：

实现提交先于回执提交，最终停在待独立验收。未获异会话 PASS 前，不 push、不 merge、不裁
sidecar 路线，不启动 `PI-HOST-LOOP-1` / DMG / Pages，不更新 `current.md` 或对外发布叙事。
