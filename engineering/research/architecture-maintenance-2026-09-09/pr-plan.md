# AM 系列后续 PR：先证据，后纵切

状态：设计草案，产品实现均not_started。本轮仅提供A的有界源码盘点与文档设计，不宣称A全范围兼容验证完成。原始A…F编号映射为AM-A…F，避免与现有工单撞名；不在此创建执行会话或GitHub PR。

## 顺序与写权

AM-A → AM-C离线基线 → AM-B；AM-D按B的生命周期缺口开展；AM-E先冻结共同DTO与fixture，再进入现有FE队列；AM-F在固定代码上独立演练。A/C只读盘点可分片，service/control-plane实现按Astra单一owner串行，E不得争用现有前端writer。

| 单 | 可审阅的最小交付 | 验证与退出 |
|---|---|---|
| AM-A / M01…04、08、14 | 固定包/lock与实际调用链；provider×API×model×adapter×mode兼容表；source conversion/loss、权限及生命周期映射 | 每行有SHA:path、调用者、测试入口；未知保留not-tested；不拆文件、不整体升级 |
| AM-C / M01、09、12 | 最终出站观察点、两类fingerprint、synthetic golden payload与变更影响表；在线配对协议 | no-op/UI-only不扰动prefix；语义变更和撤权可见；mock仅证请求形状，真实cache读写另验 |
| AM-B / M02…04 | 两项延迟只读任务：独立步骤继续，依赖步骤有选择地等待；持久身份、结果、投递与恢复合同；一条adapted路径起步 | 故障矩阵见下；native要另证serializer→parser→loop→continuation全链；无法补齐时明确降级并停止native宣称 |
| AM-D / M08、14 | 一个非核心能力的新代际prepare/activate/retire；资源归属和回退边界 | 激活失败保留旧合法代际；撤权优先于drain；旧代际有数量/期限限制；不需要独立框架就保持模块 |
| AM-E / M10、11 | 一种Run任务投影、一个缺席renderer的历史阅读路径、版本化动作与stale反馈 | 先后端合同fixture后UI；后端复验CAS/权限，前端不自行更新正式状态；不支持动作不画可用 |
| AM-F / M14 | 可控adapter不兼容的独立维护演练；命令/输入/断言/修复/退出回执 | 另一agent不靠原作者上下文复现；修复未放宽断言；无整体升级；失败与旧版本证据保留 |

## AM-B 的第一条纵切

使用上一单LG-00的自造资料包或更小的两文档fixture。工具先返回已登记任务身份；宿主完成材料目录的独立读取；只在需要A文档原文时等待A，不因B仍执行而阻塞A的已具备步骤。最终摘要候选只能引用实际完成且版本适用的结果，正式接受仍由Core决定。测试里的模型脚本不证明真实模型能正确选择等待。

先利用普通同步工具返回handle、后续get/wait的adapted路径检验host记录与恢复；该路径不等于原生async同一response继续生成。若native缺口需要Pi窄补丁，单列可复现差异、锁定源码与退出条件，经AM-C检查请求影响后再实现；不在`async:true`字段透传后直接宣布支持。短工具无跨回合存活需求时保持原调用。

AM-B的字段与状态按 [Design](integration-design.md)冻结；先决定现有runtime store如何承载，不新增Work ledger。schema4升级若必要必须另出迁移/备份/兼容合同，升级数据不能交给旧host读取。只读PoC不得把所有工具自动变成长任务，更不开放外发或不可逆副作用。

| 故障 / 触发 | 最低判定 |
|---|---|
| 流式参数只到一半、同批launch与wait | 完整参数和权限检查前不执行；先登记launch再处理依赖wait |
| 两任务乱序、重复callback、重复wait | 各自归原call；本地结果/投递去重，不覆盖另一结果；不重复发送已确认结果 |
| 接受意图已存但dispatch未确认，或外部已执行但回执未存 | 可查询/幂等则核对；否则unknown，禁止盲重试或exactly-once宣称 |
| 原Session关闭/切换/删除/分支、回执晚到 | 按原始lineage与合法后继交付；不存在则保留可查询的orphan/undeliverable，不投最近会话、不重建已删除会话 |
| provider已接收但本地未确认 | execution可完成，delivery仍unknown；恢复策略不能等同外部执行重跑 |
| cancel与成功竞争、撤权、预算耗尽 | cancel请求和结算分别记录；执行边界阻断新副作用，结果保留真实顺序，不由按钮强改terminal |
| 来源换版本、能力升级、producer缺席 | 旧结果关联旧版本；可读但不静默适用新材料；fallback维持历史读取 |
| 重启、重复投递、所需结果未齐却模型final | 恢复pending/unknown；不能把生成结束或工具结算当成果接受；产品完成条件按实际依赖判断 |

## AM-D 的收窄合同

选择一个已有非核心工具adapter即可。先验证config/source语法与依赖兼容，再准备新代际；当前合法代际只在目标revision/CAS通过后切换。记录订阅、定时器、进程、连接、临时文件等effect owner与dispose结果；启动/释放失败不能藏在成功回执后。旧任务保留所需实现版本或显式终止/unknown，不无界持有进程和凭据。紧急撤权由现有执行边界及时生效。

配置指针退回、代码退回、数据迁移恢复、外部补偿各自验收。重新运行旧包只证明代码/配置路径，不能撤销其外部后果。纯声明资源和可执行扩展使用不同准入，旧批准范围不能靠相同pluginId覆盖任意新版本。

## 合流与回滚

每单回执记录作者、实际base/代码SHA、独立树、fixture/命令、预期反例、结果与未检项。AM-B/D后端先合流并冻结schema/action；AM-E从最终main新建树消费，前端修订回到同一接缝。Astra复查组合版本，非作者验收不引用作者自述。

关闭实验开关应停止新增任务/代际，保留原有同步路径与历史读取；已有待结算任务必须先完成、取消或明确unknown，不能删除记录来回滚。数据schema回退单独演练。真实provider与付费验证沿现有用户授权，不因研究文档自动开启。若增量维护成本超过收益，保留确定性请求检查与薄adapter，取消平台化扩张。
