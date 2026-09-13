# Core Review摘要 · Release施工交付

2026-09-13。Astra架构/后端与集成，Sol有界UI实现，Luna非作者源码复核和定向执行。产品片 `a85ef8e`，整合当时main `6e211bd`及MCP补证后候选 `09f9177`。不新建Core状态库，不迁移数据schema。

## 结果与owner

新增[只读API](../../app/docs/work-review-summary.md)从既有Core surface投影提取待审、过期及可Review数量、工作版本、只读和已接受成果身份；域adapter对动作的限制与Host活动Run/生命周期限制保持。正文和正式action schema不放进摘要。UI在Sources折叠外呈现：有消息时位于消息尾部；同Matter的空会话也可发现。Open work review进入原审阅面，仍由原actor/CAS/幂等合同作决定。

[UI变更记录](ui-change.md)给出最近先例、grammar与信息层。首次浏览器发现新模块漏进静态allowlist，已补注册及HTTP serving断言。后续修正重复计数、按钮布局、Matter校验及稳定opener，决定后刷新仍能返回原入口。未新增CSS、token、动画、材质、依赖或安装器。

## 固定候选检查

- [作者后端3/3](astra-author.tap)；[Luna初次8/8](luna-independent.tap)；最终[非作者14/14](luna-final.tap)，覆盖新API/UI、NDA与原工作动作。
- `PATH=<Node22.19>/bin:$PATH npm --prefix app run check:product` 在 `09f9177` [932/932、smoke、6112条链接通过](combined-product.log)。运行环境沿[测试合同](../release-test-contract-20260913/README.md)，依赖锁未变；本片未重复三轮或负载lane，首片三轮仅保留原候选范围。
- interaction/color/material三个lint exit0；[对比度表](contrast.md)生成exit0。没有新增样式或材质，因此未新增fallback行为；这些机械检查不构成完整a11y接受。
- [P05/P06](../release-input-binding-20260913/README.md)及[DF-06 MCP故障组合](../release-mcp-failures-20260913/README.md)纳入该全量候选。源文件/日志/截图hash见[清单](files.sha256)。

## 浏览器与GUI证据

Astra使用真实内置浏览器与独立仓外合成dataDir，实际HTTP/Pi/Core，未调用真实Provider。可用 `node evidence/release-core-summary-20260913/browser-fixture.mjs` 重建初始三个会话；初始fixture后发生的合成人类决定、修订、卸载和本机服务停止为本轮交互过程，非每次启动自动重演。

| 实际检查 | 证据与上限 |
|---|---|
| 空消息会话有同Matter待审候选 | [改前1440](before-empty-1440.png) → [改后1440](empty-pending-light-1440.png)；不再依赖Sources展开 |
| 有长fixture消息、Sources折叠 | [1440](pending-sources-collapsed-light-1440.png)、[1280](pending-light-1280.png)、[390尾部](pending-tail-light-390.png)。切窄屏保留既有阅读位置；滚到消息尾部可见摘要，不强迫跳走历史阅读位置 |
| 从摘要进入原Review | [原面](review-open-1440.png)。390下填写合成reason并Accept，返回后[零pending且有artifact](accepted-light-390.png)；另一空会话读到[相同正式决定](same-matter-accepted-light-1440.png) |
| 键盘/焦点 | 桌面Back返回Open入口；决定触发摘要刷新后，390下Escape先退preview再退rail，焦点返回同一Open按钮。并非全面键盘/原生辅助技术矩阵 |
| 深色与窄屏 | [1440](accepted-dark-1440.png)、[390](accepted-dark-390.png)；[DOM测量](layout-dark-390.json)documentWidth=390，两按钮44px且不横溢出 |
| 来源修订、只读、断线与恢复 | [过期](stale-dark-390.png)、[卸载只读](read-only-dark-390.png)、[真本机断线](disconnected-dark-390.png)、[恢复重读](reconnected-dark-390.png)。断线清除旧计数而不显示零；[同快照API](stale-api.json)保留计数来源 |
| 现有固定组合GUI最小路径 | 选Local test并Use for next runs，配置version3；Developer里显式选General，server revision1，可信NDA目录Refresh后Load。[选择](profile-selected-dark-1440.png)、[GUI后Run事件与配置](gui-run.json)、[两次实际loopback wire](gui-wire.json)：GUI发起se_read_artifact成功，跨Session既有artifact身份进入context和tool result，default effort顶层字段省略。fake credential由fixture预置，**不声称全新真实凭据GUI开户/发现或真实模型效果** |

无200%真实浏览器zoom、forced-colors或原生宿主/屏幕阅读器检查；未把390替代200%。本轮图均为有版本的候选证据，不擅自替换已接受golden。

## 接续与范围

本片完成Core摘要必要接线与本地合成闭环，不签全部G1–G5。仍需最终候选的真实Provider小探针、原门的2–4分钟可公开演示/source SHA、公开支持声明映射及其余原生检查；P11当前只接受既有受信组合入口的合成路径，通用插件导入、OAuth/stdio等不纳入首版。仅本地集成，无push、tag或部署。

用户目测接续修复Execution过宽排布和重复Assistant/Attention头；见[修订记录](ui-change.md#用户目测接续)。非作者[18/18](luna-execution-ui.tap)、1440/390真实浏览器及鼠标/Space折叠通过。此前932/932固定于09f9177；这次仅表现层四文件变化后做有界回归，未把旧全量重称为新全量。
