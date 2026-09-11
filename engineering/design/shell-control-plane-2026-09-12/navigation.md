# FE-NAV-01…03 · Navigation history

状态：已裁前端合同，未实现。先消费[现有Settings/overlay先例](../agent-interface-2026-09-10/precedents.md)，不把Settings hash支持泛称为完整deep link。

## 历史单位

LocationSnapshot由Shell持有，是可验证的导航描述：版本、surface、带类型/owner的primary object reference、subview、该view支持的selection/filters、scroll anchor和可选inspector reference。这里只冻结字段职责；具体route枚举/序列化在首片按已实现surface闭集冻结，未实现Expert/Plugin detail不预造可达路由。

对象ref包含解析所需scope（例如Session/Run所属关系），不能用一个裸objectId猜owner。地址是导航输入，不是授权。URL不携带凭据、草稿正文、工具参数或任意可执行内容。Filter/selection只保存该view认可的有限字段，未知字段拒绝或规范化为已知安全默认，不产生网络副作用。

历史在本窗口内存保持；不要求重启恢复完整stack。可深链位置必须经稳定版本化parser解析、现有reader重查权限/对象并显示未知或不可用。重启URL定位不恢复旧授权、draft或未完成动作。

## Push、Back与恢复

1. 成功进入不同语义位置才push；重复打开同位置不造重复项。跳转失败留在原位置并保留草稿。A→B→Back→C截断forward；边界Back/Forward无副作用，控制disabled。
2. Popover、hover、局部展开折叠不进入全局stack。Tabs按语义判别：纯投影tab不push，打开不同primary object的tab视为对象导航，不能只因HTML叫tab而一律排除。
3. Shell Back命令有可关闭modal时先走该modal既有关闭/未保存处理与返回焦点，不同时pop位置；不改变浏览器原生Back规则。浏览器history/hash与Shell stack的单一同步策略必须在首片冻结，避免双回退与重复push。
4. 恢复按view owner保留selection/filter/scroll anchor/inspector。草稿仍由现有Session/composer状态持有，历史只引用位置，不复制一份文本缓存。先恢复对象/过滤，再等render落位后恢复anchor和焦点。
5. Anchor消失或布局变化时退回最近仍存在锚点/该view起点；opener失效时焦点落入目的面标题或首个合法控件，不落到卸载节点。Session切换时沿现有epoch/generation防止迟到异步响应覆盖当前位置。
6. 对象已删除、无权、历史版本不可读时显示明确unavailable并允许继续Back；不自动重建、改scope或跳到同名对象。历史引用不延长披露权。
7. Run仍按原逻辑运行；浏览/返回不发送草稿、重试、取消或重新绑定。Preview与真实对象有不同namespace，不能Back到fixture时借用真实写权限。

“Attention item→Matter→Run→Capability”是目标访问链示例，只有相应真实入口存在才纳入；不据此宣称当前整链已实现。快捷键可后置，首片须处理输入框、组合输入、宿主保留快捷键及按钮可访问名称，不直接劫持所有⌘[／⌘]。

## 首片验收

有界内存stack+当前已有surface adapter先行；行为覆盖forward截断、重复/失败导航、modal先关闭、Settings hash同步、对象失效/权限变更、草稿/选择/筛选/scroll/focus恢复、迟到加载与跨Session隔离。只测试地址改变不算恢复通过。再补真实宽窄明暗、键盘、200%与相邻完整场景；无此证据不加Shell箭头宣称完成。
