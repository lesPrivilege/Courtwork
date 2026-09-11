# 前端连续性规范 · UI Continuity v1

2026-09-10 · 用户授权建立规范；Astra 整合，Luna 有界核对。适用于之后新增或修改的 Courtwork UI 面。基线 `2e9da09bd163ca128e3cd2f4c91ef61ceec2fc2f`；规则与仓库同版本，不依赖外部 package 或自动 context loader。每次接单仍读取实际 HEAD。本文是现有 owner/grammar 的施工入口，不建立第二套域语义真源。

## 每次局部施工

1. 读取 AGENTS/current 与工单，确定具体 owner fact、修改面和单 writer；需要定位问题时查[导航表](precedent-map.md)，再从[实现先例](precedents.md)只加载有关行、对应合同与源码。
2. 填[变更记录](change-template.md)：至少一个最近先例、实际符号/路径、基线 SHA、需要保持的关系、改变的关系。先例只是已实现结构，是否已独立接受要看相应证据。
3. 先查语义与既有 control/pattern，再判断复用、增加变体或确有 grammar gap。不因外部组件库有某控件就引入领域字段或依赖。
4. 按变更运行静态/行为/浏览器检查，保留固定合成数据与相邻完整场景。作者可以生成候选截图与 diff，不能仅通过替换已接受 baseline 宣称回归通过。
5. 交付记录明确作者检查、非作者复核、未跑项与待裁视觉变化。已存在的用户授权不重复申请；新 baseline 的接受由既有 review 流程记录。

## 四类合同

| 类别 | 必须遵守 | authority |
|---|---|---|
| Semantic | 原对象名称与状态；project≠Matter、Session≠Run≠Thread；未知是未知，requested/effective/bound不合并 | [词表](../../mvp/execution/work-surface-kit/contracts/ui-state-vocabulary.md)、对应后端合同 |
| Projection / Control | 读和改分开；投影纯函数且不创造事实；动作由实际 capability/schema/广告驱动 | [Atlas](../atlas/README.md)、[presentation primitives](../../mvp/execution/work-surface-kit/contracts/presentation-primitives.d.ts) |
| Visual | S→R→U；组件不直接消费scale或任意hex；shape/type/density/material沿已裁体例；Review独立于skin | [色彩](../../mvp/execution/work-surface-kit/contracts/color-governance.md)、[Skin/Review](../skin-injection-2026-09-10/skin-constitution.md)、[编排](../ui-composition-standard.md) |
| Placement | 先确定对象/选区/capability/频率/风险，再选承载面；不要因为浮动好看就创建toolbar | [Disclosure/overlay](../home-composition-2026-09-10/disclosure-overlay.md)、[Control Atlas](../atlas/README.md) |

## Projection / Control 选择

| 事实或意图 | 当前规则 | 禁止推导 |
|---|---|---|
| 模型与effort选择 | 复用 `createModelPicker` 及真实catalog capability，保持作用域与保存语义 | 不新建同义ModelDropdown；不虚构支持的effort |
| 有限互斥值 | 复用既有select/segmented；按选项长度与数量选形态 | 不为统一风格禁止所有原生select |
| 精确数值/范围 | 先有owner的单位、界限、步长、校验/commit；新增控件另片 | 今日缺少schema的NumberField/Slider仍候选，不照抄原讨论示例 |
| context / TPS / TTFT | 只投影真实已有口径；估算明确标估算 | estimate≠meter；host首输出不称provider TTFT；无token deltas不画decode TPS |
| Usage / Activity | 复用现有projection，保留UTC、范围、覆盖与分桶语义 | 不把构成条当余量，不把Run计数当token量或Attention数量 |
| Approval / confirmation / elicitation | 按实际动作合同分别呈现，保留scope、revision、失败/回执 | 不发明reviewer、expiry、quorum；高风险不自动变modal |
| 工具/Run活动 | 当前词表与trace结构 | running≠progress；cancel requested≠stopped |
| contextual action | 明确适用对象、selection、capability与返回焦点 | 候选功能不因表单/菜单存在而画可用按钮 |
| temporal / waveform / graph | 只有领域对象、测量与真实任务支撑才开片 | 不为16项board凑控件；无音频域不引播放器 |

Properties 的 label、help、control、validation、modified/reset、provenance 优先复用 `settingsRow` / `createPreferenceGovernance`。请求值、已存值、有效值和bound事实分开；没有来源事实不补假provenance。当前原生DOM builder和原生表单仍合法，不照搬React库的“禁止直接button/input/select”规则。

### 任务入口与资源维度（2026-09-12消费）

按[RD-006五图语义参考](../../research/deferred-workspace-binding-2026-09-12/semantic-reference.md)，项目组织归属、外部资源目录、执行位置、Git/worktree、权限、模型/effort各有owner；不能把它们合成一个workspace权限标签，也不要求排六个chip。No folder与无project含义不同；托管成果目录不等于用户外部目录，Local不表示已授文件权限，未知Git不补成main。最近项只是候选，选择失败保留原scope与草稿，不自动继承最近目录。

现有Attention可免选project创建，普通Chat仍依赖project；不得为表现空选项把普通Chat转成global Attention。Connect/Disconnect、跨project切换、worktree操作必须由真实服务capability驱动，截图不是动作授权或实现证据。当前无相关后端时，消费维度规则和既有入口，不渲染假连接状态或可用按钮。声明式资源草稿同样只由Host proposal事实浮现，模型文本不产生已安装状态，见[GUI控制面裁决](../../research/gui-agent-control-plane-2026-09-12/README.md)。

后端缺口与前端接线顺序见[DWB前端消费回执](../../research/deferred-workspace-binding-2026-09-12/frontend-consumption.md)。模型与文件权限继续用现有control，发送/取消、Session身份及Review语义保持各自合同。

## 视觉保持与变更

A类是跨面不变量：语义、role用途、focus、控件解剖与已裁密度；B类是pattern关系：PropertyRow、Model Picker、审批/弹层返回路径；C类是页面编排，可随产品任务演进。截图探测变化，不能代替设计裁决。历史截图不自动成为golden，候选specimen不自动成为canonical。

新UI不随意增加字号、圆角、阴影、z-index、动画时长、图标族或局部tooltip/modal实现；先找既有role/组件。确有缺口在变更记录写出原因、范围、替代、owner和复核条件。当前尚无覆盖所有raw literal的机械检查，不能以现有lint绿灯声称全部视觉规则已验证。

Skin 管获准外观，Review 管稳定待决语义；相同scheme下切skin不改变Review。浅深/forced-colors是语义可访问性适配，不能被当作skin改义。旧custom/gray-steel目前不完全满足，见[整改切片](../skin-injection-2026-09-10/migration-notes.md)；新增面不得复制该泄漏。

## 必须交付的验证

- 文档/索引改动：`node tools/check-doc-links.mjs`校验仓库来源路径；不把路径存在等同于语义或接受有效。
- 有颜色/区域改动：`node tools/lint-colors.mjs` 与 `node tools/contrast-report.mjs`；新增/改变材质另跑 `node tools/lint-materials.mjs`。
- 有投影/控件改动：`node tools/lint-interaction.mjs` 及相关unit/行为测试。该lint只覆盖已登记字面规则，不证明所有五条语义负规则。
- 有runtime UI行为变化：定向检查使用 `node --test <精确测试文件>`；需要全量回归时使用 `npm --prefix app test`（它运行完整suite，不是按文件范围）。需要HTTP/宿主链再按既有smoke与合成browser脚本，禁止默认付费provider/个人数据。
- 有视觉或交互变化：目标局部面 + 最近相邻面 + 一个包含它的完整场景；1440 / 1280 / 390，light/dark，键盘、长文本、空/失败/处理中、200% zoom按实际影响覆盖。若删减某项，记录不适用理由，不能写成通过。
- 材质补unsupported/reduced-transparency/forced-colors；motion补reduced-motion；skin补固定review/danger/focus与所有底面对比；选择/overlay补Escape、返回焦点、滚动与窄屏。

作者不得擅自把“候选图”标为已接受baseline；提交意图、before/after、固定数据与版本，由非作者按相同基线核对。除非本来就是明确的视觉变更，测试失败先找行为或布局回归，不能只换图。新模式按实验→specimen→产品应用→有证据的canonical逐步进入，不强迫每次简单修复走全套新模式流程。

## 外部材料的消费边界

本轮完整读取[3轮输入](input-conversation.md)。Appica的按需文档/同版本规则、Atlassian的token工具、Figma的实际组件映射、Storybook的视觉diff均只作为方法参考，核验见[sources-review](sources-review.md)。不安装Appica/React/Tailwind，不建立第二套token/lexicon，不声称自动loader、CI像素门或全库AST守卫已经存在。
