# 04 · Spark、Attention、Expert：由 CW 定义的 Runtime 封装

## 1. 自研对象正式确定

**Spark 是 CW 核心自研产品单元，不只是将某个便宜模型写进配置。** 自研内容包括任务分解、来源集合、准备/核查策略、预算与并发、输出合同、验证、暂存/保留、交接与注意力控制。其默认执行底座推荐 Pi core；换内核不应重写 Spark 的职责和评价标准。

Attention 同理：CW 定义巡视范围、何时安静/升级、如何提出动作与消费回执；推理与执行可封装 Pi，也可接入满足权限和能力要求的其他 Runtime。Attention 的义务状态和关闭权继续归现 owner，不变成 agent 自己的 memory。

Expert 在专业定义层仍是可版本化合同与能力包；**可运行的 Expert 实例**则是该合同与 Runtime、profile、工具及执行环境的组合。用户所说不同 runtime 封装在这一层成立，不需要把 Expert 契约改成某个执行引擎的别名。

## 2. 同一结构，不同职责

| 单元 | CW 自研重心 | 推荐初始底座 | 结果与约束 |
|---|---|---|---|
| Spark | read/index/diff/classify/extract/pre-review；有界并发与来源 coverage | CW-Pi；优先 Pi core，按需要保留高层会话设施 | 带 source/version、coverage、conflict/unknown 的准备结果；不自动获正式接受权 |
| Attention | 获准集合巡检、义务/变化核查、安静或升级、动作提议与回执关联 | CW-Pi；可替换 | 面向人的可采取行动，不由 heartbeat/已阅/模型自述自动关闭 |
| Expert | 工作要求、专业验证、证据与 review 维度 | 根据任务选择 CW-Pi 或已验证 Runtime | 专业候选和依据；保留原文反查与人的/授权 owner 的正式决定 |

三者可以共用一个 Runtime 实现，也可使用不同实例/进程；同一 Role 可有多个 profile。起步不造三个 scheduler、三个长期会话库或三套权限配置。

## 3. 从现 AgentSession 到 Pi core 的责任清账

当前 Pi 官方 SDK 分别说明 core LLM 交互与高层 AgentSession 的生命周期/历史/compaction；它们不是一句“只用 core”就能等价互换的层级。[S04](SOURCES.md#s04)

先登记当前由谁持有：消息历史、tool dispatch、retry、取消、事件 drain、预算、compaction、持久化与恢复。每项分别选择继续复用、委托 CW owner、暂不支持；只有角色需要时才补能力。

对一次性 Spark：可以不提供持久多轮对话与 auto-compaction，而保留任务输入/输出和回执。对 Attention 长任务：需要的状态、取消与恢复必须有实际 owner 和测试。不能因低级 core 存在就宣称高层保证也存在；也不能为了齐全，把不需要的功能全重写。

性能比较保留为实现择优与优化实验，不再是 Spark 产品定义/自研路线的准入门。

## 4. 首个工作闭环：来源更新核查

使用两份合成的工作资料版本 A/B；任务 gold 包含变更、未变更、冲突和必须补查之处。人先明确来源范围与处理授权。

Spark 读取精确版本，输出变化、证据定位、覆盖与 unknown；Expert 可按需读取原文，检查和补正，不被限制只能相信摘要；Attention 将需要人判断的变化与现义务关联或提出登记候选；人通过原 Work API 作出接受/退回/补证据等决定。新的 Session 或已验证的另一 Runtime 按当前有效工作状态继续。

闭环重点是“工作更新后，系统怎样帮助人继续”，不是展示四个 Agent 一起说话。先手动触发一次完整闭环，之后再加有 budget、幂等与撤权语义的定时触发；不因首次手动成功就宣传无人值守。

## 5. 文件与消息不要成为无人管的副产物

Spark scratch/intermediate 文件属于运行资料；源文件属于内容/来源 owner；准备结果是候选；正式接受产生的 Artifact 由 Work Core 持有。中间文件退出运行后的保留、引用、清理应按 RD-007/现存 owner 登记，不新建一个 Spark 私有永久知识库。

对象通过稳定 ref 与获准 reader 复用；新的任务读取仍检查授权和版本。摘要可作线索，不能成为其他 agent 唯一可用的 memory。

## 6. 节点三的验收

可复现：输入版本；Spark coverage 与遗漏；Expert 原文纠错；Attention 不误关闭；人类决定及准确版本；来源更新后的失效/重核；重启/新 Session/另一 Runtime 的接续。

还要单独检查角色隔离：换执行器不改变正式接受含义，工具审批不替代专业接受，native 自动 memory 不成为 CW 真源。只在以上证据成立后，把 Spark/Attention 的相应产品宣言转成已可用能力。
