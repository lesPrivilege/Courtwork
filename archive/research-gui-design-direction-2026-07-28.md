# GUI 与 Design 方向复核（2026-07-28）

状态：**调研证据，已部分消费**。本件不是现行视觉规范、组件清单或可直接施工的 wireframe；
约束力只来自已吸收到 ADR-022、`docs/design/` 与实现就绪图的条款。目标是给后续 Opus 前端会话
足够好的方向和参考，同时保留它在构图、层级、间距、色阶与微交互上的设计能力。

## 一 · 结论

GUI 成熟与 Design 好看是两件事：

- GUI 机制优先复用成熟件：对话 primitive、stream/Stop、scroll ownership、tool proposal、
  授权、overlay/focus 与恢复状态，不再自行发明一套聊天组件状态机。
- Design 不从成熟 GUI 的默认皮肤继承。Courtwork 的浅色首发应从既有冷色、扁平、版本目录学
  语言自然长出；不是“套一个藏青 SaaS 主题”，也不是把若干参考页面拼贴起来。
- 给 Opus 的任务应是**护栏充分、解空间仍大**：冻结产品气质、功能状态、反例、成熟参考与
  验收方法；不在开工前冻结线框、列宽、每处 padding、最终 hex 或逐帧动画。
- 不另设“先把全部 Design 做完”的前置票。基础 headless 链放行后，`PI-LANE-UI-1` 由 Opus
  同时完成可用 GUI 与浅色 craft pass；深色只守 token 同构和回归，不在首轮另做磁青宗精修。

## 二 · 仓内已经成立的设计真值

现行 [`docs/design/principles.md`](../docs/design/principles.md) 与
[`tokens.json`](../docs/design/tokens.json) 已经给出一套可施工的起点：

- 浅宗三层为冷白底纸、冷灰竖栏、白色内容纸；深色文字与主操作使用 ink，不拿高饱和蓝充当
  通用品牌色。
- 冷中性、语义色稀缺、数据面零投影、同构内容用列表/表格、4/8px 节奏、文武线/乌丝线、
  标题/文书/UI/数据字体分轨都已存在机器真值与门。
- AI 解释与工具核验已有两条视觉通道；状态、授权、修订与来源不能仅靠装饰颜色表达。
- 动效只服务反馈和空间连续性；数据区静止、禁裸 spinner、禁弹簧/抬卡/crossfade。

因此这轮不是推倒重来。需要 Opus 判断的是：在真实 pi lane 状态与实际截图中，哪些现行浅宗
值和布局关系还显得“中灰、便宜、模板化”，再经 token/对比度/全局截图门做有证据的微调。
当前浅宗 `#F7F8FA / #F2F4F7 / #FFFFFF` 与 ink `#232B38` 是起点，不是禁止复议的最终视觉答案。

## 三 · 新旧参考怎样用

| 参考 | 可直接消费 | 只可借鉴 / 明确不取 |
|---|---|---|
| [assistant-ui](https://github.com/assistant-ui/assistant-ui) | MIT；可组合 primitives、自带成熟 chat UX 能力，允许自定义 runtime 与每一像素的皮肤。现行架构只取 `@assistant-ui/react` headless + 公共 external-store seam | 不取 CLI 默认 shadcn/Tailwind 皮层、LocalRuntime、Cloud、AI SDK/OpenCode adapter、thread persistence；这些会重建我方真源 |
| [OpenDesign](https://github.com/qiuyiwu1989-star/opendesign) | 把 Identity/Colors/Typography/Spacing/Surfaces/Layout/Components/Motion/Interaction/Voice/Don'ts 连同截图与 computed style 打成可喂给 agent 的参考包；尤其适合做证据采集与 review checklist | 不把其 catalog、第三方截图、字体、文案、品牌资产或抽出的 token 当 Courtwork 真值。代码 MIT、curated specs CC BY 4.0、原站资产仍归原权利人 |
| [Logue](https://github.com/bitwize-ai/Logue) | 可观察本地优先 Mac 产品如何组织档案、时间、写作与 agent tool/approval 状态；MIT，可作为信息密度与克制观感的参考 | SwiftUI/AppKit 技术栈与 Courtwork React/Tauri 不同；不作组件依赖、架构答案或指定视觉 |
| [Open WebUI 0.11.0](https://github.com/open-webui/open-webui/blob/v0.11.0/CHANGELOG.md) | 2026-07-27 的重做明确强调较窄阅读列、较轻排版、整洁间距、统一菜单/下拉、清晰输入边界和重排设置；这些是成熟聊天面的形态证据 | 不接其 Svelte/Socket.IO/backend，不复制品牌/皮层；其现行许可证也不满足本项目直接复制依赖的口径 |
| [Moda Micro-interaction Pack](https://moda.app/s/0jwxAk3nX6FvxnlB7W11hg) | 只作 button/toggle/progress/success/error/skeleton/notification 等“反馈发生在何时”的短样本 | 分享页未提供可纳入仓库的稳定源码/包与许可；spinner、shimmer、overshoot、弹簧等不能因示例好看越过本仓动效纪律 |
| 旧 Radix / cmdk / dockview 源码调研 | dismiss/focus stack、`ResizeObserver → CSS variable` 高度、panel 比例持久化与显隐生命周期仍可借 | 默认视觉皮肤、命令式 DOM 分隔条与不合本仓状态真源的 store 不取 |
| OpenWork / OpenCode | 证明 tool state、授权、Stop/恢复与 agent GUI 已有成熟形态 | 旧报告的源码坐标与生命周期已漂移；不接 server/SDK/runtime，也不把其 GUI 当指定稿 |

OpenDesign 最值得借的不是某个 pack，而是“参考必须同时带正面证据与 Don'ts”。它的
11-layer spec 自己也把 Don'ts 称为最值钱的一层；对 Courtwork 来说，正向气质与 anti-slop
反例必须一起交给 Opus，才不会把“冷色”自动翻译成常见 AI SaaS。

## 四 · 给 Opus 的方向

### 4.1 首轮气质

- **浅色先行**：亮面更接近冷白，深墨、深控件和关键边界更果断；中间层少而清楚。避免整个
  界面挤在同一片中等藏青或蓝灰里。
- **冷色，不是藏青单色**：冷白、板岩、墨、稀缺的现代蓝/绿与裁决朱各司其职。主操作仍可用
  墨；“高级感”不能靠蓝按钮、蓝卡片和蓝渐变重复制造。
- **扁平**：结构由版式、线级、留白、字阶、密度和遮挡关系承担；数据卡、列表和文书不靠
  shadow stack 抬出层级。
- **版本目录学**：让版本、编号、来源、时间、修订、落定与工作稿状态成为视觉秩序本身。
  这是信息组织，不是贴古籍花纹。
- **反乌托邦**：取克制、制度性、冷静、略带档案终端感的一面；不取 cyberpunk 霓虹、扫描线、
  故障字、网格噪点或“AI 控制中心”布景。
- **陌生化但可用**：作者性来自冷暖关系、字体体裁、线重和信息秩序；普通用户仍看到案件、
  材料、核验、确认、工作稿，不看到 schema/JSON/token/trace。

### 4.2 Opus 自主决定

只要不破坏下节护栏，Opus 可以自行决定并通过真实截图迭代：

- 会话列、workspace 索引、viewer 与辅助信息的构图、比例和响应式收束；
- 信息层级、分组方式、留白、密度、标题/正文/数据轨的具体组合；
- 现行浅色 token 的有证据微调；可以让亮色更亮、深色更深，但不能在组件里散落新色或另造
  第二主题系统；
- tool proposal、运行中、完成、拒绝、失败、uncertain 与恢复状态的组件形态；
- 符合现行动效白名单的 hover/press/overlay/错误反馈；
- 图标是否需要、放在哪里以及何时应完全不用图标；
- 为视觉完整性所需的局部组件拆分和 CSS 组织。

架构不提前给它一张必须照抄的 wireframe，也不要求它复制任何参考站。第一轮实现完成后，以
真实状态截图、键盘路径与 journal/projection 同源证据评审，而不是以“是否像参考图”评审。

### 4.3 不可越过的 anti-slop

- 紫蓝霓虹渐变、玻璃拟态、泛滥圆角/pill、阴影堆叠、卡片汤；
- 每个区块一张 feature card、彩色状态大底、没有决策价值的 dashboard 图；
- 裸 spinner、永久 skeleton/shimmer、弹簧/反弹/抬卡、流式内容 crossfade；
- 装饰网格、噪点、扫描线、回纹、法槌/天平/卷轴等具象法律 kitsch；
- “Ask anything”大标题、漂浮 AI 球、emoji 空态、营销式渐变光团；
- 用藏青覆盖一切来冒充冷色，用仿古词替代现代任务语言；
- 为深色主题写组件级分支，或在首轮把磁青精修变成阻塞浅色可用性的第二项目。

## 五 · GUI 机制与 Design 的分界

assistant-ui 解决的是 primitives 与交互生命周期，不拥有：

- Courtwork journal、projection、预算、授权决定和 workspace 真值；
- terminal/uncertain 的业务语义；
- 视觉 token、字体体裁、线级、密度或产品文案；
- viewer 的安全渲染与 host-mediated 文件边界。

同理，Opus 可以重做外观和组合，但不能把审批按钮点击直接当作批准事实、把 component state
当 journal、把 uncertain 放进 succeeded 索引，或为方便而接 stock runtime。GUI 的自由在展示
层，事实职权仍由 headless 架构承担。

## 六 · 验收只锁状态覆盖，不锁构图答案

Opus 至少要交同一实现的这些真实画面；具体布局由它决定：

| 画面 | 必须看得见的事实 |
|---|---|
| 空会话 | 能开始通用 `.md` work；没有假 dashboard、技术术语或大面积空卡 |
| 运行中 | stream、Stop、预算/进度与 scroll ownership；用户上滚后不被夺回 |
| tool proposal | logical path、动作、风险与逐次允许/拒绝；决定只认 journal 回流 |
| succeeded | 工具结果与 workspace `.md` 索引一致，可打开当前只读 Markdown |
| denied / failed | 原因可读、状态不伪成功、恢复动作明确 |
| uncertain | 不进成功索引；可核验当前文件，但核验不改写历史结果 |
| resume | 断点、历史与新 leg 边界清楚，不伪装成无缝续写 |
| overlay / 键盘 | 焦点进入/归还、Escape、读屏标签、关闭后无 portal 残留 |

截图沿现有 `1180/1280/1440/1600 × 900` 审计矩阵，以浅宗作为 craft 主评；深宗只跑结构、
对比度、溢出与状态可辨的回归烟测，待基础 GUI 放行后再开磁青宗精修。reduced-motion 另留静帧。

## 七 · 明确不形成的前置工作

- 不在 Opus 开工前先画完所有页面、确定全部颜色或冻结像素级组件稿。
- 不单开一个会阻塞 GUI 的“浅色设计完成票”；真实 UI 是取色与密度判断的必要上下文。
- 不因 OpenDesign 可生成 spec 就把其 schema、MCP、Vision pipeline 或素材包接入产品。
- 不因 Logue/Open WebUI/OpenWork 看起来成熟就接它们的 runtime 或复制皮层。
- 不在基础 GUI 里提前实现 revision/diff/Dossier/plan/source/queue 等下一阶段巧思。

这使首轮仍是“成熟机制 + Courtwork 设计语言 + Opus 设计能力”的组合，而不是“架构先把前端
设计完，再让模型照图施工”。
