# Frontend Attention Audit · 输入与委派范围

2026-09-14 · 合流前最后一笔定向前端注意力审计的输入登记。用户建议直接派 Luna 做 audit，为 Astra 保留额度给真实视觉 computer use。本包只固定原始输入和审计边界，不是来源核验、审计结果、产品接受或实现授权。

## 原始输入

- [逐字附件](input.md)：从用户提供的 `pasted-text.txt` 按原字节复制；343 行、11,140 字节。
- [SHA-256](input.sha256)：`763491a579a14afccf14fe0511de2e85a7f5ad0c6cd174ef77a01c27cf687470`。

附件中引用的外部实践、引文、普遍性主张与删除比例均保留为用户提供的输入；本轮没有重新核验它们，也不把它们作为已采用规则或事实。审计应直接检查实际产品界面与其 owner 合同。

## Luna 的只读审计产物

- 清单预定写入 `../../release/final-preparation-2026-09-13/attention-audit.md`。按实际可见字符串记表面与状态、精确文本和来源坐标、owner 提供的事实、语义类别、建议处置及理由；无法从可见界面或合同确认的项保留为 unknown。
- 实际浏览器视觉证据独立保留在 [`../../release/final-preparation-2026-09-13/attention-audit-evidence/`](../../release/final-preparation-2026-09-13/attention-audit-evidence/)，不由输入附件或清单文字代替。

语义类别与处置（例如 KEEP、SHORTEN、DISCLOSE、MOVE_TO_DIAGNOSTICS、MOVE_TO_DOCS 或 DELETE）是逐项审阅的分类工具。它们不构成自动删除黑名单，不要求达到固定删字比例；附件中的“未分类即删除”及 70–85% 文案减少说法不是本地验收门。处置须有具体表面、任务和事实来源支持，结果仍待有权 owner 决定。

审阅保留人此刻需要识别对象、理解作用域/权限、判断后果、看到错误与 unknown 并采取恢复的语义。状态与动作从 Host/domain owner 的实际事实投影；模型旁白不能充当运行状态、进度、结果或成功回执。技术诊断可在明确的 Inspector/Diagnostics 层按需披露，不能据此把必需的错误、风险或权限范围从默认决策路径中移走。

本登记与现行 [UX Grammar](../../design/ux-grammar.md) 衔接，不新增 lint、删字目标、产品行为或全站接受声明。此次只登记输入与 Luna 的审计边界；未运行产品、未修改 UI，也未声称完成浏览器核查。
