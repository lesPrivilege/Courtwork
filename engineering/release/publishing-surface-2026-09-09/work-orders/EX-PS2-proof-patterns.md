# EX-PS2 · "产品自身即证据"的页面解剖与 Courtwork 素材映射（Sonnet，只读）

派单：Fable，2026-09-09。裁定依据 [intake](../intake.md) PS-2、PS-9。输出：`../explore/ex-ps2-proof-patterns.md`（只写此文件）。

## 问题

六个 proof surface（01 Raw → Governed、02 A matter in motion、03 Why this architecture、04 Review、05 Evidence、06 Build）各自在成熟站点上如何实现；Courtwork 仓内已有哪些素材可以直接喂给每一段，哪些必须从发布 SHA 重新捕获。

## 外部来源（访问日记入卷首；描述不截图，不下载资产）

`https://otty.sh/`、`https://korren.dev/`、`https://lpm.cx/mac-terminal-for-developers`、`https://kairnai.com/`、`https://twill.design/`、`https://ped.ro/`。

每站一行解剖：`首帧内容（真实产品 / 插画 / 文字）· 互动性质（静态 / 脚本回放 / 真实运行）· 在线与否如何标注 · 无 JS 时首屏是否仍可读（抓取原始 HTML 判断）· reduced-motion 行为 · 数据来源是否标注 · 导航项 · 页脚内容`。另记 Kairn 的"原始文件 ↔ 渲染视图"并置的具体做法（同屏还是切换，如何对齐）。

## 本地来源（只读）

- `engineering/release/2026-09-08/pages-preparation/reference-index.json`：12 条既有参考，标注每条对六段中哪一段仍有效，不重新抓取；
- `evidence/`：为六段各列出可用素材，每行 `路径 · 代码基线 SHA · data_kind · viewport / theme · 显示的状态文字 · 适用段落 · 缺陷（旧词表 / 旧 IA / before 图）`；重点目录 `final-integration-20260908/`、`rc/`、`cc-s-main-integration-20260909/`、`fe03/`、`fe03-main-integration-20260909/`、`wk10b2-main-integration-20260908/`、`se-continuity-20260908/`、`harness-core-20260908/`；
- `engineering/research/review-surface-2026-09-09/`（CodeRabbit review surface 准备）与 `engineering/research/chat-space-2026-09-09/courtwork-mapping.md`：只登记与 04 段相关的结论行；
- `engineering/design/copy-convention.md` §3：核对每张既有截图的可见文字是否仍是现行词表。

## 交付表

1. 溯源索引行。
2. 六站解剖表（上述列）。
3. 素材映射表：六段 × 可用素材；无素材的段落写"需捕获"并列出需要的画面与状态。
4. 既有 12 条参考的有效性表。
5. 结论不超过十行。

不做：提出视觉方案、评价审美、修改任何文件、启动服务。
