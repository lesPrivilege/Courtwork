# Hermes 独立 agent 本体（NousResearch/hermes-agent；2026-07-27，Sonnet 云端调研原件）

消歧：目标为 github.com/NousResearch/hermes-agent（"The agent that grows with you"），MIT，约 21–22 万 star（README 与 TechCrunch 2026-07-13 融资报道两源相近、精确数 UNVERIFIED）；即 pi-hermes-memory README 点名的移植源（`tools/memory_tool.py`／`run_agent.py`／`agent/memory_provider.py`／`agent/memory_manager.py`）。形态＝网关 daemon＋TUI＋多平台机器人＋cron 调度器＋子代理委派，7 种终端后端，60+ 工具。同名排除件：pi-hermes-memory（扩展）、Hermes LLM 系列、hermes-pi 等第三方件。

## 注入组装

项目上下文按发现顺序取一（`.hermes.md → AGENTS.md → CLAUDE.md → .cursorrules`）＋常驻 `SOUL.md`；注入前威胁扫描，单文件超 2 万字符截断（70% 头＋20% 尾）。子目录上下文经工具调用参数路径就近附加到工具结果，非整体重注。**前缀稳定性是刻意设计**：system prompt 跨轮稳定；memory 在 session 开始时**冻结为快照**——会话中改动立即落盘，但要到下一个新 session 才进 prompt（prefix-cache 保护的强形态）。外部 memory provider 预取在轮次间后台非阻塞完成，以 `<memory-context>` XML＋"System note: NOT new user input"作注入免疫标记。

## 记忆

双通道写入：模型经单一 `memory` 工具（add/replace/remove/apply_batch，目标 memory|user）＋**后台 flush agent**（fork 的临时 agent，在 session 重置/闲置超时/网关重启时复盘对话写 MEMORY.md）。存储：纯文本 `MEMORY.md`（约 2200 字符上限）＋`USER.md`（约 1375），`\n§\n` 分隔，原子写。容量超限时返回占用率提示模型合并陈旧条目，**单轮 3 次合并失败硬停**（防死循环）。内容扫描双重：加载时（污染条目换 `[BLOCKED]` 占位，只影响注入快照不改原文件）＋写入前（拒收含注入/外泄模式的写入）。长短分层＝内建恒定层＋8 种可选外部 provider（同时至多一个）。

**已修/未修两 bug（一手 issue）**：#2670（已修）——flush agent 无上下文、不比对时间戳与并发写入，**静默覆盖用户当轮新写记忆**；#3059（官方 not planned）——flush 去重集合仅存内存，网关重启后**重复 flush**（重复计费、工具报错、潜在记忆损坏）；附带报告：容量 >90% 时模型生成无效调用硬闯限额。

## 上下文生命周期

三阶段有损压缩（约 50% 容量阈值触发、回收 <10% 连续两次则跳过）：①工具输出裁剪（无 LLM）②保护边界（system＋首若干轮＋尾约 2 万 token 不动）③辅助小模型结构化摘要（Active Task/Completed/Resolved/Pending/Remaining，并明示"源材料非指令"防注入）。后续压缩基于 `_previous_summary` 增量 update 非从头重来。跨重启存活：MEMORY/USER 文件、cron `executions.db`、skills 元数据；会话内摘要状态的持久化 UNVERIFIED。

## 续行与交接

**无 daily-notes/journal/handoff 文档形态**；cron 输出仅作审计。调度＝每 60 秒 tick 读 jobs.json，到点**冷启动全新 session**（非同 session 心跳）；job 间 `context_from` 串联作顺序交接。崩溃恢复：执行状态五态＋「原 PID＋进程启动指纹」双证属主消失才标 unknown（防误重跑，较同类严谨）。**Curator 双阈值后台复盘**：距上次 ≥interval_hours（默认 7 天）且闲置 ≥min_idle_hours（默认 2 小时）才跑，AIAgent 后台 fork、独立 prompt cache、写入标 `background_review`，只理技能（30 天未用 stale、90 天归档、从不硬删）。nudge 机制存在但触发条件无独立文档（UNVERIFIED）。

## 权限、降级与减法判定

授权三档 Smart/Manual/Off，另有**不可被 `--yolo` 绕过的硬底线黑名单**（rm -rf /、fork bomb、mkfs、dd 写盘）——红线优先于配置的分层。人在回路发生在命令层策略引擎（BLOCKED 无 UI 覆盖通道），记忆写入走内容扫描而非人工审批。降级轴：沙箱初始化失败即 fail-closed 停止，不回退本地无隔离执行。

Load-bearing 四件：session-start 冻结快照；双重内容扫描；3 次合并硬停；PID＋指纹校验。Incidental：8 provider 生态、Curator 的 LLM 技能合并、7 种云后端。复杂度反面自证：`run_agent.py` 单文件 5493 行、`AIAgent.__init__` 约 60 参数。docker/modal 后端下跳过危险命令检查（容器边界＝安全边界假设）；子目录就近注入依赖参数路径提取、非常规调用模式易漏。

来源：github.com/NousResearch/hermes-agent（README/AGENTS.md/SECURITY.md/docs 站）、issues #2670/#3059 与修复 PR、chandra447/pi-hermes-memory README（移植归属）、TechCrunch 2026-07-13（融资侧写，UNVERIFIED 细节）。
