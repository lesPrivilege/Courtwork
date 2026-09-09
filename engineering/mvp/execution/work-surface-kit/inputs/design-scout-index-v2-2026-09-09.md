# 用户转交 · Design Scout Index v2（Exa 24 结果 / 3 workstream，2026-09-09）

用户以消息原文转交（附一张来源截图，未入库），Fable 转录要点。消费裁定见 [intake-round-3 §4ap WK-137](../intake-round-3.md)；索引 [design/scout](../../../../design/scout/README.md)。

**命题**：把截图里的来源升级为**按设计问题寻址**的 Scout Index，而不是按来源站点收藏。

| 层 | 高价值来源 | 最适合回答的问题 | 用户给的优先级 |
|---|---|---|---|
| Section-specific | Navbar Gallery、Footer.design、CTA Gallery、404s | 这个局部成熟产品一般怎么做 | A+ |
| Section atlas | Unsection、SupaHero、BentoGrids | hero / pricing / CTA / navbar / footer / section composition | A |
| Motion / detail | 60fps、Design Spells | hover、transition、state morph、scroll、microinteraction | A+ |
| Real SaaS | SaaSFrame、Saaspo | 真实商业产品、pricing、onboarding、product UI、responsive | A+ |
| Whole-page | One Page Love（SaaS）、Godly、Landing Love | 页面节奏与完整 composition | A− |
| Brand / identity | Rebrand Gallery | typography、mark、brand application | B+ |
| Broad discovery | curated.design、Refero、Best Designs on X | 找未知模式和原作者 | B |

**提级**：60fps 已按 AI / Blur / Badge / Assistant / 3D / Apple 等语境分类并有 storyboards 拆动画过程，可直接作 Material / Blur / Control / Motion grammar 的 motion donor；SaaSFrame 收 product interfaces、emails、flows、desktop / mobile 对照与 Figma 文件，比 Dribbble / Godly 更适合作施工证据（pricing、onboarding、settings、approval、dashboard 先看真实 SaaS 如何解决整个 flow）。

**组织方式**：`scout/` 下按问题分目录（navigation / hero / control / composer / pricing / approval / dashboard / onboarding / footer / error-empty / responsive / motion / identity），每个问题下挂不同来源，形成 evidence ladder（例：pricing → SaaSFrame 真实产品 / Saaspo 局部比较 / Unsection 非常规组合 / 60fps billing toggle / Best Designs on X frontier）。agent 接到任务时沿既定 ladder 消费，不随缘搜。

**Section gallery 的横向比较法**：Navbar Gallery 按 mega / mobile / side drawer / sticky / animated / grid / minimalism / typographic 细分，Footer.design 按类型与风格筛选；适合"同一局部的大样本横向比较"：Navbar → 30 个成熟样本 → classify → eliminate → 3 个候选 → Courtwork specimen → local decision（与 P1 / P2 一次一变量一致），而不是给一张 moodboard 说"做得像这些"。

**两个最高优先级入口**：SaaSFrame（真实产品 / flow）、60fps（interaction / motion）；Navbar / Footer / CTA / 404 / Unsection 用于局部横向比较；Best Designs on X 继续作发现未知模式的上游。消费链：Scout → Section / Product precedent → Design-system rule → Behavior primitive → Specimen → Courtwork local decision。
