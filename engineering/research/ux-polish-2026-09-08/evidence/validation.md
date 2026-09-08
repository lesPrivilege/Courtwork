# 本轮研究收束回执

2026-09-08 · Luna完成三份有界只读报告：整合候选源码、材质官方机制、历史index与局部motion/hover。Astra合成按片段检索的index与12项build联调绘制计划，并对三项容易误读的结论作校正：普通120/180ms控件不受旧品牌140ms直接约束；普通run状态cue与品牌在场动效分开；旧surface-hierarchy的6/8等值不覆盖最新角色与控件体例。

官方motion补证直接读取Radix Popover、Tooltip与Base UI Popover正文，记录origin/placement、start/end/instant、delay/skip-delay等机制；这些不是依赖安装或本地像素验证。Apple HIG Materials正文未取得、BoardUI源码/MCP未核到，保留缺口。

对整合候选`272680519b9faa4f896b68b46888c247662d6991`做了独立限定静态复核：忽略CSS注释和字符串后，唯一未闭合花括号来自`app/web/styles.css:2840`的`@media (min-width: 1024px)`。这与Luna源码发现一致；未运行CSSOM/浏览器，不宣称具体像素已复现，不在活动UI树修复。

机械检查：研究包及design/current/release入口共10个Markdown、56个本地链接/anchor检查无缺失；`git diff --check`通过。本回执创建后入口补链另行确认存在。

本轮未修改产品代码、重排工单、安装依赖、启动浏览器/测试、推送或发布。新研究只为后续合流build绘制提供来源、实际参数读取位置、缺口、消融和反例；实际视觉、交互、性能、设备与runtime/Core验收仍需在目标候选上完成。
