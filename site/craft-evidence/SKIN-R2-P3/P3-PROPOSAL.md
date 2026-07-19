# SKIN-R2 P3 · 巧思回迁平铺提案

档位固定为 **Agent 通用界面／中间档**。本批只有朱印一处仪式预算；排印 fixture 与墨迹 A/B
都是验证载体，不取得 Pages 激进档的装饰自由。每行只绑定一个目标，不引入状态机或通用抽象。

| 行 | 唯一目标 | 处置 | 精确边界 |
|---|---|---|---|
| P3-S01 | `apps/desktop/src/styles.css#@keyframes seal-press` | 深做 | 320ms；`0% opacity:0/scale:1.16 → 58% opacity:.62/scale:.96 → 100% opacity:.5/scale:1`；旋转保持 −4° 静止姿态；动画属性只含 opacity/transform |
| P3-S02 | `apps/desktop/src/styles.css#@media(prefers-reduced-motion)\|.settle-seal` | 留 | reduce 下 `animation:none`，朱印本体仍在，不以 `.01ms` 冒充停摆 |
| P3-H01 | `apps/desktop/src/styles.css#document-track\|hanging-punctuation` | 真机裁 | 同一 fixture 在真实 Tauri WKWebView 做 `allow-end`／`none` 正负对照，记录系统、WebKit、viewport、DPR 与行末差异；Chromium 不具放行权 |
| P3-I01 | `site/craft-evidence/SKIN-R2-P3#ink-bleed-ab` | A/B 后可拒 | 墨迹只试朱印消费点；同时守住 AA、可读性、静止律与残留门才准回迁，否则正式登记拒迁，不留半实现 |
| P3-A01 | `site/craft-evidence/SKIN-R2-P3#restraint-audit` | 审计 | 五项逐件复核档位、语义预算、属性白名单、数据静止与退场结论；未批准项只留证据 |

禁止范围：不改 SchemaParts 几何、`line.settled` 数据语义、交互行为、主题值、字体值、线级 token、
LEGAL-FIELD-1 或任何 schema／跨层接口。
