# EX-BR1 · 参考解构：两个 repo 的状态系统与品牌锁原则，现有品牌包的不变量（Sonnet，只读）

派单：Fable，2026-09-09。裁定依据 [00-brief](00-brief.md) BR-2、BR-5。输出：`02-reference-deconstruction.md`（只写此文件）。体例：[handoff-convention](../../engineering/mvp/execution/work-surface-kit/handoff-convention.md) §2 explore 卷。

## 问题

(1) `video-states-website`（GitHub，作者 amirmushichge；用 WebSearch 定位仓库并固定 commit）如何把视觉对象组织为 base state → controlled states → return to base；Scene state 与 Playback state 如何分离；状态是否预制、如何存储、如何切换。(2) `brand-system-skill`（https://github.com/amirmushichge/brand-system-skill）的 Anchor Brand Kit 与场景参考如何分开；哪些属性被列为不可变、哪些可受参考影响；其流程步骤。(3) 现有品牌包 `brand/` 的不变量清单：几何（`geometry/mark.svg` 四矩形的坐标、比例、圆角）、状态轴与动词（`CONTRACT.md`）、材质阈值（≤24 降为 hierarchical）、导出矩阵、验收测试断言（`tests/`、`evidence/`）——第 1 层重开时哪些会被替换、哪些可保留。

## 只读来源

外部：上述两个 repo 的 README 与实现文件（固定 commit，file:line）。本地：`brand/README.md`、`brand/CONTRACT.md`、`brand/geometry/mark.svg`、`brand/src/*.mjs`、`brand/scripts/build.mjs`、`brand/tests/**`、`brand/evidence/**`、`brand/sources/visual-runtime-index.json`、`engineering/design/identity-specimen/**`。

## 交付表

1. 溯源索引行（访问日、commit）。
2. video-states-website 状态系统表：`状态维度 · 取值 · 存储方式（预制文件 / 参数）· 切换机制 · 是否可回 base · file:line`。
3. brand-system-skill 锁表：`属性 · 归类（invariant / semi-stable / contextual，按其原文措辞）· 参考可否影响 · file:line`；与 BR-2 三档的差异逐条列出。
4. 现有品牌包不变量表：`不变量 · 位置 · 被第 1 层替换时的影响（几何 / 导出 / 测试 / 组件 ABI）· 可保留否`。
5. `build.mjs` 的派生链：从 `geometry/mark.svg` 到 `geometry.generated.mjs`、`exports/`、组件；换几何需要动哪些文件、哪些自动重生成。
6. 结论不超过十行，只陈述观察。

不做：画任何图形、写"建议采用"、修改文件、下载资产。
