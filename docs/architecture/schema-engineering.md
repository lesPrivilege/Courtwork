# Schema Engineering

Schema engineering 是 Courtwork 的核心方法：把领域判断编译成模型可写、系统可验、人可读改签的契约。

## 一、三位一体

一个 schema 同时是：

- 限定：规定模型可以表达什么、不能表达什么；
- 界面：决定人看到什么、如何核对和修正；
- 载体：承载事件、投影、存储、评测与跨系统交换。

字段不是数据容器，而是业务判断的形状。字段名、枚举、确认策略、证据要求和渲染方式必须共同设计。

## 一之二、最后一公里

在实现成本趋零的时代，一两张 schema 很薄——但薄不是弱。通用 agent 是干线运力：能力强、末端不达，用户每次使用都要自付 prompt 工程、监督成本与信任赤字；schema 化场景是停满最后一公里的电瓶车：结构化的面向用户交互 + 确定性规则裁决 + 模型只做生成，把那笔成本一次性摊销进包里，第 N 次使用的边际成本趋零。

这类场景通常用不到模型能力上限——确定性计算承担了裁决，便宜模型即可跑好生成段。provider 无关 + 低成本模型够用，构成通用前沿 agent 难以匹敌的单位经济。轻量包（ADR-014）就是这排电瓶车的停车场：跨域可表达性压力测试已证明同一张 schema 骨架可以零改动迁植到相距极远的域，core 机器层零改动——薄的是实现，厚的是信任结构。

## 一之三、一张 schema 的四个消费者

同一张 schema 同时服务四端，这是它薄而不弱的另一半原因：

- **对用户**：human-in-the-loop 的裁决面——可视化、结构化、可交互的数据，逐条确认与驳回落在字段上而不是散文里；
- **对 agent**：工作语义的 session/context 锚点——续行、长任务、投影重建都以 schema 实例为真源，不依赖模型总结历史；
- **对上游模型**：一次调研/定制编译成可维护契约——提示词段、输出约束、目标地址随包版本化，不随会话蒸发；
- **对下游模型**：更甜点（更便宜）的模型即可胜任——输出落在既有结构里，不必每次临时编译 HTML 或 ppt 这类一次性载体。

## 一之四、工作域的编译器

coding 的飞轮来自编译器：判定自动、即时、廉价。work 域的判定（这份审查对不对）暂不可自动化，至少当前必须 keep human in the loop——但这不意味着 work 域没有编译器，而是编译器的**判定步由人承担**，schema 表正是这个判定步的最优人机界面：

- **编译验证**：机器门承担可自动判定的部分（schema 校验、pointer 闭合、词表覆盖、来源锚点解析）；
- **可视交互**：人承担不可自动化的裁决，且裁决落在字段上而不是散文里（逐条确认/驳回/修正即「编译错误的人工判定」）；
- **语义锚点**：每条结论可回溯原文坐标，使人的判定有据可查、可复核；
- **私域适配**：重度包把机构自己的规则接入同一张表的判定面，不换界面换语义。

推论：schema 创作本身是有编译器的域（registry fail-closed 准入 + drift 门 + golden 构成结构化错误面），「生成→过门→修复」的循环在包创作层成立——工作域没有验证器，但为工作域造验证结构这件事自己有验证器。

## 二、双后端编译

每个可注册 artifact 必须能编译到两个后端：

1. 模型后端：提示词段、输出 schema、目标地址和交互动词；
2. 人类后端：renderer、词表、状态、来源展开和确认动作。

只有模型能写而人无法有效复核的 schema 不完整；只有 UI 表单而模型输出无约束的 schema 同样不完整。

## 三、Descriptor 最小集

artifact descriptor 至少声明：

- namespaced type id 与 schema；
- 字段词表与枚举文案；
- rehydration projection；
- renderer / ui template；
- confirmation policy；
- 来源与引用要求；
- 缺失 renderer 时的通用只读结构兜底。

## 四、渐进完备与交互语义

数组型 artifact 逐条校验：合法单元入库，失败单元携具体错误做定点重试；预算耗尽后必须显示部分成功和 coverage 缺口。不得因一项失败丢弃全部，也不得静默省略失败项。

交互不直接拼进下一轮 prompt。确认、驳回与修正先写 RevisionEvent，再更新 artifact，最后由确定性投影进入续行上下文。用户修正是最高优先级事实，默认不触发自动重推理。

## 五、零编码暴露

wire id、字段名、枚举值、绝对路径、hash 和 provider 错误码只进入诊断层。普通界面必须通过 descriptor 词表、相对路径和领域文案投影；词表不全时拒载或显式降级，不回落机器字段名。

## 六、经济性

prompt 措辞与模型怪癖会折旧；领域字段、验证器、词表、数据源和确认规则会复利。模型变强会提高填表质量，却不会取代法规更新、来源公证、门禁维护和 schema 演进的职权。

## 七、包级闭合与唯一 ABI

垂类不是一组散落 schema，而是一个可移除的依赖包。全仓只允许 `VerticalPackageManifest` 这一套包 ABI；artifact descriptor、scenario、renderer、projection、vocabulary、source policy 与 confirmation policy 必须交叉闭合。垂类不得维护平行 descriptor，desktop/core 不得中央列举领域 type id。

准入要回答两件事：模型能否按目标地址写出合法数据；人能否用领域语言看到来源、状态并修正确认。任一侧断线都不是“部分接入”，而是拒载或显式降级。

## 八、字段职权与锚点生产

字段权威分为模型提案、系统验证、人类裁决三类。系统计算、resolver 坐标与确定性工具结果不能出现在模型可写 response schema；人类裁决初始未决，只能由用户事件改变。

SourceAnchor 尤其遵守这条边界：模型只出 quote/claim，系统才可铸造 page、bbox、textRange 与版本。凡最终 artifact 含锚点而由模型生成，必须使用不含系统坐标的 draft schema + citation binding，或声明该字段仅由系统 producer 写入。

## 九、Renderer 与诚实兜底

renderer 是 descriptor 声明的封闭能力，不接受模型生成的样式、自由坐标或未登记动作。host 只通过 registry 路由。

缺专用 renderer 时，只有完整人读 projection 与字段词表才能进入通用只读结构视图；否则显示“不支持当前工作面”。兜底也不得暴露 type id、原始 key、枚举值、绝对路径和 hash。warning 必须到达用户，而不是只存在日志。

## 十、演进与最小一致性门

包必须声明 ABI/schemaVersion 兼容范围与必要迁移；过旧、过新都显式隔离。历史事件保存当时快照，不用新 manifest 重新解释。

每个垂类至少通过以下共享门：namespace/引用闭合、伪造坐标、词表零 wire、partial/coverage、确认绕过、事件回放，以及与第二 namespace 同宿主装载。真实 fixture 和可触红变异是验收证据；截图只证明视觉，不证明协议。

## 十一、开工召回清单

新增或修改 schema 前，按顺序定位：

1. 字段语义与基础 wire：`packages/schemas`；
2. 包身份、descriptor、场景和 renderer 准入：`packages/registry`；
3. 垂类字段、词表、projection 与 fixture：对应 vertical package；
4. 事件、门禁、partial 与续行：`packages/core`；
5. 锚点与来源：ADR-003 + reading-view/citation resolver；
6. 人类工作面与兜底：ADR-006 + desktop renderer host；
7. 写入职权、唯一 ABI 与 conformance：ADR-008。

若一个改动需要在 desktop 写领域 type id、让模型返回 bbox/textRange、裸显对象 key，或新增第二套 descriptor，应停止实现并回到架构契约。

新增垂类另按 `architecture/vertical-package-authoring.md` 核对目录、版本、exports、企业 runtime 与共享 conformance；新增工作面先从 `design/visualization-kit.md` 选择原语，再以版本化 `uiTemplateId` 接入。素材图片与测试对象均不能替代 descriptor/presentation 契约。
