# docs/38 · 素材库典范集 —— 结构提案（FD-2 交付③，2026-07-12）

> 定位：schema 工作面排版架构的**奠基素材库**。SCHEMA-SPEC-1（原语规格细则）、VOCAB-1（词表上架）、PM-PKG（PM 包实施）以本目录为设计迁移源。零 core、零产品码，纯设计资产。
> 上游依据：docs/36（五级嵌套/凡例/零编码暴露律）、docs/57（18 原语 + 组合代数）、docs/32（tokens/principles/signature-line/typography）、docs/62/61/63/65（各垂类场景形状）。

## 一、当前目录

```
docs/38-素材库典范集/
├── index.html                 素材库首页：目录 + 结构提案可视化（轻量包 Design 规范预置引用入口）
├── README.md                  本文
├── 凡例缺漏清单.md             交付④：做的过程中 docs/36 盖不住的地方（补册材料，供 SCHEMA-SPEC-1 裁决）
│
├── 排版/                      交付①：排版架构穷举（白卡视角 = PreviewHost L1 取景，聚焦排版本身）
│   ├── 01-矩阵密度.html            single 直挂 · table(matrix)
│   ├── 02-主从列表.html            single 直挂 · list（行内展开 + 法理之线五态）
│   ├── 03-全宽文书阅读.html        single 直挂 · document（冻结只读态）
│   ├── 04-时间线.html              single 直挂 · timeline（表格式 + 矛盾行）
│   ├── 05-指标三卡与趋势.html      page · grid[1,1,1] statcard + chart
│   ├── 06-表格与统计卡.html        page · grid 2:1 主次栏
│   ├── 07-核对单与期限板.html      page · grid 1:1 · checklist × schedule
│   ├── 08-并排对照.html            single · compare（复用修订双色）
│   ├── 09-表单与计算书.html        page · form + table（S10 计算器族版型）
│   ├── 10-叙事简报页.html          page · repeat → narrative（四版式 · 双通道）
│   ├── 11-门禁栈.html              gate 三态卡序列
│   ├── 12-渐进三态.html            专项：空卷索证 → partial → 完备（docs/36 §四）
│   ├── 13-三段式主从文书.html      page · list + 详情 + document 局部（RP-2.3 核心版型）
│   └── 14-溯源展开态.html          专项：依据区解剖 + peek 浮层 + hover 折光
│
└── 垂类/                      交付②：四垂类最小实现（完整工作台帧，投递展品）
    ├── 画廊-四域并排.html          总画廊：iframe 并排取证「如出一手」
    ├── 法律-合同审查矩阵.html      S3（源自 docs/32 northstar-s3，加素材库自文档行）
    ├── PM-PRD评审矩阵.html         PM-2 评审矩阵 + PM-3 RICE 表（栖屋 3.0）
    ├── 招投标-响应核对矩阵.html    S9 要求×投标人矩阵 + 资质核对单（青洲标段，虚构）
    └── HR-处分证据链.html          H12 时间线矛盾 + 三锚核对 + 索证态（澄采档案，虚构）
```

## 二、扩展位提案（图元 / 间距样例 / 状态矩阵的目录组织）

后续工单按下列承接位落产出，不另立目录法：

```
├── 图元/            每原语一页规格图：解剖图 + 间距红线标注 + 动词子集声明
│                    ← SCHEMA-SPEC-1 的产出承接位；命名 = 原语 id（table.html / list.html …，领域无关）
├── 状态矩阵/        组件 × 状态全举页：法理之线五态 × {单行/卡/展开详情}、gate 三态、
│                    字段三态（已填/待补/不适用）、tier 三级、provenance 双通道 —— 一页一矩阵
├── 间距样例/        4/8 基阶审计模板：行高 28–32 档对照、三区高 44/40/36、
│                    组合页 sectionGap 48 / columnGap 24 的可量对照卡
└── 词表映射/        各包零编码暴露映射表样例（机器枚举 → 专业词），
                     命名 = 包名（legal.md / pm.md / tender.md / hr.md），随包上架校验完备性
```

## 三、素材库纪律（维护约定）

1. **自包含**：每张典范一个 HTML，tokens 以 CSS vars 内联（与 docs/32 tokens.json 1.1.0 一一对应），零外部依赖——northstar 同构，可直接拷走、可 iframe 引用。
2. **自文档**：每张页脚一行 mono「素材库自文档 · 消费凡例：…」，声明消费了哪些凡例；出现册外样式即打回（docs/36 §三.2 的素材库镜像）。
3. **tokens 刷新**：tokens.json 变更时脚本全量替换各文件 `:root` 块，不逐张手改；变更记录写入本 README。
4. **取景两档**：排版穷举 = 白卡视角（L1 PreviewHost + 页外规格标签）；垂类展品 = 完整工作台帧四横带（principles §1）。新增素材先定档再动手。
5. **示例数据虚构纪律**（docs/21 同律）：法律 = 临江精铸案、PM = 栖澜栖屋 3.0、招投标 = 宸桥青洲标段（新造）、HR = 澄采科技档案（新造）；一律标注「虚构演示」，人名沿自然人虚构命名风格。
6. **引用方式**：轻量包 Design 规范以相对路径超链/iframe 预置引用 `index.html` 或单张典范；不复制片段——素材库是唯一权威版本。
7. **命名**：目录中文、语义化；图元扩展位内文件名用原语 id（领域无关纪律 docs/22 在文件名层的落点）。

## 四、与后续工单的接口

- **SCHEMA-SPEC-1**：以「排版/」14 张为版式基线，补每原语规格图（间距红线标注版）落「图元/」；凡例缺漏清单.md 逐条裁决后回灌 docs/36。
- **VOCAB-1**：上架 renderer 时逐条对照典范页脚的消费凡例声明；像素基准以典范为准。
- **PM-PKG**：`PM-PRD评审矩阵.html` 即 uiTemplateId=prd-review-panel / priority-scoring-panel 的北极星；与法律张并排即投递展品页（docs/61 §六.5）。
