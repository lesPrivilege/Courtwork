# CourtWork · 双轨研发方案：Agents API 优先

日期：2026-09-14（Asia/Singapore）
状态：网页端研究与架构建议，交本地 Codex 核对现状、裁决消费并切分；未提交仓库、未安装依赖、未调用付费 API、未运行产品或浏览器验收。

## 本轮结论

把 OpenAI Agents API 提升为首个新增 Runtime Adapter 的验证对象。现有 Pi dogfooding 继续，不重写 Pi loop，不以新运行时替代或关闭旧验收义务。首先验证同一 CourtWork GUI、工作来源和提交边界能够承载另一套执行机制，再逐步增加环境、内部 subagent 与跨 Runtime 协作。

优先级变更来自用户本轮追加链接与建议，不是原 roadmap 已有决定。用户先要求“近期 dogfooding + 长期研究”双轨，再提出 Agents API 优先；本包保留二者，不把后者扩张为立即重写全栈。

## 阅读顺序

1. [AGENTS-API-FIRST.md](AGENTS-API-FIRST.md)：API 一手事实、适配责任、最小 GUI 闭环、故障和退出条件。
2. [SHORT-LOOPS.md](SHORT-LOOPS.md)：近期本地 dogfooding 与真实测试怎样一起推进；区分开发者 Agent 与产品内 Agent。
3. [LONG-HORIZON.md](LONG-HORIZON.md)：原生 Chat、Runtime、multi-agent、工作区、资源与持续跟进的首个可验证消费者。
4. [CODEX-HANDOFF.md](CODEX-HANDOFF.md)：本地拆单与 GUI 前后端合流合同；不是全量预排工单。
5. [SOURCES.md](SOURCES.md)：一手资料、固定源码、采用/不采用与未检项；机器索引见 sources.json。

## 固定基线

- Courtwork：`7e1a1ff047721e1ca6c871deba7f367ccea55a06`，本轮经 GitHub 重新读取 main。
- 重点读取：engineering/roadmap.md、Runtime replacement、Chat Memory Broker、workspace-governance、Resource Governance PR 计划。
- E2B cookbook：`5e61887a1154007e2e16d5a92fd5c8045d2fe51b`，经 GitHub 读取原仓 README 和 OpenAPI 开头；未运行样例。
- Agents API：2026-09-10 public beta 发布；官方指南于 2026-09-14 通过 Exa 读取。指南是当日可变文档，不等同 SDK/服务端不可变快照。

## 不改变的归属

current 持有当前状态，roadmap 持有覆盖与依赖，专题合同持有自己的事实；本包只提供消费增量。研究被采用、接口被接通、真实工作被接受、发布被授权，是不同结果。原 G1–G5 与 DF-04 等仍按实际任务和原 owner 处理。

无需新增第二份总 roadmap、统一超级 schema、通用调度平台或五个独立服务。本文的切片标题只是本包导航，正式编号由本地映射到原工单。
