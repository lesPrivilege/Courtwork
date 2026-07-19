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
      sha256: "c2a7c6ab29f2c699985b9d5d73b04003ca0f49bb664730828465288ca91e60c3"
    "docs/design/principles.md":
      sha256: "5a8afdf8e33316e58aa647d52b01c1ae485902e3ef8cef86d6bd317717f41f67"
  tokenSet:
    name: "courtwork-design-tokens"
    version: "1.3.0"
    date: "2026-07-18"
tokens:
  color:
    bg:
      app:
        value: "#F7F8FA"
      surface:
        value: "#F2F4F7"
      raised:
        value: "#FFFFFF"
      hover:
        value: "#E6E8EC"
      controlHover:
        value: "#DDE0E4"
      selected:
        value: "#D9E3F6"
    text:
      primary:
        value: "#232B38"
      secondary:
        value: "#55617A"
      tertiary:
        value: "#637083"
      disabled:
        value: "#8A94A8"
      inverse:
        value: "#F7F8FA"
    border:
      hairline:
        value: "#D5DAE3"
      strong:
        value: "#C3CAD6"
      focus:
        value: "#2563EB"
    action:
      primaryBg:
        value: "#232B38"
      primaryFg:
        value: "#F7F8FA"
      primaryHoverBg:
        value: "#3A4658"
      link:
        value: "#2563EB"
    semantic:
      tier:
        a:
          graphic: "#16A34A"
          fg: "#15803D"
          bg: "#F0FDF4"
        b:
          graphic: "#55617A"
          fg: "#55617A"
          bg: "#F2F4F7"
        c:
          graphic: "#8F6420"
          fg: "#8F6420"
          bg: "#FAF3E6"
      severity:
        high:
          graphic: "#A83226"
          fg: "#A83226"
          bg: "#FBEBE9"
        medium:
          graphic: "#8F6420"
          fg: "#8F6420"
          bg: "#FAF3E6"
        low:
          graphic: "#55617A"
          fg: "#55617A"
          bg: "#F2F4F7"
      revision:
        insert:
          graphic: "#2563EB"
          fg: "#1D4ED8"
          bg: "#EFF6FF"
          decoration: "underline"
        delete:
          graphic: "#A83226"
          fg: "#A83226"
          bg: "#FBEBE9"
          decoration: "line-through"
      gate:
        pending:
          graphic: "#8F6420"
          fg: "#8F6420"
          bg: "#FAF3E6"
        confirmed:
          graphic: "#16A34A"
          fg: "#15803D"
          bg: "#F0FDF4"
        rejected:
          graphic: "#55617A"
          fg: "#55617A"
          bg: "#F2F4F7"
      usage:
        normal:
          graphic: "#55617A"
          fg: "#55617A"
        warn:
          graphic: "#8F6420"
          fg: "#8F6420"
        critical:
          graphic: "#A83226"
          fg: "#A83226"
      provenance:
        generatedFont:
          value: "ui"
        generatedBg:
          value: "#F7F8FA"
        verifiedBg:
          value: "#F0F4FE"
        verifiedFont:
          value: "mono"
    line:
      danger:
        value: "#A83226"
      revision:
        value: "#2563EB"
      authority:
        value: "#16A34A"
      attention:
        value: "#8F6420"
      neutral:
        value: "#55617A"
      settled:
        value: "#BE4B2F"
  themes:
    dark:
      bg:
        app:
          value: "#0F1622"
        surface:
          value: "#16202F"
        raised:
          value: "#223047"
      text:
        primary:
          value: "#E4E9F1"
        secondary:
          value: "#A9B4C6"
        tertiary:
          value: "#6E7C92"
        disabled:
          value: "#4C5A70"
        inverse:
          value: "#0F1622"
      border:
        hairline:
          value: "#2A3A52"
        strong:
          value: "#3E5270"
        focus:
          value: "#6A94F1"
      semantic:
        zhu:
          graphic: "#D75A3C"
          fg: "#E2857A"
          bg:
            derive: "color-mix(in srgb, {semantic.zhu.graphic} 14%, {bg.raised})"
        red:
          graphic: "#B5382F"
          fg: "#DE8881"
          bg:
            derive: "color-mix(in srgb, {semantic.red.graphic} 14%, {bg.raised})"
        amber:
          graphic: "#C89042"
          fg: "#D9AE6A"
          bg:
            derive: "color-mix(in srgb, {semantic.amber.graphic} 14%, {bg.raised})"
        blue:
          graphic: "#2563EB"
          fg: "#779EF3"
          bg:
            derive: "color-mix(in srgb, {semantic.blue.graphic} 14%, {bg.raised})"
        green:
          graphic: "#16A34A"
          fg: "#19B753"
          bg:
            derive: "color-mix(in srgb, {semantic.green.graphic} 14%, {bg.raised})"
        slate:
          graphic: "#6E7C92"
          fg: "#A9B4C6"
          bg:
            derive: "color-mix(in srgb, {semantic.slate.graphic} 14%, {bg.raised})"
      provenance:
        generatedBg:
          value: "#0F1622"
        verifiedBg:
          derive: "color-mix(in srgb, {semantic.blue.graphic} 10%, {bg.raised})"
  rule:
    major:
      value: 2
      unit: "px"
    minor:
      value: 1
      unit: "px"
    gap:
      value: 2
      unit: "px"
    ink:
      value: "{themes.<theme>.border.strong}"
  typography:
    family:
      title:
        value: "'Times New Roman', Charter, Times, 'Source Han Serif SC', 'Noto Serif CJK SC', 'Songti SC', serif"
      body:
        value: "'Times New Roman', Charter, Times, 'Zhuque Fangsong', 'Source Han Serif SC', 'Songti SC', serif"
      ui:
        value: "-apple-system, 'Segoe UI', 'PingFang SC', 'MiSans', 'Microsoft YaHei', 'Noto Sans SC', 'Helvetica Neue', Arial, sans-serif"
      mono:
        value: "ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, 'Courier New', monospace"
    track:
      title:
        family: "{typography.family.title}"
        weightRegular: 400
        weightEmphasis: 600
      document:
        family: "{typography.family.body}"
        weight: 400
        readingSize: 16
        readingLineHeight: 1.75
      ui:
        family: "{typography.family.ui}"
        weightRegular: 400
        weightEmphasis: 510
      data:
        family: "{typography.family.mono}"
        numeric: "tabular-nums"
    weight:
      regular:
        value: 400
      medium:
        value: 510
      mediumFallback:
        value: 500
    slot:
      viewTitle:
        track: "title"
        scale: "display"
        weight: 600
        color: "text.primary"
        aaTarget: 4.5
      sectionTitle:
        track: "title"
        scale: "titleSm"
        weight: 400
        color: "text.primary"
        aaTarget: 4.5
      documentBody:
        track: "document"
        scale: "reading"
        weight: 400
        color: "text.primary"
        aaTarget: 4.5
        size: 16
        lineHeight: 1.75
      documentQuote:
        track: "document"
        scale: "reading"
        weight: 400
        color: "text.secondary"
        aaTarget: 4.5
        size: 16
        lineHeight: 1.75
      tableText:
        track: "ui"
        scale: "dense"
        weight: 400
        color: "text.primary"
        aaTarget: 4.5
      tableNumber:
        track: "data"
        scale: "dense"
        weight: 400
        color: "text.primary"
        aaTarget: 4.5
      meta:
        track: "ui"
        scale: "meta"
        weight: 400
        color: "text.tertiary"
        aaTarget: 4.5
      control:
        track: "ui"
        scale: "body"
        weight: 400
        color: "text.primary"
        aaTarget: 4.5
      sealNote:
        track: "document"
        scale: "meta"
        weight: 400
        color: "line.settled"
        aaTarget: 4.5
        consumer: "B4"
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
      resolved: "#F7F8FA"
    rail:
      value: "{color.bg.surface}"
      resolved: "#F2F4F7"
    float:
      value: "{color.bg.raised}"
      resolved: "#FFFFFF"
    floatBorder:
      value: "{color.border.hairline}"
      resolved: "#D5DAE3"
    floatRadius:
      value: 12
    floatInset:
      value: 8
    shellGap:
      value: 28
    shadow:
      value: "0 1px 2px rgba(35,43,56,0.045), 0 4px 12px rgba(35,43,56,0.035)"
    titlebar:
      value: "transparent"
    warnBg:
      value: "{color.semantic.gate.pending.bg}"
      resolved: "#FAF3E6"
    warnFg:
      value: "{color.semantic.gate.pending.fg}"
      resolved: "#8F6420"
    warnBorder:
      value: "{color.semantic.gate.pending.graphic}"
      resolved: "#8F6420"
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
      color: "rgba(35, 43, 56, 0.55)"
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
      border: "#C3CAD6"
      borderBottomWidth: 2
      fg: "#55617A"
    tierBadge:
      size: 12
      font: "mono"
      box: 16
      radius: 4
    gridline:
      color: "#D5DAE3"
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
- **version**：1.3.0
- **date**：2026-07-18
- **status**：现行设计 token 唯一机器真值。color.* = 刻本印页宗（浅，B1 已置换并接线消费面）；themes.dark = 磁青宗（深，B5 目标值，零消费面）
- **naming**：领域无关（docs/decisions/ADR-001-package-abi.md 纪律）：tier / severity / revision / gate / usage 均无法律语义，法律语义只存在于消费方的数据与文案中
- **sources**：锚色 #232B38（B1 由 #0A2540 迁入，缘由见 themes.$anchor）；中性阶由锚色派生；字重按轨分档（B2-0 三轨制）：功能轨 400/510、标题轨 400/600、文书轨单 400（零粗体律）；语义线与文字使用图形/前景双轨
- **neutralSource**：整条中性阶由锚色 #232B38（H≈217°）降饱和升明度派生，双宗冷调中性 33 值实测落 214.3°–222.9°（两端为 bg.controlHover 与 semantic.provenance.verifiedBg）。禁无色相灰（白卡豁免）与暖调中性（B≥R）。机器门：assert-neutral-source.mjs——**门只验无色相灰与暖调两条，不含色相带约束**：本行的带宽是实测记述而非准入条件，勿当门读。**订正注记（2026-07-19 B2-0 期逐值复算）**：原自述「收敛于 216–220°」与实测不符，两端值均 B1 前既有、非任何后续批次引入；本次只更正记述以合实测，不新增带约束（加带即新概念，复杂度节制条挡；后批若要收带，另立议题并带测据）
- **theme**：双主题（2026-07-19 拍板：深色模式随皮层迁移顺带交付）。color.* 即刻本印页宗（浅），B1 已置换；themes.dark（磁青宗）为 B5 目标值，届时由 [data-theme] 在 token 层置换。原「浅色唯一·深色不进 MVP（principles.md 硬性）」自述已废止——principles.md 从未载有该硬性条款，属陈旧引用（迁移 Plan C-2 定谳）

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
- **对比度必须配对声明所对底面**：同一文字色在白卡、底纸与竖栏底上的比值不同（可差 0.4 以上），只写数字不写底面的声明无法复核，也无法判定是否达标。多面消费的色值以**最严面**为准。
- 主操作使用 ink，不占用红/琥珀/蓝/绿/朱的状态预算。
- 层级优先用字号、字重、文字明度、线重和间距表达，背景色块是最后手段。
- **双主题**：浅＝刻本印页宗，深＝磁青宗。两宗是同一套语义在两种纸温下的取值，不是两套设计语言——同件同语义，切换只发生在 token 层（`[data-theme]`），组件与版式零分支。语义 `*.fg` 双宗各自复算至 WCAG AA，数据区静止不因主题而异。
- **记号色古、交互语义色今**：与「形越古，词越要今」同构。朱／红／琥珀承自文书传统，取版本目录学的纸墨气质；链接、修订新增、已确认、焦点环是现代交互语义，版本学无对应记号，故沿用现行蓝绿，不硬造古色。

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

### 10. 线级语法

线重即层级语义，不是装饰。均一 1px 单线不表达任何结构信息，是必须替换的对象。

- 主界（面板边界、区段分隔、工作面外框）用**文武线**：粗细双线错落，取刻本框廓的结构性语汇。
- 次界（行分隔、单元格网格、内层容器）用**乌丝细线**。
- 线宽只取 `rule.major` / `rule.minor` 两档，间距取 `rule.gap`；组件内不得散落 px 字面量。
- 文武线以「元素 border + `::after` border」两线实现，零 gradient、零 box-shadow。
- 线重不参与动画（`border-width` 不在动效四属性白名单内），层级变化随语义状态 0ms 硬切。
- 掐边花纹（回纹/云纹/缠枝类）一律拒——纯装饰且与数据区静止相冲。边框感只走文武线与四周双边，几何抽象零具象。

### 11. 命名与宿主边界

通用组件和 token 使用领域无关名称。法律或 PM 词表、字段解释与 renderer 住垂类包；desktop 只提供通用宿主机制。

### 激进度梯度（2026-07-18 拍板）

设计激进度与裁决距离成反比，三层定档：**Pages 最前卫**（先锋实验田，探边界后经门回迁）；**schema 表最保守**（版式来自编排的穷举与凡例，承载裁决与信任，零冒险——数据区静止、语义色稀缺、单锚点纪律均由此派生）；**agent 本体居间**（壳的导航/chrome/过渡有作者性但不抢 schema 的庄重，以免产品被轻视）。任何视觉决策先问「离裁决多远」，再定敢用多少新意。

## 三、token 用法语义（tokens.json 描述派生）

- `color.bg.app` = `#F7F8FA` — 底纸（L0 画布/chat 地）：冷白纸，三级台阶最浅。新锚 #232B38 H≈217° 派生；原型明文「中性偏冷·禁米黄」
- `color.bg.surface` = `#F2F4F7` — 竖栏容器底（左栏/右栏收敛条）：三级台阶中层，比底纸略深
- `color.bg.raised` = `#FFFFFF` — 白卡最亮：内容卡片/文书纸面/composer 输入纸
- `color.bg.hover` = `#E6E8EC` — 行/项悬停底：冷调，在 surface 与 raised 上均可辨。出处 color-mix(in srgb, text.primary 6%, bg.surface)——B1 实测覆核修正 B0 自拟 Q6：G6 图主题渲染到 canvas 无法消费 CSS color-mix，且 assert-graph-theme 读 .value 字面量，故派生式降为出处记录、解析值为真值
- `color.bg.controlHover` = `#DDE0E4` — 扁平按钮 hover 深色块，与 selected 分离；CSS --control-hover。出处 color-mix(in srgb, text.primary 10%, bg.surface)
- `color.bg.selected` = `#D9E3F6` — 选中项底：蓝感强于 hover 族（B−R=29，hover 为 6），不占语义色预算。出处 color-mix(in srgb, semantic.blue.graphic 12%, bg.surface)
- `color.text.primary` = `#232B38` — 正文与标题。刻本墨色，拒纯黑与暖灰（docs/design/principles.md 采纳）
- `color.text.secondary` = `#55617A` — 次级说明、标签。对 bg.raised #FFFFFF 6.22:1 / 对 bg.surface #F2F4F7 5.64:1，最严面达 AA 正文档
- `color.text.tertiary` = `#637083` — 元信息、占位符（辅助文字）。AA 缺口已闭合（2026-07-19 定谳·值面复审）：三面 5.0288 / 4.7324 / 4.5640（raised / app / surface），**最严面 4.5640 过 AA 正文 4.5**。取值法＝沿中性阶既有色相等比压暗，H 与锚色同源、B≥R 冷调律不破。闭合前该位三面均低于 4.5（最严面约为现值的 0.84 倍），字号升档与轨位调整两条路已实测排除：前者要把 meta 抬到 WCAG large 门槛（≥18.66px）等于废掉 meta 档本身，后者抹平中性阶第三声部。代价如实登记——与 secondary 的明度间距由约 9.6 个 L 点收窄至约 4.5 个，中性阶第三、四档自此贴近；**退役值不在此复述**（判例：只述比值）。**深宗不随动**：themes.dark.text.tertiary 保持其原值（活值，不入退役黑名单），双宗共用中性就此拆分
- `color.text.disabled` = `#8A94A8` — 禁用态文字。H≈217° 同源
- `color.text.inverse` = `#F7F8FA` — 深底（主按钮）上的文字：冷白（=bg.app）
- `color.border.hairline` = `#D5DAE3` — 全站默认描边与网格线：1px 单色无影（docs/design/principles.md 采纳），H≈217° 同源
- `color.border.strong` = `#C3CAD6` — 输入框、需要更强边界的容器。H≈217° 同源
- `color.border.focus` = `#2563EB` — 键盘焦点环，复用 revision.insert 色相（预算内复用）
- `color.action.primaryBg` = `#232B38` — 主按钮底 = ink。主操作不占语义色预算（vercel 黑按钮范式）
- `color.action.link` = `#2563EB` — 链接/溯源跳转。与 revision.insert 同色相，蓝 = 可点击/新增，符合 Word 心智
- `color.semantic` — 语义色预算全表。每项拆为 graphic（线体/图形，保留高纯度原色）与 fg（12px 文本，按对应 bg 复算至 WCAG AA）双轨；色相总数仍为 4（红/琥珀/蓝/绿）+ 中性板岩灰。tint（*.bg 浅底）只许用于徽章/chip/角标/修订字符底纹/AI callout，禁止作任何数据卡片或列行的背景——数据容器永远纯白底，状态由法理之线表达（划界见本节 tint 条款与 principles.md §2）
- `color.semantic.tier` — 信源分级角标（docs/decisions/ADR-003-evidence-and-anchors.md：A 官方权威 / B 私域维护库 / C 开放网络参考）
- `color.semantic.tier.a` = `graphic #16A34A · fg #15803D · bg #F0FDF4` — 已核验权威源
- `color.semantic.tier.b` = `graphic #55617A · fg #55617A · bg #F2F4F7` — 库内维护源，可信中性
- `color.semantic.tier.c` = `graphic #8F6420 · fg #8F6420 · bg #FAF3E6` — 网络参考，未经核验须人工确认
- `color.semantic.severity` — 风险/问题等级
- `color.semantic.severity.high` = `graphic #A83226 · fg #A83226 · bg #FBEBE9` — 高危。法理之线保留拍板红
- `color.semantic.severity.medium` = `graphic #8F6420 · fg #8F6420 · bg #FAF3E6` — 中危
- `color.semantic.severity.low` = `graphic #55617A · fg #55617A · bg #F2F4F7` — 低危 = 中性灰，刻意不占彩色预算
- `color.semantic.revision` — 修订痕迹。忠实 Word 修订心智：红删蓝增（docs/design/principles.md 裁定，Loom-Diff 半透明方案已否决）
- `color.semantic.revision.insert` = `graphic #2563EB · fg #1D4ED8 · bg #EFF6FF` — 新增文字：蓝 + 下划线。法理之线保留拍板蓝
- `color.semantic.revision.delete` = `graphic #A83226 · fg #A83226 · bg #FBEBE9` — 删除文字：红 + 删除线，字形保留可核对
- `color.semantic.gate` — 确认门禁三态，与 schema DispositionStatus 枚举一一对应（pending/confirmed/rejected）
- `color.semantic.gate.pending` = `graphic #8F6420 · fg #8F6420 · bg #FAF3E6` — 待确认
- `color.semantic.gate.confirmed` = `graphic #16A34A · fg #15803D · bg #F0FDF4` — 已确认。法理之线保留拍板绿
- `color.semantic.gate.rejected` = `graphic #55617A · fg #55617A · bg #F2F4F7` — 已驳回 = 退出视觉舞台，中性灰非红（驳回是处置不是错误）
- `color.semantic.usage` — 状态条用量圆盘三态（docs/design/principles.md）
- `color.semantic.usage.critical` = `graphic #A83226 · fg #A83226` — 红色态直接接一键续行按钮，文案用办案阶段心智
- `color.semantic.provenance` — 生成与确定的视觉区隔（docs/design/principles.md）：AI 生成的解释性文字 = sans 字族 + generated 冷灰底；工具核验结果/原文引语/结构化引用 = mono 字族 + verified 冷灰蓝底。两条通道的样式恒定，不得混用，不得用彩色表达（彩色预算属于语义状态）
- `color.semantic.provenance.generatedFont` = `ui` — AI 解释文字：功能轨（工具字）+ text.secondary，搭配 generatedBg。B2-0 前称 sans
- `color.semantic.provenance.generatedBg` = `#F7F8FA` — AI callout 无线底纹：复用 bg.app 底纸值（白卡上的微差底），不占语义色预算
- `color.semantic.provenance.verifiedBg` = `#F0F4FE` — 核验内容底纹：冷灰蓝（蓝感强于 generatedBg，双轨可辨），叠于 bg.raised 之上，radius.sm
- `color.semantic.provenance.verifiedFont` = `mono` — 核验内容（引语、编号、核验结果值）用 mono；伴随的文件名链接保持功能轨
- `color.line` — 签名动作「法理之线」专用图形色（完整规格见 signature-line.md）。文字不得消费本组值，须消费 semantic.*.fg。封闭集六色（2026-07-19 拍板由五扩六）——封闭是设计法，基数不是：封闭集保护的是「每色有语义」，不是「恰好五个」；经拍板的语义扩容是封闭集的正常演化，无语义的加色才是它要挡的。机器门：assert-signature-line.mjs
- `color.line.attention` = `#8F6420` — 补全态：待人处理/未核验
- `color.line.neutral` = `#55617A` — 处置态：已驳回 = 退出工作集；低危待处理无线，严重度由等级徽章表达
- `color.line.settled` = `#BE4B2F` — 朱＝印记色，非状态色（2026-07-19 拍板）。绿保持全部既有语义位（gate.confirmed/tier.a——系统与权威的确认「状态」），朱只出现在人工裁决留下印记之处：法理之线的落定态与落定章。分工而非竞争——绿答「它处于什么态」，朱答「谁把它按下去的」。出现处必须绑定已落定处置数据态，无落定数据的朱即违例
- `themes.dark` — 磁青宗 · 产品壳 dark theme（与站同源）。写经传统的深靛蓝纸，冷色古典脉
- `themes.dark.bg.app` = `#0F1622` — 底纸。原型最高频底（18×）
- `themes.dark.bg.surface` = `#16202F` — 竖栏容器底，台阶二
- `themes.dark.bg.raised` = `#223047` — 浮卡，台阶三。语义 fg 复算以本值为最严基准
- `themes.dark.text.primary` = `#E4E9F1` — 正文与标题。对底纸 14.87:1
- `themes.dark.text.secondary` = `#A9B4C6` — 次级。对底纸 8.66:1
- `themes.dark.text.tertiary` = `#6E7C92` — 元信息。对底纸 4.28:1。**双宗此位已拆分**（2026-07-19 定谳）：浅宗随 AA 闭合压暗，深宗保持本值——深底上本值对比充裕，无缺口可闭，故不随动；本值为活值，不入退役黑名单
- `themes.dark.text.disabled` = `#4C5A70` — B0 自拟：禁用态，取自本宗中性阶
- `themes.dark.text.inverse` = `#0F1622` — 浅底（主按钮）上的文字
- `themes.dark.border.hairline` = `#2A3A52` — B0 自拟：默认描边。原型该值用于强边界，此处上移一档以避免与 bg.raised (#223047) 同值碰撞；对 raised ΔL≈3.7，属深色主题常规区间，层级由线重（rule.major）而非对比度承担
- `themes.dark.border.strong` = `#3E5270` — B0 自拟：更强边界
- `themes.dark.border.focus` = `#6A94F1` — B0 自拟：焦点环。现行 #2563EB 在浮卡上仅 2.57:1 不可用，取蓝族 fg 轨。技法仍锁 outline
- `themes.dark.semantic.zhu` = `graphic #D75A3C · fg #E2857A` — 朱＝人工落定/裁决。fg 为原型自带值，对浮卡 4.98:1
- `themes.dark.semantic.red` = `graphic #B5382F · fg #DE8881` — 风险。graphic 在浮卡仅 2.26:1 不可承文，fg 为 B0 自拟派生（保持色相饱和、升明度），对浮卡 5.02:1
- `themes.dark.semantic.amber` = `graphic #C89042 · fg #D9AE6A` — 风险次级。fg 即原型的泥金值——Q7 裁定泥金降格为琥珀 dark-fg 轨，与 AA 复算结果独立吻合（对浮卡 6.46:1）；hero 语义只留站面
- `themes.dark.semantic.blue` = `graphic #2563EB · fg #779EF3` — 修订新增/链接。fg 为 B0 自拟派生，对浮卡 5.04:1
- `themes.dark.semantic.green` = `graphic #16A34A · fg #19B753` — 已确认/权威源。fg 为 B0 自拟派生，对浮卡 5.02:1
- `themes.dark.semantic.slate` = `graphic #6E7C92 · fg #A9B4C6` — B0 自拟：中性语义，取自本宗中性阶
- `themes.dark.provenance.generatedBg` = `#0F1622` — AI 解释底纹＝底纸值
- `themes.dark.provenance.verifiedBg` — B0 自拟
- `rule` — 线级语法（2026-07-19 拍板）：线重即层级语义，替换均一 1px 单线。主界＝文武线（粗细双线错落），次界＝乌丝细线。B0 自拟规格，B1 实测覆核
- `rule.major` = `2` — 主界：面板边界、区段分隔、工作面外框
- `rule.minor` = `1` — 次界：行分隔、单元格网格、内层容器（乌丝细线）
- `rule.gap` = `2` — 文武线粗细两线间距
- `rule.ink` = `{themes.<theme>.border.strong}` — 线色随宗切换
- `typography.family` — 三轨字体制（docs/design/typography-density.md 发凡一）的字栈定值。B2-0 落值，消费面置换随 B2-1。栈内首位即配衬字：CJK 字体的拉丁/数字由该栈自身承担，不得裸回退到系统衬线
- `typography.family.title` = `'Times New Roman', Charter, Times, 'Source Han Serif SC', 'Noto Serif CJK SC', 'Songti SC', serif` — 标题轨：思源宋体 SC（Adobe/Google，SIL OFL 1.1，锁版 2.003R）承中文，视图标题/章节题/hero 级。**拉丁配衬字前置 Times New Roman**（编排义务四条之三）——B2-0 真渲实测：思源 CN 子集的拉丁是宽体（M=0.975em、A=0.718em），裸用会把 PDF/OCR 一类缩写撑成半角方块；Times 跨 macOS/Windows 常驻、数字等宽（0=1=0.500em），且中文公文惯例配衬属**领域语义非审美偏好**（凡例定谳 2026-07-19）；Charter 次位补屏渲（macOS 常驻，M=0.866em、数字等宽 0.556em，屏幕字形优于 Times，Times 缺席时接手而不落到通用衬线）。栈序即配衬序：拉丁命中前位，中文穿透到思源
- `typography.family.body` = `'Times New Roman', Charter, Times, 'Zhuque Fangsong', 'Source Han Serif SC', 'Songti SC', serif` — 文书轨：朱雀仿宋（SIL OFL 1.1，锁版 v0.212 technical preview）承中文，阅读视图正文/引语/修订预览。**拉丁配衬字同前置 Times New Roman**——凡例明载「仿宋拉丁字形弱，不得裸回退」，实测朱雀拉丁 M=0.847em 且数字比例参差（真渲 7.08–10.66px @20px），长文里混排会跳。Charter 同居次位补屏渲。朱雀自带 tnum 可用（十数字齐归 0.450em），但数据字仍归 data 轨守单源。缺字回退思源宋而非系统黑体，保衬线族内一致
- `typography.family.ui` = `-apple-system, 'Segoe UI', 'PingFang SC', 'MiSans', 'Microsoft YaHei', 'Noto Sans SC', 'Helvetica Neue', Arial, sans-serif` — 功能轨：系统 sans 栈**续任**（2026-07-19 争点一·甲案）。显式定性为「工具字」——按钮/标签/输入/导航/设置，不承载气质预算，气质由标题轨与文书轨承载；拒苹方条款只及表达性内容，不及工具位。12px 控件可读性优先。B2-0 前名 `sans`，随三轨制更名
- `typography.family.mono` = `ui-monospace, 'SF Mono', 'JetBrains Mono', Menlo, Consolas, 'Courier New', monospace` — 编号、日期、金额、KBD、徽章、citation 批注专用
- `typography.track` — 三轨字体制的轨位定值（docs/design/typography-density.md 发凡一/二/四）。轨＝承载体裁，非字体别名：同一密度档在不同轨上可有不同光学取值（见 document.reading 的仿宋补偿）
- `typography.track.title` — 双字重梯度定阶（B2-0 实测提值）：400→600。取 600 而非 700——真渲实测 700 在 16–18px 中文下笔画粘连（糊重），600 在 20px 有权威感、16px 仍清晰；400→500 梯度一眼难辨，300 起点在屏上过弱。墨量比（对朱雀 Regular）400=1.15 / 600=1.49。注意思源 CN 为七个静态字族（SemiBold 自成一族名 Source Han Serif CN SemiBold），@font-face 须逐重挂到同一 cssFamily 别名下，见子集清单
- `typography.track.document` — 零粗体律：单字重 400，仿宋无原生粗体，伪粗一律禁（font-synthesis: none 静态门锁）。强调走记号系/字号/墨色，不走加粗。**补偿定值 16px/1.75**（reading 档 sans 基准为 15px/1.6）——B2-0 实测纠正凡例前提：朱雀对系统 CJK sans 的字面积比 0.971（差 2.9%，非「偏窄」），墨量比 0.752（少 24.8%），差在墨不在面，故补偿只升一档字号（+6.7%，字面仅超基准 4%）、主要靠行高（+0.15）给细笔画留白；大幅升字号会让字面超出基准而显臃肿
- `typography.track.ui` — 现行两档法不变（510 见 weight.medium 的变量字体技巧）
- `typography.track.data` — 编号/日期/金额/表格数字。**硬边界：数据字不得走标题/文书轨**——对齐律要单源：两条衬线轨的数字宽度依「拉丁配衬字是否命中」而变（思源 CN 无 tnum 表、朱雀有 tnum 但默认比例参差、前置的 Times 又自带等宽），三种来源混在一起就没有一个可断言的等宽事实。B2-0 真渲实测已证此路不可靠，故数字一律回 mono 轨
- `typography.weight.medium` = `510` — Linear 实测变量字体技巧：避开 600/700 的粗鄙感；非变量字体环境回退 500
- `typography.slot` — 凡例槽位表（docs/design/typography-density.md 起例）B2-0 填值。每槽＝轨 × 密度档 × 字重 × 色槽，四元俱全才可断言 AA；门④ 按本表逐槽实算，故本表即测点清单，加一槽即多一个测点
- `typography.slot.viewTitle` — 视图标题：标题轨重字重一端
- `typography.slot.sectionTitle` — 章节题 / 表头：标题轨轻字重一端，与 viewTitle 构成双字重梯度
- `typography.slot.documentBody` — 文书正文：带仿宋补偿的独立取值（reading 档 sans 基准为 15/1.6），依据见 track.document
- `typography.slot.documentQuote` — 文书引语：同补偿，色降一阶
- `typography.slot.tableText` — 表体文字：功能轨既有法
- `typography.slot.tableNumber` — 表体数字：等宽 + 数据区静止
- `typography.slot.meta` — 元信息 / citation：**缺口已闭合**（2026-07-19 定谳·值面复审）。最严面（bg.surface）实算 4.5640 过 AA 正文 4.5，三面 5.0288 / 4.7324 / 4.5640。此前本槽带 aaStatus=gap 且门④ 断言其「确实未达标」；闭合之日该断言按设计翻红，逼着 aaStatus、断言与 color.text.tertiary 描述三处齐动——机制已如期生效，此为其落痕
- `typography.slot.control` — 按钮 / 输入：功能轨既有法
- `typography.slot.sealNote` — 批注 / 落定章旁文：朱仅印记，消费面随 B4 记号批
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
- `elevation.shadow` = `0 1px 2px rgba(35,43,56,0.045), 0 4px 12px rgba(35,43,56,0.035)` — 藏青双层低透明短距投影；非零投影只可由此 token 单点供给
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
- `motion.longTaskGlow` = `1800ms` — 长任务边框微光流转周期；颜色由既有 ink 透明度生成，不新增色相（principles.md §5 动效）
- `motion.longTaskBreath` = `2000ms` — 骨架呼吸周期
- `motion.dataRegion` = `none` — 硬性：数据区绝对静止（Midday 原则）。表格、时间线、图谱、文书内容不许有任何自发动效
- `component.control` — 按钮与工具控件只消费此组，不在组件内散落尺寸/字重
- `component.preview` — Preview 宿主结构位：语义 gutter、只读滚动轨与右栏三区高度
- `component.signatureLine` — 完整交互规格见 signature-line.md
- `component.kbd` = `fg #55617A · bg #FFFFFF` — 常驻快捷键提示；键帽感由 border-bottom 2px 表达，不用 box-shadow。规格见 typography-density.md
- `component.tierBadge` — 信源角标：16px 方格内 12px 等宽单字母 A/B/C，取 semantic.tier.* 配色
- `component.gridline` — 标题栏、工具栏、面板头、状态条与列表的统一 1px 分隔线
- `component.listRow` — 紧凑数据列表；单行截断，详情靠展开行
- `component.callout` — AI 建议/提醒容器：无线、生成内容底纹、1px 中性边框；不得借用法理之线
- `component.workbenchFrame` — 工作台结构高度；实际可见性由当前宿主布局决定
