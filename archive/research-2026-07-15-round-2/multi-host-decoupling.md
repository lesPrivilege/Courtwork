# R1 · 多宿主解耦审查（Stage 1 插件 / 通道网关 / Stage 4 被集成）

审查方式：只读源码审查，不修改仓库。结论逐条落 `文件:行号`；标 ⚠ 的是推断，其余是读到的代码事实。

---

## 0. 结论先行

**第二宿主今天要付的代价是"重建命令与身份入口，不是重建算法"**：`packages/output`（917 行）已经是无 `node:*`、纯函数、可直接搬走的模块；`packages/core` 的 Work/Turn 算法内核已经过真实 Vite 构建证明浏览器安全（`work-protocol`、`turn-protocol` 两个 subpath）。但通往这套内核的**唯一命令入口 `WorkCommandPort` 焊死在 `apps/desktop/src/protocol/client.ts:102`、零实现**；`ConfirmationActor`（IM 通道网关的设计锚点）**唯一构造点是 `apps/desktop/src/App.tsx:441` 的硬编码字面量 `{ channelId: 'desktop', actorId: 'local-user' }`**，与 ADR-010 明文要求的"actor 由 identity dependency 注入，React 不能自报"直接相反；`commandId` first-wins 只是类型字段，`command_conflict` 全仓零命中。垂类语义泄漏不是"少量"能概括的：按文件数是 10/84（11.9%），但按行数是 3,337/10,961（30.4%），且集中在全仓最大单文件 `App.tsx`（1,954 行）和未迁移的 Legal 专用面板（`Panels.tsx`+`GraphPanel.tsx` 660 行）里。第二宿主要从"能读协议"做到"能发指令、能挂身份、能显示结果"，至少要新增一个共享 Port 契约包和一个 identity/gateway 骨架，且要吃掉 App.tsx 里被戳穿的会话状态机与硬编码 actor。

---

## 1. desktop 13,375 行的分类

口径：`apps/desktop/src` 下非测试 `.ts/.tsx`，共 **10,961 行、84 个文件**（含 `App.tsx` 1,954 行 + `main.tsx` 34 行）；另有 `src-tauri/src` Rust **2,257 行**；两者相加 13,218 行，加根级配置文件后与题目给出的 13,375 基本吻合（口径差异见第 8 节）。以下按行为分三类，本节只统计 TS/TSX 部分。

### 1.1 宿主能力（Tauri/OS 桥接，第二宿主必然要重写但代码量本身不大）—— 约 579 行（5.3%）

逐一验证：全仓 `invoke(` 调用只出现在一个文件——`apps/desktop/src/host/tauri-provider-transport.ts`（4 处）；`@tauri-apps` import 只出现在 6 个文件：

| 文件 | 行数 | 能力 |
|---|---|---|
| `apps/desktop/src/host/tauri-provider-transport.ts` | 91 | provider 网络 transport，`HostTransportPort` 实现 |
| `apps/desktop/src/credentials/client.ts` | 169 | 钥匙串读写 |
| `apps/desktop/src/system/system-open-client.ts` | 91 | 系统文件打开 |
| `apps/desktop/src/output/case-output-client.ts` | 68 | 产出目录写盘 |
| `apps/desktop/src/provider/connection-client.ts` | 60 | 网络探活 |
| `apps/desktop/src/chrome/WindowChrome.tsx` | 100 | 窗口最小化/关闭 |

这部分是"换宿主必须重写，但重写成本可控"的纯桥接代码。

### 1.2 困在 desktop 的产品逻辑（host-agnostic 但 Courtwork 特有，第二宿主要么整段迁移要么重复实现）—— 约 3,331 行

**`apps/desktop/src/App.tsx`（1,954 行，全仓最大单文件，占 desktop TS 总量 17.8%）**：不是 UI 组件，是应用的会话状态机本体——

- `SessionAction`/`reduceSession`（`App.tsx:246-252`）：`useReducer(reduceSession, EMPTY_SESSION)` 在 `App.tsx:289` 挂载，`reduceSession` 只是 `protocol/client.ts` 的 `projectSession` 纯函数的薄包装；
- `AppProps`（`App.tsx:275-281`）：`workProjection: WorkProjectionPort`、`hostRenderers`、`packageRegistries`、`workFixture` 均为注入参数——这点证实了 `docs/status/current.md:29` "WORK-PORT-1 已合流：App 只消费注入的 Work projection" 的说法；
- Turn 客户端装配、interaction resolve（`App.tsx:437-445`，含硬编码 actor，见第 5 节）、composer 发送、workbench 视图路由全部堆在这一个文件里。

**`apps/desktop/src/protocol/`（244 行）**：`client.ts`（172 行，含 `WorkCommandPort`/`StartWorkCommand`/`ResumeWorkCommand`/`CancelWorkCommand`/`projectSession`）、`review-resolution.ts`（25 行，disposition → RevisionInput 映射）、`work-replay.ts`（19 行）、`demo-fixture.ts`（28 行）。`projectSession`（`client.ts:145-172`）是纯函数、无 DOM/React 依赖，是"SessionEvent → UI 投影"的核心算法，却只存在于 app 里，不是 package。

**其余**：`system/work-draft-store.ts`（125 行，Work 草稿/修订暂存状态机）、`provider/turn-protocol-client.ts`（228 行，包装 `@courtwork/core/turn-protocol` 并注入 `localStorage` 后端）、`provider/chat-client.ts`（136 行）、`provider/model-config.ts`（150 行）、`chat/process-trace-projection.ts`（50 行，Turn/Work 事件 → 展示轨迹的纯投影）、`settings/settings-store.ts`（200 行）。

### 1.3 垂类语义泄漏 + demo 直连（见第 2 节详细数字）—— 3,337 行，10 个文件

### 1.4 UI 呈现层（React 组件/样式/生成资产，换宿主要重写渲染但不是"逻辑 bug"）—— 约 3,700+ 行

`preview/`（528 行，`ArtifactTableRenderer.tsx` 是 ADR-009 决定四要求的通用 blueprint renderer，架构上正确地属于 desktop）、`icons/`（534 行，497 行是生成的 SVG 路径数据）、`composer/`（1,027 行）、`rail/`（603 行）、`modules/`（295 行）、`command-palette/`（154 行）、`workbench/` 中非 Legal 专用部分（`Icon.tsx`/`SplitView.tsx`/`CopyButton.tsx`/`g6-runtime.ts` 等约 256 行）。

---

## 2. 垂类语义泄漏：用数字核实"少量历史漂移"

`docs/architecture/system.md:71`："当前仍有少量 desktop 直连法律/demo 的历史漂移"。核实结果：

**`@courtwork/legal` 直接 import，8 个文件**（`grep -rn "@courtwork/legal" apps/desktop/src` 排除测试）：
`demo/legal-interaction.ts:2`、`App.tsx:2`、`output/compile-review-output.ts:4`、`composition/package-runtime.ts:1`、`system/FileOpsPlanPanel.tsx:2`、`system/file-ops-demo.ts:1`、`workbench/GraphPanel.tsx:2`、`workbench/Panels.tsx:2`。

**`'legal.xxx'` 字符串字面量路由，4 个文件**：`demo/client.ts`（`'legal.CaseFile'` 等 5 处，130-134 行）、`demo/recordings.ts`（多处 artifactType 字面量）、`demo/legal-interaction.ts:56`（`templateId: 'legal.risk-evidence-confirmation'`）、**`App.tsx`**——`App.tsx:719` `packageRegistries.scenarios.get(\`legal.${flow}\`)`，`App.tsx:788-804` 连续 8 处直接以 `'legal.RiskList'`/`'legal.Timeline'`/`'legal.PartyGraph'`/`'legal.ReviewMatrix'` 为 key 读 `session.artifacts`。

**并集：10 个文件、3,337 行**（`wc -l` 实测），占 `apps/desktop/src` 非测试文件数 84 的 **11.9%**，占总行数 10,961 的 **30.4%**。

**判定**：按文件数"少量"勉强成立；按行数占比与"泄漏点落在全仓最大文件（App.tsx）和顶层 workbench 面板"这两个事实看，"少量"不成立——这不是外围文件的零星漂移，是应用中枢和常驻可见面板的结构性耦合。`docs/status/current.md:58` 自己承认："当前唯一通用生产 blueprint 是 `courtwork.artifact-table.v1`；Legal 仍有未版本化专用 panel"——`workbench/Panels.tsx`（400 行：`DraftPanel`/`MatrixPanel`/`RevisionPanel`/`TimelinePanel`）与 `workbench/GraphPanel.tsx`（260 行：`PartyGraph`）就是这句话的确切所指，合计 660 行。

**`@courtwork/pm` 侧对照**：全仓只有 1 处 import（`composition/package-runtime.ts:2`），零字符串字面量路由——因为 ADR-009 决定四把 PM 限定为 `ABI-2B` catalog-only（`scenarios`/`prompt` 留空），没有给它长出专用 panel 的机会。这个对比反过来证明：泄漏不是架构必然，是 Legal 作为最早垂类的历史包袱没清干净。

**demo 真值跨界**：`grep -rln "packages/demo-data"` 排除 `demo-data/`、`demo-runtime/`、`eval/` 自身后，`apps/desktop` 内命中 3 个文件——`demo/recordings.ts`、`demo/legal-interaction.ts`（两者都在被允许的 `demo/` 目录下）、以及 **`App.tsx:99`**：
```
// 装配点例外（demo/ 同列先例）：原件阅读 fixture 直取 demo-data 文书 md
import contractSourceMd from '../../../packages/demo-data/data/dossier/04-设备采购合同.md?raw';
```
这是相对路径直穿，**不经过 `@courtwork/demo-data` 包依赖**（`apps/desktop/package.json` 的 dependencies 里根本没有 `@courtwork/demo-data`），意味着任何基于 `package.json` 依赖图的边界检查工具（madge/dependency-cruiser）都看不见这条越界——它只能被人读代码发现。ADR-010 决定五验收下限明确写了"非 demo case 任何 recording、DEMO_ARTIFACTS、demo party adapter 或 demo 原文消费必须触红"（`docs/decisions/ADR-010-work-live-boundaries.md:281`），但这条红线目前无机器门覆盖（见下）。

**机器门核实**：`eslint.config.js` 全文无 `no-restricted-imports`、无自定义 import 边界规则；仓库内无 `.dependency-cruiser*` 配置；`.github/workflows` 只有 `pages.yml`。也就是说"desktop 不得复制垂类类型路由"（`docs/architecture/system.md:71`）**目前没有任何机器门**（既没有 lint 规则也没有类似 `turn-protocol.browser.test.ts` 那种对 `apps/desktop/src` 做字符串扫描的测试）——对照组是 `packages/core/src/turn/turn-protocol.browser.test.ts:72-85`，它确实用同样的手法扫描 `apps/desktop/src` 检查 `createTurnHarnessRuntime` 等标识符不出现；同一手法没有被复用到扫描 `legal.`/`@courtwork/legal`。**判定：无契约无实现**（规则写在文档里，代码里连门禁脚本都没有）。

**`HOMED_ARTIFACT_TYPES`**：全仓零命中——ADR-009 决定四点名的这个具体反模式已经清理，这条债务是真实还清的，不是文档自吹。

---

## 3. browser-safe 现状

`packages/core/src/index.ts`（根 barrel）逐行核实：

```
5:  export * from './events/event-log-file.js';        // imports node:fs, node:path
8:  export * from './turn/turn-store-file.js';          // imports node:fs, node:path
12: export * from './session/confirmation-store-file.js'; // imports node:crypto, node:fs
22: export * from './revision/revision-store-file.js';  // imports node:fs, node:path
```

**根导出 `@courtwork/core`（`.`）不是 browser-safe**，且 `packages/core/package.json` 的 `exports` 字段**没有 `browser` 条件**——所有 subpath 都只有 `types`/`default` 两个键，无环境分支。

`work/work-store-file.ts` 本身没有直接 `node:` import（只是转发前三者之一 + `revision-store-file.js`），源码开头自带注释：
```
apps/../packages/core/src/work/work-store-file.ts:1-4
"Node-only compatibility entry for the synchronous Work file adapters.
 Browser consumers must import @courtwork/core/work-protocol instead."
```
——这解释了题目提到的"5 个文件"与我本次直接 `grep 'node:'` 命中 4 个文件（`turn-store-file.ts`、`event-log-file.ts`、`revision-store-file.ts`、`confirmation-store-file.ts`）的差异：`work-store-file.ts` 是第 5 个，是传递依赖而非直接 import。

**真正的 browser-safe 子集，已用真实构建证明**：

- `@courtwork/core/work-protocol`（`packages/core/src/work/work-protocol.ts`，12 行 barrel）转出 `evidence/grade`、`events/types`+`event-log`（内存版）、`session/confirmation-store`（内存版）+`types`、`tools/tool-registry`、`scenario-executor/{todo-snapshot,runtime-limits,executor}`、`revision/revision-store`（内存版）、以及 `turn/types` 的 `TurnRunnerPort`/`PersistedTurn`/`TurnEvent` 类型——**scenario executor 本体也在这个安全子集里**。
- `@courtwork/core/turn-protocol`（`turn-protocol.ts`，5 行 barrel）转出 `turn-store`（算法，非 file 版）、`turn-runner`、`interaction-coordinator`、`turn-harness-runtime`。

两者各有 `*.browser.test.ts` 做**三层验证**（不是纯静态 grep）：
1. 递归扫描本地 import 图，断言零 `node:*`，并自测扫描器本身（`work-protocol.browser.test.ts:102-109` 现场往临时目录塞一个 `import 'node:fs'` 文件，断言扫描器能抓到）；
2. 断言 `package.json` exports 形状与源码不含 `createFile|store-file` 字样（`work-protocol.browser.test.ts:80-95`）；
3. **真跑一次 `vite build`**（`vite.work-protocol.config.mjs`/`vite.turn-protocol.config.mjs`），断言产物 JS 里既无 `node:(crypto|fs|path)` 也无 `__vite-browser-external`（Vite 对无法解析的 Node 内建模块的降级标记）——这是我见过的最扎实的"browser-safe"证明方式，判定为**契约已定 + 代码已实现**。

**缺口**：`events/`、`session/confirmation-store.ts`、`revision/revision-store.ts` 的内存版本身没有专属 subpath（`package.json` 无 `./events-protocol` 等），只是作为 `work-protocol.ts` 的传递依赖被间接测到——⚠ 推断：如果以后只改 `confirmation-store.ts` 或只加一个新文件在 `events/` 下，没有专门盯着这三个域的独立测试会先发现回归，要等 `work-protocol.browser.test.ts` 连带失败才会暴露，定位链条更长。

**Q3 直接回答**："一个 WPS task pane 今天 import `@courtwork/core` 会发生什么"——如果拿根路径 `@courtwork/core` 做值导入（非 `import type`），打包器会在依赖图里遇到 `node:fs`/`node:path`/`node:crypto`（来自仍留在 barrel 里的 3 个 file adapter），Vite 默认策略是产出 `__vite-browser-external` 占位（运行时调用即抛错）或构建报错，视配置而定；如果改成 `import from '@courtwork/core/work-protocol'` 或 `.../turn-protocol'`，今天是真安全的，有构建产物验证背书。**根路径不安全、两个具名 subpath 安全**——这个"安全是 opt-in 的，默认路径是坑"的现状，本身就是一个需要显式修的项（见第 7 节）。

---

## 4. `packages/output` 的宿主可移植性

`packages/output/src` 共 917 行、9 个文件。`grep -rln "from 'node:" packages/output/src` 只命中 **1 个文件**——`apply-revision-instruction-set.test.ts`（测试文件），生产代码零 `node:*`。`package.json` 的 `exports` 只有根路径，无 `browser` 条件——但因为压根没有 Node-only 代码，这一点是次要的。

**移植性证据**：
- `docx-zip.ts:2` `import { Buffer } from 'buffer';`——显式从 npm `buffer` polyfill 包导入，不是用 Node 全局 `Buffer`，是刻意的浏览器可移植选择；`docx-zip.ts:26` 是唯一使用点。
- 依赖的 `@courtwork/reading-view/docx-security`（`packages/reading-view/src/security/docx-preflight.ts:1-5`）只 import `fflate` + 本地模块，同样零 `node:*`，且不触碰 `reading-view` 用于 PDF 文本层提取的重依赖 `pdfjs-dist`。

**输入输出契约核实**（`packages/output/src/apply-revision-instruction-set.ts:20-37`）：
```ts
export function applyRevisionInstructionSet(
  originalDocx: Buffer | Uint8Array,
  instructionSet: RevisionInstructionSet,
  options: ApplyRevisionInstructionSetOptions = {},
): ApplyRevisionInstructionSetResult
```
纯同步函数，字节进字节出（`{ docx: Buffer, outcomes }`），**没有任何 desktop 注入的东西**——不接收文件句柄、Tauri 回调、确认门禁或宿主上下文。488 行的 `apply-instructions.ts` 是这条链路背后的 OOXML 操作细节，同样不含 `node:*`（唯一依赖 `@xmldom/xmldom`，⚠ 未验证其在真实浏览器打包下的行为，本次未深入 node_modules 检查）。

**判定**：`packages/output` 是全仓离"能在浏览器宿主跑"最近的包——**契约已定 + 代码已实现**，但⚠ 缺一个像 core 那样的真实 Vite 构建证明测试，目前的"浏览器安全"结论是 grep 级别验证 + 架构合理性判断，不是构建证明——这与 core 的 turn/work-protocol 形成对比，是一个可以低成本补的验证缺口（第 7 节列入）。

---

## 5. 通道网关的结构缺口

**数据层已经为通道网关设计**：`packages/core/src/events/types.ts:20-28`：
```ts
/**
 * 渠道无关身份标识：不隐含确认方与 core 同进程/同机/同客户端（SPEC TODO 异步确认预留）。
 * channelId 对应未来的 IM/工作流通道网关（企微/飞书/钉钉/律所内部 OA），actorId 对应
 * RevisionEvent.actor.userId。
 */
export interface ConfirmationActor {
  channelId: string;
  actorId: string;
  role?: string;
}
```
`SessionEvent`（`events/types.ts:45-116`）是纯判别联合，字段全是字符串/数字/数组/普通对象，无函数、无类实例、无 `AbortSignal` 之类的句柄——**结构上可 JSON 序列化外发**，这点是真的。

**唯一构造点是硬编码**：全仓唯一一处构造 `ConfirmationActor` 的代码是 `apps/desktop/src/App.tsx:441`：
```ts
actor: { channelId: 'desktop', actorId: 'local-user' },
```
写在 React 事件处理函数 `resolveInteraction`（`App.tsx:437-445`）内部，直接违反 ADR-010 决定一原文（`docs/decisions/ADR-010-work-live-boundaries.md:103`）："actor 由 desktop identity dependency 注入，React 不能自报 actor"。核实结果：**core 里不存在任何 identity 端口**——`grep "Identity" packages/core/src` 只命中 `WorkTurnIdentity`/`WorkTurnIdentityFactory`（`scenario-executor/executor.ts:28-41`），这是给 Turn 调用去重用的**调用身份**，与"谁确认了这个门禁"的**用户身份**是两回事。**判定：契约已定（ADR-010 原文）+ 代码与契约相悖**——不是没实现，是现有的唯一实现直接做了 ADR 禁止的事。

**`commandId` first-wins**：`commandId` 字段只在 `apps/desktop/src/protocol/client.ts:52,60,67`（`StartWorkCommand`/`ResumeWorkCommand`/`CancelWorkCommand`）出现，全仓从未被读取、比较或去重；`command_conflict`（ADR-010 决定一要求的冲突结果）全仓零命中。**判定：契约已定（ADR-010 决定一原文）+ 代码未实现**，连桩函数都没有。

**通道网关服务骨架**：`grep -rln "webhook\|企业微信\|飞书\|钉钉\|WeCom\|DingTalk\|Feishu"` 在生产代码里零命中；唯一相关代码是 `apps/desktop/src/settings/SettingsPage.tsx:435-436` 与 `settings/data-promise-copy.ts:61-62`——`wecom`/`feishu` 两个"reserved"提示项，文案是"export locally and send it manually"，即**显式声明未实现**（符合 CLAUDE.md 不变量 4"静默降级零容忍"，这是诚实的占位，不是假装做了）。

**好消息（对比项）**：
- `InteractionCoordinator`（`packages/core/src/turn/interaction-coordinator.ts`）的 `requestInteraction` 是纯函数、渠道无关，无 Node 依赖；
- 解答侧 `resolveInteraction`（`packages/core/src/turn/turn-store.ts:456-516`）在类型和逻辑上**已经是渠道无关的**——直接透传调用方传入的 `input.actor.channelId/actorId/role`（`turn-store.ts:508-511`），并对重复/未知请求 fail closed（`turn-store.ts:482-489`）；
- `ConfirmationStore`（`packages/core/src/session/confirmation-store.ts`）的 `.take()` 被标 `@deprecated`（`confirmation-store.ts:30-31`，注释写明"resumeScenario 不得用它跳过 validate-before-consume"），而 `packages/core/src/scenario-executor/executor.ts:651,658` 实际调用的确是 `.peek()` 再 `.consume(requestId, snapshot.version)`，**不是** `.take()`——ADR-010 决定六的这条要求是**契约已定 + 代码已实现**。

**Q5 结论**：事件/数据层（`SessionEvent`、`ConfirmationActor` 形状、`ConfirmationStore` 的 CAS 语义）已经为通道网关铺好了地基且部分已验证；命令/身份层（actor 注入、`commandId` 去重、`WorkCommandPort` 装配）是纯空白，且现存的唯一调用点还主动违反了预留的缝——"企业微信卡片上点确认"today 连接入口都没有：既没有 identity port 可挂，也没有 webhook 骨架能接进来。

---

## 6. 端口契约的归属：`WorkCommandPort` 是设计意图还是漂移

`apps/desktop/src/protocol/client.ts:98-102`：
```ts
/**
 * Production command boundary. WORK-PORT-1 deliberately declares this port without
 * constructing or wiring an implementation into React.
 */
export interface WorkCommandPort {
```
自带注释承认"故意声明但不装配"。全仓搜索 `WorkCommandPort` 只有这一处定义，**零实现**（无 `implements`、无匹配 shape 的对象字面量）。`docs/status/current.md:49`（架构债 #1）独立印证："`WorkCommandPort` 契约与 projection 注入缝已经成立，但生产实现仍未装配"——文档与代码一致，不是文档粉饰。

**ADR 原文比对**：
- ADR-010（`docs/decisions/ADR-010-work-live-boundaries.md:23-113`，决定一）把 `WorkCommandPort`/`StartWorkCommand`/`ResumeWorkCommand`/`CancelWorkCommand`/`WorkProjectionPort` 的完整类型形状**逐字写进 ADR 正文**，且明说"`WORK-PORT-1` 只落上述类型、App 注入缝和 fixture/live 物理分界，不实现 live"（`ADR-010:112-113`）——按这条验收范围看，"声明但不装配"正是这一单的**既定交付边界**，不是失控漂移。
- ADR-009（`docs/decisions/ADR-009-runtime-ports-and-harness.md:22-35`，决定一）画的分层是 `React UI → {ChatCommandPort/ChatProjection, WorkCommandPort/WorkProjection, CredentialCommandPort} → TS composition root → core/registry/provider adapters → HostTransportPort → Tauri/Rust`，**没有指明 Port 类型物理上该放在哪个包**；`apps/desktop/src/composition/package-runtime.ts`（30 行）已经证明"TS composition root"这一层目前就物理坐落在 `apps/desktop/src/` 内，不是独立 package——在"当前只有一个 desktop 宿主"的前提下，Port 类型跟着它唯一的 composition root 走是内部自洽的。
- ADR-001（`docs/decisions/ADR-001-package-abi.md`）全文对 "Port"/"composition root" 零提及（已 grep 确认）——它早于这个概念，不构成放置位置的强制规则。
- `packages/schemas`、`packages/registry`（`docs/architecture/system.md:29-30` 定义为"领域无关 wire 契约"与"包 ABI/准入/运行注册表"，理论上是最合适的候选归宿）**目前都不含任何 Work 命令形状的类型**（已 grep 确认为空）。

**判定：契约与 roadmap 冲突**（这是本题最重要的一类结论）——ADR-009/010 现行文本对"单一 desktop 宿主"场景是自洽的，没有违反任何已 Accepted 的条款；但 Stage 1 的 IM 通道网关、Stage 1 的 WPS task pane、Stage 4 的"被集成"三处都要求**非 desktop 进程**构造 `StartWorkCommand`/`ResumeWorkCommand`。今天这些类型只存在于 `apps/desktop/src/protocol/client.ts`——一个 app，不是 workspace package，外部消费者没有合法的 `import` 路径（唯二选项是让别的服务反向依赖 `apps/desktop` 源码，这与整个仓库"依赖必须向更稳定契约层收敛"的纪律相悖；或者手抄一份类型定义，制造 ADR-009 决定五明确警告的 schema 漂移风险）。**没有任何一条 Accepted ADR 现在就要求把它挪到包里**，但 roadmap 一旦认真推进，这会成为第一个卡点——这正是"契约与 roadmap 冲突"而不是"代码违反契约"。

---

## 7. 必须做的解耦清单（按 roadmap Stage 排序，每条写明不做的后果）

**Stage 1 · WPS/Word 插件入口**

1. **给 `packages/output` 补一个真实浏览器构建证明测试**，仿照 `packages/core/src/work/work-protocol.browser.test.ts` 的 vite-build 手法。不做的后果：插件工单启动才发现 `@xmldom/xmldom` 或某个依赖在浏览器打包阶段报错，返工成本从"测试红"推迟到"插件联调红"，且当前"能在浏览器跑"的结论只是 grep 级别，没有构建产物背书。
2. **把 `WorkCommandPort`/`StartWorkCommand`/`ResumeWorkCommand`/`CancelWorkCommand`/`WorkProjectionPort` 从 `apps/desktop/src/protocol/client.ts` 迁出到可被 task pane 与未来网关共同 import 的包**（`packages/core` 新 subpath，或 `packages/schemas`），并纳入 browser-safe 测试。不做的后果：WPS 插件与桌面各写一份类型，字段一改就漂移；插件侧也无法复用 `projectSession`（`client.ts:145-172`）这个已经写好的纯投影函数，等于要重新逆向一遍协议语义。

**Stage 1 · IM/工作流通道网关**

3. **把 `ConfirmationActor` 的构造从 `App.tsx:441` 的硬编码字面量改成真正的 identity port 注入**，并在 core 侧新增这个端口（目前完全不存在）。不做的后果：网关侧就算实现了企业微信卡片回调，也没有代码入口能把 `channelId`/`actorId` 从 desktop 之外传进 core；`resolveInteraction`/`executor` 虽然类型和逻辑上渠道无关，但唯一调用点焊死在 React 事件处理函数里。
4. **把 `commandId` first-wins 与 `command_conflict` 从类型字段变成真实实现**（当前零实现、零测试）。不做的后果：IM 网络本就不可靠，网关重放/重试请求时没有幂等保护，同一会话可能被并发发起两次，直接违反 CLAUDE.md 不变量 3"留人确认"的可信前提。
5. **搭一个最小通道网关服务骨架**（webhook 接收、卡片模板、签名校验），当前 0 行代码，只有 `SettingsPage.tsx:435-436` 的 reserved 占位文案。不做的后果：Stage 1 退出条件里的"插件端日活占比可观测"和 Stage 3"监控告警复用同一网关"都没有落地路径。

**贯穿 Stage 1（场景注册表机制化的前置卫生工作）**

6. **给"desktop 不得复制垂类类型路由"补一个机器门**，用 `turn-protocol.browser.test.ts:72-85` 已经验证过的手法（扫描 `apps/desktop/src` 找禁用标识符/字符串）监控 `legal.`/`@courtwork/legal`。不做的后果：`docs/architecture/system.md:71` 的"少量历史漂移"承诺没有任何机器盯着，只会越攒越多——本次审查已经证明 30.4% 的行数已经踩线。
7. **把 `workbench/Panels.tsx`（400 行）、`GraphPanel.tsx`（260 行）迁到 `courtwork.artifact-table.v1` 或新 blueprint**，当前直接以 props 形式接收 `@courtwork/legal` 类型（`Panels.tsx:2`、`GraphPanel.tsx:2`）。不做的后果：新宿主（WPS 插件、被集成方）想展示同一份 RiskList/Timeline 时无法复用 descriptor 驱动的通用渲染，只能照抄一遍 660 行专用面板逻辑。

**Stage 4 · 被集成**

8. **给 `packages/core` 根导出加 `browser` 条件导出，或直接把 4 个 `*-file.ts` 移出根 barrel**（`packages/core/src/index.ts:5,8,12,22`）。不做的后果：任何被集成方只要 `import '@courtwork/core'`（而不是精确的 `/work-protocol` subpath）就会在打包阶段撞见 `node:fs`/`node:path`/`node:crypto`；即便被集成方本身跑在 Node 里，也被迫耦合进一份自己用不上的同步文件持久化实现。
9. **给 `events/`、`session/confirmation-store.ts`（内存版）、`revision/revision-store.ts`（内存版）各补一条独立的 browser-safe subpath + 测试**，不要只靠被 `work-protocol.ts` 间接转出来兜底。不做的后果：以后有人往这三个域里不小心加一行 `node:crypto`，不会有专门盯着这三个域的测试立刻触红，要等 `work-protocol.browser.test.ts` 连带失败才会暴露，排查链条变长。

---

## 8. 证据附录：统计口径与命令

**行数统计方法**：`find <dir> -type f \( -name '*.ts' -o -name '*.tsx' \) -not -name '*.test.ts' -not -name '*.test.tsx' | xargs wc -l`，排除 `dist/`、`node_modules/`。

| 口径 | 本次实测 | 题目给出 |
|---|---|---|
| `apps/desktop/src` TS/TSX（非测试） | 10,961 行 / 84 文件 | — |
| `apps/desktop/src-tauri/src` Rust | 2,257 行 | — |
| 上两者相加 | 13,218 行 | — |
| `apps/desktop` 全量（含少量根级 config） | ≈13,375（含 config 后与给出值基本吻合，差异 <2%，未逐字节对账） | 13,375 行 |
| `packages/core/src` TS（非测试，含 `__vite__`/不含） | 3,372–3,404 行（口径不同略有浮动） | 3,418 行 |
| `packages/output/src` TS（非测试） | 917 行 | 917 行（精确一致） |
| `services/ingest` | 0 行代码，仅 `SPEC.md` 1 个文件 | 0 行（精确一致） |

**关键命令**（均在仓库根 `/sessions/zealous-amazing-tesla/mnt/Courtwork` 执行）：
- 目录行数分布：`for d in apps/desktop/src/*/; do find "$d" -type f \( -name '*.ts' -o -name '*.tsx' \) -not -name '*.test.ts' -not -name '*.test.tsx' | xargs cat | wc -l; done`
- Node 依赖扫描：`grep -rln "from 'node:" packages/core/src --include='*.ts' | grep -v '\.test\.'`
- 垂类 import 扫描：`grep -rn "@courtwork/legal" apps/desktop/src --include='*.ts' --include='*.tsx' | grep -v '\.test\.'`
- 字符串路由扫描：`grep -rl "'legal\.\|\"legal\." apps/desktop/src --include='*.ts' --include='*.tsx' | grep -v '\.test\.'`
- demo 越界扫描：`grep -rln "packages/demo-data" --include='*.ts' --include='*.tsx' . | grep -v node_modules | grep -v /dist/`
- Tauri 桥接面扫描：`grep -rl "@tauri-apps" apps/desktop/src --include='*.ts' --include='*.tsx'` / `grep -rc "invoke(" apps/desktop/src --include='*.ts' --include='*.tsx'`
- Port/命令幂等扫描：`grep -rn "WorkCommandPort\|commandId\|command_conflict" --include='*.ts' --include='*.tsx' .`（排除 `node_modules`/`dist`）
- 机器门核实：读 `eslint.config.js` 全文；`find . -iname "*.dependency-cruiser*"`；`ls .github/workflows`。

**读过的关键文件**（供复核）：
`apps/desktop/src/App.tsx`、`apps/desktop/src/protocol/client.ts`、`apps/desktop/src/case/case-scope.ts`、`packages/core/src/index.ts`、`packages/core/src/events/types.ts`、`packages/core/src/session/confirmation-store.ts`、`packages/core/src/turn/interaction-coordinator.ts`、`packages/core/src/turn/turn-store.ts`（470-524 行）、`packages/core/src/work/work-protocol.ts`、`packages/core/src/work/work-store-file.ts`、`packages/core/src/turn/turn-protocol.ts`、`packages/core/src/work/work-protocol.browser.test.ts`、`packages/core/src/turn/turn-protocol.browser.test.ts`、`packages/output/src/apply-revision-instruction-set.ts`、`packages/output/src/docx-zip.ts`、`packages/reading-view/src/security/docx-preflight.ts`、`docs/architecture/system.md`、`docs/decisions/ADR-009-runtime-ports-and-harness.md`、`docs/decisions/ADR-010-work-live-boundaries.md`、`docs/decisions/ADR-001-package-abi.md`（仅 grep）、`docs/status/current.md`、`archive/docs-legacy-2026-07-13/docs/04-长期Roadmap.md`（1-22 行）、`eslint.config.js`。
