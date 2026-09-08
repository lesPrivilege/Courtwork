# V7-02：通用工作面入口与阅读布局

2026-09-06，Astra。状态：Astra已按 source-selection.md 冻结，允许Luna在指定web范围开工。已有观察见 claude-observation.md、源码包恢复与 evidence/browser-v7.md 基线记录。

## 问题

Runtime setup 的 Bind to session 只打开对话框背后的表单，用户看不到动作结果。现有右侧Preview固定为窄阅读区；同一个工作对象需要更充分阅读空间时，只能挤在原布局。两项都属于通用UI编排，不需要改变SE对象或renderer。

## 冻结责任

实现者拥有新目录 app/web/**；非作者验收拥有 evidence/surface-review/**。只能调整通用宿主，不改变runtime、Core、API、依赖锁、extensions/**或Paper。不改renderer内部专业表单，不搬deferred。

1. Bind入口：关闭Runtime setup并显示实际绑定表单，焦点进入第一项可输入字段（没有字段则Create binding）；通用字段仍由manifest决定。关闭事件不能随后把焦点抢回Runtime setup。取消绑定返回可见通用入口。正常关闭开发对话框仍返回原入口。
2. Preview增加Expand work surface / Return to chat明确可逆控件。仅改变布局；保持同一renderer实例和opaque DOM、当前投影与未发送普通草稿。不得借扩展重挂或reload实现布局切换。
3. 展开后聊天与侧栏退出可见和键盘/可访问性树的交互范围，返回恢复；不得隐藏后仍让Tab进入不可见控制。关闭展开工作面应回到聊天，Show work surface可重开同一实例的split布局。
4. Escape在无打开dialog且未被renderer阻止时先退出展开布局，不改变正式状态；控件名称及aria状态表达真实动作。原Runtime setup的Escape/焦点行为保留。
5. 布局模式为本页、当前会话的视图状态；切换会话回到split。不承诺持久恢复/跨会话保留/浏览器真实导航、多对象tab或Preview/Code协议。关闭重开同身份opaque字段仍沿用V6保留契约。

## 必须验证

通过用户可见控件完成Bind→字段可见且焦点正确→Cancel；普通关闭dialog焦点回原入口。通用fake renderer含opaque输入与滚动内容，实际expand/return/close/reopen中记录mount/update/dispose次数，布局变化不得触发生命周期调用。普通composer值及当前session隔离，键盘Escape/Tab、窄视口控件可达、旧Preview生命周期反例均需验证。

视觉Polish后置；本单只补可操作阅读与路由。未实际验证的scroll/真实IME/读屏不能写成通过。
