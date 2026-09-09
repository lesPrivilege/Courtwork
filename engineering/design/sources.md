# Design 来源与消费快照 · 2026-09-05

三组 Luna 分别调研 Vercel、Linear/Apple、OpenWork/DSH；主线程复核 Vercel skill/指南、Linear 设计文章、Apple HIG 入口和 WCAG 对比度资料。只读文档与仓库，没有登录、截图、运行或审计上游 UI。GitHub 主分支未 pin，访问日不是发行版本。

## Skill、规范与社区解释

| ID / 类别 | 原始来源 | 核验与消费 | 不支持的外推 |
|---|---|---|---|
| S01 / 官方组织 skill | [vercel-labs/agent-skills 的 SKILL.md](https://github.com/vercel-labs/agent-skills/blob/main/skills/web-design-guidelines/SKILL.md) | 给 Agent 的 Web UI 检查工作指令；可以研究如何把规范变为检查项 | 不等于组件库或 runtime，不自动保证生成 UI 的质量 |
| S02 / 官方指南 | [Vercel Web Interface Guidelines](https://vercel.com/design/guidelines)、[规范仓库](https://github.com/vercel-labs/web-interface-guidelines) | 键盘、焦点、loading、错误、长内容和异步状态；消费到 principles 与 UI04/07/12 | 品牌偏好、数值和乐观更新不机械套用；不能降低正式提交语义 |
| S03 / 官方设计系统文档 | [Geist Typography](https://vercel.com/geist/typography) | 字阶与阅读层级的研究对象；选定语言后再设计 tokens | “Geist”命名的第三方组件并非当然由 Vercel 维护；未选定字体/组件 |
| S04 / 官方产品方法 | [Linear Method](https://linear.app/method/introduction) | 明确问题、减少无效工作和逐步增强；启发任务路径与渐进披露 | 不把 Method 当 Design skill，也不规定所有工作必须用 issue 列表 |
| S05 / 官方设计案例 | [Linear UI redesign](https://linear.app/now/how-we-redesigned-the-linear-ui)、[Invisible details](https://linear.app/now/invisible-details) | 导航、层级和交互细节，供 A/B/C 的密度与效率对照 | 文章截图/叙述不是本次 UI 实测；低对比品牌外观不是无障碍依据 |
| S06 / 官方历史产品说明 | [Linear Command Menu](https://linear.app/changelog/2019-12-18-new-command-menu) | 研究按焦点与上下文组织高频操作；记录为历史说明 | 不以 2019 页面断言当前全部快捷键或行为；不要求每个动作都有三种菜单入口 |
| S07 / 官方平台设计资料 | [Apple HIG](https://developer.apple.com/design/human-interface-guidelines/)、[Motion](https://developer.apple.com/design/human-interface-guidelines/motion)、[Accessibility](https://developer.apple.com/design/human-interface-guidelines/accessibility/)、[Keyboards](https://developer.apple.com/design/human-interface-guidelines/keyboards) | 交互反馈、连续性、键盘与辅助技术；本轮 HIG 根页正文受动态渲染限制，细节以专项分队读取资料为线索 | 未核验到 Apple/Linear 官方通用 Design skill；不作不存在的断言，也不把第三方转译视作官方发布 |
| S08 / 本地社区转译 | [apple-design SKILL.md（历史路径：`<private-source>/apple-design/SKILL.md>`）](../migration/2026-09-08/evidence-index.md) | 将 Apple 设计理念转译为 Web 手势/动效的参考；只消费原则，不固定其所有数值 | 不是 Apple 官方 skill；库映射、CSS 建议与平台数值须单独核验 |
| S09 / 标准说明 | [WCAG 2.2 文本对比度](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)、[非文本对比度](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html) | 为 prototype 定义可测试的对比度目标，保留条款与例外 | 对比度达标不代表完整 WCAG 合规或可访问性通过 |
| S10 / 材质规范 | [WWDC25 219 Meet Liquid Glass](https://developer.apple.com/videos/play/wwdc2025/219/)、[WWDC25 356 Get to know the new design system](https://developer.apple.com/videos/play/wwdc2025/356/)、[Fluent Mica](https://learn.microsoft.com/en-us/windows/apps/design/style/mica)、[Fluent Acrylic](https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic)、[in-app acrylic](https://learn.microsoft.com/en-us/windows/apps/develop/ui/in-app-acrylic)、[prefers-reduced-transparency（MDN）](https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency)、[caniuse](https://caniuse.com/mdn-css_at-rules_media_prefers-reduced-transparency) | 材质只在功能层 / transient 层、禁内容层 glass 与 glass-on-glass、回退规则、媒体查询支持面；转录见 [EX-WK9](../mvp/execution/work-surface-kit/explore/ex-wk9-material-sources.md)，裁定 WK-101…104 | 访问日 2026-09-09；HIG Materials 静态页未取得一手正文；Acrylic / Liquid Glass 数值未公开，本地 token 不引外部数值；消费模式 REFERENCE |

官方与第三方的区分是来源责任，不是拒绝社区经验。可变远程 skill 在将来实际使用前需保存版本坐标和检查适用范围；不因安装/读取 skill 就允许其改写本项目 Authority 或发起未经授权的发布。

| S11 / Local UI Atlas | 用户 Exa 扫描（85 结果 / 7 workstream）：assistant-ui Composer / Tool UI / Approval Card / Reasoning Panel、Vercel AI Elements PromptInput / tool.tsx、chromium-tabs、Atuin Tabs、Termany HTabBar、Base UI Popover / Tooltip / Button、Radix Popover / Hover Card、Primer Button、React Aria、Supabase Button、cmdk、Sonner 笔记、21st / VLLNT / uiw heatmap | 局部行为范式与状态机；只取行为不引依赖；`Always allow` 不采纳 | 转录 [inputs/local-ui-atlas-2026-09-09](../mvp/execution/work-surface-kit/inputs/local-ui-atlas-2026-09-09.md)；索引 [atlas](atlas/README.md)；WK-118。链接未经 Fable 核验 |

| S12 / frontier 桌面端结构参照 | 用户 2026-09-09 提供的三张截图（Claude Code 桌面端两张、Codex 桌面端一张），已由 Fable 目视；截图不入库，只记结构观察 | tab strip：每 tab 自带关闭区、末尾 +、活动 tab 高亮、与内容面共享顶部 chrome；侧栏与内容面同一顶带下贯通；文件卡 hover 出现两个局部动作（"Start a side chat / Reply"）而非常驻按钮；Codex 的 Review 面：轮次选择器 + 增删计数 + 逐文件折叠 diff，与聊天面并列且顶部相接；两端都无假窗口控制、左上留原生安全区；Codex ask-user 卡：问题正文 + 编号选项（带箭头、可键选）+ 自由回复框 + Skip / Send，一次合并提问（WK-123 Auto 同源） | 只借结构与行为（tab chrome、局部动作浮出、并列复核面），不复制品牌、图标、精确栏目或私人内容；对应 atlas 的 tab-chrome / popover-inspector / process-trace 三行；WK-119 补充 |

| S13 / 来源分层 | 用户 Exa 收敛（38 结果 / 4 方向）：A 层 Linear Agent Interaction、GitHub Primer scenario patterns（delete）；B 层 AI Elements v6、assistant-ui、21st Agent Elements；C 层 Spectrum UI（上游 beUI、transitions.dev）；D 层 Velora、Smithers UI、Nexus / Agents UI | 四层来源模型与六级索引格式；A 层只检查语义齐全；Spectrum 只取 motion；upstream 是 donor 不是依赖 | 转录 [inputs/ui-source-tiers-2026-09-09](../mvp/execution/work-surface-kit/inputs/ui-source-tiers-2026-09-09.md)；词表 [ui-state-vocabulary](../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md)；WK-122。链接未经 Fable 核验 |

| S14 / 材质语法与生成式身份 | 用户 Exa（48 结果 / 5 方向）：Figma Effects（Layer / Progressive Blur、Glass 参数）、Apple SwiftUI Material、Apple Adopting Liquid Glass、Josh Comeau Next-level backdrop-filter、web.dev backdrop-filter 性能；OpenCode Font 页、nexu-io open-design 的 opencode 分析 | Material grammar（field / surface / edge / depth / focus）作 FE-05 结构；progressive blur 与 mask 扩采样进 chrome 候选面消融；field / 氛围层只作 specimen；生成式身份立 GI 轨道（品牌线），不复制 OpenCode 风格 | 转录 [inputs/material-grammar-2-generative-identity-2026-09-09](../mvp/execution/work-surface-kit/inputs/material-grammar-2-generative-identity-2026-09-09.md)；WK-124。链接未经 Fable 核验 |

| S15 / Shape grammar 与生成式身份 | 用户 Exa（36 结果 / 4 workstream）：Apple WWDC25 356（concentricity、capsule 与桌面密度）、Material 3 Shape / Buttons（optical roundness、shape morph）、Atlassian Radius（体例与 focus 派生）、MDN `corner-shape`；Monotype × Evri、Otherwhere Emblème、Measured Facet、CLEVER°FRANKE ADC | Shape 五角色 + concentricity 公理 + grouping topology + forbidden rules；corner-shape 只 progressive enhancement；Identity invariant / variation、确定性生成、Facet 范式 | 转录 [inputs/shape-grammar-generative-identity-2026-09-09](../mvp/execution/work-surface-kit/inputs/shape-grammar-generative-identity-2026-09-09.md)；WK-125。链接未经 Fable 核验 |

| S16 / Control Grammar | 用户 Exa（56 结果 / 5 workstream）：React Aria Components 目录、Base UI NumberField（ScrubArea）/ Slider、MetaBind Inspector、waveform-playlist、Nuxt / Tiptap Editor Toolbar（fixed / bubble / floating）、Tailscale Visual Policy Editor；两张控件截图（未入库） | Schema / intent → control 的 canonical mapping；Schema constraint ≠ UI affordance；控件是编辑器不是事实源；行为 donor 不引依赖；只建有 schema 的控件 | 转录 [inputs/control-grammar-2026-09-09](../mvp/execution/work-surface-kit/inputs/control-grammar-2026-09-09.md)；atlas Control Grammar 段；WK-129。链接未经 Fable 核验 |
| S17 / Icon 来源选型 | 用户 Exa（26 结果 / 4 workstream）：[MingCute](https://github.com/mingcute-design/mingcute-icons)（已核验：Apache-2.0，24×24 / 2px，Core Regular + Filled 1,663 / 3,326，`@mingcute/icons` 等 10 包；Cute / Sharp 为 Pro 档）、[Lucide Icon Design Guide](https://lucide.dev/contribute/icon-design-guide)（已核验：1px 安全边、2px 居中描边、round cap / join、圆角 2 / 1 / 2.41、间距 ≥ 2、circle / square 模糊对照、视觉重心居中）、[Phosphor](https://phosphoricons.com/)、[Remix Icon](https://github.com/Remix-Design/RemixIcon)、[Hugeicons](https://hugeicons.com/docs/features/customizable-icons)（后三者未核验） | Lucide 冻结不变（IC-5 / WK-94）；MingCute = 主要视觉候选，Phosphor = 表现力局部候选（六重量不采纳），Remix = 覆盖 donor，Hugeicons = 长尾查询源；一时一族，donor 逐枚归一 + manifest；Lucide 设计指南 = 自绘 / donor 归一验收规则；Line ↔ Fill 只作"候选，待 boolean toggle schema"的冗余线索 | 转录 [inputs/icon-sourcing-mingcute-2026-09-09](../mvp/execution/work-surface-kit/inputs/icon-sourcing-mingcute-2026-09-09.md)；atlas Iconography 段；icon-controls IC-6；WK-133。EX-IC1 在 FE-05a 合流后派 |
| S18 / Design Scout 层 | 用户 Exa：[Best Designs on X](https://bestdesignsonx.com/)（primary；JS 渲染，主张未核验）、Recent Design（核验：Daryl Ginn / Godly，每日）、[Viewport UI](https://viewport-ui.design/)（核验存在）、Trending Design（第三方提及）、Godly、直接 X 创作者 | S 层 = WK-122 四层之上的发现层，只出 capture 不出规则；capture schema（product / concept、grammar slot、Courtwork semantic、disposition 四值）；pull 不 push；不存图不复制作品 | 索引 [design/scout](scout/README.md)；转录 [inputs/design-scout-layer-2026-09-09](../mvp/execution/work-surface-kit/inputs/design-scout-layer-2026-09-09.md)；WK-134；EX-SC1 试点 → WK-135（recent.design 升 primary，Best Designs on X 降为创作者目录，8/8 ignore） |
| S19 / Scout Index v2 | 用户 Exa（24 结果 / 3 workstream）：[60fps](https://60fps.design/)（核验：2,060 shots / 108 tags / 67 storyboards，无许可声明）、[SaaSFrame](https://www.saasframe.io/)（核验：product interfaces + flows + desktop / mobile；Figma 为 Pro）、[Navbar Gallery](https://www.navbar.gallery/)（核验：网站导航分类）、[Unsection](https://www.unsection.com/)（核验：4,000+ sections，免费）；Saaspo、Footer.design、CTA Gallery、404s、SupaHero、BentoGrids、Design Spells、One Page Love、Landing Love、Rebrand Gallery、curated.design、Refero（未核验） | 按问题寻址的索引；60fps = C 层 motion donor；SaaSFrame = Product precedent primary；section galleries 只服务公共站；section sweep 程序（≤30 → ≤3 → specimen）；不下载录屏 / Figma | [design/scout](scout/README.md)；转录 [inputs/design-scout-index-v2-2026-09-09](../mvp/execution/work-surface-kit/inputs/design-scout-index-v2-2026-09-09.md)；WK-137 |

## 从 Agent GUI 文档提取的完成面

| ID / 证据入口 | 文档明确支持的观察 | 对应本项目要求 / 剩余验证 |
|---|---|---|
| G01 [DSH Quickstart](https://deepseek-harness.github.io/deepseek-harness/en/guide/quickstart) | 设置模型/key、选择 workspace 与输入任务的入口关系 | UI01–05；测试未配置、无 workspace、失败和草稿保持；不能默认它已满足全部分支 |
| G02 [DSH client 包地图](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/README.md) | 有 composer、附件、工作区、deliverables、approval、user-questions 等包 | UI05/10/11/14；包存在仅说明职责位置，不是流可用性证明 |
| G03 [DSH Trajectory UI](https://github.com/deepseek-ai/deepseek-harness/blob/master/packages/client/ui-trajectory/README.md) | 描述流式更新、尾部跟随、上滚暂停跟随和长记录处理 | UI06/07/09；借阅读不被打断的状态模式；仍需实际键盘/选择/滚动验证 |
| G04 [DSH Web Client](https://github.com/deepseek-ai/deepseek-harness/blob/master/docs/subsystems/web-client.zh.md) | 描述队列、取消、控制流、baseline/cursor 与重连修复 | UI08/09/12；这是 DSH 特定协议，不能假设其他 Adapter 有相同游标 |
| G05 [OpenWork README](https://github.com/different-ai/openwork/blob/dev/README.md) | 产品壳包含 Web/Desktop/Server 等层，并有 headless 形态；ee 存在单独许可边界 | UI01/02/18 与生命周期参考；本轮没有逐项核验附件、Review 和恢复效果 |
| G06 [前轮工程生态快照](../ecosystem/2026-09-05.md)、[Courtwork 历史索引](../ecosystem/local-sources.md) | 提供 GUI wrapper、源码研究与旧失败线索 | 可作为 D1 取证题目；历史能力、旧 issue、当前文档和本次实测分开 |

OpenWork 与 DSH 都不因有 artifact/approval UI 就提供 SE 的正式成果接受语义。UI15–17 的版本、Evidence、Review 和工作义务来自本项目契约，要独立设计和验证。

## 下一轮取证卡

Motto TUI、Deswrit kit、Courtwork Design 与用户提供的 ChatGPT 讨论另见 [历史与网页参考裁取](reference-consumption.md)。它们不是当期 fresh brief；原建议中的工具与品牌偏好已经按事实、推论、不可访问项和未决选择分开。

```text
产品/页面与确切版本、日期、窗口和输入方式
用户任务与初始状态
操作序列、截图/录像定位
实际观察 / 文档声明 / 推断分别写
覆盖 UI-ID、失败/恢复入口、缺失证据
本项目裁取或不采纳、对应 Design Decision
```

若只有文档，不评价上游 UI “手感好”“焦点可靠”或“无错误”。原始截图放未来明确授权的证据目录，来源许可与个人内容先核对；本轮不下载或复制产品资产。
