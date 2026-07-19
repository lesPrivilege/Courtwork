# SKIN-R2 P2 · 排印 C/D 逐靶提案（待架构逐行签署）

状态：**提案态；未获消费值实现授权**。证据基线 `967694e`，证据回灌提交 `d9d1a63`。
全量帧、度量、来源与揭盲见 `blind-typography/`。

盲测结论：C `86.5`，D `87.8`，D 只领先 `1.3/100`，处于预先锁定的同分区；D 虽通过
12–13px 与 overflow 硬门，但新增 `916,316` bytes 实验子集，数据轨拉丁宽度缩短 `16.95%`，
且未取得 WKWebView 权威 AA。依“D 须明证胜出、同分取 C”，本表提议**保 C**。

## 逐靶表

| 请求行 | 唯一 target | 档位 | 提案 | 证据理由 | 消费值影响 |
|---|---|---|---|---|---|
| `P2-T01` | `docs/design/tokens.json#typography.family.ui` | 中间档 | **留 C** 现行功能轨 | D 的小字号未回退但仅微弱净胜，未越过挑战方举证线；冷色界面在 C 下已自足 | 零 |
| `P2-T02` | `apps/desktop/src/styles.css#:root|--font-ui` | 中间档 | **留**按名消费 T01 | CSS 与 token 保持逐字同源；不得用局部 selector 偷渡 D | 零 |
| `P2-T03` | `docs/design/tokens.json#typography.family.mono` | 中间档 | **留 C** 现行数据轨 | D 数据拉丁更紧但宽度缩短 16.95%，不是无代价胜出；数据扫描习惯与包体成本合看仍在同分区 | 零 |
| `P2-T04` | `apps/desktop/src/styles.css#:root|--mono` | 中间档/最克制档随消费面 | **留**按名消费 T03 | 数据节点、编号与表格继续同一 mono 语义，不以 Pages 展示许可改壳侧 | 零 |
| `P2-T05` | `docs/design/tokens.json#typography.family.title` | 中间档 | **留**现行标题轨 | C/D 控制组 family、20px 混排宽度与包内真渲逐位相等；本轮无证据要求换值 | 零 |
| `P2-T06` | `docs/design/tokens.json#typography.track.title` | 中间档 | **留** 400/600 标题梯度 | 既有 700 粘连拒项不重开；标题层级仍由原生双字重承担 | 零 |
| `P2-T07` | `docs/design/tokens.json#typography.family.body` | 中间档 | **留**朱雀仿宋文书轨 | 产品定讞原样保持；C/D 均未以系统黑体替换正文，16px 混排宽度与 1.75 行高逐位相等 | 零 |
| `P2-T08` | `docs/design/tokens.json#typography.track.document` | 中间档 | **留**文书单字重 400 | 零粗体律继续成立；盲测不构成撤销产品定讞的授权 | 零 |
| `P2-T09` | `apps/desktop/src/assets/fonts/subset-manifest.json#fonts` | 中间档 | **留**现行机骨全件 | 本轮没有活字栈退役；`@font-face`、子集、manifest、SOURCE/许可链与真渲门均不删不改 | 零 |
| `P2-T10` | `apps/desktop/scripts/assert-typography.mjs#retired-font-values` | 中间档 | **不新增退役值**，并守 D 不得进入活消费 | 退役账只记录曾经生效后撤出的值；Sarasa 在本批只是实验候选，伪造退役史会污染机骨 | 增前向守卫，不改字体值 |
| `P2-T11` | `site/craft-evidence/SKIN-R2-P2/blind-typography#Sarasa-v1.0.40` | 中间档 | **留作挑战证据，不升可用配方** | 来源、SHA、覆盖、缺字/fallback 与有效/无效帧均已封存；叙事层只述度量与效力，精确技术标识留证据账 | 零 |
| `P2-T12` | `docs/design/typography-density.md#R2排印裁量边界` | 中间档 | **记录本轮保 C 结论与复议门** | 未来重开须有模型外盲评与 Tauri WKWebView 12–13px 同 fixture，并净胜同分区；不能拿本轮 D 方向性优势当自动授权 | 文档/门禁 |
| `P2-T13` | `docs/design/typography-density.md#四档密度` | 中间档 | **留** reading/body/dense/meta | 16 帧逐态统计证明四档真实消费；不以字号统一化抹平语义 | 零 |
| `P2-T14` | `apps/desktop/SPEC.md#SKIN-R2-P2` | 中间档 | 记录盲测、版式留/拒迁、红绿门与零消费结论 | P2 仍须以 mutation、前后同哈希、全仓门和独立 clone 验收闭环 | 文档/门禁 |

## 签署后 TDD 与实现边界

1. 先让 P2 档位账/排印漂移门因缺 `P2-T01…T14` 翻红；签署投影后转绿。
2. 注入 D family、漏任一 C 轨、删除现行 font face/manifest、伪造 Sarasa 退役项、改文书字重、
   把 D 证据当授权，均须定点翻红。
3. 字体消费值与资产零改；前/后视觉帧可用同 SHA 证明“审计后保留”，但完整尺寸/状态矩阵、
   computer-use 与坏帧边界仍须随批验收。
4. P2 实现不取得物理删字体、信息架构、schema、LEGAL-FIELD-1、主题或动效授权。

## 架构需回复

逐行签/退 `P2-T01…P2-T14`，并与 `P2-L01…P2-L16` 一并签署。若退回任一“留 C”行，须明确
指出哪项证据足以使 D 越过“明证胜出”而不是仅方向有效；文书轨仍须产品负责人明确改判才可动。
