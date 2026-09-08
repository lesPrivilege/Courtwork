# EX-WK6 · DeepSeek Harness 插件系统与 web UI 溯源

状态：`带溯源索引`。Sonnet，只读 explore，2026-09-09。

只读声明：本卷全程只读本地 `motto-dsh` 检出与 Courtwork-fresh 内的工单/裁定/转录文件；未修改任何文件（本文件本身除外）、未执行任何状态变更类 git 命令、未启动任何服务、未读取任何凭据文件。全部转录值已在下表给出 file:line 或原文短引（≤15 词，已标注出处），不整段复制源码。

来源文件与 sha256（本卷依据的工单 / 体例 / 裁定 / 转录文件，均只读）：

- `work-orders/EX-WK6-dsh-plugins-webui.md` · sha256 `7f215f23fc0daad9875b6a26b4cc98f0c85376b741059c75a39dcee872e67bf5`
- `handoff-convention.md` · sha256 `7ab1df384a41845cb3378a45a711fa5d7cf13d781841fed1c6aa9b44e6285084`
- `intake-round-2.md` · sha256 `40f9b6b7adc06184bd0c2256a019cbb1d0a96d54f29ad36a877d814f91cba562`
- `inputs/runtime-workbench-discussion-2026-09-09.md` · sha256 `9797eb3b736e0a578fcb40cc5f93de0d1cf65885e1a158b1bc67e6b64a0f6f25`
- `~/.pi/agent/skills/deepseek-harness/SKILL.md` · sha256 `57a8b8b8004f66edfbb563fa1d90fb8e8af960cbaadb83404778b3c91e063778`（只读其索引/派发表以确认它把插件、preset、inspect、web UI 的文档定位在 `docs/subsystems/*` 与各 package README，未套用其模板到本仓）

主源：`/Users/lesprivilege/Projects/motto-dsh`，DeepSeek Harness 检出，`HEAD` = `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`（`git log -1` 已核，commit message "release(dsh): 0.1.0-rc.7" / "Merge pull request #2620 ... release/dsh-0.1.0-rc.7"）。该 SHA 同时被仓库自己的 `COMPATIBILITY.md:6` 与 `EXTENSIONS.lock.json:3` 记为 `dshBase`，三处一致。LICENSE = MIT。

未启动的服务 / 未访问的 URL：无。本地 `motto-dsh` 副本已完整覆盖工单要求的全部机制点（define/run/update/rollback/stop/undefine、immutable package + current/next 指针、validation、approval、inspect、creator mode、agent preset、scoped registry、live reload、effect cleanup、web UI 页面），未触发"官方仓库固定 commit"外部溯源分支，未调用 WebFetch/WebSearch。

未找到（列在此处，不散落各表）：

- DSH 没有 R2 Source Resolver 意义上的"接受 URL / repo / package / manifest 统一入口"——`cordis_define` 只接受模型直接写的源码文本（host 半份 `code` / browser 半份 `client`），不解析外部地址。
- DSH 没有 R3 Compatibility Adapter Registry / Native-Semantic-Lossy-Unsupported 能力矩阵的对应物——vm sandbox 直接跑原生 JS，不做能力分级判定。
- 没有找到"rollback"作为独立、带专门语义的动词、工具或事件；回到旧版本靠重新调用 `run(packageId=旧的)`，与首次运行复用同一条路径。
- 没有找到 WK-63 Governance 节点提到的"policy 编辑"UI 对应物——只找到 permission-preset 的整包切换（`workspace-write`/`danger-full-access`），没有逐条 `PolicyRule` 编辑界面。
- 没有找到独立的 "Registries" IA 页面/路由——悬浮 Cordis 面板内部用到 `inventory()`，但没有专门的 Registries 设置页。
- 没有找到 WK-63 Context 节点对应的 instruction / prompt_template / reference 三 kind 可视化清单页面——这些经 `ctx.systemPrompt.section()` 注入，但没有面向用户的 "Effective Context Inspector" UI。
- `/Users/lesprivilege/Projects/DeepSeek-TUI` 为 Rust/Cargo 项目，全文检索 `cordis` / `dsh-tool` / `harness plugin` 均无匹配，已排除为来源（工单允许的 secondary source 在本地不存在对应内容）。

---

## 1. 溯源索引行

格式：`<ID> · <URL 或 SHA:path> · 访问日 · 许可 · 消费模式 · 转录到`

- SRC-01 · `SHA:99f6f02fecdb7dff40c3fbc9470f5907c29f74ca:docs/subsystems/extensions.md` · 2026-09-09 · MIT · REFERENCE · 转录到本卷 §2 机制表全部行、§3 页面清单第 7/8/9 行
- SRC-02 · `SHA:99f6f02fecdb7dff40c3fbc9470f5907c29f74ca:packages/extensions/tool-cordis/README.md` · 2026-09-09 · MIT · REFERENCE · 转录到 §2 行 1/3/4/5
- SRC-03 · `SHA:99f6f02fecdb7dff40c3fbc9470f5907c29f74ca:packages/extensions/cordis-host-runner/README.md` · 2026-09-09 · MIT · REFERENCE · 转录到 §2 行 1/2/4/10
- SRC-04 · `SHA:99f6f02fecdb7dff40c3fbc9470f5907c29f74ca:packages/extensions/cordis-host-runner/src/types.ts:91,234-292` · 2026-09-09 · MIT · REVERSE（读类型定义反推运行期状态形状，未复制实现代码）· 转录到 §2 行 1/2
- SRC-05 · `SHA:99f6f02fecdb7dff40c3fbc9470f5907c29f74ca:packages/extensions/ui-cordis/README.md` · 2026-09-09 · MIT · REFERENCE · 转录到 §3 行 7/8、§4
- SRC-06 · `SHA:99f6f02fecdb7dff40c3fbc9470f5907c29f74ca:apps/cli/config/agent-presets/cordis/agent.cordis.yml:1-13,241-263` · 2026-09-09 · MIT · REFERENCE · 转录到 §2 行 6
- SRC-07 · `SHA:99f6f02fecdb7dff40c3fbc9470f5907c29f74ca:packages/client/ui-agent-preset/src/client/AgentPresetSection.tsx` 及 `README.md:41` · 2026-09-09 · MIT · REFERENCE · 转录到 §2 行 7、§3 行 2
- SRC-08 · `SHA:99f6f02fecdb7dff40c3fbc9470f5907c29f74ca:packages/client/ui-settings-plugins/*`（`ConfigurablePluginsTab.tsx`、`card-form.ts`） · 2026-09-09 · MIT · REFERENCE · 转录到 §3 行 3
- SRC-09 · `SHA:99f6f02fecdb7dff40c3fbc9470f5907c29f74ca:packages/client/ui-settings-plugin-inventory/src/client/PluginInventorySettingsTab.tsx` · 2026-09-09 · MIT · REFERENCE · 转录到 §3 行 4
- SRC-10 · `SHA:99f6f02fecdb7dff40c3fbc9470f5907c29f74ca:packages/client/ui-permission-presets/src/client/PermissionRow.tsx` 及 `docs/subsystems/permission-presets.md` · 2026-09-09 · MIT · REFERENCE · 转录到 §3 行 5、§4
- SRC-11 · `SHA:99f6f02fecdb7dff40c3fbc9470f5907c29f74ca:packages/bundle/web-app/cordis.patch.yml:22-24,100-110,170-172,204-207` · 2026-09-09 · MIT · REFERENCE · 转录到 §2 行 9、结论第 9 行
- SRC-12 · `SHA:99f6f02fecdb7dff40c3fbc9470f5907c29f74ca:docs/cordis-primer.md` · 2026-09-09 · MIT · REFERENCE · 转录到 §2 行 8/10
- SRC-13 · `SHA:99f6f02fecdb7dff40c3fbc9470f5907c29f74ca:docs/cookbook/extension-cookbook.md:99-129` · 2026-09-09 · MIT · REFERENCE · 转录到 §2 行 8/9
- SRC-14 · `SHA:99f6f02fecdb7dff40c3fbc9470f5907c29f74ca:EXTENSIONS.lock.json` 与 `COMPATIBILITY.md` · 2026-09-09 · MIT · REFERENCE（登记为对照，不进机制表——见下方说明）· 转录到结论第 10 行
- SRC-15 · `~/.pi/agent/skills/deepseek-harness/SKILL.md`（本地 mirror） · 2026-09-09 · N/A（内部技能索引）· PROTOCOL（只用其"派发表"确认文档定位，不套用工作流模板）· 转录到本节头部一句话

说明：`EXTENSIONS.lock.json`（SRC-14）记录的是 Motto 品牌层的**静态编译期**扩展（`dsh-client-motto-theme` 等四个包，`hostCapabilities`/`clientCapabilities`/`rollback` 字段），与工单要问的**动态运行期** Cordis dynamic package 是同一仓库里两套不同机制，仅作对照登记，不混入 §2 机制表。

---

## 2. 机制表

列：Observed mechanism · Source/pinned version · Borrow · Do not borrow · Adapter seam · Compatibility risk · Open verification · Acceptance implication

**1. plugin define / run / update / rollback / stop / undefine**

- Source/pinned version：dsh-0.1.0-rc.7（`99f6f02f`）`packages/extensions/tool-cordis/README.md:11-19`（五个模型工具：`cordis_inspect`/`_define`/`_run`/`_stop`/`_undefine`）；`packages/extensions/cordis-host-runner/src/types.ts:91`（`CordisDynamicRunMode = 'run' | 'update'`）
- Borrow：define 只记录不执行、run 使已记录对象产生效果、stop 撤销效果但保留定义、undefine 连定义一并遗忘——四个动词各自对应一次不会被其他动词悄悄代替的状态迁移，"状态迁移即动词"的切法可借。
- Do not borrow：没有独立的 "update" 动词与 "rollback" 动词——update 只是 run 的一个 mode，rollback 没有专门原语，靠对旧 `packageId` 再次调用 run 达成，与首次运行共用同一条返回结构，不作区分标记。
- Adapter seam：若 R5 要把 rollback 当独立可审计动作，需要在"再次 run 旧 packageId"之上包一层意图标签（"这是回滚"），DSH 本身不提供。
- Compatibility risk：中——`DynamicCordisRunResponse.mode` 只有二值，无法表达"这是回滚"，照搬会丢失 SE 想要的回滚可观测性。
- Open verification：未找到"回滚会清除更新失败留下的中间状态"的文档化保证；`nextPackageId` 在失败后的具体清理时机未核实。
- Acceptance implication：验收 R5 不能引用"DSH 可对历史 packageId 重新 run"作为"已有回滚"证据；回滚标签与状态清理路径需 SE 独立验证。

**2. immutable package + current/next 指针**

- Source/pinned version：`packages/extensions/cordis-host-runner/src/types.ts:234-239`（`packages: readonly DynamicCordisInventoryPackage[]`；`currentPackageId?`「Last package that completed activation successfully」；`nextPackageId?`「Package selected for a failed or in-progress transition」），及 `:280-284`（`RunResponse` 内同名字段 + `mode`）
- Borrow：已定义版本不可变、只新增；用两个独立可选指针分别表达"已确认状态"与"正在尝试的过渡目标"——这个双指针形状可借，映射到 R4 diff 卡的"当前 vs. 提议"两栏。
- Do not borrow：指针只活在 `DynamicCordisInventoryRow` 这层进程内存，`cordis-host-runner/README.md:26-28` 明言 "The registry is process memory and the only source of truth…session log carries a define call's metadata — never its code"——重启后指针连同定义一起消失，没有持久历史。
- Adapter seam：SE 若要 R5 的 apply/rollback 可审计、可回放，需要在双指针形状之外另建持久事务日志（谁在何时把 next 提升为 current），DSH 未提供。
- Compatibility risk：低——"权威只在一处"的方向与 SE 一致，风险在于把"进程内存态"误当作"可回放的提交历史"。
- Open verification：未核实 `reason: 'transition-in-flight'` 具体在什么条件下清空/保留 `nextPackageId`。
- Acceptance implication：可借双指针"形状"，不可借其持久性假设；R5 验收需独立证明 SE 自己的事务日志覆盖了"重启后可追溯"。

**3. validation before run**

- Source/pinned version：`packages/extensions/cordis-host-runner/README.md:11`「`define` … prechecks each half's syntax by compiling it (running nothing) … unparseable code is refused before an id exists」
- Borrow：校验与执行严格分离、校验失败不留痕迹（连 id 都不铸造）——"validate 是纯函数、无副作用"的原则可借。
- Do not borrow：这里的"validation"只做语法编译检查，不做语义/权限/兼容性检查，几乎等于 linter，不是 R3 想要的"兼容矩阵"式校验（Native/Semantic/Lossy/Unsupported）。
- Adapter seam：SE 若要 apply 前做能力矩阵校验，需要在 DSH 语法校验之外新增语义校验层，DSH 未提供也非其设计目标（信任模型写的代码，只挡语法错误）。
- Compatibility risk：中——把"能编译"误当作"可以安全运行"会低估风险；`tool-cordis/README.md` 明说 sandbox 不是安全边界。
- Open verification：未核实 client 半份代码与 host 半份是否用同一编译器/相同语法子集校验。
- Acceptance implication：R3 兼容矩阵校验须 SE 自建，不能援引 DSH 的"能编译"作为验收证据。

**4. user approval for client-bearing packages**

- Source/pinned version：`packages/extensions/cordis-host-runner/src/index.ts:98-100,240,321`（"Package waits for approval; Plugin-wide authorization covers later versions." / `approveFutureVersions`）；`packages/extensions/ui-cordis/README.md:7`（frame-wide 面板 approve/decline）
- Borrow：只有携带 Client 半份（会触达浏览器页面）的包才需要人工批准，纯 host-only 包不需要——"触达新信任域才升级为需要 approval"这个判据可借。
- Do not borrow：`approveFutureVersions` 让一次批准覆盖"同一 Plugin 的后续所有 Package"，而不同 Package 内容可以完全不同——批准第 1 版即可让第 5 版（任意内容）免于再批，只要 pluginId 不变。
- Adapter seam：需去掉"批准覆盖未来任意版本"这条，改为每个不可变 Package 单独产生一次 Proposal + 批准记录。
- Compatibility risk：**高**——直接对着"permission only tightens"的反方向：一次批准使同一 pluginId 下后续内容不同的代码免于复核。
- Open verification：未核实 `approveFutureVersions` 的选择对用户是否可见、是否有单独撤销入口；类型定义与 README 均未提及撤销路径。
- Acceptance implication：R5/R6 验收必须显式检查"批准范围绑定到不可变 Package id 而非 Plugin id"，否则不得引用 DSH 的 approval 流程为参照实现。

**5. runtime inspect（能看什么、什么形状）**

- Source/pinned version：`packages/extensions/tool-cordis/README.md:11`（`cordis_inspect` 五个 `what`：默认/`api`/`events`/`client`/`temporary`）；`docs/subsystems/extensions.md:180-222`（`inventory`/`snapshot`/`listPlugins`/`inspectPlugin`/`inspectPackage`）
- Borrow：source-free 摘要（`inventory`/`listPlugins`）与带源码的精确读取（`inspectPackage`）分层；"编译期能力目录 × 运行期活着的实例取交集，目录里有但没在跑的东西如实标注"——这套二分可借给 R1 Inspector 的数据模型。
- Do not borrow：`cordis_inspect` 是模型工具调用产生的一次性快照文本，不是持续订阅式 UI 数据源；`ui-cordis/README.md` 明说 "An open panel does not see registry changes that announce nothing"。
- Adapter seam：R1 需要在 DSH 一次性快照之上加订阅/轮询层，DSH 自陈未做（"Polling while open was considered and rejected"）。
- Compatibility risk：中——沿用"读=快照"的心智容易让 Inspector 显示过期数据而不自知。
- Open verification：未核实 `inventory()` 的调用成本是否适合作为高频轮询数据源。
- Acceptance implication：R1 的实时性承诺不能引用 DSH 现状为证据。

**6. creator mode**

- Source/pinned version：`apps/cli/config/agent-presets/cordis/agent.cordis.yml:1-13`（"the ability to read and write the runtime it is running in" / "Treat a session on this preset as shell access"）、`:245-247`（`dsh-tool-cordis` 行）；`packages/client/ui-agent-preset/README.md:41`（"let the agent draft one in Creator mode"）
- Borrow：Creator mode 不是独立子系统，而是"cordis" agent preset + `dsh-tool-cordis` 工具集的组合——"能力 = preset 选择"的建模方式可借。
- Do not borrow：persona 文案把该 preset 的信任级别定性为等同完整 shell 访问，没有比"要么完整、要么没有"更细的分级。
- Adapter seam：需要在"选中 creator 能力"与"具体能改哪些注册表"之间插入 SE 自己的权限矩阵。
- Compatibility risk：**高**——`tool-cordis/README.md:23`「host-realm helpers make escape possible」，逃逸路径已知存在。
- Open verification：未核实生产 Motto/Web profile 是否默认挂载 `cordis` preset；本仓库读到的是 `apps/cli` 示例配置。
- Acceptance implication：R6 若参照 Creator mode，验收须包含"逃逸路径是否被 SE 沙箱收窄"，不能默认 DSH 现状已足够安全。

**7. agent presets（system vs user、copy、running agents 的世代绑定、rediscovery）**

- Source/pinned version：`packages/client/ui-agent-preset/src/client/AgentPresetSection.tsx:1-11`（注释）、`:236-363`（system/user 两组卡片、copy dialog、`makeDefault`、`openLocation`）
- Borrow：(a) system 预设只读查看、不可改不可删，只用作复制起点；(b) 复制是创建自定义 preset 的唯一途径；(c) 组件注释原话「Deleting a preset leaves running sessions alone: a composition is mounted once at session creation and nothing re-reads the file」——一次挂载即定格，之后修改/删除 preset 不影响已跑 session，这条对"generation binding of running agents"直接可借。
- Do not borrow："rediscovery"在 DSH 侧几乎不存在——roster 来自部署时固定的 system/user 两个目录扫描，没有"运行时从任意来源发现新 preset"的机制，也没有版本号或"这个 session 绑的是 preset 哪个历史内容"的追溯。
- Adapter seam：R6 若要做版本追溯，需 SE 自建；DSH 的 mount-once 只保证"不会变"，不保证"能查到当初是什么"。
- Compatibility risk：低到中——mount-once 与"proposal ≠ commitment"方向一致，但缺版本追溯可能不满足 Expert 快照的可审计期待。
- Open verification：未核实 preset 文件内容哈希或修改时间是否被记入 session 事件日志。
- Acceptance implication："generation binding" 可直接引用 DSH 事实为先例；"rediscovery"与"版本追溯"两条不能引用，因为未实现。

**8. scoped registry**

- Source/pinned version：`docs/cordis-primer.md:9-13`（"A context is a repository of services" / `inject` 声明依赖）；`docs/cookbook/extension-cookbook.md:113`（`ctx.tools.restrict()`）；`apps/cli/config/agent-presets/cordis/agent.cordis.yml` 多处 `isolate:` 字段（如 `:95,128,166`）
- Borrow：`isolate: {serviceName: true}` 把指定服务钉在当前 entry 私有 realm、同名服务在别处解析到别的实例——"按需开小灶而非默认全局单例"的可选收窄机制可借。
- Do not borrow：`isolate` realm 是 composition-authoring-time 的静态声明（写在 cordis.yml，Loader 挂载时决定），不是运行时可动态切换的"这次 session 要不要看见某能力"；`ctx.tools.restrict()` 虽运行时可调，但只管模型看见哪些工具 schema，不管服务实例是否隔离。
- Adapter seam：SE 的 Capabilities 节若要运行时按 session 切换可见集，需在 DSH 静态 realm 之上另建运行时可见性开关。
- Compatibility risk：低——方向一致（收紧可见性），风险在于把 `restrict()` 的窄语义误当完整作用域隔离。
- Open verification：未核实 `isolate` realm 是否可在 session 存活期间动态增减；从读到的代码看像是挂载时一次性决定。
- Acceptance implication：可借"作用域链 + 可选收窄"思路，不可引用 DSH 证明"运行时动态作用域切换"已现成。

**9. live reload**

- Source/pinned version：`docs/cookbook/extension-cookbook.md:129`（"Plugin hot-reload | every registration is a `ctx.effect` → vendored HMR just works"）；`packages/bundle/web-app/cordis.patch.yml:21-23`（`id: hmr` / `disabled: true` / 注释 "Re-enable shared HMR for Web after its reload lifecycle is tested"）
- Borrow：热重载不是专门功能，而是"效果可逆"这条底层不变量的免费推论——只要每个注册通过 `effect()`/`on()` 声明并可撤销，重载即"先撤销旧的再重新 apply()"。
- Do not borrow：这是针对"静态 composition 文件变化后 Loader 重新装载"的 HMR，与 `cordis_run` 的"已运行包再次 run 直接re-deliver 现活版本"（`tool-cordis/README.md:13`）是两套不同机制，不要混为一谈。
- Adapter seam：R5 若要"不打断会话的热替换"，需分别对齐这两条互不相同的重载路径。
- Compatibility risk：低——各自内部自洽，风险在命名混淆。
- Open verification：`cordis.patch.yml:22` 显示 Web profile 的共享 HMR 行当前 `disabled: true`，即生产 Web 部署此刻未启用该热重载路径，待其重载生命周期验证后才重新开启。
- Acceptance implication：不能引用"DSH 有热重载"作为 Web 场景已验证先例——该仓库自己的 TODO 显示此刻是关闭状态。

**10. effect / owner cleanup（Cordis）**

- Source/pinned version：`docs/cordis-primer.md:13`（"Registrations are reversible effects…installed through `ctx.effect()` or `ctx.on()` so reload and teardown unwind them predictably"）；`packages/extensions/cordis-host-runner/README.md:15`（stop "host-half fiber disposed to quiescence"）；`packages/extensions/tool-cordis/README.md:104`（"an async host-half body escapes `vmTimeoutMs`"）
- Borrow：每个注册必须有 disposer，teardown 顺序敏感的工作放进同一个 effect，由框架保证撤销顺序——"清理是注册的必备孪生动作"这条架构纪律可直接借，呼应 SE"一个 Run 一个生命周期 owner"（owner 消失，其注册物随之消失，不留孤儿）。
- Do not borrow：Cordis 的 effect 撤销是"尽力而为"的撤销，不是"等待所有异步工作真正完成"意义上的 quiescence——已知限制里明说异步 host-half body 会逃逸 `vmTimeoutMs`。
- Adapter seam：R5 若要"旧状态确实停干净了才能提交新状态"，需在 effect 撤销之上加一层"停止确认"握手，DSH 未提供。
- Compatibility risk：中——异步逃逸窗口意味着"stop 返回"不完全等于"资源已释放"，若 commit gate 建立在"stop 已返回"信号上，可能提交在未清理干净的状态之上。
- Open verification：未核实 host-half 有活跃异步 I/O 时"disposed to quiescence"的具体兜底行为，README 只承认逃逸，未给出强制终止路径。
- Acceptance implication：R5 若以 Cordis effect 撤销为参照，须额外验证"停止确认"握手，不能假设撤销即清理完成。

---

## 3. web UI 页面清单

列：页面 · 对象 · 控件 · 状态词 · 对应 WK-63 IA 节点 · 一级或二级颗粒度

1. **Settings ▸ Models**（`packages/client/ui-settings-models/src/client/ModelsSection.tsx` + `ProviderEditor.tsx`/`DeepSeekOnboardingDialog.tsx`）· 对象：provider / model 配置项 · 控件：编辑表单、新增 provider 卡片、onboarding 弹窗 · 状态词：`idle`/`loading`/`ready`/`error`/派生 `unavailable`（同库 store 通用四态，`store.ts:38,215,240` 附近） · IA：Models · 二级

2. **Settings ▸ Agent Presets**（`AgentPresetSection.tsx:1-421`）· 对象：agent preset（system/user 两组） · 控件：卡片选中即 `makeDefault`、复制对话框（`beginCopy`/`confirmCopy`）、只读查看器（`view`）、删除确认（`confirmDelete`/`remove`）、打开位置（`openLocation`）、Creator 草稿按钮（`startCreatorDraft`） · 状态词：`loading`/`error`/`saving`/`deleting`/`authorable`/`broken`/`isDefault`（section-store 折算，`AgentPresetSection.tsx:194-266`） · IA：Agents · 二级

3. **Settings ▸ Plugins ▸ Configurable**（`ConfigurablePluginsTab.tsx` + `PluginCard.tsx`/`AgentLoopCard.tsx`/`BashCard.tsx`/`WebSearchCard.tsx`） · 对象：具名 namespace 的可编辑插件配置 · 控件：逐字段编辑（`edit`/`resetField`）、保存/放弃（`save`/`discard`） · 状态词：`available`/`writable`/`dirty`/`invalid`/`saving`/`failed`/`overridden`（`card-form.ts:63-76`） · IA：Extensions · 二级

4. **Settings ▸ Plugins ▸ Inventory**（`PluginInventorySettingsTab.tsx`） · 对象：Loader 已知的全部插件条目（`moduleName`/`entryId`） · 控件：搜索框、逐条展开/收起、失败重试 · 状态词：`loading`/`error`/`ready` + 每条目 `fiberPhase`：`pending`/`loadingPhase`/`active`/`failed`/`unloading`/`unobserved`，以及 `enabled`/`disabled` 标签（`:31-45,64-97`） · IA：Extensions · 二级（只读细粒度清单）

5. **Settings ▸ General ▸ Permission**（`PermissionRow.tsx:1-134`） · 对象：新会话默认 permission preset（`workspace-write`/`danger-full-access`） · 控件：下拉菜单选择、切到 `danger-full-access` 时的风险确认对话框（`RiskConfirmation`） · 状态词：`loading`/`saving`/`unavailable`/`writable`/`acknowledged` · IA：Governance · 二级

6. **Composer `/permission` 控件**（同文件头部注释 `:1-4`「Current-session switches remain on the composer `/permission` control」，控件本体未读取源码，仅登记其存在） · 对象：本会话即时 permission preset 切换 · 控件：（未核实，登记为未读） · 状态词：（未核实） · IA：无对应节点（会话内控件，不进 Workbench） · 一级

7. **全局悬浮 Cordis 面板**（`shell.overlay` 条目；`CordisPanel.tsx`/`CordisActionRow.tsx`/`CordisRunRow.tsx`，行为见 `ui-cordis/README.md:7-17`） · 对象：进程内全部 dynamic package（`inventory` 读取，跨 session 列出、本 session 分组在前） · 控件：badge（运行数+待批准数）、逐条 run/stop/"load back into this page"/approve/decline · 状态词：`running`/`awaiting-approval`/`starting`/`host-half-failed`/`client-half-failed`/`rejected`/`cancelled`/`not-running`，另有独立的"host 是否在跑"与"this page 是否已加载"两个布尔（`README.md:9-14`） · IA：Extensions（渲染失败/崩溃行也部分触及 Diagnostics） · 一级（badge 计数）与二级（展开列表逐条控制）共存于同一面板

8. **会话内 `cordis_define` 卡片**（`CordisDefineRow.tsx`，行为见 `ui-cordis/README.md:9`） · 对象：一次 `cordis_define` 调用的记录（name/purpose/source/是否在运行） · 控件：无开关，只有指向面板的指引 · 状态词：`running`/`not-running`（由该 session 日志内的 `cordis_undefine` 结果覆盖 wire 状态） · IA：无独立节点（Chat 流内），类比 WK-66 的会话内一级界面 · 一级

9. **`cordis_inspect` 文本报告**（非页面，模型工具调用渲染进对话；`tool-cordis/README.md:11,58-84`） · 对象：services/live plugin fibers/registered tools/session 的 dynamic packages/`api`·`events`·`client` 反射契约 · 控件：`what` 参数（默认/`api`/`events`/`client`/`temporary`）+ 可选 `name` narrow · 状态词：无（数据依赖型文本，非状态机） · IA：Diagnostics（默认摘要）与 Capabilities/Extensions（`name` 精确到单个服务时） · 一级（默认摘要）与二级（`name` 精确读取）并存

---

## 4. 与 SE 冲突清单

- **"一个 Run 一个生命周期 owner" vs 数据 owner 与操作权分裂**：package 的数据归属是 defining session（`inspect`/`listPlugins` 对他人定义"读为不存在"），但 approve 面板是 frame-wide、"Any page may answer any request"（`ui-cordis/README.md:34`）——同一个 package 的"运行"生命周期由 host 进程唯一持有，但"谁能对它下达动作"不是单一 owner，而是任何打开面板的浏览器 tab。这与"一个 Run 一个生命周期 owner"的精神有出入：所有权分裂成"数据 owner"与"操作权"两条线。

- **"GUI 不持有第二份权威状态" vs 客观存在的两个真实事实源**：`ui-cordis/README.md:11` 明确"host 是否在跑（inventory）"与"这一页是否已加载（runner 的本地 live set）"是两个会分岔的独立事实（"They diverge on every reload"）。这不是 UI 违规造了"第二份权威"，而是进程态与本页面态本就是两个不同对象各自的权威状态；但字面套用 SE 不变量容易把两者错误合并成一个布尔，丢失合法的第二维度，需要 SE 明确区分"禁止的重复权威"与"合法的多层真状态"。

- **"proposal ≠ commitment" vs host-only 路径无强制中间关卡**：define（记录，无效果）与 run（产生效果）两段分离，方向上与 SE 一致；但对 host-only 包，是否 run 完全由模型自驱决定，define→run 之间没有强制的人工审阅关卡——只有触达浏览器的包才被迫经过人工关卡。若 SE 要求"每个 proposal 都必须有独立 commit gate"，DSH 的 host-only 默认路径不满足这一点。

- **"permission only tightens" vs `approveFutureVersions`**：已在 §2 机制表行 4 详述——一次批准可覆盖同一 pluginId 下后续内容任意不同的代码，批准范围随时间自动扩大到未审阅过的版本，与"权限只能收紧"方向相反。

- **观察范围不一致**：模型侧（`inspect`/`listPlugins`）对他人 session 的定义"读为不存在"，但面板侧（`inventory()`，悬浮面板的数据源）反而是"全局可见，包括别的 session"。同一套底层数据，对"谁能看见什么"给出了两个不一致的答案，SE 若要统一 observation 范围需先决定采用哪一条。

---

## 5. 结论

1. DSH 用五个模型工具（inspect/define/run/stop/undefine）覆盖 R1/R5 大部分动词，但没有独立的 "update" 与 "rollback" 原语——update 是 run 的一个 mode，rollback 靠重新 run 旧 packageId，两者复用同一条返回结构。
2. "不可变 Package + current/next 双指针"字面存在于 `cordis-host-runner/src/types.ts:234-239`，但该状态只活在进程内存，不进 session 持久日志。
3. approval 只在包携带浏览器半份时触发，且 `approveFutureVersions` 把批准范围从"这一个不可变版本"扩大到"这个 Plugin 未来的任意版本"。
4. Creator mode 不是独立子系统，而是 "cordis" agent preset + `dsh-tool-cordis` 工具集的组合，persona 文案自称其信任级别等同于 shell 访问。
5. Agent preset 的 "generation binding" 确认存在：composition 只在 session 创建时挂载一次，之后改动/删除 preset 不影响已跑的 session。
6. Web UI 里插件相关表面分裂在三处：Settings 内的 Plugins（Configurable/Inventory 两 tab）、Settings 内的 Agent Presets、以及独立于 Settings 的全局悬浮 Cordis 面板（承载动态包的 run/stop/approve）。
7. Cordis 面板明确记录 "host 是否在跑" 与 "本页是否已加载" 是两个会分岔的独立事实，需要同时读取才能画对一行。
8. `cordis_inspect` 是模型工具调用产生的一次性文本报告，不是订阅式 UI 数据源；面板作者自陈"没有公告就不刷新"。
9. Web profile 的共享 HMR 目前在 `cordis.patch.yml:22` 被显式 `disabled: true`（TODO 待验证重载生命周期），热重载在生产 Web 场景下的可用性未经该仓库自证。
10. 静态编译期扩展（`EXTENSIONS.lock.json`，Motto 品牌层）与动态运行期插件（Cordis dynamic package）是同一仓库里两套不同粒度、不同生命周期的机制，命名都叫 "extension/plugin" 但互不重叠。
