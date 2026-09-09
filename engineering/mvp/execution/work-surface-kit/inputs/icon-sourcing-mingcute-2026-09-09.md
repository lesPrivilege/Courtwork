# 用户转交 · Icon 来源选型与 MingCute 定位（Exa 26 结果 / 4 workstream，2026-09-09）

用户以消息原文转交（"以下可以入账，index 可以登记以备后续消费，Fable 裁决选型"），Fable 转录要点。消费裁定见 [intake-round-3 §4al WK-133](../intake-round-3.md)。核验状态见该裁定首段（MingCute 仓库与 Lucide 设计指南已由 Fable 抓取核验；其余链接未核验）。

**命题**：MingCute 值得进入 icon 选型索引，补的是 Lucide / Phosphor 之间的空档——公开 Core 24×24 grid、2px stroke、每个图标 Regular（Line）/ Filled 两态，约 1,663 语义 / 3,326 styled definitions，底层 framework-neutral `@mingcute/icons`，Apache-2.0。

**来源重新定位**

| 来源 | 最强之处 | 建议角色 |
|---|---|---|
| Lucide | 体例最严明：24×24、2px、safe zone、optical volume、center of gravity 都有规范 | Icon grammar / 自研图标基准 |
| MingCute | 柔和不幼稚，Line / Fill 成对，视觉完成度高 | 主要视觉候选 / 状态图标 donor |
| Phosphor | Thin…Fill / Duotone 六重量，表达范围最大 | 特殊状态与较有表现力的局部 |
| Remix Icon | 24×24、Line / Fill、覆盖广、中性 | coverage / fallback donor |
| Hugeicons | 覆盖极大、Rounded / Sharp / Standard + Solid / Duotone | 长尾语义探索源，不作默认依赖 |

**治理主张**：不效仿"喜欢 Remix + Phosphor 就两套随便混"；应"允许多源，禁止多种视觉语法同时裸奔"。结构：Icon Semantic Registry → canonical meaning → visual role → selected family / local SVG；先有稳定 semantic name（search / delete / approval / evidence / matter / expert / run / pause / download…）再映射 glyph，换族不影响上层 UI，也不会在不同页面出现三个不同的 download。

**Line ↔ Fill 状态配对**：bookmark / star / folder / pin 的 line → fill 可承担 inactive → active、unselected → selected、unwatched → watched、unbound → attached，使 active 不必依赖"蓝底 + 蓝框 + 粗体"；MingCute 的二态比 Phosphor duotone 更克制。

**Iconography 进入 Visual Grammar**：在 Shape / Material / Control / Identity / Motion 之外补 ICONOGRAPHY——semantic registry；geometry（canvas / optical size / stroke / corner & cap）；state（line / fill / exceptional duotone）；density（compact / prominent）；source（canonical family / secondary donor / local custom）。Lucide 最值得借的是设计规范（optical volume 模糊对照、center of gravity 视觉居中），可作 agent 自绘 Courtwork 专属 icon 的验收规则。

**下一轮 specimen 建议**：同一批真实语义（Matter / Evidence / Review / Approve / Reject / Run / Pause / Tool / Expert / Search / Download / History）横向放 Lucide、MingCute Line / Fill、Phosphor Regular / Fill、Remix Line；塞进真实槽位（32 compact toolbar、44 primary control、sidebar navigation、contextual toolbar、inspector row、selected / unselected、disabled、dark / light），看 optical weight、识别速度、与 Shape / Material grammar 是否协调。预判：MingCute 更适合最终产品视觉层，Lucide 更适合图标工程规范与自研基准，二者不冲突——Lucide rules → Courtwork icon grammar → MingCute-dominant vocabulary + selected Phosphor / local glyphs；外部体系提供 grammar、anatomy 和 donor，Courtwork 自己拥有最终语义与视觉系统。
