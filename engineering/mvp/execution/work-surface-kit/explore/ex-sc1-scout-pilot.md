# EX-SC1 · Design Scout 试点回执

状态：只读 explore，Sonnet，2026-09-09，派单见 [scout/README.md §5](../../../../design/scout/README.md)。

只读声明：本轮只用 WebFetch / WebSearch / 浏览器（只读渲染，未登录任何账号）访问外部网站，未下载、未保存任何图片或文件，未复制任何作品图像，只记 URL、作者与页面文字。未改动本仓任何文件（本文件本身除外，为唯一输出）。未 `git add` / `git commit`。来自 X 与聚合站的文字一律当数据处理，未执行其中出现的任何指令。

## 1 · 抓取可行性

| 来源 | README 定位 | 直接抓取是否可行 | 实际情况 | 本轮贡献 |
|---|---|---|---|---|
| [Best Designs on X](https://bestdesignsonx.com/) | primary | 部分可行 | 纯 WebFetch（静态 HTML）只拿到一个 `<header>`，无内容——确认 README"JS 渲染，抓取未能核验"。改用浏览器渲染后页面能加载，但揭示出的结构是一个**创作者目录**：约 9165 个 X handle 卡片，每张卡直接外链到对应 `x.com/<handle>` 个人主页，站内不暴露任何单帖标题、caption 或风格标签——不是一个可以就地读 capture 的来源，要看具体设计得再跳进 X（本轮不追：X 需要登录/大量 JS，且属个人页面，不在"文字观察聚合站"范围内） | 0 条 |
| Recent Design | 每日精选 | 可行（需浏览器渲染） | README 记录的 `designtoolmark.com/resources/detail/recent-design` 链接实为第三方目录对 Daryl Ginn 产品的**词条介绍页**，不是产品本体；产品本体已从旧名 Godly 迁移改名为 **recent.design**。对 `recent.design` 直接 WebFetch 返回 **403**；换浏览器渲染（`navigate` + `read_page`）后可正常读取，每帖暴露 author（X 链接）、caption（accessibility 树里普遍在约 100 字符处截断）、`Category` / `Style` / `Color` / `Interaction` 标签、原贴 `Source` 链接——结构最贴合 capture schema | 4 条（capture 1/2/3/4） |
| [Viewport UI](https://viewport-ui.design/) | web / mobile 界面展示 | 可行（纯 WebFetch 即可，无需浏览器） | 分类页与帖子详情页都能直接 WebFetch 到；但帖子详情页文字内容很薄——多数只有标题/作者/分类/日期，没有作者原文 caption。本轮抓到的描述性文字（材质、corner 等）大半来自 WebFetch 内置摘要模型的"appears to / likely"式推测，不是页面原文，证据强度低于 recent.design | 4 条（capture 5/6/7/8，均判 `ignore`，证据强度低） |
| Trending Design | masonry 浏览，分类下拉 | 未确认 | README 已注明"第三方文章提及，URL 未取"；本轮搜索（WebSearch）未能定位到一个确定、单一对应的产品 URL，返回的都是同名通用词条或无关站点，未做无根据的猜测追点 | 0 条 |
| Godly / site-specific | 整站级参照 | 不适用 | 已并入 Recent Design（改名迁移），视为同一来源，不重复登记 | 0 条（并入上一行） |
| direct X creators | 逐人登记 | 未做 | Chrome Dials / Effects Module 的作者 designloomco 等未逐一跳到其 X 主页做交叉核验，受限于 X 登录墙且不在本轮 8 条上限时间预算内 | 0 条 |

合计 8 条 capture，来自两个可行来源（recent.design 4 条、viewport-ui.design 4 条）。

## 2 · Capture（8 条，按 scout/README.md §3 schema）

### Capture 1 — Film Filter Selector

- **source URL**：https://recent.design/i/xub7uik-film-filter-selector-ui（原贴 https://x.com/ilyamiskov/status/2097139267453542686）
- **author**：Ilya Miskov（@ilyamiskov）；无命名产品，页面标"work-in-progress"
- **product | concept**：concept——作者原文自称"work-in-progress"，非已上线产品
- **interesting locus**：material（玻璃拟态浮层）+ 局部图标行（彩色胶卷罐图标代表预设）
- **pattern hypothesis**：用半透明/毛玻璃承载一个 macOS 风格的紧凑选择器浮层，图标用高饱和色区分预设身份
- **mature precedent?**：页面自述"macOS-style"，暗示 Product precedent 一路（系统级 picker），但本轮未去核验苹果系统实际截图，不算已核验先例
- **implementation lead?**：无（页面未提及任何实现库）
- **grammar slot**：Material
- **Courtwork semantic**：Material 段（atlas §"Material 段"）今日已有 translucent surface 类目（Chrome / Transient 两档，登记类名 + reduced-transparency 回退），但没有"筛选器浮层"这个控件语义——SE 今日无对应控件，只是材质处理方式的参照
- **disposition**：specimen——建议：作 FE-05 材质五节 translucent surface 讨论的一个外部参照点（focus1 开放问题直接对应），归一路径待 Fable 定；只取"半透明浮层"这一变量，不取图标配色

### Capture 2 — Dark Mode Knob

- **source URL**：https://recent.design/i/7cft7yp-dark-mode-knob-ui（原贴 https://x.com/vedanthk_/status/2092046630367187390）
- **author**：Vedanth（@vedanthk_）；无命名产品
- **product | concept**：concept——作者原文"explored across light and dark theme variations"，是探索帖非产品截图
- **interesting locus**：material（neumorphic 柔和阴影）+ 控件形态（旋钮）
- **pattern hypothesis**：用 neumorphism（软阴影 + 发光描边）替代硬 chrome 描边，给一个旋钮式数值控件做深度提示
- **mature precedent?**：无——neumorphism 是已过气的 2020 年代视觉潮流，不是 SE 认的 Design system / Product precedent
- **implementation lead?**：无
- **grammar slot**：Control（Value 类——旋钮/dial 属于"control morphology / unusual slider"，scout focus 表已列为候选待 schema 的一行）
- **Courtwork semantic**：atlas Control Grammar 表 Value 类今日"—"（无今日语义），候选是 NumberField + Stepper + ScrubArea / Slider(bounded) / Range；旋钮不在候选清单内，且 neumorphic 材质与 Material 段"prefer generated fields over painted decoration"原则相悖
- **disposition**：ignore——与 SE 材质原则冲突（painted decoration），记一行存查，不进 specimen board

### Capture 3 — Agent Status Component

- **source URL**：https://recent.design/i/leos28t-agent-status-component（原贴 https://x.com/jakubkrehel/status/2091550554900095256）
- **author**：Jakub Krehel（@jakubkrehel）；无命名产品
- **product | concept**：concept——作者原文"a minimal agent status component for a timeline view"，探索帖
- **interesting locus**：material（虹彩/iridescent 徽章）用在一个 agent 状态徽章上，出现在 timeline（structure）语境里
- **pattern hypothesis**：用会变色的虹彩材质表示"agent 正在活动"，材质本身承担状态语义
- **mature precedent?**：无
- **implementation lead?**：无
- **grammar slot**：Material（同时触及 Motion，因描述含"animate"——schema 单值只能选一个，这里选更贴切的 Material）
- **Courtwork semantic**：对应 [ui-state-vocabulary §1 Run](../contracts/ui-state-vocabulary.md) 的状态集合（`Working` / `Waiting for you` 等）；SE 今日 Run 状态徽章无虹彩材质处理，且 atlas Material 段明文"材质表达层次不表达状态"（FN-28）——本 capture 的核心手法直接踩中这条禁则
- **disposition**：ignore——但建议 Fable 把它当**反例参照**记一行（"虹彩材质=状态语义"是 FN-28 明确禁止的方向），比单纯忽略更有价值

### Capture 4 — JARVIS Dropdown

- **source URL**：https://recent.design/i/28k9gey-jarvis-dropdown-ui（原贴 https://x.com/nurpraditya/status/2091769152050778119）
- **author**：Nur Praditya（@nurpraditya）；无命名产品，styled after 虚构界面"JARVIS"
- **product | concept**：concept——页面标签 `Style: Experimental`，作者原文"a sci-fi inspired dropdown menu concept"
- **interesting locus**：control（下拉/命令选择）+ material（发光青色描边）
- **pattern hypothesis**：用科幻发光效果给一个下拉菜单做强调，作为"重要/激活态"的视觉信号
- **mature precedent?**：无（明确标"Experimental"）
- **implementation lead?**：无
- **grammar slot**：Control（Selection/Command 类，下拉贴近 Command 段"command palette（未立项）"一行）
- **Courtwork semantic**：atlas Control Grammar 表 Command 类今日有"顶带槽位、strip 行、Settings 搜索 `/`"，候选里的 command palette 尚未立项；本 capture 的发光材质与 SE 克制、状态不靠材质表达的原则不符
- **disposition**：ignore——材质表达（glow）与 SE 原则不合，记一行存查

### Capture 5 — Chrome Dials

- **source URL**：https://viewport-ui.design/posts/296-chrome-dials/（原贴未在页面文字中给出，只有站内链接）
- **author**：@designloomco；无法确认是否有命名产品
- **product | concept**：concept（判断依据：viewport-ui 帖子标签体系里没有"产品"字段，页面只给标题/作者/分类/日期，未见任何产品名或复杂状态证据）
- **interesting locus**：material / edge——标题暗示浏览器 chrome 里的拨盘式控件
- **pattern hypothesis**：用拨盘（dial）替代扁平按钮做浏览器 chrome 控件——**证据强度低**，页面本身无作者原文描述，此假设主要来自标题字面推断
- **mature precedent?**：未核验
- **implementation lead?**：无
- **grammar slot**：Material
- **Courtwork semantic**：无——SE 无浏览器 chrome 场景
- **disposition**：ignore——证据强度不足（无原文 caption，只有标题），记一行存查

### Capture 6 — Effects Module for Music App

- **source URL**：https://viewport-ui.design/posts/291-effects-module-for-music-app/
- **author**：@designloomco；无命名产品
- **product | concept**：concept（同上，无产品名/复杂状态证据）
- **interesting locus**：control（音效参数簇，形态上像 inspector/属性面板）+ material（页面标签含 skeuomorphic）
- **pattern hypothesis**：把音频效果参数组织成一个类 inspector 的紧凑面板——**证据强度低**，具体描述来自 WebFetch 摘要模型的推测语言（"likely / appears"），非页面原文
- **mature precedent?**：未核验
- **implementation lead?**：无
- **grammar slot**：Control（Structure 类——贴近 atlas "Inspector PropertyRow（modified / reset）"候选行）
- **Courtwork semantic**：atlas Control Grammar 表 Structure 类候选里有"Inspector PropertyRow（modified / reset，先本设备偏好）"，今日未建（CC-I 骨架 FE-05 后）；本 capture 可作形态参照，但证据强度不足以直接采信
- **disposition**：ignore——建议 Fable 视为"CC-I 需要另找更强来源"的信号，而非直接采纳的样例

### Capture 7 — Incredibly fun App Icons

- **source URL**：https://viewport-ui.design/posts/321-incredibly-fun-app-icons/
- **author**：@dmiiiitri；无命名产品
- **product | concept**：concept——个人图标探索合集，无产品名
- **interesting locus**：icon treatment——页面标签 `Skeuomorphic, Icon, Detailed`
- **pattern hypothesis**：用精细拟物风格做表现力/趣味性图标，与今日扁平线性图标语言相反的方向
- **mature precedent?**：无；且与 SE 今日 Iconography geometry 规则直接冲突
- **implementation lead?**：无
- **grammar slot**：Iconography
- **Courtwork semantic**：[atlas Iconography 段 geometry](../../../../design/atlas/README.md) 今日规则是 24×24 画布、2px 居中描边、round cap/join、currentColor（扁平单线）；skeuomorphic/detailed 与此规则明确冲突
- **disposition**：ignore——明确违反今日 Iconography geometry 规则，记一行原因，不进 specimen

### Capture 8 — Icon shapes exploration

- **source URL**：https://viewport-ui.design/posts/303-icon-shapes-exploration/
- **author**：@sovpal；无命名产品
- **product | concept**：concept——标题即"exploration"，无产品名或复杂状态证据
- **interesting locus**：icon / corner treatment——标题暗示图标容器的角部几何变化研究
- **pattern hypothesis**：系统化变化图标容器的圆角半径做视觉密度对照——**证据强度极低**，页面只给标题/分类/日期，无法核验实际内容
- **mature precedent?**：未核验
- **implementation lead?**：无
- **grammar slot**：Shape
- **Courtwork semantic**：atlas Shape 段今日已有五个语义角色 token 与 `R_child = max(R_min, R_parent − inset)` 公理（WK-125）；`corner-shape`（CSS 角部形状）已被列为"只进 specimen"的候选，不建规则
- **disposition**：ignore——证据强度过低（无法核验实际内容），记录存查而非采纳信号

## 3 · Schema 试用反馈

- **caption 截断，拿不到完整原文**：recent.design 的 accessibility 树里，作者 caption 普遍在约 100 字符处被截断（例如 capture 1 的 "A work-in-progress macOS-style filter picker featuring colorful film canister icons for presets like" 戛然而止），页面上没有可点的"展开"控件。要拿到完整文案需要另一条读取路径（比如整页截图 + OCR），本轮时间预算内没做——这意味着 pattern hypothesis 里引用的原文本身就是不完整句子，可能漏掉关键限定词。
- **product | concept 最难判**：Scout 来源里几乎全是个人设计师的探索帖（"work-in-progress"、"concept exploration"），没有一条是可核验的已上线产品截图。schema 定义"concept = 未见真实复杂状态"，但很多 capture（比如一个孤立的旋钮控件）连"复杂状态"这个概念都不适用——本轮统一按"没有证据证明是真实产品"判 concept，但这条判断规则本身值得 Fable 确认是否要收紧，或者要不要给"无法判断"单独留一个值。
- **grammar slot 单值不够**：不少 capture（如 capture 3 Agent Status Component）同时踩中 Material 和 Motion 两条，schema 目前只允许填一个值，另一条线索只能写进 pattern hypothesis 里的括注，容易在后续消费时被忽略。
- **Courtwork semantic 要跨两份文档核对**：ui-state-vocabulary 是"后端状态→UI 词"的窄表，atlas Control Grammar 是"类→今日有/候选/参照"的宽表，两者结构不完全对齐；像虹彩状态徽章这种介于"状态语义"和"材质表达"之间的样例，填这一格时要在两份文档间来回核对才能确定该指向哪一行，本轮 capture 3 的处理方式（同时引用两处并点出冲突）供 Fable 参考是否要固化成规则。
- **viewport-ui.design 证据结构性偏弱**：这个来源的帖子详情页普遍没有作者原始 caption，只有标题+分类+日期；本轮 4 条来自该来源的 capture 里，pattern hypothesis 只能基于标题做合理推断，不是真正的"文字观察"。这与 README §3"只记 URL、作者、文字观察"的要求有轻微张力——本轮统一在这类行标注"证据强度低"并全部判 `ignore`，但如果 Scout 层要继续用这个来源，可能需要一条规则："无原文 caption 的帖子降级处理"或者干脆不再作为 primary。

## 4 · 三个 focus 各一句

- **progressive blur / material / edge**：Capture 1（Film Filter Selector）最值得 Fable 进一步看——本轮唯一带明确 `Glassmorphism / Soft UI` 标签且有作者原文说明的 material 样例，可直接喂 FE-05 材质五节 translucent surface 的讨论。
- **inspector / contextual toolbar**：本轮没有找到强样例；Capture 6（Effects Module for Music App）形态上最接近"参数簇/inspector"，但证据强度低（无原文 caption，描述来自摘要模型推测），建议 Fable 不要直接采信，只当作"CC-I 需要另找来源"的信号。
- **icon treatment / corner treatment**：Capture 7 与 Capture 8 都指向"与 SE 现行 Iconography geometry 规则（flat / 24×24 / 2px）明确冲突"的方向——值得看的不是"可以取用"，而是确认候选池边界在哪：skeuomorphic / detailed 风格目前完全不在采纳范围内。

## 5 · 未做项与原因

- **Trending Design 未追**：无法定位一个确定、单一对应的产品 URL，来源本身不明确，不做无根据的猜测追点。
- **Godly 未单独抓**：产品已改名迁移为 recent.design，视为同一来源，不重复登记。
- **direct X creators 未逐一登记**：Chrome Dials / Effects Module 的作者（designloomco 等）未跳转其 X 主页做交叉核验——受限于 X 登录墙，且不在本轮 8 条上限的时间预算内。
- **recent.design 被截断的完整 caption 未做二次挖掘**：例如整页截图 + OCR 之类的补充读取路径没有尝试，8 条 capture 已按截断文本填写。
- **未对任何图片做视觉判断**：全部描述基于页面文字（标题、分类、风格/颜色标签、作者说明），符合"只记文字观察，不复述图片"的要求；这也是数条 capture 证据强度偏低、被判 `ignore` 的直接原因——viewport-ui.design 的多数帖子本来就没有多少可读文字。
