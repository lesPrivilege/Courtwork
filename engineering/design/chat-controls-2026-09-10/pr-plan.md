# EX-IC2 · 本地 PR 施工稿

本页是仓内 PR 规划，不代表远端 PR 已创建、代码已施工或用户已选择新图标族。入口与原文见 [范围记录](README.md)，接 [前端 roadmap](../../mvp/execution/work-surface-kit/roadmap-frontend.md) 与 [长期 roadmap](../../roadmap.md)。

| 分片 | 内容 / 写权 | 前置与退出证据 |
| --- | --- | --- |
| A · 全量 Chat control inventory | 仅文档/证据；覆盖所有 Chat space 按钮、链接式动作、菜单、hover/focus/tooltip及文件卡；不改产品 | 固定实际 main，枚举两条 DOM builder 与共享 action、静态 HTML；每个消费者有 handler/owner/disposition；动态状态实际捕获或明确缺口；无未解释漏项。不是只交代表性24枚图标。 |
| B · Icon/control specimen | 仅隔离 specimen/受信来源证据；既有 Lucide baseline 与 Octicons 等候选在真实槽位对照；domain native 只在确切缺口下探索 | 消费 A；同内容、同宿主控件、明暗/尺寸/密度/状态对照；文件卡 default action/dropdown 亦纳入；无后端候选只读且标注；保留 IC-8，不先选 winner。 |
| C · 经裁决的最小接线 | 明确消费者清单后才授予 app/web 与必要 STATIC 写权；复用 icon/action/tooltip adapter、既有 semantic vocabulary | B 的逐项裁决；每个真实写操作已绑定原 owner，缺 owner 项先在显式Fake UI中验证交互并逆向登记合同，生产不伪报成功；定向+全量回归、键盘/触屏/200%/窄屏/明暗、有界独立复核。作者不自称独立接受。 |

不把 A/B 的候选数量当成 C 的实施承诺。注册表不得新增域对象、推断状态或扩大权限；不会为方便 UI 而补一套后端。后端缺口映射既有 service/domain 工单；无既有映射的只登记待裁，不凭空发明 endpoint。

## 2026-09-11 用户更新

[Fake UI先行裁定](fake-ui-first/README.md)覆盖旧整体延期：B不等后端或SD-FIX正式接受才启动，当前Astra单写按共享路径串行；最小B裁定与C前端接线连续推进，后端缺口按动作独立登记。

## 必备反例

- Hover actions 在 Tab/focus-within 和触屏仍可达，关闭菜单后焦点可返回，重绘不丢当前对象。
- 相同 Copy glyph 不混淆整条回复/代码块/路径；编辑只生成草稿，不表示历史回写或自动 Run。
- Cancel 不冒充 Close；继续失败 Run、不确定提交恢复、重新读取和再生成分开标明。
- 文件不存在/历史版本/错误应用关联/无本机宿主时不显示虚假成功；打开本机文件与下载不是同一能力。
- 流式、disabled、loading、unknown、error、权限不足及长中文标签有可见解释；tooltip不隐藏关键后果。
- 缺朗读、反馈存储或宿主打开合同的候选不得借相似 icon 冒充已接线。
- 新 key/资产须受信、闭集、可追溯；光学验收不等于全局增大 `.icon`，native glyph 不成为任意生成 SVG 注入路径。

本次仅交付范围与计划，无产品代码、依赖、schema、模型调用、远端 PR 或部署变更。
