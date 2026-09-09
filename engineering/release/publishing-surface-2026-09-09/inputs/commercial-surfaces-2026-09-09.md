# 输入 · 商业化 specimen 与新一代 agent Pages 语言（用户转交，2026-09-09）

用户原话开头：「可以，而且这轮 Exa 看下来，CodeRabbit 等新 agent 产品的 Pages 已经形成一套比传统 SaaS pricing 更值得参考的语言。」裁定见 [intake](../intake.md) PS-21…PS-23；文案与规格见 [pricing-specimen](../commercial-surfaces/pricing-specimen.md)。

## 来源表（原文）

| 来源 | Pages 上值得取的东西 | 对 CW / SE 的转译 |
|---|---|---|
| [CodeRabbit](https://www.coderabbit.ai/) | 首页不是泛泛讲 AI，而是 `review → fix → context → learn → pre-merge`；大量真实产品 surface；pricing 把 subscription 与 agent runtime usage 分开 | Pages 应展示真实 matter/review 状态；商业层不把 runtime/model 成本揉进 license |
| [Greptile Agent](https://www.greptile.com/agent) | **"Anatomy of a PR review"**：把一个产品对象逐局部解剖，而不是 feature cards | 转成 **Anatomy of a Matter / Run / Review** |
| [Cursor Bugbot](https://cursor.com/bugbot) | Hero 就是可操作的 GitHub review demo；真实代码、comment、fix 形成微型故事 | Hero 可以是一段 deterministic review，而不是 app screenshot |
| [Factory](https://factory.ai/pricing) | Pro/Plus/Max 卖 agent capacity；Business/Enterprise 才卖组织控制、ZDR、audit、SSO、data residency | **个人能力层 / organizational governance 层** |
| [OpenHands](https://www.openhands.dev/pricing) / [Cline](https://cline.bot/pricing) | OSS/BYOK 是第一等路径，平台与 inference 分离 | 与 CW 的 provider/runtime 解耦合适 |
| [Langfuse](https://langfuse.com/pricing) | Eval/tracing 核心开放；商业升级是 retention、throughput、audit、support、compliance | SE Eval 商业边界的样板 |

## 要点（原文摘录）

- 新 agent Pages 已从「feature marketing」转向「proof marketing」：CodeRabbit 把论证写成 问题 → 一次真实 review → 为什么捕获 → 怎么修 → 怎么治理 → security；Greptile 用 "Anatomy of a PR review"。对 Courtwork：**Anatomy of a governed matter**，访客逐层点 `Source → Event → Matter State → Agent Run → Review → Decision → Provenance`。
- Fake pricing 赞成，正式定义成「commercialization specimen」，不伪装在售。页面顶部一个极轻的标记：**Concept pricing · commercialization study · not currently for sale**。
- 不用 `Starter / Professional / Business`，改三轨：**Local**（$0，Your work stays yours：Local Matter store · Event log & provenance · Core Expert runtime · Public eval suite · BYOK / local models · Exportable schemas；`View source`）；**Professional**（$29 / month，concept price，A maintained professional workbench：Signed desktop builds · Managed updates · Cloud sync & backup · Hosted runtime · Continuous private eval · Managed integrations · Longer history；`Preview Professional`）；**Organization**（Custom，Governed work at organizational scale：Shared Matters · Policy & review controls · RBAC / SSO · Audit exports · Private deployment · Sovereign-model support · Expert lifecycle management · SLA / deployment assistance；`Explore Organization`）。下方一条：**Model usage is separate. Bring your own provider, use local models, or use managed inference with a spending cap.**
- 附图可取的视觉局部：月/年 toggle 是有厚度的 floating segmented control；中栏顶部一小段彩色材质建立主推层而非整卡上色；白色内层 card 与浅灰 outer shell 的 **nested elevation**；Business 用完整 dark inversion；"Most Popular" 很小；每列下方大量 whitespace；shadow 接近 contact + ambient 复合层。删掉：`Start Free Trial` × 3；无数据的 "Most Popular"；满页 generic check-list；为 pricing 而 pricing 的 annual discount；数字逐渐增加的传统 SaaS 阶梯。
- 更激进：pricing 本身是互动 specimen，切换 **Local → Hosted → Organization**，下方架构图同步变化（LOCAL：Matter Store → Courtwork → Your Provider；HOSTED：Local / Cloud Matter → Courtwork Service（Sync · Eval · Managed Runtime）→ BYOK / Managed Model；ORGANIZATION：Users → Policy ─ Review → Matter Governance → Expert Runtime → Audit / Eval / Provenance）。pricing 向访客解释**究竟哪一层产生商业价值**。
- 新叙事：**Hero / live specimen → Why governed work → Anatomy of a Matter → Review surface → Eval / benchmark → Architecture / portability → Commercialization specimen → Source / reproduce**，而非 Hero → Features → Testimonials → Pricing → FAQ。
- 下一轮若交本地 Design Agent，索引命名 **`commercial-surfaces/`**，单列 `pricing-specimen.md`；明确为视觉/产品探索，不成为真实商业承诺。

## 附图登记（用户同日转交的三栏 pricing 参考图；无来源与许可，不入仓，只记观察）

可观察事实：标题两行 "Simple Pricing, No Surprises"，大字、深灰、字距紧；右上 Monthly / Annual segmented control，白底浮起、带厚度阴影、选中段浅灰填充；三栏等宽，外壳浅灰圆角容器，内层白色卡片承载说明句、价格与按钮，形成 outer shell / inner card 两级嵌套；中栏内层卡片上缘露出一条彩色渐变材质，右上小号 "Most Popular" 白底徽章；右栏整体反色为近黑，内层卡片为稍亮的深灰；价格为最大字阶，"/month" 小字灰色跟随；每栏一枚 "Start Free Trial" 按钮（左灰、中黑、右深灰）；卡片下方勾选式功能列表，行距宽，与售价区之间留有明显空白；整体只有一处彩色（中栏顶部渐变），其余为灰阶。

取用（已写入 [pricing-specimen](../commercial-surfaces/pricing-specimen.md) §4）：外壳与内层卡的 nested elevation；中栏顶部一条窄色带而非整卡上色；右栏整体反色；价格区与项目列表之间的大量留白；segmented control 的厚度感（沿产品既有 `--shadow-thumb`）。

不取：月 / 年切换；"Most Popular" 徽章；三枚重复的 trial 按钮；勾选式列表的对勾（改为无标记的短行）；Starter / Professional / Business 三档递增语法；中栏渐变材质本身（站点只用 Tier S 单色 accent 带）。
