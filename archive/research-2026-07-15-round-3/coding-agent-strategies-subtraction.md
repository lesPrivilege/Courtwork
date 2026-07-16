# Coding agent 策略的下放与减法（2026-07-15）

来源：verifiable-goal-weekly-share-public.pages.dev（matt-skills-with-to-goal 工作流分享）+ 产品负责人论断。调研原稿，不具约束力。

## 核心论断

Coding agent 的上下文纪律（规划/执行线程分离、可验证 goal 编译、handoff、先缩再跑、按风险路由模型）在那边是**用户手动执行的命令面**；Courtwork 的架构立场是把同类策略**下沉为结构、对用户不可见**——办公场景 context 虽比 coding 富裕，但用户不该考虑 context 管理与续行。减法 = 不暴露任何 /command 式上下文操作。

## 对照表（手动策略 → 结构化对应）

- /to-goal 编译（Goal/现状/完成标准/约束）→ 声明式场景 descriptor + 六段 harness，近乎 1:1，已有；
- Plan here build there → Chat/Work 双轨（ADR-013），已有；
- /handoff → 续行投影（系统编译非模型总结），已有且更强；
- 先缩再跑 → CHAT-MEMORY-1 先蒸馏语义，已落地；
- compaction 分级裁剪 → ADR-013 自动压缩（后续实现）。

## 两个真实下放候选（挂起，不现在做）

1. **场景步骤声明模型档位**：descriptor 加法字段（step 级 model tier 要求——机械步轻档、生成步标准档、高风险步强档），用户永不选择、场景声明。等多 provider/多模型真实到来，与 provider catalog 提案（cc-switch 调研三盲点）同批立 ADR。分享中的 DeepSWE 数据（能力差 6pp、成本差 2.8×）是该席位的经济学依据。
2. **Chat→Work 晋升桥**：Chat 里聊清楚的结论一键成为 Work 场景输入（对应其"添加到任务"）。真实产品缝，属 Work live 之后的体验增强；晋升是用户显式动作（留人确认语义），不自动。

## 工程侧旁证

该分享描述的流程与本仓库多会话工程实践同构（架构师=规划线程、工单=编译 goal、实现会话=fresh session、验收=逐项验证）——AGENTS.md 的会话治理本身就是这套纪律的先行实现。
