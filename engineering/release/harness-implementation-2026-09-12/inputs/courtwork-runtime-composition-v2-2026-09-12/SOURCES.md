# 来源与证据范围

检索/复核日期：2026-09-12。文件路径和版本明确；研究建议与事实分列。外部动态文档只支持所述 API/设计存在，不等于当前锁定实现已支持。

<a id="s01"></a>
## S01 · 用户本轮指令与上一版原件

本轮用户明确提出：Pi core + extensions 整体可替换；Spark/Attention/Expert 是产品运行封装；provider 单独适配；按需维护自足状态；GUI 跑通、Runtime 替换、Work 小场景三阶段。设计选择以此为直接来源。

已读取当前对话正文文件 `CourtWork-harness-release-ruling-2026-09-12.md` 与 `03-PR-PLAN.md` 的相关内容，并程序读取上一版 ZIP 的 README、RD 计划和文档落位。上一版 ZIP 原字节随本包保存，hash 见 `input-receipt.json`。未把旧包自述的产品验证当本次测试。

<a id="s02"></a>
## S02 · CourtWork 固定架构及 main

[固定 DEC-013](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/engineering/architecture-runtime-canon.md)

[远端 main 查询](https://api.github.com/repos/lesPrivilege/Courtwork/branches/main)

connector 本轮返回 main=1ac28980c4877f4a86adf586aeb1b66980e23504。当前 canon 明确概念/实现边界、Pi 耦合、DRT 计划及各类状态 owner；未逐行重审整个仓库，未查本地未提交内容。

<a id="s03"></a>
## S03 · 当前 Pi 依赖

[固定 package.json](https://github.com/lesPrivilege/Courtwork/blob/1ac28980c4877f4a86adf586aeb1b66980e23504/app/package.json)

三个 Pi 包固定 0.85.1，MCP client 2.0.0，Node engines >=22.19.0。本轮只复核声明，未安装或测试依赖，不从 package.json 推断实际二进制已运行。

<a id="s04"></a>
## S04 · Pi 官方 SDK

[SDK 文档](https://pi.dev/docs/latest/sdk)

公开描述嵌入、资源加载、AgentSession 与 Agent core 责任。latest 页面只作责任划分参考；具体 0.85.1 API 需从锁定包重核，不能由最新文档反推本仓已实现。

<a id="s05"></a>
## S05 · Codex App Server 官方介绍

[Unlocking the Codex harness](https://openai.com/index/unlocking-the-codex-harness/)，2026-02-04。

只用于确认官方公开接入方案及其总体目的，不声称所有产品内部接口都已开放。

<a id="s06"></a>
## S06 · Codex App Server 官方接口文档

[官方入口](https://developers.openai.com/codex/app-server) 本轮重定向 [ChatGPT Learn](https://learn.chatgpt.com/docs/app-server)。

公开 thread/turn/item、流式事件、interrupt、能力与 experimental 限制。页面同时存在稳定 API 子集与实验性功能/传输说明；实现时须 pin binary 和生成 schema，逐项确认支持。不由文档存在推导 CW 兼容或完整生产支持。

<a id="s07"></a>
## S07 · DeepSeek 官方思考模式文档

[思考模式](https://api-docs.deepseek.com/zh-cn/guides/thinking_mode/)

本轮搜索返回官方页面正文摘录，说明 effort/参数是否生效及工具请求的 reasoning metadata 回传条件；直接 open 重试返回内部错误，未取得完整页面。本文只采用这些摘录支持“需验证具体模型协议”，不基于摘录冻结完整 codec 或模型默认值。

<a id="s08"></a>
## S08 · DSH 固定架构参考

[Architecture](https://github.com/deepseek-ai/deepseek-harness/blob/c291e7961a515f6d7af9304e7fd1d257929aef26/docs/architecture.md)

本轮经 connector 读取 profiles/bundles、按启动或 live 的应用策略、service/provider/consumer 等相关内容。长响应后段截断，不声称全文独立审计。固定 SHA 来自上一轮公开取证；此处不声称是当前最新 commit。用作可替换组合的思想来源，不建议本轮迁入 Cordis。

<a id="s09"></a>
## S09 · Hermes 候选生态

[NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent)

检索核见官方仓库的会话/记忆/技能/调度等产品描述。只作候选包边界清点依据，未验证协议或独立生命周期，不为其创建已兼容状态，不采用宣传性比较结论。

<a id="s10"></a>
## S10 · OpenClaw 候选控制接口

[官方 Gateway 协议](https://docs.openclaw.ai/zh-CN/gateway/protocol)

官方搜索返回 WebSocket 控制、身份/scope 与协议/客户端包说明，并提示某些包可能尚未随版本发布。只证明有可研究的公开入口，不保证 npm 可安装或 CW 能消费；需版本/能力实测。

## 本包不是以下证据

不是产品运行、真实 provider、GUI、SDK protocol fixture、性能、安全审计、Runtime 替换或非作者验收。包内校验只证明交付文件完整、内部引用和阶段映射一致。实际采用和实现继续回到仓库唯一状态 owner。
