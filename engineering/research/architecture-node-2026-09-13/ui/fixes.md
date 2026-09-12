# Astra UI修复与后续裁决

本次修改仅涉及`app/web/index.html`与`app/web/styles.css`。界面合同按[frontend contract](../../../design/agent-interface-2026-09-10/frontend-contract.md)执行；审查/运行状态仍由原service和Core owner决定。

## 已施工

1. **Files长内容关闭入口**：最近已实施先例为Attention长内容dialog（`app/web/styles.css`的`.attention-agent-dialog`、header及stream）。Files保留原生modal与右上角Close，标题区退出滚动内容，新增body滚动区域；inner显式受viewport高度约束，避免自动尺寸使header整体被卷走。首版仅flex约束不足，Luna截图44记录其失败，随后补入显式inner高度上限，Luna在175%缩放下滚动并点击可见X通过（[截图50](50-files-175-scrolled.png)）。属于overlay overflow grammar，不改关闭/草稿保存处理。
2. **Settings入口语义**：最近先例为现有Settings主区页面与左上Back。删除入口button的`aria-haspopup="dialog"`；目标实际是页面，不让辅助技术期待不存在的modal。返回处理仍使用原opener。

现有Settings导航/偏好、Intake UI和Chat Sources四组51/51通过；interaction lint通过。独立浏览器检查见本目录Luna审计，不把作者源修改或静态检查称为独立接受。

## 后续投影缺口

Core待Review的可发现性：Chat Sources关闭时延后读取Core surface，`Open work review`随已验证workPacket显示在折叠内容内。Run Completed只有执行事实，不能被用作“已接受”或pending徽标来源。后续应由现有Core surface/工作绑定提供稳定摘要投影与刷新生命周期，再提升入口；本节点不引入另一份pending账本，也不宣称这个跨owner接线已完成。

页面Back、modal Close、inline disclosure summary各自承担返回、退出和展开/收起；一致性要求来自交互家族、位置和焦点连续性，不能统一替换为一种容器。本次部署不等于所有产品门通过。
