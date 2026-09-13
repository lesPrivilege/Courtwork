# 入口文案与 Workspace 二级卡片 · 2026-09-14

用户要求 Luna 审核冗余入口动词，并追加 Workspace 弹层沿既有二级小卡片 grammar 绘制。基线 `d62cee7`，Astra 裁决与实现；[Luna 有界审核](audit.md)不等同于实现后独立接受。

## 去留与最近先例

| 处理 | 文案 / grammar | 承重与作用 |
|---|---|---|
| 单词化 | Choose workspace → Workspace | composer 默认标签、tooltip、popover 可访问名；选中后保留具体名称与 Workspace 上下文 |
| 单词化 | Manage connections / Change connection → Connections | Home 页脚与连接详情中的设置导航；原回调不变 |
| 单词化 | Choose model & effort → Model & effort | 连接详情内选择器入口 |
| 单词化 | Manage tools → Tools；Manage / Review permissions → Permissions | 设置深链，持久策略不伪装一次 Review 决策 |
| 单词化 | Open Developer / Inspect runtime → Developer | 与实际设置目的地同名 |
| 保留 | Save、Delete、Connect、New project、Hide / Show modules | 实际动作、创建或展开状态；不机械移除动词 |
| 重排 | Workspace popover | 复用 `chat-actions-menu` 的浮层容器与整行控制；36px 桌面、44px 窄屏/触屏，左对齐，选项与创建入口用细线分组 |

最近实现先例为 `app/web/styles.css` 的 `.chat-actions-menu` 与 `.context-row`，定位继续用 `ui-controls.mjs` 的 `anchorPopover`。按 [frontend contract](../agent-interface-2026-09-10/frontend-contract.md)、[overlay contract](../home-composition-2026-09-10/disclosure-overlay.md) 和 [copy convention](../copy-convention.md) 施工。复用几何/表面和行样式，不套用 action-menu 的 ARIA 协议：仍是原非模态 dialog、普通 Tab 按钮序列。`aria-pressed` 对应 Home 草稿选择；Selected 文字提供非颜色标记，`aria-hidden` 避免重复读出状态。选项选取、关闭、焦点恢复与创建对话框均沿原 owner。

Astra 补充裁决：Luna 的保留项包含 `Change connection`；当前连接卡片上的同名控件实际调用设置导航，不立即变更连接，因此本片将该处收敛为 `Connections`。真正的编辑/保存动作继续保留动词。

## 作者验证

- 定向 52/52：[原日志](evidence/targeted-tests.log)，覆盖 Home、草稿附件、projectless、Models 与 Provider 登记。前置 Models 完整 999/999 见 [主片](../../research/models-provider-registration-2026-09-14/implementation.md)。本片未重复运行完整套件。
- 浏览器：桌面与 390px 明暗，popover 行等宽；390px 文档无横向溢出，两行均 44px 高。Escape 回 `home-project-button`；New project 转移焦点到名称输入，Cancel 回 Workspace，无创建或模型调用。Tools 链接键盘 Enter 到 Tools & Integrations。
- 交互、颜色、材质 lint 与对比度检查通过；文档链接检查通过（1,235 份文档、6,924 条链接）。主题已恢复 System，临时 viewport 已撤销。
- 未覆盖原生宿主 200% 缩放、完整读屏与实际长名称项目；作者截图不称独立视觉接受。

[改前 composer](evidence/01-composer.png) · [改前弹层](evidence/02-workspace-menu.png) · [改前 Models 链接](evidence/03-models-before.png) · [改后桌面](evidence/04-workspace-after-desktop.png) · [390 明色](evidence/05-workspace-after-390.png) · [390 深色](evidence/06-workspace-after-390-dark.png)。本片由发布任务统一合流，不在此工作树操作 main 或部署。
