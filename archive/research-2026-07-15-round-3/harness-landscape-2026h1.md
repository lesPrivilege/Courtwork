# 近期 harness/agent 架构实践调研（2025H2–2026-07）

调研原稿，不具约束力。诱因：清华综述《Self-Improving Agents in the Era of Experience》（openreview IUltZSgLMm）框架平平但可作索引——其「harness=经验基础设施、比参数更适合高频低成本调整」的表述本身是我们论点的学术背书。按五面扫描近期实践并三档过滤。

## 核心收获（口径弹药五条，带数字带出处）

1. **稳定前缀律的产业实证**：Manus 自报 KV-cache 命中率是生产 agent 头号成本指标（缓存/非缓存 10 倍价差）——六段 harness 的稳定前缀不是洁癖，是公认的头号成本杠杆。
2. **harness 高频调整的官方表述**：Anthropic 上下文工程博客（2025-09）「何种上下文配置最可能诱导期望行为」——「秩序层比参数层适合高频调整」的一手脚注。
3. **无准入闸的代价**：Snyk ToxicSkills 实测技能市场 36% 含 prompt injection、26.1% 含漏洞——技能生态靠事后扫描，我们 `admitPackages` 是创作期强制门，整类攻击面在准入阶段被结构性拒绝。
4. **模型自评不可靠的实证**：BenchJack 证明 8 个主流 agent benchmark 可零解题刷分；RHB 显示 RL 后训练显著抬高评估器规避率——「判定必须留在结构化非模型的门」的外部证据。
5. **记忆投毒入行业标准**：OWASP Agentic Top 10 新增 ASI06 Memory Poisoning——chat memory 逐条溯源/可撤销/案件隔离不是过度设计，是行业标准组织承认的头部风险的对症。

## 三档过滤结论

**可借形四条**：① Manus 显式 cache breakpoint 手法——待真实 DeepSeek usage 捕获时一并核实其前缀缓存是否需手动断点（并入就绪图既有实测项）；② Codex 摘要 blob 加密防篡改（防摘要成注入面）——续行投影「为何不让模型自由生成」的对照反例，PROJECTION-RESUME SPEC 已有等价理据，无需行动；③ SkillsBench 四层归因协议——SKILL-REFINERY-1 启动时的验收设计输入（拆「过门稳定收益」vs「模型换代收益」）；④ OWASP Agent Memory Guard 四态处置+取证回滚——memory 演进的未来 ADR 讨论素材，当前整体查看+一键清除够用。

**已有更硬三条**：记忆写入（ChatGPT Dreaming V3/Claude Memory 均后台黑箱合成自动改写，无逐条确认无来源坐标；我们逐条溯源+可审计+案件物理隔离，且 Dreaming 的「自动改写既有记忆」直接冲撞不变量 6）；技能准入（事后扫描 vs 创作期 fail-closed）；判定面（benchmark 可刷分 vs 结构化门不可绕）。

**拒绝三条**：Kimi Agent Swarm 300 子 agent 编排哲学（冲撞声明式编排+显式触发）；记忆自动改写（冲撞原件只读/历史不可涂改）；通用 eval SaaS（不解决垂类锚点/事实等级）。

## 综述框架的可用索引

四更新面（技能/记忆/环境/参数）+ 双时间尺度（短期 harness 快调、长期参数固化）+ 归因评测目标组（留出提升/旧能力保持/长期稳定/效率/来源归因/安全不退化）——归因评测目标组可作 eval 底座长期路线图的分类词表；「元进化」层与我们无关（改进机制自改属研究方向，产品不做）。

来源清单见调研会话原文（Anthropic/Manus/Codex/OpenHands/Snyk/OWASP/BenchJack/RHB/SkillsBench 等，一手为主，已逐条标注自报/独立）。
