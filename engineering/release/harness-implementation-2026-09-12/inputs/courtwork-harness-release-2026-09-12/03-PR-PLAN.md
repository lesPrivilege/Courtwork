# 03 · 下一轮 PR 编排与可施工边界

## 1. 唯一主线与发布范围

沿既有 roadmap：基础 GUI/通用执行正确性 → 有明确支持范围的稳定节点 → 自研编排合流与独立 runtime 替换。不把所有新研究变成当前 release 的前置。[R12](SOURCES.md#r12)

以下编号沿原 HPR 卡，后缀仅拆分施工，不是 GitHub PR 号。全部尚未创建、未派发。P00 把本表回填既有下一节点/roadmap；没有第二份总路线。

**第一实施列：** P00 → P01 → P02 → P02b → P03 → P04a → P04b → P05 → P06 → P11-A → P12-A。

**第二能力列：** P07→P08，P09，P10，随后 P11-B 与完整 P12。它们复用第一列的接缝。完整通用能力节点不能用 P12-A 代替；本次既有 G1–G5 产品门也不能被 P12-A 自动关闭。

首个 release 仍按现有“合成专业材料 → 真实执行 → 人的正式决定 → 新 Session 接续”范围验收。memory CRUD、web_fetch、目录导入等只有在该 release 声称可用时，才必须将对应能力列连同 UI/负例一起完成；否则明确保持 unavailable/planned，不借“通用”二字暗示完备。[R14](SOURCES.md#r14)

每个 PR 至少分清：contract、实现、自测、非作者核验、集成；源码重构与状态迁移不混提交。所有新增文件下文标为“拟新增”，不能当作已存在的测试命令。

## 2. 第一实施列

### P00 · 固定本轮基线与处置账

**Owner：** Astra 集成者。**依赖：** 无。

**产出：** 固定当前 main/工作区/lock/运行 schema；核对本包与实际 HEAD 差异；把旧 24 HPRO 按 accept/amend/defer/reject/obsolete/blocked 逐项处置到现路径和卡片。原收到包是 f1700fb0 的 13 卡，后版缺附件不进入本轮完成分母。[R03](SOURCES.md#r03)[R10](SOURCES.md#r10)[R11](SOURCES.md#r11)

**路径：** 既有 `engineering/release/harness-next-node-2026-09-12/README.md`、`engineering/architecture-runtime-canon.md`、`engineering/roadmap.md`、`engineering/current.md`；本次 intake 与 evidence 的新目录。旧 received 原件只读。分配 schema 的权力留在唯一 RuntimeStore owner，不预占 schema5/6。

**验收：** 固定代码与依赖；每一条公开能力有 owner/实现/证据/缺口；每张采用卡有唯一 writer。先跑现基线，记录已有失败。不能只新增一份清单就宣称基线已绿。

**停点：** 产品接缝已变化但未 diff，归档候选误作 main，来源/hash 不一致，仍无法确定当前 schema/writer。文档回退仅撤销采用标记，保留来源原件。

### P01 · 锁定 SDK 的 MCP 目录完整性

**Owner：** 后端唯一 writer。**依赖：** P00。

**路径：** `app/runtime/mcp-manager.mjs`、必要的 `control-plane.mjs`/`control-contract.d.ts`、`docs/runtime-control/api.md`；拟新增 `app/tests/hpr_p01.test.mjs` 和 loopback fixture。

先提交能区分“SDK 自动归并”和“Host 需翻页”的真实安装 SDK 测试，再提交产品修正。测试现代与 legacy 实际支持路径，固定依赖 lock 和协议。完整列表原子发布；连接身份/epoch 与 config hash 不一致的晚到响应不能覆盖新连接。

**必须负例：** 两页、空中间页、第二页失败、重复/循环 cursor、重复名字、总量/字节超限、断连/重连竞态。任何不完整不能 healthy/exposed。

**回退：** 不迁 Core；失败目录不可调用，显式重连。**停点：** 只有 stub/reference 函数、没有实际 SDK；上限只在巨大对象分配后检查却声称流式内存安全。

### P02 · MCP 错误与效果结算

**Owner：** 后端唯一 writer。**依赖：** P01。

**路径：** `app/runtime/mcp-manager.mjs`、`app/server/service.mjs`、运行控制契约；拟新增 `app/tests/hpr_p02.test.mjs`。

保留“已收到业务错误”和“外部效果未知”两条事实。复用现 externalUnknown/notice/Run unknown 和 admission fence；带精确 callId、server/tool、绑定版本与 failureKind，不保存敏感参数原文。只有可信 Host 证据能证明 no effect；远端 hint 不够。

**必须负例：** 先执行副作用再返回 isError；断连；本地派发前拒绝；收到错误后模型尝试重发；取消后晚到；unknown 回执落盘失败；重启不重发。成功标准是整条 Run 的结算与拒绝行为，不是报错字符串。

**回退：** 新 unknown 记录仍保留，不改写为 safe-to-retry。**停点：** 取消/reset 清掉未知效果；onUnknown 失败后仍开放工具；同 callId 的关系丢失。

### P02b · MCP 结果保真与错误正文

**来源：** 当前代码确认的补充，不伪称原 P02 已覆盖全部 structuredContent 问题。[R08](SOURCES.md#r08)

**Owner / 依赖：** 同一后端 writer；P02。

**路径：** `mcp-manager.mjs`、必要的 adapter/tool-result 类型与测试；拟新增 `app/tests/hpr_p02b.test.mjs`。若原 UI 无法表达 unsupported/partial，由 P11-A 消费，不在此越界改前端。

同时保留 content 与 structuredContent；保存必要且有界的原结果证据，单独生成 model/UI 投影；错误也保留受控的错误正文/结构，不把内容一律扔成通用 Error。结果/结构校验使用实际 SDK 协议，不硬编码旧版本 JSON 形状。

**必须负例：** 正文与结构共存、结构单独存在、合法协议中的不同 JSON 类型、未知内容块、错误含结构、输出校验失败、超限、裁切后仍可回源、私密字段不入公共日志。

**回退 / 停点：** 历史无数据不伪补；投影失败明确 partial/unavailable。出现无限 raw dump、隐私泄漏或需要第二 transcript 才能保真时停线拆单。

### P03 · Pi native seam 提取 / DRT-01 实现消费

**Owner / 依赖：** 后端唯一 writer；P02b。

**路径：** `app/runtime/pi-session-runtime.mjs`、`app/server/service.mjs`；拟新增 `app/runtime/pi-runtime-adapter.mjs`、`app/runtime/runtime-port.d.ts`、`app/tests/hpr_p03.test.mjs`。

Host 不再直接 open/create Pi SessionManager；native locator 由 adapter 解释。保持现 provider identity、credential lane、adapterId 历史解释、native journal 路径和工具发现限制。prepare 不触发网络；获唯一 ownership 后才 start。

**必须验收：** 旧/新 fixture wire 与事件/结果等价；取消 sticky；event drain；unknown 保留；历史打开失败不能偷偷新开空 session。import guard 必须能发现 service 重新引入 Pi native 类型/操作。

**回退：** 纯代码 façade 回退，不迁 journal。**停点：** 必须升级 Pi、变更 model routing、迁移数据或无法解释 prompt/tool 差异。共享 `service.mjs` 不并行派第二 writer。

### P04a · 提取 Work application façade

**Owner / 依赖：** 后端唯一 writer；P03。

**路径：** `app/server/service.mjs`、`app/runtime/extension-registry.mjs`、现 Work/Attention 工具接缝；拟新增 `app/server/work-application.mjs` 和 P04a 测试。

只移动明确属于 Work 的 context/tool/finish/reconcile 贡献，普通 Run 流程保留。旧 API 和认证/权限决策不变。ApplicationContribution 不得持有任意写 store 的接口，正式人类决定不能变成模型方法。

**验收：** 现 Work fixture 的候选、版本、finish/close/reconcile、late event 完全保持。**回退：** 无 schema 变化，退 façade 提取。**停点：** 为提取改 Core 领域逻辑、合并 Attention 状态机、让应用 hook 直接批量写正式状态。

### P04b · Core-free Harness 组合根

**Owner / 依赖：** 后端唯一 writer；P04a。

**路径：** `app/server/runtime.mjs`、必要 service/registry 构造；拟新增 `app/server/harness-runtime.mjs` 与 P04b 测试。保留旧 createRuntime 完整应用 façade。

普通 Harness 的 import、构造、启动与运行均不启动/读 Core。Work 通过明确 composition 接入。已有 workRef 但 Core 不可用的运行明确拒绝，不降级成假专业成功。

**验收：** Core constructor/bridge 失败时纯 Chat 能运行；Work admission 硬拒；关闭顺序与锁不回退；纯入口不发生转递 Core import/构造。**非目标：** projectless Chat、无 cwd、目录迁移和卸载全部 Python。

**回退：** 恢复旧组合入口；数据不变。**停点：** 双 session store、取消时释放活跃 writer、纯入口仍启动 Core、需要 Core schema 迁移。

### P05 · 真实输入证据与历史解释

**Owner / 依赖：** RuntimeStore 唯一 owner；P04b。

**路径：** `app/server/store.mjs`/`service.mjs`、Pi adapter、运行控制合同；拟新增 `app/runtime/run-inputs.mjs`、`app/tests/hpr_p05.test.mjs`。

最小 Run Plan/输入快照采用现字段可表达的部分；prepared 与 submitted 分离，后续 runtime_load/compaction 的输入增量可追踪。必要 blob 先持久，再发布引用。保存 native ref 而非完整 transcript 镜像；无证据的历史明确 partial。

**必须负例：** blob 有/metadata 无、metadata 有但尚未 start、外发后回执落盘失败、wrong Session、撤权、缺 journal、动态加载新内容、稳定配置前缀不漂移。

**迁移：** 优先 additive；确需 schema 时由 owner 统一分配、strict reader、完整备份、旧 host 拒新。**停点：** 当前配置冒充历史、字符数冒充 token、快照失败继续请求、私密内容进入 Git。

### P06 · 指令层次、能力拒绝与 compaction 回归

**Owner / 依赖：** 后端唯一 writer；P05。

**路径：** 现 control-plane/control-contract、adapter/service/Work façade、运行控制 docs；拟新增 `app/tests/hpr_p06.test.mjs`。

固定可信系统/项目/Session/任务贡献与外部资料的地位；自然语言冲突不假装已自动裁决。权限不采用 last-wins。active Run 不热换 profile；requested/effective/bound 不混显示。当前实现若已满足某条只补证据，不为术语重造 prompt 平台。

**验收：** fresh/continued/compacted 三条真实 fixture 请求；旧 summary 不吞新授权；scope 不串；steer/fork/resume 不支持则明确拒绝。**回退：** 编译策略变更记版本，仅影响新 Run。**停点：** 删除 native 必要消息、模糊禁止规则或用模型自述代替实际 wire。

### P11-A · 第一列的最小前端消费

**Owner / 依赖：** 既有前端 writer；P06 及本列 DTO 已冻结。

**路径：** 优先现 `app/web/runtime-view.mjs` 与已有 Inspector/状态组件；拟新增对应测试和有界 browser gates。要新增静态路径时由后端 owner 单独准入，不由前端越权改 server。

仅展示：实际 runtime/profile、当前与历史 input、prepared/submitted/partial、MCP incomplete/error/effect unknown、unsupported 解释。复用现 Settings/Context/Run detail；不新增全局导航、巨型关系图或假开关。

**验收：** scope 快切晚到响应、active 修改拒绝、错误恢复、键盘/焦点、窄屏与 200% 主路径。**回退：** 老后端明确 unavailable，不能用样例冒真状态。

### P12-A · 第一列有界独立接受

**Owner / 依赖：** 非作者核验者；P11-A。

**产出：** 固定 SHA/lock/环境的基线回归、所有第一列负例、备份恢复与 GUI 证据。它接受的是第一列，不是原 P00–P12 全包，也不把 G1–G5 标为自动 pass。

真正 release 放行还须 05-RELEASE-GATES 的 G1–G5 证据和当前公开能力清单成立。真实 provider 仅走用户已授权的 GUI 配置/预算，不从环境或个人凭据库取 key。

**停点：** 权威、越权、重复外部效果、未记录外发、丢失历史接受字节任一失败；作者冒独验；skip/零用例冒绿；旧数据与新 host 共用。

## 3. 第二能力列：明确保留，不假装随基础完成

| 原卡 | 本轮处置 | 必须连同验证的边界 |
|---|---|---|
| P07 memory_text | 保留，第一列之后按能力声明消费 | 人维护、scope/CAS、exact input；关闭只停止后续注入 |
| P08 clean context | 与 P07 成对设计和发布；不可把 prompt“忽略”当隔离 | 新 native generation、old summary sentinel 不进实际请求；历史仍可读，未知效果/义务不被清掉 |
| P09 web_fetch | 保留独立网络能力片，默认不可用 | 授权/目标/实际 socket、DNS/重定向/限流/解码上限；版本化结果，no cookies/JS/POST；源数据不是指令 |
| P10 workspace Skill intake | 保留显式检查→导入现 registry | hash/TOCTOU/symlink、无 HOME 扫描/安装/脚本执行；不因 allowed-tools 扩权 |
| P11-B | 消费上述实际后端与既有前端 grammar | memory off/reset、web scope、Skill inspected/imported/exposed/loaded 分开 |
| 完整 P12 | 在其实际依赖全部满足后独立接受 | 若要声称原工单定义的自足通用节点，不能只通过 P12-A |

新 BE-6/7 Skill proposal 不是 P10 的改名：一个是 Agent 提案和人工应用事务，一个是获准目录里的精确文件导入。复用 resolver/registry/审批差异部件，不混淆 proposal ledger revision 与 runtime config revision。[R18](SOURCES.md#r18)

## 4. 并行边界

允许并行：不改共享产品文件的 source/SDK 探索、负例设计、独立证据核验、固定 DTO 后的前端工作。禁止同时修改 `service.mjs`、`store.mjs`、`control-plane.mjs` 或同一迁移版本；每个可变 owner 一名 writer，main 合流串行。

研究者可以先准备 DRT-02 synthetic fixture，但对主线 adapter 的改动排在 P03/P05 合入后。DRT-03 的真实第二 runtime、Spark 薄执行器与广泛 MAS 不趁本轮重构搭车。

每张 PR 的回执固定：base/implementation SHA、允许路径、输入版本、实现事实、原始测试结果、未跑/失败、迁移/回退、作者与非作者关系、关掉哪个门、仍未关哪个门。模型身份、次数和预算另记，不用“已派单”作为完成证据。
