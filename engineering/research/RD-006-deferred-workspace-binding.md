# RD-006 · Task-first / Deferred Workspace Binding

2026-09-12；状态：Astra选型已裁，后续实现PR文稿待消费。研究基线 `647bc2167efe5437d0ca73a60a406549d9a1e268`。Astra负责架构/迁移/集成；Luna有界源码与donor探索。作者检查不等于独立接受。

问题：用户能否先开始任务，再在需要时连接资源，同时保持会话身份、权限、运行恢复及成果来源一致？输入、逐项处置和证据见[消费包](deferred-workspace-binding-2026-09-12/README.md)。

## 选型

| 候选 | 裁决与理由 |
|---|---|
| workspaceDir改nullable | 拒绝。当前Pi、工具、journal和文件历史依赖托管cwd；字段置空不形成能力边界 |
| 默认继承最近project/cwd | 拒绝。隐藏继承不能表达授权、恢复和跨Session隔离 |
| 另造Standalone Task/独立agent loop | 拒绝。已有global Session，复制会产生第二份运行/权限真源 |
| 现有Session + 托管成果目录 + 显式外部resource binding | **采用**。保留身份与现有执行机制，增量表达外部资源能力 |
| 会话中热换Pi cwd | 第一阶段拒绝。运行配置/工具闭包/恢复身份必须一致 |
| 通用remote environment调度器 | 后置。先完成一个本地只读纵切，不引入新框架依赖 |

托管目录可以在创建Session时分配；“延迟绑定”指用户资源及其能力的绑定，不以推迟mkdir作为成功指标。托管目录不是OS sandbox，不据此声称任意shell或第三方extension安全隔离。已有workspace工具的受限路径范围不自动扩张到本地目录。

## 不变量与owner

1. Session ID、既有global/project scope和projectId保持；目录绑定不是project迁移，也不隐式授予Matter访问。global会话继续不能绑定Matter extension。通用入口先复用已支持身份，独立角色模型另单裁定。
2. Runtime service/store持有资源绑定与修订；权限仍经现有工具治理。拟议binding携带稳定资源ID、规范化locator、访问模式、revision、授权引用和失效原因，字段/API须由DWB-01冻结。不得复制一套独立permission store。
3. 一个会话首版至多一个外部只读目录，默认零个；managed workspace始终独立保留为产物/journal根。连接、替换、断开均是显式命令；同请求ID同内容返回原回执，异内容拒绝，过期expected revision拒绝。
4. 每个新Run固定binding revision、资源身份与有效权限上限；执行前仍校验撤权、路径身份和当前政策。固定快照不延长已撤销授权。模型参数不能选择另一个Session、根目录或actor。
5. 活跃Run期间不改变binding/cwd。需求触发先给出需要资源的明确结果，在当前Run结束或确认取消终态后连接，下一Run显式重试；不能无意重复此前外部效果。撤权即时阻断后续资源调用并请求取消，已完成读取不能抹除。
6. 路径检查在真实访问点执行：绝对路径/上跳/符号链接逃逸、根目录被替换、平台别名及检查后替换均须有处理策略。仅在连接时realpath不够。原有workspace guard不能未经验证用于任意外部目录。
7. 新资源不得自动注入旧指令/skills/MCP、workspace配置或整个文件树；Context按当前披露和预算取显式来源。读取源文件附资源ID、绑定修订、相对路径、内容hash/版本与Run归因；复制内容保留为历史，不表示授权仍有效。
8. managed成果是session文件/候选证据；发布为Core Artifact或关联Matter沿原有显式入口。断开不搬家、不删除托管成果；外部源失效不让历史回执变成功。归档/保留/清理沿现有生命周期，自动GC另单冻结。
9. 旧数据迁移映射为原有managed目录与空外部绑定；不根据cwd推导本地授权，不改旧runtime.bound/hash/历史路径。实施时按真实最新schema升级、严格校验、备份和旧host拒绝读取；失败回到独立备份，禁止共享升级数据给旧host。
10. 本轮不引入provider、编排或文件系统框架依赖。OpenHands/goose为机制与反例参考，不采用为CW执行后端；其他厂商比较不作为裁决所需前提。

## 产品与前端边界

首片免选目录入口仅复用现有Attention创建链。Luna确认普通Chat的BE-23仍开放（一般service要求projectId，UI先选project）；不得将一般Chat偷换成Attention global身份。通用projectless Chat须另冻结产品角色/Session身份、配置链与导航恢复合同，本轮没有关闭BE-23。Standalone是可选文案，不是固定产品术语；无project与无外部目录分别表达。后续[五图语义裁决](deferred-workspace-binding-2026-09-12/semantic-reference.md)补充分离组织归属、执行位置、Git/worktree、权限与模型。Standalone若采用，表示未连接外部资源，托管成果并不让它变成另一种Session。Connect folder、当前范围、断开/撤权的可用性来自服务capability；只读明确表达，不用“连接”暗示write。用户指令中路径本身不直接写入授权。

最近实现先例为[Attention会话](../../app/docs/attention-agent.md)及[UI控制](../../app/web/ui-controls.mjs)的action/anchorPopover、[app](../../app/web/app.mjs)的openDialog/closeDialog与焦点恢复。受影响grammar为composer、scope显示、permission、overlay；遵守[连续性规范](../design/agent-interface-2026-09-10/frontend-contract.md)。本轮只写合同，无新specimen/视觉验证；实现时补owner状态、失败/陈旧/处理中、Escape/焦点与宽窄明暗实机证据。

## 判别与停止

PR验收见[施工文稿](deferred-workspace-binding-2026-09-12/pr-plan.md)。身份改变、授权隐式扩大、旧回执被重算、路径检查可绕过或恢复无法确定目标时，保持外部能力关闭。需要改变Core/Session scope/第三方cwd生命周期时退回Astra，不把nullable修补冒充本路线完成。本次没有新产品测试、provider调用、迁移、部署或产品门关闭。

## 2026-09-13入口顺序增量

用户真实验证后的[Recent与可选工作区裁决](deferred-workspace-binding-2026-09-12/recent-onboarding-20260913.md)前置BE-23/DWB-05：普通projectless Chat、顶层Recent、发送前可选组织位置、取消前置命名。先补身份/schema/配置与恢复，外部目录仍由DWB-01/02负责；尚未实施，不以Attention替代。

## 2026-09-14 · 真实仓库读写增量裁决

用户明确要求真实仓库挂载及Access grammar，Astra采用Luna只读探索，启动DWB-01/02并将DWB-04从后置提升为本轮串行施工；不把只读片交付当成读写任务完成。当前核验Host schema15，若施工基线未变化则迁移16，Core4/bridge5不变。迁移由RuntimeStore原owner完成，旧Session默认空绑定，保留managed workspace、历史字节与旧Host拒读规则。

第一施工片冻结绑定与读取：Session至多一个外部目录，独立于projectId、managed cwd/journal和ws_*。Runtime service/store持有稳定binding ID、规范化root及文件系统身份、revision、有效/撤销状态；命令使用requestId与expectedRevision，原回执幂等。新Run固定绑定快照；连接/替换须无活跃Run，撤权立即阻断后续调用并请求取消。新增repo_list/read/grep受控工具，模型只传相对路径。每次访问重验当前授权及root身份，源回执有binding/revision/path/hash/Run归因。绝对host路径不自动进入模型Context。采用现有store命令与事件先例，不另造permission store。

第二施工片是独立外部写入效果，不将ws_write换根：Access持久枚举仍read_only/draft/ask，分别拒写/允许已绑定范围写/精确批准。绑定是用户明确连接目录的动作，Access不赋予其他目录或网络权限。repo_write必须携带目标预期hash（创建要求不存在），批准绑定目标、前态、新内容hash和binding revision。执行前重核；冲突拒绝且不覆盖。单Session写入串行；外部竞争者存在，因此不能把普通先检查后rename宣称原子CAS。施工者必须证明所选平台访问/提交机制的路径竞态与冲突边界；做不到时回报具体缺口，由Astra裁决，不悄悄降级覆盖。

外部写入持久记录prepared/已确认结果/unknown及操作身份，故障恢复仅核对实际前后态，不自动重放未知写入；撤权与批准后的等待均须重新验权，已完成效果不能宣称被撤销。文件删除、移动、任意shell与测试recipe不纳入首个repo_write。使用隔离合成仓库验证越界、symlink/root替换、冲突、撤权、重启与重复请求后，再对接真实dogfood隔离树，绝不默认写共享dirty主树。

第三施工片接GUI：Home与已有Chat复用Access选项/说明/选中态的共享primitive，保留各自保存时点。Project组织选择与Connect repository动作分开；本地浏览器不能直接提供Host目录句柄时可使用明确的Host路径输入与校验回执，不伪装上传为挂载。用户可查看真实绑定范围、失败与断开；能力未接通前不绘制成功态。按原UX grammar和相关precedent施工，不引入Full access语义。

串行验收：每片作者交付后非作者Luna定向验收，再发下一片；GUI加Chrome人类目验。Astra仅处理新语义/集成裁决，不重复验收。此次是架构授权与发单，尚未实现、迁移用户数据或关闭产品能力门。

## 2026-09-14 · DWB绑定/只读施工片责任记录

本片改变Runtime对Session外部目录绑定的持有责任：RuntimeStore持有绑定、revision及幂等回执；Runtime service串行化绑定命令、Run快照和撤权；受控repo读取工具只接收相对路径并在读取时核对有效绑定。最近实现先例为 `app/server/store.mjs` 的严格Session验证/序列化迁移、`service.mjs` 的Run内配置快照与事件归因，以及 `control-tools.mjs` 的逐工具治理；`workspace-tools.mjs` 仅作功能形态参考，其路径校验不能直接充当外部目录安全边界。

必要跨层变更限于Host RuntimeStore 15→16、Host session/binding命令与读取工具治理；Core user schema 4、bridge app schema 5、managed `workspaceDir`/Pi cwd/journal/artifact root不变。绝对host路径供Host展示与固定helper使用，不进入模型Context或模型工具参数。第一片不实施写工具、Access UI、shell、测试recipe、Core/bridge迁移或用户数据升级。作者在施工前核对：当前Node/Darwin文件API的descriptor-relative访问能力不足以仅靠既有path guard证明根/祖先替换安全；`repo_*` 工具开放须有可复现的根身份及TOCTOU处理证据，不能将 `ws_*` 的旧guard直接移用。

### 2026-09-14 · DWB绑定与只读工具首片交付（作者自检）

按Astra后续裁决固定helper边界：Host以 `shell:false` 调用固定Python标准库helper，结构化stdin只接收闭集操作；模型不提供可执行命令、环境、根目录或绝对Host路径。helper先开绑定根并用文件描述符 `fstat` 核对持久device/inode，再逐级以 `dir_fd` 与 `O_NOFOLLOW` 访问；文件通过同一打开描述符读取。根身份在读取结束前复核，结果交付前服务再次验绑定并将来源回执写入现有RuntimeStore。超时/取消回收helper；大小、遍历、结果与搜索计算有上限。该机制只约束三项内置只读工具，不能宣称OS sandbox或任意extension隔离。

实现于隔离分支 `codex/workspace-access-20260914`，基线是提交 `7e1a1ff047721e1ca6c871deba7f367ccea55a06`；未改共享main工作树及用户数据。RuntimeStore schema15→16 为旧Session写入空外部绑定，保留managed workspace与旧Run；新增绑定/撤权revision与原请求回执、Run绑定快照/事件、认证的GET/PUT服务端点，以及只在有效绑定Run中治理开放的 `repo_list/read/grep`。读取事件存relative path、binding/revision、Run归因及结果/来源hash。复用既有Session、Run、配置串行队列与RuntimeStore owner；Core4/bridge5和`ws_*`根不变。实现合同与当前界限见[repository binding文档](../../app/docs/repository-binding.md)。

合成验证用固定旧Host在原始提交上生成schema15字节，再独立升级、检查精确备份、旧Host拒读和独立备份恢复；合成目录覆盖列表/UTF-8读取/grep、符号链接/上跳拒绝、替换根检测、来源hash、幂等冲突、revision竞态及撤权取消。`node --test tests/repository-binding.test.mjs` 为4/4；受影响历史迁移文件定向组79/79；最终 `npm test`（pretest核45项历史fixture）1036/1036；`npm run smoke` local-fake通过，真实provider未调用。修改的JS `node --check`、Python helper AST compile、`git diff --check`通过。首次文档链接检查报告11条 dirty-main 状态文档目标缺失；将隔离`current.md`恢复为HEAD基线并保留本片记录后，`node tools/check-doc-links.mjs`复验通过：1312份文档、7312条链接、0问题。首次全量发现降版合成fixture带入schema16字段；按实际schema移除后定向与最终全量通过。

边界与剩余片：当前 helper 用POSIX device/inode核对根，并跳过 `st_dev` 不同的子文件系统。Astra裁定本只读片的授权范围是用户所选root在Host文件系统namespace内可经普通相对路径访问的内容，因此预先存在的同device mounted descendants在范围内；helper不单独识别其mount边界，不承诺物理底层目录隔离，也不保护恶意mount-namespace变更。现有根身份、symlink/no-follow、不同device和撤权守卫继续生效。第二片`repo_write`/外部效果与第三片Access GUI尚未实施；真实Agent成功、用户体验、UI验收和首片非作者复验均未完成。本段记录作者实现与源码/合成检查，不称整个仓库读写目标或能力门已通过。

### 2026-09-14 · 首片非作者复验处置

[首片独立复核](deferred-workspace-binding-2026-09-12/independent-review-20260914.md)提出两项P1：同device bind-mount descendant可由获准相对路径读取，授权范围当时未冻结；`api-v6.md`仍把schema 5称为current并声称没有workspace外路径。Astra裁定后，原任务处置如下：

| Finding | Disposition | Rationale and evidence |
|---|---|---|
| Same-device mounted descendants | **Adjust** | 将只读授权定义为Host namespace中所选root下普通相对路径可达的内容；同device mounted descendants纳入范围。保留symlink与不同device拒绝，明确不保证物理目录隔离或恶意mount-namespace变更防护。仅澄清合同，不要求helper新增mount-ID拒绝。裁决仅适用于`repo_*`只读工具，不授权`repo_write`，也不放宽第二片既有外写要求。 |
| Current API and preview wording | **Adjust** | `api-v6.md`保留Runtime schema 5引入`asyncTasks`的历史含义，当前Host RuntimeStore指针改为schema 16；明确无绑定时`ws_*`维持managed workspace，外部目录读取是单独受控API能力。Supported preview注明API-only、无Connect/Access UI及连接前须向用户说明范围。 |
| 11 missing source links | **Adjust** | 缺失引用来自隔离输入`engineering/current.md`中的dirty-main非本片状态条目。已先保全字节，再只在隔离树将current调整为HEAD基线加本片当前记录；共享main和其他writer文件未改删。`node tools/check-doc-links.mjs`复验通过：1312份文档、7312条链接、0问题；本片合同链接均在树内。 |

本次是文档与原任务记录处置；源码/helper没有变化。已更新[repository binding合同](../../app/docs/repository-binding.md)、[API接口文档](../../app/docs/api-v6.md)与[Supported preview](../../app/docs/supported-preview.md)。本段末句记录的是文档复验前状态；后续复验与接受结论见下节。

### 2026-09-14 · 首片 API-only 只读范围接收

Astra按API-only Host只读范围接收首片，组合证据为作者记录的全量`npm test` 1036/1036、迁移定向组79/79、`repository-binding.test.mjs` 4/4及local-fake smoke，初轮[非作者代码/探针复核](deferred-workspace-binding-2026-09-12/independent-review-20260914.md)，以及原复核者对P1文档处置的后续定向复验。后续复验仅检查文档：`node tools/check-doc-links.mjs` 通过（1312份文档、7312条链接、0问题），`git diff --check`通过；没有重跑产品源码全量。两项P1已按前表`Adjust`并闭环。接收限于首片API只读合同及其源码/Host合成证据，不包含GUI、真实Agent任务/provider、真实用户目录挂载或完整产品接受；本分支仍未实现/暴露`repo_write`，未升级真实用户数据或触碰实时8859实例。

### 2026-09-14 · 第二片 `repo_write` 平台原语探针（未实现，待Astra裁决）

本节是对第二片的边界探查，不是实施或降级原RD-006写入合同。合成目录和原生探针在Darwin `25.6.0` arm64运行（Node `v25.9.0`、Python `3.14.2`）；使用临时目录，一次性Python脚本与临时C探针，没有接触真实仓库/用户文件。Linux部分仅核对上游系统调用文档，没有Linux运行时探针。`repo_write`仍未进入tool registry，未添加工具或产品代码。

| 合成反例/探针 | 观察 | 对合同的含义 |
|---|---|---|
| 两个线程同时以`os.link(stage, target)`发布同名新文件 | 一个成功、一个`EEXIST`；目标是唯一胜者的完整字节（本次胜者`candidate-b`） | 原子“仅当目标不存在”可由排他创建表达；此结果不提供替换既有内容的比较交换。stage到target间是额外硬链接，提交后需移除stage；崩溃时要识别并收敛遗留stage。 |
| 本机C探针调用`renameatx_np(rootfd, stage, rootfd, target, RENAME_EXCL \| RENAME_NOFOLLOW_ANY \| RENAME_RESOLVE_BENEATH)` | 本机临时卷上目标不存在时成功；目标存在时`EEXIST`且原目标仍为`A`。Apple文档说明`RENAME_EXCL`仅适用于支持它的卷；本机探针只证明当前临时卷支持，不能外推所有卷。 | Darwin有可用的排他rename，但不支持时必须失败关闭，不能回退普通rename。`RENAME_NOFOLLOW_ANY`会拒绝中间路径符号链接（合成结果`ELOOP`）；最终source leaf若本身是symlink，探针仍成功地把symlink条目移到目标，因此stage leaf必须单独校验身份/类型，不能把该flag解释为“stage必为普通文件”。 |
| 读取既有文件hash后，模拟外部进程写入`external-edit`，再调用`os.replace(stage, target)` | target最终是`agent-new`；外部改动被无条件覆盖。 | 新鲜的expected-hash检查和原子rename之间仍有竞态；普通rename原子替换的是目录项，不以旧内容hash为条件。当前“冲突拒绝、不覆盖”合同不能用check-then-rename满足。 |
| 外部进程将同长度字节改写，并用`os.utime`恢复记录的mtime | 大小相同、mtime_ns相同，内容hash不同。 | mtime/size不能作为冲突安全证明。Apple `generationIdentifier`可在支持的卷上检测文件数据变化，但读取generation再写仍非原子条件提交。 |
| 打开子目录fd后，将该目录rename到绑定root之外，再经旧fd创建文件 | 文件在移动后的root外目录被创建；原相对路径不存在。 | dirfd固定目录对象，不固定该对象相对于绑定root的祖先关系。限定root直接子文件可避免此类子目录fd逃移；支持嵌套路径时仍须解决路径解析与祖先rename竞态，`openat2`仅约束单次解析。root自身在操作期间改名时，也须由Astra冻结权限跟随目录对象身份还是要求已绑定名称持续匹配。 |
| 给既有文件建立hardlink alias，再用stage和`os.replace`原子替换target | target换成新inode/`new-target`，alias仍读到旧inode/`old-shared`。 | 原子替换只改这个路径的目录项，不会更新其它hardlink别名；反之，对既有inode做in-place truncate/write会影响全部别名。若未来允许更新文件，应只替换新inode，但这仍不能解决expected-hash的原子CAS。 |

平台文档交叉核对：Linux[`rename(2)`](https://man7.org/linux/man-pages/man2/rename.2.html)定义`RENAME_NOREPLACE`，并要求底层文件系统支持；普通rename遇到既存目标会原子替换。Linux[`openat2(2)`](https://man7.org/linux/man-pages/man2/openat2.2.html)的`RESOLVE_BENEATH`、`RESOLVE_NO_SYMLINKS`、`RESOLVE_NO_XDEV`可以拒绝逃逸、符号链接与挂载点跨越（含bind mount）的单次路径解析；调用能力始于Linux 5.6，未在本机执行。Linux[`link(2)`](https://man7.org/linux/man-pages/man2/link.2.html)记载`linkat`目标存在时报错以及NFS服务器崩溃时回执可能与实际提交不一致；[`rename(2)`的NFS说明](https://man7.org/linux/man-pages/man2/renameat.2.html)也要求调用方处理执行后失败的歧义。Darwin 25.6 SDK本机`man 2 rename`/`man 2 link`及`sys/stdio.h`确认`renameatx_np`提供`RENAME_EXCL`、`RENAME_NOFOLLOW_ANY`、`RENAME_RESOLVE_BENEATH`，但上述flag没有Linux式`NO_XDEV`；Apple[`volumeSupportsExclusiveRenaming`](https://developer.apple.com/documentation/foundation/urlresourcevalues/volumesupportsexclusiverenaming)可查询卷是否支持`RENAME_EXCL`。Apple[`generationIdentifier`](https://developer.apple.com/documentation/foundation/urlresourcevalues/generationidentifier)文档把它定义为可比较的变化标识、并明确并非所有卷支持；它不是条件rename。当前`st_dev`不能区别同device mounted descendants；只读裁决纳入这些后代，不意味着它们继承外写授权。

供Astra裁决的边界与选项：

1. **窄版新文件创建（建议先评估）：** `repo_write`只接受绑定root下一个相对basename，目标必须不存在；拒绝任何既存目标、子目录、删除、移动和shell。此范围不进入挂载后代；Root fd锚定用户选定目录对象，执行前后仍核对binding ID/revision及root identity。Darwin在卷确认支持时使用`renameatx_np(RENAME_EXCL|RENAME_NOFOLLOW_ANY|RENAME_RESOLVE_BENEATH)`；Linux使用支持该flag的`renameat2(RENAME_NOREPLACE)`并以单次受限路径解析限制root直系目标。文件系统不支持排他原语就拒绝，不降级到`rename`；`linkat`可作明示的硬链接发布选项，但要验证硬链接支持并把stage清理/崩溃遗留列入恢复。提交后核对target为普通文件、与打开stage的device/inode一致且内容hash符合批准值。此原语只能保证目标不存在，不能阻止授权范围外进程在提交后再次修改它，也不能抵抗同UID进程并发篡改可写目录中的stage；不得宣称OS sandbox。
2. **既有文件更新：** 按现有合同，先拒绝任何已存在target。若第二片必须编辑共享树中的既有文件，Astra需先选择可落实的排他写入模型（例如受Host控制的私有worktree/candidate并由人类另行发布，或明确保证绑定树没有绕过Host的并发写者）；一般`flock`/Git index lock只约束合作的持锁者，不能约束普通编辑器/外部程序。若不接受这种更改产品合同或限制授权范围，则既有target更新应保持关闭。expected content hash可用于批准时展示和重验，但在普通用户可写的目录上不能冒充原子CAS。
3. **撤权、恢复与不确定结果：** 精确批准绑定Session/Run、binding ID与revision、相对target、前态（create时为absence）和新内容hash。Run或revision快照本身不延长授权。把写入prepared持久化后，写效应与revoke应在同一Session级线性化门中决定谁先发生；等待中的批准在撤权后失效。操作已提交但响应/确认丢失时记录unknown，恢复只核对target/stage的实际identity与hash，不自动重放；已确认的外部结果不会因撤权被回滚。NFS及其它返回语义不明的卷要走unknown并要求人工新请求。

需要Astra先定：首版是否接受“只创建root直系的新文件”而把既有target更新后置；root name被rename时授权是否跟随固定目录identity；以及是否需要抵抗同UID并发修改staging/root namespace。以上是合同边界，不可由实现者自行扩大或用更多hash/mtime检查替代。外写能力、Access grammar、GUI、真实dogfood树写入均未实现或启动。

本次只修改原任务记录和`engineering/current.md`，无产品代码/test变更；`git diff --check`通过，`node tools/check-doc-links.mjs`通过（1312份文档、7315条链接、0问题）。

### 2026-09-14 · 第二片私有Git candidate施工责任与执行面核查

Astra后续在[第二轮方案](deferred-workspace-binding-2026-09-12/write-dogfood-round2.md)选择Host新建私有Git candidate worktree路线。本方案取代上文“直接在任意绑定root创建文件/拒绝更新既存文件”的候选边界：外部用户绑定树仍只读；candidate可以更新基线已有源码，但仅在Host-owned单writer合同内使用expected-hash+rename，明确不抵抗不合作writer、不宣称原子CAS、不自动写回/合并原树。先前绑定root上的目录移动/hardlink探针仍说明直接写用户目录不安全；对candidate路径要求同样的身份、symlink、`.git`控制面与挂载边界守卫。

变更责任归属：RuntimeStore持有candidate/effect生命周期、Run快照、revision及幂等回执；Runtime service固定Git argv、candidate绑定、ask/write/revoke同Session效应门与恢复unknown；candidate文件helper负责锚定Host root身份、相对路径walk、拒绝symlink/`.git`/挂载后代/非普通文件、新inode stage+替换及前后hash观察；control-plane只在candidate绑定且`permissionMode`允许时开放对应内置工具，source `repo_*`读取仍绑定原目录。最近实现先例为本片schema16 Session绑定/Run快照/只读helper，以及`workspace-tools.mjs`的`ws_write`精确内容批准和Runtime的重启后效果复核。必要跨层为Host RuntimeStore独立schema迁移（若最终合同需schema17）、Runtime HTTP/API/工具治理、专用Host固定Git与FD helper、synthetic store/FS/HTTP/Crash tests、app/API/verification/current docs；Core4、bridge5、managed `workspaceDir`、`ws_*`和第三片Access UI不扩权。

施工前提交Astra确认的持久合同包含：candidate唯一性/读面与source `repo_*`的区别，Session candidate身份/状态/生命周期revision/writeRevision，Run候选快照，`prepared|confirmed|unknown`效果记录及恢复观测，create/revoke/write幂等范围，以及Host产生的精确diff/receipt。现有schema16是严格闭集：`app/server/store.mjs`的Session/run校验仅有`repositoryBinding`/`repositoryBindingSnapshot`与只读request receipts；不能把candidate/effect状态塞入旧字段或只升级数字。上述schema/读目标/diff接口尚待Astra答复；答复前不改持久模型或暴露外写工具。独立Git/FD/helper与测试可先推进。

固定Git调用的Darwin合成执行面探针：Git `2.50.1 (Apple Git-155)`、Node `v25.9.0`、Python `3.14.2`。从合成worktree用`clone --bare --local --no-hardlinks --dissociate --no-checkout --template=<Host空模板> -c core.hooksPath=<Host空hooks目录>`建立私有Git dir，再通过固定`worktree add --detach --no-checkout`与checkout；用`--no-recurse-submodules`并固定diff选项`--no-ext-diff --no-textconv`。带恶意source `post-checkout`/`filter.evil.smudge` sentinel的合成仓库在覆盖hooksPath、无checkout clone、隔离checkout后未生成sentinel，candidate读取的是已提交字节，source/candidate object inode不同；source `filter.evil.smudge`与`core.fsmonitor`未进入新config。发现Git clone会复制source `core.hooksPath`，必须在clone初始config中即覆写并读回校验，不能等第一次可能执行hook的Git调用后再修正。另造source `objects/info/alternates`指向独立对象库；普通local clone保留该依赖，而添加`--dissociate`后候选无alternates，alternate离线时candidate `cat-file`和`fsck --full`均成功。该探针只证明本地合成worktree行为，不覆盖全Git版本/全卷、配置读取面、恶意同UID或候选路径被外部挂载等情形。

权威来源：[Git clone `--local`/`--no-hardlinks`/`--dissociate`](https://git-scm.com/docs/git-clone)说明local clone绕开Git-aware transport、可能与源端并发修改竞争，且`--dissociate`会把借来的alternate对象复制为私有对象；[Git hooks](https://git-scm.com/docs/githooks)说明checkout hooks的执行点；[Git worktree](https://git-scm.com/docs/git-worktree)描述detached/no-checkout worktree选项；[Git attributes](https://git-scm.com/docs/gitattributes)规定未配置filter driver按透传处理；[Git diff](https://git-scm.com/docs/git-diff)记录`--no-ext-diff`/`--no-textconv`选项。clone从明确完整commit创建时仍需在source root身份和OID上前后核验，源有并发变更或任何固定Git命令超时/不一致时失败关闭并保留候选证据。

实际diff也是未冻结接口：现`repo_list/read/grep`没有candidate读/差异能力且禁止访问`.git`，因此模型不能可靠交付Astra退出条件中的实际patch。建议Astra冻结一个Host只读candidate diff/receipt能力，由Host固定commit/candidate身份后调用仅本地、无外部diff/textconv的bounded `git diff`，并返回精确patch、路径、hash、revision及截断事实；不得提供shell或任意Git命令。仍待裁决。

两项后续视觉dogfood已分开准备在[paste工单](deferred-workspace-binding-2026-09-12/dogfood-work-orders-2026-09-14.md)，共享synthetic混合Markdown fixture路径及SHA记录于该文件/fixtures目录。UI遵循`engineering/design/ux-grammar.md`、`frontend-contract.md` `markdown.reading`最近先例、`chat-reading-2026-09-11.md` CR-03/CR-04；工单先inline-code contrast，再fenced-code density。外部候选执行需候选工具非作者接受；仓库当前没有连接/Access GUI集成该paste recipe，准备工作不代表任务已paste、启动、完成或GUI可用。设备有Node/npm、全局Playwright模块和Chrome，但不能替代外部Agent真实交付/产品GUI接通。未触碰真实仓库/provider/共享main，也没有改产品代码。

## 2026-09-16 · 在途树恢复、逐路径披露修复与 Workspace GUI 首片（Claude 施工单 01）

施工入口见[Claude 串行施工单](../execution/claude-frontend-harness-2026-09-16/README.md)与[01 记录](../execution/claude-frontend-harness-2026-09-16/01-workspace-binding.md)。本节只登记 RD-006 owner 事实；接受状态仍由 [current](../current.md) 持有。

**在途树。** `codex/workspace-access-20260914` 的临时目录已随 `/private/tmp` 清理消失，2026-09-15 清理前的 bundle 只含已提交 ref。作者会话的 Codex rollout 日志保留了该树全部 236 次 `apply_patch` 调用；按时间顺序、按原工具的整补丁原子语义重放到 `7e1a1ff`，`app/` 下 26 个修改与 11 个新增文件的增删行数与 Luna 2026-09-15 06:48 记录逐文件相同，`app/docs/repository-binding.md` 前 178 行与当时整读逐字相同；工程文档因原树曾复制脏 main 内容而无法逐字恢复，其增量另行按当前 main 合入。恢复树定向 26/26，`npm test` 1058/1059（唯一失败为并发下 Core bridge 超时，单独重跑 13/13）。该结果以提交 `ab4b93d` 进入本单施工树；它是原作者工作的保全，不是接受。

**逐路径披露缺口（原第三片预检发现）。** 裁定：聚合读取按文件裁决，取该聚合动作与对应单文件读取动作（`repo_grep`→`repo_read`，`candidate_grep`/`repo_diff`→`candidate_read`）两者中最严者；deny 与 ask 的文件在 worker、补丁与来源回执之前排除，结果只报 `excludedByPolicy` / `excludedPendingApproval` 计数，不点名路径；root 的 allow 不被带 ask 规则的文件继承，逐文件批准经单文件读取发起。选择"过滤并计数"而非"整次失败关闭"：一条 deny 规则不应使根目录搜索不可用，计数使模型知道覆盖不完整。实现为 `control-tools.mjs` 的 `createPathAdmission()`（`governTools` 同源），`repo_diff` 在生成补丁前过滤路径。回归：`repo_read` deny 下 `repo_grep(".")`、`repo_grep` 的 ask 规则不开问题、`candidate_read` deny 下 `candidate_grep` 与 `repo_diff`；定向 52/52。提交 `c8ac6fb`，Sonnet 5 按 Fable 裁定实现。

**GUI 首片的语义裁定。** 用户在施工中要求按 Codex 形态：选目录用原生对话框、列出已连接过的目录、把 workspace / Local / 分支放在 composer 上方的独立卡、开工后只留 composer。采用如下：

- 外部目录这一维统一叫 **Workspace**（[文案体例](../design/copy-convention.md) §3.1 原义）。Home 上原按名词收敛写作 Workspace 的 Project 选择器改回 **Project**，无 Project 的 Chat 写 `No project`。`repository.*` 语义键撤销，登记 `workspace.connect` / `workspace.disconnect`，`workspace.object` 的 owner 改指本合同。
- composer 上方一张实色页签卡（不用 blur）：`Choose workspace` / 目录名、`Local`（执行位置事实）、`Branch · <名>`（仅 Host 读到分支时；未知不画 main，游离 HEAD 不画）。只在 Home 与尚无 Run 的 Chat 出现；开工后事实与入口移到 `This chat` 概览的 Workspace 行。
- Workspace 卡：`Open folder…`（Host 原生对话框，Darwin `osascript`；其他平台 501 后退回路径输入）→ `Connected before`（由 Host 绑定回执得出，找不到的目录保留行写 `Not found`）→ `Enter a path instead`。Home 上卡片只写草稿，首次发送先绑定再开始 Run，每次开始一个 requestId，重试重放不重复绑定；绑定失败保留 Chat 与输入。Chat 内选中即提交绑定命令并读回 Session，不以回执冒充状态。
- 新增 Host 只读辅助接口：`POST /host/choose-directory`、`GET /repositories/recent`、`GET /repositories/inspect`；均不绑定，绑定仍是显式 `PUT .../repository-binding`。

未做与边界：Linux 原生对话框未实现（fail closed 到路径输入）；同 device mounted descendants 的范围合同不变；`repo_write` 的 GUI 批准卡与 candidate 面属 02 片；Work 面板的"Browse workspace / Workspace · N files"仍指托管成果目录，属 10 片文字收敛。

### 2026-09-16 · 02 片：私有 candidate 的 GUI 与人的 diff 入口

沿上节 Workspace 卡片加 Edits 区：从目录当前 commit（`GET /repositories/inspect` 的 live HEAD，不猜 main）创建 Private candidate，显示 `from <commit>` 与 Writes 计数，Stop edits 撤销而不删除文件；活动 Run 中命令禁用，命令后读回 Session。`repo_write` 的批准卡与 `ws_write` 同一解剖，只加一行范围（Private candidate · new file / replaces the file whose hash starts …），批准仍绑定 toolCallId 与内容 hash，Host 在批准后重验 candidate/revision/前态（既有实现）。人看 diff 不经模型：新增 `GET /sessions/:id/repository-candidate/diff`（与 `repo_diff` 同一份有界 Host patch，因目录属于用户本人而不做逐文件策略排除）与 `GET /sessions/:id/repository-candidate/effects`（写入回执，去掉 contentRef）；Session/Run 公共投影改为只带 candidate 摘要，Host 路径与文件系统身份不再随 `GET /sessions/:id` 出站。GUI 用 diff-view 按文件分节渲染 patch。记录见[02 记录](../execution/claude-frontend-harness-2026-09-16/02-candidate-write.md)。写入结算的 GUI 呈现、冲突反例的 GUI 路径与 Core 接受分列仍未做。
