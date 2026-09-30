对，这已经不是“模型选择器不好用”这么局部的问题，而可以抽象成 Configuration Plane 与 Execution Plane 混淆。

你现在遇到的情况，本质上是：系统把配置系统的数据结构，直接泄漏成了用户的操作结构。

Provider → Model → Variant → Effort → 具体选项，在后台作为配置关系完全合理；但用户在一次 Chat 中只是想说：

“下一轮换 Sonnet，effort 调 High。”

他不应该重新遍历后台的 ontology。

Apple 对 toolbar 的原则就是优先放置用户最常执行的命令；而 progressive disclosure 的经典要求也是：频繁需要的功能必须在第一层，只有低频功能才应该被推到第二层。Apple 也明确提醒，多于一级 submenu 会显著增加操作复杂度。

可以直接形成一套 UX Audit Grammar

我会把核心指标定义成：

Frequency × Interaction Distance × Context Locality × Cognitive Load

其中最值得测的是 Interaction Distance（交互距离）。它不是单纯统计 click 数，而是：

打开层级 + 导航移动 + 搜索/扫描 + 模式切换 + 记忆负担 + 返回原任务的成本。

于是会得到一套非常稳定的判断：

操作性质	应出现在哪里	期望距离
高频、局部、可逆	当前工作面	0–1 层
中频、当前 session 有关	Popover / secondary control	≤1 disclosure
低频、全局、持久	Settings	多层可以接受
初始化 / 管理 / 架构配置	Settings / Provider management	可以复杂
危险、不可逆	可以故意增加摩擦	需要确认

所以 复杂性本身不是问题，复杂性出现在哪里才是问题。

⸻

放回 Courtwork 的模型体系，就非常清楚

Settings 应该承担：

Provider / Model configuration

包括 provider credential、endpoint、已启用 models、alias、capability、价格信息、默认 effort、可用 reasoning levels、fallback、routing policy 等。

这些是在定义系统有什么。

Composer 则应该承担：

Runtime choice

这里只回答：

这一轮 / 这个 session，我要用什么？

所以一个合理的 composer selector 甚至不需要再让用户感知 provider hierarchy：

[ Opus 5.5  ·  High ▾ ]

点击以后：

Model
✓ Opus 5.5
  Sonnet 4.6
  GPT-5.6 Sol
  GPT-5.6 Pro
Effort
  Low
  Medium
✓ High
  Extra High

一次打开，直接修改两个正交变量。

如果要换另一个 provider 的 model，也不应该是：

Provider
  → Anthropic
      → Models
          → Claude
              → Opus 5.5

而应该仍然是一个扁平的 runtime vocabulary。

Provider 只作为 secondary metadata：

Opus 5.5             Anthropic
Sonnet 4.6           Anthropic
GPT-5.6 Sol          OpenAI
DeepSeek V4          DeepSeek

后台 ontology 不等于前台 IA。

⸻

这可以进一步推广成一个非常有用的 audit invariant：

Repeated choice must not require repeated configuration traversal.

用户一旦已经配置过某个能力，后续使用它时，就应该直接面对选择结果空间，而不是重新面对配置树。

这不仅适用于模型。

例如已经连接好的工具，不应该每次：

Tools → MCP → Server → Namespace → Tool

而应该直接是当前 relevant tools。

已经建立好的角色，也不应该：

Agent → Runtime → Profile → Role → Coding

而应该直接切 Coder / Research / Review。

已经设置好的 workspace，也不应该每次重新穿越 storage/provider/path hierarchy。

这其实与你之前说的：

单一 provider 跨角色、单一角色跨 provider

完全是同一个问题：系统 ontology 可以复杂，交互 vocabulary 必须贴近用户当前动作。

⸻

因此全量 audit 时，我建议不要再按“Sidebar / Composer / Settings / Dialog”逐组件检查，而按 User Action 检查。

可以给每个 action 建一张审计记录：

字段	示例：Change reasoning effort
Frequency	Very high
Scope	当前 turn/session
Reversibility	Immediate
Context	Composer
Current depth	3–4
Scan required	Yes
Context switch	Yes
Ideal depth	1
Correct surface	Composer
Root cause	Configuration hierarchy leakage
Fix	Inline selector / one popover

然后专门抓一种东西：

Frequency–Distance Mismatch

也就是：

操作越频繁，但离用户当前工作面的距离反而越远。

这类基本都应该列为 UX debt。

⸻

还可以再加一个 Semantic Locality 原则。

一个 control 应该尽量出现在它影响对象的附近。

模型影响下一条 message → Composer。
Session title 影响当前 conversation → Session header。
Provider API key 影响全局连接能力 → Settings。
默认 model 影响未来 conversations → Settings。
当前 model 影响当前生成 → Composer。

这比“这个功能应该放菜单还是 settings”更具有泛化性。

⸻

全量 audit 最后其实可以收敛成五个问题：

1. 用户正在做什么？
2. 这个操作有多频繁？
3. 它影响当前对象、当前 session，还是全局系统？
4. 从当前工作位置到它，要付出多少 Interaction Distance？
5. 界面呈现的是用户任务结构，还是系统实现结构？

第五个尤其重要。

很多 AI 产品现在 UX 粗糙，恰恰就是把：

provider → model → capability → effort → runtime

这种工程上很自然的 schema，直接做成 UI navigation。

Schema 是给系统理解世界用的，UI 不是 Schema Viewer。

另外，做这一轮 audit 时，可以顺手把基本机械项一起纳入，例如控制目标大小与 spacing。WCAG 2.2 的 AA 最低目标尺寸是 24×24 CSS px，并允许通过足够 spacing 满足部分例外；这是底线检查，而不是优秀产品的目标值。

如果收进 Praxis / Courtwork，我会把这一章叫做 Interaction Topology，而不是泛泛的 “UX best practices”。它关注的就是：功能在系统里怎么组织，与用户抵达功能的路径，不能是一回事。
