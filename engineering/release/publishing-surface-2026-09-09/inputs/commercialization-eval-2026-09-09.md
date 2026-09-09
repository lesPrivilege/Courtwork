# 输入 · 商业化与 Eval 两条线（用户转交，2026-09-09）

用户原话：「以下亦可以参考入账，本轮 task 不变。」以下为转交内容原文（另一会话的 Exa 检索结论，约 54 个结果、4 个方向；核了 Hamming Skill 与 OpenHands、Langfuse、PostHog、n8n、Cal.com、TablePlus）。与发布面相关的裁定见 [intake](../intake.md) PS-13…PS-15；商业化本身本轮不裁定。

---

这里把 **commercialization 与 eval 明确拆成两条线**：

* **商业化**：现在适合 Explore，先确定"什么东西可以收费、收费不应污染什么"，暂不做 pricing/paywall 施工。
* **Eval**：更接近 SE / Courtwork 自身的技术与产品能力，应研发成一等公民；其公开、可复现部分还应直接进入 GitHub Pages，成为发布面的证据，而不是商业宣传数字。

## 1. Hamming 这份 repo：可参，但应"抽掉移动 App 外壳"

[haiming-app-monetization](https://github.com/HammingDev/haiming-app-monetization) 最值得消费的是它的方法纪律：先读真实实现，再严格区分 `code fact / public source / runtime observation / owner experience / hypothesis`；有购买函数 ≠ 购买路径可靠；有 trial 配置 ≠ 用户真的获得 trial；做了实验 ≠ 已证明商业效果；不承诺收入和转化提升；商业方案必须能重新落回具体实现与验证场景；用 acceptance scenarios 验收这个"商业化 Skill 自己"。

可抽象为 **Store → Govern → Retrieve → Compile** 之外，对商业产品多一条：**Observe → Hypothesize → Package → Instrument → Evaluate**。不宜迁移：周订阅 / 年订阅 / 终身 / StoreKit trial / restore purchase / exit offer。

## 2. 不要 monetise intelligence，优先 monetise organizational complexity

Cal.com：individual → team collaboration → organization governance → enterprise assurance。n8n：community/self-host → managed execution → collaboration → governance/compliance。Langfuse：tracing、datasets、evaluation、prompt management 均允许 OSS 自托管，商业层为 retention、throughput、support、audit、SCIM、SLA。OpenHands：local OSS + BYOK → hosted convenience → enterprise control；模型 BYOK，自有模型按成本 PAYG。

候选原则：**Keep intelligence portable; charge for coordination, assurance and operation.**

宜长期保持开放 / 可迁移：Schema 规范、Matter / Event / Context contracts、Harness interfaces、Expert format / extension contract、Provider adapters、基础 local runtime、BYOK、数据导出、**核心 Eval 与 benchmark**、fixtures / reproducibility、基础 review / provenance。

将来可能形成商业对象：Managed hosting / sync / backup、organization workspace、shared Matter、RBAC / SSO / SCIM、governed team policy、retention policy、organization-level audit/export、private deployment / VPC / on-prem、sovereign-model deployment support、signed/LTS builds、SLA / support、managed integrations、enterprise Expert packs、expert lifecycle / distribution / verification、continuous private eval、regulated-industry assurance/reporting。

## 3. Platform Cost ≠ Model Cost

```text
Courtwork license / service ≠ Model entitlement ≠ Runtime provider ≠ Expert package
```

## 4. 第二条路径：本地专业桌面软件

TablePlus：perpetual license + 1 year updates；Sublime Text：once-off purchase + 更新期。

| 路径 | 免费/开放 | 用户购买的东西 |
|---|---|---|
| OSS + Cloud | local core | hosting / team / governance |
| Professional Desktop | paper/schema/runtime contracts | polished signed app + update entitlement |
| Hybrid | local OSS/core | 官方 desktop build + cloud/org services |
| Enterprise | portable core | deployment / governance / assurance / SLA |

现在完全不需要裁定。

## 5. Eval 首先是公共产品能力

最糟糕的发布方式是"我们 benchmark 提升了 31%"而访客看不到 benchmark 是什么。发布面应当允许人继续问：What was tested? Against what? With which model? Which harness? Which fixture? What was held constant? What failed? Can I reproduce it?

```text
EVAL

Continuity
────────────────
Baseline     SE
  63         81

[inspect run]

Failure classes
context loss       12 → 3
state corruption    7 → 1
unsupported claim   8 → 5

Model · Harness · Fixture · Commit
[method] [raw trace] [reproduce]
```

数字是次级内容；最重要的是 inspectability。Pages = executable evidence surface。

## 6. 交点

Public Eval（benchmark、fixtures、method、baseline、failure taxonomy、reproduction）证明 SE / Courtwork 有效；Private / Managed Eval（customer corpus → private benchmark → continuous regression → model × harness comparison → policy conformance → expert-pack evaluation → release gate → audit report）将来才可能成为商业产品。**Eval method is open. Continuous assurance can be commercial.**

## 7. 新三分法

**Matter Telemetry ≠ Product Analytics ≠ Evaluation Evidence**：案件 / 工作自身的 provenance；产品自身的使用情况；证明系统能力的实验材料。不能因为 Event Log 很丰富，就拿用户 Matter trace 当增长分析数据。

## 建议的 index

```text
commercialization/
├── 00-principles.md（what must remain portable · monetization objects · anti-lock-in rules）
├── 01-market-patterns.md（OpenHands · Langfuse · PostHog · n8n · Cal.com · TablePlus / Sublime）
├── 02-business-model-options.md（OSS + cloud · professional desktop · hybrid · enterprise assurance）
├── 03-cost-boundaries.md（platform · model / BYOK · compute · experts · support）
├── 04-entitlement-architecture.md
├── 05-commercial-surfaces.md（Pages · in-app · upgrade · usage · organization）
└── 06-experimentation.md（analytics boundary · commercialization eval）

eval/
├── philosophy · benchmark schema · fixture design · baselines
├── failure taxonomy · harness/model matrix · reproducibility
└── publishing surface
```

不要把 `eval/` 放进 `commercialization/`；两项 sibling workstream。Hamming repo 定位为"evidence-grounded commercialization review 方法样本"。最值得保留的两个商业化候选原型：OpenHands/Langfuse 路线；TablePlus 路线。到真正产品有外部用户之后，再由真实 adoption 决定往哪边长。
