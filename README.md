# Courtwork

法律垂类 Agent —— 案件文件夹级协作工作台，对标 Cowork 交互范式，面向中国律所/企业法务团队。

- 战略与产品文档：`docs/00`–`05`
- 实施切分与工单：`docs/10-实施切分-层与工单.md`
- 工程总纲（Claude Code 会话必读）：`CLAUDE.md`
- 各层规格：对应目录下 `SPEC.md`

状态：**core MVP 成立（2026-07-10，见 packages/core/ACCEPTANCE.md 补验结论）**。W1/W2/W4/W5/W6 五层验收放行，eval 转正为选型与回归门禁，`pnpm --filter @courtwork/core demo:s3` 可跑通无 UI 全流程。在途：sol B 阶段（UI + Tauri）；待外部依赖：W3/W8（卷宗样本）；微工单挂账：W6.1 遥测事件、法条复核（curation 首试点）。架构决定与调研见 `docs/20`–`29` 与 `docs/06`–`16`。
