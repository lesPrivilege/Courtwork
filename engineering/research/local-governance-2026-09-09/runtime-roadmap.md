# Explore runtime：沿现有 owner 补能力

输入 [T04](source-index.md)；状态为后续设计，未新增 runtime。Session、Run、事件、artifact 已存在，施工先查 [运行合同](../../../app/docs/runtime-foundation.md) 与 [架构](../../architecture.md)。Pi 继续是现有运行循环依赖；引用 DSH/OpenCode/托管 research 的概念不授权替换框架。

## EX-01 · 单个只读 Explore 的结果与控制语义

先让一次任务在限定来源集合、工具集合、token/时间/费用预算内产生 finding bundle。记录父 Run/任务、执行身份和 source generation；profile 只是执行配置，不成为新的正式状态主体。将 start/status/result、steer/follow-up/cancel 的需求映射到现有接口，确认缺口再新增；不把草拟动作名直接冻结成一组新路由。

steer 是影响正在执行任务的有序输入，follow-up 是后续待处理输入；两者在何时生效、是否被消费、重复投递与恢复行为须有回执。尚未具备 steer 的 adapter 明确 unsupported，不能伪装立即生效。cancel 请求、底层停止、工具结果收尾和 unknown 分别可见，取消后不能误报成功或晋升结果。复用现有 partial/abort/恢复规则，后台任务不能绕过权限等待。

bundle 至少含 findings、spans、coverage、unresolved frontier、cost/usage、source/config versions、失败/partial 与下一步建议。父任务按引用读取有界结果，不自动注入完整 child transcript；需审计时可分页追读。材料中的提示注入作为来源文本，不是调度或权限指令。

验收反例：超时、断线、重复投递、进程重启、父取消时子工具仍在收尾、授权拒绝、来源在运行中变更。每种情况核对实际 Run 与事件/结果投影一致；没有确认外部结果时保持 unknown。单任务收益不成立则停止团队层扩展。

## EX-02 · 仅在有实测瓶颈时分片

LG-02 的 index-first 先回答已覆盖部分，针对未解决 frontier 派有界单 explorer。只有独立查询的串行延迟或覆盖瓶颈已测量，才比较有限并行分片；不预置递归 swarm、第二套 mailbox/team 或默认并发数字。并发、深度、工具与费用上限来自当前宿主能力和任务合同，不从某个产品文档里的示例值继承。

分片必须有互斥/显式重叠 scope、独立输出和收敛责任人。重复与矛盾 findings 都保留来源；reconciliation 不通过多数票制造权威。子任务可以实现或验证，独立接受仍归相应 Reviewer/owner。用 [A4/A5/A6 对照](benchmark-plan.md)检验总体成本、尾延迟、缺失证据、冲突与父 context 污染；没有收益就保留单 explorer。

## EX-FE · 在接缝成立后进入前端队列

主要表面是现有 Run/activity：显示目标、范围、已读覆盖、预算、等待原因、partial/unknown 与结果引用。worker inspector 按需展开，子任务 transcript 分页查看；不会把代理拓扑提升成用户首页的信息架构。

用户需要接受 findings 时复用 Work Review 与既有决定动作。来源卡必须可回到确切版本/span，并显示 stale/missing/partial；检索覆盖不足不能绘成全量完成。取消按钮反映后端确认，不能点击即宣告已停止。进度条没有可定义分母时用实际阶段/已处理计数。

验证使用固定 backend fixture 覆盖 running/waiting/cancel requested/unknown/partial/completed、陈旧来源、空结果与拒绝；随后验证真实端到端。FE 单写者仍按 current 排期；动画和品牌只呈现事实，不授予治理权。

## 外部方法的使用边界

[DSH Core](https://deepseek-harness.github.io/deepseek-harness/en/reference/subsystems/core)提供由 typed event log 派生模型消息的参考（X05，页面抽查）；它描述其自身 runtime 权威，不是 Courtwork 领域 Core 的迁移命令。X06…17 的 subagent seam、Pi、OpenCode、Codex 与托管 research 入口已完整索引，但本轮未逐个验证版本/API/许可；实施对应接缝前必须固定来源，不以对话称“研究72项”作为本轮核验数量。
