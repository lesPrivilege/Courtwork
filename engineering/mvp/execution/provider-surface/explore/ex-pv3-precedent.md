# EX-PV3 · 先例采集（composer 切模型 / Settings 连 provider）

Author: Sonnet（只读 explore）。Adjudicator: Fable。方法：`se-fable-r4d/engineering/design/scout/README.md` §3 Section sweep（问题固定 → 站点自身筛选 → 按 Courtwork 约束分类淘汰 → ≤3 候选 → 不出 moodboard）。本单只读，未改任何仓库文件；未下载截图 / Figma / 录屏，只记 URL、产品与文字观察。付费墙与反爬页遇到即停，不绕过（记录见 §5）。

对照的本地状态：`model-picker.mjs`（原生 `<dialog>`：search + provider `optgroup` + effort `<select>` + 一行路由说明 + "Applies to all chats for future runs"）；`settings-view.mjs`（`CONNECTION_PATHS` 三条 happy path：catalog / compatible / local；`CONNECTION_STEPS` 五步 + 两个探测控件 `test` / `discover`；`connectionRows` 目前恒一行 = 生效连接）。PV-8 / PV-9 的边界：popover、Recent/Favorites、capability chip、双出口都只是假说；capability 标签只能来自 `contextWindow` / `supportedEfforts` / `api` / 连接健康。

---

## Q1 · composer 处切模型

### 候选池与淘汰

| 来源 | 类别 | 结果 |
|---|---|---|
| OpenCode 官方文档（opencode.ai/docs, opencode.ai/v2/docs, opencode.school） | coding-agent 自有文档 | 采纳 |
| Zed 官方文档（zed.dev/docs/ai） | 编辑器自有文档 | 采纳 |
| Cursor 官方文档（cursor.com/docs, docs.cursor.com） | IDE 自有文档 | 采纳 |
| Cline 官方文档（docs.cline.bot） | coding-agent 自有文档 | **淘汰**：`docs.cline.bot/cli/samples/model-orchestration` 只写 CLI 的 `--thinking <level>` 旗标与"何时切换模型"的策略博客，没有任何一页描述 composer 旁的选择器控件本身（触发方式、列表形态、点击后行为）；其余命中全是第三方博客，不算产品自有文档。理由类别：**无 UI 文档，只有 CLI/策略叙述**。
| SaaSFrame product interfaces（chat / composer 类目搜索） | product precedent | **淘汰**：SaaSFrame 的类目是页面级（onboarding / account setup / integrations / API key 等），没有对应"聊天输入框旁的模型选择器"这一构件级类目；搜索未命中可用样本。理由类别：**站点自身筛选无匹配类目**。
| Cursor 社区论坛 / 三方博客（forum.cursor.com、ofox.ai 等） | 二手转述 | 只作旁证，不单独成候选（README 要求作者原文优先） |

3/5 采纳，2/5 淘汰（无 UI 文档一次、无匹配类目一次）。

### 候选 1 — OpenCode（composer 模型选择器）

- **source URL**：https://opencode.ai/v2/docs/models/ ；辅以 https://opencode.school/lessons/models/（后者 403，未能取得正文，仅作旁证保留其标题级信息，不计入证据）
- **author | product**：OpenCode 官方文档 | OpenCode（开源 coding agent，已发布产品，非 concept）
- **interesting locus**：输入框正下方的模型名（点击即开选择器），或 `/model` 命令唤出同一选择器的全量列表
- **pattern hypothesis**：一级入口是紧贴输入框的一行文字（当前 provider + model），点击展开列表；列表按已连接的 provider 分组（"enabled models whose provider is available for the current project"）；选中后"updates the current session without changing configuration"——即改变的是这一次会话的运行态，不改写落盘配置
- **mature precedent? / implementation lead?**：成熟已发布产品；OpenCode 自身即实现方，文档即产品行为的权威描述
- **grammar slot**：Control（选择器构件）+ 次 Shape（贴紧输入框的一行触发器）
- **Courtwork semantic**：对应 `model-picker.mjs` 整体——今日 Courtwork 已经是"点击触发 + provider 分组 `optgroup`"的同构实现；差异在于 OpenCode 的选择结果**立即**作用于当前会话，Courtwork 的说明句明确相反（"Applies to all chats for future runs. Current runs keep their recorded configuration."，对应 PV-6 每轮冻结）
- **disposition**：`canonical candidate`——但只对"贴紧输入框的触发器 + provider 分组列表"这一形态成立；OpenCode 的"改动即时生效于当前会话"这一半**不迁移**（与 PV-6 冲突，见 §3）

### 候选 2 — Zed（Agent Panel 模型选择器）

- **source URL**：https://zed.dev/docs/ai/agent-panel ；https://zed.dev/docs/ai/agent-settings
- **author | product**：Zed 官方文档 | Zed（已发布代码编辑器 + Agent Panel）
- **interesting locus**：message editor 内的模型选择器（`cmd-alt-/` 唤出）；每个 provider 各自的 logo 作为列表内的身份区分；星标收藏后可用 `alt-tab` 不开列表直接循环
- **pattern hypothesis**：同一模型可能由多个 provider 提供（如 Claude Sonnet 4.5 经 Zed Pro / OpenRouter / Anthropic 直连均可用），选择器因此把"provider 身份"当作模型条目的一部分而非外层分组——这与 OpenCode/Courtwork 的"先选 provider 分组、再选模型"顺序相反
- **mature precedent? / implementation lead?**：成熟已发布产品；官方文档即实现描述
- **grammar slot**：Control + 次 Iconography（provider logo 作区分手段）
- **Courtwork semantic**：**none**——Courtwork 的目录不允许同一模型挂多个 provider 身份（`{provider, model}` 是路由主键，PV-3），这条 locus 在今日契约下无对应行；且推理强度文档全文未提（agent-settings 唯一可调参数是 `temperature`，不是 effort 档位），对 PV-7（一级 UI 只出 Off + 目录声明档位）无先例价值
- **disposition**：`specimen`（局部）——只取"星标 + 键盘循环，免开列表"这一交互节奏进 Courtwork 的 control 候选池；"provider logo 代替分组"与"多 provider 供一模型"两点不采纳（见 §3）

### 候选 3 — Cursor（Chat/Agent 模型选择器）

- **source URL**：https://cursor.com/docs/agent/prompting ；https://cursor.com/docs
- **author | product**：Cursor 官方文档 | Cursor（已发布 IDE）
- **interesting locus**：chat 输入框顶部的下拉（点击或 `Cmd+/` 循环）；旁边另有一个 context ring（点击展开 token 占用分类），与模型选择器并列但各司其职
- **pattern hypothesis**：模型切换的说明句是"The change applies to the current conversation going forward"——语义与 OpenCode 相同（改变当下会话，非全局配置）；Cursor 官方策略叙述把"何时切换"讲成任务阶段判断（探索用快模型、实现前切强模型），而不是把推理强度做成独立档位控件——高强度推理体现为**选择另一个模型条目**（如带 "high" 的变体），不是同一模型上的第二个选择器
- **mature precedent? / implementation lead?**：成熟已发布产品；官方文档
- **grammar slot**：Control + 次 Shape（顶部下拉 + 并列的 context ring）
- **Courtwork semantic**：**none**（对 context ring）；对模型下拉本身同候选 1，对应 `model-picker.mjs` 的 select 部分。"effort 折进模型条目而非独立档位"这一半与 PV-7 直接冲突（PV-7 要求 effort 是目录声明的独立档位，不得把 wire 参数级差异伪装成多个模型身份）
- **disposition**：`ignore`（对 effort-as-model-variant 这一半）+ `specimen`（对"点击/循环双入口"这一节奏）——分裂裁定，见 §3

---

## Q2 · Settings 处连 provider

### 候选池与淘汰

| 来源 | 类别 | 结果 |
|---|---|---|
| OpenCode 官方文档 providers 页 | coding-agent 自有文档 | 采纳 |
| SaaSFrame · API Key 类目（20 个产品聚合：Cohere / Cal.com / Supabase / OpenAI / Checkout.com / Unkey / Better Stack / Logsnag / Blobr / FullEnrich / Hume AI） | product precedent | 采纳（聚合类目，非单一站点） |
| SaaSFrame · Superlist Connect Integration | product precedent | 采纳（作反例，见下） |
| SaaSFrame · Mercury Integrations Settings | product precedent | **淘汰**：页面只回收到类目元数据（"Integrations" / "Connect Third-Party" / 收录日期），正文与截图文字均不可抓取，无法核验其连接行/凭据/验证状态的具体呈现。理由类别：**证据不足（图像化内容，无可提取文字）**
| SaaSFrame · Attio Account Setup（flow） | product precedent | **淘汰**：能确认的只是步骤名（Profile → Company → Email & Calendar Sync → Workspace → Invite Team → Welcome），"Sync Email And Calendar" 排在核心账户建立之后、团队邀请之前；但页面本身声明是画廊站而非产品原页，逐屏文案不可得。理由类别：**证据不足（画廊摘要，非产品原文）**
| Attio / Linear / Raycast 官方文档（provider/model 连接段） | 官方文档 | 未搜到公开且免费可读的对应页面（这三者的"连接模型 provider"多在企业版文档或需登录），未纳入 |

3/6 采纳，2/6 因证据不足淘汰，1/6 未命中可读来源。

### 候选 1 — OpenCode（Provider 配置三分法）

- **source URL**：https://opencode.ai/docs/providers/
- **author | product**：OpenCode 官方文档 | OpenCode
- **interesting locus**：`/connect` 命令统一入口，分叉为三条路径——① 目录内 75+ provider（经 Models.dev，搜索选择，凭据写入本地加密文件）② `opencode.json` 手写自定义 OpenAI 兼容 provider（`npm: "@ai-sdk/openai-compatible"` + `baseURL`）③ 本地 provider（Ollama / LM Studio，同样走 `baseURL`，无需 key）
- **pattern hypothesis**：三分法的轴是"端点归谁决定"——目录身份端点固定、兼容端点用户自填、地址、本地端点固定于宿主——与 Courtwork `CONNECTION_PATHS` 的 `endpoint: provider|required|host` 三值完全同构
- **mature precedent? / implementation lead?**：成熟已发布产品；OpenCode 自身是实现方
- **grammar slot**：Control（分段/路径选择）+ 次 none（无独立视觉构件描述，文档只给配置语义）
- **Courtwork semantic**：直接对应 `settings-view.mjs` 的 `CONNECTION_PATHS`（`catalog` / `compatible` / `local`）——三分轴线一致，是本轮唯一在轴线上完全同构的先例
- **disposition**：`canonical candidate`——但注意其**空缺**：文档全文没有"测试连接"或"连接健康"UI，验证方式是运行 `/models` 看目录是否吐出模型列表（隐式验证，无 staleness 概念）。Courtwork 的 BE-17/18 探测 + BE-28 `lastVerifiedAt` 在此没有先例可循，需自行定义（不构成反对，只是标注这段是 Courtwork 自造而非采借）

### 候选 2 — SaaSFrame · API Key 类目聚合

- **source URL**：https://www.saasframe.io/patterns/api-key
- **author | product**：SaaSFrame（聚合免费浏览层）| 底层为 Cohere、Cal.com、Supabase、OpenAI 等 20 个已发布 SaaS 产品的真实设置页
- **interesting locus**：key 行的标准解剖——遮蔽显示、Reveal、Copy、Regenerate、创建日期与"last-used"时间戳、配置状态（active / inactive / 未配置）
- **pattern hypothesis**：凭据状态不是一个布尔"已连接"，而是"遮蔽值 + 操作 + 最近一次被使用的时间"三件套；staleness 靠"last-used"而非"last-verified"表达
- **mature precedent? / implementation lead?**：SaaSFrame 本身不是实现方（是画廊），但每个截图对应的产品（OpenAI、Supabase 等）是已发布的实现方；本轮只取跨 20 个产品重复出现的解剖形状，不取任一家的具体像素
- **grammar slot**：Control（凭据行）+ 次 none
- **Courtwork semantic**：对应 `settings-view.mjs` 的 `credentialStatus`（"A key is saved on this device. It is never shown here." / "No key is saved..."）与 `key` 密码输入行。Courtwork 目前**没有** last-used／last-verified 时间戳；PV-10 提到的 BE-28 `lastVerifiedAt` 与此形状吻合
- **disposition**：`donor`——归一路径：只取"遮蔽值 + Reveal/Copy/Regenerate + 时间戳"这一解剖形状本身，不取任一家的颜色、卡片阴影或图标；`Regenerate` 这一操作 Courtwork 今日没有对应契约（只有 Save / Remove），不随此候选自动引入

### 候选 3 — SaaSFrame · Superlist Connect Integration（反例）

- **source URL**：https://www.saasframe.io/examples/superlist-connect-integration
- **author | product**：SaaSFrame | Superlist（已发布任务管理产品）
- **interesting locus**：左侧栏纵向堆叠可选 integration，右侧展开选中项的"讲解式"详情面板（例如 Gmail 集成用一张模拟收件箱插图 + 红色箭头讲解数据流向），主 CTA 是右上角醒目的 "Continue with Google"
- **pattern hypothesis**：连接一个 provider 被处理成一次"先讲解功能、再一键 OAuth 登录"的教学式转化流程，而不是一张表单
- **mature precedent? / implementation lead?**：成熟已发布产品；Superlist 是实现方
- **grammar slot**：Shape（分栏讲解式布局）
- **Courtwork semantic**：**none**——Courtwork 的三条路径全部基于 API key 或宿主固定端点，PV-5 明确不采纳"借用另一产品登录态换 token"的消费级 OAuth 路径；这条先例的核心机制（"Continue with Google" 一键 OAuth）与 PV-4 的 `authMethods` 契约位不符（`oauth` 今日未实现，未经单独裁定不实现）
- **disposition**：`ignore`（反例）——记录理由：核心机制依赖 Courtwork 明确拒绝的消费级 OAuth 路径（PV-5），教学式讲解面板对"连接一次性 API key"场景也不适用（没有可讲解的数据流方向）

---

## 不可采纳清单（逐候选）

| 候选 | 不可采纳的部分 | 原因类别 |
|---|---|---|
| OpenCode · Q1 composer | "选择立即作用于当前会话" | 与 PV-6（每轮冻结，当前 run 记录的配置不可被后续编辑覆盖）直接冲突；Courtwork 的说明句必须保留"Applies to future runs" |
| Zed · Q1 composer | "provider logo 代替分组"、"同一模型挂多个 provider 供选" | Courtwork 路由主键 `{provider, model}` 是单一身份（PV-3），目录不存在"同一模型多 provider 来源"的并列关系；引入会打破今日的 `optgroup` 分组语义 |
| Cursor · Q1 composer | "推理强度折进模型条目本身（如 'GPT-5 high' 当成独立模型）" | 与 PV-7 冲突：一级 UI 的 effort 必须是目录声明的独立档位（`supportedEfforts`），不得把 wire 参数级差异伪装成多个模型身份 |
| OpenCode · Q2 providers | 验证方式（跑 `/models` 隐式验证，无连接健康/staleness UI） | 不是"不可采纳"而是"无先例可采"——此段留空不构成对 BE-17/18/BE-28 的先例支持，需按 Courtwork 自身契约设计，不可援引 OpenCode 空缺当作"业界都这样做" |
| SaaSFrame API Key 聚合 · Q2 | 任一家的视觉皮肤（卡片阴影、配色、图标风格） | grammar 层禁止跨产品拼贴视觉；只取凭据行的字段结构（遮蔽/操作/时间戳），不取样式 |
| SaaSFrame API Key 聚合 · Q2 | "Regenerate" 操作本身 | Courtwork 今日的凭据契约只有 Save / Remove（`PUT` / `DELETE /provider-credential`），没有"生成新 key 而不删除旧 key"的后端语义；引入需要新单，不能靠此候选顺带夹带 |
| Superlist · Q2 | 整条 "Continue with Google" OAuth CTA 与讲解式转化面板 | 依赖 Courtwork 明确拒绝的消费级 OAuth（PV-5）；且该面板需要"数据流方向"这类可讲解内容，API key 连接没有对应叙事，属于把营销转化手法当成配置表单的错位迁移 |

---

## 5. 未能核验 / 跳过记录

- `opencode.school/lessons/models/`：抓取返回 HTTP 403（反爬），未绕过，未计入证据，仅作候选 1 的旁证标注。
- SaaSFrame 站内搜索未命中"composer/chat 模型选择器"这一构件级类目（该站类目是页面级，如 onboarding / account setup / integrations），Q1 因此全部转向 coding-agent 自有文档，未使用 SaaSFrame product interfaces。
- Attio / Linear / Raycast 官方文档中"连接模型 provider"相关页面未找到公开免费可读版本，未纳入候选池（非拒绝，是未命中）。
- Cline 官方文档没有描述 composer 旁模型选择器控件本身的页面，只有 CLI 旗标与策略博客，按 README 的"须作者原文"规则整条淘汰。

（全文含表格约 205 行，符合 ≤250 行上限）
