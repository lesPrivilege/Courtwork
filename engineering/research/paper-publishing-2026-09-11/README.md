# 修订Paper发布版面 · 优先消费裁定

2026-09-11；CourtWork接收基线`608ed1b35da3d88b3e57568b22120c9620fe5fdd`。用户要求这段讨论入账并优先消费，明确分工：**Claude绘制Anthropic式编辑插画候选，Astra裁决，Luna索引**。本轮交付为输入归档、源索引和可直接转交的[Claude任务稿](CLAUDE-BRIEF.md)，不是已完成Paper UI重建或部署。

## 输入完整性

[原会话](https://chatgpt.com/c/6aa3c4f0-ba08-83ec-afad-13c58b69581a)的接口返回1页、2轮、3条消息：2条用户与1条助手，`hasMore=false`，未报告单条截断，无附件。首轮未返回助手正文；preview重复末轮助手，未二次计数。不能把本次可取得的3条称为完整4条。可读原文见[input-snapshot.txt](input-snapshot.txt)，原始返回见[connector-response.json](connector-response.json)，字节/hash见[source-manifest.json](source-manifest.json)。

该限制不影响已明确的两轮用户意图和当前直接分工。会话内助手给出的尺寸、色号、具体工具及Hero题材是建议，以下逐项裁定后才进入施工；未把其“找到skill”“当前reader落后”自述当核验结果。

## Astra消费账

| ID / 输入 | 处置与作用 |
|---|---|
| PP-01 用户：Paper发布UI优先修订 | adopted；本会话后续出版设计优先项。目标为独立SE Paper阅读站，不能误改刚发布的CourtWork Home/Tour或把研究文章模板铺满产品GUI |
| PP-02 用户：9月11日定版标注 | adopted as surface revision；保留内容版本、内容日期和来源SHA，另记发布面修订日期。实际尚未发布时不伪报发布日期；不因UI修订更新CourtWork PAPER.md的9.6采用绑定 |
| PP-03 用户：像Frontier Lab官方文章的版面 | adopted；主张清楚的大标题/摘要、克制metadata、阅读列与宽figure节奏。品牌仍明确Schema Engineering/CourtWork，不宣称Anthropic出品 |
| PP-04 用户：CourtWork冷峻色彩与设计语言 | adopted；以现行可追溯Dystopia语义角色为源，独立Paper保留出版排印尺度。助手列举hex不能直接成为第二套真源；固定来源与导出映射由Luna索引 |
| PP-05 用户：翻译入口和原页面切换 | adopted；双语、Canonical/Practice/Index、主题及已有链接行为必须保留。语言切换不抹除卷/锚点/阅读位置；移动端收纳是候选，不先删除可见功能 |
| PP-06 助手：masthead→metadata→title/dek→cover→正文 | adapt；作为出版顺序起点，允许metadata靠标题而非强制独立一排。最先回答文章是什么，再提供安静的出版工具 |
| PP-07 助手：68–72ch与thin utility rail | candidate；68ch先沿CourtWork已实现阅读尺度试排，不称Anthropic实测值。中英文分别验证，长标题/引用/表格/宽图不可只凭ch数字验收 |
| PP-08 助手：anthropic-art与fork专用skill | reference；仓库存在且自称非官方编辑插画工具，社区构图规则与原暖色palette分开。按本轮直接指令由Claude原创绘制；安装/fork新skill不是前置交付 |
| PP-09 助手：满版背景/不规则浅面/手绘石墨线/无图中文字 | adopt as candidate grammar；原始形状与隐喻需原创，冷灰材质绑定自身tokens；不复制官方插画具体构图。Hero不能被节点框线图替代，正文机制figure另行负责准确关系 |
| PP-10 助手：commit aperture与模型离场两种隐喻 | compare；优先比较“可替换执行者、工作结构仍在”与“候选经判断成为可持续成果”，不预选唯一题材。不画自动过滤即正确或模型拔掉即无条件恢复的能力承诺 |
| PP-11 当前直接分工 | fixed；Claude持候选插画/出版view制作，Astra持claim/选型/集成裁决，Luna持最少来源索引与差异；作者自检不代替非作者接受 |
| PP-12 优先级与范围 | immediate input；Claude下一轮Paper设计先消费本包，再按最少索引读取，不重做无界资料搜索。已发布Pages v3维持当前接收，不重开A/B所有历史板 |

## 来源与证据等级

[Luna源索引](source-index.md)定位独立Paper源、当前阅读功能、CourtWork token及实现先例；该索引只导航并固定hash，不复制可编辑论文到CourtWork。[外部核验](external-references.md)区分官方文章事实、社区作者规则与尚未测量的视觉判断。三篇官方文章是不同出版变体，不是强制所有Research文章都有同一Hero的证据。

当前仅消费与派单准备，无Paper源码/文本/版本修改，无部署、skill安装、Claude外部消息或新产品能力。具体绘制可按任务稿在作者独立scratchpad执行；返回后Astra按版面与插画分别裁定。


## 本轮验证与接收

原始返回/快照hash与manifest相符，Luna索引中的归档和CourtWork三个源hash已由Astra复核；补固定token抽取脚本hash。Luna对独立SE源的只读核对显示本地main为2817b824，9/11 reader候选回执明确未部署；remote-tracking值不推为最新远端或当前线上。旧c127961/10图/无A/B包的异步Pages摘要属于早期状态，本轮不采纳为608ed1b当前事实，当前v3回执不被覆盖。

文档链接检查通过（919文档、4367链接），新增活动文档的diff whitespace检查通过；原文快照第154行保留原消息Markdown硬换行的两个尾空格，作为原始输入字节例外，不修剪原文。本轮只有研究/任务稿/索引和优先级文档；未改产品或Paper运行代码，因此不跑App/Pages UI回归来冒充设计验收。插画与新版面仍待Claude实际返回，本文不称已绘制或已外发。


## 用户追加 · SE未合入分支核查

[Luna只读分支审计](se-branch-audit.md)刷新origin后确认：唯一未合入分支为`codex/dsh-observation-20260910`，tip fa71b782，相对本地main为3/1，相对origin/main为3/0；三提交均为非等价补丁，只涉及Practice Index。本地main2817b824另领先远端8b2839a一个reader-controls提交，reader-controls分支已进入本地main，无需重复合并。另两条已合入分支、两个prunable记录与两个含未提交改动的detached worktree分别登记。Astra接收此拓扑/现场结论；下一步是有界审阅DSH三提交及reader-controls推送条件，本轮未合并、推送或清理SE。
