# 来源与选型回执

读取日：2026-09-14。以下为通过 Exa、web 与 GitHub 得到的一手资料摘记。只读资料不证明本地接通、性能、生产安全或用户验收。

## 证据范围

本轮 Exa 调用成功。部分新 OpenAI 指南通过普通 web open 返回 Cache miss，但通过 Exa 可以取得正文；因此相关条目明确写出 Exa 读取方式，不冒称两种抓取均成功。检索命中的镜像不是采用依据；E2B 示例已回到 GitHub 原仓固定 commit 核对。

下面的观察与采用建议为转述，不是官方对 CourtWork 的认证。文档型 URL 是当日可变来源；未固定的 SDK/二进制版本仍待本地解析、锁定和测试。包内 SHA-256 只校验此交付包，不代表外部网页原字节快照。

## 原仓入口

- **R01** [engineering/roadmap.md](https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/roadmap.md) — 长期覆盖、原编号与依赖；旧历史按 current 和后续裁决读取。
- **R02** [engineering/research/architecture-node-2026-09-13/runtime-replacement.md](https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/research/architecture-node-2026-09-13/runtime-replacement.md) — 两条适配轴和最小替换证明；原首候选是 App Server，本次优先级需在本地追加裁决。
- **R03** [engineering/research/chat-memory-broker-2026-09-12/README.md](https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/research/chat-memory-broker-2026-09-12/README.md) — 原生通道、conversation capture、可选 Broker 与受控披露分开。
- **R04** [engineering/research/architecture-node-2026-09-13/workspace-governance.md](https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/research/architecture-node-2026-09-13/workspace-governance.md) — 已有 owner、接管投影和渐进披露设计。
- **R05** [engineering/research/mature-practices-2026-09-12/pr-plan.md](https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/research/mature-practices-2026-09-12/pr-plan.md) — 保留/引用/关联/索引/注释/盘点与 UI 的既有分期。
- **R06** [engineering/current.md](https://github.com/lesPrivilege/Courtwork/blob/7e1a1ff047721e1ca6c871deba7f367ccea55a06/engineering/current.md) — 本地接收必须重新读取实际当前状态；本包不是 current 替代物。

## 一手资料与本轮消费建议

### S01 · Introducing the Agents API

来源：https://openai.com/index/introducing-the-agents-api/
读取：Exa full-page fetch + web search。本地执行：not_run。

**观察：** 2026-09-10 public beta；OpenAI 托管 Codex harness，可选择执行环境。

**消费：** 作为优先 Runtime 候选；不将客户案例数字或 production-ready 文案作为 CW 验收。

### S02 · Agents API overview

来源：https://developers.openai.com/api/docs/guides/agents-api/overview
读取：Exa full-page fetch。本地执行：not_run。

**观察：** Session、Environment、Agent、Events/items 的分工；当前仅美国数据驻留，不支持 ZDR，自托管 sandbox 不改变该资格。

**消费：** 首片用合成/公开数据；本地算力不等于本地模型/会话。费用包含实际模型、工具及适用的环境成本。

### S03 · Agents API Architecture

来源：https://developers.openai.com/api/docs/guides/agents-api/architecture
读取：Exa full-page fetch。本地执行：not_run。

**观察：** Harness 与 environment 分开；none 无内建 shell/文件；functions 由应用处理，self_hosted 使用 executor。

**消费：** 首片 none + 受控函数；不先建设所有沙箱或公开本机端口。

### S04 · Run and continue sessions

来源：https://developers.openai.com/api/docs/guides/agents-api/sessions
读取：Exa targeted search content。本地执行：not_run。

**观察：** idle 时输入开始新 turn，运行中输入用于 steer；取消通过 input.cancel；idle 不证明成功。

**消费：** CW Run 与远端 turn 显式关联；发送、插话、取消 intent 与观察结果分开。

### S05 · Events and items

来源：https://developers.openai.com/api/docs/guides/agents-api/sessions/events
读取：Exa full-page fetch。本地执行：not_run。

**观察：** 实时事件不重放；恢复先订阅缓存，再读 session/items 并按 item ID 合并；done 可以带完整文本，delta 可缺席；历史列表须分页。

**消费：** 实现 reconcile 而非仅重连；未恢复的中间事件保持缺口，不捏造完整 trace。

### S06 · Functions

来源：https://developers.openai.com/api/docs/guides/agents-api/tools/functions
读取：Exa full-page fetch。本地执行：not_run。

**观察：** required_actions 表示待处理；结果以 turn_id/call_id 返回；副作用回执丢失时先查结果。

**消费：** 复用原 owner 的精确 reader/candidate；以原身份保存回执，不给 accept 或任意本地读写能力。

### S07 · Multi-agent

来源：https://developers.openai.com/api/docs/guides/agents-api/multi-agent
读取：Exa full-page fetch。本地执行：not_run。

**观察：** child 有自己的 context，但共享环境文件系统；不支持 function tools；coordination item 完成不代表任务完成。

**消费：** 首片关闭 delegation；内部 child 不等于独立 CW 权限角色或不同 runtime。

### S08 · OpenAI-hosted sandboxes

来源：https://developers.openai.com/api/docs/guides/agents-api/environments/openai-hosted
读取：Exa targeted search content。本地执行：not_run。

**观察：** 托管 Linux 环境可配置输入/包/网络；网络默认可用；setup 失败不进入正常执行；关闭 stream 不取消运行。

**消费：** 合成 coding 首选该环境降低集成变量；明确网络策略、输出回收与清理。

### S09 · Self-hosted sandboxes

来源：https://developers.openai.com/api/docs/guides/agents-api/environments/self-hosted
读取：Exa full-page fetch。本地执行：not_run。

**观察：** codex exec-server 通过出站 WebSocket 连接；使用同属 session 主体的受限 executor key；代码可以读取该 key。

**消费：** 主应用 key 不进环境；限制 executor 权限，保留原 remote_url/环境映射；禁止把示例浮动 alpha 当长期 pin。

### S10 · Files and artifacts

来源：https://developers.openai.com/api/docs/guides/agents-api/environments/files
读取：Exa targeted search content。本地执行：not_run。

**观察：** openai_hosted 输出目录产生可下载 artifact；self_hosted 使用自己的文件系统/API；删 session 前回收需要的输出。

**消费：** 环境 reader 分开；下载并自算 hash 后再入 CW 保留记录；远端 artifact 不等于正式接受。

### S11 · Observability and usage

来源：https://developers.openai.com/api/docs/guides/agents-api/observability
读取：Exa full-page fetch。本地执行：not_run。

**观察：** usage 可为空/变化、不是账单；公共 beta 不开放完整 trace retrieval/export；command output 截断状态未报告。

**消费：** 不造精确费用或完整日志；固定检查器与独立产物验证承担结果证据。

### S12 · Configuring Agents

来源：https://developers.openai.com/api/docs/guides/agents-api/configuration
读取：Exa targeted search content。本地执行：not_run。

**观察：** saved agent 与 session 分开；session override 不修改保存配置；提供的对象/数组是字段替换而非深合并。

**消费：** 记录有效配置；UI 草稿、saved config 与历史 binding 不混用。

### S13 · Sandbox lifecycle

来源：https://developers.openai.com/api/docs/guides/agents-api/environments/lifecycle
读取：Exa targeted search content。本地执行：not_run。

**观察：** session 可长于环境；每个环境一个生命周期 owner，重复请求不应重复分配；原环境 ID 不恢复替换算力的文件。

**消费：** 后续后台/自托管首片验证 idempotent allocation、回收与文件连续性，不直接搭调度平台。

### S14 · E2B Agents API workbench

来源：https://e2b.dev/resources/build-an-agent-workbench-on-openais-agents-api
读取：Exa full-page fetch + web search。本地执行：not_run。

**观察：** 厂商公开 Flask/React workbench，含会话流、继续/取消/删除、后端重启、文件和 executor 日志。

**消费：** 消费 GUI 流与状态/文件分工；不采其性能数字，不要求迁移 CW 前端栈。

### S15 · E2B workbench source / API contract

来源：https://github.com/e2b-dev/e2b-cookbook/blob/5e61887a1154007e2e16d5a92fd5c8045d2fe51b/examples/openai-agents-api-python-sdk/README.md
读取：GitHub fixed-commit file read。本地执行：not_run。

**观察：** 读取 README 和同目录 openapi/openapi.yaml 前155行；样例以 OpenAPI 对齐前后端，提供共享访问，executor key 缺失时可能复用主 key。

**消费：** 采用合同同步、类型化事件与文件预览模式；拒绝主 key fallback、共享访问=租户隔离的误用。未做全源码审计、运行或许可审计。

### S16 · Daytona Agents API self-hosted guide

来源：https://www.daytona.io/docs/en/guides/openai/openai-agents-api-self-hosted-sandbox/
读取：Exa full-page fetch + web search。本地执行：not_run。

**观察：** 应用 key/executor key 分离、出站 exec-server、应用管理/回调管理生命周期示例。

**消费：** 作为 self_hosted 第二阶段参照，不加入首片强制依赖；示例的关闭顺序/空闲策略仍需按 CW 并发验证。

### S17 · Codex App Server engineering

来源：https://openai.com/index/unlocking-the-codex-harness/
读取：web full-page open + Exa search。本地执行：not_run。

**观察：** 原生双向 JSON-RPC，thread/turn/item 与审批事件，客户端/运行边界明确。

**消费：** 保留本地 Codex 候选；不把其 wire schema、审批能力、登录与 Agents API 混为同一东西。

### S18 · Playwright for coding agents

来源：https://playwright.dev/docs/getting-started-cli
读取：web full-page open + Exa search。本地执行：not_run。

**观察：** CLI 给 coding agent 浏览器命令，支持独立 session、截图/trace 等；与 MCP 使用姿态不同。

**消费：** 可作本地研发工具候选；不自动加栈，CLI 不是 Playwright Test，也不证明 CW 内置 CUA。

### S19 · Playwright MCP

来源：https://github.com/microsoft/playwright-mcp
读取：Exa targeted search content。本地执行：not_run。

**观察：** 结构化 accessibility snapshot，独立/持久 profile 与 extension 接法；共享活动 profile 有冲突风险。

**消费：** 按任务选用；独立 profile 与实际截图并用，浏览器自动化自身不是安全边界。

### S20 · Electron WebContentsView

来源：https://www.electronjs.org/docs/latest/api/web-contents-view
读取：web full-page open。本地执行：not_run。

**观察：** 可由 main process 承载 WebContents 的独立 View。

**消费：** 原生网页容器候选；不据此保证任意 provider 允许嵌入或导出，不先决定整个产品桌面壳。

### S21 · Electron Security

来源：https://www.electronjs.org/docs/latest/tutorial/security
读取：web full-page open。本地执行：not_run。

**观察：** 远端内容与本地能力需要隔离，限制导航/权限/IPC，不把远端页面视为可信应用代码。

**消费：** 网页容器研究的前置边界；不通过禁用安全限制追求演示可用。

### S22 · assistant-ui architecture

来源：https://github.com/assistant-ui/assistant-ui/blob/main/apps/docs/content/docs/(docs)/architecture.mdx
读取：Exa targeted search content。本地执行：not_run。

**观察：** 将 rendering、conversation runtime、backend、transport、persistence 分开；不同后端可有不同 state owner。

**消费：** 借组件解剖与生命周期，不整体替换原生 ES modules 和 Host 状态。

### S23 · Agent Client Protocol tool calls / prompt lifecycle

来源：https://agentclientprotocol.com/protocol/v1/tool-calls
读取：Exa targeted search content。本地执行：not_run。

**观察：** tool/update/permission 与结果类型提供客户端接法；同时检索到 v2 prompt-lifecycle 的不同状态模型。

**消费：** 候选跨 runtime 协议；采用时固定协议版本，不能混合 v1/v2 或把 tool completed 当 Work accepted。

### S24 · AG-UI events and interrupts

来源：https://docs.ag-ui.com/concepts/events
读取：Exa targeted search content。本地执行：not_run。

**观察：** 事件与 snapshot/delta、interrupt 的 UI 合同；能力缺席应保留未知，协议状态并非业务效力。

**消费：** 借鉴映射；无实际消费者不强制套协议或引入第二状态库。

### S25 · Claude Code parallel-agent patterns

来源：https://code.claude.com/docs/en/agents
读取：Exa targeted search content。本地执行：not_run。

**观察：** subagents、background sessions、teams、workflow 的协调者和沟通方式不同；teams 标实验性。

**消费：** 用于分工/父子导航参照，不跨 CLI/SDK/模式混用权限默认值或复活能力承诺。

### S26 · Git worktree

来源：https://git-scm.com/docs/git-worktree.html
读取：Exa targeted search content。本地执行：not_run。

**观察：** 不同工作目录具有自己的 HEAD/index，同时共享部分 repo 资料和 refs。

**消费：** 并行代码产物隔离的机制参考；不是 OS sandbox 或自动写权隔离。

### S27 · SQLite FTS5

来源：https://www.sqlite.org/fts5.html
读取：Exa targeted search content。本地执行：not_run。

**观察：** 全文索引可与原文分开；external content 的一致性由应用维护，支持重建。

**消费：** 词法/精确优先的可重建索引候选；中文与权限过滤需本地测试。

### S28 · Cua Fleet + Agents API

来源：https://cua.ai/docs/how-to-guides/sandbox/run-openai-agents-api-on-cloud-fleet
读取：Exa full-page fetch + web search。本地执行：not_run。

**观察：** 应用管理 self_hosted VM + exec-server + Cua Driver MCP；示例覆盖断连/重连/输出回收；删除 API session 不等于释放 Fleet。

**消费：** 作为 Computer Use 后续最小闭环参考，非 OpenAI 内置 sandbox provider，不照搬声明的测试成功。

### S29 · Vercel AI Gateway models and providers

来源：https://vercel.com/docs/ai-gateway/models-and-providers
读取：Exa targeted search content。本地执行：not_run。

**观察：** 模型/服务方与参数目录分开，可发现模型和支持参数。

**消费：** 借目录/能力来源维度，不因原生 Chat 包装而引入默认代理或替换当前 provider registry。

### S30 · Build ChatGPT UI / MCP Apps

来源：https://developers.openai.com/apps-sdk/build/chatgpt-ui
读取：Exa targeted search content。本地执行：not_run。

**观察：** 工具结果在 ChatGPT 内部 iframe 呈现，通过 MCP Apps bridge 与 host 交换工具/上下文消息。

**消费：** 这是把 CW 能力放进 ChatGPT 的方向，不是把 ChatGPT 本身放进 CW 的容器接口。

## 补充精确来源

- E2B OpenAPI：https://github.com/e2b-dev/e2b-cookbook/blob/5e61887a1154007e2e16d5a92fd5c8045d2fe51b/examples/openai-agents-api-python-sdk/openapi/openapi.yaml
- ACP v2： https://agentclientprotocol.com/protocol/v2/prompt-lifecycle
- AG-UI 中断： https://docs.ag-ui.com/concepts/interrupts
- AG-UI 能力： https://docs.ag-ui.com/concepts/capabilities
- Claude SDK subagents（只作与 CLI 区分的参照）： https://code.claude.com/docs/en/agent-sdk/subagents
- API quickstart： https://developers.openai.com/api/docs/guides/agents-api/quickstart
- 输入事件参考： https://developers.openai.com/api/reference/python/resources/beta/subresources/agents/subresources/sessions/subresources/events/methods/create

## 实现前尚需核实

当前 OpenAI 项目是否有适用权限/额度；SDK 精确版本与可用模型；创建与输入重试语义及 idempotency 覆盖；远端 harness 的可固定身份；所需工具审批是否可拦截；预算可强制范围；删会话/清理失败与恢复；依赖许可与供应链；原生 Chat 各 provider 的实际嵌入、捕获与导出支持。未做用户账号或私人凭据查询。

阅读过这些接口并不等于已验证其所有分支；真实探针、协议 fixture、GUI 故障和人审必须独立留证。
