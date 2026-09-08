# CourtWork UX polish：blur / material / shadow upstream notes

日期：2026-09-08（Asia/Singapore）。范围只覆盖 Luna 的 surface/material 研究，供 Astra 后续
build 联调；不含 DeepSeek、SE hotplug、runtime 或其它视觉主题研究。

> Astra映射校正：下文引用旧surface-hierarchy的rule-minor和6/8仅是历史来源值，不重新冻结为当前产品token。实际角色按WK52的frame/panel/panel-muted/floating及当前整合支，圆角/边线沿最新体例。官方机制来源与本地映射裁定分别成立。

## 结论先行

CSS 可以做“半透明表面 + 背景像素滤镜 + 阴影/边框”的浏览器近似；它不等同原生
vibrancy，也不等同 Apple Liquid Glass。不要把浏览器效果写成原生材质能力。
优先让不透明、无滤镜的 surface 也成立；透明和 blur 只给确实覆盖内容的浮层或 focal point。
不要默认让 blur 半径逐帧动画；若需要动效，先用静态 blur、表面/opacity 过渡，并保留降级。

## 已核查的官方资料（5 个，均为只读）

1. MDN `backdrop-filter`：<https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/backdrop-filter>
   抓取 2026-09-08；页面标 Baseline 2024，最后修改 2026-04-20。
2. MDN `prefers-reduced-transparency`：<https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/prefers-reduced-transparency>
   抓取 2026-09-08；最后修改 2026-04-20；页面标 Limited availability / Experimental。
3. MDN `forced-colors`：<https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/@media/forced-colors>
   抓取 2026-09-08；最后修改 2026-04-20；页面标 Baseline、跨浏览器自 2022-09。
4. Apple HIG Materials：<https://developer.apple.com/design/human-interface-guidelines/materials>
   抓取 2026-09-08；正文响应只有标题/空壳（3 行），标 `not_verified`，不从 Apple 页外推规则。
5. Atlassian Design Elevation：<https://atlassian.design/foundations/elevation/>
   抓取 2026-09-08；页面无独立版本日期，页脚为 © 2026 Atlassian；正文可读。

## 机制证据与可用边界

### `filter` 与 `backdrop-filter`

MDN 定义 `backdrop-filter` 是把 graphical effect 施加到元素“后面”的像素；元素背景须
透明或部分透明，才能看见效果（MDN §property/§try it，网页行 172–182、196–229）。
对照 CSS 语义：`filter` 处理元素自身已绘制的结果（连同其内容）；`backdrop-filter`
处理元素后方、被它覆盖的像素。这是属性语义对照，不把本次抓取当成单独 `filter` 页面。
过滤范围到最近的 backdrop root 为止；root 之后的内容不受影响（MDN 行 273–287）。
root 包括 html、非 none 的 filter/opacity(<1)/mask/clip-path/backdrop-filter/mix-blend-mode，
以及对这些值的 `will-change`。祖先 `opacity: .9` 会把子 blur 限制在祖先与子元素之间，
常见结果是“已写 blur 却看不见页面背景”。
因此不要在承载 overlay 的祖先上随手放 opacity、filter 或 will-change；先固定边界再验收。
MDN 示例使用半透明背景 + `backdrop-filter: blur(10px)`，可作为结构样例，不是 CourtWork 数值。

该属性的兼容性已明显改善但旧设备/浏览器仍可能不支持；MDN 的 Baseline 2024 不是全历史
环境承诺。实现必须提供 solid surface fallback，并用 `@supports (backdrop-filter: blur(0))`
做能力分支；不要让文字可读性依赖滤镜成功。

### 透明度偏好与 forced colors

MDN 的 `prefers-reduced-transparency` 有 `no-preference` 与 `reduce` 两值；`reduce` 表示
用户要求减少透明/半透明层，理由包括改善对比和可读性（网页行 172–212）。该媒体特性仍
Limited availability / Experimental，不能当作唯一降级开关。候选行为是将半透明 overlay
换成更不透明的同角色 surface，同时关闭 `backdrop-filter`；MDN 示例只把 opacity .4 提到 .8，
不规定 CourtWork 的具体值（网页行 213–236）。

`forced-colors: active` 表示浏览器启用用户选择的有限颜色板；color、background-color、
border-color、outline-color 等会在绘制阶段受系统色控制。MDN 明确 `box-shadow` 和
`text-shadow` 会被强制为 none，非 URL 的 background-image 也会被移除，并可能为文字加
backplate（网页行 182–230）。因此在 forced colors 下，边界不能只靠 shadow/渐变。
MDN 示例把 shadow 对比改成 `border: 2px ButtonText solid`（网页行 245–274）；只做小范围
可读性修补，不为 forced colors 另造完整设计（网页行 238–241）。

### 层级、表面与阴影

Atlassian 将 elevation 分为 sunken/default/raised/overlay，并另列 overflow；surface 与
shadow 一起制造抬升/深度，overflow 表达被裁切的可滚动内容（网页行 57–69、81–95、138–145）。
暗色模式中 shadow 较难看见，较高层 surface 应更亮；raised/overlay 仍配对应 shadow（行 72–78）。
raised 只应有意用于可移动卡或 focal emphasis，边框/留白足够时不要用它来分组（行 115–128）。
overlay 保留给 modal/dialog/dropdown/floating toolbar 等覆盖关系，且应配 overlay surface/shadow（行 129–135）。
hover/pressed 可用表面颜色 token；elevation transition 要少用，且不要与两套状态同时叠加（行 146–164）。
z-index 是堆叠顺序，和相同的 elevation 样式可以分开；不要把 z-index 数字当材质值（行 248–263）。

## 给 Astra 的本地候选建议（待真实页面验收）

沿用 `engineering/design/surface-hierarchy.md`：`--canvas`/`--panel` 做基础平面，
`--panel-muted` + `--rule-minor` 做有界对象/输入；普通列表、usage、trace 不加默认投影。
`--shadow-float` 只映射到已有浮层角色；轻抬升仅给单一焦点或拖动对象，阴影不能独担边缘识别。
候选 overlay 结构：半透明语义 surface + 小范围 `backdrop-filter` + 轻描边 + 已有 float shadow；
同一组件保留 solid `--panel` fallback，几何、内距、radius（已有 6/8）两条路径一致。
建议按角色而不是按效果命名：base / bounded / raised / overlay；elevation 与 z-index 分开命名，
不导入完整第三方六档，也不混用另一套阴影。
在 `prefers-reduced-transparency: reduce` 下，overlay 变不透明并移除 blur；即便媒体查询不支持，
`@supports` fallback 仍应可读。对 `forced-colors: active`，移除 shadow 依赖并保留语义边框/系统色。
opacity 只负责视觉过渡；显隐还要同步可交互性、焦点与语义状态（如 hidden/inert/aria 状态），
否则 `opacity: 0` 的元素仍可能占位、拦截指针或接收焦点；同时它本身还是 backdrop root 触发条件。
不要把 overlay 的祖先设 `opacity < 1`；优先在 overlay 自己的 background alpha 表达透明层。

## 兼容、性能、a11y 验收清单

确认无 backdrop 支持、旧浏览器、暗色、forced colors、reduced transparency 时文字/焦点/边界仍清楚。
大面积 fixed backdrop blur、多个嵌套 blur、滚动中持续重算可能带来合成和 GPU 成本；先限制数量、面积和
滤镜半径，避免 blur 半径逐帧动画。需要过渡时优先 opacity 或离散 surface token，且遵循现有低运动规则。
在 390px 与桌面宽度、长错误/长名称、打开关闭浮层和恢复焦点场景检查；验证正文仍能表达状态和后果。
本资料只支持“可采用的浏览器机制与降级边界”，不支持声称实现了原生 vibrancy/Liquid Glass，
也不支持为所有卡片统一加玻璃、阴影或透明度。

## 既有本地固定指针（未另计入上面 5 个网页来源）

本地 `surface-hierarchy.md` 已固定 Radix shadow CSS SHA `1faff10ac26ae17f09944d418c6949b93fc6b566`，
仅作为取值来源：<https://github.com/radix-ui/themes/blob/1faff10ac26ae17f09944d418c6949b93fc6b566/packages/radix-ui-themes/src/styles/tokens/shadow.css>。
本次不安装、改写或扩展该来源；若 Astra 采用，仍须映射到已有语义角色并做真实像素验收。
