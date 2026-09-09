# Harness 下一轮：有界并行与 Core 串行

2026-09-09。用户要求判断下一轮自研/消费并允许异步执行，后确认 **先ES-01，再Attention；Attention届时另开fresh Astra任务**。实际base `a7a08f035cc5a716b8c7a93024cdfe4e44e4c07d`，隔离分支 `codex/harness-next-round`。旧后端交付52f75dd与Browser研究分支保持固定。main/current/BE台账由来源Astra持有；前端writer不变。

## 优先级与实现/消费边界

| 顺序 | 自研责任 | 消费既有实现/输入 | 本轮安排 |
| --- | --- | --- | --- |
| 先行小单 BE-30 | 许可载荷预期身份在实际resolve事务内比较，错误409可辨识 | 已持久toolCallId/contentSha256、RuntimeStore队列、现有question/权限闭环 | Astra实施，Luna独验；不改Core/schema/UI |
| 并行 AM边界守卫 | 为本仓实际owner固化少量import边界和正/负反例 | MyContext分层负例方法；不照搬包架构或装新lint框架 | Luna先探索，根Astra冻结规则后授测试写权；不重复AM-C golden |
| 主线 ES-01 | 完整字节/依据/验证/候选决定/恢复与迁移 | ArtifactHistory、Core SQLite事务、Pi、原ES-00合同；不采用新状态库或LayerFS | 小单稳定后由Astra集中实现Core/bridge/service整合，Luna有界模块/独验；unknown-only不结单 |
| 后续 ATT-BE-01 | Attention对象、revision/CAS、scope披露和与执行的关系 | 既有Core；MyContext/TeamAI/Linear等仅局部机制参考 | ES稳定交付后另开fresh Astra任务；不让RuntimeStore或个人实践目录变authority |
| 后续 AM-B | adapted任务身份、结算、选择get/wait与恢复 | Pi同步tool loop/MCP；现有AM-A/C验证扩大 | 先两项只读慢任务；与service/schema写权串行，不称native async |
| 后续 BE-31/32/33 | 受限Question验证、事件实际时间、可信未完成原因 | 现有schema/权限/事件owner，沿精确合同 | BE-31不能只加表单schema漏敏感信息约束；BE-32须迁移设计；BE-33不把unknown重命名成确定原因 |
| 观察 BR | 可选Browser Agent适配器的边界/隔离/恢复 | 固定上游Browser Use Pi，evaluate状态、原研究反例 | 暂不安装或真实浏览，先已排定主线；不是Core替换 |

BE metrics/AM-C已合流不重做；BE-17/18只作未保存探测，不扩大为连接注册。依赖、事件、结果身份和决定是本仓需掌握的合同；browser控制、Pi模型协议循环等按稳定接缝消费，不为“自研”重写。

## 写权

Astra首个小单只改 `app/server/{service,store}.mjs`、新 `app/tests/permission-cas.test.mjs`、新 `app/docs/permission-cas.md` 与本派单/证据。预期字段可选、只适用于permission，不扩展ask_user，不改变旧客户端body；比较在排队mutation内而非仅服务预读。

AM规则探索阶段只读，后续写权另记。ES写权沿 [ES-00](../2026-09-09-execution-state/backend-contract-draft.md)精确授予并集中串行；工具/输入监测越界需求由根Astra在本单登记。其他作者存在，所有worker不可覆盖他人修改。合成dataDir/port0、无paid provider/个人凭据/生产迁移/部署/Paper改动。

## 接收与回退

小单、Core主单分别固定代码SHA、作者与非作者反例、全量/smoke、未检项。简单读取/依赖测试不升级为产品接受。Core2/app3采用ES原合同备份/旧host拒绝/独立恢复，runtime4仍不与旧host共享升级目录；是否发生迁移以实现回执为准。完成后来源Astra核对最新main再合流，G1–G5不自动关闭。
