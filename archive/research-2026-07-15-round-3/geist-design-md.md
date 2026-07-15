# Geist design.md 参考笔记（2026-07-15）

来源：https://vercel.com/design.md（Vercel Geist 设计系统的机器可读定本，YAML frontmatter 承载 token，正文承载用法语义）。调研原稿，不具约束力。

## 与 Courtwork 设计语言对照

同构（佐证我们站在行业共识上）：色阶编码意图（100 底色 / 400 边框 / 700 实心 / 1000 主文字，数字即用途）；颜色只表状态不做装饰；「motion 0ms 往往是最好的选择」；mono + tabular figures 排数据；灰阶明度分层级；typography token 代替手写字号；`prefers-reduced-motion` 义务。

冲突（回迁时剔除）：Geist 用无色相灰（我们中性阶由品牌锚色派生）；popover/modal 有第二三套阴影（我们 L2 禁第二套阴影）；easing `cubic-bezier(0.175,0.885,0.32,1.1)` 带过冲属弹簧类（我们禁止）；blue 兼任 success/link/focus（我们状态色分轨、主操作用 ink）。

## 采收出的两个提案

1. **VOICE-SPEC-1**：Voice & Content 作为设计系统的一部分——动作命名 = 动词+名词（禁「确认/OK」裸词）；错误文案 = 发生了什么 + 下一步做什么；toast 不说「成功」；进行态用「……中」；空态指向第一动作。与既有「零技术概念暴露」合并成文案规范，大部分条款可转静态门（扫 UI 字符串）。
2. **DESIGN-MD-1**：从 `tokens.json` + `principles.md` 编译一份机器可读 `courtwork-design.md`（Geist 同形态），喂给效果图生成管线作前置约束——三层表面、动效白名单、色阶纪律在生成时即生效，回迁护栏从事后过滤提前到生成时约束。编译件非权威，`tokens.json` 仍是唯一机器真值。

另：Geist 每个彩阶附 P3/oklch 宽色域变体（sRGB hex 为回退）——藏青锚色在 P3 屏上可获得细微纵深而不破坏克制，属低成本工艺信号，可在 DESIGN-MD-1 或 token 演进时顺带评估。
