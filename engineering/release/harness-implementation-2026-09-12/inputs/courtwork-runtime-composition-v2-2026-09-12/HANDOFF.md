# 本地接单指令 · Runtime composition v2

先读当前仓库 AGENTS.md/current.md 和实际 branch/HEAD/工作区，再消费本包 CHANGELOG。远端审阅基线为 `1ac28980c4877f4a86adf586aeb1b66980e23504`；不得假设本地没有其他 writer 或未提交改动。

采用以下架构：可整体替换的是 Harness Core + runtime 私有扩展与原生执行状态；Work Core、共享内容/权限/回执 owner 和产品职责合同留在 CW。Spark 与 Attention 是确定自研的产品运行组合，优先消费 Pi core，Runtime 可替换。Expert 定义与其可运行封装分开。Provider 的协议/模型使用 profile 可以独立维护，原生 Runtime 已拥有模型驱动时不再二次编码。

把文档清楚分为架构边界、Runtime 接口、模型适配、产品组合、维护基线与三节点执行。canon 只做总入口，roadmap 持唯一顺序，current 只登记真实发生事实；旧 received/v1 字节保存，不重写，不沿用旧刚性首列。

第一张产品单是“固定支持集合，用当前 Pi 接入真实 DeepSeek，证明 GUI 控件—运行—工具—文件—权限—取消—历史的真实合流”。先做当前 SDK 合成协议测试和必要故障修复，再按用户 GUI 配置/预算跑真实模型。不以完整 Core-free、Compiler、memory/web/skill 全栈为它的前置；MCP 开放则必须修正原正确性问题，未支持必须真实关闭。

第二节点完成两条必要解耦并验证真实第二 Runtime，优先评估公开 Codex App Server。先用无 Work 前置的合成任务合同；不要先要求完整 NDA Expert 才验证替换。所有原生能力、权限/取消/历史及 experimental 边界由实际 binary/protocol 测试证明。

第三节点自研 Spark/Attention 运行组合，连同 Expert 和现 Work Core，完成“版本更新核查”小场景；再做同 Expert/同 Core 跨 Runtime 接手。性能实验决定选型厚度，不决定 Spark 产品是否成立。

每片保持单 writer、可解释的差异、独立 fixture 和回退。此包没有产品测试/模型调用/代码交付，不为本地会话自动补验收章；没有请求推送、创建远端 PR 或部署。
