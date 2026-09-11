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
