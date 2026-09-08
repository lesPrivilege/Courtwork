# EX-WK3 · 色彩治理与首页留白外部溯源

状态：**直接可消费**。Sonnet，只读 explore，2026-09-08。

只读声明：本卷全程只用 WebFetch / WebSearch 读取工单指定的外部来源；未修改任何文件，未启动任何服务，未读取任何本地数据目录或凭据文件。本地对照来源为 `/Users/lesprivilege/Projects/Courtwork-fresh/app/web/styles.css` 的 `:root` 块（已读，行 1–94），未改动。

未能直接访问 / 只取得空壳或标题的 URL（不作为转录依据，未在下表中当作已核实来源引用其原文）：

- `https://developer.apple.com/design/human-interface-guidelines/dark-mode` — 页面为客户端渲染，WebFetch 只取得 `<title>`；`.../foundations/dark-mode/` 路径返回 404。
- `https://developer.apple.com/design/human-interface-guidelines/materials` — 同上，空壳。
- `https://web.archive.org/*` 镜像两条 — 环境策略拒绝抓取 web.archive.org。
- `https://atlassian.design/components/tokens/all-tokens` — 页面只有导航壳，无 token 表正文。
- `https://primer.style/foundations/primitives/colors` — 只取得跳转说明，无正文；改用 `.../foundations/color/overview` 取得实质内容。
- `https://www.npmjs.com/package/@radix-ui/colors` — 403，改用 GitHub `package.json` 原文取得版本与许可。

Apple HIG 两页无法取得一手原文；下表 Apple HIG 行的转录内容来自 WebSearch 对该官方 URL 的搜索结果摘要（非直接页面正文），标注"经检索摘要，非一手页面直取"，可信度低于其余行，裁定时应加权更低或另行核实。

## 1. 溯源索引行（体例 §3）

```
R1 · https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale · 2026-09-08 · MIT（见 R4）· REFERENCE · 转录到 本卷 §2 Table A
R2 · https://www.radix-ui.com/colors/docs/palette-composition/composing-a-palette · 2026-09-08 · MIT（见 R4）· REFERENCE · 转录到 本卷 §4 Table C
R3 · https://www.radix-ui.com/colors/docs/overview/aliasing · 2026-09-08 · MIT（见 R4）· REFERENCE · 转录到 本卷 §3 Table B / §4 Table C
R4 · https://github.com/radix-ui/colors（package.json: version 3.0.0） · 2026-09-08 · MIT, Copyright 2022-present WorkOS · PROTOCOL · 转录到 styles.css:3（版本号已一致核对）
S1 · https://ui.shadcn.com/docs/theming · 2026-09-08 · 未在页面正文中明示许可（项目仓库 MIT，未在本次抓取核实）· REFERENCE · 转录到 本卷 §2 Table A / §4 Table C
G1 · https://vercel.com/geist/colors · 2026-09-08 · 未在页面正文中明示许可 · REFERENCE · 转录到 本卷 §2 Table A
L1 · https://linear.app/now/how-we-redesigned-the-linear-ui · 2026-09-08（原文发布 2024-03-28）· 博客，无独立许可声明 · REFERENCE · 转录到 本卷 §3 Table B
L2 · https://linear.app/changelog/2020-12-04-themes · 2026-09-08（原文发布 2020-12-04）· 博客，无独立许可声明 · REFERENCE · 转录到 本卷 §3 Table B（背景，功能早于 L1 重构）
AP1 · https://developer.apple.com/design/human-interface-guidelines/dark-mode · 2026-09-08 · Apple 官方文档，未见开放许可声明 · REFERENCE（经检索摘要，非一手页面直取，见上）· 转录到 本卷 §2 Table A / §3 Table B
AT1 · https://atlassian.design/foundations/color · 2026-09-08 · 未在页面正文中明示许可（仓库 Apache-2.0，未在本次抓取核实）· REFERENCE · 转录到 本卷 §3 Table B
AT2 · https://atlassian.design/foundations/elevation · 2026-09-08 · 同 AT1 · REFERENCE · 转录到 本卷 §3 Table B
P1 · https://primer.style/foundations/color/overview · 2026-09-08 · 未在页面正文中明示许可（仓库 MIT，未在本次抓取核实）· REFERENCE · 转录到 本卷 §2 Table A / §3 Table B
DYS1 · 多条 WebSearch 检索（"Dystopia" + UI kit / design system / Figma / typeface / GitHub）· 2026-09-08 · 不适用（无单一权威源）· AVOID-COUPLING · 转录到 本卷 §5
```

## 2. Table A · scale 步 → role（每来源一列）

角色行取自本地 `:root` 别名表；空格表示该来源未给出对应粒度的独立步位。

| role（本地别名） | Radix（R1） | shadcn（S1） | Geist（G1） | Apple HIG（AP1，经检索摘要） | Atlassian（AT1/AT2） | Primer（P1） |
|---|---|---|---|---|---|---|
| paper/canvas | 步 1–2："App backgrounds and subtle component backgrounds" | `background` token（配 `foreground`） | 背景 scale 2 值之一："100 — Default background" | 系统 `systemBackground`（base，dark 下最暗） | color role "background"（未见独立步号） | 步 0（scale 起点为 white，正文未逐位命名） |
| panel | 步 1–2 同上；R1 建议白或步 1/2 用作卡片背景 | `card` / `popover`（各自配 `-foreground`） | 未见独立卡片步位，同 backgrounds scale | `secondarySystemBackground`（elevated，第二层） | elevation 表面用中性 palette，未逐位命名 | 步区间 0–4（"steps 0 through 4" 作对比基准组） |
| hover | 步 4："hover states" | 未见独立 hover token（由 primary/secondary 状态样式承担） | 未见独立 hover 步位说明 | 未见 | interaction state modifier（未逐位） | 未见独立步号，归入交互 token 类 |
| selected | 步 5："pressed or selected states"（R1 将 selected 与 pressed 合并同一步） | 未见独立 selected token | 未见 | 未见 | 未见 | 未见 |
| pressed | 步 5，同上 | 未见 | 未见 | 未见 | 未见 | 未见 |
| line | 步 6："subtle borders on components which are not interactive" | `border` | 未见独立线条步位（背景/前景两值为主） | 未见 | color role "border" | "Step 8 is considered the minimum contrast value for interactive control borders" |
| line-strong | 步 7–8："subtle/stronger borders on interactive components and focus rings" | `input` / `ring` 共用较强边界语义 | 未见 | 未见 | 未见 | 步 8（同上引文） |
| solid accent | 步 9："highest chroma of all steps" | `primary` | 步 9–10："designed for accessible text and icons" | accent tint color（系统级，未见步号语义） | color role "background.brand"（未见逐位） | "Step 9 is considered the minimum contrast value for text" |
| accent hover | 步 10："component hover states, where step 9 is the component's normal state" | `primary` 的 hover 由组件层处理，无独立 token | 步 9–10 同上，未分 normal/hover | 未见 | 未见 | "10 meets the minimum against 5 and 6" |
| muted 文本 | 步 11："low-contrast text" | `muted-foreground` | 未见独立弱文本步位说明 | 未见 | color role "text.subtle"（未逐位） | 未见独立步号 |
| text | 步 12："high-contrast text" | `foreground` | "1000 — Primary text and icons" | 未见 | color role "text" | 未见独立步号 |
| focus ring | 步 8（同 line-strong 引文） | `ring` | 未见 | 未见 | 未见 | 步 8（同上） |
| on-accent 文本 | 未单列（R1 未给"实心背景上的文字"专门步位，由使用者自选白/黑） | `primary-foreground` | 未见 | 未见 | 未见 | 未见 |

## 3. Table B · light → dark 映射规则 + 对比门槛

| 来源 | 映射方式 | 表面随高度变化 | 对比门槛（原文数值） |
|---|---|---|---|
| Radix（R3） | 非严格同号：用"mutable alias"按用途重映射，示例 `--panel: white` → `.dark { --panel: var(--slate-2); }`；不承诺深浅同号必然对应 | 未给出独立"elevated 更亮/更暗"规则 | 未在本页给出数值门槛 |
| shadcn（S1） | `:root` 与 `.dark` 两块，每个语义 token 各自赋值，非算法推导，也非强制同号 | 未见专门表述 | 未见数值门槛 |
| Linear（L1，2024-03-28） | 同一 LCH 算法处理浅/深两宗："migrated the light and dark themes to adopt the same theme generation"；由 base/accent/contrast 三变量派生 | 未给出独立表面高度规则 | 无具体 WCAG 数值；只给出可调"contrast"变量与"super high-contrast themes"的定性描述 |
| Linear（L2，2020-12-04） | 早期功能：用户填 background/text/accent 色，系统"generate complimentary shades for borders and elevated boxes" | 提到 elevated boxes 由生成值承担，未给规则细节 | 未提及 |
| Apple HIG（AP1，经检索摘要） | 语义色自动随外观切换，不是同号缩放；系统提供 base 与 elevated 两组背景色 | 深色下"the higher the elevation, the lighter the surface looks"（elevated 更亮，与浅色相反：浅色靠阴影，深色靠更亮表面，因"drop shadows are less effective"） | 检索摘要给出 4.5:1 / 7:1 表述，但未能对照一手页面核实数值出处，本卷不作为可信数值引用 |
| Atlassian（AT1） | Token 级映射，非公式："Each color design token maps to a different value for each theme" | AT2："Imagine that the surfaces are distantly lit from the front — the higher the elevation, the lighter the surface looks"（与 Apple 方向一致：深色下更高层级更亮） | AT1 明示两档："3:1 minimum contrast for UI essential ... and text 24px or larger"；"4.5:1 minimum contrast for text smaller than 24px" |
| Primer（P1） | 反转中性 scale："the dark scale starts with black and ends with white"（浅色反过来），使两宗共享同一套语义 token 而不必逐一覆写 | 未见独立"elevated 更亮"表述，机制是整条 scale 反转而非分层调亮 | "Step 9 is considered the minimum contrast value for text against steps 0 through 4, while 10 meets the minimum against 5 and 6"；"Step 8 is considered the minimum contrast value for interactive control borders against bgColor-muted"；高对比宗目标"a minimum of 7:1 for most text and interactive elements" |

## 4. Table C · skin / brand 替换：稳定项 vs 可变项

| 来源 | 稳定项（不随 skin 变） | 可变项（随 skin/brand 变） | gray 与 accent 配对方式 |
|---|---|---|---|
| Radix（R2/R3） | 步位数（12）、每步的用途语义（1–2/3–5/6–8/9–10/11–12） | 具体色相、scale 名称（可整体改名，如 R3 引文 Discord 把 violet 改名 `blurple`） | 显式配对表：Mauve↔暖色系（Tomato/Red/Ruby/Crimson/Pink/Plum/Purple/Violet）；Slate↔冷色系（Iris/Indigo/Blue/Sky/Cyan）；Sage↔绿系（Mint/Teal/Jade/Green）；Olive↔黄绿（Grass/Lime）；Sand↔暖中性（Yellow/Amber/Orange/Brown）；原则："choose the gray scale which is saturated with the hue closest to your accent hue" |
| shadcn（S1） | token 名称集合（`background/foreground` 等配对约定、`-foreground` 后缀规则） | 每个 token 在 `:root`/`.dark` 下的具体色值；未规定 gray 必须来自某一 scale | 未给出显式 gray-accent 配对表；由使用者在同一 token 集里自行赋色，`primary` 与 `background` 无强制色相关联规则 |
| Geist（G1） | scale 结构（10 scale、每 scale 10 步，命名 `--ds-[scale]-[step]`） | 各 scale 自身色相（blue/red/amber/green/teal/purple/pink 并列，可增减） | 未给出配对表；gray 与彩色 scale 并列独立，未见强制配对规则 |
| Linear（L1） | 派生公式本身（LCH + 三变量）、"light and dark themes adopt the same theme generation" | base color、accent color、contrast 三个输入值 | 不是查表配对，而是从同一 base 色用 LCH 派生出灰阶与强调色，两者数学关联而非人工配对表 |
| Apple HIG（AP1，经检索摘要） | 语义色 API 名称（systemBackground 等）、base/elevated 两层概念 | 具体色值随系统外观与用户"色调"设置变化 | 未见 gray-accent 配对表述（本条可信度低，标注见上） |
| Atlassian（AT1/AT2） | token 命名规则："color" + 属性 + 角色/强调级/交互状态修饰符；elevation 的"更高层级更亮"方向 | 各 token 在不同主题下解析出的具体值 | 未在本次抓取内容中给出 gray-accent 配对表 |
| Primer（P1） | 反转 scale 的机制本身、对比步位规则（9/10 对文字、8 对边框） | scale 内具体色值、品牌色 scale 数量 | 未在本次抓取内容中给出 gray-accent 配对表；机制是整条中性 scale 反转，不是逐色配对 |

## 5. dystopia 核实结论

**结论：不存在一个可核实、有许可、专门针对"冷峻、专业"UI/视觉设计语言且公开发表具体取值的"Dystopia"设计系统；同名多义，且已知的具体命中物均与 WK-17 想要的方向不匹配。**

- 命中一：字体产品。TypeType 工作室的 "Dystopia" 字体（`https://typetype.org/fonts/dystopia/`）与 Adobe Fonts 的 "Dystopian"（`https://fonts.adobe.com/fonts/dystopian`）、Envato 的 "Dystopian System"（`https://elements.envato.com/dystopian-system-rough-rebel-radical-typeface-Y7GN7UM`）均为付费/商业字体，描述为 "rough rebel & radical"、"darker look and feel" 的品牌/包装用途字体，不含色彩 token、间距或组件规范；不是 UI 设计系统。
- 命中二：Roblox 第三方脚本 UI 库。检索命中 "Roblox Dystopia UI Library"，描述为"loadstring"加载的游戏内脚本菜单框架，与专业产品设计系统无关，未发表色彩/间距值可供借鉴，且来源可信度低（第三方脚本聚合站）。
- 未命中：在 Figma Community、Dribbble、GitHub/npm 组件库检索中，均未找到名为 "Dystopia" 且发布具体色彩/间距/组件规范值的设计系统或 UI kit。
- 结论对 WK-17 的影响：WK-17 已将 "dystopia" 登记为用户自定方向词（冷峻、专业，映射为 Slate 系冷灰 + 钢蓝 accent），本次溯源确认这一登记是必要的——没有外部同名系统可引用或需要避免撞名的具体色值；继续以 WK-17 的架构映射为准，不引用任何 "Dystopia" 字体或 Roblox UI 库的视觉细节。

## 6. 与 SE 冲突清单

本地 `styles.css:3-5` 注释："Only this scale and the four scarce colours below may appear in the file; every other colour is an alias."（Tier S 只有 gray 1–12 + blue-3/red-3/green-3 + accent/danger/success 三对，其余全部为 role 别名，对应 WK-16 的"杂色禁令"）。

- **与 Radix（R3）示例写法的张力**：R3 展示的深浅切换写法是在 `.dark` 块里对 role 变量重新赋值（`--panel: var(--slate-2)`），这本身与本地纪律不冲突（仍是"role 引用 scale"）；但 R3 也允许 role 在深宗下跳到与浅宗不同的**步号**（不保证同号），而 WK-18 裁定"深宗……只改 Tier S"、隐含"同 role 名映射 Radix dark 同号步"。若深宗实现严格同号映射，则与 Radix 官方推荐的"按用途重映射、不强制同号"做法不完全一致——WK-18 选择了比 Radix 官方示例更严格的规则，需由 Fable 确认这是有意收紧而非误读 R3。
- **与 shadcn（S1）token 粒度的差异**：shadcn 的 `-foreground` 后缀配对（`primary`/`primary-foreground` 等）比本地 role 表更细（本地目前只有 `on-accent` 隐含在组件层用 `color: white`，未在 `:root` 显式定义 `--on-accent` 变量）；`#send-button` 等组件在 styles.css 中直接写 `color: white`（如 line 229 `.primary-button { color: white; }`），这与 WK-16"杂色禁令：hex 只允许出现在 Tier S 定义处"字面冲突——`white` 虽非 hex 字面量，但是脱离 role 表的裸色值，游离于 Tier S/R/U 三层之外，值得 WO-WK7 一并检查。
- **与 Primer/Apple/Atlassian 的"elevated 更亮"方向一致，但本地尚无深宗**：三个来源（Primer 的反转 scale、Apple 的 base/elevated、Atlassian 的"the higher the elevation, the lighter the surface looks"）在深色下都遵循"层级越高越亮"，这与 WK-18"深宗待引入"的空白状态不冲突，但意味着 WO-WK7 设计深宗 role 值时，"panel/panel-muted 在深宗下谁更亮"需要显式决定，而不能照抄浅宗的"panel 比 panel-muted 更亮"关系（浅宗 `--panel: #fff` 比 `--panel-muted: var(--gray-1)` 更白/更亮，若深宗同号映射 gray-12→gray-1，方向会反转，需人工核对是否仍满足"层级越高越亮"）。
- **对比门槛数值基本一致**：本地注释里的 4.5:1（文字）与 3:1（非文字，`--muted` 标注 "3.9:1"）与 Atlassian 明示的"4.5:1 for text smaller than 24px"、"3:1 for text 24px or larger"以及 Primer 的"7:1"高对比目标同一量级，未发现冲突；WK-16"对比门槛（文字 ≥ 4.5:1，非文字 ≥ 3:1）"与这些来源方向一致。
- **accent-gray 配对未落地**：本地 accent `#315c8a`（钢蓝，自定 hex）搭配的是 Radix gray 中性 scale（非 Slate/Mauve/Sage/Olive/Sand 之一，是纯中性 `gray`），而 R2 的配对表把冷色系 accent（Blue/Indigo/Iris 等）配 Slate，而非纯 gray；WK-19"色阶沿 Radix 12 步语义"未强制要求换成 Slate，但 R2 的配对原则（"choose the gray scale saturated with the hue closest to your accent hue"）与本地当前"中性 gray + 钢蓝 accent"的组合不是 Radix 推荐的最佳配对，是否换 Slate 属 WK-20/未决第 3 条（accent hue）范畴，本卷只登记差异，不下裁定。

## 7. 结论（观察，不下裁定）

1. Radix、shadcn、Primer、Atlassian 四家都用"scale 步位/token 语义固定，具体色相可换"的两层结构，与 WK-16 的 Tier S / Tier R 划分方向一致。
2. 深浅宗映射有两种互斥流派：Primer 用"整条中性 scale 反转"实现同族 token 复用；Radix/shadcn 用"按用途在 `.dark` 块里逐个重赋值"，不保证步号对应；Linear 用统一 LCH 公式同时派生两宗。三者互不相同，WK-18 选的是"同号映射"，接近 Primer 而非 Radix 官方示例。
3. Apple/Atlassian/Primer 三家在深色下的表面层级规则同向："层级越高越亮"；本地尚无深宗，WO-WK7 需显式决定 panel/panel-muted 深色下的相对亮度，不能照搬浅宗关系镜像。
4. 唯一给出明确数值 gray-accent 配对表的是 Radix（R2）；本地当前中性 gray + 自定钢蓝 accent 的组合不在该配对表的推荐项内。
5. 对比门槛（4.5:1 文字 / 3:1 非文字）在本地注释与 Atlassian、Primer 之间量级一致，未见冲突。
6. "Dystopia" 在可检索范围内只命中字体产品与一个 Roblox 脚本 UI 库，均非专业 UI 设计系统，WK-17 的自定方向词登记未被任何外部权威源证伪或需要避让。
7. Apple HIG 两页因客户端渲染无法一手抓取，本卷相关行标注为经检索摘要、可信度较低，需要另行核实才能升级为可引用数值。
8. 本地 `.primary-button { color: white }` 等裸色值游离于 Tier S/R/U 三层命名之外，是 WK-16 杂色禁令下的一处待查项，留给 WO-WK7 或 lint 脚本处理。
