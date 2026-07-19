# VERSIONAL-LANG-2 · 已批提案行

产品指令（2026-07-20）：“颜色色系色阶取新的两版参考稿，线依然要再做一轮减法（可以检视 commit 记录，从引入衬线的改动手动减法回退）；pages hero 标题‘模型只生成，不裁决’用字重更高的宋体（就像下一页 4 栏的标题）”。本文件把该直接签署投影为档位账，不另造裁定。

参考稿：

- `设计语言三档评估板.dc.html`，SHA-256 `0648262d0894dd7b79ad8603e4441d21f6115cac422052b397e20350b67008f0`
- `巧思生长谱-版本学与写本.dc.html`，SHA-256 `dcba23b955d623bb55c258ba0e351858c4e187f6262f926dd85dec76e96bd870`

| 行 | 档位 | 唯一消费目标 | 已批处置 |
|---|---|---|---|
| `VL2-C01` | Pages 激进档 | `site/styles.css#reference-light-palette` | Pages 与 OG 逐槽接回两稿共用的冷白浅宗；值仍只认 `tokens.json color.*`。产品壳深宗 opt-in 不退役。 |
| `VL2-T01` | Pages 激进档 | `site/styles.css#h1.zh-title|weight` | Hero 标题继续消费 Noto Serif SC，字重由 400 升 700，与下一节四栏标题一致；零新字体。 |
| `VL2-L01` | Pages 激进档 | `site/styles.css#versional-routine-lines-r2` | Evidence 四栏竖线、work/scenario 连续行横线与眉批上下框退场；外框、焦点、数据语义界保留。 |
| `VL2-L02` | Agent 中间档 | `apps/desktop/src/styles.css#document-routine-lines-r2` | 文书标题线、起草纸外框、进度条上下线、粘贴展开钮内线退场；输入、焦点、schema 与失败/确认语义界不动。 |

提交考古：`dfd4e19` / `d59e9dd` 只接入字体轨，未引入上述 routine 线；本轮因此保留衬线消费，手工回退的是随后仍留在连续内容里的框线，不把“减线”误作“退字体”。
