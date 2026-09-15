# PR登记 · Agent Run聚合与消息呈现

2026-09-14，Astra裁决，main `7e1a1ff047721e1ca6c871deba7f367ccea55a06`。用户要求登记引用讨论，并追加user message时间靠右。状态：本地PR正文/工单，待实现，未创建远端PR。接本目录Chat Flow原任务，不新增独立路线。

## 输入与核对

[完整返回会话](run-surface-input.json)：1轮2消息，hasMore=false，第二次扩大输出后正文未截断；来源是讨论输入，不是执行授权或源码事实。六张图片返回临时路径，本登记未据图片作视觉验收。当前用户另明确时间靠右。已读UX Grammar、frontend-contract及既有Chat Flow，实现先例为thread-projection、user-message、chat-actions、app渲染与followLatest。

源码确认：thread-projection在tool start/update/result及assistant/final后nextSegment；app创建assistant footer时附time/actions；chat-actions允许pending copy，其他能力仍须实际支持；schedulePolling默认900ms；workspace-tools的ask模式每次ws_write精确请求批准。这能解释部分密度与更新节奏，但未经现场性能量测，不把900ms当唯一卡顿根因。

## 本PR主片：可阅读的长Run

责任：Host事件日志/Run身份与权限事实不变，Chat projection持有派生分组，renderer持有展开、焦点和滚动。初始写权候选app/web/thread-projection.mjs、app.mjs、chat-actions.mjs、user-message.mjs及对应styles/tests；共享文件由唯一writer串行修改。

- 一条用户消息下显示一个稳定Run工作面，聚合中间叙述与工具，默认折叠已完成动作；正在执行、失败、等待批准的动作可发现。完整trace按需展开，不删日志或精确文件版本。
- 中间叙述/流式pending不生成普通消息footer；终态有真实最终回复时才呈现该回复与实际支持的消息动作。失败、取消、unknown、无最终文本保留真实结果与部分内容，不将最后一段工具前叙述冒充最终答复。所谓“1 Run + 1 final”只适用于确有final的完成Run。
- 用户消息时间在所属气泡下方的footer右侧对齐，不按全屏右缘定位；保留time语义、完整日期披露、复制/编辑动作与键盘顺序。窄屏和长消息不挤压正文，也不改变assistant时间对齐。
- 运行中按稳定run/segment身份更新；保持展开、选择、焦点和阅读位置。增量Markdown不能破坏代码块/链接；Back to latest依旧反映用户是否主动离开末尾。
- 新片段短reveal为待目验候选，沿现有motion token与reduced-motion；不预锁外部80–120ms，不逐字延迟显示已收到内容，也不靠动画宣称传输改善。实施动效时读取适用motion skill。

## 后续切片与处置

“Allow edits for this run”：adjust，登记Host权限切片。需先定grant scope、对象/Run/capability、事件与幂等、终态/重启失效、撤销及在途调用语义；不改变Chat持久permissionMode，不涵盖MCP/delete/任意shell，不静默复用exact-byte授权。没有后端合同前不显示可用按钮。UI聚合不以减少审批次数为接受标准。

SSE/有界long-poll：defer至传输切片。先量测provider→Host→浏览器→绘制时间，再沿现有cursor/去重/重连/终态合同选型；polling可保留恢复通道。不可直接用缩短轮询或装饰动效声称流式问题解决。

## 验证与退出

用本轮scheduler Run事件作脱敏固定回放：多次读写/中间叙述仍聚合，工具数量/顺序及日志身份不丢，批准动作绑定原call。覆盖completed/failed/cancelled/unknown/等待批准、空final、重复/迟到事件、刷新与历史重开；确定性Host+GUI复验不能替代真实模型结果。

完整Chat/Attention共享消费者、桌面与390px、明暗、键盘、200%缩放、长代码/长中文、reduced-motion；核对用户时间右缘、动作目标、滚动与选择保持。按变化选projection/行为测试及interaction lint，后端权限/传输另跑真实接缝。Astra负责架构/关键视觉，Luna探索及非作者复验。文档登记不宣称实现、部署或独立产品接受。

## 2026-09-16 · 主片实现回执（Claude 施工单 04）

沿本 PR 主片在 [04 记录](../../execution/claude-frontend-harness-2026-09-16/04-run-surface.md)实现三项未完项：已结算成功调用在任意 Run 状态下折叠、用户时间贴气泡 footer 右缘、Chat 与 Attention 共用 `run-rows.mjs` 的工具行。中间叙述不带 footer、Stop 三态、刷新只读回原 Run 经比对已在 Copy P0 与既有实现中交付；"Allow edits for this run"按上文继续不出现。作者定向与全量测试通过，浏览器目验一条含失败写入与两次检查的 Run；非作者复验、390/200% 目验与 SSE 传输片仍开放。
