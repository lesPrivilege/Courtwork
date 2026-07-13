# ADR-008：Schema 包一致性与字段职权

- 状态：Accepted
- 日期：2026-07-13
- 来源：`71223466ce6e7ecd1351c8752ebdaa3affe1aae4`、`328c63907b8e182990fde91888c0085c6a2e4649`、`f3864c15e2a1a919163a525ee3e8b139d0fe7f45`、`83d6867dff8131dbc100beb36e453128938d15ad`、`6ff221c5af7e40ff190d1b16802a98c515e30653`、`6e1cb7b0282a4ace7a5cdbd116c17e52cd706025`、`0b93628e203ac72301f720bb188b771a06e0681a`、`5ab3fcde93c7157aa5f79744e0bee1852bbee853`、`729904240c2890f4089efa8db7e227bd9c14d5bb`、`75c0583768bf37318150b3d03f6c3100bc7684d2`

## 背景

归档调研已经被现行文档吸收为“三位一体、双后端编译、按址收货、事件续行、零编码暴露”等原则，但四处实现仍可能绕开这些原则：垂类自建平行 descriptor、desktop 中央列举领域 type id、模型响应直接携带系统坐标、通用 fallback 裸露 wire key。若不把这些边界写成包一致性契约，后续新增 schema 会从旧实现复制漂移。

## 决定一：全仓只有一套包 ABI

- `VerticalPackageManifest`、artifact descriptor、scenario、renderer、projection、vocabulary 与 confirmation policy 组成唯一包 ABI；垂类不得自建语义相近但字段不同的平行 descriptor。
- 一个 artifact 只有在模型写入面与人类复核面同时闭合时才可准入：schema、target address、projection、renderer/fallback、词表、来源政策与确认政策必须交叉可解析，不能只各自通过局部校验。
- core 与 desktop 以 registry 查询路由；生产代码不得中央列举 `legal.*`、`pm.*` 等领域 type id。删除任一垂类包后，其他包仍须能装载和运行。

## 决定二：字段写入职权是契约的一部分

每个字段或条目必须能判定其权威生产者，语义分三类：

- `model-generated`：模型可提出，仍受 schema、来源与确认门约束；
- `system-verified`：由确定性工具、resolver 或计算器铸造，不能出现在模型可写 response schema；
- `human-decision`：初始为未决，只能由用户事件改变，模型不得写 confirmed/rejected。

具体机器字段由后续 schema 工单统一落版，垂类不得先各造一套命名。主观裁量允许区间、未知与条件表达，不得用伪精确数值冒充系统事实。

## 决定三：模型不能生产 SourceAnchor 坐标

- 模型只可生成 quote/claim 与目标地址；bbox、page、textRange、textLayerVersion 属 `system-verified`。
- 任何“模型产出且最终 artifact 含 SourceAnchor”的 descriptor，都必须提供不含系统坐标的 draft schema 与 citation binding，或显式声明该字段只有系统 producer。否则 registry 拒载。
- resolver 唯一匹配、材料版本绑定与 `quote === source slice` 继续以 ADR-003 为准；artifact 级 evidence grade 不能自动代表每个字段或条目。

## 决定四：Renderer 与 fallback 不能泄露 wire

- renderer 只消费 descriptor 声明的输入 shape、状态、动作与证据展开能力；模型不能提交 CSS、自由坐标或未登记动作。
- desktop 必须通过 RendererRegistry/descriptor 路由，不按 type id 手写 switch。
- 缺专用 renderer 时，只有 descriptor 提供完整人读 projection/labels 的 artifact 才可进入通用只读结构视图；否则显示“暂无兼容工作面”。普通界面不得回落 type id、原始字段名、枚举值、绝对路径或 hash。
- 缺词、未知枚举或不兼容 renderer 必须拒载或显式降级，warning 必须可到达 UI，不能只写日志。

## 决定五：版本与一致性门

- host 明确支持的 package ABI/schemaVersion 范围；过旧、过新和缺迁移声明均显式拒载并隔离，不用新 manifest 重解释历史事件快照。
- 建立跨垂类 conformance kit，至少覆盖 namespace/引用闭合、citation forgery、zero-wire vocabulary、partial/coverage、gate bypass、event replay 与第二 namespace 同宿主装载。
- 静态设计稿、截图和单包 parse 成功不能替代端到端协议消费证据。

## 后果

PM 等第二垂类必须迁入唯一 ABI，而不是继续扩展平行 descriptor。desktop 的领域硬编码、裸 wire fallback 与非 RiskList 的锚点生产路径成为显式架构债；后续以 `SCHEMA-CONFORMANCE-1` 分批修复，不在本 ADR 中偷改现有 schema 字段。
