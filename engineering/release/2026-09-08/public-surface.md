# CourtWork 对外入口与预览发布稿

本稿承接 [双线安排](README.md)，是发布面可消费的结构与文案，尚未替换根README。原品牌语句保留；UI视觉、Preview extensions编排与产品截图由Fable选定并合流的实现提供。

GitHub Pages 的 [实现准备包](pages-preparation/README.md) 已整理页面阅读路径、局部参考队列、媒体/声称证据契约与实施切片。参考尚待原站抓图，页面与部署尚未实现；产品状态仍以 current 和具体交接为准。

发布文案与声称→证据表已由 Fable 固定在 [public-copy](public-copy.md)（2026-09-08）；本稿首屏草稿由其替代，阅读路径与来源裁取仍以本稿为准。

## 首屏文案草稿

**CourtWork**  
**A place for expert work to take form.**

English:

> CourtWork is an experimental agent workspace with a Web UI, a local runtime, and inspectable tool activity. It explores Schema Engineering through explicit runtime policy, reviewable work surfaces, and a separate domain core. The current candidate supports the capabilities documented for its release; the complete professional work lifecycle remains under development.

中文：

> CourtWork 是一个实验中的 Agent 工作空间，提供 Web UI、本地运行底座与可检查的工具活动。它通过显式运行策略、可审阅的工作表面和独立领域 Core 探索 Schema Engineering。当前候选的可用范围以版本说明为准，完整专业工作生命周期仍在推进。

链接顺序：English / 中文 → Quick start / Documentation / Roadmap / Schema Engineering。真实preview放在首屏附近，附版本、数据类型与演示范围。没有托管体验时不放“Try live”，没有DMG时不放“Download for Mac”；可用入口直接指向实际源码/本地运行说明。

## README 的阅读路径

| 区块 | 内容 | 证据入口 |
|---|---|---|
| Identity & status | 品牌、短定位、experimental、实际可用平台/版本 | 发布manifest与对应SHA；不虚构build/license支持badge |
| See it work | 合流后真实UI截图及30–60秒演示，注明fixture或真实运行 | 同SHA的捕获与复现脚本/操作；概念画布有独立design prototype标识 |
| When to use | 本地启动Agent工作、检查Run/文件/工具、管理真实支持的runtime资源 | 实际可复现用例；不把专业正确性或组织治理写成通用已支持能力 |
| How it fits | 宿主runtime、UI投影、领域Core与外部能力的边界 | 已实现architecture与control contracts，未来能力另栏 |
| Quick start | 安装→启动→第一条真实成立的工作路径→检查→停止/恢复 | 干净clone测试、端口/数据说明、已知限制；先覆盖现成Run链 |
| Runtime / Experts / Preview | 已接入能力、安装/附着/运行/权限区别，Preview读取与合法动作 | 真实adapter与renderer；组合愿景不等于所有Expert仅需manifest |
| Architecture / Roadmap | 简图→详细契约；候选/承诺/已验证各有证据 | `engineering/current.md`与领域/RD事实；公开roadmap只做可发布投影 |
| Paper & contribution | 固定Paper基线与最新阅读入口分别标注；贡献入口、许可与版本 | `PAPER.md`、真实LICENSE/NOTICE、release notes；不预先挑选新许可证 |

## Docs 与预览Pages

README只承载最短理解路径。Docs逐步提供Getting started、User workflows、Runtime/resources、Developer/extension boundaries、Architecture、Troubleshooting、Contributing；复用现有`docs/runtime-control/`等真实内容，先修链接与层级，不为栏目迁移整棵工程树。

预览Pages第一版可包含定位、真实截图、短演示、支持矩阵、quickstart和Paper桥。设计静态图、交互fixture、真实产品录像与live app分别标注；不能让按钮或数字使读者误以为静态页在运行provider、保存工作或提交成果。发布技术选择在实际页面施工时核对现有hosting配置与成熟工具；此稿不创建新的托管平台或部署。

截图使用合成/可公开数据，保留viewport、theme、版本与步骤。页面中数据的“fake”标识属于演示上下文，不注入日常产品UI。品牌资产引用本仓`brand/`；不复制REEF商标或把大尺寸材质图缩成应用glyph。

## 两仓同族与跨链

CourtWork突出真实工作表面与操作；SE突出命题、文本、图和版本。可共用字标尺度、图表/注释体例及social preview模板，不要求相同页面布局。CourtWork链接固定采用的Paper SHA和最新阅读页；SE链接实验中的实现版本及固定证据，工程实际覆盖决定措辞。

英文/中文README从一份经核对的事实清单派生。发布时记录两份内容hash、事实核对的source SHA、人工语义复核与日期；结构检查可以覆盖标题、链接、代码示例，却不能代替翻译质量判断。SE正文仍沿既定中文编订，不因README双语而复制一套可独立漂移的Canonical。

## 来源裁取

[REEF溯源回执](evidence/reef.md)核验了官方README、docs、双语checker与roadmap。采用任务先于架构的信息顺序、README/Docs/治理的职责分离，以及内容hash加人工复核的双语纪律。季度assignment承诺与产品artifact commit是不同语义；不因名称相近便宣称SE已获验证。公开GitHub issue可投影路线并链接PR/evidence，内部current和领域契约仍是本阶段原始事实入口，避免维护两份相互竞争的状态账本。
