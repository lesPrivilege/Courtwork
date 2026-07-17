# Frontier 研究与垂类动向扫描（2025H2–2026-07）

调研原稿，不具约束力。铁律执行：一手（论文/system card/官方博客/官方 eval）与叙事层分离，矛盾处显式。

## 两枚重磅一手

1. **Harvey Legal Agent Benchmark（LAB，2026-05 开源）**：1250 任务/24 执业领域/75000+ rubric、**all-pass 评分**——frontier 模型长程法律任务完成率**总体不足 10%**；致谢名单列 Anthropic/OpenAI/DeepMind/Nvidia/Mistral 为研究合作方。**frontier 选择给垂类基准供弹而非自建法律产品线**——分工格局的最硬单一证据；且 all-pass 口径与「无锚不落格」方法论同构（及格线≠可用工作产品，验证/rubric/锚点才是复杂度堆积处）。
2. **Anthropic Economic Index（2026-01/06）**：法律职业理论可执行 89% vs 实际使用约 20.4%，集中在摘要/检索/草拟而非裁决类任务——「模型只生成不裁决」的市场现实被 frontier 自家数据量化。

## 研究信号要点

- Anthropic：agent 自主性量化（99.9 分位 turn 时长三个月翻倍）；system card 用未发布 Mythos checkpoint 做自主性上限对照=「能力已备暂缓外放」，与甜点模型假设吻合；**Claude for Legal（2026-05）**=20+ connector+12 执业插件——「半下场」但停留在连接层（接 Ironclad/DocuSign 工作流），未做案例检索/事实等级/锚点判定层。
- OpenAI：GDPval 把法律 brief 归入横向 44 职业（非专项）；Harvey 定制案例法模型=深度合作但产品由 Harvey 发行与定义 rubric。
- DeepMind：模型+verifier 范式向数学/科研复制（Aletheia），**未见向法律/文书扩展的官方信号**——空白本身是信号。
- 中国系：研究议程高度集中 coding/长程 agent/长上下文（DeepSeek-V4 1M ctx、Qwen3.7-Max、GLM-5.2）；**法律域零厂商侧研究动作**——现有信号全在政府侧（最高检/法院数据平台集成 DeepSeek 部署通报），属采购部署非研究议程。
- 横向：可靠性平台期论文（arXiv 2602.16666：24 个月可靠性几乎未随准确率提升）反「agent 元年」简化叙事；verification horizon（2606.26300）为「生成易于验证」反转提供学术支撑。

## 叙事过滤（五条）

「agent 元年」半实（能力跃升真、可靠性平台期被略）；「垂类被通用吞噬」当前虚（LAB <10% + frontier 供弹行为）；「模型替代律师」虚；「RL env/verifier 军备竞赛」半实（学术共识真、具体投入数字均叙事层）；「中国大模型法律能力反超」半实偏叙事（部署广度真、无可验证基准分数）。

## 架构定调（2026-07-17）

1. **总体补强**。LAB all-pass 口径给「无锚不落格」提供了 frontier 生态的方法论同名物；Economic Index 给「只生成不裁决」提供了市场量化。窗口期比「吞噬论」暗示的长。
2. **监控线一条**：Anthropic 若从连接层下沉到**判定层**（事实等级/锚点/确认类能力），分工边界才真被侵蚀——盯 Claude for Legal 的后续形态，连接器数量增长不算信号，判定语义出现才算。
3. **中国法律域=空档+风险并存**：无人抢「秩序层」定义权是空档；政府采购压力可能迫使国产厂商做出比连接器深的定制是风险——盯 DeepSeek/Qwen/智谱是否出现 Claude for Legal 同型官方动作。
4. **verifier 商品化利好而非威胁**：verifier 解决「候选对不对」，不解决「坐标形态/谁确认/降级如何显式」——后者是我们复杂度预算所在，schema 编译论点因此强化。
5. **追踪两个硬数据源**：Harvey LAB leaderboard（承诺数周内发布——「通用模型逼近法律可用线」的时间估计）；可靠性平台期论文脉络后续。

来源清单见调研会话原文（Anthropic research/economic index/system cards、OpenAI GDPval/Harvey、DeepMind blog、Harvey LAB、spp.gov.cn/data.court.gov.cn、arXiv 2602.16666/2606.26300 等，均已标注一手/叙事层）。
