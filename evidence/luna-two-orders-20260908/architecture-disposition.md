# Astra 架构边界裁定

核对源码基线 `429fdd68febb9998f322a0b53c323651fc8cd7fd`、engineering/current.md、architecture.md、core-contracts.md、Core 固定交付与本次工单。本文限定两单的解释和写权，不新造产品状态账本。

## 现状与设计资料的时间边界

architecture.md 的“当前实现到下一轮”表明确绑定旧 `d86eba4`，其中 Core 位于样本目录、不能跨 Session、producer 缺席不能读历史等是旧节点缺口。current 和已合流 Core 证据已记录它们的后续实现。因此本轮必须以当前源码/契约验证，不能照该历史表再次要求重写 Core。core-contracts.md 自身标为设计候选，也不能把其中所有条款当成已通过的产品事实。

## 两笔单消费的所有权

| 问题 | 既有 owner | 本轮产出边界 |
|---|---|---|
| cleanup 局部表达 | 原模块作者责任，Astra 集成 | 仅确认的行为保持小改；时序/错误/权限变化另列缺陷 |
| Candidate/Decision/Artifact/CAS | M05/M06，app/core 与可信 host 接缝 | 非作者反例；不把验证器输出升级为正式决定 |
| Run/session/model/tools | M01–M04，Pi 与 host adapter | 区分上游能力、host 暴露、运行反例，缺失列后续单 |
| GUI 多入口/导入导出 | M11 消费原 schema / state | 本轮只列入口和缺口；不写 WK12/WK11 前端 |
| ACP / runtime 替换 | M04/M14 | 调查协议差异；不以 RPC 已有推导 ACP 兼容 |
| task/plan/goal 与 Matter | 执行状态及 M05 的各自契约 | 不把 checklist 完成、run completed、正式工作接受混为一项 |

同一能力的 GUI、API、配置文件入口应指向同一受治理状态；新增入口仍须承担已有 scope、CAS、版本与错误语义。缺少第二入口先如实登记，不为“冗余”复制可写真源。未知能力或 adapter 差异需明确拒绝、禁用或降级原因，不能以 supportsEverything 掩盖。

本次能力排序是派单输入，不覆盖用户已授权的主链施工顺序。通用 shell、开放插件或跨 runtime 替换若触及执行隔离与正式存储边界，必须由独立实现切片和反例证明，不能以生态 baseline 名义直接放开。
