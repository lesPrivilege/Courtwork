# OpenClaw 记忆与续行机制（2026-07-27，Sonnet 云端调研原件）

规范源：github.com/openclaw/openclaw（前名 Clawdbot→Moltbot），docs.openclaw.ai，作者 steipete。

## 注入组装

- bootstrap 注入集（存在则注入）：`AGENTS.md, SOUL.md, TOOLS.md, IDENTITY.md, USER.md, HEARTBEAT.md, BOOTSTRAP.md(仅新 workspace), MEMORY.md`；子代理只注入 `AGENTS.md+TOOLS.md`。组装＝base prompt＋skills＋bootstrap＋per-run overrides，插件钩子 `before_prompt_build` 可注。
- **缓存边界二分（关键形态）**：prompt 分「缓存边界之上（稳定：工具定义/skills 元数据/workspace 文件，跨轮字节级不变）」与「之下（易变：消息/语音/群聊/heartbeat/运行时细节）」；时间戳只以时区形式留稳定层，具体时间经独立 `session_status` 工具调用取——刻意不打破缓存前缀。
- `contextInjection` 三档：`always`（默认逐轮重注）/`continuation-skip`/`never`；单文件截断 20000 字符、总预算 60000。

## 记忆写入

- 写入者是模型（经工具），非系统黑箱。触发三类：显式请求；**压缩前 memory flush**（软阈值默认 4000 token，插入一次静默轮提醒落盘，`NO_REPLY` 抑制可见输出）；"dreaming" 周期巡查（cron，按 score/召回频率/查询多样性提炼长期记忆）。
- 两层结构：`MEMORY.md`＝长期精炼层（每会话启动加载）；`memory/YYYY-MM-DD.md`＝每日原始层（自动加载今日＋昨日，其余靠 `memory_search`/`memory_get` 检索，不进 bootstrap）；可选 `DREAMS.md` 供人工复核。
- 去重靠模型定期「从 daily notes 提炼进 MEMORY.md 并清过期条目」；超预算时磁盘不动、注入副本截断并给减负信号。底层 per-agent SQLite，1.5s 防抖重索引，约 400 token 分块/80 重叠，FTS5＋向量混合检索。

## 上下文生命周期

Pruning（内存态丢旧工具结果，磁盘 transcript 不动）／Compaction（溢出错误补救或阈值触发，旧对话总结为持久 compaction 条目，近期消息保留，tool 调用-结果保持配对）／Restart（`/new`，新 sessionId，旧上下文彻底放弃）。会话重置：每日定时（默认本地 4 点）＋空闲重置（heartbeat/cron 系统事件不续命）。重启后存活的只有 workspace 文件（重新注入），旧 transcript 磁盘可查但不自动回注。

## 心跳与交接

Gateway 内置 cron，默认 30 分钟一跳（在主 session 跑周期 turn）；心跳 prompt＝「查后台任务、偶尔 check-in；勿推断旧任务；无事回 HEARTBEAT_OK」。文档双轨不同步：HEARTBEAT.md 模板页仍在，gateway 页称已 legacy、迁 monitor-scratch 数据库（UNVERIFIED 何者当期为准）。无独立 handoff 机制——续行本质＝MEMORY.md＋daily notes 重注。后台任务记录保留每 job 2000 条终态。

## 失败模式与减法判定

Load-bearing：缓存边界二分（经济学关键）；压缩前 flush（否则压缩硬丢未落盘上下文）。Incidental：HEARTBEAT 双轨。已知事故：flush 轮误标 `role:user` 泄漏进 transcript→压缩死循环（issue #54408，有修复 PR）；伪造 `[System Message]` 渠道注入（#30111 官方 not planned 关闭）；默认 DM 共享 main session 致跨用户泄漏；公网暴露与认证绕过大规模事故（第三方安全报告：42665 实例、93.4% 认证绕过——UNVERIFIED 细节，本地单机产品不适用其攻击面）。

来源：docs.openclaw.ai 的 concepts/system-prompt、concepts/agent-loop、reference/prompt-caching、gateway/config-agents、concepts/memory 与 memory-builtin、reference/session-management-compaction、concepts/session、gateway/heartbeat、automation/cron-jobs；github.com/openclaw/openclaw docs/concepts/memory.md 与 issues #54408/#30111/#30448；第三方：Astrix Security、Giskard（均 UNVERIFIED）。
