# ADR-013: Chat 会话生命周期与自动记忆

状态：Accepted（2026-07-15）

## 上下文

Chat 与 Work 是双轨设计（见 `docs/architecture/system.md`）：自由对话走轻组装，声明式场景走 Work。Chat 需要具备通行 chatbot 能力（多轮对话、历史续行、长会话可用），但产品立场是**不把 memory、session、context 管理转嫁给用户**——闲聊、压缩、续行由系统提前设计，不给用户操作空间。

原核心不变量 3 把「记忆写入」列为留人确认动作，与自动记忆直接冲突。本 ADR 经产品负责人拍板，连带修订该不变量（见后果一节）。

## 决定

### 1. Chat session 以连续性窗口自动划界

- 距最近一次用户请求 **≤ 1 小时**的新请求延续当前 session，完整上下文保留；超窗后新请求开启新 session。窗口由系统在协议层判定，无用户开关。
- 历史 session 全文缓存为只读 transcript（本地持久）；对话可分叉，历史不可涂改（不变量 6 不变）。
- UI 只呈现会话列表作为导航；**不提供显式 session 管理入口**（重命名、归档、置顶等运营性操作不做）。
- 跨窗续行不回灌历史全文：新 session 只携带 memory 注入，必要时经 hook 检索历史片段。

### 2. Memory 是可撤销、可审计的系统缓存层

- **定性**：memory 不是不可逆动作，是派生缓存——可整体清除、可逐条追溯来源。自动写入因此合法。
- **写入**：协议层在 API 请求完成时蒸馏重要信息（系统规则或轻模型判定）；每条记录携带来源 session/turn 坐标。蒸馏是生成不是裁决：memory 内容不得被当作事实等级裁定的依据。
- **读取**：组装时作为 `generic-chat` 的低频前缀段注入（复用稳定前缀设计，服务 provider 缓存）；hook 接口供系统在必要时按需检索历史 transcript 片段，仅系统触发。
- **用户面**：设置页仅「查看 + 一键清除」，不提供编辑、分条管理或导入导出。
- **压缩**：窗口内超长 session 自动压缩——旧 turn 摘要化并保留锚点，压缩产物是派生层，原 transcript 不变；对用户透明。

### 3. 隔离约束（继承不变量 7/8）

- 案件与 Work 内容**不写入全局 chat memory**；卷宗语义只存在于案件账本。
- 密钥、凭证与敏感配置永不进入 memory 或蒸馏输入。
- 跨案/机构级记忆属 Stage 2 治理容器议题，本 ADR 不涉及、不预留接口。

### 4. Work 不复用 chat memory 语义，复用机制层

- Work 的续行真源是**声明式投影锚点**（权威态、artifact 摘要、账本尾部、未决门禁），一套卷宗就是整个 session，schema 是工作语义真源；无 1 小时窗口概念，不需要也不得使用 chat memory 蒸馏。
- Work 同样不给用户显式 session/memory/context 管理入口；续行从语义锚点自动重建。
- **复用面清单**（机制与 UI 层）：provider 无关 Turn Engine 与 transport（既有 ADR-009）；推理动画与思考轨迹组件（与品牌 icon 同源动效）；md/代码块渲染组件；附件前置管线（reading-view）。语义分离，管道与呈现共用。

### 5. Chat 功能面收口

- md 附件与粘贴块进请求已成立（`CHAT-MATERIAL-1`）；其他格式一律经 reading-view 前置管线，不足格式显式阻断。
- 代码块与 md 渲染沿用现有 Chat 渲染组件；受控提问（ask-user）已成立，扩展沿 registry 冻结模板，不开放自由提问模板。

## 后果

1. 根 `CLAUDE.md` 不变量 3 修订为：留人确认收窄到定稿、移动、授权、跨案晋升与不可逆动作；chat memory 定性为可撤销可审计缓存层。
2. 新工单 `CHAT-SESSION-1`（窗口划界、transcript 缓存、跨窗续行）与 `CHAT-MEMORY-1`（蒸馏、注入、hook、一键清除）进入实现就绪图；`CHAT-MEMORY-1` 依赖 `CHAT-SESSION-1`。
3. desktop 现有 Chat 持久层（Turn journal）继续作为 transcript 真源；session 划界与 memory 为其上派生层，不改写 Turn 语义。

## 明确拒绝

- 不给用户 memory / session / context 的管理界面（查看与一键清除除外）；
- 不把 Work 卷宗内容写入全局 memory，不用 memory 替代 Work 声明式投影；
- 不做云同步或跨设备 memory（本地优先不变）；
- 不在蒸馏中使用会把案件内容送入第三方的训练或分析通道（不变量 8 不变）。

## 来源

- 双轨设计登记：`80e5a43`；harness 消费范围审计：`94f167f`。
- 本 ADR 与不变量修订、Round 3 就绪图同批提交。
