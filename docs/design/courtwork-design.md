---
courtwork_design_md:
  authoritative: false
  truth: "docs/design/tokens.json"
  note: "编译件，非权威。唯一机器真值是 docs/design/tokens.json；本文件供效果图/视觉生成管线作前置约束。"
  generator:
    script: "apps/desktop/scripts/compile-design-md.mjs"
    version: 1
  sources:
    "docs/design/tokens.json":
      sha256: "17b63a2ff442b6e4b1b1995c74ddfc3a6162e626346d2acd5526f9b5b013ac23"
    "docs/design/principles.md":
      sha256: "cbab3412945749b98da12c7e5a5ad49b8d8347c96c93ec3e9cb407b87c7c8cfe"
  tokenSet:
    name: "courtwork-design-tokens"
    version: "1.2.0"
    date: "2026-07-13"
tokens:
  color:
    bg:
      app:
        value: "#F6F9FC"
      surface:
        value: "#EAEFF4"
      raised:
        value: "#FFFFFF"
      hover:
        value: "#E2E9F0"
      controlHover:
        value: "#DAE3EC"
      selected:
        value: "#DDE7F2"
    text:
      primary:
        value: "#0A2540"
      secondary:
        value: "#425466"
      tertiary:
        value: "#6E8098"
      disabled:
        value: "#98A9BA"
      inverse:
        value: "#F6F9FC"
    border:
      hairline:
        value: "#E3E9EF"
      strong:
        value: "#CDD8E3"
      focus:
        value: "#2563EB"
    action:
      primaryBg:
        value: "#0A2540"
      primaryFg:
        value: "#F6F9FC"
      primaryHoverBg:
        value: "#1A3A5C"
      link:
        value: "#2563EB"
    semantic:
      tier:
        a:
          graphic: "#16A34A"
          fg: "#15803D"
          bg: "#F0FDF4"
        b:
          graphic: "#64748B"
          fg: "#475569"
          bg: "#F1F5F9"
        c:
          graphic: "#D97706"
          fg: "#B45309"
          bg: "#FCF6E8"
      severity:
        high:
          graphic: "#DC2626"
          fg: "#B91C1C"
          bg: "#FEF2F2"
        medium:
          graphic: "#D97706"
          fg: "#B45309"
          bg: "#FCF6E8"
        low:
          graphic: "#64748B"
          fg: "#475569"
          bg: "#F1F5F9"
      revision:
        insert:
          graphic: "#2563EB"
          fg: "#1D4ED8"
          bg: "#EFF6FF"
          decoration: "underline"
        delete:
          graphic: "#DC2626"
          fg: "#B91C1C"
          bg: "#FEF2F2"
          decoration: "line-through"
      gate:
        pending:
          graphic: "#D97706"
          fg: "#B45309"
          bg: "#FCF6E8"
        confirmed:
          graphic: "#16A34A"
          fg: "#15803D"
          bg: "#F0FDF4"
        rejected:
          graphic: "#64748B"
          fg: "#475569"
          bg: "#F1F5F9"
      usage:
        normal:
          graphic: "#64748B"
          fg: "#475569"
        warn:
          graphic: "#D97706"
          fg: "#B45309"
        critical:
          graphic: "#DC2626"
          fg: "#B91C1C"
      provenance:
        generatedFont:
          value: "sans"
        generatedBg:
          value: "#F6F9FC"
        verifiedBg:
          value: "#EEF4FA"
        verifiedFont:
          value: "mono"
    line:
      danger:
        value: "#DC2626"
      revision:
        value: "#2563EB"
      authority:
        value: "#16A34A"
      attention:
        value: "#D97706"
      neutral:
        value: "#64748B"
  typography:
    family:
      sans:
        value: "-apple-system, 'Segoe UI', 'PingFang SC', 'MiSans', 'Microsoft YaHei', 'Noto Sans SC', 'Helvetica Neue', Arial, sans-serif"
      mono:
        value: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, 'Courier New', monospace"
    weight:
      regular:
        value: 400
      medium:
        value: 510
      mediumFallback:
        value: 500
    scale:
      meta:
        size: 12
        lineHeight: 1.5
      dense:
        size: 13
        lineHeight: 1.5
      body:
        size: 14
        lineHeight: 1.6
      reading:
        size: 15
        lineHeight: 1.6
      titleSm:
        size: 16
        lineHeight: 1.45
        weight: 510
      title:
        size: 18
        lineHeight: 1.4
        weight: 510
      display:
        size: 20
        lineHeight: 1.35
        weight: 510
    numeric:
      value: "tabular-nums"
    letterSpacingCjkTitle:
      value: "-0.01em"
  type:
    dense:
      bodySize:
        value: 13
        unit: "px"
        lineHeight: 1.5
      metaSize:
        value: 12
        unit: "px"
        lineHeight: 1.5
      monoFamily:
        value: "{typography.family.mono}"
  space:
    "1": 4
    "2": 8
    "3": 12
    "4": 16
    "5": 20
    "6": 24
    "8": 32
    "10": 40
    "12": 48
  radius:
    none:
      value: 0
    sm:
      value: 4
    md:
      value: 6
    lg:
      value: 6
  borderWidth:
    hairline:
      value: 1
    line:
      value: 2
  shadow:
    none:
      value: "none"
  elevation:
    canvas:
      value: "{color.bg.app}"
      resolved: "#F6F9FC"
    rail:
      value: "{color.bg.surface}"
      resolved: "#EAEFF4"
    float:
      value: "{color.bg.raised}"
      resolved: "#FFFFFF"
    floatBorder:
      value: "{color.border.hairline}"
      resolved: "#E3E9EF"
    floatRadius:
      value: 12
    floatInset:
      value: 8
    shellGap:
      value: 28
    shadow:
      value: "0 1px 2px rgba(10,37,64,0.045), 0 4px 12px rgba(10,37,64,0.035)"
    titlebar:
      value: "transparent"
    warnBg:
      value: "{color.semantic.gate.pending.bg}"
      resolved: "#FCF6E8"
    warnFg:
      value: "{color.semantic.gate.pending.fg}"
      resolved: "#B45309"
    warnBorder:
      value: "{color.semantic.gate.pending.graphic}"
      resolved: "#D97706"
  home:
    inset:
      value: 16
    sectionGap:
      value: 20
    itemGap:
      value: 12
    rowHeight:
      value: 36
    iconSize:
      value: 18
    controlRadius:
      value: 8
    surfaceRadius:
      value: 16
    welcomeMeasure:
      value: 560
  motion:
    stateChange:
      value: "0ms"
    press:
      value: "120ms"
      easing: "ease-out"
      scale: 0.98
    hover:
      value: "120ms"
      easing: "ease-out"
    tabIndicator:
      value: "100ms"
      easing: "ease-out"
    panelSwitch:
      value: "0ms"
    settleFlash:
      value: "150ms"
      easing: "ease-out"
    continuation:
      value: "240ms"
      easing: "ease-out"
    overlay:
      value: "120ms"
      easing: "cubic-bezier(0.25, 0.46, 0.45, 0.94)"
    reasoningLine:
      value: "360ms"
      easing: "ease-out"
    longTaskGlow:
      value: "1800ms"
      easing: "linear"
      iteration: "infinite"
      color: "rgba(10, 37, 64, 0.55)"
    longTaskBreath:
      value: "2000ms"
      easing: "ease-in-out"
      iteration: "infinite alternate"
      opacityRange: [0.55, 1]
    dataRegion:
      value: "none"
  component:
    control:
      heightSm: 28
      heightMd: 32
      fontSizeSm: 13
      fontSizeMd: 14
      weightRegular: 400
      weightEmphasized: 510
      iconSize: 16
      gap: 6
    preview:
      semanticGutter: 12
      progressTrackWidth: 2
      utilityHeight: 44
      headerHeight: 40
      toolbarHeight: 36
    signatureLine:
      width: 2
      badgeSize: 12
      badgeFont: "mono"
      hoverGlowLength: 40
    kbd:
      font: "mono"
      size: 11
      paddingX: 5
      paddingY: 1
      radius: 4
      bg: "#FFFFFF"
      border: "#CDD8E3"
      borderBottomWidth: 2
      fg: "#425466"
    tierBadge:
      size: 12
      font: "mono"
      box: 16
      radius: 4
    gridline:
      color: "#E3E9EF"
      width: 1
    listRow:
      height: 30
      headerHeight: 28
      fontSize: 13
    callout:
      borderWidth: 1
      radius: 6
    workbenchFrame:
      titlebar: 40
      toolbar: 40
      panelHead: 40
      statusbar: 32
---

# Courtwork Design（机器可读编译件）

> ⚠️ **非权威。** 本文件由 `apps/desktop/scripts/compile-design-md.mjs` 从
> `docs/design/tokens.json` + `docs/design/principles.md` 编译生成，唯一机器真值是
> `docs/design/tokens.json`。本文件是效果图 / 视觉生成管线的**前置约束**镜像——
> frontmatter 承载 token 值，正文承载用法语义；三层表面、动效四属性白名单、色阶纪律
> 在生成时即生效，把回迁护栏从事后过滤提前到生成时约束。
> token 或原则变更后必须重新编译（`pnpm --filter @courtwork/desktop design:md`），否则 drift 门变红。

## 一、token 集元信息

- **name**：courtwork-design-tokens
- **version**：1.2.0
- **date**：2026-07-13
- **status**：现行设计 token 唯一机器真值
- **naming**：领域无关（docs/decisions/ADR-001-package-abi.md 纪律）：tier / severity / revision / gate / usage 均无法律语义，法律语义只存在于消费方的数据与文案中
- **sources**：品牌锚色 #0A2540；中性阶由锚色派生；字重只用 400/510；语义线与文字使用图形/前景双轨
- **neutralSource**：整条中性阶由锚色 #0A2540（H=210°）降饱和升明度派生；禁无色相灰（白卡豁免）与暖调中性。机器门：assert-neutral-source.mjs
- **theme**：浅色唯一。深色主题不进 MVP（docs/design/principles.md 硬性），本文件不含 dark 分支

## 二、交互与视觉原则（principles.md 要点）

### 1. 三层表面

- L0 画布：页面底纸与对话地面，无投影。
- L1 浮面：主要容器与 composer；只允许消费 `elevation.shadow` 的统一藏青双层轻影、`elevation.floatBorder` 与 `elevation.floatRadius`。
- L2 弹层：通过描边、遮挡关系和受控 overlay 动效表达，不自造第二套阴影。

数据区、内层卡、表格、文书纸面和列表行保持零投影。任何非零阴影必须来自单一 token 和白名单消费点。

### 2. 颜色与层级

- 所有颜色来自 token；组件不得新增 hex/rgb/hsl。
- 中性阶由品牌锚色派生；不使用无色相灰或暖灰。
- 彩色只表达语义状态。图形色与文字色分轨，文字必须使用满足对比度的 `*.fg`。
- 主操作使用 ink，不占用红/琥珀/蓝/绿的状态预算。
- 层级优先用字号、字重、文字明度和间距表达，背景色块是最后手段。

### 3. 容器与密度

- 同构数据默认用紧凑列表、表格或矩阵，不堆卡片。
- 异构内容、对话产物与摘要才使用卡片。
- 内部节奏以 4px 为微基阶、8px 为布局基阶；desktop 外壳使用 `elevation.*` 已登记值。
- 长文本在列表中截断并提供展开；正式文书与阅读面不截断。

### 4. 数据与生成内容分界

- AI 解释：sans + generated 中性底纹。
- 原文、工具核验、编号、金额与日期：mono/tabular + verified 中性底纹。
- 右栏结构化数据必须提供可到达的来源入口；无锚数据不得伪装为已核验事实。

### 5. 动效

允许动画属性只有 `transform`、`opacity`、`background-color`、`border-color`。

- 语义状态与工作面内容：0ms 硬切。
- hover：120ms，仅背景/边框。
- 按压：120ms，仅主操作、图标按钮与弹层触发器可用 `scale(.98)` + 既有底色反馈；数据行、表格单元格、卡片与键盘触发动作零缩放。
- overlay：使用 token 规定时长；关闭应即时、确定。
- 数据区绝对静止；禁止卡片抬升、缩放、弹簧、layout 动画和内容 crossfade。
- 长任务用品牌化思考反馈或事件流进度；禁止 spinner 裸奔。
- 例外：Pages 展示站（`site/`）的媒体与标题层动效允许超出四属性白名单（如逐字显影动 `color`、截图显影动 `mask-position`），条件见 `site-evidence-line.md` 的展示站动效例外条款；产品壳不适用该例外，desktop 四属性门禁不变。

### 6. 人工确认

关键产出必须有明确的确认、驳回与修正动作。高风险或含未核验依据的项目只能逐条确认；批量动作必须写明范围和数量。不可逆动作永不自动触发。

### 7. 法理之线

法理之线只表达右栏审阅项的处置状态，不表达一般层级或装饰。完整白名单和优先级见 `signature-line.md`。普通卡、中栏对话、导航、图谱节点与 AI callout 不使用该线。

### 8. 文档定稿

“编译为 Word”是显式、单向的冻结仪式。只有产物写入并验证存在后，草稿才能转为只读；不得提供无损失保证的 docx→md 回转。

### 9. 零技术概念暴露

普通用户界面不出现 schema、JSON、token、prompt、command、trace 等工程词。wire id 与错误码只进入诊断层；用户文案用案件、材料、依据、核对、确认、定稿与归档。

完整文案与用语规范（动作命名、错误体例、完成/进行/空态体例，与本节合并成册）见 `voice.md`；可机器断言的条款由 `lint:voice` 静态门强制。

### 10. 命名与宿主边界

通用组件和 token 使用领域无关名称。法律或 PM 词表、字段解释与 renderer 住垂类包；desktop 只提供通用宿主机制。

## 三、token 用法语义（tokens.json 描述派生）

- `color.bg.app` = `#F6F9FC` — 底纸（L0 画布/chat 地）：近白冷调，三级台阶最浅。锚色 H210 派生
- `color.bg.surface` = `#EAEFF4` — 竖栏容器底（左栏/右栏收敛条）：三级台阶中层，比底纸略深
- `color.bg.raised` = `#FFFFFF` — 白卡最亮：内容卡片/文书纸面/composer 输入纸
- `color.bg.hover` = `#E2E9F0` — 行/项悬停底：H210 冷调，在 surface 与 raised 上均可辨
- `color.bg.controlHover` = `#DAE3EC` — 扁平按钮 hover 深色块，与 selected 分离；CSS --control-hover
- `color.bg.selected` = `#DDE7F2` — 选中项底：蓝感强于 hover 族（B−R=20），不占语义色预算
- `color.text.primary` = `#0A2540` — 正文与标题。Stripe 藏青黑，拒纯黑与暖灰（docs/design/principles.md 采纳）
- `color.text.secondary` = `#425466` — 次级说明、标签
- `color.text.tertiary` = `#6E8098` — 元信息、占位符
- `color.text.disabled` = `#98A9BA` — 禁用态文字。H210 同源
- `color.text.inverse` = `#F6F9FC` — 深底（主按钮）上的文字：冷白（=bg.app）
- `color.border.hairline` = `#E3E9EF` — 全站默认描边与网格线：1px 单色无影（docs/design/principles.md 采纳），H210 同源
- `color.border.strong` = `#CDD8E3` — 输入框、需要更强边界的容器。H210 同源
- `color.border.focus` = `#2563EB` — 键盘焦点环，复用 revision.insert 色相（预算内复用）
- `color.action.primaryBg` = `#0A2540` — 主按钮底 = ink。主操作不占语义色预算（vercel 黑按钮范式）
- `color.action.link` = `#2563EB` — 链接/溯源跳转。与 revision.insert 同色相，蓝 = 可点击/新增，符合 Word 心智
- `color.semantic` — 语义色预算全表。每项拆为 graphic（线体/图形，保留高纯度原色）与 fg（12px 文本，按对应 bg 复算至 WCAG AA）双轨；色相总数仍为 4（红/琥珀/蓝/绿）+ 中性板岩灰。tint（*.bg 浅底）只许用于徽章/chip/角标/修订字符底纹/AI callout，禁止作任何数据卡片或列行的背景——数据容器永远纯白底，状态由法理之线表达（划界见 principles.md §2a）
- `color.semantic.tier` — 信源分级角标（docs/decisions/ADR-003-evidence-and-anchors.md：A 官方权威 / B 私域维护库 / C 开放网络参考）
- `color.semantic.tier.a` = `graphic #16A34A · fg #15803D · bg #F0FDF4` — 已核验权威源
- `color.semantic.tier.b` = `graphic #64748B · fg #475569 · bg #F1F5F9` — 库内维护源，可信中性
- `color.semantic.tier.c` = `graphic #D97706 · fg #B45309 · bg #FCF6E8` — 网络参考，未经核验须人工确认
- `color.semantic.severity` — 风险/问题等级
- `color.semantic.severity.high` = `graphic #DC2626 · fg #B91C1C · bg #FEF2F2` — 高危。法理之线保留拍板红
- `color.semantic.severity.medium` = `graphic #D97706 · fg #B45309 · bg #FCF6E8` — 中危
- `color.semantic.severity.low` = `graphic #64748B · fg #475569 · bg #F1F5F9` — 低危 = 中性灰，刻意不占彩色预算
- `color.semantic.revision` — 修订痕迹。忠实 Word 修订心智：红删蓝增（docs/design/principles.md 裁定，Loom-Diff 半透明方案已否决）
- `color.semantic.revision.insert` = `graphic #2563EB · fg #1D4ED8 · bg #EFF6FF` — 新增文字：蓝 + 下划线。法理之线保留拍板蓝
- `color.semantic.revision.delete` = `graphic #DC2626 · fg #B91C1C · bg #FEF2F2` — 删除文字：红 + 删除线，字形保留可核对
- `color.semantic.gate` — 确认门禁三态，与 schema DispositionStatus 枚举一一对应（pending/confirmed/rejected）
- `color.semantic.gate.pending` = `graphic #D97706 · fg #B45309 · bg #FCF6E8` — 待确认
- `color.semantic.gate.confirmed` = `graphic #16A34A · fg #15803D · bg #F0FDF4` — 已确认。法理之线保留拍板绿
- `color.semantic.gate.rejected` = `graphic #64748B · fg #475569 · bg #F1F5F9` — 已驳回 = 退出视觉舞台，中性灰非红（驳回是处置不是错误）
- `color.semantic.usage` — 状态条用量圆盘三态（docs/design/principles.md）
- `color.semantic.usage.critical` = `graphic #DC2626 · fg #B91C1C` — 红色态直接接一键续行按钮，文案用办案阶段心智
- `color.semantic.provenance` — 生成与确定的视觉区隔（docs/design/principles.md）：AI 生成的解释性文字 = sans 字族 + generated 冷灰底；工具核验结果/原文引语/结构化引用 = mono 字族 + verified 冷灰蓝底。两条通道的样式恒定，不得混用，不得用彩色表达（彩色预算属于语义状态）
- `color.semantic.provenance.generatedFont` = `sans` — AI 解释文字：sans + text.secondary，搭配 generatedBg
- `color.semantic.provenance.generatedBg` = `#F6F9FC` — AI callout 无线底纹：复用 bg.app 底纸值（白卡上的微差底），不占语义色预算
- `color.semantic.provenance.verifiedBg` = `#EEF4FA` — 核验内容底纹：冷灰蓝（蓝感强于 generatedBg，双轨可辨），叠于 bg.raised 之上，radius.sm
- `color.semantic.provenance.verifiedFont` = `mono` — 核验内容（引语、编号、核验结果值）用 mono；伴随的文件名链接保持 sans
- `color.line` — 签名动作「法理之线」专用图形色（完整规格见 signature-line.md）。文字不得消费本组值，须消费 semantic.*.fg
- `color.line.attention` = `#D97706` — 补全态：待人处理/未核验
- `color.line.neutral` = `#64748B` — 处置态：已驳回 = 退出工作集；低危待处理无线，严重度由等级徽章表达
- `typography.family.sans` = `-apple-system, 'Segoe UI', 'PingFang SC', 'MiSans', 'Microsoft YaHei', 'Noto Sans SC', 'Helvetica Neue', Arial, sans-serif` — 拉丁取系统 UI 字，中文落 苹方/MiSans/雅黑。无衬线硬性（docs/design/principles.md）
- `typography.family.mono` = `ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, 'Courier New', monospace` — 编号、日期、金额、KBD、徽章、citation 批注专用
- `typography.weight.medium` = `510` — Linear 实测变量字体技巧：避开 600/700 的粗鄙感；非变量字体环境回退 500
- `typography.scale.meta` — 元信息、角标、徽章。全站最小字号，12px 以下禁用（docs/design/principles.md 规避 Raycast 极限字阶）
- `typography.scale.dense` — 高密度列表、表格单元格
- `typography.scale.body` — UI 正文默认
- `typography.scale.reading` — 长文阅读面（文书、修订预览）。正文锁 14–15px / 1.55–1.6 为硬性（docs/design/principles.md）
- `typography.scale.display` — 页面级标题上限。工作台不需要更大的字
- `typography.numeric` = `tabular-nums` — 硬性：一切数字（法条编号/金额/日期/序号）必须 font-variant-numeric: tabular-nums（docs/design/principles.md 采纳）
- `typography.letterSpacingCjkTitle` = `-0.01em` — ≥16px 中文标题收字距；正文 0
- `type.dense.bodySize` = `13` — Schema 工作面正文/数据行；不得低于 13px
- `type.dense.metaSize` = `12` — Schema 表头、Tab、计数与元信息
- `type.dense.monoFamily` = `{typography.family.mono}` — Schema 编号、日期、金额、引用与计数
- `space` — 4px 基阶
- `radius.none` = `0` — 表格、网格线区域、文书纸面
- `radius.sm` = `4` — 按钮、徽章、KBD、角标
- `radius.md` = `6` — 卡片、输入框
- `radius.lg` = `6` — 面板、弹层与 AI callout；普通组件圆角上限
- `borderWidth.line` = `2` — 法理之线线宽
- `shadow.none` = `none` — 数据区、内层卡、列表、表格、文书纸面与 KBD 的默认零投影
- `elevation` — 画布-浮面三层：L0 画布；L1 SurfaceCard 使用统一轻影、描边与圆角；L2 popover。数据区与内层卡零投影。
- `elevation.canvas` = `{color.bg.app}` — L0 页面底色 / 对话流地面：底纸近白冷调（台阶一）
- `elevation.rail` = `{color.bg.surface}` — 竖栏容器填充（左栏/右栏收敛条）：台阶二，略深于底纸。单源律三级明度的中层；CSS --elevation-rail
- `elevation.float` = `{color.bg.raised}` — L1 白卡浮面填充（内容卡/composer 输入纸）：台阶三最亮
- `elevation.floatBorder` = `{color.border.hairline}` — L1 细描边
- `elevation.floatRadius` = `12` — L1 圆角。列表卡仍用 radius.md/sm；浮面外壳用 12（docs/decisions/ADR-006-ui-host.md）
- `elevation.floatInset` = `8` — 左右 L1 浮卡相对 L0 画布的窗口外缘（px）。2026-07-13 macOS Overlay 真机纠偏：8px 外缘 + 12px 圆角使左上圆心落在 (20,20)，完整承托原生交通灯；CSS --elevation-float-inset
- `elevation.shellGap` = `28` — 浮面之间的现行间距；CSS --elevation-shell-gap
- `elevation.shadow` = `0 1px 2px rgba(10,37,64,0.045), 0 4px 12px rgba(10,37,64,0.035)` — 藏青双层低透明短距投影；非零投影只可由此 token 单点供给
- `elevation.titlebar` = `transparent` — 标题栏融入红绿灯 chrome 层
- `elevation.warnBg` = `{color.semantic.gate.pending.bg}` — 标题栏 failed 琥珀警示底（复用 gate.pending，不新增色）
- `home` — 低密度主屏/左栏专用；schema dense 区禁止消费。iconSize=18 为光学尺寸豁免；surfaceRadius=16 仅主屏低密度大面。
- `home.iconSize` = `18` — 光学尺寸豁免 4px 基阶
- `home.surfaceRadius` = `16` — 仅欢迎/provider 引导等主屏低密度大面
- `motion.stateChange` = `0ms` — 硬性：一切语义状态变更（门禁、风险等级、法理之线变色）0ms 硬切，无过渡（docs/design/principles.md）
- `motion.press` = `120ms` — 按压确认反馈；仅主操作、图标按钮与弹层触发器可缩放并加深底色，数据行、表格单元格、卡片与键盘触发动作零缩放
- `motion.hover` = `120ms` — 全站悬停统一值；只动 background-color / border-color
- `motion.tabIndicator` = `100ms` — Tab 选中指示器；内容区仍为 0ms 瞬切
- `motion.panelSwitch` = `0ms` — 五工作面与对照面板内容硬切，不做 crossfade
- `motion.settleFlash` = `150ms` — 确认/驳回状态本体 0ms 落定后，独立 border-color 光效层非对称衰减
- `motion.continuation` = `240ms` — 续行跳转回执；只动 opacity + translateY(≤4px)
- `motion.overlay` = `120ms` — 弹层出现；收起瞬发
- `motion.reasoningLine` = `360ms` — #26 推理骨架逐行写下；每行落定后静止，仅当前未落行消费
- `motion.longTaskGlow` = `1800ms` — 长任务边框微光流转周期；颜色由既有 ink 透明度生成，不新增色相（principles.md §动效分界）
- `motion.longTaskBreath` = `2000ms` — 骨架呼吸周期
- `motion.dataRegion` = `none` — 硬性：数据区绝对静止（Midday 原则）。表格、时间线、图谱、文书内容不许有任何自发动效
- `component.control` — 按钮与工具控件只消费此组，不在组件内散落尺寸/字重
- `component.preview` — Preview 宿主结构位：语义 gutter、只读滚动轨与右栏三区高度
- `component.signatureLine` — 完整交互规格见 signature-line.md
- `component.kbd` = `fg #425466 · bg #FFFFFF` — 常驻快捷键提示；键帽感由 border-bottom 2px 表达，不用 box-shadow。规格见 typography-density.md
- `component.tierBadge` — 信源角标：16px 方格内 12px 等宽单字母 A/B/C，取 semantic.tier.* 配色
- `component.gridline` — 标题栏、工具栏、面板头、状态条与列表的统一 1px 分隔线
- `component.listRow` — 紧凑数据列表；单行截断，详情靠展开行
- `component.callout` — AI 建议/提醒容器：无线、生成内容底纹、1px 中性边框；不得借用法理之线
- `component.workbenchFrame` — 工作台结构高度；实际可见性由当前宿主布局决定
