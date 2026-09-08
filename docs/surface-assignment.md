# V7-02：通用工作面入口与阅读布局

2026-09-06，Astra；2026-09-08 按 WK-72 / WK-74 改写第 2–4 条的形态（WO-WK10b 第一段）。状态：Astra已按 source-selection.md 冻结，允许Luna在指定web范围开工。已有观察见 claude-observation.md、源码包恢复与 evidence/browser-v7.md 基线记录。

**形态更新（WK-72 / WK-74）。** 本页原文写的"右侧 Preview 窄阅读区"与"split 布局"是当时的三栏读法。现行模型：主区只有一个 L1 面（Chat Flow）与一条 header 带；工作面收敛态是锚在主区右 gutter 的 L2 悬浮卡（无独立 header、无独立标题），宽度不足时收成右缘的模块 glyph 竖条；展开态是覆盖主列的 L3 overlay，内含一条 tab 条与一个返回控件，**侧栏保持可操作**，`aria-modal` 只在 < 1024 的覆盖态出现（WK-74 (1)）。下述职责、生命周期与 Escape 次序条款不变，只是"split / 第三列 / rail header"三个词按上述模型阅读。

## 问题

Runtime setup 的 Bind to session 只打开对话框背后的表单，用户看不到动作结果。现有右侧Preview固定为窄阅读区；同一个工作对象需要更充分阅读空间时，只能挤在原布局。两项都属于通用UI编排，不需要改变SE对象或renderer。

## 冻结责任

实现者拥有新目录 app/web/**；非作者验收拥有 evidence/surface-review/**。只能调整通用宿主，不改变runtime、Core、API、依赖锁、extensions/**或Paper。不改renderer内部专业表单，不搬deferred。

1. Bind入口：关闭Runtime setup并显示实际绑定表单，焦点进入第一项可输入字段（没有字段则Create binding）；通用字段仍由manifest决定。关闭事件不能随后把焦点抢回Runtime setup。取消绑定返回可见通用入口。正常关闭开发对话框仍返回原入口。
2. Preview增加Expand work surface / Return to chat明确可逆控件。仅改变布局；保持同一renderer实例和opaque DOM、当前投影与未发送普通草稿。不得借扩展重挂或reload实现布局切换。
3. 展开后**主列**退出可见和键盘/可访问性树的交互范围，返回恢复；不得隐藏后仍让Tab进入不可见控制。**侧栏不退出**（WK-74 (1)：本条原文的"侧栏退出交互树"只在 < 1024 的覆盖态成立）。关闭展开工作面应回到聊天，Open work surface 可重开同一实例的悬浮卡态。
4. Escape在无打开dialog且未被renderer阻止时先退出展开布局，不改变正式状态；控件名称及aria状态表达真实动作。原Runtime setup的Escape/焦点行为保留。
5. 布局模式为本页、当前会话的视图状态；切换会话回到收敛的悬浮卡态。不承诺持久恢复/跨会话保留/浏览器真实导航、多对象tab或Preview/Code协议。关闭重开同身份opaque字段仍沿用V6保留契约。

6. **槽位与缺席（WK-43 / 45，2026-09-08 新增）。** 宿主定义槽位（`work.surface`：输入 schema 与版本、允许的 intent、缺席回退），贡献者只声明意向。agent profile 的 `uiSlots` 是声明，不是 renderer 注册；挂载条件＝已加载的 producer 在本地 allowlist 内贡献了 renderer module。已声明但无已加载 renderer 时，工作面显示只读行（producer 名 · 状态词 · `stateVersion`），**不出现按钮、不发请求、不执行任何东西**；producer 缺席、renderer 缺席、producer 未加载三种情形分行陈述，不合并。后端返回空 projection 时只说读不到，不自造 Decision / Evidence / 已接受成果。

## 必须验证

通过用户可见控件完成Bind→字段可见且焦点正确→Cancel；普通关闭dialog焦点回原入口。通用fake renderer含opaque输入与滚动内容，实际expand/return/close/reopen中记录mount/update/dispose次数，布局变化不得触发生命周期调用。普通composer值及当前session隔离，键盘Escape/Tab、窄视口控件可达、旧Preview生命周期反例均需验证。

视觉Polish后置；本单只补可操作阅读与路由。未实际验证的scroll/真实IME/读屏不能写成通过。
