# Schema Exemplar · 新表自然生长凡例

状态：现行设计权威。档位：schema 工作面（最克制档）。批准提案行：`P0-A20`。

## 地位与禁区

本文是指针式全链凡例，不是 schema、presentation、renderer、字段手册或 React 结构。payload 字段、枚举、默认值与 token 数值只认各自机器真源；本文不复制它们。schema 工作面零新装饰、零模型布局、零自由标签，Pages 的媒体与标题动效例外不适用。

## 权威图

- **模型**：只生成草稿与引语，不裁决 schema、事实等级、坐标、权限或布局。
- **系统**：验证现有 schema，解析并铸造 anchor，剪枝 out-of-coverage，执行闭集、漂移与 fail-closed 门。
- **垂类包**：拥有 payload、descriptor artifact、presentation vocabulary、领域 projection 与确定性领域逻辑。
- **宿主**：只实现通用 primitive、版本化 blueprint、focus/keyboard/reduced-motion 与 confirmation port，不解释领域 wire。
- **人**：确认、驳回、修正与批准产品裁量；presentation 不携 effect。

## Legal S3/RiskList 全链

唯一 exemplar 沿现行符号指针读取：`S3_RISK_LIST_DRAFT` → citation resolver → `S3_RISK_LIST_RESPONSE` / out-of-coverage → Legal presentation vocabulary → registry gate → artifact table/detail → disposition → `compileConfirmedRiskListToRevisionInstructions` → non-applied 知悉流。

各节点的契约、门义与符号位置见 [`schema-exemplar.sources.json`](schema-exemplar.sources.json)；本节不展开字段定义。ADR-003 约束“模型出引语、系统出坐标”，ADR-012 约束 projection → primitive → versioned blueprint 与整面失败，ADR-014 约束 tab＝artifact 及多 artifact 边界。

## 五个阅读问题

新表必须证明自己的领域字段能回答五个等价问题，而不是照抄 Legal 列名：

1. 这项风险、问题或事项是什么？
2. 它的严重度、优先级或效力如何？
3. 依据是否可到达、可核验，缺口是否显式？
4. 人作出了什么处置，或还欠什么确认？
5. 下一步确定性动作是什么？

缺少等价项时显式登记缺口；不得为了凑列伪造字段。

## 元素集与有限组合

元素闭集只认 [`visualization-kit.md`](visualization-kit.md) 的 `Field`、`Anchor`、`Status`、`Evidence`、`Decision`、`Estimate`、`Partial`，组合只认已登记的 section、grid、repeat。处置状态的视觉语义只指向 [`signature-line.md`](signature-line.md)；新表不得复制其白名单。当前新表只准使用版本化通用 blueprint `courtwork.artifact-table.v1`，不得复制 Legal 未版本化面板。

## 新表派生入口

输入必须同时具备：已准入的 `packageId/schemaId`、现有 JSON Schema、descriptor artifact、presentation vocabulary、有效真实 fixture、目标任务、现有版本化 blueprint，以及 [`schema-exemplar.sources.json`](schema-exemplar.sources.json) 封存的来源哈希。

固定九步，实施者无自由裁量：

1. 证明 package、schema 与 fixture 已通过 registry 准入。
2. 从 schema、descriptor、presentation 读取权威，不从截图或当前宿主列猜字段。
3. 把领域目标映射到五个阅读问题；缺项只登记，不伪造列。
4. 把每项展示需求映射到元素闭集；缺 primitive 即停止并另提架构票。
5. 使用现有版本化 blueprint，不复制 Legal 未版本化面板。
6. pointer、enum label、tone、action 全部闭集验证；任一漂移整面 fail closed。
7. anchor 只取系统 resolver；拒收模型坐标。
8. 确认只调用现有 confirmation port；presentation 不携 effect。
9. 以真实 fixture 生成 golden 与窄宽、键盘、focus、reduced-motion、双主题证据，再交独立验收。

允许输出仅限 presentation config、有效 fixture/golden、ViewModel projection 与 craft-evidence。默认不得修改 payload、schema、scenario、wire 或 effect 接口。

## 失败条件

缺 pointer、自由 label、未登记 primitive、模型坐标、无锚落格、半面渲染、宿主解释领域 wire、历史材料输入、schema 档新增装饰、单界面混用两档或缺已批提案行，均整面失败。机器门只验证引用、闭集与漂移，不生成 schema 或 presentation。

## one-shot 验证协议

终局目标固定为 `pm.PrdReview`。隔离生成会话只接收本凡例、允许元素集、闭集词表、PrdReview JSON Schema、档位规则与来源哈希；现行 presentation 隐藏，只封存基线哈希与语义覆盖 oracle。只生成一次 presentation 配置与有效真实 fixture，经 `courtwork.artifact-table.v1` 生表。任一门失败即本轮失败并回指 P0，不得人工补丁后冒称一次通过。

## 来源登记

正式来源只认 [`schema-exemplar.sources.json`](schema-exemplar.sources.json) 的 `P0-S01`–`P0-S09`。当前宿主实现只能作为验收观察，不能进入衍生包或反冻为 blueprint；就绪图只证明委托、依赖与出口，不是设计输入。历史 specimen 永不进入现行来源登记。
