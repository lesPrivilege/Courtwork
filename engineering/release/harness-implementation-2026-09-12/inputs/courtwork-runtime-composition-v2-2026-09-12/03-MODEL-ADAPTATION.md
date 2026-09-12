# 03 · 上游模型适配：保真协议，不抹平能力

## 1. 适配不是仅改 baseUrl

本轮采纳 provider-specific 适配路线。目标是使当前模型公开支持的使用机制实际进入执行，而不是所有模型套用同一套被削平的消息/工具语法。

但“激活后训练能力”是需要测量的产品假设，不是已知的训练内部事实。协议符合性可以测试；模型是否因某种工具组织表现更好，需要同模型的有界对照。不得依据品牌名写一套无法证伪的“专属 prompt”。

## 2. 三个不同责任

| 责任 | 持有内容 | 不取得的权力 |
|---|---|---|
| RuntimeAdapter | 整套执行器的生命周期、事件、控制和原生恢复 | 解释/改写 Core 正式接受标准 |
| ModelAdapter | API 格式、流解析、tool call/result 对齐、必要 metadata、usage、错误与能力参数 | 修改业务 Schema、用户身份和授权 |
| Provider execution profile | 有源依据的工具组合、指令放置、effort/default、结果呈现、上下文/重试使用约束 | 静默增大权限、凭空创造上游不支持的功能 |

第二、三项可以由同一版本化实现共同交付，不强制三个目录或三个层层转发的对象。外部完整 Runtime 路径由其内部 ModelAdapter 持有协议；CW 不另行接管 codec。

## 3. 保持模型的语义，却统一可观察后果

共同接口统一的是 task/run 身份、权限决定、工具结果与结算解释；不要求统一 system prompt 全文、reasoning 参数、tool schema 的原生编码或 compaction 算法。

语义模型应支持逐项扩展：公开能力、必需参数、可选优化、未知/拒绝行为分开。输入被模型静默忽略时不能显示为 effective；无法核实则用 unverified/unknown，不用 UI 选择值冒充实际使用值。

Provider 私有 reasoning/协议数据留在原生状态域；不能为便于跨 Runtime 搬运就裁掉必要字段，也不应默认进入用户长期 memory、公开 trace 或 Core。

## 4. DeepSeek 首次接入的验证范围

节点一先将 DeepSeek 作为 **Model Provider** 接入现 CW-Pi Runtime，不把 DeepSeek API、DSH 完整 Runtime 和一个模型别名混为一物。

先固定 GUI 选择的 endpoint、API 格式、实际模型身份、SDK/adapter/profile 版本和预算。官方模型文档及其行为会演进；不依据旧记忆硬编码名称或 effort。当前官方思考模式文档说明参数生效和工具请求中 reasoning metadata 的回传存在具体要求，这正是需用 actual SDK fixture 检验的接缝。[S07](SOURCES.md#s07)

依次验证：普通流式回答；两轮历史；真实工具 call/result；必要 metadata 保真；Ask/Deny/Approve 后实际行为；工具后续模型请求；停止后没有非法后续请求；完成历史重启可读与下一 Run 可继续。in-flight 进程恢复单列，未支持就不宣传。

先用合成响应经过锁定 SDK 观察下一实际请求，再由用户在 GUI 配置的获准真实连接完成主路径。真实请求采用合成材料、明确费用/次数上限；不用个人全局 key、浏览器 cookie 或隐式账户。

只成功发出一次文本不是 GUI Agent 接入成功；模型说“已经写入”也不证明工具路径成功。

## 5. 维护与实验分离

协议基线测试负责当前能力“不被适配丢失”；任务 eval 负责不同 profile 的实际效果。顺序是正确性优先、功能充分，其后才成本与延迟；不是先证明新 wrapper 比 Pi 快，才允许做自己的产品。

Provider-specific revision 可以比通用 Harness Core 更新得更频繁。变化只改 provider 对应接缝；升级需报告请求形状、事件/取消、工具/来源和真实任务的影响。

若版本相同但 endpoint 行为变化，记 server/model observed identity 与本次证据，不让 lockfile 的相同数字掩盖外部变化。对无法固定的服务语义，使用每轮必要兼容 smoke，而非承诺永久冻结。

## 6. Codex 的当前事实与采用范围

OpenAI 于 **2026-02-04** 公开介绍 Codex App Server，当前官方文档提供 app-server 接入方式和 thread/turn/item、流式通知与控制。[S05/S06](SOURCES.md#s05)

因此节点二的条件写成“选择实际版本并验证所需接口”，不是笼统“等未来才公开 Runtime”。文档中同时存在 experimental/under-development 能力及运输方式限制，不能把公开等同于全部生产支持；优先评估本地、固定版本、最小接口范围。

这不证明后续新增的桌面/云端 Work 能力、所有工具注入或跨产品订阅桥已向 CW 开放。具体未公开能力仍按缺口登记，不逆向私有端点。
