# SKIN-R2 P5 · 修复后独立复验（`15975d6`）

- 验收对象：`15975d678e88ff99ce751bf659ef7a8c0b895151`。
- 隔离环境：全新 local clone `/tmp/courtwork-p5-reacceptance.cPI86u/repo`；未沿用首轮拒绝会话。
- 系统：macOS `26.5.2 (25F84)`；Safari `26.5.2`；DPR `2`。
- 结论：**不放行**。字面 family 的首轮漏洞已闭合，但 CSS 等价转义仍能让退场的 F06/F07
  经自定义字槽复活，而 `p5-font-coverage` 错误放过。

## 新拒绝反例

在真实 `site/styles.css` 注入并于观察后逐字复原：

```css
:root {
  --acceptance-probe-face: "Courtwork\20 Manuscript\20 Latin";
}
body {
  font-family: var(--acceptance-probe-face);
}
```

CSS `\20 ` 是空格的等价转义。实测结果：

- `node site/scripts/deslop-scan.mjs`：**错误放过**，exit 0，
  `deslop: PASS (880 active text files; archive excluded from scan roots)`。
- `node site/scripts/assert-p5-font-runtime.mjs http://127.0.0.1:18986/ apps/desktop`：exit 1；浏览器
  computed body 继承面中的 `[data-pm-defect-label]`、`[data-pm-suggestion]`、
  `[data-pm-disposition]` 均已变成 `"Courtwork Manuscript Latin"`，八个数据节点字槽／包围盒
  对签署基线漂移。

这不是仅能藏在注释或死值里的拼写技巧：浏览器实际解析成已签写本 face，F06/F07 的产品消费
确实复活。runtime 后门能发现结果漂移，但签署要求间接外溢由 `p5-font-coverage` 定点失败，
且 `site:guard` 不运行按需浏览器门；两者不能互相替代。

## 其余 mutation

下列反例均在真实活动文件逐项注入、观察红后复原：

| 反例 | 定点结果 |
|---|---|
| `--sans` 字面前插写本 family（首轮核心） | `p5-font-coverage` 红：`:root --sans` indirect font slot |
| 任意自定义字槽 + `body var(...)` | 红：`:root --acceptance-probe-face` indirect font slot |
| OG 自定义字槽 + `body var(...)` | 红：`site/og.html` indirect font slot |
| 直接第五 consumer | 红：`unapproved manuscript consumer` |
| `.wordmark > span` 改未签 selector | 红：未批准 + 缺签 consumer |
| manifest glyph `8 → 9` | 红：subset cmap/glyph metrics drifted |
| manifest cmap 增 `U+0078` | 红：exact Courtwork cmap 漂移 |
| SOURCE 发布包 SHA 改一位 | 红：missing releaseArchiveSha256 |
| OFL 快照改一字 | 红：OFL bytes drifted |
| 数据字 `20 → 21` | fixture claim + `p5-data-static` 双红 |
| `--mono` 改值 | `p5-data-static` 红 |
| 数据节点加 animation | `p5-data-static` 红 |
| reduced blanket 删除 `!important` | runtime 红：三条 `demo-zhu-b` 泄漏、幕二朱残留；复原后绿 |

基线 runtime 通过：站面三处与 OG 一处真渲 Junicode，资源加载一次；八个数据节点字符、bbox、
字槽、animation、transform 与签署基线逐位相等。

## 独立 Safari 帧

| 帧 | 方法 | 物理像素 | SHA-256 | 复核 |
|---|---|---:|---|---|
| `safari-1600.png` | Safari WebKit iframe `1600×900`，scale `.8`；title probe `outer=1600x746 / dpr=2` | `2880×1718` | `33ce7355bec1ae356b15795398f5a50661fc6e626e6560b56a31142dce0ddf75` | hero/header 写本字在场，完整横向 frame 可见，无横滚或新增换行 |
| `safari-375.png` | Safari 顶层窄窗 `375×800`，回到页首后截取 | `750×1600` | `36eb0d3ccd161ec5f7b70f7f8ab7cd38bf48dd9a4b4ec1d7aefc7d9b887a9a06` | wordmark 与 hero 完整，CTA、版本事实可见，无横向溢出 |

内置 browser runtime 已按规程查询，返回空列表；证据因此来自原生 Safari 窗口层。系统
`reduceMotion` 初值为 `0`，`defaults write com.apple.universalaccess reduceMotion -bool true`
被系统拒绝（exit 1）；未绕过 TCC，未复制实现帧冒充独立 reduced Safari 证据。计算态 reduced
由本 clone 的 runtime 门实跑。

## 完整门

- `pnpm install --frozen-lockfile`：14 workspace projects，1,047 packages，exit 0。
- `pnpm lint`：exit 0。
- `pnpm test`：**148 files / 1,261 tests**，exit 0。
- `pnpm -r build`：13/14 workspace，desktop 3,579 modules，exit 0；仅既有 chunk warnings。
- `pnpm site:guard`：Node **68/68**；deslop 881 active text files；其余组合门全绿。
- `pnpm site:build`：exit 0。
- `node --test site/scripts/deslop-scan.test.mjs`：**39/39**，exit 0。

实现修复范围 `26b42eb..15975d6` 只动 `site/SPEC.md`、P5 implementation evidence 与
`deslop-scan-lib/test` 四文件；消费值、字体资产、HTML 与档位账零变化。报告之外没有 mutation
残留，`git diff --check` 通过。

## 再复验入口

实现会话需先加失败测试，令 CSS 语义等价的 family spelling（至少空格转义）在自定义字槽中也由
`p5-font-coverage` 定点红；最小实现可在既有 `normalizeCssValue`／P5 局部把 CSS escape 规范化，
无需引入变量解析状态机。修复后须由另一全新 clean clone 复验；本报告不得转写为放行。
