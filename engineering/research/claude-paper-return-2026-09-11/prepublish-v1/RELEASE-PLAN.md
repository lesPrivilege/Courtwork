# Astra · 校正后的 Paper 发布方案

本轮仅本地候选集成，未推送 SE、未运行 workflow 或部署。作者原件保留；本文件覆盖原件中待 icon、回退 SHA 与部署失败推断三处过时/错误步骤。

1. 在干净隔离 SE checkout 读取 release-manifest 的固定 source commit，核验与已裁 main 的关系，不合并 DSH 观察分支。运行译文8项、资源3项、双语 build、validate、reader 110项、prepublish 54项及署名12组合；对原生未测项保持清楚记录。
2. 重建两次，比较中文/英文候选与 index/index-en 两对字节以及 manifest hash。保持 `READER_CANDIDATE=paper-v1`，不去后缀覆盖历史9/11 HTML；20个正文/译文/既存历史文件应与0f23ad1一致。当前未发布候选两文件更新是本次有意变更，不称其字节未变。
3. 发布执行获得用户授权后，SE push main 会依 `.github/workflows/pages.yml` 自动触发 Publish papers（papers路径命中）。workflow构建全部 dist并发布；不需要另做去后缀重命名。跟踪对应headSha的run，不盲取最新run。成功后逐项抓取默认中英与两候选URL，核对 manifest hash、内容版本9.6/edition 2026-09-07，以及历史文件字节，再写带run ID、head SHA、UTC和真实hash的发布回执。
4. build失败且确认deploy未执行时，通常线上仍为前一部署；若deploy开始后失败/超时，状态未知，必须核验Pages实际线上内容和该run，不能一概声称线上不变。hash差异先排查部署坐标、缓存与依赖，不直接归因CDN。
5. 若发布后需要撤回，用新的向前提交恢复已知reader源 `2817b824` 的构建/reader入口，保留所有已跟踪历史和候选dist文件，重建并验证后再发布。不能盲目整体 revert `853af2f`：该提交新增候选文件，整体反转会删除它们，与保留历史要求冲突。回退也需要实际发布回执；不force-push、不删除历史、不改PAPER采用坐标。

品牌 geometry optical-03、palette common-red-v1已完成本地接入，来源固定于 signature-source.json；不存在“等Astra画icon”待接点。打印黑色、forced-colors系统色是可访问性映射，不是第二套品牌红。
