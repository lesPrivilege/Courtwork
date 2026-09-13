# Work review · 独立工作对象卡片

用户在2026-09-13提供截图并同意施工。基线44953e7，卡片产品4c55562；随后合入同期main 9a5694c（活动行/Context），再将卡片移到活动行之后，避免Completed被误读为工作状态。Astra作者检查，不声称独立视觉接受。

## 变更与语义

最近实现先例为[Core摘要入口](../release-core-summary-20260913/README.md)、`createWorkReviewSummary`的稳定opener与`flowRow`，材质沿现有`panel/line/radius-container`；用户截图的紧凑文件卡只借鉴对象边界，不借其Undo/文件编辑语义。遵循[前端合同](../../engineering/design/agent-interface-2026-09-10/frontend-contract.md)。

原[消息尾部形态](user-before.png)改为实际Core工作标题＋待审摘要＋Review，单个button可键盘操作，完整名称供屏幕阅读器/原生title查看。旧版本与只读保持事实，缩短为摘要；零pending退为无框安静入口。卡片仍只出现一次，作为message-list之外的独立section位于活动行之后，同Matter空Chat仍可发现。

正常卡片移除常驻refresh。打开现有Review会重新读Core surface；运行结束、正式动作、workspace refresh、窗口重新可见等原摘要刷新触发继续有效；读取失败保留具名重试，loading/失败不保留旧计数。未额外增加审阅面刷新控件或新的菜单。Core字段、权限、CAS、正式接受和持久化不变。

受影响grammar：work.composition的对象入口、会话默认/上下文信息预算与浅边界材质。仅改变展示和位置，不赋予消息或Run新的权威。无新增图标、颜色值、圆角token、动画或依赖。

## 作者验证

- Node22.19定向[12/12](author-12.tap)；补充失败重试可用断言后[view 6/6](final-view-6.tap)。合入活动行并调整顺序后，summary view/Core/semantic guards/run activity共[17/17](integration-17.tap)。本片未重跑全量。
- lint-colors、lint-materials、lint-interaction通过；[既有角色对比度](contrast.md)生成。未将脚本覆盖解释为完整视觉合规。
- 4c55562卡片：明暗1440/1280/390截图，宽屏一行、390两行且Review在右；见同目录light-/dark-图片。
- 最新合流顺序：[完整1440](integrated-dark-1440.png)、[390](integrated-dark-390.png)。390实测innerWidth=scrollWidth=390，单一region；Enter打开原Review→Enter关闭后焦点返回同一具名button。
- [同Matter空Chat](same-work-empty-chat.png)沿相同Core状态显示入口。合成fixture由独立Host/data-dir提供，只用Local test；无个人数据或真实Provider。
- 零pending、stale/read-only、loading/失败、迟到/错scope响应由既有定向测试覆盖；本次未为这些状态另做完整浏览器截图矩阵。长标题省略并保留完整accessible name/title，未另跑极端长文本浏览器；200% zoom、forced-colors未实测。无新motion/透明材质。

本片仅局部UI交付，不签整体Release，不push/tag/deploy。
