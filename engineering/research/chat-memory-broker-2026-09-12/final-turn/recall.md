# Luna快速召回 · 本地先例

基线 `6bfb234`，只搜索当前Courtwork实现与索引；不搜索legacy。Astra消费下表裁定复用共享呈现、分离页面语义。

| 问题 | 最近入口 | 使用上限 |
|---|---|---|
| Chat产品结构与参考 | [Chat reference index](../../../design/chat-product-page-2026-09-11/reference-index.md) | 来源候选，不代签实现 |
| 按问题查Design Scout | [Scout](../../../design/scout/README.md)、[digest](../../../design/se-control-one-shot-2026-09-11/scout-digest.md)、[固定索引](../../../design/se-control-one-shot-2026-09-11/scout-digest-index.json) | 按局部问题召回，不全库重读 |
| 普通Chat消息流 | [app.mjs](../../../../app/web/app.mjs) `renderMessageStream` | Session/Run身份保留 |
| 用户消息 | [user-message.mjs](../../../../app/web/user-message.mjs) `renderUserMessage` | Markdown/source、复制/编辑草稿、时间沿现实现 |
| Attention对话 | [attention-agent-view.mjs](../../../../app/web/attention-agent-view.mjs) | 复用消息组件，不复用global权限实现普通Chat |
| 消息动作 | [chat-actions.mjs](../../../../app/web/chat-actions.mjs) `createChatActions` / `createProductionActionAdapter` | 呈现与瞬时状态；实际能力由adapter决定 |
| 局部披露 | [precedent map](../../../design/agent-interface-2026-09-10/precedent-map.md) contextual.actions / popover.inspector | 不是已接受的通用工具栏/Inspector |

CSS根因：`styles.css`中后置 `.assistant-message-actions:has(.chat-actions) { opacity: 1; }` 覆盖原hover规则。用户消息已有hover/focus逻辑；这次统一两类footer，补菜单/反馈/确认/busy及coarse pointer和reduced-motion。文件actions不在消息footer选择器范围。
