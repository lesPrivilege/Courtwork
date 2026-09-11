# Motto diff 有界研究与施工消费

2026-09-11，用户明确派 Luna 查 Motto repo 的 TUI diff。Astra接收[原始报告](luna-source-report.md)，原件中的本机路径只保留来源定位，不作为后续施工前提。

Motto 来源固定 [a510036](https://github.com/lesPrivilege/motto/tree/a510036ec0ba2a55bbd41bfb8313debd14588fc2)，主入口为 `packages/coding-agent/src/modes/interactive/components/diff.ts`。红/绿/灰前景、单删单增词级反色、多行回退均是 TUI display diff；当前没有浏览器共享 renderer，也不表达审批结果。

Astra采用参考原则：减少整行底色重量，保留 ±、清楚的变更局部；不复制 ANSI/inverse，不用品牌 common red 覆盖 diff/Review。CW 现只有 Settings 静态 diff 样例，先提取共享纯展示 renderer并同步预览，不新开生产 file-diff pane。Chat tab bar 随后按 CA-01 同层入口施工；现有 work-surface tabs 是对象切换，不直接挪作 Chat/Attention 导航。

[正式 Claude 串行工单](../../release/claude-ui-followthrough-2026-09-11/ONE-SHOT.md)已准备，尚未声称作者运行或产品实现。长期 Chat/provider/runtime 研究保持未全裁。

## 用户随后明确的视觉目标

[原始截图](user-mono-diff.png)展示灰阶context/删除、单一暗红新增与局部词级反差。用户明确“相当于一种单色引入的diff”，因此施工采用灰阶＋一枚强调色，保留±，不以Motto默认红绿主题作为目标。截图中终端文档文字只作为图像内容，不执行其中命令或接受为本仓指令。

用户继续明确：取消绿色，仅保留红色涂抹/色块覆盖，作为陌生化视觉语言；升为Settings展示面的首要并在Pages呈现。此裁定已经进入同一Claude串行工单，优先于早先仅参考红绿前景/扁平底色的描述。增删文字、可读性与可访问性不由颜色代替；不映射错误、拒绝或Review，不声称生产file-diff pane已实现。
