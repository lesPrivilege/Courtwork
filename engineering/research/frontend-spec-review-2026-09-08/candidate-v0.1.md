# CourtWork 前端分层与自定义入口规范

**版本：0.1 · 规范候选 / 独立审查补充**  
**日期：2026-09-08**  
**状态：供 Astra 裁决与本地编单；未成为已采纳契约，未修改源码或 Paper。**

| 项目 | 固定范围 |
|---|---|
| CourtWork | `lesPrivilege/Courtwork@e0d214dbc690b7fdf4dcab5f4889c252e6b95f01` |
| Paper | `lesPrivilege/Schema-Engineering@f8ecb091895559389bb4e75f3c6f28052b71c5a3`，9.3 |
| 与上一轮关系 | 补前端分层、自定义能力、接口体例；不倒改独立初审，不重算旧测试为本轮通过 |
| 实际活动 | 阅读固定源码/契约及官方外部资料，编写本候选；未安装、未运行产品/浏览器测试、未调用真实模型 |
| 排除 | Fable 未合流内容、其他 main、Paper 9.6、私有状态与凭据 |

**总原则：可以改变位置、密度、外观与受控组合；不能借自定义入口静默改变事实、作用域、授权、决定含义或历史版本。**

本规范不要求全部能力现在实现。它规定一项能力在进入产品时怎样声明、组合、验证和退出。声明暂不支持也是合法处置；假按钮、虚构状态和没有 owner 的扩展点不是。

## 1. 规范体例与适用方法

### 1.1 四种文字的责任必须分开

| 类型 | 放什么 | 不得承担什么 |
|---|---|---|
| 规范性条款 | 必须保持的不变量、可观察行为、接口边界、错误语义 | 不夹带未经验证的“已经实现” |
| 有版本的产品配置 | 默认布局、token 数值、断点、skin、默认展开策略 | 不把本轮审美选择写成永久架构原则 |
| 资料性说明 | 来源、取舍、例子、候选、反例动机 | 不通过示例悄悄扩大 API 或权限 |
| 实现与验收记录 | 固定 SHA、owner、路径、实际测试、限制与偏离 | 不把类型存在、作者自测或文档冻结写成产品验收 |

**FN-01｜条款可判定。** 每条规范必须能定位适用对象、责任 owner、可观察结果与最小反例。`必须/不得` 为符合性要求；`应` 为默认要求，偏离须记录原因与回归；`可以` 为可选能力，不形成当前实现承诺。

**FN-02｜变更显式。** 新规范只有经裁决后才替代已采用条款。冲突应指出被替代条款与影响范围，不按文件更新时间、标题中的“冻结”或新派单自动覆盖。未解决的冲突只阻塞受影响能力，不重开整个前端。

**FN-03｜状态分轴。** `规范已采纳`、`源码已实现`、`实际实验已通过`是三种不同事实。未执行实验记 `not_run`。文档位置不决定生产地位，`engineering/**.d.ts` 不自动等于运行时 schema。

### 1.2 每个模块或自定义入口采用同一种条目

```text
ID / 名称 / 状态 / 规范版本
目的与非目标
使用者与主入口；其他入口只作同一对象的快捷方式
输入对象、identity、version、scope 与事实 owner
允许的配置；默认、继承、有效值及生效时点
允许的动作；前置条件、授权 owner、回执与副作用
加载、过时、断连、缺包、卸载、恢复和不兼容行为
视觉结构、键盘与焦点、窄屏、可访问性
固定源码映射、已执行证据、未检项、例外与回退
```

以上是文档体例，不要求每个对象拥有一份重复数据库记录，也不要求一次定义全部字段的通用 SDK。

## 2. 四条分层轴不得混写

### 2.1 用户信息与操作面

这些是任务入口分类，不是四个连续嵌套页面，也不是权限等级。

| 面 | 用户任务 | 正常内容 | 自定义入口 |
|---|---|---|---|
| Work · 工作面 | 发起、继续、阅读、处理待办、作工作决定 | Home、Thread/Composer、对象工作面、当前成果与必要 Review | 已获准 preset 的选择、局部视图偏好 |
| Inspect · 检查面 | 核对来源、版本、差异、执行与上下文 | Evidence、版本、diff、Run inspector、recorded context | 阅读方式、密度、过滤与折叠 |
| Configure · 配置面 | 改变后续运行与个人工作方式 | Settings、Runtime Workbench、资源/profile/策略、已支持的 Expert 参数 | 声明式编辑、来源检查、变更预览、显式应用 |
| Develop · 开发面 | 开发、检查和维护可执行扩展 | manifest/schema、诊断、兼容性、开发测试 | 受信代码扩展与其独立准入流程 |

**FN-04｜任务优先。** 默认路径不得要求普通用户先理解所有 runtime kind 或自行拼装能力图。Inspect 不表示证据不重要：决定所必需的 Evidence、版本、未决与后果必须在工作决定路径内可得，不能藏进开发诊断。

**FN-05｜入口一致。** 快捷按钮、命令面板、设置项、卡片与对象菜单可以通向同一能力，但必须共享目标、动作语义、授权与回执处理。高级入口、快捷键或模型提出的指令不得形成更宽的执行通道。

**FN-06｜真实对象命名。** 有限基线仍以 Session/Run 提供某些能力时，不得仅改标签为 Matter/Work 就声称连续性已实现。未绑定领域工作的普通探索合法存在。配置面允许展示未来能力目录，但必须与已可执行项分隔。

### 2.2 工程责任

下表是逻辑责任，不强制目录重排，不要求一个文件承担全部前端状态。

| 责任 | 可以拥有 | 不得拥有 |
|---|---|---|
| 视觉基础与交互原语 | token、控件、键盘/焦点基础、局部开闭状态 | provider、Matter 效力、网络授权与正式接受规则 |
| 只读投影 adapter | 权威响应到 ViewModel 的确定映射、缺失与版本标记 | 自造业务事实、推断 accepted、独立持久真源 |
| surface module / renderer | 内容结构、card/pane 等显示变体、编辑草稿、声明式 intent | Shell 的全局排列/焦点栈、任意写通道、修改其他模块状态 |
| Shell / surface host | 导航、槽位布局、实例身份、focus/overlay、mount/update/dispose | 具体 NDA 规则、正式决定的判定 |
| 指定 controller / client adapter | 经注入接口的读取、快照缓存、请求关联、pending/retry 与失效处理 | 前端自行批准、凭据持久化、未经服务端确认的正式状态提升 |
| 后端 runtime / Core owner | 准入、资源有效状态、权限、事务、正式决定与恢复 | 由 UI 的可见/可点状态反推权限成立 |

**FN-07｜一个责任一个 owner，不等于一个巨大 owner。** 纯视图不自行抓取数据；有明确委派的 controller 可以通过宿主 client 发起读取并管理可失效缓存。缓存不是第二真源，只要其身份、版本、失效与替换规则明确。不得为“单一 owner”把所有控制器强制合入 `app.mjs`。

**FN-08｜依赖边界可查。** 视图接收已声明的投影与窄 intent；正式写入必须回到相应服务。同一文件内暂时共存 view/controller 可以接受，但须标清责任，不能把 `any` payload 或任意 fetch 透传伪装成受控扩展契约。

### 2.3 视觉高度与 token

已有色彩契约建立 `Scale → Role → Usage`，并区分 frame、surface、float、overlay。这里继承该结构，不另创第二套 token owner。[CW-05]

**FN-09｜视觉层独立。** 弹窗、卡片、悬浮与展开只说明呈现和交互关系，不说明对象更权威、更安全或已经完成。自定义 layout 不得写 runtime policy；换 skin 不得改变状态词、合法动作和 Evidence 可用性。

**FN-10｜固定语义，可变外观。** theme/skin 只改获准 token 或预置映射；组件引用稳定角色，不自行定义另一套状态色解释。业务状态不能只由颜色表达。当前 lead-gray、具体半径和层色值属于已裁定产品配置；变更要显式裁决与回归，但不是 SE 永久原则。[CW-01][CW-05][EXT-05]

### 2.4 自定义等级与授权

自定义类别只描述改变什么，不表示谁有权改变。能打开编辑器，不等于能应用；能声明依赖，不等于依赖已安装；能展示动作，不等于服务端授权。

## 3. 自定义入口分类与允许范围

| 类别 | 典型对象 | 可开放的部分 | 强制保持的边界 | 基线地位 |
|---|---|---|---|---|
| Appearance / Layout | theme、密度、模块排列、折叠、快捷键 | 有界预置、获准 token、合法位置和已登记命令绑定 | 不遮掉必要风险/未知/作用域提示；不新增执行权 | 部分基础存在；不是完整用户布局编辑器 |
| Runtime Composition | instructions、skills、references、prompt templates、profile、MCP 配置/曝光/策略 | 已支持 kind 的声明式内容、资源引用、用户可管理 scope 内的策略 | CAS、父门控、准入上限、来源、历史绑定、生效时点 | 已有受限控制面；不是任意生态自动安装 |
| Work / Expert Configuration | 工作输入、playbook/fallback、规则参数、Review 布局与规则版本 | 已发布契约允许的参数；由合格 owner 决定的工作配置变更 | 改标准产生新版本；不追改旧决定，不凭 profile 成为经验证 Expert | evidence-memo 有限样本；NDA 与完整 Expert 编订仍待实现 |
| Executable Extension | custom renderer、verifier、adapter/tool 实现 | 受信来源、版本化可执行贡献及独立接口 | 独立准入、兼容、隔离声明、资源清理和历史 reader | 当前 trusted catalog；不具备任意第三方代码隔离证明 |

**FN-11｜声明式优先。** 首轮开放参数与共享原语组合。需要新可执行代码时走 Extension 开发入口，不能将 JavaScript、任意 HTML、全局 CSS 或动态模块 URL 隐藏在普通 profile 字段中。

**FN-12｜profile 不自证 Expert。** 保存了一组 resources、rules、uiSlots，只表示保存声明式运行配置。晋升为可分发 Work Expert 还要有工作语义、适用范围、专业/工程验收与发布权威；这不是前端改名能完成的步骤。[CW-07][P-01]

**FN-13｜自定义安全边界如实声明。** 回调式 API、TypeScript 类型、DOM 容器约定并不构成浏览器安全沙箱。当前同源受信 renderer 必须按受信代码对待。未来要接不受信代码，需另验隔离、网络/数据访问、消息校验和资源限制；不从“有 slot”推出安全热插拔。[EXT-03]

### 3.1 运行配置按意图组织，不按后端 enum 平铺

建议一个 Runtime Workbench 内按“做什么”组织主要分组，kind 作为过滤与识别维度保留：

| 分组 | 收纳对象 | 必须解释的区别 |
|---|---|---|
| 配置组合 | 已保存 profile 与其依赖 | profile 选择不是资源曝光；profile 不等于已验证 Expert |
| 指令与上下文 | instruction、skill、reference、prompt template；未来已支持的 memory/retrieval provider | 自动注入、目录可见、按需加载、仅生成草稿不能混同 |
| 能力与连接 | tools、MCP servers、受信 plugins | 配置/安装、连接/运行、曝光、执行许可、远端效果不同 |
| 权限与运行环境 | policy、模型/provider、已有预算与 sandbox 信息 | 推荐/请求值、用户可改值、宿主上限、当前 Run 冻结值不同 |

这是信息架构建议，不创建新的资源存储或权限分类。后端没有支持的 workflow、hook、memory_provider 等不得画成可保存、可运行的开关。

## 4. 每个设置与动作的标准解剖

### 4.1 设置条目

**FN-14｜设置必须解释其效果。** 每个可编辑项至少有稳定 ID、owner、字段约束、默认值、作用域、生效时点、持久化位置和重置行为。适用时必须同时显示以下四层：

| 层 | 含义 |
|---|---|
| Source | 导入/内置原文、版本、hash、来源可信状态 |
| Requested | 用户在当前 scope 请求的值或草稿，尚不表示已生效 |
| Effective | 服务端解析继承、父门控与权限后确认的下一次可用状态 |
| Bound | 指定历史或当前 Run 实际冻结使用的版本与参数 |

Source hash 只说明字节身份，不证明来源真实可信。UI 可以解释 provenance，但不能自行计算另一份 authoritative effective state。

**FN-15｜继承策略分对象定义。** 普通偏好可以遵循更窄作用域覆盖；权限不得因此放宽更宽层已施加的限制。外层策略的合法 owner 可以经显式授权变更其策略，不应把“不可越权”误写成“任何人永不能改变设置”。当前产品只可配置 user/workspace/session，不因类型中列出 org/agent/invocation 就开放编辑。[CW-06][CW-07]

**FN-16｜运行中的配置变化必须诚实。** 基线冻结 active Run 时，UI 可以保存本地编辑草稿，但不得声称已应用、会自动排队生效或改变当前 Run。只有后端实现了持久 pending-change 及其取消/冲突协议，才可以使用“已排队”表述。恢复默认只清除当前获准范围的 override，不重置其他范围或删除历史。

### 4.2 动作类别

| 类别 | 示例 | 后果与回执规则 |
|---|---|---|
| 视图 intent | open、collapse、filter、resize | 只改界面；无须业务确认，不得启动 Run |
| 草稿 mutation | use-as-draft、编辑待提交内容 | 保留原消息/候选身份；是否替换已有草稿须明确 |
| 配置 mutation | 更换 profile、曝光资源、修改 policy | 已授权 scope、CAS、服务端有效快照；可能影响后续执行 |
| 执行动作 | start、cancel、回答 question、allow/deny 某工具调用 | 绑定运行与具体调用；allow 不证明调用成功，cancel requested 不证明停止 |
| 正式工作决定 | accept/reject/request_evidence、后续有版本的 revise | 绑定 Candidate、基础版本、证据/规则上下文；可信 actor 与事务由 Core 控制 |
| 外部效果 | connect MCP、向外部系统写入或发送 | 区分元数据连接与业务写入；如实记录实际效果或 unknown，不暗示本地回滚可撤销远端效果 |

**FN-17｜动作统一准入。** `visible` 是界面相关性；`enabled` 是当前客户端的可用性提示；`authorized` 由执行边界复验。隐藏/禁用只改善交互，不是授权。相同命令从按钮、快捷键或其他入口调用，应经过相同 controller 与服务端边界。[EXT-01]

**FN-18｜效果不可混名。** view intent、工具 allow、成果 accept 和外部 send 不得用一个无范围的 Approve 混写。优先给动作对象化名称，例如“允许本次调用”“接受候选版本”“保存下次运行配置”。不支持批量决定时不得因为公共卡片支持选择框就增加批量批准。

**FN-19｜不确定回执。** 有命令 identity 的操作应固定 identity 与 payload 后重试；payload 改变产生新的请求，不复用旧批准。网络错误不得乐观晋升为 accepted/saved/completed。没有幂等或查询协议的操作不得自动重放，必须显示不确定并提供已实现的核查路径。

正式工作决定需要 candidate/base version；配置需要 config revision；只读导航可能只需对象 identity。不得为形式统一强迫每个 open 动作携带所有版本字段。

## 5. 扩展点与表面生命周期

### 5.1 扩展点不是任意页面注入

固定基线的 `surface-modules.mjs` 已采用静态模块表及 host intent；`AgentCompositionSource.uiSlots` 明确标注为未来组合声明。两者尚不能合称开放插件 SDK。[CW-03][CW-07]

**FN-20｜slot 由宿主定义。** 每个真正开放的 slot 必须声明 ID、允许的输入 schema/版本、目标对象类别、可发出 intent/command、布局与键盘限制、缺席回退。贡献者声明想进入的 slot，宿主根据能力、scope、兼容与可用性决定是否挂载。

**FN-21｜有限贡献。** Expert 默认贡献领域内容与受控组合，不重新实现 Shell、通用 Thread、权限批准卡、全局焦点/快捷键或另一套正式状态。确需特殊 renderer 时，其能力须单独登记；同一组件出现在多处，不产生多份独立判断/批准规则。

资料性候选登记示例（不是当前产品 ABI；不得直接作为新 API 使用）：

```yaml
id: example.nda.finding-view
specVersion: 1
slot: work.surface                 # 候选沿用语义名，非宣称已有注册功能
implementationClass: trusted-renderer
owner: nda-extension
inputContract: finding-review-packet-v1
queries: [read-bound-packet]
commands: [propose-review-decision]  # 只是请求；服务端决定是否允许
customizable: [density, disclosure]
requiredContent: [target-version, unresolved-summary, decision-consequence]
fallback: host-readonly-packet
```

不要实现一个接受任意 command 字符串或任意网络路径的“万能 dispatch”。slot 和 command 必须分别有白名单/类型契约，并由宿主映射具体实现。

### 5.2 身份与生命周期

**FN-22｜显示方式不改变对象。** 同一对象的 row/card/pane/tab 只是显示变体。实例 key 至少能区别 workspace/session 或合法 Matter scope、对象 identity、读取类别，以及有需要时的内容版本。tab index、数组位置和显示标题不得充当对象身份。

**FN-23｜折叠不等于卸载，卸载不等于删除工作。** 折叠/展开不得重新发起业务命令、隐式取消 Run、丢弃未提交编辑或切换读取版本。同对象显示变体可以复用 renderer；确需重挂时必须先定义草稿/焦点/选择的迁移。卸载后必须失效旧回调、取消订阅并按明确责任释放资源。

**FN-24｜分别处理三类版本。** 对象 version 约束读取/提交；renderer generation 约束旧实例回调；connection/request epoch 约束迟到响应。三者不得互相代替。UI 忽略旧回调不证明后端拒绝旧决定，后端 CAS 也不能阻止迟到读取覆盖当前屏幕。

| 失败条件 | 正确回退 | 不得做什么 |
|---|---|---|
| renderer 缺席，已支持的 reader 和数据仍在 | 宿主只读 packet，保留身份、版本、来源和未决 | 重执行 producer 来补页面；猜测合法按钮 |
| producer 缺席，独立 reader 仍可读 | 已支持版本的历史只读视图；新执行不可用 | 将旧 package 自动激活当恢复前提 |
| producer 缺席且没有独立 reader | 显示对象存在/引用与读取能力缺失，保持不可判定 | 显示“没有工作/没有成果” |
| schema 不兼容 | 显示可安全识别的 envelope 与错误；原始内容按获准只读方式查看 | 用字段名相似性猜 accepted 或渲染可提交动作 |
| 后端断连 | 标记最后确认快照、读取时间/版本和连接状态；保留草稿 | 旧值冒充实时，或恢复后自动重放未知命令 |

**FN-25｜历史可读是联合契约。** frontend fallback 只解决呈现。数据获取、版本 decoder、权限和原件归属必须由对应 reader/后端成立。不能仅凭 placeholder 或旧 singleton 还活着宣布 producer-independent history 已实现。

## 6. 控件、视觉与可访问性

**FN-26｜按交互行为选原语。** Tab 用于同容器切换面板；Disclosure 用于展开补充信息；Modal 用于阻断背景交互的集中步骤。不能因为视觉像卡片就任意套 dialog，也不能因为某页面是高级配置就必须模态化。采用对应的标签关系、键盘顺序和焦点恢复；APG 是实现参考，不是复制 markup 即完成产品符合性。[EXT-04]

**FN-27｜自定义受可用性下限约束。** 可变密度、顺序、悬浮位置、颜色与动效必须保留键盘操作、可见焦点、必要文本、长内容/窄屏可读性。只有指针拖动而无键盘等价路径的排列器不得作为唯一入口。字号/缩放和减少动态效果不能改变权威状态。

现有产品约定的桌面 32px、窄屏 44px 命中区是本地设计选择，不是 WCAG 2.2 AA 的通用原文要求。WCAG 2.5.8 是 24×24 CSS px 或适用例外；只量图标、圆形外接框或截图不能直接证明命中区符合。WCAG 2.4.11 要求焦点组件不被作者内容完全遮住，本产品可以采用更严格的焦点完整可见目标，须分别记录。[CW-01][EXT-06][EXT-07]

**FN-28｜状态事实不由装饰补写。** 未知不同于失败，也不同于成功；缺数据不同于 0、空列表或无对象。loading/error/stale/unsupported 必须有可辨状态。必要状态和动作不能仅依赖颜色、hover 或动画。[CW-04][CW-08][EXT-05]

**FN-29｜主题与实验不污染已采用基线。** 现有灰阶/skin 裁定继续作为默认。允许做视觉替代对照，但实验 skin、未接 STATIC 的文件、Figma/截图原型不得记为用户已可选择的产品能力。任意 CSS 注入不属于本轮普通用户自定义入口。

## 7. 三个贯穿例子

### 7.1 Home 新增热力图

先确定数据 owner、时间窗口、日界与缺失值；随后决定 module slot、card/expanded 变体和有无合法 drill-down。颜色档位只能表达声明指标，不能变成“工作完成度”。当前没有合法数据 endpoint 时，只在能力目录/开发计划显示未实现，不在默认 Home 填随机或伪实时数据。已有 presentation contract 已把 Heatmap 标为 endpoint gap，不应另造一份“已实现”卡片。[CW-08]

用户调换热力图与其他模块的位置属于 view preference，不影响计数口径；跨屏变为紧凑行也不改变同一 bucket 的解释。

### 7.2 用户给出链接，要求接入能力

```text
用户/模型提出来源
→ 在获准网络范围内获取，或明确表示当前不支持 locator
→ 固定实际字节、来源与可信状态
→ 解析、校验、列出依赖/作用域/能力与潜在外部效果
→ 形成配置草稿或有版本的变更提案
→ 用户/合法 owner 应用
→ 服务端确认有效配置
→ 有需要时显式连接/曝光；实际调用仍独立授权
```

读取外部来源本身可能有网络/隐私效果，因此“只检查”不等于无任何副作用。预览不得执行包脚本或静默接通第三方服务。基线 source resolver 尚无完整 locator 获取与安装闭环；以上为目标交互契约，不是现成功能。[CW-09]

### 7.3 用户沉淀一个自定义 Expert

先保存受限运行 profile；有工作语义时，将经过 Review 的规则和配置编订为有版本工作包候选。领域标准变化走对应的规则治理，界面布局变化走 presentation preference，两者版本不混用。完成既定 E2E/发布门后才能标为可分发 Expert；继续允许低后果的个人 profile 使用，不把其禁止为“未认证不可用”。[P-01]

用户可改变 Review 视图列宽、折叠或已定义字段顺序，但不得把必读的 unresolved、版本和接受后果从唯一决定路径移除。共享 Review 原语负责控件；领域 Core 决定合法动作。

## 8. 固定基线对账与最小施工

### 8.1 不是从零另建规范

| 已读对象 | 可以继承 | 需要补写，不宣称已实现 |
|---|---|---|
| `docs/interface-components.md` | Navigator/Work/Inspector、原语和 owner、edit-as-draft | 分离永久语义、当前视觉配置与验收段落 |
| `docs/ui-orchestration-contract.md` | 导航身份、命令 pending、正式状态、决定与视图分离 | 升为条款 ID + owner + 反例，不复制第二份事实状态表 |
| `app/web/surface-modules.mjs` | 静态模块表、事实 adapter、card/pane、host intents | 公共 slot 契约、用户排列能力与受信贡献准入尚需裁决 |
| `app/web/runtime-view.mjs` | 显式 scope、服务端快照、注入 request、CAS 交互 | 设置条目统一体例；不能把该 controller 当违规“纯视图 fetch” |
| `app/runtime/control-contract.d.ts` | kind、scope、policy、source/effective/bound、声明式 profile | `uiSlots` 不是已落地 renderer 注册；所有 kind 不是都可执行 |
| `review-projection.md` | permission/question/outcome 与正式 accept 的分离 | 领域 packet 不挤进一堆任意 optional 字段；沿 H1/H3 定义 |
| `presentation-primitives.d.ts` | 缺失、时间、只读 intent、Heatmap gap | 类型不能证明已接线或可访问性；实际命令门分开 |
| `color-governance.md` | Scale/Role/Usage、视觉高度、默认 skin | 规范元数据/例外与实际可选择能力分开；视觉选择仍需用户裁决 |

以上为本轮阅读到的结构事实，不表示这些文件全部路径均已验证，也不表示每项候选都阻塞当前 experimental Pages。[CW-01]–[CW-09]

### 8.2 工单建议

| 阶段 | 交付 | 不做 |
|---|---|---|
| FE-S0 · 规范归一 | 本规范裁决；把现有来源条款映射到一个主索引，保留原始版本与例外 | 不重写全部样式，不批量改目录 |
| FE-S1 · 入口目录 | 盘点现有入口的 ID、位置、对象、权限、scope、能力状态和 owner；共享命令映射 | 不做任意插件市场，不虚构 backend API |
| FE-S2 · 生命周期/状态收口 | 用现有 Surface host、Runtime controller、Review 类型补联合反例 | 不新建第二份 state/store、全局万能 event bus |
| FE-S3 · 领域接线 | H1 packet 与 model-visible state reader 稳定后，H3 接领域 surface/合法动作 | 不用通用 permission 信封冒充成果决定 |
| FE-S4 · 扩展开发面 | 只有确需新增受信 renderer/verifier 才开放有版本 slot 与准入 | 不将任意代码入口包装为普通配置 |

完整 Runtime Workbench 新布局不应抢占 R-01 收尾正确性、R-02 当前工作披露、真实 provenance 与同 Matter 续行。前端规范负责使这些事实可解释，不代替后端修复。

## 9. 符合性与最小反例矩阵

所有下列实验在本轮均为 **not_run**。表中“门槛”是候选验收条件，不是已有通过记录。

| ID | 关联条款 | 反例/操作 | 观察与门槛 |
|---|---|---|---|
| FE-T01 | FN-04/06/28 | 无任何领域绑定、无数据、读取失败三种启动 | 普通探索可用；未绑定不叫空 Matter；error 不显示为 0/空成功 |
| FE-T02 | FN-05/17/18 | 同动作经按钮、键盘、其他入口发起 | 同目标与准入；不能从高级入口绕过检查 |
| FE-T03 | FN-14/15/16 | user deny，session 请求 allow；同时更换 profile | 请求值与有效值分开；权限不放宽；历史 bound 不变 |
| FE-T04 | FN-14/16/19 | 两个客户端基于同 config revision 提交；Run 活跃时修改 | 冲突可见，草稿保留；无静默覆盖、假排队和乐观生效 |
| FE-T05 | FN-11/12/13/20 | 导入未知 slot、含脚本的 profile、缺依赖配置 | 不执行/不自动安装；字段/缺口可解释；不授予 Extra 权限 |
| FE-T06 | FN-18/19 | allow 后 tool 失败；accept 回执丢失；cancel 请求未结算 | 三类事实不混同；不确定不变成功；按现有协议核查，不自动重放 |
| FE-T07 | FN-22/23/24 | 打开 A 后转 B，迟到 A 返回；card 展开再收起 | B 不被覆盖；同对象不重新执行、不清新草稿；焦点正确 |
| FE-T08 | FN-20/21/25 | renderer 缺席、producer 缺席、decoder 不兼容分别注入 | 分别正确只读回退或解释不可读；不伪造对象不存在，不执行旧代码 |
| FE-T09 | FN-09/10/27/29 | 已批准 skin/密度/排列变更；窄屏/缩放/减少动态效果 | 状态与合法动作相同；焦点、必要信息和命中区仍可用 |
| FE-T10 | FN-26/27 | 只用键盘进入 tab、展开、打开/关闭 dialog、切换会话 | 标签与焦点关系明确；无被悬浮层完全遮住的焦点；IME 不误触发命令 |
| FE-T11 | FN-12/18/25 | 规则版本升级，读旧 candidate/Decision | 使用历史解释，不按新规则追改旧效力；审查与规则配置分开 |
| FE-T12 | FN-14/28 | Heatmap 缺数据、日界不支持、分页截断、usage missing | 不伪造今日、总量、成功率；范围/截断/缺失明确 |

自动化检查可覆盖类型、映射、身份、CAS、截图几何与部分可访问性；键盘、辅助技术、真实网络/模型与专业 Review 分开记录。不得用“前端测试全绿”替代跨模块或专业效果结论。

## 10. 建议保留的最小文档结构

首轮只需要 **一份主规范 + 一份入口/条款映射表 + 已有契约文件的定向修订**。入口映射表可以先作为本规范附表，不强制新建文件。

后续确有多个消费者时，再从稳定条款提取版本化 schema/公共类型。测试夹具从同一接口定义消费，不复制一份内容相似、语义不同的字段表。研究来源在资料附录，当前实现状态继续由工程唯一 current 管理。

建议交回 Astra 的记录字段为：`条款ID → 采用/改写/延后/拒绝 → 原因 → owner/现有工单 → 固定源码 → 证据等级 → 剩余反例`。本候选不自动成为任何 accepted DEC。

---

## 附录 A · 实际阅读范围与来源

### A.1 本轮新增读取的冻结材料

所有 CourtWork 文件使用上文完整 SHA。范围限下表，不把目录枚举计作全文阅读。

| 来源 ID | 文件与本轮范围 | Git blob |
|---|---|---|
| CW-01 | `docs/interface-components.md` 全文 | `e2c6de8e26189b910aa7e19c755ca58fbf636e04` |
| CW-02 | `docs/ui-orchestration-contract.md` 全文 | `eabb536ccc4f353d62fe7fc3774b908617bf5222` |
| CW-03 | `app/web/surface-modules.mjs` 局部：模块责任、run/file/workspace 与 runtime 卡片；返回尾部截断 | `903e3eb42c8bf87fb038a532e793189cb541c8da` |
| CW-04 | `engineering/mvp/execution/work-surface-kit/contracts/review-projection.md` 全文 | `4eb7546bf0b95bea59e0b3b3cae51774b564b17d` |
| CW-05 | 同目录 `color-governance.md`，1–150 请求范围内返回全文 | `e1e411b770ef98d79106951c37ea4bd37de9cf2a` |
| CW-06 | `app/web/runtime-view.mjs` 1–180 | `54775b8b5fe593fb6c8e65ac3f1ffd1920046142` |
| CW-07 | `app/runtime/control-contract.d.ts` 1–160 | `1e8bbeed1115823fd45a71dee7b783b6a2163821` |
| CW-08 | `engineering/mvp/execution/work-surface-kit/contracts/presentation-primitives.d.ts` 1–230 | `6b51b46e965db04e78163bfa58883368a8ff40ce` |

CW-09 为上轮已读 `engineering/current.md` 和 `engineering/execution/2026-09-08-main-round/README.md` 的范围说明，本轮未重新审计 source resolver；P-01 为上轮固定 9.3 Canonical §8/§13–15 与 Practice。上一轮报告在本轮只局部复读，不重新声明全报告或全树阅读。

### A.2 固定链接

- [CW-01](https://github.com/lesPrivilege/Courtwork/blob/e0d214dbc690b7fdf4dcab5f4889c252e6b95f01/docs/interface-components.md)
- [CW-02](https://github.com/lesPrivilege/Courtwork/blob/e0d214dbc690b7fdf4dcab5f4889c252e6b95f01/docs/ui-orchestration-contract.md)
- [CW-03](https://github.com/lesPrivilege/Courtwork/blob/e0d214dbc690b7fdf4dcab5f4889c252e6b95f01/app/web/surface-modules.mjs)
- [CW-04](https://github.com/lesPrivilege/Courtwork/blob/e0d214dbc690b7fdf4dcab5f4889c252e6b95f01/engineering/mvp/execution/work-surface-kit/contracts/review-projection.md)
- [CW-05](https://github.com/lesPrivilege/Courtwork/blob/e0d214dbc690b7fdf4dcab5f4889c252e6b95f01/engineering/mvp/execution/work-surface-kit/contracts/color-governance.md)
- [CW-06](https://github.com/lesPrivilege/Courtwork/blob/e0d214dbc690b7fdf4dcab5f4889c252e6b95f01/app/web/runtime-view.mjs)
- [CW-07](https://github.com/lesPrivilege/Courtwork/blob/e0d214dbc690b7fdf4dcab5f4889c252e6b95f01/app/runtime/control-contract.d.ts)
- [CW-08](https://github.com/lesPrivilege/Courtwork/blob/e0d214dbc690b7fdf4dcab5f4889c252e6b95f01/engineering/mvp/execution/work-surface-kit/contracts/presentation-primitives.d.ts)
- [CW-09 current](https://github.com/lesPrivilege/Courtwork/blob/e0d214dbc690b7fdf4dcab5f4889c252e6b95f01/engineering/current.md)
- [P-01 Canonical](https://github.com/lesPrivilege/Schema-Engineering/blob/f8ecb091895559389bb4e75f3c6f28052b71c5a3/papers/src/canonical.md)
- [P-01 Practice](https://github.com/lesPrivilege/Schema-Engineering/blob/f8ecb091895559389bb4e75f3c6f28052b71c5a3/papers/src/practice.md)

### A.3 外部一手资料（访问：2026-09-08）

这些是规范编排与实现参考，不用于以最新上游否定固定旧版，也不证明 CourtWork 已实现。

| ID | 来源 | 借鉴范围 |
|---|---|---|
| EXT-01 | [VS Code Contribution Points](https://code.visualstudio.com/api/references/contribution-points) | 声明式配置 schema、scope、command/menu/enablement 分离 |
| EXT-02 | [VS Code Common Capabilities](https://code.visualstudio.com/api/extension-capabilities/common-capabilities) | 统一命令与多入口，不复制其整套产品架构 |
| EXT-03 | [VS Code Webview API · Security](https://code.visualstudio.com/api/extension-guides/webview#security) | 最小能力、内容策略与输入处理；不声称本项目具备同等隔离 |
| EXT-04 | W3C APG [Tabs](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)、[Dialog](https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/)、[Disclosure](https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/) | 交互模式、语义与焦点；不是产品认证 |
| EXT-05 | [WCAG 2.2 Understanding 1.4.1](https://www.w3.org/WAI/WCAG22/Understanding/use-of-color.html) | 不仅凭颜色传达状态 |
| EXT-06 | [WCAG 2.2 Understanding 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html) | 24×24 CSS px 与适用例外；不等于固定 44px |
| EXT-07 | [WCAG 2.2 Understanding 2.4.11](https://www.w3.org/WAI/WCAG22/Understanding/focus-not-obscured-minimum) | 焦点组件不完全被遮挡，与本地更严格目标分开 |

## 附录 B · 一个完整条款示范

**ID：FN-16 · active Run 下的配置编辑。**  
**适用：** Runtime 配置面及其全部快捷入口。  
**Owner：** 后端 RuntimeService/control-plane；前端指定 Runtime controller 负责草稿与回执呈现。  
**前置：** Run 已绑定配置，服务端报告 active/frozen。  
**必须：** 保持当前 bound 配置不变；可检查 Source/Effective/Bound；编辑草稿要与已生效状态分开。  
**不得：** 不经服务端支持声明“已排队自动应用”，不以局部按钮禁用替代服务端拒绝。  
**失败：** CAS conflict 保留输入并要求重新核对；网络不确定不自动重放无幂等保证的变更。  
**最小反例：** 同时由两个入口编辑；服务端状态在点击前变更；应用成功后响应丢失；切换 Session 后旧响应到达。  
**验证：** FE-T03/04/07，固定源码与实际结果另附。  
**基线：** 受限 CAS 与运行冻结存在；更完整配置草稿/排队能力不得从本条倒推已经实现。  
**例外：** 若未来契约允许一类明确 run-local 的安全变化，必须定义独立动作、版本、可撤销性与当前绑定影响，不能沿用“普通设置覆盖”。
