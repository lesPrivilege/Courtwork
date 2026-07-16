# emilkowalski/skills：polish 阶段输入（2026-07-15）

来源：github.com/emilkowalski/skills（MIT，11.3k stars；Vercel/Linear 背景设计工程师）。调研原稿，不具约束力；终局 polish 阶段的直接工具与参照。

## 内容

五个 agent skills：`emil-design-eng`（动效+设计主规则包）、`review-animations`（严格评审）、`improve-animations`（全库审计→按优先级出自包含 plan）、`animation-vocabulary`（动效词汇表）、`apple-design`（WWDC 设计原则转译 web）。安装：`npx skills add emilkowalski/skills`。

## 采收

1. **improve-animations 工作流形状**与我们 polish 分工同构：最强模型审计出品味判断→自包含 plan→便宜模型执行、不触源码。其**八类审计清单**（目的与频率 / easing 与时长 / 物理感 / 可中断性 / 性能 / 可达性 / 统一性 / 错失机会）可改造为 polish 阶段 Fable 审计骨架；「可中断性」类与 UI-RESIDUE 关注面重叠。
2. 品味规则（enter 用 ease-out、半透明阴影优于实线边框等）供 polish 会话安装使用。
3. 「domain expertise 编译成 agent 规则包」= schema engineering 论的设计版佐证。

## 滤网（硬约束）

skill 面向通用 web 审美；Courtwork 设计语言更严——四属性动效白名单、语义状态 0ms 硬切、数据区绝对静止、三层表面。**principles.md 与 site-evidence-line 例外条款是上位法**，skill 建议冲突时一律让位；polish 会话使用时逐条过滤，不整包采信。
