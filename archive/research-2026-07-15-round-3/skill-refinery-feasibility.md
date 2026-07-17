# Skill→场景包炼化管线可行性（2026-07-17）

调研原稿，不具约束力。命题：schema 作为比 skill 更重但更优的形式，强模型可 oneshot 编写、兼容炼化 skill 生态、甜点模型运行时填表优于临时推理。

## 核心判定

**成立，且有一个决定性的架构事实**：schema 创作是**有编译器的域**——`admitPackages` fail-closed 准入（拒可执行对象/深冻结/pointer 静态解析/词表精确覆盖）+ json-schema-drift + layout-golden = 结构化、可判定、无副作用的错误面。「生成→过门→读结构化错误→修复（≤3 轮，超转人工）」是带编译器的生成循环——编译经济学应用到包创作本身，创作与运行两端都不靠模型自律。

## 可编译性类型学

- **(a) 直接可编译**：确定流程+结构化产出类（docx/pptx 文档生成、数据分析、审查清单）——SKILL.md 的规则表→确定性工具硬校验、QA 清单→confirmationGates/valueLabels；
- **(b) 部分可编译**：规则库类（Vercel react rules 70 条）——AST 硬规则→tools 静态检查出「命中清单」artifact，「何时适用」留 promptSegments；
- **(c) 不可编译**：开放创意/品味类（brainstorming、emil-design）——schema 化会假装确定性，诚实留 chat 侧作对照组。

## oneshot 三大风险件（按史证排序）

presentation 词表（ABI-2B/VIEW-ABI-1C 两次为此加固）> 字段职权归属（模型不天然理解「谁可写」线，易把系统坐标放进模型可写面）> 场景步骤树业务顺序。人工 taste 门两处不可省：词表措辞（结构合法≠语义准）、blueprint 选型。

## 经济账（带限定词）

skill 每次调用现场读几百行+现场判断，质量方差随模型浮动、无编译器把关；场景包一次编译+运行时填表。「启动只比 skill 略重」**部分成立**——仅当有参照包 few-shot + 现成 blueprint；新结构族需先过 ADR-012 blueprint 门槛，成本显著升。DeepSWE 6pp/2.8× 是外部转述类比，**非严格证据**，对外宣称前须在自家场景实测填表可靠性差。

## 落地形态（已定向）

**CLI + 工单体例变体，不是 meta-skill**（skill 承载会自我指涉、绕过契约先行）：`create-vertical-package --from-skill <path> --ref legal` → 强模型产六件套草稿 → 本地跑三道现成门 → 结构化错误回喂（≤3 轮）→ 全绿落盘等人工终审；SPEC「为何非加不可」字段留白**强制人工填写**——防批量 oneshot 变无治理复杂度膨胀。

试点序：① Vercel react-best-practices（零新 blueprint，验证管线本身）→ ② docx/pptx 型（验证确定性工具替代现场写 XML 的经济账）；(c) 类不试点。

## 与 schema 普查的关系

普查（upstream-positioning 已登记）直接采用 (a)/(b)/(c) 分类维度；管线跑通后普查从纸面映射表升级为**实测通过率**——「多少 skill 能三轮内过 fail-closed 门」是对上游最硬的「契约编译 vs 提示词分发」演示证据。

## 四道防 slop 包闸

结构闸（准入，已有）、品味闸（人工终审，不可省）、治理闸（为何非加不可留痕）、隔离闸（skill 自带示例数据不得混入真实 fixture）。

## 时机

发版后启动（polish 优先）；届时立 SKILL-REFINERY-1 工单（CLI 管线）+ 普查升级为实测。
