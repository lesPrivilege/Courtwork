# P0.5 · Product Semantics Registry准备裁决

2026-09-11用户[补充原文](../../research/semantic-governance-2026-09-11/semantic-registry-supplement.txt)已完整入账。本文补充[同一笔WO-VS-01路线](README.md)，不单开第二roadmap；状态仍为准备，等待用户merge清洁节点。本节修订初稿“只改文档规则、不建立semantic registry”的过窄理解：**需要机器可读产品语义映射及渐进enforcement，复用已有glyph账和renderer；不建立第二份领域状态库。**

## 原文逐节消费

| 原文章节 | 处置 / 准备裁决 |
|---|---|
| 开头及Decision | 词、glyph、色彩role、placement、interaction是同一概念的不同投影；P0.5在视觉施工上游 |
| §1 Two registries | 接受semantic与geometry分层。semantic entry引用owner，glyph entry仅几何/来源；复用已有vendor/source/brand manifest，不复制许可证与资产账 |
| §2 四类 | 每个symbol先标Object/Action/State/Brand；与原interaction-vocabulary的五种admission class正交，不能以新四类删旧来源准入规则 |
| §3 single/multi-purpose | 专用concept严格语义归属；多用途几何依控件与对象标签消歧。禁止全局一glyph一义的天真检查 |
| §4 六组collision | 列为VS-00必查面，见下表。风险是调查题，未查到callsite的不计已确认缺陷 |
| §5 状态与身份 | object glyph稳定，状态是独立投影；变体需显式映射，不只靠颜色，不用fill隐式区分Accepted/权限/角色 |
| §6 Pages共语义 | operational glyph、diagram、typographic lockup可绑定同key而不同形态，不能强制网站处处加icon |
| §7 自绘准入 | Spark/Attention强候选，Matter候选，Expert视歧义而定；先slot再asset；“no icon”合法，不为四个概念凑四个logo |
| §8 semantic adapter | 保留icon(name)；新增上层语义adapter，逐个明确consumer迁移；不做全站big bang |
| §9 collision gate | 必须机器可读与验证，先随首个consumer落地，迁移范围扩大时递增；人工歧义/视觉测试不冒充lint可自动判定 |
| §10 Pages接受 | App/Pages统一含义，word/glyph/color/interaction互相核对；原13截图来源不改 |
| §11新排序及结尾 | P0 ontology→P0.5 registry→P1 IA→P2视觉层级→P3跨面迁移→P4截图编组→P5 gates；gates在每片早建，P5是最终组合验收 |

## 复用与所有权

当前[interaction-vocabulary](../../design/home-composition-2026-09-10/interaction-vocabulary.md)已经定义semantic key与glyph key分离，且registry明确是示例、未落enforcement；因此这里是补实现计划，不是发现新ontology。[icon-controls](../../design/icon-controls.md)、[glyph-semantics](../../mvp/execution/work-surface-kit/contracts/glyph-semantics.md)、copy-convention、state vocabulary继续各管事实。24-name allowlist是9bc6090源码时点，merge后重新清点，不把该数写成永久门。

两个逻辑registry这样落位，最终文件路径在VS-01按clean树冻结：

- **Semantic registry**：一份受版本控制的纯声明数据供App及Pages共同消费；建议在现有design目录建立机器可读文件，由构建生成/复制浏览器可用投影，避免App与site维护两份可编辑映射。无IO、无领域mutation、无个人数据。词与glyph规则以它和原canonical合同的一致性检查保证，不让自然语言表与JSON静默分叉。
- **Glyph registry**：继续由[Lucide sources](../../../tools/ui-vendor/lucide/sources.json)、[vendor manifest](../../../app/web/vendor/manifest.json)、[brand manifest](../../../brand/exports/manifest.json)及现有builder生成；semantic层引用asset key与对应manifest，不另建可编辑SVG来源真源。state variants属于已获准几何/语义组合。
- **Pages figure registry**：[现有visual semantic草案](../../release/publishing-visuals-2026-09-10/visual-semantic-registry.md)及[figures.json](../../../site/src/assets/figures/figures.json)保留图的provenance/status/geometry职责，增加semantic key交叉映射；按现有VG迁移节点归入design，不直接覆盖旧稿或把历史shipped/research提升为当前接受。
- **Runtime/Core/service**：继续拥有capability、权限、版本、结果、Unknown等实际事实。semantic registry里的capability predicate只引用已有投影/owner能力，不授权执行、不缓存状态、不依据标签真假决定实际权限。生产和fake adapter分别提供事实。
- **brand/**：继续零依赖、可独立使用。产品语义层单向引用brand export，brand包不反向依赖app/runtime/设计JSON。

Astra负责schema边界、冲突裁决、adapter API和migration scope；Luna可按冻结schema编写数据、测试与确定性caller迁移。不得让工程方便把语义反向绑定到当前恰好可用的glyph。

## 首版entry与语义保留槽

最低字段：semanticKey、meaning、ownerRef、canonical word（语言/上下文模板）、accessible-name rule、symbolClass（Object/Action/State/Brand）、admissionClass（沿原五类）、allowedSurfaces、glyphPolicy（none/single-purpose/multi-purpose/approved-variant）、glyphRef/representationRefs、colourRole、stateVariants、capabilityRef/predicateRef、interactionRole、tooltipRule、review/evidence status。

这些是要冻结的schema，不是本轮已安装的运行时registry。colourRole引用现有role、不引hex；capabilityRef引用现有函数/广告，禁止JSON里任意可执行表达式。none不等于缺失，未裁pending与裁定none分开。文案模板允许有对象补全和明确中英文，不把“同词”缩成无对象的icon-only accessible name。

优先保留但不在本轮选定永久asset：attention.agent、spark.surface、matter.object、expert.role、chat.object、review.open、approval.request、activity.view、connection.object、tool.object、surface.close。另需按真实对象区分inbox/attention item、project、model、reasoning、plugin、MCP service、history、trace。action与state引用真实owner，不能从示例key创建API。

## 必查碰撞族与处置原则

| 族 | 必核问题 | 基线处置 |
|---|---|---|
| Chat / Attention / Waiting | message-square是否跨对象、品牌、状态而产生错误预期 | reserve attention.agent；未有胜出glyph时用Attention文本，不能在Pages临时择永久logo |
| Project / Matter | folder是否在同屏把容器与治理工作混同 | 原Folder+Matter是历史候选；在两者共现面重新审查，不机械禁所有folder，也不默认把Matter化成Project |
| Agent / Expert / Model / Reasoning | sparkle或机器人是否承担四个不同事实 | 独立semantic keys；none是合法结果，现无sparkle asset不当作全量无碰撞证明 |
| Tool / Plugin / Connection / MCP | plug/puzzle/wrench是否随手代表四种对象 | tool callable、plugin package、connection配置关系、MCP service分别追owner，不能按“集成”混同 |
| Attention / Review / Approval | shield/check/bell/稀疏red是否混同actor、审阅、单次授权 | agent与待看item先分开；Review独立skin；正式接受与执行许可都不由图标/颜色产生 |
| Activity / History / Trace | activity glyph是否只是因都有时间就复用 | 各自question与披露深度明确；时序/版本/诊断不互为同义词 |

原补充把Attention同时解释为“值得注意/常驻角色”，不能因此撤销队列与actor消歧；保留来源原意，具体显示词及Inbox方案由VS-01沿已有合同裁。上表只定义检查问题；新增用户材料不证明每个碰撞已在产品出现。

## 最小施工与gate

VS-01先完成词义P0，再做P0.5首版schema/registry/semantic adapter/校验，选surface.close这类明确consumer及一个品牌保留槽作正负例。底层icon/action/setAction继续负责slot、tooltip和可达性；semantic层选择允许的映射。迁移不改变按钮handler或capability的owner。

Raw glyph调用只在已登记semantic adapter、specimen和明确的装饰/diagram代码内豁免；未迁移产品callsite以精确清单记录并逐片递减，不能用整个app/web目录通配豁免。lint同时覆盖icon、action/setAction的glyph参数、flowRow和SVG use等实际入口；动态来源若机械分析不完，明确标待人工审查，不能把0正则命中称全覆盖。

最小有意义反例：单用途glyph绑两个不相关concept被拒；同concept无批准地变为不同glyph被拒；已迁移caller绕回raw glyph被拒；icon-only缺完整动作名被拒；custom缺source/licence/hash、混族或brand作泛装饰被拒；对象状态换成不相关对象glyph被拒。允许+用于New chat/New project且accessible name不同，允许已注册selected变体，允许同concept以App小glyph/Pages图解呈现，允许none保持文字。检查“无关概念/是否歧义”依赖Astra已冻结映射和specimen证据，lint不具备自行设计裁决能力。

自绘候选需现有隐喻搜索、六族collision、16/18/20真实尺寸明暗与Pages specimen、单色、Lucide相邻optical weight、相邻概念识别测试；没有胜出就记录none。无需全面重做EX-IC1；EX-IC2在途交付先接收其真实状态再迁移。

最终按内置浏览器computer use联调，真实点按、tooltip/focus、键盘返回、状态切换、去色与跨App/Pages对应关系逐个看；Luna可复现，Astra裁视觉，另一作者固定版本复核。

## 外部证据与限制

本轮补查[Atlassian官方复盘](https://atlassian.design/whats-new/building-atlassians-new-icon-system)（页面标原发2025-09-08）：确认single-purpose/multi-purpose、Icon Lab、迁移mapping、ESLint及Icon Facade；采纳分类与渐进迁移方法，不搬其React/Figma工具链或1.5px/16px几何标准。Apple variant具体主张仍待官方核验，不把它作为当前状态映射已获准的依据。

## Astra对Luna初报告的消费

源码行号与owner定位采用；其先VS-04后VS-02/03只是有界建议。本轮保留用户强调的图形表达代表迁移顺序，先VS-01/P0.5再Inspector/Telemetry/Usage，Settings词义裁定在VS-01提前，未单开路线。报告“警告不能删”按事实不能丢处理，具体句子可改写或披露；Advanced也不是倾倒Backend pending等技术名词的豁免。Telemetry已有request owner，待BE-42的是新增时钟/TPS等缺口，不称现有所有测量都无owner。Pages发布状态以9bc6090与后续publish-first记录为准，不沿报告引用的历史未部署段落倒退。
