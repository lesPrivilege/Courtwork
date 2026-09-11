# UI ecology · 有界一手核验与来源索引

访问日2026-09-11。本轮核验公开官网／官方仓库的定位和可读内容，没有安装组件、MCP、CLI或订阅，没有下载他人截图、录屏或设计文件。`已读`仅说明该行主张有一手文本支持，不代表许可证逐资产审核、性能／可访问性或所有演示已验证。组件数量会变化，不进入 Courtwork 需求或验收标准。

| ID | 一手入口 | 本轮观察／输入差异 | 设计消费位置与状态 |
|---|---|---|---|
| UE-S01 | [Great UI](https://www.great-ui.com/) | 公开页面说明 React/Tailwind 与开放源码，当前显示48项，非输入约40项 | Pages／局部微交互 specimen，非基础系统 |
| UE-S02 | [Fluid Functionalism](https://www.fluidfunctionalism.com/) | 第一次抓取失败，第二次取得页面；功能性 motion 原则仍须在具体例子中核对 | Motion donor 候选，不将口号视为当前状态合同 |
| UE-S03 | [beUI](https://beui.dev/) | 可见 morphing modal、action swap、tabs、toast、expandable action bar；说明 React/Motion/Tailwind 和 shadcn 分发 | 只借状态转换与控件解剖；不导入依赖或默认 blur |
| UE-S04 | [assistant-ui Elements](https://www.assistant-ui.com/elements) | 当前索引143项，非输入122项；含 reasoning、tool、agents、composer、thread 等分类 | thinking/explore/composer/审批的高优先级状态先例；每个本地动作仍查 owner |
| UE-S05 | [BehaviorAI](https://www.behaviorai.eu/) | 可读 model selection、suggested prompts、AI summary，及真实产品交互例子 | 人机协作的语义参考；不采纳其合规或效果营销主张 |
| UE-S06 | [Interface Index](https://interface-index.com/) | B2B/SaaS/desktop 的按元素索引，有 settings、tabs、toolbar、popover 等标签 | 控制面解剖与邻接完整界面优先 |
| UE-S07 | [Page Flows](https://pageflows.com/) | 本轮抓取失败，未取得可核验正文 | flow 线索保留 `unverified`，Design 可用免费层补验证 |
| UE-S08 | [SaaSBoat](https://saasboat.com/) | 取得官方页面，定位为 SaaS 设计研究库 | 真实 flow／微交互线索；具体审计结论不照抄 |
| UE-S09 | [Mobbin](https://mobbin.com/) | 取得官方移动／Web设计参考库页面 | 惯例基线；不作为唯一风格或复制资产源 |
| UE-S10 | [VLLNT UI](https://ui.vllnt.com/) | 公开313 React组件及 JSON descriptor、llms索引、MCP入口的说明 | agent-readable 元数据参考；MCP实际运行未测 |
| UE-S11 | [Hex Core](https://github.com/oscarabcorona/hex-core) | README 明列 whenToUse/whenNotToUse/commonMistakes/accessibilityNotes、recipes、token costs 和规范解析入口 | 改进本地按需索引的候选，不形成选型；不得把其token cost当产品context测量 |
| UE-S12 | [shadcn Registry / MCP](https://ui.shadcn.com/docs/mcp) | 官方文档支持兼容、私有、第三方与namespace registry | 分发协议研究，不称本地已实现自动组件发现 |
| UE-S13 | [Motiq](https://motiq.dev/) | 官方定位为可编辑源的 React/shadcn animated components | workflow surface 的候选池；输入具体 agent/multiplayer 能力未逐项验证 |
| UE-S14 | [Aceternity UI](https://ui.aceternity.com/) | 官方 React/Tailwind 组件页面可读 | Pages表现性 specimen，不把营销动效移植到高频阅读面 |
| UE-S15 | FLUX UI | 输入未给确切URL；同名对象存在歧义 | `unverified`，不猜为某个框架或借用其物理参数 |
| UE-S16 | Velora／Senko／Kokonut 等 | 输入只给名称，未给各具体作品URL | `unverified`；有具体问题及作者原文后再消费 |

## 与已有来源的关系

这不是新的库安装排序。既有 [S11–S22](../../design/sources.md)、[Scout v1/v2](../../design/scout/README.md)、[Home composition](../../design/home-composition-2026-09-10/README.md) 和 [VS donor review](../../execution/2026-09-11-semantic-polish/inventory/donor-review.md)仍是召回入口。assistant-ui、beUI、VLLNT、shadcn 等重复来源本次补充分类与版本观察，不重复设立 grammar authority。

每个 Design 候选须记录本地 semantic slot、source URL、作者／产品、product/concept、实际观察、状态范围、nearest local precedent、依赖／许可未决及 disposition。沿 Scout 既有四值 `ignore / specimen / donor / canonical candidate`；外部来源核验等级与本地设计处置分列，`canonical candidate`也不是接受。

## 第二轮 · Visual Grammar 的七个一手来源（2026-09-11）

本轮只核验用户指定的七个官方设计系统页面；以下是来源主张与 Courtwork 处置的分列记录。`canonical candidate` 仍只表示可进入本地 grammar 评审，不表示已经接受或授权改 token。最近的本地实现先例来自 [precedent-map 的 layer/material 行](../../design/agent-interface-2026-09-10/precedent-map.md#material--blur--glass)、[color governance](../../mvp/execution/work-surface-kit/contracts/color-governance.md) 与 [type-density / reader 行](../../design/agent-interface-2026-09-10/precedent-map.md#reader--document--long-form)。

| ID | 官方一手入口与已核验主张 | 受影响的 grammar／最近本地先例 | 处置与边界 |
|---|---|---|---|
| UE-VG01 | [Carbon color usage](https://carbondesignsystem.com/elements/color/usage/)：layering tokens 有 base、01、02、03 四层；同一层的 field、border、interactive state 应配套；组件放在更高层时消费对应层 token，type/icon 等跨层 token 单独处理。Carbon 的 light theme 以 White/Gray 10 交替叠层，dark theme 随层级变亮；不要把比背景更暗的组件作为 dark theme 的普通层。 | Surface／color；`material-grammar.md`、`surface-hierarchy.md`、`styles.css` 的现有 S/R 层与两处 blur | `canonical candidate`：采纳“语义层 → role token → component state”的解析顺序；只映射 Courtwork 已有 token，不复制 Carbon 色值。高反差 inverse/inline theme 只能登记为明确的 focal moment，不能用来切普通分区。 |
| UE-VG02 | [Atlassian elevation](https://atlassian.design/foundations/elevation)：四个基本层级是 sunken、default、raised、overlay，另有 overflow shadow；raised/overlay 要与对应 shadow 配对。dark mode 中越高的 surface 越亮；sunken 只用于 default backdrop。hover/pressed 可用 surface state token，elevation transition 只适合 default/raised，不能把 overlay transition 当普通小控件动效。 | Surface／state／motion；`surface-hierarchy.md`、`material-grammar.md`、现有 popover/dialog overlay | `canonical candidate`：把 depth 视为空间与状态合同；禁止为了分组随意新增 raised/overlay。复用现有 overlay/scroll evidence，若引入动效须保持轻量、可中断并遵守 reduced-motion。 |
| UE-VG03 | [Material 3 color roles](https://m3.material.io/styles/color/roles)：color roles 是元素与颜色之间的语义连接层；页面提供 primary、secondary、tertiary、error 及其 container/on-role 家族，并用 surface/background、outline 等中性色角色承载容器与内容关系。官方 [Material Web color reference](https://github.com/material-components/material-web/blob/main/docs/theming/color.md) 同样要求 `on-*` 角色承载其容器上的内容，并列出 surface/container 的 mode-aware 角色。 | Color／surface／state；`color-governance.md`、`thread-projection.mjs` 与 `runtime-view.mjs` 的状态投影 | `canonical candidate`：只消费 role/`on-role` 关系，不让组件直接消费原始色阶或任意 hex。Material 的角色命名可作外部 vocabulary，不因此改变 Courtwork 的业务语义或状态 owner。 |
| UE-VG04 | [Radix Colors: understanding the scale](https://www.radix-ui.com/colors/docs/palette-composition/understanding-the-scale)：12 步 scale 明确对应 app/subtle background、normal/hover/active-selected component background、subtle/interactive/focus border、solid/solid-hover background、low/high contrast text；步骤是常用用途而非无例外规则。其 mode alias 与同 scale text pairing 也用于保持跨 light/dark 的可读性。 | Color／state／focus；`color-governance.md`、`icon-controls.md`、已有 selected/focus control states | `specimen`：借用“state 需要角色槽位”的分解方法，不引入 Radix palette 或把数字 1–12 直接变成 Courtwork token。contrast、focus 和 semantic status 仍以本地 contract/evidence 为准。 |
| UE-VG05 | [Apple HIG Materials](https://developer.apple.com/design/human-interface-guidelines/materials)：material 用于 depth/layer/hierarchy；Liquid Glass 形成 controls/navigation 的 distinct functional layer，Apple 明确说不要把它用于 content layer（内容层的 transient slider/toggle 是例外）。standard materials 负责 content layer 的结构；clear Liquid Glass 仅适合 visually rich backgrounds；应按 semantic use case 选材质，而不是按它看起来产生的颜色选。 | Material／surface／accessibility；`material-grammar.md`、`materials-view.mjs`、现有两处生产 blur boundary | `canonical candidate`：Courtwork 的文档、conversation、reader 内容保持 solid/standard content surface；glass 只可在登记的 chrome/transient slot 讨论，且必须有不透明 fallback、legibility 与 reduced-transparency 检查。禁止 glass-on-glass 与把 blur 当品牌装饰。 |
| UE-VG06 | [Fluent 2 Material](https://fluent2.microsoft.design/material)：solid 是最常见的 opaque、mode-aware baseline；Acrylic 是 semi-transparent frosted glass，用于 transient、light-dismiss popovers/menus；Mica 是 active window 的 opaque desktop-tinted material，inactive 时转 neutral；Smoke 用于 modal 下方的 blocking dimming，始终是 translucent black 且不随 mode 改变。页面要求先检查技术限制。 | Material／surface lifetime／state；`material-grammar.md`、popover/inspector 与 dialog overlay 先例 | `canonical candidate`（只采纳 lifetime 语义）：persistent baseline、window/chrome、transient dismissible、blocking modal 必须分开登记；不要把 Acrylic/Mica/Smoke 当同一种 blur。具体 CSS material、性能与 fallback 仍需独立实现证据。 |
| UE-VG07 | [Carbon typography style strategies](https://preview.carbondesignsystem.com/building-blocks/foundations/typography/style-strategies)：productive type set 面向 active task、inputs/forms/controls 与 space efficiency；expressive set 面向 learning/exploration、scanning 与 long-form reading。Carbon 允许按“moment”在产品内 blend 两套 set，也要求在 discrete task/component/region 内保持一致。该页没有提出全局 serif 禁令，也没有把 productive/expressive 等同于全站字体家族切换。 | Type／density；`typography-refinement.md`、`type-density-constraints.md`、reader/markdown precedents | `canonical candidate`：productive/expressive 是 task/region decision，不是全局禁用某一字形分类的依据。若 Courtwork 选择 serif，必须为明确的 reader/editorial semantic slot 定义 token、fallback、overflow 与对比证据；默认控件、表格和 composer 继续消费现有 productive type precedent。 |

### 本轮可直接带入的 Visual Grammar 草案（仍需本地接受）

```text
surface:    canvas → content → raised → overlay
state:      default → hover → pressed/selected → focus
material:   solid baseline | bounded transient blur | blocking scrim
type:       productive task | expressive reading moment
```

这只是把七个来源的共同结构压成检索与评审词汇，不是新增产品 token。任何新 surface、glass、blur、type set 或 state color 仍需命中本地 semantic slot，记录 nearest precedent，并以独立 evidence 通过 review；外部来源不能授予 UI authority。
