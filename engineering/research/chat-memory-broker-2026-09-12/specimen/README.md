# Chat连续性 · 三场景施工单

基线 `ee8d9df690975a574432ec4ddeb967d094271d26`，延续独立分支。用户同意施工，Luna fast explore；Astra在绘制前冻结责任，Luna先召回并提供初版呈现，Astra接手完成页面与CSS；独立复核另记。唯一入口仍为[前端计划](../frontend-plan.md)，本文件是其第二片交付，不增总路线图。

## 绘制前责任冻结

| 事实 / 动作 | 既有责任 | 本片处理 / 尚存缺口 |
|---|---|---|
| CW托管Session、模型选择、发送、取消 | RuntimeService / provider config / command准入合同 | 仅fixture adapter模拟通道回执；不调用生产API，原生/投影通道不生成Run |
| 原生Provider入口 | 已验证的provider channel，导航与账号边界 | 独立演示入口，不真实登录/嵌入/采集；无模型/Stop控制 |
| 保留来源身份、revision、representation、coverage | RD-007、RG-BE-01/02与Intake owner | 固定合成原件与精确版本；生产capture/统一exact reader仍未交付 |
| search/read/grant | Broker组合原owner reader，RG-BE-04 / LG-02 | fixture每次读取重新检查scope，撤权清理投影，中文短查询用字面匹配；不声明真实Broker服务 |
| 工作关联、判断预览、过期版本 | Core来源/决定/义务owner | 仅读取合成工作事实与候选预览；不提交、接受或关闭工作 |
| draft、展开、阅读位置、异步页面结果 | 现页面访问/交互状态；Shell FE-NAV合同 | 仅fixture view/controller临时状态，按账号/通道/会话/场景隔离；不建生产导航store |
| 来源详情与预览关闭 | 原对象引用与瞬时surface返回合同 | 不取消运行、不撤权、不更改工作事项；旧请求用scope+请求身份拒绝晚到覆盖 |

每次页面状态必须能解释对象与版本、可读与缺失、动作责任、失败保留和返回位置。正式接受/关闭/披露权不由specimen创建。实现后的最小字段/查询/动作映射另记在本目录，不升级为生产DTO。

## 三个可操作场景

1. 无来源讨论：可用的合成托管通道发送并保留未发送草稿；无连接不自动切账号，拒绝发送不改变项目/Session身份。可切换原生入口/只读投影，只有明确选定托管通道才出现发送控件。
2. 部分资料：字面搜索→精确命中→来源详情→原引用与滚动/展开/草稿；缺附件明确覆盖，搜索后撤权拒绝read并清除缓存正文。
3. r1/r2：旧引用始终读r1；读取r2变化与相关工作→判断预览；证据不足与版本过期可解释，刷新预览不提交决定。Chat不复制Attention inbox。

场景选择与正常/缺失/拒绝切换属于可见的“合成演示”控制区，与产品正文分开。测试迟到通过有界延迟读取，切换账号/会话/来源后不能覆盖新详情。测试数据不从个人资料读取。

## 责任与文件

Astra：本合同、fixture adapter/controller、隔离静态预览、集成与最终验证。Luna：快速召回与index/view初稿；Astra接手完成view/index/CSS。另一位Luna对adapter/controller及最终页面做有界非作者静态复核，范围见验证记录。现有 `app/web` 的Markdown、user message、actions、原生控件、model picker可消费；无可抽取的通用composer时复用现DOM/class与行为，不趁本片重构。

新页面只是 `app/tests/fixtures/chat-continuity/` 下的独立specimen。后续按实测字段差额接原RG/LG/BE owner；既有后端施工不会被本片新增前置。

## 本地使用

在仓库根运行 `node app/scripts/chat-continuity-preview.mjs`，打开 `http://127.0.0.1:8898/`；可用 `CW_SPECIMEN_PORT` 选择独立端口。服务器仅提供静态GET/HEAD，拒绝API、写入与跨挂载路径。Reset清除当前页面合成状态；刷新页面同样重新开始。

[字段与接线差额](field-map.md)和[验证记录](verification.md)构成本片交付。截图是候选specimen证据，不是生产视觉baseline或真实Provider能力证明。
