# VERSIONAL-LANG-3 · 首轮拒绝修正

首轮独立验收对象 `d32985f`，拒绝报告提交 `5029b71`，已投影为 main 的 `0af7cdd`。阻断事实：
真实 `/visual-gallery.html` 固定 `color-scheme=light`，其入口没有安装主题控制器；所以 dark 浏览器
上下文下 `.gallery-header h1` 仍为 `rgb(35,43,56)`。手工写 `data-theme=dark` 虽能变金，但不算
自然产品路径。完整 322 条 e2e 当时全绿，证明前向门也漏了这一入口。

修正严格止于独立入口装配：

- `visual-gallery.html` 声明 `color-scheme: light dark`；
- `src/preview/gallery/main.tsx` 复用主入口的 `installDesktopThemeController()`；
- 新增 `VL3-T03` 平铺账行，不新增第二主题实现；
- 静态门必须同时咬住 meta、import 与真实安装调用；
- 独立入口 e2e 先用 `emulateMedia({colorScheme:'dark'})`，再断言自然根 `data-theme=dark`、
  图谱总题 `rgb(217,174,106)`、正文 `rgb(228,233,241)`。该 e2e 使 floor 322→323。

红证：静态门在实现前精确报 `color-scheme` 仍为 light；首轮独立报告保存了真实 computed 阻断。
绿证：定向 `visual-gallery.spec.ts` 2/2，包含四档结构回归与新增自然深宗断言。
