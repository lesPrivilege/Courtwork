# WO-WK10c 收尾交付（Fable，2026-09-09）

基线 Astra 第二节点 `b0173de`；分支 `claude/wk10c-finish`，**固定收尾 SHA `0bc416b`**（worktree `/private/tmp/se-agent-wk10c`，预览 8861）。未推送。

## 变更范围

- `app/web/styles.css`：Home 有列表时组顶留白 `clamp(48px, 18vh, 200px)`（空态仍 31vh）；Home composer 输入区 64–160 px；`#home-start-status` 与内容列同宽。
- `app/web/index.html`：`#home-start-status` 移到 composer 框外、上下文行之上（WK-55 框内只留稳定一行）。
- `engineering/design/copy-convention.md`：界面文案体例（去留规则、形态、词表、尺寸档引用、验收）。
- 批次根新增 `user-message-audit.md`（27 条用户消息逐条核验）。

## 验证

`npm --prefix app test` 139 / 139；`lint-colors` 两项 ok。浏览器（8861，空数据目录）：1440 × 900 浅 / 深宗 hero top 335（37 %）、composer 156 px、Continue 626；条件句与上下文行均在框外。

提交：`efb7197`（留白、composer 高度、文案体例）、`0bc416b`（状态句移出框）。

## 未检项

有列表态与 390 的截图本单未存盘（规则为纯 CSS，风险低）；VoiceOver / 真实 provider / IME / 壳沿前节点未验；flaky 测试定位归 Astra。

## 交 fresh Astra

从 `0bc416b` 开始真实前后端联调；WK10b（glyph 表、热插拔、Chat Flow 卡片、Review 纵切、Home 下带两态、旧"三栏"文档改写）与 WK11 Workbench 按现有工单，在联调基线之上开工。
