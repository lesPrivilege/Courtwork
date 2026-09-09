# EX-PS1 · 发布面材质治理来源（Sonnet，只读）

状态：**直接可消费**（本卷内已含转录值与 file:line，读者不必回源即可核对结论；第三方对照与首页观察部分标注为文本级观察，非视觉渲染核实）。

只读声明：本次只读取工单指定的本地文件与外部只读来源，未写入、未修改本目录以外的任何文件，未启动任何本地服务，未下载图片/字体/视频类资产，未截图任何第三方站点。产出仅本文件一份。

访问日：2026-09-09（全部外部来源同一天访问）。

来源文件 sha256（本次读取时的内容指纹，供核对是否漂移）：

| 文件 | sha256（截断） |
|---|---|
| `app/web/styles.css` | `c09a829b4a30c9c9…` |
| `engineering/design/surface-hierarchy.md` | `891523cfa3258ecd…` |
| `engineering/design/ui-composition-standard.md` | `219f25ad1feb57b6…` |
| `<isolated-checkout>/…/intake-round-3.md`（未合流分支，只读） | `66bef544fe8e07d6…` |
| 本工单文件 `EX-PS1-material.md` | `70f5e92277ce91cf…` |
| `handoff-convention.md` | `7ab1df384a41845c…` |

方法说明（供核对，非结论）：对 `cal.com`、`korren.dev`、`ped.ro` 三个非 GitHub 外部来源，先用 WebFetch 取一次文本摘要；三者摘要均未给出可核实的 CSS/JS 细节（cal.com 摘要说明来源材料是"纯文本大纲，没有视觉信息"；korren.dev 摘要给出一句转述但未给代码；ped.ro 摘要明确说"无法识别任何模糊效果"）。为完成工单要求的"逐值转录、file:line"，改用 `curl` 一手抓取这三处页面的原始 HTML 及其引用的同源 CSS/JS 文本文件（非图片/字体/视频），本卷第 2、5 节的转录均来自这次一手抓取，非 WebFetch 摘要。`opendesigner.io` 首次 WebFetch 超时，第二次成功，按只读来源清单的定位（"第三方分析，只作对照"）只摘录其陈述，不转录源码。Cal.com 的 GitHub 源码经 `gh api` 与 `raw.githubusercontent.com` 在固定 commit 读取。

未访问 / 未启动：无未访问的必需 URL；未启动任何服务；未读取任何凭据文件。

固定 commit：`calcom/cal.com` `b3321936c347744a759e0f36a9793bb78c9bca78`（2026-09-09 08:25:29 UTC，`main` 分支当时的 HEAD）。

## 1 · 溯源索引（体例 §3 格式）

```
PS1-S1 · frozen b3321936c347744a759e0f36a9793bb78c9bca78:packages/config/theme/tokens.css · 2026-09-09 · MIT（calcom/cal.com 仓库许可） · REVERSE · 转录到 本卷 §2、§3
PS1-S2 · https://opendesigner.io/design-systems/cal · 2026-09-09（WebFetch 文本摘要，二次尝试后取得） · 许可未知，仅摘录其陈述数字，不转录原文 · REFERENCE（只作对照，不作值来源） · 转录到 本卷结论第 9 行
PS1-S3 · https://cal.com · 2026-09-09（curl 一手抓取 HTML，WebFetch 摘要先行但无视觉信息） · 站点版权 Cal.com Inc.，本卷不转录正文，仅统计标记/资源存在性 · REFERENCE · 转录到 本卷 §4 首屏观察、结论第 8 行
PS1-S4 · https://korren.dev/（含同源 colors_and_type.css） · 2026-09-09（curl 一手抓取 HTML+CSS，WebFetch 摘要先行仅给一句转述） · 许可未知（个人网站，未见声明），只转录必要代码片段 · REVERSE · 转录到 本卷 §5 blur 登记表、结论第 7 行
PS1-S5 · https://ped.ro/（含同源 _next 静态 CSS：/_next/static/css/2c957efb669850f8.css、/_next/static/css/f10219ce52e1f69b.css） · 2026-09-09（curl 一手抓取 HTML+CSS，WebFetch 摘要先行为空结果） · 页面代码含 Radix Themes 库产物，版权归各自作者，本卷只转录必要 CSS 片段用于说明技术手段 · REVERSE · 转录到 本卷 §5 blur 登记表、结论第 6 行
```

## 2 · Cal.com 转录表

来源统一为 `packages/config/theme/tokens.css`，commit `b3321936c3477…`。**先记一个偏差**：工单指定的 `packages/config/tailwind-preset.js` 在该 commit 不存在（`gh api repos/calcom/cal.com/contents/packages/config` 只列出 `package.json` 与 `theme/`）；Cal.com 已迁移到 Tailwind v4 的 `@theme` CSS 令牌写法，实值集中在 `theme/tokens.css`，`packages/ui/styles/shared-globals.css` 与 `packages/coss-ui/src/styles/globals.css` 两处经查为空壳文件（各自只有个位数行，无 shadow/radius 字面量）。

### 2a · Radius

| token 名 | 值 | 用途（来源注释原文） | 文件:行 | commit |
|---|---|---|---|---|
| `--radius-none` | `0px` | 无逐项注释，节内仅有值 | `tokens.css:239` | `b332193…` |
| `--radius-sm` | `0.125rem`（2px） | `/* 2px */`（数值即注释） | `tokens.css:226-227` | `b332193…` |
| `--radius`（基档） | `0.25rem`（4px） | `/* 4px */` | `tokens.css:223-224` | `b332193…` |
| `--radius-md` | `0.375rem`（6px） | `/* 6px */` | `tokens.css:228-229` | `b332193…` |
| `--radius-lg` | `0.5rem`（8px） | `/* 8px */` | `tokens.css:230-231` | `b332193…` |
| `--radius-xl` | `0.75rem`（12px） | `/* 12px */` | `tokens.css:232-233` | `b332193…` |
| `--radius-2xl` | `1rem`（16px） | `/* 16px */` | `tokens.css:234-235` | `b332193…` |
| `--radius-3xl` | `1.5rem`（24px） | `/* 24px */` | `tokens.css:236-237` | `b332193…` |
| `--radius-cal-full`（对应 pill） | `9999px` | 在 `@theme inline` 块内，生成 `rounded-cal-full` 一类工具类 | `tokens.css:38` | `b332193…` |

`--radius-cal-*` 系列（`tokens.css:30-38`）是同一把刻度的字面量重复（0/2/4/6/8/12/16/24/9999px），用于 Tailwind v4 `@theme inline` 生成 `rounded-cal-*` 工具类；数值与上表一一对应，未另开新档。

### 2b · Box Shadow

节标题原文只有 `/* Box Shadows */`（`tokens.css:336`），逐项无单独注释；以下"用途"列是按 token 命名词面直译，不是源码注释。

| token 名 | 值 | 用途（命名词面） | 文件:行 |
|---|---|---|---|
| `--shadow-dropdown` | `0px 5px 20px 0px rgba(0,0,0,.10), 0px 10px 40px 0px rgba(0,0,0,.03)` | 下拉/浮层的扩散阴影 | `tokens.css:337` |
| `--shadow-switch-thumb` | `0px .8px .8px 0px rgba(0,0,0,.10), 0px .8px 3.2px 0px rgba(0,0,0,.08)` | 开关滑块阴影 | `tokens.css:338` |
| `--shadow-solid-gray-rested` | `0px 2px 3px rgba(0,0,0,.06), 0px 1px 1px rgba(0,0,0,.08), 1px 4px 8px rgba(0,0,0,.12), 0px 2px .4px rgba(255,255,255,.16) inset, 0px -1.5px 2px rgba(0,0,0,.40) inset` | 实心灰按钮常态（含顶部内嵌高光 + 底部内嵌暗线） | `tokens.css:339` |
| `--shadow-solid-gray-hover` | 同上但内嵌暗线改 `0px -2px 2px rgba(0,0,0,.40) inset` | 实心灰按钮 hover | `tokens.css:340` |
| `--shadow-solid-gray-active` | `0px 2px 3px rgba(0,0,0,.40) inset, 0px 0px 2px 1px rgba(0,0,0,.40) inset` | 实心灰按钮按下（全内嵌，外阴影撤除） | `tokens.css:341` |
| `--shadow-outline-gray-rested` | `0px 2px 3px rgba(0,0,0,.03), 0px 2px 2px -1px rgba(0,0,0,.03)` | 描边按钮常态（极浅贴地阴影） | `tokens.css:342` |
| `--shadow-outline-gray-hover` | 同 rested | 描边按钮 hover | `tokens.css:343` |
| `--shadow-outline-gray-active` | `0px 2px 1px rgba(0,0,0,.05) inset` | 描边按钮按下 | `tokens.css:344` |
| `--shadow-outline-gray-focused` | `0px 0px 0px 1px rgba(255,255,255,.20), 0px 0px 0px 2px rgba(0,0,0,.10)` | 聚焦环（白色 1px 内环 + 黑色 2px 外环，双层描边） | `tokens.css:345` |
| `--shadow-outline-red-rested` | `0px 2px 3px rgba(0,0,0,.03), 0px 2px 2px -1px rgba(0,0,0,.03)` | 危险态描边按钮常态 | `tokens.css:346` |
| `--shadow-outline-red-hover` | `0px 1px 1px rgba(0,0,0,.06), 0px 2px 3px rgba(0,0,0,.08)` | 危险态描边按钮 hover | `tokens.css:347` |
| `--shadow-outline-red-active` | `0px 1px 1px rgba(127,29,29,.06), 0px 0px 3px rgba(127,29,29,.08), 0px 2px 2px 1px rgba(127,29,29,.06) inset` | 危险态描边按钮按下 | `tokens.css:348` |
| `--shadow-elevation-low` | `0px 1px 1px rgba(0,0,0,.07), 0px 1px 2px rgba(0,0,0,.08), 0px 2px 2px rgba(0,0,0,.10), 0px 0px 8px rgba(0,0,0,.05)` | 通用低抬升（四层叠加，唯一一个带"elevation"字样的 token） | `tokens.css:349` |
| `--shadow-button-solid-brand-default/hover/active/focused` | 四条复合值（结构同 solid-gray 系但多一层聚焦白环） | 品牌实心按钮四态 | `tokens.css:350-353` |
| `--shadow-button-outline-red-focused` | `0px 0px 0px 1px rgba(255,255,255,.32), 0px 0px 0px 2px rgba(220,38,38,.15)` | 危险态描边按钮聚焦环 | `tokens.css:354` |

`.dark` 块（`tokens.css:369-469`）**未重新声明任何 `--shadow-*` 变量**——全文件检索确认深色模式下沿用同一组阴影字面量，只有背景/文字/边框色重新声明。

按工单问题里的四层命名（ring / contact / ambient / inset highlight）做归类，**这四个名字不是源码自带的分类，是本卷按视觉构成做的映射**：

- ring → `--shadow-outline-gray-focused` / `--shadow-button-*-focused`：双层描边（内白外黑或内白外品牌色），无扩散模糊，纯描边宽度堆叠。
- contact → `--shadow-elevation-low` / `--shadow-solid-gray-rested`：1–2px 位移、1–2px 模糊的贴地层，用于"贴着表面"的轻抬升。
- ambient → `--shadow-dropdown`：5–10px 位移、20–40px 模糊的大范围扩散层，唯一明确用于浮层（dropdown）的 token。
- inset highlight → `--shadow-solid-gray-*` 与 `--shadow-button-solid-brand-*` 内部的 `rgba(255,255,255,…) inset`（顶部高光）与 `rgba(0,0,0,…) inset`（底部暗线）：不是独立 token，是复合阴影里的两条内嵌层，只出现在"实心填充"按钮类。

## 3 · 产品对照表

| 产品 token | 值（浅 / 深） | 层级 L0–L3 | Cal.com 对应项 | 是否同构 | 差异说明 |
|---|---|---|---|---|---|
| `--frame` | `#f0f0f3` / `#111113`（`styles.css:224,31-32,69`） | L0 | 无直接对应；`--cal-bg-subtle`（浅 `hsla(220,14%,94%,1)`）/ `--cal-bg-muted`（深 `hsla(0,0%,9%,1)`）语义最近 | 否 | Cal.com 是 `bg / bg-subtle / bg-muted / bg-emphasis` 的语义强度序列，未声明哪一档对应"应用外框"；产品 L0 由 `tools/lint-colors.mjs` 强制成一条高度序列（`styles.css:220-223` 注释），Cal.com 没有等价的 lint |
| `--panel` | `--paper` `#fdfdfe` / `#212225`（`styles.css:30,67`） | L1 | `--cal-bg` 浅 `hsla(0,0%,100%,1)`（#fff）/ 深 `hsla(0,0%,6%,1)`（≈#0f0f0f） | 基本同构 | 两者都是"默认表面"语义，取值方向一致（浅纯白、深近黑） |
| `--panel-muted` | `--gray-2` `#f9f9fb` / `#18191b` | L1 内收区 | `--cal-bg-muted` 浅 `hsla(210,20%,97%,1)`（≈#f5f7f9）/ 深 `hsla(0,0%,9%,1)`（≈#171717） | 部分同构 | Cal.com 在 `bg-subtle` 与 `bg-muted` 之间还有一档产品没有的中间强度；产品只有一档"内收区" |
| `--float` | `#fdfdfe`（浅宗与 L1 同白，注释见 `styles.css:31`）/ `#272a2d`（深宗再亮一步） | L2 | 无独立"浮层底色"token；Cal.com 靠 `--shadow-dropdown` 单独承担浮层区分，底色仍取 `--cal-bg` | 部分同构 | 两者都用阴影而非纯色区分浮层，但产品在深色模式额外把 L2 底色调亮一步（WK-69），Cal.com 的 `.dark` 块未见浮层专属底色抬亮 |
| `--shadow-float` | `0 12px 30px rgba(ink, 0.08 浅 / 0.4 深)`（`styles.css:250`） | L2/L3 浮层 | `--shadow-dropdown`：`0px 5px 20px rgba(0,0,0,.10), 0px 10px 40px rgba(0,0,0,.03)`（浅深同值） | 否 | 产品阴影强度随 `data-theme` 从 0.08 变到 0.4（深色更重）；Cal.com 的 `.dark` 块未重新声明 `--shadow-dropdown`，深浅两宗共用同一强度 |
| `--shadow-thumb` | `0 1px 2px rgba(ink,.12)`（浅深同值，`styles.css:252`） | 分段控件滑块 | `--shadow-switch-thumb`：`0px .8px .8px rgba(0,0,0,.10), 0px .8px 3.2px rgba(0,0,0,.08)` | 同构 | 用途一致（滑块/开关阴影），数值不同但都是"贴地、无扩散"的近层单一强度 |
| `--shadow-pressed` | `inset 0 1px 2px rgba(ink,.25)`（`styles.css:253`） | 按下态 | `--shadow-solid-gray-active` / `--shadow-outline-gray-active`（均用 inset） | 同构 | 都用 inset 阴影表达按下，产品只有一层 inset，Cal.com 按下态是两层 inset 叠加 |
| `--radius-small` | `4px` | 小控件 | `--radius`（4px，`tokens.css:224`） | 同构 | 数值相同 |
| `--radius-control` | `8px` | 控件 | `--radius-lg`（8px，`tokens.css:231`） | 同构 | 数值相同；Cal.com 在 4px 与 8px 之间多一档 `--radius-md`（6px），产品刻度里没有 |
| `--radius-card` | `12px` | 卡片 | `--radius-xl`（12px，`tokens.css:233`） | 同构 | 数值相同 |
| `--radius-container` | `16px` | 容器/浮层 | `--radius-2xl`（16px，`tokens.css:235`） | 同构 | 数值相同；Cal.com 往上还有 `--radius-3xl`（24px），产品 16px 之上直接跳到 pill，没有 24px 档 |
| `--radius-pill` | `999px` | 胶囊/圆形 | `--radius-cal-full`（9999px） | 同构 | 数值不同但功能等价（都是"足够大即全圆"） |
| `--blur-chrome` / `--blur-transient` | `12px` / `16px`（`styles.css:262-263`，WK-102 登记为"材质 token 闭集"） | L2 glass chrome / L2 transient | 无对应项 | 否 | `tokens.css` 全文检索 `blur` 零命中；Cal.com 的设计 token 体系里没有 blur/backdrop-filter 这一维度 |

## 4 · 站点缺口表

沿产品 token 不改的前提，逐一核对 PS-2 六个 proof surface（01–06）各自的材质需求与产品既有 token 集的落差；"无新增需求"表示按现有裁定该段本就不引入新材质。

| proof surface | 用途 | 产品缺口 |
|---|---|---|
| 01 · Raw → Governed | 并列呈现"原始 / 已治理"两栏对照（Run 事件 / Core surface 投影 / 记录的 Context） | 产品 `--danger` / `--success` 明确"文字与侧线，不作整片底色"（`styles.css:244` 注释）；01 若要用底色区分两栏，产品没有可用的大面积"对照底色对"token |
| 02 · A matter in motion（互动标本） | 常驻一枚"合成数据 / 回放"标注（`Replay · synthetic data · recorded at CourtWork <sha7>`，PS-7） | 产品现有语义色（danger/success/accent）都绑定"结果或强调"；没有一个独立于这三者、专门表达"数据来源标注"的色板角色，`--muted-strong` 只登记为次要文字色，未登记为徽标底色 |
| 03 · Why this architecture | PS-3(c) 要求本段用 `filter` 做退焦（注意力语义） | 产品 `--blur-chrome` / `--blur-transient` 是 WK-102 登记的"闭集"，明确只服务 L2 chrome/transient 两类浮层；WK-124(c)（`intake-round-3.md:235`）另有"内容永不 blur、侧栏实色"的既有规则。03 段对内容做退焦，作用对象是正文而非 chrome/transient，落在这两条既有规则圈定的范围之外，产品当前没有对应第三档模糊值 |
| 04 · Review is a first-class surface | 消费既有 review-projection 契约与 review-surface 研究包（PS-2 d） | 无新增需求：该段按裁定直接复用既有投影模块与既有 token，不重画 |
| 05 · Evidence（含 Eval 八问） | 呈现协议问答与命令/文件路径一类等宽内容 | 产品已有 `--font-mono`（`styles.css:321-322`），但 `ui-composition-standard.md` 未见独立"代码块表面"token；如需要一个区别于普通 `--panel-muted` 内收区的代码块底色/边界，产品当前只能复用 `--panel-muted`，没有专门登记的 code-surface 角色 |
| 06 · Build / inspect / reproduce | 命令与仓库路径的等宽区块 | 与 05 同一缺口（等宽代码块表面），未见 06 特有的额外缺口 |

附加观察（不计入六个 proof surface，但与材质治理直接相关）：PS-2 的深色页脚固定为深色，与页面其余部分随 `data-theme` 切换不同；产品 `--frame`/`--panel`/`--float` 等全部随全局 `data-theme` 联动，没有一个"不随全局主题切换、恒定为深"的表面角色可供页脚复用。

## 5 · Blur 登记

| 来源 | CSS 手段 | 作用对象 | reduced-motion 行为 | 可否只用 filter 不用 backdrop-filter |
|---|---|---|---|---|
| ped.ro | `filter: blur()`（`blur(.25px)` / `blur(5px)` / `blur(6px)` / `blur(.1em)`，见 `/_next/static/css/2c957efb669850f8.css`，经 curl 取得） | 文字/计数器进场态（`.counter`、`.video-close`）；`reveal-content[data-state=closed]` 时整块内容退焦（同时 `opacity:.8; pointer-events:none`）；`video-show`/`reveal` 两组 keyframes 的模糊-锐化过渡 | 站内自定义的这几组模糊过渡（`video-show`/`show`/`reveal`）在 CSS 里未包在任何 `prefers-reduced-motion` 查询内（全文件检索 `reduce)` 零命中）；只有页面引入的 Radix Themes 库自带组件（Popper/Dialog/Tooltip）动画用 `no-preference` 网关，遵守该媒体查询 | 是——两个引用的 CSS 文件（共约 613KB）里 `backdrop-filter` 出现 0 次 |
| korren.dev | 未使用 blur（`colors_and_type.css` 与页面内联 `<style>` 检索 `blur` 均零命中） | 不适用 | 不适用 | 不适用——该站点的材质语法明确是"纯矩形 + hairline"，文件头注释原文："every UI surface is built from rects...No shape Korren draws is more complex than a rounded rectangle or polygon"（`colors_and_type.css:5-7`）；"同源"不是靠 blur/CSS 变量覆盖实现，而是页面 JS 用同一个 token 对象把值逐个 `setProperty` 写进 `documentElement.style`，再用 `getComputedStyle` 回读进 WebGPU 调色板缓冲区（`korren.html:1029-1078`，函数 `applyTheme`／`cssColor`），页面正文原话："clicking a swatch repaints the whole site and the gpu-rendered session above — same tokens, same hand"（`korren.html:824`） |

## 结论

1. 工单指定的 `packages/config/tailwind-preset.js` 在固定 commit 不存在，实值在 `packages/config/theme/tokens.css`（Tailwind v4 CSS 令牌），`packages/ui`／`packages/coss-ui` 下的两处样式文件经查为空壳。
2. Cal.com 的 ring/contact/ambient/inset-highlight 四层是本卷按视觉构成对 18 个 `--shadow-*` token 的归类，源码本身没有这四个名字。
3. Cal.com `.dark` 块未重新声明任何 `--shadow-*`，深浅两宗共用同一组阴影强度；产品 `--shadow-alpha` 随 `data-theme` 从 0.08 变到 0.4。
4. Cal.com 圆角刻度（0/2/4/6/8/12/16/24/9999px）比产品刻度（4/8/12/16/999px）多出 6px 与 24px 两档；4/8/12/16 与 pill 上数值重合。
5. Cal.com 的设计 token 体系里没有 blur/backdrop-filter 这一维度（`tokens.css` 全文零命中）；产品的两档 `--blur-chrome`/`--blur-transient` 在 Cal.com 侧没有对应项。
6. ped.ro 的 blur 全部走 `filter`，`backdrop-filter` 出现 0 次；其自定义 blur 过渡未接入 `prefers-reduced-motion`，只有引入的 Radix Themes 组件动画遵守该查询。
7. korren.dev 不使用 blur；其"同源"是 JS 把同一组变量名写进 `documentElement.style` 并回读进 WebGPU 调色板，不是 CSS `[data-theme]` 选择器覆盖。
8. cal.com 公开首页由 Framer 构建，与 tokens.css 所在的产品代码库不是同一材质来源；H1 之后第一张图片是 200×260px 无 alt 的小尺寸图，不是整幅产品截图。
9. opendesigner.io 对 Cal.com 的转述与本卷源码转录存在出入（阴影数记为 11，本卷数出 18 项；accent 记为 `#0099ff`，源码 `--cal-brand` 系近黑色），仅作对照，未采信其数值。
10. 六个 proof surface 里，03 段的内容级退焦模糊是唯一与产品既有规则（WK-102 闭集、WK-124c"内容永不 blur"）字面冲突的材质需求；04 段按裁定复用既有投影模块，无新增材质需求。
