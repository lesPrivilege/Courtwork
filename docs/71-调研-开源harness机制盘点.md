# 调研 71：开源 coding harness 机制盘点（2026-07-13）

定位：workharness（docs/70 论文 + docs/68 审计所述席位）是对 coding harness 的功能取舍与减法。本文盘清各家源码机制，判定哪些可直接取形。**纪律：取形不取码**（判例：pi-mono 只借设计形状不引依赖；MIT/Apache 的个别小工具函数标"可评估 vendored"，其余一律形状级）。

**方法与置信度标注**：标 ✓ 者为本次实抓（raw 源码全文或目录全表，2026-07-13）；标 ※ 者为训练语料所知形状（截至 2026-01），路径以现仓为准。两处仓库结构已漂移并在文中注明：Cline 2026 重构为 bun monorepo（旧 `src/core/*` 路径全部失效，机制现居 `sdk/packages/core` 等，✓ package.json 实抓证实）；OpenHands 主体架构迁入 `All-Hands-AI/agent-sdk`（✓ condenser 实抓于新仓）。

我方席位速查（对表用）：六段确定性组装器（byte-stable）｜续行投影（禁 LLM 压缩）｜引用 resolver｜确认门禁｜事件流协议｜provider 层（OpenAI 兼容基线 + quirk 表 + 三级结构化降级）｜单飞行请求律｜修剪四候选（turn 级 / 小模型 summarize / 工具记录 / webfetch 脏 context）｜chatspace 滚动轻摘要｜包准入 registry。

---

## 一、机制清单矩阵

判定图例：**直取**=直接取形｜**改取**=改造取形｜**不适**=不适用（coding 特有或与既裁架构冲突）。

### 1. OpenCode（sst/opencode，MIT，TS/Bun + Effect，client/server 架构）

| 机制 | 实现要点 | 源码位置 | 判定 | 对应席位 |
|---|---|---|---|---|
| 会话状态 | 每 message/part 独立 JSON 落盘，session 可树状（父子子会话）、可 share/resume | `packages/opencode/src/session/`（✓ 同目录 session/processor/message-v2/schema） | 改取 | 事件流协议、账本 |
| context 压缩 | compaction 作为 user message 的 **part 落账**；由专门 `compaction` agent（可配独立小模型）产摘要；tail_turns 默认保 2 turn，保留预算 `min(8k, max(2k, usable*0.25))`，turn 内可再二分（splitTurn）；压缩请求自身溢出时 stripMedia + 工具输出截 2000 字符；auto-continue 注入 synthetic user part（`metadata.compaction_continue`） | `packages/opencode/src/session/compaction.ts`（✓ 全文） | 改取（主链禁 LLM 压缩，但"压缩即落账、可回放"形状归 chatspace 轻摘要） | chatspace 滚动轻摘要 |
| 工具输出修剪 | `prune()`：从尾往前累计工具输出 token，满 PRUNE_PROTECT=40k 保护带后，把更老的 completed tool part 输出打 `compacted` 时间戳抹除；净省 >PRUNE_MINIMUM=20k 才执行；`skill` 工具受保护 | 同上 `prune`（✓） | **直取** | 修剪四候选·工具记录 |
| 事件流与 UI 桥 | headless server + HTTP/SSE，TUI（Go）/桌面/插件皆消费同一 API；bus 事件 + EventV2Bridge | `packages/opencode/src/server/`、`src/bus/`（※） | 直取（我们 core↔desktop 已同形，可对表校缺） | 事件流协议 |
| provider 抽象 | models.dev 目录注册表（模型元数据外置数据包）+ AI SDK 装载；`provider/transform.ts` 做 per-provider 消息变换（Anthropic cache_control 断点注入、字段归一） | `packages/opencode/src/provider/`（※） | 直取（transform=quirk 表的函数式表达；models.dev=quirk 表数据外置先例） | provider 层 quirk 表 |
| 权限门 | permission 规则（allow/ask/deny，按工具/glob），per-agent 可配 | `packages/opencode/src/permission/`（※） | 改取（我们门禁是场景声明式，规则式留作工具级细粒度参考） | 确认门禁 |
| 插件钩子 | 压缩 prompt 可被插件替换/注资（`plugin.trigger("experimental.session.compacting")`） | compaction.ts（✓） | 改取 | 包准入 registry |
| 错误分型 | 压缩失败分型 `ContextOverflowError` 带用户可读语义 | compaction.ts（✓） | 直取 | 错误分型 |

### 2. Codex CLI（openai/codex，Apache-2.0，Rust workspace）

| 机制 | 实现要点 | 源码位置 | 判定 | 对应席位 |
|---|---|---|---|---|
| 事件流协议 | Op（提交队列）/Event（事件队列）双队列协议化，core 为 headless 引擎，TUI/exec/MCP-server 皆前端 | `codex-rs/protocol/`、`core/src/event_mapping.rs`（✓ 目录实抓） | 直取（与我方事件流协议同构，可对表） | 事件流协议 |
| 会话持久化/resume | rollout：JSONL 逐行 append（会话元 + response items），resume/fork = 重放；`~/.codex/sessions` | `core/src/rollout.rs`（✓ 存在确认） | **直取**（请求重放录制的成熟形） | 账本、golden 通道 |
| context 压缩 | 阈值触发注入摘要指令产 bridge 历史；含 remote 变体 | `core/src/compact.rs`、`compact_remote.rs`、`context_manager/`（✓） | 改取 | 修剪候选 |
| 确认门 | approval policy（untrusted/on-request/on-failure/never）× sandbox policy（read-only/workspace-write/full）**二维分离**；execpolicy 白名单解析已知安全命令 | `core/src/safety.rs`、`exec_policy.rs`（✓） | 改取（"审批策略与能力边界二维正交"的形状值得留；命令白名单不适） | 确认门禁、文件操作分级（docs/47） |
| 沙箱 | macOS Seatbelt / Linux Landlock 进程级沙箱 | `core/src/sandboxing/`、`landlock.rs`（✓） | 不适（不执行模型生成代码） | — |
| 重试与流恢复 | 流断线重试、退避封顶 | `core/src/responses_retry.rs`（✓） | 直取 | provider 层 http 重试（我方已有，对表校缺） |
| provider 抽象 | wire_api 双协议（responses/chat）+ per-provider ModelProviderInfo（base url、env key、重试上限、context window 覆盖）——quirk 表的 Rust 版 | `core/src/client.rs`、model_provider 配置（✓/※） | 直取 | provider 层 quirk 表 |
| 子 agent | delegate 派生子线程会话 | `core/src/codex_delegate.rs`（✓） | 不适（固定编排无自主派生） | — |
| prompt 缓存 | 稳定前缀（固定 system/instructions 序）+ 启动预热 | `core/src/session_startup_prewarm.rs`（✓ 存在） | 直取（组装器稳定序即缓存序——我方 docs/70 已立论，此为实现旁证） | 六段组装器 |
| hooks | 生命周期钩子运行时 | `core/src/hook_runtime.rs`（✓） | 改取 | 包准入 registry |

### 3. Aider（Aider-AI/aider，Apache-2.0，Python）

| 机制 | 实现要点 | 源码位置 | 判定 | 对应席位 |
|---|---|---|---|---|
| 错误分型 | **上游异常穷尽性守卫**：litellm 异常全集清单化为 `ExInfo(name, retry, description)`；加载时遍历 litellm 命名空间，"上游有而表里无登记即抛错"；实例级细分（同类异常按 body 再分型，如 402 insufficient credits 判不可重试） | `aider/exceptions.py`（✓ 全文） | **直取**（我方 quirk 表正缺这种机器守卫；表结构本身 Apache-2.0 可评估 vendored） | provider 层错误分型 |
| repo map | tree-sitter 抽符号 + PageRank 按对话相关性在 token 预算内动态选图 | `aider/repomap.py`（※） | 不适（功能层面）；原理即"确定性投影"，我方续行投影是其领域对偶 | 续行投影（旁证） |
| 编辑格式与自愈 | SEARCH/REPLACE 多级模糊匹配；格式错误回喂重试（max_reflections=3） | `aider/coders/editblock_coder.py` 等（※） | diff 不适；"错误回喂限次自愈"改取 | 三级结构化降级 |
| prompt 缓存 | cache_control 注入 + `--cache-prompts` + **缓存保活 ping**（定时空请求维持 Anthropic 5 分钟缓存） | `aider/models.py` 等（※） | 改取（保活 ping 对长门禁等待场景有直接价值） | provider 层缓存 |
| 历史摘要 | ChatSummary：weak model 对超预算历史递归对半摘要 | `aider/history.py`（※） | 直取 | 修剪四候选·小模型 summarize |
| 成本记账 | 每响应算 token 费用累计展示，价格表随模型元数据 | `aider/models.py`（※） | 直取 | 成本/用量记账（席位空缺） |

### 4. Cline（cline/cline，Apache-2.0，TS；2026 重构为 monorepo `sdk/packages/*` ✓）

| 机制 | 实现要点 | 源码位置 | 判定 | 对应席位 |
|---|---|---|---|---|
| streaming 解析 | 流式文本增量解析工具标签，part 带 `partial` 标志供 UI 实时渲染半成品 | 旧 `src/core/assistant-message/parse-assistant-message.ts`，现居 `@cline/core`（※ 路径以现仓为准） | 改取 | schema 面流式渲染（席位空缺） |
| diff 流式匹配 | SEARCH 块流式到达即匹配：行级精确→行 trim→块锚点三级回退 | 旧 `assistant-message/diff.ts`（※） | 不适（diff 应用器）；三级回退匹配形状通用 | 引用 resolver（模糊定位参考） |
| checkpoint | shadow git（独立影子仓）每工具步快照工作区，可回滚工作区+对话到任一步 | 旧 `integrations/checkpoints/`（※） | 不适（权威态在 artifact 账本，无工作区可滚） | — |
| context 管理 | 溢出截断对话前半（保首条任务消息）；**文件重读去重**（同文件多次 read 只留最新，旧的换占位符） | 旧 `core/context/context-management/`（※） | 去重直取 | 修剪四候选·工具记录 / webfetch 脏 context |
| 重试 | `withRetry` 装饰器：指数退避 + rate-limit header 感知 | 旧 `src/api/retry.ts`（※） | 直取（我方已有，对表校缺） | provider 层 http 重试 |
| 权限门 | auto-approval 矩阵（read/write/execute/browser/mcp 分级）+ **连发次数上限 maxRequests** | ※ | 改取（连发上限是单飞行律的邻居：预算门） | 确认门禁、单飞行律 |
| plan/act 双模式 | 只读规划模式与执行模式分离，切换留人 | ※ | 改取（我方"模型只填空"是其更激进版本，形状可佐证交互） | 场景编排 |
| 用量记账 | per-task token/cost 累计，价格表从 `@cline/llms` 生成 | ✓ package.json `build:models` | 直取 | 成本/用量记账 |

### 5. OpenHands（All-Hands-AI/OpenHands，MIT，Python；V1 架构在 All-Hands-AI/agent-sdk）

| 机制 | 实现要点 | 源码位置 | 判定 | 对应席位 |
|---|---|---|---|---|
| 事件流 | EventStream 事件溯源（Action/Observation 对，append-only），状态可从流重建 | V0 `openhands/events/stream.py`（※） | 直取（同源形状，对表） | 事件流协议 |
| condenser | RollingCondenser：`keep_first` 钉住前 N 事件永不压；触发三因 REQUEST/TOKENS/EVENTS 分 HARD/SOFT 两级；遗忘区间尊重 manipulation_indices **原子边界**（不撕裂 tool 请求/响应对）；`minimum_progress=10%` 防无效压缩；hard reset 失败按 0.8 递减截断事件串重试 5 次；**Condensation 本身是事件落账**（forgotten_event_ids + summary + offset），压缩史可审计可回放 | `agent-sdk: openhands-sdk/openhands/sdk/context/condenser/llm_summarizing_condenser.py`（✓ 全文） | 改取（全场最接近我方账本哲学的压缩设计；"压缩即事件"归 chatspace 轻摘要，原子边界规则直取） | chatspace 滚动轻摘要、修剪候选 |
| stuck detector | 重复动作/空转循环检测，触发即停 | V0 `openhands/controller/stuck.py`（※） | 直取 | 错误分型与恢复（席位半空） |
| microagents | 关键词触发注入领域知识块 | V0 `openhands/microagents/`（※） | 不适（场景注册表已裁定 skill 兼容路线，docs/24） | — |
| LLM 层 | litellm + tenacity 重试 + Metrics（per-request 成本、累计 token 记账） | V0 `openhands/llm/llm.py`（※） | 记账直取 | 成本/用量记账 |
| 沙箱 runtime | Docker 运行时、browsergym | ※ | 不适 | — |
| 轨迹回放 | trajectory 保存/重放驱动评测 | ※ | 直取 | eval/ 回归 |

### 6. SWE-agent（SWE-agent/SWE-agent，MIT，Python）

| 机制 | 实现要点 | 源码位置 | 判定 | 对应席位 |
|---|---|---|---|---|
| 全 YAML 声明化 | agent = 模板+工具+解析器+history processors 全部声明式组合，零代码换配置 | `config/*.yaml`、`sweagent/agent/agents.py`（※） | 直取（与场景声明/包准入同构，佐证路线） | 包准入 registry |
| history processors | **流水线式历史变换器**（pydantic discriminated union）：LastNObservations 折叠旧观察为"(n lines omitted)"，`polling` 参数**每 N 步才改一次历史以保缓存**；CacheControlHistoryProcessor 手动 cache_control 断点（last_n_messages=2）；tag 机制 keep_output/remove_output；RemoveRegex | `sweagent/agent/history_processors.py`（✓ 全文） | **直取**（修剪四候选的声明式组合载体 + 缓存节拍） | 修剪四候选、缓存 |
| ACI 观念 | 工具输出为模型消费而设计（窗口式 viewer、行号、越界摘要） | 论文 + `tools/`（※） | 直取（阅读视图/SourceAnchor 已同形，对表） | reading-view |
| 成本护栏 | per-instance 与全局成本上限，超限抛分型异常即停 | `sweagent/agent/models.py`（※） | 直取 | 成本/用量记账 |
| 格式错误循环 | 输出解析失败→错误回喂限次重试（warning 计数） | agents.py（※） | 改取 | 三级结构化降级 |
| 轨迹 .traj | 完整轨迹文件重放/评测 | ※ | 直取 | eval/、golden |

### 7. goose（block/goose，Apache-2.0，Rust）

| 机制 | 实现要点 | 源码位置 | 判定 | 对应席位 |
|---|---|---|---|---|
| 双可见性元数据 | 消息带 `agent_visible`/`user_visible` 双标志：压缩后原消息仅对模型隐藏、UI 仍全量；摘要仅模型可见——**UI 完整性与 context 瘦身正交解耦** | `crates/goose/src/context_mgmt/mod.rs`（✓ 全文） | **直取**（chatspace 滚动轻摘要正需要这个形状） | chatspace 滚动轻摘要 |
| auto-compact | 阈值 0.8（可配）触发；`manages_own_context()` 探询 provider 自管则让渡；压缩后按情境注入三种 continuation 文案（对话/工具循环/手动） | 同上（✓） | 改取 | 修剪候选 |
| 压缩自抗溢出 | do_compact 渐进剔除工具响应 [0,10,20,50,100]% **middle-out** 重试，防"压缩请求本身溢出" | 同上（✓） | 直取 | chatspace 轻摘要 |
| 工具对摘要 | 后台异步小模型逐对摘要老工具调用（batch=10，protect_last_n 保当前 turn，cutoff 随 context limit 线性缩放 clamp(10,500)） | 同上 `maybe_summarize_tool_pairs`（✓） | **直取**（"工具记录 + 小模型 summarize"两候选合体的成熟实现要点表） | 修剪四候选 |
| provider 层 | Provider trait + 20+ 实现；**toolshim**：无工具调用能力的模型用本地小模型把自由文本解析成工具调用 | `crates/goose-providers/`（※，模块名 ✓ import 证实） | 改取（toolshim 是三级降级之下的第四档极端形，登记不建议启用） | provider 层三级降级 |
| 确认门在流内 | ToolConfirmationRequest / ActionRequired(Elicitation) 作为 **消息内容枚举成员**——门禁事件与消息流同一载体 | `conversation/message`（✓ enum 实抓） | 直取（我方门禁事件在事件流内，同形对表） | 确认门禁、事件流 |
| 会话存储 | JSONL + resume；扩展即 MCP server | `crates/goose/src/session/`（※） | 改取 | 账本 |

### 8. Continue（continuedev/continue，Apache-2.0，TS）——参考价值最低，机制多与 IDE 强耦合

| 机制 | 实现要点 | 源码位置 | 判定 | 对应席位 |
|---|---|---|---|---|
| context providers | @file/@docs/@codebase 可插拔"语境单元提供者"接口（title/描述/检索函数） | `core/context/providers/`（※） | 改取（形状对应引用 resolver 的可插拔化） | 引用 resolver |
| LLM 适配器 | 众 provider 模板化归一（chat template、completionOptions） | `core/llm/`（※） | 直取（quirk 表同族，略） | provider 层 |
| 索引/embedding | chunk + embedding + LanceDB 增量索引 | `core/indexing/`（※） | 不适（私域库接入另行架构，docs/29） | — |
| autocomplete/apply | 补全引擎、IDE diff 应用 | ※ | 不适 | — |

### 9. pi-mono（badlogic/pi-mono，MIT ✓ 实抓坐实——CLAUDE.md"license 未核实"可销账）

| 机制 | 实现要点 | 源码位置 | 判定 | 对应席位 |
|---|---|---|---|---|
| provider 抽象 | 统一消息模型 + 每 provider 薄适配 + 统一流事件（start/text/toolcall/usage/done/error）；跨 provider 会话迁移（thinking/tool 记录降级为文本的消息变换） | `packages/ai/`（※） | 已收编（docs/18 判例的蓝本） | provider 层 |
| agent loop | 极简协议化循环、事件流出口、session 树 JSONL | `packages/agent/`（※） | 已收编形状；ReAct 循环本体不适（docs/24 既裁） | — |

### 10. Anthropic 三篇工程文机制归纳

| 篇目 | 机制归纳 | 判定 | 对应席位 |
|---|---|---|---|
| effective-harnesses（2025-11-26 ✓ 实抓） | initializer/coding 双相；feature_list.json **只许改 passes 字段**的编辑纪律；"JSON 比 Markdown 更不易被模型篡改"——文件格式当护栏；progress 文件 + git log 作跨 session 状态桥；开工自检序（bearings ritual）；"干净状态"退出纪律 | 直取（typed artifact 路线的官方旁证；bearings ritual = 续行投影消费端的形） | 续行投影、todo 复述 |
| harness-design（2026-03-24 ✓ 实抓） | generator/evaluator 分离——自评必然偏乐观，外置怀疑评估器远比让生成者自省可调；**sprint contract**：做前先谈判"完成定义"再动工；context reset（结构化 handoff）优于 compaction（context 焦虑模型）；"每个 harness 组件都是对模型缺陷的假设，模型换代须逐件重估拆除"；评估器值不值 = 任务是否在模型可靠边界外 | 直取（sprint contract 即确认门禁的谈判形；组件=假设的拆除纪律应写进我方 harness 维护条款） | 确认门禁、eval/、golden |
| context-engineering（2025-09-29 ※ 训练语料） | context rot；最小高信号 token 集；compaction / 结构化笔记（note-taking）/ sub-agent 三策略；just-in-time 检索与预载混合；工具集最小化、参数语义无歧义 | 直取（六段组装器与修剪候选的理论背书；"结构化笔记"即我方 artifact-as-memory） | 六段组装器、schema 三位一体 |

---

## 二、减法清单（coding harness 有而 workagent 明确不要）

1. **ReAct 自主工具循环**（全部九家）——场景执行是声明式固定编排（docs/24 既裁），模型自主选工具引入不可测路径，垂类价值恰在"路是铺好的"。
2. **主链 LLM compaction**（OpenCode/Codex/goose/OpenHands/aider 皆有）——我方明令禁 LLM 压缩主链：投影可测试，压缩会漂移；这是与各家分歧最大、也最必须守住的一条。
3. **代码执行沙箱**（Codex seatbelt/landlock、OpenHands docker）——不执行模型生成代码，工具是确定性白名单接口；文件操作分级（docs/47）与 sandbox 分期（docs/27）已覆盖需求面。
4. **diff 应用器/编辑格式家族**（aider editblock、Cline 流式 SEARCH/REPLACE、Codex apply_patch）——产出是 schema 校验的 artifact 整体替换 + RevisionEvent 留痕，不做文本 patch。
5. **repo map**（aider）——卷宗结构还原（ingest）+ 续行投影已是其领域对偶，无需符号图。
6. **LSP/诊断集成**（OpenCode lsp、Continue）——无代码可诊断；我方"编译器"是 schema 校验 + 引用校验工具。
7. **shadow git checkpoint 工作区回滚**（Cline）——权威态在 artifact 账本，回滚是账本读侧操作，无工作区可滚。
8. **自动 git commit / 自动修复循环**（aider auto-commit、Ralph Wiggum 式持续迭代）——不可逆动作永远停门禁，是产品纪律不是参数。
9. **子 agent 自主派生**（Codex delegate、Claude harness 多 agent）——固定编排下并行度由场景声明，不由模型决定。
10. **代码库 embedding 索引**（Continue/Cline codebase search）——私域库接入走信源分级架构（docs/20/29），不做本地向量索引。

## 三、捡漏清单（我方席位尚空而对方形状成熟，按性价比排序）

1. **错误分型穷尽性守卫**（aider `exceptions.py` ✓）：上游异常清单化 `ExInfo(name, retry, description)` + 加载时遍历上游 SDK 命名空间"有而未登记即抛"。我方 quirk 表已有#42"勿按记忆修表"判例，正缺这种机器守卫。移植成本：一张分型表 + 一个遍历测试，半天。
2. **双可见性元数据**（goose `agent_visible`/`user_visible` ✓）：chatspace 滚动轻摘要落地的前置形状——UI 全量、模型瘦身、两不相扰。移植成本：消息 schema 加双标志 + 组装器一处过滤。
3. **成本/用量预算器**（SWE-agent cost limits + OpenHands Metrics + aider/Cline 记账）：我方全链零记账（docs/68 三节孤儿请求"仍在计费"却无账可查）；per-scenario 上限 + 累计 usage 落事件流。移植成本：provider 响应 usage 字段累加 + 阈值分型错误，一天。
4. **流式部分结构修复/渲染**（Cline partial 标志增量解析 ※）：我方单飞行 + 整包校验下 UI 只能等待终局；schema 面若要流式点亮字段，需要"部分 JSON 容错解析 + partial 标记"的形状。移植成本：解析器 + 事件流加 partial 语义，二至三天，可后置。
5. **缓存友好修剪节拍**（SWE-agent `polling` 参数 ✓）：修剪四候选落地时"每 N 步才改一次历史"，避免每步修剪打碎前缀缓存。移植成本：修剪触发器加一个步数取模条件，一小时。

备选（第 6–8 位）：压缩/摘要请求自抗溢出（goose 渐进剔除 ✓ / OpenHands 0.8 递减重试 ✓，chatspace 轻摘要必遇）；请求重放录制（codex rollout JSONL ✓ / SWE-agent .traj——我方 golden 通道 + 账本已近似，差"逐请求 wire 级录制"一档）；stuck detector（OpenHands ※，固定编排下需求弱但 chat 路径可用）。

## 四、License 表

| 仓库 | License | 核验方式 | vendored 可行性 |
|---|---|---|---|
| sst/opencode | MIT | ✓ 实抓 LICENSE | 小工具函数可评估 vendored（保版权声明）；本判例下仍以取形为主 |
| openai/codex | Apache-2.0 | ※ 训练语料（高置信） | 可 vendored（须附 LICENSE+NOTICE）；无此必要，Rust→TS 本就只能取形 |
| Aider-AI/aider | Apache-2.0 | ※ 训练语料（高置信） | `exceptions.py` 的表结构可评估 vendored（Apache 义务：NOTICE）；建议重写取形即可，表内容本就要换成我方 provider 域 |
| cline/cline | Apache-2.0 | ✓ 实抓 LICENSE（Cline Bot Inc. 2026） | 可 vendored 但无必要（机制皆形状级） |
| All-Hands-AI/OpenHands & agent-sdk | MIT | ※ 训练语料（高置信） | condenser 原子边界规则等以取形为准 |
| SWE-agent/SWE-agent | MIT | ※ 训练语料（高置信） | history processor 流水线形状取形；pydantic 判别式联合是通用惯用法非其独创 |
| block/goose | Apache-2.0 | ※ 训练语料（高置信） | 双可见性/工具对摘要取形 |
| continuedev/continue | Apache-2.0 | ※ 训练语料（高置信） | 无 vendored 需求 |
| badlogic/pi-mono | **MIT（✓ 实抓坐实，Mario Zechner 2025）** | ✓ | CLAUDE.md"license 未核实"备注可销账；仍维持既裁：只借形状不引依赖 |

※ 标注项在任何 vendored 动作前须复核 LICENSE 现值（#42 判例同路：勿按记忆定案）。

---

## 摘要（≤10 行）

1. 九家 harness 的共性五件套——事件流协议化、会话 JSONL 落账可重放、LLM compaction、工具输出修剪、provider quirk 归一——我方席位已占其四，唯"成本记账"全链空缺（捡漏 #3）。
2. 最大分歧即最大护城河：各家主链全靠 LLM compaction，我方禁 LLM 压缩改确定性投影——Anthropic harness-design 文（context reset + 结构化 handoff 优于 compaction）恰为此路线背书。
3. 直取性价比前三：aider 错误分型穷尽性守卫（半天）、goose 双可见性元数据（chatspace 轻摘要前置件）、SWE-agent polling 缓存节拍（一小时）。
4. OpenCode `prune()`（40k 保护带倒序抹工具输出）与 goose 工具对小模型摘要，是修剪四候选中两候选的现成实现要点表，落 HARNESS-1 时直接对表。
5. OpenHands condenser 的"压缩即事件落账 + 原子边界 + 最小进度阈值"最合我方账本哲学，归 chatspace 轻摘要取形。
6. 减法十条以 ReAct 循环、主链 LLM 压缩、沙箱、diff 应用器、repo map 为首，均有既裁文档背书，无新增架构争议。
7. 仓库漂移警示：Cline 已重构 monorepo、OpenHands 迁入 agent-sdk——引用旧路径的外部资料（含本仓早期调研）需按本文标注更新。
8. pi-mono MIT 实抓坐实，CLAUDE.md 的"license 未核实"备注可销账（仍只取形不引依赖）。
9. 一切 vendored 动作前复核 LICENSE 现值；本文 ※ 标注项按#42 判例处理。
