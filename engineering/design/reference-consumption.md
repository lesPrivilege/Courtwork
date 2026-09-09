# 历史设计与网页建议的裁取

日期：2026-09-05。依据用户要求，只消费克制、有用、符合治理工程的陌生化；历史材料不是 fresh Design context。原目录保持只读；本页是研究裁取与待验证机制，不是视觉采纳或原产品能力验收。

## 当期 brief 先于参考

当前目标是通用 Work Agent GUI：自然语言输入和运行低门槛，正式成果、证据与裁决可判断，停止、失败和恢复可理解。先以六条路径确定问题，再检索原材料；不把旧 UI、TUI 边框、古典颜色或文案整套迁入。

任何巧思应说明：解决哪个 UI-ID 的问题、用户会因此更容易做什么、语义从哪里来、无装饰版本能否同样完成、缩放/键盘/失败时怎样退化。对核心任务没有收益且持续占注意力的表达先不采用。

## 网页端讨论的处置

来源：[SE产品UX设计建议](chatgpt-conversation://6a9bd047-1da0-83ec-bb8e-a586440ca14e)。本轮通过 read_thread 读取完整回复并查看两张资源推荐帖截图；它们是建议和来源线索，不是用户已接受的技术决定，也不是被推荐产品的实测。截图临时路径不作为长期证据；未复制原帖或整个对话。

| 建议 | 当期裁取 | 不直接继承 |
|---|---|---|
| 工作语义→界面规则→设计契约 | 用已有 Matter/Artifact/Evidence/Decision 的状态与行为编订 Design；见 principles | 不新增独立 UX Schema ontology；不把 ontology 字段全部呈现在产品上 |
| Notion 内容面、Linear 状态操作、GitHub PR 审阅类比 | 作为三个独立问题的检索方向：读成果、找行动、判断变更 | 不是三品牌外观拼贴，也不把 PR 审批直接当所有专业 Review |
| Refero / designmd→DESIGN.md | 自动抽取只产生有来源、范围和推断标记的 Candidate；采纳后回迁现有 Design 契约 | 无法从 screenshot/markup 推出 Authority、持久化或恢复；不建立第二份权威 DESIGN.md |
| Phosphor only | Phosphor 与 Remix 进入图标候选；优先统一主语言，关键状态有文本 | 不按图标数量、星级或一次建议选定库；不禁止合理品牌/自定义例外 |
| Motion 只用于 marketing | 主工作面排除持续、无信息收益的动画 | 不禁止来源回跳、展开/返回、反馈等有任务用途且可降级的动效 |
| Uncertainty 用 confidence treatment | 显示缺证据、冲突、未检查与下一动作 | 不凭模型自述生成置信度仪表；颜色和图标不单独承担事实状态 |

## 外部资源复核

| 资源 / 本轮结果 | 可消费范围 | 采纳前义务 |
|---|---|---|
| [Refero Styles](https://styles.refero.design/) 页面可读，列出 AI-readable DESIGN.md 示例及 Refero MCP 入口 | 参考检索与风格拆解；品牌命名条目不是该品牌官方设计系统 | 深入单条的来源/页面类型/权限，确认是实际产品屏、营销页还是派生风格；未连接 MCP |
| [designmd.me](https://designmd.me/) 返回 403 | 只保留对话中的工具线索 | 可访问后核验具体能力、导出和来源，暂不推荐采用 |
| [designmd.supply](https://designmd.supply/) 本轮抓取工具拒绝打开 | 只保留线索；不据工具错误判断网站本身是否危险或已失效 | 后续可访问时再核验；未绕过限制 |
| [MotionSites](https://motionsites.ai/) 页面展示 landing/hero/footer 等 prompt 资源 | 若将来做解释性展示页可定向参考 | 不用于证明 Agent 工作流成熟；资产权限与成本未评估 |
| [Phosphor core](https://github.com/phosphor-icons/core)、[RemixIcon](https://github.com/Remix-Design/RemixIcon) 官方仓库可读 | 作为候选资产与图标语言来源，未选具体版本 | 比较实际工作对象、尺寸/线重、可访问名称、许可和框架集成，不搬用旧数量断言 |

访问记录只证明此时取到的内容；未对工具效果、导出质量、付费功能和 MCP 实际使用作验证。

## Motto TUI：将终端约束转为 Web 假设

定位为 `<private-source>`，本次不把相邻 `motto-dsh` 当作同一设计来源。资料是旧设计/源码研究，未运行终端或 GUI；终端宽度、复制与排版方案不能直接成为 Web 实现规范。

| 原始定位 / 历史语境 | 可迁移候选 | 不照搬 / 对照验证 |
|---|---|---|
| [TUI Thesis（历史路径：`<private-source>/docs/TUI-THESIS.md:129>`）](../migration/2026-09-08/evidence-index.md)；以排版区分消息层级 | 短分隔与悬挂对齐形成低噪音边界，正文仍连续阅读 | 不加竖排、印章、装饰字符；UI04/07 验证 CJK 窄窗、IME、长文选择与复制，装饰不进入语义数据 |
| [Review flow 研究（历史路径：`<private-source>/docs/architecture/TUI-REVIEW-FLOW-RESEARCH.md:18>`）](../migration/2026-09-08/evidence-index.md)；工具日志密度治理 | 正文、成功工具摘要、异常分层；普通成功可折叠，失败与权限拒绝保持可见 | 不直接公开含秘密的 stderr；原始受保护日志与用户可见脱敏摘要分开；UI06/13/17 检查部分成功与未完义务 |
| [卡片框研究（历史路径：`<private-source>/docs/architecture/TUI-CARD-FRAME-RESEARCH.md:274>`）](../migration/2026-09-08/evidence-index.md)；多行文本被压扁的失败线索 | 容器不改写内容，标签与原文分离，保留逐行结构与语义复制 | 不照搬终端表格为所有 Web 卡片；UI14/15 检查缩进、多行 quote、代码及窄窗复制，渲染无权改成果 |

## Deswrit kit 与 Courtwork：只取机制

| 原始定位 / 历史语境 | 克制的候选机制 | 不继承的外形或绝对规则 | 对应验证 |
|---|---|---|---|
| [Deswrit 刊例（历史路径：`<private-source>/03-刊例.md:19>`）](../migration/2026-09-08/evidence-index.md)；以校勘类比组织设计方法 | 检查值错、状态缺失、赘余、顺序错误；将风格评价转为有依据的 review | 古籍术语不成为用户学习负担；不把其“公理”当 SE 自动接受规则 | 对 UI01–18 缺态检查；删去装饰的任务对照 |
| [Deswrit 谱例（历史路径：`<private-source>/04-谱例.md:57>`）](../migration/2026-09-08/evidence-index.md)；记号和信息去重 | 一个状态标记表达可解释事实；同源信息减少重复；焦点行提供下一动作 | 不机械限制全屏只能一个数字；合理比较和可访问冗余可以保留 | UI13/16/17，用户找到阻塞与下一步，不丢判断材料 |
| [Deswrit 谱例（历史路径：`<private-source>/04-谱例.md:13>`）](../migration/2026-09-08/evidence-index.md)；语义色分工 | 稀缺状态色，正文稳定可读；去色后仍由文本/形状区分 | 不将“红色仅人裁”或旧色值照搬；正常人工接受未必是危险动作 | UI10/11/16，去色、暗色与对比度验证 |
| Courtwork Design 索引 `archive/courtwork-pre-takeover:docs/design/README.md:5`；tokens/principles 与编译稿的责任分离 | 选定后由一种现行语义与 token 源生成消费稿，效果图回迁为可检查设计决定 | 不复制已有 tokens 或旧 blueprint 限制；效果图无自行生效权 | D2→D3 交接，检查候选/现行/编译产物身份 |
| Courtwork principles `archive/courtwork-pre-takeover:docs/design/principles.md:41`；原项目控件/行动约束 | 版本与来源信息按需可达、动作指向具体对象，错误提供原因和下一步 | 不在主工作面堆 commit hash、牌记、藏印或仿古边框 | UI14–17，来源回跳、返回位置、接受后果测试 |

Deswrit 的“取法不取貌”与当前筛选目标相容；其价值是重新观察与删改的方法，不是因为历史传统而自动正确。Courtwork 中已经成立的文档约束不迁移为 SE 已采纳的视觉语言。

## 新 brief 的消费格式

```text
当前任务、UI-ID、关键失败
来源/日期/旧产品与旧约束
抽取的一个机制；排除的外形/词汇/假设
预期减少的判断或操作成本
有/无对照与退化方式
候选 / 采纳 / 不采用的理由、证据与责任人
```

本轮处置为“进入研究候选”。下一轮优先比较来源/版本的按需回跳、单一焦点行动与低噪音状态分隔；不同时把全部素材添加到 A/B/C。若测试没有收益，删除或退回，不为维持陌生感继续加复杂度。
