# research-2026-07-27-memory-continuation/（记忆与续行机制对照批，只读，不进权威链）

产品负责人提议、架构派发的两路 Sonnet 云端调研（2026-07-27 夜）：长自主 agent 的记忆/工作语义注入/续行编排，作 ADR-021（卷宗工作语义层，Draft）评审输入与 handoff 实践参照。一手来源优先（官方文档、GitHub 源码），UNVERIFIED 逐条标注。对象代码质量与安全水位不作采纳前提——本批只取形，减法消费。

| 文件 | 主题 | 时效三态 | 消费状态 | 消费去向 |
|---|---|---|---|---|
| `openclaw-memory.md` | OpenClaw：注入组装/缓存边界二分/记忆写入/压缩生命周期/心跳/失败模式 | 有效（2026-07-27，随对象演进折旧） | 已消费 | ADR-021 评审素材三条加固＋一条反例实证（见下）；安全反面入反面语料 |
| `pi-memory-extensions.md` | pi-hermes-memory／官方 handoff.ts／pi-rewind／pi-observational-memory | 有效（同上） | 已消费 | 深读清单 +1（pi-observational-memory）；handoff.ts 形态入续行素材；license 红线一条 |
| `hermes-agent.md` | Hermes 本体（NousResearch/hermes-agent，pi-hermes-memory 移植源）：冻结快照/双通道记忆/三阶段压缩/Curator 双阈值/硬底线分层 | 有效（2026-07-27 补路，随对象演进折旧） | 已消费 | 见下 Hermes 消费追加 |

**消费 pass（2026-07-27 夜，架构逐条，零悬置）**：

- **加固三条（ADR-021 评审时并入）**：①OpenClaw 缓存边界二分（稳定 bootstrap 前缀字节级不变＋易变后缀；时间戳只留时区、具体时间经独立工具调用取值不入前缀）——决定六第 1 条前缀确定性门的在产同构，且「动态值经工具取」是可直接借的新招；②两层记忆（MEMORY.md 精炼层＋daily notes 原始层＋索引检索，今日+昨日自动注入）与决定二细化「工作语义笔记本」同构，dedup 责任归模型定期蒸馏而非系统自动去重亦同；③pi 官方 handoff.ts「锚定最近压缩点做增量提取」交叉验证决定二细化的切点硬约束。
- **反例实证一条**：OpenClaw 压缩前**自动静默** memory flush 的泄漏死循环（issue #54408：flush 轮误标 `role:user` 污染 transcript→压缩反复误判）——正是我方 v1「无自动静默蒸馏、水位建议经 ask-user 确认」裁量所防的形态，该裁量由此从设计偏好升为携外部事故证据的裁定。
- **新输入一条（不扩集，作实现选项登记）**：pi-hermes-memory 的 policy-only 注入——注入的是「何时该检索」的策略块而非记忆内容本身，token 省且前缀稳；作 ADR-021 决定四可见面／注入编排的实现选项素材，不新增供给者类。
- **深读清单 +1**：`elpapi42/pi-observational-memory`（374★，MIT，v2.1.3 活跃）——`turn_end`/`agent_end` 钩子压缩前预蒸馏、目标「压缩时几乎无感」，与热窗收割设计最贴近；`DOSSIER-FLOW-1` 开工前本地 clone 精读（与 cc-safety-net/gondolin/pi-review 同格）。
- **显式不采纳两条**：pi-rewind 的 git refs 快照（巧，但我方有事件史与确认账本，不引第二套回滚机制；重启判据＝用户提出会话级回滚诉求）；`ArtemisAI/pi-mem`（AGPL-3.0＋PolyForm NC 子件，license 红线直接出局，留痕）。
- **反面语料一条**：OpenClaw 公网暴露与认证绕过事故群（第三方安全报告，UNVERIFIED 细节）——本地单机产品不适用其攻击面，但「渠道消息伪造 system 块」的注入形态入不可信输入面语料。

**Hermes 消费追加（2026-07-27 夜二，架构逐条，零悬置）**：①**session-start 记忆冻结快照**（改动落盘、下 session 才入 prompt）——前缀稳定的强形态实现选项，与我方「每请求重编＋byte-identical 门」同题异解，入 ADR-021 决定一/六实现选项素材；②**Curator 双阈值**（时间间隔＋闲置时长）——rebase 时机的在产参照（闲置即 cache 已死，恰合「冷 rebase」侧），入决定二再修素材；③**反例两枚必躲**：后台复盘无时间戳/并发感知致静默覆盖（#2670）、去重状态不持久致重启重复 flush（#3059 官方不修）——我方蒸馏落账本事件天然有时序真源，但「后台蒸馏 vs 用户并发改笔记本」冲突面须在 DOSSIER-FLOW-1 票面显式处理；④硬底线黑名单不可被 yolo 绕过——与 ADR-017 决定三「core 强制、包无权放宽」同构互证；⑤沙箱失败 fail-closed 不降级——与 ADR-018 顺序纪律互证；⑥容量满时模型硬闯限额——拒绝熔断器（ADR-017 决定五）的外部论据；⑦复杂度反面（5493 行单文件、60 参构造器）——最小 harness 路线佐证。

**归档召回对照（开源 agent 调研素材总索引，截至本批）**：八问框架源自 `research-2026-07-19-work-agent-landscape/`（WorkBuddy/TRAE/Qoder/Kimi 四家）；教材线 `research-2026-07-19-agent-pedagogy/`；pi 一手 `research-2026-07-20-pi-first-source/` 与 `pi-ecosystem-2026-07-26.md`；OpenWork 拆解 `benchmark-openwork-2026-07-26.md`；竞品脉搏与 opencode 源码级 `research-2026-07-27-parallel-survey/`；本批补「长自主个人 agent」一格（OpenClaw＋Hermes——同类别两标本，前者胜在缓存边界文档化，后者胜在记忆工程与后台复盘的事故记录）。至此 landscape 八问的「记忆」轴有六个在产对照点，ADR-021 评审输入齐备。

**时效**：随对象仓演进折旧；OpenClaw 文档存在双轨不同步（HEARTBEAT.md vs monitor-scratch），引用其机制前须复核当期文档。
