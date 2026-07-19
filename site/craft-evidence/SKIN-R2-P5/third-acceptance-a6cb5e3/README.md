# SKIN-R2 P5 · 第三轮独立复验（`a6cb5e3`）

- 验收对象：`a6cb5e3fcaffa7a4f0ee49223648962e76427ad1`。
- 主线关系：该提交是复验时主线 `76bf95155b9b1f16be9cddbaf501adceaf899099` 的祖先；为隔离
  P5 修复，本轮精确 checkout `a6cb5e3`。
- 独立 clone：`/tmp/courtwork-p5-third-acceptance.PCoFkA/repo`；未复用前两轮 clone、端口或结论。
- 实现 diff：`71b7fa3..a6cb5e3` 只改
  `site/scripts/deslop-scan-lib.mjs` 与 `site/scripts/deslop-scan.test.mjs`，18 insertions / 3 deletions；
  消费值、字体资产、HTML、账行与契约零变化。
- 结论：**放行**。前轮 CSS escape 绕过已经由 `p5-font-coverage` 在声明值层定点拒绝，四处签署
  consumer 与 F06–F08 退场边界同时成立。

## 真实活动文件 mutation

每项均用精确补丁写进真实 `site/styles.css` 或 `site/og.html`，观察后逐字复原；复原后的工作树
在报告之外无 diff。

| 反例 | 完整 deslop 结果 |
|---|---|
| 前轮原绕过：`"Courtwork\20 Manuscript\20 Latin"` 自定义属性 + body `var(...)` 继承 | 红：`site/styles.css ... indirect font slot: :root --acceptance-probe-face` |
| 六位长 hex：`"Courtwork\000020Manuscript\000020Latin"` | 同上定点红 |
| 短 hex 字符：`"\43 ourtwork Manuscript Latin"` | 同上定点红 |
| 普通字符转义：`"Court\work Manuscript Latin"` | 同上定点红 |
| OG 六位转义字槽 + OG body `var(...)` | 红：`site/og.html ... indirect font slot: :root --acceptance-og-face` |
| `--sans` 字面前插 family | 红：`:root --sans` indirect font slot |
| 任意字面自定义槽 + body `var(...)` | 红：`:root --acceptance-probe-face` indirect font slot |
| 直接第五 consumer（字面 family） | 红：`unapproved manuscript consumer` |
| 直接第五 consumer（转义 family） | 同样红：`unapproved manuscript consumer` |
| `.wordmark > span` 改未签 selector | 双红：unapproved + missing signed consumer |

正向容忍也实测：把生产 `@font-face` family 或已签 `.wordmark > span` consumer 改为等价
`"Courtwork\20 Manuscript\20 Latin"`，完整 deslop 仍绿。故修复识别 CSSOM 同义值，没有把合法
签署 consumer 误判为缺席。

## 真渲与静止

独立源码服务仅监听 `127.0.0.1:18987`：

- `assert-p5-font-runtime` 通过：站面 `.wordmark > span`、promise 标题、卷尾与 OG wordmark 四处
  computed family 均为 `"Courtwork Manuscript Latin"`，字体资源只加载一次。
- 八个真实数据节点字符、bbox、font-family、animation、transform 与签署 baseline 逐位相等；
  未出现第五处继承。
- `assert-reduced-motion` 通过：运行态只有三条名册内 `ghosty-reduced-fade`；演示层八点归零，
  四相位零朱。

## 完整门

- `pnpm install --frozen-lockfile`：14 workspace projects，1,047 packages，exit 0。
- `node --test site/scripts/deslop-scan.test.mjs`：**39/39**，exit 0。
- `pnpm site:guard`：Node **68/68**，报告 tip deslop **883 active text files**，其余组合门全绿。
- `pnpm lint`：exit 0。
- `pnpm -r build`：13/14 workspace，desktop **3,579 modules**，exit 0；仅既有 chunk warning。
- `pnpm site:build`：exit 0。
- `pnpm test`：最终完整重跑 **148 files / 1,261 tests**，exit 0。

`pnpm test` 首轮在 build／多门并发结束后仅 `s3-flow.integration` 触发既有 5 秒 timeout（147/148、
1260/1261）；同一 clone 立即单跑该用例 **1/1** 通过（tests 694ms），负载平息后完整重跑 148/148、
1261/1261 通过。报告同时保留失败与复验事实，不把首轮冒称为绿。

本轮未修改实现／契约、未 push、未部署，也未更新 `docs/status/current.md`。
