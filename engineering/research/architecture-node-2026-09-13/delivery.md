# 集成与公开站交付

## 本地集成

接单main为`273ad12a9796aa0547d65e4811a6c56baa5c6a49`；架构提交`8f4a7f4`，Files/Settings修复提交`2f0a4e4`，Home Attention焦点修复与完整入口审计提交`3bd43b6`。先在隔离分支完成写作、检查和非作者浏览器复核，再以main祖先关系和期望HEAD保护合流。

共享main原有61个其它已修改/未跟踪文件均按SHA-256核对保持原字节，`engineering/current.md`使用三方合并保留用户已有12行资料入口。合流index tree与目标提交tree一致；没有checkout、stash、reset、历史重写、个人数据迁移或新真实Provider调用。

## 交付范围

- Astra负责[架构](architecture.md)、[工作区治理](workspace-governance.md)和[Runtime替换证明条件](runtime-replacement.md)；Luna研究与来源核查不替代架构裁决。
- [源码入口清单](ui/source-inventory.md)、[浏览器审计](ui/audit.md)与[修复裁决](ui/fixes.md)分开记录覆盖、独立验证和后续缺口。
- 基线完整低并发回归912/912；修复后相关回归51/51及33/33。首次全量ready超时及重跑结果保留在[验证记录](verification.md)。
- 公开站发布沿既有GitHub Pages手动workflow；静态网站部署不启动本地产品Host。固定来源公开媒体不重标为此次UI审计截图，产品接受门不因合main或部署自动关闭。

## 发布回执

main已推送至`3bd43b69d40547b4a3dce0498649cbd4b7dca706`，随后显式运行既有Pages workflow，`allow_pending_captures=false`。

- [发布run 34716338041](https://github.com/lesPrivilege/Courtwork/actions/runs/34716338041)：build与deploy均success；[原始回执](evidence/pages-run.json)固定发布SHA，构建24秒、部署10秒。
- [公开站](https://lesprivilege.github.io/Courtwork/)：[线上19文件校验](evidence/live-pages.json)全部HTTP 200，页面、CSS/module和公开媒体manifest的SHA-256与本地构建相同。
- [本地集成证据](evidence/main-integration.json)：61个其它本地文件字节不变，current已有12行增量保留。
- 审计Host与专用Incognito窗口已关闭，60张JPEG截图通过[格式与hash登记](ui/screenshot-manifest.json)。

本发布回执及清理记录作为随后文档提交推送；其父版本`3bd43b6`是实际部署SHA，不能把回执提交SHA冒充重新部署。第二Runtime、广义治理实施、Core待Review摘要接线与审计未覆盖的特定状态继续按各自记录推进。
