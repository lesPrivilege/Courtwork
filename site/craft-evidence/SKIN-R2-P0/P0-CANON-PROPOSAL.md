已完成只读 P0 架构提案。基线核验为 clean `main@19242d2`、ahead 4；未修改或提交任何文件。

## 裁向定义

- **合**：保留在单一谱系，或把重复正文合入指定权威，原处只留指针。
- **退**：退出现行权威链；可以保留为编译产物、批次证据或历史材料，不等于物理删除。
- **升**：把已稳定的跨批规则提升到更高、更易必读的权威层。

## A 桶逐项签署表

| ID | 现行权威与问题 | 推荐 | 拟落目标与禁止范围 | 验收反例 |
|---|---|---:|---|---|
| `P0-A01` | `docs/design/README.md` 是设计入口，但末段仍复制旧 Fable/Sol 分工和“入场条件已清账”叙述 | **合** | 只保留目录、双层 UI 与回迁流程；新增 exemplar 指针；执行角色、开工状态只指向 readiness，不在设计入口复制 | README 再出现具体模型派工或批次完成状态应红 |
| `P0-A02` | `tokens.json` 是值面唯一机器真源 | **合** | 权威不变；P0 不改任何视觉值，不让 exemplar 抄 token 值 | exemplar 或原则出现第二份 hex、px、字体值表应红 |
| `P0-A03` | `principles.md` 承担通用设计与交互律 | **合** | 保留行为级规则；数值继续只指 tokens | 原则文档新增局部定值或 layer SPEC 反向覆盖原则应红 |
| `P0-A04` | “法理之线”正文现已收敛：principles §7 为摘要指针，`signature-line.md` 为完整白名单 | **合** | 维持现状，不再复制状态表和优先级 | 两文档各自拥有不同状态白名单应红 |
| `P0-A05` | 三档梯度目前只在 principles/readiness，尚未进入根总纲 | **升** | `CLAUDE.md` 核心不变量新增：Pages 激进、Agent 中间、schema 最克制；每项视觉变更绑定唯一档位及批准提案行，答不出不动手。principles 保留展开说明 | 新 selector 无档位、一个条目绑两档、无提案行均红 |
| `P0-A06` | 奖级工艺 #4“素净即敬业”尚无现行落点 | **升** | 写入 principles，固定中性措辞：**“素净是专业性的一种有效形态，而非装饰缺失；衬线、无衬线与扁平处理不预设高下，按档位、语义、可读性与真实效力裁决。衬线不是完成度指标，也不是待清除项。”** | 出现“衬线必须”“无衬线必须”或把扁平等同未完成应红 |
| `P0-A07` | `voice.md` 是用户文案权威 | **合** | 不并入 exemplar；exemplar 只引用闭集词表入口 | exemplar 自造用户标签、状态词或工程词应红 |
| `P0-A08` | `typography-density.md` 是排印凡例，但现行标题定值将被 P2 重测 | **合** | 在同文档加入 R2 裁量节，不另造字体规范：标题/功能轨由架构按 A/B/C 盲测核定，同分取系统 sans；文书仿宋与拒系统黑体做正文是产品定谳，A 即使胜出也须产品明确收回定谳才可落地 | 仅凭架构签署让 A 覆盖文书轨、或把盲测结果当自动授权应红 |
| `P0-A09` | B2 字体机骨及来源链当前分布于排印凡例、SPEC、evidence | **合** | 在排印凡例加入退役律：字栈改值只撤活消费并入黑名单；`@font-face`、子集、manifest、SOURCE/许可链、真渲门与 evidence 不直接删除；物理删件另票 | 删除退役字体资产、删来源链、删真渲门或以豁免代替重写断言应红 |
| `P0-A10` | `site-evidence-line.md` 是 Pages 动效与证据例外权威 | **合** | 保持独立；exemplar 不继承 Pages 动效例外 | schema 表借 Pages 例外启用媒体/标题动效应红 |
| `P0-A11` | `visualization-kit.md` 是构件目录，容易被误认成全链凡例 | **合** | 增加显式双向指针：“本文件是元素集，不是 schema-exemplar”；“1px hairline”收窄为次界/数据格，不覆盖主界线级律 | 只凭构件目录声明凡例完成、或用 1px 统一主次界应红 |
| `P0-A12` | `svg-standards.md` 管图标，SchemaParts 有另一套专门门 | **合** | 补旁注和机器门入口，明确两套辖区与白名单分别成立 | 把 SchemaParts 当普通 icon 绕门，或把 icon 豁免扩大到任意内联 SVG 应红 |
| `P0-A13` | `icon.md` 是品牌几何谱系 | **合** | 保持独立，不进入 schema 表衍生输入 | 新表以品牌图标代替结构化 primitive 应红 |
| `P0-A14` | `courtwork-design.md` 是 tokens+principles 编译产物 | **退** | 明确维持“生成态、非权威”；原则改动后由既有编译器重生，禁止手改 | 手改产物、产物反向覆盖源或 drift 门不红均失败 |
| `P0-A15` | `consolidation-survey-2026-07-19.md` 是事件性摸底报告 | **退** | P0 裁决消费后归档；现行 README、SPEC、源码及 exemplar 不引用其归档路径 | 归档后仍被现行文档或脚本当输入应红 |
| `P0-A16` | readiness 长段混有稳定设计规则、批次状态与调度 | **升** | 梯度、字体裁量、exemplar 规则分别升入总纲/设计册；readiness 只留依赖、票面状态、验收出口和权威指针 | readiness 与设计册各保留可独立修改的同一规则正文应红 |
| `P0-A17` | workflow 判例节已承担跨工单经验 | **合** | 原位保留；P0 只新增必要的“档位绑定”判例指针，不复制七条既有判例 | 将判例正文复制回 layer SPEC 或 exemplar 应红 |
| `P0-A18` | `apps/desktop/SPEC.md` 保存 B1–B4 层内事实 | **合** | 保留批次事实、红证和消费点；跨批稳定律只指向 canon | 从 SPEC 反向定义新档位、schema 语义或字体产品裁量应红 |
| `P0-A19` | `site/SPEC.md` 保存 SITE-CRAFT-2 批次事实 | **合** | 保留 Pages 实验和许可证据；跨面规则指向设计 canon | 将站面试验事实直接升级为壳侧许可应红 |
| `P0-A20` | SCHEMA-EXEMPLAR-1 现行权威文档不存在 | **升** | 新建 `docs/design/schema-exemplar.md`，作为指针式全链凡例；不得复制 payload 字段表、JSON Schema、token 值或 React 结构 | 出现第二份 schema 定义、字段默认值表、JSON/TS payload code fence 应红 |
| `P0-A21` | 原型审计已于当前基线归档；craft-evidence 是帧证据 | **退** | 维持证据层，不回迁为权威；exemplar 不引用归档路径或截图坐标 | 以归档原型/截图推翻现行 schema、ADR、token 或 SPEC 应红 |

建议签署：`P0-A01`–`P0-A21` 全部按推荐裁向。

## 12 散件登记与基线哈希

哈希均取 `main@19242d2`。凡例中的身份分四类：**权威输入、验收样本、现状观察、禁止输入**。

| ID | 散件与 SHA-256 | 身份与处理 |
|---|---|---|
| `P0-S01` | `risk-list.ts` — `8ad718d629ef2cb58f1d948521cb42e98fe27a1cfefa9319ce13f7f0bfc1d9a1` | **权威输入**：payload/draft 边界；只指向导出符号，不复制字段 |
| `P0-S02` | `presentation/index.ts` — `0b864614ae6841397bb18d3d93f65bd77b4b0902e05494ca0f952f3903e12572` | **权威输入**：artifact、citation binding、词表和 renderer 声明 |
| `P0-S03` | `compile-risk-list-to-revisions.ts` — `818e060e5942c3bd7b746da34b267d9d89f77c2724f92f815b4436fff462b866` | **权威输入**：已处置风险到修订指令的确定性领域链 |
| `P0-S04a` | `s3-risk-list-response.ts` — `956ecbc10dd9c600623824cdc910e8ff4f4b9538a27776c0063360a86026bbc4` | **验收样本**：最终形真实 fixture，不是字段权威 |
| `P0-S04b` | `s3-risk-list-draft.ts` — `77c0df939264b8edfe05b8ea120cf3203d8a170aa2ad5c98a6bd324315ca9851` | **验收样本**：模型只出引语的草稿 fixture |
| `P0-S05` | ADR-012 — `e39731f75f7fd7330625a2f3deb10e5d81da6a0c3a5ee383b9fee5ce9150add9` | **权威输入**：projection→primitive→versioned blueprint、整面 fail-closed |
| `P0-S06` | ADR-014 — `aea1089d9fcf34a14adc07fa05df7055519b4ae22ca2d18e514e9a5146606d38` | **权威输入**：tab=artifact、多 artifact 与迁移期边界 |
| `P0-S07` | ADR-003 — `32d061d5a4bd35b374f68590a2dd4bb0482647aa410a5996fefb81e4f658ed0c` | **权威输入**：模型出 quote、系统铸 anchor、A/B/C 门义 |
| `P0-S08` | `visualization-kit.md` — `2ad1f393cf9acd18e32e67bff721010e469d20a7e3bbb319aa3434de12024a50` | **权威输入**：允许 primitive 与有限组合；明确不是 schema 真源 |
| `P0-S09` | `signature-line.md` — `39484165c2af4be17da73200ac8e7e7d7d3f5629bed790e180e5f30bff95cbb1` | **权威输入**：处置状态视觉语义和白名单 |
| `P0-S10` | `Panels.tsx` — `886522d29a173108c4697010e0997aef1cf29cc6130e93682b3947b48b001172` | **现状观察**：当前五列表面和未落格流；是迁移债，不具规范权，不能反冻为 blueprint |
| `P0-S11` | `implementation-readiness.md` — `fdb3ac6cebb577333c7fbfea33d45911480d283f8372e90d111cd49f2340aa10` | **委托来源**：证明工单、依赖和出口；凡例落地后只留指针，不作为衍生输入 |
| `P0-S12` | 历史 equity specimen — `72391502695bc27b4dab6dcb5f69d0bb80329d2ec715dae07350838939712cff` | **禁止输入**：仅本签署卷宗记录其历史存在；不得出现在现行 exemplar、source manifest、脚本或 one-shot 输入 |

说明：`S10/S11/S12` 的哈希只用于本次裁决审计，不做永久全文 hash 锁；否则任何 UI 或调度文字改动都会无意义地震红凡例。`S01`–`S09` 才进入正式来源 manifest。

## `schema-exemplar.md` 定本结构

1. **地位与禁区**
   - 指针式凡例，不是 schema、presentation、renderer 或字段手册。
   - schema 工作面固定最克制档；零新装饰、零模型布局、零 archive 输入。
2. **权威图**
   - 分列模型、系统、垂类包、宿主、人五种职权。
   - 模型只生成草稿和引语；系统验证、铸锚、剪枝、门禁；人决定确认/驳回/修正。
3. **Legal S3/RiskList 全链**
   - 只用符号指针表达：draft → citation resolver → final artifact/out-of-coverage → presentation/词表 → gate → artifact table/detail → disposition → revision compiler → non-applied 知悉流。
   - 不展开任何字段定义。
4. **五列阅读语义**
   - 只定义人类问题：风险是什么、严重度如何、依据是否核验、人的处置、下一步是什么。
   - 不把五列固定成所有领域必须同名；新领域必须证明五个问题的等价映射。
5. **元素集与组合**
   - 仅引用 visualization-kit 的 `Field/Anchor/Status/Evidence/Decision/Estimate/Partial` 及有限 section/grid/repeat。
   - 法理之线只引用 signature-line 白名单。
6. **派生入口**
   - 接受已准入 `packageId/schemaId`、现有 JSON Schema、descriptor artifact、presentation vocabulary、有效 fixture、目标任务与现有 blueprint。
   - 输出仅限 presentation config、fixture/golden、ViewModel projection 和 craft-evidence；默认不得改 payload/schema/scenario。
7. **失败条件**
   - 缺 pointer、自由 label、未登记 primitive、模型提供坐标、无锚落格、半面渲染、组件解释领域 wire、archive 输入、schema 档新增装饰均整面失败。
8. **one-shot 验证协议**
   - 目标固定 `pm.PrdReview`；隐藏现行 presentation，封存 oracle；一次生成，失败回 P0，不许人工补后冒称一次通过。
9. **来源登记**
   - 只列 `S01`–`S09`；`S10` 标为验收观察但不进衍生包；不出现 `S12` 路径。

## 新表派生入口

固定九步，实施者无自由裁量：

1. 证明 package、schema 和 fixture 已经通过 registry 准入。
2. 从 schema/descriptor/presentation 读取权威，不从截图、Panels 或历史稿猜字段。
3. 把领域目标映射为五个阅读问题；无等价项时显式标缺口，不伪造列。
4. 每项展示需求映射到既有 primitive；缺 primitive 即停止并另提架构票。
5. 使用现有版本化 blueprint；不得复制 Legal 未版本化 panel。
6. pointer、enum label、tone 和 action 全闭集验证；任一漂移整面 fail closed。
7. 锚点只能来自系统 resolver；模型输出坐标一律拒收。
8. 确认动作只调用现有 confirmation port；presentation 不携 effect。
9. 用真实 fixture 生成 golden、窄宽/键盘/focus/reduced-motion/双主题证据，再进入独立验收。

## 最小机器门规格

建议落一份平铺 manifest 和一个脚本，不建状态机：

- `docs/design/schema-exemplar.sources.json`
- `apps/desktop/scripts/assert-schema-exemplar.mjs`
- 命令：`pnpm --filter @courtwork/desktop lint:schema-exemplar`
- 接入既有 `site:guard` 与 desktop 完整静态前链。

脚本只做：

1. manifest ID/path 唯一，且只允许 `S01`–`S09`。
2. 权威文件存在，SHA-256 与签署值一致；有意改动必须同批重审来源登记。
3. exemplar 必备章节及稳定锚点齐全。
4. exemplar、manifest、源码脚本内 `archive/` 引用为零。
5. exemplar 不含 JSON/TypeScript payload code fence，不含“字段/类型/默认值”式复制表。
6. 每个派生输出绑定唯一档位和唯一批准提案行。
7. primitive、blueprint、label、pointer 全部来自现行闭集。
8. `Panels.tsx` 只允许作为具名观察链接，不得被登记为 authority。
9. `courtwork-design.md` drift 继续由原门负责，本门不复制其职责。

必须真实注入并观察变红的反例：

- 删除一个来源；
- 改一个权威来源 hash；
- 复制一行 JSON/TS schema；
- 把历史材料加入 manifest；
- 同一来源登记两个权威角色；
- 删除档位或提案行；
- 使用未登记 primitive；
- 把 Panels 当前列名声明为跨域字段契约。

## 单一谱系终态

```text
CLAUDE.md
  → docs/design/README.md
      → principles / typography-density / signature-line
      → schema-exemplar ↔ visualization-kit
      → tokens.json + 机器门
  → ADR / package schema / presentation
  → layer SPEC
  → ACCEPTANCE / craft-evidence
  → archive（只作历史，零反向引用）
```

这份签署材料本身不授权 P1 消费值变化，也不授权 P2 的 A 案覆盖文书轨。建议用户签署格式：

`P0-A01…P0-A21 全签；P0-S01…P0-S12 分类全签。`

签署后才由实现会话落 P0；本会话不可参与其独立验收。
