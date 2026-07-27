# pi 生态记忆扩展与 handoff 机制（2026-07-27，Sonnet 云端调研原件）

## pi-hermes-memory（chandra447/pi-hermes-memory，MIT，1★ 采用度极低）

三种 API 并用：系统提示注入（默认 `policy-only`——只注入 `<memory-policy>` 策略块告诉 agent 何时调 `memory_search`，不塞记忆内容；`legacy-inject` 模式才整段塞 MEMORY.md/USER.md/项目记忆/近期失败记录）；工具注册（`memory`/`skill_manage`/`memory_search`/`session_search`）；压缩钩子（`flushOnCompact` 默认开，压缩前落盘）。存储：全局与项目级 MEMORY.md（5000 字符硬上限，`§` 分隔）＋SQLite FTS5 会话检索＋skills 目录。写入触发：纠错检测即写、每 10 轮或 15 次工具调用后台复审、关闭/压缩 flush、连续 8+ 工具调用自动提炼技能。前缀稳定性：policy-only 较稳，legacy-inject 含动态失败记录不稳（UNVERIFIED，未读源码定位注入位置）。**判定：形态成熟（policy-only 是可借的新招），采用度几乎为零，只取形不取件。**

## pi 官方 handoff.ts（earendil-works/pi examples/extensions/handoff.ts）

提取：从当前分支 session entries 倒序找**最近一次 compaction**，取「compaction 摘要＋其后全部条目」——增量提取，不全量重蒸。生成：序列化消息＋用户 goal 喂模型，固定四要素（已做决策与方法／触碰文件清单／基于 goal 的下一步／自洽不依赖旧会话）。启动：生成 prompt 预填新会话编辑器**供用户改后确认才发**（留人），新 session 记 `parentSession` 做父子追踪。**判定：我方手工交接实践的机器版先例；「锚压缩点做增量」与 ADR-021 切点硬约束交叉验证；「预填留人」与不变量 3 同构。**

## pi-observational-memory（elpapi42/pi-observational-memory，374★，MIT，v2.1.3 活跃）

`turn_end`/`agent_end` 生命周期钩子在压缩**之前**做观察与蒸馏（reflection），ledger 式后端，目标「压缩发生时几乎无感」。**判定：与我方「热窗收割」设计最贴近的在产样本，`DOSSIER-FLOW-1` 开工前本地 clone 精读（深读清单 +1）。**

## pi-rewind（arpagon/pi-rewind，90★，MIT，v0.5.0）

每轮一 checkpoint，快照存 **git refs**（借 git 原生引用做持久化跨重启），可选「文件＋对话／仅文件／仅对话」三粒度回滚，checkpoint 浏览器→diff 预览→恢复。另有同名近作（@ayulab/pi-rewind 等，关系 UNVERIFIED）。**判定：巧但不采——我方已有事件史与确认账本，不引第二套回滚；重启判据＝用户提出会话级回滚诉求。**

## license 红线一条

`ArtemisAI/pi-mem`（fork 自 claude-mem）：**AGPL-3.0**，子目录另含 PolyForm Noncommercial——两条各自独立出局，显式不采纳留痕。生态另呈高度碎片化（十余个 pi-memory 近名实现，未逐一核，UNVERIFIED）。

来源：github.com/chandra447/pi-hermes-memory；pi.dev/packages；earendil-works/pi 的 handoff.ts 与 docs/extensions.md；github.com/elpapi42/pi-observational-memory；github.com/arpagon/pi-rewind 与 pi Discussion #1612；github.com/ArtemisAI/pi-mem。
