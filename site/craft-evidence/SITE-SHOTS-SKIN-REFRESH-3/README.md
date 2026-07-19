# SITE-SHOTS-SKIN-REFRESH-3 · 新皮层实机界面重摄

采集提交：`5a2dfa3`。应用来源为本树 `apps/desktop`，以独立 Vite
`127.0.0.1:18883` 启动，并设置 `VITE_COURTWORK_E2E=1` 取得授权的样板案；画幅固定为
`1440×900`。所有 PNG 由 computer use 在实际运行界面中逐帧取得。

## 帧与读法

| 帧 | 状态 | 用途 |
| --- | --- | --- |
| `01-workbench-1440x900.png` | 工作台、卷宗侧栏、审查进度与修订工作面同帧 | Pages `11-milestone-dossier` 的源帧 |
| `02-settings-1440x900.png` | Model 设置与凭据边界 | 真实壳面证据；不消费到 Pages |
| `03-revision-document-1440x900.png` | Focus 下的修订预览、删改与新增建议 | Pages `13-milestone-redline` 的源帧 |
| `04-seal-{before,press,middle,after}-1440x900.png` | R04 确认动作前、按下、320ms 中段及终态 | 落定章逐帧实证；`after` 是 Pages `12-milestone-risklist` 的源帧 |
| `04-seal-closeup-220x180.png` | R04 详情卡右上角印框放大 | 人眼复核 `non-scaling-stroke` 后的可见线条；不作为站面裁片 |

首页消费者在替换前已逐一搜索：只有 `site/index.html` 三幅 `work-crop` 使用
`11-milestone-dossier`、`12-milestone-risklist` 与 `13-milestone-redline`。每幅 PNG 通过
`cwebp -q 85` 生成 `1440×900` WebP，并用同源帧等比生成 `720×450` WebP；文件名、画幅和 alt
均已描述其真实状态。

## 限界

这是由浏览器承载的实际 desktop UI 运行帧，不是原生安装包窗口。它能证明壳的三轨字体、线级、
记号与交互状态，却不能代替「装机图标」的原生 macOS 外观对照；后者需在可启动的安装包上另摄。

本实现只完成证据资产重摄与站面绑定更新。发布后的 Pages 复核和放行仍由独立验收进行。
