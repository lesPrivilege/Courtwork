# Core Review摘要 · UI变更记录

基线 `f8ffa9bf48062b750b27a5702995fe808950e9d2`，隔离分支 `codex/release-core-summary-20260913`。Astra定Core接缝、实现backend、集成与作者浏览器检查；Sol只拥有新摘要组件/测试及app入口最小接线；Luna源码审阅与非作者有界验证。共享main前端writer不被覆盖。

Owner为[Core合同](../../docs/work-core/contract.md)、[摘要API](../../app/docs/work-review-summary.md)。最近已实现precedent为基线的 `app/web/chat-sources.mjs:createChatSources`（session/binding/epoch读取与Open work review）、`app/web/app.mjs:dispatchSurfaceAction/loadSurface`（精确动作、失败重读）、`app/core/owner.mjs:workProjection/candidateBasis`（同快照与动作owner）。相关Chat来源[交付](../../engineering/research/chat-memory-broker-2026-09-12/ui-completion/README.md)和[工作动作证据](../work-review-actions-20260908)保留各自接受范围；本轮截图为候选，不替换已接受baseline。

Grammar为 `output.review`、`projection.status` 与 `button.action`；沿[frontend contract](../../engineering/design/agent-interface-2026-09-10/frontend-contract.md)。保持Core正式决定与工具Approve、Run Completed分离；读取与写入分离；权限由真实descriptor与原action路由持有。改变的是入口位置：最小待审摘要位于Sources折叠外；有消息时在消息尾部，空消息会话也能发现。无新token、颜色、材质、动画、依赖或全局导航。

任务骨架为发现待审→打开当前工作审阅→按原schema作决定。默认层仅计数、过期/只读必要解释及Open work review；来源正文、候选细节和正式操作沿原审阅面按需展开。Refresh重新读取Core；错误/加载明确不可用，不以旧计数冒称当前。UI不重建待审账本，不用Run终态推导工作接受。

固定数据来自实际HTTP/Pi loopback/Core的合成NDA，一条有candidate的会话、同Matter的空消息新会话、一条无绑定会话。独立随机端口与仓外dataDir，无个人数据/真实Provider。基线画面见before-empty和before-empty-1440；后续浏览器矩阵与验证结果见本目录README，未记录为通过的矩阵仍未验。

## 用户目测接续

用户指出Execution图标/标题/成功计数被过度横向拉开，且左侧消息默认属于agent，无须Assistant标签。沿`ui-controls:flowRow`最近先例，仅execution modifier收紧标题/metadata并左对齐；显式aria-expanded的flowRow按钮复用原summary chevron，展开状态沿原attribute旋转。Chat与Attention移除重复角色头，顶层身份、消息正文、正式Work/工具状态保留。用户[原截图](execution-before-user.png)、[桌面修复](execution-after-dark-1440.png)、[窄屏修复](execution-after-dark-390.png)及[局部](execution-after-detail.png)留证。作者浏览器点击展开、Space折叠通过；Luna非作者现有相邻18/18通过，新增button分支无独立unit断言，浏览器覆盖实际可见联动。

用户随后指出Work review区块堆叠。接续基线`ff1fe0e`，任务骨架仍为发现待审→进入原Review；沿`ui-controls:flowRow`的紧凑入口和既有icon action，只调整默认信息层：Work review与待审数量合为单一入口，过期/只读必要说明保留，已接受成果的详细状态回原Review读取。Refresh降级为有可访问名称的图标操作。加载/失败清除旧计数、同一opener、scope与generation约束不变；不新增或推导正式工作状态。用户[改前截图](review-summary-before-user.png)保留。
