# Kimi K3 能力溯源调研（2026-07-17）

调研原稿，不具约束力。命题：K3（2026-07-16 发布）「coding 超越 Opus 4.8 逼近 Sol」「法律领域专门库」两宣称的来源校验，及对 provider 层/甜点模型经济账/竞争面的评估。

## 核心判定

1. **「法律专门库」查无一手实据，属以讹传讹**。官方 Tech Blog/API 文档/新华社通稿零「法律」字样（定位 software engineering/knowledge work/deep research/multimodal）。两处传言溯源均破：① SEO 内容站把旧版 Kimi 通用产品的营销措辞（「256K 上下文合同审查」，与 K3 的 1M 直接矛盾）嫁接到 K3 名下；② Vals AI 站点级 meta description（描述其自家 legal/tax/finance 评测集）被搜索摘要误读为 K3 产品特性。**独立法律数据反而是负面**：Vals AI Legal Research Bench（413 题、律所专家评分）上 Kimi K2.6 全场 18 模型垫底（Family 域 all-pass 0%、平均 174 步 vs 第一名 Opus 4.8 的 38 步），K3 未上榜。
2. **coding 宣称是「部分领先、部分落后」的混合结果**，非全面超越：官方自跑表 SWE Marathon 42.0 > Opus 4.8 的 40.0，但 DeepSWE 67.5 < Sol 73.0、FrontierSWE 81.2 < Fable 5 的 86.6。独立复测（Artificial Analysis）印证档位（Intelligence Index 57，Opus 4.8 同档），但**幻觉率 39%→51% 明显退步**；SWE-bench/Terminal-bench 官方榜尚未收录独立成绩。
3. **甜点模型经济账反向印证**：$3/$15（cache-hit $0.30），Sonnet 档定价、月之暗面史上最贵，且仅 `reasoning_effort=max` 一档、reasoning:output ≈ 4:1——「国产=便宜」假设不能默认套用。K2.6（$0.95/$4）仍是甜点档但有代差。
4. **官方自陈短板**：thinking history 必须完整回传否则生成剧烈不稳定（对 provider 无关 harness 是具名怪癖，恰是 named-profile 政策的用例）；「过度自主/擅自替用户做决定」倾向；UX 距 Fable/Sol 有明显差距。
5. **元发现**：本次调研中检索引擎合成摘要至少两次混淆自报/独立信源——二手 AI 摘要链路的可信度不继承一手来源，须逐条溯源原文引语。这本身就是「模型只生成不裁决、系统出坐标」的野外实证。

## 架构定调（2026-07-17）

- **不立 provider 单**：K3 无经济档位、幻觉率退步、thinking-history 怪癖需专门 profile 工程，当前对 schema 填表场景不成立；K2.6 若日后测填表可靠性可作候选，但均后置，不进当期队列。ADR 具名 profile 政策经此案例验证方向正确（怪癖必须具名承接，不可猜测能力的任意 URL）。
- **持续监测面改写**：要盯的不是已证伪的「法律库」传言，而是 Moonshot 类厂商**真做法律 RAG/裁判文书检索产品线**的动向（Kimi Work 已证明其垂类产品化的工程能力与意愿）。
- **口径弹药三条**：① 通用 agent 在独立法律基准上垫底（174 步低转化 vs 38 步）= 能力≠秩序的第三方证据；② 前沿国产模型同步涨价 = 「模型越便宜秩序越值钱」的时间轴要按 provider 分账测算，不许裸引；③ 二手摘要误读案例 = 锚点/引语溯源论点的现成演示素材。

来源：kimi.com/blog/kimi-k3（自报）；platform.kimi.ai docs（自报）；the-decoder 转引 Artificial Analysis（独立）；vals.ai/benchmarks/legal_research（独立）；Arena.ai Frontend Code Arena（独立）；HN #48935342、网易/知乎实测（社区）；simonwillison.net 2026/Jul/16（独立观察）。
