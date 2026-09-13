# Context Inspector · canonical semantics

2026-09-14 · 用户输入与最后一单 Cache 补充，Astra 裁决。承接 [runtime telemetry](../home-composition-2026-09-10/runtime-telemetry.md)、[frontend contract](../agent-interface-2026-09-10/frontend-contract.md) 与 [本片实现](README.md)。这是前后端投射合同，不建立新的状态库，不把设计字段当作已实现能力。

## 语义与 owner

Context Window 表达指定 Agent、指定推理快照中模型实际可见的 working set，以及该次推理预留的容量。Stored / indexed / retrievable 不等于 resident。Core、Matter、Event Log、运行时 Session 和模型输入仍有各自 owner。

Runtime adapter / prompt assembly 持有快照身份、实际注入项、模型声明与保留策略；Provider adapter 提供其明确报告的计数。Host 记录带版本和身份的事实，UI 只投射。模型名称、URL、文件在磁盘上存在、工具被安装或子代理被创建，都不能自行生成占用事实。

“现在”需要 assembly revision 与下一次推理的明确绑定；历史 request measurement 只能叫 Last request。模型响应新增内容、编辑、工具结果和 compaction 后，上一请求不能冒充新的 working set。本片仍显示 **Latest completed request input**，不改称 Active now。

## Capacity

| 字段 | 意义 | 计量要求 |
|---|---|---|
| active | 该快照实际 resident 的输入表示 | 同一 Agent / request 或 assembly revision；不能是累计会话 token |
| reserved | 本次推理保留容量 | 由真实 runtime policy 给出；reason 可为 response_headroom / compaction / runtime_safety；重叠额度不能重复相加 |
| free | 可分配余量 | 仅在有效窗口与完整互斥 active/reserved 都已知时计算 |
| effective_window | 当前配置的有效上限 | 记录来源；model-declared 优先于 default-registration，策略限制还需明确 owner |

完整且同口径时 `active + reserved + free = effective_window`；超限保留原数并报告冲突，不把负值/超过100%的事实悄悄改写成合法等式。缺一个量就未知，不以零补齐。Deferred 不参与等式。默认登记 **1,000,000 tokens** 只作明确标记的显示参考；不改模型能力、输出上限或 compaction 行为。

## Source × Residency

七个来源族：instructions、conversation、tools、workspace、memory、extensions、derived。工具结果放 conversation 的 tool-interaction 子项；MCP / builtin / Skill / AGENTS 文件名等留在 subtype / origin。每个注入表示只能在加和中出现一次；引用关系、标签和来源归属可以多值，计量 ownership 不可重叠。

Residency 为 resident / deferred / isolated / archived，作用域必须明确到 agent/context。**compacted 不作为互斥 residency**：它是表示转换关系。原表示可 archived，替代摘要或 opaque compaction item 可 resident，并通过 derived_from 连回原表示。主 Agent 只计入真正返回并注入的子代理结果，不计入 isolated Agent 的全部中间材料。被调用能力的描述、deferred catalog 的小型路由提示若确实已注入，其提示本身可 resident；尚未加载的正文/schema 不计入。

最小 item 投射：稳定 id、source.family/subtype/origin、injection.mode/reason、residency.state/scope、tokens.count/measurement、lifecycle.loaded_at/retention、derived_from。仅在 owner 有相应事实时提供。retention 可为 persistent / reinjected / compactable / ephemeral；不从扩展类型猜测下一次压缩结果。

measurement 可为 provider-reported / tokenizer-measured / estimated，附 request/assembly identity、方法与覆盖。Provider 总量不能按字符比例拆成“精确”来源 token；各来源没有同口径不重叠数据时不绘制100%分类堆叠图。

## Runtime diagnostics · Cache

Cache 描述计算复用，不改变 context residency；compaction 改变输入表示，两者互不代称。Provider/account quota、累计 token、费用不属于 Context source。Cache 与 Provider usage 只能是可选诊断，不占 Context 容量色条。

Canonical cache 字段：status available/unavailable、source provider/runtime/estimated、scope request/turn/session，以及可选 hit_tokens、miss_tokens、write_tokens、total_tokens、hit_rate。具体 provider 字段名只存在于 adapter。推算比例额外记录 rate_source 与 denominator。直接 provider rate 也必须说明其计量域；没有一致总量不伪造 Hit/Miss 数字。

本片 scope 固定 request，随外层 runId/requestId 记录，显示 Latest completed request。后续 aggregate 必须另有显式范围与去重方法。规则：

- 没有原始 cache telemetry：unavailable，隐藏整个区块。SDK 默认零值不算 provider 明确报告零。
- 明确 hit=0 且 total>0 才可显示0%；total=0 无可用比例，只保留零计数。
- 只有 hit：只显示命中 token，不画比例条。只有 write 同样只显示写入数。
- 可比 Hit / Miss 互斥时 `total = hit + miss`，`hit_rate = hit / total`。只有 hit+可靠total 时可由 adapter 计算 miss；数据矛盾时保留各原始计数但不画比例。
- total 是该 provider 的 request-input 计量域，不是窗口容量或 Session usage。write 保持独立诊断，不加到 Hit 段；它与未命中输入的重叠不能被误用为第三个互斥分段。
- Hit 使用现有强调角色，Miss 使用 subdued 中性表面；miss 不使用警告色。数值/来源/范围保留文字，色条不是唯一信息。

## 渐进披露与本片边界

优先 Context 概览、再 source family、再实际 item / provenance；不把几十个工具铺在默认面。来源/预留/余量无 owner 时不绘制数字或假分类。Runtime diagnostics 独立一节；无 cache 则整节不出现。独立 Usage 页面仍管理消耗与额度。

当前代码交付 request input 占用环、默认窗口来源和 request cache diagnostics。未来 next-working-set、Reserved/Free、item provenance 的完整字段仅冻结语义；没有新增可用 API 或伪造实现。截图仅为布局参考，不继承其分类、品牌颜色或计划额度面，也不追加探索队列。

## 输入与最小来源核验

[用户原文](input/context-inspector-reference.txt)按原字节保留；原截图作为用户提供的布局参考，数字未作为 Courtwork 实测。2026-09-14 最小核验：

- [Claude Context Window](https://code.claude.com/docs/en/context-window)：支持子代理独立窗口、返回摘要与压缩后按机制重新注入；其演示计数是代表性数字，不是本产品证据。
- [Cursor Prompting](https://cursor.com/docs/agent/prompting)：context ring 展开分类，包含 Summarized conversation；仅作为来源分组与披露参考。
- [VS Code 固定版本](https://github.com/microsoft/vscode-docs/blob/2e31a7ce913193c7e9d39fbe0ddde4d88cf7434f/docs/agents/concepts/context.md)：区分 assembled prompt、workspace index、implicit 与 explicit context。
- [OpenAI Compaction](https://developers.openai.com/api/docs/guides/compaction)：压缩表示可为不透明 encrypted item，不要求是可读消息摘要。

用户材料中的其余性能百分比、产品额度与未在此列出的外链只作为输入保留，未扩大核验或变成 Courtwork 的能力承诺。
