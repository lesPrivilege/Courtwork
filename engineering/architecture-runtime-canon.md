# Runtime与Work语义 · Astra裁决

2026-09-11 / DEC-013。基线 `16e9d37a47366de195e1217a6440dd88b660be90`；[输入与逐项账](research/deepseek-runtime-2026-09-11/README.md)。这是当前文档术语与目标责任裁决，独立架构review尚未提交，未声称解耦实现或产品接受。

CourtWork维护持久工作状态、证据与决定，并把专业工作要求交给可替换的执行系统。当前产品由本地Host、Pi运行集成和同一Work Core组合；以下目标结构不要求微服务或立即新建同名目录。

## 稳定词表与实现映射

| 概念 | 定义 / owner | 当前落点与成熟度 |
|---|---|---|
| Matter | 持续工作的地址和受治理状态范围 | Core owner与既有事务；已实现有界闭环 |
| Schema | 对象、关系、约束与合法状态结构 | Core/domain合同；不等于JSON Schema或某个Expert包 |
| Work Contract | 适用范围、输入/输出、证据、完成与Review要求 | 领域合同及extension校验；通用可分发格式仍目标 |
| Expert | 可版本化专业能力包，组合Schema、Work Contract、能力需求、verifier/eval和review声明 | 现domain/extension是局部实现；非完整Expert registry/热插拔产品 |
| Work Core | 正式状态、来源、决定与转换的唯一领域owner | `app/core/owner.mjs`、`core.py`、bridge SQLite事务 |
| Work Compiler | 从Expert、Matter投影、角色/阶段、policy和可用能力形成有界执行计划的责任 | 对应M08/M09，现context/activation/work-adapter分散实现；未新增完整compiler服务 |
| Run Plan | 冻结本次上下文、要求、权限交集与输出预期的执行输入 | 当前运行绑定/上下文合同有局部事实；本文示意不构成新DTO/schema |
| Harness Core | provider-neutral的最小执行职责：turn/tool dispatch、事件、取消与恢复 | 复用Pi；`app/harness/`今日只持Thread/通信，不能按词名认成整个执行loop |
| Harness Capability | 受权限约束的工具、MCP、文件、子任务等可选执行能力 | 以control-plane与实际adapter支持为准；浏览器/沙箱等不因列名而可用 |
| Runtime | Core、capability profile、model adapter与environment解析后的执行组合/实例 | 现Pi AgentSession +配置；不是额外夹层，也不是Matter状态 |
| Runtime Adapter | Run控制、事件、恢复与宿主协议适配 | `app/runtime/pi-session-runtime.mjs`；service仍直接用Pi SessionManager，解耦未完成 |
| Model / Provider Adapter | 身份/catalog/capability与模型协议、传输、usage解释 | 现model-runtime/provider-control接缝；DeepSeek方言不得进入Expert/Core |
| Environment | 文件、进程、网络及权限边界的执行环境 | 本地工作目录与运行配置；不等于可信沙箱或正式Matter库 |
| Work Surface | 人读取事实、提出意图、检查与裁决的表面 | 现Web UI/Host Work API，呈现不取得领域权威 |

Schema、Work Contract、Expert是组合关系，不冻结 `Schema < Work Contract < Expert` 为继承或严格包含。模型权重不作为默认Expert资产；若将来需模型制品，另审版本、许可、运行绑定与验证。

## 控制与状态边界

目标执行路径：Expert + Matter projection + policy + available capabilities → Work Compiler → Run Plan → Runtime Adapter → Runtime。结果作为Run observations / candidates回到对应owner；正式效力通过Work API → Core的Review/Authority/commit事务产生。compiler不能替人审批，也不是所有查询/控制的唯一中转站。

区分四类数据：

- governed work state由Core维护；接受、撤回、失效与版本受其事务约束。
- runtime protocol state由执行owner按runtime/model/protocol revision隔离，必要时保真持久化；不是通用memory或默认跨runtime上下文。
- trace由现Run事件/日志owner留证；记录不等于工作事实被接受。
- compiled context是选定来源版本的投影；可重建不意味着允许丢弃恢复所需的协议状态。

Model Adapter定义DeepSeek私有字段的序列化/回放规则，Runtime Adapter及现持久化owner落实恢复；不增第二份Session库。凭据仍留既有credential边界，不进入Expert、Run Plan样例、公开trace或Git。权限取交集、每次动作重新校验；capability声明不授予读取、工具或外发权。

两类HITL分别沿原合同：执行权限批准归Host/runtime policy，专业成果接受归Work Core/Review。两种UI分别是通用执行控制与专业review维度，renderer不可执行任意Expert注入脚本。

## 后端roadmap接入

总顺序仍由[roadmap](roadmap.md)控制：基本GUI/通用Harness → 自足节点 → runtime替换证明；本轮只做概念与合同准备。以下使用独立DRT编号，避免BE历史撞号，均未实施。

| 单元 | 有界责任 / 依赖 | 可证伪交付 |
|---|---|---|
| DRT-01 接缝清账 | Astra；消费HPR/RD现状，固定实际Pi版本与service的SessionManager调用；先核现DTO再定Runtime Port/Run Plan | requested/effective/bound、cancel/resume/event顺序与能力拒绝的契约；不以新接口掩盖宿主泄漏 |
| DRT-02 DeepSeek协议probe | DRT-01后；现ModelRuntime + runtime持久化owner，优先复用Pi，不重写loop | synthetic多轮tool/reasoning、进程重启、取消/失败、缺失metadata拒绝；Core无provider字段；迁移/回退用独立数据 |
| DRT-03 同Expert替换 | 固定DRT-02候选和同一专业fixture | Expert字节不变，deterministic runtime与参考runtime各自出候选；Work Core同一提交合同；Codex真实adapter另列未验 |
| DRT-04 Profile实验 | 基础正确性成立后，真实provider按既有用户GUI授权路径执行 | full/constrained × high/max或catalog实际支持值；固定tool/context/profile hash、model修订、重复次数与预算；报告outcome、validity、latency、usage/cache、错误与artifact检查 |

DRT-04不预定Minimal优胜，也不把host接收时间称provider decode TPS；与BE-42口径衔接。完整协议矩阵/采样规模由后续具体合同定义；本轮无付费调用、无新schema/依赖/adapter。

## SE术语协调

当前CW叙述用human/domain expert指专业人士，用Expert指专业能力包；用expert-guided work trajectory描述人工引导的原型轨迹，用latent work semantics说明尚未显式化的专业规则。人工判断分别进入work contract、context compilation、organization policy、review/authority，不全部归为runtime。

[术语附件](research/deepseek-runtime-2026-09-11/terminology-input.txt)是SE修订建议，不是已发布论文。PAPER仍固定SE9.6/DEC-012；历史snapshot不重写。未来独立review应检验这组词是否改善边界，而不只检查英文替换。
