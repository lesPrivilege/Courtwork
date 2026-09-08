# UX Polish · 按交互片段检索的index

原始 [GUI / Review Runtime Index](../../mvp/execution/work-surface-kit/inputs/courtwork_se_gui_review_runtime_index_2026-09-08.md)保留为检索总表，本页只补本轮材料/局部行为的消费路径。每项对应 [Astra PX切片](astra-polish-plan.md)，不把参考库变成默认依赖。

## 来源等级

| 输入 | 本轮身份 | 可用于什么 |
|---|---|---|
| 固定commit的本地源码与参数 | [fresh历史行为](evidence/motion-index.md)及[整合候选](evidence/current.md)分别绑定 | 找实际selector、token、owner和缺口；不能证明像素/性能通过 |
| 官方文档正文/固定上游源码 | [材质机制](evidence/upstream.md)、[局部motion补证](evidence/motion-official.md) | 复用机制与接口结构；页面访问日不等于安装版本，source示例不等于本地最佳值 |
| 历史UX Polish作者回执 | `ui-design-polish-delivery.md`的固定历史链 | 解释当时选择及当时验证；不复用旧截图作为新整合支的像素证据 |
| BoardUI等总index项目、未读取源码的产品页 | `reference / not_verified` | 按未来真实片段定点补证；不据P0标签或演示宣传宣称成熟实现已核实 |
| Apple Design / Emil等本地转译技能 | heuristics，非Apple官方源码或通用标准 | 提出问题/候选参数；与官方机制、现有语法及本地证据对照后裁取 |

## 材料与空间

| 片段 / 入口 | 应消费的机制 | 当前应核对的落点 | Astra动作 |
|---|---|---|---|
| 平面关系 · PX01 | Atlassian elevation用途、Radix shadow分层；source见材料卷 | WK52的frame/panel/panel-muted与浮层，1px结构边界 | 先检查角色关系，再调值；深色中阴影不能成为唯一边界 |
| 玻璃 · PX02 | 半透明底让backdrop可见，blur作用于背后内容；rim/shadow分别表达边缘与抬升 | tooltip/connection popover/menu/sheet的实际CSS与背景；已有玻璃token不是原生vibrancy | 保留opaque对照，逐项加回alpha/blur/rim/shadow；不把整页文字blur当玻璃 |
| 遮挡 · PX03 | modal背景退出交互，non-modal仍保留工作流；层叠上下文/裁切与视觉高度独立 | native dialog/popover、窄屏surface、scrim、inert与focus范围 | 在同一个工作任务中验证层关系与返回，不以强暗幕制造所有“厚度” |
| 内收与按压 · PX05 | hover/pressed/selected/focus各自承担反馈；内阴影可表达按下但不改几何 | 输入面/quiet-primary按钮/segmented native radios | 保留现有role值，先查state覆盖；非交互内容不随hover浮起 |
| 兼容/性能 · PX12 | reduced-transparency、forced-colors、prefers-contrast与reduced-motion分开；backdrop root与绘制成本 | 全局fallback覆盖是否触及每个真实浮层，而非只存在一条媒体查询 | opaque+可辨border作为可验证退路；透明度/滤镜支持与系统偏好支持分开 |

## 局部 motion 与 hover

| 片段 / 入口 | 已有可复用行为 | 下一步只补什么 |
|---|---|---|
| 消息工具显隐 · PX04 | opacity-only、hover/focus-within、无hover设备可见；不挪正文 | 检查指针从正文进入toolbar、文字选择、键盘焦点和真实触屏是否连续；不是换一套toolbar |
| Popover进退 · PX06 | 既有Floating UI定位与focus返回；[Radix](https://www.radix-ui.com/primitives/docs/components/popover#origin-aware-animations)将避碰后的origin/side提供给动画 | 若当前固定向上位移与实际锚点相反，按求解placement驱动最小变化；快速关闭/重开不留旧层 |
| 视图进入/退出 · PX06/PX08 | [Base UI](https://base-ui.com/react/components/popover)公开start/end/instant状态、origin和可用尺寸；只是机制参考 | 本地需要退出动画时才补生命周期协调；退出过程不能锁输入或把旧面板留作可点击ghost |
| 选择滑块/Tab · PX07 | 原生radio、单thumb位移、tab语义与持久selected区别 | 保留键盘即时性、连续快速切换与re-render后的事实；无必要不加content轮播/整页滑动 |
| 工具提示 · PX10 | 本地指针延迟、focus即时、截断守卫；[Radix Tooltip](https://www.radix-ui.com/primitives/docs/components/tooltip#provider)展示可配置delay/skip-delay机制 | 只在实际误触/闪烁证据下调延迟，检查指针可移入与Escape。tooltip不替代关键对象/后果说明 |
| 导轨连续性 · PX08 | 既有identity/renderer/focus与最新WK41–54宿主规则 | 用选定卡→pane→返回验证，不先制造缺席provider可用假画面，不以视觉关闭代替卸载 |
| 新输出 / 状态 · PX09 | 距底判断、离底保持、jump-latest、焦点/选择恢复；Host状态词 | 保持读旧文不被新输出抢位置；waiting静态，completed/failed按真实事实显示；普通状态cue与已撤销品牌动效分开 |
| 光学校正 · PX11 | 现有glyph/字号/触达体例与冻结Send/Stop anatomy | 微调实际轮廓、baseline、线重与hit area的关系；不因控件重要就放大图标或加持续动画 |

## 参数读取纪律

固定fresh `f8aff61` 的历史/源码卷记录 `--duration-fast:120ms`、`--duration:180ms`、`--ease-out:cubic-bezier(0.2,0,0,1)`，tooltip pointer延迟400ms/离开120ms、focus即时；popover已有4px位移与Floating UI offset8/shift padding8。进入合流绘制时以整合卷与真实computed值复核，不静默沿用旧值。

140ms品牌动词与120/180ms普通控件不自动构成冲突。WK51撤去的是工作区品牌播放；不因此取消所有必要反馈，也不为对齐数字统一重调所有控件。上游示例的scale(0)、0.5/0.6秒、blur20或饱和度增强都不是当前采纳值。

按需要才引入复杂物理motion：现有CSS/native行为能够表达的hover、选择与小浮层继续复用；真实drag/gesture连续重定向需要成立后，再定点比较成熟spring机制。成熟度来自正确时机、可中断、状态一致与阅读连续性，不来自spring数量。

## 撤销与暂缓

- 不恢复旧hero、两处品牌、工作区品牌八动词、waiting微光；不将旧作者回执的运行结果用于新分支验收。
- 不把半透明导航作为必选；WK52已选框架角色，玻璃范围仍由真实浮层用途决定。
- 不为厚重感叠加卡中卡、普遍3D倾斜、深色大阴影或全屏blur；不因截图低存在感而隐藏必要动作。
- BoardUI源码/MCP若未核到，保持待核；不用此前话术把“借鉴三个模式”变成已验证其实现完整性。
- 本轮只读research；PX清单是下一阶段绘制/联调输入，Fable已选画面与本地实际数据契约继续承重。
