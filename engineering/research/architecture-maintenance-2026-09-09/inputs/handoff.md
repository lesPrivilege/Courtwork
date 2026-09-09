# SE / Courtwork：运行时局部解耦、异步工具与长期维护

研究日期：2026-09-09  
交付性质：只读研究、候选架构与可派发工单；不是已实现、已派发、已通过测试的声明。  
主张：稳定契约约束可替换实现，以复现包支持维护；以异步工具为第一条验证纵切，不进行全局插件化改造。

## 0. 固定基线与证据边界

本轮通过 GitHub 读取的远端 main：

- Courtwork：`62556b7f65170ecf30efb2869447ae85fe69d721`。
- Schema-Engineering：`d78fd312955c1f594e59cbdcbb0d3074ac355940`；Canonical 9.6。
- Courtwork `app/package.json`：Pi agent-core / ai / coding-agent 均锁定 `0.85.1`，MCP client 锁定 `2.0.0`。
- 实际开工必须重新确认分支、工作树和 HEAD；不能以本研究快照覆盖后续本地施工。

读取了两仓的架构、当前状态、Canonical、source resolver 契约、既有 DSH explore 与依赖声明。没有运行 Courtwork、没有读取凭据、没有执行真实 provider 请求、没有检查每个源码调用点，也没有更改任何远端仓库。当前状态文档将真实 provider 验证记为 not_run；不能从既有 fake/loopback 测试推出真实 API 兼容。

现有 M01–M14 和 R3/R4/R5 已能容纳本轮工作，不增设第二份路线图或正式产品状态表。既有 EX-WK6 已研究 DSH 动态扩展；后续应消费其固定来源并补差异，不重新跑一轮相同的概览。

## 1. 本轮架构裁决建议

> Harness 的可维护单元是有明确所有权、版本契约、生命周期和兼容证据的能力实现，不是统一名为 Plugin 的包。资源发现、安装、激活、模型曝光与操作授权分别治理。运行使用冻结配置，结果经版本化边界进入工作状态。非语义变更不改变模型请求前缀；无法保持语义的变更显式迁移或拒绝。维护 Agent 可提出适配与修复，但不能自行放宽契约或批准自己的高后果变更。

该段为建议，不是对 Paper 或 Courtwork 的既成修改。SE 9.6 已区分各层 Contract、Eval、长期资产与改进周期；这里是把这一原则落实到 Harness 的工程维护，不新增 Kernel 概念。

## 2. 选型结论

| 局部 | 首选方向 | 借鉴对象 | 不采纳的扩大化 |
|---|---|---|---|
| Provider / loop 接入 | 保持当前 Pi 与窄适配边界；按锁定版本核验能力 | Pi Extension / SDK | 为一个 async 字段重写通用 loop，或直接升级所有 Pi 包 |
| 扩展组织 | typed contribution + 独立能力契约；必要时再独立打包 | Pi packages、VS Code contributes | 所有 resource、tool、service、view 强制一种执行接口 |
| 生命周期 | 明确激活/释放，旧版本有界退役，安全边界切换 | DSH / Cordis reversible effects | 把所有运行都设成任意时刻热更新 |
| 异步任务 | host-owned job/receipt + provider-specific adapter | OpenAI async、DSH jobs、MCP Tasks | Promise 即持久任务；callback 即正式成果 |
| 缓存 | 按 provider/model/API 编译确定性请求并审计最终 payload | OpenAI / Anthropic 官方缓存文档 | 一个全局 cache-safe 布尔值；包版本升级必然改变 cache key |
| 前后端扩展 | 声明式 view/command contribution，受信渲染器和版本化动作边界 | VS Code host separation；DSH keyed renderer | 前端扩展直写正式账本；同进程模块被称为安全沙箱 |
| 长期维护 | 固定来源、契约测试、最小复现、迁移/回退、独立验证 | 既有 M14、Git/PR、上游文档与测试 | 依赖漂移后让 Agent 凭描述猜接口并直接热补丁生产 |

### 为什么不直接迁到 DSH

DSH 官方架构将 service definition、provider、consumer 分开，package 可以组合多个角色；这正适合借鉴“包不等于语义边界”。但 DSH 的不同 profile 本身就有不同 reload 政策，不能把“支持热更新”推广为“任何 in-flight 工作都能安全替换”。

Courtwork 既有 EX-WK6 还明确区分 DSH 动态定义的进程内状态与可重放的持久历史，并未把“重新运行旧 package”视作已证明的事务回滚。沿用这一证据纪律：先借局部形状，持久性、权限与回退另外验收。

## 3. 原子化的边界：按可独立验证的语义切，不按函数切

以下是建议的契约视图，不要求新增六个服务或统一重命名当前对象。

| 单元 | 必须稳定的含义 | 最小所有权约束 |
|---|---|---|
| Source / contribution | 来源字节、声明类型、schema、能力要求、适用范围 | 声明不等于许可；原文不因规范化被改写 |
| Activation / run configuration | 本次使用的版本、权限、资源集合与配置 | 一次运行引用明确的配置代际；安全撤权可即时优先 |
| Model request / context projection | 确切曝光的输入与 provider 特有项 | 编译确定性；保留原生关联与未知字段的明确处理策略 |
| Invocation / job / receipt | 发起、进度、结算、结果交付及因果关联 | 发起任务、工具成功、交付给模型分别记录 |
| Candidate / decision / commitment | 已有 Work Core 的候选与正式转换 | Runtime 和 UI 不建立第二个成果真源 |
| View / command projection | 人能看到什么、能请求哪些合法动作 | 渲染不是授权；命令仍由 host 校验版本、身份与范围 |

### 包、能力、实例与版本分离

一个 package 可以包含多个 skills、MCP server 声明、tool implementations、UI contributions 与一组 profile。不同贡献可以有不同的能力版本和可用状态；bundle 的发布版本不能替代它们的行为兼容性。

建议保持以下身份可区分：

- distribution identity：从哪里取得、哪个不可变版本、何种许可证。
- contribution identity：提供哪个语义能力、哪版 schema/contract。
- instance identity：在哪个 workspace / matter / session 的配置下激活。
- execution identity：本次调用使用哪个实现版本、哪个权限快照、哪个 provider 路由。

兼容报告至少分开两轴：`实现方式 = native / adapted / degraded / unsupported`；`证据状态 = documented / fixture-tested / live-tested / not-tested`。不要把 native 等同于验证通过，也不要把语法可解析等同于可运行。

### 原子化不等于每次请求重新发现一切

模块之间先用普通函数/类型边界解耦。只有版本冲突、可替换验证或执行隔离有真实需求时，才升级为独立包/进程。

资源校验、依赖闭包、schema 编译可以在配置激活时完成；请求只读取相应不可变快照。禁止每个 token、每条工具进度或每个 UI render 都遍历插件树、重新构造全部工具 schema。

## 4. 首条纵切：可恢复的异步工具

### 已核实的上游边界

OpenAI 的 Responses async tool calling 是模型在应用执行工具期间继续做独立工作，区别于后台生成整个 response。工具结果仍需绑定原始 call_id 返回；适用模型、工具类型和组合限制必须查询对应文档。它不是应用侧后台任务管理器。[S01]

MCP Tasks 当前文档采用可协商扩展，有持久 handle、polling、输入补充与取消；新版和旧实验接口不同。因此 MCP task adapter 必须声明协议代际，不能只写“支持 MCP”。[S06–S08]

### 最小演示场景

以“阅卷整理”为场景：启动两个受限只读材料解析任务，同时读取已有目录并建立不依赖解析结果的材料清单。等相关解析任务返回后，才生成有原文锚点的事实摘要候选。人类接受仍走现有 Work API。

先用可控延迟的 synthetic fixture 证明：模型/宿主可以继续做独立步骤，依赖步骤不能提前消费不存在的结果。该测试不是 OCR 质量、法律正确性或真实模型能力测试。

### 内部处理序列（建议，不是现有 API）

```text
complete call arguments
  → host validates tool / scope / budget / permission
  → persist invocation identity and execution intent
  → dispatch with idempotency strategy where available
  → acknowledge queued/running; unrelated work may continue
  → executor settles result or explicit uncertainty
  → persist result and delivery record
  → append eligible result to the correct conversation lineage
  → run verifier; possibly create candidate
  → existing human/authorized commitment path
```

UI 流式进度不必全部成为持久事件；关键状态转换与最终结算必须能恢复。记录执行意图到真正启动之间、任务执行到回执持久化之间都存在故障窗口，需明确恢复策略，不能靠“写了数据库”就声称 exactly-once。

### 三个不能合并的状态维度

1. 执行：queued/running/succeeded/failed/cancel-requested/cancelled/unknown。
2. 交付：尚未送入目标会话、已发送但接收未知、已确认接收等。
3. 工作效力：证据/候选/待审/已接受/已失效，沿用 Work Core。

`unknown` 不应被悄悄转换为 succeeded，也不能一律重试。外部操作不支持幂等键或状态查询时，网络中断后应允许进入核对流程，尤其是有副作用操作。

### 最小持久关联

建议在既有 runtime store 中扩展，而非另建 work ledger：

```text
host_job_id
origin_session_id / conversation_lineage_id
origin_run_id / request_id / provider_call_id
tool_contract_version / implementation_revision
activation_generation / input_source_revision
execution_status / delivery_status
idempotency_key (only where actually supported)
result_ref / error_or_uncertainty
created_at / settled_at / relevant causal links
```

模型自拟的 task_handle 只作为别名，由 host 检查唯一性并绑定真实身份；不能作权限证明或可信路径。

### Native 与 fallback

- Native：只有 provider/model/API 及当前 adapter 真正支持时，才使用原生异步工具协议。
- Adapted：应用用 start/get/wait 等明确任务协议返回 handle，模型在后续回合领取结果；这是可用的适配，不是同一语义的原生支持证明。
- Unsupported：普通同步回路保持阻塞，或拒绝激活需要异步的 profile，不能静默丢字段后宣称成功。

特别核验当前 Pi 0.85.1 是否完整保留和处理原生 async call 的语义。仅透传请求字段不够；还必须验证响应解析、loop waiting、恢复、结果归属。发现缺口先形成窄适配/上游补丁候选，不升级整个 Harness。

### 必测故障

重复完成通知；乱序完成；完整参数前不得执行；取消与完成竞争；重启后找回未结算任务；外部已执行但本地未收到；用户已开启另一 Session；原始材料版本已变；插件升级时旧任务未结束；所有必需任务尚未完成而模型宣告最终完成。

晚到结果可以保留为证据，但不得把旧版本分析自动作为新材料版本的正式结果。投递目标是原属会话的合法后继，不是全局“最近活动会话”。

## 5. 缓存契约

### 两种指纹，而非一个大版本号

建议分别维护：

- execution/config fingerprint：实现、配置、依赖与激活版本，用于复现。
- model-visible prefix fingerprint：真正曝光的稳定 prompt / tool schema / 相应 provider 渲染设置，用于发现无意变更。

两者不必同步变化。修复 UI 布局不应改变 prompt；同样的包更新若改变工具语义或权限范围，即使文字没变，也必须进行语义审查，必要时更换曝光版本。缓存成本不能压过正确性与撤权。

### 不能只断言“前缀没变就命中”

OpenAI 当前文档区分旧模型与 GPT-5.6 及以后模型的 breakpoint 行为，说明共享未标记前缀不总会自动回退命中；缓存策略和字段应由 adapter 按能力编译，并测量 read/write。Anthropic 同样有工具、system、messages 的失效层次和模型/设置差异。[S02–S04]

因此项目能够验收的是“没有由无关扩展变化造成的可避免前缀扰动”，不能保证 provider 路由、过期和容量影响下 100% cache hit。

### 约束

1. 外部资源 exact bytes/hash 保留；只对定义明确的投影作确定性序列化，不篡改来源。
2. 工具命名、排序、description、schema 的顺序与渲染稳定；不随连接发现顺序漂移。
3. 不把当前时间、进度、UI state、所有依赖包版本或随机追踪 ID塞进稳定前缀。
4. append 新结果，不为了“整理”历史而重写先前 provider items；保留 call linkage 与该 provider 要求的 opaque items。
5. 活跃请求固定已编译曝光；新能力在安全边界生效。使用 provider 原生 defer/tool search 时按其语义验证，不把通用动态增删工具等同于 cache-safe。
6. 授权仍在执行边界检查；保持曝光稳定绝不意味着已撤销能力仍可执行。
7. 审计实际出站 payload；Pi getSystemPrompt 不覆盖后续 provider hook 的所有改写。[S05]
8. 记录 usage 缺失为 unknown，不用 characters 伪装 tokens，不把未披露 cache write 记为零。

### 测试分层

离线：相同输入重复编译；仅 UI 变化；无关插件安装；同一 MCP toolset 断开/重连后稳定命名；修改描述；权限撤回；运行中升级；晚到结果追加。检查最终序列化 payload 与稳定前缀的预期 diff。

在线：用户授权后，在相同 provider/model/API/配置/有效缓存窗口下做配对实验，读取缓存 tokens、写入 tokens、输入 tokens、首输出延迟与错误；报告样本和缺测，不能用 mock 的 usage 证明实际缓存。

## 6. 生命周期、前后端与回退

### 默认政策

- 描述型资源：可编辑，但“已保存”与“本次执行已生效”分开。
- UI renderer：明确 host API/数据 schema/静态资源版本；布局替换不能更换成果身份。
- provider、tool executor：请求或调用中禁止无约束卸载；在安全边界切换实现。
- store、权限、已提交 schema：视作高影响变更，要求独立迁移与恢复证据。

可以采用旧代际排空、新代际承接新工作的策略，但必须限定旧版本保留数量、截止时间和故障处置，避免“为了不破坏运行”而无限保留进程、连接与凭据。安全紧急撤权、用户停止与预算耗尽优先于版本固定。

### 变更通道

```text
source inspection
  → compatibility / permission / cache-impact assessment
  → target-revision-bound proposal
  → appropriate approval
  → prepare and validate new generation
  → CAS-controlled activation
  → observe or rollback under explicit policy
```

不是所有包管理或外部副作用都能原子回滚。必须区别：配置指针回退、代码版本回退、数据迁移回退、外部副作用补偿。只恢复旧指针不证明四种都完成。

### 前端约束

UI 贡献建议声明 view id、支持的数据 schema、host API 范围、所需 capabilities 和 typed commands。读投影，发合法动作，不直接更新 work repository。

历史成果应独立于当前 producer/renderer 的安装状态。扩展缺席时至少有 host-owned 的基础阅读、来源与决定记录；实际可用动作由 host 当前权限和版本判断。后端不支持时 UI 显示不可用原因，不用占位按钮假装功能已存在。

同进程 extension 只提供逻辑隔离，不自动提供权限隔离。第三方可执行代码的信任、进程隔离、凭据范围与安装脚本需独立审查；声明式资源可采用较轻策略。

## 7. Agent 可维护复现包

每个实际跨上游边界的适配点保留一个小维护包，不要求为每个 helper 新建目录。以下是模板；优先附加到现有 docs / evidence / tests owners：

```text
<existing-module-docs>/
  contract.md                 # 含义、不变量、非目标、失败语义
  provenance.json             # 上游、固定 SHA、路径、许可证、local patch
  compatibility.json          # 版本组合、实现方式、证据等级、已知损失
  maintenance.md              # 定位、复现、修复、升级、撤回
<existing-tests>/
  contract.test.*
  fixtures/<synthetic-case>/
<existing-evidence>/
  <bounded-run>/               # 命令、环境、SHA、结果、未验证项
```

必须能回答：为何选这一边界；调用方依赖什么；上游改了什么；何种现象能复现故障；在哪里改最小范围；如何证明没有放宽契约；如何退出。

维修循环：

```text
detect drift/failure
  → reproduce in isolated environment
  → attribute to contract/adapter/upstream/configuration
  → propose smallest change
  → independent invariant and compatibility tests
  → reviewed commit
  → controlled activation and rollback readiness
```

不得允许维修 Agent 通过降低断言、放开权限、删除历史证据或更新全部依赖来让测试变绿。升级后的通过不能覆盖旧版本失败证据。

### 一个容易漏掉的长期维护要求

复现与修复工具不能只能通过损坏的 Harness 启动。必须能在独立 CLI/干净 checkout 中读取契约、运行 fixture 与适配测试。应急读取历史、导出数据和禁用扩展也要有不依赖该扩展成功激活的路径。

不应把这一需求立即做成另一个“自我修改平台”；Git、固定测试命令、reviewed PR 与现有配置 apply 通道足以先验证。

## 8. 可派发工单

以下是准备好的工单边界，状态全部为 `not_started`。本轮未创建 agent 会话、GitHub issue 或分支。

### A — 当前边界与能力盘点（M01–M04 / M08 / M14，优先）

输入：当前 main、app/package.json/lock、架构、source resolver、EX-WK6。

任务：沿真实调用链标记来源与 owner，区分 current implementation / source reference / planned。记录 package、contract、instance、run 各自生命周期；定位 Pi async、取消、恢复与 MCP 版本边界。

输出：一张映射表和最小待验证列表；每行包含 SHA:path、调用者、被调用接口、转换损失、测试入口。

完成条件：不根据最新上游文档反向宣称锁定版本已支持；不重命名或拆分现有代码。

### B — 异步任务有界 PoC（M02–M04，依赖 A）

任务：用两项只读延迟任务证明 selective waiting、正确因果投递与重启恢复；对照 native / adapted / unsupported。先 fixture，再单列授权真实 provider 验证。

输出：状态/关联契约、故障测试、最小 adapter 差异；不提交第二套 loop。

完成条件：重复、乱序、取消、外部状态未知、Session 切换、旧版本任务、材料修订均有明确结果；不能提前标记业务完成。

### C — 请求与缓存回归（M01 / M09，与 B 配合，优先）

任务：从最终 provider payload 逆向核对所有改写路径，固定曝光排序与 breakpoint 编译；将非模型可见配置从 prompt fingerprint 排除。

输出：golden payload、变更影响表、离线断言与授权在线配对协议。

完成条件：UI-only/no-op 扩展变化不引起预期之外的 prefix diff；语义变更和撤权正确反映；缓存未知项明示。真实命中数据缺失则保持 not_tested。

### D — 生命周期与局部替换（M08 / M14，对齐 R3 → R4 → R5）

任务：消费 EX-WK6，选一个非核心能力做新代际激活失败、旧调用排空、资源释放、重启与回退实验。比较普通内部模块足够与真正需要 Cordis/进程隔离的差别。

输出：切换政策、effect ownership、旧版本保留界限、回退范围说明。

完成条件：失败不影响既有合法配置；不能用重新 run 旧包替代持久回退证明；安全撤权不因 drain 延迟。

### E — 前端贡献契约（M10 / M11，接入现有前端串行 writer）

任务：一个插件缺席/不兼容的历史成果，基础阅读仍成立；按钮权限、schema 和 generation 明确；缓存非影响项单独标记。

输出：view/command contract 和端到端负例，不新建平行工作账本。

完成条件：卸载不丢历史；过期动作被拒绝；新旧 renderer 数据不混用；无直接正式写路径。

### F — 维护演练与独立审查（M14，集成门）

任务：准备一处可控不兼容变更；让独立 Agent 仅靠维护包在干净 checkout 定位、复现和提出最小修复。由非作者核验断言未被放宽。

输出：复现完整度、修复触及范围、恢复证据、残余依赖与未检项。

完成条件：不依赖原作者口头 context；不需要整体升级；失败报告可复核；回退/停用后数据仍可读。

### 并行边界

A、C 的只读盘点可以并行；共享 service/control-plane 源码的 B、D 必须按现有 owner 串行集成；E 不夺取正在进行的前端写权；F 在固定代码快照上独验。以上是派单建议，不代表这些会话已运行。

## 9. 首轮集成验收门

| 门 | 要证明的事 | 不能冒充的证据 |
|---|---|---|
| 语义 | 工具执行、回执与工作接受分离 | 模型自称完成 |
| 兼容 | 固定版本的端到端能力和明确降级 | latest docs 或 syntax accepted |
| 恢复 | 重启、乱序、取消、未知结算有归属 | 进程内 Promise 成功 |
| 变更 | 旧调用安全、失败保留基线、资源释放 | 任意时刻 HMR 演示 |
| 缓存 | 最终 payload 无无关扰动；真实 read/write 单列 | system prompt 字符数或 mock usage |
| 维护 | 独立复现、窄修复、版本保留与退出路径 | Agent 声称“已修复” |

首轮不纳入：插件市场、通用微服务化、重写事件总线、全面自动升级、所有供应商统一语义、全场景多 Agent scheduler。只有纵切证明现有边界无法满足时，才升级抽象或引入更重基础设施。

## 10. 来源索引

这里给本地 Agent 可直接打开的来源。官方 latest/master 为 2026-09-09 的读取视图，不是已冻结实施基线；采用源码前另固定 SHA。所有候选都须与 Courtwork 的锁定版本核对。

### OpenAI 与缓存

- S01 Async tool calling： https://developers.openai.com/api/docs/guides/async-tool-calling
  - 消费：原生 async 协议、call linkage、边界和组合限制。
  - 不推出：应用已有 durable jobs、Pi 当前版本已完整支持。
- S02 Prompt caching： https://developers.openai.com/api/docs/guides/prompt-caching
  - 消费：按模型代际配置 breakpoints 与读取/写入计量；旧模型字段差异。
- S03 Anthropic tool use with prompt caching： https://platform.claude.com/docs/en/agents-and-tools/tool-use/tool-use-with-prompt-caching
  - 消费：工具/提示/消息失效层级、tool search 的缓存影响。
- S04 Claude Code prompt caching： https://code.claude.com/docs/en/prompt-caching
  - 消费：成熟客户端的 MCP 连接、升级和上下文压缩的可观察代价。

### Pi / MCP / DSH / GUI

- S05 Pi Extensions： https://pi.dev/docs/latest/extensions
  - 消费：生命周期、注册、reload、最终 provider payload hook 与信任界限；非 Courtwork 0.85.1 验收。
- S06 MCP Tasks overview： https://modelcontextprotocol.io/extensions/tasks/overview
- S07 MCP Tasks SEP： https://modelcontextprotocol.io/seps/2663-tasks-extension
- S08 MCP specification： https://modelcontextprotocol.io/specification/2026-07-28
  - 消费：明确协议代际与 opt-in extension，核对当前 client 2.0.0 实现范围。
- S09 DSH architecture： https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/architecture.md
  - 消费：services/events/effects、profile 生命周期差异、request freeze、jobs、迁移边界。
- S10 VS Code manifest： https://code.visualstudio.com/api/references/extension-manifest
  - 消费：一个包组合多个 typed contributions、声明兼容范围。
- S11 VS Code extension host： https://code.visualstudio.com/api/advanced-topics/extension-host
  - 消费：UI/工作区/运行宿主分离；不引入 VS Code 产品作为依赖。

### 两仓固定来源

- R01 Courtwork architecture： https://github.com/lesPrivilege/Courtwork/blob/62556b7f65170ecf30efb2869447ae85fe69d721/engineering/architecture.md
- R02 Courtwork current： https://github.com/lesPrivilege/Courtwork/blob/62556b7f65170ecf30efb2869447ae85fe69d721/engineering/current.md
- R03 Source resolver contract： https://github.com/lesPrivilege/Courtwork/blob/62556b7f65170ecf30efb2869447ae85fe69d721/docs/runtime-control/source-resolver.md
- R04 既有 DSH explore： https://github.com/lesPrivilege/Courtwork/blob/62556b7f65170ecf30efb2869447ae85fe69d721/engineering/mvp/execution/work-surface-kit/explore/ex-wk6-dsh-plugins-webui.md
- R05 Dependency declaration： https://github.com/lesPrivilege/Courtwork/blob/62556b7f65170ecf30efb2869447ae85fe69d721/app/package.json
- R06 SE Canonical 9.6： https://github.com/lesPrivilege/Schema-Engineering/blob/d78fd312955c1f594e59cbdcbb0d3074ac355940/papers/src/canonical.md

## 11. 建议收束

本轮最应优先批准的是“异步任务与缓存安全的有界验证”，以及支撑它的能力盘点和维护包；不是一项全局 Plugin Platform 施工。通过这一纵切后，再判断哪些模块值得独立分发、哪些需要进程隔离、哪些只需保持普通代码边界。
