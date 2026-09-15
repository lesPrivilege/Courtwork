# Chat polish · 独立施工与验收项

2026-09-14，Astra登记，main `7e1a1ff`，现有Copy修改及其他writer保留。用户本轮将Access迁移定为P1 composer density；前一轮明确inline code与fenced block必须分别施工。本记录补足此前口头确认，不宣称新实现或远端PR。

## 同轮、独立边界

| 项 | 责任及状态 | 退出证据 |
| --- | --- | --- |
| Agent Run projection / pending chrome | [原Run工单](run-surface-pr-20260914.md)；聚合待实现，pending footer已有P0局部修复 | 真实Run多工具仍可阅读、完整trace与终态/批准不丢；user时间右对齐独立检查 |
| Copy feedback lifecycle | [P0回执](copy-feedback-p0.md)，本地代码已修、35项定向通过，视觉未验 | 1.6s恢复、无成功文本行、错误与迟到回执/失效节点保护 |
| Inline code contrast | 待施工，正文token owner，拟写styles中专用selector | `.markdown-body :not(pre) > code`或等价精确范围；轻量底色/字色/padding/圆角，非按钮；light/dark×assistant/user四阅读面；fenced视觉不变 |
| Fenced code density | 待施工，可复制code-block owner，与inline分开commit/验收 | assistant取消selected/line-strong重覆盖，沿中性阅读面和普通line；独立压缩toolbar、上下padding、行距，3–6行短块与长代码都检查；Copy仍可发现；inline视觉不变 |
| P1 Composer Access relocation | 下述合同，待施工 | 常见Home/projectless少一行，不能把该行塞回输入框成为第二层控制栏 |

inline、fenced、copy分别形成提交/验收点，不为凑三个commit改写已有历史。建立一份同时含prose inline-code及fenced-code的fixture，四reading planes同源截图；每片差异只影响其selector。截图是待生成证据，不是现有baseline。

## P1 Composer density · 架构与写权

源码已核对index.html：`.composer-context`为附件/Workspace，`#home-composer-context`与`#permission-settings-button`在`#composer-below`；styles同时保留WK-12/WK-55两种历史说明与empty隐藏规则。精确运行权限由原Session/Host合同决定，不因位置变化而变。

用户结果：Access与附件/Workspace同属左侧可操作context；右侧仍为model/effort与stop/send。Home保留原生select，已有Chat保留button→现有card，首片不新造统一权限控件。

拟写权：app/web/index.html、styles.css、必要的现有前端定位与对应测试；原ID/listener、state.homePermissionMode、Session permission-mode API及Floating UI anchor保持。如发现祖先selector/事件委托依赖，在本单记录最小改动；不改Harness、权限后端或Run grant。

将`home-composer-context`及`permission-settings-button`移入`.composer-context`；`composer-below`只保留已绑定`composer-project`事实，沿现有空容器隐藏。Home/projectless无外部事实时消除整行；有绑定Project时只显示其事实。

更新当前规则与相关活动源码注释：**composer内放影响下一次执行的可操作context，外放已绑定工作的事实**。Workspace/File access在内且左侧；Model/effort在内且右侧；已绑定Project在外；Run/status/message feedback留原owner。WK-55关于file writes必须在外的旧结论由本单取代，历史证据不改写。

响应式不以desktop推断低风险：检查768/1024/1199/1200与390宽、长模型名和Ask before editing。优先短状态/按需披露完整名称，确保附件、当前access、model与send仍可用；不得隐藏实际状态、扩大权限或增加永久第二行。极窄Workspace折叠若必要须保留可发现入口，不静默取消绑定。

## 验证与实施顺序

沿UX Grammar、frontend-contract及现有composer/permission popover先例；施工前固定唯一writer与实际基线。Astra控跨片边界/关键视觉，Luna有界实现或非作者复验。P1与Run projection独立实施，不同时争写app/style共享面。

P1验证Home首次创建permissionMode、已有Chat修改、running/waiting approval/completed禁用和回执、popover锚定/关闭/返回焦点、草稿/附件/workspace不丢。定向DOM/Host证据支持行为，真实截图验证一行密度、长文、键盘、200%和明暗；不新增付费provider要求。失败复现场景下沉现有测试。inline/fenced另跑颜色/对比度与相邻阅读面，均不借Copy已通过结果替代视觉验收。

本轮仅登记，未移动控件或更改code样式；未commit/push/部署。

## P1施工环境修正

用户按paste工单实测：CW Chat仅可读写托管out/，无仓库、git、exec或浏览器；指定engineering文件不可达。施工Agent正确停止、未造假产物。该次产品内施工未开工，不能通过复制源码到out/冒称仓库接入。

Astra处分：原发单环境不满足任务前置，改派本地临时隔离工作树codex/composer-access-20260914，基main7e1a1ff并携带当前Copy P0前端改动。Luna施工，另一Luna非作者验收，用户目验；均通过即可关闭，不要求Astra重复复验。本地完成不计作CW内Agent具备仓库施工能力。仓库接入与DF-04执行缺口接原合同，不在本P1暗增挂载或权限。
