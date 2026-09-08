# 必要自研 PR 切片

状态：Astra 编写的本地 PR 说明与施工候选；尚未建立 GitHub PR，也未实现以下功能。每单以当时 HEAD 重新核对接缝与正在施工的文件，不能把本研究基线当永久施工基线。总裁决见 [README](README.md)，实验门见 [validation](validation.md)。

用户本轮要求将 Chat/index 消费为真实本地计划，以 SE 验证为主；Luna 承担 explore、外部溯源与只读 diff，Astra 承担架构与必要自研。每个实现 PR 开始时，先由 Luna 对该局部的成熟实现和本地差异做有界核验；只有已有 evidence 因版本/需求变化失效时才重开研究。Astra 实现后由 Luna 独立检查；前端沿当前单一 writer 合流机制，不占用活动 Work Surface Kit 文件。

## H0 · 固定 NDA 验证契约与对照

**PR 标题：** `docs: define bounded NDA review experiment and acceptance evidence`

给定固定的 inbound NDA、交易事实、合成 playbook 和 fallback，系统应产生逐规则候选与未决事项，并能让 Reviewer 追溯来源。本单将这些输入、gold、错误类型与配对对照固化，防止 demo 成功后再改评价标准。

- Owner：Astra 编写语义契约；Luna 检查规则/证据与 Paper 映射。文件责任为本研究目录和随后选定的合成 fixture 目录。
- 复用：现有 Core/Work API 契约、RD-002/003 与规则审阅实践；Paper 采用版本保持 9.3，9.6 候选作为单列差异输入。
- 最小新增：输入完整性、逐规则状态、evidence 绑定、proposal 与 Decision 后果；不定义通用 Expert SDK 或全字段 manifest。
- 验证：第三人只读 fixture 可手工推出预期结果；完整覆盖和“未找到”有不同例子；评价门在跑模型前固定。
- 退出：若不能形成可判定的 gold 和边界，缩小规则/文档类型。未满足前不靠实现猜规则。

## H1 · 将既有领域提交链接到 NDA 的最小工作契约

**PR 标题：** `feat: expose version-bound NDA candidates through the existing domain action path`

现有 evidence-memo 已实现 SQLite Matter/Candidate/Artifact/Decision/Audit/Evidence、CAS 和幂等 `trusted_decide`；这些不是本单从零建设的功能。本单把已有提交链用于 H0 的 NDA 数据与合法动作，补齐逐规则契约、编辑产生新候选的路径，以及可供 Review 读取的 packet。session 结束后仍可恢复、重复请求只产生一个正式效果，是继承并复核的门。

- 依赖：H0；本地 seam map 指定的既有 domain owner。实现前须确认事务 State 与审计事件的权威关系，不能把 runtime trace 升格为正式状态。
- Owner：Astra；起点为 `app/extensions/evidence-memo/core/`、`bridge.py`、`index.mjs` 与 `app/server/service.mjs` 的既有 action 调用边界。是否需要抽出可复用模块由实际依赖决定，不预先重写 Core。独立合成数据测试，Core 不依赖 Pi 或 UI。
- 当前接缝：host 用 extension-specific `/sessions/:id/actions` 执行 mutation，用 `/sessions/:id/surface` 返回只读投影；没有通用 Matter/Review HTTP API。优先分别在这两个既有入口扩展 typed domain action 与 read projection；不把 query 写成现成的 action POST 能力，通用端点也不是本单必需产物。host inspector 的 `Artifact` 是运行内容版本，并不代表领域已接受成果，响应必须明确区分。
- 新增行为：NDA per-rule payload、可追踪 finding/unresolved/evidence、编辑形成新候选、Review packet/合法动作查询。继承门：可信人机请求绑定 Candidate/base version；幂等键绑定内容；过期版本冲突；模型无 approve 能力；原历史仍可追溯。现有开发 Core 的通过不自动证明生产身份、通用多租户或新的 NDA 语义。
- 验证：现有相关回归，加重复/异内容、过时决定、伪造 Reviewer、响应丢失、重启与替换 session 的必要反例。未实现事务/权限前不给 UI 正式接受动作。
- 回退：关闭新 mutation 入口并保留只读历史；有 schema 变更则先备份，以已验证的恢复路径回退，不让旧 host 读升级后的数据。

## H2 · 用现有 profile / trusted extension 跑 NDA 顺序审阅

**PR 标题：** `feat: execute bounded NDA review through the existing agent runtime`

激活首方 NDA 配置后，通用 runtime 按规则产生可检查 finding、bounded proposal 和 unresolved。遇到缺规则或未知事实保留缺口，不能偷偷联网或直接改正式成果。

- 依赖：H1。复用 Pi loop、现有 resource/profile/extension、admission、execution policy、模型路由和显式资源加载。
- Owner：Astra；只在现有 extension/domain/tool adapter 接缝加 NDA 资源与薄适配。禁止新建法律专用 loop。
- 最小行为：run 固定 Contract/playbook/source/profile 版本；局部重跑生成新候选，不覆盖人已裁决的事实；规则覆盖、证据定位、fallback 插入与冲突检查尽量用确定性代码。
- 已有 evidence-memo 工具只有 `se_read_source` / `se_submit_candidate`；NDA playbook、逐规则 finding、unresolved 和 reconciliation 是本单新增的领域资源/适配，不能被控制面现成资源目录代替。
- Scope：仅实现本地已有的 session/run 绑定与真实 Matter 引用；不建立 index 全部 global/user/workspace/project/matter/session/run 七层制度。
- 验证：同一 runtime 两个 session 只有 A 附带 NDA；B 无此能力；直接调用被禁能力仍拒绝；unknown 保留；取消后的迟到结果不自动接受；mock 与真实 provider 分开。
- 回退：禁用该首方 profile/extension，已有工作状态仍可读。模型质量不足时缩窄规则范围或仅提供 evidence 候选，不自动升级到远程模型。

## H3 · 为同一 Work state 提供 Review 与历史 fallback

**PR 标题：** `feat: project reviewable work with a durable fallback view`

用户可从紧凑摘要打开同一候选的规则、来源、差异和合法动作。renderer 缺失时仍能读取已产出状态及裁决，不能出现空卡或错误的可操作按钮。

- 依赖：H1 的真实 Work API；可使用 H2 的固定 fixture，不必等真实 provider 才开发投影。
- Owner：Astra 定后端 query/action 契约；前端按既有 Claude 单一 writer 机制消费，Luna 独验。
- 复用：Work Surface Kit 的通用 anatomy/store/组件与当前 renderer 机制；只在必须时增加最小显式 type 映射。WK3/WK4 仅处理 permission/question/outcome，其权限批准不等同于成果接受；本单不能静默扩大那些工单范围。H3 必须另出依赖 H1 的 Core/domain 契约和前端工单，不能借 WK3/WK4 的冻结或验收宣称 rule/source/diff/Decision fallback 已交付。活动 WK 文档状态以实际合流后的 SHA 重新确认。
- 最小行为：inline/detail 从同一版本快照读取；后端按可信 actor 与版本重新验证 action；fallback 保留原内容、类型、来源、rule、producer/playbook/schema/source 版本、Decision 及 artifact 引用。
- 验证：无 runtime 的 fixture 可呈现；renderer 缺失可读；过期页面、断线、重复点击不会造成不合法状态；前端失败不伪装成后端失败或成功。复用已有键盘/宽度/主题回归，新增测试只覆盖受影响动作。
- 回退：移除富 renderer，保留 host-owned fallback 和 Work API；缓存可丢弃重建。

## H4 · 按真实缺口完成卸载、重装与兼容验证

**PR 标题：** `fix: revoke executable contributions while preserving reviewed work`

停止或卸载 producer 后，新 run 不再取得它的可执行能力，已裁决工作仍可恢复。v2 安装不静默改写 v1 的历史结论。本单由 H2/H3 的失败用例驱动，已有 lifecycle 通过时允许只交验证回执，不为 PR 编号造代码。

- 依赖：H2、H3；当前运行中配置冻结/next-run 绑定继续生效。首版卸载可要求 active run 结束，不承诺 mid-run live swap。
- Owner：Astra 修改现有 extension lifecycle / control-plane owner；Luna 对清理、scope 与历史状态独立验证。
- 复用：上游 owner/disposer 机制作为局部参考；只有重复注册无法由既有 owner 管理时才引入最小可逆 registration primitive。不得替换执行宿主来获得热插拔标签。
- 验证：重复 enable/disable、run 中变更、部分初始化失败、host/client 缺席、重启恢复、不兼容 schema 的只读行为，以及旧数据不因卸载删除。rollback 不等于 schema downgrade。
- 回退：保留静态 preset 与 next-run 激活，暂停动态代码加载；由现有机制安全拒绝不支持的操作。

## H5 · 真实配对评测与可分发性裁决

**PR 标题：** `test: record paired NDA governance and recovery results`

H1–H4 的确定性探针通过后，按 H0 冻结条件运行现有基线与 NDA 纵切，记录错误类型、恢复能力、Review 负担和维护成本。结果可能支持继续，也可能要求删除局部抽象或缩小场景。

- Owner：Luna 收集独立执行证据，Astra 判断支持范围；真实专业审阅不由工程 agent 冒充。
- 真实模型沿用户 Web UI 配置路径；授权或 provider 尚未就绪时证据列 `not_run`，不阻塞独立 fixture 工作，也不关闭真实链门。
- 第二 provider 仅在 policy 和真实需求允许时进入；本地/私有部署不自动证明零外发。模型请求和工具请求必须分别验证路径。
- 交付：固定实现 commit、corpus hashes、配对结果、失败归因、成本、剩余未决、保留/缩小/停止裁决。若有泛化观察，另行生成最小 Paper Index 候选。

## 条件性后续 PR

| 触发证据 | 下一个局部 | 必须先消费的成熟实践 | 停止条件 |
|---|---|---|---|
| 顺序规则审阅主要瓶颈确为 latency/context contention | scheduler + 隔离候选 + reconciliation | Harvey 规则 worker/branch/reconcile；现有任务执行原语 | 吞吐改善伴随错误裁决或大幅复杂化 |
| 真实 consumer 需要远程持续专业任务 | 有版本的 remote-task adapter | 实际协商的 MCP Tasks 或供应商 job API | 当前 transport/服务不支持时不伪造协议能力 |
| 第二 Expert 暴露重复装载/版本问题 | 最小 package contract | Cordis/Pi 的实际 API 与现有 registry | 仍只有一个 consumer，不发展 SDK/marketplace |
| PDF/DOCX 成为实际输入/交付要求 | parser/anchor/export adapter | 成熟解析、diff 与文档库 | 无代表文档与保真评价，继续文本 v0 |

每个新依赖都记录固定版本、许可证、升级成本与可退出路径；只借鉴机制不必增加依赖。自研优先留在 Work Contract、证据/版本绑定、可信 Decision 和经过实测仍缺失的投影边界。
