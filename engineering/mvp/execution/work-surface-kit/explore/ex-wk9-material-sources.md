# EX-WK9 · 材质规范来源转录

状态：**带溯源索引**（部分行为直接转录值，部分行——尤其 Apple HIG Materials 静态页——仅取得检索摘要，未取得一手正文，故整卷降级标"带溯源索引"而非"直接可消费"；凡标注"经检索摘要，非一手页面直取"的行，可信度低于同表其余行，FE-05 取值时应加权更低或另行核实）。Sonnet，只读 explore，2026-09-09。

只读声明：本卷全程只用 WebFetch / WebSearch 读取工单指定的外部来源，以及 Read 只读本地 `app/web/styles.css`；未修改任何文件，未启动任何服务，未读取任何本地数据目录或凭据文件，未访问需要登录的页面。

访问日：以下全部外部来源访问日均为 **2026-09-09**（Radix Themes Shadows 一行除外，见下，沿用既有登记未重新访问）。

WebFetch 说明：本工具对页面做"抓取 → 转 Markdown → 小模型按 prompt 摘要"处理，返回的引号内文字是工具给出的转写而非人工逐字比对原始 HTML 的结果；本卷标"一手直取"的行是指 WebFetch 成功读到该页面正文（而非仅标题壳或 404），但仍建议 Fable 在写入 FE-05 工单前对关键引文做一次人工核对。

未能取得一手正文的 URL（未在下表中当作已核实来源引用其原文，只作检索摘要参照或列为未访问）：

- `https://developer.apple.com/design/human-interface-guidelines/materials` —— WebFetch 只取得页面 `<title>`（"Materials | Apple Developer Documentation"），客户端渲染页无正文，同 EX-WK3 此前遇到的情况。
- `https://developer.apple.com/design/human-interface-guidelines/foundations/materials/` —— 404。
- `https://developer-mdn.apple.com/design/human-interface-guidelines/foundations/materials/` —— WebSearch 命中的第三方镜像域名（非 `developer.apple.com` 官方域），按工单"只访问官方页面"要求未访问，只在 §2 表1 标注其检索摘要来自公开搜索结果本身，不引用该镜像站正文。
- `https://learn.microsoft.com/en-us/windows/apps/design/style/materials` —— 404（工单给出的猜测路径；实际概览页应为 `.../design/signature-experiences/materials`，本卷未访问，列为未访问）。
- `https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency` 的 Browser compatibility 小节表格本体 —— 两次 WebFetch 均在该小节前截断，只取得规范状态文字（"Limited availability"/"Experimental"），未取得逐浏览器版本表；改以 caniuse 对应词条页作为浏览器支持数据来源（见 CI1），两来源非同一份数据，未交叉核对到逐行一致。
- `https://www.radix-ui.com/themes/docs/theme/shadows` —— 按工单"只登记行，不再摘录"，本卷未重新访问；沿用 `engineering/design/surface-hierarchy.md:44` 与 `:82` 的既有登记（含固定 SHA 源码）。

---

## 1. 溯源索引行（体例 §3）

```
LG1 · https://developer.apple.com/videos/play/wwdc2025/219/（WWDC25 "Meet Liquid Glass"）· 2026-09-09 · Apple 官方内容，页面未见独立开放许可声明 · REFERENCE · 转录到 本卷 §2 表1
LG2 · https://developer.apple.com/videos/play/wwdc2025/356/（WWDC25 "Get to know the new design system"）· 2026-09-09 · 同上 · REFERENCE · 转录到 本卷 §2 表1
HIG1 · https://developer.apple.com/design/human-interface-guidelines/materials · 2026-09-09 · Apple 官方文档，未见独立开放许可声明 · REFERENCE（经检索摘要，非一手页面直取，见上）· 转录到 本卷 §2 表1
HIG2 · https://developer.apple.com/design/human-interface-guidelines/foundations/materials/ · 2026-09-09 · 不适用（404，未取得正文，未引用）· 未消费
MS1 · https://learn.microsoft.com/en-us/windows/apps/design/style/mica · 2026-09-09 · Microsoft 官方文档，页面未见独立许可声明 · REFERENCE · 转录到 本卷 §2 表2
MS2 · https://learn.microsoft.com/en-us/windows/apps/design/style/acrylic · 2026-09-09 · 同上 · REFERENCE · 转录到 本卷 §2 表2
MS3 · https://learn.microsoft.com/en-us/windows/apps/develop/ui/in-app-acrylic · 2026-09-09 · 同上 · REFERENCE · 转录到 本卷 §2 表2（TintOpacity / TintLuminosityOpacity / FallbackColor 属性名与示例值）
MDN1 · https://developer.mozilla.org/en-US/docs/Web/CSS/@media/prefers-reduced-transparency · 2026-09-09 · MDN 内容按站点惯例 CC0（正文）/ CC-BY-SA（历史版本），本次抓取未逐一核实页脚声明 · REFERENCE（规范状态部分一手；浏览器兼容表未取得，见上）· 转录到 本卷 §2 表3
CI1 · https://caniuse.com/mdn-css_at-rules_media_prefers-reduced-transparency · 2026-09-09 · caniuse 数据按站点惯例 CC-BY 4.0，本次抓取未逐一核实 · REFERENCE · 转录到 本卷 §2 表3
RDX1 · https://www.radix-ui.com/themes/docs/theme/shadows · 沿用既有访问日（本卷未重新访问，见 surface-hierarchy.md:44/:82 的固定 SHA 源码登记）· MIT（沿 EX-WK3 R4 核实）· REFERENCE · 已消费，转录到 engineering/design/surface-hierarchy.md:44, :82（本卷不再摘录）
```

## 2. 转录值表

### 表1 · Apple HIG Materials / Liquid Glass（WWDC25）

| 项目 | 取值 / 原句 | 来源与段落 |
|---|---|---|
| 功能层定义 | Liquid Glass 是独立于内容层的"功能层"，专供 navigation / controls（如 tab bar、sidebar），悬浮于内容之上，与内容层建立清晰视觉层级 | HIG1，经检索摘要："Liquid Glass forms a distinct functional layer for controls and navigation elements — like tab bars and sidebars — that floats above the content layer, establishing a clear visual hierarchy between functional elements and content." |
| 禁止：内容层用 glass | 禁止，一手确认 | LG1 原文："Avoid putting glass in the content layer and avoid putting within or on top of other glass elements to maintain hierarchy and prevent clutter." 另有同向表述："Liquid Glass is best reserved for the navigation layer that floats above the content of your app... making it Liquid Glass would make it compete with other elements and muddy the hierarchy. So keep it in the content layer instead"（此句语境为讨论某具体控件应留content层用普通material，与前句同一方向） |
| 禁止：glass-on-glass | 禁止，一手确认（见上引同句，"avoid putting within or on top of other glass elements"）；HIG1 检索摘要另给一句同向措辞："Avoid layering Liquid Glass elements directly on top of each other, as it creates unnecessary visual complexity. If there is glass on the content layer it will collide into the navigational layer." | LG1 一手 + HIG1 检索摘要（两来源方向一致，独立互证） |
| 材质构成分层（闭集） | 一手确认命名的层：**Highlights**（响应几何、随交互移动光影定义轮廓）、**Shadow**（阴影不透明度随背后内容动态变化：压在文字上更深、压在纯色浅背景上更浅）、**Lensing / Refraction**（官方称为"主要视觉自我定义方式"：动态弯曲、塑形、聚集光线，取代旧材质的散射光）、**Glow**（交互时从触点向外扩散并联动周围 Liquid Glass 元素）、**Tint**（按内容明度动态映射色调范围，类比真实有色玻璃）。工单预期的 "sampling" / "blur" 未在本次 WebFetch 摘要中被单独点名为一个层（"letting content shine through underneath it" 暗示取样但未见"sampling"或"blur"作为独立命名层出现），未公开独立层名，不臆测为存在 | LG1，多处直接引用见上；"sampling/blur 未单独命名"为本卷核实结论，非未公开数值类推测 |
| "控件大则更厚"是否官方表述 | **是，官方原文确认** | LG1 原文："When glass flexes and morphs to larger sizes – like when presenting a menu from a toolbar button – its material characteristics change to simulate a thicker, more substantial material. It casts deeper, richer shadows, has more pronounced lensing and refraction effects, and a softer scattering of light." |
| "hierarchy 应首先由 layout 和 grouping 表达"原句出处 | **WWDC25 356（"Get to know the new design system"），非 219** | LG2 原文："Instead of relying on decoration, hierarchy should be expressed through layout and grouping." 同 session 另一相关句："A systematic approach means designing with intention at every level, ensuring that all elements, from the tiniest control to the largest surface, are considered in relation to the whole."（对应工单"从最小 control 到最大 surface 都要相对于整体系统设计"一句的来源） |
| Reduce Transparency 对 Liquid Glass 的行为 | **一手确认**：使材质"更霜化"并遮住更多背后内容，不是切换为纯色 | LG1 原文："Reduced Transparency, makes Liquid Glass frostier and obscures more of the content behind it." 同段落另两个可用作对照的无障碍修饰符（非本工单必取项，登记备查）：Increased Contrast——"makes elements predominantly black or white and highlights them with a contrasting border"；Reduced Motion——"decreases the intensity of some effects and disables any elastic properties for the material"；三者均"自动生效，系统级开关一开，所有 Liquid Glass 元素统一响应"（"These are available automatically... whenever these settings are turned on at a system-level, Liquid Glass elements will get them across the board."） |

### 表2 · Microsoft Fluent 2 / WinUI Materials

| 项目 | 取值 / 原句 | 来源与段落 |
|---|---|---|
| Mica 适用面 | 长期存在的应用背景/前景层（app、settings 窗口），含标题栏；只采样一次桌面壁纸（性能优化）；失焦时回退中性色帮助聚焦当前任务 | MS1 一手："Mica is an opaque, dynamic material that incorporates theme and desktop wallpaper to paint the background of long-lived windows..."；"the material helps users focus on the current task by falling back to a neutral color when the app is inactive." |
| Mica Alt | Mica 变体，桌面色调更强，适合带标签页标题栏，用于比 Mica 更深的层级区分 | MS1 一手 |
| Acrylic 适用面 | 仅用于 transient / light-dismiss 面（flyout、context menu、非模态弹层、AutoSuggestBox / ComboBox 等自带 acrylic 的控件）；in-app acrylic 另可用于会与滚动内容重叠的"支持性 UI"（如可折叠导航面板），大面积背景不建议用 acrylic | MS2 一手："we recommend that you use background acrylic [for] context menus, flyouts, non-modal popups, or light-dismiss panes..."；"Don't put desktop acrylic on large background surfaces of your app." |
| 官方 Acrylic 参数（tint opacity / luminosity opacity / blur 半径） | **属性名公开，默认数值未公开**：`TintColor`、`TintOpacity`、`TintLuminosityOpacity`、`FallbackColor` 为可设属性；若不指定 `TintLuminosityOpacity`，系统按 `TintColor`/`TintOpacity` **自动计算**（未给出该计算的具体公式或系统默认基线数值）。示例代码中出现的 `TintOpacity="0.8"`、`TintLuminosityOpacity="0.5"`、`TintOpacity = 0.6`（C#）均为**自定义红色品牌示例值**，官方明确这是"自定义"用法示范，不是 Acrylic 的默认/推荐数值。**blur 半径（像素）全程未公开**，两页均未给出数值 | MS3 一手：属性定义段 + XAML/C# 示例代码块；"If you don't specify a `TintLuminosityOpacity` value, the system will automatically adjust its value based on your TintColor and TintOpacity." |
| 多层 Acrylic 警告原文 | 两处独立警告，方向一致，措辞不同 | MS2 一手：（1）"Avoid layering multiple acrylic surfaces: multiple layers of background acrylic can create distracting optical illusions."（2）"Don't place multiple acrylic panes next to each other because this results in an undesirable visible seam." |
| Acrylic Fallback 色规则 | 高对比模式下用用户选定的纯色替代；关闭"透明效果"、Battery Saver、低端硬件三种情况下 background 与 in-app acrylic 均变纯色；额外地，仅 background acrylic 在**窗口失焦**、或运行于 Xbox / HoloLens / 平板模式下也变纯色（in-app acrylic 不受此额外条件影响） | MS2 一手，"Usability and adaptability" 小节列出的两组条件（见原文条列） |
| Mica Fallback 色规则 | 高对比模式下用户选定纯色替代；关闭透明效果、Battery Saver、低端硬件、**窗口失焦**、Windows 版本低于 22000 五种情况下均回退为纯色（Mica 用 `SolidBackgroundFillColorBase`，Mica Alt 用 `SolidBackgroundFillColorBaseAlt`） | MS1 一手，"Usability and adaptability" 小节 |

### 表3 · `prefers-reduced-transparency`

| 项目 | 取值 | 来源 |
|---|---|---|
| 规范状态 | CSS Media Queries Level 5 草案特性；MDN 标注 "Limited availability"（非 Baseline，因主流浏览器未全面支持）、"Experimental" | MDN1，规范状态段落一手可读（浏览器兼容表本体未取得，见卷首"未访问"清单） |
| Chromium（Chrome / Edge） | 118 及以上版本支持；117 及以下不支持 | CI1（caniuse，访问日 2026-09-09） |
| Firefox | 113–158 区间标注"默认关闭"（需手动开启 flag，非开箱可用），未见标注为完整支持 | CI1 |
| WebKit（Safari 桌面 / iOS） | 桌面 Safari 3.1–27 与 iOS Safari 3.2–26.6 均标注不支持；Safari Technology Preview 标注"支持状态未知" | CI1 |
| 全球可用覆盖率 | caniuse 页面工具摘要给出约 75.4%（该数字为 WebFetch 摘要工具给出，未在原始表格逐行核对，建议 Fable 需要精确数字时直接人工打开 caniuse 页面复核） | CI1 |

## 3. 本地对照：`app/web/styles.css` 材质 token 与两处 `backdrop-filter`

文件：`/private/tmp/se-fable-r4b/app/web/styles.css`（sha256 `62536da9bd08de9856d20112ca1fbc39df741dd11435ccd298333d7d828e712a`，只读，未改动）。

材质 token 现状（`:root` 附近，浅/深/两套备用主题四段重复定义同名变量，行号为浅宗基础段）：

| token | 行:值（浅宗基础段） | 备注 |
|---|---|---|
| `--glass` | styles.css:254 `rgba(var(--alpha-paper), var(--glass-alpha))` | |
| `--glass-muted` | styles.css:255 `rgba(var(--alpha-paper), var(--glass-alpha))` | 与 `--glass` 引用同一个 `--glass-alpha` 变量，当前**数值上不可区分**（同色同透明度），观察项，不下裁定 |
| `--glass-alpha` | styles.css:38（浅宗 0.86）/ :75（深宗 0.1）/ :109（备用深宗 0.1）/ :149（备用浅宗 0.86）/ :181（备用深宗 0.12）/ :215（备用深宗 0.12） | |
| `--rim` | styles.css:256 `inset 0 0 0 1px rgba(var(--alpha-paper), var(--rim-alpha))` | |
| `--rim-alpha` | styles.css:39 / :76 / :110 / :150 / :182 / :215 附近（同 `--glass-alpha` 分布模式） | |
| `--shadow-float` | styles.css:250 `0 12px 30px rgba(var(--alpha-ink), var(--shadow-alpha))` | |
| `--shadow-alpha` | 未在本次 grep 命中独立赋值行，`--shadow` 于 styles.css:251 别名到 `--shadow-float` | 未核实其数值定义具体行，超出工单要求的四项 token 外 |
| `--blur-chrome` / `--blur-transient` | **不存在**，全文件 grep 未命中 | 两处 blur 目前是字面量 `12px` / `16px(+saturate)`，与 WK-102 待办一致 |

两处 `backdrop-filter`（行号精确到 `-webkit-` 前缀行与标准行两行）：

| 表面 | file:line | 现有取值 | WK-69 四层 | WK-101 六层 | 判定 |
|---|---|---|---|---|---|
| `.jump-latest-button` | styles.css:1250–1251（`-webkit-backdrop-filter` / `backdrop-filter`），同规则块 background 见 :1249、box-shadow 见 :1253 | `background: var(--glass)`；`blur(12px)`；`box-shadow: var(--rim), var(--shadow-float)` | L2 float（悬浮控件） | Chrome（WK-101 原文列为"已是"Chrome 层示例）；blur 12px 与 WK-102 拟定的 `--blur-chrome` 12px 数值一致 | **不越层**；token 组合（`--glass` + `--rim` + `--shadow-float`）符合 Chrome 层定义；**无回退**——全文件 grep 未命中任何 `prefers-reduced-transparency`，与 WK-102"FE-01 第 0 项"登记的缺口一致 |
| `.context-popover` | styles.css:2243–2244（`-webkit-backdrop-filter` / `backdrop-filter`），background 见 :2242、box-shadow 见 :2246 | `background: var(--glass-muted)`；`blur(16px) saturate(1.4)`；`box-shadow: var(--rim), var(--shadow-float)` | L2 float（悬浮/覆盖控件） | Transient（popover）；blur 16px 与 WK-102 拟定 `--blur-transient` 16px 一致；`saturate()` 只出现在此处，符合 WK-102"saturate() 只在 transient"的现状描述 | **不越层**；token 组合符合 Transient 层定义；**无回退**——同上，未命中 `prefers-reduced-transparency` |

未核实项：是否存在运行时 glass-on-glass（例如 context-popover 在 Chrome 层 glass 元素之上打开时二者是否叠加）需要 DOM/运行时状态核实，本卷只读静态 CSS，未验证；两处 blur 均为字面量而非 `--blur-chrome`/`--blur-transient` 变量，是否属于"越层"以外的另一类缺口（token 化缺口）由 Fable 判断是否登记。

## 4. 结论（观察，不下裁定）

1. Apple 侧一手来源集中在 WWDC25 两场 session（219、356），均可直接 WebFetch 取得文字记录；HIG Materials 静态页两次尝试均未取得一手正文（一次仅标题壳、一次 404），本卷 Apple 侧结论以 WWDC 两场为主。
2. "控件大则更厚"确有官方原文（WWDC25 219），WK-101 对此项"不采"是主动选择而非该提法不存在。
3. "hierarchy 应首先由 layout 和 grouping 表达"原句确认出自 WWDC25 356，非 219，且与"从最小 control 到最大 surface 相对于整体系统设计"同段落。
4. 内容层禁止 glass、禁止 glass-on-glass 有 WWDC25 219 一手原文与 HIG1 检索摘要两条独立来源，方向一致。
5. Reduce Transparency 对 Liquid Glass 的行为是"更霜化、遮更多背景"，不是切纯色回退；这与 Fluent Acrylic/Mica"关闭透明后切纯色 FallbackColor"的机制不同，两家在这一点不等价。
6. Fluent Acrylic 的 TintOpacity / TintLuminosityOpacity 只是可设属性名，官方未公开默认数值（未指定时系统自动计算，公式未公开）；文档示例中的 0.8/0.5/0.6 是自定义品牌色示例，非默认值；blur 像素半径全程未公开。
7. Mica／Acrylic 适用面表述明确一手可信：Mica 供长期背景/前景层，Acrylic 仅供 transient 或有限的 in-app 支持性面；两官方页各自独立给出"不要多层堆叠 Acrylic"的警告。
8. `prefers-reduced-transparency` 为 CSS Media Queries Level 5 草案，MDN 标"Limited availability"；caniuse 显示 Chrome/Edge 118+、Firefox 默认关闭、Safari 桌面与 iOS 均不支持。
9. 本地两处 `backdrop-filter`（1250–1251 与 2243–2244）在 token 组合与 blur 数值上均与 WK-69/WK-101/WK-102 拟定映射一致、不越层；但全文件未命中任何 `prefers-reduced-transparency`，两处均无回退，与 WK-102"FE-01 第 0 项"登记吻合。
10. `--glass` 与 `--glass-muted`（styles.css:254–255）当前共用同一 `--glass-alpha` 变量，两个 role 数值不可区分；`--blur-chrome`/`--blur-transient` 变量尚不存在，两处 blur 为字面量，均为观察项。
