# 输入：材质层级与"完成度"次序（用户，2026-09-09，仅供参考）

用户在 WK11 与第四轮交接合流（main `1688a7b`）后转来，标注"以下仅供参考，以 Fable 裁决为准。Sonnet 5 explore，Opus 施工"。原文引用 Apple HIG / WWDC25 与 Fluent 材料规范系经 Exa 转述，工程内尚无索引行；所提 Before → After 图未随附。裁决见 [intake-round-3 §4j](../intake-round-3.md)（WK-99…103）。以下为原文转录，未改写。

---

是。"底蕴"很大一部分就在这种看似没有创造新功能的整理里：删掉不必要的信息、重新建立层级、统一控件尺度、对齐、留白、视觉重量，再把材质和光效注入正确的层。我用 Exa 对照了 Apple HIG / WWDC25 与 Fluent 的材料规范；它们的结论其实高度一致。

图里这个 Before → After 很典型。After 并不是"换了套皮肤"，而是先完成了结构治理：设置类别进入 sidebar，当前任务被限定在一个 panel；Base URL / API Key / Model 变成同等级字段；说明文本退出主视觉；输入框宽度、标签起点、行距、控件高度统一；"验证并保存"成为唯一明确的 primary action。Apple 现在甚至直接把这种原则表述为：hierarchy 应首先由 layout 和 grouping 表达，而不是 decoration。WWDC25 还特别强调，从最小 control 到最大 surface 都要相对于整体系统设计。

所以我会把 CourtWork 所谓的"完成度"拆成这样一条顺序：

Information → Geometry → Components → Material → Light/Motion

前三层没有收敛时，玻璃只是 demo slop；前三层稳定以后，玻璃、模糊、阴影和光才会产生你说的那种"厚度"。

尤其值得注意的是，成熟系统并不把 backdrop-filter: blur() 当作随处可加的装饰。Apple 把 Liquid Glass 明确定义成一个功能层：主要承载 navigation / controls，浮在 content 上；内容层继续使用普通 material，并明确警告不要 glass-on-glass，也不要把整个内容区玻璃化。Microsoft 的规则几乎一样：Mica 适合作为长期存在的 foundation/background，Acrylic 更适合 flyout、popup、临时覆盖层；多个 Acrylic 叠起来反而制造视觉噪声。

这意味着 CourtWork 可以直接建立一套 Material grammar，而不是让每一页自己决定"哪里加 blur"：

| 层 | CourtWork 中的对象 | 视觉处理 |
|---|---|---|
| Foundation | app/window background | 极弱 tint、环境色、低频 gradient；基本不抢注意力 |
| Content | conversation、trace、diff、settings form | 近实色 surface，主要靠间距/分组/边界建立层级 |
| Chrome | sidebar、toolbar、composer floating shell | glass / blur / vibrancy，允许背景隐约穿透 |
| Transient | popover、command palette、model picker、context menu | 更明显 blur + elevation + shadow |
| Focus | 当前执行、primary action、selection | tint / highlight / localized glow，而不是整屏发光 |
| Modal | destructive confirm、permission gate | dim/smoke + elevated surface |

而所谓"玻璃模糊光效"，实际最好也不要作为一个效果看。Apple 自己的 Liquid Glass 是多层材料：background sampling、blur、luminosity/tint、highlight、shadow、refraction/lensing、interaction glow 等共同工作；控件变大时甚至会动态表现得"更厚"，阴影和折射也随之增加。也就是说成熟感来自这些微弱信号彼此具有同一物理逻辑，不是 blur 数值调大。

因此对于现在 CourtWork 的前端 review，我会增加一层过去很容易被略过的要求：

不得以"功能已实现"为页面完成标准。每一级公开给 user 的 surface，都需要完成 information hierarchy、optical alignment、component geometry、material hierarchy、interaction states 五轮收敛。

而且可以把它做到非常机械化：相同语义的 label 字号/weight 一致；同一级 input 同高同 radius；相似控件同宽或服从明确 grid；图标 optical size 而非 bounding-box size 一致；divider、border、shadow 只有少数固定 token；hover / focus / pressed / disabled / running / error 都有状态；blur 必须对应某个 surface semantic；所有 translucent surface 都有 reduce-transparency fallback。

这也正好解释你前面一直说的"成熟 Mac app 的厚度"。它未必来自更高明的 hero 设计，而是来自几百个局部都没有露出"临时拼出来"的痕迹。图中 After 只是一个很小的例子，但这个方向应该变成 CourtWork GUI 的底层施工纪律，然后再在少数关键 surface 上注入玻璃、模糊、折射、局部高光、阴影和 motion，才会真正形成品牌感。
