# WORK-AGENT-LANDSCAPE-1（2026-07-19）

调研原稿，**不具约束力**；只读研究，不进权威链。结论只有被 ADR / 就绪图工单 / SPEC 逐条吸收后才生效。

## 范围

市场流通 work agent 架构形态全景：WorkBuddy、TRAE Work（查询写作「Trea」= 官方 TRAE）、QoderWork、Kimi Work；frontier 厂另节非重点。不重做 `WORKBUDDY-INTERACTION-BENCH`（交互六段）与 `session-recall-survey`（召回八条）。

## 文件

| 文件 | 内容 |
|---|---|
| `landscape.md` | 主报告：元数据 + 逐家八问表 + 八问横表 + 三桶结论 + 来源附录 |

## 消费去向（本单可指向，不立 ADR）

| 消费点 | 本单相关问 |
|---|---|
| bash 受控 ADR | ① |
| effect 授权红线 | ② |
| 容器化 ADR（chat-as-dossier） | ③ |
| GENERIC-PACK-1 预检闸 | ④ |
| ADR-013 演进 | ⑤ |
| 垂类包 ABI 路线 | ⑥ |
| TOOL-READ-1 | ⑦ |
| 静默降级零容忍（不变量④） | ⑧ |

## 索引字段（见 `archive/README.md` 登记行）

- **时效三态**：有效 / 监控 / 过时
- **消费状态**：未消费 / 部分消费 / 已吸收
