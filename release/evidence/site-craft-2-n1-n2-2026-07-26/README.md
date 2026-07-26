# SITE-CRAFT-2 N1+N2 · Pages 上线两轮逐帧复核证据（2026-07-26）

覆盖两批：**N1 叙事批**（新增卷五发布事实、卷六有问有答）与 **N2 文案批**（底座与契约二元口径、
页级总声明、hero 换岗、可选 rider 去工程词）。合入后单次推送触发一次部署，两轮均对同一线上态复核。

- 部署：Pages run [`30201940322`](https://github.com/lesPrivilege/Courtwork/actions/runs/30201940322)，
  精确 head `64d48b4698b81383302d2f7ce4a31bfa63a88237`，conclusion `success`。
- 站面 URL：<https://lesprivilege.github.io/Courtwork/>
- `v0.1.2` tag、DMG 资产与 SHA-256 全程未改；本轮只动站面与站面证据。

## 采集器

`round-1/capture.mjs` 与 `round-2/capture.mjs` 由 `site/craft-evidence/SITE-CRAFT-2-N2/capture.mjs`
复制并改输出名与仓根深度，经 `COURTWORK_SITE_URL` 指向线上站；判定项与本地采集完全同源，
故「本地绿、线上红」这类差异不会被口径差掩掉。

## 逐轮判定（两轮同值）

| 判定项 | 口径 | 第一轮 | 第二轮 |
|---|---|---|---|
| 横向溢出 | 双宗 × 375/768/1180/1280/1440/1600 共 12 组 | 全 0 | 全 0 |
| 破图 | 同 12 组，含三枚懒加载裁片的 720/1440 变体 | 0 | 0 |
| H1 折行 | 双宗 × 1280/375 各测行数与是否溢出 `hero-copy` | 均 2 行、不溢出 | 均 2 行、不溢出 |
| 运行动效名集合 | no-preference 下 CSSAnimation 名集合 | 既有 6 名，无新增 | 同 |
| reduced-motion | 允许集按名登记 | 仅 `ghosty-reduced-fade` | 同 |
| 数据区静止 | 卷宗计数四格 + 微演示原件正文，1.3s 双采样 | 逐位一致 | 逐位一致 |
| 帧数 | 双宗整页 + 五处特写 + 375 窄屏 + JS-off | 15 | 15 |

## 资源逐字节同源

线上资源与仓内 `site/` 制品 SHA-256 逐位相等（两轮各核一次，均全绿）：`index.html`、`styles.css`、
`main.js`、`assets/icon.svg`、`assets/og.png`、`assets/ghosty-mask.svg`、五枚 woff2 子集、
三枚裁片的 720/1440 共六个变体。

og 卡另单独复核：线上 `assets/og.png` SHA-256
`7902465559dd8fb15223326b1e209b3de3b33246aaaedc421a8183602f83c5e6`，与仓内制品及
`og-manifest.json` 登记值三方相等（`live-og-1200x630.png` 为线上回取件）。

## 两轮帧证交叉比对

同一线上态下，两轮同名帧**逐字节相等**（`dark-1280`／`light-1280`／`dark-375`／`light-375`／
`hero-dark-1280`／`facts-dark-1280`／`faq-light-1280`／`nojs-dark-1280` 八对全部相等），
说明第二轮复核本身未引入皮层漂移。

## 第二轮的真实收获：探针竞态而非页面缺陷

第二轮**首跑报红**：`broken images light@1180: 1 / light@1280: 2 / light@1600: 3 / dark@1180: 1`，
而第一轮同口径为 0。按「读失败模式再归因」处置，未直接判为页面缺陷：

1. 逐个核实六枚懒加载裁片变体：线上全部 HTTP `200` 且与仓内逐字节同源——资源侧无缺口；
2. 两轮同名帧逐字节相等——渲染结果无差异；
3. 计数随视口变宽而增（1→2→3），符合「更多图片进入视口、更大变体尚在传输」的形状。

结论是探针在懒加载图片仍在网络传输时就读了 `img.complete`：本地静态服务器上瞬时可见，线上则是
竞态。修法不赌时长——采集器加显式等待（全部 `document.images` 的 `complete && naturalWidth > 0`，
上限 30s），**超时后仍破图的仍由 broken 探针如实报红**。该修正同批落回仓内采集器
`site/craft-evidence/SITE-CRAFT-2-N2/capture.mjs`，不是只在复核副本上绕过。

修正后两轮重跑：12 组视口破图全 0、其余判定不变，`failures: []`。

## 一处如实登记的时点差（非缺陷）

卷六 Q2 现文写「主合同的显式选择、原稿字节保真、历史产物不被覆盖等收束项还在进行」。
`CONTRACT-OUTPUT-TRUTH-1` 的实现已于 `78655bd` 合入 `main` 并清账，但
`docs/status/current.md` 的产品 live 表与「当前下一序」仍把这四项记为未成立，且该文件明载
「能力口径的相应更新由架构角色另单落痕」。站面宣称上限只认 `current.md`，故本轮**保持原文不改**
——当前状态是**低报而非高报**，待 current.md 的能力行刷新后由后续文案批同步。
