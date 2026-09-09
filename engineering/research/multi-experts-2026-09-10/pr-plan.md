# 后续 PR 施工稿

ME-01…10 是本次需求的**消费切片**，默认未开工；已有LG/AM/MA/BG/Attention是执行归属，不重复派一张同义工单。当前完成的是ME-00文档入账。Astra拥有架构/接口/集成；Luna可做固定版本探索、夹具或有界独验，作者不自称独立接受。前端沿原单writer。

## 顺序

`ME-01 → ME-03 → ME-04` 验证确定性治理、派生与恢复；ME-09从第一片记录基线。ME-02只补真实激活缺口；ME-05在现有Pi上先做符合性，第二runtime按需求触发。ME-06消费已冻结的治理/恢复与Attention契约；ME-07/08是可选入口/适配，不阻塞本地价值。ME-10待真实使用证据。不设日历工期或用文档关闭产品门。

## 可派工切片

| 切片 / 候选PR标题 | 现有归属 / 最小交付与文件范围 | 依赖与验收反例 | 回退 / 退出 |
|---|---|---|---|
| ME-01 `Add revision-bound deterministic source index` | LG-00/01/02/04；先fixture，再只读manifest/rendition与exact/lexical查询；按LG合同限定`app/server`接入和来源测试，复用Core SourceRef | 独立合成目录：同内容移动、同名替换、mtime伪同、symlink逃逸、读取中变化、撤权、坏编码；增量与全量重建等价；不修改源目录 | 关闭增量路径后全量重建；保留来源与正式记录。未证明收益不加vector/graph |
| ME-02 `Resolve expert configuration without widening authority` | M08/09、既有Expert/extension与MA能力；盘点`app/server/runtime.mjs`、`service.mjs`、profile/model解析后仅补缺失snapshot；UI另单 | 两个真实角色；模型/effort覆盖、native system保留、父子权限、撤权、旧配置历史、切Expert不隐式切runtime；实际出站请求对比AM-C | 退回已有preset；历史仍解释得出；无第二消费者不建独立definition registry |
| ME-03 `Compile rebuildable Spark findings and context` | LG-03/04、M05–09；只做一种typed finding与provenance，复用Core candidate/decision；context/index置于派生边界 | ME-01；唯一原观察须先持久登记；删除全部派生后重建结果相同；来源更新/撤回后旧摘要不重新晋升；测cheap→strong false accept | 关模型整理仍可读manifest/lexical；不删除accepted成果；cheap质量不达标就用强模型/确定性 |
| ME-04 `Rehydrate current work without replaying execution` | 领域消费者+M05–09、BG-02；先closeout/read/rehydrate合同与fixture，再决定是否补领域归档动作；`docs/work-core`、runtime历史读路径 | ME-03或最小手工candidate；换Session/runtime、source撤回、旧规则、开放义务、effect unknown、cache缺席；读历史不新建Run | 退回只读packet；历史保留；不把跨Session边界塞进BG-02.supersedes |
| ME-05 `Pin runtime capabilities and adapter conformance` | AM-A/C/F + MA runtime matrix；固定实际Pi入口、FakeRuntime反例及native/adapted/unsupported矩阵；`app/server/runtime.mjs`、`app/harness`与`app/tests`有界改动 | start/interrupt/respond、错请求ID、乱序/重复/迟到event、断线、版本不合、撤权、resume/fork语义；不支持不得回成功；最小代价保留native配置 | 保持现有Pi路径；关闭新adapter不丢Core/history；没有第二消费者不抽公共SDK |
| ME-06 `Route meaningful changes into bounded Attention work` | 原Attention/HL队列 + BG-03（如涉effect）；先event关联、去重/预算/静默投影，确有需求后增加受控新Run | ME-01/04，当前Attention owner；重复event、歧义Matter、source新版本、closed工作、撤权、跨重启、无意义变化不通知；unknown不能自动重试 | 停止新唤醒、保留信号/待决及只读队列；不新增调度平台，AM-B不被误称native自治 |
| ME-07 `Expose scoped read access for external agents` | BG-01/M13；MCP或CLI选一个消费者，list→inspect→exact read，复用owner/policy；schema/tool docs与adapter测试 | 权限不扩张，撤权/分页/预算/不存在和不可见、跨Matter探测；外部conversation ID仅source ref；先离线协议再实际目标host | 禁用入口不影响CW；write另片。tunnel/嵌入UI无需求则取消 |
| ME-08 `Prove one alternative runtime or surface` | AM-F/MA后续；择Codex app-server或ACP之一，固定版本；或ME-07有消费者后做MCP App，不能一次替换两轴 | ME-05或07；七删除测试相关子集、approval来源绑定、provider/config差异、single-controller、恢复不重放；真实授权账户单独记范围 | adapter退出仍可读工作；Pi默认不变；Antigravity/Gemini/PTY兼容为后置候选，禁止靠画面解析报正式成功 |
| ME-09 `Measure continuity quality and lifecycle cost` | 既有SE-continuity评测+LG六层、AM-C telemetry；按[协议](benchmark-plan.md)增加long-life fixture/统计 | 所有实现片从P0计建库成本；强基线、holdout、独立oracle、权限/旧版误引门；真实cache与模拟分列 | 无净收益就删派生/并行层或缩场景；不改oracle给实现过关 |
| ME-10 `Capture reviewed corrections for governed learning` | roadmap链C、M12/14与HL trace；先使用/修订/reversal/权利事实，再候选规则或训练数据 | 真实独立用户与任务；归因到context/tool/schema/model/evaluator，heldout和撤销/删除传播；发布者与作者关系可见 | 无复用权/因果证据不训练；规则版本可回退，不删除失败样本掩盖退化 |

ME-08 的 `PTY` 仅最后兼容候选，不是可依赖控制协议。上述目录是责任范围建议；正式派单须先盘点确切文件与并行writer，再冻结新增文件名/接口，不预先承诺未存在API。

## 原 HC / RA / AT 全编号映射

原T18的编号保留追溯，但不按原顺序重复实现。下表“已有”仅限README所列固定基线。

| 原项 | 现有事实 / 本次去向 |
|---|---|
| HC0 canonical runtime events | 已有Runtime事件/结算；ME-05只补adapter语义损失，不另造Event Log |
| HC1 RunSpec/SessionRef/capability | 已有Session/Run/config；ME-02/05查缺补漏 |
| HC2 Runtime Broker | 现有service/runtime owner；ME-05/08需要第二实现时做薄分派 |
| HC3 Matter↔Run | 已有domain binding与Core run关联；ME-02/04保持引用，无新总账 |
| HC4 permission ceiling | 现有tool policy/BG-01披露/MA grant；ME-02/05加真实adapter反例 |
| HC5 crash/resume/handoff | AM-B查询恢复、BG-02单Session lineage已有；ME-04/05；handoff沿MA未交付部分 |
| HC6 heartbeat/Attention/Spark | ME-06；当前消息不wake，无自动scheduler |
| RA0 FakeRuntime + conformance | ME-05并入AM-A/F与已有synthetic child，不宣称完整adapter套件已有 |
| RA1 Codex App Server | ME-08候选，取代“第一默认runtime”排序 |
| RA2 Pi RPC | 默认已有SDK；跨进程消费者出现才ME-05/08，不为RPC改写现有集成 |
| RA3 ACP generic | ME-08第二候选；agent逐个验native能力，generic不保证权限/恢复等价 |
| RA4 Pi native-TUI attach | ME-08后置；单控制者无法证明即不附着同一session |
| RA5 Antigravity SDK | research-only，T18后置；先恢复并核验官方固定接口 |
| RA6 PTY fallback | research-only，协议缺失且有必要消费者才试；不由ANSI生成接受事实 |
| AT0 Attention projection | 现有Attention/BG-01读面；ME-07复用，不新造Attention Store |
| AT1 Courtwork MCP | ME-07只读首片候选，MCP角色是access |
| AT2 Secure MCP Tunnel | ME-07/08可选部署通道，先核验目标账户与边界；不是强制依赖 |
| AT3 ChatGPT tool dogfood | ME-07实际消费者实验；read-only与write能力分列 |
| AT4 embedded MCP App | ME-08等tool-only收益成立后；沿既有前端writer |
| AT5 Open-in-Courtwork | ME-07/08最小handoff入口；打开链接本身不启动执行 |
| AT6 permitted writes | BG-03/领域decision另独立授权合同；ME-07初片排除 |
| AT7 Chat Capture | LG Source导入 + ME-07；选定片段/缺口/原始hash，不建网页同步引擎 |

## 合流与接受

每片回执包含实际base/代码SHA、作者、独立输入、命令、红→绿反例、未检范围与非作者复核。先后端合同后前端消费；runtime/store schema若改变，另出严格验证、独占原字节备份、旧host拒新库、独立目录恢复测试。不能在旧host与新host间共享升级后的个人数据。

关闭能力与回退代码不等于逆转数据/外部效果；待结算任务先完成、取消或明确unknown。文档交付、合成符合性、真实provider、独立用户成果与长期结果分别登记。本包没有创建后续执行会话或部署任务。
