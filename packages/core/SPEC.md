# SPEC: packages/core（W6）

状态：未开工（依赖 W1/W2/W4/W5）

## 职责

Headless agent core。协议化对外（会话/事件流），UI 是纯客户端；provider 无关；场景执行器是核心。

## 要点

- 基于 pi-mono 借壳：只借 agent loop 与 provider 抽象；不把场景/schema 逻辑写进 fork。
- 场景执行器：从 registry 取场景定义 → 编排（摄取产物读取 / 工具调用 / 生成）→ 产出符合 schemas 的 artifact → **停在确认节点**，等待客户端确认事件后继续。
- 事件流协议：会话事件（进度、artifact 产出、确认请求、错误）以可序列化事件对外发布——W9 桌面端与测试脚本共用同一协议。
- Provider 封装：模型 id/参数来自配置，禁止写死；接 eval/ 的选型结论。
- RevisionEvent 捕获：客户端对 artifact 的每次修正经 core 落盘。

## 验收

无 UI 跑通 S3 全流程：输入合同 → RiskList artifact → 用户确认（脚本模拟）→ 修订指令集 → 调 output 产出 docx。全程事件流可回放。

## TODO（跨层放入区）

- [规划预留] 事件流协议设计时假设存在**远程瘦客户端与异步确认**：确认请求事件需可序列化推送到进程外通道（未来的 IM/工作流通道网关——企微/飞书/钉钉/律所内部 OA 皆为适配器，见 docs/04 Stage 1），确认响应可延迟数小时后回流续行，且需携带通道无关的身份标识（谁确认的，对应 RevisionEvent.actor）。W6 实现时不做任何网关，但协议不许隐含"确认方与 core 同进程/同机/同一种客户端"的假设。
- [规划预留 2026-07-09] **session 续行与会话链**：产品将支持"上下文近满 → 用户点按钮开新 session 并自动续行"（docs/30 状态条交互）。续行的实现基础是**从案件 artifact 结构化状态再水化**（artifact 按引用挂回、待确认门禁跨 session 接续、仅近期工作摘要需生成），不是聊天历史压缩。对 W6 的协议要求：会话需有 lineage（链 ID，前驱 session 引用）；确认记录与 RevisionEvent 跨链可溯（法律执业留痕需求）；事件流不许隐含"单 session 生命周期"假设。W6 不实现续行本身，只保证协议不堵死。后台对旧对话轮次的静默 compaction 属实现自由。
