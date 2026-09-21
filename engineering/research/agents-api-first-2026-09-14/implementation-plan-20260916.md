# OpenAI Agents API · 首个新增 Runtime 样板与前后端合流

2026-09-16 · 接 [原 Agents API 登记](README.md)及 [Claude 串行施工单](../../execution/claude-frontend-harness-2026-09-16/README.md)。Courtwork 源码基线 `f76dd7ec9f6cef845f67360cc0a22768ae309ca6`；官方 Node SDK 源码基线 `425502d2bf2da1bdd37efda3b0fa5add96fc8a51`。

**采用方向：OpenAI Agents API 作为首个新增 Runtime Adapter 样板，先以无环境会话和 CW 函数工具完成真实闭环。Pi 保留；同一套工作对象、权限、产物和界面承接两种执行器。** 本文为技术方案与后续施工登记，作者是本轮研究整合，施工 writer 为 Claude；未调用真实 API、安装依赖或交付运行实现。

## 纲要

1. [节点与选型](#节点与选型)
2. [官方协议核验](#官方协议核验)
3. [架构和最小改动面](#架构和最小改动面)
4. [身份、配置与工作接手](#身份配置与工作接手)
5. [函数工具、权限与效果结算](#函数工具权限与效果结算)
6. [事件、查回与取消](#事件查回与取消)
7. [前端合流与呈现](#前端合流与呈现)
8. [安全、数据与预算](#安全数据与预算)
9. [串行 PR 切片](#串行-pr-切片)
10. [验收与后续节点](#验收与后续节点)
11. [原入口回写](#原入口回写)
12. [固定来源索引](#固定来源索引)

## 节点与选型

### 一个样板检验三件事

一是执行器替换不要求把工作迁入另一个产品；二是同一 Host 工具及授权不依赖 Pi 私有 loop；三是新 Runtime 的输出、异常、恢复和文件仍由同一前端语法解释。供应商功能数量、一次 API 回复和新的模型名称不能代替这三项证据。

本单指 2026-09-10 发布 public beta 的 **Agents API**：由 OpenAI 托管 Codex harness 的会话接口。不是在 CW 中运行 Agents SDK，不是 Responses API 换名，不是 Codex App Server，也不复用网页订阅会话。[S01][S03][S08]

| 节点 | 采用方式 | 检验结果 |
|---|---|---|
| 第一节点：受控工作 | `environment.type: none`；一个主 agent；少量显式函数工具；CW Host 处理调用 | 云端 harness 能经相同权限边界读、改、检查，并在现有 GUI 中查回和继续 |
| 第二节点：远端产物 | `openai_hosted`；显式提供合成文件快照，回收确切产物和检查证据 | 云端环境的文件、命令结果能进入 CW 资源与检查面，不冒充本地修改 |
| 第三节点：自有环境 | `self_hosted`；独立 executor、环境凭据、隔离与生命周期合同 | 自有算力接入，不绕过 CW 权限与正式状态；不是把整个用户目录直接交给远端 shell |

第一节点不需要开放公网 localhost MCP、启动沙箱、复制整仓、搭建 webhook 服务或启用多 Agent。文件连接继续走 RD-006；检查继续走 DF-04。无环境模式没有原生 Bash/apply-patch/工作目录能力，但可由应用函数提供受控文件和检查操作；这正好让第一样板只改变 harness，不同时换执行环境。[S03][S06]

“首先适配”指新 Runtime 选型的优先级，不推翻已经工作的 Pi，也不把第二 Runtime 变成原 NDA/Pi Release 的前置。协议/接缝片先登记和实现；使用仓库写入与检查的组合片接在原 01–03 后，不等待 12 的产品 Prototype 或 13 的 Pages。

## 官方协议核验

下面只记录本轮确实读取的官方指南、API reference 和固定 SDK 源码；产品设计与待验证项分别列出。

| 已确认的接口事实 | CW 必须作出的处理 |
|---|---|
| `client.beta.agents.sessions`；REST 基础路径 `/v1/agents/sessions`；beta header 为 `OpenAI-Beta: agents=v1` [S08][S11] | 独立 Runtime Adapter，不塞入 Pi Model Provider 分支 |
| Session 保存对话和配置；idle 时 message 开新 turn，active 时 message 是 steer [S04] | 首节点只允许 idle 提交新工作；不把连续点击当作第二个 Run 或静默 steer |
| `none` 会话创建需要初始 input；官方指南给出 agent/model + input [S04][S07] | 首次 create 也会启动工作；不能采用“先建空 none Session，再发第一条消息”的假前提 |
| Function 等待项带 `turn_id`、`call_id`、`name`、`arguments`；结果通过 input tool-result 提交 [S06] | 使用真实待处理项和原身份；历史 function item 不等于仍待执行 |
| Stream 不重放丢失事件；items/turns 可以查询，读取有分页 [S05] | 先接新流并缓冲，再读保存状态和内容；不能只带本地 cursor 重连 |
| `output_text.done` 提供完整文本；delta 可缺席；item 保留 status/phase [S05] | done 替换同一 part；只出现完整结果也能正确显示，不重复追加或猜 final |
| 根 turn 的终态、子 agent 的终态、session idle 是不同事实 [S04][S05] | 根完成不由 idle 推断；子任务结束不关闭整次 CW Run |
| SDK `sessions.update` 只更新 metadata；创建时的 agent overrides 是整字段替换而非深合并 [S07][S11] | 原生配置按创建快照保留；变更通过新 lineage/明确接手，不假装远端热更新 |
| SDK events 参数的实际键是 `'Idempotency-Key'`，被写到 HTTP header；注释保证的是 submitted messages 重试 [S11] | 不照摘要写成普通 `idempotencyKey` body 字段；其他动作和首建请求的保证分别核对 |
| 当前概览规定美国数据驻留，且不支持 ZDR；自托管环境不改变此限制 [S02] | 本地工具和本地存储不等于云端不留数据；首批只用获准合成资料 |

SDK 源码 manifest 为 `openai` **7.16.0**、Node `>=22.0.0`、Apache-2.0；作为候选锁定版本。它与 CW Node `>=22.19.0` 的声明范围相容，但源码 manifest 不证明 npm 发布物、exports、完整运行测试已核对。施工时验证实际包版本与 integrity、最小 import/类型和假传输测试，再写 package-lock；不使用 `@latest`，不顺便升级 Pi。[S11]

本轮没有用一条营销示例承诺所有模型、effort 或账户均可用。`gpt-6-astra` 是官方示例模型；实际支持集合、账户权限和可用模型在协议片记录，不从现有 Responses 配置直接推导。[S01][S08]

## 架构和最小改动面

```text
CW Chat / Composer / Approval / Files / Review
                   │ 同一 Host API 与投影
                   ▼
Host：准入、作用域、凭据引用、Run、回执、恢复
                   │ 冻结执行计划
        ┌──────────┴───────────┐
        ▼                      ▼
 Pi Runtime Adapter     OpenAI Agents Runtime Adapter
 Pi 自有会话与 loop       OpenAI 托管会话与 loop
        │                      │ required_actions
        └──────────┬───────────┘
                   ▼
CW 受控工具调用入口 → 原 repo / ws / recipe / source owner
                   │ 精确效果与工具结果回执
                   ▼
同一 Chat 过程记录、文件差异、检查面；正式接受仍走 Work Core
```

协议适配接管外部会话 I/O，不接管 CW 权限，也不再驱动一个重复的模型 loop。不要调用 Agents API 后把输出再送进 Pi 当一次工具结果；不要把上游状态库复制成第二份 Work Core。

### 从当前耦合处提取，不先造框架

原登记已经定位 `app/server/service.mjs` 对 Pi `SessionManager` 和 `createSessionRun` 的直接依赖。先把这两类依赖收进 Pi 实现，再接第二实现；保留 Host 原 admission/configuration queue、作用域、tool policy、效果历史与 Core bridge。原生 journal 的打开、定位和释放属于 Pi adapter；云端 session 的查询、发送、恢复属于 OpenAI adapter。[CW01]

| 最小责任 | 边界提案；名称在 P03 片按现有符号冻结 |
|---|---|
| 能力说明 | `describe` 返回实际支持的动作及缺失原因；是既有 binding 的输入，不新增全局能力总库 |
| 执行 | `start` 接收 CW Run 身份、冻结配置/披露/工具描述及已有 nativeRef；返回归一化 observation |
| 接续观察 | `recover` 按 nativeRef 查状态、items、turns 和待处理 actions；不提交新输入 |
| 工具结果 | `submitToolResult` 只发送已由 Host 保存的结果；不自行执行工具 |
| 停止 | `cancel` 请求原生停止；确认结算与已执行工具分别记录 |
| 释放连接 | `disposeTransport` 释放流/监听/定时器；绝不等同远端取消或删除 |

不强求六个类或六个服务。接口必须表达这些不同责任；具体函数可以沿原文件组织。已有 `governTools` 内的真正验权/批准逻辑应成为两条路径共用的执行入口，不能只复制 allow/ask/deny 判断到新 adapter。

候选写权：`app/server/service.mjs`、原 RuntimeStore 与启动恢复代码、`app/runtime/pi-session-runtime.mjs`；新增薄 `app/runtime/openai-agents-runtime.mjs`，必要时增加一个原生事件 projector 和效果回执 helper。产品前端只动对应 04/05/08/10 的现有 reader/controller。名称为待施工文件候选，不是已存在模块；不为目录整齐拆全库。

新增依赖仅限通过协议片核对的官方 `openai` client。低层 events API 已能满足首片；SDK 的 `sessions.stream` helper 不天然替代 CW 持久化、审批和单 writer。采用任何 helper 前先查其自动调用/重试/释放行为，不将函数裸回调交给其自动执行。[S11]

## 身份、配置与工作接手

### 一张映射，不迁移工作对象

| CW 记录 | 原生关联 | 不可合并的含义 |
|---|---|---|
| Chat/Session ID | 当前执行谱系的 native Session ID；历史谱系仍留引用 | 一个 CW Chat 可先后关联不同 Runtime，不共享私有 transcript |
| Run ID + command ID | 一个 root turn ID；首建前允许暂未取得远端 ID | command ID 是提交幂等身份，不是 native turn ID |
| 调用/效果回执 | Runtime binding ID + native session/turn/call ID | 模型参数不指定另一个 Session、actor 或 Host 根目录 |
| Host event seq | 已接收/已归一化事实的本地 append-only 序号 | 不是上游 event_id，也不是上游可重放 cursor |
| 原生 live event / item | event_id 去重；item_id 及 part 坐标定位 | event、item、消息、模型请求不混数 |
| Source/产物/检查 | 原 owner ID、内容版本/hash、输入/输出关联 | OpenAI Artifact、运行文件和 Core accepted Artifact 分开 |

Store 增量记录 adapter ID/版本、配置 hash、执行谱系、native locator、原提交身份、待确认/恢复状态和必要回执引用。凭据只存引用。旧 Pi Session/journal 和历史 Run binding 保持原字节；老数据使用明确的 Pi 映射，不凭缺字段认定它属于云端。Host schema 从实际施工基线迁移，Core4/bridge5 不因本样板改动；原备份、旧 Host 拒新和独立恢复规则继续适用。

### 三种配置变化

**不变配置续谈：** 同一 CW Chat、同一配置谱系复用 native Session；新输入以新的 CW command 与 root turn 记录。CW 可以提供当前合法材料的增量，不重新塞整段 retained transcript。

**改变模型、effort、指令、工具或连接身份：** 按实际影响比较冻结的 config hash。原生更新只有 metadata，不能把全局设置变化投影为旧 native Session 已生效。新任务建立新谱系/Session，再按明确的接手范围提供工作摘要、精确来源、当前决定和未完事项。旧谱系不改；有在途/未知动作时先结算。无需轮换的纯视图偏好变化不新建 Session。[S07][S11]

**撤权或来源失效：** Host 在新调用及回传前重新检查并立即阻断越权。已经合法披露给云端的历史不能因本地撤权而宣称消失；后续是否允许继续使用原云端会话，由保留/披露策略决定，必要时新谱系不带受限历史。仅更新一条 prompt 不是删除或撤权实施。

首个 UI 选择只用于新 Chat 的执行方式。既有 Chat 主动更换执行器作为最后一片的明确接手动作；不把新增选择器悄悄做成所有 Chat 的全局切换。共享配置的实际 scope 由 Host 冻结并说明，控件放在 Composer 附近不改变 scope。

最小换核证据可先在同一 Matter 下由两个 Chat 使用两种 Runtime 接续同一版本的工作；这是工作可接手，不声称原生 Session 可互转。已有 Chat 内切换若实现，仍保留 CW ID、原消息和结果引用，并增记接手关系，不覆盖旧输入。

## 函数工具、权限与效果结算

### 首个真实工具集合

按现有工具 schema 输出少量 eager function 描述：获准来源读取、`repo_list/read/grep`、`repo_write`、DF-04 固定检查 recipe；需要人回答时复用 `ask_user`。精确名称由原工具 owner 定义。每项必须有真实 handler；DWB/DF 未接通的能力不向模型广告。

当前已注册的所有 MCP、Plugin、Skill 不自动承诺跨 Runtime 可用。首片可通过 CW 受控函数入口调用已核验的局部资源；原生远端 MCP 直连、executor MCP、自动脚本、模型挑选任意插件都另行验证。声明式 Skill 的读取可沿现有 metadata/body-on-load，但不冒称 `none` 已具备上游文件系统 skill discovery。[S03][S06]

### 调用链

1. adapter 收到 requires-action 提示后，取得当前 `required_actions`；校对 native session、root turn、call、函数名和参数。历史 items 只供阅读，不触发执行。
2. Host 解析到原工具描述和绑定快照，校验当前授权、源可读性、参数和作用域。模型不能通过 JSON 提供 actor、授权引用或任意绝对 cwd 来覆盖 Host。
3. 新调用在效果发生前保存意图及内容摘要。需要人决定时复用原 Approval 或 Question 对象；技术性的函数等待不一概显示 Waiting for you。
4. 人的批准绑定同一工具、目标、版本/hash、权限及调用身份。执行前重新检查；Deny 返回有界错误且零效果，Ask answer 不成为 grant。
5. 调用现有真实工具；文件路径检查、冲突保护、检查子进程及取消后 settle 保持原 owner。多个 pending calls 首版有界串行消费，不为上游支持并行而放宽本地单 writer。
6. 先持久化结果/效果回执，再发送原生 tool_result。回传成功与工具已经执行是两个记录；回传丢失只重发已保存结果，不重做文件写入或进程。

上游工具结果形态是 `agent.session.input.tool_result`，绑定原 `turn_id`、`call_id`；成功用 `success:true` 与字符串/获准内容数组，错误用 `success:false` 与 `error`。本地结构化结果转成确定性、有界的输出，JSON 对象需序列化。原始敏感 path、环境与密钥不能随错误透传。[S06]

效果账用 native identity 加 CW binding 身份关联。相同 key、相同内容返回已保存结果；相同 key、参数变化拒绝并留异常。副作用可能已发生而回执缺失时进入原 unknown/reconcile，不把“失败”反馈给模型暗示可以直接换 call ID 再试；相应目标/Run 保持阻断，先查实际效果。

写入和 recipe 共享现有审批与结果 reader，因此最终样板不是“云端说修改了”；必须能读回预期文件 hash 和真实检查退出码。原来 Claude 外部终端的开发测试仍不计作 CW 执行。

## 事件、查回与取消

### 首次创建与消息重试

首建先保存本地 submission intent：CW Chat/Run/command、配置 hash、披露范围和一个不含敏感名称的相关标记。使用带初始 input 的 create；可选择非流式取得 Session ID，再进入“接流＋读保存状态”，不需要假设能够订阅一个尚不存在的 Session。任何可用的远端 ID 一经获得就先持久化，之后才允许 Host 处理其函数动作。

首建 HTTP 成功回执丢失，是协议片必须验证的失败窗口。SDK create wrapper 没有与 events 同等的显式幂等参数；能注入 HTTP header 不证明服务支持同等语义。首建、未知副作用提交关闭未经证明的自动重试。没有 ID 时以原相关标记和账户项目范围作有界查找、核对配置/输入；metadata 不提供唯一性约束，未查到也不证明未执行。不能解除阻断、创建另一个 Session 并称恢复成功。[S11]

`events.create` 的 `'Idempotency-Key'` 与本地 command 关联；重复必须绑定同内容。其保留期限、冲突响应、作用范围和 tool-result/cancel 的保证在 A 中逐项确认；不将 SDK 参数存在外推为全部端点 exactly-once。发送、取消、工具结果分开请求，不把不同后果混在一个模糊批次里。

### 三类数据，三种恢复

**即时展示：** 用 `event_id` 去重；文本按 `item_id/output_index/content_index` 归位，done 用完整内容替换暂存文本。支持无 delta、重复 done、迟到 delta；commentary 不当 final，工具结果不当普通回答。[S05]

**保存内容：** 本地 Host 保留观察到的事件，并保留所需 item/turn 的版本化快照或受控读缓存。恢复后的 item 作为带来源的归一化事实入账，不编造未观察到的原生事件序列。旧 Host event bytes 不覆盖；视图按身份和来源修订合并，不把 append-only 误作“永远不能更新投影”。

**重连：** 建立新流并有界缓冲 → 查询 Session、目标 turns、完整需要范围的 item 分页和 required actions → 按 item ID 恢复 → 丢弃覆盖已终态 item 的陈旧缓冲更新 → 继续 live。恢复窗口再次断线时重做此过程；缓冲超限需有界落盘或重新同步，不无限积压。单页 limit=100 不是全量保证。[S05][S09]

UI 继续使用 CW 既有 afterSeq/cursor；上游 SSE 不是它的可重放事件源。丢失的中间 token、工具增量、时间戳不从完整 item 倒推出，轨迹覆盖显示真实缺口而非伪“完整回放”。未加载的历史按需读取；跨 Session 的迟到响应不能改当前对象。

### 停止是一条真实协议，不是关流

Stop 先关闭 CW 新工具准入、标记原操作和取消意图，再发送 `agent.session.input.cancel`；本地在途工具按原执行器取消/收尾，查询原 root turn 的实际终态。断开流、关闭网页、删除 Session 都不等于完成这条协议。[S04][S09]

原生取消事件按 Session 的当前 turn 生效，因此取消请求未确认时不准启动该谱系的下一个 turn；不能让迟到取消打断用户下一次任务。若已自然完成，记录真实完成与取消未生效，不强改成 Cancelled。

只有远端结果和本地效果都已确定，Host 才投影相应终态。远端已 cancelled、文件写入已完成可以同时成立；进程退出未确认、写入结果未知时仍保留未结算项。原生 turn.completed 也不意味着每个工具成功，更不意味着成果接受。[S04][S06]

Host 启动恢复必须按 adapter 分流：不能把原本用于本地 Pi 进程消失的规则直接用于仍在云端工作的 Session。首版正常退出尽力请求取消并保存剩余状态；非正常离线保持真实未知，重开按原 ID 查回。无凭据/无网络时可以看本地记录，但不能宣称已恢复远端控制。关闭浏览器只结束展示；相关风险在关闭/恢复上下文出现，不做常驻说明墙。

### 用量与压缩

读取原生 turn usage 或 session usage 时分别保存口径、时间和完整性；不把累计 Session 值与每个 turn 再相加。缺失不是零，后补使用带来源的更新。CW Run 不等于一个模型请求，无法取得内层请求数时不伪造本地 `turns` 计数。[S04][S05]

自动 compaction 由托管 harness 负责。当前原 CMP-01 是 Pi 原生手动 compact；本轮未建立 Agents API 的等价手动接口，因此该执行方式不广告 `/compact`。配置和命令菜单按实际能力过滤，不能把字符串发给模型代为“压缩”，也不能以 Responses compaction 事件当作 Agents 控制接口。[S01][S11]

## 前端合流与呈现

### 复用工作流，不加后台控制台

从既有模型/连接设置接入 **OpenAI Agents** 的凭据引用与可用性检查。执行方式和模型是不同字段；首个可选择项只有在 Host 支持该 profile 后出现。只改前端名称而后端仍调用 Pi 不算适配。未配置时给原位设置入口；正常选择不自动创建云端 Session、不自动收费探测。

首节点固定 `none + CW tools`；不提前画 `none/openai_hosted/self_hosted` 三个环境开关。接入说明一次讲清“OpenAI 托管执行流程，文件工具由当前 CourtWork Host 执行”，不以 Local 字样暗示模型和留存也本地。scope、必需披露和费用后果在配置/发送需要判断的位置出现。

| 触点 | 行为 | 原消费入口 |
|---|---|---|
| Home/Composer | 新 Chat 选执行方式；连接所需文件范围；草稿、附件、Project 保持 | 主单 01/05；原 model-picker 与 settings navigation |
| Chat 运行行 | 一次 CW Run 的叙述、工具和 final；不按每个云端 item 造一张卡 | 主单 04；thread-projection、run-activity |
| Approval/Question | 同一精确授权/回答往返；工具等待自动处理不骚扰人 | 原 tool policy、Question/Approval primitives |
| 过程检查 | 本地 Run/call 与 native item 可定位；顺序优先，缺 timing 不阻断 | v3 sidebar-trace-review、Inspector |
| 文件/检查 | 真实修改和 recipe 回执打开原右侧 reader；保持 exact version | 主单 08；Files/diff/check evidence |
| 失联/未确认 | 在所属 Chat/操作处查回，不重加全局 Refresh | v2 frontend-entry-audit、Host recovery |
| 设置/技术详情 | 需要时查看执行方式、实际模型、来源/配置版本、native IDs | 既有 Settings；不重建右栏 Runtime inventory |

不新增全局 Agents 页面，不复刻 OpenAI dashboard，不将资源总数、连接数、pending tool 数置于默认右栏。数据本身真实也不构成常驻价值。故障和待决项仍可发现；从所选操作进入诊断，不靠 telemetry 卡充当入口。

远端 item 只提供语义数据，渲染沿 CW 已有可信组件。API 输出不会天然包含 CW PresentationSpec；需要结构化展示时，通过本单已冻结的 Host presentation 函数/合同生成，不对任意 HTML、Markdown 或供应商字段自动执行。首样板先跑文本＋工具结果＋文件检查；facts 接既有 08 片，丰富 chart/flow 仍不变成首个运行前置。

## 安全数据与预算

**凭据：** 快速开始要求 `api.agents.read`、`api.agents.write`、`api.responses.write`；复用 CW 凭据存储和引用，不放入浏览器、MCP 参数、模型 prompt 或检查子进程。已有 OpenAI Responses key 已保存不证明具备 Agents 权限。首次检查明确区分配置存在、API 可访问与真实运行成功。[S08]

**披露：** 目录绑定是可访问范围，不是把整个目录上传或全文灌入云端。每次工具回传只提供获准片段、相关版本/相对定位与必要结果，记录接收方、来源和披露范围。对工作接手重新核验当前允许的来源；历史引用不是授权。首批正式 API 验证只用合成仓库，真实客户材料不随该施工授权发出。

**留存：** 官方当前支持美国数据驻留、不支持 ZDR，包括 self_hosted 场景。删除云端 Session、清理 cloud Artifact、归档 CW Chat、保留本地证据和撤销本地读写授权是不同动作。删除后的物理清理可能异步，不能承诺实时擦除。[S02][S09]

**预算：** 先关闭多 Agent、web_search、programmatic calling 和原生远端 MCP，仅启用经过 Host 审核的函数。限制本地每 Run 调用数、写入目标、读取/输出字节、recipe timeout 和总任务时间；超过后关闭本地准入并请求云端取消。应用超时不是断网后可证明的云端停止，也不是硬费用上限。若上游内部模型调用不可观测，不把 Pi 的每模型 turn 上限冒称仍能同样强制执行。

协议探针由用户配置 key 后在授权范围运行，先零副作用/合成数据，再少量真实任务。首轮固定一次小修复、一次取消、一次恢复及一次接手，不以跑成功为由无界重试。每次记录模型、effort、工具组合、真实成本可得性与退出原因；缺失成本保持缺失。生产没有自动回退到另一付费 Runtime 的策略。

## 串行 PR 切片

A–F 是原 **P03/P04/DRT-03** 内的切片名，不新增 RD 或全局 Gate。P04 的原具体范围仍按 [原逐卡表](../../release/harness-implementation-2026-09-12/disposition.md)核对；下面描述消费者和依赖，不重新给旧编号改义。

| 片 | 用户结果、写权与依赖 | 最小交付和反例 |
|---|---|---|
| A · 协议与准入快照 | 原 Agents 研究、版本/能力描述、离线协议 fixture；开工前核实际 HEAD | 固定 SDK/包、headers、环境、ID、首建/消息幂等边界；模拟传输证明请求正确。账户访问及实测另记，未取得 native ID 不假恢复 |
| B · 最小 Runtime 接缝 | service/Pi adapter/原 store 及恢复入口；不依赖完整治理重构 | Pi 经同一 port 运行，历史数据/journal 不改；没有跨 Runtime 能力串用；所有现有相关 Pi 定向测试保持 |
| C · 托管会话＋一个读工具 | OpenAI adapter、函数 gateway、Host 持久化、Chat/配置前端同片；接 B，独立合成材料即可起步 | 真 API 创建、模型请求读源、Host 读到确切版本、提交结果、final、后续 turn；Deny/越界拒绝。不是 Responses 或 Pi 代理调用 |
| D · 故障、取消与恢复 | 同 adapter/Host 原恢复及原位 UI；接 C | 断流后分页补齐、丢消息 ACK、function result ACK、创建 ID 未确认、取消延迟、Host 重启；不重发效果，不把 idle 当成功 |
| E · 相同仓库读改测 | 接 D 与 DWB-01/02/04、DF-04 的真实共同工具；接主单 04/08 | GUI 打开所选仓库、精确批准、真实 repo_write、真实 recipe、diff/exit/部分输出；与 Pi 用相同 fixture 比较，不新写第二套工具 |
| F · 组合与工作接手 | 配置谱系/允许的接手命令、同 Core/Review、主单 05/10/11 | 保持确切来源、成果和未决；同 Matter 换执行器后继续。缺某能力拒绝而非偷用 Pi；旧原生会话不伪迁移；合流后交付非作者复核与人类判断 |

C 是第一个前后端贯通里程碑；A/B 不应演变为几周的纯框架搭建。D 不被拖到发布以后，E 才能声明完整仓库工作样板。C 的只读源可以早于 DF-04 验证，但 E 必须使用已经闭合的 DWB/DF。Claude 单 writer 不并行争写 app/service/styles；每片精确提交、定向检查、原 owner 回写后接下一片。

主单 07 的命令能力需按两个 runtime 分别验证；第一节点不会因为 Pi 有 `/compact` 就替 Agents API 广告。主单 12/13 保留原计划，不阻塞 A–F，也不以漂亮原型替代 C–F。

## 验收与后续节点

### 一条可展示、可反证的路径

新建 Chat 并选 OpenAI Agents → 连接隔离合成目录 → Agent 读取确定 bug → 展示精确变更授权 → Host 修改指定版本 → Agent 调用固定检查 recipe → 在同一右侧阅读面查看 diff 和实际检查 → 断开/重启后重开 → 继续同一任务 → 对正式成果仍由人按原 Core 合同决定。

使用 v2 的 A/B 同名文件及上传副本 fixture，证明目标是所选目录，不是 prompt 中的路径或托管 out/。至少保留一条失败测试与修复后的结果，不能仅用退出 0 的空 recipe 展示“会检查”。

### 必须保留的最小反例矩阵

| 反例 | 断言 |
|---|---|
| 同 message 重交 / 不同内容复用 key | 原回执复用或明确冲突；不多创建 Root Run |
| create 已远端执行而 ID 丢失 | 未确认不自动重建；本地关闭新副作用，查回过程和残余不确定性有据 |
| 相同 call 重复 / 同 call 参数变更 | 原结果重发；参数变更拒绝，不重复执行 |
| 批准后文件变化、binding 失效、撤权 | 同一现有工具拒绝，旧批准不复活；UI 保留失败和草稿 |
| 文件写完、tool result 回传丢失 | 精确结果持久、重启只重发结果；不重写文件 |
| 工具可能执行、效果回执未保存 | unknown 阻断而非当作普通可重试错误；不放行新 call 绕过 |
| 无 delta / 重复 done / 迟到 delta | 单个 item/part 内容正确，final 不翻倍或回退 |
| 断流跨越 100 个以上 items | 分页覆盖清楚，保存历史和新缓冲不漏已保存结果、不串对象 |
| session idle / 子 turn completed / tool failed | 各按真实层级呈现，不能推出根成功或接受 |
| Stop 后远端已取消、本地进程仍在 | 不宣称全部停止；本地 settle 和远端终态分列 |
| 取消 ACK 延迟时提交下一任务 | 同谱系拒绝或等待明确结算，不让旧 cancel 取消新 turn |
| 活动消息输入 | 首版明确阻止新任务；不意外变 steer，不吞草稿 |
| 切模型/工具配置或换 Runtime | 原 session metadata 不伪更新；新谱系受控接手；旧历史可读 |
| `/compact`、shell、无支持能力 | 不广告假动作，Host 拒绝；不静默委托 Pi 或新增权限 |
| 删会话/丢 key/Host 离线 | 历史与当前控制能力分开；不声称远端已停、已擦除或自动迁移 |
| 模型伪造“已修改/已测试/已批准” | Files、Checks 和 Core 状态不变，只有相应 owner 回执有权改变 |

矩阵可大部分用确定性协议 fixture 和故障注入；真实 API 必须覆盖至少一次函数往返、后续 turn、一次 cancel 与断线查回；真正文件读写/检查另用 CW Host 与 GUI 证明。离线 fixture 不是上游服务保证，作者截图不是独立视觉接受。

UI 沿主单核 Home/Chat/Settings/Files/Review 相邻面、明暗、1440/1280/390、键盘/焦点/真实 200% 和 reduced-motion；变化涉及三栏再加宽屏。要求没有新默认 Runtime 卡、没有新增模糊 Refresh、没有无依据速率/百分比、恢复后不丢选中对象和阅读位置。

### 第二、三节点的最小下一步

**托管环境：** 先固定一份合成文件 manifest 与输入 hash，显式选择允许披露范围/网络/包；核对环境 file API 和已完成 turn 的 session Artifact 是不同对象。回收文件字节、原生环境/turn/Artifact ID、本地 hash、检查依据及缺失项。云端修改只形成候选，应用到本地 repo 仍需当前 basis hash 与授权，不能把下载叫作写入或接受。动态环境内容与已发布产物分别验版本；首节点 `none` 不借此宣称支持远端文件系统。[S12]

**自有环境：** 按原 RD-009 另评估 executor 的普通 OS 权限、进程/文件/网络隔离和 Core/密钥不可达。executor 指令通路不必逐条经现有函数 gateway，因此必须证明等价的强制权限，而非拿提示词作守门。Session、compute、filesystem 各有生命周期：同 environment ID 不恢复丢失文件，删除 Session 不替代停止自托管 compute。webhook 与 SSE 的 action-required 名称和 payload 也分别校验。[S10]

**高级 harness 能力：** 首个有需要的消费者再打开 tool search/defer-loading、programmatic tool calling 或 subagents。每项做 capability/权限/预算/结果身份差分，消费原 RD-005/Spark 角色合同；原生 child agent 不是自动成为 CW Spark/Expert。不给首样板增加 Swarm、任意远程 shell、完整 cloud orchestration 或全量 transcript 转换前置。[S01][S06]

## 原入口回写

本次补丁只给本目录 README 增加本方案入口，并把 v4 接回主施工单；v2/v3 增补字节保留。这里不覆写历史 Sep14 的“待核验”证据记录，而以本日核验覆盖其对应外部事实。

施工 A–F 按原 P03/P04/DRT-03 记录实现和证据；完成时同步 `engineering/current.md`、原 Runtime 支持表/恢复与迁移文档、相关前端语义与实际 public claim。不能把下表源代码检查写成 API 运行接受，不为纯计划升级 schema 或修改 Paper pin。

公开面可登记：**OpenAI Agents API 将作为首个新增执行器样板；复用 CW 的资源范围、工具授权与成果检查，在同一工作面运行和接续。** 这句话表达下一节点，不使用“已完成适配”。新截图在真实合流后固定产品 SHA；发布仍沿原授权。

## 固定来源索引

核验日期均为 2026-09-16。S01 为官方发布页；S02–S10 为官方指南。本轮通过 Exa 获取这些官方页面（其中 S09/S10 为官方搜索摘录），并通过 web 核对发布/API reference；部分指南在 web 直接打开失败不影响 Exa 已返回内容的范围。S05 首次全文返回尾部截断，恢复算法和分页段已从同 URL 的其他返回取得；未保存或宣称官方完整网页字节快照。S11 固定源码内容来自 GitHub 连接。所有下面的协议事实与本地建议分开，供应商客户证言和宣传性能未作为采用证据。

| ID | 官方来源与具体入口 | 本次用途 |
|---|---|---|
| S01 | [Introducing the Agents API · 2026-09-10](https://openai.com/index/introducing-the-agents-api/) | public beta、托管 Codex harness；自动压缩和高级能力的存在，不采用性能收益 |
| S02 | [Agents API overview](https://developers.openai.com/api/docs/guides/agents-api/overview) | Session/环境概念、费用类别及美国驻留/非 ZDR 边界 |
| S03 | [Architecture](https://developers.openai.com/api/docs/guides/agents-api/architecture) | none/openai_hosted/self_hosted；Host function 与原生执行环境分工 |
| S04 | [Run and continue sessions](https://developers.openai.com/api/docs/guides/agents-api/sessions) | 初始输入、idle/new turn 与 active/steer、根终态、取消输入事件 |
| S05 | [Events and items](https://developers.openai.com/api/docs/guides/agents-api/sessions/events) | item/part 身份、done、分页、非重放流及补读恢复 |
| S06 | [Functions](https://developers.openai.com/api/docs/guides/agents-api/tools/functions) | required_actions、函数结果、错误与效果恢复、eager/defer-loading |
| S07 | [Configuring Agents](https://developers.openai.com/api/docs/guides/agents-api/configuration) | inline/saved config、创建时 override、非深合并 |
| S08 | [Agents API quickstart](https://developers.openai.com/api/docs/guides/agents-api/quickstart) | API scopes、beta header、SDK 包及完整示例前提 |
| S09 | [Manage sessions](https://developers.openai.com/api/docs/guides/agents-api/sessions/manage) | 当前待处理动作、保存内容与删除/物理清理区别 |
| S10 | [Sandbox lifecycle](https://developers.openai.com/api/docs/guides/agents-api/environments/lifecycle) | 自托管 executor、失联/迟到、文件保存及独立 compute cleanup；作为第三节点条件 |
| S11 | [SDK events.ts](https://github.com/openai/openai-node/blob/425502d2bf2da1bdd37efda3b0fa5add96fc8a51/src/resources/beta/agents/sessions/events.ts) · [sessions.ts](https://github.com/openai/openai-node/blob/425502d2bf2da1bdd37efda3b0fa5add96fc8a51/src/resources/beta/agents/sessions/sessions.ts) · [package.json](https://github.com/openai/openai-node/blob/425502d2bf2da1bdd37efda3b0fa5add96fc8a51/package.json) | `'Idempotency-Key'` 精确键、metadata-only 更新、SDK manifest 和 Node 要求 |
| S12 | [Agents API Sessions reference](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/agents/subresources/sessions) · [Create](https://developers.openai.com/api/reference/typescript/resources/beta/subresources/agents/subresources/sessions/methods/create) | 请求/返回与会话、turn、item、Artifact 操作入口；示例字段不当作完整产品实现 |
| CW01 | [本地原登记](README.md) · [架构](../../architecture.md) · [原 Harness 排单](../../release/harness-implementation-2026-09-12/harness-dogfooding.md) | P03/P04/DRT-03 所属、Pi 耦合、Host/Core 责任、DWB→DF 顺序 |
| CW02 | [主施工单](../../execution/claude-frontend-harness-2026-09-16/README.md) · [入口清理](../../execution/claude-frontend-harness-2026-09-16/frontend-entry-audit.md) · [右栏/Trace](../../execution/claude-frontend-harness-2026-09-16/sidebar-trace-review.md) | 共享语法、实用入口、对象阅读、按需过程与隔离 Prototype |

SDK blob 定位：events.ts `3ddfbda67d65185a7035060a63ce1e3608e95e5f`；sessions.ts `0c2752c5124120121e1528927b7224a3a12f9344`（本轮读 1–160 行）；package.json `5d567857f1eb759e20001117c125c9b2ea58d848`（读 1–90 行）。CW 原 Agents 登记 blob `f883e4d4700b790c682363b453952a5e09d2ef2d`。源码定位不代替已发布 SDK integrity 或服务行为证据。

## 2026-09-21 · Slice B acceptance

[Pi port independent acceptance](../../execution/claude-frontend-harness-2026-09-16/evidence/p03b-pi-runtime-port-review-20260921/README.md) closes B at source `c2be594`, local merge `e2eaf6d`. Native journal/identity and Host governance remain unchanged; provider helpers and Pi-shaped options/outcomes await the actual C consumer. No hosted transport, CLI execution or C–F implementation is claimed or started by this acceptance.

## 2026-09-21 · C transport dispatch

[Ready Fable order](../../execution/claude-frontend-harness-2026-09-16/p03c-agents-transport-20260921.md) breaks C into serial reviewable increments: SDK transport/identity first, then Host remote binding and one governed read function. The first adds no schema/UI/live capability. Exact SDK artifact and request-key drift are verified before implementation; historical pins remain. C is not accepted until its original live read milestone is demonstrated. D/E/F retain their scope and ordering.
