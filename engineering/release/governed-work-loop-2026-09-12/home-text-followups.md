# 首页文本待校缺口 · 2026-09-12

状态：登记、延后；用户明确本轮不再修，后续顺手维护时消费，不新增本轮发布任务或自动跟进。

来源：用户对已发布首页文本的核读反馈。登记基线为 main `1ac28980c4877f4a86adf586aeb1b66980e23504`，页面发布源码为 `c1ea9de696db695567ae61c666dee859ab527850`；[发布与验证回执](../../../evidence/work-loop-public-copy-20260912/README.md)。本次只转录缺口，未重新独立核验页面，也未修订源码。

范围：仅首页文本；子页、Release 与 specimen 内容未核，以下不延伸为这些面的审查结论。

| 项 | 用户观察与待校方向 |
| --- | --- |
| 1 · c-9 前态 | “After a source changes”的 BEFORE 栏中，Matter v7 已在 source set 2，c-9 基于 set 1 却标 Pending review，变更后才标 Stale。按候选绑定来源集合修订的页面规则，前态似已落后。后续核实 staleness 的计算时机：若仅在 Spark 触发时计算，应在图注说明；否则前态应标 Stale。尚未裁定采用哪种修法。 |
| 2 · FIG. 00 | 首图第三格标签 MATTER，图注却为 Source → Candidate → Decision；后续统一概念与图注。 |
| 3 · 链接与箭头 | “Explore the ideas ↗”到 features.html，Paper 卡片“Explore ideas”展开论文要点，Research 栏“Explore the ideas →”到 #long-work；同名动作不同。tour.html 在 Tour 列表用 ↗，在“Explore the full tour”用 →。后续按目的与行为区分文案和箭头。 |
| 4 · 指称 | 标题、按钮 CourtWork 与页脚“Get Courtwork”、Home 截图 alt 的 Courtwork 不统一；正文 Matter 与“沿着同一事项检查”“进入事项版本8”中的“事项”不统一。后续统一展示指称。 |
| 5 · Specimen 入口 | “A matter in motion”下链接直接显示 `./specimen/index.html`。无论 iframe 回退还是常显入口，后续换为可读文本；本次未核其显示机制或 specimen 内容。 |
| 6 · Professional 证据等级 | $29/月下列 Signed desktop builds、Cloud sync、Continuous private eval 等，与 Local 档使用相同现状语气。若这些尚未上线，应按实际证据标 planned 或 waitlist；尚未核实逐项可用性，不在本登记中断言其均未实现。 |

用户同时确认的自洽点：修订示例行号与增删计数（2 added · 1 removed）、v7 → v8 版本链、论文链接钉在具体 commit。保留为此次核读的正向观察，不扩大为整页或产品独立验收。
