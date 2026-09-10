# 架构边界与最小合同

## HPRO-0002 · 总体裁决：两个责任层，一个应用组合点

保留 S08 的 D09（Pi 默认、第二 adapter 逐轴验证）、D11（最小必要指令）、D13（两个接入方向）与 S09 的 T19 优先级。普通 Chat 是通用 Harness 的第一消费者；Work、Attention 是应用组合后的额外消费者。**逻辑可拆，不等于现在拆进程、拆仓库、发布通用 SDK 或换语言。**

```text
Web GUI / HTTP façade                     ← 保持既有 /api/v5 与投影
           │
      Application composition              ← 创建/关闭 Core，组合 Attention/Work
       ┌───┴──────────────────┐
       │                      │
Generic Harness           Work application adapter
 Session / Run             来源 / Matter / Candidate / Decision
 control / permissions           │
 input assembly                  └── Semantic Work Core + 原 SQLite
 tool execution
       │
 Pi execution/provider adapter              ← 保留现有 Pi native journal/loop
```

Harness 持有执行状态；Core 持有正式工作效力；UI 不新增权威；compiled context 只是带版本和来源的运行投影。Core 可以独立读，普通 Chat 可以不创建 Matter。外部 agent 读 CW 与 CW 控制外部 runtime 是两条不同入口，不合成一个“万能 agent broker”。[S04、S08–11]

## HPRO-0003 · 实际 owner 与反向依赖

| 内容 | 当前 owner/实际路径 | 应保留或移动的边界 |
|---|---|---|
| 启动和关闭 | `server/runtime.mjs` 无条件构造 WorkCoreOwner，再交 registry/service | 保留原 `createRuntime` 作完整应用兼容入口；新增 `createHarnessRuntime`，Core 实例由应用组合层显式传入 |
| Host service | `service.mjs` 同时导入 Pi SessionManager、Governance/Attention adapter、Core projection | Pi 会话操作移入执行 adapter；Work/Attention query、prompt 与 tools 组装移入应用 adapter；不再让普通 Host 源码解释 Matter |
| Runtime control | `control-plane.mjs` 持有配置，含 Attention scope 的硬编码 | 配置 owner 不变；把 role/scope 允许列表作为应用提供的描述，权限求交仍由 Host 执行 |
| 正式 Core | `core/owner.mjs`、`client.mjs`、原 Python/SQLite | 保留来源/版本/候选/决定语义和原库；owner 文件中混合的 projection/context 可在 Work 层内部拆文件，不搬入 Harness |
| RuntimeStore / native journal | Host 存 commands/Run/events；Pi 存 native session | 不是跨库事务，不再复制整份对话当第二 canonical transcript |
| Attention 历史读取 | `runtime/attention-tools.mjs` 读取保留会话和治理 projection | 它是应用工具贡献，不是通用 memory_provider 的实现 |
| 现有 `app/harness/` | 已用于 Thread/coordination/child 边界 | 不能因本次“通用 Harness”命名而覆盖或重定义；这轮不动其语义 |

“无条件构造 CoreClient”**不等于启动时一定 spawn Python Core worker**；已读 constructor 是惰性的。真正需要修的是依赖方向和可独立构造/失败隔离，而不是先宣称发现了普通 Chat 必然启动数据库的性能 bug。[C01–03、C07–09]

也不能因此承诺纯 Harness 已不需要 Python：当前数据目录锁本来依赖 Python/POSIX，这和 Semantic Core worker 是两项依赖。[S14]

候选新路径为 `app/server/harness-runtime.mjs`、`app/server/work-application.mjs`、`app/runtime/pi-runtime-adapter.mjs`。它们是本稿提议的新文件，不是基线已有文件。优先保留原 HTTP façade；不做大规模目录重排。实际提取 private methods 的清单由 P00 在同一 SHA 上机械列出，不能只凭本文两段 service 源码进行全文件盲改。

## HPRO-0004 · 执行 adapter 与 provider driver 不要混同

最小 RuntimeAdapter 负责：native conversation 的创建/打开、准备一次 execution handle、native ref、事件投影、interrupt、最终 settlement。最小 ProviderDriver 负责：连接对应的模型目录、credential resolution/probe、模型/effort 的实际能力。两者可以由同一个 Pi 模块提供，但不是同一身份，也不能把“换 endpoint”画成“换 runtime”。

保留现有 AgentSession/SessionManager，不换更高层运行框架。工具 loop/retry/compaction 继续交 Pi；Host 保持 cancel 粘性、事件持久化 drain、budget、permission 与 unknown 的责任。`assistant.delta` 当前实际上是累计文本投影，新的 adapter 必须声明 `replace` 或 `append`，不能按名字假定是增量拼接。[C02、C05]

capability 项分 `native / adapted / unsupported / untested`，并绑定 adapter 版本、实际 wire path、模型/连接、测试证据。上游支持 steer/fork，不代表当前 HTTP 已提供。第二 adapter 不能用空成功对象吞掉 unsupported。

## HPRO-0005 · Harness 命令、快照和结算合同

最小语义合同见 `contracts/ports.d.ts`。它是设计面，不替换既有 HTTP DTO 或宣称已发布 API。既有 `commandId`、Session、Run、Question、permission mode、连接配置队列保持原义。

| 接缝 | 必须表达 | 不允许的简化 |
|---|---|---|
| admission | 先查相同 commandId 的旧 receipt，再校验新命令的当前配置/权限；冻结实际 provider、tools、输入版本 | 重试旧命令时用新配置重跑；“收到请求”直接等于执行完成 |
| prepare | 建立取消/usage owner，准备 source/input snapshot 和 native ref；准备失败产生可查询的 terminal receipt | 在取消 owner 安装前先发模型请求 |
| events | 可回放的 Host 序列和 native ref；累计/增量模式明确；收尾等必要 projection writes | SSE断开当 Run 失败；UI输出完成当正式完成 |
| cancel/respond | 绑定原 runId/questionId/callId 和内容版本；取消确认与最终 settlement 分开 | 向当前恰好选中的 Chat 发送旧审批；用 abort 表示撤销已发生效果 |
| restart | 原 receipt 查询；中断未知不自动重放；配置 pending 继续封锁 | 以“续行”名义自动重发外部效果 |

错误层面保持既有 HTTP status/code。新增内部错误必须表达 phase 和安全恢复动作：refresh、query_receipt、explicit_new_command、none。缺失 capability 是明确 unsupported；Core 不可用时，已绑定 Work 的 Run 不能悄悄降级成普通 Chat；未绑定的普通 Chat 不应受 Core 数据不可用牵连。

Run completed 只表示约定执行和必要结算完成。工具 allow、自然语言“同意”、写出文件和 Core accept 是四种不同事实。

## HPRO-0006 · Work 接口与人类决定

应用 adapter 提供 `prepareContribution`：返回受限工具、版本绑定的 context、opaque work ref、执行关闭/结算回调。Harness 不解析 source_version/contract_version 等工作字段；Work adapter 在自己的入口验证这些字段。

普通工具侧只能读取可披露对象、读取指定版本、提出候选、报告执行状态。**正式 decide 走独立 human-action façade**，复用既有 request_id、candidate/base version、action/reason 与 Core CAS；不在模型工具集合暴露一个通用 approve 方法。

Core 和 RuntimeStore 之间不是原子事务。复用已有 extension finish/reconcile：只有双方要求的结算都可确认时才给对应成功；部分失败保留 unknown/recovery_required 与原对象定位。不可建立一个新的“统一超级 Store”把既有独立 owner 掩盖起来。[C02、C08–09、S10]

## HPRO-0010 · 先记录真实有效输入，再重排指令

沿 `control.bind`、`createSessionRun` 的 `beforeInitialInput`/实际 systemPrompt 接缝建立 RunInputSnapshot。包括：schema/compiler/adapter 版本，解析后的 system prompt、实际 tools schema/顺序、当次 Host contribution、input/source hash、来源 scope、被排除项/原因、native journal 的身份和位置引用、生成时间与证据级别。这个快照**不是每个 provider request 的完整 transcript 复制**；完整会话仍只有 native journal owner。

输出 current/next-run/historical 三个视图。历史缺字段即 partial/unknown，不拿当前配置回填历史。`admittedCharacters` 保留原来的 UTF-16 code-unit 口径；whole-context tokens 只有真实测量或明确估算标签时才展示。实际快照中未证明进入 provider 的部分标 prepared，不标 sent。[C03、C05、C13]

冻结 snapshot 写失败时不得开始模型/工具工作；原 command receipt 可查。内容落盘与 Run 元数据之间无跨文件原子性：先写完整不可变 blob，再发布引用；没有引用的暂存 blob 不是一次已执行或已接受事实。未开始的 prepared snapshot 不能冒充 provider 已消费。

## HPRO-0011 · 多级指令：排序、角色和权限是三件事

维持现有 control JSON 为编辑真源。建议形成四个用户可理解层次：Host/system 基础规则；workspace/project 稳定要求；session 要求；invocation/task 的本次要求。user preference 另作低权威文本来源，不能混成权限政策。已有 Attention role 文本由应用贡献，而不是写死在通用 service。

首选窄变更：把**经人明确保存的稳定 instruction 资源**放入带来源标识的稳定 instruction section；本次任务、Work 当前状态和 memory 证据保持独立 section/tail，不把全部 Matter 或 Paper 灌入 system。相同配置下字节稳定；只有真实有效配置改变才形成新 cache 边界。

此项是对目前“全部控制指令跟随 runtime.context”的有界重排建议，不是声称当前完全失效。P06 必须先用 P05 快照证明现状，再用 wire fixture/compaction 反例比较重排前后；如果既有放置已满足行为，就保留字节布局，仅补解释。不能用“system 优先级更高”替代实测，更不能无条件删除 native runtime 必要提示。[C02–05、S08 D11]

更窄层在**可覆盖的偏好/配置槽位**上可覆盖更宽层；权限始终取更严格限制。任意自然语言的语义冲突不能靠 scope 排序完全判定。显式 overrides/source 关系和已知结构化键可以计算，剩余冲突展示原文与顺序，不伪造自动一致性结论。compaction 前后需验证必要 Host invariant 仍能解释；不能把丢失视为完成。

## HPRO-0012 · 普通 memory 的最小形态

增加 `memory_text` 这一人维护的 content resource，复用 RuntimeControlPlane 的 revision、scope、exposure、profile、审计和原子发布方式；`memory_provider` 仍指外部/派生检索 adapter。第一片仅支持人编辑、查看、禁用/删除和下一 Run 有界注入，不自动从每轮对话提炼保存，也不自动提升为 Core 事实。

四类内容分开：人维护的偏好/背景文本；原会话的历史陈述；工作中的临时笔记/候选；Core 已正式接受的对象。临时唯一观察不能当可删 cache，但也不会因被叫作 memory 就取得正式效力。模型可提出待保存草稿，由人明确保存；不开放无限制跨项目 memory 写权。[C07、S08 D07、S10]

`memory_text` 初始只提供 user/local、workspace、session 已可表达的 scope；不新增组织身份/ACL。正文长度、总量、标识、UTF-8、source hash、编辑来源与移除操作必须有固定限制。Task-only 文字留在当次输入，不伪造永久 memory。

## HPRO-0013 · 关闭 memory ≠ 从历史上下文中消失

若 memory 曾进入 native journal，仅禁止下次自动注入不会抹掉旧 message 或 compaction summary。UI 不应只给一个看似“已经忘记”的开关。

最小发布合同分两步：①关闭下一次自动注入；②用户确认开启 clean model context。前者可立即保存（仍受 active Run 冻结规则），但必须提示原会话仍可能含旧内容；后者由 Host 创建新的 native context generation，保持同一个 CW Chat 的可读历史，不把旧 journal/旧摘要自动注入新的 generation。当前明确选定的材料与 Work context 可以重新编译，且重新验证权限。

开启第二步使用独立命令/receipt，失败不销毁旧 journal，也不伪称已清理。老 Run 仍指向老 generation；相同旧 commandId 仍返回旧 receipt。关闭与 reset 跨存储部分失败时状态保持“注入已关／上下文尚未隔离”，不猜原子成功。启用这一按钮前需 P08 完成，P07 单独合入时只能提供真实的 injection-off 语义。

这不保证 provider 删除已发送数据、删除用户导出副本或清除备份；那是另一个明确 retention/purge 合同，不属于本轮“memory 开关”。

## HPRO-0014 · 受限 web_fetch，不把浏览器自动化塞进基础节点

新增模型工具沿现有 `governTools` 与 Host 许可执行。第一版边界：明确 URL 的 HTTPS GET；无用户 cookies/认证/header 模板；无 javascript、浏览器、登录、批量爬取；默认不静默开放任意网络。沿已有 exposure/ask 机制，由人显式允许，并将规范化 URL/目标绑定进精确 call 授权。网络读取也会外发 URL；read-only 不是“没有外发”。

传输与格式转换分开。Node HTTPS/受控 resolver 是候选传输接缝，必须在连接时绑定经验证的地址，重验所有解析结果/IPv4-mapped IPv6 等边界；不能只对 URL 字符串做一次 localhost 黑名单。第一版拒绝重定向，禁止 userinfo、非批准协议/端口和内部/元数据地址；DNS rebinding、abort 后发布、解压膨胀、超时/大包是入场硬门。IP 特殊地址规则和传输实现必须有固定来源/测试，本文不提供未经验证的 SSRF 黑名单。

建议 Host 合同初值：URL ≤2048 字符、总期限15秒、传输及解码后的 body 各≤1MiB、正文投影≤32000 UTF-16 code units；超过正文投影长度返回有界分页引用，不把截断片段宣称全文。超限响应明确失败，不发布半份“完整 source”。这些是本稿设计上限，不是外部测得的最佳值。

支持 text/plain、markdown、JSON 和受限 HTML→text；不把远端 HTML 当本地可信页面渲染。可从 U03/U04 的 htmlparser2 8.0.2 候选切入，仅借解析器与转换分层；安装前固定 license/integrity、检查维护/安全记录并跑反例。尚未验证的 parser/网络依赖必须阻止其格式/传输宣称；不能以“用了 OpenCode 同款”放行。暂不引入 Effect/Bun/Turndown 整套依赖。

原始获准 bytes + SHA-256 + 请求 URL/响应身份/获取时点/转换器版本归 Run input/evidence 存储；source locator 不等于内容版本。其为外部证据，不自动创建正式 Matter Source；需要成为正式来源时沿既有 Core intake。provider-preview 与 runtime-sources/resolve 仍保留原本的窄语义，不增加隐藏网络副作用。

## HPRO-0015 · Skill intake：显式检查，而非全盘发现

保留现有前置 metadata/按需 load。第一版只在已授权的当前 workspace 根下，显式检查 SKILL.md 与固定深度的候选目录；realpath/符号链接/大小/数量/UTF-8/YAML 循环对象均有界。检查不激活，登记要 CAS，正文取当前被人确认的 hash；源文件后来改变只产生 stale/refetch 提示，不偷偷替换已绑定 Run 的内容。

requested tools/兼容声明只是 metadata，不授予 shell、外发、安装或 Core accept。任意 HOME、repo clone、package install、scripts/assets executor 后置。已保存 skill 正文进入历史 binding 后，删除当前源不能令历史记录被伪造；可访问性与 retention 规则另行说明。

## HPRO-0016 · Provider 已交付修复不得倒退

本次不替换 connection identity、每连接 credential slot、catalog extras、unknown reasoning/contextWindow、configuration pending、verify generation binding。新 input snapshot 只绑定当前已发布且 ready 的配置；旧 receipt 幂等返回不能触发新的 provider probe。`/models` 成功不是生成成功；verify 本身可能消耗 provider 资源，必须有用户明确动作。[S14、C02、C05]

## HPRO-0017 · GUI 合流原则

现有 Runtime Workbench 已区分 configured/connected/exposed/permitted，以及当前 Run 编辑只是 draft、不会自动生效。新增面继续使用该 controller 与同一 design grammar，不另建多个 settings authority，也不让 frontend 自算权限 winner。[C12–13]

先落后台 typed capability/source/snapshot，再由唯一 frontend writer 消费。在已有 Settings 组内增加适当编辑/inspector；在 Run detail 显示实际输入版本与 native generation；memory 的 injection-off 和 context-reset 分开显示。不能用新开关伪装 OAuth/stdio/web/browser 已实现。不得在这轮顺便重排 sidebar、换图标库、改全局 tokens 或替换 GUI 框架。

## HPRO-0018 · 状态迁移与回退

依赖方向提取、MCP 分页/保守效果栅栏不应要求数据库迁移。新增 RunInputSnapshot/native generation 元数据才触及 RuntimeStore；从固定基线12出发由唯一 store owner 分配下一版，不能在多个分支各自抢写“13”。普通 memory 的内容版本归 RuntimeControlPlane 自己的格式升级；不要把它混写成 Core schema 更新。

每项迁移先验证旧数据，保留准确原 bytes/hash，使用临时目录和排他锁，升级后旧 host 不得打开新目录。回退是使用对应版本的**完整停机备份**，不是只换旧代码继续用升级后的目录。原绝对 workspace/native journal 坐标不得假装可自由搬迁；当前恢复测试先采用同一实际路径的隔离测试目录。备份包括 runtime-state、control、credentials、workspaces、Pi journals、artifact history、新 input snapshots 及已配置的 Core 库。[S14]

文件权限/凭据不应进入公开附件；备份测试使用合成 key，不读取个人 dataDir。物理断电持久性与进程中断恢复分开标注。

## HPRO-0019 · 关闭链的加固候选，而非已确认数据损坏

`runtime.close` 内的 Core close 与 store close 是串行 await；前者拒绝可能跳过后者。但本次已读 CoreClient.close 在正常路径先封 admission、等待 worker exit，未证实该拒绝在现实运行中可达。因此这里登记为**生命周期反例/审查项**，不是宣告一个已复现的泄锁事故。

修复不能机械改成“无论活跃 writer 是否退场都释放 data lock”。先证明所有可能写者 quiescent，再释放锁；无法确认时保持 admission sealed 并明确 shutdown incomplete。P12 包含 Core 启动中取消、关闭失败、父/子 owner 退场顺序和重启锁反例。本文没有附一个不顾 writer 生命周期的通用 cleanup patch。[C01、C09]
