# Work Surface：语义、组件与 Expert 组合边界

2026-09-08 · Astra 文档消费。输入与来源对账见 [前端研究回执](../research/frontend-intake-2026-09-08/README.md)，长期覆盖见 [Long-life Roadmap](../roadmap.md)。本页澄清跨层架构与后续接入边界；Fable 当前 Work Surface Kit 的设计、工单、写权与批次冻结继续由其 [第二轮接管](../mvp/execution/work-surface-kit/intake-round-2.md) 及相关契约维护。本页不派发实现任务，也不产生新的 WK 编号。

## 1. 工作表面的分层

```text
Domain Contract / canonical owner / versioned state
                    ↓ query + allowed actions
Typed projection and domain adapter
                    ↓
Shared work-interaction and presentation primitives
                    ↓
Expert composition inside the existing Shell
                    ↓ decision intent
Host identity / policy + domain validation / commit + effect receipt
```

| 层 | 拥有的责任 | 不由该层决定 |
|---|---|---|
| Chrome / Shell | 导航、tab与panel、布局、焦点、全局attention投影、宿主连接与能力管理入口 | 哪份专业成果正式生效、专业规则、事实正确性、外部动作是否发生 |
| Runtime / Host Adapter | Run lifecycle、工具与模型能力、admission/permission、执行事件、真实调用结果 | 领域成果接受标准和不可约的专业判断 |
| Domain Core / System of Record | Matter/Artifact/Candidate/Decision、证据与版本、Authority/Completion/Review、正式转换 | 特定页面构图和某个renderer的临时交互状态 |
| Shared Work Primitives | observation/elicitation/permission/review/commit的共同交互行为与可访问性 | 独立创造状态机、默认取得approve/send权限 |
| Presentation Primitives | 接收有语义的数据投影，显示calendar/heatmap/message/table/card等表示，发出受限意图 | 拉取provider数据、自己调用写API、根据颜色或文案推断正式效力 |
| Expert | Work Contract、领域规则与schema、verifier/eval、scope、能力需求、adapter与受限界面组合 | 重造chat shell、执行loop、另一份正式状态或全局UI owner |

讨论中的“Chrome owns state/governance”按以上责任拆解：Chrome 提供共享入口和表面，不因此成为所有正式对象的 owner。讨论中的“Expert = composition”适用于界面与既有能力的复用方向；Expert 的专业契约、验证、版本和状态后果仍需明确实现，不能被 layout manifest 代替。

## 2. 五类交互语义：复用行为，分别校验

| 类别 | 人在判断什么 | 需要绑定 | 本地边界 |
|---|---|---|---|
| Observation | 发生了什么、依据在哪里 | source/event/artifact identity及版本、可披露范围 | trace/tool row、Run/File检查；观察不授予权限 |
| Elicitation | 缺什么输入或判断 | question identity、当前状态、回答适用范围 | 现有question/answer；回答不默认为工具授权 |
| Permission | 这次能力调用是否允许 | exact call/target/payload、权限范围、有效时点 | 现有一次写allow/deny；策略级允许另走控制面，不加Always allow按钮 |
| Proposal Review | 某个候选的内容和后果是否可接受 | Candidate/base version、Evidence、未决、Reviewer与合法动作 | 当前通用WK3/WK4不提供此完整契约；领域Core的样本decide不能自动泛化 |
| Commit Gate | 被审阅的确切候选如何取得效力 | 可信身份、Decision、相同payload/版本、指定owner、提交/效果回执 | 由适用领域与外部effect协议执行；按钮不构成提交引擎 |

五类是有用的交互分类，不是“所有专业Review语义已经穷尽”的证据。出现新的工作后果时，先核对现有Contract能否表达，再增加最小动作/数据；不为维持有限组件清单而抹平区别。

Proposal Review 与 Commit Gate 不要求固定两个按钮或两次确认。若适用Contract允许，一个人的动作可以触发完整校验与本地原子提交；涉及独立外部效果时，接受决定、派发和结果仍分别留证。已授权的确定性步骤无需重复问人。

## 3. Review 状态与决定的表达

输入index的`ReviewItem`是候选投影示意，不作为可直接落库的统一后端状态机。保留既有 [ReviewProjection](../mvp/execution/work-surface-kit/contracts/review-projection.md)：`permission | question | outcome`，其中outcome是只读Run摘要，当前契约不提供accepted-work语义。

设计时分开以下维度，并按具体kind只投影真实存在的数据：

- 执行事实：Run/tool的运行、取消、失败或unknown。
- 请求处置：问题/授权是否pending、已回答、allow/deny、过期或关闭。
- 专业认识：supported、contradicted、uncertain、working assumption等领域状态。
- 机构效力：draft、under review、approved、published、superseded、withdrawn。
- 外部效果：尚未取得回执、已确认或仍未知；名称由真正的effect契约定义。

`submitting`、输入草稿、折叠和焦点可以是临时UI状态；不能将其当作服务器已保存或已批准。断连保留最后确认状态，收到回执后刷新同源投影。前端禁用按钮有助于交互，服务端仍须防重复请求和陈旧版本。

编辑proposal会形成新的内容/版本，旧批准不能静默适用新payload。授权卡上的exact arguments不可通过“edit + approve”直接修改；应形成新的调用与授权项。`dismiss`只记录相应工作流动作，不能无条件被评价系统记为accepted、agent error或非error。`retry`也必须遵守幂等、未知效果和版本边界。

## 4. Inline、Inbox、卡片和 Tab 的同源性

Inline与Inbox是同一项工作的不同投影，不分别保存Review事实。宿主负责身份、选择、路由和服务端数据；组件只保存交互所需的局部状态。一次Decision返回后，两处通过相同identity/version/request结果更新，不能一处解决、另一处仍持可执行旧按钮。

Fable当前工作页卡片→展开tab沿既有Run/File/Workspace kind、renderer身份和Escape次序推进。本页不重新规定其布局或更换实例。长期多视图可以从同一状态重建，但必须显式管理订阅、连接、选择与销毁；view关闭不取消工作、不卸载领域owner、不删除正式成果。

producer或renderer缺席时的历史读取，需要独立的domain read path与版本化fallback契约。通用卡片或JSON展示只能显示已取得的payload；缺少producer导致服务端没有projection时，前端不能推断Evidence、Decision与accepted Artifact。

## 5. Presentation primitives 的数据边界

稳定输入形状有助于复用，但“与provider解耦”不意味着可以丢掉时区、单位、来源、权限或状态的具体含义。adapter从真实查询结果生成表示；component不认识Gmail、Agent、某个Expert或数据库。

| 表示 | adapter须明确的语义 | 不能从视觉推出来的事实 | 当前消费位置 |
|---|---|---|---|
| StatTile / Today | 指标定义、时间窗口、timezone、scope、更新时间与缺失值 | 任意数字都是当前真实业务量 | WK32–34与EX-WK5已进入设计范围，按实际可得字段冻结 |
| Heatmap | bucket、计数口径、timezone、强度scale、zero/missing、筛选范围和可访问说明 | run次数等于专注小时、成果质量、风险或工作完成率 | 当前仅以已记录run startedAt按日聚合；指标不在组件内重算 |
| WorkCard / ProgressList / PreviewList / ContextList | 稳定对象identity、已记录状态、引用、合法打开动作 | 阶段名称能够推导进度百分比；预览等于已接受成果 | WK34六种primitive与WK9设计/EX-WK5 adapter输入 |
| Calendar | all-day或instant、timezone、范围边界、来源版本、冲突与修改的权限 | 显示一个deadline就有权改原系统日程或已创建事件 | 真实数据源未成立时仅设计/gap；不由本轮新增实现单 |
| MessageCard | 内容/附件/线程引用、发送方显示来源、草稿版本、可信发送结果 | approved draft等于sent；received/source身份已被真实性验证 | 后续有真实邮件/消息消费者时冻结DTO与effect adapter |
| Table / Timeline / Graph / Layout | 行/节点/边的领域含义、排序、单位、关系、可披露范围与actions | 通用布局自带业务规则或新的authority | 复用现有表示；新组件由真实判断需求触发 |

邮件示例应表达：草稿候选→适用Review→接受决定→允许的发送请求→provider回执核对→显示实际发送结果。超时或断线可以保持unknown；批准后尚未发送的草稿不能显示为committed/sent。此处说明的是语义顺序，不新增一套邮件后端enum。

本页不另写`CalendarEvent`、`MessageArtifact`或`HeatmapDatum`类型替代Fable计划中、待对应工单冻结的`presentation-primitives.d.ts`。具体DTO、adapter签名、缺失值处理和组件owner在对应工单冻结；`MessageArtifact`等讨论名也不自动进入SE ontology。

## 6. 既有类型与后续契约入口

| index候选 | 当前应消费的入口 | 真正缺口的落点 |
|---|---|---|
| WorkEvent | 既有server events、thread projection与Run事实 | 新业务事件先由领域/服务契约定义，再做adapter；不重写所有事件协议 |
| ReviewItem | WK3的ReviewProjection、question/permission/work-summary | 领域Review packet须依赖Core；不向现有三类投影塞伪造字段 |
| Decision | 当前permission决定或question answer；领域Core另有可信Decision | 两者不可混用；新review/revise动作经H1等领域契约提供 |
| Artifact | inspector的运行内容版本；Core的正式Artifact分别读取 | 明确来源owner、版本与效力；不因卡片名字统一而合并对象 |
| CapabilityRef | runtime control contract的资源identity、来源、policy与run binding | 尚无adapter的能力只显示实际状态，不画成可用 |
| ExpertManifest | 现有trusted extension/profile/renderer接缝 | 至少2–3个责任结构不同的消费者后再冻结最小声明组合；不先建Studio或通用manifest全表 |

协议终止于adapter。MCP/ACP/AG-UI/A2A/OTel可以提供执行/传输/追踪机制；它们的存在不证明当前宿主支持，也不决定专业用户看到的状态和动作。遇到能力差异应声明不支持、替代路径或收窄Contract。

## 7. 社区消费与实现纪律

现有前端是原生ES modules；讨论中的React/TSX、Storybook和source-copy例子不构成迁栈裁定。先消费组件anatomy、状态过渡、可访问性、滚动/焦点/销毁等成熟机制，再按现有技术契约实现或复用。source-owned分发不表示零依赖、零许可证义务或零升级成本。

每个实际组件最多选择少量最相关来源，记录固定版本/path、可复用行为、框架假设、许可证和本地代价。已在Fable批次完成的溯源不重跑；版本、接口或需求变化时才重开。未经核验的P0/P1标签仍是检索优先级，不是成熟性结论。详细官方来源与本轮核验范围见 [研究回执](../research/frontend-intake-2026-09-08/README.md)。

允许少量domain-only renderer，但它仍消费有界projection与受校验actions，不能自行连接正式数据库、provider凭据或任意代码执行。可声明layout不证明专业Expert只需配置；复用收益须在不同Contract、长内容、异常状态和原作者离场时验证。

## 8. 对当前施工与后续交接的作用

1. Fable继续维护当前前端Canon映射、布局/品牌/色彩、WK契约与工单。Opus等当前writer按其写权施工；本文不把讨论中“Astra component factory”的建议解释为已移交前端写权。
2. Astra在此消费跨层架构、Core/runtime接缝与Long-life依赖；Luna提供只读证据和独立复核。任何后续组件制造仍以明确工单、真实基线和唯一writer为单位。
3. WO-WK3/WK4沿现有question/permission/outcome范围验收；WK9和六种presentation primitives按最新EX-WK5/设计输入推进。本文不恢复已被WK32–36取代的hero方案，不重排其施工次序。
4. 真正的proposal review、Candidate revise、commit/effect receipt和producer-absent fallback进入 [H1/H3/H4](../research/experts-hotplug-2026-09-08/pr-plan.md) 的领域/接入契约，再由单独前端单消费。通用权限卡合流不使这些门通过。
5. 共享组件验证覆盖真实适用的empty/loading/error/waiting/resolved/stale/disconnected、readonly/interactive、keyboard/读屏/窄屏、light/dark与reduced-motion；不为不存在的streaming或commit状态拼全组合矩阵。
6. fixture验证投影、动作与恢复；真实runtime event验证接缝；真实provider/外部效果和专业Review分别验收。视觉四轴与活动设计取舍仍沿Fable批次和用户裁决，不由本文的语义通过代替。

目标是让更多工作复用成熟交互，同时保持专业内容和状态后果可检查。若组件抽象需要不断增加Expert条件分支，或声明式组合不能表达必要判断，就按真实差异拆小adapter或保留domain renderer；不以低代码愿景掩盖耦合。
