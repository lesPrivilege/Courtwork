# 独立审查 · 成熟语义收敛 + 视觉层级收敛（2026-09-09，用户转交）

审查对象：`main@62556b7`、WK10b / WK13 契约与用户提供的四张对照图（Codex、Fable / Claude active-work、dashboard heatmap 参考、当前 CourtWork Home）。结论 **Request changes，不推翻现有方向**：icon 方案已选对，应冻结；需要回炉的是若干 glyph 落位、Home 层级与 desktop chrome 预留。裁决见 [intake-round-3 §4g](../intake-round-3.md)。

## 1. SVG / icon：冻结现有路线

现有实现把 Lucide static SVG 1.41.0 固定到具体 commit、逐枚 vendoring、记录 SHA256 与 license、组成静态 sprite；24 枚 glyph 统一 24×24 viewBox / 2px stroke / currentColor / round cap。WK-71 契约：行内 16、控件 18、导航 20；命中 32 / 44；授权、后果、对象身份、版本不得靠 glyph 表达。

| 类别 | 选型 |
|---|---|
| Home / Search / Settings / Folder / File / Copy / Refresh / Panel / Send 等稳定 GUI 语义 | Lucide，唯一通用 icon family |
| CourtWork brand icon | 原生自有 SVG |
| 版本学、裁决、法务等 CourtWork 独有语义记号 | 原生自有 SVG / symbol library |
| window close / minimize / maximize | 宿主 / 系统 window chrome，不在产品层重画 |
| 临时缺某个通用 icon | 找 Lucide 同义项，不现场画相似 SVG |
| 第二套通用 icon library | 不引入 |

不换 Phosphor（多 weight 增加不必要自由度）；不换 Radix Icons（15×15、偏 React）。通用义符 Lucide、自有语义原生 SVG，两层即可。

## 2. 第一处修改：sidebar 顶部的 `+ / ×`

源码把 New project 的 `+` 放在 brand 同一行，旁边又放 Close navigation 的 `×`；Fable 冻结的 glyph contract 已规定 New project 出现在 Projects heading / Home 空态，`panel-left` 承担 sidebar toggle，`x` 是关闭浮层 / 抽屉。实现落后于契约。

desktop 宽屏：第一行 window-safe-area → brand；sidebar toggle 由 titlebar / chrome 的 `panel-left` 承担；不出现 ×；`+ New project` 下沉到 PROJECTS heading；New session 保持 `square-pen + New session`。窄屏 overlay sidebar：`×` 才合理。brand 不是 toolbar，项目创建不是 app-global chrome action。

## 3. desktop window controls：保留 80px 契约

现有审计已记录 shell strip + 左侧 80px window-control reserve 与 `windowControlsOverlay` 探测。应提升为 layout primitive：OS owns window controls → App shell owns sidebar toggle / navigation → brand owns identity。Apple HIG：window controls 不与 leading toolbar items 重叠，出现时 leading controls 向内让位；toolbar 优先熟悉 symbol。不要让未来 native shell 变成 traffic lights + brand + `+` + `×` + toggle 挤在左上 120px。

## 4. Home 最大问题是视觉主次太多

当前同屏：slogan、巨型 composer、Local test、Project、Create a project to begin、New project、File writes、Ask、大块 runtime error、Continue、mascot，几乎每项争第二层注意力。Codex 成熟在于只有一个一级对象：composer；starter cards 二级；sidebar 背景结构。

三带层级冻结为：**上带 orientation，弱**（3 个 StatTile / activity，紧凑、无大卡片感）；**中带 action，强**（composer 是全页唯一视觉锚点）；**下带 continuity，中**（Continue / Needs attention / recent work，只显示有事实的数据）。

## 5. 不做"卡片生成器"

heatmap / metrics 参考可消费信息组织，不消费"一个深色大 card 里塞八个小 card"。StatTile 可以是同一 strip 内的三个数字；Heatmap 自己是一件 primitive；Continue 以 row 为默认；只有真正独立可打开的 Work 对象才升级成 card；浮起卡留给 Work Surface / Inspector。card is earned。

## 6. 文本克制再推进一层，不误伤高后果语义

可图形化：New、Home、Search、Settings、Refresh、Open / close panel、Attach、Send、Copy、disclosure。不应图形化：Ask before writing / Read only / Writes allowed、Allow / Deny、runtime / provider 身份、文件路径、failure consequence、review state。`File writes  Ask` 不应变成盾牌 icon，而应收成 `Ask before writing ▾`。

## 7. 三个具体视觉问题

- Runtime error 太重：`The local runtime could not be reached.` 成了整块横向 panel；应绑定到所属 connection / runtime context：`○ Local runtime unavailable  Retry`，诊断再 disclosure。
- `Local test` 重复：header capability badge 与 composer 上下文各说一次；同一事实一屏只说一次。
- 右下 mascot 应降级：无 agent status / function 则不与 Send、error、Continue 争注意力。

## 8. 大小与留白立 token

| 层 | 建议 |
|---|---:|
| sidebar | 256–280px |
| app / title chrome | 44–52px |
| nav row | 32–36px |
| row / control / navigation glyph | 16 / 18 / 20px |
| desktop / touch hit target | ≥32 / ≥44px |
| reading / chat measure | 740–800px |
| Home composer measure | 800–920px |
| local gaps | 8 / 12 / 16px |
| section gaps | 24 / 32px |
| major bands | 48 / 64px 起 |

层级首先来自尺寸、间距和 surface elevation，不来自 border；border 留给 input / selected / floating / error boundary。

## Verdict

REQUEST CHANGES，不推翻方向：(1) 冻结 Lucide static-vendor；(2) brand / domain SVG 与 UI glyph 分库；(3) sidebar header 的 `+` 移到 Projects heading，desktop 移除 `×`，collapse 用 `panel-left`，`×` 只留 overlay；(4) 80px window-control safe area 升为正式 shell layout contract；(5) Home 三带做成弱 / 强 / 中；(6) production Home 不出现 `backend pending` 类实现态文案；(7) runtime error、provider / context、permission controls 各归其位，同一事实只说一次；(8) 用 spacing / measure / elevation 建层级，不增新视觉概念。
