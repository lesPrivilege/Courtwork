# 后端独立派工 · Astra low + Luna explore

2026-09-09。用户授权后端派工：前端继续消费现有施工单；涉及模型判断能力瓶颈的设计与实现由 Astra light 亲自撰写，explore 使用 Luna 集群。本轮将 light 映射为可配置的 `gpt-6-astra / low`，不将其当作另一个模型 ID。配置依据为工具实际支持值与 [官方模型页](https://developers.openai.com/api/docs/models/gpt-6-astra)。

开工读取 Courtwork `main@a431650b8c4726adc10905485aaadfdb1983689c`，主线工作树清洁。文档协调分支 `codex/backend-dispatch-20260909`；实现使用另外的临时隔离工作树。唯一持久产品入口仍为 Courtwork。产品状态由 [current](../../current.md) 维护，执行与证据在本包记录；不新建用户侧任务、不向前端或外部维护者发送消息。

## 派工依据

后端施工从用户需要完成的动作及其正确性条件出发，不以 UI 是否已经出现按钮决定范围。界面提出的请求是消费者证据，不是领域状态所有权的来源。

| 用户需要 | 后端必须保证 | 既有消费者 |
| --- | --- | --- |
| 保存连接前知道它是否可用、有哪些模型 | 候选连接的探测与持久配置分离；不悄悄创建 Run 或修改当前绑定 | BE-17/18、FE-02 Models & Connections |
| 检查并保留某次文件尝试的成果 | 候选身份、适用依据、验证与接受对象一致；恢复读取原内容 | ES-BE-01、后续 ES-FE-01 |
| 继续既有 Work，知道已经作出的决定 | 标题/时间来自权威记录，缺失事实明确缺失 | BE-14/15、现有 Work continuation |

前两项为本轮优先拆分的工作；第三项作为后续有界服务单，不因是易做的显示字段就抢占更重要的契约。Memory、Temporary chat、自动合并和通用 workspace backend 不随本轮自动开工。

## 分工与写权

- 三个 Luna max 探索分片已经启动：`explore_backend_queue`、`explore_execution_state`、`explore_frontend_consumers`。只读核对本地代码、实际分支、契约与测试；不修改产品代码、不决定架构或迁移、不以探针自称产品验收。
- Astra 负责从探索事实推导切片、冻结行为与失败边界。关键实现 worker 显式选用 `gpt-6-astra / low`，亲自写所分配代码与测试；不将关键状态机转派 Luna。
- 根 Astra 维护 current/派单/合流，作者和验收分离。后续 Luna 可对固定 diff 做只读证据复核，最终集成判定由非作者 Astra 承担。
- service/index/core 写者串行；前端 `app/web/**`、renderer、前端工单、根 README/Pages、brand/Paper 不在本轮后端写权。待后端固定契约交付，再由既有前端单写者队列消费。

## 实施纪律

每张实际工单须写明开工 SHA、允许路径、明确非目标、输入输出、错误/取消语义、测试与回退。独立合成数据与端口 0；不读取个人凭据、不运行付费 provider、不在真实数据上迁移、不 push/部署。不 checkout/stash/reset 共享前端树，保存其他作者的改动。

可以并行研究相互独立的问题；涉及同一个 service/core 的实现必须按固定交付串行。后端契约先到位不意味着前端按钮已经可用；实现和验证有结果后再更新状态，不把派工、作者自测或合流等同 G1–G5 产品完成。

## 本轮实际单元

| 单元 | 执行 | 完成条件 |
| --- | --- | --- |
| [BE-PREVIEW / BE-17/18](WO-BE-PREVIEW.md) | Astra low 亲自实现，已派发 | 受认证的有界探测接口、配置状态不变、合成 HTTP 反例与固定契约 |
| [ES-00](../2026-09-09-execution-state/backend-contract-draft.md) | Astra low 已交付施工合同 `42a4c2f` | 受信 recorded artifact → Core 文件候选/正式 Artifact；明确身份、迁移和验收，不以 inline 提议冒充执行证据；代码待 ES-01 |
| Luna evidence | 三个只读分片已返回首轮事实，ArtifactHistory 接缝定向补查 | 来源路径、范围与未检项；不写关键实现 |

具体结果在 [证据包](../../../evidence/backend-dispatch-20260909/README.md) 分列。ES-01 的文件候选代码要消费 ES-00 的具体施工合同；本轮没有同时放开另一位 service/core writer。
