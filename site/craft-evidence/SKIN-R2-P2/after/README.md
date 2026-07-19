# SKIN-R2 P2 · computer-use AFTER

采集日期：2026-07-20（Asia/Singapore）。实现基线：`main@52c6158` 加当前 P2-L17/L18 未提交消费值。

## 实物链

- BEFORE：用户提供的 Safari exact `1600×900`、scale `0.8` 真幀，见
  `../before/compare-1600x900-safari-overflow.png`，SHA-256
  `b0af876805d505e0338fc9a080aa4ee20e2682f50faf59449591847eb157356d`。
- AFTER：Codex in-app Browser 实机显式 viewport；本目录五张完整 viewport 幀。
- 采集时 `styles.css` SHA-256 `6d6780cd99de4ee80b0bf86e17cd90a8589800ad5f5d4cdbce6ef3e28d37ac80`；
  `App.tsx` SHA-256 `b66f12d02937c006366ba020fd87b8efcce64803730f4d4d118646ee07b82751`。
- 消费值前基线两件分别为 `1099f768…51f14`、`81b92a7c…c106`。字体、token、数据与 DOM
  payload 不在 diff 中。

## 全尺寸几何

| viewport | grid tracks | CaseRail | conversation right | composer shell right | right workface left | root 横滚 |
|---|---:|---:|---:|---:|---:|---:|
| 1180×720 | 420 + 716 | 0 | 428 | 406 | 456 | 1180 = 1180 |
| 1280×720 | 420 + 816 | 0 | 428 | 406 | 456 | 1280 = 1280 |
| 1440×900 | 420 + 976 | 0 | 428 | 406 | 456 | 1440 = 1440 |
| 1600×900 | 420 + 1136 | 0 | 428 | 406 | 456 | 1600 = 1600 |
| 2400×1000 | 420 + 1936 | 0 | 428 | 406 | 456 | 2400 = 2400 |

五态皆 `data-comparing=true`、`data-left-collapsed=true`，composer shell 与 float 均未越过
conversation 右界，左右工作面保留 28px 既有缝。截图由 computer-use 控制的实机浏览器取得，
不是截图脚本；它证明 Chromium／壳浏览器几何。Safari exact AFTER 仍列为独立验收的必须证据，
本实现会话不冒称跨引擎放行。

## 红绿证

- L18 e2e 红：预期 `data-left-collapsed=true`，旧值为 `false`。
- L17 e2e 红：预期 shell right `≤429`，旧值 `539.4375`。
- 静态门红：真撤卡、显式两轨、零 48px、禁隐藏冒充四项同时命中。
- 绿：新两项与既有 Split-Tab 回归合计 `3/3`；五尺寸实机几何如上。

## 实现侧全链

- `pnpm -r build`：13/14 workspace 通过；仅既有 Vite chunk-size 提示。
- `pnpm test`：148 files / 1261 tests 通过。
- `pnpm lint`：通过。首跑发现本批既有 blind capture 脚本漏声明 browser globals；同一证据脚本
  补显式 globals，并把夹具全角空格写成等价 `\u3000` 后复绿，未改盲测产物。
- desktop `pnpm test:e2e`：全部静态门＋**314/314** Playwright 通过，约 3.7 分钟。
  第一轮完整 e2e 为 313/314：旧 `schema-seams` 仍等待现已正式撤挂的 `.case-rail` 而 timeout；
  断言原地升级为 CaseRail=0、conversation≥420 后，全链重跑 314/314。没有降 floor、skip 或豁免。

## SHA-256

```text
4dc34ab67de33ff144038ecbdfe3b04412d43deb904959a90b3ed65f74f3f2ae  compare-1180x720-iab.png
a6ba2b7fb91dea0d3e43c965a2e1ea632af5bf8c86d896f7e1fda87c2bbf876c  compare-1280x720-iab.png
3f5ad632e03c8b655ea2e5767a53225855ce3e73dd0934feebe37644eafca418  compare-1440x900-iab.png
235d0070f830bac74e214b62df205a1b59538f5e82b3f2de5d666f5680466d55  compare-1600x900-iab.png
81029ad4220c6f258c85bb48aea657ba8829db9f86527354c2e9231b06673bf6  compare-2400x1000-iab.png
```
