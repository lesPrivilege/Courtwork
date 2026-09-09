# 前端分层与自定义入口规范

版本 1.0-候选 · 2026-09-08 · Fable 裁决与归一。来源：独立审查候选 [v0.1](../research/frontend-spec-review-2026-09-08/candidate-v0.1.md)（基于 `e0d214d` / Paper 9.3；本轮按 `main` `8023e1b` 与 Paper 9.6 校正），既有 WK / DC / UP / RC 裁定，[work-surface-boundaries](work-surface-boundaries.md)、[interface-components](../../docs/interface-components.md)、[ui-orchestration-contract](../../docs/ui-orchestration-contract.md)、[review-projection](../mvp/execution/work-surface-kit/contracts/review-projection.md)、[color-governance](../mvp/execution/work-surface-kit/contracts/color-governance.md)、[presentation-primitives.d.ts](../mvp/execution/work-surface-kit/contracts/presentation-primitives.d.ts)、`app/runtime/control-contract.d.ts`。

本页是前端分层与自定义的**主规范**：条款只定对象、接口、状态与权限；布局、像素与 token 值留在有版本的产品配置（体例三份与 color-governance）。`规范已采纳`、`源码已实现`、`实验已通过` 是三种事实，各条款在附录 A 分列。

> 位置、密度、外观和受控组合可以改变；事实、作用域、授权、决定含义和历史版本不能随之改变。

条款编号沿候选 FN-01…29，便于对账；被改写者在附录 A 注明。规范词：`必须 / 不得` 为符合性要求；`应` 为默认要求，偏离须记录；`可以` 为可选能力，不构成实现承诺。

## 1. 四条分层轴分开

| 轴 | 回答 | 不得混同 | 承载文件 |
|---|---|---|---|
| 信息与操作面 | 用户此刻在工作、检查、配置还是开发 | 二级页面 ≠ 低重要性；开发入口 ≠ 更高权限 | 本页 §2 |
| 工程责任 | 谁读事实、谁管请求、谁呈现、谁定状态 | 单一 owner ≠ 全部逻辑在一个文件 | 本页 §2.2、interface-components |
| 视觉高度 | 底框 L0 / 工作面 L1 / 悬浮 L2 / 覆盖 L3 | 弹窗更突出 ≠ 内容更权威 | WK-69、color-governance |
| 自定义范围 | 改外观、运行配置、工作规则还是可执行代码 | 能编辑声明 ≠ 能执行；能执行 ≠ 能正式接受 | 本页 §3 |

**FN-01 条款可判定。** 每条定位对象、owner、可观察结果与最小反例。**FN-02 变更显式。** 新条款经裁决才替代旧条款，冲突只阻塞受影响能力。**FN-03 状态分轴。** 类型文件与文档冻结不等于运行时实现；未执行的实验记 `not_run`。

## 2. 操作面与入口

### 2.1 四个面

| 面 | 用户任务 | 现有承载 | 自定义入口 |
|---|---|---|---|
| Work | 发起、继续、阅读、处理待办、作工作决定 | Home 三带（WK13）、Chat Flow、L2 悬浮工作面、Composer | 已获准 preset 选择、局部视图偏好 |
| Inspect | 核对来源、版本、差异、执行、上下文 | Run / File / Workspace 模块与展开面、recorded context | 阅读密度、过滤、折叠 |
| Configure | 改变后续运行与个人工作方式 | Settings 整页（WK12）：General / Appearance / Keyboard / Runtime（WK11）/ Developer | 声明式编辑、来源检查、变更预览、显式应用 |
| Develop | 开发、检查、维护可执行扩展 | Settings › Developer：Extensions 生命周期、Planned、runtime-info | 受信代码扩展与独立准入 |

**FN-04 任务优先。** 默认路径不得要求普通用户先理解 runtime kind。决定所需的 Evidence、版本、未决与后果必须在 Work 面的决定路径内可得，不藏进 Inspect 或 Develop。**FN-05 入口一致。** 按钮、快捷键、菜单、设置项通向同一能力时共享目标、动作语义、授权与回执；高级入口不得形成更宽的执行通道。**FN-06 真实对象命名。** 以 Session / Run 提供的能力不得改标签为 Matter 就称连续性已实现；配置面的未来能力目录与已可执行项分隔（WK-27 Planned 行）。

### 2.2 工程责任

| 责任 | 可以拥有 | 不得拥有 | 现有落点 |
|---|---|---|---|
| 视觉基础与交互原语 | token、控件、键盘 / 焦点基础、局部开闭 | provider、效力、授权 | `ui-controls.mjs`、styles、brand |
| 只读投影 adapter | 权威响应 → ViewModel 的确定映射、缺失与版本标记 | 自造业务事实、推断 accepted、独立持久真源 | `thread-projection.mjs`、`presentation-adapters.mjs`（WK13） |
| surface module / renderer | 内容结构、row / card / pane 变体、编辑草稿、声明式 intent | Shell 布局与焦点栈、任意写通道、他模块状态 | `surface-modules.mjs`、`evidence-memo/renderer.mjs` |
| Shell / surface host | 导航、槽位、实例身份、focus / overlay、mount / update / dispose | 领域规则、正式决定判定 | `app.mjs` |
| 指定 controller | 经注入 client 读取、快照缓存、请求关联、pending / retry、失效 | 前端批准、凭据持久化、未确认的正式状态 | `runtime-view.mjs`、WK12 settings controller |
| 后端 runtime / Core | 准入、有效状态、权限、事务、正式决定、恢复 | 由可见 / 可点反推权限 | service、control-plane、Core |

**FN-07 一个责任一个 owner，不等于一个巨大 owner。** `app.mjs` 保持会话状态、Run 准入 / 恢复、导航与渲染器生命周期的 owner（interface-components）；有委派的 controller 经宿主 client 读取并持有可失效缓存，缓存的身份、版本、失效与替换规则明确即不构成第二真源。**FN-08 依赖边界可查。** 视图只收已声明投影与窄 intent；同文件暂存 view / controller 须标清责任，不以 `any` payload 或任意 fetch 冒充受控契约。

### 2.3 视觉高度与 token

**FN-09 视觉层独立。** L0–L3 只说明呈现与交互关系；自定义 layout 不得写 runtime policy，换 skin 不得改状态词、合法动作与 Evidence 可用性。**FN-10 固定语义，可变外观。** theme / skin 只改 Tier S 或预置映射；组件引用 Role，不自定义状态色解释；业务状态不能只由颜色表达。lead-gray、半径与层色值是已裁定产品配置，不是永久原则。

## 3. 自定义分类与授权

| 类别 | 典型对象 | 可开放 | 必须保持 | 当前地位 |
|---|---|---|---|---|
| Appearance / Layout | scheme、skin、密度、字号、代码字体、reduced motion、模块顺序、已登记命令的快捷键 | 有界预置、获准 token、合法位置 | 状态含义、必要提示、合法动作、对象身份、键盘可用性 | WK12 交付 scheme / skin / 字号 / 字体 / motion；模块顺序与快捷键重绑定为 `可以` |
| Runtime Composition | instruction、skill、reference、prompt template、profile、MCP 配置 / 曝光 / 策略 | 已支持 kind 的声明式内容与用户可管理 scope 内策略 | 来源、CAS、父门控、权限上限、历史绑定、生效时点 | RC 模块已在；WK11 组织 |
| Work / Expert Configuration | 工作输入、playbook / fallback、规则参数、Review 布局与规则版本 | 契约允许的参数；合格 owner 的配置变更 | 规则变更的 owner、版本与审查；旧决定不被追改 | evidence-memo 样本；NDA 与 Expert 编订待 H0–H2 |
| Executable Extension | custom renderer、verifier、adapter / tool 实现 | 受信来源、版本化贡献、独立接口 | 独立准入、兼容、隔离声明、清理责任、历史 reader | trusted catalog；无第三方隔离证明 |

**FN-11 声明式优先。** 需要新可执行代码时走 Develop 入口；不得把 JavaScript、任意 HTML、全局 CSS 或动态模块 URL 藏在 profile 或 skin 字段（WK-78 用户 skin 只接受 Tier S token）。**FN-12 profile 不自证 Expert。** 保存 resources / rules / uiSlots 只是保存声明式运行配置；可分发 Work Expert 另需工作语义、适用范围、验收与发布权威（Paper 9.6 §8）。两个动作分名："Save my runtime configuration" 与 "Publish a Work Expert"，前者不因后者未成立而禁止。**FN-13 安全边界如实。** 回调式 API、类型与 DOM 容器约定不是沙箱；当前同源 renderer 按受信代码对待；接不受信代码前另验隔离、网络 / 数据访问、消息校验与资源限制（harness-core §3 同一裁定）。

**2026-09-09 修订（WK-90）：** Configure 面的顶层分组改为 General / Appearance / Models / Tools & Integrations / Skills / Memory / Permissions / Keyboard / Developer；下表的意图分组保留为对象归属，落位改为 Developer › Runtime（Overview、Composition）、Skills（Instructions & context）、Tools & Integrations（Capabilities & connections）、Permissions 与 Models（Permissions & environment）。用户可见词表以 [intake-round-3 WK-89](../mvp/execution/work-surface-kit/intake-round-3.md) 为准。

### 3.1 Runtime 组按意图分组（WK-82，改写 WK-63 导航）

| 意图分组 | 收纳 | 必须解释的区别 | WK-63 节点 |
|---|---|---|---|
| Overview | effective runtime、attention（health、pending 权限、未签名插件） | 当前 vs 下次 Run | Overview |
| Composition | profile 及其依赖与适用范围 | 选 profile ≠ 曝光资源 ≠ 已验证 Expert | 新（原散在 Governance） |
| Instructions & context | instruction、skill、reference、prompt template；未来已支持的 memory / retrieval | 自动注入 / 目录可见 / 按需加载 / 仅草稿 | Context |
| Capabilities & connections | tools、MCP servers、受信 plugins | 配置 / 连接 / 曝光 / 许可 / 远端效果 | Capabilities + Extensions |
| Permissions & environment | policy、模型 / provider、预算与 sandbox 信息 | 请求值 / 有效值 / 宿主上限 / 当前 Run 冻结值 | Models + Governance |

`kind` 保留为过滤与识别维度；不支持的 workflow / hook / memory_provider / registry 只作 Planned 行。Models 与 General › Connection 同一数据源，只在 General 编辑（WK-78）。

## 4. 设置条目与动作

### 4.1 设置条目

**FN-14 设置解释其效果。** 每个可编辑项有稳定 ID、owner、约束、默认、scope、生效时点、持久化位置与重置行为；适用时显示四层：

| 层 | 含义 | 现有来源 |
|---|---|---|
| Source | 原文、版本、hash、来源可信状态 | `GET /runtime-resources/:id`，RC-8 |
| Requested | 用户在当前 scope 请求的值或草稿，尚未生效 | 前端草稿（新增） |
| Effective | 服务端综合继承、父门控、权限后的下一次可用状态 | `/runtime-control` 快照，RC-2 / RC-3 |
| Bound | 指定 Run 实际冻结使用的配置 | `runtime.bound`，RC-5 |

hash 只说明字节身份；UI 不自算另一份 effective。**FN-15 继承按对象定义。** 偏好可由窄 scope 覆盖；权限不得放宽宽层限制；外层 owner 可经显式授权改其策略。当前只可配置 user / workspace / session。**FN-16 运行中的配置变化诚实。** active Run 冻结时可保留本地草稿，不得称"已应用"或"结束后自动生效"；后端有持久 pending-change 协议前不用"已排队"。恢复默认只清当前获准范围的 override。

### 4.2 动作类别（闭集）

| 类别 | 示例 | 回执规则 | 现有契约 |
|---|---|---|---|
| 视图 intent | open、collapse、filter、resize | 只改界面，不启动 Run | surface host intents（WK-41） |
| 草稿 mutation | use-as-draft、编辑待提交内容 | 保留原身份；替换已有草稿须明确 | RC-7、Edit as new message |
| 配置 mutation | 换 profile、曝光、改 policy | 已授权 scope、CAS、服务端快照 | RC-4 |
| 执行动作 | send、cancel、answer、allow / deny 某调用 | allow ≠ 调用成功；cancel requested ≠ 已停止 | review-projection permission / question |
| 正式工作决定 | accept / reject / request_evidence、有版本的 revise | 绑定 Candidate、base version、证据上下文；actor 与事务由 Core | H1 / H3、frontend-entries §3 |
| 外部效果 | connect MCP、向外写入或发送 | 元数据连接 ≠ 业务写入；unknown 如实 | RC-6、mcp_effect_unknown |

**FN-17 动作统一准入。** `visible` 是相关性，`enabled` 是客户端可用性提示，`authorized` 由执行边界复验；同一命令的所有入口经同一 controller 与服务端边界。**FN-18 效果不可混名。** 不用无范围的 Approve；动作对象化命名（Allow this write · Accept this version · Save for next run）；不支持批量决定时不因公共卡片有选择框而增加批量批准。**FN-19 不确定回执。** 有 identity 的操作固定 identity 与 payload 后重试；payload 变则新请求；网络错误不乐观晋升；无幂等或查询协议的操作不自动重放。只读导航不强制携带版本字段。

## 5. 扩展点与生命周期

**FN-20 slot 由宿主定义。** 开放的 slot 声明 ID、输入 schema / 版本、目标对象类别、允许 intent / command、布局与键盘限制、缺席回退；贡献者声明意向，宿主按能力、scope、兼容与可用性决定挂载。`control-contract.d.ts:74` 的 `uiSlots` 是组合声明，不是 renderer 注册（WK10b 热插拔按此实现）。**FN-21 有限贡献。** Expert 贡献领域内容与受控组合，不重建 Shell、Thread、权限卡、全局焦点 / 快捷键或第二套 Review 状态；特殊 renderer 单独登记。不实现接受任意 command 字符串或任意网络路径的万能 dispatch。

**FN-22 显示方式不改变对象。** row / card / pane / tab 是显示变体；实例 key 含 scope、对象 identity、读取类别与必要的内容版本；tab index 与标题不充当身份（WK-56）。**FN-23 折叠 ≠ 卸载 ≠ 删除。** 折叠 / 展开不重发命令、不取消 Run、不丢草稿、不换读取版本；卸载后失效旧回调并释放资源。**FN-24 三类版本分开。** 对象 version 约束读 / 提交；renderer generation 约束旧实例回调；request epoch 约束迟到响应（`sessionEpoch` 已有）。

| 失败条件 | 正确回退 | 不得 | 落点 |
|---|---|---|---|
| renderer 缺席，reader 与数据在 | 宿主只读 packet：身份、版本、来源、未决 | 重跑 producer；猜按钮 | WK10b 第一段 5 |
| producer 缺席，独立 reader 可用 | 历史只读视图；新执行不可用 | 自动激活旧包 | H3 → frontend-entries 3.3 |
| producer 缺席且无 reader | 显示对象存在与读取能力缺失 | 显示"没有成果" | 同上 |
| schema 不兼容 | 可安全识别的 envelope 与错误 | 按字段名猜 accepted | H4 触发 |
| 后端断连 | 最后确认快照 + 时间 / 版本 + 连接状态；保留草稿 | 旧值冒充实时；自动重放 | 现有 connection-status |

**FN-25 历史可读是联合契约。** 前端 fallback 只解决呈现；数据获取、版本 decoder、权限与归属由后端 reader 成立（H3）。

## 6. 控件、视觉与可访问性

**FN-26 按交互行为选原语。** Tab 用于同容器切换；Disclosure 用于展开补充；Modal 只用于阻断背景的集中步骤，并处理焦点进出。Settings 因此为页面而非模态（WK-78）；并且 settings-active 时全局侧栏不渲染（离开无障碍树与焦点顺序，不是只藏起来），Settings 自身的分组导航是此时唯一的导航，Back to app 与 Escape 返回进入前的位置（WK-116，CC-S 落地）。**FN-27 自定义受可用性下限约束。** 密度、顺序、悬浮位置、颜色与动效变更保留键盘操作、可见焦点、必要文本、长内容与窄屏可读；只有指针拖动的排列器不得为唯一入口；缩放与 reduced motion 不改权威状态。本地命中区 32 / 44 是产品约定（IC-1），高于 WCAG 2.5.8 的 24 × 24；焦点不被悬浮层完全遮挡（2.4.11）按本地更严目标"完整可见"记录，两者分别验收。**FN-28 状态事实不由装饰补写。** unknown ≠ failed ≠ success；缺数据 ≠ 0；loading / error / stale / unsupported 可辨；必要状态不只靠颜色、hover 或动画。**FN-29 主题与实验不污染基线。** 灰阶 / skin 裁定为默认；实验 skin、未进 STATIC 的文件、截图原型不记为用户可选能力。

## 7. 符合性与联合反例

全部 `not_run`；每项指定 owner 与承载工单，交付时填实际结果。

| ID | 条款 | 反例 | 门槛 | owner / 工单 |
|---|---|---|---|---|
| FE-T01 | 04 / 06 / 28 | 无绑定、无数据、读取失败三种启动 | 普通探索可用；未绑定不叫空 Matter；error ≠ 0 | Opus WK13 |
| FE-T02 | 05 / 17 / 18 | 同动作经按钮、键盘、其他入口 | 同目标同准入 | Opus WK13（j/k）、WK12 |
| FE-T03 | 14 / 15 / 16 | user deny 且 session 请求 allow；换 profile | 请求值 / 有效值分开；不放宽；bound 不变 | Opus WK11 + Astra RC 契约 |
| FE-T04 | 14 / 16 / 19 | 两客户端同 revision 提交；active Run 时修改 | 冲突可见，草稿保留，无假排队 | 同上 |
| FE-T05 | 11 / 12 / 13 / 20 | 导入未知 slot、含脚本 profile、缺依赖 | 不执行不安装；缺口可解释 | Opus WK10b（槽位）+ Astra control-plane |
| FE-T06 | 18 / 19 | allow 后失败；accept 回执丢失；cancel 未结算 | 三类事实不混同；不自动重放 | Astra H1 + Opus WK10b 第二段 |
| FE-T07 | 22 / 23 / 24 | 打开 A 转 B，迟到 A 返回；card 展开再收 | B 不被覆盖；不重执行不清草稿 | Opus WK10b 第一段 |
| FE-T08 | 20 / 21 / 25 | renderer / producer / decoder 缺席分别注入 | 分别只读回退或解释不可读 | Astra H3 + Opus WK10b 第二段 |
| FE-T09 | 09 / 10 / 27 / 29 | skin / 密度 / 排列变更；窄屏 / 缩放 / reduced motion | 状态与合法动作相同 | Opus WK12 |
| FE-T10 | 26 / 27 | 键盘进 tab、展开、dialog、切会话 | 焦点不被遮；IME 不误触发 | Opus WK12 / WK13 |
| FE-T11 | 12 / 18 / 25 | 规则版本升级后读旧 candidate / Decision | 用历史解释，不追改 | Astra H1-b |
| FE-T12 | 14 / 28 | Heatmap 缺数据、日界不支持、分页截断、usage missing | 不伪造今日 / 总量 / 成功率 | Opus WK13 |

自动化可覆盖类型、映射、身份、CAS、几何与部分可访问性；键盘、辅助技术、真实网络 / 模型与专业 Review 分开记录。

## 8. 入口目录

已有入口的对象、路由、owner 与门见 [EX-B 表一](../execution/2026-09-08-two-lines/explore/ex-b-frontend-entries-diff.md)；待建入口见 [frontend-entries §2–3](../execution/2026-09-08-two-lines/frontend-entries.md)；Settings 入口按 [WO-WK12](../mvp/execution/work-surface-kit/work-orders/WO-WK12-settings-page.md)。每个新入口按 §1.2 条目体例登记：ID / 目的 / 主入口 / 对象与 scope / 配置四层 / 动作与回执 / 生命周期 / 呈现 / 源码与证据。本页不复制第二份目录。

## 附录 A · 候选条款裁决

| 条款 | 裁决 | 说明 | owner / 工单 | 证据等级 |
|---|---|---|---|---|
| FN-01…03 | 采用 | 体例条款 | 本页 | 规范已采纳 |
| FN-04…06 | 采用 | 四面映射到现有承载（§2.1） | WK13 / WK12 / WK10b | 部分源码已实现 |
| FN-07 | 改写 | 补 `app.mjs` 保持会话 / 准入 / 生命周期 owner，与 interface-components 一致 | 本页 | 源码已实现 |
| FN-08 | 采用 | — | 本页 | 规范已采纳 |
| FN-09 / 10 | 采用 | 承载于 WK-69 与 color-governance | 已实现 | 源码已实现 |
| FN-11 | 采用 | 与 WK-78 用户 skin 校验一致 | WK12 | 未实现 |
| FN-12 | 采用 | Paper 引用改 9.6 §8 | H2 后 | 规范已采纳 |
| FN-13 | 采用 | 与 harness-core §3 同裁定 | 本页 | 规范已采纳 |
| §3.1 分组 | 改写 → WK-82 | 与 WK-63 节点合并为意图分组 + kind 过滤；Composition 新增 | WK11 | 未实现 |
| FN-14 | 采用 | 新增 Requested 层 | WK11 | 部分（Source / Effective / Bound 已有） |
| FN-15 / 16 | 采用 | RC-4 措辞校正为不称"排队" | WK11 | 部分 |
| FN-17…19 | 采用 | 动作闭集表加现有契约列 | WK10b / WK13 | 部分 |
| FN-20 / 21 | 采用 | `uiSlots` 定性；示例 YAML 保留在候选，不进本页 | WK10b 第一段 | 未实现 |
| FN-22…25 | 采用 | 回退表加落点列 | WK10b、H3 | 部分 |
| FN-26 | 采用 | Settings 为页面；settings-active 时全局侧栏不渲染（WK-116） | WK12 / CC-S | 已实现 |
| FN-27 | 采用 | 32 / 44 与 WCAG 24 分记；写入 icon-controls 附注 | 体例 | 规范已采纳 |
| FN-28 / 29 | 采用 | — | 全部前端单 | 部分 |
| 候选 §8.1 "Navigator / Work / Inspector" | 已超越 | WK-72 主区 + 悬浮工作面；`docs/ui-composition.md` 由 WK13 改写 | WK13 | — |
| 候选 Paper 9.3 | 已超越 | DEC-012 采用 9.6 | — | — |
| 候选 FE-S0…S4 | 改写 | S0 = 本页；S1 = §8 引用既有目录；S2 = §7 分配到各单；S3 = WK10b 第二段；S4 = 只在确需新 renderer 时开 | dispatch-round-3 | — |

拒绝：无。延后：模块顺序拖拽与快捷键重绑定（`可以`，无消费者前不排单）。
