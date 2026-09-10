# Google Workspace CLI · Tool ABI / Attention 参考登记

2026-09-11，Astra；接单main `7f06910584c8025086bd7f11f36d32c93958b1e4`。状态：**indexed_unverified / 研究输入已登记 / 未开工**。本次用户只要求登记材料，不安装CLI、连接Google账户、创建订阅或派新实施单。

## 来源与读取范围

用户粘贴文本已全文读取并按原字节保存：[source.txt](inputs/source.txt)，7,395 bytes / 269 lines / 5,364 characters；SHA-256与来源字段见[manifest](source-manifest.json)。材料没有提供原会话ID、上游commit、release或独立实验日志；不补造这些信息。

[googleworkspace/cli](https://github.com/googleworkspace/cli)是从原文末段项目标识构造的导航入口，本轮没有打开上游或运行源码。Discovery动态命令、schema、helpers、watch/events、凭据加密、dry-run、Model Armor、100+ Skills、约7天watch续期等均为**来源主张待核验**，不是本次已证实的事实。原文中的P0/P1/P2和“第一批真实数据源”属于建议，不改写Courtwork施工优先级。

## 逐项处置

| ID | 原文主张 / 建议 | 登记与后续消费边界 |
|---|---|---|
| GWS-01 | Discovery生成命令，schema可检查request/response | 动态目录与按需tool materialization参考；需固定版本、完整性与schema漂移证据，不直接采用新Capability Registry |
| GWS-02 | generic methods / helpers / skills分层；helper不重复单API调用 | helper分类与必要编排的研究样本；provider method、CW逻辑能力、Expert工作流程分开，不把Google方法名晋升为领域对象 |
| GWS-03 | Gmail triage/watch、Workspace Events、Calendar/Drive/Docs/Chat helpers | CLI命令及覆盖范围待核验；材料提及读写不表示CW已有相应adapter或获得账户权限 |
| GWS-04 | watch/PubSub/NDJSON、重连、续期、CloudEvents及ack | 进入EX-GWS-02的来源身份、去重、确认、恢复、renewal研究；具体周期和行为须读固定一手资料 |
| GWS-05 | event-first → Signal → Attention | 接既有Attention/ME-06研究，事件与Attention item分开；通知需现有policy、重要性及去重，不因订阅事件启动Run或产生正式决定 |
| GWS-06 | mail.read可由gws/MCP/native等实现 | Tool ABI多实现参考；gws是实现候选，不是逻辑能力定义本身，不把“可替换”写成已验证兼容 |
| GWS-07 | host-side adapter、受限argv、JSON及normalized receipt | 先查现有Host/control/runtime owner；CLI退出码不证明远端effect或Core accepted，不新增自由shell入口 |
| GWS-08 | Host侧凭据、加密、输入验证、Model Armor | 防护能力与适用范围待核验；复用现有凭据/权限边界，不读取个人凭据，不把sanitization当授权或事实校验 |
| GWS-09 | dry-run → proposed effect → approval → execute → receipt | 保留proposal/permission/execution/accepted区分；dry-run不是授权或效果回执，外部CLI确认惯例不替代CW执行检查，也不强制每个读操作走领域Review |
| GWS-10 | 100+ Skills、gws-shared、recipes、Gemini extension | 数量/加载要求/兼容性未核验；只作recipe与上下文编排索引，不安装或自动执行来源中的skill指令 |
| GWS-11 | Gmail/Calendar/Drive先行 | EX-GWS-01候选研究域，首轮仅目录/契约；不表示真实数据已可访问 |
| GWS-12 | 大catalog、小Run工具面，接runtime_load | EX-GWS-03按已有exposure/admission核对；runtime_load不等于外部Discovery获取、通用包加载或新权限授予 |
| GWS-13 | Discovery/events/auth P0，helpers/recipes P1/P2 | 仅材料内部研究排序；当前前端组合修补与通用Harness基础优先，Google集成未升为近期产品门 |
| GWS-14 | 相比DSH单能力seam，gws是完整SaaS specimen | 登记比较题；“完整”“成熟”不作本地兼容、安全或产品接受结论 |

## Explore 消费索引（未派工）

| 来源ID | 判别问题与有界范围 | 后续验证 / owner |
|---|---|---|
| EX-GWS-01 · Capability Provider | Gmail/Calendar/Drive的动态API目录→逻辑能力→受policy约束的执行→typed receipt；先catalog-only | Astra定owner/Tool ABI，Luna可做固定上游SHA/path与有界schema探索；缺schema/不兼容/输入拒绝/凭据引用边界。真实读写另有执行合同 |
| EX-GWS-02 · Attention Event Bridge | watch/subscribe→NDJSON→外部事件→Signal→现有Attention | 先synthetic stream，测重复、断线、ack/no-ack、续期、source identity、event time/ingestion time；外部订阅及消息发送未授权，效果未知不自动重试 |
| EX-GWS-03 · Tool Materialization | catalog很大时仅向Run披露精确、必要的schema | 测目录版本、lazy load、预算/截断、名称映射、exposure≠permission及撤权；没有真实消费者不新增registry状态库 |

三个EX是原材料的召回标签，不是已冻结PR或执行工单。正式实现前须固定上游版本/许可/源码路径，分别核验模型输入、持久记录、GUI投影与失败/取消/恢复；现阶段不因本索引启动Luna或产品施工。

## 既有入口与当前优先级

- [Runtime Control合同](../../../docs/runtime-control/INDEX.md)：现有资源类别/权限/来源机制继续有效；registry、workflow、memory_provider等需adapter的标记不等于本材料假设的完整实现。
- [RD-001](../RD-001-runtime-adapter.md)与[Harness研究入口](../harness-pro-2026-09-10/README.md)：此包是后续本地donor输入，不修改送审manifest，也不声称Pro已消费。
- [Control Plane参考](../control-principles-2026-09-10/README.md)与[Attention来源索引](../attention-2026-09-09/source-index.md)：分别消费能力/访问分层及事件桥接问题。
- [当前merge节点](../../execution/2026-09-11-merge-node/README.md)：Summary D1/D2→CI-B/F × CS-01组合，Harness先本地清账/MCP接缝。Google真实接入、多agent/第二runtime不抢该节点。

本次只登记原文、来源等级、候选问题和索引；未新增产品API/schema/依赖、EX执行任务、远端PR或部署，不关闭现有完成门。

## 登记验证

原文与用户附件逐字节一致，manifest的字节数/行数/SHA-256通过；14项处置与3个EX标签完整。文档链接检查790份文档/3628条本地链接通过，git diff --check通过。未运行产品或上游CLI测试。
