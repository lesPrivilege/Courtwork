# 延迟工作区绑定 · 可消费PR文稿

本页是后续实现PR正文与拆分合同，不是已经提交的远端PR。原输入的“立刻自动Scratch与本地读写”经Astra缩为托管目录保留、显式只读资源绑定、下一Run生效。DWB-00为本轮文档交付，DWB-01→02→03是依赖序列。开工前固定最新main、schema、调用方和单writer写权；不按本包旧行号直接改代码。

## DWB-01 — Runtime资源绑定与运行快照契约

**问题与变化：** 当前global会话可直接创建，但资源范围隐含于workspaceDir。引入由Runtime持有的零或一个外部resource binding，使同一Session能显式记录连接状态，托管目录和既有scope保持。

**范围与owner：** Astra冻结service/store/API/事件及迁移；Luna可按冻结schema实现机械校验和fixture。写权限于Runtime store、service绑定接缝、Runtime文档和定向测试；不得改Core或web。先盘点最新RuntimeStore版本，设计binding命令和run.bound增量、当前权限引用、request ID/expected revision、撤权及回执。禁止只添一个可空workspace字段。

**必须冻结：** 绑定的requested/effective/Run-bound状态及错误码；资源ID与locator身份；重复/异内容请求；活跃Run连接/替换/断开拒绝，撤权阻断/取消策略；run开始与绑定命令的同owner互斥/原子提交；事件与状态/回执同事务；旧配置链不因外部目录自动重算。权限引用接现有治理，不能把binding当grant。

**验证：** 独立synthetic旧库迁移/原始字节备份/旧host拒新；global/project身份保持；同键重放/异内容冲突；双请求CAS；Run启动竞态；提交前后kill/restart无半绑定、无重复事件；撤权后旧回执不可恢复权限。旧runtime.bound与journal不重写。

**退出：** API与恢复验收未过，能力广告保持false；不开前端按钮。非作者固定SHA复核后才供DWB-02消费。

## DWB-02 — 本地只读目录纵切与来源记录

**问题与变化：** 用户要读取现有目录时，当前托管workspace不能代表该目录。新增显式只读资源工具，通过DWB-01授权绑定访问一处目录，生成结果继续写入原managed workspace。

**范围与owner：** Astra负责访问策略、工具治理和恢复；Luna可实现固定的路径/来源校验及测试。限定service工具注入、独立resource resolver、权限治理和文件来源合同；不把整个Pi cwd切换到外部目录，不给现有ws_write扩大root，不开bash/network。

**实现约束：** 在每次调用核验资源ID、当前binding revision/授权/真实根身份；接入governTools，不从模型参数接收任意root。支持路径/尺寸/读取预算限制，目录断连返回可判别失败，源记录含Run、resource、revision、relpath与hash。import到managed与直接读取的来源须可区分。上下文不自动加载外部指令或配置。资源内容视为数据，不能授予工具能力。

**验证：** 两Session各自目录；拒绝绝对路径、..、symlink出界、根替换与检查后替换；只读写入尝试无副作用；权限降级/撤权发生在排队调用前；重启后目录消失；旧缓存来源不冒充新读取；大文件/大量目录有界；取消终态后不补迟到成功。用假provider走真实HTTP→Run→tool→event链，不运行付费provider或个人目录。

**退出：** 平台路径身份/竞态策略不能保证时，对该平台能力保持关闭并给明确失败。只读纵切非作者证据到位才开DWB-03；本地写入另单。

## DWB-03 — 任务入口与资源范围显示

**问题与变化：** 用户可以先输入任务，首次需要既有目录时才连接资源。首片仅复用Attention会话创建与托管成果路径，普通Chat的BE-23保持开放；显示未连接/已连接只读目录、请求中、冲突/失效等实际状态。

**范围与owner：** 既有composer writer实施web；Astra裁产品语义与集成，Luna可做纯投影与fixture。依赖DWB-01/02真实capability；不重构Chat/Attention/Spark角色，不新增Session类型。

**行为：** 未连接时不弹目录picker；managed文件可正常生成。Connect folder仅在用户选择/授权后提交绑定命令；活跃Run不能热切，需求提示解释下一Run生效。失败和未知回执保留同request ID供查询/重试，禁止自动新建Session；显示只读并提供真实支持的撤权动作。再次发送不默认重放之前全部任务。自动最近workspace继承始终禁止。

**用户追加语义参考：** [五图逐项裁决](semantic-reference.md)纳入本片；无folder/project是可选状态，Local、目录、Git/worktree、权限与模型分维。Standalone不锁词、不照抄六个chip。补无project但有成果、非Git目录、只读连接、未知Git、最近项失败反例；跨project迁移和worktree控制仍依赖另行真实owner能力。

**先例与grammar：** [连续性规范](../../design/agent-interface-2026-09-10/frontend-contract.md)；[composer/approval导航](../../design/agent-interface-2026-09-10/precedent-map.md)；实现复用[ui-controls](../../../app/web/ui-controls.mjs)和[app](../../../app/web/app.mjs)的overlay/focus生命周期。改变scope显示和绑定动作；保持Session/Run状态、Review语义、模型配置scope和已有发送/取消规则。开工填最近先例记录，不新增自制dropdown或授权状态库。

**验证：** 真实synthetic服务：免选择创建→托管CSV→连接只读目录→下一Run读取→撤权；多会话不串目录，取消连接保留草稿，断流/陈旧revision/服务拒绝不误显示成功。1440/1280/390、明暗、键盘、Escape/返回焦点、长路径/200%缩放及相邻完整composer；定向行为、interaction lint与涉及的颜色/材质检查。证据分作者与非作者，不能用fixture画面接受未实现接口。

## 后置队列与重开条件

- DWB-05 / BE-23 普通projectless Chat：冻结角色与Session身份、配置链、工具上限、导航/恢复和scope迁移兼容后另写实现PR；不伪装为Attention global，不以本轮免选入口关闭BE-23。

- DWB-04 本地写入：先裁外部effect幂等/未知恢复、撤权竞态与覆盖冲突，消费既有治理外部effect路线；目录连接不预授读写。不能只将DWB-02访问模式改成write。
- Remote：先有真实adapter、连接/凭据owner、目标身份、恢复与可判别unsupported，才扩展target；不由此次enum设计暗示已经支持。
- 延迟分配托管目录、自动GC、跨project迁移、多目录、运行中热切：有独立需求/效益与迁移证据时另裁；不是前三片验收前提。
- 任一片交付提供固定SHA、实际命令/日志、未跑项、来源hash和非作者范围；未满足则保留上个可用托管执行路径，不声称完整产品接受。
