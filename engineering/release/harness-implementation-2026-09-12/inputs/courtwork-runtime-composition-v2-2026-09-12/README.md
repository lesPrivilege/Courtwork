# CourtWork · Runtime 组合架构修订 v2

2026-09-12 · 基线 `1ac28980c4877f4a86adf586aeb1b66980e23504`

**采用本轮用户修订：Pi 只作为当前可组合的执行底座；Harness Core 与 runtime 私有扩展组成可整体替换的 Runtime。Spark、Attention、Expert 的产品运行封装由 CourtWork 定义，具体执行后端可更换。模型适配靠近上游，维护选择经验证的自足基线，不追求全量实时热插拔。**

实施顺序改为：**先跑通 DeepSeek + 当前 Pi 的 GUI Agent → 提取必要接缝并证明真实 Runtime 替换 → 落实 Spark / Attention / Expert 的小场景工作闭环。**

本包是对上一版的局部覆盖与拆分稿，不是另一套仓库总 roadmap。新指令优先；上一版未被本包明确覆盖的安全、权限、来源和故障契约仍保留。`inputs/previous-release-plan.zip` 是上一版原字节，只读存档，不能把其旧顺序再次当作当前排单。

## 阅读入口

| 文档 | 只负责回答 |
|---|---|
| [01 架构边界](01-ARCHITECTURE.md) | 哪些属于 CW，哪些可以随 Runtime 整体更换？ |
| [02 Runtime 与扩展](02-RUNTIME-CONTRACT.md) | 两种执行接法、能力声明、状态归属及安全替换条件是什么？ |
| [03 模型与上游适配](03-MODEL-ADAPTATION.md) | Provider 的协议与模型使用方式如何被保真消费？ |
| [04 产品运行封装](04-ROLE-COMPOSITIONS.md) | Spark、Attention、Expert 如何自研而不绑定内核？ |
| [05 稳定基线与维护](05-MAINTENANCE.md) | 哪些更新必须跟，哪些可以收敛；Agent 怎样有界维护？ |
| [06 三节点实施与验收](06-IMPLEMENTATION.md) | 下一步具体做什么，旧 P/DRT 卡怎样重新归位？ |

[CHANGELOG](CHANGELOG.md)明确覆盖上一版哪些条款；[HANDOFF](HANDOFF.md)可交本地集成者；[SOURCES](SOURCES.md)分清代码依据、公开文档和设计选择。`plan.json` 仅为本包映射，不持有实际任务状态。

## 证据与动作范围

本轮通过 GitHub connector 复查远端 main，仍为上述 SHA；重读 DEC-013 与 package.json，并读取当前对话中上一版正文/工单及原 ZIP。外部参考含官方 Pi SDK、DeepSeek API、Codex App Server、固定 DSH 架构和候选生态入口。没有验证未提交本地变更，没有运行产品、真实 Provider、Runtime 替换或 GUI 测试，没有创建远端 PR、提交、部署或新依赖。

本包完成只表示**文档修订交付**。实施项全为 proposed-not-created，实验为 not-run。不要继承上一轮容器环境结论为本轮环境事实；此轮未尝试运行应用。
