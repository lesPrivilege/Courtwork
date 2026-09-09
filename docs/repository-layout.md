# 仓库目录与内容归属

| 路径 | 内容与入口 |
|---|---|
| [app/](../app/README.md) | 运行产品：Web、Host、Runtime、Core、领域适配器与测试 |
| [docs/](README.md) | API、界面、数据与运行契约；历史交接在文档索引单列 |
| [engineering/](../engineering/README.md) | 架构、研究、设计、执行与发布批次 |
| [evidence/](../evidence/README.md) | 按批次命名的验证记录、原始结果与回执 |
| [benchmarks/](../benchmarks/README.md) | 评测输入、执行器与评分方法 |
| [tests/](../tests/) | 仓库级兼容与基础测试，由应用测试命令一并运行 |
| [tools/](../tools/README.md) | 检查与依赖打包工具 |
| [site/](../site/README.md) | Pages 源码、媒体与固定产品回放输入 |
| [brand/](../brand/README.md) | 可独立使用的 SVG / Web component 包 |
| [PAPER.md](../PAPER.md) | 独立论文源的版本绑定 |

## 源码与生成物

Pages 的 `site/src/`、`site/scripts/`、媒体及当前录制是构建输入。`site/dist/` 与 `site/specimen/` 下的 vendor 副本、HTML、copy、manifest 由 `node site/build.mjs` 生成，不提交 Git。GitHub Pages workflow 在干净 checkout 中构建并上传 `site/dist/`。

`brand/exports/` 是独立 SVG 包的分发资产，保留源码、生成器与 manifest。应用的 vendored JS、图标与许可证同样是产品分发输入，按 `tools/` 中的配方更新。

## 文档与记录

- 产品当前状态只由 [engineering/current.md](../engineering/current.md) 汇总；目录索引负责导航。
- 契约记录字段、职责与兼容性；执行批次记录任务、作者与交付；验证包记录输入、方法、版本与结果。
- 旧版发布样本由对应验证包索引；涉及真机路径的旧标本只保留冻结 SHA、原路径与哈希，原始字节从历史 Git 定向召回。归档不自动进入站点构建。
- 活跃文档使用相对路径和公开来源链接。历史 Git 提交与既有归档字节保留其来源身份。

## 公开素材

公开产品截图使用独立合成数据与浏览器内容区；原始桌面参考截图、带地址栏或私人上下文的图像不进入公开目录。设计观察保留文字、来源类型、原文件哈希与保留策略。模型凭据、运行数据目录与个人工作文件留在仓库外。
