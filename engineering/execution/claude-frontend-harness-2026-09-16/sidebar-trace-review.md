# 右侧工作面、卡片与执行轨迹 · Claude 施工增补

2026-09-16 · 接[主施工单](README.md)的 00、04、08、10、11；[入口清理与目录接通](frontend-entry-audit.md)继续有效。源码基线：Courtwork `f76dd7ec9f6cef845f67360cc0a22768ae309ca6`；DeepSeek Harness `0d1f50007f9bca3f52b06e1c3074fa14d5fb0720`。本轮完成定点源码与官方文档核对，未运行两套产品或验收其视觉。

**右侧栏承载正在阅读和判断的对象，不陈列后台资源清单。轨迹用于复盘实际操作，不代替成果检查。先判定一个入口是否值得保留，再决定它需要什么后端。**

## 1. 当前源码与本轮处置

| 当前面 | 固定源码事实 | 本单处置 |
|---|---|---|
| 右栏 Runtime | `surface-modules.mjs/runtimeModule` 读取 resource 总数、分项数量、frozen 与 attention 计数；未读时仍可返回 `loaded:false` 并显示未读取说明；Open 跳到 Settings | 移出生产默认右栏。配置与资源管理留在 Settings；历史 binding 留在所选执行的诊断详情。真实阻塞在原对象附近浮现，不保留泛化 Attention 数字 |
| 静态并列模块 | `surfaceModules` 把 Work、File、Workspace、Runtime 列为 peers；共同 card anatomy 并不能证明它们应同时常驻 | 废止“注册了模块便应有常驻卡片”的布局前提。按对象和用户目的选择承载面，保留已有 reader、身份和 renderer 生命周期 |
| Work / Results | Run 摘要显示 recorded time、file count；有文件就加 `Not accepted by a review.`。Inspector 也有同义说明 | 普通 Chat 产物不反复贴正式审查免责声明。版本身份与实际接受状态仍保留；正式 Matter 候选才按真实合同显示待审/冲突/已接受，而非将所有文件强制变成待审对象 |
| 文件和 Workspace 空卡 | Workspace adapter 在有 Session 时可返回未读对象，再绘制 `Workspace files have not been read.`；File 与 Results 可能指向同一成果 | 不主动打开或填满空卡。用户主动打开的对象未读、失效或读取失败时，就地显示状态与恢复；同一版本不在多个默认卡重复列出 |
| 当前 Run Inspector | 已有 exact recorded files、Usage、request measurements、Tool activity、recorded context、Run information 和 raw Event trace | 改编排并复用，不重建第二套 inspector。结果和异常先行，操作记录按需，计量与内部身份退到诊断。不同来源不等于必须四张卡 |
| 当前 raw trace | `inspector.mjs/renderRun` 已提示覆盖范围，但只渲染最后 100 条记录 | 保留原始证据与覆盖说明。可视化不得把这 100 条重新标成完整过程；需要更早事件时接已有读取能力或登记原 owner 缺口 |
| Work review summary | `work-review-summary.mjs` 从真实 Core 投影取得候选、版本和待审状态，独立于 Run | 保留有对象、有待决意义的入口。没有 Matter/待审对象的普通 Chat 不常驻显示“未绑定审查”；不能因删除 Runtime 卡而删除真正的 Review |

这些是固定源码分支，不是现场布局截图。Claude 先核本地实际 `app.mjs` 的挂载与入口：查清新版 summary/disclosure 是否已经替换某一旧模块，再删当前消费者和死引用。不得仅删除一段旧模块就宣称实际右栏已改变。

### 存废规则

一张常驻卡至少回答一个当前问题：正在看哪个对象、发生了哪项变化、依据在哪里、现在需要作什么判断或怎样从失败恢复。资源总数、内部 revision、adapter 名称、catalog 是否读过，不因可取得就获得常驻资格。

“前端反推后端”仅适用于已证明有用户价值的保留入口。无意义的 Runtime 卡应被删除，不应为它补一个更完整的统计后端。删除的是呈现和无用路径，不是日志、权限校验、配置管理或恢复能力。

## 2. 分清三种阅读任务

| 阅读任务 | 人实际需要回答的问题 | 默认内容与入口 |
|---|---|---|
| 成果检查 / Review | 改了什么？依据是什么？检查针对哪个版本？哪些仍需我判断？ | 具体文件/产物、差异、可核对的检查回执、来源、待决动作。打开该对象时进入右侧工作面 |
| 操作复盘 / Trace | 做过哪些操作？哪个失败或未返回？重复在哪里？执行与结果能否对上？ | 从所属 Run 的过程入口展开精简记录；选记录看实际输入、输出、错误和来源，必要时放大为完整过程视图 |
| 配置与技术诊断 | 哪个配置生效？使用什么 adapter？缓存、请求或恢复为何异常？ | Settings 与所选 Run 的技术详情。不会因为有字段而在正常工作旁堆叠指标卡 |

轨迹记录能支持“这次检查确实调用过”和“留下了什么结果”，不能单独证明成果正确或人的正式接受。模型的计划、说明与 reported reasoning 仍是作者输出；Host 事实、检查者结果与人的决定分源。读取轨迹不触发重新执行或新的模型调用。

官方公开先例的共同可用部分是具体对象：OpenAI 的 app review 文档围绕 diff、行内反馈与变更范围；Claude Desktop 文档围绕文件差异与检查，并将 Normal、Verbose、Summary 三种 transcript 披露方式分开，详细工具步骤用于调试。它们不支持“所有产品永远不展示任何 runtime 数据”的普遍断言，也不构成 CW 复制其全部功能的理由。来源见末节。

## 3. DeepSeek Harness：采用哪些，不搬哪些

这里消费官方仓库，不把同名社区图谱或 fork 的功能算给 upstream。

### 3.1 优先采用：顺序概览 + 精简记录 + 选中项详情

官方 `ui-trajectory` 是 Conversation 的独立轨迹读态；它不读写另一份 Chat 状态。`timeline.ts` 把顺序投影和真实时间投影分开，默认 `sequence` 为每条记录分配等宽位置；工具、回复/压缩、用户/系统等记录按类型落入不同 lane。这是顺序导航，不是耗时、进度或多 Agent 拓扑。

**CW 首片采用顺序记录，不等待不存在的供应商遥测。** 先让长 Run 的真实工具/结果与异常可定位，再用一条紧凑顺序概览帮助跳到目标；很短的 Run 没有必要再画缩略图。动作可以只改变本地选区，不要求新增后端命令。

| DSH 机制与精确入口 | CW 消费方式 | 保留的边界 |
|---|---|---|
| `ui-trajectory/src/client/timeline.ts` 的 sequence | 等宽操作概览关联原有 Tool activity 列表；选择后定位记录，错误/未返回可辨 | 无毫秒刻度；图例说明顺序。lane 表示记录类型，不暗示并行、因果或 Agent 身份 |
| `ui-trajectory/README.md` 的 turn-aware ledger | 按 CW 已有 Run、request/call 身份分组，完成的过程折叠，异常与待人响应可发现 | DSH Turn/Step 不机械等同 CW Run/模型请求。无法配对的结果明确保留，不猜一个 parent |
| `trajectory-record.ts` 的稳定 record/call/source identity | 选中记录展开输入/结果/错误与确切资源引用；历史 prepend、重连后目标不变 | 生产定位用 Run/call/seq，不消费源码里用于 fixture 的 index fallback；显示序号不成为身份 |
| `ui-tool/README.md` 的具名工具呈现 | 复用 CW reader/diff/check output，将真实读、改、查、问呈现为对应内容；文件点击进 Preview，Inspect 进所属过程 | 不从模型“已修改”文本制造变化，不从 stdout 的成功字样推断退出码；未知/歧义 tool 保持普通结果回退 |
| `ui-trajectory/README.md` 的尾部跟随与窗口加载 | 用户上翻即暂停跟随；恢复查看最新才跟随。保留稳定节点、展开和选择，按需加载较早内容 | 页面已加载范围与总记录范围分开；未加载、过滤与不存在不混淆。虚拟化只在长记录确有需要时加入 |
| `ui-sidebar-right/README.md` 的对象导航 | 同一资源版本打开已有阅读实例；折叠不占侧栏宽度，窄屏转换保持内容和对象身份 | CW 先复用单文档 reader，不照搬完整 docking kit。DSH 的布局记忆是内存态，不能借它宣称 CW 刷新后可恢复 |

工具专用呈现优先复用已经存在的 `ui-controls`、`inspector`、`markdown-reader`、Files/diff 与 DF-04 回执 renderer。记录到 renderer 的适配保持局部、有界；不为 donor 的 slot API 新建全局插件注册中心，不导入 React/Cordis 整套依赖。

### 3.2 有条件采用：真实时间带

DSH 同一源码还区分 `duration`、`time`、`actual`。其 `duration` 会压缩空闲间隔；`actual` 保留真实起止。CW 不需要首版暴露四个模式，也不能把压缩后的横轴称为真实经过时间。

只有在“查找哪一步耗时”这样的任务成立、对应记录存在明确 start/end 与计量口径时，才增加真实时间视图。没有结束时间的运行项只显示已知开始和当前状态，不补一个完成区间；已知 duration 为零与未知 duration 分开。并发 span 不能简单相加当墙钟耗时。缺时间的记录仍在顺序列表中，不被时间过滤静默丢弃。

DSH README 中 TTFT 的口径是 Step start 到首 token，并可包含先前 retry 的输出；这不等于 CW 的 Provider TTFT。CW 沿原 request telemetry owner 判断可得信息，不因 donor 有一项指标就创建同名数字。只有已记录、适用的字段才出现于该记录详情；没有 token timing 的 adapter 照样能完成操作复盘。

缩放、刷选、平移仅在真实复杂长记录场景显示增益时加入。键盘与触屏必须有等价定位和清除选区入口，不照抄 hover-only 或右键手势作为唯一通路。

### 3.3 本轮不采用

完整 docking/浮窗/自由分屏、多层永久 Inspector、全局调用大图、3D 轨迹、为美化而增加的 token/cache 图板，以及每个步骤一张独立卡，都不进入本轮。它们有自己的数据、交互与维护成本；一份可读记录已经能解决的问题，不升级成布局平台或观测平台。

不为填满视图扩大敏感日志：完整 system prompt、凭据、材料正文及 provider 不提供的内部思考不成为新采集目标。现有必要记录按当前访问合同读取；脱敏与授权不因“仅作 Debug”被绕过。

## 4. 右侧工作面的有限形态

### 默认和打开

没有主动打开对象时，右侧工作面可以关闭，不保留 Runtime/空 Workspace 占位。普通问答不为形成三栏构图而占据宽度；关闭状态仍有必要且明确的文件/检查入口。存在待授权或重要失败时，提醒在原工作流可发现，不能藏到一个必须主动寻找的诊断页。

点击文件，右侧显示该文件与确切版本；点击变更，显示差异；点击检查回执，显示它检查的版本、结果与相关输出；点击正式候选，显示该候选的依据和真实可用决定。标题随对象变化，不额外加一张“当前对象摘要卡”占去阅读空间。

这些是同一阅读位置的不同内容，不要求新增永久 Files/Changes/Checks/Trace/Runtime 五个 tab。只有同时打开的真实对象或确有同级读态时才提供切换；沿已有单文档约束逐步实现，不承诺多文档后端。

### 过程与成果互相定位，而不互相吞并

Run 的紧凑过程入口可以原位展开；需要完整复盘时在已有 Inspector 中获得足够阅读面积，不把瀑布图压进窄卡。选中的调用可回到原 Chat 位置或相应文件版本，返回恢复阅读位置。DSH 当前 README 明确不提供 anchor deep links；CW 的跨面定位需接本地导航 owner，不能声称 donor 已代为实现。

同一事实可以多处被引用，但只用一套 projection 和同一身份，不复制第二份过程状态。Model explanation、Host mutation、检查回执、Core Decision 可以在一个阅读面按必要顺序排列，不必拆成四张同等视觉重量的卡。

### 卡片与文字

独立卡片用于一个需要整体辨认/处理的对象，例如一个待授权动作或一个确切成果的检查摘要。连续步骤用行，来源用可打开引用，文件用列表，正文直接阅读。不能把每个技术字段包装成卡片，更不能让每张卡再嵌一组说明卡。

名称、必要状态和当前动作先行；相同对象不在 Run 卡、Files 卡、Workspace 卡同时展开同一清单。可见动作按真实去向命名，沿现有语义注册；默认 `Open` 只有在相邻对象已足够确定目的地时适用。图标不代替缺失的对象名称。

移除工程解释性的 `Runtime details have not been read`、全局资源数量、普通文件“未被正式接受”等常驻文字，不以更淡的灰或 tooltip 掩盖。受影响任务确需知道“检查只覆盖旧版本”“写入结果未知”时，信息必须贴近操作和对象；没有数据不等于到处生成 Unavailable 面板。

## 5. 原 owner 下的实现边界

首片直接消费现有 Session/Run 事件和 `projectThread` 的调用配对结果；真实文件及版本继续由 ArtifactHistory/资源 owner 提供，正式接受由 Core 提供。侧栏只是 projection、选择和导航，不增加新的成果效力或完成判定。

CW 已有 `renderRun`、`projectRunSummary`、`createWorkReviewSummary` 和共享 markdown reader。沿这些先例做改编排与局部提取；只有同一逻辑存在两个真实消费者时再提取共享函数，不能为了“一致”先造新的通用 schema/renderer 框架。

异步返回绑定 Session、Run、call/事件及所选资源版本；切换对象后旧回执不打开另一对象，补读历史不重编号当前目标。取消、截断、工具无 result 与效果 unknown 仍使用原合同。表示层不能将“没有记录”变成“没有发生”。

当前 raw inspector 最后 100 条的限制需要显式覆盖；可以先在已有已载数据中提供定位，后续再接读取分页。任一子集都显示自己的范围，禁止在过滤后显示“全部检查通过”或把漏项排除出分母。可视化不改变原始记录。

### 需要同步的当前规则

施工时同步 `docs/interface-components.md` 中受影响的 Runtime card/rail 描述、`surface-modules.mjs` 的 peers 注释及相关活动 frontend contract/precedent 条目，记录本次替代范围。共同 primitive 保留，不继承“后台每类对象必须有一个前台模块”的旧前提。历史证据、归档稿及旧截图不改字节。

本包只登记以上同步任务，不声称这些产品合同现在已经改好。Claude 核实际源码及 current 后在对应片一起提交，原作者/非作者证据分开。

## 6. 并入原串行队列

| 原片 | 本次增量 | 退出证据 |
|---|---|---|
| 00 | 入口价值与去留先行；移除当前生产 Runtime inventory 卡及其空位，保全 Settings、历史 binding 与阻塞修复入口 | 实际渲染路径无旧卡/死按钮；相关失败仍能恢复；不为了卡片填字段 |
| 04 | 长 Run 在既有过程投影上用精简记录；有意义的长场景再附 sequence 定位 | 调用/结果配对、错误/待响应可发现、选择与滚动稳定，无第二状态账 |
| 08 | 右侧按文件、变更、检查、正式候选的真实对象打开，去除重复摘要和无关技术数据 | 同一版本/同一决定目标；关闭/返回不丢正文、草稿或待决状态 |
| 10 | 必要计量进入所选记录/诊断；真实时间视图为条件增量，不为缺指标新建统计平台 | 缺 timing 仍可复盘；序列不假称时间；未知不补零；隐藏面停无用渲染 |
| 11 | 组合候选下检查“无右栏”“单对象”“过程复盘”“失败/恢复”四类场景 | 真实浏览器阅读与实际 Harness 结果分别留证；不以 donor 文档代替验收 |

不新增第二套 PR 编号或改变 RD-006→DF-04 的主顺序。无关页面不重新施工，已经验证的发布工作不重开；未来 Pages 换媒体仍按来源 manifest 更新。

## 7. 最小验收场景

| 场景 | 必须成立 |
|---|---|
| 普通问答、无文件/正式候选 | 右栏没有 Runtime/空 Workspace/无审查占位；Chat 可独立完成。按需仍可查看该次操作和设置 |
| 真实读→改→检查 | 从产物打开确切差异与检查回执，检查依据与文件版本一致；源文件后来改变不会把旧结果贴到新版本 |
| 失败、拒绝、等待回答、取消 | 原工作流可发现该状态；未执行、执行失败和结果未知分开，折叠不隐藏需要人的动作；进程退出不成为 Core 接受 |
| 少量数据与时间缺失 | sequence 可用但无耗时刻度；缺 start/end、缺 token clock 不填假条/数字；必要记录不因时间缺失从列表消失 |
| 长历史与过滤 | >100 事件时覆盖可理解；向前加载后选中 call、折叠、焦点不变；上翻停止自动跟随，清除筛选可回原记录 |
| A/B Session 和迟到返回 | A 的详情在切到 B 后不能浮现；同名文件不同版本不会合并；取消后迟到成功不改写结算 |
| 窄屏与宽屏 | 390/1280/1440，改变三栏时加≥1680；真实200%、明暗、键盘/IME、长中文/代码。折叠释放宽度，展开可读，不堆叠第二层窄 Inspector |
| 删除与性能 | 清掉死 action、监听、tooltip、焦点回退及旧说明；隐藏侧栏不维持纯展示用轮询/图表计算。保留有其他消费者的 Runtime binding、reader 和运行控制 |

所有“查看过程/打开详情/切换顺序或时间读态”本身均不新建 Run、不调用模型、不扩大文件权限；必须产生的查询沿现有认证读取。浏览器几何、键盘与缩放通过实际运行核验；本轮只交付文档及补丁校验。

## 8. 固定来源与消费索引

### Courtwork · f76dd7ec9f6cef845f67360cc0a22768ae309ca6

| 文件 / 符号 | 本轮阅读与结论 |
|---|---|
| [surface-modules.mjs](../../../app/web/surface-modules.mjs) · `runtimeModule`、`runModule`、`workspaceModule`、`surfaceModules` | 1–540 行；Runtime 为资源/配置摘要，静态模块 peers 前提与空卡分支 |
| [inspector.mjs](../../../app/web/inspector.mjs) · `renderRun` | 1–310 行；已有 Results/Usage/Tool activity/metadata/raw trace 与最后100条限制 |
| [summary-disclosure-projection.mjs](../../../app/web/summary-disclosure-projection.mjs) · `projectRunSummary` | 精确对象/版本和纯投影先例；非法身份不显示、部分文件不假装完整 |
| [work-review-summary.mjs](../../../app/web/work-review-summary.mjs) · `createWorkReviewSummary` | Core 投影/版本/待审事实与真正 Review 入口 |

上述相对链接导航当前工作树；固定来源用本节 SHA 与路径组合。实际开工用最新 HEAD 对账，不能把本轮 source review 算作本地产品完整验收。

### DeepSeek Harness · 0d1f50007f9bca3f52b06e1c3074fa14d5fb0720

| 官方源码入口 | 精确消费 |
|---|---|
| [ui-trajectory README](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-trajectory/README.md) | ledger/selection、加载覆盖、尾部跟随、真实 timing 边界、无跨面 anchor deep links |
| [timeline.ts](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-trajectory/src/client/timeline.ts) | 1–210 行；sequence 等宽、三种定时投影、缺时刻、压缩 idle 与区间筛选 |
| [trajectory-record.ts](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-trajectory/src/client/trajectory-record.ts) | record/call/source 身份、来源块、原输入/输出、可选计量与 fixture fallback |
| [ui-tool README](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-tool/README.md) | Runtime 配对、具名 tool view、纯模型复用、未知回退、文件→右栏/Inspect→Trajectory |
| [ui-sidebar-right README](https://github.com/deepseek-ai/deepseek-harness/blob/0d1f50007f9bca3f52b06e1c3074fa14d5fb0720/packages/client/ui-sidebar-right/README.md) | 默认收起不占宽、同内容不同展示、对象去重导航；内存态恢复与 docking 的不采纳边界 |

官方仓库声明 MIT；本轮只消费结构和行为，没有复制外部资产或引入代码/依赖。将来确需借用源码，按对应文件和包 LICENSE 逐项保留许可，不以研究引用代替依赖验收。

### 其他官方阅读先例

[OpenAI Code review](https://learn.chatgpt.com/docs/code-review?surface=app)（旧 Codex app/review 入口现重定向至此）与 [Claude Desktop](https://code.claude.com/docs/en/desktop)：采用具体文件、差异、行内意见与检查的任务导向，不作全品牌功能普查，不复制其权限或完整导航。核查日期均为2026-09-16。

本轮没有运行 DSH、CW、付费模型或真实目录；没有浏览器截图验收、发布或远端 PR。原有产品门与历史证据保持其原范围。
