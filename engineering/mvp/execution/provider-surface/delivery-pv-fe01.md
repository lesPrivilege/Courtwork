# 交付 WO-PV-FE01：连接面与模型面消费真实连接

作者：Claude Opus（本单前端唯一 writer）。作者验证，非独验；独验与合流归 Astra。
日期：2026-09-10。树：`/private/tmp/se-agent-pvfe01`，分支 `claude/pvfe01-connections`。
全程 local-fake / loopback，未联网，未读取任何凭据文件。
证据目录：[`evidence/pv-fe01/`](../../../../evidence/pv-fe01/README.md)。

## 1. 基线与提交

| 项 | 值 |
|---|---|
| 基线 SHA | `e61c9d51e654088723798168aa9b4f552f389ba3`（`docs: record the BE02 commit SHA on the delivery page`），其父 `d4b5fa6` 即 WO-PV-BE02 的实现提交 |
| 分支 | `claude/pvfe01-connections` |
| 合流单元 | 按 PV-45，本分支合流时一并带入 BE02 的两个提交；BE02 不单独合流 |

### 1.1 commit 表

| SHA | 标题 |
|---|---|
| `062170c` | `feat: let the connection and model surfaces consume the real connection registry` |
| `5a27f09` | `docs: record the FE01 delivery and its loopback evidence` —— 本页与证据目录自身的提交（分支 HEAD） |

均为显式路径 `git add`，无 `git add -A`。作者验证的六条命令与九条浏览器断言跑在第一条提交的树上。

## 2. 改动文件

| 文件 | 性质 | 做了什么 |
|---|---|---|
| `app/web/settings-view.mjs` | 改 | 连接列表成复数（读 `GET /provider-connections`）；兼容路径改为登记一条真连接（`POST`/`PUT /provider-connections`）；discover 报来的模型进入 Model 列表并随连接保存；凭据请求体改 `connectionId`；未知能力如实呈现；三类保存失败按后端错误码分文案；`CONNECTION_STEPS` 增冒烟留位一步；新增 PV-M-1 写入投影（见 §7 待裁定 ①） |
| `app/web/model-picker.mjs` | 改 | 请求体改由同一处投影装配；目录未声明多于一档时不出档位选择器，只出 `Off`；窗口未报写 `unknown`；生效配置的能力原话逐字呈现 |
| `app/tests/models-connections.test.mjs` | 改 | 由 9 条增至 15 条；三条随事实改写（§5），六条新增 |
| `evidence/pv-fe01/**` | 新增 | 浏览器断言、fixture、日志、截图 |
| `engineering/mvp/execution/provider-surface/delivery-pv-fe01.md` | 新增 | 本页 |

未改：`app/server`、`app/runtime`、`app/core`、`domains`、`brand`、`contracts/*`、`intake.md`、任何 HTTP 契约、`styles.css`（未引入任何新色、新字、新图形、新材质），未新增任何依赖。

## 3. 第 0 项 PV-M-1 · 写入合一前后对照

`PUT /api/v5/provider-config` **整体替换**配置：请求体里没有的字段就是被清掉的字段。改动前有两处各自装配请求体。

| | 改动前 · Settings 连接表单 | 改动前 · 模型选择器 | 改动后 · 两处共用一处投影 |
|---|---|---|---|
| 装配位置 | `settings-view.mjs` 的 `form submit` 内联对象 | `model-picker.mjs` 的 `save` 内联对象 | `projectProviderConfig(current, change, catalog)` |
| `provider` / `model` / `api` | 表单值 | 选中值（`api` 在换 provider 时取模型的） | `change` 提到就用它，没提到从快照带 |
| `baseUrl` | 表单值，空则省略 | 仅 `sameProvider` 时带上快照的 | `change` 显式给出则用它；未给出且**身份未变**时从快照带；换了身份不带 |
| `reasoningEffort` | **完全不发** → 每次保存连接静默清掉已选档位 | 总是发选中的档位 | `change` 提到就用它，没提到从快照带；仅在目标模型的目录声明里确有该档位时带 |

**观察到的旧行为**：`PUT /provider-config {provider:"openai",model:"gpt-5.4",reasoningEffort:"high"}` 之后，在 Settings 里改个 Model 再点 Save connection，`reasoningEffort` 消失。
**改动后**（`PV-FE-3`，真浏览器、真 HTTP）：同一序列之后 `config.model === "gpt-5.5"` 且 `config.reasoningEffort === "high"`。

档位的携带规则有一处刻意的例外：目标模型的目录**声明了**档位集合却不含当前这一档时，省略而不是送上去。送上去只会换来一个 `invalid_effort` 的保存失败；而丢掉一个这条模型本来就没有的档位不是丢字段。目录里根本没有这条模型（`supportedEfforts` 为 `null` = 无从核对）时原样带走，由后端裁决。断言见 `models-connections.test.mjs` 的 `PV-M-1` 一条。

## 4. 六项逐项

**1. 被 BE02 改坏的凭据请求体**。`PUT/DELETE /api/v5/provider-credential` 现收 `{connectionId, …}`。前端不再发 `{provider}`，也**不在前端拼 `catalog-<providerId>`** —— 那个 id 的构造规则归后端。连接 id 从 `GET /provider-connections` 查出来（`selectedConnection()`）。`PV-FE-2` 在真浏览器上存一把 key 后 `credentialStatus` 变 `configured`（旧字段会 400，`not_configured` 会留在那里）。

**2. Fetch models 通到底**。兼容路径不再借用一个目录身份：它 `POST /provider-connections`（或对已存在的连接 `PUT`），把 discover 报来的 ID 作为这条连接的模型列表存下，key 随请求体一起送（后端要拿它去探一次目录，三类失败在那里分开），然后 `PUT /provider-config` 选中其中一条。`PV-FE-4` 断言报来的 ID 进入 Model 下拉；`PV-FE-5` 断言保存后连接列表多一行；`PV-FE-7` 断言选中的那个模型**真的跑完了一次 run**，`run.provider.connectionId` 指回这条连接。

目录路径未失去任何东西：目录身份 + 自定义 Base URL 仍可在 catalog 路径的 Advanced 里写出并保存（该组合后端一直支持，且 `providerConfig.baseUrl` 仍是它的落点）。变的只是"Compatible endpoint"这个入口的含义。

**3. 连接列表成复数**。行来自 `GET /provider-connections` 报的每一条，每行说出身份、端点、wire 格式、凭据状态、模型数与未知窗口数；`connectionPathOf` 的单条推断退役，代之以 `connectionPathOfKind(connection)`。今日目录连接三条 + 用户连接 N 条，`PV-FE-1`（三条）与 `PV-FE-5`（四条）分别断言了单数与复数两种情形下的同一结构。用户连接没有显示名字段——后端不存一个，前端也不发明一个——它的名字是端点主机名（`127.0.0.1:8912`）。

**4. 未知能力如实呈现**。见 §6 原文。

**5. 保存失败三类区分**。判据全部来自后端：`connection_authentication_failed` / `connection_directory_unavailable` 由探测枚举支撑，`connection_model_not_in_directory`（PV-46）是服务层错误码。前端按 `error.body.error.code` 取一句人话，并把后端原话、缺席的模型 id 与枚举值一并留在屏幕上；**没有一条正则去读报文正文**，未登记的错误码原样报 host 的话，不被塞进三类之一冒充精度。`PV-FE-8` 取到的是三个真实信封（`ghost-model` / 约定的坏 key / 8913 死端口）。

**6. 冒烟只留位**。`CONNECTION_STEPS` 增第六步 `smoke`，`available: false`，note 以 `Not available yet` 开头并写明"上面两步都不说明选中的模型能回答，宿主没有做这件事的端点（BE-39）"。**没有画按钮、没有画状态、没有许诺日期**。PV-40…43 的回执形式（落在既有 `role="status"` 块、check glyph + 灰字 + 时间、成功不着色、不上 toast）在 BE-39 落地前一处未实现——留位就是留位。

## 5. 被改写的旧断言与理由

| 旧断言（原文） | 现在 | 理由 |
|---|---|---|
| `WK-108 · 目录报来的模型 ID 不进 Model 下拉，也不进保存的配置` | 改写为 `PV-24 · 目录报来的模型 ID 进入这条连接的 Model 列表，并随连接保存` | **PV-50 授权**。旧断言当时是对的：后端没有可以保存兼容连接的地方，前端把发现来的 ID 只画成说明性清单才是诚实的。BE02 之后后端有了连接注册表，那张清单若仍进不去就成了 PV-24 所拒的"填得出却不能用"。断言方向反转，强度未降：新断言同样逐条检查源码事实（并集来源、discover 成功即填、保存进 `models`、另两条路径仍只由已安装目录填） |
| `for (const step of CONNECTION_STEPS) assert.equal(step.available, true)` | 改为"未交付的恰好是 `smoke` 这一条，且它的 note 以 `Not available yet` 开头、无 `probe`、写明那两步不证明模型能回答" | 事实变了：多了一步真的还没交付。断言从"全部已交付"变成"未交付的是哪一条、它怎么说"，是更强的约束，不是放宽 |
| `assert.match(CONNECTION_STEPS.find(s=>s.id==="fetch").note, /not added to the Model list/)` 与 `probeCatalogueLine` 的 `not added to the Model list or saved` | 改为 `/become the Model list for this connection/` 并新增 `/does not check that any of them can answer/`、`/not a check that any can answer/` | 同上一条的同一个事实。补上的第二句保住了旧句真正在保护的东西：探测成功不等于模型能回答 |
| `路径由已保存的事实反推`（`connectionPathOf` 的四条） | 改为 `路径由连接记录自己说`（`connectionPathOfKind`），并新增 `assert.doesNotMatch(settingsSource, /export function connectionPathOf\(/)` | 工单第 3 项要求单条推断退役。新断言额外钉死旧函数不得残留 |
| `Connections 只列后端真有的那一条` | 改为 `Connections 列后端注册表报的每一条，结构不假设单数` | 工单第 3 项。原断言里"本地端点不说没有 key""端点与凭据分开陈述"两条逐字保留 |
| `每条 happy path 都只用后端目录里真有的 provider 身份`（含 `assert.ok(path.providers.length)`） | 目录与本地两条保持原断言；兼容那条改断言 `providers` 为**空**数组 | 兼容路径的身份是宿主登记的连接本身（`conn-` 前缀），不借用任何目录身份与凭据槽。这是 PV-31 在前端的投影，比"必须来自目录闭集"更紧 |

新增六条：`PV-27 / PV-30 窗口读数`、`PV-34 / PV-46 三类失败`、`PV-24 模型 ID 进列表`、`BE02 契约 · 凭据键是连接 id`、`PV-M-1 写入合一`、`PV-27 档位选择器`。

## 6. 未知能力呈现的原文

后端的唯一常量（`provider-connections.mjs: UNKNOWN_WINDOW_NOTICE`）逐字呈现，一个字未改写：

```
context window unknown, compaction disabled
```

它出现在生效连接那一行（截图 `settings-models-1440-light-saved.png`，第四行第二句），以及模型选择器里生效模型的说明行。**其余连接不显示这句话**：后端今日只为生效配置计算 `capability`，别的连接没有这个字段，前端替它造一句就是替后端说话。理由记在代码注释与 §7 待裁定 ③。

表单里选中模型的读数（`PV-FE-4` 从渲染文档上读到的原文）：

```
Context window: unknown. Compaction stays off for it. Reasoning effort: Off. The catalogue reports no levels for this model.
```

用户填入窗口后（`PV-FE-9`，同一位置）：

```
Context window: 16,384 tokens, from your entry. Reasoning effort: Off. This catalogue declares no levels for this model.
```

同时 `GET /provider-config` 的 `capability` 变为 `{"contextWindow":16384,"contextWindowSource":"user","compactionEnabled":true,"notice":null}`，连接行的未知计数从 `2 with an unknown context window` 减为 `1`。

档位：目录未声明多于一档时，模型选择器**不渲染那个下拉**，只渲染一行 `Off. The catalogue for this connection reports no reasoning levels for this model.` —— 一个只有 `Off` 一项的下拉是在暗示别处还有别的档位可选。**未为 `runtime` 之外的五个凭据来源值造任何分支或选择器**（PV-47）：本单一处都没画。

## 7. 待裁定

① **新模块进不了静态白名单**。PV-M-1 的投影本该是自己的模块 `app/web/provider-config.mjs`；`app/server/index.mjs` 的静态资源白名单逐个列出可服务的 `app/web/*.mjs`，新增文件要改 `app/server` —— 在本单写权之外（真跑一次即 404，见首轮 `pv-checks` 的失败记录）。按"选最保守实现继续"，它落在 `settings-view.mjs` 里、由 `model-picker.mjs` import，代码处有注释指回本条。请裁定是否要 Astra 在合流时把它拆成独立模块并补一行白名单。

② **"Compatible endpoint"这个入口的含义变了**。它原来保存的是"目录身份 + 自定义 baseUrl"，现在保存的是一条宿主登记的连接。目录身份 + 自定义 baseUrl 未消失（catalog 路径的 Advanced 里仍写得出、存得下），但一个曾在那里的人会发现它挪了位置。本单认为这是 PV-24 的必然结果——只有登记成连接，发现来的模型才可能被执行——但入口语义的改动值得记一笔。

③ **非生效连接没有 capability**。后端 `#capabilityOf` 只对 `providerConfig` 算一次，`GET /provider-connections` 的记录里没有 `notice` / `compactionEnabled`。所以"压缩关闭"这句原话只在生效那一行出现，其余连接只说得出"N 个模型的窗口未知"。工单第 4 项写的是"须在连接行与模型行可见"，本单在生效连接上完全满足，在其余连接上给的是弱一档的事实陈述。若裁定要求每条连接都出这句话，需要后端在连接记录上给出 capability（或至少给出那个常量），否则前端只能硬编码后端的句子——那会造第二个真相源。

④ **用户填的窗口只作用于当前选中的那个模型**。表单里一个 `Context window` 输入，保存时写在选中模型这一条上，其余模型的既有窗口原样保留。这是最小实现；一条连接上逐模型分别填窗口需要一张模型表，属"连接管理大页"，本单不做。

⑤ **模型选择器里用户连接的分组标签是连接 id**。`GET /provider-models` 的 `model.provider` 对用户连接就是 `conn-<12 hex>`，选择器按它分组，于是那一组的标签是一串 id 而不是 `127.0.0.1:8912`。选择器不取连接注册表（它今日只发两个请求），要改就得多一路请求或让后端在模型上带一个显示名。本单不改，如实记录。

⑥ **`credentialStatus` 的作用域**。Settings 的 API key 块现在说的是"表单此刻对准的那条连接"有没有 key，而不再是"生效配置"有没有。这与 PV-52（凭据文件是唯一真相、按连接作用域）一致，但它改变了那句话的主语，读者若停在旧模型上会读错。

⑦ **BE-39 未落地**，冒烟留位；PV-40…43 的回执形式一处未实现。BE-39 落地后须由后续工单把这一步从留位改成回执，届时 `CONNECTION_STEPS` 的 `smoke` 一条与本页 §4-6 一并更新。

## 8. 状态矩阵

| 场景 | 界面所说 | 后端事实 | 断言 |
|---|---|---|---|
| 未加载 | `No connection is loaded yet.` | 尚未取到注册表 | 单测 `connectionRows({connections:null}) === []` |
| 三条目录连接、无用户连接 | 三行，各说端点/格式/凭据/模型数 | `GET /provider-connections` 三条 | `PV-FE-1` |
| 目录连接有 key | `API key saved` | `credentialStatus: configured` | `PV-FE-2` |
| 本地连接 | `No key needed`、`Local endpoint fixed by the host` | `catalog-fake-openai-loopback` | 单测 + `PV-FE-1` |
| 兼容端点已探测未保存 | Model 下拉出现发现来的 ID；`Context window: unknown.` | 尚无连接记录 | `PV-FE-4` |
| 兼容连接已保存、窗口未知 | 行上 `2 models, 2 with an unknown context window` + 后端原话 | `capability.notice` 非空、`compactionEnabled:false` | `PV-FE-5` / `PV-FE-6` |
| 兼容连接、用户填了窗口 | `16,384 tokens, from your entry`；未知计数减一 | `contextWindowSource:"user"`、`notice:null` | `PV-FE-9` |
| 选中发现来的模型并执行 | —（Chat 面） | run `completed`，`run.provider.connectionId` 指回该连接 | `PV-FE-7` |
| 保存失败 · 认证 | `Authentication failed: …(<枚举>)` | `connection_authentication_failed` | 单测 + `PV-FE-8` |
| 保存失败 · 目录不可达 | `The model directory could not be read…(<枚举>)` | `connection_directory_unavailable` | 单测 + `PV-FE-8` |
| 保存失败 · 模型不在目录 | `That directory does not list…Not listed: <id>.` | `connection_model_not_in_directory` | 单测 + `PV-FE-8` |
| 有活动 run | 表单、探测与凭据全部禁用，状态行原句未改 | 409 `active_run` | `lock()` 未改语义（§9） |
| 冒烟 | 第六步 `Not available yet…` | 无端点 | 单测 |

## 9. 未检项

- **真实 provider `not_run`**：凭据只在 UI 输入，本单不持有任何真实 key，也未读取任何凭据文件（包括 `~/.pi/agent/auth.json`）。DeepSeek / OpenAI / 任何远端网关均未接触。
- `openai-responses` 格式的兼容连接未端到端跑：fixture 只实现 chat/completions（沿 BE02 的同一未检项）。
- `lock()` 的 run 期语义与模型面 "applies to future runs" 的说明句**一字未改**，但"活动 run 期间的多连接界面"没有专门的浏览器断言——本单只核了代码路径未动。
- 移动视口（390）与 200% 缩放下新增的连接行未量几何：本单不做 FE-05a 的字阶与密度改动，也未新增几何断言；`composition-checks` 一类的布局回归未在本单重跑。
- 连接的**删除**（`DELETE /provider-connections/{id}`）未做界面：工单未列，属连接管理大页的范围。
- 一条连接上有多个用户填的窗口值、以及一条连接被另一条连接顶替生效时的时序，均未验。
- 未改动本树以外的任何目录；未起除 8911 / 8912 与 headless Chrome 之外的任何进程，且均已停止。

## 10. anti-slop 门自查

| 门 | 自查 |
|---|---|
| 不画后端没有的东西 | 冒烟只留位；`credentialStatus` / `capability` / 三类错误码全部消费后端字段；`runtime` 之外的五个凭据来源一处未画；`catalog-` 前缀不在前端拼 |
| 不改写后端原话 | `context window unknown, compaction disabled` 逐字；探测的 `status` / `message` 仍原样呈现；错误信封的 `message` 与 `status` 一并留在屏幕上 |
| 不放宽断言 | 三条改写的断言逐条给了理由（§5），两条方向反转、一条变严；无一条是删掉一个不过的检查 |
| 不引新色新字新图形新材质 | `styles.css` 零改动；`lint-colors` / `lint-materials` / `contrast-report` 全绿 |
| 不引依赖 | `app/package.json` 零改动 |
| 不越写权 | `app/server`、`app/runtime`、`contracts/*`、`intake.md` 零改动；新模块因白名单进不去，记入待裁定而不是去改 `app/server` |
| 不许诺再收回 | 未交付的一步写"没有"，不画按不动的按钮；未检项如实列出，真实 provider 写 `not_run` 而不是"应该可以" |
| 证据可复核 | 九条浏览器断言的数值与文字从渲染文档上读，脚本、日志、截图、JSON 全部落 `evidence/pv-fe01/` |
