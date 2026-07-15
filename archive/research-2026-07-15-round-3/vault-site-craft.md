# arlan.me/vault 技法拆解（2026-07-15）

来源：https://www.arlan.me/vault（MIT，作者明言欢迎复制）。调研原稿，不具约束力；已吸收为 `SITE-CRAFT-1` 提案。适用面是 Pages 展示站（site-evidence-line 管辖），不进产品壳。

## 采纳（三个落点）

1. **Hero 标题 → Typer 逐字显影**：约 250 行无框架 TS + CSS，字符在 pill/反色/outline 态间闪烁后定格，CSS 变量换藏青 accent；需自加 `prefers-reduced-motion` 判断。
2. **DMG 下载按钮 / 主 CTA → Color depth 的 Inset 或 Satin 材质**：纯 CSS 分层（gradient 叠层 + inset box-shadow + 伪元素高光），零 JS；Inset 凹刻质感呼应「原件永远只读」的沉稳调性。只取 Inset/Satin/Neon 三款，Glossy/Foil/Metal 过花不取。
3. **案例截图/卷宗数字进场 → Ghosty reveal**：CSS `mask-image` + `mask-position` transition + 羽化遮罩图，IntersectionObserver 滚动触发，原实现已内建 reduced-motion 退化（opacity 淡入）。叙事同构：证据逐步浮现。

## 备选（第二轮）

- **Dia gradient 光晕**（页尾/章节分隔）：内联 SVG 多柱共享 linearGradient + feGaussianBlur + scaleY 升起动画，成本低；但色标必须从霓虹压到藏青派生单色系，先出一版单色调试再定，防被读成彩虹渐变。

## 拒绝

- Emboss 浮雕：需 WebGL shader 引擎，质感玩具化，与克制专业基调不搭。
- Amo hover 影片按钮：依赖 AI 生成 alpha 影片素材 + 弹簧/磁吸微动效（违反动效约束），维护成本高。
- Midjourney ASCII 漩涡：完整 WebGL2 渲染管线，炫技大于叙事，CRT 色散与基调相斥。

## 边界声明

Pages 站巧思不回迁产品壳；产品内动效仍受 principles.md 四属性白名单与「数据区绝对静止」约束。站内所有效果色彩落在藏青派生色阶，尊重 prefers-reduced-motion。
