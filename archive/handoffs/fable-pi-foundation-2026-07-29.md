# Fable 长会话接棒：Pi 基础线、GUI 与后续架构实现

日期：2026-07-29

角色：Fable 认领后续**实现主会话**；Sonnet 只做受约束的跑腿；同票验收仍交给独立 GPT 会话。

性质：本文件是 handoff 和召回索引，**不是权威契约**。进入会话后必须以仓库现状和下列权威文档重新核对；若本文件与它们冲突，以上位文档为准并上报。

## 一、进入会话的第一分钟

不要从聊天叙述推定状态。固定执行：

1. 核对 `git status --short --branch`、`HEAD`、`main` 与 `origin/main`，再看近期提交和 worktree/branch 清单。
2. 固定阅读：根 `CLAUDE.md` → 根 `AGENTS.md` → `docs/README.md` →
   `docs/status/current.md` → `docs/architecture/implementation-readiness.md`。
3. Pi 线再读：`docs/decisions/ADR-022-pi-lane.md` →
   `packages/pi-lane/SPEC.md` → `packages/pi-lane/ACCEPTANCE.md` →
   当前领取工单的专属回执。
4. 触 GUI 时加读：`docs/decisions/ADR-009-runtime-ports-and-harness.md`
   的 2026-07-28 pi GUI 窄例外、`docs/decisions/ADR-020-release-distribution-truth.md`、
   `apps/desktop/SPEC.md` 的相关 UI 段、`docs/design/README.md`、
   `docs/design/tokens.json`、`docs/design/principles.md`、`docs/design/voice.md`。
5. 只有在权威链读完后才消费本文件下方的归档调研；归档只提供候选、反例与历史证据，
   不得形成隐含契约。

接棒节点应满足：本地 `main` 与 `origin/main` 指向同一枚 clean tip；若不满足，先停下核对，
不得在漂移树上接着施工。本轮已进入 `main` 的两个关键 merge 是：

- `7216b2f`：`PI-WRITE-PROOF-1`，含验收修复并独立放行；
- `db4f360`：`PI-CODE-STDIO-1R2`，含 send-time acceptance fix 并独立放行。

这两枚只代表 package/headless 前置。当前产品仍不能称为完整 agent，也没有发布授权。

## 二、现在已经有什么

已经可以当作后续实现输入的事实：

- pi 读面、受控 `ExecutionEnv`、工具默认拒绝与 dev sidecar 已清账；
- 上游原版覆盖式 write 的薄 binder 已通过独立验收：保留上游 schema/metadata，
  raw 参数先门控，每次调用新 env，真实发 port 时才分配 operation；
- strict product protocol / stdio 状态机已通过 R2 独立验收：request/tc/tool/capability/
  operation 严格关联，pending/settled effect 不会被普通 finish 抹掉，send 前会重新验证 tc；
- Courtwork 的 Rust journal/projection、逐次授权和 host result 才是产品事实真源，
  Node 与 GUI 都不能另造第二份真相。

仍然**没有**：

- sidecar 分发路线裁定；
- Rust host loop、durable-before-effect journal、真实 workspace write/read-back；
- headless 通用 Markdown 任务矩阵放行；
- pi 的产品 GUI、真实 Tauri + 真模型 GUI 验收；
- 可对外发行的 agent 产品。

因此维护者个人 debug 仍是唯一允许的发布范围；不得借 build 全绿改写 README、站点或版本叙事为
“agent 已上线”。

## 三、不可打乱的收敛链

严格按唯一就绪图串行推进：

1. `PI-SIDECAR-DIST-1R4` 完成实现、回执与**独立验收**；
2. 架构角色依据放行证据裁定分发路线并回写 ADR-022；
3. `PI-HOST-LOOP-1`；
4. `PI-WRITE-HOST-1`；
5. `PI-WORKSPACE-READ-1`；
6. `PI-BASE-HEADLESS-ACCEPT`；
7. `PI-LANE-UI-1`；
8. `PI-BASE-GUI-ACCEPT`；
9. 仅在上述基础线都放行后，才开 Dossier、垂类修订、plan/source 与其他架构巧思；
10. 最后才是仅维护者个人使用的 `PI-DEBUG-BUILD-1`。

Host 不得抢跑 R4。GUI 不得抢跑 headless acceptance。Debug DMG 不得抢跑 GUI acceptance。
每票的字段、路径、禁止面和退出证据只认 ADR/SPEC/implementation-readiness；本 handoff 不补合同。

### R4 特别隔离

`codex/pi-sidecar-dist-1r4` 及其 worktree 是独立施工现场。本次清账没有合入、提交、暂存或清理它。
接棒时先检查它是否仍在长测、是否已形成实现提交/回执、是否已有新的独立验收分支；在验收 PASS
与架构裁路线之前，禁止把其报告数字、SEA 建议或 dirty bytes 当成主线事实。

## 四、Fable 的主会话职责

Fable 负责的是“掌握大局后连续实现”，不是把所有票揉成一个大 diff：

- 每次只领取一张已冻结工单；TDD 先红、边界内实现、门禁、回执、停在待异会话验收；
- 维护跨票方向、接口一致性、UI/架构的原生生长，但不得在实现会话擅改 schema、ADR 或验收标准；
- 发现契约问题只标 `[需架构拍板]`，回到架构角色；不要用实现把模糊处变成既成事实；
- 同一工单的实现与验收永远分离。Fable/Sonnet 写的票交独立 GPT 验收；
- build 绿只表示构建成立，不替代真实 tool loop、journal、effect、重启回读或产品 UI 证据；
- 保持薄 harness：优先复用 pi 原能力与成熟 OSS，Courtwork 薄层只拥有产品契约、安全门和事实投影。

长会话应维护一份很短的内部账：当前 authority、当前票、冻结文件面、依赖、未决拍板、红证、
实现提交、验收提交。不要把轮次流水账复制进根治理文档。

## 五、如何调伏 Sonnet 跑腿

Sonnet 可以在 Fable 主会话内并行做大宗机械工作，但每张子单必须是**有边界、可验证、零拍板**的。
推荐六类：

1. **仓内复用盘点**：按当前票列出 production consumer、公开导出、既有测试/fixture、可删重复；
   只报告，不重构。
2. **上游精确复核**：读取当前 exact version 的源码、license、公开 API、维护状态和破坏性变化；
   不用博客或旧报告替代一手源。
3. **行为参考刷新**：对 OpenWork/OpenCode、Open WebUI、Logue 等只提取与当前票相关的成熟交互；
   不把别人的 runtime、状态树或皮层带进来。
4. **视觉证据包**：截图、computed style、断点、溢出、对比度、状态矩阵；不替 Fable 定设计。
5. **动效/可达性机械审计**：列出 focus、aria-live、reduced motion、时长/easing、可中断性和性能点；
   不自行加动画。
6. **回执证据管理员**：核对 first-red、mutation 命中、最终门、文件范围与 SHA；不得把等价/no-op
   mutation 写成红证。

每份 Sonnet 回报固定四栏：

`claim | primary source + date/commit | current / archived / overturned | implication within frozen ticket`

Fable 必须亲自复核会改变设计或架构方向的结论；跑腿 context 不是 authority，也不能代替验收。

## 六、GUI 的已定方向

GUI 是成熟交互壳，Design 是作者性的视觉语言，两者分别解决，不要混为“套一个漂亮 chat template”。

### 技术边界

- pi GUI 只准直接消费 `@assistant-ui/react` 的 headless primitives 与公开
  `useExternalStoreRuntime` seam；
- Courtwork journal/projection 是唯一真源；adapter 只把投影翻译给 UI；
- 禁止 LocalRuntime、assistant-ui cloud、AI SDK/OpenCode adapter、私有 import、stock skin、
  thread persistence、branch/edit/queue 等未出票能力；
- GUI 的批准/拒绝只是发 command，不能先乐观改写 durable 状态；最终状态由 journal 投影回来；
- Open WebUI 0.11.0、Logue、OpenWork/OpenCode 只借成熟行为与信息组织，不接它们的 runtime；
- 基础 GUI 先把完成、Stop、逐次授权、工具过程与 workspace Markdown 只读核验做真，不提前做
  Dossier、修订、branch、memory 或装饰性复杂度。

### Design 方向

首轮只精修浅色：

- 冷白纸面要更浅，深墨/板岩要更深，建立真正的明度跨度；
- “冷色”不是廉价藏青单色：现代蓝/绿/裁决朱只承担稀缺语义；
- 扁平、版本目录学、制度化、克制的反乌托邦气质；不做 cyberpunk、霓虹、扫描线、玻璃拟态、
  大渐变、均匀圆角卡片海和 AI SaaS 蓝紫光；
- 以排版、线级、密度、版本号/坐标、状态投影与内容层级制造作者性，而不是堆装饰；
- 深色磁青宗本轮只保持 token 同构与回归，不让它阻塞浅色基础 GUI；后续单独精修；
- 既有成熟 UX 骨架与行为测试是资产，皮层迁移不等于重写交互。

Fable 已获实现自主权：方向、权威 token、参考包与禁区充足后，可以自己完成前端，不必等待所有
像素先由架构角色定死。但新增语义、跨层字段和产品能力仍必须先出票。

## 七、调研召回索引

优先消费这些现行或已登记归档：

- `archive/research-gui-design-direction-2026-07-28.md`：Moda/OpenDesign/Logue/
  Open WebUI 0.11.0/assistant-ui 的消费边界、浅色方向和 anti-slop 反例；
- `archive/benchmark-openwork-2026-07-26.md`：OpenWork/OpenCode 行为实测；注意其中部分
  queue/steer 结论后来已被 readiness 的时效订正推翻；
- `archive/pi-ecosystem-2026-07-26.md`：pi 生态、thin harness 和安全参考候选；
- `archive/research-2026-07-15-round-3/oss-gui-source-patterns.md`：GUI 成熟行为素材；
- `archive/research-2026-07-15-round-3/emil-skills-polish-input.md`：动效/完成度审计骨架；
- `docs/design/schema-exemplar.md`、`visualization-kit.md`、`signature-line.md`、
  `typography-density.md`：Courtwork 自己的视觉语法与凡例。

OpenDesign 适合让 Sonnet 采集 Identity/Colors/Typography/Spacing/Surfaces/Layout/Components/
Motion/Interaction/Voice/Don'ts 与截图/computed style，但抽取物不是 Courtwork token；
Logue 证明成熟本地工作 GUI 的信息密度与克制，不是指定设计；Open WebUI 证明成熟聊天面可继续
收窄阅读列、减轻排版、统一菜单/设置，不是可复制许可证或技术栈。

任何旧报告若版本、许可证、维护状态或消费点已经变化，直接做新的窄调研；不要为了维护旧报告
的体面而沿用失效结论。

## 八、停手与回报条件

出现以下任一项，Fable 停止扩大施工并回架构角色：

- 需要新增/改写 wire 字段、journal 语义、capability、工具表或跨层接口；
- 当前票依赖没有在 `main` 精确清账，或实现/验收 SHA 只 patch-equivalent 而非祖先；
- worktree 有不明他人改动、冲突需要选语义、或门禁需要放宽；
- OSS 许可证、公开 API、版本或 Tauri/签名兼容性与票面不符；
- R4 没有独立 PASS 却准备启动 Host，或 headless 没 PASS 却准备启动 GUI；
- 要把个人 debug 叙事升级为公开发行、Pages/README 宣称 agent 已上线。

正常完工回报必须给：基线与分支、精确改动面、first-red、真实功能证据、mutation 账、全仓门、
实现提交、专属回执、明确未覆盖项，并停在“待独立验收”。

## 九、这次分支清理的解释

本轮只清理最终 tip 已成为 `main` 精确祖先的 Write 与 STDIO R2 实现/验收分支及 worktree。
旧 STDIO-1、STDIO-1R 的拒绝分支虽然内容被 R2 组合树重放，但其原始 tip 不是 `main` 祖先，
依 AGENTS 的精确清账规则暂留；不得把 patch-id 等价冒充祖先关系。R4 与其他 sidecar 分支全部保留。

接棒者不要为了“列表好看”删除这些证据分支；待架构角色另行处理精确历史后再清。
