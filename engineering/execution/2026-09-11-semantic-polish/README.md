# WO-VS-01 · 本轮语义与界面 polish roadmap

2026-09-11 · Astra负责架构、裁决、整合、节奏与依赖模型能力的瓶颈实现；Luna负责fast explore、有成熟参考且边界明确的实现和另一作者的有界复核。本页是[总roadmap](../../roadmap.md)的本轮执行附件；[current](../../current.md)拥有交付状态，不另建总队列。

**当前状态：ACTIVE。** 2026-09-11用户确认main本地/远端590739f并要求goal模式开工；原等待条件已满足，以下准备时点保留。Astra持异步调度/高阶视觉与架构，Luna探索研究，Sol high仅有界较难后端，不写文案或前端。

**准备时点：PREPARED / WAITING_FOR_USER_MERGE。** 接单固定 `main@9bc6090b5b463bdf6286a0c42bdcd399781fc067`；用户要求先准备，待其merge得到清洁节点后再loop施工。本页已完成来源入账、相关PR/节点review、有界explore及计划；产品全量审计、修约、实现、浏览器验收尚未开始。本轮不merge/push/deploy、不占用共享UI checkout。

## 最新补充：P0.5 Product Semantics Registry

用户后续补充将词、glyph、色彩role、placement与interaction同层治理；[完整消费及registry准备裁决](semantic-registry-plan.md)已纳入本单。执行顺序为P0产品词义→P0.5机器可读semantic registry与adapter/gate→IA/视觉层级→跨App/Pages迁移→13图编组→最终回归。复用现有glyph/source/brand账及icon(name)，新增的是上层产品语义enforcement。单用途概念严格归属，多用途几何由对象/标签补全；no icon合法。仍只准备，未开始产品实现。

## 目标与准备裁决

默认表面让人识别工作、状态和可执行动作；精确记录随时能查。稳定常识动作优先图标，必要对象/状态用独立承重的短词；有真实关系的数据才画图。判断要用到的范围、后果、未知与失败仍在相应决策处可见。保留灰阶、archive品牌、稀疏Review与既有控制语法。

[5-turn入账包及25项处置](../../research/semantic-governance-2026-09-11/README.md)覆盖产品语言、Pages、图标、统计/Trace。T1的Run→Execution被T2进一步收敛，不做机械替换。T2的Matter仅领域词与T3/T4的持久工作核心存在张力：本地沿owner保留Matter，普通Chat不强制绑定；这一关系不能由文案抹平。Inbox可作为队列显示名候选，Attention保留独有agent/品牌语义，不能把改名当新的后端队列。

准备阶段不直接改canonical合同。清洁基线上的VS-01先完成P0词义与P0.5语义映射准备合同，再显式修订旧copy-convention的Run产品词、Matter隐藏规则及冲突的Access/Approval词表；原对象ID、schema、API与内部符号不为美观更名。新词/图改变用户对权限或操作后果的理解时由Astra裁，Luna不自行定词。

## 先review再省并：旧节点怎样消费

| 现有节点 / 实际review | 本轮处理 | 不重复承担 |
|---|---|---|
| [Summary D1/D2、CI-B/F × CS-01](../2026-09-11-merge-node/README.md)、[接收收尾](../2026-09-11-claude-intake/README.md)、[SD/BE41施工](../2026-09-11-summary-be41-dispatch/README.md) | 用户merge后重读最终SHA、缺陷与非作者证据；Inspector复用已修复焦点/长路径/披露入口 | 不从旧796c3a5/68b3341重合、不借polish关闭SD-ENTRY或产品整体门 |
| [EX-IC2 Fake UI](../../design/chat-controls-2026-09-10/fake-ui-first/README.md) | 消费完整action row、状态矩阵和IC2-G01…06缺口；新增语义slot并入本轮，不再发同义icon单 | 不阻断在途writer；缺后端仍可做显式fake交互，生产不假成功 |
| [IC-8](../../design/icon-controls.md)、EX-IC1 / WO-IC-01 | 保留Lucide和sprite/manifest parity；新增slot先本地对照再donor归一 | 不重启全图标族竞赛、不默认第二依赖；品牌SVG沿brand独立包边界 |
| [WO-PG-01 / EX-PG1](../../mvp/execution/work-surface-kit/explore/ex-pg1-projection-inventory.md)、[Atlas](../../design/atlas/README.md) | 扩展已存在投影/交互规则，复用lint范围与反例 | 不新建平行Representation truth、补虚构meter或16组件大平台 |
| [CC-I PropertyRow](../../mvp/execution/work-surface-kit/delivery-cci-01.md)、[frontend continuity](../../design/agent-interface-2026-09-10/frontend-contract.md) | Settings/Details按最近先例改层级、返回焦点及适用范围 | 不从Appearance六行推导全域provenance |
| [TPS specimen](../../design/tps-specimen-2026-09-10/README.md) / BE-42、[request telemetry](../../../app/docs/request-telemetry.md) | VS-03只消费清洁节点真实owner；TPS若缺仍明确不可用；fake测量与真实运行分列 | 不把host首输出当provider TTFT，不用字符数/输出总量伪造decode速率 |
| [PR #1](https://github.com/lesPrivilege/Courtwork/pull/1) MERGED、[PR #2](https://github.com/lesPrivilege/Courtwork/pull/2) OPEN Draft | #1合同已消费；#2 head bd1f815是main祖先，内容沿[Pages整合](../../release/pages-ordered-integration-2026-09-11/README.md)接收。新polish从clean main建立增量 | 不重合旧PR树、不恢复已过时Paper/Tour编排。远端PR管理本轮未操作 |
| [13图采集](../../release/merged-ui-captures-2026-09-10/README.md)、VG-01图解 | 保留capture IDs与现有图解来源；VS-05改叙事分组，VS-06从固定新UI采图 | fake商业叙事不等于实验/生产接受，截图待补与已部署状态分别记录 |
| [Harness接缝](../2026-09-11-merge-node/README.md)、[RD-005](../../research/RD-005-multi-agent-selection.md) | 通用Harness与UI基础完备仍优先；trace缺字段逆向交owner | 不把本单扩大成新MAS/Task、第二runtime、Rust或Work Core深化 |

这张表省并消费入口与重复研究，不删除历史原文/工单或替其他owner结单。远端与本地候选具体事实见[PR快照](../../research/semantic-governance-2026-09-11/pr-snapshot.json)及[Git记录](../../research/semantic-governance-2026-09-11/git-review.txt)。

## 清洁节点启动条件与loop

1. 收到用户merge完成的接续信号后，重新读cwd/branch/HEAD/status/worktrees、current、目标交付与origin/main；记录实际产品SHA。当前9bc6090只是准备证据，不作为未来baseline。
2. 核对目标commit已含预期SD-FIX/Chat动作/其它用户所merge的交付，记录未合与未验项。工作树clean只说明无未提交变更，不能代替产品验收。若只有无关dirty文件，保留并另建隔离树，不要求用户为本单清理他人的数据。
3. 从实际清洁产品节点建立隔离施工分支；每次只有一个app/web共享面writer。Luna可并行处理不相交的fixture、源码探索、来源核验；模型能力瓶颈、语义边界和集成由Astra实现。
4. 每片：读对应已登记讨论与先例→补必要事实→Astra裁定→有界实现→作者验证→另一作者按固定SHA复核→Astra组合/真视觉裁决→登记结果与下一片。已有授权不重复申请；当前待用户merge是其明确节奏约束。
5. 失败返回对应片，保留原反例。规范缺口先修约；owner事实缺口独立登记，不让无关后端堵住可执行的fake UI设计。未确定scope的后端不在视觉片顺手实施。
6. 本轮收束条件见VS-06。自动化/定时唤醒尚未创建；本页不会在用户merge前启动施工。

## 一笔路线，按消费顺序分片

| 切片 | owner / 写权 | 输入与最近实现先例 | 具体产物与退出条件 |
|---|---|---|---|
| VS-00 全表面基线 | Luna清点、Astra审查覆盖；独立ledger/fixture | [Luna有界explore](../../research/semantic-governance-2026-09-11/luna-explore.md)、app/web、site、导航/路由、现有测试场景 | 固定clean SHA的surface/state台账；渲染与源码交叉核账；遗漏面明确，不能以grep穷尽声明 |
| VS-01 统一词义与表达规则 | Astra单写词义/schema/adapter，Luna可做已冻结映射与gate；原copy/icon/Atlas合同同步 | frontend-contract；SG-01…08、16…24；既有ui-controls/纯projection/PropertyRow | 词义owner/例外、P0.5 semantic registry/adapter/collision gate首片、KEEP/COMPRESS/VISUALIZE/DISCLOSE、Glance/Inspect/Trace写回原合同；明确旧规则覆盖范围；可直接施工的代表场景裁定 |
| VS-02 Inspector / Activity | Astra主写信息架构及事件映射；Luna有界fixture | inspector.mjs、coordination-projection/view、ui-controls、最终SD-FIX；SG-18 | 默认工作概况+按需activity/files/usage/details；事件与精确ID可达；无父子/时钟事实则线性组而非虚构tree/waterfall；焦点/长路径/错误反例通过 |
| VS-03 Telemetry / Usage | Astra测量边界；Luna可实现已冻结的纯渲染与测试 | telemetry-view、usage-projection/view、request-telemetry、usage-details；SG-19/20 | 请求host时序、已有Usage图形层次和table下钻；unknown/incomplete/0不混，UTC/model snapshot与409保留；cache重叠不组成假总量，定义可获取 |
| VS-04 Attention / coordination → Settings / control → Home / Chat | Astra跨面语义，Luna有界已有模式实现；共享文件串行 | attention-view、thread-projection、settingsRow/createPreferenceGovernance、createModelPicker、home-view、EX-IC2成品 | 跨面同一概念同词；Inbox候选按真实面裁；Access/Approval/Review可分辨；请求/保存/生效/已绑定的关键差异仍能判断；动作/ARIA/tooltip一致 |
| VS-05 Pages | Astra IA/视觉层级，Luna有界中英文与已裁页面实现；site writer明确 | site/src/copy/page/product-pages/pricing/steps、现有VG图解/capture-plan；SG-09…15 | 产品证明前移、Spark/Attention独有、Matter/Experts/Review关系清楚；Runtime降到技术深度；重开导航/信息顺序有明确新裁定，13图按故事组织且不换来源 |
| VS-06 全场景回归与视觉收束 | 非作者Luna有界复核、Astra最终裁决 | 每片固定commit/fixture、frontend-contract矩阵、现有测试/lint/Pages校验 | ledger每行有处置/实现/检查/限制，所有本轮承诺面闭合；真实视觉和交互无未处置阻断，留存before/after与负例；更新current而非只换截图baseline |

VS-05的文案/IA准备可在VS-02–04时并行，须消费VS-01词义；最终视觉、真实截图与产品用词回归串行跟随固定应用节点。图标治理贯穿VS-01–05，并入每个动作的最近先例，不另排一轮图标工程。

## 台账口径（VS-00交付契约，当前未测）

每一行记录：id、surface/route、state/fixture、source SHA/path/symbol、datum/action、semantic owner、用户问题/后果、current representation、proposed representation、四类裁决、disclosure level、nearest precedent、affected grammar、backend gap、writer、verification evidence、status。生产、显式fake、公开叙事各行注明来源，不把它们的状态统计相加。

覆盖按钮/图标/导航/标题/helper/空态/错误/状态/tool calls/活动/Attention/Spark/Matter/Review/文件/Usage/Telemetry/Trace/Settings/provider-model/coordination/Pages，以及tooltip、ARIA、动态服务错误和中英文。

计数必须指定surface×state×viewport×scheme×language与披露深度：可见prose块/词数、icon slots、raw fields、numeric fields、charts、tables、expandable disclosures。默认面与展开面分开；中英文按固定分词规则，不能直接同比。源码候选数与渲染可见数分开，键盘focus触发的tooltip另场景记。比例变化只是辅助，不能以“减词X%”或“新增图表数”当退出门。

## 验证与最终UI debug

执行阶段使用**内置浏览器 + computer use + 实际截图**。Astra看目标局部、相邻面及完整用户任务；Luna可以在独立合成数据/端口复现失败并有界联调，最后由未写该片代码的reviewer验证固定候选。截图必须说明commit、fixture、时间、viewport、scheme、语言与披露状态；不接个人会话/凭据、不默认付费provider。

按实际影响覆盖1440/1280/390、明暗、200%真实重排、键盘/焦点/Escape/触屏可达、长文字/路径、空/加载/错误/流式/未测量，图表有可读等价和精确值。5秒定位working/waiting/failed、常识动作识别与icon歧义逐场景说明；没做可用性实验不声称用户研究通过。必要SR/原生/IME等环境若不能跑，明确未验证并判断是否阻断，不能用AX存在当VoiceOver实测。

适用命令沿README/frontend-contract：定向node tests、需要组合回归时npm --prefix app test、smoke、lint-interaction/colors/materials及contrast；Pages沿site/README的现有build/link/figure/capture检查。新增copy门验证允许的英文动词“Run tests”、用户数据和Diagnostics例外不会误伤，同时拒绝普通UI复泄漏；它不是源代码全局禁词器。每片不必要重复全量，但最终组合必须重核受影响接缝。

## 准备交付检查

本次只跑文档链接、diff、来源hash/截断覆盖与Git事实核验；不运行产品测试、采新UI截图或宣称视觉接受。Luna报告是只读源码观察，不是本单独立产品接受。最终检查结果见入账包verification记录。
