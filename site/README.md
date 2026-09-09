# 发布面候选

本目录为 WO-PS-01 与 WO-PS-02 的第一版完整发布版面。八段叙事、Anatomy 七节点导航、概念定价、README 与离线标本已经接入。用户已授权本轮 GitHub Pages 部署，最终线上状态见交付回执。品牌探索后置。

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

`site_sha` 是页面原始源码与证据输入的 SHA-256，不是 Git commit；生成的 `dist/`、README 与标本副本不参与输入摘要，因此首次构建和后续重建一致。`dist/` 及 vendor-product 副本由构建生成，不手改。

capture 脚本直接调用产品，必须在产品字节与 source_sha 一致的隔离 checkout 运行，且仅用独立合成数据目录。合流后的新 main 会被 capture 守卫拒绝；这不影响离线构建。更新产品快照须一起重取媒体、标本、benchmark 与测试记录，并重新核对声称。不要通过取消来源检查来沿用旧图。

修改文案先同步对应 public-copy 文档与 `src/copy.mjs`，然后 `node site/build.mjs --write-readme`。普通 push 只构建，只有显式手动运行 Pages workflow 才可能部署；本轮用户已授权手动部署，随后独立 review；产品门按工程合同继续。

## 表现与边界

用户 2026-09-10 允许 Pages 按需使用 blur，且可以比产品更有表现力。当前仅在读者聚焦第 03 段时柔化非当前连接线；文字保持清晰，不自动播放。减弱动效/透明度偏好下连接线保持静态。此处不改变产品材质合同，也不启动新设计方向或 sweep。

完整回执见 [delivery-ps-01](../engineering/release/publishing-surface-2026-09-09/delivery-ps-01.md)。
