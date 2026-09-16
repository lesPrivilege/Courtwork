# 前端入口清理与目录接通 · Claude 串行施工增补

2026-09-16 · 接[主施工单](README.md)的 00、01–03、09–11。来源基线仍为 `main@f76dd7ec9f6cef845f67360cc0a22768ae309ca6`；本次重新读取远端 HEAD，未变化。本文是源码审查与施工裁决，产品改动由 Claude 接续。

**没有必要的入口直接删；有必要但放错位置的恢复动作归位；承诺连接目录的入口必须通到真实工具。** 不用补一段解释替一个不成立的按钮辩护，也不通过删除按钮掩盖未完成的 Harness 接入。

## 1. 已定位的现状与处置

| 入口 / 问题 | 固定源码事实 | 本单处置 |
|---|---|---|
| 左下角 `Refresh workspace` | `index.html` 的 `#refresh-button` 位于 sidebar footer；`app.mjs/wireEvents()` 串行重读导航/会话、Review 摘要、extensions、provider 配置、Home，随后处理部分未确认创建记录，并弹 `Workspace refreshed.` | 从常驻导航删除。先给真实恢复动作安排原位入口，再去掉按钮、空布局和过期文案；不只藏 CSS |
| Home 的 `Workspace / No workspace` | `#home-project-button` 选项来自 `state.projects`；点击仅写 `state.homeProjectId`、保存 Home 草稿并重画。并非目录 picker | 按实际语义改为 Project / No project；外部资源选择单独接原 RD-006，不改底层 projectId 含义 |
| 首次发送后的目录 | `submitHomeRun()` 向 `/sessions` 发送 projectId、sessionId、title、permissionMode；`RuntimeService.createSession()` 自行建立 `<dataDir>/workspaces/<sessionId>/materials` 与 `out` | 托管成果目录保留。不要把生成托管目录、选择 Project 或显示路径当成外部目录连接成功 |
| Runtime 的文件路径 | `#executeRun()` 用 `entry.workspaceDir` 创建 workspace tools，并作为 `createSessionRun()` 的 cwd；Pi 使用 `noTools: "builtin"` 与 Host 注入的 customTools | 接通外部目录时新增/消费 RD-006 的受控资源工具与 Run binding，不能在 UI 改 label 或把 ws_* 偷换根目录 |
| 附件入口 | `draft-attachments.mjs` 使用 file input，读 UTF-8 内容；发送时 POST `/sessions/:id/materials`，保留上传 commandId | 它是上传/保留字节，不是持续目录绑定；保留该能力及未确认上传恢复，不换名为 Open folder |
| `Expert · Planned` | `index.html` 的 `#expert-seat` 是含 `Planned` 文本的 div；`wireEvents()` 只为它加图标，不在该节点注册打开动作 | 删除生产导航中的此被动占位；原型入口回独立 Prototype，真正可用的 Expert/领域绑定和已有工作面不删除 |
| 其他局部 Refresh | 已见 `refresh-extensions-button` 单独重读 extensions；多个对象详情本来就有自己的 reader | 逐对象判断，不全局搜索替换。确切读态刷新可以保留；连接、重启、索引重建和效果查回不能统称 Refresh |

源码定位见第 8 节。这里确认的是上述调用链，不是对用户本地全部分支的存在性断言。用户提到的 `Open / Choose folder` 可能来自本地在途实现：Claude 必须在真实 checkout 中从该节点追踪，不能用远端 Project picker 的结论代替它，也不能因远端索引未返回就判定本地不存在。

## 2. 删除 Refresh 的同时保全恢复

### 2.1 解开三种不同责任

**读态更新。** 在页面进入、对象切换、已知写入回执、重连和适当的重新可见时，复用现有 reader、失效机制与 polling。限定受影响对象，合并并发读取；旧 generation 的返回不覆盖新视图。不要给每个面再增加一套永久 timer，也不擅自刷新正在阅读的固定历史快照。

**读取失败。** 在失败的列表或详情中给出局部 `Retry`。它只重新读取相应对象，不更改策略、启动模型、重连 MCP 或重放写入。成功内容已经可见时不追加通用成功 toast；必要的读屏通告仍保留。

**操作结果未确认。** 在原创建/发送/上传/绑定位置提供 `Check status` 一类明确查回入口。此名称作为本轮拟采用词汇，落入现有语义注册与原操作 owner；不要新增第二命令系统。查回携原身份，不等同于重试副作用。

### 2.2 必须迁走的隐藏依赖

当前全局 refresh handler 会释放 `createAttempts` 中部分 `unconfirmed` 项；Home 创建错误文案也明确要求 Refresh。删除前逐项追踪这些引用以及现有 `unconfirmedRuns`、Home draft 和 attachment 恢复，不能留下“请刷新”却无相应动作的死路。

普通 Home Chat 已使用客户端生成的 sessionId，Run 使用 commandId，附件也有自己的 commandId。优先按精确身份查回、恢复同一对象；保留草稿、附件和原意图。对象尚未可查回时保持未确认，不生成新 ID 再试。

`createProject` 当前只接受 name；旧通用创建表单也未必有可精确查回的身份。**重读列表、发现同名项目或没有找到同名项，都不足以证明此前创建已经或没有发生。** 若原 owner 缺幂等创建/查回接缝，登记最小后端增量，或保留明确未确认状态与人工检查入口，不把清空前端锁当成恢复完成。

错误信息、表单入口、保留草稿和查回结果处在同一任务上下文。原始未知记录不因一次无关查询成功而删除；查回未完成也不显示全站“已刷新”。

### 2.3 删除范围

移除常驻按钮后，清理它的 action 映射、事件监听、tooltip/可访问标签、空容器/多余 gap、指向旧按钮的焦点回退和过时测试断言。确认 reader 和恢复服务仍被必要消费者调用后再移除死代码；不为整理命名全面重命名 app.mjs。

Review 摘要、当前文件列表、模型配置等局部读取保留自己的事实与恢复责任。`Reconnect`、`Restart`、`Rebuild index` 若有真实能力，按各自后果命名与授权；没有能力就不放按钮。

## 3. Project、目录与执行位置重新对齐

| 用户需要做的事 | 正确对象与入口 | 不做什么 |
|---|---|---|
| 把 Chat 归到一个项目 | Project 选择，允许 No project | 不叫 Workspace，不打开磁盘目录，不改变文件权限 |
| 附上一份材料 | Attach files / 原材料入口，保留上传版本 | 不把上传副本叫持续挂载，不随源文件改动假称自动同步 |
| 让 Agent 使用一个外部目录 | RD-006 的明确连接动作；一般目录用 Connect folder，专门仓库能力才用 repository 语义 | 不靠路径文字、目录 basename、Project 名或前端句柄制造 Host grant |
| 看目前可用范围 | 简短目录名/必要 Access 状态；按需看完整范围、连接结果和原因 | 不常驻平铺 root、cwd、revision、hash、policy 等架构字段 |
| 执行受控检查 | DF-04 recipe 描述实际目标与执行位置 | 不从已连接目录自动授予 shell、网络、安装或任意环境变量 |

名称在原 [Product Semantics](../../design/product-semantics/README.md)、[Copy](../../design/copy-convention.md)、RD-006 和受影响 API 使用说明中同步；代码与数据的 projectId / workspaceDir 不因用户标签修订而批量改义。`app/docs/projectless-chat.md` 目前称 optional workspace 为 Project organization，也要同步收敛这一活动文档，不让新施工再次沿旧词走偏。

两种动作可以在同一个精简 popover 中分组，但保持独立状态、handler 与保存时点，不做第二层满屏控制台。已有 Chat 的 Project 显示不暗示可以重归属；没有迁移动作就保持事实显示。共用外观不代表共用授权。

## 4. Open / Choose folder 之后必须走完的链

### 4.1 先辨认 picker 返回了什么

| 本地实际实现 | 得到的东西 | 与 Host 的接通条件 |
|---|---|---|
| 原生桌面壳/Host 提供的目录选择器 | Host 可解释的目标与受信选择结果 | 由对应 bridge/adapter 校验并接 Runtime binding；保留取消、失效和平台授权恢复 |
| 浏览器 `showDirectoryPicker()` | 浏览器的 `FileSystemDirectoryHandle` 与该环境中的权限 | 不是一个可直接交给独立 Node Host 的绝对路径或授权。没有专用 bridge/远程文件工具 adapter 时，不能以 JSON 传一个句柄就称接通 |
| `input type=file` / `webkitdirectory` | 文件与相对路径/所选字节 | 走显式上传材料；不是 Host 原目录的持续读写授权 |
| Host 路径输入 | 用户指定的 locator 文本 | Host 真实校验、规范化、记录资源身份与权限后才成为 binding；不能盲信客户端字符串 |

本轮的默认最小实现继续原 RD-006：普通本地 Web 缺少原生 bridge 时，明确的 Host 路径输入和校验回执是可接受方案。不要为追求 OS picker 外观另起桌面壳，也不要实现一个上传全目录后仍叫“连接”的替身。浏览器和 Host 不在同一台机器时，必须明确选择哪台机器的文件。

标准依据：WICG File System Access 的 picker 返回 handle；MDN `webkitdirectory` 说明的是 FileList 与相对路径。**“它不会自动授予 CW 的 Node Host 文件权限”是结合 CW 独立 Host 架构得到的工程结论**，不是声称浏览器不能读写获准文件。参照链接见第 8 节。

### 4.2 一条连续操作，不叠无用确认

用户从明确的“连接文件夹”入口选择目录。选择取消时保留原目录、Project、草稿与附件；不创建 Run，不迁移 Session。若入口已清楚表达连接意图和范围，选择与连接可以是一条连续动作，不必人为增加 Open→Choose→Confirm→Connect 四层确认。

选择之后的**必要技术阶段**必须完整，但无需逐阶段占据一个 UI：

```text
明确连接意图 / 选择目标
→ Host 校验真实资源与当前访问条件
→ 持久 binding + 确切回执
→ GUI 从 Host 读取有效范围
→ 下一 Run 固定资源 revision 与能力组合
→ 获准工具实际访问所选目录
→ 结果/错误与来源回到原 Chat / Files / Inspector
```

回执丢失先查回同一次连接；不会再造第二条绑定。失败保留旧有效绑定和此次选择草稿，不先贴“已连接”再后台补请求；部分成功按原 owner 查回，不能笼统退回成功/失败两态。

### 4.3 Runtime 的完成面

沿 RD-006 保持 Session 身份和 managed cwd/journal；外部目录绑定独立。新的 Run 记录资源 ID、revision、有效权限与工具组合；调用时仍重验撤权和路径身份。仅把 root 写进 system prompt、模型回复“我可以访问”，或前端已显示目录名，都不算接通。

`repo_list/read/grep` 的真实结果必须来自选择的目录。`ws_*` 继续服务托管目录，不能把两个根混为一谈。写入按 DWB-04 的精确版本与权限进行；检查 recipe 按 DF-04 的固定执行位置、输入版本、退出/取消和效果回执进行。连接不是把 Pi cwd 热切到任意目录的快捷方式，也不是允许任意 shell。

活动 Run 期间的替换按原合同拒绝；撤权即时阻断后续调用并请求取消。断开不删除 journal、材料副本或已产生效果。刷新和 Host 重启恢复 Host 记录，前端 sessionStorage 不自行为失效资源续期。

Home 尚无 Session 时，第一片可在原 draft 中暂存待连接意图，再沿客户端固定 Session ID 的创建链完成 bind，**bind 确认且所需能力可用后才 admission 原指令**；此行为必须作为 DWB 的最小合同补充核对。选择失败时不偷偷退回无目录执行。已有 Chat 直接作用于明确的 Session，不能将 Home 草稿选择写到另一个当前 Chat。

## 5. 全项目入口存废审查

在原 00 的变更记录里增加一张有界表即可：入口/用户意图、真实目标、handler、事实或命令 owner、当前结果、失败恢复、处置及证据。范围覆盖生产 Shell、Home/Composer、Files/Preview、Settings/Runtime 和 Attention/Spark 的常驻入口；按当前界面与注册表逐项核，不从历史文档想象控件。

处置只需明确：**删除、合并、改名/归位、补真实通路、保留、移出生产原型化。** 每个新片顺带处理自身触及的同类消费者，不把全站重构设为第一片门槛。

- 删除无动作的能力占位、只有标题和解释的重复面、没有独立结果的常驻按钮。
- 合并指向同一对象、同一行为的重复入口；保留确有上下文价值的快捷入口，并共用命令和状态。
- 需要后端的生产动作必须有真实 owner、结果和恢复；没有后端时按本单交付集合接线，或退出生产导航。
- 本地视图动作不强求后端：展开、排序、返回、切换读态可以由原 view-state owner 完成。不要把“无 HTTP 请求”误判成所有按钮都无价值。
- 清理文字的同时看整条用户路径：能找到对象、辨明范围、判断是否成功、失败后继续。不能删掉状态，只留下一个无法解释的 glyph。

`Expert · Planned` 的处置只针对已定位的被动导航席位；实际可用的领域功能、Expert binding 和已建立工作对象继续存在。用户确需浏览未来设计时，从隔离 Prototype 入口进入，而不是在日常导航中长期摆空位。

## 6. 验收：不是“按钮能点”

### 6.1 最小识别 fixture

准备两个独立临时目录 A、B，均有同名 `target.txt`，内容不同；A 中放 `only-a.txt`。先把与 A 同名文件的**不同内容**上传为 Chat 材料，制造“上传副本/托管目录/外部目录”三个来源的反例。文件与预期 hash由测试 fixture 生成，不用个人仓库。

用户在 GUI 选择 A 后，下一 Run 必须通过真实 `repo_list/read` 得到 A 的独有内容与 hash；不能返回 B、上传副本或托管目录中的同名文件。随后修改 A 的一个未被读取文件再由下一次允许的调用读取，检查是实际源读取而非 UI 预置快照；历史回执仍保持原版本。

### 6.2 决定性矩阵

| 检查 | 必须成立 |
|---|---|
| 删除全局 Refresh | 常驻入口消失；局部读取失败可恢复；未确认创建/Run/上传仍有明确查回，不丢稿、不自动重复 |
| 同名 Project 与文件夹 | 选择 Project 不授目录权限；连接目录不创建/更换 Project；No project 仍可建立合法连接 |
| 取消 / 校验失败 | 不改变旧绑定，不创建 Run，不把文件上传当连接成功；焦点回到发起点 |
| 双击 / 丢 ACK / 刷新 | 同一选择回执可查回；不重复绑定、创建 Session 或提交指令；无“前端已选、Host 未知”的成功态 |
| 两个 Chat / 切换时迟到 | 给 Chat A 的 picker/校验/回执不能写入 B；B 不获得 A 权限，两个 null-project Chat 不合并 |
| 活动 Run / 撤权 | 热替换按原合同拒绝；撤权后的下一次调用真实失败，装饰与状态不继续假装可用 |
| 路径与授权 | 相同 basename、symlink/root 替换、跨根、过期 revision、Read only 写入均沿原 DWB 反例拒绝 |
| 真实写入与检查 | DWB-04 改到所选对象的精确版本；DF-04 在批准的目标/recipe 下返回真实退出码、输出及取消结算 |
| 重启后恢复 | Host 重开恢复 binding 或明确失效；继续原 Chat，历史材料/结果不被重标为当前版本 |
| 文字和访问方式 | Project/Folder/Attachments/Access 词汇一致；鼠标、键盘、触屏、Escape/焦点、长路径与 390 宽均可完成；必要后果不依赖 hover |

确定性 Host/GUI 可先完成选择、绑定和真实工具调用验证；获准的真实模型再从 CW 路径完成一次读写/检查。前者和后者分别留证。原生 OS picker 若是宣称入口，必须实际操作其目标平台分支；模拟 change event 只证明测试替身分支，不当原生 picker 验收。

## 7. 并回原串行顺序

**00** 增加入口存废表，并先迁好恢复再删除全局 Refresh、清理被动占位与错误词汇。已修不重复，未能精确恢复的旧创建路径登记原 Host 缺口。

**01** 从用户实际的 Open / Choose folder 节点开始追踪到 Host binding 和读工具；目录获取方式、Home 待连接意图与取消/迟到处理写入 DWB 原合同。

**02–03** 在同一所选资源上验证精确写入、真实检查和取消，不另开另一个演示仓库冒称同条路径成立。

**09–10** 对新增菜单、返回与观测面延续入口去重和文案收敛。

**11** 加入第 6 节矩阵，在同一候选 SHA 上验收。12 的 Prototype 和 13 的 Pages 不替代此链，也不重开已验证的部署。

本增补不新增全局 RD/FE 编号、独立权限系统或额外常驻审查 Agent。产品施工仍由 Claude 串行完成；作者检查、非作者复核和人的验收分列。

## 8. 源码与外部依据

全部仓库链接固定到本次读取 SHA；行范围是此次实际取得的源码窗口，不等于全文件执行覆盖。

| 定位 | 依据 |
|---|---|
| Sidebar footer / Expert Planned | [index.html L100–195](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/app/web/index.html#L100-L195) |
| Composer Project 节点与末尾 popover | [index.html L310–395](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/app/web/index.html#L310-L395)、[L960–967](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/app/web/index.html#L960-L967) |
| 旧创建错误 / action 映射 | [app.mjs L6350–6500](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/app/web/app.mjs#L6350-L6500) |
| Refresh handler / Project 选择 | [app.mjs L6500–6790](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/app/web/app.mjs#L6500-L6790) |
| Project label / Home 首发 / Run receipt | [app.mjs L5110–5410](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/app/web/app.mjs#L5110-L5410) |
| 创建 Project / Session 的服务字段与 managed 目录 | [service.mjs L520–705](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/app/server/service.mjs#L520-L705) |
| workspace tools 与实际 AgentSession 组合 | [service.mjs L1840–2045](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/app/server/service.mjs#L1840-L2045)、[pi-session-runtime.mjs L411–466](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/app/runtime/pi-session-runtime.mjs#L411-L466) |
| 文件输入/上传不是挂载 | [draft-attachments.mjs](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/app/web/draft-attachments.mjs)、[projectless-chat.md](https://github.com/lesPrivilege/Courtwork/blob/f76dd7ec9f6cef845f67360cc0a22768ae309ca6/app/docs/projectless-chat.md) |
| 外部目录原 owner | [RD-006](../../research/RD-006-deferred-workspace-binding.md) |
| Browser picker / directory upload | [WICG File System Access §3.5](https://wicg.github.io/file-system-access/#api-showdirectorypicker)、[MDN showDirectoryPicker](https://developer.mozilla.org/en-US/docs/Web/API/Window/showDirectoryPicker)、[MDN webkitdirectory](https://developer.mozilla.org/en-US/docs/Web/API/HTMLInputElement/webkitdirectory) |

本轮未访问用户本地工作树、未运行产品/浏览器、未部署，也未修改生产代码。目录选择全链和上述失败矩阵是 Claude 的施工验收要求，不是本次已通过的测试。
