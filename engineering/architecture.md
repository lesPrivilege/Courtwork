# 工程范围与模块边界

状态：设计基线。技术候选见 [options](options.md)，验收事实见 [current](current.md)。

## 最小交付

一个人围绕一个 Matter，读取材料、让 Agent 提出成果、检查证据与差异、接受或退回候选，在重启或替换 Session 后继续工作。

首个闭环只需一种 Artifact、一个 Reviewer、一个正式接受转换、一个有效版本指针、开放义务和下一次 Context。多用户、市场、自动训练、多 Agent 调度、跨设备同步和不可逆外发后置。单人仍区分 propose 与 approve；研究者使用顺畅不能证明专业能力可分发。

```text
Human Work Surface ── Work API ── Semantic Core ── Matter Repository
                           │            │
                           │       Context / Run Plan
                           │            │
                           └──── Host Adapter ── Generic Agent Runtime
                                                    │
                                              Model / Tools
```

这是逻辑责任图，不要求微服务。正式状态由 Repository 在 Core 的提交边界下维护；Runtime 可拥有执行日志，GUI 可拥有临时交互状态。二者均不能成为第二份已接受成果真源。

## 局部工程单元

| ID | 单元与所有权 | 输入 → 输出 | 依赖与失败责任 | 实现姿态 |
|---|---|---|---|---|
| M01 | Provider 与模型运行 | 请求、模型配置 → 流、usage、错误 | 由宿主处理协议；Adapter 保留未知 usage、超时和模型身份 | 复用 |
| M02 | Loop 与 Run 控制 | 冻结 Run Plan → 运行事件、terminal outcome | Runtime 执行；Adapter 区分排队、steer、cancel、失败和不确定结果 | 复用，不重写循环 |
| M03 | Tools 与执行环境 | scoped capability → tool result | 参数、预算、路径、网络、子进程由执行边界约束 | 受限工具优先；沙箱另验 |
| M04 | Session、事件与适配 | 宿主 Session/events → 标准 Run observation | 隔离宿主 API、事件顺序、重连、恢复、版本差异 | 薄适配 |
| M05 | Semantic Core | Candidate + Decision + 当前版本 → 合法转换或拒绝 | 拥有工作语义、Authority、Completion 与转换规则 | 精密设计 |
| M06 | Matter Repository | 提交事务 → State、Events、active refs | 单一写入所有权、原子性、幂等、迁移、备份与恢复 | 成熟存储 + 自有契约 |
| M07 | Artifact 与 Evidence | 原始来源、候选内容 → 不可变版本、锚点、支持关系 | 不同版本不可串用；解析与格式保真需分别验收 | 成熟解析器 + 自有来源语义 |
| M08 | Registry 与 Activation | manifest、Matter、role、stage → 冻结 profile | 检查版本、适用范围、依赖与权限；未知能力拒绝激活 | 静态 preset 起步 |
| M09 | Context Compiler | 有效状态、义务、相关来源 → Context Projection | 记录选择/遗漏/版本；索引与摘要不可恢复已失效效力 | 确定性组装优先 |
| M10 | Work API 与 Review | 人的意图 → typed Decision / Query | 验证 actor 与 scope；工具审批和成果接受分开 | 自有小接口 |
| M11 | GUI 与投影 | State + Candidate + Evidence → 可判断的表面 | 断线、过时版本、待处理项和失败可见；本地缓存可丢弃 | 复用组件与交互范式 |
| M12 | Trace 与离线 Eval | 运行、版本、检查 → 可追溯证据与比较 | 不从模型自述推出成果接受；区分 mock、真实链与用户效果 | 先文件记录，后评测设施 |
| M13 | 宿主与分发 | 配置、凭证、运行进程 → 可启动和可升级的应用 | 凭证不进入浏览器/日志；打包、签名、平台权限独立验证 | 本地 Web 优先比较 |
| M14 | 依赖与兼容维护 | 上游变更 → 影响分析、适配/回滚 | 锁版本、许可证范围、迁移证据、上游反馈 | 手动维护先行 |

## 必须保持的依赖边界

Core 不导入宿主包、GUI 组件或 provider 名称。Adapter 可以依赖宿主接口，不能定义成果接受标准。Renderer 解释 Work Contract 的呈现声明，不执行任意模型生成脚本。Extension 可以提出状态转换与裁决维度，但不能替自己授予正式写权限。

模型获得材料读取与 Candidate 提交能力；人的接受操作走 Work API。若开放任意 shell，单纯把数据库放在另一目录不足以构成边界，必须证明该执行身份无法访问正式写入能力和凭证。初始 demo 可以关闭 arbitrary shell，并只运行受信实现的受限工具。

## 两个独立替换轴

替换 Runtime 只改 M04 及必要运行配置；替换存储只改 M06，并证明版本、事件和恢复语义保持。更换 GUI 不改变 Decision 后果；更换模型不改变 Completion。用第二实现验证实际被替换的部分，不据一个 Adapter 测试声称全系统可移植。

## 开工粒度

施工单元示例是“比较 SDK 与进程协议的取消/恢复边界”或“验证单写者存储的重复提交行为”。它应能独立形成 RD、裁决和退出路径。源码文件、类、数据库字段全表与 UI 像素规格留到相关单元获准实现之后。
