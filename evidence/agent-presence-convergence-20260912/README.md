# Presence最终收敛 · 2026-09-12

基线ca91a78，分支codex/agent-presence-convergence-20260912。Astra完成原创几何收敛与真实CUA检查；Luna只读检查13点拓扑、默认JP、manifest/导出及旧资产不变，重跑17项node通过。Luna指出README参数枚举/旧URL遗漏JP与尚未更新hash，均在提交前补齐。

1. [嘴型比较](01-final-mouths.png)：1280×900，最终静默折角无上方横臂，斜垂嘴下瓣较重，16/20/24/32/64均可辨；旧AB双点与A/B/C留作历史对照。
2. [消息下静默形态](02-quiet-message.png)：1440×900 light，无细分活动的running使用静默角嘴/Working，不虚构thinking。
3. [消息下嘟嘴](03-pout-mobile.png)：390×844 dark，明确thinking fixture呈现新嘟嘴；文字与输入控件保持位置。
4. [默认比较页](04-default-board.png)：最终JP置于首板，默认控制与Chat均JP，历史候选后置。短序列页面自检19/19。

只改几何/候选默认/导出与交接文档，没有改状态projection、motion时序、App/brand/site。旧8SVG字节与ca91a78保持。设计收敛不等于生产接线；thinking事实/blocked/cancel/connection边界沿上一轮回执。原作者测试及Astra上一轮检查保持原有归因，本轮不重复声称200%/forced-colors/真实读屏/60–120Hz/长时疲劳通过。

当前提交待用户在另一session合并，入口为[CONVERGENCE](../../engineering/design/agent-presence-2026-09-11/return-v1/CONVERGENCE.md)。本轮未合main、未push或部署；8917为独立预览端口，8895占用时已直接换端口，未停止其他server。

最终静态检查：node定向17/17、局部color lint（4文件）、文档链接988份/4876条、diff whitespace均通过。两份SHA256SUMS完整覆盖各自目录内除清单自身的文件；新增10SVG，旧8SVG逐一与基线比对不变。
