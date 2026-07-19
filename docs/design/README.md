# 设计系统

本目录保存仍被产品与机器门消费的设计规范。

| 文件 | 职责 |
|---|---|
| `tokens.json` | 颜色、排版、密度、圆角、层级与首页 token 的唯一机器真值 |
| `principles.md` | 组件与交互原则 |
| `voice.md` | 文案与用语规范（动作命名、错误/完成/进行/空态体例、零技术概念暴露），可机器断言条款由 `lint:voice` 守 |
| `signature-line.md` | “法理之线”状态语义与白名单 |
| `typography-density.md` | 排版与密度 + **排印凡例**（三轨字体制/字重即层级/墨色律/度量律/槽位表与机器门清单；值表随 B2-0 定值批落 tokens.json） |
| `svg-standards.md` | SVG 工程规则 |
| `icon.md` | 品牌图标规则 |
| `site-evidence-line.md` | Pages 首页的证据链叙事、真实材料与发布验收规则 |
| `visualization-kit.md` | Schema 工作面的原生构件、视图原语、有限组合与 blueprint 接入门 |
| `courtwork-design.md` | **编译产物，非权威。** 由 `apps/desktop/scripts/compile-design-md.mjs` 从 `tokens.json` + `principles.md` 编译（Geist 同形态：YAML frontmatter 承载 token 值、正文承载用法语义），供效果图/视觉生成管线作前置约束。改 token 或原则后运行 `pnpm --filter @courtwork/desktop design:md` 重生成；drift 门（`lint:design-md`，并入 `site:guard`）守护同步 |

历史北极星稿、竞稿、截图调研、验收记录和素材画廊不属于现行设计契约，已退出本目录。

修改设计系统时必须同步 desktop 消费点与静态门禁，并通过独立视觉验收。不得在组件内引入未登记的硬编码色值、阴影、圆角或字体尺寸。

## 双层 UI 与效果图回迁工作流

UI 分两层演进，走同一条「架构生长 → 效果图探索 → 回迁」流水：

- **本体 UI**：产品壳、对话、导航、弹层与设置——功能和页面布局从架构（ports、descriptor、场景声明）生长出来，不由效果图倒推功能。
- **Work preview UI**：结构化数据的人类可交互展示面，权威接入方式是 ADR-012 的 descriptor 驱动构件与 blueprint 门；视图原语的最小组合穷举经效果图批量探索后，筛入 `visualization-kit.md` 的有限组合清单。

回迁护栏（效果图是探索件，不是权威）：

1. 效果图（Codex image 等生成）只用于探索组合与布局，本身不进入现行契约；被采纳的结论必须翻译为 token、组件与 blueprint 规格才生效。
2. 回迁唯一通货是既有 token 与设计语言——三层表面、动效四属性白名单、零投影密度规则对效果图同样有裁决权；效果图里出现的新色值、新阴影、弹簧动效一律在回迁时剔除或先修 token。
3. 外部参考（前端库、个人网站、开源 GUI）经源码级调研入档后才可作为回迁依据，视觉皮肤不随机制一起迁入。
4. 回迁产生的组件改动照常走静态门禁与独立视觉验收，效果图不替代验收证据。

终局收口：**阶段拆分与入场条件的权威见[实现就绪图](../architecture/implementation-readiness.md)「Round 3 收尾序」——polish 已拍板分 R1（定向修缮，产品负责人+Sonnet，轻验收）/ R2（巧思视效，Fable 主导，独立验收），且入场条件已全部清账（2026-07-17 起可开工）**。原单阶段分工描述保留为 R2 细则：惊艳效果/作者巧思的回迁实现交给最强 base model（Fable 实现会话，可自由派发 subagent 做机械性扫读与核对，主上下文只留品味与整合判断），并顺带做一轮功能交互逻辑检视；**视觉全量扫**归 Sol（computer use）一并承担——UI 小 bug 清扫（含产品负责人目测转交的 bug 单）、Pages 所需真实截图产出、schema 可视化 image 穷举（即数套全量视觉/PPT 模板底稿）、已入档参考站点的视觉摸底；独立验收仍归验收角色，实现与验收分离不变。该阶段仍逐项过门禁，不豁免任何设计语言约束。

（入场条件清单已全部清账，历史定义见提交史；条件类判断今后只认就绪图与当前基线。）
