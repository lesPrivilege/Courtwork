# 原前后端请求与新派工的覆盖关系

此表防止“切成33单”以后原需求无声消失。`已有/记录已交付`是固定基线源码或仓库回执所支持的范围，并非本审查全量实测；`需00复核`表示本次没有足够代码/运行证据关闭它。后置项保留原单，不意味着本报告另行授权所有实现。

原来源：`engineering/mvp/execution/work-surface-kit/backend-requests.md`；研究映射见ME/LG/AM的pr-plan与selection-index。精确引用与读取范围见SOURCE-INDEX。

## Backend requests

| 原编号 | 本次处置 | 对应执行或门 |
|---|---|---|
| BE-1/3/25 Activity、日期口径、覆盖 | 仓库记录已交付；保留UTC、按Run id去重、retained coverage不是全历史完整性 | FE04/EV01复用；不重造metrics store |
| BE-2 多文档tab | 保留原单，第一条source review无需等多文档容器；文档identity/版本/焦点合同先于UI array | 不塞进LG或Core；实际前端队列独立处理 |
| BE-4 runtime-control gaps | 本次未逐个复跑B-1/B-2/B-4/B-10，不判断整单关闭 | RV26-00逐项对证据；HC04覆盖实际执行能力与unknown反例 |
| BE-5 runtime source inspect | 仓库记录认证inspect-only已交付，locator获取/UI不随之完成 | 复用当前接口；注意它是Runtime artifact解析，不是LG工作资料Intake |
| BE-6 proposal、BE-7 apply/rollback | 后置到确有运行资源安装/变更消费者；不能凭inspect通过自动安装 | 仍沿原R4/R5与control-plane CAS；不在source review UI中顺手做 |
| BE-8 Expert snapshot | 两个真实角色的冻结配置先做；Save runtime…完整产品化不默认全做 | HC03，复用现有profile/extension |
| BE-9 compatibility matrix | 固定当前Pi调用链并按能力列native/adapted/unsupported；不宣称全部donor兼容 | HC04；第二runtime走OPT03 |
| BE-10 profile/policy契约 | 需00核定现有合同及consumer缺口，不因有操作名便称GUI完成 | 00/HC03/FE01按需补 |
| BE-11 Hooks/memory/registry/secrets/sandbox kinds | 不从Planned菜单逆推必须建设全部平台 | 真实消费者出现逐项立约，绝不能以UI图标提供权限 |
| BE-12 thinking/effort | 现有service按模型支持列表检查；消费真实能力而非hardcode | HC04/PV01/FE04；避免重新实现已存在检查 |
| BE-13 MCP lifecycle反例 | 未独立复跑其历史wire反例，不以旧请求标题认定当前仍坏 | 00定位最近代码/证据，再决定是否成为HC04缺陷 |
| BE-14 decision时间 | 保留原单；没有可信timestamp就显示未记录，不借Run endedAt充当决定时间 | Review证据需要时由同一Core owner实现；不得重写旧receipt |
| BE-15 Matter title/最近决定 | 保留原单；不阻塞以稳定Matter identity恢复 | HC02/FE02可消费新增合法字段，不杜撰标题/时间 |
| BE-16 工作区标识/Data行 | 保留原单；优先稳定不含secret的标识，不因设置页暴露任意路径 | 原宿主owner小单；非Core领域新增概念 |
| BE-17/18 临时目录探测 | 记录已交付有界探测，不证明key核验/可生成/已保存 | PV01/FE04按三级事实消费 |
| BE-19 memory adapter | 先消费Core来源/版本/权限化读取与recovery，不能新造canonical memory | HC02/OUT01；专门memory provider以后按需要 |
| BE-20 temporary chat | 保留语义待决：不读写memory不等于无Runtime日志，也不等于删除已提交工作 | 独立合同先行，第一条治理纵切不实现 |
| BE-21 connection registry | 此基线已有多连接与独立provider identity；重点是有效域和失败恢复 | Q02/PV01，不重做注册表 |
| BE-22 MCP server注册 | 本次不独立断言已交付；连接生命周期不等于任意server新增 | 00清账；实际用户接入需要时补原单，不捆绑LG |
| BE-23 无项目Chat | 已有global Attention conversation的具体路径，不外推所有普通Chat已泛化 | 保留现有scope语义；FE03只消费其确切合同 |
| BE-26/27 Mail/Calendar来源 | 候选只读source adapter。用户另关注Email/GitHub，应选一个真实授权来源再实施 | 不在本轮读取个人账号。来源接入后可喂AT02；外部写必须OPT04 |
| BE-28 连接健康版本化 | 目录/配置/凭据版本必须匹配，临时握手不更新全局健康 | PV01/FE04 |
| BE-29 usage聚合 | 仓库记录只读聚合已交付；保留partial/missing，不当账单 | FE04/EV01复用 |
| BE-30 Question CAS | 仓库记录已交付，store resolve事务也有预期payload复核 | FE01/FE03复用现有错误合同，不做第二批准服务 |
| BE-31 结构化Question | 保留原单；结构与敏感字段限制必须一起验证，不能只做漂亮表单 | 真实ask_user消费者需要时原单执行；FE01准备unknown schema反例 |
| BE-32 event time | 原请求保留；本次未全量核对所有事件路径，不能补造历史时间线 | HC04/FE04只显示真实可观测时间，时间戳不是排序authority |
| BE-33 tool未完成原因 | 无result/unknown不得擅自变cancelled；只消费明确reason | HC04及现有工具状态前端；不借request错误分类冒充tool原因 |
| 候选BE-34 undo | 无撤回/补偿语义不画可用Undo；配置回滚不等于撤销外部行为 | 外部效果部分OPT04，其余真实动作逐项立约 |
| 候选BE-35 Auto policy | 不从模式名获得新权限；介入条件/合并提问/撤销均要真实owner | 不随Spark静默报告启用，另行准入 |
| BE-36 authMethods | 当前已实现方式才写supported；其他诚实unsupported | PV01；Google Auth单独OPT02 |
| BE-37 Google目录/route | 目录扩集与真实wire/auth分别验证；API key不是用户Google Auth的替代完成 | PV01/OPT02 |
| BE-38 失败类别 | 现有粗错误类型不可外推完整闭集已实现 | PV01补精确字段与fixture，FE04消费 |
| BE-39 已保存连接最小生成 | 用户显式触发、无workspace/tool/history污染、版本绑定receipt | PV01/FE04；真实运行需授权 |
| BE-40 Provider capability | **与另一条BE-40冲突**；记录临时别名BE-40@Provider | RV26-00登记，PV01/FE04执行 |
| BE-40 Attention排序 | **与另一条BE-40冲突**；记录临时别名BE-40@Attention | RV26-00登记，AT01/FE03执行 |

已读请求表未出现BE-24；这不是对整个仓库“不存在BE-24”的断言。任何未在本表覆盖的后续新单由RV26-00查实际HEAD，不用猜编号。

## ME / AM / LG / BG映射

| 原路线 | 具体消费 | 尚未默许的范围 |
|---|---|---|
| ME-01 / LG-00/01/02/04 | LG00→LG01A/B/C→LG02A/B→LG04 | 全格式/OCR工厂、向量/知识图谱、任意目录读取 |
| ME-02 | HC03两个角色/配置快照 | 通用Expert marketplace、全热插拔 |
| ME-03 / LG-03 | SP01一个typed finding、FE02真实投影 | 私有Spark事实库、自评即接受 |
| ME-04 | HC01有界读取、HC02续行 | 把supersedes扩成跨Session执行迁移、读历史即resume |
| ME-05 | HC04 Pi调用面与符合性 | 第二runtime已经成立 |
| ME-06 | AT02稀疏signal | 默认scheduler、自动resolve、自动新建Attention、外部写 |
| ME-07 | OUT01条件单，一个只读外部消费者 | CLI/MCP/SDK同时全做、tunnel、通用Core op |
| ME-08 | OPT03一个第二runtime | 多个替换轴同时引入 |
| ME-09 | LG00/Q05先预注册，EV01完整对照 | 只报token、全靠作者gold或调参集评分 |
| ME-10 | 后置；EV01保留评测权利/归因/reversal要求 | 未经授权训练、自动改规则/评分器、自动promotion |
| AM-A/C/F | HC04、Q01–Q05，有界实际调用与维护故障 | 全套依赖升级、新的通用SDK |
| AM-B | 已有task机制；OPT01只补真实慢任务adapter | native async、生产child scheduler |
| AM-D | HC03/PV01只按真实配置激活需要补缺口 | 任意代码热更、跨域大事务 |
| AM-E | FE01–FE04按冻结packet消费 | 前端私有业务状态与重复后台 |
| MA/Thread | 复用现有通信和projection；HC04诚实标child能力 | 消息自动wake、原生handoff/生产并行已完成 |
| BG-01 | 同一Core的治理/披露接缝供HC02与OUT01消费 | 跨租户/多用户ACL保证 |
| BG-02 | 同Session Run.supersedes保留原语义 | 泛化reopen、scheduler、跨Session链 |
| BG-03 | OPT04条件单 | 没有远端消费者时先建全平台outbox |

## 后置不是遗忘

RV26-00必须把未进入本包主线的原单留在现有roadmap/dispatch index，附重开触发、owner和阻塞关系。不得把本表“后置”直接写成rejected/closed，也不得在主线小PR中顺手实施这些功能。
