# CourtWork 发布面

本目录包含 CourtWork Pages 的叙事、产品导览、Chat、Features、Experts、Eval、安装与运行入口，以及固定来源的离线标本。当前组合媒体与前端接受见[最终节点](../engineering/release/frontend-node-2026-09-12/README.md)；本地构建与线上部署分别记录。

```sh
node site/build.mjs
node site/scripts/check-links.mjs
node site/scripts/check-material.mjs
node site/scripts/preview.mjs --port 8941
```

预览路径为 `/Courtwork/`，不是域名根路径。页面无外部资源请求，外部链接仅在读者点击后导航；标本只回放合成数据，不连接产品服务或模型。浏览器检查使用独立 Chrome profile：

```sh
node site/scripts/verify.mjs --origin http://127.0.0.1:8941/Courtwork/ --cdp-port 19991
```

## 版本与再取证

`release.json.source_sha` 是产品证据快照。基础标本和 benchmark 属于 `9e5384f`；产品截图由 `media/main/manifest.json` 独立固定到最终产品提交（batch `publication-integrated-20260912`，见 manifest 的 `source_sha`）；上一批 `f1373cd`（`merged-20260911`）的 manifest 归档于 `media/archive/main-f1373cd.json`，其 JPEG 原样保留；构建直接从该 Git commit 读取产品 token 与 renderer，再记录各源文件 hash。当前 main 可以继续发展，构建不会把新产品代码混入旧证据。完整 Git 历史必须包含该 commit（浅克隆须先补齐历史）。

`site_sha` 是页面原始源码与证据输入的 SHA-256，不是 Git commit；生成的 `dist/`、README 与标本副本不参与输入摘要，因此首次构建和后续重建一致。`dist/` 及 vendor-product 副本由构建生成，不提交、不手改。当前录制的九个机器路径字段已作公开投影，原始哈希与逐字段变更见 [脱敏回执](../evidence/public-repository-cleanup-20260910/specimen-redaction.json)。这是同一产品采集的展示脱敏，不是重新采集。构建会拒绝公开文本中出现机器绝对路径。

capture 脚本直接调用产品，必须在产品字节与 source_sha 一致的隔离 checkout 运行，且仅用独立合成数据目录。合流后的新 main 会被 capture 守卫拒绝；这不影响离线构建。更新基础标本快照须一起重取对应媒体、标本、benchmark 与测试记录；更新独立产品截图须重取 main 媒体并核对该来源的声称。不要通过取消来源检查来沿用旧图。

页面文案同步 public-copy-v3 与 `src/copy.mjs`；README 由 `src/readme.mjs` 独立维护对外介绍，然后 `node site/build.mjs --write-readme`。普通 push 只构建，只有显式手动运行 Pages workflow 才可能部署；发布面检查、部署回执和真实 Runtime 验证分别记录。

## 表现与边界

用户 2026-09-10 允许 Pages 按需使用 blur，且可以比产品更有表现力。当前仅在读者聚焦第 03 段时柔化非当前连接线；文字保持清晰，不自动播放。减弱动效/透明度偏好下连接线保持静态。此处不改变产品材质合同，也不启动新设计方向或 sweep。

完整回执见 [delivery-ps-01](../engineering/release/publishing-surface-2026-09-09/delivery-ps-01.md)。

## Pages polish / campaign ownership（2026-09-10）

本轮用户授权页面比产品更激进，Astra认领并裁定Archival Instrument；此前本页“仅连接线blur”“不启动新方向”的范围由本条覆盖。独立campaign材质、字阶与解释动效位于 `src/site.css`，产品标本仍保留固定token与来源守卫。`scripts/check-material.mjs`的材料字面量检查仅适用标本；campaign允许独立材质但禁止重定义产品语义token，并通过浏览器对比度、重排和偏好验证。

Hero中的纸层保留原有构图与动效；其概念属性保存在图登记表中。Home 以独立区块进入产品导览。旧标本与 benchmark 仍固定9e5384f，不随新截图重标。当前媒体与验证见[本轮合流回执](../evidence/pages-main-visual-20260910/README.md)。

## Product-life pages

首页保留叙事，`tour.html`、`get.html`、`cli.html`、`changelog.html`、`models.html`、`data.html`承接产品外围入口。`src/product-pages.mjs`在构建时读取同一固定录制和版本；`src/product-interactions.mjs`只提供下载说明弹层、安装命令复制与离线CLI导航。

```sh
node site/scripts/verify-product-pages.mjs --origin http://127.0.0.1:8941/Courtwork/ --cdp-port 19961
```

Tour 编排13类状态；当前批次 `publication-integrated-20260912` 固定最终产品 `0768822` 的13对明暗原生截图。Astra采集/修正与Luna有界非作者复核已完成，来源、实际采集记录和复核范围以[组合回执](../evidence/publication-integrated-20260912/README.md)为准。上一批 `f1373cd` 保留在 `media/merged-20260911/`。旧批次 `e818463ab31aa06a4c9d52a968a68099fdb02c3e` 的15份原生JPEG保留在历史媒体中，与基础 specimen 的 `9e5384f` manifest 分开；不会代作当前截图。历史批次见[原回执](../evidence/pages-main-visual-20260910/README.md)，当前交付以本轮合流回执为准。

## Product presentation and primary navigation

The 2026-09-11 user brief presents a complete fictional commercial product. Public copy explains what the product is for and how to use it; development maturity and capture provenance remain in engineering records and manifests. No customer counts or experimental gains are invented. See [integration decisions](../engineering/release/pages-ordered-integration-2026-09-11/README.md).

The primary header is a quiet, single-row Tour / Paper / Release navigation beside the wordmark. Paper opens Schema-Engineering Pages; acquisition emphasis belongs to the hero. Ideas is expanded initially. Campaign navigation stays neutral; the review colour belongs to a sparse, text-labelled human-judgment state, the interactive story uses neutral ink.

## VS-05 product navigation (2026-09-11)

The first-principles integration keeps the mature Tour / Paper / Release header, one row at narrow widths, and initially expanded Ideas. Spark / Attention follows Hero, then Paper / Tour, actual Home and work / Review, and the established pipeline with three small figures. Only deeper architecture and event projections remain under Research & architecture. Tour retains the five task groups. The earlier five-link navigation and wholesale Paper fold were assistant proposals, not an explicit user override. See [the layout decision](../engineering/execution/2026-09-11-semantic-polish/pages.md) and [visual ruling](../evidence/semantic-polish-merge-20260911/visual-ruling.md). The merged-product capture handoff and final verification are tracked in [the publication receipt](../evidence/semantic-polish-merge-20260911/publication.md).


2026-09-12 最终组合截图：26张原生1440×900 JPEG固定到 `07688226330121e5877a6ff1e09e6ebf82995ae3`，旧1397b99 manifest保持在 `media/archive/main-publication-final-1397b99.json`，图像未转码。采集、更正记录和独立复核范围见[组合回执](../evidence/publication-integrated-20260912/README.md)。这条覆盖此前待Astra采图的状态，不构成新的部署回执。

媒体manifest中的`evidence_path`为CourtWork仓库相对来源路径，配合本仓历史阅读，不是部署站点的相对URL；对外页面使用已构建的媒体URL。完整采集与review回执在仓库[evidence](../evidence/publication-integrated-20260912/README.md)，与固定产品source_sha分开。
