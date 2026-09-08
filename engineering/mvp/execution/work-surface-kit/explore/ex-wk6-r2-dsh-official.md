# EX-WK6 r2 · DeepSeek Harness 官方仓库插件系统与 web UI 溯源（定本）

状态：带溯源索引

来源：官方仓库 `deepseek-ai/deepseek-harness`（GitHub），固定 HEAD commit **`c389f96bf3a9b6807cb71ed6bdad5849be0df6d8`**（2026-09-08 00:46:19 +0800），`LICENSE` 为 MIT。本机一次性只读克隆：`git clone --depth 1 https://github.com/deepseek-ai/deepseek-harness.git` 至 `/private/tmp/claude-501/-Users-lesprivilege-Projects-Schema-Engineering/7ceb28df-cee0-4df5-bbef-af2d8554131f/scratchpad/dsh-official`，未 push、未改写、未安装依赖、未启动任何服务。

对照副本（仅用于 §4 差异比对，不作转录来源）：本机受控下游 `/Users/lesprivilege/Projects/motto-dsh`，`git log -1` = `99f6f02fecdb7dff40c3fbc9470f5907c29f74ca`（2026-08-17 19:03:17 +0800，rc.7），`git remote -v` 显示 `upstream = https://github.com/deepseek-ai/deepseek-harness.git`。对该副本只执行了文件读取（`cat`/`diff` 对比已克隆的官方文件），未执行任何 git 命令（含 `fetch`），未修改任一文件。

本机 skill `~/.pi/agent/skills/deepseek-harness/SKILL.md` 仅读取其 dispatch 表作索引，未套用其工作流模板（该 skill 本身也声明"routes to pinned upstream skill templates without making their repository-specific rules global"）。

只读声明：本卷为只读 explore。未修改 Schema Engineering 仓、Courtwork-fresh 仓、motto-dsh 仓的任何既有文件；未在任一仓执行状态变更类 git 命令；仅对 dsh-official 执行了一次 `git clone --depth 1`（新目录，非项目内）；未启动服务器；未访问凭据存储；未读取 `auth.json` 或任何密钥文件。

前置未核实/未找到清单：
- **"creator mode" 未见字面命名**：全仓 `grep -rIl "creator mode\|creator-mode\|Creator Mode"` 无命中。最接近的机制是 cordis 动态插件的模型自定义-运行-审批闭环（`cordis_define`/`cordis_run` + 全帧面板，见机制表行 10），但源码从未用"creator"一词描述它；`packages/experimental/inspector`（Chrome DevTools 级检查器）是开发者侧工具，`README.md:11` 明记"private and excluded from releases"，也不是候选。
- `packages/preset/agent-presets/src` 下 `discovery.ts`（183 行差异）、`mount.ts`（84）、`preset.ts`（43）、`session.ts`（44）、`types.ts`（71）、`authoring.ts`（79）与 rc.7 均有大段改动，受篇幅限制未逐行核对；§4 只收录已具体核实的断言，其余标记"结构性未逐行核对，非本卷断言"。
- 未运行 `apps/web` 开发服务器；§3 页面清单基于源码（slot 注册、React 组件源文件、生成的 README）静态读取，非运行时截图或交互验证。
- 未查证 `apps/desktop` 是否复用同一批 web 组件（`apps/desktop/renderer/plugin-manager.*` 独立存在，未读取，与本卷机制表所述 web 客户端插件面板可能是两套实现）。

---

## 1. 溯源索引行

```
WK6-1 · https://github.com/deepseek-ai/deepseek-harness @ c389f96bf3a9b6807cb71ed6bdad5849be0df6d8 · 2026-09-09 · MIT · REFERENCE · 转录到 全卷（定位与结构）
WK6-2 · c389f96b:docs/cordis-primer.md · 2026-09-09 · MIT · REFERENCE · 转录到 机制表行 17（effect/owner cleanup）
WK6-3 · c389f96b:docs/subsystems/extensions.md · 2026-09-09 · MIT · PROTOCOL · 转录到 机制表行 1-9、16（生成的 ctx.cordisInspect / ctx.dynamicCordisRunner API 签名）
WK6-4 · c389f96b:packages/extensions/cordis-host-runner/{src,README.md} · 2026-09-09 · MIT · REVERSE · 转录到 机制表行 1-9
WK6-5 · c389f96b:packages/host/plugin-inventory/{src,README.md} · 2026-09-09 · MIT · REVERSE · 转录到 机制表行 9、13；§4-a
WK6-6 · c389f96b:packages/preset/agent-presets/{src,README.md} · 2026-09-09 · MIT · REVERSE · 转录到 机制表行 11-14
WK6-7 · c389f96b:packages/extensions/ui-cordis/{src,README.md} · 2026-09-09 · MIT · REFERENCE · 转录到 §3（Cordis 面板与工具卡）
WK6-8 · c389f96b:packages/client/ui-agent-preset/README.md · 2026-09-09 · MIT · REFERENCE · 转录到 §3（预设名册/新会话 chip）
WK6-9 · c389f96b:packages/client/ui-settings-plugin-inventory/src/client/PluginInventorySettingsTab.tsx · 2026-09-09 · MIT · REFERENCE · 转录到 §3（Plugin Inventory tab）
WK6-10 · c389f96b:packages/client/ui-permission-presets/README.md · 2026-09-09 · MIT · REFERENCE · 转录到 §3（权限预设行/选择器）
WK6-11 · c389f96b:packages/client/ui-approval/README.md · 2026-09-09 · MIT · REFERENCE · 转录到 §3（通用权限批准面板）；§5
WK6-12 · c389f96b:packages/client/ui-settings-general/README.md · 2026-09-09 · MIT · REFERENCE · 转录到 §3（Settings 外壳/chrome）
WK6-13 · c389f96b:packages/client/hmr/README.md · 2026-09-09 · MIT · REVERSE · 转录到 机制表行 16（live reload）
WK6-14 · c389f96b:packages/experimental/inspector/README.md · 2026-09-09 · MIT · AVOID-COUPLING · 转录到 前置未找到清单（creator mode 排除项）
WK6-15 · c389f96b:packages/extensions/cordis-host-runner/tests/versioning.spec.ts · 2026-09-09 · MIT · REVERSE · 转录到 机制表行 6（rollback）
WK6-16 · 本机 SHA:99f6f02fecdb7dff40c3fbc9470f5907c29f74ca（motto-dsh，2026-08-17）· 2026-09-09（本地读取）· 内部受控下游，无独立许可声明 · AVOID-COUPLING · 转录到 §4（仅供差异比对，未作为任何机制表行的转录来源）
WK6-17 · ~/.pi/agent/skills/deepseek-harness/SKILL.md · 2026-09-09（本地读取）· 内部文件 · REFERENCE · 转录到 卷首（只读其索引，未套用模板）
```

---

## 2. 机制表

| # | Observed mechanism | Source/pinned commit:path:line | Borrow | Do not borrow | Adapter seam | Compatibility risk | Open verification | Acceptance implication |
|---|---|---|---|---|---|---|---|---|
| 1 | **define**：只记录、无副作用，先对两个 half 做纯语法预检再铸造 id | `c389f96b:packages/extensions/cordis-host-runner/src/index.ts` `define()`；语法预检 `src/sandbox.ts:212`（`precheckCode`）；API 签名 `docs/subsystems/extensions.md:76-82` | "define 与 run 分两阶段，define 无回滚对象" 这一分界——SE 的 Runtime Proposal 生成阶段可以照此设计成零副作用步骤 | DSH 的 define 只把调用参数（含源码）写入 session log，没有独立可查询的 proposal/diff 记录，也没有用户可见的预览界面 | R2 Source Resolver 的"registered but not yet proposed"状态可参照 define，但 diff/effectiveDiff 需 SE 自建 | DSH define 的持久层是 session 事件日志，重启即整体消失（`README.md`："Definitions live only in process memory"）——SE 若要更强持久性需另建，不能照搬 | 未核实 `guard.ts` 的 `ParameterSchemaSpec` 归一化是否会拒绝 SE 需要的某些 schema 形态 | R2 契约应明确写"记录"阶段是否落盘，DSH 的"进程内存"选择不能默认继承 |
| 2 | **run**（mode: `"run"`）：激活当前 package，或重启同一 package | `c389f96b:packages/extensions/cordis-host-runner/src/index.ts` `run()`；类型 `src/types.ts:92`（`CordisDynamicRunMode`）；API `docs/subsystems/extensions.md:96-105` | run/update 共用一个方法、用 `mode` 参数区分"启动"与"换版本"，减少了动作面 | 无 | R5 事务化 apply 的"apply 动作"入口可以只留一个，用 payload 区分场景 | 无（同一方法双语义，只要文档清楚） | 未核实 `mode: "run"` 面对"当前版本正在运行中"时是精确重启还是幂等 no-op（README 称"starts the current package or restarts it"，未见测试覆盖两者区分） | 若 SE 借用单方法双 mode，需在验收里显式测两条路径 |
| 3 | **update**（mode: `"update"`）：切换到另一个不可变 package 版本 | 同上；`docs/subsystems/extensions.md:96-105`："`mode` - Whether to run the current version or switch versions" | "目标版本必须已存在于不可变包列表中才能 update"——避免了"边写边跑"的中间态 | 无 | R2 Source Resolver 产出的候选版本，可映射为 DSH 的 package 概念（先注册后指定运行） | 无 | 无 | 无 |
| 4 | **rollback**：非独立动词，是"对更早的不可变 packageId 再次调用 `run`" | `c389f96b:packages/extensions/cordis-host-runner/tests/versioning.spec.ts:7-35`；技能文档措辞 `packages/preset/agent-presets/presets/cordis/skills/cordis-plugin-development/SKILL.md:30`："use `run` for first activation, restart, or rollback" | "rollback = 对旧版本重新 run"这一复用而非新造动词的做法，简化了动作面 | **失败后不自动回退**：测试证实 update 失败时 `currentPackageId` 保持不变，但 `activeRun` 变为 `undefined`——即失败瞬间"什么都没在跑"，不是自动切回旧版本运行；需要显式再 `run(oldPackageId)`才恢复 | R5 事务化 apply/rollback 若参考此模型，必须显式设计"失败态"是否等于"停机态"，不能默认"旧版本自动继续跑" | **这是本卷最重要的兼容风险**：DSH 是 fail-stop（失败即停），不是 fail-back（失败自动退回上一个可用状态）；SE 若承诺"apply 失败自动回到可用状态"，DSH 的模型不能直接支撑这个承诺，需要适配层自己维持"上一个已知良好版本仍在跑"的状态 | 无 | R5 验收必须明确写清楚：apply 失败后系统处于"停"还是"回退到旧版本运行"，二选一并测试覆盖 |
| 5 | **stop**：结束当前运行、保留全部不可变版本 | `c389f96b:packages/extensions/cordis-host-runner/src/index.ts` `stop()` 与面板专用 `stopFromPanel()`；`docs/subsystems/extensions.md:148-162` | 模型发起的 stop（`stop`）与用户面板发起的 stop（`stopFromPanel`）是两个独立方法，都会把结果状态变化排队给模型下一步读——这种"谁发起、都要让模型知道"的对称设计值得借鉴 | 无 | R5 的"人工终止"动作可比照 `stopFromPanel` 单独建一个入口，与模型自身的 stop 分流但汇合到同一状态机 | 无 | 未核实 `stopFromPanel` 排队给模型的"下一步"消息具体格式是否和工具调用结果格式一致 | 无 |
| 6 | **undefine**：先 stop 后彻底遗忘（含全部版本） | `c389f96b:packages/extensions/cordis-host-runner/src/index.ts` `undefine()` 与 `undefineFromPanel()`；类型 `src/types.ts:251`（`DynamicCordisUndefineReceipt`）；`docs/subsystems/extensions.md:84-93` | "undefine 不可逆、清除全部版本"这一点前端也有专门 UI 承诺（`cordis_undefine` 卡片是"compact action row"，无二次确认逻辑见于 README） | 无按钮层面的二次确认（README 未提及 confirm 对话框），若 SE 需要"不可逆动作前置确认"，要自建 | R5 的"彻底移除"（非"下线保留历史"）动作可参照，但需补 SE 自己的确认/审计要求 | 未见 undefine 的确认交互，DSH 对不可逆动作的 UI 摩擦力比 SE 期望的可能更低 | 未核实前端是否有隐藏的确认弹窗（源码读取范围内的 `CordisActionRow.tsx` 未展开细读） | 若借用需在工单里明确加确认步骤，不能假设 DSH 前端已经有 |
| 7 | **不可变 package + current/next 指针** | `c389f96b:packages/extensions/cordis-host-runner/src/types.ts:230-243`（`DynamicCordisInventoryRow`：`currentPackageId?`／`nextPackageId?`）；设计陈述 `README.md`（Understand the implementation 段）："Versions are immutable packages... `currentPackageId` and `nextPackageId` point at the running and target versions" | "版本永不改写，只指针移动"这一不可变原语——WK-64 R5 的"immutable package + current pointer"直接对应 | 无 | R5 的核心数据结构可直接照抄这个双指针形状（current=已提交，next=目标/进行中） | `nextPackageId` 在失败后**不会自动清空**（见行 4 的测试），停留在"上次尝试失败的目标"，直到下一次成功 run 才清掉——SE 若展示"pending 状态"要对齐这个语义，不能假设失败会自净 | 无 | R5 的兼容矩阵需注明"next 指针在失败后是否保留可见"是设计选择而非默认行为 |
| 8 | **run 前校验**：两段式——`new Function` 语法门禁（跨宿主都生效，含无真实 `node:vm` 的浏览器 worker），`vm.Script` 仅作"漂亮报错"增强 | `c389f96b:packages/extensions/cordis-host-runner/src/sandbox.ts:212-243`（`precheckCode` / `prettyParseContext`）**vs** rc.7 `99f6f02fec:packages/extensions/cordis-host-runner/src/sandbox.ts:206-211`（旧版仅用 `new Script` 做门禁）——见 §4-b，这是一个已核实的破坏性/扩展性变更 | "语法预检与执行分离，且门禁本身不依赖真实沙箱可用性"——门禁失败不消耗任何运行时资源，模型可直接根据报错改代码再 define | 无 | R2/R4 的"接收前校验"步骤可参照两段式（先普适语法门禁，再尽力而为的详细报错），但 SE 若只有 Node 环境不需要跨宿主兼容这层复杂度 | 无（此为 DSH 内部实现演进，对 API 契约无影响，`CordisDynamicDefineReceipt` 形状未变） | 未核实新旧两种解析器对 `new.target` 等边缘语法的判定差异是否曾在 DSH 自己的测试中触发过回归 | 无直接验收影响，仅供 R2/R4 校验步骤设计参考 |
| 9 | **client-bearing package 的用户批准** | `c389f96b:packages/extensions/cordis-host-runner/src/index.ts` `run()` JSDoc："An unauthorized Client Package waits for approval; Plugin-wide authorization covers later versions"；`runHostHalf(..., approveFutureVersions: boolean)`；`docs/subsystems/extensions.md:83-95, 106-115` | **"approveFutureVersions" 是一个显式旗标**：批准可以是"仅这一版"或"这个插件的后续版本都批准"——这是一个很具体、可直接对应 SE 权限"只收紧不放松"原则的细粒度选择，前端 `CordisPanel` 把这个选择留给人 | DSH 的批准是**帧级（frame-wide）**、非按会话隔离：README 明确"a person in one tab can approve a run the model asked for while another tab shows the defining session"——任何标签页都能批准任何会话的请求，这与 SE"权限只收紧、会话边界清晰"的期望冲突，不可直接借用 | R4 Runtime Proposal 的 permission delta 可借鉴"approveFutureVersions"这一维度（一次性 vs 覆盖后续版本），但批准范围必须限定在发起会话或其宿主用户，不能沿用帧级 | 若误用 DSH 的帧级批准模型，会让"谁批准了什么"在多标签页场景下失去可追溯性，与 SE"proposal ≠ commitment 且必须知道谁 commit"直接冲突 | 未核实批准动作是否落 session log（README 明确说"deliberately leaves no session-log trace of a person approving, declining, running, or stopping anything"——即批准本身不可审计） | R4/R5 验收必须要求"批准者与批准范围可审计"，DSH 现状（无审计痕迹、帧级生效）不满足，是明确的"不可借用"点 |
| 10 | **runtime inspect**：分 Host/Client 两个 provider 目录，每个 provider 声明只读 method + JSON Schema 输入输出 | `c389f96b:packages/extensions/cordis-host-runner/src/inspect-registry.ts:1-90`（`CordisInspectRegistryService`：`register`/`syncClientManifest`/`list`/`query`/`resolveClientQuery`）；API `docs/subsystems/extensions.md:17-66`；模型工具 `cordis_inspect`/`cordis_inspect_list`/`cordis_inspect_self`/`cordis_inspect_query`/`cordis_runtime_inspect`（`grep` 命中于 `packages/extensions/tool-cordis/src/*.ts`） | "provider 目录 + 显式 method manifest（含 JSON Schema）"这一形状，直接对应 WK-63 的 Effective Context Inspector／R1 Inspector 需要的"可枚举、可自描述"查询面 | 无 | R1 Inspector 的查询协议可直接照抄这个三层结构：provider → method → (inputSchema, outputSchema)；跨 Host/Client 路由（`cordis/inspect-query` 事件）也可作为"页面态需要跨进程查询"的参考实现 | 无 | 未核实 `cordis_runtime_inspect` 与 `cordis_inspect_self`/`cordis_inspect` 三者的确切职责分工（仅从 grep 命中确认工具名存在，未逐一读取 `tool-cordis/src` 全文） | R1 若借用此结构，需要先做 R1 自己的 provider/method 清单，而不是照搬 DSH 的 provider 集合 |
| 11 | **"creator mode"** | 未见字面命名（见卷首前置清单）；最近似机制是 `cordis_define`+`cordis_run` 的模型自定义-运行闭环，配合 `ui-cordis` 全帧面板（`c389f96b:packages/extensions/ui-cordis/README.md`） | 若 WK-67 的意图是"模型能在运行时自行生成并激活新能力"，DSH 的 define→approve→run 闭环是可读的参照实现 | 不要把这个闭环误认作"面向最终用户的创作模式"——DSH 这套机制的主叙事是"模型自己写代码扩展自己"，用户角色是审批者而非创作者 | 无直接 seam；如 WK-67 需要"创作模式"，应先在 SE 侧定义清楚这个词指什么，再决定是否参照 DSH 的模型自定义闭环 | 术语误配风险：若把"creator mode"等同于此机制写进工单，会把"模型自扩展"和"用户创作"两件事混淆 | 需向 Fable/用户确认 WK-67 中"creator mode"具体指代什么源码对象 | 裁定前必须先消解这个术语的所指，本卷不代为下裁定 |
| 12 | **agent 预设：system vs user 两态信任** | `c389f96b:packages/preset/agent-presets/src/preset.ts`（`PresetTrust`）；README："the presets shipped inside this package under `presets/`, and your own presets under `<dshHome>/.agent-presets`"；类型 `packages/host/plugin-inventory/src/types.ts:47`（`trust: 'system' \| 'user'`） | 两态信任 + 展示态本地化（shipped 用词典翻译、用户自建保留原文）——WK-63 "system 与 user 两态"的直接参照 | 无 | R6 Expert 快照的"谁能改、谁不能改"边界可参照：shipped 目录不可删（`remove()` 拒绝），user 目录可读写 | 无 | 无 | 无 |
| 13 | **agent 预设：copy-only 创作** | README："Authoring is copy-only: creating a preset copies an existing preset's whole directory... no caller supplies composition text"；`c389f96b:packages/preset/agent-presets/src/index.ts:540`（`copy()`） | "复制已有整目录，不接受调用方直接传组合文本"——避免了"凭空生成一份未经验证的组合"，天然满足"复制授予的权限不超过源"（README："a copy grants nothing the roster did not already carry"） | 复制后不校验（"A copy is never mounted to validate... a source broken on disk yields a copy exactly as broken as the source"）——DSH 承认这是已知限制，不要把它当作"复制即验证通过" | R6 Expert Snapshot 的"Save as Expert"可参照 copy-only 模式：不接受任意文本，只能派生自已存在且可解析的基线 | 复制的预设与源之间没有版本追踪（"A copy is a snapshot that drifts"），升级基线不会同步到已复制的 Expert——SE 若要保留"Expert 追溯到基线版本"能力，需要在 copy-only 之外自建版本关联 | 无 | R6 验收需明确"复制后是否需要与源保持任何可追溯关系"，DSH 现状是完全脱钩（drift by design） |
| 14 | **agent 预设：运行中 agent 的世代绑定（generation binding）** | README："Generations keyed on the composition file... a session that finds the stamp stale starts the next generation, while sessions already joined keep the generation they run on — a running session outlives its file changing or disappearing"；`c389f96b:packages/preset/agent-presets/src/index.ts:747`（`ensureStanding`） | "文件戳（mtime+size）决定世代，已加入的 session 绑定在自己那个世代，文件改了也不影响正在跑的"——这正是 WK-64 "generation binding for running agents" 要的语义，直接可读参照 | 无 | R6/R4 的"正在运行的 agent 不受后续编辑影响，只有新会话吃到新版本"可直接对齐此模型 | **世代永不回收**（README："A superseded generation is never reclaimed... the whole subtree stays mounted until the process ends"）——长期运行的宿主会不断累积旧世代的常驻挂载，附带的文件监视器也不会释放；这是已被 DSH 自己列为"未来工作"的已知代价，不是稳定设计 | `packages/preset/agent-presets` 的 Dev Note 明确写"TODO at `ensureStanding`"需要加入引用计数——这是 DSH 自己承认的未完成态，非本卷猜测 | 若借用世代绑定语义，必须自建回收机制，不能照搬"永不回收"这一副作用 |
| 15 | **agent 预设：rediscovery（重新发现/健康检查）** | README："Discovery owns health. A directory whose composition is missing or unloadable is a broken roster row with a reason, not a skip"；"Root scans are not watched — every read hits the filesystem" | "broken 也要列出并给出原因，而不是静默跳过"——避免了"目录占着 id 却没有任何 UI 提示可删"的死角，WK-63 的 Extensions/Registries 的 Planned 文字行可参照这个"列出但标注原因"的原则 | 每次 `list()` 都是一次真实 `readdir`（无缓存、无 watch），高频轮询会有 IO 成本 | R1 Inspector 的"看到什么就是当前磁盘状态"可参照这种"不缓存、不猜测"的读法，但需评估轮询频率 | 无 | 无 | 无 |
| 16 | **scoped registry（作用域化注册表）** | 动态插件层面：README "Definitions are session-scoped and process-local: a package is visible only to the session that defined it, other sessions read it as absent"；预设层面：README "A directly-plugged subtree is absent from `ctx.loader.entries()`... rejects... an unscoped target (the preset's tools would register globally)... a row that published a service into the root realm" (`c389f96b:packages/preset/agent-presets/README.md`，"The mount audit"段) | 两层都拒绝"全局可见"：动态插件按会话隔离，预设组合按子树 scope 隔离且主动审计"是否泄漏到根 realm"——这种"默认隔离 + 主动审计泄漏"的双保险值得参照 | 无 | R3 兼容矩阵的"隔离边界"判据可参照这两条：会话可见性、服务发布到根 realm 与否 | 无 | 未核实"主动审计泄漏"（`mountPreset` 的三条拒绝规则）在并发场景下是否有已知竞态（README 提到"invariant companion re-checks... because a row publishing from a timer or an asynchronous continuation would escape the one-shot audit"，说明这是已知需要二次检查的薄弱点） | 无 |
| 17 | **live reload（开发态热替换）** | `c389f96b:packages/client/hmr/README.md`："reloads a browser client plugin in place when its bundle is rebuilt... Each reload swaps one plugin with fresh component state while the data layer (connection, runtime, and Session objects) stays untouched" | "只换 UI 插件、不动数据层（connection/runtime/Session）"——这条边界值得作为 SE 前端热更新的参照原则，即便 SE 不采用 DSH 的具体实现 | **这是开发专用机制**，README 明确"Everything here is development machinery in the browser; the model never sees it"，生产构建下完全不生效——不要把它当作生产环境的"运行时插件热替换"能力来借用 | 无直接 seam；若 SE 需要生产态热替换，这不是参照对象 | 无（开发工具，非生产契约） | 无 | 无 |
| 18 | **effect/owner cleanup（Cordis 效应清理）** | `c389f96b:docs/cordis-primer.md`："Registrations are reversible effects... installed through `ctx.effect()` or `ctx.on()` so reload and teardown unwind them predictably"；"Every registration should have a disposer... If teardown order matters, keep the related work in one effect so disposal unwinds in the intended sequence" | "谁注册、谁负责可逆的清理"这一原语——WK-64 的"效应/owner 清理"直接对应 Cordis 的 `ctx.effect()`/disposer 模型；plugin-inventory 的"invariant companion 事后复查"（见行 16 的 Open verification）说明 DSH 自己也认为一次性审计不够、需要复查机制 | 无 | R5 事务化 apply/rollback 的"撤销一次 apply 等于逆序执行其全部注册的 disposer"可直接对照这一原语设计 | 无 | 无 | 无 |

---

## 3. web UI 页面清单

DSH web 客户端没有传统路由/页面概念，而是"slot 注册 + React 组件"的组合式 UI；下表以功能面（等价于"页面"）为单位。

| 页面（功能面） | 对象 | 控件 | 状态词 | 对应 WK-63 IA 节点 | 一级/二级颗粒度 |
|---|---|---|---|---|---|
| Settings 入口 chrome（侧边栏底部触发） | 连接状态本身（无业务对象） | 触发按钮；离线/重连指示区 | `Disconnected` / `Reconnecting`（1-3 点动画）/ `Connected` | 全局 chrome，非某个节点，功能上对应 Overview 的入口 | 一级 |
| General section | `settings.general.item` 槽内各 feature 贡献的行（Permission、Language、Appearance 等） | 各行自定义控件（本包不定义具体控件） | 无统一状态词，按行各自定义 | 分散：Permission→Governance；其余不在 WK-63 既定节点内 | 容器一级、具体行二级 |
| Plugins section 可配置卡片 | host-plane 插件的配置字段（Bash、Web Search、Subagent 模型选择、Agent Loop） | 表单字段（`fields.tsx`） | 未核实（未展开逐个 Card 组件） | Extensions（plugin kind 的配置面） | 二级 |
| **Plugin Inventory tab**（`settings.plugins.tab` 槽） | Loader 非分组 entry + 每个 agent 预设展平后的 composition row | 目录搜索（`IconSearchOutline16`）；可展开卡片（`PluginCard`，`IconChevronDownOutline14`）；`StateDot`/`Tag` 状态展示；预设切换器 | `pending` / `loadingPhase`（=loading）/ `active` / `failed` / `unloading` / `unobserved`（=null，无活 Fiber） | Capabilities/Extensions 的只读镜像，是 **R1 Inspector 的现成原型** | 二级 |
| Models page | provider-config | 未核实 | 未核实 | Models | 未定（未展开源码） |
| 权限预设行（General）+ `/permission` 选择器 | host 计算的 `defaultPreset` 枚举、当前会话 `permissions` 投影 | General 行为下拉写设置；`/permission` 为 popupSelect 装饰，命中风险项时弹出确认（`confirmation` payload） | `Read Only` / `Workspace Write` / `Full access`（英文）与 `仅可查看` / `工作区内修改` / `完全权限`（中文）；`custom` 仅展示态，不可选 | Governance（权限只读解释 + 会话内切换） | General 行一级；`/permission` 选择器二级 |
| Agent 预设新会话 chip + 会话头只读标签 | 下一会话将使用的预设（stage-and-spend，一次性生效） | chip 选择器 | 无固定状态词 | 不在 WK-63 既定节点内（属会话创建流程，非 Workbench） | 一级（会话开始流程的一部分） |
| Agent 预设名册管理 section | 每个预设的 `id`/`trust`/`name`/`isDefault`/`broken`/`rows` | 复制对话框（唯一创建入口）；设为默认；删除（仅限 user 目录）；"打开所在目录"（本地桌面客户端） | `broken` 徽章 + tooltip 原因；`isDefault` 标记；shipped 预设为只读查看器 | Extensions/Registries 的预设面（system vs user 两态） | 二级 |
| **Cordis 动态插件全帧面板**（`sidebar.footer.action` 徽章） | 本进程内每个 plugin/package 的运行状态行（当前 session 分组优先，其余会话列在下方） | 批准/拒绝；run/stop/undefine 按钮；"载回此页"（reload 后重新加载 browser half） | `CordisRunStatus`：`awaiting-approval` / `starting-host` / `client-pending` / `running` / `waiting` / `rejected` / `failed` / `cancelled` / `stopped`；`CordisHalfState.status`：`absent` / `pending` / `stopped` / `running` / `waiting` / `failed` | 不在 WK-63 既定 IA 节点内；功能上是 **R1 Inspector + R4 Proposal + R5 apply 的合并原型**（模型自定义能力的注册/运行/审批/停止一体面板） | 二级 |
| `cordis_define`/`cordis_run`/`cordis_stop`/`cordis_undefine` 对话卡片 | 已记录的 tool call/result 回放（重放稳定，不含实时状态） | 只读卡片；`cordis_run` 卡片可挂业务自定义视图（`tool.view.cordis` 槽） | 沿用面板的状态词（卡片本身不产生新状态） | 会话内叙事层，非 Workbench 节点 | 一级 |
| 通用权限批准面板 | 等待中的 host 权限请求（非 Cordis 专属，覆盖 bash/工具调用等） | allow-once；reject | 未见"allow always"/"deny always"选项——README 明确"The panel exposes transient decisions only" | Governance（Permissions 的会话内瞬时决定，非持久策略） | 一级 |

---

## 4. 破坏性变更（官方 HEAD vs 本机受控下游 rc.7）

已核实两处具体断言（均以两侧 file:line 为证据），另有一处结构性新增文件；agent-presets 包内其余大段差异（discovery.ts / mount.ts / preset.ts / session.ts / types.ts / authoring.ts）因篇幅未逐行核对，不在此列出具体断言。

**a. `pluginInventory/list`：同步方法 → 异步方法，且新增 `agentPresets` 字段**

- rc.7：`99f6f02fec:packages/host/plugin-inventory/src/index.ts:56-68`
  ```
  @Remote('list')
  list(): PluginInventorySnapshot {
    ...
    return { entries }
  }
  ```
- 官方 HEAD：`c389f96b:packages/host/plugin-inventory/src/index.ts:65-88`
  ```
  @Remote('list')
  async list(): Promise<PluginInventorySnapshot> {
    ...
    const presets = this.ctx.get('agentPresets')
    if (presets === undefined) return { entries }
    const agentPresets = (await presets.compositionInventory()).map(...)
    return { entries, agentPresets }
  }
  ```
- 支撑该新增字段的整个模块 `packages/preset/agent-presets/src/composition-inventory.ts`（`c389f96b`，约 100+ 行，`AgentPresetCompositionRow`/`CompositionRowEnablement` 等类型）在 rc.7 对应路径**完全不存在**（`diff` 报 "No such file or directory"）。
- 影响：rc.7 的 `pluginInventory/list` 是纯同步、只读 Loader 快照；官方 HEAD 变成异步，且在预设名册存在时会额外拉取每个预设的展平组合行。任何按 rc.7 契约假设"同步、只有 entries 字段"的消费方（含 WK-63/64 若参照 rc.7 设计 R1 Inspector）都需要按新契约（异步、可选 `agentPresets`）重新核对。

**b. define-time 语法校验门禁：`node:vm.Script` 主导 → `new Function` 主导**

- rc.7：`99f6f02fec:packages/extensions/cordis-host-runner/src/sandbox.ts:206-211`
  ```
  export function precheckCode(code, half) {
    try {
      new Script(`(async () => {\n${code}\n})()`, { filename: `cordis-dyn-${half}.js` })
    } catch (error) { ... }
  }
  ```
- 官方 HEAD：`c389f96b:packages/extensions/cordis-host-runner/src/sandbox.ts:212-243`——门禁改为 `new Function(wrapped)`，`vm.Script` 降级为"尽力而为"的报错美化（`prettyParseContext`），并在源码注释中说明动机："hosts without a real `node:vm` (the browser worker) still refuse unparseable code"。
- 影响：这是一次面向"无真实 `node:vm` 的宿主（浏览器 worker）"的兼容性扩展，属于实现内部演进，未改变 `cordis_define` 的对外契约（校验失败仍抛同形状的教学式错误）。收录为"破坏性变更"候选是因为它改变了"校验用什么引擎"这一具体机制事实，若 WK-64 的 R2/R4 校验步骤设计参照了 rc.7 的"始终有真实 node:vm 可用"这一前提，需要重新确认。

**未逐行核对但已知存在差异（结构性提示，非具体断言）**：`packages/preset/agent-presets/src/{discovery,mount,preset,session,types,authoring}.ts` 相对 rc.7 分别有 43-183 行不等的改动量，`packages/extensions/cordis-host-runner/src/{guard,index}.ts` 另有与上述两处无关的一处内部导入路径调整（`JsonValue` 类型从 `@deepseek-ai/dsh-session/types` 迁到 `@deepseek-ai/dsh-util-values`，纯内部重构，无对外契约影响）。若 WK-64/WK-67 后续需要更细的 agent-presets 差异，需要专项复核，本卷不代为下结论。

---

## 5. 与 SE 冲突清单

- **"一 Run 一生命周期 owner"**：DSH 的动态插件生命周期确实单一 owner（`DynamicCordisRunnerService` 同时持有 registry、sandbox、fiber 生命周期、invoke 表——README 明言"a definition's whole life has one owner"），这点与 SE 原则一致，无冲突。但 agent 预设的"世代"没有 owner 释放机制（机制表行 14），已被 DSH 自己列为 TODO；SE 若采纳世代绑定语义，需要自己补上 owner 释放，否则会长期累积无主状态。
- **"GUI 不留第二份权威运行时状态"**：`ui-cordis` 面板明确坚持"事实住在可关闭者拥有的 observable 里"（README："neither keeps run state in component state... Facts live in observables owned by whoever can close them"），这与 SE 原则一致。但**批准动作本身不留痕**（README："deliberately leaves no session-log trace of a person approving, declining, running, or stopping anything"）——这与 SE 期望的"谁在什么范围内批准了什么，必须可追溯"直接冲突，是明确的"不可借用"点（已在机制表行 9 标注）。
- **"proposal ≠ commitment"**：DSH 的 `define` 与 `run` 确实是两个独立方法调用（define 无副作用，run 才生效），形式上符合"提议不等于生效"。但 DSH 没有"diff/effectiveDiff 预览"这一层——`define` 记录后，人能看到的只有面板上的 name/purpose/source，不是结构化的"这次改动影响了什么"的 diff（机制表行 1）。SE 的 R4 Runtime Proposal 若要求"diff 卡片"，DSH 现状不能直接提供这个数据形状，需要 SE 自建。
- **"权限只收紧"**：DSH 的 `approveFutureVersions` 旗标（一次性批准 vs 覆盖后续版本）是"放宽范围"的操作，而不是"收紧"——批准者主动选择让未来版本免批准，这与 SE"permission only tightens"的方向相反（SE 语境下的"tighten"通常指后续层级只能进一步限制，而不能由某次批准扩大范围到未来）。DSH 的这个旗标本质上是"用户主动放权"，若 SE 采纳类似机制，需要明确这是用户主动决定放宽（而非系统默认放宽），并且不能违反"下游只能收紧"的既有原则——两者语境不同，不能望文生义地判定为冲突，但设计时必须显式声明这不是"系统自动放宽"。
- **批准的会话边界**：DSH 的批准是帧级（frame-wide），不是会话级或用户级（机制表行 9）——"any tab can approve any session's request"，这与 SE 通常假设的"批准发生在某个明确的权限作用域内"存在结构性差异，若照搬会破坏 SE 的作用域链模型。

---

## 6. 结论（观察，不下裁定）

1. DSH 的动态插件层（`cordis-host-runner`）提供了 WK-64 六个 seam 里 R1（inspect-registry.ts）、R4/R5（immutable package + current/next 指针 + define/run/update/stop/undefine 六动词）最直接、最完整的可读参照实现。
2. 已核实的破坏性变更共 2 处（`pluginInventory/list` 同步转异步并新增 `agentPresets` 字段；define 校验门禁从 `vm.Script` 主导改为 `new Function` 主导），另有 1 处结构性新增文件（`composition-inventory.ts`），均带双侧 file:line。
3. 失败语义是 fail-stop 而非 fail-back：update 失败后 `activeRun` 变为未定义，不会自动退回旧版本继续运行——这对 R5"事务化 apply/rollback"的设计假设有直接影响，已在机制表行 4/7 标注为最高优先级的兼容风险。
4. 批准动作不留审计痕迹、且是帧级而非会话级生效，与 SE"proposal ≠ commitment 且需可追溯"及作用域链模型存在结构性冲突，是明确的"不可借用"点。
5. "creator mode"在源码中无字面对应，需要 Fable/用户先消解这个术语的具体所指，本卷不代为选择候选机制。
6. agent 预设的 system/user 两态信任、copy-only 创作、世代绑定三项机制均有直接、具体的源码依据，可作为 WK-63/64/66 的可信参照；世代永不回收是 DSH 自己承认的已知限制，非本卷猜测。
7. `packages/preset/agent-presets` 内除已核实的两点外，还有大段未逐行核对的改动（6 个文件、合计 400+ 行差异），如需更细粒度的破坏性变更清单需要专项复核。
8. web UI 没有独立"页面"路由，是 slot 注册 + 组件的组合式结构，§3 的"页面"是功能面而非 URL 意义上的路由。
9. Cordis 面板本身是一个把 Inspector/Proposal/Apply 合在一个 UI 里的先例，可作为"能否合并还是必须分离"这一 WK-63/64 决策的参考素材，但本卷不建议直接照搬其合并方式，因其批准审计缺失。
10. 本卷所有转录均标注了官方 HEAD 的 file:line；rc.7 仅用于差异比对，未作为任何机制表行的转录来源，符合用户 2026-09-09 更正的来源优先级裁定。
