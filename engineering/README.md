# Fresh Courtwork 工程入口

本目录记录 fresh Courtwork 候选的工程事实、契约、设计边界和迁移证据。产品代码与 Paper 入口分别由仓库根目录的应用目录和 [`../PAPER.md`](../PAPER.md) 负责；`main` 仍是冻结 legacy，不因候选分支同步而改变。

## 当前阅读顺序

1. [`current.md`](current.md)：当前候选、已测范围、阻断项和下一步。
2. [`decisions.md`](decisions.md)：工程裁决与责任边界；本次搬迁授权是 DEC-011。
3. [`migration/2026-09-08/README.md`](migration/2026-09-08/README.md)：来源、谱系、公开载荷和回退边界。
4. [`../docs/runtime-control/INDEX.md`](../docs/runtime-control/INDEX.md)、[`../docs/interface-components.md`](../docs/interface-components.md)：已落盘契约。
5. [`../brand/README.md`](../brand/README.md)：零依赖品牌 SVG 与语义动效包。

历史 SE 工程材料只作为来源和证据索引。旧执行包、SQLite、截图、临时目录和个人/凭据捕获不进入公开工程树；必要时从迁移 evidence index 定向回到私有证据副本。

## Paper 边界

[`../PAPER.md`](../PAPER.md) 固定 Schema Engineering 9.3（commit `f8ecb091895559389bb4e75f3c6f28052b71c5a3`）的 Canonical、Practice 与 Practice Index。Courtwork 保存实现、契约、验收和 PR；产品事实不会自动升级为 Paper 命题。Paper 版本更换须先记录受影响契约和复核证据，再更新根入口。

## 最新作者交付

UI 已消费 `4fab4bd`（祖先 `f8e3c19`），最终代码合流 `d44fb28` 已完成受影响路径独验；作者施工树与原预览保留。后续施工从本目录的 current 与明确的新工单继续。
