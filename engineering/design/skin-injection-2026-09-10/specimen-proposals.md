# Dystopia 与 Pages · 对照提案

状态：设计提案/待执行 specimen，不是已渲染视觉验收。当前默认 review 红已存在，因此每组保留现状基线，避免把重复工作记为新增交付。

## Dystopia preset

登记 `dystopia` 为候选独立外观 preset ID；不改变 `slate` 默认、不新增或扩大 gray-steel，不把它当作 Dystopia 新 preset。第一轮比较现状slate与Dystopia的neutral/paper/line层级，Review浅宗 `#ae3630`、深宗 `#efaaa4` 在两组中保持相同。Home needs_you、Attention详情、Review待决header作为固定语义对照；普通context popover检验材质未因换skin改变。

Dystopia的cold ash/graphite色阶需先冻结值来源，再在同内容同几何下测试。普通交互保持monochrome。所有固定review/danger/focus在新底色上必须满足对比门槛，不能通过改固定色使预设过关。

原讨论Ruby / Crimson / Red对照不再作为skin变体。若后续重开Review语义配色，须单独工单，对全部skins同时生效；不在本单重复试色。局部review tint同理由语义/material owner掌握，绝不随Dystopia换色。

## Pages Red Thread

源码基线：`site/src/page.mjs` 的 `review()` 已含 `.review-attention`，`site/src/site.css` 已有专用 campaign 色、小点与 forced-colors 回退。A 是现状，不再当成新增方案。实际上线内容需要部署版本核对，本单不推断。

| 版本 | 具体变化 | 要回答的问题 |
|---|---|---|
| A · 现状 | Review 截图前的待人审阅短标签 + 5px点 | 当前唯一色彩断点是否已经足够 |
| B · 局部 register | 保留 A，只在 Review section index 增加一小段20–40px rule；03 ATTEND 保持中性 | 第二处标记能否改善定位，是否只是重复 |
| C · 局部 atmosphere | B 后增加静态低浓度 radial field，限制在 Review 图外侧，保持截图区域不受覆盖 | 氛围是否帮助章节区分且不损害纸面阅读 |

推荐先比较 A/B；C 不默认进入。Hero、wordmark、CTA、Paper/Tour 导航、Pricing、verified/local/not-yet 保持中性；发布 status 不获得 Review 含义。C 采用 Pages 自有变量，禁止 import 到 app。field 无指针事件、无动画、不采样正文 backdrop；forced-colors / reduced-transparency 下消失，关闭后布局不变。截图文件与像素不改，背景不得透过截图伪造产品 UI。

## 执行矩阵

同一合成 fixture，1440 / 1280 / 390 × light / dark；逐版记录 screenshot、实际 viewport、scheme、来源 SHA。覆盖无待决、多个待决、danger 与 review 同屏、长标签、选中行、键盘 focus、Send、Activity。灰度和高对比下状态/选择仍可辨；新增材质另测 unsupported / reduced-transparency、changing backdrop 与目标 WebView。

此表是待执行条件，不是18张图已完成的声明。产品 specimen 需在前端单 writer 队列接入，材质继续遵循 FE-05a→FE-05 前置。Pages 使用其发布 owner 的独立变更片。
