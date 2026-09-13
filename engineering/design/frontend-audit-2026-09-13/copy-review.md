# UI 文案与 hover / focus · 有界收敛

2026-09-13。用户授权前后端合流，并要求 Luna explore 复核不必要的可见文字；“fover”按 hover/focus 理解。Luna 对隔离组合 `7fadc564` 只读探索 Home 热力图、Usage 与 Runtime，Astra裁决以下小片。此处是审查回执，不另建tooltip规范、全站文本替换器或产品状态owner。

## 裁决与本次实施

| 范围 | 判断 | 处置 |
|---|---|---|
| Home Activity | 用户能识别热力图；日期、recorded runs、统计范围、UTC、历史未知及 Last confirmed 是真实业务口径 | 全部保留，不补“这是热力图”的教学文字 |
| Home 日格 | 原生 title 与完整 aria-label重复，focus/click已更新可见live日值 | 原生title改用现有data-tooltip单例；保留aria-label、方向键与可见点选精确值 |
| Usage 颜色说明 | “Higher-contrast cells mean more…”属于图形常识，relative thresholds已在details | 删除此句；保留“Dotted outline: incomplete usage.”与覆盖数量、UTC及scale disclosure |
| Runtime 准入说明 | 全组、kind note、逐对象重复解释Skill按需加载和template返回草稿 | 登记下一批逐簇收敛；本轮未大规模改写，优先保留对象行实际状态与直接后果 |
| Runtime scope / MCP / Plugin | 权限规则、配置/连接/曝光分离、协议/认证边界、宿主信任会影响决定 | 决定处保留短规则；完整优先关系、manifest和来源放已有details，不藏hover-only |
| 源码注释 | 维护注释并非用户可见文案 | 不因界面减字机械删除源码注释 |

本次生产修改限[Home日格](../../../app/web/home-view.mjs)与[Usage说明](../../../app/web/usage-view.mjs)。最近先例为[已有tooltip索引](../agent-interface-2026-09-10/precedents.md)、[Home先例映射](../agent-interface-2026-09-10/precedent-map.md)和原生details；未增加新计时器、CSS层或图表色阶。

## 统一 grammar 登记

[IC-3](../icon-controls.md)继续拥有hover/focus/touch行为；[文案体例§2](../copy-convention.md)负责独立承重、同词根和去重；[Heatmap scale](../home-composition-2026-09-10/data-visualization.md)负责精确日期/指标/值/时区/覆盖状态。使用[现有实现](../../../app/web/ui-controls.mjs)的data-tooltip与installTooltips：400ms首次延迟、300ms分组窗口，键盘可见focus开启，Escape/blur/pointerdown关闭，触屏不弹tooltip且另有可见入口。辅助提示不成为accessible name的唯一来源；长解释进入details，交互内容进入既有popover/menu。

下一批按原IA队列逐簇处理Runtime重复准入说明；每簇必须留一份靠近对象/操作的事实。Home小格10–12px点击区域、Usage直接钻取前的触屏精确值检查仍是开放的交互问题；不把换tooltip或删颜色说明称为触屏矩阵完成。

Luna是非作者源码探索，未作浏览器或辅助技术接受。Astra对本次小片运行相邻Home/Usage检查并查看真实页面；验证与组合日志见[Developer合流证据](../developer-control-panel-2026-09-13/README.md)。
