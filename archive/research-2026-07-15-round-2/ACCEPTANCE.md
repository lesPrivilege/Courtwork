# Round 2 文档基线独立验收

- 验收对象：`8560faf78fb3312a78d61f5306f43b19bc238678`
- 验收分支：`codex/accept-round2-docs`
- 独立 worktree：`/tmp/courtwork-accept-round2-docs`
- 验收日期：2026-07-15
- 结论：**修复后放行**

## 独立性与范围

验收从目标提交新建 clean worktree，不复用实现工作树、dev server 或实现自述。完整读取 `CLAUDE.md`、`AGENTS.md`、`docs/engineering/workflow.md`、目标提交改动的全部现行文档、Round 2 归档 README，并对 R1–R6 与源码/既有 ACCEPTANCE 的关键结论做交叉核验。

`git diff-tree --name-only -r 8560faf` 共 18 个文件，全部是 `.md`；没有源码、schema、配置、站点或制品改动。

## 原始报告与归档隔离

- R1–R6 六份归档报告逐份与 Claude 原始输出执行 `cmp`，结果 **6/6 byte-identical**。对应 SHA-256 为：R1 `f93b48ec…d06a2`、R2 `8ffc3651…df1d`、R3 `ca9fd728…9a16`、R4 `dc7617ca…152c`、R5 `f687f915…f4fd`、R6 `c2f3bbad…44fd`。
- Round 2 目录只含 README、R1–R6 与本验收报告；A–F 仍只在 `archive/research-2026-07-14/`，未重复摄入。
- Round 2 README 明示低权威、基线不统一、R4/R5/R6 校正及现行承载位置。现行文档没有到该目录的 Markdown/代码消费边。

## 状态真值与源码抽核

`docs/status/current.md` 已把事实拆成产品 live、包/契约、demo、外部兼容与发布五类，未把 package/demo/released 自动升级为 product-live。抽核结果：

- Chat：`process-upload.ts` 会产生 `readingMarkdown`，但 `App.tsx` 的 `handleChatSend` 只把正文或 `（附文件）` 送入 `sendChatTurn`，附件内容确未进入请求。
- Work：`WorkCommandPort` 的 production 非测试命中只有 `apps/desktop/src/protocol/client.ts` 的接口声明；`main.tsx` 注入 `createDemoWorkFixture()`，没有 production command/store/material/binding。
- 新案件：`createCase` 写入 `folderPath: undefined`；`resolveCaseRoot` 对非 demo 无回退，因此 case root、材料入口和 output 写入不可达，未伪称 live。
- 身份：`App.tsx` 仍硬编码 `{ channelId: 'desktop', actorId: 'local-user' }`，文档只把它列为未装配 identity dependency。
- 运行预算：`createGuardForCall` 在每次 `runScenario` / `resumeScenario` 新建 guard；`RuntimeLimitExceededError` 仍直接上抛，没有跨 leg 持久累计和 `scenario_failed` 终态映射。
- output：源码确会清空 replace 段落子节点（丢 `w:pPr`）、全局重写所有 run 字体、覆盖 `comments.xml` 并重复追加 rel/content-type、忽略 `paragraphHint`；desktop 只取 `docx`、丢弃 `outcomes`。SPEC 没有把这些缺口写成已成立。
- ingest：Legal 三类导出实际位于 `packages/legal/json-schema/`；公共 SourceAnchor 的两个跨字段 refine 仍须在 Python 侧等义实现。服务当前只有 SPEC，未伪造 HTTP/progress wire。

## 契约与路线闭合

- ADR-010 的 `WorkCommandOutcome` 为 `completed | paused | failed | canceled | rejected` 闭集；`rejected` 原因与 first-wins、case busy、scope、未装配文字逐一对应。callback port 明示仅限同进程，跨进程 wire 延后另立 ADR。
- `runtimeBudget` 同时冻结 limits、版本化 `costBasis` 和跨 leg `consumed`；unknown cost 不能当零。v1 明确 whole-envelope CAS、单机单写者、测量先行，不把 CAS 冒充协作。
- `MaterialRef` 保持 source-neutral、opaque 且不携绝对路径；每笔 effect 必须先有匹配 scope/actor/input 的持久授权，后置 gate 不能追认既有副作用。与 ADR-005/007/009/011 无冲突。
- roadmap 只定义 Stage 0–4 的进入、交付、退出和禁止抢跑；当前阶段只在 current 登记。实现就绪图只定义成熟度词表、工单依赖和退出证据，不再复制能力快照。
- `OUTPUT-CORRECTNESS-1` 可与 Work store/material/binding 并行，但明确必须在 `WORK-LIVE-1` 退出前放行；Stage 0 的确认到 docx 终链没有遗漏。

## 验收中修复

独立验收发现并以 `01db249`（`fix-by-acceptance: keep round 2 document authorities singular`）修复三类文档实现问题：

1. 删除 implementation-readiness 的当前能力副本，把 Stage 0 当前态只留在 `status/current.md`；roadmap/vision 不再成为第二状态真源。
2. 明确 `OUTPUT-CORRECTNESS-1` 是 `WORK-LIVE-1` 退出前置。
3. 把 output 人工清单从“未触碰 run 也必须补字体”改为“只校验新写入/触碰 run，未触碰 `w:rPr` 原样保留”，与新 SPEC 和实际缺陷一致。

以上均为现行文档组织或验收清单校正，没有改 schema/ADR 字段语义。

## 实跑证据

最终 tip 实跑：

- `pnpm site:guard`：exit 0；Node guard **31/31**，release truth 为 app/site `0.1.2` 与 DMG SHA `f4af2a…e83d`，deslop 扫描 **691 active text files**；desktop neutral/elevation/signature/motion 四门全绿。
- 活动 Markdown 本地链接扫描：**118 files / 148 local links / 0 broken**。扫描排除 archive，并兼容仓库既有 `path:line` 与 repo-root 记录体例。
- `git diff --check`：exit 0。
- 发布事实独立核验：annotated tag object `0c998d45…f084` 解引用到 `2fe8bf54…cbd3`；`release/DEPLOYMENT.md` 的版本、DMG 大小/SHA、Pages、ad-hoc/未公证边界与 current 一致。

实际反例注入并恢复：

1. 在 `docs/status/current.md` 注入到 `../../archive/research-2026-07-15-round-2/README.md` 的真实 Markdown link，`node site/scripts/deslop-scan.mjs` exit 1，精确报 `[archive-reference] docs/status/current.md:3`；撤除后 deslop 恢复通过。
2. 注入 `../architecture/definitely-missing-round2.md`，活动 Markdown 链接扫描 exit 1，精确报 **1 broken / 146 local links / 118 files**；撤除后恢复 0 broken。

本轮没有产品源码或运行行为变更，因此未启动 Playwright、Word/WPS 或全仓 build/test；验收门限按工单明确要求执行文档、归档、发布与 site guard。

## 放行结论

目标提交加验收修复后，Round 2 文档包满足：现行权威链单一、归档低权威且不可消费、状态与路线分责、关键源码事实不过度声称、下一批依赖和实验门可执行。**允许合入 main。**

## 根治理续行补丁独立验收

- 基线：`cef954acf280c74cde02c6de7e91285e9e1a9caf`
- 最终实现对象：`7c9ae1cb77ed6f8a67b359924e0bf53be3836954`
- 验收修复：`e795851ef994efa44fada6d001bb594079d3cd1b`
- 验收分支：`codex/accept-governance-handoff`
- 独立 worktree：`/Users/lesprivilege/Projects/Courtwork-accept-governance-handoff`
- 验收日期：2026-07-15
- 结论：**修复后放行**

### 独立性与权威入口

验收从最终实现对象新建 clean worktree，不复用实现工作树或实现自述。完整读取并交叉核对 `CLAUDE.md`、`AGENTS.md`、`docs/engineering/workflow.md`、`docs/README.md`、`docs/status/current.md`、`docs/architecture/implementation-readiness.md`、`docs/product/roadmap.md`、Accepted ADR-001/006/009/010/012、`services/ingest/SPEC.md`，以及 registry、Legal/PM package、desktop host renderer 与 Work command port 的实际源码。

根治理现在能让下一架构角色仅凭仓库完成续行：先验证工作树、HEAD 与 `main`，再按固定顺序找到 `current.md` 的唯一能力/发布状态、implementation-readiness 的唯一开工依赖图、roadmap 的阶段条件和 ADR/SPEC/ACCEPTANCE 的契约及证据。`CLAUDE.md` 保留跨会话架构不变量，`AGENTS.md` 只补角色、派单、接手和提交纪律；两者没有复制 Round 2 当前工单、能力数字或发布快照。

### 契约与源码交叉验证

- 垂类包只在 data plane 声明 schema、scenario、词表、`presentation` 与 `uiTemplateId`；`VerticalPackageBindings` 仍只含进程内 schema/migration。可执行 React/projection blueprint 实际只登记在 desktop `HostRendererRegistry`，与 ADR-009/012 和根总纲一致。
- `packages/legal` / `packages/pm` 的 `presentation`、`package`、`domain` 体例与根边界相符；descriptor 没有注入 JSX、CSS、函数、endpoint 或 vendor client。企业 adapter 仍只允许未来有真实需求时进入垂类 `/runtime`。
- `services/ingest` 当前只有 SPEC；其中 HTTP、队列和 progress 明示为 W8 目标，尚无版本化 wire。根总纲已撤回“通过 HTTP 集成”的过度声明，只保留 Legal JSON Schema 输出边界。
- scheduled/webhook 仍是未来能力，必须先由新 ADR 拍板 identity、trigger、幂等、累计预算与 effect authorization；没有把 trigger-blind executor 升格为支持证据。
- `released`、`demo-integrated`、`package-ready` 均没有被写成 `product-live`；统一成熟度枚举只在 implementation-readiness 定义，事实只在 `current.md` 更新。
- ADR-006 的早期“renderer 由包提供”概括由更高层根总纲及细化它的 ADR-009/012 收窄为“包提供声明，宿主持有可执行 blueprint”；现行源码也只实现后一边界，不构成双实现。

### 验收中修复

原实现将“现有 port”整体称为进程内 callback，可能误涵盖 `HostTransportPort` 等其他边界。验收以 `e795851`（`fix-by-acceptance: narrow callback port wording`）把表述精确收窄为 ADR-010 已定义的 `WorkCommandPort.publish`；该字段是同进程投影 callback，不是 IPC、HTTP 或 gateway wire。此修复只消除文字歧义，没有改变字段或契约语义；无 `[需架构拍板]` 项。

### 实跑与反例证据

最终验收 tip 实跑：

- `git diff --check`：exit 0；
- `pnpm site:guard`：exit 0；Node guard **31/31**，release truth 仍为 app/site `0.1.2` 与既有 DMG SHA，deslop 扫描 **691 active text files**，desktop 四项视觉静态门全绿；
- 活动 Markdown 本地链接独立扫描：**118 files / 148 local links / 0 broken**，排除 `archive/` 并兼容仓库既有 repo-root 与 `path:line` 体例；
- `pnpm -r build`：13 个可构建 workspace 全通过；desktop 仅有既存动态/静态 import 与 chunk-size warning；
- `pnpm lint`：exit 0；
- `pnpm test`：**131 files / 1127 tests** 全通过。

实际向 `site/index.html` 注入到 `archive/should-never-be-authority.md` 的链接后，`node site/scripts/deslop-scan.mjs` exit 1，同时报 `active site references archive` 与 `[archive-reference] site/index.html:2`；撤除反例后恢复为 691 个活动文本文件全绿，`site/index.html` 无残留差异。

### 放行结论

根治理补丁把“长期不变量”和“续行操作”分责清楚，并以 repo 内唯一状态真源、唯一开工图和既有契约层级闭合下一架构师的接手路径；没有把归档、调研或聊天提升为权威，也没有把未实现边界写成 live。验收文字修复后，**允许合入 main**。
