# 算命/炒股垂类 schema 可表达性压力测试（2026-07-15）

调研原稿，不具约束力。目的：用当下 chatbot 最大众的两个场景（算命、炒股）压力测试通用底座的解耦——不是产品提案，两域均不实现。

## 判定

两域均「大部分可全量表达 + 诚实缺口」，**无架构硬伤；core 机器层改动量为零**——全部新增停留在假想的 `packages/fortune` / `packages/invest` 包边界。

## 最强同构证据

- `invest.RiskList` 与 `legal/src/schemas/risk-list.ts` **字段级同构，零改动可迁植**（statements/basis/dispositionStatus/outOfCoverage 一字不差）。
- 算命域的「无锚不落格」自然变体：解读语句必须锚定到系统排盘产出的宫位/干支 id——铸造机制与 QuoteClaim→ResolvedSourceAnchor 完全同构，只是锚点 substrate 从文档坐标换成自产结构对象。
- 排盘 = 纯确定性工具（历法转换/四柱/紫微安星/大运流年），零 LLM，「能用规则解决的不上模型」的教科书案例；盘面=verified、解读=generated，事实等级分野天然成立。
- 炒股不可逆动作：下单永远在系统外，产出只到「待确认决策清单」——留人确认不变量的直接体现，非缺口。

## 诚实缺口（三分法）

- **架构缺口**：实时行情流（ToolAdapter 是单次 run() 契约，无流式原语）；K 线图超出七族当期 SVG 覆盖（visualization-kit 预留的 ECharts 复议口子首个真实触发场景）；紫微十二宫环形拓扑需 bespoke blueprint。
- **阶段缺口**：定时盯盘/流年提醒 = Stage 3 scheduled invocation（路线图已有定义，非新发现）。
- **产品/合规缺口**：投资建议监管敏感性架构层不该解决；自动荐股/自动交易属永不做。
- **契约拍板项（挂起）**：`ChartElementRef`（结构内引用）是否值得升为 packages/schemas 通用锚点类型——按「真实需求进入对应阶段才立 ADR」，域包真实立项前不动。
- 历法库 = 新依赖需拍板；排盘流派分歧需「排盘规则版本」标注（内容权威性问题非架构问题）。

## 三层包映射

fortune：轻量包 = 开箱排盘 + 命盘/解读 schema；重度包 = 私域门派规则引擎。invest：轻量包 = 自选跟踪 + RiskList/Thesis；重度包 = 券商/数据商真实接口。

## 投递叙事价值

「模型只生成、系统裁决事实等级、人工确认不可逆」不是法律域的偶然产物，而是可横向迁移到任意高频判断型场景的通用骨架——Courtwork 从「法律 point solution」重新定位为「已验证可跨域复用的可信 agent 底座」，且该宣称有 RiskList 字段级零改动迁植这样的硬证据。
