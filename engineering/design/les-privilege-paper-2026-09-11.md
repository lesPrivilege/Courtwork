# les Privilege × Schema Engineering Paper · 语义与接入规范

2026-09-11。本文只规范本轮 icon、品牌和 Schema Engineering Paper 的署名接缝。Research lab、FakesNews、CourtWork 产品状态和其他未列入的品牌叙事不在范围内。本文是来源与显示边界，不建立 runtime schema、产品 token、权限模型或新的品牌宏大背景。

当前品牌资产几何坐标为 Astra 固定提交 `146e072ce0c4f7d52adeecbdf670ef2d15f31b56`，manifest revision `optical-03`；本轮隔离 intake worktree 增加未提交的 `paletteRevision common-red-v1`，只统一品牌红，不改变几何。Paper 当前 SE 本地 main 为 `0f23ad1ebed4ff2ef42394a5b1744eaaff30dd75`，仍使用旧图标；本规范不把资产坐标写成已接入或已发布。

## 对象、来源与 owner

| 对象 / 事实 | 权威来源与坐标 | owner / 责任 | 本轮状态 |
|---|---|---|---|
| maker 署名 `les Privilege` | [`brand/les-privilege/README.md`](../../brand/les-privilege/README.md)、[`manifest.json`](../../brand/les-privilege/manifest.json) | 品牌几何由 Astra 固定；本文件由 Luna 记录语义边界 | optical-03 已固定；`paletteRevision common-red-v1` 为本轮隔离候选；manifest 仍标 `pending-independent-review; not-published` |
| handle `lesPrivilege` | 同上 | 品牌登记 | 仅作 handle，不是显示署名的替代拼写 |
| 图形标记 `le` | 同上 | 品牌资产 | 仅作 glyph/mark，不是作者、作品或状态 |
| Paper 作品 `Schema Engineering` | [`PAPER.md`](../../PAPER.md) 与 SE 三份源文 | Schema Engineering Paper owner | 独立于 maker 署名 |
| Paper 采用坐标 | [`PAPER.md`](../../PAPER.md)：`9.6 / 2026-09-07 / d78fd312955c1f594e59cbdcbb0d3074ac355940` | Schema Engineering Paper owner | 本轮不变 |
| 当前 Paper reader | [`v1 接收记录`](../research/claude-paper-return-2026-09-11/v1/README.md)；SE local main `0f23ad1ebed4ff2ef42394a5b1744eaaff30dd75` | SE checkout / Paper 发布 owner | 本地 reader 仍为旧 icon；未由本包接入 |
| Paper 预发布候选 | [`PRE-PUBLISH.md`](../release/claude-paper-2026-09-11/PRE-PUBLISH.md) 与 Claude 返回包 | Claude 产出候选；Astra 负责跨仓接入与发布裁定 | 候选 hash、接入提交和线上回执尚未在本文固定 |

`les Privilege` 是 maker’s signature；`Schema Engineering` 是作品名。Paper 的作者、正式单位、章节责任、正文、译文、review manifest 和版本元数据继续由 SE 来源决定。图形旁的可见文字可以帮助读者识别署名，但不会改变这些 owner 关系。

## 当前品牌资产

九个 SVG 共用 `64 × 64` viewBox 和同一几何。manifest 的当前几何为：L 笔画 9；横笔厚 7、长 23，`x=24`，`y=12/30`；竖笔到横笔间距 7；顶端下退 4；整体 `translateX=4.5`；L 圆角 2.25、横笔圆角 1.75；墨迹边界 `[12.5, 8, 51.5, 56]`；L 底部右端 48.5。

“降低横笔的视觉重量”是 Astra 的设计意图和视觉判断，不是未经测量的定量事实。下退、内收或面积变化都只描述图形，不授予 authority，也不产生 review、permission、error、active 或其他运行状态。

### 宗别与允许资产

| 用途 | 浅底 | 深底 | 语义位置 |
|---|---|---|---|
| Paper 默认署名：黑色宗 | `mark-light.svg` · 整体 `#242d33` | `mark-dark.svg` · 整体 `#e4ebef` | 单色 maker mark |
| Paper 同位可选：上横红三色宗 | `mark-tritone-light.svg` · L `#242d33`、灰 `#6f7e88`、红 `#c95e55` | `mark-tritone-dark.svg` · L `#e4ebef`、灰 `#95a5af`、红 `#c95e55` | 同一署名位置的品牌身份适配 |
| 宽窄或宿主继承色 | `mark.svg` | 由宿主 `currentColor` 决定 | 仅在宿主明确负责颜色时使用 |

上横红是三色宗的当前推荐；`common-red-v1` 在浅深宗均使用 `#c95e55`，只作品牌 SVG 横笔和明确的非文字标记。以 Paper 实际底 `#edf1f3` / `#202b32` 计算，对比度为 `3.54:1` / `3.59:1`，满足非文字 `3:1` 参考门槛但不满足正文 `4.5:1` 门槛；相邻阅读文字保持宿主中性色。中横红 (`mark-tritone-middle-light.svg` / `mark-tritone-middle-dark.svg`) 与灰阶 (`mark-tonal-light.svg` / `mark-tonal-dark.svg`) 继续作为对照候选，不是本轮 Paper 默认。黑色宗与三色宗并列保留，共用几何；不能把一个说成另一个的降级版本。品牌红不进入 Attention review、error、active、permission、diff 或其他产品状态。

九个 SVG 的来源 hash 由当前 manifest 固定如下；接入时以 manifest 与资产提交共同核对：

| 文件 | SHA-256 |
|---|---|
| `mark.svg` | `f6491af9a90407c020d378f874afae250416aceb1581d5f7b2f5a5875f0c2299` |
| `mark-light.svg` | `abe3da0b3b5f5f840fcadb506493e28ddad213f4e914f2ea6a41b8df5fd9470b` |
| `mark-dark.svg` | `a035a019e092ded91ada848be5d6f736093d911143fcabf431e27a96ab05f935` |
| `mark-tonal-light.svg` | `5eebaf69bcd24b98fdb52218e5f7f40ead0a2905c70762e7e923464a130c9956` |
| `mark-tonal-dark.svg` | `a453d7b6329c710ea35d2a1ac73b9480940fc2b15b72520e9740051e5241c2e3` |
| `mark-tritone-light.svg` | `57bbc63525b13c2729c5b5f88c243366b9ab1cc371e186174833fff3d42ffabc` |
| `mark-tritone-dark.svg` | `96f7e2d8ca7a177bc26b9ab20e27b1bb4898411bed49fe72c5fc55eef35d81a0` |
| `mark-tritone-middle-light.svg` | `1c58eba29a58c2275b0f95df8684762eec4e88af19b6c36437e69f2ae4a333ea` |
| `mark-tritone-middle-dark.svg` | `871f398eb9f98ef250844c174487b7a04fa84b8d8dd65f29af932ed91dcfa314` |

当前 `manifest.json` SHA-256 为 `c6e412620bd4112cb4eadb9dea7fd90eff972109eadcae4db9b50e99ab55bc55`；`build.py` SHA-256 为 `e4eb2ec8c36aa8e9bada4d3699005b6d1a90f2b4b15b7fa261a34760f5d7d6f1`。若生成器再次变化，接入方必须重新固定 manifest、资产 hash 和候选坐标，不能沿用旧 hash。

## 允许展示

本轮允许把图形作为 Paper 的 maker’s signature 处理：

- Paper 默认阅读 masthead 使用黑色宗的明暗对应文件；同一署名位置可以用上横红三色宗做一次候选适配。两者应保持相同几何、相同 `les Privilege` 文字和同一阅读器行为，不复制成两套 Paper。
- 品牌包的静态 `index.html` / `identity.html` 可以展示几何、两宗、明暗和排印对照；它们是本地资产预览，不是产品 UI、Paper reader 或线上页面。
- 外部 `<img>` 可以直接使用固定色 SVG；`mark.svg` 只有在宿主明确提供 `currentColor` 时可用。内联重复使用必须由宿主确保 title ID 唯一。
- 署名旁已有可见文字时，SVG 作为装饰并设 `aria-hidden="true"`；需要单独读出图形时保留 `les Privilege` accessible name。图形不代替可见作者、作品或状态文字。

## 禁止推导

以下推导均不成立：

- `les Privilege` 是品牌登记，不是 Paper 作者、正式单位、法律实体、provider、实验室能力或产品 owner 的证明；`lesPrivilege` 不能替代显示名称。
- `le` 是 mark，不是完整署名，不是 Paper 作品名，也不是通用 action glyph。不要把它引入 CourtWork 的 Lucide action family、button 语义或新的 runtime catalog。
- 红色、灰色、明暗材质、横笔位置和图形下退都是身份/显示选择，不映射 `error`、`active`、`review`、`permission`、成功、失败、处理中或 authority。SVG 的 title 也不表示这些状态。
- Paper reader 的排印、masthead、插画或静态预览不会创建 Authority，不会把 Candidate 变成 Committed Change，不会把输出、显示或复制变成 review acceptance。
- 品牌背景可以留在品牌登记的暗层；不能未经另行裁定写成 Paper 论证、研究实验室事实、公司指控、产品能力或 FakesNews/Research lab 叙事。
- 资产提交、候选构建 hash、SE 源提交和线上发布回执是四种坐标。任何一个坐标存在都不能推导另外三个已完成。
- 本文件不新增 Paper 正文、译文、review manifest、SE runtime schema、产品权限或发布 workflow；也不把静态 HTML/PNG 预览当作线上资源。

## 最近先例与受影响 grammar

本规范沿用最近的三组本地先例：

1. [`frontend-contract.md`](agent-interface-2026-09-10/frontend-contract.md) 把 Semantic、Projection/Control、Visual 和 Placement 分开，要求记录 owner fact、最近先例、基线和验证；候选图不能直接升为 canonical，作者检查不能冒充非作者接受。
2. [`brand/README.md`](../../brand/README.md) 将品牌包定义为独立的零依赖 SVG / Web 组件资产，明确显示层不产生权限或正式接受；本包的 `les Privilege` 继续保持独立品牌身份。
3. [`Claude Paper v1 接收记录`](../research/claude-paper-return-2026-09-11/v1/README.md) 接受 E1、黑色宗默认和上横红彩色宗可选，但明确 Paper 仍为 `9.6 / 2026-09-07 / d78fd312`、SE local main 只有本地集成、未推送或触发 Pages，并把作者检查与 Astra 非作者审查分开。

受影响的 grammar 只到已有条目的边界：`iconography` 继续遵守 [`icon-controls.md`](icon-controls.md) 的“glyph 不承担对象名、范围、后果和授权”规则；本 mark 是品牌署名，不加入通用动作 glyph。`markdown.reading` 与 `output.review` 继续分开，正如 [`precedent-map.md`](agent-interface-2026-09-10/precedent-map.md) 所登记；本品牌显示不改变 Paper 阅读或 review 语义。`identity / brand` 在 precedent map 中仍是 deferred，本文件只登记一个受限 Paper maker-signature 接缝，不把它提升为产品身份 canonical。

## Paper 资产接入验收

Astra 或发布 owner 在真正接入时，需为同一候选保留以下证据；Luna 的文档核对不替代该验收：

| 门 | 必须核对 | 通过条件 |
|---|---|---|
| 来源 | 提交、路径、manifest、逐文件 hash | 仅几何来自 `146e072...` 的明确路径；本轮 `common-red-v1` 由隔离候选的 `build.py` 生成并待 Astra 固定；manifest 的九个候选 hash 全部匹配；不消费历史 9/26/gap8 稿 |
| 几何与色值 | `optical-03` / `common-red-v1` 字段、两宗、明暗、候选位置 | 九个 SVG 几何相同；Paper 默认黑色宗；可选三色宗为浅深共用 `#c95e55` 的上横红；中横红/灰阶仅候选 |
| 语义 | 相邻署名文字、作者/作品/版本来源 | `les Privilege` 只作 maker signature；Paper 作者、作品、`9.6/d78fd312` 和正式单位来自 SE，均未被图形改写 |
| SVG 接入 | 零依赖、currentColor、ARIA/title | 无脚本、位图、网络、滤镜或事件属性；内联 title ID 不冲突；装饰实例不重复朗读 |
| 阅读面 | 同一 reader、同一署名位置 | 不复制两套 reader，不增加新控件；候选仍保留三卷、双语、主题、hash/deep link、键盘和无脚本行为 |
| 尺寸与显示 | Paper 实际 masthead、16/20/24/32 px，明暗两宗 | 1440、1280、390 宽度均有实际截图或记录；窄屏、长标题、打印和 forced-colors 的适用性分别报告 |
| 构建可复现 | release manifest、候选输出与命令 | 两次构建字节一致；论文内容、译文、review manifest、SE 源和线上版本坐标分开记录 |
| 接入、复核与发布 | 实际 SE commit/path/hash；独立复核；workflow/线上字节 | 接入按实际代码坐标记录；非作者复核作为独立审查结论另列；只有实际发布 workflow 与线上字节回执齐全才可称已发布 |

在这些证据出现前，推荐措辞是：“`optical-03` 几何资产已固定于 `146e072...`；隔离候选将品牌色更新为 `common-red-v1` / `#c95e55`，仅用于非文字身份标记；Paper 当前 SE local main `0f23ad1...` 仍使用旧图标，等待预发布候选按固定 hash 接入；论文内容仍为 `9.6 / 2026-09-07 / d78fd312`，尚无本轮线上发布回执。”

接入后必须写明实际 SE commit、Paper 文件路径、替换前后 hash、验证结果和未跑项。若只完成候选构建，使用“本地 Paper 候选”或“预发布候选”，不写“已上线”或“已发布”。如果资产已写入候选代码，可准确写“已接入该本地候选”，同时列实际提交与未决复核；接入事实不等于独立接受。

## Luna 只读核对与限制

在几何源提交 `146e072ce0c4f7d52adeecbdf670ef2d15f31b56` 的基础上，Luna 在当前隔离 intake worktree 对 `common-red-v1` 独立执行了以下可复现核对：

- 用 `sha256sum brand/les-privilege/*.svg` 与只读 manifest 比对，九个文件全部匹配；manifest revision 为 `optical-03`，paletteRevision 为 `common-red-v1`，浅深三色宗红横均为 `#c95e55`。
- 用只读解析检查九个 SVG 的 viewBox、path、两枚 rect、`translate(4.5 0)`、`x=24`、`y=12/30`、`23 × 7` 几何，并确认九个文件几何元组相同。
- 用 `xmllint --noout brand/les-privilege/*.svg` 检查 XML；用 `rg` 检查 `script`、`image`、`foreignObject`、`filter`、`style`、外部 href 和事件属性，均未发现。
- 阅读 [`verification.json`](../../brand/les-privilege/verification.json)：既有 Astra 作者证据记录九个 SVG、1280 × 2100 宽屏预览、390 × 844 窄屏首屏、960 × 461 两宗对照及窄屏无横向溢出；这些 PNG 属于 optical-03 旧调色板参考，不代表 common-red-v1。本轮只更新源 SVG、预览 HTML、manifest 和语义记录，不伪造或重写 PNG，common-red-v1 的最终浅深视觉比较仍由 Astra 独立完成，并明确 Paper integration is separate。

上述是源文件、几何、hash 和零依赖边界的核对。它没有运行 Paper 构建，没有改 SE checkout，没有把旧 icon 替换为 optical-03，没有做原生 VoiceOver/IME/forced-colors、实体打印或线上发布验收，也不把 Astra 的截图检查改称 Luna 的独立视觉接受。

## Astra接收 common-red-v1

Luna完成有界源实现与自检后，Astra独立核对9个SVG来源/几何及新浅深实拍，采纳同一红色 `#c95e55`。当前PNG已替换为本轮真实浏览器结果；上文“旧PNG/待视觉比较”描述仅为Luna交接时点，现由本段和verification.json替代。最终资产提交及Paper集成坐标见本轮[接收回执](../research/claude-paper-return-2026-09-11/prepublish-v1/README.md)。未发布。
