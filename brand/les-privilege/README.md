# les Privilege

`les Privilege` 是本包登记的对外署名与拟设厂商名称，大小写、空格和拼写固定。`lesPrivilege` 只作 handle；`le` 只作图形标记。图形、名称、Paper 作品和 Paper 作者是不同对象，不能互相替代。

## 当前坐标

当前几何坐标固定在 Astra 的 `146e072ce0c4f7d52adeecbdf670ef2d15f31b56`。本轮隔离 intake worktree 把 manifest 的 `revision` 保持为 `optical-03`，并生成待 Astra 固定的 `paletteRevision common-red-v1` 候选；状态仍明确写作 `pending-independent-review; not-published`：几何来源已经固定，当前调色板提交、Paper 接入与发布仍是后续独立步骤。

Paper 仍由独立的 Schema Engineering 维护。SE 本地 main `0f23ad1ebed4ff2ef42394a5b1744eaaff30dd75` 的当前 reader 仍使用旧图标；本包没有声称已经接入 Paper、更新 Paper 正文或发布线上页面。论文内容继续采用 `9.6 / 2026-09-07 / d78fd312955c1f594e59cbdcbb0d3074ac355940`。

## 几何 · optical-03

九个 SVG 共用同一几何，64 × 64 viewBox。数值以 [`manifest.json`](manifest.json) 为准：

| 项目 | 固定值 |
|---|---|
| L 笔画 | 9 |
| 横笔 | 厚 7、长 23；`x=24` |
| 横笔 y | `12`、`30` |
| 竖笔到横笔间距 | 7 |
| 顶端下退 | 4 |
| 整体平移 | `translateX=4.5` |
| L 圆角 / 横笔圆角 | 2.25 / 1.75 |
| 墨迹边界 | `[12.5, 8, 51.5, 56]` |
| L 底部右端 | 48.5 |

这里的“降低横笔的视觉重量”是 Astra 的设计意图和视觉判断，不是未经测量的定量事实。几何的下退也不产生 authority、review、permission 或任何运行状态。

旧稿只用于历史回溯。固定引用为 `bf4b8081a1e4c6c3d680d388472f6f5c93092e62:brand/les-privilege/README.md` 与 `bf4b8081a1e4c6c3d680d388472f6f5c93092e62:brand/les-privilege/manifest.json`；其中的 9/26/gap8、旧红色和早期“推荐稿”措辞不再描述当前资产，也不应与本页当前几何并列阅读。

## 并列两宗与色值

黑色宗和三色宗并列保留，共用上述几何。黑色宗是完整的单色署名，适合 Paper 默认阅读署名；三色宗是同一排印位置的可选身份适配。黑色宗不是三色宗的降级版本，三色宗也不替换黑色宗。

| 宗别 | 浅底 | 深底 | 当前用途 |
|---|---|---|---|
| 黑色宗整体 | `#242d33` | `#e4ebef` | Paper 默认署名、单色或无色场景 |
| 三色宗 L | `#242d33` | `#e4ebef` | 与黑色宗并列的身份适配 |
| 三色宗次横 | `#6f7e88` | `#95a5af` | 三色宗的浅灰横笔 |
| 三色宗红横 | `#c95e55` | `#c95e55` | 三色宗推荐的上横；只作品牌身份色 |

三色宗当前推荐为“上横红、下横浅灰、L 深色”（两宗共用 `#c95e55`；L 与浅灰横笔仍按明暗底适配）；中横红和灰阶变体继续作为候选对照，不是本轮默认。`common-red-v1` 只把品牌上横的红色固定为跨明暗同一值，不把它变成文字色。品牌红不映射 `error`、`active`、`review`、`permission`、`diff` 或其他产品状态；品牌独立身份也不生成这些状态。

在当前 Paper 深浅底 `#edf1f3` / `#202b32` 上，`#c95e55` 的相对亮度对比度分别为 `3.54:1` / `3.59:1`，满足图形标记的非文字 `3:1` 参考门槛，但不满足正文 `4.5:1` 门槛。因此它只用于 SVG 的品牌横笔或明确的非文字标记；相邻阅读文字保持宿主中性色，Attention 的 review、error、diff 和 forced-colors / print 规则继续由各自 owner 负责。

文件对应关系如下：

- 黑色宗：[浅底](mark-light.svg)、[深底](mark-dark.svg)、[currentColor](mark.svg)。
- 三色宗推荐：[浅底](mark-tritone-light.svg)、[深底](mark-tritone-dark.svg)。
- 三色宗对照：[中横红浅底](mark-tritone-middle-light.svg)、[中横红深底](mark-tritone-middle-dark.svg)。
- 灰阶对照：[浅底](mark-tonal-light.svg)、[深底](mark-tonal-dark.svg)。

`mark.svg` 通过 `currentColor` 继承宿主颜色；其余文件使用固定导出色。所有九个 SVG 的 geometry 相同，两宗只改变填色组合。

## 使用边界

这是可单独取用的零依赖原生 SVG 包：不含字体、位图、脚本、网络、滤镜或运行时状态。每个 SVG 的 title/accessibility name 是 `les Privilege`。当标记旁边已经有可见的 `les Privilege` 署名时，宿主应把 SVG 当装饰并设置 `aria-hidden="true"`；需要读出标记时保留 accessible name。重复内联时，宿主必须为 title ID 使用唯一前缀，或改用外链 `<img>`，避免同一文档中的 ID 冲突。

静态预览的 [`index.html`](index.html) 与 [`identity.html`](identity.html) 只展示几何、两宗、明暗和排印对照，不是产品 UI 或线上页面。`preview.png`、`mobile.png`、`identity.png` 是固定截图证据，不是运行时资源。预览中的系统字体文字也不是定制字体或已转路径的 wordmark；研究对照图不属于 SVG 导出资产。

Paper 可以在同一署名位置消费黑色宗默认版，并在同一位置验证三色宗上横红版；它不能由该图形改写 Paper 作者、作品标题、论文版本、review 或正式单位。品牌背景（包括 less privilege 的双关、《红与黑》、Dystopia 和 anti-Anthropic）只属于品牌登记的暗层，不能未经另行裁定写成论文命题、公司事实或产品能力。

Research lab、FakesNews 及其他未列入本轮的叙事和产品面不在本包规范范围内。

## 重建与证据

用 `python3 brand/les-privilege/build.py` 可以重建九个 SVG、静态预览 HTML、manifest 和几何对照。它不会接入 Paper、修改 SE 源文或发布站点。当前 manifest 记录的九个文件 hash 必须作为资产接入的来源；不要用历史 README 中的 hash 替换它们。

[`verification.json`](verification.json) 记录 Astra 的作者检查：九个 SVG、`preview.png` 1280 × 2100、`mobile.png` 390 × 844、`identity.png` 960 × 461，以及窄屏无横向溢出。现有 PNG 是 optical-03 旧调色板的参考证据，不代表 `common-red-v1`；本轮只更新源 SVG、预览 HTML、manifest 和语义记录，不伪造或重写既有 PNG。最终浅深视觉比较仍由 Astra 独立完成。该文件同时明确 Paper integration is separate。Luna 的源、几何和语义核对见 [`les-privilege-paper-2026-09-11.md`](../../engineering/design/les-privilege-paper-2026-09-11.md)；文档作者核对不等于独立视觉验收。

来源：[品牌消费记录](../../engineering/research/le-brand-2026-09-11/README.md)、[更新记录](../../engineering/research/le-brand-2026-09-11/update.md)、[上一轮 LE 几何研究](../studies/le-2026-09-11/README.md)。CourtWork 的母题来源和品牌接入边界见 [`brand/README.md`](../README.md)。

## Astra接收 common-red-v1

Luna完成有界源实现与自检后，Astra独立核对9个SVG来源/几何及新浅深实拍，采纳同一红色 `#c95e55`。当前PNG已替换为本轮真实浏览器结果；上文“旧PNG/待视觉比较”描述仅为Luna交接时点，现由本段和verification.json替代。最终资产提交及Paper集成坐标见本轮[接收回执](../../engineering/research/claude-paper-return-2026-09-11/prepublish-v1/README.md)。未发布。
