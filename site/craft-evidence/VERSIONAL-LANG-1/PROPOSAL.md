# VERSIONAL-LANG-1 · 版本学设计语言全前端提案

状态：**产品／架构指令已签；进入 TDD 实现**

视觉消费基线：`main@01e7458`

来源锚：同目录 `SOURCE-HASHES.json`

两份 `.dc.html` 是参考实物，不是 token、schema 或组件权威。它们自己的收口也要求候选先转译为既有 token、组件和机器门，再过 R2 克制审计。本提案只做这次转译；签署前不写入 `r2-tier-ledger.json`，也不改变任何产品选择器。

## 一句总纲

不是把软件做旧，而是用版本学的**版心、界行、抬头、夹注、刊记**替代 SaaS 的卡片、彩条、渐变和层层框：作者性主要由编排与留白承担，功能性仍由冷色 token、可靠字轨和清楚焦点承担。

## 三档落法

| 档位 | 可用语言 | 禁止外溢 |
|---|---|---|
| Pages · 激进档 | 抬头平阙、卷次、横式题签、夹注眉批、平框刊记、写本拉丁既定四消费点 | 不把写本拉丁扩到中文、数据或正文；不新增颜色、阴影、圆角或具象古器框 |
| Agent · 中间档 | 版框等第、低频抬头、生成说明眉批化、冷色双宗、系统 UI 字轨 | 版本学词汇不得抢过任务、输入、焦点、错误和人工裁决；朱印仍是唯一仪式预算 |
| schema 工作面 · 最克制档 | 单一外框、必要主界、平直行列、文书轨与 mono 数据轨 | 零新装饰、零新容器、零 schema／wire；版式只从现有字段和交互自然长出 |

## Before / After / Why

| Before | After | Why |
|---|---|---|
| 每个模块、行和状态各自围框 | 一个区域只留一层外框；内部同类项靠间距、对齐和底色区分 | 版框表达层级，避免卡中卡；重要边界反而更清楚 |
| AI 说明是独立 callout 卡或左侧彩条 | generated 说明进入横向眉批／夹注带，verified 正文和引用仍在原位 | 说明回到文书上下文，不制造第二视觉中心 |
| 标题靠放大、粗体或 kicker 强行分层 | 关键主体新起一行、适量敬空，标题只用 510/600 两级 | 陌生感来自编排，不靠猎奇字体或重量堆叠 |
| 中性 badge 也有边框和底色 | 中性元数据改成纯文字／mono；只给严重度、核验、焦点和人工裁决保留语义色 | 色彩恢复信息含量，减少界面噪声 |
| 设置、台账、详情把每组信息切成小格 | 分组标题 + 垂直节奏；只在不同语义段、输入控件和危险动作处留线 | 连续阅读更顺，交互边界仍完整 |
| 发布事实散在 CTA、页尾和说明文字 | 真实版本、构建类型、签名状态、SHA 汇成一个平框刊记 | 版本学语言直接服务于可追溯事实，不做装饰 |

## 待签提案行

每行只绑定一个档位；投影进正式账时，每个 selector／组件只可绑定本表唯一一行。`保留` 表示把既有强边界纳入新语言，不等于加线。

| 行 | 档位 | 精确对象 | 提案 | 消费结果 / 门 |
|---|---|---|---|---|
| VL-A01 | 中间 | `:root` 排印角色与常用 chrome 文本 | 保现行 C：系统 UI sans；标题／文书／mono 各守已定轨 | 字重闭为 400/510/600；12–13px 控件真机不回退；不增字体资产，不触 P2-T01…T12 |
| VL-A02 | 最克制 | RiskList、artifact table、document/revision 数据与文书轨 | 数据 mono，文书朱雀仿宋，功能标签系统 UI | 文书禁伪粗；数据 tabular；schema 不获得展示字体或写本字体 |
| VL-A03 | 激进 | `site/` 标题、文书、UI、mono、写本拉丁五角色 | 保 P5 四个写本消费点；其余沿既有三轨 | P5 family 闭集门继续守 CSS escape；不再扩消费面 |
| VL-C01 | 中间 | Agent 浅／深双宗及 focus/disabled/hairline/strong | 与 P4 合流，只由 token 映射色；不在组件补色 | 双宗几何逐位相等；主题切换只改变解析色，不改变布局、字体、线宽 |
| VL-L01 | 中间 | `.panel-head`、`.settings-header`、主 rail/work 分界 | **保留**主界；文武线只用于区域边界 | P1-M01/M05/M06 继续有效；不以“减法”删掉空间骨架 |
| VL-L02 | 中间 | CaseRail 信息组、turn event、普通 artifact/route 行 | 同组行无逐卡外框；列表仅留组间或状态转折线 | 扁平映射表列出每个退场 border；焦点、hover、selected 可见；不改 React 行为 |
| VL-L03 | 中间 | `.turn-card`、`.data-card`、普通工具结果 | 普通信息改平直台账；gate、error、可交互 route 才可围框 | 禁止“所有卡均无框”的反向模板；交互与语义例外逐项白名单 |
| VL-L04 | 中间 | `.generated-callout` 与现有 generated/verified 说明 | generated 变横向眉批带；verified 正文不搬家 | 只用既有 generated/verified token；引用、ARIA、文本与数据逐字不变 |
| VL-L05 | 中间 | `.composer-shell`、拖放层、菜单、输入／发送 | **保留强功能边界**；只清理壳内无语义分隔 | composer 不溢出；focus-within、disabled、drag/drop、窄栏与键盘路径全保留 |
| VL-L06 | 中间 | `.settings-row`、memory item、status/recovery、表单域 | 普通设置行取消小卡感，以分组节奏替代；输入、恢复、危险确认仍围框 | settings-optin 与持久化断言不变；错误、focus、disabled 不靠位置猜测 |
| VL-L07 | 中间 | `.domain-badge`、中性 stage/scope/original 标签 | 中性 badge 去边框／底色，改文字或 mono；语义 badge 原样 | severity/verified/pending/failed 等闭集颜色不变；禁止彩虹标签复发 |
| VL-L08 | 中间 | case title、阶段标题、空态关键主体 | 低频使用“抬头·平阙”：新起一行 + 留白，不放大、不加色 | 只改既有 DOM 的流与间距；不得引入竖排题签或新图形 |
| VL-S01 | 最克制 | `.risk-master-detail`、`.artifact-table-view` 外围 | 每个工作面至多一层完整外框；主从分区线保留 | P2-L04/L05/L10 几何与行为不变；schema 零新装饰 |
| VL-S02 | 最克制 | `.dense-row`、表格 body、RiskList 同类记录 | 例行逐行线退场；header、selected、semantic group boundary 可留 | 真实四密度下仍可扫读；行点击、键盘焦点、排序与状态识别不回退 |
| VL-S03 | 最克制 | `.risk-status-ledger` 四格元数据 | 去垂直小格线，改对齐 + 间距；整组上下语义界可留 | 四字段与 DOM 顺序不变；窄栏不挤压／截断关键值 |
| VL-S04 | 最克制 | `.risk-detail`、`.detail-card`、证据／引文区域 | 普通详情去卡壳；原文、生成、核验、裁决之间保语义边界 | signature line 和人工确认层级不变；不新增字段或 presentation primitive |
| VL-P01 | 激进 | `.section-heading`、卷次 eyebrow、hero/closing 标题 | 抬头平阙成为站面主要分章法；写本拉丁只留已签点 | JS-off 与 reduced-motion 下层级仍成立；不靠动效才可读 |
| VL-P02 | 激进 | `.scenario-proof`、work ledger、promise 内部界线 | 去等分表格感：外部版框 + 少量组界，同类 proof 以留白排布 | 真 fixture、四步因果顺序和 data 节点静止；桌面／移动全帧无断层 |
| VL-P03 | 激进 | hero release facts、closing release facts、footer | 合为“牌记·刊记”平框：版本、架构、签名、公证、SHA 真值 | 只读 release truth；无制品不得伪 CTA；不用钟／鼎／亚形框 |
| VL-P04 | 激进 | 站面 generated 解释 | 可用眉批／夹注带，不新增浮卡 | generated/verified 来源语义可见；色值、字体、动效仍受现门约束 |

## 线级减法的定量口径

实现前先由脚本生成**平铺 line-consumer 基线**，只覆盖上述签署对象，不扫成通用状态机。每个消费者标为：`structural / interaction / semantic / routine`。

- `structural`：主 rail、panel head、master/detail、composer 外沿；按签署保留。
- `interaction`：input、focus、menu、dialog、drag/drop；按行为保留。
- `semantic`：错误、核验、裁决、selected；按状态保留。
- `routine`：同类行、同类元数据小格、卡中卡外壳；目标是**签署范围内至少退场 40%**，且每一条有 selector 级旧账迁移说明。
- 40% 不是视觉放行权：若为了凑数伤及结构／交互／语义线，验收必须拒绝。若真实帧证明某条 routine 仍必要，须回表改判，不得用临时例外。

机器注入至少覆盖：复活已退场 routine 边框、误删 composer/focus 边界、schema 新装饰、未登记新颜色、写本字体逃逸、一个消费者绑定两条提案行。

## 与现行签署的覆盖关系

- **不覆盖**：P1-M01…M08 的主界决策，尤其 M05/M06；P2-T01…T14 字轨裁定；P3 朱印／悬挂标点／墨迹拒迁；P5 四个写本拉丁消费点。
- **需签署后覆盖**：P1-N001…N105 中落入 `routine` 的部分。实现前必须生成“旧 P1 行 → VL 行 → 新消费值／退场”逐行迁移表；未映射行不动。
- **需签署后补充**：P2-L12 的“P1 line consumers 审计保留”结论。其他 P2 布局几何继续有效；VL 只减皮层线，不改三栏、折叠、比较或输出放置。
- **与 P4 合流但不替代 P4**：VL-C01 只规定颜色的视觉方向；`themeMode` 契约、存储、OS 监听和双宗几何仍由 P4 负责。

## 存目与拒项

| 项 | 处置 | 原因 |
|---|---|---|
| 校勘记 | 延后 | 需要版本化 compare schema／presentation；本批不得偷偷用 CSS 假造 |
| 钩乙·抹 | 延后 | 转置／删除语义会触 RevisionInstructionSet 与 ADR |
| 竖排签条 | 退 | 易变成装饰且影响读序；只保留横式标题编排 |
| 象鼻·白口 | 退 | 状态过隐晦，不足以承担 35–55 岁用户的焦点识别 |
| 钟／鼎／亚形牌记 | 退 | 与平框职能重复，具象框型有 kitsch 风险 |
| 避讳·缺笔 | 拒 | 有出处但无产品职能 |

## 签署后执行顺序

1. 先把 VL 行投影进 `r2-tier-ledger.json`，缺行红、重复绑定红。
2. 生成 P1 旧账迁移表与前帧矩阵；不得用本提案替代真帧。
3. 先做色／字重基线与线消费者分类门，再分 Desktop chrome、schema、Pages 三个可独立验收子批。
4. 只改既有 DOM、数据、行为内的皮层；每子批完整 lint/test/build，壳跑独立端口 desktop e2e，站跑 guard/build。
5. 后帧覆盖 1180×720、1280×720、1440×900、1600×900、2400×1000、四密度、折叠／比较／聚焦／空态／真实数据；P4 后再补双宗同几何帧。
6. 不同会话在 clean clone 注入反例并写 ACCEPTANCE；实现会话不自验。

## 待架构裁决

请逐行签署 `VL-A01…A03`、`VL-C01`、`VL-L01…L08`、`VL-S01…S04`、`VL-P01…P04`，并确认：

1. `routine` 签署范围至少退场 40%，结构／交互／语义线不计入配额；
2. P1-N 只按逐行迁移表覆盖，未映射即维持原签；
3. “抬头·平阙、眉批、平框刊记”是准入语汇，不是必须铺满每个页面的模板。

## 产品／架构签署投影（2026-07-20）

产品以同哈希两份供稿下达“可对 repo 前端进行全量、足量改造；颜色、字体、字重融洽，内部
分隔线多做减法”的直接指令。该指令按本表逐行落为：`VL-A01…A03`、`VL-C01`、
`VL-L01…L08`、`VL-S01…S04`、`VL-P01…P04` **全签**，并确认 40% routine 退场口径、
P1-N 逐行迁移和“准入语汇而非铺满模板”三项。

签署不撤销既有定讞：C 三轨继续有效，文书仍为朱雀仿宋，功能 UI 仍为系统 sans，写本拉丁只守
P5 四个消费点；结构／交互／语义线不计入减法配额。聊天指令已经投影进本文件与平铺档位账，
后续不得再以口述替代仓内证据。
