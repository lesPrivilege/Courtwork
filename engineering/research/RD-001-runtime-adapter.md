# RD-001 · Runtime 适配与执行边界

状态：experimenting；零付费局部验证。方案与架构：Astra；v3作者：fresh Luna runtime_author / opencode_surface；独立复核：runtime_review / opencode_surface / Astra，具体作者与Reviewer在各报告分列。历史角色保留在旧报告中；正式技术采纳尚未完成。

## 问题与候选

比较 OpenCode 发行版 Server/SDK 与 Pi coding-agent SDK，判断单个 GUI 闭环需要补多少适配、持久化和权限工作。DeepSeek Harness 为第二轮插件接口对照。来源见 [快照](../ecosystem/2026-09-05.md)、[Courtwork 索引](../ecosystem/local-sources.md)；不把 OpenCode dev/V2 规范混入发行版通过记录。

候选稳定接口：start/resume、submit、cancel、observe/status、question/permission reply、capability description。steer、历史重放、pending 恢复和热卸载可以声明不支持。Work Core 只接收运行观察与 Candidate，不接收宿主对象作为正式 State。

## 开工前固定

每个候选的发行版本、commit、SDK 版本、许可证范围、启动环境；工具执行模式；一套确定性 fake provider/工具；一套真实 provider 的单次预算与退出上限。先无模型对照，再单独真实链验证。先做只读工具，不调用外部不可逆服务。

## 最小实验

| 环节 | 操作与反例 | 通过条件 |
|---|---|---|
| 请求与工具循环 | 合法两步调用、非法参数、provider 错误和超时 | 可关联事件，错误不显示成功；工具 schema 与执行准入一致 |
| Cancel / 队列 | 在流中、工具运行中、轮次间取消；插入 steer/follow-up | terminal outcome 明确；列清已发生/未发生/未知效果；进程退出可观察 |
| Context | 注入固定约束，压缩并换 Session | 约束、否定、来源可恢复；宿主不支持编译入口则记录阻塞 |
| Session / 重连 | 断开 GUI、重启 runtime、重复 resume | 不重复工具效果；pending 无法恢复时明确中断，不静默批准 |
| 权限 | deny、无 answerer、重复/过期 reply、跨 Run reply | 默认拒绝或中断，不串联授权；tool allow 不转换 Artifact 状态 |
| 插件 / 版本 | Run 间卸载、缺失依赖、版本不兼容 | 无重复注册；不能热卸载则声明需重启，正式 State 不丢 |
| 隔离 / 预算 | 受限工具触达正式存储、长任务超限 | 正式写能力不可达；付费/执行前限制有效，取消不只改变 UI |

## 比较与裁决

记录适配代码责任面、需自建能力、上游内部依赖、失败可诊断性、每次升级预计动作与未知成本。不以 API 数量排名。若必须 patch 核心才维持语义，先缩小能力或改用另一候选。

支持 [DEC-002](../decisions.md)；通过只能采纳测试版本的一条集成路径。上游替换、升级或模型变化按实际影响重验。

## 证据与未完义务

固定版本及执行记录见下文。实验目录为 `<isolated-checkout>/runtime/`；未建立正式产品应用，真实 provider 预算仍为 0。

## 2026-09-05 · 固定源码筛选

[MVP02证据卡（历史路径：`../mvp/execution/runtime-evidence.md`）](../migration/2026-09-08/evidence-index.md) 与 [固定commit/归档hash（历史路径：`../mvp/execution/runtime-sources/README.md`）](../migration/2026-09-08/evidence-index.md) 已交付初稿，尚在独立复核。Model API / SDK / App Server / Core分层；Pi无OSsandbox不能在只考察恶意模型JSON的边界下自动淘汰，须与其他候选同样测实际模型可达工具。没有实际Runtime运行PASS，真实provider预算仍为0。

### Probe调试阶段的待复验项

Astra读取Pi debug-output，发现当前工具集仍为内置read/grep/find/ls，不能据此认为只有批准Source可读；需自定义受限工具及越界路径sentinel反例。另south Session记录的systemPrompt出现north Matter标记，现有cross-Matter布尔检查不足以覆盖实际整体输入。已回交作者纠正并保留失败；该调试输出不构成P2/P5通过，最终须冻结新配置由独立Reviewer检查。

## 当前冻结作者结果与独立边界

[运行记录（历史路径：`../mvp/execution/runtime-experiment.md`）](../migration/2026-09-08/evidence-index.md) 已固定 Pi 0.83.0 的真实 AgentSession 与本地 fake provider，作者报告仅批准的两个工具、完整跨 Matter context、取消及错误路径通过。前述调试缺陷已经更换配置修正，须由独立 Reviewer 重跑才可关闭对应项。OpenCode SDK 1.15.11 的 fake HTTP/SSE 路由已有独立重跑；没有真实 Server/Runner 的能力不能从 SDK 路由推出。正在临时目录尝试固定版本二进制与本地 fake provider，未付费、未改全局环境。

## 真实运行时独立结果

[独立报告（历史路径：`../mvp/execution/runtime-independent-review.md`）](../migration/2026-09-08/evidence-index.md) 已重现Pi工具目录/资源关闭、流与工具取消及fake错误；额外三项绑定反例暴露Adapter stub缺陷，已由冻结共享module修复并独验6/6。OpenCode固定1.15.11 standalone已独立运行，4次本地fake provider请求重现权限拒绝、持久化中止错误及重启后Session可见。其model tool list仍含bash/edit/write等，不能把人工reject当作已限制工具表面。详见[能力矩阵（历史路径：`../mvp/execution/runtime-capability-matrix.md`）](../migration/2026-09-08/evidence-index.md)及[待验证Adapter草案（历史路径：`../mvp/execution/runtime-adapter-v0.md`）](../migration/2026-09-08/evidence-index.md)。07仍未关闭：真实provider、宿主pending、迟到Candidate、预算执行等边界未完成。

Pi v2修复通过仅关闭三项已知stub绑定缺陷；它仍返回模拟pending而未连接Core。当前建议将Pi保留为受限嵌入切片的优先研究候选，OpenCode作为服务化对照；这是基于已测工具边界与宿主责任的局部推荐，不是DEC-002正式采纳。可复跑产物已归档到[Runtime包（历史路径：`../mvp/execution/archives/runtime-probes-v2.tar.gz`）](../migration/2026-09-08/evidence-index.md)与[manifest（历史路径：`../mvp/execution/archives/runtime-probes-v2.json`）](../migration/2026-09-08/evidence-index.md)。

## v3 续行：OpenCode工具表面

[作者（历史路径：`../mvp/execution/opencode-surface-v3.md`）](../migration/2026-09-08/evidence-index.md)使用固定1.15.11官方top-level permission deny-all并仅allow两个custom工具；[Astra独验（历史路径：`../mvp/execution/opencode-surface-v3-review.md`）](../migration/2026-09-08/evidence-index.md)三次66/66、33个真实Server→fake provider请求，工具集合始终仅read_source/submit_candidate，合法工具完成，三个未知/危险名称持久拒绝。该配置无需增加第二agent配置，C2未运行；本轮B0默认对照未收齐请求，不作为有效消融。因此工具表面缺口局部关闭，不宣称全局最小配置。

此结果改变候选比较的依据：不能继续以OpenCode只能人工reject危险工具为理由偏向Pi；两个候选在特定配置下均有受限工具证据。OpenCode自定义工具仍为合成stub，管理路由、Core联接、生命周期与真实provider不因此通过。完整源码/fixture/结果已[归档（历史路径：`../mvp/execution/archives/opencode-surface-v3.tar.gz`）](../migration/2026-09-08/evidence-index.md)，附逐文件manifest。

Pi→Core独立批次正在验证，预算/内部循环上限的第二批计划已独立准入。新Assignment见 [续行v3（历史路径：`../mvp/execution/continuation-assignment-v3.md`）](../migration/2026-09-08/evidence-index.md)。

## v3.1 Pi→Core局部联接与删减裁决

[独立报告（历史路径：`../mvp/execution/runtime-core-v3-review.md`）](../migration/2026-09-08/evidence-index.md)绑定Pi0.83.0、Core原v2、JSONL bridge和v3.1 runner `3c44c319…`。v3.0/v3.1综合harness三次各58/59；保留的一项失败是外层prompt计数不能覆盖SDK内部provider回合，不能将总计写为全通过。v3.0的abort异常仍返回cancelled缺陷在独立v3.1两行修复，三次错误注入均返回unknown且关闭准入。真实Pi/bridge/SQLite已进入工具的cancel竞态独验三次各9/9，无Candidate/Artifact/Decision增量。ControlledBridge只作调度顺序证据，真实联接结果分列。

Astra局部实验裁决：优先使用v3.1的 `contextBinding:false,eventTrace:false` 删减配置，保留Core固定trusted Context与最终串行准入。三次复验表明Adapter重复身份检查及自建trace在这些正常/跨界/取消门槛下可删；实验源码保留flags作为对照，不是产品默认栈采纳，也不是全局最小方案证明。Core B0保存pending不改变正式成果；提交接受仍归可信Reviewer。

[可复核归档（历史路径：`../mvp/execution/archives/runtime-core-v3.1.tar.gz`）](../migration/2026-09-08/evidence-index.md)包含源码、fixture、实际DB、独验及失败记录，附逐文件manifest。首批预算/时限未成立，第二批另验；[组合义务（历史路径：`../mvp/execution/runtime-integration-obligations-v3.md`）](../migration/2026-09-08/evidence-index.md)包括终态封闭、预算触发时Core拒收、SourceSet/contract变化和恢复，不从分开测试推定组合成立。

## v3.1 provider守卫独立结果

[独验（历史路径：`../mvp/execution/runtime-budget-v3-review.md`）](../migration/2026-09-08/evidence-index.md)固定Pi0.83.0与wrapper `1c91b456…`：三次重复33个scenario、393/393个逐结果检查通过。单prompt内部第4次底层callback被调用前阻断；合作fake provider实际收到deadline AbortSignal并结束，不合作的底层状态保留unknown，wrapper只关闭自己的观察流。三项单独消融出现第4次callback、无超时abort、未批准callback，支持在当前输入/三次重复内保留这三项局部守卫。

独立未知model反例先使旧v3.0失败：特判sentinel id不能表示“仅允许fake_local”。v3.1改为id/provider/api的明确白名单；实际Pi未知id和错误api各3次、直接guard错误provider/api各3次均callback=0。旧失败包保留；不以固定sentinel正例替代一般准入检查。这里的预算是本地调用选择规则，不证明第三方费用估算、凭证预检顺序或真实provider合作停止。[源码及独验归档（历史路径：`../mvp/execution/archives/runtime-budget-v3.1.tar.gz`）](../migration/2026-09-08/evidence-index.md)附逐文件manifest。

Core gate与provider wrapper分开成立仍不足以关闭07。已派发runtime-combined-v3在同一真实Session组合检查正常/预算/超时终态、迟到拒收、旧新Run与可信输入更新，以及snapshot-only恢复；真实provider与Design/Review汇合仍未准入。

## 2026-09-19 · Orchestra direction disposition

[The Local Agent Orchestra ruling](architecture-node-2026-09-13/orchestra-direction-20260919.md) adopts this RD's candidate lifecycle as the minimum Runtime Port vocabulary: `describe/admit binding`, `start/continue`, `observe/recover`, `reply/tool-result`, `interrupt/cancel`, and `dispose`. This reuses the existing candidate contract; it is not a competing DTO and does not claim that every candidate supports every operation. Host owns CW Session/Run, admission, permission intersection, effects, receipts, and unknown outcomes. The Adapter owns faithful native translation and reports native-only capability without inventing a portable scheduler. A real second-runtime consumer, rather than file shape, triggers extraction of the current Pi `SessionManager` dependency.

## v3.1 同Session组合结果与剩余门槛

[组合独验（历史路径：`../mvp/execution/runtime-combined-v3-review.md`）](../migration/2026-09-08/evidence-index.md)明确区分旧版 `194a4e54…` 的24次功能检查和新版 `ef43baee…` 的15次修复/回归、9次消融。旧版的assistant error不抛prompt异常时误报completed已被独立3次反例否定；新版读取最后assistant结果后报告failed，保留迟到拒收。实际Pi工具entered→关闭准入→barrier释放→同工具被拒，SQLite无新增Candidate/Artifact/Decision，新进程open_store snapshot一致。非合作底层仍unknown，不以Session.abort返回替代底层终止证据。

组合三项删除对照各3次：删除call guard出现5次底层callback，删除deadline guard无abort且底层持续至少160ms，删除budget guard出现一次本地sentinel callback。支持在该固定输入内保留这三项守卫；没有证明全局最小方案。可信source/contract更新是在关闭旧Run后做宿主fixture事务，非Core save自带动态失效，也未验证任意并发外部更新。

[归档（历史路径：`../mvp/execution/archives/runtime-combined-v3.tar.gz`）](../migration/2026-09-08/evidence-index.md)保留初始失败与独立反例。原计划两轮调试后追加一次独验缺陷修复，由Astra明确限额，本批到此停止修复；不能宣称原计划轮数完全未变。07继续等待真实provider和11/12工作路径对unsupported能力的裁决，DEC-002仍proposed。

## 2026-09-20 · Local CLI and Settings consumption

Astra's [local-runtime ruling](architecture-node-2026-09-13/local-agent-runtimes-20260920.md) consumes Luna's installed-interface, first-party ecosystem and CC Switch reports. Use upstream-maintained executors through versioned adapters, with bounded-job and managed-session capability levels; extract the existing Pi lifecycle coupling only for a real second consumer. Exact native identity, pre-launch intent, structured observations, enforced permission mapping and cancellation/recovery evidence remain the adapter boundary. CC Switch informs the existing Provider control plane, not runtime orchestration. Target Settings groups Agent profiles and Runtimes under Agents, while Models retains provider configuration and Developer retains diagnostics. This records direction only, preserves P03/DRT-03 ownership and the authorized post-Claude integration/cleanup order, and adds no runtime support claim.

## 2026-09-20 · Multica adapter reference

The [Multica consumption ruling](architecture-node-2026-09-13/multica-consumption-20260920.md) fixes upstream `8c4f4328` as a behavior/compatibility reference for native CLI adapters, session/config injection and process observations. Map its machine-plus-tool Runtime into CW Environment and executor binding separately; its agent-provider registry is not CW's model Provider plane. Reuse failure cases through the existing Runtime contract, not a copied daemon or broad CLI support claim. The upstream license has additional conditions, so this registration imports no source. The P03/DRT-03 order and installed-version evidence requirements remain unchanged.

## 2026-09-21 · P03-B implementation dispatch

The [bounded next assignment](../execution/claude-frontend-harness-2026-09-16/next-dispatch-20260921.md) names Sonnet for the actual-source map and Fable for extracting the current Pi execution/session port, with Codex architectural and independent acceptance ownership. Existing agents-api-adapter/contract protocol fixtures are consumed as delivered; no new live support is claimed. Host admission, tool governance, effect settlement and persistence authority remain unchanged. This disjoint backend lane may proceed alongside the current frontend author; no competing service writer or SDK upgrade is admitted by the scheduling change.

## 2026-09-21 · P03-B accepted

[Independent evidence](../execution/claude-frontend-harness-2026-09-16/evidence/p03b-pi-runtime-port-review-20260921/README.md) accepts `c2be594`, merged `e2eaf6d`. Pi executes through the explicit port; Host status/governance and journal/schema identity remain unchanged. This consumes the bounded dispatch, not a second-runtime support claim. D1–D5 and remaining Provider/observation coupling are recorded for the existing P03-C consumer.

## 2026-09-21 · P03-C first increment ready

[The finite Fable transport order](../execution/claude-frontend-harness-2026-09-16/p03c-agents-transport-20260921.md) consumes the existing Agents protocol adapter. First increment adds the actual SDK transport and synthetic wire evidence, with no live exposure or Host/schema mutation. Remote binding and one governed read-tool consumer follow under this RD and the original Store owner; current Pi `{id,path}` must not be reused as a remote locator.
