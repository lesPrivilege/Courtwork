# SPEC: packages/core（W6）

状态：既有 TURN/INTERACTION 已验收；现行工单 `CONFIRM-CAS-1` 待实现，后续 `CORE-BOUNDARY-1` / `TURN-WORK-1` 受 ADR-009 约束

## 现行架构工单（2026-07-14）

### CONFIRM-CAS-1 · Work confirmation 原子消费

权威：[ADR-009](../../docs/decisions/ADR-009-runtime-ports-and-harness.md)。`resumeScenario` 不得先 destructive `take()` 再校验回答。实现必须在零事件、零 revision、零 artifact 变更的阶段完成 actor、decision、revisions 与 pending identity 的全部验证，再以 expected identity/version 条件消费；同 request id 的保存不得覆盖，竞争消费只有第一笔成功。未知、非法、重复回答均不消费 pending，原有 file-store 跨实例续行继续成立。

范围只限 `ConfirmationStore`、`resumeScenario`、相应测试与本 SPEC/ACCEPTANCE 留痕；不改 SessionEvent/schema 字段、Turn interaction、UI、provider 或场景语义。验收必须实际注入非法 actor/decision/revision、重复保存、两次消费和 fresh file-store instance。

## 已完成架构工单（2026-07-13）

### PROVIDER-1 · core 边界收口（已实现，待独立验收）

依据 ADR-007，provider port、DeepSeek profile、OpenAI wire、SSE、结构化输出与计价已迁至 `packages/provider`。core 生产逻辑直接消费同一 `Provider` / `Generation*` 协议，`ScriptedProvider` 测试形制不变；旧 `src/provider/` 实现目录已清空，`src/provider-compat/` 仅保留三个一行薄重导出以兼容既有 core 子路径，不含第二份实现或 DeepSeek wire 分支。下文 T-provider/HARNESS-0.1 段落属于迁包前历史记录，其中 custom 可用与实现住 `src/provider/` 的陈述已由 ADR-007 和本节取代。

### TURN-1 · 模型回合生命周期（已实现并独立验收）

权威：[ADR-007](../../docs/decisions/ADR-007-provider-turn-protocol.md)。core 消费 `@courtwork/provider` 的瞬态流并发布 provider 无关的 turn 生命周期：turn、assistant message、reasoning 的 started/delta/completed，usage，completed/failed。持久层至少保存最终正文、可选 reasoning、usage 与失败；瞬态 delta 不要求逐片落盘。取消、失败、空正文、无 reasoning 均需确定性终态，UI 不得靠计时器猜测状态。

reasoning 只按模型生成内容处理，不具有证据、坐标或裁决权；不得由系统伪造。TURN-1 不实现任意 tool calling，不改垂类 schema。

实现留痕（2026-07-13）：

- `src/turn/turn-runner.ts` 逐事件消费 `Provider.stream()`，发布 `turn_started`、assistant message 与 reasoning 的 started/delta/completed，以及唯一 `turn_completed | turn_failed`。provider 生命周期事件都携同一 `providerRequestId` / `turnId` 与连续递增的 core `seq`；首次运行从 0 开始，interaction 续行则紧接 journal 已有序号。
- provider 流必须从 `started@seq=0` 开始，后续 provider 协议内的 `requestId` 与 `seq` 必须逐项一致；该 provider 身份在 core 持久/发布面显式命名为 `providerRequestId`。provider/model 身份漂移、重复 usage、越序、缺终态、终态后仍有事件均拒绝，并收敛为单一 `invalid_response` 失败。provider 的完成事件在流真正结束前不发布为成功，避免“先成功、后发现终态后事件”的双终态。
- 正常 completed 但正文为空或仅空白时转 `turn_failed`；provider `failed`、AbortSignal 与流外异常均确定性收敛。reasoning 使用 `{ status: 'present'; content } | { status: 'absent' }`，无 reasoning 时不发布伪造的 reasoning 事件。
- `src/turn/turn-store.ts` 提供内存与 append-only JSONL 终局快照存储；跨实例可重建最终正文、可选 reasoning、usage、finish reason 或失败，瞬态 delta 不落盘。相同 `turnId` 不得覆盖既有历史。
- 本工单没有实现 interaction、desktop UI、模型自主 tool calling 或任何垂类 schema，也未改 ADR。

### INTERACTION-1 · 受控提问与续行（INTERACTION-1B 已实现，待独立验收）

core 只接受 registry 已解析的 `templateId + anchorRefs` 请求。校验通过后追加不可变 `interaction_requested` 并暂停 turn；回答追加 `interaction_resolved` 后续行。未知模板、非法选项、越权/失效锚点必须失败，刷新后未决交互必须可重建。批量确认与已有 artifact confirmation 语义不被本工单改写。

请求事件必须内嵌当时解析的模板快照（requestId/turnId/packageId/templateId/kind/question/options/skippable/系统解析后的 `SourceAnchor[]`），不得在回放时重新读取可能已升级的 manifest。回答只允许 `{ kind: 'option'; optionId } | { kind: 'skip' }`；逐项验证、一次性消费，并记录 actor。模型输出的 bbox/textRange 永不直接成为锚点。

`anchorRefs` 精确复用 strict `QuoteClaim[]`：`none` 只准空数组，`optional` 可空，`required` 至少一条；只要任一 claim 未命中、多义或文件不可达，整次请求零落账。Turn 事件公共基字段只含 `turnId/seq/emittedAt`；provider 生命周期使用 `providerRequestId`，交互使用 `requestId`，禁止一名两义。

Interaction 持久事件进入 `TurnStore` 的 append-only journal，不进入 `SessionEvent`，也不复用 artifact `ConfirmationStore`。回放必须重建 `pending_interaction`；pending 时 `runTurn` 在调用 provider 前拒绝。回答校验与 resolved 追加在 store 内原子完成，非法/重复/并发回答不能覆盖首答；合法回答后状态为 `resolved_waiting_resume`。

INTERACTION-1B 实现留痕（2026-07-14）：

- `TurnEvent` 公共基字段收窄为 `turnId/seq/emittedAt`；provider 生命周期与 `PersistedTurn` 使用 `providerRequestId`，interaction 事件只使用自己的 `requestId`，不再一名两义。
- `TurnStore` 保留 `save/get/list` 终局兼容面，并以同一 append-only journal 算法增加 `appendInteractionRequested/resolveInteraction/events/replayTurn`。回放闭集为 `idle | pending_interaction | resolved_waiting_resume | completed | failed`；重复 request、同 turn 第二请求、终态后请求、非法/重复回答均零落账。回答检查与 CAS append 在 store 内完成，并发只允许首答成功。
- `requestInteraction()` 只接受 `{turnId,requestId,packageId,templateId,anchorRefs: QuoteClaim[]}`；以 package/template 双键读取 registry 快照，严格执行 `none/optional/required`，并对获准 `MaterialTextLayer[]` 逐条调用既有 resolver。任一 strict shape、`not_found`、`ambiguous` 或 `file_unavailable` 失败均整体拒绝；journal 只保存白名单模板字段与 resolver 铸造的完整 `ResolvedSourceAnchor[]` 快照，不保存材料全文、transport、prompt 或 key。
- `resolveInteraction()` 在 store 内验证非空 actor 与 `{kind:'option',optionId}|{kind:'skip'}` 闭集；未知 option、不可 skip、未知/已解决请求不消费 pending。`runTurn()` 在调用 provider 或发布事件前读取回放状态，pending 时 provider 调用严格为 0；resolved 后沿同一 turn `seq` 续行。
- 新增 browser-safe `@courtwork/core/turn-protocol`：导出 types、`runTurn`、coordinator、`TurnStore` 与可注入 CAS backend 构造，运行时依赖图不含 `node:*`。JSONL 文件 adapter 独立于 `@courtwork/core/turn-store-file`；协议子路径不导出它，desktop 后续可注入 localStorage/Tauri backend 而不复制校验算法。
- 本工单未修改 `SessionEvent/EventLog/replaySession`、旧 `ConfirmationStore`、provider/Rust、registry/legal/PM/schema、desktop 或任意 tool calling。

## 职责

Headless agent core。协议化对外（会话/事件流），UI 是纯客户端；provider 无关；场景执行器是核心。

## 要点

- agent loop 自研，只借鉴 pi-mono 的设计形状（极简、协议化、provider 无关的 Provider 抽象）；不引入其代码依赖；不把场景/schema 逻辑写进这层壳。
- 场景执行器：从 registry 取场景定义 → 编排（工具调用 / 生成）→ 产出符合 schemas 的 artifact → **停在确认节点**，等待客户端确认事件后继续。数据驱动、零场景特判：`outputArtifacts` 声明顺序即产出顺序。
- 事件流协议：会话事件（进度、artifact 产出、确认请求/解决、修正记录、进度快照、步骤失败、完成、错误）以可序列化事件对外发布——W9 桌面端与测试脚本共用同一协议。
- Provider 封装：模型 id/参数来自配置，禁止写死；接 eval/ 的选型结论；不含工具调用能力（场景是声明式固定编排，工具调用由执行器编排，不是模型自主选择）。
- RevisionEvent 捕获：客户端对 artifact 的每次修正经 core 落盘（追加写 JSONL）。
- 信源等级传播与门禁：证据台账 + 通用门禁函数，等级判定在装配点声明，通用机制不认识任何具体工具/场景。
- 装配点：`src/composition/demo-assembly.ts` 是全仓库唯一 import `@courtwork/demo-data` 的运行时文件。

## 验收

无 UI 跑通 S3 全流程：输入合同 → RiskList artifact（依据含信源等级）→ 用户确认（脚本模拟，含一条真实字段修正）→ 修订指令集 → 调 output 产出 docx。全程事件流可回放。CLI 入口：`pnpm --filter @courtwork/core demo:s3`；自动化断言：`src/acceptance/s3-flow.integration.test.ts`。

## HARNESS-0 快批实现记录（2026-07-12）

- DeepSeek standard 显式发 `thinking:{type:'disabled'}`，不依赖 V4 默认思考态。
- `ProviderQuirkProfile.parameterCompatibility` 登记结构化输出×深思互斥；Qwen 自动降为 standard，`GenerationNotice` 随 `artifact_produced.providerNotices` 发布，禁止静默。
- transport 仅重试明确返回的 429/5xx；超时与不确定网络错误不重试，避免同一生成重复计费。
- S3 golden 同时检查事件骨架与预埋锚点（至少 5/7）；DIFF 设非零退出，空 `RiskList` 不再假绿。resolver/合同正文组装照 `b2ba682` 留给 PACKAGE-ABI 之后的 HARNESS-1。

## HARNESS-0.1 / Provider 历史决策（2026-07-12；现由 ADR-007 取代冲突项）

本节保留当时实现源流，不再定义现行产品准入。2026-07-13 起以 [ADR-007](../../docs/decisions/ADR-007-provider-turn-protocol.md) 和 `packages/provider/SPEC.md` 为准：通用 OpenAI-compatible adapter 保留，但 custom 产品入口与任意 base URL 退役，当期只登记 DeepSeek。

- **当时的 0.1 主路径**：具名 quirk profile、factory、价格表、真实 smoke 与桌面 provider 选项只保留 DeepSeek；当时曾保留通用 OpenAI-compatible 工厂与 custom 入口作为扩展 ABI，后者现已由 ADR-007 废止。
- **Qwen 与火山方舟豆包移入 roadmap**：core 不再猜测其 reasoning 响应字段、结构化输出档位或参数互斥，也不暴露具名工厂/计价/冒烟目标。后续由团队或上游插件带官方文档、真 key wire 实证、变异必红测试后接入。
- HARNESS-0.1 同批补齐的历史实现：转发目标绑定 Rust 侧最近一次成功探针确认的 base URL；异 host 即使路径合法也拒绝。该实现会在 PROVIDER-2 改为从受控 DeepSeek descriptor 解析目标；不能据此重新暴露 custom 产品入口。

## TODO（跨层放入区）

- [已解决 2026-07-11，PRV-1] `ProviderQuirkProfile` 增加推荐模型与声明式 reasoning route；统一解释器把 standard/deep 映射为 DeepSeek 模型切换、Qwen `enable_thinking`、OpenAI 兼容系 `reasoning_effort`。传输与 UI 均不按 providerId 写分支；桌面端经 `@courtwork/core/provider-quirks` 收窄子路径消费，避免把 Node-only core 模块带进 WebView bundle。

- [架构拍板 2026-07-10，T-provider.1 增强] **schema 部分命中的 loop 推进 = 分片验证 + 定点重试 + 部分成功诚实呈现**：数组型 artifact（RiskList/Timeline/FileOpsPlan 条目）逐条 zod 校验，良品入库；次品携具体校验错误定点重生成（重试预算按条目计，走配置）；预算尽仍缺则按 docs/architecture/system.md 三态诚实呈现（"已识别 5/7 项，2 项未通过校验"+ 重试入口），不静默丢弃不假装完整。UI 配套：推理/思考流默认折叠（spark-lines 标识，docs/design/principles.md）。接真实流式 provider 后实现。

- [架构拍板 2026-07-10，T-provider 范围澄清] **凭证与计费形态正交建模**：provider 配置含 `auth.kind`（`api_key` | `oauth_subscription`，当期只实现前者，判别字段现在预留）与 `billing.kind`（`metered` | `plan`）。metered 下 RuntimeGuard.maxUsd 生效；plan 下护栏切换为额度/次数、UI 用量圆盘显示套餐余量而非美元（UI 侧归 polish）。**合规红线：订阅制只接官方明示允许第三方工具接入的（开放 OpenAI 兼容端点型）；模拟官方客户端/借用会话 token 的灰色桥接永不做。** OAuth 设备流 + refresh token 钥匙串存储为 T-provider.2 增量工单，待首个官方开放的 plan 类 provider 需求拉动。

- [架构拍板 2026-07-10，源自 B 阶段验收发现] **批量确认的协议语义 = 永远逐条**：确认响应必须携带逐条目处置（confirmed/rejected + 字段修正），"批量确认"只是 UI 聚合手势，协议层不存在"一个 confirm 代表一批"的语义——个别条目被驳回/修正时不得统一上报 confirm（审计与 RevisionEvent 完整性要求）。接真实后端前由 UI 侧（polish）与本层协议文档双向核实；demo stub 期间为已知边界。
- [已解决 2026-07-10] ~~**Timeline 事件结构化标记**：schemas 增量——TimelineEvent 加可选 `markers?: string[]`...demo-data timeline.json 的 4 处预埋矛盾事件补 markers 字段~~——`TimelineEvent.markers?: string[]` 已交付（`packages/schemas/src/timeline.ts`，JSDoc 注明词表仅 "contradiction"，随 ContradictionList 类型落地后收编；JSON Schema 已重新导出过 drift，详见 `packages/schemas/SPEC.md` 验收记录）。`demo-data/data/artifacts/timeline.json` 已按 `case-bible.md` 第六节 4 处矛盾点的权威事件映射，为 8 个事件（evt-08/14/17/20/24/28/31/33）补 `markers` 字段（`evt-25` 系矛盾点3的背景诱因描述、非清单列出的矛盾对成员，不打标记——原 TODO"4 处"指 4 处矛盾点类别而非 4 个事件，矛盾点2/3/4 各自对应多个事件，详见 `demo-data/data/manifest.md` 变更记录）。UI 改为消费 `markers`（替代此前 description 文本匹配"矛盾"二字的做法）留给 polish 承接，未在本次范围内改动。

- [架构拍板 2026-07-10，依据 docs/architecture/system.md] **Provider wire format 基线**：OpenAI Chat Completions 兼容格式为唯一主基线（国内六家 + vLLM/SGLang 私有化全部对齐）；**Anthropic 为具名例外**，纳入选型时走原生 Messages API 适配器，不做通用双基线。适配层须带 per-provider quirk 处理（docs/architecture/system.md 清单：base URL 差异、response_format 三档支持与静默吞参陷阱、reasoning 字段命名、参数互斥）。**结构化输出统一策略**：strict json_schema 优先 → 降级 json_object + zod 校验重试（校验失败即重试非放行，次数走配置）。MVP 首批接入：DeepSeek + 阿里百炼 Qwen + 火山方舟豆包；GLM（结构化证据弱）与 MiniMax（静默吞 response_format，违背本仓库反静默降级哲学）不进首批。eval 真实基线可先用 DeepSeek key 解锁（成本最低、门槛最低）。[2026-07-10 增补] 甜点区候选池扩充观察项：腾讯混元 Hy3 / Meta Muse Spark 类"上代前沿水平 ~1/10 价"模型是本架构目标客户（docs/product/vision.md 推论），确认 OpenAI 兼容端点与结构化输出档位后进 eval 评测，quirk 档案按 docs/architecture/system.md 方法补。

  **落地记录（T-provider 工单，2026-07-10）**：上述拍板已实装于 `src/provider/`——`quirk-profile.ts` 固定三家静态配置（base URL/response_format 档位/reasoning 字段候选，Qwen/豆包的 reasoning 字段候选标注为推测非证实）；`http-client.ts` 是 streaming-only 传输层（始终 `stream:true` + 读完整个 SSE body 再解析）+ transport 级重试（HARNESS-0 后仅明确返回的 429/5xx 重试；超时/不确定网络错误为防重复计费不重试；401/403 与其余 4xx 立即失败）——超时检测用 `Promise.race` 覆盖整条 fetch+读流链路（复用 `packages/tools/contract.ts` 的 `runOnce` 既有模式），不是只在连接阶段的 try/catch（code review 抓到并修复的真实缺口：body 阶段超时曾会漏判成未转换的 AbortError）；`structured-output.ts` 落地 strict→json_schema→json_object 三档 + zod 校验重试（`ProviderInvalidResponseError`，`suspectedSilentParamSwallow` 标记全部尝试均未产出合法 JSON 的情形，成功路径返回剥围栏后而非原始带栏内容——同样是 code review 抓到的真实缺口）+ `tier:'unsupported'` 直接拒绝调用（MiniMax 判例的通用反静默降级机制，用测试专用合成 profile 验证，未接入真实 MiniMax）；`GenerationRequest`/`GenerationResponse` 只做可选字段增量（`responseSchema`/`reasoningContent`/`usage`），`ScriptedProvider` 与既有手写假 provider 零改动、全部既有测试零回归。`RuntimeGuard.checkUsd` 补齐真实 enforcement（`pricing-table.ts`，RMB→USD 近似汇率，仅收录 docs/architecture/system.md 给出完整双价的三个型号，未知组合诚实跳过而非当作零成本——回归测试用负数 maxUsd 真正区分“跳过计价”与“算出零成本后侥幸未超预算”两种情况，同为 code review 抓到的测试强度缺口）。

  **同日架构增量拍板（凭证与计费形态正交建模）**：provider 配置新增 `auth.kind`（`'api_key' | 'oauth_subscription'`）与 `billing.kind`（`'metered' | 'plan'`）两个判别字段，当期只实现 `api_key`+`metered`（首批三家不变），落入 `types.ts`（provider 无关，非绑死在 openai-compatible-provider.ts 这一具体 wire format 实现文件里——初版误放该文件、code review 抓到后迁移）。未实现分支命中时抛出新增的 `ProviderNotImplementedError`（呼应 `packages/tools/contract.ts` 既有的 `NotConfigured`/`NotImplemented` 语义区分，而非误用"缺配置"语义）。合规红线随字段落档：订阅制只接官方明示允许第三方工具接入的（开放 OpenAI 兼容端点型）；模拟官方客户端/借用会话 token 的灰色桥接永不做。OAuth 设备流 + refresh token 钥匙串存储是独立的 T-provider.2 增量工单，不在本工单范围。

  **Barrel 导出的收窄纠偏**：初版机械照搬"全部导出"惯例，把 `sse.ts`/`http-client.ts`/`structured-output.ts` 三个各自只有唯一内部消费方的实现细节层也导出了；code review 指出本仓库 `packages/output`/`packages/reading-view` 已有"公开契约与内部 helper 分文件时分层导出"的先例，据此收窄为只导出 `quirk-profile.js`/`errors.js`/`pricing-table.js`/`openai-compatible-provider.js` 四个真正的公开面（Provider 抽象本身 + 三家具名工厂 + 调用方可能需要 instanceof 判断的错误类型 + 可能需要预估成本的计价函数）；`smoke.ts` 同理不进 barrel（唯一消费方是 `scripts/smoke-provider.ts` 这个 CLI 脚本，不是包的公开 API）。同一批修复顺带把 `pricing-table.ts` 的 `TokenUsage` 并入 `types.ts` 的 `GenerationUsage`（此前是内部无害的同形重复，barrel 收窄前就已存在，但 pricing-table.ts 仍在公开面里，两个同形异名类型继续暴露在公开 API 上仍不合适，一并解决）。

  **已知限制（如实记录，不是遗留缺陷）**：① 价格表数字是 docs/architecture/system.md 2026-07 调研快照，生产使用前需对照官网刷新，且未覆盖每家的全部型号（只收录文档给出完整 input+output 双价的型号），豆包价位取自最低档位（短输入区间），代码注释已标注真实长合同场景大概率高于此估算；② 未暴露 `temperature`/`top_p`/`n` 等采样参数——当前无场景需要，且天然规避 docs/architecture/system.md quirk④/⑤ 两处参数互斥坑，未来若要开放，需先补对应 quirk 处理；③ Anthropic 具名例外、GLM/MiniMax 均不在本工单范围（后两者结构化输出证据弱/静默吞参，SPEC 已拍板不进首批）；④ 真实网络验证需要真实 key（`scripts/smoke-provider.ts`，本机无 key，跑通的是"正确识别缺 key 并跳过、且网络层失败时能展开 error.cause 给出可操作诊断"这一诚实结果）；eval 真实基线仍是 eval/SPEC.md 已有 TODO，留给有 key 的会话把 `promptfoo/*.promptfooconfig.yaml` 的 `providers:` 换成本工单产出的真实 provider——本工单不改 eval/ 任何文件；⑤ Qwen/豆包的 reasoning 字段名（`reasoning_content`）是沿用 DeepSeek 已证实字段名的推测默认值，未经文档证实，代码注释已标注，实测后可能需要修正。

- [W6.1 微工单，2026-07-10 拍板，源自 sol review 裁决 2] **最小审阅遥测事件**：事件协议新增三个事件类型——`review_item_opened` / `review_evidence_expanded` / `review_disposition_submitted`（各带 sessionId/itemRef/时间戳），供确认质量分析（"秒批"识别在分析侧，MVP 只告警不阻断）。不采原始输入流；隐私归 docs/decisions/ADR-005-data-security.md 使用遥测档。TDD、独立 commit，不改既有事件语义。

- [已解决 2026-07-10] ~~事件流协议设计时假设存在远程瘦客户端与异步确认~~——`ConfirmationActor`（渠道无关身份标识）+ `PendingConfirmation`（打包续行所需的一切并落盘，`ConfirmationStore`）+ `resumeScenario` 接受全新构造的依赖实例（模拟另一进程）。file store 测试证明"指向同一磁盘状态的全新实例能正确接续"不是类型层面的空话。W6 未实现任何真实网关适配器，协议不隐含确认方与 core 同进程/同机/同客户端。
- [已解决 2026-07-10] ~~session 续行与会话链~~——`src/session/types.ts` 的 `Session{id, chainId, predecessorSessionId?}` + `createSession`/`continueSession`。W6 未实现续行本身（结构化再水化按钮是 W9 之后的事），只保证 `sessionId` 贯穿事件与确认记录、artifact 按引用而非内联复制，未来接 `chainId` 不需要改动现有协议形状。
- [已解决 2026-07-10，依据 docs/architecture/system.md 调研] ~~长任务协议五点~~——①`deriveTodoSnapshot` 纯函数（场景声明 + 当前产出/暂停位置 → todo 快照），LLM 不参与撰写增删，`todo_snapshot` 事件在每次暂停前与全部完成时发布；②`step_failed` 事件覆盖工具调用粒度（`@courtwork/tools` 的失败契约本身已是结构化降级，不抛异常，这里只是把"发生过一次工具级降级"显式发布到事件流），生成节点级失败仍保持显式抛出中断，不预先构建未经验证的 Saga 式部分成功恢复语义（docs/architecture/system.md 5.3 节明确把跨步骤补偿/子agent并行归为 W8 ingest-v1 场景层的事）；③`createRuntimeGuard`（`maxSteps`/`maxSeconds`/`maxToolCalls` 真实enforcement，`maxUsd` 目前只是类型层面占位——假 provider 无真实费用、真实 provider 未接入，无成本信号可核对，诚实注明 enforcement 待补，不假装已经在管），缺省不限制，MVP 默认行为不变，具体阈值留给场景实测调整；④确认门禁检查点已具体化为 `PendingConfirmation.remainingArtifactTypes`（场景步骤位置）+ `producedArtifacts`（已确认 artifact 内容，按值携带）；⑤摄取子agent并行未进 core（本层没有任何相关代码，留给 W8）。另借 Manus"待办复述进上下文末尾"技巧：`generateArtifact` 的请求 payload 把 `todo` 作为最后一个插入键，JSON 序列化后真的落在请求内容末尾。deepagents 整体架构未引入。

## 验收记录

- 2026-07-10：W6 完成。开工前先完成 W2.1 微工单（`packages/registry` YAML 声明加载 strict 化，独立提交 `21c4492`）与两处跨层文档修正（CLAUDE.md 技术基线更正 `6cc21bc`；registry SPEC 场景执行语义补注 `3814cc9`），随后交付本层。

  **架构判断点（开工前与用户逐条确认，均获批准）**：
  1. **pi-mono 借形不借库**：license 未核实、且依据 docs/decisions/ADR-002-schema-workflow.md（场景是声明式固定编排，工具调用由执行器编排而非模型自主选择）通用 agent loop 的核心能力（模型自主选工具）本就用不上——引入依赖是负资产。agent loop 自研，只借鉴 Provider 抽象的设计形状与"极简协议化"哲学。CLAUDE.md 技术基线已同步更正为如实表述。
  2. **`outputArtifacts` 声明顺序即执行顺序**：数据驱动、`core` 零场景语义，`toolIds` 全部前置一次性执行，label-only 门禁落产出序列尾。已同步补注为 `packages/registry/SPEC.md` 的显式契约语义（跨层文档补注，架构显式授权），避免未来场景作者把它当无序集合处理。
  3. **信源等级台账走事件流，不改 schemas**：等级判定（`sourceId→grade`）在装配点声明，通用门禁函数不认识任何具体工具/场景，台账不塞进 schemas 定义的 artifact 本体——`artifact_produced` 事件携带台账投影（`evidenceGrades`），W9 渲染信源角标不需要改 schemas。已在 `packages/schemas/SPEC.md` TODO 区留一条观察记录（若未来需要跨 session 持久化角标，可能需要给 `RiskBasis`/`Citation` 加字段，非本层实现，供架构拍板参考）。

  **六项交付**（D1–D6，均含 TDD 测试）：
  - **D1**（`src/provider/`）：`Provider` 接口（`id`/`modelId`/`generate`，不含工具调用能力）+ `ScriptedProvider`（录制回放假 provider，测试与 CLI 演示专用，不依赖真实 API）。
  - **D2**（`src/scenario-executor/`）：`runScenario`/`resumeScenario`。用 S3（1 产出/1 门禁）与 S1 真实连线形状（3 产出/2 门禁）两种场景验证泛化性；`resumeScenario` 用全新构造的依赖实例（模拟另一进程）验证过能正确接续。
  - **D3**（`src/events/`、`src/session/`）：`SessionEvent` 判别联合（七种基础事件 + docs/architecture/system.md 追加的 `todo_snapshot`/`step_failed`）+ 落盘事件日志（`createFileEventLog`）+ 纯函数 `replaySession`；`Session` 会话链类型；`ConfirmationStore` 落盘续行状态。
  - **D4**（`src/evidence/`）：`EvidenceLedger` + `assertCitationAdmissible` 通用门禁——C 级且未确认拒绝，A/B 级或已确认放行，非工具来源（台账无记录）放行。
  - **D5**（`src/revision/`）：`RevisionEventStore` 追加写 JSONL；`resumeScenario` 应用 `revisions[]` 时构造合规 `RevisionEvent`、落盘、用 `applyJsonPointer` 真实应用回 artifact，并重新发一次 `artifact_produced`（否则 replay 只能重建出修正前状态）。
  - **D6**（`src/composition/demo-assembly.ts`）：全仓库唯一 import `@courtwork/demo-data` 的运行时文件；`projectPartyRecord` 是 `packages/tools` 测试里"提前演示装配点长什么样"投影函数的生产标准正式落地。

  **docs/architecture/system.md 长任务协议追加**（架构会话在本层开工后新增的拍板，commit `e919539`，本次一并纳入而非留作遗留）：`todo_snapshot`/`step_failed` 事件类型、`createRuntimeGuard` 运行时保护、Manus"待办复述进上下文末尾"技巧。详见上方 TODO 区已解决记录。

  **验收流程**（`src/acceptance/run-s3-demo.ts`，CLI 脚本与集成测试共用同一实现）：加载 registry 真实 `S3.yaml` → `runScenario`（`party-verify` 走 demo-fixture 适配器，B 级信源记入证据台账）→ 落盘暂停于 `RiskList` 确认门禁 → 全新依赖实例模拟另一进程 `resumeScenario`（confirm + 一条真实 `RevisionEvent` 字段修正）→ 编译确认后的 `RiskList` 为 `RevisionInstructionSet`（demo glue，过 D4 门禁，不进 core 通用库——依据 docs/decisions/ADR-004-documents-and-files.md S5 设计先例：产出是 `RevisionInstructionSet` 不代表编译逻辑归通用层）→ 调 `output.applyRevisionInstructionSet`（复用 `packages/output` 自带 sample docx）产出带修订与批注的 docx → 全新 `EventLog` 实例重读磁盘完整历史并 `replaySession`。7 条指令 6 条（clause 级，引文取自 output 黄金样例合同真实文本）定位成功，1 条（`risk-07`，party-verify 来源，依据锚点在 demo-data 卷宗文件、不在 output 的 stand-in docx 里）报 `locator_not_found` 后被跳过——测试显式断言这一结果，是"报错并跳过、不错插"纪律的真实展示，不是缺陷。人工核验：`unzip` 产出的 `redline.docx`，`comments.xml` 含 6 条真实中文批注文本（非乱码/空壳）。

  **设计取舍**：
  - `S3_RISK_LIST_RESPONSE`（`src/composition/s3-risk-list-response.ts`）有意分两层，不假装无缝：案件/主体层沿用 demo-data 真实语料（临江精铸诉起云智能），文档文本层改用 output 黄金样例合同的真实文本（而非 demo-data 主合同文本）——因为 demo-data 主合同目前只有 markdown 形态，还没有对应的 docx（"markdown → 新建 docx"是 output 包 W4.1 挂账工单，未排期），硬套两份不同合同的引文只会让指令定位全部失败，不是更真实，是自欺。
  - 场景执行器的通用算法（`produceSequence`）一次性写对多产出顺序遍历与 label-only 门禁逻辑，用后续新场景形状（S1）补测试覆盖此前未触达的分支，而非拆两次 TDD 增量各写一半——循环体是不可拆分的单元，拆开写反而会先写出残缺分支再回来补。
  - `resumeScenario` 应用 `revisions[]` 后必须重新发一次 `artifact_produced`：这是集成测试跑通 S3 全流程时发现的真实设计缺口（不是测试造假）——原设计只在内存里改了 `pending.producedArtifacts`，从未写回事件流，导致"事件流可回放"对修正后的状态是假话。修复后 7 处既有测试的事件序列断言相应更新。
  - `ScenarioExecutorDeps.limits`（运行时保护）按次 `runScenario`/`resumeScenario` 调用单独计额，不跨暂停边界累计——真正的 runaway 循环更可能发生在一段执行 leg 内部，跨 session 累计预算是产品/计费层面的问题，超出"运行时保护"的工程含义，刻意不做。
  - `ToolDefinition<any, any>`（`src/tools/tool-registry.ts`）：异构工具注册表在类型层面没有比"受控 any + eslint-disable-next-line"更干净的表达，已实测 lint 通过。
  - `SessionEventInput = Omit<SessionEvent, ...>`：普通 `Omit` 在判别联合上不分发（`keyof (A|B)` 只保留公共键），会把类型塌缩成只剩 `BaseEvent` 字段——改用 `T extends unknown ? Omit<T,K> : never` 触发分发式条件类型逐个联合成员处理。这类问题只有 `tsc` 真实 build 能捕获，vitest 的 esbuild 转译层做类型擦除、不做类型检查，type-only import 甚至不需要目标真的存在对应导出——干净环境复核阶段（`pnpm --filter '!@courtwork/eval' -r run build`）额外发现并修复了两处同类问题（`executor.ts` 里 `ConfirmationActor` 与 `events/types.ts` 重复定义导致 `index.ts` 的 `export *` 冲突；`ScenarioDefinition` 误从 `@courtwork/schemas` 导入，实际应来自 `@courtwork/registry`）。这是"不能只信 `pnpm test`，必须实测 `build`"这条纪律在本层的具体案例，记录以免遗忘。
  - `packages/core/package.json` 从骨架阶段就带 `test`/`lint` 脚本——W5 验收记录过"包缺脚本导致 `--filter` 静默 no-op 假绿"的先例，本层不重犯。
  - 工具链：沿用 W1/W5 记录过的坑（`typescript` 锁 `^6.0.3`；`@types/node` 声明在本包自己的 `package.json` + `tsconfig.json` 显式 `"types": ["node"]`）；`scripts/demo-s3-flow.ts` 故意不在 `tsconfig.json` 的 `include` 范围内，沿用 `packages/schemas/scripts/generate-json-schema.ts` 的既有模式（独立可执行脚本走 workspace 级 `tsx` 二进制，不进 `dist/`，不声明为本包依赖）。

  **实测记录**：`find . -name node_modules -type d -prune -exec rm -rf {} +` → `pnpm install` → `pnpm test -- packages/`（285 例全绿，覆盖 schemas/registry/tools/demo-data/output/core 六包，不含 eval）→ `pnpm lint`（无 error）→ `pnpm --filter '!@courtwork/eval' -r run build`（6/6 非 eval 包通过，含新增的 core）。全部在移除全部 workspace 包 `node_modules` 后的干净环境重新 `pnpm install` 复核过，非增量安装的残留假绿。`pnpm --filter @courtwork/core demo:s3` 单独重跑验证 CLI 入口。

  **工作区纪律遵守**：全程未触碰 `eval/` 目录任何文件；仓库命令统一用路径过滤（`vitest run "packages/"`）或包过滤（`--filter '!@courtwork/eval'`）排除 eval；`git add` 全程显式路径，未使用 `git add -A`/`.`；开工期间架构会话并行落地的多个跨层文档提交（防呆交互调研 `872d8c5`、长任务架构调研 `e919539`、安全合规调研等）均只读取相关部分、未触碰其文件本身。

  **通用层纪律自查**（docs/decisions/ADR-001-package-abi.md）：`src/` 下不含任何法律领域词汇——领域味仅出现在 `src/composition/`（装配点 + demo glue，docs/decisions/ADR-001-package-abi.md/docs/decisions/ADR-004-documents-and-files.md 明确允许的例外角落）与验收脚本的 fixture 数据里。

- 2026-07-10：W6.2 整改（承接 `ACCEPTANCE.md` 的"不放行"结论，两项契约级阻塞 + 两项记录件）。

  **阻塞①（RevisionEvent 无法直接定位 session）**：`@courtwork/schemas` 的 `RevisionEventSchema` 增加可选字段 `sessionId?`（纯增量，见 `packages/schemas/SPEC.md` 验收记录）。`RevisionEventStore.record()`（`src/revision/revision-store.ts`，内存与落盘两个实现）在 schema 校验之上强制要求 `sessionId` 存在，缺失即抛 `MissingSessionIdError`，写入被拒绝、文件不落笔。`executor.ts` 的 `buildRevisionEvent` 从 `PendingConfirmation.sessionId` 取值填入。复验：`s3-flow.integration.test.ts` 新增独立读 revision store（不经事件流旁证）的断言，证明每条落盘记录自带可直接定位的 `sessionId`。

  **阻塞②（citation 展示文本可绕过 C 级门禁）**：`@courtwork/schemas` 的 `RevisionInstructionSet.Citation` 增加可选不透明字段 `evidenceKey?`（纯增量）。`EvidenceLedger`（`src/evidence/grade.ts`）新增 `issueKey(candidateKey)`——candidateKey 命中台账记录原样返回，未命中返回 `undefined`。门禁函数（改名为 `assertEvidenceKeyAdmissible`，见下）签名改为 `(ledger, evidenceKey: string | undefined)`：只认 key，不接受也不解析任何展示文本；`evidenceKey` 缺失或无法在台账解析到记录，一律按 C 级未确认处理（fail closed）。`compileConfirmedRiskListToRevisionInstructions`（`src/composition/compile-risk-list-to-revisions.ts`）在编译期用 `issueKey()` 对每条 `RiskBasis.citation` 做一次精确匹配签发；命中则交给门禁按等级判断，未命中视为非工具来源（如直接的法条原文，或本案 risk-07/party-verify 那样展示文本经润色不再与台账 key 字面相等的情形）继续免检——这条边界维持现状，不是本次修复的目标，本次堵住的是"key 一旦正确签发后，citation 展示文本再怎么编辑都不能让门禁改判"这一类。复验：`grade.test.ts` 新增测试直接复现 W6 验收报告的原始反例（ledger key `web-search`，C 级未确认；citation 展示文本改写为"网络参考：web-search"），证明门禁结论不受展示文本影响，仍正确拦截；`grade.test.ts` 另有测试覆盖 `evidenceKey` 缺失/无法解析两种 fail-closed 分支；`compile-risk-list-to-revisions.test.ts` 新增测试锁定"未命中不回归"边界（risk-07 一类场景继续编译成功）。

  **记录件①（命名清理）**：`assertCitationAdmissible` → `assertEvidenceKeyAdmissible`，`InadmissibleCitationError` → `InadmissibleEvidenceError`（纯改名，无外部消费方，`packages/core/src/index.ts` 是 barrel export 但仓库内无 core 之外的导入方）。grade.ts 原先提到"修订指令集/docx 批注/卷宗原文"的两处注释随门禁重构一并改写为通用措辞（不再需要那些具体措辞），"非工具来源示例（如直接引用法条原文）"的说明移到了允许带领域色彩的 composition 层（`compile-risk-list-to-revisions.ts`）。

  **记录件②（eval 对 demo-data 的例外范围）**：已由 `docs/decisions/ADR-001-package-abi.md` 的 2026-07-10 澄清段落解决（生产链路运行时代码禁止直接 import `@courtwork/demo-data`，测试文件与 eval 数据集构建脚本是合法消费方，不受此限）——不在本工单范围内，未触碰。

  **回归**：本次未执行 `rm -rf node_modules && pnpm install`——改动零涉及任何 `package.json`/依赖，且工作目录当时有并行会话（eval/ 侧 W7.1 补验）在跑，删全仓 node_modules 有跨会话风险，遂在现有环境直接验证（依赖零变更时，clean-install 仪式验证的"增量安装残留假绿"风险不适用；干净环境安装复核建议留给下一次真正改了依赖的层）。`pnpm test -- packages/`：37 个文件，**297/297** 通过（W6 基线 287 + 本次新增 10 例：schemas 3 例、core grade.test.ts 5 例、revision-store.test.ts 2 例）。`pnpm lint`：零 error。`pnpm --filter '!@courtwork/eval' -r run build`：6/6 非 eval 包真实 `tsc` 通过。`pnpm --filter @courtwork/core demo:s3` 重跑：`redline.docx` 39,713 bytes——与 W6 验收记录字节数完全一致；`unzip -t` 零错误；`word/comments.xml` 6 条 `w:comment`、`word/document.xml` 6 条 `w:commentReference`，与 W6 记录一致；指令结果 risk-01~06 `applied`、risk-07 `locator_not_found`，与 W6 记录一致；事件类型序列（`artifact_produced → todo_snapshot → confirmation_requested → confirmation_resolved → revision_recorded → artifact_produced → todo_snapshot → scenario_completed`，共 8 条）与 W6 记录一致。`pnpm --filter @courtwork/core test` 单独复跑：15 个文件，**91/91** 通过（W6 基线 84 + 本次新增 7 例）。全程无回归。

- 2026-07-10：T-provider 工单完成（provider 适配层从配置化占位升级为真实 OpenAI 兼容客户端）。

  实测记录（沿用 W6.2 先例，本次未执行 `find . -name node_modules -type d -prune -exec rm -rf {} +` 与 `pnpm install` 干净重装——本工单全程零新增依赖，`package.json` 唯一改动是新增一条 `scripts.smoke:provider`，且仓库当前有多个并行会话在共享同一工作目录跑，删全仓 node_modules 有跨会话风险，遂在现有环境直接验证）：`pnpm --filter @courtwork/core test`——22 个测试文件，**156/156** 通过；`pnpm --filter @courtwork/core lint`（`eslint .`）——退出码 0，零 error、零告警输出；`pnpm --filter @courtwork/core build`（`tsc -p tsconfig.json`）——退出码 0，零 error、无输出；`pnpm --filter @courtwork/core smoke:provider`——退出码 0，DeepSeek/Qwen（阿里百炼）/豆包（火山方舟）三家均因缺少对应环境变量（`DEEPSEEK_API_KEY`/`DASHSCOPE_API_KEY`/`ARK_API_KEY`）被正确判定为"跳过"并打印修复指引（含 `*_MODEL_ID` 覆盖说明），无一被误判为"已验证通过"；`pnpm test -- packages/`（全仓库 packages/ 口径，作为无跨包回归的广义 sanity check）——64 个测试文件，**607/607** 通过。交付对照 5 项：①OpenAI Chat Completions 兼容客户端（`http-client.ts`，SSE/超时（Promise.race 覆盖完整 fetch+读流链路）/transport 重试，测试断言凭证不进错误对象）；②quirk 层（`quirk-profile.ts` 三家 + `structured-output.ts` 的档位选择/reasoning 归一/静默吞参检测机制）；③结构化输出统一策略（strict→json_schema→json_object + zod 重试，成功路径返回剥围栏内容，失败态 `ProviderInvalidResponseError` 语义对应既有 `invalid_response`）；④凭证纪律（`auth.kind`/`billing.kind` 判别字段 + 构造期 `ProviderNotConfiguredError`/`ProviderNotImplementedError` 分类拒绝 + 多处测试断言错误对象不含 key + `RuntimeGuard.checkUsd` 真实 enforcement，用负数预算测试真正区分"跳过"与"零成本"）；⑤真实冒烟脚本（`scripts/smoke-provider.ts`，无 key 自动跳过并说明，网络层失败展开 `error.cause`）。全程 `GenerationRequest`/`GenerationResponse`/`RuntimeGuard` 只做可选字段/新方法增量，未修改任何既有必填契约，`executor.test.ts`/`runtime-limits.test.ts` 既有用例零回归。同日架构增量（凭证/计费形态正交建模）与一处 barrel 导出收窄纠偏（详见上方 TODO 落地记录）均在工单执行期间由 code review 发现并当场收敛，未遗留到验收阶段。
- [已解决 2026-07-12] ~~GOAL-1 留痕:desktop 浏览器端需要 createOpenAICompatibleProvider,core exports 纯增 ./provider-openai 与 ./provider-types 两条子路径(与 ./provider-quirks 同型;index 全家桶含 Node-only event-log 不可被浏览器端消费)——跨包阻塞性实现级修复,三条件合规(语义等价/本处留痕/完工回报标出)。~~——两条子路径已落地并被 desktop 实际消费(src/provider/chat-client.ts、model-config.ts),发版验收核对补账。连带纪律注记(2026-07-12 验收实测):desktop 对 core 的**运行时**消费一律走子路径;`import type` 直引全家桶包名为允许例外——esbuild 整句擦除,生产构建产物 grep node:fs/readFileSync 零命中,不触发浏览器端崩溃;运行时 import 全家桶仍为禁区。

## FABLE-HARNESS · HARNESS-1 正戏（2026-07-13，实现留痕）

- **六段组装器**（src/assembly/）：契约段（core 常量：身份/红线五条/四知说明书——知推理/知输出寻址制/知回填按址收货/知交互封闭动词集；底座中性话零垂类词）→ 声明段（包正文+步骤树）→ 租户段（席位固定）→ 续行投影（账本序号版本化 + rehydrationProjection 声明式执行，docs/decisions/ADR-005-data-security.md 七节首实现）→ 会话与语料（材料全文置 `<<<材料:开始/结束>>>` 显式数据边界，携 sha256）→ 视图映射段（本次步骤地址 + 信封地址原文 + todo 复述——docs/architecture/system.md 技巧正名归宿）。寻址信封 target 以 zod literal 锁死（错址=schema 拒收）。byte-stable golden 两座（合成 + legal.S3 真 manifest）+ 段来源正交断言（改声明只动声明段/改材料只动会话段/账本推进不动前三段）+ ref 字面值禁上 wire 断言。
- **引用 resolver**（src/citation/）：「模型出引语，系统出坐标」——唯一精确匹配铸 start/end/textLayerVersion，页/块声明收窄候选域，多义拒收携命中次数，终验等式 quote===slice 公证自检。执行器三拍：首过公证→受限修复重试一轮（携原判与失败原因）→终局剪枝（不收敛单元入 outOfCoverage，诚实 partial）。citationStats 随 artifact_produced 入账本（docs/decisions/ADR-003-evidence-and-anchors.md）。
- **兜底四层**：①触发兜底——`./generic-chat` 子路径（通用对话最小组装，desktop chat-assembly 消费）；②校验兜底——修复重试+out_of_coverage（上项）；③渲染兜底——desktop 通用结构视图（见 apps/desktop）；④加载兜底——registry 准入拒载不传染（见 registry SPEC）。
- **executor 迁 ABI**：ScenarioRuntime + 注入式 ArtifactSchemaRegistry/ProjectionRegistry（中央 ARTIFACT_SCHEMAS 退役，F-4 穷尽性由准入闭合接位）；confirmationPolicy none×副作用工具运行时门（双门第二道）；todo 快照升级声明步骤树源（stepId 对齐纲要）；materials 随输入进、随 PendingConfirmation 封存。**包域律机器守卫** `package-boundary.test.ts`：机器层零垂类 import/字面量（composition/acceptance 装配白名单），守卫在施工期真咬过一次自家注释（「卷宗」措辞被抓），非空转。
- **S3 真跑收官通道**（src/acceptance/run-s3-real.ts + scripts/real-s3-run.ts，`real:s3`）：真卷宗 → ReadingView → 六段组装 → 真 provider → 草稿 → 铸锚 → 门禁暂停；**无 key 无全文**（provider 缺席在读材料前拒跑）；**assert-no-demo-in-real** 四断言（provider 非 scripted/事件流零 demo-fixture/材料集恰真/锚点全指真材料）违规非零退出；真机证据七项落 real-run-evidence.json。真 key 真跑为用户手动项（key 不在本会话环境）。
- **变异矩阵 8/8 全红**（放行标准·变异必红）：契约段抽条/多义放行/信封松绑/枚举词表门旁路/none 门旁路/修复重试旁路/防污染断言空转/golden 回退双向——逐项回退机制其测试必红，全部恢复后 839/839 绿。
- 依赖增量：`@courtwork/legal`（装配/验收层白名单内）+ `@courtwork/reading-view`（材料文本层派生，同白名单）——依赖面变更随单报架构。

## LEGAL-DEMO-RUN · 全链穿越通道 + 防过拟合守卫（2026-07-13，实现留痕）

- **全链穿越通道**（src/acceptance/run-legal-demo.ts + scripts/legal-demo-run.ts，`demo:legal`）：合同 PDF → ReadingView → 六段组装 → 模型（Scripted/真 key 双档同管线）→ RiskList 真锚 → 门禁逐条处置（7 确认 + 1 驳回，全量 RevisionEvent 留痕）→ 编译修订指令（驳回项不编译）→ 修订 docx 落产出。八站结构化目击记录（stations[]）+ provider 接缝 wire 目击器（六段标记物逐请求断言）+ 逐锚复算（quote===slice 不采信 resolver 自述）随产物落 workDir/legal-demo-evidence.json；黄金对照（事件骨架 15 事件/预埋考点 ≥5/锚点复算/修订命中）任一不符非零退出。真 key 档挂 real 运行时并强制 assert-no-demo-in-real。集成测试 legal-demo-run.integration.test.ts 把穿越锁成常驻门禁（含双跑指令集字节稳定；docx zip 级哈希循 B 阶段安装包判例不作断言对象——fflate zip 条目携时钟 mtime）。
- **锚点消费方契约（首跑目击，判例入册）**：SourceAnchor.textRange 的坐标系是"块自己的坐标系"——PDF 页内（每页 rangeBase=0，跨页区间重叠）、md/docx 文档级。消费方必须先按 textLayerVersion（携 page 佐证）选块，再在块内做区间与逐字校验；裸拿 range 找块必错页。任何锚点消费面（溯源 hover/click）接真 PDF 卷宗时同守此约。
- **assert-no-demo-in-harness**（src/no-demo-in-harness.test.ts，与 assert-no-demo-in-real 成对，用户点名的防过拟合隔离审计）：机器层（composition/acceptance 白名单外）零 demo 素材指纹（夹具文件名/样板案主体/案号/装配点标识 11 枚）、零 fixture 特调分支（id 字段×字符串字面量比较的正则指纹）、零 golden 考点引语内嵌（docx 档 + PDF 档共 14 条考点住 demo/legal 包与验收层）；防空转自检（扫描器对植入样本必报警）+ 成对/注入点自证。施工期变异实证 2/2 红：resolver 植入素材名、executor 植入 fileId 字面分支，均被咬，还原后全绿。
- **材料装配增量**（src/composition/demo-assembly.ts）：buildLegalDemoRunRuntime()（PDF 档剧本回放 S3_PDF_DOSSIER_DRAFT + party-verify 查对方主体临江精铸）+ LEGAL_DEMO_MATERIAL_PATHS（生成 PDF 原件/docx 修订孪生/信用查询单）。剧本与考点住 @courtwork/legal demo 包（见 legal SPEC）；docx 孪生生成器住 demo-data（见 demo-data SPEC）。
- **确定性边界（目击记录）**：system 侧四段跨跑字节稳定；user 侧语料段内嵌工具信封，checkedAt 为核验时刻证词随真实时钟走——跨跑 user wire 哈希不同是正确行为（组装器对相同输入的字节稳定由 assembly golden 守护）。
