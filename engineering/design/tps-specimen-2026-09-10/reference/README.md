# EX-TPS1 · TPS 真实参考核验（2026-09-10）

研究与证据交付，不改产品、不做设计、不给 winner、不写 specimen。后续由 Opus 据本回执做合成数据动态 specimen。转交者报告的数字（36 结果、95 结果等）本单未重跑，不引用为事实——仅作路标读过一遍即弃。

工作树 `/private/tmp/se-agent-tps`，分支 `claude/tps-reference-specimen`，基线 main `1992e90`。仓外脚本/克隆在 `/private/tmp/se-agent-tps-scratch/`（不提交）。未运行付费 provider，未读取/复制任何个人凭据；未注册任何账号、未接受任何条款。

## 0. 必读消化摘要（供下文引用）

- `app/docs/request-telemetry.md:9`：`decodeTokensPerSecond` 与 `providerTtftMs` 恒为 `null`，因为「当前 SDK 不提供 provider token 时钟或带时间戳的 token 计数」；明文禁止用输出量/Run 总耗时或字符速率冒充 TPS。`app/runtime/request-telemetry.mjs:20` 的 `missing: ['provider_token_timing', 'token_deltas']` 是这两个字段缺口在代码里的字面名字——**当前没有任何工单认领补齐它们**。全仓搜索 `provider_token_timing`/`token_deltas` 命中的其余文件（`ex-pv1-current-state.md`、`provider-surface/intake.md` 等）均只是复述这一缺口的事实、并把 PV-18 的 error-class 缺口指向 BE-38（候选），没有任何一处把 token 时钟本身的所有权指给一个编号。
- `engineering/mvp/execution/work-surface-kit/intake-round-3.md` WK-141(b)：`TPS / TTFT → live metric + sparkline` 当期拒绝，因为会把未测量的量画成读数；`▁▂▄▇▅▆` 一类 sparkline 额外需要一条今日不存在的时间序列。
- `engineering/design/scout/README.md` §2a `projection` 行同一裁定；§1 与 §2a 的 Motion donor 行：60fps / transitions.dev / beUI 并列，**只取行为与时序描述，不复制录屏**；reduced-motion 瞬切；禁动画 `backdrop-filter`。
- Fable 的 `engineering/design/performance-specimen-2026-09-10/README.md`（分支 `claude/fable-round4d`，未并入本工作树基线，只读引用）：产品性能面当前裁定为 PV-79「一行 + 来源词，不画图」——`telemetry-view.mjs` 的 `Decode TPS` 保持 `Unavailable · no token deltas` 直到某个 provider 真的报告它；三态文字与冻结/来源词裁定见 PV-80…82。本核验不推翻这条，只为「将来 owner 给出 token 时间序列时」的候选提供事实。
- `app/web/telemetry-view.mjs:25`：当前渲染器字面量 `['Decode TPS','Unavailable · no token deltas']`，与上条一致，代码现状核对无误。
- BE-38（`engineering/mvp/execution/work-surface-kit/backend-requests.md:42`）是「请求遥测的错误类别字段」（失败/中断的 error class：认证/配额/传输/目录/取消/其他），**不是**token 时钟或 HTTP 状态的所有权工单；PV-76 的 `HTTP status` 行注记「随 BE-38 落地后才有值」，指的是错误分类落地后行内才有值可填，不代表 BE-38 拥有 token 时钟合同。PV-D9 在仓内不存在（`grep` 零命中），不援引为工单。

## 1. Donor 核验表

### A. Pi Pulse — https://pi.dev/packages/pi-pulse

| 问题 | 事实 | 证据级 |
|---|---|---|
| 测的是什么（分子） | `streamChars += delta.length`（累加 `text_delta`/`thinking_delta`/`toolcall_delta` 三类事件的**字符长度**），`tokEst(ch) = (ch>>>2) + ((ch&3)>0?1:0)`，即 **≈4 字符/token 的字符估算**，不是 provider 报告值、不是本地 tokenizer 精确计数（`src/meter.ts:15-16, 296-297`）。文档措辞 `estimated_tokens` 容易读成「已估算的 token」，源码坐实它是字符估算。 | 已运行核验（源码 + 60/60 单测通过） |
| 测的是什么（分母） | Decode 阶段：从首个输出 delta（`firstTokenTime`，由 `recordFirstToken` 在收到首个计数 delta 或非流式 `toolcall_start` 时打点）到 `message_end`/当前时刻；分母**排除** TTFT（prefill 等待）。`TPS = streamTokens / ((nowMs - firstTokenTime)/1000)`，`TPS_MIN_ELAPSED_SEC=0.3` 抑制过短响应（`src/meter.ts:299-302, 318-322`；`docs/metrics.md` 明文复述）。 | 已运行核验 |
| 时钟在哪一侧 | 宿主进程内的 `performance.now()`（可注入测试时钟），即 **host-observed 单调钟**，不是 provider 时钟、不是浏览器时钟（Pi 是 CLI，无浏览器）（`src/meter.ts:162, 165-166`）。 | 源码核验 |
| TTFT 定义 | `before_provider_request` 到首个输出 delta 或非流式 `toolcall_start`；工具调用参数流也算「输出」，停 TTFT 计时但不停留在 0（`docs/metrics.md` §TTFT；`ttft-leak.test.mjs` 专门测「无首 token 不留幻影样本」）。 | 已运行核验 |
| 是否有时间序列 | 有。滑动窗设计三层：60 秒滚动均值（`win`，容量 64）、10 分钟统计窗（`allTps`/`allTtft`，容量上限 512，超窗样本仍留在环形缓冲但被排除出统计）、sparkline 专用「最近 20 个已完成响应的 TPS 样本」（`graph`，**不随 10 分钟窗口过期**）。采样粒度是**每条完成的助手消息一个样本**，不是逐 token 打点；`TICK_MS=250` 只是流式时的活跃动画刷新间隔，不产生新统计样本（`src/constants.ts`；`docs/architecture.md` §3.3/§4）。 | 已运行核验 |
| 流式中是否实时更新 | 是，`renderLive` 在流式期间用当前 `firstTokenTime`→now 的进行时 TPS + 旋转 spinner 字符；完成后 `endAssistantMessage()` 把该消息记为一个样本并推入三层窗口，`renderFinal` 接管显示，**不再变化**直到下一条消息（本单用注入时钟脚本实际跑出该冻结行为，见 `captures/pi-pulse-render-demo.output.txt`）。 | 已运行核验（合成脚本实跑） |
| 完成后如何冻结/idle 显示什么 | 完成即冻结为 `renderFinal` 快照；**11 分钟空闲后**（超过 `ALL_TIME_WINDOW_MS=10min`）TPS/TTFT 统计项从 final footer 整体消失，只剩 `Elapsed`（累计值，永不随窗口过期），sparkline 字形本身**不随时间窗口过期**、可能仍显示旧柱形而数字统计已归零——文档称这是刻意的「稳定可读」取舍，代价是长空闲后 sparkline 与数字暂时不同步（`docs/architecture.md` §4.2）。本单合成跑出这一空窗行为：`final: Elapsed 0.6s`（见同一 capture 文件）。 | 已运行核验 |
| 视觉与动效 | 纯文本终端 footer，无独立组件层：TPS 用 10 列 braille sparkline（`brailleGraph`，每列合并 2 个采样点，按列均值着色：≥50tps 绿/`success`，≥20tps 黄/`warning`，否则红/`error`），数字用等宽字体隐含的 `tabular-nums` 效果（终端天然等宽，无需 CSS），流式时前缀一个 10 帧 braille spinner。无插值动画（数字直接跳变，无补间）、无 reduced-motion 概念（终端渲染，非浏览器）。缺值文字：streaming 阶段不足 0.3s 时 TPS 显示 `0.0`；完全无数据时 final 为空字符串（本单实跑复现，`live: ⠋ ·········· 0.0 tps` / `final: `）。 | 已运行核验 |
| 对 Courtwork 的可迁移性 | **numerator 前提不成立**：Pi Pulse 的分子是字符估算，Courtwork 的 `request-telemetry.md` 明文禁止「字符速率冒充 TPS」，若原样搬运会正好撞上这条负规则——它是一个**反例**而非可直接迁移的测量方法，但其**分母/时钟/窗口/冻结设计**（host 单调钟、decode-only 分母排除 TTFT、多层窗口分离「近期趋势」与「稳定统计」、sparkline 独立于统计窗过期）与 Courtwork 当前架构前提相容：Pi SDK 0.85.1 streamFunction 边界同样只有 host-observed 的 `firstOutputMs`/`firstTextMs`（`app/docs/request-telemetry.md` 第 9 行），若未来要做「host-observed decode rate」（不叫 TPS，需改名并加脚注，参照 PV-82 的脚注句式），分子应改用 Courtwork 已有的「serialized text ÷ 4」heuristic 或未来的精确 usage 字段，不应引入新的字符估算包装。**新 owner 合同**：真正的 provider token 时钟/带时间戳 token 序列在当前代码里无所有权（`missing:['provider_token_timing','token_deltas']` 无对应 BE 编号）——**待裁**，不发明工单号。 | — |

### B. Unsloth `MessageTiming`（固定修订 `6f443b5c`）

组件：`studio/frontend/src/components/assistant-ui/message-timing.tsx`；同修订直接依赖的计时来源：`studio/backend/core/inference/generation_timing.py`（本地 safetensors/transformers 推理路径的计时器，产出与 llama.cpp/`llama-server` 的 `timings` 对象同形状的 JSON，供 GGUF/MLX/safetensors 三条本地后端共用）；客户端兜底路径依赖外部包 `@assistant-ui/react` 的 `useMessageTiming()`（该包文档未按同一 commit 钉版，单列证据级）。

| 问题 | 事实 | 证据级 |
|---|---|---|
| 测的是什么（分子，服务端路径） | `predicted_n`：safetensors 路径下由 `model.generate()` 实际解码的 token 数（真实、精确，来自 transformers 的生成计数，非估算）；GGUF/MLX 路径同形字段来自各自推理服务器自报（`generation_timing.py:107-140`；`message-timing.tsx:69-75` 消费 `predicted_n`/`predicted_ms`/`predicted_per_second`）。 | 源码核验（固定 commit） |
| 测的是什么（分母，服务端路径） | `predicted_ms`：从「prefill 边界」（transformers 首次调用自定义 `LogitsProcessor`，即 prefill 产出 logits 之后）到 `finish()` 的墙钟时间，**两端都显式 `_wait_for_device()`**（`torch.<device>.synchronize()`）排空异步队列后才打点——docstring 明确这是为了避免「只测到 kernel 入队而非计算完成」导致速率虚高 2.7 倍的已知坑（`generation_timing.py:11-13, 25-40, 55-68`）。分母**不含** prefill 时间（`prompt_ms` 单独记）。 | 源码核验 |
| 时钟在哪一侧 | 服务端（Python 推理进程内），`time.monotonic()`，带显式设备同步等待——是三个 donor 里唯一对「时钟测到的是排队还是真实计算完成」做工程处理的实现。 | 源码核验 |
| TTFT 定义 | tsx 侧无独立 TTFT 概念；`timing.firstTokenTime`（客户端兜底路径）或服务端 `prompt_ms`（prefill 耗时，非「到首 token」的端到端等待，二者口径不同、不可互换）。服务端路径没有把「网络往返」计入任何字段——它测的是本机推理管线内部的 prefill/decode 切分，不是网络场景下的 TTFT。 | 源码核验 |
| 是否有时间序列 | **没有**。三个字段路径（diffusion / server timings / client fallback）全部是**消息完成后的一次性终值**：`predicted_per_second`、`timing.tokensPerSecond`、`timing.firstTokenTime` 均为单个数字，tsx 里没有任何逐 token 采样数组或图表数据结构（`message-timing.tsx` 全文 343 行，无 `useState`/数组累积逻辑，纯只读 hook 输出的直接渲染）。客户端兜底 `useMessageTiming()` 官方文档明确「所有指标都是消息完成时计算的一次性汇总值」，且流式过程中「Timing is finalized when each stream completes」。 | 源码核验（tsx 本身）+ 文档核验（`useMessageTiming` 未钉版） |
| 视觉与动效 | 一个等宽字体（`font-mono tabular-nums`）文本徽标（badge），点击/悬停弹出 Tooltip 明细（Popover，`variant="rich"`）；badge 本身只有 `hover:bg-*` 颜色过渡（`transition-colors`），**没有数字入场/滚动动画**，没有 sparkline，没有实时刷新态——`if (timing?.totalStreamTime === undefined) return null` 意味着流式过程中徽标可能根本不渲染，直到有 `totalStreamTime` 才出现，即**只有「无/终值」两态，没有中间进行时态**。缺值文字：字段用 `formatTimingMs`/`formatRate` 处理 `undefined`→`"—"`，不显示 0。位置：消息脚注（action bar 旁），不是独立面板。 | 源码核验 |
| 对 Courtwork 的可迁移性 | 服务端计时器（分母侧的设备同步等待）是**唯一直接可类比 Courtwork 处境**的部分：Courtwork 的 host 也是「测到自己能看见的边界」（streamFunction 的首个非空 delta），与 Unsloth 的「prefill 边界打点」同构——但 Unsloth 的分子是精确本地 token 计数（自己就是推理引擎），Courtwork 的 host 对 provider 侧没有等价可见性，这个前提在 Courtwork 不成立，不能整体照搬。UI 侧「无时间序列、纯终值 badge、无/终值两态」与 Courtwork 现有 PV-79…82（一行+来源词，不画图）**方向一致**，是一个独立信源对同一裁定的印证，不是新证据要求推翻它。新 owner 合同：provider 侧精确 token 时钟——待裁，仓内无编号。 | — |

### C. OpenRouter — https://openrouter.ai/docs/guides/overview/models

| 问题 | 事实 | 证据级 |
|---|---|---|
| 测的是什么（分子/分母） | 文档给的是**路由用的聚合统计**，不是单次请求的可展示指标：`throughput-high-to-low` = 「p50 throughput from routing heuristics」，`latency-low-to-high` = 「p50 latency」（time-to-first-token）。Best-practices 页给出总量公式：`Total Latency = TTFT(Network+Queue+Prefill) + (Output Tokens / Generation TPS)`，把 TTFT 与 TPS 明确列为两个独立阶段。`preferred_max_latency`/`preferred_min_throughput` 用「Rolling 5-Minute Window」的 p90 分位做**服务端路由决策**（选哪个 provider），不是展示给用户的实时读数。 | 文档核验 |
| Token 计数口径 | 「Different models tokenize text in different ways...You can use the usage field in the response to get the token counts」——token 计数来自各 provider/模型自己的 tokenizer，通过 `usage` 字段透传，OpenRouter 不做统一估算。 | 文档核验 |
| 是否有时间序列 | API/文档层面：**没有**，只暴露单一 p50 排序值，且「Models without data for the requested sort dimension sort last」——无数据是显式的排最后，不是伪造 0。**产品页面层面**（`openrouter.ai/<provider>/<model>`，非文档）：有。用真实浏览器对渲染后 DOM 做检查，页面加载了 10 个 Recharts 实例（`svg.recharts-surface`），其中 8 个是多线时序折线图（一个多达 14 条线，推断为逐 provider 对比）、2 个是柱状图，均带 hover tooltip；页面文案原句：「Throughput is how fast the model writes (tokens per second — higher is better). Latency is total round-trip time (lower is better). TTFT is time-to-first-token.」以及 Uptime 段：「the percentage of the past 3 days that at least one provider was responding to requests」（3 天滚动窗口）。 | 文档核验（API/docs）+ 已运行核验（真实浏览器 DOM/JS 执行，见 `captures/openrouter-recharts-dom-check.md`） |
| 视觉与动效 | 文档未描述任何视觉形式（纯 API 文档）。产品页是**仪表盘级的历史对比图表**（可切换 P50/P90/P99 百分位的 combobox + 多 provider 折线对比 + 独立 Uptime 图），不是消息内联的微型实时读数——这与 Courtwork specimen 设想的「composer/telemetry 面板里的一行/sparkline」量级完全不同，是另一类产品形态。未能截图（本轮 Browser pane 处于隐藏状态，截图 API 返回空白/超时），改用 DOM/JS 执行结果作为证据；不据此声称已核验其像素级视觉效果。 | — |
| 对 Courtwork 的可迁移性 | 「TTFT = Network+Queue+Prefill，TPS = decode-only」的阶段切分与 Courtwork `firstOutputMs`(host-observed dispatch→首 delta) 概念上同构，但 OpenRouter 的测量前提（它是网关，天然能看到 provider 端往返）在 Courtwork 当前 host（无 provider token 时钟）下**不成立**。「p50/p90 分位 + 滚动窗口」的统计设计思路（而非具体数值）可作参照，但产品形态（仪表盘折线图 vs 消息内联读数）不可迁移，PV-79…82 的「一行不画图」裁定在这一点上更贴近 Courtwork 的实际外壳约束。新 owner 合同：无——待裁。 | — |

### D. PostHog AI Playground / LLM Analytics

| 问题 | 事实 | 证据级 |
|---|---|---|
| 测的是什么 | Playground 文档原句：「The response streams in real-time into a result card below the prompt, showing...token usage (prompt, completion, cache read/write), latency, and time to first token.」LLM Analytics 的 `$ai_generation` 事件 schema（`posthog.com/docs/llm-analytics/generations`）给出精确字段：`$ai_latency`「The latency of the LLM call in seconds」（**整条调用**，未区分 TTFT/decode）、`$ai_time_to_first_token`「Time to first token in seconds (streaming only)」（独立字段，仅流式场景有值）、`$ai_input_tokens`/`$ai_output_tokens`「often found in response.usage」（provider/tokenizer 自报，非估算）。**PostHog 的 schema 里没有 TPS/throughput 字段**——没有 `$ai_tokens_per_second` 或等价物；若要算 TPS 需要产品自己拿 `$ai_output_tokens ÷ ($ai_latency − $ai_time_to_first_token)` 二次推导，PostHog 本身不提供。 | 文档核验 |
| 是否有时间序列 | Playground 结果卡是**单次调用的终值展示**，不描述流式过程中的中间读数刷新细节。LLM Analytics 事件本身是逐次调用的埋点，可在 PostHog 的标准 insights/dashboard 里按时间聚合（这是通用产品分析能力，不是这个指标专属的可视化设计），文档未描述任何 sparkline/实时波形。 | 文档核验 |
| 视觉与动效 | 两处文档均未描述具体像素形态（无组件截图、无 CSS/动效说明），只有字段级描述。Playground 页描述了功能行为（「响应实时流入结果卡」「点击 abort 可中途取消」）但不描述视觉动效细节。 | 文档核验（描述本身不完整，非核验疏漏——这是该文档的实际详尽程度上限） |
| 对 Courtwork 的可迁移性 | 唯一直接可迁移的事实是「latency 与 TTFT 是两个独立字段，前者不能替代后者」，与 Courtwork `request-telemetry.md` 的「TTFT 与 Run 总耗时是不同区间」的既有裁定同向，是又一个独立信源的印证。PostHog **没有原生 TPS 字段**这件事本身是一条有用的反向事实：连一个成熟的 LLM 可观测性产品都不认为 TPS 是应当由平台层直接提供的原子字段（它更像一个应用层派生值）——这对「TPS 该不该是 Courtwork 的一等公民字段」是一条弱支持负面证据，供 Opus 参考,不构成裁决。新 owner 合同：无——待裁。 | — |

### E. 通用 Motion（60fps.design / transitions.dev / beUI，仅取行为，≤6 条）

| 条目 | 行为 | 证据级 |
|---|---|---|
| transitions.dev · Number pop-in | 单值变化时的「数字翻转 + 模糊 + 错峰」入场（"Digit flip with blur and stagger"）。 | 源码核验（原文 HTML 逐条确认） |
| transitions.dev · Spinning counter | 数字像老虎机滚轮转到目标值（"Digits spin like a reel to the value"）。 | 源码核验 |
| transitions.dev · 站内 reduced-motion 统一约定 | 全站 9 处独立 `@media (prefers-reduced-motion: reduce)` 块，一致做法是 `transition: none` 且清空 `transform`——**硬切到终态**，不是缩短动画时长。 | 源码核验 |
| beUI · Number Ticker（`number-ticker.tsx`） | 首次入场用错峰滚动（slot-machine），源码注释明文：「入场后的后续数值变化，每个数字立即滚动，不再逐位延迟——逐位延迟在实时更新上会读成卡顿」——即**入场动效与实时更新动效应当是两套时序**，不能对每次数值刷新都重放入场的错峰。默认单字滚动时长 0.18s、错峰间隔 0.006s。 | 源码核验（实时页面代码示例） |
| beUI · reduced-motion 处理 | 与 transitions.dev 不同的第二种约定：`duration: reduceMotion ? min(duration, 0.12) : duration`，`delay: reduceMotion ? 0 : position*stagger`——**钳制到 ≤120ms 且去掉错峰延迟**，而非硬切为 0。两个 donor 对 reduced-motion 的处理不是同一套数值，不可平均，若 Courtwork 要定规则需二选一或自定新值，不能引用「行业惯例是 X ms」。 | 源码核验 |
| 60fps.design · Counter / Ticker 标签存在 | 108 个标签的完整索引中确认 `Counter`、`Ticker` 均存在（与既有已核验的 AI/Badge/Blur 等标签同一页面来源）。本轮未逐条打开单个 storyboard 观看录屏（遵照「只取行为，不复制录屏」的既有裁定），因此不对任一具体 shot 的动效细节做核验声称。 | 源码核验（标签存在）／未核验（具体 shot 行为） |

## 2. 对 specimen 的事实约束清单（陈述事实，不给 winner）

1. **Courtwork 当前没有任何 owner 字段可以支撑真实 TPS/TTFT 时间序列**：`missing: ['provider_token_timing', 'token_deltas']` 是代码里的字面事实，无对应 BE 工单；PV-79…82（一行 + 来源词，不画图）是当前唯一裁定，本核验不推翻。
2. **一旦未来有 owner 给出 token 时间序列，采样粒度先例不是逐 token**：Pi Pulse 是「每条完成消息一个样本」；PostHog 是「每次调用一条埋点」；OpenRouter 产品页折线图采样间隔未能核实（图表数据来自加密的 RSC 流，静态抓取拿不到具体点位）。三个可核实的 donor 里没有一个是「每个 token 一个采样点」的细粒度序列——如果 Courtwork 未来做 sparkline，先例更支持「按消息/按 turn 采样」而不是逐 token 打点。
3. **冻结语义有直接可运行的先例**：Pi Pulse 的 `renderFinal` 在消息完成后产出一份不再变化的快照，本单已实跑复现；空闲超过统计窗口（它是 10 分钟）后，速率类字段整体从显示中消失，只保留单调递增的累计量（`Elapsed`），不用 0 或占位符填充过期统计——这与 Courtwork `request-telemetry.md` 的「Missing is unavailable, never zero」同向。
4. **缺值文字先例**：Pi Pulse 用空字符串或 `0.0`（依上下文）；Unsloth badge 用 `"—"`；两者都不用「暂不支持」类文案，与 Courtwork 现有 `telemetry-view.mjs` 的 `Unavailable · no token deltas` 句式（具体说明缺什么）相比更简省，**不构成推翻现有句式的理由**，只是标注业界还有更简省的另一种做法存在。
5. **reduced-motion 没有单一行业数值**：至少存在两种独立约定（transitions.dev 的硬切 `transition:none`；beUI 的钳制到 ≤120ms）。Courtwork 现有裁定是「reduced-motion 瞬切」，与 transitions.dev 一致；beUI 的钳制式是另一种候选，供 Opus 对照，不建议不加说明地引用「beUI 用 120ms」作为 Courtwork 的数值依据。
6. **入场动效与实时刷新动效需要分离**：beUI Number Ticker 的源码注释明确反对「每次数值更新都重放错峰入场」，这是一条具体、可执行的负面案例，值得写入未来的 TPS specimen 设计判据（如果做数字滚动，仅首次挂载错峰，之后的数值更新走无错峰的即时替换）。
7. **产品形态差异**：OpenRouter 的 throughput/latency 可视化是仪表盘级多 provider 历史对比折线图（10 个 Recharts 实例），量级和目的与「消息脚注/composer 面板里的一行读数」完全不同；不能把 OpenRouter 页面的视觉复杂度当作 Courtwork specimen 的参照系。
8. **TPS 不是所有同类产品的一等字段**：PostHog 的 `$ai_generation` schema 没有原生 TPS/throughput 字段（只有 latency 与两个 token 计数），需要应用层自己派生。这是这次核验里唯一一条「不是每个可观测性产品都认为 TPS 值得单独测量并展示」的证据，仅供参考。
9. **分子来源的两极案例都已核实存在**：Pi Pulse 是纯字符估算（`chars/4`，与 Courtwork 现有 context-estimate 的启发式同量级，但用途不同——一个估算 token 数用于计费/容量，一个估算 TPS 用于速度展示）；Unsloth 服务端路径是精确本地 tokenizer 计数（因为它自己是推理引擎）。Courtwork 的 host 两者都不是——它既不是推理引擎（没有精确计数权）也不该把字符估算包装成 TPS（现有负规则已禁止）；这两个真实先例进一步坐实了「Courtwork 现状下无法在不新增 provider 侧合同的情况下产出一个诚实的 TPS 数字」这一结论，而不是提供了绕过它的办法。

## 3. 证据分级总览

| Donor | 分子/分母 | 时钟 | 有无序列 | 证据级 |
|---|---|---|---|---|
| A. Pi Pulse | 字符估算(chars/4) ÷ decode-only 时长 | host 单调钟（可注入测试） | 有（消息级采样，三层窗口 + 独立 sparkline 缓冲） | 已运行核验（60/60 单测通过 + 合成脚本实跑冻结/过期行为，见 captures） |
| B. Unsloth MessageTiming | 服务端：精确本地 token 计数 ÷ 设备同步后的解码墙钟；客户端兜底：外部 hook 汇总值 | 服务端：Python 进程 `time.monotonic()`；客户端：浏览器 | 无（消息完成时的一次性终值，无逐 token 序列） | 源码核验（固定 commit `6f443b5c`）+ 文档核验（`useMessageTiming` 未钉版部分） |
| C. OpenRouter | 文档层：p50 路由统计，无单次请求分子分母细节；产品页：per-provider 图表，采样口径未公开 | 服务端聚合（滚动 5 分钟窗口用于路由） | 文档层无；产品页有（历史折线图，10 个 Recharts 实例，已用真实浏览器 DOM 确认） | 文档核验 + 已运行核验（DOM/JS，无像素截图） |
| D. PostHog | `$ai_output_tokens`(provider usage) ÷ `$ai_latency`（整条调用，未区分 TTFT），无原生 TPS 字段 | 未文档化（推断为服务端/SDK 侧） | 无原生时间序列（标准事件聚合，非该指标专属可视化） | 文档核验 |
| E. Motion（60fps/transitions.dev/beUI） | 不适用（行为参照，非测量指标） | 不适用 | 不适用 | 源码核验（transitions.dev、beUI 逐条）；标签存在核验 + 未核验具体 shot（60fps） |

## 4. 未能运行项及原因

- OpenRouter 产品页的像素级截图：Browser pane 在本轮处于隐藏状态，`computer screenshot` 返回空白/超时（工具报错：「The Browser pane is currently hidden. The page is not rendered while it is not displayed」）。改用 `javascript_tool` 对已渲染 DOM 执行只读检查（recharts 节点计数/类型），证据级降为「已运行核验（DOM）」而非「已运行核验（视觉）」，未据此声称已看到实际折线图像素效果。
- 60fps.design 具体 Counter/Ticker storyboard 的录屏行为：未打开，遵照仓内既有裁定「只取行为，不复制录屏」，且逐条打开 108 个标签下的具体 shot 超出本单核验范围；标注为「未核验」而非用文档措辞代为推断。
- Unsloth 前端组件（`message-timing.tsx`）未做浏览器内实际渲染（它依赖 `@assistant-ui/react` 完整运行时与 Tooltip 组件树，搭建一个可运行的 React 宿主超出「只读核验」范围）；改为源码逐行核对 + 单元级手推（无 mock 渲染截图）。
- OpenRouter/PostHog 均未创建账号、未发起真实 API 调用（两者的核验范围仅为公开文档与公开产品页只读内容）。
- Pi Pulse 未在真实 Pi CLI 宿主内运行（需要安装/配置 Pi agent 环境，超出本单授权的「仓外 scratch 只读研究」范围）；改为在 scratch 目录 `git clone` 官方仓库、`npm install`/`npm test`/`npm run build` 后用一段注入模拟时钟的脚本直接调用其 `dist/meter.js` 逻辑，这是对同一份真实源码的直接执行，但不等同于在真实 Pi 宿主里观察到的完整交互行为（例如它如何真正接入 `before_provider_request`/`message_update` 事件总线，本单未连真实事件源，是用脚本手动调用等价 API）。

## 5. Scratch 与进程清理确认

- 所有克隆/构建产物位于仓外 `/private/tmp/se-agent-tps-scratch/`（`pi-pulse-repo/` 含 `node_modules/`、`dist/`；未安装任何需要凭据的依赖；`npm install`/`npm test`/`npm run build` 均为公开 npm 包，无认证令牌参与）。
- 未启动任何常驻进程/服务器（无 `npm run dev`、无本地端口监听）；`render-demo.mjs` 是一次性 `node` 脚本，运行后立即退出，无遗留后台任务。
- Browser 工具会话仅做只读导航/DOM 查询，未提交任何表单、未登录任何账号、未接受任何条款/Cookie 弹窗的非隐私选项。
- 本仓（`/private/tmp/se-agent-tps`）内除 `engineering/design/tps-specimen-2026-09-10/` 外无其他改动；未触碰 `app/`。
