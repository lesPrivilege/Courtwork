# Design 第一步验收记录（2026-07-09）

工单：设计语言定稿（docs/31 两步制之第一步，Fable 认领）。

## 交付核对

- [x] tokens.json：底色/文字四层/描边/圆角四档/间距 4px 基阶/字阶四档（正文 14–15px、行高 1.6、tabular-nums 硬性）/语义色全表（tier A/B/C、severity 高中低、revision 增删、gate 三态与 schema DispositionStatus 枚举对齐、usage 三态）。命名零法律语义（docs/22 抽查通过）。
- [x] typography-density.md：中西文混排、justify 仅限文书面、密度四档 12px 下限、KBD 组件规格。
- [x] signature-line.md：静默态 + 5 语义态、并存优先级（danger > attention > revision > authority > neutral）、徽章字母表（A/B/C 保留给信源角标）、hover 折光 40px + citation 浮现（仅 hover）、状态变更 0ms 硬切、退化规则。
- [x] principles.md：容器有界/颜色预算/动效分界（2–5s 边框微光 1800ms、骨架呼吸 2000ms、>5s 事件流进度、<800ms 瞬发）/门禁三动作/零技术概念词汇表/溯源必达/KBD/编译冻结仪式/状态条/命名纪律。
- [x] northstar-s3.html：三栏 + 法理之线（6 张风险卡覆盖红/琥珀/灰线态与 confirmed/rejected/pending 门禁）+ 修订预览（红删蓝增 + 批注栏 + 依据角标）+ 编译门禁（4 项待确认禁用态）+ 状态条用量圆盘。数据 = risk-list.json 6 项风险原文 + main-contract.md 条款原文。
- [x] northstar-s1.html：时间线（12/47 关键事件含全部 4 矛盾点，日期 tabular、逐条溯源引语）+ 关系图谱（14 主体 15 关系边，矛盾关联边琥珀标出）+ 摄取进度（16/20、骨架呼吸、办案语言进度文案）。数据 = timeline.json / party-graph.json / case-file.json 原文。
- [x] 图标：法理之线母题，几何抽象冷调，避开天平/法槌/盾牌；浅深两版；16px 自查通过（含预授权降级方案）。
- [x] 硬性纪律抽查：两张屏无任何技术词汇暴露；彩色仅出现在语义 token 位；浅色主题唯一；数据区无自发动效；状态切换无 transition。

## 已知边界

1. 北极星屏为纯静态证明稿：门禁按钮、溯源链接、场景按钮不接真实协议（工单明确范围）；数据形状与 schemas 一致但 hover 折光坐标跟随用了 ~10 行内联脚本（纯视觉，不构成协议依赖）。
2. A 阶段已按架构裁决将语义色拆为 `graphic` / `fg` 双轨；旧记录中的对比度数字不成立，现以 `tokens.json` 1.1.0 的可访问文字色为准。
3. 图谱节点坐标为手排静态布局，量产版布局算法归 W9 实现方。

验收结论：**通过，可进入第二步（Opus 四件套量产，待 W6 放行）**。

## 二轮修正记录（2026-07-10，架构拍板执行）

目标：从"AI 生成的演示页"到"截图自一个已存在五年的专业软件"。六条全部落地：

1. **完整工作台帧**：两屏改为 标题栏 40px（品牌/案件名/案号 mono/⌘K）→ 工具栏 40px（阶段面包屑 + 文档级动作）→ 三栏（各带 40px 面板头，含 mono 计数）→ 全宽状态条 32px（含用量圆盘）。横带高度进 tokens `component.workbenchFrame`。
2. **紧凑列表**：S3 风险清单改 30px 行高 + 28px 列头（序号/风险/等级/依据法条/状态/操作），R3 高危展开行示范"逐条展开确认"；S1 时间线同构（日期/编号/事件/金额/来源），E31 矛盾点展开行示范核对。进 tokens `component.listRow`。
3. **tint 划界**：语义色 tint 禁作数据卡/列行背景（tokens semantic $description + principles §2a 明文）；法理之线一律纯白容器贴边通高 2px；AI callout（border-l-4 + tint + radius 6）为唯一 tint 容器，S3 中栏留一例（管辖抗辩取证建议）。
4. **8px 审计 + 贯穿网格线**：全部 padding/gap 归 8 倍数（微对齐 4）；四横带分隔线与三栏竖线贯穿整窗，面板头等高对齐，列表行线通面板全宽。
5. **字体栈生效 + tabular 演示**：body 全局 `font-variant-numeric: tabular-nums`；S3 依据法条列（§585 · §34 式 mono）、S1 金额列（右对齐 mono 千分位）为专列演示。
6. **圆角收 4–6 / 阴影归零**：tokens radius.lg 8→6；shadow.overlay 删除（弹层改 1px 描边 + 底色差）；KBD box-shadow 改 border-bottom 2px。

同步修订文件：tokens.json（radius/shadow/kbd/semantic 注/listRow/callout/workbenchFrame）、principles.md（§1 重写、新增 §2a 划界 §2b 紧凑列表优先）、typography-density.md（KBD、dense 行高档）、两张北极星屏全量重排。

## A 阶段收尾（2026-07-10，sol 执行 architecture-rulings.md）

- tokens 1.1.0 完成语义色双轨：线体/图形继续使用高纯度 `graphic`，12px 徽章与状态文字改用 AA `fg`（琥珀 `#B45309`、红 `#B91C1C`、绿 `#15803D`、板岩 `#475569`、蓝 `#1D4ED8`）。
- 长任务折光改用 ink 透明度 token，不再出现未登记 hover/glow 色；dense row 只保留实色 2px 法理之线，完整 40px 折光与 citation 仅在展开详情。
- S1 图谱文字统一至 12px；关系边增设 12px 透明命中区、键盘焦点与链接语义；两屏补统一 `:focus-visible`，状态圆盘补键盘入口。
- 两张北极星屏已同步上述 token 与交互修正；法理之线仍严格为纯白卡贴边通高 2px，未 callout 化。
