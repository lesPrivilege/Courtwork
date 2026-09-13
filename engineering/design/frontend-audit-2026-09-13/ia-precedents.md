# IA 收敛审计 · 外部先例与本地边界

2026-09-13 · Luna 有界来源核对。用途：为当前前端 Audit 的信息编排、文案、字阶与 disclosure 裁决提供参照；本文不是新页面模板合同，也不授权产品改版。用户提供的“信息架构收敛 Auditing”会话原件收录于 [ia-source.json](ia-source.json)，其中布局清单和全称断言均作候选输入，须由当前 Courtwork owner 和实际表面证据裁决。

## 外部官方先例

| 来源 | 可消费的实践 | 对 Courtwork 的适用范围 | 不据此推出 |
|---|---|---|---|
| [Grafana Saga · Lists of Objects](https://grafana.com/developers/saga/templates/lists-of-objects/) | 对数据列表页建议标题、同级tabs、必要例外提示、可选图表、筛选、数据、分页等顺序；也区分开放探索用表格与结构固定的对象列表。文档明确称此结构“not obligatory”。 | 用于检查 Spark Activity、Attention registry、Files 等实际列表的筛选与数据邻接；当固定项为空或读取失败，状态与修复动作应占据数据位置。把它作为列表表面的一条参考骨架。 | 它只讨论 list-of-objects，不规定 Settings、Reader、modal 或所有二三级页面必须共享此骨架；也不证明全部页面只允许六类模板。其图表高度等阈值属于 Grafana 语境，不自动成为 Courtwork token。 |
| [Supabase Design System · Copywriting](https://supabase.com/design-system/docs/copywriting) | 按任务写直接、行动明确的短文案；按钮写出实际动作；字段说明写限制；错误说清问题和下一步；页面名与页面描述不承担营销或教程。 | 与 Courtwork 已有文案规则相互校验：清除重复解释、空泛鼓励和 feature 自述，保留对象、范围、限制、真实结果及恢复动作。遇到陌生开发者概念时，短定义仍可能必要。 | Supabase 的大小写、产品术语和“一句上限”不能取代 Courtwork 词汇表或机械扩写成所有内容都必须单句。风险、权限、未知状态和结果不确定性需要足够语义，不能为缩短而消失。 |
| [USWDS · Typography](https://designsystem.digital.gov/components/typography/) | 排版同时处理微观字形和宏观内容编排；区分标题、正文、标签与输入；控制行长、行高和对齐。正文一般需要舒适的阅读尺寸，短说明可用不同角色。USWDS 明确说 serif 对长篇连续阅读可能有益、sans 常见于 UI，但这不是硬规则。 | 对照 [type-density-constraints.md](../type-density-constraints.md) 的有限字阶与 [ui-composition-standard.md](../ui-composition-standard.md) 的区域宽度；审计应先问文本任务、密度、行长、字号及实际浏览器可读性，再讨论字族。 | 不支持“所有 Markdown 必须 serif”。Markdown 是语法/来源格式，不是单一阅读任务：代码、表格、短消息、技术诊断和长篇文章的阅读条件不同。字族变化须由相应 profile 和比较证据支持；不得绕过 Courtwork 现有类型合同。 |
| [Carbon · Accordion usage](https://carbondesignsystem.com/components/accordion/usage/) | Accordion 适合节省空间、组织不需要一次读完的相关次级内容；若用户很可能读完全部内容，普通滚动内容更直接。标题应简短明确，图标表达开合状态且同页位置一致；隐藏内容有被错过的风险。 | 与 [Disclosure / Overlay Grammar](../home-composition-2026-09-10/disclosure-overlay.md) 对照，用于 Memory、About、Accounting 等审查：区分真正的按需次级事实与完成任务所需的主体事实；inline disclosure 不变成浮层。 | 不支持把所有详情/说明收进折叠，不支持嵌套披露来容纳无界信息，也不要求照搬 Carbon 的位置、样式、开合默认或键盘实现。交互行为继续按本地 native `details` / 当前组件合同验证。 |

## 与 Courtwork 既有合同的连接

- [copy-convention.md](../copy-convention.md) §1 已规定可见文字须承担对象名、状态、条件、范围、后果或定义；§2 规定动作词、完整 icon-only accessible name 和词根一致。它直接治理去留与改写，外部写作规范只作交叉核对。
- [ui-composition-standard.md](../ui-composition-standard.md) 和 [interface-components.md](../../../docs/interface-components.md) 持有页面、Chat、Home、Settings、Work surface 等本地 composition law。它们已为 Home、Settings、Files/Reader、Chat 等明确不同任务和滚动关系；同任务相似应复用关系，不等于所有页面同版。
- [type-density-constraints.md](../type-density-constraints.md) 将 15px reading、14px body 等作为角色约束；[markdown-reader.md](../../../docs/markdown-reader.md) 要求 Reader 用现有 token 并保留 source、block positions、表格及代码的 inspectability；[typography-refinement.md](../../../docs/typography-refinement.md) 已用 15px / 1.7 做长正文候选。现有资料没有全站 Markdown serif 规则。
- [frontend-contract.md](../agent-interface-2026-09-10/frontend-contract.md) 将 UI 分成 Semantic、Projection/Control、Visual、Placement 合同。审计应先按对象与任务选语法和层级，再统一同级 chrome、type roles 或 disclosure；材质和字体不得创造或改写事实语义。

## 对绝对化提案的处理

当前 IA 来源中的 L1/L2/L3 可作为注意力审计的工作标记：主要任务与行动优先，理由/约束可在上下文提供，原始 provenance/debug 可在适当 reader/inspector 披露。但 revision 并非永不属于 L1：当用户正选择、比较或判断一个版本，版本身份和对应差异就是任务对象，应在操作处可见；纯 hash、原始 payload、内部传输细节通常可以进二级详情。按当前动作与对象判断，不按字段类型永久分层。

“六种 floorplan”可作起始分类表，不能立为封闭全集。Grafana 来源明确是列表页建议，Courtwork 既有 grammar 也包含 inline disclosure、工作面 tabs、单体对话、弹层与深层 Reader 等不同交互关系。新增面应声明最近先例和为何沿用/偏离；若找不到，应登记为新候选 grammar，不能塞进一个不适配的模板以满足配额。

**审计结论的用法**：外部实践用于提出问题和校验局部选择；本地 owner、用户指令、合成/真实浏览器观察决定产品裁决。文案、revision 可见性、serif 与模板分类均不从外部系统整套移植。
