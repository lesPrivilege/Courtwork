# SKIN-R2 P5 · Pages 写本拉丁实现证据

实现基线：`main@52c61588233f5ed4f5fcf1d6e12fcfd201c6ba14`。档位：Pages 激进档。权威签署只认
[`ARCHITECTURE-SIGNATURE.md`](ARCHITECTURE-SIGNATURE.md)；本页不扩张签署面。

## 前后实机回路

- `before/` 五帧在任何消费值变化前由原生 Safari 26.5.2 拍摄；源文件 SHA 与系统条件见
  `before/manifest.json`。browser plugin 当时无可用浏览器，故按批准回退使用原生 Safari，未把
  Playwright 截图冒充 computer-use 证据。
- `after/` 以同一 Safari、同一 1440/1600/375/reduced-motion/JS-off 矩阵拍摄；Reduce Motion
  每次由系统面板真开，并在拍后复原。JS-off 由同字节站面附加 CSP `script-src 'none'` 令 Safari
  真拒脚本。逐帧 SHA 见 `after/manifest.json`。
- 1440、1600、375 三档无新增换行、溢出或横滚；reduced-motion 与 JS-off 均内容完整。

## 来源、子集与真渲

- Junicode 2.226 release / source WOFF2 / OFL / 入库子集的固定 SHA、字节、cmap、glyph 与生成命令
  见 `junicode/SOURCE.md`；许可证逐字快照为 `junicode/LICENSE.txt`。
- `manuscript-latin-subset.woff2` 只含 `Courtwork` 的 7 个码位、8 glyphs、6,872 bytes；轴值固定
  `wght=400 / wdth=100 / ENLA=0`，`font-display: swap`，不以可变轴造猎奇字形。
- `node site/scripts/assert-p5-font-runtime.mjs http://127.0.0.1:18963/ apps/desktop` 真渲通过：三处站面
  与 OG 共四个签署点 computed `font-family` 均命中 `Courtwork Manuscript Latin`，资源只加载一次。
- 同门把签署基线的 8 个数据节点字符、bbox、字槽、animation 与 transform 逐位对比，全部零漂移；
  基线在 `runtime-data-baseline.json`。

## 红绿与 mutation

- 红测先行：首次导入尚不存在的 `checkP5FontCoverage / checkP5DataStatic`，Node 测试在模块实例化
  阶段 exit 1；最小实现后 `38/38`。
- 仓级真实反例逐件注入并复原：SOURCE 发布包 SHA 缺失 → `SOURCE record is missing
  releaseArchiveSha256`；manifest woff SHA 与 glyph 数错 → 两条定点红；`.zh-doc` 偷吃写本类 →
  `unapproved manuscript consumer`；卷宗数 `20→21` → fixture claim 与 `p5-data-static` 双红。
- 复原后 `node site/scripts/deslop-scan.mjs` 与 runtime gate 均绿；完整仓门数字由本提交最终实跑填写。
- `pnpm site:guard` 在本实现基线先通过 65/65、release-truth、deslop 及 neutral/elevation/signature/
  motion/design-md，随后被基线尚未认识 P2/P5 提案行的 schema-exemplar grammar 挡下（41 条均为
  已签账行）。该共享门漂移已由后续主线 `20f9667` 以 P2/P5 闭集与退场反例修复；P5 未重复修改
  desktop gate，须在整合 `20f9667` 的 tip 重跑 site:guard。

## 实现会话自检

- `pnpm site:build`：exit 0；新子集进入 `site-dist/assets/fonts/`。
- `pnpm -r build`：exit 0，13/14 workspace projects（根项目不在递归 scope）。
- `pnpm test`：先与 build 错误并行而因 workspace dist 尚未生成失败；build 后按正确顺序重跑，
  **148 files / 1261 tests 全绿**。失败轮次未被冒称为通过。
- `pnpm lint`：被基线既有 `SKIN-R2-P2/blind-typography/scripts/capture-blind.mjs` 的 37 个
  browser-global / irregular-whitespace 错误挡下；P5 文件的定点 eslint 全绿。该 P2 lint 修复同样须
  以整合主线事实复跑，不由 P5 越界修改。
- `git diff --check`、四份 JSON `jq empty`：通过。

## 四律克制审计

1. **角色律**：只改 hero/header 品牌字、promise 标题内品牌字、卷尾品牌字、OG wordmark；中文标题、
   文书、功能 UI 与数据/mono 不替换。
2. **来源律**：开放字体、版本、许可快照、发布包 SHA、源 WOFF2 SHA、子集 SHA、cmap 与 glyph 清单
   全链在场；任何一环漂移即失败。
3. **静止律**：零新动效，`main.js` 字节未动；八个真实数据节点字符、bbox 与计算态 motion 零漂移，
   reduced-motion / JS-off 同矩阵成立。
4. **边界律**：四个选择器是闭集，第五个消费点即红；不改 `--sans`、`body`、OG body 或 `--mono`，
   不更新档位账、不生成新 schema、不回迁 Agent 壳。

## 复杂度

新增概念仅两枚平铺门 `p5-font-coverage` / `p5-data-static` 与一枚按需 runtime 断言脚本；零新 npm
依赖、零状态机、零持久化格式、零通用字体抽象。新资产只有一枚 6,872-byte 子集、其 manifest 与
许可证证据。触碰面未发现可安全退役的既有抽象；F06–F08 已依签署正式退场，不以顺手清理复活。

## 独立验收拒绝后的 P5-F10 定点修复

独立验收 `26b42eb` 证明首版闭集只守直接 `font-family`：把写本 family 塞入 `:root --sans`
即可经 `body { font-family:var(--sans) }` 复活已退 P5-F06，而 deslop 错误放过。修复仍在获签
`P5-F10` 范围内，不增新档位行、不改消费值。

- 红测先加入 `--sans`、任意自定义字槽与 OG 自定义字槽三种间接传播，旧门 **0/1** 精确失败。
- 最小修复只扩既有平铺遍历：除 `@font-face` 外，任何声明值出现写本 family 时，只有四个获签
  选择器的直接 `font-family` 合法；family 藏入自定义属性即定点红。没有递归变量解析器、状态机
  或通用字体治理抽象。
- 实仓把 family 前插 `--sans` 后，完整 deslop 精确报
  `site/styles.css has the manuscript face in an indirect font slot: :root --sans`；反向补丁复原后
  product CSS 字节无 diff。定点三用例与完整 deslop 随即复绿。
- 修复 tip 自检：`site:guard` **68/68**、根 Vitest **148 files / 1261 tests**、`pnpm lint`、
  `pnpm -r build`（13/14 workspace）与 `site:build` 全绿。
- 本节只构成实现修复证据；原拒绝报告保留，新 clean clone 须重新放行 P5。
