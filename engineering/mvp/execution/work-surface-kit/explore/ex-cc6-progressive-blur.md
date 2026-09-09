# EX-CC6 · Progressive blur / mask 扩大采样，只读探索

状态：只读 explore，Sonnet，2026-09-09，派单见 [intake-round-3 §4ac WK-124 (e)](../intake-round-3.md)。

只读声明：本卷只读 `/private/tmp/se-fable-r4d`（基线 `main` `5ea5ff0`，HEAD `2a94287`）内的文档与 `app/web/styles.css`、`tools/lint-materials.mjs`、`evidence/cc-s-main-integration-20260909/`。为量测代价，在端口 8904（数据目录 `/private/tmp/se-fable-r4d-excc6-data`，自建、已删除）启动过一次本树的应用，local-fake 模式，未配置任何真实 provider、未读取任何凭据；量测用的 CSS 变体只在浏览器运行时通过注入的 `<style>` 标签生效，从未写回 `app/web/styles.css`；lint 的登记/回退验证用的是拷到 scratch 目录的 `styles.css` 副本与 `lint-materials.mjs` 副本，产品树内 `tools/lint-materials.mjs` 一字未动。未修改任何产品代码、未 `git commit`。全程结束后已停止 8904 上的 server 与 CDP 的 headless Chrome（`ps aux` 复查干净），已删除自建数据目录。链接与 Atlas/Josh Comeau 原文一律标"用户转交，未核验"；结论标 file:line。

## 1 · 现状：三个候选面今天的材质

| 面 | 今天的材质 | 与滚动内容的关系 | `backdrop-filter` | reduced-transparency 回退 | 分割线（`--line`/`--line-strong`） |
|---|---|---|---|---|---|
| jump-latest 按钮 `.jump-latest-button` | 已是 Chrome glass：`background: var(--glass)` + `backdrop-filter: blur(var(--blur-chrome))`（`app/web/styles.css:1274-1276`），`box-shadow: var(--rim), var(--shadow-float)`（:1278） | `position: absolute`，浮在 `.message-stream` 滚动内容之上（:1269-1272） | 有，已登记（`tools/lint-materials.mjs:27`） | 有，`:1285-1291`，`background: var(--float)` + 两条 `backdrop-filter: none` | `border: 1px solid var(--line)`（:1277），细描边不是分割线角色 |
| Work 态沉底 composer `.composer-form` | 实色 `--float`（`styles.css:1307`），`box-shadow: var(--shadow-float)`（:1308），**今天不是玻璃**，只是候选 | `.composer-area` 是 `flex: none` 的独立带（:1296-1298），composer 本身不随 `.message-stream` 滚动，是常驻在滚动容器下方的静态面板 | 无 | 不适用（未用半透明背景，lint 不会要求） | `border: 1px solid var(--line-strong)`（:1303）整圈描边（input 角色，非分割线） |
| 滚动时的主区 header 带 `.chat-header` | 实色 `--panel`（`app/web/styles.css:790` 一带的 `.conversation-body`/`.chat-header` 结构；`.chat-header` 自身背景继承 `--panel`，`:795-802`），今天不随滚动状态切换，**没有 JS 侦测滚动**（`app/web`、`app/web/*.mjs` 内未见任何监听 `.message-stream`/`.conversation-body` scroll 事件后给 `.chat-header` 加类的代码） | 常驻高度 `var(--band-top)`（56/52px，:802），与下方 `.message-stream` 各自滚动互不联动 | 无 | 不适用 | `border-bottom: 1px solid var(--line)`（:801），一条固定分隔线，今天就是"用分割线代替消散"的现状 |

结论：三个候选面里只有 jump-latest 已经是登记过、回退齐全的 Chrome glass；composer 与 header 都还是 WK-101 里点名的"候选"，今天是纯实色 + 固定 1px `--line`/`--line-strong` 描边，lint-materials **对这两处不会报错**（因为它们没有 `backdrop-filter` 也没有 `--glass`/`--glass-muted` 背景，检查 1、2 都不触发）。这意味着 FE-05 要做的不是"改玻璃"，是"从零决定要不要让它们进入 Chrome 层"。

## 2 · 实现路径

三种做法对应用户转交材料 A 节的"progressive blur"与"mask 扩大采样"，落到 `styles.css` 的三种写法。全部只加在登记类名内测试，未改产品文件，验证方式见 §3。

### (a) 多层叠加不同 blur 的伪元素 + `mask-image` 渐变

```css
.chat-header { position: relative; }
.chat-header::before, .chat-header::after {
  content: ""; position: absolute; inset: 0 0 -12px 0; pointer-events: none;
  backdrop-filter: blur(var(--blur-chrome));
  mask-image: linear-gradient(to bottom, black 40%, transparent 100%);
}
.chat-header::after { inset: 0 0 -24px 0; mask-image: linear-gradient(to bottom, black 20%, transparent 80%); }
```

实测（见 §3）：这条路径**只有当每一层都用同一个 `var(--blur-chrome)`（或都用 `var(--blur-transient)`）时才能过 `lint-materials`**——闭集只有两个 token，check 1 逐条规则读 `blur()` 里的 `var()` 名字，只要出现一个不是这两个 token 的值（哪怕是 `4px`/`8px` 这种没有 `var()` 包裹的字面量）就判违规。也就是说，在今天的 WK-102 闭集下，**多层伪元素做不出"半径沿空间连续变化"的字面意义**：能做的只是同一个 blur 半径、经 `mask-image` 分层裁出不同的可见范围，视觉上比单层稍微更"糊得均匀"，但没有额外的自由度——多花的是合成层数（每层一次独立的 backdrop 采样 + 光栅化），不是多花在换来更真实的连续感上。若要真的让半径本身分档变化，需要先在 WK-102 上开一个新档（例如 `--blur-chrome-2: 6px`），这是治理层面的改动，不是这次可以在 CSS 里悄悄做的事。

### (b) 单层 `backdrop-filter` + `mask-image` 渐变（视觉上近似）

```css
.chat-header {
  background: var(--glass);
  backdrop-filter: blur(var(--blur-chrome));
  mask-image: linear-gradient(to bottom, black 70%, transparent 100%);
}
@media (prefers-reduced-transparency: reduce) {
  .chat-header {
    background: var(--float);
    backdrop-filter: none;
    /* 必须同时清 mask-image，见 §4 冲突点 */
    mask-image: none;
  }
}
```

这是**唯一一条能在今天的闭集下不做任何治理层面改动就过 lint 的路径**（§3 有 dry-run 证据）：只用一个 `--blur-chrome`，`mask-image` 不在 lint 的检查范围内。它不是字面意义的"模糊强度连续变化"——真正的 blur 半径全程不变，变的是这块玻璃本身的可见度（alpha）沿竖直方向从不透明降到 0。用户转交材料里 Josh Comeau 的"扩大采样再 mask 掉"讲的是另一件事（见 (d)），这里的"progressive"只是"渐隐"，两者常被混为一谈，需要在裁定里分清楚。

### (c) `filter` 在内容层（不可行）

把 `filter: blur()` 直接加到滚动内容本身（例如 `.message-stream` 顶部一段），让文字在快滑出 header 时自己模糊，而不是让 header 玻璃化。判定**不可行**，三点理由：
1. WK-124 (b) 明文只许 `filter: blur()` 用于"小型 text / icon 状态"的 transition/focus blur，不许用在大片可滚动正文——把用户正在阅读的消息文字永久性模糊掉，直接违反可读性，也不是"消散替代分割线"的本意（分割线消散的是**边界**，不是**内容**）。
2. 性能：`filter` 作用于内容层意味着每次滚动都要重新光栅化被模糊的文字节点（还可能是富文本/代码块），比 `backdrop-filter` 采样一块固定区域更贵，且没有办法用 `mask-image` 只让"即将划过 header 的那几行"清晰度打折——CSS `filter` 不支持按位置渐变半径，做不出"离 header 越近越糊"的效果，除非配合 JS 逐帧改多个元素的 `filter` 值（等于自己实现一套 scroll-driven 动画，明确撞上 WK-124"禁止动画 backdrop-filter"背后的性能顾虑，且是新写的运行时逻辑，不是纯 CSS）。
3. 交互：内容层本身可能带链接、按钮（消息里的引用、工具调用行），模糊掉会连带模糊可点击区域的可辨识度，且模糊态下命中区判定不变，视觉与行为脱节。

### (d) mask 扩大采样（Josh Comeau 式）

```css
.chat-header {
  position: relative;
  overflow: visible; /* 让扩出去的伪元素不被裁掉 */
}
.chat-header::before {
  content: ""; position: absolute;
  top: -24px; left: -24px; right: -24px; bottom: -24px; /* 向外扩 24px 再采样 */
  backdrop-filter: blur(var(--blur-chrome));
  mask-image: linear-gradient(to bottom, transparent 0, black 24px, black calc(100% - 24px), transparent 100%);
  pointer-events: none;
}
```

这一条是"扩大采样区域"本身，和 (a)/(b) 是可以叠加的两个维度（扩不扩采样区 × 用几层）。扩大采样只是让 `backdrop-filter` 的取样矩形比元素自己的盒子大，附近（header 上边界之外，也就是被 header 遮住之前的那一小段消息）也参与模糊计算，视觉上让 header 的玻璃"吃进"更多周围色彩，边缘不那么生硬。代价：`.chat-header` 今天是 `overflow: hidden` 语境下的普通 flex 子项（没有显式 `overflow`），扩出去的伪元素若被祖先的 `overflow: hidden`（`.chat-column`/`.app-shell` 一类容器，需 FE-05 实测逐层确认）裁掉就等于白扩；且扩出的区域会覆盖到 header 上方本不属于它的像素（这个产品里 header 就是最顶，desktop shell 下还有 52px 的窗口控件安全区，见 §4）。

## 3 · 与 `--blur-chrome` 12 / `--glass-alpha-chrome` 0.86 的组合，及 lint 实测

对 §2(a)(b) 做了 dry-run（用 `app/web/styles.css` 的 scratch 拷贝 + 附加规则，`tools/lint-materials.mjs` 的 scratch 拷贝只加一行登记，未改产品文件）：

- (b) 单层 + mask，`.chat-header` 未登记、无回退时：`lint-materials` 报两条——"声明了 backdrop-filter，但不在 WK-101 登记表内"与"是半透明表面，但没有 …reduce 回退"。补上登记（`REGISTERED` 加一行 `[".chat-header", {layer:"chrome", blur:"--blur-chrome"}]`，与 `tools/lint-materials.mjs:27` 同一形状）与 §2(b) 的回退块后，**lint 通过**。
- (a) 多层伪元素，`.chat-header::before`/`::after` 未登记时同样两条 × 2（选择器不是字符串精确匹配 `.chat-header`，伪元素要单独登记，见 §4）。补齐登记 + 每层各自的 `background: var(--float); backdrop-filter: none;` 回退后，**仅当两层都用同一个 `--blur-chrome`** 才能过——用 `4px`/`8px` 字面量会被判"blur 不是 --blur-chrome / --blur-transient"。

`--glass-alpha-chrome`（WK-104 提到的浅 0.86 起）今天在 styles.css 里还是共用的 `--glass-alpha`（:38/149，浅/深两宗各一份），FE-01 尚未拆出 chrome/transient 两档 alpha（这是 WK-104 留给 FE-05 的第二件事，和 blur 拆分是同一批 token 工作，本卷不重复展开）。

## 4 · 冲突点

逐条给"可行 / 需改约 / 不可行"：

**WK-94 分割线角色（四种边框角色闭集）—— 可行，且不改闭集。** WK-94 的四角色闭集是 input / selected / floating / error（[ui-composition-standard.md](../../../../design/ui-composition-standard.md) "Border 审计"一节）；`--line` 分隔线**从未进过**这个闭集，文档自己写明"未收口，留后续单"，SH-2 与 WK-94 在"重复行分隔"上尚未和解。也就是说，用消散替代 `.chat-header` 的 `border-bottom: 1px solid var(--line)`（`styles.css:801`）不会打开或关闭四角色闭集里的任何一格——它动的是闭集之外那"约六十处"未决分隔线里的一处，不是新增第五种边框角色。真正需要裁的是另一件事：**替换之后这条线算不算被"收口"**，即这一次改动要不要顺手在文档里把 header 这一处从"待裁六十处"里划掉。

**WK-101 glass-on-glass（jump-latest 已是 chrome glass，其上不再有 transient）—— 需改约，视具体组合而定。** jump-latest 是绝对定位、浮在 `.message-stream` 内部（`styles.css:1269-1272`），header 是常驻在滚动容器上方的独立带（:795-802），composer 在滚动容器下方（:1296-1298）——三者在页面几何上互不重叠，今天**不存在**三者中任意两个同时可见且堆叠的场景，所以本身不构成 glass-on-glass。但 WK-119 已经指出 `.context-popover`（Transient）可能弹出在 `.jump-latest-button`（Chrome glass）之上，是"运行时未验"的反例；如果 header 也变成 Chrome glass，且未来有 Transient 面板（例如全局搜索、通知）钉在顶部而不是右上角固定位置，就会新增一条需要在 FE-05 消融表里核对的组合。本卷判定：**只要三个候选面各自不叠加，可行；一旦叠加，按 WK-104 既定规则（transient 比 chrome 更不透明一档，二者只留一层 glass）处理，不需要为 progressive/mask 另开一套禁令**。

**WK-102 登记类名（新伪元素如何登记、lint 是否能识别）—— 需改约，且是本次最实的一条。** `REGISTERED` 是选择器字符串到条目的精确匹配 `Map`（`tools/lint-materials.mjs:26-29`），伪元素选择器（`.chat-header::before`）与基类选择器（`.chat-header`）是两个不同的字符串键，必须逐一登记，§3 的 dry-run 已经验证。这不是 lint 脚本本身的缺陷——它就是被设计成"新增一处就必须先在这里写下它是 Chrome 还是 Transient"（`tools/lint-materials.mjs:24-25` 的注释）——但对 (a) 多层伪元素方案，意味着每加一层就多一行登记 + 多一段回退，登记表会从两条涨到五条以上（jump-latest、context-popover、chat-header、chat-header::before、chat-header::after……）。这本身可控，只是 FE-05 落地时要记得：**lint 不认组件、只认精确选择器**，多层方案的登记成本随层数线性增长。

**FN-28（消散不能表达状态）—— 可行，不触碰。** FN-28 讲的是"unknown ≠ failed ≠ success，状态不能只靠装饰表达"（[frontend-layering-spec.md:123](../../../../design/frontend-layering-spec.md)）。Progressive blur / mask 扩采样在这三个候选面上做的是**纯粹的视觉边界处理**（内容划过 chrome 时如何过渡），不承载任何运行状态（run 的 waiting/running/failed 不会因为 header 是否玻璃化而改变呈现），也没有把"是否消散"和某个状态挂钩。只要实现时不把它接到状态判断上（例如不要用"运行中就加深模糊"这种写法），就不会撞到 FN-28。

**安全区（header 带在桌面宿主 52px 惰性带下的关系）—— 需改约，且与 §2(d) 直接相关。** desktop shell 下 `--band-top` 是 52px（`styles.css:4068`，普通浏览器是 56px，`:286`），[ui-composition-standard.md](../../../../design/ui-composition-standard.md) 的尺寸 token 表写明"window-control 安全区 80 × `--band-top`，宿主的窗口按钮区，产品不在其中放控件"。§2(d) 的"向外扩采样"如果扩的方向是向上（header 是页面最顶带，没有更多空间可扩，扩的实际效果是让伪元素的采样矩形覆盖到安全区那 80×52 的窗口按钮区域）——采样本身只读取像素颜色用于 blur，不放控件、不接收指针事件（`pointer-events: none`），理论上不违反"不在其中放控件"这条硬约束；但需要在桌面宿主下实测一次，确认扩出的伪元素没有意外抢到该区域的点击（`pointer-events: none` 加上仍需实机验证，本卷未启动桌面宿主，只跑了普通浏览器）。

## 5 · 代价：CDP 帧时间量测

### 方法

- 端口 8904，local-fake，seed 一个 18 轮问答的会话（`.message-stream` 撑到约 10700px 高，足够滚 1000px）。
- 复用 `evidence/cc-s-main-integration-20260909/browser.mjs` 原样（未改一行）起 headless Chrome（`--headless=new --disable-gpu`，CDP 19980/19981），1440×900，浅/深宗各跑一次 `Emulation.setEmulatedMedia`。
- 三种变体通过运行时注入 `<style id="excc6-variant">` 到 `.chat-header` 上生效，测完即移除；baseline 是不注入任何东西的现状。
- 每个变体在 `.message-stream` 上用 `requestAnimationFrame` 驱动 `scrollTop` 从 0 匀速滚到 1000px，耗时约 1000ms。

### 第一次尝试：`requestAnimationFrame` 时间戳 —— 无信号，判定为噪声

三种变体、深浅两宗，帧间隔全部落在同一个 16.7ms（60Hz 节拍），逐帧数值几乎逐位相同，没有任何一次掉帧。这不是"三种做法性能相同"的证据，而是**这套 headless 环境测不出来**：`browser.mjs` 硬编码 `--disable-gpu`（`evidence/cc-s-main-integration-20260909/browser.mjs:21`），软件合成路径下 headless Chrome 的 `requestAnimationFrame` 节拍由虚拟 vsync 钟驱动，不随实际光栅/合成耗时抖动——`backdrop-filter` 的真实开销发生在合成器/光栅线程，这条节拍完全屏蔽了它。

### 第二次尝试：`Performance.getMetrics` 前后差值（`TaskDuration`/`LayoutCount`/`RecalcStyleCount`）—— 同样不可靠，但原因不同

同一套滚动，每变体×宗别跑 3 次取增量：

| 变体 | 宗别 | TaskDuration 中位（ms） | LayoutCount | RecalcStyleCount |
|---|---|---|---|---|
| baseline | 浅/深 | 18.45 / 14.77 | 0 | 0–2 |
| (b) 单层+mask | 浅/深 | 14.46 / 13.85 | 0 | 0–2 |
| (a) 多层伪元素 | 浅/深 | 13.24 / 11.21 | 0 | 0–3 |

数字看起来"越花哨越快"，这是假象：`TaskDuration` 只统计**主线程**任务耗时，`backdrop-filter` 的采样/模糊/合成发生在合成器与光栅线程，主线程只是提交一次 style 变化，三种变体在主线程侧的差异本来就该接近于零——观察到的几毫秒抖动是运行间噪声（GC、其他后台任务），不是三种做法的真实成本差。`LayoutCount` 全程为 0，符合预期（改 `scrollTop` 不触发布局）。

### 结论：这套环境测不出可信的帧代价数字

两种方法分别卡在"headless 固定节拍掩盖合成器抖动"和"CDP 指标读错线程"，都不是"三种做法性能相同"的证据，而是方法学的天花板。要拿到可信数字，需要：非 headless（真实合成/光栅路径）+ `Tracing.start` 抓 `disabled-by-default-devtools.timeline`/`viz` 类别，或直接在真机 Chrome DevTools Performance 面板录制——这些都超出本卷"只读探索、不新增依赖、不搭额外基础设施"的范围，留给 FE-05 落地时用真机验收，不建议把上表当作性能结论使用。可以带走的定性结论：(a) 多层方案比 (b) 单层多出至少一次独立的 `backdrop-filter` 采样 + 合成层（每层各自采样一次 backdrop），在真实 GPU 路径下开销只会更高不会更低；且 §2(a) 已证明在今天的 token 闭集下 (a) 换不来真正的半径级差，只多花合成层数——**从成本和收益两头看，(b) 都优于 (a)**。

## 6 · reduced-transparency / reduce-motion 回退

- **reduced-transparency**：§2(b) 的回退块必须同时清 `mask-image: none`（连同 `-webkit-mask-image: none`），否则会出现"实色 + 渐隐"的反直觉结果——`mask-image` 作用于元素整个渲染输出，不管背景是不是玻璃，只要 mask 还在，切成实色 `--float` 的 header 底部照样会淡出到透明，露出下面滚动的消息，比原来的玻璃更违和。`lint-materials.mjs` **不检查 `mask-image`**（正则只认 `background`/`backdrop-filter`），这条不会被机器挡住，必须人工记在实现清单里。硬边回退（直接删掉 mask，整条 header 一刀切实色）是唯一安全的做法。
- **reduce-motion**：本卷的 (a)(b)(d) 全部是**静态**的、由滚动位置直接决定的渐变（`mask-image` 的百分比锚点不随时间变化，没有 CSS transition/animation），不是"随时间插值"的动效，FN-27"缩放与 reduced motion 不改权威状态"与 UP-16 一类的动效降级规则不适用——不需要为这三条路径单独写 reduce-motion 回退。唯一需要警惕的是**实现方式**：如果 FE-05 落地时改用 `animation-timeline: scroll()` 或 JS 逐帧改 `backdrop-filter` 的方式去追求"更连续"的效果，那就变成了 WK-124 (b) 明令禁止的"动画 `backdrop-filter`"，必须回到纯 mask-image 的静态写法。

## 7 · 待裁定清单

1. **分割线是否保留为回退。** 选 A：header 消散后，`--line` 分隔线整条移除，代价是"待裁六十处"分隔线的收口进度又往前挪了一格，但没有回头路（reduced-transparency 用户看到的是纯色 header，没有分隔线）；选 B：消散 + 保留一条极浅 `--line`（双保险），代价是两种边界语言叠在一起，视觉上可能读成"设计没想清楚"。
2. **progressive/mask 只用于 header，还是三面都做。** 选 A：只做 header（今天唯一处在"滚动内容划过"场景的面），代价小、验收面窄；选 B：jump-latest 与 composer 也做同一套（composer 需要先决定是否真的进入 Chrome 层，这是 WK-101 留的"二择"本身，不是本卷能替代的判断），代价是要素材质"二择"与"消散实现"两件事一起裁，耦合更重。
3. **多层伪元素 (a) 要不要保留在候选里。** 选 A：现在就砍掉，只留 (b) 单层+mask 进 FE-05 消融表——本卷证据是 (a) 在今天的 token 闭集下换不来真正的半径级差，只多花合成成本；选 B：保留 (a)，但需要先在 WK-102 开一个新的 blur token 档（例如 `--blur-chrome-soft`），这是治理层面的追加动作，不是纯 CSS 工作。
4. **mask 扩大采样在 390（窄屏）是否关闭。** 选 A：窄屏关闭扩采样（只留 header 边界内的单层 mask），理由是窄屏视口本就局促，扩出去的采样区域更容易撞到附近其他 chrome（例如窄屏可能有的 sheet/bottom 导航）；选 B：桌面/窄屏一致，理由是"消散"本身应该是尺寸无关的视觉语言，不应该在窄屏退化成硬边。
5. **reduced-transparency 回退是否同时清 mask-image 写成显式规则，还是留给实现者自己注意。** 选 A：现在就把"回退必须同时清 mask-image"写进 WK-102/WK-104 的文字裁定里，作为 lint 之外的人工检查项；选 B：先不写，等 FE-05 实现时如果漏掉、被截图审查发现再补——代价是可能漏过一轮验收才被抓到。

代价量级参考 §5：帧时间在本环境下测不出可信差异（方法学天花板，非"无差异"结论），(a) 相对 (b) 的额外合成层数是唯一有把握的定性代价。
