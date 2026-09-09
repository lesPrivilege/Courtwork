# 发布面候选

本目录为 WO-PS-01 与 WO-PS-02 的第一版完整发布版面。八段叙事、Anatomy 七节点导航、概念定价、项目介绍与离线标本已经接入。用户已授权本轮 GitHub Pages 部署，最终线上状态见交付回执。品牌探索后置。

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

`release.json.source_sha` 是产品证据快照。截图、标本和 benchmark 均属于 `9e5384f`；构建直接从该 Git commit 读取产品 token 与 renderer，再记录各源文件 hash。当前 main 可以继续发展，构建不会把新产品代码混入旧证据。完整 Git 历史必须包含该 commit（浅克隆须先补齐历史）。

`site_sha` 是页面原始源码与证据输入的 SHA-256，不是 Git commit；生成的 `dist/`、README 与标本副本不参与输入摘要，因此首次构建和后续重建一致。`dist/` 及 vendor-product 副本由构建生成，不提交、不手改。当前录制的九个机器路径字段已作公开投影，原始哈希与逐字段变更见 [脱敏回执](../evidence/public-repository-cleanup-20260910/specimen-redaction.json)。这是同一产品采集的展示脱敏，不是重新采集。构建会拒绝公开文本中出现机器绝对路径。

capture 脚本直接调用产品，必须在产品字节与 source_sha 一致的隔离 checkout 运行，且仅用独立合成数据目录。合流后的新 main 会被 capture 守卫拒绝；这不影响离线构建。更新产品快照须一起重取媒体、标本、benchmark 与测试记录，并重新核对声称。不要通过取消来源检查来沿用旧图。

页面文案同步 public-copy-v3 与 `src/copy.mjs`；README 由 `src/readme.mjs` 独立维护对外介绍，然后 `node site/build.mjs --write-readme`。普通 push 只构建，只有显式手动运行 Pages workflow 才可能部署；本轮用户已授权手动部署，随后独立 review；产品门按工程合同继续。

## 表现与边界

用户 2026-09-10 允许 Pages 按需使用 blur，且可以比产品更有表现力。当前仅在读者聚焦第 03 段时柔化非当前连接线；文字保持清晰，不自动播放。减弱动效/透明度偏好下连接线保持静态。此处不改变产品材质合同，也不启动新设计方向或 sweep。

完整回执见 [delivery-ps-01](../engineering/release/publishing-surface-2026-09-09/delivery-ps-01.md)。

## Pages polish / campaign ownership（2026-09-10）

本轮用户授权页面比产品更激进，Astra认领并裁定Archival Instrument；此前本页“仅连接线blur”“不启动新方向”的范围由本条覆盖。独立campaign材质、字阶与解释动效位于 `src/site.css`，产品标本仍保留固定token与来源守卫。`scripts/check-material.mjs`的材料字面量检查仅适用标本；campaign允许独立材质但禁止重定义产品语义token，并通过浏览器对比度、重排和偏好验证。

Hero中的纸层是明确标注的概念作品。新版Home完成前，`data-capture-slot="home"`保留待补状态；旧M1只在展开后显示且标明9e5384f。完成后先在对应快照隔离树运行capture，统一重取媒体、标本、benchmark与测试记录，再更新release与槽位；不把旧图标成新Home。完整实现、验证和发布范围见 [polish回执](../evidence/pages-polish-20260910/README.md)。

## Product-life pages

首页保留叙事，`tour.html`、`get.html`、`cli.html`、`changelog.html`、`models.html`、`data.html`承接产品外围入口。`src/product-pages.mjs`在构建时读取同一固定录制和版本；`src/product-interactions.mjs`只提供下载说明弹层、安装命令复制与离线CLI导航。

```sh
node site/scripts/verify-product-pages.mjs --origin http://127.0.0.1:8941/Courtwork/ --cdp-port 19961
```

Tour有十类状态，当前六张对应截图；未录制状态保留待补，不能把十类索引写成十张实机已完成。六张产品图来自当前 main `774a3bd073bc1845d9bacde22da657b44df673d1`，与基础 specimen 的固定 `9e5384f` manifest 分开记录。入口实现与边界见[本轮回执](../evidence/pages-product-life-20260910/README.md)，媒体重取与浏览器回执见[当前 main 媒体回执](../evidence/pages-main-20260910/README.md)。
