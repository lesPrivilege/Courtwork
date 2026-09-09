# ES-FE-01 · 在现有 Work Review 中检查并接受同一份文件候选

状态：PR 准备稿，未实施。消费 [共同原则](README.md) 与 [ES-BE-01](PR-BE-exact-file-candidates.md) 的实际冻结交付；本稿字段语义不是现行 API。

## 可用 PR 描述

用户需要知道当前看到的是哪份候选、修改了什么、检查依据是否仍有效，以及接受将产生什么后果。本 PR 在现有 Work Review 中呈现候选绑定的文件差异、验证依据和正式决定；读取与动作始终携带同一候选身份。接受成功以服务持久回执为准，刷新或切换会话不会把当前路径文件冒充已接受成果。

首版接受只把候选纳入正式成果，不写回用户目录。界面不新增通用分支管理或恢复入口。验证应覆盖旧响应串候选、过期动作、ACK 丢失、producer 缺席和键盘操作；实际结果由实现 PR 填写。

## 1. 消费前提与写权

- 等 BE 提供固定代码 SHA、正式契约版本、实际错误映射、不可变内容查询和 fixtures。缺任一关键能力时只继续准备/评审，不造可用按钮或以本地数组替代正式状态。
- 接单时复核当前 FE-01…04 交付、词表和前端单写者顺序。Workspace 仍只用于真实文件夹语义；不把 Matter 改名 Workspace。
- 写权限于 `app/web/**`、必要的受信扩展 renderer、前端测试与相关消费文档。server/runtime/core/domain/HTTP/brand 几何不在本单写权；新静态模块路径交 Astra 精确准入。
- 优先复用 `app/web/surface-modules.mjs` 的 Work host、`app/web/app.mjs` 的动作/回执恢复、现有 fileRef 身份模式与 `workspace-view.mjs` 文件列表行为。实际挂载位置以接单基线为准，不另建 accepted store。

## 2. 用户路径与后果

1. 从已有候选入口打开 Work Review，明确候选和来源；无 Matter 的普通 Chat 不自动转 Work。
2. 展示变化摘要与文件列表，选择文件查看 Base → Candidate。内容从服务的不可变引用读取，页面不读取当前工作目录替代候选。
3. 在同一面查看检查结果、输入依据是否仍有效及问题原因。需要补证据时使用服务实际声明的动作。
4. 用户接受时沿现有 `decide` 请求，将 candidate/base/request ID 及冻结契约要求的字段交给服务。后果说明为“将此候选保存为正式成果”，不能暗示覆盖磁盘目录。
5. 服务确认后展示正式决定与可读成果；历史接受仍保留，但依据后来变化时另外说明其当前适用性。

沿 FE-01 已交付词表使用 Review/Changes/Accept 等对应词；不要为了画面统一把工具 Approve 与成果 Accept 合并，也不引入含糊的 Apply 按钮。Snapshot/root/receipt digest 可折叠于 Developer 或技术详情；一般用户看到版本身份、依据和明确后果即可。

## 3. 状态与动作矩阵

以下各维度可组合；不能仅用一个总状态决定所有颜色和动作。

| 服务事实 | 显示重点 | 动作规则 |
| --- | --- | --- |
| pending，尚未检查 | 候选内容、尚未完成的检查 | 仅消费已声明动作；不从 pending 自行推导 Accept |
| required checks passed，basis current | 检查范围及结果，不称已经接受 | Accept 仍须有合法 humanActions 描述 |
| failed 或 unknown/partial dependencies | 具体失败/未覆盖范围 | 无 Accept；只显示实际可执行的补证据/修订动作 |
| basis stale | 哪项依据变化、旧候选仍可读 | 不静默更新 Base，不用旧按钮继续接受 |
| request in flight/ACK unknown | 决定处理中/正在核对结果 | 保留原 request ID；不乐观标为 accepted，不换键再次提交 |
| accepted | 服务记录的成果与决定 | 用不可变历史内容；当前适用性可单独为 stale |
| rejected | 决定与原因、历史候选 | 不显示为文件已删除或外部操作已撤销 |
| missing/corrupt bytes | 无法读取这份成果内容 | 不替换成同名当前文件；已有历史决定不被改写为未接受 |
| producer absent/unsupported contract | 可支持的只读历史与不可用原因 | 无 mutation；未知字段不由前端猜测执行 |

检查通过采用文字说明；冲突、错误、过期与未知保持语义区分，不通过统一红绿灯表达正式效力。沿既有状态着色规范，不增加第二套品牌状态系统。

## 4. 身份与请求行为

- 视图至少以 Matter、Candidate、packet version 和文件引用识别请求。切换候选、文件、会话后，旧异步响应不得覆盖新视图。
- 展示包身份与 diff 的 Base/Candidate 来源，不把 Current/Recorded 文件预览悄悄重标为 Candidate/Accepted。摘要截断只影响展示，完整性与差异总量由服务提供。
- diff 超限/无法展示时显示原因与受支持的完整内容读取入口；不把空 diff 当“没有变化”。首版只支持 BE 声明的格式。
- `humanActions` 是服务给出的操作候选，点击后服务仍重验。generation/版本失效先刷新并说明原因，不自动更换 candidate/base 再接受。
- ACK 丢失沿现有 request 查询；若查询仍不确定，保持可恢复待确认状态，不能把超时显示为确定失败。用户离开后回到候选仍能核对原请求。
- 新候选是新身份；不覆盖旧预览缓存、旧检查记录或旧决定。禁止从 Run completed/tool result 推导成果接受。
- 历史读取不依赖 producer 代码执行；消费服务的兼容投影，不执行模型生成 renderer。

## 5. 可访问性与表面范围

复用既有浮动工作面、关闭/返回与焦点恢复。文件选择可用键盘，选中状态、加载和检查结果有文字可感知；diff 中新增/删除不只靠颜色区分。候选更新不能抢夺焦点；决定成功/错误提供可感知提示。390px 与桌面、浅/深主题都可查看文件名、版本与后果，不强制双栏导致正文不可读。

本单不新增 Home 卡、Settings 项、backend selector、工具生命周期控制、restore/fork/discard 按钮或全局 Changes 队列。视觉数值与材质消费当前前端规范，不在准备稿里另定一套布局。

## 6. 前端验收

| 用例 | 观察结果 |
| --- | --- |
| FE-T01 从候选 A 读取文件，当前目录已变 B | 仍显示 A；接受后历史读取仍为 A |
| FE-T02 A 慢响应在切到 B/另一个 Session 后到达 | 响应被丢弃，不串身份、内容或动作 |
| FE-T03 passed + stale；pending + 无动作；unknown dependency | 分别显示检查/依据/权限事实，不产生可执行 Accept |
| FE-T04 打开后 base/generation 变化，旧按钮提交 | 显示服务拒绝并刷新；不自动替换 base 重试 |
| FE-T05 接受已提交但 ACK 丢失，刷新/返回 | 使用原 request 查询得到同一决定，无重复请求键与乐观接受 |
| FE-T06 缺字节、producer 缺席、未知版本 | 精确错误或只读 fallback；无当前路径冒充、无 mutation |
| FE-T07 拒绝候选、Stop 工具、工具获准、Run 成功 | 各自后果正确，均不被画成正式接受或磁盘回滚 |
| FE-T08 diff 超限/无变化/缺 Base | 三态不同，显示服务提供的范围与原因 |
| FE-T09 键盘打开、文件切换、决定、关闭；390px/桌面浅深 | 焦点可恢复、状态可读，新增/删除不只靠颜色 |
| FE-T10 普通 Chat、既有 memo/NDA 与 Runtime 设置回归 | 不增加 Matter、不改变旧成果动作、不混入 runtime apply |

使用 BE 真实字段 fixtures 覆盖全部状态，再以隔离后端完成至少一条实际 HTTP 浏览器纵切。mock 只证明渲染，不能代替决定/持久化验证。交付截图、实际命令结果、前后端代码 SHA、词表增量及新增静态路径；作者检查与独立复核分列，真实读屏/触控/provider 未运行就标未检，不由截图推断通过。
