# HPR-02 · 候选小 PR 工单

## HPRO-0021 · 单一路线与施工纪律

这些编号是本次输出切片，**不是另一套产品 roadmap**。本地接受后映射到既有 owner/任务编号；原 roadmap 的优先级由集成者更新。本稿未创建 GitHub PR、分支或后台任务。

顺序：P00 → P01 → P02 → P03 → P04 → P05 → P06。随后 P07 → P08、P09、P10 可以在清楚文件所有权时准备设计，但它们共享 control/service，**本轮默认串行实现/合流**，不是暗示可以并行改同一文件。全部后台合同冻结后 P11 前端消费，P12 独立验收。现有前端无关工作不必暂停；不要用全局重构阻塞它。

每个 PR 只允许自身列出的产品路径，另可增加该 PR 的 `evidence/hpr02-pNN/` 原始证据和对应交付文档。当前已有文件名由基线或源码证明；带 `[new]` 的路径是待建文件，不能当作已存在的可运行测试。

**通用接受命令（P01–P12）：**在仓库根目录先 `test -f app/tests/hpr_pNN.test.mjs`，再 `(cd app && node --test tests/hpr_pNN.test.mjs)`。把 NN 换成本 PR 编号。每份测试文件必须实际包含下列负例，不能只建一个永远通过的空文件。全量门仍是项目已有 `npm test` / `npm run smoke`。Node 必须满足仓库 engines；本包的参考函数测试不代替这些产品测试。

所有新增 HTTP route/DTO 都显式写成 PROPOSED；现有 `/api/v5`、token/origin 和错误/幂等行为不变。遇到新增接口需要超过允许路径的更新，先由唯一 owner 拆小提交、记录原因，不能在局部施工时自行扩大范围。


---

## HPR02-P00 · 冻结工件、owner 与回归基线

来源输出：HPRO-0001, HPRO-0007, HPRO-0016, HPRO-0018, HPRO-0021, HPRO-0024。Owner：本地集成唯一 owner（Astra）。依赖：无；先对输入固定基线。

**目标。** 原文/附件完整回收；核验送审文档与产品 SHA，机械列出受影响方法、路由、schema 与现有回归命令，逐项登记而不改产品。

**非目标。** 不根据摘要重写已接受的 D09/D11 等裁决，不给本包盖产品验收章；不覆盖原始 inputs。

**只允许路径。** `engineering/research/harness-pro-2026-09-10/outputs/<intake-id>/** [new]`；`engineering/execution/hpr02-p00-baseline.md [new]`；`evidence/hpr02-p00/** [new]`。

**实际依据。** S01–S14；C01–C14；source-manifest.json 的已读和未读范围。

**接口／DTO。** IntakeRecord{inputCommit,codeCommit,artifactPath,sha256,bytes,originalMessageRef?,sourceLabelVerified,dispositions[]}；unknown 字段可空但必须解释。

**请求例。** `LOCAL intake({codeCommit:"a2b084d…", artifact:"courtwork-hpr-review.zip", expectedSha256:"<实际下载哈希>"})`

**错误与恢复例。** {code:"intake_hash_mismatch",action:"stop",installed:false}；找不到原 turn/attachment 时登记 inaccessible，不杜撰已消费。

**不变量。** 完整源文与附件不可由摘要替代；每个 HPRO 有唯一主位置和一个明确处置；每个实施项能回指原 HPRO。

**权限、缺席、取消、恢复负例。** 破损附件、同名不同字节、opaque citation、缺失原回复、旧本地 main、schema 同号冲突、仅 grep 到符号却声称完整读码。

**可执行接受。** 在下载包目录执行 python3 verify-package.py；在清洁 CODE checkout 用项目规定的 Node 版本执行 npm ci --ignore-scripts、npm test、npm run smoke（均在 app/）。记录既有失败与环境，不能把基线失败算本 PR 修复。 

**迁移与回退。** 无状态迁移。只保存 append-only intake；撤销候选映射不删除原附件。

**停线条件。** 任一输入身份不一致；本地代码已前进且未完成针对本包接缝的 diff；无法分清作者测试与独立接受。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P01 · MCP catalog 完整读取与失效边界

来源输出：HPRO-0008, HPRO-0020。Owner：本地后端唯一 writer。依赖：HPR02-P00。

**目标。** 在所用 SDK 的真实分页语义下，完整或明确失败地建立 catalog；不能发布截短的 healthy 结果。

**非目标。** 不加 OAuth、stdio、自动连接或新权限；不复制一套 MCP 协议。

**只允许路径。** `app/runtime/mcp-manager.mjs`；`app/runtime/control-plane.mjs`；`app/runtime/control-contract.d.ts`；`docs/runtime-control/api.md`；`app/tests/hpr_p01.test.mjs [new]`。

**实际依据。** C06 固定源码及 4 项隔离诊断；W03 legacy pagination；实际 2.0.0 SDK 的读取点须在本 PR 追加 pin/source receipt。

**接口／DTO。** 保留原 snapshot；可加 catalogCoverage{tools,resources,prompts:{complete,pages,count}}，是实时投影而非配置 revision。只有各声明能力完整后才 callable。

**请求例。** `POST /api/v5/mcp/local%3Ademo/lifecycle  {"revision":7,"action":"connect"}`

**错误与恢复例。** 沿现有 lifecycle error 返回，并给 catalog_incomplete/catalog_limit/catalog_cursor_cycle 的机器原因；工具不暴露，不把第一页称成功。

**不变量。** 单独端口/身份/配置 hash 绑定不变；同一连接的一组目录要么完整发布，要么 unavailable；重复身份、循环 cursor 和跨页超限拒绝。

**权限、缺席、取消、恢复负例。** 两页/空页/第二页失败、循环/重复 cursor、跨页重名、总量/总字节超限、取消前后、断连/配置变化、旧 late response；分别验证 legacy 和声明支持的 modern 路径。

**可执行接受。** 创建并执行 app/tests/hpr_p01.test.mjs，必须包含真实安装 SDK + loopback 两页 server fixture；参考函数测试可复用但不得代替这一项。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p01.test.mjs。

**迁移与回退。** 无需 RuntimeStore/Core 迁移；失败连接重新显式 connect，不能用旧缓存冒充新目录。回退不改变配置和正式状态。

**停线条件。** 无法确认 SDK 是自动归并还是逐页返回；不能绑定测试到锁定 SDK/protocol；只限制解码后对象却声称能防止传输分配过大。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P02 · MCP isError 的保守效果结算

来源输出：HPRO-0005, HPRO-0009, HPRO-0020。Owner：本地后端唯一 writer。依赖：HPR02-P01。

**目标。** 已 dispatch 的远端调用不能仅因 isError 被当作效果可忽略。复用既有 externalUnknown/notice/Run unknown，不新增大账本。

**非目标。** 不自动重试、代发消息、扩审批权限；不在本片宣布 BG-03 全部完成。

**只允许路径。** `app/runtime/mcp-manager.mjs`；`app/server/service.mjs`；`docs/runtime-control/api.md`；`app/tests/hpr_p02.test.mjs [new]`。

**实际依据。** C06 reported 分支；C02 externalUnknown 与 finalStatus 路径；evidence/baseline-mcp.tap 第二/第三项。

**接口／DTO。** onUnknown detail 增加精确 callId、server/tool、failureKind、effectCertainty:"unknown"；不包含 key、原始敏感参数或未经审查的远端异常文本。

**请求例。** `模型 tools/call 经原 ask 得到授权，调用结果为 {"isError":true,"content":[{"type":"text","text":"业务失败"}]}。`

**错误与恢复例。** 工具仍反馈受控业务错误；Host 标记 mcp_effect_unknown，禁止自动重发；取消确认不清除此事实。

**不变量。** dispatch 与工具完成/外部效果分别记录；只有可信、Host 强制的只读/效果证据可减少 unknown，不信任远端 hint。

**权限、缺席、取消、恢复负例。** 模拟先发生效果再 isError；传输丢失；尚未 dispatch 的本地参数错误；ask 拒绝/取消；onUnknown 持久化失败；模型想接着调用第二次；重启后仍不自动重发。

**可执行接受。** 创建并执行 app/tests/hpr_p02.test.mjs；在新的产品测试中导入当前产品源码，使用同一反例并断言 unknown/fence 必须触发；不得修改本包的固定基线原始探针，再验证 whole Run settlement 和重启 receipt。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p02.test.mjs。

**迁移与回退。** 沿已有 notice/status 结算，不迁 Core；旧 records 无效应证据时维持 unknown，不追写“确认无效果”。回退须保留新产生的 unknown。

**停线条件。** patch 放行“远端说 read-only”的工具；丢失原始 callId；UI 将 failed 和 safe-to-retry 合并；需要真实有副作用的服务才能测试。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P03 · Pi execution seam 提取，不换执行引擎

来源输出：HPRO-0002, HPRO-0004, HPRO-0005, HPRO-0016。Owner：本地后端唯一 writer。依赖：HPR02-P02。

**目标。** 隔离 Host 对 SessionManager/native handle 的直接使用，并将实际 capability/event 模式说清楚；现有 Pi SDK、provider registrations 和模型路由原样保留。

**非目标。** 不加第二 runtime、不重新实现 loop，不把 TypeBox/frontmatter 等成熟工具依赖的保留误判成必须全删除 Pi 包。

**只允许路径。** `app/runtime/pi-runtime-adapter.mjs [new]`；`app/runtime/pi-session-runtime.mjs`；`app/server/service.mjs`；`app/runtime/runtime-port.d.ts [new]`；`app/tests/hpr_p03.test.mjs [new]`。

**实际依据。** C02 direct SessionManager/import；C05 createSessionRun/native state/events；U01 显式 loader。

**接口／DTO。** ExecutionAdapter.openConversation/prepareRun → ExecutionHandle{nativeRef,run,interrupt,settled,capabilities}；ProviderDriver 独立 facet，Run 中现有 provider 身份不变。

**请求例。** `INTERNAL adapter.prepareRun({sessionRef,providerRef,inputSnapshotRef,tools,signal,onEvent}) → prepared handle；真正发请求仍在 install ownership 后 run()。`

**错误与恢复例。** {code:"unsupported_capability",capability:"steer",phase:"admission"}；native open 失败不能偷偷新开丢历史会话。

**不变量。** 一个 native journal owner；相同 user task/配置下提示 bytes、tools 顺序和 Run outcome 不变；primary event drain、sticky abort、usage 缺失口径保持。

**权限、缺席、取消、恢复负例。** 准备中取消；compaction 中取消；event persistence 失败；native history 不可读；累计文本被误拼接；连接 pending；不支持的 steer/fork；原 command 重试。

**可执行接受。** 创建并执行 app/tests/hpr_p03.test.mjs，包含旧/new facade 的 fixture request bytes 与事件/结算 parity；再运行 npm test 和 smoke。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p03.test.mjs。

**迁移与回退。** 纯提取不改 store schema、native journal 路径或 adapterId 的历史解释；可退回旧 façade。

**停线条件。** 必须升级 Pi 才能完成提取；改变 provider credential lane；出现第二套 transcript；需要先迁移数据；无法解释 wire diff。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P04 · Work application façade 与 Core-free Harness 构造

来源输出：HPRO-0002, HPRO-0003, HPRO-0005, HPRO-0006, HPRO-0017, HPRO-0019。Owner：本地后端唯一 writer；前端仍由原 writer 独立消费。依赖：HPR02-P03。

**目标。** 保留原完整应用入口/HTTP façade，增加不构造 Core 的 Harness；将 Work/Attention operations、角色文本、工具贡献放在应用组合侧。

**非目标。** 不迁移 SQLite，不改 Matter/schema/正式接受规则，不让 frontend 直接接 Core；不重命名已有 app/harness coordination。

**只允许路径。** `app/server/runtime.mjs`；`app/server/harness-runtime.mjs [new]`；`app/server/work-application.mjs [new]`；`app/server/service.mjs`；`app/runtime/extension-registry.mjs`；`app/runtime/control-plane.mjs`；`app/runtime/attention-tools.mjs`；`app/tests/hpr_p04.test.mjs [new]`。

**实际依据。** C01–03/C07–09 的实际依赖；S04、S10。尚未全文审计的 service 方法必须先列出并由本地 writer完整读取。

**接口／DTO。** ApplicationContribution{opaqueRef,context,tools,closeAdmission,finish,reconcile}；Core 缺席时贡献为空；正式 human decision 不属于 model tool port。

**请求例。** `INTERNAL createHarnessRuntime({dataDir,executionAdapter,application:null})；旧 createRuntime({...}) 仍提供原 service façade；已绑定 workRef 的 admission 需要可用 Work adapter。`

**错误与恢复例。** 未绑定 Chat 可用；绑定 Work 但 Core 不可用 → capability_unavailable/work_unavailable，返回恢复说明，不降格生成假 Work 成果。

**不变量。** 纯 Harness 构造和普通 Chat 执行没有 Core 构造/读库副作用；Work 仍单 owner；旧 HTTP shape 不变；permission、事件、human decision 所有权不变。

**权限、缺席、取消、恢复负例。** Core 构造/启动/读取失败但纯 Chat 正常；Work Run 硬失败；Core 缺席禁止接受动作；historical accepted data 独立读；晚到回调、取消与 Work finish失败；静态 import guard。

**可执行接受。** 创建并执行 app/tests/hpr_p04.test.mjs：禁止 Core import/constructor 的纯入口测试、旧 façade 与新组合 parity、Core-unavailable 隔离。先单提交提取 Work façade，再单提交 factory 切换；两提交各有绿测。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p04.test.mjs。

**迁移与回退。** 没有数据迁移。保留旧 façade 与目录；不得把运行模式变化当 archive/reopen。若实际文件清单明显大于允许范围，拆 P04a/P04b 并由唯一 owner 明确各自路径，不扩大为全仓重构。

**停线条件。** 需要改正式 Core schema 才能证明逻辑解耦；application hooks 获得裸 store 全量写权；纯入口仍 transitively 构造 Core；关闭失败时无条件释放仍有活跃 writer 的锁。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P05 · 实际 Run input 快照与历史解释

来源输出：HPRO-0005, HPRO-0010, HPRO-0016, HPRO-0018。Owner：RuntimeStore 的唯一后端 owner。依赖：HPR02-P04。

**目标。** 记录实际 system/tools/Host contribution 与 native ref，不再拿一段 compiler 字符数当全部输入。

**非目标。** 不保存第二份完整 transcript，不采集私有 chain-of-thought，不记录 credentials/authorization headers，不在 UI 展示未经授权的跨项目原文。

**只允许路径。** `app/runtime/run-inputs.mjs [new]`；`app/runtime/pi-session-runtime.mjs`；`app/server/service.mjs`；`app/server/store.mjs`；`app/runtime/control-contract.d.ts`；`docs/runtime-control/api.md`；`app/tests/hpr_p05.test.mjs [new]`。

**实际依据。** C03 bind/compile；C05 beforeInitialInput/session.systemPrompt；C13 historical runtime-context。

**接口／DTO。** RunInputSnapshot v1，细节见 contracts/ports.d.ts；prepared、submitted evidence 分开，historical 缺字段明确 partial。

**请求例。** `GET /api/v5/runtime-context?sessionId=SESSION&runId=RUN 增加 inputSnapshot 投影；请求仍用 x-work-token 和既有 session ownership。`

**错误与恢复例。** input_snapshot_write_failed → 不启动请求；context_snapshot_unavailable → 历史返回 partial/明确原因，不能按当前配置重建成“历史原文”。

**不变量。** 先 immutable blob 再发布引用；command receipt 幂等；native journal 唯一；快照的权限与 Run scope 一致；不可变对象与 current config 不混写。

**权限、缺席、取消、恢复负例。** blob写完 metadata失败、metadata完成前 crash、journal缺席、历史字段缺失、wrong session、key-shaped输入脱敏边界、取消先于提交、无 submitted证据、额外模型输入。

**可执行接受。** 创建并执行 app/tests/hpr_p05.test.mjs：实际 fake provider wire 对比、失败窗口、历史读取/隔离；要求准确区分 prepared/sent，不仅断言快照文件存在。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p05.test.mjs。

**迁移与回退。** 只有必要元数据触及 RuntimeStore；P00登记下一 schema，旧数据保留部分快照，绝不伪造。退回必须恢复完整对应版本备份。

**停线条件。** 每个 provider request 都复制整段历史当第二真源；快照错误还继续发请求；schema版本与其他在建PR冲突；含个人 key 的 evidence 被提交仓库。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P06 · 指令层次、冲突解释与 compaction 回归

来源输出：HPRO-0010, HPRO-0011, HPRO-0017。Owner：本地后端唯一 writer。依赖：HPR02-P05。

**目标。** 在现有 control 真源上形成明确 system/project/session/task 生效规则，并用快照证明作用，不按名词重造 prompt平台。

**非目标。** 不把来源/skill/网页当系统指令，不塞 Paper 全文，不承诺自动理解所有自然语言冲突；权限逻辑不改成 last-wins。

**只允许路径。** `app/runtime/control-plane.mjs`；`app/runtime/control-contract.d.ts`；`app/runtime/pi-session-runtime.mjs`；`app/server/service.mjs`；`app/server/work-application.mjs [new in P04]`；`docs/runtime-control/api.md`；`app/tests/hpr_p06.test.mjs [new]`。

**实际依据。** C02 hardcoded prompt/currentContext；C03 scope排序；C05 native输入；S08 D11。

**接口／DTO。** InstructionContribution{sourceRef,scope,placement,order,overrides?,authorityClass}；invocation 不持久伪装 workspace；已知结构化覆盖与自由文本解释分开。

**请求例。** `PUT /api/v5/runtime-control?sessionId=S  {"revision":7,"operation":"put","resource":{"id":"local:style","kind":"instruction","title":"写作","scope":{"type":"workspace","id":"P"},"content":"用中文并标明来源。"}}`

**错误与恢复例。** 原 409 runtime_conflict / active_run 保持；task层未知字段未获支持时400，不静默忽略。冲突文本未能机器裁定时返回解释状态而非“全部一致”。

**不变量。** 稳定配置字节稳定；Host permission ceiling 不被任何文字改写；active Run 不热改；历史快照不重算；注意全局 Attention agent scope 不应泄到普通workspace。

**权限、缺席、取消、恢复负例。** 相反 user/workspace/session要求；同级两个id；active Run修改；旧summary残留；compaction丢失动态context；外部skill尝试提升权限；相同配置重复Run前缀漂移。

**可执行接受。** 创建并执行 app/tests/hpr_p06.test.mjs：完整有效输入断言、前缀稳定、fresh/continued/compacted 3条路径与权限反例。若保持旧放置即可满足，则只补证据，不强迁 system section。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p06.test.mjs。

**迁移与回退。** 优先 additive projection，不移动旧 instructions。确需编译策略变化时增加 compilerVersion 和新Run绑定，不 retroactively改历史。

**停线条件。** 把字符数当token；只有模型答“我收到规则”而没有wire证据；对没有裁定的自由文本矛盾自动判冲突已解决；native必要prompt被删除。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P07 · 人维护的 scoped memory_text CRUD

来源输出：HPRO-0012, HPRO-0013, HPRO-0017, HPRO-0018。Owner：RuntimeControlPlane 唯一后端 owner。依赖：HPR02-P06。

**目标。** 实现普通文本 memory 的查看、编辑、关闭/删除和有界来源注入；复用已有scope/CAS/exposure，不另起memory数据库。

**非目标。** 不自动蒸馏整段历史，不允许模型直接修改永久偏好，不把 retained conversation 改称已验证事实，不注册尚不存在的外部memory provider。

**只允许路径。** `app/runtime/control-plane.mjs`；`app/runtime/control-contract.d.ts`；`docs/runtime-control/api.md`；`app/server/service.mjs`；`app/tests/hpr_p07.test.mjs [new]`。

**实际依据。** C03未实现的memory类型；C07历史读取；C12 planned row；S08/S10的memory分层。

**接口／DTO。** 新增 content kind memory_text；仅人维护。Control文件版本按owner显式升级（现有v1→候选v2），scope仍user/workspace/session，注入来源带hash/revision且为低权威背景。

**请求例。** `PUT /api/v5/runtime-control  {"revision":8,"operation":"put","resource":{"id":"local:writing-preference","kind":"memory_text","title":"写作偏好","scope":{"type":"user","id":"local"},"content":"优先使用自然连贯的中文。"}}`

**错误与恢复例。** memory_text_invalid/too_large、runtime_conflict、active_run；旧格式不兼容必须明确拒绝，不把未知类型跳过后称完整加载。

**不变量。** 正文可见可改可关闭；scope不会凭记忆跨越；关闭仅保证future injection off，须显式告知旧journal仍可能含内容；不自动建立Matter。

**权限、缺席、取消、恢复负例。** 过长/坏UTF8/空id/重复id/越scope/并发CAS、profile不包含memory、runtime_load意外加载关闭资源、控制面重启、oldhost打开v2、导出敏感正文误入公共日志。

**可执行接受。** 创建并执行 app/tests/hpr_p07.test.mjs：CRUD/重启/CAS/注入精确bytes/off后新snapshot无条目；不能仅测JSON保存。P08前不宣传clean-context遗忘。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p07.test.mjs。

**迁移与回退。** Control单文件升级；旧记录原样保留。第一次写新格式前有备份，旧host不得打开；Core数据库不变。

**停线条件。** 需要Core才可保存普通偏好；模型输出自动persist；off按钮宣称provider已忘记；摘要取代用户原文。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P08 · 显式 clean model context 与 native generation

来源输出：HPRO-0005, HPRO-0013, HPRO-0018。Owner：RuntimeStore 的唯一后端 owner。依赖：HPR02-P07。

**目标。** 给用户一个可验证的上下文隔离动作，避免关掉 memory 后旧journal/summary继续自动带入。Chat历史保留只读，模型使用新native generation。

**非目标。** 不删除provider数据/备份，不清除开放义务或unknown，不改CW Thread语义，不把跨Session恢复伪装BG-02旧失败链。

**只允许路径。** `app/server/service.mjs`；`app/server/store.mjs`；`app/server/index.mjs`；`app/runtime/pi-runtime-adapter.mjs [new in P03]`；`app/runtime/control-contract.d.ts`；`app/tests/hpr_p08.test.mjs [new]`。

**实际依据。** C05 persistent SessionManager/native context；C13历史binding；S10/S11continuity边界。

**接口／DTO。** ContextResetCommand{commandId,sessionId,expectedContextGeneration,acknowledgeContextReset:true} → receipt{newGeneration,nativeRef,historyCarried:false}。新HTTP route为本稿候选，不是现有API。

**请求例。** `PROPOSED POST /api/v5/sessions/S/context-reset  {"commandId":"reset-1","expectedContextGeneration":2,"acknowledgeContextReset":true}`

**错误与恢复例。** 409 active_run/context_generation_conflict/effect_reconciliation_required；准备新journal失败返回原receipt，原history不删除。

**不变量。** 相同commandId返回同receipt；新generation不自动继承旧messages/summary；旧Run仍定位旧journal；当前获授权Work引用可重编但不能漏开放义务。

**权限、缺席、取消、恢复负例。** reset重试、reset后cancel、两个并发reset、旧审批迟到、旧journal缺席、memory off成功而reset失败、unknown effect未清算、跨项目history混入、回滚到旧代码后读新schema。

**可执行接受。** 创建并执行 app/tests/hpr_p08.test.mjs；在旧journal和compaction summary中种入合成sentinel，reset后的实际fake-provider请求不得含该sentinel；旧history仍可按授权读取。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p08.test.mjs。

**迁移与回退。** 由同一owner分配Run/Session元数据版本；不搬旧journal、不覆盖原nativeRef。新generation orphan不代表命令成功，可安全登记待清理；回退靠完整停机备份。

**停线条件。** 仅添加一条“忽略旧memory”的prompt却宣称隔离；reset顺便重开Matter；未知效果被清除；无法证明新请求没有旧summary。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P09 · 受限 web_fetch 与版本化响应证据

来源输出：HPRO-0005, HPRO-0014, HPRO-0017, HPRO-0018。Owner：本地后端唯一 writer。依赖：HPR02-P05、HPR02-P06。

**目标。** 支持显式获准的HTTPS页面读取，且输出正文/来源/错误可解释；不复用inspect-only解析器偷偷发网。

**非目标。** 不加浏览器、JS、登录、cookies、POST/上传、任意headers或私网；不开放自动批量研究。

**只允许路径。** `app/runtime/web-fetch.mjs [new]`；`app/runtime/run-inputs.mjs [new in P05]`；`app/runtime/control-tools.mjs`；`app/runtime/control-plane.mjs`；`app/server/service.mjs`；`app/package.json`；`app/package-lock.json`；`app/tests/hpr_p09.test.mjs [new]`。

**实际依据。** C10/C13明确resolver无网络；C04当前URL资源还会落到*；U03/U04仅为工具/转换的局部donor。

**接口／DTO。** 新增网络工具 web_fetch{url}，配套只读 web_read{fetchRef,sha256,offset,limit}；web_fetch须Host mandatory ask并绑定规范化URL/参数，web_read仅可读当前session获准的既存来源、不再次发网。结果{fetchRef,sourceHash,observedAt,mediaType,text,nextOffset,coverage}。

**请求例。** `MODEL web_fetch({"url":"https://example.org/manual"}) → 原ask界面展示目的URL与外发语义；本次获准后GET并返回有界正文与source hash。`

**错误与恢复例。** network_denied、unsupported_url、redirect_rejected、response_too_large、unsupported_media、deadline_exceeded、cancelled；失败/截断不假称完整全文。

**不变量。** 默认不expose；expose也不绕过ask；目标与实际socket地址绑定；所有解析地址/跳转/解码上限受控；不执行远端HTML；原始bytes与转换投影分离；不自动进入Core。

**权限、缺席、取消、恢复负例。** DNS rebinding、IPv4映射IPv6、内网/metadata/loopback地址、非443端口、userinfo、重定向到私网、无限流/压缩炸弹、乱码、HTML脚本、网络批准后URL变更、cancel后响应、hash复用错页面。

**可执行接受。** 创建并执行 app/tests/hpr_p09.test.mjs；注入DNS/transport在隔离fixture测试禁网与边界，不访问真实内网或metadata服务；先固定新依赖integrity/license/source和安全测试，再验证实际Node transport。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p09.test.mjs。

**迁移与回退。** 复用P05的不可变input/evidence存储；新tool初始disabled。无Matter迁移。回退保留已有fetch refs可读，不凭原URL重新fetch补历史。

**停线条件。** 使用单次hostname黑名单或SDK默认redirect作为安全证明；未限制解码后body；用已解析的大buffer上限宣称流式内存安全；parser/地址分类实现未固定来源；测试需要个人认证。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P10 · 授权 workspace 下的 skill 检查与登记

来源输出：HPRO-0011, HPRO-0015, HPRO-0017。Owner：本地后端唯一 writer。依赖：HPR02-P06。

**目标。** 在已获准的当前workspace中显式发现/检查SKILL.md，确认bytes/hash后登记进原catalog。

**非目标。** 不扫描HOME，不native自动加载所有AGENTS，不clone/install，不执行scripts/assets，不让allowed-tools成为授权。

**只允许路径。** `app/runtime/skill-intake.mjs [new]`；`app/runtime/control-plane.mjs`；`app/runtime/control-contract.d.ts`；`app/server/service.mjs`；`app/server/index.mjs`；`docs/runtime-control/api.md`；`app/tests/hpr_p10.test.mjs [new]`。

**实际依据。** C03/C04已有parser/load；C05/U01关闭默认discovery；C10纯resolver语义不能悄悄改变。

**接口／DTO。** PROPOSED inspect-workspace{sessionId,rootRelativePath,maxDepth} → bounded candidates{path,sha256,metadata,diagnostics}；import-workspace带expectedSha256和control revision，重新检查相同字节后按原put发布。

**请求例。** `PROPOSED POST /api/v5/runtime-sources/inspect-workspace  {"sessionId":"S","rootRelativePath":"skills","maxDepth":2}；检查后用户再明确import。`

**错误与恢复例。** source_changed、path_outside_workspace、scan_limit、invalid_skill、runtime_conflict；失败不改catalog或permissions。

**不变量。** inspect≠install≠expose≠execute；登记的正文必须是人确认hash对应字节；既有Run仍按旧binding执行；metadata可信度不随本地路径自动升级。

**权限、缺席、取消、恢复负例。** symlink逃逸/循环、目录爆量、UTF8/YAML循环元数据、大小上限、扫描后换文件、同名skill来源冲突、activeRun改配置、恶意allowed-tools、inspect过程中取消。

**可执行接受。** 创建并执行 app/tests/hpr_p10.test.mjs，真实合成目录+symlink+并发替换；再测model只看catalog，调用runtime_load才得到准确正文。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p10.test.mjs。

**迁移与回退。** 优先原inline resource存储，无新canonical skill库。保留文件来源/hash字段；旧手动登记继续工作。移除当前skill不重写历史Run来源。

**停线条件。** 只能靠开启默认HOME discovery完成；inspect自动执行或安装；source hash只比mtime；registry增加第二份唯一本体。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P11 · 前端消费真实能力与有效输入，不新增权威

来源输出：HPRO-0010, HPRO-0011, HPRO-0012, HPRO-0013, HPRO-0014, HPRO-0015, HPRO-0017。Owner：既有前端唯一 writer；后端只维护冻结合同。依赖：HPR02-P06、HPR02-P08、HPR02-P09、HPR02-P10。

**目标。** 在现有Settings/Context界面消费scoped instruction/memory、skill/web能力与历史快照；不把后台半成品画成可用。

**非目标。** 不改全局token、sidebar层级或icon选型，不另造独立设置数据库、不跨owner改server/static allowlist。若必须新增静态模块，单列后台准入小提交，不扩frontend权限。

**只允许路径。** `app/web/runtime-view.mjs`；`app/tests/hpr_p11.test.mjs [new]`；`app/scripts/hpr-browser-gates.mjs [new]`；`engineering/design/hpr02-ui-consumption.md [new]`。

**实际依据。** C12现有controller/scope/activeRun文案；C13typedAPI；P05–P10接口冻结稿。

**接口／DTO。** 只读snapshot驱动。表单draft与保存revision分离；current/next/historical、prepared/sent、off/reset-pending/reset-completed明确不同。

**请求例。** `使用原GET/PUT runtime-control与runtime-context；context reset、skill inspect只在capability声明supported且后端已交付时出现动作。`

**错误与恢复例。** 409后刷新但保留draft，不自动重试；404/unsupported显示不可用，不画假开关；reset失败保留“注入已关、上下文未隔离”。

**不变量。** backend权威快照决定有效状态；旧Run来源不按当前配置重算；keyboard/focus可达；同一套control grammar；scope切换late reply不污染当前界面。

**权限、缺席、取消、恢复负例。** 连续切scope晚响应、activeRun保存、cancel等问人、source失效、missinghistorical字段、memory关闭再reset失败、未知工具、窄屏/200%缩放、键盘focus。

**可执行接受。** 创建并执行 app/tests/hpr_p11.test.mjs；创建 browser gate runner并执行 node app/scripts/hpr-browser-gates.mjs --case-set hpr-p11 --require-all。该脚本为待建验收物，须复用现有browser依赖并拒绝零用例/skip冒绿。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p11.test.mjs。

**迁移与回退。** 保留既有UI偏好键和当前组件体例；无domain迁移。老后端时退回原只读/planned形态，不把本地偏好当新能力。

**停线条件。** 后台尚未交付就使用hardcoded样例冒真实状态；必须大改全局设计才能加入两个局部；新静态路径未经后台owner准入；浏览器runner只截屏不检查状态/交互。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。


---

## HPR02-P12 · 自足节点、恢复/备份反例和独立接受

来源输出：HPRO-0001, HPRO-0005, HPRO-0006, HPRO-0016, HPRO-0018, HPRO-0019, HPRO-0021, HPRO-0022, HPRO-0023, HPRO-0024。Owner：独立验收者；实现作者只修其明确负责的失败。依赖：HPR02-P11。

**目标。** 以有限支持范围冻结一个可用节点；全量回归、取消/重启/拒权、备份恢复和同任务证据分开归档。

**非目标。** 不以合成测试宣称真模型质量、PMF或跨周收益；不因验收困难换runtime/Rust；不拿旧作者回执当本次独立签字。

**只允许路径。** `app/tests/hpr_p12.test.mjs [new]`；`app/scripts/hpr-browser-gates.mjs [new in P11]`；`evidence/hpr02-p12/** [new]`；`engineering/execution/hpr02-stable-node.md [new]`。

**实际依据。** S01/S11/S14；本包HPR-03；C01/C09关闭链和原锁依赖。

**接口／DTO。** GateReceipt{codeCommit,dependencyLock,platform,fixtureHashes,caseIds,rawResults,author,reviewer,realProviderRun,knownFailures,scope}。缺项必须not-run/blocked，不是pass。

**请求例。** `LOCAL stable-node verification on a clean checkout and isolated temporary dataDir；用户另行明确授权后的单次真实provider运行另附receipt。`

**错误与恢复例。** gate_incomplete/unsupported_environment/recovery_failed；任一权威、越权、未知效果重放失败都不能用平均分抵消。

**不变量。** 同command不重复执行、旧审批不漂移、cancel不伪回滚、Core缺席pureChat可用、正式成果跨runtime缺席仍在、恢复不清除开放义务。

**权限、缺席、取消、恢复负例。** 断电宣称与SIGKILL区别；kill每个命名写窗口、shutdown不确定时锁释放、Core startup中cancel、nativejournal缺失、partialprovider config、完整备份丢一类文件、实际路径不匹配。

**可执行接受。** 在合格Node环境 app/ 内 npm ci --ignore-scripts、npm test、npm run smoke；运行新增 hpr_p01…hpr_p12 文件且逐一存在；运行 node app/scripts/hpr-browser-gates.mjs --case-set hpr-stable --require-all；恢复测试使用同一可恢复路径的合成dataDir，不碰个人目录。 通用单测命令见 HPR-02-work-orders.md；本单新文件为 app/tests/hpr_p12.test.mjs。

**迁移与回退。** 先停机完整备份并确认所有writers退出；恢复旧代码/完整对应数据。真实凭据只在用户设备授权流程，不进入仓库。按产品范围保留或收窄兼容声明。

**停线条件。** 没有独立验收身份；真实provider运行未经授权；任何硬门失败；试图以mock成功关闭G1–G5；需要搬迁绝对路径才可声称恢复成功。

本单完成不代表整个 HPR02 或稳定节点接受。回执必须有实现 SHA、原始测试输出、失败/未跑项和独立复核关系，并回填上述 HPRO 映射。
