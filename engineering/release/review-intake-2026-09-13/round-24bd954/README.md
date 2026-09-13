# Release审查回收 · 24bd954轮

2026-09-13。用户授权登记、Luna explore/audit、Astra裁决/架构及关键实现，并完成release前开发与筹备。来源会话“审查发布门槛”及两份附件属于参考提案，其派工、排序、HOLD与采用措辞均不自行取得工程权威。本地裁决见下表；当前状态仍由[engineering/current](../../../current.md)持有。

## 收件与现场

初始共享 `main@24bd9545936dd19a498fc6b7eed5de106ac0d5e8`，存在其他writer的current、研究目录和证据修改。隔离分支 `codex/release-readiness-20260913` 从该HEAD建立。随后main新增Court定位参考 `ad41b92` / `9a838a8`；文档增量不当作本轮作者工作。固定源码审阅与最终合流身份分别记录。

[收件哈希](receipt.json)固定ZIP和解出的四文件、Harness附件；[会话原返回](inputs/conversation.json)保存工具实际返回的两轮用户/助手内容，分页hasMore=false。原件见[审查](inputs/REVIEW-AND-HANDOFF.md)、[定义草案](inputs/PRODUCT-DEFINITION-DRAFT.md)、[来源](inputs/SOURCES.md)、[包manifest](inputs/MANIFEST.json)与[扩展提案](inputs/HARNESS-EXTENSIONS-NEXT-ROUND.md)。会话或包引用的Library原件未随本轮上传，不能把摘要登记为完整原件已收；既有本地研究可按其固定版本消费。

原报告的Actions IDs保留为来源观察：Pages run 34752311258/job 103710791650；Runtime Node24 job 103710791717的942项/931通过/11失败。它们不是本轮重跑结果。QuickJS/证书的已作废归因不采用；不把测试准备失败写成11个生产业务bug。

## Astra逐项裁决

| 来源项 | 处置与原owner | 本轮动作 / 后续退出条件 |
| --- | --- | --- |
| RV-01 README drift | 采用，P12/G5生成源 | 保留check:product、并发4/8说明到readme生成owner，重生README；普通build、链接与浏览器复验。构建成功不冒称部署成功。 |
| RV-02历史对象 | 采用，P12测试输入 | CI完整历史；五测试消费同一manifest，pretest校验commit/path。非main祖先schema3用原SHA五文件原字节及hash，不依赖归档分支存活，不改旧host或删反例。 |
| RV-03临时目录 | 采用，P12测试fixture | RuntimeStore四case改OS tmpdir；失败也关闭store/lock并清理。Node22/24本地结果与Ubuntu CI结果分开。 |
| RV-04产品叙事 | 采用并调整，G5 | 提前明确Chat/Spark/Attention/Harness方向，安装和运行处给实际支持集合；不把内部工单铺首页，不把普通Chat强制绑定Matter。 |
| MR-01 Runtime替换 | 已登记/后置，P03/P04/DRT-03 | 固定Pi发布；真正第二执行器驱动生命周期port，不重造loop或宣称替换已完成。 |
| MR-02页面生命周期 | 采用为局部维护要求，现有frontend contract | mount/update/dispose、请求generation、draft/return/focus归属沿既有编排；报告未证明具体竞态，本轮不为行数整体重构。 |
| MR-03测试/生成体例 | 即时消费，原测试与site owner | 单一历史输入清单、不可变fixture来源、OS临时目录清理、readme源维护；不另建测试平台。 |
| UI Grammar | 采用为既有规范增量 | 只改文字/角色边界与支持说明，复用既有页面容器；作者浏览器与Luna源码审阅各按实测范围记账。 |
| Paper正文 | 不捆绑本轮 | PAPER仍钉住SE9.6；Attention消费实验将来先入Practice Index候选观察，不把产品定义当Kernel反例。 |
| G1–G3最终候选 | 延续原门，未由旧PASS自动关闭 | 干净安装、真实模型独立提交、人的决定与接续需最终候选/等价证明；Local test不冒充真实模型。 |
| G4演示 | 延续原操作稿 | 2–4分钟真实UI媒体及provider/data/source身份；既有截图与本轮浏览器回归不代替演示。 |
| G5最终事实 | 本轮完成文案/映射准备 | 精确支持集合与证据见运行说明及本轮回执；发行、远端CI、Pages部署、私人简历分别留待实际执行。 |

## 固定支持集合与扩展裁决

首个正式工作Release保持已选Pi + Host工具 + 合成Inbound NDA工作合同。此集合不包括Agent自行执行仓库测试；不能借已完成DF-03的人工oracle声称DF-04已交付。用户的扩展研究被接入既有[dogfooding](../../harness-implementation-2026-09-12/harness-dogfooding.md)与P卡，不把附件全部候选变成首发阻断。

| 扩展建议 | 采用方式 / 接缝 | 工程入口与退出证据 |
| --- | --- | --- |
| 经典coding纵切 | 采用为下一Developer消费者；现有read/list/grep/write与Files exact版本/diff先复用 | DF-04补固定Host recipe之后，模型读→改→执行检查→人审→重开接续；新执行需要cwd、环境策略、限时/限输出、取消/退出及Run/call身份。 |
| Hooks | 采用语义与合同准备，执行后置 | [RD-009](../../../research/RD-009-trusted-harness-extensions.md)按一种真实消费者触发；观察/拦截/变换分型，守门失败不放行，变换后重新授权；复用Runtime资源身份/绑定/记录，不新建总registry。 |
| Computer Vision | 按输入与权限拆分，后置 | 一张显式图片解释先于屏幕采集；浏览器动作、桌面动作各自验收，不能用“视觉”开关合并授权。 |
| Browser | 受控网页任务消费者触发 | RD-009沿现有adapter边界；输入范围、网络副作用、审批、取消与unknown独立证明。 |
| Agent/subagent | 有界核查消费者，后置 | 输入范围、能力ceiling、子执行ID和结果引用接现有Thread/coordination；本轮Luna协作不是产品子Agent实现证据。 |
| command/skill/profile/MCP/UI | 分类采用，不混成prompt或hook | CMD-01/CMP-01继续[RD-008](../../../research/RD-008-command-compaction.md)；MCP仍按已支持tool与catalog-only边界。UI slots声明不等于可执行renderer注册。 |
| 受信源码扩展 | 采用为正式接入形态 | 固定来源/版本、薄adapter、构建时组合或重启生效、样例/反例与清理；不要求先做插件市场、隔离任意第三方代码或热替换。 |

DF-04固定命令只约束调用入口，不约束被执行代码的全部OS能力。模型新写的测试即使在固定cwd运行，也可使用文件/网络/子进程API。首片应是无个人数据/凭据的独立合成仓库，经明确Host执行授权，称“受信本地执行”，不能称安全沙箱；若要支持不受信代码，先有相应OS隔离合同。

扩展必须登记ID/版本/来源、执行owner、scope/permission、配置与历史binding、生效/清理、Run/call结果及unknown、默认Inspector fallback与升级fixture。后端私有扩展、共享能力服务、Work专业扩展保持各自owner；前后端按同一扩展身份关联，不要求物理同包。普通新扩展应无需改主loop或复制正式状态，真实合同增量必须可定位并测试。

## 产品定义与前端体例

Chat负责交谈与资料交接，管理应用自身保留的数据；披露仍针对本次连接与scope，不代表管理第三方云端会话或服务端缓存。Spark定义为短任务的检索/快读/翻译/比较/索引/审计准备；Attention关联请求、处置与核查，帮助人和Agent找下一步。这些是角色，不是固定模型或三个必然并行的进程。

Attention事实至少分开：接收/投递、进入某Run的精确输入、处置及结果引用、独立核查、正式owner决定。不能串成只升不降的“已读→已完成”；没有证据不等于模型内部一定没有理解。后续实验沿HL-A0/A1与既有治理需求，保留single-active-Run合同，外部PR/message connector、自动发送和scheduler不因叙事提前获得能力或授权。

配置→Settings/Runtime，用户入口→composer已有action/command，过程→现有工具/执行展示，结果→共享file/diff/output reader，详情→Inspector。正常hook静默，改变流程才显示影响。容器/返回/focus/pending/空错旧状态按[前端规范](../../../design/agent-interface-2026-09-10/frontend-contract.md)，不新增永久侧栏或视觉grammar。

最近已实施发布面先例是[work-loop发布](../../governed-work-loop-2026-09-12/README.md)与[Pages体例](../../../../site/README.md)。本轮文件为site/src/readme.mjs、page.mjs、product-pages.mjs及运行文档；仅文案与现有容器内容，零新增色值/材质/动效/控件或正式状态。历史媒体source_sha不重标成新候选。

检查、非作者审阅、最终源码身份和剩余真实运行项统一进入[交付证据](../../../../evidence/release-readiness-20260913/README.md)。本页不是新的Release总账，也不声称已创建远端PR或发行。

## 后续真实GUI入口反馈

用户提出首次交谈不应前置命名，工作区可选、未分配聊天进入Recent。Astra与Luna按[BE-23/DWB-05前置片](../../../research/deferred-workspace-binding-2026-09-12/recent-onboarding-20260913.md)采用，保持普通Chat与global Attention身份区别；该schema/导航改动独立于本轮固定运行候选，尚未施工。扩展官方定向来源核验见[Exa回执](exa-source-verification.md)。
