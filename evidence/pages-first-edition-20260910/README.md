# 第一版 Pages 整合证据

页面功能非作者复核：[Luna](independent-review.md)。真实 composer 修复非作者复核：[Luna](composer/README.md)。当前 main `85693a6` 与版面组合后，相关产品前端测试 [20/20](integration-tests.log)。固定页面产品快照 `9e5384f` 的全量 308/308 与 benchmark E/S 各 6/6 存放在 publishing-surface-2026-09-09，不将其写成新 main 全量数量。

用户 PS-26 要求 SaaS 产品口吻，PS-27 授权 GitHub Pages 部署后自行独立 review。Astra 负责架构、源码修复、整合与发布；Luna 为上述有界非作者复核，Terra 定价作者验证不冒充独立接受。

## 对外入口与旧安装包

用户 PS-28 要求 README 使用独立对外介绍，已集中为工作问题、已有能力、本地运行与架构入口。PS-29 要求取消旧 DMG 发布；GitHub Release v0.1.2（353886175）与 v0.1.1（353535700）均已通过 API 验证 draft=true，公开发布已撤回，标签保留。当前主线只有 Pages workflow。正式入口：https://lesprivilege.github.io/Courtwork/ 。

## 已发布版本

2026-09-10：GitHub Pages 部署 [34380343840](https://github.com/lesPrivilege/Courtwork/actions/runs/34380343840) 成功，源码 `8e690328bfd34e743b0367e4e96237a2efbac342`。线上 [manifest/页面哈希](live-verification.json) 与本地构建一致，HTTP 200；产品快照仍为 `9e5384f`。匿名 GitHub Release API 返回空列表，两份旧 DMG 已非公开 Release。用户随后要求目录、索引与公开素材清理，作为后续批次执行。
