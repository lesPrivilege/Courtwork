# 真实模型 · 前端能力定向验证

用户将在合流后的 Courtwork main Web UI 自行接入真实 API key。本轮只准备 prompts 与观察标准；没有替用户执行付费请求。先在 Settings → Models 配置连接并选择实际模型，新建自己的项目与 Chat；示例工作区只用于浏览，不用于写入验证。每次只跑一项，出错时保留当前 Run，记录现象而非连续重试。

## 1 · 普通对话、流式输出与消息动作

新建 Chat，发送：

> 这是一次界面验证，不调用工具。请用中文回答“候选结果为什么不等于已经接受的结果”。输出一个标题、三条短要点和一个两列三行的 Markdown 表格；总计不超过 250 字。最后另起一行写：UI-CHECK-01。

观察：用户消息和 assistant 内容分开；流式文本逐步出现（若模型很快可能只看到完成态）；运行状态从实际事件变化；标题、列表、表格可读；完成后 Copy response 复制正文。朗读、反馈、重生成仅按当前实际可用状态验证，不把占位动作视为已接通。

## 2 · 同一 Chat 的上下文连续性

在同一 Chat 接着发送：

> 不调用工具。上一条回复末尾的校验标记是什么？请只给标记，再用一句话概括上一条回复的中心观点。

预期标记为 `UI-CHECK-01`。切到 Home/Chat 再回来，确认两轮仍在；返回不应自动发送草稿。此项验证同一会话历史，不宣称跨会话 Memory。

## 3 · 实际文件写入与逐次授权

先把该 Chat 的 File access 设为 **Ask before editing**，发送：

> 请使用当前可用的工作区工具，将下面内容写入 out/ui-check.md。只写这一个文件；如果需要我的授权，等待授权后再继续。写入成功后用工具读取这个文件，报告实际文件路径和读取到的最后一行，不要把计划写入说成已经完成。
>
> # UI runtime check
> Project: Cedar sandbox
> Status: draft
> Marker: FILE-CHECK-03

观察：若模型请求 `ws_write`，界面出现对应路径和内容的授权卡。先试 Deny，文件不应被宣布已写入；然后另发同一请求，再选择 Approve。批准只针对本次精确写入。成功后应有真实工具结果与记录文件入口；打开文件、Raw source、复制所见文本、返回 Chat。模型若未发出工具调用，记为模型行为，不把文字回复视为写入通过。

## 4 · 修改与版本阅读

在第三项写入成功的同一 Chat 中发送：

> 先读取 out/ui-check.md，只把 Status: draft 改为 Status: ready-for-review，其他行逐字保留。写入前仍遵守当前授权策略。完成后再次读取，报告实际变更的一行。

观察：新 Run 与旧 Run 文件记录应可区分；旧 recorded version 仍显示 draft，新记录显示 ready-for-review。当前 workspace 文件与不可变 recorded version 是不同入口；不要仅凭 assistant 文本判定版本正确。

## 5 · 资源开放开关

在没有活动 Run 时，打开当前作用域的 Tools & Integrations/Runtime。只选择界面实际允许配置的 `ws_list` 或 `ws_read`；记录初始状态、作用域、继承来源。关闭后新建一轮发送：

> 请列出你当前实际可调用的工作区工具名称。如果没有列目录或读文件工具，明确说明缺少该能力；不要根据历史工具结果声称现在仍能调用。

重点看 Runtime 的 effective Exposed 状态与该 Run 的实际广告/工具轨迹，不能把模型自行列举当唯一证据。再恢复原值（有 override 时可用现有 Reset/继承入口），新一轮请求列目录或读取第三项文件，观察实际调用。父级 gate 或不可配置资源应保持禁用，不绕过它。开关 off 不表示删除文件。

## 6 · 停止与草稿保护

发送：

> 不调用工具。请逐条列出 60 条简短、互不重复的软件界面检查点，每条一行，不要合并或预先总结。

在确有活动 Run 时点 Stop；等待实际终态，检查已接收文本保留。若输出已结束，不把这次当取消测试。运行期间可输入一句草稿，确认它不会自行发送；跨 Home/Chat 返回后核对草稿。

## 7 · Work 的来源、候选与人类决定

用现有 **Continue in Matter / Work** 创建或选择 `Inbound NDA Playbook Review`，只提供合成来源。可将下面文本作为 Source text；其他必填项按 UI 当前 extension manifest 提示填写，不猜测未广告字段：

> Recipient may use Confidential Information solely to evaluate the Project Cedar acquisition. Disclosure is limited to representatives with a need to know who are bound by confidentiality obligations. Recipient shall use reasonable safeguards and promptly notify Discloser of unauthorized access. These obligations last three years after the Effective Date.

在绑定后的 Work Chat 发送：

> 使用当前 Work 提供的工具读取已绑定来源，逐条核对其用途限制、接收人范围、安全措施/通知和期限。仅在实际可用的候选提交工具支持时提出候选，并引用真实 source ID、版本及证据范围。不要接受、拒绝或宣布候选已经生效；缺少任何工具或必需字段时明确停在缺口处。

观察：实际工具轨迹、Candidate/source revision、依据展开与 recorded source 阅读。Accept/Reject/Request evidence 是人类操作；首次先只读，不用模型“已完成”的句子代替决定。此项只有存在真实绑定且 extension 已广告工具时适用。

## 8 · 纯 UI 检查，不消耗额外模型调用

用以上实际生成内容检查：明暗主题、1280/窄窗口、Settings 返回、导航搜索/切换、长标题 tooltip、键盘 Tab/Enter/Escape、文件阅读与上下文菜单。确认 segmented 选项中性，资源开放 switch 的 on 使用普通红色。API key 不放入 prompt、截图或测试记录。

## 记录一个失败

记录：入口与项目/Chat、所用模型名称、prompt 编号、Run 状态、期望/实际行为、截图（隐藏 key）和可复制的错误文字。区别连接/鉴权失败、模型没有调用工具、宿主拒绝、工具执行失败和纯界面展示问题。不要以新的 prompt 重跑掩盖原始 Run。
