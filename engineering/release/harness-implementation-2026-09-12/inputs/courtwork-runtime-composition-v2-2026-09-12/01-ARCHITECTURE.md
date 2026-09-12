# 01 · 架构边界：自有产品，替换执行

## 1. 总裁定

CourtWork 拥有持续工作的组织、正式状态与用户判断表面。执行系统提供某次任务所需的模型调用、工具循环、原生会话和可选能力。二者通过可测试的接口组合，而不是通过共享内部对象捆绑。

**可整包替换：Harness Core + runtime 私有 extensions + native session/context policy + 该 Runtime 所用模型驱动与环境配置。**

**不随 Runtime 替换：CW 的身份、授权与命令回执、正式工作状态/来源/决定、产品职责合同、共享内容引用和可恢复的历史解释。**

这里的边界是目标责任，不表示每项已经完成独立模块。现 DEC-013 明确 service 仍泄漏 Pi SessionManager；当前实现仍是 Pi AgentSession 与 Host/Work Core 的组合。[S02](SOURCES.md#s02)

## 2. 三组词必须明确区分

| 名称 | 定义 | 不应解释为 |
|---|---|---|
| Harness Core | 单个执行器的基础 turn/tool/event/取消职责 | CW 正式成果与接受规则 |
| Work Core | 正式工作对象、版本、依据和决定的领域 owner | 所有聊天都要先启动的完整执行环境 |
| Runtime Provider | 提供一套可执行 runtime 的实现，例如 CW-Pi、Codex、候选 Hermes/OpenClaw | LLM API 的 endpoint |
| Model Provider | 提供模型推理接口与能力的厂商/连接 | 一定包含工具循环和工作状态 |
| Role / Expert Contract | Spark/Attention/专业 Expert 的职责、输入输出、权限需求与检查要求 | 绑定某个 runtime 目录的永久 persona |
| Role Runtime Composition | 将职责合同、profile、能力、模型路由、预算与执行器组合成可运行单元 | 必须单独一个进程、数据库或永不结束的 agent |

## 3. 目标依赖结构

```text
CW GUI / Work Surface
        |
CW Host：身份、Run admission、权限、回执、控制 API
        |
        +-- 人的工作决定 --------------------------> Work API / Work Core
        |
        +-- Role composition / Work prepare <------- 获准工作投影与来源
        |          |
        |          +-- 普通 Harness 任务可不依赖 Work Core
        |
Runtime Port（共同生命周期 + 可选能力，不压平全部差异）
        |
        +-- CW-owned runtime bundle
        |     Harness Core（优先 Pi）
        |     + 选定 runtime extensions
        |     + provider-specific profile
        |     + ModelAdapter -> DeepSeek / 其他模型连接
        |
        +-- Native runtime bundle
              RuntimeAdapter -> Codex / 候选 Hermes、OpenClaw
              原生 loop、session、model driver、tools 由其内部管理

Run 观察/候选/外部效果回执 --> 相应 owner
正式接受/关闭 ------------> 原工作 owner 的命令与事务
```

这不是新增服务部署图。先保持模块化单体，进程/容器由执行环境需求决定；不因为画了一个框就创建一层转发服务。

## 4. extensions 拆为三类

**Runtime extension。** 对该执行器增加 tool dispatch、MCP 接入、compaction hook、原生 skill loading 等。它可以和 Harness Core 一起更换，私有实现无需字节级跨 Runtime 通用。

**CW shared capability。** 例如获准来源读取、版本化产物提交、权限问询、能力目录查询。它们通过受限 port 服务不同 runtime；具体 Pi/Codex 工具胶水可替换，共享 owner 不搬家。并非所有上游 runtime 都能暴露相同工具；不能映射则拒绝该角色/profile。

**Work / Expert extension。** 专业 Schema、输入输出合同、verifier、review 声明及领域适配。专业语义不能被降格成某个 Pi extension 脚本。可执行 renderer 或适配代码的可移植性另验，不承诺任意脚本搬到其他 runtime 自动运行。

仓库当前 `app/extensions/` 的领域适配不应因目录名而被归入“可连同 Pi 丢弃的扩展”。这是术语和依赖归属的清账，不是先把全仓移动目录。[S02](SOURCES.md#s02)

## 5. 对外稳定与对内自由

稳定边界要求：任务身份、来源与版本、能力要求/拒绝、权限、事件/终态、结果引用、恢复解释。内部允许：不同工具组织、不同轮次策略、不同 compaction、不同执行语言与不同原生 storage。

不要设计只剩 `prompt -> text` 的最低公分母；那会丢失需要检查的工具、权限与执行状态。也不要把所有上游功能硬塞进统一接口。共同生命周期必须实现；其余能力通过可选 facet 和支持证据公开。

任何 Role 的 required capabilities 都须满足 runtime、model、环境和当前授权的交集；能力名字相同不证明语义相同。native sandbox 或本地进程身份也不自动证明满足 CW 的权限范围。

## 6. 当前 Pi 的消费姿态

保留已锁定 `@earendil-works/pi-agent-core`、`pi-ai`、`pi-coding-agent` 的 0.85.1 作为节点一基线，不因概念收敛就立即从 AgentSession 降到低级 API。[S03](SOURCES.md#s03)

目标 CW Spark / Attention runtime 优先复用 Pi 提供的 core；是否保留 AgentSession 的会话、compaction、重试设施，按实际需要选取。采用 core 不意味着自己重写已有机制，也不意味凭空继承高层包全部生命周期保证。详见 [04](04-ROLE-COMPOSITIONS.md)。
