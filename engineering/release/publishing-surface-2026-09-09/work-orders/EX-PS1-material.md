# EX-PS1 · 发布面材质治理来源（Sonnet，只读）

派单：Fable，2026-09-09。裁定依据 [intake](../intake.md) PS-3。体例：[handoff-convention](../../../mvp/execution/work-surface-kit/handoff-convention.md) §2 explore 卷。输出：`../explore/ex-ps1-material.md`（只写此文件）。

## 问题

站点的 surface / elevation / radius 是否可以完全由产品既有 token 派生；Cal.com 的四层阴影与 radius scale 转译到产品 L0–L3 时，哪些值对应、哪些不对应、哪些是产品没有而站点需要的。

## 只读来源

外部（访问日记入卷首；只登记与转录，不下载资产）：

1. Cal.com 源码中的设计 token：`https://github.com/calcom/cal.com`，找 `packages/config/tailwind-preset.js` 与 `packages/ui` 内定义 `boxShadow` / `borderRadius` / 颜色阶的文件；固定到一个 commit SHA 逐值转录（ring / contact / ambient / inset 四层的实际 CSS 值、radius 档位）。
2. `https://opendesigner.io/design-systems/cal`：第三方分析，只作对照，不作为值的来源。
3. `https://cal.com`：公开首页，观察真实 UI 作首帧的做法与颜色数量（描述，不截图）。
4. `https://korren.dev/`：网页 theme 与 app token 同源的实现方式（是否同一份 CSS 变量、如何切换深浅）。
5. `https://ped.ro/`：blur 作注意力语义的实现（`filter` 还是 `backdrop-filter`、作用对象、`prefers-reduced-motion` 下的行为）。

本地（只读）：

- `app/web/styles.css`：`--frame / --panel / --panel-muted / --float / --glass* / --shadow-* / --blur-* / --radius-*`，以及 L0–L3 的注释；
- `engineering/design/surface-hierarchy.md` SH-3；`engineering/design/ui-composition-standard.md` 的圆角与阴影条目；
- `/private/tmp/se-fable-r4d/engineering/mvp/execution/work-surface-kit/intake-round-3.md` §4ac（WK-124）与 §4ad（WK-125）：材质语法与 shape roles、concentricity 公理（该分支未合流 main，只读）。

## 交付表

1. 溯源索引行（体例 §3 格式）。
2. Cal.com 转录表：`token 名 · 值 · 用途（来源注释原文）· 文件:行 · commit`。
3. 产品对照表：`产品 token · 值（浅 / 深）· 层级 L0–L3 · Cal.com 对应项 · 是否同构 · 差异说明`。
4. 站点缺口表：沿产品 token 不改时，站点六个 proof surface 各需要哪些产品没有的 token；每行说明用途，不写"建议采用"。
5. blur 登记：ped.ro 与 Korren 的 blur 用法各一行，`CSS 手段 · 作用对象 · reduced-motion 行为 · 可否只用 filter 不用 backdrop-filter`。
6. 结论不超过十行，只陈述观察。

不做：写产品代码、改任何文件、给出站点视觉方案、评价"好看"。
