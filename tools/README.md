# 检查与维护工具

从仓库根目录运行：

| 命令 / 目录 | 用途 |
|---|---|
| `node tools/check-doc-links.mjs` | 仓库文档与索引链接检查 |
| `node tools/lint-colors.mjs` | 产品颜色角色与字面量检查 |
| `node tools/lint-materials.mjs` | 产品材质与 reduced-transparency 检查 |
| `node tools/lint-interaction.mjs` | 交互语法负规则检查（WK-140 / WK-146） |
| `node tools/contrast-report.mjs` | 产品 token 对比度报告 |
| [ui-vendor/](ui-vendor/README.md) | UI 依赖与图标的可复现打包 |
| [markdown-vendor/](markdown-vendor/README.md) | Markdown parser 的可复现打包 |
| [site/scripts/](../site/README.md) | 页面构建、链接、材质、录制与浏览器检查 |

应用验证命令见 [app/README.md](../app/README.md#checks)。工具生成的产品分发文件与许可证清单按各自 README 维护。
