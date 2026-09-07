# 迁移证据索引 · 2026-09-08

本索引只负责把公开工程文档与历史执行材料分开。它保留原路径文本供本地查找，不把原路径当作 fresh 仓库可用链接，也不把旧状态写成当前状态。

## 私有工程快照

完整 SE root/continuation engineering trees 已复制到本机私有目录：

- `/Users/lesprivilege/Projects/Courtwork-evidence/2026-09-08/root/engineering`
- `/Users/lesprivilege/Projects/Courtwork-evidence/2026-09-08/continuation/engineering`

采样时间：2026-09-08 01:18:25 +0800。逐文件 SHA-256 manifest：`root-sha256.txt`、`continuation-sha256.txt`；副本核验记录：`copy-verification.txt`；活动 source tree 非静止快照说明：`snapshot-metadata.txt`。根 33 文件/191176 bytes，continuation 1539 文件/112862385 bytes，路径、大小和 hash 在拷贝时一致。该旧快照仍保持原字节；其后作者正式补交的4fab4bd原始delivery另存私有 `supplemental/ui-design-polish-4fab4bd-delivery.md`（SHA-256 `6cf90580ee9d87a4489a48412d2ccf96d0418bd33e8e5f2b45841b74e8246bb3`），已合入最终代码d44fb28并补验。

## 公开保留

| 当前路径 | 来源/用途 | 处置 |
|---|---|---|
| `engineering/current.md` | continuation current 的当前状态 | 重写为当前 `d44fb28` 候选摘要（初始合流 `5f3c4cd`）；旧 current 留私有副本 |
| `engineering/decisions.md` | continuation decisions + 本次授权 | 保留历史裁决，追加 DEC-011；旧 execution 链只作历史引用 |
| `engineering/design/ux-conventions.md` | continuation 设计规则 | §2 的“等待你＝左侧 2px accent 线”依据 UP-9 与 f8e3c19 实际样式改标 `superseded`；其他条款不改 |
| `engineering/migration/2026-09-08/ui-design-polish-delivery.md` | UI 4fab4bd 交付 | 只保留文本事实与未测边界，不复制捕获/脚本 |
| `engineering/migration/2026-09-08/runtime-control-frontend-intake.md` | runtime UI 接入契约 | 作为待施工输入，不声称 UI 已完成 |
| `engineering/migration/2026-09-08/runtime-control-frontend-explore.md` | 开源成熟实现对照 | 只读研究，不构成采纳或验收 |
| `engineering/mvp/execution/gui-maturity-visual-diff/` | integration 原有跟踪报告 + 3 screenshots | 保留原文件，报告中的绝对来源路径只作历史坐标 |

## 未公开、只保留私有索引

| 原路径（保留文本） | 处理 |
|---|---|
| `engineering/mvp/execution/archives/` | 不公开。包内含 source/fixture/evidence/SQLite，且 tar member 可见 `auth.json`、`credential-sentinel.txt`、credential-file/secret counterexample 路径；未读取其内容。需要复现时只从私有副本按 manifest 解包。 |
| `engineering/mvp/execution/**/evidence/captures/` | 不公开。包含大量 UI screenshots；其中历史文件名含 password boundary，任何个人/账号/工作区信息必须另行人工脱敏。 |
| `engineering/mvp/execution/**/logs`, `*.json`, `*.db`, `*.db-journal`, source bundles | 不公开默认载荷。保留私有副本与 hash；公开时只摘录脱敏结论和与候选 SHA 绑定的检查结果。 |
| `/private/tmp/se-agent-v9-web`, `/private/tmp/se-agent-v9-polish-data`, `/private/tmp/se-ui-maturity-data-20260907` | 原执行目录文本仅供定位；不复制、不当作当前路径。 |
| `/Users/lesprivilege/.codex/worktrees/se-continuation-v3-20260906/Schema Engineering/engineering` | continuation 原始树；在私有副本留存，公开树只保留本文指定 Markdown。 |

## 当前可复核入口

- 当前候选代码为 `d44fb28`（初合流 + `787bf1c` 修复 + 最新 UI `4fab4bd`）。候选 deterministic/recovery 证据：[`../../../evidence/migration-independent/README.md`](../../../evidence/migration-independent/README.md)。
- Runtime 契约：[`../../../docs/runtime-control/INDEX.md`](../../../docs/runtime-control/INDEX.md) 与 [`../../../app/runtime/control-contract.d.ts`](../../../app/runtime/control-contract.d.ts)。
- UI 组件契约：[`../../../docs/interface-components.md`](../../../docs/interface-components.md)；4fab4bd 的回迁输入见 [`ui-design-polish-delivery.md`](ui-design-polish-delivery.md)。
- Brand：[`../../../brand/README.md`](../../../brand/README.md)。

本次迁移快照的独立证据已记录 134/134 backend、18/18 UI counterexamples、focused permission 2/2，以及 connection-card opener focus 代码复核。所有“通过”均只适用于其列出的 fake/deterministic 输入与检查范围；真实 provider、完整用户设备、独立 clone 和 main takeover 需要新证据。

## 最新 UI 来源补充

最新作者 dd65d2b 的 delivery、intake、source-register-up 原文另存私有 supplemental，未复制私有浏览器截图。BoardUI 的字符构成模式已消费到 runtime 前端接管 §6，当前 UI 追加收敛见 final-ui-audit。源文件指纹：

- `dd65d2b-delivery.md` SHA-256 `6cf90580ee9d87a4489a48412d2ccf96d0418bd33e8e5f2b45841b74e8246bb3`
- `dd65d2b-intake.md` SHA-256 `e3ac8d22e108154c4ced5dd3905ee4ffe754ac1ed0f0e38deb0cebf1bb701c99`
- `dd65d2b-source-register-up.md` SHA-256 `c5a70bdf5bf926730873c21e7fc170b3f0cba8e5ab906acb938c0cfdb348d8d5`
