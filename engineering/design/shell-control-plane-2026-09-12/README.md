# Shell：返回、提醒与观察 · 优先消费

2026-09-12，Astra裁决，基线`173129e91b84e8dd0b533c7db641ec6cf3394a06`。用户要求优先消费[粘贴建议](input.txt)，材料明确“Explore / contract only，no implementation”；本轮按此冻结前端语义与后端缺口。用户随后补齐三张Codex截图；已查看并按原字节保存，[逐图消费](semantic-reference.md)与[source hash](source-sha256.txt)区分可见结构、CW采用和未证实行为。

## 优先级与实际状态

| 优先级 / 编号 | 处置 | 最近实现与差距 |
|---|---|---|
| P1 FE-NAV-01/02/03 | 先冻结[访问历史与恢复](navigation.md)，再做Shell控制 | [app](../../../app/web/app.mjs)已有Settings hash、surface返回焦点与dialog关闭，尚非跨对象history stack |
| P2 FE-OBS-01/02/07 | 已有基础，扩展现有读面 | [usage-view](../../../app/web/usage-view.mjs)已有Overview、日历、Models与date/model→精确Run；不能登记成从零缺口 |
| P2 FE-OBS-04/05/06 | [Metric × Dimension合同](observability.md)先行 | 项目/日期/配置模型和reported tokens可复用；Runtime/Expert/Capability归因、Context新指标需各owner补事实 |
| P3 FE-NOTIFY-01/02/03/04 | [通知与Attention边界](notifications.md)，等待真实事件/已读owner | toast、Run notice、Attention都不等于持久通知中心 |
| P3 FE-OBS-03 | Week × hour保持独立grammar与后端缺口 | 现日桶无法推导小时分布，不能把同一值复制到小时格 |

输入先列四个Notification编号，尾部简表将unread/group/dedupe并成03；本轮统一：01面、02关联、03已读与对象跳转、04分组去重，保留原输入不改字节。编号是同一消费目录，不新建并行产品队列。

## 采用与修正

- 采用轻量Shell入口与复杂度进入二级面；图标、hit area、focus、tooltip及材质沿已有[icon controls](../icon-controls.md)和[frontend contract](../agent-interface-2026-09-10/frontend-contract.md)。不直接采纳“蓝点”或20–24px全局尺寸，颜色与glyph/hit target分别由当前role/解剖规则决定。
- Back按访问轨迹而非父级猜测；不操作Run、资源绑定、权限、决定或模型配置。
- 通知记录事件认知，Attention由Core持有可处理对象；相互关联，不互相镜像或凭read状态结案。
- Usage继续从现有retained-record/snapshot读面成长，不把Run、turn、消息混数，不把未知变零，不把示例计数当目标数据。

受影响grammar为Shell navigation、overlay return、notification list、temporal visualization与filter/drilldown；最近先例见上述源码与各分合同。此轮没有产品源码、DTO实现、依赖、图标或截图baseline变更。已有8804验证服务保持原样。

## 后端缺口与验收归属

[backend requests](../../mvp/execution/work-surface-kit/backend-requests.md)仅链接本合同的Notification ledger/关联、维度归因与小时聚合缺口，沿现有Host、Core和metrics owner，不建第二份Attention或遥测store。全局location/deep-link首先是前端合同；对象不存在/权限变化仍由真实reader决定。

本轮为Astra作者源码/合同核对；没有非作者实现接受、真实provider或浏览器行为验证。检查记录见[verification](verification.md)。之后各片按固定实现SHA补行为/宽窄明暗/键盘与历史恢复证据。
