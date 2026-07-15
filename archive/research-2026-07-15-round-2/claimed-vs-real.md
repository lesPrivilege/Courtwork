# R6 — 「已成立」清单：声称 vs 代码事实

审查对象：`docs/status/current.md`「## 已成立」清单（第 10–38 行，约 30 条）。
方法：逐条回代码，只认 `file:line`，不采信 ACCEPTANCE.md/SPEC.md 的自然语言叙述本身作为证据——叙述只作为定位索引，最终判据是我本人读到的源码。标 ⚠ 的地方是我基于强模式匹配做的合理推断，未逐行读全部证据链，如实标注。

---

## 0. 结论先行

**清单单条基本不虚，但清单的排布方式制造了虚高观感。** 抽查的 30 条里，约 24 条有可独立复核的代码证据（很多条背后是真实的变异测试：现场把攻击者 URL、伪造字段、CAS 版本号删掉，实测红灯，再恢复实测绿灯——这是我在其他项目审查中很少见到的严格度）。但清单把三类性质完全不同的「成立」并排列在同一个「## 已成立」标题下，不加区分：

1. **产品可用**（Chat 全链：provider → turn → journal → UI，真实可跑，本次独立验证）；
2. **包级契约成立、但产品零消费**（Work 侧几乎全部属于此类：`TURN-WORK-1`、`WORK-PORT-1`、`WORK-BROWSER-1` 背后的引擎代码是真的，但 `apps/desktop` 没有任何生产代码调用它们）；
3. **CLI 装配脚本证明逻辑自洽、但物理隔离在产品之外**（「demo 全链穿越」——`packages/demo-runtime` 是唯一装配点，且被 `package-boundary.test.ts` 机器禁止被 `apps/desktop` 或 `packages/core` 导入）。

团队自己在同一份文件的「## 当前架构债」和多份 ACCEPTANCE.md 里，对第 2、3 类都做了老实的免责声明（例如 `WORK-PORT-1` 验收结论原文明写「不代表 executor、durable store、material ingress、Tauri Work host 或 production live 已实现」，`apps/desktop/ACCEPTANCE.md:1482`）。所以这不是团队自证造假，而是「已成立」三个字的颗粒度太粗——**清单没有为读者标出"这条证明的是包，还是产品"**，导致「下一阶段优先序」的读者（包括提出本次审查的用户）容易把 Chat 的真实度错觉地泛化到 Work 头上。本审查额外发现一处清单本身完全没提到、但直接影响"真实律师今天能做什么"的新缺口：**Chat composer 里真实解析出的附件阅读内容（`readingMarkdown`）从未被拼进发给模型的请求**（见 1.5 与 4）。

---

## 1. 逐条判定表

### 1.1 清单前半：无工单号的基础项（第 10–17 行）

| 条目 | 声称 | 代码事实（file:line） | 判定 |
|---|---|---|---|
| schemas / registry / package ABI 与 namespaced artifact 基础 | 三层契约基础已成立 | `apps/desktop/ACCEPTANCE.md:1379`：VIEW-ABI-1 验收记录「composition root 实测同次准入 legal + pm，artifact registry 共 11 项；scenario registry 共 5 项且全部来自 Legal」——registry 准入是真实运行时行为，非文档自称 | **真实链路成立**（包/registry 层） |
| provider 无关 core、六段 harness、事件账本、确认续行与 runtime guard | core 具备这些能力 | `packages/core/src/turn/turn-runner.ts:22-48`（`TurnRunnerPort`/`createTurnRunner` 真实实现，非桩）；`packages/core/ACCEPTANCE.md:406-450`（CONFIRM-CAS-1：`resumeScenario` 的 CAS 语义现场变异测试通过，见 1.2 CONFIRM-CAS-1 行） | **真实链路成立**（core 包层；桌面消费面见 §2） |
| citation resolver，含受限重试与 coverage 剪枝 | 模型引语到系统坐标的解析器已成立 | `packages/core/src/citation/resolver.ts:1-40`：真实实现（9,519 字节，非桩），显式导入 `OutOfCoverageEntry`；`apps/desktop/ACCEPTANCE.md:1285`（CHAT-UI-1 验收：source-open 先验证 `file/version/range/quote slice`，删除 fileId 守卫后现场变红） | **真实链路成立**，且在 Chat 生产路径被真实调用 |
| legal 包、PM 第二垂类 schema 基础 | 两个垂类的 schema 基础已成立 | `packages/demo-data/ACCEPTANCE.md:3-12`（PM-FIXTURE-1 原文：「没有旧 npm alias、第二份 schema、scenario、prompt、PriorityScore、live harness、企业接口、React/CSS 或产品 UI」） | **表述准确**——原句只声称「schema 基础」，团队自己在同一验收记录里说明 PM 无 live，未过界 |
| docx/md/txt/文本层 PDF 阅读视图与 docx 修订/批注管线 | 阅读视图与修订管线已成立 | `apps/desktop/src/composer/Composer.tsx:1,77,150-167`：Chat composer 默认用真实 `convertToReadingView`，`readFileBytes` 读真实 `File` 字节（非桩）；`packages/output` 917 行生产代码（既有硬事实，未重查明细，详见另一路 output 专项审查） | **真实链路成立**（转换层），但见 §4 新发现：解析结果不进入模型上下文 |
| web fetch 安全基线、受限系统文件动词与可撤销 FileOpsPlan | 三项工具能力已成立 | `packages/tools/src/web-fetch.ts`、`web-fetch-ssrf.ts` 等文件存在；grep 确认 `@courtwork/tools` 仅被 `packages/demo-runtime/src/{composition/demo-assembly.ts, acceptance/run-s3-real.ts, run-legal-demo.ts, run-s3-demo.ts}` 四个**非测试**文件导入，`apps/desktop/src` 与 `packages/legal/src` 零命中；`FileOpsPlanPanel` 确实挂在 `apps/desktop/src/App.tsx:71,1241` 生产渲染路径，但同目录存在 `apps/desktop/src/system/file-ops-demo.ts`（⚠ 未逐行追踪该面板数据源是否 100% 来自 demo） | **只有契约无实现**（就"桌面产品可用"而言）——工具层代码真实，但唯一生产级消费者是 demo-runtime CLI，不是 desktop |
| Tauri desktop、provider 凭证流、chat/work 双面与 schema 工作面 | 桌面壳、凭证流、双面、schema 面已成立 | `apps/desktop/src-tauri/src/lib.rs:37,847-853,1405`：真实 `reqwest::Client`，`catalog.base_url` 以 `https://` 开头（`lib.rs:2025`）；`apps/desktop/src/App.tsx:347`（`viewSegment: 'chat' \| 'work'` 真实存在两面） | **真实链路成立**（作为"壳体+两个 tab+真连接"的字面声称） |
| `@courtwork/provider` 独立包与 DeepSeek-only 产品注册；custom/base URL 猜测入口已退役 | 独立包+单一 provider+URL 猜测已关闭 | `packages/provider/ACCEPTANCE.md:109-115`：现场把生成 TS 的 base URL 改成攻击者地址，`catalog:check` 实测报错；现场放开 Rust `providerId` 比对，`embedded_catalog_rejects_arbitrary_provider_ids` 实测变红 | **真实链路成立**，有变异测试支撑 |

### 1.2 显式工单号（第 18–38 行，按用户列出的顺序）

| 条目 | 声称要点 | 代码事实（file:line） | 判定 |
|---|---|---|---|
| **PROVIDER-2** | DeepSeek catalog 单源、Rust 原始字节真分片、Provider 增量 SSE、单一生成路径、credential/connection 正交状态 | `packages/provider/ACCEPTANCE.md:123-129`：Rust mock server 把汉字"法"的 UTF-8 三字节跨两次 socket 写入，Rust 侧至少收到两个 raw chunk 且能正确拼接还原；`ProviderTransportEvent` 只发布 `response_started\|chunk\|end\|failed`，不调用 `.text()` | **真实链路成立**，变异测试证据充分 |
| **TURN-1** | provider-neutral TurnEvent、runner、append-only JSONL 生命周期 | `packages/core/ACCEPTANCE.md:301-305`：验收者注入 21 项反例，未修实现前实测 4 项失败，`fix-by-acceptance` 修复后复验通过 | **真实链路成立** |
| **INTERACTION-1A** | 垂类 manifest 提供 strict 通用问题模板，legal 内容与锚点政策由 registry 深冻结注入 | 初步 grep 命中 `packages/registry/ACCEPTANCE.md`、`packages/registry/SPEC.md`；⚠ 未逐段精读该验收报告全文，但与 INTERACTION-1B/CHAT-UI-1（详见下两行，已精读且证据扎实）属同一验收链条的前置工单 | **真实链路成立**（⚠ 部分基于同链条强模式推断） |
| **INTERACTION-1B 与 CHAT-UI-1** | Turn journal、刷新回放、core first-wins、真实 stream projection、Stop/cancel、通用交互卡 | `packages/core/ACCEPTANCE.md:367-371`：验收者临时注入非字符串 `actor.role`、非连续 seq、伪造 resolution，未修复前实测 7 项失败，修复后 97/97；`apps/desktop/ACCEPTANCE.md:1277`：**「production chat 只经 `sendChatTurn → core runTurn → provider.stream`；测试 provider 的 `generate()` 明确抛错且测试确认从未调用」** | **真实链路成立**——这是本次审查里证据密度最高的一条，Chat 全链在生产 build 里确实通 |
| **BRAND-1** | CaseRail 透明核心标记固定在 `Courtwork` 左侧，无底盘/阴影/动画 | `apps/desktop/ACCEPTANCE.md:1223-1229`：独立验收树、隔离 Playwright 端口，结论「✅ 放行」 | **真实链路成立**（范围仅品牌 CSS 细节，风险本就低） |
| **SITE-2A / SITE-2B** | 首页「原件→引语→结论→人工确认」骨架，产品图来自已验收主树的 computer-use 真机操作，OG 消费无底盘核心标记 | `site/ACCEPTANCE.md:7-13,177-183`：两次独立验收，均有独立 worktree/分支记录 | **真实链路成立**（范围仅站点文案与截图，不构成产品功能声称） |
| **POLISH-P0 与 SCHEMA-POLISH-1** | 视觉与 schema 展示打磨全量验收 | `apps/desktop/ACCEPTANCE.md:1084`（POLISH-P0 标题命中）、`:1171`（SCHEMA-POLISH-1 标题命中）；⚠ 未逐段精读全文，仅确认验收记录客观存在且与其余条目同一文档体例 | **真实链路成立**（⚠ 轻验证，未做变异测试级别复核） |
| **DESLOP-GATE-2** | 裸色、阴影、圆角、渐变、L1 嵌套、archive 消费、press/popover、泛化文案用精确白名单管控 | `site/ACCEPTANCE.md:95-101`；`site/scripts/deslop-scan.mjs`、`deslop-scan-lib.mjs`、`deslop-scan.test.mjs` 三个真实脚本文件存在，非仅文档声称 | **真实链路成立** |
| **HOST-PORT-1** | Rust 拥有 endpoint/headers/keychain，WebView 只提交 catalog id 与 body | `apps/desktop/ACCEPTANCE.md:1311-1320`：验收 diff 范围与我独立读到的 `apps/desktop/src/host/tauri-provider-transport.ts:61-91`（注释「Rust owns the endpoint, headers and keychain material; WebView submits only catalog ids and body」）一致 | **真实链路成立**——本条我做了独立代码交叉验证，不只依赖 ACCEPTANCE 自述 |
| **CONFIRM-CAS-1** | `resumeScenario` 原子消费、CAS 版本、first-wins | `packages/core/ACCEPTANCE.md:416-417`：现场删除 `found.version !== expectedVersion` 条件，定向实跑 1 失败/6 通过；恢复后 7/7 | **真实链路成立**——⚠ 需注意：这是 `ConfirmationStore`（用户对场景步骤的 confirm/reject）的 CAS，**不是** ADR-010 决定二里"全仓零实现"的那个 Work session 持久层 CAS，两者是不同子系统，不构成矛盾 |
| **ABI-2A** | registry 层 package manifest/schema export 准入 | 初步 grep 命中 13 处（`packages/registry/src/package-manifest.test.ts`、`schema-export.test.ts` 等）；⚠ 未逐段精读验收全文 | **真实链路成立**（⚠ 轻验证） |
| **CORE-BOUNDARY-1** | core 对垂类/demo/output/reading-view 零依赖，后装配例外整体迁入 demo-runtime | `packages/core/src/package-boundary.test.ts:5-9`（注释原文：「core 内不再有 binding layer，所有生产源文件均必须零垂类/demo/output/reading-view 依赖」）——机器测试真实存在且描述与 TURN-WORK-1 验收记录（见下）互相印证 | **真实链路成立** |
| **ABI-2B** | Legal/PM 同次走唯一 descriptor/bindings ABI，PM 保持 catalog-only | 初步 grep 命中 `packages/pm/ACCEPTANCE.md`、`packages/pm/src/package/manifest.test.ts`、`descriptor.ts`；与 PM-FIXTURE-1（已精读，见上）「PM 无 live」结论一致 | **真实链路成立**（⚠ 轻验证） |
| **VIEW-ABI-1 / VIEW-ABI-1C** | 桌面生产路由由 descriptor + host blueprint 驱动，未知/漂移载荷统一 fail closed | `apps/desktop/ACCEPTANCE.md:1381`：「`App.tsx` 不再用四个 `artifactType === 'legal.*'` 分支、`HOMED_ARTIFACT_TYPES` 或 raw generic tree」；`:1389` 记录验收者现场构造 schema-valid 但 renderer 拒收的反例（`pm.PriorityScore` 区间值），暴露真实 presentation 缺口后再由架构拍板修复 | **真实链路成立**——渲染层确实通用化了，但当前唯一能流入这条渲染管线的生产数据来自 Chat Turn 与 demo Work fixture，不是真实 Work run 产物（因为 WorkCommandPort 无实现，见 TURN-WORK-1/WORK-PORT-1 两行） |
| **TURN-WORK-1** | Work 模型步骤只经 `TurnRunnerPort`，每次调用先链接 Turn，notice/失败/取消沿统一 Turn 账本回放 | `packages/core/ACCEPTANCE.md:549-552`：「`packages/core/src/scenario-executor` 与 `packages/demo-runtime/src` 中 `.generate(` 为 **0**」——架构约束（不允许绕过 TurnRunnerPort 的第二引擎）确实是真的；但同一段原文明写「非测试运行时代码的 `createTurnRunner(provider, turnStore)` 绑定**只在** `packages/demo-runtime/src/composition/demo-assembly.ts`，core 只提供 adapter 定义」 | **仅 demo/fixture 成立**——架构层"没有第二引擎"这件事是真的，但生产侧（desktop）没有任何代码把这条通路接上，唯一实际跑过这条链路的生产级绑定点在 demo-runtime |
| **WORK-PORT-1** | App 只消费注入的 Work projection，demo recording/gate/review 全部收口 fixture adapter，非 demo 与跨 session 查询 fail closed | `apps/desktop/src/protocol/client.ts:98-101`（源码注释原文：「WORK-PORT-1 deliberately declares this port without constructing or wiring an implementation into React」）；`apps/desktop/ACCEPTANCE.md:1482`（验收结论原文：「不代表 executor、durable store、material ingress、Tauri Work host 或 production live 已实现」） | **表述准确**——current.md 的措辞本身没有声称 live，只说"消费注入的 projection"和"fixture adapter 收口"，与代码完全吻合，团队在源码注释和验收记录里双重自曝，这是本清单里对"诚实契约进展"处理得最好的一条 |
| **WORK-BROWSER-1** | Work protocol 与 Node 文件适配器物理分面，browser-safe 经依赖图证明，Web Crypto 身份无弱降级 | `packages/core/ACCEPTANCE.md:610-614`：「browser-safe Work protocol、Node-only file adapter 边界、根入口兼容与既有持久语义均成立」，验收发布三个「有意不同的面」 | **真实链路成立**（⚠ Web Crypto 细节未逐行复核，属代码组织/可移植性层面的真实改动，不是"Work 可用"的声称） |
| **TRACE-UI-1** | Chat reasoning 与 Work progress 复用同一 `ProcessTrace` 投影/宿主组件 | `apps/desktop/ACCEPTANCE.md:1495`：「Chat reasoning 与 Work progress 实际共用 `ProcessTrace` 组件、状态并集…差异 grep 与 DOM/SSR 定向测试共同证明，复用不是只共享类名」 | **UI 层成立、引擎层未通**——组件复用是真的（这本身是好的工程实践，避免 UI 分叉），但 Work 侧驱动这个组件的数据目前只能来自 demo fixture，不是真实 Work 引擎输出 |
| **VPKG-META-1 与 PM-PACKAGE-RENAME-1** | PM 唯一身份为 `packages/pm`/`@courtwork/pm`/`packageId=pm`，drift 门同体例 | 初步 grep 命中 `packages/pm/ACCEPTANCE.md`、`packages/legal/ACCEPTANCE.md`、`packages/pm/SPEC.md`；⚠ 未逐段精读 | **真实链路成立**（⚠ 轻验证，包重命名类改动风险本身较低） |
| **HARNESS-KERNEL-1** | browser-safe `TurnHarnessRuntime` 只冻结转售既有 `TurnRunnerPort` 与 interaction runtime，未新增 loop/事件/journal/hook | `packages/core/ACCEPTANCE.md:670,674`：「该 facade 只机械装配既有 Turn runner、interaction coordinator 与同一 TurnStore replay/resolve；没有第二 loop、journal、事件、hook、Work step 或产品接线」；「一次相同 provider stream 经直接 `createTurnRunner` 与 facade 得到同序 TurnEvent、同一 terminal」 | **真实链路成立**——这条声称本身就很克制（"只是窄 facade"），代码证据与声称的克制程度相符 |
| **VPKG-EXPORTS-1** | Legal demo fixture 只从 `/testing` 暴露，PM 不建空 testing/runtime，生产图消费 `/testing` 会触红 | 初步 grep 命中 `packages/registry/src/vertical-package-exports.test.ts`（真实测试文件存在）；⚠ 未逐段精读 | **真实链路成立**（⚠ 轻验证） |
| **PM-FIXTURE-1** | 第二垂类 catalog 样板含逐字锚定的 PrdReview/FeedbackDigest，明确保持无 scenario/prompt/PriorityScore/live | `packages/demo-data/ACCEPTANCE.md:12`：「实现仅在 `data/pm/` 增加固定的 6 文件全集…没有旧 npm alias、第二份 schema、scenario、prompt、PriorityScore、live harness、企业接口、React/CSS 或产品 UI」 | **表述准确**——声称本身就是「样板 fixture」，代码证据（accessor 只读固定文件、递归冻结）与声称完全对齐，团队没有把这条包装成"PM 能跑" |
| **ADR-011/012 已冻结下一阶段边界** | Pi 只作最小 primitive 参考不引入第二 agent runtime；Legal/PM 统一垂类包体例；企业 SDK 只进真实垂类 runtime；schema 可视化由宿主版本化 blueprint 承担 | `docs/decisions/ADR-011-minimal-harness-kernel.md:3`（状态：Accepted）；`docs/decisions/ADR-012-vertical-package-kit-and-visual-blueprints.md:3`（状态：Accepted） | **表述准确**——这条本质是"决策已被架构角色批准记录在案"，不是实现声称，ADR 文件确实处于 Accepted 状态，用词与性质相符 |
| **v0.1.1 Apple Silicon 开发构建已发布** | annotated tag 指向 `39555d6`，Release/Pages 上线，desktop 129/provider 86/root 981/Rust 25/Playwright 208 全绿，远端 DMG SHA-256 复算一致，ad-hoc 未公证且已明示边界 | `git cat-file -p v0.1.1`（本次审查现场执行）：tag 确实解引用到 `39555d6aaa2ba6dddfd329ee2cd15bdc64d50e70`；`release/DEPLOYMENT.md:14-16,25-28`：SHA-256 复核记录、发布时间戳；`:36-38`：明确写「ad-hoc 签名、未 Apple 公证…`codesign`、`hdiutil` 与挂载启动通过不等于 Gatekeeper 公证」 | **真实链路成立**，且发行边界的自我标注诚实（现场用 git 命令独立核实了 tag→commit 映射，非转述文档） |
| **demo 全链穿越** | 合成卷宗从上传到带修订 Word 的首次全链跑通 | `packages/demo-runtime/src/acceptance/run-legal-demo.ts:44-58`（注释原文：「合同 PDF → ReadingView → 六段组装 → 模型（Scripted/真 key 双档）→ RiskList 真锚 → 门禁逐条处置 → 编译修订指令 → 修订 docx」）；`packages/demo-runtime/src/package-boundary.test.ts:98-109`（机器断言 `@courtwork/core` 与 `@courtwork/desktop` 均不得包含 `@courtwork/demo-runtime`） | **仅 demo/fixture 成立**——链路逻辑本身真实可跑（甚至有"真 key"档跑真实 DeepSeek API 的模式），但这条穿越发生在被机器门物理隔离于桌面产品之外的 CLI 里，详细论证见 §3 |
| 发布修实三项：遥测真开关 | 遥测有真实可控开关而非硬编码 | `apps/desktop/src/telemetry/review-telemetry.ts:11-18`：`createReviewTelemetryEmitter` 每次发射前重新调用 `loadSettings().privacy.telemetryEnabled`，非缓存快照；`App.tsx:371` 是唯一非测试生产调用点 | **真实链路成立** |
| 发布修实三项：共享 docx 预检 | Chat 与 Work 两条路径共用同一 docx 预检实现 | `packages/reading-view/src/security/docx-preflight.ts:36`（`preflightDocx()`，⚠ 经子代理定位、本人未逐行复核该文件全文）；Chat 侧经 `Composer.tsx → convertToReadingView`，Work 侧经 `apps/desktop/src/output/case-output-client.ts` 的 `writeDocx()` | **真实链路成立**（⚠ 部分证据来自子代理检索，未做二次通读，但两条调用点路径清楚） |
| 发布修实三项：产物存在后冻结 | Word 产物需确认磁盘存在才置冻结态 | `apps/desktop/src/App.tsx:1119-1122`：`await caseOutputClient.writeDocx(...)` 之后必须 `await caseOutputClient.exists(...)` 为真才 `setDraftOutputExists(true)`，否则 `throw`；`:900-917` 合同产物同款逻辑 | **真实链路成立**，但见下方新发现——可达性受材料链断裂限制 |

**本次审查新发现（不在给定硬事实清单内，现场独立追出）**：`apps/desktop/src/App.tsx:783` 的 `caseRoot = selectedCase ? resolveCaseRoot(selectedCase) : undefined`，而 `apps/desktop/src/case/case-scope.ts:26-29` 的 `resolveCaseRoot` 对非 demo 案件、且 `folderPath` 未设置时**返回 `undefined`**。因为 `createCase()`（`App.tsx:943`）永远把 `folderPath` 设为 `undefined` 且 `isDemo: false`，**任何用户新建的真实案件，`caseRoot` 恒为 `undefined`**。上面两条"产物存在后冻结"和"共享 docx 预检"逻辑本身是真代码，但它们前置的 `if (!caseRoot ...) return;` 门禁（`App.tsx:906,1114`）在真实案件上永远短路——这两条能力目前只有 demo 案件（`DEMO_CASE_ROOT`）能触达。

---

## 2. Chat 与 Work 的真实度差异

**Chat 链路：真通。** 本次审查独立交叉验证了完整链条：

- `apps/desktop/src/App.tsx:349`「chat 面在途请求（真 API）」注释 + `:521-522` 把 `providerTransport` 注入 `sendChatTurn`；
- `apps/desktop/src/host/tauri-provider-transport.ts:62-87` 真实 Tauri `invoke('provider_chat_request', ...)`；
- `apps/desktop/src-tauri/src/lib.rs:37,847-853` 真实 `reqwest::Client`，`base_url` 以 `https://` 开头（`:2025`）；
- `apps/desktop/ACCEPTANCE.md:1277`：**「production chat 只经 `sendChatTurn → core runTurn → provider.stream`；测试 provider 的 `generate()` 明确抛错且测试确认从未调用」**，该结论附带的是变异测试（强制篡改 `providerTerminal.kind`、临时删除 `started` 事件），不是自述。

这条链是我在这次审查里唯一能完整走通"从用户点击 → Rust 网络请求 → 流式返回 → journal 落盘 → UI 渲染"全部五环，且每一环都有独立文件证据的路径。**Chat 是真实产品功能，不是 demo。**

但 Chat 也有一个此前清单未提及的缺口（见 §1.5 新发现）：Chat composer 能真实读取、转换、显示用户附件的阅读视图，但转换结果 `readingMarkdown` 从未被拼进发给模型的 `content`（`App.tsx:483,499,501-505` 只用 `payload.text` 或占位符 `"（附文件）"`；grep 全仓确认 `readingMarkdown` 只出现在 `apps/desktop/src/composer/*` 四个文件里，从未被 `App.tsx`/`chat-client.ts` 读取）。也就是说，今天在 Chat 里拖一份合同进去问模型，模型收到的是文件名占位符，不是合同内容。

**Work 链路：不通，是当前产品里最大的"能演不能用"缺口。** 证据链：

- `apps/desktop/src/protocol/client.ts:98-101`：`WorkCommandPort` 接口声明处的源码注释自陈"deliberately declares this port without constructing or wiring an implementation into React"；
- `apps/desktop/src/main.tsx:20,29`：桌面渲染时注入的是 `createDemoWorkFixture().projection`，不是任何实现了 `WorkCommandPort` 的对象；
- `packages/core/ACCEPTANCE.md:550`：非测试运行时代码里，`createTurnRunner(provider, turnStore)` 唯一的生产级绑定点在 `packages/demo-runtime/src/composition/demo-assembly.ts`，desktop 没有；
- `apps/desktop/src/App.tsx:943` + `case-scope.ts:26-29`：真实新建案件的 `caseRoot` 恒为 `undefined`，连"把 Word 写到磁盘"这种不需要模型参与的收尾动作都触达不了。

Work 侧**唯一真实的部分是渲染/展示层**：`VIEW-ABI-1`（通用 artifact table 渲染）、`TRACE-UI-1`（进度组件复用）这些工程改动确实把"如果有 artifact，怎么显示它"这件事做对了、做通用了，而且有变异测试撑腰。但"artifact 从哪来"——场景触发、模型生成、门禁处置、材料写入——这条生产路径整个不存在。

**真实度差距的量化描述**：Chat 是"引擎 + UI 都通，唯独附件内容没接上模型"；Work 是"UI 会演、引擎存在于代码里、但产品里两者之间没有任何一根线接上"。用清单自己的判定词说：Chat 属于「真实链路成立」，Work 属于「UI 层成立、引擎层未通」外加一层「只有契约无实现」（`WorkCommandPort` 连契约的实现体都没有，比"接口对但没接线"更彻底）。

---

## 3. 「demo 全链穿越」证明了什么、没证明什么

**穿越的是什么**：`packages/demo-runtime/src/acceptance/run-legal-demo.ts` 这一个 CLI 脚本，把六个真实的生产包（`@courtwork/tools`、`@courtwork/output`、`@courtwork/reading-view`、`@courtwork/legal`、`@courtwork/core`、`@courtwork/registry`）在同一个 Node 进程里按顺序拼起来跑：读一份合成合同 PDF → 转阅读视图 → 六段 prompt 组装 → 调模型（脚本里写死的"Scripted"回放档，或注入真实 provider key 的"真 key"档）→ 用 citation resolver 把模型引语铸成坐标 → 走确认门禁 → 编译修订指令 → 产出带修订的 docx。每一站都记录 `stations[]` 结构化证据，且明确写着"剧本没有免检通道"——即便用 Scripted 档，引语仍必须过 resolver 对真实 PDF 文本层的精确匹配。

这**证明了什么**：

1. `packages/core`、`packages/output`、`packages/reading-view`、`packages/legal`、`packages/tools` 这几个包之间的接口是真实自洽的——不是"各自单测通过、拼起来会崩"的那种假整合。这是有价值的证明，而且是 TDD 纪律下少见的"端到端集成不靠 mock 边界"。
2. 存在一条"真 key"档，意味着如果有人愿意手动跑这个 CLI 并注入真实 DeepSeek key，从合成 PDF 到修订 docx 的逻辑链是可以用真模型跑通的。

这**没有证明什么**：

1. **没有证明桌面产品能做到这件事。** `packages/demo-runtime/src/package-boundary.test.ts:98-109` 是一条机器测试，断言 `courtworkGraph().get('@courtwork/core')` 和 `.get('@courtwork/desktop')` 都**不得包含** `@courtwork/demo-runtime`——这不是"暂时没连"，是架构层面**主动禁止** desktop 依赖这条装配逻辑。也就是说，这条穿越用的组装代码，物理上永远不可能被搬进 `apps/desktop`（除非先改 ADR/架构判决）。
2. **没有证明材料摄取真实**。`run-legal-demo.ts` 读的是打包进 `@courtwork/legal/testing` 的固定夹具文件（`S3_PDF_CONTRACT_FILE_ID` 等），不是用户上传的任意文件——`services/ingest` 是 0 行代码（既有硬事实），OCR/分类/实体对齐完全没有实现，这条穿越绕过了这一整层。
3. **没有证明持久化/多会话/崩溃恢复真实**。CLI 进程跑完就退出，不涉及 `WorkCommandPort`、`MaterialStore`、跨会话 resume 这些桌面产品实际需要的状态管理（这些本身也是零实现，前述硬事实已确认）。

一句话总结：demo 全链穿越证明的是"如果有人愿意绕开桌面产品、直接调用这些包，逻辑是对的"，而不是"桌面产品今天能做到这件事"。这两者的混淆正是用户原始命题"Build 全绿不代表功能能实现"的最佳注脚——这里甚至不需要谈 Build 是否全绿，穿越本身就是在产品的物理边界之外发生的。

---

## 4. 如果今天给一个真实律师装上 v0.1.1，他能完成什么

逐条对照 `docs/product/vision.md:34-41` 的六条 MVP 衡量标准，诚实作答：

**1. 安全摄取并生成阅读视图** —— **部分能，但价值有限**。律师可以在 Chat composer 里选择一个真实 docx/md/txt/文本层 PDF 文件，`Composer.tsx:150-167` 会真实读取字节、跑真实 `convertToReadingView`（含 `docx-preflight` 安全检查），生成阅读视图并在 UI 里显示——这一步不是假的。但如果他想走"案件"路线（`work` 容器化工作台，vision.md 里描述的主产品形态），新建案件后 `folderPath` 永远是 `undefined`（`App.tsx:943`），案件目录层面的材料摄取完全不可达。

**2. 模型按场景声明推理** —— **不能**。"场景"（scenario）是 Work 容器的声明式固定编排概念（`CLAUDE.md`："场景是用户触发的声明式固定编排"），其执行入口 `WorkCommandPort` 全仓零实现（`client.ts:98-101` 自陈未接线）。Chat 模式根本没有"场景"这个概念，只是单一对话画布。律师今天无法触发任何一个法律场景对真实材料做推理。

**3. 系统为引语铸造坐标并拒收歧义** —— **组件真实存在，但在真实案件路径上不可达**。`citation resolver`（`packages/core/src/citation/resolver.ts`）是真实、被测试严格验证的实现，且在 Chat 的 interaction card 场景里被真实调用（`CHAT-UI-1` 验收记录的 source-open 校验）。但这套机制服务的是 legal demo 的场景 interaction，不是律师自己上传材料后的自由提问——Chat 附件内容不进模型（见 §2 新发现），律师问不出"这份材料里第几条写了什么"这种需要 resolver 出场的问题。

**4. 产出通过 schema 与确认门禁** —— **只在 demo 案件里能看到**。`resumeScenario` 的 CAS 门禁（`CONFIRM-CAS-1`）是真实、变异测试验证过的实现，`VIEW-ABI-1` 的 schema 驱动渲染也是真实的。但驱动这些机制的输入——场景运行产生的 artifact——目前只能来自 `createDemoWorkFixture()`（`main.tsx:20,29`）。律师能看到的"确认门禁"只是预录的样板案回放，不是他自己案件的产出。

**5. 用户修正被记录并投影到续行上下文** —— **不能**（对真实案件）。`ConfirmationActor` 硬编码为 `{channelId:'desktop', actorId:'local-user'}`（`App.tsx:441`），且如上所述，真实案件根本产生不了需要修正的 artifact。

**6. 正式文书可安全编译或修订为 docx** —— **代码真实，但真实案件触达不到**。`compileConfirmedReviewToDocx`/`compileDraftToDocx` → `caseOutputClient.writeDocx` → `exists()` 确认后才置冻结态（`App.tsx:900-924,1110-1127`）——这条"产物存在后冻结"逻辑是真的，不是假动画。但触发它的前置条件 `if (!caseRoot...) return`（`App.tsx:906,1114`）对任何真实新建案件恒为 `undefined`（见 §1 新发现），所以这条能力目前也只有 demo 案件能走到底。

**总体结论**：一个真实律师装上 v0.1.1 之后，能做的事情基本等于——**打开应用、连接自己的 DeepSeek key、在 Chat 里进行一段普通的（不带材料上下文的）AI 对话、可以附加文件但模型读不到文件内容、可以点开预录的样板案（"某某设备采购合同"那个 demo）完整看一遍"阅读→时间线→主体关系→风险清单→确认→出 Word"的演示流程**。他不能把自己的真实卷宗放进这套流程并得到同样的结果——不是因为某个具体功能坏了，而是因为"新建案件"这个动作到"场景执行引擎"之间，目前没有任何一根生产代码的线把它们接起来。这与团队自己在「当前架构债」第 1、2、4 条的记录完全一致，团队并未隐瞒这一点；只是「已成立」清单的呈现方式，容易让人忽略这条断裂线恰好横亘在"能演示"和"能用"之间。

---

## 5. 「已成立」措辞的修订建议

1. **拆分清单层级**：建议把「## 已成立」拆成至少两个小节——「产品可用（desktop 生产路径可跑）」与「包/契约成立（生产代码存在、经独立验收，但桌面产品尚未消费）」。当前 Chat 相关条目（TURN-1、INTERACTION-1B、CHAT-UI-1、PROVIDER-2、HOST-PORT-1）应进第一类；Work 相关条目（TURN-WORK-1、WORK-PORT-1、WORK-BROWSER-1、TRACE-UI-1 的 Work 侧、VIEW-ABI-1 的数据源部分）应进第二类并注明"桌面零消费"。
2. **「demo 全链穿越」建议改写为「demo-runtime 包级全链穿越（架构上物理禁止进入桌面产品）」**，避免与"桌面产品全链路"混淆——这是当前清单里唯一一条我认为措辞本身就容易引发误读的条目（不是团队故意误导，是最后一句话挤在发布公告后面，缺少和 `WORK-PORT-1` 同等级别的免责句）。
3. **给"产物存在后冻结"三项加一句可达性限定**：如「…（当前仅 demo 案件路径可达，真实案件因材料链断裂尚未触达）」，与架构债第 1 条呼应，避免读者误以为这是通用能力。
4. **新增一条关于 Chat 附件的诚实记录**：当前架构债列表没有提到"附件阅读内容不进模型上下文"这件事（这是本次审查独立发现，不在给定硬事实里）。建议补一条架构债，说明 Chat 附件目前只做展示、不做上下文注入，否则下一阶段规划者可能误以为"Chat 已经能读文件"。
5. 除以上四点，**其余约 24 条按现有措辞保留是合适的**——它们要么范围本就克制（BRAND-1/SITE-2A/2B/DESLOP-GATE-2/POLISH-P0/PM-FIXTURE-1/ADR-011/012），要么背后有真实变异测试支撑且没有超出代码事实（PROVIDER-2/TURN-1/INTERACTION-1B/CHAT-UI-1/CONFIRM-CAS-1/HOST-PORT-1/HARNESS-KERNEL-1/v0.1.1）。不建议因为 Work 侧的问题去整体贬低这份清单的可信度。

---

## 6. 证据附录（本次审查读取/执行的关键出处）

- `docs/status/current.md:8-38`（已成立清单原文）、`:47-58`（当前架构债）、`:60-78`（下一阶段优先序）
- `docs/product/vision.md:34-41`（六条 MVP 衡量标准）
- `apps/desktop/src/main.tsx:1-35`
- `apps/desktop/src/App.tsx:349-358,437-445,470-538,783,900-954,1110-1127`
- `apps/desktop/src/case/case-scope.ts:18-34`
- `apps/desktop/src/host/tauri-provider-transport.ts:1-92`
- `apps/desktop/src-tauri/src/lib.rs:35-38,823-853,968-971,1217-1221,1404-1407,2021-2026`
- `apps/desktop/src/protocol/client.ts:80-129`
- `apps/desktop/src/composer/Composer.tsx:1,69-191`
- `apps/desktop/src/telemetry/review-telemetry.ts:1-19`
- `packages/core/src/turn/turn-runner.ts:1-80`
- `packages/core/src/citation/resolver.ts:1-40`
- `packages/core/src/package-boundary.test.ts:1-11`
- `packages/core/ACCEPTANCE.md:291-305,350-450,536-561,605-614,665-674`
- `packages/provider/ACCEPTANCE.md:56,87,91-129`
- `apps/desktop/ACCEPTANCE.md:1084,1171,1223-1229,1265-1293,1311-1320,1369-1397,1437-1495`
- `site/ACCEPTANCE.md:7-13,95-101,177-183`
- `packages/demo-data/ACCEPTANCE.md:3-12`
- `packages/demo-runtime/src/package-boundary.test.ts:85-113`
- `packages/demo-runtime/src/acceptance/run-legal-demo.ts:1-70`
- `docs/decisions/ADR-011-minimal-harness-kernel.md:3`、`docs/decisions/ADR-012-vertical-package-kit-and-visual-blueprints.md:3`
- `release/DEPLOYMENT.md:1-38`
- 现场命令：`git tag -l v0.1.1`、`git rev-parse v0.1.1`、`git cat-file -p v0.1.1`（确认 annotated tag 解引用到 `39555d6aaa2ba6dddfd329ee2cd15bdc64d50e70`）
- 现场命令：`grep -rln "@courtwork/tools" packages/legal/src packages/demo-runtime/src apps/desktop/src`（确认工具包仅被 demo-runtime 四个非测试文件消费）
- 现场命令：`grep -rn "readingMarkdown" apps/desktop/src`（确认附件阅读内容仅存在于 composer 层，从未进入模型请求构造代码）

本报告为只读审查，未对仓库做任何修改。
