# Pages 首页：Evidence Line

状态：现行规范。SITE-2 及后续官网修改以本文件、`tokens.json` 与 `principles.md` 为准。

## 首页先讲产品路径，再讲一条材料因果链

Courtwork 的首页不是功能卡片目录。首要路径是通用 Work 的真实容器、逐次授权与只读结果；Legal
作为第一垂类，在其后解释一个结论如何被证明：

```text
原件 → 引语 → 结论 → 人工确认
```

“法理之线”在官网只作为这条因果关系的讲解骨架；它不能扩张为页面装饰或随机坐标。每个节点必须由同一份样板案真实 fixture 供养，能从原句回到文件与页段，并能展示用户实际拥有的确认、驳回或修正动作。

## 信息结构

1. 首屏定义 Courtwork 为本地优先的通用 Work Agent GUI；定位、当前 scripted 证据、Stage 0 与 PI external gate 必须同屏可辨，不把施工主线写成 product-live。
2. 首屏工作窗只使用已由 manifest 与完整 product SHA 绑定的 Work scripted 验收帧，caption／alt 就近明示证据边界并链接 provenance 档案；不得用看似可点的静态 span 重建产品按钮。Legal schema 微演示退出 Hero，其因果链仍由卷一 Evidence Line 讲解。
3. 首要产品路径按“绑定真实容器 / 人决定写入提案 / 只读核验结果”连续展开；随后 Legal 按“原件 / 引语 / 结论 / 确认”四个语义节点展开。滚动揭示只可帮助解释先后关系；关闭动效或启用 reduced motion 后，全部关系仍完整可读。
4. 三段能力说明使用连续台账与分割线：从模型到条款、从风险到逐条处置、从建议到确认。不得改成三张等权 feature card。
5. 可信承诺固定为可验证的产品边界：不改原件、不自动送出、不把无锚引语落格、不替用户确认。
6. 主 CTA 必须进入页面所展示的当前 Work scripted 证据或当前源码／本地运行路径。历史制品可以下载，但文案必须就地写明版本及“不含当前 Work”；真实 SHA、GitHub、Apple Silicon、ad-hoc 与未公证边界继续可核验。没有制品时不得出现伪下载。
7. 卷五 · 发布事实——可核验发布事实台账四行，链接即声称（`repo-link` 门），SHA 指回卷首刊记单一在页真源。
8. 卷六 · 有问有答——常问六则静态问答，全部展开不折叠，成熟度边界由页级总声明承载（`checkMaturityClaims` 页级形态）。

站面主叙事口径为底座与契约二元（2026-07-26 产品拍板）：底座只有机制、行业以契约包进入且零新执行能力，边界由包 ABI 机器强制；此口径的能力宣称上限仍只认 `docs/status/current.md`。

## 真实材料纪律

- 页面正文、引语、锚点、状态与截图只能来自仓库 fixture 或真机运行结果，不造随机法律纸片、假坐标、假 token 或假进度。
- 截图必须在已验收提交上通过 computer use 从真实运行界面取得；截图文件名、分辨率与页面 alt 文案应能说明所展示状态。
- 证据引语允许换行，不能截断到失去辨识度；只可截断次要文件元信息。
- 版本或 SHA 更新时，页面文案、下载链接、截图与 OG 资产一并重建并通过静态门禁。

## 视觉与语言

- 页面 wordmark 使用 `icon.md` 规定的透明核心标记，位于 `Courtwork` 左侧；无底盘、阴影或入场动画。
- 不使用 glow、渐变、3D 设备、glitch、随机编号、装饰坐标和 `01/02/03` 脚手架。
- 展示站动效例外（2026-07-15 架构裁定，SITE-CRAFT-1；2026-08-21 `SITE-MOTION-NATURAL-GROWTH-1` 扩写）：标题逐字显影（动 `color`）与截图显影（动 `mask-position`）两类媒体层巧思继续保留；新增词汇只准从 `record → compare → decide → seal` 生长，并服从「一页一个运动命题、一段一个主动作、一个动作对应一项材料因果、封存后静止」。首批只登记 Evidence Line 因果线推进（pseudo-element 的 `transform/opacity`）与落定章一次性落定（`transform/opacity`）；它们没有扩大 principles.md §5 四属性白名单。色彩全落站面现行色宗的登记 token，必须实现 `prefers-reduced-motion` 零运动终态与 JS 关闭内容完整，数据区、正文、fixture、卷宗数字与发布事实绝对静止，效果不回迁产品壳；具体 selector／数值与反例见 `site/specs/SITE-MOTION-NATURAL-GROWTH-1.md`，并由站点机器门精确圈定。锁外新增动效仍须重新拍板。色宗登记面继续由 `raw-color`（按名绑定浅宗 `color.*`／深宗 `themes.dark.*`）与 `color-grammar`（朱仅裁决 / 泥金只进 Hero 与卷级大标题）双门圈定；正文、功能标签与数据区零泥金。
- Hero 微演示退役（2026-08-20，SITE-PUBLIC-SURFACE-PROOF-1）：2026-07-18 登记的 Legal 注意力循环与 `demo-motion` 消费点随旧 Hero 一并删除；历史逐帧证据保留在 `site/craft-evidence/SITE-CRAFT-2/B2/`，不再构成现行页面动效授权。Hero 产品帧可继续消费既有 Ghosty 媒体显影，但不得新增动效属性、重建假控件或迁移旧 keyframe。
- 明确拒绝把实验感做成 scanline、noise、glitch、发光 HUD、marquee、漂浮 cursor/avatar、loop video、无限 pulse、整页 fade-up 或持续滚动插值。Cuvii Motion 只借「命名且有边界的局部 specimen」，Banas 只借「按语义层级、一次进入视口、轻微错时」；两者视觉表皮均非 Courtwork 授权。
- 不重复全大写 eyebrow；只保留帮助定位的少量标签。
- chrome 用完整中文产品语言：`查看已验收 Work 流程`、`查看源码与本地运行`、`下载历史 v0.1.2（不含当前 Work）`。领域内容保持中文，不随机混入英文按钮。
- 数据行、证据裁片和台账零投影；官网不得以卡中卡代替信息层级。

## 验收

- `node site/scripts/deslop-scan.mjs` 与 `node site/scripts/build.mjs` 必须通过；扫描必须覆盖结构规则，不能只查 gradient/shadow/radius 字面量。
- 1180、1280、1440、1600 四档检查无横向滚动、文本遮挡与证据截断；键盘焦点、reduced motion、窄屏阅读顺序均可用。
- 发布后用 computer use 打开实际 Pages URL，核对首屏 wordmark、四节点因果链、截图加载、下载/仓库链接与版本 SHA，再将部署 run 记入交付回报。
