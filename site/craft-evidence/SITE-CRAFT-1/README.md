# SITE-CRAFT-1 · 三处巧思验收材料

本目录是 Pages 展示站三处效果的前后对照与退化实测证据，不参与站点部署（`site/scripts/build.mjs` 只拷贝固定清单，本目录不在其中）。所有帧由仓库锁定的 Playwright/Chromium 在 `1280×860` 视口对 `site-dist` 静态服务采集；动画帧用 Web Animations API 定格到确定时刻，非产品真机截图。真机 Safari 复核归独立验收与部署后步骤。

## 帧清单

| 文件 | 落点 | 说明 |
|---|---|---|
| `before-hero.png` | Typer | 基线 Hero：标题静态呈现，无逐字显影 |
| `after-hero-typer-flash.png` | Typer | 逐字显影定格于 220ms：前段字符处于反色/pill/outline 态，后段尚未显影（体现左→右错峰） |
| `after-hero-settled.png` | Typer | 显影收尾后的定格标题，与基线同字面 |
| `before-cta.png` | CTA | 基线主 CTA：实色藏青平面按钮 |
| `after-cta.png` | CTA | Satin 伪元素高光：上部微光带 + 顶缘高光细线，藏青派生，静态 |
| `after-work-hidden.png` | Ghosty | 隐藏预态（未滚入）：截图经羽化遮罩透至仅余顶部微痕 |
| `after-work-midsweep.png` | Ghosty | 显影中段（遮罩位移 42%）：羽化边沿纵向扫过 |
| `after-work-revealed.png` | Ghosty | 显影完成：截图全实清晰，无羽化残留。基线（无效果）与 reduced-motion 的案例截图最终帧与此像素一致（同哈希），故不另存冗余帧，等价性由 `measurements.json` 与下节实测坐实 |
| `after-reduced-hero.png` | reduced-motion | `prefers-reduced-motion: reduce` 下 Hero 直接定格（无逐字动画） |
| `after-js-disabled-hero.png` | JS 关闭 | 停用 JavaScript：标题全文与案例截图均完整（遮罩预态仅在 `.js` 就绪时武装） |

## 退化实测（`measurements.json`）

- **reduced-motion**：Typer `getAnimations`（`.tc`）= `0`、`animation-name:none`、定格 `color: rgb(10,37,64)`（`--ink`）；Ghosty 三图均 `mask:none`，reduce 分支加载赋类后恰有 3 条 `ghosty-reduced-fade` CSSAnimation，以 420ms keyframe 真正渲染 opacity 0→1。40 个逐帧样本中 24 帧命中 `0 < opacity < 1`，元素与整页 CSSTransition 全程为 `0`，computed transition duration 为 `0s`；CTA `::before` 背景静态存在、`animation-name:none`。
- **normalMotion**：Typer 挂载 `10` 条逐字动画；Ghosty `mask-image` 命中 `ghosty-mask`、`mask-size:100% 300%`、隐藏预态 `mask-position: 0px 100%`、`transition` 含 `mask-position 0.9s`；`document.documentElement` 带 `js` 类。
- **JS 关闭**（另测）：无 `js` 类、`h1` 文本与 `aria-label` 均为「模型只生成，不裁决。」、三张案例截图 `mask:none` / `opacity:1` / `animation:none` / `naturalWidth 640`，内容完整。

三处效果色彩全部落在藏青派生色阶（`--ink`/`--bg-app`/`--border-strong` 与其 `color-mix` 派生），无霓虹、彩虹渐变、弹簧动效或 WebGL。
