# SITE-MOTION-NATURAL-GROWTH-1 · Pages 自然生长动效

状态：**架构冻结，待串行实现与独立验收**。冻结基线：
`main@f79f605f28ae77da1bcc48708f667bf326b374f1`（2026-08-21）。

权威：`CLAUDE.md`、`AGENTS.md`、`docs/status/current.md`、
`docs/design/principles.md`、`docs/design/site-evidence-line.md`、
`docs/architecture/implementation-readiness.md`、`site/SPEC.md` 与本票。

## 一、问题、方向与复杂度结论

Pages 已比 GUI 利落，但现行动效除标题 Typer 与截图 Ghosty 外，没有把「材料进入证据链、人工决定后
封存」这套产品观念说成同一种动作语言。用户明确允许 Pages 比 GUI 更前卫，只要效果有选择、像从
现有版本学／证据链／落定章自然生长，并能与当下 AI landing page 套路形成陌生化距离。

本票把 Pages 动效母语冻结为：

```text
record → compare → decide → seal
```

首批只实现其中两端：Evidence Line 的 `record` 因果线推进，以及承诺账落定章的 `seal`。`compare`
与 `decide` 没有真实的新交互材料，留在词汇表而不以假控件、循环演示或装饰动画代填。

外部材料只借方法：Cuvii Motion 的「命名且有边界的 specimen／局部响应／终态静止」，Banas 的
「按语义层级一次性进入视口并轻微错时」。不借 scanline、noise、glitch、发光 HUD、marquee、漂浮
cursor/avatar、loop video、无限 pulse、黑底渐变或整页 fade-up。

工程四选一结论：**借行为范式**。复用现有 IntersectionObserver、CSS transition 与既有 token；
零新依赖、零新状态机、零新网络／媒体资产、零 `requestAnimationFrame`／scroll listener／canvas。
`site/main.js` 字节不动。

## 二、统一运动纪律

1. 一页一个运动命题；一段一个主动作；一个动作必须对应一项材料因果；封存后静止。
2. 动画只武装在 `.js` 下；JS 关闭时所有正文、线、节点、截图与印章直接处于完整静态终态。
3. 新动作只动 `transform`、`opacity` 与既有 `background-color`，不动画布局、尺寸、border width、
   filter、shadow、gradient、clip-path、mask、字体或数据值；Ghosty 的既有 mask 例外不随本票扩大。
4. `prefers-reduced-motion: reduce` 下，本票新增动作全部 0ms、零位移、零缩放、静态终态；不仿照
   Ghosty 保留淡入。数据、fixture、卷宗数字、mono 槽、发布事实、FAQ、正文与 GUI 始终静止。
5. 每个动作只运行一次；不得循环、反复进入视口重播、音频触发或随滚动进度连续插值。

## 三、串行小单

### A · `SITE-MOTION-NATURAL-GROWTH-1A`：Evidence causal advance

唯一目标：让既有四节点 `原件 → 引语 → 结论 → 人工确认` 的结构线按阅读顺序推进；文字和真实
fixture 不动。

- 只消费现有 `.evidence-step.is-visible`，不得新增 JS 或改 observer threshold。
- 桌面 `>900px`：节点记号以 `transform + opacity` 在 `240ms var(--ease-out)` 内落定；相邻节点之间
  的覆盖线只用 pseudo-element `scaleX(0→1)`，`360ms var(--ease-out)`，按 DOM 顺序每项错开 `70ms`。
- `≤900px` 因 Evidence Line 换为 2 列／1 列，取消跨格覆盖线，节点仍可一次落定；不得画会逆向或
  跨行的假连接。
- JS-off 与 reduce 下保留原有完整基线和四个最终节点；所有文字 bbox 不因动作变化。

允许修改：`site/styles.css`、`site/scripts/deslop-scan-lib.mjs`、
`site/scripts/deslop-scan.test.mjs`、`site/SPEC.md`（A 回执）。

### B · `SITE-MOTION-NATURAL-GROWTH-1B`：Seal settlement

唯一目标：让承诺账右上既有 `.settle-seal` 在进入视口时完成一次无弹跳落定，然后永久静止。

- 只给现有 SVG 增加 `data-reveal`，复用现有 observer；印章内容、颜色、尺寸、最终 `rotate(-2deg)`
  不变。
- `.js` 初态仅允许 `opacity: 0` 与不超过 `6px` 的二维偏移、`scale(.92)`、`rotate(-6deg)`；终态为
  `opacity: 1`、零偏移、`scale(1)`、`rotate(-2deg)`。
- `transform 320ms var(--ease-out)`，`opacity 240ms var(--ease-out)`；无 overshoot、spring、bounce、
  blur、ink bleed、重复盖章或音效。
- JS-off 与 reduce 下直接显示现有静态终态；窄屏印章回到文流后仍无溢出或遮字。

允许修改：`site/index.html`、`site/styles.css`、`site/scripts/deslop-scan-lib.mjs`、
`site/scripts/deslop-scan.test.mjs`、`site/SPEC.md`（B 回执）。B 必须基于已完成的 A 串行施工。

### C · `SITE-MOTION-NATURAL-GROWTH-1C`：Runtime proof repair

唯一目标：把已脱离现行 DOM 的 reduced-motion runtime probe 改成当前 Pages 的实测门，并采集本票
证据；不改变页面视觉。

- `site/scripts/assert-reduced-motion.mjs` 不再把已退役 `.demo-*` 当活动消费点，改验 Typer、Ghosty、
  Evidence causal advance、settle seal 与数据静止，且核 computed style，防止高特异性绕过 reduce。
- 由 `SITE-CRAFT-2-N2/capture.mjs` 派生独立采集器，覆盖 light/dark ×
  `375/768/1180/1280/1440/1600`、JS-off、reduce、overflow、broken image、动画名与数据双采样。
- 正常态保存 Evidence `before/mid/settled` 与 Seal `before/mid/settled`；中间态必须通过暂停 CSS
  transition／读取实际 animation timeline 确定，不以任意睡眠声称精确帧。
- `REPORT.json` 记录 target SHA、viewport、允许动作、protected selectors 与 failures。

允许修改：`site/scripts/assert-reduced-motion.mjs`、
`site/craft-evidence/SITE-MOTION-NATURAL-GROWTH-1/**`、`site/SPEC.md`（C 回执）。C 必须基于 B。

## 四、全票禁止范围

- `site/main.js`、`docs/design/tokens.json`、`site/assets/**`、既有 screenshot／manifest／productSha／OG；
- `README.md`、`site/ACCEPTANCE.md`（实现阶段）、`apps/desktop/**`、packages、schema、runtime、provider、
  identity、ACL、release、版本、tag、Release、Pages workflow；
- 新颜色、渐变、阴影、glow、圆角、字体、图标、素材、依赖、控件、CTA、产品宣称；
- 恢复 Hero Legal schema demo、`.demo-*` keyframe、假按钮／HUD，或把 Pages 效果回迁 GUI。

## 五、TDD、机器门与反例

A/B/C 每单必须先在其精确前置 tip 写失败测试并观察 born-red，再做最小实现。静态门至少锁住：

1. selector、target、property、duration、easing、delay 与终态；任一漂移触红；
2. JS-off 隐藏内容、删 reduce 分支、用更高特异性恢复运动均触红；
3. 给数据／正文节点添加 `animation`、`transform` 或 `transition` 触红；
4. 新增 RAF、scroll listener、timer loop、WAAPI、canvas 或未登记 keyframe 触红；
5. Evidence 在窄屏恢复跨格覆盖线触红；seal 重播、overshoot、bounce 或 blur 触红。

最低实现门：focused Node tests、`pnpm site:guard`、`pnpm site:build`、`pnpm lint`、
`pnpm -r build`、`git diff --check`。实现者不得验收自己或前身会话的实现。

## 六、独立验收

另一 Luna 在独立 clean worktree、独立端口验 A→B→C 的最终 tip；不采信实现截图。

- 实际注入并恢复至少六类反例：删 reduce、以高特异性恢复位移、改 duration/easing、JS-off 隐藏、
  数据节点 transform、窄屏跨格线；每类须观察同一活动门变红。
- 实跑 runtime probe；复摄双宗 × 六档、JS-off、reduce，核对零溢出／破图／遮挡，动作前中后与
  静态终态语义一致。
- 独立核 `site/main.js` 与前置 tip 逐字节相同；`document.getAnimations()` 零未登记循环，数据保护
  节点的 text/bbox/transform/animation 双采样一致。
- 结论只追加 `site/ACCEPTANCE.md`；实现级小缺陷可用 `fix-by-acceptance`，契约级问题退回 Main sol。

## 七、成熟度与发布边界

本票不更新 `docs/status/current.md`，不改变 Stage 0、PI external gate、v0.1.2、tag/Release 或
product-live 状态。完成只证明 Pages 获得两枚受约束的叙事性动作；不构成 GUI 回迁授权，不 push、
不部署。
