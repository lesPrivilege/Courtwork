# Release 门与证据审计

审计时间：2026-09-14（Asia/Singapore）。审计基线 `codex/release-final-20260913`，初始 HEAD `f937c98a86b794b79e4b363c19ca56c4cebe39f9`。本报告仅整理证据，不签署最终 Release 接受。

## 裁决摘要

首个本地产品 Release 仍未放行：G1 有历史真实模型路径但没有当前候选上的真实路径和已观察取消；G2 的最新真实模型候选仍待人审；G3 尚无该正式决定后的同 Matter 新 Session 接续；G4 没有当前闭环的 2–4 分钟演示；G5 仍需把公开产品事实与选定来源版本逐项对齐。Coding dogfooding 是用户指定的先行目标，尚未按“模型读、改、经 Host 执行测试、人审、重开接续”完成；它不是新增的 G 门。

这不构成所有 Pages 发布的禁令。原始门契约允许以准确的 experimental 口径继续迭代页面，但不能称完整工作闭环已完成（`engineering/execution/2026-09-08-main-round/public-readiness.md`）。因此，既有 source-preview 或明确为虚构/示例的商业页面可以单独发布，只要保持来源、预览和示例身份准确；任何声称本次真实候选已获接受或同 Matter 已连续完成的文案仍受 G2/G3 约束。此裁决沿最近的 Astra 路径：`engineering/release/review-intake-2026-09-13/README.md` 的“可 Release 节点”“Release 前串行筹备增量”及其所引用的既有 G1–G5，而非把旧的 open 状态泛化成一切发布暂停。

## 源码身份与已验证范围

- 当前测试身份是 `83df385c36c951ffbc801a5c54bde79746ce7677`（`evidence/spark-agent-20260913/source-identity.json`）。工作树 HEAD `f937c98` 是其文档/证据后代，`git rev-parse 83df385:app` 与 `git rev-parse HEAD:app` 相同，`git diff 83df385..HEAD -- app` 为空。故最新产品测试覆盖当前 `app/` 字节；若最终合流改变 `app/`，需按差异范围重验。
- `evidence/spark-agent-20260913/checks/product-83df385.log` 是 `npm --prefix app run check:product` 的 Node 22.19 结果：1002/1002，包含45项历史 commit/path/hash 校验、并发4测试、local-fake runtime smoke 和6,879个文档链接；独立五项 UI 检查见同目录 `merged-{colors,contrast,interaction,materials,shapes}.log`。smoke 明确 `realProvider: not_run`。这是当前源码组合的合成回归，不是人机工作闭环或真实模型结果。
- 本报告加入后另运行 `node tools/check-doc-links.mjs`，通过 1,239 份文档、6,884 个链接；不重标为 83df385 全量产品测试的一部分。
- 迁移/恢复的合成覆盖已随当前 suite 保留：Core3/app4→Core4/app5、Host schema14→15原字节备份/旧 Host 拒读/分目录恢复（`app/tests/subagent-migration.test.mjs`），以及大量 SIGKILL/unknown/recovery 用例。Spark 的 `checks/followup-d4a3153.log` 另有16/16，含 child Run SIGKILL 后不重放。旧 `evidence/release-preflight-20260913/recovery-results.json` 的65/65与GUI重开回执则固定在 `01f37f09b3b11d5c317ab9d45d31d1f9a87766ee`，证明 Host3–12→13、Core3/app4→4/5 的旧矩阵及 Local test 路径，不应改称最终候选端到端迁移验收。无须重复整张旧矩阵；最终回执只需明确复用当前 suite 对应的 owner/schema 范围。
- 父线程报告最终隔离树 `npm ci` 成功（244 packages、0 vulnerabilities）。将该日志与最终候选 SHA、Node/OS、lockfile 绑定后复用即可；若最终 `app/` 发生变化，再执行 `npm --prefix app ci && npm --prefix app run check:product`。

## G1–G5 与 coding dogfooding

| 项目 | 已证事实 | 真正未闭合处 |
|---|---|---|
| G1 真实运行 | `evidence/release-readiness-20260913/README.md` 固定了六个 Run 记录：普通回复、精确 deny、批准写后读、一次过快完成的取消尝试、Host 初始化失败、NDA 候选提交。除 Run5 外其余记录有真实 DeepSeek 路径；Run5 为0 token/0 turn，没有 Provider 请求。Run4 未观察到取消。Run6 5 turns，在合成 NDA 来源上提交候选。更早的 `engineering/release/harness-implementation-2026-09-12/evidence/live-deepseek/README.md` 是另一组旧候选证据，不能与这六个 Run 合并成同一基线。 | `live/run6-summary.json` 的 `source_sha` 是 `cb5ca683…`；当时最终集成为 `9eece81…`。`source-equivalence.json` 只给出该两版间有限路径关系，而当前 `83df385` 又改变过 service/store/runtime，故不能把旧真实运行升级为当前候选证据。当前候选仍需一条真实模型/工具路径；取消未观察必须如实标注，确定性取消/故障已有合成回归。 |
| G2 正式决定 | 当前运行屏幕能看见实际生成候选和四项依据；`evidence/release-readiness-20260913/live/run6-summary.json` 有确切 candidate ID、source checks 与 `candidateStatus: pending`。旧 `release-preflight` GUI 已证明 Local test 下的候选/决定/Artifact API/UI 路径。 | Run6 `decisions: 0`，没有 Decision/Artifact。旧路径由确定性 `buildReview` 预生成 domain，不能替代人的真实 Review。正式 Release 要求真实候选经用户接受、退回或补证；若公开声称完成接受路径，必须有合法 accepted Artifact。 |
| G3 连续性与界面 | `evidence/release-core-summary-20260913/README.md` 记录待审摘要发现性、键盘返回、合成 Accept 后同 Matter 新 Chat 读取相同 Artifact；`release-preflight` 还验证 Local test 结果在正常重开前后不变。 | 这些是旧候选的合成路径。要闭合本次产品 Release，须在人做出真实 Review 决定后，用新 Session 检查同一 Matter 的正式结果、来源依据和未决事项；不能以当前 pending 候选或原 Chat 历史代替。 |
| G4 演示 | 当前网页浏览器、截图和历史媒体均保留各自 SHA。 | 尚无本候选的2–4分钟闭环录像及非作者核对。旧媒体不重标为新候选实录。 |
| G5 公开事实 | `evidence/release-preflight-20260913/public-facts.md` 已整理事实—文案映射；当前 `app/docs/supported-preview.md` 明确 Local source preview、固定 Pi 0.85.1、合成材料/模型边界，并明确当前没有 agent-invoked repository test runner。 | 该映射固定在 `01f37f0`，没有 G5 签署。`site/src/source-preview.json` 当前指向 `9eece81`（它是 `83df385` 的祖先，故是有意的旧版 pin 也可能成立，但不能称当前版本）；`site/release.json` 是明确固定于 `9e5384f` 的历史证据快照。发布 source-preview 时，选择并标明实际 pin，校验该 pin 的安装与文档；G5 产品声明/简历消费仍由对应 owner 完成。私人简历没有在本审计中读取或修改。 |
| Coding dogfooding（用户指定先行） | `engineering/release/harness-implementation-2026-09-12/evidence/dogfood-first/README.md` 记载两次真实模型对合成 helper 的诊断/修复输出、授权写入和人工独立测试；原版红6/8、修复绿8/8、oracle 1,750均由验证者运行。Spark 候选则是 deterministic fake provider。 | 旧 dogfooding 明言模型没有执行测试；当前 source-preview 也明确无 agent-invoked repository test runner。按 `engineering/research/spark-explore-2026-09-13/README.md` 的既定接收判据，尚需真实模型读取授权代码、产生精确 diff、经 Host 固定 recipe 执行测试并保存退出码/Run/call回执；人审 diff 后重开接续。只在这个 coding 场景需要 agent 自行测试时启用既有 DF-04 条件项，不扩成任意 shell/新 G 门。 |

六个历史 Run 中 Run5 不是 Provider 调用，Run4 不是取消通过，Run6 也不是产品接受；因此不能将“六次历史”写作六次成功 Provider 测试或当前 Release 通过。此审计未调用真实 Provider、未读取凭据或私有 mutable data。

## 最多七项收口清单

| # | 动作及精确位置 | 必要命令/数据类型 | 人的判断 |
|---|---|---|---|
| 1 | 冻结最终产品 SHA，确认 `app/` 是否仍等同于 `83df385`；把父线程 `npm ci` 日志连同 Node/OS/lockfile 和 clone SHA 记录到最终 receipt。 | 若 `app/` 未变，复用 `product-83df385.log`；若有代码变化，在干净 clone 执行 `npm --prefix app ci`、`npm --prefix app run check:product`，再按 `app/README.md` 的命令在全新仓外 data dir 启动。全部合成；不能读取旧用户目录。 | 不需产品接受；非作者核对 source/test 身份。 |
| 2 | 在同一最终候选上补 G1 缺口，证据写入 `evidence/release-readiness-20260913/` 的后续轮次，不覆写旧 Run。 | GUI 配置已授权 Provider；`npm --prefix app start -- --data-dir <独立仓外data-dir> --port 0`。只验证当前候选的一条真实模型/工具路径及其重启可检查性；沿现有 synthetic suite 验故障和取消。旧F3计划的六Run上限已用完，不得把它默认为新预算。 | 用户需通过GUI配置/授权连接；取消若再次过快则记未观察，不由操作者伪签。 |
| 3 | 在当前真实候选上完成 G2/G3：审阅 Run 产生的确切 candidate，记录 Decision/Artifact 或退回/补证，再新建同 Matter Session，核对结果、来源、未决和键盘路径。对应 API/UI 见 `app/docs/work-review-summary.md`、`app/docs/first-work.md`。 | 真实模型产生 candidate；新 Session 及断线/重开状态检查用同一合成 Matter/来源，不重新注入答案。命令同 #2，不再增加无合同的 Provider 矩阵。 | 必需：正式 Review 必须由人作出；若选择退回/补证，就继续到支持声明对应的真实终态，不强行接受。 |
| 4 | 完成用户优先的 coding dogfood；消费 `engineering/research/spark-explore-2026-09-13/README.md` 与 `engineering/release/harness-implementation-2026-09-12/harness-dogfooding.md` 的既定合同，不另派泛化 Runtime/新门。 | 独立工作目录复制 `original.mjs` 与 `pagination.test.mjs`（源于 `engineering/release/harness-implementation-2026-09-12/evidence/dogfood-first/`），把原版放为 `pagination.mjs`；Host 固定 cwd/白名单后运行 `node --test pagination.test.mjs`。留红绿、实际 diff、命令/退出码及 Run/call 回执。模型需实际执行，人工复测只能做对照。 | 必需：人检查 diff 与测试边界；真实 Provider 使用按新授权预算执行。若目标要求 agent 自行测试，DF-04 需先提供受控 recipe；不是任意 shell。 |
| 5 | 完成 G4，记录到当前候选的发布证据目录；沿用 `evidence/release-preflight-20260913/live-probe-plan.md` 的2–4分钟顺序。 | 同一候选真实 UI、合成来源与实际 Review/Artifact；记录 SHA、data kind、provider mode、媒体 hash。不需要为录像重跑模型。 | 必需：非作者检查媒体与证据身份。 |
| 6 | G5 与独立产品 Release 决定：核对 `site/src/source-preview.json`、`app/docs/supported-preview.md`、`README.md`、`site/src/copy.mjs` 及实际构建；对 source-preview 明确保持 `9eece81` 历史 pin，或改到最终候选；不要把 `site/release.json` 历史快照当本次接受。 | Pages 构建/链接沿 `.github/workflows/pages.yml`：`node site/build.mjs`、`node site/scripts/check-links.mjs`；无 Provider。仅发布不含完成态产品声称的既有虚构/商业页面时，G2/G3不是阻断；有工作闭环/真实模型能力声称时逐条映射 G1–G5。 | 必需：产品公开事实/简历由各自 owner 审核；本审计不改简历。 |
| 7 | 对最终产品 Release 的共用 SHA、覆盖范围、失败/未决清单形成非作者结论，再由主 agent 按授权决定合流与发布。 | 仅整理 #1–6 的证据；不新增广泛测试。 | 必需：非作者接受；作者和合流人不自签独立验收。 |

#2–5是首个产品 Release 的收口项；它们不阻止准确发布现有静态/虚构 Pages 或固定版本 source-preview。若只发布这些页面，仍须在 #6 核对页面文案、下载 pin 与该版本内的运行说明。

## 明确后置，不应重加为本次 Release 门

按 `engineering/release/review-intake-2026-09-13/README.md` 的裁决，第二 Runtime/DRT-03、完整 Core-free composition root、多租户/广义治理、任意插件安装器/市场、热插拔、OAuth/stdio、Host slash/manual compaction、完整全平台/原生 AppKit/VoiceOver 矩阵均属后续或按具体公开声称触发。DF-04 对普通合成 NDA Release 非默认前置；本轮只有为用户要求的 agent-tested coding dogfood 才需要有界 recipe。旧的65/65迁移矩阵、P05/P06与DF-06组合回归、932/932旧候选和六次Provider历史分别保留原边界，不重命名为新门，也不要求无差别重跑。

## 推荐发布范围

若此次发布目标是既有静态/虚构商业 Pages 与 local source-preview，可按该面独立推进：保持示例身份、local-only和精确源码 pin；不说真实候选已获接受或本轮完整闭环已验收。当前支持文档已限制声明为固定 Pi 0.85.1、本地 source preview 和合成 NDA 工作流边界。若目标是宣告首个 Courtwork 工作产品 Release，则只支持一组固定 Pi 能力与一个合成 Inbound NDA 工作流，必须先关闭上述 G1–G5；不要顺带宣传通用 coding runner、第二 Runtime、任意 extensions 或 Spark 的广泛治理能力。
