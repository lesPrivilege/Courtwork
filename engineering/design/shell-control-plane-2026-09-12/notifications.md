# FE-NOTIFY-01…04 · Event awareness

状态：前端呈现/owner边界已裁；事件与已读API、持久化尚未实现。现有[Attention合同](../../../docs/work-core/attention.md)保持权威。

## 事件与工作对象分开

通知表达“发生过什么”：对象、真实状态、发生时间、可用目标。Attention表达有责任与后续动作的Core对象。Run question/approval仍归既有Run/permission owner；并非每个需要输入的提示都可以无合同转成Core Attention。材料中的scheduled/export/plugin/auth示例只在其生产者真实存在时接入，不预置事件。

Notification read/unread只代表该用户的认知标记；不resolve Attention、批准工具或决定Matter。通知记录不能成为绕过披露政策读取对象的副本。面板打开与对象打开是否标read必须由动作契约明确，首片建议显式mark-read（含清楚定义的单条Open成功路径），不能因hover或收到网络包标读。

## 后端需要冻结

沿Host事件投影owner保存稳定notification id、producer/source event id、受限object reference、kind、occurredAt、可选receivedAt、版本、失效/保留规则与用户read revision。来源时间未知就保留未知，不用接收时间冒充事件时间；乱序列表排序规则固定。已读状态不能只落DOM或跨用户共享localStorage。

去重键为producer+source event identity；同事件重放返回同对象，不能以相同标题/近似时间合并真实不同事件。Grouping只是投影，保留组内每条对象/事件与精确数量；分页/重新连接不改变read事实。聚合、保留、scope与多窗口同步必须有明确覆盖；未有账本不能显示可信“全部未读N”。

Notification→Attention是**显式关联流程**：经既有Core创建/关联合同验证适用性、scope与可信actor，幂等返回同一Attention reference。Host保留通知事件及关联，不复制一份可独立决定的Attention状态。跨owner不能靠两次无协调写入声称原子promotion；需要持久请求/回执与重启恢复方案，失败显示待关联/失败，不先假报成功。已有Attention时直接关联，不重复创建；原对象被resolve不自动擦除通知历史。

对象跳转复用[FE-NAV](navigation.md)稳定位置和当前reader，不能保存任意URL后直接执行。对象无权/被删时回到通知的不可用状态，不泄露被撤销对象正文。

## 呈现与验收

轻量列表按真实时间分组，条目含对象、状态、时间和Open；短文案不能省略影响理解的unknown/失效。Unread通过文字/可访问标签与视觉共同表达；沿现有semantic role，不新增“默认蓝点”色。面板使用既有popover/dialog择位、键盘和返回焦点规则，不仅靠图标颜色。

验收：重复/乱序事件、多窗口mark-read冲突、分页/断线恢复、保留/删除、权限撤回、关联重放/崩溃、无新Attention副本、read不改工作状态、空/错误/长标题与键盘返回。没有真实事件/read能力时不加入可用Bell或假未读点。
