# Agents API 优先适配 · 架构与最小验证方案

2026-09-14 · 设计提案，尚未实施。外部事实以 [SOURCES](SOURCES.md) 的 S01–S13 为准；本地基线见 README。

## 1. 为什么先适配它，而不是再加一个模型下拉项

希望得到的效果是：用户在 CourtWork 中开始一件工作，知道当前交给谁、使用哪些资料、动作发生在哪里；运行中可以介入，离开后能看见真实结果；执行器更换后，工作来源、候选、决定和未决仍然存在。

Agents API 在 2026-09-10 发布 public beta，由 OpenAI 运营 Codex harness；执行环境可无、OpenAI 托管或自托管。[S01–S03] 这使它成为检验“执行机制可以更换，工作仍由 CW 持有”的新消费者，而不仅是模型协议测试。

本轮建议将它排在新增 Codex App Server adapter 之前。App Server 保留为本地执行、原生客户端交互和后续环境对照候选。[S17] 这不是取消 Pi，也不把 Agents API 与 Agents SDK、Responses API 或 App Server 当作同一接口。

**可证明的性质**：CW 可在固定能力集合内，将 Pi 执行组合替换为 managed Codex 执行组合，并保持工作合同及 UI 后果。

**不能顺带证明的性质**：任意 harness 内部模块都能单独替换；跨 runtime 私有 transcript 可互通；不同模型结果等价；主权/离线能力；所有环境和工具拥有相同审批机制。一次 bundle replacement 同时改变模型、执行或环境时，也不是这些变量的因果消融。

## 2. 拟议组合边界

```text
CourtWork Web UI
    │  用户意图 / 既有投影与动作
CourtWork Host
    ├─ 身份、授权、连接、运行回执、历史与文件读取
    ├─ Work Core / Work Extension：来源、候选、正式效力
    └─ 最小 Runtime Port（由两个真实消费者反推）
         ├─ Pi adapter → 现有 Pi loop + Provider adapter
         └─ Agents API adapter → OpenAI managed Codex harness
                                  ├─ environment: none
                                  ├─ openai_hosted
                                  └─ self_hosted → codex exec-server
```

这是责任图，不是新增服务清单。Runtime Port 的 create/open、submit、observe、control、reconcile、close 等名称是设计责任，不是已冻结 API。沿现有 Host/Run 合同逐项确定 DTO，不让 upstream session ID 取代 CW Session/Run/Matter 身份。

Agents API 在此归 Runtime Adapter。OpenAI 同时提供模型与托管执行，不意味着复用当前 Model Provider 注册卡即可完成接入。Models 只显示该执行组合确有的能力，Runtime 配置表示执行机制，Environment 表示文件/动作的位置。DeepSeek 继续由适合它的现有组合承载。

Work Core 不导入 API SDK；候选经原 Work Extension 验证；正式接受仍在原 owner。将输出保存在远端或标为 artifact，不赋予 CW Artifact 的正式效力。

## 3. 已核实且会影响实现的 API 事实

| 官方事实 | 对 CW 的设计含义 |
|---|---|
| Session 持续保存工作，消息在 idle 时开启 turn，在运行中用于 steer；事件是实时变化，items 是可查询历史。[S04–S05] | Composer 的“插话”和“下轮发送”不能暗中混用；保持 CW 身份到远端 session/turn 的显式绑定。 |
| 事件流不重放漏失事件；恢复需重新订阅并缓存事件，再查 session/items 并按 item 身份合并。[S05] | 不用简单 SSE 重连宣称恢复。丢失的中间 trace 保持 coverage 缺口，不能从最终文本反造工具历史。 |
| 文本 done 带完整正文，delta 可能缺席；idle 和关闭 stream 都不是成功证据。[S04–S05] | 不强制要求有 token 动画；正文按 part 合并，运行与连接状态分开显示。 |
| Function calls 由应用执行，required_actions 才表示当前待处理；结果关联 turn_id/call_id。[S06] | 本地 Host 可通过出站 API 完成受控 reader / candidate 工具往返，不必先把本地 MCP 暴露公网。 |
| subagent 共享 session 的环境文件系统，不支持 function tools；有环境时并非每个 child 一个独立 sandbox。[S07] | 首片禁用内部 delegation；以后 root 的本地 function 桥不能自动当成 child 能力。不同权限角色先用独立 CW assignment/session，而非名字隔离。 |
| 托管与自托管的文件回收接口不同；self_hosted 文件不经 session Artifacts API 发布。[S10] | 文件 reader 由 Environment adapter 实现，不把 `/workspace/outputs` 在所有环境下都当作自动持久成果。 |
| usage 为 best-effort，可为空或更新；公共 beta 不开放完整 trace 导出，命令输出是否截断亦未提供。[S11] | 不绘制“精确费用”“全部日志齐全”。检查结果需要受信验证器和固定产物，不能只信模型总结或可能截断的终端文字。 |
| self_hosted 用受限 executor key 和出站连接；harness 仍由 OpenAI 运行。[S09] | 不暴露主应用 key，不将用户整个电脑当执行环境；environment 本地不等于数据或模型处理全本地。 |
| 官方 overview 明示当前仅美国数据驻留、不支持 ZDR；自托管环境不改变此点。[S02] | 首片仅合成/可公开资料；需私有、驻留或主权模型的任务保留其他 runtime 路径。未读取用户账号资格或具体商业合同。 |

## 4. 首片闭环：无 sandbox 的受控工具往返

**目标**：先验证真实 managed harness、CW Host 工具边界和同一 GUI，不等沙箱、电脑控制或多 Agent 全部完成。

用户打开普通 Chat，选择实验性 Agents API 执行配置，附上一份获准保留的合成文本，请它比较两版并说明依据。根 Agent 通过受控 function 获取精确版本、返回结果；GUI 能看见调用、结果、停止与再次打开后的历史。需要正式工作时才附着既有 Matter。

候选工具是“获准来源列表/精确读取”和“按原领域合同提交候选”；名字与参数由当前 reader/Work Extension 反推，不能在本包内发明生产 API。先做 reader 往返，再接 candidate。不给 accept/resolve、任意 SQL、凭据读取或任意 shell。

采用 `environment.type: none` 的动机是去掉环境生命周期变量。它仍是远程 managed harness；不是本地模型、不是无数据披露。创建时提供 agent 与 initial input。应用函数并不会因设置 environment 自动在那里执行。[S03/S06]

### 最小实现责任

Host 保存内部请求身份、远端 session/turn 绑定、adapter 配置修订、选择的模型/工具及允许披露的来源版本。凭据仍在可信 Host；UI 只拿脱敏的能力与连接结果。

Adapter 接受输入，订阅/查询远端状态，将原始事件与规范化观察关联；未识别类型进入按需诊断，不误判终态。源码中已有的 Pi SessionManager 生命周期耦合只提取当前两个消费者必须的部分，不进行通用化大重构。

Function handler 先验证所属 CW session、活动 Run、tool admission、当前 grant 与 source revision，再调用原 owner。使用远端 session/turn/call ID 和本地命令身份保存结果；历史出现一个 function_call 不是再次执行依据。副作用已经发生而回执不明时先对账，不盲重放。[S06]

### 退出证据

真实 API 正常往返一次；拒绝跨来源、撤权后读取；断开并恢复同一历史；取消有终态或明确未确认；再次发送不重复正文/调用。若有候选，则同一 Core 能读其来源与状态。此片不冒充完整 coding、正式人审或内部多 Agent 验收。

## 5. 第二闭环：托管环境中的 coding 产物与检查

采用单一 OpenAI-hosted 环境，放入固定小型合成仓库或 fixture，提供明确检查程序；默认关闭无需使用的网络。Agent 修改一处功能、运行检查，输出 patch、实际文件和检查记录。CW 下载后计算自己的内容 hash，保留远端 session/turn/path 与本地版本关联，再进入现有 diff/reader/Review。

先采用官方托管环境，减少第一轮第三方 compute 配置；E2B 是 GUI/接口参考，不是强制运行依赖。托管环境设置与文件发布见 S08/S10。

检查结果的可信度单独处理：Agent 自写 `tests-passed.json` 只是一项来源。优先由固定、受信测试入口产生记录，并由独立本地验证在相同输入版本上复跑，避免模型同时修改检查器又自证。关键 stdout 若过大或完整性不明，GUI 保留限制而非猜“完整”。

拒绝或异常：依赖准备失败、无产物、下载中断、同路径不同版本、取消后远端效果不明、检查失败却 turn completed。停止 stream 不等于停 Agent；删除 session 前先保留必要输出。

**注意**：托管 shell 不必经过 CW 每次工具审批。没有公开可拦截合同与实测时，不显示“每条命令已由 CW 批准”。首片的安全边界是合成环境与预先限定能力；高后果动作继续走 CW 应用函数或外部正式 owner 的边界。

## 6. 第三闭环：证明工作可接续，而不迁移私有会话

固定同一个 Work Contract 与输入来源，分别让 Pi 与 Agents API 产生可由原 Core 处理的候选；同一 GUI 显示依据、差异、失败和待审。人作真实决定后，新执行者从已获准的工作状态重建上下文并继续，不需要导入另一执行器的原生 transcript。

比较的是合同、来源、正式状态与下一步是否保持，不要求两模型逐字输出一致。分开保存模型质量与适配正确性结果。实际领域合同若不支持 coding Artifact，沿当前已支持的文档消费者完成 Work 替换证明；coding 执行检查另列，不能给两者贴同一个“全部通过”。

这是可对外演示的主要差异：同一份工作不依赖一套 harness 记住全部经过。仅有两个 engine 下拉项或两个 hello-world 不满足退出。

## 7. 第四闭环：再开启内部 subagent 与环境替换

### 原生 delegation

先用两个相互独立的只读研究问题，限定并发和预算，主 Agent 汇总。GUI 在一张任务卡内显示 root/child 身份、状态、产物与错误，可展开查看，不预先建立全局 DAG 编辑器。

child 终态不能关闭 root，create/wait action 完成不等于 child 工作完成。API 内部执行组织由 managed harness 管理；CW 记录关联、预算和成果消费，不重复建立一个会给同一 child 派工的调度器。[S07]

若子任务必须独立验权、使用不同模型/Runtime 或拥有不同写范围，就提升为 CW 管理的独立 Assignment。首先两个任务、一个明确汇合者、独立输出或串行写，再看真实证据是否需要多边消息与动态图。

### 自托管环境

仅在本地依赖、私有网络或浏览器/桌面是明确消费者时，增加 self_hosted lane。优先一次性 container/VM，不直接接本人的日常 OS 或活动主工作树。使用受限 executor key、独立日志/数据、单一环境生命周期 owner；记录 session→environment→compute 的关联。替换 compute 不自动还原文件。[S09/S13]

先验证“写一文件→断开 executor→原环境重连→精确读回→保留产物→清理”。自托管工件通过对应文件 API 回收，不能套托管 Artifacts API。[S10] 接外部 compute 的退出也要明确谁负责释放；删除 OpenAI session 不能自动推出第三方资源已回收。

## 8. GUI 最小映射

| 人看到的交互 | 服务端承重事实 | 禁止的误投影 |
|---|---|---|
| 当前执行配置 | runtime binding、model、environment 和支持集合 | OpenAI 连接成功等于所有模型/工具可用 |
| 发送 / 插话 | 内部请求身份、远端 turn 状态与提交回执 | 发送请求成功等于 steer 已生效 |
| 工具卡 | call 身份、实际 action/result、权限回执 | requires_action 一律等于待人审批 |
| 等待环境 | environment 状态和可执行恢复动作 | 连接中显示 Agent 正在思考 |
| 停止 | cancel intent 与远端确认分开 | 关闭面板/流即完成取消 |
| 回到工作 | items/turns 重建与 coverage、精确产物 | 重连后补造漏失 trace |
| 文件/差异 | bytes/hash、来源 turn/path、原 owner | 远端 artifact 自动 accepted |
| 子任务 | root/child 关联和各自终态 | child completed 自动让整件工作完成 |

上述是现有 UI grammar 的投影增量，不强制新侧栏。主对话保持中心，技术信息按需展开；主要动作、权限后果、错误和恢复不能藏到 tooltip。

## 9. 版本、可维护性与窗口期

需要固定 CW SHA、OpenAI SDK 精确版本、beta header、adapter 修订、请求/回执 schema 样例、真实模型配置、环境模板或镜像与工具版本。服务端 harness 若未返回可固定的 revision，明确记录 managed/unknown，不用开源 Codex HEAD 假装服务端运行 SHA。

API 的首片合成协议测试、真实 API 探针与实际 GUI 测试分别留证。公开样例或 quickstart 代码不是支持集合本身，首次安装不使用浮动 alpha/latest 作为长期 pin。确有破坏性协议变化才重开该 adapter。

窗口期的目标应是一个可复现的 GUI 集成与有价值的互操作反馈：不是比别人更早支持全部 feature，也不是先宣布“官方合作”。一个完整小闭环即可验证产品位置；后续把实际接口缺口、恢复反例和 demo 作为上游交流材料，外发另按用户授权。
