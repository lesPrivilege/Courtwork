# PR 正文 · 待既有基线到达远端后使用

建议标题：`docs: consume multi-expert research and define long-life implementation slices`

## 问题与结果

《多专家实现调研》的定义、选型、编号计划与后续路线散落在23个turn里，容易将早期建议、外部能力和现有实现混用。本变更保留可访问全量原文及逐消息hash，将全部turn、44个唯一外链、21种agentic模式和HC/RA/AT共22个原计划项逐项处置，形成10个可消费的候选PR切片，并接入唯一current/long-life roadmap。

路线收敛为确定性资料治理、可重建Spark派生与恢复、稀疏Attention；默认沿用Pi薄集成，第二runtime与外部agent接口逐轴验证。所有新需求归并既有LG/AM/MA/BG及Core/Runtime/Attention owner，不增加平行memory、task或approval真源。候选PR列明依赖、责任范围、失败反例、退出与回退；评测计入首次构建、增量维护、执行、恢复和人工审阅成本。

## 验证与范围

- `python3 engineering/research/multi-experts-2026-09-10/verify-intake.py`：23 turn、44消息、45外链出现/44唯一URL、22原计划项映射及来源hash一致。
- `node tools/check-doc-links.mjs`：仓库文档链接检查通过；`git diff --check`通过。
- Luna只读核验外部书目/命名资源并复核文档映射；Astra作最终架构取舍。这不是产品独立接受。

只有文档、原始研究输入及其离线完整性校验脚本；没有产品代码/API/schema/依赖变化，因此未跑产品全量或付费provider。T07/T13缺失回复、T12原文末句中断、不能恢复的citation及未读全文均有明确标记。网页/论文自报结果不记为Courtwork结果；G1–G5不关闭。

## 基线与创建前置

研究/代码基线为本地main `8b1e0b143f7091da0acba3ee24af58595e721eb8`。2026-09-10重新fetch后，`origin/main`仍为 `b3c8686`，落后六个BG-02提交。直接从本分支向该远端main创建PR会额外包含BG-02产品实现，故本次只准备独立文档提交与此正文，**没有创建远端PR、push既有BG-02或合并main**。

既有发布owner将BG-02基线送达远端后，重查main/工作树/本次提交差异并补必要冲突合流；确认PR只含本包与current/roadmap后可使用本文创建draft PR。若选择其他基线，先核对run-attempts/governance等链接与schema事实，不机械把文档搬到缺失契约的旧版本。
