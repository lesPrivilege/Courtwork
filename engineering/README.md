# CourtWork 工程入口

CourtWork当前实现、设计、契约与证据在本仓main维护，唯一持久开发目录为Courtwork。Schema Engineering独立编订论文；冻结旧实现仅通过 [legacy召回索引](ecosystem/legacy-recall-index.md)按需读取。

## 当前阅读顺序

1. [current](current.md)：当前代码/证据、责任与未闭合项，唯一产品状态入口。
2. [本轮派单](execution/2026-09-08-main-round/README.md)与 [公开完成度](execution/2026-09-08-main-round/public-readiness.md)：各批次的责任与交付入口。
3. [architecture](architecture.md)、[core-contracts](core-contracts.md)：实际接缝与目标责任边界；实现事实与设计分别阅读。
4. [Long-life Roadmap](roadmap.md)：长期R0–R5、NDA H0–H5与扩展触发，不是当前功能清单。
5. [Runtime Control API](../docs/runtime-control/INDEX.md)、[UI契约](../docs/interface-components.md)、[品牌契约](../brand/CONTRACT.md)：按具体工单消费。
6. [发布面](release/README.md)：Pages、README、快照与发布回执。

[decisions](decisions.md)保存架构裁决；历史迁移/合流/main接管见 [接管回执](../evidence/main-cutover-20260908/README.md)及其来源，不将已完成分支切换重新变成产品前置。

## Paper边界

[根PAPER.md](../PAPER.md)固定采用SE9.6（DEC-012）与完整SHA，并提供最新阅读入口。实现、契约与验收留在CourtWork；只有固定工程结果支持泛化观察时才向SE的Practice Index回流，不复制论文或建立第二份修订账本。

## 目录导航

| 目录 | 内容 |
|---|---|
| [execution/](execution/README.md) | 当前与历史执行批次 |
| [design/](design/README.md) | 设计合同、来源、样本与对照 |
| [research/](research/README.md) | 技术研究与接口提案 |
| [mvp/](mvp/README.md) | UI / 工作面分派与交付 |
| [migration/](migration/README.md) | 仓库与数据迁移记录 |
| [release/](release/README.md) | 对外页面与发布 |
| [evidence/](../evidence/README.md) | 原始验证与交付记录 |

仓库分工与生成文件规则见 [目录约定](../docs/repository-layout.md)。
