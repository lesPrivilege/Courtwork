# SKIN-R2 P3 · 巧思回迁证据

档位：**Agent 通用界面／中间档**。权威行见 `P3-PROPOSAL.md` 与
`ARCHITECTURE-SIGNATURE.md`；平铺映射见 `docs/design/r2-tier-ledger.json`。

## 红证与投影

1. 先把 P3 五行加入签署闭集、不写活账：`assert-skin-r2-ledger.mjs` 定点报
   `P3-S01/S02/H01/I01/A01` 五行缺失；随后投影五行，ledger 与 schema-exemplar 门转绿。
2. 在消费值仍为两段关键帧时，`schema-marks.spec.ts` 先期望获签的 58% 段；实跑精确红：
   received 只有 `0%/100%`，缺 `58% opacity:.62 scale(.96)`。落值后同谱复绿。

## P3-S01/S02 · 朱印唯一仪式

- 活值：320ms；0% `opacity 0 / scale 1.16` → 58% `.62 / .96` → 100% `.5 / 1`。
- `rotate(-4deg)` 三帧逐位相等，只是静止姿态；动效仍只有 opacity/transform。
- reduced-motion 继续 `animation:none`，印本体留存。
- 前帧从 clean `9a1281b` 的两段 keyframe 实机摄于同一 185.6ms：`seal-before-058.png`
  （`5694f995…938f`）；它仍在 0→100% 线性放大途中。后帧同一时点已进入获签的 `.96` 回弹位。
- 后帧逐帧：`seal-000.png`、`seal-058.png`、`seal-100.png`。SHA-256 依次为
  `51de8fea…bb9b`、`7549d9fc…30e6`、`e4f5d120…c1e0`。

## P3-H01 · 真实 Tauri WKWebView 排印权威

用 `tauri-evidence.conf.json` 启动真实 Courtwork Tauri 二进制；HTTP 只供固定 evidence fixture，
页面本身在 WKWebView 内渲染。唯一变量是 `hanging-punctuation: allow-end` / `none`；两边同文、
同朱雀子集、同宽、同字号。系统与逐位坐标见 `hanging-measurements.json`。

结果：macOS 26.5.2 (25F84)、Tauri CLI 2.11.4、AppleWebKit 605.1.15、viewport 1280×720、
DPR 2。WebKit `CSS.supports` 为 true；allow-end 把逗号留在前行并悬出 **23 CSS px**，none
把同一逗号下移 **39 CSS px**。`tauri-wkwebview-hanging-1280x720.png` 是同屏正负图，
`tauri-wkwebview-hanging-measurements-1280x720.png` 是壳内原始测量画面。Chromium 原有“不支持”
用例保留为跨引擎阴性守卫，但不再承担“尚未验证”的叙事。

## P3-I01 · 墨迹 A/B：正式拒迁

`capture-p3-seal-ink.mjs` 在真实 `settle-seal-risk-04` 上只作 evidence 注入：A 为现行干净印框，
B 复用站面实验的 turbulence + displacement(scale 1.7)。两帧同尺寸、同色、同 opacity，
三次 400ms 包围盒逐位相等；注入后 fixture 与 inline filter 均清零，产品源码零滤镜消费。

判定：**拒迁**。

- B 只把 52px 印框边缘变毛，未增加裁决语义或可读性；现行几何印已经是 Agent 唯一仪式预算。
- 现行半透明朱印在白底的合成对比为 **2.1104:1**。它是 `aria-hidden` 的重复性痕迹，不承担
  唯一信息，故现行产品本身不构成无障碍失败；但 P3-I01 的准入词是“同时守住 AA”，不能拿
  装饰豁免替墨迹取得奖级准入。若提高 opacity/改色以补 3:1，又会越出已签朱印值与本批范围。
- 回迁还需新增 filter 定义与消费门，收益不足以支付概念成本。故不把 evidence 注入留在产品，
  `ink-a-clean.png` 为正式态，`ink-b-bleed.png` 只作被拒对照。

## P3-A01 · 克制审计

| 件 | 档位 | 语义／静止／残留 | 结论 |
|---|---|---|---|
| 朱印三段关键帧 | 中间档唯一仪式预算 | line.settled 语义不动；opacity/transform 白名单；reduce 真停 | 落地 |
| hanging punctuation | 中间档文书轨光学 | 同 fixture 正负实效；零 DOM/数据/行为变更 | 声明保留，挂账闭合 |
| 墨迹滤镜 | 中间档候选巧思 | 几何与动画数虽静止、注入可清零，但 AA 准入与效力成本不成立 | 拒迁，零半实现 |

## 实现侧全链

`pnpm lint`、根 Vitest **148 files / 1261 tests**、`pnpm -r build`、`site:guard` **67 tests**、
`site:build` 与独立端口 `19357` 的完整 desktop e2e **314/314** 全绿。实现会话不据此自验收；
clean clone 仍须重跑 Tauri fixture、定点 mutation 与完整门链。
