# Fresh Astra · 通用 Harness Core 与首个场景实施交接

2026-09-08。用户确定下一单为自研Harness Core：消费已有准备/index，搭建通用底层并封装第一个场景；Fable同时在独立分支从前端逆向。这里fresh表示新的Astra上下文，不恢复Courtwork-fresh目录或长期分支。**这是实现授权，不是再交一轮研究计划即结束。**

读取基线：`cf62cb053da1d2c4c66126ba048b901ae960f0e1`，Courtwork/main，端云一致、工作树干净。交接本身随后提交；接单从包含本文件的main建立隔离worktree，并记录实际SHA。产品基线仍等价于Pro审查的`e0d214dbc690b7fdf4dcab5f4889c252e6b95f01`；Pro意见可并行消费，不是开工前置。

## 目标与自研边界

把现有evidence-memo中已经成立的工作状态与提交机制提炼为可独立于模型、Session、producer生命周期承重的Core，接入现有通用runtime，再以Inbound NDA Playbook Review作为首个封装。通用能力必须由这个真实consumer检验；不是先建立全平台、再等待场景。

- 继续使用Pi AgentSession/loop、现有host/store/control-plane/MCP与权限边界。先对账成熟机制的复用和薄适配，确认缺口才改；“自研Harness Core”不等于重写模型循环、再造调度器或另起宿主。
- 自研责任集中在Work Contract、版本/证据、可信Decision、正式状态事务、工作Context投影、跨Session连续性与独立历史读取。Core不导入provider/GUI包，NDA规则不进入通用loop。
- 现有SQLite Core的CAS、幂等、trusted_decide继续复用。允许将通用模块从样本目录提取到合适的共享位置并调整生命周期；**同一正式状态只能有一个写入owner**。不得复制成新旧两个可写Core。先明确旧样本桥接/数据兼容，再移动；路径、语言和全面schema重写不是先验目标。
- 对低后果普通Chat保留现有轻路径，不强制创建Matter。通用性用无NDA资源的对照Session、Core独立调用/恢复和依赖边界证明，不宣称已验证全部领域或替换所有runtime。

## 首先消费的材料

1. 本仓`AGENTS.md`、[current](../../current.md)、[architecture](../../architecture.md)、[core-contracts](../../core-contracts.md)、[PAPER.md](../../../PAPER.md)。Paper采用9.3固定SHA；9.6若作为比较输入，另固定字节，不自动升级采用版本。
2. `engineering/options.md`、`engineering/decisions.md`、`engineering/research/RD-001-runtime-adapter.md`、`RD-002-commit-recovery.md`、`RD-004-harness-core-pt2-reconciliation.md`；`engineering/ecosystem/`。
3. [Experts研究与原始index](../../research/experts-hotplug-2026-09-08/README.md)、[验证设计](../../research/experts-hotplug-2026-09-08/validation.md)、[H0–H5](../../research/experts-hotplug-2026-09-08/pr-plan.md)、[Longlife宣言覆盖](../../research/longlife-2026-09-08/README.md)。先消费已有证据，只有版本/实际缺口使证据失效时才重开局部研究。
4. 当前`app/runtime/`、`app/server/`、`app/extensions/evidence-memo/`、相关测试与`docs/runtime-control/`。研究历史基线不代替当前源码。

早期原件已实际定位，可定向只读（不在公开树，不上传整个快照）：

```text
/Users/lesprivilege/Projects/Courtwork-evidence/2026-09-08/continuation/engineering/mvp/execution/runtime-sources/pt2-harness-core-explore-2026-09-06/
  harness-primitive-index.md
    sha256 170fe09abddb4a5fe0476dc2e68d392459868e050eaf0066854ef8dc1ce3f7a8
  source-manifest.json
    sha256 3c10d146f11d60a66c2e34366e5b74b72be1b7fd38e22f8e631887013157b8d5
```

本次仅验证两原件存在、hash及index标题结构，不冒充已全文消费。执行者读取其中primitive/coverage/selection matrix、Q1–Q8、正式提交补充与source ledger，并把重要条目逐项映射为复用/薄适配/自研/延后/拒绝及理由、源码消费者和反例。只引用RD-004总结不足以完成这一步。其他本地原件按记录的确切坐标召回，不扫描凭据/私有archives；旧Courtwork仅按冻结SHA/path召回。

## 实施切片与交付节点

以下整合原H0–H3，不再建立第二套编号或产品状态账本。每个节点提交可复核代码/fixture及实际证据，交付后继续下一节点；遇到真实provider未配置可保留not_run，同时完成其余确定性工作。

### 第一节点：固定契约和Core承重

- H0：固定纯文本合成NDA、被代表方/交易事实、3–5条playbook规则、gold与开发/holdout hash；覆盖正常、缺失、冲突/无法判断。由非作者检查预期，不把规则当法律通则。
- H1：确定通用Work envelope与版本化domain payload的界线；明示Matter、source revision、Candidate、检查/义务、Decision、Artifact与执行来源。通用包保存身份/版本/权威及历史，场景包解释规则和专业检查，不把全体领域字段塞入通用schema。
- 在既有Core上实现候选修订生成新候选、可信决定及答复丢失后的查询；固定request identity和同键异内容拒绝。保留单写者事务、历史只追加/取代语义与旧记录兼容。
- 实现有归属检查的existing Matter重新绑定新Session；Session结束/删除不级联丢失工作。不得直接相信客户端matterId或模型actor。
- 固定给Fable的query/action、错误、版本、合法动作与fixture，允许继续沿现有`/sessions/:id/actions`、`surface`边界；只有真实职责缺口才新增窄接口。

### 第二节点：首个NDA场景与runtime接线

- H2：封装规则/资源、schema/verifier、source坐标、逐规则finding与未决/冲突及reconciliation。顺序执行先成立；复用现有profile/extension、模型能力准入与Pi loop，不新增法律专用loop。
- 从工作有效版本、成果、未完义务及必要依据生成有来源/选择/遗漏记录的Context，遵守现有上下文预算/运行绑定；模型生成只能保存Candidate，不能取得可信决定能力。
- 一次Run绑定Contract/playbook/source/profile版本，取消/unknown/迟到结果不产生自动接受。局部重跑不覆盖已裁决事实。
- 运行来源从宿主可信Run正确传入领域记录；当前样本`coreProviderConfig`固定simulation，不能把真实provider误记或把旧simulation重标成真实。
- 同一runtime的A Session有NDA、B Session无NDA；隐藏工具schema与执行侧拒绝分别验证。关闭场景后普通Chat继续工作，通用底层不依赖NDA启动。

### 第三节点：独立历史与前后端合流

- H1/H3后端：材料替换后仍能按候选绑定版本核查来源归属。当前`replace_source_set`删旧成员关系、`read_source`仅当前revision，必须补保留关系或可验证不可变packet，不以裸source读绕过Matter边界。
- 历史读取不依赖执行producer或保留其singleton。当前无registry record时`getSurface`无projection；提供host/Core可读取的版本化历史与合法动作边界，renderer缺席、producer缺席、进程重启分别验证。
- Fable消费同版本inline/detail packet及真实动作，Astra从API回执/状态恢复方向合流。前端主路径尚未接入时后端可单独交付，但G2/G3不据此关闭。

## 与Fable并行的写权

| Owner | 可写范围 | 协调方式 |
|---|---|---|
| Fresh Astra | Core/bridge/client、domain数据/工具adapter、必要server/runtime薄接缝、后端契约与测试、H0 fixture和对应证据 | 使用独立worktree、合成数据与端口；先冻结最小query/action，再给前端消费 |
| Fable及其前端执行者 | `app/web/**`、`app/extensions/evidence-memo/renderer.mjs`、前端编排/样式/UI交付 | 从实际界面逆向提出字段/动作/错误/缺口；不静默定义Core权威状态 |
| 共享契约/接线 | surface/envelope、静态模块准入、extension入口、共享测试fixture | Astra拥有后端语义；触及前端共享文件先交换精确diff/接缝，串行合流，保留另一writer改动 |

Astra本单不写根README/site/品牌源或抢占Fable的web文件。BE-5与完整WK11后置，尤其不得和本单并写service。单独的Pro初审继续冻结旧SHA，新实现以diff回应；无需暂停等待Pro。

## 必须成立的反例与证据

- 旧base拒绝、同键同内容仅一个正式效果、同键异内容拒绝、模型伪造actor拒绝；事务中断与回执丢失后能核对唯一状态。
- 修改候选、材料版本变化后旧依据仍可读但不能误用于新决定；其他Matter不能读取/提交本Matter数据。
- 换新Session继续同Matter，结束/删除旧Session后工作保留；重启后版本/Artifact/义务一致，不盲重放tool。
- 两Session能力隔离、取消与迟到、unknown不晋级成功；provider身份与simulation明确对应。
- renderer与producer分别缺席，历史可读且无非法动作；旧schema/Contract不兼容时有明确只读或拒绝，迁移失败不破坏原数据。
- 用合成端到端走材料→候选→检查→人的决定→正式成果→新Session继续。真实provider沿用户GUI与授权补证，不读取个人凭据，不用fixture关闭真实链。

跑实际受影响测试，最终运行`npm --prefix app test`与`npm --prefix app run smoke`（smoke使用自身独立合成环境；先读脚本确认目录/端口），只在新增失败/改动时扩大复验。无凭空build脚本。交付真实命令/日志、数据类别、固定SHA与未检项；作者测试和Luna/非作者独验分列。按原PR plan允许Luna做有界来源核验与非作者验收，不重新外派全量架构研究。

## 完工与返回

本单实现完成要求：通用Core有独立生命周期/单一正式owner；首个场景完整通过该接口；来源消费表、Paper不变量→代码→反例表和迁移/恢复证据齐备；Fable可用冻结契约接线。仅交index、类型声明、API mock或样本改名不算实现完成。

本轮产品最终仍由 [G1–G5](public-readiness.md)收口：真实模型、可用Review/跨Session界面和可公开演示未成立时明确剩余项。无需宣称整篇Paper已证实；只有可泛化的固定工程观察才向Practice Index提出候选，不改Paper正文。

返回实际branch/worktree/SHA、改动范围、来源消费与保留/删除裁决、契约/fixture、实际测试/独验、给Fable的最小接缝、Pro补审diff及未决。可提交并推送施工分支；集成main按固定交付与独验裁定，不部署。所有当前状态由`engineering/current.md`统一登记。
