# 通用办公连接器的层位（2026-07-17）

产品负责人定调。调研原稿，不具约束力；实施属 Stage 1（长入既有工作流）领地，届时按 roadmap 门槛立单。

## 定调

通行 work agent 的 plugins 本质是**通用办公软件的接口**（邮件/日历/文档/表格/IM 等）——commodity 能力，对齐上游 cheap（与 UI-SURFACE 同一逻辑：跟随成本低、不构成竞争轴）。层位归属：

- **通用底座的插件面**：通用连接器（plugins/MCP 形态）不是垂类包，不携带垂类语义（ADR-001 纪律照旧：core/连接器层读不懂 legal.*）；
- **垂类相关与私域依然全在 schema**（轻量包/重度包，ADR-014 三层不变）——连接器只做取数与投递，业务判断的形状仍由 schema 承载；
- **UI 席位便宜**：左栏加一栏（connectors column/section）即可，rail 结构现成。

## 边界与时机

- roadmap Stage 1 已定门槛：工作流入口「执行与著录仍回到同一权威底座」、通道不得另造修订器/状态机/授权语义——连接器照此约束；
- current.md 既有登记「MCP/私域 adapter 属以后阶段」不变；本笔记只定层位，不提前开工；
- 与 upstream-positioning 呼应：连接器广度是上游生态的事，我们只需留席位与准入门（连接器经 registry 式准入，fail-closed）。
