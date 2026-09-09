# 用户转交 · Design Discovery Feed / Scout Layer（Exa 查站点与同类来源，2026-09-09）

用户以消息原文转交（"可参，而且我会把它放在比单个组件库更上游的位置"），Fable 转录要点。消费裁定见 [intake-round-3 §4am WK-134](../intake-round-3.md)；索引落在 [engineering/design/scout](../../../../design/scout/README.md)。

**命题**：Best Designs on X 的价值不是规范，而是持续汇聚 X 上较新的 UI / motion / branding / icon / experimental interaction；用户报告首页 hourly updated、带搜索、已分出 Fonts / Dribbble / Behance / App Icons 入口。它适合承担 **发现异常或有趣的视觉局部 → 追原作者 / 原产品 / 原组件 → 找到实现与成熟先例 → 进入 Courtwork index**，而不能"看到漂亮截图 → 直接成为 design rule"。

**五级证据层级（用户）**

| 层级 | 例子 | 用途 |
|---|---|---|
| Scout | Best Designs on X、Recent Design、Viewport UI | 找新东西、新人、新交互 |
| Product precedent | Linear、Figma、Raycast、Arc、CodeRabbit | 看真实产品怎么用 |
| Design system | Apple HIG、Primer、Atlassian、Material | 提炼稳定规则 |
| Behavior primitive | React Aria、Radix、Base UI | 施工 |
| Visual donor | Spectrum UI、MingCute、Phosphor | 局部视觉取型 |

**要点**：index 不必等自己知道该搜什么，Scout 层负责暴露 unknown unknowns；尤其适合最近连续碰到的 control morphology / unusual slider / contextual toolbar / waveform / material / blur / generative type / icon treatment / corner treatment / tiny chart / inspector / state animation——这些难以靠关键词主动搜到，见到后反向溯源容易。

**Intake schema（用户）**：capture → screenshot / source URL、author、product / concept?、interesting locus、pattern hypothesis、mature precedent?、implementation lead?、disposition（ignore / specimen / donor / canonical candidate）。`product / concept?` 关键：concept shot 能证明"值得试"，不能证明真实复杂状态下成立。

**建议**：正式增加 DESIGN SCOUT INDEX（Best Designs on X ← primary；Recent Design；Viewport UI；Trending Design；Godly / site-specific；direct X creators），与 Control / Shape / Material / Iconography / Generative Identity Grammar 对接，让发现有明确消化路径而不是累积 moodboard。
