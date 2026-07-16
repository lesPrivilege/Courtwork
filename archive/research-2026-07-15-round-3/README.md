# Round 3 调研批次（2026-07-15）

本目录是 Round 3 期间的外部调研原稿，**只作线索与历史证据，不具约束力**；结论只有被 ADR 或工单 prompt 吸收后才生效（吸收记录见对应工单与 `docs/architecture/implementation-readiness.md`）。

| 文档 | 主题 | 已吸收落点 |
|---|---|---|
| `provider-switch-mechanisms.md` | cc-switch / claude-code-router / New API / Cherry Studio 的 provider 切换机制 | 三个 profile schema 盲点（参数化怪癖、双层粒度、模型别名）待第二 provider 需求到来时立 ADR 吸收 |
| `interaction-visual-regression.md` | 交互态视觉回归与 UI 残留检验方案 | 已吸收为 `UI-RESIDUE-1` 工单（开合闭合门 + DOM 残留 helper + 抖动清单） |
| `oss-gui-source-patterns.md` | Radix/cmdk/LobeUI/dockview/kunkun/TanStack 源码级机制拆解 | 采收清单 8 项分别标注 `UI-RESIDUE-1` / `CHAT-SESSION-1` / workbench 演进落点，派单时嵌入工单 prompt |
| `geist-design-md.md` | Vercel Geist design.md 对照与分发形态分析 | 已吸收为 `VOICE-SPEC-1` 与 `DESIGN-MD-1` 提案（见 implementation-readiness） |
| `vault-site-craft.md` | arlan.me/vault 技法拆解（MIT），Pages 站巧思候选 | 已吸收为 `SITE-CRAFT-1` 提案：Typer hero、Inset/Satin CTA、Ghosty reveal 三落点 |
| `feldar-page-narrative.md` | feldar.com 能力×微演示台账叙事结构 | 终局 polish / 未来 SITE-LEDGER 参照；与 site-evidence-line 台账裁决同构，只取结构不取皮肤 |
| `grok-build-patterns.md` | xai-org/grok-build 授权/审阅/compaction/沙箱设计形状（行为级证据） | 派单时嵌入 `OUTPUT-CONFIRM-UI-1`（deny 分层+Plan Mode 三态）与 `CHAT-MEMORY-1`（先蒸馏后裁剪）；内核级沙箱 gap 登记为发布阶段加固提案 |
| `fortune-invest-schema-stress-test.md` | 算命/炒股垂类 schema 可表达性压力测试 | 解耦验证：两域 core 零改动、RiskList 字段级零改迁植；投递叙事素材（跨域可信 agent 底座）；ChartElementRef 契约项挂起待真实需求 |
| `coding-agent-strategies-subtraction.md` | coding agent 上下文纪律的下放与减法对照 | 大部分已结构化（场景=编译 goal、投影=handoff、蒸馏=先缩）；两候选挂起：step 级模型档位（待多 provider ADR）、Chat→Work 晋升桥（待 Work live 后） |
| `chat-as-dossier-thesis.md` | 容器同构论（chat 目录即卷宗）+ 角色扮演垂类纸面案例 | 待 CHAT 自动压缩/渐进披露 index 立项时升 ADR；roleplay 为第三个 core 零改动可表达性案例 |
| `emil-skills-polish-input.md` | emilkowalski/skills 设计工程规则包（MIT） | polish 阶段直接工具：八类审计清单改造为 Fable 审计骨架；principles.md 为上位法逐条过滤 |
| `cognitive-debt-mapping.md` | 认知债三部曲（UL/可执行 PRD/Headless POC）对照 | 三步已有更硬实现（词表 drift 门/SPEC 反例强制/demo-runtime 即可执行业务说明书）；gap：agent 驱动业务路径探索，eval 线候选挂起 |
| `namethatui-vocabulary.md` | namethatui.com UI 正名词典 | UI-SURFACE-1 对标清单词汇基准；VOICE-SPEC/DESIGN-MD 命名参照；只取词汇不取实现 |
| `trae-work-landscape.md` | Trae Work 公开材料细拆（竞品地形） | 投递叙事精确化：护城河=契约与锚点非执行隔离；其沙箱/自动化为真实长处须正面承认；技能（提示词分发）vs 场景包（契约编译）为核心分野 |
| `upstream-positioning.md` | 上游投递定位（范式证明非防御资产）+ schema 普查候选 | 内部定位笔记不入公开叙事；技能库一网打尽编译扫描 = 第四次架构验收，发版后择机派 |
| `chinese-display-font.md` | 中文显示字体选型（已拍板：朱雀仿宋 OFL） | SITE-CRAFT-2/polish 实施：剂量纪律+锁版+按文案子集化；层级靠字号字距 |
| （外部）`~/Downloads/anti-ai-slop-kit/` | 反 AI slop 设计参考包（产品负责人维护的权威副本，2026-07-16 定稿；入口 00-发凡起例.md） | polish 阶段第一读物：05/12 AGENTS 片段过滤后入 polish 会话系统提示、05/09 检测清单入上线审计、03/06 冷调八站拆解与 04/08 法律工作台场景直接对口；其反制流水线与本仓已行机制同构（tokens 先于页面=tokens.json 真值、确定性检测=deslop-scan、人工 taste 门禁=独立视觉验收） |
